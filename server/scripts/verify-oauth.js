import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

console.log('🔍 Verifying GitHub OAuth Configuration...\n');

// Check environment variables
const checks = {
  'GITHUB_CLIENT_ID': process.env.GITHUB_CLIENT_ID,
  'GITHUB_CLIENT_SECRET': process.env.GITHUB_CLIENT_SECRET,
  'GITHUB_CALLBACK_URL': process.env.GITHUB_CALLBACK_URL,
  'CLIENT_ORIGIN': process.env.CLIENT_ORIGIN,
  'SESSION_SECRET': process.env.SESSION_SECRET,
  'MONGODB_URI': process.env.MONGODB_URI
};

let allValid = true;

console.log('Environment Variables:');
console.log('─'.repeat(60));

for (const [key, value] of Object.entries(checks)) {
  if (!value) {
    console.log(`❌ ${key}: MISSING`);
    allValid = false;
  } else {
    // Show partial value for security
    const display = value.length > 20 ? `${value.substring(0, 15)}...` : value;
    console.log(`✅ ${key}: ${display}`);
  }
}

console.log('─'.repeat(60));

if (!allValid) {
  console.error('\n❌ Some required environment variables are missing!');
  console.log('\nPlease ensure your .env file contains all required variables.');
  process.exit(1);
}

// Verify callback URL format
const callbackURL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/auth/github/callback';
console.log('\n📍 OAuth Configuration:');
console.log('─'.repeat(60));
console.log('Callback URL:', callbackURL);
console.log('Client Origin:', process.env.CLIENT_ORIGIN || 'http://localhost:4321');
console.log('─'.repeat(60));

// Test GitHub API connectivity
console.log('\n🌐 Testing GitHub API connectivity...');
try {
  const response = await fetch('https://api.github.com/rate_limit', {
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/json'
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ GitHub API is reachable');
    console.log(`   Rate limit: ${data.rate.remaining}/${data.rate.limit}`);
  } else {
    console.log('⚠️  GitHub API responded with status:', response.status);
  }
} catch (error) {
  console.error('❌ Failed to connect to GitHub API:', error.message);
}

console.log('\n✅ OAuth configuration verification complete!');
console.log('\nNext steps:');
console.log('1. Verify your GitHub OAuth App settings at:');
console.log('   https://github.com/settings/developers');
console.log('2. Ensure the callback URL matches:', callbackURL);
console.log('3. Start the server with: npm start');
console.log('4. Test login at: http://localhost:4321/login');
