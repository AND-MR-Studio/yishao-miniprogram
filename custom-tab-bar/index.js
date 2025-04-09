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
    selectedColor: "#5CE821",
    list: [
      {
        pagePath: "/pages/community/community",
        text: "论坛",
        icon: "icon-community_UnSelected",
        selectedIcon: "icon-community_Selected"
      },
      {
        pagePath: "/pages/index/index",
        text: "喝汤",
        icon: "icon-soup_UnSelected",
        selectedIcon: "icon-soup_Selected"
      },
      {
        pagePath: "/pages/mine/mine",
        text: "我的",
        icon: "icon-my_UnSelected",
        selectedIcon: "icon-my_Selected"
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