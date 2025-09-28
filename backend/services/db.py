import aiomysql
from typing import Optional, Dict, Any, List
import yaml
from pathlib import Path
import logging
from fastapi import HTTPException

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Database:
    """数据库工具类"""
    _pool: Optional[aiomysql.Pool] = None

    @classmethod
    async def get_pool(cls) -> aiomysql.Pool:
        """获取数据库连接池"""
        if cls._pool is None:
            try:
                # 读取配置文件
                config_path = Path(__file__).parent.parent / "config.yaml"
                with open(config_path, "r", encoding="utf-8") as f:
                    config = yaml.safe_load(f)
                    mysql_config = config["mysql"].copy()
                    # 修改参数名
                    if "database" in mysql_config:
                        mysql_config["db"] = mysql_config.pop("database")
                
                logger.info("Creating database pool with config: %s", {
                    **mysql_config,
                    'password': '***'  # 隐藏密码
                })
                
                cls._pool = await aiomysql.create_pool(**mysql_config)
                logger.info("Database pool created successfully")
            except Exception as e:
                logger.error("Failed to create database pool: %s", str(e))
                raise
        return cls._pool

    @classmethod
    async def execute(cls, query: str, args: tuple = ()) -> int:
        """执行SQL语句，返回影响的行数或插入的ID"""
        try:
            pool = await cls.get_pool()
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(query, args)
                    await conn.commit()
                    # 如果是INSERT语句，返回最后插入的ID
                    if query.strip().upper().startswith('INSERT'):
                        return cur.lastrowid
                    return cur.rowcount
        except Exception as e:
            logger.error("Failed to execute query: %s, args: %s, error: %s", query, args, str(e))
            raise

    @classmethod
    async def fetch_one(cls, query: str, args: tuple = ()) -> Optional[Dict[str, Any]]:
        """获取单条记录"""
        try:
            pool = await cls.get_pool()
            async with pool.acquire() as conn:
                async with conn.cursor(aiomysql.DictCursor) as cur:
                    await cur.execute(query, args)
                    result = await cur.fetchone()
                    return result if result else None
        except Exception as e:
            logger.error("Failed to fetch one: %s, args: %s, error: %s", query, args, str(e))
            raise

    @classmethod
    async def fetch_all(cls, query: str, args: tuple = ()) -> List[Dict[str, Any]]:
        """获取多条记录"""
        try:
            pool = await cls.get_pool()
            async with pool.acquire() as conn:
                async with conn.cursor(aiomysql.DictCursor) as cur:
                    await cur.execute(query, args)
                    result = await cur.fetchall()
                    return list(result)
        except Exception as e:
            logger.error("Failed to fetch all: %s, args: %s, error: %s", query, args, str(e))
            raise

    @classmethod
    async def execute_and_fetch_one(cls, insert_query: str, insert_args: tuple, fetch_query: str, use_insert_id: bool = True) -> tuple:
        """在同一个连接中执行插入和查询操作，确保数据一致性
        
        Args:
            insert_query: 插入SQL语句
            insert_args: 插入语句参数
            fetch_query: 查询SQL语句，应包含一个%s占位符用于插入的ID
            use_insert_id: 是否使用插入的ID作为查询参数
        
        Returns:
            tuple: (insert_id, fetch_result)
        """
        try:
            pool = await cls.get_pool()
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    # 执行插入
                    await cur.execute(insert_query, insert_args)
                    insert_id = cur.lastrowid if insert_query.strip().upper().startswith('INSERT') else cur.rowcount
                    
                    # 在同一个连接中执行查询
                    if fetch_query and use_insert_id:
                        async with conn.cursor(aiomysql.DictCursor) as dict_cur:
                            await dict_cur.execute(fetch_query, (insert_id,))
                            result = await dict_cur.fetchone()
                    else:
                        result = None
                    
                    # 提交事务
                    await conn.commit()
                    
                    return insert_id, result
        except Exception as e:
            logger.error("Failed to execute and fetch: insert_query: %s, fetch_query: %s, error: %s", 
                        insert_query, fetch_query, str(e))
            raise

    @classmethod
    async def create_model_with_immediate_fetch(cls, insert_query: str, insert_args: tuple, fetch_query: str) -> tuple:
        """创建模型并立即获取，确保在同一个连接中完成"""
        try:
            pool = await cls.get_pool()
            async with pool.acquire() as conn:
                # 执行插入
                async with conn.cursor() as cur:
                    await cur.execute(insert_query, insert_args)
                    model_id = cur.lastrowid
                
                # 在同一个连接中立即查询
                async with conn.cursor(aiomysql.DictCursor) as dict_cur:
                    await dict_cur.execute(fetch_query, (model_id,))
                    created_model = await dict_cur.fetchone()
                
                # 提交事务
                await conn.commit()
                
                return model_id, created_model
        except Exception as e:
            logger.error("Failed to create model with fetch: %s", str(e))
            raise

    @classmethod
    async def execute_in_transaction(cls, operations: list) -> list:
        """在同一个事务中执行多个操作
        
        Args:
            operations: 操作列表，每个操作是一个字典：
                {
                    'type': 'execute' | 'fetch_one' | 'fetch_all',
                    'query': 'SQL语句',
                    'args': (参数元组,)
                }
        
        Returns:
            list: 每个操作的结果列表
        """
        try:
            pool = await cls.get_pool()
            results = []
            
            async with pool.acquire() as conn:
                for op in operations:
                    if op['type'] == 'execute':
                        async with conn.cursor() as cur:
                            await cur.execute(op['query'], op.get('args', ()))
                            if op['query'].strip().upper().startswith('INSERT'):
                                results.append(cur.lastrowid)
                            else:
                                results.append(cur.rowcount)
                    
                    elif op['type'] == 'fetch_one':
                        async with conn.cursor(aiomysql.DictCursor) as cur:
                            await cur.execute(op['query'], op.get('args', ()))
                            result = await cur.fetchone()
                            results.append(result)
                    
                    elif op['type'] == 'fetch_all':
                        async with conn.cursor(aiomysql.DictCursor) as cur:
                            await cur.execute(op['query'], op.get('args', ()))
                            result = await cur.fetchall()
                            results.append(list(result))
                
                # 提交事务
                await conn.commit()
                
            return results
        except Exception as e:
            logger.error("Failed to execute transaction: %s", str(e))
            raise

    @classmethod
    async def register_user_transaction(cls, username: str, password: str, email: str) -> dict:
        """在同一个连接中处理用户注册的完整流程"""
        try:
            pool = await cls.get_pool()
            async with pool.acquire() as conn:
                async with conn.cursor(aiomysql.DictCursor) as cur:
                    # 检查用户名是否已存在
                    await cur.execute("SELECT id FROM users WHERE username = %s", (username,))
                    if await cur.fetchone():
                        raise HTTPException(status_code=400, detail="用户名已存在")
                    
                    # 检查邮箱是否已存在
                    await cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                    if await cur.fetchone():
                        raise HTTPException(status_code=400, detail="邮箱已被注册")
                    
                    # 插入新用户
                    await cur.execute(
                        "INSERT INTO users (username, password, email) VALUES (%s, %s, %s)",
                        (username, password, email)
                    )
                    user_id = cur.lastrowid
                    
                    # 在同一个连接中查询新创建的用户
                    await cur.execute(
                        "SELECT id, username, email, is_admin, created_at FROM users WHERE id = %s",
                        (user_id,)
                    )
                    new_user = await cur.fetchone()
                    
                    # 提交事务
                    await conn.commit()
                    
                    if not new_user:
                        raise Exception("用户创建失败")
                    
                    return dict(new_user)
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to register user: %s", str(e))
            raise HTTPException(status_code=500, detail=f"注册失败: {str(e)}")

    @classmethod
    async def register_and_authenticate(cls, username: str, password: str, email: str) -> tuple:
        """在同一个连接中完成注册和登录验证的完整流程"""
        try:
            pool = await cls.get_pool()
            async with pool.acquire() as conn:
                async with conn.cursor(aiomysql.DictCursor) as cur:
                    # 检查用户名是否已存在
                    await cur.execute("SELECT id FROM users WHERE username = %s", (username,))
                    if await cur.fetchone():
                        raise HTTPException(status_code=400, detail="用户名已存在")
                    
                    # 检查邮箱是否已存在
                    await cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                    if await cur.fetchone():
                        raise HTTPException(status_code=400, detail="邮箱已被注册")
                    
                    # 插入新用户
                    await cur.execute(
                        "INSERT INTO users (username, password, email) VALUES (%s, %s, %s)",
                        (username, password, email)
                    )
                    user_id = cur.lastrowid
                    
                    # 在同一个连接中查询新创建的用户（用于注册返回）
                    await cur.execute(
                        "SELECT id, username, email, is_admin, created_at FROM users WHERE id = %s",
                        (user_id,)
                    )
                    new_user = await cur.fetchone()
                    
                    # 在同一个连接中再次查询用户（用于登录验证）
                    await cur.execute(
                        "SELECT id, username, password, is_admin FROM users WHERE id = %s",
                        (user_id,)
                    )
                    auth_user = await cur.fetchone()
                    
                    # 提交事务
                    await conn.commit()
                    
                    if not new_user or not auth_user:
                        raise Exception("用户创建失败")
                    
                    return dict(new_user), dict(auth_user)
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to register and authenticate user: %s", str(e))
            raise HTTPException(status_code=500, detail=f"注册失败: {str(e)}")

    @classmethod
    async def authenticate_user(cls, username: str, password: str) -> Optional[dict]:
        """在同一个连接中验证用户登录"""
        try:
            pool = await cls.get_pool()
            async with pool.acquire() as conn:
                async with conn.cursor(aiomysql.DictCursor) as cur:
                    # 查询用户
                    await cur.execute(
                        "SELECT id, username, password, is_admin FROM users WHERE username = %s",
                        (username,)
                    )
                    user = await cur.fetchone()
                    
                    if not user:
                        logger.warning(f"用户不存在: {username}")
                        return None
                    
                    # 验证密码
                    if user["password"] != password:
                        logger.warning(f"密码错误: 用户={username}")
                        return None
                    
                    return dict(user)
        except Exception as e:
            logger.error("Failed to authenticate user: %s", str(e))
            return None

    @classmethod
    async def close(cls):
        """关闭数据库连接池"""
        if cls._pool is not None:
            cls._pool.close()
            await cls._pool.wait_closed()
            cls._pool = None
            logger.info("Database pool closed")

# 数据库实例
db = Database() 