import fetch from 'node-fetch';

/**
 * Custom GitHub OAuth token exchange
 * This function manually exchanges the authorization code for an access token
 * with proper headers to ensure GitHub returns JSON instead of URL-encoded data
 */
export async function exchangeCodeForToken(code) {
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/auth/github/callback';

  console.log('🔄 Exchanging code for access token...');
  console.log('   Client ID:', clientID ? `${clientID.substring(0, 10)}...` : '❌ MISSING');
  console.log('   Redirect URI:', redirectUri);
  console.log('   Code:', code ? `${code.substring(0, 10)}...` : '❌ MISSING');

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientID,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri
      })
    });

    const data = await response.json();
    
    console.log('📦 Token exchange response status:', response.status);
    
    if (data.error) {
      console.error('❌ GitHub token exchange error:', data.error);
      console.error('   Error description:', data.error_description);
      console.error('   Error URI:', data.error_uri);
      return { success: false, error: data.error, description: data.error_description };
    }

    if (data.access_token) {
      console.log('✅ Access token obtained successfully');
      return { success: true, access_token: data.access_token };
    } else {
      console.error('❌ No access token in response:', data);
      return { success: false, error: 'no_token', description: 'No access token in response' };
    }
  } catch (error) {
    console.error('❌ Network error during token exchange:', error.message);
    return { success: false, error: 'network_error', description: error.message };
  }
}

/**
 * Fetch GitHub user profile using access token
 */
export async function fetchGitHubProfile(accessToken) {
  console.log('👤 Fetching GitHub user profile...');
  
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'User-Agent': 'GitGoPR-App'
      }
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch user profile:', response.status, response.statusText);
      return { success: false, error: 'profile_fetch_failed' };
    }

    const profile = await response.json();
    console.log('✅ Profile fetched:', profile.login);

    // Fetch user email if not public
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'User-Agent': 'GitGoPR-App'
      }
    });

    let emails = [];
    if (emailResponse.ok) {
      emails = await emailResponse.json();
    }

    return {
      success: true,
      profile: {
        id: profile.id,
        login: profile.login,
        username: profile.login,
        displayName: profile.name,
        name: profile.name,
        email: profile.email || emails.find(e => e.primary)?.email,
        emails: emails,
        avatar_url: profile.avatar_url,
        profileUrl: profile.html_url,
        accessToken: accessToken,
        _raw: JSON.stringify(profile),
        _json: profile
      }
    };
  } catch (error) {
    console.error('❌ Error fetching profile:', error.message);
    return { success: false, error: 'network_error', description: error.message };
  }
}
