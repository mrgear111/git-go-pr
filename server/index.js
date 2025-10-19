import express from 'express';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import cors from 'cors';

// Import configurations and services
import { connectToDatabase } from './config/database.js';
import { configurePassport } from './config/passport.js';
import { startScheduledJobs } from './services/backgroundJobs.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';
import webhookRoutes from './routes/webhooks.js';
import statsRoutes from './routes/stats.js';
import contributionsRoutes from './routes/contributions.js';

dotenv.config();

const app = express();

// Trust proxy for production deployment
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({ 
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:4321', 
  credentials: true 
}));

// Session configuration
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

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
configurePassport();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/stats', statsRoutes);
app.use('/api/user/contributions', contributionsRoutes);
app.use('/', publicRoutes);
app.use('/webhook', webhookRoutes);

// Health check endpoint
app.get('/', (req, res) => res.send('GitGoPR API server running'));

// Start server
const port = process.env.PORT || 4000;
app.listen(port, async () => {
  console.log(`🚀 GitGoPR API server listening on http://localhost:${port}`);
  
  // Connect to MongoDB
  await connectToDatabase();
  
  // Start scheduled jobs
  startScheduledJobs();
  
  // Run initial refresh on startup (optional)
  console.log('Running initial PR refresh on startup...');
  setTimeout(async () => {
    const { refreshAllUsersPRs } = await import('./services/backgroundJobs.js');
    await refreshAllUsersPRs();
  }, 5000); // Wait 5 seconds after startup
});