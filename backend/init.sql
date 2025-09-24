-- 创建数据库
CREATE DATABASE IF NOT EXISTS model_generator DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE model_generator;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,  -- 明文存储密码
    email VARCHAR(100) NOT NULL UNIQUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建生成任务表
CREATE TABLE IF NOT EXISTS generation_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id VARCHAR(100) NOT NULL UNIQUE,  -- Meshy API的任务ID
    task_type ENUM('text', 'image', 'multi_image') NOT NULL,
    prompt TEXT,
    image_urls JSON,  -- 存储图片URL数组
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, completed, failed
    progress INT DEFAULT 0,  -- 任务进度，0-100
    model_urls JSON,  -- 存储模型URL
    texture_urls JSON,  -- 存储纹理URL
    thumbnail_url TEXT,  -- 缩略图URL
    task_error TEXT,  -- 错误信息
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at BIGINT NULL,  -- 毫秒时间戳
    finished_at BIGINT NULL,  -- 毫秒时间戳
    
    -- 精细化任务相关字段
    preview_task_id VARCHAR(100) NULL,  -- 预览任务ID（用于精细化任务）
    enable_pbr BOOLEAN DEFAULT FALSE,  -- 是否生成PBR贴图
    texture_prompt TEXT,  -- 贴图生成的文本提示
    texture_image_url TEXT,  -- 贴图生成的参考图片
    ai_model VARCHAR(20),  -- AI模型版本

    -- 评估相关字段
    evaluation_status VARCHAR(20) DEFAULT 'pending',  -- pending, evaluated
    topology_score DECIMAL(4,2) NULL,  -- 拓扑结构质量评分
    geometry_score DECIMAL(4,2) NULL,  -- 几何准确度评分
    rendering_score DECIMAL(4,2) NULL,  -- 渲染效率评分
    evaluation_history JSON,  -- 评估历史记录
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (preview_task_id) REFERENCES generation_tasks(task_id) ON DELETE CASCADE
);

-- 添加索引（如果索引已存在会报错，可以忽略）
CREATE INDEX idx_task_id ON generation_tasks(task_id);
CREATE INDEX idx_user_id ON generation_tasks(user_id);
CREATE INDEX idx_preview_task_id ON generation_tasks(preview_task_id);

-- 插入默认管理员用户
INSERT INTO users (username, password, email, is_admin)
VALUES ('admin', 'admin123', 'admin@example.com', TRUE); 