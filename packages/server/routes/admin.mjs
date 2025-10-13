import { Router } from 'express'

import {
  getAllUsers,
  getAllUserPRs,
  refreshAllUserPRs,
  getAdminStats,
} from '../controllers/admin.mjs'

const router = Router()

router.get('/users', getAllUsers)
router.get('/users/:userId/prs', getAllUserPRs)
router.get('/refresh-all', refreshAllUserPRs)
router.get('/stats', getAdminStats)

export default router
