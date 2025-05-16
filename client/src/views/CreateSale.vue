<template>
  <div class="create-sale-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>创建销售订单</span>
        </div>
      </template>

      <el-form :model="orderForm" :rules="orderRules" ref="orderFormRef" label-width="100px">
        <el-form-item label="选择客户" prop="customer_id">
          <el-select v-model="orderForm.customer_id" placeholder="请选择客户" filterable clearable style="width: 100%;">
            <el-option
              v-for="customer in customers"
              :key="customer.id"
              :label="customer.name"
              :value="customer.id"
            />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">订单明细</el-divider>

        <div v-for="(item, index) in orderForm.items" :key="index" class="order-item-row">
          <el-row :gutter="20">
            <el-col :span="10">
              <el-form-item
                :label="`产品 ${index + 1}`"
                :prop="`items.${index}.product_id`"
                :rules="{ required: true, message: '请选择产品', trigger: 'change' }"
              >
                <el-select
                  v-model="item.product_id"
                  placeholder="选择产品"
                  filterable
                  clearable
                  @change="(productId) => handleProductChange(productId, index)"
                  style="width: 100%;"
                >
                  <el-option
                    v-for="product in products"
                    :key="product.id"
                    :label="`${product.name} (库存: ${product.stock})`"
                    :value="product.id"
                    :disabled="product.stock === 0"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item
                label="数量"
                :prop="`items.${index}.quantity`"
                :rules="[
                  { required: true, message: '请输入数量', trigger: 'blur' },
                  { type: 'integer', min: 1, message: '数量必须大于0', trigger: 'blur' },
                  { validator: (rule, value, callback) => validateStock(rule, value, callback, index), trigger: 'blur' }
                ]"
              >
                <el-input-number v-model="item.quantity" :min="1" controls-position="right" @change="calculateTotal" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="单价">
                <el-input :value="item.unit_price ? '¥' + item.unit_price.toFixed(2) : 'N/A'" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="2">
              <el-button type="danger" :icon="Delete" circle @click="removeItem(index)" v-if="orderForm.items.length > 1" />
            </el-col>
          </el-row>
        </div>

        <el-form-item>
          <el-button type="success" :icon="Plus" @click="addItem">添加产品</el-button>
        </el-form-item>

        <el-divider />

        <el-form-item label="订单总额">
          <h2 style="color: #F56C6C;">¥{{ orderTotal.toFixed(2) }}</h2>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitOrder" :loading="submitting">提交订单</el-button>
          <el-button @click="() => router.push('/sales')">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'

const router = useRouter()
const orderFormRef = ref(null)
const customers = ref([])
const products = ref([])
const submitting = ref(false)

const orderForm = reactive({
  customer_id: null,
  items: [
    { product_id: null, quantity: 1, unit_price: 0, stock: 0 }
  ]
})

const orderRules = {
  customer_id: [{ required: true, message: '请选择客户', trigger: 'change' }]
  // items的校验在模板中动态添加
}

const fetchCustomers = async () => {
  try {
    const response = await axios.get('/api/customers?all=true') // 获取所有客户用于选择
    customers.value = response.data.customers
  } catch (error) {
    ElMessage.error('获取客户列表失败')
    console.error('获取客户列表失败:', error)
  }
}

const fetchProducts = async () => {
  try {
    const response = await axios.get('/api/products?all=true') // 获取所有产品用于选择
    products.value = response.data.products
  } catch (error) {
    ElMessage.error('获取产品列表失败')
    console.error('获取产品列表失败:', error)
  }
}

const handleProductChange = (productId, index) => {
  const selectedProduct = products.value.find(p => p.id === productId)
  if (selectedProduct) {
    orderForm.items[index].unit_price = selectedProduct.price
    orderForm.items[index].stock = selectedProduct.stock
    // 如果数量超过库存，重置为1或最大库存
    if (orderForm.items[index].quantity > selectedProduct.stock && selectedProduct.stock > 0) {
        orderForm.items[index].quantity = selectedProduct.stock;
    } else if (selectedProduct.stock === 0) {
        orderForm.items[index].quantity = 0; // 或者不允许选择库存为0的商品
    }
  } else {
    orderForm.items[index].unit_price = 0
    orderForm.items[index].stock = 0
  }
  calculateTotal()
}

const validateStock = (rule, value, callback, index) => {
  const item = orderForm.items[index];
  if (item.product_id && value > item.stock) {
    callback(new Error(`库存不足，最大可售 ${item.stock}`));
  } else {
    callback();
  }
};

const addItem = () => {
  orderForm.items.push({ product_id: null, quantity: 1, unit_price: 0, stock: 0 })
}

const removeItem = (index) => {
  orderForm.items.splice(index, 1)
  calculateTotal()
}

const orderTotal = computed(() => {
  return orderForm.items.reduce((sum, item) => {
    return sum + (item.unit_price * item.quantity)
  }, 0)
})

// 手动触发计算总额，因为InputNumber的change事件可能不及时更新computed
const calculateTotal = () => {
  // 这个函数主要用于在数量变化时强制重新计算，computed属性会自动处理
  // 但为了确保响应性，可以手动触发一次
  const total = orderForm.items.reduce((sum, item) => {
    return sum + (item.unit_price * item.quantity);
  }, 0);
  // orderTotal.value = total; // computed属性不需要这样赋值
}

const submitOrder = () => {
  orderFormRef.value.validate(async (valid) => {
    if (valid) {
      if (orderForm.items.some(item => !item.product_id || item.quantity <= 0)) {
        ElMessage.error('请确保所有订单项都选择了产品且数量大于0')
        return
      }
      submitting.value = true
      try {
        const payload = {
          customer_id: orderForm.customer_id,
          items: orderForm.items.map(item => ({ product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price }))
        }
        await axios.post('/api/orders', payload)
        ElMessage.success('订单创建成功')
        router.push('/sales')
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '订单创建失败')
        console.error('创建订单失败:', error)
      } finally {
        submitting.value = false
      }
    }
  })
}

onMounted(() => {
  fetchCustomers()
  fetchProducts()
})

</script>

<style scoped>
.create-sale-container {
  padding: 20px;
}
.order-item-row {
  margin-bottom: 15px;
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.el-form-item {
  margin-bottom: 22px; /* 增加表单项间距 */
}
</style>