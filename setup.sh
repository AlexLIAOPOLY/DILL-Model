#!/bin/bash

set -e

echo "==================================================================="
echo "Anthropic API 环境变量配置脚本"
echo "注意：本脚本需要在bash环境中运行"
echo "Windows用户请在git bash终端环境下使用"
echo "Mac/Linux用户可直接在终端中运行"
echo "==================================================================="

# 1. 检查终端环境
echo "正在检查运行环境..."

# 检查是否为bash环境
if [ -z "$BASH_VERSION" ]; then
    echo "❌ 错误: 当前不是bash环境"
    echo "请在bash终端中运行此脚本："
    echo "  - Windows: 使用 Git Bash 或 WSL"
    echo "  - Mac/Linux: 使用系统终端"
    exit 1
fi

# 检测操作系统
OS_TYPE="unknown"
case "$(uname -s)" in
    Linux*)     OS_TYPE="Linux";;
    Darwin*)    OS_TYPE="Mac";;
    CYGWIN*|MINGW*|MSYS*) OS_TYPE="Windows";;
    *)          OS_TYPE="unknown";;
esac

echo "✓ 检测到操作系统: $OS_TYPE"
echo "✓ bash环境检查通过 (版本: $BASH_VERSION)"

# Node.js 安装函数
install_nodejs() {
    local platform=$(uname -s)
    
    case "$platform" in
        Linux|Darwin)
            echo "🚀 正在安装 Node.js..."
            
            echo "📥 下载并安装 nvm..."
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
            
            echo "🔄 加载 nvm 环境..."
            \. "$HOME/.nvm/nvm.sh"
            
            echo "📦 下载并安装 Node.js v22..."
            nvm install 22
            
            echo -n "✅ Node.js 安装完成！版本: "
            node -v
            echo -n "✅ npm 版本: "
            npm -v
            ;;
        *)
            echo "❌ 不支持的平台: $platform"
            echo "请手动安装 Node.js: https://nodejs.org/"
            exit 1
            ;;
    esac
}

# 检查 Node.js 环境
echo "检查 Node.js 环境..."
if command -v node >/dev/null 2>&1; then
    current_version=$(node -v | sed 's/v//')
    major_version=$(echo $current_version | cut -d. -f1)
    
    if [ "$major_version" -ge 18 ]; then
        echo "✓ Node.js 已安装: v$current_version"
    else
        echo "⚠️  Node.js v$current_version 版本过低 (需要 >= 18)，正在升级..."
        install_nodejs
    fi
else
    echo "📦 Node.js 未安装，正在安装..."
    install_nodejs
fi

# 检查 npm 环境
if command -v npm >/dev/null 2>&1; then
    echo "✓ npm 已安装: $(npm -v)"
else
    echo "❌ npm 未找到，Node.js 安装可能有问题"
    exit 1
fi

# 2. 确定环境变量配置文件
echo "正在确定环境变量配置文件..."

CONFIG_FILE=""

# 检测当前shell类型并确定配置文件
current_shell=$(basename "$SHELL")
case "$current_shell" in
    bash)
        if [ "$OS_TYPE" = "Mac" ]; then
            # Mac系统优先使用 .bash_profile
            CONFIG_FILE="$HOME/.bash_profile"
            echo "检测到bash环境，Mac系统使用 ~/.bash_profile"
        else
            # Linux/Windows(Git Bash) 使用 .bashrc
            CONFIG_FILE="$HOME/.bashrc"
            echo "检测到bash环境，使用 ~/.bashrc"
        fi
        ;;
    zsh)
        CONFIG_FILE="$HOME/.zshrc"
        echo "检测到zsh环境，使用 ~/.zshrc"
        
        # 检查是否使用Oh My Zsh，避免冲突
        if [ -n "$ZSH" ] && [ -d "$ZSH" ]; then
            echo "⚠️  检测到Oh My Zsh环境，将在配置文件末尾添加变量"
            echo "   这样可以避免Oh My Zsh加载时的冲突"
        fi
        ;;
    fish)
        CONFIG_FILE="$HOME/.config/fish/config.fish"
        echo "检测到fish shell，使用 ~/.config/fish/config.fish"
        
        # 创建fish配置目录（如果不存在）
        if [ ! -d "$HOME/.config/fish" ]; then
            mkdir -p "$HOME/.config/fish"
            echo "创建fish配置目录: ~/.config/fish/"
        fi
        ;;
    *)
        CONFIG_FILE="$HOME/.profile"
        echo "检测到其他shell ($current_shell)，使用通用配置文件 ~/.profile"
        ;;
esac

# 创建配置文件（如果不存在）
if [ ! -f "$CONFIG_FILE" ]; then
    touch "$CONFIG_FILE"
    echo "创建新的配置文件: ${CONFIG_FILE/#$HOME/~}"
fi


echo "✓ 环境变量配置文件: ${CONFIG_FILE/#$HOME/~}"

# 3. 检查现有配置（支持不同shell语法）
echo "检查现有Anthropic配置..."
EXISTING_CONFIG=false

if [ -f "$CONFIG_FILE" ]; then
    # 根据shell类型检查不同的语法
    if [[ "$current_shell" == "fish" ]]; then
        # fish shell 语法: set -x ANTHROPIC_AUTH_TOKEN
        if grep -q "set -x ANTHROPIC_AUTH_TOKEN\|set -x ANTHROPIC_BASE_URL" "$CONFIG_FILE" 2>/dev/null; then
            EXISTING_CONFIG=true
        fi
    else
        # bash/zsh 语法: export ANTHROPIC_AUTH_TOKEN
        if grep -q "ANTHROPIC_AUTH_TOKEN\|ANTHROPIC_BASE_URL" "$CONFIG_FILE" 2>/dev/null; then
            EXISTING_CONFIG=true
        fi
    fi
    
    if [ "$EXISTING_CONFIG" = true ]; then
        echo "⚠️  检测到已存在Anthropic相关配置："
        if [[ "$current_shell" == "fish" ]]; then
            grep -n "set -x ANTHROPIC_" "$CONFIG_FILE" || true
        else
            grep -n "ANTHROPIC_" "$CONFIG_FILE" || true
        fi
        echo ""
        read -p "是否要覆盖现有配置？(y/N): " overwrite
        if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
            echo "操作已取消"
            exit 0
        fi
        
        # 备份原配置
        backup_file="${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$CONFIG_FILE" "$backup_file"
        echo "✓ 已备份原配置到: ${backup_file/#$HOME/~}"
    fi
fi

# 颜色定义
colorReset='\033[0m'
colorBright='\033[1m'
colorCyan='\033[36m'
colorYellow='\033[33m'
colorMagenta='\033[35m'
colorRed='\033[31m'
colorBlue='\033[34m'
colorWhite='\033[37m'
colorGreen='\033[32m'

# 显示API密钥获取横幅
show_api_banner() {
    printf "${colorBright}${colorRed}   █████╗ ██╗  ${colorBlue}██████╗ ██████╗ ██████╗ ███████╗${colorMagenta} ██╗    ██╗██╗████████╗██╗  ██╗${colorReset}\n"
    printf "${colorBright}${colorRed}  ██╔══██╗██║ ${colorBlue}██╔════╝██╔═══██╗██╔══██╗██╔════╝${colorMagenta} ██║    ██║██║╚══██╔══╝██║  ██║${colorReset}\n"
    printf "${colorBright}${colorRed}  ███████║██║ ${colorBlue}██║     ██║   ██║██║  ██║█████╗  ${colorMagenta} ██║ █╗ ██║██║   ██║   ███████║${colorReset}\n"
    printf "${colorBright}${colorRed}  ██╔══██║██║ ${colorBlue}██║     ██║   ██║██║  ██║██╔══╝  ${colorMagenta} ██║███╗██║██║   ██║   ██╔══██║${colorReset}\n"
    printf "${colorBright}${colorRed}  ██║  ██║██║ ${colorBlue}╚██████╗╚██████╔╝██████╔╝███████╗${colorMagenta} ╚███╔███╔╝██║   ██║██╗██║  ██║${colorReset}\n"
    printf "${colorBright}${colorRed}  ╚═╝  ╚═╝╚═╝ ${colorBlue} ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝${colorMagenta}  ╚══╝╚══╝ ╚═╝   ╚═╝╚═╝╚═╝  ╚═╝${colorReset}\n"
    printf "\n"
    printf "${colorBright}${colorYellow}🌐 请从以下网址获取您的API密钥：${colorReset}\n"
    printf "${colorBright}${colorCyan}📋 https://aicodewith.com/dashboard/api-keys${colorReset}\n"
    printf "\n"
    printf "${colorBright}${colorGreen}📝 API密钥格式: sk-acw-********-****************${colorReset}\n"
    printf "\n"
}

# 4. 获取API密钥
echo ""
show_api_banner

# 输入API密钥并验证
while true; do
    read -p "请输入ANTHROPIC_AUTH_TOKEN: " auth_token
    echo ""
    
    # 基本格式验证
    if [[ "$auth_token" =~ ^sk-acw-.{8}-.{16}$ ]]; then
        echo "✓ API密钥格式验证通过"
        break
    else
        echo "❌ API密钥格式不正确"
        echo "   正确格式: sk-acw-********-****************"
        echo "   请重新输入"
    fi
done

# 5. 更新配置文件
echo "正在更新配置文件..."

# 移除旧的Anthropic配置（支持不同shell语法）
if [ "$EXISTING_CONFIG" = true ]; then
    # 创建临时文件，移除旧配置
    temp_file=$(mktemp)
    if [[ "$current_shell" == "fish" ]]; then
        # 移除fish语法的配置行
        grep -v "set -x ANTHROPIC_AUTH_TOKEN\|set -x ANTHROPIC_BASE_URL" "$CONFIG_FILE" > "$temp_file"
    else
        # 移除bash/zsh语法的配置行
        grep -v "ANTHROPIC_AUTH_TOKEN\|ANTHROPIC_BASE_URL" "$CONFIG_FILE" > "$temp_file"
    fi
    mv "$temp_file" "$CONFIG_FILE"
fi

# 添加新配置（根据shell类型使用不同语法）
if [[ "$current_shell" == "fish" ]]; then
    # fish shell 语法
    {
        echo ""
        echo "# Anthropic API Configuration - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "set -x ANTHROPIC_AUTH_TOKEN $auth_token"
        echo "set -x ANTHROPIC_BASE_URL https://stream.aicodewith.com/"
    } >> "$CONFIG_FILE"
else
    # bash/zsh 语法
    {
        echo ""
        echo "# Anthropic API Configuration - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "export ANTHROPIC_AUTH_TOKEN=$auth_token"
        echo "export ANTHROPIC_BASE_URL=https://stream.aicodewith.com/"
    } >> "$CONFIG_FILE"
fi

echo "✓ 配置已写入 ${CONFIG_FILE/#$HOME/~}"

# 6. 加载环境变量
echo "正在加载环境变量..."
# 不要source整个配置文件，因为可能包含不兼容的shell语法
# 只设置我们需要的环境变量
if [[ "$current_shell" == "fish" ]]; then
    # fish shell 不兼容bash，跳过source
    echo "⚠️  Fish shell配置文件不兼容bash，跳过自动加载"
else
    # 只提取和设置Anthropic相关的环境变量，避免其他不兼容的语法
    eval "$(grep "^export ANTHROPIC_" "$CONFIG_FILE" 2>/dev/null || true)"
fi

# 方案1: 添加短暂延迟确保环境变量生效
sleep 1

# 方案2: 直接从配置文件读取验证（支持不同shell语法）
echo "正在验证配置文件内容..."
verification_passed=false

if [[ "$current_shell" == "fish" ]]; then
    # fish shell 验证
    if grep -q "set -x ANTHROPIC_AUTH_TOKEN $auth_token" "$CONFIG_FILE" && grep -q "set -x ANTHROPIC_BASE_URL" "$CONFIG_FILE"; then
        verification_passed=true
    fi
else
    # bash/zsh 验证
    if grep -q "ANTHROPIC_AUTH_TOKEN=$auth_token" "$CONFIG_FILE" && grep -q "ANTHROPIC_BASE_URL=" "$CONFIG_FILE"; then
        verification_passed=true
    fi
fi

if [ "$verification_passed" = true ]; then
    echo "✓ 配置文件验证通过"
    
    # 验证环境变量是否已加载
    if [ -n "$ANTHROPIC_AUTH_TOKEN" ] && [ -n "$ANTHROPIC_BASE_URL" ]; then
        echo "✓ 环境变量加载成功"
    else
        echo "⚠️  环境变量尚未在当前会话中生效，但配置文件已正确写入"
        echo "   新开的终端会话将自动加载这些环境变量"
        # 手动设置环境变量用于当前会话
        export ANTHROPIC_AUTH_TOKEN=$auth_token
        export ANTHROPIC_BASE_URL=https://stream.aicodewith.com/
    fi
    echo "✅ 环境变量配置成功！"
    echo ""
    echo "📊 当前配置:"
    echo "   ANTHROPIC_BASE_URL: $ANTHROPIC_BASE_URL"
    echo "   ANTHROPIC_AUTH_TOKEN: ${ANTHROPIC_AUTH_TOKEN:0:12}...(已隐藏)"
    echo ""
    echo "🎉 配置完成！"
    echo ""
    
    # 7. 检查并安装/更新Claude Code客户端
    echo "🔍 检查Claude Code客户端..."
    if command -v claude >/dev/null 2>&1; then
        echo "✓ Claude Code已安装: $(claude --version)"
        echo ""
        echo "🚀 是否要更新Claude Code客户端到最新版本？"
        read -p "这将执行: npm uninstall/install -g @anthropic-ai/claude-code (y/N): " update_claude
        
        if [[ "$update_claude" =~ ^[Yy]$ ]]; then
            echo "🔄 正在更新Claude Code客户端..."
            
            echo "步骤1: 卸载旧版本..."
            npm uninstall -g @anthropic-ai/claude-code
            
            echo "步骤2: 安装最新版本..."
            if npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com; then
                echo "✅ Claude Code客户端更新成功！"
            else
                echo "❌ Claude Code客户端安装失败，请手动执行："
                echo "   npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com"
            fi
        fi
    else
        echo "📦 Claude Code未安装，正在安装..."
        if npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com; then
            echo "✅ Claude Code客户端安装成功！"
        else
            echo "❌ Claude Code客户端安装失败，请手动执行："
            echo "   npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com"
            exit 1
        fi
    fi
    
    # 8. 配置Claude Code跳过引导
    echo ""
    echo "🔧 配置Claude Code跳过引导..."
    node --eval "
        const fs = require('fs');
        const os = require('os');
        const path = require('path');
        
        const homeDir = os.homedir(); 
        const filePath = path.join(homeDir, '.claude.json');
        
        try {
            if (fs.existsSync(filePath)) {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                fs.writeFileSync(filePath, JSON.stringify({ ...content, hasCompletedOnboarding: true }, null, 2), 'utf-8');
                console.log('✅ 已更新现有Claude配置文件');
            } else {
                fs.writeFileSync(filePath, JSON.stringify({ hasCompletedOnboarding: true }, null, 2), 'utf-8');
                console.log('✅ 已创建Claude配置文件并跳过引导');
            }
        } catch (error) {
            console.log('⚠️  配置Claude引导跳过时出错:', error.message);
        }
    "
    echo ""
    
    # 9. 检测并清理Claude配置文件中的代理设置
    echo ""
    echo "🔍 检测Claude配置文件中的代理设置..."
    # Claude配置文件可能的路径（优先检查settings.json）
    CLAUDE_SETTING_FILE=""
    if [ -f "$HOME/.claude/settings.json" ]; then
        CLAUDE_SETTING_FILE="$HOME/.claude/settings.json"
    elif [ -f "$HOME/.claude/settings.local.json" ]; then
        CLAUDE_SETTING_FILE="$HOME/.claude/settings.local.json"
    elif [ -f "$HOME/.claude/setting.json" ]; then
        CLAUDE_SETTING_FILE="$HOME/.claude/setting.json"
    fi
    
    if [ -n "$CLAUDE_SETTING_FILE" ]; then
        echo "✓ 找到Claude配置文件: ${CLAUDE_SETTING_FILE/#$HOME/~}"
        
        # 检测是否存在代理设置
        PROXY_FOUND=false
        PROXY_SETTINGS=""
        
        # 检查是否有HTTP代理设置（不区分大小写）
        if grep -iq "http_proxy\|https_proxy\|httpproxy\|httpsproxy" "$CLAUDE_SETTING_FILE" 2>/dev/null; then
            PROXY_FOUND=true
            echo ""
            echo "⚠️  检测到残留的代理配置："
            PROXY_SETTINGS=$(grep -in "http_proxy\|https_proxy\|httpproxy\|httpsproxy" "$CLAUDE_SETTING_FILE" | sed 's/^/   /')
            echo "$PROXY_SETTINGS"
            echo ""
            echo "📝 这些代理设置可能会影响Claude Code的正常使用"
            echo "   建议删除这些设置以避免连接问题"
            echo ""
            
            read -p "是否要删除这些代理设置？(y/N): " remove_proxy
            if [[ "$remove_proxy" =~ ^[Yy]$ ]]; then
                # 备份原配置文件
                backup_claude_file="${CLAUDE_SETTING_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
                cp "$CLAUDE_SETTING_FILE" "$backup_claude_file"
                echo "✓ 已备份Claude配置到: ${backup_claude_file/#$HOME/~}"
                
                # 删除代理设置行（不区分大小写）
                # 使用sed删除包含代理相关设置的行
                if [[ "$OS_TYPE" = "Mac" ]]; then
                    # Mac版本的sed需要备份文件参数
                    sed -i '' '/[Hh][Tt][Tt][Pp]_[Pp][Rr][Oo][Xx][Yy]\|[Hh][Tt][Tt][Pp][Ss]_[Pp][Rr][Oo][Xx][Yy]\|[Hh][Tt][Tt][Pp][Pp][Rr][Oo][Xx][Yy]\|[Hh][Tt][Tt][Pp][Ss][Pp][Rr][Oo][Xx][Yy]/d' "$CLAUDE_SETTING_FILE"
                else
                    # Linux/Windows版本的sed
                    sed -i '/[Hh][Tt][Tt][Pp]_[Pp][Rr][Oo][Xx][Yy]\|[Hh][Tt][Tt][Pp][Ss]_[Pp][Rr][Oo][Xx][Yy]\|[Hh][Tt][Tt][Pp][Pp][Rr][Oo][Xx][Yy]\|[Hh][Tt][Tt][Pp][Ss][Pp][Rr][Oo][Xx][Yy]/d' "$CLAUDE_SETTING_FILE"
                fi
                
                # 验证删除结果（不区分大小写）
                if ! grep -iq "http_proxy\|https_proxy\|httpproxy\|httpsproxy" "$CLAUDE_SETTING_FILE" 2>/dev/null; then
                    echo "✅ 代理设置已成功删除"
                    echo "📋 Claude Code现在应该能正常使用默认网络连接"
                else
                    echo "❌ 代理设置删除失败"
                    echo "   请手动编辑文件: $CLAUDE_SETTING_FILE"
                    echo "   或恢复备份: cp $backup_claude_file $CLAUDE_SETTING_FILE"
                fi
            else
                echo "跳过代理设置清理"
            fi
        else
            echo "✓ 未发现代理设置，配置文件正常"
        fi
    else
        echo "ℹ️  未找到Claude配置文件（${CLAUDE_SETTING_FILE/#$HOME/~}）"
        echo "   这是正常的，配置文件会在首次使用Claude Code时自动创建"
    fi
    echo ""
    
# 显示配置完成横幅
show_complete_banner() {
    printf "\n"
    printf "${colorBright}${colorRed}   █████╗ ██╗  ${colorBlue}██████╗ ██████╗ ██████╗ ███████╗${colorMagenta} ██╗    ██╗██╗████████╗██╗  ██╗${colorReset}\n"
    printf "${colorBright}${colorRed}  ██╔══██╗██║ ${colorBlue}██╔════╝██╔═══██╗██╔══██╗██╔════╝${colorMagenta} ██║    ██║██║╚══██╔══╝██║  ██║${colorReset}\n"
    printf "${colorBright}${colorRed}  ███████║██║ ${colorBlue}██║     ██║   ██║██║  ██║█████╗  ${colorMagenta} ██║ █╗ ██║██║   ██║   ███████║${colorReset}\n"
    printf "${colorBright}${colorRed}  ██╔══██║██║ ${colorBlue}██║     ██║   ██║██║  ██║██╔══╝  ${colorMagenta} ██║███╗██║██║   ██║   ██╔══██║${colorReset}\n"
    printf "${colorBright}${colorRed}  ██║  ██║██║ ${colorBlue}╚██████╗╚██████╔╝██████╔╝███████╗${colorMagenta} ╚███╔███╔╝██║   ██║██╗██║  ██║${colorReset}\n"
    printf "${colorBright}${colorRed}  ╚═╝  ╚═╝╚═╝ ${colorBlue} ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝${colorMagenta}  ╚══╝╚══╝ ╚═╝   ╚═╝╚═╝╚═╝  ╚═╝${colorReset}\n"
    printf "\n"
    printf "${colorBright}${colorYellow}📌 请执行以下命令使配置立即生效：${colorReset}\n"
    printf "${colorBright}${colorCyan}   source ${CONFIG_FILE/#$HOME/~}${colorReset}\n"
    printf "\n"
    printf "${colorBright}${colorGreen}🔄 或者重启终端让配置自动生效${colorReset}\n"
    printf "\n"
}

    show_complete_banner
    echo ""
    echo "🔧 如需修改配置，可编辑: ${CONFIG_FILE/#$HOME/~}"
else
    # 方案3: 改进错误提示，说明可能的原因
    echo "❌ 配置文件验证失败，可能的原因："
    echo "   1. 配置文件写入过程中出现错误"
    echo "   2. 磁盘空间不足或权限问题"
    echo "   3. API密钥格式在写入时被意外修改"
    echo ""
    echo "🔍 调试信息："
    echo "   配置文件路径: $CONFIG_FILE"
    echo "   API密钥长度: ${#auth_token}"
    echo "   配置文件末尾内容:"
    tail -5 "$CONFIG_FILE" 2>/dev/null || echo "   无法读取配置文件"
    echo ""
    echo "💡 建议解决方案："
    echo "   1. 检查磁盘空间: df -h $HOME"
    echo "   2. 检查文件权限: ls -la $CONFIG_FILE"
    echo "   3. 手动验证配置: cat $CONFIG_FILE | grep ANTHROPIC"
    echo "   4. 重新运行脚本"
    exit 1
fi