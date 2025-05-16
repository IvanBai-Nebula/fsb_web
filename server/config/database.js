const { Sequelize } = require('sequelize');

// 创建Sequelize实例
const sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Fan1750711847',
    database: process.env.DB_NAME || 'web_app',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+08:00',
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: false,
        charset: 'utf8mb4',
        dialectOptions: {
            collate: 'utf8mb4_unicode_ci'
        }
    }
});

module.exports = { sequelize };