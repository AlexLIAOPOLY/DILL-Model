#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试DILL API响应格式
"""

import requests
import json

def test_dill_api():
    """测试DILL API实际响应格式"""
    
    # 测试参数
    params = {
        'angle_a': 0.405,
        'wavelength': 405,
        'V': 0.75,
        'I_avg': 30,
        't_exp': 0.6,
        'sine_type': '1d',
        'K': 15.51403779550515,
        'C': 0.022,
        'exposure_threshold': 20
    }
    
    print("🔍 调试DILL API响应格式")
    print(f"📊 请求参数: {json.dumps(params, indent=2)}")
    
    try:
        response = requests.post(
            "http://localhost:8080/api/calculate",
            json=params,
            timeout=10,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"📡 HTTP状态码: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ JSON响应解析成功")
                print(f"📋 响应数据结构:")
                
                # 打印所有顶级键
                print("  顶级键:")
                for key in data.keys():
                    print(f"    - {key}: {type(data[key])}")
                
                # 检查data字段内容
                if 'data' in data:
                    data_content = data['data']
                    print(f"\n  data字段内容:")
                    print(f"    类型: {type(data_content)}")
                    
                    if isinstance(data_content, dict):
                        print(f"    子键:")
                        for key, value in data_content.items():
                            print(f"      - {key}: {type(value)}")
                            if isinstance(value, list) and len(value) > 0:
                                print(f"        长度: {len(value)}")
                                if isinstance(value[0], (int, float)):
                                    print(f"        范围: [{min(value):.6f}, {max(value):.6f}]")
                
                # 检查常见的数据字段
                common_fields = ['x', 'y', 'thickness', 'exposure_dose', 'etch_depth']
                
                print(f"\n  顶级数据字段检查:")
                for field in common_fields:
                    if field in data:
                        value = data[field]
                        print(f"    ✅ {field}: {type(value)}")
                        if isinstance(value, list) and len(value) > 0:
                            print(f"       长度: {len(value)}, 范围: [{min(value):.6f}, {max(value):.6f}]")
                    else:
                        print(f"    ❌ {field}: 不存在")
                
                # 保存完整响应到文件
                with open('dill_api_response.json', 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f"\n💾 完整响应已保存到: dill_api_response.json")
                
                return data
                
            except json.JSONDecodeError as e:
                print(f"❌ JSON解析失败: {e}")
                print(f"📄 原始响应内容:")
                print(response.text[:1000])
                return None
        else:
            print(f"❌ HTTP请求失败")
            print(f"📄 错误响应: {response.text}")
            return None
            
    except requests.RequestException as e:
        print(f"❌ 网络请求异常: {e}")
        return None

if __name__ == "__main__":
    test_dill_api()
