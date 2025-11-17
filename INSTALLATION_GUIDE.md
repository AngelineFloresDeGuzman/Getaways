# GETAWAYS PLATFORM - INSTALLATION & SETUP GUIDE

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Firebase Configuration](#firebase-configuration)
4. [EmailJS Configuration](#emailjs-configuration)
5. [PayPal Configuration](#paypal-configuration)
6. [Environment Variables](#environment-variables)
7. [Running the Application](#running-the-application)
8. [Building for Production](#building-for-production)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

### 1.1 Required Software
- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher (comes with Node.js)
- **Git**: For version control
- **Firebase CLI**: For deployment
- **Code Editor**: VS Code recommended

### 1.2 Required Accounts
- **Firebase Account**: [firebase.google.com](https://firebase.google.com)
- **EmailJS Account**: [emailjs.com](https://emailjs.com)
- **PayPal Developer Account**: [developer.paypal.com](https://developer.paypal.com)

### 1.3 System Requirements
- **Operating System**: Windows, macOS, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: At least 500MB free space
- **Internet Connection**: Required for dependencies and Firebase

---

## 2. Local Development Setup

### 2.1 Clone the Repository
```bash
git clone <repository-url>
cd getaways
```

### 2.2 Install Dependencies
```bash
npm install
```

This will install all required packages listed in `package.json`:
- React and React DOM
- React Router
- Firebase SDK
- Tailwind CSS
- And all other dependencies

### 2.3 Verify Installation
```bash
npm run dev
```

The application should start on `http://localhost:5173`

---

## 3. Firebase Configuration

### 3.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: "Getaways" (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

### 3.2 Enable Firebase Services

#### Authentication
1. Go to "Authentication" → "Get started"
2. Enable "Email/Password" provider
3. Enable "Google" provider
4. Add authorized domains:
   - `localhost` (for development)
   - Your production domain

#### Firestore Database
1. Go to "Firestore Database" → "Create database"
2. Start in "Production mode" (we'll add rules later)
3. Choose location (closest to your users)
4. Click "Enable"

#### Storage
1. Go to "Storage" → "Get started"
2. Start in "Production mode"
3. Use default security rules
4. Choose location (same as Firestore)
5. Click "Done"

#### Hosting
1. Go to "Hosting" → "Get started"
2. Follow setup instructions
3. Install Firebase CLI if not already installed:
   ```bash
   npm install -g firebase-tools
   ```
4. Login to Firebase:
   ```bash
   firebase login
   ```
5. Initialize hosting:
   ```bash
   firebase init hosting
   ```
   - Select existing project
   - Public directory: `dist`
   - Single-page app: Yes
   - Automatic builds: No

### 3.3 Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll to "Your apps"
3. Click web icon (`</>`)
4. Register app with nickname
5. Copy the configuration object

### 3.4 Configure Firebase in Project

Update `src/lib/firebase.js` with your configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

### 3.5 Set Up Firestore Security Rules

1. Go to Firestore Database → Rules
2. Update rules (see Technical Documentation for full rules)
3. Publish rules

### 3.6 Set Up Storage Security Rules

1. Go to Storage → Rules
2. Update rules (see Technical Documentation for full rules)
3. Publish rules

---

## 4. EmailJS Configuration

### 4.1 Create EmailJS Account

1. Go to [EmailJS](https://www.emailjs.com)
2. Sign up for free account
3. Verify email address

### 4.2 Create Email Service

#### Auth Service (for verification and password reset)
1. Go to "Email Services"
2. Click "Add New Service"
3. Choose email provider (Gmail recommended)
4. Connect your email account
5. Name it: "Auth Service"
6. Copy Service ID (e.g., `service_xxxxx`)

#### Booking Service (for booking emails)
1. Create another service
2. Name it: "Booking Service"
3. Copy Service ID

### 4.3 Create Email Templates

#### Verification Email Template
1. Go to "Email Templates"
2. Click "Create New Template"
3. Template ID: `template_qo9q8de` (or generate new)
4. Use these variables:
   - `{{to_email}}`
   - `{{to_name}}`
   - `{{verification_link}}`
   - `{{app_name}}`
   - `{{support_email}}`
   - `{{logo_url}}`
5. Save template

#### Password Reset Template
1. Create new template
2. Template ID: `template_btqnqws`
3. Use variables:
   - `{{to_email}}`
   - `{{to_name}}`
   - `{{reset_link}}`
   - `{{app_name}}`
   - `{{support_email}}`
   - `{{logo_url}}`
4. Save template

#### Booking Confirmation Template
1. Create new template
2. Template ID: `template_sl3wzej`
3. Use variables:
   - `{{to_email}}`
   - `{{to_name}}`
   - `{{booking_id}}`
   - `{{listing_title}}`
   - `{{check_in_date}}`
   - `{{check_out_date}}`
   - `{{total_price}}`
   - `{{app_name}}`
   - `{{support_email}}`
   - `{{logo_url}}`
4. Save template

#### Cancellation Template
1. Create new template
2. Template ID: `template_v7z3kcj`
3. Use variables (see Technical Documentation for full list)
4. Save template

### 4.4 Get Public Key

1. Go to "Account" → "General"
2. Copy "Public Key"
3. You'll have separate keys for each service

---

## 5. PayPal Configuration

### 5.1 Create PayPal Developer Account

1. Go to [PayPal Developer](https://developer.paypal.com)
2. Sign up or log in
3. Create a new app

### 5.2 Create PayPal App

1. Go to "My Apps & Credentials"
2. Click "Create App"
3. Enter app name: "Getaways"
4. Select environment:
   - **Sandbox**: For testing
   - **Live**: For production
5. Click "Create App"

### 5.3 Get Client ID

1. Copy "Client ID" from app details
2. For production, use Live Client ID
3. For development, use Sandbox Client ID

### 5.4 Configure PayPal in Project

Add Client ID to environment variables (see section 6)

---

## 6. Environment Variables

### 6.1 Create Environment File

Create `.env` file in project root:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# EmailJS Configuration - Auth Service
VITE_EMAILJS_AUTH_SERVICE_ID=service_xxxxx
VITE_EMAILJS_AUTH_PUBLIC_KEY=your_auth_public_key

# EmailJS Configuration - Booking Service
VITE_EMAILJS_BOOKING_SERVICE_ID=service_xxxxx
VITE_EMAILJS_BOOKING_PUBLIC_KEY=your_booking_public_key

# EmailJS Template IDs
VITE_EMAILJS_VERIFY_TEMPLATE_ID=template_xxxxx
VITE_EMAILJS_RESET_TEMPLATE_ID=template_xxxxx
VITE_EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID=template_xxxxx
VITE_EMAILJS_CANCELLATION_TEMPLATE_ID=template_xxxxx
VITE_EMAILJS_SUBSCRIPTION_SUCCESS_TEMPLATE_ID=template_xxxxx

# PayPal Configuration
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id

# Support Email
VITE_SUPPORT_EMAIL=support@getaways.com

# Logo URL (optional)
VITE_LOGO_URL=https://your-domain.com/logo.jpg
```

### 6.2 Environment File Security

- **Never commit `.env` to version control**
- Add `.env` to `.gitignore`
- Use different values for development and production
- Keep production keys secure

### 6.3 Firebase Configuration Alternative

If you prefer to hardcode Firebase config (not recommended for production), update `src/lib/firebase.js` directly.

---

## 7. Running the Application

### 7.1 Development Server

```bash
npm run dev
```

- Server starts on `http://localhost:5173`
- Hot module replacement enabled
- Changes reflect immediately

### 7.2 Build Preview

```bash
npm run build
npm run preview
```

- Builds production bundle
- Serves on `http://localhost:4173`
- Tests production build locally

### 7.3 Linting

```bash
npm run lint
```

- Checks code for errors
- Follows ESLint configuration

---

## 8. Building for Production

### 8.1 Production Build

```bash
npm run build
```

This creates optimized production files in `dist/` directory:
- Minified JavaScript
- Optimized CSS
- Compressed assets
- Tree-shaken dependencies

### 8.2 Build Output

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── ...
```

### 8.3 Verify Build

1. Test locally with `npm run preview`
2. Check all routes work
3. Verify API connections
4. Test payment flows (use sandbox)

---

## 9. Deployment

### 9.1 Firebase Hosting Deployment

#### Initial Setup
```bash
firebase login
firebase init hosting
```

#### Deploy
```bash
npm run build
firebase deploy --only hosting
```

#### Deploy Specific Features
```bash
# Deploy hosting only
firebase deploy --only hosting

# Deploy functions only (if you have Cloud Functions)
firebase deploy --only functions

# Deploy everything
firebase deploy
```

### 9.2 Environment Variables for Production

1. Set environment variables in Firebase Hosting
2. Or use Firebase Functions to inject variables
3. Or hardcode in build (not recommended)

### 9.3 Post-Deployment Checklist

- [ ] Verify site loads correctly
- [ ] Test authentication
- [ ] Test booking flow
- [ ] Test payment (sandbox)
- [ ] Verify emails are sending
- [ ] Check Firebase rules
- [ ] Monitor error logs
- [ ] Test on mobile devices

---

## 10. Troubleshooting

### 10.1 Common Issues

#### Firebase Connection Errors
**Problem**: Cannot connect to Firebase
**Solution**:
- Check Firebase configuration
- Verify API keys are correct
- Check internet connection
- Verify Firebase project is active

#### EmailJS Errors
**Problem**: Emails not sending
**Solution**:
- Verify EmailJS service IDs
- Check public keys
- Verify template IDs
- Check email service connection
- Review EmailJS dashboard for errors

#### PayPal Errors
**Problem**: PayPal payments not working
**Solution**:
- Verify Client ID is correct
- Check environment (sandbox vs live)
- Verify PayPal app is active
- Check browser console for errors

#### Build Errors
**Problem**: Build fails
**Solution**:
- Clear node_modules: `rm -rf node_modules`
- Clear cache: `npm cache clean --force`
- Reinstall: `npm install`
- Check Node.js version
- Review error messages

#### Port Already in Use
**Problem**: Port 5173 already in use
**Solution**:
```bash
# Kill process on port 5173
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5173 | xargs kill
```

### 10.2 Debugging Tips

#### Enable Debug Logging
- Check browser console
- Check Firebase console
- Check EmailJS dashboard
- Check PayPal developer dashboard

#### Common Console Errors
- **CORS errors**: Check Firebase rules
- **Auth errors**: Verify email verification
- **Payment errors**: Check PayPal configuration
- **Network errors**: Check API endpoints

### 10.3 Getting Help

- Check Firebase documentation
- Check EmailJS documentation
- Check PayPal documentation
- Review error logs
- Contact support

---

## Appendix A: Quick Start Checklist

- [ ] Install Node.js and npm
- [ ] Clone repository
- [ ] Install dependencies
- [ ] Create Firebase project
- [ ] Configure Firebase services
- [ ] Set up EmailJS
- [ ] Configure PayPal
- [ ] Create `.env` file
- [ ] Test locally
- [ ] Build for production
- [ ] Deploy to Firebase

## Appendix B: Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run linter

# Firebase
firebase login           # Login to Firebase
firebase init            # Initialize Firebase
firebase deploy          # Deploy to Firebase
firebase serve           # Serve locally

# Git
git clone <url>          # Clone repository
git pull                 # Pull latest changes
git add .                # Stage changes
git commit -m "message"  # Commit changes
git push                 # Push changes
```

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Platform Version**: Getaways v1.0

