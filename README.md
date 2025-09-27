# 七牛云校招项目-3D模型AI创作平台

## 如何运行程序

### 环境准备
1. **安装 Node.js 18+** - [下载地址](https://nodejs.org/)
2. **安装 Python 3.8+** - [下载地址](https://python.org/)
3. **安装 MySQL 8.0+** - [下载地址](https://dev.mysql.com/downloads/)
4. **获取 API 密钥** - 需要 Meshy API Key

### 数据库初始化
```bash
# 登录 MySQL
mysql -u root -p

# 执行初始化脚本
source backend/init.sql

# 或者直接导入
mysql -u root -p < backend/init.sql
```

### 后端启动
```bash
# 进入后端目录
cd backend

# 创建虚拟环境（推荐）
python -m venv venv

# 激活虚拟环境
# Windows PowerShell:
venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置文件
# Windows:
copy config.yaml.template config.yaml
# Linux/Mac:
# cp config.yaml.template config.yaml

# 编辑 config.yaml，填入以下必要配置：
# - database: MySQL连接信息
# - meshy_api_key: AI API密钥
# - jwt_secret: JWT密钥（随机字符串）

# 启动后端服务
python main.py

# 或使用 uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 前端启动
```bash
# 进入前端目录
cd front

# 安装依赖
npm install
# 或使用 pnpm
pnpm install

# 构建生产版本（推荐，因为资源多，开发环境较慢）
npm run build
npm start

# 或者启动开发服务器（较慢）
# npm run dev
```

### 访问应用
- **访问应用**: http://localhost:3000
- **API文档**: http://localhost:8000/docs