// MongoDB API endpoint (you'll need to set this up)
const API_ENDPOINT = 'http://localhost:3000/api';

// LinkedIn OAuth configuration
declare const LINKEDIN_CLIENT_ID: string;
declare const LINKEDIN_AUTH_SCOPE: string;
declare const LINKEDIN_RESPONSE_TYPE: string;

const clientId = LINKEDIN_CLIENT_ID;
const redirectUri = 'https://' + chrome.runtime.id + '.chromiumapp.org/';
const scope = LINKEDIN_AUTH_SCOPE;
const responseType = LINKEDIN_RESPONSE_TYPE;

interface SavedPage {
  url: string;
  title: string;
  timestamp: number;
  description?: string;
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_PAGE') {
    savePage(message.data)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error }));
    return true;
  }
  
  if (message.type === 'LINKEDIN_LOGIN') {
    handleLinkedInLogin()
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }

  if (message.type === 'UNIFIED_LOGIN') {
    handleUnifiedLogin()
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'CHECK_SESSION') {
    checkSessionStatus()
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'LOGOUT') {
    handleLogout()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-page') {
    try {
      // Check if user is logged in before saving
      const storage = await chrome.storage.local.get(['linkedin_access_token']);
      if (!storage.linkedin_access_token) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Login Required',
          message: 'Please login with LinkedIn first to save pages.'
        });
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url && tab.title) {
        const pageData: SavedPage = {
          url: tab.url,
          title: tab.title,
          timestamp: Date.now(),
          description: `Saved via keyboard shortcut (${command}) from ${new URL(tab.url).hostname}`
        };
        
        await savePage(pageData);
        
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Page Saved!',
          message: `"${tab.title}" has been saved successfully.`
        });
      }
    } catch (error) {
      console.error('Error saving page via shortcut:', error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Save Failed',
        message: 'Failed to save the current page.'
      });
    }
  }
});

// Listen for bookmark changes to trigger sync
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  console.log('Bookmark created:', bookmark);
  try {
    // Check if user is logged in
    const storage = await chrome.storage.local.get(['linkedin_access_token']);
    if (storage.linkedin_access_token) {
      console.log('User is logged in, syncing new bookmark...');
      await syncExistingBookmarks();
    }
  } catch (error) {
    console.error('Error syncing bookmark on creation:', error);
  }
});

// Periodic sync every 1 hour
let syncInterval: NodeJS.Timeout | null = null;

function startPeriodicSync() {
  // Clear existing interval if any
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  
  // Set up 1-hour interval (3600000 ms)
  syncInterval = setInterval(async () => {
    try {
      // Check if user is logged in
      const storage = await chrome.storage.local.get(['linkedin_access_token']);
      if (storage.linkedin_access_token) {
        console.log('Periodic sync triggered...');
        await syncExistingBookmarks();
      }
    } catch (error) {
      console.error('Error in periodic sync:', error);
    }
  }, 3600000); // 1 hour = 3600000 milliseconds
  
  console.log('Periodic sync started (every 1 hour)');
}

function stopPeriodicSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('Periodic sync stopped');
  }
}

// Start periodic sync when extension loads
startPeriodicSync();

// Listen for storage changes to manage periodic sync
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // Check if access token was added (user logged in)
    if (changes.linkedin_access_token && changes.linkedin_access_token.newValue) {
      console.log('User logged in, starting periodic sync...');
      startPeriodicSync();
    }
    // Check if access token was removed (user logged out)
    else if (changes.linkedin_access_token && !changes.linkedin_access_token.newValue) {
      console.log('User logged out, stopping periodic sync...');
      stopPeriodicSync();
    }
  }
});

async function handleLinkedInLogin() {
  // Generate state fresh each time for CSRF protection
  const state = Math.random().toString(36).substring(2);
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=${responseType}&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
  
  console.log('Starting LinkedIn OAuth flow from background script...');
  console.log('Auth URL:', authUrl);
  console.log('Generated state:', state);
  
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) {
        console.error('OAuth error:', chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError?.message || 'No response URL received'));
        return;
      }

      console.log('Response URL:', responseUrl);
      
      try {
        const url = new URL(responseUrl);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');
        const returnedState = url.searchParams.get('state');
        
        if (error) {
          console.error('OAuth error:', error);
          console.error('Error description:', errorDescription);
          reject(new Error(`OAuth error: ${error} - ${errorDescription}`));
          return;
        }
        
        // Verify state parameter for CSRF protection
        if (returnedState !== state) {
          console.error('State mismatch - possible CSRF attack');
          reject(new Error('State mismatch - possible CSRF attack'));
          return;
        }
        
        if (code) {
          console.log('Authorization code received:', code);
          console.log('State verified:', returnedState);
          
          // Exchange authorization code for access token
          exchangeCodeForToken(code, redirectUri)
            .then(async tokenData => {
              console.log('Token exchange successful:', tokenData);
              
              // Sync existing bookmarks after successful login
              try {
                await syncExistingBookmarks();
                console.log('Bookmark sync completed');
              } catch (syncError) {
                console.error('Bookmark sync failed:', syncError);
                // Don't fail the login if bookmark sync fails
              }
              
              resolve({ code, state: returnedState, token: tokenData });
            })
            .catch(tokenError => {
              console.error('Token exchange failed:', tokenError);
              reject(tokenError);
            });
        } else {
          console.error('No authorization code found in response');
          reject(new Error('No authorization code found in response'));
        }
      } catch (urlError) {
        console.error('Error parsing response URL:', urlError);
        reject(new Error('Error parsing response URL'));
      }
    });
  });
}

async function exchangeCodeForToken(code: string, redirectUri: string) {
  try {
    console.log('Exchanging authorization code for access token...');
    
    const response = await fetch(`${API_ENDPOINT}/linkedin/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        code, 
        redirectUri,
        clientId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    const tokenData = await response.json();
    
    // Store the access token in chrome storage
    await chrome.storage.local.set({ 
      linkedin_access_token: tokenData.access_token,
      linkedin_expires_in: tokenData.expires_in,
      linkedin_token_timestamp: Date.now()
    });
    
    console.log('Access token stored successfully');
    return tokenData;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
}

async function savePage(pageData: SavedPage) {
  try {
    // Get the stored access token
    const storage = await chrome.storage.local.get(['linkedin_access_token']);
    const accessToken = storage.linkedin_access_token;
    
    if (!accessToken) {
      throw new Error('No access token found. Please login first.');
    }

    console.log('Saving page with token authentication...');
    
    const response = await fetch(`${API_ENDPOINT}/pages/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        pageData: pageData
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save page');
    }

    // Store in local storage as backup
    const savedPages = await chrome.storage.local.get(['savedPages']);
    const pages = savedPages.savedPages || [];
    pages.push(pageData);
    await chrome.storage.local.set({ savedPages: pages });

    const result = await response.json();
    console.log('Page saved successfully:', result);
    return result;
  } catch (error) {
    console.error('Error saving page:', error);
    throw error;
  }
} 

/**
 * Handle unified login - check existing session first, then login if needed
 */
async function handleUnifiedLogin(): Promise<any> {
  try {
    console.log('Starting unified login process...');
    
    // First, check if there's already a valid session
    const sessionStatus = await checkSessionStatus();
    
    if (sessionStatus.authenticated) {
      console.log('Found existing session, user is already logged in');
      
      // Store the session info locally for extension use
      await chrome.storage.local.set({
        linkedin_access_token: 'session_based', // Placeholder since we're using session
        linkedin_expires_in: 86400, // 24 hours
        linkedin_token_timestamp: Date.now(),
        user_info: sessionStatus.user
      });
      
      // Trigger bookmark sync for existing session
      try {
        console.log('Triggering bookmark sync for existing session...');
        await syncExistingBookmarks();
      } catch (error) {
        console.error('Error syncing bookmarks for existing session:', error);
      }
      
      return {
        type: 'existing_session',
        user: sessionStatus.user,
        message: 'Already logged in via dashboard session'
      };
    } else {
      console.log('No existing session found, proceeding with LinkedIn OAuth');
      
      // No existing session, proceed with normal LinkedIn login
      const loginResult = await handleLinkedInLogin() as any;
      
      // Trigger bookmark sync for new login
      try {
        console.log('Triggering bookmark sync for new login...');
        await syncExistingBookmarks();
      } catch (error) {
        console.error('Error syncing bookmarks for new login:', error);
      }
      
      return {
        type: 'new_login',
        code: loginResult.code,
        state: loginResult.state,
        token: loginResult.token,
        message: 'Successfully logged in via LinkedIn OAuth'
      };
    }
  } catch (error) {
    console.error('Error in unified login:', error);
    throw error;
  }
}


/**
 * Check session status from backend
 */
async function checkSessionStatus(): Promise<any> {
  try {
    const response = await fetch(`${API_ENDPOINT}/session/validate`, {
      method: 'GET',
      credentials: 'include' // Important: include cookies for session
    });
    
    if (response.ok) {
      const result = await response.json();
      return result;
    } else {
      throw new Error('Failed to check session status');
    }
  } catch (error) {
    console.error('Error checking session status:', error);
    throw error;
  }
}

/**
 * Handle logout from both extension and dashboard
 */
async function handleLogout(): Promise<void> {
  try {
    // Stop periodic sync
    stopPeriodicSync();
    
    // Clear local storage
    await chrome.storage.local.remove(['linkedin_access_token', 'linkedin_expires_in', 'linkedin_token_timestamp']);
    
    // Logout from backend (this will clear the session)
    const response = await fetch(`${API_ENDPOINT}/logout`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      console.log('Successfully logged out from both extension and dashboard');
    } else {
      console.warn('Failed to logout from backend, but local storage cleared');
    }
  } catch (error) {
    console.error('Error during logout:', error);
    // Still clear local storage even if backend logout fails
    await chrome.storage.local.remove(['linkedin_access_token', 'linkedin_expires_in', 'linkedin_token_timestamp']);
    throw error;
  }
}

/**
 * Sync existing bookmarks to the backend
 */
async function syncExistingBookmarks(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if chrome.bookmarks API is available
    if (!chrome.bookmarks) {
      console.error('Chrome bookmarks API is not available. Make sure the extension has bookmarks permission.');
      reject(new Error('Chrome bookmarks API is not available'));
      return;
    }

    console.log('Starting bookmark sync...');
    
    chrome.bookmarks.getTree(async function(bookmarkTreeNodes) {
      try {
        let allBookmarks: any[] = [];
        
        function traverse(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
          for (let node of nodes) {
            if (node.url) {
              allBookmarks.push({
                url: node.url,
                title: node.title,
                dateAdded: node.dateAdded || Date.now(),
                description: `Imported from browser bookmarks`
              });
            }
            if (node.children) {
              traverse(node.children);
            }
          }
        }
        
        traverse(bookmarkTreeNodes);
        if (allBookmarks.length > 0) {
          console.log(`Syncing ${allBookmarks.length} bookmarks to backend...`);
          
          // Get the stored access token
          const storage = await chrome.storage.local.get(['linkedin_access_token']);
          const accessToken = storage.linkedin_access_token;
          
          if (!accessToken) {
            throw new Error('No access token found for bookmark sync');
          }
          
          const response = await fetch(`${API_ENDPOINT}/pages/bookmarks/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ 
              bookmarks: allBookmarks
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('Bookmark sync result:', result);
            resolve();
          } else {
            throw new Error(`Failed to sync bookmarks: ${response.status}`);
          }
        } else {
          console.log('No bookmarks found to sync');
          resolve();
        }
      } catch (error) {
        console.error('Error syncing bookmarks:', error);
        reject(error);
      }
    });
  });
}