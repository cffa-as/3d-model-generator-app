from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import users, tasks, admin, showcase

app = FastAPI()

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(users.router, prefix="/api")  # 只添加/api前缀，因为router已经有/users前缀
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(showcase.router, prefix="/api/showcase", tags=["showcase"])

@app.get("/")
async def root():
    return {"message": "3D Model Generator API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    ) 