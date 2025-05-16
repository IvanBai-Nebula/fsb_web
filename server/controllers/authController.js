const jwt = require("jsonwebtoken");
const { User } = require("../models");
const bcrypt = require("bcryptjs");

// 用户登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body; // 'password' here is the plain text password from user input

    // 验证请求数据
    if (!username || !password) {
      // 'password' here is the plain text password from user input
      return res.status(400).json({ message: "用户名和密码不能为空" });
    }

    // 查找用户
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: "用户名或密码错误" });
    }

    // 验证密码
    const isMatch = await user.validatePassword(password); // validatePassword now compares with password_hash internally
    if (!isMatch) {
      return res.status(401).json({ message: "用户名或密码错误" });
    }

    // 更新最后登录时间
    user.last_login_at = new Date();
    await user.save();

    // 生成JWT令牌
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        nickname: user.nickname,
        email: user.email,
        avatar_url: user.avatar_url,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 返回成功响应
    res.json({
      message: "登录成功",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        nickname: user.nickname,
        email: user.email,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error("登录错误:", error);
    res.status(500).json({ message: "服务器错误" });
  }
};

// 用户注册
exports.register = async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body; // 'password' here is the plain text password from user input

    // 验证请求数据
    if (!username || !password || !confirmPassword) {
      // 'password' here is the plain text password from user input
      return res.status(400).json({ message: "所有字段都是必填的" });
    }

    // 验证密码匹配
    if (password !== confirmPassword) {
      // 'password' here is the plain text password from user input
      return res.status(400).json({ message: "两次输入的密码不匹配" });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: "用户名已被使用" });
    }

    // 创建新用户
    const newUser = await User.create({
      username,
      password_hash: password, // Storing the plain password to be hashed by the model's hook
      nickname: req.body.nickname || null,
      email: req.body.email || null,
      role: "sales", // 默认角色为销售员
    });

    // 生成JWT令牌
    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        nickname: newUser.nickname,
        email: newUser.email,
        avatar_url: newUser.avatar_url,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 返回成功响应
    res.status(201).json({
      message: "注册成功",
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        nickname: newUser.nickname,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("注册错误:", error);
    res.status(500).json({ message: "服务器错误" });
  }
};

// 获取当前用户信息
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "username", "role"],
    });

    if (!user) {
      return res.status(404).json({ message: "用户不存在" });
    }

    res.json({ user });
  } catch (error) {
    console.error("获取用户信息错误:", error);
    res.status(500).json({ message: "服务器错误" });
  }
};
