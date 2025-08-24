<div align="center">

# DILL 光刻模型计算与智能优化工具

**基于DILL参数的光刻胶厚度分布计算和验证数据驱动的智能曝光优化Web应用**

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0+-000000?style=flat&logo=flask&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-013243?style=flat&logo=numpy&logoColor=white)
![Pandas](https://img.shields.io/badge/Pandas-150458?style=flat&logo=pandas&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=flat&logo=scikit-learn&logoColor=white)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Plotly](https://img.shields.io/badge/Plotly-3F4F75?style=flat&logo=plotly&logoColor=white)

[快速开始](#快速开始) •
[功能特性](#功能特性) •
[在线演示](#在线演示) •
[API文档](#api接口) •
[贡献指南](#贡献指南)

</div>

---

## 📋 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)  
- [在线演示](#在线演示)
- [快速开始](#快速开始)
- [项目架构](#项目架构)
- [核心功能](#核心功能)
- [API接口](#api接口)
- [配置参数](#配置参数)
- [开发指南](#开发指南)
- [常见问题](#常见问题)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## 项目简介

DILL模型计算工具是一款专业的光刻工艺仿真软件，实现了从光强分布到光刻胶厚度的完整计算链路，并集成了基于历史验证数据的智能曝光时间优化算法。

## 功能特性

- **多维度DILL模型计算**：支持1D/2D/3D光强分布和厚度计算
- **智能曝光优化**：基于验证数据的多策略曝光时间推荐
- **灵活的数据输入**：支持正弦波、自定义光强分布、CSV/JSON数据导入
- **实时可视化**：基于Plotly的交互式图表和动画效果
- **多段曝光累积**：支持分段曝光时间的累积剂量计算
- **验证数据管理**：Excel数据导入、筛选和机器学习优化

## 在线演示

```bash
# 本地快速体验
git clone https://github.com/AlexLIAOPOLY/DILL-Model.git
cd DILL-Model/Dill/DILL/dill_model  
python run.py
# 浏览器访问 http://localhost:8080
```

**主要页面：**
- `/` - DILL模型参数计算
- `/validation.html` - 智能曝光优化（推荐）
- `/compare.html` - 参数对比分析

## 项目架构

### 文件结构
```
dill_model/
├── backend/                    # Flask后端
│   ├── app.py                 # 应用入口
│   ├── routes/api.py          # API路由 (4200+行核心逻辑)
│   ├── models/                # 计算模型
│   │   ├── dill_model.py      # DILL模型核心实现
│   │   ├── enhanced_dill_model.py  # 增强DILL模型
│   │   └── car_model.py       # CAR模型
│   └── utils/                 # 工具函数
├── frontend/                   # Web前端
│   ├── index.html             # 主计算界面
│   ├── validation.html        # 验证优化界面 (推荐入口)
│   ├── compare.html           # 参数对比界面
│   ├── css/                   # 样式文件
│   └── js/                    # JavaScript逻辑
├── matrix_visualization/       # 矩阵可视化模块
├── run.py                     # 启动脚本
├── requirements.txt           # Python依赖
└── validation_data.xlsx       # 验证数据样本
```

## 快速开始

### 系统要求
- Python 3.10+ (推荐3.12)
- 内存 >= 4GB
- 支持现代浏览器 (Chrome/Firefox/Safari/Edge)

### 安装与运行

1. **克隆项目**
```bash
git clone [repository-url]
cd Dill/DILL/dill_model
```

2. **安装依赖**
```bash
# 推荐使用虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖包
pip install -r requirements.txt
```

3. **启动应用**
```bash
python run.py
```

应用将自动检测可用端口（默认8080，若被占用则切换到8081），并在浏览器中打开主界面。

### 主要页面

- **`/`** - 主计算页面：DILL模型参数输入和实时计算
- **`/validation.html`** - 验证优化页面：智能曝光时间推荐 (推荐入口)
- **`/compare.html`** - 参数对比页面：多组参数并行计算对比
- **`/matrix_visualization/`** - 矩阵可视化：3D数据的高级可视化

## 核心功能

### DILL模型计算
- **数学模型**：`I(x) = I_avg × (1 + V × cos(K×x + φ))` → `D(x) = I(x) × t_exp` → `M(x) = exp(-C × D(x))`
- **多维支持**：1D/2D/3D光强分布 + 4D时间演化动画
- **实时计算**：参数调整即时更新图表

### 智能曝光优化
- **多策略推荐**：保守/平衡/激进/最优策略，含置信度评估
- **数据驱动**：基于Excel验证记录的机器学习算法
- **目标导向**：按位置和目标厚度精准优化

### 灵活数据输入
- **格式支持**：CSV、JSON、在线绘制
- **智能处理**：单位转换(nm/μm/mm)、插值平滑、边界处理
- **多段曝光**：支持工艺级分段曝光累积计算

## API接口

### 核心端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/calculate_data` | POST | DILL模型计算 |
| `/api/smart_optimize_exposure` | POST | 智能曝光优化 |
| `/api/get_validation_data_for_optimization` | GET | 获取验证数据 |
| `/api/upload_data` | POST | 上传验证数据 |

### 请求示例

**DILL模型计算：**
```json
{
  "model_type": "dill",
  "I_avg": 0.5, "V": 0.8, "K": 0.1,
  "t_exp": 100, "C": 0.022,
  "angle_a": 11.7, "wavelength": 405
}
```

**智能优化：**
```json
{
  "target_x": 0, "target_y": 0,
  "target_thickness": 1.0,
  "strategy_count": 3
}
```

## 配置参数

**DILL模型：** `I_avg`(光强) • `V`(可见度) • `K`(空间频率) • `t_exp`(时间) • `C`(速率常数)

**优化算法：** `sensitivity`(敏感度) • `confidence_threshold`(置信度) • `strategy_count`(策略数)

## 开发指南

### 本地开发
```bash
# 调试模式
python run.py --debug

# 详细日志  
DILL_ENABLE_LOG_FILTER=false python run.py --verbose-logs

# 自定义端口
python run.py --port 5000
```

### 二次开发
- **新模型**：扩展 `backend/models/`
- **API修改**：编辑 `backend/routes/api.py` 
- **前端定制**：修改 `frontend/` 下文件
- **多语言**：扩展 `frontend/js/lang.js`

### 生产部署
```bash
# Gunicorn
gunicorn -w 4 -b 0.0.0.0:8080 wsgi:app

# Docker  
docker build -t dill-model .
docker run -p 8080:8080 dill-model
```

### 主要依赖
**后端：** Flask • NumPy • Pandas • scikit-learn • Matplotlib
**前端：** HTML5 • CSS3 • JavaScript • Plotly.js

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 端口被占用 | 自动切换8081端口，或用 `--port` 指定 |
| 验证数据格式 | Excel格式，参考 `validation_data.xlsx` 样本 |
| 提高性能 | 减少网格点数、关闭动画、多进程部署 |
| 自定义光强 | 支持CSV/JSON，自动单位转换 |

## 贡献指南

1. **Fork** 项目并创建功能分支
2. **提交** 清晰的commit信息  
3. **测试** 确保代码质量
4. **发起** Pull Request

欢迎提交Issue反馈问题和建议！

## 许可证

本项目采用 **MIT License** 开源协议 - 查看 [LICENSE](LICENSE) 了解详情

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个Star支持一下！**

[提交问题](https://github.com/AlexLIAOPOLY/DILL-Model/issues) •
[功能建议](https://github.com/AlexLIAOPOLY/DILL-Model/issues/new) •
[技术支持](https://github.com/AlexLIAOPOLY/DILL-Model/discussions)

</div>