# Setup Guide

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Get Reddit API Credentials
1. Go to [Reddit App Preferences](https://www.reddit.com/prefs/apps)
2. Click "Create App"
3. Fill in:
   - Name: "Reddit Media Saver"
   - App type: "web app"
   - Description: "Personal media saver"
   - Redirect URI: `http://localhost:3000/auth/callback`
4. Copy client ID and secret

### 3. Create Environment File
Create `.env` in project root:
```
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
```

### 4. Start Development Server
```bash
npm run dev
```

## Troubleshooting

### Blank Page
- Check Reddit API credentials in `.env`
- Restart development server
- Check browser console for errors

### Authentication Issues
- Verify redirect URI matches exactly
- Check app type is "web app"
- Ensure credentials are correct

### Build Errors
- Run `npm run type-check`
- Check for missing dependencies
- Clear node_modules and reinstall

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run type-check` - Check TypeScript
- `npm run lint` - Run ESLint 