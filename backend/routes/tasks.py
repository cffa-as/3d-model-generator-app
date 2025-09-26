from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from typing import Dict, Any, List
import base64
import json
import logging
from services.db import Database
from services.auth import get_current_user
from services.meshy_client import meshy_client
from models.task import TaskCreate
import httpx
import os
import hashlib
from pathlib import Path
from starlette.responses import FileResponse

# 配置日志
logger = logging.getLogger(__name__)

router = APIRouter()
db = Database()

# 创建缓存目录
CACHE_DIR = Path("cache/models")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/generate")
async def create_generation_task(task: TaskCreate, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """创建3D模型生成任务"""
    try:
        # 根据任务类型调用不同的API
        if task.task_type == "text":
            # 检查是否是精细化任务
            if task.mode == "refine":
                # 检查预览任务是否存在且完成
                if not task.preview_task_id:
                    raise HTTPException(status_code=400, detail="精细化任务需要提供preview_task_id")
                
                # 检查预览任务状态
                preview_query = """
                    SELECT status
                    FROM generation_tasks
                    WHERE task_id = %s AND user_id = %s
                """
                preview_task = await db.fetch_one(preview_query, (task.preview_task_id, current_user["user_id"]))
                
                if not preview_task:
                    raise HTTPException(status_code=404, detail="预览任务不存在")
                
                if preview_task["status"] != "completed":
                    raise HTTPException(status_code=400, detail="预览任务尚未完成")
            
            result = await meshy_client.create_text_task(
                prompt=task.prompt,
                art_style=task.art_style or "realistic",
                mode=task.mode or "preview",
                should_remesh=task.should_remesh or True,
                enable_pbr=task.enable_pbr or False,
                texture_prompt=task.texture_prompt,
                texture_image_url=task.texture_image_url,
                ai_model=task.ai_model,
                preview_task_id=task.preview_task_id,
                # 新增参数
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
            try:
                # 检查是否是base64图片URL
                if not image_url.startswith('data:image/'):
                    raise ValueError("无效的图片格式")
                
                # 提取base64数据
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
            
            # 从base64 URL中提取所有图片数据
            try:
                image_data_list = []
                for image_url in task.image_urls:
                    if not image_url.startswith('data:image/'):
                        raise ValueError("无效的图片格式")
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
        query = """
            INSERT INTO generation_tasks 
            (user_id, task_id, task_type, prompt, image_urls, status, progress,
             preview_task_id, enable_pbr, texture_prompt, texture_image_url, ai_model,
             seed, topology, target_polycount, symmetry_mode, is_a_t_pose)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (
            current_user["user_id"],
            task_id,
            task.task_type,
            task.prompt,
            json.dumps(task.image_urls) if task.image_urls else None,
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

        # 查询刚创建的任务
        query = """
            SELECT id, task_id, task_type, prompt, image_urls, status, progress,
                   created_at, started_at, finished_at,
                   model_urls, texture_urls, thumbnail_url,
                   preview_task_id, enable_pbr, texture_prompt, texture_image_url, ai_model,
                   seed, topology, target_polycount, symmetry_mode, is_a_t_pose
            FROM generation_tasks
            WHERE task_id = %s
        """
        task_record = await db.fetch_one(query, (task_id,))
        
        if not task_record:
            raise HTTPException(status_code=500, detail="保存任务失败")

        return {
            "id": task_record["id"],
            "task_id": task_record["task_id"],
            "task_type": task_record["task_type"],
            "prompt": task_record["prompt"],
            "image_urls": json.loads(task_record["image_urls"]) if task_record["image_urls"] else None,
            "status": task_record["status"],
            "progress": task_record["progress"],
            "created_at": task_record["created_at"].isoformat() if task_record["created_at"] else None,
            "started_at": task_record["started_at"],
            "finished_at": task_record["finished_at"],
            "model_urls": json.loads(task_record["model_urls"]) if task_record["model_urls"] else None,
            "texture_urls": json.loads(task_record["texture_urls"]) if task_record["texture_urls"] else None,
            "thumbnail_url": task_record["thumbnail_url"],
            "preview_task_id": task_record["preview_task_id"],
            "enable_pbr": task_record["enable_pbr"],
            "texture_prompt": task_record["texture_prompt"],
            "texture_image_url": task_record["texture_image_url"],
            "ai_model": task_record["ai_model"],
            # 新增字段
            "seed": task_record["seed"],
            "topology": task_record["topology"],
            "target_polycount": task_record["target_polycount"],
            "symmetry_mode": task_record["symmetry_mode"],
            "is_a_t_pose": task_record["is_a_t_pose"]
        }

    except Exception as e:
        logger.error("创建任务失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks")
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

@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """获取任务状态"""
    try:
        # 从数据库获取任务
        query = """
            SELECT id, task_id, task_type, prompt, image_urls, status, progress,
                   created_at, started_at, finished_at,
                   model_urls, texture_urls, thumbnail_url, task_error
            FROM generation_tasks
            WHERE task_id = %s AND user_id = %s
        """
        task = await db.fetch_one(query, (task_id, current_user["user_id"]))

        if not task:
            raise HTTPException(status_code=404, detail="任务不存在")

        # 从Meshy获取最新状态
        meshy_task = await meshy_client.get_task(task_id, task["task_type"])
        
        # 更新数据库中的任务状态
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

        # 返回更新后的任务信息
        return {
            "id": task["id"],
            "task_id": task["task_id"],
            "task_type": task["task_type"],
            "prompt": task["prompt"],
            "image_urls": json.loads(task["image_urls"]) if task["image_urls"] else None,
            "status": meshy_task["status"],
            "progress": meshy_task.get("progress", 0),
            "model_urls": meshy_task.get("model_urls"),
            "texture_urls": meshy_task.get("texture_urls"),
            "thumbnail_url": meshy_task.get("thumbnail_url"),
            "created_at": task["created_at"].isoformat() if task["created_at"] else None,
            "started_at": meshy_task.get("started_at"),
            "finished_at": meshy_task.get("finished_at"),
            "task_error": meshy_task.get("task_error", {}).get("message", "") if meshy_task.get("task_error") else None
        }

    except Exception as e:
        logger.error("获取任务状态失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/tasks/{task_id}")
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
            try:
                # 尝试删除远程任务
                if refined_task["task_type"] == "text":
                    await meshy_client.delete_text_task(refined_task["task_id"])
                elif refined_task["task_type"] == "image":
                    await meshy_client.delete_image_task(refined_task["task_id"])
                elif refined_task["task_type"] == "multi_image":
                    await meshy_client.delete_multi_image_task(refined_task["task_id"])
            except Exception as e:
                logger.error(f"删除精细化远程任务失败 {refined_task['task_id']}: {str(e)}")

            # 删除数据库记录
            delete_refined_query = """
                DELETE FROM generation_tasks
                WHERE id = %s AND user_id = %s
            """
            await db.execute(delete_refined_query, (refined_task["id"], current_user["user_id"]))

        # 删除原始任务的远程数据
        try:
            if task["task_type"] == "text":
                await meshy_client.delete_text_task(task_id)
            elif task["task_type"] == "image":
                await meshy_client.delete_image_task(task_id)
            elif task["task_type"] == "multi_image":
                await meshy_client.delete_multi_image_task(task_id)
        except Exception as e:
            logger.error(f"删除原始远程任务失败 {task_id}: {str(e)}")

        # 删除原始任务的数据库记录
        delete_query = """
            DELETE FROM generation_tasks
            WHERE id = %s AND user_id = %s
        """
        await db.execute(delete_query, (task["id"], current_user["user_id"]))

        return {"message": "任务已删除"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("删除任务失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_images(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)) -> Dict[str, str]:
    """上传图片并返回base64编码"""
    try:
        # 读取上传的文件内容
        contents = await file.read()
        
        # 转换为base64
        base64_image = base64.b64encode(contents).decode()
        
        return {"base64_image": f"data:image/{file.content_type.split('/')[-1]};base64,{base64_image}"}
        
    except Exception as e:
        logger.error("上传图片失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) 

@router.get("/proxy/model/{task_id}")
async def proxy_model_file(task_id: str, current_user: dict = Depends(get_current_user)):
    """代理加载3D模型文件"""
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

        # 下载文件
        async with httpx.AsyncClient() as client:
            response = await client.get(glb_url)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="获取模型文件失败")

            # 保存到缓存
            cache_file.write_bytes(response.content)

            # 返回文件
            return FileResponse(
                cache_file,
                media_type="model/gltf-binary",
                filename=f"{task_id}.glb"
            )

    except Exception as e:
        logger.error(f"代理模型文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))