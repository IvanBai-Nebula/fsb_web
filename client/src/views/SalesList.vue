<template>
  <div class="sales-list-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>销售订单列表</span>
          <router-link to="/sales/create">
            <el-button type="primary" :icon="Plus">创建新订单</el-button>
          </router-link>
        </div>
      </template>

      <!-- 搜索和筛选区域 -->
      <el-form :inline="true" :model="searchParams" class="search-form">
        <el-form-item label="订单号">
          <el-input v-model="searchParams.id" placeholder="请输入订单号" clearable />
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input v-model="searchParams.customerName" placeholder="请输入客户名称" clearable />
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select v-model="searchParams.status" placeholder="请选择订单状态" clearable>
            <el-option label="全部" value=""></el-option>
            <el-option label="待处理" value="pending"></el-option>
            <el-option label="已完成" value="completed"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="下单日期">
          <el-date-picker
            v-model="searchParams.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            clearable
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 订单表格 -->
      <el-table :data="orders" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="id" label="订单号" width="100" />
        <el-table-column prop="Customer.name" label="客户名称" />
        <el-table-column prop="User.username" label="销售员" />
        <el-table-column prop="total" label="订单金额">
          <template #default="scope">
            ¥{{ scope.row.total.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="订单状态">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'completed' ? 'success' : 'warning'">
              {{ scope.row.status === 'completed' ? '已完成' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="下单日期">
          <template #default="scope">
            {{ new Date(scope.row.created_at).toLocaleDateString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handleViewOrder(scope.row.id)">详情</el-button>
            <!-- 根据业务需求可以添加编辑、取消订单等操作 -->
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-if="totalOrders > 0"
        class="pagination-container"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="totalOrders"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 订单详情对话框 (后续添加) -->
    <el-dialog title="订单详情" v-model="orderDetailsVisible" width="70%">
      <p>订单ID: {{ currentOrder?.id }}</p>
      <p>客户: {{ currentOrder?.Customer?.name }}</p>
      <p>销售员: {{ currentOrder?.User?.username }}</p>
      <p>总金额: ¥{{ currentOrder?.total?.toLocaleString() }}</p>
      <p>状态: {{ currentOrder?.status === 'completed' ? '已完成' : '待处理' }}</p>
      <p>下单时间: {{ currentOrder?.created_at ? new Date(currentOrder.created_at).toLocaleString() : '' }}</p>
      <h4>订单项目:</h4>
      <el-table :data="currentOrder?.OrderItems" stripe>
        <el-table-column prop="Product.name" label="产品名称" />
        <el-table-column prop="quantity" label="数量" />
        <el-table-column prop="unit_price" label="单价">
            <template #default="scope">
                ¥{{ scope.row.unit_price?.toLocaleString() }}
            </template>
        </el-table-column>
        <el-table-column label="小计">
            <template #default="scope">
                ¥{{ (scope.row.quantity * scope.row.unit_price).toLocaleString() }}
            </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="orderDetailsVisible = false">关闭</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const orders = ref([])
const loading = ref(false)
const orderDetailsVisible = ref(false)
const currentOrder = ref(null)

const searchParams = reactive({
  id: '',
  customerName: '',
  status: '',
  dateRange: []
})

const currentPage = ref(1)
const pageSize = ref(10)
const totalOrders = ref(0)

const fetchOrders = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      id: searchParams.id || undefined,
      customer_name: searchParams.customerName || undefined,
      status: searchParams.status || undefined,
      start_date: searchParams.dateRange?.[0] || undefined,
      end_date: searchParams.dateRange?.[1] || undefined
    }
    const response = await axios.get('/api/orders', { params })
    orders.value = response.data.orders
    totalOrders.value = response.data.total
  } catch (error) {
    ElMessage.error('获取订单列表失败')
    console.error('获取订单列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchOrders()
}

const resetSearch = () => {
  searchParams.id = ''
  searchParams.customerName = ''
  searchParams.status = ''
  searchParams.dateRange = []
  currentPage.value = 1
  fetchOrders()
}

const handleViewOrder = async (orderId) => {
  try {
    loading.value = true;
    const response = await axios.get(`/api/orders/${orderId}`);
    currentOrder.value = response.data;
    orderDetailsVisible.value = true;
  } catch (error) {
    ElMessage.error('获取订单详情失败');
    console.error('获取订单详情失败:', error);
  } finally {
    loading.value = false;
  }
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchOrders()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchOrders()
}

onMounted(() => {
  fetchOrders()
})

</script>

<style scoped>
.sales-list-container {
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