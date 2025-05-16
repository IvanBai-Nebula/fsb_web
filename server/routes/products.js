const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");
const { Product } = require("../models");

// 获取所有产品 (支持分页和筛选)
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, name, category, stock_status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = {};
    if (name) {
      whereClause.name = { [Product.sequelize.Op.like]: `%${name}%` };
    }
    if (category) {
      whereClause.category = { [Product.sequelize.Op.like]: `%${category}%` };
    }
    if (stock_status === "low_stock") {
      whereClause.stock = {
        [Product.sequelize.Op.lt]: Product.sequelize.col("alert_stock"),
      };
    } else if (stock_status === "normal") {
      whereClause.stock = {
        [Product.sequelize.Op.gte]: Product.sequelize.col("alert_stock"),
      };
    }

    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: [["id", "DESC"]], // 可根据需要调整排序
    });

    res.json({ products: rows, total: count });
  } catch (error) {
    console.error("获取产品列表错误:", error);
    res.status(500).json({ message: "服务器错误" });
  }
});

// 获取单个产品
router.get("/:id", auth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "产品不存在" });
    }
    res.json(product);
  } catch (error) {
    console.error("获取产品详情错误:", error);
    res.status(500).json({ message: "服务器错误" });
  }
});

// 创建产品 (仅管理员)
router.post("/", [auth, roleCheck(["admin"])], async (req, res) => {
  try {
    const { name, category, price, stock, alert_stock } = req.body;

    const product = await Product.create({
      name,
      category,
      price,
      stock,
      alert_stock,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("创建产品错误:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "服务器错误" });
  }
});

// 更新产品 (仅管理员)
router.put("/:id", [auth, roleCheck(["admin"])], async (req, res) => {
  try {
    const { name, category, price, stock, alert_stock } = req.body;

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "产品不存在" });
    }

    await product.update({
      name,
      category,
      price,
      stock,
      alert_stock,
    });

    res.json(product);
  } catch (error) {
    console.error("更新产品错误:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "服务器错误" });
  }
});

// 删除产品 (仅管理员)
router.delete("/:id", [auth, roleCheck(["admin"])], async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "产品不存在" });
    }

    await product.destroy();

    res.json({ message: "产品已删除" });
  } catch (error) {
    console.error("删除产品错误:", error);
    res.status(500).json({ message: "服务器错误" });
  }
});

// 获取库存预警产品
router.get("/alert/stock", auth, async (req, res) => {
  try {
    const alertProducts = await Product.getAlertProducts();
    res.json(alertProducts);
  } catch (error) {
    console.error("获取库存预警产品错误:", error);
    res.status(500).json({ message: "服务器错误" });
  }
});

module.exports = router;
