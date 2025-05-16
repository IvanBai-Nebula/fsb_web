const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // 从请求头获取token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: '未提供认证令牌' });
        }

        const token = authHeader.split(' ')[1];

        // 验证token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 将用户信息添加到请求对象
        req.user = decoded;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: '认证令牌已过期' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: '无效的认证令牌' });
        }
        console.error('认证中间件错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
};