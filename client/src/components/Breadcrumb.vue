<template>
  <el-breadcrumb separator="/" class="breadcrumb">
    <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="index" :to="item.path">
      {{ item.meta.title }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const breadcrumbs = ref([])

// 根据当前路由生成面包屑
const getBreadcrumbs = () => {
  const matched = route.matched.filter(item => item.meta && item.meta.title)
  
  // 首页始终显示
  if (matched.length && matched[0].path !== '/dashboard') {
    matched.unshift({
      path: '/dashboard',
      meta: { title: '首页' }
    })
  }
  
  breadcrumbs.value = matched
}

// 监听路由变化更新面包屑
watch(
  () => route.path,
  () => getBreadcrumbs(),
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.breadcrumb {
  display: inline-block;
  line-height: 60px;
}
</style>