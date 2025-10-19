import express from 'express';
import { User } from '../models/index.js';

const router = express.Router();

// Update user profile (full_name, role, college, year, instructor) - requires user session
router.post('/profile', express.json(), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { full_name, role, college, year, instructor } = req.body;
    const username = req.user.username || req.user.login;

    // Update the user in MongoDB
    const user = await User.findOneAndUpdate(
      { username: username },
      {
        full_name: full_name || '',
        role: role || 'student',
        college: college || '',
        year: year || '',
        instructor: instructor || '',
        last_updated: new Date()
      },
      { new: true }
    );

    if (!user) {
      console.error('Error updating profile: User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Error in /user/profile:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
