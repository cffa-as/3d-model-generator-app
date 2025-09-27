import os
import json
import hashlib
from typing import Optional, Dict, List, Tuple
import logging
from text2vec import SentenceModel, cos_sim
from datetime import datetime

logger = logging.getLogger(__name__)

class ModelCacheService:
    def __init__(self, cache_dir: str = "cache/models"):
        self.cache_dir = cache_dir
        self.cache_index_file = os.path.join(cache_dir, "cache_index.json")
        self._ensure_cache_dir()
        self.cache_index = self._load_cache_index()
        
        # 初始化文本向量模型
        self.model = SentenceModel()
    
    def _ensure_cache_dir(self):
        """确保缓存目录存在"""
        os.makedirs(self.cache_dir, exist_ok=True)

    def _load_cache_index(self) -> Dict:
        """加载缓存索引"""
        try:
            if os.path.exists(self.cache_index_file):
                with open(self.cache_index_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {"prompts": {}, "models": {}}
        except Exception as e:
            logger.error(f"加载缓存索引失败: {e}")
            return {"prompts": {}, "models": {}}

    def _save_cache_index(self):
        """保存缓存索引"""
        try:
            with open(self.cache_index_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache_index, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存缓存索引失败: {e}")

    def _calculate_prompt_hash(self, prompt: str, style: str = "") -> str:
        """计算提示词的哈希值"""
        content = f"{prompt.lower().strip()}_{style.lower().strip()}"
        return hashlib.md5(content.encode()).hexdigest()

    def _calculate_similarity(self, prompt1: str, prompt2: str) -> float:
        """计算两个提示词的相似度"""
        try:
            # 使用text2vec计算语义相似度
            embeddings1 = self.model.encode([prompt1])
            embeddings2 = self.model.encode([prompt2])
            similarity = cos_sim(embeddings1, embeddings2)[0][0]
            
            logger.debug(f"相似度计算 - 提示词1: {prompt1}")
            logger.debug(f"提示词2: {prompt2}")
            logger.debug(f"相似度: {similarity:.4f}")
            
            return float(similarity)
        except Exception as e:
            logger.error(f"计算相似度时出错: {e}")
            return 0.0

    def find_similar_model(self, prompt: str, style: str = "", similarity_threshold: float = 0.85) -> Optional[Dict]:
        """
        查找相似的模型
        
        Args:
            prompt: 提示词
            style: 风格
            similarity_threshold: 相似度阈值
            
        Returns:
            Optional[Tuple[str, Dict]]: (模型文件路径, 模型信息) 或 None
        """
        try:
            prompt_hash = self._calculate_prompt_hash(prompt, style)
            
            # 1. 精确匹配
            if prompt_hash in self.cache_index["prompts"]:
                model_id = self.cache_index["prompts"][prompt_hash]
                model_info = self.cache_index["models"].get(model_id)
                if model_info:
                    logger.info(f"找到完全匹配的缓存模型: {model_id}")
                    return {
                        "found": True,
                        "similarity": 1.0, # 完全匹配，相似度为1.0
                        "task_id": model_id,
                        "prompt": model_info["prompt"],
                        "created_at": model_info["created_at"],
                        "file_path": model_info["file_path"],
                        "model_urls": model_info.get("model_urls", {}),
                        "thumbnail_url": model_info.get("thumbnail_url", "")
                    }
            
            # 2. 相似度匹配
            max_similarity = 0.0
            best_match = None
            
            for model_id, model_info in self.cache_index["models"].items():
                cached_prompt = model_info.get("prompt", "")
                if not cached_prompt:
                    continue
                
                # 计算相似度
                similarity = self._calculate_similarity(prompt, cached_prompt)
                
                # 更新最佳匹配
                if similarity > max_similarity:
                    max_similarity = similarity
                    best_match = model_info
            
            # 如果找到足够相似的模型
            if max_similarity >= similarity_threshold and best_match:
                logger.info(f"找到相似的缓存模型: {best_match['task_id']}, 相似度: {max_similarity:.2f}")
                return {
                    "found": True,
                    "similarity": max_similarity,
                    "task_id": best_match["task_id"],
                    "prompt": best_match["prompt"],
                    "created_at": best_match["created_at"],
                    "file_path": best_match["file_path"],
                    "model_urls": best_match.get("model_urls", {}),
                    "thumbnail_url": best_match.get("thumbnail_url", "")
                }
            
            return {"found": False}
        
        except Exception as e:
            logger.error(f"查找相似模型时出错: {e}")
            return {"found": False}

    def find_similar_models(self, prompt: str, style: str = "", similarity_threshold: float = 0.75, limit: int = 5) -> list:
        """查找多个相似的模型"""
        try:
            # 先打印缓存索引内容
            logger.info(f"当前缓存索引内容: {json.dumps(self.cache_index, ensure_ascii=False, indent=2)}")
            logger.info(f"正在查找与 '{prompt}' 相似的模型，风格: '{style}'")

            similar_models = []
            for model_id, model_info in self.cache_index["models"].items():
                cached_prompt = model_info.get("prompt", "")
                if not cached_prompt:
                    continue
                
                # 计算相似度
                similarity = self._calculate_similarity(prompt, cached_prompt)
                
                # 每次计算都记录日志
                logger.info(f"比较: '{prompt}' vs '{cached_prompt}' = {similarity:.4f}")
                
                if similarity >= similarity_threshold:
                    similar_models.append({
                        "found": True,
                        "similarity": float(similarity),
                        "task_id": model_info["task_id"],
                        "prompt": model_info["prompt"],
                        "created_at": model_info["created_at"],
                        "model_urls": model_info.get("model_urls"),
                        "thumbnail_url": model_info.get("thumbnail_url"),
                    })

            # 打印找到的结果
            logger.info(f"找到 {len(similar_models)} 个相似模型")
            
            similar_models.sort(key=lambda x: x["similarity"], reverse=True)
            return similar_models[:limit]
            
        except Exception as e:
            logger.error(f"查找相似模型时出错: {e}", exc_info=True)  # 添加完整堆栈
            return []

    def cache_model(self, prompt: str, style: str, model_file_path: str, task_id: str, additional_info: Dict = None) -> bool:
        """缓存模型文件和信息"""
        try:
            prompt_hash = self._calculate_prompt_hash(prompt, style)
            
            # 确保created_at是ISO格式
            created_at = additional_info.get("created_at", "")
            if not created_at:
                created_at = datetime.now().isoformat()
            
            # 保存模型信息
            model_info = {
                "prompt": prompt,
                "style": style,
                "file_path": model_file_path,
                "task_id": task_id,
                "created_at": created_at,
                **(additional_info or {})
            }
            
            # 更新缓存索引
            self.cache_index["prompts"][prompt_hash] = task_id
            self.cache_index["models"][task_id] = model_info
            
            # 保存索引文件
            self._save_cache_index()
            
            logger.info(f"模型已缓存: {task_id}")
            return True
        except Exception as e:
            logger.error(f"缓存模型时出错: {e}")
            return False

    def get_cache_stats(self) -> Dict:
        """获取缓存统计信息"""
        try:
            return {
                "total_models": len(self.cache_index["models"]),
                "total_prompts": len(self.cache_index["prompts"]),
                "cache_size_mb": sum(
                    os.path.getsize(os.path.join(self.cache_dir, f))
                    for f in os.listdir(self.cache_dir)
                    if os.path.isfile(os.path.join(self.cache_dir, f))
                ) / (1024 * 1024)
            }
        except Exception as e:
            logger.error(f"获取缓存统计信息失败: {e}")
            return {} 