/**
 * 海龟汤创建页面
 * 负责创建新的海龟汤内容
 */
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { uploadStore, rootStore } = require('../../stores/index');

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
    isUploading: false,
    uploadProgress: 0,

    // 页面状态 - 由MobX管理
    showCreateForm: false,
    showEmptyState: false,

    // 草稿和已发布的汤 - 由MobX管理
    drafts: [],
    publishedSoups: [],

    // 新建创作卡片标题输入
    createTitle: '',
    createTitleLength: 0
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
        'isUploading',
        'uploadProgress',
        'titleLength',
        'contentLength',
        'truthLength',
        'showCreateForm',
        'showEmptyState',
        'drafts',
        'publishedSoups'
      ],
      actions: [
        'updateField',
        'validateForm',
        'resetForm',
        'submitForm',
        'showForm',
        'hideForm',
        'loadDrafts',
        'saveDraft',
        'deleteDraft',
        'editDraft',
        'loadPublishedSoups'
      ]
    });

    // 加载草稿和已发布的汤
    this.loadData();
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      // 加载草稿
      await this.loadDrafts();

      // 加载已发布的汤
      if (rootStore.isLoggedIn) {
        await this.loadPublishedSoups();
      }
    } catch (error) {
      console.error('加载数据失败:', error);
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
    this.setData({
      createTitle: title,
      createTitleLength: title.length
    });
  },

  /**
   * 跳转到创建页面
   */
  handleShowForm() {
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

    // 跳转到创建页面，并传递标题参数
    wx.navigateTo({
      url: `/pages/create/create${this.data.createTitle ? '?title=' + encodeURIComponent(this.data.createTitle) : ''}`
    });
  },

  /**
   * 保存草稿
   */
  handleSaveDraft() {
    this.saveDraft().then(result => {
      if (result.success) {
        wx.showToast({
          title: '草稿保存成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result.message || '保存失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 删除草稿
   */
  handleDeleteDraft(e) {
    const draftId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '提示',
      content: '确定要删除这个草稿吗？',
      success: (res) => {
        if (res.confirm) {
          const result = this.deleteDraft(draftId);

          if (result.success) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: result.message || '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 编辑草稿
   */
  handleEditDraft(e) {
    const draftId = e.currentTarget.dataset.id;

    // 跳转到创建页面，并传递草稿ID
    wx.navigateTo({
      url: `/pages/create/create?draftId=${draftId}`
    });
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

        // 显示获得喝汤机会的提示
        wx.showToast({
          title: '已获得20次喝汤机会',
          icon: 'none',
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
      title: '创建你的海龟汤',
      path: '/pages/upload/upload'
    };
  },

  /**
   * 刷新页面数据
   * 当导航栏左侧按钮点击时触发
   */
  onRefreshPage() {
    console.log('刷新煮汤页面数据');
    // 重新加载草稿和已发布的汤
    this.loadData();

    // 显示刷新提示
    wx.showToast({
      title: '数据已刷新',
      icon: 'success',
      duration: 1500
    });
  }
})