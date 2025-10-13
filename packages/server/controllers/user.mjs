import models from '../models/index.mjs'

export async function getUserProfile(req, res) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })

    const { full_name, role, college, year } = req.body
    const username = req.user.username || req.user.login

    // Find or create college if provided
    let collegeRef = null
    if (college) {
      const collegeDoc = await models.College.findOneAndUpdate(
        { name: college },
        { name: college },
        { upsert: true, new: true }
      )
      collegeRef = collegeDoc._id
    }

    const user = await models.User.findOneAndUpdate(
      { username },
      {
        full_name,
        role,
        college: collegeRef,
        year
      },
      { new: true }
    )

    res.json({ success: true, user })
  } catch (error) {
    console.error('Error in /user/profile:', error)
    res.status(500).json({ error: error.message })
  }
}
