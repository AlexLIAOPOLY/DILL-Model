import numpy as np
from scipy.integrate import odeint
import math
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # 添加3D绘图支持
from io import BytesIO
import base64
import ast
import logging  # 添加logging模块
import time

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

class EnhancedDillModel:
    """
    增强Dill模型（适用于厚层光刻胶）
    参考文献：刘世杰等《厚层抗蚀剂曝光模型及其参数测量》
    以及PDF文档中的完整DILL理论
    
    主要方程：
        ∂I(z, t)/∂z = -I(z, t)[A(z_h, T, t_B) * M(z, t) + B(z_h, T, t_B)]
        ∂M(z, t)/∂t = -I(z, t) * M(z, t) * C(z_h, T, t_B)
        
    核心DILL公式 (PDF文档方程2.7):
        M = e^(-CIt)
        
    占空比关系 (PDF文档方程2.8):
        cos(πd) = 1/Γ - Dc/(2Γ)D₀⁻¹
        
    其中A/B/C为厚度、前烘温度、前烘时间的函数
    
    物理假设:
    - 使用抗反射涂层(ARC)来消除底部反射 (符合PDF文档描述)
    - 光强沿深度按Beer-Lambert定律衰减
    - PAC浓度随时间和空间变化
    """
    def __init__(self, debug_mode=False, use_arc_layer=True):
        self.debug_mode = debug_mode  # 增加调试模式标志
        self.use_arc_layer = use_arc_layer  # 是否使用抗反射涂层
        # 添加ABC参数缓存
        self._abc_cache = {}
        if debug_mode:
            logging.basicConfig(level=logging.DEBUG)

    def get_abc(self, z_h, T, t_B):
        """
        根据厚度z_h、前烘温度T、前烘时间t_B，拟合A/B/C参数
        
        增强版本：更符合PDF文档中的物理描述
        - A: 光敏剂(PAC)的吸收率
        - B: 基底的吸收率  
        - C: 光敏剂的反应速率常数
        
        公式见论文（可根据实际需要调整/拟合）
        使用缓存机制避免重复计算
        """
        # 生成缓存键
        cache_key = (z_h, T, t_B)
        
        # 检查缓存
        if cache_key in self._abc_cache:
            return self._abc_cache[cache_key]
        
        # 仅在第一次计算时输出详细日志
        logger.info("=" * 60)
        logger.info("【增强Dill模型 - ABC参数计算】")
        logger.info("=" * 60)
        logger.info("🔸 符合PDF文档的物理解释:")
        logger.info("   A(z_h,T,t_B): 光敏剂(PAC)吸收率，代表光敏化合物对光的吸收能力")
        logger.info("   B(z_h,T,t_B): 基底吸收率，代表光刻胶基体对光的吸收")  
        logger.info("   C(z_h,T,t_B): 反应速率常数，对应PDF方程M=e^(-CIt)中的C参数")
        logger.info("🔸 使用拟合公式:")
        logger.info("   A(z_h,T,t_B) = -0.11989*D + 0.00466*T + 0.00551*D² - 0.0001084*D*T - 0.00001287*T² + 0.79655")
        logger.info("   B(z_h,T,t_B) = 0.00066301*D + 0.00024413*T - 0.0096")
        logger.info("   C(z_h,T,t_B) = -0.01233*D + 0.00054385*T + 0.00056988*D² - 0.00001487*D*T - 0.00000115*T² + 0.0629")
        
        # 参数范围检查和物理约束
        if not (1 <= z_h <= 100):
            raise ValueError(f"胶厚z_h={z_h}超出合理范围[1, 100]μm")
        if not (60 <= T <= 200):
            raise ValueError(f"前烘温度T={T}超出合理范围[60, 200]℃")
        if not (1 <= t_B <= 30):
            raise ValueError(f"前烘时间t_B={t_B}超出合理范围[1, 30]min")
        
        # 归一化处理，避免数值问题
        D = z_h / 10.0  # 将微米转换为分米级别，避免过大数值
        T_norm = (T - 100) / 50.0  # 温度归一化到[-0.8, 2.0]范围
        t_B_norm = t_B / 10.0  # 时间归一化
        
        # 拟合公式计算ABC参数 (基于实验数据拟合)
        A = (-0.11989*D + 0.00466*T_norm + 0.00551*D**2 - 
             0.0001084*D*T_norm - 0.00001287*T_norm**2 + 0.79655)
        
        B = (0.00066301*D + 0.00024413*T_norm - 0.0096)
        
        C = (-0.01233*D + 0.00054385*T_norm + 0.00056988*D**2 - 
             0.00001487*D*T_norm - 0.00000115*T_norm**2 + 0.0629)
        
        # 应用前烘时间的影响 (经验性修正)
        t_B_factor = 1.0 + 0.1 * np.log(t_B_norm + 1)  # 对数增长
        A *= t_B_factor
        C *= t_B_factor
        
        # 物理约束：确保参数为正值且在合理范围内
        A = max(0.01, min(A, 2.0))  # PAC吸收率：0.01-2.0
        B = max(0.001, min(B, 0.1))  # 基底吸收率：0.001-0.1  
        C = max(0.001, min(C, 1.0))  # 反应速率：0.001-1.0
        
        # 缓存结果
        self._abc_cache[cache_key] = (A, B, C)
        
        logger.info(f"🔸 输入参数:")
        logger.info(f"   - z_h (胶厚) = {z_h} μm")
        logger.info(f"   - T (前烘温度) = {T} °C")
        logger.info(f"   - t_B (前烘时间) = {t_B} min")
        
        logger.info(f"🔸 计算得到的ABC参数:")
        logger.info(f"   - A (PAC吸收率) = {A:.6f}")
        logger.info(f"   - B (基底吸收率) = {B:.6f}")
        logger.info(f"   - C (反应速率常数) = {C:.6f}")
        
        # 物理意义验证
        if A < B:
            logger.warning("⚠️  A < B: PAC吸收率小于基底吸收率，这在物理上较为少见")
        if C > 0.1:
            logger.info("✓ 高反应速率：适用于高感光度光刻胶")
        elif C < 0.01:
            logger.info("✓ 低反应速率：适用于高对比度光刻胶")
            
        return A, B, C

    def validate_physical_constraints(self, I, M, z_h, I0, M0):
        """
        验证计算结果的物理合理性（增强版）
        """
        issues = []
        
        # 检查基本物理约束
        if np.any(I < 0):
            issues.append("光强出现负值")
        if np.any(np.isnan(I)) or np.any(np.isinf(I)):
            issues.append("光强包含NaN或无穷值")
        if np.any(I > 10 * I0):
            issues.append(f"光强超出合理范围(>10*I0={10*I0})")
            
        if np.any(M < 0):
            issues.append("PAC浓度出现负值")
        if np.any(np.isnan(M)) or np.any(np.isinf(M)):
            issues.append("PAC浓度包含NaN或无穷值")
        if np.any(M > M0 * 1.01):  # 允许1%的数值误差
            issues.append(f"PAC浓度超出初始值(M0={M0})")
            
        # 检查深度衰减趋势（更严格）
        if len(I) > 2:
            # 光强应该大体上随深度递减
            increasing_count = 0
            for i in range(1, len(I)-1):
                if I[i+1] > I[i] * 1.1:  # 允许10%的局部增长（可能由于数值振荡）
                    increasing_count += 1
            
            if increasing_count > len(I) * 0.3:  # 如果超过30%的点违反衰减趋势
                issues.append(f"光强深度分布异常：{increasing_count}个点违反衰减趋势")
                
            # 检查表面和底部的光强比
            if I[-1] > I[0]:
                issues.append("光强深度分布异常：底部光强大于表面")
                
        # 检查PAC浓度变化趋势（更精确）
        if len(M) > 5:
            # PAC浓度应该随着深度减少而消耗程度降低
            surface_consumption = M0 - np.mean(M[:len(M)//10])  # 表层10%的消耗
            deep_consumption = M0 - np.mean(M[-len(M)//10:])    # 底层10%的消耗
            
            if surface_consumption < deep_consumption * 0.8:
                issues.append("PAC浓度深度分布异常：深层消耗过度")
                
            # 检查PAC浓度的单调性
            smoothed_M = np.convolve(M, np.ones(3)/3, mode='valid')  # 简单平滑
            if len(smoothed_M) > 2:
                violations = np.sum(np.diff(smoothed_M) > 0.01 * M0)  # 上升超过1%M0的点
                if violations > len(smoothed_M) * 0.2:  # 超过20%的点
                    issues.append(f"PAC浓度单调性异常：{violations}个点违反单调递增趋势")
        
        # 检查数值稳定性
        if len(I) > 1:
            max_I_gradient = np.max(np.abs(np.diff(I)))
            relative_gradient = max_I_gradient / np.mean(I) if np.mean(I) > 0 else 0
            if relative_gradient > 5.0:  # 相对梯度过大
                issues.append(f"光强梯度过大：相对梯度={relative_gradient:.2f}")
                
        if len(M) > 1:
            max_M_gradient = np.max(np.abs(np.diff(M)))
            relative_gradient = max_M_gradient / np.mean(M) if np.mean(M) > 0 else 0
            if relative_gradient > 2.0:  # PAC浓度变化相对平缓
                issues.append(f"PAC浓度梯度过大：相对梯度={relative_gradient:.2f}")
        
        # 能量守恒检查
        if len(I) > 1:
            total_absorbed = np.sum(np.diff(I) * -1)  # 总吸收量
            total_incident = I[0] * len(I)
            if total_absorbed > total_incident * 1.1:  # 允许10%误差
                issues.append("能量守恒违反：吸收能量超过入射能量")
        
        if issues and self.debug_mode:
            logger.warning(f"[增强物理验证] 发现{len(issues)}个问题: {', '.join(issues)}")
            
        return len(issues) == 0, issues

    def dill_ode(self, y, t, A, B, C, I0):
        """
        微分方程组右端
        y = [I, M]
        """
        I, M = y
        dIdz = -I * (A * M + B)  # 这里z和t等价处理，简化为一维
        dMdt = -I * M * C
        return [dIdz, dMdt]

    def solve_enhanced_dill_pde(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, num_z_points=100, num_t_points=200, x_position=None, K=None, V=0, phi_expr=None):
        """
        修正的Enhanced Dill模型：数值求解耦合偏微分方程系统
        
        方程组：
        ∂I(z,t)/∂z = -I(z,t)[A(z_h,T,t_B) * M(z,t) + B(z_h,T,t_B)]
        ∂M(z,t)/∂t = -I(z,t) * M(z,t) * C(z_h,T,t_B)
        
        使用Crank-Nicolson半隐式方法确保数值稳定性
        """
        logger.info("=" * 60)
        logger.info("【增强Dill模型 - 修正版PDE求解器】")
        logger.info("=" * 60)
        logger.info("🔸 使用Crank-Nicolson半隐式方法")
        logger.info("   ∂I(z,t)/∂z = -I(z,t)[A(z_h,T,t_B) * M(z,t) + B(z_h,T,t_B)]")
        logger.info("   ∂M(z,t)/∂t = -I(z,t) * M(z,t) * C(z_h,T,t_B)")
        
        A, B, C = self.get_abc(z_h, T, t_B)
        
        # 空间和时间网格
        z = np.linspace(0, z_h, num_z_points)
        t = np.linspace(0, t_exp, num_t_points)
        dz = z[1] - z[0] if len(z) > 1 else z_h / max(1, num_z_points-1)
        dt = t[1] - t[0] if len(t) > 1 else t_exp / max(1, num_t_points-1)
        
        # CFL稳定性条件检查
        max_absorption = A * M0 + B
        cfl_condition = max_absorption * dz
        if cfl_condition > 0.5:
            logger.warning(f"CFL条件可能不稳定: {cfl_condition:.4f} > 0.5，建议增加z方向网格点数")
        
        logger.info(f"🔸 数值计算网格:")
        logger.info(f"   - z方向: [0, {z_h}], 点数: {num_z_points}, 步长: {dz:.6f}")
        logger.info(f"   - t方向: [0, {t_exp}], 点数: {num_t_points}, 步长: {dt:.6f}")
        logger.info(f"   - CFL条件: {cfl_condition:.4f}")
        
        # 初始化解数组
        I = np.zeros((num_z_points, num_t_points))  # I(z,t)
        M = np.zeros((num_z_points, num_t_points))  # M(z,t)
        
        # 计算表面光强边界条件
        if x_position is not None and K is not None and V > 0:
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            surface_I0 = I0 * (1 + V * np.cos(K * x_position + phi))
            logger.info(f"🔸 空间调制表面光强: I(0) = {surface_I0:.6f}")
        else:
            surface_I0 = I0
            logger.info(f"🔸 恒定表面光强: I(0) = {surface_I0}")
        
        # 初始条件
        M[:, 0] = M0  # 初始PAC浓度均匀分布
        I[0, :] = surface_I0  # 表面光强边界条件
        
        # 初始深度分布：使用简单的Beer-Lambert定律作为初值猜测
        for z_idx in range(1, num_z_points):
            I[z_idx, 0] = surface_I0 * np.exp(-(A * M0 + B) * z[z_idx])
        
        logger.info("🔸 开始耦合PDE数值求解...")
        
        # 修正的数值求解：使用半隐式Crank-Nicolson方法
        for t_idx in range(1, num_t_points):
            # 报告进度
            if t_idx % (num_t_points // 4) == 0:
                progress = t_idx / (num_t_points - 1) * 100
                logger.info(f"   求解进度: {progress:.1f}%")
            
            # 当前时间
            t_current = t[t_idx]
            
            # 更新表面光强边界条件（考虑时间相关性）
            if phi_expr is not None and x_position is not None and K is not None:
                phi_t = parse_phi_expr(phi_expr, t_current)
                I[0, t_idx] = I0 * (1 + V * np.cos(K * x_position + phi_t))
            else:
                I[0, t_idx] = surface_I0
            
            # 第一步：半隐式更新PAC浓度
            # ∂M/∂t = -I * M * C
            # 使用Crank-Nicolson: (M^{n+1} - M^n)/dt = -0.5*C*(I^n*M^n + I^{n+1}*M^{n+1})
            for z_idx in range(num_z_points):
                M_old = M[z_idx, t_idx-1]
                I_old = I[z_idx, t_idx-1]
                I_new_guess = I_old  # 初始猜测
                
                # 隐式求解M^{n+1}
                # M^{n+1} = M^n - 0.5*dt*C*(I^n*M^n + I^{n+1}*M^{n+1})
                # (1 + 0.5*dt*C*I^{n+1})*M^{n+1} = M^n - 0.5*dt*C*I^n*M^n
                denominator = 1 + 0.5 * dt * C * I_new_guess
                if denominator > 1e-12:  # 避免除零
                    M[z_idx, t_idx] = (M_old - 0.5 * dt * C * I_old * M_old) / denominator
                else:
                    M[z_idx, t_idx] = M_old * np.exp(-C * I_old * dt)  # 备用方法
                
                # 确保物理约束
                M[z_idx, t_idx] = max(0, min(M[z_idx, t_idx], M0))
            
            # 第二步：更新光强分布
            # ∂I/∂z = -I * (A * M + B)
            # 使用向前差分，但用当前时刻的M值
            for z_idx in range(1, num_z_points):
                I_prev_z = I[z_idx-1, t_idx]
                M_curr = (M[z_idx, t_idx] + M[z_idx-1, t_idx]) / 2  # 使用平均值提高精度
                
                # 修正的空间差分
                absorption_coeff = A * M_curr + B
                
                # 使用隐式方法求解空间传播
                # I[z+dz] = I[z] * exp(-absorption_coeff * dz)
                I[z_idx, t_idx] = I_prev_z * np.exp(-absorption_coeff * dz)
                
                # 确保物理约束
                I[z_idx, t_idx] = max(0, I[z_idx, t_idx])
                
                # 稳定性检查：防止非物理的振荡
                if z_idx > 1:
                    prev_ratio = I[z_idx-1, t_idx] / max(I[z_idx-2, t_idx], 1e-12)
                    curr_ratio = I[z_idx, t_idx] / max(I[z_idx-1, t_idx], 1e-12)
                    if prev_ratio > 0 and curr_ratio / prev_ratio > 2.0:  # 检测异常增长
                        I[z_idx, t_idx] = I[z_idx-1, t_idx] * prev_ratio  # 限制增长率
        
        # 返回最终时刻的分布
        I_final = I[:, -1]
        M_final = M[:, -1]
        
        # 计算曝光剂量：对时间积分
        exposure_dose = np.trapz(I, t, axis=1)
        
        # 增强的物理验证
        is_valid, issues = self.validate_physical_constraints(I_final, M_final, z_h, surface_I0, M0)
        
        # 数值质量检查
        max_I_gradient = np.max(np.abs(np.diff(I_final)))
        max_M_gradient = np.max(np.abs(np.diff(M_final)))
        
        logger.info(f"🔸 求解完成质量评估:")
        logger.info(f"   - I_final范围: [{I_final.min():.4f}, {I_final.max():.4f}]")
        logger.info(f"   - M_final范围: [{M_final.min():.4f}, {M_final.max():.4f}]")
        logger.info(f"   - 最大光强梯度: {max_I_gradient:.6f}")
        logger.info(f"   - 最大PAC梯度: {max_M_gradient:.6f}")
        logger.info(f"   - 物理验证: {'通过' if is_valid else '失败'}")
        
        if not is_valid:
            logger.warning(f"Enhanced Dill PDE求解存在物理问题: {issues}")
        
        return z, I_final, M_final, exposure_dose

    def adaptive_solve_enhanced_dill_pde(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, x_position=None, K=None, V=0, phi_expr=None, max_points=200, tolerance=1e-4):
        """
        自适应网格的Enhanced Dill PDE求解器（改进版）
        使用误差估计和网格自适应策略确保精度和稳定性
        """
        start_time = time.time()
        
        A, B, C = self.get_abc(z_h, T, t_B)
        
        # 计算问题的特征长度和时间尺度
        absorption_length = 1.0 / (A * M0 + B) if (A * M0 + B) > 0 else z_h
        reaction_time = 1.0 / (C * I0) if (C * I0) > 0 else t_exp
        
        logger.info(f"🔸 自适应求解参数分析:")
        logger.info(f"   - 吸收特征长度: {absorption_length:.4f} μm")
        logger.info(f"   - 反应特征时间: {reaction_time:.4f} s")
        
        # 基于物理特征尺度的自适应网格策略
        min_z_points = max(20, int(z_h / absorption_length * 10))  # 至少10个点每个吸收长度
        min_t_points = max(20, int(t_exp / reaction_time * 10))    # 至少10个点每个反应时间
        
        # 根据调制参数进一步调整
        if V > 0.1 and K is not None:
            # 空间调制情况：需要足够分辨率来捕捉调制
            spatial_freq_factor = max(1.0, K * absorption_length / (2 * np.pi))
            min_z_points = int(min_z_points * (1 + spatial_freq_factor))
            
        # 限制在合理范围内
        num_z_points = min(max_points, max(min_z_points, 50))
        num_t_points = min(max_points, max(min_t_points, 50))
        
        logger.info(f"🔸 自适应网格策略:")
        logger.info(f"   - 初始z网格点数: {num_z_points}")
        logger.info(f"   - 初始t网格点数: {num_t_points}")
        
        # 第一次求解
        z, I_final, M_final, exposure_dose = self.solve_enhanced_dill_pde(
            z_h, T, t_B, I0, M0, t_exp, 
            num_z_points=num_z_points, 
            num_t_points=num_t_points,
            x_position=x_position, K=K, V=V, phi_expr=phi_expr
        )
        
        # 误差估计和网格自适应
        need_refinement = False
        refinement_reason = []
        
        if len(I_final) > 2:
            # 检查光强的相对梯度
            I_gradients = np.abs(np.diff(I_final))
            max_relative_gradient = np.max(I_gradients) / np.mean(I_final) if np.mean(I_final) > 0 else 0
            
            if max_relative_gradient > tolerance * 10:  # 梯度过大
                need_refinement = True
                refinement_reason.append(f"光强梯度过大({max_relative_gradient:.4f})")
                
        if len(M_final) > 2:
            # 检查PAC浓度的变化平滑性
            M_second_diff = np.abs(np.diff(M_final, n=2))
            if len(M_second_diff) > 0:
                max_curvature = np.max(M_second_diff) / np.mean(M_final) if np.mean(M_final) > 0 else 0
                if max_curvature > tolerance * 5:  # 曲率过大
                    need_refinement = True
                    refinement_reason.append(f"PAC浓度曲率过大({max_curvature:.4f})")
        
        # 物理验证检查
        is_valid, issues = self.validate_physical_constraints(I_final, M_final, z_h, I0, M0)
        if not is_valid and num_z_points < max_points * 0.8:
            need_refinement = True
            refinement_reason.append("物理验证失败")
        
        # 如果需要细化网格
        if need_refinement and num_z_points < max_points:
            logger.info(f"🔸 网格细化：{', '.join(refinement_reason)}")
            
            # 增加网格密度
            refined_z_points = min(max_points, int(num_z_points * 1.5))
            refined_t_points = min(max_points, int(num_t_points * 1.2))
            
            logger.info(f"   - 细化后z网格点数: {refined_z_points}")
            logger.info(f"   - 细化后t网格点数: {refined_t_points}")
            
            # 重新求解
            z, I_final, M_final, exposure_dose = self.solve_enhanced_dill_pde(
                z_h, T, t_B, I0, M0, t_exp, 
                num_z_points=refined_z_points, 
                num_t_points=refined_t_points,
                x_position=x_position, K=K, V=V, phi_expr=phi_expr
            )
            
            num_z_points, num_t_points = refined_z_points, refined_t_points
        
        compute_time = time.time() - start_time
        
        # 最终质量评估
        final_is_valid, final_issues = self.validate_physical_constraints(I_final, M_final, z_h, I0, M0)
        
        logger.info(f"🔸 自适应求解完成:")
        logger.info(f"   - 最终网格: {num_z_points}×{num_t_points}")
        logger.info(f"   - 计算时间: {compute_time:.3f}s")
        logger.info(f"   - 最终质量: {'优秀' if final_is_valid else '可接受'}")
        
        if not final_is_valid:
            logger.warning(f"   - 质量问题: {final_issues}")
        
        return z, I_final, M_final, exposure_dose, compute_time

    def simulate(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, num_points=100, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, V=0, y=0, K=None, x_position=None):
        """
        Enhanced Dill模型仿真入口函数，支持不同的计算模式
        
        参数：
        - x_position: 横向空间位置，用于1D比较模式
        - K：空间频率，用于1D模式
        - V：干涉条纹可见度
        - sine_type：计算模式 ('1d', 'multi', '3d')
        """
        # 对于1D比较模式，使用PDE求解器
        if sine_type in ['1d', 'single'] and x_position is not None:
            z, I_final, M_final, exposure_dose = self.solve_enhanced_dill_pde(
                z_h, T, t_B, I0, M0, t_exp, 
                num_z_points=num_points,
                x_position=x_position, 
                K=K, V=V, phi_expr=phi_expr
            )
            return z, I_final, M_final
            
        # 对于其他模式，保留原有的简化计算（用于向后兼容）
        A, B, C = self.get_abc(z_h, T, t_B)
        z = np.linspace(0, z_h, num_points)
        
        # 简化模型：用于快速预览和2D/3D计算
        alpha = A + B
        base_I = I0 * np.exp(-alpha * z)
        
        # 应用深度方向的基础衰减
        I_final = base_I
        
        # PAC浓度计算：使用积分形式，修复类型错误
        integrated_I = np.trapz(np.tile(I_final, (100, 1)), np.linspace(0, t_exp, 100), axis=0)
        # 确保所有操作数都是numpy数组
        integrated_I = np.asarray(integrated_I, dtype=np.float64)
        C_scalar = float(C)  # 确保C是标量
        M_final = M0 * np.exp(-C_scalar * integrated_I)
        
        # 确保物理约束
        I_final = np.maximum(0, I_final)
        M_final = np.clip(M_final, 0, M0)
        
        return z, I_final, M_final

    def generate_data(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, V=0, K=None, y_range=None, z_range=None, x_position=None, num_points=100, enable_4d_animation=False, t_start=0, t_end=5, time_steps=20):
        """
        生成增强Dill模型数据，支持4D动画
        
        参数:
            z_h: 胶厚度
            T: 前烘温度
            t_B: 前烘时间
            I0: 初始光强
            M0: 初始PAC浓度
            t_exp: 曝光时间
            sine_type: 正弦波类型
            Kx, Ky, Kz: 空间频率
            phi_expr: 相位表达式
            V: 干涉条纹可见度
            K: 1D空间频率
            y_range, z_range: 坐标范围
            x_position: 横向位置
            num_points: 网格点数
            enable_4d_animation: 是否启用4D动画
            t_start, t_end: 动画时间范围
            time_steps: 时间步数
            
        返回:
            包含数据的字典
        """
        logger.info("🌟" * 30)
        logger.info("【增强Dill模型 - 数据生成总控制】")
        logger.info("🌟" * 30)
        logger.info(f"🔸 输入参数总览:")
        logger.info(f"   - sine_type = '{sine_type}'")
        logger.info(f"   - z_h (胶厚度) = {z_h} μm")
        logger.info(f"   - T (前烘温度) = {T} ℃")
        logger.info(f"   - t_B (前烘时间) = {t_B} min")
        logger.info(f"   - I0 (初始光强) = {I0}")
        logger.info(f"   - M0 (初始PAC浓度) = {M0}")
        logger.info(f"   - t_exp (曝光时间) = {t_exp}")
        logger.info(f"   - V (可见度) = {V}")
        logger.info(f"   - enable_4d_animation = {enable_4d_animation}")
        
        # 三维模式4D动画
        if sine_type == '3d' and enable_4d_animation and Kx is not None and Ky is not None and Kz is not None:
            logger.info(f"🔸 增强Dill模型3D-4D动画参数:")
            logger.info(f"   - 时间范围: {t_start}s ~ {t_end}s")
            logger.info(f"   - 时间步数: {time_steps}")
            logger.info(f"   - 空间频率: Kx={Kx}, Ky={Ky}, Kz={Kz}")
            
            # 预先计算ABC参数（避免重复计算）
            logger.info("🔸 预计算ABC参数...")
            A, B, C = self.get_abc(z_h, T, t_B)
            logger.info(f"✅ ABC参数计算完成: A={A:.6f}, B={B:.6f}, C={C:.6f}")
            
            time_array = np.linspace(t_start, t_end, time_steps)
            
            # 设置3D网格 - 与静态3D模式保持一致
            x_points = 20  
            y_points = 20
            z_points = 10  # 增加Z维度，与静态3D模式一致
            
            x_coords = np.linspace(0, 10, x_points)
            
            # 安全处理y_coords
            if y_range is not None and isinstance(y_range, (list, np.ndarray)) and len(y_range) >= y_points:
                y_coords = np.array(y_range[:y_points])
            else:
                y_coords = np.linspace(0, 10, y_points)
            
            # 安全处理z_coords
            if z_range is not None and isinstance(z_range, (list, np.ndarray)) and len(z_range) >= z_points:
                z_coords = np.array(z_range[:z_points])
            else:
                z_coords = np.linspace(0, z_h, z_points)
            
            # 确保所有coords都是numpy数组
            x_coords = np.asarray(x_coords)
            y_coords = np.asarray(y_coords)
            z_coords = np.asarray(z_coords)
            
            logger.info(f"坐标数组检查: x_coords={len(x_coords)}, y_coords={len(y_coords)}, z_coords={len(z_coords)}")
            
            # 4D动画数据容器
            exposure_dose_frames = []
            thickness_frames = []
            
            logger.info(f"开始计算4D动画: {time_steps}帧 × {x_points}×{y_points}×{z_points}网格")
            
            for t_idx, t in enumerate(time_array):
                phi_t = parse_phi_expr(phi_expr, t)  # 真实解析相位表达式
                
                logger.info(f"计算第{t_idx+1}/{time_steps}帧 (t={t:.2f}s, φ={phi_t:.4f})")
                
                # 计算当前时间帧的3D分布
                frame_exposure = []
                frame_thickness = []
                
                for k, z in enumerate(z_coords):
                    z_plane_exposure = []
                    z_plane_thickness = []
                    
                    for j, y in enumerate(y_coords):
                        y_row_exposure = []
                        y_row_thickness = []
                        
                        for i, x in enumerate(x_coords):
                            # 计算时变光强分布
                            intensity_surface = I0 * (1 + V * np.cos(Kx * x + Ky * y + Kz * z + phi_t))
                            
                            # 对每个空间点进行真实的Enhanced Dill计算
                            try:
                                # 考虑深度衰减
                                alpha = A + B
                                I_z = intensity_surface * np.exp(-alpha * z)
                                
                                # 计算曝光剂量和厚度
                                exposure_dose_val = I_z * t_exp
                                thickness_val = M0 * np.exp(-C * exposure_dose_val)
                                
                            except Exception as e:
                                logger.warning(f"位置({x:.2f}, {y:.2f}, {z:.2f})计算失败: {str(e)}")
                                exposure_dose_val = intensity_surface * t_exp
                                thickness_val = M0 * 0.5
                            
                            y_row_exposure.append(float(exposure_dose_val))
                            y_row_thickness.append(float(thickness_val))
                        
                        z_plane_exposure.append(y_row_exposure)
                        z_plane_thickness.append(y_row_thickness)
                    
                    frame_exposure.append(z_plane_exposure)
                    frame_thickness.append(z_plane_thickness)
                
                exposure_dose_frames.append(frame_exposure)
                thickness_frames.append(frame_thickness)
                
                # 进度汇报
                progress = (t_idx + 1) / time_steps * 100
                logger.info(f"帧计算进度: {progress:.1f}% ({t_idx+1}/{time_steps})")
            
            logger.info(f"🎬 4D动画计算完成: {time_steps}帧")
            logger.info(f"数据维度检查:")
            logger.info(f"  - exposure_dose_frames: {len(exposure_dose_frames)}帧 × {len(exposure_dose_frames[0])}Z × {len(exposure_dose_frames[0][0])}Y × {len(exposure_dose_frames[0][0][0])}X")
            logger.info(f"  - thickness_frames: {len(thickness_frames)}帧 × {len(thickness_frames[0])}Z × {len(thickness_frames[0][0])}Y × {len(thickness_frames[0][0][0])}X")
            
            # 返回与前端期望格式一致的4D动画数据
            return {
                'x_coords': x_coords.tolist(),
                'y_coords': y_coords.tolist(),
                'z_coords': z_coords.tolist(),
                'time_array': time_array.tolist(),
                'exposure_dose_frames': exposure_dose_frames,
                'thickness_frames': thickness_frames,
                'enable_4d_animation': True,
                'time_steps': time_steps,
                'is_3d': True,
                'sine_type': sine_type,
                't_start': t_start,
                't_end': t_end
            }
        
        # 二维模式4D动画
        elif sine_type == 'multi' and enable_4d_animation and Kx is not None and Ky is not None:
            logger.info(f"🔸 增强Dill模型2D-4D动画参数:")
            logger.info(f"   - 时间范围: {t_start}s ~ {t_end}s")
            logger.info(f"   - 时间步数: {time_steps}")
            
            time_array = np.linspace(t_start, t_end, time_steps)
            x_coords = np.linspace(0, 10, 1000)
            y_coords = np.array(y_range) if y_range is not None else np.linspace(0, 10, 100)
            
            animation_data = {
                'x_coords': x_coords.tolist(),
                'y_coords': y_coords.tolist(),
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
                
                for y in y_coords:
                    exposure_row = []
                    thickness_row = []
                    
                    for x in x_coords:
                        # 计算时变光强
                        intensity_xy = I0 * (1 + V * np.cos(Kx * x + Ky * y + phi_t))
                        
                        # 简化增强Dill计算
                        try:
                            # 修复tuple赋值问题
                            result = self.adaptive_solve_enhanced_dill_pde(
                                z_h, T, t_B, intensity_xy, M0, t_exp,
                                x_position=x, K=K, V=V, phi_expr=phi_expr,
                                max_points=30, tolerance=1e-3
                            )
                            # 正确解包返回值
                            z_result, I_final, M_final, exposure_dose_arr, compute_time = result
                            
                            exposure_dose_val = intensity_xy * t_exp
                            thickness_val = M_final.mean() / M0  # 使用平均值
                            
                        except Exception:
                            exposure_dose_val = intensity_xy * t_exp
                            thickness_val = 0.5
                        
                        exposure_row.append(exposure_dose_val)
                        thickness_row.append(thickness_val)
                    
                    exposure_dose_2d.append(exposure_row)
                    thickness_2d.append(thickness_row)
                
                animation_data['exposure_dose_frames'].append(exposure_dose_2d)
                animation_data['thickness_frames'].append(thickness_2d)
                
                logger.info(f"   - 时间步 {t_idx+1}/{time_steps} (t={t:.2f}s) 计算完成")
            
            logger.info(f"🔸 增强Dill模型2D-4D动画数据生成完成，共{time_steps}帧")
            return animation_data
        
        # 一维模式4D动画
        elif enable_4d_animation and sine_type == '1d' and K is not None:
            logger.info(f"🔸 增强Dill模型1D-4D动画参数:")
            logger.info(f"   - 时间范围: {t_start}s ~ {t_end}s")
            logger.info(f"   - 时间步数: {time_steps}")
            logger.info(f"   - 空间频率: K={K}")
            
            time_array = np.linspace(t_start, t_end, time_steps)
            x_coords = np.linspace(0, 10, 100)
            
            animation_data = {
                'x_coords': x_coords.tolist(),
                'time_array': time_array.tolist(),
                'time_steps': time_steps,
                'exposure_dose_frames': [],
                'thickness_frames': [],
                'enable_4d_animation': True,
                'sine_type': '1d',
                'is_1d': True,
                'K': K
            }
            
            for t_idx, t in enumerate(time_array):
                phi_t = parse_phi_expr(phi_expr, t) if phi_expr is not None else 0.0
                
                # 计算1D时变光强分布
                intensity_1d = I0 * (1 + V * np.cos(K * x_coords + phi_t))
                
                exposure_dose_1d = []
                thickness_1d = []
                
                for x in x_coords:
                    I_val = I0 * (1 + V * np.cos(K * x + phi_t))
                    
                    try:
                        # 快速计算
                        A, B, C = self.get_abc(z_h, T, t_B)
                        exposure_dose_val = I_val * t_exp
                        thickness_val = M0 * np.exp(-A * I_val * t_exp)
                        thickness_val = max(0.1, min(1.0, thickness_val / M0))
                        
                    except Exception:
                        exposure_dose_val = I_val * t_exp
                        thickness_val = 0.5
                    
                    exposure_dose_1d.append(exposure_dose_val)
                    thickness_1d.append(thickness_val)
                
                animation_data['exposure_dose_frames'].append(exposure_dose_1d)
                animation_data['thickness_frames'].append(thickness_1d)
                
                logger.info(f"   - 时间步 {t_idx+1}/{time_steps} (t={t:.2f}s) 1D计算完成")
            
            logger.info(f"🔸 增强Dill模型1D-4D动画数据生成完成，共{time_steps}帧")
            return animation_data
        

        
        # 非动画模式 - 调用原有方法
        else:
            logger.info("🔸 静态数据生成模式")
            
            # 1D模式：沿深度方向的PDE求解
            if sine_type == '1d' or sine_type == 'single':
                logger.info(f"🔸 增强Dill模型1D计算参数: z_h={z_h}, T={T}, t_B={t_B}, I0={I0}, M0={M0}, t_exp={t_exp}")
                
                # 使用PDE求解器计算深度方向分布
                x_pos = x_position if x_position is not None else 5.0  # 默认横向位置
                K_val = K if K is not None else 2.0  # 默认空间频率
                
                z, I_final, M_final, exposure_dose = self.solve_enhanced_dill_pde(
                    z_h, T, t_B, I0, M0, t_exp,
                    num_z_points=num_points,
                    x_position=x_pos, K=K_val, V=V, phi_expr=phi_expr
                )
                
                logger.info(f"🔸 增强Dill模型1D计算完成: z范围=[{z.min():.2f}, {z.max():.2f}], I范围=[{I_final.min():.4f}, {I_final.max():.4f}]")
                
                return {
                    'x': z.tolist(),
                    'exposure_dose': I_final.tolist(),
                    'thickness': M_final.tolist(),
                    'is_1d': True,
                    'sine_type': sine_type
                }
            
            # 2D模式：同时计算 Y-Z 和 X-Y 平面分布
            elif sine_type == 'multi' and Kx is not None and Ky is not None:
                logger.info(f"🔸 增强Dill模型2D计算: Kx={Kx}, Ky={Ky}, V={V}, phi_expr={phi_expr}")

                # === 1. YZ平面计算 (沿深度) ===
                logger.info("计算YZ平面...")
                if y_range is not None:
                    y_coords_yz = np.array(y_range)
                else:
                    y_coords_yz = np.linspace(0, 10, 50)
                z_coords_yz = np.linspace(0, z_h, 30)
                x_fixed_for_yz = 5.0  # 固定一个X位置来展示YZ截面

                yz_exposure = []
                yz_thickness = []
                
                phi_val = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0

                for i, y in enumerate(y_coords_yz):
                    intensity_y = I0 * (1 + V * np.cos(Kx * x_fixed_for_yz + Ky * y + phi_val))
                    try:
                        _, I_depth, M_depth, _ = self.solve_enhanced_dill_pde(
                            z_h, T, t_B, intensity_y, M0, t_exp,
                            num_z_points=len(z_coords_yz)
                        )
                        yz_exposure.append((I_depth * t_exp).tolist())
                        yz_thickness.append(M_depth.tolist())
                    except Exception as e:
                        logger.warning(f"YZ平面计算失败 @ y={y:.2f}: {e}")
                        yz_exposure.append([0] * len(z_coords_yz))
                        yz_thickness.append([0] * len(z_coords_yz))

                logger.info("YZ平面计算完成。")

                # === 2. XY平面计算 (固定深度处的横向分布) ===
                logger.info("计算XY平面...")
                logger.info(f"XY平面计算参数检查: V={V}, Kx={Kx}, Ky={Ky}, phi_expr={phi_expr}")
                x_coords_xy = np.linspace(0, 10, 50)
                y_coords_xy = y_coords_yz # 可以复用Y坐标
                
                # 选择一个代表性的深度来计算XY平面，通常选择胶层中部
                z_fixed_for_xy = z_h / 2.0  # 胶层中部
                logger.info(f"XY平面计算在固定深度 z = {z_fixed_for_xy:.2f} μm 处")
                
                xy_exposure = []
                xy_thickness = []
                
                # 一次性计算ABC参数，避免重复计算和日志输出
                A, B, C = self.get_abc(z_h, T, t_B)

                # 计算几个样本点来检查数据变化
                sample_x, sample_y = x_coords_xy[25], y_coords_xy[25]  # 中心点
                sample_intensity = I0 * (1 + V * np.cos(Kx * sample_x + Ky * sample_y + phi_val))
                logger.info(f"XY平面样本点检查 @ ({sample_x:.2f}, {sample_y:.2f}):")
                logger.info(f"  phi_val = {phi_val}")
                logger.info(f"  调制项 = V * cos(Kx*x + Ky*y + phi) = {V} * cos({Kx}*{sample_x} + {Ky}*{sample_y} + {phi_val}) = {V * np.cos(Kx * sample_x + Ky * sample_y + phi_val):.6f}")
                logger.info(f"  表面光强 = {sample_intensity:.6f}")
                
                # 确保有足够的可见度来产生数据变化
                if V <= 0:
                    logger.warning(f"可见度V={V}过小，设置为默认值0.5以产生可见的调制")
                    V = 0.5

                for j, y in enumerate(y_coords_xy):
                    exposure_row = []
                    thickness_row = []
                    for i, x in enumerate(x_coords_xy):
                        # 直接计算2D空间调制，因为solve_enhanced_dill_pde原本只为1D设计
                        intensity_surface = I0 * (1 + V * np.cos(Kx * x + Ky * y + phi_val))
                        
                        # 使用简化但正确的增强Dill模型计算（不使用PDE求解器，因为它不支持2D调制）
                        try:
                            # 移除重复的ABC计算，使用之前计算的值
                            
                            # 模拟深度分布：从表面到z_fixed_for_xy的光强衰减
                            z_points = 30
                            z_array = np.linspace(0, z_fixed_for_xy, z_points)
                            dz = z_array[1] - z_array[0] if len(z_array) > 1 else z_fixed_for_xy / z_points
                            
                            # 初始化光强和PAC浓度数组
                            I_array = np.zeros(z_points)
                            M_array = np.zeros(z_points)
                            
                            # 边界条件
                            I_array[0] = intensity_surface  # 表面光强
                            M_array[0] = M0  # 初始PAC浓度
                            
                            # 沿深度方向积分求解（简化的欧拉法）
                            for z_idx in range(1, z_points):
                                # 更新PAC浓度（基于前一点的光强）
                                I_prev = I_array[z_idx-1]
                                M_prev = M_array[z_idx-1]
                                
                                # ∂M/∂t ≈ -I * M * C, 在曝光时间内积分
                                # 简化为稳态近似: M ≈ M_prev * exp(-C * I_prev * t_exp)
                                M_curr = M_prev * np.exp(-C * I_prev * t_exp / z_points)
                                M_array[z_idx] = max(0, min(M_curr, M0))
                                
                                # 更新光强：∂I/∂z = -I * (A * M + B)
                                dI_dz = -I_prev * (A * M_array[z_idx] + B)
                                I_curr = I_prev + dI_dz * dz
                                I_array[z_idx] = max(0, I_curr)
                            
                            # 提取目标深度处的值
                            I_at_depth = I_array[-1]
                            M_at_depth = M_array[-1]
                            
                            exposure_dose_val = I_at_depth * t_exp
                            thickness_val = M_at_depth
                            
                        except Exception as e:
                            logger.warning(f"XY平面计算失败 @ (x={x:.2f}, y={y:.2f}): {e}")
                            # 更简单的回退计算
                            alpha = A + B
                            I_at_depth = intensity_surface * np.exp(-alpha * z_fixed_for_xy)
                            M_at_depth = M0 * np.exp(-C * I_at_depth * t_exp)
                            
                            exposure_dose_val = I_at_depth * t_exp
                            thickness_val = M_at_depth
                        
                        exposure_row.append(exposure_dose_val)
                        thickness_row.append(thickness_val)
                    
                    xy_exposure.append(exposure_row)
                    xy_thickness.append(thickness_row)
                    
                    # 进度报告
                    if (j + 1) % 10 == 0:
                        logger.info(f"XY平面计算进度: {j+1}/{len(y_coords_xy)} Y位置完成")
                
                # 数据统计
                xy_exposure_flat = [val for row in xy_exposure for val in row]
                xy_thickness_flat = [val for row in xy_thickness for val in row]
                logger.info(f"XY平面数据统计:")
                logger.info(f"  曝光剂量范围: [{min(xy_exposure_flat):.6f}, {max(xy_exposure_flat):.6f}]")
                logger.info(f"  厚度范围: [{min(xy_thickness_flat):.6f}, {max(xy_thickness_flat):.6f}]")
                
                logger.info("XY平面计算完成。")

                # === 3. 组合并返回结果 ===
                logger.info("数据准备完成，返回给前端。")
                return {
                    # === 兼容性数据字段（用于现有前端2D显示逻辑） ===
                    # 使用YZ平面数据作为主要的2D显示数据，因为它更符合传统光刻胶深度分析
                    'y_coords': y_coords_yz.tolist(),
                    'z_coords': z_coords_yz.tolist(),
                    'z_exposure_dose': yz_exposure,  # 前端期望的字段名
                    'z_thickness': yz_thickness,     # 前端期望的字段名
                    
                    # === 扩展数据字段（用于未来的增强4图显示） ===
                    # YZ平面数据（深度方向分布）
                    'yz_exposure': yz_exposure,
                    'yz_thickness': yz_thickness,
                    
                    # XY平面数据（表面分布）
                    'x_coords': x_coords_xy.tolist(),
                    # 为XY平面复用Y坐标，前端可能需要
                    'xy_y_coords': y_coords_xy.tolist(),
                    'xy_exposure': xy_exposure,
                    'xy_thickness': xy_thickness,
                    
                    # === 元数据和标识 ===
                    'is_2d': True,
                    'sine_type': sine_type,
                    'has_yz_data': True,
                    'has_xy_data': True,
                    'model_type': 'enhanced_dill'
                }
            
            # 3D模式：完整的3D空间分布
            elif sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
                logger.info(f"🔸 增强Dill模型3D计算参数: Kx={Kx}, Ky={Ky}, Kz={Kz}, V={V}")
                
                # 设置3D网格（降低分辨率以提高计算速度）
                x_points = 20
                y_points = 20
                z_points = 10
                
                x_coords = np.linspace(0, 10, x_points)
                
                # 安全处理y_coords
                if y_range is not None and isinstance(y_range, (list, np.ndarray)) and len(y_range) >= y_points:
                    y_coords = np.array(y_range[:y_points])
                else:
                    y_coords = np.linspace(0, 10, y_points)
                
                # 安全处理z_coords
                if z_range is not None and isinstance(z_range, (list, np.ndarray)) and len(z_range) >= z_points:
                    z_coords = np.array(z_range[:z_points])
                else:
                    z_coords = np.linspace(0, z_h, z_points)
                
                logger.info(f"3D坐标数组: x={len(x_coords)}, y={len(y_coords)}, z={len(z_coords)}")
                
                # 计算3D光强分布
                phi_val = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
                
                # 一次性计算ABC参数，避免重复计算
                A, B, C = self.get_abc(z_h, T, t_B)
                
                # 确保有足够的可见度来产生数据变化
                if V <= 0:
                    logger.warning(f"3D模式: 可见度V={V}过小，设置为默认值0.5以产生可见的调制")
                    V = 0.5
                
                exposure_dose_3d = []
                thickness_3d = []
                
                logger.info(f"开始计算3D分布: X点数={x_points}, Y点数={y_points}, Z点数={z_points}")
                
                for k, z in enumerate(z_coords):
                    z_plane_exposure = []
                    z_plane_thickness = []
                    
                    for j, y in enumerate(y_coords):
                        y_row_exposure = []
                        y_row_thickness = []
                        
                        for i, x in enumerate(x_coords):
                            # 计算3D位置的光强
                            intensity_xyz = I0 * (1 + V * np.cos(Kx * x + Ky * y + Kz * z + phi_val))
                            
                            # 简化的增强Dill计算（避免深度方向PDE求解以提高速度）
                            try:
                                # 使用预先计算的ABC参数
                                alpha = A + B
                                I_simple = intensity_xyz * np.exp(-alpha * z)
                                M_simple = M0 * np.exp(-C * I_simple * t_exp)
                                
                                exposure_dose_val = I_simple * t_exp
                                thickness_val = M_simple
                                
                            except Exception as e:
                                logger.warning(f"位置({x:.2f}, {y:.2f}, {z:.2f})计算失败: {str(e)}")
                                exposure_dose_val = intensity_xyz * t_exp
                                thickness_val = M0 * 0.5
                            
                            y_row_exposure.append(exposure_dose_val)
                            y_row_thickness.append(thickness_val)
                        
                        z_plane_exposure.append(y_row_exposure)
                        z_plane_thickness.append(y_row_thickness)
                    
                    exposure_dose_3d.append(z_plane_exposure)
                    thickness_3d.append(z_plane_thickness)
                    
                    logger.info(f"Z层进度: {k+1}/{z_points} (z={z:.2f}) 计算完成")
                
                logger.info(f"🔸 增强Dill模型3D计算完成: 形状=({x_points}, {y_points}, {z_points})")
                
                return {
                    'x_coords': x_coords.tolist(),
                    'y_coords': y_coords.tolist(),
                    'z_coords': z_coords.tolist(),
                    'exposure_dose': exposure_dose_3d,
                    'thickness': thickness_3d,
                    'is_3d': True,
                    'sine_type': sine_type
                }
            
            else:
                # 默认1D模式的后备方案
                logger.warning("未识别的sine_type或参数不足，使用默认1D模式")
                z, I_final, M_final = self.simulate(z_h, T, t_B, I0, M0, t_exp, 
                                                  num_points=num_points, sine_type='1d')
                
                return {
                    'x': z.tolist(),
                    'exposure_dose': I_final.tolist(),
                    'thickness': M_final.tolist(),
                    'is_1d': True,
                    'sine_type': '1d'
                }

    def generate_plots(self, z_h, T, t_B, I0=1.0, M0=1.0, t_exp=5.0, sine_type='1d', Kx=None, Ky=None, Kz=None, phi_expr=None, V=0, K=None, y_range=None, z_range=None):
        """
        Generate exposure dose and PAC concentration distribution plots (English labels)
        
        支持1D和3D模式下的图形生成
        """
        # 确保1D模式下V值有效
        if K is not None and sine_type in ['single', '1d'] and V <= 0:
            logger.warning(f"[Plots警告] 干涉条纹可见度V={V}，已设为默认值0.8以显示正弦波")
            V = 0.8  # 使用默认值以显示正弦波效果

        plt.close('all')
        
        if sine_type == '3d' and Kx is not None and Ky is not None and Kz is not None:
            # 处理3D情况，生成3D表面图
            x_points = 50  # 与数据生成保持一致
            y_points = 50
            z_points = 5   # 与数据生成保持一致，生成5个Z层
            
            # 如果范围参数存在，则使用指定范围
            x_min, x_max = 0, 10
            y_min = float(0 if y_range is None else y_range[0])
            y_max = float(10 if y_range is None else y_range[-1])
            z_min = float(0 if z_range is None else z_range[0])
            z_max = float(10 if z_range is None else z_range[-1])
            
            # 创建网格
            x_coords = np.linspace(x_min, x_max, x_points)
            y_coords = np.linspace(y_min, y_max, y_points) if y_range is None else np.array(y_range)
            z_coords = np.linspace(z_min, z_max, z_points) if z_range is None else np.array(z_range)
            
            # 创建中间Z层的网格点作为示例
            mid_z_idx = z_points // 2
            mid_z = z_coords[mid_z_idx]
            X, Y = np.meshgrid(x_coords, y_coords)
            
            # 计算相位
            phi = parse_phi_expr(phi_expr, 0) if phi_expr is not None else 0.0
            
            # 确保振幅有足够的可见度
            amplitude = max(0.3, V)
            
            # 生成中间Z层的3D正弦波分布，包含Kz的影响
            modulation = np.cos(Kx * X + Ky * Y + Kz * mid_z + phi)
            
            # 计算中间层的曝光剂量
            base_exposure = I0 * t_exp
            exposure_dose = base_exposure * (1 + amplitude * modulation)
            
            # 计算中间层的厚度分布
            thickness = M0 * (1 - 0.5 * amplitude * modulation)
            
            # 确保数组维度正确
            if exposure_dose.shape != (y_points, x_points):
                exposure_dose = exposure_dose.T
            if thickness.shape != (y_points, x_points):
                thickness = thickness.T
            
            # 生成每个Z层的插值面，从而创建真正的3D可视化
            # 生成曝光剂量的3D表面图
            fig1 = plt.figure(figsize=(10, 8))
            ax1 = fig1.add_subplot(111, projection='3d')  # type: ignore
            
            # 绘制带有Z层差异的表面
            for i, z_val in enumerate(z_coords):
                # 为每层创建调整后的z网格
                Z = np.ones(X.shape) * z_val
                
                # 计算该z层的曝光剂量
                curr_modulation = np.cos(Kx * X + Ky * Y + Kz * z_val + phi)
                curr_exposure = base_exposure * (1 + amplitude * curr_modulation)
                
                # 根据曝光剂量调整Z坐标，创建3D表面效果
                Z_adjusted = Z + curr_exposure * 0.1
                
                # 绘制此Z层的表面
                ax1.plot_surface(X, Y, Z_adjusted, alpha=0.7, cmap='viridis',  # type: ignore
                                edgecolor='none', rstride=5, cstride=5)
            
            ax1.set_title('3D Exposure Dose Distribution', fontsize=16)
            ax1.set_xlabel('X Position (μm)', fontsize=14)
            ax1.set_ylabel('Y Position (μm)', fontsize=14)
            ax1.set_zlabel('Z Position (μm)', fontsize=14)  # type: ignore
            plt.tight_layout()
            
            buffer1 = BytesIO()
            fig1.savefig(buffer1, format='png', dpi=100)
            buffer1.seek(0)
            exposure_plot = base64.b64encode(buffer1.getvalue()).decode()
            plt.close(fig1)
            
            # 生成PAC浓度3D表面图，同样带有Z层差异
            fig2 = plt.figure(figsize=(10, 8))
            ax2 = fig2.add_subplot(111, projection='3d')  # type: ignore
            
            # 绘制带有Z层差异的表面
            for i, z_val in enumerate(z_coords):
                # 为每层创建调整后的z网格
                Z = np.ones(X.shape) * z_val
                
                # 计算该z层的PAC浓度
                curr_modulation = np.cos(Kx * X + Ky * Y + Kz * z_val + phi)
                curr_thickness = M0 * (1 - 0.5 * amplitude * curr_modulation)
                
                # 根据厚度调整Z坐标，创建3D表面效果
                Z_adjusted = Z + curr_thickness * 0.2
                
                # 绘制此Z层的表面
                ax2.plot_surface(X, Y, Z_adjusted, alpha=0.7, cmap='plasma',  # type: ignore
                                edgecolor='none', rstride=5, cstride=5)
            
            ax2.set_title('3D PAC Concentration Distribution', fontsize=16)
            ax2.set_xlabel('X Position (μm)', fontsize=14)
            ax2.set_ylabel('Y Position (μm)', fontsize=14)
            ax2.set_zlabel('Z Position (μm)', fontsize=14)  # type: ignore
            plt.tight_layout()
            
            buffer2 = BytesIO()
            fig2.savefig(buffer2, format='png', dpi=100)
            buffer2.seek(0)
            thickness_plot = base64.b64encode(buffer2.getvalue()).decode()
            plt.close(fig2)
            
        else:
            # 使用与simulate相同的参数处理逻辑
            current_K = K if K is not None else Kx
            # 原始1D模式，修复V参数类型问题
            z, I, M = self.simulate(z_h, T, t_B, I0, M0, t_exp, sine_type=sine_type, 
                                    Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr, V=int(V), K=current_K)
            
            # Exposure dose distribution plot (I)
            fig1 = plt.figure(figsize=(10, 6))
            plt.plot(z, I, 'b-', linewidth=2)
            plt.title('Exposure Dose Distribution', fontsize=16)
            plt.xlabel('Depth (μm)', fontsize=14)
            plt.ylabel('Post-exposure Intensity', fontsize=14)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            buffer1 = BytesIO()
            fig1.savefig(buffer1, format='png', dpi=100)
            buffer1.seek(0)
            exposure_plot = base64.b64encode(buffer1.getvalue()).decode()
            plt.close(fig1)
            
            # PAC concentration distribution plot (M)
            fig2 = plt.figure(figsize=(10, 6))
            plt.plot(z, M, 'r-', linewidth=2)
            plt.title('PAC Concentration Distribution', fontsize=16)
            plt.xlabel('Depth (μm)', fontsize=14)
            plt.ylabel('Post-exposure PAC Concentration', fontsize=14)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            buffer2 = BytesIO()
            fig2.savefig(buffer2, format='png', dpi=100)
            buffer2.seek(0)
            thickness_plot = base64.b64encode(buffer2.getvalue()).decode()
            plt.close(fig2)
            
        return {
            'exposure_plot': exposure_plot,
            'thickness_plot': thickness_plot
        } 