# Copyright (c) 2025 Mini Batcher Demo
"""
数据库模块 - 使用 SQLite 进行数据持久化

这个模块展示了如何：
1. 创建和管理 SQLite 数据库
2. 定义数据表结构
3. 实现基本的 CRUD 操作
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from contextlib import contextmanager


class Database:
    """SQLite 数据库封装类"""
    
    def __init__(self, db_path: str = None):
        """
        初始化数据库
        
        Args:
            db_path: 数据库文件路径，默认在插件目录下的 data/mini_batcher.db
        """
        if db_path is None:
            # 默认路径：插件目录/data/mini_batcher.db
            current_dir = os.path.dirname(os.path.abspath(__file__))
            data_dir = os.path.join(current_dir, "..", "data")
            os.makedirs(data_dir, exist_ok=True)
            db_path = os.path.join(data_dir, "mini_batcher.db")
        
        self.db_path = db_path
        print(f"📂 数据库路径: {self.db_path}")
    
    @contextmanager
    def get_connection(self):
        """
        获取数据库连接的上下文管理器
        
        使用方法：
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM tasks")
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # 让结果可以用列名访问
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def init_tables(self):
        """
        初始化数据库表结构
        
        batch_tasks 表：存储批量任务
        - id: 主键
        - name: 任务名称
        - status: 状态 (pending/running/completed/failed)
        - config: 任务配置 (JSON 格式)
        - created_at: 创建时间
        - updated_at: 更新时间
        - total_count: 总任务数
        - completed_count: 已完成数
        """
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS batch_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            config TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_count INTEGER DEFAULT 0,
            completed_count INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS sub_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            params TEXT,
            result TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (batch_id) REFERENCES batch_tasks(id)
        );
        """
        with self.get_connection() as conn:
            conn.executescript(create_table_sql)
    
    # ==================== 批量任务 CRUD ====================
    
    def create_batch_task(self, name: str, config: Dict[str, Any], total_count: int) -> int:
        """
        创建一个批量任务
        
        Args:
            name: 任务名称
            config: 任务配置（包含 workflow 和参数列表）
            total_count: 子任务总数
        
        Returns:
            新创建的任务 ID
        """
        sql = """
        INSERT INTO batch_tasks (name, config, total_count, status)
        VALUES (?, ?, ?, 'pending')
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, (name, json.dumps(config), total_count))
            return cursor.lastrowid
    
    def get_batch_task(self, task_id: int) -> Optional[Dict[str, Any]]:
        """获取单个批量任务"""
        sql = "SELECT * FROM batch_tasks WHERE id = ?"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, (task_id,))
            row = cursor.fetchone()
            if row:
                return self._row_to_dict(row)
            return None
    
    def get_all_batch_tasks(self, limit: int = 50) -> List[Dict[str, Any]]:
        """获取所有批量任务，按创建时间倒序"""
        sql = "SELECT * FROM batch_tasks ORDER BY created_at DESC LIMIT ?"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, (limit,))
            rows = cursor.fetchall()
            return [self._row_to_dict(row) for row in rows]
    
    def update_batch_task_status(self, task_id: int, status: str, completed_count: int = None):
        """更新任务状态"""
        if completed_count is not None:
            sql = """
            UPDATE batch_tasks 
            SET status = ?, completed_count = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """
            params = (status, completed_count, task_id)
        else:
            sql = """
            UPDATE batch_tasks 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """
            params = (status, task_id)
        
        with self.get_connection() as conn:
            conn.execute(sql, params)
    
    def delete_batch_task(self, task_id: int):
        """删除批量任务及其子任务"""
        with self.get_connection() as conn:
            conn.execute("DELETE FROM sub_tasks WHERE batch_id = ?", (task_id,))
            conn.execute("DELETE FROM batch_tasks WHERE id = ?", (task_id,))
    
    def get_pending_tasks(self) -> List[Dict[str, Any]]:
        """获取所有待执行的任务"""
        sql = "SELECT * FROM batch_tasks WHERE status = 'pending' ORDER BY created_at ASC"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql)
            rows = cursor.fetchall()
            return [self._row_to_dict(row) for row in rows]
    
    # ==================== 子任务操作 ====================
    
    def create_sub_tasks(self, batch_id: int, params_list: List[Dict[str, Any]]):
        """批量创建子任务"""
        sql = "INSERT INTO sub_tasks (batch_id, params) VALUES (?, ?)"
        with self.get_connection() as conn:
            for params in params_list:
                conn.execute(sql, (batch_id, json.dumps(params)))
    
    def get_sub_tasks(self, batch_id: int) -> List[Dict[str, Any]]:
        """获取某个批量任务的所有子任务"""
        sql = "SELECT * FROM sub_tasks WHERE batch_id = ? ORDER BY id ASC"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, (batch_id,))
            rows = cursor.fetchall()
            return [self._row_to_dict(row) for row in rows]
    
    def update_sub_task(self, sub_task_id: int, status: str, result: str = None):
        """更新子任务状态和结果"""
        sql = "UPDATE sub_tasks SET status = ?, result = ? WHERE id = ?"
        with self.get_connection() as conn:
            conn.execute(sql, (status, result, sub_task_id))
    
    # ==================== 工具方法 ====================
    
    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """将数据库行转换为字典，并解析 JSON 字段"""
        d = dict(row)
        # 解析 JSON 字段
        for key in ['config', 'params', 'result']:
            if key in d and d[key]:
                try:
                    d[key] = json.loads(d[key])
                except json.JSONDecodeError:
                    pass
        return d
