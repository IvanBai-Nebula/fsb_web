<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="aside">
      <div class="logo-container">
        <img
          v-if="isCollapse"
          src="/logo.svg"
          alt="Logo"
          class="logo-collapsed"
        />
        <h1 v-else class="logo">卫材销售管理系统</h1>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        :collapse="isCollapse"
        :collapse-transition="false"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
      >
        <template v-for="item in menuItems" :key="item.path">
          <el-sub-menu
            v-if="item.children && item.children.length > 0"
            :index="item.path"
          >
            <template #title>
              <el-icon>
                <component :is="item.meta.icon" />
              </el-icon>
              <span>{{ item.meta.title }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.path"
              :index="child.path"
              v-if="
                !child.meta.roles ||
                child.meta.roles.includes(userStore.user?.role)
              "
            >
              <el-icon>
                <component :is="child.meta.icon" />
              </el-icon>
              <span>{{ child.meta.title }}</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item
            v-else
            :index="item.path"
            v-if="
              !item.meta.roles || item.meta.roles.includes(userStore.user?.role)
            "
          >
            <el-icon>
              <component :is="item.meta.icon" />
            </el-icon>
            <span>{{ item.meta.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="toggle-icon" @click="toggleSidebar">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <breadcrumb />
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              <el-avatar
                v-if="userStore.user?.avatar_url"
                :src="getFullAvatarUrl(userStore.user.avatar_url)"
                :size="32"
                style="margin-right: 8px"
              />
              <el-avatar
                v-else
                :size="32"
                style="margin-right: 8px; background: #d9ecff; color: #409eff"
              >
                <el-icon>
                  <User />
                </el-icon>
              </el-avatar>
              <span class="user-info">
                <div class="username">{{ userStore.user?.username }}</div>
                <div
                  v-if="userStore.user?.nickname || userStore.user?.email"
                  class="user-details"
                ></div>
              </span>
              <el-icon>
                <ArrowDown />
              </el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "../stores/user";
import {
  House,
  Box,
  ShoppingCart,
  Plus,
  User,
  Document,
  Setting,
  Fold,
  Expand,
  ArrowDown,
} from "@element-plus/icons-vue";
import Breadcrumb from "../components/Breadcrumb.vue";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

// 侧边栏折叠状态
const isCollapse = ref(false);

// 获取路由菜单项
const menuItems = computed(() => {
  const allRoutes =
    router.options.routes.find((r) => r.path === "/")?.children || [];
  const systemManagementChildren = [];
  const otherMenuItems = [];

  allRoutes.forEach((item) => {
    // 跳过无权限访问页面
    if (item.name === "Forbidden") {
      return;
    }

    if (item.meta && item.meta.title) {
      if (item.path === "/user-profile" || item.path === "/role-management") {
        // 检查角色权限，仅当用户有权访问时才添加到子菜单
        if (
          item.name === "RoleManagement" &&
          userStore.user?.role !== "admin"
        ) {
          // 非管理员不显示角色管理菜单
          return;
        } else {
          systemManagementChildren.push({
            ...item,
            // 确保路径是完整的，如果路由定义中path不是以'/'开头，则拼接
            path: item.path.startsWith("/") ? item.path : `/${item.path}`,
          });
        }
      } else {
        otherMenuItems.push({
          ...item,
          path: item.path.startsWith("/") ? item.path : `/${item.path}`,
        });
      }
    }
  });

  const finalMenuItems = [...otherMenuItems];
  if (systemManagementChildren.length > 0) {
    finalMenuItems.push({
      path: "/system",
      meta: { title: "系统管理", icon: "Setting" }, // 父菜单项
      children: systemManagementChildren,
    });
  }
  // 根据需要对 finalMenuItems 进行排序，例如把系统管理放到最后
  finalMenuItems.sort((a, b) => {
    if (a.meta.title === "系统管理") return 1;
    if (b.meta.title === "系统管理") return -1;
    // 可以根据其他meta属性或path进行排序
    return 0;
  });

  return finalMenuItems;
});

// 当前激活的菜单
const activeMenu = computed(() => {
  return "/" + route.path.split("/")[1];
});

// 切换侧边栏折叠状态
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value;
};

// 处理下拉菜单命令
const handleCommand = (command) => {
  if (command === "logout") {
    userStore.logout();
  } else if (command === "profile") {
    router.push("/user-profile");
  }
};

// 处理头像URL，确保使用完整路径
const getFullAvatarUrl = (url) => {
  if (!url) return "";
  // 如果已经是完整URL（以http或https开头），则直接返回
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // 如果是相对路径（以/uploads开头），则添加服务器地址
  if (url.startsWith("/uploads/")) {
    return `http://localhost:5000${url}`;
  }
  // 如果只有文件名部分（uploads/xxx.jpg），则添加完整前缀
  if (url.startsWith("uploads/")) {
    return `http://localhost:5000/${url}`;
  }
  // 其他情况，假设是相对路径，添加服务器地址
  return `http://localhost:5000/${url}`;
};
</script>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
  display: flex;
  flex-direction: row;

  .el-header {
    background-color: #fff;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    height: 60px !important;

    .header-left {
      display: flex;
      align-items: center;

      .toggle-icon {
        font-size: 20px;
        cursor: pointer;
        margin-right: 15px;
        color: #606266;

        &:hover {
          color: #409eff;
        }
      }
    }

    .header-right {
      display: flex;
      align-items: center;
    }

    .user-dropdown {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 5px 10px;
      border-radius: 4px;
      transition: background-color 0.3s;

      &:hover {
        background-color: #f5f7fa;
      }
    }

    .user-info {
      display: flex;
      flex-direction: column;
      margin-right: 8px;
      line-height: 1.2;
    }

    .username {
      font-weight: 500;
      color: #303133;
    }

    .user-details {
      font-size: 12px;
      color: #909399;
    }

    .user-email {
      margin-left: 4px;
    }
  }

  .aside {
    background-color: #304156;
    transition: width 0.3s;
    overflow-x: hidden;

    .logo-container {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;

      .logo {
        color: #fff;
        font-size: 16px;
        margin: 0;
        white-space: nowrap;
      }
      .logo-collapsed {
        width: 32px; /* 根据你的图标大小调整 */
        height: 32px; /* 根据你的图标大小调整 */
        margin: 0;
      }
    }

    .el-menu-vertical {
      border-right: none;
      width: 100% !important; /* Ensure menu fills the aside width */
    }
  }

  .el-main {
    padding: 20px;
    background-color: #f5f7fa;
    overflow-y: auto;
  }
}
</style>
