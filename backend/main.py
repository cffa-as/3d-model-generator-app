from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import yaml
from pathlib import Path
from services.tencent_3d import tencent_3d

# 获取配置
config_path = Path(__file__).parent / "config.yaml"
with open(config_path, "r", encoding="utf-8") as f:
    config = yaml.safe_load(f)

app = FastAPI(
    title="3D模型生成API",
    description="提供文本生成3D模型和图片生成3D模型的API服务"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 请求模型
class Text2ModelRequest(BaseModel):
    text: str
    result_format: Optional[str] = None
    enable_pbr: Optional[bool] = False

@app.get("/")
async def read_root():
    return {"message": "3D模型生成服务已启动"}

@app.post("/api/text2model")
async def text_to_model(request: Text2ModelRequest):
    """根据文本描述生成3D模型"""
    try:
        result = await tencent_3d.generate_from_text(
            text=request.text,
            result_format=request.result_format,
            enable_pbr=request.enable_pbr
        )
        
        if result["Status"] == "FAIL":
            raise HTTPException(
                status_code=400,
                detail=f"生成失败: {result.get('ErrorMessage', '未知错误')}"
            )
            
        return {
            "status": "success",
            "message": "模型生成成功",
            "data": {
                "preview_url": result["ResultFile3Ds"][0]["PreviewImageUrl"],
                "model_url": result["ResultFile3Ds"][0]["Url"],
                "model_type": result["ResultFile3Ds"][0]["Type"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/image2model")
async def image_to_model(
    file: UploadFile = File(...),
    result_format: Optional[str] = None,
    enable_pbr: Optional[bool] = False
):
    """根据上传的图片生成3D模型"""
    try:
        # 验证文件类型
        if file.content_type not in config["allowed_image_types"]:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件类型。支持的类型: {', '.join(config['allowed_image_types'])}"
            )
        
        # 保存上传的文件
        file_path = os.path.join(config["upload"]["dir"], file.filename)
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        try:
            # 调用服务生成模型
            result = await tencent_3d.generate_from_image(
                image_path=file_path,
                result_format=result_format,
                enable_pbr=enable_pbr
            )
            
            if result["Status"] == "FAIL":
                raise HTTPException(
                    status_code=400,
                    detail=f"生成失败: {result.get('ErrorMessage', '未知错误')}"
                )
            
            return {
                "status": "success",
                "message": "模型生成成功",
                "data": {
                    "preview_url": result["ResultFile3Ds"][0]["PreviewImageUrl"],
                    "model_url": result["ResultFile3Ds"][0]["Url"],
                    "model_type": result["ResultFile3Ds"][0]["Type"]
                }
            }
        finally:
            # 清理临时文件
            if os.path.exists(file_path):
                os.remove(file_path)
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # 确保上传目录存在
    os.makedirs(config["upload"]["dir"], exist_ok=True)
    
    import uvicorn
    uvicorn.run(
        "main:app",
        host=config["server"]["host"],
        port=config["server"]["port"],
        reload=True
    ) 