#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复后的距离测量算法
重新定义测量目标：单个周期内不同高度处的结构宽度
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy.signal import find_peaks

def analyze_single_period_widths(x_coords, thickness):
    """
    分析单个周期内不同高度处的结构宽度
    
    Args:
        x_coords: x坐标数组
        thickness: 厚度(形貌)数组
    
    Returns:
        tuple: (top_width, bottom_width, success)
    """
    
    if len(x_coords) == 0 or len(thickness) == 0:
        return None, None, False
    
    # 找到一个完整周期的数据
    # 假设周期为0.405 μm，找到中心附近的一个周期
    period = 0.405  # μm
    center_idx = len(x_coords) // 2
    
    # 找到中心附近的周期范围
    start_x = x_coords[center_idx] - period/2
    end_x = x_coords[center_idx] + period/2
    
    # 提取该周期内的数据
    period_mask = (x_coords >= start_x) & (x_coords <= end_x)
    period_x = x_coords[period_mask]
    period_thickness = thickness[period_mask]
    
    if len(period_x) < 10:  # 数据点太少
        return None, None, False
    
    # 找到该周期内的最大值和最小值
    max_thickness = np.max(period_thickness)
    min_thickness = np.min(period_thickness)
    thickness_range = max_thickness - min_thickness
    
    if thickness_range < 1e-10:  # 没有变化
        return None, None, False
    
    # 定义测量高度
    # 上端（接近峰值）：最大值的90%处
    # 下端（接近谷值）：最小值+10%范围处
    top_level = max_thickness - 0.1 * thickness_range
    bottom_level = min_thickness + 0.1 * thickness_range
    
    # 测量上端宽度
    top_width = measure_width_at_level(period_x, period_thickness, top_level)
    
    # 测量下端宽度  
    bottom_width = measure_width_at_level(period_x, period_thickness, bottom_level)
    
    return top_width, bottom_width, (top_width is not None and bottom_width is not None)

def measure_width_at_level(x, y, level):
    """
    测量在指定高度水平线处的结构宽度
    
    Args:
        x: x坐标
        y: y坐标（厚度）
        level: 测量高度
    
    Returns:
        width: 宽度（纳米），如果无法测量返回None
    """
    
    # 找到与水平线的交点
    crossings = []
    
    for i in range(len(y) - 1):
        y1, y2 = y[i], y[i + 1]
        x1, x2 = x[i], x[i + 1]
        
        # 检查是否跨越level水平线
        if (y1 <= level <= y2) or (y2 <= level <= y1):
            # 线性插值找到精确交点
            if y2 != y1:  # 避免除零
                t = (level - y1) / (y2 - y1)
                cross_x = x1 + t * (x2 - x1)
                crossings.append(cross_x)
    
    # 去除重复的交点（容差1e-10）
    unique_crossings = []
    for cross in crossings:
        is_duplicate = False
        for existing in unique_crossings:
            if abs(cross - existing) < 1e-10:
                is_duplicate = True
                break
        if not is_duplicate:
            unique_crossings.append(cross)
    
    crossings = sorted(unique_crossings)
    
    if len(crossings) < 2:
        return None
    
    # 计算最外侧两个交点之间的距离（即结构宽度）
    width_um = crossings[-1] - crossings[0]  # μm
    width_nm = width_um * 1000  # 转换为纳米
    
    return width_nm

def visualize_measurement(x_coords, thickness):
    """
    可视化测量过程
    """
    top_width, bottom_width, success = analyze_single_period_widths(x_coords, thickness)
    
    if not success:
        print("❌ 测量失败")
        return
    
    print(f"✅ 测量成功:")
    print(f"   上端宽度: {top_width:.2f} nm")
    print(f"   下端宽度: {bottom_width:.2f} nm")
    
    # 绘制可视化图
    plt.figure(figsize=(10, 6))
    plt.plot(x_coords * 1000, thickness, 'b-', linewidth=2, label='形貌分布')
    
    # 突出显示测量区域
    period = 0.405  # μm
    center_idx = len(x_coords) // 2
    start_x = x_coords[center_idx] - period/2
    end_x = x_coords[center_idx] + period/2
    
    plt.axvline(start_x * 1000, color='r', linestyle='--', alpha=0.7, label='周期边界')
    plt.axvline(end_x * 1000, color='r', linestyle='--', alpha=0.7)
    
    plt.xlabel('位置 (nm)')
    plt.ylabel('归一化厚度')
    plt.title('单个周期宽度测量示意图')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    # 测试代码
    print("🧪 测试修复后的测量算法")
    
    # 生成测试数据
    x = np.linspace(-1.62, 1.62, 1000)
    # 模拟形貌分布（简化版）
    y = 0.8 + 0.2 * np.cos(2 * np.pi * x / 0.405)
    
    visualize_measurement(x, y)

