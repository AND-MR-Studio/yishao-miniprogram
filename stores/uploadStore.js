/**
 * uploadStore.js
 * 海龟汤创建页面的状态管理
 * 负责管理上传表单数据和交互状态
 */
const { makeAutoObservable, flow } = require('mobx-miniprogram');
const soupService = require('../service/soupService');

/**
 * UploadStore类
 * 管理海龟汤创建页面的状态
 */
class UploadStore {
  // 核心状态
  formData = {
    title: '',     // 标题
    content: '',   // 汤面内容
    truth: '',     // 汤底内容
    tags: [],      // 标签（数组）
  };

  // 预设标签池
  tagPool = [
    '悬疑', '推理', '恐怖', '灵异',
    '科幻', '奇幻', '冒险', '历史',
    '爱情', '喜剧', '悲剧', '犯罪',
    '心理', '哲理', '社会', '日常'
  ];

  // 表单验证状态
  validation = {
    titleError: '',
    contentError: '',
    truthError: '',
    tagsError: '',
  };

  // 加载状态
  isSubmitting = false;  // 是否正在提交



  // 已发布的汤
  publishedSoups = [];   // 已发布的汤列表

  // 引用rootStore
  rootStore = null;

  constructor(rootStore) {
    // 保存rootStore引用
    this.rootStore = rootStore;

    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      submitForm: flow,
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

  // 已选标签数量
  get tagsLength() {
    return this.formData.tags ? this.formData.tags.length : 0;
  }

  // 是否显示空态的计算属性
  get showEmptyState() {
    return this.publishedSoups.length === 0;
  }

  // 移除过时的属性，避免undefined错误
  get isUploading() {
    return false;
  }

  get uploadProgress() {
    return 0;
  }

  get showCreateForm() {
    return false;
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
      const errorField = `${field}Error`;
      if (errorField in this.validation) {
        this.validation[errorField] = '';
      }
    }
  }

  /**
   * 添加标签
   * @param {string} tag 要添加的标签
   */
  addTag(tag) {
    // 如果标签已存在或已达到最大数量，不添加
    if (this.formData.tags.includes(tag) || this.formData.tags.length >= 3) {
      return;
    }

    // 添加标签
    this.formData.tags.push(tag);

    // 清除标签错误
    this.validation.tagsError = '';
  }

  /**
   * 移除标签
   * @param {string} tag 要移除的标签
   */
  removeTag(tag) {
    // 移除标签
    this.formData.tags = this.formData.tags.filter(t => t !== tag);

    // 清除标签错误
    this.validation.tagsError = '';
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

    // 验证标签
    if (this.formData.tags.length > 3) {
      this.validation.tagsError = '最多选择3个标签';
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
      tags: [],
    };

    this.validation = {
      titleError: '',
      contentError: '',
      truthError: '',
      tagsError: '',
    };
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
        soup_surface: this.formData.content.trim(),
        soup_bottom: this.formData.truth.trim(),
        soupType: 1, // DIY汤
        tags: this.formData.tags
      };

      // 调用创建接口
      const response = yield soupService.createSoup(soupData);

      if (!response) {
        throw new Error('创建失败，请稍后重试');
      }

      // 重置表单
      this.resetForm();

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
      this.publishedSoups = response && Array.isArray(response) ? response : [];
      return this.publishedSoups;
    } catch (error) {
      console.error('加载已发布的汤失败:', error);
      this.publishedSoups = [];
      return [];
    }
  }
}

// 导出类
module.exports = {
  UploadStoreClass: UploadStore,
};
