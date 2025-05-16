const User = require('./User');
const Product = require('./Product');
const Customer = require('./Customer');
const Order = require('./Order');
const OrderItem = require('./OrderItem');

// 确保所有模型关联关系已建立
const { sequelize } = require('../config/database');

const db = {
    sequelize,
    User,
    Product,
    Customer,
    Order,
    OrderItem
};

Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

module.exports = db;