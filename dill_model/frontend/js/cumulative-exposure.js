/**
 * 多段曝光时间累积功能
 * 提供多段曝光时间累积模式的功能支持
 */

// 多段曝光时间累积模式全局变量
let cumulativeExposureSegments = {
    segmentCount: 5,
    segmentDuration: 1,
    intensities: [], // 存储各段光强值
    activeSegmentIndex: -1, // 当前活跃的段落索引
    timeMode: 'fixed', // 时间模式：fixed（固定时间段）或 custom（自定义时间点）
    customTimePoints: [], // 自定义时间点数组
    totalExposureDose: 0 // 总曝光计量
};

/**
 * 初始化曝光计量计算方式选择器
 */
function initExposureCalculationMethodSelector() {
    const methodSelect = document.getElementById('exposure_calculation_method');
    const standardContainer = document.getElementById('standard_exposure_time_container');
    const cumulativeContainer = document.getElementById('cumulative_exposure_container');
    const exposureTimeWindowControl = document.getElementById('exposure-time-window-control');
    const generateBtn = document.getElementById('generate_segments_btn');
    const fixedTimeSettings = document.getElementById('fixed-time-settings');
    
    // 获取1D时间动画控制和1D V评估控制元素
    const timeAnimationControl = document.getElementById('dill-1d-animation-params-container');
    const vEvaluationControl = document.getElementById('dill-1d-v-evaluation-params-container');
    
    // 如果元素不存在，直接返回
    if (!methodSelect || !standardContainer || !cumulativeContainer) {
        console.warn('曝光计量计算方式相关DOM元素未找到');
        return;
    }
    
    // 初始化时间模式选择器
    initTimeModeSwitcher();
    
    // 初始化时根据当前选项设置控件状态
    const initialMethod = methodSelect.value;
    if (initialMethod === 'cumulative') {
        // 多段曝光时间累积模式
        standardContainer.style.display = 'none';
        cumulativeContainer.style.display = 'block';
        
        // 隐藏曝光时间窗口控制
        if (exposureTimeWindowControl) {
            exposureTimeWindowControl.style.display = 'none';
        }
        
        // 隐藏1D时间动画控制和1D V评估控制
        if (timeAnimationControl) {
            timeAnimationControl.style.display = 'none';
        }
        
        if (vEvaluationControl) {
            vEvaluationControl.style.display = 'none';
        }
        
        // 检查是否需要初始化段落输入框
        if (cumulativeExposureSegments.intensities.length === 0) {
            generateSegmentInputs();
        }
    }
    
    // 监听选择变化
    methodSelect.addEventListener('change', function() {
        const method = this.value;
        
        if (method === 'standard') {
            // 标准模式
            standardContainer.style.display = 'block';
            cumulativeContainer.style.display = 'none';
            
            // 显示曝光时间窗口控制
            if (exposureTimeWindowControl) {
                exposureTimeWindowControl.style.display = 'block';
            }
            
            // 显示1D时间动画控制和1D V评估控制
            if (timeAnimationControl) {
                timeAnimationControl.style.display = 'block';
            }
            
            if (vEvaluationControl) {
                vEvaluationControl.style.display = 'block';
            }
            
        } else if (method === 'cumulative') {
            // 多段曝光时间累积模式
            standardContainer.style.display = 'none';
            cumulativeContainer.style.display = 'block';
            
            // 隐藏曝光时间窗口控制
            if (exposureTimeWindowControl) {
                exposureTimeWindowControl.style.display = 'none';
            }
            
            // 隐藏1D时间动画控制和1D V评估控制
            if (timeAnimationControl) {
                timeAnimationControl.style.display = 'none';
            }
            
            if (vEvaluationControl) {
                vEvaluationControl.style.display = 'none';
            }
            
            // 检查是否需要初始化段落输入框
            if (cumulativeExposureSegments.intensities.length === 0) {
                generateSegmentInputs();
            }
        }
    });
    
    // 段数和单段时间长度输入框事件
    const segmentCountInput = document.getElementById('segment_count');
    const segmentDurationInput = document.getElementById('segment_duration');
    
    if (segmentCountInput) {
        segmentCountInput.addEventListener('change', function() {
            const newCount = parseInt(this.value) || 5;
            cumulativeExposureSegments.segmentCount = newCount;
            
            // 如果段数发生变化，需要重新生成段落输入框
            if (newCount !== cumulativeExposureSegments.intensities.length) {
                console.log(`🔄 段数从 ${cumulativeExposureSegments.intensities.length} 更改为 ${newCount}，重新生成段落`);
                generateSegmentInputs();
            }
            
            // 计算并更新总曝光时间和计量
            updateTotalValues();
            
            // 清空计算结果，与滑块行为一致
            if (typeof clearAllCharts === 'function') {
                clearAllCharts();
            }
            if (typeof showRecalculationNotice === 'function') {
                showRecalculationNotice();
            }
        });
        
        // 添加输入事件以实时更新总曝光时间
        segmentCountInput.addEventListener('input', function() {
            updateTotalValues();
            
            // 清空计算结果，与滑块行为一致
            if (typeof clearAllCharts === 'function') {
                clearAllCharts();
            }
            if (typeof showRecalculationNotice === 'function') {
                showRecalculationNotice();
            }
        });
    }
    
    if (segmentDurationInput) {
        segmentDurationInput.addEventListener('change', function() {
            const newDuration = parseFloat(this.value) || 1;
            cumulativeExposureSegments.segmentDuration = newDuration;
            
            console.log(`🔄 单段时间长度更新为: ${newDuration}秒`);
            
            // 计算并更新总曝光时间和计量
            updateTotalValues();
            
            // 清空计算结果，与滑块行为一致
            if (typeof clearAllCharts === 'function') {
                clearAllCharts();
            }
            if (typeof showRecalculationNotice === 'function') {
                showRecalculationNotice();
            }
        });
        
        // 添加输入事件以实时更新总曝光时间
        segmentDurationInput.addEventListener('input', function() {
            updateTotalValues();
            
            // 清空计算结果，与滑块行为一致
            if (typeof clearAllCharts === 'function') {
                clearAllCharts();
            }
            if (typeof showRecalculationNotice === 'function') {
                showRecalculationNotice();
            }
        });
    }
    
    // 生成段落按钮点击事件
    if (generateBtn) {
        generateBtn.addEventListener('click', function() {
            generateSegmentInputs();
            
            // 添加按钮点击效果
            this.classList.add('button-clicked');
            setTimeout(() => {
                this.classList.remove('button-clicked');
            }, 300);
        });
    }
}

/**
 * 初始化时间模式切换器
 */
function initTimeModeSwitcher() {
    const timeModeSelect = document.getElementById('time_mode');
    const fixedTimeSettings = document.getElementById('fixed-time-settings');
    
    if (!timeModeSelect || !fixedTimeSettings) {
        console.warn('时间模式选择器相关DOM元素未找到');
        return;
    }
    
    // 监听时间模式切换事件
    timeModeSelect.addEventListener('change', function() {
        cumulativeExposureSegments.timeMode = this.value;
        
        // 根据模式显示/隐藏固定时间段设置
        if (this.value === 'fixed') {
            fixedTimeSettings.style.display = 'block';
            
            // 如果自定义时间点为空，则初始化
            if (cumulativeExposureSegments.customTimePoints.length === 0) {
                initCustomTimePoints();
            }
        } else {
            fixedTimeSettings.style.display = 'none';
        }
        
        // 重新生成段落输入
        generateSegmentInputs();
    });
}

/**
 * 初始化自定义时间点
 */
function initCustomTimePoints() {
    const count = cumulativeExposureSegments.segmentCount;
    const duration = cumulativeExposureSegments.segmentDuration;
    const points = [];
    
    // 根据当前段数和时长生成时间点
    for (let i = 0; i <= count; i++) {
        points.push(i * duration);
    }
    
    cumulativeExposureSegments.customTimePoints = points;
}

/**
 * 更新总曝光时间和计量显示
 */
function updateTotalValues() {
    const count = parseInt(document.getElementById('segment_count').value) || 5;
    const duration = parseFloat(document.getElementById('segment_duration').value) || 1;
    const totalTime = count * duration;
    
    // 更新总曝光时间
    const totalTimeElement = document.getElementById('total_exposure_time');
    if (totalTimeElement) {
        totalTimeElement.textContent = totalTime.toFixed(1);
        
        // 添加淡入淡出效果以提示数值变化
        totalTimeElement.classList.add('highlight-change');
        setTimeout(() => {
            totalTimeElement.classList.remove('highlight-change');
        }, 500);
    }
    
    // 计算并更新总曝光计量
    calculateTotalExposureDose();
}

/**
 * 计算总曝光计量
 */
function calculateTotalExposureDose() {
    let totalDose = 0;
    const intensities = cumulativeExposureSegments.intensities;
    
    if (cumulativeExposureSegments.timeMode === 'fixed') {
        // 固定时间段模式
        const duration = cumulativeExposureSegments.segmentDuration;
        
        // 计算总曝光计量 = 总和(光强 * 时间段长度)
        for (let i = 0; i < intensities.length; i++) {
            totalDose += intensities[i] * duration;
        }
    } else {
        // 自定义时间点模式
        const timePoints = cumulativeExposureSegments.customTimePoints;
        
        // 计算总曝光计量 = 总和(光强 * 时间段长度)
        for (let i = 0; i < intensities.length && i + 1 < timePoints.length; i++) {
            const segmentDuration = timePoints[i + 1] - timePoints[i];
            totalDose += intensities[i] * segmentDuration;
        }
    }
    
    // 更新全局变量
    cumulativeExposureSegments.totalExposureDose = totalDose;
    
    // 更新UI显示
    const totalDoseElement = document.getElementById('total_exposure_dose');
    if (totalDoseElement) {
        totalDoseElement.textContent = totalDose.toFixed(1);
        
        // 添加淡入淡出效果以提示数值变化
        totalDoseElement.classList.add('highlight-change');
        setTimeout(() => {
            totalDoseElement.classList.remove('highlight-change');
        }, 500);
    }
    
    return totalDose;
}

/**
 * 生成段落输入框
 */
function generateSegmentInputs() {
    const container = document.getElementById('cumulative_segment_container');
    const count = parseInt(document.getElementById('segment_count').value) || 5;
    const duration = parseFloat(document.getElementById('segment_duration').value) || 1;
    
    if (!container) {
        console.warn('段落容器元素未找到');
        return;
    }
    
    // 清空容器
    container.innerHTML = '';
    
    // 重置强度数组
    cumulativeExposureSegments.intensities = new Array(count).fill(0.5); // 默认值0.5
    cumulativeExposureSegments.segmentCount = count;
    cumulativeExposureSegments.segmentDuration = duration;
    cumulativeExposureSegments.activeSegmentIndex = -1; // 重置活跃段落索引
    
    // 如果是自定义时间点模式，则初始化时间点
    if (cumulativeExposureSegments.timeMode === 'custom' && 
        cumulativeExposureSegments.customTimePoints.length !== count + 1) {
        initCustomTimePoints();
    }
    
    // 创建表格
    const table = document.createElement('table');
    table.className = 'segment-table';
    
    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['段落', '时间范围', '光强值'];
    headers.forEach((text, index) => {
        const th = document.createElement('th');
        th.textContent = text;
        
        // 第三列右对齐
        if (index === 2) {
            th.style.textAlign = 'right';
        }
        
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // 创建表体
    const tbody = document.createElement('tbody');
    
    for (let i = 0; i < count; i++) {
        const row = document.createElement('tr');
        row.dataset.segmentIndex = i;
        
        // 段落标签单元格
        const labelCell = document.createElement('td');
        
        const segmentLabel = document.createElement('div');
        segmentLabel.textContent = `段落 ${i + 1}`;
        segmentLabel.className = 'segment-label';
        
        labelCell.appendChild(segmentLabel);
        
        // 时间范围单元格
        const timeCell = document.createElement('td');
        
        if (cumulativeExposureSegments.timeMode === 'fixed') {
            // 固定时间段模式
            const timeRange = document.createElement('div');
            const startTime = (i * duration).toFixed(1);
            const endTime = ((i + 1) * duration).toFixed(1);
            timeRange.textContent = `${startTime}s - ${endTime}s`;
            timeRange.className = 'time-range';
            timeCell.appendChild(timeRange);
        } else {
            // 自定义时间点模式
            const timeInputGroup = document.createElement('div');
            timeInputGroup.className = 'time-input-group';
            
            const startTimeInput = document.createElement('input');
            startTimeInput.type = 'number';
            startTimeInput.className = 'time-input';
            startTimeInput.value = cumulativeExposureSegments.customTimePoints[i].toFixed(1);
            startTimeInput.min = '0';
            startTimeInput.step = '0.1';
            startTimeInput.dataset.index = i;
            startTimeInput.title = '起始时间点';
            startTimeInput.readOnly = i === 0; // 第一个时间点是只读的，始终为0
            
            const separator = document.createElement('span');
            separator.className = 'time-separator';
            separator.textContent = '-';
            
            const endTimeInput = document.createElement('input');
            endTimeInput.type = 'number';
            endTimeInput.className = 'time-input';
            endTimeInput.value = cumulativeExposureSegments.customTimePoints[i + 1].toFixed(1);
            endTimeInput.min = '0';
            endTimeInput.step = '0.1';
            endTimeInput.dataset.index = i + 1;
            endTimeInput.title = '结束时间点';
            
            // 时间点输入事件
            startTimeInput.addEventListener('change', function() {
                updateCustomTimePoint(parseInt(this.dataset.index), parseFloat(this.value));
                
                // 清空计算结果，与滑块行为一致
                if (typeof clearAllCharts === 'function') {
                    clearAllCharts();
                }
                if (typeof showRecalculationNotice === 'function') {
                    showRecalculationNotice();
                }
            });
            
            endTimeInput.addEventListener('change', function() {
                updateCustomTimePoint(parseInt(this.dataset.index), parseFloat(this.value));
                
                // 清空计算结果，与滑块行为一致
                if (typeof clearAllCharts === 'function') {
                    clearAllCharts();
                }
                if (typeof showRecalculationNotice === 'function') {
                    showRecalculationNotice();
                }
            });
            
            // 将输入框添加到组中
            timeInputGroup.appendChild(startTimeInput);
            timeInputGroup.appendChild(separator);
            timeInputGroup.appendChild(endTimeInput);
            
            timeCell.appendChild(timeInputGroup);
        }
        
        // 光强输入单元格
        const inputCell = document.createElement('td');
        
        const input = document.createElement('input');
        input.type = 'number';
        input.value = '0.5';
        input.min = '0';
        input.max = '100';
        input.step = '0.1';
        
        // 设置输入框ID和数据属性
        input.id = `segment_intensity_${i}`;
        input.dataset.index = i;
        
        // 添加输入事件监听
        input.addEventListener('input', function() {
            const index = parseInt(this.dataset.index);
            const value = parseFloat(this.value) || 0;
            
            // 确保数组长度足够
            if (cumulativeExposureSegments.intensities.length <= index) {
                cumulativeExposureSegments.intensities = new Array(index + 1).fill(0.5);
            }
            
            cumulativeExposureSegments.intensities[index] = value;
            
            // 重新计算总曝光计量
            calculateTotalExposureDose();
            
            // 清空计算结果，与滑块行为一致
            if (typeof clearAllCharts === 'function') {
                clearAllCharts();
            }
            if (typeof showRecalculationNotice === 'function') {
                showRecalculationNotice();
            }
            
            // 输出调试信息
            console.log(`🔄 段落${index + 1}光强值更新为: ${value}, 当前所有光强值:`, cumulativeExposureSegments.intensities);
        });
        
        // 添加焦点事件处理
        input.addEventListener('focus', function() {
            const index = parseInt(this.dataset.index);
            highlightActiveSegment(index);
        });
        
        inputCell.appendChild(input);
        
        // 将单元格添加到行中
        row.appendChild(labelCell);
        row.appendChild(timeCell);
        row.appendChild(inputCell);
        
        // 将行添加到表体中
        tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    // 不再添加额外的提示信息，因为已经在新布局中包含了
    // 计算初始总曝光计量
    calculateTotalExposureDose();
}

/**
 * 更新自定义时间点
 * @param {number} index 时间点索引
 * @param {number} value 时间点值
 */
function updateCustomTimePoint(index, value) {
    // 确保值有效
    value = Math.max(0, value || 0);
    
    // 更新时间点
    cumulativeExposureSegments.customTimePoints[index] = value;
    
    // 确保时间点顺序正确
    const timePoints = cumulativeExposureSegments.customTimePoints;
    
    // 如果当前点不是第一个点，且小于前一个点，则设置为前一个点的值
    if (index > 0 && timePoints[index] < timePoints[index - 1]) {
        timePoints[index] = timePoints[index - 1];
    }
    
    // 如果当前点不是最后一个点，且大于后一个点，则设置后一个点为当前点的值
    if (index < timePoints.length - 1 && timePoints[index] > timePoints[index + 1]) {
        timePoints[index + 1] = timePoints[index];
    }
    
    // 重新生成段落输入框，以更新所有时间点显示
    generateSegmentInputs();
}

/**
 * 高亮显示当前活跃的段落
 * @param {number} index 段落索引
 */
function highlightActiveSegment(index) {
    // 如果索引相同，不进行操作
    if (cumulativeExposureSegments.activeSegmentIndex === index) {
        return;
    }
    
    // 更新当前活跃段落索引
    cumulativeExposureSegments.activeSegmentIndex = index;
    
    // 获取所有段落行
    const rows = document.querySelectorAll('.segment-table tbody tr');
    
    // 移除所有行的活跃类
    rows.forEach(row => {
        row.classList.remove('active-segment');
    });
    
    // 将当前行设为活跃
    if (index >= 0 && index < rows.length) {
        rows[index].classList.add('active-segment');
        
        // 添加动画突出显示
        const fadeEffect = [
            { backgroundColor: 'rgba(245, 247, 250, 0.8)' },
            { backgroundColor: 'rgba(230, 240, 255, 0.8)' },
            { backgroundColor: 'rgba(245, 247, 250, 0.8)' }
        ];
        
        rows[index].animate(fadeEffect, {
            duration: 800,
            easing: 'ease-in-out'
        });
    }
}

/**
 * 获取多段曝光时间累积模式的参数
 */
function getCumulativeExposureParams() {
    // 实时获取页面上的最新值，而不是依赖全局变量
    const segmentCountInput = document.getElementById('segment_count');
    const segmentDurationInput = document.getElementById('segment_duration');
    const timeModeSelect = document.getElementById('time_mode');
    
    // 获取当前实际输入值
    const currentSegmentCount = segmentCountInput ? parseInt(segmentCountInput.value) || 5 : 5;
    const currentSegmentDuration = segmentDurationInput ? parseFloat(segmentDurationInput.value) || 1 : 1;
    const currentTimeMode = timeModeSelect ? timeModeSelect.value : 'fixed';
    
    // 获取当前实际的光强值数组
    const currentIntensities = [];
    for (let i = 0; i < currentSegmentCount; i++) {
        const input = document.getElementById(`segment_intensity_${i}`);
        if (input) {
            currentIntensities.push(parseFloat(input.value) || 0.5);
        } else {
            currentIntensities.push(0.5); // 默认值
        }
    }
    
    // 更新全局变量以保持同步
    cumulativeExposureSegments.segmentCount = currentSegmentCount;
    cumulativeExposureSegments.segmentDuration = currentSegmentDuration;
    cumulativeExposureSegments.timeMode = currentTimeMode;
    cumulativeExposureSegments.intensities = currentIntensities;
    
    // 重新计算总曝光计量
    const totalDose = calculateTotalExposureDoseFromParams(currentIntensities, currentTimeMode, currentSegmentDuration);
    cumulativeExposureSegments.totalExposureDose = totalDose;
    
    let params = {
        exposure_calculation_method: 'cumulative',
        segment_count: currentSegmentCount,
        segment_intensities: currentIntensities,
        time_mode: currentTimeMode,
        total_exposure_dose: totalDose
    };
    
    if (currentTimeMode === 'fixed') {
        params.segment_duration = currentSegmentDuration;
    } else {
        params.custom_time_points = cumulativeExposureSegments.customTimePoints;
    }
    
    return params;
}

/**
 * 根据参数计算总曝光计量（不依赖UI更新）
 */
function calculateTotalExposureDoseFromParams(intensities, timeMode, segmentDuration) {
    let totalDose = 0;
    
    if (timeMode === 'fixed') {
        // 固定时间段模式
        for (let i = 0; i < intensities.length; i++) {
            totalDose += intensities[i] * segmentDuration;
        }
    } else {
        // 自定义时间点模式
        const timePoints = cumulativeExposureSegments.customTimePoints;
        for (let i = 0; i < intensities.length && i + 1 < timePoints.length; i++) {
            const duration = timePoints[i + 1] - timePoints[i];
            totalDose += intensities[i] * duration;
        }
    }
    
    return totalDose;
}

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化曝光计量计算方式选择器
    initExposureCalculationMethodSelector();
    
    // 添加CSS样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes highlight {
            0% { background-color: transparent; }
            50% { background-color: #e3f2fd; }
            100% { background-color: transparent; }
        }
        
        .highlight-change {
            animation: highlight 0.5s ease-in-out;
        }
        
        .button-clicked {
            transform: scale(0.97);
            opacity: 0.9;
        }
    `;
    document.head.appendChild(style);
});

// 全局函数：扩展参数获取
window.extendParametersWithCumulative = function(params) {
    // 检查是否使用多段曝光时间累积模式
    const exposureMethodSelect = document.getElementById('exposure_calculation_method');
    if (exposureMethodSelect && exposureMethodSelect.value === 'cumulative') {
        // 获取最新的多段曝光参数
        const cumulativeParams = getCumulativeExposureParams();
        
        // 添加多段曝光时间累积参数
        Object.assign(params, cumulativeParams);
        
        console.log('🔄 使用多段曝光时间累积模式计算，参数：', {
            exposure_calculation_method: params.exposure_calculation_method,
            time_mode: params.time_mode,
            segment_count: params.segment_count,
            segment_duration: params.segment_duration,
            total_exposure_dose: params.total_exposure_dose,
            segment_intensities: params.segment_intensities ? params.segment_intensities.slice(0, 5) : [], // 只显示前5个值
            segment_intensities_full: params.segment_intensities // 完整数组用于调试
        });
        
        // 额外的验证日志
        console.log('🔍 多段曝光参数验证:');
        console.log('   - 段数输入框值:', document.getElementById('segment_count')?.value);
        console.log('   - 时长输入框值:', document.getElementById('segment_duration')?.value);
        console.log('   - 计算的总时间:', params.segment_count * params.segment_duration);
        console.log('   - 光强输入框实际值:');
        for (let i = 0; i < params.segment_count; i++) {
            const input = document.getElementById(`segment_intensity_${i}`);
            console.log(`     段${i+1}: ${input ? input.value : '未找到输入框'}`);
        }
    } else {
        params.exposure_calculation_method = 'standard';
    }
    
    return params;
}; 