from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
import logging
from services.db import Database
from services.auth import get_current_user
import json

# 配置日志
logger = logging.getLogger(__name__)

router = APIRouter()
db = Database()

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """验证当前用户是否为管理员"""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=403,
            detail="需要管理员权限"
        )
    return current_user

@router.get("/statistics")
async def get_statistics(current_user: dict = Depends(get_admin_user)) -> Dict[str, Any]:
    """获取基础统计数据"""
    try:
        # 获取总用户数
        query = "SELECT COUNT(*) as count FROM users"
        result = await db.fetch_one(query)
        total_users = result["count"]

        # 获取总任务数和任务类型分布
        query = """
            SELECT task_type, COUNT(*) as count
            FROM generation_tasks
            GROUP BY task_type
        """
        tasks = await db.fetch_all(query)
        
        # 计算总任务数和类型分布
        total_tasks = 0
        task_type_counts = {}
        for task in tasks:
            count = task["count"]
            total_tasks += count
            task_type_counts[task["task_type"]] = count

        return {
            "total_users": total_users,
            "total_tasks": total_tasks,
            "task_type_counts": task_type_counts
        }

    except Exception as e:
        logger.error("获取统计数据失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) 

@router.get("/tasks")
async def get_all_tasks(current_user: dict = Depends(get_admin_user)) -> List[Dict[str, Any]]:
    """获取所有用户的任务列表（包含评估数据）"""
    try:
        query = """
            SELECT 
                t.id,
                t.task_id,
                t.user_id,
                u.username,
                t.task_type,
                t.status,
                t.created_at,
                t.model_urls,
                t.texture_urls,
                t.evaluation_status,
                t.topology_score,
                t.geometry_score,
                t.rendering_score,
                t.evaluation_history
            FROM generation_tasks t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        """
        tasks = await db.fetch_all(query)
        
        # 处理JSON字段
        result = []
        for task in tasks:
            task_dict = dict(task)
            # 解析JSON字段
            for field in ['model_urls', 'texture_urls', 'evaluation_history']:
                if task_dict.get(field):
                    try:
                        task_dict[field] = json.loads(task_dict[field])
                    except:
                        task_dict[field] = None
            result.append(task_dict)
            
        return result

    except Exception as e:
        logger.error("获取任务列表失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) 