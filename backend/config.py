import os
import yaml
from pathlib import Path

# 获取配置文件路径
config_path = Path(__file__).parent / "config.yaml"

# 加载yaml配置
with open(config_path, "r", encoding="utf-8") as f:
    config = yaml.safe_load(f)

# 确保上传目录存在
os.makedirs(config["upload"]["dir"], exist_ok=True)

# 导出配置
__all__ = ["config"] 