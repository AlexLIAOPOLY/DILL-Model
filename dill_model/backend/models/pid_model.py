"""
PID控制模型 - 与LabVIEW系统的数据交换接口
实现PID参数的读取、写入和系统监控功能
"""

import os
import time
import struct
import json
import glob
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
import base64
from PIL import Image, ImageDraw, ImageFont
import io


class PIDModel:
    """PID控制模型，处理与LabVIEW的数据交换"""
    
    def __init__(self, labview_data_path=None):
        """初始化PID模型
        
        Args:
            labview_data_path: LabVIEW数据文件路径，如果为None则使用模拟路径
        """
        # 设置LabVIEW数据路径（模拟或真实）
        if labview_data_path:
            self.labview_path = Path(labview_data_path)
        else:
            # 使用模拟路径
            current_dir = Path(__file__).parent.parent.parent
            self.labview_path = current_dir / 'labview_simulation'
            
        # 确保路径存在
        self.labview_path.mkdir(exist_ok=True)
        
        # 文件路径
        self.pid_file = self.labview_path / 'PIDPara.dat'
        self.data_folder = self.labview_path / 'Output'
        self.image_folder = self.labview_path / 'Output'
        
        # 确保输出文件夹存在
        self.data_folder.mkdir(exist_ok=True)
        self.image_folder.mkdir(exist_ok=True)
        
        # 默认PID参数
        self.default_pid = {'p': 1.0, 'i': 0.1, 'd': 0.01}
        
        # 初始化模拟环境
        self._initialize_simulation()
    
    def _initialize_simulation(self):
        """初始化模拟环境"""
        # 创建初始PID参数文件
        if not self.pid_file.exists():
            self.write_pid_parameters(self.default_pid)
        
        # 只在Output文件夹为空时创建初始模拟文件
        # 避免每次启动都生成新文件
        existing_data_files = list(self.data_folder.glob('Data_*.csv'))
        existing_image_files = list(self.image_folder.glob('img_*.png'))
        
        if not existing_data_files:
            # 创建模拟数据文件
            self._create_simulation_data()
        
        if not existing_image_files:
            # 创建模拟图像
            self._create_simulation_image()
    
    def read_pid_parameters(self):
        """从文件读取PID参数
        
        Returns:
            dict: 包含p, i, d参数的字典
        """
        try:
            if self.pid_file.exists():
                # 尝试读取二进制格式（LabVIEW格式）
                try:
                    return self._read_binary_pid()
                except:
                    # 如果失败，尝试读取文本格式
                    return self._read_text_pid()
            else:
                # 文件不存在，返回默认值
                return self.default_pid.copy()
        except Exception as e:
            print(f"读取PID参数失败: {e}")
            return self.default_pid.copy()
    
    def _read_binary_pid(self):
        """读取二进制格式的PID参数"""
        with open(self.pid_file, 'rb') as f:
            data = f.read()
            
        # 假设PID参数以3个double值存储（8字节each）
        if len(data) >= 24:  # 3 * 8 bytes
            p, i, d = struct.unpack('<ddd', data[:24])  # 小端序
            return {'p': p, 'i': i, 'd': d}
        else:
            raise ValueError("文件格式不正确")
    
    def _read_text_pid(self):
        """读取文本格式的PID参数"""
        with open(self.pid_file, 'r') as f:
            content = f.read().strip()
            
        # 尝试JSON格式
        try:
            data = json.loads(content)
            return {'p': float(data['p']), 'i': float(data['i']), 'd': float(data['d'])}
        except:
            # 尝试简单的文本格式 "p,i,d"
            values = content.split(',')
            if len(values) >= 3:
                return {'p': float(values[0]), 'i': float(values[1]), 'd': float(values[2])}
            else:
                raise ValueError("文件格式不正确")
    
    def write_pid_parameters(self, parameters):
        """写入PID参数到文件
        
        Args:
            parameters: dict, 包含p, i, d的参数字典
        """
        try:
            # 验证参数
            p = float(parameters.get('p', 1.0))
            i = float(parameters.get('i', 0.1))
            d = float(parameters.get('d', 0.01))
            
            # 写入JSON格式（便于调试）
            data = {
                'p': p,
                'i': i,
                'd': d,
                'timestamp': datetime.now().isoformat()
            }
            
            with open(self.pid_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            return True
        except Exception as e:
            print(f"写入PID参数失败: {e}")
            return False
    
    def get_latest_data(self):
        """获取最新的系统数据
        
        Returns:
            dict: 系统数据，包括设定值、当前值、误差、输出
        """
        try:
            # 查找最新的CSV文件
            csv_files = list(self.data_folder.glob('Data_*.csv'))
            if not csv_files:
                return self._generate_simulation_data()
            
            # 按修改时间排序，获取最新文件
            latest_file = max(csv_files, key=lambda f: f.stat().st_mtime)
            
            # 读取CSV数据
            df = pd.read_csv(latest_file)
            
            # 获取最后一行数据
            if len(df) > 0:
                last_row = df.iloc[-1]
                return {
                    'setpoint': float(last_row.get('Setpoint', 0)),
                    'current': float(last_row.get('Current', 0)),
                    'error': float(last_row.get('Error', 0)),
                    'output': float(last_row.get('Output', 0)),
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return self._generate_simulation_data()
                
        except Exception as e:
            print(f"读取数据失败: {e}")
            return self._generate_simulation_data()
    
    def _generate_simulation_data(self):
        """生成模拟的系统数据"""
        # 读取当前PID参数
        pid = self.read_pid_parameters()
        
        # 模拟一个简单的控制系统
        setpoint = 50.0
        noise = np.random.normal(0, 0.5)
        current = setpoint + noise + np.sin(time.time() * 0.1) * 2
        error = setpoint - current
        output = pid['p'] * error + noise * 0.1
        
        return {
            'setpoint': round(setpoint, 2),
            'current': round(current, 2),
            'error': round(error, 2),
            'output': round(output, 2),
            'timestamp': datetime.now().isoformat()
        }
    
    def get_latest_image(self):
        """获取最新的图像数据
        
        Returns:
            dict: 图像数据，包含base64编码的图像和元数据
        """
        try:
            # 查找最新的图像文件
            image_files = list(self.image_folder.glob('img_*.bmp'))
            image_files.extend(list(self.image_folder.glob('img_*.png')))
            
            if not image_files:
                return self._generate_simulation_image()
            
            # 按修改时间排序，获取最新文件
            latest_file = max(image_files, key=lambda f: f.stat().st_mtime)
            
            # 读取图像并转换为base64
            with open(latest_file, 'rb') as f:
                image_data = f.read()
            
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            return {
                'image_base64': image_base64,
                'filename': latest_file.name,
                'size': f"{len(image_data)} bytes",
                'timestamp': datetime.fromtimestamp(latest_file.stat().st_mtime).isoformat()
            }
            
        except Exception as e:
            print(f"读取图像失败: {e}")
            return self._generate_simulation_image()
    
    def _generate_simulation_image(self):
        """生成模拟的系统图像"""
        # 创建一个简单的模拟图像
        img = Image.new('RGB', (400, 300), color='white')
        draw = ImageDraw.Draw(img)
        
        # 绘制模拟的系统响应曲线
        system_data = self.get_latest_data()
        
        # 绘制背景网格
        for i in range(0, 400, 40):
            draw.line([(i, 0), (i, 300)], fill='lightgray', width=1)
        for i in range(0, 300, 30):
            draw.line([(0, i), (400, i)], fill='lightgray', width=1)
        
        # 绘制模拟波形
        points = []
        for x in range(0, 400, 5):
            t = x / 400.0 * 10  # 10秒时间窗口
            y = 150 + 50 * np.sin(t + time.time() * 0.5) + np.random.normal(0, 5)
            y = max(50, min(250, y))  # 限制在图像范围内
            points.append((x, int(y)))
        
        # 绘制曲线
        if len(points) > 1:
            draw.line(points, fill='blue', width=2)
        
        # 添加文字信息
        try:
            # 尝试使用系统字体
            font = ImageFont.load_default()
        except:
            font = None
        
        # 显示当前数据
        info_text = [
            f"Setpoint: {system_data['setpoint']:.2f}",
            f"Current: {system_data['current']:.2f}",
            f"Error: {system_data['error']:.2f}",
            f"Output: {system_data['output']:.2f}",
            f"Time: {datetime.now().strftime('%H:%M:%S')}"
        ]
        
        y_offset = 10
        for text in info_text:
            draw.text((10, y_offset), text, fill='black', font=font)
            y_offset += 20
        
        # 转换为base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return {
            'image_base64': image_base64,
            'filename': 'simulation.png',
            'size': f"{len(buffer.getvalue())} bytes",
            'timestamp': datetime.now().isoformat()
        }
    
    def _create_simulation_data(self):
        """创建模拟数据文件"""
        # 生成一个模拟的CSV数据文件
        timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
        filename = self.data_folder / f"Data_{timestamp}.csv"
        
        # 生成模拟数据
        time_points = np.linspace(0, 10, 100)  # 10秒，100个数据点
        setpoint = 50.0
        
        data = {
            'Time': time_points,
            'Setpoint': [setpoint] * len(time_points),
            'Current': setpoint + np.sin(time_points) * 5 + np.random.normal(0, 1, len(time_points)),
            'Error': [],
            'Output': []
        }
        
        # 计算误差和输出
        for i, current in enumerate(data['Current']):
            error = setpoint - current
            output = 1.0 * error + 0.1 * sum(data['Current'][:i+1]) * 0.01  # 简单PID
            data['Error'].append(error)
            data['Output'].append(output)
        
        # 保存到CSV
        df = pd.DataFrame(data)
        df.to_csv(filename, index=False)
    
    def _create_simulation_image(self):
        """创建模拟图像文件"""
        image_data = self._generate_simulation_image()
        
        # 保存到文件
        timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
        filename = self.image_folder / f"img_{timestamp}.png"
        
        # 解码base64并保存
        image_bytes = base64.b64decode(image_data['image_base64'])
        with open(filename, 'wb') as f:
            f.write(image_bytes)
    
    def check_connection_status(self):
        """检查与LabVIEW的连接状态
        
        Returns:
            dict: 连接状态信息
        """
        pid_exists = self.pid_file.exists()
        data_files = len(list(self.data_folder.glob('Data_*.csv')))
        image_files = len(list(self.image_folder.glob('img_*.*')))
        
        # 检查最后更新时间
        last_update = None
        if pid_exists:
            last_update = datetime.fromtimestamp(self.pid_file.stat().st_mtime).isoformat()
        
        return {
            'file_exists': pid_exists,
            'data_files_count': data_files,
            'image_files_count': image_files,
            'last_update': last_update,
            'labview_path': str(self.labview_path),
            'status': 'connected' if pid_exists else 'disconnected'
        }
    
    def save_parameters_backup(self, parameters, name=None):
        """保存PID参数的备份
        
        Args:
            parameters: dict, PID参数
            name: str, 备份名称，如果为None则使用时间戳
        """
        try:
            backup_folder = self.labview_path / 'backups'
            backup_folder.mkdir(exist_ok=True)
            
            if name is None:
                name = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            backup_file = backup_folder / f"pid_backup_{name}.json"
            
            backup_data = {
                'parameters': parameters,
                'timestamp': datetime.now().isoformat(),
                'name': name
            }
            
            with open(backup_file, 'w') as f:
                json.dump(backup_data, f, indent=2)
            
            return True
        except Exception as e:
            print(f"保存参数备份失败: {e}")
            return False
    
    def get_parameter_history(self):
        """获取参数变更历史
        
        Returns:
            list: 参数变更历史列表
        """
        try:
            backup_folder = self.labview_path / 'backups'
            if not backup_folder.exists():
                return []
            
            backup_files = list(backup_folder.glob('pid_backup_*.json'))
            history = []
            
            for file in backup_files:
                try:
                    with open(file, 'r') as f:
                        data = json.load(f)
                    history.append(data)
                except:
                    continue
            
            # 按时间排序
            history.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            return history[:20]  # 返回最近20条记录
            
        except Exception as e:
            print(f"获取参数历史失败: {e}")
            return []
