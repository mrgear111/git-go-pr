export async function refreshAllUsersPRs() {
  console.log('Starting scheduled PR refresh for all users...')

  try {
    // Get all users from database
    const { data: users, error } = await supabase
      .from('users')
      .select('username')

    if (error) {
      console.error('Error fetching users for refresh:', error)
      return
    }

    if (!users || users.length === 0) {
      console.log('No users to refresh')
      return
    }

    console.log(`Refreshing PR data for ${users.length} users...`)

    // Refresh each user's PRs with a small delay to avoid rate limiting
    for (const user of users) {
      try {
        console.log(`  → Refreshing ${user.username}...`)
        await refreshUserPRs(user.username)

        // Small delay between users to be nice to GitHub API
        await new Promise((resolve) => setTimeout(resolve, 2000)) // 2 second delay
      } catch (error) {
        console.error(`  ✗ Error refreshing ${user.username}:`, error.message)
      }
    }

    console.log('Scheduled PR refresh completed!')
  } catch (error) {
    console.error('Error in scheduled PR refresh:', error)
  }
}
