/**
 * Dill模型Web应用 - 主逻辑脚本
 */

// ========================================
// 全新的顶部错误框系统
// ========================================

/**
 * 显示错误通知
 * @param {string} message - 错误消息
 * @param {boolean} autoHide - 是否自动隐藏（默认5秒后隐藏）
 */
function showTopError(message, autoHide = true) {
    const errorNotification = document.getElementById('top-error-notification');
    const errorMessageText = document.getElementById('top-error-message-text');
    
    if (!errorNotification || !errorMessageText) {
        console.error('错误通知框元素未找到');
        return;
    }
    
    // 设置错误消息
    errorMessageText.textContent = message;
    
    // 显示错误框
    errorNotification.classList.add('show');
    
    // 添加震动动画
    errorNotification.classList.add('shake');
    setTimeout(() => {
        errorNotification.classList.remove('shake');
    }, 800);
    
    // 轻微滚动到错误框位置
    setTimeout(() => {
        errorNotification.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, 100);
    
    // 自动隐藏（如果启用）
    if (autoHide) {
        setTimeout(() => {
            hideTopError();
        }, 5000);
    }
    
    console.log('🚨 错误通知框已显示:', message);
}

/**
 * 隐藏错误通知
 */
function hideTopError() {
    const errorNotification = document.getElementById('top-error-notification');
    
    if (!errorNotification) {
        console.error('错误通知框元素未找到');
        return;
    }
    
    // 隐藏错误框
    errorNotification.classList.remove('show', 'shake');
    
    console.log('✅ 错误通知框已隐藏');
}

/**
 * 智能错误类型检测和显示
 * @param {Error|string|Object} error - 错误对象、字符串或错误信息对象
 */
function showSmartError(error) {
    const currentLang = window.currentLang || localStorage.getItem('lang') || 'zh-CN';
    let message = '';
    
    // 检测错误类型并生成合适的消息
    if (typeof error === 'string') {
        // 字符串错误消息
        if (error.toLowerCase().includes('fetch')) {
            message = currentLang.startsWith('zh') ? 
                '🌐 网络连接失败！请检查网络状态或稍后重试。' : 
                '🌐 Network connection failed! Please check your network or try again later.';
        } else if (error.toLowerCase().includes('timeout')) {
            message = currentLang.startsWith('zh') ? 
                '⏰ 请求超时！服务器响应时间过长，请稍后重试。' : 
                '⏰ Request timeout! Server response too slow, please try again later.';
        } else {
            message = error;
        }
    } else if (error && error.name === 'TypeError' && error.message.includes('fetch')) {
        // fetch API 错误
        message = currentLang.startsWith('zh') ? 
            '🔌 服务器连接断开！请检查后端服务是否正常运行。' : 
            '🔌 Server connection lost! Please check if backend service is running.';
    } else if (error && error.message) {
        // 错误对象
        try {
            // 尝试解析JSON错误信息
            if (error.message.startsWith('{') && error.message.endsWith('}')) {
                const errorObj = JSON.parse(error.message);
                if (currentLang.startsWith('zh') && errorObj.message_zh) {
                    message = errorObj.message_zh;
                } else if (currentLang.startsWith('en') && errorObj.message_en) {
                    message = errorObj.message_en;
                } else if (errorObj.message) {
                    message = errorObj.message;
                } else {
                    message = error.message;
                }
            } else {
                message = error.message;
            }
        } catch (parseError) {
            message = error.message;
        }
    } else {
        // 默认错误消息
        message = currentLang.startsWith('zh') ? 
            '❌ 发生未知错误！请刷新页面或稍后重试。' : 
            '❌ Unknown error occurred! Please refresh or try again later.';
    }
    
    showTopError(message, true);
}

/**
 * 显示连接错误（保持向后兼容）
 * @param {string} type - 错误类型（如 'connection', 'timeout', 'server'）
 */
function showConnectionError(type = 'connection') {
    const currentLang = window.currentLang || localStorage.getItem('lang') || 'zh-CN';
    
    let message = '';
    switch (type) {
        case 'connection':
            message = currentLang.startsWith('zh') ? 
                '⚠️ 服务器连接失败！请检查网络连接或稍后重试。' : 
                '⚠️ Server connection failed! Please check your network or try again later.';
            break;
        case 'timeout':
            message = currentLang.startsWith('zh') ? 
                '⏰ 请求超时！服务器响应时间过长，请稍后重试。' : 
                '⏰ Request timeout! Server response too slow, please try again later.';
            break;
        case 'server':
            message = currentLang.startsWith('zh') ? 
                '🔧 服务器内部错误！请稍后重试或联系管理员。' : 
                '🔧 Server internal error! Please try again later or contact administrator.';
            break;
        default:
            message = currentLang.startsWith('zh') ? 
                '❌ 发生未知错误！请刷新页面或稍后重试。' : 
                '❌ Unknown error occurred! Please refresh or try again later.';
    }
    
    showTopError(message, true);
}

/**
 * 测试顶部错误框功能
 */
function testTopError() {
    showTopError('🧪 这是一个测试错误消息 - 前后端连接断开！', false);
}

// 将函数暴露到全局作用域
window.showTopError = showTopError;
window.hideTopError = hideTopError;
window.showSmartError = showSmartError;
window.showConnectionError = showConnectionError;
window.testTopError = testTopError;

// === 加载期间日志相关状态 ===
let loadingLogsPanel = null;
let loadingLogsContainer = null;
let loadingProgressText = null;
let loadingTimeText = null;
let loadingStartTime = null;
let loadingTimeInterval = null;

// 页面初始化标志，用于区分是初始化还是用户主动修改
window.isPageInitializing = true;

// 全局变量，用于存储当前计算的模型和维度信息
window.currentCalculationInfo = {
    model: 'dill',
    dimension: '1D'
};

// 坐标轴控制全局变量
let axisReferenceRanges = {
    exposure: {
        xaxis: null,
        yaxis: null
    },
    thickness: {
        xaxis: null,
        yaxis: null
    }
};

// DILL 1D V评估动画控制变量
let dill1DVEvaluationState = {
    animationData: null,
    totalFrames: 0,
    currentFrame: 0,
    isPlaying: false,
    intervalId: null,
    isLooping: false
};

// 文档加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化波形类型标题国际化
    initWaveTypeTitles();
    
    // 初始化波形类型选择器
    initSineWaveTypeSelectors();
    
    // 初始化曝光时间窗口选择器
    initExposureTimeWindowSelector();
    
    // 初始化曝光计量计算方式选择器
    initExposureCalculationMethodSelector();
    
    // 初始化自定义向量控制框状态
    initCustomVectorControlsState();
    
    // 初始化应用
    initApp();
    
    // 延迟设置初始化标志为false，确保所有初始化完成
    setTimeout(() => {
        window.isPageInitializing = false;
        console.log('📖 页面初始化完成，现在用户修改选项时将显示通知');
    }, 500);
});

// 初始化自定义向量控制框状态
function initCustomVectorControlsState() {
    const methodSelect = document.getElementById('intensity_input_method');
    
    // 初始状态下，设置未点击预览按钮的标志
    window.isPreviewDataButtonClicked = false;
    
    // 确保数据状态容器初始隐藏
    const statusDiv = document.getElementById('intensity-data-status');
    if (statusDiv) {
        statusDiv.style.display = 'none';
    }
    
    // 初始禁用手动输入区域的卸载按钮
    const applyBtn = document.getElementById('apply-intensity-btn');
    if (applyBtn) {
        applyBtn.disabled = !customIntensityData || !customIntensityData.loaded;
    }
    
    // 检查默认选项并执行相应的逻辑
    if (methodSelect && methodSelect.value === 'custom') {
        // 延迟执行，确保DOM完全加载和曝光计算方式选择器也初始化完成
        setTimeout(() => {
            if (typeof handleIntensityMethodChange === 'function') {
                handleIntensityMethodChange();
                console.log('🔒 页面加载时检测到自定义向量模式，已正确初始化界面状态');
            }
            
            // 检查是否同时是多段曝光时间累计模式
            const exposureMethodSelect = document.getElementById('exposure_calculation_method');
            if (exposureMethodSelect && exposureMethodSelect.value === 'cumulative') {
                console.log('🔒 页面加载时检测到自定义向量+多段曝光时间累计模式，执行特殊初始化');
                if (typeof hideAllUnnecessaryElements === 'function') {
                    hideAllUnnecessaryElements();
                }
            }
        }, 200);
    }
}

// 强制清除错误消息显示
function forceHideErrorMessage() {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.classList.remove('visible', 'shake');
        errorMessage.style.display = 'none';
        errorMessage.style.visibility = 'hidden';
        errorMessage.style.opacity = '0';
        errorMessage.style.height = '0';
        errorMessage.style.marginBottom = '0';
        errorMessage.textContent = '';
        console.log('🔧 强制清除错误消息显示');
    }
}

// 显示重新计算提示
function showRecalculationNotice() {
    // 检查是否存在结果区域
    const resultsContainer = document.querySelector('.results-container');
    if (!resultsContainer) {
        return; // 如果没有结果容器，不显示提示
    }
    
    // 移除已有的提示
    const existingNotice = document.querySelector('.recalculation-notice');
    if (existingNotice) {
        existingNotice.remove();
    }
    
    // 创建新的提示元素
    const notice = document.createElement('div');
    notice.className = 'recalculation-notice';
    notice.innerHTML = `
        <div class="notice-content">
            <i class="fas fa-exclamation-triangle"></i>
            <span>参数已更改，请重新计算以查看更新的结果</span>
            <button class="close-notice" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // 添加样式
    notice.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff9800, #f57c00);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
        z-index: 20000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 14px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 400px;
    `;
    
    notice.querySelector('.notice-content').style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    notice.querySelector('.close-notice').style.cssText = `
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 5px;
        border-radius: 3px;
        opacity: 0.8;
        transition: opacity 0.2s ease;
    `;
    
    // 添加到页面
    document.body.appendChild(notice);
    
    // 触发动画
    setTimeout(() => {
        notice.style.opacity = '1';
        notice.style.transform = 'translateX(0)';
    }, 10);
    
    // 2.5秒后自动消失
    setTimeout(() => {
        if (notice.parentElement) {
            notice.style.opacity = '0';
            notice.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notice.parentElement) {
                    notice.remove();
                }
            }, 300);
        }
    }, 2500);
}

// 初始化波形类型标题的国际化支持
function initWaveTypeTitles() {
    // 获取当前语言
    const currentLang = localStorage.getItem('lang') || 'zh-CN';
    
    // 设置所有参数组容器的标题
    const allParamGroupContainers = document.querySelectorAll('.parameter-group-container');
    allParamGroupContainers.forEach(container => {
        if (container.dataset.i18nTitle && LANGS[currentLang][container.dataset.i18nTitle]) {
            container.dataset.title = LANGS[currentLang][container.dataset.i18nTitle];
        }
    });
    
    // 设置波形类型容器的标题
    const waveTypeContainers = document.querySelectorAll('.sine-wave-type-container');
    waveTypeContainers.forEach(container => {
        if (container.dataset.i18nTitle && LANGS[currentLang][container.dataset.i18nTitle]) {
            container.dataset.title = LANGS[currentLang][container.dataset.i18nTitle];
        }
    });
    
    // 设置波形参数容器的标题
    const waveParamsContainers = document.querySelectorAll('.sine-wave-params-container');
    waveParamsContainers.forEach(container => {
        if (container.dataset.i18nTitle && LANGS[currentLang][container.dataset.i18nTitle]) {
            container.dataset.title = LANGS[currentLang][container.dataset.i18nTitle];
        }
    });
    
    // 设置预览按钮的样式
    const previewButtons = document.querySelectorAll('[id$="-preview-btn"]');
    previewButtons.forEach(button => {
        if (!button.classList.contains('preview-button')) {
            button.classList.add('preview-button');
        }
    });
    
    // 设置预览图表容器的样式
    const previewPlots = document.querySelectorAll('[id$="-preview-plot"]');
    previewPlots.forEach(plot => {
        if (!plot.classList.contains('preview-plot')) {
            plot.classList.add('preview-plot');
        }
    });
}

/**
 * 初始化应用
 */
function initApp() {
    console.log('🔍 [DEBUG] initApp 开始执行');
    
    // 初始化通知样式
    addNotificationStyles();
    console.log('✅ 通知样式初始化成功');
    
    // 强制初始化系统化日志管理器
    console.log('🔍 [DEBUG] 强制初始化系统化日志管理器...');
    try {
        if (typeof initSystematicLogs === 'function') {
            window.systematicLogManager = initSystematicLogs();
            console.log('✅ 系统化日志管理器初始化成功:', window.systematicLogManager);
        } else {
            console.error('❌ initSystematicLogs 函数未找到');
        }
    } catch (error) {
        console.error('❌ 系统化日志管理器初始化失败:', error);
    }
    
    // 初始化界面元素
    initWaveTypeTitles();
    initSineWaveTypeSelectors();
    bindSliderEvents();
    bindPhiExprUI();
    
    // 🔧 强制清除任何可能的错误消息显示
    forceHideErrorMessage();
    
    // 触发初始波形类型变化事件以设置正确的初始显示状态
    setTimeout(() => {
        const dillSineType = document.getElementById('dill-sine-type');
        if (dillSineType) {
            dillSineType.dispatchEvent(new Event('change'));
            console.log('✅ 已触发DILL波形类型初始化事件，当前值:', dillSineType.value);
        }
        
        // 初始计算空间频率K值（不显示通知）
        console.log('🔄 正在初始化空间频率K值...');
        autoCalculateSpaceFrequencyK(false);
    }, 100);
    
    // 初始化4D动画控制
    console.log('🔍 [DEBUG] 初始化4D动画控制...');
    try {
        setupDill4DAnimationControls();
        setupEnhancedDill4DAnimationControls();
        setupDill1DAnimationControls();  // 添加1D动画控制初始化
        setupDill1DVEvaluationControls(); // 添加1D V评估控制初始化
        console.log('✅ 4D动画控制初始化成功');
    } catch (error) {
        console.error('❌ 4D动画控制初始化失败:', error);
    }
    
    // 获取DOM元素
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsSection = document.getElementById('results-section');
    const errorMessage = document.getElementById('error-message');
    const loading = document.getElementById('loading');
    const modelSelect = document.getElementById('model-select'); // 获取模型选择下拉框
    const modelSelectionSection = document.getElementById('model-selection-section'); // 获取模型选择区域
    
    // 🔧 确保错误消息初始状态完全隐藏
    if (errorMessage) {
        errorMessage.classList.remove('visible');
        errorMessage.style.display = 'none';
        errorMessage.style.visibility = 'hidden';
        errorMessage.style.opacity = '0';
        errorMessage.style.height = '0';
        errorMessage.textContent = '';
        console.log('✅ 错误消息初始状态已强制隐藏');
    }
    
    // 为计算按钮绑定事件
    calculateBtn.addEventListener('click', function() {
        // 首先滑动到页面最底部
        scrollToBottomAndRefreshLogs();
        
        // 检查自定义向量模式下是否已加载数据
        const intensityMethodSelect = document.getElementById('intensity_input_method');
        if (intensityMethodSelect && intensityMethodSelect.value === 'custom') {
            if (!customIntensityData.loaded || !customIntensityData.x || !customIntensityData.intensity || 
                customIntensityData.x.length === 0 || customIntensityData.intensity.length === 0) {
                // 使用新的顶部错误框显示错误
                showTopError('请先上传文件或手动输入光强分布数据，然后预览/应用数据后再计算', true);
                console.log('❌ 自定义向量模式下未加载数据，计算被阻止');
                // 不执行计算
                return;
            }
        }
        
        let modelType = modelSelect.value;
        let postData = getParameterValues(); // 使用 getParameterValues 获取所有参数
        
        // 更新当前计算信息
        let dimension = '1D';
        if (postData.sine_type === 'multi') {
            dimension = '2D';
        } else if (postData.sine_type === '3d') {
            dimension = '3D';
        }
        window.currentCalculationInfo = {
            model: modelType,
            dimension: dimension
        };

        // 显示加载动画
        loading.classList.add('active');
        // 修复：只修改动画里的文字部分，不覆盖整个动画结构
        const loadingText = loading.querySelector('.loading-text');
        if (loadingText) {
            // 获取当前语言，使用更安全的方式
            const currentLang = window.currentLang || localStorage.getItem('lang') || 'zh-CN';
            // 安全地访问语言对象
            const langObj = LANGS[currentLang] || LANGS['zh-CN'];
            if (langObj && langObj.loading) {
                loadingText.textContent = langObj.loading;
            } else {
                loadingText.textContent = '加载中...';
            }
        }
        // 强制隐藏错误消息
        forceHideErrorMessage();
        // 隐藏结果区域
        resultsSection.classList.remove('visible');
        
        // 开始加载期间日志更新
        startLoadingLogsUpdate();
        
        // 自动刷新系统化日志
        if (window.systematicLogManager) {
            window.systematicLogManager.autoRefreshLogsOnCalculation();
        }
        
        // 调用API获取数据(使用交互式图表)
        calculateDillModelData(postData)
            .then(data => {
                // 隐藏加载动画
                loading.classList.remove('active');
                
                // 主图始终渲染
                displayInteractiveResults(data);
                
                // 只有CAR模型时，额外渲染右侧多图
                if (modelType === 'car') {
                    if (typeof renderCarInteractivePlots === 'function') {
                        renderCarInteractivePlots(data);
                        // 确保CAR模型结果区可见
                        const carInteractivePlotsContainer = document.getElementById('car-interactive-plots');
                        if (carInteractivePlotsContainer) carInteractivePlotsContainer.style.display = 'block';
                    } else {
                        console.error('renderCarInteractivePlots function not found.');
                        showTopError('CAR模型图表渲染函数未找到。', true);
                    }
                }
                
                // 添加动画效果
                resultsSection.classList.add('visible');
                
                // 执行日志过渡动画
                transitionLogsFromLoadingToMain();
            })
            .catch(error => {
                // 隐藏加载动画
                loading.classList.remove('active');
                
                // 停止加载期间日志更新
                stopLoadingLogsUpdate();
                
                // 改进错误信息提取
                let msg = '';
                if (error && error.message) {
                    msg = error.message;
                    // 尝试解析JSON错误信息
                    try {
                        if (error.message.startsWith('{') && error.message.endsWith('}')) {
                            const errorObj = JSON.parse(error.message);
                            if (errorObj.message) {
                                msg = errorObj.message;
                            }
                            if ((window.currentLang === 'zh' || window.currentLang === 'zh-CN') && errorObj.message_zh) {
                                msg = errorObj.message_zh;
                            } else if ((window.currentLang === 'en' || window.currentLang === 'en-US') && errorObj.message_en) {
                                msg = errorObj.message_en;
                            }
                        }
                    } catch (parseError) {
                        console.warn('Error message parsing failed:', parseError);
                    }
                }
                
                // 如果error是对象，检查是否包含国际化错误信息
                if (error && typeof error === 'object') {
                    if ((window.currentLang === 'zh' || window.currentLang === 'zh-CN') && error.message_zh) {
                        msg = error.message_zh;
                    } else if ((window.currentLang === 'en' || window.currentLang === 'en-US') && error.message_en) {
                        msg = error.message_en;
                    }
                }
                
                // 如果无法获取错误信息，使用默认信息
                if (!msg || msg === '') {
                    const currentLang = window.currentLang || localStorage.getItem('lang') || 'zh-CN';
                    msg = LANGS[currentLang].error_message || '计算过程中出现错误';
                }
                
                // 记录错误详情到控制台，便于调试
                console.error('计算出错:', {
                    errorObject: error,
                    displayMessage: msg,
                    modelType: modelType,
                    parameters: postData
                });
                
                // 使用智能错误检测和显示
                showSmartError(error);
                
                // 保留原有的错误卡片高亮功能
                highlightErrorCard(msg);
                
                // 保留旧的错误消息逻辑（隐藏状态，避免冲突）
                if (errorMessage) {
                    errorMessage.textContent = msg;
                    errorMessage.style.display = 'none';
                }
            });
    });
    
    // 模型选择事件 (如果将来有多个模型，可以在这里处理)
    modelSelect.addEventListener('change', (event) => {
        clearAllCharts();
        const selectedModel = event.target.value;
        console.log('Selected model:', selectedModel);
        
        // 隐藏所有模型说明
        document.getElementById('dill-desc').style.display = 'none';
        document.getElementById('enhanced-dill-desc').style.display = 'none';
        document.getElementById('car-desc').style.display = 'none';
        
        // 隐藏所有模型参数区域
        document.getElementById('dill-params').style.display = 'none';
        document.getElementById('enhanced-dill-params').style.display = 'none';
        document.getElementById('car-params').style.display = 'none';
        
        // 清除CAR模型特有容器
        const carInteractivePlotsContainer = document.getElementById('car-interactive-plots');
        if (carInteractivePlotsContainer) {
            carInteractivePlotsContainer.innerHTML = '';
            carInteractivePlotsContainer.style.display = 'none';
        }
        
        // 重置模型特定组件
        resetModelSpecificComponents();
        
        // 根据所选模型显示相应的说明和参数区域
        switch(selectedModel) {
            case 'dill':
                document.getElementById('dill-desc').style.display = 'block';
                document.getElementById('dill-params').style.display = 'block';
                break;
            case 'enhanced_dill':
                document.getElementById('enhanced-dill-desc').style.display = 'block';
                document.getElementById('enhanced-dill-params').style.display = 'block';
                break;
            case 'car':
                document.getElementById('car-desc').style.display = 'block';
                document.getElementById('car-params').style.display = 'block';
                break;
        }
        
        // 控制空间频率K输入框的禁用状态
        updateKInputState();
    });

    // 新增：所有参数输入框变动时提示重新计算
    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(input => {
        input.addEventListener('input', function() {
            clearAllCharts();
            showRecalculationNotice();
        });
        input.addEventListener('change', function() {
            clearAllCharts();
            showRecalculationNotice();
        });
    });

    // 切换模型详细说明的显示状态
    // if (toggleDetailsBtn && modelFullDetails) {
    //     toggleDetailsBtn.addEventListener('click', () => {
    //         const isHidden = !modelFullDetails.classList.contains('details-visible');
    //         if (isHidden) {
    //             modelFullDetails.classList.add('details-visible');
    //             toggleDetailsBtn.textContent = '隐藏详细说明';
    //             // 可选：平滑滚动到详情区域的顶部
    //             // setTimeout(() => { // 延迟以等待展开动画完成
    //             //     modelFullDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    //             // }, 700); // 动画时间
    //         } else {
    //             modelFullDetails.classList.remove('details-visible');
    //             toggleDetailsBtn.textContent = '显示详细说明';
    //         }
    //     });
    // }

    // 切换Dill模型详细说明的显示状态
    const dillToggleBtn = document.getElementById('dill-toggle-details');
    const dillFullDetails = document.getElementById('dill-full-details');
    if (dillToggleBtn && dillFullDetails) {
        // 默认收起
        dillFullDetails.classList.remove('details-visible');
        dillToggleBtn.classList.remove('active');
        dillToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
        dillToggleBtn.addEventListener('click', function() {
            const isHidden = !dillFullDetails.classList.contains('details-visible');
            if (isHidden) {
                dillFullDetails.classList.add('details-visible');
                dillToggleBtn.classList.add('active');
                dillToggleBtn.innerHTML = '收起 <i class="fas fa-chevron-up"></i>';
            } else {
                dillFullDetails.classList.remove('details-visible');
                dillToggleBtn.classList.remove('active');
                dillToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
            }
        });
    }
    // 切换增强Dill模型详细说明的显示状态
    const enhancedDillToggleBtn = document.getElementById('enhanced-dill-toggle-details');
    const enhancedDillFullDetails = document.getElementById('enhanced-dill-full-details');
    if (enhancedDillToggleBtn && enhancedDillFullDetails) {
        // 默认收起
        enhancedDillFullDetails.classList.remove('details-visible');
        enhancedDillToggleBtn.classList.remove('active');
        enhancedDillToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
        enhancedDillToggleBtn.addEventListener('click', function() {
            const isHidden = !enhancedDillFullDetails.classList.contains('details-visible');
            if (isHidden) {
                enhancedDillFullDetails.classList.add('details-visible');
                enhancedDillToggleBtn.classList.add('active');
                enhancedDillToggleBtn.innerHTML = '收起 <i class="fas fa-chevron-up"></i>';
            } else {
                enhancedDillFullDetails.classList.remove('details-visible');
                enhancedDillToggleBtn.classList.remove('active');
                enhancedDillToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
            }
        });
    }
    
    // 切换CAR模型详细说明的显示状态
    const carToggleBtn = document.getElementById('car-toggle-details');
    const carFullDetails = document.getElementById('car-full-details');
    if (carToggleBtn && carFullDetails) {
        // 默认收起
        carFullDetails.classList.remove('details-visible');
        carToggleBtn.classList.remove('active');
        carToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
        carToggleBtn.addEventListener('click', function() {
            const isHidden = !carFullDetails.classList.contains('details-visible');
            if (isHidden) {
                carFullDetails.classList.add('details-visible');
                carToggleBtn.classList.add('active');
                carToggleBtn.innerHTML = '收起 <i class="fas fa-chevron-up"></i>';
            } else {
                carFullDetails.classList.remove('details-visible');
                carToggleBtn.classList.remove('active');
                carToggleBtn.innerHTML = '展开更多 <i class="fas fa-chevron-down"></i>';
            }
        });
    }

    // 应用进入动画
    applyEntryAnimations();

    // 模型选择与说明区域入场动画
    setTimeout(() => {
        if(modelSelectionSection) modelSelectionSection.classList.add('loaded');
    }, 100); // 延迟一点点确保页面元素已就绪

    // 导出图片和数据功能 - 添加安全检查
    const exportExposureImg = document.getElementById('export-exposure-img');
    if (exportExposureImg) {
        exportExposureImg.onclick = function() {
            Plotly.downloadImage(document.getElementById('exposure-plot-container'), {format: 'png', filename: 'exposure_plot'});
        };
    }
    
    const exportThicknessImg = document.getElementById('export-thickness-img');
    if (exportThicknessImg) {
        exportThicknessImg.onclick = function() {
            Plotly.downloadImage(document.getElementById('thickness-plot-container'), {format: 'png', filename: 'thickness_plot'});
        };
    }
    
    const exportExposureData = document.getElementById('export-exposure-data');
    if (exportExposureData) {
        exportExposureData.onclick = function() {
            exportPlotData('exposure');
        };
    }
    
    const exportThicknessData = document.getElementById('export-thickness-data');
    if (exportThicknessData) {
        exportThicknessData.onclick = function() {
            exportPlotData('thickness');
        };
    }
    
    // 增强DILL模型专用的X平面导出功能 - 添加安全检查
    const exportEnhancedDillXPlaneExposureImg = document.getElementById('export-enhanced-dill-x-plane-exposure-img');
    if (exportEnhancedDillXPlaneExposureImg) {
        exportEnhancedDillXPlaneExposureImg.onclick = function() {
            Plotly.downloadImage(document.getElementById('enhanced-dill-x-plane-exposure-container'), {format: 'png', filename: 'enhanced_dill_x_plane_exposure'});
        };
    }
    
    const exportEnhancedDillXPlaneThicknessImg = document.getElementById('export-enhanced-dill-x-plane-thickness-img');
    if (exportEnhancedDillXPlaneThicknessImg) {
        exportEnhancedDillXPlaneThicknessImg.onclick = function() {
            Plotly.downloadImage(document.getElementById('enhanced-dill-x-plane-thickness-container'), {format: 'png', filename: 'enhanced_dill_x_plane_thickness'});
        };
    }
    
    const exportEnhancedDillXPlaneExposureData = document.getElementById('export-enhanced-dill-x-plane-exposure-data');
    if (exportEnhancedDillXPlaneExposureData) {
        exportEnhancedDillXPlaneExposureData.onclick = function() {
            exportPlotData('enhanced_dill_x_plane_exposure');
        };
    }
    
    const exportEnhancedDillXPlaneThicknessData = document.getElementById('export-enhanced-dill-x-plane-thickness-data');
    if (exportEnhancedDillXPlaneThicknessData) {
        exportEnhancedDillXPlaneThicknessData.onclick = function() {
            exportPlotData('enhanced_dill_x_plane_thickness');
        };
    }

    // 增强DILL模型专用的Y平面导出功能 - 添加安全检查
    const exportEnhancedDillYPlaneExposureImg = document.getElementById('export-enhanced-dill-y-plane-exposure-img');
    if (exportEnhancedDillYPlaneExposureImg) {
        exportEnhancedDillYPlaneExposureImg.onclick = function() {
            Plotly.downloadImage(document.getElementById('enhanced-dill-y-plane-exposure-container'), {format: 'png', filename: 'enhanced_dill_y_plane_exposure'});
        };
    }
    
    const exportEnhancedDillYPlaneThicknessImg = document.getElementById('export-enhanced-dill-y-plane-thickness-img');
    if (exportEnhancedDillYPlaneThicknessImg) {
        exportEnhancedDillYPlaneThicknessImg.onclick = function() {
            Plotly.downloadImage(document.getElementById('enhanced-dill-y-plane-thickness-container'), {format: 'png', filename: 'enhanced_dill_y_plane_thickness'});
        };
    }
    
    const exportEnhancedDillYPlaneExposureData = document.getElementById('export-enhanced-dill-y-plane-exposure-data');
    if (exportEnhancedDillYPlaneExposureData) {
        exportEnhancedDillYPlaneExposureData.onclick = function() {
            exportPlotData('enhanced_dill_y_plane_exposure');
        };
    }
    
    const exportEnhancedDillYPlaneThicknessData = document.getElementById('export-enhanced-dill-y-plane-thickness-data');
    if (exportEnhancedDillYPlaneThicknessData) {
        exportEnhancedDillYPlaneThicknessData.onclick = function() {
            exportPlotData('enhanced_dill_y_plane_thickness');
        };
    }

    // 正弦波类型切换逻辑（Dill） - 添加安全检查
    const dillSineType = document.getElementById('dill-sine-type');
    const dillMultisineParams = document.getElementById('dill-multisine-params');
    const dill3DSineParams = document.getElementById('dill-3dsine-params');
    const dill2DExposureParams = document.getElementById('dill-2d-exposure-params-container');
    const dillK = document.getElementById('K') ? document.getElementById('K').closest('.parameter-item') : null;
    
    // 改用正确的参数项选择器 - 添加安全检查
    const dillYRange = dillMultisineParams ? dillMultisineParams.querySelector('.parameter-item:last-child') : null;
    
    function updateDillYRangeDisplay() {
        if (dillSineType && dillSineType.value === 'multi') {
            if(dillYRange) dillYRange.style.display = '';
        } else {
            if(dillYRange) dillYRange.style.display = 'none';
        }
    }
    
    // 控制正弦波类型选择器的显示
    function updateSineTypeVisibility() {
        const exposureMethodSelect = document.getElementById('exposure_calculation_method');
        const sineTypeContainer = document.getElementById('dill-sine-type-container');
        
        if (!exposureMethodSelect || !sineTypeContainer) return;
        
        // 修改：始终显示正弦波类型选择器，支持所有模式下的2D曝光图案
        sineTypeContainer.style.display = 'block';
    }
    
    if (dillSineType) {
        dillSineType.addEventListener('change', function() {
            console.log('正弦波类型切换:', this.value);
            if (this.value === 'multi') {
                if (dillMultisineParams) dillMultisineParams.style.display = 'block';
                if (dill3DSineParams) dill3DSineParams.style.display = 'none';
                if (dill2DExposureParams) dill2DExposureParams.style.display = 'none';
                if (dillK) dillK.style.display = 'none';
            } else if (this.value === '3d') {
                if (dillMultisineParams) dillMultisineParams.style.display = 'none';
                if (dill3DSineParams) dill3DSineParams.style.display = 'block';
                if (dill2DExposureParams) dill2DExposureParams.style.display = 'none';
                if (dillK) dillK.style.display = 'none';
            } else if (this.value === '2d_exposure_pattern') {
                if (dillMultisineParams) dillMultisineParams.style.display = 'none';
                if (dill3DSineParams) dill3DSineParams.style.display = 'none';
                if (dill2DExposureParams) dill2DExposureParams.style.display = 'block';
                if (dillK) dillK.style.display = 'none';
            } else {
                if (dillMultisineParams) dillMultisineParams.style.display = 'none';
                if (dill3DSineParams) dill3DSineParams.style.display = 'none';
                if (dill2DExposureParams) dill2DExposureParams.style.display = 'none';
                if (dillK) dillK.style.display = '';
            }
            
            // 控制空间频率K输入框的禁用状态（1D DILL模型时禁用）
            updateKInputState();
            
            updateDillYRangeDisplay();
        });
        // 新增：页面加载时主动触发一次change，确保初始状态正确
        dillSineType.dispatchEvent(new Event('change'));
        updateDillYRangeDisplay();
    
    // 初始化时设置K输入框状态
    updateKInputState();
    
    // 将正弦波选择器可见性控制函数暴露到全局作用域
    window.updateSineTypeVisibility = updateSineTypeVisibility;
    
    // 初始化时设置正弦波选择器的可见性
    updateSineTypeVisibility();
    }
    
    // 正弦波类型切换逻辑（增强Dill） - 添加安全检查
    const enhancedDillSineType = document.getElementById('enhanced-dill-sine-type');
    const enhancedDillMultisineParams = document.getElementById('enhanced-dill-multisine-params');
    const enhancedDill3DSineParams = document.getElementById('enhanced-dill-3dsine-params');
    const enhancedK = document.getElementById('enhanced_K');
    const enhancedKItem = document.getElementById('enhanced-dill-params')?.querySelector('#K')?.closest('.parameter-item');
    
    if (enhancedDillSineType) {
        enhancedDillSineType.addEventListener('change', function() {
            if (this.value === 'multi') {
                if (enhancedDillMultisineParams) enhancedDillMultisineParams.style.display = 'block';
                if (enhancedDill3DSineParams) enhancedDill3DSineParams.style.display = 'none';
                if (enhancedKItem) enhancedKItem.style.display = 'none';
            } else if (this.value === '3d') {
                if (enhancedDillMultisineParams) enhancedDillMultisineParams.style.display = 'none';
                if (enhancedDill3DSineParams) enhancedDill3DSineParams.style.display = 'block';
                if (enhancedKItem) enhancedKItem.style.display = 'none';
            } else {
                if (enhancedDillMultisineParams) enhancedDillMultisineParams.style.display = 'none';
                if (enhancedDill3DSineParams) enhancedDill3DSineParams.style.display = 'none';
                if (enhancedKItem) enhancedKItem.style.display = '';
            }
        });
    }
    
    // 正弦波类型切换逻辑（CAR） - 添加安全检查
    const carSineType = document.getElementById('car-sine-type');
    const carMultisineParams = document.getElementById('car-multisine-params');
    const car3DSineParams = document.getElementById('car-3dsine-params');
    const carKElement = document.getElementById('car_K');
    const carK = carKElement ? carKElement.closest('.parameter-item') : null;
    
    if (carSineType) {
        carSineType.addEventListener('change', function() {
            if (this.value === 'multi') {
                if (carMultisineParams) carMultisineParams.style.display = 'block';
                if (car3DSineParams) car3DSineParams.style.display = 'none';
                if (carK) carK.style.display = 'none';
            } else if (this.value === '3d') {
                if (carMultisineParams) carMultisineParams.style.display = 'none';
                if (car3DSineParams) car3DSineParams.style.display = 'block';
                if (carK) carK.style.display = 'none';
            } else {
                if (carMultisineParams) carMultisineParams.style.display = 'none';
                if (car3DSineParams) car3DSineParams.style.display = 'none';
                if (carK) carK.style.display = '';
            }
        });
    }

    // 添加Enhanced DILL层显示模式控制功能
    function addEnhancedDillLayerModeControl() {
        // 检查是否已经添加了控制元素
        if (document.getElementById('enhanced-dill-layer-mode-control')) {
            return;
        }
        
        // 寻找Enhanced DILL模型的控制面板
        const enhancedDillContainer = document.querySelector('#enhanced-dill-4d-animation-container') ||
                                      document.querySelector('.enhanced-dill-controls') ||
                                      document.querySelector('#enhanced-dill-model-tab');
        
        if (!enhancedDillContainer) {
            console.log('未找到Enhanced DILL控制容器，稍后重试');
            // 稍后再试
            setTimeout(addEnhancedDillLayerModeControl, 1000);
            return;
        }
        
        // 创建层控制元素
        const layerControlDiv = document.createElement('div');
        layerControlDiv.id = 'enhanced-dill-layer-mode-control';
        layerControlDiv.className = 'enhanced-dill-layer-control mb-3 p-2 border rounded';
        layerControlDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <label class="form-label me-2 mb-0">🎭 3D层显示模式:</label>
                <select id="enhanced-dill-layer-mode-select" class="form-select form-select-sm" style="width: auto;">
                    <option value="single">🔹 仅表面层</option>
                    <option value="multi" selected>🔶 多层显示 (表面+中间+底部)</option>
                    <option value="all">🔷 全部层显示 (最多5层)</option>
                </select>
                <small class="text-muted ms-2">影响4D动画的层数显示</small>
            </div>
        `;
        
        // 插入到容器的开头
        enhancedDillContainer.insertBefore(layerControlDiv, enhancedDillContainer.firstChild);
        
        // 绑定事件处理
        const layerModeSelect = document.getElementById('enhanced-dill-layer-mode-select');
        if (layerModeSelect) {
            layerModeSelect.addEventListener('change', function() {
                const newMode = this.value;
                window.enhancedDillLayerMode = newMode;
                
                console.log(`Enhanced DILL层显示模式切换为: ${newMode}`);
                
                // 显示切换提示
                showLayerModeChangeNotification(newMode);
                
                // 如果动画正在播放，立即更新当前帧
                if (typeof enhancedDill4DAnimationState !== 'undefined' && 
                    enhancedDill4DAnimationState.isPlaying && 
                    typeof enhancedDill4DAnimationData !== 'undefined' && 
                    enhancedDill4DAnimationData) {
                    updateEnhancedDill4DAnimationFrame(enhancedDill4DAnimationState.currentFrame);
                }
            });
        }
        
        console.log('Enhanced DILL层显示模式控制已添加');
    }

    // 显示模式切换通知
    function showLayerModeChangeNotification(mode) {
        const modeDescriptions = {
            'single': '仅显示表面层 - 清晰查看表面效应',
            'multi': '显示3层 (表面+中间+底部) - 均衡的层次展示',
            'all': '显示全部层 - 完整的深度信息'
        };
        
        const description = modeDescriptions[mode] || '未知模式';
        
        // 创建临时通知
        const notification = document.createElement('div');
        notification.className = 'alert alert-info alert-dismissible fade show position-fixed';
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
        notification.innerHTML = `
            <strong>层显示模式已切换</strong><br>
            ${description}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // 2.5秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2500);
    }

    // 在页面加载时添加控制元素
    document.addEventListener('DOMContentLoaded', function() {
        // 延迟添加，确保页面元素已加载
        setTimeout(addEnhancedDillLayerModeControl, 2000);
    });

    // 也在模型切换时尝试添加
    document.addEventListener('modelTypeChanged', function() {
        setTimeout(addEnhancedDillLayerModeControl, 500);
    });
}

/**
 * 更新空间频率K输入框的禁用状态
 * 当选择1D DILL模型时，将K输入框设为灰色不可编辑
 */
function updateKInputState() {
    const modelSelect = document.getElementById('model-select');
    const dillSineType = document.getElementById('dill-sine-type');
    const kSlider = document.getElementById('K');
    const kNumberInput = kSlider ? kSlider.closest('.parameter-item')?.querySelector('.number-input') : null;
    
    if (!modelSelect || !dillSineType || !kSlider || !kNumberInput) {
        return;
    }
    
    // 判断是否为1D DILL模型
    const isDill1D = (modelSelect.value === 'dill') && (dillSineType.value === 'single');
    
    if (isDill1D) {
        // 1D DILL模型时，禁用K输入框并设为灰色
        kSlider.disabled = true;
        kNumberInput.disabled = true;
        kSlider.style.opacity = '0.5';
        kNumberInput.style.opacity = '0.5';
        kSlider.style.cursor = 'not-allowed';
        kNumberInput.style.cursor = 'not-allowed';
        
        // 添加提示信息
        const kParameterItem = kSlider.closest('.parameter-item');
        if (kParameterItem && !kParameterItem.querySelector('.k-disabled-notice')) {
            const notice = document.createElement('div');
            notice.className = 'k-disabled-notice';
            notice.style.cssText = 'color: #666; font-size: 12px; margin-top: 5px; font-style: italic;';
            notice.textContent = '1D模式下空间频率由条纹分布模式自动确定';
            kParameterItem.appendChild(notice);
        }
        
        console.log('1D DILL模型：空间频率K输入框已禁用');
    } else {
        // 非1D DILL模型时，启用K输入框
        kSlider.disabled = false;
        kNumberInput.disabled = false;
        kSlider.style.opacity = '';
        kNumberInput.style.opacity = '';
        kSlider.style.cursor = '';
        kNumberInput.style.cursor = '';
        
        // 移除提示信息
        const kParameterItem = kSlider.closest('.parameter-item');
        const existingNotice = kParameterItem?.querySelector('.k-disabled-notice');
        if (existingNotice) {
            existingNotice.remove();
        }
        
        console.log('非1D DILL模型：空间频率K输入框已启用');
    }
}

/**
 * 绑定滑块事件
 */
/**
 * 自动计算空间频率K值
 * 根据公式：K = 4π × sin(a) / λ
 * 其中 a 是周期参数（度），λ 是波长（nm）
 */
function autoCalculateSpaceFrequencyK(showNotice = true) {
    // 获取周期参数和波长的元素
    const angleSlider = document.getElementById('angle_a');
    const wavelengthSlider = document.getElementById('wavelength');
    const wavelengthInput = document.getElementById('wavelength_number');
    const kSlider = document.getElementById('K');
    const kInput = kSlider ? kSlider.parentElement.querySelector('.number-input') : null;
    
    // 确保所有必要的元素都存在
    if (!angleSlider || (!wavelengthSlider && !wavelengthInput) || !kSlider || !kInput) {
        console.warn('⚠️ 无法找到计算K值所需的参数元素');
        return;
    }
    
    // 获取周期参数值（度）
    let angleValue = parseFloat(angleSlider.value);
    if (isNaN(angleValue)) {
        console.warn('⚠️ 周期参数值无效:', angleSlider.value);
        return;
    }
    
    // 获取波长值（nm），优先使用数字输入框
    let wavelengthValue;
    if (wavelengthInput && wavelengthInput.value !== '') {
        wavelengthValue = parseFloat(wavelengthInput.value);
    } else if (wavelengthSlider) {
        wavelengthValue = parseFloat(wavelengthSlider.value);
    }
    
    if (isNaN(wavelengthValue) || wavelengthValue <= 0) {
        console.warn('⚠️ 波长值无效:', wavelengthValue);
        return;
    }
    
    // 将周期转换为弧度
    const angleInRadians = angleValue * Math.PI / 180;
    
    // 计算空间频率K = 4π × sin(a) / λ
    const calculatedK = (4 * Math.PI * Math.sin(angleInRadians)) / wavelengthValue;
    
    // 限制K值在滑块范围内
    const minK = parseFloat(kSlider.min) || 0.1;
    const maxK = parseFloat(kSlider.max) || 10;
    const clampedK = Math.max(minK, Math.min(maxK, calculatedK));
    
    // 保留4位小数
    const roundedK = Math.round(clampedK * 10000) / 10000;
    
    // 更新K的滑块和输入框值
    kSlider.value = roundedK;
    kInput.value = roundedK;
    
    // 更新滑块填充效果
    const kParameterItem = kSlider.closest('.parameter-item');
    if (kParameterItem) {
        updateSliderFill(kSlider, kParameterItem);
    }
    
    // 添加视觉反馈效果
    kInput.classList.add('auto-calculated');
    setTimeout(() => {
        kInput.classList.remove('auto-calculated');
    }, 1000);
    
    // 记录计算过程（仅在调试时显示）
    console.log(`🔄 自动计算空间频率K:
        周期 a = ${angleValue}° (${angleInRadians.toFixed(4)} rad)
        波长 λ = ${wavelengthValue} nm  
        计算结果 K = 4π×sin(${angleValue}°)/${wavelengthValue} = ${calculatedK.toFixed(6)}
        最终值 K = ${roundedK} rad/μm`);
    
    // 显示计算提示（仅在showNotice为true时显示）
    if (showNotice) {
        showKCalculationNotice(angleValue, wavelengthValue, roundedK);
    }
}

/**
 * 显示K值自动计算的提示信息
 */
function showKCalculationNotice(angle, wavelength, kValue) {
    // 移除已有的提示
    const existingNotice = document.querySelector('.k-calculation-notice');
    if (existingNotice) {
        existingNotice.remove();
    }
    
    // 创建新的提示元素
    const notice = document.createElement('div');
    notice.className = 'k-calculation-notice';
    notice.innerHTML = `
        <div class="notice-content">
            <i class="fas fa-calculator"></i>
            <span>空间频率K已自动计算</span>
            <div class="calculation-details">
                K = 4π×sin(${angle}°)/${wavelength} = ${kValue} rad/μm
            </div>
            <button class="close-notice" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // 添加样式
    notice.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #4caf50, #45a049);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        z-index: 9999;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 13px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 350px;
    `;
    
    notice.querySelector('.notice-content').style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 6px;
    `;
    
    notice.querySelector('.calculation-details').style.cssText = `
        font-size: 11px;
        opacity: 0.9;
        font-family: monospace;
        background: rgba(255,255,255,0.1);
        padding: 4px 8px;
        border-radius: 4px;
    `;
    
    notice.querySelector('.close-notice').style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        border-radius: 3px;
        opacity: 0.8;
        transition: opacity 0.2s ease;
    `;
    
    // 添加到页面
    document.body.appendChild(notice);
    
    // 触发动画
    setTimeout(() => {
        notice.style.opacity = '1';
        notice.style.transform = 'translateX(0)';
    }, 10);
    
    // 2.5秒后自动消失
    setTimeout(() => {
        if (notice.parentElement) {
            notice.style.opacity = '0';
            notice.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notice.parentElement) {
                    notice.remove();
                }
            }, 300);
        }
    }, 2500);
}

function bindSliderEvents() {
    // 获取所有参数滑块和输入框
    const parameterItems = document.querySelectorAll('.parameter-item');
    
    parameterItems.forEach(item => {
        const slider = item.querySelector('.slider');
        const input = item.querySelector('.number-input');
        if (!slider || !input) return; // 没有滑块或输入框直接跳过
        const valueDisplay = item.querySelector('.parameter-value');
        
        // 初始化滑块填充效果
        updateSliderFill(slider, item);
        
        // 滑块值变化时更新输入框
        slider.addEventListener('input', () => {
            input.value = slider.value;
            // 不再更新隐藏的valueDisplay
            // if (valueDisplay) valueDisplay.textContent = slider.value;
            
            // 更新滑块填充效果
            updateSliderFill(slider, item);
            
            // 为输入框添加脉动效果（替代原来的valueDisplay效果）
            input.classList.add('pulse');
            setTimeout(() => {
                input.classList.remove('pulse');
            }, 300);
            
            // 检查是否需要自动计算空间频率K（周期参数或波长变化时）
            if (slider.id === 'angle_a' || slider.id === 'wavelength') {
                autoCalculateSpaceFrequencyK();
            }
            
            // 清空图表显示
            clearAllCharts();
        });
        
        // 输入框值变化时更新滑块
        input.addEventListener('input', () => {
            let value = parseFloat(input.value);
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            
            // 🔧 为波长参数添加特殊调试
            if (input.id === 'wavelength_number') {
                console.log(`🌈 波长数字输入框值变化: 输入值=${input.value}, 解析值=${value}, 范围=[${min}, ${max}]`);
            }
            
            if (isNaN(value) || value < min || value > max) {
                input.classList.add('input-error');
                input.setCustomValidity(LANGS[currentLang].error_message);
                
                if (input.id === 'wavelength_number') {
                    console.warn(`🌈 波长值超出范围: ${value}, 有效范围: [${min}, ${max}]`);
                }
            } else {
                input.classList.remove('input-error');
                input.setCustomValidity('');
            }
            
            slider.value = value;
            // 确保输入框显示正确的值
            if (input.value != value) {
                input.value = value;
            }
            
            // 🔧 为波长参数添加特殊调试
            if (input.id === 'wavelength_number') {
                console.log(`🌈 波长同步后: 滑块值=${slider.value}, 输入框值=${input.value}`);
            }
            
            // 更新滑块填充效果
            updateSliderFill(slider, item);
            
            // 添加闪烁效果
            input.classList.add('blink');
            setTimeout(() => {
                input.classList.remove('blink');
            }, 300);
            
            // 检查是否需要自动计算空间频率K（周期参数或波长变化时）
            if (input.id === 'angle_a' || input.id === 'wavelength_number') {
                autoCalculateSpaceFrequencyK();
            }
            
            // 清空图表显示
            clearAllCharts();
        });
    });
}

/**
 * 更新滑块填充效果
 * 
 * @param {HTMLElement} slider 滑块元素
 * @param {HTMLElement} item 参数项容器
 */
function updateSliderFill(slider, item) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const value = parseFloat(slider.value);
    const fillPercent = ((value - min) / (max - min)) * 100;
    
    // 设置CSS自定义属性
    item.style.setProperty('--fill-percent', `${fillPercent}%`);
}

/**
 * 获取参数值
 * 
 * @returns {Object} 参数对象
 */
function getParameterValues() {
    // 判断当前模型
    const modelType = document.getElementById('model-select').value;
    let params = { model_type: modelType };
    if (modelType === 'dill') {
        const sineTypeElement = document.getElementById('dill-sine-type');
        const sineType = sineTypeElement ? sineTypeElement.value : 'single';
        params.sine_type = sineType;
        
        // 添加空值检查的参数获取
        const I_avg_elem = document.getElementById('I_avg');
        const V_elem = document.getElementById('V');
        const t_exp_elem = document.getElementById('t_exp');
        const C_elem = document.getElementById('C');
        
        params.I_avg = I_avg_elem ? parseFloat(I_avg_elem.value) || 0.5 : 0.5;
        params.V = V_elem ? parseFloat(V_elem.value) || 0.8 : 0.8;
        params.t_exp = t_exp_elem ? parseFloat(t_exp_elem.value) || 100.0 : 100.0;
        params.C = C_elem ? parseFloat(C_elem.value) || 0.022 : 0.022;
        
        // 添加理想曝光模型的新参数
        const angle_a_elem = document.getElementById('angle_a');
        const exposure_threshold_elem = document.getElementById('exposure_threshold');
        const wavelength_elem = document.getElementById('wavelength');
        const wavelength_number_elem = document.getElementById('wavelength_number');
        
        params.angle_a = angle_a_elem ? parseFloat(angle_a_elem.value) || 11.7 : 11.7;
        params.exposure_threshold = exposure_threshold_elem ? parseFloat(exposure_threshold_elem.value) || 20 : 20;
        
        // 🔧 修复波长参数获取逻辑：优先使用数字输入框的值
        let wavelengthValue = 405; // 默认值
        if (wavelength_number_elem && wavelength_number_elem.value !== '') {
            // 优先使用数字输入框的值
            const numberValue = parseFloat(wavelength_number_elem.value);
            if (!isNaN(numberValue) && numberValue >= 200 && numberValue <= 800) {
                wavelengthValue = numberValue;
            }
        } else if (wavelength_elem && wavelength_elem.value !== '') {
            // 备用：使用滑块的值
            const sliderValue = parseFloat(wavelength_elem.value);
            if (!isNaN(sliderValue) && sliderValue >= 200 && sliderValue <= 800) {
                wavelengthValue = sliderValue;
            }
        }
        params.wavelength = wavelengthValue;
        
        // 检查是否使用自定义光强分布
        const intensityMethodSelect = document.getElementById('intensity_input_method');
        if (intensityMethodSelect && intensityMethodSelect.value === 'custom' && customIntensityData.loaded) {
            console.log('🎯 使用自定义光强分布数据');
            
            // 检查是否需要进行单位转换
            let x_data = [...customIntensityData.x]; // 复制数组，避免修改原始数据
            const unit_scale = customIntensityData.unit_scale || 1.0;
            
            // 如果单位不是默认的mm，需要进行转换
            if (unit_scale !== 1.0) {
                console.log(`🔄 单位转换: ${customIntensityData.x_unit} -> mm，比例: ×${unit_scale}`);
                // 对x坐标进行单位转换
                x_data = x_data.map(x => x * unit_scale);
            }
            
            params.custom_intensity_data = {
                x: x_data, // 使用可能经过单位转换的坐标
                intensity: customIntensityData.intensity,
                original_unit: customIntensityData.x_unit,
                unit_scale: unit_scale,
                outside_range_mode: customIntensityData.outside_range_mode || 'zero', // 数据范围外光强处理方式
                custom_intensity_value: customIntensityData.outside_range_mode === 'custom' ? customIntensityData.custom_intensity_value || 0 : 0 // 自定义光强值
            };
            
            // === 🔍 前端调试自定义光强数据 ===
            console.log('🔍 前端调试 - 自定义光强数据传递检查:');
            console.log('   - customIntensityData.loaded:', customIntensityData.loaded);
            console.log('   - customIntensityData.x点数:', customIntensityData.x.length);
            console.log('   - customIntensityData.intensity点数:', customIntensityData.intensity.length);
            console.log('   - X坐标原始范围:', [Math.min(...customIntensityData.x), Math.max(...customIntensityData.x)], customIntensityData.x_unit);
            console.log('   - X坐标转换后范围:', [Math.min(...x_data), Math.max(...x_data)], 'mm');
            console.log('   - 光强范围:', [Math.min(...customIntensityData.intensity), Math.max(...customIntensityData.intensity)]);
            console.log('   - 传递给后端的数据:', params.custom_intensity_data);
            // === 调试结束 ===
        } else {
            console.log('🔧 未使用自定义光强分布，使用公式计算');
            console.log('   - 输入方式选择器存在:', !!intensityMethodSelect);
            console.log('   - 输入方式值:', intensityMethodSelect?.value);
            console.log('   - customIntensityData.loaded:', customIntensityData.loaded);
        }
        
        // 🔸 调试波长参数
        console.log(`🌈 前端波长参数调试: wavelength = ${params.wavelength} nm`);
        console.log(`🌈 数字输入框值: ${wavelength_number_elem?.value}, 滑块值: ${wavelength_elem?.value}`);
        if (wavelength_number_elem) {
            console.log(`🌈 数字输入框状态: 存在=${!!wavelength_number_elem}, 值=${wavelength_number_elem.value}, 类型=${typeof wavelength_number_elem.value}`);
        }
        if (wavelength_elem) {
            console.log(`🌈 滑块状态: 存在=${!!wavelength_elem}, 值=${wavelength_elem.value}, 类型=${typeof wavelength_elem.value}`);
        }
        if (sineType === 'single') {
            // 首先设置K参数（必需参数）
            const K_elem = document.getElementById('K');
            params.K = K_elem ? parseFloat(K_elem.value) || 2.0 : 2.0;
            
            // 检查1D动画参数
            const enable1DAnimationElem = document.getElementById('enable_1d_animation_dill');
            const enable1DAnimation = enable1DAnimationElem ? enable1DAnimationElem.checked || false : false;
            if (enable1DAnimation) {
                params.enable_1d_animation = true;
                const t_start_1d_elem = document.getElementById('t_start_1d_dill');
                const t_end_1d_elem = document.getElementById('t_end_1d_dill');
                const time_steps_1d_elem = document.getElementById('time_steps_1d_dill');
                
                params.t_start = t_start_1d_elem ? parseFloat(t_start_1d_elem.value) || 0 : 0;
                params.t_end = t_end_1d_elem ? parseFloat(t_end_1d_elem.value) || 5 : 5;
                params.time_steps = time_steps_1d_elem ? parseInt(time_steps_1d_elem.value) || 500 : 500;
                console.log('DILL模型1D模式启用时间动画:', params.enable_1d_animation, '时间范围:', params.t_start, '-', params.t_end, '步数:', params.time_steps);
            }
            
            // 检查1D V评估参数
            const enable1DVEvaluationElem = document.getElementById('enable_1d_v_evaluation_dill');
            const enable1DVEvaluation = enable1DVEvaluationElem ? enable1DVEvaluationElem.checked || false : false;
            if (enable1DVEvaluation) {
                params.enable_1d_v_evaluation = true;
                const v_start_1d_elem = document.getElementById('v_start_1d_dill');
                const v_end_1d_elem = document.getElementById('v_end_1d_dill');
                const v_steps_1d_elem = document.getElementById('v_steps_1d_dill');
                
                params.v_start = v_start_1d_elem ? parseFloat(v_start_1d_elem.value) || 0.1 : 0.1;
                params.v_end = v_end_1d_elem ? parseFloat(v_end_1d_elem.value) || 1.0 : 1.0;
                params.time_steps = v_steps_1d_elem ? parseInt(v_steps_1d_elem.value) || 500 : 500;
                console.log('DILL模型1D模式启用V评估:', params.enable_1d_v_evaluation, 'V范围:', params.v_start, '-', params.v_end, '步数:', params.time_steps);
            }
            
            // 检查1D曝光时间窗口参数
            const enableExposureTimeWindowElem = document.getElementById('enable_exposure_time_window_dill');
            const enableExposureTimeWindow = enableExposureTimeWindowElem ? enableExposureTimeWindowElem.checked || false : false;
            
            // 检查当前是否为累积模式
            const exposureMethodSelect = document.getElementById('exposure_calculation_method');
            const isCumulativeMode = exposureMethodSelect && exposureMethodSelect.value === 'cumulative';
            
            // 根据曝光时间窗口开关状态设置参数（但在累积模式下应该禁用）
            if (enableExposureTimeWindow && !isCumulativeMode) {
                // 启用窗口模式：使用自定义曝光时间列表
                const customExposureTimes = getCustomExposureTimes();
                if (customExposureTimes && customExposureTimes.length > 0) {
                    params.enable_exposure_time_window = true;
                    params.custom_exposure_times = customExposureTimes;
                    console.log('DILL模型1D模式启用曝光时间窗口:', params.enable_exposure_time_window, '自定义曝光时间:', params.custom_exposure_times);
                } else {
                    console.warn('⚠️ 曝光时间窗口已启用但没有有效的自定义曝光时间，将使用单一曝光时间值');
                    params.enable_exposure_time_window = false;
                }
            } else {
                // 未启用窗口模式或处于累积模式：使用上方的单一曝光时间值
                params.enable_exposure_time_window = false;
                if (enableExposureTimeWindow && isCumulativeMode) {
                    console.log('🔒 累积模式下禁用曝光时间窗口功能，使用累积计算逻辑');
                }
                // 确保使用params.t_exp（已在前面设置）作为单一曝光时间
                console.log('DILL模型1D模式使用单一曝光时间:', params.t_exp, 's');
            }
        } else if (sineType === 'multi') {
            const Kx_elem = document.getElementById('Kx');
            const Ky_elem = document.getElementById('Ky');
            const phi_expr_elem = document.getElementById('phi_expr');
            const y_min_elem = document.getElementById('y_min');
            const y_max_elem = document.getElementById('y_max');
            const y_points_elem = document.getElementById('y_points');
            
            params.Kx = Kx_elem ? parseFloat(Kx_elem.value) || 2.0 : 2.0;
            params.Ky = Ky_elem ? parseFloat(Ky_elem.value) || 0.0 : 0.0;
            params.phi_expr = phi_expr_elem ? phi_expr_elem.value || '0' : '0';
            // y范围参数
            params.y_min = y_min_elem ? parseFloat(y_min_elem.value) || 0.0 : 0.0;
            params.y_max = y_max_elem ? parseFloat(y_max_elem.value) || 10.0 : 10.0;
            params.y_points = y_points_elem ? parseInt(y_points_elem.value) || 100 : 100;
        } else if (sineType === '3d') {
            const Kx_3d_elem = document.getElementById('Kx_3d');
            const Ky_3d_elem = document.getElementById('Ky_3d');
            const Kz_3d_elem = document.getElementById('Kz_3d');
            const phi_expr_3d_elem = document.getElementById('phi_expr_3d');
            const x_min_3d_elem = document.getElementById('x_min_3d');
            const x_max_3d_elem = document.getElementById('x_max_3d');
            const y_min_3d_elem = document.getElementById('y_min_3d');
            const y_max_3d_elem = document.getElementById('y_max_3d');
            const z_min_3d_elem = document.getElementById('z_min_3d');
            const z_max_3d_elem = document.getElementById('z_max_3d');
            
            params.Kx = Kx_3d_elem ? parseFloat(Kx_3d_elem.value) || 2.0 : 2.0;
            params.Ky = Ky_3d_elem ? parseFloat(Ky_3d_elem.value) || 2.0 : 2.0;
            params.Kz = Kz_3d_elem ? parseFloat(Kz_3d_elem.value) || 2.0 : 2.0;
            params.phi_expr = phi_expr_3d_elem ? phi_expr_3d_elem.value || '0' : '0';
            // 为3D模式添加K参数
            params.K = params.Kx;
            // 三维范围参数
            params.x_min = x_min_3d_elem ? parseFloat(x_min_3d_elem.value) || 0.0 : 0.0;
            params.x_max = x_max_3d_elem ? parseFloat(x_max_3d_elem.value) || 10.0 : 10.0;
            params.y_min = y_min_3d_elem ? parseFloat(y_min_3d_elem.value) || 0.0 : 0.0;
            params.y_max = y_max_3d_elem ? parseFloat(y_max_3d_elem.value) || 10.0 : 10.0;
            params.z_min = z_min_3d_elem ? parseFloat(z_min_3d_elem.value) || 0.0 : 0.0;
            params.z_max = z_max_3d_elem ? parseFloat(z_max_3d_elem.value) || 10.0 : 10.0;
            
        } else if (sineType === '2d_exposure_pattern') {
            // 处理2D曝光图案参数 - 使用上方的单个曝光时间
            const x_min_2d_elem = document.getElementById('x_min_2d');
            const x_max_2d_elem = document.getElementById('x_max_2d');
            const y_min_2d_elem = document.getElementById('y_min_2d');
            const y_max_2d_elem = document.getElementById('y_max_2d');
            const step_size_2d_elem = document.getElementById('step_size_2d');
            
            // 直接使用上方的曝光时间参数，不再使用独立的时间数组
            // params.exposure_times 不再设置，后端将使用 t_exp
            
            // 获取2D曝光图案参数
            params.x_min_2d = x_min_2d_elem ? parseFloat(x_min_2d_elem.value) || -1000 : -1000;
            params.x_max_2d = x_max_2d_elem ? parseFloat(x_max_2d_elem.value) || 1000 : 1000;
            params.y_min_2d = y_min_2d_elem ? parseFloat(y_min_2d_elem.value) || -1000 : -1000;
            params.y_max_2d = y_max_2d_elem ? parseFloat(y_max_2d_elem.value) || 1000 : 1000;
            params.step_size_2d = step_size_2d_elem ? parseFloat(step_size_2d_elem.value) || 5 : 5;
            
            console.log('DILL模型2D曝光图案参数:', {
                exposure_time: params.t_exp,
                x_range: [params.x_min_2d, params.x_max_2d],
                y_range: [params.y_min_2d, params.y_max_2d],
                step_size: params.step_size_2d
            });
            
            // 检查4D动画参数
            const enable4DAnimationElem = document.getElementById('enable_4d_animation_dill');
            const enable4DAnimation = enable4DAnimationElem ? enable4DAnimationElem.checked || false : false;
            if (enable4DAnimation) {
                params.enable_4d_animation = true;
                const t_start_elem = document.getElementById('t_start_dill');
                const t_end_elem = document.getElementById('t_end_dill');
                const time_steps_elem = document.getElementById('time_steps_dill');
                
                params.t_start = t_start_elem ? parseFloat(t_start_elem.value) || 0 : 0;
                params.t_end = t_end_elem ? parseFloat(t_end_elem.value) || 5 : 5;
                params.time_steps = time_steps_elem ? parseInt(time_steps_elem.value) || 500 : 500;
                console.log('DILL模型3D模式启用4D动画:', params.enable_4d_animation, '时间范围:', params.t_start, '-', params.t_end, '步数:', params.time_steps);
                console.log('4D动画相位表达式:', params.phi_expr);
                
                // 检查相位表达式是否包含时间变量
                if (params.phi_expr && !params.phi_expr.includes('t') && params.phi_expr !== '0') {
                    console.warn('⚠️ 4D动画提示：相位表达式不包含时间变量t，动画可能不会有变化。建议使用sin(t)、cos(t)等时间相关表达式。');
                } else if (params.phi_expr === '0') {
                    console.warn('⚠️ 4D动画提示：相位表达式为常数0，动画不会有变化。建议改为sin(t)等时间相关表达式。');
                }
            }
        } else {
            const K_elem = document.getElementById('K');
            params.K = K_elem ? parseFloat(K_elem.value) || 2.0 : 2.0;
        }
    } else if (modelType === 'enhanced_dill') {
        const sineTypeElement = document.getElementById('enhanced-dill-sine-type');
        const sineType = sineTypeElement ? sineTypeElement.value : 'single';
        params.sine_type = sineType;
        
        // 添加空值检查的参数获取
        const z_h_elem = document.getElementById('z_h');
        const T_elem = document.getElementById('T');
        const t_B_elem = document.getElementById('t_B');
        const I0_elem = document.getElementById('I0');
        const M0_elem = document.getElementById('M0');
        const t_exp_enhanced_elem = document.getElementById('t_exp_enhanced');
        const enhanced_V_elem = document.getElementById('enhanced_V');
        
        params.z_h = z_h_elem ? parseFloat(z_h_elem.value) || 1.0 : 1.0;
        params.T = T_elem ? parseFloat(T_elem.value) || 95.0 : 95.0;
        params.t_B = t_B_elem ? parseFloat(t_B_elem.value) || 90.0 : 90.0;
        params.I0 = I0_elem ? parseFloat(I0_elem.value) || 1.0 : 1.0;
        params.M0 = M0_elem ? parseFloat(M0_elem.value) || 1.0 : 1.0;
        params.t_exp = t_exp_enhanced_elem ? parseFloat(t_exp_enhanced_elem.value) || 100.0 : 100.0;
        
        // 确保V参数在所有模式下都存在，并有合理的默认值
        params.V = enhanced_V_elem ? parseFloat(enhanced_V_elem.value) || 0.8 : 0.8;
        
        // 添加增强Dill模型的干涉条纹可见度(V)参数
        if (sineType === 'single') {
            const enhanced_K_elem = document.getElementById('enhanced_K');
            params.K = enhanced_K_elem ? parseFloat(enhanced_K_elem.value) || 2.0 : 2.0;
            console.log(`Enhanced Dill 1D模式: V=${params.V}, K=${params.K}`);
        }
        
        // 优化：无论 single 还是 multi 都传递 K
        if (!params.K) {
            const enhanced_K_elem = document.getElementById('enhanced_K');
            if (enhanced_K_elem) {
                params.K = parseFloat(enhanced_K_elem.value) || 2.0;
            } else {
                params.K = 2.0;
            }
        }
        
        if (sineType === 'multi') {
            const enhanced_Kx_elem = document.getElementById('enhanced_Kx');
            const enhanced_Ky_elem = document.getElementById('enhanced_Ky');
            const enhanced_phi_expr_elem = document.getElementById('enhanced_phi_expr');
            const enhanced_y_min_elem = document.getElementById('enhanced_y_min');
            const enhanced_y_max_elem = document.getElementById('enhanced_y_max');
            const enhanced_y_points_elem = document.getElementById('enhanced_y_points');
            
            params.Kx = enhanced_Kx_elem ? parseFloat(enhanced_Kx_elem.value) || 2.0 : 2.0;
            params.Ky = enhanced_Ky_elem ? parseFloat(enhanced_Ky_elem.value) || 0.0 : 0.0;
            params.phi_expr = enhanced_phi_expr_elem ? enhanced_phi_expr_elem.value || '0' : '0';
            // 添加Y轴范围参数
            params.y_min = enhanced_y_min_elem ? parseFloat(enhanced_y_min_elem.value) || 0.0 : 0.0;
            params.y_max = enhanced_y_max_elem ? parseFloat(enhanced_y_max_elem.value) || 10.0 : 10.0;
            params.y_points = enhanced_y_points_elem ? parseInt(enhanced_y_points_elem.value) || 100 : 100;
            
            // 确保K参数存在
            if (!params.K) {
                params.K = params.Kx;
            }
        } else if (sineType === '3d') {
            const enhanced_Kx_3d_elem = document.getElementById('enhanced_Kx_3d');
            const enhanced_Ky_3d_elem = document.getElementById('enhanced_Ky_3d');
            const enhanced_Kz_3d_elem = document.getElementById('enhanced_Kz_3d');
            const enhanced_phi_expr_3d_elem = document.getElementById('enhanced_phi_expr_3d');
            const enhanced_x_min_3d_elem = document.getElementById('enhanced_x_min_3d');
            const enhanced_x_max_3d_elem = document.getElementById('enhanced_x_max_3d');
            const enhanced_y_min_3d_elem = document.getElementById('enhanced_y_min_3d');
            const enhanced_y_max_3d_elem = document.getElementById('enhanced_y_max_3d');
            const enhanced_z_min_3d_elem = document.getElementById('enhanced_z_min_3d');
            const enhanced_z_max_3d_elem = document.getElementById('enhanced_z_max_3d');
            
            params.Kx = enhanced_Kx_3d_elem ? parseFloat(enhanced_Kx_3d_elem.value) || 2.0 : 2.0;
            params.Ky = enhanced_Ky_3d_elem ? parseFloat(enhanced_Ky_3d_elem.value) || 2.0 : 2.0;
            params.Kz = enhanced_Kz_3d_elem ? parseFloat(enhanced_Kz_3d_elem.value) || 2.0 : 2.0;
            params.phi_expr = enhanced_phi_expr_3d_elem ? enhanced_phi_expr_3d_elem.value || '0' : '0';
            // 为3D模式添加K参数
            params.K = params.Kx;
            // 三维范围参数
            params.x_min = enhanced_x_min_3d_elem ? parseFloat(enhanced_x_min_3d_elem.value) || 0.0 : 0.0;
            params.x_max = enhanced_x_max_3d_elem ? parseFloat(enhanced_x_max_3d_elem.value) || 10.0 : 10.0;
            params.y_min = enhanced_y_min_3d_elem ? parseFloat(enhanced_y_min_3d_elem.value) || 0.0 : 0.0;
            params.y_max = enhanced_y_max_3d_elem ? parseFloat(enhanced_y_max_3d_elem.value) || 10.0 : 10.0;
            params.z_min = enhanced_z_min_3d_elem ? parseFloat(enhanced_z_min_3d_elem.value) || 0.0 : 0.0;
            params.z_max = enhanced_z_max_3d_elem ? parseFloat(enhanced_z_max_3d_elem.value) || 10.0 : 10.0;
            
            // 检查增强DILL模型4D动画参数
            const enable4DAnimationElem = document.getElementById('enable_4d_animation_enhanced_dill');
            const enable4DAnimation = enable4DAnimationElem ? enable4DAnimationElem.checked || false : false;
            if (enable4DAnimation) {
                params.enable_4d_animation = true;
                const t_start_elem = document.getElementById('t_start_enhanced_dill');
                const t_end_elem = document.getElementById('t_end_enhanced_dill');
                const time_steps_elem = document.getElementById('time_steps_enhanced_dill');
                
                params.t_start = t_start_elem ? parseFloat(t_start_elem.value) || 0 : 0;
                params.t_end = t_end_elem ? parseFloat(t_end_elem.value) || 5 : 5;
                params.time_steps = time_steps_elem ? parseInt(time_steps_elem.value) || 500 : 500;
                console.log('Enhanced DILL模型3D模式启用4D动画:', params.enable_4d_animation, '时间范围:', params.t_start, '-', params.t_end, '步数:', params.time_steps);
                console.log('Enhanced DILL 4D动画相位表达式:', params.phi_expr);
                
                // 检查相位表达式是否包含时间变量
                if (params.phi_expr && !params.phi_expr.includes('t') && params.phi_expr !== '0') {
                    console.warn('⚠️ Enhanced DILL 4D动画提示：相位表达式不包含时间变量t，动画可能不会有变化。建议使用sin(t)、cos(t)等时间相关表达式。');
                } else if (params.phi_expr === '0') {
                    console.warn('⚠️ Enhanced DILL 4D动画提示：相位表达式为常数0，动画不会有变化。建议改为sin(t)等时间相关表达式。');
                }
            } else {
                // 确保4D动画参数不会被传递
                params.enable_4d_animation = false;
                console.log('Enhanced DILL模型4D动画已禁用');
            }
        }
        
        // 最后确保关键参数都有值
        if (!params.K) {
            params.K = 2.0; // 默认空间频率
        }
        
        console.log('Enhanced DILL模型参数校验:', {
            sine_type: params.sine_type,
            V: params.V,
            K: params.K,
            Kx: params.Kx,
            Ky: params.Ky,
            enable_4d_animation: params.enable_4d_animation
        });
    } else if (modelType === 'car') {
        const sineTypeElement = document.getElementById('car-sine-type');
        const sineType = sineTypeElement ? sineTypeElement.value : 'single';
        params.sine_type = sineType;
        
        // 添加空值检查的参数获取
        const car_I_avg_elem = document.getElementById('car_I_avg');
        const car_V_elem = document.getElementById('car_V');
        const car_t_exp_elem = document.getElementById('car_t_exp');
        const car_acid_gen_efficiency_elem = document.getElementById('car_acid_gen_efficiency');
        const car_diffusion_length_elem = document.getElementById('car_diffusion_length');
        const car_reaction_rate_elem = document.getElementById('car_reaction_rate');
        const car_amplification_elem = document.getElementById('car_amplification');
        const car_contrast_elem = document.getElementById('car_contrast');
        
        params.I_avg = car_I_avg_elem ? parseFloat(car_I_avg_elem.value) : 1.0;
        params.V = car_V_elem ? parseFloat(car_V_elem.value) : 0.8;
        params.t_exp = car_t_exp_elem ? parseFloat(car_t_exp_elem.value) : 100.0;
        params.acid_gen_efficiency = car_acid_gen_efficiency_elem ? parseFloat(car_acid_gen_efficiency_elem.value) : 0.5;
        params.diffusion_length = car_diffusion_length_elem ? parseFloat(car_diffusion_length_elem.value) : 0.02;
        params.reaction_rate = car_reaction_rate_elem ? parseFloat(car_reaction_rate_elem.value) : 0.5;
        params.amplification = car_amplification_elem ? parseFloat(car_amplification_elem.value) : 5.0;
        params.contrast = car_contrast_elem ? parseFloat(car_contrast_elem.value) : 4.0;
        
        // 确保参数有效，提供默认值
        params.I_avg = isNaN(params.I_avg) ? 1.0 : params.I_avg;
        params.V = isNaN(params.V) ? 0.8 : params.V;
        params.t_exp = isNaN(params.t_exp) ? 100.0 : params.t_exp;
        params.acid_gen_efficiency = isNaN(params.acid_gen_efficiency) ? 0.5 : params.acid_gen_efficiency;
        params.diffusion_length = isNaN(params.diffusion_length) ? 0.02 : params.diffusion_length;
        params.reaction_rate = isNaN(params.reaction_rate) ? 0.5 : params.reaction_rate;
        params.amplification = isNaN(params.amplification) ? 5.0 : params.amplification;
        params.contrast = isNaN(params.contrast) ? 4.0 : params.contrast;
        
        // 添加可选的兼容字段
        params.initial_intensity = params.I_avg;  // 确保后端可以识别
        params.visibility = params.V;             // 可见度别名
        
        if (sineType === 'multi') {
            const car_Kx_elem = document.getElementById('car_Kx');
            const car_Ky_elem = document.getElementById('car_Ky');
            const car_phi_expr_elem = document.getElementById('car_phi_expr');
            const car_y_min_elem = document.getElementById('car_y_min');
            const car_y_max_elem = document.getElementById('car_y_max');
            const car_y_points_elem = document.getElementById('car_y_points');
            
            params.Kx = car_Kx_elem ? parseFloat(car_Kx_elem.value) : 2.0;
            params.Ky = car_Ky_elem ? parseFloat(car_Ky_elem.value) : 0.0;
            params.phi_expr = car_phi_expr_elem ? car_phi_expr_elem.value : '0';
            // 使用CAR模型自己的Y轴范围参数
            params.y_min = car_y_min_elem ? parseFloat(car_y_min_elem.value) : 0.0;
            params.y_max = car_y_max_elem ? parseFloat(car_y_max_elem.value) : 10.0;
            params.y_points = car_y_points_elem ? parseInt(car_y_points_elem.value) : 100;
            
            // 参数有效性校验
            params.Kx = isNaN(params.Kx) ? 2.0 : params.Kx;
            params.Ky = isNaN(params.Ky) ? 0.0 : params.Ky;
            params.phi_expr = params.phi_expr || '0';  // 提供默认相位表达式
            params.y_min = isNaN(params.y_min) ? 0.0 : params.y_min;
            params.y_max = isNaN(params.y_max) ? 10.0 : params.y_max;
            params.y_points = isNaN(params.y_points) ? 100 : params.y_points;
        } else if (sineType === '3d') {
            const car_Kx_3d_elem = document.getElementById('car_Kx_3d');
            const car_Ky_3d_elem = document.getElementById('car_Ky_3d');
            const car_Kz_3d_elem = document.getElementById('car_Kz_3d');
            const car_phi_expr_3d_elem = document.getElementById('car_phi_expr_3d');
            const car_x_min_3d_elem = document.getElementById('car_x_min_3d');
            const car_x_max_3d_elem = document.getElementById('car_x_max_3d');
            const car_y_min_3d_elem = document.getElementById('car_y_min_3d');
            const car_y_max_3d_elem = document.getElementById('car_y_max_3d');
            const car_z_min_3d_elem = document.getElementById('car_z_min_3d');
            const car_z_max_3d_elem = document.getElementById('car_z_max_3d');
            
            params.Kx = car_Kx_3d_elem ? parseFloat(car_Kx_3d_elem.value) : 2.0;
            params.Ky = car_Ky_3d_elem ? parseFloat(car_Ky_3d_elem.value) : 2.0;
            params.Kz = car_Kz_3d_elem ? parseFloat(car_Kz_3d_elem.value) : 2.0;
            params.phi_expr = car_phi_expr_3d_elem ? car_phi_expr_3d_elem.value : '0';
            // 为3D模式添加K参数
            params.K = params.Kx;
            // 三维范围参数
            params.x_min = car_x_min_3d_elem ? parseFloat(car_x_min_3d_elem.value) : 0.0;
            params.x_max = car_x_max_3d_elem ? parseFloat(car_x_max_3d_elem.value) : 10.0;
            params.y_min = car_y_min_3d_elem ? parseFloat(car_y_min_3d_elem.value) : 0.0;
            params.y_max = car_y_max_3d_elem ? parseFloat(car_y_max_3d_elem.value) : 10.0;
            params.z_min = car_z_min_3d_elem ? parseFloat(car_z_min_3d_elem.value) : 0.0;
            params.z_max = car_z_max_3d_elem ? parseFloat(car_z_max_3d_elem.value) : 10.0;
            
            // 参数有效性校验
            params.Kx = isNaN(params.Kx) ? 2.0 : params.Kx;
            params.Ky = isNaN(params.Ky) ? 2.0 : params.Ky;
            params.Kz = isNaN(params.Kz) ? 2.0 : params.Kz;
            params.phi_expr = params.phi_expr || '0';
            params.x_min = isNaN(params.x_min) ? 0.0 : params.x_min;
            params.x_max = isNaN(params.x_max) ? 10.0 : params.x_max;
            params.y_min = isNaN(params.y_min) ? 0.0 : params.y_min;
            params.y_max = isNaN(params.y_max) ? 10.0 : params.y_max;
            params.z_min = isNaN(params.z_min) ? 0.0 : params.z_min;
            params.z_max = isNaN(params.z_max) ? 10.0 : params.z_max;
        } else {
            const car_K_elem = document.getElementById('car_K');
            params.K = car_K_elem ? parseFloat(car_K_elem.value) || 2.0 : 2.0;
        }
        
        // 无论模式如何，都确保K参数存在
        if (typeof params.K === 'undefined' && typeof params.Kx !== 'undefined') {
            params.K = params.Kx;
        }
    }
    
    // 调用多段曝光时间累积模式的参数扩展函数
    if (typeof window.extendParametersWithCumulative === 'function') {
        params = window.extendParametersWithCumulative(params);
    }
    
    return params;
}

/**
 * 调用API计算Dill模型
 * 
 * @param {Object} params 参数对象
 * @returns {Promise} Promise对象
 */
async function calculateDillModel(params) {
    try {
        console.log('🚀 API请求参数:', params);
        
        // 🔥 多段曝光模式的详细调试
        if (params.exposure_calculation_method === 'cumulative') {
            console.log('🔥 发送多段曝光请求到后端:');
            console.log('   - exposure_calculation_method:', params.exposure_calculation_method);
            console.log('   - segment_count:', params.segment_count);
            console.log('   - segment_duration:', params.segment_duration);
            console.log('   - segment_intensities:', params.segment_intensities);
            console.log('   - total_exposure_dose:', params.total_exposure_dose);
            console.log('   - is_ideal_exposure_model:', params.is_ideal_exposure_model);
            console.log('   - sine_type:', params.sine_type);
        }
        
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        
        const result = await response.json();
        
        console.log('🔥 API响应:', result);
        
        // 🔥 多段曝光模式的响应调试
        if (result.success && result.data && result.data.exposure_calculation_method === 'cumulative') {
            console.log('🔥 收到多段曝光响应:');
            console.log('   - exposure_calculation_method:', result.data.exposure_calculation_method);
            console.log('   - segment_count:', result.data.segment_count);
            console.log('   - segment_duration:', result.data.segment_duration);
            console.log('   - segment_intensities:', result.data.segment_intensities);
            console.log('   - is_ideal_exposure_model:', result.data.is_ideal_exposure_model);
            console.log('   - intensity_distribution存在:', !!result.data.intensity_distribution);
            console.log('   - intensity_distribution长度:', result.data.intensity_distribution ? result.data.intensity_distribution.length : 'N/A');
        }
        
        if (!result.success) {
            throw new Error(result.message || '计算失败');
        }
        
        return result.data;
    } catch (error) {
        console.error('API调用错误:', error);
        throw error;
    }
}

/**
 * 检查和转换CAR模型数据格式，确保与前端可视化兼容
 * @param {Object} data - 后端返回的原始数据
 * @returns {Object} - 处理后的数据
 */
function preprocessCarModelData(data) {
    if (!data) return data;
    
    console.log('预处理CAR模型数据');
    
    // 复制数据对象，避免修改原始数据
    const processedData = {...data};
    
    // 确保基本1D数据可用
    if (!processedData.x && processedData.positions) {
        processedData.x = processedData.positions;
    }
    
    if (!processedData.exposure_dose && processedData.acid_concentration) {
        processedData.exposure_dose = processedData.acid_concentration;
    }
    
    if (!processedData.thickness && processedData.deprotection) {
        processedData.thickness = processedData.deprotection;
    }
    
    // 处理2D/3D数据 
    if (processedData.grid_data) {
        // 确保坐标数据可用
        if (!processedData.x_coords && processedData.grid_data.x) {
            processedData.x_coords = processedData.grid_data.x;
        }
        
        if (!processedData.y_coords && processedData.grid_data.y) {
            processedData.y_coords = processedData.grid_data.y;
        }
        
        if (!processedData.z_coords && processedData.grid_data.z) {
            processedData.z_coords = processedData.grid_data.z;
        }
        
        // 确保曝光/厚度数据可用
        if (!processedData.z_exposure_dose && processedData.grid_data.acid_concentration) {
            processedData.z_exposure_dose = processedData.grid_data.acid_concentration;
        }
        
        if (!processedData.z_thickness && processedData.grid_data.deprotection) {
            processedData.z_thickness = processedData.grid_data.deprotection;
        }
    }
    
    // 增加标志，表示这是CAR数据
    processedData.is_car_data = true;
    
    return processedData;
}

/**
 * 调用API获取计算数据(用于交互式图表)
 * 
 * @param {Object} params 参数对象
 * @returns {Promise} Promise对象
 */
async function calculateDillModelData(params) {
    try {
        const response = await fetch('/api/calculate_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || '数据计算失败');
        }
        
        let processedData = result.data;
        
        // 为CAR模型数据进行特殊处理
        if (params.model_type === 'car') {
            processedData = preprocessCarModelData(processedData);
        }
        
        return processedData;
    } catch (error) {
        console.error('API数据调用错误:', error);
        throw error;
    }
}

/**
 * 显示计算结果
 * 
 * @param {Object} data 结果数据
 */
function displayResults(data) {
    // 获取图像元素
    const exposurePlot = document.getElementById('exposure-plot');
    const thicknessPlot = document.getElementById('thickness-plot');
    
    // 设置图像源（Base64数据）
    exposurePlot.src = `data:image/png;base64,${data.exposure_plot}`;
    thicknessPlot.src = `data:image/png;base64,${data.thickness_plot}`;
    
    // 显示图像
    exposurePlot.style.display = 'block';
    thicknessPlot.style.display = 'block';
    
    // 隐藏交互式图表容器
    document.getElementById('exposure-plot-container').style.display = 'none';
    document.getElementById('thickness-plot-container').style.display = 'none';
    
    // 应用动画效果
    animateResults();
}

/**
 * 转换2D曝光图案数据为标准2D热图数据格式
 * 
 * @param {Object} data 2D曝光图案数据
 * @returns {Object} 转换后的热图数据
 */
function convert2DExposurePatternToHeatmapData(data) {
    console.log('转换2D曝光图案数据为热图格式...');
    
    if (!data.dose_distribution || !data.thickness_distribution || !data.X_grid || !data.Y_grid) {
        console.error('2D曝光图案数据不完整，无法转换');
        return data;
    }
    
    // 直接使用单个时间点的数据
    const exposureData = data.dose_distribution;
    const thicknessData = data.thickness_distribution;
    const exposureTime = data.exposure_time;
    
    // 从网格数据中提取坐标
    const x_coords = data.X_grid[0]; // 第一行就是x坐标
    const y_coords = data.Y_grid.map(row => row[0]); // 第一列就是y坐标
    
    console.log('2D曝光图案数据转换结果:', {
        x_coords_length: x_coords.length,
        y_coords_length: y_coords.length,
        exposure_data_shape: `${exposureData.length}x${exposureData[0]?.length}`,
        thickness_data_shape: `${thicknessData.length}x${thicknessData[0]?.length}`,
        exposure_time_used: exposureTime,
        exposure_data_range: exposureData ? (() => {
            let min = Infinity, max = -Infinity;
            for (const row of exposureData) {
                for (const val of row) {
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
            }
            return `[${min.toFixed(2)}, ${max.toFixed(2)}]`;
        })() : 'unknown',
        thickness_data_range: thicknessData ? (() => {
            let min = Infinity, max = -Infinity;
            for (const row of thicknessData) {
                for (const val of row) {
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
            }
            return `[${min.toFixed(4)}, ${max.toFixed(4)}]`;
        })() : 'unknown'
    });
    
    return {
        ...data,
        x_coords: x_coords,
        y_coords: y_coords,
        z_exposure_dose: exposureData,
        z_thickness: thicknessData,
        is_2d: true,
        sine_type: '2d_exposure_pattern',
        // 添加专用标题，确保显示正确的中文标题，包含当前使用的曝光时间
        exposure_title: `曝光计量分布 (2D) - t=${exposureTime}`,
        thickness_title: `形貌分布 (2D) - t=${exposureTime}`
    };
}

/**
 * 显示交互式计算结果
 * 
 * @param {Object} data 结果数据
 */
function displayInteractiveResults(data) {
    const modelSelect = document.getElementById('model-select');
    const currentModelType = modelSelect ? modelSelect.value : 'dill';

    // 🔧 修复：存储API响应数据到全局变量，包含parameters字段
    window.lastPlotData = data;
    console.log('🔧 存储API响应数据到window.lastPlotData，包含参数:', data.parameters);

    // 调试输出，检查数据结构
    console.log('Received data for display:', data, 'Model type:', currentModelType);
    console.log('数据字段详情:', {
        keys: Object.keys(data),
        is_3d: data.is_3d,
        has_x_coords: !!data.x_coords,
        has_y_coords: !!data.y_coords,
        has_exposure_dose: !!data.exposure_dose,
        exposure_dose_type: Array.isArray(data.exposure_dose) ? 'array' : typeof data.exposure_dose,
        exposure_dose_length: data.exposure_dose ? data.exposure_dose.length : 'undefined',
        exposure_dose_first_element_type: data.exposure_dose && data.exposure_dose[0] ? (Array.isArray(data.exposure_dose[0]) ? '2d_array' : typeof data.exposure_dose[0]) : 'undefined'
    });

    const staticExposurePlot = document.getElementById('exposure-plot');
    const staticThicknessPlot = document.getElementById('thickness-plot');
    if (staticExposurePlot) staticExposurePlot.style.display = 'none';
    if (staticThicknessPlot) staticThicknessPlot.style.display = 'none';

    const exposurePlotContainer = document.getElementById('exposure-plot-container');
    const thicknessPlotContainer = document.getElementById('thickness-plot-container');
    
    if (!exposurePlotContainer || !thicknessPlotContainer) {
        console.error("One or more plot containers are missing from the DOM.");
        return;
    }

    // Get title elements to dynamically update them
    const exposureTitleElement = exposurePlotContainer.parentElement.querySelector('.plot-title');
    const thicknessTitleElement = thicknessPlotContainer.parentElement.querySelector('.plot-title');

    // 清空容器，确保旧图被移除
    exposurePlotContainer.innerHTML = '';
    thicknessPlotContainer.innerHTML = '';
    exposurePlotContainer.style.display = 'block';
    thicknessPlotContainer.style.display = 'block';

    // 检查是否有3D数据 - 支持静态3D和4D动画数据
    const has3DData = data.is_3d === true || 
                     (data.x_coords && data.y_coords && 
                      ((data.exposure_dose && Array.isArray(data.exposure_dose) && Array.isArray(data.exposure_dose[0])) ||
                       (data.exposure_dose_frames && Array.isArray(data.exposure_dose_frames))));

    // 检查是否有二维数据
    const has2DData = data.is_2d || (data.z_exposure_dose && data.z_thickness) || 
                     (data.x_coords && data.y_coords && (data.z_exposure_dose || data.z_thickness)) ||
                     // 2D曝光图案数据检测
                     (data.sine_type === '2d_exposure_pattern' && data.dose_distribution && data.X_grid && data.Y_grid);
    
    console.log('数据维度判断结果:', {
        has3DData: has3DData,
        has2DData: has2DData,
        currentModelType: currentModelType,
        sine_type: data.sine_type,
        has_dose_distribution: !!data.dose_distribution,
        has_X_grid: !!data.X_grid,
        has_Y_grid: !!data.Y_grid,
        data_keys: Object.keys(data)
    });

    // Dynamically set titles based on data dimensions
    if (has3DData) {
        if (exposureTitleElement) exposureTitleElement.textContent = '曝光剂量分布 (3D)';
        if (thicknessTitleElement) thicknessTitleElement.textContent = '形貌分布 (3D)';
    } else if (has2DData) {
        if (currentModelType === 'dill' || currentModelType === 'car') {
            if (exposureTitleElement) exposureTitleElement.textContent = '曝光计量分布 (2D)';
            if (thicknessTitleElement) thicknessTitleElement.textContent = '形貌分布 (2D)';
        } else { // For 'enhanced_dill' model
            if (exposureTitleElement) exposureTitleElement.textContent = '曝光计量分布 (2D) (Y, Z平面)';
            if (thicknessTitleElement) thicknessTitleElement.textContent = '形貌分布 (2D) (Y, Z平面)';
        }
    } else {
        if (exposureTitleElement) exposureTitleElement.textContent = '曝光剂量分布 (1D)';
        if (thicknessTitleElement) thicknessTitleElement.textContent = '形貌分布 (1D)';
    }

    // 新增：CAR模型特殊处理 - 始终使用2D热图
    if (currentModelType === 'car') {
        console.log('CAR模型特殊处理：使用专用渲染函数');
        
        // 清空主图表容器，防止重复渲染
        exposurePlotContainer.innerHTML = '';
        thicknessPlotContainer.innerHTML = '';
        exposurePlotContainer.style.display = 'block';
        thicknessPlotContainer.style.display = 'block';
        
        // 首先尝试渲染主图表
        if (has3DData) {
            // 3D数据使用3D可视化
            console.log('CAR模型使用3D可视化');
            createExposure3DPlot(exposurePlotContainer, data);
            createThickness3DPlot(thicknessPlotContainer, data);
        } else if (has2DData) {
            // 已有2D数据格式，直接使用热图
            console.log('CAR模型渲染2D热图 - 已有2D数据格式');
            createExposureHeatmap(exposurePlotContainer, data);
            createThicknessHeatmap(thicknessPlotContainer, data);
        } else { // This implies !has3DData && !has2DData, so it should be 1D
            // 1D CAR数据，使用1D线图
            console.log('CAR模型渲染1D线图');
            // Backend for 1D CAR returns data.x, data.exposure_dose, data.thickness etc.
            if (data.x && (typeof data.exposure_dose !== 'undefined' || typeof data.thickness !== 'undefined')) {
                 createExposurePlot(exposurePlotContainer, data); 
                 createThicknessPlot(thicknessPlotContainer, data); 
            } else {
                console.error('CAR模型1D数据不完整或格式错误，无法渲染线图');
                exposurePlotContainer.innerHTML = '<div style="color:red;padding:20px;">CAR模型1D曝光数据不完整或格式错误</div>';
                thicknessPlotContainer.innerHTML = '<div style="color:red;padding:20px;">CAR模型1D厚度数据不完整或格式错误</div>';
            }
        }
        
        // 渲染CAR模型特有的右侧多图表
        const carInteractivePlotsContainer = document.getElementById('car-interactive-plots');
        if (carInteractivePlotsContainer) {
            // 清空容器，确保不会堆叠显示
            carInteractivePlotsContainer.innerHTML = '';
            
            if (typeof renderCarInteractivePlots === 'function') {
                try {
                    renderCarInteractivePlots(data);
                    carInteractivePlotsContainer.style.display = 'block';
                } catch (error) {
                    console.error('渲染CAR模型交互图表出错:', error);
                    carInteractivePlotsContainer.innerHTML = '<div style="color:red;padding:20px;">CAR模型图表渲染失败: ' + error.message + '</div>';
                }
            } else {
                console.error('renderCarInteractivePlots函数未找到');
                carInteractivePlotsContainer.style.display = 'none';
            }
        }
        
        // 处理CAR模型4D动画数据
        if (data.animation_frames || data.initial_acid_frames) {
            console.log('检测到CAR模型4D动画数据，设置4D动画界面');
            if (typeof render4DAnimation === 'function') {
                render4DAnimation(data);
            }
            
            // 显示4D动画区域
            const car4DAnimationSection = document.getElementById('car-4d-animation-section');
            if (car4DAnimationSection) {
                car4DAnimationSection.style.display = 'block';
            }
        }
    } else if (currentModelType === 'enhanced_dill') {
        // 增强Dill模型处理逻辑
        console.log('增强Dill模型数据处理', {has3DData, has2DData});
        
        // 首先检查是否有Enhanced DILL模型4D动画数据
        const hasEnhancedDill4DData = currentModelType === 'enhanced_dill' && (
            data.enable_4d_animation === true || 
            (data.exposure_dose_frames && Array.isArray(data.exposure_dose_frames) && data.exposure_dose_frames.length > 0) || 
            (data.thickness_frames && Array.isArray(data.thickness_frames) && data.thickness_frames.length > 0) || 
            (data.time_array && Array.isArray(data.time_array) && data.time_array.length > 1) ||
            (data.time_steps && data.time_steps > 1 && (data.exposure_dose_frames || data.thickness_frames))
        );
        
        if (hasEnhancedDill4DData) {
            console.log('检测到Enhanced DILL模型4D动画数据，首先渲染第一帧作为静态图表');
            console.log('Enhanced DILL 4D动画数据详情:', {
                enable_4d_animation: data.enable_4d_animation,
                has_exposure_dose_frames: !!data.exposure_dose_frames,
                has_thickness_frames: !!data.thickness_frames,
                has_time_array: !!data.time_array,
                time_steps: data.time_steps,
                sine_type: data.sine_type,
                exposure_frames_length: data.exposure_dose_frames ? data.exposure_dose_frames.length : 0,
                thickness_frames_length: data.thickness_frames ? data.thickness_frames.length : 0
            });
            
            // 处理第一帧数据作为静态图表显示
            if (data.exposure_dose_frames && data.thickness_frames && 
                data.exposure_dose_frames.length > 0 && data.thickness_frames.length > 0) {
                
                try {
                    // 构造第一帧的静态数据
                    const firstFrameData = {
                        ...data,
                        exposure_dose: data.exposure_dose_frames[0],
                        thickness: data.thickness_frames[0],
                        is_3d: true,
                        sine_type: data.sine_type
                    };
                    
                    console.log('准备渲染Enhanced DILL 4D动画的第一帧作为静态3D图表');
                    console.log('第一帧数据结构:', {
                        exposure_dose_type: typeof firstFrameData.exposure_dose,
                        exposure_dose_length: Array.isArray(firstFrameData.exposure_dose) ? firstFrameData.exposure_dose.length : 'not array',
                        thickness_type: typeof firstFrameData.thickness,
                        thickness_length: Array.isArray(firstFrameData.thickness) ? firstFrameData.thickness.length : 'not array',
                        has_coords: !!(firstFrameData.x_coords && firstFrameData.y_coords && firstFrameData.z_coords)
                    });
                    
                    // 渲染第一帧的3D图表
                    createExposure3DPlot(exposurePlotContainer, firstFrameData);
                    createThickness3DPlot(thicknessPlotContainer, firstFrameData);
                    
                    console.log('Enhanced DILL 4D动画第一帧静态图表渲染完成');
                    
                } catch (error) {
                    console.error('Enhanced DILL 4D动画第一帧渲染失败:', error);
                    // 回退到错误显示
                    exposurePlotContainer.innerHTML = '<div style="color:red;padding:20px;">Enhanced DILL 4D曝光数据第一帧渲染失败: ' + error.message + '</div>';
                    thicknessPlotContainer.innerHTML = '<div style="color:red;padding:20px;">Enhanced DILL 4D厚度数据第一帧渲染失败: ' + error.message + '</div>';
                }
            } else {
                console.warn('Enhanced DILL 4D动画数据不完整，无法渲染第一帧');
                exposurePlotContainer.innerHTML = '<div style="color:orange;padding:20px;">Enhanced DILL 4D动画数据不完整</div>';
                thicknessPlotContainer.innerHTML = '<div style="color:orange;padding:20px;">Enhanced DILL 4D动画数据不完整</div>';
            }
            
            // 存储4D动画数据
            enhancedDill4DAnimationData = data;
            
            // 设置总帧数
            if (enhancedDill4DAnimationData.exposure_dose_frames) {
                enhancedDill4DAnimationState.totalFrames = enhancedDill4DAnimationData.exposure_dose_frames.length;
            } else if (enhancedDill4DAnimationData.time_steps) {
                enhancedDill4DAnimationState.totalFrames = enhancedDill4DAnimationData.time_steps;
            } else {
                enhancedDill4DAnimationState.totalFrames = 20; // 默认帧数
            }
            
            console.log('Enhanced DILL 4D动画总帧数:', enhancedDill4DAnimationState.totalFrames);
            
            // 确保总帧数有效
            if (enhancedDill4DAnimationState.totalFrames <= 0) {
                console.warn('Enhanced DILL 4D动画总帧数无效，设置为默认值20');
                enhancedDill4DAnimationState.totalFrames = 20;
            }
            
            // 设置4D动画界面
            setupEnhancedDill4DAnimationUI();
            
            // 显示4D动画区域
            const enhancedDill4DAnimationSection = document.getElementById('enhanced-dill-4d-animation-section');
            if (enhancedDill4DAnimationSection) {
                enhancedDill4DAnimationSection.style.display = 'block';
                console.log('Enhanced DILL 4D动画区域已显示');
            } else {
                console.error('未找到Enhanced DILL 4D动画区域元素 #enhanced-dill-4d-animation-section');
            }
            
            // 延迟初始化4D动画第一帧（避免与静态图表冲突）
            console.log('延迟初始化Enhanced DILL 4D动画第一帧');
            setTimeout(() => {
                updateEnhancedDill4DAnimationFrame(0);
            }, 300);
            
        } else if (has3DData) {
            // 处理静态3D数据可视化
            console.log('显示增强Dill模型静态3D可视化');
            createExposure3DPlot(exposurePlotContainer, data);
            createThickness3DPlot(thicknessPlotContainer, data);
        } else if (has2DData) {
            // Enhanced Dill模型2D数据的特殊处理 - 显示多张图表
            if (currentModelType === 'enhanced_dill') {
                console.log('显示Enhanced Dill模型多图热图分布');
                console.log('Enhanced Dill 2D数据检查:', {
                    has_z_exposure_dose: !!data.z_exposure_dose,
                    has_z_thickness: !!data.z_thickness,
                    has_x_plane_exposure: !!data.x_plane_exposure,
                    has_x_plane_thickness: !!data.x_plane_thickness,
                    has_y_plane_exposure: !!data.y_plane_exposure,
                    has_y_plane_thickness: !!data.y_plane_thickness,
                    y_coords_length: data.y_coords ? data.y_coords.length : 0,
                    z_coords_length: data.z_coords ? data.z_coords.length : 0,
                    x_coords_length: data.x_coords ? data.x_coords.length : 0
                });
                
                // 显示原有的YZ平面图表（主要图表）
                createExposureHeatmap(exposurePlotContainer, data);
                createThicknessHeatmap(thicknessPlotContainer, data);
                
                // 显示X平面图表（如果有数据）
                if (data.x_plane_exposure && data.x_plane_thickness) {
                    const xPlaneExposureItem = document.getElementById('enhanced-dill-x-plane-exposure-item');
                    const xPlaneThicknessItem = document.getElementById('enhanced-dill-x-plane-thickness-item');
                    const xPlaneExposureContainer = document.getElementById('enhanced-dill-x-plane-exposure-container');
                    const xPlaneThicknessContainer = document.getElementById('enhanced-dill-x-plane-thickness-container');
                    
                    if (xPlaneExposureItem && xPlaneThicknessItem && xPlaneExposureContainer && xPlaneThicknessContainer) {
                        xPlaneExposureItem.style.display = 'block';
                        xPlaneThicknessItem.style.display = 'block';
                        
                        console.log('渲染X平面图表...');
                        createEnhancedDillXPlaneExposureHeatmap(xPlaneExposureContainer, data);
                        createEnhancedDillXPlaneThicknessHeatmap(xPlaneThicknessContainer, data);
                    }
                }
                
                // 显示Y平面图表（如果有数据）
                if (data.y_plane_exposure && data.y_plane_thickness) {
                    const yPlaneExposureItem = document.getElementById('enhanced-dill-y-plane-exposure-item');
                    const yPlaneThicknessItem = document.getElementById('enhanced-dill-y-plane-thickness-item');
                    const yPlaneExposureContainer = document.getElementById('enhanced-dill-y-plane-exposure-container');
                    const yPlaneThicknessContainer = document.getElementById('enhanced-dill-y-plane-thickness-container');
                    
                    if (yPlaneExposureItem && yPlaneThicknessItem && yPlaneExposureContainer && yPlaneThicknessContainer) {
                        yPlaneExposureItem.style.display = 'block';
                        yPlaneThicknessItem.style.display = 'block';
                        
                        console.log('渲染Y平面图表...');
                        createEnhancedDillYPlaneExposureHeatmap(yPlaneExposureContainer, data);
                        createEnhancedDillYPlaneThicknessHeatmap(yPlaneThicknessContainer, data);
                    }
                }
                
                console.log('Enhanced Dill模型多图显示完成');
            } else {
                // 统一处理所有模型的二维数据 - 使用热图
                console.log('Displaying 2D Heatmap for model:', currentModelType);
                
                // 特殊处理2D曝光图案数据
                if (data.sine_type === '2d_exposure_pattern') {
                    console.log('处理2D曝光图案数据结构:', {
                        has_dose_distribution: !!data.dose_distribution,
                        has_thickness_distribution: !!data.thickness_distribution,
                        dose_distribution_shape: data.dose_distribution ? `${data.dose_distribution.length}x${data.dose_distribution[0]?.length}` : 'undefined',
                        X_grid_shape: data.X_grid ? `${data.X_grid.length}x${data.X_grid[0]?.length}` : 'undefined',
                        Y_grid_shape: data.Y_grid ? `${data.Y_grid.length}x${data.Y_grid[0]?.length}` : 'undefined'
                    });
                    
                    // 转换2D曝光图案数据为标准2D热图格式
                    const converted2DData = convert2DExposurePatternToHeatmapData(data);
                    createExposureHeatmap(exposurePlotContainer, converted2DData);
                    createThicknessHeatmap(thicknessPlotContainer, converted2DData);
                } else {
                    createExposureHeatmap(exposurePlotContainer, data);
                    createThicknessHeatmap(thicknessPlotContainer, data);
                }
            }
        } else {
            // 默认1D线图，适用于Dill的1D情况
            createExposurePlot(exposurePlotContainer, data);
            createThicknessPlot(thicknessPlotContainer, data);
        }
    } else if (has3DData) {
        // 处理3D数据可视化
        console.log('Displaying 3D visualization for model:', currentModelType);
        
        // 如果是4D动画数据，使用第一帧进行初始显示
        if (data.exposure_dose_frames && data.thickness_frames && data.exposure_dose_frames.length > 0) {
            console.log('检测到4D动画数据，使用第一帧显示3D图表');
            console.log('4D数据结构检查:', {
                exposure_frames_count: data.exposure_dose_frames.length,
                thickness_frames_count: data.thickness_frames.length,
                first_frame_shape: data.exposure_dose_frames[0] ? 
                    `${data.exposure_dose_frames[0].length}×${data.exposure_dose_frames[0][0]?.length}×${data.exposure_dose_frames[0][0]?.[0]?.length}` : 'unknown',
                x_coords_length: data.x_coords?.length,
                y_coords_length: data.y_coords?.length,
                z_coords_length: data.z_coords?.length
            });
            
            const firstFrameData = {
                ...data,
                x_coords: data.x_coords,
                y_coords: data.y_coords,
                z_coords: data.z_coords,
                exposure_dose: data.exposure_dose_frames[0],
                thickness: data.thickness_frames[0],
                is_3d: true,
                sine_type: data.sine_type
            };
            console.log('准备渲染4D动画的第一帧作为静态3D图表');
            createExposure3DPlot(exposurePlotContainer, firstFrameData);
            createThickness3DPlot(thicknessPlotContainer, firstFrameData);
        } else {
            // 静态3D数据
            console.log('渲染静态3D数据');
            createExposure3DPlot(exposurePlotContainer, data);
            createThickness3DPlot(thicknessPlotContainer, data);
        }
    } else if (has2DData) {
        // 统一处理所有模型的二维数据 - 使用热图
        console.log('Displaying 2D Heatmap for model:', currentModelType);
        
        // 特殊处理2D曝光图案数据
        if (data.sine_type === '2d_exposure_pattern') {
            console.log('处理2D曝光图案数据结构（第二分支）');
            const converted2DData = convert2DExposurePatternToHeatmapData(data);
            createExposureHeatmap(exposurePlotContainer, converted2DData);
            createThicknessHeatmap(thicknessPlotContainer, converted2DData);
        } else {
            createExposureHeatmap(exposurePlotContainer, data);
            createThicknessHeatmap(thicknessPlotContainer, data);
        }
    } else {
        // 默认1D线图，适用于Dill的1D情况
        createExposurePlot(exposurePlotContainer, data);
        createThicknessPlot(thicknessPlotContainer, data);
    }

    // 统一处理普通DILL模型4D动画数据（不管是1D、2D还是3D）
    if (currentModelType === 'dill' && (data.enable_4d_animation || data.exposure_dose_frames || data.thickness_frames || data.time_array)) {
        console.log('检测到DILL模型4D动画数据，设置4D动画界面');
        console.log('4D动画数据详情:', {
            enable_4d_animation: data.enable_4d_animation,
            has_exposure_dose_frames: !!data.exposure_dose_frames,
            has_thickness_frames: !!data.thickness_frames,
            has_time_array: !!data.time_array,
            time_steps: data.time_steps,
            exposure_frames_length: data.exposure_dose_frames ? data.exposure_dose_frames.length : 0,
            thickness_frames_length: data.thickness_frames ? data.thickness_frames.length : 0
        });
        
        dill4DAnimationData = data;
        
        // 设置总帧数
        if (dill4DAnimationData.exposure_dose_frames) {
            dill4DAnimationState.totalFrames = dill4DAnimationData.exposure_dose_frames.length;
        } else if (dill4DAnimationData.time_steps) {
            dill4DAnimationState.totalFrames = dill4DAnimationData.time_steps;
        }
        
        console.log('设置4D动画总帧数:', dill4DAnimationState.totalFrames);
        
        // 设置4D动画界面
        setupDill4DAnimationUI();
        
        // 显示4D动画区域
        const dill4DAnimationSection = document.getElementById('dill-4d-animation-section');
        if (dill4DAnimationSection) {
            dill4DAnimationSection.style.display = 'block';
            console.log('4D动画区域已显示');
        } else {
            console.error('未找到4D动画区域元素 #dill-4d-animation-section');
        }
        
        // 初始化显示第一帧
        console.log('初始化4D动画第一帧 (frameIndex=0)');
        setTimeout(() => {
            updateDill4DAnimationFrame(0);
        }, 100);
    }

    // 4D动画显示控制 - 严格检查用户是否主动启用了4D动画
    console.log('4D动画显示控制 - 检查用户设置:', {
        currentModelType: currentModelType,
        data_enable_4d_animation: data.enable_4d_animation,
        has_exposure_dose_frames: !!data.exposure_dose_frames,
        has_thickness_frames: !!data.thickness_frames,
        has_time_array: !!data.time_array,
        time_steps: data.time_steps
    });

    // 只有在数据明确标记启用了4D动画时才显示4D动画界面
    if (data.enable_4d_animation === true) {
        if (currentModelType === 'dill' && !dill4DAnimationData) {
            console.log('用户启用了DILL模型4D动画，设置4D动画界面');
            
            dill4DAnimationData = data;
            
            // 设置总帧数
            if (data.exposure_dose_frames) {
                dill4DAnimationState.totalFrames = data.exposure_dose_frames.length;
            } else if (data.time_steps) {
                dill4DAnimationState.totalFrames = data.time_steps;
            } else {
                dill4DAnimationState.totalFrames = 20; // 默认帧数
            }
            
            console.log('设置DILL 4D动画总帧数:', dill4DAnimationState.totalFrames);
            
            // 设置4D动画界面
            setupDill4DAnimationUI();
            
            // 显示4D动画区域
            const dill4DAnimationSection = document.getElementById('dill-4d-animation-section');
            if (dill4DAnimationSection) {
                dill4DAnimationSection.style.display = 'block';
                console.log('DILL 4D动画区域已显示');
            }
            
            // 初始化显示第一帧
            setTimeout(() => {
                updateDill4DAnimationFrame(0);
            }, 100);
        }
    }

    // 检测并处理DILL模型1D动画数据
    if (currentModelType === 'dill' && data.enable_1d_animation === true) {
        console.log('检测到DILL模型1D动画数据，设置1D动画界面');
        console.log('1D动画数据详情:', {
            enable_1d_animation: data.enable_1d_animation,
            has_animation_frames: !!data.animation_frames,
            animation_frames_length: data.animation_frames ? data.animation_frames.length : 0,
            time_steps: data.time_steps,
            sine_type: data.sine_type
        });
        
        // 存储1D动画数据
        dill1DAnimationState.animationData = data.animation_frames;
        dill1DAnimationState.totalFrames = data.animation_frames ? data.animation_frames.length : (data.time_steps || 20);
        dill1DAnimationState.currentFrame = 0;
        
        console.log('设置DILL 1D动画总帧数:', dill1DAnimationState.totalFrames);
        
        // 修复：静态图表数据提取逻辑
        console.log('提取DILL 1D静态图表数据');
        
        try {
            let staticData = null;
            
            // 首先尝试从后端返回的直接静态数据字段获取
            if (data.x_coords && data.exposure_dose && data.thickness) {
                console.log('✅ 使用后端返回的直接静态数据字段');
                staticData = {
                    x: data.x_coords,
                    exposure_dose: data.exposure_dose,
                    thickness: data.thickness,
                    x_coords: data.x_coords,
                    is_1d: true,
                    sine_type: data.sine_type || '1d'
                };
            }
            // 如果直接静态数据不存在，尝试从动画帧的第一帧获取基础数据
            else if (data.animation_frames && data.animation_frames.length > 0) {
                console.log('⚠️ 直接静态数据不存在，从动画帧第一帧提取静态数据');
                const firstFrame = data.animation_frames[0];
                
                // 查找与用户当前t_exp最接近的帧
                let targetFrame = firstFrame;
                const userTExp = parseFloat(document.getElementById('t_exp')?.value) || 5.0;
                
                // 寻找时间最接近用户设置的帧
                let minTimeDiff = Math.abs((firstFrame.time || firstFrame.t || 0) - userTExp);
                for (const frame of data.animation_frames) {
                    const frameTime = frame.time || frame.t || 0;
                    const timeDiff = Math.abs(frameTime - userTExp);
                    if (timeDiff < minTimeDiff) {
                        minTimeDiff = timeDiff;
                        targetFrame = frame;
                    }
                }
                
                console.log(`使用时间 ${targetFrame.time || targetFrame.t}s 的帧数据作为静态显示（最接近用户设置的 ${userTExp}s）`);
                
                staticData = {
                    x: targetFrame.x_coords || targetFrame.x,
                    exposure_dose: targetFrame.exposure_dose,
                    thickness: targetFrame.thickness,
                    x_coords: targetFrame.x_coords || targetFrame.x,
                    is_1d: true,
                    sine_type: data.sine_type || '1d'
                };
            }
            // 如果都没有数据，创建一个错误提示
            else {
                console.error('❌ 无法找到有效的1D数据用于静态显示');
                throw new Error('无法找到有效的1D曝光剂量数据');
            }
            
            // 验证静态数据的完整性
            if (!staticData.x || !staticData.exposure_dose || !staticData.thickness) {
                console.error('❌ 静态数据不完整:', {
                    has_x: !!staticData.x,
                    has_exposure_dose: !!staticData.exposure_dose,
                    has_thickness: !!staticData.thickness
                });
                throw new Error('静态数据不完整，缺少必要的x、exposure_dose或thickness字段');
            }
            
            console.log('✅ DILL 1D静态图表数据验证通过:', {
                x_length: staticData.x ? staticData.x.length : 0,
                exposure_range: staticData.exposure_dose && staticData.exposure_dose.length > 0 ? 
                    [Math.min(...staticData.exposure_dose), Math.max(...staticData.exposure_dose)] : 'N/A',
                thickness_range: staticData.thickness && staticData.thickness.length > 0 ? 
                    [Math.min(...staticData.thickness), Math.max(...staticData.thickness)] : 'N/A',
                data_source: staticData.x === data.x_coords ? '后端直接静态数据' : '动画帧提取数据'
            });
            
            // 确保图表容器显示
            if (exposurePlotContainer) {
                exposurePlotContainer.style.display = 'block';
            }
            if (thicknessPlotContainer) {
                thicknessPlotContainer.style.display = 'block';
            }
            
            // 渲染静态图表
            createExposurePlot(exposurePlotContainer, staticData);
            createThicknessPlot(thicknessPlotContainer, staticData);
            console.log('✅ DILL 1D静态图表渲染完成');
            
        } catch (error) {
            console.error('❌ DILL 1D静态图表渲染失败:', error);
            if (exposurePlotContainer) {
                exposurePlotContainer.style.display = 'block';
                exposurePlotContainer.innerHTML = `<div style="color:red;padding:20px;text-align:center;">
                    <i class="fas fa-exclamation-triangle" style="font-size:24px;margin-bottom:10px;"></i><br>
                    DILL 1D静态曝光图渲染失败<br>
                    <small style="color:#666;">${error.message}</small>
                </div>`;
            }
            if (thicknessPlotContainer) {
                thicknessPlotContainer.style.display = 'block';
                thicknessPlotContainer.innerHTML = `<div style="color:red;padding:20px;text-align:center;">
                    <i class="fas fa-exclamation-triangle" style="font-size:24px;margin-bottom:10px;"></i><br>
                    DILL 1D静态厚度图渲染失败<br>
                    <small style="color:#666;">${error.message}</small>
                </div>`;
            }
        }
        
        // 显示1D动画区域
        const dill1DAnimationSection = document.getElementById('dill-1d-animation-section');
        if (dill1DAnimationSection) {
            dill1DAnimationSection.style.display = 'block';
            console.log('DILL 1D动画区域已显示');
        } else {
            console.error('未找到1D动画区域元素 #dill-1d-animation-section');
        }
        
        // 设置事件监听器
        setupDill1DAnimationEventListeners();
        
        // 初始化显示第一帧（动画区域）
        if (dill1DAnimationState.animationData && dill1DAnimationState.animationData.length > 0) {
            setTimeout(() => {
                updateDill1DAnimationFrame(0);
                // 初始状态设置为就绪
                const frameData = dill1DAnimationState.animationData[0];
                if (frameData) {
                    const timeValue = frameData.time_value || frameData.time || frameData.t || 0;
                    updateDill1DAnimationStatus(`就绪: 第1/${dill1DAnimationState.totalFrames}帧 (t=${timeValue.toFixed(2)}s)`);
                } else {
                    updateDill1DAnimationStatus('就绪');
                }
            }, 100);
        }
    }
    
    // 注意：不要在else中隐藏1D动画区域，因为用户可能同时启用1D动画和V评估
    // 只有在没有启用1D动画时才隐藏1D动画区域
    if (currentModelType === 'dill' && data.enable_1d_animation !== true) {
        const dill1DAnimationSection = document.getElementById('dill-1d-animation-section');
        if (dill1DAnimationSection) {
            dill1DAnimationSection.style.display = 'none';
        }
    }

        // 检测并处理DILL模型1D V评估数据
    if (currentModelType === 'dill' && data.enable_1d_v_evaluation === true) {
        console.log('检测到DILL模型1D V评估数据，设置V评估界面');
        console.log('1D V评估数据详情:', {
            enable_1d_v_evaluation: data.enable_1d_v_evaluation,
            has_v_evaluation_frames: !!data.v_evaluation_frames,
            v_evaluation_frames_length: data.v_evaluation_frames ? data.v_evaluation_frames.length : 0,
            time_steps: data.time_steps,
            sine_type: data.sine_type,
            has_direct_static_data: !!(data.x_coords && data.exposure_dose && data.thickness)
        });
        
        // 存储1D V评估数据
        dill1DVEvaluationState.animationData = data.v_evaluation_frames;
        dill1DVEvaluationState.totalFrames = data.v_evaluation_frames ? data.v_evaluation_frames.length : (data.time_steps || 20);
        dill1DVEvaluationState.currentFrame = 0;
        
        console.log('设置DILL 1D V评估总帧数:', dill1DVEvaluationState.totalFrames);
        
        // 🔥 修复：改进静态图表数据提取逻辑，使其与1D时间动画一样健壮
        console.log('提取DILL 1D V评估模式下的静态图表数据');
        
        try {
            let staticData = null;
            
            // 首先尝试从后端返回的直接静态数据字段获取
            if (data.x_coords && data.exposure_dose && data.thickness) {
                console.log('✅ 使用后端返回的直接静态数据字段（V评估模式）');
                staticData = {
                    x: data.x_coords,
                    exposure_dose: data.exposure_dose,
                    thickness: data.thickness,
                    x_coords: data.x_coords,
                    is_1d: true,
                    sine_type: data.sine_type || '1d'
                };
            }
            // 如果直接静态数据不存在，尝试从V评估帧的第一帧获取基础数据
            else if (data.v_evaluation_frames && data.v_evaluation_frames.length > 0) {
                console.log('⚠️ 直接静态数据不存在，从V评估帧第一帧提取静态数据');
                const firstFrame = data.v_evaluation_frames[0];
                
                // 查找与用户当前V值最接近的帧（通常使用第一帧作为基础）
                let targetFrame = firstFrame;
                const userV = parseFloat(document.getElementById('V')?.value) || 0.8;
                
                // 寻找V值最接近用户设置的帧
                let minVDiff = Math.abs((firstFrame.v_value || 0) - userV);
                for (const frame of data.v_evaluation_frames) {
                    const frameV = frame.v_value || 0;
                    const vDiff = Math.abs(frameV - userV);
                    if (vDiff < minVDiff) {
                        minVDiff = vDiff;
                        targetFrame = frame;
                    }
                }
                
                console.log(`使用V值 ${targetFrame.v_value || 'N/A'} 的帧数据作为静态显示（最接近用户设置的 ${userV}）`);
                
                // 🔥 修复：确保从帧数据中正确提取所有必要字段，增加调试信息
                console.log('📊 目标帧数据结构:', {
                    frame_keys: Object.keys(targetFrame),
                    has_x_coords: !!targetFrame.x_coords,
                    has_x: !!targetFrame.x,
                    has_exposure_dose: !!targetFrame.exposure_dose,
                    has_thickness: !!targetFrame.thickness,
                    exposure_dose_type: typeof targetFrame.exposure_dose,
                    thickness_type: typeof targetFrame.thickness
                });
                
                staticData = {
                    x: targetFrame.x_coords || targetFrame.x || [],
                    exposure_dose: targetFrame.exposure_dose || [],
                    thickness: targetFrame.thickness || [],
                    x_coords: targetFrame.x_coords || targetFrame.x || [],
                    is_1d: true,
                    sine_type: data.sine_type || '1d'
                };
                
                console.log('📊 提取后的静态数据结构:', {
                    x_length: staticData.x ? staticData.x.length : 0,
                    exposure_dose_length: staticData.exposure_dose ? staticData.exposure_dose.length : 0,
                    thickness_length: staticData.thickness ? staticData.thickness.length : 0,
                    exposure_dose_sample: staticData.exposure_dose && staticData.exposure_dose.length > 0 ? staticData.exposure_dose.slice(0, 3) : 'N/A',
                    thickness_sample: staticData.thickness && staticData.thickness.length > 0 ? staticData.thickness.slice(0, 3) : 'N/A'
                });
            }
            // 🔥 新增：如果前两种方法都失败，尝试生成默认的静态数据
            else {
                console.warn('⚠️ 无法从后端数据获取静态数据，尝试生成默认静态数据');
                
                // 生成默认的x坐标
                const defaultX = [];
                for (let i = 0; i <= 100; i++) {
                    defaultX.push(i * 0.1); // 0 到 10，步长0.1
                }
                
                // 使用用户当前参数生成默认的曝光剂量和厚度数据
                const userV = parseFloat(document.getElementById('V')?.value) || 0.8;
                const userK = parseFloat(document.getElementById('K')?.value) || 1.0;
                const userTExp = parseFloat(document.getElementById('t_exp')?.value) || 1.0;
                const userC = parseFloat(document.getElementById('C')?.value) || 0.01;
                
                const defaultExposure = defaultX.map(x => 1.0 * (1 + userV * Math.cos(userK * x)) * userTExp);
                const defaultThickness = defaultExposure.map(exp => Math.exp(-userC * exp));
                
                staticData = {
                    x: defaultX,
                    exposure_dose: defaultExposure,
                    thickness: defaultThickness,
                    x_coords: defaultX,
                    is_1d: true,
                    sine_type: data.sine_type || '1d'
                };
                
                console.log('✅ 生成默认静态数据完成:', {
                    V: userV,
                    K: userK,
                    t_exp: userTExp,
                    C: userC,
                    data_points: defaultX.length
                });
            }
            
            // 🔥 修复：更严格的数据验证，包含详细的调试信息
            if (!staticData || !staticData.x || !staticData.exposure_dose || !staticData.thickness) {
                console.error('❌ V评估静态数据不完整:', {
                    has_staticData: !!staticData,
                    has_x: !!(staticData && staticData.x),
                    has_exposure_dose: !!(staticData && staticData.exposure_dose),
                    has_thickness: !!(staticData && staticData.thickness),
                    x_type: staticData && typeof staticData.x,
                    exposure_dose_type: staticData && typeof staticData.exposure_dose,
                    thickness_type: staticData && typeof staticData.thickness
                });
                throw new Error('V评估静态数据不完整，缺少必要的x、exposure_dose或thickness字段');
            }
            
            // 🔥 修复：更详细的数组验证逻辑
            const isValidExposureArray = Array.isArray(staticData.exposure_dose) && staticData.exposure_dose.length > 0;
            const isValidThicknessArray = Array.isArray(staticData.thickness) && staticData.thickness.length > 0;
            const isValidXArray = Array.isArray(staticData.x) && staticData.x.length > 0;
            
            if (!isValidExposureArray || !isValidThicknessArray || !isValidXArray) {
                console.error('❌ V评估静态数据数组验证失败:', {
                    x_is_array: Array.isArray(staticData.x),
                    x_length: staticData.x ? staticData.x.length : 0,
                    exposure_dose_is_array: Array.isArray(staticData.exposure_dose),
                    exposure_dose_length: staticData.exposure_dose ? staticData.exposure_dose.length : 0,
                    thickness_is_array: Array.isArray(staticData.thickness),
                    thickness_length: staticData.thickness ? staticData.thickness.length : 0,
                    x_sample: staticData.x && staticData.x.length > 0 ? staticData.x.slice(0, 3) : 'N/A',
                    exposure_sample: staticData.exposure_dose && staticData.exposure_dose.length > 0 ? staticData.exposure_dose.slice(0, 3) : 'N/A',
                    thickness_sample: staticData.thickness && staticData.thickness.length > 0 ? staticData.thickness.slice(0, 3) : 'N/A'
                });
                throw new Error('V评估静态数据数组为空或无效');
            }
            
            console.log('✅ DILL 1D V评估静态图表数据验证通过:', {
                x_length: staticData.x ? staticData.x.length : 0,
                exposure_range: staticData.exposure_dose && staticData.exposure_dose.length > 0 ? 
                    [Math.min(...staticData.exposure_dose), Math.max(...staticData.exposure_dose)] : 'N/A',
                thickness_range: staticData.thickness && staticData.thickness.length > 0 ? 
                    [Math.min(...staticData.thickness), Math.max(...staticData.thickness)] : 'N/A',
                data_source: staticData.x === data.x_coords ? '后端直接静态数据' : 'V评估帧提取数据'
            });
            
            // 🔥 关键修复：强制显示图表容器，避免被clearAllCharts隐藏
            if (exposurePlotContainer) {
                exposurePlotContainer.style.display = 'block';
                console.log('✅ 强制显示曝光图表容器');
            }
            if (thicknessPlotContainer) {
                thicknessPlotContainer.style.display = 'block';
                console.log('✅ 强制显示厚度图表容器');
            }
            
            // 渲染静态图表
            createExposurePlot(exposurePlotContainer, staticData);
            createThicknessPlot(thicknessPlotContainer, staticData);
            console.log('✅ DILL 1D V评估静态图表渲染完成');
            
            // 🔥 二次确认：渲染后再次确保容器可见
            setTimeout(() => {
                if (exposurePlotContainer) {
                    exposurePlotContainer.style.display = 'block';
                }
                if (thicknessPlotContainer) {
                    thicknessPlotContainer.style.display = 'block';
                }
                console.log('✅ V评估模式：二次确认图表容器可见性');
            }, 100);
            
        } catch (error) {
            console.error('❌ DILL 1D V评估静态图表渲染失败:', error);
            // 🔥 错误处理分支也要强制显示容器
            if (exposurePlotContainer) {
                exposurePlotContainer.style.display = 'block';
                exposurePlotContainer.innerHTML = `<div style="color:red;padding:20px;text-align:center;">
                    <i class="fas fa-exclamation-triangle" style="font-size:24px;margin-bottom:10px;"></i><br>
                    DILL 1D V评估静态曝光图渲染失败<br>
                    <small style="color:#666;">${error.message}</small>
                </div>`;
                console.log('✅ 错误处理：强制显示曝光图表容器');
            }
            if (thicknessPlotContainer) {
                thicknessPlotContainer.style.display = 'block';
                thicknessPlotContainer.innerHTML = `<div style="color:red;padding:20px;text-align:center;">
                    <i class="fas fa-exclamation-triangle" style="font-size:24px;margin-bottom:10px;"></i><br>
                    DILL 1D V评估静态厚度图渲染失败<br>
                    <small style="color:#666;">${error.message}</small>
                </div>`;
                console.log('✅ 错误处理：强制显示厚度图表容器');
            }
        }
        
        // 显示1D V评估区域
        const dill1DVEvaluationSection = document.getElementById('dill-1d-v-evaluation-section');
        if (dill1DVEvaluationSection) {
            dill1DVEvaluationSection.style.display = 'block';
            console.log('DILL 1D V评估区域已显示');
        } else {
            console.error('未找到1D V评估区域元素 #dill-1d-v-evaluation-section');
        }
        
        // 设置事件监听器
        setupDill1DVEvaluationEventListeners();
        
        // 初始化显示第一帧（V评估区域）
        if (dill1DVEvaluationState.animationData && dill1DVEvaluationState.animationData.length > 0) {
            setTimeout(() => {
                updateDill1DVEvaluationFrame(0);
            }, 100);
        }
    }
    
    // 注意：不要在else中隐藏V评估区域，因为用户可能同时启用1D动画和V评估
    // 只有在没有启用V评估时才隐藏V评估区域
    if (currentModelType === 'dill' && data.enable_1d_v_evaluation !== true) {
        const dill1DVEvaluationSection = document.getElementById('dill-1d-v-evaluation-section');
        if (dill1DVEvaluationSection) {
            dill1DVEvaluationSection.style.display = 'none';
        }
    }

    // 继续处理其他4D动画逻辑
    if (data.enable_4d_animation === true) {

        // Enhanced Dill模型的4D动画检测
        if (currentModelType === 'enhanced_dill' && !enhancedDill4DAnimationData) {
            console.log('用户启用了Enhanced DILL模型4D动画，设置4D动画界面');
            
            enhancedDill4DAnimationData = data;
            
            // 设置总帧数
            if (data.exposure_dose_frames) {
                enhancedDill4DAnimationState.totalFrames = data.exposure_dose_frames.length;
            } else if (data.time_steps) {
                enhancedDill4DAnimationState.totalFrames = data.time_steps;
            } else {
                enhancedDill4DAnimationState.totalFrames = 20; // 默认帧数
            }
            
            console.log('设置Enhanced DILL 4D动画总帧数:', enhancedDill4DAnimationState.totalFrames);
            
            // 设置4D动画界面
            setupEnhancedDill4DAnimationUI();
            
            // 显示4D动画区域
            const enhancedDill4DAnimationSection = document.getElementById('enhanced-dill-4d-animation-section');
            if (enhancedDill4DAnimationSection) {
                enhancedDill4DAnimationSection.style.display = 'block';
                console.log('Enhanced DILL 4D动画区域已显示');
            }
            
            // 初始化显示第一帧
            setTimeout(() => {
                updateEnhancedDill4DAnimationFrame(0);
            }, 100);
        }
    } else {
        // 用户没有启用4D动画，确保4D动画区域被隐藏
        console.log('用户未启用4D动画，隐藏所有4D动画界面');
        
        const dill4DAnimationSection = document.getElementById('dill-4d-animation-section');
        const enhancedDill4DAnimationSection = document.getElementById('enhanced-dill-4d-animation-section');
        
        if (dill4DAnimationSection) {
            dill4DAnimationSection.style.display = 'none';
        }
        if (enhancedDill4DAnimationSection) {
            enhancedDill4DAnimationSection.style.display = 'none';
        }
        
        // 停止任何正在播放的动画
        if (dill4DAnimationState.intervalId) {
            clearInterval(dill4DAnimationState.intervalId);
            dill4DAnimationState.intervalId = null;
            dill4DAnimationState.isPlaying = false;
        }
        if (enhancedDill4DAnimationState.intervalId) {
            clearInterval(enhancedDill4DAnimationState.intervalId);
            enhancedDill4DAnimationState.intervalId = null;
            enhancedDill4DAnimationState.isPlaying = false;
        }
    }

    animateResults();
    setTimeout(() => {
        // 对于2D/3D热图不显示阈值控制
        if (!has2DData && !has3DData && currentModelType !== 'car') { // 修改为CAR模型也不显示阈值控制
            // 安全检查阈值控制元素是否存在
            const exposureThresholdControl = document.querySelector('#exposure-thresholds-container .threshold-control');
            const thicknessThresholdControl = document.querySelector('#thickness-thresholds-container .threshold-control');
            
            if (exposureThresholdControl) {
                initSingleThresholdControl(exposureThresholdControl, 0, 'exposure', data);
            }
            if (thicknessThresholdControl) {
                initSingleThresholdControl(thicknessThresholdControl, 0, 'thickness', data);
            }
        } else {
            // 隐藏2D/3D热图的阈值控制区域
            const exposureThresholds = document.querySelector('#exposure-thresholds-container');
            const thicknessThresholds = document.querySelector('#thickness-thresholds-container');
            if (exposureThresholds) exposureThresholds.style.display = 'none';
            if (thicknessThresholds) thicknessThresholds.style.display = 'none';
        }
    }, 100);
    
    // 🎯 初始化图表容器的可拖拽缩放功能
    setTimeout(() => {
        initPlotlyResizableFeature(exposurePlotContainer, thicknessPlotContainer);
    }, 200);
}

// 修改createExposure3DPlot函数，添加更多调试信息
function createExposure3DPlot(container, data) {
    // 添加详细调试信息
    console.log('DEBUG - 3D Exposure Data:', {
        has_x_coords: !!data.x_coords,
        has_y_coords: !!data.y_coords,
        has_z_coords: !!data.z_coords,
        has_exposure_dose: !!data.exposure_dose,
        has_z_exposure_dose: !!data.z_exposure_dose,
        has_intensity_3d: !!data.intensity_3d,
        has_I: !!data.I,
        has_acid_concentration_3d: !!data.acid_concentration_3d, // CAR模型特有
        x_coords_type: data.x_coords && typeof data.x_coords,
        x_coords_length: data.x_coords && data.x_coords.length,
        y_coords_length: data.y_coords && data.y_coords.length,
        z_coords_length: data.z_coords && data.z_coords.length,
        exposure_dose_type: data.exposure_dose && typeof data.exposure_dose,
        exposure_dose_length: data.exposure_dose && data.exposure_dose.length,
        exposure_dose_sample: data.exposure_dose && data.exposure_dose.slice(0, 2),
        full_data_keys: Object.keys(data)
    });

    // 统一字段名处理，确保兼容性
    let xCoords = data.x_coords || data.x;
    let yCoords = data.y_coords || data.y;
    let zCoords = data.z_coords || data.z;
    
    // 优先使用模型特定的3D数据字段，增强对不同模型的兼容性
    let zData;
    const modelSelect = document.getElementById('model-select');
    const currentModelType = modelSelect ? modelSelect.value : 'dill';
    
    if (currentModelType === 'car') {
        // CAR模型优先使用acid_concentration_3d字段
        zData = data.acid_concentration_3d || data.z_exposure_dose || data.exposure_dose || data.intensity_3d || data.I;
    } else if (currentModelType === 'enhanced_dill') {
        // 增强Dill模型优先使用exposure_dose字段（支持3D动画数据格式）
        zData = data.exposure_dose || data.z_exposure_dose || data.intensity_3d || data.I;
    } else {
        // 其他模型使用标准字段
        zData = data.z_exposure_dose || data.exposure_dose || data.intensity_3d || data.I;
    }

    // 更健壮的数据检查 - 添加对3D模式的特殊支持
    console.log('DEBUG - 数据存在检查:', {
        xCoords_exists: !!xCoords,
        yCoords_exists: !!yCoords,
        zData_exists: !!zData,
        xCoords_length: xCoords ? xCoords.length : 0,
        yCoords_length: yCoords ? yCoords.length : 0,
        zData_length: zData ? zData.length : 0,
        is_3d: data.is_3d,
        sine_type: data.sine_type
    });

    if (!xCoords || !yCoords || !zData ||
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        console.warn('3D曝光数据不完整或缺失');
        container.innerHTML = `<div style="color:red;padding:20px;">${LANGS[currentLang].error_no_exposure_data || '无有效3D曝光剂量数据，无法绘图。'}</div>`;
        return;
    }

    // 检查是否需要转换数据格式
    let plotDataZ = zData;
    
    // 检查z数据结构
    console.log('DEBUG - 3D Exposure plotDataZ:', {
        type: typeof plotDataZ,
        isArray: Array.isArray(plotDataZ),
        length: plotDataZ.length,
        first_item_type: plotDataZ.length > 0 ? typeof plotDataZ[0] : 'unknown', 
        first_item_isArray: plotDataZ.length > 0 ? Array.isArray(plotDataZ[0]) : false,
        first_item_length: plotDataZ.length > 0 && Array.isArray(plotDataZ[0]) ? plotDataZ[0].length : 0,
        intensity_shape: data.intensity_shape // 从后端获取的形状信息
    });

    // 改进的数据格式检测和转换逻辑
    // 首先检查是否是3D数组结构 [x][y][z] 
    const is3DArray = Array.isArray(plotDataZ) && 
                      Array.isArray(plotDataZ[0]) && 
                      Array.isArray(plotDataZ[0][0]);
    
    if (is3DArray) {
        console.log('检测到3D数组结构，需要转换为Plotly surface格式');
        console.log('3D数组维度:', `[Z=${plotDataZ.length}][Y=${plotDataZ[0].length}][X=${plotDataZ[0][0].length}]`);
        
        // 对于Enhanced Dill模型的3D数据格式[z][y][x]，Plotly surface需要的是二维数组z[y][x]
        // 我们需要从3D数组中提取一个Z切片作为表面显示
        try {
            // 取z方向的中间切片作为表面显示
            const midZIndex = Math.floor(plotDataZ.length / 2);
            console.log(`从${plotDataZ.length}个Z层中选择第${midZIndex}层作为表面显示`);
            
            // plotDataZ[midZIndex] 是一个 [y][x] 的二维数组，正好是Plotly需要的格式
            plotDataZ = plotDataZ[midZIndex];
            console.log('成功提取Z中间切片，新维度:', `[Y=${plotDataZ.length}][X=${plotDataZ[0].length}]`);
            
            // 验证提取的数据
            console.log('切片数据样本:', {
                corner_values: {
                    top_left: plotDataZ[0][0],
                    top_right: plotDataZ[0][plotDataZ[0].length-1],
                    bottom_left: plotDataZ[plotDataZ.length-1][0],
                    bottom_right: plotDataZ[plotDataZ.length-1][plotDataZ[0].length-1]
                }
            });
        } catch (error) {
            console.error('3D数据切片提取失败:', error);
            container.innerHTML = `<div style="color:red;padding:20px;">3D数据格式处理失败: ${error.message}</div>`;
            return;
        }
    } else if (!Array.isArray(plotDataZ[0])) {
        console.log('Z数据是扁平数组，需要重塑成二维数组');
        
        // 首先检查是否可以正确重塑
        if (xCoords.length * yCoords.length === plotDataZ.length) {
            try {
                // 尝试检测数据排列顺序 (按行主序还是列主序)
                const isRowMajor = detectDataOrder(plotDataZ, xCoords, yCoords);
                console.log(`检测到数据排列顺序: ${isRowMajor ? '行主序' : '列主序'}`);
                
                // 根据检测到的顺序重塑数据
                const newZ = reshapeArray(plotDataZ, xCoords.length, yCoords.length, isRowMajor);
                plotDataZ = newZ;
            } catch (error) {
                console.error('无法重塑数据:', error);
                container.innerHTML = `<div style="color:red;padding:20px;">数据转换错误: ${error.message}</div>`;
                return;
            }
        } else if (data.z_matrix) {
            // 尝试使用现成的z_matrix（CAR模型可能提供）
            plotDataZ = data.z_matrix;
            console.log('使用提供的z_matrix数据');
        } else if (currentModelType === 'car' && data.grid_data && typeof data.grid_data === 'object') {
            // 尝试从CAR模型特有的grid_data中提取
            try {
                if (data.grid_data.exposure || data.grid_data.acid_concentration) {
                    const gridData = data.grid_data.exposure || data.grid_data.acid_concentration;
                    console.log('使用CAR模型grid_data', gridData);
                    plotDataZ = gridData;
                }
            } catch (error) {
                console.error('处理CAR模型grid_data失败:', error);
            }
        } else {
            console.error('Z数据长度与x和y坐标数量不匹配');
            container.innerHTML = `<div style="color:red;padding:20px;">数据维度不匹配: Z长度=${plotDataZ.length}, X长度=${xCoords.length}, Y长度=${yCoords.length}</div>`;
            return;
        }
    }

    // 创建3D表面图
    const trace = {
        type: 'surface',
        x: xCoords,
        y: yCoords,
        z: plotDataZ,
        colorscale: 'Viridis',
        colorbar: { title: LANGS[currentLang].exposure_dose_trace_name || '曝光剂量' },
        hovertemplate: `X坐标: %{x:.2f} μm<br>Y坐标: %{y:.2f} μm<br>Z坐标: %{z:.2f}<br>${LANGS[currentLang].hover_exposure_value || '曝光剂量值'}: %{z:.2f}<extra></extra>`
    };

    const layout = {
        title: '曝光计量分布 (3D)',
        scene: {
            xaxis: { title: 'X (μm)' },
            yaxis: { title: 'Y (μm)' },
            zaxis: { title: LANGS[currentLang].exposure_dose_unit || '曝光剂量' }
        },
        margin: { l: 20, r: 20, t: 40, b: 20 }
    };

    try {
        Plotly.newPlot(container, [trace], layout, { responsive: true });
        console.log('3D Exposure plot created successfully');
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points && eventData.points.length > 0) {
                const point = eventData.points[0];
                // 对于3D表面图，点击位置包含x、y、z值
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'exposure', container, eventData);
            }
        });
    } catch (error) {
        console.error('Error creating 3D Exposure plot:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建3D图表失败: ${error.message}</div>`;
    }
}

/**
 * 检测数据的排列顺序是行主序还是列主序
 * @param {Array} data 一维数组形式的数据
 * @param {Array} xCoords X坐标数组
 * @param {Array} yCoords Y坐标数组
 * @returns {boolean} true表示行主序 (C-order), false表示列主序 (F-order)
 */
function detectDataOrder(data, xCoords, yCoords) {
    // 如果数据长度太小，默认为行主序
    if (data.length < 10 || xCoords.length < 3 || yCoords.length < 3) {
        return true;
    }
    
    // 尝试检测数据的模式:
    // 1. 在行主序中，相邻行之间的差异应该较大
    // 2. 在列主序中，相邻列之间的差异应该较大
    
    // 采样检测行主序
    let rowMajorEvidence = 0;
    let colMajorEvidence = 0;
    
    // 检查行主序的证据
    for (let y = 0; y < Math.min(yCoords.length - 1, 5); y++) {
        const rowDiffs = [];
        for (let x = 0; x < Math.min(xCoords.length, 10); x++) {
            // 行主序: 当前行与下一行的差异
            const idx1 = y * xCoords.length + x;
            const idx2 = (y + 1) * xCoords.length + x;
            if (idx1 < data.length && idx2 < data.length) {
                rowDiffs.push(Math.abs(data[idx1] - data[idx2]));
            }
        }
        if (rowDiffs.length > 0) {
            rowMajorEvidence += Math.max(...rowDiffs);
        }
    }
    
    // 检查列主序的证据
    for (let x = 0; x < Math.min(xCoords.length - 1, 5); x++) {
        const colDiffs = [];
        for (let y = 0; y < Math.min(yCoords.length, 10); y++) {
            // 列主序: 当前列与下一列的差异
            const idx1 = x * yCoords.length + y;
            const idx2 = (x + 1) * yCoords.length + y;
            if (idx1 < data.length && idx2 < data.length) {
                colDiffs.push(Math.abs(data[idx1] - data[idx2]));
            }
        }
        if (colDiffs.length > 0) {
            colMajorEvidence += Math.max(...colDiffs);
        }
    }
    
    console.log(`数据排列顺序检测: 行主序证据=${rowMajorEvidence}, 列主序证据=${colMajorEvidence}`);
    
    // 返回更可能的排列顺序
    return rowMajorEvidence >= colMajorEvidence;
}

/**
 * 将一维数组重塑为二维数组
 * @param {Array} array 原始一维数组
 * @param {number} width 宽度 (列数)
 * @param {number} height 高度 (行数)
 * @param {boolean} isRowMajor 数据是否为行主序
 * @returns {Array} 重塑后的二维数组
 */
function reshapeArray(array, width, height, isRowMajor = true) {
    const result = [];
    if (isRowMajor) {
        // 行主序 (C-order): 按行填充
        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                row.push(array[i * width + j]);
            }
            result.push(row);
        }
    } else {
        // 列主序 (F-order): 按列填充
        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                row.push(array[j * height + i]);
            }
            result.push(row);
        }
    }
    return result;
}

// 同样修改createThickness3DPlot函数
function createThickness3DPlot(container, data) {
    // 添加详细调试信息
    console.log('DEBUG - 3D Thickness Data:', {
        has_x_coords: !!data.x_coords,
        has_y_coords: !!data.y_coords,
        has_z_coords: !!data.z_coords,
        has_thickness: !!data.thickness,
        has_z_thickness: !!data.z_thickness,
        has_M: !!data.M,
        has_thickness_3d: !!data.thickness_3d,
        has_deprotection_3d: !!data.deprotection_3d, // CAR模型特有
        x_coords_type: data.x_coords && typeof data.x_coords,
        x_coords_length: data.x_coords && data.x_coords.length,
        y_coords_length: data.y_coords && data.y_coords.length,
        z_coords_length: data.z_coords && data.z_coords.length,
        thickness_type: data.thickness && typeof data.thickness,
        thickness_length: data.thickness && data.thickness.length,
        thickness_sample: data.thickness && data.thickness.slice(0, 2),
        full_data_keys: Object.keys(data)
    });

    // 统一字段名处理，确保兼容性
    let xCoords = data.x_coords || data.x;
    let yCoords = data.y_coords || data.y;
    let zCoords = data.z_coords || data.z;
    
    // 优先使用模型特定的3D数据字段
    let zData;
    const modelSelect = document.getElementById('model-select');
    const currentModelType = modelSelect ? modelSelect.value : 'dill';
    
    if (currentModelType === 'car') {
        // CAR模型优先使用deprotection_3d字段
        zData = data.deprotection_3d || data.z_thickness || data.thickness || data.thickness_3d || data.M;
    } else if (currentModelType === 'enhanced_dill') {
        // 增强Dill模型优先使用thickness字段（支持3D动画数据格式）
        zData = data.thickness || data.z_thickness || data.thickness_3d || data.M;
    } else {
        // 其他模型使用标准字段
        zData = data.z_thickness || data.thickness || data.thickness_3d || data.M;
    }

    // 更健壮的数据检查 - 添加对3D模式的特殊支持
    console.log('DEBUG - 厚度数据存在检查:', {
        xCoords_exists: !!xCoords,
        yCoords_exists: !!yCoords,
        zData_exists: !!zData,
        xCoords_length: xCoords ? xCoords.length : 0,
        yCoords_length: yCoords ? yCoords.length : 0,
        zData_length: zData ? zData.length : 0,
        is_3d: data.is_3d,
        sine_type: data.sine_type
    });

    if (!xCoords || !yCoords || !zData ||
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        console.warn('3D厚度数据不完整或缺失');
        container.innerHTML = `<div style="color:red;padding:20px;">${LANGS[currentLang].error_no_thickness_data || '无有效3D厚度数据，无法绘图。'}</div>`;
        return;
    }

    // 检查是否需要转换数据格式
    let plotDataZ = zData;
    
    // 检查z数据结构
    console.log('DEBUG - 3D Thickness plotDataZ:', {
        type: typeof plotDataZ,
        isArray: Array.isArray(plotDataZ),
        length: plotDataZ.length,
        first_item_type: plotDataZ.length > 0 ? typeof plotDataZ[0] : 'unknown',
        first_item_isArray: plotDataZ.length > 0 ? Array.isArray(plotDataZ[0]) : false,
        first_item_length: plotDataZ.length > 0 && Array.isArray(plotDataZ[0]) ? plotDataZ[0].length : 0,
        intensity_shape: data.intensity_shape // 从后端获取的形状信息
    });

    // 改进的数据格式检测和转换逻辑
    // 首先检查是否是3D数组结构 [x][y][z] 
    const is3DArray = Array.isArray(plotDataZ) && 
                      Array.isArray(plotDataZ[0]) && 
                      Array.isArray(plotDataZ[0][0]);
    
    if (is3DArray) {
        console.log('检测到3D厚度数组结构，需要转换为Plotly surface格式');
        console.log('3D厚度数组维度:', `[Z=${plotDataZ.length}][Y=${plotDataZ[0].length}][X=${plotDataZ[0][0].length}]`);
        
        // 对于Enhanced Dill模型的3D数据格式[z][y][x]，Plotly surface需要的是二维数组z[y][x]
        // 我们需要从3D数组中提取一个Z切片作为表面显示
        try {
            // 取z方向的中间切片作为表面显示
            const midZIndex = Math.floor(plotDataZ.length / 2);
            console.log(`从${plotDataZ.length}个Z层中选择第${midZIndex}层作为厚度表面显示`);
            
            // plotDataZ[midZIndex] 是一个 [y][x] 的二维数组，正好是Plotly需要的格式
            plotDataZ = plotDataZ[midZIndex];
            console.log('成功提取厚度Z中间切片，新维度:', `[Y=${plotDataZ.length}][X=${plotDataZ[0].length}]`);
            
            // 验证提取的厚度数据
            console.log('厚度切片数据样本:', {
                corner_values: {
                    top_left: plotDataZ[0][0],
                    top_right: plotDataZ[0][plotDataZ[0].length-1],
                    bottom_left: plotDataZ[plotDataZ.length-1][0],
                    bottom_right: plotDataZ[plotDataZ.length-1][plotDataZ[0].length-1]
                }
            });
        } catch (error) {
            console.error('3D厚度数据切片提取失败:', error);
            container.innerHTML = `<div style="color:red;padding:20px;">3D厚度数据格式处理失败: ${error.message}</div>`;
            return;
        }
    } else if (!Array.isArray(plotDataZ[0])) {
        console.log('Z数据是扁平数组，需要重塑成二维数组');
        
        // 首先检查是否可以正确重塑
        if (xCoords.length * yCoords.length === plotDataZ.length) {
            try {
                // 尝试检测数据排列顺序 (按行主序还是列主序)
                const isRowMajor = detectDataOrder(plotDataZ, xCoords, yCoords);
                console.log(`检测到数据排列顺序: ${isRowMajor ? '行主序' : '列主序'}`);
                
                // 根据检测到的顺序重塑数据
                const newZ = reshapeArray(plotDataZ, xCoords.length, yCoords.length, isRowMajor);
                plotDataZ = newZ;
            } catch (error) {
                console.error('无法重塑数据:', error);
                container.innerHTML = `<div style="color:red;padding:20px;">数据转换错误: ${error.message}</div>`;
                return;
            }
        } else if (data.z_thickness_matrix || data.thickness_matrix) {
            // 尝试使用现成的矩阵数据
            plotDataZ = data.z_thickness_matrix || data.thickness_matrix;
            console.log('使用提供的thickness_matrix数据');
        } else if (currentModelType === 'car' && data.grid_data && typeof data.grid_data === 'object') {
            // 尝试从CAR模型特有的grid_data中提取
            try {
                if (data.grid_data.thickness || data.grid_data.deprotection) {
                    const gridData = data.grid_data.thickness || data.grid_data.deprotection;
                    console.log('使用CAR模型grid_data', gridData);
                    plotDataZ = gridData;
                }
            } catch (error) {
                console.error('处理CAR模型grid_data失败:', error);
            }
        } else {
            console.error('Z数据长度与x和y坐标数量不匹配');
            container.innerHTML = `<div style="color:red;padding:20px;">数据维度不匹配: Z长度=${plotDataZ.length}, X长度=${xCoords.length}, Y长度=${yCoords.length}</div>`;
            return;
        }
    }

    // 创建3D表面图
    const trace = {
        type: 'surface',
        x: xCoords,
        y: yCoords,
        z: plotDataZ,
        colorscale: 'Plasma',
        colorbar: { title: LANGS[currentLang].thickness_trace_name || '相对厚度' },
        hovertemplate: `X坐标: %{x:.2f} μm<br>Y坐标: %{y:.2f} μm<br>Z坐标: %{z:.2f}<br>${LANGS[currentLang].hover_thickness_value || '相对厚度值'}: %{z:.2f}<extra></extra>`
    };

    const layout = {
        title: '形貌分布 (3D)',
        scene: {
            xaxis: { title: 'X (μm)' },
            yaxis: { title: 'Y (μm)' },
            zaxis: { title: LANGS[currentLang].relative_thickness_unit || '相对厚度' }
        },
        margin: { l: 20, r: 20, t: 40, b: 20 }
    };

    try {
        Plotly.newPlot(container, [trace], layout, { responsive: true });
        console.log('3D Thickness plot created successfully');
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points && eventData.points.length > 0) {
                const point = eventData.points[0];
                // 对于3D表面图，点击位置包含x、y、z值
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'thickness', container, eventData);
            }
        });
    } catch (error) {
        console.error('Error creating 3D Thickness plot:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建3D图表失败: ${error.message}</div>`;
    }
}

/**
 * 标准化热图数据格式，确保数据为二维数组形式
 * @param {Array} data - 原始数据，可能是一维或二维数组
 * @param {Array} xCoords - X坐标数组
 * @param {Array} yCoords - Y坐标数组
 * @returns {Array} - 标准化的二维数组
 */
function standardizeHeatmapData(data, xCoords, yCoords) {
    // 已经是二维数组，直接返回
    if (Array.isArray(data) && Array.isArray(data[0])) {
        return data;
    }
    
    // 一维数组，需要转换为二维数组
    if (Array.isArray(data) && xCoords.length * yCoords.length === data.length) {
        // 使用detectDataOrder检测数据排列顺序
        const isRowMajor = detectDataOrder(data, xCoords, yCoords);
        console.log(`检测到数据排列顺序: ${isRowMajor ? '行主序' : '列主序'}`);
        
        // 使用reshapeArray重塑数据
        return reshapeArray(data, xCoords.length, yCoords.length, isRowMajor);
    }
    
    // 无法处理的情况，返回原始数据并记录错误
    console.error('数据维度不匹配: 无法重塑数组');
    console.error(`数据长度=${data ? data.length : 'undefined'}, X长度=${xCoords.length}, Y长度=${yCoords.length}`);
    return data; // 返回原始数据，让调用函数决定如何处理
}

/**
 * 动态检测坐标数据的单位（毫米或微米）
 * @param {Array} coords - 坐标数组
 * @returns {string} - 'mm' 或 'μm'
 */
function detectCoordinateUnit(coords) {
    if (!coords || !Array.isArray(coords) || coords.length === 0) {
        return 'μm'; // 默认单位
    }
    const range = Math.max(...coords) - Math.min(...coords);
    return range > 100 ? 'mm' : 'μm'; // 如果范围大于100，认为是毫米单位
}

/**
 * 创建1D曝光剂量分布线图
 * 
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象
 */
function createExposurePlot(container, data) {
    // 获取当前语言设置
    const currentLang = window.currentLang || localStorage.getItem('lang') || 'zh-CN';
    
    // 获取当前选择的模型类型
    const modelSelect = document.getElementById('model-select');
    const currentModelType = modelSelect ? modelSelect.value : 'dill';
    
    // 🔥 检查是否是理想曝光模型数据或多段曝光模式
    if ((data.is_ideal_exposure_model || data.exposure_calculation_method === 'cumulative') && 
        data.intensity_distribution && Array.isArray(data.intensity_distribution)) {
        
        const isCumulativeMode = data.exposure_calculation_method === 'cumulative';
        console.log(`🎨 渲染DILL模型的强度分布 (${isCumulativeMode ? '多段曝光模式' : '理想曝光模式'})`);
        
        if (isCumulativeMode) {
            console.log('🔥 多段曝光模式详细信息:', {
                segment_count: data.segment_count,
                segment_duration: data.segment_duration,
                segment_intensities: data.segment_intensities,
                total_time: data.segment_count * data.segment_duration
            });
        }
        
        try {
            let xCoords = data.x || data.x_coords;
            
            if (!xCoords || !Array.isArray(xCoords) || xCoords.length === 0) {
                container.innerHTML = `<div style="color:red;padding:20px;">DILL模型：无有效位置坐标数据</div>`;
                return;
            }
            
            // 根据数据的实际数值范围动态判断单位
            const xUnit = detectCoordinateUnit(xCoords);
            
            const trace = {
                x: xCoords,
                y: data.intensity_distribution,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: '#1f77b4', width: 2 },
                marker: { size: 4, color: '#1f77b4' },
                name: '光强分布',
                hovertemplate: `位置: %{x:.3f} ${xUnit}<br>光强: %{y:.6f}<extra></extra>`
            };
            
            // 🔥 多段曝光模式下的标题
            let titleText = 'DILL模型 - 光强分布';
            if (isCumulativeMode) {
                // 累积模式下直接使用累积时间标题，不需要检查曝光时间窗口开关
                const totalTime = data.segment_count * data.segment_duration;
                titleText = `DILL模型 - 光强分布 (累积模式) t=${totalTime.toFixed(1)}s`;
            }
            
            const layout = {
                title: titleText,
                xaxis: { title: `位置 (${xUnit})` },
                yaxis: { title: '归一化光强' },
                margin: { l: 60, r: 20, t: 60, b: 60 },
                showlegend: false
            };
            
            Plotly.newPlot(container, [trace], layout, {responsive: true});
            
            // 添加点击事件处理
            container.on('plotly_click', function(eventData) {
                if(eventData.points.length > 0) {
                    const point = eventData.points[0];
                    showSinglePointDetailsPopup({ 
                        x: point.x, 
                        y: point.y
                    }, 'exposure', container, eventData);
                }
            });
            
            console.log('✅ DILL模型光强分布图渲染完成');
            return;
            
        } catch (error) {
            console.error('渲染DILL模型光强分布图失败:', error);
            container.innerHTML = `<div style="color:red;padding:20px;">DILL模型渲染失败: ${error.message}</div>`;
            return;
        }
    }
    
    // 原有的逻辑（用于传统DILL模型）
    let xCoords = data.x || data.positions || data.x_coords;
    let yData = data.exposure_dose || data.intensity || data.I;

    // 更健壮的数据检查
    if (!xCoords || !yData || 
        !Array.isArray(xCoords) || !Array.isArray(yData) ||
        xCoords.length === 0 || yData.length === 0 ||
        xCoords.length !== yData.length) {
        container.innerHTML = `<div style="color:red;padding:20px;">${(window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].error_no_exposure_data) || '无有效1D曝光剂量数据，无法绘图。'}</div>`;
        return;
    }

    try {
        const trace = {
            x: xCoords,
            y: yData,
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#1f77b4', width: 2 },
            marker: { size: 4, color: '#1f77b4' },
            name: (window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].exposure_dose_trace_name) || '曝光剂量',
            hovertemplate: `位置: %{x}<br>${(window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].hover_exposure_value) || '曝光剂量值'}: %{y}<extra></extra>`
        };

        // 根据模型类型和实际数据范围动态设置轴标签
        let xAxisTitle;
        if (currentModelType === 'enhanced_dill') {
            xAxisTitle = 'Z 位置 (μm)'; // 增强DILL模型关注深度方向
        } else {
            // 根据数据的实际数值范围动态判断单位
            const xUnit = detectCoordinateUnit(xCoords);
            xAxisTitle = `位置 (${xUnit})`;
        }

        const layout = {
            title: (window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].exposure_dist) || '曝光剂量分布 (1D)',
            xaxis: { title: xAxisTitle },
            yaxis: { title: (window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].exposure_dose_trace_name) || '曝光剂量 (mJ/cm²)' },
            margin: { l: 60, r: 20, t: 60, b: 60 },
            showlegend: false
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y
                }, 'exposure', container, eventData);
            }
        });
    } catch (error) {
        console.error('Error creating 1D Exposure plot:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建1D线图失败: ${error.message}</div>`;
    }
}

/**
 * 创建1D形貌分布线图
 * 
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象
 */
function createThicknessPlot(container, data) {
    // 获取当前语言设置
    const currentLang = window.currentLang || localStorage.getItem('lang') || 'zh-CN';
    
    // 获取当前选择的模型类型
    const modelSelect = document.getElementById('model-select');
    const currentModelType = modelSelect ? modelSelect.value : 'dill';
    
    // 检查是否是理想曝光模型数据
    if (data.is_ideal_exposure_model && data.etch_depths_data && Array.isArray(data.etch_depths_data)) {
        console.log('🎨 渲染DILL模型的多条蚀刻深度曲线');
        
        try {
            let xCoords = data.x || data.x_coords;
            
            if (!xCoords || !Array.isArray(xCoords) || xCoords.length === 0) {
                container.innerHTML = `<div style="color:red;padding:20px;">DILL模型：无有效位置坐标数据</div>`;
                return;
            }
            
            // 根据数据的实际数值范围动态判断单位
            const xUnit = detectCoordinateUnit(xCoords);
            
            // 为每个曝光时间创建一条曲线
            const traces = [];
            const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2'];
            
            data.etch_depths_data.forEach((etchData, index) => {
                if (etchData.etch_depth && Array.isArray(etchData.etch_depth)) {
                    traces.push({
                        x: xCoords,
                        y: etchData.etch_depth,
                        type: 'scatter',
                        mode: 'lines',
                        line: { 
                            color: colors[index % colors.length], 
                            width: 2 
                        },
                        name: `t=${etchData.time}s`,
                        hovertemplate: `位置: %{x:.3f} ${xUnit}<br>形貌深度: %{y:.6f}<br>曝光时间: ${etchData.time}s<extra></extra>`
                    });
                }
            });
            
            if (traces.length === 0) {
                container.innerHTML = `<div style="color:red;padding:20px;">DILL模型：无有效蚀刻深度数据</div>`;
                return;
            }
            
            // 检查是否使用多段曝光时间累积模式
            const exposureMethodSelect = document.getElementById('exposure_calculation_method');
            const isCumulativeExposure = exposureMethodSelect && exposureMethodSelect.value === 'cumulative';
            
            // 检查是否启用了自定义多段曝光时间比较（但在累积模式下应该禁用）
            const enableExposureTimeWindow = document.getElementById('enable_exposure_time_window_dill');
            const showMultiSegmentText = enableExposureTimeWindow && enableExposureTimeWindow.checked && !isCumulativeExposure;
            
            let titleText = showMultiSegmentText ? 'DILL模型 - 形貌分布 (多曝光时间)' : 'DILL模型 - 形貌分布';
            if (isCumulativeExposure) {
                // 获取多段曝光的总时间
                const segmentCountInput = document.getElementById('segment_count');
                const segmentDurationInput = document.getElementById('segment_duration');
                const segmentCount = segmentCountInput ? parseInt(segmentCountInput.value) || 5 : 5;
                const segmentDuration = segmentDurationInput ? parseFloat(segmentDurationInput.value) || 1 : 1;
                const totalTime = segmentCount * segmentDuration;
                
                if (showMultiSegmentText) {
                    titleText = `DILL模型 - 形貌分布 (多段曝光时间) t=${totalTime.toFixed(1)}s`;
                } else {
                    titleText = `DILL模型 - 形貌分布 t=${totalTime.toFixed(1)}s`;
                }
            }
            
            const layout = {
                title: titleText,
                xaxis: { title: `位置 (${xUnit})` },
                yaxis: { title: '相对厚度' },
                margin: { l: 70, r: 20, t: 80, b: 60 },
                showlegend: showMultiSegmentText, // 只有在启用自定义多段曝光时间比较时才显示图例
                legend: {
                    x: 1.02,
                    y: 1,
                    bgcolor: 'rgba(255,255,255,0.8)',
                    bordercolor: 'rgba(0,0,0,0.2)',
                    borderwidth: 1
                }
            };
            
            Plotly.newPlot(container, traces, layout, {responsive: true});
            
            // 添加点击事件处理
            container.on('plotly_click', function(eventData) {
                if(eventData.points.length > 0) {
                    const point = eventData.points[0];
                    showSinglePointDetailsPopup({ 
                        x: point.x, 
                        y: point.y,
                        series: point.data.name
                    }, 'thickness', container, eventData);
                }
            });
            
            console.log(`✅ DILL模型蚀刻深度图渲染完成，共${traces.length}条曲线`);
            return;
        } catch (error) {
            console.error('渲染DILL模型蚀刻深度图失败:', error);
            container.innerHTML = `<div style="color:red;padding:20px;">DILL模型渲染失败: ${error.message}</div>`;
            return;
        }
    }
    
    // 原有的单曲线逻辑（用于传统DILL模型）
    let xCoords = data.x || data.positions || data.x_coords;
    let yData = data.thickness || data.M;

    // 更健壮的数据检查
    if (!xCoords || !yData || 
        !Array.isArray(xCoords) || !Array.isArray(yData) ||
        xCoords.length === 0 || yData.length === 0 ||
        xCoords.length !== yData.length) {
        container.innerHTML = `<div style="color:red;padding:20px;">${(window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].error_no_thickness_data) || '无有效1D厚度数据，无法绘图。'}</div>`;
        return;
    }

    try {
        // 检查是否使用多段曝光时间累积模式
        const exposureMethodSelect = document.getElementById('exposure_calculation_method');
        const isCumulativeExposure = exposureMethodSelect && exposureMethodSelect.value === 'cumulative';
        
        // 检查是否启用了自定义多段曝光时间比较（但在累积模式下应该禁用）
        const enableExposureTimeWindow = document.getElementById('enable_exposure_time_window_dill');
        const showMultiSegmentText = enableExposureTimeWindow && enableExposureTimeWindow.checked && !isCumulativeExposure;
        
        let traceName = (window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].thickness_trace_name) || '相对厚度';
        if (isCumulativeExposure) {
            // 获取多段曝光的总时间
            const segmentCountInput = document.getElementById('segment_count');
            const segmentDurationInput = document.getElementById('segment_duration');
            const segmentCount = segmentCountInput ? parseInt(segmentCountInput.value) || 5 : 5;
            const segmentDuration = segmentDurationInput ? parseFloat(segmentDurationInput.value) || 1 : 1;
            const totalTime = segmentCount * segmentDuration;
            
            traceName = `形貌分布 t=${totalTime.toFixed(1)}s`;
        }
        
        const trace = {
            x: xCoords,
            y: yData,
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#ff7f0e', width: 2 },
            marker: { size: 4, color: '#ff7f0e' },
            name: traceName,
            hovertemplate: `位置: %{x}<br>${(window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].hover_thickness_value) || '相对厚度值'}: %{y}<extra></extra>`
        };

        // 根据模型类型和实际数据范围动态设置轴标签
        let xAxisTitle;
        if (currentModelType === 'enhanced_dill') {
            xAxisTitle = 'Z 位置 (μm)'; // 增强DILL模型关注深度方向
        } else {
            // 根据数据的实际数值范围动态判断单位
            const xUnit = detectCoordinateUnit(xCoords);
            xAxisTitle = `位置 (${xUnit})`;
        }

        let titleText = '形貌分布 (1D)';
        if (isCumulativeExposure) {
            // 使用前面计算的总时间
            const totalTime = (segmentCount * segmentDuration);
            if (showMultiSegmentText) {
                titleText = `形貌分布 (1D) - 多段曝光时间累积 t=${totalTime.toFixed(1)}s`;
            } else {
                titleText = `形貌分布 (1D) t=${totalTime.toFixed(1)}s`;
            }
        }
        
        const layout = {
            title: titleText,
            xaxis: { title: xAxisTitle },
            yaxis: { title: (window.LANGS && window.LANGS[currentLang] && window.LANGS[currentLang].thickness_trace_name) || '相对厚度' },
            margin: { l: 60, r: 20, t: 60, b: 60 },
            showlegend: isCumulativeExposure && showMultiSegmentText // 只在多段曝光模式且启用自定义多段曝光时间比较时显示图例
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y
                }, 'thickness', container, eventData);
            }
        });
    } catch (error) {
        console.error('Error creating 1D Thickness plot:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建1D线图失败: ${error.message}</div>`;
    }
}

function createExposureHeatmap(container, data) {
    // 统一字段名处理，增加更多兼容性
    let xCoords = data.x_coords || data.x;
    let yCoords = data.y_coords || data.y;
    let zData = data.z_exposure_dose || data.exposure_dose || data.intensity_2d || data.I;

    // 更健壮的数据检查
    if (!xCoords || !yCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        container.innerHTML = `<div style="color:red;padding:20px;">${LANGS[currentLang].error_no_exposure_data || '无有效2D曝光剂量数据，无法绘图。'}</div>`;
        return;
    }

    // 使用标准化函数处理数据格式
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, yCoords);

        // 根据数据类型设置色彩条标题
        let colorbarTitle = '曝光剂量';
        if (data.sine_type === '2d_exposure_pattern') {
            colorbarTitle = '曝光计量';
        } else if (LANGS[currentLang].exposure_dose_trace_name) {
            colorbarTitle = LANGS[currentLang].exposure_dose_trace_name;
        }

        const trace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Viridis',
            colorbar: { title: colorbarTitle },
            showlegend: false,  // 不显示图例，避免"TRACE 1"字样
            hovertemplate: `X: %{x}<br>Y: %{y}<br>${LANGS[currentLang].hover_exposure_value || '曝光剂量值'}: %{z}<extra></extra>`
        };

        // 根据模型类型和数据类型设置不同的标题和轴标签
        const modelSelect = document.getElementById('model-select');
        const currentModelType = modelSelect ? modelSelect.value : 'dill';
        
        let title, xAxisTitle, yAxisTitle;
        
        // 优先使用数据中的自定义标题（2D曝光图案）
        if (data.exposure_title) {
            title = data.exposure_title;
            xAxisTitle = 'X 位置 (μm)';
            yAxisTitle = 'Y 位置 (μm)';
        } else if (currentModelType === 'enhanced_dill') {
            title = '曝光计量分布 (2D) (Y, Z平面)';
            xAxisTitle = 'Z 位置 (μm)';  // 对于增强DILL模型，横轴是深度方向
            yAxisTitle = 'Y 位置 (μm)';
        } else {
            title = '曝光计量分布 (2D)';
            xAxisTitle = LANGS[currentLang].x_position || 'X 位置 (μm)';
            yAxisTitle = LANGS[currentLang].y_position || 'Y 位置 (μm)';
        }
        
        // 计算数据范围（避免使用flat()）
        let zMin = Infinity;
        let zMax = -Infinity;
        for (let i = 0; i < heatmapZ.length; i++) {
            for (let j = 0; j < heatmapZ[i].length; j++) {
                const val = heatmapZ[i][j];
                if (val < zMin) zMin = val;
                if (val > zMax) zMax = val;
            }
        }
        
        // 创建等高线trace
        const contourTrace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'contour',
            showscale: false,  // 不显示色标
            colorscale: [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']],  // 透明填充
            contours: {
                coloring: 'none',  // 不填充颜色，只显示线条
                showlabels: true,  // 显示数值标签
                labelfont: {
                    size: 10,
                    color: 'white'
                },
                start: zMin,
                end: zMax,
                size: (zMax - zMin) / 10  // 10条等高线，减少复杂度
            },
            line: {
                color: 'rgba(255,255,255,0.7)',  // 半透明白色线条
                width: 1
            },
            showlegend: false,  // 不显示图例，避免"TRACE 1"字样
            hoverinfo: 'skip'  // 不显示悬停信息
        };

        const layout = {
            title: title,
            xaxis: { 
                title: xAxisTitle,
                showgrid: false
            },
            yaxis: { 
                title: yAxisTitle,
                showgrid: false
            },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace, contourTrace], layout, {responsive: true});
        
        // 添加等高线控制按钮
        if (window.contourControls) {
            window.contourControls.addContourControl(container, data, 'exposure');
        }
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                
                // 🔧 修复：Plotly热力图点击事件中point.y是索引，需要转换为实际Y坐标
                // 更健壮的索引获取逻辑，处理各种边缘情况
                let yIndex;
                
                if (point.pointNumber && Array.isArray(point.pointNumber) && point.pointNumber.length >= 2) {
                    // 标准情况：使用pointNumber[1]作为Y索引
                    yIndex = point.pointNumber[1];
                } else if (point.pointIndex && Array.isArray(point.pointIndex) && point.pointIndex.length >= 2) {
                    // 备用情况：某些版本可能使用pointIndex
                    yIndex = point.pointIndex[1];
                } else if (typeof point.y === 'number' && point.y >= 0) {
                    // 回退情况：直接使用point.y作为索引
                    yIndex = Math.round(point.y);
                } else {
                    // 最后的默认值
                    yIndex = 0;
                }
                
                // 从yCoords数组中获取实际的Y坐标值，增加更多的错误检查
                let actualYCoord;
                if (yCoords && Array.isArray(yCoords) && yIndex >= 0 && yIndex < yCoords.length) {
                    actualYCoord = yCoords[yIndex];
                } else {
                    // 如果无法从yCoords获取，尝试使用其他方式
                    actualYCoord = typeof point.y === 'number' ? point.y : 0;
                }
                
                console.log('🔧 热力图Y坐标修复 (曝光) - 增强版:', {
                    'point.y (索引)': point.y,
                    'point.z (曝光值)': point.z,
                    'point.pointNumber': point.pointNumber,
                    'point.pointIndex': point.pointIndex,
                    'yIndex计算结果': yIndex,
                    'yCoords数组长度': yCoords ? yCoords.length : 'undefined',
                    'actualYCoord最终值': actualYCoord,
                    'point.x': point.x
                });
                
                // 对于热力图，point.x和point.y是坐标值，point.z是强度值
                // 为2D曝光图案创建特殊的点数据结构
                const pointData = { 
                    x: point.x,
                    y: point.z, // 显示值 
                    z: point.z,
                    // 保存实际的2D坐标用于计算
                    actual_x: point.x,
                    actual_y: actualYCoord  // 🔧 修复：使用实际的Y坐标
                };
                
                showSinglePointDetailsPopup(pointData, 'exposure', container, eventData);
            }
        });
    } catch (error) {
        console.error('Error creating 2D Exposure heatmap:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建2D热图失败: ${error.message}</div>`;
    }
}

function createThicknessHeatmap(container, data) {
    // 统一字段名处理，增加更多兼容性
    let xCoords = data.x_coords || data.x;
    let yCoords = data.y_coords || data.y;
    let zData = data.z_thickness || data.thickness || data.M || data.thickness_2d;

    // 更健壮的数据检查
    if (!xCoords || !yCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        container.innerHTML = `<div style="color:red;padding:20px;">${LANGS[currentLang].error_no_thickness_data || '无有效2D厚度数据，无法绘图。'}</div>`;
        return;
    }

    // 使用标准化函数处理数据格式
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, yCoords);

        // 根据数据类型设置色彩条标题
        let colorbarTitle = '相对厚度';
        if (data.sine_type === '2d_exposure_pattern') {
            colorbarTitle = '相对厚度';
        } else if (LANGS[currentLang].thickness_trace_name) {
            colorbarTitle = LANGS[currentLang].thickness_trace_name;
        }

        const trace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Plasma',
            colorbar: { title: colorbarTitle },
            showlegend: false,  // 不显示图例，避免"TRACE 1"字样
            hovertemplate: `X: %{x}<br>Y: %{y}<br>${LANGS[currentLang].hover_thickness_value || '相对厚度值'}: %{z}<extra></extra>`
        };

        // 根据模型类型和数据类型设置不同的标题和轴标签
        const modelSelect = document.getElementById('model-select');
        const currentModelType = modelSelect ? modelSelect.value : 'dill';
        
        let title, xAxisTitle, yAxisTitle;
        
        // 优先使用数据中的自定义标题（2D曝光图案）
        if (data.thickness_title) {
            title = data.thickness_title;
            xAxisTitle = 'X 位置 (μm)';
            yAxisTitle = 'Y 位置 (μm)';
        } else if (currentModelType === 'enhanced_dill') {
            title = '形貌分布 (2D) (Y, Z平面)';
            xAxisTitle = 'Z 位置 (μm)';  // 对于增强DILL模型，横轴是深度方向
            yAxisTitle = 'Y 位置 (μm)';
        } else {
            title = '形貌分布 (2D)';
            xAxisTitle = LANGS[currentLang].x_position || 'X 位置 (μm)';
            yAxisTitle = LANGS[currentLang].y_position || 'Y 位置 (μm)';
        }
        
        // 计算数据范围（避免使用flat()）
        let zMin = Infinity;
        let zMax = -Infinity;
        for (let i = 0; i < heatmapZ.length; i++) {
            for (let j = 0; j < heatmapZ[i].length; j++) {
                const val = heatmapZ[i][j];
                if (val < zMin) zMin = val;
                if (val > zMax) zMax = val;
            }
        }
        
        // 创建等高线trace
        const contourTrace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'contour',
            showscale: false,  // 不显示色标
            colorscale: [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']],  // 透明填充
            contours: {
                coloring: 'none',  // 不填充颜色，只显示线条
                showlabels: true,  // 显示数值标签
                labelfont: {
                    size: 10,
                    color: 'white'
                },
                start: zMin,
                end: zMax,
                size: (zMax - zMin) / 10  // 10条等高线，减少复杂度
            },
            line: {
                color: 'rgba(255,255,255,0.7)',  // 半透明白色线条
                width: 1
            },
            showlegend: false,  // 不显示图例，避免"TRACE 1"字样
            hoverinfo: 'skip'  // 不显示悬停信息
        };

        const layout = {
            title: title,
            xaxis: { 
                title: xAxisTitle,
                showgrid: false
            },
            yaxis: { 
                title: yAxisTitle,
                showgrid: false
            },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace, contourTrace], layout, {responsive: true});
        
        // 添加等高线控制按钮
        if (window.contourControls) {
            window.contourControls.addContourControl(container, data, 'thickness');
        }
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            // 🔧 新增：记录完整的事件数据以便调试
            console.log('🔧 完整的plotly_click事件数据 (厚度):', eventData);
            
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                
                // 🔧 修复：Plotly热力图点击事件中point.y是索引，需要转换为实际Y坐标
                // 更健壮的索引获取逻辑，处理厚度为0等边缘情况
                let yIndex;
                
                if (point.pointNumber && Array.isArray(point.pointNumber) && point.pointNumber.length >= 2) {
                    // 标准情况：使用pointNumber[1]作为Y索引
                    yIndex = point.pointNumber[1];
                } else if (point.pointIndex && Array.isArray(point.pointIndex) && point.pointIndex.length >= 2) {
                    // 备用情况：某些版本可能使用pointIndex
                    yIndex = point.pointIndex[1];
                } else if (typeof point.y === 'number' && point.y >= 0) {
                    // 回退情况：直接使用point.y作为索引
                    yIndex = Math.round(point.y);
                } else {
                    // 最后的默认值
                    yIndex = 0;
                }
                
                // 从yCoords数组中获取实际的Y坐标值，增加更多的错误检查
                let actualYCoord;
                if (yCoords && Array.isArray(yCoords) && yIndex >= 0 && yIndex < yCoords.length) {
                    actualYCoord = yCoords[yIndex];
                } else {
                    // 🔧 新增：如果无法从索引获取，尝试直接从事件数据中获取
                    // 检查eventData中是否有更直接的坐标信息
                    if (eventData && eventData.points && eventData.points[0]) {
                        const eventPoint = eventData.points[0];
                        // 尝试从不同的属性获取Y坐标
                        actualYCoord = eventPoint.lat || 
                                     eventPoint.yaxis || 
                                     (typeof point.y === 'number' ? point.y : 0);
                    } else {
                        actualYCoord = typeof point.y === 'number' ? point.y : 0;
                    }
                }
                
                // 🔧 最后的保险措施：如果得到的actualYCoord看起来像索引而不是坐标，尝试转换
                if (actualYCoord >= 0 && actualYCoord < 100 && yCoords && yCoords.length > actualYCoord) {
                    // 如果actualYCoord是一个小的正整数，并且yCoords数组足够大，可能这就是索引
                    const potentialCoord = yCoords[actualYCoord];
                    if (Math.abs(potentialCoord) > Math.abs(actualYCoord)) {
                        actualYCoord = potentialCoord;
                    }
                }
                
                console.log('🔧 热力图Y坐标修复 (厚度) - 增强版:', {
                    'point.y (索引)': point.y,
                    'point.z (厚度值)': point.z,
                    'point.pointNumber': point.pointNumber,
                    'point.pointIndex': point.pointIndex,
                    'yIndex计算结果': yIndex,
                    'yCoords数组长度': yCoords ? yCoords.length : 'undefined',
                    'yCoords[前5项]': yCoords ? yCoords.slice(0, 5) : 'undefined',
                    'actualYCoord最终值': actualYCoord,
                    'point.x': point.x,
                    '是否厚度为0': point.z === 0
                });
                
                // 对于热力图，point.x和point.y是坐标值，point.z是强度值
                // 为2D曝光图案创建特殊的点数据结构
                const pointData = { 
                    x: point.x,
                    y: point.z, // 显示值 
                    z: point.z,
                    // 保存实际的2D坐标用于计算
                    actual_x: point.x,
                    actual_y: actualYCoord  // 🔧 修复：使用实际的Y坐标
                };
                
                showSinglePointDetailsPopup(pointData, 'thickness', container, eventData);
            }
        });
    } catch (error) {
        console.error('Error creating 2D Thickness heatmap:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建2D热图失败: ${error.message}</div>`;
    }
}

/**
 * 创建(x, y)平面的曝光计量分布热力图
 * 
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象
 */
function createExposureXYHeatmap(container, data) {
    // 统一字段名处理
    let xCoords = data.x_coords || data.x;
    let yCoords = data.y_coords || data.y;
    // 支持不同的字段名，保持向后兼容性
    let zData = data.exposure_xy || data.xy_exposure; 
    
    // 检查数据
    if (!xCoords || !yCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        container.innerHTML = '<div style="color:red;padding:20px;">无有效(X, Y)平面曝光剂量数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, yCoords);
        
        const trace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Viridis',
            colorbar: { title: LANGS[currentLang].exposure_dose_trace_name || '曝光剂量' },
            hovertemplate: `X: %{x}<br>Y: %{y}<br>${LANGS[currentLang].hover_exposure_value || '曝光剂量值'}: %{z}<extra></extra>`
        };
        
        // 动态检测X和Y轴的单位
        const xUnit = detectCoordinateUnit(xCoords);
        const yUnit = detectCoordinateUnit(yCoords);
        
        const layout = {
            title: '曝光计量分布 (2D) (X, Y平面)',
            xaxis: { title: `X 位置 (${xUnit})` },
            yaxis: { title: `Y 位置 (${yUnit})` },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'exposure', container, eventData);
            }
        });
        
        // 添加导出功能 - 添加安全检查
        const exportExposureXYImg = document.getElementById('export-exposure-xy-img');
        if (exportExposureXYImg) {
            exportExposureXYImg.onclick = function() {
                Plotly.downloadImage(container, {format: 'png', filename: 'exposure_xy_distribution'});
            };
        }
        
        const exportExposureXYData = document.getElementById('export-exposure-xy-data');
        if (exportExposureXYData) {
            exportExposureXYData.onclick = function() {
                exportPlotData('exposure_xy');
            };
        }
    } catch (error) {
        console.error('创建(X, Y)平面曝光热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建(X, Y)平面曝光热图失败: ${error.message}</div>`;
    }
}

/**
 * 创建(x, y)平面的形貌分布热力图
 * 
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象
 */
function createThicknessXYHeatmap(container, data) {
    // 统一字段名处理
    let xCoords = data.x_coords || data.x;
    let yCoords = data.y_coords || data.y;
    // 支持不同的字段名，保持向后兼容性
    let zData = data.thickness_xy || data.xy_thickness;
    
    // 检查数据
    if (!xCoords || !yCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        container.innerHTML = '<div style="color:red;padding:20px;">无有效(X, Y)平面厚度数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, yCoords);
        
        const trace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Plasma',
            colorbar: { title: LANGS[currentLang].thickness_trace_name || '相对厚度' },
            hovertemplate: `X: %{x}<br>Y: %{y}<br>${LANGS[currentLang].hover_thickness_value || '相对厚度值'}: %{z}<extra></extra>`
        };
        
        // 动态检测X和Y轴的单位
        const xUnit = detectCoordinateUnit(xCoords);
        const yUnit = detectCoordinateUnit(yCoords);
        
        const layout = {
            title: LANGS[currentLang].thickness_xy_dist || '形貌分布 (2D) (X, Y平面)',
            xaxis: { title: `X 位置 (${xUnit})` },
            yaxis: { title: `Y 位置 (${yUnit})` },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'thickness', container, eventData);
            }
        });
        
        // 添加导出功能 - 添加安全检查
        const exportThicknessXYImg = document.getElementById('export-thickness-xy-img');
        if (exportThicknessXYImg) {
            exportThicknessXYImg.onclick = function() {
                Plotly.downloadImage(container, {format: 'png', filename: 'thickness_xy_distribution'});
            };
        }
        
        const exportThicknessXYData = document.getElementById('export-thickness-xy-data');
        if (exportThicknessXYData) {
            exportThicknessXYData.onclick = function() {
                exportPlotData('thickness_xy');
            };
        }
    } catch (error) {
        console.error('创建(X, Y)平面厚度热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建(X, Y)平面厚度热图失败: ${error.message}</div>`;
    }
}

/**
 * Enhanced Dill模型专用：创建XY平面曝光剂量热图
 */
function createEnhancedDillXYExposureHeatmap(container, data) {
    // Enhanced Dill模型XY平面数据处理
    let xCoords = data.x_coords || data.x;
    let yCoords = data.xy_y_coords || data.y_coords || data.y;
    let zData = data.xy_exposure;
    
    console.log('Enhanced Dill XY平面曝光剂量热图数据检查:', {
        x_coords_length: xCoords ? xCoords.length : 0,
        y_coords_length: yCoords ? yCoords.length : 0,
        z_data_type: typeof zData,
        z_data_shape: Array.isArray(zData) ? `${zData.length}x${zData[0] ? zData[0].length : 0}` : 'not array',
        data_keys: Object.keys(data)
    });
    
    // 检查数据
    if (!xCoords || !yCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        console.error('Enhanced Dill XY平面曝光剂量数据不完整');
        container.innerHTML = '<div style="color:red;padding:20px;">无有效XY平面曝光剂量数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, yCoords);
        
        console.log('Enhanced Dill XY平面曝光剂量热图数据处理完成:', {
            x_range: [Math.min(...xCoords), Math.max(...xCoords)],
            y_range: [Math.min(...yCoords), Math.max(...yCoords)],
            z_range: (() => {
                let min = Infinity, max = -Infinity;
                for (const row of heatmapZ) {
                    for (const val of row) {
                        if (val < min) min = val;
                        if (val > max) max = val;
                    }
                }
                return [min, max];
            })()
        });
        
        const trace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Viridis',
            colorbar: { title: '曝光剂量 (mJ/cm²)' },
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>曝光剂量: %{z}<extra></extra>'
        };
        
        // 动态检测X和Y轴的单位
        const xUnit = detectCoordinateUnit(xCoords);
        const yUnit = detectCoordinateUnit(yCoords);
        
        const layout = {
            title: 'XY平面曝光剂量分布 (表面)',
            xaxis: { title: `X 位置 (${xUnit})` },
            yaxis: { title: `Y 位置 (${yUnit})` },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'exposure', container, eventData);
            }
        });
        
        console.log('Enhanced Dill XY平面曝光剂量热图渲染完成');
    } catch (error) {
        console.error('创建Enhanced Dill XY平面曝光热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建XY平面曝光热图失败: ${error.message}</div>`;
    }
}

/**
 * Enhanced Dill模型专用：创建XY平面厚度热图
 */
function createEnhancedDillXYThicknessHeatmap(container, data) {
    // Enhanced Dill模型XY平面数据处理
    let xCoords = data.x_coords || data.x;
    let yCoords = data.xy_y_coords || data.y_coords || data.y;
    let zData = data.xy_thickness;
    
    console.log('Enhanced Dill XY平面厚度热图数据检查:', {
        x_coords_length: xCoords ? xCoords.length : 0,
        y_coords_length: yCoords ? yCoords.length : 0,
        z_data_type: typeof zData,
        z_data_shape: Array.isArray(zData) ? `${zData.length}x${zData[0] ? zData[0].length : 0}` : 'not array',
        data_keys: Object.keys(data)
    });
    
    // 检查数据
    if (!xCoords || !yCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(yCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || yCoords.length === 0 || zData.length === 0) {
        console.error('Enhanced Dill XY平面厚度数据不完整');
        container.innerHTML = '<div style="color:red;padding:20px;">无有效XY平面厚度数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, yCoords);
        
        console.log('Enhanced Dill XY平面厚度热图数据处理完成:', {
            x_range: [Math.min(...xCoords), Math.max(...xCoords)],
            y_range: [Math.min(...yCoords), Math.max(...yCoords)],
            z_range: (() => {
                let min = Infinity, max = -Infinity;
                for (const row of heatmapZ) {
                    for (const val of row) {
                        if (val < min) min = val;
                        if (val > max) max = val;
                    }
                }
                return [min, max];
            })()
        });
        
        const trace = {
            x: xCoords,
            y: yCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Plasma',
            colorbar: { title: '相对厚度' },
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>相对厚度: %{z}<extra></extra>'
        };
        
        // 动态检测X和Y轴的单位
        const xUnit = detectCoordinateUnit(xCoords);
        const yUnit = detectCoordinateUnit(yCoords);
        
        const layout = {
            title: 'XY平面形貌分布 (表面)',
            xaxis: { title: `X 位置 (${xUnit})` },
            yaxis: { title: `Y 位置 (${yUnit})` },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'thickness', container, eventData);
            }
        });
        
        console.log('Enhanced Dill XY平面厚度热图渲染完成');
    } catch (error) {
        console.error('创建Enhanced Dill XY平面厚度热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建XY平面厚度热图失败: ${error.message}</div>`;
    }
}

/**
 * Enhanced Dill模型专用：创建X平面曝光剂量热图
 */
function createEnhancedDillXPlaneExposureHeatmap(container, data) {
    // X平面数据处理 - 使用Y和Z坐标
    let yCoords = data.y_coords || data.y;
    let zCoords = data.z_coords || data.z;
    let zData = data.x_plane_exposure;
    
    console.log('Enhanced Dill X平面曝光剂量热图数据检查:', {
        y_coords_length: yCoords ? yCoords.length : 0,
        z_coords_length: zCoords ? zCoords.length : 0,
        z_data_type: typeof zData,
        z_data_shape: Array.isArray(zData) ? `${zData.length}x${zData[0] ? zData[0].length : 0}` : 'not array',
        data_keys: Object.keys(data)
    });
    
    // 检查数据
    if (!yCoords || !zCoords || !zData || 
        !Array.isArray(yCoords) || !Array.isArray(zCoords) || !Array.isArray(zData) ||
        yCoords.length === 0 || zCoords.length === 0 || zData.length === 0) {
        console.error('Enhanced Dill X平面曝光剂量数据不完整');
        container.innerHTML = '<div style="color:red;padding:20px;">无有效X平面曝光剂量数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, yCoords, zCoords);
        
        console.log('Enhanced Dill X平面曝光剂量热图数据处理完成:', {
            y_range: [Math.min(...yCoords), Math.max(...yCoords)],
            z_range: [Math.min(...zCoords), Math.max(...zCoords)],
            value_range: (() => {
                let min = Infinity, max = -Infinity;
                for (const row of heatmapZ) {
                    for (const val of row) {
                        if (val < min) min = val;
                        if (val > max) max = val;
                    }
                }
                return [min, max];
            })()
        });
        
        const trace = {
            x: yCoords,
            y: zCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Viridis',
            colorbar: { title: '曝光剂量 (mJ/cm²)' },
            hovertemplate: 'Y: %{x}<br>Z: %{y}<br>曝光剂量: %{z}<extra></extra>'
        };
        
        const layout = {
            title: 'X平面曝光剂量分布 (Y-Z截面)',
            xaxis: { title: 'Y 位置 (μm)' },
            yaxis: { title: 'Z 位置 (μm)' },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'exposure', container, eventData);
            }
        });
        
        console.log('Enhanced Dill X平面曝光剂量热图渲染完成');
    } catch (error) {
        console.error('创建Enhanced Dill X平面曝光热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建X平面曝光热图失败: ${error.message}</div>`;
    }
}

/**
 * Enhanced Dill模型专用：创建X平面厚度热图
 */
function createEnhancedDillXPlaneThicknessHeatmap(container, data) {
    // X平面数据处理 - 使用Y和Z坐标
    let yCoords = data.y_coords || data.y;
    let zCoords = data.z_coords || data.z;
    let zData = data.x_plane_thickness;
    
    console.log('Enhanced Dill X平面厚度热图数据检查:', {
        y_coords_length: yCoords ? yCoords.length : 0,
        z_coords_length: zCoords ? zCoords.length : 0,
        z_data_type: typeof zData,
        z_data_shape: Array.isArray(zData) ? `${zData.length}x${zData[0] ? zData[0].length : 0}` : 'not array',
        data_keys: Object.keys(data)
    });
    
    // 检查数据
    if (!yCoords || !zCoords || !zData || 
        !Array.isArray(yCoords) || !Array.isArray(zCoords) || !Array.isArray(zData) ||
        yCoords.length === 0 || zCoords.length === 0 || zData.length === 0) {
        console.error('Enhanced Dill X平面厚度数据不完整');
        container.innerHTML = '<div style="color:red;padding:20px;">无有效X平面厚度数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, yCoords, zCoords);
        
        console.log('Enhanced Dill X平面厚度热图数据处理完成:', {
            y_range: [Math.min(...yCoords), Math.max(...yCoords)],
            z_range: [Math.min(...zCoords), Math.max(...zCoords)],
            value_range: (() => {
                let min = Infinity, max = -Infinity;
                for (const row of heatmapZ) {
                    for (const val of row) {
                        if (val < min) min = val;
                        if (val > max) max = val;
                    }
                }
                return [min, max];
            })()
        });
        
        const trace = {
            x: yCoords,
            y: zCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Plasma',
            colorbar: { title: '相对厚度' },
            hovertemplate: 'Y: %{x}<br>Z: %{y}<br>相对厚度: %{z}<extra></extra>'
        };
        
        const layout = {
            title: 'X平面形貌分布 (Y-Z截面)',
            xaxis: { title: 'Y 位置 (μm)' },
            yaxis: { title: 'Z 位置 (μm)' },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'thickness', container, eventData);
            }
        });
        
        console.log('Enhanced Dill X平面厚度热图渲染完成');
    } catch (error) {
        console.error('创建Enhanced Dill X平面厚度热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建X平面厚度热图失败: ${error.message}</div>`;
    }
}

/**
 * Enhanced Dill模型专用：创建Y平面曝光剂量热图
 */
function createEnhancedDillYPlaneExposureHeatmap(container, data) {
    // Y平面数据处理 - 使用X和Z坐标
    let xCoords = data.x_coords || data.x;
    let zCoords = data.z_coords || data.z;
    let zData = data.y_plane_exposure;
    
    console.log('Enhanced Dill Y平面曝光剂量热图数据检查:', {
        x_coords_length: xCoords ? xCoords.length : 0,
        z_coords_length: zCoords ? zCoords.length : 0,
        z_data_type: typeof zData,
        z_data_shape: Array.isArray(zData) ? `${zData.length}x${zData[0] ? zData[0].length : 0}` : 'not array',
        data_keys: Object.keys(data)
    });
    
    // 检查数据
    if (!xCoords || !zCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(zCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || zCoords.length === 0 || zData.length === 0) {
        console.error('Enhanced Dill Y平面曝光剂量数据不完整');
        container.innerHTML = '<div style="color:red;padding:20px;">无有效Y平面曝光剂量数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, zCoords);
        
        console.log('Enhanced Dill Y平面曝光剂量热图数据处理完成:', {
            x_range: [Math.min(...xCoords), Math.max(...xCoords)],
            z_range: [Math.min(...zCoords), Math.max(...zCoords)],
            value_range: (() => {
                let min = Infinity, max = -Infinity;
                for (const row of heatmapZ) {
                    for (const val of row) {
                        if (val < min) min = val;
                        if (val > max) max = val;
                    }
                }
                return [min, max];
            })()
        });
        
        const trace = {
            x: xCoords,
            y: zCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Viridis',
            colorbar: { title: '曝光剂量 (mJ/cm²)' },
            hovertemplate: 'X: %{x}<br>Z: %{y}<br>曝光剂量: %{z}<extra></extra>'
        };
        
        // 动态检测X和Z轴的单位
        const xUnit = detectCoordinateUnit(xCoords);
        const zUnit = detectCoordinateUnit(zCoords);
        
        const layout = {
            title: 'Y平面曝光剂量分布 (X-Z截面)',
            xaxis: { title: `X 位置 (${xUnit})` },
            yaxis: { title: `Z 位置 (${zUnit})` },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'exposure', container, eventData);
            }
        });
        
        console.log('Enhanced Dill Y平面曝光剂量热图渲染完成');
    } catch (error) {
        console.error('创建Enhanced Dill Y平面曝光热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建Y平面曝光热图失败: ${error.message}</div>`;
    }
}

/**
 * Enhanced Dill模型专用：创建Y平面厚度热图
 */
function createEnhancedDillYPlaneThicknessHeatmap(container, data) {
    // Y平面数据处理 - 使用X和Z坐标
    let xCoords = data.x_coords || data.x;
    let zCoords = data.z_coords || data.z;
    let zData = data.y_plane_thickness;
    
    console.log('Enhanced Dill Y平面厚度热图数据检查:', {
        x_coords_length: xCoords ? xCoords.length : 0,
        z_coords_length: zCoords ? zCoords.length : 0,
        z_data_type: typeof zData,
        z_data_shape: Array.isArray(zData) ? `${zData.length}x${zData[0] ? zData[0].length : 0}` : 'not array',
        data_keys: Object.keys(data)
    });
    
    // 检查数据
    if (!xCoords || !zCoords || !zData || 
        !Array.isArray(xCoords) || !Array.isArray(zCoords) || !Array.isArray(zData) ||
        xCoords.length === 0 || zCoords.length === 0 || zData.length === 0) {
        console.error('Enhanced Dill Y平面厚度数据不完整');
        container.innerHTML = '<div style="color:red;padding:20px;">无有效Y平面厚度数据，无法绘图</div>';
        return;
    }
    
    // 处理数据格式，使用标准化函数
    try {
        let heatmapZ = standardizeHeatmapData(zData, xCoords, zCoords);
        
        console.log('Enhanced Dill Y平面厚度热图数据处理完成:', {
            x_range: [Math.min(...xCoords), Math.max(...xCoords)],
            z_range: [Math.min(...zCoords), Math.max(...zCoords)],
            value_range: (() => {
                let min = Infinity, max = -Infinity;
                for (const row of heatmapZ) {
                    for (const val of row) {
                        if (val < min) min = val;
                        if (val > max) max = val;
                    }
                }
                return [min, max];
            })()
        });
        
        const trace = {
            x: xCoords,
            y: zCoords,
            z: heatmapZ,
            type: 'heatmap',
            colorscale: 'Plasma',
            colorbar: { title: '相对厚度' },
            hovertemplate: 'X: %{x}<br>Z: %{y}<br>相对厚度: %{z}<extra></extra>'
        };
        
        // 动态检测X和Z轴的单位
        const xUnit = detectCoordinateUnit(xCoords);
        const zUnit = detectCoordinateUnit(zCoords);
        
        const layout = {
            title: 'Y平面形貌分布 (X-Z截面)',
            xaxis: { title: `X 位置 (${xUnit})` },
            yaxis: { title: `Z 位置 (${zUnit})` },
            margin: { l: 60, r: 20, t: 60, b: 60 }
        };
        
        Plotly.newPlot(container, [trace], layout, {responsive: true});
        
        // 添加点击事件处理
        container.on('plotly_click', function(eventData) {
            if(eventData.points.length > 0) {
                const point = eventData.points[0];
                showSinglePointDetailsPopup({ 
                    x: point.x, 
                    y: point.y, 
                    z: point.z 
                }, 'thickness', container, eventData);
            }
        });
        
        console.log('Enhanced Dill Y平面厚度热图渲染完成');
    } catch (error) {
        console.error('创建Enhanced Dill Y平面厚度热图失败:', error);
        container.innerHTML = `<div style="color:red;padding:20px;">创建Y平面厚度热图失败: ${error.message}</div>`;
    }
}

// Make sure LANGS[currentLang].y_position exists or add it
// Example: LANGS.zh.y_position = 'Y 位置 (μm)'; LANGS.en.y_position = 'Y Position (μm)';

/**
 * 应用结果动画
 */
function animateResults() {
    const plotItems = document.querySelectorAll('.plot-item');
    
    plotItems.forEach((item, index) => {
        // 添加动画类
        item.classList.add('fade-in-up');
        item.style.animationDelay = `${0.2 * index}s`;
        
        // 一段时间后移除动画类，以便可以重复触发
        setTimeout(() => {
            item.classList.remove('fade-in-up');
            item.style.animationDelay = '';
        }, 1000);
    });
}

/**
 * 应用页面加载动画
 */
function applyEntryAnimations() {
    // 页面元素淡入
    const header = document.querySelector('header');
    const parametersSection = document.querySelector('.parameters-section');
    const parameterItems = document.querySelectorAll('.parameter-item');
    const calculateBtn = document.getElementById('calculate-btn');
    
    // 头部动画
    header.classList.add('fade-in-down');
    
    // 参数区域动画
    setTimeout(() => {
        parametersSection.classList.add('fade-in');
    }, 200);
    
    // 参数项动画
    parameterItems.forEach((item, index) => {
        setTimeout(() => {
            item.classList.add('fade-in-left');
            
            // 移除动画类
            setTimeout(() => {
                item.classList.remove('fade-in-left');
            }, 1000);
        }, 400 + index * 100);
    });
    
    // 按钮动画
    setTimeout(() => {
        calculateBtn.classList.add('fade-in-up');
        
        // 移除动画类
        setTimeout(() => {
            calculateBtn.classList.remove('fade-in-up');
        }, 1000);
    }, 800); // 调整参数区域动画之后的延迟，确保模型选择区域先动画
}

/**
 * 清空所有图表显示
 */
function clearAllCharts() {
    console.log('清空所有图表显示');
    
    // 隐藏结果区域
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {
        resultsSection.classList.remove('visible');
    }
    
    // 清空交互式图表容器
    const exposurePlotContainer = document.getElementById('exposure-plot-container');
    const thicknessPlotContainer = document.getElementById('thickness-plot-container');
    
    // 使用Plotly.purge更彻底地清除图表资源
    // 🔥 改进：检查是否启用了1D动画或V评估功能，加强判断逻辑
    const is1DAnimationEnabled = document.getElementById('enable_1d_animation_dill')?.checked || false;
    const is1DVEvaluationEnabled = document.getElementById('enable_1d_v_evaluation_dill')?.checked || false;
    // 额外检查：是否正在处理1D相关的计算
    const is1DRelated = document.getElementById('sine_type_single')?.checked || 
                       document.getElementById('sine_type_multiple')?.checked ||
                       document.querySelector('input[name="sine_type"]:checked')?.value === 'single';
    const shouldKeepStaticCharts = is1DAnimationEnabled || is1DVEvaluationEnabled || is1DRelated;
    
    if (exposurePlotContainer) {
        if (typeof Plotly !== 'undefined' && Plotly.purge && exposurePlotContainer._fullLayout) {
            try {
                Plotly.purge(exposurePlotContainer);
            } catch (e) {
                console.warn('清除曝光图表失败:', e);
            }
        }
        exposurePlotContainer.innerHTML = '';
        // 如果启用了1D动画或V评估，保持容器显示，否则隐藏
        exposurePlotContainer.style.display = shouldKeepStaticCharts ? 'block' : 'none';
    }
    
    if (thicknessPlotContainer) {
        if (typeof Plotly !== 'undefined' && Plotly.purge && thicknessPlotContainer._fullLayout) {
            try {
                Plotly.purge(thicknessPlotContainer);
            } catch (e) {
                console.warn('清除厚度图表失败:', e);
            }
        }
        thicknessPlotContainer.innerHTML = '';
        // 如果启用了1D动画或V评估，保持容器显示，否则隐藏
        thicknessPlotContainer.style.display = shouldKeepStaticCharts ? 'block' : 'none';
    }
    
    // 隐藏静态图像
    const exposurePlot = document.getElementById('exposure-plot');
    const thicknessPlot = document.getElementById('thickness-plot');
    
    if (exposurePlot) {
        exposurePlot.style.display = 'none';
        exposurePlot.src = '';
    }
    
    if (thicknessPlot) {
        thicknessPlot.style.display = 'none';
        thicknessPlot.src = '';
    }
    
    // 清除CAR模型特有的图表容器
    const carInteractivePlotsContainer = document.getElementById('car-interactive-plots');
    if (carInteractivePlotsContainer) {
        // 尝试调用CAR模型的resetCarPlots函数（如果存在）
        if (typeof resetCarPlots === 'function') {
            try {
                resetCarPlots();
            } catch (e) {
                console.warn('重置CAR图表失败:', e);
            }
        }
        
        // 简单清空容器
        carInteractivePlotsContainer.innerHTML = '';
        carInteractivePlotsContainer.style.display = 'none';
    }
    
    // 隐藏阈值控制
    const thresholdContainers = document.querySelectorAll('.threshold-container');
    thresholdContainers.forEach(container => {
        container.style.display = 'none';
    });
    
    // 隐藏XY平面热力图容器
    const exposureXyPlotItem = document.getElementById('exposure-xy-plot-item');
    const thicknessXyPlotItem = document.getElementById('thickness-xy-plot-item');
    if (exposureXyPlotItem) exposureXyPlotItem.style.display = 'none';
    if (thicknessXyPlotItem) thicknessXyPlotItem.style.display = 'none';
    
    // 隐藏增强DILL模型的额外X和Y平面图表
    const enhancedDillExtraPlots = [
        'enhanced-dill-x-plane-exposure-item',
        'enhanced-dill-x-plane-thickness-item',
        'enhanced-dill-y-plane-exposure-item',
        'enhanced-dill-y-plane-thickness-item'
    ];
    
    enhancedDillExtraPlots.forEach(itemId => {
        const item = document.getElementById(itemId);
        if (item) {
            item.style.display = 'none';
        }
    });
    
    // 清空XY平面热力图内容
    const exposureXyContainer = document.getElementById('exposure-xy-plot-container');
    const thicknessXyContainer = document.getElementById('thickness-xy-plot-container');
    if (exposureXyContainer) {
        if (typeof Plotly !== 'undefined' && Plotly.purge && exposureXyContainer._fullLayout) {
            try {
                Plotly.purge(exposureXyContainer);
            } catch (e) {
                console.warn('清除XY平面曝光图表失败:', e);
            }
        }
        exposureXyContainer.innerHTML = '';
    }
    if (thicknessXyContainer) {
        if (typeof Plotly !== 'undefined' && Plotly.purge && thicknessXyContainer._fullLayout) {
            try {
                Plotly.purge(thicknessXyContainer);
            } catch (e) {
                console.warn('清除XY平面厚度图表失败:', e);
            }
        }
        thicknessXyContainer.innerHTML = '';
    }
    
    // 清空增强DILL模型的额外X和Y平面图表容器
    const enhancedDillExtraContainers = [
        'enhanced-dill-x-plane-exposure-container',
        'enhanced-dill-x-plane-thickness-container',
        'enhanced-dill-y-plane-exposure-container',
        'enhanced-dill-y-plane-thickness-container'
    ];
    
    enhancedDillExtraContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            if (typeof Plotly !== 'undefined' && Plotly.purge && container._fullLayout) {
                try {
                    Plotly.purge(container);
                } catch (e) {
                    console.warn(`清除${containerId}图表失败:`, e);
                }
            }
            container.innerHTML = '';
        }
    });
    
    console.log('图表已清空，等待用户重新生成');
}

/**
 * 显示单一计算页面的点详细信息弹窗
 * @param {Object} point - 点击的点数据
 * @param {string} plotType - 图表类型 ('exposure' 或 'thickness')
 * @param {HTMLElement} container - 图表容器
 * @param {Object} eventData - 完整的事件数据
 */
function showSinglePointDetailsPopup(point, plotType, container, eventData) {
    removeSinglePointDetailsPopup();
    const params = getParameterValues();
    const pointInfo = getSinglePointDetailedInfo(point, plotType, params);

    // 使用新的可拖拽缩放弹窗组件，默认显示在屏幕中央
    window.showDraggablePopup('📊 点详细信息', pointInfo.html);
}

function removeSinglePointDetailsPopup() {
    // 使用新的可拖拽缩放弹窗组件的移除函数
    window.removeDraggablePopup();
}

// 将函数设为全局可访问
window.clearAllCharts = clearAllCharts;
window.removeSinglePointDetailsPopup = removeSinglePointDetailsPopup;

// Dill模型三维正弦分布预览绘图函数 (从bindPhiExprUI提取并重命名)
function dillDraw3DPreviewPlot(scrollToPlot = false, t = 0) {
    const input = document.getElementById('phi_expr_3d');
    const kxInput = document.getElementById('Kx_3d');
    const kyInput = document.getElementById('Ky_3d');
    const kzInput = document.getElementById('Kz_3d');
    const vInput = document.getElementById('V'); // Assuming 'V' is the ID for Dill model's V
    const plot = document.getElementById('phi-expr-3d-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');
    const controlsElement = document.getElementById('phi-expr-3d-preview-controls');
    const tSlider = document.getElementById('phi-expr-3d-t-slider');
    const tValueDisplay = controlsElement?.querySelector('.t-value');

    const xMinInput = document.getElementById('x_min_3d');
    const xMaxInput = document.getElementById('x_max_3d');
    const yMinInput = document.getElementById('y_min_3d');
    const yMaxInput = document.getElementById('y_max_3d');
    const zMinInput = document.getElementById('z_min_3d');
    const zMaxInput = document.getElementById('z_max_3d');
    const yPointsInput = document.getElementById('y_points');

    if (!input || !plot || !xMinInput || !xMaxInput || !yMinInput || !yMaxInput || !zMinInput || !zMaxInput) return;

    let Kx = 2, Ky = 1, Kz = 1, V_val = 0.8; // Default V_val
    if (kxInput) Kx = parseFloat(kxInput.value);
    if (kyInput) Ky = parseFloat(kyInput.value);
    if (kzInput) Kz = parseFloat(kzInput.value);
    if (vInput) V_val = parseFloat(vInput.value);

    const xRange = [parseFloat(xMinInput.value) || 0, parseFloat(xMaxInput.value) || 10];
    const yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
    const zRange = [parseFloat(zMinInput.value) || 0, parseFloat(zMaxInput.value) || 10];
    const yPoints = yPointsInput ? parseInt(yPointsInput.value) || 20 : 20;
    const expr = input.value;

    if (!validatePhaseExpr(expr)) {
        if (errDiv) { 
            errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview || '表达式格式有误，无法预览。'; 
            errDiv.style.display = 'block'; 
        }
        return;
    }
     if (errDiv) {
        errDiv.textContent = ''; 
        errDiv.style.display = 'none'; 
    }

    const plotData = generate3DSine(Kx, Ky, Kz, V_val, expr, xRange, yRange, zRange, yPoints, 20, t);
    plot.style.display = 'block';
    
    // 显示t值控制面板
    if (controlsElement && plot.style.display !== 'none') {
        controlsElement.style.display = 'block';
        if (tSlider && tValueDisplay) {
            tSlider.value = t;
            tValueDisplay.textContent = t.toFixed(2);
        }
    }
    
    const data = [{
        type: 'isosurface',
        x: plotData.x,
        y: plotData.y,
        z: plotData.z,
        value: plotData.values,
        isomin: 0.5,
        isomax: 1.5,
        surface: { show: true, count: 3, fill: 0.7 },
        colorscale: 'Viridis',
        caps: { x: { show: false }, y: { show: false }, z: { show: false } }
    }];
    
    Plotly.newPlot(plot, data, {
        title: `Dill 三维正弦分布预览 (t=${t.toFixed(2)})`,
        scene: {
            xaxis: {title: 'X'},
            yaxis: {title: 'Y'},
            zaxis: {title: 'Z'}
        },
        margin: {t:40, l:0, r:0, b:0},
        height: 350
    }, {displayModeBar: true});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

// 绑定phi_expr输入区说明、校验、预览功能
function bindPhiExprUI() {
    // 二维正弦波参数配置
    const configs = [
        // Dill模型二维配置 - 使用新的dillDrawPreviewPlot
        {
            input: 'phi_expr', 
            kx: 'Kx', 
            ky: 'Ky', 
            v: 'V', 
            btn: 'phi-expr-preview-btn', 
            plotElementId: 'phi-expr-preview-plot', 
            drawFunc: dillDrawPreviewPlot,
            controlsId: 'phi-expr-preview-controls',
            tSlider: 'phi-expr-t-slider',
            playBtn: 'phi-expr-play-btn',
            stopBtn: 'phi-expr-stop-btn'
        },
        // Enhanced Dill模型二维配置 - 使用enhancedDrawPreviewPlot
        {
            input: 'enhanced_phi_expr', 
            kx: 'enhanced_Kx', 
            ky: 'enhanced_Ky', 
            v: 'I0', 
            btn: 'enhanced-phi-expr-preview-btn', 
            plotElementId: 'enhanced-phi-expr-preview-plot', 
            drawFunc: enhancedDrawPreviewPlot,
            controlsId: 'enhanced-phi-expr-preview-controls',
            tSlider: 'enhanced-phi-expr-t-slider',
            playBtn: 'enhanced-phi-expr-play-btn',
            stopBtn: 'enhanced-phi-expr-stop-btn'
        }, 
        // CAR模型二维配置 - 使用carDrawPreviewPlot
        {
            input: 'car_phi_expr', 
            kx: 'car_Kx', 
            ky: 'car_Ky', 
            v: 'car_V', 
            btn: 'car-phi-expr-preview-btn', 
            plotElementId: 'car-phi-expr-preview-plot', 
            drawFunc: carDrawPreviewPlot,
            controlsId: 'car-phi-expr-preview-controls',
            tSlider: 'car-phi-expr-t-slider',
            playBtn: 'car-phi-expr-play-btn',
            stopBtn: 'car-phi-expr-stop-btn'
        }
    ];
    
    // 三维正弦波参数配置
    const configs3D = [
        // Dill模型三维配置 - 使用新的dillDraw3DPreviewPlot
        {
            input: 'phi_expr_3d', 
            kx: 'Kx_3d', 
            ky: 'Ky_3d', 
            kz: 'Kz_3d', 
            v: 'V', 
            btn: 'phi-expr-3d-preview-btn', 
            plotElementId: 'phi-expr-3d-preview-plot', 
            xmin: 'x_min_3d', 
            xmax: 'x_max_3d', 
            ymin: 'y_min_3d', 
            ymax: 'y_max_3d', 
            zmin: 'z_min_3d', 
            zmax: 'z_max_3d', 
            drawFunc: dillDraw3DPreviewPlot,
            controlsId: 'phi-expr-3d-preview-controls',
            tSlider: 'phi-expr-3d-t-slider',
            playBtn: 'phi-expr-3d-play-btn',
            stopBtn: 'phi-expr-3d-stop-btn'
        },
        // Enhanced Dill模型三维配置 - 使用enhancedDraw3DPreviewPlot
        {
            input: 'enhanced_phi_expr_3d', 
            kx: 'enhanced_Kx_3d', 
            ky: 'enhanced_Ky_3d', 
            kz: 'enhanced_Kz_3d', 
            v: 'I0', 
            btn: 'enhanced-phi-expr-3d-preview-btn', 
            plotElementId: 'enhanced-phi-expr-3d-preview-plot',
            xmin: 'enhanced_x_min_3d', 
            xmax: 'enhanced_x_max_3d', 
            ymin: 'enhanced_y_min_3d', 
            ymax: 'enhanced_y_max_3d', 
            zmin: 'enhanced_z_min_3d', 
            zmax: 'enhanced_z_max_3d', 
            drawFunc: enhancedDraw3DPreviewPlot,
            controlsId: 'enhanced-phi-expr-3d-preview-controls',
            tSlider: 'enhanced-phi-expr-3d-t-slider',
            playBtn: 'enhanced-phi-expr-3d-play-btn',
            stopBtn: 'enhanced-phi-expr-3d-stop-btn'
        }, 
        // CAR模型三维配置 - 使用carDraw3DPreviewPlot
        {
            input: 'car_phi_expr_3d', 
            kx: 'car_Kx_3d', 
            ky: 'car_Ky_3d', 
            kz: 'car_Kz_3d', 
            v: 'car_V', 
            btn: 'car-phi-expr-3d-preview-btn', 
            plotElementId: 'car-phi-expr-3d-preview-plot',
            xmin: 'car_x_min_3d', 
            xmax: 'car_x_max_3d', 
            ymin: 'car_y_min_3d', 
            ymax: 'car_y_max_3d', 
            zmin: 'car_z_min_3d', 
            zmax: 'car_z_max_3d', 
            drawFunc: carDraw3DPreviewPlot,
            controlsId: 'car-phi-expr-3d-preview-controls',
            tSlider: 'car-phi-expr-3d-t-slider',
            playBtn: 'car-phi-expr-3d-play-btn',
            stopBtn: 'car-phi-expr-3d-stop-btn'
        }
    ];
    
    // 存储动画间隔ID
    const animationIntervals = {};
    
    // 统一处理预览逻辑
    function setupPreview(config, is3D) {
        const input = document.getElementById(config.input);
        const btn = document.getElementById(config.btn);
        const plotElement = document.getElementById(config.plotElementId); // 使用 plotElementId
        const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');
        const calcBtn = document.getElementById('calculate-btn');
        
        // 获取t值控制元素
        const controlsElement = document.getElementById(config.controlsId);
        const tSlider = document.getElementById(config.tSlider);
        const tValueDisplay = controlsElement?.querySelector('.t-value');
        const playBtn = document.getElementById(config.playBtn);
        const stopBtn = document.getElementById(config.stopBtn);

        if (!input || !btn || !plotElement) return;

        // 实时校验
        input.addEventListener('input', function() {
            const expr = input.value;
            const isValid = validatePhaseExpr(expr);
            if (!isValid) {
                input.style.borderColor = '#d00'; // Consider using class for styling
                if (errDiv) { 
                    errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_validation || '表达式格式有误。'; 
                    errDiv.style.display = 'block'; 
                }
                calcBtn.disabled = true;
                btn.disabled = true; // Disable preview button if expression is invalid
            } else {
                input.style.borderColor = ''; // Reset border
                if (errDiv) { 
                    errDiv.textContent = ''; 
                    errDiv.style.display = 'none'; 
                }
                calcBtn.disabled = false;
                btn.disabled = false; // Enable preview button
            }
        });
        
        btn.style.display = 'block'; // Make button visible
        let isPreviewShown = false;

        function updateBtnText() {
            const langKeyShown = is3D ? 'btn_collapse_3d_preview' : 'btn_collapse_2d_preview';
            const langKeyHidden = is3D ? 'btn_preview_3d_distribution' : 'btn_preview_2d_distribution';
            const defaultTextShown = is3D ? '收起3D分布' : '收起分布';
            const defaultTextHidden = is3D ? '预览3D分布' : '预览分布';
            const text = isPreviewShown ? (LANGS[currentLang]?.[langKeyShown] || defaultTextShown) : (LANGS[currentLang]?.[langKeyHidden] || defaultTextHidden);
            btn.innerHTML = `<span class="preview-icon"></span> ${text}`;
        }
        updateBtnText(); // Initial button text

        // 绘制图表的包装函数，接收t值参数
        function drawPlotWithT(t, scrollToPlot = false) {
            if (!validatePhaseExpr(input.value)) return;
            
            // 传递t参数给绘图函数
            config.drawFunc(scrollToPlot, t);
        }

        // 点击预览按钮
        btn.addEventListener('click', function() {
            if (validatePhaseExpr(input.value)) { // Only proceed if expression is valid
                isPreviewShown = !isPreviewShown;
                if (isPreviewShown) {
                    drawPlotWithT(0, true); // 初始t=0，滚动到图表位置
                } else {
                    plotElement.style.display = 'none'; // Hide plot
                    if (controlsElement) controlsElement.style.display = 'none'; // 隐藏控制面板
                    if (Plotly.purge) Plotly.purge(plotElement); // Clear plot to free resources
                    
                    // 停止动画
                    if (animationIntervals[config.plotElementId]) {
                        clearInterval(animationIntervals[config.plotElementId]);
                        animationIntervals[config.plotElementId] = null;
                        
                        // 重置按钮状态
                        if (playBtn && stopBtn) {
                            playBtn.style.display = 'block';
                            stopBtn.style.display = 'none';
                        }
                    }
                }
                updateBtnText();
            } else {
                 if (errDiv) { 
                    errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview_click || '无法预览无效表达式。'; 
                    errDiv.style.display = 'block'; 
                }
            }
        });

        // 如果有t值滑块，添加事件监听
        if (tSlider && tValueDisplay) {
            tSlider.addEventListener('input', function() {
                const t = parseFloat(this.value);
                tValueDisplay.textContent = t.toFixed(2);
                if (isPreviewShown) {
                    drawPlotWithT(t, false);
                }
            });
        }
        
        // 播放/停止动画按钮
        if (playBtn && stopBtn) {
            // 播放动画
            playBtn.addEventListener('click', function() {
                if (animationIntervals[config.plotElementId]) {
                    clearInterval(animationIntervals[config.plotElementId]);
                }
                
                let t = parseFloat(tSlider.value);
                const step = 0.05;
                
                // 根据是否是3D调整动画间隔
                const animationInterval = is3D ? 150 : 50; // 3D动画间隔150ms，2D动画间隔50ms
                
                animationIntervals[config.plotElementId] = setInterval(() => {
                    t += step;
                    if (t > 6.28) t = 0;
                    
                    tSlider.value = t;
                    tValueDisplay.textContent = t.toFixed(2);
                    drawPlotWithT(t, false);
                }, animationInterval);
                
                playBtn.style.display = 'none';
                stopBtn.style.display = 'block';
            });
            
            // 停止动画
            stopBtn.addEventListener('click', function() {
                if (animationIntervals[config.plotElementId]) {
                    clearInterval(animationIntervals[config.plotElementId]);
                    animationIntervals[config.plotElementId] = null;
                }
                
                playBtn.style.display = 'block';
                stopBtn.style.display = 'none';
            });
        }

        // Auto-refresh on parameter change if preview is shown
        const paramInputs = [input];
        if (config.kx) paramInputs.push(document.getElementById(config.kx));
        if (config.ky) paramInputs.push(document.getElementById(config.ky));
        if (config.kz) paramInputs.push(document.getElementById(config.kz));
        if (config.v) paramInputs.push(document.getElementById(config.v));
        if (is3D) {
            ['xmin', 'xmax', 'ymin', 'ymax', 'zmin', 'zmax'].forEach(p => {
                if (config[p]) paramInputs.push(document.getElementById(config[p]));
            });
        }

        paramInputs.forEach(pInput => {
            if (pInput) {
                pInput.addEventListener('input', () => { // Use 'input' for immediate feedback
                    if (isPreviewShown && validatePhaseExpr(input.value)) {
                        // 获取当前的t值（如果有滑块的话）
                        let currentT = 0;
                        if (tSlider) {
                            currentT = parseFloat(tSlider.value) || 0;
                        }
                        config.drawFunc(false, currentT); // No scroll on auto-refresh, use current t value
                    }
                });
            }
        });
    }

    configs.forEach(cfg => setupPreview(cfg, false));
    configs3D.forEach(cfg => setupPreview(cfg, true));
}

function highlightErrorCard(msg) {
    // 先移除所有高亮
    document.querySelectorAll('.parameter-item.error').forEach(e=>e.classList.remove('error'));
    // 简单关键词判断
    if (/phi|表达式|expr|格式|sin|cos|pi|t/.test(msg)) {
        let el = document.getElementById('phi_expr');
        if (el) el.closest('.parameter-item').classList.add('error');
    }
    if (/Kx|空间频率x/.test(msg)) {
        let el = document.getElementById('Kx');
        if (el) el.closest('.parameter-item').classList.add('error');
    }
    if (/Ky|空间频率y/.test(msg)) {
        let el = document.getElementById('Ky');
        if (el) el.closest('.parameter-item').classList.add('error');
    }
    if (/V|可见度|对比度/.test(msg)) {
        let el = document.getElementById('V');
        if (el) el.closest('.parameter-item').classList.add('error');
    }
    if (/C|速率常数/.test(msg)) {
        let el = document.getElementById('C');
        if (el) el.closest('.parameter-item').classList.add('error');
    }
    if (/t_exp|曝光时间/.test(msg)) {
        let el = document.getElementById('t_exp');
        if (el) el.closest('.parameter-item').classList.add('error');
    }
    // 其它参数可按需扩展
    // 3秒后自动移除高亮
    setTimeout(()=>{
        document.querySelectorAll('.parameter-item.error').forEach(e=>e.classList.remove('error'));
    }, 3000);
}

// 为2D曝光图案生成弹窗HTML的辅助函数
function get2DExposurePatternPopupHtmlContent(point, setName, params, plotType) {
    let valueLabel = '';
    let valueUnit = '';
    let formulaTitle = '';
    let formulaMath = '';
    let formulaExplanation = '';
    let additionalInfo = '';

    // 🔧 修复Y坐标为0的bug：从point对象中提取坐标和数据值
    const x = point.x;
    const y = point.y;
    
    // 直接从point对象中获取实际的2D坐标信息
    // 🔧 修复：使用严格的undefined检查而不是逻辑或，避免0值被误判为false
    let actualX = (point.actual_x !== undefined) ? point.actual_x : (point.x || 0);
    let actualY = (point.actual_y !== undefined) ? point.actual_y : (point.y || 0);
    let zValue = (point.z !== undefined) ? point.z : (point.y || y);
    
    // 🔧 调试信息：记录坐标值以帮助调试，特别关注厚度为0的情况
    console.log('🔧 2D曝光图案弹窗坐标调试:', {
        'point对象': point,
        '输入x': x,
        '输入y': y,
        'point.actual_x': point.actual_x,
        'point.actual_y': point.actual_y,
        '最终actualX': actualX,
        '最终actualY': actualY,
        '最终zValue': zValue,
        'plotType': plotType,
        '是否厚度为0': zValue === 0 || y === 0,
        'undefined检查': {
            'actual_x是否undefined': point.actual_x === undefined,
            'actual_y是否undefined': point.actual_y === undefined,
            'actual_y === 0': point.actual_y === 0
        }
    });

    // 获取2D曝光图案的参数
    const lastData = window.lastPlotData || {};
    const exposureTime = lastData.exposure_time || params.t_exp || 100;
    const C = lastData.parameters?.C || params.C || 0.022;
    const angle_a_deg = lastData.parameters?.angle_a_deg || params.angle_a || 11.7;
    const contrast_ctr = lastData.parameters?.contrast_ctr || params.contrast_ctr || 0.9;
    const wavelength_nm = lastData.parameters?.wavelength_nm || params.wavelength || 405;
    const threshold_cd = lastData.parameters?.threshold_cd || params.exposure_threshold || 25;
    
    // 🔧 检查当前的四种情况状态（需要提前声明以供后续使用）
    const intensityMethodSelect = document.getElementById('intensity_input_method');
    const exposureMethodSelect = document.getElementById('exposure_calculation_method');
    const isUsingCustomVector = intensityMethodSelect && intensityMethodSelect.value === 'custom';
    const isUsingMultiSegment = exposureMethodSelect && exposureMethodSelect.value === 'cumulative';
    const isUsingCustomData = isUsingCustomVector && customIntensityData.loaded;
    
    // 🔧 获取I_avg参数：优先使用自动计算值，否则使用用户输入值
    let I_avg = params.I_avg || 0.5;
    let I_avg_display = I_avg;
    
    // 如果是自定义向量模式且有自动计算的I_avg，使用自动计算值
    if (isUsingCustomData && customIntensityData.auto_calculated_I_avg !== null) {
        I_avg_display = customIntensityData.auto_calculated_I_avg;
        console.log(`🔢 使用自动计算的 I_avg: ${I_avg_display} (原始输入值: ${I_avg})`);
    }
    
    // 检查曝光计算模式
    const exposureCalculationMethod = lastData.exposure_calculation_method || params.exposure_calculation_method || 'standard';
    const segmentCount = lastData.segment_count || params.segment_count || 5;
    const segmentDuration = lastData.segment_duration || params.segment_duration || 1;
    const segmentIntensities = lastData.segment_intensities || params.segment_intensities || [];
    
    // 🔧 确定当前是4种情况中的哪一种
    const currentScenario = (() => {
        if (!isUsingCustomVector && !isUsingMultiSegment) return 1; // 基础情况：都不开启
        if (isUsingCustomVector && !isUsingMultiSegment) return 2;  // 开启自定义向量，不开启多段曝光
        if (!isUsingCustomVector && isUsingMultiSegment) return 3;  // 不开启自定义向量，开启多段曝光
        if (isUsingCustomVector && isUsingMultiSegment) return 4;   // 都开启
        return 1; // 默认
    })();
    
    // 🔧 根据情况确定哪些参数是默认值或自动计算的
    // 四种情况说明：
    // 1. 基础情况：公式计算 + 标准模式 - 所有参数都正常使用
    // 2. 自定义向量：自定义向量 + 标准模式 - 波长、周期、对比度变成默认值，I_avg自动计算
    // 3. 多段曝光：公式计算 + 多段累积模式 - 曝光时间t_exp由多段累积计算
    // 4. 混合模式：自定义向量 + 多段累积模式 - 物理参数默认值 + I_avg自动计算 + 时间累积计算
    const defaultCalculatedParams = [];
    const autoCalculatedParams = [];
    
    switch (currentScenario) {
        case 1: // 基础情况：所有参数都正常计算，无默认计算
            break;
        case 2: // 开启自定义向量
            // 物理参数变成默认值，I_avg自动从数据计算
            defaultCalculatedParams.push('wavelength', 'angle_a', 'contrast_ctr');
            autoCalculatedParams.push('I_avg');
            break;
        case 3: // 开启多段曝光
            autoCalculatedParams.push('t_exp'); // 曝光时间由多段累积计算
            break;
        case 4: // 都开启
            // 混合模式：物理参数默认值 + I_avg自动计算 + 时间累积计算
            defaultCalculatedParams.push('wavelength', 'angle_a', 'contrast_ctr');
            autoCalculatedParams.push('I_avg', 't_exp');
            break;
    }

    // 计算空间频率
    const angle_a_rad = angle_a_deg * Math.PI / 180;
    const spatial_freq = 4 * Math.PI * Math.sin(angle_a_rad) / wavelength_nm; // rad/nm

    if (plotType === 'exposure') {
        valueLabel = '曝光计量分布:';
        valueUnit = '(归一化单位)';
        formulaTitle = '2D DILL模型 - 曝光计量分布计算：';
        formulaMath = `D<sub>0</sub>(x,y) = I_avg × [1 + ctr × cos((4π × sin(a) / λ) × x)] × t<sub>exp</sub><br>D(x,y) = D<sub>0</sub>(x,y) + D<sub>0</sub>(y,x)<br>其中 I_avg = ${I_avg_display}`;

        // 计算当前点的理论值
        const D0_x = I_avg_display * (1 + contrast_ctr * Math.cos(spatial_freq * actualX * 1000)) * exposureTime; // x转换为nm  🔧 修复：使用显示值
        const D0_y = I_avg_display * (1 + contrast_ctr * Math.cos(spatial_freq * actualY * 1000)) * exposureTime; // y转换为nm  🔧 修复：使用显示值  
        const D_total = D0_x + D0_y;

        // 确定具体的模式组合描述
        const modeDescription = (() => {
            const intensityMode = isUsingCustomData ? '自定义向量' : '公式计算';
            const exposureMode = exposureCalculationMethod === 'cumulative' ? '累积模式' : '标准模式';
            return `${intensityMode} + ${exposureMode}`;
        })();
        
        formulaExplanation = `
            <div>🔬 <strong>2D曝光图案参数：</strong></div>
            <div>• <strong>模式组合: ${modeDescription}</strong></div>
            ${exposureCalculationMethod === 'cumulative' ? `
            <div>• 曝光计算: 多段累积 (${segmentCount}段)</div>
            <div>• 单段时间: ${segmentDuration}s，总时间: ${exposureTime}s</div>
            <div>• 强度序列: [${segmentIntensities.slice(0,5).map(v => v.toFixed(1)).join(', ')}${segmentIntensities.length > 5 ? '...' : ''}]%</div>
            ` : `
            <div>• 曝光计算: 标准模式</div>
            <div>• 曝光时间 t<sub>exp</sub>: ${exposureTime}s</div>
            `}
            ${isUsingCustomData ? `
            <div>• 光强输入: 自定义向量数据 (${customIntensityData.x ? customIntensityData.x.length : 0}点)</div>
            ` : `
            <div>• 光强输入: 公式计算模式</div>
            `}
            <div>• 周期 a: ${angle_a_deg}°</div>
            <div>• 对比度 ctr: ${contrast_ctr}</div>
            <div>• 光波长 λ: ${wavelength_nm} nm</div>
            <div>• 空间频率: 4π×sin(a)/λ = ${spatial_freq.toFixed(6)} rad/nm</div>
            <div class="formula-separator"></div>
            <div>📍 <strong>当前位置计算：</strong></div>
            <div>• 点击位置: (${actualX.toFixed(3)}, ${actualY.toFixed(3)}) mm</div>
            <div>• D<sub>0</sub>(x方向): ${D0_x.toFixed(6)}</div>
            <div>• D<sub>0</sub>(y方向): ${D0_y.toFixed(6)}</div>
            <div>• 总计量 D(x,y): ${D_total.toFixed(6)}</div>
            <div>• 显示值: ${zValue.toFixed(6)}</div>
            <div class="formula-separator"></div>
            <div>💡 <strong>计算说明：</strong></div>
            <div>• x和y方向分别计算曝光计量后相加</div>
            <div>• 产生复杂的2D干涉图案</div>
            ${exposureCalculationMethod === 'cumulative' ? `
            <div>• 累积模式：D(x,y) = Σ[D<sub>0,i</sub>(x,y) × intensity<sub>i</sub>% × t<sub>segment</sub>]</div>
            <div>• 多段累积效应：不同强度段依次叠加</div>
            <div>• 模拟真实曝光过程的时变特性</div>
            ` : `
            <div>• 基于理想光刻胶曝光模型</div>
            <div>• 单一曝光时间的标准计算</div>
            `}
            ${isUsingCustomData ? `
            <div>• 自定义向量：基于用户上传的光强分布数据</div>
            <div>• 数据范围: X ∈ [${customIntensityData.x ? Math.min(...customIntensityData.x).toFixed(3) : 'N/A'}, ${customIntensityData.x ? Math.max(...customIntensityData.x).toFixed(3) : 'N/A'}] mm</div>
            <div>• 插值计算: 线性插值到计算网格 [-1, 1] mm</div>
            <div>• ⚠️ 十字架效应: 当自定义范围 < 计算范围时出现</div>
            <div>• 边界处理: 范围外区域补零，产生十字架图案</div>
            ` : `
            <div>• 公式计算: 基于余弦空间调制函数</div>
            <div>• 空间分布: 1 + ctr×cos(4π×sin(a)/λ×x)</div>
            `}
        `;
    } else if (plotType === 'thickness') {
        valueLabel = '形貌分布:';
        valueUnit = '(归一化)';
        formulaTitle = '2D DILL模型 - 形貌分布计算：';
        formulaMath = 'M(x,y) = e<sup>-C × D(x,y)</sup> (当 D(x,y) ≥ c<sub>d</sub>)<br>' +
                     'H(x,y) = 1 - M(x,y)<br>' +
                     '其中 D(x,y) = D<sub>0</sub>(x,y) + D<sub>0</sub>(y,x)';

        // 计算当前点的理论厚度
        const D0_x = I_avg_display * (1 + contrast_ctr * Math.cos(spatial_freq * actualX * 1000)) * exposureTime;  // 🔧 修复：使用显示值
        const D0_y = I_avg_display * (1 + contrast_ctr * Math.cos(spatial_freq * actualY * 1000)) * exposureTime;  // 🔧 修复：使用显示值
        const D_total = D0_x + D0_y;
        
        let M_value, H_value;
        let exposureStatus = '';
        
        if (D_total < threshold_cd) {
            M_value = 1.0;
            H_value = 0.0;
            exposureStatus = '曝光不足，抗蚀剂未反应';
        } else {
            M_value = Math.exp(-C * D_total);
            H_value = 1 - M_value;
            exposureStatus = '曝光充分，抗蚀剂发生反应';
        }

        // 确定具体的模式组合描述
        const modeDescription = (() => {
            const intensityMode = isUsingCustomData ? '自定义向量' : '公式计算';
            const exposureMode = exposureCalculationMethod === 'cumulative' ? '累积模式' : '标准模式';
            return `${intensityMode} + ${exposureMode}`;
        })();
        
        formulaExplanation = `
            <div>🔬 <strong>2D光刻胶厚度参数：</strong></div>
            <div>• <strong>模式组合: ${modeDescription}</strong></div>
            <div>• DILL常数 C: ${C}</div>
            <div>• 阈值 c<sub>d</sub>: ${threshold_cd}</div>
            ${exposureCalculationMethod === 'cumulative' ? `
            <div>• 曝光计算: 多段累积 (${segmentCount}段)</div>
            <div>• 单段时间: ${segmentDuration}s，总时间: ${exposureTime}s</div>
            <div>• 强度序列: [${segmentIntensities.slice(0,5).map(v => v.toFixed(1)).join(', ')}${segmentIntensities.length > 5 ? '...' : ''}]%</div>
            ` : `
            <div>• 曝光计算: 标准模式</div>
            <div>• 曝光时间: ${exposureTime}s</div>
            `}
            ${isUsingCustomData ? `
            <div>• 光强输入: 自定义向量数据 (${customIntensityData.x ? customIntensityData.x.length : 0}点)</div>
            <div>• 数据范围: X ∈ [${customIntensityData.x ? Math.min(...customIntensityData.x).toFixed(3) : 'N/A'}, ${customIntensityData.x ? Math.max(...customIntensityData.x).toFixed(3) : 'N/A'}] mm</div>
            <div>• 插值计算: 线性插值到计算网格 [-1, 1] mm</div>
            <div>• ⚠️ 十字架效应: 当自定义范围 < 计算范围时出现</div>
            ` : `
            <div>• 光强输入: 公式计算模式</div>
            <div>• 余弦调制: 1 + ctr×cos(4π×sin(a)/λ×x)</div>
            `}
            <div>• 对比度: ${contrast_ctr}</div>
            <div class="formula-separator"></div>
            <div>📍 <strong>当前位置计算：</strong></div>
            <div>• 点击位置: (${actualX.toFixed(3)}, ${actualY.toFixed(3)}) mm</div>
            <div>• 总曝光计量 D(x,y): ${D_total.toFixed(6)}</div>
            <div>• 阈值比较: D(x,y) ${D_total >= threshold_cd ? '≥' : '<'} c<sub>d</sub></div>
            <div>• M值: ${M_value.toFixed(6)}</div>
            <div>• H值（厚度）: ${H_value.toFixed(6)}</div>
            <div>• 显示值: ${zValue.toFixed(6)}</div>
            <div>• 曝光状态: ${exposureStatus}</div>
            <div class="formula-separator"></div>
            <div>💡 <strong>物理意义：</strong></div>
            <div>• M值：剩余抗蚀剂浓度</div>
            <div>• H值：相对蚀刻深度</div>
            <div>• 阈值以下：抗蚀剂完整保留</div>
            <div>• 阈值以上：抗蚀剂指数衰减</div>
            ${exposureCalculationMethod === 'cumulative' ? `
            <div>• 累积模式：M(x,y) = exp(-C × D<sub>累积</sub>(x,y))</div>
            <div>• 多段叠加：D<sub>累积</sub> = Σ[D<sub>i</sub>(x,y) × intensity<sub>i</sub>% × t<sub>segment</sub>]</div>
            <div>• 厚度变化：H(x,y) = 1 - M(x,y)</div>
            ` : `
            <div>• 标准模式：基于单一曝光时间计算</div>
            `}
            ${isUsingCustomData ? `
            <div>• 自定义向量：基于用户光强分布的厚度计算</div>
            <div>• 十字架图案：自定义数据范围外补零产生</div>
            <div>• 物理含义：局部光强分布引起的差异化蚀刻</div>
            ` : `
            <div>• 公式计算：基于理想干涉条纹分布</div>
            `}
        `;
    }

    // 添加通用的2D数据样式
    additionalInfo = `
        <style>
            .formula-separator {
                height: 1px;
                background-color: #dee2e6;
                margin: 8px 0;
            }
            .point-info-section {
                margin: 12px 0;
                padding: 10px;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                background-color: #f8f9fa;
            }
            .point-info-section h4 {
                margin: 0 0 8px 0;
                color: #495057;
                font-size: 14px;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            .info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 0;
            }
            .info-label {
                font-weight: bold;
                color: #495057;
                font-size: 12px;
            }
            .info-value {
                color: #007bff;
                font-family: monospace;
                font-size: 12px;
            }
            .formula-container {
                background-color: #fff;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 12px;
            }
            .formula-title {
                font-weight: bold;
                margin-bottom: 8px;
                color: #495057;
                font-size: 13px;
            }
            .formula-math {
                font-family: 'Times New Roman', serif;
                font-size: 14px;
                margin: 8px 0;
                background-color: #f8f9fa;
                padding: 8px;
                border-radius: 3px;
                border-left: 3px solid #007bff;
            }
            .formula-explanation {
                font-size: 12px;
                color: #666;
                line-height: 1.4;
            }
            .formula-explanation > div {
                margin: 2px 0;
            }
        </style>
    `;

    // 确定具体的模式组合描述（用于弹窗标题）
    const modeDescription = (() => {
        const intensityMode = isUsingCustomData ? '自定义向量' : '公式计算';
        const exposureMode = exposureCalculationMethod === 'cumulative' ? '累积模式' : '标准模式';
        return `${intensityMode} + ${exposureMode}`;
    })();

    return `
        <div class="point-info-section">
            <h4>🎯 位置信息 (2D曝光图案)</h4>
            <div class="info-grid">
                <div class="info-item"><span class="info-label">X坐标:</span><span class="info-value">${actualX.toFixed(3)} mm</span></div>
                <div class="info-item"><span class="info-label">Y坐标:</span><span class="info-value">${actualY.toFixed(3)} mm</span></div>
                <div class="info-item"><span class="info-label">${valueLabel}</span><span class="info-value">${zValue.toFixed(6)} ${valueUnit}</span></div>
                <div class="info-item"><span class="info-label">数据类型:</span><span class="info-value">2D热力图</span></div>
            </div>
        </div>
        <div class="point-info-section">
            <h4>📋 参数组: 2D曝光图案 (${modeDescription})</h4>
            <div class="info-grid">
                ${exposureCalculationMethod === 'cumulative' ? `
                <div class="info-item"><span class="info-label">计算模式:</span><span class="info-value">多段累积</span></div>
                <div class="info-item"><span class="info-label">段数:</span><span class="info-value">${segmentCount}</span></div>
                <div class="info-item"><span class="info-label">单段时间:</span><span class="info-value">${segmentDuration}s</span></div>
                <div class="info-item"><span class="info-label">总时间:</span><span class="info-value">${exposureTime}s</span></div>
                ` : `
                <div class="info-item"><span class="info-label">曝光时间:</span><span class="info-value">${exposureTime}s</span></div>
                `}
                ${isUsingCustomData ? `
                <div class="info-item"><span class="info-label">光强模式:</span><span class="info-value">自定义向量</span></div>
                <div class="info-item"><span class="info-label">数据点数:</span><span class="info-value">${customIntensityData.x ? customIntensityData.x.length : 0}</span></div>
                ` : `
                <div class="info-item"><span class="info-label">光强模式:</span><span class="info-value">公式计算</span></div>
                `}
                <div class="info-item"><span class="info-label">DILL常数:</span><span class="info-value">${C}</span></div>
                <div class="info-item">
                    <span class="info-label">平均光强 I_avg:</span>
                    <span class="info-value">
                        ${I_avg_display}
                        ${autoCalculatedParams.includes('I_avg') ? '<span class="default-calc-tag" title="此参数根据自定义向量数据自动计算得出"> [自动计算]</span>' : ''}
                        ${defaultCalculatedParams.includes('I_avg') ? '<span class="default-calc-tag" title="此参数在自定义向量模式下不参与计算，为默认显示值"> [默认值]</span>' : ''}
                    </span>
                </div>
                ${exposureCalculationMethod === 'cumulative' ? `
                <div class="info-item">
                    <span class="info-label">曝光时间 t_exp:</span>
                    <span class="info-value">
                        ${exposureTime}s
                        ${autoCalculatedParams.includes('t_exp') ? '<span class="default-calc-tag" title="此参数由系统根据多段曝光时间自动累积计算"> [累积计算]</span>' : ''}
                    </span>
                </div>
                ` : `
                <div class="info-item">
                    <span class="info-label">曝光时间 t_exp:</span>
                    <span class="info-value">${exposureTime}s</span>
                </div>
                `}
                <div class="info-item">
                    <span class="info-label">周期:</span>
                    <span class="info-value">
                        ${angle_a_deg}°
                        ${defaultCalculatedParams.includes('angle_a') ? '<span class="default-calc-tag" title="此参数在自定义向量模式下不参与计算，为默认显示值"> [默认值]</span>' : ''}
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">对比度:</span>
                    <span class="info-value">
                        ${contrast_ctr}
                        ${defaultCalculatedParams.includes('contrast_ctr') ? '<span class="default-calc-tag" title="此参数在自定义向量模式下不参与计算，为默认显示值"> [默认值]</span>' : ''}
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">波长:</span>
                    <span class="info-value">
                        ${wavelength_nm} nm
                        ${defaultCalculatedParams.includes('wavelength') ? '<span class="default-calc-tag" title="此参数在自定义向量模式下不参与计算，为默认显示值"> [默认值]</span>' : ''}
                    </span>
                </div>
                <div class="info-item"><span class="info-label">阈值:</span><span class="info-value">${threshold_cd}</span></div>
            </div>
        </div>
        <div class="point-info-section">
            <h4>🧮 计算公式 (2D曝光图案)</h4>
            <div class="formula-container">
                <div class="formula-title">${formulaTitle}</div>
                <div class="formula-math">${formulaMath}</div>
                <div class="formula-explanation">${formulaExplanation}</div>
            </div>
        </div>
        ${additionalInfo}
    `;
}

// 为Dill模型生成弹窗HTML的辅助函数
function getDillPopupHtmlContent(x, y, setName, params, plotType) {
    let valueLabel = '';
    let valueUnit = '';
    let formulaTitle = '';
    let formulaMath = '';
    let formulaExplanation = '';
    let additionalInfo = '';
    
    // 检查是否为2D曝光图案
    const is2DExposurePattern = params.sine_type === '2d_exposure_pattern' || 
                               (window.lastPlotData && window.lastPlotData.sine_type === '2d_exposure_pattern');
    
    // 如果是2D曝光图案，使用专门的处理逻辑
    if (is2DExposurePattern) {
        // 🔧 修复Y坐标传递问题：将完整的point对象传递给2D曝光图案弹窗函数
        // 创建一个包含所有必要信息的point对象
        const pointObj = {
            x: x,
            y: y,
            // 检查是否有actual坐标信息（来自热力图点击）
            actual_x: (typeof arguments[0] === 'object' && arguments[0].actual_x !== undefined) ? arguments[0].actual_x : x,
            actual_y: (typeof arguments[0] === 'object' && arguments[0].actual_y !== undefined) ? arguments[0].actual_y : y,
            z: (typeof arguments[0] === 'object' && arguments[0].z !== undefined) ? arguments[0].z : y
        };
        return get2DExposurePatternPopupHtmlContent(pointObj, setName, params, plotType);
    }
    
    // 检查是否为理想曝光模型（1D DILL模型使用理想曝光模型）
    const isIdealExposureModel = params.is_ideal_exposure_model || params.sine_type === 'single';
    
    // 检查是否使用自定义向量数据
    const intensityMethodSelect = document.getElementById('intensity_input_method');
    const isUsingCustomData = intensityMethodSelect && intensityMethodSelect.value === 'custom' && customIntensityData.loaded;
    
    // 检查是否使用多段曝光时间累积模式
    const exposureMethodSelect = document.getElementById('exposure_calculation_method');
    const isCumulativeExposure = exposureMethodSelect && exposureMethodSelect.value === 'cumulative';
    
    
    if (plotType === 'exposure') {
        if (isUsingCustomData && isCumulativeExposure) {
            // 自定义向量数据 + 多段曝光时间累积模式的光强分布 (最具体的条件放在前面)
            valueLabel = '光强分布:';
            valueUnit = '(自定义单位)';
            formulaTitle = '1D DILL模型 - 自定义向量 + 多段曝光时间累积模式：';
            formulaMath = '💾 <strong>基于用户自定义数据的多段曝光时间累积</strong><br/>' +
                          'I<sub>segment</sub>(x) = 用户提供的光强向量数据 × 段落权重<br/>' +
                          'D<sub>total</sub>(x) = ∑<sub>i=1</sub><sup>n</sup> [I<sub>base</sub>(x) × w<sub>i</sub> × t<sub>i</sub>]';
            
            // 获取自定义数据的信息
            const totalDataPoints = customIntensityData.x ? customIntensityData.x.length : 0;
            const xRange = customIntensityData.x ? [Math.min(...customIntensityData.x), Math.max(...customIntensityData.x)] : [0, 0];
            const intensityRange = customIntensityData.intensity ? [Math.min(...customIntensityData.intensity), Math.max(...customIntensityData.intensity)] : [0, 0];
            
            // 找到当前点在自定义数据中的索引
            let nearestIndex = 0;
            let minDistance = Infinity;
            if (customIntensityData.x) {
                for (let i = 0; i < customIntensityData.x.length; i++) {
                    const distance = Math.abs(customIntensityData.x[i] - x);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestIndex = i;
                    }
                }
            }
            
            const nearestX = customIntensityData.x && nearestIndex < customIntensityData.x.length ? customIntensityData.x[nearestIndex] : x;
            const nearestIntensity = customIntensityData.intensity && nearestIndex < customIntensityData.intensity.length ? customIntensityData.intensity[nearestIndex] : y;
            
            // 获取多段曝光时间参数
            const segmentCount = params.segment_count || 5;
            const segmentDuration = params.segment_duration || 1;
            const segmentIntensities = params.segment_intensities || [];
            const timeMode = params.time_mode || 'fixed';
            
            // 添加缺失的变量定义
            const I_avg = params.I_avg || 0.5;
            const V = params.V || 0.8;
            const K = params.K || 2.0;
            const baseIntensity = I_avg * (1 + V * Math.cos(K * x));
            
            // 计算总曝光剂量（基于自定义向量的基础光强）
            let totalDose = 0;
            let segmentsTable = '<table class="segments-info-table"><thead><tr><th>段号</th><th>光强权重</th><th>时长(s)</th><th>有效光强</th><th>该点剂量</th></tr></thead><tbody>';
            
            for (let i = 0; i < segmentCount; i++) {
                const intensityWeight = segmentIntensities[i] || 1.0;
                const effectiveIntensity = nearestIntensity * intensityWeight;
                const segmentDose = effectiveIntensity * segmentDuration;
                totalDose += segmentDose;
                
                segmentsTable += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${intensityWeight.toFixed(3)}</td>
                        <td>${segmentDuration}</td>
                        <td>${effectiveIntensity.toFixed(3)}</td>
                        <td>${segmentDose.toFixed(3)}</td>
                    </tr>
                `;
            }
            
            // 添加总计行
            segmentsTable += `
                <tr class="total-row">
                    <td colspan="3">总计</td>
                    <td>-</td>
                    <td>${totalDose.toFixed(3)}</td>
                </tr>
            `;
            
            segmentsTable += '</tbody></table>';
            
            // 添加计算过程步骤说明
            const calculationSteps = `
                <div class="calculation-steps">
                    <div class="step-title">📊 详细计算过程:</div>
                    <ol>
                        <li>
                            <strong>步骤1: 计算基础光强</strong>
                            <div class="step-detail">• 用户点击位置: x = ${x.toFixed(3)} mm</div>
                            <div class="step-detail">• 计算公式光强: I(x) = I_avg × (1 + V × cos(K × x))</div>
                            <div class="step-detail">• 计算结果: I<sub>base</sub> = ${baseIntensity.toFixed(6)}</div>
                            <div class="step-detail">• 参数: I_avg=${I_avg}, V=${V}, K=${K}</div>
                            <div class="step-note">💡 系统自动选择距离点击位置最近的数据点作为基础光强</div>
                        </li>
                        <li>
                            <strong>步骤2: 计算各段有效光强</strong>
                            <div class="step-detail">• 计算公式: I<sub>effective,i</sub> = I<sub>base</sub> × w<sub>i</sub></div>
                            <div class="step-detail">• 基础光强: I<sub>base</sub> = ${nearestIntensity.toFixed(6)}</div>
                            <div class="step-detail">• 各段权重 w<sub>i</sub>: [${segmentIntensities.map(w => w.toFixed(3)).join(', ')}]</div>
                            <div class="step-note">💡 权重值控制每段相对于基础光强的强度</div>
                        </li>
                        <li>
                            <strong>步骤3: 计算各段曝光剂量</strong>
                            <div class="step-detail">• 计算公式: D<sub>i</sub> = I<sub>effective,i</sub> × t<sub>i</sub></div>
                            <div class="step-detail">• 时间模式: ${timeMode === 'fixed' ? '固定时间段' : '自定义时间点'}</div>
                            <div class="step-detail">• 单段时长: t<sub>i</sub> = ${segmentDuration}s</div>
                            <div class="step-note">💡 每段的剂量 = 该段有效光强 × 该段时长</div>
                        </li>
                        <li>
                            <strong>步骤4: 计算总曝光剂量</strong>
                            <div class="step-detail">• 计算公式: D<sub>total</sub> = ∑<sub>i=1</sub><sup>${segmentCount}</sup> D<sub>i</sub></div>
                            <div class="step-detail">• 展开式: D<sub>total</sub> = ${segmentIntensities.map((w, i) => `D<sub>${i+1}</sub>`).join(' + ')}</div>
                            <div class="step-detail">• 计算结果: D<sub>total</sub> = ${totalDose.toFixed(6)} (单位取决于自定义数据)</div>
                            <div class="step-note">💡 多段累积效应：总剂量为所有段落剂量之和</div>
                        </li>
                    </ol>
                </div>
            `;
            
            formulaExplanation = `
                <div>🔧 <strong>自定义向量 + 多段曝光时间累积模式：</strong></div>
                <div>• 基础数据: 用户自定义向量</div>
                <div>• 数据点总数: ${totalDataPoints} 个</div>
                <div>• X坐标范围: [${xRange[0].toFixed(3)}, ${xRange[1].toFixed(3)}]</div>
                <div>• 基础光强范围: [${intensityRange[0].toFixed(6)}, ${intensityRange[1].toFixed(6)}]</div>
                <div class="formula-separator"></div>
                <div>⏱️ <strong>多段曝光时间参数：</strong></div>
                <div>• 时间模式: ${timeMode === 'fixed' ? '固定时间段' : '自定义时间点'}</div>
                <div>• 段落数量: ${segmentCount}</div>
                <div>• 单段时长: ${segmentDuration}s</div>
                <div>• 总曝光时间: ${(segmentCount * segmentDuration)}s</div>
                <div class="formula-separator"></div>
                <div>📊 <strong>段落信息：</strong></div>
                ${segmentsTable}
                <div class="formula-separator"></div>
                ${calculationSteps}
                <div class="formula-separator"></div>
                <div>📍 <strong>当前位置详细分析：</strong></div>
                <div>• 点击位置: x = ${x.toFixed(3)}</div>
                <div>• 显示光强: ${y.toFixed(6)}</div>
                <div>• 计算光强: I_base = ${baseIntensity.toFixed(6)}</div>
                <div>• 参数: K=${K}, V=${V}</div>
                <div>• 总累积剂量: ${totalDose.toFixed(3)}</div>
                <div class="formula-separator"></div>
                <div>💡 <strong>计算说明：</strong></div>
                <div>• 每段有效光强 = 基础光强 × 段落权重</div>
                <div>• 每段曝光剂量 = 有效光强 × 段落时长</div>
                <div>• 总曝光剂量 = Σ(各段曝光剂量)</div>
                <div>• 系统结合了自定义光强分布和多段时间控制</div>
            `;
            
            // 为自定义向量 + 多段曝光时间累积模式添加CSS样式
            additionalInfo = `
                <style>
                    .segments-info-table, .segments-analysis-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 8px 0;
                        font-size: 12px;
                        background-color: #f8f9fa;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .segments-info-table th, .segments-analysis-table th,
                    .segments-info-table td, .segments-analysis-table td {
                        border: 1px solid #dee2e6;
                        padding: 6px 8px;
                        text-align: center;
                    }
                    .segments-info-table th, .segments-analysis-table th {
                        background-color: #e9ecef;
                        font-weight: bold;
                        color: #495057;
                    }
                    .calculation-steps {
                        margin: 10px 0;
                        padding: 12px;
                        background-color: #f8f9fa;
                        border-radius: 6px;
                        border: 1px solid #e9ecef;
                        box-shadow: 0 2px 4px rgba(0, 123, 255, 0.08);
                    }
                    .step-title {
                        font-weight: bold;
                        margin-bottom: 8px;
                        color: #495057;
                    }
                    .calculation-steps ol {
                        margin: 0;
                        padding-left: 20px;
                    }
                    .calculation-steps li {
                        margin-bottom: 12px;
                        line-height: 1.4;
                    }
                    .step-detail {
                        margin: 2px 0;
                        padding-left: 8px;
                        font-size: 11px;
                        color: #666;
                    }
                    .step-note {
                        margin: 4px 0;
                        padding: 4px 8px;
                        background-color: #e7f3ff;
                        border-radius: 3px;
                        font-size: 10px;
                        color: #0066cc;
                        font-style: italic;
                    }
                    .total-row {
                        background-color: #fff3cd !important;
                        font-weight: bold;
                    }
                    .formula-separator {
                        height: 1px;
                        background-color: #dee2e6;
                        margin: 8px 0;
                    }
                </style>
            `;
        }
        else if (isCumulativeExposure) {
            // 多段曝光时间累积模式的曝光剂量分布
            valueLabel = '曝光剂量:';
            valueUnit = 'mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>';
            formulaTitle = 'Dill模型 - 多段曝光时间累积模式：';
            
            // 添加缺失的变量定义
            const I_avg = params.I_avg || 0.5;
            const V = params.V || 0.8;
            const K = params.K || 2.0;
            const baseIntensity = I_avg * (1 + V * Math.cos(K * x));
            
            // 根据时间模式显示不同公式
            if (params.time_mode === 'fixed') {
                formulaMath = 'D(x) = ∑<sub>i=1</sub><sup>n</sup> [I<sub>i</sub>(x) × Δt]';
                formulaMath += '<br>I<sub>i</sub>(x) = I<sub>avg</sub> × (1 + V × cos(K·x))';
            } else {
                formulaMath = 'D(x) = ∑<sub>i=1</sub><sup>n</sup> [I<sub>i</sub>(x) × (t<sub>i+1</sub> - t<sub>i</sub>)]';
                formulaMath += '<br>I<sub>i</sub>(x) = 各段光强值';
            }
            
            // 获取多段曝光参数
            const segmentCount = params.segment_count || 5;
            const segmentIntensities = params.segment_intensities || new Array(segmentCount).fill(0.5);
            const timeMode = params.time_mode || 'fixed';
            const totalDose = params.total_exposure_dose || 0;
            
            // 构建段落信息表格
            let segmentsTable = '<table class="segments-info-table"><thead><tr><th>段落</th><th>时间范围</th><th>光强值</th></tr></thead><tbody>';
            
            if (timeMode === 'fixed') {
                const segmentDuration = params.segment_duration || 1;
                
                for (let i = 0; i < segmentCount; i++) {
                    const startTime = (i * segmentDuration).toFixed(1);
                    const endTime = ((i + 1) * segmentDuration).toFixed(1);
                    const intensity = segmentIntensities[i] || 0.5;
                    
                    segmentsTable += `
                        <tr>
                            <td>段落 ${i + 1}</td>
                            <td>${startTime}s - ${endTime}s</td>
                            <td>${intensity.toFixed(2)}</td>
                        </tr>
                    `;
                }
            } else {
                const customTimePoints = params.custom_time_points || [];
                
                for (let i = 0; i < segmentCount && i + 1 < customTimePoints.length; i++) {
                    const startTime = customTimePoints[i].toFixed(1);
                    const endTime = customTimePoints[i + 1].toFixed(1);
                    const intensity = segmentIntensities[i] || 0.5;
                    
                    segmentsTable += `
                        <tr>
                            <td>段落 ${i + 1}</td>
                            <td>${startTime}s - ${endTime}s</td>
                            <td>${intensity.toFixed(2)}</td>
                        </tr>
                    `;
                }
            }
            
            segmentsTable += '</tbody></table>';
            
            // 计算当前点在各段的曝光剂量
            let currentPointAnalysis = '';
            let totalPointDose = 0;
            
            if (params.sine_type === 'multi') {
                // 多维正弦波模式
                currentPointAnalysis += '<div>• 多维正弦波模式下的多段曝光累积</div>';
            } else if (params.sine_type === '3d') {
                // 3D正弦波模式
                currentPointAnalysis += '<div>• 3D正弦波模式下的多段曝光累积</div>';
            } else {
                // 标准1D模式
                const K = params.K || 1;
                const V = params.V || 0.8;
                const phaseValue = K * x;
                
                currentPointAnalysis += '<div class="segments-analysis-title">当前点 x=' + x.toFixed(3) + 'mm 的各段曝光剂量计算:</div>';
                currentPointAnalysis += '<table class="segments-analysis-table"><thead><tr><th>段落</th><th>光强 I<sub>i</sub>(x)</th><th>时间</th><th>剂量</th></tr></thead><tbody>';
                
                if (timeMode === 'fixed') {
                    const segmentDuration = params.segment_duration || 1;
                    
                    for (let i = 0; i < segmentCount; i++) {
                        const intensity = segmentIntensities[i] || 0.5;
                        const baseIntensity = intensity * (1 + V * Math.cos(phaseValue));
                        const segmentDose = baseIntensity * segmentDuration;
                        totalPointDose += segmentDose;
                        
                        currentPointAnalysis += `
                            <tr>
                                <td>段落 ${i + 1}</td>
                                <td>${baseIntensity.toFixed(3)}</td>
                                <td>${segmentDuration.toFixed(1)}s</td>
                                <td>${segmentDose.toFixed(2)}</td>
                            </tr>
                        `;
                    }
                } else {
                    const customTimePoints = params.custom_time_points || [];
                    
                    for (let i = 0; i < segmentCount && i + 1 < customTimePoints.length; i++) {
                        const intensity = segmentIntensities[i] || 0.5;
                        const baseIntensity = intensity * (1 + V * Math.cos(phaseValue));
                        const segmentDuration = customTimePoints[i + 1] - customTimePoints[i];
                        const segmentDose = baseIntensity * segmentDuration;
                        totalPointDose += segmentDose;
                        
                        currentPointAnalysis += `
                            <tr>
                                <td>段落 ${i + 1}</td>
                                <td>${baseIntensity.toFixed(3)}</td>
                                <td>${segmentDuration.toFixed(1)}s</td>
                                <td>${segmentDose.toFixed(2)}</td>
                            </tr>
                        `;
                    }
                }
                
                currentPointAnalysis += `
                    <tr class="total-row">
                        <td>总计</td>
                        <td>-</td>
                        <td>-</td>
                        <td>${totalPointDose.toFixed(2)}</td>
                    </tr>
                </tbody></table>`;
            }
            
            formulaExplanation = `
                <div>🔧 <strong>多段曝光时间累积模式参数：</strong></div>
                <div>• 时间模式: ${timeMode === 'fixed' ? '固定时间段' : '自定义时间点'}</div>
                <div>• 段落数量: ${segmentCount}</div>
                ${timeMode === 'fixed' ? `<div>• 单段时长: ${params.segment_duration || 1}s</div>` : ''}
                <div>• 总曝光计量: ${totalDose.toFixed(2)} mJ/cm²</div>
                <div class="formula-separator"></div>
                <div>📊 <strong>段落信息：</strong></div>
                ${segmentsTable}
                <div class="formula-separator"></div>
                <div>📍 <strong>当前点分析：</strong></div>
                ${currentPointAnalysis}
                <div class="formula-separator"></div>
                <div>💡 <strong>计算说明：</strong></div>
                <div>• 多段曝光时间累积模式下，总曝光剂量为各段曝光剂量之和</div>
                <div>• 每段曝光剂量 = 该段光强 × 该段时长</div>
                <div>• 各段使用不同的光强值，可模拟复杂的曝光过程</div>
            `;
            
            // 添加CSS样式
            additionalInfo = `
                <style>
                    .segments-info-table, .segments-analysis-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 8px 0;
                        font-size: 12px;
                    }
                    .segments-info-table th, .segments-analysis-table th {
                        background-color: rgba(52, 152, 219, 0.1);
                        padding: 4px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }
                    .segments-info-table td, .segments-analysis-table td {
                        padding: 4px;
                        border-bottom: 1px solid #eee;
                    }
                    .segments-analysis-title {
                        font-weight: bold;
                        margin: 8px 0;
                    }
                    .total-row {
                        font-weight: bold;
                        background-color: rgba(52, 152, 219, 0.05);
                    }
                </style>
            `;
        }
        else if (isUsingCustomData) {
            // 仅自定义向量数据的光强分布
            valueLabel = '光强分布:';
            valueUnit = '(自定义单位)';
            formulaTitle = '1D DILL模型 - 自定义向量光强分布：';
            
            // 添加缺失的变量定义
            const K = params.K || 2.0;
            const V = params.V || 0.8;
            formulaMath = '💾 <strong>基于用户自定义数据</strong><br/>I<sub>0</sub>(x) = 用户提供的光强向量数据';
            
            // 获取自定义数据的信息
            const totalDataPoints = customIntensityData.x ? customIntensityData.x.length : 0;
            const xRange = customIntensityData.x ? [Math.min(...customIntensityData.x), Math.max(...customIntensityData.x)] : [0, 0];
            const intensityRange = customIntensityData.intensity ? [Math.min(...customIntensityData.intensity), Math.max(...customIntensityData.intensity)] : [0, 0];
            
            // 找到当前点在自定义数据中的索引
            let nearestIndex = 0;
            let minDistance = Infinity;
            if (customIntensityData.x) {
                for (let i = 0; i < customIntensityData.x.length; i++) {
                    const distance = Math.abs(customIntensityData.x[i] - x);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestIndex = i;
                    }
                }
            }
            
            const nearestX = customIntensityData.x && nearestIndex < customIntensityData.x.length ? customIntensityData.x[nearestIndex] : x;
            const nearestIntensity = customIntensityData.intensity && nearestIndex < customIntensityData.intensity.length ? customIntensityData.intensity[nearestIndex] : y;
            
            formulaExplanation = `
                <div>📊 <strong>自定义向量数据信息：</strong></div>
                <div>• 数据来源: 用户上传的文件或手动输入</div>
                <div>• 数据点总数: ${totalDataPoints} 个</div>
                <div>• X坐标范围: [${xRange[0].toFixed(3)}, ${xRange[1].toFixed(3)}]</div>
                <div>• 光强范围: [${intensityRange[0].toFixed(6)}, ${intensityRange[1].toFixed(6)}]</div>
                <div class="formula-separator"></div>
                <div>📍 <strong>当前位置数据：</strong></div>
                <div>• 点击位置: x = ${x.toFixed(3)}</div>
                <div>• 显示光强: ${y.toFixed(6)}</div>
                <div>• 数据点: 基于自定义向量数据</div>
                <div>• 参数: K=${K}, V=${V}</div>
                <div class="formula-separator"></div>
                <div>💡 <strong>说明：</strong></div>
                <div>• 此数据不是基于物理公式计算得出</div>
                <div>• 光强值来自用户提供的真实测量或理论数据</div>
                <div>• 系统使用插值方法处理非网格点的值</div>
                <div>• 单位和物理意义取决于原始数据</div>
            `;
        } else if (isIdealExposureModel) {
            // 理想曝光模型的强度分布公式
            valueLabel = '光强分布:';
            valueUnit = '(mW/cm²)';
            formulaTitle = '1D DILL模型 - 理想曝光光强分布计算：';
            formulaMath = 'I<sub>0</sub>(x) = I<sub>avg</sub> × [1 + V × cos((4π × sin(a) / λ) × x)]';
            
            // 获取实际参数值 - 优先从API返回的parameters字段获取
            const iAvg = params.I_avg || 1.0;  // 🔧 修复：使用用户输入的I_avg参数
            const visibilityParam = params.V || 1;
            const angleParam = params.angle_a || 11.7;
            // 🔧 修复：优先从API响应的parameters字段获取波长参数
            const wavelength = (params.parameters && params.parameters.wavelength_nm) || params.wavelength || 405; // nm，优先使用API返回的实际波长
            const spatialFreq = (4 * Math.PI * Math.sin(angleParam * Math.PI / 180) / wavelength).toFixed(6);
            const currentX_um = x * 1000; // 转换为微米
            const currentPhase = spatialFreq * currentX_um;
            const calculatedIntensity = iAvg * (1 + visibilityParam * Math.cos(currentPhase));  // 🔧 修复：使用I_avg而不是0.5
            
            formulaExplanation = `
                <div>🔬 <strong>实际计算参数：</strong></div>
                <div>• I<sub>avg</sub>: 平均入射光强度 (${iAvg} mW/cm²)</div>
                <div>• V: 干涉条纹可见度 (${visibilityParam})</div>
                <div>• a: 周期 (${angleParam}°)</div>
                <div>• λ: 光波长 (${wavelength} nm)</div>
                <div>• 空间频率系数: 4π×sin(a)/λ = ${spatialFreq} rad/μm</div>
                <div class="formula-separator"></div>
                <div>📍 <strong>当前位置计算：</strong></div>
                <div>• x: 位置坐标 (${x.toFixed(3)} mm = ${currentX_um.toFixed(1)} μm)</div>
                <div>• 当前相位: ${currentPhase.toFixed(3)} rad</div>
                <div>• I<sub>0</sub>: 实际光强 (${y.toFixed(6)} mW/cm²)</div>
                <div>• 理论值: ${calculatedIntensity.toFixed(6)} mW/cm²</div>
                <div class="formula-separator"></div>
                <div>⚙️ <strong>公式说明：</strong></div>
                <div>• 基础强度: I<sub>avg</sub> = ${iAvg} mW/cm²</div>
                <div>• 调制深度: V × cos(相位) = ${(visibilityParam * Math.cos(currentPhase)).toFixed(6)}</div>
                <div>• 干涉条纹产生周期性光强分布</div>
            `;
        } else {
            // 传统Dill模型公式
            valueLabel = '曝光剂量:';
            valueUnit = 'mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>';
            formulaTitle = 'Dill模型曝光剂量计算：';
            
            // 根据不同的波形模式显示对应的公式
            if (params.sine_type === 'multi') {
                formulaMath = 'D(x,y) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + φ))';
                formulaExplanation = `
                    <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>)</div>
                    <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
                    <div>• V: 干涉条纹可见度 (${params.V})</div>
                    <div>• Kx: x方向空间频率 (${params.Kx} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                    <div>• Ky: y方向空间频率 (${params.Ky} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                    <div>• φ: 相位值 (${params.phi_expr})</div>
                `;
            } else if (params.sine_type === '3d') {
                formulaMath = 'D(x,y,z) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ))';
                formulaExplanation = `
                    <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>)</div>
                    <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
                    <div>• V: 干涉条纹可见度 (${params.V})</div>
                    <div>• Kx: x方向空间频率 (${params.Kx} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                    <div>• Ky: y方向空间频率 (${params.Ky} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                    <div>• Kz: z方向空间频率 (${params.Kz} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                    <div>• φ: 相位值 (${params.phi_expr})</div>
                `;
            } else {
                formulaMath = 'D(x) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(K·x))';
                formulaExplanation = `
                    <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>)</div>
                    <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
                    <div>• V: 干涉条纹可见度 (${params.V})</div>
                    <div>• K: 空间频率 (${params.K} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                `;
            }
        }
    } else if (plotType === 'thickness') {
        if (isUsingCustomData && isCumulativeExposure) {
            // 自定义向量数据 + 多段曝光时间累积模式的形貌分布 (最具体的条件放在前面)
            valueLabel = '蚀刻深度/厚度:';
            valueUnit = '(归一化)';
            formulaTitle = '1D DILL模型 - 自定义向量 + 多段曝光时间累积蚀刻深度：';
            
            // 添加缺失的变量定义
            const I_avg = params.I_avg || 0.5;
            const V = params.V || 0.8;
            const K = params.K || 2.0;
            const baseIntensity = I_avg * (1 + V * Math.cos(K * x));
            formulaMath = '<div style="margin-bottom: 8px;"><strong>步骤1:</strong> D<sub>total</sub>(x) = Σ[I<sub>base</sub>(x) × w<sub>i</sub> × t<sub>i</sub>] (多段累积)</div>';
            formulaMath += '<div style="margin-bottom: 8px;"><strong>步骤2:</strong> 阈值判断与抗蚀效果计算</div>';
            formulaMath += '<div style="margin-left: 20px; margin-bottom: 4px;">if D<sub>total</sub>(x) < c<sub>d</sub>: M(x) = 1 (未曝光)</div>';
            formulaMath += '<div style="margin-left: 20px; margin-bottom: 8px;">else: M(x) = e<sup>-C × (D<sub>total</sub>(x) - c<sub>d</sub>)</sup></div>';
            formulaMath += '<div><strong>步骤3:</strong> H(x) = 1 - M(x) (蚀刻深度)</div>';

            // 确保 customIntensityData 有效，如果无效则从 lastPlotData 中获取
            if (!customIntensityData || !customIntensityData.x || !customIntensityData.intensity) {
                if (window.lastPlotData && window.lastPlotData.customIntensityData) {
                    customIntensityData = window.lastPlotData.customIntensityData;
                }
            }
            
            // 获取自定义数据的信息
            const totalDataPoints = customIntensityData.x ? customIntensityData.x.length : 0;
            const xRange = customIntensityData.x ? [Math.min(...customIntensityData.x), Math.max(...customIntensityData.x)] : [0, 0];
            const intensityRange = customIntensityData.intensity ? [Math.min(...customIntensityData.intensity), Math.max(...customIntensityData.intensity)] : [0, 0];
            
            // 找到当前点在自定义数据中的对应光强值
            let nearestIndex = 0;
            let minDistance = Infinity;
            if (customIntensityData.x) {
                for (let i = 0; i < customIntensityData.x.length; i++) {
                    const distance = Math.abs(customIntensityData.x[i] - x);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestIndex = i;
                    }
                }
            }
            
            const nearestX = customIntensityData.x && nearestIndex < customIntensityData.x.length ? customIntensityData.x[nearestIndex] : x;
            const nearestIntensity = customIntensityData.intensity && nearestIndex < customIntensityData.intensity.length ? customIntensityData.intensity[nearestIndex] : 0;
            
            // 获取DILL参数
            const exposureConstant = params.C || 0.022;
            const thresholdCd = params.exposure_threshold || 20;
            
            // 获取多段曝光时间参数
            const segmentCount = params.segment_count || 0;
            const segmentDuration = Array.isArray(params.segment_duration) ? params.segment_duration : [];
            const segmentIntensities = Array.isArray(params.segment_intensities) ? params.segment_intensities : [];
            const timeMode = params.time_mode || 'fixed';
            
            // 计算总曝光剂量（基于自定义向量的基础光强和多段时间）
            let totalExposureDose = 0;
            let segmentsTable = '<table class="segments-analysis-table"><thead><tr><th>段号</th><th>基础光强</th><th>权重</th><th>有效光强</th><th>时长(s)</th><th>段剂量</th></tr></thead><tbody>';
            
            for (let i = 0; i < segmentCount; i++) {
                const intensityWeight = segmentIntensities[i] || 1.0;
                const effectiveIntensity = nearestIntensity * intensityWeight;
                const segmentDose = effectiveIntensity * segmentDuration;
                totalExposureDose += segmentDose;
                
                segmentsTable += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${nearestIntensity.toFixed(3)}</td>
                        <td>${intensityWeight.toFixed(3)}</td>
                        <td>${effectiveIntensity.toFixed(3)}</td>
                        <td>${segmentDuration}</td>
                        <td>${segmentDose.toFixed(3)}</td>
                    </tr>
                `;
            }
            // 添加总计行
            segmentsTable += `
                <tr class="total-row">
                    <td colspan="5">总剂量</td>
                    <td>${totalExposureDose.toFixed(3)}</td>
                </tr>
            `;
            
            segmentsTable += '</tbody></table>';
            
            // 计算理论厚度
            let theoreticalThickness;
            let M_value; // M值（抗蚀剂值）
            
            if (totalExposureDose < thresholdCd) {
                M_value = 1.0; // 未达阈值，完全抗蚀
                theoreticalThickness = 0; // 无蚀刻
            } else {
                M_value = Math.exp(-exposureConstant * (totalExposureDose - thresholdCd));
                theoreticalThickness = 1 - M_value; // 蚀刻深度
            }
            
            formulaExplanation = `
                <div>🔧 <strong>自定义向量 + 多段曝光时间累积蚀刻：</strong></div>
                <div>• 基础数据: 用户自定义向量</div>
                <div>• 数据点总数: ${totalDataPoints} 个</div>
                <div>• X坐标范围: [${xRange[0].toFixed(3)}, ${xRange[1].toFixed(3)}]</div>
                <div>• 基础光强范围: [${intensityRange[0].toFixed(6)}, ${intensityRange[1].toFixed(6)}]</div>
                <div class="formula-separator"></div>
                <div>⏱️ <strong>多段曝光时间参数：</strong></div>
                <div>• 时间模式: ${timeMode === 'fixed' ? '固定时间段' : '自定义时间点'}</div>
                <div>• 段落数量: ${segmentCount}</div>
                <div>• 单段时长: ${segmentDuration}s</div>
                <div>• 总曝光时间: ${(segmentCount * segmentDuration)}s</div>
                <div class="formula-separator"></div>
                <div>📊 <strong>各段曝光详情：</strong></div>
                ${segmentsTable}
                <div class="formula-separator"></div>
                <div>🧮 <strong>DILL模型参数：</strong></div>
                <div>• 曝光常数 C: ${exposureConstant}</div>
                <div>• 阈值 cd: ${thresholdCd}</div>
                <div>• 总累积曝光剂量: ${totalExposureDose.toFixed(3)}</div>
                <div class="formula-separator"></div>
                
                <!-- 添加计算过程详细步骤 -->
                <div class="calculation-steps">
                    <div class="step-title">📊 详细计算过程:</div>
                    <ol>
                        <li>
                            <strong>步骤1: 计算基础光强</strong>
                            <div class="step-detail">• 用户点击位置: x = ${x.toFixed(3)} mm</div>
                            <div class="step-detail">• 计算公式光强: I(x) = I_avg × (1 + V × cos(K × x))</div>
                            <div class="step-detail">• 计算结果: I<sub>base</sub> = ${baseIntensity.toFixed(6)}</div>
                            <div class="step-detail">• 参数: I_avg=${I_avg}, V=${V}, K=${K}</div>
                            <div class="step-note">💡 基于标准Dill模型计算该位置的基础光强分布</div>
                        </li>
                        <li>
                            <strong>步骤2: 多段曝光剂量累积计算</strong>
                            <div class="step-detail">• 各段有效光强公式: I<sub>effective,i</sub> = I<sub>base</sub> × w<sub>i</sub></div>
                            <div class="step-detail">• 各段剂量公式: D<sub>i</sub> = I<sub>effective,i</sub> × t<sub>i</sub></div>
                            <div class="step-detail">• 累积剂量公式: D<sub>total</sub> = ∑<sub>i=1</sub><sup>${segmentCount}</sup> D<sub>i</sub></div>
                            <div class="step-detail">• 计算结果: D<sub>total</sub> = ${totalExposureDose.toFixed(6)}</div>
                            <div class="step-note">💡 ${segmentCount}段时间累积，总时长 ${(segmentCount * segmentDuration)}s</div>
                        </li>
                        <li>
                            <strong>步骤3: DILL模型阈值判断</strong>
                            <div class="step-detail">• 曝光阈值: c<sub>d</sub> = ${thresholdCd} mJ/cm²</div>
                            <div class="step-detail">• 比较结果: D<sub>total</sub> ${totalExposureDose < thresholdCd ? '<' : '≥'} c<sub>d</sub></div>
                            <div class="step-detail">• 物理意义: ${totalExposureDose < thresholdCd ? '曝光不足，抗蚀剂不发生反应' : '曝光充分，抗蚀剂发生反应'}</div>
                            <div class="step-note">💡 阈值决定是否开始产生显影效应</div>
                        </li>
                        <li>
                            <strong>步骤4: 计算抗蚀剂值 M(x)</strong>
                            ${totalExposureDose < thresholdCd ? 
                              '<div class="step-detail">• 未达阈值情况: M = 1（完全抗蚀，无溶解）</div><div class="step-note">💡 抗蚀剂保持完整，厚度不变</div>' : 
                              `<div class="step-detail">• DILL模型公式: M = e<sup>-C × (D<sub>total</sub> - c<sub>d</sub>)</sup></div>
                               <div class="step-detail">• 参数代入: M = e<sup>-${exposureConstant} × (${totalExposureDose.toFixed(3)} - ${thresholdCd})</sup></div>
                               <div class="step-detail">• 简化计算: M = e<sup>-${exposureConstant} × ${(totalExposureDose-thresholdCd).toFixed(3)}</sup></div>
                               <div class="step-detail">• 指数计算: M = e<sup>${(exposureConstant*(totalExposureDose-thresholdCd)).toFixed(3)}</sup></div>
                               <div class="step-detail">• 最终结果: M = ${M_value.toFixed(6)}</div>
                               <div class="step-note">💡 M值越小，抗蚀剂溶解越多</div>`
                            }
                        </li>
                        <li>
                            <strong>步骤5: 计算蚀刻深度 H(x)</strong>
                            <div class="step-detail">• 蚀刻深度公式: H = 1 - M</div>
                            <div class="step-detail">• 数值代入: H = 1 - ${M_value.toFixed(6)}</div>
                            <div class="step-detail">• 最终结果: H = ${theoreticalThickness.toFixed(6)}</div>
                            <div class="step-detail">• 归一化范围: [0, 1]，其中0表示无蚀刻，1表示完全蚀刻</div>
                            <div class="step-note">💡 基于计算光强分布和多段时间累积的综合效应</div>
                        </li>
                    </ol>
                </div>
                <div class="formula-separator"></div>
                
                <!-- 添加比较分析 -->
                <div class="thickness-comparison">
                    <div class="comparison-title">📏 显示厚度与理论计算对比:</div>
                    <table class="comparison-table">
                        <tr>
                            <th>项目</th>
                            <th>数值</th>
                            <th>说明</th>
                        </tr>
                        <tr>
                            <td>显示厚度</td>
                            <td>${y.toFixed(6)}</td>
                            <td>图表上显示的值</td>
                        </tr>
                        <tr>
                            <td>理论厚度</td>
                            <td>${theoreticalThickness.toFixed(6)}</td>
                            <td>根据DILL模型计算的值</td>
                        </tr>
                        <tr>
                            <td>偏差</td>
                            <td>${Math.abs(y - theoreticalThickness).toFixed(6)}</td>
                            <td>${Math.abs(y - theoreticalThickness) < 0.001 ? '误差极小' : '有一定偏差'}</td>
                        </tr>
                    </table>
                </div>
                <div class="formula-separator"></div>
                
                <div>📍 <strong>当前点计算结果：</strong></div>
                <div>• 点击位置: x = ${x.toFixed(3)}</div>
                <div>• 显示厚度: ${y.toFixed(6)}</div>
                <div>• 计算光强: I_base = ${baseIntensity.toFixed(6)}</div>
                <div>• 理论厚度: ${theoreticalThickness.toFixed(6)}</div>
                <div>• 抗蚀剂状态: ${totalExposureDose < thresholdCd ? '<span class="resist-state unexposed">未曝光 (低于阈值)</span>' : '<span class="resist-state exposed">已曝光 (高于阈值)</span>'}</div>
                <div class="formula-separator"></div>
                <div>💡 <strong>计算说明：</strong></div>
                <div>• 总曝光剂量 = Σ(基础光强 × 权重 × 时长)</div>
                <div>• 系统结合了自定义光强分布和多段时间累积效应</div>
                <div>• 每段的有效光强由基础光强和段落权重共同决定</div>
                <div>• 最终蚀刻深度基于累积总剂量计算</div>
            `;
            
            // 为自定义向量 + 多段曝光时间累积模式添加CSS样式
            additionalInfo = `
                <style>
                    .segments-info-table, .segments-analysis-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 8px 0;
                        font-size: 12px;
                        background-color: #f8f9fa;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .segments-info-table th, .segments-analysis-table th,
                    .segments-info-table td, .segments-analysis-table td {
                        border: 1px solid #dee2e6;
                        padding: 6px 8px;
                        text-align: center;
                    }
                    .segments-info-table th, .segments-analysis-table th {
                        background-color: #e9ecef;
                        font-weight: bold;
                        color: #495057;
                    }
                    .calculation-steps {
                        margin: 10px 0;
                        padding: 12px;
                        background-color: #f8f9fa;
                        border-radius: 6px;
                        border: 1px solid #e9ecef;
                        box-shadow: 0 2px 4px rgba(0, 123, 255, 0.08);
                    }
                    .step-title {
                        font-weight: bold;
                        margin-bottom: 8px;
                        color: #495057;
                    }
                    .calculation-steps ol {
                        margin: 0;
                        padding-left: 20px;
                    }
                    .calculation-steps li {
                        margin-bottom: 12px;
                        line-height: 1.4;
                    }
                    .step-detail {
                        margin: 2px 0;
                        padding-left: 8px;
                        font-size: 11px;
                        color: #666;
                    }
                    .step-note {
                        margin: 4px 0;
                        padding: 4px 8px;
                        background-color: #e7f3ff;
                        border-radius: 3px;
                        font-size: 10px;
                        color: #0066cc;
                        font-style: italic;
                    }
                    .total-row {
                        background-color: #fff3cd !important;
                        font-weight: bold;
                    }
                    .formula-separator {
                        height: 1px;
                        background-color: #dee2e6;
                        margin: 8px 0;
                    }
                    .thickness-comparison {
                        margin: 10px 0;
                        padding: 8px;
                        background-color: #f8f9fa;
                        border-radius: 4px;
                        border: 1px solid #dee2e6;
                    }
                    .comparison-title {
                        font-weight: bold;
                        margin-bottom: 8px;
                        color: #495057;
                    }
                    .comparison-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 12px;
                    }
                    .comparison-table th, .comparison-table td {
                        border: 1px solid #dee2e6;
                        padding: 6px 8px;
                        text-align: left;
                    }
                    .comparison-table th {
                        background-color: #e9ecef;
                        font-weight: bold;
                    }
                    .resist-state {
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 11px;
                        font-weight: bold;
                    }
                    .resist-state.unexposed {
                        background-color: #ffeaa7;
                        color: #d63031;
                    }
                    .resist-state.exposed {
                        background-color: #55a3ff;
                        color: white;
                    }
                </style>
            `;
        }
        else if (isCumulativeExposure) {
            // 多段曝光时间累积模式的形貌分布
            valueLabel = '蚀刻深度/厚度:';
            valueUnit = '(归一化)';
            formulaTitle = 'Dill模型 - 多段曝光时间累积模式蚀刻深度计算：';
            formulaMath = '<div style="margin-bottom: 8px;"><strong>步骤1:</strong> D(x) = ∑<sub>i=1</sub><sup>n</sup> [I<sub>i</sub>(x) × Δt<sub>i</sub>]</div>';
            formulaMath += '<div style="margin-bottom: 8px;"><strong>步骤2:</strong> 阈值判断与抗蚀效果计算</div>';
            formulaMath += '<div style="margin-left: 20px; margin-bottom: 4px;">if D<sub>total</sub>(x) < c<sub>d</sub>: M(x) = 1 (未曝光)</div>';
            formulaMath += '<div style="margin-left: 20px; margin-bottom: 8px;">else: M(x) = e<sup>-C × (D<sub>total</sub>(x) - c<sub>d</sub>)</sup></div>';
            formulaMath += '<div><strong>步骤3:</strong> H(x) = 1 - M(x) (蚀刻深度)</div>';
            
            // 多段曝光时间累积模式使用公式计算基础光强，不使用自定义数据
            // 使用标准Dill公式计算当前位置的基础光强
            const K = params.K || 0.1;
            const V = params.V || 0.8;
            const I_avg = params.I_avg || 0.5;
            const baseIntensity = I_avg * (1 + V * Math.cos(K * x));
            
            // 获取DILL参数
            const exposureConstant = params.C || 0.022;
            const thresholdCd = params.exposure_threshold || 20;
            
            // 获取多段曝光时间参数
            const segmentCount = params.segment_count || 5;
            const segmentDuration = params.segment_duration || 1;
            const segmentIntensities = params.segment_intensities || [];
            const timeMode = params.time_mode || 'fixed';
            
            // 计算总曝光剂量（基于公式计算的基础光强和多段时间）
            let totalExposureDose = 0;
            let segmentsTable = '<table class="segments-analysis-table"><thead><tr><th>段号</th><th>基础光强</th><th>权重</th><th>有效光强</th><th>时长(s)</th><th>段剂量</th></tr></thead><tbody>';
            
            for (let i = 0; i < segmentCount; i++) {
                const intensityWeight = segmentIntensities[i] || 1.0;
                const effectiveIntensity = baseIntensity * intensityWeight;
                const segmentDose = effectiveIntensity * segmentDuration;
                totalExposureDose += segmentDose;
                
                segmentsTable += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${baseIntensity.toFixed(3)}</td>
                        <td>${intensityWeight.toFixed(3)}</td>
                        <td>${effectiveIntensity.toFixed(3)}</td>
                        <td>${segmentDuration}</td>
                        <td>${segmentDose.toFixed(3)}</td>
                    </tr>
                `;
            }
            // 添加总计行
            segmentsTable += `
                <tr class="total-row">
                    <td colspan="5">总剂量</td>
                    <td>${totalExposureDose.toFixed(3)}</td>
                </tr>
            `;
            
            segmentsTable += '</tbody></table>';
            
            // 计算理论厚度
            let theoreticalThickness;
            let M_value; // M值（抗蚀剂值）
            
            if (totalExposureDose < thresholdCd) {
                M_value = 1.0; // 未达阈值，完全抗蚀
                theoreticalThickness = 0; // 无蚀刻
            } else {
                M_value = Math.exp(-exposureConstant * (totalExposureDose - thresholdCd));
                theoreticalThickness = 1 - M_value; // 蚀刻深度
            }
            
            formulaExplanation = `
                <div>🔧 <strong>多段曝光时间累积蚀刻：</strong></div>
                <div>• 基础数据: 系统计算的基础光强分布</div>
                <div>• 点击位置: x = ${x.toFixed(3)}</div>
                <div>• 基础光强: ${baseIntensity.toFixed(6)}</div>
                <div class="formula-separator"></div>
                <div>⏱️ <strong>多段曝光时间参数：</strong></div>
                <div>• 时间模式: ${timeMode === 'fixed' ? '固定时间段' : '自定义时间点'}</div>
                <div>• 段落数量: ${segmentCount}</div>
                <div>• 单段时长: ${segmentDuration}s</div>
                <div>• 总曝光时间: ${(segmentCount * segmentDuration)}s</div>
                <div class="formula-separator"></div>
                <div>📊 <strong>各段曝光详情：</strong></div>
                ${segmentsTable}
                <div class="formula-separator"></div>
                <div>🧮 <strong>DILL模型参数：</strong></div>
                <div>• 曝光常数 C: ${exposureConstant}</div>
                <div>• 阈值 cd: ${thresholdCd}</div>
                <div>• 总累积曝光剂量: ${totalExposureDose.toFixed(3)}</div>
                <div class="formula-separator"></div>
                
                <!-- 添加计算过程详细步骤 -->
                <div class="calculation-steps">
                    <div class="step-title">📊 详细计算过程:</div>
                    <ol>
                        <li>
                            <strong>步骤1: 计算基础光强</strong>
                            <div class="step-detail">• 用户点击位置: x = ${x.toFixed(3)} mm</div>
                            <div class="step-detail">• 计算公式光强: I(x) = I_avg × (1 + V × cos(K × x))</div>
                            <div class="step-detail">• 计算结果: I<sub>base</sub> = ${baseIntensity.toFixed(6)}</div>
                            <div class="step-detail">• 参数: I_avg=${I_avg}, V=${V}, K=${K}</div>
                            <div class="step-note">💡 基于标准Dill模型计算该位置的基础光强分布</div>
                        </li>
                        <li>
                            <strong>步骤2: 多段曝光剂量累积计算</strong>
                            <div class="step-detail">• 各段有效光强公式: I<sub>effective,i</sub> = I<sub>base</sub> × w<sub>i</sub></div>
                            <div class="step-detail">• 各段剂量公式: D<sub>i</sub> = I<sub>effective,i</sub> × t<sub>i</sub></div>
                            <div class="step-detail">• 累积剂量公式: D<sub>total</sub> = ∑<sub>i=1</sub><sup>${segmentCount}</sup> D<sub>i</sub></div>
                            <div class="step-detail">• 计算结果: D<sub>total</sub> = ${totalExposureDose.toFixed(6)}</div>
                            <div class="step-note">💡 ${segmentCount}段时间累积，总时长 ${(segmentCount * segmentDuration)}s</div>
                        </li>
                        <li>
                            <strong>步骤3: DILL模型阈值判断</strong>
                            <div class="step-detail">• 曝光阈值: c<sub>d</sub> = ${thresholdCd} mJ/cm²</div>
                            <div class="step-detail">• 比较结果: D<sub>total</sub> ${totalExposureDose < thresholdCd ? '<' : '≥'} c<sub>d</sub></div>
                            <div class="step-detail">• 物理意义: ${totalExposureDose < thresholdCd ? '曝光不足，抗蚀剂不发生反应' : '曝光充分，抗蚀剂发生反应'}</div>
                            <div class="step-note">💡 阈值决定是否开始产生显影效应</div>
                        </li>
                        <li>
                            <strong>步骤4: 计算抗蚀剂值 M(x)</strong>
                            ${totalExposureDose < thresholdCd ? 
                              '<div class="step-detail">• 未达阈值情况: M = 1（完全抗蚀，无溶解）</div><div class="step-note">💡 抗蚀剂保持完整，厚度不变</div>' : 
                              `<div class="step-detail">• DILL模型公式: M = e<sup>-C × (D<sub>total</sub> - c<sub>d</sub>)</sup></div>
                               <div class="step-detail">• 参数代入: M = e<sup>-${exposureConstant} × (${totalExposureDose.toFixed(3)} - ${thresholdCd})</sup></div>
                               <div class="step-detail">• 简化计算: M = e<sup>-${exposureConstant} × ${(totalExposureDose-thresholdCd).toFixed(3)}</sup></div>
                               <div class="step-detail">• 指数计算: M = e<sup>${(exposureConstant*(totalExposureDose-thresholdCd)).toFixed(3)}</sup></div>
                               <div class="step-detail">• 最终结果: M = ${M_value.toFixed(6)}</div>
                               <div class="step-note">💡 M值越小，抗蚀剂溶解越多</div>`
                            }
                        </li>
                        <li>
                            <strong>步骤5: 计算蚀刻深度 H(x)</strong>
                            <div class="step-detail">• 蚀刻深度公式: H = 1 - M</div>
                            <div class="step-detail">• 数值代入: H = 1 - ${M_value.toFixed(6)}</div>
                            <div class="step-detail">• 最终结果: H = ${theoreticalThickness.toFixed(6)}</div>
                            <div class="step-detail">• 归一化范围: [0, 1]，其中0表示无蚀刻，1表示完全蚀刻</div>
                            <div class="step-note">💡 基于计算光强分布和多段时间累积的综合效应</div>
                        </li>
                    </ol>
                </div>
                <div class="formula-separator"></div>
                
                <!-- 添加比较分析 -->
                <div class="thickness-comparison">
                    <div class="comparison-title">📏 显示厚度与理论计算对比:</div>
                    <table class="comparison-table">
                        <tr>
                            <th>项目</th>
                            <th>数值</th>
                            <th>说明</th>
                        </tr>
                        <tr>
                            <td>显示厚度</td>
                            <td>${y.toFixed(6)}</td>
                            <td>图表上显示的值</td>
                        </tr>
                        <tr>
                            <td>理论厚度</td>
                            <td>${theoreticalThickness.toFixed(6)}</td>
                            <td>根据DILL模型计算的值</td>
                        </tr>
                        <tr>
                            <td>偏差</td>
                            <td>${Math.abs(y - theoreticalThickness).toFixed(6)}</td>
                            <td>${Math.abs(y - theoreticalThickness) < 0.001 ? '误差极小' : '有一定偏差'}</td>
                        </tr>
                    </table>
                </div>
                <div class="formula-separator"></div>
                
                <div>📍 <strong>当前点计算结果：</strong></div>
                <div>• 点击位置: x = ${x.toFixed(3)}</div>
                <div>• 显示厚度: ${y.toFixed(6)}</div>
                <div>• 计算光强: I_base = ${baseIntensity.toFixed(6)}</div>
                <div>• 理论厚度: ${theoreticalThickness.toFixed(6)}</div>
                <div>• 抗蚀剂状态: ${totalExposureDose < thresholdCd ? '<span class="resist-state unexposed">未曝光 (低于阈值)</span>' : '<span class="resist-state exposed">已曝光 (高于阈值)</span>'}</div>
                <div class="formula-separator"></div>
                <div>💡 <strong>计算说明：</strong></div>
                <div>• 总曝光剂量 = Σ(基础光强 × 权重 × 时长)</div>
                <div>• 系统结合了自定义光强分布和多段时间累积效应</div>
                <div>• 每段的有效光强由基础光强和段落权重共同决定</div>
                <div>• 最终蚀刻深度基于累积总剂量计算</div>
            `;
            
            // 为自定义向量 + 多段曝光时间累积模式添加CSS样式
            additionalInfo = `
                <style>
                    .segments-info-table, .segments-analysis-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 8px 0;
                        font-size: 12px;
                        background-color: #f8f9fa;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .segments-info-table th, .segments-analysis-table th,
                    .segments-info-table td, .segments-analysis-table td {
                        border: 1px solid #dee2e6;
                        padding: 6px 8px;
                        text-align: center;
                    }
                    .segments-info-table th, .segments-analysis-table th {
                        background-color: #e9ecef;
                        font-weight: bold;
                        color: #495057;
                    }
                    .calculation-steps {
                        margin: 10px 0;
                        padding: 12px;
                        background-color: #f8f9fa;
                        border-radius: 6px;
                        border: 1px solid #e9ecef;
                        box-shadow: 0 2px 4px rgba(0, 123, 255, 0.08);
                    }
                    .step-title {
                        font-weight: bold;
                        margin-bottom: 8px;
                        color: #495057;
                    }
                    .calculation-steps ol {
                        margin: 0;
                        padding-left: 20px;
                    }
                    .calculation-steps li {
                        margin-bottom: 12px;
                        line-height: 1.4;
                    }
                    .step-detail {
                        margin: 2px 0;
                        padding-left: 8px;
                        font-size: 11px;
                        color: #666;
                    }
                    .step-note {
                        margin: 4px 0;
                        padding: 4px 8px;
                        background-color: #e7f3ff;
                        border-radius: 3px;
                        font-size: 10px;
                        color: #0066cc;
                        font-style: italic;
                    }
                    .total-row {
                        background-color: #fff3cd !important;
                        font-weight: bold;
                    }
                    .formula-separator {
                        height: 1px;
                        background-color: #dee2e6;
                        margin: 8px 0;
                    }
                    .segments-info-table tbody tr:nth-child(even),
                    .segments-analysis-table tbody tr:nth-child(even) {
                        background-color: #ffffff;
                    }
                    .segments-info-table tbody tr:hover,
                    .segments-analysis-table tbody tr:hover {
                        background-color: rgba(52, 152, 219, 0.1);
                    }
                    .total-row {
                        font-weight: bold;
                        background-color: rgba(52, 152, 219, 0.1) !important;
                    }
                    .calculation-steps {
                        background-color: #f8f9fa;
                        border: 1px solid #e9ecef;
                        border-radius: 4px;
                        padding: 10px;
                        margin: 10px 0;
                    }
                    .calculation-steps .step-title {
                        font-weight: bold;
                        margin-bottom: 8px;
                    }
                    .calculation-steps ol {
                        margin: 0;
                        padding-left: 20px;
                    }
                    .calculation-steps li {
                        margin-bottom: 10px;
                    }
                    .calculation-steps li strong {
                        color: #0056b3;
                    }
                    .calculation-steps li div {
                        margin: 3px 0;
                        font-size: 12px;
                        color: #555;
                    }
                    .thickness-comparison {
                        background-color: #f8f9fa;
                        border: 1px solid #e9ecef;
                        border-radius: 4px;
                        padding: 10px;
                        margin: 10px 0;
                    }
                    .comparison-title {
                        font-weight: bold;
                        margin-bottom: 8px;
                    }
                    .comparison-table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .comparison-table th, .comparison-table td {
                        border: 1px solid #dee2e6;
                        padding: 4px 6px;
                        text-align: center;
                    }
                    .comparison-table th {
                        background-color: #e9ecef;
                    }
                    .resist-state {
                        font-weight: bold;
                        padding: 2px 5px;
                        border-radius: 3px;
                    }
                    .resist-state.unexposed {
                        background-color: #e3fcef;
                        color: #0f5132;
                    }
                    .resist-state.exposed {
                        background-color: #ffe5e5;
                        color: #842029;
                    }
                </style>
            `;
        }
        else if (isUsingCustomData) {
            // 仅自定义向量数据的形貌分布
            console.log('🔧 厚度图 - 进入: 仅自定义向量模式');
            valueLabel = '蚀刻深度/厚度:';
            valueUnit = '(自定义单位)';
            formulaTitle = '1D DILL模型 - 理想曝光蚀刻深度计算：';
            
            // 添加缺失的变量定义
            const I_avg = params.I_avg || 0.5;
            const V = params.V || 0.8;
            const K = params.K || 2.0;
            const baseIntensity = I_avg * (1 + V * Math.cos(K * x));
            formulaMath = '<div style="margin-bottom: 8px;"><strong>步骤1:</strong> D<sub>0</sub>(x) = I<sub>0</sub>(x) × t<sub>exp</sub></div>';
            formulaMath += '<div style="margin-bottom: 8px;"><strong>步骤2:</strong> 阈值判断与抗蚀效果计算</div>';
            formulaMath += '<div style="margin-left: 20px; margin-bottom: 4px;">if D<sub>0</sub>(x) < c<sub>d</sub>: M(x) = 1 (未曝光)</div>';
            formulaMath += '<div style="margin-left: 20px; margin-bottom: 8px;">else: M(x) = e<sup>-C × (D<sub>0</sub>(x) - c<sub>d</sub>)</sup></div>';
            formulaMath += '<div><strong>步骤3:</strong> H(x) = 1 - M(x) (蚀刻深度)</div>';
            
            // 获取自定义数据的信息
            const totalDataPoints = customIntensityData.x ? customIntensityData.x.length : 0;
            const xRange = customIntensityData.x ? [Math.min(...customIntensityData.x), Math.max(...customIntensityData.x)] : [0, 0];
            const intensityRange = customIntensityData.intensity ? [Math.min(...customIntensityData.intensity), Math.max(...customIntensityData.intensity)] : [0, 0];
            
            // 找到当前点在自定义数据中的对应光强值
            let nearestIndex = 0;
            let minDistance = Infinity;
            if (customIntensityData.x) {
                for (let i = 0; i < customIntensityData.x.length; i++) {
                    const distance = Math.abs(customIntensityData.x[i] - x);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestIndex = i;
                    }
                }
            }
            
            const nearestX = customIntensityData.x && nearestIndex < customIntensityData.x.length ? customIntensityData.x[nearestIndex] : x;
            const nearestIntensity = customIntensityData.intensity && nearestIndex < customIntensityData.intensity.length ? customIntensityData.intensity[nearestIndex] : 0;
            
            // 获取DILL参数
            const exposureConstant = params.C || 0.022;
            const thresholdCd = params.exposure_threshold || 20;
            const exposureTime = params.t_exp || 100;
            
            // 根据自定义光强计算理论曝光剂量
            const exposureDose = nearestIntensity * exposureTime;
            let theoreticalThickness;
            if (exposureDose < thresholdCd) {
                theoreticalThickness = 1.0; // 未达阈值，完全抗蚀
            } else {
                const M = Math.exp(-exposureConstant * (exposureDose - thresholdCd));
                theoreticalThickness = 1 - M; // 蚀刻深度
            }
            
            formulaExplanation = `
                <div>🔧 <strong>DILL模型阈值机制参数：</strong></div>
                <div>• C: 光敏速率常数 = ${exposureConstant}</div>
                <div>• c<sub>d</sub>: 曝光阈值 = ${thresholdCd}</div>
                <div>• t<sub>exp</sub>: 曝光时间 = ${exposureTime} s</div>
                <div class="formula-separator"></div>
                <div>📊 <strong>基于自定义向量的计算：</strong></div>
                <div>• 光强数据来源: 用户自定义数据</div>
                <div>• 数据点总数: ${totalDataPoints} 个</div>
                <div class="formula-separator"></div>
                <div>📍 <strong>当前位置分析：</strong></div>
                <div>• 点击位置: x = ${x.toFixed(3)}</div>
                <div>• 对应光强: I<sub>0</sub>(x) = ${nearestIntensity.toFixed(6)}</div>
                <div>• 曝光剂量: D<sub>0</sub>(x) = ${exposureDose.toFixed(2)}</div>
                <div>• 蚀刻深度: H(x) = ${theoreticalThickness.toFixed(6)}</div>
                <div class="formula-separator"></div>
                <div>💡 <strong>计算说明：</strong></div>
                <div>• 步骤1: 根据自定义光强计算曝光剂量</div>
                <div>• 步骤2: 判断是否超过曝光阈值</div>
                <div>• 步骤3: 计算最终蚀刻深度</div>
            `;
        } else if (isIdealExposureModel) {
            // 理想曝光模型的蚀刻深度公式
            valueLabel = '蚀刻深度:';
            valueUnit = '(归一化)';
            formulaTitle = '1D DILL模型 - 理想曝光蚀刻深度计算：';
            formulaMath = '<div style="margin-bottom: 8px;"><strong>步骤1:</strong> D<sub>0</sub>(x) = I<sub>0</sub>(x) × t<sub>exp</sub></div>';
            formulaMath += '<div style="margin-bottom: 8px;"><strong>步骤2:</strong> 阈值判断与抗蚀效果计算</div>';
            formulaMath += '<div style="margin-left: 20px; margin-bottom: 4px;">if D<sub>0</sub>(x) < c<sub>d</sub>: M(x) = 1 (未曝光)</div>';
            formulaMath += '<div style="margin-left: 20px; margin-bottom: 8px;">else: M(x) = e<sup>-C × (D<sub>0</sub>(x) - c<sub>d</sub>)</sup></div>';
            formulaMath += '<div><strong>步骤3:</strong> H(x) = 1 - M(x) (蚀刻深度)</div>';
            
            // 获取实际参数值并计算当前点
            // 🔥 修复：统一参数获取逻辑，确保从正确的源获取参数
            const iAvg = params.I_avg || 1.0;  // 🔧 修复：使用用户输入的I_avg参数
            const exposureConstant = params.C || 0.022;
            const thresholdCd = params.exposure_threshold || 20;
            const visibilityParam = params.V || 1;
            const angleParam = params.angle_a || 11.7;
            const currentX_um = x * 1000;
            // 🔧 修复：优先从API响应的parameters字段获取波长参数
            const wavelength = (params.parameters && params.parameters.wavelength_nm) || params.wavelength || 405; // nm，优先使用API返回的实际波长
            const spatialFreq = 4 * Math.PI * Math.sin(angleParam * Math.PI / 180) / wavelength;
            const currentPhase = spatialFreq * currentX_um;
            const I0_at_x = iAvg * (1 + visibilityParam * Math.cos(currentPhase));  // 🔧 修复：使用I_avg而不是0.5
            
            // 使用当前单个曝光时间计算剂量和效果
            const t_exp = params.t_exp || 100;
            const D0_at_x = I0_at_x * t_exp;
            let calculationDetails = '';
            
            let M_at_x, H_at_x;
            
            if (D0_at_x < thresholdCd) {
                M_at_x = 1;
                H_at_x = 0;
            } else {
                M_at_x = Math.exp(-exposureConstant * (D0_at_x - thresholdCd));
                H_at_x = 1 - M_at_x;
            }
            
            calculationDetails += `<div style="margin: 5px 0; padding: 5px; background: rgba(0,0,0,0.05); border-radius: 3px;">`;
            calculationDetails += `<strong>t=${t_exp}s:</strong> `;
            calculationDetails += `D₀=${D0_at_x.toFixed(2)}, `;
            calculationDetails += `${D0_at_x < thresholdCd ? '未达阈值' : '超过阈值'}, `;
            calculationDetails += `M=${M_at_x.toFixed(4)}, H=${H_at_x.toFixed(4)}`;
            calculationDetails += `</div>`;
            
            formulaExplanation = `
                <div>🔬 <strong>DILL模型阈值机制参数：</strong></div>
                <div>• I<sub>avg</sub>: 平均入射光强度 (${iAvg} mW/cm²)</div>
                <div>• C: 光敏速率常数 (${exposureConstant} cm²/mJ)</div>
                <div>• c<sub>d</sub>: 曝光阈值 (${thresholdCd} mJ/cm²)</div>
                <div>• V: 干涉条纹可见度 (${visibilityParam})</div>
                <div>• a: 周期 (${angleParam}°)</div>
                <div class="formula-separator"></div>
                <div>📍 <strong>当前位置 x=${x.toFixed(3)}mm 的计算：</strong></div>
                <div>• I<sub>0</sub>(x): 该点光强 = ${I0_at_x.toFixed(6)} mW/cm²</div>
                <div>• H(x): 形貌深度 (当前值: ${y.toFixed(6)})</div>
                <div class="formula-separator"></div>
                <div>⚙️ <strong>不同曝光时间下的计算示例：</strong></div>
                ${calculationDetails}
                <div class="formula-separator"></div>
                <div>📖 <strong>物理意义：</strong></div>
                <div>• M=1: 完全抗蚀（未曝光状态）</div>
                <div>• M=0: 完全溶解（完全曝光状态）</div>
                <div>• c<sub>d</sub>为临界剂量阈值，低于此值不发生反应</div>
                <div>• 超过阈值后按指数规律衰减</div>
            `;
        } else {
            // 传统Dill模型公式
            console.log('🔧 厚度图 - 进入: 标准模式');
            valueLabel = '光刻胶厚度:';
            valueUnit = '(归一化)';
            formulaTitle = 'Dill模型光刻胶厚度计算：';
            
            // 检查是否有多维数据，确定计算公式
            if (params.sine_type === 'multi') {
                formulaMath = 'M(x,y) = e<sup>-C × D(x,y)</sup>';
                formulaMath += '<br>D(x,y) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + φ))';
            } else if (params.sine_type === '3d') {
                formulaMath = 'M(x,y,z) = e<sup>-C × D(x,y,z)</sup>';
                formulaMath += '<br>D(x,y,z) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ))';
            } else {
                formulaMath = 'M(x) = e<sup>-C × D(x)</sup>';
            }
            
            formulaExplanation = `
                <div>• C: 光敏速率常数 (${params.C} cm²<span class="fraction"><span class="numerator">1</span><span class="denominator">mJ</span></span>)</div>
                <div>• D(x): 该点曝光剂量 (${y.toFixed(3)} mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>)</div>
            `;
        }
    }
    
    return `
        <div class="point-info-section">
            <h4>🎯 ${LANGS[currentLang].popup_section_location || '位置信息'}</h4>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">X:</span>
                    <span class="info-value">${x.toFixed(3)} mm</span>
                </div>
                <div class="info-item">
                    <span class="info-label">${valueLabel}</span>
                    <span class="info-value">${y.toFixed(3)} ${valueUnit}</span>
                </div>
            </div>
        </div>
        <div class="point-info-section">
            <h4>📋 ${LANGS[currentLang].popup_section_params_dill || '参数组'}: ${setName} (${isUsingCustomData ? '自定义向量DILL模型' : isIdealExposureModel ? 'DILL模型' : 'Dill模型'})</h4>
            <div class="info-grid responsive-grid">
                ${isUsingCustomData ? `
                <div class="info-item"><span class="info-label">数据来源:</span><span class="info-value">自定义向量</span></div>
                <div class="info-item"><span class="info-label">数据点数:</span><span class="info-value">${customIntensityData.x ? customIntensityData.x.length : 0} 个</span></div>
                <div class="info-item"><span class="info-label">X范围:</span><span class="info-value">[${customIntensityData.x ? Math.min(...customIntensityData.x).toFixed(3) : 0}, ${customIntensityData.x ? Math.max(...customIntensityData.x).toFixed(3) : 0}]</span></div>
                <div class="info-item"><span class="info-label">光强范围:</span><span class="info-value">[${customIntensityData.intensity ? Math.min(...customIntensityData.intensity).toFixed(3) : 0}, ${customIntensityData.intensity ? Math.max(...customIntensityData.intensity).toFixed(3) : 0}]</span></div>
                <div class="info-item"><span class="info-label">C常数:</span><span class="info-value">${params.C || 0.022}</span></div>
                <div class="info-item"><span class="info-label">阈值(cd):</span><span class="info-value">${params.exposure_threshold || 20}</span></div>
                <div class="info-item"><span class="info-label">曝光时间:</span><span class="info-value">${params.t_exp || 100} s</span></div>
                ` : isIdealExposureModel ? `
                <div class="info-item"><span class="info-label">干涉条纹可见度(V):</span><span class="info-value">${params.V || 1}</span></div>
                <div class="info-item"><span class="info-label">周期(a):</span><span class="info-value">${params.angle_a || 11.7}°</span></div>
                <div class="info-item"><span class="info-label">波长(λ):</span><span class="info-value">${(params.parameters && params.parameters.wavelength_nm) || params.wavelength || 405} nm</span></div>
                <div class="info-item"><span class="info-label">C常数:</span><span class="info-value">${params.C || 0.022}</span></div>
                <div class="info-item"><span class="info-label">阈值(cd):</span><span class="info-value">${params.exposure_threshold || 20}</span></div>
                <div class="info-item"><span class="info-label">曝光时间:</span><span class="info-value">${params.t_exp || 'varies'} s</span></div>
                ` : `
                <div class="info-item"><span class="info-label">I_avg:</span><span class="info-value">${params.I_avg} mW/cm²</span></div>
                <div class="info-item"><span class="info-label">V:</span><span class="info-value">${params.V}</span></div>
                ${params.sine_type === 'multi' ? `
                <div class="info-item"><span class="info-label">Kx:</span><span class="info-value">${params.Kx}</span></div>
                <div class="info-item"><span class="info-label">Ky:</span><span class="info-value">${params.Ky}</span></div>
                <div class="info-item"><span class="info-label">φ(t):</span><span class="info-value">${params.phi_expr}</span></div>
                ` : params.sine_type === '3d' ? `
                <div class="info-item"><span class="info-label">Kx:</span><span class="info-value">${params.Kx}</span></div>
                <div class="info-item"><span class="info-label">Ky:</span><span class="info-value">${params.Ky}</span></div>
                <div class="info-item"><span class="info-label">Kz:</span><span class="info-value">${params.Kz}</span></div>
                <div class="info-item"><span class="info-label">φ(t):</span><span class="info-value">${params.phi_expr}</span></div>
                ` : `
                <div class="info-item"><span class="info-label">K:</span><span class="info-value">${params.K}</span></div>
                `}
                <div class="info-item"><span class="info-label">t_exp:</span><span class="info-value">${params.t_exp} s</span></div>
                <div class="info-item"><span class="info-label">C:</span><span class="info-value">${params.C}</span></div>
                `}
            </div>
        </div>
        <div class="point-info-section">
            <h4>🧮 ${LANGS[currentLang].popup_section_formula || '计算公式 (核心)'}</h4>
            <div class="formula-container">
                <div class="formula-title">${formulaTitle}</div>
                <div class="formula-math">${formulaMath}</div>
                <div class="formula-explanation">${formulaExplanation}</div>
            </div>
        </div>
    `;
}

// 为增强Dill模型生成弹窗HTML的辅助函数
function getEnhancedDillPopupHtmlContent(x, y, setName, params, plotType) {
    let valueLabel = '';
    let valueUnit = '';
    let formulaTitle = '';
    let formulaMath = '';
    let formulaExplanation = '';
    let additionalInfo = '';

    if (plotType === 'exposure') {
        valueLabel = '曝光剂量:';
        valueUnit = 'mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>';
        formulaTitle = '增强Dill模型曝光剂量计算：';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi') {
            formulaMath = 'D(x,y,z) = ∫ I(x,y,z,t) dt';
            formulaMath += '<br>I(x,y,z) = I<sub>0</sub> × (1 + V × cos(Kx·x + Ky·y + φ)) × e<sup>-∫[A(z_h,T,t_B)·M+B(z_h,T,t_B)]dz</sup>';
            formulaExplanation = `
                <div>• I<sub>0</sub>: 初始光强度 (${params.I0})</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• Kx: x方向空间频率 (${params.Kx} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• φ: 相位值 (${params.phi_expr})</div>
                <div>• z_h: 胶厚 (${params.z_h} μm)</div>
                <div>• T: 前烘温度 (${params.T} °C)</div>
                <div>• t_B: 前烘时间 (${params.t_B} min)</div>
                <div>• A(z_h,T,t_B): 光敏吸收率，与胶厚、前烘温度、前烘时间相关</div>
                <div>• B(z_h,T,t_B): 基底吸收率，与胶厚、前烘温度、前烘时间相关</div>
            `;
        } else if (params.sine_type === '3d') {
            formulaMath = 'D(x,y,z) = ∫ I(x,y,z,t) dt';
            formulaMath += '<br>I(x,y,z) = I<sub>0</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ)) × e<sup>-∫[A(z_h,T,t_B)·M+B(z_h,T,t_B)]dz</sup>';
            formulaExplanation = `
                <div>• I<sub>0</sub>: 初始光强度 (${params.I0})</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• Kx: x方向空间频率 (${params.Kx} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• Kz: z方向空间频率 (${params.Kz} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• φ: 相位值 (${params.phi_expr})</div>
                <div>• z_h: 胶厚 (${params.z_h} μm)</div>
                <div>• T: 前烘温度 (${params.T} °C)</div>
                <div>• t_B: 前烘时间 (${params.t_B} min)</div>
                <div>• A(z_h,T,t_B): 光敏吸收率，与胶厚、前烘温度、前烘时间相关</div>
                <div>• B(z_h,T,t_B): 基底吸收率，与胶厚、前烘温度、前烘时间相关</div>
            `;
        } else {
            formulaMath = 'D(x,z) = ∫ I(x,z,t) dt';
            formulaMath += '<br>I(x,z) = I<sub>0</sub> × (1 + V × cos(K·x)) × e<sup>-∫[A(z_h,T,t_B)·M+B(z_h,T,t_B)]dz</sup>';
            formulaExplanation = `
                <div>• I<sub>0</sub>: 初始光强度 (${params.I0})</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• K: 空间频率 (${params.K} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• z_h: 胶厚 (${params.z_h} μm)</div>
                <div>• T: 前烘温度 (${params.T} °C)</div>
                <div>• t_B: 前烘时间 (${params.t_B} min)</div>
                <div>• A(z_h,T,t_B): 光敏吸收率，与胶厚、前烘温度、前烘时间相关</div>
                <div>• B(z_h,T,t_B): 基底吸收率，与胶厚、前烘温度、前烘时间相关</div>
            `;
        }
        
                 // 计算当前点的光强和相位（根据波形类型）
         let currentIntensity = 0;
         let phaseValue = 0;
         
         if (params.sine_type === 'multi') {
             phaseValue = params.Kx * x + (params.Ky || 0) * 0; // y坐标在这里不可用，假设为0
             currentIntensity = params.I0 * (1 + params.V * Math.cos(phaseValue));
         } else if (params.sine_type === '3d') {
             phaseValue = params.Kx * x + (params.Ky || 0) * 0 + (params.Kz || 0) * 0; // y,z坐标在这里不可用
             currentIntensity = params.I0 * (1 + params.V * Math.cos(phaseValue));
         } else {
             phaseValue = params.K * x;
             currentIntensity = params.I0 * (1 + params.V * Math.cos(phaseValue));
         }
         
         additionalInfo = `
             <div class="point-info-section">
                 <h4>📈 ${LANGS[currentLang].popup_section_calculated_values || '计算值详情'}</h4>
                 <div class="info-grid responsive-grid">
                     <div class="info-item"><span class="info-label">当前光强 I(x,z):</span><span class="info-value">${currentIntensity.toFixed(3)} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span></span></div>
                     <div class="info-item"><span class="info-label">该点曝光剂量:</span><span class="info-value">${y.toFixed(3)} mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span></span></div>
                     <div class="info-item"><span class="info-label">曝光时间:</span><span class="info-value">${params.t_exp} s</span></div>
                     <div class="info-item"><span class="info-label">干涉条纹相位:</span><span class="info-value">${phaseValue.toFixed(3)} rad</span></div>
                     <div class="info-item"><span class="info-label">A,B,C参数:</span><span class="info-value">由z_h=${params.z_h}μm, T=${params.T}°C, t_B=${params.t_B}min决定</span></div>
                 </div>
             </div>
         `;
        
    } else if (plotType === 'thickness') {
        valueLabel = '光刻胶厚度:';
        valueUnit = '(归一化)';
        formulaTitle = '增强Dill模型光刻胶厚度计算：';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi') {
            formulaMath = '∂M/∂t = -I(x,y,z)·M·C(z_h,T,t_B)';
            formulaMath += '<br>M(x,y,z) = M<sub>0</sub> × e<sup>-C(z_h,T,t_B) × D(x,y,z)</sup>';
            formulaMath += '<br>I(x,y,z) = I<sub>0</sub> × (1 + V × cos(Kx·x + Ky·y + φ)) × e<sup>-∫[A·M+B]dz</sup>';
        } else if (params.sine_type === '3d') {
            formulaMath = '∂M/∂t = -I(x,y,z)·M·C(z_h,T,t_B)';
            formulaMath += '<br>M(x,y,z) = M<sub>0</sub> × e<sup>-C(z_h,T,t_B) × D(x,y,z)</sup>';
            formulaMath += '<br>I(x,y,z) = I<sub>0</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ)) × e<sup>-∫[A·M+B]dz</sup>';
        } else {
            formulaMath = '∂M/∂t = -I(x,z)·M·C(z_h,T,t_B)';
            formulaMath += '<br>M(x,z) = M<sub>0</sub> × e<sup>-C(z_h,T,t_B) × D(x,z)</sup>';
        }
        
        formulaExplanation = `
            <div>• M<sub>0</sub>: 初始PAC浓度 (${params.M0})</div>
            <div>• C(z_h,T,t_B): 光敏速率常数，与胶厚、前烘温度、前烘时间相关</div>
            <div>• D(x,z): 该点曝光剂量</div>
            <div>• z_h: 胶厚 (${params.z_h} μm)</div>
            <div>• T: 前烘温度 (${params.T} °C)</div>
            <div>• t_B: 前烘时间 (${params.t_B} min)</div>
            ${params.sine_type === 'multi' || params.sine_type === '3d' ? 
                `<div>• Kx: X方向空间频率 (${params.Kx} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                <div>• Ky: Y方向空间频率 (${params.Ky} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
                ${params.sine_type === '3d' ? `<div>• Kz: Z方向空间频率 (${params.Kz} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>` : ''}
                <div>• φ: 相位表达式 (${params.phi_expr || '0'})</div>` : 
                `<div>• K: 空间频率 (${params.K} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>`
            }
        `;
        
                 // 计算当前点的厚度相关参数（根据波形类型）
         let thicknessPhaseValue = 0;
         let exposureDoseAtPoint = 0;
         
         if (params.sine_type === 'multi') {
             thicknessPhaseValue = params.Kx * x + (params.Ky || 0) * 0; // y坐标在这里不可用
             exposureDoseAtPoint = params.I0 * params.t_exp * (1 + params.V * Math.cos(thicknessPhaseValue));
         } else if (params.sine_type === '3d') {
             thicknessPhaseValue = params.Kx * x + (params.Ky || 0) * 0 + (params.Kz || 0) * 0; // y,z坐标在这里不可用
             exposureDoseAtPoint = params.I0 * params.t_exp * (1 + params.V * Math.cos(thicknessPhaseValue));
         } else {
             thicknessPhaseValue = params.K * x;
             exposureDoseAtPoint = params.I0 * params.t_exp * (1 + params.V * Math.cos(thicknessPhaseValue));
         }
         
         additionalInfo = `
             <div class="point-info-section">
                 <h4>📈 ${LANGS[currentLang].popup_section_calculated_values || '计算值详情'}</h4>
                 <div class="info-grid responsive-grid">
                     <div class="info-item"><span class="info-label">该点厚度值:</span><span class="info-value">${y.toFixed(3)} (归一化)</span></div>
                     <div class="info-item"><span class="info-label">初始PAC浓度:</span><span class="info-value">${params.M0}</span></div>
                     <div class="info-item"><span class="info-label">该点曝光剂量:</span><span class="info-value">${exposureDoseAtPoint.toFixed(3)} mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span></span></div>
                     <div class="info-item"><span class="info-label">光敏速率:</span><span class="info-value">C(${params.z_h},${params.T},${params.t_B})</span></div>
                     <div class="info-item"><span class="info-label">干涉条纹相位:</span><span class="info-value">${thicknessPhaseValue.toFixed(3)} rad</span></div>
                     <div class="info-item"><span class="info-label">厚度变化:</span><span class="info-value">M = ${params.M0} × e^(-C×${exposureDoseAtPoint.toFixed(3)})</span></div>
                 </div>
             </div>
         `;
        
    } else if (plotType === 'heatmap') {
        valueLabel = '曝光剂量:';
        valueUnit = 'mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>';
        formulaTitle = '增强Dill模型二维曝光剂量:';
        formulaMath = 'D(x,y,z) = ∫ I(x,y,z,t) dt';
        formulaMath += '<br>I(x,y,z) = I<sub>0</sub> × (1 + V × cos(Kx·x + Ky·y + φ)) × e<sup>-∫[A·M+B]dz</sup>';
        
        formulaExplanation = `
            <div>• I<sub>0</sub>: 初始光强度 (${params.I0})</div>
            <div>• V: 干涉条纹可见度 (${params.V})</div>
            <div>• Kx: X方向空间频率 (${params.Kx || params.K} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
            <div>• Ky: Y方向空间频率 (${params.Ky || 'N/A'} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
            <div>• φ: 相位表达式 (${params.phi_expr || '0'})</div>
            <div>• z_h: 胶厚 (${params.z_h} μm)</div>
            <div>• T: 前烘温度 (${params.T} °C)</div>
            <div>• t_B: 前烘时间 (${params.t_B} min)</div>
            <div>• A,B,C: 与胶厚、前烘温度、前烘时间相关的参数</div>
        `;
        
    } else if (plotType === 'surface3d') {
        valueLabel = '值:';
        valueUnit = '';
        formulaTitle = '增强Dill模型三维分布:';
        formulaMath = '∂I/∂z = -I·[A(z_h,T,t_B)·M+B(z_h,T,t_B)]<br>∂M/∂t = -I·M·C(z_h,T,t_B)';
        formulaMath += '<br>I(x,y,z) = I<sub>0</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ)) × e<sup>-∫[A·M+B]dz</sup>';
        
        formulaExplanation = `
            <div>• z_h: 胶厚 (${params.z_h} µm)</div>
            <div>• T: 前烘温度 (${params.T} °C)</div>
            <div>• t_B: 前烘时间 (${params.t_B} min)</div>
            <div>• I<sub>0</sub>: 初始光强 (${params.I0})</div>
            <div>• M<sub>0</sub>: 初始PAC浓度 (${params.M0})</div>
            <div>• V: 干涉条纹可见度 (${params.V})</div>
            <div>• Kx: X方向空间频率 (${params.Kx} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
            <div>• Ky: Y方向空间频率 (${params.Ky} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
            <div>• Kz: Z方向空间频率 (${params.Kz} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span>)</div>
            <div>• φ: 相位表达式 (${params.phi_expr || '0'})</div>
            <div>• A(z_h,T,t_B): 光敏吸收率，与胶厚、前烘温度、前烘时间相关</div>
            <div>• B(z_h,T,t_B): 基底吸收率，与胶厚、前烘温度、前烘时间相关</div>
            <div>• C(z_h,T,t_B): 光敏速率常数，与胶厚、前烘温度、前烘时间相关</div>
        `;
        
        if (plotType.includes('thickness')) {
            valueUnit = '(归一化)';
        }
    }
    
    return `
        <div class="point-info-section">
            <h4>🎯 ${LANGS[currentLang].popup_section_location || '位置信息'}</h4>
            <div class="info-grid">
                <div class="info-item"><span class="info-label">X:</span><span class="info-value">${x.toFixed(3)} µm</span></div>
                <div class="info-item"><span class="info-label">${valueLabel}</span><span class="info-value">${y.toFixed(3)} ${valueUnit}</span></div>
            </div>
        </div>
        <div class="point-info-section">
            <h4>📋 ${LANGS[currentLang].popup_section_params_enhanced || '参数组: 增强Dill模型'}</h4>
            <div class="info-grid responsive-grid">
                <div class="info-item"><span class="info-label">z_h:</span><span class="info-value">${params.z_h} µm</span></div>
                <div class="info-item"><span class="info-label">T:</span><span class="info-value">${params.T} °C</span></div>
                <div class="info-item"><span class="info-label">t_B:</span><span class="info-value">${params.t_B} min</span></div>
                <div class="info-item"><span class="info-label">I<sub>0</sub>:</span><span class="info-value">${params.I0}</span></div>
                <div class="info-item"><span class="info-label">M<sub>0</sub>:</span><span class="info-value">${params.M0}</span></div>
                <div class="info-item"><span class="info-label">t<sub>exp</sub>:</span><span class="info-value">${params.t_exp} s</span></div>
                <div class="info-item"><span class="info-label">V:</span><span class="info-value">${params.V}</span></div>
                ${params.sine_type === 'multi' ? `
                <div class="info-item"><span class="info-label">Kx:</span><span class="info-value">${params.Kx}</span></div>
                <div class="info-item"><span class="info-label">Ky:</span><span class="info-value">${params.Ky}</span></div>
                <div class="info-item"><span class="info-label">φ(t):</span><span class="info-value">${params.phi_expr}</span></div>
                ` : params.sine_type === '3d' ? `
                <div class="info-item"><span class="info-label">Kx:</span><span class="info-value">${params.Kx}</span></div>
                <div class="info-item"><span class="info-label">Ky:</span><span class="info-value">${params.Ky}</span></div>
                <div class="info-item"><span class="info-label">Kz:</span><span class="info-value">${params.Kz}</span></div>
                <div class="info-item"><span class="info-label">φ(t):</span><span class="info-value">${params.phi_expr}</span></div>
                ` : `
                <div class="info-item"><span class="info-label">K:</span><span class="info-value">${params.K}</span></div>
                `}
            </div>
        </div>
        <div class="point-info-section">
            <h4>🧮 ${LANGS[currentLang].popup_section_formula || '计算公式 (核心)'}</h4>
            <div class="formula-container">
                <div class="formula-title">${formulaTitle}</div>
                <div class="formula-math">${formulaMath}</div>
                <div class="formula-explanation">${formulaExplanation}</div>
            </div>
        </div>
        ${additionalInfo}
    `;
}

// 为CAR模型生成弹窗HTML的辅助函数
function getCarPopupHtmlContent(x, y, setName, params, plotType) {
    let valueLabel = '';
    let valueUnit = '';
    let formulaTitle = '';
    let formulaMath = '';
    let formulaExplanation = '';
    
    if (plotType === 'exposure') {
        valueLabel = '光酸浓度:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型光酸生成计算:';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi') {
            formulaMath = '[H<sup>+</sup>] = η × D(x,y)';
            formulaMath += '<br>D(x,y) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + φ))';
            formulaExplanation = `
                <div>• η: 光酸产生效率 (${params.acid_gen_efficiency})</div>
                <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW/cm²)</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
                <div>• φ: 相位值 (${params.phi_expr || '0'})</div>
                <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
            `;
        } else if (params.sine_type === '3d') {
            formulaMath = '[H<sup>+</sup>] = η × D(x,y,z)';
            formulaMath += '<br>D(x,y,z) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ))';
            formulaExplanation = `
                <div>• η: 光酸产生效率 (${params.acid_gen_efficiency})</div>
                <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW/cm²)</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
                <div>• Kz: z方向空间频率 (${params.Kz} rad/μm)</div>
                <div>• φ: 相位值 (${params.phi_expr || '0'})</div>
                <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
            `;
        } else {
            // 1D模式：增加详细的计算过程
            formulaMath = '[H<sup>+</sup>] = η × D(x)';
            formulaMath += '<br>D(x) = I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(K·x))';
            formulaExplanation = `
                <div>• η: 光酸产生效率 (${params.acid_gen_efficiency})</div>
                <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW/cm²)</div>
                <div>• V: 干涉条纹可见度 (${params.V})</div>
                <div>• K: 空间频率 (${params.K} rad/μm)</div>
                <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
            `;
        }
        
        // 为1D模式添加详细的计算值信息
        if (!params.sine_type || params.sine_type === '1d') {
            // 计算当前点的光强和相位
            let phaseValue = params.K * x;
            let currentIntensity = params.I_avg * (1 + params.V * Math.cos(phaseValue));
            let exposureDoseAtPoint = currentIntensity * params.t_exp;
            let acidConcentration = params.acid_gen_efficiency * exposureDoseAtPoint;
            
            additionalInfo = `
                <div class="point-info-section">
                    <h4>📈 计算值详情</h4>
                    <div class="info-grid responsive-grid">
                        <div class="info-item"><span class="info-label">当前光强 I(x):</span><span class="info-value">${currentIntensity.toFixed(3)} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span></span></div>
                        <div class="info-item"><span class="info-label">该点曝光剂量:</span><span class="info-value">${exposureDoseAtPoint.toFixed(3)} mJ<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span></span></div>
                        <div class="info-item"><span class="info-label">该点光酸浓度:</span><span class="info-value">${y.toFixed(3)} (归一化)</span></div>
                        <div class="info-item"><span class="info-label">干涉条纹相位:</span><span class="info-value">${phaseValue.toFixed(3)} rad</span></div>
                        <div class="info-item"><span class="info-label">光酸生成过程:</span><span class="info-value">[H⁺] = ${params.acid_gen_efficiency} × ${exposureDoseAtPoint.toFixed(3)}</span></div>
                        <div class="info-item"><span class="info-label">CAR模型阶段:</span><span class="info-value">1. 曝光 → 2. 光酸生成</span></div>
                    </div>
                </div>
            `;
        }
    } else if (plotType === 'thickness') {
        valueLabel = '光刻胶厚度:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型脱保护度计算:';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi' || params.sine_type === '3d') {
            const dimText = params.sine_type === 'multi' ? '(x,y)' : '(x,y,z)';
            formulaMath = `M${dimText} = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>`;
            formulaExplanation = `
                <div>• k: 反应速率常数 (${params.reaction_rate})</div>
                <div>• [H⁺]<sub>diff</sub>: 扩散后光酸浓度</div>
                <div>• A: 放大因子 (${params.amplification})</div>
                <div>• 对比度: γ = ${params.contrast}</div>
                ${params.sine_type === 'multi' ? `
                <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
                <div>• φ: 相位值 (${params.phi_expr || '0'})</div>` : `
                <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
                <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
                <div>• Kz: z方向空间频率 (${params.Kz} rad/μm)</div>
                <div>• φ: 相位值 (${params.phi_expr || '0'})</div>`}
            `;
        } else {
            // 1D模式：增加详细的计算过程
            formulaMath = 'M(x) = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
            formulaMath += '<br>厚度(x) = M(x)<sup>γ</sup>';
            formulaExplanation = `
                <div>• k: 反应速率常数 (${params.reaction_rate})</div>
                <div>• [H⁺]<sub>diff</sub>: 扩散后光酸浓度</div>
                <div>• A: 放大因子 (${params.amplification})</div>
                <div>• γ: 对比度因子 (${params.contrast})</div>
                <div>• l<sub>diff</sub>: 扩散长度 (${params.diffusion_length} μm)</div>
            `;
        }
        
        // 为1D模式添加详细的计算值信息
        if (!params.sine_type || params.sine_type === '1d') {
            // 计算当前点的完整CAR过程
            let phaseValue = params.K * x;
            let currentIntensity = params.I_avg * (1 + params.V * Math.cos(phaseValue));
            let exposureDoseAtPoint = currentIntensity * params.t_exp;
            let initialAcidConcentration = params.acid_gen_efficiency * exposureDoseAtPoint;
            // 简化扩散计算（实际扩散是高斯滤波）
            let diffusedAcidConcentration = initialAcidConcentration; // 简化显示
            let deprotectionDegree = 1 - Math.exp(-params.reaction_rate * diffusedAcidConcentration * params.amplification);
            let finalThickness = Math.pow(deprotectionDegree, params.contrast);
            
            additionalInfo = `
                <div class="point-info-section">
                    <h4>📈 计算值详情</h4>
                    <div class="info-grid responsive-grid">
                        <div class="info-item"><span class="info-label">该点厚度值:</span><span class="info-value">${y.toFixed(3)} (归一化)</span></div>
                        <div class="info-item"><span class="info-label">脱保护度:</span><span class="info-value">${deprotectionDegree.toFixed(3)}</span></div>
                        <div class="info-item"><span class="info-label">初始光酸浓度:</span><span class="info-value">${initialAcidConcentration.toFixed(3)}</span></div>
                        <div class="info-item"><span class="info-label">扩散后光酸浓度:</span><span class="info-value">${diffusedAcidConcentration.toFixed(3)}</span></div>
                        <div class="info-item"><span class="info-label">干涉条纹相位:</span><span class="info-value">${phaseValue.toFixed(3)} rad</span></div>
                        <div class="info-item"><span class="info-label">化学放大过程:</span><span class="info-value">M = 1-e^(-${params.reaction_rate}×${diffusedAcidConcentration.toFixed(3)}×${params.amplification})</span></div>
                        <div class="info-item"><span class="info-label">厚度计算:</span><span class="info-value">厚度 = ${deprotectionDegree.toFixed(3)}^${params.contrast}</span></div>
                        <div class="info-item"><span class="info-label">CAR模型阶段:</span><span class="info-value">1. 曝光 → 2. 光酸生成 → 3. 扩散 → 4. 脱保护 → 5. 显影</span></div>
                    </div>
                </div>
            `;
        }
    } else if (plotType === 'car_acid_concentration') {
        valueLabel = '光酸浓度:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型过程模拟:';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi') {
            formulaMath = '[H⁺] = η·D(x,y)<br>扩散: [H⁺]<sub>diff</sub> = G([H⁺], l<sub>diff</sub>)<br>M = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        } else if (params.sine_type === '3d') {
            formulaMath = '[H⁺] = η·D(x,y,z)<br>扩散: [H⁺]<sub>diff</sub> = G([H⁺], l<sub>diff</sub>)<br>M = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        } else {
            formulaMath = '[H⁺] = η·D(x)<br>扩散: [H⁺]<sub>diff</sub> = G([H⁺], l<sub>diff</sub>)<br>M = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        }
        
        formulaExplanation = `
            <div>• 扩散长度: ${params.diffusion_length} μm</div>
            <div>• 光酸产生效率: ${params.acid_gen_efficiency}</div>
            ${params.sine_type === 'multi' || params.sine_type === '3d' ? `
            <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
            <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
            ${params.sine_type === '3d' ? `<div>• Kz: z方向空间频率 (${params.Kz} rad/μm)</div>` : ''}
            <div>• φ: 相位值 (${params.phi_expr || '0'})</div>` : ''}
        `;
    } else if (plotType === 'car_deprotection_degree') {
        valueLabel = '脱保护度:';
        valueUnit = '(0-1)';
        formulaTitle = 'CAR模型脱保护度:';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi') {
            formulaMath = 'M(x,y) = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        } else if (params.sine_type === '3d') {
            formulaMath = 'M(x,y,z) = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        } else {
            formulaMath = 'M = 1-e<sup>-k·[H⁺]<sub>diff</sub>·A</sup>';
        }
        
        formulaExplanation = `
            <div>• k: 反应速率 (${params.reaction_rate})</div>
            <div>• A: 放大因子 (${params.amplification})</div>
            ${params.sine_type === 'multi' || params.sine_type === '3d' ? `
            <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
            <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
            ${params.sine_type === '3d' ? `<div>• Kz: z方向空间频率 (${params.Kz} rad/μm)</div>` : ''}
            <div>• φ: 相位值 (${params.phi_expr || '0'})</div>` : ''}
        `;
    } else if (plotType === 'car_thickness') {
        valueLabel = '光刻胶厚度:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型厚度计算:';
        
        // 根据波形类型显示不同公式
        if (params.sine_type === 'multi') {
            formulaMath = '厚度(x,y) = f(M, γ) = M<sup>γ</sup>';
        } else if (params.sine_type === '3d') {
            formulaMath = '厚度(x,y,z) = f(M, γ) = M<sup>γ</sup>';
        } else {
            formulaMath = '厚度 = f(M, γ) = M<sup>γ</sup>';
        }
        
        formulaExplanation = `
            <div>• M: 脱保护度</div>
            <div>• γ: 对比度因子 (${params.contrast})</div>
            ${params.sine_type === 'multi' || params.sine_type === '3d' ? `
            <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
            <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
            ${params.sine_type === '3d' ? `<div>• Kz: z方向空间频率 (${params.Kz} rad/μm)</div>` : ''}
            <div>• φ: 相位值 (${params.phi_expr || '0'})</div>` : ''}
        `;
    } else if (plotType === 'heatmap') {
        valueLabel = '值:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型二维分布:';
        formulaMath = '[H<sup>+</sup>](x,y) = η × I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + φ))';
        formulaMath += '<br>扩散: [H⁺]<sub>diff</sub>(x,y) = G([H⁺], l<sub>diff</sub>)';
        formulaMath += '<br>M(x,y) = 1-e<sup>-k·[H⁺]<sub>diff</sub>(x,y)·A</sup>';
        
        formulaExplanation = `
            <div>• I<sub>avg</sub>: 平均光强度 (${params.I_avg} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span>)</div>
            <div>• t<sub>exp</sub>: 曝光时间 (${params.t_exp} s)</div>
            <div>• η: 光酸产生效率 (${params.acid_gen_efficiency})</div>
            <div>• l<sub>diff</sub>: 扩散长度 (${params.diffusion_length} μm)</div>
            <div>• Kx: x方向空间频率 (${params.Kx || params.K} rad/μm)</div>
            <div>• Ky: y方向空间频率 (${params.Ky || 'N/A'} rad/μm)</div>
            <div>• φ: 相位值 (${params.phi_expr || '0'})</div>
        `;
    } else if (plotType === 'surface3d') {
        valueLabel = '值:';
        valueUnit = '(归一化)';
        formulaTitle = 'CAR模型三维分布:';
        formulaMath = '[H<sup>+</sup>](x,y,z) = η × I<sub>avg</sub> × t<sub>exp</sub> × (1 + V × cos(Kx·x + Ky·y + Kz·z + φ))';
        formulaMath += '<br>扩散: [H⁺]<sub>diff</sub>(x,y,z) = G([H⁺], l<sub>diff</sub>)';
        formulaMath += '<br>M(x,y,z) = 1-e<sup>-k·[H⁺]<sub>diff</sub>(x,y,z)·A</sup>';
        
        formulaExplanation = `
            <div>• η: 光酸产生效率 (${params.acid_gen_efficiency})</div>
            <div>• l<sub>diff</sub>: 扩散长度 (${params.diffusion_length} μm)</div>
            <div>• k: 反应速率 (${params.reaction_rate})</div>
            <div>• A: 放大因子 (${params.amplification})</div>
            <div>• γ: 对比度 (${params.contrast})</div>
            <div>• Kx: x方向空间频率 (${params.Kx} rad/μm)</div>
            <div>• Ky: y方向空间频率 (${params.Ky} rad/μm)</div>
            <div>• Kz: z方向空间频率 (${params.Kz} rad/μm)</div>
                        <div>• φ: 相位值 (${params.phi_expr || '0'})</div>
        `;
    }
     
    return `
        <div class="point-info-section">
            <h4>🎯 位置信息</h4>
            <div class="info-grid">
                <div class="info-item"><span class="info-label">X:</span><span class="info-value">${x.toFixed(3)} μm</span></div>
                <div class="info-item"><span class="info-label">${valueLabel}</span><span class="info-value">${y.toFixed(3)} ${valueUnit}</span></div>
            </div>
        </div>
        <div class="point-info-section">
            <h4>📋 参数组: ${setName}</h4>
            <div class="info-grid responsive-grid">
                <div class="info-item"><span class="info-label">I<sub>avg</sub>:</span><span class="info-value">${params.I_avg} mW<span class="fraction"><span class="numerator">1</span><span class="denominator">cm²</span></span></span></div>
                <div class="info-item"><span class="info-label">V:</span><span class="info-value">${params.V}</span></div>
                <div class="info-item"><span class="info-label">K:</span><span class="info-value">${params.K} rad<span class="fraction"><span class="numerator">1</span><span class="denominator">μm</span></span></span></div>
                <div class="info-item"><span class="info-label">t<sub>exp</sub>:</span><span class="info-value">${params.t_exp} s</span></div>
                <div class="info-item"><span class="info-label">η:</span><span class="info-value">${params.acid_gen_efficiency}</span></div>
                <div class="info-item"><span class="info-label">l<sub>diff</sub>:</span><span class="info-value">${params.diffusion_length} μm</span></div>
                <div class="info-item"><span class="info-label">k:</span><span class="info-value">${params.reaction_rate}</span></div>
                <div class="info-item"><span class="info-label">A:</span><span class="info-value">${params.amplification}</span></div>
                <div class="info-item"><span class="info-label">γ:</span><span class="info-value">${params.contrast}</span></div>
            </div>
        </div>
        <div class="point-info-section">
            <h4>🧮 计算公式</h4>
            <div class="formula-container">
                <div class="formula-title">${formulaTitle}</div>
                <div class="formula-math">${formulaMath}</div>
                <div class="formula-explanation">${formulaExplanation}</div>
            </div>
        </div>
    `;
}

/**
 * 获取单个点的详细信息
 * @param {Object} point - 点击的点数据
 * @param {string} plotType - 图表类型 ('exposure', 'thickness', 'heatmap', 'car_acid_concentration', 'car_deprotection_degree')
 * @param {Object} paramsOverride - 可选的参数对象，如果提供，则使用这些参数而不是从DOM读取
 * @returns {Object} 包含详细信息的对象 { html: "..." }
 */
function getSinglePointDetailedInfo(point, plotType, paramsOverride = null) {
    // 安全检查
    if (!point || (typeof point.x === 'undefined') || (typeof point.y === 'undefined')) {
        console.error('无效的点数据', point);
        return {
            html: `<div class="error-message">无效的点数据</div>`,
            title: '数据错误'
        };
    }
    
    // 解析点数据
    const x = point.x;
    const y = point.y;
    let setName = '';  // 参数组名称
    let params = {};   // 参数对象
    
    // 使用override参数或从点数据中提取
    if (paramsOverride) {
        params = paramsOverride;
        setName = paramsOverride.name || '自定义参数';
    } else if (point.data && point.data.name) {
        setName = point.data.name;
        params = { ...point.data };
    } else if (point.fullData && point.fullData.name) {
        setName = point.fullData.name;  // Plotly格式
        
        // 从曲线名称中提取参数（格式如 "Set 1: Dill (C=0.04,V=0.8)"）
        if (setName.includes('Dill') && !setName.includes('Enhanced')) {
            params = extractDillParamsFromName(setName);
            params.model = 'dill';
        } else if (setName.includes('Enhanced Dill')) {
            params = extractEnhancedDillParamsFromName(setName);
            params.model = 'enhanced_dill';
        } else if (setName.includes('CAR')) {
            params = extractCarParamsFromName(setName);
            params.model = 'car';
        }
    } else {
        // 无法从点数据中获得参数组信息，尝试使用当前选择的模型参数
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
            const modelType = modelSelect.value;
            if (modelType === 'dill') {
                params = getDillModelParams();
                params.model = 'dill';
                setName = 'Dill模型（当前参数）';
                
                // 🔧 修复：如果有API响应数据，合并parameters字段到params
                if (window.lastPlotData && window.lastPlotData.parameters) {
                    const apiParams = window.lastPlotData.parameters;
                    params = { ...params, ...apiParams };
                    console.log('🔧 合并API参数到弹出窗口:', params);
                }
            } else if (modelType === 'enhanced_dill') {
                params = getEnhancedDillModelParams();
                params.model = 'enhanced_dill';
                setName = '增强Dill模型（当前参数）';
            } else if (modelType === 'car') {
                params = getCarModelParams();
                params.model = 'car';
                setName = 'CAR模型（当前参数）';
            }
        }
    }

    // 确定模型类型，生成相应的HTML内容
    let html = '';
    let title = '';
    
    if (params.model === 'dill' || (!params.model && params.C)) {
        html = getDillPopupHtmlContent(x, y, setName, params, plotType);
        title = `单点详情 - Dill模型`;
    } else if (params.model === 'enhanced_dill' || (!params.model && params.z_h)) {
        html = getEnhancedDillPopupHtmlContent(x, y, setName, params, plotType);
        title = `单点详情 - 增强Dill模型`;
    } else if (params.model === 'car' || (!params.model && params.acid_gen_efficiency)) {
        html = getCarPopupHtmlContent(x, y, setName, params, plotType);
        title = `单点详情 - CAR模型`;
    } else {
        html = `<div class="point-info-section">
                    <h4>🎯 位置信息</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">X:</span>
                            <span class="info-value">${x.toFixed(3)} μm</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">值:</span>
                            <span class="info-value">${y.toFixed(3)}</span>
                        </div>
                    </div>
                </div>
                <div class="point-info-section">
                    <h4>⚠️ 参数信息缺失</h4>
                    <p>无法确定此点的详细参数信息。</p>
                </div>`;
        title = `单点详情`;
    }
    
    return { html, title };
}

// ===== 阈值滑块核心逻辑移植自compare.js，适配单组数据 =====
function initSingleThresholdControl(controlElement, index, plotType, plotData) {
    // 首先检查控制元素是否存在
    if (!controlElement) {
        console.warn('initSingleThresholdControl: controlElement 为空，跳过阈值控制初始化');
        return;
    }
    
    const slider = controlElement.querySelector('.threshold-slider');
    const valueText = controlElement.querySelector('.threshold-value-text');
    const toggleBtn = controlElement.querySelector('.toggle-threshold-visibility-btn');
    
    // 添加数据验证
    if (!plotData) {
        console.warn('initSingleThresholdControl: plotData 为空');
        return;
    }
    
    // 验证必要的DOM元素
    if (!slider || !valueText || !toggleBtn) {
        console.warn('initSingleThresholdControl: 缺少必要的DOM元素');
        return;
    }
    
    let yData, xData, minValue, maxValue, step, unit, defaultValue;
    
    if (plotType === 'exposure') {
        // 改进数据获取逻辑
        yData = plotData.exposure_dose || plotData.initial_acid || plotData.exposure || [];
        xData = plotData.x || [];
        
        // 数据验证
        if (!Array.isArray(yData) || yData.length === 0) {
            // 静默处理无效曝光剂量数据，在页面初始化时这是正常的
            // 尝试从其他可能的字段获取数据
            const possibleFields = ['exposure_dose', 'initial_acid', 'exposure', 'y', 'data'];
            for (const field of possibleFields) {
                if (plotData[field] && Array.isArray(plotData[field]) && plotData[field].length > 0) {
                    yData = plotData[field];
                    console.log(`使用字段 ${field} 作为曝光剂量数据`);
                    break;
                }
            }
            
            // 如果仍然无法获取有效数据，静默返回
            if (!Array.isArray(yData) || yData.length === 0) {
                // 静默跳过阈值控制初始化，这在没有计算结果时是正常的
                return;
            }
        }
        
        // 确保数值有效
        yData = yData.filter(val => !isNaN(val) && isFinite(val));
        if (yData.length === 0) {
            // 静默返回，没有有效数值时不初始化阈值控制
            return;
        }
        
        minValue = Math.max(0, Math.min(...yData) - (Math.max(...yData) - Math.min(...yData)) * 0.1);
        maxValue = Math.max(...yData) + (Math.max(...yData) - Math.min(...yData)) * 0.1;
        step = Math.max(0.1, (maxValue - minValue) / 1000);
        unit = ' mJ/cm²';
        defaultValue = minValue + (maxValue - minValue) * 0.3;
    } else {
        if (plotData.is_2d) {
            console.log('跳过2D数据的阈值控制初始化');
            return;
        }
        
        // 改进厚度数据获取逻辑
        yData = plotData.thickness || plotData.thick || [];
        xData = plotData.x || [];
        
        // 数据验证
        if (!Array.isArray(yData) || yData.length === 0) {
            // 静默处理无效厚度数据，在页面初始化时这是正常的
            // 尝试从其他可能的字段获取数据
            const possibleFields = ['thickness', 'thick', 'y', 'data'];
            for (const field of possibleFields) {
                if (plotData[field] && Array.isArray(plotData[field]) && plotData[field].length > 0) {
                    yData = plotData[field];
                    console.log(`使用字段 ${field} 作为厚度数据`);
                    break;
                }
            }
            
            // 如果仍然无法获取有效数据，静默返回
            if (!Array.isArray(yData) || yData.length === 0) {
                // 静默跳过阈值控制初始化，这在没有计算结果时是正常的
                return;
            }
        }
        
        // 确保数值有效
        yData = yData.filter(val => !isNaN(val) && isFinite(val));
        if (yData.length === 0) {
            // 静默返回，没有有效数值时不初始化阈值控制
            return;
        }
        
        minValue = Math.max(0, Math.min(...yData) - (Math.max(...yData) - Math.min(...yData)) * 0.05);
        maxValue = Math.min(1, Math.max(...yData) + (Math.max(...yData) - Math.min(...yData)) * 0.05);
        step = Math.max(0.001, (maxValue - minValue) / 1000);
        unit = '';
        defaultValue = minValue + (maxValue - minValue) * 0.3;
    }
    
    // 验证计算结果
    if (!isFinite(minValue) || !isFinite(maxValue) || !isFinite(step) || !isFinite(defaultValue)) {
        // 静默返回，计算参数无效时不初始化阈值控制
        return;
    }
    
    // 设置滑块参数
    slider.min = minValue;
    slider.max = maxValue;
    slider.step = step;
    slider.value = defaultValue;
    valueText.textContent = defaultValue.toFixed(plotType === 'exposure' ? 1 : 3) + unit;
    
    // 清除旧事件
    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    
    // 重新获取替换后的元素
    const finalSlider = controlElement.querySelector('.threshold-slider');
    const finalToggleBtn = controlElement.querySelector('.toggle-threshold-visibility-btn');
    const finalValueText = controlElement.querySelector('.threshold-value-text');
    
    // 添加事件监听
    finalSlider.addEventListener('input', () => {
        const value = parseFloat(finalSlider.value);
        finalValueText.textContent = value.toFixed(plotType === 'exposure' ? 1 : 3) + unit;
        updatePlotWithThreshold(plotType, 0, value, finalToggleBtn.classList.contains('active'), plotData);
    });
    
    finalToggleBtn.addEventListener('click', () => {
        finalToggleBtn.classList.toggle('active');
        const isActive = finalToggleBtn.classList.contains('active');
        finalToggleBtn.textContent = isActive ? '隐藏' : '显示';
        if (isActive) {
            controlElement.classList.add('active-threshold');
        } else {
            controlElement.classList.remove('active-threshold');
        }
        updatePlotWithThreshold(plotType, 0, parseFloat(finalSlider.value), isActive, plotData);
    });
    
    finalToggleBtn.textContent = '显示';
}

function updatePlotWithThreshold(plotType, thresholdIndex, value, isVisible, plotData) {
    const plotContainerId = plotType === 'exposure' ? 'exposure-plot-container' : 'thickness-plot-container';
    const plotDiv = document.getElementById(plotContainerId);
    let xData, yData, unit;
    if (plotType === 'exposure') {
        xData = plotData.x;
        yData = plotData.exposure_dose;
        unit = 'mJ/cm²';
    } else {
        xData = plotData.x;
        yData = plotData.thickness;
        unit = '';
    }
    let shapes = plotDiv.layout.shapes || [];
    let annotations = plotDiv.layout.annotations || [];
    // 清除本阈值相关的shape和annotation
    shapes = shapes.filter(s => !s.name || !s.name.startsWith(`threshold_line_${plotType}_${thresholdIndex}`));
    annotations = annotations.filter(a => !a.name || !a.name.startsWith(`threshold_${plotType}_${thresholdIndex}`));
    if (isVisible) {
        // 阈值线
        const xMin = Math.min(...xData);
        const xMax = Math.max(...xData);
        const lineColor = plotType === 'exposure' ? 'rgb(31,119,180)' : 'rgb(214,39,40)';
        shapes.push({
            type: 'line',
            name: `threshold_line_${plotType}_${thresholdIndex}`,
            x0: xMin, y0: value, x1: xMax, y1: value,
            line: { color: lineColor, width: 2, dash: 'dashdot' },
            layer: 'below'
        });
        // 交点圆点
        const analysis = analyzeThresholdIntersection(xData, yData, value, plotType);
        if (analysis.intersections.length > 0) {
            analysis.intersections.forEach((intersection, idx) => {
                shapes.push({
                    type: 'circle',
                    name: `threshold_line_${plotType}_${thresholdIndex}_intersection_${idx}`,
                    x0: intersection.x - 0.05,
                    y0: intersection.y - (plotType === 'exposure' ? 2 : 0.02),
                    x1: intersection.x + 0.05,
                    y1: intersection.y + (plotType === 'exposure' ? 2 : 0.02),
                    fillcolor: lineColor,
                    line: { color: lineColor, width: 2 },
                    layer: 'above'
                });
            });
        }
        // 注释
        const analysisText = createThresholdAnalysisText(analysis, value, unit, plotType);
        const titleText = `阈值: ${value.toFixed(2)}${unit} 交点: ${analysis.intersections.length}个 ▼`;
        annotations.push({
            name: `threshold_${plotType}_${thresholdIndex}_title`,
            text: titleText,
            x: 0.02, y: 0.98, xref: 'paper', yref: 'paper', xanchor: 'left', yanchor: 'top', showarrow: false,
            font: { color: lineColor, size: 12, family: 'Arial, sans-serif', weight: 'bold' },
            bgcolor: 'rgba(255,255,255,0.95)', bordercolor: lineColor, borderwidth: 2, borderpad: 6,
            clicktoshow: false, captureevents: true
        });
        annotations.push({
            name: `threshold_${plotType}_${thresholdIndex}_details`,
            text: analysisText,
            x: 0.02, y: 0.94, xref: 'paper', yref: 'paper', xanchor: 'left', yanchor: 'top', showarrow: false,
            font: { color: lineColor, size: 10, family: 'monospace' },
            bgcolor: 'rgba(255,255,255,0.98)', bordercolor: lineColor, borderwidth: 1, borderpad: 10,
            visible: false, clicktoshow: false, width: 320, align: 'left'
        });
    }
    Plotly.relayout(plotDiv, { shapes, annotations });
    // 绑定annotation点击展开/收起详细分析
    if (!plotDiv._thresholdAnnotationClickBound) {
        plotDiv._thresholdAnnotationClickBound = true;
        plotDiv.on('plotly_clickannotation', function(event) {
            const ann = event.annotation;
            if (ann && ann.name && ann.name.endsWith('_title')) {
                const detailsName = ann.name.replace('_title', '_details');
                const currentAnnotations = plotDiv.layout.annotations || [];
                let detailsAnn = currentAnnotations.find(a => a.name === detailsName);
                let titleAnn = currentAnnotations.find(a => a.name === ann.name);
                if (detailsAnn) {
                    const visible = !detailsAnn.visible;
                    detailsAnn.visible = visible;
                    if (titleAnn) {
                        titleAnn.text = titleAnn.text.replace(/[▼▲]/, visible ? '▲' : '▼');
                    }
                    Plotly.relayout(plotDiv, { annotations: currentAnnotations });
                    // compare风格弹窗
                    if (visible) {
                        createThresholdDetailsOverlay(plotDiv, plotType, thresholdIndex, detailsAnn.text);
                    } else {
                        removeThresholdDetailsOverlay(plotDiv, plotType, thresholdIndex);
                    }
                }
            }
        });
    }
}

function analyzeThresholdIntersection(xData, yData, threshold, plotType) {
    const intersections = [];
    for (let i = 0; i < yData.length - 1; i++) {
        const y1 = yData[i], y2 = yData[i + 1], x1 = xData[i], x2 = xData[i + 1];
        if ((y1 <= threshold && y2 >= threshold) || (y1 >= threshold && y2 <= threshold)) {
            const t = (threshold - y1) / (y2 - y1);
            const intersectionX = x1 + t * (x2 - x1);
            intersections.push({ x: intersectionX, y: threshold, index: i });
        }
    }
    let aboveArea = 0, belowArea = 0, aboveLength = 0, belowLength = 0;
    for (let i = 0; i < yData.length - 1; i++) {
        const dx = xData[i + 1] - xData[i];
        const avgY = (yData[i] + yData[i + 1]) / 2;
        if (avgY > threshold) {
            aboveArea += (avgY - threshold) * dx;
            aboveLength += dx;
        } else {
            belowArea += (threshold - avgY) * dx;
            belowLength += dx;
        }
    }
    const maxValue = Math.max(...yData);
    const minValue = Math.min(...yData);
    const abovePercentage = (aboveLength / (xData[xData.length - 1] - xData[0])) * 100;
    const belowPercentage = 100 - abovePercentage;
    return { intersections, aboveArea, belowArea, aboveLength, belowLength, abovePercentage, belowPercentage, maxValue, minValue, thresholdRatio: threshold / maxValue };
}

function createThresholdAnalysisText(analysis, threshold, unit, plotType) {
    const lines = [];
    lines.push(`阈值: ${threshold.toFixed(2)}${unit}`);
    if (analysis.intersections.length > 0) {
        lines.push(`交点: ${analysis.intersections.length}个`);
        for (let i = 0; i < analysis.intersections.length; i += 3) {
            const group = analysis.intersections.slice(i, i + 3);
            const groupText = group.map((intersection, idx) => `#${i + idx + 1}: x=${intersection.x.toFixed(2)}μm`).join('  ');
            lines.push(`  ${groupText}`);
        }
        if (plotType === 'exposure') {
            if (analysis.intersections.length >= 2) {
                const firstPair = analysis.intersections.slice(0, 2);
                const lineWidth = Math.abs(firstPair[1].x - firstPair[0].x);
                lines.push(`工艺分析:`);
                lines.push(`  有效线宽: ${lineWidth.toFixed(2)}μm`);
                lines.push(`  工艺窗口: ${analysis.abovePercentage.toFixed(1)}%`);
            }
        } else {
            lines.push(`工艺分析:`);
            lines.push(`  厚度达标区域: ${analysis.abovePercentage.toFixed(1)}%`);
            if (analysis.abovePercentage < 80) {
                lines.push(`  ⚠️ 覆盖率偏低，建议优化参数`);
            }
        }
    } else {
        lines.push('交点: 无');
        if (plotType === 'exposure') {
            lines.push('⚠️ 无有效曝光区域');
        } else {
            lines.push('⚠️ 厚度均不达标');
        }
    }
    if (plotType === 'exposure') {
        lines.push(`超阈值区域: ${analysis.abovePercentage.toFixed(1)}%`);
        lines.push(`积分差值: ${analysis.aboveArea.toFixed(1)}${unit}·μm`);
    } else {
        lines.push(`超阈值区域: ${analysis.abovePercentage.toFixed(1)}%`);
        lines.push(`平均超出: ${(analysis.aboveArea / Math.max(analysis.aboveLength, 0.001)).toFixed(3)}`);
    }
    const maxRatio = (threshold / analysis.maxValue * 100).toFixed(1);
    lines.push(`阈值/峰值: ${maxRatio}%`);
    if (plotType === 'exposure') {
        if (maxRatio < 50) {
            lines.push(`💡 建议: 阈值偏低，可提高对比度`);
        } else if (maxRatio > 90) {
            lines.push(`💡 建议: 阈值偏高，可能欠曝光`);
        }
    } else {
        if (analysis.abovePercentage > 90) {
            lines.push(`✅ 形貌分布良好`);
        } else if (analysis.abovePercentage > 70) {
            lines.push(`⚠️ 形貌分布一般，可优化`);
        } else {
            lines.push(`❌ 形貌分布不佳，需要调整`);
        }
    }
    return lines.join('\n');
}

// === 阈值详细分析弹窗逻辑（compare移植） ===
function createThresholdDetailsOverlay(container, plotType, thresholdIndex, content) {
    const overlayId = `threshold-overlay-${plotType}-${thresholdIndex}`;
    removeThresholdDetailsOverlay(container, plotType, thresholdIndex);
    const overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.className = 'threshold-details-overlay';
    const textContent = content.replace(/<[^>]*>/g, '');
    overlay.innerHTML = `
        <div class="threshold-details-content">
            <div class="threshold-details-header">
                <span>详细分析</span>
                <button class="threshold-details-close" onclick="removeThresholdDetailsOverlay(document.getElementById('${container.id}'), '${plotType}', '${thresholdIndex}')">×</button>
            </div>
            <div class="threshold-details-body">
                <pre>${textContent}</pre>
            </div>
        </div>
    `;
    overlay.style.cssText = `
        position: absolute;
        left: 20px;
        top: ${50 + thresholdIndex * 120}px;
        width: 350px;
        max-height: 200px;
        background: rgba(255, 255, 255, 0.98);
        border: 2px solid #3498db;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        font-family: monospace;
        font-size: 11px;
        line-height: 1.4;
    `;
    container.style.position = 'relative';
    container.appendChild(overlay);
}
function removeThresholdDetailsOverlay(container, plotType, thresholdIndex) {
    const overlayId = `threshold-overlay-${plotType}-${thresholdIndex}`;
    const existingOverlay = document.getElementById(overlayId);
    if (existingOverlay) existingOverlay.remove();
    // 同步箭头
    const titleName = `threshold_${plotType}_${thresholdIndex}_title`;
    const currentAnnotations = container.layout.annotations || [];
    const updatedAnnotations = currentAnnotations.map(a => {
        if (a.name === titleName) {
            const newText = a.text.replace(/[▼▲]/, '▼');
            return { ...a, text: newText };
        }
        return a;
    });
    Plotly.relayout(container, { annotations: updatedAnnotations });
}
window.removeThresholdDetailsOverlay = removeThresholdDetailsOverlay;

// 初始化波形类型选择器
function initSineWaveTypeSelectors() {
    // Dill模型波形类型选择
    const dillSineType = document.getElementById('dill-sine-type');
    const dillMultiSineParams = document.getElementById('dill-multisine-params');
    const dill3dSineParams = document.getElementById('dill-3dsine-params');
    // 添加4D动画参数容器的引用
    const dill4DAnimationGroup = document.querySelector('[data-title="4D动画参数"]');
    // 添加1D动画参数容器的引用
    const dill1DAnimationGroup = document.getElementById('dill-1d-animation-params-container');
    
    if (dillSineType && dillMultiSineParams && dill3dSineParams) {
        dillSineType.addEventListener('change', function() {
            // 隐藏所有参数容器
            dillMultiSineParams.style.display = 'none';
            dill3dSineParams.style.display = 'none';
            
            // 根据选择显示对应参数容器
            if (this.value === 'multi') {
                dillMultiSineParams.style.display = 'block';
            } else if (this.value === '3d') {
                dill3dSineParams.style.display = 'block';
            }
            
            // 新增：控制4D动画参数的显示/隐藏
            if (dill4DAnimationGroup) {
                const dillParamsContainer = document.getElementById('dill-params');
                if (this.value === '3d') {
                    dill4DAnimationGroup.style.display = 'block';
                    // 添加show-4d类名以显示4D动画参数
                    if (dillParamsContainer) {
                        dillParamsContainer.classList.add('show-4d');
                    }
                } else {
                    dill4DAnimationGroup.style.display = 'none';
                    // 移除show-4d类名以隐藏4D动画参数
                    if (dillParamsContainer) {
                        dillParamsContainer.classList.remove('show-4d');
                    }
                    // 如果切换到非3D模式，取消勾选4D动画并隐藏动画区域
                    const enable4dCheckbox = document.getElementById('enable_4d_animation_dill');
                    if (enable4dCheckbox) {
                        enable4dCheckbox.checked = false;
                        const dill4dParams = document.getElementById('dill_4d_time_params');
                        if (dill4dParams) dill4dParams.style.display = 'none';
                        
                        // 隐藏4D动画区域
                        const animationSection = document.getElementById('dill-4d-animation-section');
                        if (animationSection) {
                            animationSection.style.display = 'none';
                        }
                        
                        // 停止当前播放的动画
                        if (typeof dill4DAnimationState !== 'undefined' && dill4DAnimationState.intervalId) {
                            clearInterval(dill4DAnimationState.intervalId);
                            dill4DAnimationState.intervalId = null;
                            dill4DAnimationState.isPlaying = false;
                        }
                    }
                }
            }
            
            // 新增：控制1D动画参数的显示/隐藏
            if (dill1DAnimationGroup) {
                if (this.value === 'single') {
                    // 只有在single模式（薄胶1D）下才显示1D动画参数
                    dill1DAnimationGroup.style.display = 'block';
                    
                    // 智能恢复1D动画面板显示：根据复选框状态决定
                    const enable1dCheckbox = document.getElementById('enable_1d_animation_dill');
                    const dill1dParams = document.getElementById('dill_1d_time_params');
                    if (enable1dCheckbox && dill1dParams && enable1dCheckbox.checked) {
                        dill1dParams.style.display = 'block';
                        console.log('📋 恢复1D动画面板显示（复选框已勾选）');
                    }
                    
                    console.log('✅ DILL 1D模式：1D动画参数组已显示');
                } else {
                    // 切换到其他模式时隐藏1D动画参数
                    dill1DAnimationGroup.style.display = 'none';
                    
                    // 如果切换到非1D模式，隐藏动画面板但保持复选框状态
                    const enable1dCheckbox = document.getElementById('enable_1d_animation_dill');
                    if (enable1dCheckbox) {
                        // 不修改复选框状态，只隐藏面板
                        const dill1dParams = document.getElementById('dill_1d_time_params');
                        if (dill1dParams) dill1dParams.style.display = 'none';
                        
                        // 隐藏1D动画区域
                        const animationSection = document.getElementById('dill-1d-animation-section');
                        if (animationSection) {
                            animationSection.style.display = 'none';
                        }
                        
                        // 停止当前播放的动画
                        if (typeof dill1DAnimationState !== 'undefined' && dill1DAnimationState.intervalId) {
                            clearInterval(dill1DAnimationState.intervalId);
                            dill1DAnimationState.intervalId = null;
                            dill1DAnimationState.isPlaying = false;
                        }
                        
                        console.log('🔒 保持1D动画复选框状态，仅隐藏面板');
                    }
                    console.log('DILL 非1D模式：1D动画参数组已隐藏');
                }
            }
            
            // 新增：控制1D V评估参数的显示/隐藏
            const dill1DVEvaluationGroup = document.getElementById('dill-1d-v-evaluation-params-container');
            if (dill1DVEvaluationGroup) {
                if (this.value === 'single') {
                    // 只有在single模式（薄胶1D）下才显示1D V评估参数
                    dill1DVEvaluationGroup.style.display = 'block';
                    
                    // 智能恢复1D V评估面板显示：根据复选框状态决定
                    const enable1dVCheckbox = document.getElementById('enable_1d_v_evaluation_dill');
                    const dillVParams = document.getElementById('dill_1d_v_params');
                    if (enable1dVCheckbox && dillVParams && enable1dVCheckbox.checked) {
                        dillVParams.style.display = 'block';
                        console.log('📋 恢复1D V评估面板显示（复选框已勾选）');
                    }
                    
                    console.log('✅ DILL 1D模式：V评估参数组已显示');
                } else {
                    // 切换到其他模式时隐藏1D V评估参数
                    dill1DVEvaluationGroup.style.display = 'none';
                    
                    // 如果切换到非1D模式，隐藏V评估面板但保持复选框状态
                    const enable1dVEvaluationCheckbox = document.getElementById('enable_1d_v_evaluation_dill');
                    if (enable1dVEvaluationCheckbox) {
                        // 不修改复选框状态，只隐藏面板
                        const dillVParams = document.getElementById('dill_1d_v_params');
                        if (dillVParams) dillVParams.style.display = 'none';
                        
                        // 隐藏1D V评估区域
                        const vEvaluationSection = document.getElementById('dill-1d-v-evaluation-section');
                        if (vEvaluationSection) {
                            vEvaluationSection.style.display = 'none';
                        }
                        
                        // 停止当前播放的V评估动画
                        if (typeof dill1DVEvaluationState !== 'undefined' && dill1DVEvaluationState.intervalId) {
                            clearInterval(dill1DVEvaluationState.intervalId);
                            dill1DVEvaluationState.intervalId = null;
                            dill1DVEvaluationState.isPlaying = false;
                        }
                        
                        console.log('🔒 保持1D V评估复选框状态，仅隐藏面板');
                    }
                    console.log('DILL 非1D模式：V评估参数组已隐藏');
                }
            }
            
            // 新增：控制1D曝光时间窗口选择器的显示/隐藏
            const dill1DExposureTimeGroup = document.getElementById('dill-1d-exposure-time-params-container');
            if (dill1DExposureTimeGroup) {
                if (this.value === 'single') {
                    // 只有在single模式（薄胶1D）下才显示曝光时间窗口选择器
                    dill1DExposureTimeGroup.style.display = 'block';
                    
                    // 智能恢复曝光时间窗口面板显示：根据复选框状态决定
                    const enableExposureCheckbox = document.getElementById('enable_exposure_time_window_dill');
                    const exposureTimeParams = document.getElementById('dill_1d_exposure_time_params');
                    if (enableExposureCheckbox && exposureTimeParams && enableExposureCheckbox.checked) {
                        exposureTimeParams.style.display = 'block';
                        console.log('📋 恢复曝光时间窗口面板显示（复选框已勾选）');
                    }
                    
                    console.log('✅ DILL 1D模式：曝光时间窗口选择器已显示');
                } else {
                    // 切换到其他模式时隐藏曝光时间窗口选择器
                    dill1DExposureTimeGroup.style.display = 'none';
                    
                    // 如果切换到非1D模式，隐藏曝光时间窗口面板但保持复选框状态
                    const enableExposureTimeWindowCheckbox = document.getElementById('enable_exposure_time_window_dill');
                    if (enableExposureTimeWindowCheckbox) {
                        // 不修改复选框状态，只隐藏面板
                        const exposureTimeParams = document.getElementById('dill_1d_exposure_time_params');
                        if (exposureTimeParams) exposureTimeParams.style.display = 'none';
                        
                        console.log('🔒 保持曝光时间窗口复选框状态，仅隐藏面板');
                    }
                    console.log('DILL 非1D模式：曝光时间窗口选择器已隐藏');
                }
            }
            
            // 控制空间频率K输入框的禁用状态（1D DILL模型时禁用）
            updateKInputState();
        });
    }
}

// 坐标轴控制功能已移除
/**
 * 初始化坐标轴控制功能 (已禁用)
 */
function initAxisControlFeature() {
    console.log('🎯 坐标轴控制功能已禁用');
    // 功能已移除
}

/**
 * 绑定坐标轴面板展开/收起事件 (已禁用)
 */
function bindAxisToggleEvents() {
    // 功能已移除
}

/**
 * 切换坐标轴控制面板的显示状态 (已禁用)
 */
function toggleAxisControlPanel(plotType, toggleBtn, contentElement) {
    // 功能已移除
}

/**
 * 绑定坐标轴控制按钮事件 (已禁用)
 */
function bindAxisControlEvents() {
    // 功能已移除
}

/**
 * 为指定图表绑定坐标轴控制事件 (已禁用)
 */
function bindPlotAxisControls(plotType) {
    // 功能已移除
}

/**
 * 保存当前坐标轴范围作为参考
 */
function saveAxisReference(plotType) {
    try {
        const container = document.getElementById(`${plotType}-plot-container`);
        if (!container || !container._fullLayout) {
            showAxisNotification('图表未找到或未加载完成', 'error');
            return;
        }
        
        const layout = container._fullLayout;
        const xRange = layout.xaxis.range;
        const yRange = layout.yaxis.range;
        
        if (!xRange || !yRange) {
            showAxisNotification('无法获取当前坐标轴范围', 'error');
            return;
        }
        
        // 保存参考范围
        axisReferenceRanges[plotType] = {
            xaxis: [xRange[0], xRange[1]],
            yaxis: [yRange[0], yRange[1]]
        };
        
        // 更新显示信息
        const referenceInfo = document.getElementById(`${plotType}-reference-info`);
        if (referenceInfo) {
            const xRangeStr = `X: [${xRange[0].toFixed(2)}, ${xRange[1].toFixed(2)}]`;
            const yRangeStr = `Y: [${yRange[0].toFixed(3)}, ${yRange[1].toFixed(3)}]`;
            referenceInfo.textContent = `${xRangeStr}, ${yRangeStr}`;
            referenceInfo.classList.add('has-reference');
        }
        
        // 启用恢复按钮
        const restoreBtn = document.getElementById(`${plotType}-restore-reference`);
        if (restoreBtn) {
            restoreBtn.disabled = false;
        }
        
        // 保存到localStorage
        localStorage.setItem(`axisReference_${plotType}`, JSON.stringify(axisReferenceRanges[plotType]));
        
        showAxisNotification(`📏 ${plotType === 'exposure' ? '曝光剂量' : '光刻胶厚度'}图表参考范围已保存`, 'success');
        
        console.log(`✅ ${plotType}图表参考范围已保存:`, axisReferenceRanges[plotType]);
        
    } catch (error) {
        console.error(`保存${plotType}图表参考范围失败:`, error);
        showAxisNotification('保存参考范围失败', 'error');
    }
}

/**
 * 恢复到保存的参考范围
 */
function restoreAxisReference(plotType) {
    try {
        const container = document.getElementById(`${plotType}-plot-container`);
        if (!container) {
            showAxisNotification('图表未找到', 'error');
            return;
        }
        
        let referenceRange = axisReferenceRanges[plotType];
        
        // 如果内存中没有，尝试从localStorage加载
        if (!referenceRange) {
            const saved = localStorage.getItem(`axisReference_${plotType}`);
            if (saved) {
                referenceRange = JSON.parse(saved);
                axisReferenceRanges[plotType] = referenceRange;
            }
        }
        
        if (!referenceRange) {
            showAxisNotification('未找到保存的参考范围', 'error');
            return;
        }
        
        // 应用参考范围
        Plotly.relayout(container, {
            'xaxis.range': referenceRange.xaxis,
            'yaxis.range': referenceRange.yaxis
        }).then(() => {
            showAxisNotification(`📏 已恢复${plotType === 'exposure' ? '曝光剂量' : '光刻胶厚度'}图表参考范围`, 'success');
            console.log(`✅ ${plotType}图表已恢复到参考范围:`, referenceRange);
        }).catch(error => {
            console.error(`恢复${plotType}图表参考范围失败:`, error);
            showAxisNotification('恢复参考范围失败', 'error');
        });
        
    } catch (error) {
        console.error(`恢复${plotType}图表参考范围失败:`, error);
        showAxisNotification('恢复参考范围失败', 'error');
    }
}

/**
 * 自动缩放坐标轴
 */
function autoScaleAxis(plotType) {
    try {
        const container = document.getElementById(`${plotType}-plot-container`);
        if (!container) {
            showAxisNotification('图表未找到', 'error');
            return;
        }
        
        // 重置坐标轴为自动缩放
        Plotly.relayout(container, {
            'xaxis.autorange': true,
            'yaxis.autorange': true
        }).then(() => {
            showAxisNotification(`🔄 ${plotType === 'exposure' ? '曝光剂量' : '光刻胶厚度'}图表已自动缩放`, 'success');
            console.log(`✅ ${plotType}图表已自动缩放`);
        }).catch(error => {
            console.error(`${plotType}图表自动缩放失败:`, error);
            showAxisNotification('自动缩放失败', 'error');
        });
        
    } catch (error) {
        console.error(`${plotType}图表自动缩放失败:`, error);
        showAxisNotification('自动缩放失败', 'error');
    }
}

/**
 * 显示坐标轴控制通知
 */
function showAxisNotification(message, type = 'success') {
    // 移除现有通知
    const existingNotification = document.querySelector('.axis-control-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 创建新通知
    const notification = document.createElement('div');
    notification.className = 'axis-control-notification';
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        <span>${message}</span>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 自动隐藏 - 设置为2.5秒显示时间
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 2500);
}

/**
 * 初始化时加载保存的参考范围
 */
function loadSavedAxisReferences() {
    ['exposure', 'thickness'].forEach(plotType => {
        const saved = localStorage.getItem(`axisReference_${plotType}`);
        if (saved) {
            try {
                const referenceRange = JSON.parse(saved);
                axisReferenceRanges[plotType] = referenceRange;
                
                // 更新显示信息
                const referenceInfo = document.getElementById(`${plotType}-reference-info`);
                if (referenceInfo) {
                    const xRangeStr = `X: [${referenceRange.xaxis[0].toFixed(2)}, ${referenceRange.xaxis[1].toFixed(2)}]`;
                    const yRangeStr = `Y: [${referenceRange.yaxis[0].toFixed(3)}, ${referenceRange.yaxis[1].toFixed(3)}]`;
                    referenceInfo.textContent = `${xRangeStr}, ${yRangeStr}`;
                    referenceInfo.classList.add('has-reference');
                }
                
                // 启用恢复按钮
                const restoreBtn = document.getElementById(`${plotType}-restore-reference`);
                if (restoreBtn) {
                    restoreBtn.disabled = false;
                }
                
                console.log(`📂 已加载${plotType}图表保存的参考范围:`, referenceRange);
            } catch (error) {
                console.error(`加载${plotType}图表保存的参考范围失败:`, error);
            }
        }
    });
}

// 坐标轴控制功能已禁用
// document.addEventListener('DOMContentLoaded', function() {
//     // 延迟初始化，确保其他组件已加载
//     setTimeout(() => {
//         initAxisControlFeature();
//         loadSavedAxisReferences();
//     }, 1000);
// });

// Dill模型2D预览绘图函数
function dillDrawPreviewPlot(scrollToPlot = false, t = 0) {
    const input = document.getElementById('phi_expr');
    const kxInput = document.getElementById('Kx');
    const kyInput = document.getElementById('Ky');
    const vInput = document.getElementById('V'); // 使用V作为Dill模型的对比度参数
    const plot = document.getElementById('phi-expr-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');

    if (!input || !plot) return;

    let Kx = 2, Ky = 0, V_val = 0.8;
    if (kxInput) Kx = parseFloat(kxInput.value);
    if (kyInput) Ky = parseFloat(kyInput.value);
    if (vInput) V_val = parseFloat(vInput.value);
    
    // 获取Y范围参数
    const yMinInput = document.getElementById('y_min');
    const yMaxInput = document.getElementById('y_max');
    const yPointsInput = document.getElementById('y_points');
    
    // 默认范围，或从输入框获取
    let xRange = [0, 10];
    let yRange = [0, 10];
    let yPoints = 100;
    
    if (yMinInput && yMaxInput) {
        yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
    }
    if (yPointsInput) {
        yPoints = parseInt(yPointsInput.value) || 100;
    }

    const expr = input.value;

    if (!validatePhaseExpr(expr)) {
        if (errDiv) {
            errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview || '表达式格式有误，无法预览。';
            errDiv.style.display = 'block';
        }
        return;
    }
    if (errDiv) {
        errDiv.textContent = '';
        errDiv.style.display = 'none';
    }

    const plotData = generate2DSine(Kx, Ky, V_val, expr, xRange, yRange, yPoints, t);
    plot.style.display = 'block';
    
    // 显示滑块控制面板
    const controlsElement = document.getElementById('phi-expr-preview-controls');
    const tSlider = document.getElementById('phi-expr-t-slider');
    const tValueDisplay = controlsElement?.querySelector('.t-value');
    
    if (controlsElement && plot.style.display !== 'none') {
        controlsElement.style.display = 'block';
        if (tSlider && tValueDisplay) {
            tSlider.value = t;
            tValueDisplay.textContent = t.toFixed(2);
        }
    }
    
    Plotly.newPlot(plot, [{
        z: plotData.z, x: plotData.x, y: plotData.y, type: 'heatmap', colorscale: 'Viridis',
        colorbar: {title: 'I(x,y)'}
    }], {
        title: `Dill 二维正弦分布预览 (t=${t.toFixed(2)})`,
        xaxis: {title: 'x'},
        yaxis: {title: 'y'},
        margin: {t:40, l:40, r:20, b:10}, height: 260
    }, {displayModeBar: false});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

function enhancedDrawPreviewPlot(scrollToPlot = false, t = 0) {
    const input = document.getElementById('enhanced_phi_expr');
    const kxInput = document.getElementById('enhanced_Kx');
    const kyInput = document.getElementById('enhanced_Ky');
    const vInput = document.getElementById('I0'); // 使用I0作为增强Dill模型的V
    const plot = document.getElementById('enhanced-phi-expr-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');

    if (!input || !plot) return;

    let Kx = 2, Ky = 0, V_val = 1.0;
    if (kxInput) Kx = parseFloat(kxInput.value);
    if (kyInput) Ky = parseFloat(kyInput.value);
    if (vInput) V_val = parseFloat(vInput.value);
    
    // 获取Y范围参数
    const yMinInput = document.getElementById('enhanced_y_min');
    const yMaxInput = document.getElementById('enhanced_y_max');
    const yPointsInput = document.getElementById('enhanced_y_points');
    
    // 默认范围，或从输入框获取
    let xRange = [0, 10];
    let yRange = [0, 10];
    let yPoints = 100;
    
    if (yMinInput && yMaxInput) {
        yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
    }
    if (yPointsInput) {
        yPoints = parseInt(yPointsInput.value) || 100;
    }

    const expr = input.value;

    if (!validatePhaseExpr(expr)) {
        if (errDiv) {
            errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview || '表达式格式有误，无法预览。';
            errDiv.style.display = 'block';
        }
        return;
    }
    if (errDiv) {
        errDiv.textContent = '';
        errDiv.style.display = 'none';
    }

    const plotData = generate2DSine(Kx, Ky, V_val, expr, xRange, yRange, yPoints, t);
    plot.style.display = 'block';
    
    // 显示滑块控制面板
    const controlsElement = document.getElementById('enhanced-phi-expr-preview-controls');
    const tSlider = document.getElementById('enhanced-phi-expr-t-slider');
    const tValueDisplay = controlsElement?.querySelector('.t-value');
    
    if (controlsElement && plot.style.display !== 'none') {
        controlsElement.style.display = 'block';
        if (tSlider && tValueDisplay) {
            tSlider.value = t;
            tValueDisplay.textContent = t.toFixed(2);
        }
    }
    
    Plotly.newPlot(plot, [{
        z: plotData.z, x: plotData.x, y: plotData.y, type: 'heatmap', colorscale: 'Viridis',
        colorbar: {title: 'I(x,y)'}
    }], {
        title: `Enhanced Dill 二维正弦分布预览 (t=${t.toFixed(2)})`,
        xaxis: {title: 'x'},
        yaxis: {title: 'y'},
        margin: {t:40, l:40, r:20, b:10}, height: 260
    }, {displayModeBar: false});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

// 增强Dill模型3D预览绘图函数
function enhancedDraw3DPreviewPlot(scrollToPlot = false, t = 0) {
    const input = document.getElementById('enhanced_phi_expr_3d');
    const kxInput = document.getElementById('enhanced_Kx_3d');
    const kyInput = document.getElementById('enhanced_Ky_3d');
    const kzInput = document.getElementById('enhanced_Kz_3d');
    const vInput = document.getElementById('I0'); // 使用I0作为增强Dill模型的V
    const plot = document.getElementById('enhanced-phi-expr-3d-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');

    const xMinInput = document.getElementById('enhanced_x_min_3d');
    const xMaxInput = document.getElementById('enhanced_x_max_3d');
    const yMinInput = document.getElementById('enhanced_y_min_3d');
    const yMaxInput = document.getElementById('enhanced_y_max_3d');
    const zMinInput = document.getElementById('enhanced_z_min_3d');
    const zMaxInput = document.getElementById('enhanced_z_max_3d');

    if (!input || !plot || !xMinInput || !xMaxInput || !yMinInput || !yMaxInput || !zMinInput || !zMaxInput) return;

    let Kx = 2, Ky = 1, Kz = 1, V_val = 1.0; // 默认I0为1.0
    if (kxInput) Kx = parseFloat(kxInput.value);
    if (kyInput) Ky = parseFloat(kyInput.value);
    if (kzInput) Kz = parseFloat(kzInput.value);
    if (vInput) V_val = parseFloat(vInput.value);

    const xRange = [parseFloat(xMinInput.value) || 0, parseFloat(xMaxInput.value) || 10];
    const yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
    const zRange = [parseFloat(zMinInput.value) || 0, parseFloat(zMaxInput.value) || 10];
    const expr = input.value;

    if (!validatePhaseExpr(expr)) {
        if (errDiv) { 
            errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview || '表达式格式有误，无法预览。'; 
            errDiv.style.display = 'block'; 
        }
        return;
    }
    if (errDiv) {
        errDiv.textContent = ''; 
        errDiv.style.display = 'none'; 
    }

    const plotData = generate3DSine(Kx, Ky, Kz, V_val, expr, xRange, yRange, zRange, 20, 20, t);
    plot.style.display = 'block';
    
    // 显示滑块控制面板
    const controlsElement = document.getElementById('enhanced-phi-expr-3d-preview-controls');
    const tSlider = document.getElementById('enhanced-phi-expr-3d-t-slider');
    const tValueDisplay = controlsElement?.querySelector('.t-value');
    
    if (controlsElement && plot.style.display !== 'none') {
        controlsElement.style.display = 'block';
        if (tSlider && tValueDisplay) {
            tSlider.value = t;
            tValueDisplay.textContent = t.toFixed(2);
        }
    }
    
    const data = [{
        type: 'isosurface',
        x: plotData.x,
        y: plotData.y,
        z: plotData.z,
        value: plotData.values,
        isomin: 0.5,
        isomax: 1.5,
        surface: { show: true, count: 3, fill: 0.7 },
        colorscale: 'Viridis',
        caps: { x: { show: false }, y: { show: false }, z: { show: false } }
    }];
    
    Plotly.newPlot(plot, data, {
        title: `Enhanced Dill 三维正弦分布预览 (t=${t.toFixed(2)})`,
        scene: {
            xaxis: {title: 'X'},
            yaxis: {title: 'Y'},
            zaxis: {title: 'Z'}
        },
        margin: {t:40, l:0, r:0, b:0},
        height: 350
    }, {displayModeBar: true});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

// CAR模型2D预览绘图函数
function carDrawPreviewPlot(scrollToPlot = false, t = 0) {
    const input = document.getElementById('car_phi_expr');
    const kxInput = document.getElementById('car_Kx');
    const kyInput = document.getElementById('car_Ky');
    const vInput = document.getElementById('car_V');
    const plot = document.getElementById('car-phi-expr-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');

    if (!input || !plot) return;

    let Kx = 2, Ky = 0, V_val = 0.8;
    if (kxInput) Kx = parseFloat(kxInput.value);
    if (kyInput) Ky = parseFloat(kyInput.value);
    if (vInput) V_val = parseFloat(vInput.value);
    
    // 获取Y范围参数
    const yMinInput = document.getElementById('car_y_min');
    const yMaxInput = document.getElementById('car_y_max');
    const yPointsInput = document.getElementById('car_y_points');
    
    // 默认范围，或从输入框获取
    let xRange = [0, 10];
    let yRange = [0, 10];
    let yPoints = 100;
    
    if (yMinInput && yMaxInput) {
        yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
    }
    if (yPointsInput) {
        yPoints = parseInt(yPointsInput.value) || 100;
    }

    const expr = input.value;

    if (!validatePhaseExpr(expr)) {
        if (errDiv) {
            errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview || '表达式格式有误，无法预览。';
            errDiv.style.display = 'block';
        }
        return;
    }
    if (errDiv) {
        errDiv.textContent = '';
        errDiv.style.display = 'none';
    }

    const plotData = generate2DSine(Kx, Ky, V_val, expr, xRange, yRange, yPoints, t);
    plot.style.display = 'block';
    
    // 显示滑块控制面板
    const controlsElement = document.getElementById('car-phi-expr-preview-controls');
    const tSlider = document.getElementById('car-phi-expr-t-slider');
    const tValueDisplay = controlsElement?.querySelector('.t-value');
    
    if (controlsElement && plot.style.display !== 'none') {
        controlsElement.style.display = 'block';
        if (tSlider && tValueDisplay) {
            tSlider.value = t;
            tValueDisplay.textContent = t.toFixed(2);
        }
    }
    
    Plotly.newPlot(plot, [{
        z: plotData.z, x: plotData.x, y: plotData.y, type: 'heatmap', colorscale: 'Viridis',
        colorbar: {title: 'I(x,y)'}
    }], {
        title: `CAR 二维正弦分布预览 (t=${t.toFixed(2)})`,
        xaxis: {title: 'x'},
        yaxis: {title: 'y'},
        margin: {t:40, l:40, r:20, b:10}, height: 260
    }, {displayModeBar: false});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

// CAR模型3D预览绘图函数
function carDraw3DPreviewPlot(scrollToPlot = false, t = 0) {
    const input = document.getElementById('car_phi_expr_3d');
    const kxInput = document.getElementById('car_Kx_3d');
    const kyInput = document.getElementById('car_Ky_3d');
    const kzInput = document.getElementById('car_Kz_3d');
    const vInput = document.getElementById('car_V');
    const plot = document.getElementById('car-phi-expr-3d-preview-plot');
    const errDiv = input?.closest('.parameter-item')?.querySelector('.phi-expr-error');

    const xMinInput = document.getElementById('car_x_min_3d');
    const xMaxInput = document.getElementById('car_x_max_3d');
    const yMinInput = document.getElementById('car_y_min_3d');
    const yMaxInput = document.getElementById('car_y_max_3d');
    const zMinInput = document.getElementById('car_z_min_3d');
    const zMaxInput = document.getElementById('car_z_max_3d');

    if (!input || !plot || !xMinInput || !xMaxInput || !yMinInput || !yMaxInput || !zMinInput || !zMaxInput) return;

    let Kx = 2, Ky = 1, Kz = 1, V_val = 0.8;
    if (kxInput) Kx = parseFloat(kxInput.value);
    if (kyInput) Ky = parseFloat(kyInput.value);
    if (kzInput) Kz = parseFloat(kzInput.value);
    if (vInput) V_val = parseFloat(vInput.value);

    const xRange = [parseFloat(xMinInput.value) || 0, parseFloat(xMaxInput.value) || 10];
    const yRange = [parseFloat(yMinInput.value) || 0, parseFloat(yMaxInput.value) || 10];
    const zRange = [parseFloat(zMinInput.value) || 0, parseFloat(zMaxInput.value) || 10];
    const expr = input.value;

    if (!validatePhaseExpr(expr)) {
        if (errDiv) { 
            errDiv.textContent = LANGS[currentLang]?.phi_expr_invalid_preview || '表达式格式有误，无法预览。'; 
            errDiv.style.display = 'block'; 
        }
        return;
    }
    if (errDiv) {
        errDiv.textContent = ''; 
        errDiv.style.display = 'none'; 
    }

    const plotData = generate3DSine(Kx, Ky, Kz, V_val, expr, xRange, yRange, zRange, 20, 20, t);
    plot.style.display = 'block';
    
    // 显示滑块控制面板
    const controlsElement = document.getElementById('car-phi-expr-3d-preview-controls');
    const tSlider = document.getElementById('car-phi-expr-3d-t-slider');
    const tValueDisplay = controlsElement?.querySelector('.t-value');
    
    if (controlsElement && plot.style.display !== 'none') {
        controlsElement.style.display = 'block';
        if (tSlider && tValueDisplay) {
            tSlider.value = t;
            tValueDisplay.textContent = t.toFixed(2);
        }
    }
    
    const data = [{
        type: 'isosurface',
        x: plotData.x,
        y: plotData.y,
        z: plotData.z,
        value: plotData.values,
        isomin: 0.5,
        isomax: 1.5,
        surface: { show: true, count: 3, fill: 0.7 },
        colorscale: 'Viridis',
        caps: { x: { show: false }, y: { show: false }, z: { show: false } }
    }];
    
    Plotly.newPlot(plot, data, {
        title: `CAR 三维正弦分布预览 (t=${t.toFixed(2)})`,
        scene: {
            xaxis: {title: 'X'},
            yaxis: {title: 'Y'},
            zaxis: {title: 'Z'}
        },
        margin: {t:40, l:0, r:0, b:0},
        height: 350
    }, {displayModeBar: true});

    if (scrollToPlot) {
        setTimeout(()=>{plot.scrollIntoView({behavior:'smooth', block:'center'});}, 200);
    }
}

// V值对比度类型提示功能
function initVTooltip() {
    const vInfoIcon = document.getElementById('v-info-icon');
    const vSlider = document.getElementById('V');
    const vNumberInput = vSlider ? vSlider.parentElement.querySelector('.number-input') : null;
    
    if (vInfoIcon) {
        vInfoIcon.addEventListener('click', function(event) {
            event.stopPropagation();
            showVTooltip();
        });
    }
    
    // 监听V值变化，动态更新弹窗内容
    if (vSlider) {
        vSlider.addEventListener('input', updateVTooltipContent);
    }
    if (vNumberInput) {
        vNumberInput.addEventListener('input', updateVTooltipContent);
    }
    
    // 点击其他地方关闭弹窗
    document.addEventListener('click', function(event) {
        const tooltip = document.getElementById('v-tooltip');
        const overlay = document.querySelector('.v-tooltip-overlay');
        
        if (tooltip && tooltip.style.display === 'block' && 
            !tooltip.contains(event.target) && 
            event.target !== vInfoIcon) {
            hideVTooltip();
        }
    });
    
    // 初始化内容
    updateVTooltipContent();
}

function showVTooltip() {
    const tooltip = document.getElementById('v-tooltip');
    if (tooltip) {
        updateVTooltipContent();
        
        // 添加覆盖层让背景变暗
        let overlay = document.querySelector('.v-tooltip-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'v-tooltip-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';
        
        // 确保弹窗在body的最顶层，不受覆盖层影响
        document.body.appendChild(tooltip);
        
        // 显示弹窗（在覆盖层之上）
        tooltip.style.display = 'block';
        tooltip.style.zIndex = '10001';
        tooltip.style.opacity = '1';
        tooltip.style.filter = 'none';
        
        // 阻止页面滚动
        document.body.style.overflow = 'hidden';
    }
}

function hideVTooltip() {
    const tooltip = document.getElementById('v-tooltip');
    const overlay = document.querySelector('.v-tooltip-overlay');
    
    if (tooltip) {
        tooltip.style.display = 'none';
    }
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    // 恢复页面滚动
    document.body.style.overflow = '';
}

function updateVTooltipContent() {
    const vSlider = document.getElementById('V');
    if (!vSlider) return;
    
    const vValue = parseFloat(vSlider.value);
    
    // 更新当前V值
    const currentValueElement = document.getElementById('v-current-value');
    if (currentValueElement) {
        currentValueElement.textContent = vValue.toFixed(3);
    }
    
    // 确定对比度类型 - 使用动态边界（基于首个厚度为1的点）
    let contrastType, contrastClass, formula, description, stageDescription;
    
    // 获取动态边界值（如果不存在则使用默认值）
    const dynamicBoundary = window.currentStageBoundaries?.stage1_boundary || 0.5;

    // 计算阈值锐度参数（统一公式）
    const alpha = Math.max(0.1, (vValue - 0.5) * 10).toFixed(1);
    
    if (vValue < dynamicBoundary) {
        contrastType = '第一阶段：低对比度';
        contrastClass = 'low-contrast';
        formula = `M(x) = 1 / [1 + e<sup>α·(D(x) - D<sub>th</sub>)</sup>]`;
        description = `平缓变化阶段，α=${alpha}`;
        stageDescription = `厚度变化平缓，曲线斜率较小，适合精细图案制作`;
    } else {
        contrastType = '第二阶段：高对比度';
        contrastClass = 'high-contrast';
        formula = `M(x) = 1 / [1 + e<sup>α·(D(x) - D<sub>th</sub>)</sup>]`;
        description = `锐利变化阶段，α=${alpha}`;
        stageDescription = `厚度变化锐利，曲线斜率较大，适合高对比度图案`;
    }
    
    // 更新对比度类型
    const typeElement = document.getElementById('v-contrast-type');
    if (typeElement) {
        typeElement.textContent = contrastType;
        typeElement.className = `v-tooltip-type ${contrastClass}`;
    }
    
    // 更新公式
    const formulaElement = document.getElementById('v-formula');
    if (formulaElement) {
        const formulaText = formulaElement.querySelector('.formula-text');
        if (formulaText) {
            formulaText.innerHTML = formula;
        }
    }
    
    // 更新描述
    const descriptionElement = document.getElementById('v-description');
    if (descriptionElement) {
        descriptionElement.textContent = description;
    }
    
    // 更新物理意义
    const physicalElement = document.getElementById('v-physical-meaning');
    if (physicalElement) {
        physicalElement.textContent = stageDescription;
    }
    
    // 更新阶段边界信息
    const stageInfoElement = document.getElementById('v-stage-info');
    if (stageInfoElement) {
        stageInfoElement.innerHTML = `
            <strong>阶段边界：</strong><br>
            第一阶段：0.100 - ${dynamicBoundary.toFixed(3)}<br>
            第二阶段：${dynamicBoundary.toFixed(3)} - 1.000<br>
            <br><small>转折点: V=${dynamicBoundary.toFixed(3)} (首个厚度为1的点)</small>
        `;
    }
}

// 在页面加载完成后初始化V值提示功能
document.addEventListener('DOMContentLoaded', function() {
    initVTooltip();
});

// 如果页面已经加载完成，立即初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVTooltip);
} else {
    initVTooltip();
}

/**
 * 重置模型特定组件和状态
 */
function resetModelSpecificComponents() {
    // 隐藏所有的预览图表
    const previewPlots = [
        document.getElementById('phi-expr-preview-plot'),
        document.getElementById('phi-expr-3d-preview-plot'),
        document.getElementById('enhanced-phi-expr-preview-plot'),
        document.getElementById('enhanced-phi-expr-3d-preview-plot'),
        document.getElementById('car-phi-expr-preview-plot'),
        document.getElementById('car-phi-expr-3d-preview-plot')
    ];
    
    previewPlots.forEach(plot => {
        if (plot) {
            plot.style.display = 'none';
            if (typeof Plotly !== 'undefined' && Plotly.purge) {
                Plotly.purge(plot); // 清除Plotly图表资源
            }
        }
    });
    
    // 隐藏所有的相位预览控制面板
    const previewControls = [
        document.getElementById('phi-expr-preview-controls'),
        document.getElementById('phi-expr-3d-preview-controls'),
        document.getElementById('enhanced-phi-expr-preview-controls'),
        document.getElementById('enhanced-phi-expr-3d-preview-controls'),
        document.getElementById('car-phi-expr-preview-controls'),
        document.getElementById('car-phi-expr-3d-preview-controls')
    ];
    
    previewControls.forEach(control => {
        if (control) {
            control.style.display = 'none';
        }
    });
    
    // 重置预览按钮文本
    const previewButtons = [
        document.getElementById('phi-expr-preview-btn'),
        document.getElementById('phi-expr-3d-preview-btn'),
        document.getElementById('enhanced-phi-expr-preview-btn'),
        document.getElementById('enhanced-phi-expr-3d-preview-btn'),
        document.getElementById('car-phi-expr-preview-btn'),
        document.getElementById('car-phi-expr-3d-preview-btn')
    ];
    
    const currentLang = window.currentLang || localStorage.getItem('lang') || 'zh-CN';
    previewButtons.forEach(btn => {
        if (btn) {
            const text = LANGS[currentLang]?.btn_preview_2d_distribution || '预览分布';
            btn.innerHTML = `<span class="preview-icon"></span> ${text}`;
        }
    });
    
    // 清除CAR模型特有的交互式图表
    if (typeof resetCarPlots === 'function') {
        try {
            resetCarPlots();
        } catch (error) {
            console.warn('重置CAR模型图表失败:', error);
        }
    }
    
    // 隐藏阈值控制区域
    const thresholdContainers = [
        document.getElementById('exposure-thresholds-container'),
        document.getElementById('thickness-thresholds-container')
    ];
    
    thresholdContainers.forEach(container => {
        if (container) {
            container.style.display = 'none';
        }
    });

    // 取消勾选所有模型的4D动画复选框
    const dill4DCheckbox = document.getElementById('enable_4d_animation_dill');
    if (dill4DCheckbox && dill4DCheckbox.checked) {
        dill4DCheckbox.checked = false;
        dill4DCheckbox.dispatchEvent(new Event('change'));
    }

    const enhancedDill4DCheckbox = document.getElementById('enable_4d_animation_enhanced_dill');
    if (enhancedDill4DCheckbox && enhancedDill4DCheckbox.checked) {
        enhancedDill4DCheckbox.checked = false;
        enhancedDill4DCheckbox.dispatchEvent(new Event('change'));
    }
}

/**
 * 初始化加载期间日志功能
 */
function initLoadingLogs() {
    // 获取DOM元素
    loadingLogsPanel = document.getElementById('loading-logs-panel');
    loadingLogsContainer = document.getElementById('loading-logs-container');
    loadingProgressText = document.getElementById('loading-progress-text');
    loadingTimeText = document.getElementById('loading-time-text');
    
    // 绑定按钮事件
    const loadingLogsBtn = document.getElementById('loading-logs-btn');
    const loadingLogsClose = document.getElementById('loading-logs-close');
    const loadingLogsMinimize = document.getElementById('loading-logs-minimize');
    
    // 显示/隐藏日志面板
    if (loadingLogsBtn) {
        loadingLogsBtn.addEventListener('click', () => {
            toggleLoadingLogsPanel();
        });
    }
    
    // 关闭日志面板
    if (loadingLogsClose) {
        loadingLogsClose.addEventListener('click', () => {
            hideLoadingLogsPanel();
        });
    }
    
    // 最小化/还原日志面板
    if (loadingLogsMinimize) {
        loadingLogsMinimize.addEventListener('click', () => {
            toggleLoadingLogsPanelMinimize();
        });
    }
}

/**
 * 显示/隐藏加载期间日志面板
 */
function toggleLoadingLogsPanel() {
    console.log('🔍 [DEBUG] toggleLoadingLogsPanel 被调用');
    console.log('🔍 [DEBUG] window.systematicLogManager 存在:', !!window.systematicLogManager);
    
    // 如果系统化日志管理器可用，使用新系统
    if (window.systematicLogManager) {
        console.log('🔍 [DEBUG] 使用新的系统化日志管理器');
        window.systematicLogManager.togglePanel();
    } else {
        console.log('🔍 [DEBUG] 回退到旧的日志系统');
        if (!loadingLogsPanel) return;
        
        if (loadingLogsPanel.classList.contains('visible')) {
            hideLoadingLogsPanel();
        } else {
            showLoadingLogsPanel();
        }
    }
}

/**
 * 显示加载期间日志面板
 */
function showLoadingLogsPanel() {
    const loadingLogsPanel = document.getElementById('loading-logs-panel');
    if (loadingLogsPanel) {
        loadingLogsPanel.style.display = 'block';
        setTimeout(() => {
            loadingLogsPanel.classList.add('visible');
            // 新增：滚动到日志面板
            loadingLogsPanel.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 10);
    }
}

/**
 * 隐藏加载期间日志面板
 */
function hideLoadingLogsPanel() {
    if (!loadingLogsPanel) return;
    
    loadingLogsPanel.classList.remove('visible');
    loadingLogsPanel.classList.remove('minimized');
    
    // 等待动画完成后再隐藏
    setTimeout(() => {
        if (!loadingLogsPanel.classList.contains('visible')) {
            loadingLogsPanel.style.display = 'none';
        }
    }, 400); // 与CSS动画时间保持一致
    
    // 停止获取实时日志
    stopLoadingLogsUpdate();
}

/**
 * 最小化/还原日志面板
 */
function toggleLoadingLogsPanelMinimize() {
    if (!loadingLogsPanel) return;
    
    loadingLogsPanel.classList.toggle('minimized');
}

/**
 * 开始加载期间日志更新
 */
function startLoadingLogsUpdate() {
    // 如果系统化日志管理器可用，使用新系统
    if (window.systematicLogManager) {
        window.systematicLogManager.startLogUpdates();
    } else {
        // 记录开始时间
        loadingStartTime = Date.now();
        
        // 开始时间计时器
        loadingTimeInterval = setInterval(() => {
            updateLoadingTime();
        }, 100);
        
        // 开始日志获取
        updateLoadingLogs();
        
        // 定期更新日志
        window.loadingLogsUpdateInterval = setInterval(() => {
            updateLoadingLogs();
        }, 1000);
    }
}

/**
 * 停止加载期间日志更新
 */
function stopLoadingLogsUpdate() {
    // 如果系统化日志管理器可用，使用新系统
    if (window.systematicLogManager) {
        window.systematicLogManager.stopLogUpdates();
    } else {
        if (loadingTimeInterval) {
            clearInterval(loadingTimeInterval);
            loadingTimeInterval = null;
        }
        
        if (window.loadingLogsUpdateInterval) {
            clearInterval(window.loadingLogsUpdateInterval);
            window.loadingLogsUpdateInterval = null;
        }
    }
}

/**
 * 更新加载时间显示
 */
function updateLoadingTime() {
    if (!loadingStartTime || !loadingTimeText) return;
    
    const elapsed = Date.now() - loadingStartTime;
    const seconds = (elapsed / 1000).toFixed(1);
    loadingTimeText.textContent = `${seconds}s`;
}

/**
 * 获取并更新加载期间日志
 */
async function updateLoadingLogs() {
    try {
        const response = await fetch('/api/logs?limit=50');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const logs = await response.json();
        displayLoadingLogs(logs);
        
    } catch (error) {
        console.error('获取加载日志失败:', error);
        // 显示错误信息
        if (loadingLogsContainer) {
            const errorItem = createLoadingLogItem('error', '获取日志失败: ' + error.message);
            prependLoadingLogItem(errorItem);
        }
    }
}

/**
 * 显示加载期间日志
 */
function displayLoadingLogs(logs) {
    if (!loadingLogsContainer || !logs || logs.length === 0) return;
    
    // 清除占位符
    const placeholder = loadingLogsContainer.querySelector('.loading-logs-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
    
    // 获取当前显示的日志条目数
    const currentItems = loadingLogsContainer.querySelectorAll('.loading-log-item').length;
    
    // 只显示新的日志条目
    if (logs.length > currentItems) {
        const newLogs = logs.slice(currentItems);
        
        newLogs.forEach(log => {
            const logItem = createLoadingLogItem(
                getLogType(log.message),
                log.message,
                new Date(log.timestamp)
            );
            prependLoadingLogItem(logItem);
        });
        
        // 更新进度显示
        updateLoadingProgress(logs);
    }
}

/**
 * 创建加载日志条目
 */
function createLoadingLogItem(type, message, timestamp) {
    const item = document.createElement('div');
    item.className = `loading-log-item ${type}`;
    
    const timeStr = timestamp ? formatTime(timestamp) : formatTime(new Date());
    const typeInfo = getLogTypeInfo(type);

    let displayMessage = escapeHtml(message);
    
    // 获取当前计算信息
    const calcInfo = window.currentCalculationInfo;
    
    if (calcInfo && calcInfo.model) {
        // 模型名称映射，用于日志匹配
        const modelNameMap = {
            dill: 'Dill',
            enhanced_dill: '增强Dill',
            car: 'CAR'
        };
        
        const modelDisplayName = modelNameMap[calcInfo.model];
        
        // 只有当日志类型与当前计算模型匹配时，才添加维度信息
        if (modelDisplayName && message.includes(`[${modelDisplayName}]`)) {
            const newTag = `[${modelDisplayName}: ${calcInfo.dimension}]`;
            displayMessage = escapeHtml(message.replace(`[${modelDisplayName}]`, newTag));
        }
    }
    
    item.innerHTML = `
        <div class="loading-log-icon">
            <i class="${typeInfo.icon}"></i>
        </div>
        <div class="loading-log-content">
            <div class="loading-log-timestamp">[${timeStr}]</div>
            <div class="loading-log-message">${displayMessage}</div>
        </div>
    `;
    
    return item;
}

/**
 * 在日志列表顶部添加日志条目
 */
function prependLoadingLogItem(item) {
    if (!loadingLogsContainer) return;
    
    // 添加进入动画
    item.style.opacity = '0';
    item.style.transform = 'translateY(-10px)';
    
    loadingLogsContainer.insertBefore(item, loadingLogsContainer.firstChild);
    
    // 触发动画
    setTimeout(() => {
        item.style.transition = 'all 0.3s ease';
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
    }, 10);
    
    // 限制显示的日志条目数量
    const maxItems = 20;
    const items = loadingLogsContainer.querySelectorAll('.loading-log-item');
    if (items.length > maxItems) {
        for (let i = maxItems; i < items.length; i++) {
            items[i].remove();
        }
    }
}

/**
 * 根据日志消息确定日志类型
 */
function getLogType(message) {
    if (!message) return 'info';
    
    message = message.toLowerCase();
    
    if (message.includes('error') || message.includes('失败') || message.includes('错误')) {
        return 'error';
    } else if (message.includes('warning') || message.includes('警告')) {
        return 'warning';
    } else if (message.includes('进度:') || message.includes('progress:') || message.includes('计算完成') || message.includes('开始计算')) {
        return 'progress';
    } else if (message.includes('完成') || message.includes('成功') || message.includes('success')) {
        return 'success';
    }
    
    return 'info';
}

/**
 * 获取日志类型对应的图标信息
 */
function getLogTypeInfo(type) {
    const typeInfoMap = {
        'info': { icon: 'fas fa-info-circle', color: '#3498db' },
        'success': { icon: 'fas fa-check-circle', color: '#28a745' },
        'warning': { icon: 'fas fa-exclamation-triangle', color: '#ffc107' },
        'error': { icon: 'fas fa-times-circle', color: '#dc3545' },
        'progress': { icon: 'fas fa-clock', color: '#3498db' }
    };
    
    return typeInfoMap[type] || typeInfoMap['info'];
}

/**
 * 更新加载进度显示
 */
function updateLoadingProgress(logs) {
    if (!loadingProgressText || !logs || logs.length === 0) return;
    
    // 寻找最新的进度信息
    for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i];
        if (log.message && log.message.includes('进度:')) {
            // 提取进度信息
            const match = log.message.match(/进度:\s*(\d+)\/(\d+)/);
            if (match) {
                const current = parseInt(match[1]);
                const total = parseInt(match[2]);
                const percentage = ((current / total) * 100).toFixed(1);
                loadingProgressText.textContent = `${current}/${total} (${percentage}%)`;
                return;
            }
        }
    }
    
    // 如果没有找到具体进度，显示状态信息
    if (logs.length > 0) {
        const latestLog = logs[logs.length - 1];
        if (latestLog.message.includes('计算完成')) {
            loadingProgressText.textContent = '计算完成';
        } else if (latestLog.message.includes('开始计算')) {
            loadingProgressText.textContent = '计算中...';
        }
    }
}

/**
 * 格式化时间戳
 */
function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * HTML转义
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * 执行从加载页到主页面的日志过渡动画
 */
function transitionLogsFromLoadingToMain() {
    if (!loadingLogsPanel) return;
    
    const mainLogsModal = document.getElementById('logs-modal');
    
    // 如果加载期间日志面板可见，执行过渡动画
    if (loadingLogsPanel.classList.contains('visible')) {
        // 添加过渡动画类
        loadingLogsPanel.classList.add('loading-to-main-transition');
        
        // 停止日志更新
        stopLoadingLogsUpdate();
        
        // 延迟显示主页面日志
        setTimeout(() => {
            hideLoadingLogsPanel();
            
            if (mainLogsModal && typeof showLogsModal === 'function') {
                mainLogsModal.classList.add('main-logs-transition');
                showLogsModal();
                
                // 移除过渡动画类
                setTimeout(() => {
                    mainLogsModal.classList.remove('main-logs-transition');
                }, 800);
            }
        }, 400);
    }
}

/**
 * 测试新日志系统
 */
function testNewLogSystem() {
    console.log('🧪 [TEST] 开始测试新日志系统');
    
    if (!window.systematicLogManager) {
        console.error('❌ [TEST] 系统化日志管理器不存在');
        return false;
    }
    
    console.log('✅ [TEST] 系统化日志管理器存在');
    
    // 强制显示面板
    try {
        window.systematicLogManager.showPanel();
        console.log('✅ [TEST] 强制显示面板成功');
    } catch (error) {
        console.error('❌ [TEST] 强制显示面板失败:', error);
        return false;
    }
    
    // 添加测试日志
    try {
        window.systematicLogManager.addLog('info', '这是一条测试日志信息', '2d', '详细信息测试');
        window.systematicLogManager.addLog('progress', '这是一条测试进度信息', '3d');
        window.systematicLogManager.addLog('success', '这是一条测试成功信息', '1d');
        console.log('✅ [TEST] 添加测试日志成功');
    } catch (error) {
        console.error('❌ [TEST] 添加测试日志失败:', error);
        return false;
    }
    
    return true;
}

// 暴露测试函数到全局作用域，便于在控制台调用
window.testNewLogSystem = testNewLogSystem;

/**
 * 滑动到页面最底部并刷新日志系统
 */
function scrollToBottomAndRefreshLogs() {
    // 查找日志容器并滚动到其底部
    const logsContainer = document.getElementById('logs-container');
    if (logsContainer) {
        // 先滚动到日志区域
        logsContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
        // 然后滚动日志容器内部到底部
        setTimeout(() => {
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }, 300);
    } else {
        // 如果没有找到日志容器，滚动到页面底部作为后备方案
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    }
    
    // 延迟一点时间后自动刷新日志
    setTimeout(() => {
        // 检查是否有刷新日志的按钮并点击它
        const refreshBtn = document.getElementById('refresh-logs-btn');
        if (refreshBtn && typeof refreshBtn.onclick === 'function') {
            refreshBtn.onclick();
        } else if (typeof loadLogs === 'function') {
            // 如果没有找到按钮或按钮的点击事件，直接调用加载日志函数
            loadLogs();
        }
    }, 500); // 等待滚动开始后再刷新日志
}

// DILL模型4D动画相关变量和函数
let dill4DAnimationData = null;
let dill4DAnimationState = {
    isPlaying: false,
    currentFrame: 0,
    totalFrames: 0,
    timeArray: [],
    intervalId: null,
    loopEnabled: false
};

let enhancedDill4DAnimationData = null;
let enhancedDill4DAnimationState = {
    isPlaying: false,
    currentFrame: 0,
    totalFrames: 0,
    timeArray: [],
    intervalId: null,
    loopEnabled: false
};

// 4D动画开关互斥管理
function handle4DAnimationExclusivity(enabledModel) {
    console.log(`4D动画开关互斥: 启用${enabledModel}模型，禁用其他模型`);
    
    // 获取所有4D动画复选框
    const dillCheckbox = document.getElementById('enable_4d_animation_dill');
    const enhancedDillCheckbox = document.getElementById('enable_4d_animation_enhanced_dill');
    const carCheckbox = document.getElementById('car_enable_4d_animation');
    
    // 获取所有4D参数面板
    const dillParams = document.getElementById('dill_4d_time_params');
    const enhancedDillParams = document.getElementById('enhanced_dill_4d_time_params');
    const carParams = document.getElementById('car_4d_time_params');
    
    // 获取所有4D动画区域
    const dillAnimationSection = document.getElementById('dill-4d-animation-section');
    const enhancedDillAnimationSection = document.getElementById('enhanced-dill-4d-animation-section');
    const carAnimationSection = document.getElementById('car-4d-animation-section');
    
    // 根据启用的模型，禁用其他模型
    switch(enabledModel) {
        case 'dill':
            // 禁用其他模型
            if (enhancedDillCheckbox) {
                enhancedDillCheckbox.checked = false;
                if (enhancedDillParams) enhancedDillParams.style.display = 'none';
                if (enhancedDillAnimationSection) enhancedDillAnimationSection.style.display = 'none';
            }
            if (carCheckbox) {
                carCheckbox.checked = false;
                if (carParams) carParams.style.display = 'none';
                if (carAnimationSection) carAnimationSection.style.display = 'none';
            }
            // 停止其他模型的动画
            if (enhancedDill4DAnimationState.intervalId) {
                clearInterval(enhancedDill4DAnimationState.intervalId);
                enhancedDill4DAnimationState.intervalId = null;
                enhancedDill4DAnimationState.isPlaying = false;
            }
            if (typeof car4DAnimationState !== 'undefined' && car4DAnimationState.intervalId) {
                clearInterval(car4DAnimationState.intervalId);
                car4DAnimationState.intervalId = null;
                car4DAnimationState.isPlaying = false;
            }
            break;
            
        case 'enhanced_dill':
            // 禁用其他模型
            if (dillCheckbox) {
                dillCheckbox.checked = false;
                if (dillParams) dillParams.style.display = 'none';
                if (dillAnimationSection) dillAnimationSection.style.display = 'none';
            }
            if (carCheckbox) {
                carCheckbox.checked = false;
                if (carParams) carParams.style.display = 'none';
                if (carAnimationSection) carAnimationSection.style.display = 'none';
            }
            // 停止其他模型的动画
            if (dill4DAnimationState.intervalId) {
                clearInterval(dill4DAnimationState.intervalId);
                dill4DAnimationState.intervalId = null;
                dill4DAnimationState.isPlaying = false;
            }
            if (typeof car4DAnimationState !== 'undefined' && car4DAnimationState.intervalId) {
                clearInterval(car4DAnimationState.intervalId);
                car4DAnimationState.intervalId = null;
                car4DAnimationState.isPlaying = false;
            }
            break;
            
        case 'car':
            // 禁用其他模型
            if (dillCheckbox) {
                dillCheckbox.checked = false;
                if (dillParams) dillParams.style.display = 'none';
                if (dillAnimationSection) dillAnimationSection.style.display = 'none';
            }
            if (enhancedDillCheckbox) {
                enhancedDillCheckbox.checked = false;
                if (enhancedDillParams) enhancedDillParams.style.display = 'none';
                if (enhancedDillAnimationSection) enhancedDillAnimationSection.style.display = 'none';
            }
            // 停止其他模型的动画
            if (dill4DAnimationState.intervalId) {
                clearInterval(dill4DAnimationState.intervalId);
                dill4DAnimationState.intervalId = null;
                dill4DAnimationState.isPlaying = false;
            }
            if (enhancedDill4DAnimationState.intervalId) {
                clearInterval(enhancedDill4DAnimationState.intervalId);
                enhancedDill4DAnimationState.intervalId = null;
                enhancedDill4DAnimationState.isPlaying = false;
            }
            break;
    }
    
    console.log(`4D动画开关互斥处理完成: ${enabledModel}模型已启用，其他模型已禁用`);
}

// DILL模型4D动画事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // DILL模型4D动画复选框事件
    const enable4DAnimationDill = document.getElementById('enable_4d_animation_dill');
    const dill4DTimeParams = document.getElementById('dill_4d_time_params');
    
    if (enable4DAnimationDill && dill4DTimeParams) {
        enable4DAnimationDill.addEventListener('change', function() {
            if (this.checked) {
                // 启用DILL 4D动画，禁用其他模型
                handle4DAnimationExclusivity('dill');
                dill4DTimeParams.style.display = 'flex';
                console.log('DILL模型4D动画已启用，其他模型已禁用');
            } else {
                dill4DTimeParams.style.display = 'none';
                // 隐藏4D动画区域
                const animationSection = document.getElementById('dill-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                }
                // 停止当前播放的动画
                if (dill4DAnimationState.intervalId) {
                    clearInterval(dill4DAnimationState.intervalId);
                    dill4DAnimationState.intervalId = null;
                    dill4DAnimationState.isPlaying = false;
                }
                console.log('DILL模型4D动画已禁用');
            }
        });
        
        // 添加便捷关闭按钮事件监听器
        const closeDill4DTimeParamsBtn = document.getElementById('close_dill_4d_time_params');
        if (closeDill4DTimeParamsBtn) {
            closeDill4DTimeParamsBtn.addEventListener('click', function() {
                // 取消勾选复选框并隐藏面板
                enable4DAnimationDill.checked = false;
                dill4DTimeParams.style.display = 'none';
                
                // 隐藏4D动画区域
                const animationSection = document.getElementById('dill-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                }
                
                // 停止当前播放的动画
                if (dill4DAnimationState.intervalId) {
                    clearInterval(dill4DAnimationState.intervalId);
                    dill4DAnimationState.intervalId = null;
                    dill4DAnimationState.isPlaying = false;
                }
                
                console.log('用户点击关闭按钮，已隐藏DILL 4D动画面板和动画区域');
            });
        }
    }
    
    // 增强DILL模型4D动画复选框事件
    const enable4DAnimationEnhancedDill = document.getElementById('enable_4d_animation_enhanced_dill');
    const enhancedDill4DTimeParams = document.getElementById('enhanced_dill_4d_time_params');
    
    if (enable4DAnimationEnhancedDill && enhancedDill4DTimeParams) {
        // 初始化时根据复选框状态设置参数面板
        enhancedDill4DTimeParams.style.display = enable4DAnimationEnhancedDill.checked ? 'flex' : 'none';
        
        enable4DAnimationEnhancedDill.addEventListener('change', function() {
            if (this.checked) {
                // 启用Enhanced DILL 4D动画，禁用其他模型
                handle4DAnimationExclusivity('enhanced_dill');
                enhancedDill4DTimeParams.style.display = 'flex';
                console.log('Enhanced DILL模型4D动画已启用，其他模型已禁用');
            } else {
                enhancedDill4DTimeParams.style.display = 'none';
                // 隐藏4D动画区域
                const animationSection = document.getElementById('enhanced-dill-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                }
                // 停止当前播放的动画
                if (enhancedDill4DAnimationState.intervalId) {
                    clearInterval(enhancedDill4DAnimationState.intervalId);
                    enhancedDill4DAnimationState.intervalId = null;
                    enhancedDill4DAnimationState.isPlaying = false;
                }
                console.log('Enhanced DILL模型4D动画已禁用');
            }
        });
        
        // 添加便捷关闭按钮事件监听器
        const closeEnhancedDill4DTimeParamsBtn = document.getElementById('close_enhanced_dill_4d_time_params');
        if (closeEnhancedDill4DTimeParamsBtn) {
            closeEnhancedDill4DTimeParamsBtn.addEventListener('click', function() {
                // 取消勾选复选框并隐藏面板
                enable4DAnimationEnhancedDill.checked = false;
                enhancedDill4DTimeParams.style.display = 'none';
                
                // 隐藏4D动画区域
                const animationSection = document.getElementById('enhanced-dill-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                }
                
                // 停止当前播放的动画
                if (enhancedDill4DAnimationState.intervalId) {
                    clearInterval(enhancedDill4DAnimationState.intervalId);
                    enhancedDill4DAnimationState.intervalId = null;
                    enhancedDill4DAnimationState.isPlaying = false;
                }
                
                console.log('用户点击关闭按钮，已隐藏Enhanced DILL 4D动画面板和动画区域');
            });
        }
    }
    
    // CAR模型4D动画复选框事件 (如果存在)
    const carEnable4DAnimation = document.getElementById('car_enable_4d_animation');
    const car4DTimeParams = document.getElementById('car_4d_time_params');
    
    if (carEnable4DAnimation && car4DTimeParams) {
        carEnable4DAnimation.addEventListener('change', function() {
            if (this.checked) {
                // 启用CAR 4D动画，禁用其他模型
                handle4DAnimationExclusivity('car');
                car4DTimeParams.style.display = 'flex';
                console.log('CAR模型4D动画已启用，其他模型已禁用');
            } else {
                car4DTimeParams.style.display = 'none';
                // 隐藏4D动画区域
                const animationSection = document.getElementById('car-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                }
                // 停止当前播放的动画
                if (typeof car4DAnimationState !== 'undefined' && car4DAnimationState.intervalId) {
                    clearInterval(car4DAnimationState.intervalId);
                    car4DAnimationState.intervalId = null;
                    car4DAnimationState.isPlaying = false;
                }
                console.log('CAR模型4D动画已禁用');
            }
        });
        
        // 添加便捷关闭按钮事件监听器
        const closeCar4DParamsBtn = document.getElementById('close_car_4d_params');
        if (closeCar4DParamsBtn) {
            closeCar4DParamsBtn.addEventListener('click', function() {
                // 取消勾选复选框并隐藏面板
                carEnable4DAnimation.checked = false;
                car4DTimeParams.style.display = 'none';
                
                // 隐藏4D动画区域
                const animationSection = document.getElementById('car-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                }
                
                // 停止当前播放的动画
                if (typeof car4DAnimationState !== 'undefined' && car4DAnimationState.intervalId) {
                    clearInterval(car4DAnimationState.intervalId);
                    car4DAnimationState.intervalId = null;
                    car4DAnimationState.isPlaying = false;
                }
                
                console.log('用户点击关闭按钮，已隐藏CAR 4D动画面板和动画区域');
            });
        }
    }
    
    // DILL模型4D动画控制按钮事件
    setupDill4DAnimationControls();
    setupEnhancedDill4DAnimationControls();
    // DILL模型1D动画控制按钮事件
    setupDill1DAnimationControls();
    // DILL模型1D V评估参数控制事件
    setupDill1DVEvaluationParameterControls();
});

// 设置DILL模型4D动画控制事件
function setupDill4DAnimationControls() {
    const enable4DAnimationDill = document.getElementById('enable_4d_animation_dill');
    const dill4DTimeParams = document.getElementById('dill_4d_time_params');
    
    if (enable4DAnimationDill && dill4DTimeParams) {
        // 初始状态：根据复选框状态显示/隐藏参数
        dill4DTimeParams.style.display = enable4DAnimationDill.checked ? 'block' : 'none';
        
        enable4DAnimationDill.addEventListener('change', function() {
            dill4DTimeParams.style.display = this.checked ? 'block' : 'none';
            
            // 如果取消勾选，立即隐藏4D动画区域
            if (!this.checked) {
                const animationSection = document.getElementById('dill-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                    console.log('用户取消勾选DILL 4D动画，已隐藏动画区域');
                }
                // 停止当前播放的动画
                if (typeof dill4DAnimationState !== 'undefined' && dill4DAnimationState.intervalId) {
                    clearInterval(dill4DAnimationState.intervalId);
                    dill4DAnimationState.intervalId = null;
                    dill4DAnimationState.isPlaying = false;
                }
            }
        });
    }
}

function setupEnhancedDill4DAnimationControls() {
    const enable4DAnimationEnhancedDill = document.getElementById('enable_4d_animation_enhanced_dill');
    const enhancedDill4DTimeParams = document.getElementById('enhanced_dill_4d_time_params');
    
    if (enable4DAnimationEnhancedDill && enhancedDill4DTimeParams) {
        // 初始状态：根据复选框状态显示/隐藏参数
        enhancedDill4DTimeParams.style.display = enable4DAnimationEnhancedDill.checked ? 'block' : 'none';
        
        enable4DAnimationEnhancedDill.addEventListener('change', function() {
            enhancedDill4DTimeParams.style.display = this.checked ? 'block' : 'none';
            
            // 如果取消勾选，立即隐藏4D动画区域
            if (!this.checked) {
                const animationSection = document.getElementById('enhanced-dill-4d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                    console.log('用户取消勾选Enhanced DILL 4D动画，已隐藏动画区域');
                }
                // 停止当前播放的动画
                if (typeof enhancedDill4DAnimationState !== 'undefined' && enhancedDill4DAnimationState.intervalId) {
                    clearInterval(enhancedDill4DAnimationState.intervalId);
                    enhancedDill4DAnimationState.intervalId = null;
                    enhancedDill4DAnimationState.isPlaying = false;
                }
            }
        });
    }
}

// 设置DILL模型1D动画控制事件
function setupDill1DAnimationControls() {
    const enable1DAnimationDill = document.getElementById('enable_1d_animation_dill');
    const dill1DTimeParams = document.getElementById('dill_1d_time_params');
    
    if (enable1DAnimationDill && dill1DTimeParams) {
        // 初始状态：根据复选框状态显示/隐藏参数
        dill1DTimeParams.style.display = enable1DAnimationDill.checked ? 'block' : 'none';
        
        enable1DAnimationDill.addEventListener('change', function() {
            dill1DTimeParams.style.display = this.checked ? 'block' : 'none';
            
            // 如果取消勾选，立即隐藏1D动画区域
            if (!this.checked) {
                const animationSection = document.getElementById('dill-1d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                    console.log('用户取消勾选DILL 1D动画，已隐藏动画区域');
                }
                // 停止当前播放的动画
                if (typeof dill1DAnimationState !== 'undefined' && dill1DAnimationState.intervalId) {
                    clearInterval(dill1DAnimationState.intervalId);
                    dill1DAnimationState.intervalId = null;
                    dill1DAnimationState.isPlaying = false;
                }
            }
        });
        
        // 添加便捷关闭按钮事件监听器
        const close1DTimeParamsBtn = document.getElementById('close_dill_1d_time_params');
        if (close1DTimeParamsBtn) {
            close1DTimeParamsBtn.addEventListener('click', function() {
                // 取消勾选复选框并隐藏面板
                enable1DAnimationDill.checked = false;
                dill1DTimeParams.style.display = 'none';
                
                // 隐藏1D动画区域
                const animationSection = document.getElementById('dill-1d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                    console.log('用户点击关闭按钮，已隐藏DILL 1D动画面板和动画区域');
                }
                
                // 停止当前播放的动画
                if (typeof dill1DAnimationState !== 'undefined' && dill1DAnimationState.intervalId) {
                    clearInterval(dill1DAnimationState.intervalId);
                    dill1DAnimationState.intervalId = null;
                    dill1DAnimationState.isPlaying = false;
                }
            });
        }
    }
}

// 设置DILL模型1D V评估控制事件
function setupDill1DVEvaluationParameterControls() {
    console.log('设置DILL 1D V评估参数控制');
    
    const enable1DVEvaluationDill = document.getElementById('enable_1d_v_evaluation_dill');
    const dill1DVParams = document.getElementById('dill_1d_v_params');
    
    if (enable1DVEvaluationDill && dill1DVParams) {
        // 初始状态：根据复选框状态显示/隐藏参数
        dill1DVParams.style.display = enable1DVEvaluationDill.checked ? 'block' : 'none';
        
        enable1DVEvaluationDill.addEventListener('change', function() {
            dill1DVParams.style.display = this.checked ? 'block' : 'none';
            console.log(`DILL 1D V评估开关状态: ${this.checked ? '启用' : '禁用'}`);
            
            // 如果取消勾选，立即隐藏V评估区域
            if (!this.checked) {
                const vEvaluationSection = document.getElementById('dill-1d-v-evaluation-section');
                if (vEvaluationSection) {
                    vEvaluationSection.style.display = 'none';
                    console.log('用户取消勾选DILL 1D V评估，已隐藏V评估区域');
                }
                // 停止当前播放的V评估动画
                if (typeof dill1DVEvaluationState !== 'undefined' && dill1DVEvaluationState.intervalId) {
                    clearInterval(dill1DVEvaluationState.intervalId);
                    dill1DVEvaluationState.intervalId = null;
                    dill1DVEvaluationState.isPlaying = false;
                }
            }
        });
        
        console.log('DILL 1D V评估参数控制事件已绑定');
    } else {
        console.error('DILL 1D V评估控制元素未找到:', {
            enable1DVEvaluationDill: !!enable1DVEvaluationDill,
            dill1DVParams: !!dill1DVParams
        });
    }
}

// ... existing code ...

function getDillModelParams() {
    const sineType = document.getElementById('dill-sine-type').value;
    const enable4DAnimation = document.getElementById('enable_4d_animation_dill')?.checked || false;
    
    const params = {
        model_type: 'dill',
        sine_type: sineType
    };
    
    // 只有在3D模式且启用4D动画时才添加4D动画参数
    if (enable4DAnimation && sineType === '3d') {
        params.enable_4d_animation = true;
        params.t_start = parseFloat(document.getElementById('t_start_dill')?.value) || 0;
        params.t_end = parseFloat(document.getElementById('t_end_dill')?.value) || 5;
        params.time_steps = parseInt(document.getElementById('time_steps_dill')?.value) || 20;
        params.animation_speed = parseInt(document.getElementById('dill_animation_speed')?.value) || 500;
    }
    
    return params;
}

function getEnhancedDillModelParams() {
    const sineType = document.getElementById('enhanced-dill-sine-type').value;
    const enable4DAnimation = document.getElementById('enable_4d_animation_enhanced_dill')?.checked || false;
    
    const params = {
        model_type: 'enhanced_dill',
        sine_type: sineType
    };
    
    // 只有在3D模式且启用4D动画时才添加4D动画参数
    if (enable4DAnimation && sineType === '3d') {
        params.enable_4d_animation = true;
        params.t_start = parseFloat(document.getElementById('t_start_enhanced_dill')?.value) || 0;
        params.t_end = parseFloat(document.getElementById('t_end_enhanced_dill')?.value) || 5;
        params.time_steps = parseInt(document.getElementById('time_steps_enhanced_dill')?.value) || 20;
        params.animation_speed = parseInt(document.getElementById('enhanced_dill_animation_speed')?.value) || 500;
    } else {
        // 确保4D动画参数不会被传递
        params.enable_4d_animation = false;
        console.log('Enhanced DILL模型4D动画已禁用');
    }
    
    return params;
}

function getCarModelParams() {
    const sineType = document.getElementById('car-sine-type')?.value || 'single';
    const enable4DAnimation = document.getElementById('car_enable_4d_animation')?.checked || false;
    
    const params = {
        model_type: 'car',
        sine_type: sineType
    };
    
    // 只有在3D模式且启用4D动画时才添加4D动画参数
    if (enable4DAnimation && sineType === '3d') {
        params.enable_4d_animation = true;
        params.t_start = parseFloat(document.getElementById('t_start_car')?.value) || 0;
        params.t_end = parseFloat(document.getElementById('t_end_car')?.value) || 5;
        params.time_steps = parseInt(document.getElementById('time_steps_car')?.value) || 20;
        params.animation_speed = parseInt(document.getElementById('car_animation_speed')?.value) || 500;
    } else {
        // 确保4D动画参数不会被传递
        params.enable_4d_animation = false;
        console.log('CAR模型4D动画已禁用');
    }
    
    return params;
}

// 添加缺失的DILL模型4D动画播放控制函数

// DILL模型1D动画状态管理
let dill1DAnimationState = {
    isPlaying: false,
    currentFrame: 0,
    totalFrames: 0,
    intervalId: null,
    loopEnabled: false,
    animationData: null
};

// DILL模型1D动画播放控制函数
function playDill1DAnimation() {
    if (dill1DAnimationState.isPlaying) return;
    
    // 如果动画已在结尾且未开启循环，则重置后再播放
    if (!dill1DAnimationState.loopEnabled && dill1DAnimationState.currentFrame >= dill1DAnimationState.totalFrames - 1) {
        resetDill1DAnimation();
    }
    
    dill1DAnimationState.isPlaying = true;
    
    // 直接更新按钮状态 - 隐藏播放按钮，显示暂停按钮
    const playBtn = document.getElementById('dill-1d-play-btn');
    const pauseBtn = document.getElementById('dill-1d-pause-btn');
    if (playBtn && pauseBtn) {
        playBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-flex';
        console.log('1D动画播放：隐藏播放按钮，显示暂停按钮');
    } else {
        console.error('1D动画按钮未找到', { playBtn: !!playBtn, pauseBtn: !!pauseBtn });
    }
    
    // 更新状态指示器
    const statusElement = document.getElementById('dill-1d-animation-status');
    if (statusElement) {
        statusElement.classList.remove('status-paused', 'status-stopped');
        statusElement.classList.add('status-playing');
        statusElement.innerHTML = '<i class="fas fa-circle"></i> 播放中';
    }
    
    updateDill1DAnimationStatus('动画播放中...');
    
    dill1DAnimationState.intervalId = setInterval(() => {
        let nextFrame = dill1DAnimationState.currentFrame + 1;
        
        if (nextFrame >= dill1DAnimationState.totalFrames) {
            if (dill1DAnimationState.loopEnabled) {
                nextFrame = 0; // 循环播放
            } else {
                pauseDill1DAnimation(); // 播放到结尾则暂停
                dill1DAnimationState.currentFrame = dill1DAnimationState.totalFrames - 1; // 确保停在最后一帧
                updateDill1DAnimationFrame(dill1DAnimationState.currentFrame);
                return;
            }
        }
        
        dill1DAnimationState.currentFrame = nextFrame;
        updateDill1DAnimationFrame(dill1DAnimationState.currentFrame);
    }, 200);
}

function pauseDill1DAnimation() {
    if (!dill1DAnimationState.isPlaying) return;
    dill1DAnimationState.isPlaying = false;
    clearInterval(dill1DAnimationState.intervalId);
    dill1DAnimationState.intervalId = null;
    
    // 直接更新按钮状态 - 显示播放按钮，隐藏暂停按钮
    const playBtn = document.getElementById('dill-1d-play-btn');
    const pauseBtn = document.getElementById('dill-1d-pause-btn');
    if (playBtn && pauseBtn) {
        playBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
        console.log('1D动画暂停：显示播放按钮，隐藏暂停按钮');
    } else {
        console.error('1D动画按钮未找到', { playBtn: !!playBtn, pauseBtn: !!pauseBtn });
    }
    
    // 更新状态指示器
    const statusElement = document.getElementById('dill-1d-animation-status');
    if (statusElement) {
        statusElement.classList.remove('status-playing');
        statusElement.classList.add('status-paused');
        statusElement.innerHTML = '<i class="fas fa-circle"></i> 已暂停';
    }
    
    // 更新当前帧状态为就绪
    const frameData = dill1DAnimationState.animationData && dill1DAnimationState.animationData[dill1DAnimationState.currentFrame];
    if (frameData) {
        updateDill1DAnimationStatus(`已暂停: 第${dill1DAnimationState.currentFrame + 1}/${dill1DAnimationState.totalFrames}帧`);
    } else {
        updateDill1DAnimationStatus('已暂停');
    }
}

function resetDill1DAnimation() {
    pauseDill1DAnimation();
    dill1DAnimationState.currentFrame = 0;
    updateDill1DAnimationFrame(0);
    updateDill1DTimeSlider(0);
    // 重置后也显示就绪状态
    const frameData = dill1DAnimationState.animationData && dill1DAnimationState.animationData[0];
    if (frameData) {
        updateDill1DAnimationStatus(`就绪: 第1/${dill1DAnimationState.totalFrames}帧 (t=${frameData.time_value.toFixed(2)}s)`);
    } else {
        updateDill1DAnimationStatus('就绪');
    }
}

function toggleDill1DLoop() {
    dill1DAnimationState.loopEnabled = !dill1DAnimationState.loopEnabled;
    const loopBtn = document.getElementById('dill-1d-loop-btn');
    if (loopBtn) {
        const textSpan = loopBtn.querySelector('span');
        if (dill1DAnimationState.loopEnabled) {
            // 开启循环时：移除 loop-off 类，显示"关闭循环"
            if (textSpan) textSpan.textContent = '关闭循环';
            loopBtn.classList.remove('loop-off');
            loopBtn.setAttribute('title', '关闭循环播放');
        } else {
            // 关闭循环时：添加 loop-off 类，显示"开启循环"
            if (textSpan) textSpan.textContent = '开启循环';
            loopBtn.classList.add('loop-off');
            loopBtn.setAttribute('title', '开启循环播放');
        }
    }
    updateDill1DAnimationStatus(dill1DAnimationState.loopEnabled ? '已开启循环播放' : '已关闭循环播放');
}

function updateDill1DAnimationStatus(status) {
    const statusElement = document.getElementById('dill-1d-animation-status');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

// 更新DILL 1D动画按钮状态的显示
function updateDill1DButtonStates() {
    const playBtn = document.getElementById('dill-1d-play-btn');
    const pauseBtn = document.getElementById('dill-1d-pause-btn');
    
    console.log('更新DILL 1D按钮状态:', {
        isPlaying: dill1DAnimationState.isPlaying,
        playBtn: !!playBtn,
        pauseBtn: !!pauseBtn
    });
    
    if (playBtn && pauseBtn) {
        if (dill1DAnimationState.isPlaying) {
            // 动画播放中：显示暂停按钮，隐藏播放按钮
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-flex';
            console.log('设置为播放状态：显示暂停按钮');
        } else {
            // 动画暂停/停止：显示播放按钮，隐藏暂停按钮
            playBtn.style.display = 'inline-flex';
            pauseBtn.style.display = 'none';
            console.log('设置为暂停状态：显示播放按钮');
        }
    } else {
        console.error('DILL 1D动画按钮未找到，无法更新状态');
    }
}

function updateDill1DAnimationFrame(frameIndex) {
    console.log('🎬 开始更新DILL 1D动画帧:', frameIndex);
    
    if (!dill1DAnimationState.animationData || frameIndex >= dill1DAnimationState.totalFrames) {
        console.error('DILL 1D动画数据无效或帧索引超出范围');
        return;
    }
    
    console.log('DILL 1D动画数据详情:', {
        'animationData length': dill1DAnimationState.animationData.length,
        'totalFrames': dill1DAnimationState.totalFrames,
        'frameIndex': frameIndex,
        'currentFrameData': dill1DAnimationState.animationData[frameIndex]
    });
    
    const frameData = dill1DAnimationState.animationData[frameIndex];
    
    // 获取时间值 - 从不同可能的数据结构中
    let timeValue = frameIndex * 0.25; // 默认时间值
    if (frameData && typeof frameData.time !== 'undefined') {
        timeValue = frameData.time;
    } else if (frameData && typeof frameData.t !== 'undefined') {
        timeValue = frameData.t;
    }
    
    console.log('当前帧时间值:', timeValue);
    
    // 更新曝光剂量分布图 - 支持多条曝光时间线
    const exposureContainer = document.getElementById('dill-exposure-1d-plot');
    if (exposureContainer) {
        console.log('开始更新曝光剂量分布图');
        
        // 清除占位符内容
        exposureContainer.innerHTML = '';
        
        // 检查是否有多个曝光时间的数据（曝光时间窗口模式）
        // 需要同时满足：1) 数据中有多个曝光时间 2) 用户启用了曝光时间窗口控制 3) 不在累积模式下
        const enableExposureTimeWindowCheckbox = document.getElementById('enable_exposure_time_window_dill');
        const exposureMethodSelect = document.getElementById('exposure_calculation_method');
        const isCumulativeMode = exposureMethodSelect && exposureMethodSelect.value === 'cumulative';
        const isExposureTimeWindowEnabled = enableExposureTimeWindowCheckbox ? enableExposureTimeWindowCheckbox.checked && !isCumulativeMode : false;
        const hasMultipleExposureTimes = frameData && frameData.etch_depths_data && Array.isArray(frameData.etch_depths_data) && frameData.etch_depths_data.length > 1 && isExposureTimeWindowEnabled;
        
        if (hasMultipleExposureTimes) {
            console.log('检测到多条曝光时间线数据，曝光时间数量:', frameData.etch_depths_data.length);
            
            // 多条曝光时间线模式
            const traces = [];
            const xCoords = frameData.x_coords || frameData.x || [];
            
            // 获取用户选择的曝光时间线
            const selectedLines = getSelectedExposureTimeLines();
            // 如果控制器不存在（selectedLines为null），显示所有线；如果存在但为空数组，则不显示任何线
            const linesToShow = selectedLines === null ? frameData.etch_depths_data.map((_, index) => index) : selectedLines;
            
            // 为每个选中的曝光时间创建一条线
            frameData.etch_depths_data.forEach((timeData, index) => {
                if (linesToShow.includes(index)) {
                    const exposureLegendName = `曝光时间 ${Number(timeData.time).toFixed(1)}s`;
                    console.log(`🔧 创建曝光图例: ${exposureLegendName}`);
                    
                    const exposureTrace = {
                        x: xCoords,
                        y: timeData.D0_values || timeData.etch_depth || [],
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: exposureLegendName,
                        line: { 
                            color: getLineColor(index), 
                            width: 2.5
                        },
                        marker: { 
                            size: 3, 
                            color: getLineColor(index) 
                        },
                        hovertemplate: `位置: %{x}<br>曝光剂量: %{y}<br>时间: ${Number(timeData.time).toFixed(1)}s<extra></extra>`
                    };
                    traces.push(exposureTrace);
                }
            });
            
            const exposureLayout = {
                title: `曝光剂量分布对比 (多个曝光时间) - 帧 ${frameIndex + 1}`,
                xaxis: { title: 'X 位置 (mm)' },
                yaxis: { title: '曝光剂量 (mJ/cm²)' },
                margin: { t: 80, b: 60, l: 80, r: 30 },
                plot_bgcolor: '#f8f9fa',
                paper_bgcolor: 'white',
                showlegend: true,
                legend: {
                    x: 1.02,
                    y: 1,
                    xanchor: 'left'
                }
            };
            
            Plotly.newPlot(exposureContainer, traces, exposureLayout, { responsive: true });
            
            // 显示多线模式控制器
            showMultiLineController(frameData.etch_depths_data, linesToShow);
            
        } else {
            // 单条线模式（原有逻辑）
            let exposureX, exposureY;
            
            if (frameData && frameData.exposure_data) {
                // 格式1: frameData.exposure_data.x 和 frameData.exposure_data.y
                exposureX = frameData.exposure_data.x;
                exposureY = frameData.exposure_data.y;
            } else if (frameData && frameData.x && frameData.exposure_dose) {
                // 格式2: frameData.x 和 frameData.exposure_dose
                exposureX = frameData.x;
                exposureY = frameData.exposure_dose;
            } else if (frameData && Array.isArray(frameData)) {
                // 格式3: frameData 是数组，使用索引作为x轴
                exposureX = Array.from({ length: frameData.length }, (_, i) => i);
                exposureY = frameData;
            } else {
                console.warn('未识别的曝光数据格式，使用模拟数据');
                // 使用模拟数据
                exposureX = Array.from({ length: 100 }, (_, i) => i * 0.1);
                exposureY = exposureX.map(x => Math.sin(x + timeValue) * Math.exp(-x/5) + 0.5);
            }
            
            const exposureTrace = {
                x: exposureX,
                y: exposureY,
                type: 'scatter',
                mode: 'lines+markers',
                name: `曝光剂量分布 (t=${timeValue.toFixed(2)}s)`,
                line: { color: '#3498db', width: 3 },
                marker: { size: 4, color: '#3498db' }
            };
            
            // 动态检测X轴单位
            const xUnit = detectCoordinateUnit(exposureX);
            
            const exposureLayout = {
                title: `曝光剂量分布 (t=${timeValue.toFixed(2)}s)`,
                xaxis: { title: `位置 (${xUnit})` },
                yaxis: { title: '曝光剂量 (mJ/cm²)' },
                margin: { t: 60, b: 60, l: 80, r: 30 },
                plot_bgcolor: '#f8f9fa',
                paper_bgcolor: 'white'
            };
            
            Plotly.newPlot(exposureContainer, [exposureTrace], exposureLayout, { responsive: true });
            
            // 隐藏多线模式控制器
            hideMultiLineController();
        }
        
        console.log('曝光剂量分布图更新完成');
    }
    
    // 更新形貌分布图 - 支持多条曝光时间线
    const thicknessContainer = document.getElementById('dill-thickness-1d-plot');
    if (thicknessContainer) {
        console.log('开始更新形貌分布图');
        
        // 清除占位符内容
        thicknessContainer.innerHTML = '';
        
        // 检查是否有多个曝光时间的数据
        // 需要同时满足：1) 数据中有多个曝光时间 2) 用户启用了曝光时间窗口控制 3) 不在累积模式下
        const enableExposureTimeWindowCheckbox = document.getElementById('enable_exposure_time_window_dill');
        const exposureMethodSelect = document.getElementById('exposure_calculation_method');
        const isCumulativeMode = exposureMethodSelect && exposureMethodSelect.value === 'cumulative';
        const isExposureTimeWindowEnabled = enableExposureTimeWindowCheckbox ? enableExposureTimeWindowCheckbox.checked && !isCumulativeMode : false;
        const hasMultipleExposureTimes = frameData && frameData.etch_depths_data && Array.isArray(frameData.etch_depths_data) && frameData.etch_depths_data.length > 1 && isExposureTimeWindowEnabled;
        
        if (hasMultipleExposureTimes) {
            // 多条曝光时间线模式
            const traces = [];
            const xCoords = frameData.x_coords || frameData.x || [];
            
            // 获取用户选择的曝光时间线
            const selectedLines = getSelectedExposureTimeLines();
            // 如果控制器不存在（selectedLines为null），显示所有线；如果存在但为空数组，则不显示任何线
            const linesToShow = selectedLines === null ? frameData.etch_depths_data.map((_, index) => index) : selectedLines;
            
            // 为每个选中的曝光时间创建一条线
            frameData.etch_depths_data.forEach((timeData, index) => {
                if (linesToShow.includes(index)) {
                    const thicknessLegendName = `厚度 ${Number(timeData.time).toFixed(1)}s`;
                    console.log(`🔧 创建厚度图例: ${thicknessLegendName}`);
                    
                    const thicknessTrace = {
                        x: xCoords,
                        y: timeData.M_values || timeData.etch_depth || [],
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: thicknessLegendName,
                        line: { 
                            color: getLineColor(index), 
                            width: 2.5 
                        },
                        marker: { 
                            size: 3, 
                            color: getLineColor(index) 
                        },
                        hovertemplate: `位置: %{x}<br>相对厚度: %{y}<br>时间: ${Number(timeData.time).toFixed(1)}s<extra></extra>`
                    };
                    traces.push(thicknessTrace);
                }
            });
            
            const thicknessLayout = {
                title: `形貌分布对比 (多个曝光时间) - 帧 ${frameIndex + 1}`,
                xaxis: { title: 'X 位置 (mm)' },
                yaxis: { title: '相对厚度' },
                margin: { t: 80, b: 60, l: 80, r: 30 },
                plot_bgcolor: '#f8f9fa',
                paper_bgcolor: 'white',
                showlegend: true,
                legend: {
                    x: 1.02,
                    y: 1,
                    xanchor: 'left'
                }
            };
            
            Plotly.newPlot(thicknessContainer, traces, thicknessLayout, { responsive: true });
            
        } else {
            // 单条线模式（原有逻辑）
            let thicknessX, thicknessY;
            
            if (frameData && frameData.thickness_data) {
                // 格式1: frameData.thickness_data.x 和 frameData.thickness_data.y
                thicknessX = frameData.thickness_data.x;
                thicknessY = frameData.thickness_data.y;
            } else if (frameData && frameData.x && frameData.thickness) {
                // 格式2: frameData.x 和 frameData.thickness
                thicknessX = frameData.x;
                thicknessY = frameData.thickness;
            } else if (frameData && frameData.x && frameData.exposure_dose) {
                // 格式3: 从曝光剂量推导厚度变化
                thicknessX = frameData.x || exposureX;
                thicknessY = frameData.exposure_dose ? frameData.exposure_dose.map(dose => Math.max(0, 1 - dose * 0.1)) : null;
            } else {
                console.warn('未识别的厚度数据格式，使用模拟数据');
                // 使用模拟数据
                thicknessX = Array.from({ length: 100 }, (_, i) => i * 0.1);
                thicknessY = thicknessX.map(x => Math.max(0, 1 - Math.sin(x + timeValue) * 0.2));
            }
            
            if (thicknessY) {
                const thicknessTrace = {
                    x: thicknessX,
                    y: thicknessY,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: `形貌分布 (t=${timeValue.toFixed(2)}s)`,
                    line: { color: '#e74c3c', width: 3 },
                    marker: { size: 4, color: '#e74c3c' },
                    fill: 'tonexty',
                    fillcolor: 'rgba(231, 76, 60, 0.1)'
                };
                
                // 动态检测X轴单位
                const xUnit = detectCoordinateUnit(thicknessX);
                
                const thicknessLayout = {
                    title: `形貌分布 (t=${timeValue.toFixed(2)}s)`,
                    xaxis: { title: `位置 (${xUnit})` },
                    yaxis: { title: '相对厚度' },
                    margin: { t: 60, b: 60, l: 80, r: 30 },
                    plot_bgcolor: '#f8f9fa',
                    paper_bgcolor: 'white'
                };
                
                Plotly.newPlot(thicknessContainer, [thicknessTrace], thicknessLayout, { responsive: true });
            }
        }
        
        console.log('形貌分布图更新完成');
    }
    
    // 更新时间滑块和显示信息
    updateDill1DTimeSlider(frameIndex);
    updateDill1DTimeDisplay(timeValue, frameIndex);
    
    // 如果正在播放则显示播放中，否则显示就绪
    if (dill1DAnimationState.isPlaying) {
        updateDill1DAnimationStatus(`播放中: 第${frameIndex + 1}/${dill1DAnimationState.totalFrames}帧 (t=${timeValue.toFixed(2)}s)`);
    } else {
        updateDill1DAnimationStatus(`就绪: 第${frameIndex + 1}/${dill1DAnimationState.totalFrames}帧 (t=${timeValue.toFixed(2)}s)`);
    }
    
    console.log('✅ DILL 1D动画帧更新完成');
}

function updateDill1DTimeSlider(frameIndex) {
    const timeSlider = document.getElementById('dill-1d-time-slider');
    if (timeSlider) {
        timeSlider.value = frameIndex;
        timeSlider.max = dill1DAnimationState.totalFrames - 1;
    }
}

function updateDill1DTimeDisplay(timeValue, frameIndex) {
    // 更新时间显示
    const timeDisplay = document.getElementById('dill-1d-time-display');
    if (timeDisplay) {
        timeDisplay.textContent = `t = ${timeValue.toFixed(1)}s`;
    }
    
    // 更新帧信息显示
    const frameInfo = document.getElementById('dill-1d-frame-info');
    if (frameInfo) {
        frameInfo.textContent = `帧 ${frameIndex + 1}/${dill1DAnimationState.totalFrames}`;
    }
}

// DILL模型4D动画播放控制函数
function playDill4DAnimation() {
    if (dill4DAnimationState.isPlaying) return;
    
    // 如果动画已在结尾且未开启循环，则重置后再播放
    if (!dill4DAnimationState.loopEnabled && dill4DAnimationState.currentFrame >= dill4DAnimationState.totalFrames - 1) {
        resetDill4DAnimation();
    }
    
    dill4DAnimationState.isPlaying = true;
    updateDill4DAnimationStatus('动画播放中...');
    
    const playBtn = document.getElementById('dill-4d-play-btn');
    const pauseBtn = document.getElementById('dill-4d-pause-btn');
    
    if (playBtn) playBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'inline-flex';
    
    dill4DAnimationState.intervalId = setInterval(() => {
        let nextFrame = dill4DAnimationState.currentFrame + 1;
        
        if (nextFrame >= dill4DAnimationState.totalFrames) {
            if (dill4DAnimationState.loopEnabled) {
                nextFrame = 0; // 循环播放
            } else {
                pauseDill4DAnimation(); // 播放到结尾则暂停
                dill4DAnimationState.currentFrame = dill4DAnimationState.totalFrames - 1; // 确保停在最后一帧
                updateDill4DAnimationFrame(dill4DAnimationState.currentFrame);
                return;
            }
        }
        
        dill4DAnimationState.currentFrame = nextFrame;
        updateDill4DAnimationFrame(dill4DAnimationState.currentFrame);
    }, 200);
}

function pauseDill4DAnimation() {
    if (!dill4DAnimationState.isPlaying) return;
    dill4DAnimationState.isPlaying = false;
    clearInterval(dill4DAnimationState.intervalId);
    dill4DAnimationState.intervalId = null;
    updateDill4DAnimationStatus('动画已暂停');
    
    const playBtn = document.getElementById('dill-4d-play-btn');
    const pauseBtn = document.getElementById('dill-4d-pause-btn');
    if (playBtn && pauseBtn) {
        playBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
    }
}

function resetDill4DAnimation() {
    pauseDill4DAnimation(); // 先暂停
    dill4DAnimationState.currentFrame = 0;
    updateDill4DAnimationFrame(0);
    updateDill4DAnimationStatus('动画已重置');
}

function toggleDill4DLoop() {
    dill4DAnimationState.loopEnabled = !dill4DAnimationState.loopEnabled;
    const loopBtn = document.getElementById('dill-4d-loop-btn');
    if (loopBtn) {
        const textSpan = loopBtn.querySelector('span');
        if (dill4DAnimationState.loopEnabled) {
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

// 增强DILL模型4D动画播放控制函数（类似实现）
function playEnhancedDill4DAnimation() {
    if (enhancedDill4DAnimationState.isPlaying) return;
    
    // 如果动画已在结尾且未开启循环，则重置后再播放
    if (!enhancedDill4DAnimationState.loopEnabled && enhancedDill4DAnimationState.currentFrame >= enhancedDill4DAnimationState.totalFrames - 1) {
        resetEnhancedDill4DAnimation();
    }
    
    enhancedDill4DAnimationState.isPlaying = true;
    updateEnhancedDill4DAnimationStatus('动画播放中...');
    
    const playBtn = document.getElementById('enhanced-dill-4d-play-btn');
    const pauseBtn = document.getElementById('enhanced-dill-4d-pause-btn');
    
    if (playBtn) playBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'inline-flex';
    
    enhancedDill4DAnimationState.intervalId = setInterval(() => {
        let nextFrame = enhancedDill4DAnimationState.currentFrame + 1;
        
        if (nextFrame >= enhancedDill4DAnimationState.totalFrames) {
            if (enhancedDill4DAnimationState.loopEnabled) {
                nextFrame = 0; // 循环播放
            } else {
                pauseEnhancedDill4DAnimation(); // 播放到结尾则暂停
                enhancedDill4DAnimationState.currentFrame = enhancedDill4DAnimationState.totalFrames - 1; // 确保停在最后一帧
                updateEnhancedDill4DAnimationFrame(enhancedDill4DAnimationState.currentFrame);
                return;
            }
        }
        
        enhancedDill4DAnimationState.currentFrame = nextFrame;
        updateEnhancedDill4DAnimationFrame(enhancedDill4DAnimationState.currentFrame);
    }, 200);
}

function pauseEnhancedDill4DAnimation() {
    if (!enhancedDill4DAnimationState.isPlaying) return;
    enhancedDill4DAnimationState.isPlaying = false;
    clearInterval(enhancedDill4DAnimationState.intervalId);
    enhancedDill4DAnimationState.intervalId = null;
    updateEnhancedDill4DAnimationStatus('动画已暂停');
    
    const playBtn = document.getElementById('enhanced-dill-4d-play-btn');
    const pauseBtn = document.getElementById('enhanced-dill-4d-pause-btn');
    if (playBtn && pauseBtn) {
        playBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
    }
}

function resetEnhancedDill4DAnimation() {
    pauseEnhancedDill4DAnimation(); // 先暂停
    enhancedDill4DAnimationState.currentFrame = 0;
    updateEnhancedDill4DAnimationFrame(0);
    updateEnhancedDill4DAnimationStatus('动画已重置');
}

function toggleEnhancedDill4DLoop() {
    enhancedDill4DAnimationState.loopEnabled = !enhancedDill4DAnimationState.loopEnabled;
    const loopBtn = document.getElementById('enhanced-dill-4d-loop-btn');
    if (loopBtn) {
        const textSpan = loopBtn.querySelector('span');
        if (enhancedDill4DAnimationState.loopEnabled) {
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

// 状态更新函数
function updateDill4DAnimationStatus(status) {
    const statusElement = document.querySelector('#dill-4d-animation-section .animation-status span');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

function updateEnhancedDill4DAnimationStatus(status) {
    const statusElement = document.querySelector('#enhanced-dill-4d-animation-section .animation-status span');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

/**
 * 设置DILL模型4D动画界面
 */
function setupDill4DAnimationUI() {
    const plotContainer = document.getElementById('dill-4d-animation-container');
    if (!plotContainer) {
        console.error('DILL模型：未找到4D动画容器');
        return;
    }
    
    // 清空容器，生成正确的图表ID
    plotContainer.innerHTML = `
        <div class="car-4d-plot-container">
            <h3>光强度分布 (3D+时间)</h3>
            <div id="dill-4d-exposure" class="car-4d-plot"></div>
        </div>
        <div class="car-4d-plot-container">
            <h3>形貌分布 (3D+时间)</h3>
            <div id="dill-4d-thickness" class="car-4d-plot"></div>
        </div>
    `;
    
    // 重新绑定控制按钮事件
    setupDill4DAnimationEventListeners();
}

/**
 * 设置Enhanced DILL模型4D动画界面
 */
function setupEnhancedDill4DAnimationUI() {
    console.log('设置Enhanced DILL模型4D动画界面');
    
    const plotContainer = document.getElementById('enhanced-dill-4d-animation-container');
    if (!plotContainer) {
        console.error('Enhanced DILL模型：未找到4D动画容器 #enhanced-dill-4d-animation-container');
        return;
    }
    
    console.log('找到Enhanced DILL 4D动画容器，开始设置UI');
    
    // 清空容器，生成正确的图表ID
    plotContainer.innerHTML = `
        <div class="car-4d-plot-container">
            <h3>光强度分布 (3D+时间)</h3>
            <div id="enhanced-dill-4d-exposure" class="car-4d-plot"></div>
        </div>
        <div class="car-4d-plot-container">
            <h3>形貌分布 (3D+时间)</h3>
            <div id="enhanced-dill-4d-thickness" class="car-4d-plot"></div>
        </div>
    `;
    
    console.log('Enhanced DILL 4D动画UI内容已设置');
    
    // 重新绑定控制按钮事件
    setupEnhancedDill4DAnimationEventListeners();
    
    console.log('Enhanced DILL 4D动画UI设置完成');
}

// 添加动画帧更新函数
function updateDill4DAnimationFrame(frameIndex) {
    if (!dill4DAnimationData) {
        console.error('DILL模型：无4D动画数据');
        return;
    }
    
    console.log('🎬 DILL 4D动画帧更新开始:', {
        'frameIndex': frameIndex,
        'sine_type': dill4DAnimationData.sine_type,
        'is_3d': dill4DAnimationData.is_3d,
        'is_2d': dill4DAnimationData.is_2d,
        'is_1d': dill4DAnimationData.is_1d,
        'available_keys': Object.keys(dill4DAnimationData),
        'x_coords_length': dill4DAnimationData.x_coords?.length,
        'y_coords_length': dill4DAnimationData.y_coords?.length,
        'z_coords_length': dill4DAnimationData.z_coords?.length,
        'exposure_frames_length': dill4DAnimationData.exposure_dose_frames?.length,
        'thickness_frames_length': dill4DAnimationData.thickness_frames?.length,
        'time_array_length': dill4DAnimationData.time_array?.length
    });
    
    const exposureFrames = dill4DAnimationData.exposure_dose_frames || dill4DAnimationData.exposure_frames;
    const thicknessFrames = dill4DAnimationData.thickness_frames;
    const timeArray = dill4DAnimationData.time_array;
    
    if (!exposureFrames || frameIndex >= exposureFrames.length) {
        console.error(`DILL模型：无效的帧索引(${frameIndex})，总帧数: ${exposureFrames ? exposureFrames.length : 0}`);
        return;
    }
    
    // 获取当前帧的时间值
    const timeValue = timeArray ? timeArray[frameIndex] : frameIndex;
    
    // 配置Plotly选项
    const plotlyConfig = {
        responsive: true,
        toImageButtonOptions: {
            format: 'png',
            filename: `dill_4d_frame_${frameIndex}`,
            scale: 1,
            width: 800,
            height: 600
        }
    };
    
    console.log(`📊 开始更新第${frameIndex}帧 (t=${timeValue.toFixed(2)}s)`);
    
    // 根据不同的数据维度类型处理
    const sineType = dill4DAnimationData.sine_type;
    
    try {
        if (sineType === '3d' && dill4DAnimationData.is_3d) {
            // 3D模式 - 需要处理3D数组数据
            console.log('🔮 处理3D模式数据');
            update3DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
        } else if (sineType === 'multi' && dill4DAnimationData.is_2d) {
            // 2D模式 - 处理2D数组数据
            console.log('🌐 处理2D模式数据');
            update2DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
        } else if (sineType === '1d' && dill4DAnimationData.is_1d) {
            // 1D模式 - 处理1D数组数据
            console.log('📈 处理1D模式数据');
            update1DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
        } else {
            console.warn('⚠️ 未知的数据类型，尝试通用处理');
            // 通用处理逻辑
            updateGenericDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
        }
        
        // 更新时间轴进度条（如果存在）
        updateDill4DTimeSlider(frameIndex);
        
        console.log(`✅ 第${frameIndex}帧更新完成`);
        
    } catch (error) {
        console.error(`❌ 更新第${frameIndex}帧时出错:`, error);
        console.error('错误堆栈:', error.stack);
        
        // 尝试降级处理
        try {
            console.log('🔄 尝试降级处理...');
            updateGenericDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
        } catch (fallbackError) {
            console.error('❌ 降级处理也失败:', fallbackError);
        }
    }
}

// 3D数据处理函数
function update3DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig) {
    console.log('🔮 3D数据处理开始');
    
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
    
    // 处理曝光剂量数据
    if (exposureFrames && dill4DAnimationData.x_coords && dill4DAnimationData.y_coords) {
        let surfaceZ = exposureFrames[frameIndex];
        
        console.log('🔍 曝光数据结构分析:', {
            'surfaceZ类型': typeof surfaceZ,
            'surfaceZ长度': Array.isArray(surfaceZ) ? surfaceZ.length : 'N/A',
            '第一级维度': Array.isArray(surfaceZ) && surfaceZ[0] ? (Array.isArray(surfaceZ[0]) ? surfaceZ[0].length : typeof surfaceZ[0]) : 'N/A',
            '第二级维度': Array.isArray(surfaceZ) && surfaceZ[0] && Array.isArray(surfaceZ[0]) && surfaceZ[0][0] ? (Array.isArray(surfaceZ[0][0]) ? surfaceZ[0][0].length : typeof surfaceZ[0][0]) : 'N/A'
        });
        
        // 处理3D数组数据，转换为surface格式
        if (Array.isArray(surfaceZ) && Array.isArray(surfaceZ[0]) && Array.isArray(surfaceZ[0][0])) {
            console.log('🔄 转换3D数组为surface格式');
            const midZ = Math.floor(surfaceZ[0][0].length / 2);
            const surface2D = [];
            
            // 转换为适合plotly surface的格式
            for (let y = 0; y < surfaceZ[0].length; y++) {
                const row = [];
                for (let x = 0; x < surfaceZ.length; x++) {
                    row.push(surfaceZ[x][y][midZ]);
                }
                surface2D.push(row);
            }
            surfaceZ = surface2D;
            console.log(`✅ 3D数据转换完成，取Z切片[${midZ}]，结果维度: ${surface2D.length}x${surface2D[0]?.length}`);
        }
        
        const exposureData = [{
            type: 'surface',
            x: dill4DAnimationData.x_coords,
            y: dill4DAnimationData.y_coords,
            z: surfaceZ,
            colorscale: 'Viridis',
            contours: {
                z: {
                    show: true,
                    usecolormap: true,
                    highlightcolor: "#42f462",
                    project: { z: true }
                }
            },
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>光强度: %{z}<extra></extra>'
        }];
        
        const exposureLayout = {
            ...common3DLayout,
            title: `光强度分布 (t=${timeValue.toFixed(2)}s)`,
            scene: {
                ...common3DLayout.scene,
                xaxis: { title: 'Z 位置 (μm)' },
                yaxis: { title: 'Y 位置 (μm)' },
                zaxis: { title: '光强度' }
            }
        };
        
        Plotly.newPlot('dill-4d-exposure', exposureData, exposureLayout, plotlyConfig);
        console.log('✅ 3D曝光图表更新完成');
    }
    
    // 处理厚度数据
    if (thicknessFrames && dill4DAnimationData.x_coords && dill4DAnimationData.y_coords) {
        let thicknessSurfaceZ = thicknessFrames[frameIndex];
        
        // 处理3D数组数据
        if (Array.isArray(thicknessSurfaceZ) && Array.isArray(thicknessSurfaceZ[0]) && Array.isArray(thicknessSurfaceZ[0][0])) {
            console.log('🔄 转换3D厚度数组为surface格式');
            const midZ = Math.floor(thicknessSurfaceZ[0][0].length / 2);
            const surface2D = [];
            
            for (let y = 0; y < thicknessSurfaceZ[0].length; y++) {
                const row = [];
                for (let x = 0; x < thicknessSurfaceZ.length; x++) {
                    row.push(thicknessSurfaceZ[x][y][midZ]);
                }
                surface2D.push(row);
            }
            thicknessSurfaceZ = surface2D;
            console.log('✅ 3D厚度数据转换完成');
        }
        
        const thicknessData = [{
            type: 'surface',
            x: dill4DAnimationData.x_coords,
            y: dill4DAnimationData.y_coords,
            z: thicknessSurfaceZ,
            colorscale: 'RdYlBu',
            contours: {
                z: {
                    show: true,
                    usecolormap: true,
                    highlightcolor: "#42f462",
                    project: { z: true }
                }
            },
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>厚度: %{z}<extra></extra>'
        }];
        
        const thicknessLayout = {
            ...common3DLayout,
            title: `形貌分布 (t=${timeValue.toFixed(2)}s)`,
            scene: {
                ...common3DLayout.scene,
                xaxis: { title: 'Z 位置 (μm)' },
                yaxis: { title: 'Y 位置 (μm)' },
                zaxis: { title: '厚度 (μm)' }
            }
        };
        
        Plotly.newPlot('dill-4d-thickness', thicknessData, thicknessLayout, plotlyConfig);
        console.log('✅ 3D厚度图表更新完成');
    }
}

// 2D数据处理函数
function update2DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig) {
    console.log('🌐 2D数据处理开始');
    
    // 处理曝光剂量数据 - 2D热图
    if (exposureFrames && dill4DAnimationData.x_coords && dill4DAnimationData.y_coords) {
        const exposureData = [{
            type: 'heatmap',
            x: dill4DAnimationData.x_coords,
            y: dill4DAnimationData.y_coords,
            z: exposureFrames[frameIndex],
            colorscale: 'Viridis',
            hoverongaps: false,
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>光强度: %{z}<extra></extra>'
        }];
        
        const exposureLayout = {
            title: `光强度分布 (t=${timeValue.toFixed(2)}s)`,
            xaxis: { title: 'Z 位置 (μm)' },
            yaxis: { title: 'Y 位置 (μm)' },
            autosize: true,
            margin: { l: 50, r: 50, b: 50, t: 50 }
        };
        
        Plotly.newPlot('dill-4d-exposure', exposureData, exposureLayout, plotlyConfig);
        console.log('✅ 2D曝光热图更新完成');
    }
    
    // 处理厚度数据 - 2D热图
    if (thicknessFrames && dill4DAnimationData.x_coords && dill4DAnimationData.y_coords) {
        const thicknessData = [{
            type: 'heatmap',
            x: dill4DAnimationData.x_coords,
            y: dill4DAnimationData.y_coords,
            z: thicknessFrames[frameIndex],
            colorscale: 'RdYlBu',
            hoverongaps: false,
            hovertemplate: 'X: %{x}<br>Y: %{y}<br>厚度: %{z}<extra></extra>'
        }];
        
        const thicknessLayout = {
            title: `形貌分布 (t=${timeValue.toFixed(2)}s)`,
            xaxis: { title: 'Z 位置 (μm)' },
            yaxis: { title: 'Y 位置 (μm)' },
            autosize: true,
            margin: { l: 50, r: 50, b: 50, t: 50 }
        };
        
        Plotly.newPlot('dill-4d-thickness', thicknessData, thicknessLayout, plotlyConfig);
        console.log('✅ 2D厚度热图更新完成');
    }
}

// 1D数据处理函数
function update1DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig) {
    console.log('📈 1D数据处理开始');
    
    // 处理曝光剂量数据 - 1D线图
    if (exposureFrames && dill4DAnimationData.x_coords) {
        const exposureData = [{
            type: 'scatter',
            mode: 'lines+markers',
            x: dill4DAnimationData.x_coords,
            y: exposureFrames[frameIndex],
            line: { color: '#3498db', width: 3 },
            marker: { size: 5 },
            name: '光强度',
            hovertemplate: 'X: %{x}<br>光强度: %{y}<extra></extra>'
        }];
        
        const exposureLayout = {
            title: `光强度分布 (t=${timeValue.toFixed(2)}s)`,
            xaxis: { title: 'Z 位置 (μm)' },
            yaxis: { title: '光强度' },
            autosize: true,
            margin: { l: 50, r: 50, b: 50, t: 50 }
        };
        
        Plotly.newPlot('dill-4d-exposure', exposureData, exposureLayout, plotlyConfig);
        console.log('✅ 1D曝光线图更新完成');
    }
    
    // 处理厚度数据 - 1D线图
    if (thicknessFrames && dill4DAnimationData.x_coords) {
        const thicknessData = [{
            type: 'scatter',
            mode: 'lines+markers',
            x: dill4DAnimationData.x_coords,
            y: thicknessFrames[frameIndex],
            line: { color: '#e74c3c', width: 3 },
            marker: { size: 5 },
            name: '厚度',
            hovertemplate: 'X: %{x}<br>厚度: %{y}<extra></extra>'
        }];
        
        const thicknessLayout = {
            title: `形貌分布 (t=${timeValue.toFixed(2)}s)`,
            xaxis: { title: 'Z 位置 (μm)' },
            yaxis: { title: '厚度 (μm)' },
            autosize: true,
            margin: { l: 50, r: 50, b: 50, t: 50 }
        };
        
        Plotly.newPlot('dill-4d-thickness', thicknessData, thicknessLayout, plotlyConfig);
        console.log('✅ 1D厚度线图更新完成');
    }
}

// 通用数据处理函数（降级处理）
function updateGenericDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig) {
    console.log('🔧 通用数据处理开始（降级模式）');
    
    // 尝试自动检测数据格式
    const exposureFrame = exposureFrames[frameIndex];
    const thicknessFrame = thicknessFrames?.[frameIndex];
    
    console.log('🔍 自动检测数据格式:', {
        'exposureFrame类型': typeof exposureFrame,
        'exposureFrame长度': Array.isArray(exposureFrame) ? exposureFrame.length : 'N/A',
        'is嵌套数组': Array.isArray(exposureFrame) && Array.isArray(exposureFrame[0])
    });
    
    // 判断是1D、2D还是3D数据
    if (Array.isArray(exposureFrame)) {
        if (Array.isArray(exposureFrame[0])) {
            if (Array.isArray(exposureFrame[0][0])) {
                // 3D数据
                console.log('🔮 检测为3D数据，使用3D处理方式');
                update3DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
            } else {
                // 2D数据
                console.log('🌐 检测为2D数据，使用2D处理方式');
                update2DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
            }
        } else {
            // 1D数据
            console.log('📈 检测为1D数据，使用1D处理方式');
            update1DDillAnimationFrame(frameIndex, exposureFrames, thicknessFrames, timeValue, plotlyConfig);
        }
    } else {
        console.error('❌ 无法识别的数据格式');
    }
}

// 时间轴滑块更新函数
function updateDill4DTimeSlider(frameIndex) {
    const slider = document.getElementById('dill-4d-time-slider');
    if (slider) {
        slider.value = frameIndex;
        
        // 更新滑块显示
        const sliderDisplay = document.getElementById('dill-4d-time-display');
        if (sliderDisplay && dill4DAnimationData.time_array) {
            const timeValue = dill4DAnimationData.time_array[frameIndex];
            sliderDisplay.textContent = `t = ${timeValue.toFixed(2)}s`;
        }
        
        // 更新帧数信息显示
        const frameInfo = document.getElementById('dill-4d-frame-info');
        if (frameInfo && dill4DAnimationData) {
            const totalFrames = dill4DAnimationData.time_steps || 
                               (dill4DAnimationData.exposure_dose_frames ? dill4DAnimationData.exposure_dose_frames.length : 20);
            frameInfo.textContent = `帧 ${frameIndex + 1}/${totalFrames}`;
        }
    }
}

function updateEnhancedDill4DAnimationFrame(frameIndex) {
    console.log(`更新Enhanced DILL 4D动画帧: ${frameIndex}`);
    
    if (!enhancedDill4DAnimationData) {
        console.error('Enhanced DILL模型：无4D动画数据');
        return;
    }
    
    console.log('Enhanced DILL 4D动画数据调试:', {
        'enhancedDill4DAnimationData keys': Object.keys(enhancedDill4DAnimationData),
        'x_coords': enhancedDill4DAnimationData.x_coords ? `length=${enhancedDill4DAnimationData.x_coords.length}` : 'undefined',
        'y_coords': enhancedDill4DAnimationData.y_coords ? `length=${enhancedDill4DAnimationData.y_coords.length}` : 'undefined',
        'z_coords': enhancedDill4DAnimationData.z_coords ? `length=${enhancedDill4DAnimationData.z_coords.length}` : 'undefined',
        'exposure_dose_frames': enhancedDill4DAnimationData.exposure_dose_frames ? `length=${enhancedDill4DAnimationData.exposure_dose_frames.length}` : 'undefined',
        'thickness_frames': enhancedDill4DAnimationData.thickness_frames ? `length=${enhancedDill4DAnimationData.thickness_frames.length}` : 'undefined',
        'frameIndex': frameIndex,
        'sine_type': enhancedDill4DAnimationData.sine_type,
        'is_3d': enhancedDill4DAnimationData.is_3d
    });
    
    const exposureFrames = enhancedDill4DAnimationData.exposure_dose_frames;
    const thicknessFrames = enhancedDill4DAnimationData.thickness_frames;
    const timeArray = enhancedDill4DAnimationData.time_array;
    
    if (!exposureFrames || frameIndex >= exposureFrames.length) {
        console.warn(`Enhanced DILL模型：帧索引超出范围(${frameIndex})，总帧数: ${exposureFrames ? exposureFrames.length : 0}`);
        return;
    }
    
    // 获取当前帧的时间值
    const timeValue = timeArray ? timeArray[frameIndex] : frameIndex * 0.25;
    
    // 配置Plotly选项
    const plotlyConfig = {
        responsive: true,
        toImageButtonOptions: {
            format: 'png',
            filename: `enhanced_dill_4d_frame_${frameIndex}`,
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
    
    // 获取当前帧的完整3D数据
    const currentExposureFrame = exposureFrames[frameIndex];
    const currentThicknessFrame = thicknessFrames[frameIndex];
    
    // 1. 更新曝光剂量3D分布图
    if (currentExposureFrame && enhancedDill4DAnimationData.x_coords && enhancedDill4DAnimationData.y_coords && enhancedDill4DAnimationData.z_coords) {
        const exposureContainer = document.getElementById('enhanced-dill-4d-exposure');
        if (exposureContainer) {
            try {
                // 处理3D数据：创建多个Z层的surface
                const exposureTraces = [];
                const zCoords = enhancedDill4DAnimationData.z_coords;
                const xCoords = enhancedDill4DAnimationData.x_coords;
                const yCoords = enhancedDill4DAnimationData.y_coords;
                
                // 显示多个Z层（表面、中间、底部）
                // 可配置选项：用户可以选择显示模式
                const layerDisplayMode = window.enhancedDillLayerMode || 'multi'; // 'single', 'multi', 'all'
                
                let zIndices, layerNames, opacities;
                
                if (layerDisplayMode === 'single') {
                    // 仅显示表面层
                    zIndices = [0];
                    layerNames = ['表面'];
                    opacities = [0.9];
                } else if (layerDisplayMode === 'all') {
                    // 显示所有层（密集显示）
                    zIndices = Array.from({length: Math.min(zCoords.length, 5)}, (_, i) => 
                        Math.floor(i * (zCoords.length - 1) / 4));
                    layerNames = zIndices.map((idx, i) => `层${i+1} (z=${zCoords[idx].toFixed(2)}μm)`);
                    opacities = zIndices.map((_, i) => 0.9 - i * 0.15);
                } else {
                    // 默认多层显示（表面、中间、底部）
                    zIndices = [0, Math.floor(zCoords.length / 2), zCoords.length - 1];
                    layerNames = ['表面', '中间', '底部'];
                    opacities = [0.9, 0.6, 0.3];
                }
                
                for (let layerIdx = 0; layerIdx < zIndices.length; layerIdx++) {
                    const zIdx = zIndices[layerIdx];
                    const layerData = currentExposureFrame[zIdx];
                    
                    if (layerData && layerData.length > 0) {
                        // 确保数据正确转置（数据格式为[z][y][x]）
                        const surfaceZ = [];
                        for (let yIdx = 0; yIdx < yCoords.length; yIdx++) {
                            const row = [];
                            for (let xIdx = 0; xIdx < xCoords.length; xIdx++) {
                                if (layerData[yIdx] && layerData[yIdx][xIdx] !== undefined) {
                                    row.push(layerData[yIdx][xIdx]);
                                } else {
                                    row.push(0);
                                }
                            }
                            surfaceZ.push(row);
                        }
                        
                        exposureTraces.push({
                            type: 'surface',
                            x: xCoords,
                            y: yCoords,
                            z: surfaceZ,
                            colorscale: layerIdx === 0 ? 'Viridis' : 'Hot',
                            opacity: opacities[layerIdx],
                            name: `${layerNames[layerIdx]} (z=${zCoords[zIdx].toFixed(2)}μm)`,
                            showscale: layerIdx === 0,
                            contours: {
                                z: {
                                    show: true,
                                    usecolormap: true,
                                    highlightcolor: "#42f462",
                                    project: { z: false }
                                }
                            },
                            hovertemplate: `X: %{x}<br>Y: %{y}<br>曝光剂量: %{z}<br>深度: ${zCoords[zIdx].toFixed(2)}μm<extra>${layerNames[layerIdx]}</extra>`
                        });
                    }
                }
                
                const exposureLayout = {
                    ...common3DLayout,
                    title: `曝光剂量分布 (t=${timeValue.toFixed(2)}s) - 多层显示`,
                    scene: {
                        ...common3DLayout.scene,
                        xaxis: { title: 'Z 位置 (μm)' },
                        yaxis: { title: 'Y 位置 (μm)' },
                        zaxis: { title: '曝光剂量 (mJ/cm²)' }
                    }
                };
                
                Plotly.newPlot('enhanced-dill-4d-exposure', exposureTraces, exposureLayout, plotlyConfig);
                console.log(`Enhanced DILL 4D动画：曝光剂量3D分布图更新成功 (帧${frameIndex})`);
            } catch (error) {
                console.error('Enhanced DILL 4D动画：曝光剂量分布图更新失败:', error);
            }
        }
    }
}

// 防抖函数
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// 防抖的帧更新函数
const debouncedUpdateDillFrame = debounce((frameIndex) => {
    updateDill4DAnimationFrame(frameIndex);
}, 100);

// 重新绑定DILL模型4D动画控制事件
function setupDill4DAnimationEventListeners() {
    const playBtn = document.getElementById('dill-4d-play-btn');
    const pauseBtn = document.getElementById('dill-4d-pause-btn');
    const resetBtn = document.getElementById('dill-4d-reset-btn');
    const loopBtn = document.getElementById('dill-4d-loop-btn');
    const timeSlider = document.getElementById('dill-4d-time-slider');
    
    if (playBtn) {
        // 清除旧的事件监听器
        playBtn.replaceWith(playBtn.cloneNode(true));
        const newPlayBtn = document.getElementById('dill-4d-play-btn');
        newPlayBtn.addEventListener('click', function() {
            if (dill4DAnimationData) {
                playDill4DAnimation();
            } else {
                alert('请先计算DILL模型数据以启用4D动画');
            }
        });
    }
    
    if (pauseBtn) {
        pauseBtn.replaceWith(pauseBtn.cloneNode(true));
        const newPauseBtn = document.getElementById('dill-4d-pause-btn');
        newPauseBtn.addEventListener('click', pauseDill4DAnimation);
    }
    
    if (resetBtn) {
        resetBtn.replaceWith(resetBtn.cloneNode(true));
        const newResetBtn = document.getElementById('dill-4d-reset-btn');
        newResetBtn.addEventListener('click', resetDill4DAnimation);
    }
    
    if (loopBtn) {
        loopBtn.replaceWith(loopBtn.cloneNode(true));
        const newLoopBtn = document.getElementById('dill-4d-loop-btn');
        newLoopBtn.addEventListener('click', toggleDill4DLoop);
    }
    
    // 添加时间滑块事件监听器，使用防抖机制
    if (timeSlider) {
        timeSlider.replaceWith(timeSlider.cloneNode(true));
        const newTimeSlider = document.getElementById('dill-4d-time-slider');
        
        let isUpdating = false;
        newTimeSlider.addEventListener('input', function() {
            if (isUpdating) return;
            // 暂停当前动画
            pauseDill4DAnimation();
            // 更新到选定帧（使用防抖）
            const frameIndex = parseInt(this.value);
            dill4DAnimationState.currentFrame = frameIndex;
            debouncedUpdateDillFrame(frameIndex);
        });
        
        // 添加change事件确保最终状态正确
        newTimeSlider.addEventListener('change', function() {
            const frameIndex = parseInt(this.value);
            dill4DAnimationState.currentFrame = frameIndex;
            isUpdating = true;
            updateDill4DAnimationFrame(frameIndex);
            setTimeout(() => { isUpdating = false; }, 50);
        });
    }
}

// 防抖的Enhanced帧更新函数
const debouncedUpdateEnhancedDillFrame = debounce((frameIndex) => {
    updateEnhancedDill4DAnimationFrame(frameIndex);
}, 100);

// 重新绑定Enhanced DILL模型4D动画控制事件
function setupEnhancedDill4DAnimationEventListeners() {
    console.log('设置Enhanced DILL 4D动画事件监听器');
    
    const playBtn = document.getElementById('enhanced-dill-4d-play-btn');
    const pauseBtn = document.getElementById('enhanced-dill-4d-pause-btn');
    const resetBtn = document.getElementById('enhanced-dill-4d-reset-btn');
    const loopBtn = document.getElementById('enhanced-dill-4d-loop-btn');
    const timeSlider = document.getElementById('enhanced-dill-4d-time-slider');
    
    console.log('Enhanced DILL 4D动画按钮状态:', {
        playBtn: !!playBtn,
        pauseBtn: !!pauseBtn,
        resetBtn: !!resetBtn,
        loopBtn: !!loopBtn,
        timeSlider: !!timeSlider
    });
    
    if (playBtn) {
        // 清除旧的事件监听器
        playBtn.replaceWith(playBtn.cloneNode(true));
        const newPlayBtn = document.getElementById('enhanced-dill-4d-play-btn');
        newPlayBtn.addEventListener('click', function() {
            console.log('Enhanced DILL 4D动画播放按钮被点击');
            if (enhancedDill4DAnimationData) {
                playEnhancedDill4DAnimation();
            } else {
                console.warn('Enhanced DILL 4D动画数据不存在');
                alert('请先计算增强DILL模型数据以启用4D动画');
            }
        });
        console.log('Enhanced DILL 4D动画播放按钮事件已绑定');
    } else {
        console.error('Enhanced DILL 4D动画播放按钮未找到');
    }
    
    if (pauseBtn) {
        pauseBtn.replaceWith(pauseBtn.cloneNode(true));
        const newPauseBtn = document.getElementById('enhanced-dill-4d-pause-btn');
        newPauseBtn.addEventListener('click', pauseEnhancedDill4DAnimation);
        console.log('Enhanced DILL 4D动画暂停按钮事件已绑定');
    } else {
        console.error('Enhanced DILL 4D动画暂停按钮未找到');
    }
    
    if (resetBtn) {
        resetBtn.replaceWith(resetBtn.cloneNode(true));
        const newResetBtn = document.getElementById('enhanced-dill-4d-reset-btn');
        newResetBtn.addEventListener('click', resetEnhancedDill4DAnimation);
        console.log('Enhanced DILL 4D动画重置按钮事件已绑定');
    } else {
        console.error('Enhanced DILL 4D动画重置按钮未找到');
    }
    
    if (loopBtn) {
        loopBtn.replaceWith(loopBtn.cloneNode(true));
        const newLoopBtn = document.getElementById('enhanced-dill-4d-loop-btn');
        newLoopBtn.addEventListener('click', toggleEnhancedDill4DLoop);
        console.log('Enhanced DILL 4D动画循环按钮事件已绑定');
    } else {
        console.error('Enhanced DILL 4D动画循环按钮未找到');
    }
    
    // 添加时间滑块事件监听器，使用防抖机制
    if (timeSlider) {
        timeSlider.replaceWith(timeSlider.cloneNode(true));
        const newTimeSlider = document.getElementById('enhanced-dill-4d-time-slider');
        
        let isUpdating = false;
        newTimeSlider.addEventListener('input', function() {
            if (isUpdating) return;
            // 暂停当前动画
            pauseEnhancedDill4DAnimation();
            // 更新到选定帧（使用防抖）
            const frameIndex = parseInt(this.value);
            enhancedDill4DAnimationState.currentFrame = frameIndex;
            debouncedUpdateEnhancedDillFrame(frameIndex);
        });
        
        // 添加change事件确保最终状态正确
        newTimeSlider.addEventListener('change', function() {
            const frameIndex = parseInt(this.value);
            enhancedDill4DAnimationState.currentFrame = frameIndex;
            isUpdating = true;
            updateEnhancedDill4DAnimationFrame(frameIndex);
            setTimeout(() => { isUpdating = false; }, 50);
        });
        console.log('Enhanced DILL 4D动画时间滑块事件已绑定');
    } else {
        console.error('Enhanced DILL 4D动画时间滑块未找到');
    }
    
    console.log('Enhanced DILL 4D动画事件监听器设置完成');
}

// 防抖的1D帧更新函数
const debouncedUpdateDill1DFrame = debounce((frameIndex) => {
    updateDill1DAnimationFrame(frameIndex);
}, 100);

// 曝光时间窗口选择器相关函数
/**
 * 控制其他三个控制框的显示/隐藏
 * @param {boolean} hideControls - 是否隐藏控制框（true=隐藏，false=显示）
 */
function toggleOtherControlsVisibility(hideControls) {
    // 获取三个需要控制的容器
    const exposureTimeContainer = document.getElementById('dill-exposure-time-params-container');
    const animationContainer = document.getElementById('dill-1d-animation-params-container');
    const vEvaluationContainer = document.getElementById('dill-1d-v-evaluation-params-container');
    
    // 控制显示/隐藏
    const displayValue = hideControls ? 'none' : 'block';
    
    if (exposureTimeContainer) {
        exposureTimeContainer.style.display = displayValue;
    }
    
    if (animationContainer) {
        animationContainer.style.display = displayValue;
    }
    
    if (vEvaluationContainer) {
        vEvaluationContainer.style.display = displayValue;
    }
    
    console.log(`${hideControls ? '隐藏' : '显示'}了三个控制框: 曝光时间窗口、1D时间动画、1D V评估`);
}

/**
 * 切换曝光时间输入框的禁用/启用状态
 * @param {boolean} isDisabled - 是否禁用输入框
 */
function toggleExposureTimeInputState(isDisabled) {
    // 获取曝光时间相关的输入元素
    const exposureTimeSlider = document.getElementById('t_exp');
    const exposureTimeNumberInput = exposureTimeSlider ? exposureTimeSlider.parentElement.querySelector('.number-input') : null;
    const exposureTimeContainer = exposureTimeSlider ? exposureTimeSlider.closest('.parameter-item') : null;
    
    if (exposureTimeSlider && exposureTimeNumberInput && exposureTimeContainer) {
        if (isDisabled) {
            // 禁用输入框
            exposureTimeSlider.disabled = true;
            exposureTimeNumberInput.disabled = true;
            
            // 添加视觉效果：变灰
            exposureTimeContainer.style.opacity = '0.5';
            exposureTimeContainer.style.pointerEvents = 'none';
            exposureTimeContainer.style.filter = 'grayscale(50%)';
            
            // 添加一个视觉提示
            exposureTimeContainer.setAttribute('title', '曝光时间窗口模式已启用，此输入框已禁用');
            
            console.log('✅ 曝光时间输入框已禁用并变灰');
        } else {
            // 启用输入框
            exposureTimeSlider.disabled = false;
            exposureTimeNumberInput.disabled = false;
            
            // 恢复正常样式
            exposureTimeContainer.style.opacity = '';
            exposureTimeContainer.style.pointerEvents = '';
            exposureTimeContainer.style.filter = '';
            
            // 移除提示
            exposureTimeContainer.removeAttribute('title');
            
            console.log('✅ 曝光时间输入框已启用并恢复正常样式');
        }
    } else {
        console.error('❌ 无法找到曝光时间输入框元素');
    }
}

/**
 * 初始化曝光时间窗口选择器
 */
function initExposureTimeWindowSelector() {
    console.log('🕐 初始化曝光时间窗口选择器');
    
    // 绑定曝光时间窗口开关事件
    const enableExposureTimeWindowCheckbox = document.getElementById('enable_exposure_time_window_dill');
    const exposureTimeParams = document.getElementById('dill_1d_exposure_time_params');
    
    if (enableExposureTimeWindowCheckbox && exposureTimeParams) {
        // 检查初始状态是否为累积模式
        const exposureMethodSelect = document.getElementById('exposure_calculation_method');
        const isCumulativeMode = exposureMethodSelect && exposureMethodSelect.value === 'cumulative';
        
        // 初始状态：根据复选框状态和累积模式显示/隐藏参数和禁用/启用曝光时间输入框
        const shouldShowParams = enableExposureTimeWindowCheckbox.checked && !isCumulativeMode;
        exposureTimeParams.style.display = shouldShowParams ? 'block' : 'none';
        toggleExposureTimeInputState(shouldShowParams);
        // 初始化时不需要隐藏其他控制框，移除错误的调用
        
        enableExposureTimeWindowCheckbox.addEventListener('change', function() {
            // 检查当前是否为累积模式
            const exposureMethodSelect = document.getElementById('exposure_calculation_method');
            const isCumulativeMode = exposureMethodSelect && exposureMethodSelect.value === 'cumulative';
            
            // 在累积模式下，即使开关被勾选也不显示参数面板
            if (this.checked && !isCumulativeMode) {
                exposureTimeParams.style.display = 'block';
                // 切换曝光时间输入框的禁用/启用状态
                toggleExposureTimeInputState(true);
            } else {
                exposureTimeParams.style.display = 'none';
                // 切换曝光时间输入框的禁用/启用状态
                toggleExposureTimeInputState(false);
            }
            
            // 注意：这里不需要隐藏其他控制框，只需要控制曝光时间窗口参数的显示
            // 移除了错误的toggleOtherControlsVisibility调用
            
            if (this.checked && !isCumulativeMode) {
                console.log('启用曝光时间窗口控制 - 将使用自定义曝光时间列表，单一曝光时间输入框已禁用');
            } else if (this.checked && isCumulativeMode) {
                console.log('🔒 累积模式下曝光时间窗口功能被禁用，开关状态已保持但参数面板隐藏');
            } else {
                console.log('禁用曝光时间窗口控制 - 将使用上方单一曝光时间值，单一曝光时间输入框已启用');
            }
            // 清空结果图
            if (typeof clearAllCharts === 'function') {
                clearAllCharts();
                console.log('已清空结果图表（曝光时间窗口控制状态改变）');
            }
        });
    }
    
    // 绑定快速时间列表按钮事件
    const quickTimeButtons = document.querySelectorAll('.quick-time-btn');
    quickTimeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const times = this.getAttribute('data-times');
            const exposureTimesInput = document.getElementById('exposure_times_input');
            if (exposureTimesInput && times) {
                exposureTimesInput.value = times;
                validateAndUpdateExposureTimesList(times);
                showExposureTimeStatus(`已选择快速时间列表: ${this.textContent.trim()}`, 'success');
                
                // 高亮显示选中的按钮
                quickTimeButtons.forEach(btn => btn.style.boxShadow = 'none');
                this.style.boxShadow = '0 0 8px rgba(76, 175, 80, 0.6)';
                setTimeout(() => {
                    this.style.boxShadow = 'none';
                }, 2000);
                
                // 清空结果图
                if (typeof clearAllCharts === 'function') {
                    clearAllCharts();
                    console.log('已清空结果图表（快速时间列表选择）');
                }
            }
        });
        
        // 添加悬停效果
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            if (!this.style.boxShadow.includes('rgba(76, 175, 80')) {
                this.style.boxShadow = 'none';
            }
        });
    });
    
    // 绑定曝光时间输入框事件
    const exposureTimesInput = document.getElementById('exposure_times_input');
    if (exposureTimesInput) {
        exposureTimesInput.addEventListener('input', function() {
            validateAndUpdateExposureTimesList(this.value);
            // 清空结果图
            if (typeof clearAllCharts === 'function') {
                clearAllCharts();
                console.log('已清空结果图表（曝光时间输入内容改变）');
            }
        });
        
        // 初始化时验证默认值
        validateAndUpdateExposureTimesList(exposureTimesInput.value);
    }
    
    // 绑定恢复默认按钮事件
    const resetExposureTimesBtn = document.getElementById('reset_exposure_times_btn');
    if (resetExposureTimesBtn) {
        resetExposureTimesBtn.addEventListener('click', function() {
            resetExposureTimesToDefault();
            // 清空结果图
            if (typeof clearAllCharts === 'function') {
                clearAllCharts();
                console.log('已清空结果图表（恢复默认曝光时间）');
            }
        });
    }
    
    // 添加便捷关闭按钮事件监听器
    const closeExposureTimeParamsBtn = document.getElementById('close_dill_exposure_time_params');
    if (closeExposureTimeParamsBtn && enableExposureTimeWindowCheckbox && exposureTimeParams) {
        closeExposureTimeParamsBtn.addEventListener('click', function() {
            // 取消勾选复选框并隐藏面板
            enableExposureTimeWindowCheckbox.checked = false;
            exposureTimeParams.style.display = 'none';
            
            // 恢复曝光时间输入框的启用状态
            toggleExposureTimeInputState(false);
            
            console.log('用户点击关闭按钮，已隐藏曝光时间窗口面板并恢复单一曝光时间输入框');
            
            // 清空结果图
            if (typeof clearAllCharts === 'function') {
                clearAllCharts();
                console.log('已清空结果图表（曝光时间窗口面板关闭）');
            }
        });
    }
    
    console.log('✅ 曝光时间窗口选择器初始化完成（已添加快速时间列表支持）');
}

/**
 * 验证并更新曝光时间列表
 */
function validateAndUpdateExposureTimesList(inputValue) {
    const statusElement = document.getElementById('exposure_times_status');
    const previewElement = document.getElementById('exposure_times_preview');
    const countElement = document.getElementById('exposure_times_count');
    
    if (!inputValue.trim()) {
        showExposureTimeStatus('请输入曝光时间', 'error');
        return;
    }
    
    try {
        // 解析输入的曝光时间
        const timeStrings = inputValue.split(',').map(s => s.trim()).filter(s => s);
        const times = [];
        
        for (const timeStr of timeStrings) {
            const time = parseFloat(timeStr);
            if (isNaN(time) || time <= 0) {
                throw new Error(`无效的曝光时间: ${timeStr}`);
            }
            if (time > 100000) {
                throw new Error(`曝光时间过大: ${timeStr} (最大值: 100000秒)`);
            }
            times.push(time);
        }
        
        if (times.length === 0) {
            throw new Error('至少需要一个有效的曝光时间');
        }
        
        if (times.length > 10) {
            throw new Error('最多支持10个曝光时间');
        }
        
        // 更新预览
        updateExposureTimePreview(times);
        
        // 更新计数
        if (countElement) {
            countElement.textContent = `${times.length}组`;
        }
        
        // 显示成功状态
        showExposureTimeStatus(`成功解析${times.length}组曝光时间`, 'success');
        
        // 存储解析后的时间列表供后续使用
        window.customExposureTimes = times;
        
    } catch (error) {
        showExposureTimeStatus(error.message, 'error');
        updateExposureTimePreview([]);
        if (countElement) {
            countElement.textContent = '0组';
        }
        window.customExposureTimes = null;
    }
}

/**
 * 更新曝光时间预览
 */
function updateExposureTimePreview(times) {
    const previewElement = document.getElementById('exposure_times_preview');
    if (!previewElement) return;
    
    const previewText = previewElement.querySelector('.preview-text');
    if (!previewText) return;
    
    if (times.length === 0) {
        previewText.textContent = '无有效曝光时间';
        previewText.style.color = '#999';
        return;
    }
    
    // 格式化时间显示
    const formattedTimes = times.map(t => {
        if (t >= 1000) {
            return `${(t/1000).toFixed(1)}k`;
        } else if (t >= 1) {
            return `${t}`;
        } else {
            return `${t.toFixed(2)}`;
        }
    });
    
    previewText.textContent = `t = ${formattedTimes.join('s, ')}s`;
    previewText.style.color = '#2c3e50';
}

/**
 * 显示曝光时间状态信息
 */
function showExposureTimeStatus(message, type) {
    const statusElement = document.getElementById('exposure_times_status');
    if (!statusElement) return;
    
    const statusText = statusElement.querySelector('.status-text');
    if (!statusText) return;
    
    statusText.textContent = message;
    statusElement.style.display = 'block';
    
    // 清除之前的状态类
    statusElement.classList.remove('status-success', 'status-error', 'status-warning');
    
    // 添加新的状态类
    if (type === 'success') {
        statusElement.classList.add('status-success');
        statusElement.style.background = '#d4edda';
        statusElement.style.color = '#155724';
        statusElement.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        statusElement.classList.add('status-error');
        statusElement.style.background = '#f8d7da';
        statusElement.style.color = '#721c24';
        statusElement.style.border = '1px solid #f5c6cb';
    } else if (type === 'warning') {
        statusElement.classList.add('status-warning');
        statusElement.style.background = '#fff3cd';
        statusElement.style.color = '#856404';
        statusElement.style.border = '1px solid #ffeaa7';
    }
    
    // 自动隐藏成功消息
    if (type === 'success') {
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }
}

/**
 * 重置曝光时间到默认值
 */
function resetExposureTimesToDefault() {
    const exposureTimesInput = document.getElementById('exposure_times_input');
    if (exposureTimesInput) {
        exposureTimesInput.value = '30, 60, 250, 1000, 2000';
        validateAndUpdateExposureTimesList(exposureTimesInput.value);
        showExposureTimeStatus('已恢复默认曝光时间（经典组合）', 'success');
    }
}

/**
 * 获取当前设置的曝光时间列表
 * 只有在启用曝光时间窗口时才返回自定义时间列表
 */
function getCustomExposureTimes() {
    const enableExposureTimeWindowCheckbox = document.getElementById('enable_exposure_time_window_dill');
    
    // 检查当前是否为累积模式
    const exposureMethodSelect = document.getElementById('exposure_calculation_method');
    const isCumulativeMode = exposureMethodSelect && exposureMethodSelect.value === 'cumulative';
    
    // 只有在明确启用曝光时间窗口且不在累积模式下时才返回自定义时间
    if (enableExposureTimeWindowCheckbox && enableExposureTimeWindowCheckbox.checked && !isCumulativeMode) {
        if (window.customExposureTimes && window.customExposureTimes.length > 0) {
            return window.customExposureTimes;
        } else {
            console.warn('⚠️ 曝光时间窗口已启用但没有有效的自定义曝光时间');
            return null;
        }
    }
    
    // 未启用曝光时间窗口时返回null，使用单一曝光时间值
    return null;
}

// 设置DILL模型1D动画控制事件监听器
function setupDill1DAnimationEventListeners() {
    console.log('设置DILL 1D动画事件监听器');
    
    const playBtn = document.getElementById('dill-1d-play-btn');
    const pauseBtn = document.getElementById('dill-1d-pause-btn');
    const resetBtn = document.getElementById('dill-1d-reset-btn');
    const loopBtn = document.getElementById('dill-1d-loop-btn');
    const timeSlider = document.getElementById('dill-1d-time-slider');
    
    console.log('DILL 1D动画按钮状态:', {
        playBtn: !!playBtn,
        pauseBtn: !!pauseBtn,
        resetBtn: !!resetBtn,
        loopBtn: !!loopBtn,
        timeSlider: !!timeSlider,
        isPlaying: dill1DAnimationState.isPlaying
    });
    
    if (playBtn) {
        // 清除旧的事件监听器
        playBtn.replaceWith(playBtn.cloneNode(true));
        const newPlayBtn = document.getElementById('dill-1d-play-btn');
        newPlayBtn.addEventListener('click', function() {
            console.log('DILL 1D动画播放按钮被点击');
            if (dill1DAnimationState.animationData) {
                playDill1DAnimation();
            } else {
                console.warn('DILL 1D动画数据不存在');
                alert('请先计算DILL模型1D动画数据');
            }
        });
        console.log('DILL 1D动画播放按钮事件已绑定');
    } else {
        console.error('DILL 1D动画播放按钮未找到');
    }
    
    if (pauseBtn) {
        pauseBtn.replaceWith(pauseBtn.cloneNode(true));
        const newPauseBtn = document.getElementById('dill-1d-pause-btn');
        newPauseBtn.addEventListener('click', function() {
            console.log('DILL 1D动画暂停按钮被点击');
            pauseDill1DAnimation();
        });
        console.log('DILL 1D动画暂停按钮事件已绑定');
    } else {
        console.error('DILL 1D动画暂停按钮未找到');
    }
    
    // 重新设置按钮的正确显示状态
    updateDill1DButtonStates();
    
    if (resetBtn) {
        resetBtn.replaceWith(resetBtn.cloneNode(true));
        const newResetBtn = document.getElementById('dill-1d-reset-btn');
        newResetBtn.addEventListener('click', resetDill1DAnimation);
        console.log('DILL 1D动画重置按钮事件已绑定');
    } else {
        console.error('DILL 1D动画重置按钮未找到');
    }
    
    if (loopBtn) {
        loopBtn.replaceWith(loopBtn.cloneNode(true));
        const newLoopBtn = document.getElementById('dill-1d-loop-btn');
        newLoopBtn.addEventListener('click', toggleDill1DLoop);
        console.log('DILL 1D动画循环按钮事件已绑定');
    } else {
        console.error('DILL 1D动画循环按钮未找到');
    }
    
    // 添加时间滑块事件监听器，使用防抖机制
    if (timeSlider) {
        timeSlider.replaceWith(timeSlider.cloneNode(true));
        const newTimeSlider = document.getElementById('dill-1d-time-slider');
        
        let isUpdating = false;
        newTimeSlider.addEventListener('input', function() {
            console.log('DILL 1D动画时间滑块拖动:', this.value);
            if (isUpdating) return;
            
            // 暂停当前动画
            pauseDill1DAnimation();
            
            // 更新到选定帧（使用防抖）
            const frameIndex = parseInt(this.value);
            dill1DAnimationState.currentFrame = frameIndex;
            debouncedUpdateDill1DFrame(frameIndex);
        });
        
        // 添加change事件确保最终状态正确
        newTimeSlider.addEventListener('change', function() {
            console.log('DILL 1D动画时间滑块选择:', this.value);
            const frameIndex = parseInt(this.value);
            dill1DAnimationState.currentFrame = frameIndex;
            isUpdating = true;
            updateDill1DAnimationFrame(frameIndex);
            setTimeout(() => { isUpdating = false; }, 50);
        });
        
        console.log('DILL 1D动画时间滑块事件已绑定');
    } else {
        console.error('DILL 1D动画时间滑块未找到');
    }
    
    console.log('DILL 1D动画事件监听器设置完成');
}

// ================================
// DILL 1D V评估动画控制功能
// ================================

// 设置DILL模型1D V评估控制
function setupDill1DVEvaluationControls() {
    console.log('设置DILL 1D V评估控制');
    
    // 初始化V评估状态
    dill1DVEvaluationState.currentFrame = 0;
    dill1DVEvaluationState.isPlaying = false;
    dill1DVEvaluationState.isLooping = false;
    
    console.log('DILL 1D V评估控制设置完成');
}

// 播放DILL 1D V评估动画
function playDill1DVEvaluation() {
    console.log('开始播放DILL 1D V评估动画');
    
    if (!dill1DVEvaluationState.animationData || dill1DVEvaluationState.animationData.length === 0) {
        console.warn('没有V评估动画数据可播放');
        return;
    }
    
    if (dill1DVEvaluationState.isPlaying) {
        console.log('V评估动画已在播放中');
        return;
    }
    
    dill1DVEvaluationState.isPlaying = true;
    updateDill1DVEvaluationStatus('播放中');
    
    // 切换播放按钮和暂停按钮的显示状态
    const playBtn = document.getElementById('dill-1d-v-play-btn');
    const pauseBtn = document.getElementById('dill-1d-v-pause-btn');
    
    if (playBtn) playBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'inline-flex';
    
    console.log('V评估动画播放状态:', {
        totalFrames: dill1DVEvaluationState.totalFrames,
        currentFrame: dill1DVEvaluationState.currentFrame,
        isLooping: dill1DVEvaluationState.isLooping
    });
    
    dill1DVEvaluationState.intervalId = setInterval(() => {
        if (dill1DVEvaluationState.currentFrame < dill1DVEvaluationState.totalFrames - 1) {
            dill1DVEvaluationState.currentFrame++;
        } else if (dill1DVEvaluationState.isLooping) {
            dill1DVEvaluationState.currentFrame = 0;
        } else {
            pauseDill1DVEvaluation();
            return;
        }
        
        updateDill1DVEvaluationFrame(dill1DVEvaluationState.currentFrame);
        updateDill1DVEvaluationTimeSlider(dill1DVEvaluationState.currentFrame);
    }, 500); // 500ms间隔，可根据需要调整
}

// 暂停DILL 1D V评估动画
function pauseDill1DVEvaluation() {
    console.log('暂停DILL 1D V评估动画');
    
    if (dill1DVEvaluationState.intervalId) {
        clearInterval(dill1DVEvaluationState.intervalId);
        dill1DVEvaluationState.intervalId = null;
    }
    
    dill1DVEvaluationState.isPlaying = false;
    // 更新当前帧状态为就绪
    const frameData = dill1DVEvaluationState.animationData && dill1DVEvaluationState.animationData[dill1DVEvaluationState.currentFrame];
    if (frameData) {
        updateDill1DVEvaluationStatus(`就绪: 第${dill1DVEvaluationState.currentFrame + 1}/${dill1DVEvaluationState.totalFrames}帧 (V=${frameData.v_value.toFixed(2)})`);
    } else {
        updateDill1DVEvaluationStatus('就绪');
    }
    
    // 切换播放按钮和暂停按钮的显示状态
    const playBtn = document.getElementById('dill-1d-v-play-btn');
    const pauseBtn = document.getElementById('dill-1d-v-pause-btn');
    if (playBtn && pauseBtn) {
        playBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
    }
}

// 重置DILL 1D V评估动画
function resetDill1DVEvaluation() {
    console.log('重置DILL 1D V评估动画');
    pauseDill1DVEvaluation();
    dill1DVEvaluationState.currentFrame = 0;
    updateDill1DVEvaluationFrame(0);
    updateDill1DVEvaluationTimeSlider(0);
    updateDill1DVEvaluationStatus('已重置');
}

// 切换DILL 1D V评估循环模式
function toggleDill1DVEvaluationLoop() {
    dill1DVEvaluationState.isLooping = !dill1DVEvaluationState.isLooping;
    const loopBtn = document.getElementById('dill-1d-v-loop-btn');
    if (loopBtn) {
        const textSpan = loopBtn.querySelector('span');
        if (dill1DVEvaluationState.isLooping) {
            // 开启循环时：移除 loop-off 类，显示"关闭循环"
            if (textSpan) textSpan.textContent = '关闭循环';
            loopBtn.classList.remove('loop-off');
            loopBtn.setAttribute('title', '关闭循环播放');
        } else {
            // 关闭循环时：添加 loop-off 类，显示"开启循环"
            if (textSpan) textSpan.textContent = '开启循环';
            loopBtn.classList.add('loop-off');
            loopBtn.setAttribute('title', '开启循环播放');
        }
    }
    updateDill1DVEvaluationStatus(dill1DVEvaluationState.isLooping ? '已开启循环播放' : '已关闭循环播放');
}

// 更新DILL 1D V评估动画状态显示
function updateDill1DVEvaluationStatus(status) {
    const statusElement = document.getElementById('dill-1d-v-evaluation-status');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

// 更新DILL 1D V评估动画帧
function updateDill1DVEvaluationFrame(frameIndex) {
    console.log(`更新DILL 1D V评估动画帧: ${frameIndex}/${dill1DVEvaluationState.totalFrames - 1}`);
    
    if (!dill1DVEvaluationState.animationData || frameIndex >= dill1DVEvaluationState.animationData.length) {
        console.error('V评估帧索引超出范围或数据不存在:', frameIndex);
        return;
    }
    
    try {
        const frameData = dill1DVEvaluationState.animationData[frameIndex];
        console.log('V评估帧数据:', {
            frameIndex: frameIndex,
            v_value: frameData.v_value,
            x_length: frameData.x ? frameData.x.length : 0,
            exposure_length: frameData.exposure_dose ? frameData.exposure_dose.length : 0,
            thickness_length: frameData.thickness ? frameData.thickness.length : 0
        });
        
        // 获取图表容器
        const exposureContainer = document.getElementById('dill-v-exposure-1d-plot');
        const thicknessContainer = document.getElementById('dill-v-thickness-1d-plot');
        const contrastContainer = document.getElementById('dill-v-comparison-plot');
        
        if (!exposureContainer || !thicknessContainer || !contrastContainer) {
            console.error('V评估图表容器未找到');
            return;
        }
        
        // 构造图表数据
        const plotData = {
            x: frameData.x,
            x_coords: frameData.x,
            exposure_dose: frameData.exposure_dose,
            thickness: frameData.thickness,
            is_1d: true,
            sine_type: '1d'
        };
        
        // 更新曝光剂量图表
        try {
            exposureContainer.innerHTML = '';
            createExposurePlot(exposureContainer, plotData);
            
            // 添加V值标题
            const exposureTitle = exposureContainer.parentElement.querySelector('.v-evaluation-plot-title');
            if (exposureTitle) {
                exposureTitle.textContent = `曝光剂量分布 (V=${frameData.v_value.toFixed(3)})`;
            }
        } catch (error) {
            console.error('更新V评估曝光剂量图表失败:', error);
            exposureContainer.innerHTML = '<div style="color:red;padding:20px;">曝光剂量图表更新失败</div>';
        }
        
        // 更新厚度图表
        try {
            thicknessContainer.innerHTML = '';
            createThicknessPlot(thicknessContainer, plotData);
            
            // 添加V值标题
            const thicknessTitle = thicknessContainer.parentElement.querySelector('.v-evaluation-plot-title');
            if (thicknessTitle) {
                thicknessTitle.textContent = `形貌分布 (V=${frameData.v_value.toFixed(3)})`;
            }
        } catch (error) {
            console.error('更新V评估厚度图表失败:', error);
            thicknessContainer.innerHTML = '<div style="color:red;padding:20px;">厚度图表更新失败</div>';
        }
        
        // 更新对比分析图表
        try {
            contrastContainer.innerHTML = '';
            createVEvaluationContrastPlot(contrastContainer, dill1DVEvaluationState.animationData, frameIndex);
        } catch (error) {
            console.error('更新V评估对比分析图表失败:', error);
            contrastContainer.innerHTML = '<div style="color:red;padding:20px;">对比分析图表更新失败</div>';
        }
        
        // 更新V值显示和时间滑块
        updateDill1DVEvaluationVDisplay(frameData.v_value, frameIndex);
        updateDill1DVEvaluationTimeSlider(frameIndex);
        
    } catch (error) {
        console.error('更新V评估动画帧失败:', error);
    }
}

// 分析曲线变化，动态确定两个阶段的边界
function analyzeCurveStages(vValues, maxThicknesses) {
    // 动态计算转折点：从左到右首个厚度为1的点的横坐标
    let dynamicBoundary = 0.5; // 默认值
    
    // 查找首个厚度为1的点的V值
    for (let i = 0; i < maxThicknesses.length; i++) {
        if (Math.abs(maxThicknesses[i] - 1.0) < 0.01) { // 允许小量误差
            dynamicBoundary = vValues[i];
            break;
        }
    }
    
    // 如果没有找到厚度为1的点，使用厚度最接近1的点
    if (dynamicBoundary === 0.5) {
        let minDiff = Infinity;
        for (let i = 0; i < maxThicknesses.length; i++) {
            const diff = Math.abs(maxThicknesses[i] - 1.0);
            if (diff < minDiff) {
                minDiff = diff;
                dynamicBoundary = vValues[i];
            }
        }
    }
    
    console.log('🔍 曲线阶段分析结果（动态边界值）:', {
        dynamic_boundary: dynamicBoundary.toFixed(3),
        note: '动态计算转折点：从左到右首个厚度为1的点的横坐标',
        thickness_at_boundary: maxThicknesses[vValues.indexOf(dynamicBoundary)] || 'N/A'
    });
    
    return { stage1_boundary: dynamicBoundary };
}

// 创建V评估对比分析图表（带三阶段区域划分和交互动画）
function createVEvaluationContrastPlot(container, allFramesData, currentIndex) {
    if (!allFramesData || allFramesData.length === 0) {
        container.innerHTML = '<div style="color:orange;padding:20px;">对比分析数据不足</div>';
        return;
    }
    
    // 提取V值和对应的最大曝光剂量、最大厚度
    const vValues = [];
    const maxExposures = [];
    const maxThicknesses = [];
    
    allFramesData.forEach(frame => {
        vValues.push(frame.v_value);
        maxExposures.push(Math.max(...frame.exposure_dose));
        maxThicknesses.push(Math.max(...frame.thickness));
    });
    
    const minV = Math.min(...vValues);
    const maxV = Math.max(...vValues);
    
    // 动态分析曲线变化，确定两个阶段的边界
    const { stage1_boundary } = analyzeCurveStages(vValues, maxThicknesses);
    
    // 将边界存储到全局变量，供其他函数使用
    window.currentStageBoundaries = { stage1_boundary };
    
    // 主数据曲线
    const trace1 = {
        x: vValues,
        y: maxExposures,
        type: 'scatter',
        mode: 'lines+markers',
        name: '最大曝光剂量',
        line: { color: '#2E86AB', width: 3 },
        marker: { size: 8 },
        hovertemplate: 'V值: %{x:.3f}<br>最大曝光剂量: %{y:.3f}<extra></extra>'
    };
    
    const trace2 = {
        x: vValues,
        y: maxThicknesses,
        type: 'scatter',
        mode: 'lines+markers',
        name: '最大厚度',
        line: { color: '#A23B72', width: 3 },
        marker: { size: 8 },
        yaxis: 'y2',
        hovertemplate: 'V值: %{x:.3f}<br>最大厚度: %{y:.3f}<extra></extra>',
        // 禁用悬停时的加粗效果
        hoverlabel: { 
            bgcolor: 'rgba(231, 76, 60, 0.95)', 
            bordercolor: 'rgba(231, 76, 60, 1)',
            font: { size: 13, color: 'white' },
            borderwidth: 2
        }
    };
    
    // 添加两个阶段的背景区域
    const minY = Math.min(...maxExposures);
    const maxY = Math.max(...maxExposures);
    
    // 阶段1: 低对比度区域 (V < 动态边界)
    const stage1_trace = {
        x: [minV, stage1_boundary, stage1_boundary, minV],
        y: [minY, minY, maxY, maxY],
        fill: 'toself',
        fillcolor: 'rgba(52, 152, 219, 0.15)',
        line: { width: 0 },
        name: '第一阶段: 低对比度',
        showlegend: true,
        hoverinfo: 'name',
        hovertemplate: `<b>第一阶段: 低对比度</b><br>V值范围: ${minV.toFixed(3)} - ${stage1_boundary.toFixed(3)}<br>特性: 平缓变化阶段<extra></extra>`
    };
    
    // 阶段2: 高对比度区域 (V >= 动态边界)
    const stage2_trace = {
        x: [stage1_boundary, maxV, maxV, stage1_boundary],
        y: [minY, minY, maxY, maxY],
        fill: 'toself',
        fillcolor: 'rgba(231, 76, 60, 0.15)',
        line: { width: 0 },
        name: '第二阶段: 高对比度',
        showlegend: true,
        hoverinfo: 'name',
        hovertemplate: `<b>第二阶段: 高对比度</b><br>V值范围: ${stage1_boundary.toFixed(3)} - ${maxV.toFixed(3)}<br>特性: 锐利变化阶段<extra></extra>`
    };
    
    // 添加阶段分界线
    const boundary_trace = {
        x: [stage1_boundary, stage1_boundary],
        y: [minY, maxY],
        type: 'scatter',
        mode: 'lines',
        name: `阶段分界线 (V=${stage1_boundary.toFixed(3)})`,
        line: { color: '#34495e', width: 2, dash: 'dot' },
        showlegend: false,
        hovertemplate: `阶段分界线<br>V = ${stage1_boundary.toFixed(3)}<br>首个厚度为1的转折点<extra></extra>`
    };
    
    // 添加当前V值的竖线（带动画效果）
    const currentV = allFramesData[currentIndex].v_value;
    const currentTrace = {
        x: [currentV, currentV],
        y: [minY, maxY],
        type: 'scatter',
        mode: 'lines',
        name: `当前V值 (${currentV.toFixed(3)})`,
        line: { color: '#f39c12', width: 4, dash: 'dash' },
        showlegend: true,
        hovertemplate: `当前V值: ${currentV.toFixed(3)}<extra></extra>`
    };
    
    const layout = {
        title: {
            text: 'V值对比分析 - 二阶段变化',
            font: { size: 16, color: '#2c3e50' }
        },
        xaxis: { 
            title: 'V值 (对比度)',
            gridcolor: '#e0e0e0',
            showgrid: true,
            range: [Math.min(...vValues) - 0.05, Math.max(...vValues) + 0.05]
        },
        yaxis: {
            title: '最大曝光剂量',
            side: 'left',
            gridcolor: '#e0e0e0',
            showgrid: true,
            titlefont: { color: '#2E86AB' },
            tickfont: { color: '#2E86AB' }
        },
        yaxis2: {
            title: '最大厚度',
            side: 'right',
            overlaying: 'y',
            titlefont: { color: '#A23B72' },
            tickfont: { color: '#A23B72' }
        },
        legend: {
            x: 0.02,
            y: 0.98,
            bgcolor: 'rgba(255,255,255,0.6)',
            bordercolor: 'rgba(0,0,0,0.1)',
            borderwidth: 1,
            font: { size: 10 },
            itemsizing: 'constant',
            itemwidth: 30
        },
        margin: { l: 70, r: 70, t: 60, b: 70 },
        plot_bgcolor: '#fafafa',
        paper_bgcolor: 'white',
        hovermode: 'closest',
        // 禁用悬停时的加粗效果
        hoverlabel: { 
            bgcolor: 'rgba(44, 62, 80, 0.95)',
            bordercolor: 'rgba(52, 152, 219, 1)',
            font: { size: 13, color: 'white' },
            borderwidth: 2
        }
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'v_contrast_analysis',
            height: 500,
            width: 800,
            scale: 1
        }
    };
    
    // 绘制图表（背景区域在底层）
    const traces = [
        stage1_trace, stage2_trace,               // 背景区域（两个阶段）
        boundary_trace,                           // 分界线（一条）
        trace1, trace2,                           // 主数据曲线
        currentTrace                              // 当前V值线
    ];
    
    Plotly.newPlot(container, traces, layout, config);
    
    // 添加点击事件，显示详细信息
    container.on('plotly_click', function(data) {
        if (data.points && data.points.length > 0) {
            const point = data.points[0];
            if (point.data.name === '最大厚度' || point.data.name === '最大曝光剂量') {
                const vValue = point.x;
                const yValue = point.y;
                
                // 确定所在阶段（使用动态边界）
                const dynamicBoundary = window.currentStageBoundaries?.stage1_boundary || 0.5;
                let stage, stageDesc;
                if (vValue < dynamicBoundary) {
                    stage = '第一阶段';
                    stageDesc = '低对比度 - 平缓变化阶段';
                } else {
                    stage = '第二阶段';
                    stageDesc = '高对比度 - 锐利变化阶段';
                }
                
                alert(`📊 V值分析详情
V值: ${vValue.toFixed(3)}
${point.data.name}: ${yValue.toFixed(3)}
所属阶段: ${stage}
特性: ${stageDesc}`);
            }
        }
    });
}

// 更新DILL 1D V评估时间滑块
function updateDill1DVEvaluationTimeSlider(frameIndex) {
    const timeSlider = document.getElementById('dill-1d-v-slider');
    if (timeSlider) {
        timeSlider.value = frameIndex;
        
        // 更新滑块的最大值
        if (timeSlider.max != dill1DVEvaluationState.totalFrames - 1) {
            timeSlider.max = dill1DVEvaluationState.totalFrames - 1;
        }
    }
}

// 更新DILL 1D V评估V值显示
function updateDill1DVEvaluationVDisplay(vValue, frameIndex) {
    const vDisplay = document.getElementById('dill-1d-v-display');
    if (vDisplay) {
        vDisplay.textContent = `V = ${vValue.toFixed(1)}`;
    }
    
    const frameInfo = document.getElementById('dill-1d-v-frame-info');
    if (frameInfo) {
        frameInfo.textContent = `帧 ${frameIndex + 1}/${dill1DVEvaluationState.totalFrames}`;
    }
}

// 防抖的V评估帧更新函数
const debouncedUpdateDill1DVEvaluationFrame = debounce((frameIndex) => {
    updateDill1DVEvaluationFrame(frameIndex);
}, 100);

// 设置DILL模型1D V评估事件监听器
function setupDill1DVEvaluationEventListeners() {
    console.log('设置DILL 1D V评估事件监听器');
    
    const playBtn = document.getElementById('dill-1d-v-play-btn');
    const pauseBtn = document.getElementById('dill-1d-v-pause-btn');
    const resetBtn = document.getElementById('dill-1d-v-reset-btn');
    const loopBtn = document.getElementById('dill-1d-v-loop-btn');
    const timeSlider = document.getElementById('dill-1d-v-slider');
    
    console.log('DILL 1D V评估按钮状态:', {
        playBtn: !!playBtn,
        pauseBtn: !!pauseBtn,
        resetBtn: !!resetBtn,
        loopBtn: !!loopBtn,
        timeSlider: !!timeSlider
    });
    
    if (playBtn) {
        // 清除旧的事件监听器
        playBtn.replaceWith(playBtn.cloneNode(true));
        const newPlayBtn = document.getElementById('dill-1d-v-play-btn');
        newPlayBtn.addEventListener('click', function() {
            console.log('DILL 1D V评估播放按钮被点击');
            if (dill1DVEvaluationState.animationData) {
                playDill1DVEvaluation();
            } else {
                console.warn('DILL 1D V评估数据不存在');
                alert('请先计算DILL模型1D V评估数据');
            }
        });
        console.log('DILL 1D V评估播放按钮事件已绑定');
    } else {
        console.error('DILL 1D V评估播放按钮未找到');
    }
    
    if (pauseBtn) {
        pauseBtn.replaceWith(pauseBtn.cloneNode(true));
        const newPauseBtn = document.getElementById('dill-1d-v-pause-btn');
        newPauseBtn.addEventListener('click', pauseDill1DVEvaluation);
        console.log('DILL 1D V评估暂停按钮事件已绑定');
    } else {
        console.error('DILL 1D V评估暂停按钮未找到');
    }
    
    if (resetBtn) {
        resetBtn.replaceWith(resetBtn.cloneNode(true));
        const newResetBtn = document.getElementById('dill-1d-v-reset-btn');
        newResetBtn.addEventListener('click', resetDill1DVEvaluation);
        console.log('DILL 1D V评估重置按钮事件已绑定');
    } else {
        console.error('DILL 1D V评估重置按钮未找到');
    }
    
    if (loopBtn) {
        loopBtn.replaceWith(loopBtn.cloneNode(true));
        const newLoopBtn = document.getElementById('dill-1d-v-loop-btn');
        newLoopBtn.addEventListener('click', toggleDill1DVEvaluationLoop);
        console.log('DILL 1D V评估循环按钮事件已绑定');
    } else {
        console.error('DILL 1D V评估循环按钮未找到');
    }
    
    // 添加时间滑块事件监听器，使用防抖机制
    if (timeSlider) {
        timeSlider.replaceWith(timeSlider.cloneNode(true));
        const newTimeSlider = document.getElementById('dill-1d-v-slider');
        
        let isUpdating = false;
        newTimeSlider.addEventListener('input', function() {
            console.log('DILL 1D V评估时间滑块拖动:', this.value);
            if (isUpdating) return;
            
            // 暂停当前动画
            pauseDill1DVEvaluation();
            
            // 更新到选定帧（使用防抖）
            const frameIndex = parseInt(this.value);
            dill1DVEvaluationState.currentFrame = frameIndex;
            debouncedUpdateDill1DVEvaluationFrame(frameIndex);
        });
        
        // 添加change事件确保最终状态正确
        newTimeSlider.addEventListener('change', function() {
            console.log('DILL 1D V评估时间滑块选择:', this.value);
            const frameIndex = parseInt(this.value);
            dill1DVEvaluationState.currentFrame = frameIndex;
            isUpdating = true;
            updateDill1DVEvaluationFrame(frameIndex);
            setTimeout(() => { isUpdating = false; }, 50);
        });
        
        console.log('DILL 1D V评估时间滑块事件已绑定');
    } else {
        console.error('DILL 1D V评估时间滑块未找到');
    }
    
    console.log('DILL 1D V评估事件监听器设置完成');
}

/**
 * 导出图表数据为CSV文件
 * @param {string} plotType - 图表类型 ('exposure', 'thickness', 等)
 */
function exportPlotData(plotType) {
    console.log('导出数据：', plotType);
    
    let container, dataX, dataY, filename, header;
    
    switch (plotType) {
        case 'exposure':
            container = document.getElementById('exposure-plot-container');
            filename = 'exposure_data.csv';
            header = '位置(mm),光强分布\n';
            break;
        case 'thickness':
            container = document.getElementById('thickness-plot-container');
            filename = 'thickness_data.csv';
            header = '位置(mm),形貌深度\n';
            break;
        case 'exposure_xy':
            container = document.getElementById('exposure-xy-plot-container');
            filename = 'exposure_xy_data.csv';
            header = 'X位置(μm),Y位置(μm),曝光剂量\n';
            break;
        case 'thickness_xy':
            container = document.getElementById('thickness-xy-plot-container');
            filename = 'thickness_xy_data.csv';
            header = 'X位置(μm),Y位置(μm),厚度值\n';
            break;
        case 'enhanced_dill_x_plane_exposure':
            container = document.getElementById('enhanced-dill-x-plane-exposure-container');
            filename = 'enhanced_dill_x_plane_exposure_data.csv';
            header = 'Y位置(μm),Z位置(μm),曝光剂量\n';
            break;
        case 'enhanced_dill_x_plane_thickness':
            container = document.getElementById('enhanced-dill-x-plane-thickness-container');
            filename = 'enhanced_dill_x_plane_thickness_data.csv';
            header = 'Y位置(μm),Z位置(μm),厚度值\n';
            break;
        case 'enhanced_dill_y_plane_exposure':
            container = document.getElementById('enhanced-dill-y-plane-exposure-container');
            filename = 'enhanced_dill_y_plane_exposure_data.csv';
            header = 'X位置(μm),Z位置(μm),曝光剂量\n';
            break;
        case 'enhanced_dill_y_plane_thickness':
            container = document.getElementById('enhanced-dill-y-plane-thickness-container');
            filename = 'enhanced_dill_y_plane_thickness_data.csv';
            header = 'X位置(μm),Z位置(μm),厚度值\n';
            break;
        default:
            console.error('未知的图表类型：', plotType);
            return;
    }
    
    if (!container || !container.data || container.data.length === 0) {
        alert('没有可导出的数据，请先进行计算！');
        return;
    }
    
    try {
        let csvContent = header;
        const plotData = container.data[0]; // 获取第一个trace的数据
        
        if (plotType === 'exposure' || plotType === 'thickness') {
            // 1D数据处理
            dataX = plotData.x || [];
            dataY = plotData.y || [];
            
            // 检查是否为1D DILL模型（理想曝光模型）的特殊情况
            if (container.data && container.data.length > 0) {
                const firstTrace = container.data[0];
                
                if (plotType === 'exposure' && firstTrace.name === '光强分布') {
                    // 理想曝光模型的强度分布
                    csvContent = '位置(mm),光强分布(归一化)\n';
                    dataX = firstTrace.x || [];
                    dataY = firstTrace.y || [];
                } else if (plotType === 'thickness' && container.data.length > 1) {
                    // 理想曝光模型的多条蚀刻深度曲线
                    csvContent = '位置(mm)';
                    const timeLabels = [];
                    
                    // 添加每个时间的列标题
                    container.data.forEach((trace, index) => {
                        if (trace.name && trace.name.includes('t=')) {
                            const timeName = trace.name;
                            csvContent += `,${timeName}_形貌深度`;
                            timeLabels.push(timeName);
                        }
                    });
                    csvContent += '\n';
                    
                    // 导出多列数据
                    if (container.data[0] && container.data[0].x) {
                        const positions = container.data[0].x;
                        for (let i = 0; i < positions.length; i++) {
                            let row = `${positions[i]}`;
                            container.data.forEach((trace, index) => {
                                if (trace.name && trace.name.includes('t=') && trace.y) {
                                    row += `,${trace.y[i] || 0}`;
                                }
                            });
                            csvContent += row + '\n';
                        }
                    }
                    
                    // 特殊处理：直接下载文件，不继续执行普通处理
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    
                    if (link.download !== undefined) {
                        const url = URL.createObjectURL(blob);
                        link.setAttribute('href', url);
                        link.setAttribute('download', filename);
                        link.style.visibility = 'hidden';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        console.log(`多曲线数据已导出为: ${filename}`);
                        showExportSuccessMessage(filename);
                    } else {
                        alert('您的浏览器不支持文件下载功能');
                    }
                    return;
                }
            }
            
            if (dataX.length === 0 || dataY.length === 0) {
                alert('数据为空，无法导出！');
                return;
            }
            
            for (let i = 0; i < Math.min(dataX.length, dataY.length); i++) {
                csvContent += `${dataX[i]},${dataY[i]}\n`;
            }
        } else if (plotType.includes('_xy') || plotType.includes('_plane_')) {
            // 2D热图数据处理
            const xData = plotData.x || [];
            const yData = plotData.y || [];
            const zData = plotData.z || [];
            
            if (xData.length === 0 || yData.length === 0 || zData.length === 0) {
                alert('2D数据为空，无法导出！');
                return;
            }
            
            // 导出2D网格数据
            for (let i = 0; i < yData.length; i++) {
                for (let j = 0; j < xData.length; j++) {
                    const zValue = Array.isArray(zData[i]) ? zData[i][j] : zData[i * xData.length + j];
                    csvContent += `${xData[j]},${yData[i]},${zValue || 0}\n`;
                }
            }
        }
        
        // 创建并下载文件
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`数据已导出为: ${filename}`);
            
            // 显示成功提示
            showExportSuccessMessage(filename);
        } else {
            alert('您的浏览器不支持文件下载功能');
        }
        
    } catch (error) {
        console.error('导出数据时发生错误：', error);
        alert('导出数据失败：' + error.message);
    }
}

/**
 * 显示导出成功消息
 * @param {string} filename - 导出的文件名
 */
function showExportSuccessMessage(filename) {
    // 创建成功提示元素
    const successMsg = document.createElement('div');
    successMsg.className = 'export-success-message';
    successMsg.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>数据已成功导出为: ${filename}</span>
    `;
    successMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 20000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    // 添加动画样式
    if (!document.getElementById('export-success-style')) {
        const style = document.createElement('style');
        style.id = 'export-success-style';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(successMsg);
    
    // 3秒后自动消失
    setTimeout(() => {
        successMsg.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (successMsg.parentNode) {
                successMsg.parentNode.removeChild(successMsg);
            }
        }, 300);
    }, 3000);
}

// === 多条曝光时间线支持的辅助函数 ===

// 获取线条颜色的辅助函数
function getLineColor(index) {
    const colors = [
        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', 
        '#1abc9c', '#e67e22', '#34495e', '#f1c40f', '#e91e63'
    ];
    return colors[index % colors.length];
}

// 获取选中的曝光时间线索引
function getSelectedExposureTimeLines() {
    const controller = document.getElementById('dill-1d-multi-line-controller');
    if (!controller || controller.style.display === 'none') {
        return null; // 如果控制器不存在或隐藏，返回null表示显示所有线
    }
    
    const checkboxes = controller.querySelectorAll('input[type="checkbox"]');
    const selectedLines = [];
    
    checkboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
            selectedLines.push(index);
        }
    });
    
    // 修复：直接返回selectedLines数组，即使为空数组也要返回，这样"全不选"功能才能正常工作
    return selectedLines;
}

// 显示多线模式控制器
function showMultiLineController(etchDepthsData, selectedLines) {
    let controller = document.getElementById('dill-1d-multi-line-controller');
    
    if (!controller) {
        // 创建控制器容器
        controller = document.createElement('div');
        controller.id = 'dill-1d-multi-line-controller';
        controller.className = 'multi-line-controller';
        controller.style.cssText = `
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            border: 1px solid #dee2e6;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
            width: 100%;
            box-sizing: border-box;
        `;
        
        // 将控制器插入到动画控制面板后面，图表容器前面
        const animationSection = document.getElementById('dill-1d-animation-section');
        const animationControls = animationSection?.querySelector('.animation-controls');
        const animationContainer = animationSection?.querySelector('#dill-1d-animation-container');
        
        if (animationControls && animationContainer) {
            // 插入到动画控制面板和图表容器之间
            animationContainer.parentNode.insertBefore(controller, animationContainer);
        } else if (animationSection) {
            // 备用方案：直接添加到动画区域末尾
            animationSection.appendChild(controller);
        }
    }
    
    // 创建控制器内容
    const headerHtml = `
        <div style="
            display: flex; 
            align-items: center; 
            justify-content: space-between;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e9ecef;
        ">
            <h4 style="
                margin: 0; 
                color: #2c3e50; 
                font-size: 16px; 
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                <span style="color: #3498db; font-size: 18px;">📊</span>
                曝光时间线显示控制
                <span style="
                    background: #3498db;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                ">${etchDepthsData.length}条线</span>
            </h4>
            <div style="display: flex; gap: 10px;">
                <button id="select-all-exposure-lines" style="
                    background: linear-gradient(135deg, #3498db, #2980b9);
                    color: white;
                    border: none;
                    padding: 6px 14px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 6px rgba(52, 152, 219, 0.3);
                " 
                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(52, 152, 219, 0.4)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(52, 152, 219, 0.3)'">
                    全选
                </button>
                <button id="deselect-all-exposure-lines" style="
                    background: linear-gradient(135deg, #95a5a6, #7f8c8d);
                    color: white;
                    border: none;
                    padding: 6px 14px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 6px rgba(149, 165, 166, 0.3);
                "
                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(149, 165, 166, 0.4)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(149, 165, 166, 0.3)'">
                    全不选
                </button>
            </div>
        </div>
    `;
    
    const checkboxesHtml = etchDepthsData.map((timeData, index) => {
        const isSelected = selectedLines ? selectedLines.includes(index) : true;
        const color = getLineColor(index);
        return `
            <label style="
                display: inline-flex;
                align-items: center;
                margin: 0 12px 12px 0;
                padding: 8px 14px;
                background: ${isSelected ? 'white' : '#f8f9fa'};
                border: 2px solid ${color};
                border-radius: 10px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.25s ease;
                user-select: none;
                min-width: 60px;
                justify-content: center;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            " 
            data-index="${index}"
            onmouseover="if(this.querySelector('input').checked) { this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0, 0, 0, 0.15)'; }"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(0, 0, 0, 0.1)';">
                <input type="checkbox" ${isSelected ? 'checked' : ''} 
                       style="
                           margin-right: 8px; 
                           accent-color: ${color};
                           transform: scale(1.2);
                       " 
                       data-index="${index}">
                <span style="color: ${color}; font-size: 16px; margin-right: 6px;">●</span>
                <span style="color: #2c3e50;">
                    ${Number(timeData.time).toFixed(1)}s
                </span>
            </label>
        `;
    }).join('');
    
    controller.innerHTML = headerHtml + `
        <div style="
            display: flex; 
            flex-wrap: wrap; 
            gap: 8px;
            max-height: 200px;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 4px;
        ">
            ${checkboxesHtml}
        </div>
    `;
    controller.style.display = 'block';
    
    // 绑定事件监听器
    const selectAllBtn = controller.querySelector('#select-all-exposure-lines');
    const deselectAllBtn = controller.querySelector('#deselect-all-exposure-lines');
    const checkboxes = controller.querySelectorAll('input[type="checkbox"]');
    
    selectAllBtn?.addEventListener('click', () => {
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            updateLabelStyle(checkbox.closest('label'), true);
        });
        updateDill1DAnimationFrame(dill1DAnimationState.currentFrame);
    });
    
    deselectAllBtn?.addEventListener('click', () => {
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            updateLabelStyle(checkbox.closest('label'), false);
        });
        updateDill1DAnimationFrame(dill1DAnimationState.currentFrame);
    });
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateLabelStyle(this.closest('label'), this.checked);
            updateDill1DAnimationFrame(dill1DAnimationState.currentFrame);
        });
        
        // 初始化标签样式
        updateLabelStyle(checkbox.closest('label'), checkbox.checked);
    });
}

// 更新标签样式
function updateLabelStyle(label, isChecked) {
    if (label) {
        label.style.background = isChecked ? 'white' : '#f8f9fa';
        label.style.opacity = isChecked ? '1' : '0.6';
        label.style.transform = isChecked ? 'scale(1)' : 'scale(0.95)';
        label.style.boxShadow = isChecked 
            ? '0 2px 6px rgba(0, 0, 0, 0.1)' 
            : '0 1px 3px rgba(0, 0, 0, 0.05)';
    }
}

// 隐藏多线模式控制器
function hideMultiLineController() {
    const controller = document.getElementById('dill-1d-multi-line-controller');
    if (controller) {
        controller.style.display = 'none';
    }
}

// ========================================================================================
// 自定义光强分布输入功能
// ========================================================================================

// 全局变量存储自定义光强数据
let customIntensityData = {
    x: [],
    intensity: [],
    loaded: false,
    source: null,
    fileName: null,
    x_unit: 'mm', // 默认单位为mm
    x_range: {min: 0, max: 0},
    auto_detected: false, // 是否已自动检测单位
    outside_range_mode: 'zero', // 默认数据范围外光强为0
    custom_intensity_value: 0, // 自定义光强值
    auto_calculated_I_avg: null // 根据自定义数据自动计算的平均光强
};

// 自动计算平均光强
function calculateAutoI_avg(intensityData) {
    if (!intensityData || !Array.isArray(intensityData) || intensityData.length === 0) {
        return null;
    }
    
    // 计算平均值
    const sum = intensityData.reduce((acc, val) => acc + val, 0);
    const average = sum / intensityData.length;
    
    console.log(`🔢 自动计算 I_avg: 数据点${intensityData.length}个, 平均值=${average.toFixed(6)}`);
    return parseFloat(average.toFixed(6)); // 保留6位小数
}

// 初始化自定义光强分布功能
function initCustomIntensityFeature() {
    console.log('🔧 初始化自定义光强分布功能');
    
    // 输入方式选择器事件
    const methodSelect = document.getElementById('intensity_input_method');
    if (methodSelect) {
        methodSelect.addEventListener('change', handleIntensityMethodChange);
    }
    
    // 标签页切换事件
    initCustomIntensityTabs();
    
    // 文件上传功能
    initFileUploadFeature();
    
    // 手动输入功能
    initManualInputFeature();
    
    // 数据管理功能
    initDataManagementFeature();
    
    // 初始化范围外光强模式切换事件
    initOutsideRangeModeEvents();
    
    console.log('✅ 自定义光强分布功能初始化完成');
}

// 初始化范围外光强模式切换事件
function initOutsideRangeModeEvents() {
    // 文件上传模式的范围外光强下拉框
    const fileOutsideRangeSelect = document.getElementById('outside-range-mode-file');
    const customIntensityFileContainer = document.getElementById('custom-intensity-value-file-container');
    const customIntensityFileInput = document.getElementById('custom-intensity-value-file');
    
    if (fileOutsideRangeSelect) {
        fileOutsideRangeSelect.addEventListener('change', function() {
            // 处理自定义值输入框的显示与隐藏
            if (this.value === 'custom') {
                if (customIntensityFileContainer) {
                    customIntensityFileContainer.style.display = 'block';
                }
            } else {
                if (customIntensityFileContainer) {
                    customIntensityFileContainer.style.display = 'none';
                }
            }
            
            // 如果有已加载的数据，更新模式并刷新显示
            if (customIntensityData.loaded && customIntensityData.source === 'file') {
                customIntensityData.outside_range_mode = this.value;
                
                // 如果是自定义模式，保存自定义值
                if (this.value === 'custom' && customIntensityFileInput) {
                    customIntensityData.custom_intensity_value = parseFloat(customIntensityFileInput.value) || 0;
                }
                
                updateDataStatus();
                // 重新预览以更新图表
                previewIntensityData();
                console.log(`🔄 已更新文件模式范围外光强处理为: ${this.value}${this.value === 'custom' ? ', 值: ' + customIntensityData.custom_intensity_value : ''}`);
            }
        });
    }
    
    // 文件上传模式的自定义值输入框
    if (customIntensityFileInput) {
        customIntensityFileInput.addEventListener('input', function() {
            if (customIntensityData.loaded && customIntensityData.source === 'file' && customIntensityData.outside_range_mode === 'custom') {
                customIntensityData.custom_intensity_value = parseFloat(this.value) || 0;
                updateDataStatus();
                // 重新预览以更新图表
                previewIntensityData();
                console.log(`🔄 已更新文件模式自定义光强值: ${customIntensityData.custom_intensity_value}`);
            }
        });
    }
    
    // 手动输入模式的范围外光强下拉框
    const manualOutsideRangeSelect = document.getElementById('outside-range-mode-manual');
    const customIntensityManualContainer = document.getElementById('custom-intensity-value-manual-container');
    const customIntensityManualInput = document.getElementById('custom-intensity-value-manual');
    
    if (manualOutsideRangeSelect) {
        manualOutsideRangeSelect.addEventListener('change', function() {
            // 处理自定义值输入框的显示与隐藏
            if (this.value === 'custom') {
                if (customIntensityManualContainer) {
                    customIntensityManualContainer.style.display = 'block';
                }
            } else {
                if (customIntensityManualContainer) {
                    customIntensityManualContainer.style.display = 'none';
                }
            }
            
            // 如果有已加载的数据，更新模式并刷新显示
            if (customIntensityData.loaded && customIntensityData.source === 'manual') {
                customIntensityData.outside_range_mode = this.value;
                
                // 如果是自定义模式，保存自定义值
                if (this.value === 'custom' && customIntensityManualInput) {
                    customIntensityData.custom_intensity_value = parseFloat(customIntensityManualInput.value) || 0;
                }
                
                updateDataStatus();
                // 重新预览以更新图表
                previewIntensityData();
                console.log(`🔄 已更新手动输入模式范围外光强处理为: ${this.value}${this.value === 'custom' ? ', 值: ' + customIntensityData.custom_intensity_value : ''}`);
            }
        });
    }
    
    // 手动输入模式的自定义值输入框
    if (customIntensityManualInput) {
        customIntensityManualInput.addEventListener('input', function() {
            if (customIntensityData.loaded && customIntensityData.source === 'manual' && customIntensityData.outside_range_mode === 'custom') {
                customIntensityData.custom_intensity_value = parseFloat(this.value) || 0;
                updateDataStatus();
                // 重新预览以更新图表
                previewIntensityData();
                console.log(`🔄 已更新手动输入模式自定义光强值: ${customIntensityData.custom_intensity_value}`);
            }
        });
    }
}



// 初始化自定义光强分布标签页
function initCustomIntensityTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetTab = e.target.dataset.tab;
            
            // 移除所有活跃状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 激活当前标签
            e.target.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            console.log('🏷️ 切换到标签页:', targetTab);
        });
    });
}

// 初始化文件上传功能
function initFileUploadFeature() {
    const fileInput = document.getElementById('intensity-file-input');
    const uploadBtn = document.getElementById('upload-file-btn');
    
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
}

// 处理文件上传
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📁 开始处理上传文件:', file.name);
    
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();
    
    // 支持的文件格式
    const supportedFormats = ['txt', 'csv', 'json', 'dat', 'xls', 'xlsx', 'mat'];
    
    if (!supportedFormats.includes(fileExtension)) {
        showNotification(`不支持的文件格式: ${fileExtension}。支持的格式: ${supportedFormats.join(', ')}`, 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            parseFileContent(content, fileExtension, file.name);
        } catch (error) {
            console.error('文件读取错误:', error);
            showNotification('文件读取失败: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
}

// 处理输入方式变化
function handleIntensityMethodChange() {
    const methodSelect = document.getElementById('intensity_input_method');
    const customContainer = document.getElementById('custom-intensity-container');
    const formulaContainer = document.getElementById('formula-intensity-params');
    
    // 获取三个控制框
    const exposureTimeWindowControl = document.getElementById('exposure-time-window-control');
    const animationParamsContainer = document.getElementById('dill-1d-animation-params-container');
    const vEvaluationParamsContainer = document.getElementById('dill-1d-v-evaluation-params-container');
    
    if (!methodSelect || !customContainer || !formulaContainer) {
        console.error('❌ 缺少必要的DOM元素');
        return;
    }
    
    const selectedMethod = methodSelect.value;
    console.log(`🔄 光强分布输入方式切换为: ${selectedMethod}`);
    
    if (selectedMethod === 'custom') {
        // 显示自定义输入，隐藏公式参数
        customContainer.style.display = 'block';
        formulaContainer.classList.add('hidden');
        
        // 检查是否同时选择了多段曝光时间累积
        const exposureMethodSelect = document.getElementById('exposure_calculation_method');
        const isCumulative = exposureMethodSelect && exposureMethodSelect.value === 'cumulative';
        
        if (isCumulative) {
            // 同时选择自定义向量和多段曝光时间累计：隐藏所有多余元素
            hideAllUnnecessaryElements();
            // 只在非初始化状态下显示通知
            if (!window.isPageInitializing) {
                showNotification('已切换到自定义向量+多段曝光时间累计模式，所有多余元素已隐藏', 'info');
            }
            console.log('🔒 自定义向量+多段曝光时间累计模式：已隐藏所有多余元素');
        } else {
            // 仅选择自定义向量：隐藏三个控制框和已弹出的面板
            if (exposureTimeWindowControl) {
                exposureTimeWindowControl.style.display = 'none';
                exposureTimeWindowControl.classList.add('hidden-by-custom-vector');
                
                // 同时隐藏已经弹出的曝光时间窗口参数面板
                const exposureTimeParams = document.getElementById('dill_1d_exposure_time_params');
                if (exposureTimeParams) {
                    exposureTimeParams.style.display = 'none';
                    console.log('🔒 自定义向量模式：已隐藏曝光时间窗口参数面板');
                }
            }
            if (animationParamsContainer) {
                animationParamsContainer.style.display = 'none';
                animationParamsContainer.classList.add('hidden-by-custom-vector');
                
                // 同时隐藏已经弹出的1D动画参数面板
                const dill1dParams = document.getElementById('dill_1d_time_params');
                if (dill1dParams) {
                    dill1dParams.style.display = 'none';
                    console.log('🔒 自定义向量模式：已隐藏1D动画参数面板');
                }
                
                // 隐藏1D动画播放区域
                const animationSection = document.getElementById('dill-1d-animation-section');
                if (animationSection) {
                    animationSection.style.display = 'none';
                }
            }
            if (vEvaluationParamsContainer) {
                vEvaluationParamsContainer.style.display = 'none';
                vEvaluationParamsContainer.classList.add('hidden-by-custom-vector');
                
                // 同时隐藏已经弹出的1D V评估参数面板
                const dillVParams = document.getElementById('dill_1d_v_params');
                if (dillVParams) {
                    dillVParams.style.display = 'none';
                    console.log('🔒 自定义向量模式：已隐藏1D V评估参数面板');
                }
                
                // 隐藏1D V评估播放区域
                const vEvaluationSection = document.getElementById('dill-1d-v-evaluation-section');
                if (vEvaluationSection) {
                    vEvaluationSection.style.display = 'none';
                }
            }
            
            showNotification('已切换到自定义向量模式，请上传文件或手动输入光强分布数据。三个控制框已隐藏', 'info');
            console.log('🔒 已隐藏三个控制框：曝光时间窗口控制、1D时间动画控制、1D对比度评估控制');
        }
        
        // 清空图表
        clearAllCharts();
        
    } else {
        // 显示公式参数，隐藏自定义输入
        customContainer.style.display = 'none';
        formulaContainer.classList.remove('hidden');
        
        // 恢复显示三个控制框（如果不是多段曝光时间累计模式）
        const exposureMethodSelect = document.getElementById('exposure_calculation_method');
        const isCumulative = exposureMethodSelect && exposureMethodSelect.value === 'cumulative';
        
        if (!isCumulative) {
            if (exposureTimeWindowControl) {
                exposureTimeWindowControl.style.display = '';
                exposureTimeWindowControl.classList.remove('hidden-by-custom-vector');
                
                // 智能恢复曝光时间窗口面板：根据复选框状态决定
                const enableExposureCheckbox = document.getElementById('enable_exposure_time_window_dill');
                const exposureTimeParams = document.getElementById('dill_1d_exposure_time_params');
                if (enableExposureCheckbox && exposureTimeParams && enableExposureCheckbox.checked) {
                    exposureTimeParams.style.display = 'block';
                    console.log('📋 智能恢复曝光时间窗口面板显示（复选框已勾选）');
                }
            }
            if (animationParamsContainer) {
                animationParamsContainer.style.display = '';
                animationParamsContainer.classList.remove('hidden-by-custom-vector');
                
                // 智能恢复1D动画面板：根据复选框状态决定
                const enable1dCheckbox = document.getElementById('enable_1d_animation_dill');
                const dill1dParams = document.getElementById('dill_1d_time_params');
                if (enable1dCheckbox && dill1dParams && enable1dCheckbox.checked) {
                    dill1dParams.style.display = 'block';
                    console.log('📋 智能恢复1D动画面板显示（复选框已勾选）');
                }
            }
            if (vEvaluationParamsContainer) {
                vEvaluationParamsContainer.style.display = '';
                vEvaluationParamsContainer.classList.remove('hidden-by-custom-vector');
                
                // 智能恢复1D V评估面板：根据复选框状态决定
                const enable1dVCheckbox = document.getElementById('enable_1d_v_evaluation_dill');
                const dillVParams = document.getElementById('dill_1d_v_params');
                if (enable1dVCheckbox && dillVParams && enable1dVCheckbox.checked) {
                    dillVParams.style.display = 'block';
                    console.log('📋 智能恢复1D V评估面板显示（复选框已勾选）');
                }
            }
        }
        
        // 清除自定义数据
        clearCustomIntensityData();
        
        // 清空图表
        clearAllCharts();
        
        // 显示提示
        showNotification('已切换到公式计算模式，所有控制框已恢复显示', 'info');
        console.log('🔓 已恢复显示三个控制框：曝光时间窗口控制、1D时间动画控制、1D对比度评估控制');
    }
}

// 隐藏所有多余元素（当同时选择自定义向量和多段曝光时间累计时）
function hideAllUnnecessaryElements() {
    // 隐藏曝光时间窗口控制和已弹出的面板
    const exposureTimeWindowControl = document.getElementById('exposure-time-window-control');
    if (exposureTimeWindowControl) {
        exposureTimeWindowControl.style.display = 'none';
        exposureTimeWindowControl.classList.add('hidden-by-special-mode');
        
        // 同时隐藏已经弹出的曝光时间窗口参数面板
        const exposureTimeParams = document.getElementById('dill_1d_exposure_time_params');
        if (exposureTimeParams) {
            exposureTimeParams.style.display = 'none';
            console.log('🔒 特殊模式：已隐藏曝光时间窗口参数面板');
        }
    }
    
    // 隐藏1D动画参数容器和已弹出的面板
    const animationParamsContainer = document.getElementById('dill-1d-animation-params-container');
    if (animationParamsContainer) {
        animationParamsContainer.style.display = 'none';
        animationParamsContainer.classList.add('hidden-by-special-mode');
        
        // 同时隐藏已经弹出的1D动画参数面板
        const dill1dParams = document.getElementById('dill_1d_time_params');
        if (dill1dParams) {
            dill1dParams.style.display = 'none';
            console.log('🔒 特殊模式：已隐藏1D动画参数面板');
        }
    }
    
    // 隐藏1D V评估参数容器和已弹出的面板
    const vEvaluationParamsContainer = document.getElementById('dill-1d-v-evaluation-params-container');
    if (vEvaluationParamsContainer) {
        vEvaluationParamsContainer.style.display = 'none';
        vEvaluationParamsContainer.classList.add('hidden-by-special-mode');
        
        // 同时隐藏已经弹出的1D V评估参数面板
        const dillVParams = document.getElementById('dill_1d_v_params');
        if (dillVParams) {
            dillVParams.style.display = 'none';
            console.log('🔒 特殊模式：已隐藏1D V评估参数面板');
        }
    }
    
    // 隐藏动画播放区域
    const animationSections = [
        'dill-1d-animation-section',
        'dill-1d-v-evaluation-section',
        'dill-4d-animation-section',
        'enhanced-dill-4d-animation-section',
        'car-4d-animation-section'
    ];
    
    animationSections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
            section.classList.add('hidden-by-special-mode');
        }
    });
    
    // 隐藏可能打开的模态框
    const modals = [
        'logs-modal',
        'example-files-modal',
        'file-preview-modal',
        'create-file-modal'
    ];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden-by-special-mode');
        }
    });
    
    console.log('🔒 特殊模式：已隐藏所有多余元素（动画区域、模态框等）');
}

// 显示所有必要元素（当退出特殊模式时）
function showAllNecessaryElements() {
    // 获取当前的模式状态
    const intensityMethodSelect = document.getElementById('intensity_input_method');
    const exposureMethodSelect = document.getElementById('exposure_calculation_method');
    
    const isCustomIntensity = intensityMethodSelect && intensityMethodSelect.value === 'custom';
    const isCumulative = exposureMethodSelect && exposureMethodSelect.value === 'cumulative';
    
    // 修改逻辑：只有在标准模式且非自定义强度时才恢复显示
    if (!isCustomIntensity && !isCumulative) {
        // 恢复显示曝光时间窗口控制（仅在标准模式且非自定义强度时）
        const exposureTimeWindowControl = document.getElementById('exposure-time-window-control');
        if (exposureTimeWindowControl && 
            (exposureTimeWindowControl.classList.contains('hidden-by-special-mode') || 
             exposureTimeWindowControl.classList.contains('hidden-by-cumulative-mode'))) {
            exposureTimeWindowControl.style.display = '';
            exposureTimeWindowControl.classList.remove('hidden-by-special-mode');
            exposureTimeWindowControl.classList.remove('hidden-by-cumulative-mode');
        }
        
        // 恢复显示1D动画参数容器（仅在标准模式且非自定义强度时）
        const animationParamsContainer = document.getElementById('dill-1d-animation-params-container');
        if (animationParamsContainer && 
            (animationParamsContainer.classList.contains('hidden-by-special-mode') || 
             animationParamsContainer.classList.contains('hidden-by-cumulative-mode'))) {
            animationParamsContainer.style.display = '';
            animationParamsContainer.classList.remove('hidden-by-special-mode');
            animationParamsContainer.classList.remove('hidden-by-cumulative-mode');
        }
        
        // 恢复显示1D V评估参数容器（仅在标准模式且非自定义强度时）
        const vEvaluationParamsContainer = document.getElementById('dill-1d-v-evaluation-params-container');
        if (vEvaluationParamsContainer && 
            (vEvaluationParamsContainer.classList.contains('hidden-by-special-mode') || 
             vEvaluationParamsContainer.classList.contains('hidden-by-cumulative-mode'))) {
            vEvaluationParamsContainer.style.display = '';
            vEvaluationParamsContainer.classList.remove('hidden-by-special-mode');
            vEvaluationParamsContainer.classList.remove('hidden-by-cumulative-mode');
        }
        
        // 恢复显示动画播放区域（但不主动显示）
        const animationSections = [
            'dill-1d-animation-section',
            'dill-1d-v-evaluation-section',
            'dill-4d-animation-section',
            'enhanced-dill-4d-animation-section',
            'car-4d-animation-section'
        ];
        
        animationSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section && section.classList.contains('hidden-by-special-mode')) {
                // 移除特殊模式标记，但保持隐藏状态（由其他逻辑控制）
                section.classList.remove('hidden-by-special-mode');
            }
        });
        
        // 恢复模态框（移除特殊模式标记，但不主动显示）
        const modals = [
            'logs-modal',
            'example-files-modal',
            'file-preview-modal',
            'create-file-modal'
        ];
        
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && modal.classList.contains('hidden-by-special-mode')) {
                modal.classList.remove('hidden-by-special-mode');
                // 模态框默认保持隐藏，由用户操作显示
            }
        });
        
        console.log('🔓 已退出特殊模式，恢复必要元素的显示');
    }
}

// 初始化标签页功能
function initCustomIntensityTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // 移除所有活动状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 激活选中的标签页
            button.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            console.log(`📄 切换到标签页: ${targetTab}`);
        });
    });
}

// 初始化文件上传功能
function initFileUploadFeature() {
    const uploadZone = document.getElementById('intensity-upload-zone');
    const fileInput = document.getElementById('intensity-file-input');
    
    if (!uploadZone || !fileInput) return;
    
    // 点击上传区域触发文件选择
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 文件选择事件
    fileInput.addEventListener('change', handleFileSelection);
    
    // 拖拽上传事件
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });
    
    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
}

// 处理文件选择
function handleFileSelection(event) {
    const file = event.target.files[0];
    if (file) {
        handleFileUpload(file);
    }
}

// 处理文件上传
function handleFileUpload(file) {
    console.log(`📂 开始处理文件: ${file.name}`);
    
    // 检查文件类型
    const allowedTypes = [
        // 文本类型
        '.txt', '.csv', '.json', '.dat', '.tab', '.tsv', '.asc',
        // 表格类型
        '.xls', '.xlsx', 
        // 数据类型
        '.mat', '.lis', '.log', '.out', '.pro', '.sim', '.fdt',
        // 光刻仿真软件特定格式
        '.pli', '.ldf', '.msk', '.slf', '.int'
    ];
    
    // 安全地获取文件扩展名
    let fileExtension = '.txt'; // 默认扩展名
    if (file && file.name && typeof file.name === 'string' && file.name.includes('.')) {
        const parts = file.name.split('.');
        if (parts.length > 1) {
            fileExtension = '.' + parts[parts.length - 1].toLowerCase();
        }
    }
    
    if (!allowedTypes.includes(fileExtension)) {
        showNotification(`不支持的文件格式: ${fileExtension}。请使用光刻仿真软件支持的格式，如TXT、CSV、DAT等。`, 'error');
        return;
    }
    
    // 检查文件大小（限制为10MB）
    if (file.size > 10 * 1024 * 1024) {
        showNotification('文件过大，请选择小于10MB的文件。', 'error');
        return;
    }
    
    // 根据文件类型选择不同的读取方式
    // 表格文件类型（二进制）
    if (['.xls', '.xlsx'].includes(fileExtension)) {
        // Excel文件需要以二进制方式读取
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                parseExcelFile(e.target.result, file.name);
            } catch (error) {
                console.error('Excel文件解析错误:', error);
                showNotification(`Excel文件解析失败: ${error.message}`, 'error');
            }
        };
        reader.onerror = function() {
            showNotification('Excel文件读取失败，请重试。', 'error');
        };
        reader.readAsArrayBuffer(file);
    } 
    // MATLAB和其他二进制数据文件
    else if (['.mat', '.fdt', '.slf', '.bin'].includes(fileExtension)) {
        // 特殊二进制文件处理
        handleBinaryDataFile(file, fileExtension);
    } 
    // 光刻仿真软件特定格式
    else if (['.pli', '.ldf', '.msk', '.int', '.pro', '.sim'].includes(fileExtension)) {
        // 尝试作为文本文件处理光刻仿真软件格式
        handleLithographySimFile(file, fileExtension);
    }
    // 文本和通用数据文件
    else {
        // 文本文件（TXT, CSV, JSON, DAT, TAB, TSV, LIS, LOG, OUT, ASC等）
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            parseFileContent(content, fileExtension, file.name);
        };
        reader.onerror = function() {
            showNotification('文件读取失败，请重试。', 'error');
        };
        reader.readAsText(file);
    }
}

// 解析文件内容
function parseFileContent(content, fileExtension, fileName) {
    console.log(`🔍 解析 ${fileExtension} 文件内容`);
    
    try {
        let x = [];
        let intensity = [];
        
        switch (fileExtension) {
            case '.txt':
                ({ x, intensity } = parseTxtContent(content));
                break;
            case '.csv':
                ({ x, intensity } = parseCsvContent(content));
                break;
            case '.json':
                ({ x, intensity } = parseJsonContent(content));
                break;
            case '.dat':
                ({ x, intensity } = parseDatContent(content));
                break;
            case '.xls':
            case '.xlsx':
                ({ x, intensity } = parseExcelContent(content, fileExtension));
                break;
            case '.mat':
                ({ x, intensity } = parseMatContent(content));
                break;
        }
        
        // 验证数据
        if (!validateIntensityData(x, intensity)) {
            return;
        }
        
            // 获取用户选择的数据范围外光强处理方式
    const outsideRangeMode = document.getElementById('outside-range-mode-file').value;
    
    // 存储数据
    customIntensityData = {
        ...customIntensityData, // 保留已有属性
        x: x,
        intensity: intensity,
        loaded: true,
        source: 'file',
        fileName: fileName,
        outside_range_mode: outsideRangeMode, // 保存用户选择的数据范围外光强处理方式
        auto_calculated_I_avg: calculateAutoI_avg(intensity) // 自动计算平均光强
    };
    
    // 设置标志表示未点击预览按钮
    window.isPreviewDataButtonClicked = false;
    
    // 隐藏数据状态（用户要求直到点击预览按钮前不显示数据状态）
    const statusDiv = document.getElementById('intensity-data-status');
    if (statusDiv) {
        statusDiv.style.display = 'none';
    }
    
    // 不在这里立即预览数据，而是显示单位选择提示
    showNotification(`成功加载文件: ${fileName}，包含 ${x.length} 个数据点。请确认坐标单位后点击"预览数据"按钮。`, 'success');
    
    // 添加一个预览按钮
    addPreviewButton();
        
    } catch (error) {
        console.error('❌ 文件解析错误:', error);
        showNotification(`文件解析失败: ${error.message}`, 'error');
    }
}

// 解析TXT文件内容
function parseTxtContent(content) {
    // 分割行并过滤掉空行和注释行
    const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line !== '' && !line.startsWith('#'));
    
    const x = [];
    const intensity = [];
    
    if (lines.length === 0) {
        throw new Error('TXT文件中没有找到有效的数据行（排除注释行）。');
    }
    
    // 尝试检测格式 - 使用第一行有效数据
    const firstLine = lines[0].trim();
    const parts = firstLine.split(/\s+/);
    
    // 尝试查找可能的标题行
    if (firstLine.toLowerCase().includes('x') || firstLine.toLowerCase().includes('intensity') || 
        firstLine.toLowerCase().includes('position') || firstLine.toLowerCase().includes('value')) {
        console.log('检测到可能的标题行:', firstLine);
        // 跳过第一行
        const dataLines = lines.slice(1);
        if (dataLines.length > 0) {
            // 再次检查第二行（第一个数据行）的格式
            const dataFirstLine = dataLines[0].trim();
            const dataParts = dataFirstLine.split(/\s+/);
            
            if (dataParts.length >= 2 && !isNaN(parseFloat(dataParts[0])) && !isNaN(parseFloat(dataParts[1]))) {
                // 处理两列数据格式
                for (let i = 0; i < dataLines.length; i++) {
                    const line = dataLines[i];
                    const parts = line.split(/\s+/);
                    if (parts.length >= 2) {
                        const xVal = parseFloat(parts[0]);
                        const intensityVal = parseFloat(parts[1]);
                        if (!isNaN(xVal) && !isNaN(intensityVal)) {
                            x.push(xVal);
                            intensity.push(intensityVal);
                        } else {
                            console.warn(`第 ${i + 2} 行包含无效数值，已跳过: "${line}"`);
                        }
                    } else {
                        console.warn(`第 ${i + 2} 行格式不正确，已跳过: "${line}"`);
                    }
                }
            } else if (dataParts.length === 1 && !isNaN(parseFloat(dataParts[0]))) {
                // 处理单列数据格式
                for (let i = 0; i < dataLines.length; i++) {
                    const intensityVal = parseFloat(dataLines[i].trim());
                    if (!isNaN(intensityVal)) {
                        x.push(i); // 使用索引作为x坐标
                        intensity.push(intensityVal);
                    } else {
                        console.warn(`第 ${i + 2} 行包含无效数值，已跳过: "${dataLines[i]}"`);
                    }
                }
            }
        }
    } else if (parts.length >= 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
        console.log('检测到两列格式的TXT文件: x intensity');
        // 格式：x intensity
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.split(/\s+/);
            if (parts.length >= 2) {
                const xVal = parseFloat(parts[0]);
                const intensityVal = parseFloat(parts[1]);
                if (!isNaN(xVal) && !isNaN(intensityVal)) {
                    x.push(xVal);
                    intensity.push(intensityVal);
                } else {
                    console.warn(`第 ${i + 1} 行包含无效数值，已跳过: "${line}"`);
                }
            } else {
                console.warn(`第 ${i + 1} 行格式不正确，已跳过: "${line}"`);
            }
        }
    } else if (parts.length === 1 && !isNaN(parseFloat(parts[0]))) {
        console.log('检测到单列格式的TXT文件: intensity only');
        // 格式：仅intensity值
        for (let i = 0; i < lines.length; i++) {
            const intensityVal = parseFloat(lines[i].trim());
            if (!isNaN(intensityVal)) {
                x.push(i); // 使用索引作为x坐标
                intensity.push(intensityVal);
            } else {
                console.warn(`第 ${i + 1} 行包含无效数值，已跳过: "${lines[i]}"`);
            }
        }
    } else {
        throw new Error('无法识别的TXT文件格式。请使用"x intensity"或"intensity"格式。注释行请以#开头。');
    }
    
    if (x.length === 0) {
        throw new Error('TXT文件中没有找到有效的数值数据。');
    }
    
    return { x, intensity };
}

// 解析DAT文件内容
function parseDatContent(content) {
    // DAT文件通常与TXT类似，但可能有更多注释和头信息
    // 分割行并过滤掉空行
    const lines = content.split('\n').map(line => line.trim());
    
    // 收集注释和元数据（以#开头的行）
    const comments = lines.filter(line => line.startsWith('#')).map(line => line.substring(1).trim());
    console.log('DAT文件元数据/注释:', comments);
    
    // 过滤有效数据行
    const dataLines = lines.filter(line => line !== '' && !line.startsWith('#'));
    
    const x = [];
    const intensity = [];
    
    if (dataLines.length === 0) {
        throw new Error('DAT文件中没有找到有效的数据行。');
    }
    
    // 尝试检测分隔符
    let separator = /\s+/;  // 默认为空白字符
    const possibleSeparators = [/\s+/, ',', ';', '\t', '|'];
    
    for (const sep of possibleSeparators) {
        const parts = dataLines[0].split(sep);
        if (parts.length > 1) {
            separator = sep;
            console.log(`检测到分隔符: "${sep}"`);
            break;
        }
    }
    
    // 尝试检测列位置
    let xColumnIndex = 0;
    let intensityColumnIndex = 1;
    
    // 查看注释中是否有列信息
    for (const comment of comments) {
        const lowerComment = comment.toLowerCase();
        if (lowerComment.includes('column') || lowerComment.includes('列') || lowerComment.includes('field')) {
            console.log('从注释中检测列信息:', comment);
            
            // 尝试查找列位置指示
            if (lowerComment.includes('x') || lowerComment.includes('position') || lowerComment.includes('distance')) {
                // 例如 "Column 1: X Position"
                const match = lowerComment.match(/column\s*(\d+)[:\s]*.*?(x|pos|position|distance)/i);
                if (match && match[1]) {
                    xColumnIndex = parseInt(match[1]) - 1;  // 转为0索引
                    console.log(`从注释中找到X列索引: ${xColumnIndex}`);
                }
            }
            
            if (lowerComment.includes('intensity') || lowerComment.includes('value') || lowerComment.includes('power')) {
                // 例如 "Column 2: Intensity"
                const match = lowerComment.match(/column\s*(\d+)[:\s]*.*?(intensity|value|power)/i);
                if (match && match[1]) {
                    intensityColumnIndex = parseInt(match[1]) - 1;  // 转为0索引
                    console.log(`从注释中找到强度列索引: ${intensityColumnIndex}`);
                }
            }
        }
    }
    
    // 检查第一行是否为表头
    const firstLine = dataLines[0];
    const headerParts = firstLine.split(separator);
    
    let startIndex = 0;
    
    if (headerParts.length > 1) {
        // 检查是否为表头（如果包含非数字内容）
        const containsText = headerParts.some(part => isNaN(parseFloat(part)) && part.trim() !== '');
        
        if (containsText) {
            console.log('检测到表头:', headerParts);
            startIndex = 1;
            
            // 尝试从表头确定列位置
            for (let i = 0; i < headerParts.length; i++) {
                const header = headerParts[i].toLowerCase().trim();
                if (header.includes('x') || header.includes('position') || header.includes('distance')) {
                    xColumnIndex = i;
                    console.log(`从表头找到X列: "${headerParts[i]}" (索引 ${i})`);
                } else if (header.includes('intensity') || header.includes('value') || header.includes('power')) {
                    intensityColumnIndex = i;
                    console.log(`从表头找到强度列: "${headerParts[i]}" (索引 ${i})`);
                }
            }
        }
    }
    
    // 处理数据行
    for (let i = startIndex; i < dataLines.length; i++) {
        const line = dataLines[i];
        const parts = line.split(separator);
        
        if (parts.length > Math.max(xColumnIndex, intensityColumnIndex)) {
            const xVal = parseFloat(parts[xColumnIndex]);
            const intensityVal = parseFloat(parts[intensityColumnIndex]);
            
            if (!isNaN(xVal) && !isNaN(intensityVal)) {
                x.push(xVal);
                intensity.push(intensityVal);
            } else {
                console.warn(`第 ${i + 1} 行数值无效，已跳过: "${line}"`);
            }
        } else {
            console.warn(`第 ${i + 1} 行列数不足，已跳过: "${line}"`);
        }
    }
    
    if (x.length === 0) {
        throw new Error('DAT文件中没有找到有效的数据。');
    }
    
    return { x, intensity };
}

// 解析Excel文件 (XLS/XLSX)
function parseExcelFile(arrayBuffer, fileName) {
    try {
        // 显示加载状态
        showNotification('正在解析Excel文件...', 'info');
        
        // 使用XLSX库解析Excel文件
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        
        // 获取第一个工作表
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) {
            throw new Error('Excel文件不包含任何工作表');
        }
        
        console.log('Excel工作表名称:', workbook.SheetNames);
        console.log('使用第一个工作表:', workbook.SheetNames[0]);
        
        // 将工作表转换为JSON (带表头)
        const headerOptions = {header: 1, raw: true};
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, headerOptions);
        
        if (jsonData.length === 0) {
            throw new Error('Excel工作表为空');
        }
        
        console.log('Excel数据行数:', jsonData.length);
        console.log('第一行数据:', jsonData[0]);
        
        // 查找适合的x和intensity列
        let xColumnIndex = 0;
        let intensityColumnIndex = 1;
        let startRow = 0;
        
        // 检查是否有标题行 - 第一行包含文本而不是数值
        if (jsonData[0] && jsonData[0].some(cell => typeof cell === 'string')) {
            console.log('检测到可能的Excel标题行:', jsonData[0]);
            startRow = 1;
            
            // 查找可能的x和intensity列
            for (let i = 0; i < jsonData[0].length; i++) {
                if (!jsonData[0][i]) continue; // 跳过空单元格
                
                const header = String(jsonData[0][i]).toLowerCase();
                if (header.includes('x') || header.includes('pos') || header.includes('dist')) {
                    xColumnIndex = i;
                    console.log(`找到X坐标列: "${jsonData[0][i]}" (索引 ${i})`);
                } else if (header.includes('int') || header.includes('value') || header.includes('y') || 
                           header.includes('power') || header.includes('signal')) {
                    intensityColumnIndex = i;
                    console.log(`找到强度列: "${jsonData[0][i]}" (索引 ${i})`);
                }
            }
        } else if (jsonData[0] && jsonData[0].length > 1) {
            // 如果没有标题行但有多列，检查最适合作为x和intensity的列
            console.log('未检测到标题行，使用默认列布局');
            
            // 默认使用前两列作为x和intensity
            xColumnIndex = 0;
            intensityColumnIndex = 1;
        } else if (jsonData[0] && jsonData[0].length === 1) {
            // 如果只有一列数据，假设是intensity，用行号作为x
            console.log('检测到单列数据，将使用行号作为x坐标');
            xColumnIndex = -1; // 特殊标记，表示使用行号
            intensityColumnIndex = 0;
        }
        
        // 提取数据
        const x = [];
        const intensity = [];
        
        // 处理数据行
        for (let i = startRow; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue; // 跳过空行
            
            let xVal, intensityVal;
            
            // 处理x值 - 如果xColumnIndex为-1，使用行号作为x坐标
            if (xColumnIndex === -1) {
                xVal = i - startRow;
            } else if (row[xColumnIndex] !== undefined) {
                xVal = parseFloat(row[xColumnIndex]);
            } else {
                continue; // 跳过没有x值的行
            }
            
            // 处理强度值
            if (row[intensityColumnIndex] !== undefined) {
                intensityVal = parseFloat(row[intensityColumnIndex]);
            } else {
                continue; // 跳过没有强度值的行
            }
            
            // 检查是否为有效数值
            if (!isNaN(xVal) && !isNaN(intensityVal)) {
                x.push(xVal);
                intensity.push(intensityVal);
            } else {
                console.warn(`Excel行 ${i + 1} 包含无效数值，已跳过`);
            }
        }
        
        if (x.length === 0) {
            throw new Error('Excel文件中未找到有效的数值数据');
        }
        
        // 存储并应用数据
        customIntensityData = {
            x: x,
            intensity: intensity,
            loaded: true,
            source: 'excel',
            fileName: fileName,
            auto_calculated_I_avg: calculateAutoI_avg(intensity) // 自动计算平均光强
        };
        
        // 更新状态显示
        updateDataStatus();
        
        console.log(`✅ 成功从Excel文件中提取 ${x.length} 个数据点`);
        showNotification(`成功加载Excel文件: ${fileName}，包含 ${x.length} 个数据点。请确认坐标单位后点击"预览数据"按钮。`, 'success');
        
        // 添加预览按钮
        addPreviewButton();
        
    } catch (error) {
        console.error('❌ Excel文件解析错误:', error);
        showNotification(`Excel文件解析失败: ${error.message}`, 'error');
    }
}

// 处理二进制数据文件 (MAT, FDT, SLF, BIN等)
function handleBinaryDataFile(file, fileExtension) {
    // 显示正在处理的通知
    showNotification(`正在尝试处理${fileExtension}格式文件...`, 'info');
    
    if (fileExtension === '.mat') {
        // MATLAB文件特殊处理
        showNotification('MATLAB文件需要服务器端支持，请将MAT文件导出为CSV或TXT格式后再上传', 'info');
        
        // 创建一个情境温和的通知，帮助用户转换MAT文件
        setTimeout(() => {
            showNotification('提示: 在MATLAB中可使用 "writematrix(data, \'data.csv\')" 命令导出数据', 'info');
        }, 3000);
        
        // 尝试通过FileReader读取文件，但只展示基本信息
        try {
            const reader = new FileReader();
            reader.onload = function(e) {
                // 检查MAT文件头部标识
                const headerBytes = new Uint8Array(e.target.result.slice(0, 124));
                const header = new TextDecoder().decode(headerBytes);
                
                if (header.includes('MATLAB')) {
                    console.log('确认为MATLAB文件，版本信息:', header.substring(0, 124));
                    showNotification('已确认为MATLAB文件，但需要先转换为CSV或TXT格式', 'info');
                } else {
                    showNotification('此文件可能不是标准的MATLAB格式，请检查', 'warning');
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('MATLAB文件读取错误:', error);
        }
    } else if (['.fdt', '.slf'].includes(fileExtension)) {
        // 尝试处理光刻仿真软件的二进制数据文件
        showNotification(`${fileExtension.toUpperCase().substring(1)}格式是光刻仿真二进制格式，请导出为CSV或TXT格式`, 'info');
        
        setTimeout(() => {
            showNotification('提示: 大多数光刻仿真软件都支持导出ASCII或CSV数据格式', 'info');
        }, 3000);
    } else {
        // 通用二进制文件处理
        showNotification('二进制数据文件需要特定解析器，请导出为文本格式后再上传', 'warning');
    }
}

// 处理光刻仿真软件特定格式文件 (PLI, LDF, MSK, INT, PRO, SIM等)
function handleLithographySimFile(file, fileExtension) {
    // 尝试作为文本文件读取
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        
        // 首先检查文件是否为文本格式
        if (isBinaryContent(content)) {
            showNotification(`${fileExtension}文件似乎是二进制格式，请将其导出为文本格式`, 'warning');
            return;
        }
        
        // 尝试解析光刻仿真软件输出
        try {
            parseLithographySimulationFile(content, fileExtension, file.name);
        } catch (error) {
            console.error(`光刻仿真文件解析错误:`, error);
            // 尝试作为普通文本文件解析
            try {
                console.log('尝试作为通用文本文件解析...');
                parseFileContent(content, '.txt', file.name);
            } catch (fallbackError) {
                showNotification(`无法解析文件: ${error.message}`, 'error');
            }
        }
    };
    
    reader.onerror = function() {
        showNotification('文件读取失败，请重试', 'error');
    };
    
    reader.readAsText(file);
}

// 检查内容是否为二进制
function isBinaryContent(content) {
    // 检查前1000个字符
    const sampleSize = Math.min(1000, content.length);
    const sample = content.substring(0, sampleSize);
    
    // 计算非可打印字符的比例
    let nonPrintableCount = 0;
    for (let i = 0; i < sample.length; i++) {
        const charCode = sample.charCodeAt(i);
        // 排除常见的控制字符
        if ((charCode < 32 || charCode > 126) && charCode !== 9 && charCode !== 10 && charCode !== 13) {
            nonPrintableCount++;
        }
    }
    
    // 如果非可打印字符超过5%，可能是二进制文件
    return (nonPrintableCount / sampleSize) > 0.05;
}

// 解析光刻仿真软件的特定格式文件
function parseLithographySimulationFile(content, fileExtension, fileName) {
    console.log(`开始解析光刻仿真文件: ${fileName} (${fileExtension})`);
    
    // 根据文件类型选择不同的解析策略
    let result;
    switch(fileExtension) {
        case '.pli': // PROLITH格式
            result = parseProlithFile(content);
            break;
        case '.ldf': // Lithography格式
            result = parseLdfFile(content);
            break;
        case '.msk': // 掩模格式
            result = parseMaskFile(content);
            break;
        case '.int': // Intensity格式
            result = parseIntensityFile(content);
            break;
        case '.pro': // 工艺文件
        case '.sim': // 仿真文件
            result = parseSimProcessFile(content);
            break;
        default:
            // 尝试通用解析
            result = parseGenericSimFile(content);
    }
    
    if (!result || !result.x || !result.intensity || result.x.length === 0) {
        throw new Error(`未能从${fileExtension}文件中提取有效数据`);
    }
    
    // 获取用户选择的数据范围外光强处理方式
    const outsideRangeMode = document.getElementById('outside-range-mode-file').value;
    console.log(`🔄 光刻仿真文件解析成功，使用范围外光强模式: ${outsideRangeMode}`);
    
    // 提取成功，应用数据
    customIntensityData = {
        x: result.x,
        intensity: result.intensity,
        loaded: true,
        source: fileExtension.substring(1), // 去掉点号
        fileName: fileName,
        outside_range_mode: outsideRangeMode, // 保存用户选择的数据范围外光强处理方式
        auto_calculated_I_avg: calculateAutoI_avg(result.intensity) // 自动计算平均光强
    };
    
    // 更新UI
    updateDataStatus();
    previewIntensityData();
    
    showNotification(`成功从${fileExtension.toUpperCase().substring(1)}文件中提取${result.x.length}个数据点`, 'success');
}

// 解析PROLITH格式文件
function parseProlithFile(content) {
    // PROLITH通常使用特定的标记和格式
    const lines = content.split('\n').map(line => line.trim());
    
    // 查找数据区域开始的标记
    let dataStartIndex = -1;
    let xColumn = 0;
    let intensityColumn = 1;
    
    // 查找标题行或数据开始标记
    for (let i = 0; i < lines.length; i++) {
        // 查找可能的列头
        if (lines[i].toLowerCase().includes('intensity') || 
            lines[i].toLowerCase().includes('position') || 
            lines[i].toLowerCase().includes('data')) {
            
            // 分析可能的表头
            const parts = lines[i].split(/[\s,;:]+/).filter(p => p.trim() !== '');
            
            for (let j = 0; j < parts.length; j++) {
                const part = parts[j].toLowerCase();
                if (part.includes('x') || part.includes('pos') || part.includes('dist')) {
                    xColumn = j;
                } else if (part.includes('int') || part.includes('amp') || part.includes('value')) {
                    intensityColumn = j;
                }
            }
            
            dataStartIndex = i + 1; // 数据从下一行开始
            console.log(`在PROLITH文件中找到数据开始行: ${i+1}, X列: ${xColumn}, 强度列: ${intensityColumn}`);
            break;
        }
        
        // 查找数据部分开始的标记
        if (lines[i].includes('BEGIN_DATA') || lines[i].includes('DATA_START')) {
            dataStartIndex = i + 1;
            console.log(`在PROLITH文件中找到数据标记: ${lines[i]}, 从行 ${i+1} 开始`);
            break;
        }
    }
    
    // 如果没有找到明确的数据开始标记，尝试查找第一个包含数值数据的行
    if (dataStartIndex === -1) {
        for (let i = 0; i < lines.length; i++) {
            const parts = lines[i].split(/[\s,;:]+/).filter(p => p.trim() !== '');
            if (parts.length >= 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
                dataStartIndex = i;
                console.log(`在PROLITH文件中找到第一行数值数据: ${i+1}`);
                break;
            }
        }
    }
    
    // 如果仍然没有找到数据，抛出错误
    if (dataStartIndex === -1) {
        throw new Error('无法在PROLITH文件中找到有效数据区域');
    }
    
    // 提取数据
    const x = [];
    const intensity = [];
    
    for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 检查数据区域结束标记
        if (line.includes('END_DATA') || line.includes('DATA_END')) {
            break;
        }
        
        // 跳过空行
        if (line === '') continue;
        
        // 尝试多种分隔符
        const parts = line.split(/[\s,;:]+/).filter(p => p.trim() !== '');
        
        // 确保有足够的数据列
        if (parts.length <= Math.max(xColumn, intensityColumn)) continue;
        
        const xVal = parseFloat(parts[xColumn]);
        const intVal = parseFloat(parts[intensityColumn]);
        
        if (!isNaN(xVal) && !isNaN(intVal)) {
            x.push(xVal);
            intensity.push(intVal);
        }
    }
    
    return { x, intensity };
}

// 解析LDF (Lithography Data Format) 文件
function parseLdfFile(content) {
    // LDF格式通常有特定的结构，首先搜索数据区域
    const lines = content.split('\n').map(line => line.trim());
    let dataFound = false;
    const x = [];
    const intensity = [];
    
    // 查找数据区域和列标识
    let xColumn = 0;
    let intensityColumn = 1;
    
    // 首先查找数据格式定义
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        
        // 查找列定义
        if (line.includes('column') || line.includes('field') || line.includes('format')) {
            const parts = line.split(/[\s:=]+/);
            for (let j = 0; j < parts.length; j++) {
                if (parts[j].includes('x') || parts[j].includes('pos')) {
                    // 尝试提取列号
                    const match = /(\d+)/.exec(parts[j+1] || '');
                    if (match) {
                        xColumn = parseInt(match[1]) - 1; // 转换为0-索引
                    }
                } else if (parts[j].includes('int') || parts[j].includes('value')) {
                    // 尝试提取列号
                    const match = /(\d+)/.exec(parts[j+1] || '');
                    if (match) {
                        intensityColumn = parseInt(match[1]) - 1; // 转换为0-索引
                    }
                }
            }
        }
        
        // 查找数据开始标记
        if (line.includes('begin data') || line.includes('data_start') || line.includes('data:')) {
            dataFound = true;
            continue;
        }
        
        // 如果找到了数据区域，开始处理数据行
        if (dataFound) {
            // 检查数据区域结束
            if (line.includes('end data') || line.includes('data_end')) {
                break;
            }
            
            // 跳过空行和注释行
            if (line === '' || line.startsWith('#') || line.startsWith('//')) {
                continue;
            }
            
            // 解析数据行
            const parts = line.split(/[\s,;:]+/).filter(p => p.trim() !== '');
            
            // 确保有足够的列
            if (parts.length <= Math.max(xColumn, intensityColumn)) {
                continue;
            }
            
            const xVal = parseFloat(parts[xColumn]);
            const intVal = parseFloat(parts[intensityColumn]);
            
            if (!isNaN(xVal) && !isNaN(intVal)) {
                x.push(xVal);
                intensity.push(intVal);
            }
        } else {
            // 如果还没找到数据区域，检查这行是否包含数值数据
            // 这是为了处理没有明确数据区域标记的文件
            const parts = line.split(/[\s,;:]+/).filter(p => p.trim() !== '');
            
            if (parts.length >= 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
                const xVal = parseFloat(parts[xColumn]);
                const intVal = parseFloat(parts[intensityColumn]);
                
                if (!isNaN(xVal) && !isNaN(intVal)) {
                    x.push(xVal);
                    intensity.push(intVal);
                }
            }
        }
    }
    
    // 如果没有找到任何数据，尝试按常规文本文件解析
    if (x.length === 0) {
        return parseGenericSimFile(content);
    }
    
    return { x, intensity };
}

// 解析掩模文件 (.msk)
function parseMaskFile(content) {
    // 掩模文件通常包含多种信息，需要提取与位置和强度相关的部分
    // 这里使用简化的逻辑，假设掩模文件中包含位置和强度数据
    return parseGenericSimFile(content);
}

// 解析强度文件 (.int)
function parseIntensityFile(content) {
    // 强度文件通常是直接包含光强分布数据的专用格式
    // 通常格式比较简单，一行对应一个数据点
    const lines = content.split('\n').map(line => line.trim());
    const x = [];
    const intensity = [];
    
    // 查找可能的数据行
    for (let i = 0; i < lines.length; i++) {
        // 跳过空行和注释行
        if (lines[i] === '' || lines[i].startsWith('#') || lines[i].startsWith('//')) {
            continue;
        }
        
        // 假设每行都是一个数据点，格式为 "x intensity" 或 "intensity"
        const parts = lines[i].split(/[\s,;:]+/).filter(p => p.trim() !== '');
        
        if (parts.length >= 2) {
            // 两列或以上：假设第一列是x，第二列是强度
            const xVal = parseFloat(parts[0]);
            const intVal = parseFloat(parts[1]);
            
            if (!isNaN(xVal) && !isNaN(intVal)) {
                x.push(xVal);
                intensity.push(intVal);
            }
        } else if (parts.length === 1) {
            // 单列：假设仅包含强度值，使用索引作为位置
            const intVal = parseFloat(parts[0]);
            if (!isNaN(intVal)) {
                x.push(i);
                intensity.push(intVal);
            }
        }
    }
    
    if (x.length === 0) {
        throw new Error('未能从强度文件中提取有效数据');
    }
    
    return { x, intensity };
}

// 解析工艺或仿真文件 (.pro, .sim)
function parseSimProcessFile(content) {
    // 这些文件可能包含多种信息，尝试提取强度相关数据
    return parseGenericSimFile(content);
}

// 通用仿真文件解析
function parseGenericSimFile(content) {
    // 通用解析逻辑，适用于大多数仿真软件输出的文本格式
    
    // 首先分割成行
    const lines = content.split('\n').map(line => line.trim());
    const x = [];
    const intensity = [];
    
    // 尝试检测列的位置
    let xColumn = 0;
    let intensityColumn = 1;
    let dataStartLine = 0;
    
    // 检查前几行是否包含列标题
    for (let i = 0; i < Math.min(20, lines.length); i++) {
        const line = lines[i].toLowerCase();
        
        // 跳过空行
        if (line === '') continue;
        
        // 检查是否为注释或标题行
        if (line.startsWith('#') || line.startsWith('//') || line.startsWith('!')) {
            // 在注释中查找列指示
            if (line.includes('x') || line.includes('pos') || line.includes('dist') || 
                line.includes('int') || line.includes('val') || line.includes('amp')) {
                
                const words = line.split(/[\s:,;=]+/).filter(w => w !== '');
                
                for (let j = 0; j < words.length; j++) {
                    if (words[j].includes('x') || words[j].includes('pos') || words[j].includes('dist')) {
                        xColumn = j;
                    } else if (words[j].includes('int') || words[j].includes('val') || words[j].includes('amp')) {
                        intensityColumn = j;
                    }
                }
                
                dataStartLine = i + 1;
            }
            continue;
        }
        
        // 检查非注释行是否包含可能的列标题
        if (!isNaN(parseFloat(line.split(/[\s,;:]+/)[0]))) {
            // 这似乎是第一行数据
            dataStartLine = i;
            break;
        } else {
            // 这可能是列标题
            const parts = line.split(/[\s,;:]+/).filter(p => p !== '');
            
            for (let j = 0; j < parts.length; j++) {
                if (parts[j].includes('x') || parts[j].includes('pos') || parts[j].includes('dist')) {
                    xColumn = j;
                } else if (parts[j].includes('int') || parts[j].includes('val') || parts[j].includes('amp')) {
                    intensityColumn = j;
                }
            }
            
            dataStartLine = i + 1;
        }
    }
    
    // 处理数据行
    for (let i = dataStartLine; i < lines.length; i++) {
        const line = lines[i];
        
        // 跳过空行和注释行
        if (line === '' || line.startsWith('#') || line.startsWith('//') || line.startsWith('!')) {
            continue;
        }
        
        // 尝试多种分隔符
        const parts = line.split(/[\s,;:]+/).filter(p => p.trim() !== '');
        
        // 确保有足够的列
        if (parts.length <= Math.max(xColumn, intensityColumn)) {
            continue;
        }
        
        // 提取数值
        const xVal = parseFloat(parts[xColumn]);
        const intVal = parseFloat(parts[intensityColumn]);
        
        if (!isNaN(xVal) && !isNaN(intVal)) {
            x.push(xVal);
            intensity.push(intVal);
        }
    }
    
    // 如果没有成功提取数据，尝试最简单的假设：前两列是x和强度
    if (x.length === 0) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 跳过空行和注释行
            if (line === '' || line.startsWith('#') || line.startsWith('//') || line.startsWith('!')) {
                continue;
            }
            
            const parts = line.split(/[\s,;:]+/).filter(p => p.trim() !== '');
            
            if (parts.length >= 2) {
                const xVal = parseFloat(parts[0]);
                const intVal = parseFloat(parts[1]);
                
                if (!isNaN(xVal) && !isNaN(intVal)) {
                    x.push(xVal);
                    intensity.push(intVal);
                }
            }
        }
    }
    
    return { x, intensity };
}

// 解析CSV文件内容
function parseCsvContent(content) {
    // 支持Windows (CRLF)、Mac (CR) 和 Unix (LF) 格式的换行符
    const normalizedContent = content.replace(/\r\n|\r|\n/g, '\n');
    const lines = normalizedContent.split('\n').filter(line => line.trim() !== '');
    const x = [];
    const intensity = [];
    
    if (lines.length === 0) {
        throw new Error('CSV文件为空或只包含空行。');
    }
    
    // 检测分隔符：CSV文件可能使用逗号、分号、制表符等
    let separator = ',';  // 默认使用逗号分隔
    const possibleSeparators = [',', ';', '\t', '|', ':'];
    const countSeparators = {};
    
    // 统计第一行中每种分隔符的出现次数
    for (const sep of possibleSeparators) {
        countSeparators[sep] = (lines[0].match(new RegExp(sep === '\t' ? '\t' : sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    }
    
    // 选择出现次数最多的分隔符
    let maxCount = 0;
    for (const sep in countSeparators) {
        if (countSeparators[sep] > maxCount) {
            maxCount = countSeparators[sep];
            separator = sep;
        }
    }
    
    console.log(`检测到CSV分隔符: "${separator === '\t' ? 'Tab' : separator}"`);
    
    // 处理带引号的CSV：例如 "value 1","value, with, commas"
    function parseCSVLine(line, sep) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    // 处理双引号转义 ("") 作为一个引号字符
                    current += '"';
                    i++; // 跳过下一个引号
                } else {
                    // 切换引号状态
                    inQuotes = !inQuotes;
                }
            } else if (char === sep && !inQuotes) {
                // 遇到分隔符且不在引号内
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // 添加最后一个字段
        result.push(current.trim());
        
        return result;
    }
    
    // 检查第一行是否为标题行
    const firstLine = lines[0].trim();
    const firstParts = parseCSVLine(firstLine, separator);
    
    let startIndex = 0;
    let xColumnIndex = 0;
    let intensityColumnIndex = 1;
    
    // 检测标题行和列位置
    // 如果第一行有两个或更多的字段，并且第一个字段不是数字
    const firstPartIsNotNumber = isNaN(parseFloat(firstParts[0].replace(/^["']|["']$/g, '')));
    
    if (firstParts.length >= 2 && (firstPartIsNotNumber || 
        firstParts.some(p => p.toLowerCase().includes('x') || 
                         p.toLowerCase().includes('position') || 
                         p.toLowerCase().includes('intensity')))) {
        console.log('检测到CSV标题行:', firstParts);
        startIndex = 1;
        
        // 尝试找到正确的列
        for (let i = 0; i < firstParts.length; i++) {
            // 移除可能的引号
            const header = firstParts[i].toLowerCase().replace(/^["']|["']$/g, '');
            
            // 多种可能的列名
            if (header.includes('x') || header.includes('position') || header.includes('pos') || 
                header.includes('distance') || header.includes('location') || header === 'pos' || 
                header === 'x' || header === 'px') {
                xColumnIndex = i;
                console.log(`找到X坐标列: ${firstParts[i]} (索引 ${i})`);
            } else if (header.includes('intensity') || header.includes('int') || header.includes('value') || 
                       header.includes('y') || header.includes('power') || header.includes('signal') || 
                       header === 'i' || header === 'y' || header === 'val') {
                intensityColumnIndex = i;
                console.log(`找到强度列: ${firstParts[i]} (索引 ${i})`);
            }
        }
    } else {
        console.log('未检测到CSV标题行，使用默认列顺序 (x, intensity)');
    }
    
    // 解析数据行
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        
        const parts = parseCSVLine(line, separator);
        
        if (parts.length >= Math.max(xColumnIndex + 1, intensityColumnIndex + 1)) {
            // 移除引号 (如 "123" => 123)
            const xStr = parts[xColumnIndex].replace(/^["']|["']$/g, '');
            const intensityStr = parts[intensityColumnIndex].replace(/^["']|["']$/g, '');
            
            const xVal = parseFloat(xStr);
            const intensityVal = parseFloat(intensityStr);
            
            if (!isNaN(xVal) && !isNaN(intensityVal)) {
                x.push(xVal);
                intensity.push(intensityVal);
            } else {
                console.warn(`第 ${i + 1} 行包含无效数值，已跳过: "${line}"`);
            }
        } else {
            console.warn(`第 ${i + 1} 行列数不够，已跳过: "${line}"`);
        }
    }
    
    if (x.length === 0) {
        throw new Error('CSV文件中未找到有效的数值数据。请确保包含数值型的坐标和强度列。');
    }
    
    console.log(`成功解析CSV文件: ${x.length} 个数据点，X范围: [${Math.min(...x)}, ${Math.max(...x)}], 强度范围: [${Math.min(...intensity)}, ${Math.max(...intensity)}]`);
    return { x, intensity };
}

// 解析JSON文件内容
function parseJsonContent(content) {
    try {
        const data = JSON.parse(content);
        
        // 检查是否为数组格式: [{"x": value, "intensity": value}, ...]
        if (Array.isArray(data)) {
            console.log('检测到数组格式的JSON文件');
            const x = [];
            const intensity = [];
            
            // 检查数组元素的格式，适应不同的字段名
            if (data.length > 0) {
                const firstItem = data[0] || {};
                const keys = Object.keys(firstItem);
                
                // 尝试查找x和intensity对应的字段名
                let xField = 'x';
                let intensityField = 'intensity';
                
                for (const key of keys) {
                    const lowerKey = key.toLowerCase();
                    if (lowerKey === 'x' || lowerKey.includes('position') || lowerKey.includes('pos') || lowerKey.includes('distance')) {
                        xField = key;
                        console.log(`使用字段 '${key}' 作为x坐标`);
                    } else if (lowerKey === 'intensity' || lowerKey.includes('int') || lowerKey.includes('value') || 
                               lowerKey.includes('power') || lowerKey === 'y' || lowerKey.includes('signal')) {
                        intensityField = key;
                        console.log(`使用字段 '${key}' 作为强度值`);
                    }
                }
                
                // 处理数组中的每个对象
                for (let i = 0; i < data.length; i++) {
                    const item = data[i];
                    if (!item.hasOwnProperty(xField) || !item.hasOwnProperty(intensityField)) {
                        console.warn(`JSON数组元素 ${i + 1} 缺少必要字段 '${xField}' 或 '${intensityField}'，已跳过`);
                        continue;
                    }
                    
                    const xVal = parseFloat(item[xField]);
                    const intensityVal = parseFloat(item[intensityField]);
                    
                    if (isNaN(xVal) || isNaN(intensityVal)) {
                        console.warn(`JSON数组元素 ${i + 1} 包含无效数值，已跳过`);
                        continue;
                    }
                    
                    x.push(xVal);
                    intensity.push(intensityVal);
                }
                
                if (x.length > 0) {
                    console.log(`成功从JSON数组中提取 ${x.length} 个数据点`);
                    return { x, intensity };
                }
            }
            
            throw new Error('未能从JSON数组中提取有效数据');
        }
        
        // 检查是否为对象格式 (多种可能的字段名组合)
        // 标准格式: {"x": [...], "intensity": [...]}
        // 或者其他变体: {"position": [...], "values": [...]} 等
        
        // 查找可能的x坐标数组
        let xArray = null;
        let intensityArray = null;
        
        // 尝试可能的字段名
        const xFieldNames = ['x', 'X', 'position', 'pos', 'distance', 'xaxis', 'x_axis', 'x_values'];
        const intensityFieldNames = ['intensity', 'int', 'y', 'values', 'data', 'amplitude', 'value', 'yaxis', 'y_axis', 'y_values'];
        
        for (const fieldName of xFieldNames) {
            if (data[fieldName] && Array.isArray(data[fieldName])) {
                xArray = data[fieldName];
                console.log(`找到x坐标数组，字段名: "${fieldName}"`);
                break;
            }
        }
        
        for (const fieldName of intensityFieldNames) {
            if (data[fieldName] && Array.isArray(data[fieldName])) {
                intensityArray = data[fieldName];
                console.log(`找到强度数组，字段名: "${fieldName}"`);
                break;
            }
        }
        
        // 如果找不到预期字段，尝试找到任何可能的数值数组
        if (!xArray || !intensityArray) {
            for (const key in data) {
                if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === 'number') {
                    if (!xArray) {
                        xArray = data[key];
                        console.log(`找到可能的x坐标数组，字段名: "${key}"`);
                    } else if (!intensityArray) {
                        intensityArray = data[key];
                        console.log(`找到可能的强度数组，字段名: "${key}"`);
                        break;
                    }
                }
            }
        }
        
        // 如果还找不到，检查是否有嵌套数据结构
        if (!xArray || !intensityArray) {
            for (const key in data) {
                if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
                    const nestedObj = data[key];
                    console.log(`检查嵌套对象: "${key}"`);
                    
                    // 在嵌套对象中查找数组
                    for (const nestedKey in nestedObj) {
                        if (Array.isArray(nestedObj[nestedKey]) && nestedObj[nestedKey].length > 0) {
                            const lowerKey = nestedKey.toLowerCase();
                            if ((lowerKey.includes('x') || lowerKey.includes('pos') || lowerKey.includes('dist')) && !xArray) {
                                xArray = nestedObj[nestedKey];
                                console.log(`在嵌套对象中找到x坐标数组: "${key}.${nestedKey}"`);
                            } else if ((lowerKey.includes('y') || lowerKey.includes('int') || lowerKey.includes('val') || lowerKey.includes('power')) && !intensityArray) {
                                intensityArray = nestedObj[nestedKey];
                                console.log(`在嵌套对象中找到强度数组: "${key}.${nestedKey}"`);
                            }
                            
                            if (xArray && intensityArray) break;
                        }
                    }
                    
                    if (xArray && intensityArray) break;
                }
            }
        }
        
        if (!xArray || !intensityArray) {
            // 最后尝试一种特殊格式：二维数组 [[x1, y1], [x2, y2], ...]
            for (const key in data) {
                if (Array.isArray(data[key]) && data[key].length > 0 && 
                    Array.isArray(data[key][0]) && data[key][0].length === 2) {
                    console.log(`检测到二维点数组格式: "${key}"`);
                    
                    const points = data[key];
                    xArray = [];
                    intensityArray = [];
                    
                    for (const point of points) {
                        if (Array.isArray(point) && point.length === 2) {
                            xArray.push(point[0]);
                            intensityArray.push(point[1]);
                        }
                    }
                    
                    break;
                }
            }
        }
        
        if (!xArray || !intensityArray) {
            throw new Error('无法在JSON中找到合适的数据结构。JSON文件必须包含x和intensity数组，或者格式为[{"x": ..., "intensity": ...}, ...]');
        }
        
        if (xArray.length !== intensityArray.length) {
            console.warn(`x和intensity数组长度不匹配: x=${xArray.length}, intensity=${intensityArray.length}. 将使用较短长度.`);
        }
        
        // 确保x和intensity数组长度相同
        const minLength = Math.min(xArray.length, intensityArray.length);
        const x = xArray.slice(0, minLength).map(val => parseFloat(val));
        const intensity = intensityArray.slice(0, minLength).map(val => parseFloat(val));
        
        // 检查解析后的数据是否有效
        const validPairs = x.filter((_, i) => !isNaN(x[i]) && !isNaN(intensity[i])).length;
        
        if (validPairs === 0) {
            throw new Error('JSON解析后没有有效的数值对。');
        }
        
        if (validPairs < minLength) {
            console.warn(`JSON数据中有${minLength - validPairs}个无效的数值，已跳过。`);
        }
        
        console.log(`成功从JSON文件中提取 ${validPairs} 个有效数据点`);
        
        return {
            x: x.filter((_, i) => !isNaN(x[i]) && !isNaN(intensity[i])),
            intensity: intensity.filter((_, i) => !isNaN(x[i]) && !isNaN(intensity[i]))
        };
    } catch (error) {
        console.error('JSON解析错误:', error);
        throw new Error(`JSON解析失败: ${error.message}`);
    }
}

// 初始化手动输入功能
function initManualInputFeature() {
    // 手动输入方式选择器
    const methodRadios = document.querySelectorAll('input[name="manual-method"]');
    methodRadios.forEach(radio => {
        radio.addEventListener('change', handleManualMethodChange);
    });
    
    // 预览和卸载按钮
    const previewBtn = document.getElementById('preview-intensity-btn');
    const applyBtn = document.getElementById('apply-intensity-btn');
    
    if (previewBtn) {
        previewBtn.addEventListener('click', previewManualInput);
    }
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyManualInput);
        // 初始时禁用卸载按钮，直到有数据加载
        applyBtn.disabled = !customIntensityData || !customIntensityData.loaded;
    }
    
    // 为手动输入框添加事件监听器，当数据改变时清空图表
    const coordsTextarea = document.getElementById('intensity-coords-textarea');
    const valuesTextarea = document.getElementById('intensity-values-textarea');
    const xRangeMin = document.getElementById('x-range-min');
    const xRangeMax = document.getElementById('x-range-max');
    
    // 添加输入事件监听器
    function handleInputChange() {
        if (typeof clearAllCharts === 'function') {
            clearAllCharts();
            console.log('🔄 用户修改自定义向量数据，已清空计算结果图表');
        }
    }
    
    if (coordsTextarea) {
        coordsTextarea.addEventListener('input', handleInputChange);
    }
    
    if (valuesTextarea) {
        valuesTextarea.addEventListener('input', handleInputChange);
    }
    
    if (xRangeMin) {
        xRangeMin.addEventListener('input', handleInputChange);
    }
    
    if (xRangeMax) {
        xRangeMax.addEventListener('input', handleInputChange);
    }
    
    // 初始化手动输入单位选择功能
    initManualUnitSelection();
}

// 处理手动输入方式变化
function handleManualMethodChange() {
    const coordsInput = document.getElementById('coordinates-input');
    const intensityOnlyInput = document.getElementById('intensity-only-input');
    const selectedMethod = document.querySelector('input[name="manual-method"]:checked').value;
    
    if (selectedMethod === 'coordinates') {
        coordsInput.style.display = 'block';
        intensityOnlyInput.style.display = 'none';
    } else {
        coordsInput.style.display = 'none';
        intensityOnlyInput.style.display = 'block';
    }
}

// 预览手动输入数据
function previewManualInput() {
    try {
        const data = parseManualInput();
        
        // 验证数据
        if (!validateIntensityData(data.x, data.intensity)) {
            return;
        }
        
        // 获取用户选择的数据范围外光强处理方式
        const outsideRangeMode = document.getElementById('outside-range-mode-manual').value;
        
        // 存储数据
        customIntensityData = {
            x: data.x,
            intensity: data.intensity,
            loaded: true,
            source: 'manual',
            x_unit: data.x_unit || 'mm',
            unit_scale: data.unit_scale || 1.0,
            outside_range_mode: outsideRangeMode, // 保存用户选择的数据范围外光强处理方式
            auto_calculated_I_avg: calculateAutoI_avg(data.intensity) // 自动计算平均光强
        };
        
        // 设置标志表示已点击预览按钮
        window.isPreviewDataButtonClicked = true;
        
        // 确保数据状态容器可见
        const dataStatusDiv = document.getElementById('intensity-data-status');
        if (dataStatusDiv) {
            dataStatusDiv.style.display = 'block';
        }
        
        // 更新数据状态显示
        updateDataStatus();
        
        // 显示预览
        previewIntensityData();
        
        // 启用"卸载数据"按钮
        const applyBtn = document.getElementById('apply-intensity-btn');
        if (applyBtn) {
            applyBtn.disabled = false;
        }
        
        showNotification(`预览成功，包含 ${data.x.length} 个数据点，单位: ${data.x_unit || 'mm'}，已应用可用于计算`, 'success');
        
    } catch (error) {
        console.error('❌ 手动输入解析错误:', error);
        showNotification(`输入解析失败: ${error.message}`, 'error');
    }
}

// 卸载手动输入数据
function applyManualInput() {
    // 检查是否有数据需要卸载
    if (!customIntensityData || !customIntensityData.loaded) {
        showNotification('没有数据需要卸载', 'info');
        return;
    }
    
    // 清除数据
    clearCustomIntensityData();
    
    // 清空图表
    if (typeof clearAllCharts === 'function') {
        clearAllCharts();
    }
    
    // 隐藏数据状态
    const statusDiv = document.getElementById('intensity-data-status');
    if (statusDiv) {
        statusDiv.style.display = 'none';
    }
    
    // 清空预览图
    const previewPlot = document.getElementById('intensity-preview-plot');
    if (previewPlot) {
        Plotly.purge(previewPlot);
    }
    
    // 显示通知
    showNotification('已卸载手动输入数据', 'info');
    
    // 更新单位选择UI显示
    if (window.updateUnitSelectionUI) {
        window.updateUnitSelectionUI();
    }
}


// 解析手动输入数据
function parseManualInput() {
    const selectedMethod = document.querySelector('input[name="manual-method"]:checked').value;
    
    let result;
    if (selectedMethod === 'coordinates') {
        result = parseCoordinatesInput();
    } else {
        result = parseIntensityOnlyInput();
    }
    
    // 应用用户选择的单位缩放比例
    const unitSelect = document.getElementById('manual-data-unit');
    const scaleFactor = document.getElementById('manual-scale-factor');
    
    if (unitSelect && scaleFactor && result.x) {
        const selectedUnit = unitSelect.value;
        let factor = parseFloat(scaleFactor.value);
        
        // 验证因子有效性
        if (isNaN(factor) || factor <= 0) {
            console.warn('⚠️ 缩放因子无效，使用默认值 1.0');
            factor = 1.0;
            scaleFactor.value = factor;
        }
        
        // 设置单位信息
        result.x_unit = selectedUnit === 'um' ? 'μm' : selectedUnit;
        result.unit_scale = factor;
        
        console.log(`📏 手动输入数据应用单位转换: ${result.x_unit}, 比例因子: ${result.unit_scale}`);
        
        // 同步更新全局数据对象的单位信息
        if (customIntensityData) {
            customIntensityData.x_unit = result.x_unit;
            customIntensityData.unit_scale = factor;
        }
    }
    
    return result;
}

// 解析坐标+强度输入
function parseCoordinatesInput() {
    const textarea = document.getElementById('intensity-coords-textarea');
    const content = textarea.value.trim();
    
    if (!content) {
        throw new Error('请输入坐标和强度数据');
    }
    
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const x = [];
    const intensity = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const parts = line.split(/\s+/);
        
        if (parts.length < 2) {
            throw new Error(`第 ${i + 1} 行格式错误，需要两个数值: x intensity`);
        }
        
        const xVal = parseFloat(parts[0]);
        const intensityVal = parseFloat(parts[1]);
        
        if (isNaN(xVal) || isNaN(intensityVal)) {
            throw new Error(`第 ${i + 1} 行包含无效数值`);
        }
        
        x.push(xVal);
        intensity.push(intensityVal);
    }
    
    return { x, intensity };
}

// 解析仅强度值输入
function parseIntensityOnlyInput() {
    const textarea = document.getElementById('intensity-values-textarea');
    const xMinInput = document.getElementById('x-range-min');
    const xMaxInput = document.getElementById('x-range-max');
    
    const content = textarea.value.trim();
    const xMin = parseFloat(xMinInput.value);
    const xMax = parseFloat(xMaxInput.value);
    
    if (!content) {
        throw new Error('请输入强度数据');
    }
    
    if (isNaN(xMin) || isNaN(xMax)) {
        throw new Error('请输入有效的X坐标范围');
    }
    
    if (xMin >= xMax) {
        throw new Error('X坐标最小值必须小于最大值');
    }
    
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const intensity = [];
    
    for (let i = 0; i < lines.length; i++) {
        const val = parseFloat(lines[i].trim());
        if (isNaN(val)) {
            throw new Error(`第 ${i + 1} 行包含无效数值`);
        }
        intensity.push(val);
    }
    
    if (intensity.length < 2) {
        throw new Error('至少需要2个强度数据点');
    }
    
    // 生成等间隔的x坐标
    const x = [];
    for (let i = 0; i < intensity.length; i++) {
        const xVal = xMin + (xMax - xMin) * i / (intensity.length - 1);
        x.push(xVal);
    }
    
    return { x, intensity };
}

// 验证光强数据
function validateIntensityData(x, intensity) {
    if (!Array.isArray(x) || !Array.isArray(intensity)) {
        showNotification('数据格式错误：x和intensity必须是数组', 'error');
        return false;
    }
    
    if (x.length !== intensity.length) {
        showNotification('数据格式错误：x和intensity数组长度必须相等', 'error');
        return false;
    }
    
    if (x.length < 2) {
        showNotification('数据点太少，至少需要2个数据点', 'error');
        return false;
    }
    
    if (x.length > 10000) {
        showNotification('数据点过多，最多支持10000个数据点', 'error');
        return false;
    }
    
    // 检查数值有效性
    for (let i = 0; i < x.length; i++) {
        if (isNaN(x[i]) || isNaN(intensity[i])) {
            showNotification(`数据点 ${i + 1} 包含无效数值`, 'error');
            return false;
        }
        
        if (!isFinite(x[i]) || !isFinite(intensity[i])) {
            showNotification(`数据点 ${i + 1} 包含无限值`, 'error');
            return false;
        }
    }
    
    // 检查强度值是否为负数 - 允许负值但给出提示
    const hasNegativeIntensity = intensity.some(val => val < 0);
    if (hasNegativeIntensity) {
        console.log('🔍 检测到负强度值，这在某些光学模拟中是允许的（如干涉条纹）');
        // showNotification('提示：检测到负强度值，在干涉条纹模拟中这是正常的', 'info');
    }
    
    // 自动检测坐标范围和单位
    const x_min = Math.min(...x);
    const x_max = Math.max(...x);
    
    // 记录数据范围
    if (!customIntensityData.x_range) {
        customIntensityData.x_range = {min: x_min, max: x_max};
    }
    
    // 仅当没有明确设置单位时才自动检测
    if (!customIntensityData.x_unit) {
        // 根据坐标范围推测单位
        let detected_unit = 'mm'; // 默认单位
        let unit_scale = 1.0; // 默认比例
    
        // 基于数据范围的简单推断单位
        if (Math.abs(x_max) <= 10 && Math.abs(x_min) <= 10) {
            // 小范围，可能就是毫米
            detected_unit = 'mm';
            unit_scale = 1.0;
        } else if (Math.abs(x_max) <= 1000 && Math.abs(x_min) <= 1000) {
            // 中等范围，可能是微米量级
            detected_unit = 'μm';
            unit_scale = 0.001; // 转换为毫米
        } else {
            // 大范围，可能是纳米量级
            detected_unit = 'nm';
            unit_scale = 0.000001; // 转换为毫米
        }
        
        // 存储检测到的单位信息
        customIntensityData.x_unit = detected_unit;
        customIntensityData.unit_scale = unit_scale;
        customIntensityData.auto_detected = true;
        
        console.log(`🔍 数据范围检测: ${x_min} 到 ${x_max} ${detected_unit}`);
    } else {
        console.log(`🔍 使用手动设置的单位: ${customIntensityData.x_unit}, 比例: ${customIntensityData.unit_scale}`);
    }
    
    console.log(`🔍 光强范围: ${Math.min(...intensity)} 到 ${Math.max(...intensity)}`);
    console.log(`✅ 数据验证通过: ${x.length} 个有效数据点`);
    return true;
}

// 初始化数据管理功能
function initDataManagementFeature() {
    const clearBtn = document.getElementById('clear-intensity-data');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCustomIntensityData);
    }
}

// 清除自定义光强数据
function clearCustomIntensityData() {
    customIntensityData = {
        x: [],
        intensity: [],
        loaded: false,
        source: null,
        fileName: null,
        x_unit: 'mm', // 重置为默认单位
        x_range: {min: 0, max: 0},
        auto_detected: false,
        outside_range_mode: 'zero', // 重置为默认数据范围外光强模式
        custom_intensity_value: 0, // 重置自定义光强值
        auto_calculated_I_avg: null // 重置自动计算的平均光强
    };
    
    // 重置下拉框为默认选项（零）
    const fileOutsideRangeSelect = document.getElementById('outside-range-mode-file');
    const manualOutsideRangeSelect = document.getElementById('outside-range-mode-manual');
    
    if (fileOutsideRangeSelect) fileOutsideRangeSelect.value = 'zero';
    if (manualOutsideRangeSelect) manualOutsideRangeSelect.value = 'zero';
    
    // 隐藏自定义值输入框
    const customIntensityFileContainer = document.getElementById('custom-intensity-value-file-container');
    const customIntensityManualContainer = document.getElementById('custom-intensity-value-manual-container');
    
    if (customIntensityFileContainer) customIntensityFileContainer.style.display = 'none';
    if (customIntensityManualContainer) customIntensityManualContainer.style.display = 'none';
    
    // 重置自定义值输入框
    const customIntensityFileInput = document.getElementById('custom-intensity-value-file');
    const customIntensityManualInput = document.getElementById('custom-intensity-value-manual');
    
    if (customIntensityFileInput) customIntensityFileInput.value = '0';
    if (customIntensityManualInput) customIntensityManualInput.value = '0';
    
    // 隐藏数据状态
    const statusDiv = document.getElementById('intensity-data-status');
    if (statusDiv) {
        statusDiv.style.display = 'none';
    }
    
    // 清空输入框
    const coordsTextarea = document.getElementById('intensity-coords-textarea');
    const intensityTextarea = document.getElementById('intensity-values-textarea');
    const fileInput = document.getElementById('intensity-file-input');
    
    if (coordsTextarea) coordsTextarea.value = '';
    if (intensityTextarea) intensityTextarea.value = '';
    if (fileInput) fileInput.value = '';
    
    // 清空图表
    clearAllCharts();
    
    // 隐藏文件状态指示器
    const statusIndicator = document.getElementById('file-status-indicator');
    if (statusIndicator && statusIndicator.parentElement) {
        statusIndicator.parentElement.removeChild(statusIndicator);
    }
    
    // 隐藏卸载按钮
    const clearFileBtn = document.getElementById('clear-file-btn');
    if (clearFileBtn) {
        clearFileBtn.style.display = 'none';
    }
    
    // 隐藏预览图
    const previewPlot = document.getElementById('intensity-preview-plot');
    if (previewPlot) {
        Plotly.purge(previewPlot);
        previewPlot.innerHTML = '';
    }
    
    showNotification('已卸载文件并清除自定义光强数据', 'info');
    console.log('🗑️ 自定义光强数据已清除，文件已卸载');
}

// 更新数据状态显示（针对预览数据）
function updateDataStatusForPreview(data) {
    const statusDiv = document.getElementById('intensity-data-status');
    const pointCountSpan = document.getElementById('intensity-point-count');
    const xRangeSpan = document.getElementById('intensity-x-range');
    const valueRangeSpan = document.getElementById('intensity-value-range');
    const outsideRangeModeSpan = document.getElementById('outside-range-mode');
    
    if (!statusDiv || !data || !data.x || !data.intensity) return;
    
    const { x, intensity } = data;
    const unitLabel = data.x_unit || 'mm';
    const outsideRangeMode = data.outside_range_mode || 'zero';
    
    // 计算统计信息
    const pointCount = x.length;
    const xMin = Math.min(...x);
    const xMax = Math.max(...x);
    const intensityMin = Math.min(...intensity);
    const intensityMax = Math.max(...intensity);
    
    // 更新显示
    if (pointCountSpan) pointCountSpan.textContent = pointCount;
    if (xRangeSpan) xRangeSpan.textContent = `${xMin.toFixed(3)} ~ ${xMax.toFixed(3)} ${unitLabel}`;
    if (valueRangeSpan) valueRangeSpan.textContent = `${intensityMin.toFixed(6)} ~ ${intensityMax.toFixed(6)}`;
    
    // 更新范围外光强模式显示
    if (outsideRangeModeSpan) {
        if (outsideRangeMode === 'zero') {
            outsideRangeModeSpan.textContent = '范围外为零';
            outsideRangeModeSpan.className = 'info-value mode-zero';
        } else if (outsideRangeMode === 'boundary') {
            outsideRangeModeSpan.textContent = '范围外与边界相同';
            outsideRangeModeSpan.className = 'info-value mode-boundary';
        } else if (outsideRangeMode === 'custom') {
            const customValue = data.custom_intensity_value || 0;
            outsideRangeModeSpan.textContent = `范围外为 ${customValue}`;
            outsideRangeModeSpan.className = 'info-value mode-custom';
        }
    }
    
    // 设置标志，表示预览按钮已点击
    window.isPreviewDataButtonClicked = true;
    
    // 显示状态区域
    statusDiv.style.display = 'block';
    
    // 如果是预览数据，添加标识
    if (data.source === 'manual-preview') {
        const statusTitle = statusDiv.querySelector('.status-title');
        if (statusTitle) {
            statusTitle.textContent = '预览光强数据';
            
            // 添加单位信息
            const unitInfo = document.createElement('span');
            unitInfo.className = 'unit-info';
            unitInfo.style.fontSize = '12px';
            unitInfo.style.color = '#666';
            unitInfo.style.marginLeft = '10px';
            unitInfo.textContent = `(单位: ${unitLabel}, 比例: ×${data.unit_scale || 1.0})`;
            
            // 移除旧的单位信息
            const oldUnitInfo = statusTitle.querySelector('.unit-info');
            if (oldUnitInfo) {
                oldUnitInfo.remove();
            }
            
            statusTitle.appendChild(unitInfo);
        }
    }
    
    console.log(`📊 数据状态更新: ${pointCount} 点, X[${xMin.toFixed(3)}, ${xMax.toFixed(3)}] ${unitLabel}, I[${intensityMin.toFixed(6)}, ${intensityMax.toFixed(6)}]`);
}

// 更新数据状态显示
function updateDataStatus() {
    const statusDiv = document.getElementById('intensity-data-status');
    const pointCountSpan = document.getElementById('intensity-point-count');
    const xRangeSpan = document.getElementById('intensity-x-range');
    const valueRangeSpan = document.getElementById('intensity-value-range');
    const outsideRangeModeSpan = document.getElementById('outside-range-mode');
    
    if (!statusDiv || !customIntensityData.loaded) return;
    
    const { x, intensity } = customIntensityData;
    const unitLabel = customIntensityData.x_unit || 'mm';
    const outsideRangeMode = customIntensityData.outside_range_mode || 'zero';
    
    // 计算统计信息
    const pointCount = x.length;
    const xMin = Math.min(...x);
    const xMax = Math.max(...x);
    const intensityMin = Math.min(...intensity);
    const intensityMax = Math.max(...intensity);
    
    // 更新显示
    if (pointCountSpan) pointCountSpan.textContent = pointCount;
    if (xRangeSpan) xRangeSpan.textContent = `${xMin.toFixed(3)} ~ ${xMax.toFixed(3)} ${unitLabel}`;
    if (valueRangeSpan) valueRangeSpan.textContent = `${intensityMin.toFixed(6)} ~ ${intensityMax.toFixed(6)}`;
    
    // 更新范围外光强模式显示
    if (outsideRangeModeSpan) {
        if (outsideRangeMode === 'zero') {
            outsideRangeModeSpan.textContent = '范围外为零';
            outsideRangeModeSpan.className = 'info-value mode-zero';
        } else if (outsideRangeMode === 'boundary') {
            outsideRangeModeSpan.textContent = '范围外与边界相同';
            outsideRangeModeSpan.className = 'info-value mode-boundary';
        } else if (outsideRangeMode === 'custom') {
            const customValue = customIntensityData.custom_intensity_value || 0;
            outsideRangeModeSpan.textContent = `范围外为 ${customValue}`;
            outsideRangeModeSpan.className = 'info-value mode-custom';
        }
    }
    
    // 显示状态区域
    statusDiv.style.display = 'block';
    
    // 恢复正常标题（应用数据时）
    const statusTitle = statusDiv.querySelector('.status-title');
    if (statusTitle) {
        statusTitle.textContent = '已加载的光强数据';
        
        // 添加单位信息
        const unitInfo = document.createElement('span');
        unitInfo.className = 'unit-info';
        unitInfo.style.fontSize = '12px';
        unitInfo.style.color = '#666';
        unitInfo.style.marginLeft = '10px';
        unitInfo.textContent = `(单位: ${unitLabel}, 比例: ×${customIntensityData.unit_scale || 1.0})`;
        
        // 移除旧的单位信息
        const oldUnitInfo = statusTitle.querySelector('.unit-info');
        if (oldUnitInfo) {
            oldUnitInfo.remove();
        }
        
        statusTitle.appendChild(unitInfo);
    }
    
    console.log(`📊 数据状态更新: ${pointCount} 点, X[${xMin.toFixed(3)}, ${xMax.toFixed(3)}] ${unitLabel}, I[${intensityMin.toFixed(6)}, ${intensityMax.toFixed(6)}]`);
}

// 预览光强数据
function previewIntensityData(data = null) {
    const plotDiv = document.getElementById('intensity-preview-plot');
    if (!plotDiv) return;
    
    // 设置标志，表示预览按钮已被点击
    window.isPreviewDataButtonClicked = true;
    
    // 确保数据状态容器可见（用户已点击预览按钮）
    const dataStatusDiv = document.getElementById('intensity-data-status');
    if (dataStatusDiv) {
        dataStatusDiv.style.display = 'block';
    }
    
    const dataToPlot = data || customIntensityData;
    if (!dataToPlot.loaded || !dataToPlot.x || !dataToPlot.intensity) return;
    
    // 更新数据状态信息（针对预览数据）
    updateDataStatusForPreview(dataToPlot);
    
    try {
        const trace = {
            x: dataToPlot.x,
            y: dataToPlot.intensity,
            type: 'scatter',
            mode: 'lines+markers',
            name: '光强分布',
            line: {
                color: '#3498db',
                width: 2
            },
            marker: {
                color: '#3498db',
                size: 4
            }
        };
        
        // 获取单位信息
        const unitName = dataToPlot.x_unit || 'mm';
        const unitDisplay = unitName === 'μm' ? 'μm' : unitName;
        
        const layout = {
            title: '光强分布预览',
            xaxis: {
                title: `位置 (${unitDisplay})`,
                gridcolor: '#f0f0f0'
            },
            yaxis: {
                title: '光强 (mW/cm²)',
                gridcolor: '#f0f0f0'
            },
            plot_bgcolor: 'white',
            paper_bgcolor: 'white',
            margin: { t: 40, b: 50, l: 60, r: 20 },
            font: { size: 12 }
        };
        
        const config = {
            responsive: true,
            displayModeBar: false
        };
        
        Plotly.newPlot(plotDiv, [trace], layout, config);
        
        // 如果有自动检测的单位，更新单位选择UI
        if (dataToPlot.auto_detected && window.updateUnitSelectionUI) {
            window.updateUnitSelectionUI();
        }
        
        // 显示单位转换信息
        const dataInfoElement = document.getElementById('custom-data-info');
        if (dataInfoElement) {
            const xMin = Math.min(...dataToPlot.x);
            const xMax = Math.max(...dataToPlot.x);
            const intensityMin = Math.min(...dataToPlot.intensity);
            const intensityMax = Math.max(...dataToPlot.intensity);
            
            dataInfoElement.innerHTML = `
                <strong>数据点数:</strong> ${dataToPlot.x.length} | 
                <strong>X范围:</strong> ${xMin.toFixed(3)} - ${xMax.toFixed(3)} ${unitDisplay} | 
                <strong>强度范围:</strong> ${intensityMin.toFixed(6)} - ${intensityMax.toFixed(6)} | 
                <strong>转换比例:</strong> ×${dataToPlot.unit_scale || 1.0}
            `;
        }
        
        console.log(`📈 光强分布预览图已更新 (单位: ${unitDisplay})`);
        
    } catch (error) {
        console.error('❌ 预览图生成失败:', error);
        plotDiv.innerHTML = '<div style="padding: 2rem; text-align: center; color: #dc3545;">预览图生成失败</div>';
    }
}

// 获取当前光强分布数据（供计算使用）
function getCurrentIntensityData() {
    const methodSelect = document.getElementById('intensity_input_method');
    const method = methodSelect ? methodSelect.value : 'formula';
    
    if (method === 'custom' && customIntensityData.loaded) {
        console.log('🔧 使用自定义光强分布数据');
        return {
            isCustom: true,
            x: customIntensityData.x,
            intensity: customIntensityData.intensity
        };
    } else {
        console.log('🔧 使用公式计算光强分布');
        return {
            isCustom: false
        };
    }
}

// 显示通知消息
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} notification-enter`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="removeNotification(this.parentElement)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // 添加唯一ID用于跟踪
    const notificationId = 'notification-' + Date.now();
    notification.id = notificationId;
    
    // 添加到页面
    const container = getOrCreateNotificationContainer();
    container.appendChild(notification);
    
    // 确保动画样式已添加
    addNotificationStyles();
    
    // 延迟一帧，确保DOM已更新，再触发动画
    requestAnimationFrame(() => {
        notification.classList.remove('notification-enter');
        notification.classList.add('notification-active');
    });
    
    console.log(`📢 通知已创建 [${type}]: ${message} (ID: ${notificationId})`);
    
    // 监控通知是否被意外移除
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.removedNodes.forEach((node) => {
                    if (node.id === notificationId) {
                        console.log(`⚠️ 通知被意外移除: ${message} (ID: ${notificationId})`);
                        console.trace('通知移除的调用栈:');
                    }
                });
            }
        });
    });
    
    // 开始监控
    observer.observe(container, { childList: true });
    
    // 自动移除 - 使用精确时间控制而不是setTimeout
    const startTime = performance.now();
    const displayDuration = 2500; // 2.5秒
    console.log(`🔔 通知将在${displayDuration}ms后自动移除: ${message} (ID: ${notificationId})`);
    
    function checkRemoval() {
        const elapsed = performance.now() - startTime;
        
        if (elapsed >= displayDuration) {
            if (notification.parentElement) {
                console.log(`🗑️ 正在移除通知: ${message} (ID: ${notificationId}) - 总显示时间: ${Math.round(elapsed)}ms`);
                observer.disconnect(); // 停止监控
                removeNotification(notification);
            }
        } else {
            requestAnimationFrame(checkRemoval);
        }
    }
    
    requestAnimationFrame(checkRemoval);
}

// 移除通知的函数
function removeNotification(notification) {
    // 添加退出动画
    notification.classList.remove('notification-active');
    notification.classList.add('notification-exit');
    
    // 动画完成后删除元素
    notification.addEventListener('animationend', () => {
        if (notification.parentElement) {
            notification.remove();
        }
    });
}

// 获取通知图标
function getNotificationIcon(type) {
    const icons = {
        'info': 'fa-info-circle',
        'success': 'fa-check-circle',
        'warning': 'fa-exclamation-triangle',
        'error': 'fa-times-circle'
    };
    return icons[type] || icons['info'];
}

// 获取或创建通知容器
function getOrCreateNotificationContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 20000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(container);
        console.log('🔧 通知容器已创建');
        
        // 监控容器是否被移除
        const containerObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.removedNodes.forEach((node) => {
                        if (node.id === 'notification-container') {
                            console.log('⚠️ 通知容器被意外移除!');
                            console.trace('容器移除的调用栈:');
                        }
                    });
                }
            });
        });
        
        containerObserver.observe(document.body, { childList: true });
    }
    return container;
}

// 添加通知样式到文档头部
function addNotificationStyles() {
    if (document.getElementById('notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 100%;
            transform-origin: right top;
            will-change: transform, opacity;
            transition: opacity 0.3s, transform 0.3s;
        }
        
        /* 进入状态 - 初始位置 */
        .notification-enter {
            opacity: 0;
            transform: translateX(100%) scale(0.8);
        }
        
        /* 活动状态 - 可见位置 */
        .notification-active {
            opacity: 1;
            transform: translateX(0) scale(1);
            animation: notification-bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        /* 退出状态 - 隐藏并向上淡出 */
        .notification-exit {
            animation: notification-fadeout 0.4s forwards;
        }
        
        .notification-info {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            box-shadow: 0 2px 4px rgba(23, 162, 184, 0.08);
            color: #0c5460;
        }
        
        .notification-success {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            box-shadow: 0 2px 4px rgba(40, 167, 69, 0.08);
            color: #155724;
        }
        
        .notification-warning {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            box-shadow: 0 2px 4px rgba(255, 193, 7, 0.08);
            color: #856404;
        }
        
        .notification-error {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            box-shadow: 0 2px 4px rgba(220, 53, 69, 0.08);
            color: #721c24;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }
        
        .notification-close {
            background: none;
            border: none;
            cursor: pointer;
            opacity: 0.6;
            padding: 4px;
            margin-left: 8px;
            transition: opacity 0.2s, transform 0.2s;
        }
        
        .notification-close:hover {
            opacity: 1;
            transform: scale(1.15);
        }
        
        /* 弹跳进入动画 */
        @keyframes notification-bounce {
            0% {
                transform: translateX(80%) scale(0.8);
                opacity: 0.5;
            }
            70% {
                transform: translateX(-5%) scale(1.05);
                opacity: 1;
            }
            100% {
                transform: translateX(0) scale(1);
                opacity: 1;
            }
        }
        
        /* 淡出退出动画 */
        @keyframes notification-fadeout {
            0% {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
            20% {
                transform: translateX(-5%) scale(1.05);
            }
            100% {
                opacity: 0;
                transform: translateX(100%) scale(0.9);
            }
        }
    `;
    document.head.appendChild(style);
}

// 立即添加通知样式
addNotificationStyles();

// 初始化单位选择功能
function initUnitSelection() {
    const unitSelect = document.getElementById('custom-data-unit');
    const customScaleContainer = document.getElementById('custom-scale-container');
    const customScaleFactor = document.getElementById('custom-scale-factor');
    
    if (!unitSelect) {
        console.log('单位选择控件未找到');
        return;
    }
    
    // 单位选择变化时的处理
    unitSelect.addEventListener('change', function() {
        const selectedUnit = this.value;
        
        // 清除当前预览图但保留数据
        const previewPlot = document.getElementById('intensity-preview-plot');
        if (previewPlot) {
            Plotly.purge(previewPlot);
            // 添加一个提示信息
            previewPlot.innerHTML = '<div style="padding: 30px; text-align: center; color: #666; background: #f9f9f9; border-radius: 4px;"><i class="fas fa-sync" style="font-size: 24px; color: #2196F3; margin-bottom: 10px;"></i><p style="margin: 5px 0;">单位已更改，需要重新预览数据</p></div>';
        }
        
        // 显示或隐藏自定义比例输入框
        if (selectedUnit === 'custom') {
            customScaleContainer.style.display = 'block';
        } else {
            customScaleContainer.style.display = 'none';
            
            // 设置预定义单位的比例
            let scaleFactor = 1.0;
            switch (selectedUnit) {
                case 'nm':
                    scaleFactor = 0.000001; // 纳米到毫米
                    break;
                case 'um':
                    scaleFactor = 0.001; // 微米到毫米
                    break;
                case 'mm':
                    scaleFactor = 1.0; // 毫米
                    break;
                default:
                    scaleFactor = 1.0;
            }
            
            // 只更新临时变量，不立即应用到数据和预览
            const unitLabel = selectedUnit === 'um' ? 'μm' : selectedUnit;
            
            // 显示提示，建议用户应用变更
            showNotification(`已选择坐标单位: ${unitLabel}，点击"预览数据"按钮应用此更改`, 'info');
            
            // 确保预览按钮存在并使其更醒目
            const previewBtn = addManualPreviewButton();
            if (previewBtn) {
                // 添加闪烁动画以提醒用户点击
                previewBtn.classList.add('highlight-btn');
                setTimeout(() => {
                    previewBtn.classList.remove('highlight-btn');
                }, 2000);
            }
        }
        
        // 更新数据状态信息中的单位显示
        updateUnitDisplayInStatus(selectedUnit);
    });
    
    // 自定义比例因子变化时的处理
    if (customScaleFactor) {
        customScaleFactor.addEventListener('input', function() {
            const value = parseFloat(this.value);
            if (!isNaN(value) && value > 0) {
                // 清除当前预览图但保留数据
                const previewPlot = document.getElementById('intensity-preview-plot');
                if (previewPlot) {
                    Plotly.purge(previewPlot);
                    // 添加一个提示信息
                    previewPlot.innerHTML = '<div style="padding: 30px; text-align: center; color: #666; background: #f9f9f9; border-radius: 4px;"><i class="fas fa-sync" style="font-size: 24px; color: #2196F3; margin-bottom: 10px;"></i><p style="margin: 5px 0;">比例因子已更改，需要重新预览数据</p></div>';
                }
                
                // 不立即应用到数据和预览
                showNotification(`已设置自定义比例因子: ${value}，点击"预览数据"按钮应用此更改`, 'info');
                
                // 确保预览按钮存在并使其更醒目
                const previewBtn = addManualPreviewButton();
                if (previewBtn) {
                    // 添加闪烁动画以提醒用户点击
                    previewBtn.classList.add('highlight-btn');
                    setTimeout(() => {
                        previewBtn.classList.remove('highlight-btn');
                    }, 2000);
                }
                
                // 更新数据状态信息中的单位显示
                updateUnitDisplayInStatus('custom', value);
            }
        });
    }
    
    // 根据检测到的单位自动更新UI
    function updateUnitSelectionUI() {
        if (!customIntensityData.auto_detected) return;
        
        switch (customIntensityData.x_unit) {
            case 'nm':
                unitSelect.value = 'nm';
                break;
            case 'μm':
                unitSelect.value = 'um';
                break;
            case 'mm':
                unitSelect.value = 'mm';
                break;
            default:
                // 如果是其他单位，使用自定义并设置比例
                unitSelect.value = 'custom';
                if (customScaleContainer) {
                    customScaleContainer.style.display = 'block';
                }
                if (customScaleFactor) {
                    customScaleFactor.value = customIntensityData.unit_scale || 1.0;
                }
        }
    }
    
    // 暴露更新函数，以便在数据加载后调用
    window.updateUnitSelectionUI = updateUnitSelectionUI;
}

// 初始化tooltip功能
function initTooltips() {
    // 查找所有带有title属性的help-icon元素
    const helpIcons = document.querySelectorAll('.help-icon');
    
    if (helpIcons.length > 0) {
        console.log(`找到 ${helpIcons.length} 个帮助图标，正在初始化tooltip...`);
        
        // 为每个帮助图标添加简单的原生tooltip功能
        helpIcons.forEach(icon => {
            // 保存原始title
            const originalTitle = icon.getAttribute('title');
            
            // 创建tooltip元素
            const tooltip = document.createElement('div');
            tooltip.className = 'simple-tooltip';
            tooltip.style.position = 'absolute';
            tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            tooltip.style.color = '#fff';
            tooltip.style.padding = '8px 12px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.fontSize = '14px';
            tooltip.style.maxWidth = '300px';
            tooltip.style.zIndex = '1000';
            tooltip.style.display = 'none';
            tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            tooltip.style.pointerEvents = 'none';
            tooltip.textContent = originalTitle;
            
            // 添加到body
            document.body.appendChild(tooltip);
            
            // 移除原始title以防止原生tooltip
            icon.removeAttribute('title');
            
            // 鼠标悬停显示tooltip
            icon.addEventListener('mouseenter', function(e) {
                const rect = icon.getBoundingClientRect();
                
                // 定位tooltip到图标右侧
                tooltip.style.left = (rect.right + 10) + 'px';
                tooltip.style.top = (rect.top + window.scrollY - 5) + 'px';
                
                // 检查是否会超出视口右侧
                const tooltipRect = tooltip.getBoundingClientRect();
                if (tooltipRect.right > window.innerWidth) {
                    // 如果会超出右侧，则放到图标左侧
                    tooltip.style.left = (rect.left - tooltipRect.width - 10) + 'px';
                }
                
                tooltip.style.display = 'block';
            });
            
            // 鼠标离开隐藏tooltip
            icon.addEventListener('mouseleave', function() {
                tooltip.style.display = 'none';
            });
        });
    }
}

// 在DOM加载完成后初始化功能
document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化以确保其他组件已经加载
    setTimeout(() => {
        initCustomIntensityFeature();
        // 初始化单位选择功能
        initUnitSelection();
        // 初始化tooltip功能
        initTooltips();
    }, 500);
});// 初始化手动输入单位选择功能
function initManualUnitSelection() {
    const unitSelect = document.getElementById('manual-data-unit');
    const scaleContainer = document.getElementById('manual-scale-container');
    const scaleFactor = document.getElementById('manual-scale-factor');
    
    if (!unitSelect || !scaleContainer || !scaleFactor) {
        console.log('手动输入单位选择控件未找到');
        return;
    }
    
    // 单位选择变化时的处理
    unitSelect.addEventListener('change', function() {
        const selectedUnit = this.value;
        
        // 清除当前预览图但保留数据
        const previewPlot = document.getElementById('intensity-preview-plot');
        if (previewPlot && customIntensityData.loaded) {
            Plotly.purge(previewPlot);
            // 添加一个提示信息
            previewPlot.innerHTML = '<div style="padding: 30px; text-align: center; color: #666; background: #f9f9f9; border-radius: 4px;"><i class="fas fa-sync" style="font-size: 24px; color: #2196F3; margin-bottom: 10px;"></i><p style="margin: 5px 0;">单位已更改，需要重新预览数据</p></div>';
        }
        
        // 显示或隐藏自定义比例输入框
        if (selectedUnit === 'custom') {
            scaleContainer.style.display = 'block';
        } else {
            scaleContainer.style.display = 'none';
            
            // 设置预定义单位的比例
            let factor = 1.0;
            switch (selectedUnit) {
                case 'nm':
                    factor = 0.000001; // 纳米到毫米
                    break;
                case 'um':
                    factor = 0.001; // 微米到毫米
                    break;
                case 'mm':
                    factor = 1.0; // 毫米
                    break;
                default:
                    factor = 1.0;
            }
            
            // 存储比例因子供手动输入解析时使用
            scaleFactor.value = factor;
            
            // 不直接更新预览，而是提示用户应用更改
            const unitLabel = selectedUnit === 'um' ? 'μm' : selectedUnit;
            
            // 如果已加载数据，显示提示并添加预览按钮
            if (customIntensityData && customIntensityData.loaded) {
                showNotification(`已选择坐标单位: ${unitLabel}，点击"预览数据"按钮应用此更改`, 'info');
                
                // 确保预览按钮存在并使其更醒目
                const previewBtn = addManualPreviewButton();
                if (previewBtn) {
                    // 添加闪烁动画以提醒用户点击
                    previewBtn.classList.add('highlight-btn');
                    setTimeout(() => {
                        previewBtn.classList.remove('highlight-btn');
                    }, 2000);
                }
                
                // 更新数据状态信息中的单位显示
                updateManualUnitDisplayInStatus(selectedUnit);
            }
        }
    });
    
    // 自定义缩放因子变化时处理
    scaleFactor.addEventListener('change', function() {
        if (unitSelect.value === 'custom') {
            const factor = parseFloat(this.value);
            if (!isNaN(factor) && factor > 0) {
                // 清除当前预览图但保留数据
                const previewPlot = document.getElementById('intensity-preview-plot');
                if (previewPlot && customIntensityData.loaded) {
                    Plotly.purge(previewPlot);
                    // 添加一个提示信息
                    previewPlot.innerHTML = '<div style="padding: 30px; text-align: center; color: #666; background: #f9f9f9; border-radius: 4px;"><i class="fas fa-sync" style="font-size: 24px; color: #2196F3; margin-bottom: 10px;"></i><p style="margin: 5px 0;">比例因子已更改，需要重新预览数据</p></div>';
                }
                
                // 如果已加载数据，显示提示并添加预览按钮
                if (customIntensityData && customIntensityData.loaded) {
                    showNotification(`已设置自定义比例因子: ${factor}，点击"预览数据"按钮应用此更改`, 'info');
                    
                    // 确保预览按钮存在并使其更醒目
                    const previewBtn = addManualPreviewButton();
                    if (previewBtn) {
                        // 添加闪烁动画以提醒用户点击
                        previewBtn.classList.add('highlight-btn');
                        setTimeout(() => {
                            previewBtn.classList.remove('highlight-btn');
                        }, 2000);
                    }
                    
                    // 更新数据状态信息中的单位显示
                    updateManualUnitDisplayInStatus('custom', factor);
                }
            } else {
                // 无效值处理
                console.warn('⚠️ 无效的缩放比例值:', this.value);
                this.value = customIntensityData?.unit_scale || 1.0;
            }
        }
    });
    
    // 初始化状态
    const initialUnit = unitSelect.value;
    if (initialUnit === 'custom') {
        scaleContainer.style.display = 'block';
    } else {
        scaleContainer.style.display = 'none';
        
        // 设置默认单位信息
        let factor = 1.0;
        switch (initialUnit) {
            case 'nm': factor = 0.000001; break;
            case 'um': factor = 0.001; break;
            case 'mm': factor = 1.0; break;
        }
        
        // 确保缩放因子字段与选择的单位匹配
        scaleFactor.value = factor;
    }
    
    console.log('✅ 手动输入单位选择功能初始化完成');
}

// 添加手动输入预览按钮
function addManualPreviewButton() {
    // 检查是否已存在预览按钮
    let previewBtn = document.getElementById('manual-preview-data-btn');
    if (previewBtn) {
        // 如果已存在，只需更新其显示状态
        previewBtn.style.display = 'inline-block';
        // 隐藏中间的预览数据按钮
        const middlePreviewBtn = document.getElementById('preview-intensity-btn');
        if (middlePreviewBtn) {
            middlePreviewBtn.style.display = 'none';
        }
        return previewBtn;
    }
    
    // 获取手动输入区域
    const inputArea = document.querySelector('.manual-input-area');
    if (!inputArea) {
        console.error('未找到手动输入区域');
        return null;
    }
    
    // 隐藏中间的预览数据按钮
    const middlePreviewBtn = document.getElementById('preview-intensity-btn');
    if (middlePreviewBtn) {
        middlePreviewBtn.style.display = 'none';
    }
    
    // 创建预览按钮
    previewBtn = document.createElement('button');
    previewBtn.id = 'manual-preview-data-btn';
    previewBtn.className = 'preview-data-btn';
    previewBtn.innerHTML = '<i class="fas fa-eye"></i> 预览数据';
    previewBtn.style.cssText = `
        display: inline-block;
        margin-top: 15px;
        padding: 8px 16px;
        background-color: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.3s;
    `;
    
    // 悬停效果
    previewBtn.onmouseover = function() {
        this.style.backgroundColor = '#0b7dda';
    };
    previewBtn.onmouseout = function() {
        this.style.backgroundColor = '#2196F3';
    };
    
    // 添加预览按钮到手动输入区域
    inputArea.appendChild(previewBtn);
    
    // 如果已经加载了数据，添加一个数据状态指示器
    if (customIntensityData.loaded) {
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'file-status-indicator';
        statusIndicator.innerHTML = `<i class="fas fa-check-circle"></i> 已加载 ${customIntensityData.x?.length || 0} 个数据点`;
        
        // 将状态指示器添加到按钮前面
        inputArea.insertBefore(statusIndicator, previewBtn);
    }
    
    // 绑定预览事件
    previewBtn.addEventListener('click', function() {
        // 预览数据前应用手动输入的单位设置
        applyManualUnitSettings();
        
        // 预览数据
        previewIntensityData();
        
        // 更新通知
        showNotification(`已应用坐标单位: ${customIntensityData.x_unit || 'mm'}，比例系数: ${customIntensityData.unit_scale || 1.0}`, 'info');
        
        // 移除高亮效果（如果有）
        this.classList.remove('highlight-btn');
        
        // 隐藏手动预览按钮并恢复中间预览按钮的显示
         this.style.display = 'none';
         const middlePreviewBtn = document.getElementById('preview-intensity-btn');
         if (middlePreviewBtn) {
             middlePreviewBtn.style.display = 'inline-block';
         }
     });
     
     return previewBtn;
}

// 更新手动输入数据状态信息中的单位显示
function updateManualUnitDisplayInStatus(unitType, customFactor = null) {
    // 与文件上传版本类似，但针对手动输入区域
    const statusDiv = document.getElementById('intensity-data-status');
    if (!statusDiv) return;
    
    // 查找标题元素
    const statusTitle = statusDiv.querySelector('.status-title');
    if (!statusTitle) return;
    
    // 获取单位标签和比例因子
    let unitLabel = 'mm';
    let factor = 1.0;
    
    switch (unitType) {
        case 'nm':
            unitLabel = 'nm';
            factor = 0.000001;
            break;
        case 'um':
            unitLabel = 'μm';
            factor = 0.001;
            break;
        case 'mm':
            unitLabel = 'mm';
            factor = 1.0;
            break;
        case 'custom':
            unitLabel = 'custom';
            factor = customFactor || 1.0;
            break;
    }
    
    // 更新单位信息显示
    const unitInfo = statusTitle.querySelector('.unit-info');
    if (unitInfo) {
        unitInfo.textContent = `(单位: ${unitLabel}, 比例: ×${factor}) [待应用]`;
        unitInfo.style.color = '#ff6b01'; // 使用橙色表示待应用状态
    }
}

// 应用手动输入单位设置
function applyManualUnitSettings() {
    // 获取单位选择元素
    const unitSelect = document.getElementById('manual-data-unit');
    const customScaleFactor = document.getElementById('manual-scale-factor');
    
    if (!unitSelect) return;
    
    // 获取当前选择的单位
    const selectedUnit = unitSelect.value;
    
    // 设置单位和比例因子
    let unit = 'mm';  // 默认单位
    let factor = 1.0; // 默认比例因子
    
    switch (selectedUnit) {
        case 'nm':
            unit = 'nm';
            factor = 0.000001; // 纳米到毫米
            break;
        case 'um':
            unit = 'μm';
            factor = 0.001; // 微米到毫米
            break;
        case 'mm':
            unit = 'mm';
            factor = 1.0; // 毫米
            break;
        case 'custom':
            unit = 'custom';
            // 使用自定义比例因子
            if (customScaleFactor && !isNaN(parseFloat(customScaleFactor.value))) {
                factor = parseFloat(customScaleFactor.value);
            }
            break;
    }
    
    // 更新全局数据对象
    customIntensityData.x_unit = unit;
    customIntensityData.unit_scale = factor;
    
    // 更新状态显示中的单位信息（已应用状态）
    const statusDiv = document.getElementById('intensity-data-status');
    if (statusDiv) {
        const statusTitle = statusDiv.querySelector('.status-title');
        if (statusTitle) {
            const unitInfo = statusTitle.querySelector('.unit-info');
            if (unitInfo) {
                unitInfo.textContent = `(单位: ${unit}, 比例: ×${factor})`;
                unitInfo.style.color = '#666'; // 恢复正常颜色
            }
        }
    }
    
    console.log(`🔄 应用手动输入单位设置: ${unit}, 比例因子: ${factor}`);
}

// 添加预览按钮的函数
function addPreviewButton() {
    // 获取文件上传区域
    const uploadArea = document.querySelector('.file-upload-area');
    if (!uploadArea) {
        console.error('未找到文件上传区域');
        return null;
    }
    
    // 检查是否已存在预览按钮
    let previewBtn = document.getElementById('preview-data-btn');
    if (previewBtn) {
        // 如果已存在，只需更新其显示状态
        previewBtn.style.display = 'inline-block';
    } else {
        // 创建预览按钮
        previewBtn = document.createElement('button');
        previewBtn.id = 'preview-data-btn';
        previewBtn.className = 'preview-data-btn';
        previewBtn.innerHTML = '<i class="fas fa-eye"></i> 预览数据';
        previewBtn.style.cssText = `
            display: inline-block;
            margin-top: 15px;
            margin-right: 10px;
            padding: 8px 16px;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        `;
        
        // 悬停效果
        previewBtn.onmouseover = function() {
            this.style.backgroundColor = '#0b7dda';
        };
        previewBtn.onmouseout = function() {
            this.style.backgroundColor = '#2196F3';
        };
        
        // 添加CSS样式以支持高亮动画
        if (!document.getElementById('highlight-button-style')) {
            const style = document.createElement('style');
            style.id = 'highlight-button-style';
            style.textContent = `
                @keyframes pulse-highlight {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7); }
                    50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(33, 150, 243, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
                }
                .highlight-btn {
                    animation: pulse-highlight 1.5s infinite;
                }
                .file-status-indicator {
                    display: inline-block;
                    margin-right: 10px;
                    font-size: 14px;
                    color: #4CAF50;
                    vertical-align: middle;
                }
                .file-status-indicator i {
                    margin-right: 5px;
                }
            `;
            document.head.appendChild(style);
        }
        
        // 添加预览按钮到文件上传区域
        uploadArea.appendChild(previewBtn);
        
        // 绑定预览事件
        previewBtn.addEventListener('click', function() {
            // 预览数据前应用当前选择的单位设置
            applyUnitSettings();
            
            // 预览数据
            previewIntensityData();
            
            // 更新通知
            showNotification(`已应用坐标单位: ${customIntensityData.x_unit || 'mm'}，比例系数: ${customIntensityData.unit_scale || 1.0}`, 'info');
            
            // 移除高亮效果（如果有）
            this.classList.remove('highlight-btn');
        });
    }
    
    // 始终移除旧的文件状态指示器（如果存在）
    const oldStatusIndicator = document.getElementById('file-status-indicator');
    if (oldStatusIndicator) {
        oldStatusIndicator.parentElement.removeChild(oldStatusIndicator);
    }
    
    // 始终创建或更新卸载按钮（无论是否已存在）
    let clearFileBtn = document.getElementById('clear-file-btn');
    if (!clearFileBtn) {
        // 如果卸载按钮不存在，创建一个新按钮
        clearFileBtn = document.createElement('button');
        clearFileBtn.id = 'clear-file-btn';
        clearFileBtn.className = 'clear-file-btn';
        clearFileBtn.style.cssText = `
            margin-top: 15px;
            padding: 8px 16px;
            background-color: #e74c3c;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        `;
        
        // 悬停效果
        clearFileBtn.onmouseover = function() {
            this.style.backgroundColor = '#c0392b';
        };
        clearFileBtn.onmouseout = function() {
            this.style.backgroundColor = '#e74c3c';
        };
        
        // 绑定文件卸载事件
        clearFileBtn.addEventListener('click', function() {
            clearCustomIntensityData();
        });
        
        // 添加卸载按钮到文件上传区域
        uploadArea.appendChild(clearFileBtn);
    }
    
    // 更新卸载按钮的显示内容和状态
    clearFileBtn.innerHTML = '<i class="fas fa-times"></i> 卸载文件';
    clearFileBtn.style.display = customIntensityData.loaded ? 'inline-block' : 'none';
    
    // 创建新的文件状态指示器
    if (customIntensityData.loaded) {
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'file-status-indicator';
        statusIndicator.className = 'file-status-indicator';
        statusIndicator.innerHTML = `<i class="fas fa-check-circle"></i> 已加载文件: ${customIntensityData.fileName || '自定义数据'}`;
        
        // 将状态指示器添加到按钮前面
        uploadArea.insertBefore(statusIndicator, previewBtn);
    }
    
    return previewBtn;
}

// 更新数据状态信息中的单位显示
function updateUnitDisplayInStatus(unitType, customFactor = null) {
    const statusDiv = document.getElementById('intensity-data-status');
    if (!statusDiv) return;
    
    // 用户要求：当更改单位或没有点击预览数据时不显示数据信息
    // 重置预览按钮点击标志，表示需要重新预览
    window.isPreviewDataButtonClicked = false;
    
    // 隐藏数据状态区域，直到用户再次点击预览按钮
    statusDiv.style.display = 'none';
    
    // 如果函数提前返回，以下代码不会执行
    return;
    
    // 以下代码保留但不会执行 - 由预览函数负责显示数据状态
    // 查找标题元素
    const statusTitle = statusDiv.querySelector('.status-title');
    if (!statusTitle) return;
    
    // 获取单位标签和比例因子
    let unitLabel = 'mm';
    let factor = 1.0;
    
    switch (unitType) {
        case 'nm':
            unitLabel = 'nm';
            factor = 0.000001;
            break;
        case 'um':
            unitLabel = 'μm';
            factor = 0.001;
            break;
        case 'mm':
            unitLabel = 'mm';
            factor = 1.0;
            break;
        case 'custom':
            unitLabel = 'custom';
            factor = customFactor || 1.0;
            break;
    }
    
    // 更新单位信息显示
    const unitInfo = statusTitle.querySelector('.unit-info');
    if (unitInfo) {
        unitInfo.textContent = `(单位: ${unitLabel}, 比例: ×${factor}) [待应用]`;
        unitInfo.style.color = '#ff6b01'; // 使用橙色表示待应用状态
    }
}

// 应用单位设置
function applyUnitSettings() {
    // 获取单位选择元素
    const unitSelect = document.getElementById('custom-data-unit');
    const customScaleFactor = document.getElementById('custom-scale-factor');
    
    if (!unitSelect) return;
    
    // 获取当前选择的单位
    const selectedUnit = unitSelect.value;
    
    // 设置单位和比例因子
    let unit = 'mm';  // 默认单位
    let factor = 1.0; // 默认比例因子
    
    switch (selectedUnit) {
        case 'nm':
            unit = 'nm';
            factor = 0.000001; // 纳米到毫米
            break;
        case 'um':
            unit = 'μm';
            factor = 0.001; // 微米到毫米
            break;
        case 'mm':
            unit = 'mm';
            factor = 1.0; // 毫米
            break;
        case 'custom':
            unit = 'custom';
            // 使用自定义比例因子
            if (customScaleFactor && !isNaN(parseFloat(customScaleFactor.value))) {
                factor = parseFloat(customScaleFactor.value);
            }
            break;
    }
    
    // 更新全局数据对象
    customIntensityData.x_unit = unit;
    customIntensityData.unit_scale = factor;
    
    // 更新状态显示中的单位信息（已应用状态）
    const statusDiv = document.getElementById('intensity-data-status');
    if (statusDiv) {
        const statusTitle = statusDiv.querySelector('.status-title');
        if (statusTitle) {
            const unitInfo = statusTitle.querySelector('.unit-info');
            if (unitInfo) {
                unitInfo.textContent = `(单位: ${unit}, 比例: ×${factor})`;
                unitInfo.style.color = '#666'; // 恢复正常颜色
            }
        }
    }
    
    console.log(`🔄 应用单位设置: ${unit}, 比例因子: ${factor}`);
}

// ===============================
// 我的工作间相关功能
// ===============================

// 示例文件数据存储
let exampleFilesData = [];
let currentPreviewFile = null;
let isEditingFile = false;

// 筛选功能相关变量
// 全局变量，存储当前的筛选条件
let currentFilters = {
    types: new Set(),
    sizes: new Set(),
    extensions: new Set()
};
let allFileTypes = new Set();
let allExtensions = new Set();

// 文件模板
const FILE_TEMPLATES = {
    empty: "",
    
    // 光强分布文件模板
    intensity_simple: `# 简单光强分布样例数据
# 格式: x坐标 光强值
# 单位: x(um) I(mW/cm²)
0.0 10.0
1.0 10.5
2.0 11.2
3.0 12.0
4.0 12.8
5.0 13.5
6.0 14.0
7.0 14.2
8.0 14.0
9.0 13.5
10.0 12.8`,
    
    intensity_gaussian: `# 高斯光强分布数据
# 参数: 中心位置=5μm, σ=2μm, 峰值强度=20mW/cm²
# 格式: x(μm) I(mW/cm²)
0.0 1.35
1.0 3.68
2.0 8.11
3.0 14.65
4.0 21.46
5.0 25.00
6.0 21.46
7.0 14.65
8.0 8.11
9.0 3.68
10.0 1.35`,
    
    intensity_complex: `{
    "format": "intensity_distribution",
    "version": "1.0",
    "metadata": {
        "description": "复杂光强分布示例",
        "unit_x": "μm",
        "unit_intensity": "mW/cm²"
    },
    "data": {
        "x": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "intensity": [10.0, 10.5, 11.2, 12.0, 12.8, 13.5, 14.0, 14.2, 14.0, 13.5, 12.8]
    }
}`,
    
    sine_wave: `{
    "format": "intensity_distribution",
    "version": "1.0",
    "metadata": {
        "description": "正弦波光强分布示例",
        "unit_x": "μm",
        "unit_intensity": "mW/cm²",
        "wavelength": 405,
        "pattern_type": "sine_wave"
    },
    "parameters": {
        "I_avg": 15.0,
        "V": 0.8,
        "K": 2.0
    },
    "data": {
        "x": [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        "intensity": [27.0, 25.6, 22.0, 16.5, 10.2, 4.5, 0.8, 0.0, 2.2, 7.0, 13.5]
    }
}`,
    
    // CSV数据模板
    csv_basic: `文件名,扩展名,大小(KB),创建时间,描述
intensity_example.txt,txt,1.2,2024-01-15 10:30:00,简单光强分布数据
intensity_complex.json,json,2.8,2024-01-15 11:15:00,复杂光强分布JSON格式
gaussian_profile.dat,dat,1.8,2024-01-15 12:00:00,高斯分布轮廓数据`,
    
    csv_experiment: `实验编号,样品名称,曝光时间(s),光强(mW/cm²),温度(°C),湿度(%),结果
EXP001,Sample_A,30,15.5,25.2,45,成功
EXP002,Sample_B,45,18.2,24.8,47,成功
EXP003,Sample_C,60,12.1,26.1,43,失败
EXP004,Sample_D,30,20.0,25.0,44,成功`,
    
    // 配置文件模板
    config_json: `{
    "experiment": {
        "name": "光刻实验配置",
        "version": "1.0",
        "created": "2024-01-15T10:00:00Z"
    },
    "parameters": {
        "wavelength": 405,
        "exposure_time": 30,
        "intensity": 15.5,
        "temperature": 25.0
    },
    "materials": {
        "photoresist": "AZ_1518",
        "substrate": "Silicon",
        "developer": "AZ_400K"
    },
    "output": {
        "format": "txt",
        "precision": 3,
        "units": {
            "length": "μm",
            "intensity": "mW/cm²",
            "time": "seconds"
        }
    }
}`,
    
    // 日志文件模板
    log_experiment: `[2024-01-15 10:00:00] INFO: 实验开始 - 光刻工艺测试
[2024-01-15 10:00:01] INFO: 加载配置文件: config.json
[2024-01-15 10:00:02] INFO: 初始化设备连接
[2024-01-15 10:00:05] INFO: 设备状态检查完成
[2024-01-15 10:00:10] INFO: 开始曝光过程
[2024-01-15 10:00:40] INFO: 曝光完成, 时长: 30s
[2024-01-15 10:00:45] WARN: 温度略高于设定值 (26.2°C vs 25.0°C)
[2024-01-15 10:01:00] INFO: 显影过程开始
[2024-01-15 10:03:00] INFO: 显影完成
[2024-01-15 10:03:30] INFO: 实验结束 - 结果：成功`,
    
    // MATLAB脚本模板
    matlab_analysis: `% 光强分布数据分析脚本
% 作者: DILL系统
% 创建时间: 2024-01-15

function result = analyze_intensity_distribution(filename)
    % 加载数据文件
    data = load(filename);
    x = data(:,1);
    intensity = data(:,2);
    
    % 基本统计分析
    max_intensity = max(intensity);
    min_intensity = min(intensity);
    mean_intensity = mean(intensity);
    std_intensity = std(intensity);
    
    % 查找峰值位置
    [peaks, peak_indices] = findpeaks(intensity);
    peak_positions = x(peak_indices);
    
    % 计算FWHM (半高全宽)
    half_max = max_intensity / 2;
    indices = find(intensity >= half_max);
    if ~isempty(indices)
        fwhm = x(indices(end)) - x(indices(1));
    else
        fwhm = 0;
    end
    
    % 生成结果结构
    result.max_intensity = max_intensity;
    result.min_intensity = min_intensity;
    result.mean_intensity = mean_intensity;
    result.std_intensity = std_intensity;
    result.peak_positions = peak_positions;
    result.fwhm = fwhm;
    
    % 绘制结果
    figure;
    plot(x, intensity, 'b-', 'LineWidth', 2);
    hold on;
    plot(peak_positions, peaks, 'ro', 'MarkerSize', 8);
    xlabel('位置 (μm)');
    ylabel('光强 (mW/cm²)');
    title('光强分布分析');
    grid on;
    
    fprintf('分析完成:\\n');
    fprintf('最大光强: %.2f mW/cm²\\n', max_intensity);
    fprintf('平均光强: %.2f mW/cm²\\n', mean_intensity);
    fprintf('FWHM: %.2f μm\\n', fwhm);
end`,
    
    // Python脚本模板
    python_analysis: `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
光强分布数据分析工具
作者: DILL系统
创建时间: 2024-01-15
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy.signal import find_peaks
from scipy.optimize import curve_fit
import pandas as pd

class IntensityAnalyzer:
    def __init__(self, filename):
        """初始化分析器"""
        self.filename = filename
        self.data = self.load_data()
        
    def load_data(self):
        """加载数据文件"""
        try:
            # 尝试加载为CSV
            data = pd.read_csv(self.filename)
            return data
        except:
            # 尝试加载为文本文件
            data = np.loadtxt(self.filename)
            return pd.DataFrame(data, columns=['x', 'intensity'])
    
    def gaussian_fit(self, x, a, mu, sigma, offset):
        """高斯拟合函数"""
        return a * np.exp(-((x - mu) ** 2) / (2 * sigma ** 2)) + offset
    
    def analyze(self):
        """执行完整分析"""
        x = self.data['x']
        intensity = self.data['intensity']
        
        # 基本统计
        stats = {
            'max_intensity': intensity.max(),
            'min_intensity': intensity.min(),
            'mean_intensity': intensity.mean(),
            'std_intensity': intensity.std()
        }
        
        # 峰值检测
        peaks, _ = find_peaks(intensity, height=intensity.mean())
        peak_positions = x.iloc[peaks].values
        
        # 高斯拟合
        try:
            popt, _ = curve_fit(self.gaussian_fit, x, intensity, 
                              p0=[intensity.max(), x.iloc[intensity.idxmax()], 1, intensity.min()])
            fit_params = {
                'amplitude': popt[0],
                'center': popt[1], 
                'sigma': popt[2],
                'offset': popt[3]
            }
        except:
            fit_params = None
        
        return {
            'statistics': stats,
            'peaks': peak_positions,
            'gaussian_fit': fit_params
        }
    
    def plot_results(self, results):
        """绘制分析结果"""
        x = self.data['x']
        intensity = self.data['intensity']
        
        plt.figure(figsize=(10, 6))
        plt.plot(x, intensity, 'b-', linewidth=2, label='原始数据')
        
        # 绘制峰值
        peaks = results['peaks']
        if len(peaks) > 0:
            peak_intensities = [intensity.iloc[np.argmin(np.abs(x - p))] for p in peaks]
            plt.plot(peaks, peak_intensities, 'ro', markersize=8, label='峰值')
        
        # 绘制高斯拟合
        if results['gaussian_fit']:
            params = results['gaussian_fit']
            x_fit = np.linspace(x.min(), x.max(), 200)
            y_fit = self.gaussian_fit(x_fit, **params)
            plt.plot(x_fit, y_fit, 'r--', linewidth=2, label='高斯拟合')
        
        plt.xlabel('位置 (μm)')
        plt.ylabel('光强 (mW/cm²)')
        plt.title('光强分布分析')
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.show()

# 使用示例
if __name__ == "__main__":
    analyzer = IntensityAnalyzer("intensity_data.txt")
    results = analyzer.analyze()
    analyzer.plot_results(results)
    print("分析完成！")`,
    
    // Markdown文档模板
    markdown_doc: `# 光刻实验文档

## 概述
本文档记录了光刻实验的详细流程和结果分析。

## 实验参数

| 参数 | 数值 | 单位 |
|------|------|------|
| 波长 | 405 | nm |
| 曝光时间 | 30 | s |
| 光强 | 15.5 | mW/cm² |
| 温度 | 25.0 | °C |

## 实验流程

1. **设备准备**
   - 检查光源稳定性
   - 校准功率计
   - 清洁样品台

2. **样品制备**
   - 涂覆光刻胶
   - 软烘处理
   - 厚度测量

3. **曝光过程**
   - 样品对准
   - 设置曝光参数
   - 执行曝光

4. **后处理**
   - 曝光后烘烤
   - 显影处理
   - 结果检测

## 数据分析

### 光强分布特征
- 最大光强: 20.5 mW/cm²
- 平均光强: 15.2 mW/cm²
- 均匀性: 95.2%

### 结果评估
实验结果符合预期，光强分布均匀，工艺参数优化成功。

## 结论
本次实验验证了优化后的光刻工艺参数的有效性，可用于后续批量生产。

---
*文档生成时间: 2024-01-15 14:30:00*
*版本: v1.0*`
};

// 初始化我的工作间
function initExampleFilesManager() {
    const exampleFilesBtn = document.getElementById('example-files-btn');
    if (exampleFilesBtn) {
        exampleFilesBtn.addEventListener('click', openExampleFilesModal);
    }
    
    // 绑定模态框事件
    bindExampleFilesModalEvents();
    bindFilePreviewModalEvents();
    bindFilterEvents();
    
    // 检查筛选按钮是否正确显示
    checkFilterButtonDisplay();
}

// 绑定示例文件模态框事件
function bindExampleFilesModalEvents() {
    const modal = document.getElementById('example-files-modal');
    const closeBtn = modal.querySelector('.example-files-close');
    const refreshBtn = document.getElementById('refresh-files-btn');
    const searchInput = document.getElementById('file-search-input');
    const createFileBtn = document.getElementById('create-file-btn');
    const uploadFileBtn = document.getElementById('upload-file-btn');
    const uploadFileInput = document.getElementById('upload-file-input');
    
    // 关闭模态框
    closeBtn.addEventListener('click', closeExampleFilesModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeExampleFilesModal();
        }
    });
    
    // 刷新文件列表
    refreshBtn.addEventListener('click', loadExampleFiles);
    
    // 搜索功能
    searchInput.addEventListener('input', filterFileList);
    
    // 新增按钮功能
    createFileBtn.addEventListener('click', showCreateFileModal);
    
    // 上传按钮功能
    uploadFileBtn.addEventListener('click', () => {
        uploadFileInput.click();
    });
    
    // 文件选择事件
    uploadFileInput.addEventListener('change', handleExampleFileUpload);
}

// 绑定文件预览模态框事件
function bindFilePreviewModalEvents() {
    const modal = document.getElementById('file-preview-modal');
    const closeBtn = modal.querySelector('.file-preview-close');
    const editBtn = document.getElementById('edit-file-btn');
    const downloadBtn = document.getElementById('download-file-btn');
    const useBtn = document.getElementById('use-file-btn');
    const saveBtn = document.getElementById('save-changes-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    
    // 关闭模态框
    closeBtn.addEventListener('click', closeFilePreviewModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFilePreviewModal();
        }
    });
    
    // 功能按钮
    editBtn.addEventListener('click', toggleEditMode);
    downloadBtn.addEventListener('click', downloadCurrentFile);
    // useBtn.addEventListener('click', useCurrentFile); // 按钮已注释，跳过事件绑定
    if (useBtn) {
        useBtn.addEventListener('click', useCurrentFile);
    }
    saveBtn.addEventListener('click', saveFileChanges);
    cancelBtn.addEventListener('click', cancelEditMode);
}

// 绑定筛选功能事件
function bindFilterEvents() {
    const filterToggleBtn = document.getElementById('filter-toggle-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    const clearAllFiltersBtn = document.getElementById('clear-all-filters');
    const applyFiltersBtn = document.getElementById('apply-filters');
    
    // 筛选按钮点击事件
    filterToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFilterDropdown();
    });
    
    // 点击外部关闭筛选下拉框
    document.addEventListener('click', (e) => {
        if (!filterDropdown.contains(e.target) && !filterToggleBtn.contains(e.target)) {
            hideFilterDropdown();
        }
    });
    
    // 清除所有筛选
    clearAllFiltersBtn.addEventListener('click', clearAllFilters);
    
    // 应用筛选
    applyFiltersBtn.addEventListener('click', applyFilters);
    
    // 单独清除筛选按钮事件
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('clear-filter')) {
            const filterType = e.target.getAttribute('data-filter');
            clearSpecificFilter(filterType);
        }
    });
    
    // 窗口大小变化时关闭筛选下拉菜单
    window.addEventListener('resize', () => {
        const filterDropdown = document.getElementById('filter-dropdown');
        if (filterDropdown.style.display === 'block') {
            hideFilterDropdown();
        }
    });
    
    // 在绑定事件时初始化筛选计数状态
    initFilterCountStatus();
}

// 初始化筛选计数状态
function initFilterCountStatus() {
    // 确保筛选条件为空
    currentFilters.types.clear();
    currentFilters.sizes.clear();
    currentFilters.extensions.clear();
    
    // 更新筛选计数显示
    const filterCount = document.getElementById('filter-count');
    if (filterCount) {
        filterCount.style.display = 'none';
        filterCount.textContent = '';
    }
    
    console.log('✅ 已初始化筛选计数状态');
}

// 打开我的工作间模态框
function openExampleFilesModal() {
    const modal = document.getElementById('example-files-modal');
    modal.style.display = 'flex';
    
    // 每次打开模态框时重置筛选计数和状态
    resetFilterCount();
    
    // 加载文件列表
    loadExampleFiles();
}

// 关闭我的工作间模态框
function closeExampleFilesModal() {
    const modal = document.getElementById('example-files-modal');
    modal.style.display = 'none';
    
    // 重置筛选计数和筛选条件
    resetFilterCount();
}

// 重置筛选计数器和状态
function resetFilterCount() {
    // 清除所有筛选条件
    currentFilters.types.clear();
    currentFilters.sizes.clear();
    currentFilters.extensions.clear();
    
    // 更新筛选计数显示
    const filterCount = document.getElementById('filter-count');
    if (filterCount) {
        filterCount.style.display = 'none';
    }
    
    // 取消选中所有筛选复选框
    const checkboxes = document.querySelectorAll('#filter-dropdown input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    console.log('✅ 已重置筛选状态和计数');
}

// 加载示例文件列表
async function loadExampleFiles() {
    try {
        showLoadingInFileList('正在加载示例文件...');
        
        const response = await fetch('/api/example-files');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        // 检查API响应格式
        if (!responseData.success) {
            throw new Error(responseData.message || '获取示例文件失败');
        }
        
        const files = responseData.data || [];
        exampleFilesData = files;
        updateFilterOptions(files);
        renderFileList(files);
        
    } catch (error) {
        console.error('加载示例文件失败:', error);
        showErrorInFileList('加载示例文件失败: ' + error.message);
    }
}

// 显示文件列表加载状态
function showLoadingInFileList(message) {
    const filesList = document.getElementById('example-files-list');
    filesList.innerHTML = `
        <div class="loading-message" style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
            <div>${message}</div>
        </div>
    `;
}

// 显示文件列表错误状态
function showErrorInFileList(message) {
    const filesList = document.getElementById('example-files-list');
    filesList.innerHTML = `
        <div class="error-message" style="text-align: center; padding: 40px; color: #e74c3c;">
            <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
            <div>${message}</div>
            <button onclick="loadExampleFiles()" style="margin-top: 15px; padding: 8px 16px; background: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-sync-alt"></i> 重试
            </button>
        </div>
    `;
}

// 文件自动分类函数
function categorizeFilesByType(files) {
    // 定义文件类型分类和优先级
    const fileTypeCategories = {
        'intensity': {
            name: '光强分布文件',
            extensions: ['txt', 'dat', 'asc'],
            priority: 1,
            icon: 'fas fa-chart-line',
            color: '#4CAF50'
        },
        'json': {
            name: 'JSON数据文件',
            extensions: ['json'],
            priority: 2,
            icon: 'fas fa-file-code',
            color: '#2196F3'
        },
        'backup': {
            name: '备份文件',
            extensions: ['backup', 'bak'],
            priority: 3,
            icon: 'fas fa-file-archive',
            color: '#FF9800'
        },
        'table': {
            name: '表格数据文件',
            extensions: ['csv', 'tsv', 'tab', 'xlsx', 'xls'],
            priority: 4,
            icon: 'fas fa-table',
            color: '#4CAF50'
        },
        'document': {
            name: '文档文件',
            extensions: ['pdf', 'doc', 'docx', 'md', 'rtf'],
            priority: 5,
            icon: 'fas fa-file-alt',
            color: '#607D8B'
        },
        'code': {
            name: '代码文件',
            extensions: ['js', 'py', 'html', 'css', 'xml', 'php', 'cpp', 'c', 'java'],
            priority: 6,
            icon: 'fas fa-file-code',
            color: '#2196F3'
        },
        'simulation': {
            name: '仿真文件',
            extensions: ['pli', 'ldf', 'msk', 'int', 'pro', 'sim', 'slf', 'fdt', 'mat', 'm'],
            priority: 7,
            icon: 'fas fa-microchip',
            color: '#9C27B0'
        },
        'log': {
            name: '日志文件',
            extensions: ['log', 'out', 'lis'],
            priority: 8,
            icon: 'fas fa-file-lines',
            color: '#9E9E9E'
        },
        'archive': {
            name: '压缩文件',
            extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bin'],
            priority: 9,
            icon: 'fas fa-file-archive',
            color: '#424242'
        },
        'media': {
            name: '媒体文件',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'tiff', 'mp4', 'avi', 'mov', 'wmv', 'mp3', 'wav', 'flac', 'aac'],
            priority: 10,
            icon: 'fas fa-file-image',
            color: '#FF7043'
        },
        'other': {
            name: '其他文件',
            extensions: [],
            priority: 999,
            icon: 'fas fa-file',
            color: '#607D8B'
        }
    };
    
    // 为每个文件分配类型
    const categorizedFiles = {};
    
    files.forEach(file => {
        const extension = file.extension.toLowerCase();
        let categoryKey = 'other';
        
        // 查找匹配的文件类型
        for (const [key, category] of Object.entries(fileTypeCategories)) {
            if (category.extensions.includes(extension)) {
                categoryKey = key;
                break;
            }
        }
        
        // 初始化分类数组
        if (!categorizedFiles[categoryKey]) {
            categorizedFiles[categoryKey] = {
                category: fileTypeCategories[categoryKey],
                files: []
            };
        }
        
        categorizedFiles[categoryKey].files.push(file);
    });
    
    // 按优先级排序类别，并在每个类别内按文件名排序
    const sortedCategories = Object.keys(categorizedFiles)
        .sort((a, b) => {
            const categoryA = fileTypeCategories[a];
            const categoryB = fileTypeCategories[b];
            return categoryA.priority - categoryB.priority;
        });
    
    // 对每个类别内的文件按名称排序
    sortedCategories.forEach(categoryKey => {
        categorizedFiles[categoryKey].files.sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return { categorizedFiles, sortedCategories };
}

// 渲染文件列表
function renderFileList(files) {
    const filesList = document.getElementById('example-files-list');
    
    if (!files || files.length === 0) {
        filesList.innerHTML = `
            <div class="empty-message" style="text-align: center; padding: 40px; color: #999;">
                <i class="fas fa-folder-open" style="font-size: 24px; margin-bottom: 10px;"></i>
                <div>没有找到示例文件</div>
            </div>
        `;
        return;
    }
    
    // 文件自动分类 - 按文件类型分组
    const { categorizedFiles, sortedCategories } = categorizeFilesByType(files);
    
    // 获取文件类型的备用文本
    const getFallbackText = (extension) => {
        const fallbackMap = {
            'txt': 'TXT', 'rtf': 'RTF', 'md': 'MD',
            'csv': 'CSV', 'tsv': 'TSV', 'tab': 'TAB', 'dat': 'DAT', 'asc': 'ASC',
            'json': 'JSON', 'xml': 'XML', 'js': 'JS', 'py': 'PY', 'html': 'HTML', 'css': 'CSS',
            'xlsx': 'XLS', 'xls': 'XLS', 'xlsm': 'XLS',
            'mat': 'MAT', 'm': 'M',
            'pli': 'PLI', 'ldf': 'LDF', 'msk': 'MSK', 'int': 'INT', 'pro': 'PRO', 'sim': 'SIM',
            'log': 'LOG', 'out': 'OUT', 'lis': 'LIS',
            'zip': 'ZIP', 'rar': 'RAR', '7z': '7Z', 'tar': 'TAR', 'gz': 'GZ',
            'pdf': 'PDF', 'doc': 'DOC', 'docx': 'DOC', 'ppt': 'PPT', 'pptx': 'PPT',
            'jpg': 'IMG', 'jpeg': 'IMG', 'png': 'IMG', 'gif': 'IMG', 'svg': 'IMG',
            'mp4': 'VID', 'avi': 'VID', 'mov': 'VID', 'mp3': 'AUD', 'wav': 'AUD'
        };
        return fallbackMap[extension.toLowerCase()] || extension.toUpperCase().substring(0, 3);
    };
    
    // 生成分类后的HTML
    let categorizedHtml = '';
    
    sortedCategories.forEach(categoryKey => {
        const categoryData = categorizedFiles[categoryKey];
        const category = categoryData.category;
        const categoryFiles = categoryData.files;
        
        // 分类标题 - 修改样式，去掉左侧颜色实心栏，改为简洁现代的样式
        categorizedHtml += `
            <div class="file-category-header" style="
                display: flex; 
                align-items: center; 
                margin: 20px 0 10px 0; 
                padding: 12px 15px; 
                background: linear-gradient(135deg, ${category.color}10, ${category.color}05);
                border-bottom: 1px solid ${category.color}40;
                border-radius: 8px;
                font-weight: 600;
                color: #333;
                position: sticky;
                top: 0;
                z-index: 5;
                backdrop-filter: blur(10px);
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            ">
                <i class="${category.icon}" style="color: ${category.color}; margin-right: 10px; font-size: 16px;"></i>
                <span>${category.name}</span>
                <span style="
                    margin-left: auto; 
                    background: ${category.color}; 
                    color: white; 
                    padding: 2px 8px; 
                    border-radius: 12px; 
                    font-size: 12px; 
                    font-weight: 500;
                ">${categoryFiles.length}</span>
            </div>
        `;
        
        // 该分类下的文件
        const categoryFilesHtml = categoryFiles.map((file, index) => `
            <div class="file-item" data-filename="${file.name}" data-category="${categoryKey}" data-index="${index}" draggable="true">
                <div class="drag-handle" title="拖拽排序">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="file-info-left">
                    <div class="file-icon fallback-icon" style="background-color: ${getFileColorByType(file.extension)}; color: white;" data-fallback="${getFallbackText(file.extension)}">
                        <i class="fas ${getFileIcon(file.extension)}"></i>
                    </div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">${file.extension.toUpperCase()} • ${formatFileSize(file.size)} • ${file.description || '示例数据文件'}</div>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn preview-btn" onclick="previewFile('${file.name}')" type="button" title="预览">
                        <i class="fas fa-eye"></i> 预览
                    </button>
                    <button class="file-action-btn use-btn" onclick="useFileDirectly('${file.name}')" type="button" title="使用">
                        <i class="fas fa-check"></i> 使用
                    </button>
                    <button class="file-action-btn delete-btn" onclick="confirmDeleteFile('${file.name}')" type="button" title="删除">
                        <i class="fas fa-times"></i> 删除
                    </button>
                    <!-- 备用删除链接，如果JavaScript方法失效可以直接点击 -->
                    <a href="/api/example-files/action?action=delete&filename=${encodeURIComponent(file.name)}" 
                       class="backup-delete-link" 
                       onclick="event.preventDefault(); confirmDeleteFile('${file.name}'); return false;" 
                       style="display:none;">删除</a>
                </div>
            </div>
        `).join('');
        
        categorizedHtml += categoryFilesHtml;
    });
    
    filesList.innerHTML = categorizedHtml;
    
    // 初始化拖拽功能
    initializeDragAndDrop();
}

// 获取文件颜色
function getFileColorByType(extension) {
    const colorMap = {
        // 文本文件 - 蓝灰色系
        'txt': '#607D8B',
        'rtf': '#546E7A',
        'md': '#455A64',
        
        // 数据文件 - 绿色系
        'csv': '#4CAF50',
        'tsv': '#66BB6A',
        'tab': '#81C784',
        'dat': '#795548',
        'asc': '#8BC34A',
        
        // 代码文件 - 蓝色系
        'json': '#2196F3',
        'xml': '#1976D2',
        'js': '#FFC107',
        'py': '#3776AB',
        'html': '#E34F26',
        'css': '#1572B6',
        'php': '#777BB4',
        'cpp': '#00599C',
        'c': '#A8B9CC',
        'java': '#ED8B00',
        
        // Excel文件 - 绿色系
        'xlsx': '#217346',
        'xls': '#217346',
        'xlsm': '#1B5E20',
        
        // MATLAB文件 - 橙红色系
        'mat': '#E91E63',
        'm': '#F06292',
        
        // 光刻仿真文件 - 紫色系
        'pli': '#9C27B0',
        'ldf': '#673AB7',
        'msk': '#3F51B5',
        'int': '#FF9800',
        'pro': '#009688',
        'sim': '#FF5722',
        'slf': '#8E24AA',
        'fdt': '#7B1FA2',
        
        // 日志文件 - 灰色系
        'log': '#9E9E9E',
        'out': '#757575',
        'lis': '#616161',
        
        // 压缩文件 - 深色系
        'zip': '#424242',
        'rar': '#37474F',
        '7z': '#263238',
        'tar': '#455A64',
        'gz': '#546E7A',
        'bin': '#607D8B',
        
        // 文档文件 - 专业色系
        'pdf': '#D32F2F',
        'doc': '#1976D2',
        'docx': '#1565C0',
        'ppt': '#D84315',
        'pptx': '#BF360C',
        
        // 图像文件 - 暖色系
        'jpg': '#FF7043',
        'jpeg': '#FF6F00',
        'png': '#FF8F00',
        'gif': '#FFA000',
        'svg': '#FFB300',
        'bmp': '#FFC107',
        'tiff': '#FFD54F',
        
        // 音视频文件 - 紫红色系
        'mp4': '#8E24AA',
        'avi': '#7B1FA2',
        'mov': '#6A1B9A',
        'wmv': '#4A148C',
        'mp3': '#E91E63',
        'wav': '#C2185B',
        'flac': '#AD1457',
        'aac': '#880E4F'
    };
    
    const ext = extension.toLowerCase();
    const color = colorMap[ext];
    
    // 如果找不到对应颜色，根据文件类型返回默认颜色
    if (!color) {
        if (['txt', 'rtf', 'md', 'readme'].includes(ext)) {
            return '#607D8B';  // 文本文件默认色
        } else if (['dat', 'csv', 'tsv', 'tab'].includes(ext)) {
            return '#4CAF50';  // 数据文件默认色
        } else if (['json', 'xml', 'js', 'py', 'html', 'css'].includes(ext)) {
            return '#2196F3';  // 代码文件默认色
        } else {
            return '#607D8B';  // 通用默认色
        }
    }
    
    return color;
}

// 直接使用文件（不预览）
async function useFileDirectly(filename) {
    try {
        currentPreviewFile = filename;
        
        const response = await fetch(`/api/example-files/${encodeURIComponent(filename)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        // 检查API响应格式
        if (!responseData.success) {
            throw new Error(responseData.message || '获取文件内容失败');
        }
        
        const fileData = responseData.data;
        const content = fileData.content;
        
        // 安全地获取文件扩展名
        let fileExtension = '.txt'; // 默认扩展名
        if (filename && typeof filename === 'string' && filename.includes('.')) {
            const parts = filename.split('.');
            if (parts.length > 1) {
                fileExtension = '.' + parts[parts.length - 1].toLowerCase();
            }
        }
        
        // 关闭示例文件管理模态框
        closeExampleFilesModal();
        
        // 确定文件的MIME类型
        let mimeType = 'text/plain';
        if (fileExtension === '.json') {
            mimeType = 'application/json';
        } else if (fileExtension === '.csv') {
            mimeType = 'text/csv';
        } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
            mimeType = 'application/vnd.ms-excel';
        } else if (fileExtension === '.dat' || fileExtension === '.tab' || fileExtension === '.asc') {
            mimeType = 'text/plain';
        }
        
        // 创建一个临时的Blob文件
        const blob = new Blob([content], { type: mimeType });
        const file = new File([blob], filename, { type: mimeType });
        
        // 使用现有的文件处理函数
        handleFileUpload(file);
        
        showNotification(`已应用示例文件: ${filename}`, 'success');
        
    } catch (error) {
        console.error('使用文件失败:', error);
        showNotification('使用文件失败: ' + error.message, 'error');
    }
}

// 获取文件图标
function getFileIcon(extension) {
    const iconMap = {
        // 文本文件
        'txt': 'fa-file-lines',
        'rtf': 'fa-file-lines',
        'md': 'fa-file-lines',
        
        // 数据文件
        'csv': 'fa-file-csv',
        'tsv': 'fa-table',
        'tab': 'fa-table',
        'dat': 'fa-database',
        'asc': 'fa-chart-line',
        
        // 代码文件
        'json': 'fa-file-code',
        'xml': 'fa-file-code',
        'js': 'fa-file-code',
        'py': 'fa-file-code',
        'html': 'fa-file-code',
        'css': 'fa-file-code',
        'php': 'fa-file-code',
        'cpp': 'fa-file-code',
        'c': 'fa-file-code',
        'java': 'fa-file-code',
        
        // Excel文件
        'xlsx': 'fa-file-excel',
        'xls': 'fa-file-excel',
        'xlsm': 'fa-file-excel',
        
        // MATLAB文件
        'mat': 'fa-cube',
        'm': 'fa-cube',
        
        // 光刻仿真文件
        'pli': 'fa-microchip',
        'ldf': 'fa-microscope',
        'msk': 'fa-layer-group',
        'int': 'fa-chart-line',
        'pro': 'fa-cogs',
        'sim': 'fa-terminal',
        'slf': 'fa-wave-square',
        'fdt': 'fa-chart-area',
        
        // 日志文件
        'log': 'fa-clipboard-list',
        'out': 'fa-file-lines',
        'lis': 'fa-list',
        
        // 压缩文件
        'zip': 'fa-file-zipper',
        'rar': 'fa-file-zipper',
        '7z': 'fa-file-zipper',
        'tar': 'fa-file-zipper',
        'gz': 'fa-file-zipper',
        'bin': 'fa-file-zipper',
        
        // 文档文件
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'ppt': 'fa-file-powerpoint',
        'pptx': 'fa-file-powerpoint',
        
        // 图像文件
        'jpg': 'fa-file-image',
        'jpeg': 'fa-file-image',
        'png': 'fa-file-image',
        'gif': 'fa-file-image',
        'svg': 'fa-file-image',
        'bmp': 'fa-file-image',
        'tiff': 'fa-file-image',
        
        // 音视频文件
        'mp4': 'fa-file-video',
        'avi': 'fa-file-video',
        'mov': 'fa-file-video',
        'wmv': 'fa-file-video',
        'mp3': 'fa-file-audio',
        'wav': 'fa-file-audio',
        'flac': 'fa-file-audio',
        'aac': 'fa-file-audio'
    };
    
    const ext = extension.toLowerCase();
    const icon = iconMap[ext];
    
    // 如果找不到对应图标，根据文件类型返回通用图标
    if (!icon) {
        if (['txt', 'rtf', 'md', 'readme'].includes(ext)) {
            return 'fa-file-lines';
        } else if (['dat', 'csv', 'tsv', 'tab'].includes(ext)) {
            return 'fa-table';
        } else if (['json', 'xml', 'js', 'py', 'html', 'css'].includes(ext)) {
            return 'fa-file-code';
        } else {
            return 'fa-file';
        }
    }
    
    return icon;
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 过滤文件列表
function filterFileList() {
    const searchTerm = document.getElementById('file-search-input').value.toLowerCase();
    const filteredFiles = exampleFilesData.filter(file => 
        file.name.toLowerCase().includes(searchTerm) ||
        file.extension.toLowerCase().includes(searchTerm) ||
        (file.description && file.description.toLowerCase().includes(searchTerm))
    );
    renderFileList(filteredFiles);
}

// 预览文件
async function previewFile(filename) {
    try {
        currentPreviewFile = filename;
        showFilePreviewModal(filename);
        
        const response = await fetch(`/api/example-files/${encodeURIComponent(filename)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        // 检查API响应格式
        if (!responseData.success) {
            throw new Error(responseData.message || '获取文件内容失败');
        }
        
        const fileData = responseData.data;
        displayFileContent(fileData);
        
    } catch (error) {
        console.error('预览文件失败:', error);
        showNotification('预览文件失败: ' + error.message, 'error');
    }
}

// 显示文件预览模态框
function showFilePreviewModal(filename) {
    const modal = document.getElementById('file-preview-modal');
    const title = document.getElementById('preview-file-title');
    
    title.innerHTML = `<i class="fas fa-file-alt"></i> ${filename}`;
    modal.style.display = 'flex';
}

// 关闭文件预览模态框
function closeFilePreviewModal() {
    const modal = document.getElementById('file-preview-modal');
    modal.style.display = 'none';
    currentPreviewFile = null;
    isEditingFile = false;
    
    // 重置编辑状态
    const editor = document.getElementById('file-content-editor');
    const editActions = document.getElementById('edit-actions');
    editor.readOnly = true;
    editActions.style.display = 'none';
}

// 显示文件内容
function displayFileContent(fileData) {
    const editor = document.getElementById('file-content-editor');
    const formatInfo = document.getElementById('file-format-info');
    const sizeInfo = document.getElementById('file-size-info');
    
    editor.value = fileData.content;
    formatInfo.textContent = `格式: ${fileData.format}`;
    sizeInfo.textContent = `大小: ${formatFileSize(fileData.size)}`;
}

// 切换编辑模式
function toggleEditMode() {
    const editor = document.getElementById('file-content-editor');
    const editActions = document.getElementById('edit-actions');
    
    isEditingFile = !isEditingFile;
    editor.readOnly = !isEditingFile;
    editActions.style.display = isEditingFile ? 'flex' : 'none';
    
    if (isEditingFile) {
        editor.focus();
        showNotification('已进入编辑模式', 'success');
    }
}

// 取消编辑模式
function cancelEditMode() {
    const editor = document.getElementById('file-content-editor');
    const editActions = document.getElementById('edit-actions');
    
    isEditingFile = false;
    editor.readOnly = true;
    editActions.style.display = 'none';
    
    // 重新加载原始内容
    if (currentPreviewFile) {
        previewFile(currentPreviewFile);
    }
    
    showNotification('已取消编辑', 'info');
}

// 保存文件更改
async function saveFileChanges() {
    if (!currentPreviewFile) return;
    
    try {
        const editor = document.getElementById('file-content-editor');
        const content = editor.value;
        
        const response = await fetch(`/api/example-files/${encodeURIComponent(currentPreviewFile)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        // 检查API响应格式
        if (!responseData.success) {
            throw new Error(responseData.message || '保存文件失败');
        }
        
        showNotification('文件保存成功', 'success');
        toggleEditMode(); // 退出编辑模式
        
    } catch (error) {
        console.error('保存文件失败:', error);
        showNotification('保存文件失败: ' + error.message, 'error');
    }
}

// 下载当前文件
function downloadCurrentFile() {
    if (!currentPreviewFile) return;
    
    const editor = document.getElementById('file-content-editor');
    const content = editor.value;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = currentPreviewFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    showNotification('文件下载完成', 'success');
}

// 使用当前文件
function useCurrentFile() {
    if (!currentPreviewFile) return;
    
    const editor = document.getElementById('file-content-editor');
    const content = editor.value;
    
    // 获取文件扩展名（确保小写且包含点号）
    const fileExtension = '.' + currentPreviewFile.split('.').pop().toLowerCase();
    
    // 关闭预览模态框
    closeFilePreviewModal();
    
    // 关闭示例文件管理模态框
    closeExampleFilesModal();
    
    // 确定文件的MIME类型
    let mimeType = 'text/plain';
    if (fileExtension === '.json') {
        mimeType = 'application/json';
    } else if (fileExtension === '.csv') {
        mimeType = 'text/csv';
    } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
        mimeType = 'application/vnd.ms-excel';
    } else if (fileExtension === '.dat' || fileExtension === '.tab' || fileExtension === '.asc') {
        mimeType = 'text/plain';
    }
    
    try {
        // 创建一个临时的Blob文件
        const blob = new Blob([content], { type: mimeType });
        const file = new File([blob], currentPreviewFile, { type: mimeType });
        
        // 使用现有的文件处理函数
        handleFileUpload(file);
        
        // 显示成功通知
        showNotification(`已应用示例文件: ${currentPreviewFile}`, 'success');
    } catch (error) {
        console.error('应用文件失败:', error);
        showNotification('应用文件失败: ' + error.message, 'error');
    }
}

// 检查Font Awesome图标是否加载成功
function checkFontAwesome() {
    const testElement = document.createElement('i');
    testElement.className = 'fas fa-file';
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    document.body.appendChild(testElement);
    
    const computedStyle = window.getComputedStyle(testElement, ':before');
    const isLoaded = computedStyle.getPropertyValue('font-family').includes('Font Awesome');
    
    document.body.removeChild(testElement);
    
    if (!isLoaded) {
        console.warn('Font Awesome 图标库加载失败，使用备用显示方案');
        // 添加备用CSS样式
        const style = document.createElement('style');
        style.textContent = `
            .file-icon i:before {
                content: "📄" !important;
                font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
            }
            .file-icon .fa-file-csv:before { content: "📊" !important; }
            .file-icon .fa-file-excel:before { content: "📈" !important; }
            .file-icon .fa-file-code:before { content: "💻" !important; }
            .file-icon .fa-database:before { content: "🗃️" !important; }
            .file-icon .fa-file-pdf:before { content: "📕" !important; }
            .file-icon .fa-file-image:before { content: "🖼️" !important; }
            .file-icon .fa-file-video:before { content: "🎬" !important; }
            .file-icon .fa-file-audio:before { content: "🎵" !important; }
        `;
        document.head.appendChild(style);
    }
    
    return isLoaded;
}

// 确认删除文件
function confirmDeleteFile(filename) {
    // 使用自定义的确认对话框
    showConfirmDialog(
        `确定要删除文件 "${filename}" 吗？`,
        '此操作不可逆，文件将被永久删除。',
        () => {
            // 尝试使用新方法删除
            deleteFile(filename)
                .then(response => {
                    if (response && response.ok) {
                        response.json().then(data => {
                            if (data && data.success) {
                                // 显示成功通知（不再预先清除通知）
                                showNotification(`文件 ${filename} 已删除`, 'success');
                                // 重新加载文件列表
                                loadExampleFiles();
                            } else {
                                throw new Error(data.message || "删除失败");
                            }
                        }).catch(err => {
                            showNotification("处理响应数据时出错: " + err.message, 'error');
                        });
                    } else {
                        throw new Error("删除请求失败");
                    }
                })
                .catch(error => {
                    console.error('删除文件失败:', error);
                    
                    // 如果JavaScript方法失败，尝试直接跳转到删除链接
                    showNotification("正在尝试备用删除方法...", 'info');
                    setTimeout(() => {
                        window.location.href = `/api/example-files/action?action=delete&filename=${encodeURIComponent(filename)}`;
                    }, 1000);
                });
        },
        '删除',
        'danger'
    );
}

// 删除文件
async function deleteFile(filename) {
    try {
        // 显示加载状态
        showNotification(`正在删除文件 ${filename}...`, 'info', 0);
        
        console.log(`尝试删除文件: ${filename}`);
        // 使用GET方法和查询参数
        const apiUrl = `/api/example-files/action?action=delete&filename=${encodeURIComponent(filename)}`;
        console.log(`API URL: ${apiUrl}`);
        
        // 使用旧的XMLHttpRequest以避免可能的浏览器兼容性问题
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', apiUrl, true);
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        resolve({
                            ok: true,
                            json: () => Promise.resolve(data)
                        });
                    } catch (e) {
                        reject(new Error("无法解析响应"));
                    }
                } else {
                    reject(new Error(`请求失败，状态码：${xhr.status}`));
                }
            };
            xhr.onerror = function() {
                reject(new Error("网络请求失败"));
            };
            xhr.send();
        });
        
        console.log(`删除API返回状态: ${response.status}`);
        
        if (!response.ok) {
            let errorMessage = `删除失败，状态码: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (parseError) {
                console.error('解析错误响应失败:', parseError);
            }
            throw new Error(errorMessage);
        }
        
        let responseData;
        try {
            responseData = await response.json();
            console.log('删除API响应数据:', responseData);
        } catch (parseError) {
            console.error('解析响应数据失败:', parseError);
            throw new Error('服务器返回了无效的JSON响应');
        }
        
        // 检查API响应格式
        if (!responseData.success) {
            throw new Error(responseData.message || '删除文件失败');
        }
        
        // 显示成功通知（不再预先清除通知）
        showNotification(`文件 ${filename} 已删除`, 'success');
        
        // 重新加载文件列表
        console.log('重新加载文件列表');
        loadExampleFiles();
        
    } catch (error) {
        console.error('删除文件失败:', error);
        showNotification('删除文件失败: ' + error.message, 'error');
    }
}

// 显示确认对话框
function showConfirmDialog(title, message, confirmCallback, confirmText = '确认', confirmType = 'primary') {
    // 创建对话框元素
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'confirm-dialog-overlay';
    dialogOverlay.innerHTML = `
        <div class="confirm-dialog">
            <div class="confirm-dialog-header">
                <h3>${title}</h3>
            </div>
            <div class="confirm-dialog-body">
                <p>${message}</p>
            </div>
            <div class="confirm-dialog-footer">
                <button class="confirm-dialog-btn cancel-btn">取消</button>
                <button class="confirm-dialog-btn confirm-btn confirm-${confirmType}">${confirmText}</button>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(dialogOverlay);
    
    // 显示对话框
    setTimeout(() => {
        dialogOverlay.style.opacity = '1';
    }, 10);
    
    // 绑定事件
    const cancelBtn = dialogOverlay.querySelector('.cancel-btn');
    const confirmBtn = dialogOverlay.querySelector('.confirm-btn');
    
    // 关闭对话框的函数
    const closeDialog = () => {
        dialogOverlay.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(dialogOverlay);
        }, 300);
    };
    
    // 点击取消
    cancelBtn.addEventListener('click', closeDialog);
    
    // 点击确认
    confirmBtn.addEventListener('click', () => {
        closeDialog();
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
    
    // 点击遮罩层关闭
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeDialog();
        }
    });
}

// 隐藏通知
function hideNotification() {
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(notification => {
        notification.classList.add('notification-hide');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    });
}

// ===============================
// 文件拖拽排序功能实现
// ===============================

let draggedElement = null;
let draggedCategory = null;
let dragPlaceholder = null;

// 初始化拖拽功能
function initializeDragAndDrop() {
    const fileItems = document.querySelectorAll('.file-item');
    
    fileItems.forEach(item => {
        // 拖拽开始
        item.addEventListener('dragstart', handleDragStart);
        // 拖拽结束
        item.addEventListener('dragend', handleDragEnd);
        // 拖拽经过
        item.addEventListener('dragover', handleDragOver);
        // 拖拽进入
        item.addEventListener('dragenter', handleDragEnter);
        // 拖拽离开
        item.addEventListener('dragleave', handleDragLeave);
        // 放置
        item.addEventListener('drop', handleDrop);
    });
}

// 处理拖拽开始
function handleDragStart(e) {
    draggedElement = this;
    draggedCategory = this.getAttribute('data-category');
    this.classList.add('dragging');
    
    // 创建拖拽占位符
    dragPlaceholder = document.createElement('div');
    dragPlaceholder.className = 'drag-placeholder';
    
    // 设置拖拽数据
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
    
    // 添加半透明效果
    setTimeout(() => {
        this.style.display = 'none';
    }, 0);
}

// 处理拖拽结束
function handleDragEnd(e) {
    this.classList.remove('dragging');
    this.style.display = '';
    
    // 清除所有拖拽状态
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('drag-over', 'drag-forbidden');
    });
    
    // 移除占位符
    if (dragPlaceholder && dragPlaceholder.parentNode) {
        dragPlaceholder.parentNode.removeChild(dragPlaceholder);
    }
    
    draggedElement = null;
    draggedCategory = null;
    dragPlaceholder = null;
}

// 处理拖拽经过
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    
    const targetCategory = this.getAttribute('data-category');
    
    // 只允许在同一分类内拖拽
    if (draggedCategory === targetCategory) {
        e.dataTransfer.dropEffect = 'move';
        return false;
    } else {
        e.dataTransfer.dropEffect = 'none';
        return false;
    }
}

// 处理拖拽进入
function handleDragEnter(e) {
    const targetCategory = this.getAttribute('data-category');
    
    if (draggedCategory === targetCategory) {
        this.classList.add('drag-over');
        // 显示插入位置
        if (dragPlaceholder && !this.contains(dragPlaceholder)) {
            const rect = this.getBoundingClientRect();
            const middle = rect.top + rect.height / 2;
            
            if (e.clientY < middle) {
                this.parentNode.insertBefore(dragPlaceholder, this);
            } else {
                this.parentNode.insertBefore(dragPlaceholder, this.nextSibling);
            }
        }
    } else {
        this.classList.add('drag-forbidden');
    }
}

// 处理拖拽离开
function handleDragLeave(e) {
    // 检查是否真的离开了元素
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over', 'drag-forbidden');
    }
}

// 处理放置
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    const targetCategory = this.getAttribute('data-category');
    
    // 只允许在同一分类内拖拽
    if (draggedCategory !== targetCategory) {
        showNotification('只能在同一文件类型内调整顺序', 'warning');
        return false;
    }
    
    // 执行拖拽排序
    if (draggedElement !== this) {
        const draggedFilename = draggedElement.getAttribute('data-filename');
        const targetFilename = this.getAttribute('data-filename');
        
        // 更新文件顺序
        updateFileOrder(draggedCategory, draggedFilename, targetFilename);
        
        showNotification('文件顺序已更新', 'success');
    }
    
    this.classList.remove('drag-over', 'drag-forbidden');
    return false;
}

// 更新文件顺序
function updateFileOrder(category, draggedFilename, targetFilename) {
    // 找到对应分类的文件数组
    const { categorizedFiles } = categorizeFilesByType(exampleFilesData);
    
    if (!categorizedFiles[category]) return;
    
    const files = categorizedFiles[category].files;
    const draggedIndex = files.findIndex(file => file.name === draggedFilename);
    const targetIndex = files.findIndex(file => file.name === targetFilename);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // 移动文件位置
    const draggedFile = files[draggedIndex];
    files.splice(draggedIndex, 1);
    files.splice(targetIndex, 0, draggedFile);
    
    // 重新渲染列表
    renderFileList(exampleFilesData);
}

// ===============================
// 文件筛选功能实现
// ===============================

// 更新筛选选项
function updateFilterOptions(files) {
    // 重置数据
    allFileTypes.clear();
    allExtensions.clear();
    
    // 收集所有文件类型和扩展名
    files.forEach(file => {
        const extension = file.extension.toLowerCase();
        allExtensions.add(extension);
        
        // 根据分类算法确定文件类型
        const category = getFileCategory(extension);
        allFileTypes.add(category);
    });
    
    // 更新界面选项
    updateTypeFilterOptions();
    updateExtensionFilterOptions();
}

// 获取文件类别
function getFileCategory(extension) {
    const fileTypeCategories = {
        'intensity': ['txt', 'dat', 'asc'],
        'json': ['json'],
        'backup': ['backup', 'bak'],
        'table': ['csv', 'tsv', 'tab', 'xlsx', 'xls'],
        'document': ['pdf', 'doc', 'docx', 'md', 'rtf'],
        'code': ['js', 'py', 'html', 'css', 'xml', 'php', 'cpp', 'c', 'java'],
        'simulation': ['pli', 'ldf', 'msk', 'int', 'pro', 'sim', 'slf', 'fdt', 'mat', 'm'],
        'log': ['log', 'out', 'lis'],
        'archive': ['zip', 'rar', '7z', 'tar', 'gz', 'bin'],
        'media': ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'tiff', 'mp4', 'avi', 'mov', 'wmv', 'mp3', 'wav', 'flac', 'aac']
    };
    
    for (const [category, extensions] of Object.entries(fileTypeCategories)) {
        if (extensions.includes(extension)) {
            return category;
        }
    }
    return 'other';
}

// 获取文件类别的中文名称
function getFileCategoryName(category) {
    const categoryNames = {
        'intensity': '光强分布文件',
        'json': 'JSON数据文件',
        'backup': '备份文件',
        'table': '表格数据文件',
        'document': '文档文件',
        'code': '代码文件',
        'simulation': '仿真文件',
        'log': '日志文件',
        'archive': '压缩文件',
        'media': '媒体文件',
        'other': '其他文件'
    };
    return categoryNames[category] || '其他文件';
}

// 更新文件类型筛选选项
function updateTypeFilterOptions() {
    const typeFiltersContainer = document.getElementById('type-filters');
    typeFiltersContainer.innerHTML = '';
    
    Array.from(allFileTypes).sort().forEach(type => {
        const label = document.createElement('label');
        label.className = 'filter-option';
        label.innerHTML = `
            <input type="checkbox" value="${type}" data-filter="type">
            <span>${getFileCategoryName(type)}</span>
        `;
        typeFiltersContainer.appendChild(label);
    });
}

// 更新扩展名筛选选项
function updateExtensionFilterOptions() {
    const extensionFiltersContainer = document.getElementById('extension-filters');
    extensionFiltersContainer.innerHTML = '';
    
    Array.from(allExtensions).sort().forEach(ext => {
        const label = document.createElement('label');
        label.className = 'filter-option';
        label.innerHTML = `
            <input type="checkbox" value="${ext}" data-filter="extension">
            <span>.${ext.toUpperCase()}</span>
        `;
        extensionFiltersContainer.appendChild(label);
    });
}

// 切换筛选下拉框显示
function toggleFilterDropdown() {
    const filterDropdown = document.getElementById('filter-dropdown');
    const filterToggleBtn = document.getElementById('filter-toggle-btn');
    
    if (filterDropdown.style.display === 'none' || !filterDropdown.style.display) {
        filterDropdown.style.display = 'block';
        filterToggleBtn.classList.add('active');
    } else {
        hideFilterDropdown();
    }
}

// 隐藏筛选下拉框
function hideFilterDropdown() {
    const filterDropdown = document.getElementById('filter-dropdown');
    const filterToggleBtn = document.getElementById('filter-toggle-btn');
    
    filterDropdown.style.display = 'none';
    filterToggleBtn.classList.remove('active');
    
    // 检查筛选数量是否为零，如果是则重置筛选计数显示
    const totalFilters = currentFilters.types.size + currentFilters.sizes.size + currentFilters.extensions.size;
    if (totalFilters === 0) {
        const filterCount = document.getElementById('filter-count');
        if (filterCount) {
            filterCount.style.display = 'none';
            filterCount.textContent = '';
        }
    }
}

// 清除所有筛选
function clearAllFilters() {
    currentFilters.types.clear();
    currentFilters.sizes.clear();
    currentFilters.extensions.clear();
    
    // 清除所有复选框
    const checkboxes = document.querySelectorAll('#filter-dropdown input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    updateFilterCount();
    applyFilters();
}

// 清除特定类型的筛选
function clearSpecificFilter(filterType) {
    if (filterType === 'type') {
        currentFilters.types.clear();
        const typeCheckboxes = document.querySelectorAll('#type-filters input[type="checkbox"]');
        typeCheckboxes.forEach(checkbox => checkbox.checked = false);
    } else if (filterType === 'size') {
        currentFilters.sizes.clear();
        const sizeCheckboxes = document.querySelectorAll('input[data-filter="size"]');
        sizeCheckboxes.forEach(checkbox => checkbox.checked = false);
    } else if (filterType === 'extension') {
        currentFilters.extensions.clear();
        const extensionCheckboxes = document.querySelectorAll('#extension-filters input[type="checkbox"]');
        extensionCheckboxes.forEach(checkbox => checkbox.checked = false);
    }
    
    updateFilterCount();
    applyFilters();
}

// 应用筛选
function applyFilters() {
    // 收集当前选中的筛选条件
    collectFilterValues();
    
    // 筛选文件
    let filteredFiles = [...exampleFilesData];
    
    // 按文件类型筛选
    if (currentFilters.types.size > 0) {
        filteredFiles = filteredFiles.filter(file => {
            const category = getFileCategory(file.extension.toLowerCase());
            return currentFilters.types.has(category);
        });
    }
    
    // 按文件大小筛选
    if (currentFilters.sizes.size > 0) {
        filteredFiles = filteredFiles.filter(file => {
            const sizeCategory = getFileSizeCategory(file.size);
            return currentFilters.sizes.has(sizeCategory);
        });
    }
    
    // 按扩展名筛选
    if (currentFilters.extensions.size > 0) {
        filteredFiles = filteredFiles.filter(file => {
            return currentFilters.extensions.has(file.extension.toLowerCase());
        });
    }
    
    // 同时应用搜索筛选
    const searchTerm = document.getElementById('file-search-input').value.toLowerCase();
    if (searchTerm) {
        filteredFiles = filteredFiles.filter(file => 
            file.name.toLowerCase().includes(searchTerm) ||
            file.extension.toLowerCase().includes(searchTerm) ||
            (file.description && file.description.toLowerCase().includes(searchTerm))
        );
    }
    
    renderFileList(filteredFiles);
    updateFilterCount();
    hideFilterDropdown();
}

// 收集筛选值
function collectFilterValues() {
    // 清空当前筛选
    currentFilters.types.clear();
    currentFilters.sizes.clear();
    currentFilters.extensions.clear();
    
    // 收集文件类型筛选
    const typeCheckboxes = document.querySelectorAll('#type-filters input[type="checkbox"]:checked');
    typeCheckboxes.forEach(checkbox => {
        currentFilters.types.add(checkbox.value);
    });
    
    // 收集文件大小筛选
    const sizeCheckboxes = document.querySelectorAll('input[data-filter="size"]:checked');
    sizeCheckboxes.forEach(checkbox => {
        currentFilters.sizes.add(checkbox.value);
    });
    
    // 收集扩展名筛选
    const extensionCheckboxes = document.querySelectorAll('#extension-filters input[type="checkbox"]:checked');
    extensionCheckboxes.forEach(checkbox => {
        currentFilters.extensions.add(checkbox.value);
    });
}

// 获取文件大小类别
function getFileSizeCategory(sizeBytes) {
    const KB = 1024;
    const size = sizeBytes / KB;
    
    if (size < 1) return 'small';
    if (size <= 100) return 'medium';
    return 'large';
}

// 更新筛选计数
function updateFilterCount() {
    const filterCount = document.getElementById('filter-count');
    if (!filterCount) return;
    
    const totalFilters = currentFilters.types.size + currentFilters.sizes.size + currentFilters.extensions.size;
    
    if (totalFilters > 0) {
        // 更新计数值
        filterCount.textContent = totalFilters;
        filterCount.style.display = 'block';
        console.log(`筛选计数器更新: ${totalFilters} 个筛选条件`);
    } else {
        // 隐藏计数器
        filterCount.style.display = 'none';
        filterCount.textContent = '';
        console.log('筛选计数器已隐藏 (无筛选条件)');
    }
}

// 更新原有的筛选文件列表函数，使其与新筛选功能兼容
function filterFileList() {
    applyFilters(); // 直接调用新的筛选功能
}

// 检查筛选按钮显示状态
function checkFilterButtonDisplay() {
    setTimeout(() => {
        const filterBtn = document.getElementById('filter-toggle-btn');
        const filterIcon = filterBtn ? filterBtn.querySelector('i') : null;
        
        if (filterBtn && filterIcon) {
            // 检查按钮是否可见
            const btnRect = filterBtn.getBoundingClientRect();
            const isVisible = btnRect.width > 0 && btnRect.height > 0;
            
            if (!isVisible) {
                console.warn('筛选按钮不可见，调整样式...');
                // 强制显示按钮
                filterBtn.style.display = 'flex';
                filterBtn.style.visibility = 'visible';
                filterBtn.style.opacity = '1';
            }
            
            // 检查Font Awesome图标是否加载
            const iconStyles = window.getComputedStyle(filterIcon, '::before');
            const content = iconStyles.getPropertyValue('content');
            
            if (!content || content === 'none' || content === '""') {
                console.warn('Font Awesome图标未正确加载，使用备用方案...');
                // 添加备用图标
                filterIcon.innerHTML = '⧨';
                filterIcon.style.fontFamily = 'Arial, sans-serif';
                filterIcon.style.fontSize = '12px';
            }
            
            console.log('✅ 筛选按钮检查完成');
        } else {
            console.error('❌ 找不到筛选按钮元素');
        }
    }, 500);
}

// 在页面加载完成后初始化示例文件管理
document.addEventListener('DOMContentLoaded', function() {
    // 检查Font Awesome加载状态
    setTimeout(() => {
        checkFontAwesome();
    }, 500);
    
    // 延迟初始化，确保其他组件先加载完成
    setTimeout(() => {
        initExampleFilesManager();
    }, 100);
});

// 显示创建新文件模态框
function showCreateFileModal() {
    const modal = document.getElementById('create-file-modal');
    const nameInput = document.getElementById('new-file-name');
    const templateSelect = document.getElementById('new-file-template');
    const contentTextarea = document.getElementById('new-file-content');
    
    // 重置表单
    nameInput.value = '';
    templateSelect.value = 'empty';
    contentTextarea.value = '';
    
    // 显示模态框
    modal.style.display = 'flex';
    
    // 绑定模态框事件（如果尚未绑定）
    bindCreateFileModalEvents();
}

// 绑定创建新文件模态框事件
function bindCreateFileModalEvents() {
    const modal = document.getElementById('create-file-modal');
    const closeBtn = modal.querySelector('.create-file-close');
    const submitBtn = document.getElementById('create-file-submit');
    const cancelBtn = document.getElementById('create-file-cancel');
    const templateSelect = document.getElementById('new-file-template');
    const contentTextarea = document.getElementById('new-file-content');
    const fileTypeSelect = document.getElementById('new-file-type');
    
    // 关闭模态框
    closeBtn.addEventListener('click', closeCreateFileModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCreateFileModal();
        }
    });
    
    // 模板选择事件
    templateSelect.addEventListener('change', () => {
        const template = templateSelect.value;
        const content = FILE_TEMPLATES[template] || '';
        contentTextarea.value = content;
        
        // 根据模板类型自动调整文件类型
        if (template === 'intensity_complex' || template === 'sine_wave') {
            fileTypeSelect.value = 'json';
        } else if (template === 'intensity_simple') {
            fileTypeSelect.value = 'txt';
        }
    });
    
    // 提交按钮
    submitBtn.addEventListener('click', createNewFile);
    
    // 取消按钮
    cancelBtn.addEventListener('click', closeCreateFileModal);
}

// 关闭创建新文件模态框
function closeCreateFileModal() {
    const modal = document.getElementById('create-file-modal');
    modal.style.display = 'none';
}

// 创建新文件
async function createNewFile() {
    const nameInput = document.getElementById('new-file-name');
    const typeSelect = document.getElementById('new-file-type');
    const contentTextarea = document.getElementById('new-file-content');
    
    // 验证表单
    const filename = nameInput.value.trim();
    const fileType = typeSelect.value;
    const content = contentTextarea.value;
    
    if (!filename) {
        showNotification('请输入文件名', 'warning');
        nameInput.focus();
        return;
    }
    
    // 构建请求数据
    const requestData = {
        filename: filename,
        type: fileType,
        content: content
    };
    
    try {
        const response = await fetch('/api/example-files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `创建失败，状态码: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        // 检查API响应格式
        if (!responseData.success) {
            throw new Error(responseData.message || '创建文件失败');
        }
        
        // 显示成功通知
        showNotification(`文件 ${responseData.data.name} 创建成功`, 'success');
        
        // 关闭模态框
        closeCreateFileModal();
        
        // 重新加载文件列表
        loadExampleFiles();
        
    } catch (error) {
        console.error('创建文件失败:', error);
        showNotification('创建文件失败: ' + error.message, 'error');
    }
}

// 处理示例文件上传
async function handleExampleFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) {
        return;
    }
    
    // 准备FormData
    const formData = new FormData();
    
    // 检查文件类型和数量
    const allowedExtensions = ['.txt', '.csv', '.json', '.dat', '.xls', '.xlsx', '.mat', '.pli', '.ldf', '.msk', '.int', '.pro', '.sim', '.tab', '.tsv', '.asc', '.lis', '.log', '.out', '.fdt', '.slf'];
    let validFiles = 0;
    let invalidFiles = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        
        if (allowedExtensions.includes(fileExt)) {
            formData.append('files', file);
            validFiles++;
        } else {
            invalidFiles.push(file.name);
        }
    }
    
    if (validFiles === 0) {
        showNotification('没有有效的文件可上传。支持的格式：' + allowedExtensions.join(', '), 'warning');
        return;
    }
    
    if (invalidFiles.length > 0) {
        showNotification(`已忽略不支持的文件: ${invalidFiles.join(', ')}`, 'warning');
    }
    
    try {
        // 显示上传中的提示
        showNotification(`正在上传 ${validFiles} 个文件...`, 'info');
        
        const response = await fetch('/api/example-files/upload', {
            method: 'POST',
            body: formData
        });
        
        // 检查响应状态和内容类型
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.message || `上传失败，状态码: ${response.status}`);
            } else {
                // 非JSON响应，可能是HTML错误页面
                const errorText = await response.text();
                throw new Error(`上传失败，状态码: ${response.status} (${response.statusText})`);
            }
        }
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // 上传成功
            if (result.data.total_uploaded > 0) {
                showNotification(result.message, 'success');
                // 刷新文件列表
                loadExampleFiles();
            }
            
            // 如果有失败的文件，显示详细信息
            if (result.data.total_failed > 0) {
                const failedList = result.data.failed.map(f => `${f.filename}: ${f.error}`).join('\n');
                console.warn('部分文件上传失败:', failedList);
            }
        } else {
            // 上传失败
            showNotification(result.message || '上传失败', 'error');
            
            // 显示失败的文件详情
            if (result.data && result.data.failed && result.data.failed.length > 0) {
                const failedList = result.data.failed.map(f => `${f.filename}: ${f.error}`).join('\n');
                console.error('文件上传失败详情:', failedList);
            }
        }
    } catch (error) {
        console.error('上传文件时发生错误:', error);
        showNotification('上传文件失败: ' + error.message, 'error');
    } finally {
        // 清空文件输入框，允许重复选择相同文件
        event.target.value = '';
    }
}

/**
 * 初始化Plotly图表的可拖拽缩放功能
 * @param {HTMLElement} exposureContainer - 曝光图表容器
 * @param {HTMLElement} thicknessContainer - 厚度图表容器
 */
function initPlotlyResizableFeature(exposureContainer, thicknessContainer) {
    // 检查ResizablePlotlyManager是否可用
    if (!window.ResizablePlotlyManager) {
        console.warn('⚠️ ResizablePlotlyManager 未找到，跳过拖拽缩放功能初始化');
        return;
    }
    
    console.log('🎯 开始初始化Plotly图表拖拽缩放功能...');
    
    // 设置曝光图表为可拖拽缩放
    if (exposureContainer && exposureContainer.id) {
        try {
            window.ResizablePlotlyManager.makeResizable(exposureContainer.id);
            console.log(`✅ 曝光图表容器 ${exposureContainer.id} 已设置为可拖拽缩放`);
        } catch (error) {
            console.error(`❌ 设置曝光图表拖拽功能失败:`, error);
        }
    }
    
    // 设置厚度图表为可拖拽缩放
    if (thicknessContainer && thicknessContainer.id) {
        try {
            window.ResizablePlotlyManager.makeResizable(thicknessContainer.id);
            console.log(`✅ 厚度图表容器 ${thicknessContainer.id} 已设置为可拖拽缩放`);
        } catch (error) {
            console.error(`❌ 设置厚度图表拖拽功能失败:`, error);
        }
    }
    
    // 检查是否还有其他图表容器需要设置
    const additionalContainers = [
        'car-interactive-plots',
        'enhanced-dill-x-plane-exposure-container',
        'enhanced-dill-x-plane-thickness-container',
        'enhanced-dill-y-plane-exposure-container',
        'enhanced-dill-y-plane-thickness-container',
        'dill-4d-exposure',
        'dill-4d-thickness',
        'enhanced-dill-4d-exposure',
        'car-4d-initial-acid',
        'car-4d-diffused-acid',
        'car-4d-deprotection',
        'car-4d-thickness'
    ];
    
    additionalContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container && container.style.display !== 'none') {
            try {
                window.ResizablePlotlyManager.makeResizable(containerId);
                console.log(`✅ 额外图表容器 ${containerId} 已设置为可拖拽缩放`);
            } catch (error) {
                console.warn(`⚠️ 设置额外图表容器 ${containerId} 拖拽功能失败:`, error);
            }
        }
    });
    
    console.log('🎯 Plotly图表拖拽缩放功能初始化完成');
}
