// stores/userStore.js - 标准MobX用户状态管理
const {makeAutoObservable, flow} = require('mobx-miniprogram');
const userService = require('../service/userService');
const {assets} = require('../config/assets');

class UserStore {
    // ===== 可观察状态 =====
    // 用户基础信息
    userInfo = null; // 用户信息

    // 统一加载状态管理 - MobX 最佳实践
    loading = {
        login: false,      // 登录操作加载状态
        logout: false,     // 退出登录操作加载状态
        profile: false,    // 用户资料更新加载状态（包括头像上传）
        sync: false,       // 用户信息同步加载状态
        signin: false      // 签到操作加载状态
    };

    // 引用 rootStore
    rootStore = null;

    constructor(rootStore) {
        this.rootStore = rootStore;

        makeAutoObservable(this, {
            // 标记异步方法为flow
            login: flow,
            logout: flow,
            updateUserProfile: flow,
            syncUserInfo: flow,
            solveSoup: flow,
            updateAnsweredSoup: flow,
            toggleFavorite: flow,
            toggleLike: flow,
            signIn: flow,  // 添加签到方法

            // 标记为非观察属性
            rootStore: false,
        });
    }

    // ===== 计算属性 =====

    /**
     * 用户ID - 单一数据源
     */
    get userId() {
        return this.userInfo?.id || '';
    }

    /**
     * 登录状态
     */
    get isLoggedIn() {
        return !!(this.userInfo?.id);
    }

    /**
     * 侦探信息 - 为 detective-card 组件提供完整的侦探信息
     */
    get detectiveInfo() {
        if (!this.isLoggedIn || !this.userInfo) {
            return null;
        }

        const info = this.userInfo;
        return {
            nickName: info.nickname || '',
            detectiveId: info.detectiveId || '',
            levelTitle: info.levelTitle || '新手侦探',
            remainingAnswers: info.remainingAnswers || 0,
            unsolvedCount: info.unsolvedSoups?.length || 0,
            solvedCount: info.solvedSoups?.length || 0,
            creationCount: info.createSoups?.length || 0,
            favoriteCount: info.favoriteSoups?.length || 0,
            avatarUrl: info.avatarUrl || assets.remote.defaultAvatar,
            isSignIn: info.isSignIn || false  // 合并到 detectiveInfo 中
        };
    }

    /**
     * 当前汤面是否已收藏 - computed 属性
     * 自动响应汤面切换和用户状态变化
     */
    get isFavorite() {
        return this.isFavoriteSoup(this.rootStore?.soupStore?.soupData?.id);
    }

    /**
     * 当前汤面是否已点赞 - computed 属性
     * 自动响应汤面切换和用户状态变化
     */
    get isLiked() {
        return this.isLikedSoup(this.rootStore?.soupStore?.soupData?.id);
    }

    /**
     * 当前汤面是否已解决 - computed 属性
     * 自动响应汤面切换和用户状态变化
     */
    get isSolved() {
        return this.isSolvedSoup(this.rootStore?.soupStore?.soupData?.id);
    }

    // ===== Actions =====

    * syncUserInfo() {
        // 防止重复调用
        if (this.loading.sync) {
            console.log('用户信息正在同步中，跳过重复调用');
            return {success: false, error: '正在同步中'};
        }

        // 检查用户是否已登录，未登录时不执行同步
        if (!this.isLoggedIn || !this.userId) {
            console.log('用户未登录，跳过同步用户信息');
            return {success: false, error: '用户未登录'};
        }
        try {
            this.loading.sync = true;
            const result = yield userService.getUserInfo();

            if (result.success) {
                this.userInfo = result.data;
                return {success: true, data: result.data};
            } else {
                return {success: false, error: result.error || '获取用户信息失败'};
            }
        } catch (error) {
            console.error('同步用户信息失败:', error);
            this.userInfo = null;
            return {success: false, error: '同步用户信息失败'};
        } finally {
            this.loading.sync = false;
        }
    }

    /**
     * 登录 - 包含本地存储管理
     */
    * login() {
        if (this.loading.login) {
            return {success: false, error: '正在登录中'};
        }

        try {
            this.loading.login = true;
            const result = yield userService.login();

            if (result.success) {
                this.userInfo = result.data;
                console.log('登录成功，用户信息已更新');
            }

            return result;
        } catch (error) {
            console.error('登录失败:', error);
            return {success: false, error: '登录失败'};
        } finally {
            this.loading.login = false;
        }
    }

    /**
     * 退出登录 - 包含本地存储清理
     */
    * logout() {
        if (this.loading.logout) {
            return {success: false, error: '正在退出登录中'};
        }

        try {
            this.loading.logout = true;
            const result = yield userService.logout();

            if (result.success) {
                this.userInfo = null;
                console.log('退出登录成功，用户信息已清空');
            }

            return result;
        } catch (error) {
            console.error('退出登录失败:', error);
            return {success: false, error: '退出登录失败'};
        } finally {
            this.loading.logout = false;
        }
    }

    * updateUserProfile(profileData) {
        if (!profileData || Object.keys(profileData).length === 0) {
            return {success: false, error: '无更新内容'};
        }


        try {
            this.loading.profile = true;
            const result = yield userService.updateUserInfo(profileData);

            if (result.success) {
                // 更新成功后同步用户信息
                yield this.syncUserInfo();
                return {success: true, data: result.data};
            } else {
                return {success: false, error: result.error || '更新用户资料失败'};
            }
        } catch (error) {
            console.error('更新用户资料失败:', error);
            return {success: false, error: '更新用户资料失败'};
        } finally {
            this.loading.profile = false;
        }
    }

    // ===== 用户交互相关方法 =====
    /**
     * 切换收藏状态 - 统一交互方法
     * 自动判断当前状态并调用对应的服务方法
     */  * toggleFavorite(soupId) {
        try {
            let result;
            if (this.isFavorite) {
                // 当前已收藏，执行取消收藏
                result = yield userService.unfavoriteSoup(soupId);
                if (result.success) {
                    yield this.syncUserInfo();
                    return {
                        success: true,
                        data: result.data,
                        message: '已取消收藏'
                    };
                }
            } else {
                // 当前未收藏，执行收藏
                result = yield userService.favoriteSoup(soupId);
                if (result.success) {
                    yield this.syncUserInfo();
                    return {
                        success: true,
                        data: result.data,
                        message: '收藏成功'
                    };
                }
            }
            return result;
        } catch (error) {
            console.error('收藏操作失败:', error);
            return {success: false, error: '收藏操作失败'};
        }
    }

    /**
     * 切换点赞状态 - 统一交互方法
     * 自动判断当前状态并调用对应的服务方法
     */
    * toggleLike(soupId) {
        try {
            let result;
            if (this.isLiked) {
                // 当前已点赞，执行取消点赞
                result = yield userService.unlikeSoup(soupId);
                if (result.success) {
                    yield this.syncUserInfo();
                    return {
                        success: true,
                        data: result.data,
                        message: '已取消点赞'
                    };
                }
            } else {
                // 当前未点赞，执行点赞
                result = yield userService.likeSoup(soupId);
                if (result.success) {
                    yield this.syncUserInfo();
                    return {
                        success: true,
                        data: result.data,
                        message: '点赞成功'
                    };
                }
            }
            return result;
        } catch (error) {
            console.error('点赞操作失败:', error);
            return {success: false, error: '点赞操作失败'};
        }
    }

    * solveSoup(soupId) {
        try {
            // 直接发起操作请求
            const result = yield userService.updateSolvedSoup(soupId);

            if (result.success) {
                // 操作成功后同步用户信息，获取最新状态
                yield this.syncUserInfo();
                return {
                    success: true,
                    data: result.data,
                    message: '已标记为解决'
                };
            } else {
                return result;
            }
        } catch (error) {
            console.error('标记解决失败:', error);
            return {success: false, error: '标记解决失败'};
        }
    }

    * updateAnsweredSoup(soupId) {
        try {
            // 直接发起操作请求
            const result = yield userService.updateAnsweredSoup(soupId);

            if (result.success) {
                return {
                    success: true,
                    data: result.data,
                    message: result.message || '已更新回答记录'
                };
            } else {
                return result;
            }
        } catch (error) {
            console.error('更新回答记录失败:', error);
            return {success: false, error: '更新回答记录失败'};
        }
    }

    /**
     * 签到 - 等待 API 实现
     */
    * signIn() {
        if (this.loading.signin) {
            return {success: false, error: '正在签到中'};
        }

        if (!this.isLoggedIn) {
            return {success: false, error: '请先登录'};
        }

        // 检查是否已签到
        if (this.detectiveInfo?.isSignIn) {
            return {success: false, error: '今天已经签到过啦~'};
        }

        try {
            this.loading.signin = true;

            // TODO: 等待 userService.signIn API 实现
            // const result = yield userService.signIn();
            // if (result.success) {
            //   yield this.syncUserInfo(); // 同步最新用户信息
            //   return {
            //     success: true,
            //     data: result.data,
            //     message: result.message || '签到成功！'
            //   };
            // }
            // return result;

            return {success: false, error: '签到功能暂未开放'};
        } catch (error) {
            console.error('签到失败:', error);
            return {success: false, error: '签到失败'};
        } finally {
            this.loading.signin = false;
        }
    }

    // ===== 状态查询方法 =====

    isFavoriteSoup(soupId) {
        if (!this.isLoggedIn || !this.userInfo) {
            return false;
        }
        return Array.isArray(this.userInfo.favoriteSoups) && this.userInfo.favoriteSoups.includes(soupId);
    }

    isLikedSoup(soupId) {
        if (!this.isLoggedIn || !this.userInfo) {
            return false;
        }
        return Array.isArray(this.userInfo.likedSoups) && this.userInfo.likedSoups.includes(soupId);
    }

    isSolvedSoup(soupId) {
        if (!this.isLoggedIn || !this.userInfo) {
            return false;
        }
        return Array.isArray(this.userInfo.solvedSoups) && this.userInfo.solvedSoups.includes(soupId);
    }
}

module.exports = {
    UserStoreClass: UserStore, // 导出类本身，在 rootStore 中实例化
};