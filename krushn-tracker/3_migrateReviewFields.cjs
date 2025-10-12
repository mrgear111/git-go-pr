require('dotenv').config()

const mongoose = require('mongoose')

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err)
    process.exit(1)
  })

const { GitHubPR } = require('./models')

/**
 * Migration script to add review tracking fields to existing PRs
 * This script updates all PRs that don't have the new review fields
 */
async function migrateReviewFields() {
  try {
    console.log('Starting migration: Adding review tracking fields to PRs...')

    // Find all PRs that don't have the review_status field
    const prs = await GitHubPR.find({
      $or: [
        { review_status: { $exists: false } },
        { review_status: null },
      ],
    })

    console.log(`Found ${prs.length} PRs to migrate`)

    let updatedCount = 0

    for (const pr of prs) {
      try {
        // Skip PRs with missing or empty link field
        if (!pr.link || pr.link.trim() === '') {
          console.warn(`Skipping PR ${pr.github_id}: Missing or empty link field`)
          continue
        }

        // Determine initial review status based on existing data
        let initialReviewStatus = 'pending'
        
        if (pr.is_merged) {
          initialReviewStatus = 'merged'
        } else if (!pr.is_open) {
          // Closed but not merged - keep as pending or could be changes_requested
          initialReviewStatus = 'pending'
        }

        // Update the PR with default review fields
        pr.review_status = initialReviewStatus
        pr.review_started_at = null
        pr.reviewers = []
        pr.review_comments_count = 0

        // Extract PR number from link if not already set
        if (!pr.pr_number && pr.link) {
          const prNumberMatch = pr.link.match(/\/pull\/(\d+)/)
          if (prNumberMatch) {
            pr.pr_number = parseInt(prNumberMatch[1])
          }
        }

        await pr.save()
        updatedCount++

        if (updatedCount % 10 === 0) {
          console.log(`Progress: ${updatedCount}/${prs.length} PRs migrated`)
        }
      } catch (error) {
        console.error(`Error migrating PR ${pr.github_id}:`, error.message)
        // Continue with next PR
        continue
      }
    }

    console.log(`\nMigration completed successfully!`)
    console.log(`Total PRs migrated: ${updatedCount}`)
    console.log('\nNext steps:')
    console.log('1. Run 2_fetchPRs.cjs to fetch review data from GitHub')
    console.log('2. Or run 3_updateReviewStatus.cjs to update review status for all PRs')

  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  } finally {
    await mongoose.connection.close()
    console.log('\nDatabase connection closed')
  }
}

// Run migration
if (require.main === module) {
  migrateReviewFields()
    .then(() => {
      console.log('Migration script finished')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Migration script failed:', err)
      process.exit(1)
    })
}

module.exports = { migrateReviewFields }
