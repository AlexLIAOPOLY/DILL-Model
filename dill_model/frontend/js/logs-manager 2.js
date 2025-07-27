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
    const exportBtn = document.getElementById('export-logs-btn');
    const modelFilter = document.getElementById('log-model-filter');
    const typeFilter = document.getElementById('log-type-filter');
    const searchInput = document.getElementById('log-search-input');
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
    
    // 导出日志按钮
    if (exportBtn) {
        exportBtn.onclick = exportLogs;
    }
    
    // 过滤器事件
    if (modelFilter) {
        modelFilter.onchange = loadLogs;
    }
    
    if (typeFilter) {
        typeFilter.onchange = loadLogs;
    }
    
    // 搜索输入框事件（防抖）
    if (searchInput) {
        let searchTimeout;
        searchInput.oninput = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(loadLogs, 300);
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
            const modelFilter = document.getElementById('log-model-filter');
            const typeFilter = document.getElementById('log-type-filter');
            const searchInput = document.getElementById('log-search-input');
            
            const modelType = modelFilter ? modelFilter.value : '';
            const logType = typeFilter ? typeFilter.value : '';
            const searchQuery = searchInput ? searchInput.value.trim() : '';
            
            const params = new URLSearchParams();
            if (modelType) {
                params.append('model_type', modelType);
            }
            if (logType) {
                params.append('log_type', logType);
            }
            if (searchQuery) {
                params.append('search', searchQuery);
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
                    logsContainer.innerHTML = createGroupedLogsHtml(logs);
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
 * 获取日志类型对应的图标信息
 */
function getLogTypeIcon(type) {
    const typeIconMap = {
        'info': 'fas fa-info-circle',
        'success': 'fas fa-check-circle',
        'warning': 'fas fa-exclamation-triangle',
        'error': 'fas fa-times-circle',
        'progress': 'fas fa-clock',
        'debug': 'fas fa-bug'
    };
    
    return typeIconMap[type] || typeIconMap['info'];
}

/**
 * 创建分组日志HTML
 */
function createGroupedLogsHtml(logs) {
    // 按时间和计算会话分组
    const groups = groupLogsBySession(logs);
    
    return groups.map(group => {
        const groupStartTime = group.startTime;
        const groupDuration = group.duration;
        const groupLogs = group.logs;
        const sessionType = group.sessionType;
        
        // 创建会话标题
        const sessionHeader = `
            <div class="log-session-header">
                <div class="log-session-info">
                    <i class="fas fa-play-circle"></i>
                    <span class="log-session-title">${sessionType} 计算会话</span>
                    <span class="log-session-time">${groupStartTime}</span>
                    ${groupDuration ? `<span class="log-session-duration">耗时: ${groupDuration}</span>` : ''}
                </div>
                <div class="log-session-count">${groupLogs.length} 条日志</div>
            </div>
        `;
        
        // 创建会话内容
        const sessionContent = `
            <div class="log-session-content">
                ${createSessionSummary(groupLogs)}
                <div class="log-session-details" style="display: none;">
                    ${groupLogs.map(log => createLogEntryHtml(log)).join('')}
                </div>
                <button class="log-session-toggle" onclick="toggleSessionDetails(this)">
                    <i class="fas fa-chevron-down"></i> 查看详细日志
                </button>
            </div>
        `;
        
        return `
            <div class="log-session">
                ${sessionHeader}
                ${sessionContent}
            </div>
        `;
    }).join('');
}

/**
 * 按计算会话分组日志
 */
function groupLogsBySession(logs) {
    const groups = [];
    let currentGroup = null;
    
    logs.forEach((log, index) => {
        const logTime = new Date(log.timestamp);
        const isCalculationStart = log.message && (
            log.message.includes('开始计算') || 
            log.message.includes('一维计算') ||
            log.message.includes('Dill模型') ||
            log.message.includes('计算完成')
        );
        
        // 如果是新的计算开始，或者时间间隔超过5分钟，创建新组
        if (!currentGroup || isCalculationStart || 
            (currentGroup.logs.length > 0 && 
             logTime - new Date(currentGroup.logs[currentGroup.logs.length - 1].timestamp) > 5 * 60 * 1000)) {
            
            if (currentGroup) {
                // 完成上一个组
                finishGroup(currentGroup);
                groups.push(currentGroup);
            }
            
            // 开始新组
            currentGroup = {
                startTime: formatTime(logTime),
                logs: [],
                sessionType: getSessionType(log)
            };
        }
        
        currentGroup.logs.push(log);
    });
    
    // 添加最后一个组
    if (currentGroup) {
        finishGroup(currentGroup);
        groups.push(currentGroup);
    }
    
    return groups.reverse(); // 最新的在前面
}

/**
 * 完成分组处理
 */
function finishGroup(group) {
    if (group.logs.length > 0) {
        const startTime = new Date(group.logs[0].timestamp);
        const endTime = new Date(group.logs[group.logs.length - 1].timestamp);
        const duration = endTime - startTime;
        
        if (duration > 1000) { // 超过1秒才显示耗时
            group.duration = formatDuration(duration);
        }
    }
}

/**
 * 获取会话类型
 */
function getSessionType(log) {
    if (log.model) {
        const modelNames = {
            'dill': 'Dill',
            'enhanced_dill': 'Enhanced Dill',
            'car': 'CAR',
            'system': '系统'
        };
        return modelNames[log.model] || log.model;
    }
    return '通用';
}

/**
 * 创建会话摘要
 */
function createSessionSummary(logs) {
    const summary = {
        totalCount: logs.length,
        successCount: 0,
        errorCount: 0,
        warningCount: 0,
        keyInfo: []
    };
    
    logs.forEach(log => {
        switch (log.type) {
            case 'success':
                summary.successCount++;
                break;
            case 'error':
                summary.errorCount++;
                break;
            case 'warning':
                summary.warningCount++;
                break;
        }
        
        // 提取关键信息
        if (log.message) {
            if (log.message.includes('计算完成')) {
                summary.keyInfo.push(`✅ ${log.message}`);
            } else if (log.message.includes('光敏速率常数') || log.message.includes('分辨率因子') || log.message.includes('对比度因子')) {
                summary.keyInfo.push(`📊 ${log.message}`);
            } else if (log.message.includes('检测') && log.message.includes('CV=')) {
                summary.keyInfo.push(`🔍 ${log.message}`);
            }
        }
    });
    
    const statusItems = [];
    if (summary.successCount > 0) statusItems.push(`<span class="status-success">${summary.successCount} 成功</span>`);
    if (summary.errorCount > 0) statusItems.push(`<span class="status-error">${summary.errorCount} 错误</span>`);
    if (summary.warningCount > 0) statusItems.push(`<span class="status-warning">${summary.warningCount} 警告</span>`);
    
    return `
        <div class="log-session-summary">
            <div class="log-summary-stats">
                ${statusItems.join(' • ')}
            </div>
            ${summary.keyInfo.length > 0 ? `
                <div class="log-summary-info">
                    ${summary.keyInfo.slice(0, 3).map(info => `<div class="summary-info-item">${info}</div>`).join('')}
                    ${summary.keyInfo.length > 3 ? `<div class="summary-more">+${summary.keyInfo.length - 3} 更多...</div>` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * 格式化持续时间
 */
function formatDuration(ms) {
    if (ms < 1000) {
        return `${ms}ms`;
    } else if (ms < 60000) {
        return `${(ms / 1000).toFixed(1)}s`;
    } else {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }
}

/**
 * 创建日志条目HTML
 */
function createLogEntryHtml(log) {
    const typeClass = log.type || 'info';
    const modelClass = log.model || 'system';
    const typeIcon = getLogTypeIcon(typeClass);
    
    return `
        <div class="log-entry ${typeClass}">
            <div class="log-icon">
                <i class="${typeIcon}"></i>
            </div>
            <div class="log-content">
                <div class="log-header">
                    <span class="log-timestamp">[${log.timestamp}]</span>
                    <span class="log-type ${typeClass}">${typeClass.toUpperCase()}</span>
                    <span class="log-model ${modelClass}">${getModelDisplayName(log.model)}</span>
                </div>
                <div class="log-message">${escapeHtml(log.message)}</div>
            </div>
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
 * 切换会话详细日志显示
 */
function toggleSessionDetails(button) {
    const sessionContent = button.closest('.log-session-content');
    const details = sessionContent.querySelector('.log-session-details');
    const icon = button.querySelector('i');
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        icon.className = 'fas fa-chevron-up';
        button.innerHTML = '<i class="fas fa-chevron-up"></i> 隐藏详细日志';
    } else {
        details.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
        button.innerHTML = '<i class="fas fa-chevron-down"></i> 查看详细日志';
    }
}

/**
 * 格式化时间
 */
function formatTime(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
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

/**
 * 导出日志
 */
async function exportLogs() {
    try {
        const modelFilter = document.getElementById('log-model-filter');
        const typeFilter = document.getElementById('log-type-filter');
        const searchInput = document.getElementById('log-search-input');
        
        const modelType = modelFilter ? modelFilter.value : '';
        const logType = typeFilter ? typeFilter.value : '';
        const searchQuery = searchInput ? searchInput.value.trim() : '';
        
        const params = new URLSearchParams();
        if (modelType) {
            params.append('model_type', modelType);
        }
        if (logType) {
            params.append('log_type', logType);
        }
        if (searchQuery) {
            params.append('search', searchQuery);
        }
        params.append('limit', '1000'); // 导出更多日志
        
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/api/logs?${params.toString()}`);
        const result = await response.json();
        
        if (result.success && result.data.logs.length > 0) {
            const logs = result.data.logs;
            
            // 准备CSV内容
            const csvHeader = '时间,类型,模型,消息\n';
            const csvRows = logs.map(log => {
                const timestamp = log.timestamp || '';
                const type = log.type || 'info';
                const model = getModelDisplayName(log.model);
                const message = (log.message || '').replace(/"/g, '""'); // 转义双引号
                return `"${timestamp}","${type}","${model}","${message}"`;
            }).join('\n');
            
            const csvContent = csvHeader + csvRows;
            
            // 创建下载链接
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            
            // 生成文件名
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
            const filterSuffix = modelType ? `_${modelType}` : '';
            const typeSuffix = logType ? `_${logType}` : '';
            const searchSuffix = searchQuery ? '_filtered' : '';
            link.setAttribute('download', `logs_${timestamp}${filterSuffix}${typeSuffix}${searchSuffix}.csv`);
            
            // 触发下载
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`已导出 ${logs.length} 条日志`);
        } else {
            alert('没有日志可以导出');
        }
    } catch (error) {
        console.error('导出日志失败:', error);
        alert('导出日志失败: ' + error.message);
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