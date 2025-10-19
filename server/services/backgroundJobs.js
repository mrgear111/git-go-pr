import cron from 'node-cron';
import { User } from '../models/index.js';
import { refreshUserPRs } from './prService.js';

// Background job: Refresh all users' PR counts every hour
export async function refreshAllUsersPRs() {
  const startTime = new Date();
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔄 Starting scheduled PR & Repo Stats refresh...');
  console.log(`⏰ Time: ${startTime.toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    // Get all users from database
    const users = await User.find({}).select('username pr_count');
    
    if (!users || users.length === 0) {
      console.log('⚠️  No users to refresh');
      return;
    }
    
    console.log(`📊 Refreshing data for ${users.length} users...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    let totalPRsProcessed = 0;
    
    // Refresh each user's PRs with a small delay to avoid rate limiting
    for (const [index, user] of users.entries()) {
      try {
        console.log(`[${index + 1}/${users.length}] 👤 ${user.username} (previous: ${user.pr_count} PRs)`);
        const result = await refreshUserPRs(user.username);
        
        if (result.success) {
          successCount++;
          totalPRsProcessed += result.prCount || 0;
          console.log(`   ✅ Success: ${result.prCount} PRs\n`);
        } else {
          errorCount++;
          console.log(`   ❌ Failed: ${result.error}\n`);
        }
        
        // Small delay between users to be nice to GitHub API
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error refreshing ${user.username}:`, error.message);
        console.error(`      ${error.stack?.split('\n')[1]?.trim()}\n`);
      }
    }
    
    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Scheduled refresh completed!');
    console.log(`📊 Summary:`);
    console.log(`   • Total users: ${users.length}`);
    console.log(`   • Successful: ${successCount}`);
    console.log(`   • Failed: ${errorCount}`);
    console.log(`   • Total PRs: ${totalPRsProcessed}`);
    console.log(`   • Duration: ${duration}s`);
    console.log(`   • Avg time per user: ${(duration / users.length).toFixed(2)}s`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Critical error in scheduled PR refresh:', error);
    console.error(`   Stack: ${error.stack}`);
  }
}

// Schedule cron job to run every hour at minute 0
// Format: minute hour day month dayOfWeek
export function startScheduledJobs() {
  cron.schedule('0 * * * *', refreshAllUsersPRs, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  console.log('Scheduled job: Refresh all users PRs every hour');
}
