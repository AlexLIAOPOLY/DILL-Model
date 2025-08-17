/**
 * 结果验证页面功能实现
 */

// 全局变量
let currentParameters = null;
let thicknessData = null;
let annotations = [];
let isAnnotationMode = false;

// 标注弹窗相关变量
let currentAnnotationData = {
    x: 0,
    y: 0,
    simulatedValue: 0
};

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    initValidationPage();
});

/**
 * 初始化验证页面
 */
function initValidationPage() {
    // 绑定事件监听器
    bindEventListeners();
    
    // 尝试加载参数
    loadParametersFromStorage();
    
    // 初始化语言支持
    if (typeof initLanguage === 'function') {
        initLanguage();
    }
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 刷新参数按钮
    const refreshBtn = document.getElementById('refresh-parameters');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadParametersFromStorage);
    }
    
    // 编辑参数按钮
    const editBtn = document.getElementById('edit-parameters');
    if (editBtn) {
        editBtn.addEventListener('click', enableParameterEditing);
    }
    
    // 开始标注按钮
    const startAnnotationBtn = document.getElementById('start-annotation');
    if (startAnnotationBtn) {
        startAnnotationBtn.addEventListener('click', toggleAnnotationMode);
    }
    
    // 手动添加标注按钮
    const manualBtn = document.getElementById('manual-annotation');
    if (manualBtn) {
        manualBtn.addEventListener('click', showManualAnnotationModal);
    }
    
    // 清除标注按钮
    const clearBtn = document.getElementById('clear-annotations');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllAnnotations);
    }
    
    // 提交数据按钮
    const submitBtn = document.getElementById('submit-data');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitValidationData);
    }
    
    // 训练模型按钮
    const trainBtn = document.getElementById('train-model');
    if (trainBtn) {
        trainBtn.addEventListener('click', trainPredictionModel);
    }
    
    // 预测参数按钮
    const predictBtn = document.getElementById('predict-parameters');
    if (predictBtn) {
        predictBtn.addEventListener('click', predictParameters);
    }
    
    // 查看当前记录按钮
    const viewExcelBtn = document.getElementById('view-excel-data');
    if (viewExcelBtn) {
        viewExcelBtn.addEventListener('click', toggleExcelDataView);
    }
    
    // 刷新Excel数据按钮
    const refreshExcelBtn = document.getElementById('refresh-excel-data');
    if (refreshExcelBtn) {
        refreshExcelBtn.addEventListener('click', refreshExcelData);
    }
}

/**
 * 从后端加载最近的计算结果
 */
function loadParametersFromStorage() {
    console.log('开始从后端加载最近的计算结果...');
    
    // 从后端获取最近的计算结果
    fetch('/api/latest_calculation')
        .then(response => response.json())
        .then(result => {
            console.log('后端响应:', result);
            
            if (result.success && result.data) {
                const data = result.data;
                currentParameters = data.parameters;
                thicknessData = data.results;
                
                console.log('解析的参数:', currentParameters);
                console.log('解析的结果数据:', thicknessData);
                
                // 先显示参数容器
                document.getElementById('no-parameters-message').style.display = 'none';
                document.getElementById('parameters-container').style.display = 'block';
                
                // 然后显示参数和图表
                displayParameters(currentParameters);
                displayThicknessPlot(thicknessData);
                
                showStatusMessage('success', `成功加载计算结果 (${data.model_type}模型)`);
            } else {
                // 没有计算结果
                console.log('后端没有计算结果:', result.message);
                
                document.getElementById('no-parameters-message').style.display = 'block';
                document.getElementById('parameters-container').style.display = 'none';
                
                // 显示占位符图表
                displayPlaceholderPlot();
                
                showStatusMessage('info', result.message || '请先在单一计算页面完成计算');
            }
        })
        .catch(error => {
            console.error('从后端加载计算结果失败:', error);
            
            // 网络错误，显示错误信息
            document.getElementById('no-parameters-message').style.display = 'block';
            document.getElementById('parameters-container').style.display = 'none';
            
            displayPlaceholderPlot();
            showStatusMessage('error', '无法连接到后端服务，请检查网络连接');
        });
}

/**
 * 显示参数配置
 */
function displayParameters(params) {
    console.log('displayParameters 被调用，参数:', params);
    const grid = document.getElementById('parameters-grid');
    if (!grid) {
        console.error('未找到 parameters-grid 元素');
        return;
    }
    
    grid.innerHTML = '';
    
    if (!params) {
        console.warn('参数为空');
        return;
    }
    
    // 参数分类和映射
    const parameterCategories = {
        '基础模型参数': {
            icon: 'fas fa-cube',
            params: {
                'model_type': '模型类型',
                'sine_type': '曝光图案维度',
                'is_ideal_exposure_model': '曝光模型类型'
            }
        },
        '光学参数': {
            icon: 'fas fa-eye',
            params: {
                'I_avg': '平均光强',
                'V': '对比度',
                'K': '空间频率K',
                'wavelength': '波长 (nm)',
                'angle_a': '衍射角度 (°)'
            }
        },
        '曝光参数': {
            icon: 'fas fa-sun',
            params: {
                't_exp': '曝光时间 (s)',
                'C': '光敏速率常数',
                'exposure_threshold': '曝光阈值',
                'exposure_calculation_method': '曝光计算方式'
            }
        },
        '高级计算参数': {
            icon: 'fas fa-cogs',
            params: {
                'enable_exposure_time_window': '启用曝光时间窗口',
                'time_mode': '时间模式',
                'segment_count': '分段数量',
                'segment_duration': '单段时长 (s)',
                'segment_intensities': '分段光强数组',
                'total_exposure_dose': '总曝光剂量'
            }
        }
    };
    
    // 遍历参数并显示
    console.log('参数键列表:', Object.keys(params));
    
    Object.keys(parameterCategories).forEach(categoryName => {
        const categoryData = parameterCategories[categoryName];
        const categoryParams = categoryData.params;
        const categoryIcon = categoryData.icon;
        const categoryHasParams = Object.keys(categoryParams).some(key => params.hasOwnProperty(key));
        
        if (categoryHasParams) {
            // 创建分类标题
            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'parameter-category-title';
            categoryTitle.innerHTML = `<h3><i class="${categoryIcon}"></i>${categoryName}</h3>`;
            grid.appendChild(categoryTitle);
            
            // 添加该分类下的参数
            Object.keys(categoryParams).forEach(key => {
                if (params.hasOwnProperty(key)) {
                    console.log(`处理参数: ${key} = ${params[key]}`);
                    console.log(`找到映射: ${key} -> ${categoryParams[key]}`);
                    
                    const item = document.createElement('div');
                    item.className = 'parameter-item';
                    
                    const name = document.createElement('span');
                    name.className = 'parameter-name';
                    name.textContent = categoryParams[key];
                    
                    const value = document.createElement('span');
                    value.className = 'parameter-value';
                    value.textContent = formatParameterValue(params[key], key);
                    value.setAttribute('data-key', key);
                    value.style.fontWeight = 'bold';
                    value.style.fontSize = '1.1em';
                    
                    item.appendChild(name);
                    item.appendChild(value);
                    grid.appendChild(item);
                    
                    console.log(`已添加参数项: ${categoryParams[key]} = ${formatParameterValue(params[key], key)}`);
                }
            });
        }
    });
    
    console.log(`参数显示完成，共添加了 ${grid.children.length} 个参数项`);
}

/**
 * 格式化参数值显示
 */
function formatParameterValue(value, paramKey = '') {
    if (typeof value === 'number') {
        // 对于很小的数字使用科学记数法，否则使用固定小数位
        if (Math.abs(value) < 0.001 && value !== 0) {
            return value.toExponential(2);
        } else if (Math.abs(value) >= 1000) {
            return value.toFixed(0);
        } else {
            return value.toFixed(3);
        }
    } else if (typeof value === 'boolean') {
        // 根据参数名提供更具体的布尔值描述
        if (paramKey === 'is_ideal_exposure_model') {
            return value ? '理想模型' : '非理想模型';
        } else if (paramKey === 'enable_exposure_time_window') {
            return value ? '启用' : '禁用';
        }
        return value ? '是' : '否';
    } else if (typeof value === 'string') {
        // 特殊字符串值的本地化
        const stringMap = {
            'dill': 'Dill模型',
            'single': '1D曝光图案',
            '1d': '1D曝光图案',
            '2d': '2D曝光图案',
            'cumulative': '累积模式',
            'fixed': '固定模式',
            'true': '是',
            'false': '否'
        };
        return stringMap[value.toLowerCase()] || value;
    } else if (Array.isArray(value)) {
        if (value.length <= 5) {
            return `[${value.map(v => typeof v === 'number' ? formatParameterValue(v, '') : v).join(', ')}]`;
        } else {
            return `[${value.slice(0, 3).map(v => typeof v === 'number' ? formatParameterValue(v, '') : v).join(', ')}, ...等${value.length}项]`;
        }
    } else if (value === null || value === undefined) {
        return '未设置';
    }
    return String(value);
}

/**
 * 显示厚度图
 */
function displayThicknessPlot(data) {
    console.log('尝试显示厚度图，数据:', data);
    
    if (!data) {
        showStatusMessage('error', '无计算结果数据');
        return;
    }
    
    // 尝试从不同的数据结构中找到原始厚度数据
    let thicknessData = null;
    let xCoords = null;
    let yCoords = null;
    
    // 优先查找原始厚度数据字段，避免使用归一化数据
    if (data.H_values) {
        // H_values 通常是原始厚度数据
        thicknessData = data.H_values;
        xCoords = data.x_coords;
        yCoords = data.y_coords;
        console.log('使用原始厚度数据 H_values');
    } else if (data.original_thickness) {
        // 原始厚度数据
        thicknessData = data.original_thickness;
        xCoords = data.x_coords;
        yCoords = data.y_coords;
        console.log('使用原始厚度数据 original_thickness');
    } else if (data.thickness_raw) {
        // 原始厚度数据
        thicknessData = data.thickness_raw;
        xCoords = data.x_coords;
        yCoords = data.y_coords;
        console.log('使用原始厚度数据 thickness_raw');
    } else if (data.thickness) {
        // 备选：通用厚度数据
        thicknessData = data.thickness;
        xCoords = data.x_coords;
        yCoords = data.y_coords;
        console.log('使用通用厚度数据 thickness');
    } else if (data.data && data.data.thickness) {
        thicknessData = data.data.thickness;
        xCoords = data.data.x_coords;
        yCoords = data.data.y_coords;
        console.log('使用嵌套厚度数据');
    } else if (data.z_thickness) {
        thicknessData = data.z_thickness;
        xCoords = data.x_coords;
        yCoords = data.y_coords;
        console.log('使用z方向厚度数据');
    }
    
    if (!thicknessData) {
        console.log('未找到厚度数据，可用的数据键:', Object.keys(data));
        showStatusMessage('info', '暂无厚度数据，请先在单一计算页面完成一次计算');
        
        // 显示一个示例图表作为占位符
        displayPlaceholderPlot();
        return;
    }
    
    try {
        let plotData;
        
        console.log('厚度数据类型:', typeof thicknessData, '是否为数组:', Array.isArray(thicknessData));
        console.log('厚度数据长度:', thicknessData.length);
        
        // 根据数据类型选择显示方式
        if (Array.isArray(thicknessData) && Array.isArray(thicknessData[0])) {
            // 2D数据
            console.log('显示2D厚度图');
            plotData = [{
                z: thicknessData,
                type: 'heatmap',
                colorscale: 'Plasma',
                showscale: true,
                colorbar: {
                    title: {
                        text: '厚度 (归一化)',
                        side: 'right'
                    }
                },
                hovertemplate: 'X: %{x}<br>Y: %{y}<br>厚度: %{z:.3f}<extra></extra>'
            }];
        } else if (Array.isArray(thicknessData)) {
            // 1D数据
            console.log('显示1D厚度图');
            const xData = xCoords || Array.from({length: thicknessData.length}, (_, i) => (i - thicknessData.length/2) * 0.01);
            plotData = [{
                x: xData,
                y: thicknessData,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: '#20c997', width: 3 },
                marker: { 
                    size: 6,
                    color: '#20c997',
                    symbol: 'circle'
                },
                name: '厚度分布',
                hovertemplate: 'X: %{x:.2f}μm<br>厚度: %{y:.3f}μm<extra></extra>'
            }];
        } else {
            throw new Error('不支持的厚度数据格式');
        }
        
        const layout = {
            title: {
                text: '光刻胶厚度分布 - 点击进行标注',
                font: { size: 18, family: 'Arial, sans-serif' },
                x: 0.5
            },
            autosize: true,
            xaxis: { 
                title: { 
                    text: 'X坐标 (μm)',
                    font: { size: 14 }
                },
                gridcolor: '#e0e0e0',
                zeroline: true,
                zerolinecolor: '#cccccc'
            },
            yaxis: { 
                title: { 
                    text: Array.isArray(thicknessData[0]) ? 'Y坐标 (μm)' : '厚度 (μm)',
                    font: { size: 14 }
                },
                gridcolor: '#e0e0e0',
                zeroline: true,
                zerolinecolor: '#cccccc'
            },
            showlegend: false,
            margin: { l: 60, r: 30, t: 60, b: 60 },
            plot_bgcolor: 'white',
            paper_bgcolor: 'white'
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'zoom2d', 'pan2d'],
            displaylogo: false,
            toImageButtonOptions: {
                format: 'png',
                filename: 'thickness_plot',
                scale: 1
            }
        };
        
        // 清除之前的图表
        const plotDiv = document.getElementById('thickness-plot');
        Plotly.purge(plotDiv);
        
        // 创建新图表
        Plotly.newPlot('thickness-plot', plotData, layout, config).then(function() {
            console.log('Plotly图表创建完成');
            
            const plotDiv = document.getElementById('thickness-plot');
            
            // 确保图表完全适配容器
            setTimeout(() => {
                Plotly.Plots.resize(plotDiv);
                console.log('图表已调整为自适应尺寸');
            }, 100);
            
            // 绑定点击事件用于标注
            plotDiv.on('plotly_click', handlePlotClick);
            console.log('点击事件已绑定到厚度图');
            
            // 监听窗口大小变化
            window.addEventListener('resize', () => {
                Plotly.Plots.resize(plotDiv);
            });
        }).catch(error => {
            console.error('Plotly图表创建失败:', error);
            showStatusMessage('error', 'Plotly图表创建失败');
        });
        
        console.log('厚度图显示成功');
        
    } catch (error) {
        console.error('显示厚度图失败:', error);
        showStatusMessage('error', `显示厚度图失败: ${error.message}`);
    }
}

/**
 * 显示占位符图表
 */
function displayPlaceholderPlot() {
    const plotData = [{
        x: [0, 1, 2, 3, 4, 5],
        y: [0.2, 0.8, 1.0, 0.9, 0.5, 0.3],
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#bdc3c7', width: 2, dash: 'dot' },
        marker: { size: 8, color: '#95a5a6' },
        name: '示例数据'
    }];
    
    const layout = {
        title: {
            text: '请先完成计算以显示厚度图',
            font: { size: 16, color: '#7f8c8d' }
        },
        autosize: true,
        xaxis: { 
            title: 'X坐标 (μm)',
            gridcolor: '#e0e0e0'
        },
        yaxis: { 
            title: '厚度 (μm)',
            gridcolor: '#e0e0e0'
        },
        showlegend: false,
        margin: { l: 60, r: 30, t: 60, b: 60 },
        plot_bgcolor: '#f8f9fa',
        paper_bgcolor: 'white'
    };
    
    const config = {
        responsive: true,
        displayModeBar: false
    };
    
    Plotly.newPlot('thickness-plot', plotData, layout, config).then(() => {
        setTimeout(() => {
            Plotly.Plots.resize(document.getElementById('thickness-plot'));
        }, 100);
    });
}

/**
 * 处理图表点击事件
 */
function handlePlotClick(eventData) {
    console.log('图表被点击了', eventData);
    
    if (!isAnnotationMode) {
        console.log('未处于标注模式，忽略点击');
        showStatusMessage('info', '请先点击"开始标注"按钮进入标注模式');
        return;
    }
    
    if (!eventData || !eventData.points || eventData.points.length === 0) {
        console.log('未找到点击点数据');
        showStatusMessage('error', '无法获取点击位置信息');
        return;
    }
    
    const point = eventData.points[0];
    console.log('点击点数据:', point);
    
    // 获取点击位置的坐标
    let x, y, simulatedValue;
    
    if (point.x !== undefined && point.y !== undefined) {
        // 2D图表或有明确x,y坐标的情况
        x = point.x;
        y = point.y;
        simulatedValue = point.z !== undefined ? point.z : point.y;
    } else if (point.pointNumber !== undefined && point.x !== undefined) {
        // 1D图表情况
        x = point.x;
        y = 0;
        simulatedValue = point.y;
    } else if (point.pointNumber !== undefined) {
        // 只有点索引的情况
        x = point.pointNumber * 0.01; // 假设每个点间距0.01μm
        y = 0;
        simulatedValue = point.y || 0.5;
    } else {
        console.log('无法解析点击位置');
        showStatusMessage('error', '无法解析点击位置');
        return;
    }
    
    console.log(`解析的点击位置: x=${x}, y=${y}, simulatedValue=${simulatedValue}`);
    
    // 使用自定义弹窗替代原生prompt
    showAnnotationModal(x, y, simulatedValue);
}

/**
 * 添加标注
 */
function addAnnotation(x, y, simulatedValue, actualValue) {
    const annotation = {
        id: Date.now(),
        x: x,
        y: y,
        simulatedValue: simulatedValue,
        actualValue: actualValue,
        timestamp: new Date().toISOString()
    };
    
    annotations.push(annotation);
    updateAnnotationsList();
    updatePlotAnnotations();
    
    // 启用提交按钮
    const submitBtn = document.getElementById('submit-data');
    if (submitBtn && annotations.length > 0) {
        submitBtn.disabled = false;
    }
}

/**
 * 更新标注列表显示
 */
function updateAnnotationsList() {
    const list = document.getElementById('annotation-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    annotations.forEach(annotation => {
        const item = document.createElement('div');
        item.className = 'annotation-item';
        
        const coords = document.createElement('span');
        coords.className = 'annotation-coords';
        coords.textContent = `(${annotation.x.toFixed(2)}, ${annotation.y.toFixed(2)})`;
        
        const values = document.createElement('span');
        values.innerHTML = `模拟: ${annotation.simulatedValue.toFixed(3)} | 实测: <span class="annotation-value">${annotation.actualValue.toFixed(3)}</span>`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-annotation';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = () => removeAnnotation(annotation.id);
        
        item.appendChild(coords);
        item.appendChild(values);
        item.appendChild(deleteBtn);
        list.appendChild(item);
    });
}

/**
 * 更新图表上的标注显示
 */
function updatePlotAnnotations() {
    const plotDiv = document.getElementById('thickness-plot');
    if (!plotDiv || !plotDiv.data) {
        return;
    }
    
    // 如果没有标注，直接清除标注显示
    if (annotations.length === 0) {
        clearPlotAnnotations();
        return;
    }
    
    try {
        // 准备标注数据
        const simulatedPoints = {
            x: annotations.map(ann => ann.x),
            y: annotations.map(ann => ann.simulatedValue),
            mode: 'markers',
            type: 'scatter',
            name: '模拟值标注点',
            marker: {
                color: '#007bff',
                size: 10,
                symbol: 'circle',
                line: { color: 'white', width: 2 }
            },
            hovertemplate: 'X: %{x:.2f}μm<br>模拟值: %{y:.3f}μm<extra></extra>'
        };
        
        const actualPoints = {
            x: annotations.map(ann => ann.x),
            y: annotations.map(ann => ann.actualValue),
            mode: 'markers',
            type: 'scatter',
            name: '实际测量点',
            marker: {
                color: '#e74c3c',
                size: 10,
                symbol: 'diamond',
                line: { color: 'white', width: 2 }
            },
            hovertemplate: 'X: %{x:.2f}μm<br>实测值: %{y:.3f}μm<extra></extra>'
        };
        
        // 连接线数据
        const connectionLines = {
            x: [],
            y: [],
            mode: 'lines',
            type: 'scatter',
            name: '误差连线',
            line: {
                color: 'rgba(255, 165, 0, 0.6)',
                width: 2,
                dash: 'dot'
            },
            hoverinfo: 'none',
            showlegend: true
        };
        
        // 为每个标注点添加连接线
        annotations.forEach(ann => {
            connectionLines.x.push(ann.x, ann.x, null); // null用于断开线段
            connectionLines.y.push(ann.simulatedValue, ann.actualValue, null);
        });
        
        // 获取现有的数据
        const currentData = [...plotDiv.data];
        
        // 移除之前的标注层（如果存在）
        const filteredData = currentData.filter(trace => 
            !['模拟值标注点', '实际测量点', '误差连线'].includes(trace.name)
        );
        
        // 添加新的标注层
        const newData = [
            ...filteredData,
            simulatedPoints,
            actualPoints,
            connectionLines
        ];
        
        // 更新图表
        Plotly.react(plotDiv, newData, plotDiv.layout, plotDiv.config);
        
        console.log('图表标注已更新，标注点数量:', annotations.length);
        
    } catch (error) {
        console.error('更新图表标注失败:', error);
    }
}

/**
 * 移除标注
 */
function removeAnnotation(id) {
    annotations = annotations.filter(annotation => annotation.id !== id);
    updateAnnotationsList();
    updatePlotAnnotations();
    
    // 如果没有标注了，禁用提交按钮
    const submitBtn = document.getElementById('submit-data');
    if (submitBtn && annotations.length === 0) {
        submitBtn.disabled = true;
    }
}

/**
 * 切换标注模式
 */
function toggleAnnotationMode() {
    isAnnotationMode = !isAnnotationMode;
    
    const btn = document.getElementById('start-annotation');
    const indicator = document.getElementById('annotation-mode-indicator');
    
    if (isAnnotationMode) {
        btn.textContent = '停止标注';
        btn.className = 'btn btn-secondary';
        indicator.style.display = 'inline';
        console.log('标注模式已启用');
        showStatusMessage('info', '标注模式已启用，点击图表上的任意位置进行标注');
    } else {
        btn.textContent = '开始标注';
        btn.className = 'btn btn-primary';
        indicator.style.display = 'none';
        console.log('标注模式已关闭');
        showStatusMessage('info', '标注模式已关闭');
    }
}

/**
 * 清除所有标注
 */
function clearAllAnnotations() {
    if (annotations.length === 0) return;
    
    if (confirm('确定要清除所有标注吗？')) {
        annotations = [];
        updateAnnotationsList();
        clearPlotAnnotations(); // 清除图表上的标注显示
        
        const submitBtn = document.getElementById('submit-data');
        if (submitBtn) {
            submitBtn.disabled = true;
        }
    }
}

/**
 * 清除图表上的所有标注显示
 */
function clearPlotAnnotations() {
    const plotDiv = document.getElementById('thickness-plot');
    if (!plotDiv || !plotDiv.data) {
        return;
    }
    
    try {
        // 获取现有的数据，移除标注相关的图层
        const currentData = [...plotDiv.data];
        const filteredData = currentData.filter(trace => 
            !['模拟值标注点', '实际测量点', '误差连线'].includes(trace.name)
        );
        
        // 更新图表，只保留原始数据
        Plotly.react(plotDiv, filteredData, plotDiv.layout, plotDiv.config);
        console.log('图表标注已清除');
        
    } catch (error) {
        console.error('清除图表标注失败:', error);
    }
}

/**
 * 启用参数编辑
 */
function enableParameterEditing() {
    // 简单实现：让用户可以点击参数值进行编辑
    const values = document.querySelectorAll('.parameter-value');
    values.forEach(value => {
        value.contentEditable = true;
        value.style.background = '#fff3cd';
        value.style.border = '1px solid #ffeaa7';
        value.style.padding = '2px 4px';
        value.style.borderRadius = '3px';
    });
    
    showStatusMessage('info', '参数编辑已启用，点击参数值进行修改，修改后请刷新参数。');
}

/**
 * 提交验证数据
 */
async function submitValidationData() {
    if (!currentParameters || annotations.length === 0) {
        showStatusMessage('error', '请确保有参数配置和标注数据');
        return;
    }
    
    try {
        const submitData = {
            timestamp: new Date().toISOString(),
            parameters: currentParameters,
            annotations: annotations
        };
        
        showStatusMessage('info', '正在保存数据...');
        
        const response = await fetch('/api/save_validation_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submitData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            const totalRecords = result.data?.total_records || 0;
            showStatusMessage('success', `数据已成功保存到Excel文件。当前总记录数: ${totalRecords}`);
            
            // 清除当前标注，准备下一次标注
            annotations = [];
            updateAnnotationsList();
            clearPlotAnnotations(); // 清除图表上的标注显示
            document.getElementById('submit-data').disabled = true;
            
            // 检查是否可以训练模型
            if (totalRecords >= 5) {
                document.getElementById('train-model').disabled = false;
                showStatusMessage('info', '数据量足够，现在可以训练预测模型了。');
            }
        } else {
            showStatusMessage('error', result.message || '保存数据失败');
        }
    } catch (error) {
        console.error('提交数据失败:', error);
        showStatusMessage('error', '网络错误，请稍后重试');
    }
}

/**
 * 训练预测模型
 */
async function trainPredictionModel() {
    try {
        showStatusMessage('info', '正在训练模型，请稍候...');
        
        const response = await fetch('/api/train_model', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatusMessage('success', `模型训练完成！准确率: ${(result.accuracy * 100).toFixed(2)}%`);
            document.getElementById('predict-parameters').disabled = false;
        } else {
            showStatusMessage('error', result.message || '模型训练失败');
        }
    } catch (error) {
        console.error('训练模型失败:', error);
        showStatusMessage('error', '网络错误，请稍后重试');
    }
}

/**
 * 预测参数
 */
async function predictParameters() {
    // 这里实现参数预测功能
    showStatusMessage('info', '参数预测功能开发中...');
}

/**
 * 显示状态消息
 */
function showStatusMessage(type, message) {
    const statusDiv = document.getElementById('submit-status');
    if (!statusDiv) return;
    
    statusDiv.className = `status-message status-${type}`;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    
    // 5秒后自动隐藏
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

/**
 * 保存计算参数到本地存储（在单一计算页面调用）
 */
function saveCalculationParams(params, results) {
    try {
        console.log('保存计算参数:', params);
        console.log('保存计算结果:', results);
        
        localStorage.setItem('lastCalculationParams', JSON.stringify(params));
        localStorage.setItem('lastCalculationResults', JSON.stringify(results));
        
        console.log('参数和结果已保存到localStorage');
    } catch (error) {
        console.error('保存参数失败:', error);
    }
}

// 立即导出函数供其他页面使用
window.saveCalculationParams = saveCalculationParams;

// 确保函数在页面加载时就可用
if (typeof window !== 'undefined') {
    window.saveCalculationParams = saveCalculationParams;
}

/**
 * 显示自定义标注弹窗
 */
function showAnnotationModal(x, y, simulatedValue) {
    // 保存当前点击数据
    currentAnnotationData = { x, y, simulatedValue };
    
    // 更新弹窗内容
    const xCoordElement = document.getElementById('modal-x-coord');
    const simulatedValueElement = document.getElementById('modal-simulated-value');
    
    if (xCoordElement) {
        xCoordElement.textContent = `${x.toFixed(2)} μm`;
    }
    if (simulatedValueElement) {
        simulatedValueElement.textContent = `${simulatedValue.toFixed(3)} μm`;
    }
    
    // 设置输入框默认值
    const input = document.getElementById('actual-measurement');
    if (input) {
        input.value = simulatedValue.toFixed(3);
    }
    
    // 显示弹窗
    const modal = document.getElementById('annotation-modal');
    if (!modal) {
        console.error('找不到标注弹窗元素 annotation-modal');
        showStatusMessage('error', '标注弹窗初始化失败');
        return;
    }
    modal.style.display = 'block';
    
    // 点击外部关闭弹窗
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeAnnotationModal();
        }
    };
    
    // 延迟聚焦到输入框
    setTimeout(() => {
        if (input) {
            input.focus();
            input.select();
        }
    }, 300);
    
    // 绑定回车键确认
    if (input) {
        input.onkeypress = function(e) {
            if (e.key === 'Enter') {
                confirmAnnotation();
            } else if (e.key === 'Escape') {
                closeAnnotationModal();
            }
        };
    }
}

/**
 * 关闭标注弹窗
 */
function closeAnnotationModal() {
    const modal = document.getElementById('annotation-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // 清空输入框
    const input = document.getElementById('actual-measurement');
    if (input) {
        input.value = '';
    }
}

/**
 * 确认标注
 */
function confirmAnnotation() {
    const input = document.getElementById('actual-measurement');
    if (!input) {
        showStatusMessage('error', '找不到输入框元素');
        return;
    }
    
    const actualValue = input.value;
    if (actualValue === null || actualValue === '') {
        showStatusMessage('error', '请输入测量值');
        return;
    }
    
    const numValue = parseFloat(actualValue);
    if (isNaN(numValue) || numValue < 0) {
        showStatusMessage('error', '请输入有效的正数值');
        return;
    }
    
    // 添加标注
    addAnnotation(
        currentAnnotationData.x, 
        currentAnnotationData.y, 
        currentAnnotationData.simulatedValue, 
        numValue
    );
    
    console.log('添加标注成功');
    showStatusMessage('success', `标注添加成功: (${currentAnnotationData.x.toFixed(2)}, ${currentAnnotationData.y.toFixed(2)})`);
    
    // 关闭弹窗
    closeAnnotationModal();
}

/**
 * 显示手动添加标注弹窗
 */
function showManualAnnotationModal() {
    // 清空输入框
    const xCoordInput = document.getElementById('manual-x-coord');
    const measurementInput = document.getElementById('manual-actual-measurement');
    const simulatedValueElement = document.getElementById('manual-simulated-value');
    
    if (xCoordInput) xCoordInput.value = '';
    if (measurementInput) measurementInput.value = '';
    if (simulatedValueElement) simulatedValueElement.textContent = '--';
    
    // 显示弹窗
    const modal = document.getElementById('manual-annotation-modal');
    if (!modal) {
        console.error('找不到手动标注弹窗元素 manual-annotation-modal');
        showStatusMessage('error', '手动标注弹窗初始化失败');
        return;
    }
    modal.style.display = 'block';
    
    // 点击外部关闭弹窗
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeManualAnnotationModal();
        }
    };
    
    // 延迟聚焦到X坐标输入框
    setTimeout(() => {
        if (xCoordInput) {
            xCoordInput.focus();
        }
    }, 300);
}

/**
 * 关闭手动添加标注弹窗
 */
function closeManualAnnotationModal() {
    const modal = document.getElementById('manual-annotation-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // 清空输入框
    const xCoordInput = document.getElementById('manual-x-coord');
    const measurementInput = document.getElementById('manual-actual-measurement');
    const simulatedValueElement = document.getElementById('manual-simulated-value');
    
    if (xCoordInput) xCoordInput.value = '';
    if (measurementInput) measurementInput.value = '';
    if (simulatedValueElement) simulatedValueElement.textContent = '--';
}

/**
 * 计算模拟值（基于输入的X坐标）
 */
function calculateSimulatedValue() {
    const xCoordInput = document.getElementById('manual-x-coord');
    if (!xCoordInput) {
        showStatusMessage('error', '找不到X坐标输入框');
        return;
    }
    
    const xCoord = parseFloat(xCoordInput.value);
    if (isNaN(xCoord)) {
        showStatusMessage('error', '请输入有效的X坐标值');
        return;
    }
    
    // 这里应该调用后端API来计算模拟值
    // 暂时使用一个示例函数
    const simulatedValue = calculateThicknessAtPosition(xCoord, 0);
    const simulatedValueElement = document.getElementById('manual-simulated-value');
    if (simulatedValueElement) {
        simulatedValueElement.textContent = `${simulatedValue.toFixed(3)} μm`;
    }
}

/**
 * 计算指定位置的厚度值（插值）
 */
function calculateThicknessAtPosition(x, y) {
    console.log('计算位置厚度值:', { x, y, thicknessData, currentParameters });
    
    // 首先尝试从不同的数据源获取实际的厚度数组
    let actualThicknessArray = null;
    
    if (thicknessData) {
        // 尝试从多个可能的字段中获取厚度数据
        if (thicknessData.H_values && Array.isArray(thicknessData.H_values)) {
            actualThicknessArray = thicknessData.H_values;
            console.log('使用 H_values 数据，长度:', actualThicknessArray.length);
        } else if (thicknessData.thickness && Array.isArray(thicknessData.thickness)) {
            actualThicknessArray = thicknessData.thickness;
            console.log('使用 thickness 数据，长度:', actualThicknessArray.length);
        } else if (thicknessData.original_thickness && Array.isArray(thicknessData.original_thickness)) {
            actualThicknessArray = thicknessData.original_thickness;
            console.log('使用 original_thickness 数据，长度:', actualThicknessArray.length);
        } else if (Array.isArray(thicknessData)) {
            actualThicknessArray = thicknessData;
            console.log('直接使用 thicknessData 数组，长度:', actualThicknessArray.length);
        }
    }
    
    if (!actualThicknessArray || actualThicknessArray.length === 0) {
        console.warn('没有可用的厚度数据，返回默认值');
        return 0.5;
    }
    
    // 打印前几个数据值用于调试
    console.log('厚度数据前5个值:', actualThicknessArray.slice(0, 5));
    console.log('厚度数据最后5个值:', actualThicknessArray.slice(-5));
    
    try {
        // 获取X坐标范围
        let xCoords;
        if (currentParameters?.x_coords && Array.isArray(currentParameters.x_coords)) {
            xCoords = currentParameters.x_coords;
        } else {
            // 根据数据长度生成默认X坐标（假设从-1000到1000微米）
            const dataLength = actualThicknessArray.length;
            const xRange = 2000; // 总范围2000微米
            const xStart = -1000; // 起始位置-1000微米
            xCoords = Array.from({length: dataLength}, (_, i) => 
                xStart + (i / (dataLength - 1)) * xRange
            );
        }
        
        console.log('X坐标范围:', { min: Math.min(...xCoords), max: Math.max(...xCoords), length: xCoords.length });
        
        // 查找最接近的X坐标索引
        if (x <= xCoords[0]) {
            // 如果x小于最小值，返回第一个点的厚度
            console.log('X坐标小于最小值，返回第一个点的厚度:', actualThicknessArray[0]);
            return actualThicknessArray[0];
        }
        
        if (x >= xCoords[xCoords.length - 1]) {
            // 如果x大于最大值，返回最后一个点的厚度
            console.log('X坐标大于最大值，返回最后一个点的厚度:', actualThicknessArray[actualThicknessArray.length - 1]);
            return actualThicknessArray[actualThicknessArray.length - 1];
        }
        
        // 线性插值
        for (let i = 0; i < xCoords.length - 1; i++) {
            if (x >= xCoords[i] && x <= xCoords[i + 1]) {
                // 找到了包含x的区间，进行线性插值
                const x1 = xCoords[i];
                const x2 = xCoords[i + 1];
                const y1 = actualThicknessArray[i];
                const y2 = actualThicknessArray[i + 1];
                
                const interpolatedValue = y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
                console.log('线性插值结果:', { x1, x2, y1, y2, x, interpolatedValue });
                return interpolatedValue;
            }
        }
        
        // 如果没有找到合适的区间，返回最接近的点
        const distances = xCoords.map((xc, i) => ({ dist: Math.abs(xc - x), index: i }));
        distances.sort((a, b) => a.dist - b.dist);
        const closestIndex = distances[0].index;
        console.log('返回最接近点的厚度:', actualThicknessArray[closestIndex]);
        return actualThicknessArray[closestIndex];
        
    } catch (error) {
        console.error('计算厚度值时出错:', error);
        return 0.5; // 出错时返回默认值
    }
}

/**
 * 确认手动添加标注
 */
function confirmManualAnnotation() {
    const xInput = document.getElementById('manual-x-coord');
    const measurementInput = document.getElementById('manual-actual-measurement');
    const simulatedValueElement = document.getElementById('manual-simulated-value');
    
    if (!xInput || !measurementInput || !simulatedValueElement) {
        showStatusMessage('error', '找不到必要的输入框元素');
        return;
    }
    
    const xValue = parseFloat(xInput.value);
    const actualValue = parseFloat(measurementInput.value);
    const simulatedText = simulatedValueElement.textContent;
    
    if (isNaN(xValue)) {
        showStatusMessage('error', '请输入有效的X坐标值');
        return;
    }
    
    if (isNaN(actualValue) || actualValue < 0) {
        showStatusMessage('error', '请输入有效的实际测量值');
        return;
    }
    
    if (simulatedText === '--') {
        showStatusMessage('error', '请先点击"计算模拟值"按钮');
        return;
    }
    
    const simulatedValue = parseFloat(simulatedText.replace(' μm', ''));
    
    // 添加标注
    addAnnotation(xValue, 0, simulatedValue, actualValue);
    
    console.log('手动添加标注成功');
    showStatusMessage('success', `手动标注添加成功: X=${xValue.toFixed(2)}μm`);
    
    // 关闭弹窗
    closeManualAnnotationModal();
}

// Excel数据查看相关变量
let excelDataVisible = false;
let currentExcelData = null;
let currentPage = 1;
let pageSize = 20;
let searchTerm = '';
let sortBy = 'timestamp';
let sortOrder = 'desc';

/**
 * 切换Excel数据显示/隐藏
 */
function toggleExcelDataView() {
    const container = document.getElementById('excel-data-container');
    const button = document.getElementById('view-excel-data');
    
    if (!container || !button) return;
    
    if (excelDataVisible) {
        // 隐藏数据
        container.style.display = 'none';
        button.innerHTML = '<i class="fas fa-table"></i> 查看当前记录';
        button.className = 'btn btn-primary';
        excelDataVisible = false;
    } else {
        // 显示数据
        container.style.display = 'block';
        button.innerHTML = '<i class="fas fa-eye-slash"></i> 隐藏记录';
        button.className = 'btn btn-secondary';
        excelDataVisible = true;
        
        // 加载数据
        loadExcelData();
    }
}

/**
 * 刷新Excel数据
 */
function refreshExcelData() {
    if (excelDataVisible) {
        loadExcelData();
        showStatusMessage('info', '正在刷新数据...');
    }
}

/**
 * 加载Excel数据
 */
async function loadExcelData() {
    try {
        showStatusMessage('info', '正在加载验证记录...');
        
        // 构建查询参数
        const params = new URLSearchParams({
            page: currentPage,
            page_size: pageSize,
            sort_by: sortBy,
            sort_order: sortOrder
        });
        
        if (searchTerm) {
            params.append('search', searchTerm);
        }
        
        const response = await fetch(`/api/get_validation_records?${params}`);
        const result = await response.json();
        
        if (result.success) {
            currentExcelData = result.data;
            displayExcelData(result.data);
            updateRecordCount(result.data.total_count);
            showStatusMessage('success', `成功加载${result.data.total_count}条记录`);
        } else {
            showStatusMessage('error', result.message || '加载数据失败');
            displayNoDataMessage('加载数据失败: ' + (result.message || '未知错误'));
        }
    } catch (error) {
        console.error('加载Excel数据失败:', error);
        showStatusMessage('error', '网络错误，请稍后重试');
        displayNoDataMessage('网络错误，无法加载数据');
    }
}

/**
 * 根据内容重新排序列，有内容的列放前面，空列放后面
 */
function sortColumnsByContent(columns, records) {
    // 定义重要列的优先级（数字越小优先级越高）
    const columnPriority = {
        // 基础信息（最重要）
        'timestamp': 1,
        'model_type': 2,
        'sine_type': 3,
        
        // 标注坐标信息
        'annotation_x': 4,
        'annotation_y': 5,
        
        // 实验参数（光强、对比度等）
        'I_avg': 6,
        'V': 7,
        'K': 8,
        't_exp': 9,
        'exposure_calculation_method': 10,
        
        // 化学放大参数
        'acid_gen_efficiency': 11,
        'diffusion_length': 12,
        'reaction_rate': 13,
        'amplification': 14,
        'contrast': 15,
        
        // 三维空间频率参数
        'Kx': 16,
        'Ky': 17,
        'Kz': 18,
        'phi_expr': 19,
        
        // 标注结果（相对靠右）
        'simulated_value': 20,
        'actual_value': 21,
        'annotation_timestamp': 22,
        
        // 兼容旧字段
        'x_coord': 23,
        'y_coord': 24,
        'relative_error': 25,
        'C': 26,
        
        // 其他列默认优先级很低（空白列会排到最右边）
    };
    
    // 分析每列的内容丰富度
    const columnStats = {};
    
    columns.forEach(col => {
        let hasContent = 0;
        let totalValues = 0;
        
        records.forEach(record => {
            const value = record[col];
            totalValues++;
            if (value !== null && value !== undefined && value !== '') {
                // 特殊处理数字0 - 对于数值列，0是有效值
                if (value === 0 && (col.includes('value') || col.includes('coord') || col.includes('avg') || col.includes('exp'))) {
                    hasContent++;
                } else if (value !== 0) {
                    hasContent++;
                }
            }
        });
        
        const contentRatio = totalValues > 0 ? hasContent / totalValues : 0;
        const priority = columnPriority[col] || 999; // 未定义的列优先级很低
        
        columnStats[col] = {
            contentRatio,
            priority,
            hasContent: hasContent > 0
        };
    });
    
    // 排序逻辑：
    // 1. 有内容的列优先
    // 2. 按预定义的重要性排序
    // 3. 按内容丰富度排序
    const sortedColumns = columns.sort((a, b) => {
        const statsA = columnStats[a];
        const statsB = columnStats[b];
        
        // 首先按是否有内容排序
        if (statsA.hasContent !== statsB.hasContent) {
            return statsB.hasContent - statsA.hasContent; // 有内容的排前面
        }
        
        // 如果都有内容或都没有内容，按优先级排序
        if (statsA.priority !== statsB.priority) {
            return statsA.priority - statsB.priority; // 优先级高的排前面
        }
        
        // 最后按内容丰富度排序
        return statsB.contentRatio - statsA.contentRatio;
    });
    
    console.log('列排序结果:', sortedColumns.map(col => ({
        column: col,
        priority: columnStats[col].priority,
        contentRatio: columnStats[col].contentRatio,
        hasContent: columnStats[col].hasContent
    })));
    
    return sortedColumns;
}

/**
 * 显示Excel数据
 */
function displayExcelData(data) {
    const tableContainer = document.getElementById('excel-data-table');
    if (!tableContainer) return;
    
    if (!data.records || data.records.length === 0) {
        displayNoDataMessage('暂无验证记录');
        return;
    }
    
    let html = '';
    
    // 添加搜索和排序控件
    html += createControlsHtml();
    
    // 创建表格
    html += '<table class="excel-table">';
    
    // 表头
    html += '<thead><tr>';
    const originalColumns = data.columns || ['timestamp', 'model_type', 'x_coord', 'simulated_value', 'actual_value'];
    
    // 重新排序列：有内容的列放前面，空列放后面
    const columns = sortColumnsByContent(originalColumns, data.records);
    const columnHeaders = {
        // 基础信息
        'timestamp': '记录时间',
        'model_type': '模型类型',
        'sine_type': '正弦波类型',
        
        // 光强和曝光参数
        'I_avg': '平均光强',
        'V': '对比度',
        'K': '空间频率K',
        't_exp': '曝光时间 (s)',
        
        // 化学放大参数
        'acid_gen_efficiency': '酸产生效率',
        'diffusion_length': '扩散长度',
        'reaction_rate': '反应速率',
        'amplification': '放大倍数',
        'contrast': '对比度系数',
        
        // 三维空间频率参数
        'Kx': 'X方向频率',
        'Ky': 'Y方向频率', 
        'Kz': 'Z方向频率',
        'phi_expr': '相位表达式',
        
        // 曝光计算方法
        'exposure_calculation_method': '曝光计算方法',
        
        // 标注数据
        'annotation_x': '标注X坐标 (μm)',
        'annotation_y': '标注Y坐标 (μm)',
        'simulated_value': '模拟值 (mm)',
        'actual_value': '实测值 (mm)',
        'annotation_timestamp': '标注时间',
        
        // 兼容旧字段
        'x_coord': 'X坐标 (μm)',
        'y_coord': 'Y坐标 (μm)',
        'relative_error': '相对误差 (%)',
        'C': '光敏速率常数'
    };
    
    columns.forEach(col => {
        const headerText = columnHeaders[col] || col;
        const sortIcon = getSortIcon(col);
        html += `<th onclick="changeSortBy('${col}')" style="cursor: pointer;">
                    ${headerText} ${sortIcon}
                </th>`;
    });
    html += '<th>操作</th></tr></thead>';
    
    // 表格内容
    html += '<tbody>';
    data.records.forEach((record, index) => {
        html += '<tr>';
        columns.forEach(col => {
            let value = record[col] || '';
            let cellClass = '';
            
            // 格式化特殊列
            if (col === 'timestamp' && value) {
                cellClass = 'timestamp-cell';
                value = formatTimestamp(value);
            } else if (col.includes('coord')) {
                cellClass = 'coord-cell';
                value = typeof value === 'number' ? value.toFixed(3) : value;
            } else if (col.includes('value')) {
                if (col === 'simulated_value') {
                    cellClass = 'value-cell simulated-value';
                } else if (col === 'actual_value') {
                    cellClass = 'value-cell actual-value';
                }
                value = typeof value === 'number' ? value.toFixed(3) : value;
            } else if (typeof value === 'number') {
                value = value.toFixed(3);
            }
            
            // 限制参数列的显示长度
            if (col.includes('param') && typeof value === 'string' && value.length > 50) {
                cellClass += ' param-cell';
                value = value.substring(0, 50) + '...';
            }
            
            html += `<td class="${cellClass}" title="${record[col] || ''}">${value}</td>`;
        });
        
        // 操作列
        const actualIndex = (currentPage - 1) * pageSize + index;
        html += `<td>
                    <button class="delete-annotation" onclick="deleteRecord(${actualIndex})" title="删除此记录">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>`;
        html += '</tr>';
    });
    html += '</tbody></table>';
    
    // 添加分页控件
    html += createPaginationHtml(data);
    
    tableContainer.innerHTML = html;
}

/**
 * 创建控件HTML
 */
function createControlsHtml() {
    return `
        <div class="excel-controls">
            <div class="search-group">
                <div class="search-wrapper">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" id="search-input" class="search-input" 
                           placeholder="搜索记录..." 
                           value="${searchTerm}" 
                           onchange="updateSearch(this.value)"
                           oninput="updateSearch(this.value)">
                </div>
            </div>
            <div class="page-size-group">
                <label class="control-label">每页显示</label>
                <select class="page-size-select" onchange="updatePageSize(this.value)">
                    <option value="10" ${pageSize === 10 ? 'selected' : ''}>10条</option>
                    <option value="20" ${pageSize === 20 ? 'selected' : ''}>20条</option>
                    <option value="50" ${pageSize === 50 ? 'selected' : ''}>50条</option>
                    <option value="100" ${pageSize === 100 ? 'selected' : ''}>100条</option>
                </select>
            </div>
        </div>
    `;
}

/**
 * 创建分页HTML
 */
function createPaginationHtml(data) {
    if (data.total_pages <= 1) return '';
    
    let html = '<div class="pagination-container">';
    
    // 分页信息
    html += `<div class="pagination-info">
                <span class="record-info">共 ${data.total_count} 条记录</span>
                <span class="page-info">第 ${data.page} 页，共 ${data.total_pages} 页</span>
             </div>`;
    
    // 分页按钮
    html += '<div class="pagination-buttons">';
    
    // 上一页按钮
    if (data.page > 1) {
        html += `<button onclick="changePage(${data.page - 1})" class="page-btn page-btn-prev">
                    <i class="fas fa-chevron-left"></i> 上一页
                 </button>`;
    }
    
    // 页码显示
    const startPage = Math.max(1, data.page - 2);
    const endPage = Math.min(data.total_pages, data.page + 2);
    
    if (startPage > 1) {
        html += `<button onclick="changePage(1)" class="page-btn page-number">1</button>`;
        if (startPage > 2) html += '<span class="page-dots">...</span>';
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === data.page;
        html += `<button onclick="changePage(${i})" class="page-btn page-number ${isActive ? 'active' : ''}">${i}</button>`;
    }
    
    if (endPage < data.total_pages) {
        if (endPage < data.total_pages - 1) html += '<span class="page-dots">...</span>';
        html += `<button onclick="changePage(${data.total_pages})" class="page-btn page-number">${data.total_pages}</button>`;
    }
    
    // 下一页按钮
    if (data.page < data.total_pages) {
        html += `<button onclick="changePage(${data.page + 1})" class="page-btn page-btn-next">
                    下一页 <i class="fas fa-chevron-right"></i>
                 </button>`;
    }
    
    html += '</div>';
    html += '</div>';
    
    return html;
}



/**
 * 显示无数据消息
 */
function displayNoDataMessage(message) {
    const tableContainer = document.getElementById('excel-data-table');
    if (!tableContainer) return;
    
    tableContainer.innerHTML = `<div class="no-data-message">${message}</div>`;
}

/**
 * 更新记录数显示
 */
function updateRecordCount(count) {
    const badge = document.getElementById('record-count-badge');
    if (badge) {
        badge.textContent = `${count}条记录`;
    }
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch {
        return timestamp;
    }
}

/**
 * 获取排序图标
 */
function getSortIcon(column) {
    if (sortBy !== column) return '<i class="fas fa-sort" style="opacity: 0.3;"></i>';
    return sortOrder === 'asc' ? 
        '<i class="fas fa-sort-up" style="color: #20c997;"></i>' : 
        '<i class="fas fa-sort-down" style="color: #20c997;"></i>';
}

/**
 * 改变排序方式
 */
function changeSortBy(column) {
    if (sortBy === column) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        sortBy = column;
        sortOrder = 'desc';
    }
    currentPage = 1;
    loadExcelData();
}

/**
 * 更新搜索条件
 */
function updateSearch(value) {
    searchTerm = value.trim();
    currentPage = 1;
    loadExcelData();
}

/**
 * 更新页面大小
 */
function updatePageSize(size) {
    pageSize = parseInt(size);
    currentPage = 1;
    loadExcelData();
}

/**
 * 切换页面
 */
function changePage(page) {
    currentPage = page;
    loadExcelData();
}

/**
 * 删除记录
 */
async function deleteRecord(recordIndex) {
    if (!confirm('确定要删除这条记录吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        showStatusMessage('info', '正在删除记录...');
        
        const response = await fetch('/api/delete_validation_record', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ record_index: recordIndex })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatusMessage('success', '记录删除成功');
            // 重新加载数据
            loadExcelData();
        } else {
            showStatusMessage('error', result.message || '删除记录失败');
        }
    } catch (error) {
        console.error('删除记录失败:', error);
        showStatusMessage('error', '网络错误，请稍后重试');
    }
}

// 将函数暴露到全局作用域，供HTML调用
window.showAnnotationModal = showAnnotationModal;
window.closeAnnotationModal = closeAnnotationModal;
window.confirmAnnotation = confirmAnnotation;
window.showManualAnnotationModal = showManualAnnotationModal;
window.closeManualAnnotationModal = closeManualAnnotationModal;
window.calculateSimulatedValue = calculateSimulatedValue;
window.confirmManualAnnotation = confirmManualAnnotation;

// 新增的全局函数
window.toggleExcelDataView = toggleExcelDataView;
window.refreshExcelData = refreshExcelData;
window.changeSortBy = changeSortBy;
window.updateSearch = updateSearch;
window.updatePageSize = updatePageSize;
window.changePage = changePage;
window.deleteRecord = deleteRecord;

// 智能优化相关的全局变量
let selectedExposureOption = null;

/**
 * 显示智能优化输入弹窗
 */
function showOptimizationModal() {
    const modal = document.getElementById('optimization-modal');
    if (!modal) {
        console.error('找不到智能优化弹窗元素');
        showStatusMessage('error', '智能优化弹窗初始化失败');
        return;
    }
    
    // 重置输入值
    document.getElementById('target-x-coord').value = '0';
    document.getElementById('target-y-coord').value = '0';
    document.getElementById('target-thickness').value = '1.000';
    
    // 隐藏结果区域
    document.getElementById('optimization-results').style.display = 'none';
    selectedExposureOption = null;
    
    // 尝试加载当前参数（如果还没有的话）
    loadParametersIfNeeded();
    
    // 更新初始模拟厚度
    updateSimulatedThickness();
    
    modal.style.display = 'block';
    
    // 点击外部关闭弹窗
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeOptimizationModal();
        }
    };
    
    // 延迟聚焦到第一个输入框
    setTimeout(() => {
        const firstInput = document.getElementById('target-x-coord');
        if (firstInput) {
            firstInput.focus();
            firstInput.select();
        }
    }, 300);
}

/**
 * 关闭智能优化弹窗
 */
function closeOptimizationModal() {
    const modal = document.getElementById('optimization-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // 重置状态
    selectedExposureOption = null;
    document.getElementById('optimization-results').style.display = 'none';
}

/**
 * 执行智能优化
 */
async function performSmartOptimization() {
    try {
        // 获取输入值
        const targetX = parseFloat(document.getElementById('target-x-coord').value);
        const targetY = parseFloat(document.getElementById('target-y-coord').value);
        const targetThickness = parseFloat(document.getElementById('target-thickness').value);
        
        // 验证输入
        if (isNaN(targetX) || isNaN(targetY) || isNaN(targetThickness)) {
            showStatusMessage('error', '请输入有效的数值');
            return;
        }
        
        if (targetThickness <= 0) {
            showStatusMessage('error', '期望厚度必须大于0');
            return;
        }
        
        showStatusMessage('info', '正在进行智能优化，请稍候...');
        
        // 调用后端API
        const response = await fetch('/api/smart_optimize_exposure', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_x: targetX,
                target_y: targetY,
                target_thickness: targetThickness
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayOptimizationResults(result.data.exposure_options);
            showStatusMessage('success', '智能优化完成！请选择合适的曝光策略。');
        } else {
            showStatusMessage('error', result.message || '智能优化失败');
        }
        
    } catch (error) {
        console.error('智能优化失败:', error);
        showStatusMessage('error', '网络错误，请稍后重试');
    }
}

/**
 * 显示优化结果
 */
function displayOptimizationResults(exposureOptions) {
    const resultsContainer = document.getElementById('optimization-results');
    const optionsContainer = document.getElementById('exposure-options-container');
    
    if (!resultsContainer || !optionsContainer) {
        console.error('找不到结果显示容器');
        return;
    }
    
    // 清空之前的结果
    optionsContainer.innerHTML = '';
    selectedExposureOption = null;
    
    // 生成曝光选项
    exposureOptions.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'exposure-option';
        optionElement.dataset.type = option.type;
        optionElement.dataset.exposureTime = option.exposure_time;
        
        // 根据置信度设置不同的样式
        let confidenceColor = '#28a745';
        if (option.confidence === '中等') {
            confidenceColor = '#ffc107';
        } else if (option.confidence === '低') {
            confidenceColor = '#dc3545';
        }
        
        optionElement.innerHTML = `
            <div class="option-label">${option.label}</div>
            <div class="option-value">${option.exposure_time}s</div>
            <div class="option-description">${option.description}</div>
            <div style="margin-top: 8px; font-size: 0.8em;">
                <div style="color: ${confidenceColor}; font-weight: 600;">置信度: ${option.confidence}</div>
                <div style="color: #6c757d;">预测厚度: ${option.predicted_thickness}μm</div>
                <div style="color: #6c757d;">误差: ±${option.thickness_error}μm</div>
            </div>
        `;
        
        // 添加点击事件
        optionElement.addEventListener('click', () => {
            // 移除其他选项的选中状态
            document.querySelectorAll('.exposure-option').forEach(el => {
                el.classList.remove('selected');
            });
            
            // 选中当前选项
            optionElement.classList.add('selected');
            selectedExposureOption = option;
        });
        
        optionsContainer.appendChild(optionElement);
        
        // 默认选中第二个选项（标准策略）
        if (index === 1) {
            optionElement.classList.add('selected');
            selectedExposureOption = option;
        }
    });
    
    // 显示结果区域
    resultsContainer.style.display = 'block';
}

/**
 * 应用选择的曝光参数
 */
function applySelectedExposure() {
    if (!selectedExposureOption) {
        showStatusMessage('error', '请先选择一个曝光策略');
        return;
    }
    
    // 这里可以将优化的参数应用到主计算页面
    // 由于当前系统的限制，我们先显示一个信息提示
    const exposureTime = selectedExposureOption.exposure_time;
    const strategy = selectedExposureOption.label;
    
    showStatusMessage('success', 
        `已选择${strategy}，推荐曝光时间: ${exposureTime}s。请在单一计算页面手动设置此参数。`);
    
    // 可以考虑将参数保存到localStorage，供单一计算页面使用
    try {
        localStorage.setItem('recommendedExposureTime', exposureTime);
        localStorage.setItem('recommendedStrategy', strategy);
        console.log('推荐参数已保存到本地存储');
    } catch (error) {
        console.warn('无法保存推荐参数到本地存储:', error);
    }
    
    // 关闭弹窗
    closeOptimizationModal();
}

/**
 * 绑定智能优化相关的事件监听器
 */
function bindOptimizationEventListeners() {
    // 显示优化输入弹窗按钮
    const showOptBtn = document.getElementById('show-optimization-input');
    if (showOptBtn) {
        showOptBtn.addEventListener('click', showOptimizationModal);
    }
    
    // 智能优化按钮（快捷优化功能）
    const smartOptBtn = document.getElementById('smart-optimize');
    if (smartOptBtn) {
        smartOptBtn.addEventListener('click', performQuickOptimization);
    }
}

// 在页面初始化时绑定事件监听器
document.addEventListener('DOMContentLoaded', function() {
    bindOptimizationEventListeners();
});

/**
 * 快捷智能优化（自动使用默认参数）
 */
async function performQuickOptimization() {
    try {
        // 检查是否有当前参数数据，如果没有则尝试从后端获取
        if (!currentParameters) {
            console.log('当前参数为空，尝试从后端加载最新计算结果...');
            try {
                const response = await fetch('/api/latest_calculation');
                console.log('API响应状态:', response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log('API响应结果:', result);
                
                if (result.success && result.data) {
                    currentParameters = result.data.parameters;
                    thicknessData = result.data.results;
                    console.log('成功从后端加载参数:', currentParameters);
                } else {
                    showStatusMessage('error', result.message || '无当前参数配置，请先在单一计算页面完成一次计算');
                    return;
                }
            } catch (error) {
                console.error('获取后端参数失败:', error);
                showStatusMessage('error', `无法获取计算参数: ${error.message}`);
                return;
            }
        }
        
        // 使用默认参数进行快捷优化
        const defaultTargetX = 0;
        const defaultTargetY = 0;
        const defaultTargetThickness = 1.0;
        
        showStatusMessage('info', '正在进行快捷智能优化，使用默认参数...');
        
        console.log('准备调用智能优化API，参数:', {
            target_x: defaultTargetX,
            target_y: defaultTargetY,
            target_thickness: defaultTargetThickness
        });
        
        // 调用后端API
        const response = await fetch('/api/smart_optimize_exposure', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_x: defaultTargetX,
                target_y: defaultTargetY,
                target_thickness: defaultTargetThickness
            })
        });
        
        console.log('智能优化API响应状态:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API响应错误:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('智能优化API响应结果:', result);
        
        if (result.success) {
            const options = result.data.exposure_options;
            const optimalOption = options.find(opt => opt.type === 'optimal') || options[1];
            
            // 直接显示推荐结果
            showStatusMessage('success', 
                `快捷优化完成！推荐曝光时间: ${optimalOption.exposure_time}s (${optimalOption.label})。建议预测厚度: ${optimalOption.predicted_thickness}μm`);
            
            // 保存推荐参数
            try {
                localStorage.setItem('recommendedExposureTime', optimalOption.exposure_time);
                localStorage.setItem('recommendedStrategy', optimalOption.label);
                console.log('快捷优化参数已保存到本地存储');
            } catch (error) {
                console.warn('无法保存推荐参数到本地存储:', error);
            }
            
            // 如果用户想要查看详细选项，提示可以使用"开始优化"
            setTimeout(() => {
                showStatusMessage('info', '如需查看更多策略选项，请点击"自定义优化"按钮');
            }, 3000);
            
        } else {
            showStatusMessage('error', result.message || '快捷优化失败');
        }
        
    } catch (error) {
        console.error('快捷优化失败:', error);
        showStatusMessage('error', '网络错误，请稍后重试');
    }
}

/**
 * 如需要，加载参数数据
 */
async function loadParametersIfNeeded() {
    if (!currentParameters) {
        console.log('当前参数为空，尝试从后端加载最新计算结果...');
        try {
            const response = await fetch('/api/latest_calculation');
            const result = await response.json();
            if (result.success && result.data) {
                currentParameters = result.data.parameters;
                thicknessData = result.data.results;
                console.log('成功从后端加载参数:', currentParameters);
            }
        } catch (error) {
            console.error('获取后端参数失败:', error);
        }
    }
}

/**
 * 根据输入的坐标自动更新模拟厚度显示
 */
function updateSimulatedThickness() {
    const xInput = document.getElementById('target-x-coord');
    const yInput = document.getElementById('target-y-coord');
    const thicknessDisplay = document.getElementById('current-simulated-thickness');
    
    if (!xInput || !yInput || !thicknessDisplay) {
        return;
    }
    
    const x = parseFloat(xInput.value) || 0;
    const y = parseFloat(yInput.value) || 0;
    
    // 检查是否有数据
    if (!thicknessData || !currentParameters) {
        thicknessDisplay.textContent = '需要计算数据';
        thicknessDisplay.style.color = '#6c757d';
        return;
    }
    
    try {
        // 使用现有的计算函数
        const simulatedThickness = calculateThicknessAtPosition(x, y);
        thicknessDisplay.textContent = `${simulatedThickness.toFixed(3)} μm`;
        thicknessDisplay.style.color = '#20c997';
        
        // 自动填充期望厚度（可选）
        const targetThicknessInput = document.getElementById('target-thickness');
        if (targetThicknessInput && (targetThicknessInput.value === '' || targetThicknessInput.value === '1.000')) {
            targetThicknessInput.value = simulatedThickness.toFixed(3);
        }
        
    } catch (error) {
        console.error('计算模拟厚度失败:', error);
        thicknessDisplay.textContent = '计算失败';
        thicknessDisplay.style.color = '#dc3545';
    }
}

// 导出智能优化相关的全局函数
window.showOptimizationModal = showOptimizationModal;
window.closeOptimizationModal = closeOptimizationModal;
window.performSmartOptimization = performSmartOptimization;
window.applySelectedExposure = applySelectedExposure;
window.performQuickOptimization = performQuickOptimization;
window.updateSimulatedThickness = updateSimulatedThickness;