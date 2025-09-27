from pydantic import BaseModel, Field, ConfigDict, constr, root_validator
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime

class TaskCreate(BaseModel):
    """创建任务的请求模型"""
    task_type: Literal["text", "image", "multi_image"]
    prompt: Optional[str] = None  # 简化为普通字符串，在验证器中处理
    image_urls: Optional[List[str]] = None
    art_style: Optional[Literal["realistic", "sculpture"]] = "realistic"
    mode: Literal["preview", "refine"] = "preview"
    should_remesh: Optional[bool] = True
    enable_pbr: Optional[bool] = False
    texture_prompt: Optional[str] = None
    texture_image_url: Optional[str] = None
    ai_model: Optional[str] = None
    preview_task_id: Optional[str] = None  # 用于精细化任务
    # 新增参数
    seed: Optional[int] = None
    topology: Optional[Literal["quad", "triangle"]] = "triangle"
    target_polycount: Optional[int] = Field(default=30000, ge=100, le=300000)
    symmetry_mode: Optional[Literal["off", "auto", "on"]] = "auto"
    is_a_t_pose: Optional[bool] = False

    @root_validator
    def validate_task_inputs(cls, values):
        task_type = values.get("task_type")
        prompt = values.get("prompt")
        image_urls = values.get("image_urls")
        mode = values.get("mode")
        
        # 精细化任务不需要 prompt，普通文本任务需要
        if task_type == "text" and mode != "refine":
            if not prompt or len(prompt.strip()) < 3:
                raise ValueError("Text tasks require a prompt with at least 3 characters")
            if len(prompt.strip()) > 500:
                raise ValueError("Prompt must be less than 500 characters")
            
        if task_type in ["image", "multi_image"]:
            if not image_urls or not isinstance(image_urls, list) or len(image_urls) == 0:
                raise ValueError("Image tasks require image_urls")
            if task_type == "multi_image" and len(image_urls) < 2:
                raise ValueError("Multi-image tasks require at least 2 images")
                
        return values

    class Config:
        schema_extra = {
            "example": {
                "task_type": "text",
                "prompt": "一只可爱的橙色猫咪，坐着的姿势，毛发蓬松",
                "mode": "preview",
                "art_style": "realistic"
            }
        }

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