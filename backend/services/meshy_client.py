import httpx
import yaml
import base64
from pathlib import Path
from typing import Dict, Any

class MeshyClient:
    """Meshy API 客户端"""
    
    def __init__(self):
        """初始化客户端"""
        config_path = Path(__file__).parent.parent / "config.yaml"
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)
            
        self.base_url = "https://api.meshy.ai/openapi/v1"  # 注意这里是 v1
        self.api_key = config["meshy"]["api_key"]
        self.headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json"
        }
        # 设置较长的超时时间
        self.timeout = httpx.Timeout(timeout=300.0)  # 5分钟超时
    
    async def create_text_task(self, prompt: str, enable_pbr: bool = True):
        """文本生成3D任务"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:  # 使用设置的超时时间
            response = await client.post(
                f"{self.base_url}/text-to-3d",
                headers=self.headers,
                json={
                    "prompt": prompt,
                    "enable_pbr": enable_pbr,
                    "ai_model": "meshy-5"
                }
            )
            response.raise_for_status()
            return response.json()

    async def create_image_task(self, image_file, enable_pbr: bool = True):
        """图片生成3D任务"""
        image_data = image_file.read()
        base64_image = base64.b64encode(image_data).decode('utf-8')
        image_url = f"data:image/jpeg;base64,{base64_image}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:  # 使用设置的超时时间
            response = await client.post(
                f"{self.base_url}/image-to-3d",
                headers=self.headers,
                json={
                    "image_url": image_url,
                    "enable_pbr": enable_pbr,
                    "ai_model": "meshy-5"
                }
            )
            response.raise_for_status()
            return response.json()

    async def get_task(self, task_id: str, task_type: str = "text"):
        """获取任务状态
        task_type: 'text' 或 'image'
        """
        async with httpx.AsyncClient() as client:
            # 根据任务类型选择不同的API路径
            endpoint = "text-to-3d" if task_type == "text" else "image-to-3d"
            response = await client.get(
                f"{self.base_url}/{endpoint}/{task_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()

# 创建客户端实例
meshy_client = MeshyClient() 