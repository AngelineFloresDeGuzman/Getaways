# GETAWAYS PLATFORM - TECHNICAL DOCUMENTATION

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Database Structure](#database-structure)
4. [API Integration](#api-integration)
5. [Authentication & Authorization](#authentication--authorization)
6. [Payment System](#payment-system)
7. [Email System](#email-system)
8. [File Storage](#file-storage)
9. [Security](#security)
10. [Deployment](#deployment)

---

## 1. System Architecture

### 1.1 Overview
Getaways is a single-page application (SPA) built with React, utilizing Firebase as the backend-as-a-service (BaaS) platform. The architecture follows a modern client-server model with real-time capabilities.

### 1.2 Architecture Diagram
```
┌─────────────────┐
│   React Client  │
│   (Vite + React)│
└────────┬────────┘
         │
         ├─────────────────┬─────────────────┬─────────────────┐
         │                 │                 │                 │
┌────────▼────────┐ ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  Firebase Auth  │ │  Firestore  │ │   Storage   │ │   EmailJS   │
│  (Authentication)│ │  (Database) │ │  (Files)    │ │   (Emails)  │
└─────────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
         │
         │
┌────────▼────────┐
│   PayPal API    │
│  (Payments)     │
└─────────────────┘
```

### 1.3 Component Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   └── ...             # Feature components
├── pages/              # Page components
│   ├── Guest/          # Guest-specific pages
│   ├── Host/           # Host-specific pages
│   ├── Admin/          # Admin-specific pages
│   ├── Auth/           # Authentication pages
│   └── Common/         # Shared pages
├── lib/                # Library configurations
│   ├── firebase.js     # Firebase configuration
│   ├── emailService.js # Email service
│   └── utils.jsx       # Utility functions
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── services/           # Business logic services
```

---

## 2. Technology Stack

### 2.1 Frontend
- **React 19.1.1**: UI library
- **React Router DOM 7.9.3**: Client-side routing
- **Vite 7.1.7**: Build tool and dev server
- **Tailwind CSS 4.1.14**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Framer Motion 11.18.2**: Animation library
- **React Query 5.90.2**: Data fetching and caching
- **Lucide React**: Icon library

### 2.2 Backend Services
- **Firebase Authentication**: User authentication
- **Cloud Firestore**: NoSQL database
- **Firebase Storage**: File storage
- **Firebase Hosting**: Web hosting
- **EmailJS**: Email service integration

### 2.3 Payment Processing
- **PayPal SDK**: PayPal payment integration
- **GetPay Wallet**: Custom e-wallet system (Firestore-based)

### 2.4 Development Tools
- **ESLint**: Code linting
- **TypeScript Types**: Type definitions for React
- **Vite Plugins**: React plugin, Tailwind plugin

### 2.5 Additional Libraries
- **date-fns**: Date manipulation
- **jsPDF**: PDF generation
- **jspdf-autotable**: PDF table generation
- **leaflet**: Map functionality
- **react-leaflet**: React wrapper for Leaflet
- **uuid**: Unique ID generation
- **browser-image-compression**: Image optimization

---

## 3. Database Structure

### 3.1 Firestore Collections

#### Users Collection (`users`)
```javascript
{
  uid: string,                    // Firebase Auth UID
  email: string,
  firstName: string,
  lastName: string,
  emailVerified: boolean,
  roles: string[],                // ['guest', 'host', 'admin']
  profileImage: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  points: number,                 // Host points
  pointsHistory: Array,           // Points transaction history
  payment: {
    paypalEmail: string,
    paypalStatus: string,
    method: string
  },
  favorites: string[]             // Listing IDs
}
```

#### Listings Collection (`listings`)
```javascript
{
  ownerId: string,
  ownerEmail: string,
  category: string,               // 'accommodation', 'experience', 'service'
  title: string,
  description: string,
  photos: string[],
  location: {
    address: string,
    city: string,
    province: string,
    country: string,
    latitude: number,
    longitude: number
  },
  pricing: {
    weekdayPrice: number,
    weekendPrice: number,
    discounts: {
      weekly: number,
      monthly: number,
      earlyBird: number,
      lastMinute: number
    }
  },
  amenities: string[],
  guestCapacity: number,
  bedrooms: number,
  beds: number,
  bathrooms: number,
  rating: number,
  reviews: number,
  status: string,                 // 'published', 'unpublished', 'draft'
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### Bookings Collection (`bookings`)
```javascript
{
  guestId: string,
  guestEmail: string,
  listingId: string,
  ownerId: string,
  ownerEmail: string,
  checkInDate: Timestamp,
  checkOutDate: Timestamp,
  guests: number,
  totalPrice: number,
  bookingAmount: number,          // Amount host receives
  guestFee: number,               // Platform service fee
  status: string,                 // 'pending', 'confirmed', 'completed', 'cancelled'
  paymentProvider: string,        // 'getpay', 'paypal'
  paymentMethod: string,
  paymentStatus: string,          // 'pending', 'paid', 'refunded'
  earningsReleased: boolean,
  couponCode: string,
  couponDiscount: number,
  paypalOrderId: string,
  paypalTransactionId: string,
  refundAmount: number,
  refundType: string,
  refundStatus: string,
  reviewed: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### Reviews Collection (`reviews`)
```javascript
{
  listingId: string,
  bookingId: string,
  reviewerId: string,
  reviewerName: string,
  reviewerEmail: string,
  reviewerImage: string,
  rating: number,                 // 1-5
  comment: string,
  listingTitle: string,
  listingCategory: string,
  createdAt: Timestamp
}
```

#### Conversations Collection (`conversations`)
```javascript
{
  participants: string[],         // [userId1, userId2]
  listingId: string,
  bookingId: string,
  lastMessage: string,
  lastMessageAt: Timestamp,
  unreadCounts: {
    [userId]: number
  },
  createdAt: Timestamp
}
```

#### Messages Subcollection (`conversations/{conversationId}/messages`)
```javascript
{
  senderId: string,
  text: string,
  createdAt: Timestamp,
  read: boolean,
  type: string                    // 'booking_message', 'regular'
}
```

#### Coupons Collection (`coupons`)
```javascript
{
  hostId: string,
  code: string,
  description: string,
  discountType: string,           // 'percentage', 'fixed'
  discountValue: number,
  validFrom: Timestamp,
  validUntil: Timestamp,
  maxUses: number,
  currentUses: number,
  listingIds: string[],           // Empty = all listings
  active: boolean,
  minBookingAmount: number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### Drafts Collection (`drafts`)
```javascript
{
  userId: string,
  category: string,
  currentStep: string,
  data: Object,                   // Onboarding form data
  lastSaved: Timestamp,
  createdAt: Timestamp
}
```

#### Verification Tokens Collection (`verificationTokens`)
```javascript
{
  userId: string,
  email: string,
  token: string,
  type: string,                   // 'email_verification'
  expiresAt: Timestamp,
  createdAt: Timestamp,
  used: boolean
}
```

#### Password Reset Tokens Collection (`passwordResetTokens`)
```javascript
{
  userId: string,
  email: string,
  token: string,
  expiresAt: Timestamp,
  createdAt: Timestamp,
  used: boolean
}
```

#### Platform Settings Collection (`platformSettings`)
```javascript
{
  adminPayPalEmail: string,
  adminPayPalAccountName: string,
  updatedAt: Timestamp
}
```

### 3.2 Security Rules

#### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data, admins can read all
    match /users/{userId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin']));
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Listings: public read, owner write
    match /listings/{listingId} {
      allow read: if true;
      allow write: if request.auth != null && 
        resource.data.ownerId == request.auth.uid;
    }
    
    // Bookings: participants and admins can read
    match /bookings/{bookingId} {
      allow read: if request.auth != null && 
        (resource.data.guestId == request.auth.uid || 
         resource.data.ownerId == request.auth.uid ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin']));
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (resource.data.guestId == request.auth.uid || 
         resource.data.ownerId == request.auth.uid ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin']));
    }
    
    // Similar rules for other collections...
  }
}
```

#### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.resource.size < 5 * 1024 * 1024; // 5MB limit
    }
  }
}
```

---

## 4. API Integration

### 4.1 Firebase APIs

#### Authentication API
- `signInWithEmailAndPassword()`: Email/password login
- `createUserWithEmailAndPassword()`: User registration
- `signInWithPopup()`: Google sign-in
- `sendPasswordResetEmail()`: Password reset
- `onAuthStateChanged()`: Auth state listener

#### Firestore API
- `collection()`: Reference to collection
- `doc()`: Reference to document
- `getDoc()`: Read document
- `setDoc()`: Create/update document
- `updateDoc()`: Update document fields
- `addDoc()`: Add document to collection
- `deleteDoc()`: Delete document
- `query()`: Create query
- `where()`: Filter query
- `orderBy()`: Sort query
- `onSnapshot()`: Real-time listener

#### Storage API
- `ref()`: Reference to storage path
- `uploadBytes()`: Upload file
- `getDownloadURL()`: Get file URL
- `deleteObject()`: Delete file

### 4.2 EmailJS API

#### Configuration
```javascript
const EMAILJS_AUTH_SERVICE_ID = 'service_m3bzszx';
const EMAILJS_BOOKING_SERVICE_ID = 'service_i17lsmg';
const EMAILJS_AUTH_PUBLIC_KEY = '1bELJwUeoejy0Q4cQ';
const EMAILJS_BOOKING_PUBLIC_KEY = 'Vy3E5HLPceR3d0Pmy';
```

#### Email Templates
- Verification Email: `template_qo9q8de`
- Password Reset: `template_btqnqws`
- Booking Confirmation: `template_sl3wzej`
- Cancellation: `template_v7z3kcj`
- Subscription Success: `template_subscription_success`

#### Email Functions
- `sendVerificationEmail()`: Send verification email
- `sendPasswordResetEmail()`: Send password reset
- `sendBookingConfirmationEmail()`: Send booking confirmation
- `sendCancellationEmail()`: Send cancellation email
- `sendSubscriptionConfirmationEmail()`: Send subscription confirmation

### 4.3 PayPal API

#### Configuration
```javascript
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;
```

#### PayPal Integration
- PayPal Buttons component for payments
- Order creation and capture
- Payment verification
- Refund processing

### 4.4 External APIs

#### Nominatim (OpenStreetMap)
- Geocoding service for address lookup
- Reverse geocoding for coordinates
- Used for location search and map features

---

## 5. Authentication & Authorization

### 5.1 Authentication Flow

#### Registration Flow
1. User submits registration form
2. Firebase creates user account
3. Verification token generated
4. Verification email sent via EmailJS
5. User clicks verification link
6. Token validated
7. User document created in Firestore
8. User redirected to appropriate dashboard

#### Login Flow
1. User submits credentials
2. Firebase authenticates
3. User document fetched from Firestore
4. Roles checked
5. Email verification status checked
6. User redirected based on role

#### Google Sign-In Flow
1. User clicks "Continue with Google"
2. Firebase handles OAuth flow
3. User document created/updated
4. Roles assigned
5. User redirected

### 5.2 Authorization

#### Role-Based Access Control
- **Guest**: Can browse, book, review
- **Host**: Can create listings, manage bookings, earn
- **Admin**: Full platform access

#### Route Protection
```javascript
// Protected routes check authentication
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, roles } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  if (requiredRole && !roles.includes(requiredRole)) {
    return <Navigate to="/" />;
  }
  return children;
};
```

### 5.3 Email Verification
- Required for all non-admin users
- Token-based verification
- 24-hour token expiration
- EmailJS integration for sending emails

---

## 6. Payment System

### 6.1 GetPay Wallet

#### Wallet Structure
- Stored in Firestore user document
- Balance tracked as number
- Transaction history maintained
- Real-time balance updates

#### Wallet Operations
- **Cash In**: Add funds via PayPal
- **Cash Out**: Transfer to PayPal
- **Deduct**: Payment for bookings
- **Credit**: Refunds, earnings

#### Transaction Types
- `credit`: Money added
- `debit`: Money deducted
- `subscription`: Subscription payment
- `earnings`: Host earnings
- `refund`: Refund received

### 6.2 PayPal Integration

#### Payment Flow
1. User initiates payment
2. PayPal order created
3. User approves payment
4. Order captured
5. Transaction ID stored
6. Payment status updated

#### Subscription Payment
- Monthly: ₱999/month
- Yearly: ₱9,999/year
- Required for hosts to publish listings
- PayPal or GetPay wallet payment

### 6.3 Booking Payment Flow

#### Payment Processing
1. Guest creates booking request
2. Host accepts booking
3. Payment processed:
   - GetPay: Deducted from wallet
   - PayPal: Guest completes payment
4. Payment status updated to "paid"
5. Earnings held until booking completion
6. Admin releases earnings to host

### 6.4 Refund Processing

#### Cancellation Refunds
1. Guest cancels booking
2. Refund amount calculated based on policy
3. Refund processed:
   - GetPay: Credited to wallet
   - PayPal: Refunded via PayPal
4. Refund status updated
5. Email notification sent

---

## 7. Email System

### 7.1 EmailJS Configuration

#### Services
- **Auth Service**: Verification and password reset emails
- **Booking Service**: Booking and cancellation emails

#### Email Templates
All templates use EmailJS template variables:
- `{{to_email}}`: Recipient email
- `{{to_name}}`: Recipient name
- `{{user_name}}`: Full name
- `{{app_name}}`: "Getaways"
- `{{support_email}}`: Support email
- `{{logo_url}}`: Logo URL

### 7.2 Email Types

#### Verification Email
- Sent after registration
- Contains verification link
- 24-hour expiration

#### Password Reset Email
- Sent when user requests reset
- Contains reset link
- 1-hour expiration

#### Booking Confirmation
- Sent to guest after booking
- Contains booking details
- Payment information

#### Cancellation Email
- Sent when booking cancelled
- Refund information
- Cancellation details

#### Subscription Confirmation
- Sent to host after subscription
- Payment confirmation
- Subscription details

---

## 8. File Storage

### 8.1 Firebase Storage

#### Storage Structure
```
storage/
├── users/
│   └── {userId}/
│       └── profile.jpg
├── listings/
│   └── {listingId}/
│       ├── photo1.jpg
│       ├── photo2.jpg
│       └── ...
└── documents/
    └── {documentId}.pdf
```

#### File Upload Process
1. User selects file
2. File validated (size, type)
3. Image compressed (if image)
4. File uploaded to Storage
5. Download URL obtained
6. URL stored in Firestore

#### File Limits
- Maximum file size: 5MB
- Supported image formats: JPG, PNG, WebP
- Image compression: Automatic

---

## 9. Security

### 9.1 Authentication Security
- Firebase Authentication handles password hashing
- Email verification required
- Password reset tokens expire
- Session management

### 9.2 Data Security
- Firestore security rules
- Storage security rules
- Input validation
- XSS prevention
- CSRF protection

### 9.3 Payment Security
- PayPal handles payment processing
- No credit card data stored
- Transaction verification
- Secure API communication

### 9.4 Best Practices
- Environment variables for secrets
- HTTPS only
- Input sanitization
- Error handling without exposing details
- Regular security updates

---

## 10. Deployment

### 10.1 Build Process
```bash
npm run build
```
- Vite builds production bundle
- Output in `dist/` directory
- Optimized and minified

### 10.2 Firebase Hosting

#### Configuration (`firebase.json`)
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

#### Deployment Steps
1. Build project: `npm run build`
2. Deploy to Firebase: `firebase deploy --only hosting`
3. Verify deployment

### 10.3 Environment Variables

#### Required Variables
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_EMAILJS_AUTH_SERVICE_ID=
VITE_EMAILJS_BOOKING_SERVICE_ID=
VITE_EMAILJS_AUTH_PUBLIC_KEY=
VITE_EMAILJS_BOOKING_PUBLIC_KEY=
VITE_EMAILJS_VERIFY_TEMPLATE_ID=
VITE_EMAILJS_RESET_TEMPLATE_ID=
VITE_EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID=
VITE_EMAILJS_CANCELLATION_TEMPLATE_ID=
VITE_PAYPAL_CLIENT_ID=
VITE_SUPPORT_EMAIL=
VITE_LOGO_URL=
```

### 10.4 Monitoring
- Firebase Analytics
- Error tracking
- Performance monitoring
- User analytics

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Platform Version**: Getaways v1.0

