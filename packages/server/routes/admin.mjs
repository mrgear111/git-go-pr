import { Router } from 'express'

import {
  getAllUsers,
  getAllUserPRs,
  refreshAllUserPRs,
  getAdminStats,
  getAllPRs,
  getAllColleges,
  getAllOwners,
  getAllRepositories,
  getStatistics,
} from '../controllers/admin.mjs'

const router = Router()

router.get('/users', getAllUsers)
router.get('/users/:userId/prs', getAllUserPRs)
router.post('/refresh-all', refreshAllUserPRs)
router.get('/stats', getAdminStats)
//
router.get('/pull-requests', getAllPRs)
router.get('/colleges', getAllColleges)
router.get('/owners', getAllOwners)
router.get('/repositories', getAllRepositories)
router.get('/statistics', getStatistics)

export default router
