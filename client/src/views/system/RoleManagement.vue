<template>
  <div class="role-management-container">
    <el-card header="角色与权限管理">
      <div style="margin-bottom: 20px;">
        <el-button type="primary" :icon="Plus" @click="handleAddRole">新增角色</el-button>
      </div>

      <el-table :data="roles" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="角色名称" />
        <el-table-column prop="description" label="角色描述" />
        <el-table-column label="权限" width="300">
          <template #default="scope">
            <el-tag v-for="permission in scope.row.permissions" :key="permission" style="margin-right: 5px;">
              {{ permission }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button size="small" type="primary" :icon="Edit" @click="handleEditRole(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" :icon="Delete" @click="handleDeleteRole(scope.row.id)" :disabled="isRoleProtected(scope.row.name)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="600px" @close="resetForm">
      <el-form :model="roleForm" :rules="roleRules" ref="roleFormRef" label-width="100px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="请输入角色名称 (例如: admin, sales_manager)" />
        </el-form-item>
        <el-form-item label="角色描述" prop="description">
          <el-input type="textarea" v-model="roleForm.description" placeholder="请输入角色描述" />
        </el-form-item>
        <el-form-item label="权限分配" prop="permissions">
          <el-checkbox-group v-model="roleForm.permissions">
            <el-checkbox v-for="perm in availablePermissions" :key="perm.value" :label="perm.value">{{ perm.label }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Edit, Delete } from '@element-plus/icons-vue';

const roles = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const roleFormRef = ref(null);

// 假设的可用权限列表，实际项目中应该从后端获取或在前端定义好
const availablePermissions = ref([
  { value: 'view_dashboard', label: '查看仪表盘' },
  { value: 'manage_products', label: '管理产品' },
  { value: 'manage_sales', label: '管理销售' },
  { value: 'manage_customers', label: '管理客户' },
  { value: 'manage_users', label: '管理用户' },
  { value: 'manage_roles', label: '管理角色权限' },
  { value: 'generate_reports', label: '生成报表' },
  // 可以根据实际需要添加更多权限
]);

const roleForm = reactive({
  id: null,
  name: '',
  description: '',
  permissions: [],
});

const roleRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入角色描述', trigger: 'blur' }],
  permissions: [{ type: 'array', required: true, message: '请至少选择一个权限', trigger: 'change' }],
};

// 保护基础角色不被删除，例如 'admin' 和 'sales'
const protectedRoles = ['admin', 'sales']; 
const isRoleProtected = (roleName) => protectedRoles.includes(roleName.toLowerCase());

const fetchRoles = async () => {
  loading.value = true;
  try {
    const response = await axios.get('/api/roles'); // 假设获取角色的API端点
    roles.value = response.data.map(role => ({
        ...role,
        // 确保 permissions 是一个数组，即使后端返回 null 或 undefined
        permissions: Array.isArray(role.permissions) ? role.permissions : [] 
    }));
  } catch (error) {
    console.error('获取角色列表失败:', error);
    ElMessage.error('获取角色列表失败');
  } finally {
    loading.value = false;
  }
};

const handleAddRole = () => {
  dialogTitle.value = '新增角色';
  resetForm();
  dialogVisible.value = true;
};

const handleEditRole = (row) => {
  dialogTitle.value = '编辑角色';
  // 深拷贝，避免直接修改表格数据影响弹窗
  Object.assign(roleForm, JSON.parse(JSON.stringify(row))); 
  dialogVisible.value = true;
};

const handleDeleteRole = (id) => {
  ElMessageBox.confirm('确定要删除该角色吗? 这可能会影响到分配了此角色的用户。', '警告', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await axios.delete(`/api/roles/${id}`); // 假设删除角色的API端点
      ElMessage.success('角色删除成功');
      fetchRoles();
    } catch (error) {
      console.error('删除角色失败:', error);
      ElMessage.error(error.response?.data?.message || '删除角色失败');
    }
  }).catch(() => {});
};

const resetForm = () => {
  roleForm.id = null;
  roleForm.name = '';
  roleForm.description = '';
  roleForm.permissions = [];
  if (roleFormRef.value) {
    roleFormRef.value.resetFields();
  }
};

const submitForm = () => {
  roleFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (roleForm.id) {
          // 编辑角色
          await axios.put(`/api/roles/${roleForm.id}`, roleForm); // 假设更新角色的API端点
          ElMessage.success('角色更新成功');
        } else {
          // 新增角色
          await axios.post('/api/roles', roleForm); // 假设创建角色的API端点
          ElMessage.success('角色新增成功');
        }
        dialogVisible.value = false;
        fetchRoles();
      } catch (error) {
        console.error('提交角色表单失败:', error);
        ElMessage.error(error.response?.data?.message || (roleForm.id ? '更新角色失败' : '新增角色失败'));
      }
    }
  });
};

// 模拟获取可用权限列表 (如果需要从后端获取)
// const fetchAvailablePermissions = async () => {
//   try {
//     const response = await axios.get('/api/permissions'); // 假设获取所有可用权限的API端点
//     availablePermissions.value = response.data;
//   } catch (error) {
//     console.error('获取可用权限列表失败:', error);
//     ElMessage.error('获取可用权限列表失败');
//   }
// };

onMounted(() => {
  fetchRoles();
  // fetchAvailablePermissions(); // 如果权限列表需要从后端动态获取
});

</script>

<style scoped>
.role-management-container {
  padding: 20px;
}
.el-checkbox-group .el-checkbox {
  display: block; /* 让每个checkbox占据一行，或者调整布局 */
  margin-bottom: 8px;
}
</style>