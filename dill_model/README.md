<div align="center">

  # Dill模型计算工具
  ### 多维光刻胶模型计算与可视化平台

  [![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://python.org)
  [![Flask Version](https://img.shields.io/badge/flask-3.0%2B-green.svg)](https://flask.palletsprojects.com/)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/yourusername/dill-model/pulls)
  [![Documentation](https://img.shields.io/badge/docs-latest-orange.svg)](https://github.com/yourusername/dill-model/wiki)
  [![GitHub release](https://img.shields.io/badge/release-v1.4.0-blue)](https://github.com/yourusername/dill-model/releases)
  [![Downloads](https://img.shields.io/badge/downloads-1k%2B-brightgreen)](https://github.com/yourusername/dill-model/releases)
  [![Last Commit](https://img.shields.io/badge/last%20commit-June%202024-yellowgreen)](https://github.com/yourusername/dill-model/commits/main)

</div>

<p align="center">
  <a href="#-功能特点">功能特点</a> •
  <a href="#-项目技术栈组成">技术栈</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="#-支持的光刻胶模型">支持模型</a> •
  <a href="#-使用指南">使用指南</a> •
  <a href="#-api文档">API</a> •
  <a href="#-更新日志">更新日志</a>
</p>

---

## 📑 简介

这是一个基于Python Flask后端和HTML前端的Web应用，用于计算和可视化多种光刻胶模型。该工具提供了直观的用户界面，支持实时参数调整、高级可视化和丰富的交互功能。

## 📊 项目技术栈组成

![技术栈组成](https://img.shields.io/badge/Python-65%25-3776AB)
![技术栈组成](https://img.shields.io/badge/JavaScript-20%25-F7DF1E)
![技术栈组成](https://img.shields.io/badge/HTML-10%25-E34F26)
![技术栈组成](https://img.shields.io/badge/CSS-5%25-1572B6)

## 🌟 功能特点

<table>
  <tr>
    <td>
      <b>多模型支持</b>: 支持三种光刻胶模型 - Dill模型(薄胶)、增强Dill模型(厚胶)和CAR模型(化学放大型光刻胶)
    </td>
    <td>
      <b>多维度模拟</b>: 支持一维、二维和三维波形模拟，满足不同场景需求
    </td>
  </tr>
  <tr>
    <td>
      <b>交互式图表</b>: 提供高度交互的可视化界面，支持缩放、平移、悬停查看详情等功能
    </td>
    <td>
      <b>矩阵可视化</b>: 专门的矩阵可视化模块，展示不同模型在不同维度下的表现差异
    </td>
  </tr>
  <tr>
    <td>
      <b>参数对比</b>: 支持多组参数并行计算和结果对比分析
    </td>
    <td>
      <b>实时预览</b>: 调整参数时实时生成预览图，直观反馈参数变化
    </td>
  </tr>
  <tr>
    <td>
      <b>数据导出</b>: 支持计算结果和图表的导出功能
    </td>
    <td>
      <b>多语言支持</b>: 支持中英文切换，满足不同用户需求
    </td>
  </tr>
  <tr>
    <td>
      <b>主题定制</b>: 针对不同模型提供独特的视觉主题
    </td>
    <td>
      <b>全局命令</b>: 支持在任何位置通过 `dill` 命令启动
    </td>
  </tr>
</table>

## 🛠 技术栈

### 后端
- **Python 3.8+**：核心编程语言
- **Flask 3.0+**：现代化的Python Web框架
- **NumPy 1.24+**：高性能科学计算库，处理数值计算
- **SciPy 1.10+**：科学计算工具集，用于高级算法
- **Matplotlib 3.6+**：专业的数据可视化库，生成静态图表
- **Pandas 2.0+**：数据处理和分析库，处理表格数据
- **Werkzeug 3.0+**：Flask依赖的WSGI库
- **Gunicorn 21.0+**：生产环境下的WSGI HTTP服务器

### 前端
- **HTML5/CSS3**：现代化的用户界面构建
- **JavaScript ES6+**：前端交互逻辑实现
- **Plotly.js 2.25+**：交互式图表生成库，支持2D/3D可视化
- **MathJax 3.0+**：数学公式渲染引擎
- **FontAwesome 6.4+**：丰富的图标库
- **Animate.css 4.1+**：提供流畅的CSS动画效果

### 开发和部署工具
- **Git**：版本控制系统
- **pip**：Python包管理工具
- **Render**：云端部署平台
- **pytest**：Python测试框架
- **black**：Python代码格式化工具
- **flake8**：Python代码质量检查工具

## 📁 项目结构

<details>
  <summary>点击展开完整项目结构</summary>

```
dill_model/
├── backend/                    # Python后端
│   ├── app.py                 # Flask应用入口和配置
│   ├── models/                # 模型计算模块
│   │   ├── __init__.py
│   │   ├── dill_model.py      # Dill模型核心算法(薄胶)
│   │   ├── enhanced_dill_model.py  # 增强Dill模型(厚胶)
│   │   └── car_model.py       # CAR模型(化学放大型光刻胶)
│   ├── routes/                # API路由模块
│   │   ├── __init__.py
│   │   └── api.py             # RESTful API端点
│   └── utils/                 # 工具函数模块
│       ├── __init__.py
│       ├── helpers.py         # 通用辅助函数
│       └── validators.py      # 参数验证函数
├── frontend/                  # 前端资源
│   ├── index.html            # 单一计算页面
│   ├── compare.html          # 对比分析页面
│   ├── css/                  # 样式文件
│   │   ├── style.css         # 主样式表
│   │   ├── animations.css    # 动画效果
│   │   ├── car-model.css     # CAR模型专用样式
│   │   └── theme-colors.css  # 主题颜色定义
│   ├── js/                   # JavaScript文件
│   │   ├── main.js           # 主要逻辑
│   │   ├── chart.js          # 图表处理
│   │   ├── car-model.js      # CAR模型专用脚本
│   │   └── utils.js          # 前端工具函数
│   └── assets/               # 静态资源
│       └── images/           # 图片资源
├── matrix_visualization/     # 矩阵可视化模块
│   ├── index.html           # 矩阵可视化页面
│   ├── css/                 # 样式文件
│   │   └── styles.css       # 矩阵可视化样式
│   ├── js/                  # JavaScript文件
│   │   └── matrix.js        # 矩阵可视化逻辑
│   └── assets/              # 静态资源
│       └── images/          # 图片资源
├── requirements.txt          # Python依赖包列表
├── run.py                   # 应用启动脚本
├── config.py                # 配置文件
├── dill                     # 全局命令脚本
├── dill_global.py           # 全局启动器
├── install.sh               # 自动安装脚本
├── open_matrix_visualization.py  # 矩阵可视化启动脚本
├── render.yaml              # Render部署配置
├── runtime.txt              # Python版本指定
├── Procfile                 # 进程定义文件
├── wsgi.py                  # WSGI入口文件
└── README.md                # 项目文档
```
</details>

## 🔬 支持的光刻胶模型

### 1. Dill模型 (薄胶模型)
适用于薄层光刻胶，核心公式：
- 光强分布: `I(x) = I_avg · (1 + V · cos(K · x))`
- 曝光剂量: `D(x) = I(x) · t_exp`
- 厚度分布: `M(x) = e^(-C · D(x))`

### 2. 增强Dill模型 (厚胶模型)
适用于厚层光刻胶，考虑了光在深度方向的衰减，核心方程：
- `∂I(z, t)/∂z = -I(z, t)[A(z_h, T, t_B) * M(z, t) + B(z_h, T, t_B)]`
- `∂M(z, t)/∂t = -I(z, t) * M(z, t) * C(z_h, T, t_B)`

### 3. CAR模型 (化学放大型光刻胶)
适用于化学放大型光刻胶，考虑了酸生成、扩散和反应放大过程，核心机制：
- 酸生成: `[H+](x,t) = η · D(x)`
- 酸扩散: 二维高斯扩散方程
- 放大反应: 酸催化聚合物去保护基团过程

## 🚀 快速开始

### 方法一：一键安装（推荐）

```bash
# 运行自动安装脚本
./install.sh

# 安装完成后，在任何位置输入以下命令启动
dill
```

### 方法二：手动安装

<details>
  <summary>点击展开详细安装步骤</summary>

#### 1. 环境要求
- **Python**: 3.8 或更高版本
- **pip**: Python包管理器
- **操作系统**: Windows 10+, macOS 10.14+, Ubuntu 18.04+

#### 2. 获取代码
```bash
# 克隆仓库（如果使用Git）
git clone https://github.com/yourusername/dill-model.git
cd dill-model/dill_model

# 或者直接下载并解压到目标目录
```

#### 3. 创建虚拟环境（推荐）
```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

#### 4. 安装依赖
```bash
# 安装所有必需的依赖包
pip install -r requirements.txt

# 或者逐个安装核心依赖
pip install flask flask-cors numpy matplotlib pillow scipy pandas
```

#### 5. 启动应用
```bash
# 使用启动脚本（推荐）
python run.py

# 或者直接运行Flask应用
python -m backend.app
```

#### 6. 访问应用
- 打开浏览器访问：`http://localhost:8080`
- 或者访问显示的IP地址：`http://你的IP:8080`
</details>

## 📱 多种启动方式

### 🌟 全局命令（推荐）
```bash
# 在任何位置的终端中输入
dill
```

### 💻 命令行启动
```bash
# 进入项目目录后
python run.py                    # 基本启动
python run.py --port 5000       # 指定端口
python run.py --debug           # 调试模式
python run.py --no-browser      # 不自动打开浏览器
python run.py --help            # 查看帮助
```

### 🔭 矩阵可视化启动
```bash
# 直接启动矩阵可视化模块
python open_matrix_visualization.py
```

## 📖 使用指南

### 1. 基本操作

<details>
  <summary>Dill模型(薄胶)参数</summary>
  
- **平均入射光强度 (I_avg)**: 控制光照强度
- **干涉条纹可见度 (V)**: 影响条纹对比度
- **空间频率 (K)**: 决定条纹密度
- **曝光时间 (t_exp)**: 控制曝光持续时间
- **光敏速率常数 (C)**: 材料特性参数
</details>

<details>
  <summary>增强Dill模型(厚胶)参数</summary>
  
- **光刻胶厚度 (z_h)**: 光刻胶层厚度
- **前烘温度 (T)**: 前烘处理温度
- **前烘时间 (t_B)**: 前烘处理时间
- **初始光强 (I0)**: 表面入射光强
- **曝光时间 (t_exp)**: 曝光持续时间
</details>

<details>
  <summary>CAR模型参数</summary>
  
- **平均入射光强度 (I_avg)**: 控制光照强度
- **干涉条纹可见度 (V)**: 影响条纹对比度
- **曝光时间 (t_exp)**: 曝光持续时间
- **酸生成效率 (η)**: 光生成酸的效率
- **扩散长度 (λ)**: 酸的扩散特性
- **反应速率 (κ)**: 脱保护反应速率
- **放大系数 (α)**: 化学放大倍数
- **对比度 (γ)**: 显影对比度
</details>

### 2. 波形设置

所有模型支持三种波形设置：
- **1D波形**: 一维正弦波，适用于基础模拟
- **2D波形**: 二维正弦波，支持X、Y方向频率设置和相位表达式
- **3D波形**: 三维正弦波，实现空间完整模拟

## 🔧 API文档

<details>
  <summary>点击展开完整API文档</summary>
  
### 1. 计算接口

**端点**: `POST /api/calculate`

**请求体**:
```json
{
  "model_type": "dill",     // 模型类型: "dill", "enhanced_dill", "car"
  "sine_type": "1d",        // 波形类型: "1d", "multi", "3d"
  "I_avg": 10.0,            // 平均入射光强度
  "V": 0.8,                 // 干涉条纹可见度
  "K": 2.0,                 // 空间频率 (1D模式)
  "t_exp": 5.0,             // 曝光时间
  "C": 0.02,                // 光敏速率常数 (Dill模型)
  // 多维参数 (适用于2D/3D)
  "Kx": 2.0,                // X方向空间频率
  "Ky": 1.0,                // Y方向空间频率
  "Kz": 0.5,                // Z方向空间频率 (3D模式)
  "phi_expr": "sin(t)"      // 相位表达式
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "exposure_plot": "data:image/png;base64,...",
    "thickness_plot": "data:image/png;base64,...",
    "parameters": { ... },
    "statistics": { ... }
  },
  "message": "计算完成"
}
```

### 2. 数据计算接口

**端点**: `POST /api/calculate_data`

适用于获取原始数据用于交互式图表

### 3. 参数比较接口

**端点**: `POST /api/compare`

用于比较多组参数的计算结果

### 4. 健康检查接口

**端点**: `GET /api/health`

用于检查API服务状态
</details>

## 🐛 故障排除

<details>
  <summary>点击展开常见问题解决方案</summary>
  
### 常见问题

1. **全局命令不可用**
   ```bash
   # 重新运行安装脚本
   ./install.sh
   
   # 或手动创建符号链接
   sudo ln -sf "$(pwd)/dill" /usr/local/bin/dill
   ```

2. **端口被占用**
   ```bash
   # 查找占用端口的进程
   lsof -i :8080
   # 或者修改run.py中的端口号
   python run.py --port 5000
   ```

3. **依赖安装失败**
   ```bash
   # 升级pip
   pip install --upgrade pip
   # 使用国内镜像源
   pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/
   ```

4. **Python版本不兼容**
   ```bash
   # 检查Python版本
   python --version
   # 确保使用Python 3.8+
   ```

5. **图表不显示**
   - 检查浏览器控制台是否有JavaScript错误
   - 确保网络连接正常（加载Plotly.js和MathJax）
   - 尝试刷新页面

### 日志查看

应用运行时会在以下文件中输出日志：
- `dill_server.log` - 服务器运行日志
- `dill_backend.log` - 后端处理日志
- `server.log` - 一般操作日志
</details>

## 🔨 开发指南

<details>
  <summary>点击展开开发指南</summary>
  
### 开发环境设置

1. **安装开发依赖**
   ```bash
   pip install -r requirements.txt
   pip install pytest pytest-flask black flake8
   ```

2. **代码格式化**
   ```bash
   # 使用black格式化代码
   black backend/
   # 使用flake8检查代码质量
   flake8 backend/
   ```

3. **运行测试**
   ```bash
   # 运行所有测试
   pytest
   # 运行特定测试文件
   pytest tests/test_models.py
   ```

### 添加新功能

1. **扩展计算模型**
   - 修改或新增模型文件 `backend/models/`
   - 在 `backend/routes/api.py` 中添加新模型支持
   - 更新参数验证函数

2. **新增API端点**
   - 在 `backend/routes/api.py` 中添加新路由
   - 实现请求处理逻辑
   - 添加错误处理

3. **前端界面更新**
   - 修改 `frontend/index.html` 或 `frontend/compare.html`
   - 更新 `frontend/css/` 中的相关样式
   - 在 `frontend/js/` 中添加或修改交互逻辑

4. **矩阵可视化扩展**
   - 修改 `matrix_visualization/index.html` 添加新功能
   - 在 `matrix_visualization/js/matrix.js` 中扩展可视化功能

### 部署指南

#### 开发环境
```bash
python run.py --debug
```

#### 生产环境
```bash
# 使用Gunicorn部署
gunicorn -w 4 -b 0.0.0.0:8080 "backend.app:create_app()"

# 使用Docker部署
docker build -t dill-model .
docker run -p 8080:8080 dill-model
```

#### Render部署

1. **准备工作**
   - 确保项目包含以下文件：
     - `requirements.txt`: 依赖列表
     - `wsgi.py`: WSGI入口文件
     - `render.yaml`: Render配置文件
     - `Procfile`: 进程定义文件
     - `runtime.txt`: Python版本指定

2. **部署步骤**
   - 注册并登录[Render](https://render.com/)
   - 点击"New +"按钮，选择"Web Service"
   - 连接GitHub/GitLab仓库或直接上传代码
   - 选择项目目录
   - 配置以下选项：
     - **Name**: 应用名称（如"dill-model"）
     - **Environment**: Python
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn wsgi:app`
   - 点击"Create Web Service"完成部署

3. **环境变量**
   - 在Render控制台中，进入应用的"Environment"选项卡
   - 添加以下环境变量：
     - `FLASK_ENV`: `production`
     - `PYTHON_VERSION`: `3.9.0`
</details>

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 贡献者

<div align="center">
  <p>感谢所有为本项目做出贡献的开发者！</p>
</div>

<p align="center">
  <a href="https://github.com/yourusername/dill-model/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/yourusername/dill-model.svg?style=for-the-badge" alt="贡献者">
  </a>
</p>

## 🌟 支持项目

如果您觉得这个项目有用，请考虑给它一个星标以示支持！

<div align="center">
  <p>⭐ 请点击Star支持我们! ⭐</p>
  <a href="https://github.com/yourusername/dill-model/stargazers">
    <img src="https://img.shields.io/github/stars/yourusername/dill-model.svg?style=social" alt="给我点Star">
  </a>
</div>

## 🔄 更新日志

<details>
  <summary>点击展开完整更新历史</summary>
  
### v1.4.0 (2024-06-15)
- ✨ 增加了MathJax支持，优化了数学公式渲染
- 🚀 提升了3D可视化性能，优化内存占用
- 📊 增强了CAR模型的参数敏感性分析功能
- 💾 添加了计算结果的CSV和Excel导出功能
- 🌐 改进了多语言支持，优化了英文翻译
- 🎨 更新了UI主题，适配不同模型的视觉风格
- 🔧 修复了在某些浏览器中的兼容性问题
- 📱 增强了移动设备的响应式布局支持

### v1.3.0 (2024-06-01)
- ✨ 新增矩阵可视化模块
- 🚀 优化了计算性能
- 📊 改进了数据展示方式
- 🛠️ 修复了多个已知问题

### v1.2.0 (2024-05-26)
- ✨ 新增全局 `dill` 命令支持
- 🔧 完善了requirements.txt依赖管理
- 📚 更新了README文档
- 🚀 优化了启动脚本
- 🛠️ 添加了自动安装脚本
- 🐛 添加了更多错误处理
- 🌐 改进了浏览器自动打开逻辑

### v1.1.0 (2024-05-25)
- 添加了参数预设功能
- 改进了用户界面
- 优化了计算性能

### v1.0.0 (2024-05-20)
- 初始版本发布
- 基本的Dill模型计算功能
- Web界面实现
</details>

## 📞 支持

如果您遇到问题或需要帮助：

- 查看 [FAQ](docs/FAQ.md)
- 提交 [Issue](https://github.com/yourusername/dill-model/issues)
- 发送邮件至: 2997725873@qq.com

---

<div align="center">
  <p>用 ❤️ 打造，致力于光刻胶模型计算的创新</p>
  <p>
    <a href="https://github.com/yourusername/dill-model">Dill模型计算工具</a> •
    版权所有 © 2025
  </p>
</div>

