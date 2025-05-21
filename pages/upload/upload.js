/**
 * 海龟汤创建页面
 * 负责创建新的海龟汤内容
 */
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { uploadStore, rootStore } = require('../../stores/index');
const { assets } = require('../../config/api');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 表单数据 - 由MobX管理
    formData: {
      title: '',
      content: '',
      truth: ''
    },
    // 表单验证状态 - 由MobX管理
    validation: {
      titleError: '',
      contentError: '',
      truthError: ''
    },
    // 加载状态 - 由MobX管理
    isSubmitting: false,

    // 页面状态 - 由MobX管理
    showEmptyState: false,

    // 已发布的汤 - 由MobX管理
    publishedSoups: [],

    // 用户创建的汤总数 - 从userinfo.createsoup获取
    createdSoupCount: 0,

    // 新建创作卡片标题输入
    createTitle: '',
    createTitleLength: 0,

    assets
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    // 创建MobX Store绑定
    this.storeBindings = createStoreBindings(this, {
      store: uploadStore,
      fields: [
        'formData',
        'validation',
        'isSubmitting',
        'titleLength',
        'contentLength',
        'truthLength',
        'showEmptyState',
        'publishedSoups',
        'hasDraft'
      ],
      actions: [
        'updateField',
        'validateForm',
        'resetForm',
        'submitForm',
        'loadPublishedSoups',
        'checkDraft'
      ]
    });

    // 加载已发布的汤
    this.loadData();
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      // 加载已发布的汤
      if (rootStore.isLoggedIn) {
        await this.loadPublishedSoups();

        // 获取用户信息，更新创建的汤数量
        this.updateCreatedSoupCount();
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  },

  /**
   * 更新用户创建的汤数量
   */
  updateCreatedSoupCount() {
    try {
      // 检查用户是否已登录
      if (!rootStore.isLoggedIn) {
        this.setData({ createdSoupCount: 0 });
        return;
      }

      // 从rootStore获取用户信息
      const userInfo = wx.getStorageSync('userInfo');

      // 更新创建的汤数量
      if (userInfo && userInfo.creationCount !== undefined) {
        // 使用creationCount字段
        this.setData({ createdSoupCount: userInfo.creationCount || 0 });
      } else {
        this.setData({ createdSoupCount: 0 });
      }
    } catch (error) {
      console.error('获取用户创建的汤数量失败:', error);
      this.setData({ createdSoupCount: 0 });
    }
  },



  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 设置TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }

    // 每次页面显示时重新加载数据
    this.loadData();

    // 检查是否有草稿
    this.checkDraft();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 解绑MobX Store
    this.storeBindings.destroyStoreBindings();
  },

  /**
   * 处理表单标题输入
   */
  handleFormTitleInput(e) {
    this.updateField('title', e.detail.value);
  },

  /**
   * 处理汤面内容输入
   */
  handleContentInput(e) {
    this.updateField('content', e.detail.value);
  },

  /**
   * 处理汤底内容输入
   */
  handleTruthInput(e) {
    this.updateField('truth', e.detail.value);
  },



  /**
   * 处理创建卡片标题输入
   */
  handleTitleInput(e) {
    const title = e.detail.value;
    // 更新页面数据
    this.setData({
      createTitle: title,
      createTitleLength: title.length
    });

    // 同步更新到MobX store，确保跳转到create页面时能正确传递
    this.updateField('title', title);
  },

  /**
   * 跳转到创建页面
   */
  handleShowForm() {
    // 检查用户是否已登录
    if (!rootStore.isLoggedIn) {
      // 显示登录提示弹窗
      const loginPopup = this.selectComponent("#loginPopup");
      if (loginPopup) {
        loginPopup.show();
      }
      return;
    }

    // 跳转到创建页面
    // 由于已经通过updateField更新了MobX store中的title，
    // 不需要再通过URL参数传递，直接跳转即可
    wx.navigateTo({
      url: '/pages/create/create'
    });
  },

  /**
   * 处理登录弹窗确认按钮点击事件
   */
  onLoginConfirm() {
    // 跳转到个人中心页面
    wx.switchTab({
      url: "/pages/mine/mine",
    });
  },

  /**
   * 处理登录弹窗取消按钮点击事件
   */
  onLoginCancel() {
    // 不做任何处理，弹窗会自动关闭
  },



  /**
   * 查看已发布的汤
   */
  handleViewPublishedSoup(e) {
    const soupId = e.currentTarget.dataset.id;
    const soup = this.data.publishedSoups.find(s => s.id === soupId);

    if (soup.status === 'rejected') {
      // 如果是被驳回的汤，显示驳回原因
      wx.showModal({
        title: '审核未通过',
        content: soup.reason || '内容不符合规范',
        confirmText: '修改重提',
        success: (res) => {
          if (res.confirm) {
            // TODO: 实现修改重提功能
            wx.showToast({
              title: '修改重提功能开发中',
              icon: 'none'
            });
          }
        }
      });
    } else {
      // 如果是审核中或已上架的汤，跳转到详情页
      wx.navigateTo({
        url: `/pages/soup/soup?id=${soupId}`
      });
    }
  },

  /**
   * 提交表单
   */
  handleSubmit() {
    // 检查用户是否已登录
    if (!rootStore.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再创建海龟汤',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/mine/mine'
          });
        }
      });
      return;
    }

    // 提交表单
    this.submitForm().then(result => {
      if (result.success) {
        wx.showToast({
          title: '创建成功',
          icon: 'success',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: result.message || '创建失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '舀一勺谜题，熬一锅真相。随时随地和AI玩推理解谜~',
      path: '/pages/upload/upload'
    };
  },

  /**
   * 打开草稿
   */
  handleOpenDraft() {
    // 检查用户是否已登录
    if (!rootStore.isLoggedIn) {
      // 显示登录提示弹窗
      const loginPopup = this.selectComponent("#loginPopup");
      if (loginPopup) {
        loginPopup.show();
      }
      return;
    }

    // 检查是否有草稿
    if (this.data.hasDraft) {
      // 跳转到创建页面并传递loadDraft参数
      wx.navigateTo({
        url: '/pages/create/create?loadDraft=true'
      });
    } else {
      // 无草稿时显示提示
      wx.showToast({
        title: '暂无草稿，去创建一个吧~',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 刷新页面数据
   * 当导航栏左侧按钮点击时触发
   */
  onRefreshPage() {
    console.log('刷新煮汤页面数据');
    // 重新加载已发布的汤
    this.loadData();
    // 检查是否有草稿
    this.checkDraft();
  }
})