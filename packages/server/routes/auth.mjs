import { Router } from 'express'

import passport from 'passport'

import {
  handleGitHubCallback,
  handleMeCallback,
  handleLogout,
} from '../controllers/auth.mjs'

const router = Router()

router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'] })
)

router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/api/auth/failure' }),
  handleGitHubCallback
)

router.get('/me', handleMeCallback)

router.get('/api/auth/logout', handleLogout)

export default router
