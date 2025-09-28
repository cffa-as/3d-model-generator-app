"""
DeepSeek API客户端
用于AI生成提示词
"""
import asyncio
from typing import Dict, Any, Optional
from openai import OpenAI
from config import config

class DeepSeekClient:
    def __init__(self):
        """初始化DeepSeek客户端"""
        deepseek_config = config.get("deepseek", {})
        self.client = OpenAI(
            api_key=deepseek_config.get("api_key"),
            base_url=deepseek_config.get("base_url", "https://api.deepseek.com")
        )
        self.model = deepseek_config.get("model", "deepseek-chat")
    
    async def generate_prompt(self, user_input: str, prompt_type: str = "3d_model") -> str:
        """
        根据用户简单描述生成详细的3D模型提示词
        
        Args:
            user_input: 用户的简单描述
            prompt_type: 提示词类型，默认为'3d_model'
            
        Returns:
            生成的详细提示词
        """
        try:
            # 根据提示词类型定制系统提示
            system_prompts = {
                "3d_model": """你是一个3D模型提示词专家。请将用户的简单描述转换为详细且实用的3D模型生成提示词。

要求：
1. 提示词长度控制在80-120字
2. 包含关键要素：形状、颜色、材质、风格、姿态、细节特征
3. 使用具体生动的形容词
4. 保持描述的层次感和逻辑性

示例：
输入："一只猫"
输出："一只可爱的橙色条纹猫咪，自然坐姿，圆润饱满的头部，大而明亮的绿色眼睛，粉红色小鼻子，白色的胸部和爪子，毛发蓬松有质感，表情温和友善，整体卡通风格，比例协调"

输入："机器人"
输出："未来科幻风格的人形机器人，银色金属外壳，表面有细微磨砂质感，胸部有蓝色发光装置，红色LED眼睛，关节处有机械细节，挺拔站立姿态，整体设计简洁现代"

请直接输出提示词，不要包含解释：""",
                
                "texture": """你是一个专业的3D模型材质和纹理描述专家。你的任务是根据用户的简单描述，生成详细的材质和纹理提示词。

生成的提示词应该包含：
1. 表面材质类型（金属、塑料、木材、布料等）
2. 纹理细节（光滑、粗糙、磨损、划痕等）
3. 光泽度和反射特性
4. 颜色变化和渐变
5. 特殊效果（发光、透明、半透明等）
6. 真实感描述

请用中文回复，描述要专业、准确。""",
                
                "artistic": """你是一个艺术风格和创意设计专家。你的任务是将用户的简单想法扩展为富有创意和艺术感的3D模型提示词。

生成的提示词应该包含：
1. 艺术风格（现代、古典、未来主义、极简主义等）
2. 创意元素和独特特征
3. 色彩搭配和视觉效果
4. 情感表达和氛围
5. 构图和空间关系
6. 装饰细节和美学特征

请用中文回复，要富有想象力和艺术感。"""
            }
            
            system_prompt = system_prompts.get(prompt_type, system_prompts["3d_model"])
            
            # 构建对话消息
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ]
            
            # 调用DeepSeek API
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=200,
                stream=False
            )
            
            # 提取生成的内容
            generated_prompt = response.choices[0].message.content.strip()
            
            return generated_prompt
            
        except Exception as e:
            raise Exception(f"DeepSeek API调用失败: {str(e)}")
    
    async def optimize_prompt(self, original_prompt: str) -> str:
        """
        优化现有的提示词
        
        Args:
            original_prompt: 原始提示词
            
        Returns:
            优化后的提示词
        """
        try:
            system_prompt = """你是一个提示词优化专家。请优化3D模型生成的提示词，使其更加清晰有效。

优化原则：
1. 保持核心特征，精简冗余表达
2. 控制在80-120字
3. 增强关键视觉元素的描述
4. 使用准确生动的词汇
5. 保持逻辑层次清晰

请优化以下提示词（只输出优化后的提示词，不要解释）："""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": original_prompt}
            ]
            
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model,
                messages=messages,
                temperature=0.5,
                max_tokens=200,
                stream=False
            )
            
            optimized_prompt = response.choices[0].message.content.strip()
            return optimized_prompt
            
        except Exception as e:
            raise Exception(f"提示词优化失败: {str(e)}")

# 创建全局实例
deepseek_client = DeepSeekClient() 