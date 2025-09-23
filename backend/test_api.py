import asyncio
import time
from services.meshy_client import meshy_client

async def test_meshy():
    """测试 Meshy API"""
    print("开始测试 Meshy API...")
    
    # 1. 创建预览任务
    print("\n1. 创建预览任务")
    preview_response = await meshy_client.create_preview_task("一只皮卡丘")
    preview_task_id = preview_response["result"]
    print(f"预览任务ID: {preview_task_id}")
    
    # 2. 等待预览任务完成
    print("\n2. 等待预览任务完成")
    while True:
        task = await meshy_client.get_task(preview_task_id)
        print(f"进度: {task['progress']}%, 状态: {task['status']}")
        
        if task["status"] == "SUCCEEDED":
            print("\n预览任务完成!")
            break
        elif task["status"] in ["FAILED", "CANCELED"]:
            print(f"\n预览任务失败: {task.get('task_error', {}).get('message', '未知错误')}")
            return
            
        await asyncio.sleep(5)  # 每5秒检查一次
    
    # 3. 创建精细化任务
    print("\n3. 创建精细化任务")
    refine_response = await meshy_client.create_refine_task(preview_task_id, enable_pbr=True)
    refine_task_id = refine_response["result"]
    print(f"精细化任务ID: {refine_task_id}")
    
    # 4. 等待精细化任务完成
    print("\n4. 等待精细化任务完成")
    while True:
        task = await meshy_client.get_task(refine_task_id)
        print(f"进度: {task['progress']}%, 状态: {task['status']}")
        
        if task["status"] == "SUCCEEDED":
            print("\n精细化任务完成!")
            print("\n生成的模型信息:")
            print(f"预览图片: {task['thumbnail_url']}")
            print(f"模型文件: {task['model_urls']}")
            if task.get("texture_urls"):
                print(f"贴图文件: {task['texture_urls']}")
            break
        elif task["status"] in ["FAILED", "CANCELED"]:
            print(f"\n精细化任务失败: {task.get('task_error', {}).get('message', '未知错误')}")
            return
            
        await asyncio.sleep(5)  # 每5秒检查一次

if __name__ == "__main__":
    asyncio.run(test_meshy())