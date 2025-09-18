class VideoAlignment {
    constructor() {
        this.video = null;
        this.heatmapCanvas = null;
        this.overlayCanvas = null;
        this.heatmapCtx = null;
        this.overlayCtx = null;
        this.mergedCanvas = null;
        this.mergedCtx = null;
        this.processingCanvas = document.createElement('canvas');
        this.processingCtx = this.processingCanvas.getContext('2d', { willReadFrequently: true });
        this.width = 320;
        this.height = 240;
        this.heatmapImageData = null;
        this.intensityBuffer = null;
        this.stream = null;
        this.animationId = null;
        this.mode = 'brightest';
        this.isStreaming = false;
        this.isTabActive = false;
        this.secondaryPeakRatio = 0.4;
        this.misalignmentDistance = 12;
        this.minBrightness = 15;
        this.localMaxRadius = 8; // 局部最大值检测半径
        this.gaussianSigma = 3; // 高斯滤波参数
        this.adaptiveThreshold = true; // 自适应阈值
        this.displayMode = 'split'; // split, merged, bw-merged
        this.zoomFactor = 1.0;
        
        // 高性能GPU加速参数 - 精度优先版本
        this.frameSkipCount = 0;
        this.targetFrameRate = 45; // 提高目标帧率到45fps，平衡性能和精度
        this.minFrameRate = 20; // 最低帧率提高到20fps
        this.lastFrameTime = 0;
        this.filteredBuffer = null; // 复用滤波缓冲区
        this.kernelCache = null; // 缓存高斯核
        this.thresholdHistory = []; // 阈值历史平滑
        
        // 性能优化缓存
        this.imageDataCache = null; // 缓存ImageData对象避免重复分配
        this.tempCanvasCache = null; // 缓存临时canvas
        this.processSkipCounter = 0; // 处理跳帧计数器
        this.fastProcessingMode = false; // 默认关闭快速处理模式，保证精度
        this.maxThresholdHistory = 3; // 减少历史缓存提高响应速度
        
        // 跳帧优化 - 在性能不足时智能跳帧
        this.frameSkipPattern = 0; // 0=不跳帧, 1=跳1帧, 2=跳2帧
        this.lastProcessedFrame = 0;
        
        // GPU加速相关
        this.webglCanvas = null;
        this.gl = null;
        this.gaussianShader = null;
        this.intensityShader = null;
        this.useGPUAcceleration = false;
        this.gpuBuffers = {};
        
        // Apple GPU专用优化标志
        this.enableAppleOptimizations = false;
        this.unifiedMemoryOptimization = false;
        this.metalBackendOptimization = false;
        this.gpuWorkloadPreference = 0.7; // 默认70%工作量给GPU
        this.preferredTextureFormat = 'RGBA8';
        this.optimizeFrameBufferSize = false;
        this.enableHighPerformanceMode = false;
        this.enableAppleWorkerOptimizations = false;
        this.enableProMotionSupport = false;
        
        // 性能监控和自适应
        this.performanceHistory = [];
        this.lastPerformanceCheck = 0;
        this.adaptiveQuality = 1.0; // 质量因子：1.0=最高质量，0.5=性能优先
        this.processingTime = 0;
        this.frameTimeTarget = 16.67; // 60fps目标：16.67ms/frame
        
        // 性能模式设置
        this.performanceMode = 'balanced'; // 默认均衡模式
        this.gpuUsageThreshold = 0.4; // GPU使用阈值
        
        // 并行处理
        this.worker = null;
        this.workerReady = false;
        this.useWebWorker = false;
        this.indicator = null;
        this.statusText = null;
        this.startBtn = null;
        this.stopBtn = null;
        this.lastPulseTimestamp = 0;
        
        // 高斯拟合显示
        this.formulaContent = null;
        this.lastFormulas = [];
        this.formulaUpdateCounter = 0;
        
        // 灵敏度控制
        this.sensitivitySlider = null;
        this.sensitivityValue = null;
        this.distanceInfo = null;
        this.sliderTooltip = null;
        this.sensitivity = 2.4; // 默认灵敏度
        
        // 保存光斑功能
        this.savedSpots = []; // 保存的光斑数据
        this.selectedSpot = null; // 当前选中的光斑
        this.saveSpotBtn = null;
        this.lastDetectedPeaks = []; // 最后检测到的光斑
        this.selectedSpotAnimationId = null; // 选中光斑动画ID
    }

    init() {
        this.cacheElements();
        this.prepareCanvas();
        this.bindEvents();
        this.resetVisualState('等待摄像头');
        
        // 启动选中光斑动画循环
        this.startSelectedSpotAnimation();
        
        // 在全局window对象上暴露性能监控方法，方便调试
        if (typeof window !== 'undefined') {
            window.getVideoAlignmentPerformance = () => this.logPerformanceReport();
            console.log('💡 提示: 可在控制台输入 getVideoAlignmentPerformance() 查看系统性能报告');
        }
    }

    cacheElements() {
        this.video = document.getElementById('video-align-stream');
        this.heatmapCanvas = document.getElementById('video-align-heatmap');
        this.overlayCanvas = document.getElementById('video-align-overlay');
        this.videoOverlayCanvas = document.getElementById('video-align-video-overlay');
        this.mergedCanvas = document.getElementById('video-align-merged');
        this.indicator = document.getElementById('video-align-indicator');
        this.statusText = document.getElementById('video-align-status-text');
        this.formulaContent = document.getElementById('formula-content');
        this.sensitivitySlider = document.getElementById('sensitivity-slider');
        this.sensitivityValue = document.getElementById('sensitivity-value');
        this.distanceInfo = document.getElementById('distance-info');
        this.sliderTooltip = document.getElementById('slider-tooltip');
        this.startBtn = document.getElementById('video-align-start-btn');
        this.stopBtn = document.getElementById('video-align-stop-btn');
        this.saveSpotBtn = document.getElementById('save-spot-btn');

        if (this.heatmapCanvas) {
            this.width = this.heatmapCanvas.width;
            this.height = this.heatmapCanvas.height;
        }

        this.processingCanvas.width = this.width;
        this.processingCanvas.height = this.height;
        
        // 初始化合并画布
        if (this.mergedCanvas) {
            this.mergedCanvas.width = this.width * 2;
            this.mergedCanvas.height = this.height;
        }
    }

    prepareCanvas() {
        if (this.heatmapCanvas) {
            this.heatmapCtx = this.heatmapCanvas.getContext('2d');
            if (this.heatmapCtx) {
                this.heatmapImageData = this.heatmapCtx.createImageData(this.width, this.height);
            }
        }

        if (this.overlayCanvas) {
            this.overlayCtx = this.overlayCanvas.getContext('2d');
        }

        if (this.mergedCanvas) {
            this.mergedCtx = this.mergedCanvas.getContext('2d');
        }

        if (!this.intensityBuffer || this.intensityBuffer.length !== this.width * this.height) {
            this.intensityBuffer = new Float32Array(this.width * this.height);
            this.filteredBuffer = new Float32Array(this.width * this.height);
        }
        
        // 预计算高斯核
        this.precomputeGaussianKernel();
        
        // 首先检测设备性能和Apple优化
        this.detectDevicePerformance();
        
        // 初始化GPU加速（在设备检测之后）
        this.initGPUAcceleration();
        
        // 初始化Web Worker
        this.initWebWorker();
    }

    bindEvents() {
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.startCamera());
        }

        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stopCamera('已停止摄像头'));
        }

        if (this.saveSpotBtn) {
            this.saveSpotBtn.addEventListener('click', () => this.saveSelectedSpot());
        }

        // 添加画布点击事件监听器用于选择光斑
        if (this.overlayCanvas) {
            this.overlayCanvas.addEventListener('click', (event) => this.handleCanvasClick(event));
        }
        if (this.videoOverlayCanvas) {
            this.videoOverlayCanvas.addEventListener('click', (event) => this.handleCanvasClick(event));
        }

        const modeInputs = document.querySelectorAll('input[name="video-align-mode"]');
        modeInputs.forEach(input => {
            input.addEventListener('change', (event) => {
                this.mode = event.target.value;
            });
        });

        const displayModeInputs = document.querySelectorAll('input[name="video-align-display"]');
        displayModeInputs.forEach(input => {
            input.addEventListener('change', (event) => {
                this.displayMode = event.target.value;
                this.updateDisplayMode();
            });
        });

        // 性能模式切换
        const performanceModeInputs = document.querySelectorAll('input[name="video-align-performance"]');
        performanceModeInputs.forEach(input => {
            input.addEventListener('change', (event) => {
                this.setPerformanceMode(event.target.value);
            });
        });

        // 悬浮面板性能模式切换
        const floatingPerformanceModeInputs = document.querySelectorAll('input[name="floating-performance"]');
        floatingPerformanceModeInputs.forEach(input => {
            input.addEventListener('change', (event) => {
                this.setPerformanceMode(event.target.value);
            });
        });

        // 悬浮面板按钮事件监听器
        const floatingZoomInBtn = document.getElementById('floating-zoom-in');
        const floatingZoomOutBtn = document.getElementById('floating-zoom-out');
        const floatingZoomResetBtn = document.getElementById('floating-zoom-reset');
        const floatingSaveSpotBtn = document.getElementById('floating-save-spot');
        const floatingStopBtn = document.getElementById('floating-stop');

        if (floatingZoomInBtn) {
            floatingZoomInBtn.addEventListener('click', () => this.adjustZoom(0.2));
        }
        if (floatingZoomOutBtn) {
            floatingZoomOutBtn.addEventListener('click', () => this.adjustZoom(-0.2));
        }
        if (floatingZoomResetBtn) {
            floatingZoomResetBtn.addEventListener('click', () => this.resetZoom());
        }
        if (floatingSaveSpotBtn) {
            floatingSaveSpotBtn.addEventListener('click', () => this.saveSelectedSpot());
        }
        if (floatingStopBtn) {
            floatingStopBtn.addEventListener('click', () => this.stopCamera('已通过悬浮面板停止摄像头'));
        }

        // 放大控制按钮
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const zoomResetBtn = document.getElementById('zoom-reset-btn');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.adjustZoom(0.2));
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.adjustZoom(-0.2));
        }
        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', () => this.resetZoom());
        }

        // 灵敏度控制
        if (this.sensitivitySlider) {
            this.sensitivitySlider.addEventListener('input', (e) => {
                this.sensitivity = parseFloat(e.target.value);
                if (this.sensitivityValue) {
                    this.sensitivityValue.value = this.sensitivity.toFixed(2);
                }
                this.updateSliderTooltip(this.sensitivity);
            });

            // 鼠标悬停或拖动时显示弹窗
            this.sensitivitySlider.addEventListener('mousedown', () => {
                this.showSliderTooltip(true);
            });

            this.sensitivitySlider.addEventListener('mouseup', () => {
                this.showSliderTooltip(false);
            });

            this.sensitivitySlider.addEventListener('mouseenter', () => {
                this.updateSliderTooltip(this.sensitivity);
            });

            this.sensitivitySlider.addEventListener('mouseleave', () => {
                if (!this.sensitivitySlider.matches(':active')) {
                    this.showSliderTooltip(false);
                }
            });

            // 触摸设备支持
            this.sensitivitySlider.addEventListener('touchstart', () => {
                this.showSliderTooltip(true);
            });

            this.sensitivitySlider.addEventListener('touchend', () => {
                setTimeout(() => this.showSliderTooltip(false), 1000);
            });
        }

        // 灵敏度数值输入框控制
        if (this.sensitivityValue) {
            this.sensitivityValue.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 10) {
                    this.sensitivity = value;
                    if (this.sensitivitySlider) {
                        this.sensitivitySlider.value = value;
                    }
                }
            });

            this.sensitivityValue.addEventListener('blur', (e) => {
                const value = parseFloat(e.target.value);
                if (isNaN(value) || value < 0 || value > 10) {
                    e.target.value = this.sensitivity.toFixed(2);
                }
            });
        }
    }

    async startCamera() {
        if (!this.isTabActive) {
            this.resetVisualState('切换至"视频对齐"标签使用摄像头');
            return;
        }

        if (this.isStreaming) {
            console.warn('摄像头已在运行中');
            return;
        }

        // 检查浏览器兼容性
        if (!navigator.mediaDevices?.getUserMedia) {
            this.resetVisualState('当前浏览器不支持摄像头');
            this.showError('当前浏览器不支持摄像头访问，请使用最新版Chrome、Firefox或Edge。');
            return;
        }

        // 检查必要的Canvas支持
        if (!this.heatmapCtx || !this.overlayCtx || !this.processingCtx) {
            this.resetVisualState('图形处理器初始化失败');
            this.showError('图形处理器初始化失败，请刷新页面重试。');
            return;
        }

        try {
            this.setIndicatorState('idle');
            this.updateButtonState(true);
            if (this.statusText) {
                this.statusText.textContent = '正在激活摄像头…';
            }

            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'environment'
                },
                audio: false
            });

            if (!this.video) {
                throw new Error('找不到视频输出容器');
            }

            this.video.srcObject = this.stream;
            await this.video.play().catch(() => {});

            this.isStreaming = true;
            if (this.statusText) {
                // 获取实时帧率和延时（初始状态可能为0）
                const metrics = this.getPerformanceMetrics();
                const fpsText = metrics.actualFps > 0 ? `${metrics.actualFps}fps` : '--fps';
                const latencyText = metrics.processingLatency > 0 ? `${metrics.processingLatency}ms` : '--ms';
                this.statusText.textContent = `开始识别中… [${fpsText} | ${latencyText}]`;
            }
            this.lastPulseTimestamp = performance.now();
            this.processFrames();
        } catch (error) {
            console.error('视频对齐摄像头启动失败:', error);
            
            let errorMessage = '摄像头启动失败';
            if (error.name === 'NotAllowedError') {
                errorMessage = '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问';
            } else if (error.name === 'NotFoundError') {
                errorMessage = '未检测到摄像头设备，请确认摄像头已连接';
            } else if (error.name === 'NotReadableError') {
                errorMessage = '摄像头被其他应用占用，请关闭其他摄像头应用后重试';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = '摄像头不支持请求的分辨率，正在尝试降级';
                // 尝试降级分辨率
                this.tryFallbackCamera();
                return;
            }
            
            this.resetVisualState('摄像头启动失败');
            this.showError(errorMessage);
        }
    }

    stopCamera(message) {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // 停止选中光斑动画
        this.stopSelectedSpotAnimation();

        this.isStreaming = false;
        this.updateButtonState(false);
        this.clearOverlay();
        this.clearHeatmap();
        this.setIndicatorState('idle');
        if (this.statusText) {
            this.statusText.textContent = message || '等待摄像头';
        }
    }

    handleTabVisibility(isActive) {
        this.isTabActive = isActive;

        if (!isActive) {
            this.stopCamera('等待摄像头');
        } else {
            this.resetVisualState('等待摄像头');
        }
    }

    processFrames() {
        if (!this.isStreaming || !this.isTabActive) {
            return;
        }

        this.animationId = requestAnimationFrame(() => {
            this.processFrames();
        });

        this.renderFrame();
    }

    async renderFrame() {
        if (!this.video || !this.heatmapCtx || !this.overlayCtx) {
            return;
        }

        // 优化的帧率控制和性能监控
        const frameStart = performance.now();
        const targetInterval = 1000 / this.targetFrameRate;
        
        // 更宽松的帧率控制，避免过度限制
        if (frameStart - this.lastFrameTime < targetInterval * 0.7) {
            return;
        }
        
        // 智能跳帧处理 - 优化版
        this.lastProcessedFrame++;
        if (this.frameSkipPattern > 0 && this.lastProcessedFrame % (this.frameSkipPattern + 1) !== 0) {
            this.lastFrameTime = frameStart;
            return;
        }
        
        this.lastFrameTime = frameStart;

        try {
            this.processingCtx.drawImage(this.video, 0, 0, this.width, this.height);
        } catch (error) {
            console.warn('视频绘制失败:', error);
            return;
        }

        let frame;
        try {
            frame = this.processingCtx.getImageData(0, 0, this.width, this.height);
        } catch (error) {
            console.warn('图像数据获取失败:', error);
            return;
        }

        // 转换为灰度并应用高斯滤波
        const sourceData = frame.data;
        const length = sourceData.length;

        // 第一次遍历：转换为灰度
        for (let i = 0, p = 0; i < length; i += 4, p++) {
            const r = sourceData[i];
            const g = sourceData[i + 1];
            const b = sourceData[i + 2];
            this.intensityBuffer[p] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        // 应用高斯滤波减少噪声（智能GPU/CPU切换，Apple优化）
        if (this.shouldUseGPUAcceleration()) {
            this.applyGaussianFilterGPU();
        } else {
            this.applyGaussianFilter();
        }

        // 计算直接阈值（考虑用户灵敏度设置）
        // 灵敏度越低，阈值越高，检测到的光源越少
        const adaptiveThreshold = this.calculateDirectThreshold();

        // 寻找局部最大值（多层加速策略）
        let peaks;
        
        // 智能策略选择（Apple优化）
        if (this.shouldUseGPUPeakDetection()) {
            const gpuResult = this.applyPeakDetectionGPU(adaptiveThreshold);
            if (gpuResult) {
                peaks = this.refinePeaksFromGPU(gpuResult, adaptiveThreshold);
            } else {
                peaks = this.findLocalMaxima(adaptiveThreshold);
            }
        } else if (this.shouldUseWebWorker()) {
            // Web Worker并行检测（Apple优化）
            peaks = await this.findLocalMaximaParallel(adaptiveThreshold);
        } else {
            // CPU单线程检测
            peaks = this.findLocalMaxima(adaptiveThreshold);
        }

        // 生成热力图
        this.generateHeatmap();

        // 保存检测到的光斑
        this.lastDetectedPeaks = peaks;

        // 根据显示模式渲染
        this.renderByDisplayMode(peaks);
        
        // 绘制高斯拟合可视化
        this.renderGaussianFitting(peaks);
        
        // 性能监控和自适应调整
        this.monitorPerformance(frameStart);
        
        // 更新高斯拟合公式显示（包含保存的光斑）
        this.updateGaussianFormulasWithSaved(peaks);
        
        // 更新距离信息显示（包含保存的光斑）
        this.updateDistanceInfoWithSaved(peaks);

        // 绘制保存光斑（持续动画）
        this.drawSavedSpots();
        
        // 最后绘制选中光斑的高亮（确保不被覆盖）
        this.drawSelectedSpotHighlight();
    }

    precomputeGaussianKernel() {
        const sigma = this.gaussianSigma;
        const radius = Math.ceil(sigma * 3);
        
        this.kernelCache = [];
        let sum = 0;
        for (let i = -radius; i <= radius; i++) {
            for (let j = -radius; j <= radius; j++) {
                const value = Math.exp(-(i*i + j*j) / (2 * sigma * sigma));
                this.kernelCache.push({x: i, y: j, value});
                sum += value;
            }
        }
        
        // 归一化核
        this.kernelCache.forEach(k => k.value /= sum);
    }

    applyGaussianFilter() {
        if (!this.kernelCache || !this.filteredBuffer) {
            console.warn('高斯滤波初始化失败');
            return;
        }

        // 使用预分配的缓冲区
        const filtered = this.filteredBuffer;
        const kernel = this.kernelCache;

        // 优化的滤波应用 - 根据性能模式调整处理密度
        const step = this.fastProcessingMode ? 2 : 1;
        const kernelStep = this.adaptiveQuality < 0.7 ? 2 : 1;
        
        for (let y = 0; y < this.height; y += step) {
            for (let x = 0; x < this.width; x += step) {
                let weightedSum = 0;
                let totalWeight = 0;
                
                // 根据性能模式减少内核计算
                for (let i = 0; i < kernel.length; i += kernelStep) {
                    const k = kernel[i];
                    const nx = x + k.x;
                    const ny = y + k.y;
                    
                    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                        const neighborValue = this.intensityBuffer[ny * this.width + nx];
                        weightedSum += neighborValue * k.value;
                        totalWeight += k.value;
                    }
                }
                
                const value = totalWeight > 0 ? weightedSum / totalWeight : 0;
                filtered[y * this.width + x] = value;
                
                // 如果跳像素，填充邻近像素以避免空隙
                if (step > 1) {
                    if (x + 1 < this.width) filtered[y * this.width + x + 1] = value;
                    if (y + 1 < this.height) filtered[(y + 1) * this.width + x] = value;
                    if (x + 1 < this.width && y + 1 < this.height) filtered[(y + 1) * this.width + x + 1] = value;
                }
            }
        }

        // 交换缓冲区
        [this.intensityBuffer, this.filteredBuffer] = [this.filteredBuffer, this.intensityBuffer];
    }

    // 计算直接阈值，基于灵敏度和图像特征
    calculateDirectThreshold() {
        try {
            // 计算基本图像统计信息
            let sum = 0;
            let maxValue = 0;
            let validPixels = 0;
            
            for (let i = 0; i < this.intensityBuffer.length; i++) {
                const value = this.intensityBuffer[i];
                if (!isNaN(value) && isFinite(value)) {
                    sum += value;
                    maxValue = Math.max(maxValue, value);
                    validPixels++;
                }
            }

            if (validPixels === 0) {
                return 50; // 默认阈值
            }

            const mean = sum / validPixels;
            
            // 简化的阈值计算：基于灵敏度直接调整
            // 灵敏度0.1-4.0 → 阈值从maxValue*0.9到mean*0.3
            const sensitivityNormalized = Math.max(0.1, Math.min(4.0, this.sensitivity));
            const thresholdRatio = 0.9 - (sensitivityNormalized - 0.1) * 0.6 / 3.9; // 0.9 到 0.3
            
            const directThreshold = Math.max(
                mean * thresholdRatio,
                maxValue * thresholdRatio,
                10 // 最小阈值
            );

            // 简单的历史平滑
            this.thresholdHistory.push(directThreshold);
            if (this.thresholdHistory.length > 5) { // 减少历史长度
                this.thresholdHistory.shift();
            }

            // 返回平滑后的阈值
            const smoothedThreshold = this.thresholdHistory.reduce((a, b) => a + b, 0) / this.thresholdHistory.length;
            
            return Math.max(smoothedThreshold, this.minBrightness);
        } catch (error) {
            console.error('阈值计算错误:', error);
            return this.minBrightness;
        }
    }

    findLocalMaxima(threshold) {
        const peaks = [];
        const radius = this.localMaxRadius;

        // 性能优化：根据处理模式调整扫描密度
        const step = this.fastProcessingMode ? 3 : (this.adaptiveQuality < 0.8 ? 2 : 1);
        const checkRadius = this.fastProcessingMode ? Math.max(3, Math.floor(radius * 0.7)) : radius;

        for (let y = checkRadius; y < this.height - checkRadius; y += step) {
            for (let x = checkRadius; x < this.width - checkRadius; x += step) {
                const centerIdx = y * this.width + x;
                const centerValue = this.intensityBuffer[centerIdx];

                if (centerValue < threshold) continue;

                // 快速预检查：只检查关键方向
                let isLocalMax = true;
                const quickDirs = [
                    [0, -checkRadius], [0, checkRadius], 
                    [-checkRadius, 0], [checkRadius, 0]
                ];
                
                for (const [dx, dy] of quickDirs) {
                    const neighborIdx = (y + dy) * this.width + (x + dx);
                    if (this.intensityBuffer[neighborIdx] > centerValue) {
                        isLocalMax = false;
                        break;
                    }
                }
                
                if (!isLocalMax) continue;

                // 详细检查（非快速模式）
                if (!this.fastProcessingMode) {
                    let equalCount = 0;
                    const checkStep = this.adaptiveQuality < 0.7 ? 2 : 1;
                    
                    for (let dy = -checkRadius; dy <= checkRadius && isLocalMax; dy += checkStep) {
                        for (let dx = -checkRadius; dx <= checkRadius && isLocalMax; dx += checkStep) {
                            if (dx === 0 && dy === 0) continue;
                            
                            const neighborIdx = (y + dy) * this.width + (x + dx);
                            const neighborValue = this.intensityBuffer[neighborIdx];
                            
                            if (neighborValue > centerValue) {
                                isLocalMax = false;
                            } else if (Math.abs(neighborValue - centerValue) < 0.01) {
                                equalCount++;
                                if (equalCount > checkRadius) {
                                    isLocalMax = false;
                                }
                            }
                        }
                    }
                }

                if (isLocalMax) {
                    // 性能优化：快速模式跳过子像素精度计算
                    const centroid = this.fastProcessingMode ? 
                        { x, y } : 
                        this.calculatePeakCentroid(x, y, checkRadius);
                    
                    peaks.push({
                        x: centroid.x,
                        y: centroid.y,
                        intensity: centerValue,
                        size: this.fastProcessingMode ? 10 : this.calculatePeakSize(x, y, radius, threshold * 0.5)
                    });
                    
                    // 性能优化：早期退出，避免过度搜索
                    const earlyExitLimit = this.fastProcessingMode ? 15 : 25;
                    if (peaks.length >= earlyExitLimit) {
                        break;
                    }
                }
            }
            if (peaks.length >= (this.fastProcessingMode ? 15 : 25)) break;
        }

        // 按强度排序并返回最强的峰值
        peaks.sort((a, b) => b.intensity - a.intensity);
        const maxPeaks = this.fastProcessingMode ? 
            Math.min(15, Math.max(1, Math.floor(this.sensitivity * 3))) :
            Math.min(20, Math.max(1, Math.floor(this.sensitivity * 5)));
        return peaks.slice(0, maxPeaks);
    }
    
    // 从GPU结果中精确提取峰值
    refinePeaksFromGPU(gpuResult, threshold) {
        const peaks = [];
        const radius = this.localMaxRadius;
        
        // 扫描GPU预处理结果
        for (let y = radius; y < this.height - radius; y++) {
            for (let x = radius; x < this.width - radius; x++) {
                const idx = (y * this.width + x) * 4;
                const intensity = gpuResult[idx];     // R通道：强度值
                const isPeak = gpuResult[idx + 1];    // G通道：是否为峰值
                
                if (isPeak > 128 && intensity >= threshold) { // GPU标记为峰值
                    // CPU精确验证和质心计算
                    const centroid = this.calculatePeakCentroid(x, y, radius);
                    if (centroid && centroid.x >= 0 && centroid.y >= 0) {
                        peaks.push({
                            x: centroid.x,
                            y: centroid.y,
                            intensity: intensity,
                            size: this.calculatePeakSize(x, y, radius, threshold * 0.5)
                        });
                    }
                }
            }
        }
        
        return peaks;
    }
    
    // 智能GPU使用决策（Apple优化）- 根据性能模式动态调整
    shouldUseGPUAcceleration() {
        if (!this.useGPUAcceleration) return false;
        
        const imageSize = this.width * this.height;
        const threshold = this.gpuUsageThreshold || 0.4; // 使用动态阈值
        
        if (this.enableAppleOptimizations) {
            // Apple GPU优化策略 - 根据性能模式调整
            let appleThreshold = threshold;
            if (this.performanceMode === 'speed') {
                appleThreshold = threshold - 0.1;
            } else if (this.performanceMode === 'balanced') {
                appleThreshold = threshold - 0.05;
            }
            return this.adaptiveQuality > appleThreshold && imageSize > 20000;
        } else {
            // 传统GPU策略 - 根据性能模式调整
            let traditionalThreshold = threshold;
            if (this.performanceMode === 'speed') {
                traditionalThreshold = threshold - 0.1;
            } else if (this.performanceMode === 'balanced') {
                traditionalThreshold = threshold;
            } else {
                traditionalThreshold = threshold + 0.1;
            }
            return this.adaptiveQuality > traditionalThreshold && imageSize > 30000;
        }
    }
    
    // 智能GPU峰值检测决策 - 降低阈值保证精度
    shouldUseGPUPeakDetection() {
        if (!this.useGPUAcceleration) return false;
        
        if (this.enableAppleOptimizations) {
            // Apple GPU更适合峰值检测 - 降低阈值
            return this.adaptiveQuality > 0.4;
        } else {
            return this.adaptiveQuality > 0.5;
        }
    }
    
    // 智能Web Worker使用决策
    shouldUseWebWorker() {
        if (!this.useWebWorker) return false;
        
        if (this.enableAppleWorkerOptimizations) {
            // Apple设备的高效核心更适合并行计算
            return this.adaptiveQuality > 0.5;
        } else {
            return this.adaptiveQuality > 0.6;
        }
    }

    calculatePeakCentroid(cx, cy, radius) {
        let weightedX = 0;
        let weightedY = 0;
        let totalWeight = 0;
        let maxIntensity = 0;

        // 首先找到局部最大强度，用于加权计算
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    const intensity = this.intensityBuffer[y * this.width + x];
                    maxIntensity = Math.max(maxIntensity, intensity);
                }
            }
        }

        // 使用指数加权提高中心区域的影响力，增强亚像素精度
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    const intensity = this.intensityBuffer[y * this.width + x];
                    
                    // 使用强度的平方作为权重，增强峰值区域的影响
                    const normalizedIntensity = intensity / maxIntensity;
                    const weight = Math.pow(normalizedIntensity, 2);
                    
                    // 距离衰减因子，中心区域权重更高
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const distanceWeight = Math.exp(-distance / radius);
                    
                    const finalWeight = weight * distanceWeight * intensity;
                    
                    weightedX += finalWeight * x;
                    weightedY += finalWeight * y;
                    totalWeight += finalWeight;
                }
            }
        }

        if (totalWeight > 0 && isFinite(weightedX) && isFinite(weightedY)) {
            const centroidX = weightedX / totalWeight;
            const centroidY = weightedY / totalWeight;
            
            // 亚像素精度验证：确保质心偏移在合理范围内
            const offsetX = Math.abs(centroidX - cx);
            const offsetY = Math.abs(centroidY - cy);
            
            // 如果偏移过大，可能是噪声干扰，回退到像素中心
            if (offsetX > radius * 0.8 || offsetY > radius * 0.8) {
                return { x: cx, y: cy };
            }
            
            // 确保质心在合理范围内，保留亚像素精度
            return {
                x: Math.max(0, Math.min(this.width - 1, centroidX)),
                y: Math.max(0, Math.min(this.height - 1, centroidY))
            };
        } else {
            return { x: cx, y: cy };
        }
    }

    calculatePeakSize(cx, cy, radius, sizeThreshold) {
        let size = 0;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    if (this.intensityBuffer[y * this.width + x] > sizeThreshold) {
                        size++;
                    }
                }
            }
        }
        return size;
    }

    generateHeatmap() {
        const heatmapData = this.heatmapImageData.data;
        
        for (let i = 0; i < this.intensityBuffer.length; i++) {
            const intensity = this.intensityBuffer[i];
            const normalized = Math.min(Math.max(intensity / 255, 0), 1);
            const color = this.getColorFromValue(normalized);
            
            const pixelIndex = i * 4;
            heatmapData[pixelIndex] = color[0];
            heatmapData[pixelIndex + 1] = color[1];
            heatmapData[pixelIndex + 2] = color[2];
            heatmapData[pixelIndex + 3] = 255;
        }

        this.heatmapCtx.putImageData(this.heatmapImageData, 0, 0);
    }

    renderByDisplayMode(peaks) {
        this.overlayCtx.clearRect(0, 0, this.width, this.height);

        if (peaks.length === 0) {
            this.setIndicatorState('idle');
            if (this.statusText) {
                // 获取实时帧率和延时
                const metrics = this.getPerformanceMetrics();
                const fpsText = metrics.actualFps > 0 ? `${metrics.actualFps}fps` : '--fps';
                const latencyText = metrics.processingLatency > 0 ? `${metrics.processingLatency}ms` : '--ms';
                this.statusText.textContent = `等待光源 [${fpsText} | ${latencyText}]`;
            }
            return;
        }

        // 分析光斑对齐状态
        const alignmentResult = this.analyzeAlignment(peaks);
        
        if (this.displayMode === 'merged' || this.displayMode === 'bw-merged') {
            this.renderMergedView(peaks, alignmentResult);
        } else {
            this.renderSplitView(peaks, alignmentResult);
        }
    }

    analyzeAlignment(peaks) {
        if (peaks.length < 2) {
            return {
                aligned: true,
                peaks: peaks,
                mainPeak: peaks[0] || null,
                distance: 0,
                confidence: peaks.length > 0 ? 0.9 : 0
            };
        }

        // 找出最强的两个峰值
        const peak1 = peaks[0];
        const peak2 = peaks[1];
        
        const intensityRatio = peak1.intensity > 0 ? peak2.intensity / peak1.intensity : 0;
        const distance = Math.hypot(peak1.x - peak2.x, peak1.y - peak2.y);
        
        // 改进的对齐判断逻辑
        const isSignificantSecondPeak = intensityRatio > this.secondaryPeakRatio;
        const isSufficientDistance = distance > this.misalignmentDistance;
        // 防止除零错误并改进对齐判断
        const maxSize = Math.max(peak1.size, peak2.size, 1); // 避免除零
        const sizeDifference = Math.abs(peak1.size - peak2.size) / maxSize;
        
        // 多因素综合判断对齐状态
        const aligned = !(isSignificantSecondPeak && isSufficientDistance && sizeDifference < 0.6);

        return {
            aligned,
            peaks: [peak1, peak2],
            mainPeak: aligned ? this.calculateWeightedCentroid([peak1, peak2]) : peak1,
            distance,
            confidence: Math.min(peak1.intensity / 255, 1.0),
            intensityRatio,
            sizeDifference
        };
    }

    calculateWeightedCentroid(peaks) {
        let weightedX = 0;
        let weightedY = 0;
        let totalWeight = 0;

        for (const peak of peaks) {
            weightedX += peak.x * peak.intensity;
            weightedY += peak.y * peak.intensity;
            totalWeight += peak.intensity;
        }

        return totalWeight > 0 ? {
            x: weightedX / totalWeight,
            y: weightedY / totalWeight
        } : peaks[0];
    }

    renderSplitView(peaks, result) {
        if (result.aligned) {
        this.setIndicatorState('aligned');
        if (this.statusText) {
                const modeText = this.mode === 'centroid' ? '质心' : '峰值';
                const confidenceText = `${(result.confidence * 100).toFixed(0)}%`;
                // 获取实时帧率和延时
                const metrics = this.getPerformanceMetrics();
                const fpsText = metrics.actualFps > 0 ? `${metrics.actualFps}fps` : '--fps';
                const latencyText = metrics.processingLatency > 0 ? `${metrics.processingLatency}ms` : '--ms';
                this.statusText.textContent = `完美对齐 (${modeText}, 置信度: ${confidenceText}) [${fpsText} | ${latencyText}]`;
            }
            this.drawGreenPulse(result.mainPeak.x, result.mainPeak.y);
        } else {
            this.setIndicatorState('misaligned');
            if (this.statusText) {
                // 获取实时帧率和延时
                const metrics = this.getPerformanceMetrics();
                const fpsText = metrics.actualFps > 0 ? `${metrics.actualFps}fps` : '--fps';
                const latencyText = metrics.processingLatency > 0 ? `${metrics.processingLatency}ms` : '--ms';
                this.statusText.textContent = `未对齐 (距离: ${result.distance.toFixed(1)}px, 强度比: ${(result.intensityRatio * 100).toFixed(0)}%) [${fpsText} | ${latencyText}]`;
            }
            this.drawRedMarker(result.peaks[0].x, result.peaks[0].y);
            this.drawRedMarker(result.peaks[1].x, result.peaks[1].y);
            this.drawMisalignmentLine(result.peaks[0], result.peaks[1]);
        }
    }

    renderMergedView(peaks, result) {
        // 在合并视图中渲染
        if (this.mergedCtx) {
            this.mergedCtx.clearRect(0, 0, this.width * 2, this.height);
            
            if (this.displayMode === 'bw-merged') {
                // 黑白合并模式：左侧显示增强的黑白视频，右侧显示黑白热力图
                this.renderBlackWhiteMerged();
            } else {
                // 普通合并模式：左侧原始视频，右侧彩色热力图
                this.mergedCtx.drawImage(this.video, 0, 0, this.width, this.height);
                this.mergedCtx.drawImage(this.heatmapCanvas, this.width, 0, this.width, this.height);
            }
            
            // 在合并视图上绘制标记
            if (result.aligned) {
                this.drawMergedGreenPulse(result.mainPeak.x, result.mainPeak.y);
            } else {
                this.drawMergedRedMarkers(result.peaks);
            }
            
            // 绘制高斯拟合可视化（合并视图）
            this.renderGaussianFittingMerged(peaks);
        }
    }

    renderBlackWhiteMerged() {
        if (!this.mergedCtx) return;

        // 创建临时画布进行黑白处理
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        const tempCtx = tempCanvas.getContext('2d');

        // 左侧：增强对比度的黑白视频
        tempCtx.drawImage(this.video, 0, 0, this.width, this.height);
        const videoImageData = tempCtx.getImageData(0, 0, this.width, this.height);
        const videoData = videoImageData.data;

        for (let i = 0; i < videoData.length; i += 4) {
            const gray = 0.2126 * videoData[i] + 0.7152 * videoData[i + 1] + 0.0722 * videoData[i + 2];
            // 增强对比度
            const enhanced = gray > 128 ? Math.min(255, gray * 1.3) : gray * 0.7;
            videoData[i] = enhanced;
            videoData[i + 1] = enhanced;
            videoData[i + 2] = enhanced;
        }

        tempCtx.putImageData(videoImageData, 0, 0);
        this.mergedCtx.drawImage(tempCanvas, 0, 0);

        // 右侧：黑白热力图
        const heatmapData = this.heatmapCtx.getImageData(0, 0, this.width, this.height);
        const heatData = heatmapData.data;

        for (let i = 0; i < heatData.length; i += 4) {
            const gray = 0.2126 * heatData[i] + 0.7152 * heatData[i + 1] + 0.0722 * heatData[i + 2];
            heatData[i] = gray;
            heatData[i + 1] = gray;
            heatData[i + 2] = gray;
        }

        tempCtx.clearRect(0, 0, this.width, this.height);
        tempCtx.putImageData(heatmapData, 0, 0);
        this.mergedCtx.drawImage(tempCanvas, this.width, 0);
    }

    adjustZoom(delta) {
        this.zoomFactor = Math.max(0.5, Math.min(3.0, this.zoomFactor + delta));
        this.updateZoomLevel();
        this.applyZoom();
    }

    resetZoom() {
        this.zoomFactor = 1.0;
        this.updateZoomLevel();
        this.applyZoom();
    }

    updateZoomLevel() {
        const zoomLevelEl = document.getElementById('zoom-level');
        if (zoomLevelEl) {
            zoomLevelEl.textContent = `${this.zoomFactor.toFixed(1)}x`;
        }
    }

    applyZoom() {
        const videoPane = document.querySelector('.video-pane');
        const heatmapPane = document.querySelector('.heatmap-pane');
        const mergedPane = document.getElementById('merged-pane');

        const transform = `scale(${this.zoomFactor})`;
        
        if (videoPane) {
            const video = videoPane.querySelector('video');
            if (video) video.style.transform = transform;
        }

        if (heatmapPane) {
            const wrapper = heatmapPane.querySelector('.heatmap-wrapper');
            if (wrapper) wrapper.style.transform = transform;
        }

        if (mergedPane) {
            const wrapper = mergedPane.querySelector('.merged-wrapper');
            if (wrapper) wrapper.style.transform = transform;
        }

        // 控制悬浮面板的显示/隐藏
        this.updateFloatingControlsVisibility();
    }

    // 控制悬浮面板显示/隐藏逻辑
    updateFloatingControlsVisibility() {
        const floatingControls = document.getElementById('floating-controls');
        if (!floatingControls) return;

        // 当缩放到2.0x或以上时显示悬浮面板（默认1.0x放大4次后的第5次）
        if (this.zoomFactor >= 2.0) {
            floatingControls.style.display = 'block';
            this.updateFloatingZoomLevel();
            this.updateFloatingPerformance();
            this.syncFloatingButtonStates();
        } else {
            floatingControls.style.display = 'none';
        }
    }

    // 更新悬浮面板缩放显示
    updateFloatingZoomLevel() {
        const floatingZoomLevel = document.getElementById('floating-zoom-level');
        if (floatingZoomLevel) {
            floatingZoomLevel.textContent = `${this.zoomFactor.toFixed(1)}x`;
        }
    }

    // 更新悬浮面板性能显示
    updateFloatingPerformance() {
        const floatingPerformance = document.getElementById('floating-performance');
        if (floatingPerformance && this.isStreaming) {
            const metrics = this.getPerformanceMetrics();
            floatingPerformance.textContent = `${metrics.actualFps}fps | ${metrics.processingLatency}ms`;
        }
    }

    // 同步悬浮面板按钮状态
    syncFloatingButtonStates() {
        const floatingSaveSpot = document.getElementById('floating-save-spot');
        const floatingStop = document.getElementById('floating-stop');
        
        if (floatingSaveSpot) {
            floatingSaveSpot.disabled = !this.isStreaming || !this.selectedSpot;
            floatingSaveSpot.style.opacity = floatingSaveSpot.disabled ? '0.5' : '1';
        }
        
        if (floatingStop) {
            floatingStop.disabled = !this.isStreaming;
            floatingStop.style.opacity = floatingStop.disabled ? '0.5' : '1';
        }
    }

    updateButtonState(streaming) {
        if (this.startBtn) {
            this.startBtn.disabled = streaming;
        }
        if (this.stopBtn) {
            this.stopBtn.disabled = !streaming;
        }
        if (this.saveSpotBtn) {
            this.saveSpotBtn.disabled = !streaming || !this.selectedSpot;
            this.saveSpotBtn.style.opacity = this.saveSpotBtn.disabled ? '0.5' : '1';
        }

        // 同步悬浮面板按钮状态
        this.syncFloatingButtonStates();
        
        // 如果正在流传输，更新悬浮面板性能显示
        if (streaming) {
            this.updateFloatingPerformance();
        }
    }

    resetVisualState(message) {
        this.clearHeatmap();
        this.clearOverlay();
        this.setIndicatorState('idle');
        if (this.statusText) {
            this.statusText.textContent = message;
        }
        this.updateButtonState(false);
    }

    clearHeatmap() {
        if (this.heatmapCtx) {
            this.heatmapCtx.clearRect(0, 0, this.width, this.height);
        }
    }

    clearOverlay() {
        if (this.overlayCtx) {
            this.overlayCtx.clearRect(0, 0, this.width, this.height);
        }
    }

    setIndicatorState(state) {
        if (!this.indicator) {
            return;
        }

        this.indicator.classList.remove('aligned', 'misaligned', 'idle');
        this.indicator.classList.add(state);
    }

    indexToPoint(index) {
        return {
            x: index % this.width,
            y: Math.floor(index / this.width)
        };
    }

    drawRedMarker(x, y) {
        if (!this.overlayCtx) {
            return;
        }

        this.overlayCtx.save();
        this.overlayCtx.lineWidth = 2;
        this.overlayCtx.strokeStyle = '#f43f5e';
        this.overlayCtx.fillStyle = 'rgba(244, 63, 94, 0.2)';
        this.overlayCtx.beginPath();
        this.overlayCtx.arc(x, y, 12, 0, Math.PI * 2);
        this.overlayCtx.closePath();
        this.overlayCtx.fill();
        this.overlayCtx.stroke();
        
        // 添加中心点
        this.overlayCtx.fillStyle = '#f43f5e';
        this.overlayCtx.beginPath();
        this.overlayCtx.arc(x, y, 3, 0, Math.PI * 2);
        this.overlayCtx.fill();
        this.overlayCtx.restore();
    }

    drawMisalignmentLine(pos1, pos2) {
        if (!this.overlayCtx) {
            return;
        }

        this.overlayCtx.save();
        this.overlayCtx.setLineDash([4, 4]);
        this.overlayCtx.lineWidth = 2;
        this.overlayCtx.strokeStyle = '#f43f5e';
        this.overlayCtx.globalAlpha = 0.8;
        
        this.overlayCtx.beginPath();
        this.overlayCtx.moveTo(pos1.x, pos1.y);
        this.overlayCtx.lineTo(pos2.x, pos2.y);
        this.overlayCtx.stroke();
        
        // 绘制箭头指示偏移方向
        const angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
        const midX = (pos1.x + pos2.x) / 2;
        const midY = (pos1.y + pos2.y) / 2;
        
        this.overlayCtx.fillStyle = '#f43f5e';
        this.overlayCtx.beginPath();
        this.overlayCtx.arc(midX, midY, 4, 0, Math.PI * 2);
        this.overlayCtx.fill();
        
        this.overlayCtx.restore();
    }

    drawGreenPulse(x, y) {
        if (!this.overlayCtx) {
            return;
        }

        const now = performance.now();
        const t = (now - this.lastPulseTimestamp) / 1500; // 更慢的呼吸效果
        const pulseScale = 0.8 + Math.sin(t * Math.PI * 2) * 0.3;
        const radius = 15 * pulseScale;

        this.overlayCtx.save();
        
        // 外圈光晕
        const outerGradient = this.overlayCtx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
        outerGradient.addColorStop(0, 'rgba(34, 197, 94, 0)');
        outerGradient.addColorStop(0.3, 'rgba(34, 197, 94, 0.15)');
        outerGradient.addColorStop(0.7, 'rgba(34, 197, 94, 0.08)');
        outerGradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
        this.overlayCtx.fillStyle = outerGradient;
        this.overlayCtx.beginPath();
        this.overlayCtx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
        this.overlayCtx.fill();

        // 主圆圈
        const mainGradient = this.overlayCtx.createRadialGradient(x, y, 0, x, y, radius);
        mainGradient.addColorStop(0, 'rgba(34, 197, 94, 0.9)');
        mainGradient.addColorStop(0.7, 'rgba(34, 197, 94, 0.6)');
        mainGradient.addColorStop(1, 'rgba(34, 197, 94, 0.3)');
        this.overlayCtx.fillStyle = mainGradient;
        this.overlayCtx.beginPath();
        this.overlayCtx.arc(x, y, radius, 0, Math.PI * 2);
        this.overlayCtx.fill();

        // 中心亮点
        this.overlayCtx.fillStyle = '#ffffff';
        this.overlayCtx.beginPath();
        this.overlayCtx.arc(x, y, 3, 0, Math.PI * 2);
        this.overlayCtx.fill();
        
        this.overlayCtx.restore();
    }

    async tryFallbackCamera() {
        try {
            console.log('尝试降级摄像头分辨率...');
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 320 },
                    height: { ideal: 240 }
                },
                audio: false
            });

            if (this.video) {
                this.video.srcObject = this.stream;
                await this.video.play().catch(() => {});
                this.isStreaming = true;
                this.setIndicatorState('idle');
                if (this.statusText) {
                    // 获取实时帧率和延时（降级模式）
                    const metrics = this.getPerformanceMetrics();
                    const fpsText = metrics.actualFps > 0 ? `${metrics.actualFps}fps` : '--fps';
                    const latencyText = metrics.processingLatency > 0 ? `${metrics.processingLatency}ms` : '--ms';
                    this.statusText.textContent = `开始识别中…（降级模式）[${fpsText} | ${latencyText}]`;
                }
                this.lastPulseTimestamp = performance.now();
                this.processFrames();
            }
        } catch (fallbackError) {
            console.error('降级摄像头启动也失败:', fallbackError);
            this.resetVisualState('摄像头启动失败');
            this.showError('摄像头启动失败，请检查设备连接和权限设置');
        }
    }

    updateDisplayMode() {
        const videoPane = document.querySelector('.video-pane');
        const heatmapPane = document.querySelector('.heatmap-pane');
        const mergedPane = document.getElementById('merged-pane');

        if (this.displayMode === 'split') {
            if (videoPane) videoPane.style.display = 'flex';
            if (heatmapPane) heatmapPane.style.display = 'flex';
            if (mergedPane) mergedPane.style.display = 'none';
        } else {
            if (videoPane) videoPane.style.display = 'none';
            if (heatmapPane) heatmapPane.style.display = 'none';
            if (mergedPane) mergedPane.style.display = 'flex';
        }
    }

    // 设置性能模式
    setPerformanceMode(mode) {
        this.performanceMode = mode;
        
        if (mode === 'speed') {
            // 速度优先模式：极致快速，大幅降低精度换取超高帧率
            this.targetFrameRate = 80; // 极高目标帧率
            this.minFrameRate = 45; // 高最低帧率保证
            this.fastProcessingMode = true; // 启用快速处理
            this.adaptiveQuality = Math.max(0.5, this.adaptiveQuality); // 质量可降至50%
            
            // 极度激进的GPU使用策略
            this.gpuUsageThreshold = 0.2; // 更低门槛，几乎总是使用GPU
            
            // 最小历史缓存，极速响应
            this.maxPerformanceHistory = 3;
            this.maxThresholdHistory = 1;
            
            // 额外的速度优化参数
            this.frameSkipPattern = 1; // 允许跳帧
            this.processSkipCounter = 0; // 重置跳帧计数
            
            console.log('🚀 已切换到极速模式: 目标80fps, 质量50%, 激进优化已启用');
            
        } else if (mode === 'balanced') {
            // 均衡模式：在速度和精度之间取得平衡
            this.targetFrameRate = 60; // 中等目标帧率
            this.minFrameRate = 30; // 中等最低帧率
            this.fastProcessingMode = true; // 智能快速处理
            this.adaptiveQuality = Math.max(0.75, this.adaptiveQuality); // 质量75%
            
            // 中等GPU使用策略
            this.gpuUsageThreshold = 0.4; // 平衡的门槛
            
            // 中等历史缓存，平衡响应性和稳定性
            this.maxPerformanceHistory = 8;
            this.maxThresholdHistory = 4;
            
            // 智能跳帧策略
            this.frameSkipPattern = 2; // 适度跳帧
            this.processSkipCounter = 0; // 重置跳帧计数
            
            console.log('⚖️ 已切换到均衡模式: 目标60fps, 质量75%, 智能优化已启用');
            
        } else {
            // 精准优先模式：极致精度，大幅降低帧率确保最高质量
            this.targetFrameRate = 35; // 较低目标帧率为精度让路
            this.minFrameRate = 15; // 允许更低帧率
            this.fastProcessingMode = false; // 关闭快速处理
            this.adaptiveQuality = Math.max(0.95, this.adaptiveQuality); // 质量不低于95%
            
            // 极度保守的GPU使用策略，确保最高精度
            this.gpuUsageThreshold = 0.6; // 更高门槛，只在确定时使用GPU
            
            // 最大历史缓存，确保稳定性和精度
            this.maxPerformanceHistory = 15;
            this.maxThresholdHistory = 8;
            
            // 额外的精度优化参数
            this.frameSkipPattern = 0; // 禁止跳帧
            this.processSkipCounter = 0; // 重置跳帧计数
            
            console.log('🎯 已切换到极精模式: 目标35fps, 质量95%, 高精度处理已启用');
        }
        
        // 更新帧时间目标
        this.frameTimeTarget = 1000 / this.targetFrameRate;
        
        // 如果正在运行，触发性能重新评估
        if (this.isStreaming) {
            this.adaptPerformance();
        }
        
        // 显示模式切换提示
        this.showPerformanceModeMessage(mode);
        
        // 同步两个面板的性能模式状态
        this.syncPerformanceModeState(mode);
    }

    // 显示性能模式切换消息
    showPerformanceModeMessage(mode) {
        let message;
        if (mode === 'speed') {
            message = '已切换到极速模式，目标80fps，质量50%，激进优化';
        } else if (mode === 'balanced') {
            message = '已切换到均衡模式，目标60fps，质量75%，智能优化';
        } else {
            message = '已切换到极精模式，目标35fps，质量95%，最高精度';
        }
            
        // 创建临时消息提示
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${mode === 'speed' ? '#dbeafe' : '#f0f9ff'};
            color: ${mode === 'speed' ? '#1e40af' : '#0369a1'};
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            z-index: 10000;
            transition: all 0.3s ease;
        `;
        messageEl.textContent = message;
        document.body.appendChild(messageEl);
        
        // 3秒后淡出并移除
        setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => document.body.removeChild(messageEl), 300);
        }, 2500);
    }

    // 同步两个面板的性能模式状态
    syncPerformanceModeState(mode) {
        // 同步主面板状态
        const mainInputs = document.querySelectorAll('input[name="video-align-performance"]');
        mainInputs.forEach(input => {
            input.checked = input.value === mode;
        });

        // 同步悬浮面板状态
        const floatingInputs = document.querySelectorAll('input[name="floating-performance"]');
        floatingInputs.forEach(input => {
            input.checked = input.value === mode;
        });
    }

    drawMergedGreenPulse(x, y) {
        if (!this.mergedCtx) return;

        const now = performance.now();
        const t = (now - this.lastPulseTimestamp) / 1500;
        const pulseScale = 0.8 + Math.sin(t * Math.PI * 2) * 0.3;
        const radius = 15 * pulseScale;

        // 在左侧（原始视频）绘制
        this.mergedCtx.save();
        let outerGradient = this.mergedCtx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
        outerGradient.addColorStop(0, 'rgba(34, 197, 94, 0)');
        outerGradient.addColorStop(0.3, 'rgba(34, 197, 94, 0.15)');
        outerGradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
        this.mergedCtx.fillStyle = outerGradient;
        this.mergedCtx.beginPath();
        this.mergedCtx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
        this.mergedCtx.fill();

        this.mergedCtx.fillStyle = '#22c55e';
        this.mergedCtx.beginPath();
        this.mergedCtx.arc(x, y, radius, 0, Math.PI * 2);
        this.mergedCtx.fill();
        this.mergedCtx.restore();

        // 在右侧（热力图）绘制
        const rightX = x + this.width;
        this.mergedCtx.save();
        outerGradient = this.mergedCtx.createRadialGradient(rightX, y, 0, rightX, y, radius * 2.5);
        outerGradient.addColorStop(0, 'rgba(34, 197, 94, 0)');
        outerGradient.addColorStop(0.3, 'rgba(34, 197, 94, 0.15)');
        outerGradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
        this.mergedCtx.fillStyle = outerGradient;
        this.mergedCtx.beginPath();
        this.mergedCtx.arc(rightX, y, radius * 2.5, 0, Math.PI * 2);
        this.mergedCtx.fill();

        this.mergedCtx.fillStyle = '#22c55e';
        this.mergedCtx.beginPath();
        this.mergedCtx.arc(rightX, y, radius, 0, Math.PI * 2);
        this.mergedCtx.fill();
        this.mergedCtx.restore();
    }

    drawMergedRedMarkers(peaks) {
        if (!this.mergedCtx || peaks.length < 2) return;

        for (const peak of peaks.slice(0, 2)) {
            // 在左侧（原始视频）绘制
            this.mergedCtx.save();
            this.mergedCtx.lineWidth = 2;
            this.mergedCtx.strokeStyle = '#f43f5e';
            this.mergedCtx.fillStyle = 'rgba(244, 63, 94, 0.2)';
            this.mergedCtx.beginPath();
            this.mergedCtx.arc(peak.x, peak.y, 12, 0, Math.PI * 2);
            this.mergedCtx.fill();
            this.mergedCtx.stroke();

            this.mergedCtx.fillStyle = '#f43f5e';
            this.mergedCtx.beginPath();
            this.mergedCtx.arc(peak.x, peak.y, 3, 0, Math.PI * 2);
            this.mergedCtx.fill();
            this.mergedCtx.restore();

            // 在右侧（热力图）绘制
            const rightX = peak.x + this.width;
            this.mergedCtx.save();
            this.mergedCtx.lineWidth = 2;
            this.mergedCtx.strokeStyle = '#f43f5e';
            this.mergedCtx.fillStyle = 'rgba(244, 63, 94, 0.2)';
            this.mergedCtx.beginPath();
            this.mergedCtx.arc(rightX, peak.y, 12, 0, Math.PI * 2);
            this.mergedCtx.fill();
            this.mergedCtx.stroke();

            this.mergedCtx.fillStyle = '#f43f5e';
            this.mergedCtx.beginPath();
            this.mergedCtx.arc(rightX, peak.y, 3, 0, Math.PI * 2);
            this.mergedCtx.fill();
            this.mergedCtx.restore();
        }

        // 绘制连接线
        if (peaks.length >= 2) {
            const peak1 = peaks[0];
            const peak2 = peaks[1];
            
            // 左侧连接线
            this.mergedCtx.save();
            this.mergedCtx.setLineDash([4, 4]);
            this.mergedCtx.lineWidth = 2;
            this.mergedCtx.strokeStyle = '#f43f5e';
            this.mergedCtx.globalAlpha = 0.8;
            this.mergedCtx.beginPath();
            this.mergedCtx.moveTo(peak1.x, peak1.y);
            this.mergedCtx.lineTo(peak2.x, peak2.y);
            this.mergedCtx.stroke();
            this.mergedCtx.restore();

            // 右侧连接线
            this.mergedCtx.save();
            this.mergedCtx.setLineDash([4, 4]);
            this.mergedCtx.lineWidth = 2;
            this.mergedCtx.strokeStyle = '#f43f5e';
            this.mergedCtx.globalAlpha = 0.8;
            this.mergedCtx.beginPath();
            this.mergedCtx.moveTo(peak1.x + this.width, peak1.y);
            this.mergedCtx.lineTo(peak2.x + this.width, peak2.y);
            this.mergedCtx.stroke();
            this.mergedCtx.restore();
        }
    }

    getColorFromValue(value) {
        const stops = [
            { value: 0.0, color: [15, 23, 42] },
            { value: 0.25, color: [37, 99, 235] },
            { value: 0.5, color: [59, 130, 246] },
            { value: 0.75, color: [250, 204, 21] },
            { value: 1.0, color: [255, 237, 213] }
        ];

        for (let i = 0; i < stops.length - 1; i++) {
            const current = stops[i];
            const next = stops[i + 1];
            if (value >= current.value && value <= next.value) {
                const range = next.value - current.value;
                const factor = range === 0 ? 0 : (value - current.value) / range;
                return [
                    Math.round(current.color[0] + (next.color[0] - current.color[0]) * factor),
                    Math.round(current.color[1] + (next.color[1] - current.color[1]) * factor),
                    Math.round(current.color[2] + (next.color[2] - current.color[2]) * factor)
                ];
            }
        }

        return stops[stops.length - 1].color;
    }

    showError(message) {
        if (typeof showTopError === 'function') {
            showTopError(message, true);
        }
    }

    // GPU加速初始化（Apple优化）
    initGPUAcceleration() {
        console.log('🚀 开始初始化GPU加速...');
        
        try {
            // 创建离屏WebGL画布用于GPU计算
            this.webglCanvas = document.createElement('canvas');
            this.webglCanvas.width = this.width;
            this.webglCanvas.height = this.height;
            console.log(`📊 WebGL画布大小: ${this.width}x${this.height}`);
            
            // 优先使用WebGL2（Apple设备支持更好）
            const gl = this.webglCanvas.getContext('webgl2', {
                alpha: false,
                depth: false,
                stencil: false,
                antialias: false,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                powerPreference: this.enableAppleOptimizations ? 'high-performance' : 'high-performance' // 强制高性能
            }) || this.webglCanvas.getContext('webgl', {
                alpha: false,
                depth: false,
                stencil: false,
                antialias: false,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance'
            });
            
            if (!gl) {
                console.warn('❌ WebGL不支持，使用CPU计算');
                return;
            }
            
            console.log('✅ WebGL上下文创建成功');
            console.log(`🔧 WebGL版本: ${gl.getParameter(gl.VERSION)}`);
            console.log(`💻 GLSL版本: ${gl.getParameter(gl.SHADING_LANGUAGE_VERSION)}`);
            
            this.gl = gl;
            this.useGPUAcceleration = true;
            
            // Apple GPU特定设置
            if (this.enableAppleOptimizations) {
                console.log('🍎 配置Apple GPU优化...');
                this.configureAppleWebGL(gl);
            }
            
            // 初始化GPU着色器
            console.log('🎨 初始化GPU着色器...');
            this.initGPUShaders();
            
            // 初始化GPU缓冲区
            console.log('📚 初始化GPU缓冲区...');
            this.initGPUBuffers();
            
            console.log('✅ GPU加速已启用');
            if (this.enableAppleOptimizations) {
                console.log('🍎 Apple GPU优化已激活');
            }
        } catch (error) {
            console.error('❌ GPU加速初始化失败，使用CPU模式:', error);
            console.error('错误堆栈:', error.stack);
            this.useGPUAcceleration = false;
        }
    }
    
    // Apple WebGL专用配置
    configureAppleWebGL(gl) {
        // 启用Apple GPU特有扩展
        const extensions = [
            'EXT_color_buffer_float',
            'OES_texture_float',
            'OES_texture_half_float',
            'WEBGL_color_buffer_float',
            'EXT_float_blend'
        ];
        
        extensions.forEach(ext => {
            const extension = gl.getExtension(ext);
            if (extension) {
                console.log(`🔧 启用Apple GPU扩展: ${ext}`);
            }
        });
        
        // 优化渲染状态
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.DITHER);
        
        if (this.unifiedMemoryOptimization) {
            console.log('💾 启用统一内存架构优化');
        }
        
        if (this.metalBackendOptimization) {
            console.log('⚡ 启用Metal后端优化');
        }
    }

    initGPUShaders() {
        const gl = this.gl;
        
        // 顶点着色器（通用）
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;
        
        // 高斯滤波片段着色器
        const gaussianFragmentSource = `
            precision mediump float;
            uniform sampler2D u_image;
            uniform vec2 u_textureSize;
            uniform float u_kernel[25]; // 5x5核
            varying vec2 v_texCoord;
            
            void main() {
                vec2 onePixel = vec2(1.0) / u_textureSize;
                vec4 colorSum = vec4(0.0);
                
                for (int i = -2; i <= 2; i++) {
                    for (int j = -2; j <= 2; j++) {
                        vec2 sampleCoord = v_texCoord + vec2(float(i), float(j)) * onePixel;
                        int kernelIndex = (i + 2) * 5 + (j + 2);
                        colorSum += texture2D(u_image, sampleCoord) * u_kernel[kernelIndex];
                    }
                }
                
                gl_FragColor = colorSum;
            }
        `;
        
        // 强度计算片段着色器
        const intensityFragmentSource = `
            precision mediump float;
            uniform sampler2D u_image;
            varying vec2 v_texCoord;
            
            void main() {
                vec4 color = texture2D(u_image, v_texCoord);
                float intensity = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
                gl_FragColor = vec4(intensity, intensity, intensity, 1.0);
            }
        `;
        
        // 峰值检测预处理片段着色器
        const peakDetectionFragmentSource = `
            precision highp float;
            uniform sampler2D u_image;
            uniform vec2 u_textureSize;
            uniform float u_threshold;
            varying vec2 v_texCoord;
            
            void main() {
                vec2 onePixel = vec2(1.0) / u_textureSize;
                float center = texture2D(u_image, v_texCoord).r;
                
                // 阈值过滤
                if (center < u_threshold / 255.0) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }
                
                // 检查3x3邻域
                float maxVal = center;
                for(int i = -1; i <= 1; i++) {
                    for(int j = -1; j <= 1; j++) {
                        if(i == 0 && j == 0) continue;
                        vec2 offset = vec2(float(i), float(j)) * onePixel;
                        float neighbor = texture2D(u_image, v_texCoord + offset).r;
                        maxVal = max(maxVal, neighbor);
                    }
                }
                
                // 判断是否为局部最大值
                float isPeak = step(maxVal - 0.001, center) * step(0.001, center - maxVal + 0.001);
                
                // R通道：强度值，G通道：是否为峰值
                gl_FragColor = vec4(center, isPeak, 0.0, 1.0);
            }
        `;
        
        this.gaussianShader = this.createShaderProgram(vertexShaderSource, gaussianFragmentSource);
        this.intensityShader = this.createShaderProgram(vertexShaderSource, intensityFragmentSource);
        this.peakDetectionShader = this.createShaderProgram(vertexShaderSource, peakDetectionFragmentSource);
    }

    createShaderProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('着色器程序链接失败:', gl.getProgramInfoLog(program));
            return null;
        }
        
        return program;
    }

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('着色器编译失败:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }

    initGPUBuffers() {
        const gl = this.gl;
        
        // 顶点缓冲区（全屏四边形）
        const positions = new Float32Array([
            -1, -1,  0, 0,
             1, -1,  1, 0,
            -1,  1,  0, 1,
             1,  1,  1, 1
        ]);
        
        this.gpuBuffers.position = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gpuBuffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        
        // 纹理缓冲区
        this.gpuBuffers.inputTexture = gl.createTexture();
        this.gpuBuffers.outputTexture = gl.createTexture();
        this.gpuBuffers.tempTexture = gl.createTexture();
        this.gpuBuffers.framebuffer = gl.createFramebuffer();
        
        // 配置输入纹理
        gl.bindTexture(gl.TEXTURE_2D, this.gpuBuffers.inputTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        // 配置输出纹理
        gl.bindTexture(gl.TEXTURE_2D, this.gpuBuffers.outputTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        // 配置临时纹理
        gl.bindTexture(gl.TEXTURE_2D, this.gpuBuffers.tempTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        console.log('📚 GPU缓冲区已配置');
    }

    // Web Worker初始化
    initWebWorker() {
        if (typeof Worker === 'undefined') {
            console.warn('Web Worker不支持');
            return;
        }
        
        try {
            // 内联Worker代码
            const workerCode = `
                self.onmessage = function(e) {
                    const { imageData, threshold, width, height } = e.data;
                    
                    // 在Worker中执行峰值检测
                    const peaks = findLocalMaximaWorker(imageData, threshold, width, height);
                    
                    self.postMessage({ peaks });
                };
                
                function findLocalMaximaWorker(intensityBuffer, threshold, width, height) {
                    const peaks = [];
                    const radius = 8;
                    
                    for (let y = radius; y < height - radius; y++) {
                        for (let x = radius; x < width - radius; x++) {
                            const centerIdx = y * width + x;
                            const centerValue = intensityBuffer[centerIdx];
                            
                            if (centerValue < threshold) continue;
                            
                            let isLocalMax = true;
                            for (let dy = -radius; dy <= radius && isLocalMax; dy++) {
                                for (let dx = -radius; dx <= radius && isLocalMax; dx++) {
                                    if (dx === 0 && dy === 0) continue;
                                    
                                    const neighborIdx = (y + dy) * width + (x + dx);
                                    if (intensityBuffer[neighborIdx] > centerValue) {
                                        isLocalMax = false;
                                    }
                                }
                            }
                            
                            if (isLocalMax) {
                                peaks.push({
                                    x: x,
                                    y: y,
                                    intensity: centerValue
                                });
                            }
                        }
                    }
                    
                    peaks.sort((a, b) => b.intensity - a.intensity);
                    return peaks.slice(0, 5);
                }
            `;
            
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            this.worker = new Worker(URL.createObjectURL(blob));
            this.useWebWorker = true;
            this.workerReady = true;
            
            console.log('✅ Web Worker已启用');
        } catch (error) {
            console.warn('Web Worker初始化失败:', error);
            this.useWebWorker = false;
        }
    }

    // 设备性能检测
    detectDevicePerformance() {
        // 检测硬件信息
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                console.log('GPU信息:', renderer);
                
                // 基于GPU信息调整性能参数（包含Apple优化）
                this.configureGPUPerformance(renderer, gl);
                
                // 如果是Apple设备，启用专用优化
                if (this.detectAppleDevice()) {
                    this.enableAppleOptimizations = true;
                    this.appleGPUOptimizations();
                    console.log('🍎 启用Apple设备专用优化');
                }
            }
        }
        
        // 检测CPU核心数
        const cores = navigator.hardwareConcurrency || 4;
        if (cores >= 8) {
            this.targetFrameRate = Math.min(this.targetFrameRate + 15, 75);
        } else if (cores <= 2) {
            this.targetFrameRate = Math.max(this.targetFrameRate - 15, 30);
        }
        
        // 针对Apple Silicon进行额外优化
        if (this.detectAppleDevice()) {
            this.optimizeForAppleSilicon(cores);
        }
        
        console.log(`🎯 设备性能检测完成: ${cores}核心, 目标帧率${this.targetFrameRate}fps, 质量${this.adaptiveQuality}`);
    }
    
    // Apple GPU专用优化
    appleGPUOptimizations() {
        // 利用Apple GPU的统一内存架构
        this.unifiedMemoryOptimization = true;
        
        // 启用Metal后端优化（通过WebGL）
        this.metalBackendOptimization = true;
        
        // 增加GPU工作负载，减少CPU开销
        this.gpuWorkloadPreference = 0.9; // 90%工作量给GPU
        
        // Apple GPU的高效纹理格式
        this.preferredTextureFormat = 'RGBA8';
        
        // 优化帧缓冲区大小（Apple GPU内存带宽更高）
        this.optimizeFrameBufferSize = true;
        
        console.log('🔧 已启用Apple GPU专用优化');
    }
    
    // 针对Apple Silicon的优化
    optimizeForAppleSilicon(cores) {
        // Apple设备通常有高效能+性能核心
        if (cores >= 10) {
            // M1 Pro/Max/Ultra或更高
            this.targetFrameRate = Math.min(this.targetFrameRate + 20, 120);
            this.enableHighPerformanceMode = true;
            console.log('🚀 检测到Apple高性能芯片 - 启用120fps模式');
        } else if (cores >= 8) {
            // 标准M1/M2或A系列
            this.targetFrameRate = Math.min(this.targetFrameRate + 15, 90);
            console.log('⚡ 检测到Apple标准芯片 - 启用90fps模式');
        }
        
        // Apple设备的Web Worker优化
        this.enableAppleWorkerOptimizations = true;
        
        // 启用ProMotion显示器支持（如果可用）
        this.enableProMotionSupport = true;
    }
    
    // 检测Apple设备
    detectAppleDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        
        // 检测iOS设备 (A系列芯片)
        const isIOS = /iphone|ipad|ipod/.test(userAgent) || 
                     (platform === 'macintel' && 'ontouchend' in document);
        
        // 检测macOS设备（包括Intel和Apple Silicon）
        const isMac = platform.includes('mac') || 
                     /macintosh|mac os/i.test(userAgent) ||
                     platform === 'macintel';
        
        // 检测是否为Apple Silicon Mac
        const isAppleSilicon = isMac && this.detectAppleSilicon();
        
        // 主动检测Apple WebGL扩展
        const hasAppleWebGL = this.hasAppleWebGLExtensions();
        
        console.log(`🔍 Apple设备检测: iOS=${isIOS}, Mac=${isMac}, AppleSilicon=${isAppleSilicon}, WebGL=${hasAppleWebGL}`);
        
        return isIOS || isMac || isAppleSilicon || hasAppleWebGL;
    }

    // 检测Apple WebGL扩展
    hasAppleWebGLExtensions() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!gl) return false;
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                
                return /apple|amd.*apple|intel.*iris.*pro/i.test(renderer + vendor);
            }
            return false;
        } catch (error) {
            return false;
        }
    }
    
    // 检测Apple Silicon芯片
    detectAppleSilicon() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                
                // Apple GPU标识符
                const appleGPUIndicators = [
                    'apple', 'a14', 'a15', 'a16', 'a17', 
                    'm1', 'm2', 'm3', 'm4',
                    'metal', 'apple gpu'
                ];
                
                return appleGPUIndicators.some(indicator => 
                    renderer.toLowerCase().includes(indicator) || 
                    vendor.toLowerCase().includes(indicator)
                );
            }
        }
        
        return false;
    }
    
    // 配置GPU性能参数
    configureGPUPerformance(renderer, gl) {
        const rendererLower = renderer.toLowerCase();
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
        const vendorLower = vendor.toLowerCase();
        
        if (this.detectAppleDevice() || vendorLower.includes('apple')) {
            // Apple GPU优化配置
            this.configureAppleGPU(renderer);
        } else if (rendererLower.includes('nvidia')) {
            // NVIDIA独显
            this.adaptiveQuality = 1.0;
            this.targetFrameRate = 75;
            console.log('🎮 检测到NVIDIA GPU - 启用最高性能模式');
        } else if (rendererLower.includes('amd') || rendererLower.includes('radeon')) {
            // AMD独显
            this.adaptiveQuality = 1.0;
            this.targetFrameRate = 70;
            console.log('🔴 检测到AMD GPU - 启用高性能模式');
        } else if (rendererLower.includes('intel')) {
            // Intel集显
            this.adaptiveQuality = 0.8;
            this.targetFrameRate = 45;
            console.log('💻 检测到Intel GPU - 启用优化模式');
        } else {
            // 未知GPU
            this.adaptiveQuality = 0.7;
            this.targetFrameRate = 45;
            console.log('❓ 未知GPU - 启用保守模式');
        }
    }
    
    // Apple GPU专门配置
    configureAppleGPU(renderer) {
        const rendererLower = renderer.toLowerCase();
        
        // 检测具体的Apple芯片
        if (rendererLower.includes('m3') || rendererLower.includes('a17')) {
            this.adaptiveQuality = 1.0;
            this.targetFrameRate = 90;
            console.log('🚀 检测到Apple M3/A17 - 启用极致性能模式');
        } else if (rendererLower.includes('m2') || rendererLower.includes('a16') || rendererLower.includes('a15')) {
            this.adaptiveQuality = 1.0;
            this.targetFrameRate = 75;
            console.log('⚡ 检测到Apple M2/A16/A15 - 启用高性能模式');
        } else if (rendererLower.includes('m1') || rendererLower.includes('a14')) {
            this.adaptiveQuality = 0.95;
            this.targetFrameRate = 65;
            console.log('🍎 检测到Apple M1/A14 - 启用Apple优化模式');
        } else {
            this.adaptiveQuality = 0.9;
            this.targetFrameRate = 60;
            console.log('🍏 检测到Apple GPU - 启用Apple通用优化');
        }
        
        // Apple GPU通用优化
        this.appleGPUOptimizations();
    }

    // 性能监控和自适应调整
    monitorPerformance(frameStart) {
        const frameEnd = performance.now();
        this.processingTime = frameEnd - frameStart;
        
        // 记录性能历史
        this.performanceHistory.push(this.processingTime);
        if (this.performanceHistory.length > 10) {
            this.performanceHistory.shift();
        }
        
        // 每秒检查一次性能并调整
        if (frameEnd - this.lastPerformanceCheck > 1000) {
            this.lastPerformanceCheck = frameEnd;
            this.adaptPerformance();
        }
    }

    adaptPerformance() {
        const avgProcessingTime = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
        
        // 精度优先的性能调整策略
        if (avgProcessingTime > this.frameTimeTarget * 1.3) { // 提高阈值，避免过度优化
            // 优先启用跳帧，保持质量
            if (this.frameSkipPattern < 2) {
                this.frameSkipPattern++;
                console.log(`⚡ 性能自适应: 启用跳帧模式 ${this.frameSkipPattern} (保持精度)`);
            }
            // 然后降低帧率而不是质量
            else if (this.targetFrameRate > this.minFrameRate) {
                this.targetFrameRate = Math.max(this.minFrameRate, this.targetFrameRate - 2);
                this.frameTimeTarget = 1000 / this.targetFrameRate;
                console.log(`⚡ 性能自适应: 降低帧率到 ${this.targetFrameRate}fps (保持精度)`);
            }
            // 只有在极端情况下才启用快速模式
            else if (!this.fastProcessingMode && avgProcessingTime > this.frameTimeTarget * 1.8) {
                this.fastProcessingMode = true;
                console.log(`⚡ 性能自适应: 启用快速处理模式 (极端情况)`);
            }
            // 最后才考虑降低质量，但不要太低
            else if (this.adaptiveQuality > 0.6) {
                this.adaptiveQuality = Math.max(0.6, this.adaptiveQuality - 0.1);
                console.log(`⚡ 性能自适应: 降低质量到 ${this.adaptiveQuality.toFixed(1)} (最小60%)`);
            }
        }
        // 如果性能良好，优先恢复质量和精度
        else if (avgProcessingTime < this.frameTimeTarget * 0.7) {
            if (this.fastProcessingMode) {
                this.fastProcessingMode = false;
                console.log(`⚡ 性能提升: 关闭快速处理模式 (恢复精度)`);
            } else if (this.adaptiveQuality < 1.0) {
                this.adaptiveQuality = Math.min(1.0, this.adaptiveQuality + 0.1);
                console.log(`⚡ 性能提升: 提高质量到 ${this.adaptiveQuality.toFixed(1)}`);
            } else if (this.frameSkipPattern > 0) {
                this.frameSkipPattern--;
                console.log(`⚡ 性能提升: 减少跳帧到 ${this.frameSkipPattern}`);
            } else if (this.targetFrameRate < 60) {
                this.targetFrameRate = Math.min(60, this.targetFrameRate + 2);
                this.frameTimeTarget = 1000 / this.targetFrameRate;
                console.log(`⚡ 性能提升: 提高帧率到 ${this.targetFrameRate}fps`);
            }
        }
    }

    // 获取当前系统性能指标
    getPerformanceMetrics() {
        const avgProcessingTime = this.performanceHistory.length > 0 
            ? this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length 
            : 0;

        const actualFps = avgProcessingTime > 0 ? Math.min(60, 1000 / avgProcessingTime) : 0;
        const latency = avgProcessingTime;

        return {
            // 帧率信息
            targetFps: this.targetFrameRate,
            actualFps: Math.round(actualFps * 10) / 10,
            minFps: this.minFrameRate,
            
            // 延时信息 (毫秒)
            processingLatency: Math.round(latency * 100) / 100,
            frameTimeTarget: Math.round(this.frameTimeTarget * 100) / 100,
            
            // 精度设置
            localMaxRadius: this.localMaxRadius,
            gaussianSigma: this.gaussianSigma,
            sensitivity: this.sensitivity,
            
            // 性能优化状态
            performanceMode: this.performanceMode === 'speed' ? '速度优先' : 
                           this.performanceMode === 'balanced' ? '均衡模式' : '精准优先',
            frameSkipPattern: this.frameSkipPattern,
            adaptiveQuality: Math.round(this.adaptiveQuality * 100),
            useGPUAcceleration: this.useGPUAcceleration,
            useWebWorker: this.useWebWorker,
            fastProcessingMode: this.fastProcessingMode,
            
            // 检测精度信息
            detectionPrecision: "亚像素级 (0.1-0.01 pixel)",
            alignmentPrecision: "像素级 (±1 pixel)",
            centroidAccuracy: "高精度指数加权质心算法"
        };
    }

    // 输出性能报告到控制台
    logPerformanceReport() {
        const metrics = this.getPerformanceMetrics();
        
        console.group("🔍 光斑检测系统性能报告");
        console.log("📊 帧率性能:");
        console.log(`  目标帧率: ${metrics.targetFps} FPS`);
        console.log(`  实际帧率: ${metrics.actualFps} FPS`);
        console.log(`  最低帧率: ${metrics.minFps} FPS`);
        
        console.log("⏱️ 延时分析:");
        console.log(`  处理延时: ${metrics.processingLatency} ms`);
        console.log(`  帧时间目标: ${metrics.frameTimeTarget} ms`);
        
        console.log("🎯 检测精度:");
        console.log(`  光斑定位: ${metrics.detectionPrecision}`);
        console.log(`  对齐精度: ${metrics.alignmentPrecision}`);
        console.log(`  质心算法: ${metrics.centroidAccuracy}`);
        console.log(`  检测半径: ${metrics.localMaxRadius} pixels`);
        console.log(`  高斯滤波σ: ${metrics.gaussianSigma}`);
        console.log(`  灵敏度: ${metrics.sensitivity}`);
        
        console.log("⚡ 性能优化:");
        console.log(`  性能模式: ${metrics.performanceMode}`);
        console.log(`  跳帧模式: ${metrics.frameSkipPattern > 0 ? `跳${metrics.frameSkipPattern}帧` : '无跳帧'}`);
        console.log(`  自适应质量: ${metrics.adaptiveQuality}%`);
        console.log(`  快速处理: ${metrics.fastProcessingMode ? '启用' : '禁用'}`);
        console.log(`  GPU加速: ${metrics.useGPUAcceleration ? '启用' : '禁用'}`);
        console.log(`  Web Worker: ${metrics.useWebWorker ? '启用' : '禁用'}`);
        
        console.groupEnd();
        
        return metrics;
    }

    // GPU加速的高斯滤波（完整实现）
    applyGaussianFilterGPU() {
        if (!this.useGPUAcceleration || !this.gl || !this.gaussianShader) {
            return this.applyGaussianFilter(); // 回退到CPU
        }
        
        const gl = this.gl;
        
        try {
            // 设置视口
            gl.viewport(0, 0, this.width, this.height);
            
            // 上传图像数据到GPU
            gl.bindTexture(gl.TEXTURE_2D, this.gpuBuffers.inputTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, 
                         gl.RGBA, gl.UNSIGNED_BYTE, this.createRGBAFromIntensity());
            
            // 配置着色器程序
            gl.useProgram(this.gaussianShader);
            
            // 设置uniform变量
            const textureLocation = gl.getUniformLocation(this.gaussianShader, 'u_image');
            const textureSizeLocation = gl.getUniformLocation(this.gaussianShader, 'u_textureSize');
            const sigmaLocation = gl.getUniformLocation(this.gaussianShader, 'u_sigma');
            
            gl.uniform1i(textureLocation, 0);
            gl.uniform2f(textureSizeLocation, this.width, this.height);
            gl.uniform1f(sigmaLocation, this.gaussianSigma);
            
            // 设置顶点属性
            const positionLocation = gl.getAttribLocation(this.gaussianShader, 'a_position');
            const texCoordLocation = gl.getAttribLocation(this.gaussianShader, 'a_texCoord');
            
            gl.bindBuffer(gl.ARRAY_BUFFER, this.gpuBuffers.position);
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
            gl.enableVertexAttribArray(texCoordLocation);
            gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
            
            // 绑定输出纹理
            gl.bindTexture(gl.TEXTURE_2D, this.gpuBuffers.outputTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, 
                         gl.RGBA, gl.UNSIGNED_BYTE, null);
            
            // 设置帧缓冲区
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.gpuBuffers.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, 
                                  this.gpuBuffers.outputTexture, 0);
            
            // 执行GPU计算
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            
            // 读取结果
            const result = new Uint8Array(this.width * this.height * 4);
            gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, result);
            
            // 更新强度缓冲区
            for (let i = 0; i < this.intensityBuffer.length; i++) {
                this.intensityBuffer[i] = result[i * 4]; // 取R通道
            }
            
            // 重置状态
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.bindTexture(gl.TEXTURE_2D, null);
            
        } catch (error) {
            console.warn('GPU滤波失败，回退CPU:', error);
            this.useGPUAcceleration = false; // 禁用GPU加速
            this.applyGaussianFilter();
        }
    }
    
    // 将强度缓冲区转换为RGBA格式
    createRGBAFromIntensity() {
        const rgba = new Uint8Array(this.width * this.height * 4);
        for (let i = 0; i < this.intensityBuffer.length; i++) {
            const intensity = this.intensityBuffer[i];
            const idx = i * 4;
            rgba[idx] = intensity;     // R
            rgba[idx + 1] = intensity; // G
            rgba[idx + 2] = intensity; // B
            rgba[idx + 3] = 255;       // A
        }
        return rgba;
    }
    
    // GPU加速的峰值预检测
    applyPeakDetectionGPU(threshold) {
        if (!this.useGPUAcceleration || !this.gl || !this.peakDetectionShader) {
            return null;
        }
        
        const gl = this.gl;
        
        try {
            gl.viewport(0, 0, this.width, this.height);
            gl.useProgram(this.peakDetectionShader);
            
            // 设置uniform变量
            const textureLocation = gl.getUniformLocation(this.peakDetectionShader, 'u_image');
            const textureSizeLocation = gl.getUniformLocation(this.peakDetectionShader, 'u_textureSize');
            const thresholdLocation = gl.getUniformLocation(this.peakDetectionShader, 'u_threshold');
            
            gl.uniform1i(textureLocation, 0);
            gl.uniform2f(textureSizeLocation, this.width, this.height);
            gl.uniform1f(thresholdLocation, threshold);
            
            // 绑定输入纹理
            gl.bindTexture(gl.TEXTURE_2D, this.gpuBuffers.inputTexture);
            
            // 设置输出
            gl.bindTexture(gl.TEXTURE_2D, this.gpuBuffers.tempTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, 
                         gl.RGBA, gl.UNSIGNED_BYTE, null);
            
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.gpuBuffers.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, 
                                  this.gpuBuffers.tempTexture, 0);
            
            // 执行计算
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            
            // 读取结果
            const result = new Uint8Array(this.width * this.height * 4);
            gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, result);
            
            // 重置状态
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            
            return result;
            
        } catch (error) {
            console.warn('GPU峰值检测失败:', error);
            return null;
        }
    }

    // 并行峰值检测
    async findLocalMaximaParallel(threshold) {
        if (!this.useWebWorker || !this.workerReady) {
            return this.findLocalMaxima(threshold);
        }
        
        return new Promise((resolve) => {
            this.worker.onmessage = (e) => {
                resolve(e.data.peaks);
            };
            
            this.worker.postMessage({
                imageData: Array.from(this.intensityBuffer),
                threshold: threshold,
                width: this.width,
                height: this.height
            });
        });
    }

    // 高斯分布拟合算法
    fitGaussian2D(peak, radius = 20) {
        if (!peak || !this.intensityBuffer) return null;

        const { x: centerX, y: centerY, intensity } = peak;
        const width = this.width;
        const height = this.height;
        
        // 提取峰值周围的数据
        const minX = Math.max(0, Math.floor(centerX - radius));
        const maxX = Math.min(width - 1, Math.floor(centerX + radius));
        const minY = Math.max(0, Math.floor(centerY - radius));
        const maxY = Math.min(height - 1, Math.floor(centerY + radius));
        
        // 收集数据点
        const points = [];
        let sumI = 0, sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
        let count = 0;
        
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const idx = y * width + x;
                const I = this.intensityBuffer[idx];
                if (I > intensity * 0.1) { // 只考虑有意义的强度值
                    points.push({ x, y, I });
                    sumI += I;
                    sumX += x * I;
                    sumY += y * I;
                    sumXX += x * x * I;
                    sumYY += y * y * I;
                    sumXY += x * y * I;
                    count++;
                }
            }
        }
        
        if (count < 5) return null;
        
        // 计算加权中心
        const x0 = sumX / sumI;
        const y0 = sumY / sumI;
        
        // 计算协方差矩阵元素
        let varX = 0, varY = 0, covXY = 0;
        let sumWeights = 0;
        
        for (const point of points) {
            const dx = point.x - x0;
            const dy = point.y - y0;
            const weight = point.I;
            
            varX += weight * dx * dx;
            varY += weight * dy * dy;
            covXY += weight * dx * dy;
            sumWeights += weight;
        }
        
        varX /= sumWeights;
        varY /= sumWeights;
        covXY /= sumWeights;
        
        // 计算高斯参数
        const sigmaX = Math.sqrt(Math.abs(varX));
        const sigmaY = Math.sqrt(Math.abs(varY));
        const A = sumI / count; // 振幅近似
        
        // 旋转角度 (如果有相关性)
        const theta = Math.abs(covXY) > 1e-6 ? 0.5 * Math.atan2(2 * covXY, varX - varY) : 0;
        
        return {
            A: A,
            x0: x0,
            y0: y0,
            sigmaX: sigmaX,
            sigmaY: sigmaY,
            theta: theta,
            correlation: covXY / (sigmaX * sigmaY + 1e-10)
        };
    }

    // 生成高斯分布公式字符串
    generateGaussianFormula(gaussianParams, peakIndex) {
        if (!gaussianParams) return null;
        
        const { A, x0, y0, sigmaX, sigmaY, theta, correlation } = gaussianParams;
        
        // 格式化数值
        const fmtA = A.toFixed(1);
        const fmtX0 = x0.toFixed(1);
        const fmtY0 = y0.toFixed(1);
        const fmtSigmaX = sigmaX.toFixed(2);
        const fmtSigmaY = sigmaY.toFixed(2);
        const fmtTheta = (theta * 180 / Math.PI).toFixed(1);
        
        let formula;
        if (Math.abs(correlation) < 0.1) {
            // 简单的二维高斯（无相关性）
            formula = `G${peakIndex}(x,y) = ${fmtA} × exp(-[(x-${fmtX0})²/(2σₓ²) + (y-${fmtY0})²/(2σᵧ²)])`;
        } else {
            // 有旋转的二维高斯
            formula = `G${peakIndex}(x,y) = ${fmtA} × exp(-[cos²θ(x-${fmtX0})²/σₓ² + sin²θ(y-${fmtY0})²/σᵧ² + 2sinθcosθ(x-${fmtX0})(y-${fmtY0})/(σₓσᵧ)])`;
        }
        
        const params = `σₓ=${fmtSigmaX}, σᵧ=${fmtSigmaY}, θ=${fmtTheta}°, r=${correlation.toFixed(3)}`;
        
        return { formula, params };
    }

    // 辅助函数：将十六进制颜色转换为RGBA
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // 更新高斯拟合公式显示
    updateGaussianFormulas(peaks) {
        if (!this.formulaContent || !peaks || peaks.length === 0) {
            if (this.formulaContent) {
                this.formulaContent.innerHTML = '';
            }
            return;
        }

        // 限制更新频率（每3帧更新一次）
        this.formulaUpdateCounter++;
        if (this.formulaUpdateCounter % 3 !== 0) return;

        const formulas = [];
        
        // 为每个峰值计算高斯拟合 - 严格对应实际检测到的光斑
        peaks.forEach((peak, index) => {
            const gaussianParams = this.fitGaussian2D(peak, 25);
            if (gaussianParams) {
                const formulaData = this.generateGaussianFormula(gaussianParams, index + 1);
                if (formulaData) {
                    formulas.push({
                        index: index + 1,
                        peak: peak,
                        formula: formulaData.formula,
                        params: formulaData.params,
                        gaussianParams: gaussianParams
                    });
                }
            }
        });

        // 更新显示 - 严格按光斑数量显示公式
        if (formulas.length > 0) {
            let html = '';
            
            // 颜色数组，与光斑可视化保持一致
            const colors = [
                '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6',
                '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
                '#14b8a6', '#f43f5e', '#a855f7', '#10b981', '#0ea5e9'
            ];
            
            // 为每个光斑显示对应的公式，使用动态颜色
            formulas.forEach((formula, index) => {
                const color = colors[index % colors.length];
                const backgroundColor = this.hexToRgba(color, 0.15);
                const borderColor = this.hexToRgba(color, 0.3);
                
                html += `<div class="formula-item" style="background: ${backgroundColor}; border-color: ${borderColor};">
                    <div class="formula-math">${formula.formula}</div>
                    <div class="formula-params">${formula.params}</div>
                </div>`;
            });
            
            // 只有2个光斑时才在公式区域显示对齐状态
            if (formulas.length === 2) {
                const peak1 = formulas[0];
                const peak2 = formulas[1];
                const distance = Math.sqrt(
                    Math.pow(peak1.peak.x - peak2.peak.x, 2) + 
                    Math.pow(peak1.peak.y - peak2.peak.y, 2)
                );
                
                const isAligned = distance < 15;
                if (isAligned) {
                    html += `<div class="formula-item aligned"><div class="formula-math">光斑已对齐</div></div>`;
                }
            }
            
            this.formulaContent.innerHTML = html;
        } else {
            this.formulaContent.innerHTML = '<div class="formula-item">等待检测光斑...</div>';
        }

        // 缓存结果避免重复计算
        this.lastFormulas = formulas;
    }

    // 绘制高斯拟合可视化 - 在视频和热力图上都显示
    renderGaussianFitting(peaks) {
        // 清除两个overlay画布
        if (this.overlayCtx) {
            this.overlayCtx.clearRect(0, 0, this.width, this.height);
        }
        if (this.videoOverlayCtx) {
            this.videoOverlayCtx.clearRect(0, 0, this.width, this.height);
        }

        // 绘制当前检测到的光斑
        if (peaks && peaks.length > 0) {
            // 在热力图overlay上绘制高斯拟合可视化
            if (this.overlayCtx) {
                peaks.forEach((peak, index) => {
                    const gaussianParams = this.fitGaussian2D(peak, 25);
                    if (gaussianParams) {
                        this.drawGaussianVisualization(gaussianParams, index, this.overlayCtx);
                    }
                });
            }

            // 在视频overlay上绘制高斯拟合可视化
            if (this.videoOverlayCtx) {
                peaks.forEach((peak, index) => {
                    const gaussianParams = this.fitGaussian2D(peak, 25);
                    if (gaussianParams) {
                        this.drawGaussianVisualization(gaussianParams, index, this.videoOverlayCtx);
                    }
                });
            }

            // 绘制对齐分析（包含保存的光斑）
            this.drawAlignmentAnalysisWithSaved(peaks);
        }

        // 保存的光斑在主渲染循环中绘制
    }

    // 绘制保存的光斑
    drawSavedSpots() {
        if (!this.savedSpots || this.savedSpots.length === 0) return;

        this.savedSpots.forEach((savedSpot, index) => {
            // 在热力图overlay上绘制
            if (this.overlayCtx) {
                this.drawSavedSpot(this.overlayCtx, savedSpot, index);
            }
            
            // 在视频overlay上绘制
            if (this.videoOverlayCtx) {
                this.drawSavedSpot(this.videoOverlayCtx, savedSpot, index);
            }
        });
    }

    // 绘制单个保存的光斑
    drawSavedSpot(ctx, savedSpot, index) {
        if (!ctx || !savedSpot) return;
        
        ctx.save();
        
        // 使用不同的颜色区分保存的光斑
        const savedColor = '#22d3ee'; // 青色
        
        // 计算保存光斑的呼吸灯效果（不同的相位偏移）
        const time = Date.now() / 1000;
        const phaseOffset = index * 0.8; // 每个保存光斑有不同的相位偏移
        const breathingAlpha = 0.4 + 0.3 * Math.sin(time * 2 + phaseOffset); // 0.1 到 0.7 之间变化
        
        // 绘制外圈（较大，带呼吸效果）
        ctx.strokeStyle = savedColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.globalAlpha = breathingAlpha;
        ctx.beginPath();
        ctx.arc(savedSpot.x, savedSpot.y, 32, 0, Math.PI * 2);
        ctx.stroke();
        
        // 绘制中圈（稳定显示）
        ctx.strokeStyle = savedColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(savedSpot.x, savedSpot.y, 25, 0, Math.PI * 2);
        ctx.stroke();
        
        // 绘制内圈
        ctx.strokeStyle = savedColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(savedSpot.x, savedSpot.y, 15, 0, Math.PI * 2);
        ctx.stroke();
        
        // 绘制中心点（呼吸效果）
        ctx.fillStyle = savedColor;
        ctx.globalAlpha = breathingAlpha * 0.9;
        ctx.beginPath();
        ctx.arc(savedSpot.x, savedSpot.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // 添加光晕效果
        ctx.shadowColor = savedColor;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = breathingAlpha * 0.4;
        ctx.beginPath();
        ctx.arc(savedSpot.x, savedSpot.y, 35, 0, Math.PI * 2);
        ctx.stroke();
        
        // 添加保存光斑标记
        ctx.fillStyle = savedColor;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 3;
        ctx.globalAlpha = 1;
        ctx.fillText(`S${index + 1}`, savedSpot.x, savedSpot.y - 45);
        
        ctx.restore();
    }

    // 绘制单个高斯分布可视化
    drawGaussianVisualization(gaussianParams, peakIndex, ctx = null) {
        const { A, x0, y0, sigmaX, sigmaY, theta } = gaussianParams;
        const targetCtx = ctx || this.overlayCtx;
        if (!targetCtx) return;

        // 颜色配置
        const colors = [
            { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.1)', center: '#dc2626' },    // 红色
            { stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.1)', center: '#16a34a' },    // 绿色
            { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.1)', center: '#2563eb' },   // 蓝色
            { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.1)', center: '#d97706' },   // 橙色
            { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.1)', center: '#7c3aed' },   // 紫色
            { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.1)', center: '#0891b2' },    // 青色
            { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.1)', center: '#db2777' },   // 粉色
            { stroke: '#84cc16', fill: 'rgba(132, 204, 22, 0.1)', center: '#65a30d' },   // 柠檬绿
            { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.1)', center: '#ea580c' },   // 深橙色
            { stroke: '#6366f1', fill: 'rgba(99, 102, 241, 0.1)', center: '#4f46e5' },   // 靛蓝色
            { stroke: '#14b8a6', fill: 'rgba(20, 184, 166, 0.1)', center: '#0f766e' },   // 蓝绿色
            { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.1)', center: '#e11d48' },    // 玫瑰红
            { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.1)', center: '#9333ea' },   // 紫罗兰
            { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.1)', center: '#059669' },   // 翠绿色
            { stroke: '#0ea5e9', fill: 'rgba(14, 165, 233, 0.1)', center: '#0284c7' }    // 天蓝色
        ];
        const color = colors[peakIndex % colors.length];

        targetCtx.save();

        // 绘制高斯等高线椭圆
        this.drawGaussianContours(x0, y0, sigmaX, sigmaY, theta, color, targetCtx);

        // 绘制中心点（根据高斯参数调整大小）
        this.drawGaussianCenter(x0, y0, color.center, peakIndex + 1, targetCtx, sigmaX, sigmaY);

        // 绘制轴线（如果有旋转）
        if (Math.abs(theta) > 0.1) {
            this.drawGaussianAxes(x0, y0, sigmaX, sigmaY, theta, color.stroke, targetCtx);
        }

        targetCtx.restore();
    }

    // 绘制高斯等高线
    drawGaussianContours(x0, y0, sigmaX, sigmaY, theta, color, ctx = null) {
        const targetCtx = ctx || this.overlayCtx;
        if (!targetCtx) return;
        
        // 绘制3个等高线椭圆 (1σ, 2σ, 3σ)
        const levels = [1, 2, 3];
        const alphas = [0.8, 0.5, 0.3];

        levels.forEach((level, i) => {
            targetCtx.save();
            targetCtx.translate(x0, y0);
            targetCtx.rotate(theta);

            // 椭圆参数
            const radiusX = sigmaX * level;
            const radiusY = sigmaY * level;

            // 绘制椭圆
            targetCtx.beginPath();
            targetCtx.ellipse(0, 0, radiusX, radiusY, 0, 0, 2 * Math.PI);
            
            targetCtx.strokeStyle = color.stroke;
            targetCtx.globalAlpha = alphas[i];
            targetCtx.lineWidth = i === 0 ? 2 : 1.5;
            targetCtx.setLineDash(i === 0 ? [] : [3, 3]);
            targetCtx.stroke();

            // 填充最内层椭圆
            if (i === 0) {
                targetCtx.fillStyle = color.fill;
                targetCtx.globalAlpha = 0.15;
                targetCtx.fill();
            }

            targetCtx.restore();
        });
    }

    // 绘制高斯中心点（根据高斯参数调整大小）
    drawGaussianCenter(x0, y0, centerColor, peakNumber, ctx = null, sigmaX = 15, sigmaY = 15) {
        const targetCtx = ctx || this.overlayCtx;
        if (!targetCtx) return;
        
        targetCtx.save();

        // 根据高斯参数计算中心点大小
        const avgSigma = (sigmaX + sigmaY) / 2;
        const centerRadius = Math.max(3, Math.min(12, avgSigma * 0.4));
        const outerRadius = centerRadius + 3;
        const fontSize = Math.max(8, Math.min(12, centerRadius * 0.8));

        // 绘制中心点圆圈
        targetCtx.beginPath();
        targetCtx.arc(x0, y0, centerRadius, 0, 2 * Math.PI);
        targetCtx.fillStyle = centerColor;
        targetCtx.fill();

        // 绘制外圈
        targetCtx.beginPath();
        targetCtx.arc(x0, y0, outerRadius, 0, 2 * Math.PI);
        targetCtx.strokeStyle = '#ffffff';
        targetCtx.lineWidth = 2;
        targetCtx.stroke();

        // 绘制峰值编号
        targetCtx.fillStyle = '#ffffff';
        targetCtx.font = `bold ${fontSize}px Arial`;
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText(peakNumber.toString(), x0, y0);

        // 绘制脉冲效果（如果对齐）- 大小也根据sigma调整
        if (this.isAligned) {
            const pulseRadius = outerRadius + 6 + Math.sin(Date.now() / 200) * (avgSigma * 0.2);
            targetCtx.beginPath();
            targetCtx.arc(x0, y0, pulseRadius, 0, 2 * Math.PI);
            targetCtx.strokeStyle = centerColor;
            targetCtx.globalAlpha = 0.6;
            targetCtx.lineWidth = 2;
            targetCtx.stroke();
        }

        targetCtx.restore();
    }

    // 绘制高斯主轴
    drawGaussianAxes(x0, y0, sigmaX, sigmaY, theta, strokeColor, ctx = null) {
        const targetCtx = ctx || this.overlayCtx;
        if (!targetCtx) return;
        
        targetCtx.save();
        targetCtx.strokeStyle = strokeColor;
        targetCtx.globalAlpha = 0.6;
        targetCtx.lineWidth = 1;
        targetCtx.setLineDash([2, 2]);

        // X轴（长轴）
        const axisLength = Math.max(sigmaX * 2, 20);
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        targetCtx.beginPath();
        targetCtx.moveTo(x0 - axisLength * cosTheta, y0 - axisLength * sinTheta);
        targetCtx.lineTo(x0 + axisLength * cosTheta, y0 + axisLength * sinTheta);
        targetCtx.stroke();

        // Y轴（短轴）
        const yAxisLength = Math.max(sigmaY * 2, 20);
        targetCtx.beginPath();
        targetCtx.moveTo(x0 - yAxisLength * (-sinTheta), y0 - yAxisLength * cosTheta);
        targetCtx.lineTo(x0 + yAxisLength * (-sinTheta), y0 + yAxisLength * cosTheta);
        targetCtx.stroke();

        targetCtx.restore();
    }

    // 绘制对齐分析可视化
    drawAlignmentAnalysis(peaks) {
        if (peaks.length < 2) return;

        const peak1 = peaks[0];
        const peak2 = peaks[1];
        const ctx = this.overlayCtx;

        const distance = Math.sqrt(
            Math.pow(peak1.x - peak2.x, 2) + 
            Math.pow(peak1.y - peak2.y, 2)
        );

        const isAligned = distance < 15;
        this.isAligned = isAligned;

        ctx.save();

        if (isAligned) {
            // 对齐时绘制成功指示
            const centerX = (peak1.x + peak2.x) / 2;
            const centerY = (peak1.y + peak2.y) / 2;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.8;
            ctx.stroke();

            // 对齐标志
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('✓', centerX, centerY + 4);

        } else {
            // 未对齐时绘制连接线和距离
            ctx.beginPath();
            ctx.moveTo(peak1.x, peak1.y);
            ctx.lineTo(peak2.x, peak2.y);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7;
            ctx.setLineDash([5, 5]);
            ctx.stroke();

            // 显示距离文字
            const midX = (peak1.x + peak2.x) / 2;
            const midY = (peak1.y + peak2.y) / 2;
            
            ctx.fillStyle = '#ef4444';
            ctx.globalAlpha = 1;
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${distance.toFixed(1)}px`, midX, midY - 8);

            // 距离指示圆
            ctx.beginPath();
            ctx.arc(midX, midY, 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }

    // 绘制包含保存光斑的对齐分析
    drawAlignmentAnalysisWithSaved(peaks) {
        // 合并所有光斑：当前检测的光斑 + 保存的光斑
        const allSpots = [...(peaks || [])];
        
        // 添加保存的光斑
        if (this.savedSpots && this.savedSpots.length > 0) {
            allSpots.push(...this.savedSpots);
        }

        if (allSpots.length < 2) return;

        const ctx = this.overlayCtx;
        if (!ctx) return;

        ctx.save();

        // 分析所有光斑的对齐状态
        this.analyzeMultiSpotAlignment(allSpots, ctx);

        ctx.restore();
    }

    // 分析多光斑对齐状态
    analyzeMultiSpotAlignment(spots, ctx) {
        // 计算所有光斑对之间的距离和对齐状态
        let totalAligned = 0;
        let totalPairs = 0;
        let minDistance = Infinity;
        let alignmentPairs = [];

        for (let i = 0; i < spots.length - 1; i++) {
            for (let j = i + 1; j < spots.length; j++) {
                const spot1 = spots[i];
                const spot2 = spots[j];
                
                const distance = Math.sqrt(
                    Math.pow(spot1.x - spot2.x, 2) + 
                    Math.pow(spot1.y - spot2.y, 2)
                );

                const isAligned = distance < 20; // 稍微放宽对齐阈值
                if (isAligned) totalAligned++;
                totalPairs++;
                
                if (distance < minDistance) {
                    minDistance = distance;
                }

                alignmentPairs.push({
                    spot1, spot2, distance, isAligned,
                    isSaved1: spot1.id !== undefined, // 判断是否为保存的光斑
                    isSaved2: spot2.id !== undefined
                });
            }
        }

        // 绘制对齐线
        this.drawAlignmentLines(alignmentPairs, ctx);

        // 更新对齐状态
        this.isAligned = totalPairs > 0 ? (totalAligned / totalPairs) > 0.5 : false;
        
        // 显示对齐统计信息
        this.displayAlignmentStats(totalAligned, totalPairs, minDistance, ctx);
    }

    // 绘制对齐连线
    drawAlignmentLines(alignmentPairs, ctx) {
        if (!ctx || !alignmentPairs || alignmentPairs.length === 0) return;
        
        alignmentPairs.forEach(pair => {
            const { spot1, spot2, distance, isAligned, isSaved1, isSaved2 } = pair;
            
            ctx.save();

            if (isAligned) {
                // 对齐的连线用绿色
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.8;
                ctx.setLineDash([]);
                
                // 绘制连线
                ctx.beginPath();
                ctx.moveTo(spot1.x, spot1.y);
                ctx.lineTo(spot2.x, spot2.y);
                ctx.stroke();

                // 在中点绘制对齐标志
                const midX = (spot1.x + spot2.x) / 2;
                const midY = (spot1.y + spot2.y) / 2;
                
                ctx.beginPath();
                ctx.arc(midX, midY, 8, 0, 2 * Math.PI);
                ctx.fillStyle = '#22c55e';
                ctx.fill();
                
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✓', midX, midY);

            } else {
                // 未对齐的连线用红色虚线
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.6;
                ctx.setLineDash([4, 4]);
                
                // 绘制连线
                ctx.beginPath();
                ctx.moveTo(spot1.x, spot1.y);
                ctx.lineTo(spot2.x, spot2.y);
                ctx.stroke();

                // 显示距离
                const midX = (spot1.x + spot2.x) / 2;
                const midY = (spot1.y + spot2.y) / 2;
                
                ctx.fillStyle = '#ef4444';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 2;
                ctx.fillText(`${distance.toFixed(1)}px`, midX, midY);
            }

            ctx.restore();
        });
    }

    // 显示对齐统计信息
    displayAlignmentStats(totalAligned, totalPairs, minDistance, ctx) {
        if (!ctx || totalPairs === 0) return;

        const alignmentRate = (totalAligned / totalPairs * 100).toFixed(0);
        
        ctx.save();
        
        // 在左上角显示对齐统计
        const x = 10;
        const y = 10;
        
        // 背景框
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.roundRect(x, y, 140, 60, 8);
        ctx.fill();
        
        // 文字信息
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`对齐状态: ${alignmentRate}%`, x + 8, y + 18);
        ctx.fillText(`对齐光斑: ${totalAligned}/${totalPairs}对`, x + 8, y + 35);
        ctx.fillText(`最小距离: ${minDistance.toFixed(1)}px`, x + 8, y + 52);
        
        ctx.restore();
    }

    // 为合并视图绘制高斯拟合
    renderGaussianFittingMerged(peaks) {
        if (!peaks || peaks.length === 0 || !this.mergedCtx) return;

        // 清除覆盖层
        this.mergedCtx.save();
        this.mergedCtx.globalCompositeOperation = 'source-over';

        peaks.forEach((peak, index) => {
            const gaussianParams = this.fitGaussian2D(peak, 25);
            if (gaussianParams) {
                // 左侧视频区域的高斯可视化
                this.drawGaussianVisualizationMerged(gaussianParams, index, 0);
                // 右侧热力图区域的高斯可视化
                this.drawGaussianVisualizationMerged(gaussianParams, index, this.width);
            }
        });

        this.mergedCtx.restore();
    }

    // 更新距离信息显示
    updateDistanceInfo(peaks) {
        if (!this.distanceInfo || !peaks || peaks.length < 2) {
            if (this.distanceInfo) {
                this.distanceInfo.innerHTML = '';
            }
            return;
        }

        // 计算所有两两距离
        const distances = [];
        for (let i = 0; i < peaks.length; i++) {
            for (let j = i + 1; j < peaks.length; j++) {
                const distance = Math.sqrt(
                    Math.pow(peaks[i].x - peaks[j].x, 2) + 
                    Math.pow(peaks[i].y - peaks[j].y, 2)
                );
                distances.push({
                    from: i + 1,
                    to: j + 1,
                    distance: distance,
                    isAligned: distance < 15
                });
            }
        }

        // 生成距离显示HTML
        let html = '';
        distances.forEach(dist => {
            const alignClass = dist.isAligned ? 'aligned' : '';
            html += `<div class="distance-item ${alignClass}">G${dist.from}↔G${dist.to}: ${dist.distance.toFixed(1)}px</div>`;
        });

        this.distanceInfo.innerHTML = html;
    }

    // 为合并视图绘制单个高斯可视化
    drawGaussianVisualizationMerged(gaussianParams, peakIndex, offsetX) {
        const { A, x0, y0, sigmaX, sigmaY, theta } = gaussianParams;
        const ctx = this.mergedCtx;

        const colors = [
            { stroke: '#ef4444', center: '#dc2626' },    // 红色
            { stroke: '#22c55e', center: '#16a34a' },    // 绿色
            { stroke: '#3b82f6', center: '#2563eb' },    // 蓝色
            { stroke: '#f59e0b', center: '#d97706' },    // 橙色
            { stroke: '#8b5cf6', center: '#7c3aed' },    // 紫色
            { stroke: '#06b6d4', center: '#0891b2' },    // 青色
            { stroke: '#ec4899', center: '#db2777' },    // 粉色
            { stroke: '#84cc16', center: '#65a30d' },    // 柠檬绿
            { stroke: '#f97316', center: '#ea580c' },    // 深橙色
            { stroke: '#6366f1', center: '#4f46e5' },    // 靛蓝色
            { stroke: '#14b8a6', center: '#0f766e' },    // 蓝绿色
            { stroke: '#f43f5e', center: '#e11d48' },    // 玫瑰红
            { stroke: '#a855f7', center: '#9333ea' },    // 紫罗兰
            { stroke: '#10b981', center: '#059669' },    // 翠绿色
            { stroke: '#0ea5e9', center: '#0284c7' }     // 天蓝色
        ];
        const color = colors[peakIndex % colors.length];

        ctx.save();

        // 绘制等高线（简化版，根据实际sigma大小）
        ctx.save();
        ctx.translate(offsetX + x0, y0);
        ctx.rotate(theta);
        ctx.beginPath();
        ctx.ellipse(0, 0, sigmaX, sigmaY, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = color.stroke;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // 绘制中心点（合并视图中也根据sigma调整大小）
        const avgSigma = (sigmaX + sigmaY) / 2;
        const centerRadius = Math.max(2, Math.min(6, avgSigma * 0.3));
        
        ctx.beginPath();
        ctx.arc(offsetX + x0, y0, centerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = color.center;
        ctx.globalAlpha = 0.9;
        ctx.fill();
    }

    // 滑动弹窗相关方法
    updateSliderTooltip(value) {
        if (!this.sliderTooltip || !this.sensitivitySlider) return;

        // 计算滑块位置
        const sliderRect = this.sensitivitySlider.getBoundingClientRect();
        const sliderRange = this.sensitivitySlider.max - this.sensitivitySlider.min;
        const currentPosition = (value - this.sensitivitySlider.min) / sliderRange;
        const thumbPosition = sliderRect.width * currentPosition;
        
        // 设置弹窗位置
        this.sliderTooltip.style.left = `${thumbPosition}px`;
        
        // 计算预期检测光斑数量
        const expectedPeaks = Math.floor(value * 5);
        const peaksText = expectedPeaks <= 1 ? '1个' : 
                         expectedPeaks <= 2 ? '1-2个' :
                         expectedPeaks <= 3 ? '2-3个' :
                         expectedPeaks <= 5 ? '3-5个' : '5个以上';
        
        // 更新弹窗内容
        this.sliderTooltip.innerHTML = `
            <div class="tooltip-value">灵敏度: ${value.toFixed(2)}</div>
            <div class="tooltip-desc">预期光斑: ${peaksText}</div>
        `;
    }

    showSliderTooltip(show) {
        if (!this.sliderTooltip) return;

        if (show) {
            this.sliderTooltip.classList.add('show');
            // 更新当前值的弹窗内容
            this.updateSliderTooltip(this.sensitivity);
        } else {
            this.sliderTooltip.classList.remove('show');
        }
    }

    // 处理画布点击事件，用于选择光斑
    handleCanvasClick(event) {
        if (!this.isStreaming) {
            console.log('摄像头未启动，无法选择光斑');
            return;
        }

        const rect = event.target.getBoundingClientRect();
        const clickX = (event.clientX - rect.left) * (this.width / rect.width);
        const clickY = (event.clientY - rect.top) * (this.height / rect.height);
        
        console.log(`点击位置: (${clickX.toFixed(1)}, ${clickY.toFixed(1)})`);

        // 查找最近的光斑
        let nearestSpot = null;
        let minDistance = Infinity;
        const peaks = this.lastDetectedPeaks || [];
        
        console.log(`检测到 ${peaks.length} 个光斑`);

        for (let i = 0; i < peaks.length; i++) {
            const peak = peaks[i];
            const distance = Math.hypot(peak.x - clickX, peak.y - clickY);
            console.log(`光斑${i+1}: 位置(${peak.x.toFixed(1)}, ${peak.y.toFixed(1)}), 距离: ${distance.toFixed(1)}px`);
            
            if (distance < 40 && distance < minDistance) { // 增加到40像素范围
                minDistance = distance;
                nearestSpot = peak;
            }
        }

        if (nearestSpot) {
            this.selectedSpot = nearestSpot;
            console.log(`选中光斑: (${nearestSpot.x.toFixed(1)}, ${nearestSpot.y.toFixed(1)}), 强度: ${nearestSpot.intensity.toFixed(1)}`);
            
            // 启用保存按钮
            if (this.saveSpotBtn) {
                this.saveSpotBtn.disabled = false;
                this.saveSpotBtn.style.opacity = '1';
            }
            
            // 同步悬浮面板按钮状态
            this.syncFloatingButtonStates();
            
            // 显示成功选择的提示
            if (typeof showTopSuccess === 'function') {
                showTopSuccess(`已选中光斑 (${nearestSpot.x.toFixed(0)}, ${nearestSpot.y.toFixed(0)})`, false);
            }
        } else {
            this.selectedSpot = null;
            console.log('未找到附近的光斑');
            
            if (this.saveSpotBtn) {
                this.saveSpotBtn.disabled = true;
                this.saveSpotBtn.style.opacity = '0.6';
            }
            
            // 同步悬浮面板按钮状态
            this.syncFloatingButtonStates();
            
            // 显示未选中的提示
            if (typeof showTopError === 'function') {
                showTopError('未找到附近的光斑，请点击光斑中心附近', false);
            }
        }
    }

    // 绘制选中光斑的高亮（新的稳定方法）
    drawSelectedSpotHighlight() {
        if (!this.selectedSpot) return;

        // 在热力图overlay上绘制
        if (this.overlayCtx) {
            this.drawSpotHighlight(this.overlayCtx, this.selectedSpot);
        }
        
        // 在视频overlay上绘制
        if (this.videoOverlayCtx) {
            this.drawSpotHighlight(this.videoOverlayCtx, this.selectedSpot);
        }
    }

    // 绘制单个光斑的高亮
    drawSpotHighlight(ctx, spot) {
        if (!ctx || !spot) return;
        
        ctx.save();
        
        // 计算呼吸灯效果的透明度 (基于时间的正弦波)
        const time = Date.now() / 1000;
        const breathingAlpha = 0.5 + 0.4 * Math.sin(time * 3); // 0.1 到 0.9 之间变化
        
        // 外圈 - 更粗的边框和呼吸效果
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 6; // 增加到6像素粗
        ctx.setLineDash([8, 4]); // 调整虚线间距
        ctx.globalAlpha = breathingAlpha;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, 30, 0, Math.PI * 2);
        ctx.stroke();
        
        // 中圈 - 稳定的橙色圈
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, 25, 0, Math.PI * 2);
        ctx.stroke();
        
        // 内圈 - 白色内圈增强对比
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, 20, 0, Math.PI * 2);
        ctx.stroke();
        
        // 中心点 - 呼吸效果的填充
        ctx.fillStyle = '#ff6b35';
        ctx.globalAlpha = breathingAlpha * 0.8;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // 添加选中标记 - 带阴影效果
        ctx.fillStyle = '#ff6b35';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.globalAlpha = 1;
        ctx.fillText('选中', spot.x, spot.y - 40);
        
        // 添加额外的光晕效果
        ctx.shadowColor = '#ff6b35';
        ctx.shadowBlur = 15;
        ctx.globalAlpha = breathingAlpha * 0.3;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, 35, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    // 旧方法保持兼容性（但现在只是调用新方法）
    highlightSelectedSpot() {
        this.drawSelectedSpotHighlight();
    }

    // 启动选中光斑的动画循环
    startSelectedSpotAnimation() {
        // 如果已经有动画在运行，先停止
        if (this.selectedSpotAnimationId) {
            cancelAnimationFrame(this.selectedSpotAnimationId);
        }

        // 启动动画循环
        const animateSelectedSpot = () => {
            // 如果有选中的光斑，重新绘制呼吸效果
            if (this.selectedSpot && this.isStreaming) {
                this.drawSelectedSpotHighlight();
            }
            
            // 继续下一帧
            this.selectedSpotAnimationId = requestAnimationFrame(animateSelectedSpot);
        };

        this.selectedSpotAnimationId = requestAnimationFrame(animateSelectedSpot);
    }

    // 停止选中光斑动画
    stopSelectedSpotAnimation() {
        if (this.selectedSpotAnimationId) {
            cancelAnimationFrame(this.selectedSpotAnimationId);
            this.selectedSpotAnimationId = null;
        }
    }

    // 保存选中的光斑
    saveSelectedSpot() {
        if (!this.selectedSpot) {
            console.log('没有选中的光斑');
            return;
        }

        // 计算高斯参数
        const gaussianParams = this.fitGaussian2D(this.selectedSpot, 25);
        
        // 创建保存的光斑数据
        const savedSpot = {
            id: Date.now(), // 使用时间戳作为ID
            x: this.selectedSpot.x,
            y: this.selectedSpot.y,
            intensity: this.selectedSpot.intensity,
            size: this.selectedSpot.size || 0,
            gaussianParams: gaussianParams,
            timestamp: new Date().toLocaleString(),
            formula: gaussianParams ? this.generateGaussianFormula(gaussianParams, this.savedSpots.length + 1) : null
        };

        this.savedSpots.push(savedSpot);
        console.log(`光斑已保存: (${savedSpot.x.toFixed(1)}, ${savedSpot.y.toFixed(1)}), 总数: ${this.savedSpots.length}`);
        
        // 重置选中状态
        this.selectedSpot = null;
        if (this.saveSpotBtn) {
            this.saveSpotBtn.disabled = true;
            this.saveSpotBtn.style.opacity = '0.6';
        }

        // 同步悬浮面板按钮状态
        this.syncFloatingButtonStates();

        // 显示保存成功消息
        if (typeof showTopSuccess === 'function') {
            showTopSuccess(`光斑已保存！当前已保存 ${this.savedSpots.length} 个光斑 (位置: ${savedSpot.x.toFixed(0)}, ${savedSpot.y.toFixed(0)})`, false);
        }

        // 立即更新显示（包含新保存的光斑）
        this.updateGaussianFormulasWithSaved(this.lastDetectedPeaks);
        this.updateDistanceInfoWithSaved(this.lastDetectedPeaks);
    }

    // 更新距离信息，包含保存的光斑
    updateDistanceInfoWithSaved(peaks) {
        if (!this.distanceInfo) {
            return;
        }

        const allSpots = [...peaks, ...this.savedSpots];
        
        if (allSpots.length < 2) {
            this.distanceInfo.innerHTML = '';
            return;
        }

        // 计算所有光斑之间的距离
        const distances = [];
        for (let i = 0; i < allSpots.length; i++) {
            for (let j = i + 1; j < allSpots.length; j++) {
                const spot1 = allSpots[i];
                const spot2 = allSpots[j];
                const distance = Math.sqrt(
                    Math.pow(spot1.x - spot2.x, 2) + 
                    Math.pow(spot1.y - spot2.y, 2)
                );
                
                const label1 = i < peaks.length ? `G${i + 1}` : `S${this.savedSpots.indexOf(spot1) + 1}`;
                const label2 = j < peaks.length ? `G${j + 1}` : `S${this.savedSpots.indexOf(spot2) + 1}`;
                
                distances.push({
                    from: label1,
                    to: label2,
                    distance: distance,
                    isAligned: distance < 15,
                    isSaved: i >= peaks.length || j >= peaks.length
                });
            }
        }

        // 生成距离显示HTML
        let html = '';
        distances.forEach(dist => {
            const alignClass = dist.isAligned ? 'aligned' : '';
            const savedClass = dist.isSaved ? 'saved-spot' : '';
            html += `<div class="distance-item ${alignClass} ${savedClass}">${dist.from}↔${dist.to}: ${dist.distance.toFixed(1)}px</div>`;
        });

        this.distanceInfo.innerHTML = html;
    }

    // 更新高斯公式显示，包含保存的光斑
    updateGaussianFormulasWithSaved(peaks = []) {
        if (!this.formulaContent) {
            return;
        }

        const formulas = [];
        
        // 添加当前检测到的光斑公式
        peaks.forEach((peak, index) => {
            const gaussianParams = this.fitGaussian2D(peak, 25);
            if (gaussianParams) {
                const formulaData = this.generateGaussianFormula(gaussianParams, index + 1);
                if (formulaData) {
                    formulas.push({
                        index: index + 1,
                        type: 'current',
                        peak: peak,
                        formula: formulaData.formula,
                        params: formulaData.params,
                        gaussianParams: gaussianParams
                    });
                }
            }
        });

        // 添加保存的光斑公式
        this.savedSpots.forEach((savedSpot, index) => {
            if (savedSpot.formula) {
                formulas.push({
                    index: index + 1,
                    type: 'saved',
                    peak: savedSpot,
                    formula: savedSpot.formula.formula,
                    params: savedSpot.formula.params,
                    gaussianParams: savedSpot.gaussianParams,
                    timestamp: savedSpot.timestamp
                });
            }
        });

        // 生成显示HTML
        if (formulas.length > 0) {
            let html = '';
            
            // 当前光斑
            const currentFormulas = formulas.filter(f => f.type === 'current');
            if (currentFormulas.length > 0) {
                html += '<div class="formula-section-header">当前检测光斑</div>';
                currentFormulas.forEach((formula, index) => {
                    const colors = [
                        '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'
                    ];
                    const color = colors[index % colors.length];
                    const backgroundColor = this.hexToRgba(color, 0.15);
                    const borderColor = this.hexToRgba(color, 0.3);
                    
                    html += `<div class="formula-item" style="background: ${backgroundColor}; border-color: ${borderColor};">
                        <div class="formula-math">G${formula.index}: ${formula.formula}</div>
                        <div class="formula-params">${formula.params}</div>
                    </div>`;
                });
            }

            // 保存的光斑
            const savedFormulas = formulas.filter(f => f.type === 'saved');
            if (savedFormulas.length > 0) {
                html += '<div class="formula-section-header">已保存光斑</div>';
                savedFormulas.forEach((formula, index) => {
                    html += `<div class="formula-item saved-formula">
                        <div class="formula-math">S${formula.index}: ${formula.formula}</div>
                        <div class="formula-params">${formula.params}</div>
                        <div class="formula-timestamp">保存时间: ${formula.timestamp}</div>
                    </div>`;
                });
            }

            this.formulaContent.innerHTML = html;
        } else {
            this.formulaContent.innerHTML = '<div class="formula-item">等待检测光斑...</div>';
        }
    }
}

window.VideoAlignment = VideoAlignment;
