# Copyright (c) 2025 Mini Batcher Demo
"""
服务模块初始化

这个模块负责：
1. 初始化 SQLite 数据库
2. 注册 API 路由到 ComfyUI 的 aiohttp 服务器
3. 启动后台任务调度器
"""

from .database import Database
from .api import register_routes
from .scheduler import TaskScheduler

# 全局单例
db: Database = None
scheduler: TaskScheduler = None


def init_service():
    """初始化所有服务"""
    global db, scheduler
    
    # 1. 初始化数据库
    db = Database()
    db.init_tables()
    print("📦 数据库初始化完成")
    
    # 2. 注册 API 路由
    register_routes(db)
    print("🔌 API 路由注册完成")
    
    # 3. 启动任务调度器
    scheduler = TaskScheduler(db)
    scheduler.start()
    print("⏰ 任务调度器已启动")


def get_db() -> Database:
    """获取数据库实例"""
    return db


def get_scheduler() -> TaskScheduler:
    """获取调度器实例"""
    return scheduler
