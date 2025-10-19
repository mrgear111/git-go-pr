import { connectToDatabase } from '../config/database.js';
import { User, PullRequest } from '../models/index.js';

async function setupDatabase() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await connectToDatabase();
    
    console.log('📊 Creating database indexes...');
    
    // Create indexes for better performance
    await User.createIndexes();
    await PullRequest.createIndexes();
    
    console.log('✅ Database setup completed successfully!');
    console.log('📋 Collections created:');
    console.log('  - users (with indexes on github_id, username)');
    console.log('  - pullrequests (with indexes on user_id, state, created_at)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
