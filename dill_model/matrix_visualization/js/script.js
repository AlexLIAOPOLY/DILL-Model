/**
 * 光刻胶模型矩阵可视化 - 交互脚本
 */

// 在DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化MathJax
    if (window.MathJax) {
        MathJax.Hub?.Queue(["Typeset", MathJax.Hub]);
    }

    // 获取DOM元素
    const matrixContainer = document.querySelector('.matrix-container');
    const viewModeToggle = document.getElementById('view-mode-toggle');
    const themeToggle = document.getElementById('theme-toggle');
    const languageToggle = document.getElementById('language-toggle');
    const expandButtons = document.querySelectorAll('.expand-button');
    const modalContainer = document.getElementById('modal-container');
    const modalClose = document.getElementById('modal-close');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const prevModelBtn = document.getElementById('prev-model');
    const nextModelBtn = document.getElementById('next-model');
    
    // 当前模态框状态
    let currentModal = {
        model: null,
        dimension: null,
        index: -1
    };
    
    // 当前语言
    let currentLanguage = localStorage.getItem('language') || 'zh-CN';
    
    // 模型数据
    const modelData = {
        'dill': {
            title: 'model_dill',
            description: 'dill_description',
            parameters: [
                { name: 'I_avg', description: 'param_i_avg' },
                { name: 'V', description: 'param_v' },
                { name: 'K', description: 'param_k' },
                { name: 't_exp', description: 'param_t_exp' },
                { name: 'C', description: 'param_c' }
            ],
            reference: 'Dill F H, Neureuther A R, Tuttle J A, et al. IEEE Trans Electron Devices, 1975.'
        },
        'enhanced-dill': {
            title: 'model_enhanced_dill',
            description: 'enhanced_dill_description',
            parameters: [
                { name: 'z_h', description: 'param_zh' },
                { name: 'T', description: 'param_t' },
                { name: 't_B', description: 'param_tb' },
                { name: 'I0', description: 'param_i0' },
                { name: 'M0', description: 'param_m0' },
                { name: 't_exp', description: 'param_t_exp' }
            ],
            reference: '刘世杰等《厚层抗蚀剂曝光模型及其参数测量》, 2005.'
        },
        'car': {
            title: 'model_car',
            description: 'car_description',
            parameters: [
                { name: 'I_avg', description: 'param_i_avg' },
                { name: 'V', description: 'param_v' },
                { name: 'K', description: 'param_k' },
                { name: 't_exp', description: 'param_t_exp' },
                { name: 'acid_gen_efficiency', description: 'param_acid_gen' },
                { name: 'diffusion_length', description: 'param_diff_len' },
                { name: 'reaction_rate', description: 'param_reaction_rate' },
                { name: 'amplification', description: 'param_amplification' },
                { name: 'contrast', description: 'param_contrast' }
            ],
            reference: 'Hinsberg et al., "Chemical amplification mechanism", Proc. SPIE, 1994.'
        }
    };
    
    // 维度说明
    const dimensionData = {
        '1d': {
            title: 'dim_1d',
            description: '1d_description'
        },
        '2d': {
            title: 'dim_2d',
            description: '2d_description'
        },
        '3d': {
            title: 'dim_3d',
            description: '3d_description'
        }
    };

    // 初始化页面
    initializeTheme();
    initializeLanguage();
    
    // 初始化主题色
    initThemeColors();
    
    // 视图模式切换
    viewModeToggle.addEventListener('click', function() {
        matrixContainer.classList.toggle('card-view');
        
        // 更新按钮图标和文本
        if (matrixContainer.classList.contains('card-view')) {
            viewModeToggle.innerHTML = '<i class="fas fa-th"></i> <span data-i18n="view_mode_toggle"></span>';
        } else {
            viewModeToggle.innerHTML = '<i class="fas fa-th-large"></i> <span data-i18n="view_mode_toggle"></span>';
        }
        
        // 应用切换动画
        const cells = document.querySelectorAll('.matrix-cell');
        cells.forEach((cell, index) => {
            // 清除可能存在的动画类
            cell.classList.remove('fade-in');
            
            // 触发重绘
            void cell.offsetWidth;
            
            // 添加新的动画类，并设置延迟
            cell.classList.add('fade-in');
            cell.style.animationDelay = `${index * 0.05}s`;
        });
        
        // 更新国际化文本
        updateI18n();
    });
    
    // 主题切换
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-theme');
        
        // 更新按钮图标和文本
        if (document.body.classList.contains('dark-theme')) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i> <span data-i18n="theme_toggle_light"></span>';
            localStorage.setItem('theme', 'dark');
        } else {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i> <span data-i18n="theme_toggle_dark"></span>';
            localStorage.setItem('theme', 'light');
        }
        
        // 更新MathJax渲染
        if (window.MathJax) {
            MathJax.Hub?.Queue(["Typeset", MathJax.Hub]);
        }
        
        // 更新国际化文本
        updateI18n();
    });
    
    // 语言切换
    languageToggle.addEventListener('click', function() {
        // 切换语言
        currentLanguage = currentLanguage === 'zh-CN' ? 'en-US' : 'zh-CN';
        localStorage.setItem('language', currentLanguage);
        
        // 更新页面文本
        updateI18n();
        
        // 更新MathJax渲染
        if (window.MathJax) {
            MathJax.Hub?.Queue(["Typeset", MathJax.Hub]);
        }
    });
    
    // 展开按钮点击事件
    expandButtons.forEach(button => {
        button.addEventListener('click', function() {
            const cell = this.closest('.matrix-cell');
            const model = cell.dataset.model;
            const dimension = cell.dataset.dimension;
            
            openModal(model, dimension);
        });
    });
    
    // 关闭模态框
    modalClose.addEventListener('click', closeModal);
    
    // 点击模态框外部关闭
    modalContainer.addEventListener('click', function(e) {
        if (e.target === modalContainer) {
            closeModal();
        }
    });
    
    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modalContainer.style.display === 'flex') {
            closeModal();
        }
    });
    
    // 上一个模型按钮
    prevModelBtn.addEventListener('click', function() {
        navigateModal(-1);
    });
    
    // 下一个模型按钮
    nextModelBtn.addEventListener('click', function() {
        navigateModal(1);
    });
    
    // 初始化主题
    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i> <span data-i18n="theme_toggle_light"></span>';
        } else {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i> <span data-i18n="theme_toggle_dark"></span>';
        }
    }
    
    // 初始化语言
    function initializeLanguage() {
        // 从本地存储获取语言设置
        currentLanguage = localStorage.getItem('language') || 'zh-CN';
        document.documentElement.lang = currentLanguage;
        
        // 更新页面文本
        updateI18n();
    }
    
    // 更新页面文本
    function updateI18n() {
        // 遍历所有带有data-i18n属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (i18n[currentLanguage] && i18n[currentLanguage][key]) {
                element.textContent = i18n[currentLanguage][key];
            }
        });
        
        // 更新标题属性
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            if (i18n[currentLanguage] && i18n[currentLanguage][key]) {
                element.title = i18n[currentLanguage][key];
            }
        });
        
        // 更新语言切换按钮文本
        languageToggle.querySelector('span').textContent = i18n[currentLanguage]['language_toggle'];
        
        // 更新文档标题
        document.title = i18n[currentLanguage]['page_title'];
    }
    
    // 打开模态框
    function openModal(model, dimension) {
        // 更新当前模态框状态
        currentModal.model = model;
        currentModal.dimension = dimension;
        updateCurrentModalIndex();
        
        // 设置模态框标题
        const modelTitle = i18n[currentLanguage][modelData[model]?.title] || '未知模型';
        const dimensionTitle = i18n[currentLanguage][dimensionData[dimension]?.title] || '未知维度';
        modalTitle.textContent = `${modelTitle} - ${dimensionTitle}`;
        
        // 填充模态框内容
        modalBody.innerHTML = generateModalContent(model, dimension);
        
        // 更新导航按钮状态
        updateNavigationButtons();
        
        // 显示模态框
        modalContainer.style.display = 'flex';
        
        // 阻止滚动
        document.body.style.overflow = 'hidden';
        
        // 渲染数学公式
        if (window.MathJax) {
            MathJax.Hub?.Queue(["Typeset", MathJax.Hub]);
        }
        
        // 更新模态框内的国际化文本
        updateI18n();
    }
    
    // 关闭模态框
    function closeModal() {
        modalContainer.style.display = 'none';
        
        // 恢复滚动
        document.body.style.overflow = '';
    }
    
    // 导航到其他模型
    function navigateModal(direction) {
        const cells = document.querySelectorAll('.matrix-cell');
        const newIndex = currentModal.index + direction;
        
        if (newIndex >= 0 && newIndex < cells.length) {
            const targetCell = cells[newIndex];
            const model = targetCell.dataset.model;
            const dimension = targetCell.dataset.dimension;
            
            openModal(model, dimension);
            
            // 高亮显示正在查看的单元格
            cells.forEach(cell => cell.classList.remove('highlight'));
            targetCell.classList.add('highlight');
        }
    }
    
    // 更新当前模态框索引
    function updateCurrentModalIndex() {
        const cells = document.querySelectorAll('.matrix-cell');
        
        cells.forEach((cell, index) => {
            if (cell.dataset.model === currentModal.model && 
                cell.dataset.dimension === currentModal.dimension) {
                currentModal.index = index;
            }
        });
    }
    
    // 更新导航按钮状态
    function updateNavigationButtons() {
        const cells = document.querySelectorAll('.matrix-cell');
        
        prevModelBtn.disabled = currentModal.index <= 0;
        nextModelBtn.disabled = currentModal.index >= cells.length - 1;
    }
    
    // 生成模态框内容
    function generateModalContent(model, dimension) {
        const modelInfo = modelData[model];
        const dimensionInfo = dimensionData[dimension];
        
        if (!modelInfo || !dimensionInfo) {
            return '<div class="error">模型或维度信息不可用</div>';
        }
        
        let content = `
            <div class="modal-model-info">
                <h3>${i18n[currentLanguage][modelInfo.title]}</h3>
                <p>${i18n[currentLanguage][modelInfo.description]}</p>
                
                <div class="parameter-list">
                    <h4 data-i18n="main_parameters">${i18n[currentLanguage]['main_parameters']}</h4>
                    <ul>
        `;
        
        modelInfo.parameters.forEach(param => {
            content += `
                <li>
                    <i class="fas fa-angle-right"></i>
                    <div class="param-description">
                        <span class="param-name">${param.name}:</span> ${i18n[currentLanguage][param.description]}
                    </div>
                </li>
            `;
        });
        
        content += `
                    </ul>
                </div>
                
                <p><strong data-i18n="reference">${i18n[currentLanguage]['reference']}</strong> ${modelInfo.reference}</p>
            </div>
            
            <div class="dimension-info">
                <h3>${i18n[currentLanguage][dimensionInfo.title]}</h3>
                <p>${i18n[currentLanguage][dimensionInfo.description]}</p>
                
                <div class="formula-details">
                    <h4 data-i18n="core_formulas">${i18n[currentLanguage]['core_formulas']}</h4>
                    ${getFormulasForModelAndDimension(model, dimension)}
                </div>
            </div>
        `;
        
        return content;
    }
    
    // 获取特定模型和维度的公式
    function getFormulasForModelAndDimension(model, dimension) {
        // 从页面上对应的单元格获取公式
        const cell = document.querySelector(`.matrix-cell[data-model="${model}"][data-dimension="${dimension}"]`);
        
        if (!cell) {
            return '<div class="error">找不到对应的公式</div>';
        }
        
        // 克隆公式部分并返回HTML
        const formulaSections = cell.querySelectorAll('.formula-section');
        let formulaHTML = '<div class="formula-comparison">';
        
        formulaSections.forEach(section => {
            const titleKey = section.querySelector('h4').getAttribute('data-i18n');
            
            // 获取公式HTML并替换\exp为e^
            let formulaContent = section.querySelector('.formula').innerHTML;
            formulaContent = formulaContent
                .replace(/\\exp\s*\(\s*-/g, "e^{-") // 替换\exp(-为e^{-
                .replace(/\)\s*\]/g, "} \\]"); // 替换)]为} \]
                
            // 修复可能被错误替换的公式
            formulaContent = formulaContent
                .replace(/\\text\{Deprotection\}/g, "\\text{Deprotection}")
                .replace(/\\text\{Thickness\}/g, "\\text{Thickness}");
                
            formulaHTML += `
                <div class="formula-block">
                    <h4 data-i18n="${titleKey}">${i18n[currentLanguage][titleKey]}</h4>
                    <div class="formula">${formulaContent}</div>
                    ${section.querySelector('.note') ? 
                        `<p class="note" ${section.querySelector('.note').hasAttribute('data-i18n') ? 
                            `data-i18n="${section.querySelector('.note').getAttribute('data-i18n')}"` : 
                            ''}>
                            ${section.querySelector('.note').hasAttribute('data-i18n') ? 
                                i18n[currentLanguage][section.querySelector('.note').getAttribute('data-i18n')] : 
                                section.querySelector('.note').innerHTML}
                        </p>` : ''}
                </div>
            `;
        });
        
        formulaHTML += '</div>';
        
        return formulaHTML;
    }
    
    // 添加单元格悬停效果
    const cells = document.querySelectorAll('.matrix-cell');
    cells.forEach(cell => {
        cell.addEventListener('mouseenter', function() {
            // 获取当前单元格的行和列
            const model = this.dataset.model;
            const dimension = this.dataset.dimension;
            
            // 高亮相同模型的单元格
            document.querySelectorAll(`.matrix-cell[data-model="${model}"]`).forEach(relatedCell => {
                if (relatedCell !== this) {
                    relatedCell.classList.add('related-highlight');
                }
            });
            
            // 高亮相同维度的单元格
            document.querySelectorAll(`.matrix-cell[data-dimension="${dimension}"]`).forEach(relatedCell => {
                if (relatedCell !== this) {
                    relatedCell.classList.add('related-highlight');
                }
            });
        });
        
        cell.addEventListener('mouseleave', function() {
            // 移除所有高亮效果
            document.querySelectorAll('.related-highlight').forEach(highlightedCell => {
                highlightedCell.classList.remove('related-highlight');
            });
        });
    });
    
    // 添加主题色功能
    function initThemeColors() {
        // 获取模型单元格
        const dillCells = document.querySelectorAll('.matrix-cell[data-model="dill"]');
        const enhancedDillCells = document.querySelectorAll('.matrix-cell[data-model="enhanced-dill"]');
        const carCells = document.querySelectorAll('.matrix-cell[data-model="car"]');
        
        // 应用红色主题给Dill模型单元格
        dillCells.forEach(cell => {
            cell.classList.add('theme-dill-cell');
        });
        
        // 应用蓝色主题给增强Dill模型单元格
        enhancedDillCells.forEach(cell => {
            cell.classList.add('theme-enhanced-dill-cell');
        });
        
        // 应用绿色主题给CAR模型单元格
        carCells.forEach(cell => {
            cell.classList.add('theme-car-cell');
        });
    }
    
    // 初始化调用
    updateI18n();
}); 