import { supabase } from '../supabase.js';

export async function handleGitHubCallback(req, res) {
  try {
    // Check if user has completed profile
    const username = req.user.username || req.user.login
    const { data: user, error } = await supabase
      .from('users')
      .select('full_name, role, college, year')
      .eq('username', username)
      .single()

    if (error || !user || !user.full_name || !user.role || !user.college) {
      // User needs to complete profile (year is optional for instructors)
      res.redirect(
        (process.env.CLIENT_ORIGIN || 'https://gitgopr.nstsdc.org') +
          '/register'
      )
    } else {
      // User has completed profile, go to success page
      res.redirect(
        process.env.CLIENT_SUCCESS_REDIRECT ||
          'https://gitgopr.nstsdc.org/login?auth=success'
      )
    }
  } catch (error) {
    console.error('Error checking user profile:', error)
    // Fallback to register page on error
    res.redirect(
      (process.env.CLIENT_ORIGIN || 'https://gitgopr.nstsdc.org') + '/register'
    )
  }
}

export async function handleMeCallback(req, res) {
  if (!req.user) return res.status(401).json({ authenticated: false })

  try {
    // Fetch user's profile data from database
    const username = req.user.username || req.user.login
    const { data: userData, error } = await supabase
      .from('users')
      .select(
        'full_name, role, college, year, instructor, pr_count, avatar_url, display_name'
      )
      .eq('username', username)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      // Return session user data if DB fetch fails
      return res.json({ authenticated: true, user: req.user })
    }

    // Merge session data with database profile data
    const completeUser = {
      ...req.user,
      full_name: userData.full_name,
      role: userData.role,
      college: userData.college,
      year: userData.year,
      instructor: userData.instructor,
      pr_count: userData.pr_count,
      avatar_url: userData.avatar_url,
      display_name: userData.display_name,
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
