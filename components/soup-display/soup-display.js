// components/soup-display/soup-display.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 汤面标题
    title: {
      type: String,
      value: '《找到你了》'
    },
    // 汤面内容数组
    contentLines: {
      type: Array,
      value: [
        '哒..哒...哒....',
        '咚咚咚',
        '哒....哒...哒..',
        '哗啦哗啦',
        '哒..哒…哒….."我找到你了哦"'
      ]
    }
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {

  }
})