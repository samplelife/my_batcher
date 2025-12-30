# Copyright (c) 2025 Mini Batcher Demo
"""
任务调度器模块 - 后台线程执行批量任务

这个模块展示了如何：
1. 创建后台守护线程
2. 轮询数据库获取待执行任务
3. 调用 ComfyUI 的 API 执行工作流
4. 更新任务状态
"""

import threading
import time
import json
import copy
from typing import TYPE_CHECKING, Dict, Any

if TYPE_CHECKING:
    from .database import Database


class TaskScheduler:
    """
    任务调度器
    
    这是一个后台线程，定期检查数据库中的待执行任务，
    并将它们提交到 ComfyUI 的执行队列中。
    """
    
    def __init__(self, db: "Database", poll_interval: float = 2.0):
        """
        初始化调度器
        
        Args:
            db: 数据库实例
            poll_interval: 轮询间隔（秒）
        """
        self.db = db
        self.poll_interval = poll_interval
        self._running = False
        self._thread = None
        self._current_task_id = None
    
    def start(self):
        """启动调度器线程"""
        if self._running:
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
    
    def stop(self):
        """停止调度器线程"""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
    
    def _run_loop(self):
        """
        调度器主循环
        
        这个循环会不断检查是否有待执行的任务，
        如果有，就取出来执行。
        """
        print("🔄 调度器开始运行...")
        
        while self._running:
            try:
                # 检查是否有待执行的任务
                pending_tasks = self.db.get_pending_tasks()
                
                if pending_tasks:
                    # 取第一个待执行的任务
                    task = pending_tasks[0]
                    self._execute_task(task)
                
            except Exception as e:
                print(f"❌ 调度器错误: {e}")
            
            # 等待下一次轮询
            time.sleep(self.poll_interval)
    
    def _execute_task(self, task: Dict[str, Any]):
        """
        执行一个批量任务
        
        这个方法会：
        1. 将任务状态改为 'running'
        2. 遍历所有子任务参数
        3. 对每个参数组合，修改 workflow 并提交到 ComfyUI
        4. 更新进度
        5. 完成后将状态改为 'completed'
        """
        task_id = task["id"]
        config = task["config"]
        
        print(f"▶️ 开始执行任务 #{task_id}: {task['name']}")
        
        # 更新状态为运行中
        self.db.update_batch_task_status(task_id, "running", 0)
        self._current_task_id = task_id
        
        try:
            workflow = config.get("workflow", {})
            
            # 调试：打印 workflow 信息
            print(f"📋 Workflow 节点数量: {len(workflow)}")
            if len(workflow) == 0:
                print("❌ 警告: workflow 为空！任务创建时可能没有正确获取工作流")
            else:
                print(f"📋 Workflow 节点 ID: {list(workflow.keys())[:5]}...")  # 只打印前5个
            
            sub_tasks = self.db.get_sub_tasks(task_id)
            total = len(sub_tasks)
            
            for i, sub_task in enumerate(sub_tasks):
                if not self._running:
                    break
                
                # 应用参数到 workflow
                modified_workflow = self._apply_params(workflow, sub_task["params"])
                
                # 提交到 ComfyUI
                success = self._queue_prompt(modified_workflow)
                
                # 更新子任务状态
                status = "completed" if success else "failed"
                self.db.update_sub_task(sub_task["id"], status)
                
                # 更新进度
                completed = i + 1
                self.db.update_batch_task_status(task_id, "running", completed)
                print(f"   进度: {completed}/{total}")
                
                # 简单的限速，避免提交太快
                time.sleep(0.5)
            
            # 任务完成
            self.db.update_batch_task_status(task_id, "completed", total)
            print(f"✅ 任务 #{task_id} 执行完成")
            
        except Exception as e:
            print(f"❌ 任务 #{task_id} 执行失败: {e}")
            self.db.update_batch_task_status(task_id, "failed")
        
        self._current_task_id = None
    
    def _apply_params(self, workflow: Dict[str, Any], params: Any) -> Dict[str, Any]:
        """
        将参数应用到 workflow 中
        
        Args:
            workflow: 原始 workflow
            params: 要修改的参数，支持两种格式：
                    1. 单个参数: { "node_id": "3", "field": "seed", "value": 12345 }
                    2. 参数数组: [{ "node_id": "3", "field": "seed", "value": 1 }, 
                                 { "node_id": "3", "field": "steps", "value": 20 }]
        
        Returns:
            修改后的 workflow 副本
        """
        # 深拷贝，避免修改原始数据
        modified = copy.deepcopy(workflow)
        
        if not params:
            return modified
        
        # 统一转换为数组格式
        param_list = params if isinstance(params, list) else [params]
        
        for param in param_list:
            node_id = str(param.get("node_id", ""))
            field = param.get("field", "")
            value = param.get("value")
            
            # 在 workflow 中找到对应的节点并修改
            if node_id in modified:
                node = modified[node_id]
                if "inputs" in node and field in node["inputs"]:
                    node["inputs"][field] = value
                    print(f"   修改节点 {node_id}.{field} = {value}")
        
        return modified
    
    def _queue_prompt(self, workflow: Dict[str, Any]) -> bool:
        """
        将 workflow 提交到 ComfyUI 执行队列
        
        使用 HTTP 请求提交任务，这是最可靠的方式。
        
        Args:
            workflow: 要执行的 workflow
        
        Returns:
            是否提交成功
        """
        try:
            import urllib.request
            import uuid
            
            # 生成唯一的 client_id
            client_id = f"mini-batcher-{uuid.uuid4().hex[:8]}"
            
            data = json.dumps({
                "prompt": workflow,
                "client_id": client_id
            }).encode("utf-8")
            
            req = urllib.request.Request(
                "http://127.0.0.1:8188/prompt",
                data=data,
                headers={"Content-Type": "application/json"}
            )
            
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))
                prompt_id = result.get("prompt_id", "")
                print(f"   📤 任务已提交: {prompt_id[:8]}...")
                
                # 等待任务完成
                return self._wait_for_completion(prompt_id)
                
        except Exception as e:
            print(f"   ❌ 提交任务失败: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _wait_for_completion(self, prompt_id: str, timeout: int = 300) -> bool:
        """
        等待任务执行完成
        
        Args:
            prompt_id: 任务 ID
            timeout: 超时时间（秒）
        
        Returns:
            是否成功完成
        """
        import urllib.request
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # 查询任务历史
                url = f"http://127.0.0.1:8188/history/{prompt_id}"
                req = urllib.request.Request(url)
                
                with urllib.request.urlopen(req, timeout=10) as response:
                    history = json.loads(response.read().decode("utf-8"))
                    
                    if prompt_id in history:
                        # 任务已完成
                        status = history[prompt_id].get("status", {})
                        if status.get("completed", False):
                            print(f"   ✅ 任务完成")
                            return True
                        if status.get("status_str") == "error":
                            print(f"   ❌ 任务执行错误")
                            return False
                            
            except Exception as e:
                pass  # 忽略查询错误，继续等待
            
            time.sleep(1)  # 每秒检查一次
        
        print(f"   ⚠️ 任务超时")
        return False
