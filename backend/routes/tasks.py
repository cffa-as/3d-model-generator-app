from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query, Request
from typing import Dict, Any, List, Optional
import base64
import json
import logging
from services.db import Database
from services.auth import get_current_user
from services.meshy_client import MeshyClient
from services.cache_service import ModelCacheService
from services.storage import storage_service
from services.deepseek_client import deepseek_client
from models.task import TaskCreate
import httpx
import os
import hashlib
from pathlib import Path
from starlette.responses import FileResponse
import asyncio
from datetime import datetime
import uuid
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# 配置日志
logging.basicConfig(level=logging.DEBUG)  # 设置日志级别为DEBUG
logger = logging.getLogger(__name__)

router = APIRouter()
db = Database()
meshy_client = MeshyClient()
model_cache = ModelCacheService()

# 创建缓存目录
CACHE_DIR = Path("cache/models")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/check-similar")
async def check_similar_models(
    task: dict,
    cache_service: ModelCacheService = Depends(ModelCacheService)
):
    try:
        if task["task_type"] == "text":
            results = cache_service.find_similar_models(
                prompt=task["prompt"],
                style=task.get("art_style", ""),
                similarity_threshold=0.8  # 使用0.8的阈值
            )
            return {
                "found": len(results) > 0,
                "models": results
            }
        elif task["task_type"] in ["image", "multi_image"]:
            # 检查图片相似度
            similar_images = []
            
            for image_path in task.get("image_paths", []):
                if not os.path.exists(image_path):
                    logger.warning(f"图片文件不存在: {image_path}")
                    continue
                    
                similar = storage_service.find_similar_images_by_path(image_path)
                if similar:
                    similar_images.extend(similar)
            
            if similar_images:
                # 构建MySQL兼容的查询，查询 original_image_url 字段
                like_conditions = []
                query_params = []
                for img in similar_images:
                    like_conditions.append("original_image_url LIKE %s")
                    query_params.append(f'%{img}%')
                
                query = f"""
                    SELECT id, task_id, prompt, status, model_urls, thumbnail_url, created_at
                    FROM generation_tasks
                    WHERE ({' OR '.join(like_conditions)})
                    AND status = 'completed'
                    LIMIT 5
                """
                
                similar_tasks = await db.fetch_all(query, tuple(query_params))
                
                return {
                    "found": len(similar_tasks) > 0,
                    "models": [{
                        "task_id": task["task_id"],
                        "prompt": task["prompt"],
                        "model_urls": json.loads(task["model_urls"]) if task["model_urls"] else None,
                        "thumbnail_url": task["thumbnail_url"],
                        "created_at": task["created_at"].isoformat() if task["created_at"] else None
                    } for task in similar_tasks]
                }
            
        return {"found": False, "models": []}
    except Exception as e:
        logger.error(f"检查相似模型失败: {e}")
        return {"found": False, "models": []}

@router.post("/ai-generate-prompt")
async def ai_generate_prompt(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    使用AI生成详细的提示词
    """
    try:
        user_input = request.get("user_input", "").strip()
        prompt_type = request.get("prompt_type", "3d_model")
        
        if not user_input:
            raise HTTPException(status_code=400, detail="请提供用户输入")
        
        # 调用DeepSeek API生成提示词
        generated_prompt = await deepseek_client.generate_prompt(
            user_input=user_input,
            prompt_type=prompt_type
        )
        
        return {
            "success": True,
            "generated_prompt": generated_prompt,
            "original_input": user_input
        }
        
    except Exception as e:
        logger.error(f"AI生成提示词失败: {e}")
        raise HTTPException(status_code=500, detail=f"生成提示词失败: {str(e)}")

@router.post("/ai-optimize-prompt")
async def ai_optimize_prompt(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    使用AI优化现有提示词
    """
    try:
        original_prompt = request.get("original_prompt", "").strip()
        
        if not original_prompt:
            raise HTTPException(status_code=400, detail="请提供原始提示词")
        
        # 调用DeepSeek API优化提示词
        optimized_prompt = await deepseek_client.optimize_prompt(
            original_prompt=original_prompt
        )
        
        return {
            "success": True,
            "optimized_prompt": optimized_prompt,
            "original_prompt": original_prompt
        }
        
    except Exception as e:
        logger.error(f"AI优化提示词失败: {e}")
        raise HTTPException(status_code=500, detail=f"优化提示词失败: {str(e)}")

@router.post("/generate")
async def create_task(
    request: Request,
    use_cache: bool = True,
    current_user: dict = Depends(get_current_user),
    cache_service: ModelCacheService = Depends(ModelCacheService)
):
    try:
        # 获取原始请求数据
        raw_data = await request.json()
        
        # 验证并转换为TaskCreate模型
        try:
            task = TaskCreate(**raw_data)
        except Exception as e:
            logger.error(f"数据验证错误: {str(e)}")
            logger.error(f"Failed data: {raw_data}")
            raise HTTPException(status_code=422, detail=str(e))



        # 如果是文本任务，检查缓存
        if task.task_type == "text" and use_cache:
            cached_result = cache_service.find_similar_model(
                prompt=task.prompt,
                style=task.art_style or "",
                similarity_threshold=0.85
            )
            
            if cached_result and isinstance(cached_result, dict) and cached_result.get("found"):
                # 使用新的缓存结果格式
                task_id = str(uuid.uuid4())
                query = """
                    INSERT INTO generation_tasks 
                    (task_id, user_id, task_type, prompt, status, model_urls, created_at, started_at, finished_at, progress)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW(), NOW(), 100)
                """
                values = (
                    task_id,
                    current_user["user_id"],
                    task.task_type,
                    task.prompt,
                    "completed",
                    json.dumps(cached_result.get("model_urls", {})),
                )
                
                # 使用同一连接创建任务并获取信息
                insert_query = query
                fetch_query = """
                    SELECT id, task_id, task_type, prompt, status, model_urls, 
                           created_at, started_at, finished_at, progress
                    FROM generation_tasks
                    WHERE id = %s
                """
                
                _, task_record = await db.create_model_with_immediate_fetch(
                    insert_query, values, fetch_query
                )
                
                if not task_record:
                    raise HTTPException(status_code=500, detail="保存任务失败")
                
                return {
                    "task_id": task_id,
                    "status": "completed",
                    "message": "使用缓存模型",
                    "is_cached": True,
                    "model_urls": json.loads(task_record["model_urls"]) if task_record["model_urls"] else None,
                }
        
        # 根据任务类型调用不同的API
        if task.task_type == "text":
            result = await meshy_client.create_text_task(
                prompt=task.prompt,
                art_style=task.art_style or "realistic",
                mode=task.mode or "preview",
                should_remesh=task.should_remesh if task.should_remesh is not None else True,
                enable_pbr=task.enable_pbr if task.enable_pbr is not None else False,
                texture_prompt=task.texture_prompt,
                texture_image_url=task.texture_image_url,
                ai_model=task.ai_model,
                preview_task_id=task.preview_task_id,
                seed=task.seed,
                topology=task.topology,
                target_polycount=task.target_polycount,
                symmetry_mode=task.symmetry_mode,
                is_a_t_pose=task.is_a_t_pose
            )
        elif task.task_type == "image":
            if not task.image_urls or len(task.image_urls) == 0:
                raise HTTPException(status_code=400, detail="图片URL不能为空")
            
            # 从base64 URL中提取图片数据
            image_url = task.image_urls[0]
            
            # 保存图片并获取文件名（用于数据库存储）
            saved_filename = None
            try:
                # 检查是否是base64图片URL
                if not image_url.startswith('data:image/'):
                    logger.error(f"Invalid image format. URL starts with: {image_url[:50]}")
                    raise ValueError("无效的图片格式")
                
                # 保存图片并获取文件名
                saved_filename = storage_service.save_base64_image(image_url)
                if not saved_filename:
                    raise HTTPException(status_code=400, detail="保存图片失败")
                
                # 提取base64数据用于Meshy API
                _, base64_data = image_url.split(',', 1)
                image_data = base64.b64decode(base64_data)
                
                result = await meshy_client.create_image_task(
                    image_data=image_data,
                    enable_pbr=True,
                    should_remesh=True,
                    should_texture=True
                )
            except Exception as e:
                logger.error("处理图片数据失败: %s", str(e))
                raise HTTPException(status_code=400, detail="无效的图片数据")
                
        elif task.task_type == "multi_image":
            if not task.image_urls or len(task.image_urls) < 2:
                raise HTTPException(status_code=400, detail="多图生成至少需要2张图片")
            
            # 保存所有图片并获取文件名
            saved_filenames = []
            try:
                image_data_list = []
                for image_url in task.image_urls:
                    if not image_url.startswith('data:image/'):
                        raise ValueError("无效的图片格式")
                    
                    # 保存图片并获取文件名
                    saved_filename = storage_service.save_base64_image(image_url)
                    if saved_filename:
                        saved_filenames.append(saved_filename)
                    else:
                        raise HTTPException(status_code=400, detail="保存图片失败")
                    
                    # 提取base64数据用于Meshy API
                    _, base64_data = image_url.split(',', 1)
                    image_data = base64.b64decode(base64_data)
                    image_data_list.append(image_data)
                
                result = await meshy_client.create_multi_image_task(
                    image_data_list=image_data_list,
                    enable_pbr=True,
                    should_remesh=True,
                    should_texture=True
                )
            except Exception as e:
                logger.error("处理图片数据失败: %s", str(e))
                raise HTTPException(status_code=400, detail="无效的图片数据")
        else:
            raise HTTPException(status_code=400, detail="不支持的任务类型")

        # 获取任务ID
        task_id = result.get("task_id")
        if not task_id:
            raise HTTPException(status_code=500, detail="创建任务失败")

        # 保存任务到数据库
        try:
            # 准备数据库字段
            image_urls_for_db = json.dumps(task.image_urls) if task.image_urls else None
            original_image_url_for_db = None
            
            # 对于图片任务，保存文件路径到 original_image_url 字段
            if task.task_type == "image" and saved_filename:
                original_image_url_for_db = saved_filename
            elif task.task_type == "multi_image" and saved_filenames:
                original_image_url_for_db = json.dumps(saved_filenames)
            
            query = """
                INSERT INTO generation_tasks 
                (user_id, task_id, task_type, prompt, image_urls, original_image_url, status, progress,
                 preview_task_id, enable_pbr, texture_prompt, texture_image_url, ai_model,
                 seed, topology, target_polycount, symmetry_mode, is_a_t_pose)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            values = (
                current_user["user_id"],
                task_id,
                task.task_type,
                task.prompt,
                image_urls_for_db,  # base64 数据
                original_image_url_for_db,  # 文件路径
                "pending",
                0,
                task.preview_task_id,
                task.enable_pbr,
                task.texture_prompt,
                task.texture_image_url,
                task.ai_model,
                task.seed,
                task.topology,
                task.target_polycount,
                task.symmetry_mode,
                task.is_a_t_pose
            )
            
            await db.execute(query, values)

            return {
                "task_id": task_id,
                "status": "pending",
                "message": "任务创建成功",
                "progress": 0
            }
        except Exception as e:
            logger.error(f"保存任务到数据库失败: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"保存任务失败: {str(e)}")

    except Exception as e:
        logger.error("创建任务失败:", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_user_tasks(
    current_user: dict = Depends(get_current_user), 
    sync_status: bool = False,
    limit: int = 10,  # 默认限制10条
    offset: int = 0   # 默认从0开始
) -> List[Dict[str, Any]]:
    """获取用户的任务列表"""
    try:
        # 从数据库获取任务列表
        query = """
            SELECT id, task_id, task_type, prompt, image_urls, status, progress,
                   created_at, started_at, finished_at,
                   model_urls, texture_urls, thumbnail_url, task_error
            FROM generation_tasks
            WHERE user_id = %s
        """
        tasks = await db.fetch_all(query, (current_user["user_id"],))

        # 在应用层排序
        tasks = sorted(tasks, key=lambda x: x["created_at"] or "0", reverse=True)
        
        # 应用分页
        tasks = tasks[offset:offset + limit]

        # 如果需要同步状态
        if sync_status:
            meshy_tasks = await meshy_client.list_tasks()
            meshy_tasks_dict = {task["id"]: task for task in meshy_tasks}

        result = []
        for task in tasks:
            task_data = {
                "id": task["id"],
                "task_id": task["task_id"],
                "task_type": task["task_type"],
                "prompt": task["prompt"],
                "image_urls": json.loads(task["image_urls"]) if task["image_urls"] else None,
                "status": task["status"],
                "progress": task["progress"],
                "created_at": task["created_at"].isoformat() if task["created_at"] else None,
                "started_at": task["started_at"],
                "finished_at": task["finished_at"],
                "model_urls": json.loads(task["model_urls"]) if task["model_urls"] else None,
                "texture_urls": json.loads(task["texture_urls"]) if task["texture_urls"] else None,
                "thumbnail_url": task["thumbnail_url"],
                "task_error": task["task_error"]
            }

            # 如果需要同步状态且在Meshy任务列表中找到对应任务
            if sync_status and task["task_id"] in meshy_tasks_dict:
                meshy_task = meshy_tasks_dict[task["task_id"]]
                # 更新状态和其他信息
                update_query = """
                    UPDATE generation_tasks
                    SET status = %s,
                        progress = %s,
                        model_urls = %s,
                        texture_urls = %s,
                        thumbnail_url = %s,
                        started_at = %s,
                        finished_at = %s,
                        task_error = %s
                    WHERE task_id = %s
                """
                update_values = (
                    meshy_task["status"],
                    meshy_task.get("progress", 0),
                    json.dumps(meshy_task.get("model_urls")) if meshy_task.get("model_urls") else None,
                    json.dumps(meshy_task.get("texture_urls")) if meshy_task.get("texture_urls") else None,
                    meshy_task.get("thumbnail_url"),
                    meshy_task.get("started_at"),
                    meshy_task.get("finished_at"),
                    meshy_task.get("task_error", {}).get("message", "") if meshy_task.get("task_error") else None,
                    task["task_id"]
                )
                await db.execute(update_query, update_values)

                # 更新返回数据
                task_data.update({
                    "status": meshy_task["status"],
                    "progress": meshy_task.get("progress", 0),
                    "model_urls": meshy_task.get("model_urls"),
                    "texture_urls": meshy_task.get("texture_urls"),
                    "thumbnail_url": meshy_task.get("thumbnail_url"),
                    "started_at": meshy_task.get("started_at"),
                    "finished_at": meshy_task.get("finished_at"),
                    "task_error": meshy_task.get("task_error", {}).get("message", "") if meshy_task.get("task_error") else None
                })

            result.append(task_data)

        return result

    except Exception as e:
        logger.error("获取任务列表失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{task_id}")
async def get_task_status(
    task_id: str, 
    current_user: dict = Depends(get_current_user),
    cache_service: ModelCacheService = Depends(ModelCacheService)
) -> Dict[str, Any]:
    """获取任务状态"""
    try:
        # 从数据库获取任务
        query = """
            SELECT id, task_id, task_type, prompt, image_urls, status, progress,
                   created_at, started_at, finished_at,
                   model_urls, texture_urls, thumbnail_url, task_error, preview_task_id
            FROM generation_tasks
            WHERE task_id = %s AND user_id = %s
        """
        task = await db.fetch_one(query, (task_id, current_user["user_id"]))

        if not task:
            raise HTTPException(status_code=404, detail="任务不存在")

        # 如果任务已完成或失败，直接返回数据库中的状态
        if task["status"] in ["completed", "failed"]:
            return {
                "id": task["id"],
                "task_id": task["task_id"],
                "task_type": task["task_type"],
                "prompt": task["prompt"],
                "image_urls": json.loads(task["image_urls"]) if task["image_urls"] else None,
                "status": task["status"],
                "progress": task.get("progress", 0),
                "model_urls": json.loads(task["model_urls"]) if task["model_urls"] else None,
                "texture_urls": json.loads(task["texture_urls"]) if task["texture_urls"] else None,
                "thumbnail_url": task["thumbnail_url"],
                "created_at": task["created_at"].isoformat() if task["created_at"] else None,
                "started_at": task["started_at"],
                "finished_at": task["finished_at"],
                "task_error": task["task_error"],
                "preview_task_id": task["preview_task_id"]
            }

        # 对于进行中的任务，尝试从Meshy获取最新状态（带重试）
        max_retries = 3
        retry_delay = 2  # 秒
        meshy_task = None
        
        for attempt in range(max_retries):
            try:
                meshy_task = await meshy_client.get_task(task_id, task["task_type"])
                break  # 成功获取，跳出循环
            except Exception as e:
                logger.warning(f"获取Meshy任务状态失败 (尝试 {attempt + 1}/{max_retries}): {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                else:
                    # 最后一次尝试失败，返回数据库中的状态
                    logger.error(f"多次尝试获取Meshy任务状态失败: {str(e)}")
                    return {
                        "id": task["id"],
                        "task_id": task["task_id"],
                        "task_type": task["task_type"],
                        "prompt": task["prompt"],
                        "image_urls": json.loads(task["image_urls"]) if task["image_urls"] else None,
                        "status": task["status"],
                        "progress": task.get("progress", 0),
                        "model_urls": json.loads(task["model_urls"]) if task["model_urls"] else None,
                        "texture_urls": json.loads(task["texture_urls"]) if task["texture_urls"] else None,
                        "thumbnail_url": task["thumbnail_url"],
                        "created_at": task["created_at"].isoformat() if task["created_at"] else None,
                        "started_at": task["started_at"],
                        "finished_at": task["finished_at"],
                        "task_error": task["task_error"]
                    }
        
        # 更新数据库中的任务状态
        if meshy_task:
            update_query = """
                UPDATE generation_tasks
                SET status = %s,
                    progress = %s,
                    model_urls = %s,
                    texture_urls = %s,
                    thumbnail_url = %s,
                    started_at = %s,
                    finished_at = %s,
                    task_error = %s
                WHERE task_id = %s
            """
            update_values = (
                meshy_task["status"],
                meshy_task.get("progress", 0),
                json.dumps(meshy_task.get("model_urls")) if meshy_task.get("model_urls") else None,
                json.dumps(meshy_task.get("texture_urls")) if meshy_task.get("texture_urls") else None,
                meshy_task.get("thumbnail_url"),
                meshy_task.get("started_at"),
                meshy_task.get("finished_at"),
                meshy_task.get("task_error", {}).get("message", "") if meshy_task.get("task_error") else None,
                task_id
            )
            await db.execute(update_query, update_values)

            # 如果任务完成了，将其加入缓存
            if meshy_task["status"] == "completed":
                cache_service.cache_model(
                    prompt=task["prompt"],
                    style=task.get("art_style", ""),
                    model_file_path=meshy_task["model_urls"].get("glb", ""),
                    task_id=task_id,
                    additional_info={
                        "created_at": task["created_at"].isoformat() if task["created_at"] else None,
                        "model_urls": meshy_task.get("model_urls"),
                        "thumbnail_url": meshy_task.get("thumbnail_url"),
                    }
                )

        # 返回更新后的任务信息
        return {
            "id": task["id"],
            "task_id": task["task_id"],
            "task_type": task["task_type"],
            "prompt": task["prompt"],
            "image_urls": json.loads(task["image_urls"]) if task["image_urls"] else None,
            "status": meshy_task["status"] if meshy_task else task["status"],
            "progress": meshy_task.get("progress", 0) if meshy_task else task.get("progress", 0),
            "model_urls": meshy_task.get("model_urls") if meshy_task else (json.loads(task["model_urls"]) if task["model_urls"] else None),
            "texture_urls": meshy_task.get("texture_urls") if meshy_task else (json.loads(task["texture_urls"]) if task["texture_urls"] else None),
            "thumbnail_url": meshy_task.get("thumbnail_url") if meshy_task else task["thumbnail_url"],
            "created_at": task["created_at"].isoformat() if task["created_at"] else None,
            "started_at": meshy_task.get("started_at") if meshy_task else task["started_at"],
            "finished_at": meshy_task.get("finished_at") if meshy_task else task["finished_at"],
            "task_error": meshy_task.get("task_error", {}).get("message", "") if meshy_task and meshy_task.get("task_error") else task["task_error"],
            "preview_task_id": task["preview_task_id"]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取任务状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """删除任务及其相关数据"""
    try:
        # 先检查任务是否存在
        check_query = """
            SELECT id, task_id, task_type, preview_task_id
            FROM generation_tasks
            WHERE task_id = %s AND user_id = %s
        """
        task = await db.fetch_one(check_query, (task_id, current_user["user_id"]))
        
        if not task:
            raise HTTPException(status_code=404, detail="任务不存在")

        # 查找所有引用此任务作为预览任务的精细化任务
        refined_query = """
            SELECT id, task_id, task_type
            FROM generation_tasks
            WHERE preview_task_id = %s AND user_id = %s
        """
        refined_tasks = await db.fetch_all(refined_query, (task_id, current_user["user_id"]))

        # 删除所有精细化任务
        for refined_task in refined_tasks:
            # 先删除数据库记录
            delete_refined_query = """
                DELETE FROM generation_tasks
                WHERE id = %s AND user_id = %s
            """
            await db.execute(delete_refined_query, (refined_task["id"], current_user["user_id"]))
            
            # 尝试删除远程任务（失败也不影响结果）
            try:
                if refined_task["task_type"] == "text":
                    await meshy_client.delete_text_task(refined_task["task_id"])
                elif refined_task["task_type"] == "image":
                    await meshy_client.delete_image_task(refined_task["task_id"])
                elif refined_task["task_type"] == "multi_image":
                    await meshy_client.delete_multi_image_task(refined_task["task_id"])
            except Exception as e:
                logger.warning(f"删除精细化远程任务失败 {refined_task['task_id']}: {str(e)} (本地数据已删除)")

        # 先删除数据库记录
        delete_query = """
            DELETE FROM generation_tasks
            WHERE id = %s AND user_id = %s
        """
        await db.execute(delete_query, (task["id"], current_user["user_id"]))

        # 尝试删除远程任务（失败也不影响结果，因为可能是第三方API问题）
        try:
            if task["task_type"] == "text":
                await meshy_client.delete_text_task(task_id)
            elif task["task_type"] == "image":
                await meshy_client.delete_image_task(task_id)
            elif task["task_type"] == "multi_image":
                await meshy_client.delete_multi_image_task(task_id)
        except Exception as e:
            logger.warning(f"删除远程任务失败 {task_id}: {str(e)} (本地数据已删除)")

        return {"message": "任务已删除"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("删除任务失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_images(
    files: List[UploadFile] = File(...), 
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """上传图片并返回文件路径和base64编码"""
    try:
        results = []
        for file in files:
            # 读取文件内容
            contents = await file.read()
            
            # 计算文件哈希作为文件名
            file_hash = hashlib.md5(contents).hexdigest()
            file_ext = os.path.splitext(file.filename)[1].lower()
            if file_ext not in ['.jpg', '.jpeg', '.png']:
                file_ext = '.jpg'
            
            file_name = f"{file_hash}{file_ext}"
            file_path = Path("uploads") / file_name
            
            # 确保上传目录存在
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # 保存文件
            with open(file_path, "wb") as f:
                f.write(contents)
            
            # 转换为base64
            base64_image = base64.b64encode(contents).decode()
            
            results.append({
                "file_path": str(file_path),
                "base64_image": f"data:image/{file.content_type.split('/')[-1]};base64,{base64_image}"
            })
            
        return {"results": results}
        
    except Exception as e:
        logger.error(f"上传图片失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/proxy/model/{task_id}")
async def proxy_model_file(task_id: str, current_user: dict = Depends(get_current_user)):
    """代理加载3D模型文件"""
    max_retries = 3  # 最大重试次数
    retry_delay = 1  # 重试间隔（秒）
    
    async def download_with_retry(url: str, retries: int = max_retries) -> bytes:
        """带重试机制的文件下载"""
        last_error = None
        for attempt in range(retries):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(url)
                    if response.status_code == 200:
                        return response.content
                    last_error = f"HTTP {response.status_code}"
            except Exception as e:
                last_error = str(e)
                if attempt < retries - 1:  # 如果不是最后一次尝试
                    await asyncio.sleep(retry_delay)  # 等待一段时间后重试
                continue
        raise Exception(f"下载失败（重试{retries}次）: {last_error}")

    try:
        # 从数据库获取任务
        query = """
            SELECT model_urls
            FROM generation_tasks
            WHERE task_id = %s
        """
        task = await db.fetch_one(query, (task_id,))

        if not task or not task["model_urls"]:
            raise HTTPException(status_code=404, detail="模型文件不存在")

        model_urls = json.loads(task["model_urls"])
        glb_url = model_urls.get("glb")

        if not glb_url:
            raise HTTPException(status_code=404, detail="GLB文件不存在")

        # 生成缓存文件路径
        cache_key = hashlib.md5(glb_url.encode()).hexdigest()
        cache_file = CACHE_DIR / f"{cache_key}.glb"

        # 如果缓存存在，直接返回
        if cache_file.exists():
            return FileResponse(
                cache_file,
                media_type="model/gltf-binary",
                filename=f"{task_id}.glb"
            )

        # 下载文件（带重试）
        try:
            content = await download_with_retry(glb_url)
            
            # 保存到缓存
            cache_file.write_bytes(content)

            # 返回文件
            return FileResponse(
                cache_file,
                media_type="model/gltf-binary",
                filename=f"{task_id}.glb"
            )
        except Exception as e:
            logger.error(f"下载模型文件失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"下载模型文件失败: {str(e)}")

    except Exception as e:
        logger.error(f"代理模型文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{task_id}/rate")
async def rate_task(
    task_id: str,
    rating: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """为任务评分"""
    try:
        # 验证评分范围
        user_rating = float(rating.get("rating", 0))
        if not 0 <= user_rating <= 10:
            raise HTTPException(status_code=400, detail="评分必须在0到10之间")

        # 检查任务是否存在且属于当前用户
        task = await db.fetch_one(
            "SELECT user_id, status FROM generation_tasks WHERE task_id = %s",
            (task_id,)
        )

        if not task:
            raise HTTPException(status_code=404, detail="任务不存在")
        
        if task["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="无权为此任务评分")

        if task["status"] != "completed":
            raise HTTPException(status_code=400, detail="只能为已完成的任务评分")

        # 更新评分
        await db.execute(
            """
            UPDATE generation_tasks 
            SET user_rating = %s, rating_comment = %s, rated_at = CURRENT_TIMESTAMP
            WHERE task_id = %s
            """,
            (user_rating, rating.get("comment"), task_id)
        )

        return {"message": "评分成功"}

    except Exception as e:
        logger.error("评分失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{task_id}/rating")
async def get_task_rating(
    task_id: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """获取任务评分"""
    try:
        # 先检查任务是否存在且属于当前用户
        task = await db.fetch_one(
            """
            SELECT user_rating, rating_comment, status
            FROM generation_tasks 
            WHERE task_id = %s AND user_id = %s
            """,
            (task_id, current_user["user_id"])
        )

        if not task:
            raise HTTPException(status_code=404, detail="任务不存在或无权访问")

        # 如果任务存在但没有评分，返回空的评分信息而不是404
        if task["user_rating"] is None:
            return {
                "rating": None,
                "comment": None,
                "has_rating": False
            }

        return {
            "rating": float(task["user_rating"]),
            "comment": task["rating_comment"] or "",
            "has_rating": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("获取评分失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

async def update_task_status(task_id: str, status: str, progress: int):
    """更新任务状态"""
    query = """
        UPDATE generation_tasks
        SET status = %s, progress = %s
        WHERE task_id = %s
    """
    await db.execute(query, (status, progress, task_id))

async def update_task_complete(task_id: str, model_urls: Dict[str, str]):
    """更新任务完成状态并添加模型URL"""
    query = """
        UPDATE generation_tasks
        SET status = 'completed', progress = 100, model_urls = %s
        WHERE task_id = %s
    """
    await db.execute(query, (json.dumps(model_urls), task_id))