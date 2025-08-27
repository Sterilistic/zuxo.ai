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
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-page') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url && tab.title) {
        const pageData: SavedPage = {
          url: tab.url,
          title: tab.title,
          timestamp: Date.now(),
          description: `Saved via keyboard shortcut from ${new URL(tab.url).hostname}`
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
            .then(tokenData => {
              console.log('Token exchange successful:', tokenData);
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
    const response = await fetch(`${API_ENDPOINT}/pages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pageData)
    });

    if (!response.ok) {
      throw new Error('Failed to save page');
    }

    // Store in local storage as backup
    const savedPages = await chrome.storage.local.get(['savedPages']);
    const pages = savedPages.savedPages || [];
    pages.push(pageData);
    await chrome.storage.local.set({ savedPages: pages });

    return await response.json();
  } catch (error) {
    console.error('Error saving page:', error);
    throw error;
  }
} 