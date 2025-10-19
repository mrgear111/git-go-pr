import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { storeUserAndPRs } from '../services/prService.js';

export function configurePassport() {
  // Serialize user for session storage
  passport.serializeUser((user, done) => {
    console.log('✅ Serializing user:', user?.login || user?.username);
    done(null, user);
  });
  
  // Deserialize user from session
  passport.deserializeUser((obj, done) => {
    console.log('✅ Deserializing user:', obj?.login || obj?.username);
    done(null, obj);
  });

  // Verify environment variables
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const callbackURL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/auth/github/callback';

  console.log('🔧 GitHub OAuth Configuration:');
  console.log('   Client ID:', clientID ? `${clientID.substring(0, 10)}...` : '❌ MISSING');
  console.log('   Client Secret:', clientSecret ? `${clientSecret.substring(0, 10)}...` : '❌ MISSING');
  console.log('   Callback URL:', callbackURL);

  if (!clientID || !clientSecret) {
    console.error('❌ CRITICAL: GitHub OAuth credentials are missing!');
    console.error('   Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env file');
  }

  passport.use(new GitHubStrategy({
    clientID: clientID,
    clientSecret: clientSecret,
    callbackURL: callbackURL,
    scope: ['user:email'],
    // Ensure JSON response format
    customHeaders: {
      'Accept': 'application/json'
    }
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🎉 GitHub OAuth Success!');
      console.log('   Username:', profile.login || profile.username);
      console.log('   Display Name:', profile.displayName);
      console.log('   Email:', profile.emails?.[0]?.value || 'Not provided');
      console.log('   Access Token:', accessToken ? '✅ Received' : '❌ Missing');
      
      if (!accessToken) {
        console.error('❌ Failed to obtain access token from GitHub');
        return done(new Error('Failed to obtain access token'), null);
      }

      // Store access token in profile
      profile.accessToken = accessToken;
      
      // Store user and PRs in MongoDB
      console.log('💾 Storing user data in MongoDB...');
      const result = await storeUserAndPRs(profile);
      
      if (result.success) {
        console.log(`✅ Successfully stored data for ${profile.username || profile.login}`);
        return done(null, profile);
      } else {
        console.error('⚠️  Failed to store user data:', result.error);
        // Still authenticate the user even if storage fails
        return done(null, profile);
      }
    } catch (error) {
      console.error('❌ Error in GitHub OAuth callback:', error);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
      return done(error, null);
    }
  }));
}
