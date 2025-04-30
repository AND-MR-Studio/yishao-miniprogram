// components/tip-module/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示提示模块
    visible: {
      type: Boolean,
      value: false
    },
    // 提示文本内容
    tipText: {
      type: Array,
      value: [
        '汤来了！我是陪你熬夜猜谜的小勺🌙',
        '只答是、否、不确定，别想套我话哦～',
        '长按这儿，汤面就浮出来咯！'
      ]
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    animationData: {}
  },

  /**
   * 组件样式隔离
   */
  options: {
    styleIsolation: 'isolated',
    addGlobalClass: true
  }
});
