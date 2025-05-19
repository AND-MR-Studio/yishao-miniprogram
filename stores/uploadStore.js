/**
 * uploadStore.js
 * 海龟汤创建页面的状态管理
 * 负责管理上传表单数据和交互状态
 */
const { makeAutoObservable, flow } = require('mobx-miniprogram');
const soupService = require('../service/soupService');
const { api, uploadFile } = require('../config/api');

/**
 * UploadStore类
 * 管理海龟汤创建页面的状态
 */
class UploadStore {
  // ===== 可观察状态 =====
  // 表单数据
  formData = {
    title: '',       // 标题
    content: '',     // 汤面内容
    truth: '',       // 汤底内容
    image: '',       // 图片临时路径
    imageUrl: '',    // 图片上传后的URL
  };

  // 表单验证状态
  validation = {
    titleError: '',
    contentError: '',
    truthError: '',
  };

  // 加载状态
  isSubmitting = false;  // 是否正在提交
  isUploading = false;   // 是否正在上传图片
  uploadProgress = 0;    // 上传进度（0-100）

  // 草稿箱
  drafts = [];           // 草稿列表

  // 已发布的汤
  publishedSoups = [];   // 已发布的汤列表

  // 页面状态
  showCreateForm = false;  // 是否显示创建表单
  showEmptyState = false;  // 是否显示空态

  // 引用rootStore
  rootStore = null;

  constructor(rootStore) {
    // 保存rootStore引用
    this.rootStore = rootStore;

    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      submitForm: flow,
      uploadImage: flow,
      loadDrafts: flow,
      saveDraft: flow,
      loadPublishedSoups: flow,

      // 标记为非观察属性
      rootStore: false,
    });
  }

  // 获取用户ID的计算属性
  get userId() {
    return this.rootStore.userId;
  }

  // 获取登录状态的计算属性
  get isLoggedIn() {
    return this.rootStore.isLoggedIn;
  }

  // 标题字数计算属性
  get titleLength() {
    return this.formData.title ? this.formData.title.length : 0;
  }

  // 汤面内容字数计算属性
  get contentLength() {
    return this.formData.content ? this.formData.content.length : 0;
  }

  // 汤底内容字数计算属性
  get truthLength() {
    return this.formData.truth ? this.formData.truth.length : 0;
  }

  /**
   * 更新表单字段
   * @param {string} field 字段名
   * @param {string} value 字段值
   */
  updateField(field, value) {
    if (field in this.formData) {
      this.formData[field] = value;
      // 清除对应的验证错误
      if (field in this.validation) {
        this.validation[`${field}Error`] = '';
      }
    }
  }

  /**
   * 验证表单
   * @returns {boolean} 表单是否有效
   */
  validateForm() {
    let isValid = true;

    // 验证标题
    if (!this.formData.title.trim()) {
      this.validation.titleError = '请输入标题';
      isValid = false;
    } else if (this.formData.title.length > 15) {
      this.validation.titleError = '标题不能超过15个字符';
      isValid = false;
    }

    // 验证汤面内容
    if (!this.formData.content.trim()) {
      this.validation.contentError = '请输入汤面内容';
      isValid = false;
    } else if (this.formData.content.length > 100) {
      this.validation.contentError = '汤面内容不能超过100个字符';
      isValid = false;
    }

    // 验证汤底内容
    if (!this.formData.truth.trim()) {
      this.validation.truthError = '请输入汤底内容';
      isValid = false;
    } else if (this.formData.truth.length > 500) {
      this.validation.truthError = '汤底内容不能超过500个字符';
      isValid = false;
    }

    return isValid;
  }

  /**
   * 重置表单
   */
  resetForm() {
    this.formData = {
      title: '',
      content: '',
      truth: '',
      image: '',
      imageUrl: '',
    };

    this.validation = {
      titleError: '',
      contentError: '',
      truthError: '',
    };

    this.uploadProgress = 0;
  }

  /**
   * 显示创建表单
   */
  showForm() {
    this.showCreateForm = true;
  }

  /**
   * 隐藏创建表单
   */
  hideForm() {
    this.showCreateForm = false;
  }

  /**
   * 加载草稿列表
   */
  *loadDrafts() {
    try {
      // 从本地存储加载草稿
      const draftsStr = wx.getStorageSync('soup_drafts');
      if (draftsStr) {
        this.drafts = JSON.parse(draftsStr);
      } else {
        this.drafts = [];
      }

      // 检查是否需要显示空态
      this.checkEmptyState();

      return this.drafts;
    } catch (error) {
      console.error('加载草稿失败:', error);
      this.drafts = [];
      return [];
    }
  }

  /**
   * 保存草稿
   */
  *saveDraft() {
    try {
      // 验证表单是否有内容
      if (!this.formData.title && !this.formData.content && !this.formData.truth) {
        return { success: false, message: '草稿内容为空' };
      }

      // 创建草稿对象
      const draft = {
        id: Date.now().toString(),
        title: this.formData.title || '空白草稿',
        content: this.formData.content,
        truth: this.formData.truth,
        image: this.formData.imageUrl,
        updateTime: new Date().toISOString()
      };

      // 添加到草稿列表
      this.drafts.unshift(draft);

      // 保存到本地存储
      wx.setStorageSync('soup_drafts', JSON.stringify(this.drafts));

      // 重置表单
      this.resetForm();

      // 隐藏创建表单
      this.hideForm();

      // 检查是否需要显示空态
      this.checkEmptyState();

      return { success: true, message: '草稿保存成功' };
    } catch (error) {
      console.error('保存草稿失败:', error);
      return { success: false, message: '保存草稿失败: ' + error.message };
    }
  }

  /**
   * 删除草稿
   * @param {string} draftId 草稿ID
   */
  deleteDraft(draftId) {
    try {
      // 从草稿列表中删除
      this.drafts = this.drafts.filter(draft => draft.id !== draftId);

      // 保存到本地存储
      wx.setStorageSync('soup_drafts', JSON.stringify(this.drafts));

      // 检查是否需要显示空态
      this.checkEmptyState();

      return { success: true, message: '草稿删除成功' };
    } catch (error) {
      console.error('删除草稿失败:', error);
      return { success: false, message: '删除草稿失败: ' + error.message };
    }
  }

  /**
   * 继续编辑草稿
   * @param {string} draftId 草稿ID
   */
  editDraft(draftId) {
    try {
      // 查找草稿
      const draft = this.drafts.find(d => d.id === draftId);
      if (!draft) {
        return { success: false, message: '草稿不存在' };
      }

      // 加载草稿到表单
      this.formData = {
        title: draft.title,
        content: draft.content,
        truth: draft.truth,
        image: '',
        imageUrl: draft.image
      };

      // 显示创建表单
      this.showForm();

      return { success: true };
    } catch (error) {
      console.error('编辑草稿失败:', error);
      return { success: false, message: '编辑草稿失败: ' + error.message };
    }
  }

  /**
   * 上传图片
   * @param {string} tempFilePath 临时文件路径
   * @returns {Promise<string>} 上传后的图片URL
   */
  *uploadImage(tempFilePath) {
    if (!tempFilePath) return '';

    try {
      this.isUploading = true;
      this.uploadProgress = 0;

      // 更新临时路径
      this.formData.image = tempFilePath;

      // 上传图片到服务器
      const result = yield uploadFile({
        url: api.asset.upload,
        filePath: tempFilePath,
        name: 'file',
        formData: {
          type: 'image',
          name: `soup_image_${Date.now()}`,
          description: `海龟汤图片 - ${this.formData.title || '未命名'}`,
          compress: 'true'
        }
      });

      if (result && result.success && result.data && result.data.url) {
        // 更新图片URL
        this.formData.imageUrl = result.data.url;
        this.uploadProgress = 100;
        return result.data.url;
      } else {
        throw new Error('图片上传失败');
      }
    } catch (error) {
      console.error('上传图片失败:', error);
      wx.showToast({
        title: '图片上传失败',
        icon: 'none'
      });
      return '';
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * 提交表单创建海龟汤
   * @returns {Promise<Object>} 创建结果
   */
  *submitForm() {
    // 表单验证
    if (!this.validateForm()) {
      return { success: false, message: '请完善表单信息' };
    }

    try {
      this.isSubmitting = true;

      // 准备提交数据
      const soupData = {
        title: this.formData.title.trim(),
        content: this.formData.content.trim(),
        truth: this.formData.truth.trim(),
        image: this.formData.imageUrl || '',
        soupType: 1, // DIY汤
      };

      // 调用创建接口
      const response = yield soupService.createSoup(soupData);

      if (!response) {
        throw new Error('创建失败，请稍后重试');
      }

      // 重置表单
      this.resetForm();

      // 隐藏创建表单
      this.hideForm();

      // 加载已发布的汤
      yield this.loadPublishedSoups();

      return {
        success: true,
        message: '创建成功',
        soupId: response.soupId || response.id
      };
    } catch (error) {
      console.error('创建海龟汤失败:', error);
      return {
        success: false,
        message: '创建失败: ' + (error.message || '未知错误')
      };
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * 加载已发布的汤
   */
  *loadPublishedSoups() {
    try {
      // 调用API获取用户创建的汤
      if (!this.userId) {
        this.publishedSoups = [];
        return [];
      }

      // 调用真实API获取用户创建的汤
      const response = yield soupService.getUserCreatedSoups(this.userId);

      if (response && Array.isArray(response)) {
        this.publishedSoups = response;
      } else {
        this.publishedSoups = [];
      }

      // 检查是否需要显示空态
      this.checkEmptyState();

      return this.publishedSoups;
    } catch (error) {
      console.error('加载已发布的汤失败:', error);
      this.publishedSoups = [];
      return [];
    }
  }

  /**
   * 检查是否需要显示空态
   */
  checkEmptyState() {
    this.showEmptyState = this.drafts.length === 0 && this.publishedSoups.length === 0;
  }
}

// 导出类
module.exports = {
  UploadStoreClass: UploadStore,
};
