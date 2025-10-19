import express from 'express';
import passport from 'passport';
import { User } from '../models/index.js';
import { storeUserAndPRs, refreshUserPRs } from '../services/prService.js';
import { exchangeCodeForToken, fetchGitHubProfile } from '../config/github-oauth.js';

const router = express.Router();

// GitHub OAuth routes
router.get('/github', (req, res, next) => {
  console.log('🔐 Initiating GitHub OAuth flow...');
  console.log('   Callback URL:', process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/auth/github/callback');
  passport.authenticate('github', { 
    scope: ['user:email'],
    session: true
  })(req, res, next);
});

// Failure route
router.get('/failure', (req, res) => {
  console.error('❌ OAuth authentication failed');
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:4321';
  res.redirect(`${clientOrigin}/login?error=auth_failed`);
});

router.get('/github/callback', async (req, res) => {
  console.log('📥 GitHub OAuth callback received');
  console.log('   Query params:', req.query);
  
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:4321';
  
  // Check for GitHub error response
  if (req.query.error) {
    console.error('❌ GitHub OAuth error:', req.query.error);
    console.error('   Description:', req.query.error_description);
    return res.redirect(`${clientOrigin}/login?error=${req.query.error}`);
  }
  
  // Get the authorization code
  const code = req.query.code;
  if (!code) {
    console.error('❌ No authorization code received');
    return res.redirect(`${clientOrigin}/login?error=no_code`);
  }
  
  try {
    // Step 1: Exchange code for access token
    const tokenResult = await exchangeCodeForToken(code);
    
    if (!tokenResult.success) {
      console.error('❌ Token exchange failed:', tokenResult.error);
      return res.redirect(`${clientOrigin}/login?error=${tokenResult.error}`);
    }
    
    // Step 2: Fetch user profile
    const profileResult = await fetchGitHubProfile(tokenResult.access_token);
    
    if (!profileResult.success) {
      console.error('❌ Profile fetch failed:', profileResult.error);
      return res.redirect(`${clientOrigin}/login?error=profile_error`);
    }
    
    const profile = profileResult.profile;
    console.log('✅ OAuth flow completed for user:', profile.login);
    
    // Step 3: Store user data in MongoDB
    try {
      const result = await storeUserAndPRs(profile);
      if (result.success) {
        console.log('✅ User data stored successfully');
      } else {
        console.warn('⚠️  Failed to store user data:', result.error);
      }
    } catch (error) {
      console.error('⚠️  Error storing user data:', error.message);
      // Continue even if storage fails
    }
    
    // Step 4: Create session
    req.login(profile, async (err) => {
      if (err) {
        console.error('❌ Session creation error:', err);
        return res.redirect(`${clientOrigin}/login?error=session_error`);
      }
      
      console.log('✅ User logged in successfully:', profile.login);
      
      // Step 5: Check if user has completed profile
      try {
        const userData = await User.findOne({ username: profile.login }).select('full_name role college year');
        
        if (!userData || !userData.full_name || !userData.role || !userData.college) {
          console.log('📝 User needs to complete profile, redirecting to /register');
          return res.redirect(`${clientOrigin}/register`);
        } else {
          console.log('✅ User profile complete, redirecting to success page');
          const successRedirect = process.env.CLIENT_SUCCESS_REDIRECT || `${clientOrigin}/login?auth=success`;
          return res.redirect(successRedirect);
        }
      } catch (error) {
        console.error('❌ Error checking user profile:', error);
        return res.redirect(`${clientOrigin}/register`);
      }
    });
    
  } catch (error) {
    console.error('❌ Unexpected error in OAuth callback:', error);
    return res.redirect(`${clientOrigin}/login?error=server_error`);
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ authenticated: false });
  }
  
  try {
    // Fetch user's profile data from database
    const username = req.user.username || req.user.login;
    const userData = await User.findOne({ username: username })
      .select('full_name role college year instructor pr_count avatar_url display_name');
    
    if (!userData) {
      console.error('Error fetching user profile: User not found');
      // Return session user data if DB fetch fails
      return res.json({ authenticated: true, user: req.user });
    }
    
    // Merge session data with database profile data
    const completeUser = {
      ...req.user,
      full_name: userData.full_name,
      role: userData.role,
      college: userData.college,
      year: userData.year,
      instructor: userData.instructor,
      pr_count: userData.pr_count,
      avatar_url: userData.avatar_url,
      display_name: userData.display_name
    };
    
    res.json({ authenticated: true, user: completeUser });
  } catch (error) {
    console.error('Error in /auth/me:', error);
    res.json({ authenticated: true, user: req.user });
  }
});

// Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect(process.env.CLIENT_LOGOUT_REDIRECT || 'http://localhost:3000/login');
  });
});

export default router;
