import express from 'express'
const router = express.Router()

// import passport from 'passport'
import requireAdminAuth from '../middlewares/requireAdminAuth.mjs'

import authRouter from './auth.mjs'
import userRouter from './user.mjs'
import adminRouter from './admin.mjs'
import leaderboardRouter from './leaderboard.mjs'
import webhookRouter from './webhook.mjs'

router.use('*', (req, res, next) => {
  console.log('KRUSHN LOG: Incoming request:', req.method, req.originalUrl)
  next()
})

router.use('/auth', authRouter)
router.use('/user', userRouter)
router.use('/admin', requireAdminAuth, adminRouter)
router.use('/leaderboard', leaderboardRouter)
router.use('/webhook', webhookRouter)

router.get('/', (req, res) => {
  res.send('API Router')
})

export default router
