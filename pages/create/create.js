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

    // 本地标签数据 - 不使用MobX管理
    selectedTags: [],
    tagPool: [
      '荒诞', '恐怖', '灵异',
      '科幻', '奇幻',  '历史',
      '爱情', '喜剧'
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
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
        'hasDraft'
      ],
      actions: [
        'updateField',
        'validateForm',
        'resetForm',
        'submitForm',
        'saveDraft',
        'loadDraft',
        'clearDraft'
      ]
    });

    // 检查用户是否已登录
    if (!rootStore.isLoggedIn) {
      // 显示登录提示弹窗
      const loginPopup = this.selectComponent("#loginPopup");
      if (loginPopup) {
        loginPopup.show();
      }
    }

    // 如果有标题参数，则预填充标题输入框
    if (options && options.title && (!this.data.formData || !this.data.formData.title)) {
      this.updateField('title', decodeURIComponent(options.title));
    }

    // 如果需要加载草稿，则从本地缓存加载草稿数据
    if (options && options.loadDraft === 'true') {
      const loaded = this.loadDraft();
      if (loaded) {
        // 同步标签数据到本地
        this.setData({
          selectedTags: this.data.formData.tags || []
        });

        // 显示提示
        wx.showToast({
          title: '已加载草稿',
          icon: 'success',
          duration: 2000
        });
      }
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 解绑MobX Store
    this.storeBindings.destroyStoreBindings();
  },

  /**
   * 处理标题输入
   */
  handleTitleInput(e) {
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
   * 处理标签点击
   * @param {Object} e 事件对象
   */
  handleTagClick(e) {
    const tag = e.currentTarget.dataset.tag;
    console.log('标签点击:', tag);

    // 获取当前已选标签
    const selectedTags = [...this.data.selectedTags];

    // 如果标签已存在，不添加
    if (selectedTags.includes(tag)) {
      return;
    }

    // 如果已达到最大数量(3个)，不添加
    if (selectedTags.length >= 3) {
      wx.showToast({
        title: '最多选择3个标签',
        icon: 'none'
      });
      return;
    }

    // 添加标签
    selectedTags.push(tag);

    // 更新页面数据
    this.setData({ selectedTags });
  },

  /**
   * 处理标签删除
   * @param {Object} e 事件对象
   */
  handleTagRemove(e) {
    const tag = e.currentTarget.dataset.tag;
    console.log('删除标签:', tag);

    // 获取当前已选标签
    const selectedTags = this.data.selectedTags.filter(t => t !== tag);

    // 更新页面数据
    this.setData({ selectedTags });
  },





  /**
   * 提交表单
   */
  handleSubmit() {
    // 如果正在提交中，不处理点击
    if (this.data.isSubmitting) {
      return;
    }

    // 检查用户是否已登录
    if (!rootStore.isLoggedIn) {
      // 显示登录提示弹窗
      const loginPopup = this.selectComponent("#loginPopup");
      if (loginPopup) {
        loginPopup.show();
      }
      return;
    }

    // 验证标签
    if (this.data.selectedTags.length === 0) {
      wx.showToast({
        title: '请至少选择一个标签',
        icon: 'none'
      });
      return;
    }

    // 将本地标签数据同步到formData
    this.updateField('tags', this.data.selectedTags);

    // 设置提交状态
    this.setData({
      isSubmitting: true
    });

    // 提交表单
    this.submitForm().then(result => {
      if (result.success) {
        wx.showToast({
          title: '创建成功',
          icon: 'success',
          duration: 2000
        });

        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      } else {
        wx.showToast({
          title: result.message || '创建失败',
          icon: 'none',
          duration: 2000
        });
      }

      // 重置提交状态
      this.setData({
        isSubmitting: false
      });
    }).catch(error => {
      console.error('提交表单失败:', error);

      // 显示错误提示
      wx.showToast({
        title: '提交失败，请稍后重试',
        icon: 'none',
        duration: 2000
      });

      // 重置提交状态
      this.setData({
        isSubmitting: false
      });
    });
  },

  /**
   * 返回上一页
   */
  handleBack() {
    wx.navigateBack();
  },

  /**
   * 保存草稿
   */
  handleSaveDraft() {
    // 将本地标签数据同步到formData
    this.updateField('tags', this.data.selectedTags);

    // 保存草稿
    const saved = this.saveDraft();

    if (saved) {
      wx.showToast({
        title: '草稿已保存',
        icon: 'success',
        duration: 2000
      });
    } else {
      wx.showToast({
        title: '保存失败',
        icon: 'none',
        duration: 2000
      });
    }
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

})
