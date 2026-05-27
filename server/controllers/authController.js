import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to generate token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'dev_jwt_secret_token_key_12345', {
    expiresIn: '7d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check duplicate username
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Check duplicate email
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Create user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    // Send response with token
    res.status(201).json({
      token: generateToken(newUser._id),
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        isPremium: newUser.isPremium,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration', message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Send response with token
    res.status(200).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isPremium: user.isPremium,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login', message: error.message });
  }
};

// @desc    Authenticate user via Google Sign-In token
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Google ID Token is required' });
    }

    let payload;

    // SWR or fallback token verification if Google Client ID is not explicitly set in dev
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.warn("⚠️ GOOGLE_CLIENT_ID env variable not set. Using google tokeninfo fallback endpoint.");
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (!response.ok) {
        return res.status(400).json({ error: 'Invalid Google ID Token' });
      }
      payload = await response.json();
    } else {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Email address not provided by Google account' });
    }

    // Find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Link Google authentication to existing email/password account if unregistered
      let hasUpdates = false;
      if (!user.googleId) {
        user.googleId = googleId;
        hasUpdates = true;
      }
      if (!user.avatarUrl && picture) {
        user.avatarUrl = picture;
        hasUpdates = true;
      }
      if (hasUpdates) {
        await user.save();
      }
    } else {
      // Create new account
      let uniqueUsername = name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'player';
      const usernameExists = await User.findOne({ username: uniqueUsername });
      if (usernameExists) {
        uniqueUsername = `${uniqueUsername}${Math.floor(1000 + Math.random() * 9000)}`;
      }

      user = await User.create({
        username: uniqueUsername,
        email,
        googleId,
        avatarUrl: picture || '',
        isPremium: false,
      });
    }

    res.status(200).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isPremium: user.isPremium,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during Google Sign-in', message: error.message });
  }
};
