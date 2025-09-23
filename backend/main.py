from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import users, tasks, admin

app = FastAPI(
    title="3D模型生成API",
    description="提供3D模型生成服务的API接口",
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

# 包含路由
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

@app.get("/")
async def read_root():
    return {
        "message": "3D模型生成服务已启动",
        "endpoints": {
            "users": {
                "register": "/api/users/register - 用户注册",
                "login": "/api/users/token - 用户登录"
            },
            "tasks": {
                "generate": "/api/tasks/generate - 创建3D模型生成任务",
                "list": "/api/tasks/tasks - 获取任务列表",
                "status": "/api/tasks/tasks/{task_id} - 获取任务状态"
            },
            "admin": {
                "statistics": "/api/admin/statistics - 获取基础统计数据"
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