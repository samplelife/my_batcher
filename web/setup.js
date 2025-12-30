/**
 * 前端注入脚本
 * 
 * 这个脚本会被 ComfyUI 自动加载。
 * 它的作用是动态加载我们构建好的 React 应用。
 * 
 * 工作原理：
 * 1. ComfyUI 通过 WEB_DIRECTORY 配置发现这个目录
 * 2. 自动加载这个 setup.js 文件
 * 3. 我们在这里动态创建 <script> 和 <link> 标签
 * 4. 浏览器加载 React 应用并执行
 */

// 导入 ComfyUI 的 app 扩展接口
import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// 把 app 和 api 挂载到 window，让 React 代码能访问
window.comfyApp = app;
window.comfyApi = api;

// 静态资源的基础路径
// /mini-batcher/static/ 是我们在 api.py 中定义的路由
// 它会从 frontend/dist/ 目录读取文件
const STATIC_BASE = "/mini-batcher/static";

/**
 * 动态加载 CSS 文件
 */
function loadCSS(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

/**
 * 动态加载 JS 模块
 */
function loadJS(src) {
  return import(src);
}

/**
 * 初始化 Mini Batcher
 * 
 * 这个函数会加载 React 应用所需的所有资源。
 */
async function initMiniBatcher() {
  console.log("🎲 Mini Batcher 开始加载...");

  try {
    // 1. 加载 CSS
    await loadCSS(`${STATIC_BASE}/css/index.css`);
    console.log("✅ CSS 加载完成");

    // 2. 先加载 React 依赖库
    try {
      await loadJS(`${STATIC_BASE}/js/lib-react.js`);
      console.log("✅ React 依赖库加载完成");
    } catch (e) {
      console.log("ℹ️ React 依赖库可能已内联，跳过");
    }

    // 3. 加载主 JS
    const module = await loadJS(`${STATIC_BASE}/js/index.js`);
    console.log("✅ JS 加载完成", module);
    
    // 4. 如果模块导出了 initApp，手动调用它
    if (module && typeof module.initApp === "function") {
      console.log("🔧 手动调用 initApp...");
      module.initApp();
    }

    console.log("🎉 Mini Batcher 加载成功！");
  } catch (error) {
    console.error("❌ Mini Batcher 加载失败:", error);
    
    // 如果加载失败，显示一个简单的错误提示
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 16px 24px;
      background: #ef4444;
      color: white;
      border-radius: 8px;
      z-index: 9999;
      font-family: sans-serif;
    `;
    errorDiv.innerHTML = `
      <strong>Mini Batcher 加载失败</strong><br>
      <small>请确保已运行 pnpm build 构建前端</small>
    `;
    document.body.appendChild(errorDiv);
    
    // 5秒后自动移除
    setTimeout(() => errorDiv.remove(), 5000);
  }
}

// 使用 ComfyUI 的扩展系统注册
app.registerExtension({
  name: "MiniBatcher",
  
  /**
   * setup 会在 ComfyUI 初始化完成后调用
   */
  async setup() {
    // 延迟一点加载，确保 ComfyUI 完全初始化
    setTimeout(initMiniBatcher, 1000);
  },
});

console.log("📦 Mini Batcher setup.js 已加载");
