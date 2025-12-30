# Copyright (c) 2025 Mini Batcher Demo
"""
API 路由模块 - 使用 aiohttp 注册 HTTP 接口

这个模块展示了如何：
1. 获取 ComfyUI 的 PromptServer 实例
2. 注册自定义的 API 路由
3. 处理 JSON 请求和响应
4. 提供静态文件服务（用于加载前端资源）
"""

import os
import json
import mimetypes
from aiohttp import web
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .database import Database

# 全局数据库引用
_db: "Database" = None


def register_routes(db: "Database"):
    """
    注册所有 API 路由到 ComfyUI 的 HTTP 服务器
    
    Args:
        db: 数据库实例
    """
    global _db
    _db = db
    
    # 获取 ComfyUI 的 PromptServer 实例
    # 这是 ComfyUI 核心的 HTTP 服务器
    try:
        from server import PromptServer
        server = PromptServer.instance
    except ImportError:
        print("⚠️ 无法获取 PromptServer，API 路由注册失败")
        return
    
    # 注册路由
    # 所有路由都以 /mini-batcher 开头，避免与其他插件冲突
    
    # ==================== 任务管理 API ====================
    
    @server.routes.get("/mini-batcher/api/tasks")
    async def get_tasks(request):
        """
        获取所有批量任务列表
        
        GET /mini-batcher/api/tasks
        
        Response: {
            "success": true,
            "data": [{ "id": 1, "name": "...", ... }]
        }
        """
        try:
            tasks = _db.get_all_batch_tasks()
            return web.json_response({
                "success": True,
                "data": tasks
            })
        except Exception as e:
            return web.json_response({
                "success": False,
                "error": str(e)
            }, status=500)
    
    @server.routes.get("/mini-batcher/api/tasks/{task_id}")
    async def get_task(request):
        """
        获取单个任务详情
        
        GET /mini-batcher/api/tasks/{task_id}
        """
        try:
            task_id = int(request.match_info["task_id"])
            task = _db.get_batch_task(task_id)
            if task:
                # 同时获取子任务
                sub_tasks = _db.get_sub_tasks(task_id)
                task["sub_tasks"] = sub_tasks
                return web.json_response({
                    "success": True,
                    "data": task
                })
            else:
                return web.json_response({
                    "success": False,
                    "error": "任务不存在"
                }, status=404)
        except Exception as e:
            return web.json_response({
                "success": False,
                "error": str(e)
            }, status=500)
    
    @server.routes.post("/mini-batcher/api/tasks")
    async def create_task(request):
        """
        创建新的批量任务
        
        POST /mini-batcher/api/tasks
        Body: {
            "name": "我的批量任务",
            "workflow": { ... },  // ComfyUI workflow JSON
            "params": [           // 参数变化列表
                { "node_id": "3", "field": "seed", "value": 1 },
                { "node_id": "3", "field": "seed", "value": 2 },
                ...
            ]
        }
        """
        try:
            data = await request.json()
            name = data.get("name", "未命名任务")
            workflow = data.get("workflow", {})
            params = data.get("params", [])
            
            # 创建批量任务
            config = {
                "workflow": workflow,
                "params": params
            }
            task_id = _db.create_batch_task(name, config, len(params))
            
            # 创建子任务
            if params:
                _db.create_sub_tasks(task_id, params)
            
            return web.json_response({
                "success": True,
                "data": {"id": task_id}
            })
        except Exception as e:
            return web.json_response({
                "success": False,
                "error": str(e)
            }, status=500)
    
    @server.routes.delete("/mini-batcher/api/tasks/{task_id}")
    async def delete_task(request):
        """
        删除批量任务
        
        DELETE /mini-batcher/api/tasks/{task_id}
        """
        try:
            task_id = int(request.match_info["task_id"])
            _db.delete_batch_task(task_id)
            return web.json_response({
                "success": True
            })
        except Exception as e:
            return web.json_response({
                "success": False,
                "error": str(e)
            }, status=500)
    
    @server.routes.post("/mini-batcher/api/tasks/{task_id}/run")
    async def run_task(request):
        """
        执行批量任务
        
        POST /mini-batcher/api/tasks/{task_id}/run
        
        这个接口会将任务状态改为 'running'，
        然后由后台的 TaskScheduler 来实际执行
        """
        try:
            task_id = int(request.match_info["task_id"])
            task = _db.get_batch_task(task_id)
            
            if not task:
                return web.json_response({
                    "success": False,
                    "error": "任务不存在"
                }, status=404)
            
            if task["status"] == "running":
                return web.json_response({
                    "success": False,
                    "error": "任务正在执行中"
                }, status=400)
            
            # 更新状态为待执行
            _db.update_batch_task_status(task_id, "pending")
            
            return web.json_response({
                "success": True,
                "message": "任务已加入执行队列"
            })
        except Exception as e:
            return web.json_response({
                "success": False,
                "error": str(e)
            }, status=500)
    
    # ==================== 静态文件服务 ====================
    
    @server.routes.get("/mini-batcher/static/{path:.*}")
    async def serve_static(request):
        """
        提供前端静态文件服务
        
        GET /mini-batcher/static/index.js
        GET /mini-batcher/static/index.css
        
        这个接口用于加载构建后的 React 前端资源
        """
        try:
            file_path = request.match_info["path"]
            
            # 安全检查：防止路径遍历攻击
            if ".." in file_path:
                return web.Response(status=403, text="Forbidden")
            
            # 构建完整路径
            current_dir = os.path.dirname(os.path.abspath(__file__))
            static_dir = os.path.join(current_dir, "..", "frontend", "dist")
            full_path = os.path.join(static_dir, file_path)
            
            if not os.path.exists(full_path):
                return web.Response(status=404, text="File not found")
            
            # 读取文件
            with open(full_path, "rb") as f:
                content = f.read()
            
            # 确定 MIME 类型
            mime_type, _ = mimetypes.guess_type(file_path)
            if mime_type is None:
                mime_type = "application/octet-stream"
            
            # JavaScript 文件需要正确的 MIME 类型才能被 import()
            if file_path.endswith(".js"):
                mime_type = "application/javascript"
            
            return web.Response(
                body=content,
                content_type=mime_type,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache"
                }
            )
        except Exception as e:
            import traceback
            error_msg = traceback.format_exc()
            print(f"❌ 静态文件服务错误: {error_msg}")
            return web.Response(status=500, text=str(e))
    
    print(f"✅ 已注册 API 路由:")
    print(f"   GET  /mini-batcher/api/tasks")
    print(f"   GET  /mini-batcher/api/tasks/{{task_id}}")
    print(f"   POST /mini-batcher/api/tasks")
    print(f"   DELETE /mini-batcher/api/tasks/{{task_id}}")
    print(f"   POST /mini-batcher/api/tasks/{{task_id}}/run")
    print(f"   GET  /mini-batcher/static/{{path}}")
