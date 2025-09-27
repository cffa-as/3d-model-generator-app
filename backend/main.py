from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes import users, tasks, admin, showcase
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 确保所有相关模块的日志级别都是DEBUG
logging.getLogger('services.storage').setLevel(logging.DEBUG)
logging.getLogger('routes.tasks').setLevel(logging.DEBUG)

app = FastAPI(
    title="3D模型创作平台 API",
    description="基于AI技术的3D模型生成和管理平台",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加全局验证错误处理
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"请求验证错误: {str(exc)}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": [{"loc": err["loc"], "msg": err["msg"], "type": err["type"]} for err in exc.errors()]
        }
    )

# 注册路由
app.include_router(users.router, prefix="/api", tags=["用户管理"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["任务管理"])
app.include_router(admin.router, prefix="/api/admin", tags=["管理员"])
app.include_router(showcase.router, prefix="/api/showcase", tags=["模型展示"])

@app.get("/")
async def root():
    return {"message": "3D Model Generator API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 