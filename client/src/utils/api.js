/**
 * API utility functions for frontend
 */

export const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:4000';

/**
 * Check if user is authenticated
 */
export async function checkAuth() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    
    return { authenticated: false };
  } catch (error) {
    console.error('Auth check failed:', error);
    return { authenticated: false };
  }
}

/**
 * Fetch user profile data
 */
export async function fetchUserProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
}
