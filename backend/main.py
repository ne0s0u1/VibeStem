"""
Demucs 分轨 API 服务
部署在 5090 GPU 服务器上

使用 ZFTurbo/Music-Source-Separation-Training 进行推理
官方模型和微调模型均通过该仓库加载，保持格式一致
"""
import sys
import uuid
import asyncio
from pathlib import Path
from typing import Optional

import torch
import torchaudio
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# ============================================================
# 所有路径配置统一从 server_config.py 读取，直接改那个文件即可
# ============================================================
from server_config import (
    ZFTURBO_REPO_PATH as ZFTURBO_REPO,
    OFFICIAL_MODEL_TYPE as _OFFICIAL_TYPE,
    OFFICIAL_MODEL_CONFIG as _OFFICIAL_CONFIG,
    OFFICIAL_MODEL_CHECKPOINT as _OFFICIAL_CKPT,
    FINETUNED_MODEL_TYPE as _FINETUNED_TYPE,
    FINETUNED_MODEL_CONFIG as _FINETUNED_CONFIG,
    FINETUNED_MODEL_CHECKPOINT as _FINETUNED_CKPT,
    UPLOAD_DIR, OUTPUT_DIR, DEVICE as _DEVICE_CONF,
)

if not ZFTURBO_REPO.exists():
    raise RuntimeError(
        f"找不到 ZFTurbo 仓库：{ZFTURBO_REPO}\n"
        "请修改 server_config.py 中的 ZFTURBO_REPO_PATH"
    )

# 把 ZFTurbo 路径加到最前面
sys.path.insert(0, str(ZFTURBO_REPO))

# 系统里装了一个同名的 utils 包，需要先从缓存里踢掉，否则 sys.path 不生效
for mod_name in list(sys.modules.keys()):
    if mod_name == "utils" or mod_name.startswith("utils."):
        del sys.modules[mod_name]

# 现在直接 import，sys.path 会生效
import inference as zf_inference  # type: ignore  # noqa: F401

# 实际函数名：get_model_from_config(model_type, config_path)、demix
get_model_from_config = zf_inference.get_model_from_config
demix = zf_inference.demix

app = FastAPI(title="StemVibe Demucs API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

if _DEVICE_CONF == "auto":
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
else:
    DEVICE = _DEVICE_CONF

# 任务状态存储
tasks: dict[str, dict] = {}

# 模型缓存（避免重复加载）
model_cache: dict[str, tuple] = {}  # model_name -> (model, config, model_type)


def load_model(model_key: str):
    """
    懒加载模型。

    model_key:
      "official"   -> 用官方 htdemucs 权重（ZFTurbo 标准模型）
      "finetuned"  -> 用你训练好的 .ckpt/.pth 权重
    """
    if model_key in model_cache:
        return model_cache[model_key]

    if model_key == "official":
        model_type = _OFFICIAL_TYPE
        config_path = str(_OFFICIAL_CONFIG)
        checkpoint_path = str(_OFFICIAL_CKPT)
    elif model_key == "finetuned":
        model_type = _FINETUNED_TYPE
        config_path = str(_FINETUNED_CONFIG)
        checkpoint_path = str(_FINETUNED_CKPT)
    else:
        raise ValueError(f"未知模型: {model_key}")

    # ZFTurbo API: get_model_from_config(model_type, config_path) 只加载结构
    # 再用 torch.load 直接加载权重，避免依赖 load_start_checkpoint 的 args 约定
    model, config = get_model_from_config(model_type, config_path)
    state_dict = torch.load(checkpoint_path, map_location=DEVICE)
    if "state_dict" in state_dict:
        state_dict = state_dict["state_dict"]
    model.load_state_dict(state_dict, strict=False)
    model = model.to(DEVICE)
    model.eval()
    model_cache[model_key] = (model, config, model_type)
    return model, config, model_type


async def run_separation(task_id: str, audio_path: Path, model_key: str,
                          start_time: Optional[float], end_time: Optional[float]):
    """后台执行分轨 - 使用 ZFTurbo 推理"""
    try:
        tasks[task_id]["status"] = "processing"

        # 加载音频 -> numpy array，shape: (channels, samples)
        waveform, sr = torchaudio.load(str(audio_path))

        # 双声道处理：单声道转双声道
        if waveform.shape[0] == 1:
            waveform = waveform.repeat(2, 1)
        elif waveform.shape[0] > 2:
            waveform = waveform[:2, :]

        # 分段裁剪
        if start_time is not None and end_time is not None:
            start_sample = int(start_time * sr)
            end_sample = int(end_time * sr)
            waveform = waveform[:, start_sample:end_sample]

        mix_np = waveform.numpy()  # shape: (2, N)

        # 加载模型
        model, config, model_type = load_model(model_key)

        # 在线程池执行推理（GPU 阻塞操作，避免卡住 event loop）
        loop = asyncio.get_event_loop()

        def _infer():
            with torch.no_grad():
                # ZFTurbo API: demix(config, model, mix, device, model_type)
                result = demix(config, model, mix_np, DEVICE, model_type)
            return result

        separated = await loop.run_in_executor(None, _infer)

        # 构建双轨输出
        # 如果模型输出正好是 vocals + accompaniment（你的 2-stem 微调），直接取用
        # 如果模型输出是 4 stem（drums/bass/other/vocals），合并非人声轨为 accompaniment
        if "accompaniment" in separated:
            vocals_np = separated["vocals"]
            accompaniment_np = separated["accompaniment"]
        else:
            vocals_np = separated.get("vocals", np.zeros_like(mix_np))
            acc_stems = [v for k, v in separated.items() if k != "vocals"]
            accompaniment_np = np.sum(acc_stems, axis=0) if acc_stems else np.zeros_like(mix_np)

        # 保存结果
        task_output_dir = OUTPUT_DIR / task_id
        task_output_dir.mkdir(exist_ok=True)

        vocals_path = task_output_dir / "vocals.wav"
        accompaniment_path = task_output_dir / "accompaniment.wav"

        torchaudio.save(str(vocals_path), torch.from_numpy(vocals_np), sr)
        torchaudio.save(str(accompaniment_path), torch.from_numpy(accompaniment_np), sr)

        tasks[task_id].update({
            "status": "completed",
            "vocals_url": f"/api/files/{task_id}/vocals.wav",
            "accompaniment_url": f"/api/files/{task_id}/accompaniment.wav",
        })

    except Exception as e:
        tasks[task_id].update({
            "status": "failed",
            "error": str(e),
        })
    finally:
        if audio_path.exists():
            audio_path.unlink()


@app.post("/api/separate")
async def separate(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    audio_url: Optional[str] = Form(None),
    model: str = Form("official"),
    start_time: Optional[float] = Form(None),
    end_time: Optional[float] = Form(None),
):
    """提交分轨任务"""
    if model not in ("official", "finetuned"):
        raise HTTPException(400, "model 必须是 'official' 或 'finetuned'")

    task_id = str(uuid.uuid4())

    # 保存上传文件
    if file:
        audio_path = UPLOAD_DIR / f"{task_id}_{file.filename}"
        with open(audio_path, "wb") as f:
            content = await file.read()
            f.write(content)
    elif audio_url:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(audio_url)
            ext = audio_url.split(".")[-1].split("?")[0] or "wav"
            audio_path = UPLOAD_DIR / f"{task_id}.{ext}"
            with open(audio_path, "wb") as f:
                f.write(resp.content)
    else:
        raise HTTPException(400, "必须提供 file 或 audio_url")

    # 创建任务
    tasks[task_id] = {
        "task_id": task_id,
        "status": "pending",
        "model": model,
    }

    # 后台执行
    background_tasks.add_task(run_separation, task_id, audio_path, model, start_time, end_time)

    return {"task_id": task_id}


@app.get("/api/separate/status/{task_id}")
async def get_status(task_id: str):
    """查询分轨任务状态"""
    if task_id not in tasks:
        raise HTTPException(404, "任务不存在")
    return tasks[task_id]


@app.get("/api/files/{task_id}/{filename}")
async def get_file(task_id: str, filename: str):
    """下载分轨结果文件"""
    file_path = OUTPUT_DIR / task_id / filename
    if not file_path.exists():
        raise HTTPException(404, "文件不存在")
    return FileResponse(str(file_path), media_type="audio/wav", filename=filename)


@app.get("/api/health")
async def health():
    """健康检查"""
    return {
        "status": "ok",
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=6006)
