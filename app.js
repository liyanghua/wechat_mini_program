// app.js
// 目前这些数据没有用。后续可以修改首页的UI
App({
  globalData: {
    categories: [
      { id: 1, name: '相框' },
      { id: 2, name: '手机壳' },
      { id: 3, name: '拼图' },
      { id: 4, name: '帆布包' },
      { id: 5, name: '扇子' },
    ],
    products: [
      { id: 1, categoryId: 1, name: '相框定制', price: 39.9, image: '/images/products/相框/原图.png' },
      { id: 2, categoryId: 2, name: '手机壳定制', price: 29.9, image: '/images/products/手机壳/原图.png' },
      { id: 3, categoryId: 3, name: '拼图定制', price: 99, image: '/images/products/拼图/原图.png' },
      { id: 4, categoryId: 4, name: '帆布包定制', price: 99, image: '/images/products/帆布包/原图.jpg' },
      { id: 5, categoryId: 5, name: '扇子定制', price: 99, image: '/images/products/扇子/646798296318/原图.png' }
    ]
  }
})

