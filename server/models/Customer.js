const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Customer = sequelize.define('Customer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    license_no: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true
        }
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    contact: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    total_spent: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    }
});

// 获取客户等级
Customer.prototype.getLevel = function () {
    const spent = parseFloat(this.total_spent);
    if (spent >= 100000) return 'VIP';
    if (spent >= 50000) return '金牌';
    if (spent >= 10000) return '银牌';
    return '普通';
};

// 更新客户消费金额
Customer.prototype.updateSpent = async function (amount) {
    this.total_spent = parseFloat(this.total_spent) + parseFloat(amount);
    await this.save();
    return this;
};

Customer.associate = function (models) {
    Customer.hasMany(models.Order, { foreignKey: 'customer_id' });
};

module.exports = Customer;