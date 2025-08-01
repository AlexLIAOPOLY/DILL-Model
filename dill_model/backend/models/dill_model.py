# -*- coding: utf-8 -*-
import numpy as np
import matplotlib
# 设置Matplotlib后端为非交互式后端
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
import base64
from .enhanced_dill_model import EnhancedDillModel
import math
import ast
import logging

# 设置日志配置
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def parse_phi_expr(phi_expr, t):
    """
    安全解析phi_expr表达式，t为时间，只允许sin/cos/pi/t等
    """
    allowed_names = {'sin': np.sin, 'cos': np.cos, 'pi': np.pi, 't': t}
    allowed_nodes = (
        ast.Expression, ast.BinOp, ast.UnaryOp, ast.Num, ast.Load,
        ast.Call, ast.Name, ast.Constant, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow,
        ast.USub, ast.UAdd, ast.Mod, ast.FloorDiv, ast.Tuple, ast.List
    )
    try:
        node = ast.parse(str(phi_expr), mode='eval')
        for n in ast.walk(node):
            if not isinstance(n, allowed_nodes):
                raise ValueError(f"不允许的表达式节点: {type(n).__name__}")
            if isinstance(n, ast.Name) and n.id not in allowed_names:
                raise ValueError(f"不允许的变量: {n.id}")
            if isinstance(n, ast.Call) and (
                not isinstance(n.func, ast.Name) or n.func.id not in allowed_names
            ):
                raise ValueError(f"不允许的函数: {getattr(n.func, 'id', None)}")
        code = compile(node, '<string>', 'eval')
        return eval(code, {"__builtins__": None}, allowed_names)
    except Exception:
        try:
            return float(phi_expr)
        except Exception:
            return 0.0

class DillModel:
    """
    Dill光刻胶模型计算类
    
    实现基于Dill模型的光刻胶曝光剂量分布和厚度分布计算
    
    核心公式 (根据PDF文档):
    - M = e^(-CIt)  (方程 2.7)
    - cos(πd) = 1/Γ - Dc/(2Γ)D₀⁻¹  (方程 2.8)
    - Dc = 2D₀[1-Γcos(πd)]  (临界剂量)
    
    其中:
    - M: 归一化PAC浓度
    - C: 光敏速率常数
    - I: 光强度
    - t: 曝光时间
    - d: 占空比
    - Γ: 对比度参数
    - Dc: 临界剂量
    - D₀: 实际曝光剂量
    """
    
    def __init__(self):
        pass
    
    def calculate_duty_cycle_parameters(self, exposure_dose, D0, gamma=1.0, method='physical'):
        """
        计算占空比相关参数
        
        修正后的占空比计算方法：
        - 占空比定义为在一个空间周期内，曝光剂量超过临界值的区域占整个周期的比例
        - 临界剂量基于实际工艺参数设定，而非简单假设
        
        参数:
            exposure_dose: 实际曝光剂量数组
            D0: 参考曝光剂量
            gamma: 对比度参数Γ
            method: 计算方法 ('physical' 或 'formula')
                - 'physical': 基于物理意义的直观方法
                - 'formula': 基于原始公式的迭代求解方法
            
        返回:
            duty_cycle: 占空比数组
            critical_dose: 临界剂量数组
        """
        logger.info("=" * 60)
        logger.info("【Dill模型 - 占空比计算】")
        logger.info("=" * 60)
        logger.info(f"🔸 使用方法: {method}")
        logger.info("🔸 修正后的占空比计算方法")
        logger.info("🔸 物理意义：在一个空间周期内，有效曝光区域占整个周期的比例")
        logger.info(f"🔸 输入参数:")
        logger.info(f"   - D₀ (参考曝光剂量) = {D0}")
        logger.info(f"   - Γ (对比度参数) = {gamma}")
        
        # 方法1：基于物理意义的占空比计算
        # 计算临界剂量：使用平均曝光剂量的90%作为临界值
        avg_exposure = np.mean(exposure_dose)
        critical_dose_threshold = 0.9 * avg_exposure
        
        # 计算占空比：超过临界剂量的区域比例
        above_threshold = exposure_dose > critical_dose_threshold
        duty_cycle_physical = np.sum(above_threshold) / len(exposure_dose)
        
        # 方法2：如果需要使用原始公式，通过迭代求解
        # 这里我们提供一个数值求解的版本
        duty_cycle_array = np.zeros_like(exposure_dose)
        critical_dose_array = np.zeros_like(exposure_dose)
        
        for i, dose in enumerate(exposure_dose):
            # 使用数值方法求解 cos(πd) = 1/Γ - Dc/(2Γ)D₀⁻¹
            # 同时满足 Dc = 2D₀[1-Γcos(πd)]
            
            # 初始猜测值
            d_guess = 0.5  # 占空比初始猜测为50%
            
            # 迭代求解
            for iter_count in range(100):  # 最多迭代100次
                # 根据当前d计算Dc
                Dc_calc = 2 * D0 * (1 - gamma * np.cos(np.pi * d_guess))
                
                # 根据Dc计算新的d
                cos_pi_d_new = (1.0 / gamma) - (Dc_calc / (2.0 * gamma * D0))
                cos_pi_d_new = np.clip(cos_pi_d_new, -1.0, 1.0)
                d_new = np.arccos(cos_pi_d_new) / np.pi
                
                # 检查收敛
                if abs(d_new - d_guess) < 1e-6:
                    break
                    
                d_guess = d_new
            
            duty_cycle_array[i] = d_guess
            critical_dose_array[i] = Dc_calc
        
        # 选择使用哪种方法
        use_physical_method = (method == 'physical')
        
        if use_physical_method:
            # 使用基于物理意义的方法
            duty_cycle = np.full_like(exposure_dose, duty_cycle_physical)
            critical_dose = np.full_like(exposure_dose, critical_dose_threshold)
            
            logger.info("🔸 使用基于物理意义的占空比计算方法")
            logger.info(f"   - 临界剂量阈值: {critical_dose_threshold:.4f}")
            logger.info(f"   - 占空比(有效曝光区域比例): {duty_cycle_physical:.4f}")
            logger.info(f"   - 优点: 物理意义明确，计算简单可靠")
        else:
            # 使用迭代求解的方法
            duty_cycle = duty_cycle_array
            critical_dose = critical_dose_array
            
            logger.info("🔸 使用迭代求解的占空比计算方法")
            logger.info(f"   - 占空比范围: [{np.min(duty_cycle):.4f}, {np.max(duty_cycle):.4f}]")
            logger.info(f"   - 临界剂量范围: [{np.min(critical_dose):.4f}, {np.max(critical_dose):.4f}]")
            logger.info(f"   - 优点: 符合原始公式，理论基础严谨")
        
        logger.info(f"🔸 计算结果:")
        logger.info(f"   - 占空比平均值: {np.mean(duty_cycle):.4f}")
        logger.info(f"   - 临界剂量平均值: {np.mean(critical_dose):.4f}")
        logger.info(f"   - 占空比物理意义: 有效曝光区域占整个周期的比例")
        
        return duty_cycle, critical_dose
    
    def calculate_intensity_distribution(self, x, I_avg, V, K=None, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y=0, z=0, t=0, custom_intensity_data=None):
        """
        计算光强分布，支持一维、二维和三维正弦波，以及自定义光强分布
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            sine_type: 正弦波类型，'1d'表示一维，'multi'表示二维，'3d'表示三维
            Kx: x方向空间频率
            Ky: y方向空间频率
            Kz: z方向空间频率（三维模式使用）
            phi_expr: 相位表达式
            y: y坐标
            z: z坐标（三维模式使用）
            t: 时间
            custom_intensity_data: 自定义光强分布数据 {'x': [], 'intensity': []}
            
        返回:
            光强分布数组
        """
        logger.info("=" * 60)
        logger.info("【Dill模型 - 光强分布计算】")
        logger.info("=" * 60)
        
        # === 🔍 调试光强分布计算接收参数 ===
        logger.info(f"🔍 光强分布计算调试:")
        logger.info(f"   - 传入的custom_intensity_data: {custom_intensity_data is not None}")
        logger.info(f"   - sine_type: {sine_type}")
        logger.info(f"   - x坐标范围: [{np.min(x):.3f}, {np.max(x):.3f}], 点数: {len(x)}")
        if custom_intensity_data is not None:
            logger.info(f"   - 自定义数据有效性: {'x' in custom_intensity_data and 'intensity' in custom_intensity_data}")
        # === 调试结束 ===
        
        # 检查是否使用自定义光强分布数据
        if custom_intensity_data is not None and 'x' in custom_intensity_data and 'intensity' in custom_intensity_data:
            logger.info("🔸 计算模式: 自定义光强分布")
            logger.info("🔸 使用外部提供的光强分布数据")
            
            custom_x = np.array(custom_intensity_data['x'])
            custom_intensity = np.array(custom_intensity_data['intensity'])
            
            logger.info(f"🔸 自定义数据统计:")
            logger.info(f"   - 数据点数: {len(custom_x)}")
            logger.info(f"   - X坐标范围: [{np.min(custom_x):.3f}, {np.max(custom_x):.3f}]")
            logger.info(f"   - 光强范围: [{np.min(custom_intensity):.6f}, {np.max(custom_intensity):.6f}]")
            logger.info(f"   - 目标X坐标范围: [{np.min(x):.3f}, {np.max(x):.3f}], 点数: {len(x)}")
            
            # 使用插值将自定义数据映射到目标x坐标
            from scipy.interpolate import interp1d
            
            # 确保自定义数据的x坐标是单调递增的
            if not np.all(np.diff(custom_x) >= 0):
                logger.warning("🔸 自定义数据X坐标不是单调递增，正在排序...")
                sorted_indices = np.argsort(custom_x)
                custom_x = custom_x[sorted_indices]
                custom_intensity = custom_intensity[sorted_indices]
            
            # 创建插值函数，处理边界外的值
            try:
                # 检查是否有单位信息并进行单位转换
                unit_scale = custom_intensity_data.get('unit_scale', 1.0)
                original_unit = custom_intensity_data.get('original_unit', 'mm')
                
                logger.info(f"🔸 单位信息检测:")
                logger.info(f"   - 原始单位: {original_unit}")
                logger.info(f"   - 单位比例: {unit_scale}")
                
                # 🔥 修复：智能单位转换逻辑
                x_min_target, x_max_target = np.min(x), np.max(x)
                target_range = x_max_target - x_min_target
                
                # 改进的单位判断逻辑：基于数据特征而非硬编码阈值
                # 如果自定义数据的范围非常小（<10），通常是毫米单位
                # 如果自定义数据的范围较大（>100），通常是微米单位
                custom_x_range = np.max(custom_x) - np.min(custom_x)
                
                if custom_x_range < 10:  # 自定义数据范围小，可能是毫米单位
                    # 如果目标范围也小，则是毫米对毫米
                    target_is_um = target_range > 100  # 只有当目标范围很大时才是微米
                    unit_hint = "mm(数据范围小)" if not target_is_um else "μm(目标范围大)"
                else:  # 自定义数据范围大，可能是微米单位
                    target_is_um = target_range > 100
                    unit_hint = "μm(数据范围大)" if target_is_um else "mm(目标范围小)"
                
                logger.info(f"🔸 单位判断: 自定义数据范围={custom_x_range:.6f}, 目标范围={target_range:.6f}, 推测={unit_hint}")
                
                # 关键修复：前端已经将所有数据转换为毫米单位
                # unit_scale != 1.0 表示前端进行了单位转换
                if unit_scale != 1.0:
                    logger.info(f"🔸 前端已进行单位转换: {original_unit} → mm (比例: {unit_scale})")
                    logger.info(f"🔸 后端接收的数据已是毫米单位，无需根据original_unit再次转换")
                    
                    # 只需判断目标坐标系是否为微米，决定是否转换
                    if target_is_um:
                        # 目标是微米，需要将毫米转微米
                        custom_x = custom_x * 1000.0
                        logger.info(f"🔸 目标单位转换: 毫米(mm) → 微米(μm)，坐标乘以1000")
                    else:
                        # 目标是毫米，无需转换
                        logger.info(f"🔸 单位确认: 数据和目标都是毫米(mm)单位，无需转换")
                else:
                    # unit_scale == 1.0，前端未转换，数据本身就是mm单位
                    logger.info(f"🔸 前端未进行单位转换，数据本身为毫米(mm)单位")
                    
                    if target_is_um:
                        # 目标是微米，需要转换
                        custom_x = custom_x * 1000.0
                        logger.info(f"🔸 目标单位转换: 毫米(mm) → 微米(μm)，坐标乘以1000")
                    else:
                        # 目标是毫米，无需转换
                        logger.info(f"🔸 单位确认: 数据和目标都是毫米(mm)单位，无需转换")
                
                # 扩展自定义数据范围以覆盖目标范围
                x_min_target, x_max_target = np.min(x), np.max(x)
                x_min_custom, x_max_custom = np.min(custom_x), np.max(custom_x)
                
                logger.info(f"🔸 坐标范围比较:")
                logger.info(f"   - 自定义数据范围: [{x_min_custom:.6f}, {x_max_custom:.6f}]")
                logger.info(f"   - 目标范围: [{x_min_target:.6f}, {x_max_target:.6f}]")
                
                # 获取数据范围外光强处理模式，默认为'zero'（零）
                outside_range_mode = custom_intensity_data.get('outside_range_mode', 'zero')
                logger.info(f"🔸 数据范围外光强处理模式: {outside_range_mode}")
                
                # 准备扩展后的数据
                extended_x = custom_x.copy()
                extended_intensity = custom_intensity.copy()
                
                # 根据模式处理范围外数据
                if outside_range_mode == 'zero':
                    # 'zero'模式：超出范围使用0值
                    logger.info("   - 使用零值作为范围外光强")
                    
                    # 这里不需要扩展数据，因为interp1d的fill_value将设置为(0,0)
                    # 但我们仍然需要确保插值函数能覆盖整个目标范围
                    if x_min_target < x_min_custom or x_max_target > x_max_custom:
                        logger.info("   - 目标范围超出数据范围，使用零值填充")
                    
                elif outside_range_mode == 'boundary':  # 'boundary'模式：超出范围使用边界值
                    logger.info("   - 使用边界值作为范围外光强")
                    
                    # 如果目标范围超出自定义数据范围，使用边界值进行扩展
                    if x_min_target < x_min_custom:
                        logger.info(f"   - 扩展下限: {x_min_target} < {x_min_custom}")
                        extended_x = np.concatenate([[x_min_target], extended_x])
                        extended_intensity = np.concatenate([[custom_intensity[0]], extended_intensity])
                    
                    if x_max_target > x_max_custom:
                        logger.info(f"   - 扩展上限: {x_max_target} > {x_max_custom}")
                        extended_x = np.concatenate([extended_x, [x_max_target]])
                        extended_intensity = np.concatenate([extended_intensity, [custom_intensity[-1]]])
                        
                elif outside_range_mode == 'custom':  # 'custom'模式：使用用户定义的固定值
                    # 获取用户定义的光强值
                    custom_intensity_value = float(custom_intensity_data.get('custom_intensity_value', 0.0))
                    logger.info(f"   - 使用自定义值作为范围外光强: {custom_intensity_value}")
                    
                    # 仍然需要扩展坐标范围，但使用自定义值
                    if x_min_target < x_min_custom:
                        logger.info(f"   - 扩展下限: {x_min_target} < {x_min_custom}")
                        extended_x = np.concatenate([[x_min_target], extended_x])
                        extended_intensity = np.concatenate([[custom_intensity_value], extended_intensity])
                    
                    if x_max_target > x_max_custom:
                        logger.info(f"   - 扩展上限: {x_max_target} > {x_max_custom}")
                        extended_x = np.concatenate([extended_x, [x_max_target]])
                        extended_intensity = np.concatenate([extended_intensity, [custom_intensity_value]])
                
                # 设置插值函数的边界外行为 (已在上方处理了outside_range_mode)
                if outside_range_mode == 'zero':
                    # 超出范围使用0
                    fill_value = (0, 0)
                elif outside_range_mode == 'boundary':
                    # 超出范围使用两端值
                    fill_value = (custom_intensity[0], custom_intensity[-1])
                else:  # custom模式
                    # 超出范围使用自定义值
                    custom_intensity_value = float(custom_intensity_data.get('custom_intensity_value', 0.0))
                    fill_value = (custom_intensity_value, custom_intensity_value)
                
                # 创建线性插值函数
                interp_func = interp1d(extended_x, extended_intensity, 
                                     kind='linear', 
                                     bounds_error=False, 
                                     fill_value=fill_value)
                
                # 将自定义数据插值到目标x坐标
                result = interp_func(x)
                
                # 确保结果为正值（光强不能为负）
                result = np.maximum(result, 0)
                
                logger.info(f"🔸 插值计算结果:")
                logger.info(f"   - 输出光强范围: [{np.min(result):.6f}, {np.max(result):.6f}]")
                logger.info(f"   - 输出平均值: {np.mean(result):.6f}")
                logger.info(f"   - 数据点数: {len(result)}")
                
                return result
                
            except Exception as e:
                logger.error(f"🔸 自定义光强数据插值失败: {str(e)}")
                logger.warning("🔸 回退到公式计算模式")
                # 回退到公式计算
        
        if sine_type == 'multi':
            logger.info("🔸 计算模式: 二维正弦波光强分布")
            logger.info("🔸 使用公式: I(x,y) = I_avg * (1 + V * cos(Kx*x + Ky*y + φ))")
            
            # 参数检查和默认值设置
            if Kx is None:
                Kx = K if K is not None else 1.0
                logger.warning(f"🔸 Kx为None，使用默认值: {Kx}")
            if Ky is None:
                Ky = K if K is not None else 1.0
                logger.warning(f"🔸 Ky为None，使用默认值: {Ky}")
            
            phi = parse_phi_expr(phi_expr, t) if phi_expr is not None else 0.0
            logger.info(f"🔸 输入变量值:")
            logger.info(f"   - I_avg (平均光强) = {I_avg}")
            logger.info(f"   - V (干涉条纹可见度) = {V}")
            logger.info(f"   - Kx (x方向空间频率) = {Kx}")
            logger.info(f"   - Ky (y方向空间频率) = {Ky}")
            logger.info(f"   - phi_expr (相位表达式) = '{phi_expr}' → φ = {phi}")
            logger.info(f"   - y (y坐标) = {y}")
            logger.info(f"   - t (时间) = {t}")
            logger.info(f"   - x坐标范围: [{np.min(x):.3f}, {np.max(x):.3f}], 点数: {len(x)}")
            
            # y默认为0，若后续支持二维分布可扩展
            result = I_avg * (1 + V * np.cos(Kx * x + Ky * y + phi))
            
            logger.info(f"🔸 计算结果:")
            logger.info(f"   - 光强分布范围: [{np.min(result):.6f}, {np.max(result):.6f}]")
            logger.info(f"   - 光强平均值: {np.mean(result):.6f}")
            
            return result
            
        elif sine_type == '3d':
            logger.info("🔸 计算模式: 三维正弦波光强分布")
            logger.info("🔸 使用公式: I(x,y,z) = I_avg * (1 + V * cos(Kx*x + Ky*y + Kz*z + φ))")
            
            # 参数检查和默认值设置
            if Kx is None:
                Kx = K if K is not None else 1.0
                logger.warning(f"🔸 Kx为None，使用默认值: {Kx}")
            if Ky is None:
                Ky = K if K is not None else 1.0
                logger.warning(f"🔸 Ky为None，使用默认值: {Ky}")
            if Kz is None:
                Kz = K if K is not None else 1.0
                logger.warning(f"🔸 Kz为None，使用默认值: {Kz}")
            
            phi = parse_phi_expr(phi_expr, t) if phi_expr is not None else 0.0
            logger.info(f"🔸 输入变量值:")
            logger.info(f"   - I_avg (平均光强) = {I_avg}")
            logger.info(f"   - V (干涉条纹可见度) = {V}")
            logger.info(f"   - Kx (x方向空间频率) = {Kx}")
            logger.info(f"   - Ky (y方向空间频率) = {Ky}")
            logger.info(f"   - Kz (z方向空间频率) = {Kz}")
            logger.info(f"   - phi_expr (相位表达式) = '{phi_expr}' → φ = {phi}")
            logger.info(f"   - y (y坐标) = {y}")
            logger.info(f"   - z (z坐标) = {z}")
            logger.info(f"   - t (时间) = {t}")
            logger.info(f"   - x坐标范围: [{np.min(x):.3f}, {np.max(x):.3f}], 点数: {len(x)}")
            
            # 三维正弦波
            result = I_avg * (1 + V * np.cos(Kx * x + Ky * y + Kz * z + phi))
            
            logger.info(f"🔸 计算结果:")
            logger.info(f"   - 光强分布范围: [{np.min(result):.6f}, {np.max(result):.6f}]")
            logger.info(f"   - 光强平均值: {np.mean(result):.6f}")
            
            return result
        else:
            logger.info("🔸 计算模式: 一维正弦波光强分布")
            logger.info("🔸 使用公式: I(x) = I_avg * (1 + V * cos(K*x))")
            
            # 参数检查和默认值设置
            if K is None:
                K = 1.0
                logger.warning(f"🔸 K为None，使用默认值: {K}")
            
            logger.info(f"🔸 输入变量值:")
            logger.info(f"   - I_avg (平均光强) = {I_avg}")
            logger.info(f"   - V (干涉条纹可见度) = {V}")
            logger.info(f"   - K (空间频率) = {K}")
            logger.info(f"   - x坐标范围: [{np.min(x):.3f}, {np.max(x):.3f}], 点数: {len(x)}")
            
            result = I_avg * (1 + V * np.cos(K * x))
            
            logger.info(f"🔸 计算结果:")
            logger.info(f"   - 光强分布范围: [{np.min(result):.6f}, {np.max(result):.6f}]")
            logger.info(f"   - 光强平均值: {np.mean(result):.6f}")
            
            return result
    
    def calculate_exposure_dose(self, x, I_avg, V, K=None, t_exp=1, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y=0, z=0, custom_intensity_data=None, exposure_calculation_method=None, segment_duration=None, segment_count=None, segment_intensities=None):
        """
        计算曝光剂量分布，支持一维、二维和三维正弦波，以及自定义光强分布
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            sine_type: 正弦波类型，'1d'表示一维，'multi'表示二维，'3d'表示三维
            Kx: x方向空间频率
            Ky: y方向空间频率
            Kz: z方向空间频率（三维模式使用）
            phi_expr: 相位表达式
            y: y坐标
            z: z坐标（三维模式使用）
            custom_intensity_data: 自定义光强分布数据 {'x': [], 'intensity': []}
            exposure_calculation_method: 曝光计量计算方式 ('standard'或'cumulative')
            segment_duration: 多段曝光时间累积模式下的单段时间长度
            segment_count: 多段曝光时间累积模式下的段数
            segment_intensities: 多段曝光时间累积模式下各段的光强值列表
            
        返回:
            曝光剂量分布数组
        """
        logger.info("=" * 60)
        logger.info("【Dill模型 - 曝光剂量计算】")
        logger.info("=" * 60)
        
        # 检查是否使用多段曝光时间累积模式
        if exposure_calculation_method == 'cumulative' and segment_intensities is not None and segment_count is not None and segment_duration is not None:
            logger.info("🔸 使用多段曝光时间累积模式计算曝光剂量")
            logger.info(f"🔸 多段曝光时间参数:")
            logger.info(f"   - 段数 = {segment_count}")
            logger.info(f"   - 单段时间 = {segment_duration}秒")
            logger.info(f"   - 总曝光时间 = {segment_count * segment_duration}秒")
            logger.info(f"   - 各段光强值 = {segment_intensities[:5]}... (共{len(segment_intensities)}段)")
            
            # 获取基准光强分布
            # 由于多段曝光时间累积模式下，各段使用不同的光强值，
            # 这里计算的基准强度分布仅用于得到空间分布形状
            base_intensity = self.calculate_intensity_distribution(x, I_avg, V, K, sine_type, Kx, Ky, Kz, phi_expr, y, z, t=0, custom_intensity_data=custom_intensity_data)
            
            # 归一化基准光强分布，使其均值为1
            if np.mean(base_intensity) != 0:
                normalized_intensity = base_intensity / np.mean(base_intensity)
            else:
                normalized_intensity = np.ones_like(base_intensity)
            
            # 累积各段曝光剂量
            exposure_dose = np.zeros_like(x, dtype=np.float64)
            
            for i in range(segment_count):
                if i < len(segment_intensities):
                    segment_intensity = segment_intensities[i] * normalized_intensity
                    segment_exposure = segment_intensity * segment_duration
                    exposure_dose += segment_exposure
                    
                    # 记录日志（仅显示前3段和最后1段）
                    if i < 3 or i == segment_count - 1:
                        logger.info(f"   - 段{i+1}: 光强均值={np.mean(segment_intensity):.4f}, 曝光剂量均值={np.mean(segment_exposure):.4f}")
            
            logger.info(f"🔸 计算结果:")
            logger.info(f"   - 总曝光剂量范围: [{np.min(exposure_dose):.6f}, {np.max(exposure_dose):.6f}]")
            logger.info(f"   - 总曝光剂量平均值: {np.mean(exposure_dose):.6f}")
            
        else:
            # 标准模式计算
            logger.info("🔸 使用标准模式计算曝光剂量")
            logger.info("🔸 使用公式: D(x) = I(x) * t_exp")
            logger.info(f"🔸 输入变量值:")
            logger.info(f"   - t_exp (曝光时间) = {t_exp}")
            
            # 只支持t=0时的phi_expr，后续可扩展为时变
            intensity = self.calculate_intensity_distribution(x, I_avg, V, K, sine_type, Kx, Ky, Kz, phi_expr, y, z, t=0, custom_intensity_data=custom_intensity_data)
            exposure_dose = intensity * t_exp
            
            logger.info(f"🔸 计算结果:")
            logger.info(f"   - 曝光剂量范围: [{np.min(exposure_dose):.6f}, {np.max(exposure_dose):.6f}]")
            logger.info(f"   - 曝光剂量平均值: {np.mean(exposure_dose):.6f}")
        
        return exposure_dose
    
    def calculate_photoresist_thickness(self, x, I_avg, V, K=None, t_exp=1, C=0.01, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y=0, z=0):
        """
        计算光刻胶厚度分布，支持一维、二维和三维正弦波
        现在包含对比度阈值机制，更符合真实光刻胶行为
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            C: 光刻胶光敏速率常数
            sine_type: 正弦波类型，'1d'表示一维，'multi'表示二维，'3d'表示三维
            Kx: x方向空间频率
            Ky: y方向空间频率
            Kz: z方向空间频率（三维模式使用）
            phi_expr: 相位表达式
            y: y坐标
            z: z坐标（三维模式使用）
            
        返回:
            光刻胶厚度分布数组
        """
        logger.info("=" * 60)
        logger.info("【Dill模型 - 光刻胶厚度计算】")
        logger.info("=" * 60)
        logger.info("🔸 使用改进的对比度阈值模型")
        logger.info("🔸 基础公式: M(x) = exp(-C * D(x))")
        logger.info("🔸 高对比度时引入阈值效应")
        logger.info(f"🔸 输入变量值:")
        logger.info(f"   - C (光敏速率常数) = {C}")
        logger.info(f"   - V (对比度) = {V}")
        
        exposure_dose = self.calculate_exposure_dose(x, I_avg, V, K, t_exp, sine_type, Kx, Ky, Kz, phi_expr, y, z)
        
        # 计算基础厚度（指数衰减模型）
        basic_thickness = np.exp(-C * exposure_dose)
        
        # 对比度阈值机制 - 统一使用 Sigmoid 函数方式
        # 计算曝光阈值（基于平均曝光剂量和对比度）
        avg_dose = np.mean(exposure_dose)
        
        # 阈值随对比度增加而更明显
        # V=0.5时轻微阈值效应，V→1.0时强阈值效应
        # 对于 V < 0.5，也使用相同的 Sigmoid 函数，但效果会更平缓
        threshold_sharpness = max(0.1, (V - 0.5) * 10)  # 至少0.1，避免过于平缓
        
        # 使用Sigmoid函数实现阈值效应
        # 当V较大时，transition变得更锐利
        dose_threshold = avg_dose
        thickness = 1.0 / (1.0 + np.exp(threshold_sharpness * (exposure_dose - dose_threshold)))
        
        # 在低dose区域保持接近1.0的厚度（未曝光状态）
        # 在高dose区域快速衰减到接近0（完全曝光状态）
        
        logger.info(f"🔸 统一使用Sigmoid阈值效应 (V={V:.3f})")
        logger.info(f"   - Sigmoid阈值: {dose_threshold:.4f}")
        logger.info(f"   - 阈值锐度: {threshold_sharpness:.2f}")
        
        logger.info(f"🔸 计算结果:")
        logger.info(f"   - 光刻胶厚度范围: [{np.min(thickness):.6f}, {np.max(thickness):.6f}]")
        logger.info(f"   - 光刻胶厚度平均值: {np.mean(thickness):.6f}")
        logger.info("   注: 厚度值为归一化值，1.0表示未曝光区域，0.0表示完全曝光区域")
        
        return thickness
    
    def calculate_enhanced_photoresist_thickness(self, x, I_avg, V, K=None, t_exp=1, C=0.01, 
                                               gamma=1.0, enable_duty_cycle=False, 
                                               sine_type='1d', Kx=None, Ky=None, Kz=None, 
                                               phi_expr=None, y=0, z=0, duty_cycle_method='physical'):
        """
        计算增强的光刻胶厚度分布，包含占空比和临界剂量概念
        现在包含对比度阈值机制，更符合真实光刻胶行为
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            C: 光刻胶光敏速率常数
            gamma: 对比度参数Γ
            enable_duty_cycle: 是否启用占空比计算
            sine_type: 正弦波类型
            duty_cycle_method: 占空比计算方法 ('physical' 或 'formula')
            其他参数: 与原方法相同
            
        返回:
            包含厚度、占空比、临界剂量等信息的字典
        """
        logger.info("=" * 60)
        logger.info("【Dill模型 - 增强光刻胶厚度计算】")
        logger.info("=" * 60)
        logger.info("🔸 使用改进的对比度阈值模型")
        logger.info("🔸 核心公式: M(x) = exp(-C * D(x))")
        logger.info("🔸 根据PDF文档方程(2.7): M = e^(-CIt)")
        logger.info("🔸 高对比度时引入阈值效应")
        logger.info(f"🔸 输入参数:")
        logger.info(f"   - C (光敏速率常数) = {C}")
        logger.info(f"   - Γ (对比度参数) = {gamma}")
        logger.info(f"   - V (干涉可见度) = {V}")
        logger.info(f"   - 启用占空比计算 = {enable_duty_cycle}")
        logger.info(f"   - 占空比计算方法 = {duty_cycle_method}")
        
        # 计算基础曝光剂量
        exposure_dose = self.calculate_exposure_dose(x, I_avg, V, K, t_exp, sine_type, Kx, Ky, Kz, phi_expr, y, z)
        
        # 计算基础厚度（指数衰减模型）
        basic_thickness = np.exp(-C * exposure_dose)
        
        # 对比度阈值机制 - 统一使用 Sigmoid 函数方式
        # 计算曝光阈值（基于平均曝光剂量和对比度）
        avg_dose = np.mean(exposure_dose)
        
        # 阈值随对比度增加而更明显
        # V=0.5时轻微阈值效应，V→1.0时强阈值效应
        # 对于 V < 0.5，也使用相同的 Sigmoid 函数，但效果会更平缓
        threshold_sharpness = max(0.1, (V - 0.5) * 10)  # 至少0.1，避免过于平缓
        
        # 使用Sigmoid函数实现阈值效应
        dose_threshold = avg_dose
        thickness = 1.0 / (1.0 + np.exp(threshold_sharpness * (exposure_dose - dose_threshold)))
        
        # 在低dose区域保持接近1.0的厚度（未曝光状态）
        # 在高dose区域快速衰减到接近0（完全曝光状态）
        
        logger.info(f"🔸 统一使用Sigmoid阈值效应 (V={V:.3f})")
        logger.info(f"   - Sigmoid阈值: {dose_threshold:.4f}")
        logger.info(f"   - 阈值锐度: {threshold_sharpness:.2f}")
        
        result = {
            'x': x,
            'thickness': thickness,
            'exposure_dose': exposure_dose,
            'gamma': gamma,
            'C': C
        }
        
        # 如果启用占空比计算
        if enable_duty_cycle:
            D0 = np.mean(exposure_dose)  # 使用平均曝光剂量作为参考
            duty_cycle, critical_dose = self.calculate_duty_cycle_parameters(exposure_dose, D0, gamma, duty_cycle_method)
            
            result.update({
                'duty_cycle': duty_cycle,
                'critical_dose': critical_dose,
                'D0': D0,
                'enable_duty_cycle': True,
                'duty_cycle_method': duty_cycle_method
            })
            
            logger.info("🔸 占空比分析:")
            logger.info(f"   - 参考剂量D₀ = {D0:.4f}")
            logger.info(f"   - 平均占空比 = {np.mean(duty_cycle):.4f}")
            logger.info(f"   - 平均临界剂量 = {np.mean(critical_dose):.4f}")
            logger.info(f"   - 计算方法 = {duty_cycle_method}")
        else:
            result['enable_duty_cycle'] = False
        
        logger.info(f"🔸 计算结果:")
        logger.info(f"   - 厚度范围: [{np.min(thickness):.6f}, {np.max(thickness):.6f}]")
        logger.info(f"   - 厚度平均值: {np.mean(thickness):.6f}")
        logger.info("   注: 厚度值为归一化值，1.0表示未曝光区域，0.0表示完全曝光区域")
        
        return result

    def generate_data(self, I_avg, V, K, t_exp, C, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y_range=None, z_range=None, enable_4d_animation=False, t_start=0, t_end=5, time_steps=20, x_min=0, x_max=10, angle_a=11.7, exposure_threshold=20, contrast_ctr=1, wavelength=405, custom_exposure_times=None, custom_intensity_data=None, exposure_calculation_method=None, segment_duration=None, segment_count=None, segment_intensities=None):
        """
        生成数据，支持一维、二维、三维正弦波和4D动画
        
        参数:
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            C: 光刻胶光敏速率常数
            sine_type: 正弦波类型，'1d'表示一维，'multi'表示二维，'3d'表示三维
            Kx: x方向空间频率
            Ky: y方向空间频率
            Kz: z方向空间频率（三维模式使用）
            phi_expr: 相位表达式
            y_range: y坐标范围数组
            z_range: z坐标范围数组（三维模式使用）
            enable_4d_animation: 是否启用4D动画
            t_start: 动画开始时间
            t_end: 动画结束时间
            time_steps: 时间步数
            x_min: x范围最小值
            x_max: x范围最大值
            angle_a: 理想曝光模型角度参数
            exposure_threshold: 理想曝光模型曝光阈值
            contrast_ctr: 理想曝光模型对比度参数
            custom_exposure_times: 自定义曝光时间列表（用于曝光时间窗口功能）
            custom_intensity_data: 自定义光强分布数据
            exposure_calculation_method: 曝光计量计算方式 ('standard'或'cumulative')
            segment_duration: 多段曝光时间累积模式下的单段时间长度
            segment_count: 多段曝光时间累积模式下的段数
            segment_intensities: 多段曝光时间累积模式下各段的光强值列表
            
        返回:
            包含曝光剂量和厚度数据的字典
        """
        logger.info("🌟" * 30)
        logger.info("【Dill模型 - 数据生成总控制】")
        logger.info("🌟" * 30)
        logger.info(f"🔸 输入参数总览:")
        logger.info(f"   - sine_type (计算维度) = '{sine_type}'")
        logger.info(f"   - I_avg (平均光强) = {I_avg}")
        logger.info(f"   - V (可见度) = {V}")
        logger.info(f"   - K (1D空间频率) = {K}")
        logger.info(f"   - t_exp (曝光时间) = {t_exp}")
        logger.info(f"   - C (光敏速率常数) = {C}")
        logger.info(f"   - angle_a (角度参数) = {angle_a}°")
        logger.info(f"   - exposure_threshold (曝光阈值) = {exposure_threshold}")
        logger.info(f"   - wavelength (光波长) = {wavelength} nm")
        logger.info(f"   - contrast_ctr (对比度参数) = {contrast_ctr}")
        logger.info(f"   - Kx (x方向空间频率) = {Kx}")
        logger.info(f"   - Ky (y方向空间频率) = {Ky}")
        logger.info(f"   - Kz (z方向空间频率) = {Kz}")
        logger.info(f"   - phi_expr (相位表达式) = '{phi_expr}'")
        logger.info(f"   - y_range = {y_range}")
        logger.info(f"   - z_range = {z_range}")
        logger.info(f"   - enable_4d_animation = {enable_4d_animation}")
        logger.info(f"   - custom_exposure_times = {custom_exposure_times}")
        
        # === 🔍 调试自定义光强数据接收 ===
        logger.info(f"🔍 后端调试 - 自定义光强数据接收检查:")
        logger.info(f"   - custom_intensity_data参数存在: {custom_intensity_data is not None}")
        if custom_intensity_data is not None:
            logger.info(f"   - 数据类型: {type(custom_intensity_data)}")
            logger.info(f"   - 数据键: {list(custom_intensity_data.keys()) if isinstance(custom_intensity_data, dict) else 'N/A'}")
            if isinstance(custom_intensity_data, dict) and 'x' in custom_intensity_data and 'intensity' in custom_intensity_data:
                x_data = custom_intensity_data['x']
                intensity_data = custom_intensity_data['intensity']
                logger.info(f"   - X坐标点数: {len(x_data)}")
                logger.info(f"   - 光强点数: {len(intensity_data)}")
                logger.info(f"   - X坐标前5个值: {x_data[:5] if len(x_data) >= 5 else x_data}")
                logger.info(f"   - 光强前5个值: {intensity_data[:5] if len(intensity_data) >= 5 else intensity_data}")
        # === 调试结束 ===
        
        # 检查是否启用自定义曝光时间窗口
        logger.info(f"🔍 调试自定义曝光时间条件:")
        logger.info(f"   - custom_exposure_times = {custom_exposure_times} (类型: {type(custom_exposure_times)})")
        logger.info(f"   - sine_type = '{sine_type}' (类型: {type(sine_type)})")
        logger.info(f"   - 条件1 (custom_exposure_times is not None): {custom_exposure_times is not None}")
        logger.info(f"   - 条件2 (sine_type in ['1d', 'single']): {sine_type in ['1d', 'single']}")
        logger.info(f"   - 总条件结果: {custom_exposure_times is not None and sine_type in ['1d', 'single']}")
        
        if custom_exposure_times is not None and sine_type in ['1d', 'single']:
            logger.info("🔸 启用自定义曝光时间窗口模式")
            logger.info(f"   - 自定义曝光时间数量: {len(custom_exposure_times)}")
            logger.info(f"   - 曝光时间列表: {custom_exposure_times}")
            
            # 使用理想曝光模型计算多个曝光时间的结果
            ideal_data = self.calculate_ideal_exposure_model(
                I_avg=I_avg,  # 🔧 修复：传递实际的I_avg参数而不是硬编码0.5
                exposure_constant_C=C,
                angle_a_deg=angle_a,
                exposure_threshold_cd=exposure_threshold,
                contrast_ctr=contrast_ctr,
                wavelength_nm=wavelength,
                exposure_times=custom_exposure_times,
                x_min=-1000,
                x_max=1000,
                num_points=2001,
                V=V  # 🔧 修复：正确传递V参数
            )
            
            # 添加自定义曝光时间窗口的标识
            ideal_data['enable_exposure_time_window'] = True
            ideal_data['custom_exposure_times'] = custom_exposure_times
            
            logger.info(f"🔸 自定义曝光时间窗口计算完成")
            return ideal_data
        
        x_axis_points = np.linspace(0, 10, 1000)
        
        # 三维正弦波处理
        if sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            logger.info(f"🔸 三维正弦波数据生成")
            
            # 设置3D网格参数，使用传入的坐标范围
            x_points = 50
            y_points = 50
            z_points = 50
            
            # 使用传入的x坐标范围
            x_min_val = float(x_min)
            x_max_val = float(x_max)
            y_min_val = float(0 if y_range is None else y_range[0])
            y_max_val = float(10 if y_range is None else y_range[-1])
            z_min_val = float(0 if z_range is None else z_range[0])
            z_max_val = float(10 if z_range is None else z_range[-1])
            
            logger.info(f"🔸 3D网格坐标范围:")
            logger.info(f"   - X: [{x_min_val:.2f}, {x_max_val:.2f}]")
            logger.info(f"   - Y: [{y_min_val:.2f}, {y_max_val:.2f}]")
            logger.info(f"   - Z: [{z_min_val:.2f}, {z_max_val:.2f}]")
            
            x_coords = np.linspace(x_min_val, x_max_val, x_points)
            y_coords = np.linspace(y_min_val, y_max_val, y_points) if y_range is None else np.array(y_range[:y_points])
            z_coords = np.linspace(z_min_val, z_max_val, z_points) if z_range is None else np.array(z_range[:z_points])
            
            # 检查是否启用4D动画
            if enable_4d_animation:
                logger.info(f"🔸 3D模式4D动画参数:")
                logger.info(f"   - 时间范围: {t_start}s ~ {t_end}s")
                logger.info(f"   - 时间步数: {time_steps}")
                logger.info(f"   - 3D网格大小: {x_points}×{y_points}×{z_points}")
                
                time_array = np.linspace(t_start, t_end, time_steps)
                
                animation_data = {
                    'x_coords': x_coords.tolist(),
                    'y_coords': y_coords.tolist(),
                    'z_coords': z_coords.tolist(),
                    'time_array': time_array.tolist(),
                    'time_steps': time_steps,
                    'exposure_dose_frames': [],
                    'thickness_frames': [],
                    'enable_4d_animation': True,
                    'sine_type': '3d',
                    'is_3d': True
                }
                
                # 创建3D网格
                X, Y, Z = np.meshgrid(x_coords, y_coords, z_coords, indexing='ij')
                
                for t_idx, t in enumerate(time_array):
                    phi_t = parse_phi_expr(phi_expr, t) if phi_expr is not None else 0.0
                    
                    # 修正：使用完整的3D Dill模型公式
                    # I(x,y,z,t) = I_avg * (1 + V * cos(Kx*x + Ky*y + Kz*z + φ(t)))
                    modulation_t = np.cos(Kx * X + Ky * Y + Kz * Z + phi_t)
                    intensity_t = I_avg * (1 + V * modulation_t)
                    
                    # 调试信息：验证相位变化
                    if t_idx < 3:  # 只打印前几帧
                        logger.info(f"   - 帧{t_idx}: t={t:.2f}s, φ(t)={phi_t:.4f}")
                        logger.info(f"     3D强度范围=[{intensity_t.min():.4f}, {intensity_t.max():.4f}]")
                        logger.info(f"     3D网格形状: {intensity_t.shape}")
                    
                    exposure_dose_t = intensity_t * t_exp
                    thickness_t = np.exp(-C * exposure_dose_t)
                    
                    # 将3D数据转换为嵌套列表格式，便于前端处理
                    # 格式: [[[z0_values], [z1_values], ...], ...]
                    try:
                        exposure_3d_frame = intensity_t.tolist()
                        thickness_3d_frame = thickness_t.tolist()
                        
                        # 验证数据结构
                        if t_idx == 0:  # 只在第一帧打印详细信息
                            logger.info(f"   - 4D帧数据结构验证:")
                            logger.info(f"     exposure_3d_frame类型: {type(exposure_3d_frame)}")
                            logger.info(f"     exposure_3d_frame维度: {len(exposure_3d_frame)}x{len(exposure_3d_frame[0]) if exposure_3d_frame else 0}x{len(exposure_3d_frame[0][0]) if exposure_3d_frame and exposure_3d_frame[0] else 0}")
                        
                    except Exception as e:
                        logger.error(f"   - 4D帧{t_idx}数据转换失败: {str(e)}")
                        exposure_3d_frame = intensity_t.flatten().tolist()
                        thickness_3d_frame = thickness_t.flatten().tolist()
                    
                    animation_data['exposure_dose_frames'].append(exposure_3d_frame)
                    animation_data['thickness_frames'].append(thickness_3d_frame)
                    
                    logger.info(f"   - 时间步 {t_idx+1}/{time_steps} (t={t:.2f}s) 3D计算完成")
                
                logger.info(f"🔸 Dill模型3D-4D动画数据生成完成，共{time_steps}帧")
                return animation_data
            
            else:
                # 静态3D数据生成 - 生成完整的3D数据而不是2D切片
                logger.info("🔸 生成完整3D静态数据...")
                
                # 创建完整的3D网格
                X_grid, Y_grid, Z_grid = np.meshgrid(x_coords, y_coords, z_coords, indexing='ij')
                
                logger.info(f"   - 3D网格形状: X={X_grid.shape}, Y={Y_grid.shape}, Z={Z_grid.shape}")
                
                # 计算完整3D空间的光强分布
                phi_val = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                modulation_3d = np.cos(Kx * X_grid + Ky * Y_grid + Kz * Z_grid + phi_val)
                intensity_3d = I_avg * (1 + V * modulation_3d)
                
                logger.info(f"   - 3D光强计算完成，范围: [{intensity_3d.min():.4f}, {intensity_3d.max():.4f}]")
                
                # 计算3D曝光剂量和厚度分布
                exposure_dose_3d = intensity_3d * t_exp
                thickness_3d = np.exp(-C * exposure_dose_3d)
                
                logger.info(f"   - 3D曝光剂量范围: [{exposure_dose_3d.min():.4f}, {exposure_dose_3d.max():.4f}]")
                logger.info(f"   - 3D厚度范围: [{thickness_3d.min():.4f}, {thickness_3d.max():.4f}]")

                # 返回完整的3D数据，使用嵌套列表格式便于前端处理
                try:
                    exposure_3d_list = exposure_dose_3d.tolist()
                    thickness_3d_list = thickness_3d.tolist()
                    
                    logger.info(f"   - 3D数据转换为列表格式完成")
                    logger.info(f"   - 曝光剂量数据维度: {len(exposure_3d_list)}×{len(exposure_3d_list[0])}×{len(exposure_3d_list[0][0])}")
                    logger.info(f"   - 厚度数据维度: {len(thickness_3d_list)}×{len(thickness_3d_list[0])}×{len(thickness_3d_list[0][0])}")
                    
                except Exception as e:
                    logger.error(f"   - 3D数据转换失败: {str(e)}")
                    # 备用方案：返回扁平化数据
                    exposure_3d_list = exposure_dose_3d.flatten().tolist()
                    thickness_3d_list = thickness_3d.flatten().tolist()
                    logger.info(f"   - 使用备用方案：扁平化数据")

                return {
                    'x_coords': x_coords.tolist(),
                    'y_coords': y_coords.tolist(),
                    'z_coords': z_coords.tolist(),
                    'exposure_dose': exposure_3d_list,
                    'thickness': thickness_3d_list,
                    'is_3d': True,
                    'is_2d': False,
                    'sine_type': '3d',
                    'data_shape': [len(x_coords), len(y_coords), len(z_coords)],
                    'is_row_major': True,  # 明确告知前端数据是行主序
                    'phi_value': phi_val  # 记录使用的相位值
                }

        # 二维正弦波处理  
        elif sine_type == 'multi' and Kx is not None and Ky is not None:
            logger.info(f"🔸 二维正弦波数据生成")
            
            y_axis_points = np.array(y_range) if y_range is not None else np.linspace(0, 10, 100)
            
            if enable_4d_animation:
                logger.info(f"🔸 2D模式4D动画参数:")
                logger.info(f"   - 时间范围: {t_start}s ~ {t_end}s")
                logger.info(f"   - 时间步数: {time_steps}")
                
                time_array = np.linspace(t_start, t_end, time_steps)
                
                animation_data = {
                    'x_coords': x_axis_points.tolist(),
                    'y_coords': y_axis_points.tolist(),
                    'time_array': time_array.tolist(),
                    'time_steps': time_steps,
                    'exposure_dose_frames': [],
                    'thickness_frames': [],
                    'enable_4d_animation': True,
                    'sine_type': 'multi',
                    'is_2d': True
                }
                
                for t_idx, t in enumerate(time_array):
                    phi_t = parse_phi_expr(phi_expr, t) if phi_expr is not None else 0.0
                    
                    exposure_dose_2d = []
                    thickness_2d = []
                    
                    for y in y_axis_points:
                        intensity_line = I_avg * (1 + V * np.cos(Kx * x_axis_points + Ky * y + phi_t))
                        exposure_dose_line = intensity_line * t_exp
                        thickness_line = np.exp(-C * exposure_dose_line)
                        
                        exposure_dose_2d.append(exposure_dose_line.tolist())
                        thickness_2d.append(thickness_line.tolist())
                    
                    animation_data['exposure_dose_frames'].append(exposure_dose_2d)
                    animation_data['thickness_frames'].append(thickness_2d)
                    
                    logger.info(f"   - 时间步 {t_idx+1}/{time_steps} (t={t:.2f}s) 计算完成")
                
                logger.info(f"🔸 Dill模型2D-4D动画数据生成完成，共{time_steps}帧")
                return animation_data
            
            else:
                # 静态2D数据生成
                phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                
                X_grid, Y_grid = np.meshgrid(x_axis_points, y_axis_points)
                exposure_dose_2d = I_avg * (1 + V * np.cos(Kx * X_grid + Ky * Y_grid + phi)) * t_exp
                thickness_2d = np.exp(-C * exposure_dose_2d)
                
                return {
                    'x_coords': x_axis_points.tolist(),
                    'y_coords': y_axis_points.tolist(),
                    'z_exposure_dose': exposure_dose_2d.tolist(),
                    'z_thickness': thickness_2d.tolist(),
                    'is_2d': True
                }
        
        # 一维正弦波处理
        else:
            logger.info(f"🔸 一维正弦波数据生成")
            
            if enable_4d_animation:
                logger.info(f"🔸 1D模式4D动画参数:")
                logger.info(f"   - 时间范围: {t_start}s ~ {t_end}s")
                logger.info(f"   - 时间步数: {time_steps}")
                
                time_array = np.linspace(t_start, t_end, time_steps)
                
                animation_data = {
                    'x_coords': x_axis_points.tolist(),
                    'time_array': time_array.tolist(),
                    'time_steps': time_steps,
                    'exposure_dose_frames': [],
                    'thickness_frames': [],
                    'enable_4d_animation': True,
                    'sine_type': '1d',
                    'is_1d': True
                }
                
                for t_idx, t in enumerate(time_array):
                    phi_t = parse_phi_expr(phi_expr, t) if phi_expr is not None else 0.0
                    
                    intensity_t = I_avg * (1 + V * np.cos(K * x_axis_points + phi_t))
                    exposure_dose_t = intensity_t * t_exp
                    thickness_t = np.exp(-C * exposure_dose_t)
                    
                    animation_data['exposure_dose_frames'].append(exposure_dose_t.tolist())
                    animation_data['thickness_frames'].append(thickness_t.tolist())
                    
                    logger.info(f"   - 时间步 {t_idx+1}/{time_steps} (t={t:.2f}s) 计算完成")
                
                logger.info(f"🔸 Dill模型1D-4D动画数据生成完成，共{time_steps}帧")
                return animation_data
            
            else:
                # 静态1D数据生成 - 使用理想曝光模型
                logger.info(f"🔸 正在使用理想曝光模型计算一维分布...")
                
                # 确定要使用的曝光时间序列
                if exposure_calculation_method == 'cumulative' and segment_count is not None and segment_duration is not None and segment_intensities is not None:
                    # 🔥 使用多段曝光时间累积模式 - 特殊处理
                    total_time = segment_count * segment_duration
                    exposure_times_to_use = [total_time]
                    logger.info(f"🔸 使用多段曝光时间累积模式:")
                    logger.info(f"   - 段数: {segment_count}")
                    logger.info(f"   - 单段时长: {segment_duration}s")
                    logger.info(f"   - 总曝光时间: {total_time}s")
                    logger.info(f"   - 光强数组: {segment_intensities}")
                    
                    # 🔥 多段曝光模式的专用计算逻辑
                    # 🔥 修复：使用动态坐标范围计算，与标准模式保持一致
                    # 检查是否使用自定义光强分布来决定坐标范围
                    if custom_intensity_data is not None:
                        custom_x = np.array(custom_intensity_data.get('x', []))
                        if len(custom_x) > 0:
                            # 获取自定义数据的范围
                            x_min_custom = np.min(custom_x)
                            x_max_custom = np.max(custom_x)
                            
                            # 计算合适的坐标轴（扩展范围20%）
                            x_range = x_max_custom - x_min_custom
                            x_padding = x_range * 0.2  # 20% 的额外空间
                            calc_x_min = x_min_custom - x_padding
                            calc_x_max = x_max_custom + x_padding
                            
                            logger.info(f"🔸 使用基于自定义数据范围的计算网格:")
                            logger.info(f"   - 自定义数据范围: [{x_min_custom:.6f}, {x_max_custom:.6f}]")
                            logger.info(f"   - 计算网格范围: [{calc_x_min:.6f}, {calc_x_max:.6f}]")
                        else:
                            # 如果没有范围信息，使用默认范围
                            calc_x_min = -1000
                            calc_x_max = 1000
                            logger.info(f"🔸 使用默认计算网格范围(无自定义数据): [{calc_x_min}, {calc_x_max}]")
                    else:
                        # 没有自定义数据，使用默认范围
                        calc_x_min = -1000
                        calc_x_max = 1000
                        logger.info(f"🔸 使用默认计算网格范围(标准模式): [{calc_x_min}, {calc_x_max}]")
                    
                    # 创建坐标轴，点数保持一致为2001
                    x_coords = np.linspace(calc_x_min, calc_x_max, 2001)
                    
                    
                    # 🔥 计算基准光强分布（使用正确的光强分布计算方法，支持自定义光强数据）
                    # 修复：使用calculate_intensity_distribution方法来正确处理custom_intensity_data
                    base_intensity = self.calculate_intensity_distribution(
                        x_coords, I_avg, V, K, sine_type, Kx, Ky, Kz, phi_expr, 
                        y=0, z=0, t=0, custom_intensity_data=custom_intensity_data
                    )
                    
                    # 如果没有自定义数据，使用理想曝光模型公式作为备选
                    if custom_intensity_data is None:
                        angle_a_rad = angle_a * np.pi / 180
                        spatial_freq = 4 * np.pi * np.sin(angle_a_rad) / wavelength
                        base_intensity = I_avg * (1 + V * np.cos(spatial_freq * x_coords))
                    
                    # 记录光强分布计算信息
                    if custom_intensity_data is not None:
                        logger.info(f"🔥 使用自定义光强数据计算基准光强:")
                        logger.info(f"   - 自定义数据点数: {len(custom_intensity_data.get('x', []))}")
                        logger.info(f"   - 光强范围: [{np.min(base_intensity):.6f}, {np.max(base_intensity):.6f}]")
                    else:
                        logger.info(f"🔥 使用理想曝光模型公式计算基准光强:")
                        angle_a_rad = angle_a * np.pi / 180
                        spatial_freq = 4 * np.pi * np.sin(angle_a_rad) / wavelength
                        logger.info(f"   - 空间频率: 4π×sin({angle_a}°)/{wavelength} = {spatial_freq:.6f} rad/μm")
                        logger.info(f"   - 波长: {2*np.pi/spatial_freq:.1f} μm")
                        logger.info(f"   - 预期周期数: {2000/(2*np.pi/spatial_freq):.1f}个")
                    
                    # 🔥 累积计算多段曝光剂量 - 修复：使用实际光强值而非归一化
                    cumulative_exposure_dose = np.zeros_like(x_coords, dtype=np.float64)
                    for i in range(segment_count):
                        if i < len(segment_intensities):
                            # 🔥 修复：segment_intensities[i] 作为光强系数，与基准光强相乘
                            # 这样可以保持物理意义：实际光强 = 系数 × 基准光强
                            segment_intensity_distribution = segment_intensities[i] * base_intensity
                            segment_exposure = segment_intensity_distribution * segment_duration
                            cumulative_exposure_dose += segment_exposure
                            logger.info(f"   - 段{i+1}: 光强系数={segment_intensities[i]}, 实际光强均值={np.mean(segment_intensity_distribution):.4f}, 贡献曝光剂量均值={np.mean(segment_exposure):.4f}")
                    
                    logger.info(f"   - 🔥 多段累积曝光剂量范围: [{np.min(cumulative_exposure_dose):.6f}, {np.max(cumulative_exposure_dose):.6f}]")
                    
                    # 🔥 计算厚度分布（使用理想模型阈值机制）
                    M_values = np.zeros_like(cumulative_exposure_dose)
                    for i in range(len(cumulative_exposure_dose)):
                        if cumulative_exposure_dose[i] < exposure_threshold:
                            M_values[i] = 1.0  # 未达阈值，完全抗蚀
                        else:
                            M_values[i] = np.exp(-C * (cumulative_exposure_dose[i] - exposure_threshold))
                    
                    thickness_values = M_values
                    
                    # 🔥 计算用户实际设定的平均光强分布（用于前端显示）
                    # 在多段曝光模式下，显示的光强应该是各段光强系数的加权平均
                    average_intensity_coefficient = np.mean(segment_intensities)
                    actual_intensity_distribution = average_intensity_coefficient * base_intensity
                    
                    logger.info(f"   - 🔥 显示用光强分布（平均系数 {average_intensity_coefficient}）: [{np.min(actual_intensity_distribution):.6f}, {np.max(actual_intensity_distribution):.6f}]")
                    
                    # 🔥 返回多段曝光专用数据结构
                    # 🔥 修复：不再硬编码除以1000，保持与标准模式一致
                    return {
                        'x': x_coords.tolist(),  # 直接返回坐标，与标准模式一致
                        'x_coords': x_coords.tolist(),
                        'exposure_dose': cumulative_exposure_dose.tolist(),
                        'thickness': thickness_values.tolist(),
                        'intensity_distribution': actual_intensity_distribution.tolist(),  # 🔥 修复：返回实际光强分布
                        'M_values': M_values.tolist(),
                        'H_values': (1 - M_values).tolist(),
                        'etch_depths_data': [{
                            'time': total_time,
                            'etch_depth': (-(1 - M_values)).tolist(),
                            'M_values': M_values.tolist(),
                            'D0_values': cumulative_exposure_dose.tolist()
                        }],
                        'exposure_times': [total_time],
                        'sine_type': '1d',
                        'is_1d': True,
                        'is_ideal_exposure_model': True,  # 🔥 关键：标记为理想曝光模型
                        'exposure_calculation_method': 'cumulative',  # 🔥 标记多段曝光模式
                        'segment_count': segment_count,
                        'segment_duration': segment_duration,
                        'segment_intensities': segment_intensities,
                        'parameters': {
                            'C': C,
                            'cd': exposure_threshold,
                            't_exp': total_time,
                            'model_type': 'cumulative_exposure'
                        }
                    }
                    
                elif custom_exposure_times is not None and len(custom_exposure_times) > 0:
                    # 使用自定义曝光时间（启用曝光时间窗口模式）
                    exposure_times_to_use = custom_exposure_times
                    logger.info(f"🔸 使用自定义曝光时间序列: {exposure_times_to_use}")
                else:
                    # 使用单一曝光时间（未启用曝光时间窗口模式）
                    exposure_times_to_use = [t_exp]
                    logger.info(f"🔸 使用单一曝光时间: {exposure_times_to_use}")
                
                # 检查是否使用自定义光强分布
                if custom_intensity_data is not None:
                    logger.info(f"🔸 使用自定义光强分布数据进行1D计算（理想模型阈值机制）")
                    
                    # 检查自定义数据中是否有范围信息
                    custom_x = np.array(custom_intensity_data.get('x', []))
                    if len(custom_x) > 0:
                        # 获取自定义数据的范围
                        x_min_custom = np.min(custom_x)
                        x_max_custom = np.max(custom_x)
                        
                        # 计算合适的坐标轴
                        # 扩展范围，使坐标轴比数据点多20%
                        x_range = x_max_custom - x_min_custom
                        x_padding = x_range * 0.2  # 20% 的额外空间
                        calc_x_min = x_min_custom - x_padding
                        calc_x_max = x_max_custom + x_padding
                        
                        # 打印坐标信息
                        logger.info(f"🔸 使用基于自定义数据范围的计算网格:")
                        logger.info(f"   - 自定义数据范围: [{x_min_custom:.3f}, {x_max_custom:.3f}]")
                        logger.info(f"   - 计算网格范围: [{calc_x_min:.3f}, {calc_x_max:.3f}]")
                    else:
                        # 如果没有范围信息，使用默认范围
                        calc_x_min = -1000
                        calc_x_max = 1000
                        logger.info(f"🔸 使用默认计算网格范围: [{calc_x_min}, {calc_x_max}]")
                    
                    # 创建坐标轴，点数保持一致为2001
                    x_coords = np.linspace(calc_x_min, calc_x_max, 2001)
                    
                    # 使用自定义光强分布计算曝光剂量
                    exposure_dose = self.calculate_exposure_dose(
                        x_coords, I_avg, V, K, t_exp, '1d', 
                        custom_intensity_data=custom_intensity_data,
                        exposure_calculation_method=exposure_calculation_method,
                        segment_duration=segment_duration,
                        segment_count=segment_count,
                        segment_intensities=segment_intensities
                    )
                    
                    # 获取光强分布
                    intensity_distribution = self.calculate_intensity_distribution(
                        x_coords, I_avg, V, K, '1d', 
                        custom_intensity_data=custom_intensity_data
                    )
                    
                    # 使用理想模型的阈值机制计算厚度分布
                    # 步骤1: D0(x) = I0(x) × t_exp (已在exposure_dose中计算)
                    # 步骤2: 阈值判断与抗蚀效果计算
                    # 步骤3: H(x) = 1 - M(x) (蚀刻深度)
                    
                    # 获取曝光阈值参数（与前端保持一致）
                    exposure_threshold = exposure_threshold
                    
                    logger.info(f"🔸 使用理想模型阈值机制:")
                    logger.info(f"   - C (光敏速率常数) = {C}")
                    logger.info(f"   - cd (曝光阈值) = {exposure_threshold}")
                    logger.info(f"   - t_exp (曝光时间) = {t_exp}")
                    
                    # 初始化抗蚀效果 M 和蚀刻深度 H
                    M_values = np.zeros_like(exposure_dose)
                    H_values = np.zeros_like(exposure_dose)
                    
                    # 按理想模型的逻辑计算 M 和 H
                    for i in range(len(exposure_dose)):
                        if exposure_dose[i] < exposure_threshold:
                            M_values[i] = 1.0  # 未达阈值，完全抗蚀
                        else:
                            M_values[i] = np.exp(-C * (exposure_dose[i] - exposure_threshold))
                        H_values[i] = 1 - M_values[i]  # 蚀刻深度
                    
                    # thickness 使用 M 值（抗蚀效果，剩余厚度）
                    thickness = M_values
                    
                    logger.info(f"🔸 理想模型计算结果:")
                    logger.info(f"   - 曝光剂量范围: [{np.min(exposure_dose):.6f}, {np.max(exposure_dose):.6f}]")
                    logger.info(f"   - M值范围: [{np.min(M_values):.6f}, {np.max(M_values):.6f}]")
                    logger.info(f"   - 蚀刻深度范围: [{np.min(H_values):.6f}, {np.max(H_values):.6f}]")
                    
                    # 返回自定义数据结果（与理想模型格式保持一致）
                    return {
                        'x': x_coords.tolist(),
                        'x_coords': x_coords.tolist(),
                        'exposure_dose': exposure_dose.tolist(),
                        'thickness': thickness.tolist(),
                        'intensity_distribution': intensity_distribution.tolist(),
                        'M_values': M_values.tolist(),
                        'H_values': H_values.tolist(),
                        'etch_depths_data': [{
                            'time': t_exp,
                            'etch_depth': (-H_values).tolist(),  # 负值显示
                            'M_values': M_values.tolist(),
                            'D0_values': exposure_dose.tolist()
                        }],
                        'exposure_times': [t_exp],
                        'sine_type': '1d',
                        'is_1d': True,
                        'custom_intensity_mode': True,
                        'is_ideal_exposure_model': True,  # 标记为使用理想模型
                        'parameters': {
                            'C': C,
                            'cd': exposure_threshold,
                            't_exp': t_exp,
                            'model_type': 'ideal_threshold'
                        }
                    }
                
                # 使用理想曝光模型参数
                ideal_data = self.calculate_ideal_exposure_model(
                    I_avg=I_avg,  # 🔧 修复：传递实际的I_avg参数而不是硬编码0.5
                    exposure_constant_C=C,  # 使用传入的C参数
                    angle_a_deg=angle_a,   # 使用传入的角度参数
                    exposure_threshold_cd=exposure_threshold,  # 使用传入的阈值参数
                    contrast_ctr=contrast_ctr,  # 使用传入的对比度参数
                    wavelength_nm=wavelength,  # 传递波长参数
                    exposure_times=exposure_times_to_use,  # 使用确定的曝光时间序列
                    x_min=-1000,
                    x_max=1000,
                    num_points=2001,
                    V=V  # 🔥 重要修复：传递V参数给理想曝光模型
                )
                
                logger.info(f"🔸 理想曝光模型一维数据生成完成")
                logger.info(f"   - X坐标点数: {len(ideal_data['x'])}")
                logger.info(f"   - 强度分布范围: [{np.min(ideal_data['intensity_distribution']):.6f}, {np.max(ideal_data['intensity_distribution']):.6f}]")
                logger.info(f"   - 蚀刻深度曲线数: {len(ideal_data['etch_depths_data'])}")
                
                # 🔥 关键修复：为V评估模式和前端静态图表兼容性，添加exposure_dose和thickness字段
                # 基于强度分布计算1D曝光剂量和厚度（用于静态图表显示）
                x_coords_mm = np.array(ideal_data['x'])  # 位置坐标（mm）
                x_coords_um = x_coords_mm * 1000  # 转换为微米
                intensity_distribution = np.array(ideal_data['intensity_distribution'])
                
                # 🔥 修复：计算曝光剂量并应用阈值逻辑（基于理想曝光模型）
                exposure_dose_static = intensity_distribution * t_exp
                
                # 🔥 修复：计算光刻胶厚度时应用正确的阈值逻辑（与理想曝光模型一致）
                # 按照理想曝光模型的逻辑：当D0 < exposure_threshold时M=1，否则M=exp(-C*(D0-threshold))
                M_static = np.zeros_like(exposure_dose_static)
                for i in range(len(exposure_dose_static)):
                    if exposure_dose_static[i] < exposure_threshold:
                        M_static[i] = 1.0  # 未达到阈值，完全抗蚀
                    else:
                        M_static[i] = np.exp(-C * (exposure_dose_static[i] - exposure_threshold))
                
                # 厚度 = 1 - 蚀刻深度，其中蚀刻深度 = 1 - M
                thickness_static = M_static
                
                # 🔥 重要：扩展理想曝光模型数据，添加前端静态图表所需的字段
                enhanced_ideal_data = ideal_data.copy()
                enhanced_ideal_data.update({
                    # 前端静态图表必需字段
                    'x_coords': x_coords_mm.tolist(),  # 位置坐标（mm）
                    'exposure_dose': exposure_dose_static.tolist(),  # 曝光剂量数组
                    'thickness': thickness_static.tolist(),  # 厚度数组
                    
                    # 兼容性字段
                    'exposure_data': {
                        'x': x_coords_mm.tolist(),
                        'y': exposure_dose_static.tolist()
                    },
                    'thickness_data': {
                        'x': x_coords_mm.tolist(),
                        'y': thickness_static.tolist()
                    },
                    
                    # 🔥 修复：添加用户输入的原始参数（前端弹窗需要）
                    'V': V,  # 干涉条纹可见度
                    'C': C,  # 光敏速率常数
                    'angle_a': angle_a,  # 角度参数
                    'exposure_threshold': exposure_threshold,  # 曝光阈值
                    't_exp': t_exp,  # 曝光时间
                    
                    # 兼容性参数名
                    'exposure_threshold_cd': exposure_threshold,
                    'cd': exposure_threshold,
                    'exposure_constant_C': C,
                    
                    # 元数据
                    'is_1d': True,
                    'model_type': 'dill',
                    'sine_type': '1d',
                    'computation_method': 'ideal_exposure_model_with_1d_extension'
                })
                
                logger.info(f"🔸 为前端兼容性添加了1D静态数据字段")
                logger.info(f"   - exposure_dose范围: [{np.min(exposure_dose_static):.6f}, {np.max(exposure_dose_static):.6f}]")
                logger.info(f"   - thickness范围: [{np.min(thickness_static):.6f}, {np.max(thickness_static):.6f}]")
                
                return enhanced_ideal_data

    def generate_plots(self, I_avg, V, K, t_exp, C, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y_range=None, z_range=None, enable_4d_animation=False, t_start=0, t_end=5, time_steps=20, x_min=0, x_max=10, angle_a=11.7, exposure_threshold=20, contrast_ctr=1, wavelength=405, custom_exposure_times=None, custom_intensity_data=None, exposure_calculation_method=None, segment_duration=None, segment_count=None, segment_intensities=None):
        """
        生成图表数据的包装器方法
        
        参数:
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 总曝光时间
            C: 光刻胶光敏速率常数
            sine_type: 正弦波类型
            Kx, Ky, Kz: 空间频率分量
            phi_expr: 相位表达式
            y_range, z_range: 坐标范围
            enable_4d_animation: 是否启用4D动画
            t_start, t_end: 时间范围
            time_steps: 时间步数
            x_min, x_max: x轴范围
            angle_a: 理想曝光模型角度参数
            exposure_threshold: 理想曝光模型曝光阈值
            contrast_ctr: 理想曝光模型对比度参数
            custom_exposure_times: 自定义曝光时间列表
            custom_intensity_data: 自定义光强分布数据
            exposure_calculation_method: 曝光计量计算方式 ('standard'或'cumulative')
            segment_duration: 多段曝光时间累积模式下的单段时间长度
            segment_count: 多段曝光时间累积模式下的段数
            segment_intensities: 多段曝光时间累积模式下各段的光强值列表
            
        返回:
            包含图表数据的字典
        """
        logger.info("🎯 调用DillModel.generate_plots方法")
        logger.info(f"🎯 generate_plots收到的custom_exposure_times = {custom_exposure_times}")
        logger.info(f"🎯 generate_plots收到的custom_intensity_data = {custom_intensity_data is not None}")
        
        # 记录多段曝光时间累积模式参数
        if exposure_calculation_method == 'cumulative':
            logger.info(f"🎯 多段曝光时间累积模式参数:")
            logger.info(f"   - segment_duration = {segment_duration}")
            logger.info(f"   - segment_count = {segment_count}")
            logger.info(f"   - segment_intensities = {segment_intensities[:5]}... (共{len(segment_intensities)}段)")
        
        return self.generate_data(
            I_avg, V, K, t_exp, C, sine_type=sine_type, 
            Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr, 
            y_range=y_range, z_range=z_range, 
            enable_4d_animation=enable_4d_animation, 
            t_start=t_start, t_end=t_end, time_steps=time_steps, 
            x_min=x_min, x_max=x_max, 
            angle_a=angle_a, exposure_threshold=exposure_threshold, 
            contrast_ctr=contrast_ctr, wavelength=wavelength, 
            custom_exposure_times=custom_exposure_times, 
            custom_intensity_data=custom_intensity_data,
            exposure_calculation_method=exposure_calculation_method,
            segment_duration=segment_duration,
            segment_count=segment_count,
            segment_intensities=segment_intensities
        )

    def generate_1d_animation_data(self, I_avg, V, K, t_exp_start, t_exp_end, time_steps, C, angle_a=11.7, exposure_threshold=20, contrast_ctr=1, wavelength=405):
        """
        生成1D时间动画数据 - 使用理想曝光模型
        
        参数:
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp_start: 开始曝光时间
            t_exp_end: 结束曝光时间
            time_steps: 时间步数
            C: 光刻胶光敏速率常数
            
        返回:
            包含动画数据的字典
        """
        logger.info("=" * 60)
        logger.info("【理想曝光模型 - 1D时间动画数据生成】")
        logger.info("=" * 60)
        logger.info(f"🔸 曝光时间范围: {t_exp_start}s - {t_exp_end}s")
        logger.info(f"🔸 时间步数: {time_steps}")
        logger.info(f"🔸 其他参数: I_avg={I_avg}, V={V}, K={K}, C={C}")
        
        # 生成时间序列
        time_values = np.linspace(t_exp_start, t_exp_end, time_steps)
        
        # 为每个时间点生成理想曝光模型数据
        animation_frames = []
        for i, t_exp in enumerate(time_values):
            # 使用理想曝光模型计算当前时间点的数据
            ideal_data = self.calculate_ideal_exposure_model(
                I_avg=I_avg,  # 🔧 修复：传递实际的I_avg参数而不是硬编码0.5
                exposure_constant_C=C,
                angle_a_deg=angle_a,
                exposure_threshold_cd=exposure_threshold,
                contrast_ctr=contrast_ctr,
                wavelength_nm=wavelength,  # 传递波长参数
                exposure_times=[t_exp * 30, t_exp * 60, t_exp * 250, t_exp * 1000, t_exp * 2000],
                x_min=-1000,
                x_max=1000,
                num_points=1001,  # 减少点数以提高动画性能
                V=V  # 🔧 修复：正确传递V参数
            )
            
            # 生成标准的1D数据结构 - 添加exposure_data字段以符合前端期望
            x_coords = ideal_data['x']
            intensity_distribution = ideal_data['intensity_distribution']
            
            # 🔥 修复：计算基于强度的曝光剂量并应用阈值逻辑（动画版本）
            exposure_dose = np.array(intensity_distribution) * t_exp
            
            # 🔥 修复：计算光刻胶厚度变化时应用正确的阈值逻辑
            # 按照理想曝光模型的逻辑：当D0 < exposure_threshold时M=1，否则M=exp(-C*(D0-threshold))
            M_values = np.zeros_like(exposure_dose)
            for i in range(len(exposure_dose)):
                if exposure_dose[i] < exposure_threshold:
                    M_values[i] = 1.0  # 未达到阈值，完全抗蚀
                else:
                    M_values[i] = np.exp(-C * (exposure_dose[i] - exposure_threshold))
            
            # 厚度 = M值（光敏剂浓度，直接代表剩余厚度）
            thickness = M_values
            
            frame_data = {
                't_exp': float(t_exp),
                'time': float(t_exp),  # 添加time字段供前端使用
                't': float(t_exp),     # 添加t字段供前端使用
                'x_coords': x_coords,
                'x': x_coords,         # 添加x字段供前端使用
                'intensity_distribution': intensity_distribution,
                'etch_depths_data': ideal_data['etch_depths_data'],
                'exposure_times': ideal_data['exposure_times'],
                'exposure_data': {      # 添加exposure_data字段以符合前端期望
                    'x': x_coords,
                    'y': exposure_dose.tolist()
                },
                'exposure_dose': exposure_dose.tolist(),  # 直接提供exposure_dose数组
                'thickness_data': {     # 添加thickness_data字段
                    'x': x_coords,
                    'y': thickness.tolist()
                },
                'thickness': thickness.tolist(),    # 直接提供thickness数组
                'frame_index': i,
                'is_ideal_exposure_model': True
            }
            animation_frames.append(frame_data)
            
            logger.info(f"✅ 生成第 {i+1}/{time_steps} 帧 (t_exp={t_exp:.2f}s)")
        
        # 返回动画数据结构
        result = {
            'model_type': 'dill',
            'sine_type': '1d',
            'is_animation': True,
            'animation_type': '1d_time',
            'time_steps': time_steps,
            'time_values': time_values.tolist(),
            'frames': animation_frames,
            'animation_frames': animation_frames,  # 添加animation_frames字段供前端使用
            'is_ideal_exposure_model': True
        }
        
        logger.info(f"🎬 理想曝光模型1D时间动画数据生成完成，共{time_steps}帧")
        return result

    def generate_1d_v_animation_data(self, I_avg, V_start, V_end, time_steps, K, t_exp, C, 
                                     angle_a=11.7, exposure_threshold=20, wavelength=405):
        """
        生成1D V（对比度）评估动画数据 - 使用理想曝光模型
        
        参数:
            I_avg: 平均入射光强度
            V_start: 开始V值（对比度）
            V_end: 结束V值（对比度）
            time_steps: V值步数
            K: 干涉条纹的空间频率（此参数在理想曝光模型中由angle_a和wavelength确定）
            t_exp: 曝光时间
            C: 光刻胶光敏速率常数
            angle_a: 入射角度（度），用于理想曝光模型
            exposure_threshold: 曝光阈值，用于理想曝光模型
            wavelength: 光波长（nm），用于理想曝光模型
            
        返回:
            包含V评估动画数据的字典
        """
        logger.info("=" * 60)
        logger.info("【理想曝光模型 - 1D V（对比度）评估数据生成】")
        logger.info("=" * 60)
        logger.info(f"🔸 V值范围: {V_start} - {V_end}")
        logger.info(f"🔸 V值步数: {time_steps}")
        logger.info(f"🔸 使用理想曝光模型公式")
        logger.info(f"🔸 参数: I_avg={I_avg}, t_exp={t_exp}, C={C}")
        logger.info(f"🔸 理想曝光模型参数: angle_a={angle_a}°, exposure_threshold={exposure_threshold}, wavelength={wavelength}nm")
        
        # 生成x坐标（使用理想曝光模型的标准范围）
        x_um = np.linspace(-1000, 1000, 1001)  # 微米单位，-1000到1000微米
        x_mm = x_um / 1000.0  # 转换为毫米单位（理想曝光模型输出格式）
        
        # 生成V值序列
        v_values = np.linspace(V_start, V_end, time_steps)
        
        # 理想曝光模型的固定参数
        angle_a_rad = angle_a * np.pi / 180  # 角度转弧度
        spatial_freq_coeff = 4 * np.pi * np.sin(angle_a_rad) / wavelength  # 空间频率系数
        
        logger.info(f"🔸 理想曝光模型计算参数:")
        logger.info(f"   - 空间频率系数: 4π×sin(a)/λ = {spatial_freq_coeff:.6f} rad/μm")
        logger.info(f"   - x坐标范围: [{np.min(x_um):.1f}, {np.max(x_um):.1f}] μm")
        
        # 为每个V值生成数据
        animation_frames = []
        for i, v_val in enumerate(v_values):
            logger.info(f"🔸 计算第 {i+1}/{time_steps} 帧 (V={v_val:.3f})")
            
            # 使用理想曝光模型的强度分布公式
            # I0 = I_avg * (1 + V * cos((4 * π * sin(a) / λ) * X))
            intensity_distribution = I_avg * (1 + v_val * np.cos(spatial_freq_coeff * x_um))
            
            # 计算曝光剂量 D0 = I0 * t_exp
            exposure_dose = intensity_distribution * t_exp
            
            # 使用理想曝光模型的厚度计算逻辑（M值计算）
            M_values = np.zeros_like(exposure_dose)
            for j in range(len(exposure_dose)):
                if exposure_dose[j] < exposure_threshold:
                    M_values[j] = 1.0  # 未达到阈值，完全抗蚀
                else:
                    # 超过阈值，按指数衰减
                    M_values[j] = np.exp(-C * (exposure_dose[j] - exposure_threshold))
            
            # 厚度 = M值（光敏剂浓度，直接代表剩余厚度）
            thickness = M_values
            
            frame_data = {
                'v_value': float(v_val),
                'x_coords': x_mm.tolist(),  # 输出毫米单位坐标
                'x': x_mm.tolist(),  # 兼容性字段
                'exposure_dose': exposure_dose.tolist(),
                'exposure_data': exposure_dose.tolist(),  # 保持向后兼容
                'thickness': thickness.tolist(),
                'thickness_data': thickness.tolist(),  # 保持向后兼容
                'frame_index': i,
                # 添加理想曝光模型的特定信息
                'intensity_distribution': intensity_distribution.tolist(),
                'M_values': M_values.tolist(),
                'model_type': 'ideal_exposure',
                'spatial_freq_coeff': spatial_freq_coeff
            }
            animation_frames.append(frame_data)
            
            logger.info(f"   - 强度范围: [{np.min(intensity_distribution):.3f}, {np.max(intensity_distribution):.3f}]")
            logger.info(f"   - 曝光剂量范围: [{np.min(exposure_dose):.3f}, {np.max(exposure_dose):.3f}]")
            logger.info(f"   - 厚度范围: [{np.min(thickness):.4f}, {np.max(thickness):.4f}]")
        
        # 返回V评估动画数据结构
        result = {
            'model_type': 'dill',
            'sine_type': '1d',
            'is_animation': True,
            'animation_type': '1d_v_contrast',
            'time_steps': time_steps,
            'v_values': v_values.tolist(),
            'frames': animation_frames,
            'x_coords': x_mm.tolist(),
            # 理想曝光模型参数信息
            'ideal_exposure_model': True,
            'parameters': {
                'I_avg': I_avg,
                't_exp': t_exp,
                'C': C,
                'angle_a_deg': angle_a,
                'exposure_threshold': exposure_threshold,
                'wavelength_nm': wavelength,
                'spatial_freq_coeff': spatial_freq_coeff
            }
        }
        
        logger.info(f"🎬 理想曝光模型1D V（对比度）评估动画数据生成完成，共{time_steps}帧")
        logger.info(f"🔸 确认使用理想曝光模型公式:")
        logger.info(f"   - 强度分布: I0 = I_avg * (1 + V * cos((4π×sin(a)/λ) * X))")
        logger.info(f"   - 阈值逻辑: M = 1 (if D0 < threshold), M = exp(-C*(D0-threshold)) (if D0 >= threshold)")
        
        return result

    def calculate_ideal_exposure_model(self, I_avg=1.0, exposure_constant_C=0.022, angle_a_deg=11.7, 
                                     exposure_threshold_cd=20, contrast_ctr=1, wavelength_nm=405,
                                     exposure_times=[30, 60, 250, 1000, 2000], 
                                     x_min=-1000, x_max=1000, num_points=2001, V=None):
        """
        理想曝光模型计算 - 完全按照Python代码逻辑实现
        
        参数:
            I_avg: 平均入射光强度，默认 1.0
            exposure_constant_C: 曝光常数 C，默认 0.022
            angle_a_deg: 角度参数 a（度），默认 11.7
            exposure_threshold_cd: 曝光阈值 cd，默认 20
            contrast_ctr: 对比度参数 ctr，默认 1（已废弃，使用V参数替代）
            wavelength_nm: 光波长（纳米），默认 405
            exposure_times: 曝光时间列表，默认 [30, 60, 250, 1000, 2000]
            x_min: x范围最小值（微米），默认 -1000
            x_max: x范围最大值（微米），默认 1000
            num_points: 数据点数，默认 2001
            V: 干涉条纹可见度参数，如果提供则优先使用，否则使用contrast_ctr
            
        返回:
            包含强度分布和各时间蚀刻深度的字典
        """
        logger.info("=" * 60)
        logger.info("【理想曝光模型 - 1D计算】")
        logger.info("=" * 60)
        logger.info("🔸 使用理想曝光模型公式（完全按照Python代码逻辑）")
        
        # 优先使用V参数，如果没有提供则使用contrast_ctr
        visibility_param = V if V is not None else contrast_ctr
        param_source = "V (干涉条纹可见度)" if V is not None else "contrast_ctr (对比度参数)"
        
        logger.info(f"🔸 输入参数:")
        logger.info(f"   - I_avg (平均入射光强度) = {I_avg}")
        logger.info(f"   - C (曝光常数) = {exposure_constant_C}")
        logger.info(f"   - a (角度参数) = {angle_a_deg}°")
        logger.info(f"   - cd (曝光阈值) = {exposure_threshold_cd}")
        logger.info(f"   - λ (光波长) = {wavelength_nm} nm")
        logger.info(f"   - {param_source} = {visibility_param}")
        logger.info(f"   - 曝光时间 = {exposure_times}")
        logger.info(f"   - x范围 = [{x_min}, {x_max}] 微米")
        logger.info(f"   - 数据点数 = {num_points}")
        
        # 创建位置数组（按Python代码：X = np.arange(-1000, 1001, 1)）
        X = np.linspace(x_min, x_max, num_points)
        
        # 角度转换为弧度
        a = angle_a_deg * np.pi / 180
        
        # 计算强度分布 I0（修正：使用I_avg、V参数和动态波长）
        # 原公式: I0 = 0.5 * (1 + ctr * cos((4 * π * sin(a) / 405) * X))
        # 修正公式: I0 = I_avg * (1 + V * cos((4 * π * sin(a) / λ) * X))
        I0 = I_avg * (1 + visibility_param * np.cos((4 * np.pi * np.sin(a) / wavelength_nm) * X))
        
        logger.info(f"🔸 强度分布计算完成:")
        logger.info(f"   - I0 范围: [{np.min(I0):.6f}, {np.max(I0):.6f}]")
        logger.info(f"   - I0 平均值: {np.mean(I0):.6f}")
        logger.info(f"   - 空间频率系数: 4π×sin(a)/λ = {(4 * np.pi * np.sin(a) / wavelength_nm):.6f} rad/μm")
        logger.info(f"   - 使用参数: {param_source}")
        
        # 计算各曝光时间的蚀刻深度
        etch_depths_data = []
        
        for time_val in exposure_times:
            logger.info(f"🔸 计算曝光时间 t={time_val} 的蚀刻深度")
            
            # 计算剂量分布 D0 = I0 * time
            D0 = I0 * time_val
            
            # 初始化抗蚀效果 M 和蚀刻深度 H
            M = np.zeros_like(X)
            H = np.zeros_like(X)
            
            # 按Python代码的逻辑计算 M 和 H
            for i in range(len(X)):
                if D0[i] < exposure_threshold_cd:
                    M[i] = 1
                else:
                    M[i] = np.exp(-exposure_constant_C * (D0[i] - exposure_threshold_cd))
                H[i] = 1 - M[i]
            
            # 存储蚀刻深度（作为负值显示，如图片所示）
            etch_depth_negative = -H
            
            etch_depths_data.append({
                'time': time_val,
                'etch_depth': etch_depth_negative.tolist(),
                'M_values': M.tolist(),
                'D0_values': D0.tolist()
            })
            
            logger.info(f"   - 蚀刻深度范围: [{np.min(etch_depth_negative):.6f}, {np.max(etch_depth_negative):.6f}]")
        
        # 返回数据（位置转换为mm以匹配图片显示）
        x_mm = X / 1000.0  # 转换为mm
        
        result = {
            'x': x_mm.tolist(),
            'intensity_distribution': I0.tolist(),
            'etch_depths_data': etch_depths_data,
            'exposure_times': exposure_times,
            'parameters': {
                'C': exposure_constant_C,
                'a_deg': angle_a_deg,
                'cd': exposure_threshold_cd,
                'wavelength_nm': wavelength_nm,
                'visibility_param': visibility_param,
                'param_source': param_source
            },
            'is_ideal_exposure_model': True,
            'sine_type': '1d'
        }
        
        logger.info(f"🔸 理想曝光模型计算完成")
        logger.info(f"   - 位置范围: [{np.min(x_mm):.3f}, {np.max(x_mm):.3f}] mm")
        logger.info(f"   - 共生成 {len(etch_depths_data)} 条蚀刻深度曲线")
        
        return result

def get_model_by_name(model_name):
    """
    根据模型名称返回对应模型实例
    支持：'dill', 'enhanced_dill', 'car'
    """
    if model_name == 'dill':
        return DillModel()
    elif model_name == 'enhanced_dill':
        return EnhancedDillModel(debug_mode=False)
    elif model_name == 'car':
        from .car_model import CARModel
        return CARModel()
    else:
        raise ValueError(f"未知模型类型: {model_name}")