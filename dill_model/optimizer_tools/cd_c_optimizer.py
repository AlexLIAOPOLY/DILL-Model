#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DILL模型曝光阈值(cd)和曝光常数(C)自动优化脚本

目标：通过调整cd和C参数，使形貌分布曲线达到目标尺寸：
- 单个周期最上面两点距离 ≈ 109.4 (误差5%内)
- 单个周期最下面两点距离 ≈ 82.62 (误差5%内)

作者：AI Assistant
日期：2025年
"""

import sys
import os
import time
import json
import requests
import numpy as np
from scipy.optimize import minimize, differential_evolution
from scipy.signal import find_peaks
import matplotlib.pyplot as plt
from datetime import datetime

# 添加项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

class DillCDOptimizer:
    """DILL模型曝光阈值和曝光常数优化器"""
    
    def __init__(self, server_url="http://localhost:8080", timeout=30):
        """
        初始化优化器
        
        Args:
            server_url: DILL服务器地址
            timeout: 请求超时时间(秒)
        """
        self.server_url = server_url
        self.timeout = timeout
        
        # 基于图片的固定参数 (保持不变)
        self.fixed_params = {
            'angle_a': 0.405,       # 周期距离(μm) - 从图片
            'wavelength': 405,      # 光波长(nm) - 从图片  
            'V': 1.0,              # 干涉条纹可见度 - 修改为1
            'I_avg': 30,           # 平均入射光强度(mW/cm²) - 从图片
            't_exp': 0.6,          # 曝光时间(s) - 从图片
            'sine_type': '1d',     # 1D模式
            'K': 2 * np.pi / 0.405  # 由周期距离计算得出的空间频率
        }
        
        # 可优化参数的初始值和范围 - 为平衡优化扩大搜索空间
        self.param_ranges = {
            'C': (0.001, 0.15),          # 曝光常数范围 - 扩大范围
            'exposure_threshold': (3, 50)  # 曝光阈值范围 - 扩大搜索范围寻找平衡解
        }
        
        # 优化目标
        self.target_top_distance = 109.4    # 目标上端距离
        self.target_bottom_distance = 82.62 # 目标下端距离
        self.tolerance = 0.05               # 5%容错率
        
        # 优化历史记录
        self.optimization_history = []
        self.best_params = None
        self.best_error = float('inf')
        
        print("🎯" * 30)
        print("【DILL模型 曝光阈值(cd)和曝光常数(C) 自动优化器】")
        print("🎯" * 30)
        print(f"📊 固定参数:")
        for key, value in self.fixed_params.items():
            print(f"   - {key}: {value}")
        print(f"📊 优化目标:")
        print(f"   - 上端距离目标: {self.target_top_distance} (误差±{self.tolerance*100}%)")
        print(f"   - 下端距离目标: {self.target_bottom_distance} (误差±{self.tolerance*100}%)")
        print(f"📊 可调参数范围:")
        for key, (min_val, max_val) in self.param_ranges.items():
            print(f"   - {key}: [{min_val}, {max_val}]")
    
    def get_exposure_dose_range(self, C=0.022, exposure_threshold=20):
        """
        获取当前参数下的曝光剂量范围，用于指导参数调整
        
        Args:
            C: 曝光常数
            exposure_threshold: 曝光阈值
        
        Returns:
            tuple: (min_dose, max_dose, mean_dose)
        """
        print(f"\\n🔍 分析曝光剂量范围 (C={C}, cd={exposure_threshold})")
        
        # 计算曝光剂量分布（不依赖API调用）
        x_range = np.linspace(-1.62, 1.62, 1000)
        K = 2 * np.pi / self.fixed_params['angle_a']  # 空间频率
        I_avg = self.fixed_params['I_avg']
        V = self.fixed_params['V']
        t_exp = self.fixed_params['t_exp']
        
        # 强度分布: I = I_avg * (1 + V * cos(K*x))
        intensity = I_avg * (1 + V * np.cos(K * x_range))
        
        # 曝光剂量: D = I * t_exp  
        exposure_dose = intensity * t_exp
        
        min_dose = np.min(exposure_dose)
        max_dose = np.max(exposure_dose)
        mean_dose = np.mean(exposure_dose)
        
        print(f"   📊 曝光剂量分布:")
        print(f"      最小值: {min_dose:.3f} mJ/cm²")
        print(f"      最大值: {max_dose:.3f} mJ/cm²") 
        print(f"      平均值: {mean_dose:.3f} mJ/cm²")
        print(f"      当前阈值: {exposure_threshold:.1f} mJ/cm²")
        
        if max_dose < exposure_threshold:
            print(f"   ❌ 警告：所有位置的曝光剂量都低于阈值！")
            print(f"   💡 建议：将阈值cd降低到 {max_dose*0.8:.1f} mJ/cm² 以下")
        elif min_dose > exposure_threshold:
            print(f"   ❌ 警告：所有位置的曝光剂量都高于阈值！")  
            print(f"   💡 建议：将阈值cd提高到 {min_dose*1.2:.1f} mJ/cm² 以上")
        else:
            print(f"   ✅ 阈值在合理范围内")
            
        return min_dose, max_dose, mean_dose
    
    def call_dill_api(self, C, exposure_threshold):
        """
        调用DILL模型API获取计算结果
        
        Args:
            C: 曝光常数
            exposure_threshold: 曝光阈值
            
        Returns:
            tuple: (x坐标数组, 形貌分布数组) 或 (None, None) 如果失败
        """
        try:
            # 准备API参数
            params = self.fixed_params.copy()
            params.update({
                'C': C,
                'exposure_threshold': exposure_threshold
            })
            
            print(f"🔄 调用DILL API: C={C:.6f}, cd={exposure_threshold:.2f}")
            
            # 发送请求
            response = requests.post(
                f"{self.server_url}/api/calculate",
                json=params,
                timeout=self.timeout,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code != 200:
                print(f"❌ API请求失败: {response.status_code}")
                return None, None
            
            result = response.json()
            
            # 检查响应格式
            if not result.get('success', False):
                print(f"❌ API返回失败: {result.get('message', '未知错误')}")
                return None, None
            
            data = result.get('data', {})
            
            # 提取数据 - 尝试多种可能的字段名
            x_coords = None
            thickness = None
            
            # 尝试获取x坐标
            for x_field in ['x', 'x_coords']:
                if x_field in data and isinstance(data[x_field], list):
                    x_coords = np.array(data[x_field])
                    break
            
            # 尝试获取厚度/形貌数据
            for thickness_field in ['thickness', 'etch_depth']:
                if thickness_field in data and isinstance(data[thickness_field], list):
                    thickness = np.array(data[thickness_field])
                    break
            
            if x_coords is not None and thickness is not None:
                print(f"✅ API调用成功: {len(x_coords)}个数据点")
                return x_coords, thickness
            else:
                print("❌ API响应中缺少必要的数据字段")
                print(f"   可用字段: {list(data.keys())}")
                return None, None
                
        except requests.RequestException as e:
            print(f"❌ 网络请求错误: {e}")
            return None, None
        except Exception as e:
            print(f"❌ API调用异常: {e}")
            return None, None
    
    def analyze_morphology_distances(self, x_coords, thickness):
        """
        分析形貌分布，计算单个周期内不同高度处的结构宽度
        
        Args:
            x_coords: x坐标数组 (μm)
            thickness: 厚度数组
        
        Returns:
            tuple: (top_width, bottom_width, success)
        """
        try:
            if len(x_coords) == 0 or len(thickness) == 0:
                return 0, 0, False
            
            # 确保数据有效
            thickness = np.array(thickness)
            x_coords = np.array(x_coords)
            
            if np.all(np.isnan(thickness)) or np.all(np.isinf(thickness)):
                return 0, 0, False
        
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
                print("   ❌ 单周期数据点不足")
                return 0, 0, False
            
            # 找到该周期内的最大值和最小值
            max_thickness = np.max(period_thickness)
            min_thickness = np.min(period_thickness)
            thickness_range = max_thickness - min_thickness
            
            if thickness_range < 1e-10:  # 没有变化
                print(f"   ❌ 形貌无变化，厚度范围: {thickness_range:.1e}")
                return 0, 0, False
            
            # 定义测量高度
            # 上端（接近峰值）：最大值-10%范围处
            # 下端（接近谷值）：最小值+10%范围处
            top_level = max_thickness - 0.1 * thickness_range
            bottom_level = min_thickness + 0.1 * thickness_range
            
            # 测量上端宽度
            top_width = self._measure_width_at_level(period_x, period_thickness, top_level)
            
            # 测量下端宽度  
            bottom_width = self._measure_width_at_level(period_x, period_thickness, bottom_level)
            
            if top_width is None or bottom_width is None:
                print(f"   ❌ 宽度测量失败")
                return 0, 0, False
                
            print(f"🔍 单周期宽度测量: 上端={top_width:.2f}nm, 下端={bottom_width:.2f}nm")
            print(f"   测量高度: 上端={top_level:.6f}, 下端={bottom_level:.6f}")
            print(f"   厚度范围: [{min_thickness:.6f}, {max_thickness:.6f}]")
            
            return top_width, bottom_width, True
            
        except Exception as e:
            print(f"❌ 形貌分析错误: {e}")
            return 0, 0, False
            
    def _measure_width_at_level(self, x, y, level):
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
                if abs(y2 - y1) > 1e-12:  # 避免除零
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
    
    def objective_function(self, params):
        """
        优化目标函数
        
        Args:
            params: [C, exposure_threshold]
            
        Returns:
            float: 误差值（越小越好）
        """
        C, exposure_threshold = params
        
        # 调用API获取结果
        x_coords, thickness = self.call_dill_api(C, exposure_threshold)
        
        if x_coords is None or thickness is None:
            print("   ❌ API调用失败，返回大误差值")
            return 1000  # 返回很大的误差值
        
        # 检查是否有形貌变化
        if np.std(thickness) < 1e-10:
            print(f"   ❌ 无形貌变化！所有厚度={thickness[0]:.6f}, cd={exposure_threshold:.1f}")
            return 1000  # 没有变化，返回大误差
        
        # 分析形貌分布
        top_dist, bottom_dist, success = self.analyze_morphology_distances(x_coords, thickness)
        
        if not success:
            print("   ❌ 形貌分析失败，返回大误差值")
            return 1000  # 分析失败，返回很大的误差值
        
        # 计算与目标的误差
        top_error = abs(top_dist - self.target_top_distance) / self.target_top_distance
        bottom_error = abs(bottom_dist - self.target_bottom_distance) / self.target_bottom_distance
        
        # 平衡两个目标：使用自适应权重策略
        # 当一个误差远小于另一个时，增加大误差的权重
        if top_error > bottom_error * 2:
            # 上端误差很大，增加其权重
            top_weight = 0.75
            bottom_weight = 0.25
        elif bottom_error > top_error * 2:
            # 下端误差很大，增加其权重  
            top_weight = 0.25
            bottom_weight = 0.75
        else:
            # 两个误差相近，等权重
            top_weight = 0.5
            bottom_weight = 0.5
        
        # 综合误差：自适应加权平均
        total_error = top_weight * top_error + bottom_weight * bottom_error
        
        # 显示权重信息（仅在误差较小时显示，避免日志过多）
        if total_error < 1.0:  # 只在误差小于100%时显示详细信息
            print(f"   ⚖️  权重策略: 上端={top_weight:.2f}, 下端={bottom_weight:.2f}")
        
        # 记录优化历史
        result_data = {
            'C': C,
            'exposure_threshold': exposure_threshold,
            'top_distance': top_dist,
            'bottom_distance': bottom_dist,
            'top_error': top_error * 100,  # 转为百分比
            'bottom_error': bottom_error * 100,
            'total_error': total_error * 100,
            'timestamp': datetime.now().isoformat()
        }
        
        self.optimization_history.append(result_data)
        
        # 更新最佳结果
        if total_error < self.best_error:
            self.best_error = total_error
            self.best_params = {'C': C, 'exposure_threshold': exposure_threshold}
            print(f"🌟 新的最佳结果! 误差: {total_error*100:.2f}%")
            print(f"   参数: C={C:.6f}, cd={exposure_threshold:.2f}")
            print(f"   距离: 上端={top_dist:.2f}nm, 下端={bottom_dist:.2f}nm")
        
        print(f"📊 当前误差: {total_error*100:.2f}% (上端: {top_error*100:.2f}%, 下端: {bottom_error*100:.2f}%)")
        
        return total_error
    
    def optimize_differential_evolution(self, maxiter=50):
        """
        使用差分进化算法进行全局优化
        
        Args:
            maxiter: 最大迭代次数
            
        Returns:
            dict: 优化结果
        """
        print(f"🔍 启动差分进化全局优化 (最大迭代: {maxiter})")
        
        # 参数边界
        bounds = [
            self.param_ranges['C'],
            self.param_ranges['exposure_threshold']
        ]
        
        start_time = time.time()
        
        try:
            result = differential_evolution(
                self.objective_function,
                bounds,
                maxiter=maxiter,
                popsize=20,  # 增加种群大小提高搜索覆盖率
                seed=42,     # 随机种子，确保可重现
                atol=1e-8,   # 提高精度要求
                tol=1e-8,    # 提高容差精度
                polish=True, # 启用局部优化
                disp=True    # 显示进度
            )
            
            optimization_time = time.time() - start_time
            
            print(f"✅ 差分进化优化完成!")
            print(f"⏱️  优化时间: {optimization_time:.1f}秒")
            print(f"🎯 最终误差: {result.fun*100:.2f}%")
            print(f"📈 函数评估次数: {result.nfev}")
            
            return {
                'method': 'differential_evolution',
                'success': result.success,
                'optimal_C': result.x[0],
                'optimal_cd': result.x[1],
                'final_error': result.fun,
                'iterations': result.nit,
                'function_evals': result.nfev,
                'optimization_time': optimization_time
            }
            
        except Exception as e:
            print(f"❌ 差分进化优化失败: {e}")
            return None
    
    def optimize_local_search(self, initial_guess=None, method='L-BFGS-B'):
        """
        使用局部搜索算法进行优化
        
        Args:
            initial_guess: 初始猜测值 [C, exposure_threshold]
            method: 优化方法
            
        Returns:
            dict: 优化结果
        """
        if initial_guess is None:
            # 使用参数范围的中点作为初始猜测
            initial_guess = [
                (self.param_ranges['C'][0] + self.param_ranges['C'][1]) / 2,
                (self.param_ranges['exposure_threshold'][0] + self.param_ranges['exposure_threshold'][1]) / 2
            ]
        
        print(f"🎯 启动局部搜索优化 (方法: {method})")
        print(f"📍 初始猜测: C={initial_guess[0]:.6f}, cd={initial_guess[1]:.2f}")
        
        # 参数边界
        bounds = [
            self.param_ranges['C'],
            self.param_ranges['exposure_threshold']
        ]
        
        start_time = time.time()
        
        try:
            result = minimize(
                self.objective_function,
                initial_guess,
                method=method,
                bounds=bounds,
                options={'disp': True, 'maxiter': 100}
            )
            
            optimization_time = time.time() - start_time
            
            print(f"✅ 局部搜索优化完成!")
            print(f"⏱️  优化时间: {optimization_time:.1f}秒")
            print(f"🎯 最终误差: {result.fun*100:.2f}%")
            print(f"📈 函数评估次数: {result.nfev}")
            
            return {
                'method': method,
                'success': result.success,
                'optimal_C': result.x[0],
                'optimal_cd': result.x[1],
                'final_error': result.fun,
                'iterations': result.nit,
                'function_evals': result.nfev,
                'optimization_time': optimization_time
            }
            
        except Exception as e:
            print(f"❌ 局部搜索优化失败: {e}")
            return None
    
    def verify_solution(self, C, exposure_threshold):
        """
        验证优化解的性能
        
        Args:
            C: 曝光常数
            exposure_threshold: 曝光阈值
            
        Returns:
            dict: 验证结果
        """
        print(f"🔬 验证解决方案: C={C:.6f}, cd={exposure_threshold:.2f}")
        
        # 调用API
        x_coords, thickness = self.call_dill_api(C, exposure_threshold)
        
        if x_coords is None or thickness is None:
            return {'success': False, 'error': 'API调用失败'}
        
        # 分析结果
        top_dist, bottom_dist, success = self.analyze_morphology_distances(x_coords, thickness)
        
        if not success:
            return {'success': False, 'error': '形貌分析失败'}
        
        # 计算误差和达标情况
        top_error = abs(top_dist - self.target_top_distance) / self.target_top_distance
        bottom_error = abs(bottom_dist - self.target_bottom_distance) / self.target_bottom_distance
        
        top_within_tolerance = top_error <= self.tolerance
        bottom_within_tolerance = bottom_error <= self.tolerance
        
        overall_success = top_within_tolerance and bottom_within_tolerance
        
        result = {
            'success': True,
            'C': C,
            'exposure_threshold': exposure_threshold,
            'top_distance': top_dist,
            'bottom_distance': bottom_dist,
            'target_top': self.target_top_distance,
            'target_bottom': self.target_bottom_distance,
            'top_error': top_error * 100,
            'bottom_error': bottom_error * 100,
            'top_within_tolerance': top_within_tolerance,
            'bottom_within_tolerance': bottom_within_tolerance,
            'overall_success': overall_success,
            'x_coords': x_coords.tolist(),
            'thickness': thickness.tolist()
        }
        
        print(f"📊 验证结果:")
        print(f"   上端距离: {top_dist:.2f} nm (目标: {self.target_top_distance:.2f}, 误差: {top_error*100:.2f}%)")
        print(f"   下端距离: {bottom_dist:.2f} nm (目标: {self.target_bottom_distance:.2f}, 误差: {bottom_error*100:.2f}%)")
        print(f"   达标情况: {'✅' if overall_success else '❌'}")
        
        return result
    
    def generate_report(self, optimization_results, verification_result):
        """
        生成优化报告
        
        Args:
            optimization_results: 优化结果列表
            verification_result: 验证结果
        """
        print("📋" * 30)
        print("【DILL模型参数优化完整报告】")
        print("📋" * 30)
        
        print(f"🎯 优化目标:")
        print(f"   上端距离目标: {self.target_top_distance:.2f} nm (±{self.tolerance*100}%)")
        print(f"   下端距离目标: {self.target_bottom_distance:.2f} nm (±{self.tolerance*100}%)")
        
        print(f"\n📊 固定参数:")
        for key, value in self.fixed_params.items():
            print(f"   {key}: {value}")
        
        print(f"\n🔍 优化方法结果:")
        for i, result in enumerate(optimization_results):
            if result:
                print(f"   方法 {i+1} ({result['method']}):")
                print(f"     - 最优C: {result['optimal_C']:.6f}")
                print(f"     - 最优cd: {result['optimal_cd']:.2f}")
                print(f"     - 最终误差: {result['final_error']*100:.2f}%")
                print(f"     - 优化时间: {result['optimization_time']:.1f}秒")
        
        if verification_result and verification_result['success']:
            print(f"\n✅ 最终验证结果:")
            print(f"   参数: C={verification_result['C']:.6f}, cd={verification_result['exposure_threshold']:.2f}")
            print(f"   上端距离: {verification_result['top_distance']:.2f} nm (误差: {verification_result['top_error']:.2f}%)")
            print(f"   下端距离: {verification_result['bottom_distance']:.2f} nm (误差: {verification_result['bottom_error']:.2f}%)")
            print(f"   整体达标: {'是' if verification_result['overall_success'] else '否'}")
        
        print(f"\n📈 优化统计:")
        print(f"   总函数评估次数: {len(self.optimization_history)}")
        print(f"   最佳误差: {self.best_error*100:.2f}%")
        
        # 保存历史数据
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        history_file = f"optimization_history_{timestamp}.json"
        
        report_data = {
            'optimization_results': optimization_results,
            'verification_result': verification_result,
            'optimization_history': self.optimization_history,
            'fixed_params': self.fixed_params,
            'targets': {
                'top_distance': self.target_top_distance,
                'bottom_distance': self.target_bottom_distance,
                'tolerance': self.tolerance
            },
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            with open(history_file, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
            print(f"💾 优化历史已保存至: {history_file}")
        except Exception as e:
            print(f"⚠️  无法保存历史文件: {e}")
        
        print("📋" * 30)
    
    def plot_optimization_progress(self, save_path=None):
        """
        绘制优化进程图
        
        Args:
            save_path: 保存路径，如果None则显示图表
        """
        if len(self.optimization_history) == 0:
            print("⚠️  没有优化历史数据可供绘制")
            return
        
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
        fig.suptitle('DILL模型参数优化进程', fontsize=16, fontweight='bold')
        
        # 提取数据
        iterations = range(len(self.optimization_history))
        errors = [h['total_error'] for h in self.optimization_history]
        C_values = [h['C'] for h in self.optimization_history]
        cd_values = [h['exposure_threshold'] for h in self.optimization_history]
        top_distances = [h['top_distance'] for h in self.optimization_history]
        bottom_distances = [h['bottom_distance'] for h in self.optimization_history]
        
        # 1. 误差收敛曲线
        ax1.plot(iterations, errors, 'b-', linewidth=2, alpha=0.7)
        ax1.axhline(y=self.tolerance*100, color='r', linestyle='--', alpha=0.8, label=f'目标容差({self.tolerance*100}%)')
        ax1.set_xlabel('迭代次数')
        ax1.set_ylabel('总误差 (%)')
        ax1.set_title('优化误差收敛')
        ax1.grid(True, alpha=0.3)
        ax1.legend()
        
        # 2. 参数演化
        ax2_twin = ax2.twinx()
        line1 = ax2.plot(iterations, C_values, 'g-', linewidth=2, label='C (曝光常数)')
        line2 = ax2_twin.plot(iterations, cd_values, 'r-', linewidth=2, label='cd (曝光阈值)')
        ax2.set_xlabel('迭代次数')
        ax2.set_ylabel('C值', color='g')
        ax2_twin.set_ylabel('cd值', color='r')
        ax2.set_title('参数演化过程')
        ax2.grid(True, alpha=0.3)
        
        # 合并图例
        lines1, labels1 = ax2.get_legend_handles_labels()
        lines2, labels2 = ax2_twin.get_legend_handles_labels()
        ax2.legend(lines1 + lines2, labels1 + labels2, loc='upper right')
        
        # 3. 距离追踪
        ax3.plot(iterations, top_distances, 'b-', linewidth=2, label='上端距离')
        ax3.plot(iterations, bottom_distances, 'r-', linewidth=2, label='下端距离')
        ax3.axhline(y=self.target_top_distance, color='b', linestyle='--', alpha=0.8, label=f'目标上端({self.target_top_distance}nm)')
        ax3.axhline(y=self.target_bottom_distance, color='r', linestyle='--', alpha=0.8, label=f'目标下端({self.target_bottom_distance}nm)')
        ax3.set_xlabel('迭代次数')
        ax3.set_ylabel('距离 (nm)')
        ax3.set_title('距离收敛过程')
        ax3.grid(True, alpha=0.3)
        ax3.legend()
        
        # 4. 参数空间探索
        sc = ax4.scatter(C_values, cd_values, c=errors, cmap='viridis_r', alpha=0.7, s=50)
        ax4.set_xlabel('C (曝光常数)')
        ax4.set_ylabel('cd (曝光阈值)')
        ax4.set_title('参数空间探索')
        ax4.grid(True, alpha=0.3)
        
        # 标记最佳点
        if self.best_params:
            ax4.scatter(self.best_params['C'], self.best_params['exposure_threshold'], 
                       c='red', s=200, marker='*', label='最佳解', edgecolors='white', linewidth=2)
            ax4.legend()
        
        plt.colorbar(sc, ax=ax4, label='误差 (%)')
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"📊 优化进程图已保存至: {save_path}")
        else:
            plt.show()
    
    def run_full_optimization(self):
        """
        运行完整的优化流程
        
        Returns:
            dict: 最终优化结果
        """
        print("🚀 开始完整优化流程...")
        
        optimization_results = []
        
        # 1. 差分进化全局优化
        print("\n" + "="*50)
        print("第1阶段：差分进化全局优化")
        print("="*50)
        
        de_result = self.optimize_differential_evolution(maxiter=50)  # 增加迭代次数寻找平衡解
        if de_result:
            optimization_results.append(de_result)
            
            # 2. 基于全局优化结果的局部精细搜索
            print("\n" + "="*50)
            print("第2阶段：局部精细搜索")
            print("="*50)
            
            local_result = self.optimize_local_search(
                initial_guess=[de_result['optimal_C'], de_result['optimal_cd']],
                method='L-BFGS-B'
            )
            if local_result:
                optimization_results.append(local_result)
        
        # 选择最佳结果
        if optimization_results:
            best_result = min(optimization_results, key=lambda x: x['final_error'])
            optimal_C = best_result['optimal_C']
            optimal_cd = best_result['optimal_cd']
        else:
            print("❌ 所有优化方法都失败了")
            return None
        
        # 3. 验证最终解
        print("\n" + "="*50)
        print("第3阶段：解决方案验证")
        print("="*50)
        
        verification_result = self.verify_solution(optimal_C, optimal_cd)
        
        # 4. 生成报告
        print("\n" + "="*50)
        print("第4阶段：生成优化报告")
        print("="*50)
        
        self.generate_report(optimization_results, verification_result)
        
        # 5. 绘制优化进程图
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        plot_path = f"optimization_progress_{timestamp}.png"
        self.plot_optimization_progress(save_path=plot_path)
        
        return {
            'optimization_results': optimization_results,
            'verification_result': verification_result,
            'best_params': self.best_params,
            'best_error': self.best_error
        }

def main():
    """主函数"""
    print("🎯 DILL模型参数自动优化工具启动")
    
    # 检查服务器连接
    server_url = "http://localhost:8080"
    
    try:
        response = requests.get(f"{server_url}/", timeout=5)
        print(f"✅ DILL服务器连接正常: {server_url}")
    except requests.RequestException:
        print(f"❌ 无法连接到DILL服务器: {server_url}")
        print("请确保DILL服务器正在运行 (python run.py)")
        return
    
    # 创建优化器
    optimizer = DillCDOptimizer(server_url=server_url)
    
    # 首先分析当前参数下的曝光剂量范围
    print("\\n📊 预分析：检查曝光剂量范围")
    min_dose, max_dose, mean_dose = optimizer.get_exposure_dose_range()
    
    if min_dose is not None:
        # 根据分析结果动态调整参数范围
        suggested_cd_min = max(5.0, min_dose * 0.7)
        suggested_cd_max = min(45.0, max_dose * 0.9) 
        
        print(f"\\n💡 根据曝光剂量分析，建议调整参数范围:")
        print(f"   原cd范围: {optimizer.param_ranges['exposure_threshold']}")
        print(f"   建议cd范围: ({suggested_cd_min:.1f}, {suggested_cd_max:.1f})")
        
        # 更新参数范围
        optimizer.param_ranges['exposure_threshold'] = (suggested_cd_min, suggested_cd_max)
        print(f"✅ 已更新参数范围")
    
    # 运行优化
    result = optimizer.run_full_optimization()
    
    if result and result['verification_result']['overall_success']:
        print("\n🎉 优化成功完成!")
        best_params = result['best_params']
        verification = result['verification_result']
        
        print(f"🏆 最终优化参数:")
        print(f"   曝光常数 C: {best_params['C']:.6f}")
        print(f"   曝光阈值 cd: {best_params['exposure_threshold']:.2f}")
        print(f"   上端距离: {verification['top_distance']:.2f} nm (目标: {verification['target_top']:.2f} nm)")
        print(f"   下端距离: {verification['bottom_distance']:.2f} nm (目标: {verification['target_bottom']:.2f} nm)")
        print(f"   误差: 上端 {verification['top_error']:.2f}%, 下端 {verification['bottom_error']:.2f}%")
    else:
        print("\n⚠️  优化未能达到目标精度，但已找到最佳解")
        if result and result['best_params']:
            print(f"最佳参数: C={result['best_params']['C']:.6f}, cd={result['best_params']['exposure_threshold']:.2f}")
            print(f"最佳误差: {result['best_error']*100:.2f}%")

if __name__ == "__main__":
    main()
