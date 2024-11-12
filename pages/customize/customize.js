Page({
  data: {
    product: null,
    customText: '',
    customImage: '',
    imageList: []
  },
  onLoad(options) {
    const productId = parseInt(options.id)
    const product = getApp().globalData.products.find(p => p.id === productId)
    this.setData({ product })
  },
  // 上传图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          customImage: res.tempFilePaths[0],
          imageList: res.tempFilePaths
        })
      }
    })
  },
  // 输入文字
  inputText(e) {
    this.setData({
      customText: e.detail.value
    })
  },
  // 提交定制
  submitCustomization() {
    if (!this.data.customImage && !this.data.customText) {
      wx.showToast({
        title: '请上传图片或输入文字',
        icon: 'none'
      })
      return
    }
    // 这里添加提交逻辑
    wx.showLoading({
      title: '提交中...'
    })
    // 模拟提交
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '提交成功',
        success: () => {
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      })
    }, 1500)
  }
})
