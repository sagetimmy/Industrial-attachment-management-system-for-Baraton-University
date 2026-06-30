const express = require('express');
const multer = require('multer');
const supabase = require('../config/db');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB cap
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

// POST /api/avatar  (multipart/form-data, field name "photo")
router.post('/', protect, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.user_id;
    const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const filePath = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true, // overwrite previous photo
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ message: 'Failed to upload photo' });
    }

    const { data: publicUrlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);

    // cache-bust so the new photo shows immediately instead of a cached old one
    const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: dbError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('user_id', userId);

    if (dbError) {
      console.error('DB update error:', dbError);
      return res.status(500).json({ message: 'Photo uploaded but failed to save reference' });
    }

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err.message);
    res.status(500).json({ message: 'Something went wrong uploading the photo' });
  }
});

module.exports = router;