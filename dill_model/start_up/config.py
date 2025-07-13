# -*- coding: utf-8 -*-
"""
Dill模型计算工具配置文件

这个文件包含了应用的所有配置选项，包括开发、测试和生产环境的设置。
"""

import os
from datetime import timedelta

class Config:
    """基础配置类"""
    
    # 应用基本信息
    APP_NAME = "Dill模型计算工具"
    APP_VERSION = "1.2.0"
    APP_AUTHOR = "Dill Model Team"
    
    # Flask配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dill-model-secret-key-2024'
    JSON_SORT_KEYS = False
    JSON_AS_ASCII = False
    
    # 服务器配置
    DEFAULT_HOST = '0.0.0.0'
    DEFAULT_PORT = 8080
    THREADED = True
    
    # 文件上传配置
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    ALLOWED_EXTENSIONS = {'txt', 'csv', 'json', 'xlsx', 'xls'}
    
    # 计算配置
    MAX_CALCULATION_TIME = 30  # 最大计算时间（秒）
    DEFAULT_GRID_SIZE = 100    # 默认网格大小
    MAX_GRID_SIZE = 1000       # 最大网格大小
    
    # 图表配置
    FIGURE_DPI = 100
    FIGURE_SIZE = (10, 6)
    PLOT_STYLE = 'seaborn-v0_8'
    COLOR_SCHEME = 'viridis'
    
    # 缓存配置
    CACHE_TYPE = 'simple'
    CACHE_DEFAULT_TIMEOUT = 300  # 5分钟
    
    # 日志配置
    LOG_LEVEL = 'INFO'
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    LOG_FILE = 'dill_model.log'
    
    # 安全配置
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    
    # API配置
    API_RATE_LIMIT = "100 per hour"
    API_TIMEOUT = 30
    
    # 前端配置
    STATIC_FOLDER = 'frontend'
    TEMPLATE_FOLDER = 'frontend'
    
    @staticmethod
    def init_app(app):
        """初始化应用配置"""
        # 创建必要的目录
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        
        # 设置日志
        import logging
        logging.basicConfig(
            level=getattr(logging, Config.LOG_LEVEL),
            format=Config.LOG_FORMAT,
            handlers=[
                logging.FileHandler(Config.LOG_FILE),
                logging.StreamHandler()
            ]
        )

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    TESTING = False
    
    # 开发环境特定设置
    LOG_LEVEL = 'DEBUG'
    CACHE_TYPE = 'null'  # 禁用缓存
    
    # 开发服务器配置
    USE_RELOADER = True
    USE_DEBUGGER = True
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # 开发环境特定初始化
        import logging
        logging.getLogger('werkzeug').setLevel(logging.INFO)

class TestingConfig(Config):
    """测试环境配置"""
    DEBUG = True
    TESTING = True
    
    # 测试环境特定设置
    WTF_CSRF_ENABLED = False
    CACHE_TYPE = 'null'
    
    # 测试数据库（如果需要）
    DATABASE_URI = 'sqlite:///:memory:'
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # 测试环境特定初始化
        import logging
        logging.disable(logging.CRITICAL)

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    TESTING = False
    
    # 生产环境特定设置
    LOG_LEVEL = 'WARNING'
    USE_RELOADER = False
    USE_DEBUGGER = False
    
    # 安全设置
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # 性能设置
    SEND_FILE_MAX_AGE_DEFAULT = timedelta(hours=12)
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # 生产环境特定初始化
        import logging
        from logging.handlers import RotatingFileHandler
        
        # 设置文件日志轮转
        file_handler = RotatingFileHandler(
            cls.LOG_FILE, maxBytes=10240000, backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(cls.LOG_FORMAT))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)

# 配置字典
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config(config_name=None):
    """获取配置类"""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')
    
    return config.get(config_name, config['default'])

# 应用参数默认值
DEFAULT_PARAMETERS = {
    'I_avg': {
        'value': 10.0,
        'min': 0.1,
        'max': 100.0,
        'step': 0.1,
        'unit': 'mW/cm²',
        'description': '平均入射光强度'
    },
    'V': {
        'value': 0.8,
        'min': 0.0,
        'max': 1.0,
        'step': 0.01,
        'unit': '',
        'description': '干涉条纹可见度'
    },
    'K': {
        'value': 2.0,
        'min': 0.1,
        'max': 10.0,
        'step': 0.1,
        'unit': 'μm⁻¹',
        'description': '空间频率'
    },
    't_exp': {
        'value': 5.0,
        'min': 0.1,
        'max': 60.0,
        'step': 0.1,
        'unit': 's',
        'description': '曝光时间'
    },
    'C': {
        'value': 0.02,
        'min': 0.001,
        'max': 1.0,
        'step': 0.001,
        'unit': 's⁻¹',
        'description': '光敏速率常数'
    }
}

# 参数预设
PARAMETER_PRESETS = {
    'default': {
        'name': '默认参数',
        'description': '标准的Dill模型参数',
        'parameters': {
            'I_avg': 10.0,
            'V': 0.8,
            'K': 2.0,
            't_exp': 5.0,
            'C': 0.02
        }
    },
    'high_contrast': {
        'name': '高对比度',
        'description': '适用于高对比度光刻的参数',
        'parameters': {
            'I_avg': 15.0,
            'V': 0.95,
            'K': 3.0,
            't_exp': 3.0,
            'C': 0.03
        }
    },
    'low_exposure': {
        'name': '低曝光',
        'description': '适用于低曝光条件的参数',
        'parameters': {
            'I_avg': 5.0,
            'V': 0.6,
            'K': 1.5,
            't_exp': 8.0,
            'C': 0.015
        }
    },
    'fine_features': {
        'name': '精细特征',
        'description': '适用于精细特征加工的参数',
        'parameters': {
            'I_avg': 12.0,
            'V': 0.85,
            'K': 4.0,
            't_exp': 4.0,
            'C': 0.025
        }
    }
} 