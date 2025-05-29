/**
 * uploadStore.js
 * 海龟汤创建页面的状态管理
 * 负责管理上传表单数据和交互状态
 */
const { makeAutoObservable, flow } = require('mobx-miniprogram');
const soupService = require('../service/soupService');

// 草稿存储的键名
const DRAFT_STORAGE_KEY = 'soup_draft';

/**
 * UploadStore类
 * 管理海龟汤创建页面的状态
 *
 * 优化说明：
 * 1. 将formData和validation对象拆分为独立的observable属性
 * 2. 减少响应式更新范围，提高性能
 * 3. 使用computed属性组合多个字段的场景
 */
class UploadStore {
  // ===== 表单数据 - 拆分为独立observable属性 =====
  title = '';        // 标题
  content = '';      // 汤面内容
  truth = '';        // 汤底内容
  tags = [];         // 标签（数组）

  // ===== 表单验证状态 - 拆分为独立observable属性 =====
  titleError = '';
  contentError = '';
  truthError = '';
  tagsError = '';

  // 预设标签池
  tagPool = [
    '悬疑', '推理', '恐怖', '灵异',
    '科幻', '奇幻', '冒险', '历史',
    '爱情', '喜剧', '悲剧', '犯罪',
    '心理', '哲理', '社会', '日常'
  ];

  // 加载状态
  isSubmitting = false;  // 是否正在提交

  // 草稿状态
  hasDraft = false;      // 是否有草稿

  // 已发布的汤
  publishedSoups = [];   // 已发布的汤列表

  // 引用rootStore和userStore
  rootStore = null;

  constructor(rootStore) {
    // 保存rootStore和userStore引用
    this.rootStore = rootStore;

    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      submitForm: flow,
      loadPublishedSoups: flow,

      // 标记为非观察属性
      rootStore: false,
    });

    // 检查是否有草稿
    this.checkDraft();
  }
  // 获取用户ID的计算属性 - 通过rootStore统一访问
  get userId() {
    return this.rootStore?.userId || '';
  }

  // 获取登录状态的计算属性 - 通过rootStore统一访问
  get isLoggedIn() {
    return this.rootStore?.isLoggedIn || false;
  }

  // ===== Computed属性 - 优化后使用独立字段 =====

  // 标题字数计算属性
  get titleLength() {
    return this.title ? this.title.length : 0;
  }

  // 汤面内容字数计算属性
  get contentLength() {
    return this.content ? this.content.length : 0;
  }

  // 汤底内容字数计算属性
  get truthLength() {
    return this.truth ? this.truth.length : 0;
  }

  // 已选标签数量
  get tagsLength() {
    return this.tags ? this.tags.length : 0;
  }

  // 表单整体验证状态 - 新增computed属性
  get isFormValid() {
    return !this.titleError && !this.contentError && !this.truthError && !this.tagsError;
  }

  // 向后兼容：formData对象 - 通过computed属性组合
  get formData() {
    return {
      title: this.title,
      content: this.content,
      truth: this.truth,
      tags: this.tags
    };
  }

  // 向后兼容：validation对象 - 通过computed属性组合
  get validation() {
    return {
      titleError: this.titleError,
      contentError: this.contentError,
      truthError: this.truthError,
      tagsError: this.tagsError
    };
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
   * 更新表单字段 - 优化版本，直接操作独立属性
   * @param {string} field 字段名
   * @param {string|array} value 字段值
   */
  updateField(field, value) {
    // 直接更新对应的独立属性
    if (field === 'title') {
      this.title = value;
      this.titleError = ''; // 清除对应的验证错误
    } else if (field === 'content') {
      this.content = value;
      this.contentError = '';
    } else if (field === 'truth') {
      this.truth = value;
      this.truthError = '';
    } else if (field === 'tags') {
      this.tags = value;
      this.tagsError = '';
    }
  }

  /**
   * 添加标签 - 优化版本，直接操作独立属性
   * @param {string} tag 要添加的标签
   */
  addTag(tag) {
    // 如果标签已存在或已达到最大数量，不添加
    if (this.tags.includes(tag) || this.tags.length >= 3) {
      return;
    }

    // 添加标签
    this.tags.push(tag);

    // 清除标签错误
    this.tagsError = '';
  }

  /**
   * 移除标签 - 优化版本，直接操作独立属性
   * @param {string} tag 要移除的标签
   */
  removeTag(tag) {
    // 移除标签
    this.tags = this.tags.filter(t => t !== tag);

    // 清除标签错误
    this.tagsError = '';
  }
  /**
   * 基础表单验证 - 简化版本，仅检查必填项
   * @returns {boolean} 表单是否有效
   */
  validateForm() {
    let isValid = true;

    // 基础验证：检查必填项
    if (!this.title.trim()) {
      this.titleError = '请输入标题';
      isValid = false;
    } else if (this.title.length > 50) {
      this.titleError = '标题过长';
      isValid = false;
    } else {
      this.titleError = '';
    }

    if (!this.content.trim()) {
      this.contentError = '请输入汤面内容';
      isValid = false;
    } else {
      this.contentError = '';
    }

    if (!this.truth.trim()) {
      this.truthError = '请输入汤底内容';
      isValid = false;
    } else {
      this.truthError = '';
    }

    return isValid;
  }

  /**
   * 重置表单 - 优化版本，直接重置独立属性
   */
  resetForm() {
    // 重置表单数据
    this.title = '';
    this.content = '';
    this.truth = '';
    this.tags = [];

    // 重置验证状态
    this.titleError = '';
    this.contentError = '';
    this.truthError = '';
    this.tagsError = '';
  }

  /**
   * 检查是否有草稿
   */
  checkDraft() {
    try {
      const draftData = wx.getStorageSync(DRAFT_STORAGE_KEY);
      this.hasDraft = !!draftData;
    } catch (error) {
      console.error('检查草稿失败:', error);
      this.hasDraft = false;
    }
  }

  /**
   * 保存草稿 - 优化版本，使用独立属性
   * 将当前表单内容保存到本地缓存
   */
  saveDraft() {
    try {
      // 保存当前表单数据到本地缓存
      wx.setStorageSync(DRAFT_STORAGE_KEY, {
        title: this.title,
        content: this.content,
        truth: this.truth,
        tags: this.tags,
        timestamp: Date.now() // 添加时间戳，便于显示保存时间
      });

      // 更新草稿状态
      this.hasDraft = true;

      return true;
    } catch (error) {
      console.error('保存草稿失败:', error);
      return false;
    }
  }

  /**
   * 加载草稿 - 优化版本，直接设置独立属性
   * 从本地缓存加载草稿数据
   */
  loadDraft() {
    try {
      const draftData = wx.getStorageSync(DRAFT_STORAGE_KEY);

      if (draftData) {
        // 更新表单数据
        this.title = draftData.title || '';
        this.content = draftData.content || '';
        this.truth = draftData.truth || '';
        this.tags = draftData.tags || [];

        return true;
      }

      return false;
    } catch (error) {
      console.error('加载草稿失败:', error);
      return false;
    }
  }

  /**
   * 清除草稿
   * 删除本地缓存中的草稿数据
   */
  clearDraft() {
    try {
      wx.removeStorageSync(DRAFT_STORAGE_KEY);
      this.hasDraft = false;
      return true;
    } catch (error) {
      console.error('清除草稿失败:', error);
      return false;
    }
  }


  /**
   * 提交表单 - 简化版本，纯接口调用
   * @returns {Promise<Object>} 创建结果
   */
  *submitForm() {
    if (!this.validateForm()) {
      return { success: false, message: '请完善表单信息' };
    }

    if (!this.isLoggedIn) {
      return { success: false, message: '请先登录' };
    }

    try {
      this.isSubmitting = true;

      const soupData = {
        title: this.title.trim(),
        soup_surface: this.content.trim(),
        soup_bottom: this.truth.trim(),
        tags: this.tags
      };

      const response = yield soupService.createSoup(soupData);
      
      if (!response?.success) {
        return { success: false, message: response?.message || '创建失败' };
      }

      // 成功后重置表单
      this.resetForm();
      this.clearDraft();

      return {
        success: true,
        message: '创建成功',
        data: response.data
      };
    } catch (error) {
      console.error('创建失败:', error);
      return { success: false, message: '创建失败，请重试' };
    } finally {
      this.isSubmitting = false;
    }
  }  /**
   * 加载已发布的汤 - 优化版本，直接从 userInfo 获取
   */
  *loadPublishedSoups() {
    try {
      // 检查登录状态
      if (!this.isLoggedIn) {
        this.publishedSoups = [];
        return [];
      }

      // 确保用户信息是最新的
      yield this.rootStore.userStore.syncUserInfo();
      
      // 直接从 userInfo 获取创建的汤列表
      const userInfo = this.rootStore.userStore.userInfo;
      if (userInfo && Array.isArray(userInfo.createSoups)) {
        this.publishedSoups = userInfo.createSoups;
      } else {
        this.publishedSoups = [];
      }
      
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
