import asyncio
import json
from services.cache_service import ModelCacheService
from services.db import Database
import logging
import sys

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# 初始化服务
cache_service = ModelCacheService()
db = Database()

async def test_cache_operations():
    """测试缓存操作"""
    # 1. 测试缓存统计
    logger.info("\n=== 测试缓存统计 ===")
    stats = cache_service.get_cache_stats()
    logger.info(f"当前缓存统计: {json.dumps(stats, indent=2)}")

    # 2. 测试模型缓存
    logger.info("\n=== 测试模型缓存 ===")
    test_model = {
        "prompt": "一只可爱的猫咪",
        "style": "卡通",
        "model_file_path": "cache/models/test_cat.glb",
        "task_id": "test-task-001",
        "additional_info": {
            "created_at": "2024-01-01T00:00:00",
            "task_type": "text"
        }
    }
    
    success = cache_service.cache_model(
        prompt=test_model["prompt"],
        style=test_model["style"],
        model_file_path=test_model["model_file_path"],
        task_id=test_model["task_id"],
        additional_info=test_model["additional_info"]
    )
    logger.info(f"缓存模型结果: {'成功' if success else '失败'}")

    # 3. 测试完全匹配查找
    logger.info("\n=== 测试完全匹配 ===")
    exact_match = cache_service.find_similar_model(
        prompt="一只可爱的猫咪",
        style="卡通"
    )
    if exact_match:
        logger.info(f"找到完全匹配: {json.dumps(exact_match[1], indent=2)}")
    else:
        logger.info("未找到完全匹配")

    # 4. 测试相似度匹配
    logger.info("\n=== 测试相似度匹配 ===")
    similar_prompts = [
        "一只可爱的小猫",
        "可爱猫咪",
        "一只萌萌的猫",
        "完全不相关的提示词"
    ]
    
    for prompt in similar_prompts:
        similar_match = cache_service.find_similar_model(prompt=prompt)
        if similar_match:
            logger.info(f"提示词 '{prompt}' 找到相似匹配: {similar_match[1]['prompt']}")
        else:
            logger.info(f"提示词 '{prompt}' 未找到相似匹配")

    # 5. 测试数据库中的真实任务
    logger.info("\n=== 测试数据库中的真实任务 ===")
    query = """
        SELECT t.task_id, t.prompt, t.model_urls, t.art_style, u.username 
        FROM generation_tasks t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.status = 'completed' 
        LIMIT 5
    """
    try:
        tasks = await db.fetch_all(query)
        logger.info(f"从数据库加载了 {len(tasks)} 个已完成任务")
        
        for task in tasks:
            if not task['model_urls']:
                continue
                
            model_urls = json.loads(task['model_urls']) if isinstance(task['model_urls'], str) else task['model_urls']
            if not model_urls.get('glb'):
                continue
                
            success = cache_service.cache_model(
                prompt=task['prompt'],
                style=task['art_style'] or "",  # 使用art_style作为风格
                model_file_path=model_urls['glb'],
                task_id=task['task_id'],
                additional_info={
                    "created_at": "2024-01-01T00:00:00",
                    "task_type": "text",
                    "username": task['username'],
                    "art_style": task['art_style']
                }
            )
            logger.info(f"缓存数据库任务 {task['task_id']}: {'成功' if success else '失败'}")
    except Exception as e:
        logger.error(f"从数据库加载任务失败: {str(e)}")
        logger.info("继续执行其他测试...")

    # 6. 再次显示缓存统计
    logger.info("\n=== 最终缓存统计 ===")
    stats = cache_service.get_cache_stats()
    logger.info(f"最终缓存统计: {json.dumps(stats, indent=2)}")

def print_help():
    """打印帮助信息"""
    print("""
缓存测试脚本使用说明：
1. 此脚本用于测试模型生成的缓存功能
2. 会执行以下测试：
   - 检查当前缓存状态
   - 添加测试模型到缓存
   - 测试完全匹配查找
   - 测试相似度匹配
   - 从数据库导入真实任务到缓存
3. 运行方式：
   python test_cache.py
""")

if __name__ == "__main__":
    print_help()
    input("按回车键开始测试...")
    asyncio.run(test_cache_operations()) 