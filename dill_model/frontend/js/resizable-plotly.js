/**
 * Plotly.js 图表可拖拽缩放功能
 * 
 * 主要功能：
 * 1. 为Plotly图表容器添加拖拽缩放功能
 * 2. 支持鼠标和触摸屏操作
 * 3. 自动调整Plotly图表大小
 * 4. 保存用户偏好设置
 * 5. 响应式设计支持
 */

class ResizablePlotly {
    constructor(options = {}) {
        this.options = {
            minWidth: 300,
            minHeight: 200,
            maxWidth: null, // null表示无限制
            maxHeight: null,
            defaultWidth: 600,
            defaultHeight: 400,
            handleSize: 15,
            savePreferences: true,
            debounceTime: 100, // 增加防抖时间，减少频繁更新
            enableTouch: true,
            constrainToViewport: true,
            showResizeInfo: true,
            enableSync: true, // 启用图表同步功能
            syncMode: 'proportional', // 同步模式：'proportional'(比例),'uniform'(统一尺寸),'layout'(布局调整)
            ...options
        };
        
        this.resizableContainers = new Map();
        this.isResizing = false;
        this.currentContainer = null;
        this.lastUpdateTime = 0;
        this.syncGroups = new Map(); // 存储同步组
        this.isSyncing = false; // 防止同步递归
        
        this.init();
    }
    
    init() {
        this.addStyles();
        this.bindGlobalEvents();
        console.log('✅ ResizablePlotly 系统初始化完成');
    }
    
    /**
     * 添加必要的CSS样式
     */
    addStyles() {
        if (document.getElementById('resizable-plotly-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'resizable-plotly-styles';
        style.textContent = `
            .resizable-plotly-container {
                /* 🔒 绝对不设置width, height, min-width, min-height等会影响尺寸的属性 */
                border: 2px solid transparent;
                border-radius: 8px;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
                background: #ffffff;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden; /* 🔧 改回hidden，控件通过绝对定位显示在外部 */
                /* position通过JS单独设置，不在CSS中强制设置 */
            }
            
            .resizable-plotly-container:hover {
                border-color: #3498db;
                box-shadow: 0 4px 16px rgba(52, 152, 219, 0.2);
            }
            
            .resizable-plotly-container.resizing {
                border-color: #e74c3c;
                box-shadow: 0 4px 20px rgba(231, 76, 60, 0.3);
                user-select: none;
            }
            
            .resize-handle {
                position: absolute;
                bottom: -8px; /* 🔧 移到容器外部，避免覆盖图表 */
                right: -8px;  /* 🔧 移到容器外部，避免覆盖图表 */
                width: ${this.options.handleSize}px;
                height: ${this.options.handleSize}px;
                background: linear-gradient(135deg, #3498db, #2980b9);
                cursor: se-resize;
                z-index: 9999; /* 🔧 提高z-index但确保不阻挡图表 */
                border-radius: 50%; /* 🔧 改为圆形，更明显 */
                opacity: 0; /* 🔧 默认隐藏 */
                transition: opacity 0.2s ease, transform 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: auto; /* 🔧 确保可以响应鼠标事件 */
            }
            
            .resize-handle::before {
                content: '';
                width: 6px;
                height: 6px;
                background: white;
                border-radius: 50%;
                box-shadow: 0 1px 2px rgba(0,0,0,0.3);
            }
            
            .resize-handle:hover {
                opacity: 1;
                transform: scale(1.1);
                background: linear-gradient(135deg, #2980b9, #1e6aa0);
            }
            
            .resizable-plotly-container:hover .resize-handle {
                opacity: 1;
            }
            
            .resize-info {
                position: absolute;
                top: -35px; /* 🔧 移到容器外部上方 */
                right: 10px;
                background: rgba(52, 152, 219, 0.9);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-family: monospace;
                z-index: 9999; /* 🔧 提高z-index */
                opacity: 0;
                transition: opacity 0.2s ease;
                pointer-events: none; /* 🔧 确保不响应鼠标事件 */
            }
            
            .resizable-plotly-container.resizing .resize-info {
                opacity: 1;
            }
            
            .resize-controls {
                position: absolute;
                top: -40px; /* 🔧 移到容器外部上方 */
                left: 10px;
                display: flex;
                gap: 5px;
                opacity: 0; /* 🔧 默认隐藏 */
                transition: opacity 0.2s ease;
                z-index: 9999; /* 🔧 提高z-index */
                pointer-events: none; /* 🔧 默认不响应鼠标事件 */
            }
            
            .resizable-plotly-container:hover .resize-controls {
                opacity: 1;
                pointer-events: auto; /* 🔧 悬停时才响应鼠标事件 */
            }
            
            .resize-control-btn {
                width: 24px;
                height: 24px;
                border: none;
                border-radius: 4px;
                background: rgba(52, 152, 219, 0.8);
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                transition: background 0.2s ease, transform 0.1s ease;
            }
            
            .resize-control-btn:hover {
                background: rgba(52, 152, 219, 1);
                transform: scale(1.1);
            }
            
            .resize-control-btn:active {
                transform: scale(0.95);
            }
            
            /* Tooltip样式 */
            .resize-control-btn {
                position: relative;
            }
            
            .resize-control-btn::after {
                content: attr(data-tooltip);
                position: absolute;
                top: -35px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease;
                z-index: 1002;
            }
            
            .resize-control-btn:hover::after {
                opacity: 1;
            }
            
            /* 增强悬停效果 */
            .resize-control-btn:hover {
                background: rgba(52, 152, 219, 1);
                transform: scale(1.1);
                box-shadow: 0 2px 8px rgba(52, 152, 219, 0.4);
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .resize-handle {
                    width: 20px;
                    height: 20px;
                }
                
                .resize-info {
                    font-size: 11px;
                    padding: 3px 6px;
                }
                
                .resize-control-btn {
                    width: 28px;
                    height: 28px;
                    font-size: 14px;
                }
            }
            
            /* 智能响应式布局 - 基于CSS Grid的自适应，不覆盖原始样式 */
            .plots-container.force-single-column {
                grid-template-columns: 1fr !important;
                transition: grid-template-columns 0.3s ease;
                max-width: 100%;
                overflow: visible; /* 🔄 确保在单列模式下内容不被裁剪 */
            }
            
            /* 单列布局时图表项的优化 */
            .plots-container.force-single-column .plot-item {
                width: 100%;
                max-width: none;
                justify-self: center; /* 居中显示 */
            }
            
            /* 当图表过宽时的响应式调整 */
            @media (max-width: 1200px) {
                .resizable-plotly-container {
                    max-width: 100%;
                }
            }
            
            /* 超小屏幕优化 */
            @media (max-width: 600px) {
                .resizable-plotly-container {
                    min-width: 280px;
                }
                
                .resize-controls {
                    gap: 3px;
                }
                
                .resize-control-btn {
                    width: 24px;
                    height: 24px;
                    font-size: 12px;
                }
                
                .resize-info {
                    font-size: 10px;
                    padding: 2px 4px;
                }
            }
            
            /* 动画效果 */
            @keyframes resize-pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            .resize-handle.active {
                animation: resize-pulse 0.6s ease-in-out;
            }
            
            /* 主题适配 */
            .theme-dill .resize-handle {
                background: linear-gradient(135deg, #3498db, #2980b9);
            }
            
            .theme-enhanced-dill .resize-handle {
                background: linear-gradient(135deg, #9b59b6, #8e44ad);
            }
            
            .theme-car .resize-handle {
                background: linear-gradient(135deg, #e67e22, #d35400);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        // 鼠标事件
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // 🔧 全局点击事件，确保Plotly交互层状态正常
        document.addEventListener('click', (e) => {
            if (!this.isResizing) {
                // 点击时确保所有Plotly图表的交互正常
                this.resizableContainers.forEach((config) => {
                    if (config.plotlyDiv && config.plotlyDiv.style.pointerEvents === 'none') {
                        config.plotlyDiv.style.pointerEvents = '';
                        console.log('🔧 恢复Plotly交互:', config.container.id);
                    }
                });
            }
        });
        
        // 触摸事件（移动设备支持）
        if (this.options.enableTouch) {
            document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        }
        
        // 窗口大小变化
        window.addEventListener('resize', this.debounce(this.handleWindowResize.bind(this), 200));
        
        // 键盘快捷键支持
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    /**
     * 使图表容器变为可拖拽缩放
     */
    makeResizable(containerId, plotlyDivId = null) {
        console.log(`🎯 开始设置容器为可拖拽: ${containerId}`);
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`⚠️ 容器 ${containerId} 未找到`);
            return false;
        }
        
        if (this.resizableContainers.has(containerId)) {
            console.log(`📝 容器 ${containerId} 已经注册，检查DOM元素是否完整...`);
            
            // 🔍 检查必要的拖拽元素是否存在
            const existingHandle = container.querySelector('.resize-handle');
            const existingControls = container.querySelector('.resize-controls');
            const existingConfig = this.resizableContainers.get(containerId);
            
            if (existingHandle && existingControls && existingConfig) {
                console.log(`✅ 容器 ${containerId} 拖拽元素完整，跳过重新初始化`);
                
                // 🔧 更新配置中的DOM引用（防止DOM重新创建后引用失效）
                existingConfig.container = container;
                if (!plotlyDivId) {
                    const plotlyDiv = container.querySelector('[class*="plotly"], [id*="plot"]') || container.firstElementChild;
                    plotlyDivId = plotlyDiv?.id || containerId + '-plot';
                }
                const plotlyDiv = document.getElementById(plotlyDivId) || container.firstElementChild;
                existingConfig.plotlyDiv = plotlyDiv;
                
                return true;
            } else {
                console.log(`⚠️ 容器 ${containerId} 拖拽元素缺失，重新初始化...`);
                console.log(`   - resize-handle: ${!!existingHandle}`);
                console.log(`   - resize-controls: ${!!existingControls}`);
                
                // 🧹 清理旧的不完整配置
                this.resizableContainers.delete(containerId);
                
                // 🧹 清理可能残留的元素
                const oldHandle = container.querySelector('.resize-handle');
                const oldControls = container.querySelector('.resize-controls');
                const oldInfo = container.querySelector('.resize-info');
                if (oldHandle) oldHandle.remove();
                if (oldControls) oldControls.remove();
                if (oldInfo) oldInfo.remove();
                
                console.log(`🧹 已清理容器 ${containerId} 的残留元素，将重新设置`);
            }
        }
        
        // 自动检测Plotly div
        if (!plotlyDivId) {
            const plotlyDiv = container.querySelector('[class*="plotly"], [id*="plot"]') || container.firstElementChild;
            plotlyDivId = plotlyDiv?.id || containerId + '-plot';
        }
        
        const plotlyDiv = document.getElementById(plotlyDivId) || container.firstElementChild;
        
        console.log(`🔍 容器信息:`, {
            containerId: containerId,
            containerSize: `${container.offsetWidth}×${container.offsetHeight}`,
            plotlyDivId: plotlyDivId,
            plotlyDiv: plotlyDiv,
            plotlyDivSize: plotlyDiv ? `${plotlyDiv.offsetWidth}×${plotlyDiv.offsetHeight}` : 'N/A',
            hasPlotlyLayout: plotlyDiv ? !!plotlyDiv._fullLayout : false
        });
        
        // 🔒 真实获取容器尺寸，绝不使用默认值
        const realWidth = container.offsetWidth;
        const realHeight = container.offsetHeight;
        
        console.log(`🔍 容器 ${containerId} 真实尺寸: ${realWidth}×${realHeight}`);
        
        if (!realWidth || !realHeight) {
            console.warn(`⚠️ 容器 ${containerId} 尺寸为0，可能未完全渲染，跳过初始化`);
            return false;
        }
        
        const config = {
            container: container,
            plotlyDiv: plotlyDiv,
            originalWidth: realWidth,   // 使用真实尺寸
            originalHeight: realHeight, // 使用真实尺寸
            currentWidth: realWidth,    // 使用真实尺寸
            currentHeight: realHeight   // 使用真实尺寸
        };
        
        this.setupContainer(container, config);
        this.resizableContainers.set(containerId, config);
        
        // 🚫 禁用初始化时的尺寸恢复，保持原始尺寸
        // if (this.options.savePreferences) {
        //     this.restoreSize(containerId);
        // }
        console.log(`🚫 跳过尺寸恢复，保持原始状态: ${containerId}`);
        
        console.log(`✅ 容器 ${containerId} 已设置为可拖拽缩放，配置:`, config);
        
        // 🔄 自动创建同步组（如果启用了同步功能）
        if (this.options.enableSync) {
            this.createOrJoinSyncGroup(containerId);
        }
        
        return true;
    }
    
    /**
     * 创建或加入同步组
     */
    createOrJoinSyncGroup(containerId) {
        // 查找同级的图表容器作为同步组
        const container = document.getElementById(containerId);
        const plotsContainer = container.closest('.plots-container');
        
        if (plotsContainer) {
            const groupId = plotsContainer.id || 'default-sync-group';
            
            if (!this.syncGroups.has(groupId)) {
                this.syncGroups.set(groupId, new Set());
            }
            
            this.syncGroups.get(groupId).add(containerId);
            console.log(`🔄 容器 ${containerId} 加入同步组: ${groupId}`);
        }
    }
    
    /**
     * 同步相关容器的尺寸
     */
    async syncRelatedContainers(sourceContainerId, newWidth, newHeight) {
        if (!this.options.enableSync || this.isSyncing) return;
        
        // 🔒 防止递归同步
        this.isSyncing = true;
        
        try {
            // 查找源容器所在的同步组
            let syncGroupId = null;
            for (const [groupId, containers] of this.syncGroups.entries()) {
                if (containers.has(sourceContainerId)) {
                    syncGroupId = groupId;
                    break;
                }
            }
            
            if (!syncGroupId) return;
            
            const syncGroup = this.syncGroups.get(syncGroupId);
            const sourceConfig = this.resizableContainers.get(sourceContainerId);
            
            if (!sourceConfig) return;
            
            console.log(`🔄 开始同步调整，源: ${sourceContainerId} (${newWidth}×${newHeight})`);
            
            // 计算缩放比例
            const scaleX = newWidth / sourceConfig.originalWidth;
            const scaleY = newHeight / sourceConfig.originalHeight;
            
            // 同步其他容器
            syncGroup.forEach(targetContainerId => {
                if (targetContainerId === sourceContainerId) return; // 跳过源容器
                
                const targetConfig = this.resizableContainers.get(targetContainerId);
                if (!targetConfig) return;
                
                let targetWidth, targetHeight;
                
                switch (this.options.syncMode) {
                    case 'uniform':
                        // 统一尺寸：所有图表使用相同尺寸
                        targetWidth = newWidth;
                        targetHeight = newHeight;
                        break;
                        
                    case 'proportional':
                    default:
                        // 比例缩放：按原始比例缩放
                        targetWidth = Math.round(targetConfig.originalWidth * scaleX);
                        targetHeight = Math.round(targetConfig.originalHeight * scaleY);
                        break;
                }
                
                // 🔄 检查是否为单列布局模式
                const plotsContainer = sourceConfig.container.closest('.plots-container');
                const isSingleColumn = plotsContainer && plotsContainer.classList.contains('force-single-column');
                
                // 应用尺寸限制
                targetWidth = Math.max(this.options.minWidth, targetWidth);
                targetHeight = Math.max(this.options.minHeight, targetHeight);
                
                if (this.options.maxWidth && !isSingleColumn) {
                    targetWidth = Math.min(this.options.maxWidth, targetWidth);
                }
                if (this.options.maxHeight && !isSingleColumn) {
                    targetHeight = Math.min(this.options.maxHeight, targetHeight);
                }
                
                // 🔄 在单列布局时，允许更大的高度范围
                if (isSingleColumn) {
                    // 单列布局时允许更灵活的高度调整
                    const maxSingleColumnHeight = window.innerHeight * 0.8; // 最大80%屏幕高度
                    targetHeight = Math.min(targetHeight, maxSingleColumnHeight);
                    console.log(`📱 单列布局模式，允许更大高度: ${targetHeight}px (最大: ${maxSingleColumnHeight}px)`);
                }
                
                console.log(`🔄 同步调整目标: ${targetContainerId} -> ${targetWidth}×${targetHeight} (比例: ${scaleX.toFixed(2)}×${scaleY.toFixed(2)})`);
                
                // 更新目标容器
                targetConfig.currentWidth = targetWidth;
                targetConfig.currentHeight = targetHeight;
                
                this.updateContainerSize(targetConfig.container, targetWidth, targetHeight);
                
                // 🔄 强化同步时的Plotly更新
                this.updatePlotlySize(targetConfig.plotlyDiv, targetWidth, targetHeight);
                
                // 🔄 额外的强制更新，确保同步时图表正确显示
                setTimeout(async () => {
                    try {
                        if (targetConfig.plotlyDiv && window.Plotly) {
                            console.log(`🔄 同步后强制刷新图表: ${targetContainerId}`);
                            
                            // 方法1: 查找并强制更新所有Plotly元素
                            const plotlyElements = targetConfig.plotlyDiv.querySelectorAll('.plotly-graph-div');
                            if (plotlyElements.length > 0) {
                                for (let element of plotlyElements) {
                                    if (element._fullLayout && 
                                        element.offsetWidth > 0 && 
                                        element.offsetHeight > 0 &&
                                        element.style.display !== 'none') {
                                        await Plotly.Plots.resize(element);
                                        console.log(`✅ 同步后Plotly.Plots.resize成功`);
                                    } else {
                                        console.log(`⚠️ 跳过同步resize - 元素不可见或无效`);
                                    }
                                }
                            } else if (targetConfig.plotlyDiv._fullLayout && 
                                       targetConfig.plotlyDiv.offsetWidth > 0 && 
                                       targetConfig.plotlyDiv.offsetHeight > 0 &&
                                       targetConfig.plotlyDiv.style.display !== 'none') {
                                // 容器本身就是Plotly元素
                                await Plotly.Plots.resize(targetConfig.plotlyDiv);
                                console.log(`✅ 同步后直接Plotly.Plots.resize成功`);
                            } else {
                                // 备用方案：全局刷新
                                window.dispatchEvent(new Event('resize'));
                                console.log(`🔄 同步后触发全局resize事件`);
                            }
                        }
                    } catch (error) {
                        console.warn('⚠️ 同步后强制刷新失败:', error);
                    }
                }, 200);
                
                this.updateResizeInfo(targetConfig.container, targetWidth, targetHeight);
                
                // 保存同步后的尺寸
                if (this.options.savePreferences) {
                    this.saveSize(targetContainerId, targetWidth, targetHeight);
                }
            });
            
            // 检查并调整布局
            this.checkAndAdjustLayout(sourceConfig.container, newWidth);
            
        } finally {
            // 🔓 释放同步锁
            this.isSyncing = false;
        }
    }
    
    /**
     * 设置容器 - 绝对不修改任何尺寸
     */
    setupContainer(container, config) {
        // 🔒 只记录原始尺寸，绝对不修改
        const actualWidth = container.offsetWidth;
        const actualHeight = container.offsetHeight;
        
        console.log(`🔒 记录原始容器尺寸: ${container.id} = ${actualWidth}×${actualHeight} (不做任何修改)`);
        
        // 📝 更新配置，但不修改DOM
        config.originalWidth = actualWidth;
        config.originalHeight = actualHeight;
        config.currentWidth = actualWidth;
        config.currentHeight = actualHeight;
        
        // 🎯 只添加样式类，绝对不设置任何尺寸或布局相关样式
        container.classList.add('resizable-plotly-container');
        
        // 🔧 只在绝对必要时设置position，并且不影响尺寸
        const computedStyle = window.getComputedStyle(container);
        if (computedStyle.position === 'static') {
            container.style.position = 'relative';
        }
        
        // 🔍 防止重复添加拖拽元素（双重保险）
        if (!container.querySelector('.resize-handle')) {
            // 创建拖拽手柄
            const handle = this.createResizeHandle(container);
            container.appendChild(handle);
            console.log(`✅ 已添加拖拽手柄到容器 ${container.id}`);
        } else {
            console.log(`📝 容器 ${container.id} 已有拖拽手柄，跳过创建`);
        }
        
        // 创建尺寸信息显示
        if (this.options.showResizeInfo && !container.querySelector('.resize-info')) {
            const info = this.createResizeInfo(container);
            container.appendChild(info);
            console.log(`✅ 已添加尺寸信息到容器 ${container.id}`);
        }
        
        // 🔍 防止重复添加控制按钮（双重保险）
        if (!container.querySelector('.resize-controls')) {
            // 创建控制按钮
            const controls = this.createResizeControls(container);
            container.appendChild(controls);
            console.log(`✅ 已添加控制按钮到容器 ${container.id}`);
        } else {
            console.log(`📝 容器 ${container.id} 已有控制按钮，跳过创建`);
        }
        
        // 🔧 添加容器事件监听，确保交互正常（防止重复绑定）
        if (!container.hasAttribute('data-events-bound')) {
            container.addEventListener('mouseenter', () => {
                // 确保Plotly交互正常
                if (config.plotlyDiv && !this.isResizing) {
                    this.enablePlotlyInteraction(config.plotlyDiv);
                }
            });
            
            container.addEventListener('mouseleave', () => {
                // 鼠标离开时，确保没有遗留的状态问题
                if (!this.isResizing && config.plotlyDiv) {
                    // 确保pointer-events正常
                    config.plotlyDiv.style.pointerEvents = '';
                }
            });
            
            // 标记事件已绑定
            container.setAttribute('data-events-bound', 'true');
            console.log(`✅ 已绑定事件监听器到容器 ${container.id}`);
        } else {
            console.log(`📝 容器 ${container.id} 事件已绑定，跳过重复绑定`);
        }
        
        console.log(`✅ 容器 ${container.id} 拖拽功能已添加 (原始尺寸完全保持: ${actualWidth}×${actualHeight})`);
    }
    
    /**
     * 🔧 强制重新初始化所有容器（调试用）
     */
    forceReinitializeAll() {
        console.log('🔧 开始强制重新初始化所有容器...');
        
        // 获取所有已注册的容器ID
        const containerIds = Array.from(this.resizableContainers.keys());
        
        // 清空注册表
        this.resizableContainers.clear();
        
        // 重新初始化每个容器
        let successCount = 0;
        containerIds.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                // 清理所有拖拽相关元素
                const oldHandle = container.querySelector('.resize-handle');
                const oldControls = container.querySelector('.resize-controls');
                const oldInfo = container.querySelector('.resize-info');
                if (oldHandle) oldHandle.remove();
                if (oldControls) oldControls.remove();
                if (oldInfo) oldInfo.remove();
                
                // 清理事件绑定标记
                container.removeAttribute('data-events-bound');
                
                // 重新初始化
                if (this.makeResizable(containerId)) {
                    successCount++;
                    console.log(`✅ 重新初始化成功: ${containerId}`);
                } else {
                    console.warn(`⚠️ 重新初始化失败: ${containerId}`);
                }
            } else {
                console.warn(`⚠️ 容器不存在: ${containerId}`);
            }
        });
        
        console.log(`🔧 强制重新初始化完成: ${successCount}/${containerIds.length} 个容器成功`);
        return successCount;
    }
    
    /**
     * 创建拖拽手柄
     */
    createResizeHandle(container) {
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.title = '拖拽调整图表大小';
        
        // 鼠标事件
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startResize(container, e.clientX, e.clientY);
        });
        
        // 触摸事件
        if (this.options.enableTouch) {
            handle.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                this.startResize(container, touch.clientX, touch.clientY);
            }, { passive: false });
        }
        
        return handle;
    }
    
    /**
     * 创建尺寸信息显示
     */
    createResizeInfo(container) {
        const info = document.createElement('div');
        info.className = 'resize-info';
        return info;
    }
    
    /**
     * 创建控制按钮
     */
    createResizeControls(container) {
        const controls = document.createElement('div');
        controls.className = 'resize-controls';
        
        // 重置按钮
        const resetBtn = document.createElement('button');
        resetBtn.className = 'resize-control-btn';
        resetBtn.innerHTML = '⟲';
        
        // 🔄 使用真实的原始尺寸作为提示
        const config = this.getContainerConfig(container);
        const originalSize = config ? `${config.originalWidth}×${config.originalHeight}` : '原始大小';
        resetBtn.title = `重置为原始大小 (${originalSize})`;
        resetBtn.setAttribute('data-tooltip', '重置为原始大小');
        resetBtn.addEventListener('click', () => this.resetSize(container));
        
        // 最大化按钮
        const maxBtn = document.createElement('button');
        maxBtn.className = 'resize-control-btn';
        maxBtn.innerHTML = '⤢';
        maxBtn.title = '最大化到屏幕尺寸';
        maxBtn.setAttribute('data-tooltip', '最大化图表');
        maxBtn.addEventListener('click', () => this.maximizeSize(container));
        
        // 适应内容按钮
        const fitBtn = document.createElement('button');
        fitBtn.className = 'resize-control-btn';
        fitBtn.innerHTML = '⤏';
        fitBtn.title = '适应父容器大小';
        fitBtn.setAttribute('data-tooltip', '适应内容');
        fitBtn.addEventListener('click', () => this.fitContent(container));
        
        controls.appendChild(resetBtn);
        controls.appendChild(maxBtn);
        controls.appendChild(fitBtn);
        
        return controls;
    }
    
    /**
     * 开始拖拽缩放
     */
    startResize(container, startX, startY) {
        this.isResizing = true;
        this.currentContainer = container;
        
        const config = this.getContainerConfig(container);
        if (!config) return;
        
        // 记录起始位置和尺寸
        this.startX = startX;
        this.startY = startY;
        this.startWidth = config.currentWidth;
        this.startHeight = config.currentHeight;
        
        // 添加视觉反馈
        container.classList.add('resizing');
        const handle = container.querySelector('.resize-handle');
        if (handle) handle.classList.add('active');
        
        // 禁用Plotly的交互（避免冲突）
        this.disablePlotlyInteraction(config.plotlyDiv);
        
        // 更新尺寸信息
        this.updateResizeInfo(container, config.currentWidth, config.currentHeight);
        
        document.body.style.cursor = 'nw-resize';
        document.body.style.userSelect = 'none';
        
        console.log(`🔄 开始拖拽缩放: ${container.id}`);
    }
    
    /**
     * 处理鼠标移动
     */
    handleMouseMove(e) {
        if (!this.isResizing || !this.currentContainer) return;
        
        e.preventDefault();
        this.updateSize(e.clientX, e.clientY);
    }
    
    /**
     * 处理触摸移动
     */
    handleTouchMove(e) {
        if (!this.isResizing || !this.currentContainer) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        this.updateSize(touch.clientX, touch.clientY);
    }
    
    /**
     * 更新尺寸
     */
    updateSize(currentX, currentY) {
        const container = this.currentContainer;
        const config = this.getContainerConfig(container);
        if (!config) return;
        
        // 计算新尺寸
        const deltaX = currentX - this.startX;
        const deltaY = currentY - this.startY;
        
        let newWidth = Math.max(this.startWidth + deltaX, this.options.minWidth);
        let newHeight = Math.max(this.startHeight + deltaY, this.options.minHeight);
        
        // 应用最大尺寸限制
        if (this.options.maxWidth) {
            newWidth = Math.min(newWidth, this.options.maxWidth);
        }
        if (this.options.maxHeight) {
            newHeight = Math.min(newHeight, this.options.maxHeight);
        }
        
        // 约束到视口范围内（单列布局时更宽松）
        if (this.options.constrainToViewport) {
            const plotsContainer = container.closest('.plots-container');
            const isSingleColumn = plotsContainer && plotsContainer.classList.contains('force-single-column');
            
            const containerRect = container.getBoundingClientRect();
            const maxAllowedWidth = window.innerWidth - containerRect.left - 50;
            let maxAllowedHeight;
            
            if (isSingleColumn) {
                // 🔄 单列布局时允许更大的高度范围
                maxAllowedHeight = window.innerHeight * 0.85; // 85%屏幕高度
                console.log(`📱 单列布局视口约束: 最大高度 ${maxAllowedHeight}px`);
            } else {
                // 双列布局时保持原有约束
                maxAllowedHeight = window.innerHeight - containerRect.top - 50;
            }
            
            newWidth = Math.min(newWidth, maxAllowedWidth);
            newHeight = Math.min(newHeight, maxAllowedHeight);
        }
        
        // 更新配置
        config.currentWidth = newWidth;
        config.currentHeight = newHeight;
        
        // 应用新尺寸
        this.updateContainerSize(container, newWidth, newHeight);
        
        // 更新尺寸信息显示
        this.updateResizeInfo(container, newWidth, newHeight);
        
        // 延迟更新Plotly（性能优化）
        this.debouncedUpdatePlotly(config.plotlyDiv, newWidth, newHeight);
        
        // 🔄 触发同步调整（实时同步，但拖拽时减少频率）
        if (this.options.enableSync && !this.isSyncing) {
            // 不需要等待拖拽时的同步，避免阻塞用户操作
            this.syncRelatedContainers(container.id, newWidth, newHeight);
        }
        
        // 智能布局检测：在同步完成后再检查布局
        this.checkAndAdjustLayout(container, newWidth);
    }
    
    /**
     * 更新容器尺寸（仅在用户拖拽时调用）
     */
    updateContainerSize(container, width, height) {
        console.log(`🔧 更新容器尺寸: ${container.id} -> ${width}×${height}`);
        
        // 🎯 只设置必要的尺寸属性
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        
        // 🚫 不设置min-width和min-height，避免影响原始布局
        // container.style.minWidth = `${width}px`;
        // container.style.minHeight = `${height}px`;
        
        // 同时更新内部div的尺寸，但要保留足够的空间给控件
        const plotDiv = container.querySelector('.plotly-graph-div') || container.firstElementChild;
        if (plotDiv && plotDiv !== container) {
            const plotWidth = Math.max(200, width - 20);
            const plotHeight = Math.max(150, height - 60);
            
            plotDiv.style.width = `${plotWidth}px`;
            plotDiv.style.height = `${plotHeight}px`;
            
            console.log(`🔧 同时更新内部plot div: ${plotWidth}×${plotHeight}`);
        }
    }
    
    /**
     * 更新尺寸信息显示
     */
    updateResizeInfo(container, width, height) {
        const info = container.querySelector('.resize-info');
        if (info) {
            info.textContent = `${Math.round(width)} × ${Math.round(height)}`;
        }
    }
    
    /**
     * 防抖更新Plotly
     */
    debouncedUpdatePlotly(plotlyDiv, width, height) {
        const now = Date.now();
        this.lastUpdateTime = now;
        
        console.log(`⏱️ 防抖更新Plotly: ${width}×${height}, 延迟${this.options.debounceTime}ms`);
        
        setTimeout(() => {
            if (this.lastUpdateTime === now) {
                console.log(`✅ 执行防抖更新Plotly: ${width}×${height}`);
                this.updatePlotlySize(plotlyDiv, width, height);
            } else {
                console.log(`❌ 防抖更新被跳过 (有更新的请求)`);
            }
        }, this.options.debounceTime);
    }
    
    /**
     * 更新Plotly图表尺寸
     */
    async updatePlotlySize(plotlyDiv, width, height) {
        if (!plotlyDiv || !window.Plotly) {
            console.warn('⚠️ plotlyDiv或Plotly库不可用');
            return;
        }
        
        try {
            // 计算实际图表尺寸（减去容器内边距和控件空间）
            const actualWidth = Math.max(200, width - 20);  // 减小边距
            const actualHeight = Math.max(150, height - 60); // 减小边距，为导出按钮留空间
            
            console.log(`🔍 开始更新Plotly图表尺寸: 容器=${width}×${height}, 图表=${actualWidth}×${actualHeight}`);
            
            // 方法1: 直接查找.plotly-graph-div元素
            let plotlyElements = plotlyDiv.querySelectorAll('.plotly-graph-div');
            
            // 方法2: 如果没找到，尝试其他可能的选择器
            if (plotlyElements.length === 0) {
                plotlyElements = plotlyDiv.querySelectorAll('[id*="plotly"], .js-plotly-plot, div[style*="plotly"]');
            }
            
            // 方法3: 如果还是没找到，检查容器本身是否就是Plotly元素
            if (plotlyElements.length === 0 && plotlyDiv._fullLayout) {
                plotlyElements = [plotlyDiv];
            }
            
            console.log(`🔍 找到 ${plotlyElements.length} 个Plotly图表元素`);
            
            if (plotlyElements.length > 0) {
                // 更新所有找到的Plotly元素
                for (let element of plotlyElements) {
                    try {
                        console.log(`🔧 正在更新Plotly元素:`, {
                            tagName: element.tagName,
                            id: element.id,
                            className: element.className,
                            currentSize: `${element.offsetWidth}×${element.offsetHeight}`,
                            targetSize: `${actualWidth}×${actualHeight}`,
                            hasLayout: !!element._fullLayout
                        });
                        
                        // 先设置DOM尺寸
                        element.style.width = `${actualWidth}px`;
                        element.style.height = `${actualHeight}px`;
                        
                        // 强制刷新样式
                        element.offsetHeight; // 触发重新计算
                        
                        // 如果元素有Plotly布局，使用多重更新策略
                        if (element._fullLayout) {
                            // 🔄 策略1: 使用relayout更新尺寸
                            await Plotly.relayout(element, {
                                width: actualWidth,
                                height: actualHeight,
                                autosize: false
                            });
                            console.log(`✅ Plotly.relayout成功: ${actualWidth}×${actualHeight}`);
                            
                            // 🔄 策略2: 额外使用Plots.resize确保生效
                            setTimeout(async () => {
                                try {
                                    // 检查元素是否可见和有效
                                    if (window.Plotly.Plots && window.Plotly.Plots.resize && 
                                        element._fullLayout && 
                                        element.offsetWidth > 0 && 
                                        element.offsetHeight > 0 &&
                                        element.style.display !== 'none') {
                                        await Plotly.Plots.resize(element);
                                        console.log(`✅ 额外Plotly.Plots.resize成功`);
                                    } else {
                                        console.log(`⚠️ 跳过Plotly.Plots.resize - 元素不可见或无效`);
                                    }
                                } catch (resizeError) {
                                    console.warn('⚠️ 额外resize失败:', resizeError);
                                }
                            }, 100);
                            
                        } else {
                            // 如果没有布局信息，尝试使用resize
                            if (window.Plotly.Plots && window.Plotly.Plots.resize) {
                                await Plotly.Plots.resize(element);
                                console.log(`✅ Plotly.Plots.resize成功`);
                            } else {
                                console.warn(`⚠️ 元素没有_fullLayout且Plotly.Plots.resize不可用`);
                            }
                        }
                        
                        // 再次检查尺寸是否正确设置，并确保交互层正常
                        setTimeout(() => {
                            console.log(`🔍 更新后检查: ${element.offsetWidth}×${element.offsetHeight}`);
                            
                            // 🔧 对于热力图等交互性图表，额外刷新交互层
                            if (element._fullLayout && window.Plotly) {
                                try {
                                    Plotly.redraw(element);
                                    console.log('🔧 Plotly交互层已重新绘制');
                                } catch (error) {
                                    console.warn('⚠️ Plotly重绘失败:', error);
                                }
                            }
                        }, 200);
                        
                    } catch (elementError) {
                        console.warn(`⚠️ 单个元素更新失败:`, elementError);
                    }
                }
            } else {
                console.warn('⚠️ 未找到任何Plotly图表元素，尝试容器级别的强制更新');
                
                // 🔄 方法1: 设置容器本身的尺寸
                plotlyDiv.style.width = `${width}px`;
                plotlyDiv.style.height = `${height}px`;
                
                // 🔄 方法2: 强制设置所有子div的尺寸
                const allDivs = plotlyDiv.querySelectorAll('div');
                allDivs.forEach(div => {
                    if (div.clientWidth > 100 || div.clientHeight > 100) { // 只更新看起来像图表的div
                        div.style.width = `${actualWidth}px`;
                        div.style.height = `${actualHeight}px`;
                        
                        // 🔄 如果这个div有Plotly相关属性，尝试强制更新
                        if (div._fullLayout || div.data || div.layout) {
                            try {
                                if (window.Plotly && window.Plotly.Plots && window.Plotly.Plots.resize) {
                                    setTimeout(async () => {
                                        try {
                                            await Plotly.Plots.resize(div);
                                            console.log('🔧 备用方案Plotly.Plots.resize成功');
                                        } catch (error) {
                                            console.warn('⚠️ 备用方案Plotly.Plots.resize失败:', error);
                                        }
                                    }, 150);
                                }
                            } catch (error) {
                                console.warn('⚠️ 备用Plotly更新失败:', error);
                            }
                        }
                    }
                });
                
                // 🔄 方法3: 强制触发窗口resize事件，让Plotly自动调整
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                    console.log('🔧 触发全局resize事件');
                }, 100);
                
                // 🔄 方法4: 尝试全局Plotly更新
                setTimeout(() => {
                    try {
                        if (window.Plotly && window.Plotly.Plots) {
                            // 查找页面上所有可能的Plotly元素
                            const allPlotlyElements = document.querySelectorAll('.plotly-graph-div, [id*="plotly"]');
                            allPlotlyElements.forEach(async (element) => {
                                if (plotlyDiv.contains(element) && element._fullLayout) {
                                    try {
                                        await Plotly.Plots.resize(element);
                                        console.log('🔧 全局Plotly更新成功');
                                    } catch (error) {
                                        console.warn('⚠️ 全局Plotly更新失败:', error);
                                    }
                                }
                            });
                        }
                    } catch (error) {
                        console.warn('⚠️ 全局Plotly搜索失败:', error);
                    }
                }, 250);
                
                console.log(`🔧 执行了容器级别的强制更新`);
            }
            
        } catch (error) {
            console.error('❌ Plotly尺寸更新完全失败:', error);
            console.error('错误详情:', {
                plotlyDiv: plotlyDiv,
                plotlyAvailable: !!window.Plotly,
                containerInfo: {
                    id: plotlyDiv.id,
                    className: plotlyDiv.className,
                    childCount: plotlyDiv.children.length
                }
            });
        }
    }
    
    /**
     * 结束拖拽
     */
    handleMouseUp(e) {
        this.endResize();
    }
    
    /**
     * 结束触摸
     */
    handleTouchEnd(e) {
        this.endResize();
    }
    
    /**
     * 结束拖拽缩放
     */
    endResize() {
        if (!this.isResizing || !this.currentContainer) return;
        
        const container = this.currentContainer;
        const config = this.getContainerConfig(container);
        
        // 恢复状态
        this.isResizing = false;
        container.classList.remove('resizing');
        
        const handle = container.querySelector('.resize-handle');
        if (handle) handle.classList.remove('active');
        
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // 重新启用Plotly交互
        if (config && config.plotlyDiv) {
            this.enablePlotlyInteraction(config.plotlyDiv);
        }
        
        // 保存尺寸偏好
        if (this.options.savePreferences && config) {
            this.saveSize(container.id, config.currentWidth, config.currentHeight);
        }
        
        // 最终更新Plotly（强制同步更新）
        if (config && config.plotlyDiv) {
            console.log(`🏁 拖拽结束，强制更新Plotly: ${config.currentWidth}×${config.currentHeight}`);
            // 取消防抖，立即更新
            this.lastUpdateTime = 0;
            this.updatePlotlySize(config.plotlyDiv, config.currentWidth, config.currentHeight);
        }
        
        // 🔄 拖拽结束后的最终同步
        if (this.options.enableSync && config) {
            console.log(`🔄 拖拽结束，执行最终同步: ${container.id}`);
            this.syncRelatedContainers(container.id, config.currentWidth, config.currentHeight);
        }
        
        this.currentContainer = null;
        console.log(`✅ 拖拽缩放完成: ${container.id}`);
    }
    
    /**
     * 禁用Plotly交互
     */
    disablePlotlyInteraction(plotlyDiv) {
        if (plotlyDiv) {
            plotlyDiv.style.pointerEvents = 'none';
        }
    }
    
    /**
     * 启用Plotly交互
     */
    enablePlotlyInteraction(plotlyDiv) {
        if (plotlyDiv) {
            plotlyDiv.style.pointerEvents = '';
            
            // 🔧 延迟刷新Plotly交互层，确保热力图交互正常
            setTimeout(() => {
                if (window.Plotly && plotlyDiv._fullLayout) {
                    try {
                        // 强制重新绘制Plotly图表，修复交互层
                        Plotly.redraw(plotlyDiv);
                        console.log('🔧 Plotly交互层已刷新');
                    } catch (error) {
                        console.warn('⚠️ Plotly交互层刷新失败:', error);
                    }
                }
            }, 100);
        }
    }
    
    /**
     * 重置尺寸
     */
    resetSize(container) {
        const config = this.getContainerConfig(container);
        if (!config) return;
        
        // 🔄 重置为记录的原始尺寸，而不是默认尺寸
        config.currentWidth = config.originalWidth;
        config.currentHeight = config.originalHeight;
        
        this.updateContainerSize(container, config.currentWidth, config.currentHeight);
        this.updatePlotlySize(config.plotlyDiv, config.currentWidth, config.currentHeight);
        
        // 清除保存的偏好
        if (this.options.savePreferences) {
            localStorage.removeItem(`resizable-plotly-${container.id}`);
        }
        
        // 🔄 同步重置其他容器
        if (this.options.enableSync) {
            this.syncRelatedContainers(container.id, config.currentWidth, config.currentHeight);
        }
        
        console.log(`🔄 ${container.id} 已重置为原始尺寸: ${config.currentWidth}×${config.currentHeight}`);
    }
    
    /**
     * 最大化尺寸
     */
    maximizeSize(container) {
        const config = this.getContainerConfig(container);
        if (!config) return;
        
        const maxWidth = window.innerWidth - 100;
        const maxHeight = window.innerHeight - 200;
        
        config.currentWidth = maxWidth;
        config.currentHeight = maxHeight;
        
        this.updateContainerSize(container, config.currentWidth, config.currentHeight);
        this.updatePlotlySize(config.plotlyDiv, config.currentWidth, config.currentHeight);
        
        // 🔄 同步最大化其他容器
        if (this.options.enableSync) {
            this.syncRelatedContainers(container.id, config.currentWidth, config.currentHeight);
        }
        
        console.log(`📈 ${container.id} 已最大化`);
    }
    
    /**
     * 适应内容
     */
    fitContent(container) {
        const config = this.getContainerConfig(container);
        if (!config) return;
        
        // 基于父容器尺寸计算合适的大小
        const parent = container.parentElement;
        if (parent) {
            const parentRect = parent.getBoundingClientRect();
            config.currentWidth = Math.min(parentRect.width - 40, this.options.defaultWidth);
            config.currentHeight = Math.min(parentRect.height - 40, this.options.defaultHeight);
            
            this.updateContainerSize(container, config.currentWidth, config.currentHeight);
            this.updatePlotlySize(config.plotlyDiv, config.currentWidth, config.currentHeight);
            
            // 🔄 同步适应其他容器
            if (this.options.enableSync) {
                this.syncRelatedContainers(container.id, config.currentWidth, config.currentHeight);
            }
            
            console.log(`📐 ${container.id} 已适应内容`);
        }
    }
    
    /**
     * 保存尺寸偏好
     */
    saveSize(containerId, width, height) {
        try {
            const data = { width, height, timestamp: Date.now() };
            localStorage.setItem(`resizable-plotly-${containerId}`, JSON.stringify(data));
        } catch (error) {
            console.warn('⚠️ 无法保存尺寸偏好:', error);
        }
    }
    
    /**
     * 恢复尺寸偏好
     */
    restoreSize(containerId) {
        try {
            const saved = localStorage.getItem(`resizable-plotly-${containerId}`);
            if (saved) {
                const data = JSON.parse(saved);
                const config = this.resizableContainers.get(containerId);
                if (config) {
                    config.currentWidth = data.width;
                    config.currentHeight = data.height;
                    
                    this.updateContainerSize(config.container, data.width, data.height);
                    this.updatePlotlySize(config.plotlyDiv, data.width, data.height);
                    
                    console.log(`📂 ${containerId} 尺寸偏好已恢复: ${data.width} × ${data.height}`);
                }
            }
        } catch (error) {
            console.warn('⚠️ 无法恢复尺寸偏好:', error);
        }
    }
    
    /**
     * 智能布局检测和调整（基于CSS Grid）
     */
    checkAndAdjustLayout(container, newWidth) {
        const plotsContainer = container.closest('.plots-container');
        if (!plotsContainer) return;
        
        // 计算所有可见图表容器的总宽度
        const allPlotItems = plotsContainer.querySelectorAll('.plot-item:not([style*="display: none"])');
        const containerPadding = 100; // 增加边距容忍度
        const gap = 16; // CSS Grid gap通常是1rem = 16px
        
        // 只有当有多个图表时才考虑布局调整
        if (allPlotItems.length <= 1) {
            plotsContainer.classList.remove('force-single-column');
            return;
        }
        
        let maxItemWidth = 0;
        allPlotItems.forEach(item => {
            const resizableContainer = item.querySelector('.resizable-plotly-container');
            if (resizableContainer) {
                const width = resizableContainer === container ? newWidth : 
                             (resizableContainer.offsetWidth || this.options.defaultWidth);
                maxItemWidth = Math.max(maxItemWidth, width);
            }
        });
        
        // 基于CSS Grid的两列布局计算
        const requiredWidthForTwoColumns = (maxItemWidth * 2) + gap + containerPadding;
        const availableWidth = window.innerWidth;
        const isCurrentlySingleColumn = plotsContainer.classList.contains('force-single-column');
        
        // 🔄 改进的布局切换逻辑
        if (!isCurrentlySingleColumn && requiredWidthForTwoColumns > availableWidth && allPlotItems.length > 1) {
            plotsContainer.classList.add('force-single-column');
            console.log('📱 触发单列布局，最大图表宽度:', maxItemWidth, '需要宽度:', requiredWidthForTwoColumns, '可用宽度:', availableWidth);
            
            // 🔄 切换到单列布局后，通知所有图表刷新
            setTimeout(() => {
                allPlotItems.forEach(item => {
                    const resizableContainer = item.querySelector('.resizable-plotly-container');
                    if (resizableContainer) {
                        const config = this.getContainerConfig(resizableContainer);
                        if (config && config.plotlyDiv) {
                            this.updatePlotlySize(config.plotlyDiv, config.currentWidth, config.currentHeight);
                        }
                    }
                });
            }, 100);
            
        } else if (isCurrentlySingleColumn && requiredWidthForTwoColumns < availableWidth * 0.85) {
            // 当有足够空间时，恢复两列布局（降低阈值，更容易恢复）
            plotsContainer.classList.remove('force-single-column');
            console.log('📱 恢复两列布局，空间充足');
            
            // 🔄 恢复两列布局后，通知所有图表刷新
            setTimeout(() => {
                allPlotItems.forEach(item => {
                    const resizableContainer = item.querySelector('.resizable-plotly-container');
                    if (resizableContainer) {
                        const config = this.getContainerConfig(resizableContainer);
                        if (config && config.plotlyDiv) {
                            this.updatePlotlySize(config.plotlyDiv, config.currentWidth, config.currentHeight);
                        }
                    }
                });
            }, 100);
        }
    }
    
    /**
     * 处理窗口大小变化
     */
    handleWindowResize() {
        this.resizableContainers.forEach((config, containerId) => {
            // 确保容器不超出新的视口尺寸
            if (this.options.constrainToViewport) {
                const container = config.container;
                const containerRect = container.getBoundingClientRect();
                
                const maxWidth = window.innerWidth - containerRect.left - 50;
                const maxHeight = window.innerHeight - containerRect.top - 50;
                
                if (config.currentWidth > maxWidth || config.currentHeight > maxHeight) {
                    config.currentWidth = Math.min(config.currentWidth, maxWidth);
                    config.currentHeight = Math.min(config.currentHeight, maxHeight);
                    
                    this.updateContainerSize(container, config.currentWidth, config.currentHeight);
                    this.updatePlotlySize(config.plotlyDiv, config.currentWidth, config.currentHeight);
                }
            }
            
            // 窗口大小变化时检查智能布局
            this.checkAndAdjustLayout(config.container, config.currentWidth);
            
            // 🔧 窗口大小变化后，刷新Plotly交互层
            if (config.plotlyDiv && window.Plotly && config.plotlyDiv._fullLayout) {
                setTimeout(() => {
                    try {
                        Plotly.redraw(config.plotlyDiv);
                        console.log('🔧 窗口调整后Plotly交互层已刷新');
                    } catch (error) {
                        console.warn('⚠️ 窗口调整后Plotly刷新失败:', error);
                    }
                }, 200);
            }
        });
    }
    
    /**
     * 处理键盘快捷键
     */
    handleKeyDown(e) {
        if (!this.isResizing) return;
        
        // ESC键取消拖拽
        if (e.key === 'Escape') {
            this.endResize();
        }
    }
    
    /**
     * 获取容器配置
     */
    getContainerConfig(container) {
        const id = container.id || container.getAttribute('data-container-id');
        return this.resizableContainers.get(id);
    }
    
    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * 移除可拖拽功能
     */
    removeResizable(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return false;
        
        // 移除样式和元素
        container.classList.remove('resizable-plotly-container', 'resizing');
        
        const handle = container.querySelector('.resize-handle');
        const info = container.querySelector('.resize-info');
        const controls = container.querySelector('.resize-controls');
        
        if (handle) handle.remove();
        if (info) info.remove();
        if (controls) controls.remove();
        
        // 从映射中移除
        this.resizableContainers.delete(containerId);
        
        console.log(`🗑️ ${containerId} 的拖拽缩放功能已移除`);
        return true;
    }
    
    /**
     * 销毁实例
     */
    destroy() {
        // 移除所有可拖拽容器
        for (const containerId of this.resizableContainers.keys()) {
            this.removeResizable(containerId);
        }
        
        // 移除全局事件监听器
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        window.removeEventListener('resize', this.handleWindowResize);
        document.removeEventListener('keydown', this.handleKeyDown);
        
        // 移除样式
        const style = document.getElementById('resizable-plotly-styles');
        if (style) style.remove();
        
        console.log('🗑️ ResizablePlotly 实例已销毁');
    }
}

// 创建全局实例
window.ResizablePlotlyManager = new ResizablePlotly();

// 导出类供外部使用
window.ResizablePlotly = ResizablePlotly;

// 🔧 添加全局调试函数
window.fixResizableCharts = function() {
    if (window.ResizablePlotlyManager) {
        const count = window.ResizablePlotlyManager.forceReinitializeAll();
        console.log(`🔧 通过全局函数修复了 ${count} 个图表容器`);
        
        // 显示修复提示
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 300px;
        `;
        notification.innerHTML = `
            🔧 图表拖拽功能已修复<br>
            <small style="font-size: 12px; opacity: 0.8;">成功修复 ${count} 个容器</small>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
        
        return count;
    } else {
        console.warn('⚠️ ResizablePlotlyManager未初始化');
        alert('⚠️ 图表管理器未初始化，无法修复');
        return 0;
    }
};

console.log('📦 ResizablePlotly 模块已加载');
console.log('🔧 调试功能：如果拖拽标志消失，请在Console中调用 fixResizableCharts()');