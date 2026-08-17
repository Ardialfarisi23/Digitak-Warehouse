const multer = require("multer");
const path = require("path");
const fs = require("fs");
const response = require("../../shared/response");

const uploadDir = path.join(__dirname, "../../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const generalFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);

  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error("Only image and PDF files are allowed (jpeg, jpg, png, gif, webp, pdf)."), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: generalFileFilter,
});

const uploadSingle = upload.single("file");

const uploadFile = async (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return response.error(res, "File too large. Max 10MB.", 400);
      }
      return response.error(res, err.message, 400);
    } else if (err) {
      return response.error(res, err.message, 400);
    }

    if (!req.file) {
      return response.error(res, "No file uploaded.", 400);
    }

    const protocol = req.protocol;
    const host = req.get("host");
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    return response.success(res, "File uploaded successfully.", {
      filename: req.file.filename,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }, 201);
  });
};

const boqReferenceFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);

  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error("Only image and PDF files are allowed (jpeg, jpg, png, gif, webp, pdf)."), false);
  }
};

const boqReferenceUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: boqReferenceFileFilter,
});

const uploadBoqReference = async (req, res, next) => {
  boqReferenceUpload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return response.error(res, "File too large. Max 10MB.", 400);
      }
      return response.error(res, err.message, 400);
    } else if (err) {
      return response.error(res, err.message, 400);
    }

    if (!req.file) {
      return response.error(res, "No file uploaded.", 400);
    }

    const protocol = req.protocol;
    const host = req.get("host");
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    return response.success(res, "Reference file uploaded successfully.", {
      filename: req.file.filename,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }, 201);
  });
};

module.exports = {
  uploadFile,
  uploadBoqReference,
};
