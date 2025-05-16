<template>
  <div class="app-container">
    <el-config-provider :locale="zhCn">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </el-config-provider>
  </div>
</template>

<script setup>
import { ElConfigProvider } from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
</script>
