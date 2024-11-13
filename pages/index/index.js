// pages/index/index.js
Page({
  data: {
    products: [
      {
        id: 1,
        name: "定制相框",
        desc: "定制永恒",
        price: 99,
        image: "/images/products/相框/原图.png",
        originalImage: "/images/products/相框/原图.png",
        maskImage: "/images/products/相框/蒙版.png",
        printArea: {
          x: 0.3,
          y: 0.2,
          width: 0.4,
          height: 0.4
        },
        sales: 2341
      },
      {
        id: 2,
        name: "个性手机壳",
        desc: "DIY照片定制 全包边保护",
        price: 39.9,
        image: "/images/products/手机壳/原图.png",
        originalImage: "/images/products/手机壳/原图.png",
        maskImage: "/images/products/手机壳/蒙版.png",
        printArea: {
          x: 0.3,
          y: 0.2,
          width: 0.4,
          height: 0.4
        },
        sales: 1678
      },
      {
        id: 3,
        name: "拼图",
        desc: "拼出你的精彩",
        price: 49.9,
        image: "/images/products/拼图/原图.png",
        originalImage: "/images/products/拼图/原图.png",
        maskImage: "/images/products/拼图/蒙版.png",
        printArea: {
          x: 0.3,
          y: 0.2,
          width: 0.4,
          height: 0.4
        },
        sales: 999
      },
      {
        id: 4,
        name: "帆布包定制",
        desc: "环保面料 大容量",
        price: 79.9,
        image: "/images/products/帆布包/原图.jpg",
        originalImage: "/images/products/帆布包/原图.jpg",
        maskImage: "/images/products/帆布包/蒙版.png",
        printArea: {
          x: 0.3,
          y: 0.2,
          width: 0.4,
          height: 0.4
        },
        sales: 876
      }
    ],
    loading: false,
    hasMore: true,
    page: 1
  },

  onLoad() {
    // 初始化加载数据
    this.loadData()
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      products: [],
      page: 1,
      hasMore: true
    }, () => {
      this.loadData().then(() => {
        wx.stopPullDownRefresh()
      })
    })
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadData()
    }
  },

  // 加载数据
  async loadData() {
    if (!this.data.hasMore || this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      // 模拟API请求
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟新数据
      const newProducts = this.data.products.map(item => ({
        ...item,
        id: item.id + this.data.products.length
      }))
      
      this.setData({
        products: [...this.data.products, ...newProducts],
        page: this.data.page + 1,
        hasMore: this.data.page < 4 // 模拟4页数据
      })
    } catch (error) {
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 跳转到定制页面
  goToCustomize(e) {
    const { id } = e.currentTarget.dataset
    const product = this.data.products.find(p => p.id === id)
    
    // 将商品信息序列化后传递
    const productInfo = JSON.stringify({
      id: product.id,
      name: product.name,
      price: product.price,
      originalImage: product.originalImage,
      maskImage: product.maskImage,
      printArea: product.printArea
    })
    
    wx.navigateTo({
      url: `/pages/customize/customize?productInfo=${encodeURIComponent(productInfo)}`
    })
  }
})