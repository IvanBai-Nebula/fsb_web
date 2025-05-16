const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Customer = require('./Customer');
const User = require('./User');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Customer,
            key: 'id'
        }
    },
    total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // 或者 false，取决于业务逻辑是否允许订单没有关联用户
        references: {
            model: User, // 确保User模型被正确引入
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed'),
        allowNull: false,
        defaultValue: 'pending'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
});

// 关联关系
Order.associate = function (models) {
    Order.belongsTo(models.Customer, { foreignKey: 'customer_id' });
    Order.belongsTo(models.User, { foreignKey: 'user_id', allowNull: true }); // allowNull: true if an order might not have a user
    Order.hasMany(models.OrderItem, { foreignKey: 'order_id', as: 'items' });
};

module.exports = Order;