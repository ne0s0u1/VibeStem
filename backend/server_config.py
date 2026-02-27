"""
服务器路径配置 - 直接在这里填写你的实际路径
"""
from pathlib import Path

# ============================================================
# 修改这里！
# ============================================================

# ZFTurbo 仓库的路径（git clone 在哪就填哪）
ZFTURBO_REPO_PATH = Path("/root/Music-Source-Separation-Training-main")

# 官方 htdemucs 模型
OFFICIAL_MODEL_TYPE = "htdemucs"
OFFICIAL_MODEL_CONFIG = Path("/root/Music-Source-Separation-Training-main/configs/config_htdemucs_vocals.yaml")
OFFICIAL_MODEL_CHECKPOINT = Path("/root/Music-Source-Separation-Training-main/model_vocals_htdemucs_sdr_8.78.ckpt")

# 你的微调模型（训练输出的 model_best.ckpt 和对应的 config yaml）
FINETUNED_MODEL_TYPE = "htdemucs"
FINETUNED_MODEL_CONFIG = Path("/root/autodl-tmp/1111Hard_EDM_vocal_40_songs_repitch_v3_valid4/config_backup.yaml")
FINETUNED_MODEL_CHECKPOINT = Path("/root/autodl-tmp/1111Hard_EDM_vocal_40_songs_repitch_v3_valid4/BEST_ep_4_test_sdr_5.03.pth")

# ============================================================
# 不用改
# ============================================================
UPLOAD_DIR = Path("./uploads")
OUTPUT_DIR = Path("./outputs")
DEVICE = "auto"  # "auto" = 有 GPU 用 GPU，没有用 CPU
