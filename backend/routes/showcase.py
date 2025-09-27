from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional, Union
from services.db import Database
from services.auth import get_current_user
import logging
from datetime import datetime
import json
from enum import Enum

# 配置日志
logger = logging.getLogger(__name__)

# 定义排序选项枚举
class SortBy(str, Enum):
    latest = "latest"
    popular = "popular"
    likes = "likes"

router = APIRouter()
db = Database()

@router.get("/models")
async def get_showcase_models(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    sort_by: str = "latest",  # latest, popular, likes
    page: int = Query(1, gt=0),
    page_size: int = Query(20, gt=0, le=100),
    current_user: Optional[dict] = Depends(get_current_user)
) -> Dict[str, Any]:
    """获取模型展示列表"""
    try:
        # 构建基础查询
        query = """
            SELECT 
                s.*,
                u.username,
                (SELECT COUNT(*) FROM model_comments WHERE model_id = s.id) as comment_count
            FROM model_showcase s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.status = 'public'
        """
        params = []

        # 添加分类筛选
        if category:
            query += " AND s.category = %s"
            params.append(category)

        # 添加标签筛选
        if tag:
            query += " AND JSON_CONTAINS(s.tags, %s, '$')"
            params.append(f'"{tag}"')

        # 添加排序
        if sort_by == "popular":
            query += " ORDER BY s.views DESC"
        elif sort_by == "likes":
            query += " ORDER BY s.likes DESC"
        else:  # latest
            query += " ORDER BY s.created_at DESC"

        # 添加分页
        query += " LIMIT %s OFFSET %s"
        params.extend([page_size, (page - 1) * page_size])

        # 执行查询
        models = await db.fetch_all(query, params)

        # 获取总数
        count_query = """
            SELECT COUNT(*) as count
            FROM model_showcase s
            WHERE s.status = 'public'
        """
        count_params = []

        if category:
            count_query += " AND s.category = %s"
            count_params.append(category)

        if tag:
            count_query += " AND JSON_CONTAINS(s.tags, %s, '$')"
            count_params.append(f'"{tag}"')

        total = await db.fetch_one(count_query, count_params)
        total_count = total["count"]

        # 处理结果
        result = []
        for model in models:
            model_dict = dict(model)
            # 解析JSON字段
            model_dict["tags"] = json.loads(model_dict["tags"]) if model_dict["tags"] else []
            
            # 添加是否已点赞
            if current_user:
                like_query = """
                    SELECT COUNT(*) as liked
                    FROM model_likes
                    WHERE model_id = %s AND user_id = %s
                """
                like_status = await db.fetch_one(like_query, (model_dict["id"], current_user["user_id"]))
                model_dict["is_liked"] = bool(like_status["liked"])
            else:
                model_dict["is_liked"] = False
                
            result.append(model_dict)

        return {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "models": result
        }

    except Exception as e:
        logger.error("获取模型展示列表失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/{model_id}")
async def get_model_detail(
    model_id: int,
    current_user: Optional[dict] = Depends(get_current_user)
) -> Dict[str, Any]:
    """获取模型详情"""
    try:
        # 增加浏览量
        await db.execute(
            "UPDATE model_showcase SET views = views + 1 WHERE id = %s",
            (model_id,)
        )

        # 获取模型详情
        query = """
            SELECT 
                s.*,
                u.username,
                (SELECT COUNT(*) FROM model_comments WHERE model_id = s.id) as comment_count
            FROM model_showcase s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.id = %s AND s.status = 'public'
        """
        model = await db.fetch_one(query, (model_id,))

        if not model:
            raise HTTPException(status_code=404, detail="模型不存在")

        model_dict = dict(model)
        # 解析JSON字段
        model_dict["tags"] = json.loads(model_dict["tags"]) if model_dict["tags"] else []

        # 检查当前用户是否已点赞
        if current_user:
            like_query = """
                SELECT COUNT(*) as liked
                FROM model_likes
                WHERE model_id = %s AND user_id = %s
            """
            like_status = await db.fetch_one(like_query, (model_id, current_user["user_id"]))
            model_dict["is_liked"] = bool(like_status["liked"])
        else:
            model_dict["is_liked"] = False

        # 获取评论
        comments_query = """
            SELECT 
                c.id,
                c.user_id,
                c.content,
                c.created_at,
                u.username
            FROM model_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.model_id = %s
            ORDER BY c.created_at DESC
        """
        comments = await db.fetch_all(comments_query, (model_id,))
        
        # 返回结构调整，将model和comments分开
        return {
            "model": model_dict,
            "comments": [dict(comment) for comment in comments]
        }

    except Exception as e:
        logger.error("获取模型详情失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models")
async def create_showcase_model(
    model: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """创建模型展示"""
    try:
        # 插入展示记录
        insert_query = """
            INSERT INTO model_showcase (
                user_id, title, description, category,
                tags, preview_url, model_url, status
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s
            )
        """
        values = (
            current_user["user_id"],
            model["title"],
            model.get("description", ""),
            model["category"],
            json.dumps(model.get("tags", [])),
            model.get("preview_url", ""),
            model["model_url"],  # 用户直接提供模型URL
            model.get("status", "public")
        )
        logger.info("准备插入的数据: %s", values)

        try:
            await db.execute(insert_query, values)
            logger.info("模型展示记录插入成功")
        except Exception as e:
            logger.error("插入模型展示记录失败: %s", str(e))
            raise HTTPException(status_code=500, detail=f"插入记录失败: {str(e)}")

        # 获取最后插入的ID
        try:
            last_id_query = "SELECT LAST_INSERT_ID() as id"
            result = await db.fetch_one(last_id_query)
            logger.info("获取最后插入ID结果: %s", result)
            if not result:
                raise HTTPException(status_code=500, detail="无法获取插入ID")
            model_id = result["id"]
            logger.info("获取到的模型ID: %s", model_id)
        except Exception as e:
            logger.error("获取最后插入ID失败: %s", str(e))
            raise HTTPException(status_code=500, detail=f"获取插入ID失败: {str(e)}")

        # 获取创建的模型详情
        try:
            query = """
                SELECT 
                    s.*,
                    u.username,
                    (SELECT COUNT(*) FROM model_comments WHERE model_id = s.id) as comment_count
                FROM model_showcase s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE s.id = %s
            """
            created_model = await db.fetch_one(query, (model_id,))
            logger.info("获取模型详情结果: %s", created_model)
            
            if not created_model:
                raise HTTPException(status_code=500, detail=f"无法获取ID为{model_id}的模型信息")

            # 处理返回数据
            result = dict(created_model)
            result["tags"] = json.loads(result["tags"]) if result["tags"] else []

            return result
        except Exception as e:
            logger.error("获取模型详情失败: %s", str(e))
            raise HTTPException(status_code=500, detail=f"获取模型详情失败: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("创建模型展示失败: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/models/{model_id}")
async def update_showcase_model(
    model_id: int,
    model: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """更新模型展示"""
    try:
        # 验证权限
        owner_query = "SELECT user_id FROM model_showcase WHERE id = %s"
        owner = await db.fetch_one(owner_query, (model_id,))
        
        if not owner or owner["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="无权修改此模型")

        # 更新记录
        update_query = """
            UPDATE model_showcase
            SET title = %s,
                description = %s,
                category = %s,
                tags = %s,
                preview_url = %s,
                model_url = %s,
                status = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """
        await db.execute(
            update_query,
            (
                model["title"],
                model.get("description", ""),
                model["category"],
                json.dumps(model.get("tags", [])),
                model.get("preview_url", ""),
                model["model_url"],
                model.get("status", "public"),
                model_id
            )
        )

        return {"message": "模型展示更新成功"}

    except Exception as e:
        logger.error("更新模型展示失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/models/{model_id}")
async def delete_showcase_model(
    model_id: int,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """删除模型展示"""
    try:
        # 验证权限
        owner_query = "SELECT user_id FROM model_showcase WHERE id = %s"
        owner = await db.fetch_one(owner_query, (model_id,))
        
        if not owner or owner["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="无权删除此模型")

        # 删除相关记录
        await db.execute("DELETE FROM model_likes WHERE model_id = %s", (model_id,))
        await db.execute("DELETE FROM model_comments WHERE model_id = %s", (model_id,))
        await db.execute("DELETE FROM model_showcase WHERE id = %s", (model_id,))

        return {"message": "模型展示删除成功"}

    except Exception as e:
        logger.error("删除模型展示失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/{model_id}/like")
async def toggle_model_like(
    model_id: int,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """切换模型点赞状态"""
    try:
        # 检查模型是否存在
        model_query = "SELECT id FROM model_showcase WHERE id = %s"
        model = await db.fetch_one(model_query, (model_id,))
        
        if not model:
            raise HTTPException(status_code=404, detail="模型不存在")

        # 检查是否已点赞
        like_query = """
            SELECT id FROM model_likes
            WHERE model_id = %s AND user_id = %s
        """
        existing_like = await db.fetch_one(like_query, (model_id, current_user["user_id"]))

        if existing_like:
            # 取消点赞
            await db.execute(
                "DELETE FROM model_likes WHERE id = %s",
                (existing_like["id"],)
            )
            await db.execute(
                "UPDATE model_showcase SET likes = likes - 1 WHERE id = %s",
                (model_id,)
            )
            return {"message": "取消点赞成功"}
        else:
            # 添加点赞
            await db.execute(
                "INSERT INTO model_likes (model_id, user_id) VALUES (%s, %s)",
                (model_id, current_user["user_id"])
            )
            await db.execute(
                "UPDATE model_showcase SET likes = likes + 1 WHERE id = %s",
                (model_id,)
            )
            return {"message": "点赞成功"}

    except Exception as e:
        logger.error("切换点赞状态失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/{model_id}/comments")
async def add_model_comment(
    model_id: int,
    comment: Dict[str, str],
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """添加模型评论"""
    try:
        # 检查模型是否存在
        model_query = "SELECT id FROM model_showcase WHERE id = %s"
        model = await db.fetch_one(model_query, (model_id,))
        
        if not model:
            raise HTTPException(status_code=404, detail="模型不存在")

        # 插入评论
        insert_query = """
            INSERT INTO model_comments (model_id, user_id, content)
            VALUES (%s, %s, %s)
        """
        await db.execute(
            insert_query,
            (model_id, current_user["user_id"], comment["content"])
        )

        # 获取插入的评论ID
        result = await db.fetch_one("SELECT LAST_INSERT_ID() as id")
        if not result:
            raise HTTPException(status_code=500, detail="评论创建失败")
            
        comment_id = result["id"]
        logger.info("评论创建成功，ID: %s", comment_id)

        # 立即获取完整的评论数据
        comment_query = """
            SELECT 
                c.id,
                c.user_id,
                c.content,
                c.created_at,
                u.username
            FROM model_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = LAST_INSERT_ID()
        """
        new_comment = await db.fetch_one(comment_query)
        if not new_comment:
            raise HTTPException(status_code=500, detail="无法获取新创建的评论")

        # 转换为字典并格式化日期
        comment_data = dict(new_comment)
        comment_data["created_at"] = comment_data["created_at"].isoformat() if comment_data["created_at"] else None

        return comment_data

    except Exception as e:
        logger.error("添加评论失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/comments/{comment_id}")
async def delete_model_comment(
    comment_id: int,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """删除模型评论"""
    try:
        # 验证权限
        comment_query = "SELECT user_id FROM model_comments WHERE id = %s"
        comment = await db.fetch_one(comment_query, (comment_id,))
        logger.info("查找到的评论: %s", comment)
        
        if not comment:
            logger.error("评论不存在: %s", comment_id)
            raise HTTPException(status_code=404, detail="评论不存在")
        
        if comment["user_id"] != current_user["user_id"]:
            logger.error("无权删除评论: comment_user_id=%s, current_user_id=%s", 
                        comment["user_id"], current_user["user_id"])
            raise HTTPException(status_code=403, detail="无权删除此评论")

        # 删除评论
        delete_query = "DELETE FROM model_comments WHERE id = %s"
        await db.execute(delete_query, (comment_id,))
        logger.info("评论删除成功: %s", comment_id)

        return {"message": "评论删除成功"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("删除评论失败: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 

@router.get("/models/{model_id}/comments")
async def get_model_comments(
    model_id: int,
    current_user: Optional[dict] = Depends(get_current_user)
) -> Dict[str, Any]:
    """获取模型评论列表"""
    try:
        # 获取评论
        comments_query = """
            SELECT 
                c.id,
                c.user_id,
                c.content,
                c.created_at,
                u.username
            FROM model_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.model_id = %s
            ORDER BY c.created_at DESC
        """
        comments = await db.fetch_all(comments_query, (model_id,))
        
        return {
            "comments": [dict(comment) for comment in comments]
        }

    except Exception as e:
        logger.error("获取评论列表失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) 

@router.get("/tags/popular")
async def get_popular_tags(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """获取热门标签"""
    try:
        # 从模型表中获取所有标签并统计数量
        query = """
            SELECT 
                tag,
                COUNT(*) as count
            FROM model_showcase,
                 JSON_TABLE(tags, '$[*]' COLUMNS (tag VARCHAR(50) PATH '$')) as t
            GROUP BY tag
            ORDER BY count DESC
            LIMIT 10
        """
        tags = await db.fetch_all(query)
        
        return {
            "tags": [{"tag": tag["tag"], "count": tag["count"]} for tag in tags]
        }

    except Exception as e:
        logger.error("获取热门标签失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) 

@router.get("/designers/leaderboard")
async def get_designer_leaderboard(
    limit: int = Query(10, gt=0, le=50),
    current_user: Optional[dict] = Depends(get_current_user)
) -> Dict[str, Any]:
    """获取设计师排行榜"""
    try:
        # 使用创建好的designer_stats视图获取数据
        query = """
            SELECT 
                id,
                username,
                email,
                works_count,
                total_likes
            FROM designer_stats 
            ORDER BY total_likes DESC 
            LIMIT %s
        """
        
        designers = await db.fetch_all(query, (limit,))
        result = []
        
        for rank, designer in enumerate(designers, 1):
            # 生成简单的头像文本（用户名首字母）
            avatar_text = designer["username"][0].upper() if designer["username"] else "U"
            
            result.append({
                "id": str(designer["id"]),
                "username": designer["username"],
                "email": designer["email"],
                "worksCount": designer["works_count"] or 0,  # 修改字段名以匹配前端
                "likes": designer["total_likes"] or 0,
                "rank": rank,
                "avatarText": avatar_text  # 确保字段名匹配
            })
        
        return {
            "designers": result,
            "total": len(result)
        }

    except Exception as e:
        logger.error("获取设计师排行榜失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) 

@router.get("/liked-models")  # Changed from "/models/liked" to "/liked-models"
async def get_liked_models(
    sort_by: SortBy = SortBy.latest,
    page: Union[int, str] = Query(1),
    page_size: Union[int, str] = Query(20),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """获取用户收藏的模型列表"""
    try:
        logger.info(f"收到请求参数: sort_by={sort_by}, page={page}, page_size={page_size}, user={current_user}")

        # 确保参数类型正确
        try:
            page = int(page)
            page_size = int(page_size)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="页码和每页数量必须是整数")

        if page < 1:
            raise HTTPException(status_code=400, detail="页码必须大于0")
        if page_size < 1 or page_size > 100:
            raise HTTPException(status_code=400, detail="每页数量必须在1到100之间")

        # 构建基础查询
        query = """
            SELECT 
                s.*,
                u.username,
                (SELECT COUNT(*) FROM model_comments WHERE model_id = s.id) as comment_count
            FROM model_showcase s
            LEFT JOIN users u ON s.user_id = u.id
            INNER JOIN model_likes l ON s.id = l.model_id AND l.user_id = %s
            WHERE s.status = 'public'
        """
        params = [current_user["user_id"]]

        # 添加排序
        if sort_by == "popular":
            query += " ORDER BY s.views DESC"
        elif sort_by == "likes":
            query += " ORDER BY s.likes DESC"
        else:  # latest
            query += " ORDER BY s.created_at DESC"

        # 添加分页
        query += " LIMIT %s OFFSET %s"
        params.extend([page_size, (page - 1) * page_size])

        # 执行查询
        models = await db.fetch_all(query, params)

        # 获取总数
        count_query = """
            SELECT COUNT(*) as count
            FROM model_showcase s
            INNER JOIN model_likes l ON s.id = l.model_id AND l.user_id = %s
            WHERE s.status = 'public'
        """
        total = await db.fetch_one(count_query, (current_user["user_id"],))
        total_count = total["count"]

        # 处理结果
        result = []
        for model in models:
            model_dict = dict(model)
            # 解析JSON字段
            model_dict["tags"] = json.loads(model_dict["tags"]) if model_dict["tags"] else []
            # 已点赞的模型
            model_dict["is_liked"] = True
            result.append(model_dict)

        return {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "models": result
        }

    except Exception as e:
        logger.error("获取收藏模型列表失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-models")  # Changed from "/models/my" to "/my-models"
async def get_my_models(
    sort_by: SortBy = SortBy.latest,
    page: Union[int, str] = Query(1),
    page_size: Union[int, str] = Query(20),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """获取用户自己的模型列表"""
    try:
        logger.info(f"收到请求参数: sort_by={sort_by}, page={page}, page_size={page_size}, user={current_user}")

        # 确保参数类型正确
        try:
            page = int(page)
            page_size = int(page_size)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="页码和每页数量必须是整数")

        if page < 1:
            raise HTTPException(status_code=400, detail="页码必须大于0")
        if page_size < 1 or page_size > 100:
            raise HTTPException(status_code=400, detail="每页数量必须在1到100之间")

        # 构建基础查询
        query = """
            SELECT 
                s.*,
                u.username,
                (SELECT COUNT(*) FROM model_comments WHERE model_id = s.id) as comment_count
            FROM model_showcase s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.user_id = %s AND s.status = 'public'
        """
        params = [current_user["user_id"]]

        # 添加排序
        if sort_by == "popular":
            query += " ORDER BY s.views DESC"
        elif sort_by == "likes":
            query += " ORDER BY s.likes DESC"
        else:  # latest
            query += " ORDER BY s.created_at DESC"

        # 添加分页
        query += " LIMIT %s OFFSET %s"
        params.extend([page_size, (page - 1) * page_size])

        # 执行查询
        models = await db.fetch_all(query, params)

        # 获取总数
        count_query = """
            SELECT COUNT(*) as count
            FROM model_showcase s
            WHERE s.user_id = %s AND s.status = 'public'
        """
        total = await db.fetch_one(count_query, (current_user["user_id"],))
        total_count = total["count"]

        # 处理结果
        result = []
        for model in models:
            model_dict = dict(model)
            # 解析JSON字段
            model_dict["tags"] = json.loads(model_dict["tags"]) if model_dict["tags"] else []
            
            # 检查是否已点赞
            like_query = """
                SELECT COUNT(*) as liked
                FROM model_likes
                WHERE model_id = %s AND user_id = %s
            """
            like_status = await db.fetch_one(like_query, (model_dict["id"], current_user["user_id"]))
            model_dict["is_liked"] = bool(like_status["liked"])
            
            result.append(model_dict)

        return {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "models": result
        }

    except Exception as e:
        logger.error("获取我的模型列表失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) 