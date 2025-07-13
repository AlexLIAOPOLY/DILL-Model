/**
 * 日志管理器 - 负责处理运行日志的显示和管理
 */

/**
 * 显示日志弹窗
 */
async function showLogsModal() {
    const logsModal = document.getElementById('logs-modal');
    if (logsModal) {
        logsModal.style.display = 'flex';
        initLogsModalEvents(); 
        
        // 等待日志加载完成
        await loadLogs();

        // 加载完成后，自动滚动到底部
        const logsContainer = document.getElementById('logs-container');
        if (logsContainer) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // 直接设置scrollTop
                    logsContainer.scrollTop = logsContainer.scrollHeight;
                    
                    // 强制刷新浏览器渲染
                    logsContainer.offsetHeight;
                    
                    // 使用平滑滚动
                    logsContainer.scrollTo({
                        top: logsContainer.scrollHeight,
                        behavior: 'smooth'
                    });
                    
                    // 延迟再次确保滚动（平滑滚动可能需要更多时间）
                    setTimeout(() => {
                        // 尝试滚动最后一个日志条目
                        const lastLogEntry = logsContainer.querySelector('.log-entry:last-child');
                        if (lastLogEntry) {
                            lastLogEntry.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        }
                    }, 300);
                });
            });
        }
    }
}

/**
 * 隐藏日志弹窗
 */
function hideLogsModal() {
    const logsModal = document.getElementById('logs-modal');
    if (logsModal) {
        logsModal.style.display = 'none';
    }
}

/**
 * 初始化日志弹窗事件
 */
function initLogsModalEvents() {
    const closeBtn = document.getElementById('close-logs-modal');
    const refreshBtn = document.getElementById('refresh-logs-btn');
    const clearBtn = document.getElementById('clear-logs-btn');
    const modelFilter = document.getElementById('log-model-filter');
    const modal = document.getElementById('logs-modal');
    
    // 关闭按钮事件
    if (closeBtn) {
        closeBtn.onclick = hideLogsModal;
    }
    
    // 点击背景关闭弹窗
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) {
                hideLogsModal();
            }
        };
    }
    
    // 刷新日志按钮
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.classList.add('fa-spin');
            }
            // 刷新时不需要滚动，所以直接调用
            loadLogs().finally(() => {
                if (icon) {
                    icon.classList.remove('fa-spin');
                }
            });
        };
    }
    
    // 清空日志按钮
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm('确定要清空所有日志吗？此操作不可恢复。')) {
                clearLogs();
            }
        };
    }
    
    // 模型过滤器
    if (modelFilter) {
        modelFilter.onchange = () => {
            loadLogs();
        };
    }
}

/**
 * 加载日志
 * @returns {Promise<void>}
 */
async function loadLogs() {
    return new Promise(async (resolve, reject) => {
        const logsContainer = document.getElementById('logs-container');
        const logsCountInfo = document.getElementById('logs-count-info');
        const modelFilter = document.getElementById('log-model-filter');
        
        if (!logsContainer) {
            return reject(new Error('日志容器未找到'));
        }
        
        // 显示加载状态
        logsContainer.innerHTML = '<div class="logs-loading"><i class="fas fa-spinner fa-spin"></i> 加载日志中...</div>';
        
        try {
            const modelType = modelFilter ? modelFilter.value : '';
            const params = new URLSearchParams();
            if (modelType) {
                params.append('model_type', modelType);
            }
            params.append('limit', '200'); // 限制为最近200条
            
            // 动态获取当前端口
            const baseUrl = window.location.origin;
            const response = await fetch(`${baseUrl}/api/logs?${params.toString()}`);
            const result = await response.json();
            
            if (result.success) {
                const logs = result.data.logs;
                const totalCount = result.data.total_count;
                const filteredCount = result.data.filtered_count;
                
                // 更新统计信息
                if (logsCountInfo) {
                    const filterText = modelType ? `（过滤：${filteredCount}条）` : '';
                    logsCountInfo.textContent = `总计: ${totalCount} 条日志 ${filterText}`;
                }
                
                // 显示日志
                if (logs.length === 0) {
                    logsContainer.innerHTML = `
                        <div class="logs-empty">
                            <i class="fas fa-inbox"></i>
                            <p>暂无日志记录</p>
                            <p style="font-size: 0.9rem; opacity: 0.7;">运行计算后将显示详细日志</p>
                        </div>
                    `;
                } else {
                    logsContainer.innerHTML = logs.map(log => createLogEntryHtml(log)).join('');
                }
                resolve(); // 日志加载并渲染成功
            } else {
                throw new Error(result.message || '获取日志失败');
            }
        } catch (error) {
            console.error('加载日志失败:', error);
            logsContainer.innerHTML = `
                <div class="logs-empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>加载日志失败</p>
                    <p style="font-size: 0.9rem; opacity: 0.7;">${error.message}</p>
                </div>
            `;
            reject(error); // 加载失败
        }
    });
}

/**
 * 创建日志条目HTML
 */
function createLogEntryHtml(log) {
    const typeClass = log.type || 'info';
    const modelClass = log.model || 'system';
    
    return `
        <div class="log-entry">
            <span class="log-timestamp">[${log.timestamp}]</span>
            <span class="log-type ${typeClass}">${typeClass.toUpperCase()}</span>
            <span class="log-model ${modelClass}">${getModelDisplayName(log.model)}</span>
            <span class="log-message">${escapeHtml(log.message)}</span>
        </div>
    `;
}

/**
 * 获取模型显示名称
 */
function getModelDisplayName(modelType) {
    // 获取当前用户选择的模型类型
    const currentModelSelect = document.getElementById('model-select');
    const currentModelType = currentModelSelect ? currentModelSelect.value : modelType;
    
    // 根据当前模型类型获取对应的入射光类型选择器
    let sineTypeValue = '1D'; // 默认值
    let sineTypeSelector = null;
    
    switch (currentModelType) {
        case 'dill':
            sineTypeSelector = document.getElementById('dill-sine-type');
            break;
        case 'enhanced_dill':
            sineTypeSelector = document.getElementById('enhanced-dill-sine-type');
            break;
        case 'car':
            sineTypeSelector = document.getElementById('car-sine-type');
            break;
    }
    
    // 获取入射光维度
    if (sineTypeSelector) {
        const sineType = sineTypeSelector.value;
        switch (sineType) {
            case 'single':
                sineTypeValue = '1D';
                break;
            case 'multi':
                sineTypeValue = '2D';
                break;
            case '3d':
                sineTypeValue = '3D';
                break;
            default:
                sineTypeValue = '1D';
        }
    }
    
    // 根据模型类型和维度生成显示名称
    const baseNames = {
        'dill': 'Dill',
        'enhanced_dill': 'Enhanced',
        'car': 'CAR',
        'system': 'System'
    };
    
    const baseName = baseNames[modelType] || baseNames[currentModelType] || modelType || 'Unknown';
    
    // System类型不需要维度信息
    if (modelType === 'system') {
        return baseName;
    }
    
    return `${baseName}: ${sineTypeValue}`;
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 清空日志
 */
async function clearLogs() {
    try {
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/api/logs/clear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 重新加载日志
            loadLogs();
            console.log('日志已清空');
        } else {
            throw new Error(result.message || '清空日志失败');
        }
    } catch (error) {
        console.error('清空日志失败:', error);
        alert('清空日志失败: ' + error.message);
    }
}

// 页面加载完成后初始化日志功能
document.addEventListener('DOMContentLoaded', function() {
    // 查看日志按钮事件
    const viewLogsBtn = document.getElementById('view-logs-btn');
    if (viewLogsBtn) {
        viewLogsBtn.addEventListener('click', () => {
            showLogsModal();
        });
    }
}); 