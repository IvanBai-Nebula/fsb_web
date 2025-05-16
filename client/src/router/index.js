import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "../stores/user";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/",
    component: () => import("../views/Layout.vue"),
    redirect: "/dashboard",
    meta: { requiresAuth: true },
    children: [
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("../views/Dashboard.vue"),
        meta: { title: "首页", icon: "House" },
      },
      {
        path: "user-profile",
        name: "UserProfile",
        component: () => import("../views/system/UserProfile.vue"),
        meta: { title: "个人中心", icon: "User" }, // icon 可以根据实际图标库调整
      },
      {
        path: "role-management",
        name: "RoleManagement",
        component: () => import("../views/system/RoleManagement.vue"),
        meta: {
          title: "角色权限",
          icon: "Setting",
          requiresAuth: true,
          roles: ["admin"],
        }, // 假设需要管理员权限
      },
      {
        path: "products",
        name: "Products",
        component: () => import("../views/ProductList.vue"),
        meta: { title: "卫材管理", icon: "Box" },
      },
      {
        path: "customers",
        name: "Customers",
        component: () => import("../views/CustomerList.vue"),
        meta: { title: "客户管理", icon: "User" },
      },
      {
        path: "sales",
        name: "Sales",
        component: () => import("../views/SalesList.vue"),
        meta: { title: "销售管理", icon: "ShoppingCart" },
      },
      {
        path: "sales/create",
        name: "CreateSale",
        component: () => import("../views/CreateSale.vue"),
        meta: { title: "创建订单", icon: "Plus" },
      },

      {
        path: "reports",
        name: "ReportList",
        component: () => import("../views/ReportList.vue"),
        meta: { title: "报表管理", icon: "DataAnalysis" },
      },
      {
        path: "forbidden",
        name: "Forbidden",
        component: () => import("../views/Forbidden.vue"),
        meta: { title: "无权限访问", icon: "Warning" },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  const userStore = useUserStore(); // 确保 useUserStore 可以在这里被正确调用
  const isAuthenticated = userStore.isLoggedIn;
  const userRole = userStore.userInfo?.role; // 假设用户信息中有 role 字段

  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!isAuthenticated) {
      next({ name: "Login", query: { redirect: to.fullPath } });
    } else {
      // 检查角色权限
      if (to.meta.roles && !to.meta.roles.includes(userRole)) {
        next({ name: "Forbidden" }); // 或者跳转到无权限页面
      } else {
        next();
      }
    }
  } else {
    next();
  }
});

export default router;
