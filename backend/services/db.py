import aiomysql
from typing import Optional, Dict, Any, List
import yaml
from pathlib import Path
import logging

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
    async def close(cls):
        """关闭数据库连接池"""
        if cls._pool is not None:
            cls._pool.close()
            await cls._pool.wait_closed()
            cls._pool = None
            logger.info("Database pool closed")

# 数据库实例
db = Database() 