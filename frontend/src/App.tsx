/**
 * App 主组件
 * 
 * 这是 React 应用的根组件，负责：
 * 1. 管理面板的显示/隐藏状态
 * 2. 渲染浮动按钮和面板
 * 3. 协调各个子组件
 */
import React, { useState, useCallback } from "react";
import TaskList from "./components/TaskList";
import CreateTask from "./components/CreateTask";

// Tab 类型定义
type TabType = "list" | "create";

const App: React.FC = () => {
  // 面板是否显示
  const [isOpen, setIsOpen] = useState(false);
  // 当前选中的 Tab
  const [activeTab, setActiveTab] = useState<TabType>("list");
  // 用于刷新任务列表的 key
  const [refreshKey, setRefreshKey] = useState(0);

  // 打开面板
  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  // 关闭面板
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // 点击遮罩层关闭
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // 创建任务成功后的回调
  const handleTaskCreated = useCallback(() => {
    // 切换到列表页
    setActiveTab("list");
    // 刷新列表
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <>
      {/* 浮动按钮 - 始终显示在右下角 */}
      <button 
        className="mb-float-button" 
        onClick={handleOpen}
        title="打开 Mini Batcher"
      >
        🎲
      </button>

      {/* 面板 - 只在 isOpen 为 true 时显示 */}
      {isOpen && (
        <div className="mb-panel-overlay" onClick={handleOverlayClick}>
          <div className="mb-panel">
            {/* 头部 */}
            <div className="mb-panel-header">
              <h2 className="mb-panel-title">🎲 Mini Batcher</h2>
              <button className="mb-close-button" onClick={handleClose}>
                ×
              </button>
            </div>

            {/* Tab 标签页 */}
            <div className="mb-tabs">
              <button 
                className={`mb-tab ${activeTab === "list" ? "active" : ""}`}
                onClick={() => setActiveTab("list")}
              >
                📋 任务列表
              </button>
              <button 
                className={`mb-tab ${activeTab === "create" ? "active" : ""}`}
                onClick={() => setActiveTab("create")}
              >
                ➕ 创建任务
              </button>
            </div>

            {/* 内容区 */}
            <div className="mb-panel-content">
              {activeTab === "list" ? (
                <TaskList key={refreshKey} />
              ) : (
                <CreateTask onSuccess={handleTaskCreated} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
