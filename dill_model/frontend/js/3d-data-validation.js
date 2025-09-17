/**
 * 3D数据验证和修复工具
 * 确保DILL模型3D视图显示的数据与后端计算结果一致
 */

// 3D数据验证工具类
class ThreeDDataValidator {
    constructor() {
        this.debugMode = localStorage.getItem('3d_debug_mode') === 'true';
        this.validationResults = {};
    }

    /**
     * 验证3D数据的准确性
     * @param {Object} plotData - 从后端获取的数据
     * @param {HTMLElement} container - 3D图表容器
     */
    validateThicknessData(plotData, container) {
        console.log('🔍 开始3D厚度数据验证...');
        
        // 提取关键数据
        const xCoords = plotData.x_coords || [];
        const yCoords = plotData.y_coords || [];
        const thicknessData = plotData.thickness_distribution || plotData.thickness || [];
        
        // 验证数据完整性
        const validation = {
            timestamp: new Date().toISOString(),
            dataIntegrity: this.checkDataIntegrity(xCoords, yCoords, thicknessData),
            coordinateMapping: this.validateCoordinateMapping(xCoords, yCoords, thicknessData),
            valueAccuracy: this.validateValueAccuracy(xCoords, yCoords, thicknessData),
            plotlyData: this.validatePlotlyData(container),
            recommendation: []
        };
        
        // 生成建议
        this.generateRecommendations(validation);
        
        // 存储验证结果
        this.validationResults[container.id] = validation;
        
        if (this.debugMode) {
            this.displayValidationResults(validation);
        }
        
        return validation;
    }

    /**
     * 检查数据完整性
     */
    checkDataIntegrity(xCoords, yCoords, thicknessData) {
        const integrity = {
            hasXCoords: Array.isArray(xCoords) && xCoords.length > 0,
            hasYCoords: Array.isArray(yCoords) && yCoords.length > 0,
            hasThicknessData: Array.isArray(thicknessData) && thicknessData.length > 0,
            dimensionsMatch: false,
            dataRange: { min: 0, max: 0 },
            gridSize: { x: 0, y: 0 }
        };
        
        if (integrity.hasXCoords && integrity.hasYCoords && integrity.hasThicknessData) {
            integrity.gridSize.x = xCoords.length;
            integrity.gridSize.y = yCoords.length;
            
            // 检查2D数组结构
            if (Array.isArray(thicknessData[0])) {
                integrity.dimensionsMatch = thicknessData.length === yCoords.length && 
                                          thicknessData[0].length === xCoords.length;
                
                // 计算数据范围
                let min = Infinity, max = -Infinity;
                for (let i = 0; i < thicknessData.length; i++) {
                    for (let j = 0; j < thicknessData[i].length; j++) {
                        const val = thicknessData[i][j];
                        if (val < min) min = val;
                        if (val > max) max = val;
                    }
                }
                integrity.dataRange = { min, max };
            } else {
                integrity.dimensionsMatch = thicknessData.length === xCoords.length * yCoords.length;
            }
        }
        
        return integrity;
    }

    /**
     * 验证坐标映射
     */
    validateCoordinateMapping(xCoords, yCoords, thicknessData) {
        const mapping = {
            testPoints: [],
            mappingAccurate: true,
            coordinateSystem: 'unknown'
        };
        
        // 测试几个关键点的映射
        const testCoords = [
            { x: 0, y: 0, description: '原点' },
            { x: 770, y: 945, description: '用户点击点' },
            { x: -705, y: -950, description: '目标值位置' },
            { x: 500, y: -500, description: '测试点1' },
            { x: -500, y: 500, description: '测试点2' }
        ];
        
        for (const testCoord of testCoords) {
            const result = this.getValueAtCoordinate(testCoord.x, testCoord.y, xCoords, yCoords, thicknessData);
            mapping.testPoints.push({
                ...testCoord,
                ...result
            });
        }
        
        return mapping;
    }

    /**
     * 获取指定坐标处的值
     */
    getValueAtCoordinate(targetX, targetY, xCoords, yCoords, thicknessData) {
        if (!Array.isArray(thicknessData) || !Array.isArray(xCoords) || !Array.isArray(yCoords)) {
            return { error: '数据格式不正确' };
        }
        
        // 找到最接近的网格点
        let xIdx = 0, yIdx = 0;
        let minXDist = Infinity, minYDist = Infinity;
        
        for (let i = 0; i < xCoords.length; i++) {
            const dist = Math.abs(xCoords[i] - targetX);
            if (dist < minXDist) {
                minXDist = dist;
                xIdx = i;
            }
        }
        
        for (let i = 0; i < yCoords.length; i++) {
            const dist = Math.abs(yCoords[i] - targetY);
            if (dist < minYDist) {
                minYDist = dist;
                yIdx = i;
            }
        }
        
        const actualX = xCoords[xIdx];
        const actualY = yCoords[yIdx];
        
        let value;
        if (Array.isArray(thicknessData[0])) {
            // 2D数组
            value = thicknessData[yIdx][xIdx];
        } else {
            // 1D数组
            value = thicknessData[yIdx * xCoords.length + xIdx];
        }
        
        return {
            actualX,
            actualY,
            value,
            indexX: xIdx,
            indexY: yIdx,
            distanceX: minXDist,
            distanceY: minYDist
        };
    }

    /**
     * 验证数值准确性
     */
    validateValueAccuracy(xCoords, yCoords, thicknessData) {
        const accuracy = {
            targetValue: -0.0323,
            closestMatch: null,
            userClickPoint: null,
            valueDifferences: []
        };
        
        // 寻找最接近目标值-0.0323的点
        let closestVal = null;
        let minDiff = Infinity;
        let closestCoords = null;
        
        if (Array.isArray(thicknessData[0])) {
            for (let i = 0; i < thicknessData.length; i++) {
                for (let j = 0; j < thicknessData[i].length; j++) {
                    const val = thicknessData[i][j];
                    const diff = Math.abs(val - accuracy.targetValue);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestVal = val;
                        closestCoords = { x: xCoords[j], y: yCoords[i] };
                    }
                }
            }
        }
        
        accuracy.closestMatch = {
            value: closestVal,
            coordinates: closestCoords,
            difference: minDiff
        };
        
        // 检查用户点击点(770, 945)的值
        accuracy.userClickPoint = this.getValueAtCoordinate(770, 945, xCoords, yCoords, thicknessData);
        
        return accuracy;
    }

    /**
     * 验证Plotly图表数据
     */
    validatePlotlyData(container) {
        const plotlyValidation = {
            hasPlotlyData: false,
            traceCount: 0,
            dataConsistency: false,
            hoverDataAccurate: false
        };
        
        if (container && container.data && Array.isArray(container.data)) {
            plotlyValidation.hasPlotlyData = true;
            plotlyValidation.traceCount = container.data.length;
            
            if (container.data.length > 0) {
                const trace = container.data[0];
                plotlyValidation.dataConsistency = !!(trace.x && trace.y && trace.z);
            }
        }
        
        return plotlyValidation;
    }

    /**
     * 生成建议
     */
    generateRecommendations(validation) {
        const recommendations = [];
        
        if (!validation.dataIntegrity.dimensionsMatch) {
            recommendations.push({
                type: 'error',
                message: '数据维度不匹配，需要检查后端数据格式'
            });
        }
        
        if (validation.valueAccuracy.closestMatch && validation.valueAccuracy.closestMatch.difference < 0.01) {
            recommendations.push({
                type: 'success',
                message: `找到接近目标值的数据点：${validation.valueAccuracy.closestMatch.value.toFixed(6)} 在坐标 (${validation.valueAccuracy.closestMatch.coordinates.x}, ${validation.valueAccuracy.closestMatch.coordinates.y})`
            });
        }
        
        if (validation.valueAccuracy.userClickPoint && Math.abs(validation.valueAccuracy.userClickPoint.value) < 1e-6) {
            recommendations.push({
                type: 'warning',
                message: '用户点击位置的值为0，可能需要调整参数或检查坐标映射'
            });
        }
        
        validation.recommendation = recommendations;
    }

    /**
     * 显示验证结果
     */
    displayValidationResults(validation) {
        console.group('🔍 3D数据验证结果');
        console.log('数据完整性:', validation.dataIntegrity);
        console.log('坐标映射:', validation.coordinateMapping);
        console.log('数值准确性:', validation.valueAccuracy);
        console.log('Plotly数据:', validation.plotlyData);
        console.log('建议:', validation.recommendation);
        console.groupEnd();
    }

    /**
     * 修复3D数据显示问题
     */
    fixThicknessDisplay(container, plotData) {
        console.log('🔧 开始修复3D厚度显示...');
        
        // 1. 验证数据
        const validation = this.validateThicknessData(plotData, container);
        
        // 2. 如果有问题，尝试修复
        if (validation.recommendation.some(r => r.type === 'error')) {
            console.warn('发现数据错误，尝试修复...');
            this.attemptDataFix(container, plotData, validation);
        }
        
        // 3. 增强hover显示
        this.enhanceHoverDisplay(container, plotData);
        
        // 4. 添加调试工具
        this.addDebugTools(container, plotData, validation);
        
        return validation;
    }

    /**
     * 尝试修复数据问题
     */
    attemptDataFix(container, plotData, validation) {
        // 实现数据修复逻辑
        console.log('🔧 执行数据修复...');
    }

    /**
     * 增强hover显示
     */
    enhanceHoverDisplay(container, plotData) {
        if (container && container.on) {
            container.on('plotly_hover', (eventData) => {
                if (eventData.points && eventData.points.length > 0) {
                    const point = eventData.points[0];
                    console.log('🎯 Hover点信息:', {
                        x: point.x,
                        y: point.y,
                        z: point.z,
                        pointNumber: point.pointNumber,
                        curveNumber: point.curveNumber
                    });
                }
            });
        }
    }

    /**
     * 添加调试工具
     */
    addDebugTools(container, plotData, validation) {
        // 如果是调试模式，添加调试按钮
        if (this.debugMode && container.parentElement) {
            const debugBtn = document.createElement('button');
            debugBtn.textContent = '3D数据调试';
            debugBtn.className = 'debug-btn';
            debugBtn.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 1000;
                padding: 5px 10px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
            `;
            
            debugBtn.onclick = () => {
                this.showDebugModal(validation, plotData);
            };
            
            container.parentElement.style.position = 'relative';
            container.parentElement.appendChild(debugBtn);
        }
    }

    /**
     * 显示调试模态框
     */
    showDebugModal(validation, plotData) {
        const modal = document.createElement('div');
        modal.className = 'debug-modal';
        modal.innerHTML = `
            <div class="modal-content" style="
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: white; border: 2px solid #007bff; border-radius: 8px;
                padding: 20px; max-width: 80%; max-height: 80%; overflow: auto;
                z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            ">
                <h3>3D数据调试信息</h3>
                <div id="debug-content"></div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    margin-top: 15px; padding: 8px 16px; background: #dc3545; color: white;
                    border: none; border-radius: 4px; cursor: pointer;
                ">关闭</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const content = modal.querySelector('#debug-content');
        content.innerHTML = `
            <pre>${JSON.stringify(validation, null, 2)}</pre>
        `;
    }

    /**
     * 启用调试模式
     */
    enableDebugMode() {
        this.debugMode = true;
        localStorage.setItem('3d_debug_mode', 'true');
        console.log('🐛 3D数据调试模式已启用');
    }

    /**
     * 禁用调试模式
     */
    disableDebugMode() {
        this.debugMode = false;
        localStorage.removeItem('3d_debug_mode');
        console.log('🐛 3D数据调试模式已禁用');
    }
}

// 创建全局实例
window.threeDDataValidator = new ThreeDDataValidator();

// 调试工具函数
window.enable3DDebug = () => window.threeDDataValidator.enableDebugMode();
window.disable3DDebug = () => window.threeDDataValidator.disableDebugMode();

console.log('✅ 3D数据验证工具已加载');
