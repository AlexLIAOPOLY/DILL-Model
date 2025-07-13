// 通用功能JavaScript

/**
 * 初始化回到顶部按钮
 */
function initBackToTop() {
    // 创建回到顶部按钮
    const backToTopBtn = document.createElement('button');
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    
    // 获取当前语言，使用更安全的方式
    const currentLang = window.currentLang || localStorage.getItem('lang') || 'zh-CN';
    // 安全地访问语言对象
    const langObj = window.LANGS && window.LANGS[currentLang];
    
    // 使用默认文本，如果语言包中没有定义back_to_top
    const backToTopText = (langObj && langObj.back_to_top) ? langObj.back_to_top : '返回顶部';
    backToTopBtn.title = backToTopText;
    backToTopBtn.setAttribute('aria-label', backToTopText);
    
    // 添加到页面
    document.body.appendChild(backToTopBtn);
    
    // 监听滚动事件
    let ticking = false;
    
    function updateBackToTopVisibility() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
        
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateBackToTopVisibility);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
    
    // 点击回到顶部
    backToTopBtn.addEventListener('click', function() {
        // 平滑滚动到顶部
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // 添加点击动画效果
        this.style.transform = 'translateY(-2px) scale(0.95)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);
    });
    
    // 键盘支持
    backToTopBtn.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    });
}

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    initBackToTop();
    initProfessionalHeader();
    initProfessionalFooter();
    initScrollEffects();
    initNavigationActiveState();
    // 用事件委托修复所有详情按钮
    document.body.addEventListener('click', function(e) {
        const btn = e.target.closest('.toggle-details-btn');
        if (btn) {
            // 找到同级下一个.model-full-details
            let details = btn.parentElement.querySelector('.model-full-details');
            if (details) {
                const isVisible = details.classList.contains('details-visible');
                // 获取当前语言和语言包
                const lang = window.currentLang || 'zh';
                const LANGS = window.LANGS || {
                    zh: { btn_expand: '展开更多 <i class="fas fa-chevron-down"></i>', btn_collapse: '收起详情 <i class="fas fa-chevron-up"></i>' },
                    en: { btn_expand: 'Expand <i class="fas fa-chevron-down"></i>', btn_collapse: 'Collapse <i class="fas fa-chevron-up"></i>' }
                };
                if (isVisible) {
                    details.classList.remove('details-visible');
                    btn.innerHTML = LANGS[lang].btn_expand;
                } else {
                    details.classList.add('details-visible');
                    btn.innerHTML = LANGS[lang].btn_collapse;
                }
            }
        }
    });
});

/* ===========================================
   专业头部和底部交互功能
   =========================================== */

// 初始化专业头部功能
function initProfessionalHeader() {
    const header = document.querySelector('.professional-header');
    if (!header) return;

    // 语言切换功能
    const langToggleBtn = document.getElementById('lang-toggle-btn');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // 添加点击效果
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // 触发语言切换（如果存在全局语言切换函数）
            if (typeof toggleLanguage === 'function') {
                toggleLanguage();
            }
        });
    }

    // 导航链接平滑滚动效果
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // 如果是当前页面的锚点链接，添加平滑滚动
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });

        // 添加键盘导航支持
        link.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
}

// 初始化专业底部功能
function initProfessionalFooter() {
    const footer = document.querySelector('.professional-footer');
    if (!footer) return;

    // 底部链接点击效果
    const footerLinks = document.querySelectorAll('.footer-links a');
    footerLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // 如果是空链接或者井号链接，阻止默认行为
            const href = this.getAttribute('href');
            if (!href || href === '#') {
                e.preventDefault();
                
                // 显示提示信息
                showTooltipMessage(this, '功能即将推出');
            }
        });
    });

    // 徽章动画效果
    const badges = document.querySelectorAll('.badge');
    badges.forEach(badge => {
        badge.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.05)';
        });
        
        badge.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });

    // 联系信息复制功能
    const contactItems = document.querySelectorAll('.contact-item');
    contactItems.forEach(item => {
        const text = item.textContent.trim();
        if (text.includes('@') || text.includes('.hk') || text.includes('www.')) {
            item.style.cursor = 'pointer';
            item.title = '点击复制';
            
            item.addEventListener('click', function() {
                const textToCopy = this.textContent.trim();
                copyToClipboard(textToCopy);
                showTooltipMessage(this, '已复制到剪贴板');
            });
        }
    });
}

// 初始化滚动效果
function initScrollEffects() {
    const header = document.querySelector('.professional-header');
    if (!header) return;

    let lastScrollTop = 0;
    let ticking = false;

    function updateHeader() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 添加/移除滚动类
        if (scrollTop > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // 修改后的滚动方向检测逻辑
        if (scrollTop > lastScrollTop && scrollTop > 200) {
            // 向下滚动，隐藏头部
            header.style.transform = 'translateY(-100%)';
        } else if (scrollTop <= 50) {
            // 只有当滚动到接近顶部时（50px以内），才显示头部
            header.style.transform = 'translateY(0)';
        } else {
            // 在中间位置向上滚动时，保持头部隐藏状态
            header.style.transform = 'translateY(-100%)';
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick, { passive: true });

    // 页面可见性变化时重置头部状态
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            header.style.transform = 'translateY(0)';
        }
    });
}

// 初始化导航激活状态
function initNavigationActiveState() {
    const navItems = document.querySelectorAll('.nav-item');
    const currentPath = window.location.pathname;

    navItems.forEach(item => {
        const link = item.querySelector('.nav-link');
        if (link) {
            const href = link.getAttribute('href');
            
            // 检查当前页面是否匹配链接
            if (href && (
                currentPath.includes(href) || 
                (href === 'index.html' && (currentPath === '/' || currentPath.endsWith('/index.html'))) ||
                (href === 'compare.html' && currentPath.endsWith('/compare.html')) ||
                (href.includes('matrix_visualization') && currentPath.includes('matrix_visualization'))
            )) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    });
}

// 工具函数
function showTooltipMessage(element, message) {
    const tooltip = document.createElement('div');
    tooltip.className = 'temp-tooltip';
    tooltip.textContent = message;
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 0.5rem 0.8rem;
        border-radius: 6px;
        font-size: 0.8rem;
        white-space: nowrap;
        z-index: 1002;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    document.body.appendChild(tooltip);

    // 定位提示框
    const rect = element.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';

    // 显示动画
    setTimeout(() => {
        tooltip.style.opacity = '1';
    }, 10);

    // 自动移除
    setTimeout(() => {
        tooltip.style.opacity = '0';
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 300);
    }, 2000);
}

function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    } else {
        // 兼容旧浏览器
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
        } catch (error) {
            console.error('复制失败:', error);
        }
        
        document.body.removeChild(textArea);
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 通用工具函数
 */
window.CommonUtils = {
    initBackToTop: initBackToTop,
    initProfessionalHeader: initProfessionalHeader,
    initProfessionalFooter: initProfessionalFooter,
    initScrollEffects: initScrollEffects,
    initNavigationActiveState: initNavigationActiveState,
    showTooltipMessage: showTooltipMessage,
    copyToClipboard: copyToClipboard,
    debounce: debounce
}; 