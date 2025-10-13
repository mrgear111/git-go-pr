import { supabase } from '../supabase.js';

export async function getUserProfile(req, res) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })

    const { full_name, role, college, year, instructor } = req.body
    const username = req.user.username || req.user.login

    // Update the users table in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .update({
        full_name: full_name || null,
        role: role || null,
        college: college || null,
        year: year || null,
        instructor: instructor || null,
        last_updated: new Date().toISOString(),
      })
      .eq('username', username)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return res.status(500).json({ error: error.message })
    }

    res.json({ success: true, user })
  } catch (error) {
    console.error('Error in /user/profile:', error)
    res.status(500).json({ error: error.message })
  }
}
