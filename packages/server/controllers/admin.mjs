import { supabase } from '../supabase.js'
import { refreshUserPRs } from '../services/prService.js'

export async function getAllUsers(req, res) {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('pr_count', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ users })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export async function getAllUserPRs(req, res) {
  try {
    const { userId } = req.params

    const { data: prs, error } = await supabase
      .from('pull_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ prs })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export async function refreshAllUserPRs(req, res) {
  try {
    console.log('🔄 Manual refresh triggered by admin...')

    // Get all users from database
    const { data: users, error } = await supabase
      .from('users')
      .select('username')

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    if (!users || users.length === 0) {
      return res.json({ message: 'No users to refresh', usersRefreshed: 0 })
    }

    // Refresh each user's PRs
    let successCount = 0
    let errorCount = 0

    for (const user of users) {
      try {
        console.log(`  → Refreshing ${user.username}...`)
        await refreshUserPRs(user.username)
        successCount++

        // Small delay between users to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`  ✗ Error refreshing ${user.username}:`, error.message)
        errorCount++
      }
    }

    console.log(
      `✅ Manual refresh completed! Success: ${successCount}, Errors: ${errorCount}`
    )

    res.json({
      message: 'Refresh completed',
      usersRefreshed: successCount,
      errors: errorCount,
      total: users.length,
    })
  } catch (error) {
    console.error('Error in manual refresh:', error)
    res.status(500).json({ error: error.message })
  }
}

export async function getAdminStats(req, res) {
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, pr_count')

    const { data: prs, error: prsError } = await supabase
      .from('pull_requests')
      .select('state, merged_at')

    if (usersError || prsError) {
      return res
        .status(500)
        .json({ error: usersError?.message || prsError?.message })
    }

    const totalUsers = users.length
    const totalPRs = prs.length
    const openPRs = prs.filter((pr) => pr.state === 'open').length
    const mergedPRs = prs.filter((pr) => pr.merged_at !== null).length // Only count actually merged PRs

    res.json({
      totalUsers,
      totalPRs,
      openPRs,
      mergedPRs,
      averagePRsPerUser:
        totalUsers > 0 ? (totalPRs / totalUsers).toFixed(2) : 0,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
