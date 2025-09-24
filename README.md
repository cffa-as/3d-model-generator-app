# 创意3D建模

基于 Meshy API 的AI驱动3D模型生成应用。

## 功能特点

- 🎨 文本生成3D：输入文字描述，AI自动生成精美3D模型
- 📸 图片转3D：上传图片，智能识别并转换为3D模型
- 🖼️ 多图生成：使用多张图片生成更精确的3D模型
- 💎 PBR材质：支持生成物理基础渲染材质
- 🔄 多格式导出：支持GLB、OBJ、FBX、USDZ等格式
- 🎯 精细化生成：支持模型优化和贴图生成
- 📊 进度监控：实时查看生成进度
- 📝 任务管理：查看和管理历史任务

## 项目进度

### 后端 ✅
- 完成基础框架搭建（FastAPI）
- 实现用户系统（注册、登录、Token刷新）
- 实现管理员统计功能
- 实现文本生成3D模型API
- 实现图片生成3D模型API
- 实现多图生成3D模型API
- 集成 Meshy API
- 支持 PBR 材质生成
- 支持多种导出格式(GLB、FBX、OBJ、USDZ等)
- 支持任务进度监控
- 支持历史任务查询
- 支持模型精细化生成
- 支持贴图生成

### 前端 ✅
- 完成用户界面开发（Next.js + Tailwind CSS）
- 实现响应式设计
- 实现用户认证和授权
- 实现工作台功能
  - 文本生成3D
  - 图片生成3D
  - 多图生成3D
- 实现任务管理
  - 任务列表和筛选
  - 任务详情和进度
  - 模型预览
  - 贴图预览
  - 多格式下载
- 实现管理员面板
  - 用户统计
  - 任务统计
  - 使用情况分析

## 技术栈

### 前端
- Next.js 14
- React
- TypeScript
- Tailwind CSS
- Shadcn/ui
- Lucide Icons

### 后端
- Python 3.8+
- FastAPI
- MySQL
- JWT认证
- Meshy API

## 环境要求
- Node.js 18+
- Python 3.8+
- MySQL 数据库
- Meshy API密钥

## 安装和配置

### 前端
1. 安装依赖：
```bash
cd 3d-model-generator
npm install
```

2. 配置环境变量：
- 复制 `.env.example` 为 `.env.local`
- 填入后端API地址

3. 启动开发服务器：
```bash
npm run dev
```

### 后端
1. 安装依赖：
```bash
cd backend
pip install -r requirements.txt
```

2. 配置：
- 复制 `config.yaml.template` 为 `config.yaml`
- 填入你的 Meshy API密钥和MySQL配置

3. 初始化数据库：
```bash
mysql -u root -p < init.sql
```

4. 启动服务：
```bash
uvicorn main:app --reload
```

## API文档

详细的API文档请参考 [API文档](http://localhost:8000/docs)。

## 主要功能截图

[此处可以添加一些主要功能的截图]

## 待完成功能
- [ ] 支持更多3D模型格式
- [ ] 批量任务处理
- [ ] 模型编辑功能
- [ ] 社区分享功能