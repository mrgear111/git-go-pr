import express from 'express'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GitHubStrategy } from 'passport-github2'
import dotenv from 'dotenv'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { createTablesManually } from './supabase.js'
import { storeUserAndPRs } from './services/prService.js'
// import cron from 'node-cron'

import ensureDBInitialized from './middlewares/ensureDBInitialized.mjs'

dotenv.config()

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app = express()

// Middleware to ensure database is initialized for serverless
app.use(ensureDBInitialized)

app.set('trust proxy', 1)

// Parse JSON bodies
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? [process.env.CLIENT_ORIGIN, process.env.VERCEL_URL]
        : ['http://localhost:4000', 'http://localhost:4321'], // Astro default port
    credentials: true,
  })
)

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in production (HTTPS)
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site cookies in production
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
)

app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((obj, done) => done(null, obj))

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL:
        process.env.GITHUB_CALLBACK_URL ||
        (process.env.NODE_ENV === 'production'
          ? '/api/auth/github/callback'
          : 'http://localhost:4000/auth/github/callback'),
    },
    async (accessToken, refreshToken, profile, done) => {
      // Store user and fetch PRs in background
      profile.accessToken = accessToken

      // Store user and PRs in Supabase
      try {
        const result = await storeUserAndPRs(profile)
        if (result.success) {
          console.log(
            `Successfully stored data for ${profile.username || profile.login}`
          )
        }
      } catch (error) {
        console.error('Error storing user data:', error)
      }

      return done(null, profile)
    }
  )
)

// Serve static files from Astro build output
const clientDistPath = path.join(__dirname, '..', 'client', 'dist')
app.use(express.static(clientDistPath))

// Health check route for Vercel
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

import apiRouter from './routes/index.mjs'

app.use('/api', apiRouter)

// Fallback for client-side routing - serve index.html for non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' })
  }

  // Serve index.html for client-side routing
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist')
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      console.error('Error serving index.html:', err)
      res
        .status(404)
        .send(
          'Page not found - Make sure to build the client first: npm run build:client'
        )
    }
  })
})

// For Vercel serverless deployment, export the app
export default app

// For local development, still listen on port
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 4000
  app.listen(port, async () => {
    console.log(`Auth server listening on http://localhost:${port}`)

    // Initialize database tables
    await createTablesManually()
  })
}
