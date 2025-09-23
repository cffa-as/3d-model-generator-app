from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from services.meshy_client import meshy_client

app = FastAPI(
    title="3D模型生成API",
    description="提供 Meshy 3D模型生成服务的API接口",
    version="1.0.0",
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PreviewRequest(BaseModel):
    prompt: str
    enable_pbr: Optional[bool] = False

class RefineRequest(BaseModel):
    preview_task_id: str
    enable_pbr: Optional[bool] = False
    texture_prompt: Optional[str] = None

@app.post("/api/meshy/preview")
async def create_preview(request: PreviewRequest):
    """创建预览任务"""
    try:
        response = await meshy_client.create_preview_task(request.prompt)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/meshy/refine")
async def create_refine(request: RefineRequest):
    """创建精细化任务"""
    try:
        response = await meshy_client.create_refine_task(
            request.preview_task_id,
            enable_pbr=request.enable_pbr
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/meshy/task/{task_id}")
async def get_task(task_id: str):
    """获取任务状态"""
    try:
        response = await meshy_client.get_task(task_id)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def read_root():
    return {
        "message": "3D模型生成服务已启动",
        "services": {
            "meshy": {
                "description": "Meshy 3D模型生成服务",
                "endpoints": [
                    "/api/meshy/preview - 创建预览任务",
                    "/api/meshy/refine - 创建精细化任务",
                    "/api/meshy/task/{task_id} - 获取任务状态"
                ]
            }
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    ) 