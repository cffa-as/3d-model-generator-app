# AI 3D模型生成器

基于 AI 技术的智能3D模型生成应用，支持多种生成方式和高质量模型输出。

## 功能特点

- 🎨 **文本生成3D**：通过文字描述智能生成3D模型
- 📸 **图片生成3D**：从单张图片快速生成3D模型
- 🖼️ **多图生成**：支持多角度图片生成更精确的模型
- 💎 **高质量输出**：
  - 优化的拓扑结构
  - 自动UV展开
  - PBR材质支持
  - 骨骼动画支持
- 🎯 **模型评估**：
  - 拓扑结构质量评估
  - 几何准确度评估
  - 渲染效率评估
- 🔄 **多格式支持**：
  - GLB/GLTF
  - FBX
  - OBJ
  - USDZ
- 📊 **实时监控**：
  - 生成进度跟踪
  - 实时预览
  - 质量评估反馈
- 👥 **用户管理**：
  - 用户认证
  - 任务历史
  - 收藏夹

## 技术栈

### 前端
- Next.js 14 (App Router)
- React
- TypeScript
- Tailwind CSS
- Shadcn/ui 组件库
- Three.js 模型预览
- Lucide Icons 图标

### 后端
- Python 3.8+
- FastAPI
- MySQL 8.0+
- JWT 认证
- AI 模型集成

## 环境要求

- Node.js 18+
- Python 3.8+
- MySQL 8.0+
- AI API 密钥

## 快速开始

### 前端启动
```bash
# 安装依赖
cd 3d-model-generator
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入必要配置

# 启动开发服务器
npm run dev
```

### 后端启动
```bash
# 安装依赖
cd backend
pip install -r requirements.txt

# 配置
cp config.yaml.template config.yaml
# 编辑 config.yaml 填入必要配置

# 初始化数据库
mysql -u root -p < init.sql

# 启动服务
uvicorn main:app --reload
```

## 主要功能展示

### 模型生成
- 支持文本描述生成
- 支持单图/多图生成
- 实时进度反馈
- 模型质量评估

### 模型预览
- 3D 实时预览
- 材质和贴图展示
- 多角度查看
- 动画预览

### 模型导出
- 多格式导出支持
- 批量导出
- 自定义导出设置

### 管理功能
- 用户管理
- 任务管理
- 系统监控
- 数据统计

## API 文档

启动后端服务后，访问 [API文档](http://localhost:8000/docs) 查看详细API说明。
