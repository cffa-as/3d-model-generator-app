from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Dict, Any
import logging
from services.db import Database
from services.auth import create_access_token, get_current_user
from models.user import UserCreate, Token, User

# 配置日志
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users")  # 添加前缀
db = Database()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/users/token")  # 修改tokenUrl

@router.get("/me", response_model=User)
async def get_user_me(current_user: Dict = Depends(get_current_user)):
    """获取当前用户信息"""
    try:
        query = """
            SELECT id, username, email, is_admin, created_at
            FROM users
            WHERE id = %s
        """
        user = await db.fetch_one(query, (current_user["user_id"],))
        
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
            
        return {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "is_admin": user["is_admin"],
            "created_at": user["created_at"].isoformat() if user["created_at"] else None
        }
    except Exception as e:
        logger.error("获取用户信息失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/register")
async def register_user(user: UserCreate) -> Dict[str, Any]:
    """注册新用户"""
    try:
        # 检查用户名是否已存在
        query = "SELECT id FROM users WHERE username = %s"
        existing_user = await db.fetch_one(query, (user.username,))
        if existing_user:
            # 如果用户已存在，返回200状态码和提示信息
            return {"message": "用户已存在"}

        # 检查邮箱是否已存在
        query = "SELECT id FROM users WHERE email = %s"
        existing_email = await db.fetch_one(query, (user.email,))
        if existing_email:
            # 如果邮箱已存在，返回200状态码和提示信息
            return {"message": "邮箱已被注册"}

        # 使用同一个连接创建用户并获取信息
        insert_query = """
            INSERT INTO users (username, password, email)
            VALUES (%s, %s, %s)
        """
        fetch_query = """
            SELECT id, username, email, is_admin, created_at
            FROM users
            WHERE id = %s
        """
        
        user_id, new_user = await db.create_model_with_immediate_fetch(
            insert_query, 
            (user.username, user.password, user.email),
            fetch_query
        )
        
        if not new_user:
            raise HTTPException(status_code=500, detail="用户创建失败")

        return {
            "id": new_user["id"],
            "username": new_user["username"],
            "email": new_user["email"],
            "is_admin": new_user["is_admin"],
            "created_at": new_user["created_at"].isoformat() if new_user["created_at"] else None,
            "message": "注册成功"
        }

    except Exception as e:
        logger.error("用户注册失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
    """用户登录"""
    try:
        # 查询用户
        query = """
            SELECT id, username, password, is_admin
            FROM users
            WHERE username = %s AND password = %s
        """
        user = await db.fetch_one(query, (form_data.username, form_data.password))
        
        if not user:
            raise HTTPException(
                status_code=401,
                detail="用户名或密码错误",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 创建访问令牌
        token_data = {
            "user_id": user["id"],
            "username": user["username"],
            "is_admin": user["is_admin"]
        }
        access_token = create_access_token(data=token_data)
        
        return Token(access_token=access_token)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("用户登录失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) 

@router.post("/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)) -> Dict[str, str]:
    """刷新访问令牌"""
    try:
        # 创建新的访问令牌
        access_token = create_access_token(
            data={
                "user_id": current_user["user_id"],
                "username": current_user["username"],
                "is_admin": current_user["is_admin"]
            }
        )
        return {"access_token": access_token}
    except Exception as e:
        logger.error("刷新token失败: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) 