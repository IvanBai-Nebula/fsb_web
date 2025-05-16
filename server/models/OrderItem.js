const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Order = require('./Order'); // Removed to avoid circular dependency
const Product = require('./Product'); // Removed to avoid circular dependency

const OrderItem = sequelize.define('OrderItem', {
    order_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: Order,
            key: 'id'
        }
    },
    product_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: Product,
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
    unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    }
}, {
    tableName: 'order_items',
    timestamps: false
});

// 关联关系
OrderItem.associate = function (models) {
    OrderItem.belongsTo(models.Order, { foreignKey: 'order_id' });
    OrderItem.belongsTo(models.Product, { foreignKey: 'product_id' });
};

module.exports = OrderItem;