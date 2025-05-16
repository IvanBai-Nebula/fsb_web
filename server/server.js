require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { sequelize } = require("./config/database");
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const customersRouter = require("./routes/customers");
const reportsRouter = require("./routes/reports");
const authRouter = require("./routes/auth");
const dashboardRouter = require("./routes/dashboard");
const usersRouter = require("./routes/users"); // 引入users路由
const rolesRouter = require("./routes/roles"); // 引入roles路由
const uploadRouter = require("./routes/upload");

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json());

// 静态资源和上传接口
app.use("/api/upload", uploadRouter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 路由
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/customers", customersRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/users", usersRouter); // 使用users路由
app.use("/api/roles", rolesRouter); // 使用roles路由

// 数据库连接与服务器启动
sequelize
  .sync({ alter: process.env.NODE_ENV === "development" })
  .then(() => {
    console.log("数据库连接成功");
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("数据库连接失败:", err);
  });
