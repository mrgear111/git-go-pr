import models from '../models/index.mjs'
import { refreshUserPRs } from '../services/prService.js'

export async function refreshAllUsersPRs() {
  console.log('Starting scheduled PR refresh for all users...')

  try {
    const users = await models.User.find({}, 'username').lean()

    if (!users.length) {
      console.log('No users to refresh')
      return
    }

    console.log(`Refreshing PR data for ${users.length} users...`)

    for (const user of users) {
      try {
        console.log(`  → Refreshing ${user.username}...`)
        await refreshUserPRs(user.username)
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`  Error refreshing ${user.username}:`, error.message)
      }
    }

    console.log('Scheduled PR refresh completed!')
  } catch (error) {
    console.error('Error in scheduled PR refresh:', error)
  }
}
