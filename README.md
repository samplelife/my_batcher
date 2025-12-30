# Mini Batcher Demo

一个用于学习 ComfyUI 插件开发的简单示例项目。

## 📚 项目介绍

这个 Demo 展示了如何实现一个完整的 ComfyUI 插件，包含以下核心技术：

### 后端 (Python)
- **SQLite 数据库**：持久化存储任务数据
- **aiohttp API 路由**：提供 RESTful 接口
- **后台任务调度器**：使用线程池执行批量任务

### 前端 (React + TypeScript)
- **React 18**：现代化组件开发
- **TypeScript**：类型安全
- **Rsbuild**：高性能构建工具
- **动态注入**：将 React 应用注入到 ComfyUI 页面

## 📁 目录结构

```
my-batcher-demo/
├── __init__.py              # 插件入口
├── service/                 # 后端服务
│   ├── __init__.py          # 服务初始化
│   ├── api.py               # API 路由定义
│   ├── database.py          # SQLite 数据库操作
│   └── scheduler.py         # 任务调度器
├── frontend/                # React 前端
│   ├── package.json
│   ├── tsconfig.json
│   ├── rsbuild.config.ts
│   └── src/
│       ├── index.tsx        # 入口文件
│       ├── App.tsx          # 根组件
│       ├── api.ts           # API 请求封装
│       ├── styles/          # 样式文件
│       └── components/      # React 组件
│           ├── TaskList.tsx
│           └── CreateTask.tsx
├── web/                     # ComfyUI 加载的前端脚本
│   └── setup.js             # 动态注入脚本
└── data/                    # 数据目录（自动生成）
    └── mini_batcher.db      # SQLite 数据库文件
```

## 🚀 如何使用

### 1. 安装依赖

首先，进入 frontend 目录安装前端依赖：

```bash
cd my-batcher-demo/frontend
pnpm install
```

### 2. 构建前端

```bash
pnpm build
```

这会在 `frontend/dist` 目录生成构建产物。

### 3. 重启 ComfyUI

将 `my-batcher-demo` 文件夹放入 `ComfyUI/custom_nodes/` 目录（如果还没有的话），然后重启 ComfyUI。

### 4. 使用插件

1. 打开 ComfyUI
2. 页面右下角会出现一个 🎲 按钮
3. 点击按钮打开 Mini Batcher 面板
4. 在「创建任务」页面配置批量参数
5. 点击创建，然后在「任务列表」中运行


## 📝 核心概念解释

### 1. WEB_DIRECTORY

在 `__init__.py` 中定义 `WEB_DIRECTORY = "./web"`，ComfyUI 会自动加载该目录下的 JS 文件。

### 2. 动态注入

`web/setup.js` 使用 `app.registerExtension` 注册扩展，在 ComfyUI 初始化后动态加载 React 应用的 JS 和 CSS。

### 3. API 路由

在 `service/api.py` 中，通过 `server.routes.get/post/delete` 注册自定义 API 路由。

### 4. 任务调度

`service/scheduler.py` 创建一个后台守护线程，轮询数据库获取待执行任务，然后调用 ComfyUI 的内部 API 提交工作流。

## 🎯 学习路径

1. 先阅读 `__init__.py`，了解插件入口
2. 阅读 `service/database.py`，了解 SQLite 操作
3. 阅读 `service/api.py`，了解如何注册 API
4. 阅读 `web/setup.js`，了解前端注入机制
5. 阅读 `frontend/src/` 下的 React 代码

## ⚠️ 注意事项

1. 这是一个简化的 Demo，生产环境需要更完善的错误处理
2. 任务调度器使用简单的轮询机制，生产环境可考虑使用事件驱动
3. 前端没有使用组件库，样式较为简单

## 📄 License

MIT
