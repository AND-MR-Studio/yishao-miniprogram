/**
 * 新用户引导层组件
 * 显示左右滑动、双击点赞和长按收藏的操作指引
 */
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示引导层
    show: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 组件内部数据
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 关闭引导层
     * 触发close事件，由父页面处理存储逻辑
     */
    closeGuide() {
      this.triggerEvent('close');
    },

    /**
     * 阻止冒泡
     * 防止点击内容区域时关闭引导层
     */
    preventClose() {
      // 仅阻止冒泡，不做其他操作
      return;
    }
  }
})
