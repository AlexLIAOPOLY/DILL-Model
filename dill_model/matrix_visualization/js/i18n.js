/**
 * 光刻胶模型矩阵可视化 - 国际化支持
 */

const i18n = {
    'zh-CN': {
        // 页面标题和导航
        'page_title': '光刻胶模型矩阵可视化',
        'subtitle': '探索三种光刻胶模型在不同维度下的实现方式',
        'view_mode_toggle': '切换视图',
        'theme_toggle_light': '亮色主题',
        'theme_toggle_dark': '暗色主题',
        'language_toggle': '切换语言 (English)',
        'return_main': '返回主应用',
        'copyright_holder': '香港大学',

        // 维度标签
        'dim_1d': '1D 模型',
        'dim_2d': '2D 模型',
        'dim_3d': '3D 模型',

        // 模型标签
        'model_dill': 'Dill 模型',
        'model_enhanced_dill': '增强 Dill 模型',
        'model_car': 'CAR 模型',

        // 模型标题
        'dill_1d': 'Dill 模型 - 1D',
        'dill_2d': 'Dill 模型 - 2D',
        'dill_3d': 'Dill 模型 - 3D',
        'enhanced_dill_1d': '增强 Dill 模型 - 1D',
        'enhanced_dill_2d': '增强 Dill 模型 - 2D',
        'enhanced_dill_3d': '增强 Dill 模型 - 3D',
        'car_1d': 'CAR 模型 - 1D',
        'car_2d': 'CAR 模型 - 2D',
        'car_3d': 'CAR 模型 - 3D',

        // 公式标签
        'light_intensity': '光强分布:',
        'exposure_dose': '曝光剂量:',
        'thickness_dist': '厚度分布:',
        'light_attenuation': '光强衰减方程:',
        'photosensitizer_concentration': '感光剂浓度方程:',
        'parameter_fitting': '参数拟合:',
        'initial_light_intensity': '初始光强分布:',
        'depth_light_attenuation': '深度方向光强衰减:',
        'three_dim_initial_intensity': '三维初始光强分布:',
        'three_dim_light_propagation': '三维光强传播方程:',
        'three_dim_photosensitizer': '三维感光剂演化方程:',
        'acid_generation': '光酸生成:',
        'acid_diffusion': '光酸扩散:',
        'deprotection_reaction': '脱保护反应:',
        'development_thickness': '显影厚度:',
        'two_dim_acid_diffusion': '二维光酸扩散:',
        'three_dim_acid_diffusion': '三维光酸扩散:',

        // 模态框
        'modal_title': '详细信息',
        'prev_model': '上一个模型',
        'next_model': '下一个模型',
        'expand_details': '展开详情',
        'main_parameters': '主要参数',
        'reference': '参考文献:',
        'core_formulas': '核心公式',

        // 模型描述
        'dill_description': 'Dill模型是一种简化的光刻胶曝光模型，主要用于薄层光刻胶的曝光过程模拟。该模型基于光敏剂浓度随曝光剂量的指数衰减关系，计算光刻胶的厚度分布。',
        'enhanced_dill_description': '增强Dill模型特别适用于厚层光刻胶的曝光模拟，考虑了光在深度方向上的衰减和光敏剂浓度随深度的变化。该模型通过联立偏微分方程组描述光强和光敏剂浓度的演化过程。',
        'car_description': 'CAR（化学放大型光刻胶）模型模拟了深紫外光刻胶的曝光和后处理过程。该模型描述了光酸的生成、扩散、催化反应和显影等关键步骤，能够更好地表征高分辨率图形的形成机制。',

        // 维度描述
        '1d_description': '一维模型沿单一空间维度（通常是x轴）计算光强分布和光刻胶厚度，适用于简单的线条图形模拟。',
        '2d_description': '二维模型在平面(x-y)上计算光强分布和光刻胶厚度，能够模拟更复杂的平面图形，如点阵、网格等。',
        '3d_description': '三维模型同时考虑横向(x-y)和纵向(z)维度，可以全面模拟光刻胶中的三维结构，包括侧壁轮廓和深度分布。',

        // 参数描述
        'param_i_avg': '平均入射光强度 (mW/cm²)',
        'param_v': '干涉条纹的可见度，控制空间调制的深度，取值范围0-1',
        'param_k': '干涉条纹的空间频率，决定条纹的密度',
        'param_t_exp': '曝光时间，单位为秒',
        'param_c': '光敏速率常数，表示光刻胶对光的敏感程度',
        'param_zh': '光刻胶厚度，单位为μm',
        'param_t': '前烘温度，单位为°C',
        'param_tb': '前烘时间，单位为秒',
        'param_i0': '初始光强，单位为mW/cm²',
        'param_m0': '初始光敏剂浓度，归一化值',
        'param_acid_gen': '光酸产生效率，表示光子到光酸的转化率',
        'param_diff_len': '光酸扩散长度，控制扩散程度',
        'param_reaction_rate': '催化反应速率常数',
        'param_amplification': '放大因子，表示每个光酸分子可催化的反应数',
        'param_contrast': '对比度参数，控制显影过程的非线性程度',

        // 注释
        'note_diffusion': '其中G表示高斯扩散函数，l<sub>diff</sub>为扩散长度',
        'note_diffusion_2d': '其中G<sub>2</sub>表示二维高斯扩散函数',
        'note_diffusion_3d': '其中G<sub>3</sub>表示三维高斯扩散函数'
    },
    'en-US': {
        // Page titles and navigation
        'page_title': 'Photoresist Model Matrix Visualization',
        'subtitle': 'Explore three photoresist models in different dimensions',
        'view_mode_toggle': 'Toggle View',
        'theme_toggle_light': 'Light Theme',
        'theme_toggle_dark': 'Dark Theme',
        'language_toggle': 'Switch Language (中文)',
        'return_main': 'Return to Main App',
        'copyright_holder': 'The University of Hong Kong',

        // Dimension labels
        'dim_1d': '1D Model',
        'dim_2d': '2D Model',
        'dim_3d': '3D Model',

        // Model labels
        'model_dill': 'Dill Model',
        'model_enhanced_dill': 'Enhanced Dill Model',
        'model_car': 'CAR Model',

        // Model titles
        'dill_1d': 'Dill Model - 1D',
        'dill_2d': 'Dill Model - 2D',
        'dill_3d': 'Dill Model - 3D',
        'enhanced_dill_1d': 'Enhanced Dill Model - 1D',
        'enhanced_dill_2d': 'Enhanced Dill Model - 2D',
        'enhanced_dill_3d': 'Enhanced Dill Model - 3D',
        'car_1d': 'CAR Model - 1D',
        'car_2d': 'CAR Model - 2D',
        'car_3d': 'CAR Model - 3D',

        // Formula labels
        'light_intensity': 'Light Intensity:',
        'exposure_dose': 'Exposure Dose:',
        'thickness_dist': 'Thickness Distribution:',
        'light_attenuation': 'Light Attenuation Equation:',
        'photosensitizer_concentration': 'Photosensitizer Concentration Equation:',
        'parameter_fitting': 'Parameter Fitting:',
        'initial_light_intensity': 'Initial Light Intensity:',
        'depth_light_attenuation': 'Depth Light Attenuation:',
        'three_dim_initial_intensity': '3D Initial Light Intensity:',
        'three_dim_light_propagation': '3D Light Propagation Equation:',
        'three_dim_photosensitizer': '3D Photosensitizer Evolution Equation:',
        'acid_generation': 'Acid Generation:',
        'acid_diffusion': 'Acid Diffusion:',
        'deprotection_reaction': 'Deprotection Reaction:',
        'development_thickness': 'Development Thickness:',
        'two_dim_acid_diffusion': '2D Acid Diffusion:',
        'three_dim_acid_diffusion': '3D Acid Diffusion:',

        // Modal
        'modal_title': 'Detailed Information',
        'prev_model': 'Previous Model',
        'next_model': 'Next Model',
        'expand_details': 'Expand Details',
        'main_parameters': 'Main Parameters',
        'reference': 'Reference:',
        'core_formulas': 'Core Formulas',

        // Model descriptions
        'dill_description': 'The Dill model is a simplified photoresist exposure model mainly used for thin photoresist exposure process simulation. The model calculates the photoresist thickness distribution based on the exponential decay relationship of photosensitizer concentration with exposure dose.',
        'enhanced_dill_description': 'The Enhanced Dill model is particularly suitable for thick photoresist exposure simulation, considering light attenuation in the depth direction and photosensitizer concentration variation with depth. This model describes the evolution of light intensity and photosensitizer concentration through coupled partial differential equations.',
        'car_description': 'The CAR (Chemically Amplified Resist) model simulates the exposure and post-processing of deep ultraviolet photoresists. The model describes key steps such as acid generation, diffusion, catalytic reaction, and development, better characterizing the formation mechanism of high-resolution patterns.',

        // Dimension descriptions
        '1d_description': 'One-dimensional models calculate light intensity distribution and photoresist thickness along a single spatial dimension (usually the x-axis), suitable for simulating simple line patterns.',
        '2d_description': 'Two-dimensional models calculate light intensity distribution and photoresist thickness on a plane (x-y), capable of simulating more complex planar patterns such as dot arrays and grids.',
        '3d_description': 'Three-dimensional models consider both lateral (x-y) and longitudinal (z) dimensions, providing comprehensive simulation of three-dimensional structures in photoresists, including sidewall profiles and depth distributions.',

        // Parameter descriptions
        'param_i_avg': 'Average incident light intensity (mW/cm²)',
        'param_v': 'Visibility of interference fringes, controls depth of spatial modulation, range 0-1',
        'param_k': 'Spatial frequency of interference fringes, determines fringe density',
        'param_t_exp': 'Exposure time in seconds',
        'param_c': 'Photosensitivity rate constant, indicates photoresist sensitivity to light',
        'param_zh': 'Photoresist thickness in μm',
        'param_t': 'Pre-bake temperature in °C',
        'param_tb': 'Pre-bake time in seconds',
        'param_i0': 'Initial light intensity in mW/cm²',
        'param_m0': 'Initial photosensitizer concentration, normalized value',
        'param_acid_gen': 'Acid generation efficiency, represents photon to acid conversion rate',
        'param_diff_len': 'Acid diffusion length, controls diffusion extent',
        'param_reaction_rate': 'Catalytic reaction rate constant',
        'param_amplification': 'Amplification factor, indicates number of reactions catalyzed per acid molecule',
        'param_contrast': 'Contrast parameter, controls non-linearity of development process',

        // Notes
        'note_diffusion': 'where G represents the Gaussian diffusion function, l<sub>diff</sub> is the diffusion length',
        'note_diffusion_2d': 'where G<sub>2</sub> represents the two-dimensional Gaussian diffusion function',
        'note_diffusion_3d': 'where G<sub>3</sub> represents the three-dimensional Gaussian diffusion function'
    }
};

// 导出i18n对象
if (typeof module !== 'undefined' && module.exports) {
    module.exports = i18n;
} 