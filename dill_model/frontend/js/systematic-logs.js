/**
 * 系统化日志管理系统
 * 支持不同模型和维度的日志分类、过滤和管理
 */

// 调试：确保文件加载
console.log('🔍 [DEBUG] systematic-logs.js 文件已加载');

class SystematicLogManager {
    constructor() {
        console.log('🔍 [DEBUG] SystematicLogManager 构造函数被调用');
        
        // 日志分类配置
        this.logCategories = {
            'single': {
                name: '单一计算',
                icon: 'fas fa-calculator',
                subcategories: {
                    'dill': { name: 'Dill', color: '#3498db', icon: 'fas fa-microscope' },
                    'enhanced_dill': { name: '增强Dill', color: '#9b59b6', icon: 'fas fa-layer-group' },
                    'car': { name: 'CAR', color: '#e67e22', icon: 'fas fa-flask' },
                    '1d': { name: '1D模型', color: '#2ecc71', icon: 'fas fa-minus' },
                    '2d': { name: '2D模型', color: '#2ecc71', icon: 'fas fa-square' },
                    '3d': { name: '3D模型', color: '#e74c3c', icon: 'fas fa-cube' }
                }
            },
            'compare': {
                name: '参数比较',
                icon: 'fas fa-chart-line',
                subcategories: {
                    'dill': { name: 'Dill', color: '#3498db', icon: 'fas fa-microscope' },
                    'enhanced_dill': { name: '增强Dill', color: '#9b59b6', icon: 'fas fa-layer-group' },
                    'car': { name: 'CAR', color: '#e67e22', icon: 'fas fa-flask' }
                }
            }
        };

        // 日志类型
        this.logTypes = {
            'info': { name: '信息', icon: 'fas fa-info-circle', color: '#17a2b8' },
            'progress': { name: '进度', icon: 'fas fa-spinner', color: '#3498db' },
            'success': { name: '成功', icon: 'fas fa-check-circle', color: '#28a745' },
            'warning': { name: '警告', icon: 'fas fa-exclamation-triangle', color: '#ffc107' },
            'error': { name: '错误', icon: 'fas fa-times-circle', color: '#dc3545' }
        };

        // 当前活动的标签页和过滤器
        this.activeTab = 'all';
        this.activeFilters = new Set(['info', 'progress', 'success', 'warning', 'error']);
        this.currentPage = 'index'; // 'index' 或 'compare'
        
        // 日志存储
        this.logs = [];
        this.maxLogs = 1000;
        
        // UI元素
        this.elements = {};
        
        // 定时器
        this.updateInterval = null;
        this.timeUpdateInterval = null;
        
        // 状态
        this.isVisible = false;
        this.isMinimized = false;
        this.startTime = null;
        
        this.init();
    }

    /**
     * 初始化日志系统
     */
    init() {
        this.detectCurrentPage();
        this.initElements();
        this.setupEventListeners();
        this.buildLogInterface();
        
        // 强制接管日志按钮的点击事件
        this.forceOverrideLogButton();
        
        // 确保面板初始隐藏
        this.ensureInitiallyHidden();
        
        // 移除自动演示功能，确保默认隐藏
        // this.demonstrateNewSystem(); // 已注释掉
    }

    /**
     * 检测当前页面类型
     */
    detectCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('compare.html')) {
            this.currentPage = 'compare';
        } else {
            this.currentPage = 'index';
        }
    }

    /**
     * 初始化DOM元素
     */
    initElements() {
        this.elements = {
            panel: document.getElementById('loading-logs-panel'),
            container: document.getElementById('loading-logs-container'),
            btn: document.getElementById('loading-logs-btn'),
            closeBtn: document.getElementById('loading-logs-close'),
            minimizeBtn: document.getElementById('loading-logs-minimize'),
            progressText: document.getElementById('loading-progress-text'),
            timeText: document.getElementById('loading-time-text')
        };
        
        console.log('🔍 [DEBUG] DOM元素初始化结果:', {
            panel: !!this.elements.panel,
            container: !!this.elements.container,
            btn: !!this.elements.btn,
            closeBtn: !!this.elements.closeBtn,
            minimizeBtn: !!this.elements.minimizeBtn
        });
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        if (this.elements.btn) {
            this.elements.btn.addEventListener('click', () => this.togglePanel());
        }
        
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.hidePanel());
        }
        
        if (this.elements.minimizeBtn) {
            this.elements.minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        }
    }

    /**
     * 确保面板初始隐藏
     */
    ensureInitiallyHidden() {
        console.log('🔒 [HIDE] 确保日志面板初始隐藏');
        if (this.elements.panel) {
            // 强制隐藏面板
            this.elements.panel.style.display = 'none';
            this.elements.panel.classList.remove('visible');
            this.elements.panel.classList.remove('minimized');
            
            // 重置透明度和变换
            this.elements.panel.style.opacity = '0';
            this.elements.panel.style.transform = 'translateX(100%)';
            
            // 设置状态
            this.isVisible = false;
            this.isMinimized = false;
            
            console.log('✅ [HIDE] 日志面板已确保隐藏');
        } else {
            console.warn('⚠️  [HIDE] 日志面板元素不存在');
        }
    }

    /**
     * 构建日志界面
     */
    buildLogInterface() {
        console.log('🔍 [DEBUG] buildLogInterface 被调用，panel元素:', this.elements.panel);
        if (!this.elements.panel) {
            console.warn('⚠️  日志面板元素不存在，跳过界面构建');
            return;
        }

        console.log('🔍 [DEBUG] 开始构建新的日志界面');

        // 创建日志选择器
        const selector = this.createLogSelector();
        
        // 创建标签页
        const tabs = this.createLogTabs();
        
        // 创建过滤器
        const filters = this.createLogFilters();
        
        // 创建统计信息
        const stats = this.createLogStats();
        
        // 创建日志内容区域
        const content = this.createLogContent();
        
        // 创建操作按钮
        const actions = this.createLogActions();

        // 构建完整界面
        this.elements.panel.innerHTML = `
            <div class="loading-logs-header">
                <h4 class="loading-logs-title">
                    <i class="fas fa-code"></i>
                    <span>系统化计算日志</span>
                </h4>
                <div class="loading-logs-controls">
                    <button id="loading-logs-minimize" class="loading-logs-control-btn" title="最小化">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button id="loading-logs-close" class="loading-logs-control-btn" title="关闭">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            ${selector}
            ${tabs}
            ${filters}
            ${stats}
            ${content}
            ${actions}
        `;

        console.log('🔍 [DEBUG] 新日志界面已构建，重新绑定事件监听器');
        // 重新绑定事件监听器
        this.rebindEventListeners();
    }

    /**
     * 创建日志选择器
     */
    createLogSelector() {
        const currentCategory = this.currentPage === 'compare' ? 'compare' : 'single';
        
        return `
            <div class="loading-logs-selector">
                <div class="log-category-selector">
                    <label for="log-category-select">
                        <i class="${this.logCategories[currentCategory].icon}"></i>
                        分类:
                    </label>
                    <select id="log-category-select" class="log-category-select">
                        <option value="${currentCategory}" selected>
                            ${this.logCategories[currentCategory].name}
                        </option>
                    </select>
                </div>
            </div>
        `;
    }

    /**
     * 创建日志标签页
     */
    createLogTabs() {
        const currentCategory = this.currentPage === 'compare' ? 'compare' : 'single';
        const subcategories = this.logCategories[currentCategory].subcategories;
        
        let tabsHtml = `
            <div class="log-tabs-container">
                <button class="log-tab active" data-tab="all">
                    <i class="fas fa-list"></i>
                    全部
                    <span class="tab-badge" id="tab-badge-all">0</span>
                </button>
        `;
        
        Object.entries(subcategories).forEach(([key, category]) => {
            tabsHtml += `
                <button class="log-tab" data-tab="${key}">
                    <i class="${category.icon}"></i>
                    ${category.name}
                    <span class="tab-badge" id="tab-badge-${key}">0</span>
                </button>
            `;
        });
        
        tabsHtml += '</div>';
        return tabsHtml;
    }

    /**
     * 创建日志过滤器
     */
    createLogFilters() {
        let filtersHtml = '<div class="log-filters">';
        
        Object.entries(this.logTypes).forEach(([key, type]) => {
            const isActive = this.activeFilters.has(key) ? 'active' : '';
            filtersHtml += `
                <button class="log-filter-chip filter-${key} ${isActive}" data-filter="${key}">
                    <i class="${type.icon}"></i>
                    ${type.name}
                </button>
            `;
        });
        
        filtersHtml += '</div>';
        return filtersHtml;
    }

    /**
     * 创建日志统计信息
     */
    createLogStats() {
        return `
            <div class="loading-logs-stats">
                <div class="loading-stat-group">
                    <div class="loading-stat">
                        <span class="stat-label">进度:</span>
                        <span id="loading-progress-text" class="stat-value">等待开始...</span>
                    </div>
                    <div class="loading-stat">
                        <span class="stat-label">用时:</span>
                        <span id="loading-time-text" class="stat-value">-</span>
                    </div>
                </div>
                <div class="loading-stat-group">
                    <div class="loading-stat">
                        <span class="stat-label">总数:</span>
                        <span id="log-total-count" class="stat-value">0</span>
                    </div>
                    <div class="loading-stat">
                        <span class="stat-label">错误:</span>
                        <span id="log-error-count" class="stat-value error">0</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 创建日志内容区域
     */
    createLogContent() {
        return `
            <div class="loading-logs-content">
                <div id="loading-logs-container" class="loading-logs-list">
                    <div class="loading-logs-empty">
                        <i class="fas fa-info-circle"></i>
                        <div>暂无日志数据</div>
                        <small>计算开始后将显示详细日志</small>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 创建日志操作按钮
     */
    createLogActions() {
        return `
            <div class="logs-actions">
                <button class="logs-action-btn" id="logs-clear-btn">
                    <i class="fas fa-trash"></i>
                    清空
                </button>
                <button class="logs-action-btn" id="logs-export-btn">
                    <i class="fas fa-download"></i>
                    导出
                </button>
                <button class="logs-action-btn primary" id="logs-refresh-btn">
                    <i class="fas fa-sync"></i>
                    刷新
                </button>
            </div>
        `;
    }

    /**
     * 重新绑定事件监听器
     */
    rebindEventListeners() {
        // 重新获取元素
        this.initElements();
        this.setupEventListeners();
        
        // 标签页切换
        document.querySelectorAll('.log-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // 过滤器切换
        document.querySelectorAll('.log-filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const filterType = e.currentTarget.dataset.filter;
                this.toggleFilter(filterType);
            });
        });
        
        // 操作按钮
        const clearBtn = document.getElementById('logs-clear-btn');
        const exportBtn = document.getElementById('logs-export-btn');
        const refreshBtn = document.getElementById('logs-refresh-btn');
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearLogs());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportLogs());
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshLogs());
        }
    }

    /**
     * 切换标签页
     */
    switchTab(tabName) {
        this.activeTab = tabName;
        
        // 更新UI
        document.querySelectorAll('.log-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // 重新渲染日志
        this.renderLogs();
    }

    /**
     * 切换过滤器
     */
    toggleFilter(filterType) {
        if (this.activeFilters.has(filterType)) {
            this.activeFilters.delete(filterType);
        } else {
            this.activeFilters.add(filterType);
        }
        
        // 更新UI
        const chip = document.querySelector(`[data-filter="${filterType}"]`);
        chip.classList.toggle('active');
        
        // 重新渲染日志
        this.renderLogs();
    }

    /**
     * 显示/隐藏面板
     */
    togglePanel() {
        if (this.isVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    /**
     * 显示面板
     */
    showPanel() {
        console.log('🔧 [SHOW] 开始显示日志面板');
        
        if (!this.elements.panel) {
            console.warn('⚠️  [SHOW] 日志面板元素不存在，尝试重新获取');
            this.initElements();
        }
        
        if (!this.elements.panel) {
            console.error('❌ [SHOW] 无法找到日志面板元素');
            return;
        }
        
        console.log('🔧 [SHOW] 设置面板可见性');
        this.isVisible = true;
        
        // 重置内联样式，让CSS类控制显示
        this.elements.panel.style.opacity = '';
        this.elements.panel.style.transform = '';
        
        // 首先显示面板，然后添加visible类以触发动画
        this.elements.panel.style.display = 'block';
        
        // 使用requestAnimationFrame确保display样式已应用
        requestAnimationFrame(() => {
            this.elements.panel.classList.add('visible');
        });
        
        // 确保面板在顶层显示
        this.elements.panel.style.zIndex = '9999';
        
        console.log('🔧 [SHOW] 开始日志更新');
        this.startLogUpdates();
        
        console.log('✅ [SHOW] 日志面板显示完成');
    }

    /**
     * 隐藏面板
     */
    hidePanel() {
        console.log('🔧 [HIDE] 开始隐藏日志面板');
        
        if (!this.elements.panel) {
            console.warn('⚠️  [HIDE] 日志面板元素不存在');
            return;
        }
        
        console.log('🔧 [HIDE] 设置面板隐藏');
        this.isVisible = false;
        this.elements.panel.classList.remove('visible');
        this.elements.panel.classList.remove('minimized');
        this.isMinimized = false;
        
        // 等待动画完成后再隐藏
        setTimeout(() => {
            if (!this.isVisible) {
                this.elements.panel.style.display = 'none';
                // 确保完全隐藏
                this.elements.panel.style.opacity = '0';
                this.elements.panel.style.transform = 'translateX(100%)';
            }
        }, 400); // 与CSS动画时间保持一致
        
        console.log('🔧 [HIDE] 停止日志更新');
        this.stopLogUpdates();
        
        console.log('✅ [HIDE] 日志面板隐藏完成');
    }

    /**
     * 最小化/还原面板
     */
    toggleMinimize() {
        if (!this.elements.panel) return;
        
        this.isMinimized = !this.isMinimized;
        this.elements.panel.classList.toggle('minimized');
        
        const icon = this.elements.minimizeBtn.querySelector('i');
        if (this.isMinimized) {
            icon.className = 'fas fa-plus';
        } else {
            icon.className = 'fas fa-minus';
        }
    }

    /**
     * 开始日志更新
     */
    startLogUpdates() {
        this.startTime = Date.now();
        
        // 时间更新
        this.timeUpdateInterval = setInterval(() => {
            this.updateTime();
        }, 100);
        
        // 日志更新
        this.updateInterval = setInterval(() => {
            this.fetchLogs();
        }, 1000);
        
        // 立即获取一次日志
        this.fetchLogs();
    }

    /**
     * 停止日志更新
     */
    stopLogUpdates() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
            this.timeUpdateInterval = null;
        }
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * 更新时间显示
     */
    updateTime() {
        if (!this.startTime || !this.elements.timeText) return;
        
        const elapsed = Date.now() - this.startTime;
        const seconds = (elapsed / 1000).toFixed(1);
        this.elements.timeText.textContent = `${seconds}s`;
    }

    /**
     * 获取日志数据
     */
    async fetchLogs() {
        try {
            // 构建请求参数
            const params = new URLSearchParams({
                limit: 100,
                page: this.currentPage,
                category: this.activeTab !== 'all' ? this.activeTab : ''
            });
            
            const response = await fetch(`/api/logs?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.processLogData(data);
            
        } catch (error) {
            console.error('获取日志失败:', error);
            this.addLog('error', '获取日志失败: ' + error.message, 'system');
        }
    }

    /**
     * 处理日志数据
     */
    processLogData(data) {
        if (!data || !Array.isArray(data.logs)) return;
        
        // 处理新日志
        data.logs.forEach(logItem => {
            if (!this.logs.find(existing => existing.id === logItem.id)) {
                this.logs.unshift(this.normalizeLogItem(logItem));
            }
        });
        
        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        
        // 更新统计信息
        this.updateStats(data.stats);
        
        // 重新渲染
        this.renderLogs();
        this.updateTabBadges();
    }

    /**
     * 标准化日志项
     */
    normalizeLogItem(item) {
        const normalizedItem = {
            id: item.id || Date.now() + Math.random(),
            timestamp: item.timestamp || new Date().toISOString(),
            type: item.type || 'info',
            message: item.message || '',
            details: item.details || '',
            category: item.category || this.detectCategory(item),
            subcategory: item.subcategory || this.detectSubcategory(item),
            model: item.model || '',
            dimension: item.dimension || this.detectDimension(item)
        };
        
        return normalizedItem;
    }

    /**
     * 检测日志分类
     */
    detectCategory(item) {
        if (this.currentPage === 'compare') {
            return 'compare';
        }
        return 'single';
    }

    /**
     * 检测子分类
     */
    detectSubcategory(item) {
        const message = (item.message || '').toLowerCase();
        
        // 对于比较页面和单一计算页面，都按模型类型分类
        if (message.includes('dill') && !message.includes('enhanced')) return 'dill';
        if (message.includes('enhanced') || message.includes('厚胶')) return 'enhanced_dill';
        if (message.includes('car')) return 'car';
        
        // 如果没有明确的模型信息，尝试从当前选择的模型获取
        try {
            const modelType = document.getElementById('model-select')?.value;
            if (modelType) {
                return modelType;
            }
        } catch (error) {
            console.warn('无法获取当前模型类型:', error);
        }
        
        return 'unknown';
    }



    /**
     * 更新统计信息
     */
    updateStats(stats) {
        if (stats) {
            if (stats.progress !== undefined && this.elements.progressText) {
                this.elements.progressText.textContent = stats.progress;
            }
        }
        
        // 计算本地统计
        const totalCount = this.logs.length;
        const errorCount = this.logs.filter(log => log.type === 'error').length;
        
        const totalCountEl = document.getElementById('log-total-count');
        const errorCountEl = document.getElementById('log-error-count');
        
        if (totalCountEl) totalCountEl.textContent = totalCount;
        if (errorCountEl) errorCountEl.textContent = errorCount;
    }

    /**
     * 渲染日志列表
     */
    renderLogs() {
        if (!this.elements.container) return;
        
        // 过滤日志
        const filteredLogs = this.filterLogs();
        
        if (filteredLogs.length === 0) {
            this.elements.container.innerHTML = `
                <div class="loading-logs-empty">
                    <i class="fas fa-search"></i>
                    <div>没有匹配的日志</div>
                    <small>尝试调整过滤条件</small>
                </div>
            `;
            return;
        }
        
        // 生成日志HTML
        const logsHtml = filteredLogs.map(log => this.createLogItemHtml(log)).join('');
        this.elements.container.innerHTML = logsHtml;
        
        // 滚动到顶部显示最新日志
        this.elements.container.scrollTop = 0;
    }

    /**
     * 过滤日志
     */
    filterLogs() {
        return this.logs.filter(log => {
            // 类型过滤
            if (!this.activeFilters.has(log.type)) {
                return false;
            }
            
            // 标签页过滤
            if (this.activeTab !== 'all' && log.subcategory !== this.activeTab) {
                return false;
            }
            
            return true;
        });
    }

    /**
     * 创建日志项HTML
     */
    createLogItemHtml(log) {
        const typeInfo = this.logTypes[log.type] || this.logTypes.info;
        const categoryInfo = this.getCurrentCategoryInfo();
        const subcategoryInfo = categoryInfo.subcategories[log.subcategory] || {};
        
        const formattedTime = this.formatTime(new Date(log.timestamp));
        
        // 获取维度信息，优先使用日志中的维度信息，其次使用当前选择的维度
        let dimension = log.dimension || this.getCurrentDimension();
        
        // 构建模型名称显示文本
        let modelDisplayName = subcategoryInfo.name || log.subcategory;
        if (dimension) {
            modelDisplayName += dimension;
        }
        
        return `
            <div class="loading-log-item ${log.type} model-${log.subcategory}" data-log-id="${log.id}">
                <div class="loading-log-icon">
                    <i class="${typeInfo.icon}"></i>
                </div>
                <div class="loading-log-content">
                    <div class="loading-log-timestamp">${formattedTime}</div>
                    <div class="loading-log-message">${this.escapeHtml(log.message)}</div>
                    ${log.details ? `<div class="loading-log-details">${this.escapeHtml(log.details)}</div>` : ''}
                </div>
                ${modelDisplayName ? `<div class="model-indicator model-${log.subcategory}">${modelDisplayName}</div>` : ''}
            </div>
        `;
    }

    /**
     * 获取当前分类信息
     */
    getCurrentCategoryInfo() {
        return this.logCategories[this.currentPage === 'compare' ? 'compare' : 'single'];
    }

    /**
     * 更新标签页徽章
     */
    updateTabBadges() {
        const categoryInfo = this.getCurrentCategoryInfo();
        
        // 全部标签页
        const allBadge = document.getElementById('tab-badge-all');
        if (allBadge) {
            allBadge.textContent = this.logs.length;
        }
        
        // 各子分类标签页
        Object.keys(categoryInfo.subcategories).forEach(subcategory => {
            const badge = document.getElementById(`tab-badge-${subcategory}`);
            if (badge) {
                const count = this.logs.filter(log => log.subcategory === subcategory).length;
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            }
        });
    }

    /**
     * 手动添加日志
     */
    addLog(type, message, subcategory = 'unknown', details = '') {
        const log = this.normalizeLogItem({
            type,
            message,
            details,
            subcategory,
            timestamp: new Date().toISOString()
        });
        
        this.logs.unshift(log);
        
        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        
        // 如果面板可见，立即更新
        if (this.isVisible) {
            this.renderLogs();
            this.updateTabBadges();
            this.updateStats();
        }
    }

    /**
     * 清空日志
     */
    clearLogs() {
        if (confirm('确定要清空所有日志吗？')) {
            this.logs = [];
            this.renderLogs();
            this.updateTabBadges();
            this.updateStats();
        }
    }

    /**
     * 导出日志
     */
    exportLogs() {
        const filteredLogs = this.filterLogs();
        const data = {
            exportTime: new Date().toISOString(),
            page: this.currentPage,
            totalLogs: filteredLogs.length,
            logs: filteredLogs
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${this.currentPage}-${new Date().toISOString().slice(0, 19)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    /**
     * 刷新日志
     */
    refreshLogs() {
        console.log('🔄 手动刷新日志');
        this.fetchLogs();
    }

    /**
     * 自动刷新日志（在计算开始时调用）
     */
    autoRefreshLogsOnCalculation() {
        console.log('🚀 计算开始 - 自动刷新日志');
        
        // 立即刷新一次
        this.fetchLogs();
        
        // 不再自动显示面板，只有用户点击才显示
        // if (!this.isVisible) {
        //     this.showPanel();
        // }
        
        // 确保正在更新日志（但不显示面板）
        if (!this.updateInterval) {
            // 只启动日志更新，不显示面板
            this.startTime = Date.now();
            
            // 时间更新
            this.timeUpdateInterval = setInterval(() => {
                this.updateTime();
            }, 100);
            
            // 日志更新
            this.updateInterval = setInterval(() => {
                this.fetchLogs();
            }, 1000);
        }
        
        console.log('📝 日志已开始后台更新，点击日志按钮查看详情');
    }

    /**
     * 格式化时间
     */
    formatTime(date) {
        return date.toLocaleTimeString('zh-CN', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * HTML转义
     */
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * 强制接管日志按钮的点击事件
     */
    forceOverrideLogButton() {
        console.log('🔧 [FORCE] 强制接管日志按钮点击事件');
        
        // 移除所有现有的点击事件监听器
        const btn = document.getElementById('loading-logs-btn');
        if (btn) {
            // 克隆按钮来移除所有事件监听器
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // 添加新的点击事件
            newBtn.addEventListener('click', () => {
                console.log('🔧 [FORCE] 新系统日志按钮被点击');
                this.togglePanel();
            });
            
            console.log('✅ [FORCE] 日志按钮事件已被新系统接管');
        } else {
            console.warn('⚠️  [FORCE] 未找到日志按钮');
        }
    }

    /**
     * 演示新系统功能
     */
    demonstrateNewSystem() {
        console.log('🎯 [DEMO] 开始演示新的日志系统');
        
        // 延迟3秒后自动显示，给页面加载时间
        setTimeout(() => {
            console.log('🎯 [DEMO] 显示新日志系统');
            
            // 添加一些示例日志
            this.addLog('info', '🎉 新的系统化日志管理器已启动！', '2d', '这是一个增强的日志系统，支持分类、过滤和搜索功能');
            this.addLog('success', '✅ 系统初始化完成', '1d', '所有组件已成功加载');
            this.addLog('progress', '📊 准备就绪，等待计算任务', '3d');
            
            // 显示面板
            this.showPanel();
            
            console.log('🎯 [DEMO] 新日志系统演示完成');
        }, 3000);
    }

    /**
     * 获取当前选中模型的维度信息
     */
    getCurrentDimension() {
        try {
            const modelType = document.getElementById('model-select')?.value;
            if (!modelType) return '';

            // 根据模型类型获取对应的sine-type选择器
            let sineTypeSelector;
            switch(modelType) {
                case 'dill':
                    sineTypeSelector = document.getElementById('dill-sine-type');
                    break;
                case 'enhanced_dill':
                    sineTypeSelector = document.getElementById('enhanced-dill-sine-type');
                    break;
                case 'car':
                    sineTypeSelector = document.getElementById('car-sine-type');
                    break;
                default:
                    return '';
            }

            const sineType = sineTypeSelector?.value;
            
            // 根据正弦波类型确定维度
            switch(sineType) {
                case 'single':
                    return '-1D';
                case 'multi':
                    return '-2D';
                case '3d':
                    return '-3D';
                default:
                    return '';
            }
        } catch (error) {
            console.warn('获取当前维度信息失败:', error);
            return '';
        }
    }

    /**
     * 检测维度信息
     */
    detectDimension(item) {
        const message = (item.message || '').toLowerCase();
        
        // 从参数或消息中检测维度
        if (item.dimension) {
            // 如果dimension已经有-前缀，直接返回
            if (item.dimension.startsWith('-')) {
                return item.dimension;
            }
            // 否则格式化为-XD格式
            return `-${item.dimension.toUpperCase()}`;
        }
        
        // 优先检测明确的维度标识
        if (message.includes('3d') || message.includes('三维') || message.includes('三维空间') || message.includes('3d正弦波')) return '-3D';
        if (message.includes('2d') || message.includes('二维') || message.includes('多正弦') || message.includes('multi') || message.includes('2d正弦波')) return '-2D';
        if (message.includes('1d') || message.includes('一维') || message.includes('单正弦') || message.includes('single') || message.includes('1d正弦波')) return '-1D';
        
        // 从日志类型中检测（根据后端dimension参数）
        if (item.dimension === '3d') return '-3D';
        if (item.dimension === '2d') return '-2D';
        if (item.dimension === '1d') return '-1D';
        
        return '';
    }
}

// 全局实例
window.systematicLogManager = null;

// 初始化函数
function initSystematicLogs() {
    console.log('🔍 [DEBUG] initSystematicLogs 函数被调用');
    if (!window.systematicLogManager) {
        console.log('🔍 [DEBUG] 创建新的 SystematicLogManager 实例');
        window.systematicLogManager = new SystematicLogManager();
    } else {
        console.log('🔍 [DEBUG] SystematicLogManager 实例已存在');
    }
    return window.systematicLogManager;
}

// 兼容性函数 - 保持向后兼容
function initLoadingLogs() {
    return initSystematicLogs();
}

function toggleLoadingLogsPanel() {
    if (window.systematicLogManager) {
        window.systematicLogManager.togglePanel();
    }
}

function showLoadingLogsPanel() {
    if (window.systematicLogManager) {
        window.systematicLogManager.showPanel();
    }
}

function hideLoadingLogsPanel() {
    if (window.systematicLogManager) {
        window.systematicLogManager.hidePanel();
    }
}

function toggleLoadingLogsPanelMinimize() {
    if (window.systematicLogManager) {
        window.systematicLogManager.toggleMinimize();
    }
}

function startLoadingLogsUpdate() {
    if (window.systematicLogManager) {
        window.systematicLogManager.startLogUpdates();
    }
}

function stopLoadingLogsUpdate() {
    if (window.systematicLogManager) {
        window.systematicLogManager.stopLogUpdates();
    }
}

// 暴露给全局作用域
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SystematicLogManager, initSystematicLogs };
}