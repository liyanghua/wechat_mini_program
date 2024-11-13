// pages/customize/customize.js
Page({
  data: {
    product: null,
    customImage: '',
    previewImage: '',
    canvasWidth: 0,
    canvasHeight: 0,
    imageLoading: false
  },

  onLoad(options) {
    try {
      // 解析传递过来的商品信息
      const product = JSON.parse(decodeURIComponent(options.productInfo))
      
      // 获取系统信息设置canvas尺寸
      wx.getSystemInfo({
        success: (res) => {
          // 设置canvas尺寸为屏幕宽度
          const canvasWidth = res.windowWidth
          const canvasHeight = res.windowWidth // 1:1 比例
          
          this.setData({
            product,
            canvasWidth,
            canvasHeight
          }, () => {
            // 初始化绘制商品原图
            this.drawOriginalImage()
          })
        }
      })
    } catch (error) {
      wx.showToast({
        title: '商品信息错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 绘制商品原图
  async drawOriginalImage() {
    try {
      const { canvasWidth, canvasHeight, product } = this.data
      const ctx = wx.createCanvasContext('customCanvas')

      // 加载并绘制商品原图
      const originalImage = await this.loadImage(product.originalImage)
      ctx.drawImage(originalImage.path, 0, 0, canvasWidth, canvasHeight)
      
      ctx.draw(false, () => {
        // 生成预览图
        this.generatePreview()
      })
    } catch (error) {
      wx.showToast({
        title: '图片加载失败',
        icon: 'none'
      })
    }
  },

  // 选择并上传图片
  async chooseImage() {
    if (this.data.imageLoading) return
    
    try {
      this.setData({ imageLoading: true })
      
      const { tempFilePaths } = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      const customImage = tempFilePaths[0]
      this.setData({ customImage })
      
      // 合成图片
      await this.compositeImages(customImage)
    } catch (error) {
      wx.showToast({
        title: '选择图片失败',
        icon: 'none'
      })
    } finally {
      this.setData({ imageLoading: false })
    }
  },

  // 合成图片
  async compositeImages(customImage) {
    try {
      wx.showLoading({ title: '生成预览图...' })

      const { product, canvasWidth, canvasHeight } = this.data
      const ctx = wx.createCanvasContext('customCanvas')

      // 1. 绘制商品原图
      const originalImage = await this.loadImage(product.originalImage)
      ctx.drawImage(originalImage.path, 0, 0, canvasWidth, canvasHeight)

      // 2. 获取用户图片信息
      const userImage = await this.loadImage(customImage)
      
      // 3. 计算打印区域
      const { printArea } = product
      const printX = canvasWidth * printArea.x
      const printY = canvasHeight * printArea.y
      const printWidth = canvasWidth * printArea.width
      const printHeight = canvasHeight * printArea.height

      // 4. 计算用户图片缩放和位置
      const { dx, dy, dWidth, dHeight } = this.calculateImageFit(
        userImage.width,
        userImage.height,
        printWidth,
        printHeight
      )

      // 5. 绘制用户图片（考虑蒙版）
      ctx.save()
      const maskImage = await this.loadImage(product.maskImage)
      // 设置蒙版
      ctx.drawImage(maskImage.path, 0, 0, canvasWidth, canvasHeight)
      ctx.clip()
      
      // 绘制用户图片
      ctx.drawImage(
        customImage,
        printX + dx,
        printY + dy,
        dWidth,
        dHeight
      )
      ctx.restore()

      // 6. 生成预览
      ctx.draw(false, () => {
        this.generatePreview()
      })

    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '生成预览图失败',
        icon: 'none'
      })
    }
  },

  // 生成预览图
  generatePreview() {
    setTimeout(() => {
      wx.canvasToTempFilePath({
        canvasId: 'customCanvas',
        success: (res) => {
          this.setData({
            previewImage: res.tempFilePath
          })
          wx.hideLoading()
        },
        fail: (error) => {
          console.error('预览图生成失败:', error)
          wx.hideLoading()
          wx.showToast({
            title: '预览图生成失败',
            icon: 'none'
          })
        }
      })
    }, 100)
  },

  // 加载图片
  loadImage(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src,
        success: resolve,
        fail: reject
      })
    })
  },

  // 计算图片适应区域的尺寸和位置
  calculateImageFit(imageWidth, imageHeight, areaWidth, areaHeight) {
    const imageRatio = imageWidth / imageHeight
    const areaRatio = areaWidth / areaHeight
    let dx = 0, dy = 0, dWidth = 0, dHeight = 0

    if (imageRatio > areaRatio) {
      // 图片更宽，以高度为准
      dHeight = areaHeight
      dWidth = dHeight * imageRatio
      dx = -(dWidth - areaWidth) / 2
    } else {
      // 图片更高，以宽度为准
      dWidth = areaWidth
      dHeight = dWidth / imageRatio
      dy = -(dHeight - areaHeight) / 2
    }

    return { dx, dy, dWidth, dHeight }
  }
})