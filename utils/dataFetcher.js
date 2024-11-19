// utils/dataFetcher.js

const FileSystem = wx.getFileSystemManager()

class DataFetcher {
  constructor() {
    // 源数据目录（小程序内置）
    this.sourceDir = '/data_fetcher'
    // 用户数据目录（可写）
    this.userDataDir = `${wx.env.USER_DATA_PATH}/product_data`
    console.log('数据目录:', {
      源目录: this.sourceDir,
      用户目录: this.userDataDir
    })
  }

  /**
   * 复制文件
   */
  async copyFile(srcPath, destPath) {
    return new Promise((resolve, reject) => {
      console.log('复制文件:', {
        源文件: srcPath,
        目标文件: destPath
      })
      
      FileSystem.copyFile({
        srcPath,
        destPath,
        success: () => {
          console.log('文件复制成功')
          resolve()
        },
        fail: (error) => {
          console.error('文件复制失败:', error)
          reject(error)
        }
      })
    })
  }

  /**
   * 创建目录
   */
  async makeDir(dirPath) {
    return new Promise((resolve, reject) => {
      FileSystem.mkdir({
        dirPath,
        recursive: true,
        success: () => {
          console.log('创建目录成功:', dirPath)
          resolve()
        },
        fail: (error) => {
          if (error.errMsg.includes('file already exists')) {
            resolve() // 目录已存在，视为成功
          } else {
            console.error('创建目录失败:', error)
            reject(error)
          }
        }
      })
    })
  }

  /**
   * 复制目录及其内容
   */
  async copyDirectory(srcDir, destDir) {
    try {
      console.log('开始复制目录:', {
        源目录: srcDir,
        目标目录: destDir
      })

      // 创建目标目录
      await this.makeDir(destDir)

      // 读取源目录内容
      const files = await new Promise((resolve, reject) => {
        FileSystem.readdir({
          dirPath: srcDir,
          success: res => resolve(res),
          fail: reject
        })
      })

      console.log('源目录文件列表:', files)

      // 复制每个文件/目录
      for (let file of files) {
        const srcPath = `${srcDir}/${file}`
        const destPath = `${destDir}/${file}`

        try {
          // 尝试作为目录读取
          await new Promise((resolve, reject) => {
            FileSystem.readdir({
              dirPath: srcPath,
              success: async () => {
                // 是目录，递归复制
                await this.copyDirectory(srcPath, destPath)
                resolve()
              },
              fail: async () => {
                // 是文件，直接复制
                await this.copyFile(srcPath, destPath)
                resolve()
              }
            })
          })
        } catch (error) {
          console.error('处理文件失败:', error)
          throw error
        }
      }

      console.log('目录复制完成:', destDir)
    } catch (error) {
      console.error('复制目录失败:', error)
      throw error
    }
  }

  /**
   * 初始化用户数据目录
   */
  async initUserDataDir() {
    try {
      console.log('开始初始化用户数据目录')

      // 创建用户数据主目录
      await this.makeDir(this.userDataDir)

      // 复制示例数据
      const sourceProductDir = `${this.sourceDir}/data_646798296318`
      const destProductDir = `${this.userDataDir}/data_646798296318`

      await this.copyDirectory(sourceProductDir, destProductDir)

      console.log('用户数据目录初始化完成')
      return true
    } catch (error) {
      console.error('初始化用户数据目录失败:', error)
      return false
    }
  }

  /**
   * 获取商品列表
   */
  async getProductList() {
    try {
      // 确保数据已复制到用户目录
      await this.initUserDataDir()
      
      // 读取用户目录中的商品列表
      const files = await new Promise((resolve, reject) => {
        FileSystem.readdir({
          dirPath: this.userDataDir,
          success: res => resolve(res),
          fail: error => {
            console.error('读取目录失败:', error)
            resolve([])
          }
        })
      })

      console.log('读取到的文件列表:', files)

      // 过滤出商品目录
      const productIds = []
      for (let file of files) {
        if (file.startsWith('data_')) {
          productIds.push(file.substring(5))
        }
      }

      console.log('商品ID列表:', productIds)
      return productIds

    } catch (error) {
      console.error('获取商品列表失败:', error)
      return []
    }
  }

  /**
   * 读取文件
   */
  async readFile(path) {
    return new Promise((resolve, reject) => {
      FileSystem.readFile({
        filePath: path,
        encoding: 'utf-8',
        success: res => resolve(res.data),
        fail: reject
      })
    })
  }

  /**
   * 读取商品属性
   */
  async readProperties(productDir) {
    try {
      const content = await this.readFile(`${productDir}/Properties.txt`)
      const properties = {}
      
      const lines = content.split('\n')
      for (let line of lines) {
        const colonIndex = line.indexOf(':')
        if (colonIndex > -1) {
          const key = line.substring(0, colonIndex).trim()
          const value = line.substring(colonIndex + 1).trim()
          if (key && value) {
            properties[key] = value
          }
        }
      }

      return properties
    } catch (error) {
      console.error('读取属性文件失败:', error)
      return {}
    }
  }

  /**
   * 读取SKU配置
   */
  async readSkuJson(productDir) {
    try {
      const content = await this.readFile(`${productDir}/sku_config.json`)
      return JSON.parse(content)
    } catch (error) {
      console.error('读取SKU配置失败:', error)
      return []
    }
  }

  /**
   * 获取商品数据
   */
  async fetchProductData(productId) {
    try {
      const productDir = `${this.userDataDir}/data_${productId}`
      console.log('读取商品数据:', productDir)

      const [properties, skuData] = await Promise.all([
        this.readProperties(productDir),
        this.readSkuJson(productDir)
      ])

      const productData = {
        id: productId,
        ...properties,
        skus: skuData,
        originalImage: `${productDir}/sku_images/${skuData[0]?.path}`,
        maskImage: `${productDir}/sku_images/mask.png`,
        printArea: {
          x: 0.3,
          y: 0.2,
          width: 0.4,
          height: 0.4
        }
      }

      console.log('商品数据:', productData)
      return productData

    } catch (error) {
      console.error('读取商品数据失败:', error)
      throw error
    }
  }
}

export default new DataFetcher()