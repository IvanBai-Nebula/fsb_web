<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <img src="/logo.png" alt="System Logo" class="logo" />
        <h1>卫材销售管理系统</h1>
      </div>
      <el-card class="login-card">
        <el-tabs v-model="activeTab" class="login-tabs" stretch>
          <el-tab-pane label="登录" name="login"></el-tab-pane>
          <el-tab-pane label="注册" name="register"></el-tab-pane>
        </el-tabs>

        <!-- 登录表单 -->
        <el-form
          v-if="activeTab === 'login'"
          :model="loginForm"
          :rules="loginRules"
          ref="loginFormRef"
          @keyup.enter="handleLogin"
          class="login-form"
        >
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="用户名"
              :prefix-icon="User"
              size="large"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="密码"
              :prefix-icon="Lock"
              show-password
              size="large"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="loading"
              class="action-button"
              @click="handleLogin"
              size="large"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 注册表单 -->
        <el-form
          v-else
          :model="registerForm"
          :rules="registerRules"
          ref="registerFormRef"
          @keyup.enter="handleRegister"
          class="login-form"
        >
          <el-form-item prop="username">
            <el-input
              v-model="registerForm.username"
              placeholder="用户名 (3-20位字符)"
              :prefix-icon="User"
              size="large"
            />
          </el-form-item>

          <el-form-item prop="nickname">
            <el-input
              v-model="registerForm.nickname"
              placeholder="昵称 (可选)"
              :prefix-icon="User"
              size="large"
            />
          </el-form-item>

          <el-form-item prop="email">
            <el-input
              v-model="registerForm.email"
              placeholder="邮箱 (可选, 用于找回密码等)"
              :prefix-icon="Message"
              type="email"
              size="large"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="registerForm.password"
              type="password"
              placeholder="密码 (6-20位字符)"
              :prefix-icon="Lock"
              show-password
              size="large"
            />
          </el-form-item>

          <el-form-item prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              placeholder="确认密码"
              :prefix-icon="Lock"
              show-password
              size="large"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="loading"
              class="action-button"
              @click="handleRegister"
              size="large"
            >
              注册
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
      <footer class="login-footer">
        <p>&copy; 2024 卫材销售管理系统. 保留所有权利.</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "../stores/user";
import { ElMessage } from "element-plus";
import { User, Lock, Message } from "@element-plus/icons-vue";

const router = useRouter();
const userStore = useUserStore();
const loginFormRef = ref(null);
const registerFormRef = ref(null);
const loading = ref(false);
const activeTab = ref("login");

// 登录表单
const loginForm = reactive({
  username: "",
  password: "",
});

// 注册表单
const registerForm = reactive({
  username: "",
  nickname: "", // Added nickname
  email: "", // Added email
  password: "",
  confirmPassword: "",
});

// 登录表单验证规则
const loginRules = {
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }],
};

// 注册表单验证规则
const registerRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    {
      min: 3,
      max: 20,
      message: "用户名长度在 3 到 20 个字符之间",
      trigger: "blur",
    },
  ],
  nickname: [
    // Nickname is optional, so no 'required: true'
    { max: 50, message: "昵称长度不能超过 50 个字符", trigger: "blur" },
  ],
  email: [
    // Email is optional but if provided, should be a valid email format
    {
      type: "email",
      message: "请输入有效的邮箱地址",
      trigger: ["blur", "change"],
    },
  ],
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    {
      min: 3,
      max: 20,
      message: "用户名长度在 3 到 20 个字符之间",
      trigger: "blur",
    },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    {
      min: 6,
      max: 20,
      message: "密码长度在 6 到 20 个字符之间",
      trigger: "blur",
    },
  ],
  confirmPassword: [
    { required: true, message: "请确认密码", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error("两次输入密码不一致"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
};

// 处理登录
const handleLogin = () => {
  loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        const success = await userStore.login(loginForm);
        if (success) {
          ElMessage.success("登录成功");
          router.push("/");
        } else {
          ElMessage.error("用户名或密码错误");
        }
      } catch (error) {
        ElMessage.error("登录失败，请稍后重试");
      } finally {
        loading.value = false;
      }
    }
  });
};

// 处理注册
const handleRegister = () => {
  registerFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        // Construct payload ensuring all new fields are included
        const payload = {
          username: registerForm.username,
          password: registerForm.password,
          confirmPassword: registerForm.confirmPassword,
          nickname: registerForm.nickname,
          email: registerForm.email,
        };
        const result = await userStore.register(payload); // Pass the full payload
        if (result.success) {
          ElMessage.success("注册成功，请登录");
          activeTab.value = "login"; // Switch to login tab
          registerFormRef.value.resetFields(); // Reset form fields
        } else {
          ElMessage.error(result.message || "注册失败，请检查输入信息");
        }
      } catch (error) {
        console.error("Registration error:", error); // Log the actual error
        ElMessage.error("注册服务异常，请稍后重试");
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>

<style lang="scss" scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-image: linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%);
  padding: 20px;
}

.login-box {
  width: 100%;
  max-width: 420px;
  text-align: center;
}

.login-header {
  margin-bottom: 30px;

  .logo {
    width: 80px;
    height: 80px;
    margin-bottom: 15px;
  }

  h1 {
    font-size: 28px;
    font-weight: 600;
    color: #fff;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
  }
}

.login-card {
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  overflow: hidden; //确保内部元素不会溢出圆角
}

.login-tabs {
  margin-bottom: 20px;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }

  :deep(.el-tabs__nav-wrap::after) {
    display: none; // 移除默认下划线
  }

  :deep(.el-tabs__item) {
    font-size: 16px;
    padding: 0 20px; // 增加标签页的内边距
    height: 50px; // 增加标签页的高度
    line-height: 50px;

    &.is-active {
      font-weight: bold;
      color: #409eff;
    }
  }

  :deep(.el-tabs__active-bar) {
    height: 3px; // 自定义激活状态下划线的高度
  }
}

.login-form {
  padding: 0 20px 20px; // 为表单内容添加内边距
}

.action-button {
  width: 100%;
  font-size: 16px;
  letter-spacing: 1px;
  background-image: linear-gradient(to right, #70588a 0%, #2575fc 100%);
  border: none;

  &:hover {
    background-image: linear-gradient(to right, #2575fc 0%, #70588a 100%);
  }
}

.login-footer {
  margin-top: 30px;

  p {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
  }
}

// 响应式设计
@media (max-width: 480px) {
  .login-box {
    padding: 15px;
  }

  .login-header h1 {
    font-size: 24px;
  }

  .login-card {
    padding: 15px;
  }

  :deep(.el-tabs__item) {
    font-size: 15px;
    padding: 0 15px;
    height: 45px;
    line-height: 45px;
  }
}
</style>
