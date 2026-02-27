"""
分步骤测试 Demucs API
用法：python test_api.py
"""
import sys
import time
import requests

BASE_URL = "http://localhost:8000"
TEST_AUDIO = "./test.mp3"  # 准备一首测试音频放这里

# ============================================================
# Step 1: 健康检查
# ============================================================
def test_health():
    print("\n[1] 健康检查...")
    r = requests.get(f"{BASE_URL}/api/health")
    data = r.json()
    print(f"    状态: {data}")
    assert r.status_code == 200, "服务未启动"
    assert data["status"] == "ok"
    print(f"    GPU 可用: {data['gpu_available']}")
    if data["gpu_available"]:
        print(f"    GPU 型号: {data['gpu_name']}")
    print("    ✓ 健康检查通过")

# ============================================================
# Step 2: 模型加载检查（通过接口触发懒加载）
# ============================================================
def test_model_load(model: str):
    print(f"\n[2] 测试模型加载: {model}")
    print("    提交分轨任务...")

    with open(TEST_AUDIO, "rb") as f:
        r = requests.post(
            f"{BASE_URL}/api/separate",
            files={"file": ("test.mp3", f, "audio/mpeg")},
            data={"model": model},
        )

    assert r.status_code == 200, f"提交失败: {r.text}"
    task_id = r.json()["task_id"]
    print(f"    任务 ID: {task_id}")
    return task_id

# ============================================================
# Step 3: 轮询任务状态
# ============================================================
def poll_task(task_id: str, timeout: int = 300):
    print(f"\n[3] 轮询任务 {task_id}...")
    start = time.time()

    while time.time() - start < timeout:
        r = requests.get(f"{BASE_URL}/api/separate/status/{task_id}")
        data = r.json()
        status = data.get("status")
        print(f"    状态: {status}", end="\r")

        if status == "completed":
            print(f"\n    ✓ 分轨完成!")
            print(f"    人声: {data.get('vocals_url')}")
            print(f"    伴奏: {data.get('accompaniment_url')}")
            return data
        elif status == "failed":
            print(f"\n    ✗ 分轨失败: {data.get('error')}")
            sys.exit(1)

        time.sleep(3)

    print("\n    ✗ 超时")
    sys.exit(1)

# ============================================================
# Step 4: 下载验证
# ============================================================
def test_download(vocals_url: str, accompaniment_url: str):
    print("\n[4] 验证下载...")
    for name, url in [("vocals", vocals_url), ("accompaniment", accompaniment_url)]:
        r = requests.get(f"{BASE_URL}{url}", stream=True)
        assert r.status_code == 200, f"{name} 下载失败"
        size = len(r.content)
        print(f"    {name}: {size / 1024:.1f} KB ✓")


# ============================================================
# Main
# ============================================================
if __name__ == "__main__":
    import os

    if not os.path.exists(TEST_AUDIO):
        print(f"⚠️  请先在 backend 目录放一个测试音频文件：{TEST_AUDIO}")
        print("   可以是任意短的 MP3/WAV，几秒钟即可（越短测试越快）")
        sys.exit(1)

    model = sys.argv[1] if len(sys.argv) > 1 else "official"
    print(f"=== 测试模型: {model} ===")

    test_health()
    task_id = test_model_load(model)
    result = poll_task(task_id)
    test_download(result["vocals_url"], result["accompaniment_url"])

    print(f"\n✅ 全部通过！{model} 模型可正常工作。")
