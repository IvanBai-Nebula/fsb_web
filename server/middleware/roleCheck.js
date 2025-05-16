/**
 * 角色检查中间件
 * 用于验证用户是否具有特定角色权限
 */
module.exports = (roles) => {
    return (req, res, next) => {
        try {
            // 确保用户已通过认证中间件
            if (!req.user) {
                return res.status(401).json({ message: '未认证的用户' });
            }

            // 检查用户角色是否在允许的角色列表中
            if (roles.includes(req.user.role)) {
                return next();
            }

            // 如果用户角色不在允许的角色列表中，返回403错误
            return res.status(403).json({ message: '权限不足，无法访问此资源' });
        } catch (error) {
            console.error('角色检查中间件错误:', error);
            res.status(500).json({ message: '服务器错误' });
        }
    };
};