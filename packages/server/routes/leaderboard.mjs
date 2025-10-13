import { Router } from 'express'

import { getLeaderboard } from '../controllers/leaderboard.mjs'

const router = Router()

router.get('/', getLeaderboard)

export default router
