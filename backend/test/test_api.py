import os
import sys
import json
import base64
import asyncio
import traceback
import httpx
import logging
from pathlib import Path
from typing import Optional, Dict, Any

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TestClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.token: Optional[str] = None
        self.client = httpx.AsyncClient(timeout=30.0)  # 增加超时时间到30秒

    async def register(self, username: str, password: str, email: str) -> Dict[str, Any]:
        """注册新用户"""
        try:
            response = await self.client.post(
                f"{self.base_url}/users/register",
                json={"username": username, "password": password, "email": email}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400 and "already exists" in e.response.text:
                logger.info("用户已存在，尝试登录...")
                return {"message": "用户已存在"}
            raise

    async def login(self, username: str, password: str) -> Dict[str, Any]:
        """用户登录"""
        try:
            response = await self.client.post(
                f"{self.base_url}/users/token",
                data={"username": username, "password": password}
            )
            response.raise_for_status()
            result = response.json()
            self.token = result["access_token"]
            return result
        except Exception as e:
            logger.error("登录失败: %s", str(e))
            raise

    async def login_admin(self) -> Dict[str, Any]:
        """管理员登录"""
        return await self.login("admin", "admin123")

    async def get_admin_statistics(self) -> Dict[str, Any]:
        """获取管理员统计信息"""
        try:
            if not self.token:
                raise ValueError("未登录，请先调用login或login_admin")
            
            headers = {"Authorization": f"Bearer {self.token}"}
            response = await self.client.get(
                f"{self.base_url}/admin/statistics",
                headers=headers
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("获取统计信息失败: %s", str(e))
            raise

    async def create_text_task(self, prompt: str) -> Dict[str, Any]:
        """创建文本生成任务"""
        try:
            if not self.token:
                raise ValueError("未登录，请先调用login或login_admin")
            
            headers = {"Authorization": f"Bearer {self.token}"}
            
            # 1. 创建预览任务
            print("\n1. 创建预览任务...")
            response = await self.client.post(
                f"{self.base_url}/tasks/generate",
                headers=headers,
                json={
                    "task_type": "text",
                    "prompt": prompt,
                    "art_style": "realistic",
                    "mode": "preview",
                    "should_remesh": True
                }
            )
            response.raise_for_status()
            preview_task = response.json()
            preview_task_id = preview_task["task_id"]
            print(f"预览任务创建成功! ID: {preview_task_id}")

            # 2. 等待预览任务完成
            print("\n2. 等待预览任务完成...")
            while True:
                response = await self.client.get(
                    f"{self.base_url}/tasks/{preview_task_id}",
                    headers=headers
                )
                response.raise_for_status()
                task = response.json()
                
                print(f"进度: {task.get('progress', 0)}%, 状态: {task.get('status', 'pending')}")
                
                if task.get("status") == "completed":
                    print("\n预览任务完成!")
                    print("\n预览模型信息:")
                    print(f"预览图片: {task.get('thumbnail_url', '无')}")
                    
                    if task.get('model_urls'):
                        print("\n预览模型文件:")
                        for format, url in task['model_urls'].items():
                            print(f"- {format}: {url}")
                    break
                elif task.get("status") == "failed":
                    print(f"\n预览任务失败: {task.get('task_error', '未知错误')}")
                    return task
                
                await asyncio.sleep(5)

            # 3. 创建精细化任务
            print("\n3. 创建精细化任务...")
            response = await self.client.post(
                f"{self.base_url}/tasks/generate",
                headers=headers,
                json={
                    "task_type": "text",
                    "prompt": prompt,
                    "mode": "refine",
                    "preview_task_id": preview_task_id,
                    "enable_pbr": True
                }
            )
            response.raise_for_status()
            refine_task = response.json()
            refine_task_id = refine_task["task_id"]
            print(f"精细化任务创建成功! ID: {refine_task_id}")

            # 4. 等待精细化任务完成
            print("\n4. 等待精细化任务完成...")
            while True:
                response = await self.client.get(
                    f"{self.base_url}/tasks/{refine_task_id}",
                    headers=headers
                )
                response.raise_for_status()
                task = response.json()
                
                print(f"进度: {task.get('progress', 0)}%, 状态: {task.get('status', 'pending')}")
                
                if task.get("status") == "completed":
                    print("\n精细化任务完成!")
                    print("\n最终模型信息:")
                    print(f"预览图片: {task.get('thumbnail_url', '无')}")
                    
                    if task.get('model_urls'):
                        print("\n模型文件:")
                        for format, url in task['model_urls'].items():
                            print(f"- {format}: {url}")
                    
                    if task.get('texture_urls'):
                        print("\n贴图文件:")
                        for texture in task['texture_urls']:
                            for type, url in texture.items():
                                print(f"- {type}: {url}")
                    break
                elif task.get("status") == "failed":
                    print(f"\n精细化任务失败: {task.get('task_error', '未知错误')}")
                    break
                
                await asyncio.sleep(5)

            return refine_task
        except Exception as e:
            logger.error("创建文本生成任务失败: %s", str(e))
            raise

    async def create_image_task(self, image_path: str) -> Dict[str, Any]:
        """创建图片生成任务"""
        try:
            if not self.token:
                raise ValueError("未登录，请先调用login或login_admin")
            
            # 读取图片并转换为base64
            headers = {"Authorization": f"Bearer {self.token}"}
            with open(image_path, "rb") as f:
                image_data = f.read()
                base64_image = base64.b64encode(image_data).decode()
                image_url = f"data:image/jpeg;base64,{base64_image}"

                print("\n创建图片生成任务...")
                response = await self.client.post(
                    f"{self.base_url}/tasks/generate",
                    headers=headers,
                    json={
                        "task_type": "image",
                        "prompt": "",
                        "image_urls": [image_url],
                        "enable_pbr": True,
                        "should_remesh": True,
                        "should_texture": True
                    }
                )
                response.raise_for_status()
                task = response.json()
                task_id = task["task_id"]
                print(f"图片生成任务创建成功! ID: {task_id}")

                # 等待任务完成
                print("\n等待任务完成...")
                while True:
                    response = await self.client.get(
                        f"{self.base_url}/tasks/{task_id}",
                        headers=headers
                    )
                    response.raise_for_status()
                    task = response.json()
                    
                    print(f"进度: {task.get('progress', 0)}%, 状态: {task.get('status', 'pending')}")
                    
                    if task.get("status") == "completed":
                        print("\n任务完成!")
                        print("\n生成的模型信息:")
                        print(f"预览图片: {task.get('thumbnail_url', '无')}")
                        
                        if task.get('model_urls'):
                            print("\n模型文件:")
                            for format, url in task['model_urls'].items():
                                print(f"- {format}: {url}")
                        
                        if task.get('texture_urls'):
                            print("\n贴图文件:")
                            for texture in task['texture_urls']:
                                for type, url in texture.items():
                                    print(f"- {type}: {url}")
                        break
                    elif task.get("status") == "failed":
                        print(f"\n任务失败: {task.get('task_error', '未知错误')}")
                        break
                    
                    await asyncio.sleep(5)

                return task
        except Exception as e:
            logger.error("创建图片生成任务失败: %s", str(e))
            raise

    async def create_multi_image_task(self, image_path: str) -> Dict[str, Any]:
        """创建多图生成任务（这里用同一张图片测试）"""
        try:
            if not self.token:
                raise ValueError("未登录，请先调用login或login_admin")
            
            # 读取图片并转换为base64
            headers = {"Authorization": f"Bearer {self.token}"}
            with open(image_path, "rb") as f:
                image_data = f.read()
                base64_image = base64.b64encode(image_data).decode()
                image_url = f"data:image/jpeg;base64,{base64_image}"

                print("\n创建多图生成任务...")
                response = await self.client.post(
                    f"{self.base_url}/tasks/generate",
                    headers=headers,
                    json={
                        "task_type": "multi_image",
                        "prompt": "",
                        "image_urls": [image_url, image_url],  # 使用同一张图片两次
                        "enable_pbr": True,
                        "should_remesh": True,
                        "should_texture": True
                    }
                )
                response.raise_for_status()
                task = response.json()
                task_id = task["task_id"]
                print(f"多图生成任务创建成功! ID: {task_id}")

                # 等待任务完成
                print("\n等待任务完成...")
                while True:
                    response = await self.client.get(
                        f"{self.base_url}/tasks/{task_id}",
                        headers=headers
                    )
                    response.raise_for_status()
                    task = response.json()
                    
                    print(f"进度: {task.get('progress', 0)}%, 状态: {task.get('status', 'pending')}")
                    
                    if task.get("status") == "completed":
                        print("\n任务完成!")
                        print("\n生成的模型信息:")
                        print(f"预览图片: {task.get('thumbnail_url', '无')}")
                        
                        if task.get('model_urls'):
                            print("\n模型文件:")
                            for format, url in task['model_urls'].items():
                                print(f"- {format}: {url}")
                        
                        if task.get('texture_urls'):
                            print("\n贴图文件:")
                            for texture in task['texture_urls']:
                                for type, url in texture.items():
                                    print(f"- {type}: {url}")
                        break
                    elif task.get("status") == "failed":
                        print(f"\n任务失败: {task.get('task_error', '未知错误')}")
                        break
                    
                    await asyncio.sleep(5)

                return task
        except Exception as e:
            logger.error("创建多图生成任务失败: %s", str(e))
            raise

    async def get_task_list(self, sync_status: bool = True, limit: int = 10) -> Dict[str, Any]:
        """获取任务列表"""
        try:
            if not self.token:
                raise ValueError("未登录，请先调用login或login_admin")
            
            headers = {"Authorization": f"Bearer {self.token}"}
            response = await self.client.get(
                f"{self.base_url}/tasks",
                headers=headers,
                params={
                    "sync_status": sync_status,
                    "limit": limit,
                    "offset": 0
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("获取任务列表失败: %s", str(e))
            raise

async def run_tests():
    """运行所有测试"""
    try:
        print("\n=== 测试环境检查 ===")
        # 检查工作目录
        current_dir = os.getcwd()
        print(f"1. 检查工作目录: {current_dir}")
        
        # 检查uploads目录
        print("2. 检查uploads目录...")
        uploads_dir = Path("uploads")
        if not uploads_dir.exists():
            uploads_dir.mkdir()
        
        # 检查测试图片
        print(f"3. 检查test.jpg是否存在: {Path('test.jpg').exists()}")
        
        # 检查配置文件
        print(f"4. 检查config.yaml是否存在: {Path('config.yaml').exists()}")

        print("\n=== 开始测试 ===")
        BASE_URL = "http://127.0.0.1:8000/api"
        print(f"API地址: {BASE_URL}")
        
        client = TestClient(BASE_URL)

        # 管理员登录
        print("\n管理员登录...")
        await client.login_admin()
        print("管理员登录成功!")

        # 测试管理员统计功能
        print("\n测试管理员统计功能...")
        stats = await client.get_admin_statistics()
        print(f"总用户数: {stats['total_users']}")
        print(f"总任务数: {stats['total_tasks']}")
        print(f"任务类型分布: {stats['task_type_counts']}")

        # 测试用户注册
        print("\n测试用户注册...")
        await client.register("testuser", "testpass", "test@example.com")
        print("用户已存在，尝试登录...")

        # 测试用户登录
        print("\n测试用户登录...")
        await client.login("testuser", "testpass")
        print("登录成功!")

        # 测试文本生成3D
        # print("\n测试文本生成3D...")
        # text_task = await client.create_text_task("一个可爱的小猫咪")
        # text_task_id = text_task["task_id"]
        # print(f"文本生成任务创建成功! ID: {text_task_id}")

        # # 测试图片生成3D
        # print("\n测试图片生成3D...")
        # image_task = await client.create_image_task("test.jpg")
        # image_task_id = image_task["task_id"]
        # print(f"图片生成任务创建成功! ID: {image_task_id}")

        # # 测试多图生成3D
        # print("\n测试多图生成3D...")
        # multi_image_task = await client.create_multi_image_task("test.jpg")
        # multi_image_task_id = multi_image_task["task_id"]
        # print(f"多图生成任务创建成功! ID: {multi_image_task_id}")

        # 测试获取任务列表
        print("\n测试获取任务列表...")
        tasks = await client.get_task_list()
        print(f"获取到 {len(tasks)} 个任务")
        for task in tasks:
            print(f"任务ID: {task['task_id']}, 类型: {task['task_type']}, 状态: {task['status']}")

        print("\n=== 测试完成 ===")

    except Exception as e:
        print("\n=== 测试失败 ===")
        print(f"错误信息: {str(e)}")
        print("\n详细错误信息:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_tests())