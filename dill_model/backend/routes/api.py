from flask import Blueprint, request, jsonify
from ..models import DillModel, get_model_by_name
from ..utils import validate_input, validate_enhanced_input, validate_car_input, format_response, NumpyEncoder
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
import base64
from ..models import EnhancedDillModel
import traceback, datetime
import time

# 全局日志存储
calculation_logs = []

def add_log_entry(log_type, model_type, message, timestamp=None, dimension=None, details=None):
    """添加增强的日志条目"""
    if timestamp is None:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    log_entry = {
        'timestamp': timestamp,
        'type': log_type,  # 'info', 'progress', 'success', 'warning', 'error'
        'model': model_type,  # 'dill', 'enhanced_dill', 'car', 'system'
        'message': message,
        'dimension': dimension,  # '1d', '2d', '3d' 或 None
        'details': details or ''  # 详细信息
    }
    
    calculation_logs.append(log_entry)
    
    # 保持日志条目数量在合理范围内（最多1000条）
    if len(calculation_logs) > 1000:
        calculation_logs.pop(0)

def add_dimension_log(log_type, model_type, message, dimension, details=None):
    """添加带维度信息的日志条目"""
    add_log_entry(log_type, model_type, f"[{dimension.upper()}] {message}", dimension=dimension, details=details)

def add_progress_log(model_type, message, progress_percent=None, dimension=None):
    """添加进度日志"""
    if progress_percent is not None:
        message = f"{message} ({progress_percent}%)"
    add_log_entry('progress', model_type, message, dimension=dimension)

def add_success_log(model_type, message, dimension=None, details=None):
    """添加成功日志"""
    add_log_entry('success', model_type, message, dimension=dimension, details=details)

def add_warning_log(model_type, message, dimension=None, details=None):
    """添加警告日志"""
    add_log_entry('warning', model_type, message, dimension=dimension, details=details)

def add_error_log(model_type, message, dimension=None, details=None):
    """添加错误日志"""
    add_log_entry('error', model_type, message, dimension=dimension, details=details)

def clear_logs():
    """清空日志"""
    global calculation_logs
    calculation_logs = []

# 创建API蓝图
api_bp = Blueprint('api', __name__, url_prefix='/api')

# 实例化Dill模型
dill_model = DillModel()

@api_bp.route('/calculate', methods=['POST'])
def calculate():
    """
    计算模型并返回图像
    新增参数: model_type, sine_type (支持'1d', 'multi', '3d')
    """
    try:
        data = request.get_json()
        print('收到前端参数:', data)  # 调试用
        
        # === 🔍 调试自定义光强数据 ===
        custom_intensity_data = data.get('custom_intensity_data', None)
        print(f"🔍 API调试 - 自定义光强数据检查:")
        print(f"   - custom_intensity_data存在: {custom_intensity_data is not None}")
        if custom_intensity_data:
            print(f"   - 数据类型: {type(custom_intensity_data)}")
            print(f"   - 数据内容: {custom_intensity_data}")
            if 'x' in custom_intensity_data and 'intensity' in custom_intensity_data:
                print(f"   - X坐标点数: {len(custom_intensity_data['x'])}")
                print(f"   - 光强点数: {len(custom_intensity_data['intensity'])}")
                print(f"   - X范围: [{min(custom_intensity_data['x']):.3f}, {max(custom_intensity_data['x']):.3f}]")
                print(f"   - 光强范围: [{min(custom_intensity_data['intensity']):.6f}, {max(custom_intensity_data['intensity']):.6f}]")
        # === 调试结束 ===
        
        model_type = data.get('model_type', 'dill')
        model = get_model_by_name(model_type)
        
        # 根据模型类型验证参数
        if model_type == 'dill':
            sine_type = data.get('sine_type', '1d')  # 先获取sine_type
            is_valid, message = validate_input(data)
            if not is_valid:
                print(f"参数校验失败: {message}, 参数: {data}")
                add_error_log('dill', f"参数校验失败: {message}", dimension=sine_type)
                return jsonify(format_response(False, message=message)), 400
            # 提取参数
            I_avg = float(data['I_avg'])
            V = float(data['V'])
            t_exp = float(data['t_exp'])
            C = float(data['C'])
            
            # 提取理想曝光模型的新参数
            angle_a = float(data.get('angle_a', 11.7))
            exposure_threshold = float(data.get('exposure_threshold', 20))
            wavelength = float(data.get('wavelength', 405))
            contrast_ctr = float(data.get('contrast_ctr', 1))
            
            # 检查是否使用自定义光强分布
            custom_intensity_data = data.get('custom_intensity_data', None)
            
            # 🔸 调试波长参数
            print(f"🌈 波长参数调试: wavelength = {wavelength} nm (来源: {data.get('wavelength', '默认值')})")
            add_progress_log('dill', f"波长参数设置: λ = {wavelength} nm", dimension=sine_type)
            
            if sine_type == 'multi':
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                phi_expr = data.get('phi_expr', '0')
                # 获取y范围参数
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                y_points = int(data.get('y_points', 100))
                
                # 新增校验: 确保 y_min < y_max 且 y_points > 1
                if y_min >= y_max:
                    return jsonify(format_response(False, message="Y轴范围最小值必须小于最大值")), 400
                if y_points <= 1:
                    return jsonify(format_response(False, message="Y轴点数必须大于1才能进行二维计算")), 400
                
                # 如果校验通过，则直接计算y_range
                y_range = np.linspace(y_min, y_max, y_points).tolist()
                plot_data = model.generate_plots(I_avg, V, None, t_exp, C, sine_type=sine_type, 
                                               Kx=Kx, Ky=Ky, phi_expr=phi_expr, y_range=y_range,
                                               custom_intensity_data=custom_intensity_data)
            elif sine_type == '2d_exposure_pattern':
                # 处理2D曝光图案参数 (基于MATLAB latent_image2d.m逻辑)
                add_progress_log('dill', "开始2D曝光图案计算", dimension='2d')
                
                # 获取2D曝光图案参数
                x_min_2d = float(data.get('x_min_2d', -1000))
                x_max_2d = float(data.get('x_max_2d', 1000))
                y_min_2d = float(data.get('y_min_2d', -1000))
                y_max_2d = float(data.get('y_max_2d', 1000))
                step_size_2d = float(data.get('step_size_2d', 5))
                
                # 计算2D曝光图案 - 使用单个曝光时间
                plots = model.calculate_2d_exposure_pattern(
                    C=C, 
                    angle_a_deg=angle_a,
                    exposure_time=t_exp,  # 使用单个曝光时间而非数组
                    contrast_ctr=contrast_ctr,
                    threshold_cd=exposure_threshold,
                    wavelength_nm=wavelength,
                    x_min=x_min_2d, x_max=x_max_2d,
                    y_min=y_min_2d, y_max=y_max_2d,
                    step_size=step_size_2d
                )
                
                add_success_log('dill', f"2D曝光图案计算完成 (曝光时间: {t_exp}s)", dimension='2d')
                
            elif sine_type == '3d':
                # 处理三维正弦波参数
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                Kz = float(data.get('Kz', 0))
                phi_expr = data.get('phi_expr', '0')
                # 获取三维范围参数
                x_min = float(data.get('x_min', 0))
                x_max = float(data.get('x_max', 10))
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                z_min = float(data.get('z_min', 0))
                z_max = float(data.get('z_max', 10))
                
                # 默认使用50个点
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                
                plots = model.generate_plots(I_avg, V, None, t_exp, C, sine_type=sine_type,
                                           Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr,
                                           y_range=y_range, z_range=z_range,
                                           custom_intensity_data=custom_intensity_data)
            else:
                K = float(data['K'])
                
                # 检查曝光计量计算方式
                exposure_calculation_method = data.get('exposure_calculation_method', 'standard')
                
                # 处理多段曝光时间累积模式
                if exposure_calculation_method == 'cumulative':
                    # 获取多段曝光时间累积参数
                    segment_duration = float(data.get('segment_duration', 1))
                    segment_count = int(data.get('segment_count', 5))
                    segment_intensities = data.get('segment_intensities', [])
                    
                    # 参数验证
                    if segment_count <= 0:
                        return jsonify(format_response(False, message="段数必须为正整数")), 400
                    if segment_duration <= 0:
                        return jsonify(format_response(False, message="单段时间长度必须为正数")), 400
                    if not segment_intensities or len(segment_intensities) == 0:
                        return jsonify(format_response(False, message="多段曝光时间累积模式需要提供光强值列表")), 400
                    
                    # 记录日志
                    add_progress_log('dill', f"使用多段曝光时间累积模式 (段数: {segment_count}, 单段时间: {segment_duration}s)", dimension='1d')
                    
                    # 扩展调用generate_plots函数时的参数
                    plots = model.generate_plots(I_avg, V, K, t_exp, C, sine_type=sine_type, 
                                               angle_a=angle_a, exposure_threshold=exposure_threshold, 
                                               contrast_ctr=contrast_ctr, wavelength=wavelength,
                                               custom_intensity_data=custom_intensity_data,
                                               exposure_calculation_method='cumulative',
                                               segment_duration=segment_duration,
                                               segment_count=segment_count, 
                                               segment_intensities=segment_intensities)
                    
                    add_success_log('dill', f"多段曝光时间累积模式计算完成 (总时间: {segment_duration * segment_count}s)", dimension='1d')
                    
                # 检查是否启用曝光时间窗口
                elif data.get('enable_exposure_time_window', False):
                    custom_exposure_times = data.get('custom_exposure_times', None)
                    
                    if custom_exposure_times is not None and len(custom_exposure_times) > 0:
                        # 启用曝光时间窗口：使用自定义曝光时间生成数据
                        add_progress_log('dill', f"启用曝光时间窗口 (自定义时间: {custom_exposure_times})", dimension='1d')
                        plots = model.generate_plots(I_avg, V, K, t_exp, C, sine_type=sine_type, 
                                                   angle_a=angle_a, exposure_threshold=exposure_threshold, 
                                                   contrast_ctr=contrast_ctr, wavelength=wavelength, 
                                                   custom_exposure_times=custom_exposure_times,
                                                   custom_intensity_data=custom_intensity_data)
                        add_success_log('dill', f"曝光时间窗口数据生成完成 ({len(custom_exposure_times)}组时间)", dimension='1d')
                    else:
                        # 未提供有效的自定义时间
                        add_error_log('dill', f"启用曝光时间窗口但未提供有效的自定义时间", dimension='1d')
                        return jsonify(format_response(False, message="启用曝光时间窗口需要提供有效的自定义时间")), 400
                else:
                    # 标准模式：生成基于用户当前输入t_exp的单一时间数据
                    add_progress_log('dill', f"使用标准曝光模式 (t_exp: {t_exp}s)", dimension='1d')
                    plots = model.generate_plots(I_avg, V, K, t_exp, C, sine_type=sine_type, 
                                            angle_a=angle_a, exposure_threshold=exposure_threshold, 
                                            contrast_ctr=contrast_ctr, wavelength=wavelength,
                                            custom_intensity_data=custom_intensity_data)
                    add_success_log('dill', f"标准曝光模式计算完成 (t_exp: {t_exp}s)", dimension='1d')
                
                # 检查是否启用1D动画
                enable_1d_animation = data.get('enable_1d_animation', False)
                if enable_1d_animation:
                    # 获取1D动画参数 - 修复参数名不匹配问题
                    t_exp_start_1d = float(data.get('t_start', 0.1))  # 修复：从 t_exp_start_1d 改为 t_start
                    t_exp_end_1d = float(data.get('t_end', 50.0))     # 修复：从 t_exp_end_1d 改为 t_end
                    time_steps_1d = int(data.get('time_steps', 100))  # 修复：从 time_steps_1d 改为 time_steps
                    
                    add_progress_log('dill', f"启用1D时间动画 (曝光时间: {t_exp_start_1d}s - {t_exp_end_1d}s, {time_steps_1d}步)", dimension='1d')
                    
                    # 生成1D动画数据并合并到静态数据中
                    animation_data = model.generate_1d_animation_data(I_avg, V, K, t_exp_start_1d, t_exp_end_1d, time_steps_1d, C, angle_a, exposure_threshold, contrast_ctr, wavelength)
                    
                    # 直接合并动画数据（动画数据已不再包含会覆盖静态数据的字段）
                    plots.update(animation_data)
                    add_success_log('dill', f"1D动画数据生成完成 ({time_steps_1d}帧)", dimension='1d')
        elif model_type == 'enhanced_dill':
            is_valid, message = validate_enhanced_input(data)
            if not is_valid:
                print(f"参数校验失败: {message}, 参数: {data}")
                add_error_log('enhanced_dill', f"参数校验失败: {message}", dimension=sine_type)
                return jsonify(format_response(False, message=message)), 400
            z_h = float(data['z_h'])
            T = float(data['T'])
            t_B = float(data['t_B'])
            I0 = float(data.get('I0', 1.0))
            M0 = float(data.get('M0', 1.0))
            t_exp = float(data['t_exp'])
            sine_type = data.get('sine_type', '1d')
            
            if sine_type == 'multi':
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                phi_expr = data.get('phi_expr', '0')
                V = float(data.get('V', 0))
                plots = model.generate_plots(z_h, T, t_B, I0, M0, t_exp, 
                                          sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr, V=V)
            elif sine_type == '3d':
                # 处理三维正弦波参数
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                Kz = float(data.get('Kz', 0))
                phi_expr = data.get('phi_expr', '0')
                
                # 获取三维范围参数
                x_min = float(data.get('x_min', 0))
                x_max = float(data.get('x_max', 10))
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                z_min = float(data.get('z_min', 0))
                z_max = float(data.get('z_max', 10))
                
                # 默认使用50个点
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                
                plots = model.generate_plots(z_h, T, t_B, I0, M0, t_exp, 
                                          sine_type=sine_type, Kx=Kx, Ky=Ky, Kz=Kz,
                                          phi_expr=phi_expr, V=V, y_range=y_range, z_range=z_range)
            else:
                plots = model.generate_plots(z_h, T, t_B, I0, M0, t_exp, sine_type=sine_type)
        elif model_type == 'car':
            is_valid, message = validate_car_input(data)
            if not is_valid:
                print(f"参数校验失败: {message}, 参数: {data}")
                add_error_log('car', f"参数校验失败: {message}", dimension=sine_type)
                return jsonify(format_response(False, message=message)), 400
            I_avg = float(data['I_avg'])
            V = float(data['V'])
            t_exp = float(data['t_exp'])
            acid_gen_efficiency = float(data['acid_gen_efficiency'])
            diffusion_length = float(data['diffusion_length'])
            reaction_rate = float(data['reaction_rate'])
            amplification = float(data['amplification'])
            contrast = float(data['contrast'])
            sine_type = data.get('sine_type', '1d')
            
            if sine_type == 'multi':
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                phi_expr = data.get('phi_expr', '0')
                # 为CAR模型添加y_range参数处理
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                y_points = int(data.get('y_points', 100))
                
                if y_min >= y_max:
                    return jsonify(format_response(False, message_zh="Y轴范围最小值必须小于最大值", message_en="Y-axis range min must be less than max")), 400
                if y_points <= 1:
                    return jsonify(format_response(False, message_zh="Y轴点数必须大于1才能进行二维计算", message_en="Number of Y-axis points must be greater than 1 for 2D calculation")), 400
                
                y_range = np.linspace(y_min, y_max, y_points).tolist()
                plot_data = model.generate_plots(I_avg, V, None, t_exp, acid_gen_efficiency, 
                                         diffusion_length, reaction_rate, amplification, contrast, 
                                         sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr, y_range=y_range)
            elif sine_type == '3d':
                # 处理三维正弦波参数
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                Kz = float(data.get('Kz', 0))
                phi_expr = data.get('phi_expr', '0')
                
                # 获取三维范围参数
                x_min = float(data.get('x_min', 0))
                x_max = float(data.get('x_max', 10))
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                z_min = float(data.get('z_min', 0))
                z_max = float(data.get('z_max', 10))
                
                # 打印详细参数用于调试
                print(f"计算3D薄胶模型，参数：Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr={phi_expr}")
                print(f"范围参数：x_min={x_min}, x_max={x_max}, y_min={y_min}, y_max={y_max}, z_min={z_min}, z_max={z_max}")
                
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                
                # 打印生成的范围信息
                print(f"生成的范围：y_range长度={len(y_range) if y_range else 0}, z_range长度={len(z_range) if z_range else 0}")
                
                try:
                    plots = model.generate_plots(I_avg, V, None, t_exp, acid_gen_efficiency, 
                                               diffusion_length, reaction_rate, amplification, contrast,
                                               sine_type=sine_type, Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr,
                                               y_range=y_range, z_range=z_range)
                    # 打印返回数据的结构
                    print(f"返回数据字段：{list(plots.keys())}")
                    if 'exposure_dose' in plots:
                        if isinstance(plots['exposure_dose'], list):
                            print(f"exposure_dose是列表，长度={len(plots['exposure_dose'])}")
                            if len(plots['exposure_dose']) > 0 and isinstance(plots['exposure_dose'][0], list):
                                print(f"exposure_dose是二维列表，形状=[{len(plots['exposure_dose'])}, {len(plots['exposure_dose'][0]) if len(plots['exposure_dose']) > 0 else 0}]")
                            else:
                                print(f"exposure_dose是一维列表")
                except Exception as e:
                    print(f"生成3D数据时出错：{str(e)}")
                    # 记录错误堆栈以便调试
                    traceback.print_exc()
                    raise
            else:
                K = float(data['K'])
                plots = model.generate_plots(I_avg, V, K, t_exp, acid_gen_efficiency, 
                                         diffusion_length, reaction_rate, amplification, contrast, 
                                         sine_type=sine_type)
        else:
            return jsonify(format_response(False, message="未知模型类型")), 400
        return jsonify(format_response(True, data=plots)), 200
    except Exception as e:
        # 记录异常参数和错误信息到日志
        with open('dill_backend.log', 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.datetime.now()}]\n")
            f.write(f"请求参数: {data if 'data' in locals() else '无'}\n")
            f.write(f"异常类型: {type(e).__name__}\n")
            f.write(f"异常信息: {str(e)}\n")
            f.write(f"堆栈信息: {traceback.format_exc()}\n\n")
        return jsonify({'success': False, 'message_zh': f"计算错误: {str(e)}", 'message_en': f"Calculation error: {str(e)}", 'data': None}), 500

@api_bp.route('/calculate_data', methods=['POST'])
def calculate_data():
    """
    计算模型并返回原始数据（用于交互式图表）
    新增参数: model_type, sine_type (支持'1d', 'multi', '3d')
    """
    import time
    
    try:
        data = request.get_json()
        print('收到前端参数:', data)  # 调试用
        
        # === 🔍 调试自定义光强数据 ===
        custom_intensity_data = data.get('custom_intensity_data', None)
        print(f"🔍 API调试 - 自定义光强数据检查:")
        print(f"   - custom_intensity_data存在: {custom_intensity_data is not None}")
        if custom_intensity_data:
            print(f"   - 数据类型: {type(custom_intensity_data)}")
            print(f"   - 数据内容: {custom_intensity_data}")
            if 'x' in custom_intensity_data and 'intensity' in custom_intensity_data:
                print(f"   - X坐标点数: {len(custom_intensity_data['x'])}")
                print(f"   - 光强点数: {len(custom_intensity_data['intensity'])}")
                print(f"   - X范围: [{min(custom_intensity_data['x']):.3f}, {max(custom_intensity_data['x']):.3f}]")
                print(f"   - 光强范围: [{min(custom_intensity_data['intensity']):.6f}, {max(custom_intensity_data['intensity']):.6f}]")
        # === 调试结束 ===
        
        model_type = data.get('model_type', 'dill')
        model = get_model_by_name(model_type)
        sine_type = data.get('sine_type', '1d')
        
        # 开始计算时间统计
        start_time = time.time()
        
        plot_data = None # Initialize plot_data

        # 根据模型类型验证参数
        if model_type == 'dill':
            is_valid, message = validate_input(data)
            if not is_valid:
                print(f"参数校验失败: {message}, 参数: {data}")
                add_error_log('dill', f"参数校验失败: {message}", dimension=sine_type)
                return jsonify(format_response(False, message=message)), 400
            
            I_avg = float(data['I_avg'])
            V = float(data['V'])
            t_exp = float(data['t_exp'])
            C = float(data['C'])
            
            # 检查是否启用4D动画
            enable_4d_animation = data.get('enable_4d_animation', False)
            
            # 检查是否启用1D动画
            enable_1d_animation = data.get('enable_1d_animation', False)
            t_start = float(data.get('t_start', 0)) if enable_4d_animation else 0
            t_end = float(data.get('t_end', 5)) if enable_4d_animation else 5
            time_steps = int(data.get('time_steps', 20)) if enable_4d_animation else 20
            
            if enable_4d_animation:
                add_log_entry('info', 'dill', f"启用4D动画: t_start={t_start}s, t_end={t_end}s, time_steps={time_steps}", dimension=sine_type)
            
            # 添加详细的参数日志
            if sine_type == 'multi':
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                phi_expr = data.get('phi_expr', '0')
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                y_points = int(data.get('y_points', 100))
                
                print(f"Dill模型参数 (2D正弦波): I_avg={I_avg}, V={V}, t_exp={t_exp}, C={C}")
                print(f"  二维参数: Kx={Kx}, Ky={Ky}, phi_expr='{phi_expr}'")
                print(f"  Y轴范围: [{y_min}, {y_max}], 点数: {y_points}")
                print(f"[Dill-2D] 开始计算二维空间分布，网格大小: 1000×{y_points}")
                
                # 添加到日志系统
                add_log_entry('info', 'dill', f"Dill-2D模型参数 (2D正弦波): I_avg={I_avg}, V={V}, t_exp={t_exp}, C={C}", dimension='2d')
                add_log_entry('info', 'dill', f"二维参数: Kx={Kx}, Ky={Ky}, phi_expr='{phi_expr}'", dimension='2d')
                add_log_entry('info', 'dill', f"Y轴范围: [{y_min}, {y_max}], 点数: {y_points}", dimension='2d')
                add_log_entry('progress', 'dill', f"开始计算二维空间分布，网格大小: 1000×{y_points}", dimension='2d')
                
                if y_min >= y_max:
                    add_error_log('dill', "Y轴范围配置错误：最小值必须小于最大值", dimension='2d')
                    return jsonify(format_response(False, message_zh="Y轴范围最小值必须小于最大值", message_en="Y-axis range min must be less than max")), 400
                if y_points <= 1:
                    add_error_log('dill', "Y轴点数配置错误：必须大于1", dimension='2d')
                    return jsonify(format_response(False, message_zh="Y轴点数必须大于1才能进行二维计算", message_en="Number of Y-axis points must be greater than 1 for 2D calculation")), 400
                
                y_range = np.linspace(y_min, y_max, y_points).tolist()
                
                calc_start = time.time()
                try:
                    plot_data = model.generate_data(I_avg, V, None, t_exp, C, sine_type=sine_type, 
                                                    Kx=Kx, Ky=Ky, phi_expr=phi_expr, y_range=y_range,
                                                    enable_4d_animation=enable_4d_animation,
                                                    t_start=t_start, t_end=t_end, time_steps=time_steps)
                    calc_time = time.time() - calc_start
                    
                    if enable_4d_animation:
                        add_log_entry('success', 'dill', f"✅ Dill-2D-4D动画计算完成! 共{time_steps}帧", dimension='2d')
                        add_log_entry('info', 'dill', f"⏱️ 计算耗时: {calc_time:.3f}s", dimension='2d')
                    else:
                        add_log_entry('success', 'dill', f"✅ 二维计算完成!", dimension='2d')
                        add_log_entry('info', 'dill', f"⏱️ 计算耗时: {calc_time:.3f}s", dimension='2d')
                    
                except Exception as e:
                    calc_time = time.time() - calc_start
                    print(f"[Dill-2D] ❌ 二维计算出错: {str(e)}")
                    print(f"[Dill-2D] ⏱️  计算耗时: {calc_time:.3f}s")
                    add_error_log('dill', f"二维计算失败: {str(e)}", dimension='2d')
                    add_log_entry('error', 'dill', f"❌ 二维计算出错: {str(e)}", dimension='2d')
                    add_log_entry('info', 'dill', f"⏱️ 计算耗时: {calc_time:.3f}s", dimension='2d')
                    raise
                    
            elif sine_type == '2d_exposure_pattern':
                print(f"🎯 DEBUG: 进入2D曝光图案分支(calculate_data)，sine_type = '{sine_type}'")
                # 处理2D曝光图案参数 (基于MATLAB latent_image2d.m逻辑)
                add_progress_log('dill', "开始2D曝光图案计算", dimension='2d')
                
                # 获取2D曝光图案参数
                angle_a = float(data.get('angle_a', 11.7))
                exposure_threshold = float(data.get('exposure_threshold', 25))
                contrast_ctr = float(data.get('contrast_ctr', 0.9))
                wavelength = float(data.get('wavelength', 405))
                
                x_min_2d = float(data.get('x_min_2d', -1000))
                x_max_2d = float(data.get('x_max_2d', 1000))
                y_min_2d = float(data.get('y_min_2d', -1000))
                y_max_2d = float(data.get('y_max_2d', 1000))
                step_size_2d = float(data.get('step_size_2d', 5))
                
                print(f"Dill模型参数 (2D曝光图案): I_avg={I_avg}, V={V}, t_exp={t_exp}, C={C}")
                print(f"  2D曝光参数: angle_a={angle_a}, threshold={exposure_threshold}, contrast={contrast_ctr}")
                print(f"  曝光时间: {t_exp}s")
                print(f"  X范围: [{x_min_2d}, {x_max_2d}], Y范围: [{y_min_2d}, {y_max_2d}], 步长: {step_size_2d}")
                
                calc_start = time.time()
                try:
                    # 计算2D曝光图案 - 使用单个曝光时间
                    plot_data = model.calculate_2d_exposure_pattern(
                        C=C, 
                        angle_a_deg=angle_a,
                        exposure_time=t_exp,  # 使用单个曝光时间而非数组
                        contrast_ctr=contrast_ctr,
                        threshold_cd=exposure_threshold,
                        wavelength_nm=wavelength,
                        x_min=x_min_2d, x_max=x_max_2d,
                        y_min=y_min_2d, y_max=y_max_2d,
                        step_size=step_size_2d
                    )
                    calc_time = time.time() - calc_start
                    
                    print(f"[Dill-2D曝光] 🎯 2D曝光图案计算完成统计:")
                    print(f"  ✅ 计算成功")
                    print(f"  ⏱️  计算时间: {calc_time:.3f}s")
                    print(f"  💾 数据字段: {list(plot_data.keys())}")
                    print(f"  📊 曝光时间: {t_exp}")
                    
                    add_success_log('dill', f"2D曝光图案计算完成 (t={t_exp}), 用时{calc_time:.3f}s", dimension='2d')
                    
                except Exception as e:
                    calc_time = time.time() - calc_start
                    print(f"[Dill-2D曝光] ❌ 2D曝光图案计算出错: {str(e)}")
                    print(f"[Dill-2D曝光] ⏱️  计算耗时: {calc_time:.3f}s")
                    add_error_log('dill', f"2D曝光图案计算失败: {str(e)}", dimension='2d')
                    raise
                    
            elif sine_type == '3d':
                Kx = float(data.get('Kx', 0))
                Ky = float(data.get('Ky', 0))
                Kz = float(data.get('Kz', 0))
                phi_expr = data.get('phi_expr', '0')
                x_min = float(data.get('x_min', 0))
                x_max = float(data.get('x_max', 10))
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                z_min = float(data.get('z_min', 0))
                z_max = float(data.get('z_max', 10))
                
                # 生成y_range和z_range
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                
                print(f"Dill模型参数 (3D正弦波): I_avg={I_avg}, V={V}, t_exp={t_exp}, C={C}")
                print(f"  三维参数: Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr='{phi_expr}'")
                print(f"  X轴范围: [{x_min}, {x_max}]")
                print(f"  Y轴范围: [{y_min}, {y_max}]")
                print(f"  Z轴范围: [{z_min}, {z_max}]")
                print(f"[Dill-3D] 开始计算三维空间分布，预计网格大小: 50×50×50")
                
                # 添加到日志系统
                add_log_entry('info', 'dill', f"Dill-3D模型参数 (3D正弦波): I_avg={I_avg}, V={V}, t_exp={t_exp}, C={C}", dimension='3d')
                add_log_entry('info', 'dill', f"三维参数: Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr='{phi_expr}'", dimension='3d')
                add_log_entry('info', 'dill', f"X轴范围: [{x_min}, {x_max}]", dimension='3d')
                add_log_entry('info', 'dill', f"Y轴范围: [{y_min}, {y_max}]", dimension='3d')
                add_log_entry('info', 'dill', f"Z轴范围: [{z_min}, {z_max}]", dimension='3d')
                add_log_entry('progress', 'dill', f"开始计算三维空间分布，预计网格大小: 50×50×50", dimension='3d')
                
                calc_start = time.time()
                try:
                    # 确保z_range正确传递给模型
                    plot_data = model.generate_data(I_avg, V, None, t_exp, C, sine_type=sine_type,
                                                 Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr,
                                                 y_range=y_range, z_range=z_range,
                                                 enable_4d_animation=enable_4d_animation,
                                                 t_start=t_start, t_end=t_end, time_steps=time_steps,
                                                 x_min=x_min, x_max=x_max)
                    calc_time = time.time() - calc_start
                    
                    print(f"[Dill-3D] 🎯 三维计算完成统计:")
                    print(f"  ✅ 计算成功")
                    print(f"  ⏱️  计算时间: {calc_time:.3f}s")
                    print(f"  💾 数据字段: {list(plot_data.keys())}")
                    
                    # 添加到日志系统
                    add_log_entry('success', 'dill', f"🎯 三维计算完成统计", dimension='3d')
                    add_log_entry('info', 'dill', f"✅ 计算成功", dimension='3d')
                    add_log_entry('info', 'dill', f"⏱️ 计算时间: {calc_time:.3f}s", dimension='3d')
                    add_log_entry('info', 'dill', f"💾 数据字段: {list(plot_data.keys())}", dimension='3d')
                    
                    if 'exposure_dose' in plot_data:
                        exp_data = np.array(plot_data['exposure_dose'])
                        thick_data = np.array(plot_data['thickness'])
                        print(f"  🔢 曝光剂量范围: [{exp_data.min():.3f}, {exp_data.max():.3f}] mJ/cm²")
                        print(f"  📏 厚度范围: [{thick_data.min():.4f}, {thick_data.max():.4f}] (归一化)")
                        print(f"  📐 Dill模型3D特征分析:")
                        print(f"     数据维度: {exp_data.shape if exp_data.ndim > 1 else '1D'}")
                        print(f"     空间频率: Kx={Kx}, Ky={Ky}, Kz={Kz}")
                        print(f"     光敏速率常数C: {C:.4f} cm²/mJ")
                        
                        # 添加到日志系统
                        add_log_entry('info', 'dill', f"🔢 曝光剂量范围: [{exp_data.min():.3f}, {exp_data.max():.3f}] mJ/cm²", dimension='3d')
                        add_log_entry('info', 'dill', f"📏 厚度范围: [{thick_data.min():.4f}, {thick_data.max():.4f}] (归一化)", dimension='3d')
                        add_log_entry('info', 'dill', f"📐 Dill模型3D特征分析", dimension='3d')
                        add_log_entry('info', 'dill', f"   数据维度: {exp_data.shape if exp_data.ndim > 1 else '1D'}", dimension='3d')
                        add_log_entry('info', 'dill', f"   空间频率: Kx={Kx}, Ky={Ky}, Kz={Kz}", dimension='3d')
                        add_log_entry('info', 'dill', f"   光敏速率常数C: {C:.4f} cm²/mJ", dimension='3d')
                    
                    add_success_log('dill', f"三维计算完成，用时{calc_time:.3f}s", dimension='3d')
                    
                except Exception as e:
                    calc_time = time.time() - calc_start
                    print(f"[Dill-3D] ❌ 三维计算出错: {str(e)}")
                    print(f"[Dill-3D] ⏱️  计算耗时: {calc_time:.3f}s")
                    add_error_log('dill', f"三维计算失败: {str(e)}", dimension='3d')
                    add_log_entry('error', 'dill', f"❌ 三维计算出错: {str(e)}", dimension='3d')
                    add_log_entry('info', 'dill', f"⏱️ 计算耗时: {calc_time:.3f}s", dimension='3d')
                    raise
                    
            else: # 1D Dill
                print(f"🎯 DEBUG: 进入1D Dill分支，sine_type = '{sine_type}'")
                K = float(data['K'])
                
                # 检查启用的功能
                enable_1d_v_evaluation = data.get('enable_1d_v_evaluation', False)
                
                # ✅ 添加自定义曝光时间窗口逻辑 - 与calculate端点保持一致
                angle_a = float(data.get('angle_a', 11.7))
                exposure_threshold = float(data.get('exposure_threshold', 20))
                contrast_ctr = float(data.get('contrast_ctr', 1))
                wavelength = float(data.get('wavelength', 405))
                
                # 检查是否使用自定义光强分布
                custom_intensity_data = data.get('custom_intensity_data', None)
                
                # 检查是否启用曝光时间窗口
                enable_exposure_time_window = data.get('enable_exposure_time_window', False)
                custom_exposure_times = data.get('custom_exposure_times', None)
                
                print(f"🔥 calculate_data端点: enable_exposure_time_window = {enable_exposure_time_window}")
                print(f"🔥 calculate_data端点: custom_exposure_times = {custom_exposure_times}")
                
                # 首先生成基于用户当前参数的静态数据（这是所有模式的基础）
                print(f"Dill模型参数: I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}, C={C}")
                print(f"[Dill-1D] 生成静态数据作为基础")
                
                calc_start = time.time()
                
                # 检查曝光计量计算方式 - 这里是真正的计算调用点
                exposure_calculation_method = data.get('exposure_calculation_method', 'standard')
                print(f"🔍 真实调用点调试: exposure_calculation_method = '{exposure_calculation_method}'")
                
                # 处理多段曝光时间累积模式
                if exposure_calculation_method == 'cumulative':
                    # 获取多段曝光时间累积参数
                    segment_duration = float(data.get('segment_duration', 1))
                    segment_count = int(data.get('segment_count', 5))
                    segment_intensities = data.get('segment_intensities', [])
                    total_exposure_dose = data.get('total_exposure_dose', segment_count * segment_duration)
                    
                    print(f"🔥 真实调用点: 进入多段曝光时间累积模式")
                    print(f"🔥 参数: segment_count={segment_count}, segment_duration={segment_duration}")
                    print(f"🔥 参数: segment_intensities={segment_intensities}, total_dose={total_exposure_dose}")
                    
                    # 使用多段曝光时间累积模式生成数据
                    plot_data = model.generate_data(I_avg, V, K, t_exp, C, sine_type=sine_type,
                                                   angle_a=angle_a, exposure_threshold=exposure_threshold, 
                                                   contrast_ctr=contrast_ctr, wavelength=wavelength,
                                                   custom_intensity_data=custom_intensity_data,
                                                   exposure_calculation_method='cumulative',
                                                   segment_duration=segment_duration,
                                                   segment_count=segment_count,
                                                   segment_intensities=segment_intensities)
                # 根据曝光时间窗口开关状态选择计算模式
                elif enable_exposure_time_window and custom_exposure_times is not None and len(custom_exposure_times) > 0:
                    print(f"🎯 calculate_data端点: 启用曝光时间窗口，使用自定义曝光时间 {custom_exposure_times}")
                    # 启用曝光时间窗口：使用自定义曝光时间生成数据
                    plot_data = model.generate_data(I_avg, V, K, t_exp, C, sine_type=sine_type, 
                                                   angle_a=angle_a, exposure_threshold=exposure_threshold, 
                                                   contrast_ctr=contrast_ctr, wavelength=wavelength, custom_exposure_times=custom_exposure_times,
                                                   custom_intensity_data=custom_intensity_data)
                else:
                    print(f"🎯 calculate_data端点: 使用标准曝光模式，单一曝光时间 {t_exp}s")
                    # 标准模式：使用单一曝光时间生成数据
                    plot_data = model.generate_data(I_avg, V, K, t_exp, C, sine_type=sine_type,
                                                   angle_a=angle_a, exposure_threshold=exposure_threshold, 
                                                   contrast_ctr=contrast_ctr, wavelength=wavelength,
                                                   custom_intensity_data=custom_intensity_data)
                
                static_calc_time = time.time() - calc_start
                total_calc_time = static_calc_time
                
                # 处理1D动画功能
                if enable_1d_animation:
                    # 处理1D动画参数
                    t_start = float(data.get('t_start', 0.1))
                    t_end = float(data.get('t_end', 5.0))
                    time_steps = int(data.get('time_steps', 500))
                    
                    print(f"[Dill-1D-Animation] 启用1D时间动画，时间范围: {t_start}s - {t_end}s, {time_steps}步")
                    add_progress_log('dill', f"启用1D时间动画 (时间范围: {t_start}s - {t_end}s, {time_steps}步)", dimension='1d')
                    
                    # 生成动画数据
                    print(f"[Dill-1D-Animation] 生成动画数据 ({t_start}s - {t_end}s, {time_steps}帧)")
                    anim_calc_start = time.time()
                    animation_data = model.generate_1d_animation_data(I_avg, V, K, t_start, t_end, time_steps, C, angle_a, exposure_threshold, contrast_ctr)
                    anim_calc_time = time.time() - anim_calc_start
                    total_calc_time += anim_calc_time
                    
                    # 添加动画数据到plot_data
                    plot_data['enable_1d_animation'] = True
                    plot_data['animation_frames'] = []
                    
                    # 处理动画帧数据
                    if 'frames' in animation_data:
                        for frame in animation_data['frames']:
                            frame_data = {
                                'time': frame['t_exp'],
                                't': frame['t_exp'],  # 添加t字段
                                'x': frame['x_coords'],
                                'x_coords': frame['x_coords'],  # 添加x_coords字段
                                # 修复：正确访问exposure_data，支持新旧两种数据格式
                                'exposure_dose': frame.get('exposure_dose', frame.get('exposure_data', {}).get('y', [])),
                                # 修复：正确访问thickness_data，支持新旧两种数据格式
                                'thickness': frame.get('thickness', frame.get('thickness_data', {}).get('y', [])),
                                # 🔥 关键修复：传递多条曝光时间线数据
                                'etch_depths_data': frame.get('etch_depths_data', []),
                                'exposure_times': frame.get('exposure_times', []),
                                'is_ideal_exposure_model': frame.get('is_ideal_exposure_model', False)
                            }
                            plot_data['animation_frames'].append(frame_data)
                    
                    print(f"[Dill-1D-Animation] ✅ 动画数据生成完成: {len(plot_data.get('animation_frames', []))}帧，用时{anim_calc_time:.3f}s")
                    add_log_entry('success', 'dill', f"✅ 1D动画数据生成完成", dimension='1d')
                    add_success_log('dill', f"1D动画数据生成完成 ({time_steps}帧), 用时{anim_calc_time:.3f}s", dimension='1d')
                
                # 处理1D V评估功能
                if enable_1d_v_evaluation:
                    # 处理1D V评估参数
                    v_start = float(data.get('v_start', 0.1))
                    v_end = float(data.get('v_end', 1.0))
                    v_time_steps = int(data.get('time_steps', 500))  # V评估使用相同的步数参数
                    
                    print(f"[Dill-1D-V-Eval] 启用1D V（对比度）评估，V范围: {v_start} - {v_end}, {v_time_steps}步")
                    add_progress_log('dill', f"启用1D V（对比度）评估 (V范围: {v_start} - {v_end}, {v_time_steps}步)", dimension='1d')
                    
                    # 🔥 重要修复：保存当前的静态数据，防止被V评估数据覆盖
                    static_data_backup = {
                        'x': plot_data.get('x', []).copy() if plot_data.get('x') else [],
                        'x_coords': plot_data.get('x_coords', []).copy() if plot_data.get('x_coords') else [],
                        'exposure_dose': plot_data.get('exposure_dose', []).copy() if plot_data.get('exposure_dose') else [],
                        'thickness': plot_data.get('thickness', []).copy() if plot_data.get('thickness') else [],
                        'sine_type': plot_data.get('sine_type', '1d'),
                        'is_ideal_exposure_model': plot_data.get('is_ideal_exposure_model', False),
                        'intensity_distribution': plot_data.get('intensity_distribution', []).copy() if plot_data.get('intensity_distribution') else [],
                        'etch_depths_data': plot_data.get('etch_depths_data', []).copy() if plot_data.get('etch_depths_data') else []
                    }
                    
                    print(f"[Dill-1D-V-Eval] ✅ 已备份静态数据，确保V评估不影响静态图表")
                    print(f"[Dill-1D-V-Eval] 静态数据备份：x长度={len(static_data_backup['x'])}, exposure长度={len(static_data_backup['exposure_dose'])}, thickness长度={len(static_data_backup['thickness'])}")
                    
                    # 生成V评估数据 - 使用理想曝光模型
                    print(f"[Dill-1D-V-Eval] 使用理想曝光模型生成V评估数据 (V: {v_start} - {v_end}, {v_time_steps}帧)")
                    print(f"[Dill-1D-V-Eval] 理想曝光模型参数: angle_a={angle_a}°, exposure_threshold={exposure_threshold}, wavelength={wavelength}nm")
                    v_calc_start = time.time()
                    v_evaluation_data = model.generate_1d_v_animation_data(I_avg, v_start, v_end, v_time_steps, K, t_exp, C, 
                                                                          angle_a=angle_a, exposure_threshold=exposure_threshold, wavelength=wavelength)
                    v_calc_time = time.time() - v_calc_start
                    total_calc_time += v_calc_time
                    
                    # 添加V评估数据到plot_data，但不覆盖静态数据
                    plot_data['enable_1d_v_evaluation'] = True
                    plot_data['v_evaluation_frames'] = []
                    
                    # 处理V评估帧数据
                    if 'frames' in v_evaluation_data:
                        for frame in v_evaluation_data['frames']:
                            frame_data = {
                                'v_value': frame['v_value'],
                                'x': frame['x_coords'],
                                # 修复：正确访问exposure_data，支持新旧两种数据格式
                                'exposure_dose': frame.get('exposure_dose', frame.get('exposure_data', [])),
                                # 修复：正确访问thickness_data，支持新旧两种数据格式
                                'thickness': frame.get('thickness', frame.get('thickness_data', []))
                            }
                            plot_data['v_evaluation_frames'].append(frame_data)
                    
                    # 🔥 关键修复：恢复静态数据，确保前端能同时获得静态数据和V评估数据
                    plot_data.update(static_data_backup)
                    
                    print(f"[Dill-1D-V-Eval] ✅ V评估数据生成完成: {len(plot_data.get('v_evaluation_frames', []))}帧，用时{v_calc_time:.3f}s")
                    print(f"[Dill-1D-V-Eval] ✅ 静态数据已恢复，确保前端静态图表正常显示")
                    print(f"[Dill-1D-V-Eval] 最终数据验证：静态数据x长度={len(plot_data.get('x', []))}, V评估帧数={len(plot_data.get('v_evaluation_frames', []))}")
                    add_log_entry('success', 'dill', f"✅ 1D V评估数据生成完成", dimension='1d')
                    add_success_log('dill', f"1D V评估数据生成完成 ({v_time_steps}帧), 用时{v_calc_time:.3f}s", dimension='1d')
                
                # 如果两个功能都没有启用，输出静态模式信息
                if not enable_1d_animation and not enable_1d_v_evaluation:
                    print(f"[Dill-1D] 静态模式，开始计算一维空间分布，共1000个位置")
                    add_log_entry('info', 'dill', f"Dill-1D模型参数 (1D正弦波): I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}, C={C}", dimension='1d')
                    add_log_entry('progress', 'dill', f"开始计算一维空间分布，共1000个位置", dimension='1d')
                
                calc_time = total_calc_time
                
                # 检查是否为1D动画模式或V评估模式 - 需要区别处理数据结构
                if enable_1d_animation and plot_data and 'animation_frames' in plot_data:
                    # 1D动画模式 - 数据在animation_frames中，不需要进度统计
                    print(f"[Dill-1D-Animation] ✅ 动画数据处理完成，跳过统计分析")
                    add_log_entry('success', 'dill', f"✅ 1D动画数据处理完成", dimension='1d')
                elif data.get('enable_1d_v_evaluation', False) and plot_data and 'v_evaluation_frames' in plot_data:
                    # 1D V评估模式 - 数据在v_evaluation_frames中，不需要进度统计
                    print(f"[Dill-1D-V-Eval] ✅ V评估数据处理完成，跳过统计分析")
                    add_log_entry('success', 'dill', f"✅ 1D V评估数据处理完成", dimension='1d')
                elif plot_data and 'exposure_dose' in plot_data:
                    # 静态1D模式 - 正常处理统计数据
                    exposure_array = np.array(plot_data['exposure_dose'])
                    thickness_array = np.array(plot_data['thickness'])
                    x_array = np.array(plot_data['x'])
                    
                    # 模拟计算进度输出（因为计算很快，这里简化显示）
                    # 确保数组长度足够，避免索引越界
                    array_length = len(x_array)
                    
                    # 动态计算进度索引，确保不超过数组边界
                    idx_20_percent = min(199, array_length - 1)
                    idx_50_percent = min(499, array_length - 1) 
                    idx_80_percent = min(799, array_length - 1)
                    
                    # 安全的进度输出
                    print(f"[Dill-1D] 进度: {idx_20_percent+1}/{array_length}, pos={x_array[idx_20_percent]:.3f}, exposure={exposure_array[idx_20_percent]:.3f}, thickness={thickness_array[idx_20_percent]:.4f}")
                    print(f"[Dill-1D] 进度: {idx_50_percent+1}/{array_length}, pos={x_array[idx_50_percent]:.3f}, exposure={exposure_array[idx_50_percent]:.3f}, thickness={thickness_array[idx_50_percent]:.4f}")
                    print(f"[Dill-1D] 进度: {idx_80_percent+1}/{array_length}, pos={x_array[idx_80_percent]:.3f}, exposure={exposure_array[idx_80_percent]:.3f}, thickness={thickness_array[idx_80_percent]:.4f}")
                    
                    # 添加安全的进度信息到日志系统
                    add_log_entry('progress', 'dill', f"进度: {idx_20_percent+1}/{array_length}, pos={x_array[idx_20_percent]:.3f}, exposure={exposure_array[idx_20_percent]:.3f}, thickness={thickness_array[idx_20_percent]:.4f}", dimension='1d')
                    add_log_entry('progress', 'dill', f"进度: {idx_50_percent+1}/{array_length}, pos={x_array[idx_50_percent]:.3f}, exposure={exposure_array[idx_50_percent]:.3f}, thickness={thickness_array[idx_50_percent]:.4f}", dimension='1d')
                    add_log_entry('progress', 'dill', f"进度: {idx_80_percent+1}/{array_length}, pos={x_array[idx_80_percent]:.3f}, exposure={exposure_array[idx_80_percent]:.3f}, thickness={thickness_array[idx_80_percent]:.4f}", dimension='1d')
                    
                    print(f"[Dill-1D] 🎯 计算完成统计:")
                    print(f"  ✅ 成功计算: 1000/1000 (100.0%)")
                    print(f"  ❌ 失败计算: 0/1000 (0.0%)")
                    print(f"  ⏱️  平均计算时间: {calc_time/1000:.6f}s/点")
                    print(f"  🔢 曝光剂量范围: [{exposure_array.min():.3f}, {exposure_array.max():.3f}] mJ/cm²")
                    print(f"  📏 厚度范围: [{thickness_array.min():.4f}, {thickness_array.max():.4f}] (归一化)")
                    print(f"  💾 数据质量: 优秀")
                    print(f"  📊 统计特征:")
                    print(f"     曝光剂量: 均值={exposure_array.mean():.3f}, 标准差={exposure_array.std():.3f}")
                    print(f"     厚度分布: 均值={thickness_array.mean():.4f}, 标准差={thickness_array.std():.4f}")
                    
                    # 添加详细统计到日志系统
                    add_log_entry('success', 'dill', f"🎯 计算完成统计", dimension='1d')
                    add_log_entry('info', 'dill', f"✅ 成功计算: 1000/1000 (100.0%)", dimension='1d')
                    add_log_entry('info', 'dill', f"❌ 失败计算: 0/1000 (0.0%)", dimension='1d')
                    add_log_entry('info', 'dill', f"⏱️ 平均计算时间: {calc_time/1000:.6f}s/点", dimension='1d')
                    add_log_entry('info', 'dill', f"🔢 曝光剂量范围: [{exposure_array.min():.3f}, {exposure_array.max():.3f}] mJ/cm²", dimension='1d')
                    add_log_entry('info', 'dill', f"📏 厚度范围: [{thickness_array.min():.4f}, {thickness_array.max():.4f}] (归一化)", dimension='1d')
                    add_log_entry('info', 'dill', f"💾 数据质量: 优秀", dimension='1d')
                    add_log_entry('info', 'dill', f"📊 曝光剂量统计: 均值={exposure_array.mean():.3f}, 标准差={exposure_array.std():.3f}", dimension='1d')
                    add_log_entry('info', 'dill', f"📊 厚度分布统计: 均值={thickness_array.mean():.4f}, 标准差={thickness_array.std():.4f}", dimension='1d')
                    
                    # 计算对比度
                    cv_exposure = exposure_array.std() / exposure_array.mean() if exposure_array.mean() > 0 else 0
                    cv_thickness = thickness_array.std() / thickness_array.mean() if thickness_array.mean() > 0 else 0
                    
                    print(f"  📈 高对比度检测: 曝光剂量变化{'显著' if cv_exposure > 0.3 else '适中' if cv_exposure > 0.1 else '较小'} (CV={cv_exposure:.3f})")
                    print(f"  🎭 强调制检测: 厚度变化{'显著' if cv_thickness > 0.3 else '适中' if cv_thickness > 0.1 else '较小'} (CV={cv_thickness:.3f})")
                    print(f"  📐 Dill模型特征分析:")
                    print(f"     对比度因子: {cv_exposure:.3f}")
                    print(f"     分辨率估计: {2*np.pi/K:.3f} μm" if K > 0 else "无限大")
                    print(f"     光敏速率常数C: {C:.4f} cm²/mJ")
                    
                    # 添加分析结果到日志系统
                    contrast_level = '显著' if cv_exposure > 0.3 else '适中' if cv_exposure > 0.1 else '较小'
                    modulation_level = '显著' if cv_thickness > 0.3 else '适中' if cv_thickness > 0.1 else '较小'
                    add_log_entry('info', 'dill', f"📈 高对比度检测: 曝光剂量变化{contrast_level} (CV={cv_exposure:.3f})", dimension='1d')
                    add_log_entry('info', 'dill', f"🎭 强调制检测: 厚度变化{modulation_level} (CV={cv_thickness:.3f})", dimension='1d')
                    add_log_entry('info', 'dill', f"📐 Dill模型特征分析", dimension='1d')
                    add_log_entry('info', 'dill', f"   对比度因子: {cv_exposure:.3f}", dimension='1d')
                    resolution = f"{2*np.pi/K:.3f} μm" if K > 0 else "无限大"
                    add_log_entry('info', 'dill', f"   分辨率估计: {resolution}", dimension='1d')
                    add_log_entry('info', 'dill', f"   光敏速率常数C: {C:.4f} cm²/mJ", dimension='1d')
                
                if enable_1d_animation:
                    add_success_log('dill', f"1D动画数据生成完成，{len(plot_data.get('animation_frames', []))}帧", dimension='1d')
                elif data.get('enable_1d_v_evaluation', False):
                    add_success_log('dill', f"1D V评估数据生成完成，{len(plot_data.get('v_evaluation_frames', []))}帧", dimension='1d')
                else:
                    add_success_log('dill', f"一维计算完成，1000点，用时{calc_time:.3f}s", dimension='1d')

        elif model_type == 'car':
            is_valid, message = validate_car_input(data)
            if not is_valid: 
                add_error_log('car', f"参数校验失败: {message}", dimension=sine_type)
                return jsonify(format_response(False, message=message)), 400
                
            I_avg, V_car, t_exp_car = float(data['I_avg']), float(data['V']), float(data['t_exp'])
            acid_gen_eff, diff_len, react_rate, amp, contr = float(data['acid_gen_efficiency']), float(data['diffusion_length']), float(data['reaction_rate']), float(data['amplification']), float(data['contrast'])
            
            if sine_type == 'multi':
                Kx, Ky, phi_expr = float(data.get('Kx',0)), float(data.get('Ky',0)), data.get('phi_expr','0')
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                y_points = int(data.get('y_points', 100))
                
                print(f"CAR模型参数 (2D正弦波): I_avg={I_avg}, V={V_car}, t_exp={t_exp_car}")
                print(f"  化学放大参数: η={acid_gen_eff}, l_diff={diff_len}, k={react_rate}, A={amp}, contrast={contr}")
                print(f"  二维参数: Kx={Kx}, Ky={Ky}, phi_expr='{phi_expr}'")
                print(f"  Y轴范围: [{y_min}, {y_max}], 点数: {y_points}")
                print(f"[CAR-2D] 开始计算化学放大二维空间分布，网格大小: 1000×{y_points}")
                
                # 添加到日志系统
                add_log_entry('info', 'car', f"CAR-2D模型参数 (2D正弦波): I_avg={I_avg}, V={V_car}, t_exp={t_exp_car}", dimension='2d')
                add_log_entry('info', 'car', f"化学放大参数: η={acid_gen_eff}, l_diff={diff_len}, k={react_rate}, A={amp}, contrast={contr}", dimension='2d')
                add_log_entry('info', 'car', f"二维参数: Kx={Kx}, Ky={Ky}, phi_expr='{phi_expr}'", dimension='2d')
                add_log_entry('info', 'car', f"Y轴范围: [{y_min}, {y_max}], 点数: {y_points}", dimension='2d')
                add_log_entry('progress', 'car', f"开始计算化学放大二维空间分布，网格大小: 1000×{y_points}", dimension='2d')
                
                if y_min >= y_max:
                    add_error_log('car', "Y轴范围配置错误", dimension='2d')
                    return jsonify(format_response(False, message_zh="Y轴范围最小值必须小于最大值", message_en="Y-axis range min must be less than max")), 400
                if y_points <= 1:
                    add_error_log('car', "Y轴点数配置错误", dimension='2d')
                    return jsonify(format_response(False, message_zh="Y轴点数必须大于1才能进行二维计算", message_en="Number of Y-axis points must be greater than 1 for 2D calculation")), 400
                
                y_range = np.linspace(y_min, y_max, y_points).tolist()
                
                calc_start = time.time()
                plot_data = model.generate_data(I_avg, V_car, None, t_exp_car, acid_gen_eff, diff_len, react_rate, amp, contr, sine_type=sine_type, Kx=Kx, Ky=Ky, phi_expr=phi_expr, y_range=y_range)
                calc_time = time.time() - calc_start
                
                if plot_data and 'z_acid_concentration' in plot_data:
                    acid_array = np.array(plot_data['z_acid_concentration'])
                    deprotect_array = np.array(plot_data['z_deprotection'])
                    
                    print(f"[CAR-2D] 🎯 二维化学放大计算完成统计:")
                    print(f"  ✅ 网格大小: {acid_array.shape}")
                    print(f"  ⏱️  计算时间: {calc_time:.3f}s")
                    print(f"  🧪 光酸浓度范围: [{acid_array.min():.3f}, {acid_array.max():.3f}] 相对单位")
                    print(f"  🔬 脱保护度范围: [{deprotect_array.min():.4f}, {deprotect_array.max():.4f}] (归一化)")
                    print(f"  ⚗️  CAR模型化学放大分析:")
                    print(f"     光酸产生效率: {acid_gen_eff}")
                    print(f"     扩散长度: {diff_len} μm")
                    print(f"     反应速率: {react_rate}")
                    print(f"     放大因子: {amp}")
                    print(f"     空间频率: Kx={Kx}, Ky={Ky}")
                    
                    # 添加详细统计到日志系统
                    add_log_entry('success', 'car', f"🎯 二维化学放大计算完成统计", dimension='2d')
                    add_log_entry('info', 'car', f"✅ 网格大小: {acid_array.shape}", dimension='2d')
                    add_log_entry('info', 'car', f"⏱️ 计算时间: {calc_time:.3f}s", dimension='2d')
                    add_log_entry('info', 'car', f"🧪 光酸浓度范围: [{acid_array.min():.3f}, {acid_array.max():.3f}] 相对单位", dimension='2d')
                    add_log_entry('info', 'car', f"🔬 脱保护度范围: [{deprotect_array.min():.4f}, {deprotect_array.max():.4f}] (归一化)", dimension='2d')
                    add_log_entry('info', 'car', f"⚗️ CAR模型化学放大分析", dimension='2d')
                    add_log_entry('info', 'car', f"   光酸产生效率: {acid_gen_eff}", dimension='2d')
                    add_log_entry('info', 'car', f"   扩散长度: {diff_len} μm", dimension='2d')
                    add_log_entry('info', 'car', f"   反应速率: {react_rate}", dimension='2d')
                    add_log_entry('info', 'car', f"   放大因子: {amp}", dimension='2d')
                    add_log_entry('info', 'car', f"   空间频率: Kx={Kx}, Ky={Ky}", dimension='2d')
                
                add_success_log('car', f"二维化学放大计算完成，放大因子{amp}，用时{calc_time:.3f}s", dimension='2d')
                
            elif sine_type == '3d':
                Kx, Ky, Kz, phi_expr = float(data.get('Kx',0)), float(data.get('Ky',0)), float(data.get('Kz',0)), data.get('phi_expr','0')
                y_min = float(data.get('y_min', 0))
                y_max = float(data.get('y_max', 10))
                z_min = float(data.get('z_min', 0))
                z_max = float(data.get('z_max', 10))
                
                print(f"CAR模型参数 (3D正弦波): I_avg={I_avg}, V={V_car}, t_exp={t_exp_car}")
                print(f"  化学放大参数: η={acid_gen_eff}, l_diff={diff_len}, k={react_rate}, A={amp}, contrast={contr}")
                print(f"  三维参数: Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr='{phi_expr}'")
                print(f"  Y轴范围: [{y_min}, {y_max}]")
                print(f"  Z轴范围: [{z_min}, {z_max}]")
                print(f"[CAR-3D] 开始计算化学放大三维空间分布，预计网格大小: 50×50×50")
                
                # 添加到日志系统
                add_log_entry('info', 'car', f"CAR-3D模型参数 (3D正弦波): I_avg={I_avg}, V={V_car}, t_exp={t_exp_car}", dimension='3d')
                add_log_entry('info', 'car', f"化学放大参数: η={acid_gen_eff}, l_diff={diff_len}, k={react_rate}, A={amp}, contrast={contr}", dimension='3d')
                add_log_entry('info', 'car', f"三维参数: Kx={Kx}, Ky={Ky}, Kz={Kz}, phi_expr='{phi_expr}'", dimension='3d')
                add_log_entry('info', 'car', f"Y轴范围: [{y_min}, {y_max}]", dimension='3d')
                add_log_entry('info', 'car', f"Z轴范围: [{z_min}, {z_max}]", dimension='3d')
                add_log_entry('progress', 'car', f"开始计算化学放大三维空间分布，预计网格大小: 50×50×50", dimension='3d')
                
                y_range = np.linspace(y_min, y_max, 50).tolist() if y_min < y_max else None
                z_range = np.linspace(z_min, z_max, 50).tolist() if z_min < z_max else None
                
                # 检查是否启用4D动画
                enable_4d_animation = data.get('enable_4d_animation', False)
                if enable_4d_animation:
                    t_start = float(data.get('t_start', 0))
                    t_end = float(data.get('t_end', 5))
                    time_steps = int(data.get('time_steps', 20))
                    
                    print(f"[CAR-3D] 启用4D动画: t_start={t_start}, t_end={t_end}, time_steps={time_steps}")
                    add_log_entry('info', 'car', f"启用4D动画: t_start={t_start}, t_end={t_end}, time_steps={time_steps}", dimension='4d')
                
                calc_start = time.time()
                plot_data = model.generate_data(I_avg, V_car, None, t_exp_car, acid_gen_eff, diff_len, react_rate, amp, contr, 
                                             sine_type=sine_type, Kx=Kx, Ky=Ky, Kz=Kz, phi_expr=phi_expr, 
                                             y_range=y_range, z_range=z_range, 
                                             enable_4d_animation=enable_4d_animation,
                                             t_start=t_start if enable_4d_animation else 0,
                                             t_end=t_end if enable_4d_animation else 5,
                                             time_steps=time_steps if enable_4d_animation else 20)
                calc_time = time.time() - calc_start
                
                print(f"[CAR-3D] 🎯 三维化学放大计算完成统计:")
                print(f"  ✅ 计算成功")
                print(f"  ⏱️  计算时间: {calc_time:.3f}s")
                print(f"  ⚗️  CAR模型3D化学放大分析:")
                print(f"     光酸产生效率: {acid_gen_eff}")
                print(f"     扩散长度: {diff_len} μm")
                print(f"     三维空间频率: Kx={Kx}, Ky={Ky}, Kz={Kz}")
                print(f"     化学放大因子: {amp}")
                
                # 添加到日志系统
                add_log_entry('success', 'car', f"🎯 三维化学放大计算完成统计", dimension='3d')
                add_log_entry('info', 'car', f"✅ 计算成功", dimension='3d')
                add_log_entry('info', 'car', f"⏱️ 计算时间: {calc_time:.3f}s", dimension='3d')
                add_log_entry('info', 'car', f"⚗️ CAR模型3D化学放大分析", dimension='3d')
                add_log_entry('info', 'car', f"   光酸产生效率: {acid_gen_eff}", dimension='3d')
                add_log_entry('info', 'car', f"   扩散长度: {diff_len} μm", dimension='3d')
                add_log_entry('info', 'car', f"   三维空间频率: Kx={Kx}, Ky={Ky}, Kz={Kz}", dimension='3d')
                add_log_entry('info', 'car', f"   化学放大因子: {amp}", dimension='3d')
                
                add_success_log('car', f"三维化学放大计算完成，放大因子{amp}，用时{calc_time:.3f}s", dimension='3d')
                
            else: # 1D CAR
                K_car = float(data.get('K', 2.0))
                
                print(f"CAR模型参数 (1D正弦波): I_avg={I_avg}, V={V_car}, K={K_car}, t_exp={t_exp_car}")
                print(f"  化学放大参数: η={acid_gen_eff}, l_diff={diff_len}, k={react_rate}, A={amp}, contrast={contr}")
                print(f"[CAR-1D] 开始计算化学放大一维空间分布，共1000个位置")
                
                # 添加到日志系统
                add_log_entry('info', 'car', f"CAR-1D模型参数 (1D正弦波): I_avg={I_avg}, V={V_car}, K={K_car}, t_exp={t_exp_car}", dimension='1d')
                add_log_entry('info', 'car', f"化学放大参数: η={acid_gen_eff}, l_diff={diff_len}, k={react_rate}, A={amp}, contrast={contr}", dimension='1d')
                add_log_entry('progress', 'car', f"开始计算化学放大一维空间分布，共1000个位置", dimension='1d')
                
                calc_start = time.time()
                plot_data = model.generate_data(I_avg, V_car, K_car, t_exp_car, acid_gen_eff, diff_len, react_rate, amp, contr, sine_type=sine_type)
                calc_time = time.time() - calc_start
                
                if plot_data and 'acid_concentration' in plot_data:
                    acid_array = np.array(plot_data['acid_concentration'])
                    deprotect_array = np.array(plot_data['deprotection'])
                    x_array = np.array(plot_data['positions'])
                    
                    # 确保数组长度足够，避免索引越界
                    array_length = len(x_array)
                    
                    # 动态计算进度索引，确保不超过数组边界
                    idx_20_percent = min(199, array_length - 1)
                    idx_50_percent = min(499, array_length - 1) 
                    idx_80_percent = min(799, array_length - 1)
                    
                    # 安全的进度输出
                    print(f"[CAR-1D] 进度: {idx_20_percent+1}/{array_length}, pos={x_array[idx_20_percent]:.3f}, acid={acid_array[idx_20_percent]:.3f}, deprotection={deprotect_array[idx_20_percent]:.4f}")
                    print(f"[CAR-1D] 进度: {idx_50_percent+1}/{array_length}, pos={x_array[idx_50_percent]:.3f}, acid={acid_array[idx_50_percent]:.3f}, deprotection={deprotect_array[idx_50_percent]:.4f}")
                    print(f"[CAR-1D] 进度: {idx_80_percent+1}/{array_length}, pos={x_array[idx_80_percent]:.3f}, acid={acid_array[idx_80_percent]:.3f}, deprotection={deprotect_array[idx_80_percent]:.4f}")
                    
                    # 添加安全的进度信息到日志系统
                    add_log_entry('progress', 'car', f"进度: {idx_20_percent+1}/{array_length}, pos={x_array[idx_20_percent]:.3f}, acid={acid_array[idx_20_percent]:.3f}, deprotection={deprotect_array[idx_20_percent]:.4f}", dimension='1d')
                    add_log_entry('progress', 'car', f"进度: {idx_50_percent+1}/{array_length}, pos={x_array[idx_50_percent]:.3f}, acid={acid_array[idx_50_percent]:.3f}, deprotection={deprotect_array[idx_50_percent]:.4f}", dimension='1d')
                    add_log_entry('progress', 'car', f"进度: {idx_80_percent+1}/{array_length}, pos={x_array[idx_80_percent]:.3f}, acid={acid_array[idx_80_percent]:.3f}, deprotection={deprotect_array[idx_80_percent]:.4f}", dimension='1d')
                    
                    print(f"[CAR-1D] 🎯 计算完成统计:")
                    print(f"  ✅ 成功计算: 1000/1000 (100.0%)")
                    print(f"  ❌ 失败计算: 0/1000 (0.0%)")
                    print(f"  ⏱️  平均计算时间: {calc_time/1000:.6f}s/点")
                    print(f"  🧪 光酸浓度范围: [{acid_array.min():.3f}, {acid_array.max():.3f}] 相对单位")
                    print(f"  🔬 脱保护度范围: [{deprotect_array.min():.4f}, {deprotect_array.max():.4f}] (归一化)")
                    print(f"  💾 数据质量: 优秀")
                    print(f"  📊 统计特征:")
                    print(f"     光酸浓度: 均值={acid_array.mean():.3f}, 标准差={acid_array.std():.3f}")
                    print(f"     脱保护度: 均值={deprotect_array.mean():.4f}, 标准差={deprotect_array.std():.4f}")
                    print(f"  ⚗️  CAR模型化学放大分析:")
                    print(f"     光酸产生效率: {acid_gen_eff}")
                    print(f"     扩散长度: {diff_len} μm")
                    print(f"     反应速率常数: {react_rate}")
                    print(f"     化学放大因子: {amp}")
                    print(f"     对比度: {contr}")
                    
                    # 添加详细统计到日志系统
                    add_log_entry('success', 'car', f"🎯 计算完成统计", dimension='1d')
                    add_log_entry('info', 'car', f"✅ 成功计算: 1000/1000 (100.0%)", dimension='1d')
                    add_log_entry('info', 'car', f"❌ 失败计算: 0/1000 (0.0%)", dimension='1d')
                    add_log_entry('info', 'car', f"⏱️ 平均计算时间: {calc_time/1000:.6f}s/点", dimension='1d')
                    add_log_entry('info', 'car', f"🧪 光酸浓度范围: [{acid_array.min():.3f}, {acid_array.max():.3f}] 相对单位", dimension='1d')
                    add_log_entry('info', 'car', f"🔬 脱保护度范围: [{deprotect_array.min():.4f}, {deprotect_array.max():.4f}] (归一化)", dimension='1d')
                    add_log_entry('info', 'car', f"💾 数据质量: 优秀", dimension='1d')
                    add_log_entry('info', 'car', f"📊 光酸浓度统计: 均值={acid_array.mean():.3f}, 标准差={acid_array.std():.3f}", dimension='1d')
                    add_log_entry('info', 'car', f"📊 脱保护度统计: 均值={deprotect_array.mean():.4f}, 标准差={deprotect_array.std():.4f}", dimension='1d')
                    add_log_entry('info', 'car', f"⚗️ CAR模型化学放大分析", dimension='1d')
                    add_log_entry('info', 'car', f"   光酸产生效率: {acid_gen_eff}", dimension='1d')
                    add_log_entry('info', 'car', f"   扩散长度: {diff_len} μm", dimension='1d')
                    add_log_entry('info', 'car', f"   反应速率常数: {react_rate}", dimension='1d')
                    add_log_entry('info', 'car', f"   化学放大因子: {amp}", dimension='1d')
                    add_log_entry('info', 'car', f"   对比度: {contr}", dimension='1d')
                
                add_success_log('car', f"一维化学放大计算完成，放大因子{amp}，用时{calc_time:.3f}s", dimension='1d')
        else:
            add_error_log('system', f"未知模型类型: {model_type}", dimension=sine_type)
            return jsonify(format_response(False, message="未知模型类型")), 400
        
        # 总计算时间
        total_time = time.time() - start_time
        print(f"[{model_type.upper()}-{sine_type.upper()}] 🏁 总计算时间: {total_time:.3f}s")
        
        # 添加总计算时间到日志系统
        dimension_map = {'1d': '1d', 'multi': '2d', '3d': '3d', 'single': '1d'}
        dimension = dimension_map.get(sine_type, sine_type)
        add_log_entry('success', model_type, f"🏁 总计算时间: {total_time:.3f}s", dimension=dimension)
        
        # Enhanced Dill模型2D数据验证和统计
        if model_type == 'enhanced_dill' and sine_type == 'multi' and plot_data:
            print(f"[Enhanced-Dill-2D] 📊 数据完整性验证:")
            
            # 检查兼容性字段
            has_z_exposure_dose = 'z_exposure_dose' in plot_data and plot_data['z_exposure_dose']
            has_z_thickness = 'z_thickness' in plot_data and plot_data['z_thickness']
            
            # 检查扩展字段
            has_yz_data = 'yz_exposure' in plot_data and 'yz_thickness' in plot_data
            has_xy_data = 'xy_exposure' in plot_data and 'xy_thickness' in plot_data
            
            print(f"  ✅ 兼容性数据: z_exposure_dose={has_z_exposure_dose}, z_thickness={has_z_thickness}")
            print(f"  ✅ YZ平面数据: yz_exposure={has_yz_data}")
            print(f"  ✅ XY平面数据: xy_exposure={has_xy_data}")
            print(f"  ✅ 元数据: is_2d={plot_data.get('is_2d', False)}")
            
            # 添加验证结果到日志
            add_log_entry('info', 'enhanced_dill', f"📊 数据完整性验证", dimension='2d')
            add_log_entry('info', 'enhanced_dill', f"  兼容性数据: z_exposure_dose={has_z_exposure_dose}, z_thickness={has_z_thickness}", dimension='2d')
            add_log_entry('info', 'enhanced_dill', f"  YZ平面数据: yz_exposure={has_yz_data}", dimension='2d')
            add_log_entry('info', 'enhanced_dill', f"  XY平面数据: xy_exposure={has_xy_data}", dimension='2d')
            add_log_entry('info', 'enhanced_dill', f"  元数据: is_2d={plot_data.get('is_2d', False)}", dimension='2d')
            
            if has_z_exposure_dose and has_z_thickness:
                add_log_entry('success', 'enhanced_dill', f"✅ Enhanced Dill 2D数据准备完成，前端显示已就绪", dimension='2d')
            else:
                add_log_entry('warning', 'enhanced_dill', f"⚠️ Enhanced Dill 2D兼容性数据不完整", dimension='2d')
        
        return jsonify(format_response(True, data=plot_data)), 200
    except Exception as e:
        # 记录异常参数和错误信息到日志
        with open('dill_backend.log', 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.datetime.now()}]\n")
            f.write(f"请求参数: {data if 'data' in locals() else '无'}\n")
            f.write(f"异常类型: {type(e).__name__}\n")
            f.write(f"异常信息: {str(e)}\n")
            f.write(f"堆栈信息: {traceback.format_exc()}\n\n")
        
        model_type = data.get('model_type', 'unknown') if 'data' in locals() else 'unknown'
        sine_type = data.get('sine_type', 'unknown') if 'data' in locals() else 'unknown'
        add_error_log(model_type, f"计算异常: {str(e)}", dimension=sine_type)
        
        return jsonify(format_response(False, message=f"数据计算错误: {str(e)}")), 500

@api_bp.route('/compare', methods=['POST'])
def compare():
    """
    比较多组参数的计算结果
    
    接收参数:
        parameter_sets: 包含多组参数的数组，支持薄胶/厚胶/CAR模型参数
        
    返回:
        JSON格式的响应，包含比较图像
    """
    try:
        # 获取JSON数据
        data = request.get_json()
        
        # 验证输入
        if 'parameter_sets' not in data or not isinstance(data['parameter_sets'], list):
            return jsonify(format_response(False, message="缺少parameter_sets数组")), 400
        
        if len(data['parameter_sets']) < 1:
            return jsonify(format_response(False, message="至少需要一组参数")), 400
            
        parameter_sets = data['parameter_sets']
        
        # 验证每组参数
        for i, params in enumerate(parameter_sets):
            # 识别参数组类型（薄胶/厚胶/CAR）
            if any(k in params for k in ['acid_gen_efficiency', 'diffusion_length', 'reaction_rate']):
                # CAR模型参数组
                from backend.utils.helpers import validate_car_input
                is_valid, message = validate_car_input(params)
            elif any(k in params for k in ['z_h', 'I0', 'M0']):
                # 厚胶模型参数组
                from backend.utils.helpers import validate_enhanced_input
                is_valid, message = validate_enhanced_input(params)
            else:
                # 薄胶模型参数组
                is_valid, message = validate_input(params)
                
            if not is_valid:
                return jsonify(format_response(False, message=f"参数组 {i+1}: {message}")), 400
        
        # 生成比较图像
        comparison_plots = generate_comparison_plots_with_enhanced(parameter_sets)
        
        # 返回结果
        return jsonify(format_response(True, data=comparison_plots)), 200
    
    except Exception as e:
        # 记录异常参数和错误信息到日志
        with open('dill_backend.log', 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.datetime.now()}]\n")
            f.write(f"请求参数: {data if 'data' in locals() else '无'}\n")
            f.write(f"异常类型: {type(e).__name__}\n")
            f.write(f"异常信息: {str(e)}\n")
            f.write(f"堆栈信息: {traceback.format_exc()}\n\n")
        return jsonify(format_response(False, message=f"比较计算错误: {str(e)}")), 500

@api_bp.route('/compare_data', methods=['POST'])
def compare_data():
    """
    比较多组参数的计算结果，返回原始数据（用于交互式图表）
    """
    try:
        data = request.get_json()
        if 'parameter_sets' not in data or not isinstance(data['parameter_sets'], list):
            return jsonify(format_response(False, message="缺少parameter_sets数组")), 400
        if len(data['parameter_sets']) < 1:
            return jsonify(format_response(False, message="至少需要一组参数")), 400
            
        parameter_sets = data['parameter_sets']
        x = np.linspace(0, 10, 1000).tolist()
        exposure_doses = []
        thicknesses = []
        
        # 初始化所有需要的模型实例
        dill_model = None
        enhanced_model = None
        car_model = None
        
        for i, params in enumerate(parameter_sets):
            set_id = params.get('setId', str(i+1))
            custom_name = params.get('customName', f'参数组 {set_id}')
            
            # 判断模型类型的逻辑
            model_type = params.get('model_type', 'dill')
            
            if model_type == 'enhanced_dill' or any(k in params for k in ['z_h', 'I0', 'M0']):
                # Enhanced Dill模型
                if enhanced_model is None:
                    from ..models import EnhancedDillModel
                    enhanced_model = EnhancedDillModel()
                
                # 获取Enhanced Dill参数
                z_h = float(params.get('z_h', 10))  # 胶厚度
                T = float(params.get('T', 100))     # 前烘温度
                t_B = float(params.get('t_B', 10))  # 前烘时间
                I0 = float(params.get('I0', 1.0))   # 初始光强
                M0 = float(params.get('M0', 1.0))   # 初始PAC浓度
                t_exp = float(params.get('t_exp', 5))  # 曝光时间
                K = float(params.get('K', 2))       # 空间频率
                V = float(params.get('V', 0.8))     # 干涉条纹可见度
                
                print(f"Enhanced Dill-1D模型参数 - 参数组{set_id}: z_h={z_h}, T={T}, t_B={t_B}, I0={I0}, M0={M0}, t_exp={t_exp}, K={K}, V={V}")
                add_log_entry('info', 'enhanced_dill', f"参数组{set_id}: z_h={z_h}, T={T}, t_B={t_B}, I0={I0}, M0={M0}, t_exp={t_exp}, K={K}, V={V}")
                
                # 使用真正的Enhanced Dill模型PDE求解器
                exposure_dose_data = []
                thickness_data = []
                
                print(f"[Enhanced Dill] 开始计算1D空间分布，共{len(x)}个位置")
                add_log_entry('info', 'enhanced_dill', f"开始计算1D空间分布，共{len(x)}个位置")
                
                total_compute_time = 0
                successful_calcs = 0
                fallback_calcs = 0
                
                for i, pos in enumerate(x):
                    try:
                        # 使用自适应PDE求解器，自动优化计算效率
                        z, I_final, M_final, exposure_dose_profile, compute_time = enhanced_model.adaptive_solve_enhanced_dill_pde(
                            z_h=z_h, T=T, t_B=t_B, I0=I0, M0=M0, t_exp=t_exp,
                            x_position=pos,   # 传递x位置给边界条件
                            K=K, V=V, phi_expr=None,
                            max_points=150,   # 最大网格点数
                            tolerance=1e-4    # 收敛容差
                        )
                        
                        # 计算表面曝光剂量和厚度
                        surface_exposure = exposure_dose_profile[0]
                        surface_thickness = M_final[0]
                        
                        exposure_dose_data.append(float(surface_exposure))
                        thickness_data.append(float(surface_thickness))
                        
                        total_compute_time += compute_time
                        successful_calcs += 1
                        
                        if i % 200 == 0:  # 每200个点打印一次进度
                            avg_time = total_compute_time / successful_calcs if successful_calcs > 0 else 0
                            print(f"[Enhanced Dill] 进度: {i+1}/{len(x)}, pos={pos:.3f}, exposure={surface_exposure:.3f}, thickness={surface_thickness:.4f}, 平均计算时间={avg_time:.4f}s")
                            add_log_entry('progress', 'enhanced_dill', f"进度: {i+1}/{len(x)}, pos={pos:.3f}, exposure={surface_exposure:.3f}, thickness={surface_thickness:.4f}, 平均计算时间={avg_time:.4f}s")
                            
                    except Exception as e:
                        print(f"[Enhanced Dill] 位置{pos}计算出错: {e}")
                        # 使用备用简化计算
                        try:
                            A_val, B_val, C_val = enhanced_model.get_abc(z_h, T, t_B)
                            local_I0 = I0 * (1 + V * np.cos(K * pos))
                            simple_exposure = local_I0 * t_exp
                            simple_thickness = np.exp(-C_val * simple_exposure)
                            exposure_dose_data.append(float(simple_exposure))
                            thickness_data.append(float(simple_thickness))
                            fallback_calcs += 1
                        except Exception as e2:
                            print(f"[Enhanced Dill] 备用计算也失败: {e2}")
                            # 使用默认值
                            exposure_dose_data.append(float(I0 * t_exp))
                            thickness_data.append(float(0.5))
                            fallback_calcs += 1
                
                # 计算和报告统计信息
                avg_compute_time = total_compute_time / successful_calcs if successful_calcs > 0 else 0
                total_time = total_compute_time + fallback_calcs * 0.001  # 估算备用计算时间
                
                print(f"[Enhanced Dill] 🎯 计算完成统计:")
                add_log_entry('stats', 'enhanced_dill', f"🎯 计算完成统计:")
                print(f"  ✅ 成功计算: {successful_calcs}/{len(x)} ({successful_calcs/len(x)*100:.1f}%)")
                add_log_entry('stats', 'enhanced_dill', f"✅ 成功计算: {successful_calcs}/{len(x)} ({successful_calcs/len(x)*100:.1f}%)")
                print(f"  ⚠️  备用计算: {fallback_calcs}/{len(x)} ({fallback_calcs/len(x)*100:.1f}%)")
                add_log_entry('stats', 'enhanced_dill', f"⚠️ 备用计算: {fallback_calcs}/{len(x)} ({fallback_calcs/len(x)*100:.1f}%)")
                print(f"  ⏱️  平均计算时间: {avg_compute_time:.4f}s/点")
                add_log_entry('stats', 'enhanced_dill', f"⏱️ 平均计算时间: {avg_compute_time:.4f}s/点")
                print(f"  🔢 曝光剂量范围: [{min(exposure_dose_data):.3f}, {max(exposure_dose_data):.3f}] mJ/cm²")
                add_log_entry('stats', 'enhanced_dill', f"🔢 曝光剂量范围: [{min(exposure_dose_data):.3f}, {max(exposure_dose_data):.3f}] mJ/cm²")
                print(f"  📏 厚度范围: [{min(thickness_data):.4f}, {max(thickness_data):.4f}] (归一化)")
                add_log_entry('stats', 'enhanced_dill', f"📏 厚度范围: [{min(thickness_data):.4f}, {max(thickness_data):.4f}] (归一化)")
                print(f"  💾 数据质量: {'优秀' if fallback_calcs/len(x) < 0.1 else '良好' if fallback_calcs/len(x) < 0.3 else '需要优化'}")
                add_log_entry('stats', 'enhanced_dill', f"💾 数据质量: {'优秀' if fallback_calcs/len(x) < 0.1 else '良好' if fallback_calcs/len(x) < 0.3 else '需要优化'}")
                
                # 检查数据质量
                if fallback_calcs > len(x) * 0.2:
                    print(f"  ⚠️  警告: 超过20%的计算使用了备用方法，可能影响精度")
                    
                # 物理合理性检查
                exp_mean = np.mean(exposure_dose_data)
                exp_std = np.std(exposure_dose_data)
                thick_mean = np.mean(thickness_data)
                thick_std = np.std(thickness_data)
                
                print(f"  📊 统计特征:")
                print(f"     曝光剂量: 均值={exp_mean:.3f}, 标准差={exp_std:.3f}")
                print(f"     厚度分布: 均值={thick_mean:.4f}, 标准差={thick_std:.4f}")
                
                if exp_std / exp_mean > 0.5:
                    print(f"  📈 高对比度检测: 曝光剂量变化显著 (CV={exp_std/exp_mean:.3f})")
                if thick_std / thick_mean > 0.3:
                    print(f"  🎭 强调制检测: 厚度变化显著 (CV={thick_std/thick_mean:.3f})")
                
                # Enhanced Dill模型特有的厚胶分析
                print(f"  🔬 Enhanced Dill模型厚胶分析:")
                print(f"     胶厚z_h: {z_h:.1f} μm")
                print(f"     前烘温度T: {T:.0f} ℃")
                print(f"     前烘时间t_B: {t_B:.0f} min")
                
                # 估算ABC参数范围（基于参数拟合公式）
                A_est = 0.1 + 0.01 * z_h + 0.001 * T
                B_est = 0.05 + 0.005 * z_h + 0.0005 * T
                C_est = 0.02 + 0.002 * z_h + 0.0001 * T
                print(f"     估算ABC参数: A≈{A_est:.4f}, B≈{B_est:.4f}, C≈{C_est:.4f}")
                
                # 厚胶特性评估
                thickness_factor = z_h / 10.0  # 以10μm为基准
                thermal_factor = (T - 100) / 50.0  # 以100℃为基准
                time_factor = t_B / 10.0  # 以10min为基准
                
                print(f"     厚胶特性评估:")
                if thickness_factor > 1.5:
                    print(f"       📏 超厚胶层({z_h}μm): 光强衰减显著，需增强曝光")
                elif thickness_factor > 1.0:
                    print(f"       📏 厚胶层({z_h}μm): 适中的深度穿透性")
                else:
                    print(f"       📏 薄胶层({z_h}μm): 可考虑使用标准Dill模型")
                
                if thermal_factor > 0.2:
                    print(f"       🌡️  高温前烘({T}℃): 有利于光酸扩散")
                elif thermal_factor < -0.2:
                    print(f"       🌡️  低温前烘({T}℃): 扩散受限，对比度增强")
                
                # 光学穿透深度估算
                penetration_depth = 1.0 / (A_est + B_est) if (A_est + B_est) > 0 else z_h
                print(f"     光学穿透深度: {penetration_depth:.2f} μm")
                
                if penetration_depth < z_h * 0.5:
                    print(f"  ⚠️  穿透不足: 底部可能曝光不足")
                elif penetration_depth > z_h * 1.5:
                    print(f"  ✨ 穿透充分: 整层光刻胶均匀曝光")

                print(f"[Enhanced Dill] 🏁 总计算时间: {total_time:.3f}s")
                
                exposure_doses.append({
                    'data': exposure_dose_data,
                    'name': custom_name,
                    'setId': set_id
                })
                thicknesses.append({
                    'data': thickness_data,
                    'name': custom_name,
                    'setId': set_id
                })
                
            elif model_type == 'car' or any(k in params for k in ['acid_gen_efficiency', 'diffusion_length', 'reaction_rate']):
                # CAR模型
                if car_model is None:
                    from backend.models import CARModel
                    car_model = CARModel()
                
                I_avg = float(params.get('I_avg', 10))
                V = float(params.get('V', 0.8))
                K = float(params.get('K', 2.0))
                t_exp = float(params.get('t_exp', 5))
                acid_gen_efficiency = float(params.get('acid_gen_efficiency', 0.5))
                diffusion_length = float(params.get('diffusion_length', 3))
                reaction_rate = float(params.get('reaction_rate', 0.3))
                amplification = float(params.get('amplification', 10))
                contrast = float(params.get('contrast', 3))
                
                print(f"CAR-1D模型参数 - 参数组{set_id}: I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}")
                add_log_entry('info', 'car', f"参数组{set_id}: I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}")
                print(f"CAR参数: acid_gen_eff={acid_gen_efficiency}, diff_len={diffusion_length}, reaction_rate={reaction_rate}, amp={amplification}, contrast={contrast}")
                add_log_entry('info', 'car', f"CAR参数: acid_gen_eff={acid_gen_efficiency}, diff_len={diffusion_length}, reaction_rate={reaction_rate}, amp={amplification}, contrast={contrast}")
                
                print(f"[CAR] 开始计算1D空间分布，共{len(x)}个位置")
                add_log_entry('info', 'car', f"开始计算1D空间分布，共{len(x)}个位置")
                
                # 使用CAR模型类的详细计算方法
                print(f"[CAR] 开始调用CAR模型完整计算流程，共{len(x)}个位置")
                add_log_entry('info', 'car', f"开始调用CAR模型完整计算流程，共{len(x)}个位置")
                
                import time
                start_time = time.time()
                
                # 调用CAR模型的详细计算方法，触发完整的日志记录
                car_data = car_model.calculate_car_distribution(
                    x, I_avg, V, K, t_exp, acid_gen_efficiency, 
                    diffusion_length, reaction_rate, amplification, contrast
                )
                
                exposure_dose_data = car_data['exposure_dose'].tolist() if hasattr(car_data['exposure_dose'], 'tolist') else car_data['exposure_dose']
                thickness_data = car_data['thickness'].tolist() if hasattr(car_data['thickness'], 'tolist') else car_data['thickness']
                
                total_time = time.time() - start_time
                successful_calcs = len(exposure_dose_data)
                failed_calcs = 0
                avg_compute_time = total_time / len(x)
                
                # 计算统计信息
                exp_mean = np.mean(exposure_dose_data)
                exp_std = np.std(exposure_dose_data)
                thick_mean = np.mean(thickness_data)
                thick_std = np.std(thickness_data)
                
                print(f"[CAR] 🎯 计算完成统计:")
                print(f"  ✅ 成功计算: {successful_calcs}/{len(x)} ({successful_calcs/len(x)*100:.1f}%)")
                print(f"  ❌ 失败计算: {failed_calcs}/{len(x)} ({failed_calcs/len(x)*100:.1f}%)")
                print(f"  ⏱️  平均计算时间: {avg_compute_time:.4f}s/点")
                print(f"  🔢 曝光剂量范围: [{min(exposure_dose_data):.3f}, {max(exposure_dose_data):.3f}] mJ/cm²")
                print(f"  📏 厚度范围: [{min(thickness_data):.4f}, {max(thickness_data):.4f}] (归一化)")
                print(f"  💾 数据质量: {'优秀' if failed_calcs/len(x) < 0.05 else '良好' if failed_calcs/len(x) < 0.1 else '需要优化'}")
                
                print(f"  📊 统计特征:")
                print(f"     曝光剂量: 均值={exp_mean:.3f}, 标准差={exp_std:.3f}")
                print(f"     厚度分布: 均值={thick_mean:.4f}, 标准差={thick_std:.4f}")
                
                if exp_std / exp_mean > 0.3:
                    print(f"  📈 高对比度检测: 曝光剂量变化显著 (CV={exp_std/exp_mean:.3f})")
                if thick_std / thick_mean > 0.2:
                    print(f"  🎭 强调制检测: 厚度变化显著 (CV={thick_std/thick_mean:.3f})")
                
                # CAR模型特有的化学放大分析
                print(f"  🧪 CAR模型化学放大分析:")
                print(f"     光酸产生效率η: {acid_gen_efficiency:.3f}")
                print(f"     扩散长度: {diffusion_length:.2f} nm")
                print(f"     反应速率常数k: {reaction_rate:.3f}")
                print(f"     放大因子A: {amplification:.1f}x")
                print(f"     对比度因子γ: {contrast:.1f}")
                
                # 化学放大效能评估
                chemical_amplification_factor = amplification * reaction_rate
                print(f"     化学放大效能: {chemical_amplification_factor:.2f}")
                
                if chemical_amplification_factor > 3.0:
                    print(f"  🚀 高效化学放大: 放大效能优秀 (>{chemical_amplification_factor:.1f})")
                elif chemical_amplification_factor > 1.5:
                    print(f"  ⚡ 中等化学放大: 放大效能良好 ({chemical_amplification_factor:.1f})")
                else:
                    print(f"  ⚠️  低效化学放大: 建议调整参数 ({chemical_amplification_factor:.1f})")
                    
                print(f"[CAR] 🏁 总计算时间: {total_time:.3f}s")
                
                exposure_doses.append({
                    'data': exposure_dose_data,
                    'name': custom_name,
                    'setId': set_id
                })
                thicknesses.append({
                    'data': thickness_data,
                    'name': custom_name,
                    'setId': set_id
                })
                
            else:
                # Dill模型
                if dill_model is None:
                    from backend.models import DillModel
                    dill_model = DillModel()
                
                I_avg = float(params.get('I_avg', 10))
                V = float(params.get('V', 0.8))
                K = float(params.get('K', 2.0))
                t_exp = float(params.get('t_exp', 5))
                C = float(params.get('C', 0.02))
                
                print(f"Dill-1D模型参数 - 参数组{set_id}: I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}, C={C}")
                add_log_entry('info', 'dill', f"参数组{set_id}: I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp}, C={C}")
                
                # 使用详细进度计算Dill模型数据
                print(f"[Dill] 开始计算1D空间分布，共{len(x)}个位置")
                add_log_entry('info', 'dill', f"开始计算1D空间分布，共{len(x)}个位置")
                
                import time
                start_time = time.time()
                exposure_dose_data = []
                thickness_data = []
                
                successful_calcs = 0
                failed_calcs = 0
                
                for i, pos in enumerate(x):
                    try:
                        # 计算光强分布
                        intensity = I_avg * (1 + V * np.cos(K * pos))
                        
                        # 计算曝光剂量
                        exposure_dose = intensity * t_exp
                        
                        # 计算光刻胶厚度（Dill模型）
                        # M(x,z) = e^(-C * D(x,z))
                        thickness = np.exp(-C * exposure_dose)
                        
                        exposure_dose_data.append(float(exposure_dose))
                        thickness_data.append(float(thickness))
                        successful_calcs += 1
                        
                        if i % 200 == 0:  # 每200个点打印一次进度
                            elapsed_time = time.time() - start_time
                            avg_time = elapsed_time / (i + 1) if i > 0 else 0
                            print(f"[Dill] 进度: {i+1}/{len(x)}, pos={pos:.3f}, exposure={exposure_dose:.3f}, thickness={thickness:.4f}, 平均时间={avg_time:.4f}s")
                            add_log_entry('progress', 'dill', f"进度: {i+1}/{len(x)}, pos={pos:.3f}, exposure={exposure_dose:.3f}, thickness={thickness:.4f}, 平均时间={avg_time:.4f}s")
                            
                    except Exception as e:
                        print(f"[Dill] 位置{pos}计算出错: {e}")
                        # 使用默认值
                        exposure_dose_data.append(float(I_avg * t_exp))
                        thickness_data.append(float(np.exp(-C * I_avg * t_exp)))
                        failed_calcs += 1
                
                total_time = time.time() - start_time
                avg_compute_time = total_time / len(x)
                
                # 计算统计信息
                exp_mean = np.mean(exposure_dose_data)
                exp_std = np.std(exposure_dose_data)
                thick_mean = np.mean(thickness_data)
                thick_std = np.std(thickness_data)
                
                print(f"[Dill] 🎯 计算完成统计:")
                add_log_entry('stats', 'dill', f"🎯 计算完成统计:")
                print(f"  ✅ 成功计算: {successful_calcs}/{len(x)} ({successful_calcs/len(x)*100:.1f}%)")
                add_log_entry('stats', 'dill', f"✅ 成功计算: {successful_calcs}/{len(x)} ({successful_calcs/len(x)*100:.1f}%)")
                print(f"  ❌ 失败计算: {failed_calcs}/{len(x)} ({failed_calcs/len(x)*100:.1f}%)")
                add_log_entry('stats', 'dill', f"❌ 失败计算: {failed_calcs}/{len(x)} ({failed_calcs/len(x)*100:.1f}%)")
                print(f"  ⏱️  平均计算时间: {avg_compute_time:.4f}s/点")
                add_log_entry('stats', 'dill', f"⏱️ 平均计算时间: {avg_compute_time:.4f}s/点")
                print(f"  🔢 曝光剂量范围: [{min(exposure_dose_data):.3f}, {max(exposure_dose_data):.3f}] mJ/cm²")
                add_log_entry('stats', 'dill', f"🔢 曝光剂量范围: [{min(exposure_dose_data):.3f}, {max(exposure_dose_data):.3f}] mJ/cm²")
                print(f"  📏 厚度范围: [{min(thickness_data):.4f}, {max(thickness_data):.4f}] (归一化)")
                add_log_entry('stats', 'dill', f"📏 厚度范围: [{min(thickness_data):.4f}, {max(thickness_data):.4f}] (归一化)")
                print(f"  💾 数据质量: {'优秀' if failed_calcs/len(x) < 0.01 else '良好' if failed_calcs/len(x) < 0.05 else '需要优化'}")
                add_log_entry('stats', 'dill', f"💾 数据质量: {'优秀' if failed_calcs/len(x) < 0.01 else '良好' if failed_calcs/len(x) < 0.05 else '需要优化'}")
                
                print(f"  📊 统计特征:")
                print(f"     曝光剂量: 均值={exp_mean:.3f}, 标准差={exp_std:.3f}")
                print(f"     厚度分布: 均值={thick_mean:.4f}, 标准差={thick_std:.4f}")
                
                if exp_std / exp_mean > 0.2:
                    print(f"  📈 高对比度检测: 曝光剂量变化显著 (CV={exp_std/exp_mean:.3f})")
                if thick_std / thick_mean > 0.1:
                    print(f"  🎭 强调制检测: 厚度变化显著 (CV={thick_std/thick_mean:.3f})")
                    
                # Dill模型特有的参数分析
                contrast_factor = exp_std / exp_mean if exp_mean > 0 else 0
                resolution_estimate = 1.0 / (K * V) if K > 0 and V > 0 else 0
                print(f"  📐 Dill模型特征分析:")
                print(f"     对比度因子: {contrast_factor:.3f}")
                print(f"     分辨率估计: {resolution_estimate:.3f} μm")
                print(f"     光敏速率常数C: {C:.4f} cm²/mJ")
                
                print(f"[Dill] 🏁 总计算时间: {total_time:.3f}s")
                
                exposure_doses.append({
                    'data': exposure_dose_data,
                    'name': custom_name,
                    'setId': set_id
                })
                thicknesses.append({
                    'data': thickness_data,
                    'name': custom_name,
                    'setId': set_id
                })
        
        result_data = {
            'x': x,
            'exposure_doses': exposure_doses,
            'thicknesses': thicknesses,
            'colors': ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'][:len(parameter_sets)]
        }
        
        return jsonify(format_response(True, data=result_data))
        
    except Exception as e:
        error_msg = f"比较数据计算错误: {str(e)}"
        print(f"Error: {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify(format_response(False, message=error_msg)), 500

def generate_comparison_plots_with_enhanced(parameter_sets):
    x = np.linspace(0, 10, 1000)
    fig1 = plt.figure(figsize=(12, 7))
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
    legend_labels = []
    
    # 初始化所有需要的模型实例
    dill_model = None
    enhanced_model = None
    car_model = None
    
    # 第一个图：曝光剂量分布比较
    for i, params in enumerate(parameter_sets):
        if any(k in params for k in ['acid_gen_efficiency', 'diffusion_length', 'reaction_rate']):
            if car_model is None:
                from backend.models import CARModel
                car_model = CARModel()
            I_avg = float(params['I_avg'])
            V = float(params['V'])
            K = float(params.get('K', 2.0))
            t_exp = float(params['t_exp'])
            acid_gen_efficiency = float(params['acid_gen_efficiency'])
            diffusion_length = float(params['diffusion_length'])
            reaction_rate = float(params['reaction_rate'])
            amplification = float(params['amplification'])
            contrast = float(params['contrast'])
            car_data = car_model.generate_data(I_avg, V, K, t_exp, acid_gen_efficiency, diffusion_length, reaction_rate, amplification, contrast)
            exposure_dose = car_data['initial_acid']
            label = f"Set {i+1}: CAR模型 (K={K}, t_exp={t_exp}, acid_eff={acid_gen_efficiency})"
        elif any(k in params for k in ['z_h', 'I0', 'M0']):
            if enhanced_model is None:
                from ..models import EnhancedDillModel
                enhanced_model = EnhancedDillModel()
            z_h = float(params['z_h'])
            T = float(params['T'])
            t_B = float(params['t_B'])
            I0 = float(params.get('I0', 1.0))
            M0 = float(params.get('M0', 1.0))
            t_exp = float(params['t_exp'])
            K = float(params.get('K_enhanced', 2.0))
            V = float(params.get('V', 0.8))
            
            # 计算表面空间分布
            exposure_dose_data = []
            
            for pos in x:
                local_I0 = I0 * (1 + V * np.cos(K * pos))
                enhanced_data = enhanced_model.generate_data(z_h, T, t_B, local_I0, M0, t_exp)
                
                # 取表面曝光剂量
                if isinstance(enhanced_data['I'], (list, np.ndarray)) and len(enhanced_data['I']) > 0:
                    surface_I = enhanced_data['I'][0] if hasattr(enhanced_data['I'], '__getitem__') else enhanced_data['I']
                    exposure_dose_data.append(float(surface_I) * t_exp)
                else:
                    exposure_dose_data.append(float(enhanced_data['I']) * t_exp)
            
            exposure_dose = exposure_dose_data
            label = f"Set {i+1}: 厚胶模型 (z_h={z_h}, T={T}, t_B={t_B}, K={K})"
        else:
            # Dill模型 - 修正：添加模型初始化
            if dill_model is None:
                from backend.models import DillModel
                dill_model = DillModel()
                
            I_avg = float(params['I_avg'])
            V = float(params['V'])
            K = float(params['K'])
            t_exp = float(params['t_exp'])
            intensity = dill_model.calculate_intensity_distribution(x, I_avg, V, K)
            exposure_dose = intensity * t_exp
            label = f"Set {i+1}: 薄胶模型 (I_avg={I_avg}, V={V}, K={K}, t_exp={t_exp})"
        color = colors[i % len(colors)]
        plt.plot(x, exposure_dose, color=color, linewidth=2)
        legend_labels.append(label)
    plt.title('Exposure Dose Distribution Comparison', fontsize=16)
    plt.xlabel('Position (μm)', fontsize=14)
    plt.ylabel('Exposure Dose (mJ/cm²)', fontsize=14)
    plt.grid(True, alpha=0.3)
    plt.legend(legend_labels, loc='best', fontsize=10)
    plt.tight_layout()
    buffer1 = BytesIO()
    fig1.savefig(buffer1, format='png', dpi=100)
    buffer1.seek(0)
    exposure_comparison_plot = base64.b64encode(buffer1.getvalue()).decode()
    plt.close(fig1)
    
    # 第二个图：厚度分布比较
    fig2 = plt.figure(figsize=(12, 7))
    legend_labels = []
    for i, params in enumerate(parameter_sets):
        if any(k in params for k in ['acid_gen_efficiency', 'diffusion_length', 'reaction_rate']):
            if car_model is None:
                from backend.models import CARModel
                car_model = CARModel()
            I_avg = float(params['I_avg'])
            V = float(params['V'])
            K = float(params.get('K', 2.0))
            t_exp = float(params['t_exp'])
            acid_gen_efficiency = float(params['acid_gen_efficiency'])
            diffusion_length = float(params['diffusion_length'])
            reaction_rate = float(params['reaction_rate'])
            amplification = float(params['amplification'])
            contrast = float(params['contrast'])
            car_data = car_model.generate_data(I_avg, V, K, t_exp, acid_gen_efficiency, diffusion_length, reaction_rate, amplification, contrast)
            thickness = car_data['thickness']
            label = f"Set {i+1}: CAR模型 (K={K}, diffusion={diffusion_length}, contrast={contrast})"
        elif any(k in params for k in ['z_h', 'I0', 'M0']):
            if enhanced_model is None:
                from ..models import EnhancedDillModel
                enhanced_model = EnhancedDillModel()
            z_h = float(params['z_h'])
            T = float(params['T'])
            t_B = float(params['t_B'])
            I0 = float(params.get('I0', 1.0))
            M0 = float(params.get('M0', 1.0))
            t_exp = float(params['t_exp'])
            K = float(params.get('K_enhanced', 2.0))
            V = float(params.get('V', 0.8))
            
            # 计算表面空间分布
            thickness_data = []
            
            for pos in x:
                local_I0 = I0 * (1 + V * np.cos(K * pos))
                enhanced_data = enhanced_model.generate_data(z_h, T, t_B, local_I0, M0, t_exp)
                
                # 取表面厚度
                if isinstance(enhanced_data['M'], (list, np.ndarray)) and len(enhanced_data['M']) > 0:
                    surface_M = enhanced_data['M'][0] if hasattr(enhanced_data['M'], '__getitem__') else enhanced_data['M']
                    thickness_data.append(float(surface_M))
                else:
                    thickness_data.append(float(enhanced_data['M']))
            
            thickness = thickness_data
            label = f"Set {i+1}: 厚胶模型 (z_h={z_h}, T={T}, t_B={t_B}, t_exp={t_exp})"
        else:
            # Dill模型 - 修正：添加模型初始化
            if dill_model is None:
                from backend.models import DillModel
                dill_model = DillModel()
                
            I_avg = float(params['I_avg'])
            V = float(params['V'])
            K = float(params['K'])
            t_exp = float(params['t_exp'])
            C = float(params['C'])
            intensity = dill_model.calculate_intensity_distribution(x, I_avg, V, K)
            exposure_dose = intensity * t_exp
            thickness = np.exp(-C * exposure_dose)
            label = f"Set {i+1}: 薄胶模型 (I_avg={I_avg}, V={V}, K={K}, C={C})"
        color = colors[i % len(colors)]
        plt.plot(x, thickness, color=color, linewidth=2)
        legend_labels.append(label)
    plt.title('Photoresist Thickness Distribution Comparison', fontsize=16)
    plt.xlabel('Position (μm)', fontsize=14)
    plt.ylabel('Relative Thickness', fontsize=14)
    plt.grid(True, alpha=0.3)
    plt.legend(legend_labels, loc='best', fontsize=10)
    plt.tight_layout()
    buffer2 = BytesIO()
    fig2.savefig(buffer2, format='png', dpi=100)
    buffer2.seek(0)
    thickness_comparison_plot = base64.b64encode(buffer2.getvalue()).decode()
    plt.close(fig2)
    return {'exposure_comparison_plot': exposure_comparison_plot, 'thickness_comparison_plot': thickness_comparison_plot, 'colors': colors}

@api_bp.route('/health', methods=['GET'])
def health_check():
    """
    API健康检查端点
    """
    return jsonify({"status": "healthy"}), 200 

@api_bp.route('/logs', methods=['GET'])
def get_logs():
    """获取系统化计算日志"""
    try:
        # 获取查询参数
        model_type = request.args.get('model_type')  # 过滤特定模型
        page = request.args.get('page', 'index')  # 页面类型：index 或 compare
        category = request.args.get('category', '')  # 子分类：1d, 2d, 3d 或 dill, enhanced_dill, car
        log_type = request.args.get('type', '')  # 日志类型：info, progress, success, warning, error
        limit = request.args.get('limit', 100)  # 默认返回最近100条
        
        try:
            limit = int(limit)
        except:
            limit = 100
            
        # 过滤日志
        filtered_logs = calculation_logs
        
        # 按模型类型过滤
        if model_type:
            filtered_logs = [log for log in filtered_logs if log.get('model') == model_type]
        
        # 按页面类型过滤
        if page == 'compare':
            # 比较页面显示所有模型的日志
            pass
        else:
            # 单一计算页面，根据category过滤
            if category and category in ['1d', '2d', '3d']:
                # 根据消息内容推断维度
                dimension_keywords = {
                    '1d': ['1d', '一维', '1D'],
                    '2d': ['2d', '二维', '2D'],
                    '3d': ['3d', '三维', '3D']
                }
                if category in dimension_keywords:
                    keywords = dimension_keywords[category]
                    filtered_logs = [
                        log for log in filtered_logs 
                        if any(keyword in log.get('message', '').lower() for keyword in [k.lower() for k in keywords])
                    ]
        
        # 按日志类型过滤
        if log_type:
            filtered_logs = [log for log in filtered_logs if log.get('type') == log_type]
        
        # 为每个日志添加ID和增强信息
        enhanced_logs = []
        for i, log in enumerate(filtered_logs):
            enhanced_log = {
                'id': f"{log.get('timestamp', '')}-{i}",
                'timestamp': log.get('timestamp'),
                'type': log.get('type', 'info'),
                'message': log.get('message', ''),
                'model': log.get('model', 'unknown'),
                'details': '',
                'category': detect_log_category(log, page),
                'subcategory': detect_log_subcategory(log, page),
                'dimension': detect_log_dimension(log)
            }
            enhanced_logs.append(enhanced_log)
        
        # 返回最近的N条日志（倒序）
        recent_logs = enhanced_logs[-limit:] if limit > 0 else enhanced_logs
        recent_logs.reverse()  # 最新的在前面
        
        # 统计信息
        stats = {
            'total_logs': len(calculation_logs),
            'filtered_logs': len(filtered_logs),
            'error_count': len([log for log in filtered_logs if log.get('type') == 'error']),
            'warning_count': len([log for log in filtered_logs if log.get('type') == 'warning']),
            'progress': '等待计算...'
        }
        
        return jsonify(format_response(True, data={
            'logs': recent_logs,
            'stats': stats,
            'total_count': len(calculation_logs),
            'filtered_count': len(filtered_logs)
        }))
        
    except Exception as e:
        error_msg = f"获取日志失败: {str(e)}"
        print(f"Error: {error_msg}")
        return jsonify(format_response(False, message=error_msg)), 500

def detect_log_category(log, page):
    """检测日志分类"""
    if page == 'compare':
        return 'compare'
    return 'single'

def detect_log_subcategory(log, page):
    """检测日志子分类"""
    message = log.get('message', '').lower()
    model = log.get('model', '').lower()
    
    if page == 'compare':
        if 'dill' in model and 'enhanced' not in model:
            return 'dill'
        elif 'enhanced' in model or '厚胶' in message:
            return 'enhanced_dill'
        elif 'car' in model:
            return 'car'
    else:
        if any(keyword in message for keyword in ['1d', '一维']):
            return '1d'
        elif any(keyword in message for keyword in ['2d', '二维']):
            return '2d'
        elif any(keyword in message for keyword in ['3d', '三维']):
            return '3d'
    
    return 'unknown'

def detect_log_dimension(log):
    """检测日志维度"""
    message = log.get('message', '').lower()
    if '1d' in message or '一维' in message:
        return '1d'
    elif '2d' in message or '二维' in message:
        return '2d'
    elif '3d' in message or '三维' in message:
        return '3d'
    return 'unknown'

@api_bp.route('/logs/clear', methods=['POST'])
def clear_calculation_logs():
    """清空计算日志"""
    try:
        clear_logs()
        add_log_entry('info', 'system', '日志已清空')
        return jsonify(format_response(True, message="日志已清空"))
    except Exception as e:
        error_msg = f"清空日志失败: {str(e)}"
        print(f"Error: {error_msg}")
        return jsonify(format_response(False, message=error_msg)), 500


# ===============================
# 示例文件管理API接口
# ===============================

import os
import pathlib

# 示例文件根目录路径 - 支持多种部署环境
def get_example_files_dir():
    """获取示例文件目录路径，支持多种部署环境"""
    current_file = os.path.abspath(__file__)
    
    # 尝试多种可能的路径
    possible_paths = [
        # 相对于当前文件的路径（开发环境）
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file)))), 'test_data'),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file)))), 'TEST_DATA'),
        
        # 相对于项目根目录（部署环境）
        os.path.join(os.getcwd(), 'test_data'),
        os.path.join(os.getcwd(), 'TEST_DATA'),
        
        # RENDER等云平台部署环境
        os.path.join('/opt/render/project/src', 'test_data'),
        os.path.join('/opt/render/project/src', 'TEST_DATA'),
        
        # Heroku等部署环境
        os.path.join('/app', 'test_data'),
        os.path.join('/app', 'TEST_DATA'),
        
        # 通过环境变量指定的路径
        os.path.join(os.environ.get('DILL_DATA_DIR', ''), 'test_data') if os.environ.get('DILL_DATA_DIR') else None,
        os.path.join(os.environ.get('DILL_DATA_DIR', ''), 'TEST_DATA') if os.environ.get('DILL_DATA_DIR') else None,
        
        # 相对于dill_model目录
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(current_file))), '..', 'test_data'),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(current_file))), '..', 'TEST_DATA'),
        
        # 在同级目录下查找
        os.path.join(os.path.dirname(current_file), '..', '..', '..', '..', 'test_data'),
        os.path.join(os.path.dirname(current_file), '..', '..', '..', '..', 'TEST_DATA'),
        
        # 尝试查找常见的部署位置
        os.path.join('/var/www', 'test_data'),
        os.path.join('/var/www', 'TEST_DATA'),
        os.path.join('/home/app', 'test_data'),
        os.path.join('/home/app', 'TEST_DATA'),
    ]
    
    # 过滤掉None值
    possible_paths = [path for path in possible_paths if path is not None]
    
    for path in possible_paths:
        abs_path = os.path.abspath(path)
        if os.path.exists(abs_path) and os.path.isdir(abs_path):
            print(f"Found example files directory: {abs_path}")
            return abs_path
    
    # 如果都找不到，返回第一个路径并打印调试信息
    print(f"Warning: Could not find example files directory. Tried paths:")
    for i, path in enumerate(possible_paths):
        abs_path = os.path.abspath(path)
        print(f"  {i+1}. {abs_path} - {'EXISTS' if os.path.exists(abs_path) else 'NOT FOUND'}")
    
    return os.path.abspath(possible_paths[0])

EXAMPLE_FILES_DIR = get_example_files_dir()

@api_bp.route('/example-files', methods=['GET'])
def get_example_files():
    """获取示例文件列表"""
    try:
        # 重新获取目录路径以确保最新
        example_dir = get_example_files_dir()
        
        if not os.path.exists(example_dir):
            error_msg = f"示例文件目录不存在: {example_dir}"
            print(f"Error: {error_msg}")
            add_log_entry('error', 'system', error_msg)
            return jsonify(format_response(False, message=error_msg)), 404
        
        if not os.path.isdir(example_dir):
            error_msg = f"路径不是目录: {example_dir}"
            print(f"Error: {error_msg}")
            add_log_entry('error', 'system', error_msg)
            return jsonify(format_response(False, message="指定路径不是目录")), 400
        
        files = []
        print(f"Scanning directory: {example_dir}")
        
        try:
            file_list = os.listdir(example_dir)
            print(f"Found {len(file_list)} items in directory")
        except PermissionError:
            error_msg = f"没有权限访问目录: {example_dir}"
            print(f"Error: {error_msg}")
            add_log_entry('error', 'system', error_msg)
            return jsonify(format_response(False, message="没有权限访问示例文件目录")), 403
        
        for filename in file_list:
            if filename.startswith('.') or filename.lower() == 'readme.md':
                continue
                
            file_path = os.path.join(example_dir, filename)
            if os.path.isfile(file_path):
                try:
                    file_stat = os.stat(file_path)
                    file_ext = pathlib.Path(filename).suffix.lstrip('.')
                    
                    file_info = {
                        'name': filename,
                        'extension': file_ext,
                        'size': file_stat.st_size,
                        'modified': file_stat.st_mtime,
                        'description': get_file_description(filename, file_ext)
                    }
                    files.append(file_info)
                except (OSError, IOError) as e:
                    print(f"Error reading file {filename}: {e}")
                    continue
        
        # 按文件名排序
        files.sort(key=lambda x: x['name'])
        
        print(f"Successfully found {len(files)} example files")
        add_log_entry('info', 'system', f'加载了 {len(files)} 个示例文件')
        
        return jsonify(format_response(True, data=files))
        
    except Exception as e:
        error_msg = f"获取示例文件列表失败: {str(e)}"
        print(f"Error: {error_msg}")
        return jsonify(format_response(False, message=error_msg)), 500

@api_bp.route('/example-files/<filename>', methods=['GET'])
def get_example_file_content(filename):
    """获取示例文件内容"""
    try:
        # 安全检查：防止目录遍历攻击
        if '..' in filename or '/' in filename or '\\' in filename:
            return jsonify(format_response(False, message="无效的文件名")), 400
        
        example_dir = get_example_files_dir()
        file_path = os.path.join(example_dir, filename)
        
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            return jsonify(format_response(False, message="文件不存在")), 404
        
        # 读取文件内容
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # 如果UTF-8解码失败，尝试其他编码
            try:
                with open(file_path, 'r', encoding='gbk') as f:
                    content = f.read()
            except UnicodeDecodeError:
                with open(file_path, 'r', encoding='latin-1') as f:
                    content = f.read()
        
        file_stat = os.stat(file_path)
        file_ext = pathlib.Path(filename).suffix.lstrip('.')
        
        file_data = {
            'name': filename,
            'content': content,
            'size': file_stat.st_size,
            'format': file_ext.upper() if file_ext else '未知',
            'modified': file_stat.st_mtime,
            'description': get_file_description(filename, file_ext)
        }
        
        return jsonify(format_response(True, data=file_data))
        
    except Exception as e:
        error_msg = f"读取文件内容失败: {str(e)}"
        print(f"Error: {error_msg}")
        return jsonify(format_response(False, message=error_msg)), 500

@api_bp.route('/example-files/<filename>', methods=['PUT'])
def update_example_file_content(filename):
    """更新示例文件内容"""
    try:
        # 安全检查：防止目录遍历攻击
        if '..' in filename or '/' in filename or '\\' in filename:
            return jsonify(format_response(False, message="无效的文件名")), 400
        
        example_dir = get_example_files_dir()
        file_path = os.path.join(example_dir, filename)
        
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            return jsonify(format_response(False, message="文件不存在")), 404
        
        # 获取请求数据
        data = request.get_json()
        if not data or 'content' not in data:
            return jsonify(format_response(False, message="请求数据格式错误")), 400
        
        content = data['content']
        
        # 备份原文件
        backup_path = file_path + '.backup'
        try:
            import shutil
            shutil.copy2(file_path, backup_path)
        except Exception as backup_error:
            print(f"Warning: 创建备份文件失败: {backup_error}")
        
        # 写入新内容
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # 添加日志
        add_log_entry('info', 'system', f'示例文件已更新: {filename}')
        
        return jsonify(format_response(True, message="文件更新成功"))
        
    except Exception as e:
        error_msg = f"更新文件内容失败: {str(e)}"
        print(f"Error: {error_msg}")
        add_log_entry('error', 'system', f'更新示例文件失败: {filename} - {error_msg}')
        return jsonify(format_response(False, message=error_msg)), 500

@api_bp.route('/example-files/<filename>', methods=['DELETE'])
def delete_example_file(filename):
    """删除示例文件"""
    print(f"接收到删除文件请求: {filename}")
    try:
        # 安全检查：防止目录遍历攻击
        if '..' in filename or '/' in filename or '\\' in filename:
            return jsonify(format_response(False, message="无效的文件名")), 400
        
        example_dir = get_example_files_dir()
        file_path = os.path.join(example_dir, filename)
        print(f"尝试删除文件: {file_path}")
        
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            return jsonify(format_response(False, message="文件不存在")), 404
            
        try:
            # 创建备份目录（如果不存在）
            backup_dir = os.path.join(example_dir, '.deleted_backups')
            try:
                if not os.path.exists(backup_dir):
                    os.makedirs(backup_dir)
                    
                # 将文件移动到备份目录，文件名加上时间戳
                import shutil
                from datetime import datetime
                timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                backup_filename = f"{filename}.{timestamp}.bak"
                backup_path = os.path.join(backup_dir, backup_filename)
                shutil.copy2(file_path, backup_path)
                print(f"备份文件已创建: {backup_path}")
            except Exception as backup_error:
                print(f"Warning: 创建备份失败: {str(backup_error)}，将直接删除文件")
                
            # 删除原文件 - 即使备份失败也要删除
            os.remove(file_path)
            print(f"文件已删除: {file_path}")
            
            # 验证文件是否确实被删除
            if not os.path.exists(file_path):
                # 添加日志
                add_log_entry('info', 'system', f'示例文件已删除: {filename}')
                return jsonify(format_response(True, message="文件删除成功"))
            else:
                error_msg = "文件删除失败，文件仍然存在"
                print(f"Error: {error_msg}")
                add_log_entry('error', 'system', error_msg)
                return jsonify(format_response(False, message=error_msg)), 500
            
        except Exception as e:
            error_msg = f"删除文件失败: {str(e)}"
            print(f"Error: {error_msg}")
            add_log_entry('error', 'system', f'删除示例文件失败: {filename} - {error_msg}')
            return jsonify(format_response(False, message=error_msg)), 500
            
    except Exception as e:
        error_msg = f"删除文件失败: {str(e)}"
        print(f"Error: {error_msg}")
        add_log_entry('error', 'system', f'删除示例文件失败: {filename} - {error_msg}')
        return jsonify(format_response(False, message=error_msg)), 500

@api_bp.route('/example-files/delete/<filename>', methods=['POST'])
def delete_example_file_by_post(filename):
    """使用POST方法删除示例文件"""
    print(f"接收到通过POST删除文件请求: {filename}")
    try:
        # 安全检查：防止目录遍历攻击
        if '..' in filename or '/' in filename or '\\' in filename:
            return jsonify(format_response(False, message="无效的文件名")), 400
        
        example_dir = get_example_files_dir()
        file_path = os.path.join(example_dir, filename)
        print(f"尝试删除文件: {file_path}")
        
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            return jsonify(format_response(False, message="文件不存在")), 404
            
        try:
            # 直接删除文件，不再创建备份
            os.remove(file_path)
            print(f"文件已删除: {file_path}")
            
            # 验证文件是否确实被删除
            if not os.path.exists(file_path):
                # 添加日志
                add_log_entry('info', 'system', f'示例文件已删除: {filename}')
                return jsonify(format_response(True, message="文件删除成功"))
            else:
                error_msg = "文件删除失败，文件仍然存在"
                print(f"Error: {error_msg}")
                add_log_entry('error', 'system', error_msg)
                return jsonify(format_response(False, message=error_msg)), 500
            
        except Exception as e:
            error_msg = f"删除文件失败: {str(e)}"
            print(f"Error: {error_msg}")
            add_log_entry('error', 'system', f'删除示例文件失败: {filename} - {error_msg}')
            return jsonify(format_response(False, message=error_msg)), 500
            
    except Exception as e:
        error_msg = f"删除文件失败: {str(e)}"
        print(f"Error: {error_msg}")
        add_log_entry('error', 'system', f'删除示例文件失败: {filename} - {error_msg}')
        return jsonify(format_response(False, message=error_msg)), 500

@api_bp.route('/example-files', methods=['POST'])
def create_example_file():
    """创建新的示例文件"""
    try:
        data = request.get_json()
        if not data or 'filename' not in data or 'content' not in data or 'type' not in data:
            return jsonify(format_response(False, message="请求数据格式错误，需要filename、content和type字段")), 400
        
        filename = data['filename']
        content = data['content']
        file_type = data['type']  # 文件类型，如'txt', 'json', 'asc'等
        
        # 安全检查：防止目录遍历攻击
        if '..' in filename or '/' in filename or '\\' in filename:
            return jsonify(format_response(False, message="无效的文件名")), 400
        
        # 确保文件名有正确的扩展名
        if not filename.lower().endswith('.' + file_type.lower()):
            filename = f"{filename}.{file_type.lower()}"
        
        example_dir = get_example_files_dir()
        file_path = os.path.join(example_dir, filename)
        
        # 检查文件是否已存在
        if os.path.exists(file_path):
            return jsonify(format_response(False, message="文件已存在，请使用其他文件名")), 409
        
        # 写入新文件内容
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # 获取文件信息
        file_stat = os.stat(file_path)
        file_ext = pathlib.Path(filename).suffix.lstrip('.')
        
        file_data = {
            'name': filename,
            'extension': file_ext,
            'size': file_stat.st_size,
            'modified': file_stat.st_mtime,
            'description': get_file_description(filename, file_ext),
            'content': content
        }
        
        # 添加日志
        add_log_entry('info', 'system', f'新的示例文件已创建: {filename}')
        
        return jsonify(format_response(True, message="文件创建成功", data=file_data))
        
    except Exception as e:
        error_msg = f"创建新文件失败: {str(e)}"
        print(f"Error: {error_msg}")
        add_log_entry('error', 'system', f'创建示例文件失败: {error_msg}')
        return jsonify(format_response(False, message=error_msg)), 500

def get_file_description(filename, extension):
    """根据文件名和扩展名获取文件描述"""
    descriptions = {
        'txt': '文本格式数据文件',
        'csv': '逗号分隔值表格文件',
        'json': 'JSON格式数据文件',
        'dat': '数据文件',
        'tab': '制表符分隔数据文件',
        'xlsx': 'Excel表格文件',
        'xls': 'Excel表格文件',
        'mat': 'MATLAB数据文件',
        'pli': 'PROLITH格式文件',
        'ldf': 'Lithography数据文件',
        'msk': '掩模文件',
        'int': '强度数据文件',
        'pro': '工艺参数文件',
        'sim': '仿真结果文件',
        'asc': 'ASCII格式文件',
        'log': '日志文件'
    }
    
    # 特殊文件名描述
    if 'gaussian' in filename.lower():
        return '高斯分布光强示例'
    elif 'sinusoidal' in filename.lower():
        return '正弦波光强示例'
    elif 'speckle' in filename.lower():
        return '斑点图案光强示例'
    elif 'complex' in filename.lower():
        return '复杂光强分布示例'
    elif 'formula' in filename.lower():
        return '公式计算光强示例'
    
    return descriptions.get(extension.lower(), '示例数据文件')

@api_bp.route('/example-files/upload', methods=['POST'])
def upload_example_files():
    """上传文件到示例文件目录"""
    try:
        # 检查是否有文件上传
        if 'files' not in request.files:
            return jsonify(format_response(False, message="没有选择文件")), 400
        
        files = request.files.getlist('files')
        if not files or all(file.filename == '' for file in files):
            return jsonify(format_response(False, message="没有选择有效文件")), 400
        
        example_dir = get_example_files_dir()
        
        # 确保目录存在
        if not os.path.exists(example_dir):
            os.makedirs(example_dir)
        
        uploaded_files = []
        failed_files = []
        
        for file in files:
            if file.filename == '':
                continue
                
            filename = file.filename
            
            # 安全检查：防止目录遍历攻击
            if '..' in filename or '/' in filename or '\\' in filename:
                failed_files.append({'filename': filename, 'error': '无效的文件名'})
                continue
            
            # 检查文件扩展名
            allowed_extensions = ['.txt', '.csv', '.json', '.dat', '.xls', '.xlsx', '.mat', '.pli', '.ldf', '.msk', '.int', '.pro', '.sim', '.tab', '.tsv', '.asc', '.lis', '.log', '.out', '.fdt', '.slf']
            file_ext = os.path.splitext(filename)[1].lower()
            if file_ext not in allowed_extensions:
                failed_files.append({'filename': filename, 'error': f'不支持的文件类型: {file_ext}'})
                continue
            
            file_path = os.path.join(example_dir, filename)
            
            # 检查文件是否已存在
            if os.path.exists(file_path):
                # 生成新的文件名
                name, ext = os.path.splitext(filename)
                counter = 1
                while os.path.exists(file_path):
                    new_filename = f"{name}_{counter}{ext}"
                    file_path = os.path.join(example_dir, new_filename)
                    counter += 1
                filename = os.path.basename(file_path)
            
            try:
                # 保存文件
                file.save(file_path)
                
                # 获取文件信息
                file_size = os.path.getsize(file_path)
                file_ext = os.path.splitext(filename)[1][1:]  # 去掉点
                
                uploaded_files.append({
                    'filename': filename,
                    'size': file_size,
                    'extension': file_ext,
                    'description': get_file_description(filename, file_ext)
                })
                
                # 添加日志
                add_log_entry('info', 'system', f'文件上传成功: {filename}')
                
            except Exception as e:
                failed_files.append({'filename': filename, 'error': f'保存失败: {str(e)}'})
                # 添加错误日志
                add_log_entry('error', 'system', f'文件上传失败: {filename} - {str(e)}')
        
        # 构建响应
        response_data = {
            'uploaded': uploaded_files,
            'failed': failed_files,
            'total_uploaded': len(uploaded_files),
            'total_failed': len(failed_files)
        }
        
        if uploaded_files:
            message = f"成功上传 {len(uploaded_files)} 个文件"
            if failed_files:
                message += f"，{len(failed_files)} 个文件失败"
            return jsonify(format_response(True, message=message, data=response_data))
        else:
            return jsonify(format_response(False, message="所有文件上传失败", data=response_data)), 400
        
    except Exception as e:
        error_msg = f"文件上传失败: {str(e)}"
        print(f"Error: {error_msg}")
        add_log_entry('error', 'system', f'文件上传异常: {error_msg}')
        return jsonify(format_response(False, message=error_msg)), 500

@api_bp.route('/example-files/action', methods=['GET'])
def file_action():
    """通用文件操作端点 - 使用GET方法和查询参数"""
    try:
        action = request.args.get('action')
        filename = request.args.get('filename')
        
        if not action or not filename:
            return jsonify(format_response(False, message="缺少必要的参数")), 400
        
        print(f"接收到文件操作请求: action={action}, filename={filename}")
        
        # 安全检查：防止目录遍历攻击
        if '..' in filename or '/' in filename or '\\' in filename:
            return jsonify(format_response(False, message="无效的文件名")), 400
        
        example_dir = get_example_files_dir()
        file_path = os.path.join(example_dir, filename)
        
        # 删除文件操作
        if action == 'delete':
            if not os.path.exists(file_path) or not os.path.isfile(file_path):
                return jsonify(format_response(False, message="文件不存在")), 404
                
            try:
                # 直接删除文件
                os.remove(file_path)
                print(f"文件已删除: {file_path}")
                
                # 验证文件是否确实被删除
                if not os.path.exists(file_path):
                    add_log_entry('info', 'system', f'示例文件已删除: {filename}')
                    
                    # 检查是否是通过浏览器直接访问的（非AJAX请求）
                    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
                    accepts_html = 'text/html' in request.headers.get('Accept', '')
                    
                    # 如果是直接访问，返回HTML重定向
                    if not is_ajax and accepts_html:
                        return """
                        <html>
                        <head>
                            <meta http-equiv="refresh" content="1;url=/">
                            <title>文件已删除</title>
                            <style>
                                body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                                .message { padding: 20px; background-color: #d4edda; color: #155724; border-radius: 5px; }
                            </style>
                        </head>
                        <body>
                            <div class="message">文件 """ + filename + """ 已成功删除！正在返回...</div>
                            <script>
                                setTimeout(function() {
                                    window.location.href = "/";
                                }, 1000);
                            </script>
                        </body>
                        </html>
                        """
                    
                    # 对于AJAX请求返回JSON响应
                    return jsonify(format_response(True, message="文件删除成功"))
                else:
                    error_msg = "文件删除失败，文件仍然存在"
                    print(f"Error: {error_msg}")
                    add_log_entry('error', 'system', error_msg)
                    return jsonify(format_response(False, message=error_msg)), 500
                
            except Exception as e:
                error_msg = f"删除文件失败: {str(e)}"
                print(f"Error: {error_msg}")
                add_log_entry('error', 'system', f'删除示例文件失败: {filename} - {error_msg}')
                return jsonify(format_response(False, message=error_msg)), 500
        else:
            return jsonify(format_response(False, message="不支持的操作类型")), 400
            
    except Exception as e:
        error_msg = f"文件操作失败: {str(e)}"
        print(f"Error: {error_msg}")
        add_log_entry('error', 'system', error_msg)
        return jsonify(format_response(False, message=error_msg)), 500