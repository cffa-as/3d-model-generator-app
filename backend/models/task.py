from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime

class TaskCreate(BaseModel):
    """创建任务的请求模型"""
    task_type: str  # text, image, multi_image
    prompt: str
    image_urls: Optional[List[str]] = None
    art_style: Optional[str] = None
    mode: Optional[str] = None  # preview, refine
    should_remesh: Optional[bool] = None
    enable_pbr: Optional[bool] = None
    texture_prompt: Optional[str] = None
    texture_image_url: Optional[str] = None
    ai_model: Optional[str] = None
    preview_task_id: Optional[str] = None  # 用于精细化任务
    # 新增参数
    seed: Optional[int] = None
    topology: Optional[Literal["quad", "triangle"]] = None
    target_polycount: Optional[int] = Field(None, ge=100, le=300000)
    symmetry_mode: Optional[Literal["off", "auto", "on"]] = None
    is_a_t_pose: Optional[bool] = None

class ModelUrls(BaseModel):
    glb: Optional[str]
    fbx: Optional[str]
    obj: Optional[str]
    usdz: Optional[str]

class TextureUrls(BaseModel):
    base_color: Optional[str]
    metallic: Optional[str]
    normal: Optional[str]
    roughness: Optional[str]

class TaskResponse(BaseModel):
    """任务响应模型"""
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
    
    id: int
    task_id: str
    task_type: str
    prompt: str
    image_urls: Optional[List[str]] = None
    status: str
    progress: Optional[int] = None
    model_urls: Optional[Dict[str, str]] = None
    texture_urls: Optional[List[Dict[str, str]]] = None
    thumbnail_url: Optional[str] = None
    created_at: Optional[str] = None
    started_at: Optional[int] = None
    finished_at: Optional[int] = None 