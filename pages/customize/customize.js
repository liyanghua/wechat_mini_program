// pages/customize/customize.js
Page({
  data: {
    product: null,
    canvasWidth: 0,
    minPrice: 0,
    propertyList: [],
    canvasHeight: 0,
    showSkuSelector: false,
    selectedSkuIndex: null,
    selectedSku: null,
    mainImage: '', // 当前显示的主图
    currentPrice: 0, // 当前选中的价格
    debugText: '页面开始加载',
    imageInfo: null,      // 原图信息
    uploadedImageInfo: null, // 用户上传图片信息
    canvasReady: false,
    previewImage: '',     // 原图预览
    uploadedImage: '',    // 用户上传图片预览
    loading: false,
    debugImages: {
      tiledImage: '',
      maskedImage: '',
      originalBase: '',
      finalResult: ''
    },
    printAreaConfig: null,  // 存储打印区域的配置
    scaleOptions: {
      enabled: true,       // 是否启用智能缩放
      maxScaleRatio: 0.1,    // 最大缩放比例阈值
      debugEnabled: true   // 是否显示调试信息
    },
    blendOptions: {
      mode: 'normal',  // 'normal' | 'multiply'
      opacity: 0.95    // 默认透明度
    }
  },

// 计算填充参数
  calculateFillParameters(imageWidth, imageHeight, maskWidth, maskHeight) {
    console.log('计算填充参数:', {
      图片尺寸: { width: imageWidth, height: imageHeight },
      蒙版尺寸: { width: maskWidth, height: maskHeight }
    })

    // 计算两个方向的缩放比例
    const scaleX = maskWidth / imageWidth
    const scaleY = maskHeight / imageHeight

    // 选择较大的缩放比例，确保完全覆盖
    const scale = Math.max(scaleX, scaleY)
    
    // 计算缩放后的尺寸
    const scaledWidth = imageWidth * scale
    const scaledHeight = imageHeight * scale

    console.log("缩放后的尺寸：", scaledWidth, scaledHeight);

    // 计算居中位置
    const x = (maskWidth - scaledWidth) / 2
    const y = (maskHeight - scaledHeight) / 2

    const result = {
      scale,
      width: scaledWidth,
      height: scaledHeight,
      x,
      y,
      originalRatio: imageWidth / imageHeight,
      maskRatio: maskWidth / maskHeight
    }

    console.log('填充参数计算结果:', result)
    return result
  },

// 获取蒙版图片的打印区域（白色区域）
async analyzePrintArea(maskImage) {
  try {
    console.log('开始分析打印区域')
    const tempCanvas = wx.createOffscreenCanvas({
      type: '2d',
      width: this.data.canvasWidth,
      height: this.data.canvasHeight
    })
    const tempCtx = tempCanvas.getContext('2d')

    // 绘制蒙版图片
    tempCtx.drawImage(maskImage, 0, 0, this.data.canvasWidth, this.data.canvasHeight)
    
    // 获取图片数据
    const imageData = tempCtx.getImageData(0, 0, this.data.canvasWidth, this.data.canvasHeight)
    const data = imageData.data

    // 分析白色区域的边界
    let minX = this.data.canvasWidth
    let minY = this.data.canvasHeight
    let maxX = 0
    let maxY = 0
    let hasWhitePixel = false

    // 遍历像素查找白色区域
    for (let y = 0; y < this.data.canvasHeight; y++) {
      for (let x = 0; x < this.data.canvasWidth; x++) {
        const idx = (y * this.data.canvasWidth + x) * 4
        // 检查是否为白色像素 (R=255, G=255, B=255)
        if (data[idx] > 250 && data[idx + 1] > 250 && data[idx + 2] > 250) {
          hasWhitePixel = true
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    if (!hasWhitePixel) {
      throw new Error('未检测到打印区域')
    }

    // 计算打印区域的尺寸
    const printArea = {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    }

    console.log('打印区域分析结果:', printArea)
    return printArea

  } catch (error) {
    console.error('分析打印区域失败:', error)
    throw error
  }
},

// 计算图片在打印区域内的适应尺寸
calculatePrintAreaFit(imgWidth, imgHeight, printArea) {
  const imageRatio = imgWidth / imgHeight
  const printAreaRatio = printArea.width / printArea.height
  
  let scale, drawWidth, drawHeight, drawX, drawY
  console.log("图片宽度：", imgWidth)
  console.log("打印宽度：", printArea.width)
  console.log("图片高度：", imgHeight)
  console.log("打印高度", printArea.height)
  console.log("imageRatio：", imageRatio)
  console.log("printAreaRatio:", printAreaRatio)

  if (imageRatio > printAreaRatio) {
    // 图片较宽，以打印区域宽度为准
   
    drawWidth = printArea.width
    drawHeight = drawWidth / imageRatio
    drawX = printArea.x
    drawY = printArea.y + (printArea.height - drawHeight) / 2
    scale = printArea.width / imgWidth
  } else {
    // 图片较高，以打印区域高度为准
    drawHeight = printArea.height
    drawWidth = drawHeight * imageRatio
    drawX = printArea.x + (printArea.width - drawWidth) / 2
    drawY = printArea.y
    console.log("调整绘制坐标（x,y)", drawX,drawY);
    scale = printArea.height / imgHeight
  }

  // 计算缩放比例
  const scaleRatio = Math.max(imgWidth / drawWidth, imgHeight / drawHeight)

  return {
    drawX,
    drawY,
    drawWidth,
    drawHeight,
    scale,
    scaleRatio
  }
},

  onLoad(options) {
    console.log('====== onLoad开始 ======')
    this.setData({
      debugText: 'onLoad开始执行'
    })

    if (!options || !options.productInfo) {
      console.error('缺少商品信息参数')
      this.setData({
        debugText: '错误：缺少商品信息参数'
      })
      return
    }

    try {
      // 解析商品信息
      const product = JSON.parse(decodeURIComponent(options.productInfo))
      console.log('商品信息:', product)
      // 处理价格
      const minPrice = product.price
      
      // 处理属性列表
      const propertyList = this.formatProperties(product)
       // 处理并排序详情图片
       const detailImages = this.sortDetailImages(product.mediaInfo?.detailImages || [])
      // 获取系统信息
      const systemInfo = wx.getSystemInfoSync()
      const canvasWidth = systemInfo.windowWidth
      
      this.setData({
        product,
        canvasWidth,
        minPrice,
        propertyList,
        detailImages,
        mainImage: product.originalImage,
        currentPrice: minPrice,
        debugText: '基础信息设置完成'
      })

      // 初始化Canvas并加载原图
      this.initCanvasAndImage()

    } catch (error) {
      console.error('初始化错误:', error)
      this.setData({
        debugText: '错误：' + error.message
      })
    }
  },
// 排序详情图片
sortDetailImages(images) {
  return images.sort((a, b) => {
    // 从路径中提取文件名
    const fileNameA = a.split('/').pop()
    const fileNameB = b.split('/').pop()
    
    // 提取数字
    const numA = this.extractNumber(fileNameA)
    const numB = this.extractNumber(fileNameB)
  

    // 如果都有数字，按数字排序
    if (numA !== null && numB !== null) {
      return numA - numB
    }
    
    // 如果只有一个有数字，有数字的排前面
    if (numA !== null) return -1
    if (numB !== null) return 1
    
    // 都没有数字，按文件名排序
    return fileNameA.localeCompare(fileNameB)
  })
},

// 从文件名中提取数字
extractNumber(fileName) {
  // 匹配文件名中的数字
  // 支持以下格式：
  // - detail1.jpg
  // - detail_1.jpg
  // - detail-1.jpg
  // - 1.jpg
  const match = fileName.match(/\d+/)
  return match ? parseInt(match[0]) : null
},
  // 格式化商品属性
  formatProperties(product) {
    // 需要排除的属性（已经单独展示的）
    const excludeKeys = ['id', 'title', 'shipping', 'sales', 'skus', 'originalImage', 'maskImage', 'printArea', 'mediaInfo']
    
    const propertyList = []
    
    // 属性标签映射
    const labelMap = {
      'material': '材质',
      'size': '尺码',
      'shape': '颜色',
      'style': '款式',
      // 可以添加更多映射
    }

    for (const [key, value] of Object.entries(product.properties)) {
      if (!excludeKeys.includes(key) && 
          typeof value === 'string' && 
          value.trim() && 
          !key.startsWith('_')) {
        propertyList.push({
          key,
          label: labelMap[key] || key,
          value: value.trim()
        })
      }
    }

    return propertyList
  },


  // 初始化Canvas并加载原图
  async initCanvasAndImage() {
    try {
      this.setData({ debugText: '开始初始化Canvas和加载图片' })
      
      // 1. 先获取图片信息
      const imageInfo = await this.getImageInfo(this.data.product.originalImage)
      console.log('原图信息:', imageInfo)

      // 2. 计算画布高度（保持图片比例）
      const scale = this.data.canvasWidth / imageInfo.width
      const canvasHeight = imageInfo.height * scale

      this.setData({
        canvasHeight,
        imageInfo,
        debugText: '图片信息获取完成'
      })

      // 3. 初始化Canvas
      await this.initCanvas()

      // 4. 加载并绘制原图
      await this.drawOriginalImage()

    } catch (error) {
      console.error('初始化Canvas和图片失败:', error)
      this.setData({
        debugText: '错误：初始化Canvas和图片失败 - ' + error.message
      })
    }
  },

  // 获取图片信息
  getImageInfo(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: src,
        success: (res) => {
          console.log('获取图片信息成功:', res)
          resolve(res)
        },
        fail: (error) => {
          console.error('获取图片信息失败:', error)
          reject(error)
        }
      })
    })
  },

  // 初始化Canvas
  initCanvas() {
    return new Promise((resolve, reject) => {
      this.setData({ debugText: '开始初始化Canvas节点' })
      
      const query = wx.createSelectorQuery()
      query.select('#customCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res[0]?.node) {
            const canvas = res[0].node
            const ctx = canvas.getContext('2d')
            
            // 设置canvas大小（考虑像素比）
            const dpr = wx.getSystemInfoSync().pixelRatio
            canvas.width = this.data.canvasWidth * dpr
            canvas.height = this.data.canvasHeight * dpr
            ctx.scale(dpr, dpr)

            this.canvas = canvas
            this.ctx = ctx
            
            this.setData({ 
              canvasReady: true,
              debugText: 'Canvas初始化完成'
            })
            resolve()
          } else {
            const error = new Error('获取Canvas节点失败')
            this.setData({ debugText: '错误：' + error.message })
            reject(error)
          }
        })
    })
  },

  // 加载图片
  loadImage(src) {
    return new Promise((resolve, reject) => {
      if (!this.canvas) {
        reject(new Error('Canvas未初始化'))
        return
      }

      const img = this.canvas.createImage()
      
      img.onload = () => {
        console.log('图片加载成功:', src)
        resolve(img)
      }
      
      img.onerror = (error) => {
        console.error('图片加载失败:', error)
        reject(new Error('图片加载失败'))
      }
      
      img.src = src
    })
  },

  // 绘制原图
  async drawOriginalImage() {
    try {
      this.setData({ debugText: '开始绘制原图' })
      
      if (!this.ctx || !this.canvas) {
        throw new Error('Canvas未初始化')
      }

      // 清空画布
      this.ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
      
      // 加载并绘制图片
      const image = await this.loadImage(this.data.product.originalImage)
      this.ctx.drawImage(
        image,
        0,
        0,
        this.data.canvasWidth,
        this.data.canvasHeight
      )

      this.setData({ debugText: '原图绘制完成' })
      
      // 生成预览图
      await this.generatePreview()

    } catch (error) {
      console.error('绘制原图失败:', error)
      this.setData({ 
        debugText: '错误：绘制原图失败 - ' + error.message 
      })
    }
  },

  // 生成预览图
  generatePreview() {
    return new Promise((resolve, reject) => {
      if (!this.canvas) {
        reject(new Error('Canvas未初始化'))
        return
      }

      wx.canvasToTempFilePath({
        canvas: this.canvas,
        success: (res) => {
          console.log('生成预览图成功:', res.tempFilePath)
          this.setData({
            previewImage: res.tempFilePath,
            debugText: '预览图生成成功'
          })
          resolve(res.tempFilePath)
        },
        fail: (error) => {
          console.error('生成预览图失败:', error)
          this.setData({
            debugText: '错误：生成预览图失败'
          })
          reject(error)
        }
      })
    })
  },

  async chooseImage() {
    if (this.data.loading) {
      console.log('正在处理中，请稍候')
      return
    }

    try {
      this.setData({ 
        loading: true,
        debugText: '开始选择图片'
      })

      // 选择图片
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      })

      console.log('用户选择的图片:', res.tempFiles[0])

      // 获取图片信息
      const imageInfo = await this.getImageInfo(res.tempFiles[0].tempFilePath)
      console.log('上传图片信息:', imageInfo)

      // 创建临时预览canvas
      await this.createUploadedImagePreview(res.tempFiles[0].tempFilePath, imageInfo)

    } catch (error) {
      console.error('选择图片失败:', error)
      this.setData({
        debugText: '选择图片失败: ' + error.message
      })
      wx.showToast({
        title: '选择图片失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 创建上传图片的预览
  async createUploadedImagePreview(imagePath, imageInfo) {
    try {
      this.setData({ debugText: '开始创建上传图片预览' })

      // 创建临时canvas用于预览
      const tempCanvas = wx.createOffscreenCanvas({
        type: '2d',
        width: this.data.canvasWidth,
        height: this.data.canvasHeight
      })
      const tempCtx = tempCanvas.getContext('2d')

      // 加载图片
      const img = tempCanvas.createImage()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imagePath
      })

      // 计算绘制参数（保持宽高比）
      const { drawX, drawY, drawWidth, drawHeight } = this.calculateImageDrawParams(
        img.width,
        img.height,
        this.data.canvasWidth,
        this.data.canvasHeight
      )

      // 清空并绘制图片
      tempCtx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
      tempCtx.drawImage(
        img,
        drawX,
        drawY,
        drawWidth,
        drawHeight
      )

      // 将图片信息更新到状态
      this.setData({
        uploadedImageInfo: {
          ...imageInfo,
          drawParams: {
            x: drawX,
            y: drawY,
            width: drawWidth,
            height: drawHeight
          }
        },
        uploadedImage: imagePath,
        debugText: '上传图片预览创建完成'
      })

      console.log('上传图片绘制参数:', {
        原始尺寸: {
          宽: img.width,
          高: img.height
        },
        绘制参数: {
          x: drawX,
          y: drawY,
          宽: drawWidth,
          高: drawHeight
        }
      })

    } catch (error) {
      console.error('创建上传图片预览失败:', error)
      this.setData({
        debugText: '创建上传图片预览失败: ' + error.message
      })
      throw error
    }
  },

  // 计算图片绘制参数
  calculateImageDrawParams(imgWidth, imgHeight, canvasWidth, canvasHeight) {
    const imageRatio = imgWidth / imgHeight
    const canvasRatio = canvasWidth / canvasHeight
    
    let drawWidth, drawHeight, drawX, drawY

    if (imageRatio > canvasRatio) {
      // 图片较宽，以高度为准
      drawHeight = canvasHeight
      drawWidth = drawHeight * imageRatio
      drawX = (canvasWidth - drawWidth) / 2
      drawY = 0
    } else {
      // 图片较高，以宽度为准
      drawWidth = canvasWidth
      drawHeight = drawWidth / imageRatio
      drawX = 0
      drawY = (canvasHeight - drawHeight) / 2
    }

    return {
      drawX,
      drawY,
      drawWidth,
      drawHeight
    }
  },
  // 重置上传图片
  resetUploadedImage() {
    this.setData({
      uploadedImage: '',
      uploadedImageInfo: null,
      debugText: '重置上传图片'
    })
  },
// 添加开始合成方法
async startComposite() {
  if (!this.data.uploadedImage) {
    wx.showToast({
      title: '请先上传图片',
      icon: 'none'
    })
    return
  }

  try {
    this.setData({
      loading: true,
      debugText: '开始合成图片'
    })

    // 1. 创建临时画布
    const tempCanvas = wx.createOffscreenCanvas({
      type: '2d',
      width: this.data.canvasWidth,
      height: this.data.canvasHeight
    })
    const tempCtx = tempCanvas.getContext('2d')

    // 2. 加载所需图片:用户上传的图片和蒙版图片。
    // 提示：可以将蒙版图片缓冲提示性能
    const [userImage, maskImage] = await Promise.all([
      this.loadImageToCanvas(this.data.uploadedImage, tempCanvas),
      this.loadImageToCanvas(this.data.product.maskImage, tempCanvas)
    ])

     // 3. 分析蒙版尺寸（可以缓存结果避免重复计算）
     const maskAnalysis = await this.analyzeMaskSize(maskImage)
     console.log('蒙版分析结果:', maskAnalysis)
     let autofit = 0
     if (maskAnalysis.width < userImage.width ||  maskAnalysis.height < userImage.height) {
        console.log("蒙版区域过小，需要重新绘制")
        autofit = 1
     }
     // 计算填充参数
     const fillParams = this.calculateFillParameters(
      userImage.width,
      userImage.height,
      maskAnalysis.width,
      maskAnalysis.height
    )
    // 绘制填充区域的用户图片
    tempCtx.save()
    tempCtx.translate(maskAnalysis.x, maskAnalysis.y)
    console.log("绘制区域填充：")
    console.log("x=", fillParams.x)
    console.log("y=", fillParams.y)
    console.log("width=", fillParams.width)
    console.log("height=", fillParams.height)
    tempCtx.drawImage(
      userImage,
      fillParams.x,
      fillParams.y,
      fillParams.width,
      fillParams.height
    )
    tempCtx.restore()

    // 3. 分析打印区域(这个函数有BUG，如果蒙版图带了非黑色线条)
    //if (this.data.scaleOptions.enabled) {
    if (0) {
      const printArea = await this.analyzePrintArea(maskImage)
      const fitResult = this.calculatePrintAreaFit(
        userImage.width,
        userImage.height,
        printArea
      )

      console.log('缩放计算结果:', {
        原始尺寸: { 宽: userImage.width, 高: userImage.height },
        打印区域: printArea,
        适应结果: fitResult
      })

      console.log("缩放比例：", fitResult.scaleRatio)
      console.log("缩放比例设置：", this.data.scaleOptions.maxScaleRatio)
      // 检查是否超过最大缩放比例
      if (fitResult.scaleRatio > this.data.scaleOptions.maxScaleRatio) {
        console.log('缩放比例超过阈值，使用普通适应模式')
        // 使用普通的适应模式
        const normalFit = this.calculateImageFit(
          userImage.width,
          userImage.height,
          this.data.canvasWidth,
          this.data.canvasHeight
        )

        console.log("普通适应模式:")
      console.log("x=", normalFit.drawX)
      console.log("y=", normalFit.drawY)
      console.log("width=", normalFit.drawWidth)
      console.log("height=", normalFit.drawHeight)
        tempCtx.drawImage(
          userImage,
          normalFit.drawX,
          normalFit.drawY,
          normalFit.drawWidth,
          normalFit.drawHeight
        )
      } else {
        // 使用打印区域适应
        console.log("打印区域自适应");
        tempCtx.drawImage(
          userImage,
          fitResult.drawX,
          fitResult.drawY,
          fitResult.drawWidth,
          fitResult.drawHeight
        )
      }
    } 
    
    this.setData({
      debugText: '用户图片绘制完成'
    })

    // 4. 应用蒙版
    tempCtx.globalCompositeOperation = 'destination-in'
    tempCtx.drawImage(maskImage, 0, 0, this.data.canvasWidth, this.data.canvasHeight)


    // 5. 在主画布上合成最终效果
    this.setData({ debugText: '开始最终合成' })
    
    // 先清空主画布
    this.ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
    
    // 绘制原图
    const originalImage = await this.loadImageToCanvas(this.data.product.originalImage, this.canvas)
    this.ctx.drawImage(originalImage, 0, 0, this.data.canvasWidth, this.data.canvasHeight)
    this.setData({
      debugText: '原图绘制完成'
    })

    // 7. 根据选择的混合模式合成
    if (this.data.blendOptions.mode === 'multiply') {
      // 正片叠底效果
      this.ctx.globalCompositeOperation = 'multiply'
      this.ctx.drawImage(tempCanvas, 0, 0)
      
      // 再次叠加一次原图以增强效果
      this.ctx.globalCompositeOperation = 'overlay'
      this.ctx.globalAlpha = 0.9
      this.ctx.drawImage(originalImage, 0, 0, this.data.canvasWidth, this.data.canvasHeight)
    } else {
      // 普通叠加
      this.ctx.globalCompositeOperation = 'source-over'
      this.ctx.globalAlpha = this.data.blendOptions.opacity
      this.ctx.drawImage(tempCanvas, 0, 0)
    }
  
   // 恢复默认设置
   this.ctx.globalAlpha = 1
   this.ctx.globalCompositeOperation = 'source-over'

    this.setData({
      debugText: '合成完成'
    })

  } catch (error) {
    console.error('合成失败:', error)
    this.setData({
      debugText: '合成失败: ' + error.message
    })
    wx.showToast({
      title: '合成失败',
      icon: 'none'
    })
  } finally {
    this.setData({ loading: false })
  }
},
// 打开SKU选择器
openSkuSelector() {
  this.setData({ showSkuSelector: true })
},

// 关闭SKU选择器
closeSkuSelector() {
  this.setData({ showSkuSelector: false })
},

// 选择SKU
selectSku(e) {
  const { index } = e.currentTarget.dataset
  const selectedSku = this.data.product.skus[index]
  
  this.setData({
    selectedSkuIndex: index,
    selectedSku: selectedSku,
    mainImage: selectedSku.path,
    currentPrice: selectedSku.price
  })
},

// 确认SKU选择
confirmSku() {
  if (!this.data.selectedSku) {
    wx.showToast({
      title: '请选择规格',
      icon: 'none'
    })
    return
  }

  this.setData({ showSkuSelector: false })
},
// 分析蒙版尺寸, 确保蒙版是白色，如果类似拼图那种效果。需要修改逻辑
async analyzeMaskSize(maskImage) {
  try {
    const tempCanvas = wx.createOffscreenCanvas({
      type: '2d',
      width: this.data.canvasWidth,
      height: this.data.canvasHeight
    })
    const tempCtx = tempCanvas.getContext('2d')

    // 绘制蒙版
    tempCtx.drawImage(maskImage, 0, 0, this.data.canvasWidth, this.data.canvasHeight)
    
    // 获取像素数据
    const imageData = tempCtx.getImageData(0, 0, this.data.canvasWidth, this.data.canvasHeight)
    const data = imageData.data

    // 找到白色区域的边界
    let minX = this.data.canvasWidth
    let minY = this.data.canvasHeight
    let maxX = 0
    let maxY = 0

    for (let y = 0; y < this.data.canvasHeight; y++) {
      for (let x = 0; x < this.data.canvasWidth; x++) {
        const idx = (y * this.data.canvasWidth + x) * 4
        // 检查白色像素
        if (data[idx] > 240 && data[idx + 1] > 240 && data[idx + 2] > 240) {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  } catch (error) {
    console.error('分析蒙版尺寸失败:', error)
    // 返回默认值
    return {
      x: 0,
      y: 0,
      width: this.data.canvasWidth,
      height: this.data.canvasHeight
    }
  }
},
// 切换混合模式
toggleBlendMode() {
  const newMode = this.data.blendOptions.mode === 'normal' ? 'multiply' : 'normal'
  this.setData({
    'blendOptions.mode': newMode
  }, () => {
    if (this.data.uploadedImage) {
      this.startComposite() // 重新合成
    }
  })
},

// 添加计算图片适应尺寸的方法
calculateImageFit(imgWidth, imgHeight, canvasWidth, canvasHeight) {
  console.log('计算图片适应尺寸:', {
    图片尺寸: { 宽: imgWidth, 高: imgHeight },
    画布尺寸: { 宽: canvasWidth, 高: canvasHeight }
  })

  const imageRatio = imgWidth / imgHeight
  const canvasRatio = canvasWidth / canvasHeight
  let drawWidth, drawHeight, drawX, drawY

  if (imageRatio > canvasRatio) {
    // 图片较宽，以高度为准
    drawHeight = canvasHeight
    drawWidth = drawHeight * imageRatio
    drawX = (canvasWidth - drawWidth) / 2
    drawY = 0
  } else {
    // 图片较高，以宽度为准
    drawWidth = canvasWidth
    drawHeight = drawWidth / imageRatio
    drawX = 0
    drawY = (canvasHeight - drawHeight) / 2
  }

  const result = { drawX, drawY, drawWidth, drawHeight }
  console.log('计算结果:', result)
  return result
},

// 加载图片到Canvas
loadImageToCanvas(src, canvas) {
  return new Promise((resolve, reject) => {
    const img = canvas.createImage()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`加载图片失败: ${src}`))
    img.src = src
  })
},

// 保存Canvas内容到文件
async saveCanvasToFile(canvas, name) {
  try {
    const tempFilePath = `${wx.env.USER_DATA_PATH}/${name}_${Date.now()}.png`
    
    if (canvas === this.canvas) {
      // 主画布使用 canvasToTempFilePath
      const res = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas: this.canvas,
          success: res => resolve(res),
          fail: reject
        })
      })
      return res.tempFilePath
    } else {
      // 离屏画布直接导出
      const buffer = canvas.toDataURL()
      const fs = wx.getFileSystemManager()
      
      fs.writeFileSync(
        tempFilePath,
        buffer.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      )
      
      return tempFilePath
    }
  } catch (error) {
    console.error('保存Canvas到文件失败:', error)
    throw error
  }
},

// 清理临时文件
async clearTempFiles() {
  try {
    const fs = wx.getFileSystemManager()
    const tempPath = `${wx.env.USER_DATA_PATH}`
    
    // 读取目录
    const files = fs.readdirSync(tempPath)
    
    // 清理临时图片文件
    files.forEach(file => {
      if (file.endsWith('.png')) {
        try {
          fs.unlinkSync(`${tempPath}/${file}`)
        } catch (e) {
          console.error('删除文件失败:', file, e)
        }
      }
    })
  } catch (error) {
    console.error('清理临时文件失败:', error)
  }
},
// 开始定制
startCustomize() {
  if (!this.data.selectedSku) {
    this.openSkuSelector()
    return
  }

  const customizeData = {
    productId: this.data.product.id,
    sku: this.data.selectedSku,
    price: this.data.selectedSku.price,
    originalImage: this.data.selectedSku.path,
    maskImage: this.data.product.maskImage,
    printArea: this.data.product.printArea
  }

  wx.navigateTo({
    url: `/pages/customize-design/customize-design?info=${encodeURIComponent(JSON.stringify(customizeData))}`
  })
},

onUnload() {
  this.clearTempFiles()
}

})