// pages/mine/mine.js - 纯UI页面层

// 引入API模块
const api = require('../../config/api');
// 引入rootStore 和 mobx-miniprogram-bindings
const { rootStore } = require('../../stores/rootStore');
const { createStoreBindings, destroyStoreBindings } = require('mobx-miniprogram-bindings');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // userInfo, detectiveInfo, hasSignedIn, totalSoupCount, pointsCount 将由 storeBindings 提供
    defaultAvatarUrl: api.assets.local.avatar,
    buttonConfig: {
      type: 'light',
      text: '登录'
    },
    isLoggingOut: false,
    // 用户信息设置弹窗
    showUserInfoModal: false,
    // 汤面列表弹窗
    showSoupListModal: false,
    // 汤面列表类型: 'unsolved', 'solved', 'creations', 'favorites'
    soupListType: 'unsolved',
    // 编辑中的昵称和头像，用于用户信息设置弹窗
    editingNickName: '',
    editingAvatarUrl: ''
  },
  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad() {
    // 创建userStore绑定
    this.userStoreBindings = createStoreBindings(this, {
      store: rootStore.userStore,
      fields: [
        "userInfo",
        "isLoggedIn",
        "userAvatar",
        "remainingAnswers",
        "detectiveId",
        "nickname",
        "userStats",
        "isLoading",
        "loginLoading",
        "logoutLoading",
        "avatarUploading",
        "profileUpdating"
      ],
      actions: [
        "syncUserInfo",
        "login",
        "logout",
        "updateAvatar",
        "updateUserProfile"
      ]
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  async onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      });
    }

    // 调用绑定的syncUserInfo action刷新数据
    await this.syncUserInfo();
    // 根据登录状态更新按钮
    this.updateButtonConfig();
  },

  /**
   * 更新登录/退出登录按钮的配置
   */
  updateButtonConfig() {
    // 直接访问绑定的 isLoggedIn 字段
    if (this.data.isLoggedIn) {
      this.setData({
        buttonConfig: {
          type: 'unlight',
          text: '退出登录'
        }
      });
    } else {
      this.setData({
        buttonConfig: {
          type: 'light',
          text: '登录'
        }
      });
    }
  },

  // updateStatistics 方法已移至 userStore，通过 storeBindings 自动更新
  // 此处已移除 updateUserInfo 方法，使用 refreshPageData 方法替代

  /**
   * 处理头像选择
   */
  async onChooseAvatar(e) {
    // 防止重复调用
    if (this.data.avatarUploading) {
      return;
    }

    const { avatarUrl } = e.detail;
    if (!avatarUrl) {
      return;
    }

    try {
      // 调用绑定的updateAvatar action
      const result = await this.updateAvatar(avatarUrl);

      if (result.success) {
        wx.showToast({
          title: '头像上传成功',
          icon: 'success',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: result.error || '头像上传失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('头像上传失败:', error);
      wx.showToast({
        title: '头像上传失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 处理昵称输入
   * 使用防抖技术优化输入处理
   */
  onInputNickname: function (e) {
    // 清除之前的定时器
    if (this.nicknameDebounceTimer) {
      clearTimeout(this.nicknameDebounceTimer);
    }

    // 获取输入值
    let value = e.detail.value || '';

    // 使用防抖，延迟处理输入
    this.nicknameDebounceTimer = setTimeout(() => {
      // 检查昵称长度是否超过10个字符
      if (value.length > 10) {
        // 截取前10个字符
        value = value.substring(0, 10);

        // 显示提示
        wx.showToast({
          title: '昵称最多10个字',
          icon: 'none',
          duration: 2000
        });
      }

      // 更新本地编辑中的昵称
      this.setData({
        editingNickName: value
      });
    }, 500);
  },

  /**
   * 打开用户信息设置弹窗
   * 使用async/await优化异步流程
   * @param {boolean} showToast - 是否显示操作成功提示
   */
  async openUserInfoModal(showToast = false) {
    // 防止重复调用
    if (this._isOpeningUserInfoModal) {
      return;
    }
    this._isOpeningUserInfoModal = true;

    try {
      // 检查登录状态，直接访问绑定的 isLoggedIn 字段
      if (!this.data.isLoggedIn) {
        wx.showToast({
          title: '请先登录',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      // 从 store 获取用户信息，直接访问绑定的 userInfo 字段
      // 如果用户信息不完整，尝试刷新
      if (!this.data.userInfo || !this.data.userInfo.nickname || !this.data.userInfo.avatarUrl) {
        // 调用绑定的 syncUserInfo action 刷新用户信息
        await this.syncUserInfo();
      }

      // 如果刷新后仍然没有用户信息，给出提示并返回，直接访问绑定的 userInfo 字段
      if (!this.data.userInfo || !this.data.userInfo.nickname || !this.data.userInfo.avatarUrl) {
        wx.showToast({
          title: '获取用户信息失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      // 设置弹窗数据，直接使用绑定的 userInfo 字段
      this.setData({
        showUserInfoModal: true,
        editingNickName: this.data.userInfo.nickname,
        editingAvatarUrl: this.data.userInfo.avatarUrl
      });

      if (showToast) {
        wx.showToast({
          title: '请完善您的信息',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('打开用户信息设置弹窗失败:', error);
      wx.showToast({
        title: '打开设置失败，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this._isOpeningUserInfoModal = false;
    }
  },

  /**
   * 关闭用户信息设置弹窗
   */
  closeUserInfoModal() {
    this.setData({
      showUserInfoModal: false
    });
    // 关闭弹窗后，调用绑定的 syncUserInfo action 刷新用户信息，确保页面显示最新数据
    this.syncUserInfo();
  },

  /**
   * 保存用户信息
   */
  async saveUserInfo() {
    // 防止重复提交
    if (this.data.profileUpdating) {
      return;
    }

    const { editingNickName, editingAvatarUrl } = this.data;

    // 检查昵称是否为空
    if (!editingNickName || editingNickName.trim() === '') {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 检查头像是否为默认头像
    if (editingAvatarUrl === this.data.defaultAvatarUrl) {
      wx.showToast({
        title: '请选择您的头像',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    try {
      // 调用绑定的updateUserProfile action
      const result = await this.updateUserProfile({
        nickname: editingNickName
      });

      if (result.success) {
        wx.showToast({
          title: '用户信息保存成功',
          icon: 'success',
          duration: 2000
        });
        this.closeUserInfoModal();
      } else {
        wx.showToast({
          title: result.error || '用户信息保存失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('保存用户信息失败:', error);
      wx.showToast({
        title: '保存失败，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    }
  },


  /**
   * 跳过用户信息设置
   */
  skipUserInfo() {
    this.setData({
      showUserInfoModal: false
    });
    // 跳过设置后，调用绑定的 syncUserInfo action 刷新用户信息，确保页面显示最新数据
    this.syncUserInfo();
  },

  /**
   * 处理登录/退出登录按钮点击
   */
  async handleLogin() {
    // 防止重复点击
    if (this.data.loginLoading || this.data.logoutLoading) {
      return;
    }

    try {
      if (this.data.isLoggedIn) {
        // 已登录，执行退出登录
        const result = await this.logout();

        if (result.success) {
          wx.showToast({
            title: '退出登录成功',
            icon: 'success',
            duration: 2000
          });
          this.updateButtonConfig();
        } else {
          wx.showToast({
            title: result.error || '退出登录失败',
            icon: 'none',
            duration: 2000
          });
        }
      } else {
        // 未登录，执行登录
        const result = await this.login();

        if (result.success) {
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 2000
          });
          this.updateButtonConfig();

          // 检查是否需要完善信息
          if (!this.data.userInfo || !this.data.userInfo.nickname || !this.data.userInfo.avatarUrl) {
            this.openUserInfoModal(true);
          }
        } else {
          wx.showToast({
            title: result.error || '登录失败',
            icon: 'none',
            duration: 2000
          });
        }
      }
    } catch (error) {
      console.error('处理登录/退出登录失败:', error);
      wx.showToast({
        title: '操作失败，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 处理页面下拉刷新
   */
  async onPullDownRefresh() {
    // 调用绑定的syncUserInfo action刷新用户信息
    await this.syncUserInfo();
    wx.stopPullDownRefresh();
  },

  /**
   * 处理点击汤面列表入口
   * @param {object} event - 事件对象，包含 data-type 指定的列表类型
   */
  handleSoupListClick(event) {
    const type = event.currentTarget.dataset.type;
    this.setData({
      soupListType: type,
      showSoupListModal: true
    });
  },

  /**
   * 关闭汤面列表弹窗
   */
  closeSoupListModal() {
    this.setData({
      showSoupListModal: false
    });
  },

  /**
   * 处理分享到朋友圈
   */
  onShareTimeline: function () {
    return {
      title: '来一起玩烧脑的文字推理游戏！',
      query: '',
      imageUrl: api.assets.local.shareImage
    };
  },

  /**
   * 处理分享给朋友
   */
  onShareAppMessage: function () {
    return {
      title: '来一起玩烧脑的文字推理游戏！',
      path: '/pages/index/index',
      imageUrl: api.assets.local.shareImage
    };
  },

  /**
   * 处理导航跳转
   * @param {object} event - 事件对象，包含 data-url 指定的跳转路径
   */
  handleNavigate(event) {
    const url = event.currentTarget.dataset.url;
    if (url) {
      wx.navigateTo({
        url: url,
        fail: (err) => {
          console.error('导航失败:', err);
          wx.showToast({
            title: '跳转失败，请稍后重试',
            icon: 'none',
            duration: 2000
          });
        }
      });
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 销毁store绑定实例，避免内存泄漏
    if (this.userStoreBindings) {
      destroyStoreBindings(this, this.userStoreBindings);
    }
  },

})