const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const authenticateAdmin = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticates an admin user and issues a JWT token.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const adminIdentifier = (email || username || '').trim().toLowerCase();

    // 1. Input Validation
    if (!adminIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Email or username is required.',
      });
    }

    if (!password || typeof password !== 'string' || password.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Password is required.',
      });
    }

    // 2. Query admin from Supabase database
    const { data: admin, error: dbError } = await supabase
      .from('admins')
      .select('id, email, password_hash, name')
      .eq('email', adminIdentifier)
      .maybeSingle();

    if (dbError) {
      console.error('[DB Error in admin login]:', dbError.message);
      return res.status(500).json({
        success: false,
        message: 'Database query failed while authenticating. Please ensure Supabase is configured.',
      });
    }

    // If admin not found
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 3. Verify password hash using bcrypt
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 4. Generate JWT Token
    const jwtSecret = process.env.JWT_SECRET || 'dental_clinic_super_secret_jwt_key_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
      jwtSecret,
      { expiresIn }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error('[Server Error in login]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred during login. Please try again.',
    });
  }
});

/**
 * GET /api/auth/me
 * Verifies current token and returns active admin profile.
 */
router.get('/me', authenticateAdmin, async (req, res) => {
  return res.status(200).json({
    success: true,
    admin: req.admin,
  });
});

/**
 * POST /api/auth/logout
 * Informational logout endpoint (Client should delete stored JWT).
 */
router.post('/logout', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

module.exports = router;
