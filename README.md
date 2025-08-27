# Page Saver Chrome Extension

A Chrome extension that allows you to save web pages with keyboard shortcuts and a floating button. Users must authenticate with LinkedIn to access the page saving features.

## Features

- **LinkedIn Authentication**: Secure login with LinkedIn OAuth
- **Keyboard Shortcut**: Press `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac) to save the current page instantly
- **Floating Button**: A floating save button appears on every webpage when logged in
- **Popup Interface**: Click the extension icon to see recent saves and save the current page
- **Local Storage**: Pages are stored locally as backup even if the backend is unavailable
- **Notifications**: Get notified when pages are saved successfully

## Installation

### Prerequisites

- Node.js (v16 or higher)
- pnpm (recommended) or npm
- MongoDB database
- LinkedIn Developer Account

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd page-saver-extension
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   cd backend && pnpm install && cd ..
   ```

3. **LinkedIn OAuth Setup**
   - Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
   - Create a new app
   - Add OAuth 2.0 redirect URL: `https://<your-extension-id>.chromiumapp.org/`
   - Note down your Client ID and Client Secret

4. **Environment Setup**
   Create a `.env` file in the backend directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   PORT=3000
   LINKEDIN_CLIENT_ID=your_linkedin_client_id
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
   LINKEDIN_AUTH_SCOPE=r_liteprofile%20r_emailaddress
   LINKEDIN_RESPONSE_TYPE=code
   ```

5. **Build the extension**
   ```bash
   pnpm run build
   ```

6. **Start the backend**
   ```bash
   cd backend
   pnpm run dev
   ```

7. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## Usage

### Authentication

1. **Login**: Click the extension icon and press "Login with LinkedIn"
2. **Authorize**: Complete the LinkedIn OAuth flow
3. **Access Features**: Once logged in, you can use all page saving features

### Saving Pages

1. **Keyboard Shortcut**: Press `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac) while on any webpage
2. **Floating Button**: Click the floating blue button in the bottom-right corner of any webpage (only visible when logged in)
3. **Popup**: Click the extension icon and press "Save Current Page"

### Viewing Saved Pages

- Click the extension icon to see your 5 most recent saves
- Click "View All Saves" to open the dashboard (requires backend to be running)

## API Endpoints

The backend provides the following endpoints:

- `POST /api/pages` - Save a new page
- `GET /api/pages` - Get all saved pages
- `DELETE /api/pages/:id` - Delete a saved page
- `POST /api/linkedin/token` - LinkedIn OAuth token exchange
- `GET /api/health` - Health check

## Development

### Building

```bash
# Build the extension
pnpm run build

# Watch for changes
pnpm run watch

# Build Tailwind CSS for popup
pnpm run build:tailwind:popup
```

### Backend Development

```bash
cd backend
pnpm run dev  # Start development server with hot reload
```

## Project Structure

```
├── src/
│   ├── background.ts      # Background script (OAuth, keyboard shortcuts, notifications)
│   ├── content.ts         # Content script (floating button)
│   ├── popup/             # Extension popup interface
│   └── content.css        # Styles for content script
├── backend/
│   └── src/
│       └── server.ts      # Express API server with OAuth
├── manifest.json          # Chrome extension manifest
└── webpack.config.js      # Build configuration
```

## Security Features

- LinkedIn OAuth 2.0 authentication
- CSRF protection with state parameter
- Secure token storage in Chrome storage
- HTTPS-only API communication

## Future Features

- Page categorization and tagging
- Search functionality
- Export/import saved pages
- Cloud sync across devices
- Page content scraping for better organization

## License

MIT License
