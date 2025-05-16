const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { Order, OrderItem, Product, Customer, sequelize } = require('../models');
const { Op } = require('sequelize');

// 销售报表 - 按时间段
router.get('/sales', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query; // 统一为驼峰命名

        // 验证日期格式
        if (!startDate || !endDate) {
            return res.status(400).json({ message: '请提供开始和结束日期' });
        }

        // 查询指定时间段内的订单
        const orders = await Order.findAll({
            where: {
                created_at: {
                    [Op.between]: [new Date(startDate), new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1))] // 包含结束日期当天
                },
                status: 'completed'
            },
            include: [
                Customer,
                {
                    model: Product,
                    through: {
                        model: OrderItem,
                        attributes: ['quantity', 'unit_price']
                    }
                }
            ]
        });

        // 计算总销售额
        const totalSales = orders.reduce((sum, order) => sum + order.total, 0);

        // 按产品统计销售情况
        const productSales = {};
        orders.forEach(order => {
            order.Products.forEach(product => {
                const { id, name, category } = product;
                const { quantity, unit_price } = product.OrderItem;

                if (!productSales[id]) {
                    productSales[id] = {
                        id,
                        name,
                        category,
                        total_quantity: 0,
                        total_amount: 0
                    };
                }

                productSales[id].total_quantity += quantity;
                productSales[id].total_amount += quantity * unit_price;
            });
        });

        // 按客户统计销售情况
        const customerSales = {};
        orders.forEach(order => {
            const { id, name } = order.Customer;

            if (!customerSales[id]) {
                customerSales[id] = {
                    id,
                    name,
                    order_count: 0,
                    total_amount: 0
                };
            }

            customerSales[id].order_count += 1;
            customerSales[id].total_amount += order.total;
        });

        res.json({
            start_date,
            end_date,
            total_sales: totalSales,
            order_count: orders.length,
            product_sales: Object.values(productSales),
            customer_sales: Object.values(customerSales)
        });
    } catch (error) {
        console.error('生成销售报表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 库存报表
router.get('/inventory', auth, async (req, res) => {
    try {
        const { type } = req.query; // 'current_stock' or 'low_stock_alert'
        let products;
        let responseData = {};

        if (type === 'low_stock_alert') {
            products = await Product.findAll({
                where: {
                    stock: {
                        [Op.lte]: sequelize.col('min_stock')
                    }
                }
            });
            responseData = {
                report_type: '低库存预警',
                alert_products: products.map(p => ({ id: p.id, name: p.name, category: p.category, stock: p.stock, min_stock: p.min_stock, price: p.price })),
                total_alert_products: products.length
            };
        } else { // Default to 'current_stock'
            products = await Product.findAll();
            const totalValue = products.reduce((sum, product) => sum + (product.price * product.stock), 0);
            const categoryStats = {};
            products.forEach(product => {
                if (!categoryStats[product.category]) {
                    categoryStats[product.category] = {
                        category: product.category,
                        product_count: 0,
                        total_quantity: 0,
                        total_value: 0
                    };
                }
                categoryStats[product.category].product_count += 1;
                categoryStats[product.category].total_quantity += product.stock;
                categoryStats[product.category].total_value += product.price * product.stock;
            });
            responseData = {
                report_type: '当前库存',
                current_stock_list: products.map(p => ({ id: p.id, name: p.name, category: p.category, stock: p.stock, price: p.price, total_value: p.stock * p.price })),
                total_products: products.length,
                overall_total_value: totalValue,
                category_summary: Object.values(categoryStats)
            };
        }

        res.json(responseData);
    } catch (error) {
        console.error('生成库存报表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});


// 客户消费报表
router.get('/customer_consumption', auth, async (req, res) => { // 路由与前端一致
    try {
        const { customer_id, startDate, endDate } = req.query;

        if (!customer_id) {
            return res.status(400).json({ message: '请提供客户ID' });
        }

        let orderWhereClause = { status: 'completed' };
        if (startDate && endDate) {
            orderWhereClause.created_at = {
                [Op.between]: [new Date(startDate), new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1))] // 包含结束日期当天
            };
        }

        const customer = await Customer.findByPk(customer_id, {
            include: [{
                model: Order,
                where: orderWhereClause,
                required: false, // 如果没有符合条件的订单，仍然返回客户信息
                include: [
                    {
                        model: Product,
                        through: {
                            model: OrderItem,
                            attributes: ['quantity', 'unit_price']
                        }
                    }
                ]
            }]
        });

        if (!customer) {
            return res.status(404).json({ message: '客户不存在' });
        }

        let totalSpentInPeriod = 0;
        let ordersInPeriodDetails = [];

        if (customer.Orders) {
            customer.Orders.forEach(order => {
                totalSpentInPeriod += order.total;
                ordersInPeriodDetails.push({
                    order_id: order.id,
                    order_date: order.created_at,
                    total_amount: order.total,
                    items: order.Products.map(p => ({
                        product_name: p.name,
                        quantity: p.OrderItem.quantity,
                        unit_price: p.OrderItem.unit_price,
                        item_total: p.OrderItem.quantity * p.OrderItem.unit_price
                    }))
                });
            });
        }

        res.json({
            customer_id: customer.id,
            customer_name: customer.name,
            license_no: customer.license_no,
            overall_total_spent: customer.total_spent, // 客户历史总消费
            period_start_date: startDate,
            period_end_date: endDate,
            total_spent_in_period: totalSpentInPeriod, // 选定周期内消费
            orders_in_period_count: customer.Orders ? customer.Orders.length : 0,
            orders_in_period_details: ordersInPeriodDetails
        });
    } catch (error) {
        console.error('生成客户消费报表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router;