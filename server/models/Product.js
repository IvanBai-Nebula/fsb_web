const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Product = sequelize.define("Product", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  supplier: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  category: {
    type: DataTypes.ENUM("耗材", "器械", "药品"),
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  alert_stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50,
    validate: {
      min: 0,
    },
  },
});

// 获取库存预警商品
Product.getAlertProducts = async function () {
  return await this.findAll({
    where: sequelize.literal("stock < alert_stock"),
  });
};

Product.associate = function (models) {
  Product.hasMany(models.OrderItem, { foreignKey: "product_id" });
};

module.exports = Product;
