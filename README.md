# 卫材销售管理系统

基于Vue3 + Express + MySQL的卫材销售管理系统，提供商品管理、销售管理、客户管理、报表管理和系统管理等功能。

## 技术架构

- **前端**：Vue3 + Element Plus
- **构建工具**：Vite
- **后端**：Node.js + Express
- **数据库**：MySQL 8.0
- **安全认证**：JWT
- **报表生成**：xlsx库

## 核心功能模块

### 卫材管理
- 商品增删改查
- 库存预警标识（红色/绿色）

### 销售管理
- 创建/查询订单
- 支持多商品选择与数量输入

### 订单状态管理
- 简单状态流转（待处理/已完成）

### 客户管理
- 客户信息维护
- 医疗许可证号唯一性校验
- 客户等级划分（根据累计消费自动分级）

### 报表管理
- 导出销售报表（Excel格式，含基础统计数据）

### 系统管理
- 用户权限控制（管理员/销售员两种角色）

## 项目结构

```
├── client/                 # 前端项目
│   ├── public/             # 静态资源
│   ├── src/                # 源代码
│   │   ├── assets/         # 资源文件
│   │   ├── components/     # 组件
│   │   ├── router/         # 路由
│   │   ├── store/          # 状态管理
│   │   ├── views/          # 页面
│   │   ├── App.vue         # 主组件
│   │   └── main.js         # 入口文件
│   ├── index.html          # HTML模板
│   ├── package.json        # 依赖配置
│   └── vite.config.js      # Vite配置
├── server/                 # 后端项目
│   ├── config/             # 配置文件
│   ├── controllers/        # 控制器
│   ├── middleware/         # 中间件
│   ├── models/             # 数据模型
│   ├── routes/             # 路由
│   ├── utils/              # 工具函数
│   ├── app.js              # 应用入口
│   ├── package.json        # 依赖配置
│   └── server.js           # 服务器启动
├── .gitignore              # Git忽略文件
└── README.md               # 项目说明
```

## 安装与运行

### 前端

```bash
cd client
npm install
npm run dev
```

### 后端

```bash
cd server
npm install
npm run dev
```

## 数据库设计

### 商品表(products)
- id: 主键
- name: 商品名称
- category: 分类（耗材/器械/药品）
- price: 单价
- stock: 当前库存
- min_stock: 安全库存阈值

### 客户表(customers)
- id: 主键
- license_no: 医疗许可证号（唯一）
- name: 机构名称
- contact: 联系人
- total_spent: 累计消费金额

### 订单表(orders)
- id: 主键
- customer_id: 客户ID
- total: 总金额
- status: 状态（pending/completed）
- created_at: 创建时间

### 订单明细表(order_items)
- order_id: 订单ID
- product_id: 商品ID
- quantity: 购买数量
- unit_price: 成交单价（下单时快照）

### 用户表(users)
- id: 主键
- username: 用户名（唯一）
- password: 加密密码
- role: 角色（admin/sales）

## 开发阶段

1. **基础搭建**（3天）
   - 前后端项目初始化
   - 用户登录/权限模块
   - 数据库连接配置

2. **核心功能开发**（7天）
   - 商品管理模块
   - 订单创建流程
   - 客户等级计算

3. **测试优化**（2天）
   - 关键流程测试
   - 界面交互优化
   - 文档整理