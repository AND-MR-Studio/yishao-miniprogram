/**
 * 首页 - 海龟汤展示与交互
 * 负责展示汤面内容、处理滑动交互、切换汤面、双击收藏
 */
// ===== 导入依赖 =====
const soupService = require('../../utils/soupService');
const userService = require('../../utils/userService');
const { SWIPE_DIRECTION } = require('../../utils/interactionManager');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { store } = require('../../stores/soupStore');

Page({
  // ===== 页面数据 =====
  data: {

    // 汤面相关
    breathingBlur: false, // 呈现呼吸模糊效果

    // 交互相关 - 由interactionManager管理
    swiping: false, // 是否正在滑动中
    swipeDirection: SWIPE_DIRECTION.NONE, // 滑动方向
    swipeFeedback: false, // 滑动反馈动画
    swipeStarted: false, // 是否开始滑动
    blurAmount: 0, // 模糊程度（0-10px）
  },

  // ===== 生命周期方法 =====
  /**
   * 页面加载时执行
   * 获取用户ID并加载汤面
   * @param {Object} options - 页面参数，可能包含soupId
   */
  async onLoad(options) {
    try {
      // 创建MobX Store绑定
      this.storeBindings = createStoreBindings(this, {
        store: store,
        fields: [
          'soupId', 'userId', 'isLoading', 'soupData'
        ],
        actions: ['updateState', 'initSoup', 'toggleFavorite']
      });

      // 检查是否有指定的汤面ID
      let targetSoupId = options.soupId || null;

      // 如果没有提供ID，则获取随机汤面ID
      if (!targetSoupId) {
        targetSoupId = await soupService.getRandomSoup();
        console.log('获取随机汤面ID:', targetSoupId);
      }

      if (!targetSoupId) {
        throw new Error('无法获取汤面ID');
      }

      // 获取用户ID
      const userId = await userService.getUserId();
      console.log('获取用户ID:', userId || '未登录');

      // 初始化汤面数据
      this.initSoup(targetSoupId, userId || '');

      // 增加汤面阅读数 - 异步执行，不阻塞UI
      soupService.viewSoup(targetSoupId).catch(error => {
        console.error('增加阅读数失败:', error);
      });
    } catch (error) {
      console.error('页面加载失败:', error);
      this.showErrorToast('加载失败，请重试');
    }
  },

  /**
   * 页面显示时执行
   * 设置底部TabBar选中状态
   */
  onShow() {
    // 设置底部TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1  // 第二个tab是喝汤页面
      });
    }
  },

  /**
   * 页面卸载时执行
   * 清理资源
   */
  onUnload() {
    // 清理MobX绑定
    if (this.storeBindings) {
      this.storeBindings.destroyStoreBindings();
    }
  },

  /**
   * 分享小程序
   */
  onShareAppMessage() {
    return {
      title: '这个海龟汤太难了来帮帮我！',
      path: `/pages/index/index?soupId=${this.soupId}`
    };
  },

  /**
   * 开始喝汤按钮点击事件
   * 简化逻辑，只负责跳转到chat页面
   */
  async onStartSoup() {
    // 获取开始喝汤按钮组件
    const startButton = this.selectComponent('#startSoupButton');

    // 检查用户是否已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      // 重置按钮状态
      if (startButton) {
        startButton.setLoadingComplete(false);
      }

      // 显示登录提示弹窗
      const loginPopup = this.selectComponent('#loginPopup');
      if (loginPopup) {
        loginPopup.show();
      }
      return;
    }

    // 检查当前汤面ID
    if (!this.soupId) {
      if (startButton) {
        startButton.setLoadingComplete(false);
      }
      this.showErrorToast('无法获取汤面信息');
      return;
    }

    try {
      // 获取用户ID
      const userId = await userService.getUserId();

      // 更新MobX Store中的userId
      this.updateState({ userId: userId });

      // 设置按钮加载完成
      if (startButton) {
        startButton.setLoadingComplete(true);
      }

      // 直接跳转到chat页面
      wx.navigateTo({
        url: `/pages/chat/chat?soupId=${this.soupId}`
      });
    } catch (error) {
      console.error('开始喝汤失败:', error);

      // 重置按钮状态
      if (startButton) {
        startButton.setLoadingComplete(false);
      }

      // 显示错误提示
      this.showErrorToast('加载失败，请重试');
    }
  },

  /**
   * 处理登录弹窗确认按钮点击事件
   */
  onLoginConfirm() {
    // 跳转到个人中心页面
    wx.switchTab({
      url: '/pages/mine/mine'
    });
  },

  // ===== 汤面切换相关 =====
  /**
   * 切换汤面
   * 简化版本，只负责获取相邻汤面ID并初始化
   * @param {string} direction 切换方向，'next' 或 'previous'
   * @returns {Promise<void>}
   */
  async switchSoup(direction) {
    // 如果正在加载，不执行切换
    if (this.isLoading) return;

    // 设置UI效果
    this.setData({
      breathingBlur: true // 启用呼吸模糊效果
    });

    try {
      // 根据方向获取下一个汤面ID
      const isNext = direction === 'next';
      const soupId = await soupService.getAdjacentSoup(this.soupId, isNext);

      if (!soupId) {
        throw new Error(`无法获取${isNext ? '下' : '上'}一个汤面ID`);
      }

      // 初始化新的汤面数据 - store会自动设置isLoading状态
      this.initSoup(soupId, this.userId || '');

      // 增加汤面阅读数 - 异步执行，不阻塞UI
      soupService.viewSoup(soupId).catch(error => {
        console.error('增加阅读数失败:', error);
      });

      // 重置UI效果
      this.setData({
        swipeFeedback: false,  // 关闭滑动反馈动画
        breathingBlur: false   // 关闭呼吸模糊效果
      });
    } catch (error) {
      console.error('切换汤面失败:', error);
      this.showErrorToast('切换失败，请重试');

      // 重置UI状态
      this.setData({
        swipeFeedback: false,
        breathingBlur: false
      });
    }
  },


  // ===== 交互相关 =====
  /**
   * 处理soup-display组件的滑动事件
   * @param {Object} e 事件对象
   */
  handleSoupSwipe(e) {
    const { direction } = e.detail;
    // 等待一帧，确保滑动反馈动画先应用
    wx.nextTick(() => {
      this.switchSoup(direction);
    });
  },

  /**
   * 处理双击收藏事件
   * 直接调用MobX store的toggleFavorite方法
   */
  handleDoubleTap() {
    if (this.soupId && this.userId) {
      this.toggleFavorite(this.soupId);
    } else if (!this.userId) {
      this.showErrorToast('请先登录');
    }
  },

  // ===== 辅助方法 =====
  /**
   * 显示错误提示
   * @param {string} message 错误信息
   */
  showErrorToast(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 处理汤数据变更事件
   * 简化版本，只负责初始化新的汤面数据
   * @param {Object} e 事件对象
   */
  async handleSoupChange(e) {
    const { soup } = e.detail;
    if (!soup || !soup.soupId) return;

    const soupId = soup.soupId;

    try {
      // 初始化新的汤面数据
      this.initSoup(soupId, this.userId || '');

      // 增加汤面阅读数 - 异步执行，不阻塞UI
      soupService.viewSoup(soupId).catch(error => {
        console.error('增加阅读数失败:', error);
      });
    } catch (error) {
      console.error('加载汤面失败:', error);
      this.showErrorToast('加载失败，请重试');
    }
  }
});