import asyncio
import os
from services.meshy_client import meshy_client

async def test_meshy_image():
    """测试 Meshy 图片生成3D模型"""
    print("开始测试 Meshy 图生模型...")
    
    # 1. 创建任务
    print("\n1. 创建任务")
    with open("test.jpg", "rb") as f:
        response = await meshy_client.create_image_task(f)
    task_id = response["result"]
    print(f"任务ID: {task_id}")
    
    # 2. 等待任务完成
    print("\n2. 等待任务完成")
    while True:
        task = await meshy_client.get_task(task_id, task_type="image")
        print(f"进度: {task['progress']}%, 状态: {task['status']}")
        
        if task["status"] == "SUCCEEDED":
            print("\n任务完成!")
            print("\n生成的模型信息:")
            print(f"预览图片: {task['thumbnail_url']}")
            print(f"模型文件: {task['model_urls']}")
            if task.get("texture_urls"):
                print(f"贴图文件: {task['texture_urls']}")
            break
        elif task["status"] in ["FAILED", "CANCELED"]:
            print(f"\n任务失败: {task.get('task_error', {}).get('message', '未知错误')}")
            return
            
        await asyncio.sleep(5)  # 每5秒检查一次

if __name__ == "__main__":
    # 创建输出目录
    os.makedirs("./output", exist_ok=True)
    asyncio.run(test_meshy_image())