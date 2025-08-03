# Troubleshooting Guide

This guide helps you resolve common issues with the Reddit Media Saver app.

## Common Issues

### 1. Blank Page on App Load

**Symptoms**: App loads but shows a completely blank page

**Causes & Solutions**:

#### Missing Reddit API Credentials
- **Cause**: Reddit API credentials not configured
- **Solution**: 
  1. Create a `.env` file in the project root
  2. Add your Reddit API credentials:
     ```
     REDDIT_CLIENT_ID=your_client_id_here
     REDDIT_CLIENT_SECRET=your_client_secret_here
     ```
  3. Restart the development server

#### CSS/Layout Issues
- **Cause**: CSS conflicts or layout problems
- **Solution**: 
  1. Clear browser cache
  2. Check browser console for CSS errors
  3. Ensure all CSS files are loading properly

#### JavaScript Errors
- **Cause**: Runtime errors preventing app initialization
- **Solution**:
  1. Open browser developer tools (F12)
  2. Check Console tab for error messages
  3. Check Network tab for failed resource loads

### 2. Authentication Issues

**Symptoms**: Cannot log in to Reddit, authentication fails

**Causes & Solutions**:

#### Incorrect Reddit App Configuration
- **Cause**: Reddit app not configured correctly
- **Solution**:
  1. Go to [Reddit App Preferences](https://www.reddit.com/prefs/apps)
  2. Ensure app type is set to "web app"
  3. Verify redirect URI is exactly: `http://localhost:3000/auth/callback`
  4. Check that client ID and secret are correct

#### Network/Port Issues
- **Cause**: Development server not running on expected port
- **Solution**:
  1. Check terminal for actual port number (may be 5174, 5175, etc.)
  2. Update redirect URI in Reddit app to match actual port
  3. Ensure no firewall blocking localhost connections

#### Browser Security Issues
- **Cause**: Browser blocking popups or redirects
- **Solution**:
  1. Allow popups for localhost
  2. Disable ad blockers for localhost
  3. Try incognito/private browsing mode

### 3. Development Server Issues

**Symptoms**: `npm run dev` fails or server won't start

**Causes & Solutions**:

#### Port Already in Use
- **Cause**: Another process using port 5173
- **Solution**:
  1. Check what's using the port: `lsof -i :5173`
  2. Kill the process or let Vite use a different port
  3. Update redirect URI in Reddit app if port changes

#### Missing Dependencies
- **Cause**: Node modules not installed or corrupted
- **Solution**:
  1. Delete `node_modules` folder
  2. Delete `package-lock.json`
  3. Run `npm install`
  4. Restart development server

#### TypeScript Errors
- **Cause**: Type errors preventing compilation
- **Solution**:
  1. Run `npm run type-check` to see errors
  2. Fix TypeScript errors in code
  3. Ensure all imports are correct

### 4. Build Issues

**Symptoms**: `npm run build` fails

**Causes & Solutions**:

#### TypeScript Compilation Errors
- **Cause**: Type errors in production build
- **Solution**:
  1. Run `npm run type-check` to identify errors
  2. Fix all TypeScript errors
  3. Ensure all dependencies are properly typed

#### Missing Environment Variables
- **Cause**: Required environment variables not set
- **Solution**:
  1. Create `.env` file with required variables
  2. Ensure variables are properly formatted
  3. Restart build process

### 5. Database Issues

**Symptoms**: Database errors, content not saving

**Causes & Solutions**:

#### SQLite Database Locked
- **Cause**: Multiple processes accessing database
- **Solution**:
  1. Close all instances of the app
  2. Delete database file and restart
  3. Check for file permissions

#### Database Schema Issues
- **Cause**: Database schema out of sync
- **Solution**:
  1. Delete database file
  2. Restart app to recreate schema
  3. Re-import content if needed

### 6. Download Issues

**Symptoms**: Downloads fail or are incomplete

**Causes & Solutions**:

#### Network Issues
- **Cause**: Poor internet connection or Reddit API limits
- **Solution**:
  1. Check internet connection
  2. Wait for rate limit to reset
  3. Try downloading smaller batches

#### File System Issues
- **Cause**: Insufficient disk space or permissions
- **Solution**:
  1. Check available disk space
  2. Verify write permissions to download directory
  3. Try different download location

#### Media Format Issues
- **Cause**: Unsupported media format
- **Solution**:
  1. Check if media type is supported
  2. Update media handling code if needed
  3. Report unsupported formats

## Debugging Tools

### Browser Developer Tools
1. Open developer tools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Check Application tab for storage issues

### Debug Panel
- In development mode, click the 🐛 button in the top-right corner
- View detailed app state and logs
- Monitor authentication status
- Check service initialization

### Logging
- Check browser console for detailed logs
- In Electron mode, check main process logs
- Use `console.log()` for temporary debugging

## Environment Setup Checklist

Before running the app, ensure:

- [ ] Node.js 18+ installed
- [ ] All dependencies installed (`npm install`)
- [ ] Reddit API credentials configured
- [ ] `.env` file created with correct values
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Development server starts without errors
- [ ] Browser can access localhost

## Getting Help

If you're still experiencing issues:

1. **Check the logs**: Look for error messages in browser console
2. **Search existing issues**: Check if the problem has been reported
3. **Create a detailed report**: Include:
   - Error messages
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)
   - Screenshots if applicable

## Common Error Messages

### "Reddit API Credentials Required"
- **Solution**: Set up Reddit API credentials in `.env` file

### "Failed to initialize database"
- **Solution**: Check file permissions and disk space

### "Authentication failed"
- **Solution**: Verify Reddit app configuration and credentials

### "Port already in use"
- **Solution**: Kill existing process or use different port

### "Module not found"
- **Solution**: Run `npm install` to install dependencies 