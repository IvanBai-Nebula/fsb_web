<template>
  <div class="user-profile-container">
    <el-card header="个人中心">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="info">
          <el-form :model="userInfoForm" :rules="userInfoRules" ref="userInfoFormRef" label-width="100px"
            style="max-width: 500px;">
            <el-form-item label="头像">
              <div class="avatar-upload-wrapper">
                <el-upload class="avatar-uploader" :http-request="customAvatarUploadRequest" :show-file-list="false"
                  :before-upload="beforeAvatarUpload" :headers="uploadHeaders">
                  <el-avatar v-if="userInfoForm.avatar_url" :src="getFullAvatarUrl(userInfoForm.avatar_url)" :size="100"
                    class="avatar-img" />
                  <div v-else class="avatar-placeholder">
                    <el-icon class="avatar-uploader-icon">
                      <Plus />
                    </el-icon>
                  </div>
                  <div class="avatar-upload-mask">
                    <el-icon>
                      <Plus />
                    </el-icon>
                    <span>更换头像</span>
                  </div>
                </el-upload>
              </div>
            </el-form-item>
            <el-form-item label="用户名">
              <el-input v-model="currentUser.username" disabled />
            </el-form-item>
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="userInfoForm.nickname" placeholder="请输入昵称" />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="userInfoForm.email" placeholder="请输入邮箱" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="updateUserInfo">保存更改</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="修改密码" name="password">
          <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px"
            style="max-width: 500px;">
            <el-form-item label="当前密码" prop="currentPassword">
              <el-input type="password" v-model="passwordForm.currentPassword" placeholder="请输入当前密码" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input type="password" v-model="passwordForm.newPassword" placeholder="请输入新密码" show-password />
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input type="password" v-model="passwordForm.confirmPassword" placeholder="请再次输入新密码" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="changePassword">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { Plus } from '@element-plus/icons-vue'; // Import Plus icon for uploader
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user'; // 假设你有一个 user store

const userStore = useUserStore();
const currentUser = ref(userStore.user || {}); // 从 store 获取当前用户信息

const uploadHeaders = computed(() => {
  return {
    Authorization: `Bearer ${userStore.token}`,
  };
});

const avatarFile = ref(null);

const customAvatarUploadRequest = (options) => {
  // 阻止自动上传，实际不上传
  avatarFile.value = options.file;
  // 选择图片后立即预览
  const reader = new FileReader();
  reader.onload = (e) => {
    userInfoForm.avatar_url = e.target.result;
  };
  reader.readAsDataURL(options.file);
};

const updateUserInfo = () => {
  userInfoFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let avatarUrl = userInfoForm.avatar_url;
        if (avatarFile.value) {
          const formData = new FormData();
          formData.append('file', avatarFile.value);
          const uploadRes = await axios.post('/api/upload/image', formData, {
            headers: {
              ...uploadHeaders.value,
              'Content-Type': 'multipart/form-data'
            }
          });
          // 兼容后端返回 { url } 或 { data: { url } }
          const url = uploadRes.data?.url || uploadRes.data?.data?.url;
          if (url) {
            avatarUrl = url;
            userInfoForm.avatar_url = avatarUrl;
            ElMessage.success('头像上传成功');
          } else {
            ElMessage.error('头像上传失败: 无效的响应');
            return;
          }
        }
        const payload = {
          nickname: userInfoForm.nickname,
          email: userInfoForm.email,
          avatar_url: avatarUrl // 始终传递 avatar_url，避免遗漏
        };
        await axios.put(`/api/users/${currentUser.value.id}/profile`, payload);
        ElMessage.success('基本信息更新成功');
        userStore.updateUserInfo({
          ...(userStore.user || {}),
          nickname: userInfoForm.nickname,
          email: userInfoForm.email,
          avatar_url: avatarUrl || userStore.user.avatar_url || ''
        });
        currentUser.value = { ...userStore.user };
        avatarFile.value = null;
      } catch (error) {
        console.error('更新用户信息失败:', error);
        ElMessage.error(error.response?.data?.message || '更新用户信息失败');
      }
    }
  });
};

const changePassword = () => {
  passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await axios.put(`/api/users/${currentUser.value.id}/password`, {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });
        ElMessage.success('密码修改成功，请重新登录');
        // 清空表单
        passwordFormRef.value.resetFields();
        // 触发登出操作
        await userStore.logout();
        // 跳转到登录页 (如果 router 可用)
        // import { useRouter } from 'vue-router';
        // const router = useRouter();
        // router.push('/login');
      } catch (error) {
        console.error('修改密码失败:', error);
        ElMessage.error(error.response?.data?.message || '修改密码失败');
      }
    }
  });
};

onMounted(() => {
  if (userStore.isLoggedIn) {
    fetchUserProfile();
  } else {
    ElMessage.warning('请先登录');
    // router.push('/login'); // 如果 router 可用
  }
});

const userInfoForm = reactive({
  nickname: userStore.user?.nickname || '',
  email: userStore.user?.email || '',
  avatar_url: userStore.user?.avatar_url || ''
});

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的新密码不一致'));
        } else {
          callback();
        }
      }, trigger: 'blur'
    }
  ]
};

const activeTab = ref('info');

const userInfoRules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: ['blur', 'change'] }
  ]
};

const beforeAvatarUpload = (file) => {
  const isImage = file.type.startsWith('image/');
  const isLt2M = file.size / 1024 / 1024 < 2;
  if (!isImage) {
    ElMessage.error('只能上传图片文件');
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过2MB');
  }
  return isImage && isLt2M;
};

const fetchUserProfile = async () => {
  try {
    const res = await axios.get(`/api/users/${userStore.user.id}/profile`);
    if (res.data && res.data.data) {
      userInfoForm.nickname = res.data.data.nickname || '';
      userInfoForm.email = res.data.data.email || '';
      userInfoForm.avatar_url = res.data.data.avatar_url || '';
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '获取用户信息失败');
  }
};
const userInfoFormRef = ref(null);

// 处理头像URL，确保使用完整路径
const getFullAvatarUrl = (url) => {
  if (!url) return '';
  // 如果已经是完整URL（以http或https开头），则直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // 如果是相对路径（以/uploads开头），则添加服务器地址
  if (url.startsWith('/uploads/')) {
    return `http://localhost:5000${url}`;
  }
  // 如果只有文件名部分（uploads/xxx.jpg），则添加完整前缀
  if (url.startsWith('uploads/')) {
    return `http://localhost:5000/${url}`;
  }
  // 其他情况，假设是相对路径，添加服务器地址
  return `http://localhost:5000/${url}`;
};
</script>

<style scoped>
.user-profile-container {
  padding: 20px;
}

.el-tab-pane {
  padding-top: 20px;
}

.avatar-upload-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  margin-bottom: 10px;
}

.avatar-uploader {
  width: 100px;
  height: 100px;
  display: block;
  position: relative;
  border-radius: 50%;
  overflow: hidden;
  border: 1px dashed var(--el-border-color);
  transition: border-color 0.3s;
}

.avatar-uploader:hover {
  border-color: var(--el-color-primary);
}

.avatar-img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.avatar-placeholder {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 50%;
}

.avatar-uploader-icon {
  font-size: 36px;
  color: #8c939d;
}

.avatar-upload-mask {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  border-radius: 50%;
  pointer-events: none;
}

.avatar-uploader:hover .avatar-upload-mask {
  opacity: 1;
  pointer-events: auto;
}

.avatar-upload-mask el-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.avatar-upload-mask span {
  font-size: 14px;
}
</style>