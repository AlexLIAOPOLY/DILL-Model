# 光刻胶光强分布示例文件

## 文件说明

本目录包含各种格式的光强分布示例文件，供DILL模型的"自定义向量"功能测试和使用。所有文件包含相同的光强分布数据，但以不同格式存储。

### 支持的文件格式

#### 基础格式
- `intensity_example.txt`: 基本文本格式，空格分隔
- `intensity_example.csv`: 逗号分隔的表格格式
- `intensity_example.json`: JSON格式，包含元数据和数据数组
- `intensity_example.dat`: 带注释的数据文件，类似于TXT
- `intensity_example.tab`: 制表符分隔的数据文件

#### 光刻仿真软件格式
- `intensity_example.pli`: PROLITH格式光刻模拟数据文件
- `intensity_example.ldf`: Lithography数据格式
- `intensity_example.msk`: 掩模文件格式
- `intensity_example.int`: 强度文件格式
- `intensity_example.pro`: 工艺文件格式
- `intensity_example.sim`: 仿真结果文件格式
- `intensity_example.asc`: 工业ASCII输出格式
- `intensity_example.log`: 仿真日志格式

## 数据说明

所有文件包含51个数据点，表示从-5μm到5μm范围内的光强分布。这是一个类高斯分布的光强曲线，中心稍微偏移，峰值在约-0.6μm位置。

## 使用方法

1. 在DILL模型界面中选择"自定义向量"选项
2. 上传任意一个示例文件
3. 系统将自动解析文件中的x坐标和光强数据
4. 应用解析的数据进行后续计算

## 注意事项

- 上传文件大小限制为10MB
- 支持的文件格式包括但不限于上述列出的格式
- 数据格式问题可参考各示例文件的结构

## 自定义数据要求

如果您要使用自己的数据，请确保：

1. 文件包含位置(x)和光强(intensity)两列数据
2. 数据点数量合适（建议在50-1000之间）
3. 光强值应为正数或零（除特殊情况）
4. 位置值应按照升序排列