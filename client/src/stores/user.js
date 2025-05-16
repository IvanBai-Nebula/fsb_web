import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'
import router from '../router'

export const useUserStore = defineStore('user', () => {
    const token = ref(localStorage.getItem('token') || '')
    const user = ref(null)

    // 计算属性
    const isLoggedIn = computed(() => !!token.value) // Corresponds to state.token from original replace intent
    const isAdmin = computed(() => user.value?.role === 'admin') // Corresponds to state.userInfo.role from original replace intent, assuming userInfo is user.value
    // The "actions: {" part from the original replace block is omitted as it's for Options API style.

    // 初始化用户信息
    const initUser = () => {
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
            try {
                user.value = JSON.parse(storedUserInfo);
                // 确保token仍然有效，如果token和存储的用户信息不匹配或token过期，则重新从token初始化或登出
                if (token.value) {
                    const decoded = jwtDecode(token.value);
                    if (user.value.id !== decoded.id) {
                        console.warn('Stored user info ID does not match token ID. Re-initializing from token.');
                        user.value = { id: decoded.id, username: decoded.username, role: decoded.role, nickname: decoded.nickname, email: decoded.email, avatar_url: decoded.avatar_url };
                        localStorage.setItem('userInfo', JSON.stringify(user.value)); // 更新存储
                    }
                } else {
                    // 如果有存储的用户信息但没有token，则认为无效，执行登出
                    logout();
                    return;
                }
            } catch (error) {
                console.error('解析存储的userInfo失败', error);
                localStorage.removeItem('userInfo'); // 清除损坏的数据
                // 尝试从token初始化
                if (token.value) {
                    try {
                        const decoded = jwtDecode(token.value);
                        user.value = { id: decoded.id, username: decoded.username, role: decoded.role, nickname: decoded.nickname, email: decoded.email, avatar_url: decoded.avatar_url };
                        localStorage.setItem('userInfo', JSON.stringify(user.value));
                    } catch (tokenError) {
                        console.error('Token解析失败', tokenError);
                        logout();
                    }
                } else {
                    user.value = null; // 没有token，也没有有效的存储信息
                }
            }
        } else if (token.value) {
            // 如果没有存储的userInfo，但有token，则从token初始化
            try {
                const decoded = jwtDecode(token.value);
                user.value = { id: decoded.id, username: decoded.username, role: decoded.role, nickname: decoded.nickname, email: decoded.email, avatar_url: decoded.avatar_url };
                localStorage.setItem('userInfo', JSON.stringify(user.value)); // 首次从token初始化后存储
            } catch (error) {
                console.error('Token解析失败', error);
                logout();
            }
        } else {
            user.value = null; // 既没有存储信息也没有token
        }
    }

    // 登录
    const login = async (credentials) => {
        try {
            const response = await axios.post('/api/auth/login', credentials)
            token.value = response.data.token;
            localStorage.setItem('token', token.value);
            // 如果后端在登录时返回了完整的用户信息，则使用它
            if (response.data.user) {
                updateUserInfo(response.data.user);
            } else {
                initUser(); // 否则，按常规从token初始化
            }
            return true
        } catch (error) {
            console.error('登录失败', error)
            return false
        }
    }

    // 注册
    const register = async (userData) => {
        try {
            // Destructure all expected fields to be explicit about what's being sent
            const { username, password, confirmPassword, nickname, email } = userData;
            const payload = { username, password, confirmPassword, nickname, email };

            const response = await axios.post('/api/auth/register', payload)
            // Assuming the backend returns a token upon successful registration
            // If the backend doesn't log in the user automatically after registration,
            // you might not receive a token here, or you might want to redirect to login.
            if (response.data.token) {
                token.value = response.data.token;
                localStorage.setItem('token', token.value);
                 // 如果后端在注册成功时返回了完整的用户信息，则使用它
                if (response.data.user) {
                    updateUserInfo(response.data.user);
                } else {
                    initUser(); // 否则，按常规从token初始化
                }
            }
            return { success: true, message: response.data.message || '注册成功' } // Pass success message from backend if available
        } catch (error) {
            console.error('注册失败', error)
            return {
                success: false,
                message: error.response?.data?.message || '注册失败，请稍后重试'
            }
        }
    }

    // 登出
    const logout = () => {
        token.value = ''
        user.value = null
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo'); // 确保登出时清除
        // 跳转到登录页
        // 注意：在 store 文件中直接使用 router 实例可能导致循环依赖或在某些构建设置下出问题
        // 推荐在组件层面处理路由跳转，或者通过事件总线/回调等方式通知组件进行跳转
        // 此处暂时保留，但请注意潜在问题
        if (router.currentRoute.value.name !== 'Login') { // 避免重复跳转到登录页
            router.push('/login');
        }
    }

    const updateUserInfo = (newInfo) => {
        user.value = { ...(user.value || {}), ...newInfo }; // Ensure user.value is object before spread
        localStorage.setItem('userInfo', JSON.stringify(user.value));
    }

    // 设置请求拦截器
    axios.interceptors.request.use(
        config => {
            if (token.value) {
                config.headers.Authorization = `Bearer ${token.value}`
            }
            return config
        },
        error => Promise.reject(error)
    )

    // 设置响应拦截器
    axios.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401) {
                logout()
            }
            return Promise.reject(error)
        }
    )

    // 初始化
    initUser()

    return {
        token,
        user,
        isLoggedIn,
        isAdmin,
        login,
        register,
        logout,
        updateUserInfo // 导出 updateUserInfo 方法
    }
})