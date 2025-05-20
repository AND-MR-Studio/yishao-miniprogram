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
    isSubmitting: false
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
        'truthLength'
      ],
      actions: [
        'updateField',
        'validateForm',
        'resetForm',
        'submitForm'
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
    if (options && options.title) {
      this.updateField('title', decodeURIComponent(options.title));
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
   * 提交表单
   */
  handleSubmit() {
    // 检查用户是否已登录
    if (!rootStore.isLoggedIn) {
      // 显示登录提示弹窗
      const loginPopup = this.selectComponent("#loginPopup");
      if (loginPopup) {
        loginPopup.show();
      }
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
    });
  },

  /**
   * 返回上一页
   */
  handleBack() {
    wx.navigateBack();
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
  }
})
