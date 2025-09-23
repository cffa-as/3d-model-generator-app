import os
import yaml
from pathlib import Path
from typing import Dict, Any

# 获取配置文件路径
config_path = Path(__file__).parent / "config.yaml"

# 加载yaml配置
with open(config_path, "r", encoding="utf-8") as f:
    config = yaml.safe_load(f)

# 确保上传目录存在
os.makedirs(config["upload"]["dir"], exist_ok=True)

# MySQL数据库配置
MYSQL_CONFIG: Dict[str, Any] = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "12346",
    "database": "model_generator",
    "charset": "utf8mb4"
}

# Meshy API配置
MESHY_CONFIG: Dict[str, Any] = {
    "api_key": "your_meshy_api_key_here"  # 请替换为实际的API key
}

# 导出配置
__all__ = ["config"] 