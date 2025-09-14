#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DILL模型参数空间深度分析工具

用于系统性地探索C和cd参数空间，理解为什么无法同时达到两个目标
生成参数空间地图、等高线图和Pareto前沿分析

作者：AI Assistant  
日期：2025年
"""

import sys
import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.patches import Circle
import requests
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from scipy.spatial.distance import cdist
from scipy.signal import find_peaks

# 添加项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# 导入现有的优化器类来重用测量功能
from cd_c_optimizer import DillCDOptimizer

class ParameterSpaceAnalyzer:
    """DILL模型参数空间深度分析器"""
    
    def __init__(self, server_url="http://localhost:8080"):
        """初始化分析器"""
        self.server_url = server_url
        self.optimizer = DillCDOptimizer(server_url)
        
        # 分析参数
        self.c_range = (0.001, 0.12)      # C参数范围 
        self.cd_range = (5, 45)           # cd参数范围
        self.target_top = 109.4           # 目标上端距离
        self.target_bottom = 82.62        # 目标下端距离
        
        # 存储分析结果
        self.results = {}
        
        print("🔬 参数空间深度分析器初始化完成")
        print(f"   服务器: {server_url}")
        print(f"   C范围: {self.c_range}")  
        print(f"   cd范围: {self.cd_range}")
        print(f"   目标: 上端={self.target_top}nm, 下端={self.target_bottom}nm")
    
    def sample_parameter_grid(self, c_points=20, cd_points=20, max_workers=4):
        """
        系统性地采样参数空间
        
        Args:
            c_points: C参数采样点数
            cd_points: cd参数采样点数  
            max_workers: 并行线程数
            
        Returns:
            dict: 包含所有采样结果的字典
        """
        print(f"\n🗺️  开始参数空间网格采样")
        print(f"   网格大小: {c_points} × {cd_points} = {c_points*cd_points}个点")
        print(f"   并行线程: {max_workers}")
        
        # 生成参数网格
        c_values = np.linspace(self.c_range[0], self.c_range[1], c_points)
        cd_values = np.linspace(self.cd_range[0], self.cd_range[1], cd_points)
        
        C_grid, CD_grid = np.meshgrid(c_values, cd_values)
        
        # 准备采样点列表
        sample_points = []
        for i in range(c_points):
            for j in range(cd_points):
                sample_points.append((C_grid[j,i], CD_grid[j,i], i, j))
        
        # 初始化结果数组
        top_distances = np.full((cd_points, c_points), np.nan)
        bottom_distances = np.full((cd_points, c_points), np.nan)
        success_map = np.full((cd_points, c_points), False, dtype=bool)
        
        # 多线程并行采样
        completed_count = 0
        failed_count = 0
        
        def sample_single_point(params):
            C, cd, i, j = params
            try:
                # 调用DILL API
                x_coords, thickness = self.optimizer.call_dill_api(C, cd)
                if x_coords is None or thickness is None:
                    return (i, j, None, None, False)
                
                # 测量距离
                top_dist, bottom_dist, success = self.optimizer.analyze_morphology_distances(x_coords, thickness)
                
                if success and top_dist is not None and bottom_dist is not None:
                    return (i, j, top_dist, bottom_dist, True)
                else:
                    return (i, j, None, None, False)
                    
            except Exception as e:
                return (i, j, None, None, False)
        
        print("\n📊 开始并行采样...")
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 提交所有任务
            future_to_params = {executor.submit(sample_single_point, params): params 
                               for params in sample_points}
            
            # 收集结果
            for future in as_completed(future_to_params):
                i, j, top_dist, bottom_dist, success = future.result()
                
                if success:
                    top_distances[j, i] = top_dist
                    bottom_distances[j, i] = bottom_dist  
                    success_map[j, i] = True
                    completed_count += 1
                else:
                    failed_count += 1
                
                # 进度报告
                total_completed = completed_count + failed_count
                if total_completed % 50 == 0 or total_completed == len(sample_points):
                    elapsed = time.time() - start_time
                    progress = total_completed / len(sample_points) * 100
                    print(f"   进度: {total_completed}/{len(sample_points)} ({progress:.1f}%) "
                          f"成功: {completed_count}, 失败: {failed_count}, "
                          f"用时: {elapsed:.1f}s")
        
        elapsed_total = time.time() - start_time
        print(f"✅ 参数空间采样完成!")
        print(f"   总用时: {elapsed_total:.1f}秒")
        print(f"   成功点数: {completed_count}/{len(sample_points)} ({completed_count/len(sample_points)*100:.1f}%)")
        
        # 存储结果
        self.results = {
            'c_values': c_values,
            'cd_values': cd_values, 
            'C_grid': C_grid,
            'CD_grid': CD_grid,
            'top_distances': top_distances,
            'bottom_distances': bottom_distances,
            'success_map': success_map,
            'completed_count': completed_count,
            'failed_count': failed_count,
            'sampling_time': elapsed_total
        }
        
        return self.results
    
    def create_parameter_space_visualization(self, save_path=None):
        """
        创建参数空间可视化图表
        
        Args:
            save_path: 保存路径，如果为None则自动生成
        """
        if not self.results:
            print("❌ 请先运行sample_parameter_grid()生成数据")
            return None
        
        print("\n🎨 创建参数空间可视化...")
        
        # 提取数据
        C_grid = self.results['C_grid'] 
        CD_grid = self.results['CD_grid']
        top_distances = self.results['top_distances']
        bottom_distances = self.results['bottom_distances']
        success_map = self.results['success_map']
        
        # 创建图表
        fig, axes = plt.subplots(2, 3, figsize=(18, 12))
        fig.suptitle('DILL模型参数空间深度分析', fontsize=16, y=0.95)
        
        # 1. 上端距离等高线图
        ax1 = axes[0, 0]
        masked_top = np.ma.masked_where(~success_map, top_distances)
        im1 = ax1.contourf(C_grid, CD_grid, masked_top, levels=20, cmap='viridis')
        contour1 = ax1.contour(C_grid, CD_grid, masked_top, levels=[self.target_top], colors='red', linewidths=2)
        ax1.clabel(contour1, inline=True, fontsize=10, fmt='%.1f')
        ax1.set_xlabel('曝光常数 C')
        ax1.set_ylabel('曝光阈值 cd (mJ/cm²)')
        ax1.set_title(f'上端距离分布 (目标: {self.target_top}nm)')
        plt.colorbar(im1, ax=ax1, label='距离 (nm)')
        
        # 2. 下端距离等高线图  
        ax2 = axes[0, 1]
        masked_bottom = np.ma.masked_where(~success_map, bottom_distances)
        im2 = ax2.contourf(C_grid, CD_grid, masked_bottom, levels=20, cmap='plasma')
        contour2 = ax2.contour(C_grid, CD_grid, masked_bottom, levels=[self.target_bottom], colors='red', linewidths=2)
        ax2.clabel(contour2, inline=True, fontsize=10, fmt='%.1f')
        ax2.set_xlabel('曝光常数 C')
        ax2.set_ylabel('曝光阈值 cd (mJ/cm²)')
        ax2.set_title(f'下端距离分布 (目标: {self.target_bottom}nm)')
        plt.colorbar(im2, ax=ax2, label='距离 (nm)')
        
        # 3. 综合误差图
        ax3 = axes[0, 2]
        top_error = np.abs(masked_top - self.target_top) / self.target_top
        bottom_error = np.abs(masked_bottom - self.target_bottom) / self.target_bottom  
        combined_error = (top_error + bottom_error) / 2
        im3 = ax3.contourf(C_grid, CD_grid, combined_error, levels=20, cmap='Reds')
        contour3 = ax3.contour(C_grid, CD_grid, combined_error, levels=[0.05], colors='green', linewidths=2)
        ax3.set_xlabel('曝光常数 C')
        ax3.set_ylabel('曝光阈值 cd (mJ/cm²)') 
        ax3.set_title('综合相对误差 (绿线: 5%目标)')
        plt.colorbar(im3, ax=ax3, label='相对误差')
        
        # 4. 目标可达性分析
        ax4 = axes[1, 0]
        top_achievable = np.abs(masked_top - self.target_top) <= self.target_top * 0.05
        bottom_achievable = np.abs(masked_bottom - self.target_bottom) <= self.target_bottom * 0.05
        both_achievable = top_achievable & bottom_achievable
        
        # 创建分类图
        achievement_map = np.zeros_like(success_map, dtype=int)
        achievement_map[success_map & top_achievable & ~bottom_achievable] = 1  # 只有上端达标
        achievement_map[success_map & ~top_achievable & bottom_achievable] = 2  # 只有下端达标  
        achievement_map[success_map & both_achievable] = 3                      # 两者都达标
        
        colors = ['white', 'lightblue', 'lightcoral', 'lightgreen']
        labels = ['无数据', '仅上端达标', '仅下端达标', '两者都达标']
        cmap = mcolors.ListedColormap(colors)
        bounds = [0, 1, 2, 3, 4]
        norm = mcolors.BoundaryNorm(bounds, cmap.N)
        
        im4 = ax4.imshow(achievement_map, extent=[C_grid.min(), C_grid.max(), 
                                                 CD_grid.min(), CD_grid.max()],
                        cmap=cmap, norm=norm, origin='lower', aspect='auto')
        ax4.set_xlabel('曝光常数 C')
        ax4.set_ylabel('曝光阈值 cd (mJ/cm²)')
        ax4.set_title('目标可达性分析 (5%容差)')
        
        # 添加图例
        from matplotlib.patches import Patch
        legend_elements = [Patch(facecolor=colors[i], label=labels[i]) for i in range(1, 4)]
        ax4.legend(handles=legend_elements, loc='upper right')
        
        # 5. Pareto前沿分析
        ax5 = axes[1, 1]
        valid_mask = success_map.flatten()
        if np.sum(valid_mask) > 0:
            top_errors_flat = top_error.flatten()[valid_mask] 
            bottom_errors_flat = bottom_error.flatten()[valid_mask]
            
            # 找到Pareto最优点
            pareto_points = self.find_pareto_optimal(top_errors_flat, bottom_errors_flat)
            
            scatter = ax5.scatter(top_errors_flat*100, bottom_errors_flat*100, 
                                 c='lightblue', alpha=0.6, s=20, label='所有参数点')
            ax5.scatter(top_errors_flat[pareto_points]*100, bottom_errors_flat[pareto_points]*100,
                       c='red', s=50, label=f'Pareto最优 ({len(pareto_points)}个点)', zorder=5)
            
            ax5.axhline(y=5, color='green', linestyle='--', alpha=0.7, label='5%目标线')
            ax5.axvline(x=5, color='green', linestyle='--', alpha=0.7)
            
            ax5.set_xlabel('上端相对误差 (%)')
            ax5.set_ylabel('下端相对误差 (%)')
            ax5.set_title('Pareto前沿分析')
            ax5.legend()
            ax5.grid(True, alpha=0.3)
        
        # 6. 统计摘要
        ax6 = axes[1, 2]
        ax6.axis('off')
        
        # 计算统计信息
        valid_points = np.sum(success_map)
        total_points = success_map.size
        
        if valid_points > 0:
            top_min, top_max = np.nanmin(masked_top), np.nanmax(masked_top)
            bottom_min, bottom_max = np.nanmin(masked_bottom), np.nanmax(masked_bottom)
            
            top_achievable_count = np.sum(top_achievable)
            bottom_achievable_count = np.sum(bottom_achievable)  
            both_achievable_count = np.sum(both_achievable)
            
            stats_text = f"""
📊 参数空间分析统计

🎯 采样信息:
• 总采样点: {total_points}
• 成功点数: {valid_points} ({valid_points/total_points*100:.1f}%)
• 采样时间: {self.results['sampling_time']:.1f}秒

📏 距离范围:
• 上端: {top_min:.1f} - {top_max:.1f} nm
• 下端: {bottom_min:.1f} - {bottom_max:.1f} nm

🎯 目标达成情况 (5%容差):
• 仅上端达标: {top_achievable_count-both_achievable_count} 点
• 仅下端达标: {bottom_achievable_count-both_achievable_count} 点  
• 两者都达标: {both_achievable_count} 点

💡 关键发现:
• 同时达标率: {both_achievable_count/valid_points*100:.1f}%
• Pareto最优解: {len(pareto_points) if 'pareto_points' in locals() else 0} 个
            """
        else:
            stats_text = "❌ 无有效数据点"
            
        ax6.text(0.05, 0.95, stats_text, transform=ax6.transAxes, fontsize=10,
                verticalalignment='top', fontfamily='monospace',
                bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.8))
        
        plt.tight_layout()
        
        # 保存图表
        if save_path is None:
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            save_path = f"parameter_space_analysis_{timestamp}.png"
        
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"📊 参数空间分析图已保存至: {save_path}")
        
        return save_path
    
    def find_pareto_optimal(self, obj1, obj2):
        """
        找到两个目标的Pareto最优解
        
        Args:
            obj1: 第一个目标值数组 (要最小化)
            obj2: 第二个目标值数组 (要最小化)
            
        Returns:
            np.array: Pareto最优点的索引
        """
        points = np.column_stack([obj1, obj2])
        pareto_points = []
        
        for i, point in enumerate(points):
            is_dominated = False
            for j, other_point in enumerate(points):
                if i != j:
                    # 检查是否被支配（其他点在两个目标上都不差于当前点，且至少一个目标更好）
                    if (np.all(other_point <= point) and np.any(other_point < point)):
                        is_dominated = True
                        break
            
            if not is_dominated:
                pareto_points.append(i)
        
        return np.array(pareto_points)
    
    def find_best_compromise_solutions(self, top_n=5):
        """
        找到最佳折中解决方案
        
        Args:
            top_n: 返回前n个最佳解决方案
            
        Returns:
            list: 最佳解决方案列表
        """
        if not self.results:
            print("❌ 请先运行sample_parameter_grid()生成数据")
            return []
        
        print(f"\n🏆 寻找前{top_n}个最佳折中解决方案...")
        
        C_grid = self.results['C_grid']
        CD_grid = self.results['CD_grid'] 
        top_distances = self.results['top_distances']
        bottom_distances = self.results['bottom_distances']
        success_map = self.results['success_map']
        
        solutions = []
        
        for i in range(C_grid.shape[0]):
            for j in range(C_grid.shape[1]):
                if success_map[i, j]:
                    C = C_grid[i, j]
                    cd = CD_grid[i, j]
                    top_dist = top_distances[i, j]  
                    bottom_dist = bottom_distances[i, j]
                    
                    # 计算误差
                    top_error = abs(top_dist - self.target_top) / self.target_top
                    bottom_error = abs(bottom_dist - self.target_bottom) / self.target_bottom
                    combined_error = (top_error + bottom_error) / 2
                    
                    solutions.append({
                        'C': C,
                        'cd': cd,
                        'top_distance': top_dist,
                        'bottom_distance': bottom_dist,
                        'top_error': top_error * 100,
                        'bottom_error': bottom_error * 100, 
                        'combined_error': combined_error * 100
                    })
        
        # 按综合误差排序
        solutions.sort(key=lambda x: x['combined_error'])
        
        print(f"✅ 找到{len(solutions)}个有效解，展示前{top_n}个最佳方案:")
        print()
        
        for i, sol in enumerate(solutions[:top_n]):
            print(f"🥇 方案 {i+1}:")
            print(f"   参数: C={sol['C']:.6f}, cd={sol['cd']:.2f} mJ/cm²")
            print(f"   距离: 上端={sol['top_distance']:.2f}nm, 下端={sol['bottom_distance']:.2f}nm") 
            print(f"   误差: 上端={sol['top_error']:.2f}%, 下端={sol['bottom_error']:.2f}%")
            print(f"   综合误差: {sol['combined_error']:.2f}%")
            
            # 达标情况
            top_ok = sol['top_error'] <= 5
            bottom_ok = sol['bottom_error'] <= 5
            both_ok = top_ok and bottom_ok
            
            status = "✅ 两者都达标" if both_ok else \
                    "🔶 仅上端达标" if top_ok else \
                    "🔶 仅下端达标" if bottom_ok else \
                    "❌ 都未达标"
            print(f"   状态: {status}")
            print()
        
        return solutions[:top_n]

def main():
    """主函数"""
    print("🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬")
    print("【DILL模型参数空间深度分析】") 
    print("🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬🔬")
    
    # 创建分析器
    analyzer = ParameterSpaceAnalyzer()
    
    # 执行网格采样 (可以调整网格密度和线程数)
    print("\n第1阶段：参数空间采样")
    print("="*50)
    results = analyzer.sample_parameter_grid(
        c_points=25,      # C方向25个点
        cd_points=25,     # cd方向25个点  
        max_workers=6     # 6个并行线程
    )
    
    # 创建可视化
    print("\n第2阶段：生成分析图表")
    print("="*50)
    viz_path = analyzer.create_parameter_space_visualization()
    
    # 找到最佳解决方案
    print("\n第3阶段：寻找最佳解决方案")
    print("="*50)
    best_solutions = analyzer.find_best_compromise_solutions(top_n=10)
    
    print("\n🎉 参数空间深度分析完成!")
    print(f"📊 分析图表: {viz_path}")
    print(f"🏆 最佳方案: {len(best_solutions)}个")

if __name__ == "__main__":
    main()
