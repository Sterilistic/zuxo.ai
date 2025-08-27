// Create a floating save button
function createFloatingSaveButton() {
  // Check if button already exists
  if (document.getElementById('page-saver-floating-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'page-saver-floating-btn';
  button.innerHTML = `
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
    </svg>
  `;
  button.title = 'Save this page (Ctrl+Shift+S)';
  
  // Add styles
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    font-size: 16px;
  `;

  // Add hover effects
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
  });

  // Add click handler
  button.addEventListener('click', async () => {
    try {
      const pageData = {
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
        description: `Saved from ${window.location.hostname}`
      };

      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_PAGE',
        data: pageData
      });

      if (response.success) {
        // Show success animation
        button.innerHTML = `
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        `;
        button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        button.title = 'Page saved!';
        
        setTimeout(() => {
          button.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
          button.title = 'Save this page (Ctrl+Shift+S)';
        }, 2000);
      } else {
        throw new Error(response.error || 'Failed to save page');
      }
    } catch (error) {
      console.error('Error saving page:', error);
      // Show error animation
      button.innerHTML = `
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      `;
      button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      button.title = 'Save failed!';
      
      setTimeout(() => {
        button.innerHTML = `
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        `;
        button.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        button.title = 'Save this page (Ctrl+Shift+S)';
      }, 2000);
    }
  });

  // Add to page
  document.body.appendChild(button);
}

// Check if user is logged in and show floating button
async function checkLoginAndShowButton() {
  try {
    const result = await chrome.storage.local.get(['linkedin_access_token']);
    if (result.linkedin_access_token) {
      createFloatingSaveButton();
    }
  } catch (error) {
    console.error('Error checking login status:', error);
  }
}

// Initialize the floating save button if logged in
checkLoginAndShowButton();

// Listen for storage changes to show/hide button based on login status
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.linkedin_access_token) {
    const button = document.getElementById('page-saver-floating-btn');
    if (changes.linkedin_access_token.newValue) {
      // User logged in, show button
      if (!button) {
        createFloatingSaveButton();
      }
    } else {
      // User logged out, hide button
      if (button) {
        button.remove();
      }
    }
  }
});

// Re-create button if page content changes (for SPAs)
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' && !document.getElementById('page-saver-floating-btn')) {
      checkLoginAndShowButton();
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
}); 