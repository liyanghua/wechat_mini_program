// pages/customize/customize.js
Page({
  data: {
    product: null,
    canvasWidth: 0,
    canvasHeight: 0,
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
      
      // 获取系统信息
      const systemInfo = wx.getSystemInfoSync()
      const canvasWidth = systemInfo.windowWidth
      
      this.setData({
        product,
        canvasWidth,
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

    // 1. 创建临时画布处理用户图片和蒙版
    const tempCanvas = wx.createOffscreenCanvas({
      type: '2d',
      width: this.data.canvasWidth,
      height: this.data.canvasHeight
    })
    const tempCtx = tempCanvas.getContext('2d')

    // 2. 加载所需图片
    const [userImage, maskImage] = await Promise.all([
      this.loadImageToCanvas(this.data.uploadedImage, tempCanvas),
      this.loadImageToCanvas(this.data.product.maskImage, tempCanvas)
    ])

    // 3. 在临时画布上绘制用户图片（修改这部分）
    this.setData({ debugText: '绘制用户图片' })
    tempCtx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
    
    // 计算图片绘制参数，保持比例填充整个画布
    const { drawX, drawY, drawWidth, drawHeight } = this.calculateImageFit(
      userImage.width,
      userImage.height,
      this.data.canvasWidth,
      this.data.canvasHeight
    )

    // 绘制用户图片
    tempCtx.drawImage(
      userImage,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    )

    // 保存第一步结果
    const tiledImagePath = await this.saveCanvasToFile(tempCanvas, 'tiled_image')
    this.setData({
      'debugImages.tiledImage': tiledImagePath,
      debugText: '用户图片绘制完成'
    })

    // 4. 应用蒙版（保持不变）
    this.setData({ debugText: '应用蒙版' })
    tempCtx.globalCompositeOperation = 'destination-in'
    tempCtx.drawImage(maskImage, 0, 0, this.data.canvasWidth, this.data.canvasHeight)

    // 保存第二步结果：应用蒙版后的效果
    const maskedImagePath = await this.saveCanvasToFile(tempCanvas, 'masked_image')
    this.setData({
      'debugImages.maskedImage': maskedImagePath,
      debugText: '蒙版应用完成'
    })

    // 5. 在主画布上合成最终效果
    this.setData({ debugText: '开始最终合成' })
    
    // 先清空主画布
    this.ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
    
    // 绘制原图
    const originalImage = await this.loadImageToCanvas(this.data.product.originalImage, this.canvas)
    this.ctx.drawImage(originalImage, 0, 0, this.data.canvasWidth, this.data.canvasHeight)

    // 保存第三步结果：原图
    const originalImagePath = await this.saveCanvasToFile(this.canvas, 'original_base')
    this.setData({
      'debugImages.originalBase': originalImagePath,
      debugText: '原图绘制完成'
    })

   // 调整叠加方式，让用户图片更突出
   this.ctx.globalCompositeOperation = 'source-over'  // 使用正常叠加模式
   this.ctx.globalAlpha = 0.95  // 设置非常小的透明度，让用户图片更突出
   this.ctx.drawImage(tempCanvas, 0, 0, this.data.canvasWidth, this.data.canvasHeight)
   
   // 恢复默认设置
   this.ctx.globalAlpha = 1.0
   this.ctx.globalCompositeOperation = 'source-over'


    // 保存最终结果
    const finalImagePath = await this.saveCanvasToFile(this.canvas, 'final_result')
    this.setData({
      'debugImages.finalResult': finalImagePath,
      previewImage: finalImagePath,
      debugText: '合成完成'
    })

    console.log('图片合成完成，调试图片路径:', this.data.debugImages)

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

onUnload() {
  this.clearTempFiles()
}

})