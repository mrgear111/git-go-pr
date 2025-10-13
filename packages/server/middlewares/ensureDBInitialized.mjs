import { createTablesManually } from '../supabase.js'

export default async function ensureDBInitialized(req, res, next) {
  try {
    // Initialize database tables if needed (for serverless cold starts)
    if (process.env.NODE_ENV === 'production') {
      await createTablesManually()
    }
    next()
  } catch (error) {
    console.error('Database initialization error:', error)
    next() // Continue anyway
  }
}
