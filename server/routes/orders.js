const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { Order, OrderItem, Product, Customer, sequelize } = require('../models');

// 获取所有订单 (支持分页和筛选)
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, limit = 10, id, customer_name, status, start_date, end_date } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereClause = {};
        let customerWhereClause = {};

        if (id) {
            whereClause.id = id;
        }
        if (customer_name) {
            customerWhereClause.name = { [sequelize.Op.like]: `%${customer_name}%` };
        }
        if (status) {
            whereClause.status = status;
        }
        if (start_date && end_date) {
            whereClause.created_at = {
                [sequelize.Op.between]: [new Date(start_date), new Date(new Date(end_date).setDate(new Date(end_date).getDate() + 1))] // 包含结束日期当天
            };
        }

        const { count, rows } = await Order.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Customer,
                    where: Object.keys(customerWhereClause).length > 0 ? customerWhereClause : null,
                    required: Object.keys(customerWhereClause).length > 0 // 如果有客户名筛选，则Customer为必须
                },
                {
                    model: sequelize.models.User, // 确保User模型已正确加载并关联
                    attributes: ['id', 'username'] // 只选择需要的用户字段
                }
            ],
            limit: parseInt(limit),
            offset: offset,
            order: [['created_at', 'DESC']]
        });

        res.json({ orders: rows, total: count });
    } catch (error) {
        console.error('获取订单列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取单个订单详情
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id, {
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

        if (!order) {
            return res.status(404).json({ message: '订单不存在' });
        }

        res.json(order);
    } catch (error) {
        console.error('获取订单详情错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 创建订单
router.post('/', auth, async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { customer_id, items } = req.body;

        // 验证客户是否存在
        const customer = await Customer.findByPk(customer_id);
        if (!customer) {
            await t.rollback();
            return res.status(400).json({ message: '客户不存在' });
        }

        // 验证商品是否存在并计算总价
        let total = 0;
        for (const item of items) {
            const product = await Product.findByPk(item.product_id);
            if (!product) {
                await t.rollback();
                return res.status(400).json({ message: `商品ID ${item.product_id} 不存在` });
            }

            // 检查库存
            if (product.stock < item.quantity) {
                await t.rollback();
                return res.status(400).json({ message: `商品 ${product.name} 库存不足` });
            }

            // 计算小计并累加到总价
            total += product.price * item.quantity;
        }

        // 创建订单
        const order = await Order.create({
            customer_id,
            total,
            status: 'completed'
        }, { transaction: t });

        // 创建订单项并更新库存
        for (const item of items) {
            const product = await Product.findByPk(item.product_id);

            // 创建订单项
            await OrderItem.create({
                order_id: order.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: product.price
            }, { transaction: t });

            // 更新库存
            await product.update({
                stock: product.stock - item.quantity
            }, { transaction: t });
        }

        // 更新客户消费金额
        await customer.updateSpent(total, t);

        await t.commit();

        // 返回创建的订单
        const createdOrder = await Order.findByPk(order.id, {
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

        res.status(201).json(createdOrder);
    } catch (error) {
        await t.rollback();
        console.error('创建订单错误:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: '服务器错误' });
    }
});

// 取消订单 (仅管理员)
router.put('/:id/cancel', [auth, roleCheck(['admin'])], async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const order = await Order.findByPk(req.params.id, {
            include: [{
                model: Product,
                through: OrderItem
            }],
            transaction: t
        });

        if (!order) {
            await t.rollback();
            return res.status(404).json({ message: '订单不存在' });
        }

        if (order.status === 'cancelled') {
            await t.rollback();
            return res.status(400).json({ message: '订单已取消' });
        }

        // 恢复库存
        for (const product of order.Products) {
            const orderItem = product.OrderItem;
            await product.update({
                stock: product.stock + orderItem.quantity
            }, { transaction: t });
        }

        // 更新客户消费金额
        const customer = await Customer.findByPk(order.customer_id, { transaction: t });
        await customer.updateSpent(-order.total, t);

        // 更新订单状态
        await order.update({ status: 'cancelled' }, { transaction: t });

        await t.commit();

        res.json({ message: '订单已取消', order });
    } catch (error) {
        await t.rollback();
        console.error('取消订单错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router;