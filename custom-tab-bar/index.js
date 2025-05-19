Component({
  /**
   * 组件的属性列表
   */
  properties: {

  },

  /**
   * 组件的初始数据
   */
  data: {
    selected: 1,
    color: "#DBFFEC",
    selectedColor: "#5ce821",
    list: [
      {
        pagePath: "/pages/upload/upload",
        text: "煮汤",
        icon: "/static/images/soup_unlighting.png",
        selectedIcon: "/static/images/soup_lighting.png"
      },
      {
        pagePath: "/pages/index/index",
        text: "喝汤",
        icon: "/static/images/dialog_unlighting.png",
        selectedIcon: "/static/images/dialog_lighting.png"
      },
      {
        pagePath: "/pages/mine/mine",
        text: "我的",
        icon: "/static/images/mine_unlighting.png",
        selectedIcon: "/static/images/mine_lighting.png"
      }
    ]
  },

  /**
   * 组件的方法列表
   */
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;

      wx.switchTab({
        url,
        success: () => {
          this.setData({
            selected: data.index
          });
        }
      });
    }
  }
})