<template>
    <div class="forbidden-container">
        <el-result icon="error" title="无权限访问" sub-title="您没有权限访问此页面">
            <template #extra>
                <el-button type="primary" @click="goHome">返回首页</el-button>
            </template>
        </el-result>
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
    router.push('/dashboard')
}
</script>

<style scoped>
.forbidden-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 20px;
}
</style>