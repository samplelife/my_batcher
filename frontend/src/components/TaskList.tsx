/**
 * 任务列表组件
 * 
 * 展示所有批量任务，支持：
 * - 查看任务状态和进度
 * - 运行任务
 * - 删除任务
 */
import React, { useState, useEffect, useCallback } from "react";
import { getTasks, deleteTask, runTask, Task } from "../api";

const TaskList: React.FC = () => {
  // 任务列表
  const [tasks, setTasks] = useState<Task[]>([]);
  // 加载状态
  const [loading, setLoading] = useState(true);
  // 错误信息
  const [error, setError] = useState<string | null>(null);

  // 加载任务列表
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getTasks();
    
    if (result.success && result.data) {
      setTasks(result.data);
    } else {
      setError(result.error || "加载失败");
    }
    
    setLoading(false);
  }, []);

  // 组件挂载时加载数据
  useEffect(() => {
    loadTasks();

    // 设置定时刷新（用于更新任务状态）
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, [loadTasks]);

  // 运行任务
  const handleRun = useCallback(async (taskId: number) => {
    const result = await runTask(taskId);
    if (result.success) {
      loadTasks(); // 刷新列表
    } else {
      alert(result.error || "运行失败");
    }
  }, [loadTasks]);

  // 删除任务
  const handleDelete = useCallback(async (taskId: number) => {
    if (!confirm("确定要删除这个任务吗？")) {
      return;
    }

    const result = await deleteTask(taskId);
    if (result.success) {
      loadTasks(); // 刷新列表
    } else {
      alert(result.error || "删除失败");
    }
  }, [loadTasks]);

  // 获取状态显示文本
  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: "等待中",
      running: "运行中",
      completed: "已完成",
      failed: "失败",
    };
    return map[status] || status;
  };

  // 加载中状态
  if (loading && tasks.length === 0) {
    return (
      <div className="mb-empty">
        <div className="mb-empty-icon">⏳</div>
        <p>加载中...</p>
      </div>
    );
  }

  // 错误状态
  if (error && tasks.length === 0) {
    return (
      <div className="mb-empty">
        <div className="mb-empty-icon">❌</div>
        <p>{error}</p>
        <button className="mb-button mb-button-primary" onClick={loadTasks}>
          重试
        </button>
      </div>
    );
  }

  // 空状态
  if (tasks.length === 0) {
    return (
      <div className="mb-empty">
        <div className="mb-empty-icon">📭</div>
        <p>暂无任务，去创建一个吧！</p>
      </div>
    );
  }

  // 任务列表
  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <span>共 {tasks.length} 个任务</span>
        <button className="mb-button mb-button-secondary" onClick={loadTasks}>
          🔄 刷新
        </button>
      </div>

      <ul className="mb-task-list">
        {tasks.map((task) => (
          <li key={task.id} className="mb-task-item">
            <div className="mb-task-info">
              <div className="mb-task-name">
                {task.name}
                <span className={`mb-status mb-status-${task.status}`} style={{ marginLeft: 8 }}>
                  {getStatusText(task.status)}
                </span>
              </div>
              <div className="mb-task-meta">
                创建于: {new Date(task.created_at).toLocaleString()} | 
                进度: {task.completed_count} / {task.total_count}
              </div>
              {/* 进度条 */}
              {task.status === "running" && task.total_count > 0 && (
                <div className="mb-progress">
                  <div 
                    className="mb-progress-bar" 
                    style={{ width: `${(task.completed_count / task.total_count) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div className="mb-task-actions">
              {/* 只有非运行中的任务可以运行 */}
              {task.status !== "running" && (
                <button 
                  className="mb-button mb-button-primary"
                  onClick={() => handleRun(task.id)}
                >
                  ▶️ 运行
                </button>
              )}
              {/* 删除按钮 */}
              <button 
                className="mb-button mb-button-danger"
                onClick={() => handleDelete(task.id)}
              >
                🗑️ 删除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskList;
