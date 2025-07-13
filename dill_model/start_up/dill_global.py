#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Dill模型计算工具 - 全局启动脚本

这个脚本可以从任何位置启动Dill模型计算工具
"""

import os
import sys
import subprocess
from pathlib import Path

def find_dill_project():
    """查找Dill项目目录"""
    # 首先尝试从环境变量获取
    dill_path = os.environ.get('DILL_MODEL_PATH')
    if dill_path and os.path.exists(dill_path):
        return dill_path
    
    # 尝试从脚本所在目录查找
    script_dir = Path(__file__).parent.absolute()
    if (script_dir / 'run.py').exists():
        return str(script_dir)
    
    # 尝试在常见位置查找
    possible_paths = [
        Path.home() / 'Desktop' / 'Dill Model' / 'dill_model',
        Path.home() / 'Documents' / 'Dill Model' / 'dill_model',
        Path.home() / 'dill_model',
        Path('/Applications/Dill Model/dill_model'),
        Path('/opt/dill_model'),
    ]
    
    for path in possible_paths:
        if path.exists() and (path / 'run.py').exists():
            return str(path)
    
    return None

def main():
    """主函数"""
    print("🚀 Dill模型计算工具 - 全局启动器")
    print("正在查找项目目录...")
    
    # 查找项目目录
    project_dir = find_dill_project()
    
    if not project_dir:
        print("❌ 错误: 无法找到Dill模型项目目录")
        print("\n请确保:")
        print("1. 项目已正确安装")
        print("2. 设置环境变量 DILL_MODEL_PATH 指向项目目录")
        print("3. 或将项目放在以下位置之一:")
        print("   - ~/Desktop/Dill Model/dill_model")
        print("   - ~/Documents/Dill Model/dill_model")
        print("   - ~/dill_model")
        return 1
    
    print(f"✅ 找到项目目录: {project_dir}")
    print("正在启动服务器...")
    print()
    
    # 切换到项目目录
    os.chdir(project_dir)
    
    # 启动应用
    try:
        subprocess.run([sys.executable, "run.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ 启动失败: {e}")
        return 1
    except KeyboardInterrupt:
        print("\n👋 应用已停止")
        return 0
    
    return 0

if __name__ == '__main__':
    sys.exit(main()) 