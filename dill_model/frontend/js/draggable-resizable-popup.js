/**
 * 可拖拽和缩放的弹窗组件
 * 增强版本的点详细信息弹窗，支持拖拽和四周缩放
 */

class DraggableResizablePopup {
    constructor(options = {}) {
        this.options = {
            minWidth: 300,
            minHeight: 200,
            maxWidth: window.innerWidth * 0.9,
            maxHeight: window.innerHeight * 0.9,
            defaultWidth: 750,  // 调整宽度为750px
            defaultHeight: 600, // 更大的默认高度，接近原始compare页面的600px
            ...options
        };
        
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.startX = 0;
        this.startY = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        this.startLeft = 0;
        this.startTop = 0;
        
        this.popup = null;
        this.content = null;
        this.header = null;
        this.body = null;
        
        this.bindEvents();
    }
    
    /**
     * 创建弹窗
     */
    create(title, content, x = 0, y = 0) {
        // 移除已存在的弹窗
        this.remove();
        
        // 创建弹窗容器
        this.popup = document.createElement('div');
        this.popup.className = 'draggable-resizable-popup';
        this.popup.innerHTML = `
            <div class="popup-resize-handle resize-nw"></div>
            <div class="popup-resize-handle resize-n"></div>
            <div class="popup-resize-handle resize-ne"></div>
            <div class="popup-resize-handle resize-w"></div>
            <div class="popup-resize-handle resize-e"></div>
            <div class="popup-resize-handle resize-sw"></div>
            <div class="popup-resize-handle resize-s"></div>
            <div class="popup-resize-handle resize-se"></div>
            
            <div class="popup-content">
                <div class="popup-header">
                    <span class="popup-title">${title}</span>
                    <button class="popup-close">×</button>
                </div>
                <div class="popup-body">
                    ${content}
                </div>
            </div>
        `;
        
        // 获取元素引用
        this.content = this.popup.querySelector('.popup-content');
        this.header = this.popup.querySelector('.popup-header');
        this.body = this.popup.querySelector('.popup-body');
        
        // 设置初始位置和大小
        this.setPosition(x, y);
        this.setSize(this.options.defaultWidth, this.options.defaultHeight);
        
        // 添加到DOM
        document.body.appendChild(this.popup);
        
        // 绑定事件
        this.bindPopupEvents();
        
        // 添加显示动画
        this.popup.style.animation = 'popupFadeIn 0.3s ease-out';
        
        return this.popup;
    }
    
    /**
     * 设置弹窗位置
     */
    setPosition(x, y) {
        if (!this.popup) return;
        
        // 确保弹窗在视口内
        const maxX = window.innerWidth - this.popup.offsetWidth;
        const maxY = window.innerHeight - this.popup.offsetHeight;
        
        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));
        
        this.popup.style.left = x + 'px';
        this.popup.style.top = y + 'px';
    }
    
    /**
     * 设置弹窗大小
     */
    setSize(width, height) {
        if (!this.popup) return;
        
        // 限制最小和最大尺寸
        width = Math.max(this.options.minWidth, Math.min(width, this.options.maxWidth));
        height = Math.max(this.options.minHeight, Math.min(height, this.options.maxHeight));
        
        this.popup.style.width = width + 'px';
        this.popup.style.height = height + 'px';
        
        // 调整文字大小以适应当前空间
        this.adjustTextSize();
    }
    
    /**
     * 根据弹窗大小调整文字尺寸
     */
    adjustTextSize() {
        if (!this.body) return;
        
        const width = this.popup.offsetWidth;
        const height = this.popup.offsetHeight;
        
        // 计算基础字体大小 (基于弹窗面积)
        const area = width * height;
        const baseArea = this.options.defaultWidth * this.options.defaultHeight;
        const scale = Math.sqrt(area / baseArea);
        
        // 限制缩放范围
        const minScale = 0.8;
        const maxScale = 1.5;
        const finalScale = Math.max(minScale, Math.min(scale, maxScale));
        
        // 应用字体缩放
        this.body.style.fontSize = (14 * finalScale) + 'px';
        this.body.style.lineHeight = (1.6 * finalScale);
        
        // 调整内边距
        const padding = Math.max(16, 28 * finalScale);
        this.body.style.padding = padding + 'px';
        
        // 调整标题字体
        const titleElement = this.popup.querySelector('.popup-title');
        if (titleElement) {
            titleElement.style.fontSize = (18 * finalScale) + 'px';
        }
    }
    
    /**
     * 绑定弹窗相关事件
     */
    bindPopupEvents() {
        // 关闭按钮事件
        const closeBtn = this.popup.querySelector('.popup-close');
        closeBtn.addEventListener('click', () => this.remove());
        
        // 拖拽事件
        this.header.addEventListener('mousedown', this.handleDragStart.bind(this));
        
        // 缩放事件
        const resizeHandles = this.popup.querySelectorAll('.popup-resize-handle');
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', this.handleResizeStart.bind(this));
        });
        
        // 外部点击关闭
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick.bind(this));
        }, 100);
    }
    
    /**
     * 开始拖拽
     */
    handleDragStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startLeft = this.popup.offsetLeft;
        this.startTop = this.popup.offsetTop;
        
        this.popup.style.zIndex = '10001';
        this.header.style.cursor = 'grabbing';
        
        document.addEventListener('mousemove', this.handleDragMove.bind(this));
        document.addEventListener('mouseup', this.handleDragEnd.bind(this));
    }
    
    /**
     * 拖拽移动
     */
    handleDragMove(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        
        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;
        
        const newLeft = this.startLeft + deltaX;
        const newTop = this.startTop + deltaY;
        
        this.setPosition(newLeft, newTop);
    }
    
    /**
     * 结束拖拽
     */
    handleDragEnd(e) {
        this.isDragging = false;
        this.popup.style.zIndex = '10000';
        this.header.style.cursor = 'grab';
        
        document.removeEventListener('mousemove', this.handleDragMove.bind(this));
        document.removeEventListener('mouseup', this.handleDragEnd.bind(this));
    }
    
    /**
     * 开始缩放
     */
    handleResizeStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.isResizing = true;
        this.resizeHandle = e.target.classList[1]; // 获取方向类名
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startWidth = this.popup.offsetWidth;
        this.startHeight = this.popup.offsetHeight;
        this.startLeft = this.popup.offsetLeft;
        this.startTop = this.popup.offsetTop;
        
        this.popup.style.zIndex = '10001';
        
        document.addEventListener('mousemove', this.handleResizeMove.bind(this));
        document.addEventListener('mouseup', this.handleResizeEnd.bind(this));
    }
    
    /**
     * 缩放移动
     */
    handleResizeMove(e) {
        if (!this.isResizing) return;
        
        e.preventDefault();
        
        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;
        
        let newWidth = this.startWidth;
        let newHeight = this.startHeight;
        let newLeft = this.startLeft;
        let newTop = this.startTop;
        
        // 根据缩放方向调整尺寸和位置
        switch (this.resizeHandle) {
            case 'resize-nw':
                newWidth = this.startWidth - deltaX;
                newHeight = this.startHeight - deltaY;
                newLeft = this.startLeft + deltaX;
                newTop = this.startTop + deltaY;
                break;
            case 'resize-n':
                newHeight = this.startHeight - deltaY;
                newTop = this.startTop + deltaY;
                break;
            case 'resize-ne':
                newWidth = this.startWidth + deltaX;
                newHeight = this.startHeight - deltaY;
                newTop = this.startTop + deltaY;
                break;
            case 'resize-w':
                newWidth = this.startWidth - deltaX;
                newLeft = this.startLeft + deltaX;
                break;
            case 'resize-e':
                newWidth = this.startWidth + deltaX;
                break;
            case 'resize-sw':
                newWidth = this.startWidth - deltaX;
                newHeight = this.startHeight + deltaY;
                newLeft = this.startLeft + deltaX;
                break;
            case 'resize-s':
                newHeight = this.startHeight + deltaY;
                break;
            case 'resize-se':
                newWidth = this.startWidth + deltaX;
                newHeight = this.startHeight + deltaY;
                break;
        }
        
        // 应用限制
        newWidth = Math.max(this.options.minWidth, Math.min(newWidth, this.options.maxWidth));
        newHeight = Math.max(this.options.minHeight, Math.min(newHeight, this.options.maxHeight));
        
        // 如果是从左侧或顶部缩放，需要调整位置
        if (this.resizeHandle.includes('w')) {
            newLeft = this.startLeft + (this.startWidth - newWidth);
        }
        if (this.resizeHandle.includes('n')) {
            newTop = this.startTop + (this.startHeight - newHeight);
        }
        
        // 确保不超出视口
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - newWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - newHeight));
        
        this.popup.style.width = newWidth + 'px';
        this.popup.style.height = newHeight + 'px';
        this.popup.style.left = newLeft + 'px';
        this.popup.style.top = newTop + 'px';
        
        // 实时调整文字大小
        this.adjustTextSize();
    }
    
    /**
     * 结束缩放
     */
    handleResizeEnd(e) {
        this.isResizing = false;
        this.resizeHandle = null;
        this.popup.style.zIndex = '10000';
        
        document.removeEventListener('mousemove', this.handleResizeMove.bind(this));
        document.removeEventListener('mouseup', this.handleResizeEnd.bind(this));
    }
    
    /**
     * 处理外部点击关闭
     */
    handleOutsideClick(e) {
        if (this.popup && !this.popup.contains(e.target)) {
            this.remove();
        }
    }
    
    /**
     * 绑定全局事件
     */
    bindEvents() {
        // 窗口大小改变时调整弹窗位置
        window.addEventListener('resize', () => {
            if (this.popup) {
                this.setPosition(this.popup.offsetLeft, this.popup.offsetTop);
            }
        });
    }
    
    /**
     * 移除弹窗
     */
    remove() {
        if (this.popup) {
            this.popup.style.animation = 'popupFadeOut 0.2s ease-in';
            setTimeout(() => {
                if (this.popup && this.popup.parentNode) {
                    this.popup.parentNode.removeChild(this.popup);
                }
                this.popup = null;
            }, 200);
        }
        
        // 移除事件监听器
        document.removeEventListener('click', this.handleOutsideClick.bind(this));
    }
}

// 全局实例
window.draggablePopupInstance = null;

/**
 * 显示可拖拽缩放的点详细信息弹窗
 * @param {string} title - 弹窗标题
 * @param {string} content - 弹窗内容HTML
 * @param {number} x - 初始X位置
 * @param {number} y - 初始Y位置
 */
function showDraggablePopup(title, content, x = null, y = null) {
    // 移除已存在的弹窗
    if (window.draggablePopupInstance) {
        window.draggablePopupInstance.remove();
    }
    
    // 如果没有指定位置，则计算屏幕中央位置
    if (x === null || y === null) {
        const defaultWidth = 750;
        const defaultHeight = 600;
        x = (window.innerWidth - defaultWidth) / 2;
        y = (window.innerHeight - defaultHeight) / 2;
        
        // 确保位置不会小于0
        x = Math.max(0, x);
        y = Math.max(0, y);
    }
    
    // 创建新的弹窗实例
    window.draggablePopupInstance = new DraggableResizablePopup();
    return window.draggablePopupInstance.create(title, content, x, y);
}

/**
 * 移除可拖拽缩放弹窗
 */
function removeDraggablePopup() {
    if (window.draggablePopupInstance) {
        window.draggablePopupInstance.remove();
        window.draggablePopupInstance = null;
    }
}

// 导出全局函数
window.showDraggablePopup = showDraggablePopup;
window.removeDraggablePopup = removeDraggablePopup;