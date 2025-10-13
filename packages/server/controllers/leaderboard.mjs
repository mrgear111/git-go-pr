import { supabase } from '../supabase.js';

export async function getLeaderboard(req, res) {
  try {
    // Get users with their merged PR counts
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, pr_count')
      .order('pr_count', { ascending: false })

    if (usersError) {
      return res.status(500).json({ error: usersError.message })
    }

    // Get merged PR counts for each user
    const leaderboard = await Promise.all(
      users.map(async (user) => {
        const { data: prs, error: prsError } = await supabase
          .from('pull_requests')
          .select('merged_at')
          .eq('user_id', user.id)
          .not('merged_at', 'is', null) // Only count PRs that have been merged

        const mergedCount = prs ? prs.length : 0

        return {
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          total_prs: user.pr_count,
          merged_prs: mergedCount,
        }
      })
    )

    // Sort by merged PRs count (highest first)
    leaderboard.sort((a, b) => b.merged_prs - a.merged_prs)

    res.json(leaderboard)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
