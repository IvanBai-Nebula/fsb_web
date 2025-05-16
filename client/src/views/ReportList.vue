<template>
  <div class="report-list-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>报表管理</span>
        </div>
      </template>

      <el-tabs v-model="activeReportTab" class="report-tabs">
        <el-tab-pane label="销售报表" name="sales">
          <el-form :inline="true" :model="salesReportParams" label-width="80px">
            <el-form-item label="日期范围">
              <el-date-picker
                v-model="salesReportParams.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="generateReport('sales')" :loading="generating.sales">生成销售报表</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="库存报表" name="inventory">
          <el-form :inline="true" label-width="80px">
             <el-form-item label="报表类型">
                <el-select v-model="inventoryReportParams.type" placeholder="选择报表类型">
                    <el-option label="当前库存" value="current_stock"></el-option>
                    <el-option label="低库存预警" value="low_stock_alert"></el-option>
                </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="generateReport('inventory')" :loading="generating.inventory">生成库存报表</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="客户消费报表" name="customer_consumption">
          <el-form :inline="true" :model="customerConsumptionReportParams" label-width="100px">
            <el-form-item label="选择客户">
              <el-select v-model="customerConsumptionReportParams.customer_id" placeholder="选择客户" filterable clearable>
                <el-option
                  v-for="customer in customers"
                  :key="customer.id"
                  :label="customer.name"
                  :value="customer.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="日期范围">
              <el-date-picker
                v-model="customerConsumptionReportParams.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="generateReport('customer_consumption')" :loading="generating.customer_consumption">生成客户消费报表</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import FileSaver from 'file-saver';

const activeReportTab = ref('sales')
const generating = reactive({
  sales: false,
  inventory: false,
  customer_consumption: false
})

const salesReportParams = reactive({
  dateRange: []
})

const inventoryReportParams = reactive({
    type: 'current_stock'
});

const customerConsumptionReportParams = reactive({
  customer_id: null,
  dateRange: []
})

const customers = ref([])

const fetchCustomers = async () => {
  try {
    const response = await axios.get('/api/customers?all=true')
    customers.value = response.data.customers
  } catch (error) {
    ElMessage.error('获取客户列表失败')
    console.error('获取客户列表失败:', error)
  }
}

const generateReport = async (type) => {
  if (generating[type]) return
  generating[type] = true

  let params = {}
  let reportName = `${type}_report.xlsx`;

  switch (type) {
    case 'sales':
      if (salesReportParams.dateRange && salesReportParams.dateRange.length === 2) {
        params.startDate = salesReportParams.dateRange[0]
        params.endDate = salesReportParams.dateRange[1]
        reportName = `sales_report_${params.startDate}_to_${params.endDate}.xlsx`;
      } else {
        ElMessage.warning('请选择销售报表的日期范围');
        generating[type] = false;
        return;
      }
      break;
    case 'inventory':
      params.type = inventoryReportParams.type;
      reportName = `${inventoryReportParams.type}_report.xlsx`;
      break;
    case 'customer_consumption':
      if (!customerConsumptionReportParams.customer_id) {
        ElMessage.warning('请选择客户');
        generating[type] = false;
        return;
      }
      params.customer_id = customerConsumptionReportParams.customer_id
      if (customerConsumptionReportParams.dateRange && customerConsumptionReportParams.dateRange.length === 2) {
        params.startDate = customerConsumptionReportParams.dateRange[0]
        params.endDate = customerConsumptionReportParams.dateRange[1]
        reportName = `customer_${params.customer_id}_consumption_report_${params.startDate}_to_${params.endDate}.xlsx`;
      } else {
         ElMessage.warning('请选择客户消费报表的日期范围');
        generating[type] = false;
        return;
      }
      break;
  }

  try {
    const response = await axios.get(`/api/reports/${type}`, {
      params,
      responseType: 'blob' // Important for file download
    })

    FileSaver.saveAs(new Blob([response.data]), reportName);
    ElMessage.success(`${type.replace(/_/g, ' ')} 报表生成成功并已开始下载`)

  } catch (error) {
    ElMessage.error(error.response?.data?.message || `生成 ${type.replace(/_/g, ' ')} 报表失败`)
    console.error(`生成 ${type} 报表失败:`, error)
  } finally {
    generating[type] = false
  }
}

onMounted(() => {
  fetchCustomers()
})

</script>

<style scoped>
.report-list-container {
  padding: 20px;
}
.report-tabs .el-tab-pane {
  padding: 15px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>