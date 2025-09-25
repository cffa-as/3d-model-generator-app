import requests
import json
from typing import Dict, Optional
from services.db import Database

# 配置
BASE_URL = "http://localhost:8000/api"
TEST_USER = {
    "username": "test_user",
    "password": "test123",
    "email": "test@example.com"
}

class ShowcaseAPITest:
    def __init__(self):
        self.access_token = None
        self.headers = {}
        self.test_model_id = None
        self.test_comment_id = None
        self.db = Database()

    async def create_test_task_in_db(self) -> str:
        """直接在数据库中创建一个已完成的测试任务"""
        task_id = "test_task_001"
        model_urls = json.dumps({
            "glb": "http://example.com/model.glb",
            "usdz": "http://example.com/model.usdz"
        })
        
        # 插入测试任务
        insert_query = """
            INSERT INTO generation_tasks (
                task_id, user_id, task_type, status, model_urls, progress
            ) VALUES (
                %s, %s, %s, %s, %s, %s
            )
        """
        values = (
            task_id,
            2,  # test_user的ID
            "text",
            "completed",
            model_urls,
            100
        )
        await self.db.execute(insert_query, values)
        print(f"创建测试任务成功: {task_id}")
        return task_id

    def set_auth_header(self, token: str):
        """设置认证头"""
        self.access_token = token
        self.headers = {"Authorization": f"Bearer {token}"}

    def register_and_login(self) -> None:
        """注册并登录测试用户"""
        # 注册用户
        response = requests.post(f"{BASE_URL}/users/register", json=TEST_USER)
        print(f"注册用户结果: {response.status_code}")
        print(response.json())

        # 登录获取token
        response = requests.post(
            f"{BASE_URL}/users/token",
            data={"username": TEST_USER["username"], "password": TEST_USER["password"]}
        )
        print(f"登录结果: {response.status_code}")
        result = response.json()
        self.set_auth_header(result["access_token"])

    def test_create_showcase(self) -> None:
        """测试创建模型展示"""
        print("\n=== 测试创建模型展示 ===")
        
        # 创建模型展示
        showcase_data = {
            "title": "测试模型",
            "description": "这是一个测试模型",
            "category": "character",
            "tags": ["test", "demo"],
            "preview_url": "http://example.com/preview.jpg",
            "model_url": "http://example.com/model.glb"  # 添加模型URL
        }
        print(f"发送创建模型展示请求: {showcase_data}")
        
        response = requests.post(
            f"{BASE_URL}/showcase/models",
            json=showcase_data,
            headers=self.headers
        )
        print(f"创建模型展示结果: {response.status_code}")
        print(f"响应内容: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            self.test_model_id = result.get("id")
            print(f"创建的模型ID: {self.test_model_id}")
        else:
            print("创建模型展示失败")

    def test_get_models(self) -> None:
        """测试获取模型列表"""
        print("\n=== 测试获取模型列表 ===")
        # 测试不同的筛选条件
        test_cases = [
            {},
            {"category": "character"},
            {"tag": "test"},
            {"sort_by": "popular"},
            {"page": 1, "page_size": 10}
        ]

        for params in test_cases:
            response = requests.get(
                f"{BASE_URL}/showcase/models",
                params=params,
                headers=self.headers
            )
            print(f"获取模型列表结果 (参数: {params}): {response.status_code}")
            print(response.json())

    def test_get_model_detail(self) -> None:
        """测试获取模型详情"""
        print("\n=== 测试获取模型详情 ===")
        if not self.test_model_id:
            print("没有测试模型ID，跳过测试")
            return

        response = requests.get(
            f"{BASE_URL}/showcase/models/{self.test_model_id}",
            headers=self.headers
        )
        print(f"获取模型详情结果: {response.status_code}")
        print(response.json())

    def test_update_model(self) -> None:
        """测试更新模型信息"""
        print("\n=== 测试更新模型信息 ===")
        if not self.test_model_id:
            print("没有测试模型ID，跳过测试")
            return

        update_data = {
            "title": "更新后的测试模型",
            "description": "这是更新后的描述",
            "category": "prop",
            "tags": ["test", "updated"],
            "status": "public",
            "model_url": "http://example.com/updated_model.glb",  # 添加模型URL
            "preview_url": "http://example.com/updated_preview.jpg"  # 添加预览URL
        }
        response = requests.put(
            f"{BASE_URL}/showcase/models/{self.test_model_id}",
            json=update_data,
            headers=self.headers
        )
        print(f"更新模型信息结果: {response.status_code}")
        print(f"响应内容: {response.text}")

    def test_like_model(self) -> None:
        """测试模型点赞功能"""
        print("\n=== 测试模型点赞功能 ===")
        if not self.test_model_id:
            print("没有测试模型ID，跳过测试")
            return

        # 点赞
        response = requests.post(
            f"{BASE_URL}/showcase/models/{self.test_model_id}/like",
            headers=self.headers
        )
        print(f"点赞结果: {response.status_code}")
        print(f"响应内容: {response.text}")

        # 再次点赞（取消点赞）
        response = requests.post(
            f"{BASE_URL}/showcase/models/{self.test_model_id}/like",
            headers=self.headers
        )
        print(f"取消点赞结果: {response.status_code}")
        print(f"响应内容: {response.text}")

    def test_add_comment(self) -> None:
        """测试添加评论"""
        print("\n=== 测试添加评论 ===")
        if not self.test_model_id:
            print("没有测试模型ID，跳过测试")
            return

        comment_data = {
            "content": "这是一条测试评论"
        }
        print(f"发送添加评论请求: {comment_data}")
        
        response = requests.post(
            f"{BASE_URL}/showcase/models/{self.test_model_id}/comments",
            json=comment_data,
            headers=self.headers
        )
        print(f"添加评论结果: {response.status_code}")
        print(f"响应内容: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            self.test_comment_id = result.get("id")
            if not self.test_comment_id:
                print("警告：未获取到评论ID")
            else:
                print(f"创建的评论ID: {self.test_comment_id}")
        else:
            print("添加评论失败")

    def test_delete_comment(self) -> None:
        """测试删除评论"""
        print("\n=== 测试删除评论 ===")
        if not self.test_comment_id:
            print("没有测试评论ID，跳过测试")
            return

        print(f"删除评论ID: {self.test_comment_id}")
        response = requests.delete(
            f"{BASE_URL}/showcase/comments/{self.test_comment_id}",
            headers=self.headers
        )
        print(f"删除评论结果: {response.status_code}")
        print(f"响应内容: {response.text}")
        
        if response.status_code != 200:
            print("删除评论失败")

    def test_delete_model(self) -> None:
        """测试删除模型"""
        print("\n=== 测试删除模型 ===")
        if not self.test_model_id:
            print("没有测试模型ID，跳过测试")
            return

        response = requests.delete(
            f"{BASE_URL}/showcase/models/{self.test_model_id}",
            headers=self.headers
        )
        print(f"删除模型结果: {response.status_code}")
        print(f"响应内容: {response.text}")

    def run_all_tests(self):
        """运行所有测试"""
        try:
            # 注册并登录测试用户
            self.register_and_login()

            # 运行测试用例
            self.test_create_showcase()
            self.test_get_models()
            self.test_get_model_detail()
            self.test_update_model()
            self.test_like_model()
            self.test_add_comment()
            self.test_delete_comment()
            self.test_delete_model()

        except Exception as e:
            print(f"测试过程中出现错误: {str(e)}")

if __name__ == "__main__":
    # 运行测试
    test = ShowcaseAPITest()
    test.run_all_tests() 