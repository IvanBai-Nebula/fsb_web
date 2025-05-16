<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <!-- 销售统计卡片 -->
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card">
          <template #header>
            <div class="card-header">
              <el-icon><Money /></el-icon>
              <span>今日销售额</span>
            </div>
          </template>
          <div class="card-content">
            <div class="stat-value">¥{{ todaySales.toLocaleString() }}</div>
            <div
              class="stat-compare"
              :class="{ up: salesTrend > 0, down: salesTrend < 0 }"
            >
              <el-icon v-if="salesTrend > 0"><ArrowUp /></el-icon>
              <el-icon v-else-if="salesTrend < 0"><ArrowDown /></el-icon>
              <span>{{ Math.abs(salesTrend) }}% 较昨日</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 订单统计卡片 -->
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card">
          <template #header>
            <div class="card-header">
              <el-icon><List /></el-icon>
              <span>今日订单数</span>
            </div>
          </template>
          <div class="card-content">
            <div class="stat-value">{{ todayOrders }}</div>
            <div
              class="stat-compare"
              :class="{ up: ordersTrend > 0, down: ordersTrend < 0 }"
            >
              <el-icon v-if="ordersTrend > 0"><ArrowUp /></el-icon>
              <el-icon v-else-if="ordersTrend < 0"><ArrowDown /></el-icon>
              <span>{{ Math.abs(ordersTrend) }}% 较昨日</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 客户统计卡片 -->
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card">
          <template #header>
            <div class="card-header">
              <el-icon><User /></el-icon>
              <span>客户总数</span>
            </div>
          </template>
          <div class="card-content">
            <div class="stat-value">{{ totalCustomers }}</div>
            <div class="stat-compare">
              <span>本月新增 {{ newCustomers }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 库存预警卡片 -->
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card warning">
          <template #header>
            <div class="card-header">
              <el-icon><Warning /></el-icon>
              <span>库存预警</span>
            </div>
          </template>
          <div class="card-content">
            <div class="stat-value">{{ lowStockCount }}</div>
            <div class="stat-compare">
              <router-link to="/products?filter=low_stock"
                >查看详情</router-link
              >
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 销售趋势图 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>销售趋势</span>
              <el-radio-group v-model="salesChartPeriod" size="small">
                <el-radio-button value="week">本周</el-radio-button>
                <el-radio-button value="month">本月</el-radio-button>
                <el-radio-button value="year">本年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container">
            <div ref="salesChart" class="chart"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 热销产品和最近订单 -->
    <el-row :gutter="20" class="data-row">
      <!-- 热销产品 -->
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>热销产品</span>
            </div>
          </template>
          <el-table :data="topProducts" stripe style="width: 100%">
            <el-table-column prop="name" label="产品名称" />
            <el-table-column prop="category" label="类别" width="100" />
            <el-table-column prop="sales" label="销量" width="80" />
            <el-table-column prop="amount" label="销售额" width="120">
              <template #default="scope">
                ¥{{ scope.row.amount.toLocaleString() }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 最近订单 -->
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近订单</span>
              <router-link to="/sales" class="view-more">查看更多</router-link>
            </div>
          </template>
          <el-table :data="recentOrders" stripe style="width: 100%">
            <el-table-column prop="id" label="订单号" width="80" />
            <el-table-column prop="customer" label="客户" />
            <el-table-column prop="date" label="日期" width="100" />
            <el-table-column prop="total" label="金额" width="120">
              <template #default="scope">
                ¥{{ scope.row.total.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="scope">
                <router-link :to="`/sales/${scope.row.id}`">详情</router-link>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, nextTick } from "vue";
import {
  ArrowUp,
  ArrowDown,
  Money,
  List,
  User,
  Warning,
} from "@element-plus/icons-vue";
import axios from "axios";
import * as echarts from "echarts";

// 统计数据
const todaySales = ref(0);
const salesTrend = ref(5); // 百分比变化
const todayOrders = ref(0);
const ordersTrend = ref(-2); // 百分比变化
const totalCustomers = ref(0);
const newCustomers = ref(0);
const lowStockCount = ref(0);

// 图表相关
const salesChart = ref(null);
const salesChartPeriod = ref("week");
let chartInstance = null;

// 表格数据
const topProducts = ref([]);
const recentOrders = ref([]);

// 获取仪表盘数据
const fetchDashboardData = async () => {
  try {
    const response = await axios.get("/api/dashboard"); // 改为从API获取
    const data = response.data;

    // 更新数据
    todaySales.value = data.summaryStats?.todaySales || 0;
    salesTrend.value = data.summaryStats?.salesTrend || 0;
    todayOrders.value = data.summaryStats?.todayOrders || 0;
    ordersTrend.value = data.summaryStats?.ordersTrend || 0;
    totalCustomers.value = data.summaryStats?.totalCustomers || 0;
    newCustomers.value = data.summaryStats?.newCustomers || 0;
    lowStockCount.value = data.summaryStats?.lowStockCount || 0;
    topProducts.value = data.topProducts || [];
    recentOrders.value = data.recentOrders || [];

    // 更新图表，确保 salesData 和 salesChartPeriod.value 对应的周期数据存在
    if (data.salesData && data.salesData[salesChartPeriod.value]) {
      updateChart(data.salesData[salesChartPeriod.value]);
    } else {
      // 如果特定周期数据不存在，可以提供一个默认空状态或上一个周期的数据
      updateChart({ dates: [], values: [] });
      console.warn(`销售数据中未找到周期 ${salesChartPeriod.value} 的数据`);
    }
  } catch (error) {
    console.error("获取仪表盘数据失败:", error);
    // ElMessage.error('获取仪表盘数据失败'); // ElMessage 可能未导入或未在setup中返回
    alert("获取仪表盘数据失败，请检查后端服务是否正常或稍后再试。");
    // 可以设置一些默认值，防止页面因数据加载失败而崩溃
    todaySales.value = 0;
    salesTrend.value = 0;
    todayOrders.value = 0;
    ordersTrend.value = 0;
    totalCustomers.value = 0;
    newCustomers.value = 0;
    lowStockCount.value = 0;
    topProducts.value = [];
    recentOrders.value = [];
    updateChart({ dates: [], values: [] });
  }
};

// 初始化图表
const initChart = () => {
  if (chartInstance) {
    chartInstance.dispose();
  }

  chartInstance = echarts.init(salesChart.value);

  const option = {
    tooltip: {
      trigger: "axis",
      formatter: "{b}<br />销售额: ¥{c}",
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: [],
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: "¥{value}",
      },
    },
    series: [
      {
        name: "销售额",
        type: "line",
        smooth: true,
        lineStyle: {
          width: 3,
          color: "#409EFF",
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(64, 158, 255, 0.5)" },
            { offset: 1, color: "rgba(64, 158, 255, 0.1)" },
          ]),
        },
        data: [],
      },
    ],
  };

  chartInstance.setOption(option);
};

// 更新图表数据
const updateChart = (data) => {
  if (!chartInstance) return;

  chartInstance.setOption({
    xAxis: {
      data: data.dates,
    },
    series: [
      {
        data: data.values,
      },
    ],
  });
};

// 监听图表周期变化
watch(salesChartPeriod, () => {
  fetchDashboardData();
});

// 监听窗口大小变化，调整图表大小
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize();
  }
};

onMounted(() => {
  fetchDashboardData();
  nextTick(() => {
    initChart();
    window.addEventListener("resize", handleResize);
  });
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  background-color: #f4f6f8; /* 更柔和的背景色 */
}

.el-row {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap; /* 允许换行以适应小屏幕 */
}

.card-header .el-icon {
  margin-right: 8px;
}

.stat-card {
  height: 100%;
  transition: all 0.3s ease-in-out; /* 平滑过渡效果 */
  border: 1px solid #ebeef5; /* 添加细微边框 */
  border-radius: 4px; /* 轻微圆角 */
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12); /* 优化悬停阴影 */
}

.stat-card.warning .card-header {
  color: #e6a23c;
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 15px 0; /* 调整内部间距 */
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 10px;
}

.stat-compare {
  font-size: 14px;
  display: flex;
  align-items: center;
}

.stat-compare.up {
  color: #67c23a;
}

.stat-compare.down {
  color: #f56c6c;
}

.stat-compare .el-icon {
  margin-right: 4px;
}

.chart-row {
  margin-top: 20px;
}

.chart-container {
  height: 350px;
}

.chart {
  width: 100%;
  height: 100%;
}

.data-row {
  margin-top: 20px;
}

.view-more {
  font-size: 14px;
  color: #409eff;
  text-decoration: none;
}

.view-more:hover {
  text-decoration: underline;
}
</style>
