// app.js
App({
  globalData: {
    categories: [
      { id: 1, name: '相框' },
      { id: 2, name: '马克杯' },
      { id: 3, name: '扇子' }
    ],
    products: [
      { id: 1, categoryId: 1, name: '相框定制', price: 39.9, image: '/images/phone-case.png' },
      { id: 2, categoryId: 2, name: '马克杯定制', price: 29.9, image: '/images/mug.png' },
      { id: 3, categoryId: 3, name: '扇子定制', price: 99, image: '/images/tshirt.png' }
    ]
  }
})

