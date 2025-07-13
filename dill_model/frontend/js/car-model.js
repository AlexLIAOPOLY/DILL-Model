/**
 * CAR模型功能实现
 */

// 初始CAR模型参数
const defaultCarParams = {
    I_avg: 10,
    V: 0.8,
    K: 2,
    t_exp: 5,
    acid_gen_efficiency: 0.5,
    diffusion_length: 3,
    reaction_rate: 0.3,
    amplification: 10,
    contrast: 3
};

// 当前CAR模型参数
let currentCarParams = {...defaultCarParams};

// CAR模型参数范围和步长
const carParamRanges = {
    I_avg: { min: 1, max: 100, step: 0.1 },
    V: { min: 0, max: 1, step: 0.01 },
    K: { min: 0.1, max: 10, step: 0.1 },
    t_exp: { min: 0.1, max: 20, step: 0.1 },
    acid_gen_efficiency: { min: 0.01, max: 1, step: 0.01 },
    diffusion_length: { min: 0, max: 20, step: 0.1 },
    reaction_rate: { min: 0.01, max: 1, step: 0.01 },
    amplification: { min: 1, max: 50, step: 0.5 },
    contrast: { min: 0.1, max: 10, step: 0.1 }
};

// 初始化CAR模型界面
function initCarModel() {
    // 绑定参数滑块事件
    Object.keys(defaultCarParams).forEach(param => {
        const slider = document.getElementById(`car_${param}`);
        
        // 添加检查确保slider不是null
        if (!slider) {
            console.warn(`未找到ID为car_${param}的滑块元素`);
            return; // 跳过当前迭代
        }
        
        const numInput = slider.parentElement ? slider.parentElement.querySelector('input[type="number"]') : null;
        const valueDisplay = slider.parentElement && slider.parentElement.parentElement ? 
                            slider.parentElement.parentElement.querySelector('.parameter-value') : null;
        
        if (slider && numInput) {
            // 设置初始值
            slider.value = defaultCarParams[param];
            numInput.value = defaultCarParams[param];
            if (valueDisplay) {
                valueDisplay.textContent = defaultCarParams[param];
            }
            
            // 绑定滑块事件
            slider.addEventListener('input', function() {
                numInput.value = this.value;
                if (valueDisplay) {
                    valueDisplay.textContent = this.value;
                }
                currentCarParams[param] = parseFloat(this.value);
            });
            
            // 绑定数字输入框事件
            numInput.addEventListener('change', function() {
                const range = carParamRanges[param];
                let value = parseFloat(this.value);
                
                // 验证范围
                if (value < range.min) value = range.min;
                if (value > range.max) value = range.max;
                
                this.value = value;
                slider.value = value;
                if (valueDisplay) {
                    valueDisplay.textContent = value;
                }
                currentCarParams[param] = value;
            });
        }
    });
    
    // 绑定计算按钮事件（使用全局计算按钮）
    const calculateBtn = document.getElementById('calculate-btn');
    if (calculateBtn) {
        // 检查是否已经绑定了事件
        if (!calculateBtn.hasAttribute('data-car-bound')) {
            calculateBtn.setAttribute('data-car-bound', 'true');
            calculateBtn.addEventListener('click', function() {
                const modelType = document.getElementById('model-select').value;
                if (modelType === 'car') {
                    calculateCarModel();
                }
            });
        }
    }
    
    // 绑定4D动画启用复选框事件
    const enable4dCheckbox = document.getElementById('car_enable_4d_animation');
    const car4dParams = document.getElementById('car-4d-params');
    if (enable4dCheckbox && car4dParams) {
        // 初始状态
        car4dParams.style.display = enable4dCheckbox.checked ? 'block' : 'none';
        
        // 绑定变化事件
        enable4dCheckbox.addEventListener('change', function() {
            car4dParams.style.display = this.checked ? 'block' : 'none';
            
            // 如果取消勾选，立即隐藏4D动画区域
            if (!this.checked) {
                const animationSection = document.getElementById('car-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                    console.log('用户取消勾选4D动画，已隐藏动画区域');
                }
                // 停止当前播放的动画
                if (car4DAnimationState.intervalId) {
                    clearInterval(car4DAnimationState.intervalId);
                    car4DAnimationState.intervalId = null;
                    car4DAnimationState.isPlaying = false;
                }
            }
        });
    }
    
    // 显示工艺流程图 (未创建时不执行)
    renderCarProcessFlow();
}

// 渲染CAR工艺流程图
function renderCarProcessFlow() {
    const processContainer = document.getElementById('car-process-flow');
    if (!processContainer) return;
    
    const steps = [
        { icon: '☀️', desc: '曝光产生光酸' },
        { icon: '🔥', desc: '后烘扩散' },
        { icon: '⚛️', desc: '脱保护反应' },
        { icon: '💧', desc: '显影溶解' }
    ];
    
    let html = '<div class="car-process-diagram">';
    
    steps.forEach((step, index) => {
        html += `
            <div class="car-process-step">
                <div class="car-step-icon">${step.icon}</div>
                <div class="car-step-description">${step.desc}</div>
            </div>
        `;
        
        if (index < steps.length - 1) {
            html += '<div class="car-process-arrow">→</div>';
        }
    });
    
    html += '</div>';
    processContainer.innerHTML = html;
}

// 计算CAR模型
function calculateCarModel() {
    // 显示加载动画
    document.getElementById('loading').style.display = 'flex';
    
    // 自动刷新系统化日志
    if (window.systematicLogManager) {
        window.systematicLogManager.autoRefreshLogsOnCalculation();
    }
    
    // 获取4D动画参数
    const enable4dAnimation = document.getElementById('car_enable_4d_animation').checked;
    const sineType = document.getElementById('car-sine-type').value;
    
    // 准备API请求数据
    const requestData = {
        model_type: 'car',
        sine_type: sineType, // 始终设置正弦波类型
        ...currentCarParams
    };
    
    // 根据正弦波类型设置相应参数
    if (sineType === '3d') {
        // 获取3D参数
        requestData.Kx = parseFloat(document.getElementById('car_Kx_3d').value) || 2;
        requestData.Ky = parseFloat(document.getElementById('car_Ky_3d').value) || 1;
        requestData.Kz = parseFloat(document.getElementById('car_Kz_3d').value) || 1;
        requestData.phi_expr = document.getElementById('car_phi_expr_3d').value || 'sin(t)';
        
        // 获取3D范围参数
        const x_min = parseFloat(document.getElementById('car_x_min_3d').value) || 0;
        const x_max = parseFloat(document.getElementById('car_x_max_3d').value) || 10;
        const y_min = parseFloat(document.getElementById('car_y_min_3d').value) || 0;
        const y_max = parseFloat(document.getElementById('car_y_max_3d').value) || 10;
        const z_min = parseFloat(document.getElementById('car_z_min_3d').value) || 0;
        const z_max = parseFloat(document.getElementById('car_z_max_3d').value) || 10;
        
        requestData.x_range = [x_min, x_max];
        requestData.y_range = [y_min, y_max];
        requestData.z_range = [z_min, z_max];
        
        // 添加4D动画参数（仅在3D模式下且启用4D动画时）
        if (enable4dAnimation) {
            requestData.enable_4d_animation = true;
            requestData.t_start = parseFloat(document.getElementById('car_t_start').value) || 0;
            requestData.t_end = parseFloat(document.getElementById('car_t_end').value) || 5;
            requestData.time_steps = parseInt(document.getElementById('car_time_steps').value) || 20;
            requestData.animation_speed = parseInt(document.getElementById('car_animation_speed').value) || 500;
        }
    } else if (sineType === 'multi') {
        // 获取2D参数
        requestData.Kx = parseFloat(document.getElementById('car_Kx').value) || 2;
        requestData.Ky = parseFloat(document.getElementById('car_Ky').value) || 1;
        requestData.phi_expr = document.getElementById('car_phi_expr').value || '0';
        
        // 获取Y范围参数
        const y_min = parseFloat(document.getElementById('car_y_min').value) || 0;
        const y_max = parseFloat(document.getElementById('car_y_max').value) || 10;
        requestData.y_min = y_min;
        requestData.y_max = y_max;
        requestData.y_points = parseInt(document.getElementById('car_y_points').value) || 100;
    } else {
        // 1D模式，使用K参数
        requestData.K = parseFloat(document.getElementById('car_K').value) || 2;
    }
    
    // 发送API请求
    fetch('/api/calculate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayCarResults(data.data);
        } else {
            showErrorMessage(data.message || '计算失败');
        }
    })
    .catch(error => {
        showErrorMessage(`请求错误: ${error.message}`);
    })
    .finally(() => {
        // 隐藏加载动画
        document.getElementById('loading').style.display = 'none';
    });
    
    // 同时请求交互式数据
    fetch('/api/calculate_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 检查是否是4D动画数据并且用户勾选了4D动画选项
            const enable4dCheckbox = document.getElementById('car_enable_4d_animation');
            const currentSineType = document.getElementById('car-sine-type').value;
            
            if (data.data && data.data.enable_4d_animation && 
                enable4dCheckbox && enable4dCheckbox.checked && 
                currentSineType === '3d') {
                console.log('准备渲染4D动画：用户已勾选动画选项且为3D模式');
                render4DAnimation(data.data);
            } else {
                console.log('渲染常规CAR交互图表：未勾选动画或非3D模式');
                renderCarInteractivePlots(data.data);
                // 确保4D动画区域隐藏
                const animationSection = document.getElementById('car-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                }
            }
        }
    })
    .catch(error => {
        console.error('获取交互式数据失败:', error);
    });
}

// 显示CAR模型结果
function displayCarResults(results) {
    // 检查结果容器
    const resultsContainer = document.getElementById('car-results');
    if (!resultsContainer) return;
    
    // 保持结果容器可见，但内容处理由交互式图表函数负责
    console.log('CAR模型：计算完成，将通过交互式图表显示结果');
}

// 通用导出图片和数据函数
function addExportButtonsForPlot(plotDiv, plotName, xData, yData) {
    // 创建按钮容器
    const btnContainer = document.createElement('div');
    btnContainer.className = 'plot-export-btns';
    btnContainer.style.textAlign = 'center';
    btnContainer.style.margin = '10px 0 20px 0';
    // 导出图片按钮
    const exportImgBtn = document.createElement('button');
    exportImgBtn.textContent = '导出图片';
    exportImgBtn.onclick = function() {
        Plotly.downloadImage(plotDiv, {format: 'png', filename: plotName});
    };
    // 导出数据按钮
    const exportDataBtn = document.createElement('button');
    exportDataBtn.textContent = '导出数据';
    exportDataBtn.onclick = function() {
        let csv = 'x,y\n';
        for (let i = 0; i < xData.length; i++) {
            csv += `${xData[i]},${yData[i]}\n`;
        }
        let blob = new Blob([csv], {type: 'text/csv'});
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = plotName + '.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    btnContainer.appendChild(exportImgBtn);
    btnContainer.appendChild(exportDataBtn);
    // 插入到图表下方
    plotDiv.parentNode.insertBefore(btnContainer, plotDiv.nextSibling);
}

// 渲染交互式图表
function renderCarInteractivePlots(data) {
    const plotContainer = document.getElementById('car-interactive-plots');
    if (!plotContainer) return;
    
    // 检查是否为2D数据
    if (data && data.is_2d) {
        console.log('CAR模型：渲染2D热力图数据');
        plotContainer.style.display = 'block';
        
        // 清空容器
        plotContainer.innerHTML = '<div class="car-matrix-visualization"></div>';
        const matrixContainer = plotContainer.querySelector('.car-matrix-visualization');
        
        // 创建四个热力图面板
        const panelTitles = [
            '初始光酸分布 (2D)', 
            '扩散后光酸分布 (2D)', 
            '脱保护程度分布 (2D)', 
            '显影后光刻胶厚度 (2D)'
        ];
        
        const dataKeys = [
            'z_initial_acid', 
            'z_diffused_acid', 
            'z_deprotection', 
            'z_thickness'
        ];
        
        const colorScales = [
            'viridis',  // 初始光酸
            'viridis',  // 扩散后光酸
            'hot',      // 脱保护程度
            'plasma'    // 厚度
        ];
        
        const colorBarLabels = [
            '光酸浓度',
            '光酸浓度',
            '脱保护程度',
            '归一化厚度'
        ];
        
        // 创建2x2网格布局
        matrixContainer.style.display = 'grid';
        matrixContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
        matrixContainer.style.gap = '20px';
        matrixContainer.style.padding = '10px';
        
        // 添加每个热力图
        for (let i = 0; i < 4; i++) {
            const panelDiv = document.createElement('div');
            panelDiv.className = 'car-matrix-panel';
            panelDiv.style.backgroundColor = 'white';
            panelDiv.style.borderRadius = '8px';
            panelDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            panelDiv.style.padding = '15px';
            
            // 添加标题
            const titleDiv = document.createElement('div');
            titleDiv.className = 'car-result-title';
            titleDiv.textContent = panelTitles[i];
            panelDiv.appendChild(titleDiv);
            
            // 创建热力图容器
            const plotDiv = document.createElement('div');
            plotDiv.id = `car-plot-${i}`;
            plotDiv.style.width = '100%';
            plotDiv.style.height = '400px';
            panelDiv.appendChild(plotDiv);
            
            matrixContainer.appendChild(panelDiv);
            
            // 如果数据存在，创建热力图
            if (data[dataKeys[i]] && data.x_coords && data.y_coords) {
                // 创建热力图
                const heatmapData = [{
                    z: data[dataKeys[i]],
                    x: data.x_coords,
                    y: data.y_coords,
                    type: 'heatmap',
                    colorscale: colorScales[i],
                    colorbar: {
                        title: colorBarLabels[i],
                        titleside: 'right'
                    }
                }];
                
                const layout = {
                    title: panelTitles[i],
                    xaxis: {
                        title: '位置 (μm)'
                    },
                    yaxis: {
                        title: '位置 (μm)'
                    },
                    margin: {
                        l: 60,
                        r: 50,
                        b: 60,
                        t: 40
                    }
                };
                
                const config = {
                    responsive: true,
                    displayModeBar: true,
                    modeBarButtonsToRemove: ['lasso2d', 'select2d']
                };
                
                Plotly.newPlot(plotDiv, heatmapData, layout, config);
            }
        }
    } else if (data && !data.is_2d && !data.is_3d) {
        // 1D数据渲染逻辑
        plotContainer.style.display = 'block';
        plotContainer.innerHTML = '<div class="car-1d-visualization"></div>';
        const carVisualization = plotContainer.querySelector('.car-1d-visualization');
        
        // 创建2x2网格布局，与2D模式保持一致的风格
        carVisualization.style.display = 'grid';
        carVisualization.style.gridTemplateColumns = 'repeat(2, 1fr)';
        carVisualization.style.gap = '20px';
        carVisualization.style.padding = '10px';
        
        // 定义四个图表
        const plots = [
            { 
                id: 'car-1d-initial-acid', 
                title: '初始光酸分布 (1D)', 
                data: data.initial_acid, 
                color: 'green',
                yAxisTitle: '归一化光酸浓度'
            },
            { 
                id: 'car-1d-diffused-acid', 
                title: '扩散后光酸分布 (1D)', 
                data: data.diffused_acid, 
                color: 'blue',
                yAxisTitle: '归一化光酸浓度'
            },
            { 
                id: 'car-1d-deprotection', 
                title: '脱保护程度分布 (1D)', 
                data: data.deprotection, 
                color: 'red',
                yAxisTitle: '脱保护程度'
            },
            { 
                id: 'car-1d-thickness', 
                title: '显影后光刻胶厚度 (1D)', 
                data: data.thickness, 
                color: 'purple',
                yAxisTitle: '归一化厚度'
            }
        ];
        
        // 创建每个图表
        plots.forEach(plot => {
            // 创建图表面板
            const panelDiv = document.createElement('div');
            panelDiv.className = 'car-plot-panel';
            panelDiv.style.backgroundColor = 'white';
            panelDiv.style.borderRadius = '8px';
            panelDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            panelDiv.style.padding = '15px';
            panelDiv.style.transition = 'all 0.3s ease';
            
            // 添加标题
            const titleDiv = document.createElement('div');
            titleDiv.className = 'car-result-title';
            titleDiv.textContent = plot.title;
            panelDiv.appendChild(titleDiv);
            
            // 创建图表容器
            const plotDiv = document.createElement('div');
            plotDiv.id = plot.id;
            plotDiv.style.width = '100%';
            plotDiv.style.height = '300px';
            panelDiv.appendChild(plotDiv);
            
            // 移除导出图片按钮，用户不需要这个功能
            
            // 添加面板到容器
            carVisualization.appendChild(panelDiv);
            
            // 绘制图表
            const plotData = [{
                x: data.x,
                y: plot.data,
                type: 'scatter',
                mode: 'lines',
                line: {
                    color: plot.color,
                    width: 2
                },
                fill: plot.id === 'car-1d-thickness' ? 'tozeroy' : 'none',
                fillcolor: plot.id === 'car-1d-thickness' ? 'rgba(128, 0, 128, 0.2)' : undefined
            }];
            
            const layout = {
                title: {
                    text: plot.title,
                    font: {
                        size: 16,
                        family: 'Arial, "Microsoft YaHei", SimHei, sans-serif'
                    }
                },
                xaxis: {
                    title: '位置 (μm)',
                    showgrid: true,
                    gridcolor: '#eee'
                },
                yaxis: {
                    title: plot.yAxisTitle,
                    showgrid: true,
                    gridcolor: '#eee'
                },
                margin: {
                    l: 60,
                    r: 30,
                    b: 60,
                    t: 40
                },
                hovermode: 'closest'
            };
            
            const config = {
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: ['lasso2d', 'select2d']
            };
            
            Plotly.newPlot(plot.id, plotData, layout, config);
        });
    } else if (data && data.is_3d) {
        // 3D数据在另一个函数中处理
        console.log('CAR模型：3D数据将通过其他函数处理');
    } else {
        // 无有效数据
        plotContainer.style.display = 'none';
        plotContainer.innerHTML = '';
        console.log('CAR模型：无有效数据用于渲染');
    }
}

// 重置CAR模型参数
function resetCarParams() {
    // 重置参数到默认值
    Object.keys(defaultCarParams).forEach(param => {
        const slider = document.getElementById(`car_${param}`);
        const numInput = slider.parentElement.querySelector('input[type="number"]');
        const valueDisplay = slider.parentElement.parentElement.querySelector('.parameter-value');
        
        slider.value = defaultCarParams[param];
        numInput.value = defaultCarParams[param];
        if (valueDisplay) {
            valueDisplay.textContent = defaultCarParams[param];
        }
    });
    
    // 更新当前参数
    currentCarParams = {...defaultCarParams};
    
    // 清空结果
    const resultsContainer = document.getElementById('car-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="empty-results">点击"计算"按钮查看结果</div>';
    }
    
    // 清空交互式图表
    const plotContainer = document.getElementById('car-interactive-plots');
    if (plotContainer) {
        plotContainer.innerHTML = '';
    }
    
    // 清空4D动画状态和界面
    clear4DAnimationState();
}

/**
 * 清空4D动画状态和界面
 */
function clear4DAnimationState() {
    // 停止当前播放的动画
    if (car4DAnimationState.intervalId) {
        clearInterval(car4DAnimationState.intervalId);
        car4DAnimationState.intervalId = null;
    }
    
    // 重置动画状态
    car4DAnimationState.isPlaying = false;
    car4DAnimationState.currentFrame = 0;
    car4DAnimationState.totalFrames = 0;
    
    // 清空动画数据
    car4DAnimationData = null;
    
    // 隐藏4D动画区域
    const animationSection = document.getElementById('car-4d-animation-section');
    if (animationSection) {
        animationSection.style.display = 'none';
    }
    
    console.log('已清空4D动画状态和界面');
}

// 当页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否在CAR模型相关页面
    if (document.getElementById('car-params')) {
        initCarModel();
    }
    
    // 监听模型选择变化
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
        modelSelect.addEventListener('change', function() {
            if (this.value === 'car') {
                // 当切换到CAR模型时，确保初始化
                initCarModel();
                
                // 确保显示CAR相关容器
                const carParamsContainer = document.getElementById('car-params');
                if (carParamsContainer) {
                    carParamsContainer.style.display = 'block';
                }
                
                // 清空之前的结果
                const plotContainer = document.getElementById('car-interactive-plots');
                if (plotContainer) {
                    plotContainer.innerHTML = '';
                }
                
                // 隐藏4D动画区域
                const animationSection = document.getElementById('car-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                }
            }
        });
    }
});

// 保证 showSinglePointDetailsPopup 全局可用
if (typeof window.showSinglePointDetailsPopup !== 'function' && typeof showSinglePointDetailsPopup === 'function') {
    window.showSinglePointDetailsPopup = showSinglePointDetailsPopup;
}

// ==== 4D动画功能相关函数 ====

// 全局变量存储4D动画数据和状态
let car4DAnimationData = null;
let car4DAnimationState = {
    isPlaying: false,
    currentFrame: 0,
    totalFrames: 0,
    animationSpeed: 500,
    intervalId: null,
    loop: true // 新增循环状态，默认为开
};

/**
 * 显示错误消息
 * @param {string} message - 错误消息
 */
function showErrorMessage(message) {
    const errorContainer = document.getElementById('error-message');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // 3秒后自动隐藏
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 3000);
    } else {
        // 回退到alert
        alert(message);
    }
}

/**
 * 渲染4D动画主函数
 * @param {Object} data - 包含动画数据的对象
 */
function render4DAnimation(data) {
    console.log('CAR模型：开始渲染4D动画');
    
    // 保存动画数据
    car4DAnimationData = data;
    car4DAnimationState.totalFrames = data.initial_acid_frames ? data.initial_acid_frames.length : 0;
    car4DAnimationState.animationSpeed = 500; // 固定动画播放速度
    car4DAnimationState.currentFrame = 0;
    car4DAnimationState.isPlaying = false;
    
    if (car4DAnimationState.totalFrames === 0) {
        console.error('CAR模型：无有效的4D动画帧数据');
        return;
    }
    
    console.log(`CAR模型：4D动画数据加载成功，总帧数: ${car4DAnimationState.totalFrames}`);
    
    // 显示4D动画区域
    const animationSection = document.getElementById('car-4d-animation-section');
    if (animationSection) {
        animationSection.style.display = 'block';
    }
    
    // 显示4D动画控制界面
    setupCar4DAnimationUI();
    
    // 渲染初始帧（第0帧）
    updateCar4DAnimationFrame(0);
    
    console.log(`CAR模型：4D动画初始化完成，共${car4DAnimationState.totalFrames}帧`);
}

/**
 * 设置4D动画界面
 */
function setupCar4DAnimationUI() {
    const plotContainer = document.getElementById('car-4d-animation-container');
    if (!plotContainer) {
        console.error('CAR模型：未找到4D动画容器');
        return;
    }
    
    // 清空容器，直接在这里生成正确的图表ID
    plotContainer.innerHTML = `
        <div class="car-4d-plot-container">
            <h3>初始光酸分布 (3D+时间)</h3>
            <div id="car-4d-initial-acid" class="car-4d-plot"></div>
        </div>
        <div class="car-4d-plot-container">
            <h3>扩散后光酸分布 (3D+时间)</h3>
            <div id="car-4d-diffused-acid" class="car-4d-plot"></div>
        </div>
        <div class="car-4d-plot-container">
            <h3>脱保护程度分布 (3D+时间)</h3>
            <div id="car-4d-deprotection" class="car-4d-plot"></div>
        </div>
        <div class="car-4d-plot-container">
            <h3>显影后光刻胶厚度 (3D+时间)</h3>
            <div id="car-4d-thickness" class="car-4d-plot"></div>
        </div>
    `;
    
    // 重新绑定所有控制按钮的事件
    setupCar4DControlEvents();
}

/**
 * 防抖函数
 */
function debounceCarFrame(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// 防抖的CAR帧更新函数
const debouncedUpdateCarFrame = debounceCarFrame((frameIndex) => {
    updateCar4DAnimationFrame(frameIndex);
}, 100);

/**
 * 设置4D动画控制事件
 */
function setupCar4DControlEvents() {
    const playBtn = document.getElementById('car-4d-play-btn');
    const pauseBtn = document.getElementById('car-4d-pause-btn');
    const resetBtn = document.getElementById('car-4d-reset-btn');
    const loopBtn = document.getElementById('car-4d-loop-btn');
    const timeSlider = document.getElementById('car-4d-time-slider');

    // 清除旧的事件监听器
    if(playBtn) {
        playBtn.replaceWith(playBtn.cloneNode(true));
        const newPlayBtn = document.getElementById('car-4d-play-btn');
        newPlayBtn.addEventListener('click', playCar4DAnimation);
    }
    
    if(pauseBtn) {
        pauseBtn.replaceWith(pauseBtn.cloneNode(true));
        const newPauseBtn = document.getElementById('car-4d-pause-btn');
        newPauseBtn.addEventListener('click', pauseCar4DAnimation);
    }
    
    if(resetBtn) {
        resetBtn.replaceWith(resetBtn.cloneNode(true));
        const newResetBtn = document.getElementById('car-4d-reset-btn');
        newResetBtn.addEventListener('click', resetCar4DAnimation);
    }
    
    if(loopBtn) {
        loopBtn.replaceWith(loopBtn.cloneNode(true));
        const newLoopBtn = document.getElementById('car-4d-loop-btn');
        newLoopBtn.addEventListener('click', toggleLoopCar4DAnimation);
    }
    
    // 添加时间滑块事件监听器，使用防抖机制
    if(timeSlider) {
        timeSlider.replaceWith(timeSlider.cloneNode(true));
        const newTimeSlider = document.getElementById('car-4d-time-slider');
        
        let isUpdating = false;
        newTimeSlider.addEventListener('input', function() {
            if (isUpdating) return;
            // 暂停当前动画
            pauseCar4DAnimation();
            // 更新到选定帧（使用防抖）
            const frameIndex = parseInt(this.value);
            car4DAnimationState.currentFrame = frameIndex;
            debouncedUpdateCarFrame(frameIndex);
        });
        
        // 添加change事件确保最终状态正确
        newTimeSlider.addEventListener('change', function() {
            const frameIndex = parseInt(this.value);
            car4DAnimationState.currentFrame = frameIndex;
            isUpdating = true;
            updateCar4DAnimationFrame(frameIndex);
            setTimeout(() => { isUpdating = false; }, 50);
        });
    }
}

/**
 * 播放4D动画
 */
function playCar4DAnimation() {
    if (car4DAnimationState.isPlaying) return;
    
    // 如果动画已在结尾且未开启循环，则重置后再播放
    if (!car4DAnimationState.loop && car4DAnimationState.currentFrame >= car4DAnimationState.totalFrames - 1) {
        resetCar4DAnimation();
    }
    
    car4DAnimationState.isPlaying = true;
    updateCar4DAnimationButtons();
    updateCar4DStatusText('动画播放中...');

    car4DAnimationState.intervalId = setInterval(() => {
        let nextFrame = car4DAnimationState.currentFrame + 1;
        
        if (nextFrame >= car4DAnimationState.totalFrames) {
            if (car4DAnimationState.loop) {
                nextFrame = 0; // 循环播放
            } else {
                pauseCar4DAnimation(); // 播放到结尾则暂停
                car4DAnimationState.currentFrame = car4DAnimationState.totalFrames - 1; // 确保停在最后一帧
                updateCar4DAnimationFrame(car4DAnimationState.currentFrame);
                return;
            }
        }
        
        car4DAnimationState.currentFrame = nextFrame;
        updateCar4DAnimationFrame(car4DAnimationState.currentFrame);
    }, car4DAnimationState.animationSpeed);
}

/**
 * 暂停4D动画
 */
function pauseCar4DAnimation() {
    if (!car4DAnimationState.isPlaying) return;
    car4DAnimationState.isPlaying = false;
    clearInterval(car4DAnimationState.intervalId);
    car4DAnimationState.intervalId = null;
    updateCar4DAnimationButtons();
    updateCar4DStatusText('动画已暂停');
}

/**
 * 重置4D动画
 */
function resetCar4DAnimation() {
    pauseCar4DAnimation(); // 先暂停
    car4DAnimationState.currentFrame = 0;
    updateCar4DAnimationFrame(0);
    updateCar4DStatusText('动画已重置');
}

/**
 * 更新4D动画控制按钮的可见性和状态
 */
function updateCar4DAnimationButtons() {
    const playBtn = document.getElementById('car-4d-play-btn');
    const pauseBtn = document.getElementById('car-4d-pause-btn');
    if (playBtn && pauseBtn) {
        playBtn.style.display = car4DAnimationState.isPlaying ? 'none' : 'flex';
        pauseBtn.style.display = car4DAnimationState.isPlaying ? 'flex' : 'none';
    }
    
    // 更新状态指示器
    const statusIndicator = document.querySelector('.animation-status');
    if (statusIndicator) {
        // 移除所有状态类
        statusIndicator.classList.remove('status-playing', 'status-paused', 'status-stopped');
        
        // 添加当前状态类
        if (car4DAnimationState.isPlaying) {
            statusIndicator.classList.add('status-playing');
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i> 播放中';
        } else if (car4DAnimationState.currentFrame > 0) {
            statusIndicator.classList.add('status-paused');
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i> 已暂停';
        } else {
            statusIndicator.classList.add('status-stopped');
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i> 就绪';
        }
    }
}

/**
 * 更新状态文本
 * @param {string} status - 状态文本
 */
function updateCar4DStatusText(status) {
    // 更新状态指示器
    const statusIndicator = document.querySelector('.animation-status');
    if (statusIndicator) {
        // 根据状态文本设置样式
        if (status.includes('播放')) {
            statusIndicator.classList.remove('status-paused', 'status-stopped');
            statusIndicator.classList.add('status-playing');
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i> 播放中';
        } else if (status.includes('暂停')) {
            statusIndicator.classList.remove('status-playing', 'status-stopped');
            statusIndicator.classList.add('status-paused');
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i> 已暂停';
        } else if (status.includes('重置') || status.includes('就绪')) {
            statusIndicator.classList.remove('status-playing', 'status-paused');
            statusIndicator.classList.add('status-stopped');
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i> 就绪';
        }
    }
}

/**
 * 更新4D动画帧
 * @param {number} frameIndex - 帧索引
 */
function updateCar4DAnimationFrame(frameIndex) {
    if (!car4DAnimationData) {
        console.error('CAR模型：无4D动画数据');
        return;
    }
    
    // 检查数据结构 - 后端返回的是frames格式而不是animation_frames
    const initialAcidFrames = car4DAnimationData.initial_acid_frames;
    const diffusedAcidFrames = car4DAnimationData.diffused_acid_frames;
    const deprotectionFrames = car4DAnimationData.deprotection_frames;
    const thicknessFrames = car4DAnimationData.thickness_frames;
    const timeArray = car4DAnimationData.time_array;
    
    if (!initialAcidFrames || frameIndex >= initialAcidFrames.length) {
        console.error(`CAR模型：无效的帧索引(${frameIndex})，总帧数: ${initialAcidFrames ? initialAcidFrames.length : 0}`);
        return;
    }
    
    // 获取当前帧的时间值
    const timeValue = timeArray ? timeArray[frameIndex] : frameIndex;
    
    // 更新时间显示
    updateCar4DTimeDisplay(frameIndex, timeValue);
    
    // 配置Plotly选项
    const plotlyConfig = {
        responsive: true,
        toImageButtonOptions: {
            format: 'png',
            filename: `car_4d_frame_${frameIndex}`,
            scale: 1,
            width: 800,
            height: 600
        }
    };
    
    // 公共3D布局设置
    const common3DLayout = {
        scene: {
            camera: {
                eye: { x: 1.5, y: 1.5, z: 1.5 }
            },
            aspectmode: 'cube'
        },
        autosize: true,
        margin: { l: 0, r: 0, b: 0, t: 40 }
    };
    
    // 1. 更新初始光酸分布图
    if (initialAcidFrames && car4DAnimationData.x_coords && car4DAnimationData.y_coords) {
        const initialAcidData = [{
            type: 'surface',
            x: car4DAnimationData.x_coords,
            y: car4DAnimationData.y_coords,
            z: initialAcidFrames[frameIndex],
            colorscale: 'Viridis',
            contours: {
                z: {
                    show: true,
                    usecolormap: true,
                    highlightcolor: "#42f462",
                    project: { z: true }
                }
            },
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>光酸浓度: %{z}<extra></extra>'
        }];
        
        const initialAcidLayout = {
            ...common3DLayout,
            title: `初始光酸分布 (t=${timeValue.toFixed(2)}s)`,
            scene: {
                ...common3DLayout.scene,
                xaxis: { title: 'X位置(μm)' },
                yaxis: { title: 'Y位置(μm)' },
                zaxis: { title: '光酸浓度' }
            }
        };
        
        Plotly.newPlot('car-4d-initial-acid', initialAcidData, initialAcidLayout, plotlyConfig);
    }
    
    // 2. 更新扩散后光酸分布图
    if (diffusedAcidFrames && car4DAnimationData.x_coords && car4DAnimationData.y_coords) {
        const diffusedAcidData = [{
            type: 'surface',
            x: car4DAnimationData.x_coords,
            y: car4DAnimationData.y_coords,
            z: diffusedAcidFrames[frameIndex],
            colorscale: 'Viridis',
            contours: {
                z: {
                    show: true,
                    usecolormap: true,
                    highlightcolor: "#42f462",
                    project: { z: true }
                }
            },
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>扩散光酸浓度: %{z}<extra></extra>'
        }];
        
        const diffusedAcidLayout = {
            ...common3DLayout,
            title: `扩散后光酸分布 (t=${timeValue.toFixed(2)}s)`,
            scene: {
                ...common3DLayout.scene,
                xaxis: { title: 'X位置(μm)' },
                yaxis: { title: 'Y位置(μm)' },
                zaxis: { title: '光酸浓度' }
            }
        };
        
        Plotly.newPlot('car-4d-diffused-acid', diffusedAcidData, diffusedAcidLayout, plotlyConfig);
    }
    
    // 3. 更新脱保护程度分布图
    if (deprotectionFrames && car4DAnimationData.x_coords && car4DAnimationData.y_coords) {
        const deprotectionData = [{
            type: 'surface',
            x: car4DAnimationData.x_coords,
            y: car4DAnimationData.y_coords,
            z: deprotectionFrames[frameIndex],
            colorscale: 'YlOrRd',
            contours: {
                z: {
                    show: true,
                    usecolormap: true,
                    highlightcolor: "#42f462",
                    project: { z: true }
                }
            },
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>脱保护程度: %{z}<extra></extra>'
        }];
        
        const deprotectionLayout = {
            ...common3DLayout,
            title: `脱保护程度分布 (t=${timeValue.toFixed(2)}s)`,
            scene: {
                ...common3DLayout.scene,
                xaxis: { title: 'X位置(μm)' },
                yaxis: { title: 'Y位置(μm)' },
                zaxis: { title: '脱保护程度' }
            }
        };
        
        Plotly.newPlot('car-4d-deprotection', deprotectionData, deprotectionLayout, plotlyConfig);
    }
    
    // 4. 更新光刻胶厚度分布图
    if (thicknessFrames && car4DAnimationData.x_coords && car4DAnimationData.y_coords) {
        const thicknessData = [{
            type: 'surface',
            x: car4DAnimationData.x_coords,
            y: car4DAnimationData.y_coords,
            z: thicknessFrames[frameIndex],
            colorscale: 'Plasma',
            contours: {
                z: {
                    show: true,
                    usecolormap: true,
                    highlightcolor: "#42f462",
                    project: { z: true }
                }
            },
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>相对厚度: %{z}<extra></extra>'
        }];
        
        const thicknessLayout = {
            ...common3DLayout,
            title: `显影后光刻胶厚度 (t=${timeValue.toFixed(2)}s)`,
            scene: {
                ...common3DLayout.scene,
                xaxis: { title: 'X位置(μm)' },
                yaxis: { title: 'Y位置(μm)' },
                zaxis: { title: '相对厚度' }
            }
        };
        
        Plotly.newPlot('car-4d-thickness', thicknessData, thicknessLayout, plotlyConfig);
    }
}

/**
 * 更新时间显示
 * @param {number} frameIndex - 当前帧索引
 * @param {number} timeValue - 当前时间值
 */
function updateCar4DTimeDisplay(frameIndex, timeValue) {
    // 更新时间显示
    const timeDisplay = document.getElementById('car-4d-time-display');
    if (timeDisplay) {
        timeDisplay.textContent = `t = ${timeValue.toFixed(2)}s`;
    }
    
    // 更新帧信息
    const frameInfo = document.getElementById('car-4d-frame-info');
    if (frameInfo && car4DAnimationData) {
        frameInfo.textContent = `帧 ${frameIndex + 1}/${car4DAnimationData.time_steps || car4DAnimationData.initial_acid_frames.length}`;
    }
    
    // 更新滑块位置
    const timeSlider = document.getElementById('car-4d-time-slider');
    if (timeSlider) {
        timeSlider.value = frameIndex;
        
        // 确保滑块的最大值与总帧数一致
        if (car4DAnimationData) {
            const totalFrames = car4DAnimationData.time_steps || car4DAnimationData.initial_acid_frames.length;
            timeSlider.max = totalFrames - 1;
        }
    }
}

/**
 * 新增：切换循环播放状态
 */
function toggleLoopCar4DAnimation() {
    car4DAnimationState.loop = !car4DAnimationState.loop;
    const loopBtn = document.getElementById('car-4d-loop-btn');
    if (loopBtn) {
        const textSpan = loopBtn.querySelector('span');
        if (car4DAnimationState.loop) {
            if (textSpan) textSpan.textContent = '关闭循环';
            loopBtn.classList.remove('loop-off');
            loopBtn.setAttribute('title', '关闭循环播放');
        } else {
            if (textSpan) textSpan.textContent = '开启循环';
            loopBtn.classList.add('loop-off');
            loopBtn.setAttribute('title', '开启循环播放');
        }
    }
}