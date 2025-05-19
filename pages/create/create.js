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
      truth: '',
      image: '',
      imageUrl: ''
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
    uploadProgress: 0
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
        'isUploading',
        'uploadProgress',
        'titleLength',
        'contentLength',
        'truthLength'
      ],
      actions: [
        'updateField',
        'validateForm',
        'resetForm',
        'submitForm',
        'uploadImage',
        'saveDraft'
      ]
    });

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
    }

    // 如果有草稿ID参数，则加载草稿
    if (options && options.draftId) {
      this.loadDraft(options.draftId);
    }

    // 如果有标题参数，则预填充标题输入框
    if (options && options.title) {
      this.updateField('title', decodeURIComponent(options.title));
    }
  },

  /**
   * 加载草稿
   */
  loadDraft(draftId) {
    if (!draftId) return;

    const result = uploadStore.editDraft(draftId);
    if (!result.success) {
      wx.showToast({
        title: result.message || '加载草稿失败',
        icon: 'none'
      });
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
   * 选择图片
   */
  handleChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;

        // 更新临时图片路径
        this.updateField('image', tempFilePath);

        // 上传图片
        this.uploadImage(tempFilePath).then(imageUrl => {
          if (imageUrl) {
            wx.showToast({
              title: '图片上传成功',
              icon: 'success'
            });
          }
        });
      }
    });
  },

  /**
   * 预览图片
   */
  handlePreviewImage() {
    wx.previewImage({
      urls: [this.data.formData.image],
      current: this.data.formData.image
    });
  },

  /**
   * 删除图片
   */
  handleDeleteImage() {
    this.updateField('image', '');
    this.updateField('imageUrl', '');
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

        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.message || '保存失败',
          icon: 'none'
        });
      }
    });
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
    // 如果表单有内容，提示是否保存草稿
    if (this.data.formData.title || this.data.formData.content || this.data.formData.truth) {
      wx.showModal({
        title: '提示',
        content: '是否保存为草稿？',
        confirmText: '保存',
        cancelText: '不保存',
        success: (res) => {
          if (res.confirm) {
            this.handleSaveDraft();
          } else {
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.navigateBack();
    }
  }
})
