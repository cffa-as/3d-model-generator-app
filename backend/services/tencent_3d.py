import json
import asyncio
from typing import Optional, Dict
import base64
from PIL import Image
import os
import yaml
from pathlib import Path
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.ai3d.v20250513 import ai3d_client, models
import time

# 获取配置
config_path = Path(__file__).parent.parent / "config.yaml"
with open(config_path, "r", encoding="utf-8") as f:
    config = yaml.safe_load(f)

class TencentHunyuan3DService:
    """腾讯混元生3D服务的业务封装"""
    
    def __init__(self):
        """初始化服务"""
        self.config = config["tencent"]
        self.model_config = self.config["model"]
        
        # 创建API客户端
        cred = credential.Credential(self.config["secret_id"], self.config["secret_key"])
        http_profile = HttpProfile()
        http_profile.endpoint = self.config["domain"]
        client_profile = ClientProfile()
        client_profile.httpProfile = http_profile
        
        self.client = ai3d_client.Ai3dClient(cred, self.config["region"], client_profile)
        
        # 任务队列管理
        self._task_lock = asyncio.Lock()
        self._retry_interval = 5  # 任务重试间隔（秒）
        self._max_retries = 12  # 最大重试次数（1分钟）
    
    def _validate_image(self, image_path: str) -> None:
        """验证图片是否符合API要求"""
        try:
            with Image.open(image_path) as img:
                width, height = img.size
                if width < config["upload"]["min_resolution"] or height < config["upload"]["min_resolution"]:
                    raise ValueError(f"图片分辨率太小，最小要求{config['upload']['min_resolution']}像素")
                if width > config["upload"]["max_resolution"] or height > config["upload"]["max_resolution"]:
                    raise ValueError(f"图片分辨率太大，最大允许{config['upload']['max_resolution']}像素")
                
                file_size = os.path.getsize(image_path)
                if file_size > config["upload"]["max_file_size"]:
                    raise ValueError(f"图片文件太大，最大允许{config['upload']['max_file_size']/1024/1024}MB")
                
                format_lower = img.format.lower() if img.format else ""
                if format_lower not in ["jpeg", "jpg", "png", "webp"]:
                    raise ValueError("不支持的图片格式，仅支持jpg、png、webp格式")
        except Exception as e:
            raise ValueError(f"图片验证失败: {str(e)}")

    async def _submit_task_with_retry(self, submit_func) -> str:
        """
        提交任务并在必要时重试
        
        Args:
            submit_func: 提交任务的函数
            
        Returns:
            str: 任务ID
        """
        retries = 0
        while retries < self._max_retries:
            try:
                async with self._task_lock:  # 使用锁确保同时只有一个任务
                    response = submit_func()
                    if hasattr(response, 'JobId'):
                        return response.JobId
                    raise Exception(f"API响应格式错误: {response}")
            except TencentCloudSDKException as err:
                if "RequestLimitExceeded" in err.code:
                    retries += 1
                    if retries >= self._max_retries:
                        raise Exception(f"任务队列已满，请稍后重试")
                    await asyncio.sleep(self._retry_interval)
                    continue
                raise Exception(f"API调用失败: {err}")
        raise Exception("提交任务失败，请稍后重试")
    
    async def _wait_for_job(self, job_id: str) -> Dict:
        """等待并获取任务结果"""
        req = models.QueryHunyuanTo3DJobRequest()
        req.JobId = job_id
        
        for _ in range(self.model_config["max_retries"]):
            try:
                response = self.client.QueryHunyuanTo3DJob(req)
                if hasattr(response, 'Status'):
                    if response.Status == "FAIL":
                        error_msg = getattr(response, 'ErrorMessage', '未知错误')
                        raise Exception(f"任务执行失败: {error_msg}")
                    if response.Status == "DONE":
                        return {
                            "Status": response.Status,
                            "ResultFile3Ds": [
                                {
                                    "PreviewImageUrl": getattr(file3d, 'PreviewImageUrl', ''),
                                    "Url": getattr(file3d, 'Url', ''),
                                    "Type": getattr(file3d, 'Type', '')
                                }
                                for file3d in getattr(response, 'ResultFile3Ds', [])
                            ]
                        }
                    
                    await asyncio.sleep(self.model_config["retry_interval"])
                else:
                    raise Exception(f"API响应格式错误: {response}")
                
            except TencentCloudSDKException as err:
                raise Exception(f"查询任务失败: {err}")
                
        raise Exception(f"任务超时，已等待{self.model_config['max_retries'] * self.model_config['retry_interval']}秒")
    
    async def generate_from_text(self, text: str, result_format: Optional[str] = None, enable_pbr: bool = False) -> Dict:
        """从文本生成3D模型"""
        try:
            if len(text.encode('utf-8')) > 1024:
                raise ValueError("文本长度超过1024字符限制")
            
            # 创建请求对象
            req = models.SubmitHunyuanTo3DJobRequest()
            req.Prompt = text
            req.ResultFormat = result_format or self.model_config["result_format"]
            req.EnablePBR = enable_pbr
            
            # 提交任务并等待结果
            job_id = await self._submit_task_with_retry(
                lambda: self.client.SubmitHunyuanTo3DJob(req)
            )
            return await self._wait_for_job(job_id)
            
        except Exception as e:
            raise Exception(f"生成3D模型失败: {str(e)}")
    
    async def generate_from_image(self, image_path: str, result_format: Optional[str] = None, enable_pbr: bool = False) -> Dict:
        """从图片生成3D模型"""
        try:
            self._validate_image(image_path)
            
            with open(image_path, "rb") as f:
                image_base64 = base64.b64encode(f.read()).decode()
            
            # 创建请求对象
            req = models.SubmitHunyuanTo3DJobRequest()
            req.ImageBase64 = image_base64
            req.ResultFormat = result_format or self.model_config["result_format"]
            req.EnablePBR = enable_pbr
            
            # 提交任务并等待结果
            job_id = await self._submit_task_with_retry(
                lambda: self.client.SubmitHunyuanTo3DJob(req)
            )
            return await self._wait_for_job(job_id)
            
        except Exception as e:
            raise Exception(f"生成3D模型失败: {str(e)}")

# 创建服务实例
tencent_3d = TencentHunyuan3DService() 