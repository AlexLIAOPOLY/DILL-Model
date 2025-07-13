#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
WSGI入口文件，用于生产环境部署
支持Render、Heroku等云平台部署
"""

import os
import sys
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 添加项目根目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# 环境变量设置
os.environ.setdefault('FLASK_ENV', 'production')
os.environ.setdefault('PYTHONPATH', current_dir)

try:
    from backend.app import create_app
    logger.info("Successfully imported Flask app")
except ImportError as e:
    logger.error(f"❌ 导入错误: {e}")
    logger.error("请确保所有依赖已正确安装")
    sys.exit(1)

# 创建应用实例
try:
    app = create_app()
    logger.info("✅ Flask应用创建成功")
except Exception as e:
    logger.error(f"❌ 应用创建失败: {e}")
    sys.exit(1)

# 健康检查路由
@app.route('/health')
def health_check():
    """健康检查端点"""
    return {'status': 'healthy', 'service': 'dill-model'}, 200

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"🚀 启动服务器，端口: {port}")
    app.run(host='0.0.0.0', port=port, debug=False) 