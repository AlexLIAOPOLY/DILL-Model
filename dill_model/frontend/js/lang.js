// 语言包
const LANGS = {
    'zh-CN': {
        title: '自定义光刻胶计算平台',
        logo_title: '自定义光刻胶计算平台',
        logo_subtitle: 'Multi-Model Photoresist Simulation Platform',
        nav_guide: '使用指南',
        nav_single: '单一计算',
        nav_compare: '参数比较',
        nav_batch: '批量计算',
        nav_matrix: '模型矩阵可视化',
        lang_btn: 'English/中文',
        company_name: '香港大学 · 机械工程学院',
        support_text: '技术支持',
        select_model: '选择计算模型:',
        dill_model: 'Dill模型（薄胶）',
        enhanced_dill_model: '增强Dill模型（厚胶）',
        car_model: 'CAR模型（化学放大型光刻胶）',
        dill_formula_title: 'Dill模型',
        dill_formula_core: '核心关系: <code>M(x,z) = e<sup>-C · D(x,z)</sup></code>',
        dill_formula_note: '<em>M: 归一化光敏剂浓度, C: 光敏速率常数, D: 曝光剂量</em>',
        enhanced_formula_title: '增强Dill模型（厚胶）',
        enhanced_formula_core: '核心关系: <code>∂I/∂z = -I·[A(z<sub>h</sub>,T,t<sub>B</sub>)·M+B(z<sub>h</sub>,T,t<sub>B</sub>)]</code>',
        enhanced_formula_core2: '<code>∂M/∂t = -I·M·C(z<sub>h</sub>,T,t<sub>B</sub>)</code>',
        car_formula_title: 'CAR模型（化学放大型光刻胶）',
        car_formula_core: '核心过程: 光酸生成 → 扩散 → 催化反应 → 显影',
        car_formula_note: '<em>CAR: 化学放大型光刻胶 (Chemically Amplified Resist)</em>',
        btn_expand: '展开更多 <i class="fas fa-chevron-down"></i>',
        btn_collapse: '收起详情 <i class="fas fa-chevron-up"></i>',
        dill_formula_ode: '微分方程',
        dill_formula_ode_code: '∂M/∂t = -C·I·M',
        dill_formula_ref: '参考：Dill F H, Neureuther A R, Tuttle J A, et al. IEEE Trans Electron Devices, 1975.',
        dill_formula_scope: 'Dill模型主要适用于薄胶层（< 3μm）的光刻胶曝光过程建模，其中光的穿透性较好，光强分布较为均匀。',
        dill_formula_math: '完整的Dill模型包括三个关键参数A、B、C：',
        dill_formula_math_A: '<b>参数A</b>：表示光敏剂对光的吸收率',
        dill_formula_math_B: '<b>参数B</b>：表示基底对光的吸收率',
        dill_formula_math_C: '<b>参数C</b>：表示光敏剂对光的反应速率',
        dill_formula_simple: '在本工具的简化模型中，主要使用参数C来表征光刻胶的曝光特性。',
        dill_formula_detail: '核心公式详解',
        dill_formula_param_M: '<span class="param-name">M(x,z):</span> <span class="param-desc">位置(x,z)处的归一化光敏剂浓度，M=1表示未曝光区域，M=0表示完全曝光区域</span>',
        dill_formula_param_C: '<span class="param-name">C:</span> <span class="param-desc">光敏速率常数，表示光刻胶对光的敏感程度，单位: cm²/mJ</span>',
        dill_formula_param_D: '<span class="param-name">D(x,z):</span> <span class="param-desc">位置(x,z)处的曝光剂量，单位: mJ/cm²</span>',
        dill_formula_ode2: '微分方程形式',
        dill_formula_ode2_code: '∂M/∂t = -C · I · M',
        dill_formula_ode2_note: '其中I为光强度，表示单位时间内的曝光剂量。',
        enhanced_formula_ode: '微分方程',
        enhanced_formula_ode_code: '∂I/∂z = -I·[A(z<sub>h</sub>,T,t<sub>B</sub>)·M+B(z<sub>h</sub>,T,t<sub>B</sub>)]<br>∂M/∂t = -I·M·C(z<sub>h</sub>,T,t<sub>B</sub>)',
        enhanced_formula_ref: '参考：刘世杰等《厚层抗蚀剂曝光模型及其参数测量》, 2005.',
        enhanced_formula_scope: '该模型特别适用于厚胶层（> 5μm）光刻胶，其中光的穿透性受到明显影响，光强随深度衰减较为显著。',
        enhanced_formula_fit: '参数拟合',
        enhanced_formula_fit_math: '根据刘世杰等的研究，A/B/C参数可以通过以下形式表示：',
        enhanced_formula_fit_A: 'A(z<sub>h</sub>,T,t<sub>B</sub>) = a₀ + a₁·z<sub>h</sub> + a₂·T + a₃·z<sub>h</sub>² + a₄·z<sub>h</sub>·T + a₅·T²',
        enhanced_formula_fit_B: 'B(z<sub>h</sub>,T,t<sub>B</sub>) = b₀ + b₁·z<sub>h</sub> + b₂·T',
        enhanced_formula_fit_C: 'C(z<sub>h</sub>,T,t<sub>B</sub>) = c₀ + c₁·z<sub>h</sub> + c₂·T + c₃·z<sub>h</sub>²',
        enhanced_formula_fit_note: '其中参数a₀~a₅, b₀~b₂, c₀~c₃由实验数据拟合得到。',
        enhanced_formula_detail: '核心公式详解',
        enhanced_formula_param_I: '<span class="param-name">I:</span> <span class="param-desc">光强度，随深度z变化</span>',
        enhanced_formula_param_M: '<span class="param-name">M:</span> <span class="param-desc">归一化光敏剂浓度</span>',
        enhanced_formula_param_A: '<span class="param-name">A(z<sub>h</sub>,T,t<sub>B</sub>):</span> <span class="param-desc">光敏剂吸收率，与胶厚、前烘温度、前烘时间相关</span>',
        enhanced_formula_param_B: '<span class="param-name">B(z<sub>h</sub>,T,t<sub>B</sub>):</span> <span class="param-desc">基底吸收率，与胶厚、前烘温度、前烘时间相关</span>',
        enhanced_formula_param_C: '<span class="param-name">C(z<sub>h</sub>,T,t<sub>B</sub>):</span> <span class="param-desc">光敏速率常数，与胶厚、前烘温度、前烘时间相关</span>',
        enhanced_formula_fit_detail: '参数拟合公式',
        enhanced_formula_fit_desc: 'A、B、C参数通过多项式函数拟合实验数据：',
        car_formula_ode: '关键方程',
        car_formula_ode_code: '[H<sup>+</sup>] = η·D(x)<br>D(x,t) = I(x)·t<br>扩散: [H<sup>+</sup>]<sub>diff</sub> = G([H<sup>+</sup>], l<sub>diff</sub>)<br>脱保护度: M = 1-e<sup>-k·[H<sup>+</sup>]<sub>diff</sub>·A</sup>',
        car_formula_ref: '参考：Hinsberg et al., "Chemical amplification mechanism", Proc. SPIE, 1994.',
        car_formula_scope: '该模型特别适用于DUV (深紫外)光刻胶，其中一个光子可以通过光酸催化机制引发多次化学反应。',
        car_formula_math: 'CAR模型的四个关键步骤：',
        car_formula_math_A: '<b>光酸生成</b>：曝光产生初始光酸分布，与曝光剂量和量子效率有关',
        car_formula_math_B: '<b>光酸扩散</b>：后烘过程中光酸分子扩散，使空间分布变得平滑',
        car_formula_math_C: '<b>催化反应</b>：每个光酸分子可催化多个保护基团脱离，实现化学放大',
        car_formula_math_D: '<b>显影过程</b>：脱保护区域可被显影液溶解，形成图案',
        car_formula_simple: '本模型关注放大效应、对比度和分辨率之间的关系。',
        car_formula_detail: '核心公式详解',
        car_formula_acid: '<code>[H<sup>+</sup>] = η·D(x) = η·I(x)·t<sub>exp</sub></code>',
        car_formula_deprotect: '<code>M = 1-e<sup>-k·[H<sup>+</sup>]<sub>diff</sub>·A</sup></code>',
        car_formula_param_H: '<span class="param-name">[H<sup>+</sup>]:</span> <span class="param-desc">光酸浓度，与曝光剂量成正比</span>',
        car_formula_param_eta: '<span class="param-name">η:</span> <span class="param-desc">光酸产生效率，反映光子到光酸分子的转化效率</span>',
        car_formula_param_diff: '<span class="param-name">[H<sup>+</sup>]<sub>diff</sub>:</span> <span class="param-desc">经过扩散后的光酸浓度分布</span>',
        car_formula_param_k: '<span class="param-name">k:</span> <span class="param-desc">反应速率常数，表征催化反应效率</span>',
        car_formula_param_A: '<span class="param-name">A:</span> <span class="param-desc">放大因子，表示每个光酸分子可以催化的反应数量</span>',
        car_formula_param_M: '<span class="param-name">M:</span> <span class="param-desc">树脂脱保护程度，影响显影后的溶解速率</span>',
        param_desc_I_avg: '光强分布阶段：控制入射光强度，强度大=曝光强=反应快',
        param_desc_V: '光强分布阶段：控制干涉条纹对比度，值大=条纹清晰=图案锐利',
        param_desc_K: '光强分布阶段：控制条纹空间频率，值大=条纹密集=分辨率高',
        param_desc_t_exp: '曝光反应阶段：控制曝光剂量，时间长=剂量大=反应充分',
        param_desc_C: '曝光反应阶段：控制光敏速率，值大=敏感度高=反应快',
        param_desc_angle_a: '光强分布阶段：控制干涉条纹周期，周期小=条纹密度高=空间频率高',
        param_desc_exposure_threshold: '曝光反应阶段：控制曝光阈值，阈值高=反应门槛高=抗性强',
    param_desc_wavelength: '光强分布阶段：入射光的波长，影响干涉条纹空间频率，常用值：365nm(i线)、405nm(h线)、436nm(g线)',
    
        param_desc_z_h: '影响光传播深度，厚度大=吸收多，厚度小=穿透强',
        param_desc_T: '影响溶剂挥发速度，温度高=挥发快=胶膜更致密',
        param_desc_t_B: '影响胶膜稳定性，时间长=溶剂去除彻底=曝光均匀',
        param_desc_I0: '影响曝光强度，值大=光强高=反应快，值小=光强低=反应慢',
        param_desc_M0: '影响光敏剂浓度，值大=敏感度高=易曝光，值小=敏感度低=需长时间',
        param_desc_t_exp_enhanced: '决定曝光剂量，时间长=剂量大=反应充分，时间短=剂量小=反应不足',
        param_desc_enhanced_V: '影响光强对比度，值大=条纹清晰=图案锐利，值小=条纹模糊=图案柔和',
        param_desc_enhanced_K: '决定条纹密度，值大=条纹密集=分辨率高，值小=条纹稀疏=特征尺寸大',
        exposure_dist: '曝光剂量分布 (1D)',
        thickness_dist: '形貌分布 (1D)',
        exposure_xy_dist: '曝光剂量分布 (2D) (X, Y平面)',
        thickness_xy_dist: '形貌分布 (2D) (X, Y平面)',
        x_position: 'X 位置 (μm)',
        y_position: 'Y 位置 (μm)',
        z_position: 'Z 位置 (μm)',
        exposure_dose_trace_name: '曝光剂量',
        thickness_trace_name: '相对厚度',
        calculate: '计算',
        result_section: '计算结果',
        export_img: '导出图片',
        export_data: '导出数据',
        error_message: '',
        loading: '加载中...',
        back_to_top: '返回顶部',
        
        // 参数容器标题
        dill_basic_params: 'Dill模型基本参数',
        enhanced_dill_basic_params: '增强Dill模型基本参数',
        car_basic_params: 'CAR模型基本参数',
        sine_wave_type: '波形类型',
        sine_wave_params: '波形参数',
        twod_sine_wave_params: '二维波形参数',
        '3d_sine_wave_params': '三维波形参数',
        sine_wave_type_label: '正弦波类型：',
        sine_wave_type_single: '一维正弦波',
        sine_wave_type_multi: '二维正弦波',
        sine_wave_type_3d: '三维正弦波',
        
        // 以下是之前可能被删除的翻译
        kx_label: 'Kx (空间频率x)',
        kx_description: 'x方向空间频率，单位：rad/μm，范围：0.1~10',
        ky_label: 'Ky (空间频率y)',
        ky_description: 'y方向空间频率，单位：rad/μm，范围：0.1~100（必须大于0）',
        kz_label: 'Kz (空间频率z)',
        kz_description: 'z方向空间频率，单位：rad/μm，范围：0.1~10',
        phi_label: 'φ(t) (相位表达式)',
        phi_description: '相位，可为常数或t的函数，如0, 1.57, sin(2*t)',
        phi_description_supports: '支持sin/cos/pi/t等',
        y_range_label: 'y范围 (μm)：',
        y_resolution_label: '分辨率：',
        y_range_description: '二维分布时有效，y_min=y_max表示一维',
        "3d_range_label": '三维显示范围',
        "3d_range_description": '三维分布显示范围，单位：μm',
        heatmap_plot_title: '二维分布热力图',
        export_heatmap_data_btn: '导出二维数据',
        model_description_title: '模型选择与说明',
        copy_set_title: '复制参数组',
        remove_set_title: '删除参数组',
        compare_set_placeholder_title: '输入自定义名称',
        collapse_set_title: '折叠/展开参数组',
        add_set: '新增参数组',
        logo: '<span>多模型</span>计算工具',
        drag_handle_title: '拖拽排序',
        param_desc_car_I_avg: '光酸生成阶段：控制初始光酸浓度，强度大=光酸多=反应强',
        param_desc_car_V: '光酸生成阶段：控制光强对比度，值大=条纹清晰=图案锐利',
        param_desc_car_K: '光酸生成阶段：决定条纹周期，值大=条纹密集=分辨率高',
        param_desc_car_t_exp: '光酸生成阶段：控制曝光剂量，时间长=剂量大=光酸多',
        param_desc_car_acid_gen: '光酸生成阶段：控制光酸产生效率，值大=转化率高=敏感度高',
        param_desc_car_diff: '光酸扩散阶段：控制扩散程度，长度大=扩散远=边缘模糊',
        param_desc_car_rate: '脱保护反应阶段：控制反应速率，速率大=反应快=脱保护多',
        param_desc_car_amp: '脱保护反应阶段：控制化学放大强度，因子大=放大强=敏感度高',
        param_desc_car_contrast: '显影过程阶段：控制显影对比度，对比度大=显影锐利=边缘清晰',
        hover_exposure_value: '曝光剂量值',
        hover_thickness_value: '相对厚度值',
        compare_set_title: '参数组 {n}',
        'phi_expr_custom': '自定义输入',
        'phi_expr_constant': '常量: 0',
        'phi_expr_linear': '线性变化: 0.5*t',
        'phi_expr_sin': '正弦变化: sin(t)',
        'phi_expr_cos': '余弦变化: cos(t)',
        'phi_expr_sin_2pi': '正弦周期变化: sin(2*PI*t)',
        'phi_expr_quadratic': '二次变化: 0.2*t*t',
        'phi_expr_complex1': '复合函数: t*sin(2*PI*t)',
        'phi_expr_complex2': '衰减正弦: exp(-0.1*t)*sin(t)',
        'phi_expr_pi4': '固定相位: PI/4',
        'phi_expr_help': '支持数学函数: sin, cos, tan, exp, abs, sqrt, PI, E',
        
        // 页脚翻译
        footer_brand: '光刻胶建模平台',
        footer_desc: '基于先进的数学模型和计算方法，为半导体制造业提供专业的光刻胶建模与仿真解决方案。',
        footer_platform: '平台功能',
        footer_single: '单一模型计算',
        footer_compare: '参数对比分析',
        footer_matrix: '矩阵可视化',
        footer_documentation: '使用文档',
        footer_models: '支持模型',
        footer_dill: '薄胶模型',
        footer_enhanced: '厚胶模型',
        footer_car: '化学放大模型',
        footer_custom: '自定义模型',
        footer_contact: '联系我们',
        footer_university: '香港大学',
        footer_version: '版本 v2.1.0',
        footer_copyright_org: '香港大学机械工程学院',
        footer_rights: '保留所有权利',

        footer_privacy: '隐私政策',
        footer_terms: '安全政策',
        footer_support: '技术支持',
        badge_research: '科研级',
        badge_professional: '专业版',
        badge_verified: '已验证',
        
        // 日志相关
        view_logs: '查看日志',
        view_logs_title: '查看详细计算日志',
        loading_logs: '计算日志',
        loading_logs_title: '查看计算进度',
        loading_logs_title_text: '实时计算日志',
        loading_logs_placeholder: '计算开始后将显示详细日志...',
        loading_stat_progress: '进度:',
        loading_stat_time: '用时:',
        
        // 4D动画参数
        '4d_animation_params': '4D动画参数',
    },
    // 添加zh映射到zh-CN解决语言匹配问题
    'zh': {
        // 这里直接引用zh-CN的所有属性
    },
    en: {
        title: 'Custom Photoresist Calculation Platform',
        logo_title: 'Custom Photoresist Calculation Platform',
        logo_subtitle: 'Custom Photoresist Calculation Platform',
        nav_guide: 'User Guide',
        nav_single: 'Single Calculation',
        nav_compare: 'Parameter Comparison',
        nav_batch: 'Batch Calculation',
        nav_matrix: 'Model Matrix Visualization',
        lang_btn: 'English/中文',
        company_name: 'The University of Hong Kong · Department of Mechanical Engineering',
        support_text: 'Technical Support',
        select_model: 'Select Calculation Model:',
        dill_model: 'Dill Model (Thin Resist)',
        enhanced_dill_model: 'Enhanced Dill Model (Thick Resist)',
        car_model: 'CAR Model (Chemically Amplified Resist)',
        dill_formula_title: 'Dill Model',
        dill_formula_core: 'Core Relationship: <code>M(x,z) = e<sup>-C · D(x,z)</sup></code>',
        dill_formula_note: '<em>M: Normalized PAC concentration, C: Photosensitivity rate constant, D: Exposure dose</em>',
        enhanced_formula_title: 'Enhanced Dill Model (Thick Resist)',
        enhanced_formula_core: 'Core Relationship: <code>∂I/∂z = -I·[A(z<sub>h</sub>,T,t<sub>B</sub>)·M+B(z<sub>h</sub>,T,t<sub>B</sub>)]</code>',
        enhanced_formula_core2: '<code>∂M/∂t = -I·M·C(z<sub>h</sub>,T,t<sub>B</sub>)</code>',
        car_formula_title: 'CAR Model (Chemically Amplified Resist)',
        car_formula_core: 'Core Process: Acid Generation → Diffusion → Catalytic Reaction → Development',
        car_formula_note: '<em>CAR: Chemically Amplified Resist</em>',
        btn_expand: 'Expand Details <i class="fas fa-chevron-down"></i>',
        btn_collapse: 'Collapse Details <i class="fas fa-chevron-up"></i>',
        dill_formula_ode: 'Differential Equation',
        dill_formula_ode_code: '∂M/∂t = -C·I·M',
        dill_formula_ref: 'Reference: Dill F H, Neureuther A R, Tuttle J A, et al. IEEE Trans Electron Devices, 1975.',
        dill_formula_scope: 'Dill model is primarily suitable for thin resist layers (< 3μm) where light penetration is good and intensity distribution is relatively uniform.',
        dill_formula_math: 'The complete Dill model includes three key parameters A, B, and C:',
        dill_formula_math_A: '<b>Parameter A</b>: Represents the absorption rate of the photosensitive agent',
        dill_formula_math_B: '<b>Parameter B</b>: Represents the absorption rate of the substrate',
        dill_formula_math_C: '<b>Parameter C</b>: Represents the reaction rate of the photosensitive agent to light',
        dill_formula_simple: 'In this simplified tool, parameter C is primarily used to characterize the exposure properties of the photoresist.',
        dill_formula_detail: 'Core Formula Details',
        dill_formula_param_M: '<span class="param-name">M(x,z):</span> <span class="param-desc">Normalized PAC concentration at position (x,z), M=1 for unexposed areas, M=0 for fully exposed areas</span>',
        dill_formula_param_C: '<span class="param-name">C:</span> <span class="param-desc">Photosensitivity rate constant, representing the sensitivity of photoresist to light, unit: cm²/mJ</span>',
        dill_formula_param_D: '<span class="param-name">D(x,z):</span> <span class="param-desc">Exposure dose at position (x,z), unit: mJ/cm²</span>',
        dill_formula_ode2: 'Differential Equation Form',
        dill_formula_ode2_code: '∂M/∂t = -C · I · M',
        dill_formula_ode2_note: 'where I is the light intensity, representing exposure dose per unit time.',
        enhanced_formula_ode: 'Differential Equations',
        enhanced_formula_ode_code: '∂I/∂z = -I·[A(z<sub>h</sub>,T,t<sub>B</sub>)·M+B(z<sub>h</sub>,T,t<sub>B</sub>)]<br>∂M/∂t = -I·M·C(z<sub>h</sub>,T,t<sub>B</sub>)',
        enhanced_formula_ref: 'Reference: Liu Shijie et al., "Thick Resist Exposure Model and Its Parameter Measurement", 2005.',
        enhanced_formula_scope: 'This model is particularly suitable for thick resist layers (> 5μm) where light penetration is significantly affected and intensity attenuation with depth is notable.',
        enhanced_formula_fit: 'Parameter Fitting',
        enhanced_formula_fit_math: 'According to Liu Shijie et al., A/B/C parameters can be represented as:',
        enhanced_formula_fit_A: 'A(z<sub>h</sub>,T,t<sub>B</sub>) = a₀ + a₁·z<sub>h</sub> + a₂·T + a₃·z<sub>h</sub>² + a₄·z<sub>h</sub>·T + a₅·T²',
        enhanced_formula_fit_B: 'B(z<sub>h</sub>,T,t<sub>B</sub>) = b₀ + b₁·z<sub>h</sub> + b₂·T',
        enhanced_formula_fit_C: 'C(z<sub>h</sub>,T,t<sub>B</sub>) = c₀ + c₁·z<sub>h</sub> + c₂·T + c₃·z<sub>h</sub>²',
        enhanced_formula_fit_note: 'Where parameters a₀~a₅, b₀~b₂, c₀~c₃ are obtained by fitting experimental data.',
        enhanced_formula_detail: 'Core Formula Details',
        enhanced_formula_param_I: '<span class="param-name">I:</span> <span class="param-desc">Light intensity, varying with depth z</span>',
        enhanced_formula_param_M: '<span class="param-name">M:</span> <span class="param-desc">Normalized PAC concentration</span>',
        enhanced_formula_param_A: '<span class="param-name">A(z<sub>h</sub>,T,t<sub>B</sub>):</span> <span class="param-desc">Photosensitive agent absorption rate, related to resist thickness, prebake temperature, and prebake time</span>',
        enhanced_formula_param_B: '<span class="param-name">B(z<sub>h</sub>,T,t<sub>B</sub>):</span> <span class="param-desc">Substrate absorption rate, related to resist thickness, prebake temperature, and prebake time</span>',
        enhanced_formula_param_C: '<span class="param-name">C(z<sub>h</sub>,T,t<sub>B</sub>):</span> <span class="param-desc">Photosensitivity rate constant, related to resist thickness, prebake temperature, and prebake time</span>',
        enhanced_formula_fit_detail: 'Parameter Fitting Formulas',
        enhanced_formula_fit_desc: 'A, B, C parameters are fitted to experimental data using polynomial functions:',
        car_formula_ode: 'Key Equations',
        car_formula_ode_code: '[H<sup>+</sup>] = η·D(x)<br>D(x,t) = I(x)·t<br>Diffusion: [H<sup>+</sup>]<sub>diff</sub> = G([H<sup>+</sup>], l<sub>diff</sub>)<br>Deprotection: M = 1-e<sup>-k·[H<sup>+</sup>]<sub>diff</sub>·A</sup>',
        car_formula_ref: 'Reference: Hinsberg et al., "Chemical amplification mechanism", Proc. SPIE, 1994.',
        car_formula_scope: 'This model is particularly suitable for DUV (Deep Ultraviolet) photoresists, where a single photon can initiate multiple chemical reactions through photoacid catalytic mechanisms.',
        car_formula_math: 'Four key steps in the CAR model:',
        car_formula_math_A: '<b>Photoacid Generation</b>: Exposure produces initial photoacid distribution, related to exposure dose and quantum efficiency',
        car_formula_math_B: '<b>Photoacid Diffusion</b>: Photoacid molecules diffuse during PEB, smoothing the spatial distribution',
        car_formula_math_C: '<b>Catalytic Reaction</b>: Each photoacid molecule can catalyze multiple protecting groups to detach, achieving chemical amplification',
        car_formula_math_D: '<b>Development Process</b>: Deprotected areas can be dissolved by developer, forming patterns',
        car_formula_simple: 'This model focuses on the relationship between amplification effect, contrast, and resolution.',
        car_formula_detail: 'Core Formula Details',
        car_formula_acid: '<code>[H<sup>+</sup>] = η·D(x) = η·I(x)·t<sub>exp</sub></code>',
        car_formula_deprotect: '<code>M = 1-e<sup>-k·[H<sup>+</sup>]<sub>diff</sub>·A</sup></code>',
        car_formula_param_H: '<span class="param-name">[H<sup>+</sup>]:</span> <span class="param-desc">Photoacid concentration, proportional to exposure dose</span>',
        car_formula_param_eta: '<span class="param-name">η:</span> <span class="param-desc">Photoacid generation efficiency, reflecting conversion from photons to photoacid molecules</span>',
        car_formula_param_diff: '<span class="param-name">[H<sup>+</sup>]<sub>diff</sub>:</span> <span class="param-desc">Acid concentration after diffusion</span>',
        car_formula_param_k: '<span class="param-name">k:</span> <span class="param-desc">Reaction rate constant, characterizing catalytic reaction efficiency</span>',
        car_formula_param_A: '<span class="param-name">A:</span> <span class="param-desc">Amplification factor, representing number of reactions a photoacid molecule can catalyze</span>',
        car_formula_param_M: '<span class="param-name">M:</span> <span class="param-desc">Degree of resin deprotection, affecting dissolution rate after development</span>',
        param_desc_I_avg: 'Light Distribution Stage: Controls incident light intensity, higher intensity = stronger exposure = faster reaction',
        param_desc_V: 'Light Distribution Stage: Controls interference fringe contrast, higher value = clear fringes = sharp patterns',
        param_desc_K: 'Light Distribution Stage: Controls fringe spatial frequency, higher value = dense fringes = high resolution',
        param_desc_t_exp: 'Exposure Reaction Stage: Controls exposure dose, longer time = higher dose = full reaction',
        param_desc_C: 'Exposure Reaction Stage: Controls photosensitivity rate, higher value = high sensitivity = faster reaction',
        param_desc_angle_a: 'Light Distribution Stage: Controls interference fringe angle, larger angle = tilted fringes = rotated pattern',
        param_desc_exposure_threshold: 'Exposure Reaction Stage: Controls exposure threshold, higher threshold = higher reaction barrier = stronger resistance',
    param_desc_wavelength: 'Light Intensity Distribution Stage: Incident light wavelength, affects interference fringe spatial frequency, common values: 365nm(i-line), 405nm(h-line), 436nm(g-line)',
    
        param_desc_z_h: 'Affects light penetration depth, thicker = more absorption, thinner = stronger penetration',
        param_desc_T: 'Affects solvent evaporation rate, higher temp = faster evaporation = denser film',
        param_desc_t_B: 'Affects film stability, longer time = complete solvent removal = uniform exposure',
        param_desc_I0: 'Affects exposure intensity, higher value = stronger light = faster reaction, lower value = weaker light = slower reaction',
        param_desc_M0: 'Affects photosensitizer concentration, higher value = higher sensitivity = easier exposure, lower value = lower sensitivity = longer time needed',
        param_desc_t_exp_enhanced: 'Controls exposure dose, longer time = higher dose = full reaction, shorter time = lower dose = incomplete reaction',
        param_desc_enhanced_V: 'Affects light intensity contrast, higher value = clear fringes = sharp patterns, lower value = blurred fringes = soft patterns',
        param_desc_enhanced_K: 'Controls fringe density, higher value = dense fringes = high resolution, lower value = sparse fringes = large feature size',
        exposure_dist: 'Exposure Dose Distribution (1D)',
        thickness_dist: 'Etch Depth Distribution (1D)',
        exposure_xy_dist: 'Exposure Dose Distribution (2D) (X, Y Plane)',
        thickness_xy_dist: 'Resist Thickness Distribution (2D) (X, Y Plane)',
        x_position: 'X Position (μm)',
        y_position: 'Y Position (μm)',
        z_position: 'Z Position (μm)',
        exposure_dose_trace_name: 'Exposure Dose',
        thickness_trace_name: 'Relative Thickness',
        calculate: 'Calculate',
        result_section: 'Calculation Results',
        export_img: 'Export Image',
        export_data: 'Export Data',
        error_message: '',
        loading: 'Loading...',
        back_to_top: 'Back to Top',
        
        // 参数容器标题（英文）
        dill_basic_params: 'Dill Model Basic Parameters',
        enhanced_dill_basic_params: 'Enhanced Dill Model Basic Parameters',
        car_basic_params: 'CAR Model Basic Parameters',
        sine_wave_type: 'Wave Type',
        sine_wave_params: 'Wave Parameters',
        twod_sine_wave_params: '2D Wave Parameters',
        '3d_sine_wave_params': '3D Wave Parameters',
        sine_wave_type_label: 'Sine Wave Type:',
        sine_wave_type_single: '1D Sine Wave',
        sine_wave_type_multi: '2D Sine Wave',
        sine_wave_type_3d: '3D Sine Wave',
        
        // 以下是之前可能被删除的翻译
        kx_label: 'Kx (Spatial Frequency x)',
        kx_description: 'Spatial frequency in x-direction, unit: rad/μm, range: 0.1~10',
        ky_label: 'Ky (Spatial Frequency y)',
        ky_description: 'Spatial frequency in y-direction, unit: rad/μm, range: 0.1~100 (must >0)',
        kz_label: 'Kz (Spatial Frequency z)',
        kz_description: 'Spatial frequency in z-direction, unit: rad/μm, range: 0.1~10',
        phi_label: 'φ(t) (Phase Expression)',
        phi_description: 'Phase, can be a constant or a function of t, e.g., 0, 1.57, sin(2*t)',
        phi_description_supports: 'Supports sin/cos/pi/t etc.',
        y_range_label: 'y-range (μm):',
        y_resolution_label: 'Resolution:',
        y_range_description: 'Effective for 2D distribution, y_min=y_max for 1D',
        "3d_range_label": '3D Display Range',
        "3d_range_description": '3D distribution display range, unit: μm',
        heatmap_plot_title: '2D Distribution Heatmap',
        export_heatmap_data_btn: 'Export 2D Data',
        model_description_title: 'Model Selection & Description',
        copy_set_title: 'Copy Parameter Set',
        remove_set_title: 'Remove Parameter Set',
        compare_set_placeholder_title: 'Enter custom name',
        collapse_set_title: 'Collapse/Expand Parameter Set',
        add_set: 'Add Parameter Set',
        logo: '<span>Multi-Model</span> Calculation Tool',
        drag_handle_title: 'Drag to reorder',
        param_desc_car_I_avg: 'Acid Generation Stage: Controls initial acid concentration, higher intensity = more acid = stronger reaction',
        param_desc_car_V: 'Acid Generation Stage: Controls light intensity contrast, higher value = clear fringes = sharp patterns',
        param_desc_car_K: 'Acid Generation Stage: Controls fringe period, higher value = dense fringes = high resolution',
        param_desc_car_t_exp: 'Acid Generation Stage: Controls exposure dose, longer time = higher dose = more acid',
        param_desc_car_acid_gen: 'Acid Generation Stage: Controls acid generation efficiency, higher value = high conversion rate = high sensitivity',
        param_desc_car_diff: 'Acid Diffusion Stage: Controls diffusion extent, longer length = farther diffusion = blurred edges',
        param_desc_car_rate: 'Deprotection Reaction Stage: Controls reaction rate, higher rate = faster reaction = more deprotection',
        param_desc_car_amp: 'Deprotection Reaction Stage: Controls chemical amplification strength, higher factor = stronger amplification = high sensitivity',
        param_desc_car_contrast: 'Development Process Stage: Controls development contrast, higher contrast = sharp development = clear edges',
        hover_exposure_value: 'Exposure Dose Value',
        hover_thickness_value: 'Relative Thickness Value',
        compare_set_title: 'Parameter Set {n}',
        'phi_expr_custom': 'Custom Input',
        'phi_expr_constant': 'Constant: 0',
        'phi_expr_linear': 'Linear: 0.5*t',
        'phi_expr_sin': 'Sine: sin(t)',
        'phi_expr_cos': 'Cosine: cos(t)',
        'phi_expr_sin_2pi': 'Periodic Sine: sin(2*PI*t)',
        'phi_expr_quadratic': 'Quadratic: 0.2*t*t',
        'phi_expr_complex1': 'Compound: t*sin(2*PI*t)',
        'phi_expr_complex2': 'Damped Sine: exp(-0.1*t)*sin(t)',
        'phi_expr_pi4': 'Fixed Phase: PI/4',
        'phi_expr_help': 'Supported functions: sin, cos, tan, exp, abs, sqrt, PI, E',
        
        // Footer translations
        footer_brand: 'Photoresist Modeling Platform',
        footer_desc: 'Based on advanced mathematical models and computational methods, providing professional photoresist modeling and simulation solutions for the semiconductor manufacturing industry.',
        footer_platform: 'Platform Features',
        footer_single: 'Single Model Calculation',
        footer_compare: 'Parameter Comparison Analysis',
        footer_matrix: 'Matrix Visualization',
        footer_documentation: 'Documentation',
        footer_models: 'Supported Models',
        footer_dill: 'Thin Resist Model',
        footer_enhanced: 'Thick Resist Model',
        footer_car: 'Chemically Amplified Model',
        footer_custom: 'Custom Model',
        footer_contact: 'Contact Us',
        footer_university: 'The University of Hong Kong',
        footer_version: 'Version v2.1.0',
        footer_copyright_org: 'Department of Mechanical Engineering, Faculty of Engineering, The University of Hong Kong',
        footer_rights: 'All rights reserved',

        footer_privacy: 'Privacy Policy',
        footer_terms: 'Safety Policy',
        footer_support: 'Technical Support',
        badge_research: 'Research-grade',
        badge_professional: 'Professional',
        badge_verified: 'Verified',
        
        // Log related
        view_logs: 'View Logs',
        view_logs_title: 'View detailed calculation logs',
        loading_logs: 'Calculation Logs',
        loading_logs_title: 'View calculation progress',
        loading_logs_title_text: 'Real-time Calculation Logs',
        loading_logs_placeholder: 'Detailed logs will be displayed after calculation starts...',
        loading_stat_progress: 'Progress:',
        loading_stat_time: 'Time elapsed:',
        
        // 4D animation parameters
        '4d_animation_params': '4D Animation Parameters',
    }
};

// 确保 LANGS['zh'] 包含 LANGS['zh-CN'] 的所有属性
// 这应该在 LANGS 对象完全定义之后，但在其他函数可能使用它之前执行
if (LANGS && LANGS['zh-CN'] && LANGS['zh']) {
    for (const key in LANGS['zh-CN']) {
        if (Object.prototype.hasOwnProperty.call(LANGS['zh-CN'], key)) {
            if (!LANGS['zh'][key]) { // 只复制 zh 中尚未定义的属性，以防 zh 有特殊定义
                LANGS['zh'][key] = LANGS['zh-CN'][key];
            }
        }
    }
}

// 全局当前语言变量，从localStorage或浏览器设置初始化
let currentLang = getInitialLang();

/**
 * 获取初始语言设置
 * @returns {string} 初始语言代码
 */
function getInitialLang() {
    try {
        // 优先从preferredLang获取
        let lang = localStorage.getItem('preferredLang');
        if (lang && LANGS[lang]) {
            console.log(`从preferredLang加载语言: ${lang}`);
            return lang;
        }
        
        // 其次从userLanguage获取
        const persistedLang = localStorage.getItem('userLanguage');
        if (persistedLang && (persistedLang === 'zh' || persistedLang === 'en')) {
            console.log(`从userLanguage加载语言: ${persistedLang}`);
            return persistedLang;
        }
    } catch (e) {
        console.error('Error reading language from localStorage:', e);
    }
    
    console.log('使用默认语言: zh');
    return 'zh'; // Default language
}

function switchLang() {
    currentLang = (currentLang === 'zh') ? 'en' : 'zh';
    try {
        localStorage.setItem('userLanguage', currentLang);
    } catch (e) {
        console.error('Error saving language to localStorage:', e);
    }
    applyLang();
    // 新增：切换按钮样式
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
        langBtn.classList.remove('lang-btn-zh', 'lang-btn-en');
        langBtn.classList.add(currentLang === 'zh' ? 'lang-btn-zh' : 'lang-btn-en');
    }
    // 刷新波形类型标题
    if (typeof initWaveTypeTitles === 'function') {
        initWaveTypeTitles();
    }
}

function applyLang() {
    console.log('[lang] applyLang called for:', currentLang);
    if (!LANGS[currentLang]) {
        console.error('Language not found in LANGS:', currentLang);
        return;
    }

    // 设置body的data-lang属性，用于CSS样式选择器
    document.body.setAttribute('data-lang', currentLang);

    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.getAttribute('data-i18n');
        if (LANGS[currentLang][key]) {
            if (elem.tagName === 'INPUT' && (elem.type === 'submit' || elem.type === 'button')) {
                elem.value = LANGS[currentLang][key];
            } else if (elem.tagName === 'OPTION') {
                elem.textContent = LANGS[currentLang][key];
            } else if (elem.hasAttribute('placeholder')) {
                elem.placeholder = LANGS[currentLang][key];
            } else {
                elem.innerHTML = LANGS[currentLang][key];
            }
        } else {
            // console.warn(`[lang] Key "${key}" not found for lang "${currentLang}"`);
        }
    });

    // Update page title
    const titleElement = document.querySelector('title[data-i18n]');
    if (titleElement) {
        const titleKey = titleElement.getAttribute('data-i18n');
        if (LANGS[currentLang][titleKey]) {
            document.title = LANGS[currentLang][titleKey];
        }
    }

    // Update logo specifically, as it might have complex structure not covered by data-i18n innerHTML alone
    const logo = document.querySelector('.logo[data-i18n="logo"]'); // Assuming logo has data-i18n="logo"
    if (logo && LANGS[currentLang].logo) {
        logo.innerHTML = LANGS[currentLang].logo;
    }

    // Update language toggle button text
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn && LANGS[currentLang].lang_btn) {
        langBtn.textContent = LANGS[currentLang].lang_btn;
        // Update button style if you have specific styles for each language state
        langBtn.classList.remove('lang-btn-zh', 'lang-btn-en');
        langBtn.classList.add(currentLang === 'zh' ? 'lang-btn-zh' : 'lang-btn-en');
    }

    // Re-initialize Choices.js instances to reflect language changes in options
    if (typeof initializeChoices === 'function') {
        initializeChoices();
    }

    // Update expand/collapse button texts based on current state and language
    // This is important if their text is set on page load based on language
    document.querySelectorAll('.toggle-details-btn').forEach(function(btn) {
        const details = btn.parentElement.querySelector('.model-full-details');
        if (details) {
            if (details.classList.contains('details-visible')) {
                btn.innerHTML = LANGS[currentLang].btn_collapse;
            } else {
                btn.innerHTML = LANGS[currentLang].btn_expand;
            }
        }
    });

    // After applying language to all static elements,
    // if plots were previously generated, re-render them with the new language.
    if (typeof clearAllCharts === 'function' && typeof displayInteractiveResults === 'function' && window.lastPlotData) {
        console.log('[lang] Re-rendering plots with new language.');
        // It's important that clearAllCharts and displayInteractiveResults are defined,
        // which should be the case if main.js is loaded.
        clearAllCharts(); // Clear existing plots
        displayInteractiveResults(window.lastPlotData); // Re-display with new language
    }

    // 确保相位表达式下拉菜单中的选项也被翻译
    document.querySelectorAll('.phi-expr-select option').forEach(option => {
        const key = option.getAttribute('data-i18n');
        if (key && LANGS[currentLang][key]) {
            option.textContent = LANGS[currentLang][key];
        }
    });

    // 确保相位表达式的提示信息也被翻译
    document.querySelectorAll('.phi-expr-tooltip').forEach(tooltip => {
        const key = tooltip.getAttribute('data-i18n');
        if (key && LANGS[currentLang][key]) {
            tooltip.textContent = LANGS[currentLang][key];
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    applyLang(); // Apply the initial language (from localStorage or default)

    // 绑定新的语言选择下拉框事件
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        // 设置当前语言值
        langSelect.value = currentLang === 'zh' ? 'zh-CN' : 'en';
        langSelect.addEventListener('change', function() {
            const selectedLang = this.value;
            // 将下拉框的值转换为内部语言代码
            currentLang = selectedLang === 'zh-CN' ? 'zh' : 'en';
            localStorage.setItem('userLanguage', currentLang);
            localStorage.setItem('preferredLang', currentLang);
            applyLang();
            console.log('[lang] Language switched to:', currentLang);
        });
        console.log('[lang] Language select dropdown bound');
    }

    // 向后兼容：保留原有按钮事件绑定（如果存在）
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
        langBtn.addEventListener('click', function() {
            console.log('[lang] Toggle button clicked');
            switchLang(); // switchLang now saves to localStorage and calls applyLang
        });
    } else {
        console.log('[lang] lang-toggle-btn not found, using new dropdown instead');
    }
});

// 初始化语言设置
function initLanguage() {
    // ... existing code ...

    // 应用翻译到页面上
    function applyTranslation() {
        // ... existing code ...
        
        // 确保相位表达式下拉菜单中的选项也被翻译
        document.querySelectorAll('.phi-expr-select option').forEach(option => {
            const key = option.getAttribute('data-i18n');
            if (key && LANGS[currentLang][key]) {
                option.textContent = LANGS[currentLang][key];
            }
        });

        // 确保相位表达式的提示信息也被翻译
        document.querySelectorAll('.phi-expr-tooltip').forEach(tooltip => {
            const key = tooltip.getAttribute('data-i18n');
            if (key && LANGS[currentLang][key]) {
                tooltip.textContent = LANGS[currentLang][key];
            }
        });
        
        // ... existing code ...
    }

    // ... existing code ...
} 