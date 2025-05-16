<template>
  <div class="customer-list-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>客户管理</span>
          <el-button type="primary" :icon="Plus" @click="openDialog('add')"
            >添加客户</el-button
          >
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="客户名称">
          <el-input
            v-model="searchForm.name"
            placeholder="输入客户名称搜索"
            clearable
          />
        </el-form-item>
        <el-form-item label="许可证号">
          <el-input
            v-model="searchForm.license_no"
            placeholder="输入许可证号搜索"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="fetchCustomers"
            >搜索</el-button
          >
        </el-form-item>
      </el-form>

      <el-table :data="customers" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="客户名称" />
        <el-table-column prop="license_no" label="许可证号" />
        <el-table-column prop="contact_person" label="联系人" />
        <el-table-column prop="contact_phone" label="联系电话" />
        <el-table-column prop="address" label="地址" />
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button
              size="small"
              type="warning"
              :icon="Edit"
              @click="openDialog('edit', scope.row)"
              >编辑</el-button
            >
            <el-button
              size="small"
              type="danger"
              :icon="Delete"
              @click="handleDelete(scope.row.id)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="totalCustomers > 0"
        class="pagination-container"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="totalCustomers"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </el-card>

    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="50%"
      :before-close="handleCloseDialog"
    >
      <el-form
        :model="customerForm"
        :rules="customerRules"
        ref="customerFormRef"
        label-width="100px"
      >
        <el-form-item label="客户名称" prop="name">
          <el-input v-model="customerForm.name" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item label="许可证号" prop="license_no">
          <el-input
            v-model="customerForm.license_no"
            placeholder="请输入许可证号"
          />
        </el-form-item>
        <el-form-item label="联系人" prop="contact_person">
          <el-input
            v-model="customerForm.contact_person"
            placeholder="请输入联系人"
          />
        </el-form-item>
        <el-form-item label="联系电话" prop="contact_phone">
          <el-input
            v-model="customerForm.contact_phone"
            placeholder="请输入联系电话"
          />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input
            type="textarea"
            v-model="customerForm.address"
            placeholder="请输入地址"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="submitCustomerForm"
            :loading="submittingForm"
            >确定</el-button
          >
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Edit, Delete, Search } from "@element-plus/icons-vue";

const customers = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const dialogTitle = ref("");
const dialogMode = ref("add"); // 'add' or 'edit'
const customerFormRef = ref(null);
const submittingForm = ref(false);

const searchForm = reactive({
  name: "",
  license_no: "",
});

const customerForm = reactive({
  id: null,
  name: "",
  license_no: "",
  contact_person: "",
  contact_phone: "",
  address: "",
});

const customerRules = {
  name: [{ required: true, message: "请输入客户名称", trigger: "blur" }],
  license_no: [{ required: true, message: "请输入许可证号", trigger: "blur" }],
};

const totalCustomers = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

const fetchCustomers = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      name: searchForm.name || undefined,
      license_no: searchForm.license_no || undefined,
    };
    const response = await axios.get("/api/customers", { params });
    customers.value = response.data.customers;
    totalCustomers.value = response.data.total;
  } catch (error) {
    ElMessage.error("获取客户列表失败");
    console.error("获取客户列表失败:", error);
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page) => {
  currentPage.value = page;
  fetchCustomers();
};

const openDialog = (mode, customerData = null) => {
  dialogMode.value = mode;
  if (mode === "add") {
    dialogTitle.value = "添加客户";
    // 重置表单
    Object.keys(customerForm).forEach((key) => (customerForm[key] = null));
    customerForm.name = ""; // 确保必填项为空字符串以便校验
    customerForm.license_no = "";
    customerForm.contact_person = "";
    customerForm.contact_phone = "";
    customerForm.address = "";
  } else {
    dialogTitle.value = "编辑客户";
    Object.assign(customerForm, customerData);
  }
  dialogVisible.value = true;
  // 清除上次的校验结果
  if (customerFormRef.value) {
    customerFormRef.value.clearValidate();
  }
};

const handleCloseDialog = (done) => {
  // 可在此处添加关闭前的确认逻辑
  done();
};

const submitCustomerForm = () => {
  customerFormRef.value.validate(async (valid) => {
    if (valid) {
      submittingForm.value = true;
      try {
        if (dialogMode.value === "add") {
          await axios.post("/api/customers", customerForm);
          ElMessage.success("客户添加成功");
        } else {
          await axios.put(`/api/customers/${customerForm.id}`, customerForm);
          ElMessage.success("客户更新成功");
        }
        dialogVisible.value = false;
        fetchCustomers(); // 刷新列表
      } catch (error) {
        ElMessage.error(
          error.response?.data?.message ||
            (dialogMode.value === "add" ? "添加失败" : "更新失败")
        );
        console.error("客户操作失败:", error);
      } finally {
        submittingForm.value = false;
      }
    }
  });
};

const handleDelete = (id) => {
  ElMessageBox.confirm("确定要删除该客户吗？此操作不可撤销。", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        await axios.delete(`/api/customers/${id}`);
        ElMessage.success("客户删除成功");
        fetchCustomers(); // 刷新列表
      } catch (error) {
        ElMessage.error(error.response?.data?.message || "删除失败");
        console.error("删除客户失败:", error);
      }
    })
    .catch(() => {
      // 用户取消操作
    });
};

onMounted(() => {
  fetchCustomers();
});
</script>

<style scoped>
.customer-list-container {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.search-form .el-form-item {
  margin-bottom: 20px;
}
</style>
