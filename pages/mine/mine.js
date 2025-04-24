// pages/mine/mine.js
// 定义常量
const USER_INFO_KEY = 'userInfo';
const DEFAULT_AVATAR_URL = '/static/images/default-avatar.jpg';

// 引入API模块
const api = require('../../utils/api');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    remainingAnswers: 0,
    defaultAvatarUrl: DEFAULT_AVATAR_URL,
    buttonConfig: {
      type: 'light',
      text: '登录'
    },
    isLoggingOut: false,
    // 用户信息设置弹窗
    showUserInfoModal: false,
    // 统计数据
    unsolvedCount: 0,
    solvedCount: 0,
    favoriteCount: 0,
    creationCount: 0,
    totalSoupCount: 0,
    pointsCount: 0,
    // 等级信息
    level: 1,
    levelTitle: '见习侦探',
    experience: 350,
    maxExperience: 1000
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.getUserInfo();
    this.getRemainingAnswers();
    this.getStatistics();
    this.getLevelInfo();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      });
    }
    // 每次显示页面时更新数据
    this.getUserInfo();
    this.getRemainingAnswers();
    this.getStatistics();
    this.getLevelInfo();
  },

  /**
   * 获取用户信息
   */
  getUserInfo() {
    try {
      // 从本地存储获取用户信息
      const userInfo = wx.getStorageSync(USER_INFO_KEY);

      if (userInfo) {
        this.setData({
          userInfo: userInfo,
          buttonConfig: {
            type: 'unlight',
            text: '退出登录'
          }
        });
      } else {
        this.setData({
          userInfo: null,
          buttonConfig: {
            type: 'light',
            text: '登录'
          }
        });
      }
      return userInfo;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  },

  /**
   * 获取剩余回答次数
   */
  getRemainingAnswers() {
    // 假设从本地存储或者调用API获取剩余次数
    const remainingAnswers = wx.getStorageSync('remainingAnswers') || 0;
    this.setData({
      remainingAnswers: remainingAnswers
    });
  },

  /**
   * 处理头像选择
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) return;

    // 更新本地存储和页面数据
    const userInfo = this.getUserInfo() || {};
    userInfo.avatarUrl = avatarUrl;
    wx.setStorageSync(USER_INFO_KEY, userInfo);

    // 更新页面数据
    this.setData({
      userInfo: userInfo
    });

    // 上传到服务器
    const config = {
      url: api.user_update_url,
      method: 'POST',
      data: {
        openid: userInfo.openId,
        avatarUrl: avatarUrl
      }
    };

    api.request(config).then(() => {
      // 头像更新成功
    }).catch(() => {
      // 头像更新失败，但本地已更新
    });
  },

  /**
   * 处理昵称输入
   */
  onInputNickname(e) {
    // 获取昵称值
    const value = e.detail.value || '';

    // 如果昵称为空，不进行处理
    if (!value) return;

    // 如果是在昵称输入框完成事件，更新昵称
    if (e.type === 'nicknamereview' || e.type === 'input') {
      // 获取用户信息
      const userInfo = this.getUserInfo() || {};

      // 更新本地存储
      userInfo.nickName = value;
      wx.setStorageSync(USER_INFO_KEY, userInfo);

      // 更新页面数据
      this.setData({
        userInfo: userInfo
      });

      // 构建更新请求
      const updateConfig = {
        url: api.user_update_url,
        method: 'POST',
        data: {
          openid: userInfo.openId,
          nickName: value
        }
      };

      // 发送请求到服务器
      api.request(updateConfig).then(() => {
        // 昵称更新成功
      }).catch(() => {
        // 昵称更新失败，但本地已更新
      });
    }
  },

  /**
   * 生成随机侦探ID
   */
  generateDetectiveId() {
    // 生成5位随机数字
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `一勺侦探#${randomNum}`;
  },

  /**
   * 解析侦探ID
   * 将昵称中的ID部分提取出来
   */
  parseDetectiveId(nickname) {
    if (!nickname) return { name: '未登录的侦探', id: '未登录' };

    const parts = nickname.split('#');
    if (parts.length > 1) {
      return {
        name: parts[0],
        id: parts[1]
      };
    }

    return {
      name: nickname,
      id: '未设置'
    };
  },

  /**
   * 打开用户信息设置弹窗
   */
  openUserInfoModal() {
    // 获取当前用户信息
    const userInfo = this.data.userInfo;

    // 如果昵称为空，生成随机侦探ID
    if (!userInfo.nickName) {
      const detectiveId = this.generateDetectiveId();

      // 更新页面数据，但不立即保存到本地存储
      // 等用户确认后再保存
      this.setData({
        'userInfo.nickName': detectiveId
      });
    }

    this.setData({
      showUserInfoModal: true
    });
  },

  /**
   * 关闭用户信息设置弹窗
   */
  closeUserInfoModal() {
    this.setData({
      showUserInfoModal: false
    });
  },

  /**
   * 确认信息设置
   */
  confirmUserInfo() {
    // 获取当前用户信息
    const userInfo = this.data.userInfo;

    // 如果昵称为空，生成随机侦探ID
    if (!userInfo.nickName) {
      userInfo.nickName = this.generateDetectiveId();
      this.setData({
        userInfo: userInfo
      });
    }

    // 保存到本地存储
    wx.setStorageSync(USER_INFO_KEY, userInfo);

    // 上传到服务器
    const updateConfig = {
      url: api.user_update_url,
      method: 'POST',
      data: {
        openid: userInfo.openId,
        nickName: userInfo.nickName
      }
    };

    api.request(updateConfig).then(() => {
      // 昵称更新成功
    });

    // 关闭弹窗
    this.closeUserInfoModal();

    // 显示登录成功提示
    wx.showToast({
      title: '侦探信息已设置',
      icon: 'success',
      duration: 2000
    });
  },

  /**
   * 使用默认侦探信息
   */
  skipUserInfo() {
    // 获取当前用户信息
    const userInfo = this.data.userInfo;

    // 如果昵称为空，生成随机侦探ID
    if (!userInfo.nickName) {
      userInfo.nickName = this.generateDetectiveId();
      this.setData({
        userInfo: userInfo
      });
    }

    // 保存到本地存储
    wx.setStorageSync(USER_INFO_KEY, userInfo);

    // 上传到服务器
    const updateConfig = {
      url: api.user_update_url,
      method: 'POST',
      data: {
        openid: userInfo.openId,
        nickName: userInfo.nickName
      }
    };

    api.request(updateConfig).then(() => {
      // 昵称更新成功
    });

    // 关闭弹窗
    this.closeUserInfoModal();

    // 显示登录成功提示
    wx.showToast({
      title: '侦探信息已设置',
      icon: 'success',
      duration: 2000
    });
  },

  /**
   * 处理登录
   */
  handleLogin(callback) {
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        const config = {
          url: api.user_login_url,
          method: 'POST',
          data: {
            code: res.code,
            userInfo: {
              avatarUrl: DEFAULT_AVATAR_URL,
              nickName: ''
            }
          }
        };

        api.request(config).then(res => {
          if (res.success && res.data) {
            // 构建用户信息
            const userInfo = {
              avatarUrl: res.data.userInfo?.avatarUrl || DEFAULT_AVATAR_URL,
              nickName: res.data.userInfo?.nickName || '',
              openId: res.data.openid,
              loginTime: new Date().getTime()
            };

            // 保存到本地存储
            wx.setStorageSync(USER_INFO_KEY, userInfo);
            wx.setStorageSync('loginTimestamp', new Date().getTime());

            // 更新页面数据
            this.setData({
              userInfo: userInfo,
              buttonConfig: {
                type: 'unlight',
                text: '退出登录'
              }
            });

            // 直接显示用户信息设置弹窗
            this.openUserInfoModal();

            // 如果有回调函数，执行回调
            if (typeof callback === 'function') {
              callback(userInfo);
            }
          } else {
            wx.showToast({
              title: '登录失败，请重试',
              icon: 'none'
            });
          }
        });
      },
      fail: () => {
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 处理退出登录
   */
  handleLogout() {
    // 如果未登录，则执行登录操作
    if (!this.data.userInfo) {
      this.handleLogin();
      return;
    }

    // 如果正在退出登录，则不再显示弹窗
    if (this.data.isLoggingOut) return;

    // 已登录，执行退出操作
    this.setData({ isLoggingOut: true }); // 设置标志位
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 直接清除本地登录信息，不需要调用后端接口
          this.doLogout();
        }
        // 无论是确认还是取消，都重置标志位
        this.setData({ isLoggingOut: false });
      },
      fail: () => this.setData({ isLoggingOut: false })
    });
  },

  /**
   * 执行退出登录操作
   */
  doLogout() {
    // 清除本地存储
    wx.removeStorageSync(USER_INFO_KEY);
    wx.removeStorageSync('loginTimestamp');

    // 重置数据
    this.setData({
      userInfo: null,
      remainingAnswers: 0,
      buttonConfig: {
        type: 'light',
        text: '登录'
      }
    });

    // 提示用户
    wx.showToast({
      title: '已退出登录',
      icon: 'success',
      duration: 2000
    });
  },

  /**
   * 防止滚动穿透
   */
  catchTouchMove() {
    return false;
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    if (!this.data.userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      return false;
    }
    return true;
  },

  /**
   * 导航到喝汤记录页面
   */
  navigateToSoupHistory() {
    if (!this.checkLoginStatus()) return;

    wx.showToast({
      title: '喝汤记录功能开发中',
      icon: 'none',
      duration: 2000
    });

    // 实际导航代码
    // wx.navigateTo({
    //   url: '/pages/soup-history/soup-history'
    // });
  },

  /**
   * 导航到我的收藏页面
   */
  navigateToFavorites() {
    if (!this.checkLoginStatus()) return;

    wx.showToast({
      title: '收藏功能开发中',
      icon: 'none',
      duration: 2000
    });

    // 实际导航代码
    // wx.navigateTo({
    //   url: '/pages/favorites/favorites'
    // });
  },

  /**
   * 导航到我的创作页面
   */
  navigateToCreations() {
    if (!this.checkLoginStatus()) return;

    wx.showToast({
      title: '创作功能开发中',
      icon: 'none',
      duration: 2000
    });

    // 实际导航代码
    // wx.navigateTo({
    //   url: '/pages/creations/creations'
    // });
  },

  /**
   * 导航到帮助与反馈页面
   */
  navigateToHelp() {
    wx.showToast({
      title: '帮助与反馈功能开发中',
      icon: 'none',
      duration: 2000
    });

    // 实际导航代码
    // wx.navigateTo({
    //   url: '/pages/help/help'
    // });
  },

  /**
   * 导航到关于一勺推理社页面
   */
  navigateToAbout() {
    wx.showToast({
      title: '关于页面开发中',
      icon: 'none',
      duration: 2000
    });

    // 实际导航代码
    // wx.navigateTo({
    //   url: '/pages/about/about'
    // });
  },

  /**
   * 导航到邀请有礼页面
   */
  navigateToInvite() {
    if (!this.checkLoginStatus()) return;

    wx.showToast({
      title: '邀请功能开发中',
      icon: 'none',
      duration: 2000
    });

    // 实际导航代码
    // wx.navigateTo({
    //   url: '/pages/invite/invite'
    // });
  },

  /**
   * 导航到我的积分页面
   */
  navigateToPoints() {
    if (!this.checkLoginStatus()) return;

    wx.showToast({
      title: '积分功能开发中',
      icon: 'none',
      duration: 2000
    });

    // 实际导航代码
    // wx.navigateTo({
    //   url: '/pages/points/points'
    // });
  },

  /**
   * 导航到个人信息页面
   */
  navigateToUserInfo() {
    if (!this.checkLoginStatus()) return;

    wx.showToast({
      title: '个人信息功能开发中',
      icon: 'none',
      duration: 2000
    });

    // 实际导航代码
    // wx.navigateTo({
    //   url: '/pages/user-info/user-info'
    // });
  },

  /**
   * 获取统计数据
   */
  getStatistics() {
    // 这里可以调用API获取真实数据
    // 目前使用模拟数据
    this.setData({
      unsolvedCount: 10,
      solvedCount: 2,
      favoriteCount: 12,
      creationCount: 8,
      totalSoupCount: 22,
      pointsCount: 25
    });
  },

  /**
   * 处理签到
   */
  handleSignIn() {
    if (!this.checkLoginStatus()) return;

    wx.showToast({
      title: '签到成功，积分+10',
      icon: 'success',
      duration: 2000
    });

    // 更新积分
    this.setData({
      pointsCount: this.data.pointsCount + 10
    });

    // 增加经验值
    this.addExperience(20);
  },

  /**
   * 获取等级信息
   * 实际应用中可以从服务器获取
   */
  getLevelInfo() {
    // 这里可以调用API获取真实数据
    // 目前使用模拟数据
    const levelTitles = ['见习侦探', '初级侦探', '中级侦探', '高级侦探', '特级侦探', '神探'];

    // 根据经验值计算等级
    let level = 1;
    let experience = this.data.experience || 350;
    let maxExperience = 1000;

    // 实际应用中可以根据经验值动态计算等级
    if (experience >= 900) {
      level = 6;
      maxExperience = 2000;
    } else if (experience >= 700) {
      level = 5;
      maxExperience = 1000;
    } else if (experience >= 500) {
      level = 4;
      maxExperience = 800;
    } else if (experience >= 300) {
      level = 3;
      maxExperience = 600;
    } else if (experience >= 100) {
      level = 2;
      maxExperience = 400;
    }

    this.setData({
      level,
      levelTitle: levelTitles[level - 1],
      maxExperience
    });
  },

  /**
   * 增加经验值
   */
  addExperience(amount) {
    let experience = this.data.experience + amount;

    // 如果经验值超过最大值，升级
    if (experience >= this.data.maxExperience) {
      const overflow = experience - this.data.maxExperience;
      const newLevel = this.data.level + 1;
      const levelTitles = ['见习侦探', '初级侦探', '中级侦探', '高级侦探', '特级侦探', '神探'];
      const newMaxExp = this.data.maxExperience + 200; // 每升一级增加200经验上限

      this.setData({
        level: newLevel,
        levelTitle: levelTitles[Math.min(newLevel - 1, levelTitles.length - 1)],
        experience: overflow,
        maxExperience: newMaxExp
      });

      wx.showToast({
        title: '恭喜升级！',
        icon: 'success',
        duration: 2000
      });
    } else {
      this.setData({
        experience
      });
    }
  },

  /**
   * 导航到未解决页面
   */
  navigateToUnsolved() {
    if (!this.checkLoginStatus()) return;

    wx.showToast({
      title: '未解决功能开发中',
      icon: 'none',
      duration: 2000
    });

    // 实际导航代码
    // wx.navigateTo({
    //   url: '/pages/unsolved/unsolved'
    // });
  },

  /**
   * 导航到已解决页面
   */
  navigateToSolved() {
    if (!this.checkLoginStatus()) return;

    wx.showToast({
      title: '已解决功能开发中',
      icon: 'none',
      duration: 2000
    });

    // 实际导航代码
    // wx.navigateTo({
    //   url: '/pages/solved/solved'
    // });
  }
})