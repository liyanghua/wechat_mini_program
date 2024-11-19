# convert_data.py
import os
import json
from pathlib import Path

class DataConverter:
    def __init__(self):
        self.data_dir = Path("data_fetcher")
        self.output_dir = Path("./data")
        self.output_file = self.output_dir / "products.json"

    def read_properties(self, file_path):
        """读取属性文件"""
        properties = {}
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if ':' in line:
                        key, value = line.split(':', 1)
                        properties[key.strip()] = value.strip()
            return properties
        except Exception as e:
            print(f"读取属性文件失败 {file_path}: {e}")
            return {}

    def read_json_file(self, file_path):
        """读取JSON文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"读取JSON文件失败 {file_path}: {e}")
            return []

    def get_image_files(self, dir_path):
        """获取目录下的图片文件"""
        if not dir_path.exists():
            return []
        return [f.name for f in dir_path.iterdir()
                if f.is_file() and f.suffix.lower() in ['.jpg', '.png', '.jpeg']]

    def match_sku_images(self, sku_list, sku_images, relative_dir):
        """匹配和更新SKU图片路径"""
        # 创建图片名称到完整路径的映射
        image_map = {
            img.lower(): f"{relative_dir}/sku_images/{img}"
            for img in sku_images
        }
        
        updated_skus = []
        for sku in sku_list:
            sku_copy = sku.copy()  # 创建副本避免修改原数据
            
            # 获取原始path
            original_path = sku_copy.get('path', '').lower()
            if original_path:
                # 尝试直接匹配
                if original_path in image_map:
                    sku_copy['path'] = image_map[original_path]
                else:
                    # 尝试部分匹配
                    matches = [
                        full_path
                        for img_name, full_path in image_map.items()
                        if original_path in img_name or img_name in original_path
                    ]
                    if matches:
                        print(f"模糊匹配SKU图片: {original_path} -> {matches[0]}")
                        sku_copy['path'] = matches[0]
                    else:
                        print(f"警告: 未找到匹配的SKU图片: {original_path}")
                        # 保持原始路径但添加完整路径
                        sku_copy['path'] = f"{relative_dir}/sku_images/{original_path}"
            
            updated_skus.append(sku_copy)
        
        return updated_skus

    def convert_product_data(self, product_dir):
        """转换单个商品数据"""
        try:
            product_id = product_dir.name.replace('data_', '')
            print(f"\n处理商品 {product_id}:")
            
            # 读取基础数据
            properties = self.read_properties(product_dir / "properties.txt")
            sku_config = self.read_json_file(product_dir / "sku_config.json")
            
            # 获取所有图片
            main_images = self.get_image_files(product_dir / "main_images")
            detail_images = self.get_image_files(product_dir / "detail_images")
            sku_images = self.get_image_files(product_dir / "sku_images")
            
            print(f"- 找到 {len(sku_images)} 个SKU图片")
            print(f"- 找到 {len(main_images)} 个主图")
            print(f"- 找到 {len(detail_images)} 个详情图")
            
            # 构建相对路径
            relative_dir = f"/data_fetcher/{product_dir.name}"
            
            # 更新SKU配置中的图片路径
            updated_skus = self.match_sku_images(sku_config, sku_images, relative_dir)
            print(f"- 更新了 {len(updated_skus)} 个SKU的图片路径")
            
            # 构建产品数据
            product_data = {
                "id": product_id,
                **properties,
                "skus": updated_skus,
                "originalImage": updated_skus[0]['path'] if updated_skus else "",
                "maskImage": f"{relative_dir}/sku_images/mask.png",
                "printArea": {
                    "x": 0.3,
                    "y": 0.2,
                    "width": 0.4,
                    "height": 0.4
                },
                "mediaInfo": {
                    "mainImages": [f"{relative_dir}/main_images/{img}" for img in main_images],
                    "detailImages": [f"{relative_dir}/detail_images/{img}" for img in detail_images],
                    "skuImages": [f"{relative_dir}/sku_images/{img}" for img in sku_images]
                }
            }
            
            print(f"商品数据转换完成: {product_id}")
            return product_data
            
        except Exception as e:
            print(f"转换商品数据失败 {product_dir.name}: {e}")
            return None

    def convert_all_data(self):
        """转换所有商品数据"""
        print("开始转换商品数据...")
        products = []
        
        # 确保输出目录存在
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # 遍历数据目录
        product_dirs = [d for d in self.data_dir.iterdir()
                       if d.is_dir() and d.name.startswith('data_')]
        
        print(f"\n找到 {len(product_dirs)} 个商品目录")
        
        # 转换每个商品数据
        for product_dir in product_dirs:
            product_data = self.convert_product_data(product_dir)
            if product_data:
                products.append(product_data)
        
        # 保存数据
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(products, f, ensure_ascii=False, indent=2)
        
        print(f"\n数据转换完成:")
        print(f"- 成功转换 {len(products)} 个商品")
        print(f"- 数据已保存到: {self.output_file}")
        
        return products

if __name__ == "__main__":
    converter = DataConverter()
    converter.convert_all_data()
