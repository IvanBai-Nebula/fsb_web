const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { Customer } = require('../models');

// 获取所有客户 (支持分页和筛选)
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, pageSize = 10, name, license_no } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const limit = parseInt(pageSize);

        let whereClause = {};
        if (name) {
            whereClause.name = { [Customer.sequelize.Op.like]: `%${name}%` };
        }
        if (license_no) {
            whereClause.license_no = { [Customer.sequelize.Op.like]: `%${license_no}%` };
        }

        const { count, rows } = await Customer.findAndCountAll({
            where: whereClause,
            limit: limit,
            offset: offset,
            order: [['id', 'DESC']]
        });

        res.json({ customers: rows, total: count });
    } catch (error) {
        console.error('获取客户列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取单个客户
router.get('/:id', auth, async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: '客户不存在' });
        }
        res.json(customer);
    } catch (error) {
        console.error('获取客户详情错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 创建客户
router.post('/', auth, async (req, res) => {
    try {
        const { license_no, name, contact } = req.body;

        const customer = await Customer.create({
            license_no,
            name,
            contact,
            total_spent: 0
        });

        res.status(201).json(customer);
    } catch (error) {
        console.error('创建客户错误:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: '该执照号已存在' });
        }
        res.status(500).json({ message: '服务器错误' });
    }
});

// 更新客户
router.put('/:id', auth, async (req, res) => {
    try {
        const { license_no, name, contact } = req.body;

        const customer = await Customer.findByPk(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: '客户不存在' });
        }

        await customer.update({
            license_no,
            name,
            contact
        });

        res.json(customer);
    } catch (error) {
        console.error('更新客户错误:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: '该执照号已存在' });
        }
        res.status(500).json({ message: '服务器错误' });
    }
});

// 删除客户 (仅管理员)
router.delete('/:id', [auth, roleCheck(['admin'])], async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: '客户不存在' });
        }

        await customer.destroy();

        res.json({ message: '客户已删除' });
    } catch (error) {
        console.error('删除客户错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router;