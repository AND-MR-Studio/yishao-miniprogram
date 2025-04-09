// index.js
Page({
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0  // 修改为1，因为社区页面是第二个tab
      })
    }
  }
})
