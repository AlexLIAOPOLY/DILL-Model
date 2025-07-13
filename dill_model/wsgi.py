#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
WSGI入口文件，用于生产环境部署
"""

import os
import sys

# 添加项目根目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    from backend.app import create_app
except ImportError as e:
    print(f"❌ 导入错误: {e}")
    sys.exit(1)

# 创建应用实例
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 