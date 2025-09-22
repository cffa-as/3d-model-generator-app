import asyncio
import httpx
import os
import json

# 配置
API_URL = "http://localhost:8000"  # FastAPI服务地址
TEST_TEXT = "一个红色的现代风格办公椅，有扶手和轮子"  # 测试文本

async def test_text_to_model():
    """测试文生3D模型功能"""
    
    print(f"开始测试文生3D模型功能...")
    print(f"测试文本: {TEST_TEXT}")
    
    async with httpx.AsyncClient() as client:
        try:
            # 发送请求
            print("\n发送请求中...")
            response = await client.post(
                f"{API_URL}/api/text2model",
                json={
                    "text": TEST_TEXT,
                    "style": "现代简约"
                },
                timeout=300.0  # 5分钟超时
            )
            
            # 检查响应状态
            if response.status_code == 200:
                result = response.json()
                print("\n请求成功!")
                print("状态:", result["status"])
                print("消息:", result["message"])
                print("\n生成的模型信息:")
                print("预览图片URL:", result["data"]["preview_url"])
                print("模型文件URL:", result["data"]["model_url"])
                print("模型类型:", result["data"]["model_type"])
            else:
                print(f"\n请求失败! 状态码: {response.status_code}")
                try:
                    error_data = response.json()
                    print("错误信息:", json.dumps(error_data, indent=2, ensure_ascii=False))
                except:
                    print("错误信息:", response.text)
                
        except httpx.TimeoutException:
            print("\n请求超时! 这可能是因为模型生成需要较长时间。")
        except Exception as e:
            print(f"\n发生错误: {str(e)}")

if __name__ == "__main__":
    # 确保后端服务已启动
    print("注意: 请确保后端服务已经启动并运行在 http://localhost:8000")
    input("按回车键开始测试...")
    
    # 运行测试
    asyncio.run(test_text_to_model()) 