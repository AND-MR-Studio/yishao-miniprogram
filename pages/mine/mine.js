// pages/mine/mine.js - 纯UI页面层

// 引入API模块
const { assets } = require('../../config/assets');
const { rootStore } = require('../../stores/index');
const { createStoreBindings, destroyStoreBindings } = require('mobx-miniprogram-bindings');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 用户相关数据将由 userStore 绑定提供：
    // userInfo, detectiveInfo, hasSignedIn, isLoggedIn, loading
    defaultAvatarUrl: assets.local.avatar,
    // 用户信息设置弹窗
    showUserInfoModal: false,
    // 临时输入的昵称（用于保存时获取用户输入）
    tempNickname: '',
    // 汤面列表弹窗
    showSoupListModal: false,
    // 汤面列表类型: 'unsolved', 'solved', 'creations', 'favorites'
    soupListType: 'unsolved'
  },/**
   * 生命周期函数--监听页面加载
   */  async onLoad() {
    // 创建userStore绑定
    this.userStoreBindings = createStoreBindings(this, {
      store: rootStore.userStore,
      fields: [
        // 核心用户数据
        "userInfo",           // 原始用户信息对象
        "isLoggedIn",         // 登录状态 - 按钮显示需要

        // 侦探相关信息
        "detectiveInfo",      // 完整侦探信息 - detective-card组件需要
        "hasSignedIn",        // 签到状态 - detective-card组件需要

        // 加载状态 - 直接访问loading对象
        "loading"             // 统一加载状态对象
      ],
      actions: [
        "syncUserInfo",       // 同步用户信息
        "login",              // 登录操作
        "logout",             // 退出登录操作
        "updateUserProfile"   // 更新用户资料
      ]
    });

    // 创建settingStore绑定 - 用于引导层管理
    this.settingStoreBindings = createStoreBindings(this, {
      store: rootStore.settingStore,
      fields: ['showGuide'], // 引导层显示状态
      actions: []
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
  },


  /**
   * 处理头像选择
   */
  async onChooseAvatar(e) {
    // 防止重复调用
    if (this.data.loading.profile) {
      return;
    }

    const { avatarUrl } = e.detail;
    if (!avatarUrl) {
      return;
    }

    try {
      // 调用updateUserProfile action更新头像
      const result = await this.updateUserProfile({ avatarUrl });

      // 统一处理结果，只显示一个提示
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
        title: '网络异常，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 处理昵称输入
   */
  onInputNickname(e) {
    const value = e.detail.value || '';
    
    // 实时长度检查，超过限制时提示并截断
    if (value.length > 10) {
      wx.showToast({
        title: '昵称最多10个字',
        icon: 'none',
        duration: 1500
      });
      
      // 截断到最大长度
      const trimmedValue = value.substring(0, 10);
      // 临时保存截断后的值
      this.setData({ tempNickname: trimmedValue });
      return trimmedValue;
    }
    
    // 临时保存输入值，供保存时使用
    this.setData({ tempNickname: value });
    return value;
  },
  /**
  
   */
  openUserInfoModal() {
    // 直接显示弹窗，数据绑定会自动处理内容
    this.setData({
      showUserInfoModal: true
    });
  },

  /**
   * 关闭用户信息设置弹窗
   */
  closeUserInfoModal() {
    this.setData({
      showUserInfoModal: false,
      tempNickname: '' // 清除临时输入值
    });
    // 关闭弹窗后，调用绑定的 syncUserInfo action 刷新用户信息，确保页面显示最新数据
    this.syncUserInfo();
  },

  /**
   * 保存用户信息
   */
  async saveUserInfo() {

    // 获取临时输入的昵称，如果没有则使用当前 detectiveInfo 中的昵称
    const inputNickname = this.data.tempNickname || this.data.detectiveInfo?.nickName || '';
    const trimmedNickname = inputNickname.trim();
    
    // 检查昵称是否为空
    if (!trimmedNickname) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    try {
      // 调用 store 的 updateUserProfile action
      const result = await this.updateUserProfile({
        nickname: trimmedNickname
      });

      if (result.success) {
        wx.showToast({
          title: '用户信息保存成功',
          icon: 'success',
          duration: 2000
        });
        
        // 清除临时输入值
        this.setData({ tempNickname: '' });
        this.closeUserInfoModal();
      } else {
        wx.showToast({
          title: result.error || '用户信息保存失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('保存用户信息异常:', error);
      wx.showToast({
        title: '网络异常，请稍后重试',
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
      showUserInfoModal: false,
      tempNickname: '' // 清除临时输入值
    });
    // 跳过设置后，调用绑定的 syncUserInfo action 刷新用户信息，确保页面显示最新数据
    this.syncUserInfo();
  },

  /**
   * 处理登录/退出登录按钮点击
   */
  async handleLogin() {
    // 防止重复点击
    if (this.data.loading.login || this.data.loading.logout) {
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
   * 处理分享到朋友圈
   */
  onShareTimeline: function () {
    return {
      title: '来一起玩烧脑的海龟汤推理游戏！',
      query: '',
      imageUrl: api.assets.local.shareImage
    };
  },

  /**
   * 处理分享给朋友
   */
  onShareAppMessage: function () {
    return {
      title: '来一起玩烧脑的海龟汤推理游戏！',
      path: '/pages/index/index',
      imageUrl: api.assets.local.shareImage
    };
  },
  /**
   * 处理 Banner 点击事件
   */
  handleBannerTap(event) {
    console.log('Banner 点击事件:', event.detail);
  },

  // ===== Detective Card 相关事件处理 =====
  
  /**
   * 处理签到结果回调
   */
  handleSignInResult(e) {
    const { success, error } = e.detail;
    if (success) {
      wx.showToast({
        title: '签到成功！已获得提问机会',
        icon: 'success',
        duration: 2000
      });
      // 签到成功后刷新用户信息
      this.syncUserInfo();
    } else {
      wx.showToast({
        title: error || '签到失败',
        icon: 'none',
        duration: 2000
      });
    }
  },


  /**
   * 处理detective-card导航事件
   */
  handleSoupList(e) {
    const { page } = e.detail;
    
    // 检查登录状态
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 设置汤面列表类型并显示弹窗
    this.setData({
      soupListType: page,
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
   * 导航到关于页面
   */
  navigateToAbout() {
    wx.navigateTo({
      url: '/pages/about/about',
      fail: (err) => {
        console.error('导航到关于页面失败:', err);
        wx.showToast({
          title: '跳转失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },


  // ===== 指南相关事件处理 =====
  /**
   * 显示指南层
   * 通过settingStore统一管理指南状态
   */
  onShowGuide() {
    // 调用rootStore.settingStore的toggleGuide方法显示引导层
    rootStore.settingStore.toggleGuide(true);
  },

  /**
   * 关闭指南层
   * 通过rootStore.settingStore统一管理指南状态
   */
  onCloseGuide() {
    // 调用rootStore.settingStore的toggleGuide方法隐藏引导层
    rootStore.settingStore.toggleGuide(false);
  },

  /**
   * 生命周期函数--监听页面卸载
   */  onUnload() {
    // 销毁store绑定实例，避免内存泄漏
    if (this.userStoreBindings) {
      destroyStoreBindings(this, this.userStoreBindings);
    }
    if (this.settingStoreBindings) {
      destroyStoreBindings(this, this.settingStoreBindings);
    }
  },

})