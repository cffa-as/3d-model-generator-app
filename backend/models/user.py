from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

class UserBase(BaseModel):
    """用户基础模型"""
    username: str
    email: str  # 改为普通字符串，不使用EmailStr验证

class UserCreate(UserBase):
    """用户创建模型"""
    password: str

class UserInDB(UserBase):
    """数据库中的用户模型"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    password: str
    is_admin: bool = False
    created_at: Optional[str] = None

class User(BaseModel):
    """用户响应模型"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    username: str
    email: str
    is_admin: bool = False
    created_at: Optional[str] = None

class Token(BaseModel):
    """令牌模型"""
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    """令牌数据模型"""
    user_id: int
    username: str
    is_admin: bool = False

class AdminStats(BaseModel):
    """管理员统计数据模型"""
    total_users: int
    total_tasks: int
    task_type_counts: dict 