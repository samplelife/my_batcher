/**
 * React 应用入口文件
 * 
 * 这个文件负责：
 * 1. 创建 React 根节点
 * 2. 渲染 App 组件
 * 3. 将应用挂载到 ComfyUI 页面上
 */
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";

/**
 * 初始化 React 应用
 * 
 * 我们需要在 ComfyUI 的页面上创建一个新的 div，
 * 然后将 React 应用渲染到这个 div 中。
 */
function initApp() {
  console.log("🔧 initApp 开始执行...");
  
  try {
    // 检查是否已经初始化过
    if (document.getElementById("mini-batcher-root")) {
      console.log("Mini Batcher 已经初始化");
      return;
    }

    console.log("🔧 创建根容器...");
    
    // 创建根容器
    const container = document.createElement("div");
    container.id = "mini-batcher-root";
    document.body.appendChild(container);
    
    console.log("🔧 根容器已添加到 body");

    // 创建 React 根节点并渲染
    const root = createRoot(container);
    console.log("🔧 React root 已创建");
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    console.log("🎨 Mini Batcher React 应用已挂载");
  } catch (error) {
    console.error("❌ Mini Batcher 初始化失败:", error);
  }
}

// 等待 DOM 加载完成后初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// 导出初始化函数，供 setup.js 调用
export { initApp };
