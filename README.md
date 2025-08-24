## DILL-Model | 光刻 DILL 模型计算与可视化工具

基于 DILL（Dill parameters）曝光模型的轻量级 Web 工具，用于从光强参数快速计算光刻胶厚度分布，并结合验证数据进行“多策略曝光时间”智能优化与可视化。

### 功能特性
- 计算与可视化
  - 一维正弦/自定义光强分布下的厚度计算与曲线可视化（支持多段曝光累积）。
  - 支持自定义光强数据（CSV/JSON）上传，范围外补零或外推。
  - 结果面板展示“推荐曝光时间、优化策略（含置信度）、预测厚度”。
- 验证数据驱动的智能优化（Validation）
  - 读取历史验证记录，按目标位置与目标厚度给出 1 / 3 / 5 种曝光时间策略。
  - 置信度按策略类型自适应计算（保守/平衡/激进/最优），可直观比较与选择。
  - 结果“胶囊”悬停可查看策略来源与置信度，推荐项自动高亮。
- 友好的前后端一体化
  - 后端 Flask + 前端原生 HTML/CSS/JS，零依赖数据库，开箱即用。
  - 所有页面与静态资源均在仓库中，便于二次开发与私有部署。

---

### 目录结构
```
DILL-Model/
├── Dill/
│   └── DILL/
│       └── dill_model/
│           ├── backend/              # Flask 后端（API 路由、逻辑）
│           │   ├── app.py
│           │   └── routes/api.py     # 主要接口（>4k 行，包含优化与计算）
│           ├── frontend/             # 前端页面与静态资源
│           │   ├── index.html        # 计算演示页
│           │   ├── validation.html   # 验证数据与智能优化页（主入口）
│           │   ├── compare.html      # 对比/可视化
│           │   ├── css/ *.css        # 样式
│           │   └── js/ *.js          # 前端逻辑
│           ├── run.py                # 本地启动脚本（推荐使用）
│           ├── requirements.txt      # Python 依赖
│           └── start_up/start.sh     # 服务器启动脚本（可选）
└── test_data/                         # 示例/测试数据
```

---

### 快速开始（本地）
要求：Python 3.10+（推荐 3.12）

```bash
# 1) 安装依赖（建议在虚拟环境中）
cd Dill/DILL/dill_model
pip install -r requirements.txt

# 2) 运行
python3 run.py
# 首次启动会自动选择可用端口（默认 8081），并打开浏览器

# 3) 访问
# http://127.0.0.1:8081
# 主页（index.html）；验证与优化页（/validation.html）
```

> 提示：若 8080 被占用，程序会自动切换到 8081 并在控制台打印实际端口。

---

### 关键页面
- `frontend/validation.html`（推荐入口）
  - 加载验证记录 → 选择目标位置/厚度 → 一键“智能优化”
  - 返回多策略曝光时间（保守/平衡/激进/最优等），“胶囊”视图支持悬停提示与高亮推荐
  - 面板同步显示“优化策略（含置信度）/预测厚度”的说明文字
- `frontend/index.html`
  - 输入 DILL 模型参数与光强配置（含多段曝光累积）并查看计算曲线

---

### 常用 API（节选）
后端均位于 `backend/routes/api.py`，以下仅列出核心接口的典型用法（请求体字段非穷举）：

1. 计算厚度（DILL）
```
POST /api/calculate_data
{
  "model_type": "dill",
  "sine_type": "single",           // 一维正弦；也可传自定义光强
  "I_avg": 0.5,
  "V": 0.8,
  "K": 0.1,
  "t_exp": 100,
  "C": 0.022,
  "angle_a": 11.7,
  "wavelength": 405,
  "exposure_calculation_method": "cumulative", // 多段累积
  "segment_count": 5,
  "segment_intensities": [50,50,50,50,50]
}
```

2. 智能优化曝光时间（基于验证数据）
```
POST /api/smart_optimize_exposure
{
  "target_x": 0, "target_y": 0,          // 目标位置（1D 模式下 y 可省略）
  "target_thickness": 1.0,                // 目标厚度（μm）
  "selected_records": [0,1,2,...],        // 选中的验证记录下标
  "optimization_type": "custom",          // quick/custom
  "sensitivity": 2.0,                      // 算法敏感度（1.0/2.0/3.0）
  "confidence_threshold": 0.5,             // 最低置信度
  "strategy_count": 3                      // 返回 1/3/5 种策略
}
```
返回示例（节选）：
```
{
  "success": true,
  "data": {
    "exposure_options": [
      { "label": "保守策略", "type": "conservative", "exposure_time": 99.6,
        "confidence": 0.796, "predicted_thickness": 1.1534 }
      // ...
    ]
  }
}
```

3. 其它常用接口
- `GET /api/get_validation_data_for_optimization`  获取/刷新验证记录
- `GET /api/latest_calculation`                     最近一次计算结果
- `GET /api/example-files`                          示例文件清单

---

### 参数说明（常用）
- `I_avg`：平均光强
- `V`：干涉条纹可见度/对比度
- `K`：空间频率（rad/μm）
- `t_exp`：曝光时间（秒）
- `C`：Dill 模型速率常数
- `angle_a`：入射角（度）
- `wavelength`：波长（nm）
- 多段曝光：`segment_count` + `segment_intensities`（支持累积剂量计算）

---

### 典型工作流
1. 在 `validation.html` 载入/筛选历史验证记录
2. 设置目标位置与目标厚度，选择优化类型（快捷/自定义）与策略数量
3. 提交“智能优化”，在右侧查看多策略曝光时间与置信度，点击对比与应用
4. 在计算页验证参数，或导出/截屏保存结果

---

### 开发与二次封装
- 样式与行为均为原生实现（不依赖框架），便于嵌入到现有系统。
- 大部分交互文本已中文化，若需多语言可在 `frontend/js/lang.js` 衍生。
- 页面与图形组件（Plotly 等）已解耦，可只引用 `validation.html` 作为独立模块。

---

### 常见问题
- 端口被占用：启动脚本会自动切换至 8081，并在控制台打印可访问的地址。
- GitHub Push 鉴权失败：在 GitHub Desktop 中 Preferences → Accounts 重新登录后再 Push；或改用 SSH 远程。

---

如需问题排查或功能扩展，请在仓库提 Issue，或直接提交 PR。欢迎共同完善 DILL-Model！


