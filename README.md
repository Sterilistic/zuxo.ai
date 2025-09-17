# Page Saver Chrome Extension

A Chrome extension with a web dashboard that allows you to save web pages with keyboard shortcuts and a floating button. Users must authenticate with LinkedIn to access the page saving features.

## Features

### Chrome Extension
- **LinkedIn Authentication**: Secure login with LinkedIn OAuth
- **Keyboard Shortcut**: Press `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac) to save the current page instantly
- **Floating Button**: A floating save button appears on every webpage when logged in
- **Popup Interface**: Click the extension icon to see recent saves and save the current page
- **Local Storage**: Pages are stored locally as backup even if the backend is unavailable
- **Notifications**: Get notified when pages are saved successfully

### Web Dashboard
- **Modern UI**: Beautiful, responsive dashboard with real-time statistics
- **Page Management**: View, search, filter, and delete saved pages
- **User Authentication**: Secure LinkedIn OAuth login for web access
- **Export Functionality**: Download your saved pages as JSON
- **Pagination**: Efficient browsing through large collections of saved pages
- **Domain Filtering**: Filter pages by website domain
- **Page Statistics**: View total pages, weekly saves, and unique domains

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
   - Add OAuth 2.0 redirect URLs:
     - For Extension: `https://<your-extension-id>.chromiumapp.org/`
     - For Dashboard: `http://localhost:3000/auth/linkedin/callback`
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
   SESSION_SECRET=your-super-secret-session-key-change-this-in-production
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

### Chrome Extension

#### Authentication
1. **Login**: Click the extension icon and press "Login with LinkedIn"
2. **Authorize**: Complete the LinkedIn OAuth flow
3. **Access Features**: Once logged in, you can use all page saving features

#### Saving Pages
1. **Keyboard Shortcut**: Press `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac) while on any webpage
2. **Floating Button**: Click the floating blue button in the bottom-right corner of any webpage (only visible when logged in)
3. **Popup**: Click the extension icon and press "Save Current Page"

#### Viewing Saved Pages
- Click the extension icon to see your 5 most recent saves
- Click "View All Saves" to open the web dashboard

### Web Dashboard

#### Accessing the Dashboard
1. **Start the backend server**: `cd backend && pnpm run dev`
2. **Open your browser**: Navigate to `http://localhost:3000/dashboard`
3. **Login**: Click "Continue with LinkedIn" to authenticate
4. **Manage your pages**: View, search, filter, and delete your saved pages

#### Dashboard Features
- **Statistics**: View total pages, weekly saves, and unique domains
- **Search**: Find pages by title, URL, or description
- **Filter**: Filter pages by domain
- **Export**: Download your saved pages as JSON
- **Pagination**: Navigate through large collections efficiently
- **Delete**: Remove unwanted pages with confirmation

## API Endpoints

The backend provides the following endpoints:

### Page Management (Protected)
- `POST /api/pages` - Save a new page
- `GET /api/pages` - Get all saved pages (with pagination: `?limit=50&skip=0`)
- `GET /api/pages/stats` - Get page statistics (total, weekly, unique domains)
- `DELETE /api/pages/:id` - Delete a saved page

### Authentication
- `GET /auth/linkedin` - Initiate LinkedIn OAuth flow
- `GET /auth/linkedin/callback` - LinkedIn OAuth callback
- `GET /logout` - Logout and destroy session
- `POST /api/linkedin/token` - LinkedIn OAuth token exchange (for extension)

### User & System
- `GET /api/user` - Get current user information
- `GET /api/health` - Health check

### Web Routes
- `GET /login` - Login page
- `GET /dashboard` - Dashboard (protected)

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
pnpm run build  # Build TypeScript to JavaScript
pnpm run start  # Start production server
```

## Project Structure

```
├── src/                          # Chrome Extension
│   ├── background.ts             # Background script (OAuth, keyboard shortcuts, notifications)
│   ├── content.ts                # Content script (floating button)
│   ├── popup/                    # Extension popup interface
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   └── content.css               # Styles for content script
├── backend/                      # Web Dashboard & API
│   ├── src/
│   │   ├── server.ts             # Clean, organized main server file
│   │   ├── config/               # Configuration management
│   │   │   ├── index.ts          # Centralized configuration
│   │   │   └── database.ts       # Database connection & utilities
│   │   ├── middleware/           # Express middleware
│   │   │   ├── auth.ts           # Authentication middleware
│   │   │   ├── errorHandler.ts   # Error handling & custom errors
│   │   │   └── logger.ts         # Request logging
│   │   ├── routes/               # API routes
│   │   │   ├── auth.ts           # Authentication routes
│   │   │   ├── pages.ts          # Page management routes
│   │   │   └── web.ts            # Web routes (login, dashboard)
│   │   ├── services/             # Business logic layer
│   │   │   ├── linkedinService.ts # LinkedIn OAuth service
│   │   │   └── pageService.ts    # Page management service
│   │   ├── views/                # HTML templates
│   │   │   ├── login.html
│   │   │   └── dashboard.html
│   │   ├── public/               # Static assets
│   │   │   ├── css/
│   │   │   │   ├── login.css
│   │   │   │   └── dashboard.css
│   │   │   └── js/
│   │   │       └── dashboard.ts  # Dashboard TypeScript
│   │   └── types/
│   │       └── index.ts          # TypeScript type definitions
│   ├── package.json
│   └── tsconfig.json
├── manifest.json                 # Chrome extension manifest
└── webpack.config.js             # Build configuration
```

## Architecture Highlights

### Clean Code Organization
- **Separation of Concerns**: Routes, services, middleware, and configuration are properly separated
- **Service Layer**: Business logic is abstracted into dedicated service classes
- **Middleware Pattern**: Reusable authentication, error handling, and logging middleware
- **Configuration Management**: Centralized, type-safe configuration with environment validation

### Error Handling
- **Custom Error Classes**: `AppError` for application-specific errors
- **Global Error Handler**: Catches all unhandled errors with proper HTTP responses
- **Async Error Wrapper**: `asyncHandler` for clean async route handling
- **404 Handler**: Proper handling of undefined routes

### TypeScript Best Practices
- **Type Safety**: Full TypeScript coverage with proper interfaces
- **Module Organization**: Clean imports and exports
- **Error Handling**: Type-safe error handling throughout the application
- **Database Types**: Proper typing for MongoDB operations

## Security Features

- **LinkedIn OAuth 2.0**: Secure authentication for both extension and web dashboard
- **Session Management**: Express sessions with secure cookies
- **CSRF Protection**: State parameter validation for OAuth flows
- **Protected Routes**: Authentication middleware for API endpoints
- **Secure Storage**: Tokens stored securely in Chrome storage and server sessions
- **Input Validation**: Proper sanitization and validation of user inputs
- **Error Handling**: Secure error responses without sensitive information leakage

## Technologies Used

### Frontend (Extension)
- **TypeScript**: Type-safe JavaScript development
- **Chrome Extension API**: Browser extension functionality
- **Tailwind CSS**: Utility-first CSS framework
- **Webpack**: Module bundler and build tool

### Backend (Dashboard & API)
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **TypeScript**: Type-safe server development
- **MongoDB**: NoSQL database for data persistence
- **Express Session**: Session management
- **LinkedIn OAuth 2.0**: Authentication provider
- **Clean Architecture**: Modular, maintainable code structure

## Development Best Practices

### Code Organization
- **Modular Design**: Each feature has its own module
- **Service Pattern**: Business logic separated from HTTP handling
- **Middleware Chain**: Reusable middleware for common functionality
- **Configuration Management**: Environment-based configuration

### Error Handling
- **Graceful Degradation**: Proper error handling at all levels
- **Logging**: Comprehensive request and error logging
- **Type Safety**: TypeScript error handling with custom error classes
- **User Experience**: User-friendly error messages

### Performance
- **Database Optimization**: Efficient queries with pagination
- **Caching**: Session-based caching for user data
- **Async Operations**: Non-blocking async/await patterns
- **Resource Management**: Proper database connection handling

## Future Features

- **Advanced Search**: Full-text search with filters
- **Page Categorization**: Automatic tagging and organization
- **Content Scraping**: Extract and store page content
- **Cloud Sync**: Cross-device synchronization
- **Analytics**: Usage statistics and insights
- **Bulk Operations**: Mass import/export functionality
- **API Rate Limiting**: Enhanced security and performance
- **Unit Testing**: Comprehensive test coverage
- **API Documentation**: Swagger/OpenAPI documentation
- **Monitoring**: Health checks and metrics

## License

MIT License