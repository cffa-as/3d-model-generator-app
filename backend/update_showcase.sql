-- 先删除相关的外键约束
ALTER TABLE model_likes DROP FOREIGN KEY model_likes_ibfk_1;
ALTER TABLE model_comments DROP FOREIGN KEY model_comments_ibfk_1;

-- 删除旧的model_showcase表
DROP TABLE IF EXISTS model_showcase;

-- 创建新的model_showcase表
CREATE TABLE model_showcase (
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

-- 重新创建点赞表
DROP TABLE IF EXISTS model_likes;
CREATE TABLE model_likes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    model_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES model_showcase(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_like (model_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 重新创建评论表
DROP TABLE IF EXISTS model_comments;
CREATE TABLE model_comments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    model_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES model_showcase(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 添加索引
CREATE INDEX idx_model_showcase_user ON model_showcase(user_id);
CREATE INDEX idx_model_showcase_category ON model_showcase(category);
CREATE INDEX idx_model_showcase_status ON model_showcase(status);
CREATE INDEX idx_model_showcase_created ON model_showcase(created_at);
CREATE INDEX idx_model_likes_user ON model_likes(user_id);
CREATE INDEX idx_model_comments_user ON model_comments(user_id); 