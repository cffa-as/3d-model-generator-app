import httpx
import yaml
from pathlib import Path
from typing import Dict, Any

class MeshyClient:
    """Meshy API 客户端"""
    
    def __init__(self):
        """初始化客户端"""
        config_path = Path(__file__).parent.parent / "config.yaml"
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)
            
        self.base_url = "https://api.meshy.ai/openapi/v2"
        self.api_key = config["meshy"]["api_key"]
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def create_preview_task(self, prompt: str) -> Dict[str, Any]:
        """创建预览任务"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/text-to-3d",
                headers=self.headers,
                json={
                    "mode": "preview",
                    "prompt": prompt,
                    "art_style": "realistic"
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def create_refine_task(self, preview_task_id: str, enable_pbr: bool = False) -> Dict[str, Any]:
        """创建精细化任务"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/text-to-3d",
                headers=self.headers,
                json={
                    "mode": "refine",
                    "preview_task_id": preview_task_id,
                    "enable_pbr": enable_pbr
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_task(self, task_id: str) -> Dict[str, Any]:
        """获取任务状态"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/text-to-3d/{task_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()

# 创建客户端实例
meshy_client = MeshyClient() 