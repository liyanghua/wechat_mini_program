// app.js
App({
  globalData: {
    categories: [
      { id: 1, name: '相框' },
      { id: 2, name: '手机壳' },
      { id: 3, name: '拼图' },
      { id: 4, name: '帆布包' }
    ],
    products: [
      { id: 1, categoryId: 1, name: '相框定制', price: 39.9, image: '/images/products/相框/原图.png' },
      { id: 2, categoryId: 2, name: '手机壳定制', price: 29.9, image: '/images/products/手机壳/原图.png' },
      { id: 3, categoryId: 3, name: '拼图定制', price: 99, image: '/images/products/拼图/原图.png' },
      { id: 4, categoryId: 4, name: '帆布包定制', price: 99, image: '/images/products/帆布包/原图.jpg' }
    ]
  }
})

