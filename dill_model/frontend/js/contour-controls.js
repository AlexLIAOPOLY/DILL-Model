/**
 * 等高线和网格线控制功能
 * 为2D热力图添加显示/隐藏等高线和网格线的按钮
 */

// 全局状态管理
let contourStates = new Map(); // 存储每个图表的等高线状态
let gridStates = new Map(); // 存储每个图表的网格线状态

/**
 * 为热力图容器添加控制按钮（等高线和网格线）
 * @param {HTMLElement} container - 热力图容器
 * @param {Object} plotData - 绘图数据
 * @param {String} chartType - 图表类型 ('exposure', 'thickness')
 */
function addContourControl(container, plotData, chartType) {
    // 检查是否已经添加了控制按钮
    if (container.querySelector('.chart-controls')) {
        return;
    }
    
    // 获取图表ID用于状态管理
    const chartId = container.id || `chart_${chartType}_${Date.now()}`;
    
    // 检查初始状态 - 默认等高线是显示的（因为热力图默认包含contour轨迹）
    let isContourVisible = contourStates.get(chartId) !== undefined ? contourStates.get(chartId) : true;
    let isGridVisible = gridStates.get(chartId) !== undefined ? gridStates.get(chartId) : true;
    
    // 设置初始状态
    contourStates.set(chartId, isContourVisible);
    gridStates.set(chartId, isGridVisible);
    
    // 创建控制按钮容器
    const controlContainer = document.createElement('div');
    controlContainer.className = 'chart-controls';
    controlContainer.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 1000;
        pointer-events: none;
        display: flex;
        gap: 8px;
    `;
    
    // 创建等高线切换按钮
    const contourBtn = document.createElement('button');
    contourBtn.className = 'contour-toggle-btn';
    contourBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 15s4-8 8-8 8 8 8 8"></path>
            <path d="M3 20s4-8 8-8 8 8 8 8"></path>
        </svg>
    `;
    contourBtn.title = '显示/隐藏等高线';
    
    // 创建网格线切换按钮
    const gridBtn = document.createElement('button');
    gridBtn.className = 'grid-toggle-btn';
    gridBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
            <line x1="15" y1="3" x2="15" y2="21"></line>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="3" y1="15" x2="21" y2="15"></line>
        </svg>
    `;
    gridBtn.title = '显示/隐藏网格线';
    
    // 按钮样式
    const buttonStyle = `
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        width: 36px;
        height: 36px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        pointer-events: auto;
        color: #333;
    `;
    
    contourBtn.style.cssText = buttonStyle;
    gridBtn.style.cssText = buttonStyle;
    
    // 悬停效果函数
    function addHoverEffects(btn) {
        btn.addEventListener('mouseenter', () => {
            btn.style.background = 'rgba(255, 255, 255, 1)';
            btn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        });
        
        btn.addEventListener('mouseleave', () => {
            // 恢复到当前状态的背景色
            const isActive = btn === contourBtn ? isContourVisible : isGridVisible;
            btn.style.background = isActive ? 'rgba(52, 152, 219, 0.9)' : 'rgba(255, 255, 255, 0.9)';
            btn.style.boxShadow = 'none';
        });
    }
    
    addHoverEffects(contourBtn);
    addHoverEffects(gridBtn);
    
    // 更新按钮状态
    function updateButtonStates() {
        // 等高线按钮
        if (isContourVisible) {
            contourBtn.style.background = 'rgba(52, 152, 219, 0.9)';
            contourBtn.style.color = 'white';
            contourBtn.title = '隐藏等高线';
        } else {
            contourBtn.style.background = 'rgba(255, 255, 255, 0.9)';
            contourBtn.style.color = '#333';
            contourBtn.title = '显示等高线';
        }
        
        // 网格线按钮
        if (isGridVisible) {
            gridBtn.style.background = 'rgba(52, 152, 219, 0.9)';
            gridBtn.style.color = 'white';
            gridBtn.title = '隐藏网格线';
        } else {
            gridBtn.style.background = 'rgba(255, 255, 255, 0.9)';
            gridBtn.style.color = '#333';
            gridBtn.title = '显示网格线';
        }
    }
    
    // 等高线切换功能
    contourBtn.addEventListener('click', () => {
        isContourVisible = !isContourVisible;
        contourStates.set(chartId, isContourVisible);
        updateButtonStates();
        toggleContourLines(container, plotData, chartType, isContourVisible);
    });
    
    // 网格线切换功能
    gridBtn.addEventListener('click', () => {
        isGridVisible = !isGridVisible;
        gridStates.set(chartId, isGridVisible);
        updateButtonStates();
        toggleGridLines(container, plotData, chartType, isGridVisible);
    });
    
    // 初始化按钮状态
    updateButtonStates();
    
    // 组装控制容器
    controlContainer.appendChild(contourBtn);
    controlContainer.appendChild(gridBtn);
    
    // 初始化时应用默认状态 - 使用延时确保图表已完全渲染
    setTimeout(() => {
        if (isGridVisible) {
            toggleGridLines(container, plotData, chartType, true);
        }
        // 等高线默认已经在Plotly创建时显示，无需重新切换
    }, 100);
    
    // 添加到图表容器
    const plotlyContainer = container.querySelector('.plotly-graph-div') || container;
    if (plotlyContainer.style.position !== 'relative' && plotlyContainer.style.position !== 'absolute') {
        plotlyContainer.style.position = 'relative';
    }
    plotlyContainer.appendChild(controlContainer);
    
    // 鼠标进入图表区域时显示控制按钮
    plotlyContainer.addEventListener('mouseenter', () => {
        controlContainer.style.opacity = '1';
    });
    
    // 鼠标离开图表区域时隐藏控制按钮
    plotlyContainer.addEventListener('mouseleave', () => {
        controlContainer.style.opacity = '0';
    });
}

/**
 * 切换等高线显示（控制现有的轮廓线轨迹）
 * @param {HTMLElement} container - 图表容器
 * @param {Object} plotData - 绘图数据  
 * @param {String} chartType - 图表类型
 * @param {Boolean} showContour - 是否显示等高线
 */
function toggleContourLines(container, plotData, chartType, showContour) {
    try {
        if (!container || !plotData) {
            console.warn('toggleContourLines: 缺少必要参数');
            return;
        }
        
        // 获取当前的绘图数据
        const plotlyDiv = container.querySelector('.plotly-graph-div') || container;
        
        if (!plotlyDiv.data) {
            console.warn('toggleContourLines: 无法找到Plotly数据');
            return;
        }
        
        // 找到轮廓线轨迹（type为contour的轨迹）
        const contourTraceIndex = plotlyDiv.data.findIndex(trace => trace.type === 'contour');
        
        if (contourTraceIndex !== -1) {
            // 更新现有轮廓线轨迹的可见性
            const update = {
                visible: showContour
            };
            
            Plotly.restyle(plotlyDiv, update, contourTraceIndex);
            console.log(`✅ 等高线${showContour ? '已显示' : '已隐藏'}`);
        } else {
            console.warn('未找到轮廓线轨迹');
        }
        
    } catch (error) {
        console.error('切换等高线时发生错误:', error);
    }
}

/**
 * 切换网格线显示
 * @param {HTMLElement} container - 图表容器
 * @param {Object} plotData - 绘图数据  
 * @param {String} chartType - 图表类型
 * @param {Boolean} showGrid - 是否显示网格线
 */
function toggleGridLines(container, plotData, chartType, showGrid) {
    try {
        if (!container || !plotData) {
            console.warn('toggleGridLines: 缺少必要参数');
            return;
        }
        
        // 获取当前的绘图数据
        const plotlyDiv = container.querySelector('.plotly-graph-div') || container;
        
        if (!plotlyDiv.data || !plotlyDiv.data[0]) {
            console.warn('toggleGridLines: 无法找到Plotly数据');
            return;
        }
        
        const heatmapTrace = plotlyDiv.data[0];
        
        if (showGrid) {
            // 创建自定义网格线
            const xCoords = heatmapTrace.x;
            const yCoords = heatmapTrace.y;
            
            // 确定网格线的间隔 - 更密集的网格
            const xStep = Math.ceil(xCoords.length / 25); // 大约25条垂直线
            const yStep = Math.ceil(yCoords.length / 25); // 大约25条水平线
            
            const gridTraces = [];
            
            // 创建垂直网格线
            for (let i = 0; i < xCoords.length; i += xStep) {
                gridTraces.push({
                    x: [xCoords[i], xCoords[i]],
                    y: [yCoords[0], yCoords[yCoords.length - 1]],
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(255, 255, 255, 0.2)', // 更淡的乳白色，适应密集网格
                        width: 0.8
                    },
                    showlegend: false,
                    hoverinfo: 'skip',
                    name: 'grid-line'
                });
            }
            
            // 创建水平网格线
            for (let i = 0; i < yCoords.length; i += yStep) {
                gridTraces.push({
                    x: [xCoords[0], xCoords[xCoords.length - 1]],
                    y: [yCoords[i], yCoords[i]],
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(255, 255, 255, 0.2)', // 更淡的乳白色，适应密集网格
                        width: 0.8
                    },
                    showlegend: false,
                    hoverinfo: 'skip',
                    name: 'grid-line'
                });
            }
            
            // 保存原始数据范围
            const originalXRange = [xCoords[0], xCoords[xCoords.length - 1]];
            const originalYRange = [yCoords[0], yCoords[yCoords.length - 1]];
            
            // 添加网格线轨迹，并保持原始布局
            Plotly.addTraces(plotlyDiv, gridTraces).then(() => {
                // 强制保持原始数据范围
                Plotly.relayout(plotlyDiv, {
                    'xaxis.range': originalXRange,
                    'yaxis.range': originalYRange,
                    'xaxis.autorange': false,
                    'yaxis.autorange': false
                });
            });
            console.log('✅ 网格线已显示');
        } else {
            // 移除所有网格线轨迹
            const traceIndices = [];
            plotlyDiv.data.forEach((trace, index) => {
                if (trace.name === 'grid-line') {
                    traceIndices.push(index);
                }
            });
            
            if (traceIndices.length > 0) {
                // 保存原始数据范围
                const originalXRange = [heatmapTrace.x[0], heatmapTrace.x[heatmapTrace.x.length - 1]];
                const originalYRange = [heatmapTrace.y[0], heatmapTrace.y[heatmapTrace.y.length - 1]];
                
                Plotly.deleteTraces(plotlyDiv, traceIndices).then(() => {
                    // 恢复原始数据范围
                    Plotly.relayout(plotlyDiv, {
                        'xaxis.range': originalXRange,
                        'yaxis.range': originalYRange,
                        'xaxis.autorange': false,
                        'yaxis.autorange': false
                    });
                });
                console.log('✅ 网格线已隐藏');
            }
        }
        
    } catch (error) {
        console.error('切换网格线时发生错误:', error);
    }
}

/**
 * 清理容器中的控制按钮
 * @param {HTMLElement} container - 图表容器
 */
function removeContourControl(container) {
    const control = container.querySelector('.chart-controls');
    if (control) {
        control.remove();
    }
}

// 导出函数供其他脚本使用
window.contourControls = {
    addContourControl,
    toggleContourLines,
    toggleGridLines,
    removeContourControl,
    contourStates,
    gridStates
};