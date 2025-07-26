#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Dill模型计算工具启动脚本

这个脚本提供了一个简单的方式来启动Dill模型计算工具的Web服务器。
它会自动检测系统环境，配置必要的参数，并在默认浏览器中打开应用。

使用方法:
    python run.py [选项]

选项:
    --port PORT     指定服务器端口 (默认: 8080)
    --host HOST     指定服务器主机 (默认: 0.0.0.0)
    --debug         启用调试模式
    --no-browser    不自动打开浏览器
    --help          显示帮助信息

示例:
    python run.py                    # 使用默认设置启动
    python run.py --port 5000       # 在端口5000启动
    python run.py --debug           # 启用调试模式
    python run.py --no-browser      # 不自动打开浏览器
"""

import os
import sys
import time
import socket
import argparse
import threading
import webbrowser
import subprocess
from datetime import datetime
import requests

# 添加项目根目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

def check_and_activate_venv():
    """检查并激活虚拟环境"""
    venv_path = os.path.join(current_dir, 'venv')
    venv_python = os.path.join(venv_path, 'bin', 'python')
    
    # 检查是否已经在虚拟环境中
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("✅ 已经在虚拟环境中运行")
        return True
    
    # 检查虚拟环境是否存在且有效
    if os.path.exists(venv_python):
        print("🔄 检测到虚拟环境，正在切换...")
        try:
            # 重新启动脚本，使用虚拟环境中的Python
            import subprocess
            cmd = [venv_python] + sys.argv
            print(f"🚀 使用虚拟环境Python重新启动: {venv_python}")
            # 使用subprocess.run代替os.execv，避免可能的问题
            result = subprocess.run(cmd, cwd=current_dir)
            sys.exit(result.returncode)
        except Exception as e:
            print(f"⚠️  无法切换到虚拟环境: {e}")
            print(f"详细错误: {e}")
            return False
    
    print("⚠️  未检测到虚拟环境，使用当前Python环境")
    return False

# 检查并切换到虚拟环境
# 暂时跳过虚拟环境自动切换，避免卡住
# check_and_activate_venv()
print("⚠️  跳过虚拟环境自动切换，使用当前Python环境")

def install_missing_dependency(package_name, import_name=None):
    """安装缺失的依赖包"""
    if import_name is None:
        import_name = package_name
    
    print(f"🔧 检测到缺失依赖 {import_name}，正在自动安装 {package_name}...")
    try:
        # 尝试多种安装方式
        install_commands = [
            # 用户目录安装（推荐）
            [sys.executable, '-m', 'pip', 'install', '--user', package_name],
            # 如果用户目录失败，尝试系统包管理
            [sys.executable, '-m', 'pip', 'install', '--break-system-packages', package_name],
        ]
        
        for cmd in install_commands:
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                if result.returncode == 0:
                    install_method = "用户目录" if '--user' in cmd else "系统目录"
                    print(f"✅ {package_name} 已安装到{install_method}")
                    return True
            except Exception:
                continue
        
        print(f"❌ 无法自动安装 {package_name}")
        return False
        
    except Exception as e:
        print(f"❌ 安装 {package_name} 时出错: {e}")
        return False

# 预先检查并安装关键依赖
try:
    import flask_cors
except ImportError:
    if install_missing_dependency('flask-cors', 'flask_cors'):
        # 刷新模块搜索路径，让Python找到新安装的包
        import importlib
        import site
        importlib.reload(site)
        try:
            import flask_cors
            print("✅ flask_cors 模块已成功导入")
        except ImportError:
            print("⚠️  安装完成但仍无法导入，可能需要重启Python")
    else:
        print("\n🔧 手动解决方案:")
        print("1. 激活虚拟环境: source venv/bin/activate")
        print("2. 安装依赖: pip install -r requirements.txt")
        print("3. 或者运行: bash start.sh")
        sys.exit(1)

try:
    from backend.app import create_app
except ImportError as e:
    print(f"❌ 导入错误: {e}")
    print("请确保您在正确的目录中运行此脚本，并且已安装所有依赖。")
    print()
    print("🔧 解决方案:")
    print("1. 激活虚拟环境: source venv/bin/activate")
    print("2. 安装依赖: pip install -r requirements.txt")
    print("3. 或者运行: bash start.sh")
    sys.exit(1)

def get_git_version():
    """获取Git版本信息"""
    try:
        # 尝试获取当前提交的标签或提交信息
        result = subprocess.run(
            ['git', 'log', '--oneline', '-1'],
            capture_output=True,
            text=True,
            cwd=current_dir
        )
        
        if result.returncode == 0:
            commit_info = result.stdout.strip()
            # 提取版本信息，格式如: "ce8342a V 2.0"
            if 'V ' in commit_info:
                version = commit_info.split('V ')[1].split()[0]
                return f"v{version}"
            else:
                # 如果没有版本标签，返回提交hash的前7位
                commit_hash = commit_info.split()[0][:7]
                return f"git-{commit_hash}"
        else:
            return "v1.3.0"  # 默认版本
    except Exception:
        return "v1.3.0"  # 默认版本

def print_banner():
    """打印启动横幅"""
    version = get_git_version()
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                    Dill模型计算工具                            ║
║                   版本: {version}                               ║
║                   启动时间: {time}                            ║
╚══════════════════════════════════════════════════════════════╝
    """.format(
        version=version,
        time=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )
    print(banner)

def check_dependencies():
    """检查必要的依赖包，并自动安装缺失的依赖"""
    required_packages = [
        'flask', 'flask_cors', 'numpy', 'matplotlib', 'requests'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            if package == 'flask_cors':
                # flask_cors包安装后的实际模块名是flask_cors
                import flask_cors
            else:
                __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    # 单独检查Pillow/PIL
    try:
        from PIL import Image
    except ImportError:
        missing_packages.append('pillow')
    
    if missing_packages:
        print(f"⚠️  检测到缺少依赖包: {', '.join(missing_packages)}")
        print("🔧 正在自动安装缺失的依赖...")
        
        try:
            # 尝试使用当前Python环境的pip安装依赖
            for package in missing_packages:
                pip_package = 'flask-cors' if package == 'flask_cors' else package
                print(f"   📦 安装 {pip_package}...")
                result = subprocess.run([
                    sys.executable, '-m', 'pip', 'install', pip_package
                ], capture_output=True, text=True, timeout=60)
                
                if result.returncode != 0:
                    print(f"   ❌ 安装 {pip_package} 失败: {result.stderr}")
                    print("\n🔧 请手动安装依赖:")
                    print("pip install -r requirements.txt")
                    return False
                else:
                    print(f"   ✅ {pip_package} 安装成功")
            
            print("✅ 所有缺失依赖已自动安装完成")
            print("🔄 正在重新检查依赖...")
            
            # 重新检查依赖
            return check_dependencies()
            
        except Exception as e:
            print(f"❌ 自动安装依赖时出错: {e}")
            print("\n🔧 请手动安装依赖:")
            print("pip install -r requirements.txt")
            return False
    
    print("✅ 所有依赖包检查通过")
    return True

def get_local_ip():
    """获取本机IP地址"""
    try:
        # 尝试连接到外部地址以获取本机IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
        return ip
    except Exception:
        try:
            # 备用方法：获取主机名对应的IP
            hostname = socket.gethostname()
            ip = socket.gethostbyname(hostname)
            if ip.startswith("127."):
                return "127.0.0.1"
            return ip
        except Exception:
            return "127.0.0.1"

def check_port_available(host, port):
    """检查端口是否可用"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind((host, port))
        return True
    except OSError:
        return False

def find_available_port(host, start_port, max_attempts=10):
    """查找可用端口"""
    for i in range(max_attempts):
        port = start_port + i
        if check_port_available(host, port):
            return port
    return None

def wait_for_server(url, max_attempts=30, delay=0.5):
    """等待服务器启动"""
    print(f"🔍 等待服务器启动...")
    for i in range(max_attempts):
        try:
            response = requests.get(url, timeout=2)
            if response.status_code == 200:
                print(f"✅ 服务器已就绪！")
                return True
        except requests.exceptions.RequestException:
            pass
        
        if i < max_attempts - 1:
            time.sleep(delay)
            if (i + 1) % 5 == 0:
                print(f"   仍在等待服务器启动... ({i + 1}/{max_attempts})")
    
    print(f"⚠️  服务器启动超时，但仍会尝试打开浏览器")
    return False

def open_browser_when_ready(url, max_wait_time=15):
    """等待服务器就绪后打开浏览器"""
    def _open():
        # 等待服务器启动
        server_ready = wait_for_server(url, max_attempts=int(max_wait_time * 2))
        
        print(f"🌐 正在打开浏览器访问: {url}")
        try:
            # 优先尝试用谷歌浏览器打开
            try:
                chrome = webbrowser.get('chrome')
                success = chrome.open(url)
                if success:
                    print(f"✅ 已用谷歌浏览器打开")
                else:
                    print(f"⚠️  谷歌浏览器未能打开，尝试用系统默认浏览器...")
                    fallback = webbrowser.open(url)
                    if fallback:
                        print(f"✅ 已用系统默认浏览器打开")
                    else:
                        print(f"⚠️  无法自动打开浏览器，请手动访问: {url}")
            except webbrowser.Error:
                # 没有chrome时用默认
                fallback = webbrowser.open(url)
                if fallback:
                    print(f"✅ 已用系统默认浏览器打开")
                else:
                    print(f"⚠️  无法自动打开浏览器，请手动访问: {url}")
        except Exception as e:
            print(f"⚠️  打开浏览器时出错: {e}")
            print(f"请手动在浏览器中访问: {url}")
        
        # 显示访问提示
        print("\n" + "="*60)
        print("🎉 应用已启动！")
        print(f"📱 请在浏览器中访问: {url}")
        print("💡 提示: 按 Ctrl+C 可以停止服务器")
        print("="*60)
    
    thread = threading.Thread(target=_open, daemon=True)
    thread.start()
    return thread

def setup_environment(verbose_logs=False):
    """设置运行环境
    
    配置应用环境变量，设置工作目录，并配置日志系统。
    
    可以通过以下方式控制日志显示：
    1. 命令行参数: --verbose-logs 或 -v
    2. 环境变量: DILL_ENABLE_LOG_FILTER
      - 设置为'false'可显示所有API请求日志（默认为'true'，即启用过滤）
      - 例如: DILL_ENABLE_LOG_FILTER=false python run.py
    
    Args:
        verbose_logs (bool): 是否显示详细日志（来自命令行参数）
    """
    # 设置工作目录
    os.chdir(current_dir)
    
    # 设置环境变量
    os.environ.setdefault('FLASK_ENV', 'production')
    os.environ.setdefault('PYTHONPATH', current_dir)
    
    # 配置Werkzeug日志记录器，过滤频繁的API日志请求
    import logging
    werkzeug_logger = logging.getLogger('werkzeug')
    
    # 检查是否应该启用日志过滤
    # 优先级：命令行参数 > 环境变量 > 默认值
    if verbose_logs:
        enable_log_filter = False  # 命令行要求显示详细日志
    else:
        enable_log_filter = os.environ.get('DILL_ENABLE_LOG_FILTER', 'true').lower() != 'false'
    
    class LogFilter(logging.Filter):
        """过滤器：过滤掉特定的API请求日志和静态资源请求日志
        
        这个过滤器用于减少以下类型的重复日志消息：
        1. 前端轮询/api/logs接口产生的大量重复日志消息
        2. 静态资源文件请求（CSS、JS、图片等）
        3. favicon.ico 请求
        
        通过这个过滤器，我们只保留重要的API调用和错误日志，
        而过滤掉这些频繁但不重要的请求日志。
        
        注意：这不会影响API的功能，只是减少了控制台输出的日志数量。
        """
        def filter(self, record):
            message = record.getMessage()
            
            # 过滤成功的静态资源请求（CSS、JS、图片等）
            static_extensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.avif']
            for ext in static_extensions:
                if f'GET /{ext.lstrip(".")}' in message or f'{ext}' in message:
                    if '" 200 -' in message or '" 304 -' in message:  # 成功或未修改
                        return False
            
            # 过滤favicon.ico请求
            if 'favicon.ico' in message and ('" 200 -' in message or '" 304 -' in message):
                return False
            
            # 过滤成功的GET /api/logs请求
            if '"GET /api/logs' in message and '" 200 -' in message:
                return False
            
            # 过滤成功的根路径请求（首页访问）
            if '"GET / HTTP' in message and '" 200 -' in message:
                return False
                
            # 保留所有其他日志，包括：
            # - 错误状态的请求
            # - API计算请求
            # - 警告和错误日志
            # - 应用启动日志等
            return True
    
    # 根据配置添加过滤器
    if enable_log_filter:
        werkzeug_logger.addFilter(LogFilter())
        print("✅ 日志过滤器已启用，隐藏静态资源和轮询请求日志")
        print("   💡 如需查看所有日志，请设置环境变量: DILL_ENABLE_LOG_FILTER=false")
        logging.info("日志过滤器已启用，过滤静态资源和轮询请求日志")
    else:
        print("ℹ️ 日志过滤器未启用，显示所有请求日志")
        print("   💡 如需隐藏频繁日志，请设置环境变量: DILL_ENABLE_LOG_FILTER=true")

def print_server_info(host, port, debug_mode):
    """打印服务器信息"""
    local_ip = get_local_ip()
    
    print("🚀 服务器启动信息:")
    print(f"   主机地址: {host}")
    print(f"   端口号: {port}")
    print(f"   调试模式: {'开启' if debug_mode else '关闭'}")
    print(f"   本机IP: {local_ip}")
    print()
    print("📱 访问地址:")
    print(f"   本地访问: http://127.0.0.1:{port}")
    if local_ip != "127.0.0.1":
        print(f"   网络访问: http://{local_ip}:{port}")
    print()
    print("💡 提示:")
    print("   - 服务器启动后会自动打开浏览器")
    print("   - 按 Ctrl+C 停止服务器")
    if not debug_mode:
        print("   - 使用 --debug 参数启用调试模式")
    print("=" * 60)

def parse_arguments():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(
        description="Dill模型计算工具启动脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python run.py                    # 使用默认设置启动
  python run.py --port 5000       # 在端口5000启动
  python run.py --debug           # 启用调试模式
  python run.py --no-browser      # 不自动打开浏览器
  python run.py --verbose-logs    # 显示所有请求日志
        """
    )
    
    parser.add_argument(
        '--port', '-p',
        type=int,
        default=8080,
        help='服务器端口号 (默认: 8080)'
    )
    
    parser.add_argument(
        '--host',
        default='0.0.0.0',
        help='服务器主机地址 (默认: 0.0.0.0)'
    )
    
    parser.add_argument(
        '--debug', '-d',
        action='store_true',
        help='启用调试模式'
    )
    
    parser.add_argument(
        '--no-browser', '-n',
        action='store_true',
        help='不自动打开浏览器'
    )
    
    parser.add_argument(
        '--verbose-logs', '-v',
        action='store_true',
        help='显示所有请求日志（包括静态资源）'
    )
    
    return parser.parse_args()

def main():
    """主函数"""
    # 解析命令行参数
    args = parse_arguments()
    
    # 打印启动横幅
    print_banner()
    
    # 检查依赖
    if not check_dependencies():
        sys.exit(1)
    
    # 设置环境（确保在创建应用之前设置）
    setup_environment(verbose_logs=args.verbose_logs)
    
    # 检查端口可用性
    if not check_port_available(args.host, args.port):
        print(f"⚠️  端口 {args.port} 已被占用，正在寻找可用端口...")
        available_port = find_available_port(args.host, args.port)
        if available_port:
            args.port = available_port
            print(f"✅ 找到可用端口: {args.port}")
        else:
            print("❌ 无法找到可用端口，请手动指定其他端口")
            sys.exit(1)
    
    try:
        # 创建Flask应用
        print("🔧 正在创建应用实例...")
        app = create_app()
        
        # 打印服务器信息
        print_server_info(args.host, args.port, args.debug)
        
        # 准备浏览器URL
        local_ip = get_local_ip()
        # 优先使用localhost，因为更可靠
        browser_url = f"http://127.0.0.1:{args.port}"
        
        # 启动浏览器打开线程（如果需要）
        browser_thread = None
        if not args.no_browser:
            print("🌐 准备在服务器启动后自动打开浏览器...")
            browser_thread = open_browser_when_ready(browser_url)
        
        # 启动服务器
        print("🎯 服务器正在启动...")
        print("   请稍等，服务器启动完成后会自动打开浏览器...")
        print()
        
        app.run(
            debug=args.debug,
            host=args.host,
            port=args.port,
            threaded=True,
            use_reloader=False  # 避免重复启动
        )
        
    except KeyboardInterrupt:
        print("\n👋 服务器已停止")
        print("感谢使用 Dill模型计算工具！")
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        if args.debug:
            import traceback
            traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main() 