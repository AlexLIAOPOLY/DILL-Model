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
    }

    /**
     * 初始化照片识别功能
     */
    init() {
        this.bindEvents();
        this.initializeElements();
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
                scaleFactor
            });
            
            // 将图像数据转换为base64
            const imageDataUrl = this.imageDataToBase64(this.originalImageData);
            
            // 准备请求数据
            const requestData = {
                image_data: imageDataUrl,
                grayscale_method: grayscaleMethod,
                vector_direction: vectorDirection,
                coordinate_unit: coordinateUnit,
                scale_factor: scaleFactor,
                smoothing_method: smoothingMethod,
                crop_mode: cropMode
            };
            
            console.log('🔄 发送处理请求到后端...', {
                grayscale_method: grayscaleMethod,
                vector_direction: vectorDirection,
                coordinate_unit: coordinateUnit,
                scale_factor: scaleFactor
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
                    scaleFactor: scaleFactor
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
     * 将ImageData转换为base64格式
     */
    imageDataToBase64(imageData) {
        // 创建临时canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        
        // 将ImageData绘制到canvas
        ctx.putImageData(imageData, 0, 0);
        
        // 转换为base64
        return canvas.toDataURL('image/jpeg', 0.9);
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
        
        console.log('📊 向量预览显示完成');
    }

    /**
     * 绘制向量图表
     */
    drawVectorChart(ctx, xData, yData, width, height) {
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        // 计算数据范围
        const xMin = Math.min(...xData);
        const xMax = Math.max(...xData);
        const yMin = Math.min(...yData);
        const yMax = Math.max(...yData);
        
        // 绘制坐标轴
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // X轴
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        // Y轴
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();
        
        // 绘制数据线
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2.5;
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
        
        // 添加标签
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        
        // X轴标签
        ctx.fillText('坐标位置', width / 2, height - 10);
        
        // Y轴标签
        ctx.save();
        ctx.translate(15, height / 2);
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
        const info = `
向量数据信息：
• 数据点数：${this.vectorData.x.length}
• X坐标范围：${Math.min(...this.vectorData.x).toFixed(3)} 到 ${Math.max(...this.vectorData.x).toFixed(3)}
• 强度范围：${Math.min(...this.vectorData.intensity).toFixed(3)} 到 ${Math.max(...this.vectorData.intensity).toFixed(3)}
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
                
            } else {
                throw new Error('系统接口不可用');
            }
            
        } catch (error) {
            console.error('❌ 应用向量数据失败:', error);
            alert('应用向量数据失败：' + error.message);
        }
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
            // 创建CSV格式的数据
            let csvContent = 'x,intensity\n';
            for (let i = 0; i < this.vectorData.x.length; i++) {
                csvContent += `${this.vectorData.x[i]},${this.vectorData.intensity[i]}\n`;
            }

            // 创建下载链接
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `photo_vector_data_${new Date().getTime()}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log('✅ 向量数据导出成功');
            }
            
        } catch (error) {
            console.error('❌ 数据导出失败:', error);
            alert('数据导出失败：' + error.message);
        }
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
     * 清理资源
     */
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        this.originalImageData = null;
        this.grayscaleImageData = null;
        this.vectorData = null;
    }
}

// 导出类供全局使用
window.PhotoRecognition = PhotoRecognition;
