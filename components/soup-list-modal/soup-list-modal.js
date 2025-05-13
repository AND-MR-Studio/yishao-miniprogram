// components/soup-list-modal/soup-list-modal.js
const userService = require('../../service/userService');
const soupService = require('../../service/soupService');
const dialogService = require('../../service/dialogService');
const eventUtils = require('../../utils/eventUtils');

// 定义列表类型配置
const TYPE_CONFIG = {
  unsolved: {
    title: '未解决的海龟汤',
    emptyText: '暂无未解决的海龟汤',
    getIds: (userInfo) => {
      const answeredSoups = userInfo.answeredSoups || [];
      const solvedSoups = userInfo.solvedSoups || [];
      return answeredSoups.filter(id => !solvedSoups.includes(id));
    }
  },
  solved: {
    title: '已解决的海龟汤',
    emptyText: '暂无已解决的海龟汤',
    getIds: (userInfo) => userInfo.solvedSoups || []
  },
  creations: {
    title: '我的创作',
    emptyText: '暂无创作的海龟汤',
    getIds: (userInfo) => userInfo.createSoups || []
  },
  favorites: {
    title: '我的收藏',
    emptyText: '暂无收藏的海龟汤',
    getIds: (userInfo) => userInfo.favoriteSoups || []
  }
};

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示弹窗
    visible: {
      type: Boolean,
      value: false
    },
    // 列表类型: 'unsolved', 'solved', 'creations', 'favorites'
    type: {
      type: String,
      value: 'unsolved'
    },
    // 用户信息
    userInfo: {
      type: Object,
      value: null
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 弹窗标题
    title: '海龟汤列表',
    // 列表数据
    soupList: [],
    // 加载状态
    loading: false,
    // 是否显示空状态
    isEmpty: false,
    // 空状态提示文本
    emptyText: '暂无数据',
    // 当前页码
    currentPage: 1,
    // 是否有更多数据
    hasMore: true
  },

  /**
   * 数据监听器
   */
  observers: {
    'visible, type': function(visible, type) {
      if (visible) {
        // 根据类型设置标题和空状态文本
        const config = TYPE_CONFIG[type] || TYPE_CONFIG.unsolved;
        this.setData({
          title: config.title,
          emptyText: config.emptyText
        });



        // 加载数据
        this.loadSoupList();
      } else {
        // 重置数据
        this.resetData();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 加载海龟汤列表数据
     */
    async loadSoupList() {
      // 防止重复加载
      if (this.data.loading) return;

      this.setData({ loading: true });

      try {
        // 检查登录状态
        if (!userService.checkLoginStatus(false)) {
          this.setData({
            soupList: [],
            isEmpty: true,
            loading: false
          });
          return;
        }

        // 获取用户信息 - 优先使用传入的userInfo，如果没有则重新获取
        let userInfo = this.properties.userInfo;
        if (!userInfo) {
          userInfo = await userService.getFormattedUserInfo(false);
        }

        if (!userInfo) {
          throw new Error('获取用户信息失败');
        }

        // 获取当前类型的配置
        const config = TYPE_CONFIG[this.data.type] || TYPE_CONFIG.unsolved;

        // 获取海龟汤ID数组
        const soupIds = config.getIds(userInfo);

        // 如果没有数据，显示空状态
        if (!soupIds || soupIds.length === 0) {
          this.setData({
            soupList: [],
            isEmpty: true,
            loading: false
          });
          return;
        }

        // 获取海龟汤详细信息
        let soupList = await soupService.getSoup(soupIds);

        // 确保 soupList 是数组
        if (!Array.isArray(soupList)) {
          // 如果返回的是单个对象，将其转换为数组
          if (soupList && typeof soupList === 'object') {
            soupList = [soupList];
          } else {
            soupList = [];
          }
        }

        // 获取用户ID
        const userId = await userService.getUserId();

        // 为每个汤面获取对应的对话ID
        if (userId && soupList.length > 0) {
          // 使用Promise.all并行处理所有请求
          await Promise.all(soupList.map(async (soup) => {
            try {
              // 获取用户与该汤面的对话
              const dialogData = await dialogService.getUserDialog(userId, soup.soupId);
              // 将对话ID添加到汤面数据中
              if (dialogData && dialogData.dialogId) {
                soup.dialogId = dialogData.dialogId;
              }
            } catch (error) {
              console.error(`获取汤面${soup.soupId}的对话ID失败:`, error);
              // 失败时不设置dialogId，不影响列表显示
            }
          }));
        }

        // 更新数据
        this.setData({
          soupList: soupList,
          isEmpty: soupList.length === 0,
          loading: false,
          hasMore: false // 目前一次性加载所有数据，不支持分页
        });
      } catch (error) {
        console.error('加载海龟汤列表失败:', error);
        this.setData({
          soupList: [],
          isEmpty: true,
          loading: false
        });

        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    },

    /**
     * 重置数据
     */
    resetData() {
      this.setData({
        soupList: [],
        loading: false,
        isEmpty: false
      });
    },

    /**
     * 关闭弹窗
     */
    closeModal() {
      this.triggerEvent('close');
    },

    /**
     * 点击海龟汤项
     * @param {Object} e - 事件对象
     */
    onSoupItemTap(e) {
      const { soupid } = e.currentTarget.dataset;
      if (!soupid) return;

      // 关闭弹窗
      this.closeModal();

      // 跳转到海龟汤详情页（Tab页面）
      wx.switchTab({
        url: '/pages/index/index',
        success: () => {
          // 跳转成功后发布事件，传递参数
          // 增加延迟时间，确保页面完全准备好接收事件
          setTimeout(() => {
            // 只发送 soupId，不发送 dialogId，这样页面会停留在 viewing 状态
            eventUtils.emitEvent('loadSoup', {
              soupId: soupid
            });
            console.log('发送loadSoup事件，soupId:', soupid);
          }, 500); // 增加延迟时间，确保页面已经完成跳转和初始化
        },
        fail: () => {
          wx.showToast({
            title: '跳转失败，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      });
    },

    /**
     * 阻止事件冒泡
     */
    preventBubble() {
      // 阻止事件冒泡
      return false;
    }
  }
})
