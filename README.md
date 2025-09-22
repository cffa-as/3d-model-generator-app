# 3D模型生成应用

基于腾讯混元生3D API的3D模型生成应用。

## 项目进度

### 后端 ✅
- 完成基础框架搭建（FastAPI）
- 实现文本生成3D模型API
- 实现图片生成3D模型API
- 集成腾讯混元生3D API
- 添加图片验证和错误处理
- 实现异步任务管理

### 前端 🚧
- 开发中...

## 后端API文档

### 环境要求
- Python 3.8+
- 腾讯云账号和API密钥

### 安装和配置
1. 安装依赖：
```bash
cd backend
pip install -r requirements.txt
```

2. 配置：
- 复制 `config.yaml.example` 为 `config.yaml`
- 填入你的腾讯云API密钥

### API端点

#### 1. 文本生成3D模型
```http
POST /api/text2model
Content-Type: application/json

{
    "text": "一把红色的椅子",
    "style": "现代简约"  // 可选
}
```

#### 2. 图片生成3D模型
```http
POST /api/image2model
Content-Type: multipart/form-data

file: [图片文件]
style: 现代简约  // 可选
```

### 启动服务
```bash
python main.py
```
服务将在 http://localhost:8000 启动

## 待完成功能
- [ ] 前端界面开发
- [ ] 用户认证
- [ ] 模型管理
- [ ] 效果展示