import models from '../models/index.mjs'

export async function handleGitHubCallback(req, res) {
  try {
    const username = req.user.username || req.user.login
    const user = await models.User.findOne({ username }, 'full_name role college year')

    if (!user || !user.full_name || !user.role || !user.college) {
      res.redirect((process.env.CLIENT_ORIGIN || 'https://gitgopr.nstsdc.org') + '/register')
    } else {
      res.redirect(process.env.CLIENT_SUCCESS_REDIRECT || 'https://gitgopr.nstsdc.org/login?auth=success')
    }
  } catch (error) {
    console.error('Error checking user profile:', error)
    res.redirect((process.env.CLIENT_ORIGIN || 'https://gitgopr.nstsdc.org') + '/register'
    )
  }
}

export async function handleMeCallback(req, res) {
  if (!req.user) return res.status(401).json({ authenticated: false })

  try {
    const username = req.user.username || req.user.login
    const userData = await models.User.findOne({ username })

    if (!userData) {
      return res.json({ authenticated: true, user: req.user })
    }

    // Merge session data with database profile data
    const completeUser = {
      ...req.user,
      full_name: userData.full_name,
      role: userData.role,
      college: userData.college,
      year: userData.year
    }

    res.json({ authenticated: true, user: completeUser })
  } catch (error) {
    console.error('Error in /auth/me:', error)
    res.json({ authenticated: true, user: req.user })
  }
}

export async function handleLogout(req, res, next) {
  req.logout((err) => {
    if (err) return next(err)
    res.redirect(
      process.env.CLIENT_LOGOUT_REDIRECT || 'https://gitgopr.nstsdc.org/login'
    )
  })
}
