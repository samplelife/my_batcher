# Copyright (c) 2025 Mini Batcher Demo
# 一个用于学习 ComfyUI 插件开发的简单示例

"""
Mini Batcher Demo - ComfyUI 批量任务插件示例

这个 Demo 展示了如何实现一个完整的 ComfyUI 插件，包括：
1. 后端 API 路由注册
2. SQLite 数据库持久化
3. 任务调度器
4. React 前端动态注入

目录结构：
├── __init__.py          # 插件入口（当前文件）
├── service/             # 后端服务
│   ├── __init__.py
│   ├── api.py           # API 路由定义
│   ├── database.py      # 数据库操作
│   └── scheduler.py     # 任务调度器
├── frontend/            # React 前端工程
│   ├── src/
│   ├── package.json
│   └── ...
└── web/                 # 前端注入脚本
    └── setup.js
"""

import os
import sys

# 确保 service 目录在 Python 路径中
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# 导入并初始化服务
from service import init_service

# 初始化数据库和 API 路由
init_service()

# ComfyUI 插件必需的导出
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# 告诉 ComfyUI 加载 web 目录下的前端文件
WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

print("🎉 Mini Batcher Demo 已加载！")
