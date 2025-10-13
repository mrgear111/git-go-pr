import { Router } from 'express'

import { handleGitHubWebhook } from '../controllers/webhook.mjs'

const router = Router()

// Update user profile (full_name, role, college, year, instructor) - requires user session
router.post('/github', handleGitHubWebhook)

export default router
