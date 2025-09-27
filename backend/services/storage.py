import os
import hashlib
from pathlib import Path
import base64
import logging
from typing import Optional, List, Tuple
from datetime import datetime
import shutil
import imagehash
from PIL import Image
import io

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.upload_dir = Path("uploads")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # 创建图片哈希缓存目录
        self.hash_cache_dir = self.upload_dir / "hash_cache"
        self.hash_cache_dir.mkdir(parents=True, exist_ok=True)
        
        # 加载现有的图片哈希缓存
        self.image_hashes = {}
        self._load_image_hashes()

    def _load_image_hashes(self):
        """加载现有的图片哈希缓存"""
        logger.info(f"开始加载图片哈希缓存，目录: {self.upload_dir}")
        logger.info(f"目录是否存在: {self.upload_dir.exists()}")
        
        if not self.upload_dir.exists():
            logger.warning(f"上传目录不存在: {self.upload_dir}")
            return
            
        # 列出目录中的所有文件
        all_files = list(self.upload_dir.iterdir())
        logger.info(f"目录中的所有文件: {[f.name for f in all_files]}")
        
        # 加载 JPG 文件
        jpg_files = list(self.upload_dir.glob("*.jpg"))
        logger.info(f"找到的 JPG 文件: {[f.name for f in jpg_files]}")
        
        for img_path in jpg_files:
            try:
                with Image.open(img_path) as img:
                    img_hash = str(imagehash.average_hash(img))
                    self.image_hashes[img_path.name] = img_hash
                    logger.info(f"加载图片哈希: {img_path.name} -> {img_hash}")
            except Exception as e:
                logger.error(f"加载图片哈希失败 {img_path}: {e}")
                
        # 也加载 PNG 文件
        png_files = list(self.upload_dir.glob("*.png"))
        logger.info(f"找到的 PNG 文件: {[f.name for f in png_files]}")
        
        for img_path in png_files:
            try:
                with Image.open(img_path) as img:
                    img_hash = str(imagehash.average_hash(img))
                    self.image_hashes[img_path.name] = img_hash
            except Exception as e:
                logger.error(f"加载图片哈希失败 {img_path}: {e}")
                
        logger.info(f"完成加载图片哈希缓存，共加载 {len(self.image_hashes)} 个文件")
        logger.info(f"哈希缓存内容: {self.image_hashes}")

    def save_base64_image(self, base64_data: str) -> Optional[str]:
        """保存base64图片数据，返回文件名"""
        try:
            # 从base64 URL中提取数据部分
            if ',' in base64_data:
                _, base64_data = base64_data.split(',', 1)
            
            # 解码base64数据
            image_data = base64.b64decode(base64_data)
            
            # 计算文件哈希作为文件名
            file_hash = hashlib.md5(image_data).hexdigest()
            file_name = f"{file_hash}.jpg"
            file_path = self.upload_dir / file_name
            
            # 如果文件已存在，直接返回文件名
            if file_path.exists():
                logger.debug(f"文件已存在: {file_name}")
                return file_name
            
            # 保存图片文件
            with open(file_path, 'wb') as f:
                f.write(image_data)
            logger.info(f"保存图片文件: {file_name}")
            
            # 计算并缓存图片哈希
            with Image.open(file_path) as img:
                img_hash = str(imagehash.average_hash(img))
                self.image_hashes[file_name] = img_hash
                logger.info(f"缓存图片哈希: {file_name} -> {img_hash}")
            
            return file_name
        except Exception as e:
            logger.error(f"保存base64图片失败: {e}")
            return None

    def find_similar_images(self, base64_data: str, threshold: int = 5) -> List[str]:
        """查找相似的图片，返回文件名列表"""
        try:
            # 解码并打开图片
            if ',' in base64_data:
                _, base64_data = base64_data.split(',', 1)
            image_data = base64.b64decode(base64_data)
            img = Image.open(io.BytesIO(image_data))
            
            # 计算图片哈希
            img_hash = imagehash.average_hash(img)
            
            # 查找相似图片
            similar_images = []
            for filename, stored_hash in self.image_hashes.items():
                hash_diff = abs(img_hash - imagehash.hex_to_hash(stored_hash))
                if hash_diff <= threshold:
                    similar_images.append(filename)
            
            return similar_images
        except Exception as e:
            logger.error(f"查找相似图片失败: {e}")
            return []

    def find_similar_images_by_path(self, image_path: str, threshold: int = 5) -> List[str]:
        """通过文件路径查找相似的图片，返回文件名列表"""
        try:
            # 打开图片并计算哈希
            with Image.open(image_path) as img:
                img_hash = imagehash.average_hash(img)
            
            # 查找相似图片
            similar_images = []
            for filename, stored_hash in self.image_hashes.items():
                try:
                    stored_hash_obj = imagehash.hex_to_hash(stored_hash)
                    hash_diff = abs(img_hash - stored_hash_obj)
                    
                    if hash_diff <= threshold:
                        similar_images.append(filename)
                except Exception as e:
                    logger.error(f"处理图片哈希失败 {filename}: {e}")
                    continue
            
            return similar_images
        except Exception as e:
            logger.error(f"查找相似图片失败: {e}")
            return []

    def get_image_path(self, filename: str) -> Optional[Path]:
        """获取图片文件的完整路径"""
        file_path = self.upload_dir / filename
        return file_path if file_path.exists() else None

# 创建全局实例
storage_service = StorageService()