import { Router } from 'express'

import { getUserProfile } from '../controllers/user.mjs'

const router = Router()

// Update user profile (full_name, role, college, year, instructor) - requires user session
router.post('/profile', getUserProfile)

export default router
