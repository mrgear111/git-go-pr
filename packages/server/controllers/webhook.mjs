import models from '../models/index.mjs'

export async function handleGitHubWebhook(req, res) {
  try {
    const event = req.headers['x-github-event']
    const payload = req.body

    // Validate required headers
    if (!event) {
      console.error('Webhook error: Missing x-github-event header')
      return res.status(400).json({ error: 'Missing x-github-event header' })
    }

    // Validate payload exists
    if (!payload || Object.keys(payload).length === 0) {
      console.error('Webhook error: Empty or invalid payload')
      return res.status(400).json({ error: 'Invalid payload' })
    }

    // Verify webhook secret if configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = req.headers['x-hub-signature-256']

      if (!signature) {
        console.error(
          'Webhook error: Missing signature header when secret is configured'
        )
        return res.status(401).json({ error: 'Missing signature' })
      }

      try {
        const crypto = await import('crypto')
        const hmac = crypto.createHmac('sha256', webhookSecret)
        const digest =
          'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex')

        if (signature !== digest) {
          console.error('Webhook error: Invalid signature')
          return res.status(401).json({ error: 'Invalid signature' })
        }
      } catch (cryptoError) {
        console.error(
          'Webhook error: Signature verification failed:',
          cryptoError
        )
        return res.status(500).json({ error: 'Signature verification failed' })
      }
    }

    // Handle pull_request events
    if (event === 'pull_request') {
      const action = payload.action
      const prAuthor = payload.pull_request?.user?.login
      const prNumber = payload.pull_request?.number
      const repoName = payload.repository?.full_name

      // Validate required payload fields
      if (!action) {
        console.error('Webhook error: Missing action in pull_request payload')
        return res.status(400).json({ error: 'Missing action field' })
      }

      if (!prAuthor) {
        console.error('Webhook error: Missing PR author in payload')
        return res.status(400).json({ error: 'Missing PR author' })
      }

      console.log(
        `Webhook: PR #${prNumber || 'unknown'} ${action} by ${prAuthor} in ${
          repoName || 'unknown repo'
        }`
      )

      // Update user's PR data if they exist in our system
      try {
        const user = await models.User.findOne({ username: prAuthor })

        if (user) {
          console.log(`Refreshing PR data for ${prAuthor}...`)
          try {
            const { refreshUserPRs } = await import('../services/prService.js')
            await refreshUserPRs(prAuthor)
            console.log(`Successfully refreshed PR data for ${prAuthor}`)
          } catch (refreshError) {
            console.error(`Webhook error: Failed to refresh PRs for ${prAuthor}:`, refreshError)
          }
        } else {
          console.log(`User ${prAuthor} not found in system, skipping refresh`)
        }
      } catch (dbError) {
        console.error('Webhook error: Unexpected database error:', dbError)
        return res.status(500).json({ error: 'Database error' })
      }
    }

    res.status(200).json({ message: 'Webhook processed successfully' })
  } catch (error) {
    console.error('Webhook error: Unexpected error:', error)
    res
      .status(500)
      .json({ error: 'Webhook processing error', details: error.message })
  }
}
