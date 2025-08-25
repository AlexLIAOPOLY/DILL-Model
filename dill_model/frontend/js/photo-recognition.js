/**
 * 照片识别功能模块
 * 实现相机调用、拍照、图像处理和向量生成
 */

class PhotoRecognition {
    constructor() {
        this.video = null;
        this.stream = null;
        this.originalImageData = null;
        this.grayscaleImageData = null;
        this.vectorData = null;
        this.isProcessing = false;
        
        // 裁剪相关属性
        this.cropData = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        this.cropActive = false;
        this.appliedCropParams = null; // 保存已应用的裁剪参数
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.lastMousePos = { x: 0, y: 0 };
    }

    /**
     * 初始化照片识别功能
     */
    init() {
        this.bindEvents();
        this.initializeElements();
        this.disableDefaultTooltips();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 安全地绑定相机控制按钮
        const startCameraBtn = document.getElementById('start-camera-btn');
        const takePhotoBtn = document.getElementById('take-photo-btn');
        const stopCameraBtn = document.getElementById('stop-camera-btn');
        
        if (startCameraBtn) startCameraBtn.addEventListener('click', () => this.startCamera());
        if (takePhotoBtn) takePhotoBtn.addEventListener('click', () => this.takePhoto());
        if (stopCameraBtn) stopCameraBtn.addEventListener('click', () => this.stopCamera());
        
        // 图片上传功能
        this.setupImageUpload();
        
        // 安全地绑定照片处理按钮
        const retakePhotoBtn = document.getElementById('retake-photo-btn');
        
        if (retakePhotoBtn) retakePhotoBtn.addEventListener('click', () => this.retakePhoto());
        
        // 安全地绑定向量生成按钮
        const generateVectorBtn = document.getElementById('generate-vector-btn');
        const applyVectorDataBtn = document.getElementById('apply-vector-data-btn');
        const previewVectorDataBtn = document.getElementById('preview-vector-data-btn');
        const exportVectorDataBtn = document.getElementById('export-vector-data-btn');
        
        if (generateVectorBtn) generateVectorBtn.addEventListener('click', () => this.generateVector());
        if (applyVectorDataBtn) applyVectorDataBtn.addEventListener('click', () => this.applyVectorData());
        if (previewVectorDataBtn) previewVectorDataBtn.addEventListener('click', () => this.previewVectorDataDetailed());
        if (exportVectorDataBtn) exportVectorDataBtn.addEventListener('click', () => this.exportVectorData());
        
        // 参数变化监听
        const coordinateUnit = document.getElementById('coordinate-unit');
        if (coordinateUnit) {
            coordinateUnit.addEventListener('change', () => this.handleUnitChange());
        }
        
        // 裁剪模式监听
        const cropMode = document.getElementById('crop-mode');
        if (cropMode) {
            cropMode.addEventListener('change', () => this.handleCropModeChange());
            
            // 初始化时检查当前选择的裁剪模式
            if (cropMode.value === 'manual') {
                // 延迟执行，确保DOM完全加载
                setTimeout(() => this.handleCropModeChange(), 500);
            }
        }
        
        // 光强值类型选择监听
        const intensityValueType = document.getElementById('intensity-value-type');
        if (intensityValueType) {
            intensityValueType.addEventListener('change', () => this.handleIntensityValueTypeChange());
            // 初始化时也要设置一次
            this.handleIntensityValueTypeChange();
        }
        
        // 标签页切换监听由main.js处理
    }

    /**
     * 初始化DOM元素
     */
    initializeElements() {
        this.video = document.getElementById('camera-video');
        
        // 设置视频流结束监听
        if (this.video) {
            this.video.addEventListener('loadedmetadata', () => {
                console.log('📹 相机视频流已就绪');
            });
        }
    }



    /**
     * 设置图片上传功能
     */
    setupImageUpload() {
        const uploadZone = document.getElementById('photo-upload-zone');
        const fileInput = document.getElementById('photo-file-input');

        if (!uploadZone || !fileInput) return;

        // 点击上传区域打开文件选择
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });

        // 文件选择事件
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImageFile(file);
            }
        });

        // 防止页面默认的拖拽行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // 拖拽上传功能
        uploadZone.addEventListener('dragenter', (e) => {
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragover', (e) => {
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', (e) => {
            // 只有当鼠标真正离开上传区域时才移除样式
            if (!uploadZone.contains(e.relatedTarget)) {
                uploadZone.classList.remove('drag-over');
            }
        });

        uploadZone.addEventListener('drop', (e) => {
            uploadZone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    this.handleImageFile(file);
                } else {
                    alert('请选择图片文件！');
                }
            }
        });
    }

    /**
     * 处理图片文件
     */
    handleImageFile(file) {
        console.log('📁 处理图片文件:', file.name);
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            alert('请选择有效的图片文件！');
            return;
        }
        
        // 检查文件大小（限制10MB）
        if (file.size > 10 * 1024 * 1024) {
            alert('图片文件过大，请选择小于10MB的图片！');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 将图片绘制到canvas获取ImageData
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // 保存图像数据
                this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                         // 显示处理结果
         this.displayUploadedPhoto(canvas);
         
         // 自动处理照片并显示参数区域
         this.processPhoto();
         
         console.log('✅ 图片文件处理完成');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    /**
     * 显示上传的图片
     */
    displayUploadedPhoto(sourceCanvas) {
        // 显示原始图像
        const originalCanvas = document.getElementById('original-photo-canvas');
        const originalCtx = originalCanvas.getContext('2d');
        
        originalCanvas.width = Math.min(sourceCanvas.width, 400);
        originalCanvas.height = (originalCanvas.width / sourceCanvas.width) * sourceCanvas.height;
        
        originalCtx.drawImage(sourceCanvas, 0, 0, originalCanvas.width, originalCanvas.height);
        
        // 生成灰度版本预览
        this.generateGrayscalePreview();
        
        // 更新预览标题
        this.updatePreviewTitle('upload');
        
        // 显示照片预览区域
        document.getElementById('photo-preview-section').style.display = 'block';
        
        // 自动滚动到预览区域
        this.scrollToPreviewSection();
        
        console.log('已显示上传的图片');
    }

    /**
     * 更新预览标题
     */
    updatePreviewTitle(inputMethod) {
        const titleElement = document.getElementById('photo-preview-title');
        if (!titleElement) return;
        
        if (inputMethod === 'camera') {
            titleElement.textContent = '拍摄结果预览';
        } else if (inputMethod === 'upload') {
            titleElement.textContent = '上传图片预览';
        } else {
            titleElement.textContent = '图片预览';
        }
    }

    /**
     * 自动滚动到预览区域
     */
    scrollToPreviewSection() {
        try {
            // 立即执行滚动，不延迟等待
            const previewSection = document.getElementById('photo-preview-section');
            if (previewSection) {
                // 获取预览区域的位置
                const elementRect = previewSection.getBoundingClientRect();
                const offsetTop = window.pageYOffset + elementRect.top;
                
                // 计算滚动位置（向上偏移一些以便更好地显示）
                const scrollTo = offsetTop - 100; // 向上偏移100px
                
                console.log('🎯 立即滚动到图片预览区域:', {
                    elementId: 'photo-preview-section',
                    offsetTop: offsetTop,
                    scrollTo: scrollTo
                });
                
                // 立即执行平滑滚动
                window.scrollTo({
                    top: Math.max(0, scrollTo), // 确保不会滚动到负数位置
                    behavior: 'smooth'
                });
                
                console.log('✅ 立即滚动到预览区域完成');
                
            } else {
                console.warn('⚠️ 未找到图片预览区域元素');
            }
            
        } catch (error) {
            console.error('❌ 滚动到预览区域失败:', error);
        }
    }



    /**
     * 启动相机
     */
    async startCamera() {
        try {
            console.log('正在启动相机...');
            this.showProcessingIndicator('正在启动相机...');

            // 请求摄像头权限
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment' // 后置摄像头
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            // 显示相机预览
            const previewSection = document.getElementById('camera-preview-section');
            if (previewSection) {
                previewSection.style.display = 'block';
            }
            
            // 更新按钮状态
            const startBtn = document.getElementById('start-camera-btn');
            const takeBtn = document.getElementById('take-photo-btn');
            const stopBtn = document.getElementById('stop-camera-btn');
            
            if (startBtn) startBtn.style.display = 'none';
            if (takeBtn) takeBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'inline-flex';

            // 更新状态图标（如果存在）
            const statusIcon = document.getElementById('camera-status-icon');
            if (statusIcon) {
                statusIcon.innerHTML = '<i class="fas fa-video" style="color: #28a745;"></i>';
            }

            this.hideProcessingIndicator();
            console.log('✅ 相机启动成功');
            
        } catch (error) {
            console.error('❌ 相机启动失败:', error);
            this.hideProcessingIndicator();
            
            let errorMessage = '无法启动相机。';
            if (error.name === 'NotAllowedError') {
                errorMessage = '相机权限被拒绝，请允许访问相机权限。';
            } else if (error.name === 'NotFoundError') {
                errorMessage = '未找到可用的相机设备。';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = '浏览器不支持相机功能。';
            }
            
            alert(errorMessage);
        }
    }

    /**
     * 拍照
     */
    takePhoto() {
        try {
            if (!this.video || !this.stream) {
                throw new Error('相机未就绪');
            }

            console.log('正在拍照...');

            // 创建canvas来捕获视频帧
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // 设置canvas尺寸
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            
            // 绘制当前视频帧到canvas
            context.drawImage(this.video, 0, 0, canvas.width, canvas.height);
            
            // 获取图像数据
            this.originalImageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
                         // 显示拍摄结果
             this.displayCapturedPhoto(canvas);
             
             // 隐藏相机预览，显示照片预览
             document.getElementById('camera-preview-section').style.display = 'none';
             document.getElementById('photo-preview-section').style.display = 'block';
             
             // 自动处理照片并显示参数区域
             this.processPhoto();
             
             console.log('✅ 拍照成功');
            
        } catch (error) {
            console.error('❌ 拍照失败:', error);
            alert('拍照失败：' + error.message);
        }
    }

    /**
     * 显示拍摄的照片
     */
    displayCapturedPhoto(sourceCanvas) {
        // 显示原始图像
        const originalCanvas = document.getElementById('original-photo-canvas');
        const originalCtx = originalCanvas.getContext('2d');
        
        originalCanvas.width = Math.min(sourceCanvas.width, 400);
        originalCanvas.height = (originalCanvas.width / sourceCanvas.width) * sourceCanvas.height;
        
        originalCtx.drawImage(sourceCanvas, 0, 0, originalCanvas.width, originalCanvas.height);
        
        // 生成灰度版本预览
        this.generateGrayscalePreview();
        
        // 更新预览标题
        this.updatePreviewTitle('camera');
        
        // 自动滚动到预览区域
        this.scrollToPreviewSection();
    }

    /**
     * 生成灰度图像预览
     */
    generateGrayscalePreview() {
        if (!this.originalImageData) return;

        const grayscaleCanvas = document.getElementById('grayscale-photo-canvas');
        const grayscaleCtx = grayscaleCanvas.getContext('2d');
        
        // 设置canvas尺寸
        const originalCanvas = document.getElementById('original-photo-canvas');
        grayscaleCanvas.width = originalCanvas.width;
        grayscaleCanvas.height = originalCanvas.height;
        
        // 创建灰度图像数据
        const grayscaleImageData = this.convertToGrayscale(this.originalImageData, 'weighted');
        
        // 创建临时canvas用于缩放
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.originalImageData.width;
        tempCanvas.height = this.originalImageData.height;
        
        tempCtx.putImageData(grayscaleImageData, 0, 0);
        
        // 缩放绘制到显示canvas
        grayscaleCtx.drawImage(tempCanvas, 0, 0, grayscaleCanvas.width, grayscaleCanvas.height);
        
        this.grayscaleImageData = grayscaleImageData;
    }

    /**
     * 彩色转灰度转换
     */
    convertToGrayscale(imageData, method = 'weighted') {
        const data = new Uint8ClampedArray(imageData.data);
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            let gray;
            
            switch (method) {
                case 'weighted':
                    // 加权平均法（推荐）
                    gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                    break;
                case 'average':
                    // 平均值法
                    gray = Math.round((r + g + b) / 3);
                    break;
                case 'luminance':
                    // 亮度法
                    gray = Math.round(0.21 * r + 0.72 * g + 0.07 * b);
                    break;
                case 'max':
                    // 最大值法
                    gray = Math.max(r, g, b);
                    break;
                default:
                    gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            }
            
            // 设置RGB为相同的灰度值，保持alpha不变
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
            // data[i + 3] = alpha保持不变
        }
        
        return new ImageData(data, imageData.width, imageData.height);
    }

    /**
     * 处理照片
     */
    processPhoto() {
        if (!this.originalImageData) {
            alert('没有可处理的图像');
            return;
        }

        console.log('🔄 开始处理照片...');
        
        // 重置裁剪状态（处理新照片时）
        this.resetCropState();
        
        // 重新生成灰度图像（使用用户选择的方法）
        const method = document.getElementById('grayscale-method').value;
        this.grayscaleImageData = this.convertToGrayscale(this.originalImageData, method);
        
        // 更新灰度预览
        const grayscaleCanvas = document.getElementById('grayscale-photo-canvas');
        const grayscaleCtx = grayscaleCanvas.getContext('2d');
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.originalImageData.width;
        tempCanvas.height = this.originalImageData.height;
        
        tempCtx.putImageData(this.grayscaleImageData, 0, 0);
        grayscaleCtx.drawImage(tempCanvas, 0, 0, grayscaleCanvas.width, grayscaleCanvas.height);
        
        // 显示处理参数区域
        document.getElementById('photo-processing-params').style.display = 'block';
        
        // 如果当前选择了自定义位置模式，初始化坐标
        const intensityValueType = document.getElementById('intensity-value-type');
        if (intensityValueType && intensityValueType.value === 'custom') {
            this.initializeCustomPosition();
        }
        
        console.log('✅ 照片处理完成');
    }

    /**
     * 生成向量数据
     */
    async generateVector() {
        if (!this.originalImageData) {
            alert('请先拍摄照片');
            return;
        }

        console.log('📊 开始生成向量数据...');
        this.showProcessingIndicator('正在发送图像到服务器处理...');

        try {
            // 获取处理参数
            const grayscaleMethod = document.getElementById('grayscale-method')?.value || 'weighted';
            const vectorDirection = document.getElementById('vector-direction')?.value || 'horizontal';
            const coordinateUnit = document.getElementById('coordinate-unit')?.value || 'pixels';
            const smoothingMethod = document.getElementById('smoothing-method')?.value || 'none';
            const cropMode = document.getElementById('crop-mode')?.value || 'none';
            // 根据选择的光强值类型计算等效的最大光强值
            const maxIntensityValue = this.calculateEffectiveMaxIntensity();
            
            // 单位转换逻辑：定义1像素对应的物理长度
            let scaleFactor = 0.1; // 默认：1像素 = 0.1毫米
            
            if (coordinateUnit === 'custom') {
                scaleFactor = parseFloat(document.getElementById('scale-factor')?.value) || 0.1;
            } else if (coordinateUnit === 'mm') {
                // 1像素 = 0.1毫米（可根据实际设备调整）
                scaleFactor = 0.1;
            } else if (coordinateUnit === 'um') {
                // 1像素 = 100微米（0.1毫米 = 100微米）
                scaleFactor = 100;
            } else if (coordinateUnit === 'pixels') {
                // 保持像素单位
                scaleFactor = 1;
            }
            
            console.log(`📏 单位转换设置: ${coordinateUnit}, scaleFactor=${scaleFactor}`);
            
            console.log('📊 处理参数:', {
                grayscaleMethod,
                vectorDirection,
                coordinateUnit,
                smoothingMethod,
                cropMode,
                scaleFactor,
                maxIntensityValue
            });
            
            // 验证图像数据
            if (!this.originalImageData || !this.grayscaleImageData) {
                throw new Error('图像数据不完整，请重新拍摄或上传图片');
            }
            
            console.log('📋 当前图像数据状态:', {
                原始图像: {
                    width: this.originalImageData.width,
                    height: this.originalImageData.height,
                    dataSize: this.originalImageData.data.length
                },
                灰度图像: {
                    width: this.grayscaleImageData.width,
                    height: this.grayscaleImageData.height,
                    dataSize: this.grayscaleImageData.data.length
                }
            });
            
            // 将图像数据转换为base64
            const imageDataUrl = this.imageDataToBase64(this.originalImageData);
            
            // 检查裁剪状态
            let actualCropMode = cropMode;
            let cropParams = null;
            
            if (cropMode === 'manual') {
                // 检查是否已经应用了裁剪
                if (this.appliedCropParams && this.appliedCropParams.applied) {
                    console.log('🎯 使用前端已裁剪的图像数据，后端无需再裁剪');
                    actualCropMode = 'none'; // 告诉后端不要裁剪
                    cropParams = null;
                } else {
                    // 如果没有应用裁剪，传递裁剪参数给后端处理
                    cropParams = this.getCropParameters();
                    if (!cropParams) {
                        alert('请在灰度预览图上设置裁剪区域');
                        return;
                    }
                    console.log('🎯 传递裁剪参数给后端处理:', cropParams);
                }
            }
            
            // 获取光强类型相关参数
            const intensityValueType = document.getElementById('intensity-value-type')?.value || 'max';
            const centerIntensityValue = parseFloat(document.getElementById('center-intensity-value')?.value) || 1.0;
            const customIntensityValue = parseFloat(document.getElementById('custom-intensity-value')?.value) || 1.0;
            const customPositionX = parseInt(document.getElementById('custom-position-x')?.value) || 0;
            const customPositionY = parseInt(document.getElementById('custom-position-y')?.value) || 0;
            
            // 准备请求数据
            const requestData = {
                image_data: imageDataUrl,
                grayscale_method: grayscaleMethod,
                vector_direction: vectorDirection,
                coordinate_unit: coordinateUnit,
                scale_factor: scaleFactor,
                smoothing_method: smoothingMethod,
                crop_mode: actualCropMode, // 使用修正后的裁剪模式
                max_intensity_value: maxIntensityValue,
                crop_params: cropParams,
                // 新增光强类型参数
                intensity_value_type: intensityValueType,
                center_intensity_value: centerIntensityValue,
                custom_intensity_value: customIntensityValue,
                custom_position_x: customPositionX,
                custom_position_y: customPositionY
            };
            
            console.log('🔄 发送处理请求到后端...', {
                grayscale_method: grayscaleMethod,
                vector_direction: vectorDirection,
                coordinate_unit: coordinateUnit,
                scale_factor: scaleFactor,
                max_intensity_value: maxIntensityValue
            });
            
            // 发送到后端处理
            const response = await fetch('/api/process-photo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`服务器响应错误: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || '后端处理失败');
            }
            
            // 保存向量数据
            this.vectorData = {
                x: result.vector_data.x,
                intensity: result.vector_data.intensity,
                method: 'photo-recognition',
                parameters: {
                    grayscaleMethod: grayscaleMethod,
                    vectorDirection: vectorDirection,
                    coordinateUnit: coordinateUnit,
                    smoothing: smoothingMethod,
                    // 将用于坐标生成的缩放因子一并保存，供后续单位换算参考
                    scaleFactor: scaleFactor,
                    // 新增光强类型参数
                    intensityValueType: intensityValueType
                },
                metadata: result.metadata
            };
            
            // 验证坐标范围的合理性
            this.validateCoordinateRange(result.vector_data.x, coordinateUnit);
            
            console.log('✅ 后端处理完成:', result.metadata);
            
            // 显示向量预览
            this.displayVectorPreview();
            
            this.hideProcessingIndicator();
            console.log('✅ 向量数据生成完成');
            
        } catch (error) {
            console.error('❌ 向量生成失败:', error);
            this.hideProcessingIndicator();
            alert('向量生成失败：' + error.message);
        }
    }

    /**
     * 将ImageData转换为base64格式 - 增强版
     */
    imageDataToBase64(imageData) {
        try {
            // 创建临时canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            
            console.log('📷 图像数据转换:', {
                width: imageData.width,
                height: imageData.height,
                dataLength: imageData.data.length
            });
            
            // 将ImageData绘制到canvas
            ctx.putImageData(imageData, 0, 0);
            
            // 转换为base64，使用高质量
            const base64Data = canvas.toDataURL('image/png', 1.0);
            
            console.log('✅ base64转换成功，数据长度:', base64Data.length);
            
            return base64Data;
            
        } catch (error) {
            console.error('❌ ImageData转base64失败:', error);
            throw new Error('图像数据转换失败: ' + error.message);
        }
    }

    /**
     * 从图像中提取向量数据
     */
    extractVectorFromImage(imageData, direction) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        let vector = [];

        switch (direction) {
            case 'horizontal':
                // 水平方向：沿中间行提取
                const middleRow = Math.floor(height / 2);
                for (let x = 0; x < width; x++) {
                    const index = (middleRow * width + x) * 4;
                    const grayValue = data[index]; // R通道值（灰度图中RGB相同）
                    vector.push(grayValue / 255); // 归一化到0-1
                }
                break;
                
            case 'vertical':
                // 垂直方向：沿中间列提取
                const middleCol = Math.floor(width / 2);
                for (let y = 0; y < height; y++) {
                    const index = (y * width + middleCol) * 4;
                    const grayValue = data[index];
                    vector.push(grayValue / 255);
                }
                break;
                
            case 'center-line':
                // 中心线提取：对角线平均
                const diagonal1 = [];
                const diagonal2 = [];
                
                for (let i = 0; i < Math.min(width, height); i++) {
                    // 主对角线
                    const index1 = (i * width + i) * 4;
                    diagonal1.push(data[index1] / 255);
                    
                    // 副对角线
                    const index2 = (i * width + (width - 1 - i)) * 4;
                    diagonal2.push(data[index2] / 255);
                }
                
                // 取对角线平均值
                for (let i = 0; i < diagonal1.length; i++) {
                    vector.push((diagonal1[i] + diagonal2[i]) / 2);
                }
                break;
        }

        return vector;
    }

    /**
     * 验证坐标范围的合理性
     */
    validateCoordinateRange(coordinates, unit) {
        if (!coordinates || coordinates.length === 0) {
            console.warn('⚠️ 坐标数据为空');
            return false;
        }
        
        const range = Math.max(...coordinates) - Math.min(...coordinates);
        const dataPoints = coordinates.length;
        let isValid = true;
        let warningMessage = '';
        
        // 根据不同单位设定合理范围
        switch (unit) {
            case 'mm':
                if (range < 0.01) {
                    warningMessage = `毫米单位坐标范围过小: ${range.toFixed(4)}mm，可能缩放因子设置过小`;
                    isValid = false;
                } else if (range > 1000) {
                    warningMessage = `毫米单位坐标范围过大: ${range.toFixed(2)}mm，可能缩放因子设置过大`;
                    isValid = false;
                }
                break;
                
            case 'um':
                if (range < 1) {
                    warningMessage = `微米单位坐标范围过小: ${range.toFixed(4)}μm，可能缩放因子设置过小`;
                    isValid = false;
                } else if (range > 1000000) {
                    warningMessage = `微米单位坐标范围过大: ${range.toFixed(0)}μm，可能缩放因子设置过大`;
                    isValid = false;
                }
                break;
                
            case 'pixels':
                if (range < 10) {
                    warningMessage = `像素单位坐标范围过小: ${range.toFixed(0)}像素`;
                } else if (range > 10000) {
                    warningMessage = `像素单位坐标范围过大: ${range.toFixed(0)}像素`;
                }
                break;
                
            case 'custom':
                // 自定义单位不做严格验证，只提供信息
                console.log(`📏 自定义单位坐标范围: ${range.toFixed(4)}, 数据点: ${dataPoints}`);
                return true;
        }
        
        if (!isValid) {
            console.warn(`⚠️ ${warningMessage}`);
            // 可以选择是否向用户显示警告
            this.showUnitWarning(warningMessage, unit, range);
        } else {
            console.log(`✅ 单位验证通过: ${unit}, 范围=${range.toFixed(3)}, 数据点=${dataPoints}`);
        }
        
        return isValid;
    }
    
    /**
     * 显示单位警告信息
     */
    showUnitWarning(message, unit, range) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'unit-warning';
        warningDiv.style.cssText = `
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            font-size: 14px;
        `;
        warningDiv.innerHTML = `
            <strong>⚠️ 单位转换警告:</strong><br>
            ${message}<br>
            <small>建议检查图像比例设置或选择合适的单位</small>
        `;
        
        // 在向量预览区域显示警告
        const previewSection = document.getElementById('vector-preview-section');
        if (previewSection) {
            // 移除之前的警告
            const existingWarning = previewSection.querySelector('.unit-warning');
            if (existingWarning) {
                existingWarning.remove();
            }
            previewSection.insertBefore(warningDiv, previewSection.firstChild);
            
            // 5秒后自动隐藏警告
            setTimeout(() => {
                if (warningDiv.parentNode) {
                    warningDiv.remove();
                }
            }, 8000);
        }
    }
    
    /**
     * 注意：坐标生成现在统一在后端处理，前端只负责设置scaleFactor参数
     * 这样确保前后端逻辑一致，避免重复计算和潜在的不一致问题
     */

    /**
     * 应用数据平滑
     */
    applySmoothing(data, method) {
        switch (method) {
            case 'gaussian':
                return this.gaussianSmooth(data, 2);
            case 'moving-average':
                return this.movingAverageSmooth(data, 3);
            default:
                return data;
        }
    }

    /**
     * 高斯平滑
     */
    gaussianSmooth(data, sigma) {
        const size = Math.ceil(sigma * 3) * 2 + 1;
        const kernel = this.generateGaussianKernel(size, sigma);
        return this.convolve(data, kernel);
    }

    /**
     * 生成高斯核
     */
    generateGaussianKernel(size, sigma) {
        const kernel = [];
        const center = Math.floor(size / 2);
        let sum = 0;
        
        for (let i = 0; i < size; i++) {
            const x = i - center;
            const value = Math.exp(-(x * x) / (2 * sigma * sigma));
            kernel.push(value);
            sum += value;
        }
        
        // 归一化
        return kernel.map(value => value / sum);
    }

    /**
     * 移动平均平滑
     */
    movingAverageSmooth(data, windowSize) {
        const smoothed = [];
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let i = 0; i < data.length; i++) {
            let sum = 0;
            let count = 0;
            
            for (let j = -halfWindow; j <= halfWindow; j++) {
                const index = i + j;
                if (index >= 0 && index < data.length) {
                    sum += data[index];
                    count++;
                }
            }
            
            smoothed.push(sum / count);
        }
        
        return smoothed;
    }

    /**
     * 一维卷积
     */
    convolve(data, kernel) {
        const result = [];
        const kernelCenter = Math.floor(kernel.length / 2);
        
        for (let i = 0; i < data.length; i++) {
            let sum = 0;
            
            for (let j = 0; j < kernel.length; j++) {
                const dataIndex = i + j - kernelCenter;
                if (dataIndex >= 0 && dataIndex < data.length) {
                    sum += data[dataIndex] * kernel[j];
                }
            }
            
            result.push(sum);
        }
        
        return result;
    }

    /**
     * 显示向量预览
     */
    displayVectorPreview() {
        if (!this.vectorData) return;

        const canvas = document.getElementById('vector-preview-canvas');
        if (!canvas) {
            console.error('❌ 向量预览canvas元素未找到');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ 无法获取canvas上下文');
            return;
        }
        
        // 获取容器的CSS尺寸并设置实际尺寸
        const container = canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        // 使用容器宽度，确保图表占满容器
        const targetWidth = Math.max(containerRect.width - 40, 800); // 减去padding
        const targetHeight = 400;
        
        const dpr = window.devicePixelRatio || 1;
        
        // 设置canvas的实际像素尺寸（考虑设备像素比）
        canvas.width = targetWidth * dpr;
        canvas.height = targetHeight * dpr;
        
        // 缩放canvas上下文以匹配设备像素比
        ctx.scale(dpr, dpr);
        
        // 设置canvas的CSS尺寸
        canvas.style.width = targetWidth + 'px';
        canvas.style.height = targetHeight + 'px';
        
        // 清空canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制向量数据 (使用CSS尺寸进行绘制计算)
        this.drawVectorChart(ctx, this.vectorData.x, this.vectorData.intensity, targetWidth, targetHeight);
        
        // 更新统计信息
        const countElement = document.getElementById('vector-data-count');
        if (countElement) {
            countElement.textContent = `数据点: ${this.vectorData.x.length}`;
        }
        
        // 显示向量预览区域
        const previewSection = document.getElementById('vector-preview-section');
        if (previewSection) {
            previewSection.style.display = 'block';
        }
        
        // 添加图表交互功能
        this.setupChartInteractions(canvas);
        
        console.log('📊 向量预览显示完成');
    }
    
    /**
     * 设置图表交互功能
     */
    setupChartInteractions(canvas) {
        if (!canvas) return;
        
        // 添加点击放大功能
        canvas.addEventListener('click', (e) => {
            this.showChartZoom(canvas);
        });
        
        // 添加鼠标悬停效果
        canvas.addEventListener('mouseenter', () => {
            canvas.style.cursor = 'zoom-in';
        });
        
        canvas.addEventListener('mouseleave', () => {
            canvas.style.cursor = 'crosshair';
        });
    }
    
    /**
     * 显示图表放大视图
     */
    showChartZoom(sourceCanvas) {
        // 创建放大覆盖层
        const overlay = document.createElement('div');
        overlay.className = 'chart-zoom-overlay';
        overlay.style.display = 'flex';
        
        const container = document.createElement('div');
        container.className = 'chart-zoom-container';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'chart-zoom-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => {
            overlay.remove();
        };
        
        // 创建放大的canvas
        const zoomedCanvas = document.createElement('canvas');
        const ctx = zoomedCanvas.getContext('2d');
        
        // 设置放大canvas的尺寸
        const maxWidth = Math.min(window.innerWidth * 0.8, 1200);
        const maxHeight = Math.min(window.innerHeight * 0.8, 800);
        const aspectRatio = sourceCanvas.width / sourceCanvas.height;
        
        if (maxWidth / maxHeight > aspectRatio) {
            zoomedCanvas.width = maxHeight * aspectRatio;
            zoomedCanvas.height = maxHeight;
        } else {
            zoomedCanvas.width = maxWidth;
            zoomedCanvas.height = maxWidth / aspectRatio;
        }
        
        zoomedCanvas.style.width = zoomedCanvas.width + 'px';
        zoomedCanvas.style.height = zoomedCanvas.height + 'px';
        
        // 重新绘制高分辨率图表
        const dpr = window.devicePixelRatio || 1;
        zoomedCanvas.width = zoomedCanvas.width * dpr;
        zoomedCanvas.height = zoomedCanvas.height * dpr;
        ctx.scale(dpr, dpr);
        
        if (this.vectorData) {
            this.drawVectorChart(ctx, this.vectorData.x, this.vectorData.intensity, 
                                zoomedCanvas.width / dpr, zoomedCanvas.height / dpr);
        }
        
        container.appendChild(closeBtn);
        container.appendChild(zoomedCanvas);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
        
        // 点击覆盖层关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    /**
     * 绘制向量图表 - 增强版美化设计
     */
    drawVectorChart(ctx, xData, yData, width, height) {
        const padding = 60;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        // 计算数据范围
        const xMin = Math.min(...xData);
        const xMax = Math.max(...xData);
        const yMin = Math.min(...yData);
        const yMax = Math.max(...yData);
        
        // 增加一些边距让数据线不贴边
        const xRange = xMax - xMin;
        const yRange = yMax - yMin;
        const xMargin = xRange * 0.02;
        const yMargin = yRange * 0.05;
        const xMinPadded = xMin - xMargin;
        const xMaxPadded = xMax + xMargin;
        const yMinPadded = Math.max(0, yMin - yMargin);
        const yMaxPadded = yMax + yMargin;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 1. 绘制背景渐变
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, '#fafbfc');
        bgGradient.addColorStop(1, '#f8f9fa');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        
        // 2. 绘制图表区域背景
        const chartBgGradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        chartBgGradient.addColorStop(0, '#ffffff');
        chartBgGradient.addColorStop(1, '#f8f9fa');
        ctx.fillStyle = chartBgGradient;
        ctx.fillRect(padding, padding, chartWidth, chartHeight);
        
        // 3. 绘制网格线
        this.drawGrid(ctx, padding, chartWidth, chartHeight, width, height);
        
        // 4. 绘制坐标轴
        this.drawAxes(ctx, padding, chartWidth, chartHeight, width, height);
        
        // 5. 绘制数据区域填充（渐变）
        this.drawDataArea(ctx, xData, yData, xMinPadded, xMaxPadded, yMinPadded, yMaxPadded, 
                          padding, chartWidth, chartHeight, height);
        
        // 6. 绘制主数据线
        this.drawDataLine(ctx, xData, yData, xMinPadded, xMaxPadded, yMinPadded, yMaxPadded, 
                          padding, chartWidth, chartHeight, height);
        
        // 7. 绘制数据点
        this.drawDataPoints(ctx, xData, yData, xMinPadded, xMaxPadded, yMinPadded, yMaxPadded, 
                           padding, chartWidth, chartHeight, height);
        
        // 8. 绘制光强标记点（新增）
        this.drawIntensityMarkers(ctx, xData, yData, xMinPadded, xMaxPadded, yMinPadded, yMaxPadded, 
                                 padding, chartWidth, chartHeight, height);
        
        // 9. 绘制刻度和标签
        this.drawTicksAndLabels(ctx, xMinPadded, xMaxPadded, yMinPadded, yMaxPadded, 
                               padding, chartWidth, chartHeight, width, height);
        
        // 10. 绘制标题和轴标签
        this.drawChartLabels(ctx, width, height, padding);
    }
    
    /**
     * 绘制网格线
     */
    drawGrid(ctx, padding, chartWidth, chartHeight, width, height) {
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 2]);
        
        // 垂直网格线
        const verticalLines = 10;
        for (let i = 1; i < verticalLines; i++) {
            const x = padding + (chartWidth / verticalLines) * i;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }
        
        // 水平网格线
        const horizontalLines = 8;
        for (let i = 1; i < horizontalLines; i++) {
            const y = padding + (chartHeight / horizontalLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }
    
    /**
     * 绘制坐标轴
     */
    drawAxes(ctx, padding, chartWidth, chartHeight, width, height) {
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 2;
        
        // X轴
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Y轴
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();
        
        // 添加轴箭头
        ctx.fillStyle = '#495057';
        
        // X轴箭头
        ctx.beginPath();
        ctx.moveTo(width - padding, height - padding);
        ctx.lineTo(width - padding - 8, height - padding - 4);
        ctx.lineTo(width - padding - 8, height - padding + 4);
        ctx.closePath();
        ctx.fill();
        
        // Y轴箭头
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding - 4, padding + 8);
        ctx.lineTo(padding + 4, padding + 8);
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * 绘制数据区域填充
     */
    drawDataArea(ctx, xData, yData, xMin, xMax, yMin, yMax, padding, chartWidth, chartHeight, height) {
        if (xData.length < 2) return;
        
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.15)');
        gradient.addColorStop(0.5, 'rgba(52, 152, 219, 0.08)');
        gradient.addColorStop(1, 'rgba(52, 152, 219, 0.02)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        
        // 起始点
        const startX = padding + ((xData[0] - xMin) / (xMax - xMin)) * chartWidth;
        const startY = height - padding - ((yData[0] - yMin) / (yMax - yMin)) * chartHeight;
        ctx.moveTo(startX, height - padding);
        ctx.lineTo(startX, startY);
        
        // 绘制数据线
        for (let i = 0; i < xData.length; i++) {
            const x = padding + ((xData[i] - xMin) / (xMax - xMin)) * chartWidth;
            const y = height - padding - ((yData[i] - yMin) / (yMax - yMin)) * chartHeight;
            ctx.lineTo(x, y);
        }
        
        // 闭合到X轴
        const endX = padding + ((xData[xData.length - 1] - xMin) / (xMax - xMin)) * chartWidth;
        ctx.lineTo(endX, height - padding);
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * 绘制主数据线
     */
    drawDataLine(ctx, xData, yData, xMin, xMax, yMin, yMax, padding, chartWidth, chartHeight, height) {
        if (xData.length < 2) return;
        
        // 主线条渐变
        const lineGradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        lineGradient.addColorStop(0, '#2980b9');
        lineGradient.addColorStop(0.5, '#3498db');
        lineGradient.addColorStop(1, '#5dade2');
        
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // 添加阴影效果
        ctx.shadowColor = 'rgba(52, 152, 219, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        
        ctx.beginPath();
        for (let i = 0; i < xData.length; i++) {
            const x = padding + ((xData[i] - xMin) / (xMax - xMin)) * chartWidth;
            const y = height - padding - ((yData[i] - yMin) / (yMax - yMin)) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // 重置阴影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
    }
    
    /**
     * 绘制数据点
     */
    drawDataPoints(ctx, xData, yData, xMin, xMax, yMin, yMax, padding, chartWidth, chartHeight, height) {
        // 只在数据点不太多时绘制点
        if (xData.length > 100) return;
        
        for (let i = 0; i < xData.length; i++) {
            const x = padding + ((xData[i] - xMin) / (xMax - xMin)) * chartWidth;
            const y = height - padding - ((yData[i] - yMin) / (yMax - yMin)) * chartHeight;
            
            // 外圈
            ctx.fillStyle = '#2980b9';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
            
            // 内圈
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    /**
     * 绘制刻度和标签
     */
    drawTicksAndLabels(ctx, xMin, xMax, yMin, yMax, padding, chartWidth, chartHeight, width, height) {
        ctx.fillStyle = '#495057';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        
        // X轴刻度
        const xTicks = 6;
        for (let i = 0; i <= xTicks; i++) {
            const x = padding + (chartWidth / xTicks) * i;
            const value = xMin + ((xMax - xMin) / xTicks) * i;
            
            // 刻度线
            ctx.strokeStyle = '#495057';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, height - padding);
            ctx.lineTo(x, height - padding + 6);
            ctx.stroke();
            
            // 刻度标签
            ctx.textAlign = 'center';
            ctx.fillText(value.toFixed(2), x, height - padding + 20);
        }
        
        // Y轴刻度
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const y = height - padding - (chartHeight / yTicks) * i;
            const value = yMin + ((yMax - yMin) / yTicks) * i;
            
            // 刻度线
            ctx.strokeStyle = '#495057';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding - 6, y);
            ctx.lineTo(padding, y);
            ctx.stroke();
            
            // 刻度标签
            ctx.textAlign = 'right';
            ctx.fillText(value.toFixed(3), padding - 10, y + 4);
        }
    }
    
    /**
     * 绘制光强标记点 - 标记用户选择的光强位置
     */
    drawIntensityMarkers(ctx, xData, yData, xMin, xMax, yMin, yMax, padding, chartWidth, chartHeight, height) {
        // 如果后端没有返回intensity_marker数据，使用备用方案
        if (!this.vectorData || !this.vectorData.metadata || !this.vectorData.metadata.intensity_marker) {
            this.drawIntensityMarkersFallback(ctx, xData, yData, xMin, xMax, yMin, yMax, padding, chartWidth, chartHeight, height);
            return;
        }
        
        const markerInfo = this.vectorData.metadata.intensity_marker;
        
        // 如果标记信息无效，跳过绘制
        if (!markerInfo.is_valid) {
            console.warn('⚠️ 光强标记信息无效，跳过绘制');
            return;
        }
        
        // 获取标记点的坐标和数值
        const markerIndex = markerInfo.position.index;
        const markerX = xData[markerIndex];
        const markerY = yData[markerIndex];
        const markerValue = markerInfo.user_value;
        const actualValue = markerInfo.actual_value;
        
        // 根据类型设置标签和颜色
        let markerLabel, markerColor;
        switch (markerInfo.type) {
            case 'max':
                markerLabel = '最大光强';
                markerColor = '#e74c3c';
                break;
            case 'center':
                markerLabel = '中心点';
                markerColor = '#f39c12';
                break;
            case 'custom':
                markerLabel = '自定义位置';
                markerColor = '#9b59b6';
                break;
            default:
                markerLabel = '光强标记';
                markerColor = '#3498db';
        }
        
        // 计算标记点在画布上的位置
        const canvasX = padding + ((markerX - xMin) / (xMax - xMin)) * chartWidth;
        const canvasY = height - padding - ((markerY - yMin) / (yMax - yMin)) * chartHeight;
        
        // 绘制标记点
        ctx.save();
        
        // 绘制外圈（强调）
        ctx.strokeStyle = markerColor;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // 绘制内圈
        ctx.fillStyle = markerColor;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // 绘制标记线（从点向下延伸到X轴）
        ctx.strokeStyle = markerColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(canvasX, canvasY);
        ctx.lineTo(canvasX, height - padding);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 绘制标签
        const labelY = canvasY - 20;
        const labelText = `${markerLabel}: ${markerValue.toFixed(3)}`;
        
        // 绘制标签背景
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const textMetrics = ctx.measureText(labelText);
        const labelWidth = textMetrics.width + 8;
        const labelHeight = 18;
        const labelX = canvasX - labelWidth / 2;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = markerColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(labelX, labelY - labelHeight/2, labelWidth, labelHeight);
        ctx.fill();
        ctx.stroke();
        
        // 绘制标签文字
        ctx.fillStyle = markerColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, canvasX, labelY);
        
        ctx.restore();
        
        console.log('✨ 绘制光强标记:', {
            类型: markerInfo.type,
            标签: markerLabel,
            坐标: `(${markerX.toFixed(3)}, ${markerY.toFixed(3)})`,
            用户设定值: markerValue,
            实际测量值: actualValue.toFixed(3),
            画布位置: `(${canvasX.toFixed(1)}, ${canvasY.toFixed(1)})`,
            位置描述: markerInfo.coordinates_description
        });
    }
    
    /**
     * 备用方案：基于前端数据直接绘制光强标记
     */
    drawIntensityMarkersFallback(ctx, xData, yData, xMin, xMax, yMin, yMax, padding, chartWidth, chartHeight, height) {
        if (!this.vectorData || !xData || !yData) return;
        
        // 获取当前选择的光强值类型
        const intensityValueType = document.getElementById('intensity-value-type')?.value || 'max';
        
        let markerX, markerY, markerValue, markerLabel, markerColor, markerIndex;
        
        switch (intensityValueType) {
            case 'max':
                // 找到最大光强值的位置
                markerIndex = yData.indexOf(Math.max(...yData));
                markerX = xData[markerIndex];
                markerY = yData[markerIndex];
                markerValue = parseFloat(document.getElementById('max-intensity-value')?.value) || 1.0;
                markerLabel = '最大光强';
                markerColor = '#e74c3c';
                break;
                
            case 'center':
                // 使用数据中心点
                markerIndex = Math.floor(xData.length / 2);
                markerX = xData[markerIndex];
                markerY = yData[markerIndex];
                markerValue = parseFloat(document.getElementById('center-intensity-value')?.value) || 1.0;
                markerLabel = '中心点';
                markerColor = '#f39c12';
                break;
                
            case 'custom':
                // 自定义位置（需要找到最接近的数据点）
                const customValue = parseFloat(document.getElementById('custom-intensity-value')?.value) || 1.0;
                const customX = parseInt(document.getElementById('custom-position-x')?.value) || 0;
                const customY = parseInt(document.getElementById('custom-position-y')?.value) || 0;
                
                // 找到最接近自定义坐标的数据点
                markerIndex = 0;
                let minDistance = Infinity;
                const scaleFactor = this.vectorData.parameters?.scaleFactor || 1;
                for (let i = 0; i < xData.length; i++) {
                    const distance = Math.abs(xData[i] - (customX * scaleFactor));
                    if (distance < minDistance) {
                        minDistance = distance;
                        markerIndex = i;
                    }
                }
                
                markerX = xData[markerIndex];
                markerY = yData[markerIndex];
                markerValue = customValue;
                markerLabel = '自定义位置';
                markerColor = '#9b59b6';
                break;
                
            default:
                console.warn('⚠️ 未知的光强值类型:', intensityValueType);
                return; // 未知类型，不绘制标记
        }
        
        // 计算标记点在画布上的位置
        const canvasX = padding + ((markerX - xMin) / (xMax - xMin)) * chartWidth;
        const canvasY = height - padding - ((markerY - yMin) / (yMax - yMin)) * chartHeight;
        
        // 绘制标记点
        ctx.save();
        
        // 绘制外圈（强调）
        ctx.strokeStyle = markerColor;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // 绘制内圈
        ctx.fillStyle = markerColor;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // 绘制标记线（从点向下延伸到X轴）
        ctx.strokeStyle = markerColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(canvasX, canvasY);
        ctx.lineTo(canvasX, height - padding);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 绘制标签
        const labelY = canvasY - 20;
        const labelText = `${markerLabel}: ${markerValue.toFixed(3)}`;
        
        // 绘制标签背景
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const textMetrics = ctx.measureText(labelText);
        const labelWidth = textMetrics.width + 8;
        const labelHeight = 18;
        const labelX = canvasX - labelWidth / 2;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = markerColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(labelX, labelY - labelHeight/2, labelWidth, labelHeight);
        ctx.fill();
        ctx.stroke();
        
        // 绘制标签文字
        ctx.fillStyle = markerColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, canvasX, labelY);
        
        ctx.restore();
        
        console.log('✨ 备用方案绘制光强标记:', {
            类型: intensityValueType,
            标签: markerLabel,
            坐标: `(${markerX.toFixed(3)}, ${markerY.toFixed(3)})`,
            用户设定值: markerValue,
            实际测量值: markerY.toFixed(3),
            画布位置: `(${canvasX.toFixed(1)}, ${canvasY.toFixed(1)})`,
            数据索引: markerIndex
        });
    }
    
    /**
     * 绘制图表标签
     */
    drawChartLabels(ctx, width, height, padding) {
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        
        // 主标题
        ctx.fillText('生成的向量数据', width / 2, 25);
        
        // X轴标签
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#495057';
        ctx.fillText('坐标位置', width / 2, height - 8);
        
        // Y轴标签
        ctx.save();
        ctx.translate(18, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('光强度', 0, 0);
        ctx.restore();
    }
    


    /**
     * 预览向量数据
     */
    previewVector() {
        if (!this.vectorData) {
            alert('请先生成向量数据');
            return;
        }

        // 在控制台输出详细信息
        console.log('📊 向量数据预览:', {
            points: this.vectorData.x.length,
            xRange: [Math.min(...this.vectorData.x), Math.max(...this.vectorData.x)],
            intensityRange: [Math.min(...this.vectorData.intensity), Math.max(...this.vectorData.intensity)],
            parameters: this.vectorData.parameters
        });

        // 显示详细信息弹窗
        const intensityMin = Math.min(...this.vectorData.intensity);
        const intensityMax = Math.max(...this.vectorData.intensity);
        const info = `
向量数据信息：
• 数据点数：${this.vectorData.x.length}
• X坐标范围：${Math.min(...this.vectorData.x).toFixed(3)} 到 ${Math.max(...this.vectorData.x).toFixed(3)}
• 光强度范围：${intensityMin.toFixed(3)} 到 ${intensityMax.toFixed(3)}
• 最亮点光强：${intensityMax.toFixed(3)}
• 灰度方法：${this.vectorData.parameters.grayscaleMethod}
• 提取方向：${this.vectorData.parameters.vectorDirection}
• 坐标单位：${this.vectorData.parameters.coordinateUnit}
• 平滑处理：${this.vectorData.parameters.smoothing}
        `.trim();

        alert(info);
    }

    /**
     * 详细预览向量数据（新增功能）
     */
    previewVectorDataDetailed() {
        if (!this.vectorData) {
            alert('请先生成向量数据');
            return;
        }

        console.log('📊 显示详细向量数据预览...');

        try {
            // 显示预览区域
            const previewSection = document.getElementById('vector-data-preview-section');
            if (!previewSection) {
                console.error('❌ 向量数据预览区域元素未找到');
                return;
            }

            // 更新数据统计
            const dataCountElement = document.getElementById('preview-data-count');
            if (dataCountElement) {
                dataCountElement.textContent = `${this.vectorData.x.length} 个数据点`;
            }

            // 填充数据表格
            this.populateDataTable();

            // 显示预览区域
            previewSection.style.display = 'block';

            // 滚动到预览区域
            previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

            console.log('✅ 详细向量数据预览显示完成');

        } catch (error) {
            console.error('❌ 显示向量数据预览失败:', error);
            alert('预览数据失败：' + error.message);
        }
    }


    /**
     * 填充数据表格
     */
    populateDataTable() {
        if (!this.vectorData) return;

        const tbody = document.getElementById('vector-data-tbody');
        if (!tbody) {
            console.error('❌ 数据表格元素未找到');
            return;
        }

        // 清空现有内容
        tbody.innerHTML = '';

        const xData = this.vectorData.x;
        const intensityData = this.vectorData.intensity;

        // 显示所有数据，不再省略
        const dataLength = xData.length;

        // 生成所有数据行
        for (let i = 0; i < dataLength; i++) {
            const row = document.createElement('tr');
            row.className = 'data-row';
            
            row.innerHTML = `
                <td>${i + 1}</td>
                <td>${xData[i].toFixed(6)}</td>
                <td>${intensityData[i].toFixed(6)}</td>
            `;
            
            tbody.appendChild(row);
        }

        console.log(`📊 数据表格填充完成，显示 ${dataLength} 行数据`);
    }

    /**
     * 应用向量数据到系统
     */
    applyVectorData() {
        if (!this.vectorData) {
            alert('请先生成向量数据');
            return;
        }

        try {
            console.log('🔄 应用向量数据到系统...');
            
                         // 调用全局函数来设置自定义光强数据
             if (typeof window.setCustomIntensityData === 'function') {
                 // 转换数据格式为主系统期望的格式
                 const formattedData = {
                     x: this.vectorData.x,
                     intensity: this.vectorData.intensity,
                     source: 'photo-recognition',
                     fileName: 'photo_vector_data.csv',
                     x_unit: this.vectorData.parameters.coordinateUnit || 'pixels',
                     x_range: [Math.min(...this.vectorData.x), Math.max(...this.vectorData.x)],
                     auto_detected: true,
                     outside_range_mode: 'zero',
                     custom_intensity_value: 0,
                     parameters: this.vectorData.parameters
                 };
                 
                                 window.setCustomIntensityData(formattedData);
                
                // 不再自动切换标签页，让用户停留在照片识别页面
                // 静默应用，不显示弹窗
                console.log('✅ 向量数据应用成功 - 已静默应用到系统');
                
                // 立即滚动到抗反射薄膜部分
                this.scrollToArcSection();
                
            } else {
                throw new Error('系统接口不可用');
            }
            
        } catch (error) {
            console.error('❌ 应用向量数据失败:', error);
            alert('应用向量数据失败：' + error.message);
        }
    }
    
    /**
     * 平滑滚动到抗反射薄膜(ARC)部分
     */
    scrollToArcSection() {
        try {
            console.log('🎯 开始滚动到抗反射薄膜部分...');
            
            // 先尝试定位抗反射薄膜选择框
            let targetElement = document.getElementById('arc_material');
            
            if (!targetElement) {
                // 如果找不到，尝试根据文本内容查找
                const allElements = document.querySelectorAll('.parameter-name');
                for (const element of allElements) {
                    if (element.textContent.includes('抗反射薄膜') || element.textContent.includes('ARC')) {
                        targetElement = element.closest('.parameter-item');
                        break;
                    }
                }
            }
            
            if (targetElement) {
                // 获取目标元素的位置
                const elementRect = targetElement.getBoundingClientRect();
                const offsetTop = window.pageYOffset + elementRect.top;
                
                // 计算滚动位置（向上偏移一些以便更好地显示）
                const scrollTo = offsetTop - 150; // 向上偏移150px
                
                console.log('🎯 找到抗反射薄膜元素，开始滚动:', {
                    elementId: targetElement.id || 'unknown',
                    offsetTop: offsetTop,
                    scrollTo: scrollTo
                });
                
                // 执行平滑滚动
                window.scrollTo({
                    top: scrollTo,
                    behavior: 'smooth'
                });
                
                console.log('✅ 滚动到抗反射薄膜部分完成');
                
            } else {
                console.warn('⚠️ 未找到抗反射薄膜相关元素');
                // 如果找不到具体元素，就滚动到页面中部
                window.scrollTo({
                    top: document.body.scrollHeight * 0.6,
                    behavior: 'smooth'
                });
            }
            
        } catch (error) {
            console.error('❌ 滚动到抗反射薄膜部分失败:', error);
        }
    }
    
    /**
     * 裁剪ImageData数据
     */
    cropImageData(sourceImageData, x, y, width, height) {
        try {
            // 确保裁剪参数在有效范围内
            x = Math.max(0, Math.min(x, sourceImageData.width - 1));
            y = Math.max(0, Math.min(y, sourceImageData.height - 1));
            width = Math.max(1, Math.min(width, sourceImageData.width - x));
            height = Math.max(1, Math.min(height, sourceImageData.height - y));
            
            // 创建临时canvas来处理裁剪
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            // 设置源canvas尺寸并绘制原始图像
            tempCanvas.width = sourceImageData.width;
            tempCanvas.height = sourceImageData.height;
            tempCtx.putImageData(sourceImageData, 0, 0);
            
            // 创建目标canvas
            const targetCanvas = document.createElement('canvas');
            const targetCtx = targetCanvas.getContext('2d');
            targetCanvas.width = width;
            targetCanvas.height = height;
            
            // 裁剪并绘制到目标canvas
            targetCtx.drawImage(tempCanvas, x, y, width, height, 0, 0, width, height);
            
            // 获取裁剪后的ImageData
            const croppedImageData = targetCtx.getImageData(0, 0, width, height);
            
            console.log('✂️ 图像裁剪完成:', {
                原始尺寸: { width: sourceImageData.width, height: sourceImageData.height },
                裁剪区域: { x, y, width, height },
                结果尺寸: { width: croppedImageData.width, height: croppedImageData.height }
            });
            
            return croppedImageData;
            
        } catch (error) {
            console.error('❌ 图像裁剪失败:', error);
            throw error;
        }
    }
    
    /**
     * 应用中心裁剪预览
     */
    applyCenterCropPreview() {
        if (!this.originalImageData || !this.grayscaleImageData) {
            console.warn('⚠️ 图像数据未加载，无法应用中心裁剪预览');
            return;
        }
        
        try {
            console.log('🖼️ 开始应用中心裁剪预览...');
            
            // 计算中心裁剪区域
            const originalWidth = this.originalImageData.width;
            const originalHeight = this.originalImageData.height;
            const cropSize = Math.min(originalWidth, originalHeight) / 2;
            
            const cropX = Math.floor((originalWidth - cropSize) / 2);
            const cropY = Math.floor((originalHeight - cropSize) / 2);
            
            console.log('🔍 中心裁剪参数:', {
                原始尺寸: { width: originalWidth, height: originalHeight },
                裁剪尺寸: cropSize,
                裁剪位置: { x: cropX, y: cropY }
            });
            
            // 裁剪原始图像并显示
            const croppedOriginalData = this.cropImageData(this.originalImageData, cropX, cropY, cropSize, cropSize);
            this.updateCanvasWithImageData('original-photo-canvas', croppedOriginalData);
            
            // 裁剪灰度图像并显示
            const croppedGrayscaleData = this.cropImageData(this.grayscaleImageData, cropX, cropY, cropSize, cropSize);
            this.updateCanvasWithImageData('grayscale-photo-canvas', croppedGrayscaleData);
            
            console.log('✅ 中心裁剪预览应用完成');
            
        } catch (error) {
            console.error('❌ 应用中心裁剪预览失败:', error);
        }
    }
    
    /**
     * 恢复原始图像显示
     */
    restoreOriginalImageDisplay() {
        if (!this.originalImageData || !this.grayscaleImageData) {
            console.warn('⚠️ 图像数据未加载，无法恢复原始显示');
            return;
        }
        
        try {
            console.log('🔄 恢复原始图像显示...');
            
            // 恢复原始图像显示
            this.updateCanvasWithImageData('original-photo-canvas', this.originalImageData);
            
            // 恢复灰度图像显示
            this.updateCanvasWithImageData('grayscale-photo-canvas', this.grayscaleImageData);
            
            console.log('✅ 原始图像显示已恢复');
            
        } catch (error) {
            console.error('❌ 恢复原始图像显示失败:', error);
        }
    }
    
    /**
     * 用ImageData更新canvas显示
     */
    updateCanvasWithImageData(canvasId, imageData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !imageData) return;
        
        const ctx = canvas.getContext('2d');
        
        // 设置canvas尺寸
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        
        // 计算显示尺寸（保持纵横比，最大400px）
        const maxDisplaySize = 400;
        const aspectRatio = imageData.width / imageData.height;
        let displayWidth, displayHeight;
        
        if (aspectRatio > 1) {
            displayWidth = Math.min(imageData.width, maxDisplaySize);
            displayHeight = displayWidth / aspectRatio;
        } else {
            displayHeight = Math.min(imageData.height, maxDisplaySize);
            displayWidth = displayHeight * aspectRatio;
        }
        
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // 绘制图像
        ctx.putImageData(imageData, 0, 0);
        
        console.log(`📋 Canvas ${canvasId} 已更新:`, {
            原始尺寸: { width: imageData.width, height: imageData.height },
            显示尺寸: { width: displayWidth, height: displayHeight }
        });
    }

    /**
     * 更新数据状态显示
     */
    updateDataStatus() {
        if (!this.vectorData) return;

        // 显示数据状态区域
        const statusElement = document.getElementById('intensity-data-status');
        statusElement.style.display = 'block';
        
        // 更新统计信息
        document.getElementById('intensity-point-count').textContent = this.vectorData.x.length;
        document.getElementById('intensity-x-range').textContent = 
            `${Math.min(...this.vectorData.x).toFixed(3)} 到 ${Math.max(...this.vectorData.x).toFixed(3)}`;
        document.getElementById('intensity-value-range').textContent = 
            `${Math.min(...this.vectorData.intensity).toFixed(3)} 到 ${Math.max(...this.vectorData.intensity).toFixed(3)}`;
    }

    /**
     * 导出向量数据
     */
    exportVectorData() {
        if (!this.vectorData) {
            alert('请先生成向量数据');
            return;
        }

        try {
            // 获取当前时间戳
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');
            
            // 计算统计信息
            const xMin = Math.min(...this.vectorData.x);
            const xMax = Math.max(...this.vectorData.x);
            const intensityMin = Math.min(...this.vectorData.intensity);
            const intensityMax = Math.max(...this.vectorData.intensity);
            const avgIntensity = this.vectorData.intensity.reduce((a, b) => a + b, 0) / this.vectorData.intensity.length;
            const xRange = xMax - xMin;
            
            // 获取用户选择的光强类型和相关信息
            const intensityInfo = this.getIntensityTypeInfo();
            
            // 创建TXT格式的数据，包含详细注释
            let txtContent = `# 照片识别向量数据导出文件
# ================================================
# 导出时间: ${timestamp}
# 数据来源: 照片识别系统
# 
# 【用户光强设置】重点信息:
# ★ 光强值类型: ${intensityInfo.type}
# ★ 设定光强值: ${intensityInfo.value.toFixed(6)}
# ★ 参考位置: ${intensityInfo.position}
# ★ 实际测量值: ${intensityInfo.actualValue.toFixed(6)}
# ★ 位置坐标: ${intensityInfo.coordinates}
# ================================================
# 
# 数据统计信息:
# - 数据点数量: ${this.vectorData.x.length}
# - X坐标范围: ${xMin.toFixed(6)} 至 ${xMax.toFixed(6)}
# - 坐标跨度: ${xRange.toFixed(6)} ${this.vectorData.parameters.coordinateUnit}
# - 光强度范围: ${intensityMin.toFixed(6)} 至 ${intensityMax.toFixed(6)}
# - 平均光强度: ${avgIntensity.toFixed(6)}
# 
# 处理参数:
# - 灰度转换方法: ${this.vectorData.parameters.grayscaleMethod}
# - 向量提取方向: ${this.vectorData.parameters.vectorDirection}
# - 坐标单位: ${this.vectorData.parameters.coordinateUnit}
# - 平滑处理: ${this.vectorData.parameters.smoothing}
# 
# 光强标记说明:
# - 在数据中，用户指定的光强位置已用 "★" 标记
# - 该位置的实际测量光强值为: ${intensityInfo.actualValue.toFixed(6)}
# - 用户设定的光强值为: ${intensityInfo.value.toFixed(6)}
# ================================================
# 
# 数据格式说明:
# 第1列: X坐标位置 (${this.vectorData.parameters.coordinateUnit})
# 第2列: 归一化光强度值 (基于用户设定的光强值计算)
# 第3列: 标记 (★ = 用户指定的光强位置)
# 
# 数据内容:
${' '.repeat(12)}X坐标${' '.repeat(12)}光强度值${' '.repeat(8)}标记
${'-'.repeat(60)}
`;

            // 添加数据行，使用固定宽度格式化，并标记用户选择的光强位置
            for (let i = 0; i < this.vectorData.x.length; i++) {
                const xValue = this.vectorData.x[i].toFixed(6).padStart(18);
                const intensityValue = this.vectorData.intensity[i].toFixed(6).padStart(15);
                
                // 检查是否是用户选择的光强位置
                const isMarkedPosition = this.isIntensityMarkerPosition(i, intensityInfo);
                const marker = isMarkedPosition ? '  ★' : '   ';
                
                txtContent += `${xValue}    ${intensityValue}${marker}\n`;
            }
            
            // 添加文件尾部信息
            txtContent += `\n${'-'.repeat(60)}\n`;
            txtContent += `# ★ 标记说明: 该行对应用户设定的光强位置\n`;
            txtContent += `# 用户光强设置: ${intensityInfo.type} = ${intensityInfo.value.toFixed(6)}\n`;
            txtContent += `# 位置坐标: ${intensityInfo.coordinates}\n`;
            txtContent += `# 数据导出完成，共 ${this.vectorData.x.length} 个数据点\n`;
            txtContent += `# 文件生成时间: ${timestamp}\n`;
            txtContent += `# ================================================`;

            // 创建下载链接
            const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `photo_vector_data_${new Date().getTime()}.txt`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log('✅ 向量数据导出成功（含光强标记的TXT格式）');
            }
            
        } catch (error) {
            console.error('❌ 数据导出失败:', error);
            alert('数据导出失败：' + error.message);
        }
    }
    
    /**
     * 获取用户光强类型信息
     */
    getIntensityTypeInfo() {
        // 优先使用后端返回的标记信息
        if (this.vectorData && this.vectorData.metadata && this.vectorData.metadata.intensity_marker) {
            const markerInfo = this.vectorData.metadata.intensity_marker;
            
            let typeName;
            switch (markerInfo.type) {
                case 'max':
                    typeName = '最大光强值';
                    break;
                case 'center':
                    typeName = '中心点光强值';
                    break;
                case 'custom':
                    typeName = '自定义位置光强值';
                    break;
                default:
                    typeName = '未知光强类型';
            }
            
            return {
                type: typeName,
                value: markerInfo.user_value,
                position: markerInfo.coordinates_description,
                actualValue: markerInfo.actual_value,
                coordinates: markerInfo.coordinates_description,
                dataIndex: markerInfo.position.index
            };
        }
        
        // 备用方案：前端计算（保持兼容性）
        const intensityValueType = document.getElementById('intensity-value-type')?.value || 'max';
        
        let info = {
            type: '未知',
            value: 1.0,
            position: '未指定',
            actualValue: 0,
            coordinates: '未知',
            dataIndex: -1
        };
        
        if (!this.vectorData) {
            return info;
        }
        
        switch (intensityValueType) {
            case 'max':
                const maxIndex = this.vectorData.intensity.indexOf(Math.max(...this.vectorData.intensity));
                info = {
                    type: '最大光强值',
                    value: parseFloat(document.getElementById('max-intensity-value')?.value) || 1.0,
                    position: '数据中的最大光强位置',
                    actualValue: this.vectorData.intensity[maxIndex],
                    coordinates: `X=${this.vectorData.x[maxIndex].toFixed(3)}`,
                    dataIndex: maxIndex
                };
                break;
                
            case 'center':
                const centerIndex = Math.floor(this.vectorData.x.length / 2);
                info = {
                    type: '中心点光强值',
                    value: parseFloat(document.getElementById('center-intensity-value')?.value) || 1.0,
                    position: '数据中心点位置',
                    actualValue: this.vectorData.intensity[centerIndex],
                    coordinates: `X=${this.vectorData.x[centerIndex].toFixed(3)}`,
                    dataIndex: centerIndex
                };
                break;
                
            case 'custom':
                const customValue = parseFloat(document.getElementById('custom-intensity-value')?.value) || 1.0;
                const customX = parseInt(document.getElementById('custom-position-x')?.value) || 0;
                const customY = parseInt(document.getElementById('custom-position-y')?.value) || 0;
                
                // 找到最接近自定义坐标的数据点
                let closestIndex = 0;
                let minDistance = Infinity;
                for (let i = 0; i < this.vectorData.x.length; i++) {
                    const distance = Math.abs(this.vectorData.x[i] - (customX * (this.vectorData.parameters.scaleFactor || 1)));
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestIndex = i;
                    }
                }
                
                info = {
                    type: '自定义位置光强值',
                    value: customValue,
                    position: '用户指定的自定义位置',
                    actualValue: this.vectorData.intensity[closestIndex],
                    coordinates: `X=${this.vectorData.x[closestIndex].toFixed(3)} (原像素坐标: ${customX}, ${customY})`,
                    dataIndex: closestIndex
                };
                break;
        }
        
        return info;
    }
    
    /**
     * 检查指定索引是否是用户选择的光强标记位置
     */
    isIntensityMarkerPosition(index, intensityInfo) {
        return index === intensityInfo.dataIndex;
    }

    /**
     * 重新拍摄/重新上传
     */
    retakePhoto() {
        // 隐藏照片预览区域
        document.getElementById('photo-preview-section').style.display = 'none';
        document.getElementById('photo-processing-params').style.display = 'none';
        document.getElementById('vector-preview-section').style.display = 'none';
        document.getElementById('vector-data-preview-section').style.display = 'none';
        
        // 清空文件输入
        const fileInput = document.getElementById('photo-file-input');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // 清除之前的数据
        this.originalImageData = null;
        this.grayscaleImageData = null;
        this.vectorData = null;
        
        console.log('🔄 准备重新输入图片');
    }

    /**
     * 停止相机
     */
    stopCamera() {
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            
            if (this.video) {
                this.video.srcObject = null;
            }
            
            // 隐藏相机预览
            const previewSection = document.getElementById('camera-preview-section');
            if (previewSection) {
                previewSection.style.display = 'none';
            }
            
            // 重置按钮状态
            const startBtn = document.getElementById('start-camera-btn');
            const takeBtn = document.getElementById('take-photo-btn');
            const stopBtn = document.getElementById('stop-camera-btn');
            
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (takeBtn) takeBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'none';
            
            // 重置状态图标（如果存在）
            const statusIcon = document.getElementById('camera-status-icon');
            if (statusIcon) {
                statusIcon.innerHTML = '<i class="fas fa-camera"></i>';
            }
            
            console.log('✅ 相机已关闭');
            
        } catch (error) {
            console.error('❌ 关闭相机时出错:', error);
        }
    }

    /**
     * 处理单位变化
     */
    handleUnitChange() {
        const unit = document.getElementById('coordinate-unit').value;
        const customContainer = document.getElementById('custom-scale-container');
        
        if (unit === 'custom') {
            customContainer.style.display = 'block';
        } else {
            customContainer.style.display = 'none';
        }
    }

    /**
     * 显示处理指示器
     */
    showProcessingIndicator(message = '正在处理...') {
        const indicator = document.getElementById('processing-indicator');
        if (!indicator) {
            console.warn('处理指示器元素未找到');
            return;
        }
        
        const text = indicator.querySelector('.processing-text');
        if (text) {
            text.textContent = message;
        }
        indicator.style.display = 'block';
        
        this.isProcessing = true;
    }

    /**
     * 隐藏处理指示器
     */
    hideProcessingIndicator() {
        const indicator = document.getElementById('processing-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
        
        this.isProcessing = false;
    }

    /**
     * 禁用浏览器默认的工具提示
     */
    disableDefaultTooltips() {
        // 使用全局的工具提示禁用方法
        if (typeof disableDefaultTooltips === 'function') {
            disableDefaultTooltips();
        } else {
            // 备用方法
            const tooltipIcons = document.querySelectorAll('.tooltip-icon[data-title]');
            tooltipIcons.forEach(icon => {
                icon.removeAttribute('title');
                icon.addEventListener('mouseenter', (e) => {
                    e.target.removeAttribute('title');
                    this.showCustomTooltip(e.target);
                });
                icon.addEventListener('mouseleave', () => {
                    this.hideCustomTooltip();
                });
            });
        }
    }

    /**
     * 显示自定义工具提示
     */
    showCustomTooltip(element) {
        const tooltipText = element.getAttribute('data-title');
        if (!tooltipText) return;
        
        // 移除现有的工具提示
        this.hideCustomTooltip();
        
        // 创建工具提示元素
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip-popup';
        tooltip.textContent = tooltipText;
        tooltip.style.cssText = `
            position: absolute;
            z-index: 10000;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: normal;
            white-space: normal;
            max-width: 300px;
            line-height: 1.4;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            pointer-events: none;
            opacity: 1;
            transform: translateX(-50%);
        `;
        
        // 计算位置
        const rect = element.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.top = (rect.top - 8) + 'px';
        tooltip.style.transform = 'translate(-50%, -100%)';
        
        // 添加小箭头
        const arrow = document.createElement('div');
        arrow.style.cssText = `
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            margin-left: -5px;
            border: 5px solid transparent;
            border-top-color: #333;
        `;
        tooltip.appendChild(arrow);
        
        document.body.appendChild(tooltip);
    }

    /**
     * 隐藏自定义工具提示
     */
    hideCustomTooltip() {
        const existingTooltip = document.querySelector('.custom-tooltip-popup');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        }
    
    /**
     * 处理光强值类型变化
     */
    handleIntensityValueTypeChange() {
        const intensityValueType = document.getElementById('intensity-value-type');
        if (!intensityValueType) return;
        
        const selectedType = intensityValueType.value;
        console.log('🔄 光强值类型切换为:', selectedType);
        
        // 获取所有输入区域
        const maxInput = document.getElementById('max-intensity-input');
        const centerInput = document.getElementById('center-intensity-input');
        const customInput = document.getElementById('custom-intensity-input');
        
        // 隐藏所有输入区域
        [maxInput, centerInput, customInput].forEach(element => {
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // 显示选中的输入区域
        switch (selectedType) {
            case 'max':
                if (maxInput) maxInput.style.display = 'block';
                break;
            case 'center':
                if (centerInput) centerInput.style.display = 'block';
                break;
            case 'custom':
                if (customInput) {
                    customInput.style.display = 'block';
                    // 初始化自定义坐标为图像中心（如果有图像数据）
                    this.initializeCustomPosition();
                }
                break;
        }
    }
    
    /**
     * 初始化自定义位置坐标（设为图像中心）
     */
    initializeCustomPosition() {
        if (!this.grayscaleImageData) return;
        
        const centerX = Math.floor(this.grayscaleImageData.width / 2);
        const centerY = Math.floor(this.grayscaleImageData.height / 2);
        
        const customPosX = document.getElementById('custom-position-x');
        const customPosY = document.getElementById('custom-position-y');
        
        if (customPosX && !customPosX.value) customPosX.value = centerX;
        if (customPosY && !customPosY.value) customPosY.value = centerY;
        
        console.log('🎯 自定义位置已初始化为图像中心:', { x: centerX, y: centerY });
    }
    
    /**
     * 计算等效的最大光强值
     * 根据用户选择的光强值类型，计算出传递给后端的等效最大光强值
     */
    calculateEffectiveMaxIntensity() {
        const intensityValueType = document.getElementById('intensity-value-type')?.value || 'max';
        
        console.log('🔢 计算等效最大光强值，类型:', intensityValueType);
        
        switch (intensityValueType) {
            case 'max':
                // 直接使用用户输入的最大光强值
                const maxValue = parseFloat(document.getElementById('max-intensity-value')?.value) || 1.0;
                console.log('📊 使用最大光强值:', maxValue);
                return maxValue;
                
            case 'center':
                // 基于中心点光强值计算等效最大光强值
                return this.calculateEffectiveMaxFromCenter();
                
            case 'custom':
                // 基于自定义位置光强值计算等效最大光强值
                return this.calculateEffectiveMaxFromCustom();
                
            default:
                console.warn('⚠️ 未知的光强值类型，使用默认值');
                return 1.0;
        }
    }
    
    /**
     * 基于中心点光强值计算等效最大光强值
     */
    calculateEffectiveMaxFromCenter() {
        const centerIntensityValue = parseFloat(document.getElementById('center-intensity-value')?.value) || 1.0;
        
        if (!this.grayscaleImageData) {
            console.warn('⚠️ 图像数据未加载，无法计算中心点光强，使用输入值');
            return centerIntensityValue;
        }
        
        try {
            // 获取图像中心位置的归一化灰度值
            const centerX = Math.floor(this.grayscaleImageData.width / 2);
            const centerY = Math.floor(this.grayscaleImageData.height / 2);
            const centerGrayValue = this.getPixelGrayValue(centerX, centerY);
            
            if (centerGrayValue === null) {
                console.warn('⚠️ 无法获取中心点灰度值，使用输入值');
                return centerIntensityValue;
            }
            
            // 计算等效最大光强值：假设图像中的最大灰度值(1.0)对应的光强值
            // 公式：max_intensity = center_intensity / center_gray_value
            const effectiveMax = centerGrayValue > 0 ? centerIntensityValue / centerGrayValue : centerIntensityValue;
            
            console.log('📊 中心点光强计算:', {
                中心坐标: { x: centerX, y: centerY },
                中心灰度值: centerGrayValue,
                中心光强值: centerIntensityValue,
                等效最大光强: effectiveMax
            });
            
            return Math.max(effectiveMax, 0.001); // 确保最小值
            
        } catch (error) {
            console.error('❌ 计算中心点光强失败:', error);
            return centerIntensityValue;
        }
    }
    
    /**
     * 基于自定义位置光强值计算等效最大光强值
     */
    calculateEffectiveMaxFromCustom() {
        const customX = parseInt(document.getElementById('custom-position-x')?.value) || 0;
        const customY = parseInt(document.getElementById('custom-position-y')?.value) || 0;
        const customIntensityValue = parseFloat(document.getElementById('custom-intensity-value')?.value) || 1.0;
        
        if (!this.grayscaleImageData) {
            console.warn('⚠️ 图像数据未加载，无法计算自定义位置光强，使用输入值');
            return customIntensityValue;
        }
        
        try {
            // 检查坐标是否在图像范围内
            if (customX < 0 || customX >= this.grayscaleImageData.width ||
                customY < 0 || customY >= this.grayscaleImageData.height) {
                console.warn('⚠️ 自定义坐标超出图像范围，使用输入值');
                return customIntensityValue;
            }
            
            // 获取指定位置的归一化灰度值
            const customGrayValue = this.getPixelGrayValue(customX, customY);
            
            if (customGrayValue === null) {
                console.warn('⚠️ 无法获取自定义位置灰度值，使用输入值');
                return customIntensityValue;
            }
            
            // 计算等效最大光强值
            const effectiveMax = customGrayValue > 0 ? customIntensityValue / customGrayValue : customIntensityValue;
            
            console.log('📊 自定义位置光强计算:', {
                自定义坐标: { x: customX, y: customY },
                位置灰度值: customGrayValue,
                位置光强值: customIntensityValue,
                等效最大光强: effectiveMax
            });
            
            return Math.max(effectiveMax, 0.001); // 确保最小值
            
        } catch (error) {
            console.error('❌ 计算自定义位置光强失败:', error);
            return customIntensityValue;
        }
    }
    
    /**
     * 获取指定像素位置的归一化灰度值 (0-1)
     */
    getPixelGrayValue(x, y) {
        if (!this.grayscaleImageData || x < 0 || y < 0 || 
            x >= this.grayscaleImageData.width || y >= this.grayscaleImageData.height) {
            return null;
        }
        
        try {
            const data = this.grayscaleImageData.data;
            const index = (y * this.grayscaleImageData.width + x) * 4;
            
            // 灰度图像的R、G、B值应该相同，取R值即可
            const grayValue = data[index]; // 0-255
            
            // 归一化到0-1范围
            return grayValue / 255.0;
            
        } catch (error) {
            console.error('❌ 获取像素灰度值失败:', error);
            return null;
        }
    }
    
    /**
     * 处理裁剪模式变化
     */
    handleCropModeChange() {
        const cropMode = document.getElementById('crop-mode').value;
        const cropOverlay = document.getElementById('crop-overlay');
        
        console.log('🔄 裁剪模式切换为:', cropMode);
        
        // 在切换模式时重置裁剪状态
        if (this.appliedCropParams) {
            console.log('🔄 检测到模式切换，重置已保存的裁剪参数');
            this.appliedCropParams = null;
        }
        
        if (cropMode === 'manual') {
            this.enableInteractiveCrop();
        } else if (cropMode === 'center') {
            this.disableInteractiveCrop();
            // 应用中心裁剪预览
            this.applyCenterCropPreview();
        } else {
            this.disableInteractiveCrop();
            // 恢复原始图像显示
            this.restoreOriginalImageDisplay();
        }
    }

    /**
     * 启用交互式裁剪功能 - 修复版
     */
    enableInteractiveCrop() {
        console.log('🎯 启用交互式裁剪功能...');
        
        // 首先隐藏原始图片，只显示灰度图
        this.showOnlyGrayscaleForCrop();
        
        const cropOverlay = document.getElementById('crop-overlay');
        const canvas = document.getElementById('grayscale-photo-canvas');
        const confirmContainer = document.getElementById('crop-confirm-container');
        
        // 立即设置激活状态，避免检查失败时状态不一致
        this.cropActive = true;
        
        if (!cropOverlay || !canvas) {
            console.error('❌ 裁剪控件或canvas未找到');
            return;
        }
        
        // 显示裁剪控件和确认按钮
        cropOverlay.style.display = 'block';
        cropOverlay.classList.add('active');
        
        if (confirmContainer) {
            confirmContainer.style.display = 'block';
        }
        
        // 延迟初始化裁剪区域，确保DOM更新完成
        setTimeout(() => {
            this.initializeCropArea(canvas);
        }, 100);
        
        console.log('✅ 交互式裁剪功能已启用');
    }
    
    /**
     * 只显示灰度图用于裁剪 - 新增函数
     */
    showOnlyGrayscaleForCrop() {
        const imageContainer = document.querySelector('.image-preview-container');
        const originalColumn = imageContainer?.querySelector('.image-column:first-child');
        const grayscaleColumn = imageContainer?.querySelector('.image-column:last-child');
        
        if (!imageContainer || !originalColumn || !grayscaleColumn) return;
        
        console.log('🎨 切换到裁剪模式UI...');
        
        // 隐藏原始图片列
        originalColumn.style.display = 'none';
        
        // 让灰度图列占满容器并居中
        imageContainer.style.gridTemplateColumns = '1fr';
        imageContainer.style.justifyContent = 'center';
        grayscaleColumn.style.maxWidth = '600px';
        grayscaleColumn.style.margin = '0 auto';
        
        // 更新标题
        const grayscaleTitle = grayscaleColumn.querySelector('h5');
        if (grayscaleTitle) {
            grayscaleTitle.textContent = '裁剪区域选择';
            grayscaleTitle.style.color = '#2563eb';
            grayscaleTitle.style.fontWeight = '600';
        }
    }
    
    /**
     * 初始化裁剪区域 - 新增函数
     */
    initializeCropArea(canvas) {
        try {
            // 重新计算canvas位置（因为布局可能已改变）
            const canvasRect = canvas.getBoundingClientRect();
            const containerRect = canvas.offsetParent.getBoundingClientRect();
            
            // 计算相对于容器的位置
            const canvasLeft = canvasRect.left - containerRect.left;
            const canvasTop = canvasRect.top - containerRect.top;
            
            // 设置裁剪区域为canvas的中心50%区域（更合理的大小）
            const width = canvas.offsetWidth * 0.5;
            const height = canvas.offsetHeight * 0.5;
            const x = canvasLeft + (canvas.offsetWidth - width) / 2;
            const y = canvasTop + (canvas.offsetHeight - height) / 2;
            
            this.cropData = { x, y, width, height };
            
            console.log('📐 初始化裁剪区域:', this.cropData);
            
            this.updateCropArea();
            this.setupCropEventListeners();
            
        } catch (error) {
            console.error('❌ 初始化裁剪区域失败:', error);
        }
    }

    /**
     * 禁用交互式裁剪功能 - 修复版
     */
    disableInteractiveCrop() {
        console.log('🎯 禁用交互式裁剪功能...');
        
        const cropOverlay = document.getElementById('crop-overlay');
        const confirmContainer = document.getElementById('crop-confirm-container');
        
        if (cropOverlay) {
            cropOverlay.style.display = 'none';
            cropOverlay.classList.remove('active');
        }
        
        // 隐藏确认按钮
        if (confirmContainer) {
            confirmContainer.style.display = 'none';
        }
        
        // 恢复双图显示布局
        this.restoreOriginalLayout();
        
        this.removeCropEventListeners();
        this.cropActive = false;
        
        console.log('✅ 交互式裁剪功能已禁用');
    }
    
    /**
     * 重置裁剪状态（拍摄新照片或切换模式时调用）
     */
    resetCropState() {
        console.log('🔄 重置裁剪状态...');
        this.disableInteractiveCrop();
        this.appliedCropParams = null;
        this.cropData = { x: 0, y: 0, width: 0, height: 0 };
        console.log('✅ 裁剪状态已重置');
    }
    
    /**
     * 恢复原始双图布局 - 新增函数
     */
    restoreOriginalLayout() {
        const imageContainer = document.querySelector('.image-preview-container');
        const originalColumn = imageContainer?.querySelector('.image-column:first-child');
        const grayscaleColumn = imageContainer?.querySelector('.image-column:last-child');
        
        if (!imageContainer || !originalColumn || !grayscaleColumn) return;
        
        console.log('🎨 恢复双图显示布局...');
        
        // 恢复原始图片列的显示
        originalColumn.style.display = 'block';
        
        // 恢复网格布局
        imageContainer.style.gridTemplateColumns = '1fr 1fr';
        imageContainer.style.justifyContent = '';
        grayscaleColumn.style.maxWidth = '';
        grayscaleColumn.style.margin = '';
        
        // 恢复标题
        const grayscaleTitle = grayscaleColumn.querySelector('h5');
        if (grayscaleTitle) {
            grayscaleTitle.textContent = '灰度预览';
            grayscaleTitle.style.color = '';
            grayscaleTitle.style.fontWeight = '';
        }
    }

    /**
     * 更新裁剪区域显示
     */
    updateCropArea() {
        const cropArea = document.getElementById('crop-area');
        if (!cropArea) return;
        
        const { x, y, width, height } = this.cropData;
        
        cropArea.style.left = x + 'px';
        cropArea.style.top = y + 'px';
        cropArea.style.width = width + 'px';
        cropArea.style.height = height + 'px';
        
        this.updateCropMasks();
    }

    /**
     * 更新裁剪遮罩层
     */
    updateCropMasks() {
        const canvas = document.getElementById('grayscale-photo-canvas');
        if (!canvas) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = canvas.offsetParent.getBoundingClientRect();
        const canvasLeft = canvasRect.left - containerRect.left;
        const canvasTop = canvasRect.top - containerRect.top;
        
        const { x, y, width, height } = this.cropData;
        
        const maskTop = document.querySelector('.crop-mask-top');
        const maskLeft = document.querySelector('.crop-mask-left');
        const maskRight = document.querySelector('.crop-mask-right');
        const maskBottom = document.querySelector('.crop-mask-bottom');
        
        if (maskTop) {
            maskTop.style.left = canvasLeft + 'px';
            maskTop.style.top = canvasTop + 'px';
            maskTop.style.width = canvas.offsetWidth + 'px';
            maskTop.style.height = (y - canvasTop) + 'px';
        }
        
        if (maskLeft) {
            maskLeft.style.left = canvasLeft + 'px';
            maskLeft.style.top = y + 'px';
            maskLeft.style.width = (x - canvasLeft) + 'px';
            maskLeft.style.height = height + 'px';
        }
        
        if (maskRight) {
            maskRight.style.left = (x + width) + 'px';
            maskRight.style.top = y + 'px';
            maskRight.style.width = (canvasLeft + canvas.offsetWidth - x - width) + 'px';
            maskRight.style.height = height + 'px';
        }
        
        if (maskBottom) {
            maskBottom.style.left = canvasLeft + 'px';
            maskBottom.style.top = (y + height) + 'px';
            maskBottom.style.width = canvas.offsetWidth + 'px';
            maskBottom.style.height = (canvasTop + canvas.offsetHeight - y - height) + 'px';
        }
    }

    /**
     * 设置裁剪事件监听器
     */
    setupCropEventListeners() {
        const cropArea = document.getElementById('crop-area');
        const cropHandles = document.querySelectorAll('.crop-handle');
        const confirmBtn = document.getElementById('confirm-crop-btn');
        
        if (cropArea) {
            cropArea.addEventListener('mousedown', this.handleCropAreaMouseDown.bind(this));
        }
        
        cropHandles.forEach(handle => {
            handle.addEventListener('mousedown', this.handleCropHandleMouseDown.bind(this));
        });
        
        // 为确认按钮添加点击事件
        if (confirmBtn) {
            confirmBtn.addEventListener('click', this.handleConfirmCropClick.bind(this));
        }
        
        document.addEventListener('mousemove', this.handleCropMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleCropMouseUp.bind(this));
    }

    /**
     * 移除裁剪事件监听器
     */
    removeCropEventListeners() {
        document.removeEventListener('mousemove', this.handleCropMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleCropMouseUp.bind(this));
        
        // 移除确认按钮的点击监听器
        const confirmBtn = document.getElementById('confirm-crop-btn');
        if (confirmBtn) {
            confirmBtn.removeEventListener('click', this.handleConfirmCropClick.bind(this));
        }
    }

    /**
     * 处理裁剪区域鼠标按下事件
     */
    handleCropAreaMouseDown(e) {
        if (e.target.classList.contains('crop-handle')) return;
        
        e.preventDefault();
        this.isDragging = true;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
    }

    /**
     * 处理裁剪控制点鼠标按下事件
     */
    handleCropHandleMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.isResizing = true;
        this.resizeHandle = e.target.dataset.position;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
    }

    /**
     * 处理鼠标移动事件
     */
    handleCropMouseMove(e) {
        if (!this.cropActive) return;
        
        if (this.isDragging) {
            this.handleCropDrag(e);
        } else if (this.isResizing) {
            this.handleCropResize(e);
        }
    }

    /**
     * 处理鼠标释放事件
     */
    handleCropMouseUp(e) {
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
    }

    /**
     * 处理确认裁剪按钮点击事件
     */
    handleConfirmCropClick(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('点击了确认裁剪按钮');
        this.confirmCrop();
    }

    /**
     * 确认裁剪并应用到预览
     */
    confirmCrop() {
        if (!this.cropActive) return;
        
        // 获取裁剪参数
        const cropParams = this.getCropParameters();
        if (!cropParams) {
            alert('请先设置裁剪区域');
            return;
        }
        
        // 应用裁剪到灰度预览
        this.applyCropToPreview(cropParams);
        
        console.log('✅ 裁剪已确认并应用:', cropParams);
    }

    /**
     * 将裁剪应用到灰度预览图像 - 修复版
     */
    applyCropToPreview(cropParams) {
        const canvas = document.getElementById('grayscale-photo-canvas');
        if (!canvas || !this.grayscaleImageData || !this.originalImageData) return;
        
        const ctx = canvas.getContext('2d');
        
        console.log('🎯 开始应用裁剪:', {
            cropParams,
            原始图像尺寸: { width: this.originalImageData.width, height: this.originalImageData.height },
            灰度图像尺寸: { width: this.grayscaleImageData.width, height: this.grayscaleImageData.height }
        });
        
        // 验证裁剪参数的合理性
        const maxWidth = this.grayscaleImageData.width;
        const maxHeight = this.grayscaleImageData.height;
        
        // 确保裁剪参数在图像范围内
        const safeX = Math.max(0, Math.min(cropParams.x, maxWidth - 1));
        const safeY = Math.max(0, Math.min(cropParams.y, maxHeight - 1));
        const safeWidth = Math.max(1, Math.min(cropParams.width, maxWidth - safeX));
        const safeHeight = Math.max(1, Math.min(cropParams.height, maxHeight - safeY));
        
        console.log('✅ 安全裁剪参数:', { x: safeX, y: safeY, width: safeWidth, height: safeHeight });
        
        try {
            // 1. 裁剪灰度图像数据
            const croppedGrayscaleData = this.cropImageData(this.grayscaleImageData, safeX, safeY, safeWidth, safeHeight);
            
            // 2. 裁剪原始彩色图像数据
            const croppedOriginalData = this.cropImageData(this.originalImageData, safeX, safeY, safeWidth, safeHeight);
            
            // 3. 更新canvas显示
            canvas.width = safeWidth;
            canvas.height = safeHeight;
            canvas.style.width = Math.min(safeWidth, 400) + 'px';
            canvas.style.height = (Math.min(safeWidth, 400) / safeWidth * safeHeight) + 'px';
            
            // 4. 绘制裁剪后的灰度图像到canvas
            ctx.putImageData(croppedGrayscaleData, 0, 0);
            
                    // 5. 更新存储的图像数据
        this.grayscaleImageData = croppedGrayscaleData;
        this.originalImageData = croppedOriginalData;
        
        // 6. 同时更新原始图像的canvas显示
        this.updateOriginalCanvasAfterCrop(croppedOriginalData);
        
        // 7. 保存裁剪参数供后续使用
        this.appliedCropParams = {
            x: safeX,
            y: safeY,
            width: safeWidth,
            height: safeHeight,
            applied: true
        };
        
        console.log('✅ 裁剪应用成功:', {
            新图像尺寸: { width: safeWidth, height: safeHeight },
            canvas尺寸: { width: canvas.width, height: canvas.height },
            显示尺寸: { width: canvas.style.width, height: canvas.style.height },
            保存的裁剪参数: this.appliedCropParams
        });
        
    } catch (error) {
        console.error('❌ 裁剪应用失败:', error);
        alert('裁剪操作失败：' + error.message);
        return;
    }
    
    // 禁用裁剪控件（这会恢复双图显示）
    this.disableInteractiveCrop();
    
    console.log('🎉 灰度预览已更新为裁剪后的图像');
    }

    /**
     * 裁剪后更新原始图像canvas显示 - 新增函数
     */
    updateOriginalCanvasAfterCrop(croppedOriginalData) {
        const originalCanvas = document.getElementById('original-photo-canvas');
        if (!originalCanvas || !croppedOriginalData) return;
        
        const ctx = originalCanvas.getContext('2d');
        
        // 调整原始canvas的尺寸
        originalCanvas.width = croppedOriginalData.width;
        originalCanvas.height = croppedOriginalData.height;
        originalCanvas.style.width = Math.min(croppedOriginalData.width, 400) + 'px';
        originalCanvas.style.height = (Math.min(croppedOriginalData.width, 400) / croppedOriginalData.width * croppedOriginalData.height) + 'px';
        
        // 绘制裁剪后的原始图像
        ctx.putImageData(croppedOriginalData, 0, 0);
        
        console.log('🖼️ 原始图像canvas已更新为裁剪后的尺寸');
    }
    
    /**
     * 裁剪ImageData对象 - 新增辅助函数
     */
    cropImageData(imageData, x, y, width, height) {
        const sourceCanvas = document.createElement('canvas');
        const sourceCtx = sourceCanvas.getContext('2d');
        
        // 设置源canvas尺寸并绘制原始图像
        sourceCanvas.width = imageData.width;
        sourceCanvas.height = imageData.height;
        sourceCtx.putImageData(imageData, 0, 0);
        
        // 创建目标canvas
        const targetCanvas = document.createElement('canvas');
        const targetCtx = targetCanvas.getContext('2d');
        targetCanvas.width = width;
        targetCanvas.height = height;
        
        // 从源canvas裁剪到目标canvas
        targetCtx.drawImage(
            sourceCanvas,
            x, y, width, height,  // 源区域
            0, 0, width, height   // 目标区域
        );
        
        // 返回裁剪后的ImageData
        return targetCtx.getImageData(0, 0, width, height);
    }

    /**
     * 处理裁剪区域拖拽
     */
    handleCropDrag(e) {
        const deltaX = e.clientX - this.lastMousePos.x;
        const deltaY = e.clientY - this.lastMousePos.y;
        
        const canvas = document.getElementById('grayscale-photo-canvas');
        if (!canvas) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = canvas.offsetParent.getBoundingClientRect();
        const canvasLeft = canvasRect.left - containerRect.left;
        const canvasTop = canvasRect.top - containerRect.top;
        
        let newX = this.cropData.x + deltaX;
        let newY = this.cropData.y + deltaY;
        
        // 限制在画布范围内
        newX = Math.max(canvasLeft, Math.min(newX, canvasLeft + canvas.offsetWidth - this.cropData.width));
        newY = Math.max(canvasTop, Math.min(newY, canvasTop + canvas.offsetHeight - this.cropData.height));
        
        this.cropData.x = newX;
        this.cropData.y = newY;
        
        this.updateCropArea();
        this.lastMousePos = { x: e.clientX, y: e.clientY };
    }

    /**
     * 处理裁剪区域大小调整
     */
    handleCropResize(e) {
        const deltaX = e.clientX - this.lastMousePos.x;
        const deltaY = e.clientY - this.lastMousePos.y;
        
        const canvas = document.getElementById('grayscale-photo-canvas');
        if (!canvas) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = canvas.offsetParent.getBoundingClientRect();
        const canvasLeft = canvasRect.left - containerRect.left;
        const canvasTop = canvasRect.top - containerRect.top;
        
        let { x, y, width, height } = this.cropData;
        
        // 根据不同的控制点调整大小
        switch (this.resizeHandle) {
            case 'nw':
                x += deltaX;
                y += deltaY;
                width -= deltaX;
                height -= deltaY;
                break;
            case 'n':
                y += deltaY;
                height -= deltaY;
                break;
            case 'ne':
                y += deltaY;
                width += deltaX;
                height -= deltaY;
                break;
            case 'e':
                width += deltaX;
                break;
            case 'se':
                width += deltaX;
                height += deltaY;
                break;
            case 's':
                height += deltaY;
                break;
            case 'sw':
                x += deltaX;
                width -= deltaX;
                height += deltaY;
                break;
            case 'w':
                x += deltaX;
                width -= deltaX;
                break;
        }
        
        // 限制最小尺寸
        const minSize = 20;
        if (width < minSize) {
            if (['nw', 'sw', 'w'].includes(this.resizeHandle)) {
                x = x + width - minSize;
            }
            width = minSize;
        }
        if (height < minSize) {
            if (['nw', 'ne', 'n'].includes(this.resizeHandle)) {
                y = y + height - minSize;
            }
            height = minSize;
        }
        
        // 限制在画布范围内
        x = Math.max(canvasLeft, Math.min(x, canvasLeft + canvas.offsetWidth - width));
        y = Math.max(canvasTop, Math.min(y, canvasTop + canvas.offsetHeight - height));
        width = Math.min(width, canvasLeft + canvas.offsetWidth - x);
        height = Math.min(height, canvasTop + canvas.offsetHeight - y);
        
        this.cropData = { x, y, width, height };
        this.updateCropArea();
        this.lastMousePos = { x: e.clientX, y: e.clientY };
    }

    /**
     * 获取裁剪参数（相对于canvas的像素坐标）- 修复版
     */
    getCropParameters() {
        console.log('🔍 获取裁剪参数，cropActive状态:', this.cropActive);
        console.log('📋 保存的裁剪参数:', this.appliedCropParams);
        
        // 如果有已应用的裁剪参数，直接返回
        if (this.appliedCropParams && this.appliedCropParams.applied) {
            console.log('✅ 使用已保存的裁剪参数');
            return this.appliedCropParams;
        }
        
        // 如果正在进行裁剪操作，返回当前裁剪数据
        if (!this.cropActive) {
            console.warn('⚠️ 裁剪未激活且无保存的裁剪参数');
            return null;
        }
        
        const canvas = document.getElementById('grayscale-photo-canvas');
        if (!canvas) {
            console.error('❌ 灰度canvas未找到');
            return null;
        }
        
        if (!this.cropData) {
            console.error('❌ 裁剪数据未设置');
            return null;
        }
        
        // 获取canvas的实际显示尺寸和内部尺寸
        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = canvas.offsetParent.getBoundingClientRect();
        const canvasLeft = canvasRect.left - containerRect.left;
        const canvasTop = canvasRect.top - containerRect.top;
        
        // 计算相对于canvas显示区域的坐标
        const relativeX = this.cropData.x - canvasLeft;
        const relativeY = this.cropData.y - canvasTop;
        
        // 验证坐标在canvas显示范围内
        if (relativeX < 0 || relativeY < 0 || 
            relativeX + this.cropData.width > canvas.offsetWidth ||
            relativeY + this.cropData.height > canvas.offsetHeight) {
            console.warn('⚠️ 裁剪区域超出canvas范围');
        }
        
        // 计算缩放比例：从显示尺寸到实际图像数据尺寸
        const scaleX = this.grayscaleImageData.width / canvas.offsetWidth;
        const scaleY = this.grayscaleImageData.height / canvas.offsetHeight;
        
        // 计算实际图像数据中的裁剪区域
        const actualX = Math.max(0, Math.round(relativeX * scaleX));
        const actualY = Math.max(0, Math.round(relativeY * scaleY));
        const actualWidth = Math.min(
            Math.round(this.cropData.width * scaleX),
            this.grayscaleImageData.width - actualX
        );
        const actualHeight = Math.min(
            Math.round(this.cropData.height * scaleY),
            this.grayscaleImageData.height - actualY
        );
        
        console.log('🔧 裁剪参数计算:', {
            显示区域: { x: relativeX, y: relativeY, width: this.cropData.width, height: this.cropData.height },
            图像尺寸: { width: this.grayscaleImageData.width, height: this.grayscaleImageData.height },
            缩放比例: { scaleX, scaleY },
            实际裁剪: { x: actualX, y: actualY, width: actualWidth, height: actualHeight }
        });
        
        return {
            x: actualX,
            y: actualY,
            width: actualWidth,
            height: actualHeight
        };
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        this.hideCustomTooltip();
        this.originalImageData = null;
        this.grayscaleImageData = null;
        this.vectorData = null;
    }
}

// 导出类供全局使用
window.PhotoRecognition = PhotoRecognition;
