<template>
  <div class="product-list-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>产品列表</span>
          <el-button type="primary" :icon="Plus" @click="handleAddProduct"
            >新增产品</el-button
          >
        </div>
      </template>

      <!-- 搜索和筛选区域 -->
      <el-form :inline="true" :model="searchParams" class="search-form">
        <el-form-item label="产品名称">
          <el-input
            v-model="searchParams.name"
            placeholder="请输入产品名称"
            clearable
          />
        </el-form-item>
        <el-form-item label="产品类别">
          <el-input
            v-model="searchParams.category"
            placeholder="请输入产品类别"
            clearable
          />
        </el-form-item>
        <el-form-item label="库存状态">
          <el-select
            v-model="searchParams.stockStatus"
            placeholder="请选择库存状态"
            clearable
          >
            <el-option label="全部" value=""></el-option>
            <el-option label="正常" value="normal"></el-option>
            <el-option label="库存预警" value="low_stock"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch"
            >搜索</el-button
          >
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 产品表格 -->
      <el-table :data="products" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="产品名称" />
        <el-table-column prop="category" label="类别" />
        <el-table-column prop="price" label="单价">
          <template #default="scope">
            ¥{{ scope.row.price.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" />
        <el-table-column prop="alert_stock" label="预警库存" />
        <el-table-column label="库存状态" width="120">
          <template #default="scope">
            <el-tag
              :type="
                scope.row.stock < scope.row.alert_stock ? 'danger' : 'success'
              "
            >
              {{
                scope.row.stock < scope.row.alert_stock ? "库存预警" : "正常"
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="scope">
            <el-button
              size="small"
              type="primary"
              :icon="Edit"
              @click="handleEditProduct(scope.row)"
              >编辑</el-button
            >
            <el-button
              size="small"
              type="danger"
              :icon="Delete"
              @click="handleDeleteProduct(scope.row.id)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-if="totalProducts > 0"
        class="pagination-container"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="totalProducts"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 新增/编辑产品对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="500px"
      @close="resetForm"
    >
      <el-form
        :model="productForm"
        :rules="productRules"
        ref="productFormRef"
        label-width="100px"
      >
        <el-form-item label="产品名称" prop="name">
          <el-input v-model="productForm.name" placeholder="请输入产品名称" />
        </el-form-item>
        <el-form-item label="产品类别" prop="category">
          <el-select
            v-model="productForm.category"
            placeholder="请选择产品类别"
          >
            <el-option label="耗材" value="耗材"></el-option>
            <el-option label="器械" value="器械"></el-option>
            <el-option label="药品" value="药品"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="单价" prop="price">
          <el-input-number
            v-model="productForm.price"
            :precision="2"
            :step="0.1"
            :min="0"
            placeholder="请输入单价"
          />
        </el-form-item>
        <el-form-item label="库存数量" prop="stock">
          <el-input-number
            v-model="productForm.stock"
            :min="0"
            placeholder="请输入库存数量"
          />
        </el-form-item>
        <el-form-item label="预警库存" prop="alert_stock">
          <el-input-number
            v-model="productForm.alert_stock"
            :min="0"
            placeholder="请输入预警库存"
          />
        </el-form-item>
        <el-form-item label="产品描述" prop="description">
          <el-input
            v-model="productForm.description"
            type="textarea"
            placeholder="请输入产品描述"
          />
        </el-form-item>
        <el-form-item label="供应商" prop="supplier">
          <el-input v-model="productForm.supplier" placeholder="请输入供应商" />
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
import { ref, reactive, onMounted, computed } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Edit, Delete, Search, Refresh } from "@element-plus/icons-vue";

const products = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const dialogTitle = ref("");
const productFormRef = ref(null);

const searchParams = reactive({
  name: "",
  category: "",
  stockStatus: "",
});

const currentPage = ref(1);
const pageSize = ref(10);
const totalProducts = ref(0);

const productForm = reactive({
  id: null,
  name: "",
  category: "",
  price: 0,
  stock: 0,
  alert_stock: 0,
  description: "",
  supplier: "",
});

const productRules = {
  name: [{ required: true, message: "请输入产品名称", trigger: "blur" }],
  category: [{ required: true, message: "请输入产品类别", trigger: "blur" }],
  price: [
    { required: true, message: "请输入单价", trigger: "blur" },
    { type: "number", message: "单价必须为数字" },
  ],
  stock: [
    { required: true, message: "请输入库存数量", trigger: "blur" },
    { type: "number", message: "库存数量必须为数字" },
  ],
  alert_stock: [
    { required: true, message: "请输入预警库存", trigger: "blur" },
    { type: "number", message: "预警库存必须为数字" },
  ],
  description: [
    { required: false, message: "请输入产品描述", trigger: "blur" },
  ],
  supplier: [{ required: false, message: "请输入供应商", trigger: "blur" }],
};

const fetchProducts = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      name: searchParams.name || undefined,
      category: searchParams.category || undefined,
      stock_status: searchParams.stockStatus || undefined,
    };
    const response = await axios.get("/api/products", { params });
    products.value = response.data.products.map((product) => ({
      ...product,
      price: parseFloat(product.price), // Ensure price is a number
    }));
    totalProducts.value = response.data.total;
  } catch (error) {
    ElMessage.error("获取产品列表失败");
    console.error("获取产品列表失败:", error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchProducts();
};

const resetSearch = () => {
  searchParams.name = "";
  searchParams.category = "";
  searchParams.stockStatus = "";
  currentPage.value = 1;
  fetchProducts();
};

const handleAddProduct = () => {
  dialogTitle.value = "新增产品";
  resetForm();
  dialogVisible.value = true;
};

const handleEditProduct = (row) => {
  dialogTitle.value = "编辑产品";
  Object.assign(productForm, row);
  dialogVisible.value = true;
};

const handleDeleteProduct = (id) => {
  ElMessageBox.confirm("确定要删除该产品吗?", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        await axios.delete(`/api/products/${id}`);
        ElMessage.success("删除成功");
        fetchProducts(); // 重新获取列表
      } catch (error) {
        ElMessage.error("删除失败");
        console.error("删除产品失败:", error);
      }
    })
    .catch(() => {
      // 用户取消删除
    });
};

const resetForm = () => {
  productForm.id = null;
  productForm.name = "";
  productForm.category = "";
  productForm.price = 0;
  productForm.stock = 0;
  productForm.alert_stock = 0;
  productForm.description = "";
  productForm.supplier = "";
  if (productFormRef.value) {
    productFormRef.value.resetFields();
  }
};

const submitForm = () => {
  productFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (productForm.id) {
          // 编辑
          await axios.put(`/api/products/${productForm.id}`, productForm);
          ElMessage.success("更新成功");
        } else {
          // 新增
          await axios.post("/api/products", productForm);
          ElMessage.success("新增成功");
        }
        dialogVisible.value = false;
        fetchProducts(); // 重新获取列表
      } catch (error) {
        ElMessage.error(productForm.id ? "更新失败" : "新增失败");
        console.error("提交产品表单失败:", error);
      }
    }
  });
};

const handleSizeChange = (val) => {
  pageSize.value = val;
  currentPage.value = 1; // 页码大小改变时，回到第一页
  fetchProducts();
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  fetchProducts();
};

onMounted(() => {
  fetchProducts();
});
</script>

<style scoped>
.product-list-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
