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
    },
    // 汤面ID，用于后台管理识别
    soupId: {
      type: String,
      value: ''
    }
  },

  /**
   * 数据监听器
   */
  observers: {
    'title, contentLines': function(title, contentLines) {
      // 当标题或内容变化时触发
      this.triggerEvent('contentChange', {
        soupId: this.data.soupId,
        title: title,
        contentLines: contentLines
      });
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function() {
      // 在组件实例进入页面节点树时执行
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 更新汤面标题
     * @param {String} newTitle 新标题
     */
    updateTitle: function(newTitle) {
      this.setData({
        title: newTitle
      });
      return true;
    },

    /**
     * 更新汤面内容
     * @param {Array} newContentLines 新内容数组
     */
    updateContent: function(newContentLines) {
      if (Array.isArray(newContentLines)) {
        this.setData({
          contentLines: newContentLines
        });
        return true;
      }
      return false;
    },

    /**
     * 追加一行内容
     * @param {String} line 新的一行内容
     */
    appendLine: function(line) {
      const newContentLines = this.data.contentLines.concat([line]);
      this.setData({
        contentLines: newContentLines
      });
      return true;
    },

    /**
     * 获取当前汤面数据
     * @returns {Object} 汤面数据对象
     */
    getSoupData: function() {
      return {
        soupId: this.data.soupId,
        title: this.data.title,
        contentLines: this.data.contentLines
      };
    }
  }
})