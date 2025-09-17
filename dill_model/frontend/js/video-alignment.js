class VideoAlignment {
    constructor() {
        this.video = null;
        this.heatmapCanvas = null;
        this.overlayCanvas = null;
        this.heatmapCtx = null;
        this.overlayCtx = null;
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
        this.secondaryPeakRatio = 0.45;
        this.misalignmentDistance = 20;
        this.indicator = null;
        this.statusText = null;
        this.startBtn = null;
        this.stopBtn = null;
        this.lastPulseTimestamp = 0;
    }

    init() {
        this.cacheElements();
        this.prepareCanvas();
        this.bindEvents();
        this.resetVisualState('等待摄像头');
    }

    cacheElements() {
        this.video = document.getElementById('video-align-stream');
        this.heatmapCanvas = document.getElementById('video-align-heatmap');
        this.overlayCanvas = document.getElementById('video-align-overlay');
        this.indicator = document.getElementById('video-align-indicator');
        this.statusText = document.getElementById('video-align-status-text');
        this.startBtn = document.getElementById('video-align-start-btn');
        this.stopBtn = document.getElementById('video-align-stop-btn');

        if (this.heatmapCanvas) {
            this.width = this.heatmapCanvas.width;
            this.height = this.heatmapCanvas.height;
        }

        this.processingCanvas.width = this.width;
        this.processingCanvas.height = this.height;
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

        if (!this.intensityBuffer || this.intensityBuffer.length !== this.width * this.height) {
            this.intensityBuffer = new Float32Array(this.width * this.height);
        }
    }

    bindEvents() {
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.startCamera());
        }

        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stopCamera('已停止摄像头'));
        }

        const modeInputs = document.querySelectorAll('input[name="video-align-mode"]');
        modeInputs.forEach(input => {
            input.addEventListener('change', (event) => {
                this.mode = event.target.value;
            });
        });
    }

    async startCamera() {
        if (!this.isTabActive) {
            this.resetVisualState('切换至“视频对齐”标签使用摄像头');
            return;
        }

        if (this.isStreaming) {
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.resetVisualState('当前浏览器不支持摄像头');
            this.showError('当前浏览器不支持摄像头访问，请使用最新版Chrome或Edge。');
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
                this.statusText.textContent = '开始识别中…';
            }
            this.lastPulseTimestamp = performance.now();
            this.processFrames();
        } catch (error) {
            console.error('视频对齐摄像头启动失败:', error);
            this.resetVisualState('摄像头启动失败');
            this.showError('摄像头启动失败，请确认授予权限并重试。');
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

    renderFrame() {
        if (!this.video || !this.heatmapCtx || !this.overlayCtx) {
            return;
        }

        try {
            this.processingCtx.drawImage(this.video, 0, 0, this.width, this.height);
        } catch (error) {
            // 在摄像头准备过程中可能抛出异常，忽略并等待下一帧
            return;
        }

        let frame;
        try {
            frame = this.processingCtx.getImageData(0, 0, this.width, this.height);
        } catch (error) {
            return;
        }

        const sourceData = frame.data;
        const heatmapData = this.heatmapImageData.data;
        const length = sourceData.length;

        let max1Value = 0;
        let max1Index = -1;
        let max2Value = 0;
        let max2Index = -1;
        let sumIntensity = 0;
        let weightedX = 0;
        let weightedY = 0;

        for (let i = 0, p = 0; i < length; i += 4, p++) {
            const r = sourceData[i];
            const g = sourceData[i + 1];
            const b = sourceData[i + 2];

            const intensity = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            this.intensityBuffer[p] = intensity;

            if (intensity > max1Value) {
                max2Value = max1Value;
                max2Index = max1Index;
                max1Value = intensity;
                max1Index = p;
            } else if (intensity > max2Value) {
                max2Value = intensity;
                max2Index = p;
            }

            if (intensity > 1) {
                const x = p % this.width;
                const y = Math.floor(p / this.width);
                weightedX += intensity * x;
                weightedY += intensity * y;
                sumIntensity += intensity;
            }

            const normalized = Math.min(Math.max(intensity / 255, 0), 1);
            const color = this.getColorFromValue(normalized);
            heatmapData[i] = color[0];
            heatmapData[i + 1] = color[1];
            heatmapData[i + 2] = color[2];
            heatmapData[i + 3] = 255;
        }

        this.heatmapCtx.putImageData(this.heatmapImageData, 0, 0);
        this.overlayCtx.clearRect(0, 0, this.width, this.height);

        if (max1Index === -1 || max1Value < 5) {
            this.setIndicatorState('idle');
            if (this.statusText) {
                this.statusText.textContent = '等待图像';
            }
            return;
        }

        const max1Position = this.indexToPoint(max1Index);
        const max2Position = max2Index >= 0 ? this.indexToPoint(max2Index) : null;
        const ratio = max1Value > 0 ? max2Value / max1Value : 0;
        const distance = (max1Position && max2Position)
            ? Math.hypot(max1Position.x - max2Position.x, max1Position.y - max2Position.y)
            : 0;
        const hasTwoPeaks = ratio > this.secondaryPeakRatio && distance > this.misalignmentDistance;

        if (hasTwoPeaks && max2Position) {
            this.setIndicatorState('misaligned');
            if (this.statusText) {
                this.statusText.textContent = '未对齐';
            }
            this.drawRedMarker(max1Position.x, max1Position.y);
            this.drawRedMarker(max2Position.x, max2Position.y);
            return;
        }

        const centroid = sumIntensity > 0
            ? { x: weightedX / sumIntensity, y: weightedY / sumIntensity }
            : max1Position;
        const targetPoint = this.mode === 'centroid' ? centroid : max1Position;

        this.setIndicatorState('aligned');
        if (this.statusText) {
            this.statusText.textContent = '已对齐';
        }
        this.drawGreenPulse(targetPoint.x, targetPoint.y);
    }

    updateButtonState(streaming) {
        if (this.startBtn) {
            this.startBtn.disabled = streaming;
        }
        if (this.stopBtn) {
            this.stopBtn.disabled = !streaming;
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
        this.overlayCtx.fillStyle = 'rgba(244, 63, 94, 0.18)';
        this.overlayCtx.beginPath();
        this.overlayCtx.arc(x, y, 14, 0, Math.PI * 2);
        this.overlayCtx.closePath();
        this.overlayCtx.fill();
        this.overlayCtx.stroke();
        this.overlayCtx.restore();
    }

    drawGreenPulse(x, y) {
        if (!this.overlayCtx) {
            return;
        }

        const now = performance.now();
        const t = (now - this.lastPulseTimestamp) / 1000;
        const radius = 12 + Math.sin(t * Math.PI) * 3;

        this.overlayCtx.save();
        const gradient = this.overlayCtx.createRadialGradient(x, y, 0, x, y, radius * 2);
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.65)');
        gradient.addColorStop(0.6, 'rgba(34, 197, 94, 0.25)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
        this.overlayCtx.fillStyle = gradient;
        this.overlayCtx.beginPath();
        this.overlayCtx.arc(x, y, radius * 2, 0, Math.PI * 2);
        this.overlayCtx.fill();

        this.overlayCtx.fillStyle = '#22c55e';
        this.overlayCtx.beginPath();
        this.overlayCtx.arc(x, y, radius, 0, Math.PI * 2);
        this.overlayCtx.fill();
        this.overlayCtx.restore();
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
}

window.VideoAlignment = VideoAlignment;
