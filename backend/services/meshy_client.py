import httpx
import yaml
import json
import base64
from pathlib import Path
from typing import Dict, Any, List, Optional, BinaryIO
import logging

# 配置日志
logger = logging.getLogger(__name__)

class MeshyClient:
    """Meshy API 客户端"""
    
    def __init__(self):
        """初始化客户端"""
        try:
            config_path = Path(__file__).parent.parent / "config.yaml"
            with open(config_path, "r", encoding="utf-8") as f:
                config = yaml.safe_load(f)
                
            self.base_url = "https://api.meshy.ai/openapi/v2"
            self.api_key = config["meshy"]["api_key"]
            self.headers = {
                "Authorization": f"Bearer {self.api_key.strip()}",
                "Content-Type": "application/json"
            }
            self.timeout = httpx.Timeout(timeout=300.0)  # 5分钟超时
            
            logger.info("Meshy client initialized with API key: %s***", self.api_key[:8])
        except Exception as e:
            logger.error("Failed to initialize Meshy client: %s", str(e))
            raise

    async def create_text_task(
        self,
        prompt: str,
        art_style: str = "realistic",
        mode: str = "preview",
        should_remesh: bool = True,
        enable_pbr: bool = False,
        texture_prompt: Optional[str] = None,
        texture_image_url: Optional[str] = None,
        ai_model: Optional[str] = None,
        preview_task_id: Optional[str] = None,
        # 新增参数
        seed: Optional[int] = None,
        topology: Optional[str] = None,
        target_polycount: Optional[int] = None,
        symmetry_mode: Optional[str] = None,
        is_a_t_pose: Optional[bool] = None
    ) -> Dict[str, Any]:
        """文本生成3D任务"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "mode": mode,
                }

                if mode == "preview":
                    # 预览模式参数
                    payload.update({
                        "prompt": prompt,
                        "art_style": art_style,
                        "should_remesh": should_remesh
                    })
                    if ai_model:
                        payload["ai_model"] = ai_model
                    # 添加新参数
                    if seed is not None:
                        payload["seed"] = seed
                    if topology:
                        payload["topology"] = topology
                    if target_polycount:
                        payload["target_polycount"] = target_polycount
                    if symmetry_mode:
                        payload["symmetry_mode"] = symmetry_mode
                    if is_a_t_pose is not None:
                        payload["is_a_t_pose"] = is_a_t_pose
                else:
                    # 精细化模式参数
                    if not preview_task_id:
                        raise ValueError("精细化任务需要提供preview_task_id")
                    
                    payload.update({
                        "preview_task_id": preview_task_id,
                        "enable_pbr": enable_pbr
                    })
                    
                    if texture_prompt:
                        payload["texture_prompt"] = texture_prompt
                    elif texture_image_url:
                        payload["texture_image_url"] = texture_image_url
                    
                    if ai_model:
                        payload["ai_model"] = ai_model

                logger.info("Creating text-to-3D task with mode: %s", mode)
                logger.debug("Request payload: %s", json.dumps(payload, ensure_ascii=False))
                
                response = await client.post(
                    f"{self.base_url}/text-to-3d",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
                logger.debug("Response: %s", json.dumps(result, ensure_ascii=False))
                
                # 从响应中获取任务ID
                task_id = result.get("result")
                if not task_id:
                    raise ValueError("No task ID in response")
                
                logger.info("Text-to-3D task created successfully: %s", task_id)
                return {"task_id": task_id}
        except Exception as e:
            logger.error("Failed to create text-to-3D task: %s", str(e))
            raise

    async def create_image_task(
        self,
        image_data: bytes,
        enable_pbr: bool = True,
        should_remesh: bool = True,
        should_texture: bool = True
    ) -> Dict[str, Any]:
        """单图生成3D任务"""
        try:
            # 转换为base64
            base64_image = base64.b64encode(image_data).decode()
            image_url = f"data:image/jpeg;base64,{base64_image}"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "image_url": image_url,
                    "enable_pbr": enable_pbr,
                    "should_remesh": should_remesh,
                    "should_texture": should_texture
                }

                logger.info("Creating image-to-3D task")
                logger.debug("Request payload: %s", json.dumps({
                    "enable_pbr": enable_pbr,
                    "should_remesh": should_remesh,
                    "should_texture": should_texture
                }, ensure_ascii=False))
                
                response = await client.post(
                    "https://api.meshy.ai/openapi/v1/image-to-3d",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()

                # 从响应体获取任务ID
                result = response.json()
                task_id = result.get("result")  # v1 API 返回 result 字段
                if not task_id:
                    raise ValueError("No task ID in response")
                
                logger.info("Image-to-3D task created successfully: %s", task_id)
                return {"task_id": task_id}
        except Exception as e:
            logger.error("Failed to create image-to-3D task: %s", str(e))
            raise

    async def create_multi_image_task(
        self,
        image_data_list: List[bytes],
        enable_pbr: bool = True,
        should_remesh: bool = True,
        should_texture: bool = True
    ) -> Dict[str, Any]:
        """多图生成3D任务"""
        try:
            # 转换所有图片为base64
            image_urls = []
            for image_data in image_data_list:
                base64_image = base64.b64encode(image_data).decode()
                image_urls.append(f"data:image/jpeg;base64,{base64_image}")

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "image_urls": image_urls,
                    "enable_pbr": enable_pbr,
                    "should_remesh": should_remesh,
                    "should_texture": should_texture
                }

                logger.info("Creating multi-image-to-3D task")
                logger.debug("Request payload: %s", json.dumps({
                    "enable_pbr": enable_pbr,
                    "should_remesh": should_remesh,
                    "should_texture": should_texture
                }, ensure_ascii=False))
                
                response = await client.post(
                    "https://api.meshy.ai/openapi/v1/multi-image-to-3d",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()

                # 从响应体获取任务ID
                result = response.json()
                task_id = result.get("result")  # v1 API 返回 result 字段
                if not task_id:
                    raise ValueError("No task ID in response")
                
                logger.info("Multi-image-to-3D task created successfully: %s", task_id)
                return {"task_id": task_id}
        except Exception as e:
            logger.error("Failed to create multi-image-to-3D task: %s", str(e))
            raise

    async def delete_text_task(self, task_id: str):
        """删除文本转3D任务"""
        url = f"{self.base_url}/openapi/v2/text-to-3d/{task_id}"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(url, headers=self.headers)
                if response.status_code != 200:
                    error_text = response.text
                    try:
                        error_json = response.json()
                        error_text = error_json.get("message", error_text)
                    except:
                        pass
                    raise Exception(f"删除任务失败: {error_text}")
        except Exception as e:
            logger.error(f"删除文本转3D任务失败: {str(e)}")
            raise

    async def delete_image_task(self, task_id: str):
        """删除图片转3D任务"""
        url = f"{self.base_url}/openapi/v1/image-to-3d/{task_id}"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(url, headers=self.headers)
                if response.status_code != 200:
                    error_text = response.text
                    try:
                        error_json = response.json()
                        error_text = error_json.get("message", error_text)
                    except:
                        pass
                    raise Exception(f"删除任务失败: {error_text}")
        except Exception as e:
            logger.error(f"删除图片转3D任务失败: {str(e)}")
            raise

    async def delete_multi_image_task(self, task_id: str):
        """删除多图转3D任务"""
        url = f"{self.base_url}/openapi/v1/multi-image-to-3d/{task_id}"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(url, headers=self.headers)
                if response.status_code != 200:
                    error_text = response.text
                    try:
                        error_json = response.json()
                        error_text = error_json.get("message", error_text)
                    except:
                        pass
                    raise Exception(f"删除任务失败: {error_text}")
        except Exception as e:
            logger.error(f"删除多图转3D任务失败: {str(e)}")
            raise

    async def get_task(self, task_id: str, task_type: str = "text") -> Dict[str, Any]:
        """获取任务状态"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.info("Getting task status: %s", task_id)
                
                # 根据任务类型选择API路径
                if task_type == "text":
                    endpoint = f"{self.base_url}/text-to-3d/{task_id}"
                else:
                    # 图片和多图都使用 v1 的 image-to-3d
                    endpoint = f"https://api.meshy.ai/openapi/v1/image-to-3d/{task_id}"
                
                response = await client.get(
                    endpoint,
                    headers=self.headers
                )
                
                # 如果是404错误，返回默认状态
                if response.status_code == 404:
                    logger.warning("Task not found: %s", task_id)
                    return {
                        "id": task_id,
                        "status": "pending",
                        "progress": 0
                    }
                
                response.raise_for_status()
                
                # 尝试解析响应
                try:
                    result = response.json()
                except Exception as e:
                    logger.warning("Failed to parse JSON response: %s", str(e))
                    return {
                        "id": task_id,
                        "status": "pending",
                        "progress": 0
                    }
                
                logger.debug("Response: %s", json.dumps(result, ensure_ascii=False))
                
                # 如果响应为空或无效，返回默认状态
                if not result or not isinstance(result, dict):
                    logger.warning("Empty or invalid response from Meshy API for task %s", task_id)
                    return {
                        "id": task_id,
                        "status": "pending",
                        "progress": 0
                    }
                
                # 转换状态
                status = result.get("status", "").upper()
                if status == "SUCCEEDED":
                    status = "completed"
                elif status == "FAILED":
                    status = "failed"
                else:
                    status = "pending"
                
                # 构造返回结果
                return {
                    "id": result.get("id", task_id),
                    "status": status,
                    "progress": result.get("progress", 0),
                    "model_urls": result.get("model_urls"),
                    "texture_urls": result.get("texture_urls"),
                    "thumbnail_url": result.get("thumbnail_url"),
                    "started_at": result.get("started_at"),
                    "finished_at": result.get("finished_at"),
                    "task_error": result.get("task_error", {}).get("message", "") if result.get("task_error") else ""
                }
        except Exception as e:
            logger.error("Failed to get task status: %s", str(e))
            # 如果出错，返回默认状态
            return {
                "id": task_id,
                "status": "pending",
                "progress": 0,
                "task_error": str(e)
            }

    async def list_tasks(self, page_size: int = 10) -> List[Dict[str, Any]]:
        """获取任务列表"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.info("Getting task list with page_size: %d", page_size)
                response = await client.get(
                    "https://api.meshy.ai/openapi/v1/image-to-3d",  # 使用 v1 API
                    headers=self.headers,
                    params={"page_size": page_size}
                )
                response.raise_for_status()
                
                # 尝试解析响应
                try:
                    tasks = response.json()
                except Exception as e:
                    logger.warning("Failed to parse JSON response: %s", str(e))
                    return []
                
                logger.debug("Response: %s", json.dumps(tasks, ensure_ascii=False))
                
                # 如果响应为空或无效，返回空列表
                if not tasks or not isinstance(tasks, list):
                    return []
                
                # 转换每个任务的状态
                result = []
                for task in tasks:
                    if not isinstance(task, dict):
                        continue
                        
                    status = task.get("status", "").upper()
                    if status == "SUCCEEDED":
                        task["status"] = "completed"
                    elif status == "FAILED":
                        task["status"] = "failed"
                    else:
                        task["status"] = "pending"
                    
                    result.append(task)
                
                return result
        except Exception as e:
            logger.error("Failed to get task list: %s", str(e))
            return []

# 创建客户端实例
meshy_client = MeshyClient() 