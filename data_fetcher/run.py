from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
import json
import time
import logging

class SKUPriceScraper:
    def __init__(self, debug=True, wait_time=1):
        self.wait_time = wait_time  # 等待价格更新的时间
        
        # 配置日志
        logging.basicConfig(
            level=logging.DEBUG if debug else logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
        try:
            # 配置Chrome选项
            chrome_options = Options()
            chrome_options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
            
            # 连接到Chrome
            self.driver = webdriver.Chrome(options=chrome_options)
            self.wait = WebDriverWait(self.driver, 10)
            self.logger.info(f"Chrome连接成功，当前页面: {self.driver.title}")
            
        except Exception as e:
            self.logger.error(f"初始化失败: {str(e)}")
            raise

    def wait_for_price_update(self, price_selector, old_price):
        """等待价格更新"""
        max_attempts = 10
        attempt = 0
        while attempt < max_attempts:
            try:
                price_element = self.driver.find_element(By.CSS_SELECTOR, price_selector)
                new_price = price_element.text.strip()
                # 如果价格发生变化或者是第一次获取价格
                if old_price is None or new_price != old_price:
                    return new_price
            except:
                pass
            time.sleep(0.5)
            attempt += 1
        return None

    def get_initial_price(self, price_selector):
        """获取初始价格"""
        try:
            price_element = self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, price_selector))
            )
            return price_element.text.strip()
        except:
            return None

    def scrape_prices(self, sku_selector, price_selector):
        """抓取所有SKU对应的价格"""
        try:
            # 获取所有SKU元素
            self.logger.info("查找SKU元素...")
            sku_elements = self.wait.until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, sku_selector))
            )
            self.logger.info(f"找到 {len(sku_elements)} 个SKU元素")
            
            # 获取初始价格
            initial_price = self.get_initial_price(price_selector)
            self.logger.info(f"初始价格: {initial_price}")
            
            results = []
            last_price = initial_price
            
            # 遍历每个SKU
            for index, sku in enumerate(sku_elements, 1):
                try:
                    # 获取SKU文本
                    sku_text = sku.text.strip()
                    self.logger.debug(f"处理 SKU {index}/{len(sku_elements)}: {sku_text}")
                    
                    # 滚动到SKU元素位置
                    self.driver.execute_script("arguments[0].scrollIntoView(true);", sku)
                    time.sleep(0.5)
                    
                    # 点击前检查元素状态
                    if not sku.is_displayed() or not sku.is_enabled():
                        self.logger.warning(f"SKU元素不可点击: {sku_text}")
                        continue
                    
                    # 点击SKU
                    sku.click()
                    self.logger.debug(f"已点击SKU: {sku_text}")
                    
                    # 等待价格更新
                    new_price = self.wait_for_price_update(price_selector, last_price)
                    
                    if new_price:
                        self.logger.info(f"SKU: {sku_text}, 价格: {new_price}")
                        results.append({
                            'sku': sku_text,
                            'price': new_price,
                            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
                        })
                        last_price = new_price
                    else:
                        self.logger.warning(f"SKU {sku_text} 价格未更新")
                    
                    # 等待一段时间确保页面稳定
                    time.sleep(self.wait_time)
                    
                except Exception as e:
                    self.logger.error(f"处理SKU {sku_text} 时出错: {str(e)}")
                    continue
            
            return results
            
        except Exception as e:
            self.logger.error(f"抓取过程出错: {str(e)}")
            return []

    def test_selectors(self, sku_selector, price_selector):
        """测试选择器并进行价格变化验证"""
        try:
            # 测试SKU选择器
            sku_elements = self.driver.find_elements(By.CSS_SELECTOR, sku_selector)
            if not sku_elements:
                print("未找到SKU元素")
                return False
            
            print(f"\n找到 {len(sku_elements)} 个SKU元素")
            print("前3个SKU示例:")
            for i, elem in enumerate(sku_elements[:3], 1):
                print(f"  {i}. {elem.text.strip()}")
            
            # 测试价格选择器
            initial_price = self.get_initial_price(price_selector)
            if not initial_price:
                print("未找到价格元素")
                return False
            
            print(f"\n初始价格: {initial_price}")
            
            # 测试价格变化
            print("\n测试价格动态更新...")
            if len(sku_elements) > 1:
                sku_elements[1].click()
                time.sleep(1)
                new_price = self.wait_for_price_update(price_selector, initial_price)
                if new_price and new_price != initial_price:
                    print(f"价格已更新: {new_price}")
                    # 点回第一个SKU
                    sku_elements[0].click()
                    return True
                else:
                    print("警告: 点击SKU后价格未发生变化")
                    return False
            
            return True
            
        except Exception as e:
            print(f"\n选择器测试失败: {str(e)}")
            return False

    def quit(self):
        """断开连接"""
        try:
            self.driver.quit()
            self.logger.info("已断开与Chrome的连接")
        except:
            pass

if __name__ == "__main__":
    try:
        # 初始化抓取器
        scraper = SKUPriceScraper(debug=True, wait_time=1)
        
        # 获取选择器
        print("\n请输入选择器（按Ctrl+C可随时退出）:")
        sku_selector = input("SKU选择器: ").strip()
        price_selector = input("价格选择器: ").strip()
        
        # 测试选择器
        print("\n测试选择器...")
        if scraper.test_selectors(sku_selector, price_selector):
            proceed = input("\n选择器测试通过！是否开始抓取？(y/n): ").strip().lower()
            if proceed == 'y':
                print("\n开始抓取数据...")
                results = scraper.scrape_prices(sku_selector, price_selector)
                
                if results:
                    # 保存结果
                    filename = f'sku_prices_{time.strftime("%Y%m%d_%H%M%S")}.json'
                    with open(filename, 'w', encoding='utf-8') as f:
                        json.dump(results, f, ensure_ascii=False, indent=2)
                    print(f"\n结果已保存到 {filename}")
                    print(f"共抓取到 {len(results)} 个SKU的价格")
                    
                    # 打印结果摘要
                    print("\n价格摘要:")
                    for item in results:
                        print(f"SKU: {item['sku']:<20} 价格: {item['price']}")
                else:
                    print("未抓取到数据")
        else:
            print("选择器测试失败，请检查选择器是否正确")
            
    except KeyboardInterrupt:
        print("\n\n操作已取消")
    except Exception as e:
        print(f"程序执行出错: {str(e)}")
    finally:
        if 'scraper' in locals():
            scraper.quit()
