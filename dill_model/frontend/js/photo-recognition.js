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
        
        // 照片尺寸输入监听
        const photoWidth = document.getElementById('photo-width');
        const photoHeight = document.getElementById('photo-height');
        const photoUnit = document.getElementById('photo-unit');
        
        if (photoWidth) {
            photoWidth.addEventListener('input', () => {
                this.updateScaleFactorDisplay();
                this.validateGenerateButton();
            });
        }
        if (photoHeight) {
            photoHeight.addEventListener('input', () => {
                this.updateScaleFactorDisplay();
                this.validateGenerateButton();
            });
        }
        if (photoUnit) {
            photoUnit.addEventListener('change', () => {
                this.updateScaleFactorDisplay();
                this.validateGenerateButton();
            });
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
        
        // 2D查询按钮监听
        const lookup2DBtn = document.getElementById('lookup-2d-btn');
        if (lookup2DBtn) {
            lookup2DBtn.addEventListener('click', () => {
                console.log('🔍 2D查询按钮被点击');
                
                if (!this.vectorData || !this.vectorData.is2D) {
                    this.display2DLookupResult('请先生成2D向量数据', false);
                    return;
                }
                
                const xInput = document.getElementById('lookup-2d-x-input');
                const yInput = document.getElementById('lookup-2d-y-input');
                
                if (xInput && yInput) {
                    const xValue = parseFloat(xInput.value);
                    const yValue = parseFloat(yInput.value);
                    
                    console.log('📍 查询坐标:', { x: xValue, y: yValue });
                    
                    if (!isNaN(xValue) && !isNaN(yValue)) {
                        const intensity = this.lookupYByX(xValue, yValue);
                        console.log('📊 查询结果:', intensity);
                        
                        if (intensity !== null && intensity !== undefined) {
                            const unit = this.getCoordinateUnit();
                            this.display2DLookupResult(
                                `坐标 (${xValue}, ${yValue}) ${unit} 处的强度值: ${intensity.toFixed(6)}`,
                                true
                            );
                        } else {
                            this.display2DLookupResult('查询失败：坐标超出数据范围或数据无效', false);
                        }
                    } else {
                        this.display2DLookupResult('请输入有效的X和Y坐标值', false);
                    }
                }
            });
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
         
         // 验证生成向量按钮状态
         this.validateGenerateButton();
         
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
             
             // 验证生成向量按钮状态
             this.validateGenerateButton();
             
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
        
        // 更新缩放因子显示
        this.updateScaleFactorDisplay();
        
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
            
            // 单位转换逻辑：基于用户输入的照片实际尺寸计算缩放因子
            let scaleFactor = this.calculateScaleFactor(coordinateUnit);
            
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
            
            // 保存向量数据 - 支持1D和2D数据
            this.vectorData = {
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

            // 根据是否为2D数据来保存不同的字段
            if (result.vector_data.is2D) {
                // 2D数据
                this.vectorData.is2D = true;
                this.vectorData.x = result.vector_data.x;
                this.vectorData.y = result.vector_data.y;
                this.vectorData.intensity2D = result.vector_data.intensity2D;
                this.vectorData.width = result.vector_data.width;
                this.vectorData.height = result.vector_data.height;
                this.vectorData.scaleFactorX = result.vector_data.scaleFactorX;
                this.vectorData.scaleFactorY = result.vector_data.scaleFactorY;
                
                // 调试输出：检查2D数据的统计信息
                if (this.vectorData.intensity2D && this.vectorData.intensity2D.length > 0) {
                    let minVal = Infinity;
                    let maxVal = -Infinity;
                    let sumVal = 0;
                    let totalCount = 0;
                    let nonZeroCount = 0;
                    
                    // 避免使用扩展运算符处理大数组，改用逐行处理
                    for (let row of this.vectorData.intensity2D) {
                        for (let val of row) {
                            minVal = Math.min(minVal, val);
                            maxVal = Math.max(maxVal, val);
                            sumVal += val;
                            totalCount++;
                            if (val !== 0) nonZeroCount++;
                        }
                    }
                    
                    const avgVal = totalCount > 0 ? sumVal / totalCount : 0;
                    
                    console.log('🔍 2D数据统计信息:', {
                        尺寸: `${this.vectorData.width}×${this.vectorData.height}`,
                        总数据点: totalCount,
                        最小值: minVal,
                        最大值: maxVal,
                        平均值: avgVal.toFixed(6),
                        非零值数量: nonZeroCount,
                        零值数量: totalCount - nonZeroCount
                    });
                    
                    if (maxVal === 0) {
                        console.error('❌ 检测到所有强度值都为0！这可能是数据处理问题');
                    }
                } else {
                    console.error('❌ intensity2D数据为空或未定义');
                }
            } else {
                // 1D数据
                this.vectorData.is2D = false;
                this.vectorData.x = result.vector_data.x;
                this.vectorData.intensity = result.vector_data.intensity;
            }
            
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
                
            case '2d':
                // 2D识别：提取整个2D矩阵的强度值
                vector = [];
                for (let y = 0; y < height; y++) {
                    const row = [];
                    for (let x = 0; x < width; x++) {
                        const index = (y * width + x) * 4;
                        const grayValue = data[index]; // R通道值（灰度图中RGB相同）
                        row.push(grayValue / 255); // 归一化到0-1
                    }
                    vector.push(row);
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
            case 'moving_average':
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
        
        // 检查数据类型并绘制相应内容
        if (this.vectorData.is2D) {
            // 2D数据：显示2D数据提示
            this.draw2DDataPreview(ctx, targetWidth, targetHeight);
        } else {
            // 1D数据：绘制向量图表
            this.drawVectorChart(ctx, this.vectorData.x, this.vectorData.intensity, targetWidth, targetHeight);
        }
        
        // 更新统计信息
        const countElement = document.getElementById('vector-data-count');
        if (countElement) {
            if (this.vectorData.is2D) {
                const totalPoints = this.vectorData.width * this.vectorData.height;
                countElement.textContent = `2D数据点: ${totalPoints} (${this.vectorData.width}×${this.vectorData.height})`;
            } else {
                countElement.textContent = `数据点: ${this.vectorData.x.length}`;
            }
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
            if (this.vectorData.is2D) {
                // 2D数据：显示2D数据提示
                this.draw2DDataPreview(ctx, zoomedCanvas.width / dpr, zoomedCanvas.height / dpr);
            } else {
                // 1D数据：绘制向量图表
                this.drawVectorChart(ctx, this.vectorData.x, this.vectorData.intensity, 
                                    zoomedCanvas.width / dpr, zoomedCanvas.height / dpr);
            }
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
     * 绘制2D数据预览 - 矩形绘制热力图
     */
    draw2DDataPreview(ctx, width, height) {
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 设置背景
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#f8f9fa');
        gradient.addColorStop(1, '#e9ecef');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        const intensity2D = this.vectorData.intensity2D;
        const imgWidth = this.vectorData.width;
        const imgHeight = this.vectorData.height;
        
        // 计算显示区域
        const titleHeight = 40;
        const padding = 30;
        const footerHeight = 40;
        const colorBarWidth = 60;
        
        // 可用显示区域
        const availableWidth = width - colorBarWidth - padding * 3;
        const availableHeight = height - titleHeight - footerHeight;
        
        // 计算每个像素的显示尺寸
        const pixelWidth = availableWidth / imgWidth;
        const pixelHeight = availableHeight / imgHeight;
        const pixelSize = Math.min(pixelWidth, pixelHeight);
        
        // 实际绘制尺寸
        const drawWidth = pixelSize * imgWidth;
        const drawHeight = pixelSize * imgHeight;
        
        // 居中定位
        const startX = padding + (availableWidth - drawWidth) / 2;
        const startY = titleHeight + (availableHeight - drawHeight) / 2;
        
        // 找到强度范围
        let minIntensity = Infinity;
        let maxIntensity = -Infinity;
        
        for (let y = 0; y < imgHeight; y++) {
            for (let x = 0; x < imgWidth; x++) {
                const intensity = intensity2D[y][x];
                minIntensity = Math.min(minIntensity, intensity);
                maxIntensity = Math.max(maxIntensity, intensity);
            }
        }
        
        const range = maxIntensity - minIntensity;
        
        // 绘制每个像素为一个矩形
        for (let y = 0; y < imgHeight; y++) {
            for (let x = 0; x < imgWidth; x++) {
                const intensity = intensity2D[y][x];
                const normalizedIntensity = range > 0 ? (intensity - minIntensity) / range : 0;
                
                // 热力图配色 - 更简洁的蓝白红渐变
                let r, g, b;
                if (normalizedIntensity < 0.5) {
                    // 蓝到白
                    const t = normalizedIntensity * 2;
                    r = Math.floor(30 + t * 225);
                    g = Math.floor(144 + t * 111);
                    b = 255;
                } else {
                    // 白到红
                    const t = (normalizedIntensity - 0.5) * 2;
                    r = 255;
                    g = Math.floor(255 - t * 255);
                    b = Math.floor(255 - t * 255);
                }
                
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.fillRect(
                    startX + x * pixelSize,
                    startY + y * pixelSize,
                    pixelSize,
                    pixelSize
                );
            }
        }
        
        // 绘制边框
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, startY, drawWidth, drawHeight);
        
        // 绘制美化的色彩标尺
        const colorBarX = startX + drawWidth + 20;
        const colorBarY = startY;
        this.drawColorScale(ctx, colorBarX, colorBarY, 25, drawHeight, minIntensity, maxIntensity);
        
        // 标题
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`2D强度热力图 (${imgWidth}×${imgHeight})`, width / 2, 25);
        
        // 找到最大强度点并添加标注
        let maxIntensityX = 0, maxIntensityY = 0;
        let maxVal = -Infinity;
        
        for (let y = 0; y < imgHeight; y++) {
            for (let x = 0; x < imgWidth; x++) {
                if (intensity2D[y][x] > maxVal) {
                    maxVal = intensity2D[y][x];
                    maxIntensityX = x;
                    maxIntensityY = y;
                }
            }
        }
        
        // 绘制最大强度点标记
        const markerX = startX + maxIntensityX * pixelSize + pixelSize / 2;
        const markerY = startY + maxIntensityY * pixelSize + pixelSize / 2;
        
        // 外圈 - 白色边框
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(markerX, markerY, 8, 0, 2 * Math.PI);
        ctx.stroke();
        
        // 内圈 - 红色填充
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(markerX, markerY, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        // 中心点 - 白色
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(markerX, markerY, 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // 获取最大点的实际坐标
        const maxPointCoordX = this.vectorData.x[maxIntensityX];
        const maxPointCoordY = this.vectorData.y[maxIntensityY];
        
        // 标注文字
        const unit = this.getCoordinateUnit();
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        
        const labelText = `最大值: ${maxVal.toFixed(3)}`;
        const coordText = `(${maxPointCoordX.toFixed(2)}, ${maxPointCoordY.toFixed(2)} ${unit})`;
        
        // 计算标签位置（避免超出边界）
        let labelX = markerX;
        let labelY = markerY - 15;
        
        // 如果标记点在顶部，标签放在下方
        if (markerY < startY + 30) {
            labelY = markerY + 25;
        }
        
        // 如果标记点在左边或右边边缘，调整X位置
        if (markerX < startX + 60) {
            labelX = startX + 60;
        } else if (markerX > startX + drawWidth - 60) {
            labelX = startX + drawWidth - 60;
        }
        
        // 绘制标注文字（带描边）
        ctx.strokeText(labelText, labelX, labelY);
        ctx.fillText(labelText, labelX, labelY);
        
        ctx.strokeText(coordText, labelX, labelY + 12);
        ctx.fillText(coordText, labelX, labelY + 12);
        
        // 绘制中心点标记
        const centerX = Math.floor(imgWidth / 2);
        const centerY = Math.floor(imgHeight / 2);
        const centerMarkerX = startX + centerX * pixelSize + pixelSize / 2;
        const centerMarkerY = startY + centerY * pixelSize + pixelSize / 2;
        const centerIntensity = intensity2D[centerY][centerX];
        
        // 中心点标记 - 橙色
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerMarkerX, centerMarkerY, 6, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.arc(centerMarkerX, centerMarkerY, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // 中心点白色小点
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerMarkerX, centerMarkerY, 1.5, 0, 2 * Math.PI);
        ctx.fill();
        
        // 中心点标注文字
        const centerCoordX = this.vectorData.x[centerX];
        const centerCoordY = this.vectorData.y[centerY];
        
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        
        const centerLabelText = `中心: ${centerIntensity.toFixed(3)}`;
        const centerCoordText = `(${centerCoordX.toFixed(2)}, ${centerCoordY.toFixed(2)} ${unit})`;
        
        // 计算中心点标签位置（与最大值标签错开）
        let centerLabelX = centerMarkerX;
        let centerLabelY = centerMarkerY + 20;
        
        // 如果中心点在底部，标签放在上方
        if (centerMarkerY > startY + drawHeight - 30) {
            centerLabelY = centerMarkerY - 15;
        }
        
        // 避免与最大值标签重叠
        if (Math.abs(centerMarkerX - markerX) < 100 && Math.abs(centerMarkerY - markerY) < 50) {
            centerLabelX += (centerMarkerX > markerX) ? 50 : -50;
        }
        
        // 绘制中心点标注文字（带描边）
        ctx.strokeText(centerLabelText, centerLabelX, centerLabelY);
        ctx.fillText(centerLabelText, centerLabelX, centerLabelY);
        
        ctx.strokeText(centerCoordText, centerLabelX, centerLabelY + 10);
        ctx.fillText(centerCoordText, centerLabelX, centerLabelY + 10);
        
        // X轴坐标范围标签（底部横轴）
        ctx.font = '12px Arial';
        ctx.fillStyle = '#5a6c7d';
        ctx.textAlign = 'center';
        const xRange = `X: ${this.vectorData.x[0].toFixed(2)} ~ ${this.vectorData.x[this.vectorData.x.length-1].toFixed(2)} ${unit}`;
        ctx.fillText(xRange, startX + drawWidth / 2, startY + drawHeight + 20);
        
        // Y轴坐标范围标签（左侧纵轴，旋转显示）
        const yRange = `Y: ${this.vectorData.y[0].toFixed(2)} ~ ${this.vectorData.y[this.vectorData.y.length-1].toFixed(2)} ${unit}`;
        ctx.save();
        ctx.translate(15, startY + drawHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(yRange, 0, 0);
        ctx.restore();
    }
    
    /**
     * 获取坐标单位
     */
    getCoordinateUnit() {
        const coordinateUnitSelect = document.getElementById('coordinate-unit');
        if (coordinateUnitSelect) {
            const unit = coordinateUnitSelect.value;
            const unitLabels = {
                'pixels': 'px',
                'nm': 'nm', 
                'μm': 'μm',
                'mm': 'mm',
                'cm': 'cm',
                'm': 'm'
            };
            return unitLabels[unit] || unit;
        }
        return 'px';
    }
    
    /**
     * 绘制美化的色彩标尺
     */
    drawColorScale(ctx, x, y, width, height, minVal, maxVal) {
        // 绘制渐变条 - 蓝白红渐变
        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        gradient.addColorStop(0, 'rgb(255, 255, 255)'); // 白（高值）
        gradient.addColorStop(0.5, 'rgb(135, 206, 255)'); // 浅蓝
        gradient.addColorStop(1, 'rgb(30, 144, 255)'); // 深蓝（低值）
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);
        
        // 美化边框
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // 内阴影效果
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
        
        // 刻度线和标签
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left';
        
        // 最大值标签
        ctx.fillText(maxVal.toFixed(3), x + width + 8, y + 5);
        
        // 中间值标签
        const midVal = (maxVal + minVal) / 2;
        ctx.fillText(midVal.toFixed(3), x + width + 8, y + height/2 + 3);
        
        // 最小值标签
        ctx.fillText(minVal.toFixed(3), x + width + 8, y + height + 3);
        
        // 强度标签
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#34495e';
        ctx.textAlign = 'center';
        
        // 旋转文字绘制"强度"
        ctx.save();
        ctx.translate(x + width + 50, y + height/2); // 从35增加到50，向右移动
        ctx.rotate(-Math.PI/2);
        ctx.fillText('强度', 0, 0);
        ctx.restore();
        
        // 刻度线
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1;
        // 顶部刻度
        ctx.beginPath();
        ctx.moveTo(x + width, y);
        ctx.lineTo(x + width + 5, y);
        ctx.stroke();
        
        // 中间刻度
        ctx.beginPath();
        ctx.moveTo(x + width, y + height/2);
        ctx.lineTo(x + width + 5, y + height/2);
        ctx.stroke();
        
        // 底部刻度
        ctx.beginPath();
        ctx.moveTo(x + width, y + height);
        ctx.lineTo(x + width + 5, y + height);
        ctx.stroke();
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
        
        // 获取坐标单位
        const coordinateUnit = this.vectorData?.parameters?.coordinateUnit || 'pixels';
        const unitLabel = this.getUnitLabel(coordinateUnit);
        
        // X轴标签 - 显示具体单位
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#495057';
        ctx.fillText(`坐标位置 (${unitLabel})`, width / 2, height - 8);
        
        // Y轴标签
        ctx.save();
        ctx.translate(18, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('光强度', 0, 0);
        ctx.restore();
    }
    
    /**
     * 获取单位显示标签
     */
    getUnitLabel(unit) {
        switch (unit) {
            case 'mm':
                return 'mm';
            case 'cm':
                return 'cm';
            case 'um':
                return 'μm';
            case 'm':
                return 'm';
            case 'pixels':
            default:
                return '像素';
        }
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
                if (this.vectorData.is2D) {
                    const totalPoints = this.vectorData.width * this.vectorData.height;
                    dataCountElement.textContent = `${totalPoints.toLocaleString()} 个数据点`;
                } else {
                    dataCountElement.textContent = `${this.vectorData.x.length.toLocaleString()} 个数据点`;
                }
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
        
        // 更新表格标题
        this.updateDataTableHeaders();

        if (this.vectorData.is2D) {
            // 2D数据处理
            this.populate2DDataTable(tbody);
        } else {
            // 1D数据处理
            this.populate1DDataTable(tbody);
        }
    }
    
    /**
     * 更新数据表格标题
     */
    updateDataTableHeaders() {
        const table = document.querySelector('#vector-data-tbody').closest('table');
        if (!table) return;
        
        const thead = table.querySelector('thead tr');
        if (!thead) return;
        
        if (this.vectorData.is2D) {
            // 2D数据表头：序号, X坐标, Y坐标, 强度值
            thead.innerHTML = `
                <th>序号</th>
                <th>X坐标</th>
                <th>Y坐标</th>
                <th>光强度</th>
            `;
        } else {
            // 1D数据表头：序号, 坐标位置, 光强度
            thead.innerHTML = `
                <th>序号</th>
                <th>坐标位置</th>
                <th>光强度</th>
            `;
        }
    }
    
    /**
     * 填充1D数据表格
     */
    populate1DDataTable(tbody) {
        const xData = this.vectorData.x;
        const intensityData = this.vectorData.intensity;
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

        console.log(`📊 1D数据表格填充完成，显示 ${dataLength} 行数据`);
    }
    
    /**
     * 填充2D数据表格
     */
    populate2DDataTable(tbody) {
        const xData = this.vectorData.x;
        const yData = this.vectorData.y;
        const intensity2D = this.vectorData.intensity2D;
        
        // 计算总数据点数量
        const totalPoints = xData.length * yData.length;
        
        // 如果数据量很大，显示提示信息
        if (totalPoints > 10000) {
            const infoRow = document.createElement('tr');
            infoRow.className = 'data-info-warning';
            infoRow.innerHTML = `
                <td colspan="4" style="text-align: center; background-color: #e8f5e8; color: #2e7d2e; padding: 12px; border-radius: 6px; border-left: 4px solid #4caf50;">
                    📊 显示完整数据：${totalPoints.toLocaleString()} 个数据点<br>
                    <small style="color: #666; font-size: 11px;">数据量较大，页面滚动可能较慢，建议使用浏览器搜索功能快速定位数据</small>
                </td>
            `;
            tbody.appendChild(infoRow);
            
            // 8秒后自动消失
            setTimeout(() => {
                if (infoRow.parentNode) {
                    infoRow.style.opacity = '0';
                    setTimeout(() => {
                        if (infoRow.parentNode) {
                            infoRow.parentNode.removeChild(infoRow);
                        }
                    }, 500);
                }
            }, 8000);
        }
        
        let rowCount = 0;
        
        // 遍历所有2D数据点（完整显示）
        for (let j = 0; j < yData.length; j++) {
            for (let i = 0; i < xData.length; i++) {
                const row = document.createElement('tr');
                row.className = 'data-row';
                
                row.innerHTML = `
                    <td>${rowCount + 1}</td>
                    <td>${xData[i].toFixed(6)}</td>
                    <td>${yData[j].toFixed(6)}</td>
                    <td>${intensity2D[j][i].toFixed(6)}</td>
                `;
                
                tbody.appendChild(row);
                rowCount++;
                
                // 每1000行显示一次进度（仅在大数据量时）
                if (totalPoints > 10000 && rowCount % 1000 === 0) {
                    console.log(`📊 已渲染 ${rowCount.toLocaleString()} / ${totalPoints.toLocaleString()} 行数据...`);
                }
            }
        }
        
        console.log(`✅ 2D数据表格填充完成，显示全部 ${rowCount.toLocaleString()} 行数据`);
    }

    /**
     * 应用向量数据到系统
     */
    applyVectorData() {
        if (!this.vectorData) {
            alert('请先生成向量数据');
            return;
        }

        // 检查是否为2D数据
        if (this.vectorData.is2D) {
            alert('2D数据暂不支持应用到主系统\n请使用"数据导出"功能保存2D数据，或切换为1D识别模式。');
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
            
            // 更新缩放因子显示
            this.updateScaleFactorDisplay();
            
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
            
            // 更新缩放因子显示
            this.updateScaleFactorDisplay();
            
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
     * 导出向量数据 - 支持1D和2D数据
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
            
            // 检查是否为2D数据
            if (this.vectorData.is2D) {
                this.export2DVectorData(timestamp);
            } else {
                this.export1DVectorData(timestamp);
            }
        } catch (error) {
            console.error('❌ 数据导出失败:', error);
            alert('数据导出失败：' + error.message);
        }
    }

    /**
     * 导出1D向量数据
     */
    export1DVectorData(timestamp) {
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
        let txtContent = `# 1D照片识别向量数据导出文件
# ================================================
# 导出时间: ${timestamp}
# 数据来源: 照片识别系统
# 数据类型: 1D向量数据
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
            link.setAttribute('download', `photo_vector_data_1D_${new Date().getTime()}.txt`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ 1D向量数据导出成功（含光强标记的TXT格式）');
        }
    }

    /**
     * 导出2D向量数据
     */
    export2DVectorData(timestamp) {
        const matrix = this.vectorData.intensity2D;
        const xCoords = this.vectorData.x;
        const yCoords = this.vectorData.y;
        const width = this.vectorData.width;
        const height = this.vectorData.height;
        
        // 调试输出：检查导出时的数据状态
        if (matrix && matrix.length > 0) {
            let minVal = Infinity;
            let maxVal = -Infinity;
            let totalCount = 0;
            let nonZeroCount = 0;
            
            // 避免堆栈溢出，逐行处理而非使用扩展运算符
            for (let row of matrix) {
                for (let val of row) {
                    minVal = Math.min(minVal, val);
                    maxVal = Math.max(maxVal, val);
                    totalCount++;
                    if (val !== 0) nonZeroCount++;
                }
            }
            
            console.log('📤 导出2D数据统计:', {
                尺寸: `${width}×${height}`,
                最小值: minVal,
                最大值: maxVal,
                非零值数量: nonZeroCount,
                总数据点: totalCount
            });
            
            if (maxVal === 0) {
                console.warn('⚠️ 导出数据全为0值！');
            }
        } else {
            console.error('❌ 导出时matrix为空或未定义');
        }

        // 计算2D统计信息（避免堆栈溢出）
        let intensityMin = Infinity;
        let intensityMax = -Infinity;
        let intensitySum = 0;
        let totalPoints = 0;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const val = matrix[y][x];
                intensityMin = Math.min(intensityMin, val);
                intensityMax = Math.max(intensityMax, val);
                intensitySum += val;
                totalPoints++;
            }
        }
        
        const avgIntensity = totalPoints > 0 ? intensitySum / totalPoints : 0;
        
        // 安全地计算坐标范围
        const xMin = xCoords.length > 0 ? Math.min.apply(null, xCoords) : 0;
        const xMax = xCoords.length > 0 ? Math.max.apply(null, xCoords) : 0;
        const yMin = yCoords.length > 0 ? Math.min.apply(null, yCoords) : 0;
        const yMax = yCoords.length > 0 ? Math.max.apply(null, yCoords) : 0;

        // 创建TXT格式的数据，包含详细注释
        let txtContent = `# 2D照片识别向量数据导出文件
# ================================================
# 导出时间: ${timestamp}
# 数据来源: 照片识别系统
# 数据类型: 2D向量数据（完整强度矩阵）
# 
# 2D数据统计信息:
# - 图像尺寸: ${width} × ${height} 像素
# - 总数据点: ${width * height} 个
# - X坐标范围: ${xMin.toFixed(6)} 至 ${xMax.toFixed(6)}
# - Y坐标范围: ${yMin.toFixed(6)} 至 ${yMax.toFixed(6)}
# - 光强度范围: ${intensityMin.toFixed(6)} 至 ${intensityMax.toFixed(6)}
# - 平均光强度: ${avgIntensity.toFixed(6)}
# 
# 处理参数:
# - 灰度转换方法: ${this.vectorData.parameters.grayscaleMethod}
# - 向量提取方向: 2D识别（完整矩阵）
# - 坐标单位: ${this.vectorData.parameters.coordinateUnit}
# - X方向缩放因子: ${this.vectorData.scaleFactorX}
# - Y方向缩放因子: ${this.vectorData.scaleFactorY}
# ================================================
# 
# 数据格式说明:
# 第1列: X坐标 (${this.vectorData.parameters.coordinateUnit})
# 第2列: Y坐标 (${this.vectorData.parameters.coordinateUnit})
# 第3列: 归一化光强度值 (0-1范围)
# 
# 数据内容:
${' '.repeat(15)}X坐标${' '.repeat(15)}Y坐标${' '.repeat(12)}强度值
${'-'.repeat(70)}
`;

        // 添加2D数据行，每行包含X、Y坐标和对应的强度值
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const xValue = xCoords[x].toFixed(6).padStart(20);
                const yValue = yCoords[y].toFixed(6).padStart(20);
                const intensityValue = matrix[y][x].toFixed(6).padStart(15);
                
                txtContent += `${xValue}    ${yValue}    ${intensityValue}\n`;
            }
        }
        
        // 添加文件尾部信息
        txtContent += `\n${'-'.repeat(70)}\n`;
        txtContent += `# 2D数据导出完成，共 ${width * height} 个数据点\n`;
        txtContent += `# 矩阵尺寸: ${width} × ${height}\n`;
        txtContent += `# 文件生成时间: ${timestamp}\n`;
        txtContent += `# ================================================`;

        // 创建下载链接
        const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `photo_vector_data_2D_${new Date().getTime()}.txt`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ 2D向量数据导出成功（完整强度矩阵TXT格式）');
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
        
        // 验证生成向量按钮状态（清除数据后应禁用按钮）
        this.validateGenerateButton();
        
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

        // 更新缩放因子显示
        this.updateScaleFactorDisplay();

        // 更新坐标查询界面的单位标签
        this.updateLookupUnitLabels();
    }

    /**
     * 更新坐标查询界面的单位标签 - 支持1D和2D
     */
    updateLookupUnitLabels() {
        const currentUnit = document.getElementById('coordinate-unit')?.value || 'pixels';
        const unitLabel = this.getUnitLabel(currentUnit);

        // 更新1D查询界面的单位标签
        const xUnitLabel = document.getElementById('lookup-x-unit-label');
        const yUnitLabel = document.getElementById('lookup-y-unit-label');

        if (xUnitLabel) {
            xUnitLabel.textContent = unitLabel;
        }

        if (yUnitLabel) {
            yUnitLabel.textContent = '强度'; // Y输入始终是光强度，无单位
        }

        // 更新2D查询界面的单位标签
        const lookup2DXUnitLabel = document.getElementById('lookup-2d-x-unit-label');
        const lookup2DYUnitLabel = document.getElementById('lookup-2d-y-unit-label');

        if (lookup2DXUnitLabel) {
            lookup2DXUnitLabel.textContent = unitLabel;
        }

        if (lookup2DYUnitLabel) {
            lookup2DYUnitLabel.textContent = unitLabel; // 2D中Y坐标也是空间坐标，使用相同单位
        }
    }

    /**
     * 验证生成向量按钮的可用性
     */
    validateGenerateButton() {
        const generateBtn = document.getElementById('generate-vector-btn');
        const photoWidth = document.getElementById('photo-width');
        const photoHeight = document.getElementById('photo-height');
        
        if (!generateBtn || !photoWidth || !photoHeight) return;
        
        const width = parseFloat(photoWidth.value);
        const height = parseFloat(photoHeight.value);
        const hasImage = this.originalImageData !== null;
        
        // 检查是否有图像数据且输入了有效的长宽
        const isValid = hasImage && !isNaN(width) && !isNaN(height) && width > 0 && height > 0;
        
        if (isValid) {
            // 启用按钮
            generateBtn.disabled = false;
            generateBtn.style.opacity = '1';
            generateBtn.style.cursor = 'pointer';
            generateBtn.style.backgroundColor = '';
            generateBtn.title = '';
        } else {
            // 禁用按钮
            generateBtn.disabled = true;
            generateBtn.style.opacity = '0.5';
            generateBtn.style.cursor = 'not-allowed';
            generateBtn.style.backgroundColor = '#cccccc';
            
            if (!hasImage) {
                generateBtn.title = '请先上传或拍摄照片';
            } else {
                generateBtn.title = '请先输入照片的实际长宽尺寸';
            }
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
     * 更新缩放因子显示
     */
    updateScaleFactorDisplay() {
        const scaleFactorDisplay = document.getElementById('scale-factor-display');
        if (!scaleFactorDisplay) return;
        
        const photoWidth = parseFloat(document.getElementById('photo-width')?.value);
        const photoHeight = parseFloat(document.getElementById('photo-height')?.value);
        const photoUnit = document.getElementById('photo-unit')?.value || 'mm';
        const coordinateUnit = document.getElementById('coordinate-unit')?.value || 'pixels';
        
        // 检查图像数据，优先使用grayscaleImageData，其次originalImageData
        const imageData = this.grayscaleImageData || this.originalImageData;
        
        const hasAllData = photoWidth && photoHeight && imageData;
        
        if (!hasAllData) {
            // 缺少必要数据 - 添加呼吸灯效果
            scaleFactorDisplay.classList.add('scale-factor-breathing');
            
            // 设置提示文本
            let missingItems = [];
            if (!imageData) missingItems.push('图像');
            if (!photoWidth || !photoHeight) missingItems.push('照片尺寸');
            
            scaleFactorDisplay.textContent = `请先设置${missingItems.join('和')}`;
            scaleFactorDisplay.style.color = '#3498db';
            return;
        }
        
        // 有完整数据 - 移除呼吸灯效果
        scaleFactorDisplay.classList.remove('scale-factor-breathing');
        
        const imageWidthPx = imageData.width;
        const photoWidthInTargetUnit = this.convertUnit(photoWidth, photoUnit, coordinateUnit);
        const scaleFactor = photoWidthInTargetUnit / imageWidthPx;
        
        const unitLabel = this.getUnitLabel(coordinateUnit);
        scaleFactorDisplay.textContent = `${scaleFactor.toFixed(6)} ${unitLabel}/像素`;
        scaleFactorDisplay.style.color = '#374151';
        
        console.log('📏 缩放因子显示已更新:', {
            照片尺寸: `${photoWidth}×${photoHeight} ${photoUnit}`,
            图像像素: `${imageWidthPx}px`,
            目标单位: coordinateUnit,
            缩放因子: scaleFactor
        });
    }
    
    /**
     * 根据用户输入的照片实际尺寸计算缩放因子
     * @param {string} coordinateUnit - 坐标单位
     * @returns {number} 缩放因子
     */
    calculateScaleFactor(coordinateUnit) {
        // 获取用户输入的照片实际尺寸
        const photoWidth = parseFloat(document.getElementById('photo-width')?.value);
        const photoHeight = parseFloat(document.getElementById('photo-height')?.value);
        const photoUnit = document.getElementById('photo-unit')?.value || 'mm';
        
        // 获取图像的像素尺寸，优先使用grayscaleImageData，其次originalImageData
        const imageData = this.grayscaleImageData || this.originalImageData;
        if (!imageData) {
            console.warn('⚠️ 图像数据不可用，使用默认缩放因子');
            return this.getDefaultScaleFactor(coordinateUnit);
        }
        
        const imageWidthPx = imageData.width;
        const imageHeightPx = imageData.height;
        
        // 如果用户没有输入照片尺寸，使用默认值
        if (!photoWidth || !photoHeight) {
            console.warn('⚠️ 用户未输入照片实际尺寸，使用默认缩放因子');
            return this.getDefaultScaleFactor(coordinateUnit);
        }
        
        // 将照片尺寸单位转换为目标单位
        const photoWidthInTargetUnit = this.convertUnit(photoWidth, photoUnit, coordinateUnit);
        const photoHeightInTargetUnit = this.convertUnit(photoHeight, photoUnit, coordinateUnit);
        
        // 计算缩放因子：使用宽度来计算
        const scaleFactor = photoWidthInTargetUnit / imageWidthPx;
        
        console.log('📏 基于用户输入计算缩放因子:', {
            照片实际宽度: `${photoWidth} ${photoUnit}`,
            照片实际高度: `${photoHeight} ${photoUnit}`,
            图像像素宽度: `${imageWidthPx}px`,
            图像像素高度: `${imageHeightPx}px`,
            目标单位: coordinateUnit,
            转换后宽度: `${photoWidthInTargetUnit} ${coordinateUnit}`,
            缩放因子: scaleFactor
        });
        
        return scaleFactor;
    }
    
    /**
     * 获取默认缩放因子
     */
    getDefaultScaleFactor(coordinateUnit) {
        switch (coordinateUnit) {
            case 'mm':
                return 0.1; // 1像素 = 0.1毫米
            case 'um':
                return 100; // 1像素 = 100微米
            case 'cm':
                return 0.01; // 1像素 = 0.01厘米
            case 'm':
                return 0.0001; // 1像素 = 0.0001米
            case 'pixels':
            default:
                return 1; // 保持像素单位
        }
    }
    
    /**
     * 单位转换函数
     */
    convertUnit(value, fromUnit, toUnit) {
        if (fromUnit === toUnit) {
            return value;
        }
        
        // 所有单位先转换为毫米
        let valueInMm;
        switch (fromUnit) {
            case 'mm':
                valueInMm = value;
                break;
            case 'cm':
                valueInMm = value * 10;
                break;
            case 'um':
                valueInMm = value / 1000;
                break;
            case 'm':
                valueInMm = value * 1000;
                break;
            default:
                valueInMm = value;
        }
        
        // 从毫米转换为目标单位
        switch (toUnit) {
            case 'mm':
                return valueInMm;
            case 'cm':
                return valueInMm / 10;
            case 'um':
                return valueInMm * 1000;
            case 'm':
                return valueInMm / 1000;
            case 'pixels':
                return valueInMm; // 像素单位保持数值不变
            default:
                return valueInMm;
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
            // 先滚动到图片预览区域，然后再启用交互式裁剪
            this.scrollToImagePreview(() => {
                // 隐藏其他高亮元素，只保留裁剪相关区域
                this.hideCropModeHighlights();
                // 延迟启用交互式裁剪，确保滚动完成
                setTimeout(() => {
                    this.enableInteractiveCrop();
                }, 300);
            });
        } else if (cropMode === 'center') {
            this.disableInteractiveCrop();
            this.restoreCropModeHighlights();
            // 应用中心裁剪预览
            this.applyCenterCropPreview();
        } else {
            this.disableInteractiveCrop();
            this.restoreCropModeHighlights();
            // 恢复原始图像显示
            this.restoreOriginalImageDisplay();
        }
        
        // 更新缩放因子显示，因为裁剪模式切换可能改变图像尺寸
        setTimeout(() => {
            this.updateScaleFactorDisplay();
        }, 100);
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
     * 只显示灰度图用于裁剪 - 优化版
     */
    showOnlyGrayscaleForCrop() {
        const imageContainer = document.querySelector('.image-preview-container');
        const originalColumn = imageContainer?.querySelector('.image-column:first-child');
        const grayscaleColumn = imageContainer?.querySelector('.image-column:last-child');
        
        if (!imageContainer || !originalColumn || !grayscaleColumn) return;
        
        console.log('🎨 启动双图合并动画...');
        
        // 添加标题过渡效果
        const grayscaleTitle = grayscaleColumn.querySelector('h5');
        if (grayscaleTitle) {
            grayscaleTitle.classList.add('title-transition');
        }
        
        // 使用requestAnimationFrame确保DOM更新后再开始动画
        requestAnimationFrame(() => {
            this.startMergeAnimation(imageContainer, originalColumn, grayscaleColumn, grayscaleTitle);
        });
    }

    /**
     * 开始合并动画 - 优化版，使用CSS动画事件
     */
    startMergeAnimation(imageContainer, originalColumn, grayscaleColumn, grayscaleTitle) {
        // 监听原始图列淡出动画完成
        const handleFadeOutEnd = (e) => {
            if (e.target === originalColumn && e.animationName === 'fadeSlideOut') {
                originalColumn.removeEventListener('animationend', handleFadeOutEnd);
                this.completeMergeAnimation(imageContainer, originalColumn, grayscaleColumn, grayscaleTitle);
            }
        };
        
        // 监听容器合并动画完成
        const handleMergeEnd = (e) => {
            if (e.target === imageContainer && e.animationName === 'mergeToSingle') {
                imageContainer.removeEventListener('animationend', handleMergeEnd);
                this.finalizeMergeAnimation(grayscaleColumn, grayscaleTitle);
            }
        };
        
        originalColumn.addEventListener('animationend', handleFadeOutEnd);
        imageContainer.addEventListener('animationend', handleMergeEnd);
        
        // 同时开始多个动画以增强视觉效果
        originalColumn.classList.add('column-fade-out');
        imageContainer.classList.add('crop-mode-transition', 'crop-mode-single');
        
        // 延迟启动灰度图聚焦效果，在原始图开始淡出后
        setTimeout(() => {
            grayscaleColumn.classList.add('grayscale-column-focus');
        }, 150);
    }

    /**
     * 完成合并动画 - 隐藏原始图列并调整布局
     */
    completeMergeAnimation(imageContainer, originalColumn, grayscaleColumn, grayscaleTitle) {
        originalColumn.style.display = 'none';
        originalColumn.classList.remove('column-fade-out');
        
        // 调整布局
        imageContainer.style.gridTemplateColumns = '1fr';
        imageContainer.style.justifyContent = 'center';
        grayscaleColumn.style.maxWidth = '600px';
        grayscaleColumn.style.margin = '0 auto';
        
        // 更新标题
        if (grayscaleTitle) {
            grayscaleTitle.textContent = '裁剪区域选择';
            grayscaleTitle.classList.add('title-highlight');
        }
    }

    /**
     * 完成合并动画的最后步骤
     */
    finalizeMergeAnimation(grayscaleColumn, grayscaleTitle) {
        // 移除标题高亮效果
        if (grayscaleTitle) {
            setTimeout(() => {
                grayscaleTitle.classList.remove('title-highlight');
            }, 400);
        }
        
        // 保持灰度图的聚焦效果一段时间后移除
        setTimeout(() => {
            if (grayscaleColumn) {
                grayscaleColumn.classList.remove('grayscale-column-focus');
            }
        }, 800);
        
        console.log('✅ 双图→单图合并动画完成');
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
        
        // 恢复所有输入框的高亮状态（如果还没有恢复的话）
        this.restoreCropModeHighlights();
        
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
     * 恢复原始双图布局 - 优化版
     */
    restoreOriginalLayout() {
        const imageContainer = document.querySelector('.image-preview-container');
        const originalColumn = imageContainer?.querySelector('.image-column:first-child');
        const grayscaleColumn = imageContainer?.querySelector('.image-column:last-child');
        
        if (!imageContainer || !originalColumn || !grayscaleColumn) return;
        
        console.log('🎨 启动单图分离动画...');
        
        // 添加标题过渡效果
        const grayscaleTitle = grayscaleColumn.querySelector('h5');
        if (grayscaleTitle) {
            grayscaleTitle.classList.add('title-transition');
        }
        
        // 立即准备布局变化
        this.prepareLayoutRestore(imageContainer, originalColumn, grayscaleColumn);
        
        // 使用requestAnimationFrame确保DOM更新后再开始动画
        requestAnimationFrame(() => {
            this.startRestoreAnimation(imageContainer, originalColumn, grayscaleColumn, grayscaleTitle);
        });
    }

    /**
     * 准备布局恢复 - 减少DOM操作
     */
    prepareLayoutRestore(imageContainer, originalColumn, grayscaleColumn) {
        // 清理之前的动画类
        imageContainer.classList.remove('crop-mode-single', 'crop-mode-transition');
        
        // 重置内联样式，让CSS接管
        imageContainer.style.gridTemplateColumns = '';
        imageContainer.style.justifyContent = '';
        grayscaleColumn.style.maxWidth = '';
        grayscaleColumn.style.margin = '';
        
        // 准备原始图列
        originalColumn.style.display = 'block';
        originalColumn.style.opacity = '0';
    }

    /**
     * 开始恢复动画 - 使用CSS动画事件
     */
    startRestoreAnimation(imageContainer, originalColumn, grayscaleColumn, grayscaleTitle) {
        // 添加过渡类
        imageContainer.classList.add('crop-mode-transition');
        
        // 监听动画完成事件
        const handleAnimationEnd = (e) => {
            if (e.target === imageContainer && e.animationName === 'splitToDouble') {
                imageContainer.removeEventListener('animationend', handleAnimationEnd);
                this.completeLayoutRestore(imageContainer, originalColumn, grayscaleTitle);
            }
        };
        
        imageContainer.addEventListener('animationend', handleAnimationEnd);
        
        // 开始分离动画
        imageContainer.classList.add('crop-mode-double');
        
        // 在动画开始后立即开始原始图列的淡入
        setTimeout(() => {
            originalColumn.classList.add('column-fade-in');
            originalColumn.style.opacity = '1';
        }, 50);
    }

    /**
     * 完成布局恢复 - 清理动画类
     */
    completeLayoutRestore(imageContainer, originalColumn, grayscaleTitle) {
        const grayscaleColumn = imageContainer?.querySelector('.image-column:last-child');
        
        // 清理动画类
        originalColumn.classList.remove('column-fade-in');
        imageContainer.classList.remove('crop-mode-transition', 'crop-mode-double');
        
        // 清理灰度图的聚焦效果
        if (grayscaleColumn) {
            grayscaleColumn.classList.remove('grayscale-column-focus');
        }
        
        // 恢复标题
        if (grayscaleTitle) {
            grayscaleTitle.textContent = '灰度预览';
            grayscaleTitle.style.color = '';
            grayscaleTitle.style.fontWeight = '';
            grayscaleTitle.classList.remove('title-transition', 'title-highlight');
        }
        
        console.log('✅ 单图→双图分离动画完成');
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
    
    // 恢复所有输入框的高亮状态
    this.restoreCropModeHighlights();
    
    // 更新照片尺寸（按裁剪比例）
    this.updatePhotoDimensionsAfterCrop(safeWidth, safeHeight, maxWidth, maxHeight);
    
    console.log('🎉 灰度预览已更新为裁剪后的图像');
    }

    /**
     * 裁剪后按比例更新照片实际尺寸
     */
    updatePhotoDimensionsAfterCrop(croppedWidth, croppedHeight, originalWidth, originalHeight) {
        const photoWidthInput = document.getElementById('photo-width');
        const photoHeightInput = document.getElementById('photo-height');
        
        if (!photoWidthInput || !photoHeightInput) return;
        
        const currentWidth = parseFloat(photoWidthInput.value);
        const currentHeight = parseFloat(photoHeightInput.value);
        
        // 如果用户没有设置原始尺寸，则不更新
        if (!currentWidth || !currentHeight) return;
        
        // 计算裁剪比例
        const widthRatio = croppedWidth / originalWidth;
        const heightRatio = croppedHeight / originalHeight;
        
        // 按比例更新照片尺寸
        const newWidth = currentWidth * widthRatio;
        const newHeight = currentHeight * heightRatio;
        
        photoWidthInput.value = newWidth.toFixed(3);
        photoHeightInput.value = newHeight.toFixed(3);
        
        // 更新缩放因子显示
        this.updateScaleFactorDisplay();
        
        console.log('📐 照片尺寸已按裁剪比例更新:', {
            裁剪比例: `${(widthRatio * 100).toFixed(1)}% × ${(heightRatio * 100).toFixed(1)}%`,
            原始尺寸: `${currentWidth} × ${currentHeight}`,
            新尺寸: `${newWidth.toFixed(3)} × ${newHeight.toFixed(3)}`,
            像素变化: `${originalWidth}×${originalHeight} → ${croppedWidth}×${croppedHeight}`
        });
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
     * 滚动到图片预览区域
     */
    scrollToImagePreview(callback) {
        console.log('📍 滚动到图片预览区域...');
        
        // 优先寻找图片预览标题作为滚动目标
        const previewTitle = document.getElementById('photo-preview-title');
        const imageContainer = document.querySelector('.image-preview-container');
        
        let targetElement = previewTitle || imageContainer;
        
        if (!targetElement) {
            console.warn('⚠️  图片预览区域未找到');
            if (callback) callback();
            return;
        }
        
        // 计算滚动位置，确保预览区域在视窗中央偏上的位置
        const rect = targetElement.getBoundingClientRect();
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetTop = rect.top + currentScrollTop;
        
        // 调整偏移量：让图片预览区域显示在视窗的适中位置
        const viewportHeight = window.innerHeight;
        const scrollToPosition = targetTop - (viewportHeight * 0.08); // 视窗高度的8%处，位置更靠下
        
        console.log('📐 滚动计算:', {
            目标元素: targetElement.id || targetElement.className,
            元素顶部: targetTop,
            视窗高度: viewportHeight,
            滚动位置: scrollToPosition
        });
        
        // 使用平滑滚动
        window.scrollTo({
            top: Math.max(0, scrollToPosition), // 确保不会滚动到负数位置
            behavior: 'smooth'
        });
        
        // 等待滚动完成后执行回调
        setTimeout(() => {
            console.log('✅ 滚动到图片预览区域完成');
            if (callback) callback();
        }, 800); // 给足够时间让滚动动画完成
    }

    /**
     * 隐藏裁剪模式下的其他高亮元素
     */
    hideCropModeHighlights() {
        console.log('🔒 隐藏裁剪模式下的其他高亮元素...');
        
        // 隐藏图像处理参数区域的高亮
        const processingParams = document.getElementById('photo-processing-params');
        if (processingParams) {
            processingParams.classList.add('crop-mode-dimmed');
        }
        
        // 隐藏照片尺寸设置区域的高亮  
        const dimensionsSection = document.querySelector('.photo-dimensions-section');
        if (dimensionsSection) {
            dimensionsSection.classList.add('crop-mode-dimmed');
        }
        
        // 高亮裁剪相关的元素
        const cropOverlay = document.getElementById('crop-overlay');
        const confirmContainer = document.getElementById('crop-confirm-container');
        
        if (cropOverlay) {
            cropOverlay.classList.add('crop-mode-highlight');
        }
        
        if (confirmContainer) {
            confirmContainer.classList.add('crop-mode-highlight');
        }
        
        console.log('✅ 裁剪模式高亮设置完成');
    }

    /**
     * 恢复裁剪模式下隐藏的高亮元素
     */
    restoreCropModeHighlights() {
        console.log('🔓 恢复其他高亮元素...');
        
        // 恢复图像处理参数区域
        const processingParams = document.getElementById('photo-processing-params');
        if (processingParams && processingParams.classList.contains('crop-mode-dimmed')) {
            processingParams.classList.remove('crop-mode-dimmed');
        }
        
        // 恢复照片尺寸设置区域
        const dimensionsSection = document.querySelector('.photo-dimensions-section');
        if (dimensionsSection && dimensionsSection.classList.contains('crop-mode-dimmed')) {
            dimensionsSection.classList.remove('crop-mode-dimmed');
        }
        
        // 移除裁剪高亮
        const cropOverlay = document.getElementById('crop-overlay');
        const confirmContainer = document.getElementById('crop-confirm-container');
        
        if (cropOverlay && cropOverlay.classList.contains('crop-mode-highlight')) {
            cropOverlay.classList.remove('crop-mode-highlight');
        }
        
        if (confirmContainer && confirmContainer.classList.contains('crop-mode-highlight')) {
            confirmContainer.classList.remove('crop-mode-highlight');
        }
        
        console.log('✅ 高亮元素恢复完成');
    }

    /**
     * 计算高斯分布参数
     */
    calculateGaussianParams() {
        if (!this.vectorData) {
            console.error('没有可用的向量数据');
            return null;
        }

        // 检查是否为2D数据
        const is2D = this.vectorData.is2D || false;
        
        if (is2D) {
            // 处理2D高斯拟合
            return this.calculate2DGaussianParams();
        } else {
            // 处理1D高斯拟合
            if (!this.vectorData.x || !this.vectorData.intensity) {
                console.error('没有可用的1D向量数据');
                return null;
            }
            return this.calculate1DGaussianParams();
        }
    }
    
    /**
     * 计算1D高斯参数
     */
    calculate1DGaussianParams() {
        const x = this.vectorData.x;
        const y = this.vectorData.intensity;

        // 找到最大值及其位置（均值 μ）
        let maxY = Math.max(...y);
        let maxIndex = y.indexOf(maxY);
        let mu = x[maxIndex];

        // 计算半高全宽（FWHM）来估算标准差
        let halfMax = maxY / 2;
        let leftIndex = -1, rightIndex = -1;

        // 从最大值位置向左找半高位置
        for (let i = maxIndex; i >= 0; i--) {
            if (y[i] <= halfMax) {
                leftIndex = i;
                break;
            }
        }

        // 从最大值位置向右找半高位置
        for (let i = maxIndex; i < y.length; i++) {
            if (y[i] <= halfMax) {
                rightIndex = i;
                break;
            }
        }

        // 计算FWHM和标准差
        let fwhm = 0;
        if (leftIndex >= 0 && rightIndex >= 0) {
            // 线性插值找到更精确的半高位置
            let leftX = this.interpolateHalfMax(x, y, leftIndex, leftIndex + 1, halfMax);
            let rightX = this.interpolateHalfMax(x, y, rightIndex - 1, rightIndex, halfMax);
            fwhm = Math.abs(rightX - leftX);
        } else if (rightIndex >= 0) {
            fwhm = 2 * Math.abs(x[rightIndex] - mu);
        } else if (leftIndex >= 0) {
            fwhm = 2 * Math.abs(mu - x[leftIndex]);
        }

        // 高斯分布: FWHM = 2.355 * σ (2*sqrt(2*ln(2)) ≈ 2.3548)
        let sigma = fwhm / 2.3548;

        // 振幅 A
        let amplitude = maxY;

        return {
            amplitude: amplitude,
            mu: mu,
            sigma: sigma,
            fwhm: fwhm,
            formula: `f(x) = ${amplitude.toFixed(3)} * exp(-(x - ${mu.toFixed(3)})² / (2 * ${sigma.toFixed(3)}²))`
        };
    }
    
    /**
     * 计算2D高斯参数
     */
    calculate2DGaussianParams() {
        if (!this.vectorData.intensity2D) {
            console.error('没有可用的2D强度数据');
            return null;
        }

        const matrix = this.vectorData.intensity2D;
        const height = matrix.length;
        const width = matrix[0].length;

        // 找到2D矩阵中的最大值及其位置
        let maxValue = 0;
        let maxX = 0, maxY = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (matrix[y][x] > maxValue) {
                    maxValue = matrix[y][x];
                    maxX = x;
                    maxY = y;
                }
            }
        }

        // 计算X方向的半高全宽（FWHM_x）
        let halfMax = maxValue / 2;
        let leftX = -1, rightX = -1;
        
        // 沿最大值行查找X方向半高位置
        for (let x = maxX; x >= 0; x--) {
            if (matrix[maxY][x] <= halfMax) {
                leftX = x;
                break;
            }
        }
        for (let x = maxX; x < width; x++) {
            if (matrix[maxY][x] <= halfMax) {
                rightX = x;
                break;
            }
        }

        // 计算Y方向的半高全宽（FWHM_y）
        let topY = -1, bottomY = -1;
        
        // 沿最大值列查找Y方向半高位置
        for (let y = maxY; y >= 0; y--) {
            if (matrix[y][maxX] <= halfMax) {
                topY = y;
                break;
            }
        }
        for (let y = maxY; y < height; y++) {
            if (matrix[y][maxX] <= halfMax) {
                bottomY = y;
                break;
            }
        }

        // 计算FWHM和标准差
        let fwhmX = 0, fwhmY = 0;
        if (leftX >= 0 && rightX >= 0) {
            fwhmX = rightX - leftX;
        }
        if (topY >= 0 && bottomY >= 0) {
            fwhmY = bottomY - topY;
        }

        // 高斯分布: FWHM = 2.355 * σ
        let sigmaX = fwhmX / 2.3548;
        let sigmaY = fwhmY / 2.3548;

        // 中心位置（相对于图像中心）
        const centerX = (maxX - width/2) * (this.vectorData.scaleFactorX || 1);
        const centerY = (maxY - height/2) * (this.vectorData.scaleFactorY || 1);

        return {
            amplitude: maxValue,
            centerX: centerX,
            centerY: centerY,
            sigmaX: sigmaX,
            sigmaY: sigmaY,
            fwhmX: fwhmX,
            fwhmY: fwhmY,
            formula: `f(x,y) = ${maxValue.toFixed(3)} * exp(-((x - ${centerX.toFixed(3)})² / (2 * ${sigmaX.toFixed(3)}²) + (y - ${centerY.toFixed(3)})² / (2 * ${sigmaY.toFixed(3)}²)))`
        };
    }

    /**
     * 线性插值找半高位置
     */
    interpolateHalfMax(x, y, i1, i2, halfMax) {
        if (i1 < 0 || i2 >= x.length) return x[Math.max(0, Math.min(i1, i2, x.length - 1))];

        let x1 = x[i1], x2 = x[i2];
        let y1 = y[i1], y2 = y[i2];

        if (y1 === y2) return (x1 + x2) / 2;

        // 线性插值
        return x1 + (halfMax - y1) * (x2 - x1) / (y2 - y1);
    }

    /**
     * 根据X值查找Y值（光强度）- 支持1D和2D数据
     */
    lookupYByX(targetX, targetY = null) {
        if (!this.vectorData) {
            return null;
        }

        // 检查是否为2D数据
        if (this.vectorData.is2D) {
            return this.lookup2DIntensity(targetX, targetY);
        }

        // 1D数据处理
        if (!this.vectorData.x || !this.vectorData.intensity) {
            return null;
        }

        const x = this.vectorData.x;
        const y = this.vectorData.intensity;

        // 获取当前坐标单位和图表数据单位
        const currentUnit = document.getElementById('coordinate-unit')?.value || 'pixels';
        const chartUnit = this.vectorData?.parameters?.coordinateUnit || 'pixels';

        // 将输入的X值转换为图表数据的单位
        let convertedTargetX = targetX;
        if (currentUnit !== chartUnit) {
            convertedTargetX = this.convertUnit(targetX, currentUnit, chartUnit);
        }

        // 找到最接近的两个点进行线性插值
        let closestIndex = 0;
        let minDiff = Math.abs(x[0] - convertedTargetX);

        for (let i = 1; i < x.length; i++) {
            let diff = Math.abs(x[i] - convertedTargetX);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }

        // 如果非常接近某个点，直接返回该点的值
        if (minDiff < 0.001) {
            return y[closestIndex];
        }

        // 线性插值
        if (convertedTargetX < x[closestIndex]) {
            if (closestIndex === 0) return y[0];
            let x1 = x[closestIndex - 1], x2 = x[closestIndex];
            let y1 = y[closestIndex - 1], y2 = y[closestIndex];
            return y1 + (convertedTargetX - x1) * (y2 - y1) / (x2 - x1);
        } else {
            if (closestIndex === x.length - 1) return y[closestIndex];
            let x1 = x[closestIndex], x2 = x[closestIndex + 1];
            let y1 = y[closestIndex], y2 = y[closestIndex + 1];
            return y1 + (convertedTargetX - x1) * (y2 - y1) / (x2 - x1);
        }
    }

    /**
     * 2D数据强度查询
     */
    lookup2DIntensity(targetX, targetY) {
        if (!this.vectorData || !this.vectorData.intensity2D) {
            console.warn('⚠️ 没有可用的2D数据');
            return null;
        }

        if (targetY === null || targetY === undefined) {
            console.error('❌ 2D数据查询需要提供X和Y坐标');
            return null;
        }

        const matrix = this.vectorData.intensity2D;
        const xCoords = this.vectorData.x;
        const yCoords = this.vectorData.y;
        
        // 数据有效性检查
        if (!matrix || matrix.length === 0 || !matrix[0] || matrix[0].length === 0) {
            console.error('❌ 2D强度矩阵数据无效');
            return null;
        }
        
        if (!xCoords || !yCoords || xCoords.length === 0 || yCoords.length === 0) {
            console.error('❌ 坐标数据无效');
            return null;
        }

        // 获取当前坐标单位和图表数据单位
        const currentUnit = document.getElementById('coordinate-unit')?.value || 'pixels';
        const chartUnit = this.vectorData?.parameters?.coordinateUnit || 'pixels';

        // 转换坐标单位
        let convertedTargetX = targetX;
        let convertedTargetY = targetY;
        if (currentUnit !== chartUnit) {
            convertedTargetX = this.convertUnit(targetX, currentUnit, chartUnit);
            convertedTargetY = this.convertUnit(targetY, currentUnit, chartUnit);
        }

        console.log('🔍 坐标转换:', {
            原始坐标: `(${targetX}, ${targetY}) ${currentUnit}`,
            转换后坐标: `(${convertedTargetX}, ${convertedTargetY}) ${chartUnit}`,
            数据范围X: `${xCoords[0]} ~ ${xCoords[xCoords.length-1]}`,
            数据范围Y: `${yCoords[0]} ~ ${yCoords[yCoords.length-1]}`
        });

        // 找到最接近的X和Y索引
        let xIndex = this.findClosestIndex(xCoords, convertedTargetX);
        let yIndex = this.findClosestIndex(yCoords, convertedTargetY);

        // 边界检查
        if (xIndex < 0 || xIndex >= matrix[0].length || yIndex < 0 || yIndex >= matrix.length) {
            console.warn('⚠️ 坐标超出数据范围:', {
                xIndex, yIndex,
                矩阵尺寸: `${matrix.length} × ${matrix[0].length}`
            });
            return null;
        }

        // 返回该位置的强度值
        const intensity = matrix[yIndex][xIndex];
        console.log('✅ 查询成功:', {
            索引: `[${yIndex}][${xIndex}]`,
            实际坐标: `(${xCoords[xIndex]}, ${yCoords[yIndex]})`,
            强度值: intensity
        });
        
        return intensity;
    }

    /**
     * 找到最接近目标值的索引
     */
    findClosestIndex(array, target) {
        let closestIndex = 0;
        let minDiff = Math.abs(array[0] - target);

        for (let i = 1; i < array.length; i++) {
            let diff = Math.abs(array[i] - target);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }

        return closestIndex;
    }
    
    /**
     * 显示2D查询结果
     */
    display2DLookupResult(message, isSuccess = true) {
        const resultElement = document.getElementById('lookup-2d-result');
        if (resultElement) {
            resultElement.textContent = message;
            
            // 根据成功/失败设置样式
            if (isSuccess) {
                resultElement.style.color = '#0d7377';
                resultElement.style.fontWeight = '600';
            } else {
                resultElement.style.color = '#dc3545';
                resultElement.style.fontWeight = '500';
            }
            
            console.log('📝 2D查询结果已显示:', message);
        } else {
            console.error('❌ 找不到2D查询结果显示元素');
        }
    }

    /**
     * 根据Y值查找X值（可能有多个）
     */
    lookupXByY(targetY, tolerance = 0.001) {
        if (!this.vectorData || !this.vectorData.x || !this.vectorData.intensity) {
            return [];
        }

        const x = this.vectorData.x;
        const y = this.vectorData.intensity;
        const results = [];

        // 获取当前坐标单位和图表数据单位
        const currentUnit = document.getElementById('coordinate-unit')?.value || 'pixels';
        const chartUnit = this.vectorData?.parameters?.coordinateUnit || 'pixels';

        // 扫描所有相邻点对，找到Y值穿越目标值的位置
        for (let i = 0; i < y.length - 1; i++) {
            let y1 = y[i], y2 = y[i + 1];

            // 检查是否在这两点之间
            if ((y1 <= targetY && targetY <= y2) || (y2 <= targetY && targetY <= y1)) {
                if (Math.abs(y1 - targetY) < tolerance) {
                    // 非常接近y1
                    let resultX = x[i];
                    // 将结果从图表单位转换为当前显示单位
                    if (currentUnit !== chartUnit) {
                        resultX = this.convertUnit(resultX, chartUnit, currentUnit);
                    }
                    results.push(resultX);
                } else if (Math.abs(y2 - targetY) < tolerance) {
                    // 非常接近y2
                    if (i === y.length - 2) {
                        let resultX = x[i + 1];
                        // 将结果从图表单位转换为当前显示单位
                        if (currentUnit !== chartUnit) {
                            resultX = this.convertUnit(resultX, chartUnit, currentUnit);
                        }
                        results.push(resultX);
                    }
                } else if (y1 !== y2) {
                    // 线性插值
                    let x1 = x[i], x2 = x[i + 1];
                    let interpolatedX = x1 + (targetY - y1) * (x2 - x1) / (y2 - y1);
                    // 将结果从图表单位转换为当前显示单位
                    if (currentUnit !== chartUnit) {
                        interpolatedX = this.convertUnit(interpolatedX, chartUnit, currentUnit);
                    }
                    results.push(interpolatedX);
                }
            }
        }

        // 去重并排序
        const uniqueResults = [...new Set(results.map(val => Math.round(val * 1000) / 1000))];
        return uniqueResults.sort((a, b) => a - b);
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
