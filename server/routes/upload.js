const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// 创建上传目录
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 配置 multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}${ext}`;
    cb(null, filename);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB 限制
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("仅支持 JPG/PNG 格式图片"));
    }
  },
});

// 上传图片接口
router.post("/image", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "未上传文件" });
  }
  // 返回图片可访问 URL
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;
