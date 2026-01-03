/**
 * FILE UPLOAD MIDDLEWARE
 * Handles file uploads with validation
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = [
  'uploads/products',
  'uploads/designs',
  'uploads/profiles',
  'uploads/temp'
];

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// ============================================
// STORAGE CONFIGURATION
// ============================================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine upload directory based on file type
    let uploadPath = 'uploads/temp';
    
    if (req.baseUrl.includes('/products')) {
      uploadPath = 'uploads/products';
    } else if (req.baseUrl.includes('/design')) {
      uploadPath = 'uploads/designs';
    } else if (req.baseUrl.includes('/profile')) {
      uploadPath = 'uploads/profiles';
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

// ============================================
// FILE FILTER
// ============================================

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedDocTypes = /pdf|doc|docx/;
  const allowedDesignTypes = /svg|ai|psd/;
  
  const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
                   allowedDocTypes.test(path.extname(file.originalname).toLowerCase()) ||
                   allowedDesignTypes.test(path.extname(file.originalname).toLowerCase());
  
  const mimetype = file.mimetype.startsWith('image/') || 
                   file.mimetype.startsWith('application/pdf') ||
                   file.mimetype.startsWith('application/msword') ||
                   file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and document files are allowed.'));
  }
};

// ============================================
// UPLOAD CONFIGURATIONS
// ============================================

// Single image upload (max 5MB)
const uploadSingle = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
}).single('image');

// Multiple images upload (max 10 files, 5MB each)
const uploadMultiple = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Max 10 files
  },
  fileFilter: fileFilter
}).array('images', 10);

// Design files upload (max 20MB)
const uploadDesign = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|svg|ai|psd|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('image/') || 
                     file.mimetype.startsWith('application/');
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid design file type'));
    }
  }
}).single('design');

// Profile picture upload
const uploadProfile = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('image/');
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, and PNG images are allowed for profile pictures'));
    }
  }
}).single('profilePicture');

// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name in form'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: err.message
    });
  } else if (err) {
    // Other errors
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// ============================================
// HELPER FUNCTION TO DELETE FILE
// ============================================

const deleteFile = (filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadDesign,
  uploadProfile,
  handleUploadError,
  deleteFile
};