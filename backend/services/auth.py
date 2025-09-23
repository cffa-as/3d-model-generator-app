from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from jose import jwt, JWTError
from services.db import db
from models.user import UserInDB, TokenData
import logging

# 配置日志
logger = logging.getLogger(__name__)

# JWT配置
SECRET_KEY = "your-secret-key"  # 在生产环境中应该使用环境变量
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7天过期

# OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_user(username: str) -> Optional[UserInDB]:
    """根据用户名获取用户"""
    query = "SELECT * FROM users WHERE username = %s"
    user_dict = await db.fetch_one(query, (username,))
    if user_dict:
        return UserInDB(**user_dict)
    return None

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """创建访问令牌"""
    try:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error("创建访问令牌失败: %s", str(e))
        raise

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """获取当前用户"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="无效的认证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 解码JWT令牌
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        username: str = payload.get("username")
        is_admin: bool = payload.get("is_admin", False)
        
        if user_id is None or username is None:
            raise credentials_exception
            
        return {
            "user_id": user_id,
            "username": username,
            "is_admin": is_admin
        }
    except JWTError:
        raise credentials_exception
    except Exception as e:
        logger.error("获取当前用户失败: %s", str(e))
        raise credentials_exception 