#!/bin/bash

# Dill模型计算工具 - 安装脚本
# 这个脚本会设置全局 'dill' 命令

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                Dill模型计算工具 - 安装脚本                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔍 检查安装环境..."

# 检查Python
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    echo "✅ 找到 Python: $PYTHON_VERSION"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    PYTHON_VERSION=$(python --version 2>&1 | cut -d' ' -f2)
    echo "✅ 找到 Python: $PYTHON_VERSION"
else
    echo "❌ 错误: 未找到 Python"
    echo "请安装 Python 3.8 或更高版本"
    exit 1
fi

# 检查pip
if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
    echo "❌ 错误: 未找到 pip"
    echo "请安装 pip"
    exit 1
fi

echo "✅ 环境检查通过"
echo ""

# 安装Python依赖
echo "📦 安装Python依赖..."
if command -v pip3 &> /dev/null; then
    pip3 install -r "$SCRIPT_DIR/requirements.txt"
else
    pip install -r "$SCRIPT_DIR/requirements.txt"
fi

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"
echo ""

# 设置执行权限
echo "🔧 设置脚本权限..."
chmod +x "$SCRIPT_DIR/dill"
chmod +x "$SCRIPT_DIR/dill_global.py"
chmod +x "$SCRIPT_DIR/start.sh"

# 创建符号链接
echo "🔗 创建全局命令链接..."

# 检查是否有写入权限
if [ -w "/usr/local/bin" ]; then
    ln -sf "$SCRIPT_DIR/dill" /usr/local/bin/dill
    echo "✅ 全局命令已安装到 /usr/local/bin/dill"
else
    echo "🔐 需要管理员权限来安装全局命令..."
    sudo ln -sf "$SCRIPT_DIR/dill" /usr/local/bin/dill
    if [ $? -eq 0 ]; then
        echo "✅ 全局命令已安装到 /usr/local/bin/dill"
    else
        echo "❌ 全局命令安装失败"
        echo "你仍然可以使用以下方式启动应用:"
        echo "  cd '$SCRIPT_DIR' && ./dill"
    fi
fi

# 设置环境变量（可选）
echo ""
echo "🌍 设置环境变量..."
SHELL_RC=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
fi

if [ -n "$SHELL_RC" ] && [ -f "$SHELL_RC" ]; then
    # 检查是否已经设置了环境变量
    if ! grep -q "DILL_MODEL_PATH" "$SHELL_RC"; then
        echo "" >> "$SHELL_RC"
        echo "# Dill模型计算工具" >> "$SHELL_RC"
        echo "export DILL_MODEL_PATH=\"$SCRIPT_DIR\"" >> "$SHELL_RC"
        echo "✅ 环境变量已添加到 $SHELL_RC"
        echo "💡 请运行 'source $SHELL_RC' 或重新打开终端"
    else
        echo "✅ 环境变量已存在"
    fi
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                      安装完成！                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Dill模型计算工具已成功安装！"
echo ""
echo "📱 使用方法:"
echo "   在任何位置的终端中输入: dill"
echo ""
echo "🔧 其他启动方式:"
echo "   1. 双击运行: start.py"
echo "   2. 命令行: python run.py"
echo "   3. Shell脚本: ./start.sh"
echo ""
echo "💡 提示:"
echo "   - 首次运行会自动安装依赖"
echo "   - 服务器启动后会自动打开浏览器"
echo "   - 按 Ctrl+C 可以停止服务器"
echo ""
echo "🚀 现在就试试输入 'dill' 来启动应用吧！" 