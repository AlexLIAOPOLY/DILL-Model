#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
打开光刻胶模型矩阵可视化页面
"""

import os
import sys
import webbrowser
import subprocess
import time
from pathlib import Path

def get_project_root():
    """获取项目根目录"""
    script_path = Path(os.path.abspath(__file__))
    return script_path.parent

def ensure_server_running():
    """确保后端服务器正在运行"""
    pid_file = get_project_root() / "dill_server.pid"
    
    if pid_file.exists():
        # 检查PID是否存活
        with open(pid_file, 'r') as f:
            pid = f.read().strip()
            try:
                pid = int(pid)
                # 在Unix/Linux/Mac上检查进程
                if sys.platform != "win32":
                    # 如果进程存在，os.kill(pid, 0)不会有异常
                    try:
                        os.kill(pid, 0)
                        print("后端服务器已经在运行")
                        return True
                    except OSError:
                        print("后端服务器PID文件存在，但进程已终止")
                else:
                    # Windows系统下的检查方法
                    import ctypes
                    kernel32 = ctypes.windll.kernel32
                    SYNCHRONIZE = 0x100000
                    process = kernel32.OpenProcess(SYNCHRONIZE, 0, pid)
                    if process != 0:
                        kernel32.CloseHandle(process)
                        print("后端服务器已经在运行")
                        return True
                    else:
                        print("后端服务器PID文件存在，但进程已终止")
            except ValueError:
                print("PID文件格式错误")
    
    # 启动后端服务器
    print("正在启动后端服务器...")
    if sys.platform == "win32":
        # Windows上使用start命令在后台运行
        subprocess.Popen('start python run.py', shell=True, cwd=get_project_root())
    else:
        # Unix/Linux/Mac上使用nohup在后台运行
        subprocess.Popen('nohup python run.py &', shell=True, cwd=get_project_root())
    
    # 等待服务器启动
    print("等待服务器启动...")
    time.sleep(3)
    return True

def open_matrix_visualization():
    """打开矩阵可视化页面"""
    # 确保服务器在运行
    ensure_server_running()
    
    # 构建文件URL
    project_root = get_project_root()
    file_path = project_root / "matrix_visualization" / "index.html"
    file_url = f"file://{file_path.absolute()}"
    
    # 打开浏览器
    print(f"正在打开矩阵可视化页面: {file_url}")
    webbrowser.open(file_url)

if __name__ == "__main__":
    try:
        open_matrix_visualization()
        print("成功打开矩阵可视化页面")
    except Exception as e:
        print(f"打开矩阵可视化页面时出错: {e}")
        input("按任意键退出...")
        sys.exit(1) 