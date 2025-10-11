import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, createTablesManually } from './supabase.js';
import { storeUserAndPRs, refreshUserPRs } from './prService.js';
import cron from 'node-cron';

dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Middleware to ensure database is initialized for serverless
app.use(async (req, res, next) => {
  try {
    // Initialize database tables if needed (for serverless cold starts)
    if (process.env.NODE_ENV === 'production') {
      await createTablesManually();
    }
    next();
  } catch (error) {
    console.error('Database initialization error:', error);
    next(); // Continue anyway
  }
});

app.set('trust proxy', 1);

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.CLIENT_ORIGIN, process.env.VERCEL_URL] 
    : ['http://localhost:4000', 'http://localhost:4321'], // Astro default port
  credentials: true 
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true in production (HTTPS)
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site cookies in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || (process.env.NODE_ENV === 'production' 
    ? '/api/auth/github/callback' 
    : 'http://localhost:4000/auth/github/callback'),
}, async (accessToken, refreshToken, profile, done) => {
  // Store user and fetch PRs in background
  profile.accessToken = accessToken;
  
  // Store user and PRs in Supabase
  try {
    const result = await storeUserAndPRs(profile);
    if (result.success) {
      console.log(`Successfully stored data for ${profile.username || profile.login}`);
    }
  } catch (error) {
    console.error('Error storing user data:', error);
  }
  
  return done(null, profile);
}));

// Serve static files from Astro build output
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/api/auth/github/callback', passport.authenticate('github', { failureRedirect: '/api/auth/failure' }), async (req, res) => {
  try {
    // Check if user has completed profile
    const username = req.user.username || req.user.login;
    const { data: user, error } = await supabase
      .from('users')
      .select('full_name, role, college, year')
      .eq('username', username)
      .single();

    if (error || !user || !user.full_name || !user.role || !user.college) {
      // User needs to complete profile (year is optional for instructors)
      res.redirect((process.env.CLIENT_ORIGIN || 'https://gitgopr.nstsdc.org') + '/register');
    } else {
      // User has completed profile, go to success page
      res.redirect(process.env.CLIENT_SUCCESS_REDIRECT || 'https://gitgopr.nstsdc.org/login?auth=success');
    }
  } catch (error) {
    console.error('Error checking user profile:', error);
    // Fallback to register page on error
    res.redirect((process.env.CLIENT_ORIGIN || 'https://gitgopr.nstsdc.org') + '/register');
  }
});

// Health check route for Vercel
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.user) return res.status(401).json({ authenticated: false });
  
  try {
    // Fetch user's profile data from database
    const username = req.user.username || req.user.login;
    const { data: userData, error } = await supabase
      .from('users')
      .select('full_name, role, college, year, instructor, pr_count, avatar_url, display_name')
      .eq('username', username)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
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

// Update user profile (full_name, role, college, year, instructor) - requires user session
app.post('/api/user/profile', express.json(), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    const { full_name, role, college, year, instructor } = req.body;
    const username = req.user.username || req.user.login;

    // Update the users table in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .update({
        full_name: full_name || null,
        role: role || null,
        college: college || null,
        year: year || null,
        instructor: instructor || null,
        last_updated: new Date().toISOString()
      })
      .eq('username', username)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Error in /user/profile:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect(process.env.CLIENT_LOGOUT_REDIRECT || 'https://gitgopr.nstsdc.org/login');
  });
});

// GitHub Webhook endpoint for real-time PR updates
app.post('/webhook/github', express.json(), async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    // Validate required headers
    if (!event) {
      console.error('Webhook error: Missing x-github-event header');
      return res.status(400).json({ error: 'Missing x-github-event header' });
    }

    // Validate payload exists
    if (!payload || Object.keys(payload).length === 0) {
      console.error('Webhook error: Empty or invalid payload');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Verify webhook secret if configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-hub-signature-256'];
      
      if (!signature) {
        console.error('Webhook error: Missing signature header when secret is configured');
        return res.status(401).json({ error: 'Missing signature' });
      }
      
      try {
        const crypto = await import('crypto');
        const hmac = crypto.createHmac('sha256', webhookSecret);
        const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
        
        if (signature !== digest) {
          console.error('Webhook error: Invalid signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      } catch (cryptoError) {
        console.error('Webhook error: Signature verification failed:', cryptoError);
        return res.status(500).json({ error: 'Signature verification failed' });
      }
    }

    // Handle pull_request events
    if (event === 'pull_request') {
      const action = payload.action;
      const prAuthor = payload.pull_request?.user?.login;
      const prNumber = payload.pull_request?.number;
      const repoName = payload.repository?.full_name;
      
      // Validate required payload fields
      if (!action) {
        console.error('Webhook error: Missing action in pull_request payload');
        return res.status(400).json({ error: 'Missing action field' });
      }
      
      if (!prAuthor) {
        console.error('Webhook error: Missing PR author in payload');
        return res.status(400).json({ error: 'Missing PR author' });
      }
      
      console.log(`Webhook: PR #${prNumber || 'unknown'} ${action} by ${prAuthor} in ${repoName || 'unknown repo'}`);
      
      // Update user's PR data if they exist in our system
      try {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('username', prAuthor)
          .single();
        
        if (userError && userError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error(`Webhook error: Database error fetching user ${prAuthor}:`, userError);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (user) {
          console.log(`Refreshing PR data for ${prAuthor}...`);
          
          try {
            const { refreshUserPRs } = await import('./prService.js');
            await refreshUserPRs(prAuthor);
            console.log(`Successfully refreshed PR data for ${prAuthor}`);
          } catch (refreshError) {
            console.error(`Webhook error: Failed to refresh PRs for ${prAuthor}:`, refreshError);
            // Don't return error - webhook was processed, just refresh failed
          }
        } else {
          console.log(`User ${prAuthor} not found in system, skipping refresh`);
        }
      } catch (dbError) {
        console.error('Webhook error: Unexpected database error:', dbError);
        return res.status(500).json({ error: 'Database error' });
      }
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook error: Unexpected error:', error);
    res.status(500).json({ error: 'Webhook processing error', details: error.message });
  }
});

// Admin authentication middleware
function requireAdminAuth(req, res, next) {
  const adminPassword = req.headers['x-admin-password'] || req.query.adminPassword;
  
  if (adminPassword === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized - Invalid admin credentials' });
  }
}

// Admin routes - protected
app.get('/api/admin/users', requireAdminAuth, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('pr_count', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users/:userId/prs', requireAdminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data: prs, error } = await supabase
      .from('pull_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ prs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual refresh endpoint for admin
app.post('/api/admin/refresh-all', requireAdminAuth, async (req, res) => {
  try {
    console.log('🔄 Manual refresh triggered by admin...');
    
    // Get all users from database
    const { data: users, error } = await supabase
      .from('users')
      .select('username');
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    if (!users || users.length === 0) {
      return res.json({ message: 'No users to refresh', usersRefreshed: 0 });
    }
    
    // Refresh each user's PRs
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        console.log(`  → Refreshing ${user.username}...`);
        await refreshUserPRs(user.username);
        successCount++;
        
        // Small delay between users to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`  ✗ Error refreshing ${user.username}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`✅ Manual refresh completed! Success: ${successCount}, Errors: ${errorCount}`);
    
    res.json({ 
      message: 'Refresh completed',
      usersRefreshed: successCount,
      errors: errorCount,
      total: users.length
    });
  } catch (error) {
    console.error('Error in manual refresh:', error);
    res.status(500).json({ error: error.message });
  }
});

// Public leaderboard endpoint - shows users sorted by merged PR count
app.get('/api/leaderboard', async (req, res) => {
  try {
    // Get users with their merged PR counts
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, pr_count')
      .order('pr_count', { ascending: false });

    if (usersError) {
      return res.status(500).json({ error: usersError.message });
    }

    // Get merged PR counts for each user
    const leaderboard = await Promise.all(
      users.map(async (user) => {
        const { data: prs, error: prsError } = await supabase
          .from('pull_requests')
          .select('merged_at')
          .eq('user_id', user.id)
          .not('merged_at', 'is', null); // Only count PRs that have been merged

        const mergedCount = prs ? prs.length : 0;

        return {
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          total_prs: user.pr_count,
          merged_prs: mergedCount
        };
      })
    );

    // Sort by merged PRs count (highest first)
    leaderboard.sort((a, b) => b.merged_prs - a.merged_prs);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats', requireAdminAuth, async (req, res) => {
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, pr_count');

    const { data: prs, error: prsError } = await supabase
      .from('pull_requests')
      .select('state, merged_at');

    if (usersError || prsError) {
      return res.status(500).json({ error: usersError?.message || prsError?.message });
    }

    const totalUsers = users.length;
    const totalPRs = prs.length;
    const openPRs = prs.filter(pr => pr.state === 'open').length;
    const mergedPRs = prs.filter(pr => pr.merged_at !== null).length; // Only count actually merged PRs

    res.json({
      totalUsers,
      totalPRs,
      openPRs,
      mergedPRs,
      averagePRsPerUser: totalUsers > 0 ? (totalPRs / totalUsers).toFixed(2) : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Background job: Refresh all users' PR counts every hour
async function refreshAllUsersPRs() {
  console.log('Starting scheduled PR refresh for all users...');
  
  try {
    // Get all users from database
    const { data: users, error } = await supabase
      .from('users')
      .select('username');
    
    if (error) {
      console.error('Error fetching users for refresh:', error);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('No users to refresh');
      return;
    }
    
    console.log(`Refreshing PR data for ${users.length} users...`);
    
    // Refresh each user's PRs with a small delay to avoid rate limiting
    for (const user of users) {
      try {
        console.log(`  → Refreshing ${user.username}...`);
        await refreshUserPRs(user.username);
        
        // Small delay between users to be nice to GitHub API
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      } catch (error) {
        console.error(`  ✗ Error refreshing ${user.username}:`, error.message);
      }
    }
    
    console.log('Scheduled PR refresh completed!');
  } catch (error) {
    console.error('Error in scheduled PR refresh:', error);
  }
}

// Fallback for client-side routing - serve index.html for non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Serve index.html for client-side routing
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(404).send('Page not found - Make sure to build the client first: npm run build:client');
    }
  });
});

// For Vercel serverless deployment, export the app
export default app;

// For local development, still listen on port
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 4000;
  app.listen(port, async () => {
    console.log(`Auth server listening on http://localhost:${port}`);
    
    // Initialize database tables
    await createTablesManually();
    
    // // Schedule cron job only in development
    // cron.schedule('0 * * * *', refreshAllUsersPRs, {
    //   scheduled: true,
    //   timezone: "Asia/Kolkata"
    // });
    // console.log('✓ Scheduled job: Refresh all users PRs every hour');
    
    // // Run initial refresh on startup (optional)
    // console.log('Running initial PR refresh on startup...');
    // setTimeout(() => refreshAllUsersPRs(), 5000); // Wait 5 seconds after startup
  });
}
