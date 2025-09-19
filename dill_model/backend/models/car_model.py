#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
CAR模型 (化学放大光刻胶)
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # 添加3D绘图支持
from io import BytesIO
import base64
from scipy.ndimage import gaussian_filter
import math
import ast
import re
import warnings
import logging  # 添加logging模块
from typing import Union  # 添加类型注解支持

# 设置日志配置
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 新增：全局字体设置，优先使用常见的无衬线字体
plt.rcParams['font.sans-serif'] = ['Arial', 'DejaVu Sans', 'Liberation Sans', 'SimHei', 'Microsoft YaHei']
plt.rcParams['axes.unicode_minus'] = False  # 解决负号显示为方块的问题

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

class CARModel:
    """
    化学放大型光刻胶(CAR)模型
    
    核心原理：曝光产生光酸，光酸在后烘过程中扩散并催化树脂脱保护反应
    主要参数：
    - 光酸产生效率
    - 光酸扩散长度(EPDL)
    - 催化反应速率
    
    参考文献：
    1. Hinsberg et al., "Chemical amplification mechanism with high resolution chemically 
       amplified electron beam resists", Proc. SPIE, 1994.
    2. Kyung-Hoon Choi et al., "Post exposure bake models for chemically amplified resists",
       J. Vac. Sci. Technol. B, 2007.
    """
    
    def __init__(self):
        pass
    
    def calculate_acid_generation(self, x, I_avg, V, K=None, t_exp=1, acid_gen_efficiency=1, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y: Union[float, int, np.ndarray] = 0, z: Union[float, int, np.ndarray] = 0):
        """
        计算初始光酸分布
        
        参数:
            x: 位置坐标数组
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 曝光时间
            acid_gen_efficiency: 光酸产生效率
            sine_type: 正弦波类型
            Kx: 正弦波的x方向频率
            Ky: 正弦波的y方向频率
            Kz: 正弦波的z方向频率
            phi_expr: 相位表达式
            y: 位置的y坐标（支持标量或数组）
            z: 位置的z坐标（支持标量或数组）
            
        返回:
            初始光酸浓度分布数组
        """
        logger.info("=" * 60)
        logger.info("【CAR模型 - 光酸生成计算】")
        logger.info("=" * 60)
        
        if sine_type == 'multi':
            logger.info("🔸 2D模式光酸生成公式:")
            logger.info("   I(x,y) = I_avg * (1 + V * cos(Kx*x + Ky*y + φ))")
            logger.info("   D(x,y) = I(x,y) * t_exp")
            logger.info("   [Acid](x,y) = η * D(x,y)  (归一化)")
        elif sine_type == '3d':
            logger.info("🔸 3D模式光酸生成公式:")
            logger.info("   I(x,y,z) = I_avg * (1 + V * cos(Kx*x + Ky*y + Kz*z + φ))")
            logger.info("   D(x,y,z) = I(x,y,z) * t_exp")
            logger.info("   [Acid](x,y,z) = η * D(x,y,z)  (归一化)")
        else:
            logger.info("🔸 1D模式光酸生成公式:")
            logger.info("   I(x) = I_avg * (1 + V * cos(K*x))")
            logger.info("   D(x) = I(x) * t_exp")
            logger.info("   [Acid](x) = η * D(x)  (归一化)")
        
        logger.info(f"🔸 输入变量值:")
        logger.info(f"   - I_avg (平均光强) = {I_avg}")
        logger.info(f"   - V (可见度) = {V}")
        logger.info(f"   - t_exp (曝光时间) = {t_exp} s")
        logger.info(f"   - η (光酸产生效率) = {acid_gen_efficiency}")
        if sine_type == 'multi':
            logger.info(f"   - Kx (X方向空间频率) = {Kx}")
            logger.info(f"   - Ky (Y方向空间频率) = {Ky}")
            logger.info(f"   - y (Y坐标) = {y}")
        elif sine_type == '3d':
            logger.info(f"   - Kx (X方向空间频率) = {Kx}")
            logger.info(f"   - Ky (Y方向空间频率) = {Ky}")
            logger.info(f"   - Kz (Z方向空间频率) = {Kz}")
            logger.info(f"   - y (Y坐标) = {y}")
            logger.info(f"   - z (Z坐标) = {z}")
        else:
            logger.info(f"   - K (空间频率) = {K}")
        
        # 修复None乘法运算错误
        if sine_type == 'multi' and Kx is not None and Ky is not None:
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            intensity = I_avg * (1 + V * np.cos(Kx * x + Ky * y + phi))
        elif sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            intensity = I_avg * (1 + V * np.cos(Kx * x + Ky * y + Kz * z + phi))
        else:
            # 确保K不为None
            if K is None:
                K = 2.0
            intensity = I_avg * (1 + V * np.cos(K * x))
        
        # 计算曝光剂量分布
        exposure_dose = intensity * t_exp
        
        # 计算初始光酸生成量 (与曝光剂量和效率成正比)
        initial_acid = acid_gen_efficiency * exposure_dose
        
        # 归一化处理
        initial_acid = initial_acid / np.max(initial_acid)
        
        return initial_acid
    
    def simulate_acid_diffusion(self, initial_acid, diffusion_length):
        """
        模拟光酸扩散过程（使用高斯扩散模型）
        
        参数:
            initial_acid: 初始光酸分布
            diffusion_length: 光酸扩散长度(EPDL)，单位：像素
            
        返回:
            扩散后的光酸分布
        """
        logger.info("=" * 60)
        logger.info("【CAR模型 - 光酸扩散模拟】")
        logger.info("=" * 60)
        logger.info("🔸 扩散模型:")
        logger.info("   使用高斯滤波器模拟后烘阶段的热扩散过程")
        logger.info("   [Acid]_diffused = GaussianFilter([Acid]_initial, σ=EPDL)")
        logger.info(f"🔸 扩散参数:")
        logger.info(f"   - EPDL (光酸扩散长度) = {diffusion_length} 像素")
        logger.info(f"   - 初始光酸分布范围: [{np.min(initial_acid):.4f}, {np.max(initial_acid):.4f}]")
        
        # 使用高斯滤波器模拟扩散
        diffused_acid = gaussian_filter(initial_acid, sigma=diffusion_length)
        
        logger.info(f"   - 扩散后光酸分布范围: [{np.min(diffused_acid):.4f}, {np.max(diffused_acid):.4f}]")
        logger.info(f"   - 扩散效果: 峰值平滑度提升 {diffusion_length:.1f}x")
        
        return diffused_acid
    
    def calculate_deprotection(self, diffused_acid, reaction_rate, amplification):
        """
        计算树脂的脱保护反应
        
        参数:
            diffused_acid: 扩散后的光酸分布
            reaction_rate: 催化反应速率常数
            amplification: 放大因子 (每个酸分子可催化的反应数)
            
        返回:
            脱保护程度分布
        """
        logger.info("=" * 60)
        logger.info("【CAR模型 - 脱保护反应计算】")
        logger.info("=" * 60)
        logger.info("🔸 脱保护反应公式:")
        logger.info("   脱保护程度 = 1 - exp(-k * A * [Acid]_diffused)")
        logger.info("   其中: k=反应速率常数, A=放大因子")
        logger.info(f"🔸 反应参数:")
        logger.info(f"   - k (反应速率常数) = {reaction_rate}")
        logger.info(f"   - A (放大因子) = {amplification}")
        logger.info(f"   - 扩散光酸浓度范围: [{np.min(diffused_acid):.4f}, {np.max(diffused_acid):.4f}]")
        
        # 计算催化反应的量，使用饱和模型
        reaction_term = reaction_rate * amplification * diffused_acid
        deprotection = 1 - np.exp(-reaction_term)
        
        logger.info(f"🔸 计算结果:")
        logger.info(f"   - 反应项 k*A*[Acid] 范围: [{np.min(reaction_term):.4f}, {np.max(reaction_term):.4f}]")
        logger.info(f"   - 脱保护程度范围: [{np.min(deprotection):.4f}, {np.max(deprotection):.4f}]")
        logger.info(f"   - 最大脱保护率: {np.max(deprotection)*100:.1f}%")
        
        return deprotection
    
    def calculate_dissolution(self, deprotection, contrast):
        """
        计算显影后的剩余光刻胶厚度
        
        参数:
            deprotection: 脱保护程度分布
            contrast: 对比度参数
            
        返回:
            显影后的光刻胶厚度分布（归一化）
        """
        logger.info("=" * 60)
        logger.info("【CAR模型 - 显影过程计算】")
        logger.info("=" * 60)
        logger.info("🔸 显影公式:")
        logger.info("   剩余厚度 = 1 - (脱保护程度)^γ")
        logger.info("   其中: γ=对比度参数，控制显影的非线性特性")
        logger.info(f"🔸 显影参数:")
        logger.info(f"   - γ (对比度参数) = {contrast}")
        logger.info(f"   - 脱保护程度范围: [{np.min(deprotection):.4f}, {np.max(deprotection):.4f}]")
        
        # 使用非线性函数模拟显影过程的对比度
        thickness = 1 - np.power(deprotection, contrast)
        
        logger.info(f"🔸 显影结果:")
        logger.info(f"   - 剩余厚度范围: [{np.min(thickness):.4f}, {np.max(thickness):.4f}]")
        logger.info(f"   - 最大溶解率: {(1-np.min(thickness))*100:.1f}%")
        logger.info(f"   - 厚度对比度: {(np.max(thickness)-np.min(thickness)):.4f}")
        
        return thickness
    
    def calculate_exposure_dose(self, x, I_avg, V, K, t_exp, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y=0, z=0):
        # 修复None乘法运算错误
        if sine_type == 'multi' and Kx is not None and Ky is not None:
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            intensity = I_avg * (1 + V * np.cos(Kx * x + Ky * y + phi))
        elif sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            intensity = I_avg * (1 + V * np.cos(Kx * x + Ky * y + Kz * z + phi))
        else:
            # 确保K不为None
            if K is None:
                K = 2.0
            intensity = I_avg * (1 + V * np.cos(K * x))
        exposure_dose = intensity * t_exp
        return exposure_dose
    
    def calculate_car_distribution(self, x, I_avg, V, K, t_exp, acid_gen_efficiency, diffusion_length, reaction_rate, amplification, contrast):
        """
        计算CAR模型的1D空间分布数据，用于比较功能
        
        参数:
            x: 位置坐标数组（列表或numpy数组）
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 曝光时间
            acid_gen_efficiency: 光酸产生效率
            diffusion_length: 光酸扩散长度
            reaction_rate: 催化反应速率常数
            amplification: 放大因子
            contrast: 对比度参数
            
        返回:
            包含exposure_dose和thickness数组的字典
        """
        # 确保x是numpy数组
        x_np = np.array(x) if not isinstance(x, np.ndarray) else x
        
        # 计算曝光剂量分布
        exposure_dose = self.calculate_exposure_dose(x_np, I_avg, V, K, t_exp)
        
        # 计算初始光酸生成
        initial_acid = self.calculate_acid_generation(x_np, I_avg, V, K, t_exp, acid_gen_efficiency)
        
        # 模拟光酸扩散
        diffused_acid = self.simulate_acid_diffusion(initial_acid, diffusion_length)
        
        # 计算脱保护反应
        deprotection = self.calculate_deprotection(diffused_acid, reaction_rate, amplification)
        
        # 计算光刻胶厚度分布
        thickness = self.calculate_dissolution(deprotection, contrast)
        
        # 计算额外信息
        additionalInfo = {
            'chemical_amplification_factor': reaction_rate * amplification,
            'max_acid_concentration': float(np.max(initial_acid)),
            'min_acid_concentration': float(np.min(initial_acid)),
            'acid_concentration_range': float(np.max(initial_acid) - np.min(initial_acid)),
            'max_diffused_acid': float(np.max(diffused_acid)),
            'min_diffused_acid': float(np.min(diffused_acid)),
            'diffused_acid_range': float(np.max(diffused_acid) - np.min(diffused_acid)),
            'max_deprotection': float(np.max(deprotection)),
            'min_deprotection': float(np.min(deprotection)),
            'deprotection_range': float(np.max(deprotection) - np.min(deprotection)),
            'max_thickness': float(np.max(thickness)),
            'min_thickness': float(np.min(thickness)),
            'thickness_range': float(np.max(thickness) - np.min(thickness)),
            'acid_generation_efficiency': acid_gen_efficiency,
            'diffusion_length': diffusion_length,
            'reaction_rate': reaction_rate,
            'amplification_factor': amplification,
            'contrast_parameter': contrast,
            'average_acid_concentration': float(np.mean(initial_acid)),
            'acid_concentration_std': float(np.std(initial_acid)),
            'average_diffused_acid': float(np.mean(diffused_acid)),
            'diffused_acid_std': float(np.std(diffused_acid)),
            'average_deprotection': float(np.mean(deprotection)),
            'deprotection_std': float(np.std(deprotection)),
            'average_thickness': float(np.mean(thickness)),
            'thickness_std': float(np.std(thickness)),
            'effective_dose_range': float(np.max(exposure_dose)),
            'diffusion_effectiveness': float(np.std(diffused_acid) / np.std(initial_acid)) if np.std(initial_acid) > 0 else 1.0,
            'deprotection_efficiency': float(np.mean(deprotection) / np.mean(diffused_acid)) if np.mean(diffused_acid) > 0 else 0.0,
            'dissolution_contrast': float(np.std(thickness) / np.mean(thickness)) if np.mean(thickness) > 0 else 0.0
        }
        
        return {
            'exposure_dose': exposure_dose,
            'thickness': thickness,
            'additionalInfo': additionalInfo
        }
    
    def generate_data(self, I_avg, V, K, t_exp, acid_gen_efficiency, diffusion_length, reaction_rate, amplification, contrast, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y_range=None, z_range=None, enable_4d_animation=False, t_start=0, t_end=5, time_steps=20, custom_intensity_data=None):
        """
        生成模型数据用于交互式图表
        
        参数:
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 曝光时间
            acid_gen_efficiency: 光酸产生效率
            diffusion_length: 光酸扩散长度
            reaction_rate: 催化反应速率常数
            amplification: 放大因子
            contrast: 对比度参数
            sine_type: 正弦波类型
            Kx: 正弦波的x方向频率
            Ky: 正弦波的y方向频率
            Kz: 正弦波的z方向频率
            phi_expr: 相位表达式
            y_range: y坐标范围
            z_range: z坐标范围
            
        返回:
            包含x坐标和各阶段y值的数据字典
        """
        logger.info("=" * 60)
        logger.info("【CAR模型 - 完整流程数据生成】")
        logger.info("=" * 60)
        
        logger.info(f"🔸 计算模式: {sine_type.upper()}")
        logger.info(f"🔸 CAR模型完整流程:")
        logger.info("   1. 光酸生成: [Acid] = η * D(x)")
        logger.info("   2. 光酸扩散: [Acid]_diff = GaussianFilter([Acid], σ)")
        logger.info("   3. 脱保护反应: Deprotection = 1 - exp(-k*A*[Acid]_diff)")
        logger.info("   4. 显影过程: Thickness = 1 - (Deprotection)^γ")
        
        logger.info(f"🔸 全局参数:")
        logger.info(f"   - I_avg (平均光强) = {I_avg}")
        logger.info(f"   - V (可见度) = {V}")
        logger.info(f"   - t_exp (曝光时间) = {t_exp} s")
        logger.info(f"   - η (光酸产生效率) = {acid_gen_efficiency}")
        logger.info(f"   - σ (扩散长度) = {diffusion_length}")
        logger.info(f"   - k (反应速率) = {reaction_rate}")
        logger.info(f"   - A (放大因子) = {amplification}")
        logger.info(f"   - γ (对比度) = {contrast}")
        
        if sine_type == '1d':
            logger.info(f"   - K (空间频率) = {K}")
        elif sine_type == 'multi':
            logger.info(f"   - Kx (X方向空间频率) = {Kx}")
            logger.info(f"   - Ky (Y方向空间频率) = {Ky}")
            if y_range is not None:
                logger.info(f"   - y_range = [{min(y_range):.2f}, {max(y_range):.2f}] (共{len(y_range)}点)")
        elif sine_type == '3d':
            logger.info(f"   - Kx (X方向空间频率) = {Kx}")
            logger.info(f"   - Ky (Y方向空间频率) = {Ky}")
            logger.info(f"   - Kz (Z方向空间频率) = {Kz}")
        # 创建坐标
        x = np.linspace(0, 10, 1000).tolist()  # 0到10微米，1000个点
        x_np = np.array(x)
        
        # 处理三维正弦波
        if sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            # 使用与厚胶模型一致的参数和处理方法
            x_points = 50  # x轴点数
            y_points = 50  # y轴点数
            
            # 如果范围参数存在，则使用指定范围
            x_min, x_max = 0, 10
            y_min = float(0 if y_range is None else y_range[0])
            y_max = float(10 if y_range is None else y_range[-1])
            
            # 创建网格坐标
            x_coords = np.linspace(x_min, x_max, x_points)
            y_coords = np.linspace(y_min, y_max, y_points) if y_range is None else np.array(y_range)
            
            # 创建网格点 (用于2D表面)
            X, Y = np.meshgrid(x_coords, y_coords)
            
            # 检查是否启用4D动画
            if enable_4d_animation:
                logger.info(f"🔸 4D动画参数:")
                logger.info(f"   - 时间范围: {t_start}s ~ {t_end}s")
                logger.info(f"   - 时间步数: {time_steps}")
                
                # 生成时间序列数据
                time_array = np.linspace(t_start, t_end, time_steps)
                
                # 存储每个时间步的数据
                animation_data = {
                    'x_coords': x_coords.tolist(),
                    'y_coords': y_coords.tolist(),
                    'time_array': time_array.tolist(),
                    'time_steps': time_steps,
                    'initial_acid_frames': [],
                    'diffused_acid_frames': [],
                    'deprotection_frames': [],
                    'thickness_frames': [],
                    'enable_4d_animation': True,
                    'sine_type': '3d',
                    'is_3d': True
                }
                
                for t_idx, t in enumerate(time_array):
                    # 计算当前时间的相位
                    phi_t = parse_phi_expr(phi_expr, t) if phi_expr is not None else 0.0
                    
                    # 1. 增大频率系数使波纹更加明显
                    Kx_scaled = Kx * 2.0
                    Ky_scaled = Ky * 2.0
                    
                    # 2. 增加振幅，确保波动很明显
                    amplitude = 0.8 if V < 0.2 else V
                    
                    # 3. 生成当前时间的正弦波形状
                    modulation_t = np.cos(Kx_scaled * X + Ky_scaled * Y + phi_t)
                    
                    # 4. 计算各阶段数据
                    # 曝光剂量与光强成正比
                    base_exposure = I_avg * t_exp
                    variation = amplitude * base_exposure * 0.5
                    exposure_dose_t = base_exposure + variation * modulation_t
                    
                    # 初始光酸生成与曝光剂量成正比
                    acid_base = acid_gen_efficiency * base_exposure
                    acid_variation = acid_gen_efficiency * variation
                    initial_acid_t = acid_base + acid_variation * modulation_t
                    initial_acid_t = initial_acid_t / np.max(initial_acid_t)  # 归一化
                    
                    # 模拟光酸扩散 - 使用高斯滤波
                    diffused_acid_t = gaussian_filter(initial_acid_t, sigma=diffusion_length)
                    
                    # 计算脱保护反应
                    deprotection_t = 1 - np.exp(-reaction_rate * amplification * diffused_acid_t)
                    
                    # 计算光刻胶厚度分布
                    thickness_t = 1 - np.power(deprotection_t, contrast)
                    
                    # 确保数组维度正确
                    if exposure_dose_t.shape != (y_points, x_points):
                        exposure_dose_t = exposure_dose_t.T
                        initial_acid_t = initial_acid_t.T
                        diffused_acid_t = diffused_acid_t.T
                        deprotection_t = deprotection_t.T
                        thickness_t = thickness_t.T
                    
                    # 存储当前帧数据
                    animation_data['initial_acid_frames'].append(initial_acid_t.tolist())
                    animation_data['diffused_acid_frames'].append(diffused_acid_t.tolist())
                    animation_data['deprotection_frames'].append(deprotection_t.tolist())
                    animation_data['thickness_frames'].append(thickness_t.tolist())
                    
                    logger.info(f"   - 时间步 {t_idx+1}/{time_steps} (t={t:.2f}s) 计算完成")
                
                # 计算4D动画的额外信息（基于最后一帧）
                last_frame_initial_acid = np.array(animation_data['initial_acid_frames'][-1])
                last_frame_diffused_acid = np.array(animation_data['diffused_acid_frames'][-1])
                last_frame_deprotection = np.array(animation_data['deprotection_frames'][-1])
                last_frame_thickness = np.array(animation_data['thickness_frames'][-1])
                
                additionalInfo = {
                    'chemical_amplification_factor': reaction_rate * amplification,
                    'max_acid_concentration': float(np.max(last_frame_initial_acid)),
                    'min_acid_concentration': float(np.min(last_frame_initial_acid)),
                    'acid_concentration_range': float(np.max(last_frame_initial_acid) - np.min(last_frame_initial_acid)),
                    'max_diffused_acid': float(np.max(last_frame_diffused_acid)),
                    'min_diffused_acid': float(np.min(last_frame_diffused_acid)),
                    'diffused_acid_range': float(np.max(last_frame_diffused_acid) - np.min(last_frame_diffused_acid)),
                    'max_deprotection': float(np.max(last_frame_deprotection)),
                    'min_deprotection': float(np.min(last_frame_deprotection)),
                    'deprotection_range': float(np.max(last_frame_deprotection) - np.min(last_frame_deprotection)),
                    'max_thickness': float(np.max(last_frame_thickness)),
                    'min_thickness': float(np.min(last_frame_thickness)),
                    'thickness_range': float(np.max(last_frame_thickness) - np.min(last_frame_thickness)),
                    'acid_generation_efficiency': acid_gen_efficiency,
                    'diffusion_length': diffusion_length,
                    'reaction_rate': reaction_rate,
                    'amplification_factor': amplification,
                    'contrast_parameter': contrast,
                    'average_acid_concentration': float(np.mean(last_frame_initial_acid)),
                    'acid_concentration_std': float(np.std(last_frame_initial_acid)),
                    'average_diffused_acid': float(np.mean(last_frame_diffused_acid)),
                    'diffused_acid_std': float(np.std(last_frame_diffused_acid)),
                    'average_deprotection': float(np.mean(last_frame_deprotection)),
                    'deprotection_std': float(np.std(last_frame_deprotection)),
                    'average_thickness': float(np.mean(last_frame_thickness)),
                    'thickness_std': float(np.std(last_frame_thickness)),
                    'effective_dose_range': float(np.max(last_frame_initial_acid) * t_exp * I_avg),
                    'diffusion_effectiveness': float(np.std(last_frame_diffused_acid) / np.std(last_frame_initial_acid)) if np.std(last_frame_initial_acid) > 0 else 1.0,
                    'deprotection_efficiency': float(np.mean(last_frame_deprotection) / np.mean(last_frame_diffused_acid)) if np.mean(last_frame_diffused_acid) > 0 else 0.0,
                    'dissolution_contrast': float(np.std(last_frame_thickness) / np.mean(last_frame_thickness)) if np.mean(last_frame_thickness) > 0 else 0.0,
                    'spatial_dimensions': '4D (3D + Time)',
                    'grid_size': f"{x_points} x {y_points}",
                    'time_range': f"{t_start}s - {t_end}s",
                    'time_steps': time_steps,
                    'phase_expression': phi_expr if phi_expr else '0',
                    'spatial_frequencies': f"Kx={Kx}, Ky={Ky}, Kz={Kz}"
                }
                
                animation_data['additionalInfo'] = additionalInfo
                
                logger.info(f"🔸 4D动画数据生成完成，共{time_steps}帧")
                return animation_data
            
            else:
                # 原有的静态3D数据生成
                # 计算相位
                phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                
                # 1. 增大频率系数使波纹更加明显
                Kx_scaled = Kx * 2.0
                Ky_scaled = Ky * 2.0
                
                # 2. 增加振幅，确保波动很明显
                amplitude = 0.8 if V < 0.2 else V
                
                # 3. 生成真正的正弦波形状
                modulation = np.cos(Kx_scaled * X + Ky_scaled * Y + phi)  # 纯正弦波
                
                # 4. 计算各阶段数据
                # 曝光剂量与光强成正比
                base_exposure = I_avg * t_exp
                variation = amplitude * base_exposure * 0.5
                exposure_dose = base_exposure + variation * modulation
                
                # 初始光酸生成与曝光剂量成正比
                acid_base = acid_gen_efficiency * base_exposure
                acid_variation = acid_gen_efficiency * variation
                initial_acid = acid_base + acid_variation * modulation
                initial_acid = initial_acid / np.max(initial_acid)  # 归一化
                
                # 模拟光酸扩散 - 使用高斯滤波
                diffused_acid = gaussian_filter(initial_acid, sigma=diffusion_length)
                
                # 计算脱保护反应
                deprotection = 1 - np.exp(-reaction_rate * amplification * diffused_acid)
                
                # 计算光刻胶厚度分布
                thickness = 1 - np.power(deprotection, contrast)
                
                # 确保数组维度正确
                if exposure_dose.shape != (y_points, x_points):
                    exposure_dose = exposure_dose.T
                    initial_acid = initial_acid.T
                    diffused_acid = diffused_acid.T
                    deprotection = deprotection.T
                    thickness = thickness.T
                
                # 计算额外信息（3D情况）
                additionalInfo = {
                    'chemical_amplification_factor': reaction_rate * amplification,
                    'max_acid_concentration': float(np.max(initial_acid)),
                    'min_acid_concentration': float(np.min(initial_acid)),
                    'acid_concentration_range': float(np.max(initial_acid) - np.min(initial_acid)),
                    'max_diffused_acid': float(np.max(diffused_acid)),
                    'min_diffused_acid': float(np.min(diffused_acid)),
                    'diffused_acid_range': float(np.max(diffused_acid) - np.min(diffused_acid)),
                    'max_deprotection': float(np.max(deprotection)),
                    'min_deprotection': float(np.min(deprotection)),
                    'deprotection_range': float(np.max(deprotection) - np.min(deprotection)),
                    'max_thickness': float(np.max(thickness)),
                    'min_thickness': float(np.min(thickness)),
                    'thickness_range': float(np.max(thickness) - np.min(thickness)),
                    'acid_generation_efficiency': acid_gen_efficiency,
                    'diffusion_length': diffusion_length,
                    'reaction_rate': reaction_rate,
                    'amplification_factor': amplification,
                    'contrast_parameter': contrast,
                    'average_acid_concentration': float(np.mean(initial_acid)),
                    'acid_concentration_std': float(np.std(initial_acid)),
                    'average_diffused_acid': float(np.mean(diffused_acid)),
                    'diffused_acid_std': float(np.std(diffused_acid)),
                    'average_deprotection': float(np.mean(deprotection)),
                    'deprotection_std': float(np.std(deprotection)),
                    'average_thickness': float(np.mean(thickness)),
                    'thickness_std': float(np.std(thickness)),
                    'effective_dose_range': float(np.max(initial_acid) * t_exp * I_avg),
                    'diffusion_effectiveness': float(np.std(diffused_acid) / np.std(initial_acid)) if np.std(initial_acid) > 0 else 1.0,
                    'deprotection_efficiency': float(np.mean(deprotection) / np.mean(diffused_acid)) if np.mean(diffused_acid) > 0 else 0.0,
                    'dissolution_contrast': float(np.std(thickness) / np.mean(thickness)) if np.mean(thickness) > 0 else 0.0,
                    'spatial_dimensions': '3D',
                    'grid_size': f"{len(x_coords)} x {len(y_coords)}",
                    'phase_expression': phi_expr if phi_expr else '0',
                    'spatial_frequencies': f"Kx={Kx}, Ky={Ky}, Kz={Kz}"
                }
                
                # 返回3D数据
                return {
                    'x_coords': x_coords.tolist(),
                    'y_coords': y_coords.tolist(),
                    'exposure_dose': exposure_dose.tolist(),
                    'initial_acid': initial_acid.tolist(),
                    'diffused_acid': diffused_acid.tolist(),
                    'deprotection': deprotection.tolist(),
                    'thickness': thickness.tolist(),
                    'sine_type': '3d',
                    'is_3d': True,
                    'additionalInfo': additionalInfo
                }
        # 二维正弦波
        elif sine_type == 'multi' and Kx is not None and Ky is not None:
            if y_range is not None and len(y_range) > 1:
                y_axis_points = np.array(y_range)
                
                # 🔧 检查是否使用自定义光强数据（与Dill模型保持一致）
                if custom_intensity_data is not None and 'x' in custom_intensity_data and 'intensity' in custom_intensity_data:
                    logger.info(f"🔸 CAR模型2D模式使用自定义光强分布数据")
                    logger.warning(f"⚠️  注意：CAR模型2D模式的自定义光强数据仅应用于X方向，Y方向使用标准余弦分布")
                    
                    # 对于CAR模型2D模式，使用自定义数据处理X方向光强分布
                    custom_x = np.array(custom_intensity_data['x'])
                    custom_intensity = np.array(custom_intensity_data['intensity'])
                    
                    # 🔧 执行单位转换（复用Dill模型的逻辑）
                    original_unit = custom_intensity_data.get('original_unit', 'mm')
                    unit_scale = custom_intensity_data.get('unit_scale', 1.0)
                    
                    # 智能单位转换判断（假设CAR模型通常工作在微米级）
                    target_range = 20  # 默认20μm范围，CAR模型通常在亚微米级工作
                    target_is_um = True  # CAR模型通常使用微米单位
                    data_range = custom_x.max() - custom_x.min()
                    
                    logger.info(f"🔸 CAR模型2D模式智能单位转换:")
                    logger.info(f"   - 声明单位: {original_unit}")
                    logger.info(f"   - 数据范围: [{custom_x.min():.6f}, {custom_x.max():.6f}] ({data_range:.6f})")
                    logger.info(f"   - 目标单位: μm (CAR模型默认)")
                    
                    # 执行单位转换到微米
                    if original_unit == 'mm':
                        custom_x = custom_x * 1000.0
                        logger.info(f"🔸 单位转换: mm → μm，坐标×1000")
                    elif original_unit == 'nm':
                        custom_x = custom_x / 1000.0  # nm → μm 需要除1000
                        logger.info(f"🔸 单位转换: nm → μm，坐标÷1000")
                    elif original_unit in ['μm', 'um', 'micron']:
                        logger.info(f"🔸 单位匹配: μm → μm，无需转换")
                    
                    # 计算X方向的自定义光强分布（插值到x_np）
                    outside_range_mode = custom_intensity_data.get('outside_range_mode', 'zero')
                    custom_intensity_value = custom_intensity_data.get('custom_intensity_value', 0)
                    
                    logger.info(f"🔸 CAR模型X方向自定义光强插值模式: {outside_range_mode}")
                    
                    # 执行插值处理
                    if outside_range_mode == 'edge':
                        intensity_x = np.interp(x_np, custom_x, custom_intensity)
                    elif outside_range_mode == 'custom':
                        intensity_x = np.full_like(x_np, custom_intensity_value, dtype=float)
                        mask = (x_np >= custom_x.min()) & (x_np <= custom_x.max())
                        intensity_x[mask] = np.interp(x_np[mask], custom_x, custom_intensity)
                    else:  # 'zero' mode (default)
                        intensity_x = np.zeros_like(x_np, dtype=float)
                        mask = (x_np >= custom_x.min()) & (x_np <= custom_x.max())
                        if np.any(mask):
                            intensity_x[mask] = np.interp(x_np[mask], custom_x, custom_intensity)
                    
                    logger.info(f"   - CAR模型X方向光强范围: [{intensity_x.min():.6f}, {intensity_x.max():.6f}]")
                    
                    # 创建二维网格
                    X_grid, Y_grid = np.meshgrid(x_np, y_axis_points)
                    
                    # 计算混合光强分布：自定义X方向 + 标准Y方向调制
                    phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                    
                    intensity_2d = np.zeros_like(X_grid)
                    for i, y_val in enumerate(y_axis_points):
                        y_modulation = (1 + V * np.cos(Ky * y_val + phi))
                        intensity_2d[i, :] = intensity_x * y_modulation
                    
                    # 计算初始光酸浓度分布（应用I_avg系数）
                    initial_acid_2d = acid_gen_efficiency * I_avg * intensity_2d * t_exp
                    
                    logger.info(f"🔸 CAR模型混合光强模式:")
                    logger.info(f"   - 混合光强范围: [{intensity_2d.min():.6f}, {intensity_2d.max():.6f}]")
                    logger.info(f"   - 初始光酸浓度范围: [{initial_acid_2d.min():.6f}, {initial_acid_2d.max():.6f}]")
                else:
                    # 使用标准2D余弦分布
                    logger.info(f"🔸 CAR模型2D模式使用标准余弦光强分布")
                    
                    # 创建二维网格
                    X_grid, Y_grid = np.meshgrid(x_np, y_axis_points)
                    
                    # 计算曝光剂量分布
                    phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                    initial_acid_2d = self.calculate_acid_generation(X_grid, I_avg, V, None, t_exp, acid_gen_efficiency, 
                                                              sine_type, Kx, Ky, None, phi_expr, Y_grid)
                                                          
                # 模拟光酸扩散
                diffused_acid_2d = self.simulate_acid_diffusion(initial_acid_2d, diffusion_length)
                
                # 计算脱保护反应
                deprotection_2d = self.calculate_deprotection(diffused_acid_2d, reaction_rate, amplification)
                
                # 计算光刻胶厚度分布
                thickness_2d = self.calculate_dissolution(deprotection_2d, contrast)
                
                # 计算额外信息（2D情况）
                additionalInfo = {
                    'chemical_amplification_factor': reaction_rate * amplification,
                    'max_acid_concentration': float(np.max(initial_acid_2d)),
                    'min_acid_concentration': float(np.min(initial_acid_2d)),
                    'acid_concentration_range': float(np.max(initial_acid_2d) - np.min(initial_acid_2d)),
                    'max_diffused_acid': float(np.max(diffused_acid_2d)),
                    'min_diffused_acid': float(np.min(diffused_acid_2d)),
                    'diffused_acid_range': float(np.max(diffused_acid_2d) - np.min(diffused_acid_2d)),
                    'max_deprotection': float(np.max(deprotection_2d)),
                    'min_deprotection': float(np.min(deprotection_2d)),
                    'deprotection_range': float(np.max(deprotection_2d) - np.min(deprotection_2d)),
                    'max_thickness': float(np.max(thickness_2d)),
                    'min_thickness': float(np.min(thickness_2d)),
                    'thickness_range': float(np.max(thickness_2d) - np.min(thickness_2d)),
                    'acid_generation_efficiency': acid_gen_efficiency,
                    'diffusion_length': diffusion_length,
                    'reaction_rate': reaction_rate,
                    'amplification_factor': amplification,
                    'contrast_parameter': contrast,
                    'average_acid_concentration': float(np.mean(initial_acid_2d)),
                    'acid_concentration_std': float(np.std(initial_acid_2d)),
                    'average_diffused_acid': float(np.mean(diffused_acid_2d)),
                    'diffused_acid_std': float(np.std(diffused_acid_2d)),
                    'average_deprotection': float(np.mean(deprotection_2d)),
                    'deprotection_std': float(np.std(deprotection_2d)),
                    'average_thickness': float(np.mean(thickness_2d)),
                    'thickness_std': float(np.std(thickness_2d)),
                    'effective_dose_range': float(np.max(initial_acid_2d) * t_exp * I_avg),
                    'diffusion_effectiveness': float(np.std(diffused_acid_2d) / np.std(initial_acid_2d)) if np.std(initial_acid_2d) > 0 else 1.0,
                    'deprotection_efficiency': float(np.mean(deprotection_2d) / np.mean(diffused_acid_2d)) if np.mean(diffused_acid_2d) > 0 else 0.0,
                    'dissolution_contrast': float(np.std(thickness_2d) / np.mean(thickness_2d)) if np.mean(thickness_2d) > 0 else 0.0,
                    'spatial_dimensions': '2D',
                    'grid_size': f"{len(x_np)} x {len(y_axis_points)}"
                }
                
                # 返回热图所需的网格数据结构
                return {
                    'x_coords': x_np.tolist(),
                    'y_coords': y_axis_points.tolist(),
                    'z_exposure_dose': initial_acid_2d.tolist(),  # 使用与Dill模型一致的键名
                    'z_thickness': thickness_2d.tolist(),         # 使用与Dill模型一致的键名
                    'z_initial_acid': initial_acid_2d.tolist(),   # 为前端提供完整的2D热力图数据
                    'z_diffused_acid': diffused_acid_2d.tolist(), # 为前端提供完整的2D热力图数据
                    'z_deprotection': deprotection_2d.tolist(),   # 为前端提供完整的2D热力图数据
                    'initial_acid': initial_acid_2d.flatten().tolist(),  # 保留这些，确保与其他功能兼容
                    'diffused_acid': diffused_acid_2d.flatten().tolist(),
                    'deprotection': deprotection_2d.flatten().tolist(),
                    'thickness': thickness_2d.flatten().tolist(),
                    'is_2d': True,
                    'additionalInfo': additionalInfo
                }
            else:
                # 如果没有提供有效的y_range，回退到一维模式
                k_for_1d_fallback = K if K is not None else 2.0
                initial_acid = self.calculate_acid_generation(x_np, I_avg, V, k_for_1d_fallback, t_exp, acid_gen_efficiency)
                diffused_acid = self.simulate_acid_diffusion(initial_acid, diffusion_length)
                deprotection = self.calculate_deprotection(diffused_acid, reaction_rate, amplification)
                thickness = self.calculate_dissolution(deprotection, contrast)
                
                # 计算额外信息
                additionalInfo = {
                    'chemical_amplification_factor': reaction_rate * amplification,
                    'max_acid_concentration': float(np.max(initial_acid)),
                    'min_acid_concentration': float(np.min(initial_acid)),
                    'acid_concentration_range': float(np.max(initial_acid) - np.min(initial_acid)),
                    'max_diffused_acid': float(np.max(diffused_acid)),
                    'min_diffused_acid': float(np.min(diffused_acid)),
                    'diffused_acid_range': float(np.max(diffused_acid) - np.min(diffused_acid)),
                    'max_deprotection': float(np.max(deprotection)),
                    'min_deprotection': float(np.min(deprotection)),
                    'deprotection_range': float(np.max(deprotection) - np.min(deprotection)),
                    'max_thickness': float(np.max(thickness)),
                    'min_thickness': float(np.min(thickness)),
                    'thickness_range': float(np.max(thickness) - np.min(thickness)),
                    'acid_generation_efficiency': acid_gen_efficiency,
                    'diffusion_length': diffusion_length,
                    'reaction_rate': reaction_rate,
                    'amplification_factor': amplification,
                    'contrast_parameter': contrast,
                    'average_acid_concentration': float(np.mean(initial_acid)),
                    'acid_concentration_std': float(np.std(initial_acid)),
                    'average_diffused_acid': float(np.mean(diffused_acid)),
                    'diffused_acid_std': float(np.std(diffused_acid)),
                    'average_deprotection': float(np.mean(deprotection)),
                    'deprotection_std': float(np.std(deprotection)),
                    'average_thickness': float(np.mean(thickness)),
                    'thickness_std': float(np.std(thickness)),
                    'effective_dose_range': float(np.max(initial_acid) * t_exp * I_avg),
                    'diffusion_effectiveness': float(np.std(diffused_acid) / np.std(initial_acid)) if np.std(initial_acid) > 0 else 1.0,
                    'deprotection_efficiency': float(np.mean(deprotection) / np.mean(diffused_acid)) if np.mean(diffused_acid) > 0 else 0.0,
                    'dissolution_contrast': float(np.std(thickness) / np.mean(thickness)) if np.mean(thickness) > 0 else 0.0
                }
                
                return {
                    'x': x,
                    'initial_acid': initial_acid.tolist(),
                    'exposure_dose': initial_acid.tolist(),
                    'diffused_acid': diffused_acid.tolist(),
                    'deprotection': deprotection.tolist(),
                    'thickness': thickness.tolist(),
                    'is_2d': False,
                    'additionalInfo': additionalInfo
                }
        # 一维正弦波
        else:
            # 确保 K 不为 None，避免计算错误
            if K is None:
                K = 2.0  # 设置一个默认值
            initial_acid = self.calculate_acid_generation(x_np, I_avg, V, K, t_exp, acid_gen_efficiency)
            
            # 模拟光酸扩散
            diffused_acid = self.simulate_acid_diffusion(initial_acid, diffusion_length)
            
            # 计算脱保护反应
            deprotection = self.calculate_deprotection(diffused_acid, reaction_rate, amplification)
            
            # 计算光刻胶厚度分布
            thickness = self.calculate_dissolution(deprotection, contrast)
            
            # 检查有效性
            if (not initial_acid.any() or not diffused_acid.any() or not deprotection.any() or not thickness.any() or
                np.isnan(initial_acid).all() or np.isnan(diffused_acid).all() or np.isnan(deprotection).all() or np.isnan(thickness).all()):
                raise ValueError('CAR模型计算结果无效，可能参数设置不合理或数值溢出。')
            
            # 计算额外信息
            additionalInfo = {
                'chemical_amplification_factor': reaction_rate * amplification,
                'max_acid_concentration': float(np.max(initial_acid)),
                'min_acid_concentration': float(np.min(initial_acid)),
                'acid_concentration_range': float(np.max(initial_acid) - np.min(initial_acid)),
                'max_diffused_acid': float(np.max(diffused_acid)),
                'min_diffused_acid': float(np.min(diffused_acid)),
                'diffused_acid_range': float(np.max(diffused_acid) - np.min(diffused_acid)),
                'max_deprotection': float(np.max(deprotection)),
                'min_deprotection': float(np.min(deprotection)),
                'deprotection_range': float(np.max(deprotection) - np.min(deprotection)),
                'max_thickness': float(np.max(thickness)),
                'min_thickness': float(np.min(thickness)),
                'thickness_range': float(np.max(thickness) - np.min(thickness)),
                'acid_generation_efficiency': acid_gen_efficiency,
                'diffusion_length': diffusion_length,
                'reaction_rate': reaction_rate,
                'amplification_factor': amplification,
                'contrast_parameter': contrast,
                'average_acid_concentration': float(np.mean(initial_acid)),
                'acid_concentration_std': float(np.std(initial_acid)),
                'average_diffused_acid': float(np.mean(diffused_acid)),
                'diffused_acid_std': float(np.std(diffused_acid)),
                'average_deprotection': float(np.mean(deprotection)),
                'deprotection_std': float(np.std(deprotection)),
                'average_thickness': float(np.mean(thickness)),
                'thickness_std': float(np.std(thickness)),
                'effective_dose_range': float(np.max(initial_acid) * t_exp * I_avg),
                'diffusion_effectiveness': float(np.std(diffused_acid) / np.std(initial_acid)) if np.std(initial_acid) > 0 else 1.0,
                'deprotection_efficiency': float(np.mean(deprotection) / np.mean(diffused_acid)) if np.mean(diffused_acid) > 0 else 0.0,
                'dissolution_contrast': float(np.std(thickness) / np.mean(thickness)) if np.mean(thickness) > 0 else 0.0
            }
            
            # 返回数据
            return {
                'x': x,
                'initial_acid': initial_acid.tolist(),
                'exposure_dose': initial_acid.tolist(),
                'diffused_acid': diffused_acid.tolist(),
                'deprotection': deprotection.tolist(),
                'thickness': thickness.tolist(),
                'is_2d': False,
                'additionalInfo': additionalInfo
            }
    
    def generate_plots(self, I_avg, V, K, t_exp, acid_gen_efficiency, diffusion_length, reaction_rate, amplification, contrast, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, y_range=None, z_range=None):
        """
        生成模型可视化图像
        
        参数:
            I_avg: 平均入射光强度
            V: 干涉条纹的可见度
            K: 干涉条纹的空间频率
            t_exp: 曝光时间
            acid_gen_efficiency: 光酸产生效率
            diffusion_length: 光酸扩散长度
            reaction_rate: 催化反应速率常数
            amplification: 放大因子
            contrast: 对比度参数
            sine_type: 正弦波类型
            Kx: 正弦波的x方向频率
            Ky: 正弦波的y方向频率
            Kz: 正弦波的z方向频率
            phi_expr: 相位表达式
            y_range: y坐标范围
            z_range: z坐标范围
            
        返回:
            包含多个Base64编码图像的字典
        """
        plt.close('all')
        x = np.linspace(0, 10, 1000)  # 0到10微米，1000个点
        
        # 优先处理各维度情况，确保逻辑清晰
        
        # 情况1: 严格的1D计算和绘图
        if sine_type == '1d':
            if K is None:
                # 如果K未提供，设置一个默认值
                K = 2.0
                print("警告: 1D CAR模型未提供K值，使用默认值K=2.0")
                
            # 1D数据计算
            initial_acid = self.calculate_acid_generation(x, I_avg, V, K, t_exp, acid_gen_efficiency)
            diffused_acid = self.simulate_acid_diffusion(initial_acid, diffusion_length)
            deprotection = self.calculate_deprotection(diffused_acid, reaction_rate, amplification)
            thickness = self.calculate_dissolution(deprotection, contrast)
            
            # 检查有效性
            if (not initial_acid.any() or not diffused_acid.any() or not deprotection.any() or not thickness.any() or
                np.isnan(initial_acid).all() or np.isnan(diffused_acid).all() or np.isnan(deprotection).all() or np.isnan(thickness).all()):
                raise ValueError('CAR模型(1D)计算结果无效，可能参数设置不合理或数值溢出。')
            
            # 绘制1D线图
            plots = {}
            
            # 1. 初始光酸分布图
            fig1 = plt.figure(figsize=(10, 6))
            plt.plot(x, initial_acid, 'g-', linewidth=2)
            plt.title('Initial Acid Distribution (1D)', fontsize=16)
            plt.xlabel('Position (μm)', fontsize=14)
            plt.ylabel('Normalized Acid Concentration', fontsize=14)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            buffer1 = BytesIO()
            fig1.savefig(buffer1, format='png', dpi=100)
            buffer1.seek(0)
            plots['initial_acid_plot'] = base64.b64encode(buffer1.getvalue()).decode()
            plt.close(fig1)
            
            # 2. 扩散后光酸分布图
            fig2 = plt.figure(figsize=(10, 6))
            plt.plot(x, initial_acid, 'g--', linewidth=1.5, label='Initial')
            plt.plot(x, diffused_acid, 'b-', linewidth=2, label='After Diffusion')
            plt.title('Acid Diffusion Comparison (1D)', fontsize=16)
            plt.xlabel('Position (μm)', fontsize=14)
            plt.ylabel('Normalized Acid Concentration', fontsize=14)
            plt.legend()
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            buffer2 = BytesIO()
            fig2.savefig(buffer2, format='png', dpi=100)
            buffer2.seek(0)
            plots['acid_diffusion_plot'] = base64.b64encode(buffer2.getvalue()).decode()
            plt.close(fig2)
            
            # 3. 脱保护程度分布图
            fig3 = plt.figure(figsize=(10, 6))
            plt.plot(x, deprotection, 'r-', linewidth=2)
            plt.title('Deprotection Degree Distribution (1D)', fontsize=16)
            plt.xlabel('Position (μm)', fontsize=14)
            plt.ylabel('Deprotection Degree', fontsize=14)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            buffer3 = BytesIO()
            fig3.savefig(buffer3, format='png', dpi=100)
            buffer3.seek(0)
            plots['deprotection_plot'] = base64.b64encode(buffer3.getvalue()).decode()
            plt.close(fig3)
            
            # 4. 光刻胶厚度分布图
            fig4 = plt.figure(figsize=(10, 6))
            plt.plot(x, thickness, 'm-', linewidth=2)
            plt.title('Photoresist Thickness After Development (1D)', fontsize=16)
            plt.xlabel('Position (μm)', fontsize=14)
            plt.ylabel('Normalized Thickness', fontsize=14)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            buffer4 = BytesIO()
            fig4.savefig(buffer4, format='png', dpi=100)
            buffer4.seek(0)
            plots['thickness_plot'] = base64.b64encode(buffer4.getvalue()).decode()
            plt.close(fig4)
            
            # 确保与前端期望的键名一致
            plots['exposure_plot'] = plots['acid_diffusion_plot']
            
            return plots
            
        # 情况2: 严格的2D计算和绘图
        elif sine_type == 'multi' and Kx is not None and Ky is not None:
            # 确保有有效的y_range
            if y_range is None or len(y_range) <= 1:
                print("警告: 2D CAR模型需要有效的y_range，回退到1D模式")
                # 回退到1D模式
                sine_type = '1d'
                # 递归调用自身，但使用1D模式
                return self.generate_plots(I_avg, V, K if K is not None else 2.0, t_exp, 
                                         acid_gen_efficiency, diffusion_length, reaction_rate, 
                                         amplification, contrast, sine_type='1d')
            
            # 有效的2D计算
            y_axis_points = np.array(y_range)
            X_grid, Y_grid = np.meshgrid(x, y_axis_points)
            
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            initial_acid_2d = self.calculate_acid_generation(X_grid, I_avg, V, None, t_exp, acid_gen_efficiency, 
                                                  sine_type, Kx, Ky, None, phi_expr, Y_grid)
            
            # 模拟光酸扩散
            diffused_acid_2d = self.simulate_acid_diffusion(initial_acid_2d, diffusion_length)
            
            # 计算脱保护反应
            deprotection_2d = self.calculate_deprotection(diffused_acid_2d, reaction_rate, amplification)
            
            # 计算光刻胶厚度分布
            thickness_2d = self.calculate_dissolution(deprotection_2d, contrast)
            
            # 绘制曝光剂量热图
            fig1 = plt.figure(figsize=(8, 6))
            plt.imshow(initial_acid_2d, aspect='auto', origin='lower', 
                      extent=(min(x), max(x), min(y_axis_points), max(y_axis_points)), cmap='viridis')
            plt.colorbar(label='曝光剂量 (mJ/cm²)')
            plt.xlabel('X 位置 (μm)')
            plt.ylabel('Y 位置 (μm)')
            plt.title('曝光剂量分布 (2D)')
            plt.tight_layout()
            buffer1 = BytesIO()
            fig1.savefig(buffer1, format='png', dpi=100)
            buffer1.seek(0)
            exposure_plot = base64.b64encode(buffer1.getvalue()).decode()
            plt.close(fig1)
            
            # 绘制光刻胶厚度热图
            fig2 = plt.figure(figsize=(8, 6))
            plt.imshow(thickness_2d, aspect='auto', origin='lower', 
                      extent=(min(x), max(x), min(y_axis_points), max(y_axis_points)), cmap='plasma')
            plt.colorbar(label='相对厚度')
            plt.xlabel('X 位置 (μm)')
            plt.ylabel('Y 位置 (μm)')
            plt.title('光刻胶厚度分布 (2D)')
            plt.tight_layout()
            buffer2 = BytesIO()
            fig2.savefig(buffer2, format='png', dpi=100)
            buffer2.seek(0)
            thickness_plot = base64.b64encode(buffer2.getvalue()).decode()
            plt.close(fig2)
            
            # 同时提供其他CAR模型需要的图表键
            return {
                'initial_acid_plot': exposure_plot,
                'thickness_plot': thickness_plot,
                'exposure_plot': exposure_plot,
                'acid_diffusion_plot': exposure_plot,
                'deprotection_plot': thickness_plot
            }
            
        # 情况3: 严格的3D计算和绘图
        elif sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            # 使用与generate_data方法一致的参数和处理方法
            x_points = 50  # x轴点数
            y_points = 50  # y轴点数
            
            # 如果范围参数存在，则使用指定范围
            x_min, x_max = 0, 10
            y_min = float(0 if y_range is None else y_range[0])
            y_max = float(10 if y_range is None else y_range[-1])
            
            # 创建网格坐标
            x_coords = np.linspace(x_min, x_max, x_points)
            y_coords = np.linspace(y_min, y_max, y_points) if y_range is None else np.array(y_range)
            
            # 创建网格点 (用于2D表面)
            X, Y = np.meshgrid(x_coords, y_coords)
            
            # 计算相位
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            
            # 1. 增大频率系数使波纹更加明显
            Kx_scaled = Kx * 2.0
            Ky_scaled = Ky * 2.0
            
            # 2. 增加振幅，确保波动很明显
            amplitude = 0.8 if V < 0.2 else V
            
            # 3. 生成真正的正弦波形状
            modulation = np.cos(Kx_scaled * X + Ky_scaled * Y + phi)  # 纯正弦波
            
            # 4. 计算各阶段数据
            # 曝光剂量与光强成正比
            base_exposure = I_avg * t_exp
            variation = amplitude * base_exposure * 0.5
            exposure_dose = base_exposure + variation * modulation
            
            # 初始光酸生成与曝光剂量成正比
            acid_base = acid_gen_efficiency * base_exposure
            acid_variation = acid_gen_efficiency * variation
            initial_acid = acid_base + acid_variation * modulation
            initial_acid = initial_acid / np.max(initial_acid)  # 归一化
            
            # 模拟光酸扩散 - 使用高斯滤波
            diffused_acid = gaussian_filter(initial_acid, sigma=diffusion_length)
            
            # 计算脱保护反应
            deprotection = 1 - np.exp(-reaction_rate * amplification * diffused_acid)
            
            # 计算光刻胶厚度分布
            thickness = 1 - np.power(deprotection, contrast)
            
            # 确保数组维度正确
            if exposure_dose.shape != (y_points, x_points):
                exposure_dose = exposure_dose.T
                initial_acid = initial_acid.T
                diffused_acid = diffused_acid.T
                deprotection = deprotection.T
                thickness = thickness.T
            
            # 存储所有图表的Base64编码
            plots = {}

            # 1. 创建3D表面图 - 初始光酸分布
            fig1 = plt.figure(figsize=(10, 8))
            ax1 = fig1.add_subplot(111, projection='3d')
            surf1 = ax1.plot_surface(X, Y, initial_acid, cmap='viridis', edgecolor='none')  # type: ignore
            ax1.set_title('3D Initial Acid Distribution', fontsize=16)
            ax1.set_xlabel('X Position (μm)', fontsize=14)
            ax1.set_ylabel('Y Position (μm)', fontsize=14)
            ax1.set_zlabel('Initial Acid Concentration', fontsize=14)  # type: ignore
            fig1.colorbar(surf1, ax=ax1, shrink=0.5, aspect=5)
            plt.tight_layout()
            
            buffer1 = BytesIO()
            fig1.savefig(buffer1, format='png', dpi=100)
            buffer1.seek(0)
            plots['initial_acid_plot'] = base64.b64encode(buffer1.getvalue()).decode()
            plt.close(fig1)
            
            # 2. 创建3D表面图 - 扩散后光酸分布
            fig2 = plt.figure(figsize=(10, 8))
            ax2 = fig2.add_subplot(111, projection='3d')
            surf2 = ax2.plot_surface(X, Y, diffused_acid, cmap='viridis', edgecolor='none')  # type: ignore
            ax2.set_title('3D Diffused Acid Distribution', fontsize=16)
            ax2.set_xlabel('X Position (μm)', fontsize=14)
            ax2.set_ylabel('Y Position (μm)', fontsize=14)
            ax2.set_zlabel('Acid Concentration After Diffusion', fontsize=14)  # type: ignore
            fig2.colorbar(surf2, ax=ax2, shrink=0.5, aspect=5)
            plt.tight_layout()
            
            buffer2 = BytesIO()
            fig2.savefig(buffer2, format='png', dpi=100)
            buffer2.seek(0)
            plots['acid_diffusion_plot'] = base64.b64encode(buffer2.getvalue()).decode()
            plt.close(fig2)
            
            # 3. 创建3D表面图 - 脱保护程度分布
            fig3 = plt.figure(figsize=(10, 8))
            ax3 = fig3.add_subplot(111, projection='3d')
            surf3 = ax3.plot_surface(X, Y, deprotection, cmap='YlOrRd', edgecolor='none')  # type: ignore
            ax3.set_title('3D Deprotection Distribution', fontsize=16)
            ax3.set_xlabel('X Position (μm)', fontsize=14)
            ax3.set_ylabel('Y Position (μm)', fontsize=14)
            ax3.set_zlabel('Deprotection Degree', fontsize=14)  # type: ignore
            fig3.colorbar(surf3, ax=ax3, shrink=0.5, aspect=5)
            plt.tight_layout()
            
            buffer3 = BytesIO()
            fig3.savefig(buffer3, format='png', dpi=100)
            buffer3.seek(0)
            plots['deprotection_plot'] = base64.b64encode(buffer3.getvalue()).decode()
            plt.close(fig3)
            
            # 4. 创建3D表面图 - 光刻胶厚度分布
            fig4 = plt.figure(figsize=(10, 8))
            ax4 = fig4.add_subplot(111, projection='3d')
            surf4 = ax4.plot_surface(X, Y, thickness, cmap='plasma', edgecolor='none')  # type: ignore
            ax4.set_title('3D Photoresist Thickness Distribution', fontsize=16)
            ax4.set_xlabel('X Position (μm)', fontsize=14)
            ax4.set_ylabel('Y Position (μm)', fontsize=14)
            ax4.set_zlabel('Relative Thickness', fontsize=14)  # type: ignore
            fig4.colorbar(surf4, ax=ax4, shrink=0.5, aspect=5)
            plt.tight_layout()
            
            buffer4 = BytesIO()
            fig4.savefig(buffer4, format='png', dpi=100)
            buffer4.seek(0)
            plots['thickness_plot'] = base64.b64encode(buffer4.getvalue()).decode()
            plt.close(fig4)
            
            # 曝光剂量与初始光酸相同
            plots['exposure_plot'] = plots['initial_acid_plot']
            
            return plots
        
        # 情况4: 参数不明确，默认回退到1D模式
        else:
            print(f"警告: 未能明确识别模型维度类型 (sine_type={sine_type}), 回退到1D模式")
            # 递归调用自身，但使用1D模式
            return self.generate_plots(I_avg, V, K if K is not None else 2.0, t_exp, 
                                     acid_gen_efficiency, diffusion_length, reaction_rate, 
                                     amplification, contrast, sine_type='1d') 