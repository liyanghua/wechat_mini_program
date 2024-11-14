from psd_tools import PSDImage
import os
from PIL import Image
import json
from datetime import datetime
import numpy as np

def export_raw_layer(layer, output_path):
    """
    导出图层的原始内容，不包含混合效果
    """
    try:
        print(f"\n导出图层: {layer.name}")
        print(f"图层类型: {layer.kind}")
        print(f"混合模式: {layer.blend_mode}")
        print(f"尺寸: {layer.width} x {layer.height}")
        print(f"位置: 左={layer.left}, 上={layer.top}")

        # 获取图层的原始像素数据
        if hasattr(layer, 'topil') and callable(layer.topil):
            image = layer.topil()
        elif hasattr(layer, 'pixels') and layer.pixels is not None:
            # 如果有pixels属性，直接使用
            pixels = layer.pixels
            if pixels.shape[2] == 3:  # RGB
                image = Image.fromarray(pixels, 'RGB')
            elif pixels.shape[2] == 4:  # RGBA
                image = Image.fromarray(pixels, 'RGBA')
            else:
                image = Image.fromarray(pixels)
        else:
            # 如果上述方法都不可用，尝试使用composite
            image = layer.composite()

        if image:
            # 确保目录存在
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            # 保存图像
            image.save(output_path, 'PNG')
            print(f"成功保存到: {output_path}")
            return True
    except Exception as e:
        print(f"导出图层失败: {str(e)}")
        return False

def analyze_psd(psd_path, output_dir):
    """分析PSD文件并导出图层"""
    print(f"\n开始分析PSD文件: {psd_path}")
    
    try:
        psd = PSDImage.open(psd_path)
        print(f"PSD尺寸: {psd.width} x {psd.height}")
        
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        
        # 遍历顶层组/图层
        for group_index, group in enumerate(psd, 1):
            print(f"\n处理组 {group_index}: {group.name}")
            
            # 获取组内图层
            layers = getattr(group, '_layers', [])
            if not layers:
                print(f"组 {group.name} 没有图层")
                continue
                
            # 创建组目录
            group_dir = os.path.join(output_dir, f"group_{group_index:03d}_{group.name}")
            os.makedirs(group_dir, exist_ok=True)
            
            # 导出组的合成效果
            group_composite = group.composite()
            if group_composite:
                group_composite.save(os.path.join(group_dir, "group_composite.png"))
            
            # 打印组内所有图层信息
            print("\n组内图层列表:")
            for i, layer in enumerate(layers):
                print(f"\n图层 {i+1}:")
                print(f"  名称: {layer.name}")
                print(f"  类型: {layer.kind}")
                print(f"  混合模式: {layer.blend_mode}")
                print(f"  尺寸: {layer.width} x {layer.height}")
                print(f"  位置: 左={layer.left}, 上={layer.top}")
                
            # 分别导出素材和蒙版
            material_layer = None
            mask_layer = None
            original_layer = None
            
            # 识别图层（从下到上）
            for layer in reversed(layers):
                if '原图' in layer.name:
                    original_layer = layer
                elif '蒙版' in layer.name:
                    mask_layer = layer
                elif '素材' in layer.name:
                    material_layer = layer
            
            # 导出原始图层
            if material_layer:
                export_raw_layer(material_layer,
                    os.path.join(group_dir, "1_material_raw.png"))
            
            if mask_layer:
                export_raw_layer(mask_layer,
                    os.path.join(group_dir, "2_mask_raw.png"))
                
            if original_layer:
                export_raw_layer(original_layer,
                    os.path.join(group_dir, "3_original_raw.png"))
            
            # 导出混合效果
            if material_layer and mask_layer:
                try:
                    # 导出素材的完整效果（包含位置信息）
                    material_full = material_layer.composite()
                    if material_full:
                        material_full.save(os.path.join(group_dir, "4_material_composite.png"))
                    
                    # 导出蒙版的完整效果
                    mask_full = mask_layer.composite()
                    if mask_full:
                        mask_full.save(os.path.join(group_dir, "5_mask_composite.png"))
                        
                    # 导出完整混合效果
                    if material_full and mask_full:
                        print("\n处理混合效果:")
                        print(f"素材尺寸: {material_full.size}")
                        print(f"蒙版尺寸: {mask_full.size}")
                        print(f"素材位置: ({material_layer.left}, {material_layer.top})")
                        print(f"蒙版位置: ({mask_layer.left}, {mask_layer.top})")
                        
                except Exception as e:
                    print(f"处理混合效果时出错: {str(e)}")
            
            # 保存图层信息
            info = {
                'group_name': group.name,
                'group_index': group_index,
                'material': {
                    'name': material_layer.name if material_layer else None,
                    'blend_mode': str(material_layer.blend_mode) if material_layer else None,
                    'dimensions': {
                        'width': material_layer.width if material_layer else None,
                        'height': material_layer.height if material_layer else None,
                        'left': material_layer.left if material_layer else None,
                        'top': material_layer.top if material_layer else None
                    }
                } if material_layer else None,
                'mask': {
                    'name': mask_layer.name if mask_layer else None,
                    'blend_mode': str(mask_layer.blend_mode) if mask_layer else None,
                    'dimensions': {
                        'width': mask_layer.width if mask_layer else None,
                        'height': mask_layer.height if mask_layer else None,
                        'left': mask_layer.left if mask_layer else None,
                        'top': mask_layer.top if mask_layer else None
                    }
                } if mask_layer else None
            }
            
            # 保存信息到JSON
            with open(os.path.join(group_dir, 'info.json'), 'w', encoding='utf-8') as f:
                json.dump(info, f, ensure_ascii=False, indent=2)
        
        print("\n处理完成!")
        
    except Exception as e:
        print(f"处理过程出错: {str(e)}")
        import traceback
        print(traceback.format_exc())

def main():
    psd_path = "test.psd"  # 替换为您的PSD文件路径
    output_dir = "psd_analysis"
    
    try:
        analyze_psd(psd_path, output_dir)
    except Exception as e:
        print(f"程序执行出错: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    main()
