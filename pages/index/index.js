// pages/index/index.js
const productsData = require('../../data/products.js')

Page({
  data: {
    products: [], // 处理后的商品数据
    loading: true,
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    swiperDuration: 2000, // 轮播间隔，5秒
  },

  onLoad() {
    console.log('原始商品数据:', productsData)
    // 处理商品数据，添加轮播相关属性
    const processedProducts = productsData.map(product => this.processProductImages(product))
    
    this.setData({
      allProducts: processedProducts, // 保存所有商品
      hasMore: processedProducts.length > this.data.pageSize
    }, () => {
      this.loadNextPage() // 加载第一页
    })

    // 启动轮播定时器
    this.startImageRotation()
  },

  processProductImages(product) {
    // 合并和处理图片数组
    let images = []
    
    // 如果有 image 字段，放在第一位
    if (product.image) {
      images.push(product.image)
    }
    
    // 添加 mainImages 中的图片
    if (product.mediaInfo?.mainImages?.length) {
      images = images.concat(product.mediaInfo.mainImages)
    }
    
  
    // 去重
    images = Array.from(new Set(images))

    return {
      ...product,
      displayPrice: `¥${product.skus?.[0]?.price || 29.9}`,
      images: images,
      currentImageIndex: 0, // 当前显示的图片索引
    }
  },

  startImageRotation() {
    // 清除可能存在的旧定时器
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer)
    }

    // 创建新的定时器
    this.rotationTimer = setInterval(() => {
      const { products } = this.data
      const updatedProducts = products.map(product => {
        if (product.images.length > 1) {
          return {
            ...product,
            currentImageIndex: (product.currentImageIndex + 1) % product.images.length
          }
        }
        return product
      })

      this.setData({ products: updatedProducts })
    }, this.data.swiperDuration)
  },

  // 加载下一页数据
  loadNextPage() {
    const { currentPage, pageSize, allProducts } = this.data
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    const newProducts = allProducts.slice(start, end)

    this.setData({
      products: [...this.data.products, ...newProducts],
      currentPage: currentPage + 1,
      hasMore: end < allProducts.length,
      loading: false
    })
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ loading: true })
      this.loadNextPage()
    }
  },

  // 页面隐藏时停止轮播
  onHide() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer)
    }
  },

  // 页面显示时恢复轮播
  onShow() {
    this.startImageRotation()
  },

  // 页面卸载时清理
  onUnload() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer)
    }
  },

  // 跳转到定制页面
  goToCustomize(e) {
    const { id } = e.currentTarget.dataset
    const product = this.data.products.find(p => p.id === id)
    
    if (!product) {
      wx.showToast({
        title: '商品信息不存在',
        icon: 'none'
      })
      return
    }

    const productInfo = {
      id: product.id,
      name: product.name,
      originalImage: product.originalImage || product.images[0],
      maskImage: product.maskImage,
      printArea: product.printArea,
      price: product.price,
      properties: {
        title: product.name,
        shipping: product.shipping,
        material: product.material,
        size: product.size,
        shape:product.shape,
        tech:product.tech,
        style:product.style
      },
      mediaInfo: product.mediaInfo
    }

    wx.navigateTo({
      url: `/pages/customize/customize?productInfo=${encodeURIComponent(JSON.stringify(productInfo))}`
    })
  }
})