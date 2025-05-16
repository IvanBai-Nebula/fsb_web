const express = require("express");
const router = express.Router();
const { Op, literal, fn, col } = require("sequelize");
const { Product, Customer, Order, OrderItem, User } = require("../models");
const auth = require("../middleware/auth");

// GET /api/dashboard - 获取仪表盘数据
router.get("/", auth, async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. 今日销售额和订单数
    const todaySalesResult = await Order.findOne({
      attributes: [
        [fn("SUM", col("total")), "totalSales"],
        [fn("COUNT", col("id")), "totalOrders"],
      ],
      where: {
        created_at: {
          [Op.between]: [startOfToday, endOfToday],
        },
        status: "completed", // 通常只统计已完成订单
      },
      raw: true,
    });
    const todaySales = parseFloat(todaySalesResult?.totalSales) || 0;
    const todayOrders = todaySalesResult?.totalOrders || 0;

    // 2. 昨日销售额和订单数 (用于计算趋势)
    const yesterdaySalesResult = await Order.findOne({
      attributes: [
        [fn("SUM", col("total")), "totalSales"],
        [fn("COUNT", col("id")), "totalOrders"],
      ],
      where: {
        created_at: {
          [Op.between]: [startOfYesterday, endOfYesterday],
        },
        status: "completed",
      },
      raw: true,
    });
    const yesterdaySales = parseFloat(yesterdaySalesResult?.totalSales) || 0;
    const yesterdayOrders = yesterdaySalesResult?.totalOrders || 0;

    const salesTrend =
      yesterdaySales > 0
        ? ((todaySales - yesterdaySales) / yesterdaySales) * 100
        : todaySales > 0
        ? 100
        : 0;
    const ordersTrend =
      yesterdayOrders > 0
        ? ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100
        : todayOrders > 0
        ? 100
        : 0;

    // 3. 客户总数和本月新增客户数
    const totalCustomers = await Customer.count();
    const newCustomers = await Customer.count({
      where: {
        created_at: {
          [Op.gte]: startOfMonth,
        },
      },
    });

    // 4. 库存预警数量
    const lowStockCount = await Product.count({
      where: {
        stock: {
          [Op.lte]: col("alert_stock"),
        },
      },
    });

    // 5. 热销产品 (按销量或销售额，这里按销量)
    const topProducts = await OrderItem.findAll({
      attributes: [
        "product_id",
        [fn("SUM", col("quantity")), "totalQuantitySold"],
        [fn("SUM", literal("quantity * unit_price")), "totalAmountSold"],
      ],
      include: [
        {
          model: Product,
          attributes: [
            "name",
            "category",
            "description",
            "supplier",
            "alert_stock",
          ],
          required: true,
        },
        {
          model: Order, // 需要包含Order模型以筛选status
          attributes: [], // 不需要Order的属性，仅用于where条件
          where: { status: "completed" },
          required: true,
        },
      ],
      group: [
        "OrderItem.product_id",
        "Product.id",
        "Product.name",
        "Product.category",
        "Order.id",
      ], // 确保分组正确，包含Order.id以避免歧义
      order: [[literal("totalQuantitySold"), "DESC"]],
      limit: 5,
      raw: true, // raw: true 会导致include的模型数据扁平化，需要调整数据结构
      nest: true, // nest: true 配合 raw:true 可以让include的模型数据嵌套
    });

    // 格式化热销产品数据
    const formattedTopProducts = topProducts.map((p) => ({
      name: p.Product.name,
      category: p.Product.category,
      description: p.Product.description,
      supplier: p.Product.supplier,
      alert_stock: p.Product.alert_stock,
      sales: parseInt(p.totalQuantitySold, 10),
      amount: parseFloat(p.totalAmountSold),
    }));

    // 6. 最近订单
    const recentOrders = await Order.findAll({
      include: [
        { model: Customer, attributes: ["name"] },
        { model: User, attributes: ["username"] },
      ],
      order: [["created_at", "DESC"]],
      limit: 5,
    });
    const formattedRecentOrders = recentOrders.map((order) => ({
      id: order.id,
      customer: order.Customer?.name || "N/A",
      date: order.created_at.toISOString().split("T")[0],
      total: order.total,
      // user: order.User?.username || 'N/A' // 如果需要操作员信息
    }));

    // 7. 销售趋势图数据 (简化，实际应按需聚合)
    // 周数据 (过去7天)
    const weeklySales = [];
    const weekDates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));
      weekDates.push(`${d.getMonth() + 1}/${d.getDate()}`);

      const dailyResult = await Order.sum("total", {
        where: {
          created_at: { [Op.between]: [dayStart, dayEnd] },
          status: "completed",
        },
      });
      weeklySales.push(dailyResult || 0);
    }

    // 月数据 (本月每日)
    const monthlySales = [];
    const monthDates = [];
    const daysInMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        i,
        0,
        0,
        0,
        0
      );
      const dayEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        i,
        23,
        59,
        59,
        999
      );
      monthDates.push(`${i}日`);
      const dailyResult = await Order.sum("total", {
        where: {
          created_at: { [Op.between]: [dayStart, dayEnd] },
          status: "completed",
        },
      });
      monthlySales.push(dailyResult || 0);
    }

    // 年数据 (本年每月)
    const yearlySales = [];
    const yearDates = [
      "1月",
      "2月",
      "3月",
      "4月",
      "5月",
      "6月",
      "7月",
      "8月",
      "9月",
      "10月",
      "11月",
      "12月",
    ];
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(today.getFullYear(), i, 1);
      const monthEnd = new Date(today.getFullYear(), i + 1, 0, 23, 59, 59, 999);
      const monthlyResult = await Order.sum("total", {
        where: {
          created_at: { [Op.between]: [monthStart, monthEnd] },
          status: "completed",
        },
      });
      yearlySales.push(monthlyResult || 0);
    }

    res.json({
      summaryStats: {
        todaySales,
        salesTrend: parseFloat(salesTrend.toFixed(2)),
        todayOrders,
        ordersTrend: parseFloat(ordersTrend.toFixed(2)),
        totalCustomers,
        newCustomers,
        lowStockCount,
      },
      topProducts: formattedTopProducts,
      recentOrders: formattedRecentOrders,
      salesData: {
        week: { dates: weekDates, values: weeklySales },
        month: { dates: monthDates, values: monthlySales },
        year: { dates: yearDates, values: yearlySales },
      },
    });
  } catch (error) {
    console.error("获取仪表盘数据失败:", error);
    res.status(500).json({ message: "服务器内部错误" });
  }
});

module.exports = router;
