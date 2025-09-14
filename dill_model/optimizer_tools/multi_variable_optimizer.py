#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DILL模型多变量优化器

现在可以同时优化4个变量：
1. 曝光常数 (C)
2. 曝光阈值 (cd)  
3. 基底材料种类
4. 抗反射薄膜 (ARC) 类型

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
from scipy.optimize import minimize, differential_evolution
from itertools import product
import pandas as pd

# 添加项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# 导入现有的优化器基础功能
from cd_c_optimizer import DillCDOptimizer

class MultiVariableOptimizer(DillCDOptimizer):
    """DILL模型多变量优化器 - 支持4个变量同时优化"""
    
    def __init__(self, server_url="http://localhost:8080"):
        """初始化多变量优化器"""
        super().__init__(server_url)
        
        print("🔧 多变量优化器初始化")
        print("   支持4个变量同时优化：C, cd, 基底材料, ARC材料")
        
        # 扩展参数定义
        self.substrate_materials = [
            'Silicon',  # 硅
            'Glass',    # 玻璃 (如果支持)
            'Quartz'    # 石英 (如果支持)
        ]
        
        self.arc_materials = [
            'SiON_interference',  # 氮氧化硅-干涉型
            'SiO2',              # 二氧化硅 (如果支持)
            'Si3N4',             # 氮化硅 (如果支持)
            'None'               # 无ARC层
        ]
        
        # 连续变量范围
        self.continuous_ranges = {
            'C': (0.001, 0.15),          # 曝光常数
            'exposure_threshold': (3, 50) # 曝光阈值
        }
        
        print(f"   基底材料选项: {self.substrate_materials}")
        print(f"   ARC材料选项: {self.arc_materials}")
        print(f"   连续参数范围: {self.continuous_ranges}")
    
    def call_dill_api_extended(self, C, cd, substrate='Silicon', arc='SiON_interference'):
        """
        扩展的DILL API调用，支持基底材料和ARC参数
        
        Args:
            C: 曝光常数
            cd: 曝光阈值  
            substrate: 基底材料类型
            arc: ARC材料类型
            
        Returns:
            tuple: (x_coords, thickness) 或 (None, None)
        """
        
        # 构建请求参数
        params = self.fixed_params.copy()
        params.update({
            'C': C,
            'exposure_threshold': cd,
            'substrate_material': substrate,
            'arc_material': arc
        })
        
        print(f"🔄 调用DILL API: C={C:.6f}, cd={cd:.2f}, 基底={substrate}, ARC={arc}")
        
        try:
            response = requests.post(
                f"{self.server_url}/api/calculate",
                json=params,
                timeout=self.timeout,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if not result.get('success', False):
                    print(f"❌ API返回失败: {result.get('message', '未知错误')}")
                    return None, None
                
                data = result.get('data', {})
                
                # 提取数据
                x_coords = None
                thickness = None
                
                for x_field in ['x', 'x_coords']:
                    if x_field in data and data[x_field]:
                        x_coords = np.array(data[x_field])
                        break
                
                for thickness_field in ['thickness', 'etch_depth', 'y']:
                    if thickness_field in data and data[thickness_field]:
                        thickness = np.array(data[thickness_field])
                        break
                
                if x_coords is not None and thickness is not None:
                    print(f"✅ API调用成功: {len(x_coords)}个数据点")
                    return x_coords, thickness
                else:
                    print("❌ 无法从API响应中提取有效数据")
                    return None, None
                    
            else:
                print(f"❌ API请求失败: HTTP {response.status_code}")
                return None, None
                
        except requests.RequestException as e:
            print(f"❌ API请求异常: {e}")
            return None, None
    
    def objective_function_extended(self, params_array, substrate='Silicon', arc='SiON_interference'):
        """
        扩展的目标函数，支持基底材料和ARC参数
        
        Args:
            params_array: [C, cd] 数组
            substrate: 基底材料
            arc: ARC材料
            
        Returns:
            float: 综合误差值
        """
        C, cd = params_array
        
        # 调用扩展API
        x_coords, thickness = self.call_dill_api_extended(C, cd, substrate, arc)
        
        if x_coords is None or thickness is None:
            print("   ❌ API调用失败，返回大误差值")
            return 1000
        
        # 检查是否有形貌变化
        if np.std(thickness) < 1e-10:
            print(f"   ❌ 无形貌变化！基底={substrate}, ARC={arc}, cd={cd:.1f}")
            return 1000
        
        # 分析形貌分布
        top_dist, bottom_dist, success = self.analyze_morphology_distances(x_coords, thickness)
        
        if not success:
            print("   ❌ 形貌分析失败，返回大误差值")
            return 1000
        
        # 计算误差
        top_error = abs(top_dist - self.target_top_distance) / self.target_top_distance
        bottom_error = abs(bottom_dist - self.target_bottom_distance) / self.target_bottom_distance
        
        # 自适应权重策略
        if top_error > bottom_error * 2:
            top_weight, bottom_weight = 0.75, 0.25
        elif bottom_error > top_error * 2:
            top_weight, bottom_weight = 0.25, 0.75  
        else:
            top_weight, bottom_weight = 0.5, 0.5
        
        total_error = top_weight * top_error + bottom_weight * bottom_error
        
        # 显示详细信息
        if total_error < 1.0:
            print(f"   ⚖️  权重策略: 上端={top_weight:.2f}, 下端={bottom_weight:.2f}")
        
        print(f"📊 当前误差: {total_error*100:.2f}% (上端: {top_error*100:.2f}%, 下端: {bottom_error*100:.2f}%)")
        
        # 记录结果
        result_data = {
            'C': C,
            'cd': cd,
            'substrate': substrate,
            'arc': arc,
            'top_distance': top_dist,
            'bottom_distance': bottom_dist,
            'top_error': top_error * 100,
            'bottom_error': bottom_error * 100,
            'total_error': total_error * 100,
            'weights': (top_weight, bottom_weight)
        }
        self.optimization_history.append(result_data)
        
        return total_error
    
    def optimize_material_combinations(self, max_combinations=6):
        """
        优化材料组合及其对应的最佳C、cd参数
        
        Args:
            max_combinations: 最多测试的材料组合数
            
        Returns:
            list: 每种材料组合的最佳结果
        """
        print("\n🧪 开始材料组合优化")
        print("="*60)
        
        # 生成材料组合
        all_combinations = list(product(self.substrate_materials, self.arc_materials))
        
        # 限制组合数量（避免时间过长）
        if len(all_combinations) > max_combinations:
            combinations = all_combinations[:max_combinations]
            print(f"📊 从{len(all_combinations)}个组合中选择前{max_combinations}个进行测试")
        else:
            combinations = all_combinations
            
        print(f"🔬 将测试{len(combinations)}个材料组合")
        
        results = []
        
        for i, (substrate, arc) in enumerate(combinations, 1):
            print(f"\n{'='*20} 组合 {i}/{len(combinations)} {'='*20}")
            print(f"🧬 基底材料: {substrate}")
            print(f"🎭 ARC材料: {arc}")
            
            try:
                # 为每个材料组合优化C和cd参数
                bounds = [
                    self.continuous_ranges['C'],
                    self.continuous_ranges['exposure_threshold']
                ]
                
                # 定义适用于当前材料组合的目标函数
                def objective_for_materials(params):
                    return self.objective_function_extended(params, substrate, arc)
                
                print("🎯 开始参数优化...")
                start_time = time.time()
                
                # 使用差分进化算法
                result = differential_evolution(
                    objective_for_materials,
                    bounds,
                    maxiter=30,
                    popsize=15,
                    seed=42,
                    polish=True,
                    disp=False
                )
                
                optimization_time = time.time() - start_time
                
                if result.success:
                    optimal_C, optimal_cd = result.x
                    final_error = result.fun
                    
                    print(f"✅ 优化成功!")
                    print(f"   最优参数: C={optimal_C:.6f}, cd={optimal_cd:.2f}")
                    print(f"   最终误差: {final_error*100:.2f}%")
                    print(f"   优化时间: {optimization_time:.1f}秒")
                    
                    # 验证最优参数
                    x_coords, thickness = self.call_dill_api_extended(
                        optimal_C, optimal_cd, substrate, arc
                    )
                    
                    if x_coords is not None and thickness is not None:
                        top_dist, bottom_dist, success = self.analyze_morphology_distances(
                            x_coords, thickness
                        )
                        
                        if success:
                            top_error = abs(top_dist - self.target_top_distance) / self.target_top_distance * 100
                            bottom_error = abs(bottom_dist - self.target_bottom_distance) / self.target_bottom_distance * 100
                            
                            results.append({
                                'substrate': substrate,
                                'arc': arc,
                                'optimal_C': optimal_C,
                                'optimal_cd': optimal_cd,
                                'top_distance': top_dist,
                                'bottom_distance': bottom_dist,
                                'top_error': top_error,
                                'bottom_error': bottom_error,
                                'total_error': final_error * 100,
                                'optimization_time': optimization_time,
                                'success': True
                            })
                        else:
                            print("❌ 验证阶段形貌分析失败")
                    else:
                        print("❌ 验证阶段API调用失败")
                else:
                    print(f"❌ 优化失败: {result.message}")
                    results.append({
                        'substrate': substrate,
                        'arc': arc,
                        'success': False,
                        'error_message': result.message
                    })
                    
            except Exception as e:
                print(f"❌ 组合优化异常: {e}")
                results.append({
                    'substrate': substrate,
                    'arc': arc,
                    'success': False,
                    'error_message': str(e)
                })
        
        return results
    
    def generate_comprehensive_report(self, results):
        """
        生成综合优化报告
        
        Args:
            results: 优化结果列表
        """
        print("\n" + "="*80)
        print("【DILL模型 4变量优化综合报告】")
        print("="*80)
        
        # 过滤成功的结果
        successful_results = [r for r in results if r.get('success', False)]
        
        if not successful_results:
            print("❌ 没有成功的优化结果")
            return
        
        # 按总误差排序
        successful_results.sort(key=lambda x: x['total_error'])
        
        print(f"📊 成功优化的材料组合: {len(successful_results)}/{len(results)}")
        print(f"🎯 优化目标: 上端{self.target_top_distance}nm, 下端{self.target_bottom_distance}nm")
        print()
        
        # 显示最佳结果
        print("🏆 最佳结果 TOP 5:")
        print("-" * 80)
        
        for i, result in enumerate(successful_results[:5], 1):
            top_ok = result['top_error'] <= 5
            bottom_ok = result['bottom_error'] <= 5
            both_ok = top_ok and bottom_ok
            
            status = "✅ 两者都达标" if both_ok else \
                    "🔶 仅上端达标" if top_ok else \
                    "🔶 仅下端达标" if bottom_ok else \
                    "❌ 都未达标"
            
            print(f"🥇 排名 {i}:")
            print(f"   材料组合: {result['substrate']} + {result['arc']}")
            print(f"   最优参数: C={result['optimal_C']:.6f}, cd={result['optimal_cd']:.2f}")
            print(f"   距离结果: 上端={result['top_distance']:.2f}nm, 下端={result['bottom_distance']:.2f}nm")
            print(f"   误差分析: 上端={result['top_error']:.2f}%, 下端={result['bottom_error']:.2f}%")
            print(f"   综合误差: {result['total_error']:.2f}%")
            print(f"   优化时间: {result['optimization_time']:.1f}秒")
            print(f"   状态: {status}")
            print()
        
        # 材料分析
        print("🧬 材料影响分析:")
        print("-" * 40)
        
        # 基底材料影响
        substrate_performance = {}
        for result in successful_results:
            substrate = result['substrate']
            if substrate not in substrate_performance:
                substrate_performance[substrate] = []
            substrate_performance[substrate].append(result['total_error'])
        
        print("基底材料平均性能:")
        for substrate, errors in substrate_performance.items():
            avg_error = np.mean(errors)
            min_error = np.min(errors)
            print(f"  {substrate}: 平均误差 {avg_error:.2f}%, 最佳 {min_error:.2f}%")
        
        # ARC材料影响
        arc_performance = {}
        for result in successful_results:
            arc = result['arc']
            if arc not in arc_performance:
                arc_performance[arc] = []
            arc_performance[arc].append(result['total_error'])
        
        print("\nARC材料平均性能:")
        for arc, errors in arc_performance.items():
            avg_error = np.mean(errors)
            min_error = np.min(errors)
            print(f"  {arc}: 平均误差 {avg_error:.2f}%, 最佳 {min_error:.2f}%")
        
        # 保存结果到CSV
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        csv_filename = f"multi_variable_optimization_{timestamp}.csv"
        
        df = pd.DataFrame(successful_results)
        df.to_csv(csv_filename, index=False, encoding='utf-8')
        print(f"\n💾 详细结果已保存至: {csv_filename}")
        
        return successful_results

def main():
    """主函数"""
    print("🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀")
    print("【DILL模型 4变量同时优化】")
    print("🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀")
    
    # 创建多变量优化器
    optimizer = MultiVariableOptimizer()
    
    # 优化所有材料组合
    print("\n第1阶段：材料组合优化")
    print("="*60)
    
    results = optimizer.optimize_material_combinations(max_combinations=8)
    
    # 生成综合报告
    print("\n第2阶段：生成综合报告")  
    print("="*60)
    
    best_results = optimizer.generate_comprehensive_report(results)
    
    print("\n🎉 4变量优化完成!")
    if best_results:
        best = best_results[0]
        print(f"🏆 最佳组合: {best['substrate']} + {best['arc']}")
        print(f"📊 最佳参数: C={best['optimal_C']:.6f}, cd={best['optimal_cd']:.2f}")
        print(f"🎯 最佳误差: {best['total_error']:.2f}%")

if __name__ == "__main__":
    main()

