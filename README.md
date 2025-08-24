# DILL 光刻模型计算与智能优化工具

一个基于DILL参数的光刻胶厚度分布计算和验证数据驱动的智能曝光优化Web应用。

## 项目简介

DILL模型计算工具是一款专业的光刻工艺仿真软件，实现了从光强分布到光刻胶厚度的完整计算链路，并集成了基于历史验证数据的智能曝光时间优化算法。

### 核心特性

- **多维度DILL模型计算**：支持1D/2D/3D光强分布和厚度计算
- **智能曝光优化**：基于验证数据的多策略曝光时间推荐
- **灵活的数据输入**：支持正弦波、自定义光强分布、CSV/JSON数据导入
- **实时可视化**：基于Plotly的交互式图表和动画效果
- **多段曝光累积**：支持分段曝光时间的累积剂量计算
- **验证数据管理**：Excel数据导入、筛选和机器学习优化

## 技术架构

### 后端技术栈
- ![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white) **Flask 3.0+** Web应用框架
- ![NumPy](https://img.shields.io/badge/NumPy-013243?style=flat&logo=numpy&logoColor=white) **科学计算引擎**：NumPy、SciPy数值计算
- ![Pandas](https://img.shields.io/badge/Pandas-150458?style=flat&logo=pandas&logoColor=white) **数据处理**：Pandas、OpenPyXL处理验证数据
- ![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=flat&logo=scikit-learn&logoColor=white) **机器学习**：智能优化算法
- ![Matplotlib](https://img.shields.io/badge/Matplotlib-11557C?style=flat&logo=python&logoColor=white) **可视化生成**：图像渲染

### 前端技术栈
- ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black) **原生Web技术**
- ![Plotly](https://img.shields.io/badge/Plotly-3F4F75?style=flat&logo=plotly&logoColor=white) **交互式可视化**
- ![Font Awesome](https://img.shields.io/badge/Font%20Awesome-528DD7?style=flat&logo=fontawesome&logoColor=white) **图标库**、Google Fonts
- **多语言支持**：中英文切换

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

## 核心功能详解

### 1. DILL模型计算

实现基于Dill参数的光刻胶曝光计算：

**数学模型**：
- 光强分布：`I(x) = I_avg × (1 + V × cos(K×x + φ))`
- 曝光剂量：`D(x) = I(x) × t_exp`
- 厚度分布：`M(x) = exp(-C × D(x))` (含阈值处理)

**支持模式**：
- **1D模式**：一维正弦光强分布
- **2D模式**：二维光强场计算
- **3D模式**：完整三维空间建模
- **4D动画**：时间演化可视化

### 2. 智能曝光优化

基于历史验证数据的机器学习优化：

**算法特性**：
- 多策略推荐：保守/平衡/激进/最优策略
- 置信度评估：算法可靠性量化
- 目标导向：按位置和目标厚度精准优化
- 数据驱动：利用Excel验证记录训练模型

**优化流程**：
1. 导入验证数据 → 2. 设置目标参数 → 3. 算法优化计算 → 4. 多策略结果展示 → 5. 置信度评估

### 3. 自定义光强分布

支持多种光强输入方式：

**数据格式**：
- CSV文件：`x,intensity` 格式
- JSON数据：`{"x": [...], "intensity": [...]}`
- 在线绘制：交互式光强曲线编辑

**处理能力**：
- 智能单位转换 (nm/μm/mm)
- 数据插值与平滑
- 边界外值处理 (零值/边界值/自定义值)

### 4. 多段曝光累积

模拟实际工艺的分段曝光：

```python
# 示例：5段曝光，每段10秒，光强递增
segments = {
    "count": 5,
    "duration": 10,  # 每段时间(秒)
    "intensities": [50, 60, 70, 80, 90]  # 各段光强
}
```

## API接口

### 主要端点

#### 1. DILL模型计算
```http
POST /api/calculate_data
Content-Type: application/json

{
  "model_type": "dill",
  "sine_type": "single",
  "I_avg": 0.5,
  "V": 0.8,
  "K": 0.1,
  "t_exp": 100,
  "C": 0.022,
  "angle_a": 11.7,
  "wavelength": 405,
  "exposure_calculation_method": "cumulative",
  "segment_count": 5,
  "segment_intensities": [50,50,50,50,50]
}
```

#### 2. 智能优化
```http
POST /api/smart_optimize_exposure
Content-Type: application/json

{
  "target_x": 0,
  "target_y": 0,
  "target_thickness": 1.0,
  "selected_records": [0,1,2],
  "optimization_type": "custom",
  "sensitivity": 2.0,
  "confidence_threshold": 0.5,
  "strategy_count": 3
}
```

返回示例：
```json
{
  "success": true,
  "data": {
    "exposure_options": [
      {
        "label": "保守策略",
        "type": "conservative", 
        "exposure_time": 99.6,
        "confidence": 0.796,
        "predicted_thickness": 1.1534
      }
    ]
  }
}
```

#### 3. 验证数据管理
```http
GET /api/get_validation_data_for_optimization    # 获取验证记录
GET /api/latest_calculation                      # 最近计算结果
POST /api/upload_data                           # 上传验证数据
```

## 配置参数

### DILL模型参数
- `I_avg`: 平均光强
- `V`: 干涉条纹可见度 (0-1)
- `K`: 空间频率 (rad/μm)
- `t_exp`: 曝光时间 (秒)
- `C`: Dill模型速率常数
- `angle_a`: 入射角 (度)
- `wavelength`: 波长 (nm)

### 优化算法参数
- `sensitivity`: 算法敏感度 (1.0/2.0/3.0)
- `confidence_threshold`: 最低置信度 (0-1)
- `strategy_count`: 策略数量 (1/3/5)

## 开发与扩展

### 本地开发

1. **启用调试模式**：
```bash
python run.py --debug
```

2. **查看详细日志**：
```bash
DILL_ENABLE_LOG_FILTER=false python run.py --verbose-logs
```

3. **自定义端口**：
```bash
python run.py --port 5000
```

### 二次开发

- **添加新模型**：在`backend/models/`目录扩展
- **自定义API**：修改`backend/routes/api.py`
- **界面定制**：编辑`frontend/`下的HTML/CSS/JS文件
- **多语言支持**：扩展`frontend/js/lang.js`

### 部署建议

**生产环境**：
```bash
# 使用Gunicorn部署
gunicorn -w 4 -b 0.0.0.0:8080 wsgi:app

# 或使用Docker
docker build -t dill-model .
docker run -p 8080:8080 dill-model
```

**环境变量**：
- `FLASK_ENV=production` - 生产模式
- `DILL_ENABLE_LOG_FILTER=true` - 日志过滤
- `PORT=8080` - 服务端口

## 依赖说明

### 核心依赖
- `flask>=3.0.0` - Web框架
- `numpy>=1.24.0` - 数值计算
- `scipy>=1.10.0` - 科学计算
- `pandas>=2.0.0` - 数据处理
- `scikit-learn>=1.3.0` - 机器学习
- `matplotlib>=3.6.0` - 图像生成
- `openpyxl>=3.1.0` - Excel支持

### 可选依赖
- `gunicorn>=21.0.0` - 生产服务器
- `pytest>=7.4.0` - 单元测试

## 常见问题

**Q: 端口被占用怎么办？**
A: 启动脚本会自动切换到8081端口，或使用`--port`参数指定其他端口。

**Q: 验证数据格式要求？**
A: 支持Excel (.xlsx) 格式，需包含位置、厚度、曝光参数等列，具体格式参考`validation_data.xlsx`样本。

**Q: 如何提高计算性能？**
A: 
- 减少网格点数 (如2001→1001)
- 关闭不必要的动画效果
- 使用多进程部署 (`gunicorn -w 4`)

**Q: 自定义光强数据格式？**
A: 支持CSV格式 (`x,intensity`) 或JSON格式，自动检测单位并智能转换。

## 贡献指南

欢迎提交Issue和Pull Request：

1. Fork项目并创建功能分支
2. 遵循现有代码风格
3. 添加适当的测试用例
4. 提交清晰的commit信息
5. 发起Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

**技术支持**: 如有问题，请在GitHub仓库提交Issue或联系开发团队。