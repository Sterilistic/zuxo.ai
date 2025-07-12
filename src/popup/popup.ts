const loginButton = document.getElementById('login_with_linkedin');

function showLogin() {
  document.getElementById('login_container')!.classList.remove('hidden');
  document.getElementById('loggedin_container')!.classList.add('hidden');
}

function showLoggedIn(profile: { name: string, email?: string, picture?: string }) {
  document.getElementById('login_container')!.classList.add('hidden');
  document.getElementById('loggedin_container')!.classList.remove('hidden');
  (document.getElementById('profile_name') as HTMLElement).textContent = profile.name;
  if (profile.email) {
    (document.getElementById('profile_email') as HTMLElement).textContent = profile.email;
  }
  if (profile.picture) {
    const img = document.getElementById('profile_picture') as HTMLImageElement;
    img.src = profile.picture;
    img.style.display = '';
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

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['linkedin_access_token'], async (result) => {
    const token = result.linkedin_access_token;
    if (token) {
      try {
        const profile = await fetchLinkedInProfile(token);
        showLoggedIn(profile);
      } catch (e) {
        showLogin();
      }
    } else {
      showLogin();
    }
  });

  // Login button logic (existing)
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

  // Dashboard button logic
  const dashboardBtn = document.getElementById('dashboard_btn');
  dashboardBtn?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://zuxo.ai/dashboard' });
  });
});