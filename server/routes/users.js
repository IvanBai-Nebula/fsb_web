const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, Role } = require('../models'); // 假设 User 和 Role 模型已定义并关联
const authenticateToken = require('../middleware/auth'); // 认证中间件
const authorizeRole = require('../middleware/roleCheck'); // 导入角色检查中间件工厂函数

// 获取当前登录用户的个人资料 (需要认证)
router.get('/:id/profile', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        // 确保用户只能获取自己的信息，除非是管理员
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权访问此用户信息' });
        }

        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'nickname', 'email', 'role', 'avatar_url'], // Added avatar_url
        });

        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        res.json(user);
    } catch (error) {
        console.error('获取用户配置失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 更新当前登录用户的个人资料 (需要认证)
router.put('/:id/profile', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权修改此用户信息' });
        }

        const { nickname, email, avatar_url } = req.body; // Added avatar_url
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 检查邮箱是否已被其他用户使用 (如果邮箱需要唯一)
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({ message: '邮箱已被占用' });
            }
        }

        // Use explicit checks to allow setting fields to null or empty string
        if (nickname !== undefined) user.nickname = nickname;
        if (email !== undefined) user.email = email; 
        if (avatar_url !== undefined) user.avatar_url = avatar_url; // Allow setting avatar_url to null/empty to remove it

        await user.save();

        res.json({ 
            message: '用户信息更新成功', 
            user: { 
                id: user.id, 
                username: user.username, 
                nickname: user.nickname, 
                email: user.email,
                avatar_url: user.avatar_url // Added avatar_url to response
            }
        });
    } catch (error) {
        console.error('更新用户信息失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 修改当前登录用户的密码 (需要认证)
router.put('/:id/password', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (req.user.id !== userId) {
            return res.status(403).json({ message: '无权修改此用户密码' });
        }

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: '当前密码和新密码不能为空' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: '新密码长度不能少于6位' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: '当前密码不正确' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: '密码修改成功' });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// --- 用户管理 (通常需要管理员权限) ---

// 获取用户列表 (管理员权限)
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const users = await User.findAll({
            // If 'role' is the direct string field on User model, and you also want to include associated Role model data,
            // ensure the association (e.g., User.belongsTo(Role, { as: 'roleInfo', foreignKey: 'role_id_column' })) is correctly set up.
            // The 'role' attribute from User model and the 'role' alias from include might conflict if not handled carefully.
            // For now, assuming 'role' is the direct field and 'role_id' was a mistake.
            // If Role association is intended, 'role_id' might be the foreign key, and 'role' the string field.
            // Let's assume the User model's 'role' field (string) is what's primarily needed, 
            // and the include provides more details if an association exists via a foreign key (e.g. actual_role_id_column_name).
            // The error is about selecting 'role_id' directly. We'll select 'role' (the string field).
            // The include for Role suggests an association exists. If so, User model would have a foreignKey like `roleId` or `role_id`.
            // We will select the direct 'role' field. The include will fetch associated Role data if the FK exists and is correctly named.
            attributes: ['id', 'username', 'nickname', 'email', 'role', 'avatar_url', 'created_at', 'updated_at'], // Added avatar_url
            include: { model: Role, as: 'roleInfo', attributes: ['name'] }
        });
        // Note: If the 'User' model has a field named 'role' (string) AND a foreign key like 'role_id' from an association with 'Role',
        // you need to be clear which one you're querying. The original error was 'Unknown column role_id'.
        // The User model shows 'role: DataTypes.STRING'. So we select that.
        // If the 'include' is for a 'Role' table associated via a foreign key (e.g., 'actual_role_fk_id'), that FK should be used by Sequelize internally for the join.
        // The 'as: role' in include might conflict if User model also has a 'role' property. Renaming alias to 'roleInfo'.
        res.json(users);
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 创建新用户 (管理员权限)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const { username, password, nickname, email, role, avatar_url } = req.body; // Added avatar_url
        if (!username || !password || !role) { // Changed role_id to role
            return res.status(400).json({ message: '用户名、密码和角色不能为空' }); // Changed message
        }
        // If 'role' is meant to be an ID for a Role table, then the input should be role_id
        // and User model should have a foreign key like 'roleId' or 'role_id'.
        // Given User model has 'role: DataTypes.STRING', we assume 'role' is the string value here.
        if (password.length < 6) {
            return res.status(400).json({ message: '密码长度不能少于6位' });
        }

        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: '用户名已存在' });
        }
        if (email) {
            const existingEmail = await User.findOne({ where: { email } });
            if (existingEmail) {
                return res.status(400).json({ message: '邮箱已被占用' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            username,
            password_hash,
            nickname,
            email,
            role,
            avatar_url // Added avatar_url
        });
        res.status(201).json({ message: '用户创建成功', userId: newUser.id });
    } catch (error) {
        console.error('创建用户失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 更新用户信息 (管理员权限)
router.put('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const { nickname, email, role, password, status, avatar_url } = req.body; // Added avatar_url

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({ message: '邮箱已被占用' });
            }
            if (email !== undefined) user.email = email; // Allow setting email to null/empty if desired and model allows
        }
        if (nickname !== undefined) user.nickname = nickname; // Allow setting to null/empty
        if (email !== undefined) user.email = email; // Already handled above, but for consistency if re-evaluating
        if (role) user.role = role;
        if (status) user.status = status;
        if (avatar_url !== undefined) user.avatar_url = avatar_url;

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: '新密码长度不能少于6位' });
            }
            const salt = await bcrypt.genSalt(10);
            user.password_hash = await bcrypt.hash(password, salt);
        }

        await user.save();
        res.json({ message: '用户信息更新成功' });
    } catch (error) {
        console.error('管理员更新用户信息失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 删除用户 (管理员权限)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        // 防止删除自己或ID为1的超级管理员 (假设)
        if (user.id === req.user.id) {
            return res.status(400).json({ message: '不能删除当前登录的管理员账户' });
        }
        if (user.id === 1 && user.username === 'admin') { // 假设ID为1的是超级管理员
            return res.status(400).json({ message: '不能删除超级管理员账户' });
        }

        await user.destroy();
        res.json({ message: '用户删除成功' });
    } catch (error) {
        console.error('删除用户失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

module.exports = router;