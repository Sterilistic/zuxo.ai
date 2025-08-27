interface SavedPage {
  url: string;
  title: string;
  timestamp: number;
  description?: string;
}

function showLogin() {
  document.getElementById('login_container')!.classList.remove('hidden');
  document.getElementById('loggedin_container')!.classList.add('hidden');
}

function showLoggedIn(profile: { name: string, email?: string, picture?: string }) {
  document.getElementById('login_container')!.classList.add('hidden');
  document.getElementById('loggedin_container')!.classList.remove('hidden');

  (document.getElementById('profile_name') as HTMLElement).textContent = profile.name;
  (document.getElementById('profile_email') as HTMLElement).textContent = profile.email ?? '';

  if (profile.picture) {
    const img = document.getElementById('profile_picture') as HTMLImageElement;
    img.src = profile.picture;
    img.onload = () => img.classList.remove('hidden');
  }
}

function fetchLinkedInProfile(token: string): Promise<{ name: string, email?: string, picture?: string }> {
  return fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(data => ({
      name: data.name || (data.localizedFirstName + ' ' + data.localizedLastName),
      email: data.email,
      picture: data.picture || data.profilePicture?.displayImage || undefined
    }));
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

async function loadRecentSaves() {
  try {
    const result = await chrome.storage.local.get(['savedPages']);
    const pages: SavedPage[] = result.savedPages || [];
    
    const recentSavesContainer = document.getElementById('recent_saves');
    if (!recentSavesContainer) return;

    if (pages.length === 0) {
      recentSavesContainer.innerHTML = '<p class="text-gray-500 text-sm">No recent saves</p>';
      return;
    }

    // Get the 5 most recent saves
    const recentPages = pages.slice(-5).reverse();
    
    recentSavesContainer.innerHTML = recentPages.map(page => `
      <div class="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer" onclick="window.open('${page.url}', '_blank')">
        <div class="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate" title="${page.title}">
            ${truncateText(page.title, 40)}
          </p>
          <p class="text-xs text-gray-500">${formatTimeAgo(page.timestamp)}</p>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading recent saves:', error);
  }
}

async function saveCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url || !tab.title) {
      throw new Error('No active tab found');
    }

    const pageData: SavedPage = {
      url: tab.url,
      title: tab.title,
      timestamp: Date.now(),
      description: `Saved from ${new URL(tab.url).hostname}`
    };

    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_PAGE',
      data: pageData
    });

    if (response.success) {
      // Show success feedback
      const saveBtn = document.getElementById('save_page_btn') as HTMLButtonElement;
      const originalText = saveBtn.innerHTML;
      saveBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        Saved!
      `;
      saveBtn.classList.add('bg-green-500', 'from-green-500', 'to-green-600');
      saveBtn.classList.remove('from-blue-500', 'to-indigo-600');

      setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.classList.remove('bg-green-500', 'from-green-500', 'to-green-600');
        saveBtn.classList.add('from-blue-500', 'to-indigo-600');
      }, 2000);

      // Reload recent saves
      await loadRecentSaves();
    } else {
      throw new Error(response.error || 'Failed to save page');
    }
  } catch (error) {
    console.error('Error saving page:', error);
    // Show error feedback
    const saveBtn = document.getElementById('save_page_btn') as HTMLButtonElement;
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
      Error!
    `;
    saveBtn.classList.add('bg-red-500', 'from-red-500', 'to-red-600');
    saveBtn.classList.remove('from-blue-500', 'to-indigo-600');

    setTimeout(() => {
      saveBtn.innerHTML = originalText;
      saveBtn.classList.remove('bg-red-500', 'from-red-500', 'to-red-600');
      saveBtn.classList.add('from-blue-500', 'to-indigo-600');
    }, 2000);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  chrome.storage.local.get(['linkedin_access_token'], async (result) => {
    const token = result.linkedin_access_token;
    if (token) {
      try {
        const profile = await fetchLinkedInProfile(token);
        showLoggedIn(profile);
        // Load recent saves for logged-in users
        await loadRecentSaves();
      } catch (e) {
        showLogin();
      }
    } else {
      showLogin();
    }
  });

  // Login button logic
  const loginButton = document.getElementById('login_with_linkedin');
  loginButton?.addEventListener('click', () => {
    console.log('Login button clicked, sending message to background script...');
    
    chrome.runtime.sendMessage({ type: 'LINKEDIN_LOGIN' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error sending message to background:', chrome.runtime.lastError);
            return;
        }
        
        if (response.success) {
            console.log('LinkedIn login successful:', response.data);
            // After login, reload to show logged-in state
            window.location.reload();
        } else {
            console.error('LinkedIn login failed:', response.error);
            // Handle login error here
        }
    });
  });

  // Logout button logic
  const logoutBtn = document.getElementById('logout_btn');
  logoutBtn?.addEventListener('click', () => {
    chrome.storage.local.remove(['linkedin_access_token', 'linkedin_expires_in', 'linkedin_token_timestamp'], () => {
      window.location.reload();
    });
  });

  // Save page button (only available when logged in)
  const savePageBtn = document.getElementById('save_page_btn');
  savePageBtn?.addEventListener('click', saveCurrentPage);

  // Dashboard button
  const dashboardBtn = document.getElementById('dashboard_btn');
  dashboardBtn?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
  });
});