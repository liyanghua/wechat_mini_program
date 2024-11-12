// pages/index/index.js
Page({
  data: {
    products: [
      {
        id: 1,
        name: "定制情侣T恤",
        desc: "双面印制 纯棉面料",
        price: 99,
        image: "/images/products/tshirt1.png",
        sales: 2341
      },
      {
        id: 2,
        name: "个性手机壳",
        desc: "DIY照片定制 全包边保护",
        price: 39.9,
        image: "/images/products/phonecase1.png",
        sales: 1678
      },
      {
        id: 3,
        name: "照片马克杯",
        desc: "陶瓷材质 多区域打印",
        price: 49.9,
        image: "/images/products/mug1.png",
        sales: 999
      },
      {
        id: 4,
        name: "帆布包定制",
        desc: "环保面料 大容量",
        price: 79.9,
        image: "/images/products/bag1.png",
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
    wx.navigateTo({
      url: `/pages/customize/customize?id=${id}`
    })
  }
})