const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    password_hash: {
      // Renamed from password to password_hash
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    nickname: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true, // Emails should generally be unique
      validate: {
        isEmail: true, // Add email validation
      },
    },
    avatar_url: {
      type: DataTypes.STRING,
      allowNull: true,
      // 移除 isUrl 校验，允许相对路径
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "suspended"),
      allowNull: false,
      defaultValue: "active",
    },
    role: {
      // role_id will be added by association, this 'role' field might be redundant or used for simple role names if not using a separate Role table
      type: DataTypes.STRING(50), // Changed from ENUM to STRING to align with potential role names from a Role table
      allowNull: false,
      defaultValue: "sales", // Or consider linking to a Role table via role_id
    },
    // Sequelize automatically adds createdAt and updatedAt if timestamps are not disabled
    // To be explicit or customize:
    // created_at: {
    //     type: DataTypes.DATE,
    //     allowNull: false,
    //     defaultValue: DataTypes.NOW
    // },
    // updated_at: {
    //     type: DataTypes.DATE,
    //     allowNull: false,
    //     defaultValue: DataTypes.NOW
    // },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true, // Ensures createdAt and updatedAt are managed by Sequelize
    underscored: true, // Optional: use snake_case for automatic fields like createdAt -> created_at
    hooks: {
      beforeCreate: async (user) => {
        if (user.password_hash) {
          // Changed from password to password_hash
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password_hash")) {
          // Changed from password to password_hash
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
      },
    },
  }
);

// 验证密码方法
User.prototype.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password_hash); // Changed from this.password to this.password_hash
};

// const Order = require('./Order'); // Removed to avoid circular dependency

User.associate = function (models) {
  User.hasMany(models.Order, { foreignKey: "user_id" });
};

module.exports = User;
