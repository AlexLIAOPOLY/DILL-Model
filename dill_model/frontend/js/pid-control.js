/**
 * PID控制系统 - 与LabVIEW数据交换
 * 实现实时参数调整和数据监控
 */

class PIDController {
    constructor() {
        this.isConnected = false;
        this.autoRefresh = false;
        this.refreshInterval = null;
        this.currentPID = { p: 0, i: 0, d: 0 };
        this.systemData = {
            setpoint: 0,
            current: 0,
            error: 0,
            output: 0
        };
        
        this.init();
    }

    /**
     * 初始化PID控制器
     */
    init() {
        this.bindEvents();
        this.startStatusCheck();
        this.addLog('系统初始化完成');
        this.loadInitialData();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // PID参数应用按钮
        document.querySelectorAll('.btn-apply').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const param = e.target.getAttribute('data-param');
                this.applyParameter(param);
            });
        });

        // 快速操作按钮
        document.getElementById('read-parameters').addEventListener('click', () => {
            this.readPIDParameters();
        });

        document.getElementById('apply-all-parameters').addEventListener('click', () => {
            this.applyAllParameters();
        });

        document.getElementById('reset-parameters').addEventListener('click', () => {
            this.resetParameters();
        });

        document.getElementById('save-parameters').addEventListener('click', () => {
            this.saveParameters();
        });

        // 图像控制按钮
        document.getElementById('refresh-image').addEventListener('click', () => {
            this.refreshImage();
        });

        document.getElementById('auto-refresh-toggle').addEventListener('click', () => {
            this.toggleAutoRefresh();
        });

        // 清除日志按钮
        document.getElementById('clear-log').addEventListener('click', () => {
            this.clearLog();
        });

        // 参数输入框变化监听
        ['p-value', 'i-value', 'd-value'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.validateParameterInput(e.target);
            });
        });
    }

    /**
     * 从LabVIEW读取PID参数
     */
    async readPIDParameters() {
        try {
            this.addLog('正在读取PID参数...');
            
            const response = await fetch('/api/pid/read-parameters', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentPID = data.parameters;
                this.updateCurrentValues();
                this.addLog(`成功读取PID参数: P=${data.parameters.p}, I=${data.parameters.i}, D=${data.parameters.d}`);
                this.updateConnectionStatus(true);
            } else {
                throw new Error(`读取失败: ${response.statusText}`);
            }
        } catch (error) {
            this.addLog(`读取PID参数失败: ${error.message}`, 'error');
            this.updateConnectionStatus(false);
        }
    }

    /**
     * 应用单个PID参数
     */
    async applyParameter(param) {
        try {
            const value = parseFloat(document.getElementById(`${param}-value`).value);
            
            if (isNaN(value) || value < 0) {
                this.addLog(`无效的${param.toUpperCase()}值: ${value}`, 'error');
                return;
            }

            this.addLog(`正在应用${param.toUpperCase()}参数: ${value}`);

            const response = await fetch('/api/pid/apply-parameter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    parameter: param,
                    value: value
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentPID[param] = value;
                this.updateCurrentValues();
                this.addLog(`${param.toUpperCase()}参数应用成功`);
                this.updateConnectionStatus(true);
            } else {
                throw new Error(`应用失败: ${response.statusText}`);
            }
        } catch (error) {
            this.addLog(`应用${param.toUpperCase()}参数失败: ${error.message}`, 'error');
            this.updateConnectionStatus(false);
        }
    }

    /**
     * 应用所有PID参数
     */
    async applyAllParameters() {
        try {
            const p = parseFloat(document.getElementById('p-value').value);
            const i = parseFloat(document.getElementById('i-value').value);
            const d = parseFloat(document.getElementById('d-value').value);

            if (isNaN(p) || isNaN(i) || isNaN(d) || p < 0 || i < 0 || d < 0) {
                this.addLog('无效的PID参数值', 'error');
                return;
            }

            this.addLog(`正在应用所有PID参数: P=${p}, I=${i}, D=${d}`);

            const response = await fetch('/api/pid/apply-all-parameters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    parameters: { p, i, d }
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentPID = { p, i, d };
                this.updateCurrentValues();
                this.addLog('所有PID参数应用成功');
                this.updateConnectionStatus(true);
            } else {
                throw new Error(`应用失败: ${response.statusText}`);
            }
        } catch (error) {
            this.addLog(`应用PID参数失败: ${error.message}`, 'error');
            this.updateConnectionStatus(false);
        }
    }

    /**
     * 重置PID参数为默认值
     */
    resetParameters() {
        document.getElementById('p-value').value = '1.0';
        document.getElementById('i-value').value = '0.1';
        document.getElementById('d-value').value = '0.01';
        this.addLog('参数已重置为默认值');
    }

    /**
     * 保存当前参数配置
     */
    async saveParameters() {
        try {
            const p = parseFloat(document.getElementById('p-value').value);
            const i = parseFloat(document.getElementById('i-value').value);
            const d = parseFloat(document.getElementById('d-value').value);

            const response = await fetch('/api/pid/save-parameters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    parameters: { p, i, d },
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                this.addLog('参数配置保存成功');
            } else {
                throw new Error(`保存失败: ${response.statusText}`);
            }
        } catch (error) {
            this.addLog(`保存参数配置失败: ${error.message}`, 'error');
        }
    }

    /**
     * 刷新LabVIEW图像
     */
    async refreshImage() {
        try {
            this.addLog('正在刷新图像...');

            const response = await fetch('/api/pid/get-image', {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                this.displayImage(data);
                this.addLog('图像刷新成功');
                this.updateConnectionStatus(true);
            } else {
                throw new Error(`图像获取失败: ${response.statusText}`);
            }
        } catch (error) {
            this.addLog(`图像刷新失败: ${error.message}`, 'error');
            this.updateConnectionStatus(false);
        }
    }

    /**
     * 切换自动刷新模式
     */
    toggleAutoRefresh() {
        this.autoRefresh = !this.autoRefresh;
        const button = document.getElementById('auto-refresh-toggle');
        
        if (this.autoRefresh) {
            button.textContent = '停止自动刷新';
            button.style.backgroundColor = '#fca5a5';
            this.refreshInterval = setInterval(() => {
                this.refreshImage();
                this.readSystemData();
            }, 2000); // 每2秒刷新一次
            this.addLog('自动刷新已启用');
        } else {
            button.textContent = '自动刷新';
            button.style.backgroundColor = '';
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
            this.addLog('自动刷新已停止');
        }
    }

    /**
     * 读取系统实时数据
     */
    async readSystemData() {
        try {
            const response = await fetch('/api/pid/system-data', {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                this.systemData = data;
                this.updateSystemDataDisplay();
                this.updateConnectionStatus(true);
            }
        } catch (error) {
            // 静默处理，避免过多错误日志
            this.updateConnectionStatus(false);
        }
    }

    /**
     * 显示图像
     */
    displayImage(imageData) {
        const imageContainer = document.getElementById('labview-image');
        
        if (imageData.image_url || imageData.image_base64) {
            const img = document.createElement('img');
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            
            if (imageData.image_base64) {
                img.src = `data:image/png;base64,${imageData.image_base64}`;
            } else {
                img.src = imageData.image_url;
            }
            
            imageContainer.innerHTML = '';
            imageContainer.appendChild(img);
            
            // 更新图像信息
            document.getElementById('image-timestamp').textContent = 
                imageData.timestamp || new Date().toLocaleString();
            document.getElementById('image-size').textContent = 
                imageData.size || '--';
        }
    }

    /**
     * 更新当前PID值显示
     */
    updateCurrentValues() {
        document.getElementById('current-p').textContent = this.currentPID.p.toFixed(3);
        document.getElementById('current-i').textContent = this.currentPID.i.toFixed(3);
        document.getElementById('current-d').textContent = this.currentPID.d.toFixed(4);
    }

    /**
     * 更新系统数据显示
     */
    updateSystemDataDisplay() {
        document.getElementById('setpoint-value').textContent = this.systemData.setpoint.toFixed(2);
        document.getElementById('current-value').textContent = this.systemData.current.toFixed(2);
        document.getElementById('error-value').textContent = this.systemData.error.toFixed(2);
        document.getElementById('output-value').textContent = this.systemData.output.toFixed(2);
    }

    /**
     * 更新连接状态
     */
    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');
        const labviewStatus = document.getElementById('labview-status');
        const dataStatus = document.getElementById('data-status');

        if (connected) {
            statusIndicator.className = 'status-indicator connected';
            statusText.textContent = '已连接';
            labviewStatus.textContent = '在线';
            labviewStatus.style.backgroundColor = '#86efac';
            dataStatus.textContent = '正常';
            dataStatus.style.backgroundColor = '#86efac';
        } else {
            statusIndicator.className = 'status-indicator disconnected';
            statusText.textContent = '未连接';
            labviewStatus.textContent = '离线';
            labviewStatus.style.backgroundColor = '#fca5a5';
            dataStatus.textContent = '暂停';
            dataStatus.style.backgroundColor = '#fbbf24';
        }
    }

    /**
     * 验证参数输入
     */
    validateParameterInput(input) {
        const value = parseFloat(input.value);
        const min = parseFloat(input.min) || 0;
        const max = parseFloat(input.max) || Infinity;

        if (isNaN(value) || value < min || value > max) {
            input.style.borderColor = '#fca5a5';
            input.style.backgroundColor = '#fef2f2';
        } else {
            input.style.borderColor = '#e5e7eb';
            input.style.backgroundColor = 'white';
        }
    }

    /**
     * 添加操作日志
     */
    addLog(message, type = 'info') {
        const logContainer = document.getElementById('operation-log');
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        const timestamp = document.createElement('span');
        timestamp.className = 'log-timestamp';
        timestamp.textContent = `[${new Date().toLocaleString()}]`;
        
        const logMessage = document.createElement('span');
        logMessage.className = 'log-message';
        logMessage.textContent = message;
        
        if (type === 'error') {
            logMessage.style.color = '#dc2626';
        } else if (type === 'success') {
            logMessage.style.color = '#16a34a';
        } else if (type === 'warning') {
            logMessage.style.color = '#d97706';
        }
        
        logEntry.appendChild(timestamp);
        logEntry.appendChild(logMessage);
        
        // 在顶部插入新日志
        logContainer.insertBefore(logEntry, logContainer.firstChild);
        
        // 限制日志数量
        const logs = logContainer.children;
        if (logs.length > 50) {
            logContainer.removeChild(logs[logs.length - 1]);
        }
    }

    /**
     * 清除日志
     */
    clearLog() {
        document.getElementById('operation-log').innerHTML = '';
        this.addLog('日志已清除');
    }

    /**
     * 开始状态检查
     */
    startStatusCheck() {
        // 每5秒检查一次连接状态
        setInterval(() => {
            this.checkFileStatus();
        }, 5000);
    }

    /**
     * 检查文件状态
     */
    async checkFileStatus() {
        try {
            const response = await fetch('/api/pid/status', {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('file-status').textContent = 
                    data.file_exists ? '已找到' : '未找到';
                document.getElementById('file-status').style.backgroundColor = 
                    data.file_exists ? '#86efac' : '#fca5a5';
            }
        } catch (error) {
            document.getElementById('file-status').textContent = '检查失败';
            document.getElementById('file-status').style.backgroundColor = '#fca5a5';
        }
    }

    /**
     * 加载初始数据
     */
    async loadInitialData() {
        // 尝试读取当前PID参数
        await this.readPIDParameters();
        
        // 尝试获取初始图像
        await this.refreshImage();
        
        // 开始定期读取系统数据
        setInterval(() => {
            if (this.isConnected) {
                this.readSystemData();
            }
        }, 1000);
    }
}

// 页面加载完成后初始化PID控制器
document.addEventListener('DOMContentLoaded', function() {
    window.pidController = new PIDController();
});
