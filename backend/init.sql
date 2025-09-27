-- 创建数据库
CREATE DATABASE IF NOT EXISTS model_generator DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE model_generator;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建生成任务表
CREATE TABLE IF NOT EXISTS generation_tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    task_id VARCHAR(100) NOT NULL UNIQUE,
    task_type ENUM('text', 'image', 'multi_image') NOT NULL,
    prompt TEXT,
    image_urls JSON,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    progress INT DEFAULT 0,
    model_urls JSON,
    texture_urls JSON,
    thumbnail_url TEXT,
    task_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at BIGINT NULL,
    finished_at BIGINT NULL,
    
    -- 精细化任务相关字段
    preview_task_id VARCHAR(100) NULL,
    enable_pbr BOOLEAN DEFAULT FALSE,
    texture_prompt TEXT,
    texture_image_url TEXT,
    art_style ENUM('realistic', 'sculpture') DEFAULT 'realistic',
    
    -- 评估相关字段
    evaluation_status VARCHAR(20) DEFAULT 'pending',
    topology_score DECIMAL(4,2) NULL,
    geometry_score DECIMAL(4,2) NULL,
    rendering_score DECIMAL(4,2) NULL,
    evaluation_history JSON,
    
    -- 用户评分相关字段
    user_rating DECIMAL(3,1) DEFAULT NULL CHECK (user_rating >= 0 AND user_rating <= 10),
    rating_comment TEXT DEFAULT NULL,
    rated_at TIMESTAMP DEFAULT NULL,
    
    -- 生成参数相关字段
    seed INTEGER,
    topology VARCHAR(10),
    target_polycount INTEGER,
    symmetry_mode VARCHAR(10),
    is_a_t_pose BOOLEAN,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (preview_task_id) REFERENCES generation_tasks(task_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 添加索引
CREATE INDEX idx_task_id ON generation_tasks(task_id);
CREATE INDEX idx_user_id ON generation_tasks(user_id);
CREATE INDEX idx_preview_task_id ON generation_tasks(preview_task_id);

-- 创建评估详情表
CREATE TABLE IF NOT EXISTS model_evaluations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 基础信息
    vertex_count INT NOT NULL,
    face_count INT NOT NULL,
    surface_area DOUBLE NOT NULL,
    
    -- 法线分布
    normal_consistency DOUBLE NOT NULL,
    normal_score FLOAT NOT NULL,
    
    -- 面片质量
    aspect_ratio DOUBLE NOT NULL,
    aspect_score FLOAT NOT NULL,
    
    -- 完整性
    is_watertight BOOLEAN NOT NULL,
    is_volume BOOLEAN NOT NULL,
    boundary_edges_ratio DOUBLE NOT NULL,
    completeness_score FLOAT NOT NULL,
    
    -- 细节保留
    vertex_density DOUBLE NOT NULL,
    detail_score FLOAT NOT NULL,
    
    -- 最终得分
    final_score FLOAT NOT NULL,
    
    -- 评估日志
    evaluation_log TEXT,
    
    FOREIGN KEY (task_id) REFERENCES generation_tasks(task_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建模型展示表
CREATE TABLE IF NOT EXISTS model_showcase (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,  -- 模型分类：character/scene/prop/other
    tags JSON,  -- 模型标签
    preview_url VARCHAR(1024),  -- 预览图URL
    model_url VARCHAR(1024) NOT NULL,  -- 模型文件URL
    likes INT DEFAULT 0,  -- 点赞数
    views INT DEFAULT 0,  -- 浏览量
    status VARCHAR(20) DEFAULT 'public',  -- public/private
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建点赞表
CREATE TABLE IF NOT EXISTS model_likes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    model_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES model_showcase(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_like (model_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建评论表
CREATE TABLE IF NOT EXISTS model_comments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    model_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES model_showcase(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 添加模型广场相关索引
CREATE INDEX idx_model_showcase_user ON model_showcase(user_id);
CREATE INDEX idx_model_showcase_category ON model_showcase(category);
CREATE INDEX idx_model_showcase_status ON model_showcase(status);
CREATE INDEX idx_model_showcase_created ON model_showcase(created_at);
CREATE INDEX idx_model_likes_user ON model_likes(user_id);
CREATE INDEX idx_model_comments_user ON model_comments(user_id);

-- 插入默认管理员用户
INSERT INTO users (username, password, email, is_admin)
VALUES ('admin', 'admin123', 'admin@example.com', TRUE); 

-- 用户统计视图
CREATE OR REPLACE VIEW designer_stats AS
SELECT 
    u.id,
    u.username,
    u.email,  
    COUNT(DISTINCT ms.id) as works_count,
    COUNT(DISTINCT ml.id) as total_likes
FROM users u
LEFT JOIN model_showcase ms ON ms.user_id = u.id
LEFT JOIN model_likes ml ON ml.model_id = ms.id
GROUP BY u.id, u.username, u.email; 
