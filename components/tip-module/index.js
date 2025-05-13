// components/tip-module/index.js
const eventUtils = require('../../utils/eventUtils');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示提示模块
    visible: {
      type: Boolean,
      value: false,
      observer: function(newVal) {
        if (newVal) {
          // 当组件变为可见时，启动闲置计时器
          this.startIdleTimer();
        } else {
          // 当组件隐藏时，清除闲置计时器
          this.clearIdleTimer();
        }
      }
    },
    // 提示标题
    tipTitle: {
      type: String,
      value: '汤来了！我是陪你熬夜猜谜的小勺🌙'
    },
    // 提示内容
    tipContent: {
      type: Array,
      value: [
        '只答是、否、不确定，别想套我话哦～',
        '长按汤面就浮出来咯！'
      ]
    },
    // 页面状态
    pageState: {
      type: String,
      value: 'drinking',
      observer: function(newVal, oldVal) {
        // 当页面状态变为truth时，显示祝贺消息
        if (newVal === 'truth' && oldVal !== 'truth') {
          this.showCongratulationTip();
        }
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    animationData: {},
    // 当前显示的提示内容
    currentTipContent: [
      '只答是、否、不确定，别想套我话哦～',
      '长按汤面就浮出来咯！'
    ],
    // 消息计数器
    messageCount: 0,
    // 是否显示闲置提示
    showingIdleTip: false,
    // 是否正在切换提示内容
    isSwitchingContent: false
  },

  /**
   * 组件样式隔离
   */
  options: {
    styleIsolation: 'isolated',
    addGlobalClass: true
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 监听用户发送消息事件
      this.watchUserMessages();

      // 监听显示提示事件
      this.watchTipEvents();
    },
    detached() {
      // 清除计时器
      this.clearIdleTimer();
    }
  },

  /**
   * 组件方法
   */
  methods: {
    // 监听用户发送消息
    watchUserMessages() {
      // 监听用户发送消息事件
      eventUtils.onEvent('userSentMessage', this.handleUserMessage.bind(this));
    },

    // 监听提示事件
    watchTipEvents() {
      // 监听显示提示事件
      eventUtils.onEvent('showTip', this.handleShowTip.bind(this));

      // 监听隐藏提示事件
      eventUtils.onEvent('hideTip', this.handleHideTip.bind(this));
    },

    // 处理显示提示事件
    handleShowTip(data) {
      // 如果正在切换内容，不执行
      if (this.data.isSwitchingContent) return;

      // 更新标题（如果有）
      if (data.title) {
        this.setData({ tipTitle: data.title });
      }

      // 更新内容并显示提示
      if (data.content && Array.isArray(data.content)) {
        // 执行滚轮动画
        this.animateTipChange(data.content);
      }

      // 确保提示模块可见
      if (!this.properties.visible) {
        this.triggerEvent('visibleChange', { visible: true });
      }
    },

    // 处理隐藏提示事件
    handleHideTip() {
      // 恢复默认提示内容
      this.resetTipContent();
    },

    // 处理用户发送消息
    handleUserMessage() {
      // 重置闲置计时器
      this.resetIdleTimer();

      // 增加消息计数
      this.data.messageCount++;

      // 如果连续发送了5条消息，显示特殊提示
      if (this.data.messageCount === 5) {
        this.showSpecialTip();
      }
    },

    // 显示特殊提示（连续发送5条消息后）
    showSpecialTip() {
      // 如果正在切换内容，不执行
      if (this.data.isSwitchingContent) return;

      // 标记正在切换内容
      this.setData({ isSwitchingContent: true });

      // 执行滚轮动画
      this.animateTipChange(['你再多问问，', '说不定我也会给你点提示~嘿嘿']);

      // 3秒后恢复默认提示
      setTimeout(() => {
        if (this.data.showingIdleTip) {
          this.resetTipContent();
        }
      }, 3000);
    },

    // 执行滚轮动画切换提示内容
    animateTipChange(newContent) {
      // 标记当前内容为滚出状态
      const oldContent = this.data.currentTipContent.map(item => {
        return typeof item === 'string'
          ? { text: item, isScrollingOut: true }
          : { ...item, isScrollingOut: true };
      });

      this.setData({
        currentTipContent: oldContent,
        showingIdleTip: true
      });

      // 等待滚出动画完成后，设置新内容
      setTimeout(() => {
        // 设置新内容（从下方滚入）
        this.setData({
          currentTipContent: newContent.map(item => {
            return typeof item === 'string'
              ? { text: item, isScrollingOut: false }
              : { ...item, isScrollingOut: false };
          })
        });

        // 动画完成后重置状态
        setTimeout(() => {
          this.setData({ isSwitchingContent: false });
        }, 500);
      }, 500);
    },

    // 启动闲置计时器
    startIdleTimer() {
      this.clearIdleTimer();
      this._idleTimer = setTimeout(() => {
        // 10秒无操作后显示闲置提示
        this.showIdleTip();
      }, 10000); // 10秒
    },

    // 重置闲置计时器
    resetIdleTimer() {
      // 如果正在显示闲置提示，恢复默认提示
      if (this.data.showingIdleTip) {
        this.resetTipContent();
      }

      // 重置计时器
      this.clearIdleTimer();
      this.startIdleTimer();
    },

    // 清除闲置计时器
    clearIdleTimer() {
      if (this._idleTimer) {
        clearTimeout(this._idleTimer);
        this._idleTimer = null;
      }
    },

    // 显示闲置提示
    showIdleTip() {
      // 如果正在切换内容，不执行
      if (this.data.isSwitchingContent) return;

      // 执行滚轮动画
      this.animateTipChange(['侦探大人，还在烧脑吗~','cpu别烧坏咯。']);
    },

    // 重置提示内容为默认值
    resetTipContent() {
      // 如果正在切换内容，不执行
      if (this.data.isSwitchingContent) return;

      // 执行滚轮动画
      this.animateTipChange(this.properties.tipContent);

      // 重置状态
      setTimeout(() => {
        this.setData({ showingIdleTip: false });
      }, 1000);
    },

    // 显示祝贺提示（猜对汤底）
    showCongratulationTip() {
      // 如果正在切换内容，不执行
      if (this.data.isSwitchingContent) return;

      // 获取用户发送的消息数量
      const messageCount = this.data.messageCount;

      // 构建祝贺消息
      const congratsMessage = [
        '恭喜你！喝到了汤底！',
        `只推理了${messageCount}次就猜对啦，佩服佩服~`
      ];

      // 更新标题
      this.setData({
        tipTitle: '🎉 推理成功！'
      });

      // 执行滚轮动画显示祝贺消息
      this.animateTipChange(congratsMessage);
    }
  }
});
