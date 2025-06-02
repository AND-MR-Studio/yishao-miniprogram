/**
 * 对话服务类
 * 处理用户与系统对话的通信、存储与加载
 * 同时管理与汤面内容相关的对话功能
 *
 * 无状态设计：所有方法都接受必要的参数，不在服务中存储状态
 */
const dialogApiImpl = require("../api/dialogApiImpl");
const soupService = require("./soupService");

class DialogService {
  /**
   * 处理历史消息
   * @param {Array} messages 历史消息数组
   * @returns {Array} 处理后的消息数组
   */
  processMessages(messages) {
    const historyMessages = messages || [];
    return historyMessages;
  }
  /**
   * 发送消息到后端服务器并获取回复
   * @param {Object} params 请求参数
   * @param {string} params.message 用户消息内容
   * @param {string} params.userId 用户ID
   * @param {string} params.dialogId 对话ID
   * @param {string} params.messageId 消息ID（可选）
   * @returns {Promise<Object>} 回复消息的Promise
   */
  async sendMessage(params) {
    try {
      // 调用API实现层发送消息
      const response = await dialogApiImpl.sendMessage(params);

      // 处理响应数据
      let replyContent = "";
      let replyId = `msg_${Date.now()}`;

      if (response.success && response.data) {
        // 标准响应格式
        replyContent = response.data.reply || "";

        if (response.data.message) {
          replyId =
            response.data.message.messageId ||
            response.data.message.id ||
            replyId;
          replyContent = response.data.message.content || replyContent;
        }
      }

      // 返回回复消息
      return {
        id: replyId,
        role: "assistant",
        content: replyContent,
        timestamp: Date.now(),
        dialogId: response.data?.dialogId || params.dialogId, // 返回对话ID，便于调用方更新
      };
    } catch (error) {
      // 确保在错误情况下重置API层的请求锁
      dialogApiImpl.resetRequestLock();
      throw error;
    }
  }

  /**
   * 从服务器获取对话记录
   * @param {string} dialogId 对话ID
   * @returns {Promise<Object>} 包含消息数组和对话信息的对象
   */
  async fetchMessages(dialogId) {
    if (!dialogId) {
      throw new Error("获取对话记录失败: 缺少对话ID");
    }

    try {
      // 调用API实现层获取对话记录
      const response = await dialogApiImpl.fetchMessages(dialogId);

      // 检查响应格式
      if (!response || typeof response !== "object") {
        return { messages: [], dialogId, soupId: "" };
      }

      // 处理响应数据结构
      let messages = [];
      let responseDialogId = dialogId;
      let responseSoupId = "";

      if (response.success && response.data) {
        // 获取对话ID
        if (response.data.dialogId) {
          responseDialogId = response.data.dialogId;
        }

        // 获取汤面ID
        if (response.data.soupId) {
          responseSoupId = response.data.soupId;
        }

        messages = response.data.messages || [];
      }

      return {
        messages,
        dialogId: responseDialogId,
        soupId: responseSoupId,
      };
    } catch (error) {
      // 如果服务器请求失败，返回空数组和原始dialogId
      return { messages: [], dialogId, soupId: "" };
    }
  }

  /**
   * 加载对话记录（只从服务器获取）
   * @param {string} dialogId 对话ID
   * @returns {Promise<Object>} 包含消息数组和对话信息的对象
   */
  async getDialogMessages(dialogId) {
    if (!dialogId) {
      throw new Error("获取对话记录失败: 缺少对话ID");
    }

    try {
      // 从服务器获取对话记录
      const result = await this.fetchMessages(dialogId);

      // 处理消息并返回
      return {
        ...result,
        messages: this.processMessages(result.messages),
      };
    } catch (error) {
      // 出错时返回空数组和原始dialogId
      return { messages: [], dialogId, soupId: "" };
    }
  }

  /**
   * 获取用户特定汤面的对话数据
   * @param {string} userId 用户ID
   * @param {string} soupId 汤面ID
   * @returns {Promise<Object>} 对话数据，包含dialogId和soupData
   */
  async getUserDialog(userId, soupId) {
    if (!userId) {
      throw new Error("获取对话失败: 缺少用户ID");
    }

    if (!soupId) {
      throw new Error("获取对话失败: 缺少汤面ID");
    }

    try {
      // 先获取汤面数据，确保存在
      const soupData = await soupService.getSoup(soupId);
      if (!soupData) {
        throw new Error("获取对话失败: 无法获取汤面数据");
      }

      // 调用API实现层获取用户对话
      const response = await dialogApiImpl.getUserDialog(userId, soupId);

      if (!response.success) {
        throw new Error(response.error || "获取对话失败");
      }

      // 返回包含对话数据和汤面数据的对象
      if (response.data && response.data.dialogId) {
        return {
          ...response.data,
          soupData: soupData,
        };
      } else {
        // 没有找到对话，返回空对话数据和汤面数据
        return {
          dialogId: "",
          soupId: soupId,
          userId: userId,
          messages: [],
          total: 0,
          soupData: soupData,
        };
      }
    } catch (error) {
      console.error("获取用户对话失败:", error);
      throw error;
    }
  }

  /**
   * 获取聊天数据 - 统一的聊天数据获取方法
   * 后端始终返回包含dialogId的chatData对象
   * @param {string} userId 用户ID
   * @param {string} soupId 汤面ID
   * @returns {Promise<Object>} 聊天数据，包含dialogId
   */
  async getChatData(userId, soupId) {
    if (!userId) {
      throw new Error("获取聊天数据失败: 缺少用户ID");
    }

    if (!soupId) {
      throw new Error("获取聊天数据失败: 缺少汤面ID");
    }

    try {
      // 调用API实现层获取聊天数据
      const response = await dialogApiImpl.getChatData(userId, soupId);

      if (!response.success) {
        throw new Error(response.error || "获取聊天数据失败");
      }

      // 后端始终返回包含dialogId的chatData对象
      if (response.data && response.data.dialogId) {
        return {
          dialogId: response.data.dialogId,
          soupId: soupId,
          userId: userId,
          ...response.data, // 包含其他可能的聊天数据
        };
      } else {
        throw new Error("获取聊天数据失败: 服务器未返回对话ID");
      }
    } catch (error) {
      console.error("获取聊天数据失败:", error);
      throw error;
    }
  }

  /**
   * 保存对话记录
   * @param {string} dialogId 对话ID
   * @param {string} userId 用户ID
   * @param {Array} messages 消息数组
   * @returns {Promise<Object>} 保存结果
   */
  async saveDialogMessages(dialogId, userId, messages) {
    if (!dialogId) {
      throw new Error("保存对话失败: 缺少对话ID");
    }

    if (!userId) {
      throw new Error("保存对话失败: 缺少用户ID");
    }

    if (!messages || !Array.isArray(messages)) {
      throw new Error("保存对话失败: 消息格式不正确");
    }

    try {
      // 调用API实现层保存对话记录
      const response = await dialogApiImpl.saveDialogMessages(dialogId, userId, messages);

      if (!response.success) {
        throw new Error(response.error || "保存对话失败");
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

// 导出单例实例
const dialogService = new DialogService();
module.exports = dialogService;
