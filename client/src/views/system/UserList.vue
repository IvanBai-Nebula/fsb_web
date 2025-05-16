<template>
  <div class="user-container">
    <el-card class="user-card">
      <template #header>
        <div class="card-header">
          <h2>用户管理</h2>
          <el-button type="primary" @click="showUserDialog(null)">添加用户</el-button>
        </div>
      </template>

      <el-table :data="filteredUsers" style="width: 100%" v-loading="loading">
        <el-table-column prop="username" label="用户名" width="180" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'info'">
              {{ scope.row.role === 'admin' ? '管理员' : '销售员' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="lastLogin" label="最后登录" width="180">
          <template #default="scope">
            {{ scope.row.lastLogin ? formatDate(scope.row.lastLogin) : '从未登录' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="showUserDialog(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDeleteUser(scope.row)"
              :disabled="scope.row.role === 'admin' && adminCount <= 1">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination class="pagination-container" v-model:current-page="currentPage" v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" :total="totalUsers"
          @size-change="handleSizeChange" @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <!-- 用户表单对话框 -->
    <el-dialog :title="isEdit ? '编辑用户' : '添加用户'" v-model="userDialogVisible" width="500px">
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="userForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword" v-if="!isEdit">
          <el-input v-model="userForm.confirmPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="销售员" value="sales" />
          </el-select>
        </el-form-item>
        <el-form-item label="重置密码" v-if="isEdit">
          <el-button type="warning" @click="showResetPasswordDialog">重置密码</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="userDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitUserForm">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog title="重置密码" v-model="resetPasswordDialogVisible" width="500px">
      <el-form :model="resetPasswordForm" :rules="resetPasswordRules" ref="resetPasswordFormRef" label-width="100px">
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="resetPasswordForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="resetPasswordForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetPasswordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitResetPassword">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 用户列表数据
const users = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const totalUsers = ref(0)

// 用户表单对话框
const userDialogVisible = ref(false)
const userFormRef = ref(null)
const isEdit = ref(false)
const currentUserId = ref(null)

// 重置密码对话框
const resetPasswordDialogVisible = ref(false)
const resetPasswordFormRef = ref(null)

// 用户表单数据
const userForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  role: 'sales'
})

// 重置密码表单数据
const resetPasswordForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

// 用户表单验证规则
const userRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== userForm.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

// 重置密码表单验证规则
const resetPasswordRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== resetPasswordForm.newPassword) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 计算管理员数量
const adminCount = computed(() => {
  return users.value.filter(user => user.role === 'admin').length
})

// 计算分页后的用户列表
const filteredUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return users.value.slice(start, end)
})

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 显示用户表单对话框
const showUserDialog = (user) => {
  resetUserForm()

  if (user) {
    // 编辑模式
    isEdit.value = true
    currentUserId.value = user.id
    userForm.username = user.username
    userForm.role = user.role
  } else {
    // 添加模式
    isEdit.value = false
    currentUserId.value = null
  }

  userDialogVisible.value = true
}

// 显示重置密码对话框
const showResetPasswordDialog = () => {
  resetPasswordForm.newPassword = ''
  resetPasswordForm.confirmPassword = ''
  resetPasswordDialogVisible.value = true
}

// 重置用户表单
const resetUserForm = () => {
  userForm.username = ''
  userForm.password = ''
  userForm.confirmPassword = ''
  userForm.role = 'sales'
}

// 提交用户表单
const submitUserForm = async () => {
  if (!userFormRef.value) return

  await userFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        loading.value = true

        if (isEdit.value) {
          // 编辑用户
          // 实际项目中应调用API更新用户
          // await axios.put(`/api/users/${currentUserId.value}`, {
          //   role: userForm.role
          // })

          // 模拟API调用
          const index = users.value.findIndex(u => u.id === currentUserId.value)
          if (index !== -1) {
            users.value[index].role = userForm.role
          }

          ElMessage.success('用户更新成功')
        } else {
          // 添加用户
          // 实际项目中应调用API创建用户
          // const response = await axios.post('/api/users', {
          //   username: userForm.username,
          //   password: userForm.password,
          //   role: userForm.role
          // })

          // 模拟API调用
          const newUser = {
            id: Date.now(),
            username: userForm.username,
            role: userForm.role,
            createdAt: new Date().toISOString(),
            lastLogin: null
          }

          users.value.push(newUser)
          totalUsers.value++

          ElMessage.success('用户创建成功')
        }

        userDialogVisible.value = false
      } catch (error) {
        console.error('提交用户表单失败:', error)
        ElMessage.error('操作失败，请重试')
      } finally {
        loading.value = false
      }
    }
  })
}

// 提交重置密码
const submitResetPassword = async () => {
  if (!resetPasswordFormRef.value) return

  await resetPasswordFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        loading.value = true

        // 实际项目中应调用API重置密码
        // await axios.post(`/api/users/${currentUserId.value}/reset-password`, {
        //   newPassword: resetPasswordForm.newPassword
        // })

        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 500))

        ElMessage.success('密码重置成功')
        resetPasswordDialogVisible.value = false
      } catch (error) {
        console.error('重置密码失败:', error)
        ElMessage.error('重置密码失败，请重试')
      } finally {
        loading.value = false
      }
    }
  })
}

// 删除用户
const handleDeleteUser = (user) => {
  // 检查是否是最后一个管理员
  if (user.role === 'admin' && adminCount.value <= 1) {
    ElMessage.warning('系统至少需要保留一个管理员账号')
    return
  }

  ElMessageBox.confirm(
    `确定要删除用户 ${user.username} 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      loading.value = true

      // 实际项目中应调用API删除用户
      // await axios.delete(`/api/users/${user.id}`)

      // 模拟API调用
      const index = users.value.findIndex(u => u.id === user.id)
      if (index !== -1) {
        users.value.splice(index, 1)
        totalUsers.value--
      }

      ElMessage.success('用户删除成功')
    } catch (error) {
      console.error('删除用户失败:', error)
      ElMessage.error('删除用户失败，请重试')
    } finally {
      loading.value = false
    }
  }).catch(() => {
    // 用户取消删除操作
  })
}

// 处理页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val
}

// 处理每页显示数量变化
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

// 获取用户列表
const fetchUsers = async () => {
  try {
    loading.value = true

    // 实际项目中应调用API获取用户列表
    // const response = await axios.get('/api/users')
    // users.value = response.data.users
    // totalUsers.value = response.data.total

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    // 模拟数据
    users.value = [
      {
        id: 1,
        username: 'admin',
        role: 'admin',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastLogin: '2023-05-10T08:30:00.000Z'
      },
      {
        id: 2,
        username: 'sales1',
        role: 'sales',
        createdAt: '2023-01-02T00:00:00.000Z',
        lastLogin: '2023-05-09T10:15:00.000Z'
      },
      {
        id: 3,
        username: 'sales2',
        role: 'sales',
        createdAt: '2023-01-03T00:00:00.000Z',
        lastLogin: '2023-05-08T14:20:00.000Z'
      },
      {
        id: 4,
        username: 'manager',
        role: 'admin',
        createdAt: '2023-02-01T00:00:00.000Z',
        lastLogin: '2023-05-07T09:45:00.000Z'
      },
      {
        id: 5,
        username: 'sales3',
        role: 'sales',
        createdAt: '2023-03-01T00:00:00.000Z',
        lastLogin: null
      }
    ]

    totalUsers.value = users.value.length
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-container {
  padding: 20px;
}

.user-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>