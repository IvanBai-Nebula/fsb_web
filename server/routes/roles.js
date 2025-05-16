const express = require('express');
const router = express.Router();
const { Role, Permission, RolePermission } = require('../models'); // 假设 Role, Permission, RolePermission 模型已定义
const authenticateToken = require('../middleware/auth'); // 认证中间件
const authorizeRole = require('../middleware/roleCheck'); // 导入角色检查中间件工厂函数

// 获取所有角色列表 (需要管理员权限)
router.get('/', authenticateToken, authorizeRole(['admin', 'manage_roles']), async (req, res) => {
    try {
        const roles = await Role.findAll({
            include: [{
                model: Permission,
                as: 'permissions',
                attributes: ['name'], // 只获取权限名称
                through: { attributes: [] } // 不包括中间表 RolePermission 的属性
            }]
        });
        // 将权限对象数组转换为权限名称字符串数组
        const formattedRoles = roles.map(role => {
            const plainRole = role.get({ plain: true });
            plainRole.permissions = plainRole.permissions ? plainRole.permissions.map(p => p.name) : [];
            return plainRole;
        });
        res.json(formattedRoles);
    } catch (error) {
        console.error('获取角色列表失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 创建新角色 (需要管理员权限)
router.post('/', authenticateToken, authorizeRole(['admin', 'manage_roles']), async (req, res) => {
    try {
        const { name, description, permissions } = req.body; // permissions 是一个权限名称的数组，例如 ['view_dashboard', 'manage_products']

        if (!name || !description) {
            return res.status(400).json({ message: '角色名称和描述不能为空' });
        }

        const existingRole = await Role.findOne({ where: { name } });
        if (existingRole) {
            return res.status(400).json({ message: '角色名称已存在' });
        }

        const newRole = await Role.create({ name, description });

        if (permissions && permissions.length > 0) {
            const permissionInstances = await Permission.findAll({ where: { name: permissions } });
            if (permissionInstances.length !== permissions.length) {
                // 找出哪些权限名称是无效的
                const foundPermissionNames = permissionInstances.map(p => p.name);
                const invalidPermissions = permissions.filter(pName => !foundPermissionNames.includes(pName));
                return res.status(400).json({ message: `以下权限无效: ${invalidPermissions.join(', ')}。请确保所有权限都已在系统中定义。` });
            }
            await newRole.setPermissions(permissionInstances);
        }

        res.status(201).json({ message: '角色创建成功', roleId: newRole.id });
    } catch (error) {
        console.error('创建角色失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 更新角色信息 (需要管理员权限)
router.put('/:id', authenticateToken, authorizeRole(['admin', 'manage_roles']), async (req, res) => {
    try {
        const roleId = parseInt(req.params.id, 10);
        const { name, description, permissions } = req.body;

        const role = await Role.findByPk(roleId);
        if (!role) {
            return res.status(404).json({ message: '角色不存在' });
        }

        // 检查新角色名是否与现有其他角色冲突
        if (name && name !== role.name) {
            const existingRole = await Role.findOne({ where: { name } });
            if (existingRole && existingRole.id !== roleId) {
                return res.status(400).json({ message: '角色名称已存在' });
            }
            role.name = name;
        }
        if (description) {
            role.description = description;
        }

        await role.save();

        if (permissions && Array.isArray(permissions)) {
            const permissionInstances = await Permission.findAll({ where: { name: permissions } });
            if (permissionInstances.length !== permissions.length && permissions.length > 0) {
                // 找出哪些权限名称是无效的
                const foundPermissionNames = permissionInstances.map(p => p.name);
                const invalidPermissions = permissions.filter(pName => !foundPermissionNames.includes(pName));
                return res.status(400).json({ message: `以下权限无效: ${invalidPermissions.join(', ')}。请确保所有权限都已在系统中定义。` });
            }
            await role.setPermissions(permissionInstances); // Sequelize 会处理好关联的增删
        }

        res.json({ message: '角色更新成功' });
    } catch (error) {
        console.error('更新角色失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 删除角色 (需要管理员权限)
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'manage_roles']), async (req, res) => {
    try {
        const roleId = parseInt(req.params.id, 10);
        const role = await Role.findByPk(roleId);
        if (!role) {
            return res.status(404).json({ message: '角色不存在' });
        }

        // 基础角色保护，例如 'admin', 'user' 等不应被删除
        const protectedRoles = ['admin', 'sales', 'customer']; // 根据实际情况定义受保护的角色名
        if (protectedRoles.includes(role.name.toLowerCase())) {
            return res.status(400).json({ message: `角色 '${role.name}' 是受保护的，不能删除。` });
        }

        // 检查是否有用户仍在使用此角色
        const usersWithRole = await User.count({ where: { role_id: roleId } });
        if (usersWithRole > 0) {
            return res.status(400).json({ message: `无法删除角色，仍有 ${usersWithRole} 个用户属于此角色。请先将这些用户移至其他角色。` });
        }

        await role.removePermissions(); // 先移除所有关联的权限
        await role.destroy();
        res.json({ message: '角色删除成功' });
    } catch (error) {
        console.error('删除角色失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 获取所有可用权限列表 (用于前端权限选择器)
router.get('/permissions', authenticateToken, authorizeRole(['admin', 'manage_roles']), async (req, res) => {
    try {
        const permissions = await Permission.findAll({ attributes: ['name', 'description'] }); // 或者 value 和 label
        res.json(permissions.map(p => ({ value: p.name, label: p.description || p.name })));
    } catch (error) {
        console.error('获取权限列表失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

module.exports = router;