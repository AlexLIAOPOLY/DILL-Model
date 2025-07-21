// 初始化手动输入单位选择功能
function initManualUnitSelection() {
    const unitSelect = document.getElementById('manual-data-unit');
    const scaleContainer = document.getElementById('manual-scale-container');
    const scaleFactor = document.getElementById('manual-scale-factor');
    
    if (!unitSelect || !scaleContainer || !scaleFactor) {
        console.log('手动输入单位选择控件未找到');
        return;
    }
    
    // 单位选择变化时的处理
    unitSelect.addEventListener('change', function() {
        const selectedUnit = this.value;
        
        // 显示或隐藏自定义比例输入框
        if (selectedUnit === 'custom') {
            scaleContainer.style.display = 'block';
        } else {
            scaleContainer.style.display = 'none';
            
            // 设置预定义单位的比例
            let factor = 1.0;
            switch (selectedUnit) {
                case 'nm':
                    factor = 0.000001; // 纳米到毫米
                    break;
                case 'um':
                    factor = 0.001; // 微米到毫米
                    break;
                case 'mm':
                    factor = 1.0; // 毫米
                    break;
                default:
                    factor = 1.0;
            }
            
            // 存储比例因子供手动输入解析时使用
            scaleFactor.value = factor;
        }
    });
    
    // 初始化状态
    const initialUnit = unitSelect.value;
    if (initialUnit === 'custom') {
        scaleContainer.style.display = 'block';
    } else {
        scaleContainer.style.display = 'none';
    }
    
    console.log('✅ 手动输入单位选择功能初始化完成');
}
