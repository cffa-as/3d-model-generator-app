# 3D模型生成服务后端

这是一个基于FastAPI的3D模型生成服务后端，使用腾讯混元生3D API提供文本到3D模型和图片到3D模型的转换功能。

## 功能特点

- 支持文本描述生成3D模型
- 支持图片生成3D模型
- 支持自定义生成样式
- 完整的错误处理和日志记录
- 异步任务处理和状态查询

## 环境要求

- Python 3.8+
- 腾讯云账号和API密钥
- 依赖包（见requirements.txt）

## 安装步骤

1. 创建并激活虚拟环境（可选但推荐）：
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
.\venv\Scripts\activate  # Windows
```

2. 安装依赖：
```bash
pip install -r requirements.txt
```

3. 配置API密钥：
   - 方式1：直接在config.yaml中填写secret_id和secret_key
   - 方式2：通过环境变量设置（推荐）：
     ```bash
     # Linux/Mac
     export TENCENT_SECRET_ID=your_secret_id_here
     export TENCENT_SECRET_KEY=your_secret_key_here
     
     # Windows
     set TENCENT_SECRET_ID=your_secret_id_here
     set TENCENT_SECRET_KEY=your_secret_key_here
     ```

## 启动服务

```bash
python main.py
```

或使用uvicorn直接启动：
```bash
uvicorn main:app --reload
```

服务将在 http://localhost:8000 启动

## API文档

启动服务后，访问以下地址查看API文档：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API端点

### 1. 文本生成3D模型

```http
POST /api/text2model
Content-Type: application/json

{
    "text": "一把红色的椅子",
    "style": "现代简约"  // 可选
}
```

### 2. 图片生成3D模型

```http
POST /api/image2model
Content-Type: multipart/form-data

file: [图片文件]
style: 现代简约  // 可选
```

## 响应格式

成功响应示例：
```json
{
    "status": "success",
    "message": "模型生成成功",
    "data": {
        "preview_url": "预览图片URL",
        "model_url": "3D模型文件URL",
        "model_type": "OBJ"
    }
}
```

错误响应示例：
```json
{
    "detail": "错误信息"
}
```

## 配置说明

配置文件位于 `config.yaml`，包含以下配置项：

```yaml
# 腾讯云API配置
tencent:
  secret_id: ""  # 可通过环境变量覆盖
  secret_key: "" # 可通过环境变量覆盖
  region: "ap-guangzhou"

# 服务配置
server:
  host: "0.0.0.0"
  port: 8000

# 上传文件配置
upload:
  dir: "uploads"
  max_file_size: 10485760  # 10MB

# 支持的文件类型
allowed_image_types:
  - "image/jpeg"
  - "image/png"
  - "image/gif"
  - "image/webp"
```

## 注意事项

1. 请确保已在腾讯云控制台开通了混元生3D服务
2. 请妥善保管API密钥，建议通过环境变量设置而不是直接写入配置文件
3. 生成3D模型可能需要一定时间，API会自动等待并返回结果
4. 上传的图片文件会在处理后自动删除 