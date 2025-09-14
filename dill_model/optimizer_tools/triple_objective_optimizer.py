#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DILL模型三目标优化器

同时优化三个目标的误差最小化：
1. 上端距离（目标：109.4nm）
2. 下端距离（目标：82.62nm）  
3. 侧壁角度（理想垂直：90度）

作者：AI Assistant
日期：2025年
"""

import sys
import os
import numpy as np
import matplotlib.pyplot as plt
import requests
import json
import time
import signal
from scipy.optimize import minimize, differential_evolution
from scipy.signal import find_peaks
import pandas as pd

# 添加项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# 导入现有的优化器基础功能
from cd_c_optimizer import DillCDOptimizer

class TripleObjectiveOptimizer(DillCDOptimizer):
    """DILL模型三目标同时优化器"""
    
    def __init__(self, server_url="http://localhost:8080"):
        """初始化三目标优化器"""
        super().__init__(server_url)
        
        # 添加中断处理机制
        self.interrupted = False
        self.best_so_far = None
        self.best_error_so_far = float('inf')
        signal.signal(signal.SIGINT, self._signal_handler)
        
        print("🎯🎯🎯 三目标同时优化器初始化")
        print("   目标1: 上端距离 → 82.62nm")
        print("   目标2: 下端距离 → 109.4nm")
        print("   目标3: 侧壁角度 → 根据距离目标计算（正梯形）")
        
        # 设置三个目标值（正梯形：上端窄，下端宽）
        self.target_top_distance = 82.62  # nm
        self.target_bottom_distance = 109.4  # nm  
        self.target_sidewall_angle = None  # 将根据距离动态计算
        
        # 设置误差容差
        self.distance_tolerance = 5.0  # 距离误差容差 5%
        self.angle_tolerance = 2.0     # 角度误差容差 2度
        
        print(f"   距离误差容差: {self.distance_tolerance}%")
        print(f"   角度误差容差: {self.angle_tolerance}°")
        print("   注意：侧壁角度目标将根据距离目标动态计算")
        
        # 基于实验结果：固定CD=35，只优化C和V
        self.fixed_cd = 35.0  # 实验证明的最佳CD值
        self.param_ranges = {
            'C': (0.001, 1.0),    # 全范围搜索曝光常数
            'V': (0.75, 1.0)      # 用户指定V范围 0.75-1.0
        }
        print(f"   C搜索范围: {self.param_ranges['C']} 🔥 全范围搜索!")
        print(f"   CD固定值: {self.fixed_cd} ✅ 实验验证的最佳值")
        print(f"   V搜索范围: {self.param_ranges['V']} 🎯 用户指定范围")
        print("   🚀💪 优化配置：C+V双变量 + 多次搜索 + 严格标准！")
        print("   ⏰ 预计运行时间：8-15分钟 (双变量快速收敛)")
        print("   🛑 随时按 Ctrl+C 可优雅退出并获得当前最佳结果")
    
    def _signal_handler(self, signum, frame):
        """处理用户中断信号 (Ctrl+C)"""
        print(f"\n\n🛑 接收到用户中断信号！")
        print("   ⏳ 正在优雅退出，将总结当前最佳结果...")
        self.interrupted = True
    
    def _save_current_best(self):
        """保存当前最佳结果"""
        if self.best_so_far is None:
            print("❌ 尚未找到任何有效解")
            return None
            
        print(f"\n🏆 当前最佳解保存:")
        print(f"   参数: C={self.best_so_far.x[0]:.6f}, CD={self.fixed_cd:.2f}(固定), V={self.best_so_far.x[1]:.3f}")
        print(f"   误差: {self.best_error_so_far*100:.2f}%")
        
        # 验证当前最佳解
        optimal_C, optimal_V = self.best_so_far.x
        x_coords, thickness = self.call_dill_api(optimal_C, optimal_V)
        
        if x_coords is not None and thickness is not None:
            top_dist, bottom_dist, dist_success = self.analyze_morphology_distances(x_coords, thickness)
            left_angle, right_angle, avg_angle, angle_success = self.calculate_sidewall_angle(x_coords, thickness)
            
            if dist_success and angle_success:
                result = {
                    'success': True,
                'interrupted': True,
                'optimal_C': optimal_C,
                'optimal_cd': self.fixed_cd,  # 使用固定CD值
                'optimal_V': optimal_V,
                'total_error': self.best_error_so_far * 100,
                    'top_distance': top_dist,
                    'bottom_distance': bottom_dist,
                    'sidewall_angle': avg_angle,
                    'left_angle': left_angle,
                    'right_angle': right_angle,
                    'top_error': abs(top_dist - self.target_top_distance) / self.target_top_distance * 100,
                    'bottom_error': abs(bottom_dist - self.target_bottom_distance) / self.target_bottom_distance * 100,
                    'angle_error': abs(avg_angle - self.target_sidewall_angle) / self.target_sidewall_angle * 100,
                    'optimization_time': 0
                }
                return result
        
        return None
    
    def call_dill_api(self, C, V):
        """
        重写父类方法，固定CD，只优化C和V
        
        Args:
            C: 曝光常数
            V: 干涉条纹可见度
            
        Returns:
            tuple: (x坐标数组, 形貌分布数组) 或 (None, None) 如果失败
        """
        try:
            # 准备API参数，CD固定为35.0
            params = self.fixed_params.copy()
            params.update({
                'C': C,
                'exposure_threshold': self.fixed_cd,  # 固定CD值
                'V': V  # V是变量
            })
            
            print(f"🔄 调用DILL API: C={C:.6f}, cd={self.fixed_cd:.2f}, V={V:.3f}")
            
            # 发送请求
            response = requests.post(
                f"{self.server_url}/api/calculate_data",
                json=params,
                timeout=self.timeout,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code != 200:
                print(f"❌ API请求失败: {response.status_code}")
                return None, None
                
            result = response.json()
            
            # 检查响应格式
            if 'data' not in result:
                print("❌ API响应格式错误：缺少data字段")
                return None, None
            
            data = result['data']
            
            # 检查数据完整性
            if 'x' not in data or 'thickness' not in data:
                print("❌ API响应格式错误：缺少x或thickness字段")
                return None, None
            
            x_coords = np.array(data['x'])
            thickness = np.array(data['thickness'])
            
            print(f"✅ API调用成功: {len(x_coords)}个数据点")
            return x_coords, thickness
            
        except requests.RequestException as e:
            print(f"❌ API请求异常: {e}")
            return None, None
        except Exception as e:
            print(f"❌ API调用失败: {e}")
            return None, None
    
    def calculate_target_sidewall_angle(self, x_coords, thickness):
        """
        根据目标距离和实际蚀刻深度计算理想侧壁角度
        
        Args:
            x_coords: X坐标数组
            thickness: 厚度数组
            
        Returns:
            float: 理想侧壁角度（度）或None
        """
        try:
            # 计算蚀刻深度（最大厚度 - 最小厚度）
            max_thickness = np.max(thickness)
            min_thickness = np.min(thickness)
            etch_depth = max_thickness - min_thickness
            
            if etch_depth <= 0:
                print("❌ 蚀刻深度为零，无法计算理想角度")
                return None
            
            # 基于梯形几何关系计算理想侧壁角度
            # 下端宽度 > 上端宽度，形成正梯形
            top_width = self.target_top_distance  # 82.62nm
            bottom_width = self.target_bottom_distance  # 109.4nm
            
            # 计算单侧的水平差值（正梯形：下端比上端宽）
            horizontal_difference = (bottom_width - top_width) / 2.0
            
            # 将nm转换为μm（与thickness单位一致）
            horizontal_diff_um = horizontal_difference / 1000.0
            
            # 计算侧壁角度：arctan(水平差/垂直深度)
            angle_rad = np.arctan(horizontal_diff_um / etch_depth)
            angle_deg = np.degrees(angle_rad)
            
            # 侧壁角度通常指与垂直方向的夹角
            sidewall_angle = 90.0 - angle_deg
            
            print(f"📐 理想侧壁角度计算（正梯形）:")
            print(f"   上端目标宽度: {top_width:.1f}nm")
            print(f"   下端目标宽度: {bottom_width:.1f}nm")
            print(f"   蚀刻深度: {etch_depth:.6f}μm")
            print(f"   水平差值: {horizontal_difference:.1f}nm = {horizontal_diff_um:.6f}μm")
            print(f"   理想侧壁角度: {sidewall_angle:.2f}° (正梯形)")
            print(f"   注：90°=垂直，<90°=内收，>90°=外扩")
            
            return sidewall_angle
            
        except Exception as e:
            print(f"❌ 理想角度计算异常: {e}")
            return None
    
    def calculate_sidewall_angle(self, x_coords, thickness):
        """
        计算侧壁角度
        
        Args:
            x_coords: X坐标数组
            thickness: 厚度数组
            
        Returns:
            tuple: (left_angle, right_angle, average_angle, success)
        """
        try:
            # 找到一个完整周期的数据
            period = 0.405  # μm
            
            # 寻找周期中心附近的数据（避免边界效应）
            center_mask = (x_coords >= -period/2) & (x_coords <= period/2)
            if not np.any(center_mask):
                print("❌ 无法找到中心周期数据")
                return None, None, None, False
            
            x_center = x_coords[center_mask]
            y_center = thickness[center_mask]
            
            # 找到最大厚度点（顶部）和最小厚度点（底部）
            max_idx = np.argmax(y_center)
            min_idx = np.argmin(y_center)
            
            max_thickness = y_center[max_idx]
            min_thickness = y_center[min_idx]
            
            # 定义侧壁区域：从90%到10%厚度范围
            upper_threshold = min_thickness + 0.9 * (max_thickness - min_thickness)
            lower_threshold = min_thickness + 0.1 * (max_thickness - min_thickness)
            
            # 寻找左侧和右侧侧壁
            left_sidewall_mask = (x_center < x_center[max_idx]) & \
                               (y_center >= lower_threshold) & \
                               (y_center <= upper_threshold)
            
            right_sidewall_mask = (x_center > x_center[max_idx]) & \
                                (y_center >= lower_threshold) & \
                                (y_center <= upper_threshold)
            
            angles = []
            angle_info = {}
            
            # 计算左侧壁角度
            if np.sum(left_sidewall_mask) >= 3:  # 至少需要3个点
                x_left = x_center[left_sidewall_mask]
                y_left = y_center[left_sidewall_mask]
                
                # 线性拟合
                coeffs_left = np.polyfit(x_left, y_left, 1)
                slope_left = coeffs_left[0]
                
                # 计算与垂直方向的角度
                angle_rad_left = np.arctan(1/slope_left) if slope_left != 0 else np.pi/2
                angle_deg_left = np.degrees(angle_rad_left)
                
                # 确保角度为正值
                if angle_deg_left < 0:
                    angle_deg_left += 180
                    
                angles.append(angle_deg_left)
                angle_info['left_angle'] = angle_deg_left
                angle_info['left_slope'] = slope_left
                angle_info['left_points'] = len(x_left)
            
            # 计算右侧壁角度  
            if np.sum(right_sidewall_mask) >= 3:  # 至少需要3个点
                x_right = x_center[right_sidewall_mask] 
                y_right = y_center[right_sidewall_mask]
                
                # 线性拟合
                coeffs_right = np.polyfit(x_right, y_right, 1)
                slope_right = coeffs_right[0]
                
                # 计算与垂直方向的角度
                angle_rad_right = np.arctan(1/abs(slope_right)) if slope_right != 0 else np.pi/2
                angle_deg_right = np.degrees(angle_rad_right)
                
                angles.append(angle_deg_right)
                angle_info['right_angle'] = angle_deg_right  
                angle_info['right_slope'] = slope_right
                angle_info['right_points'] = len(x_right)
            
            if len(angles) == 0:
                print("❌ 无法计算侧壁角度：侧壁点数不足")
                return None, None, None, False
            
            # 计算平均角度
            avg_angle = np.mean(angles)
            
            left_angle = angle_info.get('left_angle', None)
            right_angle = angle_info.get('right_angle', None)
            
            print(f"📐 侧壁角度分析:")
            if left_angle is not None:
                print(f"   左侧壁: {left_angle:.2f}° (点数: {angle_info['left_points']})")
            if right_angle is not None:
                print(f"   右侧壁: {right_angle:.2f}° (点数: {angle_info['right_points']})")
            print(f"   平均角度: {avg_angle:.2f}°")
            
            return left_angle, right_angle, avg_angle, True
            
        except Exception as e:
            print(f"❌ 侧壁角度计算异常: {e}")
            return None, None, None, False
    
    def triple_objective_function(self, params):
        """
        三目标优化函数 - 双变量版本 (C和V，CD固定)
        
        Args:
            params: [C, V] 参数数组
            
        Returns:
            float: 综合误差值
        """
        C, V = params
        
        # 调用DILL API（CD使用固定值）
        x_coords, thickness = self.call_dill_api(C, V)
        
        if x_coords is None or thickness is None:
            print("   ❌ API调用失败，返回大误差值")
            return 1000
        
        # 检查是否有形貌变化
        if np.std(thickness) < 1e-10:
            print(f"   ❌ 无形貌变化！cd={self.fixed_cd:.1f}")
            return 1000
        
        # 1. 分析距离
        top_dist, bottom_dist, dist_success = self.analyze_morphology_distances(x_coords, thickness)
        
        if not dist_success:
            print("   ❌ 距离分析失败，返回大误差值")
            return 1000
        
        # 2. 计算理想侧壁角度（基于距离目标）
        if self.target_sidewall_angle is None:
            self.target_sidewall_angle = self.calculate_target_sidewall_angle(x_coords, thickness)
            if self.target_sidewall_angle is None:
                print("   ❌ 无法计算理想侧壁角度，返回大误差值")
                return 1000
        
        # 3. 分析实际侧壁角度
        left_angle, right_angle, avg_angle, angle_success = self.calculate_sidewall_angle(x_coords, thickness)
        
        if not angle_success or avg_angle is None:
            print("   ❌ 角度分析失败，返回大误差值")
            return 1000
        
        # 4. 计算三个目标的误差
        top_error = abs(top_dist - self.target_top_distance) / self.target_top_distance
        bottom_error = abs(bottom_dist - self.target_bottom_distance) / self.target_bottom_distance
        angle_error = abs(avg_angle - self.target_sidewall_angle) / self.target_sidewall_angle
        
        # 5. 距离误差主导策略（角度权重最小化）
        # 专注平衡上下宽度误差，角度为次要目标
        errors = np.array([top_error, bottom_error, angle_error])
        
        distance_weight = 0.9  # 距离总权重90%
        angle_weight = 0.1     # 角度权重10%
        
        # 在距离权重内根据误差差异分配
        if abs(top_error - bottom_error) < 0.1:  # 误差相近时平均分配
            top_weight = distance_weight * 0.5
            bottom_weight = distance_weight * 0.5
        elif top_error > bottom_error:
            # 上端误差更大，给予更高权重来平衡
            top_weight = distance_weight * 0.65
            bottom_weight = distance_weight * 0.35
        else:
            # 下端误差更大，给予更高权重来平衡  
            top_weight = distance_weight * 0.35
            bottom_weight = distance_weight * 0.65
            
        weights = np.array([top_weight, bottom_weight, angle_weight])
        
        total_error = np.sum(weights * errors)
        
        # 显示详细信息
        target_names = ['上端距离', '下端距离', '侧壁角度']
        print(f"📊 三目标误差分析:")
        print(f"   上端距离: {top_dist:.2f}nm (目标{self.target_top_distance}nm) 误差:{top_error*100:.2f}%")
        print(f"   下端距离: {bottom_dist:.2f}nm (目标{self.target_bottom_distance}nm) 误差:{bottom_error*100:.2f}%")
        print(f"   侧壁角度: {avg_angle:.2f}° (目标{self.target_sidewall_angle}°) 误差:{angle_error*100:.2f}%")
        print(f"   权重分配: 上端{weights[0]:.2f}, 下端{weights[1]:.2f}, 角度{weights[2]:.2f}")
        print(f"   综合误差: {total_error*100:.2f}%")
        
        # 记录结果
        result_data = {
            'C': C,
            'cd': self.fixed_cd,
            'top_distance': top_dist,
            'bottom_distance': bottom_dist,
            'sidewall_angle': avg_angle,
            'left_angle': left_angle,
            'right_angle': right_angle,
            'top_error': top_error * 100,
            'bottom_error': bottom_error * 100,
            'angle_error': angle_error * 100,
            'total_error': total_error * 100,
            'weights': weights.tolist()
        }
        self.optimization_history.append(result_data)
        
        return total_error
    
    def optimize_triple_objectives(self):
        """执行三目标优化"""
        print("\n🚀 开始三目标同时优化")
        print("="*80)
        
        # 设置参数范围 - 只优化C和V，CD固定
        bounds = [
            self.param_ranges['C'],
            self.param_ranges['V']
        ]
        
        print(f"🔧 参数搜索范围:")
        print(f"   C: {bounds[0][0]:.6f} - {bounds[0][1]:.6f}")
        print(f"   CD: {self.fixed_cd} (固定值)")
        print(f"   V: {bounds[1][0]:.3f} - {bounds[1][1]:.3f} (干涉条纹可见度)")
        
        start_time = time.time()
        
        # 使用差分进化算法进行全局搜索
        print("\n第1阶段：全局搜索 (差分进化)")
        print("-" * 40)
        
        # 选项3：改进优化策略 - 多起点优化
        best_result = None
        best_error = float('inf')
        
        print("🔥 使用终极多起点优化策略，运行5次独立搜索...")
        print("   ⚡ 不惜代价确保全局最优解！")
        print("   🛑 提醒：您可以随时按 Ctrl+C 优雅退出")
        print("   📊 中断后将自动保存和总结当前最佳结果")
        print("   🚀 开始搜索...")
        
        for run_id in range(5):
            print(f"\n🏃‍♂️ 第{run_id+1}/5次终极搜索 (种子={42+run_id*20})")
            
            result = differential_evolution(
                self.triple_objective_function,
                bounds,
                maxiter=300,        # 终极迭代次数：确保充分搜索
                popsize=80,         # 终极种群大小：最大化搜索能力
                seed=42 + run_id * 20,  # 不同的随机种子，间隔更大
                polish=True,        # 启用局部优化
                disp=False,
                atol=1e-10,         # 极严格的收敛条件
                tol=1e-10,
                workers=1           # 单线程避免API并发问题
            )
            
            print(f"   🎯 第{run_id+1}次终极搜索完成: 误差 {result.fun*100:.2f}%")
            if result.success:
                print(f"   📊 参数: C={result.x[0]:.6f}, CD={self.fixed_cd:.2f}(固定), V={result.x[1]:.3f}")
            
            if result.success and result.fun < best_error:
                best_error = result.fun
                best_result = result
                # 同时更新全局最佳记录
                self.best_error_so_far = best_error
                self.best_so_far = best_result
                print(f"   🏆 发现新的全局最优解！误差: {best_error*100:.2f}%")
            else:
                print(f"   ⏸️  未超越当前最佳 ({best_error*100:.2f}%)")
            
            # 检查用户是否中断
            if self.interrupted:
                print(f"\n🛑 用户中断！在第{run_id+1}次搜索后退出")
                print("   📊 正在总结当前最佳结果...")
                interrupted_result = self._save_current_best()
                if interrupted_result:
                    return interrupted_result
                break
            
        # 使用最佳结果
        result = best_result if best_result else result
        
        optimization_time = time.time() - start_time
        
        if result.success:
            optimal_C, optimal_V = result.x
            final_error = result.fun
            
            print(f"\n✅ 三目标优化成功!")
            print(f"   最优参数: C={optimal_C:.6f}, cd={self.fixed_cd:.2f}(固定), V={optimal_V:.3f}")
            print(f"   最终综合误差: {final_error*100:.2f}%")
            print(f"   优化时间: {optimization_time:.1f}秒")
            
            # 验证最优参数
            print("\n第2阶段：结果验证")
            print("-" * 40)
            
            x_coords, thickness = self.call_dill_api(optimal_C, optimal_V)
            
            if x_coords is not None and thickness is not None:
                # 重新分析最优结果
                top_dist, bottom_dist, dist_success = self.analyze_morphology_distances(x_coords, thickness)
                left_angle, right_angle, avg_angle, angle_success = self.calculate_sidewall_angle(x_coords, thickness)
                
                if dist_success and angle_success:
                    top_error = abs(top_dist - self.target_top_distance) / self.target_top_distance * 100
                    bottom_error = abs(bottom_dist - self.target_bottom_distance) / self.target_bottom_distance * 100
                    angle_error = abs(avg_angle - self.target_sidewall_angle) / self.target_sidewall_angle * 100
                    
                    print(f"📋 最终验证结果:")
                    print(f"   上端距离: {top_dist:.2f}nm (误差: {top_error:.2f}%)")
                    print(f"   下端距离: {bottom_dist:.2f}nm (误差: {bottom_error:.2f}%)")
                    print(f"   侧壁角度: {avg_angle:.2f}° (误差: {angle_error:.2f}%)")
                    
                    # 检查达标情况
                    top_ok = top_error <= self.distance_tolerance
                    bottom_ok = bottom_error <= self.distance_tolerance
                    angle_ok = angle_error <= (self.angle_tolerance/self.target_sidewall_angle*100)
                    
                    print(f"📈 达标情况:")
                    print(f"   上端距离: {'✅' if top_ok else '❌'} ({self.distance_tolerance}%容差)")
                    print(f"   下端距离: {'✅' if bottom_ok else '❌'} ({self.distance_tolerance}%容差)")
                    print(f"   侧壁角度: {'✅' if angle_ok else '❌'} ({self.angle_tolerance}°容差)")
                    
                    total_ok = top_ok + bottom_ok + angle_ok
                    print(f"🎯 总体评价: {total_ok}/3 个目标达标")
                    
                    return {
                        'success': True,
                        'optimal_C': optimal_C,
                        'optimal_cd': self.fixed_cd,
                        'optimal_V': optimal_V,
                        'total_error': final_error * 100,
                        'top_distance': top_dist,
                        'bottom_distance': bottom_dist,
                        'sidewall_angle': avg_angle,
                        'left_angle': left_angle,
                        'right_angle': right_angle,
                        'top_error': top_error,
                        'bottom_error': bottom_error,
                        'angle_error': angle_error,
                        'targets_met': total_ok,
                        'optimization_time': optimization_time
                    }
        
        print(f"❌ 三目标优化失败: {result.message}")
        return {'success': False, 'message': result.message}
    
    def generate_triple_report(self, result):
        """生成三目标优化报告"""
        if not result.get('success', False):
            print(f"❌ 无法生成报告：优化失败")
            return
        
        # 特殊处理中断情况
        if result.get('interrupted', False):
            print("\n" + "🛑"*20)
            print("【用户中断 - 当前最佳结果报告】")
            print("🛑"*20)
        
        print("\n" + "="*80)
        print("【DILL模型 三目标优化 最终报告】")
        print("="*80)
        
        print(f"🎯 优化目标:")
        print(f"   上端距离目标: {self.target_top_distance}nm (容差: {self.distance_tolerance}%)")
        print(f"   下端距离目标: {self.target_bottom_distance}nm (容差: {self.distance_tolerance}%)")
        print(f"   侧壁角度目标: {self.target_sidewall_angle}° (容差: {self.angle_tolerance}°)")
        print()
        
        print(f"🏆 最优解:")
        print(f"   参数: C = {result['optimal_C']:.6f} cm²/mJ")
        print(f"        cd = {result['optimal_cd']:.2f} mJ/cm²")
        print(f"        V = {result['optimal_V']:.3f} (干涉条纹可见度)")
        print(f"   综合误差: {result['total_error']:.2f}%")
        print(f"   优化时间: {result['optimization_time']:.1f}秒")
        print()
        
        print(f"📊 详细结果:")
        print(f"   上端距离: {result['top_distance']:.2f}nm (误差: {result['top_error']:.2f}%)")
        print(f"   下端距离: {result['bottom_distance']:.2f}nm (误差: {result['bottom_error']:.2f}%)")
        print(f"   侧壁角度: {result['sidewall_angle']:.2f}° (误差: {result['angle_error']:.2f}%)")
        if result.get('left_angle') and result.get('right_angle'):
            print(f"   左侧壁: {result['left_angle']:.2f}°")
            print(f"   右侧壁: {result['right_angle']:.2f}°")
        print()
        
        print(f"🎯 达标评价: {result['targets_met']}/3 个目标达标")
        
        # 保存结果
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        
        # 保存详细历史数据
        if self.optimization_history:
            df = pd.DataFrame(self.optimization_history)
            csv_filename = f"triple_objective_optimization_{timestamp}.csv"
            df.to_csv(csv_filename, index=False, encoding='utf-8')
            print(f"💾 优化历史已保存至: {csv_filename}")
        
        # 保存最终结果 - 修复JSON序列化问题
        result_filename = f"triple_objective_result_{timestamp}.json"
        
        # 确保所有值都是JSON可序列化的
        def json_serializable(obj):
            """转换对象为JSON可序列化格式"""
            if isinstance(obj, np.bool_):
                return bool(obj)
            elif isinstance(obj, (np.integer, np.floating)):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            return obj
        
        # 创建可序列化的结果副本
        serializable_result = {}
        for key, value in result.items():
            serializable_result[key] = json_serializable(value)
        
        with open(result_filename, 'w', encoding='utf-8') as f:
            json.dump(serializable_result, f, indent=2, ensure_ascii=False)
        print(f"💾 最终结果已保存至: {result_filename}")

def main():
    """主函数"""
    print("🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯")
    print("【DILL模型 三目标同时优化】")
    print("同时优化：上端距离 + 下端距离 + 侧壁角度")
    print("🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯")
    
    optimizer = None
    result = None
    
    try:
        # 创建三目标优化器
        optimizer = TripleObjectiveOptimizer()
        
        # 执行优化
        result = optimizer.optimize_triple_objectives()
        
        # 生成报告
        if result:
            optimizer.generate_triple_report(result)
        
        print(f"\n🎉 三目标优化完成!")
        
    except KeyboardInterrupt:
        print(f"\n\n🛑 检测到键盘中断 (Ctrl+C)")
        if optimizer and optimizer.best_so_far:
            print("   📊 正在生成中断报告...")
            interrupted_result = optimizer._save_current_best()
            if interrupted_result:
                print("\n🛑 生成中断时刻的最佳结果报告：")
                optimizer.generate_triple_report(interrupted_result)
            else:
                print("❌ 无法生成中断报告")
        else:
            print("❌ 优化过程过早中断，无有效结果")
        
        print(f"\n🛑 优化被用户中断！")
        
    except Exception as e:
        print(f"\n❌ 优化过程发生错误: {e}")
        if optimizer and optimizer.best_so_far:
            print("   📊 尝试保存当前最佳结果...")
            try:
                interrupted_result = optimizer._save_current_best()
                if interrupted_result:
                    optimizer.generate_triple_report(interrupted_result)
            except:
                pass

if __name__ == "__main__":
    main()
