# 3D模型生成应用

基于 Meshy API 的3D模型生成应用。

## 项目进度

### 后端 ✅
- 完成基础框架搭建（FastAPI）
- 实现用户系统（注册、登录）
- 实现管理员统计功能
- 实现文本生成3D模型API
- 实现图片生成3D模型API
- 实现多图生成3D模型API
- 集成 Meshy API
- 支持 PBR 材质生成
- 支持多种导出格式(GLB、FBX、OBJ、USDZ等)
- 支持任务进度监控
- 支持历史任务查询

### 前端 🚧
- 开发中...

## 后端API文档

### 环境要求
- Python 3.8+
- MySQL 数据库
- Meshy API密钥

### 安装和配置
1. 安装依赖：
```bash
cd backend
pip install -r requirements.txt
```

2. 配置：
- 复制 `config.yaml.example` 为 `config.yaml`
- 填入你的 Meshy API密钥和MySQL配置

3. 初始化数据库：
```bash
mysql -u root -p < init.sql
```

### API端点

#### 1. 用户相关
```http
# 用户注册
POST /api/users/register
Content-Type: application/json

{
    "username": "用户名",
    "password": "密码",
    "email": "邮箱"
}

# 用户登录
POST /api/users/token
Content-Type: application/x-www-form-urlencoded

username=用户名&password=密码
```

#### 2. 任务生成
```http
# 创建生成任务（文本/图片/多图）
POST /api/tasks/generate
Content-Type: application/json
Authorization: Bearer <token>

{
    "task_type": "text",  // text, image, multi_image
    "prompt": "一个可爱的小猫咪",  // 文本生成时的提示词
    "image_urls": [],  // 图片生成时的base64图片数据
    "enable_pbr": true,  // 是否生成PBR材质
    "should_remesh": true,  // 是否重建网格
    "should_texture": true  // 是否生成贴图
}

# 获取任务状态
GET /api/tasks/tasks/{task_id}
Authorization: Bearer <token>

# 获取任务列表
GET /api/tasks/tasks
Authorization: Bearer <token>

# 上传图片
POST /api/tasks/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: [图片文件]  // 支持jpg、png、jpeg格式
```

#### 3. 管理员功能
```http
# 获取统计信息
GET /api/admin/statistics
Authorization: Bearer <token>
```

### 响应格式
```json
{
    "id": "任务ID",
    "task_id": "Meshy API任务ID",
    "task_type": "任务类型",
    "prompt": "提示词",
    "image_urls": ["图片URL数组"],
    "status": "任务状态",  // pending, completed, failed
    "progress": 0,  // 任务进度，0-100
    "model_urls": {
        "glb": "GLB文件URL",
        "obj": "OBJ文件URL",
        "fbx": "FBX文件URL",
        "usdz": "USDZ文件URL"
    },
    "texture_urls": [
        {
            "base_color": "基础色贴图URL",
            "normal": "法线贴图URL",
            "metallic": "金属度贴图URL",
            "roughness": "粗糙度贴图URL"
        }
    ],
    "thumbnail_url": "预览图片URL",
    "created_at": "创建时间",
    "started_at": "开始时间",
    "finished_at": "完成时间"
}
```

### 启动服务
```bash
cd backend
uvicorn main:app --reload
```
服务将在 http://localhost:8000 启动

## 待完成功能
- [ ] 前端界面开发
- [ ] 效果展示