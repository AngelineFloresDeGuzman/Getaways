# GETAWAYS PLATFORM - COMPLETE DOCUMENTATION

**Version**: 1.0  
**Last Updated**: 2024  
**Platform**: Getaways v1.0

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [User Roles & Features](#user-roles--features)
5. [Core Features](#core-features)
6. [Guest Features](#guest-features)
7. [Host Features](#host-features)
8. [Admin Features](#admin-features)
9. [Payment System](#payment-system)
10. [Database Structure](#database-structure)
11. [API & Services](#api--services)
12. [Authentication & Security](#authentication--security)
13. [Installation & Setup](#installation--setup)
14. [Deployment](#deployment)
15. [Testing](#testing)
16. [Troubleshooting](#troubleshooting)

---

## Platform Overview

### What is Getaways?

Getaways is a comprehensive online marketplace platform that connects travelers with hosts offering accommodations, experiences, and services. The platform facilitates bookings, payments, communications, and reviews in a seamless, user-friendly environment.

### Key Capabilities

- **Multi-Category Listings**: Accommodations, Experiences, and Services
- **Advanced Search**: Location-based search with flexible date options
- **Secure Payments**: GetPay Wallet and PayPal integration
- **Real-time Messaging**: Direct communication between guests and hosts
- **Review System**: Comprehensive rating and review system
- **Points & Rewards**: Host rewards program with cash-out capabilities
- **Coupon System**: Discount and promotion management
- **Admin Dashboard**: Complete platform management
- **Notification System**: Real-time notifications for all user activities
- **Subscription System**: Host subscription plans (Monthly ₱999, Yearly ₱9,999)

### Platform Statistics

- **Total User Roles**: 3 (Guest, Host, Admin)
- **Listing Categories**: 3 (Accommodations, Experiences, Services)
- **Payment Methods**: 2 (GetPay Wallet, PayPal)
- **Subscription Plans**: 2 (Monthly, Yearly)
- **Points Conversion**: 10 points = ₱1 (PHP)

---

## System Architecture

### Architecture Overview

Getaways is a single-page application (SPA) built with React, utilizing Firebase as the backend-as-a-service (BaaS) platform. The architecture follows a modern client-server model with real-time capabilities.

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

### Component Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   └── ...             # Feature components
├── pages/              # Page components
│   ├── Guest/          # Guest-specific pages
│   │   ├── services/   # Guest services (booking, messaging, review, recommendations)
│   │   └── ...
│   ├── Host/           # Host-specific pages
│   │   ├── services/   # Host services (listing, coupon, draft, points, appeal)
│   │   ├── onboarding/ # Listing creation flow
│   │   └── ...
│   ├── Admin/          # Admin-specific pages
│   │   ├── services/   # Admin services (cashOut, earnings, policy, refund, report, platformSettings)
│   │   └── ...
│   ├── Auth/           # Authentication pages
│   └── Common/         # Shared pages
│       └── services/   # Common services (getpayService)
├── lib/                # Library configurations
│   ├── firebase.js     # Firebase configuration
│   ├── emailService.js # Email service
│   └── utils.jsx       # Utility functions
├── hooks/              # Custom React hooks
└── utils/              # Utility functions
```

---

## Technology Stack

### Frontend

- **React 19.1.1**: UI library
- **React Router DOM 7.9.3**: Client-side routing
- **Vite 7.1.7**: Build tool and dev server
- **Tailwind CSS 4.1.14**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Framer Motion 11.18.2**: Animation library
- **React Query 5.90.2**: Data fetching and caching
- **Lucide React**: Icon library
- **next-themes**: Theme management (dark/light mode)

### Backend Services

- **Firebase Authentication**: User authentication (Email/Password, Google OAuth)
- **Cloud Firestore**: NoSQL database
- **Firebase Storage**: File storage
- **Firebase Hosting**: Web hosting

### Payment Processing

- **PayPal SDK 8.9.2**: PayPal payment integration
- **GetPay Wallet**: Custom e-wallet system (Firestore-based)

### Email Services

- **EmailJS 4.4.1**: Email service integration

### Additional Libraries

- **date-fns 4.1.0**: Date manipulation
- **jsPDF 3.0.3**: PDF generation
- **jspdf-autotable 5.0.2**: PDF table generation
- **leaflet 1.9.4**: Map functionality
- **react-leaflet 5.0.0**: React wrapper for Leaflet
- **uuid 13.0.0**: Unique ID generation
- **browser-image-compression 2.0.2**: Image optimization
- **react-day-picker 9.11.1**: Date picker component
- **sonner 2.0.7**: Toast notifications

### Development Tools

- **ESLint 9.36.0**: Code linting
- **TypeScript Types**: Type definitions for React
- **Vite Plugins**: React plugin, Tailwind plugin

---

## User Roles & Features

### Guest Role

**Primary Functions:**
- Browse and search listings
- Book accommodations, experiences, and services
- Manage bookings
- Leave reviews and ratings
- Save favorites/wishlist
- Message hosts
- Manage GetPay wallet
- View notifications

**Access Level:** Public browsing, authenticated booking

### Host Role

**Primary Functions:**
- Create and manage listings (Accommodations, Experiences, Services)
- Manage booking requests
- Track earnings
- Earn and manage points
- Create and manage coupons
- View analytics dashboard
- Message guests
- Manage calendar availability
- Submit appeals (if account terminated)
- View notifications

**Access Level:** Requires subscription (₱999/month or ₱9,999/year)

### Admin Role

**Primary Functions:**
- Manage all users
- Oversee all bookings
- Process refunds
- Manage host earnings
- Manage points system
- Process cash-out requests
- Generate reports
- Manage platform policies
- Configure platform settings
- View platform analytics

**Access Level:** Full platform access

---

## Core Features

### 1. User Authentication

#### Email/Password Authentication
- **Registration**: Users can create accounts with email and password
- **Login**: Secure login with email verification
- **Password Reset**: Token-based password reset via email
- **Email Verification**: Required for account activation (24-hour token expiration)
- **Session Management**: Persistent and session-based login options

#### Google Sign-In
- **OAuth Integration**: One-click Google authentication
- **Account Linking**: Links Google account to platform account
- **Auto-Verification**: Google accounts are automatically verified
- **Multi-Role Support**: Users can have multiple roles (guest, host, admin)

#### Account Types
- **Guest Account**: For booking and browsing
- **Host Account**: For listing and earning (requires subscription)
- **Admin Account**: For platform management
- **Multi-Role Support**: Users can have multiple roles simultaneously

### 2. User Profiles

#### Profile Management
- **Personal Information**: First name, last name, email
- **Profile Picture**: Upload and manage profile images
- **Account Settings**: Comprehensive settings management
- **Privacy Controls**: Control profile visibility

#### Role Management
- **Role Assignment**: Automatic role assignment on signup
- **Role Upgrades**: Guests can upgrade to hosts
- **Role Permissions**: Role-based feature access

### 3. Theme System

- **Dark Mode**: Full dark mode support
- **Light Mode**: Default light theme
- **Theme Persistence**: Theme preference saved in localStorage
- **System Preference**: Automatic theme detection

---

## Guest Features

### 1. Search & Browse

#### Advanced Search
- **Location Search**: Search by city, province, or region with autocomplete
- **Date Selection**: Flexible date picker with multiple modes:
  - Specific dates
  - Month selection
  - Flexible dates (weekend, week, month)
- **Guest Count**: Select adults, children, infants, pets
- **Category Filter**: Filter by Accommodations, Experiences, Services
- **Real-time Suggestions**: Location autocomplete using Nominatim API

#### Listing Display
- **Grid/List View**: Toggle between view modes
- **Sorting Options**: Sort by price, rating, newest
- **Filtering**: Multiple filter options (price range, amenities, etc.)
- **Pagination**: Efficient listing pagination
- **Featured Listings**: Highlighted premium listings

### 2. Listing Details

#### Comprehensive Information
- **Photo Gallery**: Multiple high-quality images with zoom
- **Detailed Description**: Rich text descriptions
- **Amenities List**: Complete amenities listing
- **Location Map**: Interactive map with precise location (Leaflet/OpenStreetMap)
- **Host Information**: Host profile and contact
- **Reviews & Ratings**: Guest reviews and average ratings
- **Similar Listings**: Recommendations based on current listing

#### Booking Information
- **Pricing Breakdown**: Transparent pricing display
- **Availability Calendar**: Visual availability display
- **Guest Capacity**: Maximum guests information
- **House Rules**: Listing rules and policies
- **Cancellation Policy**: Clear cancellation terms

### 3. Booking System

#### Booking Process
1. **Select Dates**: Choose check-in and check-out
2. **Select Guests**: Specify number of guests
3. **Review Pricing**: See total cost breakdown
4. **Apply Coupon**: Optional coupon code application
5. **Choose Payment**: Select payment method (GetPay Wallet, PayPal, Pay Later)
6. **Add Message**: Optional message to host
7. **Submit Request**: Create booking request

#### Booking Status
- **Pending**: Awaiting host confirmation
- **Confirmed**: Host accepted, payment processed
- **Completed**: Stay/service completed
- **Cancelled**: Booking cancelled

#### Payment Options
- **GetPay Wallet**: Instant payment from wallet
- **PayPal**: PayPal payment integration
- **Pay Later**: Reserve now, pay on confirmation

### 4. Booking Management

#### View Bookings
- **All Bookings**: View all booking history
- **Filter by Status**: Filter pending, confirmed, completed, cancelled
- **Search Bookings**: Search by listing name or ID
- **Booking Details**: Comprehensive booking information

#### Booking Actions
- **View Details**: Full booking information
- **Cancel Booking**: Cancel with refund calculation based on cancellation policy
- **Complete Payment**: Pay for confirmed bookings
- **Contact Host**: Message host about booking
- **Leave Review**: Review after completion

### 5. Favorites/Wishlist

#### Save Listings
- **Add to Favorites**: One-click save
- **View Favorites**: Access saved listings
- **Remove from Favorites**: Easy removal
- **Compare Listings**: Compare saved options

### 6. Recommendations

#### Personalized Recommendations
- **Based on Search History**: Recommendations from past searches
- **Based on Bookings**: Similar to previous bookings
- **Based on Preferences**: User preference-based
- **Dynamic Updates**: Regularly updated recommendations
- **Popular Listings**: Trending and popular listings

### 7. Reviews & Ratings

#### Review Submission
- **Rating Selection**: 1-5 star rating
- **Comment Writing**: Review text
- **One Review Per Booking**: Single review limit
- **Review Guidelines**: Honest and constructive feedback

#### Rating Impact
- **Average Rating**: Calculated from all reviews
- **Review Count**: Total number of reviews
- **Rating Display**: Shown on listings
- **Rating Updates**: Real-time updates

### 8. Messaging

#### Conversation Management
- **Start Conversation**: Initiate with host/guest
- **View Conversations**: List of all conversations
- **Unread Counts**: Track unread messages
- **Message History**: Complete conversation history

#### Message Features
- **Send Messages**: Text messaging
- **Real-time Updates**: Live message updates
- **Read Receipts**: Message read status
- **Booking Context**: Messages linked to bookings

### 9. Notifications

#### Notification Types
- **Booking Notifications**: New booking requests, confirmations, cancellations
- **Message Notifications**: New messages from hosts/guests
- **Review Notifications**: New reviews on listings
- **Payment Notifications**: Payment confirmations, refunds
- **Alert Notifications**: Important platform updates

#### Notification Features
- **Real-time Updates**: Live notification updates
- **Mark as Read**: Individual and bulk mark as read
- **Delete Notifications**: Remove unwanted notifications
- **Filter Notifications**: Filter by type (all, unread, bookings, messages)
- **Notification Navigation**: Click to navigate to relevant page

### 10. GetPay Wallet

#### Wallet Operations
- **View Balance**: Current wallet balance
- **Cash In**: Add funds via PayPal
- **Cash Out**: Transfer to PayPal (minimum ₱100)
- **Transaction History**: Complete history with filters
- **Filter Transactions**: By type and date

#### Transaction Types
- **Credit**: Money added to wallet
- **Debit**: Money deducted from wallet
- **Payment**: Booking payments
- **Refund**: Refunds received
- **Subscription**: Subscription payments
- **Earnings**: Host earnings (for hosts)

---

## Host Features

### 1. Listing Creation

#### Accommodation Onboarding
**Step 1: Property Details**
- Property type selection
- Property structure
- Privacy type

**Step 2: Location**
- Complete address entry
- Map confirmation
- Location visibility settings

**Step 3: Property Basics**
- Guest capacity
- Bedrooms, beds, bathrooms
- Property features

**Step 4: Stand Out**
- Highlights selection
- Amenities selection
- Photo upload (minimum 5)
- Title and description

**Step 5: Pricing**
- Weekday pricing
- Weekend pricing (optional)
- Discount configuration (weekly, monthly, early bird, last minute)

**Step 6: Booking Settings**
- Advance notice
- Preparation time
- Availability window
- Guest requirements
- Instant booking toggle

**Step 7: Final Details**
- House rules
- Cancellation policy
- Safety amenities

**Step 8: Payment & Publish**
- PayPal connection
- Subscription payment (₱999/month or ₱9,999/year)
- Publish listing

#### Experience Onboarding
- Category and subcategory selection
- Location and meeting point
- Experience details and qualifications
- Years of experience
- Photos and itinerary
- Pricing per guest
- Maximum guests
- Availability configuration
- Title and description
- Payment and publish

#### Service Onboarding
- Service category selection
- Service details and qualifications
- Years of experience
- Online profiles
- Location and service area
- Where service is provided
- Photos and description
- Offerings creation (optional)
- Pricing configuration
- Payment and publish

### 2. Listing Management

#### Dashboard Overview
- **Total Listings**: Count of all listings
- **Active Bookings**: Current bookings
- **Earnings Summary**: Total and pending earnings
- **Points Balance**: Current points
- **Recent Activity**: Latest updates

#### Listing Actions
- **View Listings**: See all listings with filters
- **Edit Listing**: Update listing information
- **Unpublish**: Hide from search (may incur points debt)
- **Publish**: Make visible to guests
- **Delete**: Remove listing
- **View Analytics**: Listing performance

#### Draft Management
- **Save Drafts**: Auto-save during onboarding
- **Resume Editing**: Continue from saved point
- **Delete Drafts**: Remove unwanted drafts
- **Multiple Drafts**: Work on multiple listings
- **Draft Summary**: View draft progress

### 3. Booking Management

#### Booking Requests
- **View Requests**: See all pending requests
- **Booking Details**: Complete booking information
- **Guest Information**: Guest profile and contact
- **Accept/Decline**: Respond to requests
- **Message Guest**: Communicate with guests

#### Booking Calendar
- **Calendar View**: Visual booking calendar
- **Availability Display**: See available dates
- **Conflict Detection**: Identify booking conflicts
- **Planning Tool**: Plan ahead for bookings

### 4. Earnings Management

#### Earnings Overview
- **Total Earnings**: Lifetime earnings
- **Pending Earnings**: Not yet released (held until booking completion)
- **Released Earnings**: Available for cash out
- **Earnings by Listing**: Breakdown by listing
- **Monthly Earnings**: Monthly breakdown

#### Payment Release
- **Automatic Release**: After booking completion (admin releases)
- **Admin Processing**: Admin releases earnings
- **PayPal Transfer**: Earnings to PayPal
- **Payment History**: Complete payment history

### 5. Points System

#### Earning Points
- **First Listing**: 50 points for first published listing
- **Confirmed Bookings**: 1 point per ₱100 booking amount
- **Positive Reviews**:
  - 5 stars: 25 points
  - 4 stars: 15 points
  - 3 stars: 5 points
- **Admin Awards**: Manual point awards

#### Points Management
- **View Balance**: Current points display
- **Points History**: Transaction history
- **Cash Out**: Convert points to cash (10 points = ₱1)
- **Points Breakdown**: Detailed points source
- **Points for Payment**: Use points to pay subscriptions (partial or full)

#### Points Debt System
- **Unpublishing Penalty**: Points debt created when listing unpublished
- **Debt Payment**: Automatic payment from earnings/credits
- **Debt Tracking**: Track and manage points debts

### 6. Coupon Management

#### Create Coupons
- **Coupon Code**: Unique uppercase alphanumeric code
- **Discount Type**: Percentage or fixed amount
- **Discount Value**: Discount amount
- **Validity Period**: Start and end dates
- **Usage Limits**: Maximum uses
- **Listing Scope**: All listings or specific ones
- **Minimum Amount**: Minimum booking amount

#### Manage Coupons
- **View All Coupons**: List of all coupons
- **Usage Statistics**: Track coupon usage
- **Edit Coupons**: Update coupon details
- **Activate/Deactivate**: Toggle coupon status
- **Delete Coupons**: Remove coupons

### 7. Appeal System

#### Submit Appeals
- **Appeal Form**: Submit appeal if account terminated
- **Reason Selection**: Choose appeal reason
- **Additional Info**: Provide additional information
- **Status Tracking**: Track appeal status

#### Appeal Status
- **Pending**: Awaiting admin review
- **Approved**: Appeal approved, account restored
- **Rejected**: Appeal rejected

### 8. Notifications

#### Host Notification Types
- **Booking Requests**: New booking requests
- **Booking Updates**: Booking status changes
- **Messages**: New messages from guests
- **Reviews**: New reviews on listings
- **Earnings**: Earnings released notifications
- **Points**: Points earned notifications

---

## Admin Features

### 1. Dashboard Overview

#### Key Metrics
- **Total Users**: Guests, hosts, admins count
- **Active Listings**: Published listings count
- **Total Bookings**: All-time bookings
- **Total Revenue**: Platform revenue
- **Service Fees**: Collected service fees
- **Subscription Revenue**: Host subscription revenue
- **Pending Payments**: Awaiting processing

#### Analytics
- **Revenue Trends**: Monthly revenue charts
- **Booking Trends**: Booking volume over time
- **User Growth**: New user registrations
- **Category Breakdown**: Revenue by category
- **Top Hosts**: Best performing hosts
- **Status Distribution**: Booking status breakdown

### 2. User Management

#### User Operations
- **View All Users**: Complete user list
- **Filter by Role**: Guest, host, admin
- **Search Users**: By name or email
- **View Profile**: User details
- **View Bookings**: User booking history
- **View Listings**: Host listings
- **Terminate Accounts**: Remove host accounts (with appeal option)

### 3. Booking Management

#### Booking Operations
- **View All Bookings**: Complete booking list
- **Filter by Status**: Pending, confirmed, completed, cancelled
- **Filter by Date**: Date range filtering
- **Search Bookings**: By ID or guest name
- **View Details**: Complete booking information
- **Update Status**: Change booking status
- **Process Refunds**: Handle cancellations

### 4. Refund Processing

#### Refund Workflow
1. **Review Cancellation**: Check cancellation request
2. **Calculate Refund**: Based on cancellation policy
3. **Process Refund**: Issue refund to guest
4. **Update Status**: Mark refund as processed
5. **Notify Guest**: Send refund confirmation email

#### Refund Policies
- **Flexible**: Full refund 24+ hours before
- **Moderate**: Full refund 5+ days before
- **Strict**: 50% refund 7+ days before

### 5. Earnings Management

#### Host Earnings
- **View All Earnings**: All host earnings
- **Pending Earnings**: Not yet released
- **Release Earnings**: After booking completion
- **Earnings History**: Complete history
- **Earnings by Host**: Breakdown by host

#### Service Fees
- **Fee Overview**: Total fees collected
- **Fees by Host**: Per-host breakdown
- **Fees by Transaction**: Transaction-level view
- **Monthly Breakdown**: Monthly fee collection

### 6. Points Management

#### Points Operations
- **View Host Points**: All hosts with points
- **Points History**: Transaction history
- **Award Points**: Manually award points
- **Deduct Points**: Remove points with reason
- **Points Breakdown**: Detailed points source

### 7. Cash Out Requests

#### Request Processing
- **View Requests**: All cash-out requests
- **Filter by Status**: Pending, approved, rejected
- **Review Requests**: Verify points balance
- **Add Notes**: Admin notes on requests
- **Approve/Reject**: Process requests
- **PayPal Transfer**: Transfer to host PayPal

### 8. Policy Management

#### Policy Operations
- **Create Policies**: New platform policies
- **Edit Policies**: Update existing policies
- **Publish Policies**: Make policies visible
- **Policy Categories**: Organize by category
- **Policy Types**:
  - Cancellation policies
  - Refund policies
  - Host policies
  - Guest policies
  - Platform terms
  - FAQ management

### 9. Reports

#### Report Generation
- **Select Report Type**: Choose report category
- **Date Range**: Select time period
- **Generate Report**: Create report
- **Download**: PDF or Excel format

#### Available Reports
- **Revenue Reports**: Financial reports
- **Booking Reports**: Booking analytics
- **User Reports**: User statistics
- **Transaction Reports**: Payment transactions
- **Service Fees Reports**: Fee collection
- **Comprehensive Reports**: All-in-one reports
- **Analytics Reports**: Platform analytics
- **Compliance Reports**: Compliance tracking

### 10. Platform Settings

#### Configuration
- **PayPal Settings**: Admin PayPal configuration
- **Email Settings**: Email template management
- **Platform Features**: Feature toggles
- **System Settings**: General configuration

### 11. Appeal Management

#### Appeal Operations
- **View Appeals**: All host appeals
- **Filter by Status**: Pending, approved, rejected
- **Review Appeals**: Review appeal details
- **Approve/Reject**: Process appeals
- **Add Notes**: Admin notes on appeals

---

## Payment System

### 1. GetPay Wallet

#### Wallet Structure
- Stored in Firestore user document
- Balance tracked as number
- Transaction history maintained in `walletTransactions` collection
- Real-time balance updates

#### Wallet Operations
- **Cash In**: Add funds via PayPal
- **Cash Out**: Transfer to PayPal (minimum ₱100, requires admin approval)
- **Deduct**: Payment for bookings
- **Credit**: Refunds, earnings

#### Transaction Types
- `cash_in`: Money added from PayPal
- `payment`: Money deducted for bookings/subscriptions
- `credit`: Money added (refunds, earnings)
- `subscription`: Subscription payment
- `earnings`: Host earnings
- `refund`: Refund received

#### Points Integration
- Points can be converted to wallet balance (10 points = ₱1)
- Points can be used for subscription payments
- Points debt system for unpublished listings

### 2. PayPal Integration

#### Payment Flow
1. User initiates payment
2. PayPal order created
3. User approves payment
4. Order captured
5. Transaction ID stored
6. Payment status updated

#### Subscription Payment
- **Monthly**: ₱999/month
- **Yearly**: ₱9,999/year (17% savings)
- Required for hosts to publish listings
- PayPal or GetPay wallet payment
- Points can be used (partial or full)

### 3. Booking Payment Flow

#### Payment Processing
1. Guest creates booking request
2. Host accepts booking
3. Payment processed:
   - GetPay: Deducted from wallet
   - PayPal: Guest completes payment
4. Payment status updated to "paid"
5. Earnings held until booking completion
6. Admin releases earnings to host

### 4. Refund Processing

#### Cancellation Refunds
1. Guest cancels booking
2. Refund amount calculated based on policy
3. Refund processed:
   - GetPay: Credited to wallet
   - PayPal: Refunded via PayPal
4. Refund status updated
5. Email notification sent

### 5. Service Fees

- **Guest Fee**: Currently 0% (no guest fee)
- **Host Commission**: 10% of booking amount
- **Service Fee Collection**: Collected at booking confirmation
- **Fee Distribution**: Fees go to platform (admin wallet)

---

## Database Structure

### Firestore Collections

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
  pointsDebts: Array,             // Points debts from unpublished listings
  payment: {
    paypalEmail: string,
    paypalStatus: string,
    method: string
  },
  favorites: string[],            // Listing IDs
  getpay: {
    balance: number,
    createdAt: Timestamp,
    updatedAt: Timestamp
  }
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

#### Wallet Transactions Collection (`walletTransactions`)
```javascript
{
  userId: string,
  type: string,                   // 'cash_in', 'payment', 'credit', 'subscription', 'earnings', 'refund'
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  status: string,                 // 'completed', 'pending', 'failed'
  method: string,                 // 'paypal', 'getpay'
  description: string,
  metadata: Object,
  paypalTransactionId: string,
  paypalEmail: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### Cash Out Requests Collection (`cashOutRequests`)
```javascript
{
  userId: string,
  userName: string,
  userEmail: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  status: string,                 // 'pending', 'approved', 'rejected'
  method: string,                 // 'paypal'
  paypalEmail: string,
  paypalTransactionId: string,
  description: string,
  metadata: Object,
  reviewedBy: string,
  reviewedAt: Timestamp,
  adminNotes: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### Notifications Collection (`notifications`)
```javascript
{
  userId: string,                 // For guest notifications
  recipientId: string,            // For host/admin notifications
  type: string,                   // 'booking', 'message', 'review', 'payment', 'alert'
  title: string,
  message: string,
  bookingId: string,
  listingId: string,
  read: boolean,
  readAt: Timestamp,
  deleted: boolean,
  deletedAt: Timestamp,
  createdAt: Timestamp
}
```

#### Appeals Collection (`appeals`)
```javascript
{
  hostId: string,
  hostEmail: string,
  hostName: string,
  reason: string,
  additionalInfo: string,
  status: string,                 // 'pending', 'approved', 'rejected'
  reviewedBy: string,
  reviewedAt: Timestamp,
  adminNotes: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
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

---

## API & Services

### Guest Services

#### Booking Service (`src/pages/Guest/services/bookingService.js`)
- `createBooking()`: Create new booking
- `checkDateConflict()`: Check for date conflicts
- `getListingBookings()`: Get bookings for a listing
- `getGuestBookings()`: Get guest's bookings
- `getUnavailableDates()`: Get unavailable dates for listing
- `calculateTotalPrice()`: Calculate booking total
- `calculateBookingPrice()`: Calculate booking price breakdown
- `cancelBooking()`: Cancel booking with refund

#### Messaging Service (`src/pages/Guest/services/messagingService.js`)
- `startConversation()`: Start conversation with host
- `startConversationFromHost()`: Start conversation from host side
- `getHostIdFromListing()`: Get host ID from listing

#### Review Service (`src/pages/Guest/services/reviewService.js`)
- `createReview()`: Create new review
- `getListingReviews()`: Get reviews for listing
- `getUserReviews()`: Get user's reviews
- `getReviewByBookingId()`: Get review by booking ID
- `updateListingRating()`: Update listing rating
- `getUserReviewStats()`: Get user review statistics

#### Recommendations Service (`src/pages/Guest/services/recommendationsService.js`)
- `getRecommendations()`: Get personalized recommendations
- `getPopularRecommendations()`: Get popular listings
- `getSimilarListings()`: Get similar listings

### Host Services

#### Listing Service (`src/pages/Host/services/listing.js`)
- `createListing()`: Create new listing

#### Coupon Service (`src/pages/Host/services/couponService.js`)
- `createCoupon()`: Create new coupon
- `getHostCoupons()`: Get host's coupons
- `getCouponById()`: Get coupon by ID
- `updateCoupon()`: Update coupon
- `deleteCoupon()`: Delete coupon
- `validateCoupon()`: Validate coupon code
- `incrementCouponUsage()`: Increment coupon usage

#### Draft Service (`src/pages/Host/services/draftService.js`)
- `saveDraft()`: Save listing draft
- `loadDraft()`: Load listing draft
- `getUserDrafts()`: Get user's drafts
- `deleteDraft()`: Delete draft
- `markDraftAsCompleted()`: Mark draft as completed
- `getDraftSummary()`: Get draft summary

#### Points Service (`src/pages/Host/services/pointsService.js`)
- `getHostPoints()`: Get host points
- `awardPointsToHost()`: Award points to host
- `deductPointsFromHost()`: Deduct points from host
- `getAllHostsWithPoints()`: Get all hosts with points
- `awardPointsForFirstListing()`: Award points for first listing
- `awardPointsForBookingConfirmed()`: Award points for confirmed booking
- `awardPointsForReview()`: Award points for review
- `awardBirthdayPoints()`: Award birthday points
- `awardMilestonePoints()`: Award milestone points
- `deductPointsForUnpublishedListing()`: Deduct points for unpublished listing
- `restorePointsForRepublishedListing()`: Restore points for republished listing
- `cashOutPoints()`: Cash out points to wallet
- `deductPointsForPayment()`: Deduct points for payment
- `checkPointsForPayment()`: Check if points sufficient for payment

#### Appeal Service (`src/pages/Host/services/appealService.js`)
- `submitAppeal()`: Submit appeal
- `getAllAppeals()`: Get all appeals
- `getAppealByHostId()`: Get appeal by host ID
- `updateAppealStatus()`: Update appeal status

### Admin Services

#### Cash Out Service (`src/pages/Admin/services/cashOutService.js`)
- `getAllCashOutRequests()`: Get all cash-out requests
- `getUserCashOutRequests()`: Get user's cash-out requests
- `approveCashOutRequest()`: Approve cash-out request
- `rejectCashOutRequest()`: Reject cash-out request

#### Earnings Service (`src/pages/Admin/services/earningsService.js`)
- `autoCompleteBookings()`: Auto-complete bookings
- `releaseHostEarnings()`: Release host earnings
- `getPendingEarnings()`: Get pending earnings
- `getReleasedEarningsSummary()`: Get released earnings summary
- `getEarningsReleaseHistory()`: Get earnings release history

#### Refund Service (`src/pages/Admin/services/refundService.js`)
- `getPendingRefunds()`: Get pending refunds
- `processRefund()`: Process refund

#### Policy Service (`src/pages/Admin/services/policyService.js`)
- `getAllPolicies()`: Get all policies
- `getPolicyById()`: Get policy by ID
- `getActivePolicyByType()`: Get active policy by type
- `savePolicy()`: Save policy
- `deletePolicy()`: Delete policy
- `togglePolicyStatus()`: Toggle policy status
- `initializeDefaultPolicies()`: Initialize default policies
- `subscribeToActivePolicies()`: Subscribe to active policies
- `getActiveFAQs()`: Get active FAQs

#### Report Service (`src/pages/Admin/services/reportService.js`)
- `exportToPDF()`: Export data to PDF
- `generateComprehensiveReport()`: Generate comprehensive report
- `generateBookingsReport()`: Generate bookings report
- `generateServiceFeesReport()`: Generate service fees report
- `generatePaymentsReport()`: Generate payments report
- `generateAnalyticsReport()`: Generate analytics report
- `generateComplianceReport()`: Generate compliance report
- `getReportData()`: Get report data
- `generateReport()`: Generate report

#### Platform Settings Service (`src/pages/Admin/services/platformSettingsService.js`)
- `getPlatformSettings()`: Get platform settings
- `updatePlatformSettings()`: Update platform settings
- `getAdminPayPalEmail()`: Get admin PayPal email
- `updateAdminPayPalEmail()`: Update admin PayPal email

### Common Services

#### GetPay Service (`src/pages/Common/services/getpayService.js`)
- `getAdminUserId()`: Get admin user ID
- `getWalletBalance()`: Get wallet balance
- `initializeWallet()`: Initialize wallet
- `cashInFromPayPal()`: Cash in from PayPal
- `deductFromWallet()`: Deduct from wallet
- `addToWallet()`: Add to wallet
- `getWalletTransactions()`: Get wallet transactions
- `hasSufficientBalance()`: Check sufficient balance
- `cashOutToPayPal()`: Cash out to PayPal

---

## Authentication & Security

### Authentication Flow

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

### Authorization

#### Role-Based Access Control
- **Guest**: Can browse, book, review
- **Host**: Can create listings, manage bookings, earn (requires subscription)
- **Admin**: Full platform access

#### Route Protection
Routes are protected based on authentication and role requirements.

### Security Features

#### Authentication Security
- Firebase Authentication handles password hashing
- Email verification required
- Password reset tokens expire (1 hour)
- Session management

#### Data Security
- Firestore security rules
- Storage security rules
- Input validation
- XSS prevention
- CSRF protection

#### Payment Security
- PayPal handles payment processing
- No credit card data stored
- Transaction verification
- Secure API communication

#### Best Practices
- Environment variables for secrets
- HTTPS only
- Input sanitization
- Error handling without exposing details
- Regular security updates

---

## Installation & Setup

### Prerequisites

#### Required Software
- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher (comes with Node.js)
- **Git**: For version control
- **Firebase CLI**: For deployment
- **Code Editor**: VS Code recommended

#### Required Accounts
- **Firebase Account**: [firebase.google.com](https://firebase.google.com)
- **EmailJS Account**: [emailjs.com](https://emailjs.com)
- **PayPal Developer Account**: [developer.paypal.com](https://developer.paypal.com)

#### System Requirements
- **Operating System**: Windows, macOS, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: At least 500MB free space
- **Internet Connection**: Required for dependencies and Firebase

### Local Development Setup

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd getaways
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Configure Environment Variables
Create a `.env` file in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# EmailJS Configuration
VITE_EMAILJS_AUTH_SERVICE_ID=your_auth_service_id
VITE_EMAILJS_BOOKING_SERVICE_ID=your_booking_service_id
VITE_EMAILJS_AUTH_PUBLIC_KEY=your_auth_public_key
VITE_EMAILJS_BOOKING_PUBLIC_KEY=your_booking_public_key
VITE_EMAILJS_VERIFY_TEMPLATE_ID=your_verify_template_id
VITE_EMAILJS_RESET_TEMPLATE_ID=your_reset_template_id
VITE_EMAILJS_BOOKING_SUCCESS_TEMPLATE_ID=your_booking_template_id
VITE_EMAILJS_CANCELLATION_TEMPLATE_ID=your_cancellation_template_id

# PayPal Configuration
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id

# Support Configuration
VITE_SUPPORT_EMAIL=support@getaways.com
VITE_LOGO_URL=your_logo_url
```

#### 4. Run Development Server
```bash
npm run dev
```

The application should start on `http://localhost:5173`

### Firebase Configuration

#### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: "Getaways"
4. Enable Google Analytics (optional)
5. Click "Create project"

#### 2. Enable Firebase Services

**Authentication:**
1. Go to "Authentication" → "Get started"
2. Enable "Email/Password" provider
3. Enable "Google" provider
4. Add authorized domains

**Firestore Database:**
1. Go to "Firestore Database" → "Create database"
2. Start in "Production mode"
3. Choose location
4. Click "Enable"

**Storage:**
1. Go to "Storage" → "Get started"
2. Start in "Production mode"
3. Use default security rules
4. Choose location
5. Click "Done"

**Hosting:**
1. Go to "Hosting" → "Get started"
2. Follow setup instructions
3. Install Firebase CLI: `npm install -g firebase-tools`
4. Login: `firebase login`
5. Initialize: `firebase init hosting`

### EmailJS Configuration

#### 1. Create EmailJS Account
1. Go to [EmailJS](https://www.emailjs.com)
2. Sign up for free account
3. Verify email

#### 2. Create Email Services
1. Go to "Email Services"
2. Add service (Gmail, Outlook, etc.)
3. Connect your email account
4. Note Service ID

#### 3. Create Email Templates
1. Go to "Email Templates"
2. Create templates for:
   - Email Verification
   - Password Reset
   - Booking Confirmation
   - Cancellation
   - Subscription Success
3. Note Template IDs

#### 4. Get Public Key
1. Go to "Account" → "General"
2. Copy Public Key

### PayPal Configuration

#### 1. Create PayPal Developer Account
1. Go to [PayPal Developer](https://developer.paypal.com)
2. Sign up for account
3. Create app

#### 2. Get Client ID
1. Go to "My Apps & Credentials"
2. Create new app
3. Copy Client ID (for sandbox or live)

#### 3. Configure PayPal Settings
- Use sandbox for development
- Use live for production
- Update Client ID in environment variables

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

---

## Deployment

### Firebase Hosting Deployment

#### 1. Build Project
```bash
npm run build
```

#### 2. Deploy to Firebase
```bash
firebase deploy --only hosting
```

#### 3. Verify Deployment
- Check Firebase Hosting dashboard
- Visit deployed URL
- Test all features

### Firebase Configuration File

`firebase.json`:
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

### Environment Variables for Production

Ensure all environment variables are set in your hosting environment or build process.

---

## Testing

### Testing Overview

The Getaways Platform uses **Selenium IDE** and **Selenium WebDriver** for comprehensive automated testing. The test suite covers all major features across Guest, Host, and Admin roles, ensuring platform reliability and functionality.

### Test Framework & Tools

- **Primary Tool**: Selenium IDE (Browser Extension)
- **Test Runner**: Selenium WebDriver with Mocha
- **Browser**: Chrome (Headless mode for automation)
- **Test Language**: JavaScript
- **Reporting**: HTML and JSON reports with screenshots

### Test Execution Summary

**Latest Test Run**: November 18, 2025  
**Test Environment**: Production (https://getaways-official.firebaseapp.com)

#### Overall Test Results

- **Total Test Cases**: 27
- **Passed**: 24 (88.89%)
- **Failed**: 3 (11.11%)
- **Pass Rate**: **88.89%** ✅ (Exceeds 85% requirement)
- **Total Screenshots Captured**: 27
- **Total Execution Time**: ~3 minutes

### Test Results by Category

#### 1. Authentication Tests (8 tests)
**Status**: 7 Passed, 1 Failed (87.50% Pass Rate)

| Test ID | Test Case | Status |
|---------|-----------|--------|
| TC-AUTH-001 | Load Homepage | ✅ PASSED |
| TC-AUTH-002 | Navigate to Login Page | ✅ PASSED |
| TC-AUTH-003 | Display Login Form Elements | ✅ PASSED |
| TC-AUTH-004 | Navigate to Signup Page | ✅ PASSED |
| TC-AUTH-005 | Display Signup Form Elements | ✅ PASSED |
| TC-AUTH-006 | Show Validation Error | ✅ PASSED |
| TC-AUTH-007 | Navigate to Password Reset | ✅ PASSED |
| TC-AUTH-008 | Display Password Reset Form | ❌ FAILED |

**Failed Test Details:**
- **TC-AUTH-008**: Password reset form elements not found. Minor issue requiring investigation.

#### 2. Guest Features Tests (10 tests)
**Status**: 10 Passed, 0 Failed (100% Pass Rate) ✅

| Test ID | Test Case | Status |
|---------|-----------|--------|
| TC-GUEST-001 | Load Accommodations Page | ✅ PASSED |
| TC-GUEST-002 | Load Experiences Page | ✅ PASSED |
| TC-GUEST-003 | Load Services Page | ✅ PASSED |
| TC-GUEST-004 | Display Search Functionality | ✅ PASSED |
| TC-GUEST-005 | Navigate to Guest Dashboard | ✅ PASSED |
| TC-GUEST-006 | Display Listings | ✅ PASSED |
| TC-GUEST-007 | Navigate to Bookings | ✅ PASSED |
| TC-GUEST-008 | Navigate to Favorites | ✅ PASSED |
| TC-GUEST-009 | Display Navigation Menu | ✅ PASSED |
| TC-GUEST-010 | Display Footer | ✅ PASSED |

**Notes**: All guest features are working correctly. Navigation, search, and dashboard functionality are fully operational.

#### 3. Host Features Tests (7 tests)
**Status**: 6 Passed, 1 Failed (85.71% Pass Rate)

| Test ID | Test Case | Status |
|---------|-----------|--------|
| TC-HOST-001 | Navigate to Host Dashboard | ✅ PASSED |
| TC-HOST-002 | Navigate to Host Listings | ✅ PASSED |
| TC-HOST-003 | Navigate to Host Calendar | ✅ PASSED |
| TC-HOST-004 | Navigate to Hosting Steps | ✅ PASSED |
| TC-HOST-005 | Display Host Dashboard Elements | ✅ PASSED |
| TC-HOST-006 | Navigate to Account Settings | ✅ PASSED |
| TC-HOST-007 | Navigate to E-Wallet Page | ❌ FAILED |

**Failed Test Details:**
- **TC-HOST-007**: E-wallet page navigation failed. URL routing issue - may require authentication or different URL path.

#### 4. Admin Features Tests (2 tests)
**Status**: 1 Passed, 1 Failed (50.00% Pass Rate)

| Test ID | Test Case | Status |
|---------|-----------|--------|
| TC-ADMIN-001 | Navigate to Admin Dashboard | ❌ FAILED |
| TC-ADMIN-002 | Display Admin Dashboard Elements | ✅ PASSED |

**Failed Test Details:**
- **TC-ADMIN-001**: Admin dashboard navigation failed. Requires admin authentication.

### Selenium IDE Test Suite

#### Selenium IDE Project File

**Location**: `tests/getaways-test-suite.side`

The project includes a complete Selenium IDE test suite that can be opened and executed in the Selenium IDE browser extension.

#### How to Use Selenium IDE

1. **Install Selenium IDE Extension**:
   - Open Microsoft Edge or Chrome
   - Go to browser extensions store
   - Search for "Selenium IDE"
   - Install the extension

2. **Open Selenium IDE**:
   - Click the Selenium IDE icon in browser toolbar
   - Or run: `tests\open-selenium-ide.bat`

3. **Load Test Suite**:
   - Click "Open an existing project"
   - Navigate to: `tests\getaways-test-suite.side`
   - Click Open

4. **View Test Cases**:
   - All test cases are listed in the left sidebar
   - Click on any test case to view commands
   - Each test shows: Command, Target, and Value columns

5. **Run Tests**:
   - Click "Run all tests" to execute entire suite
   - Or click individual test to run specific test case

#### Selenium IDE Screenshots

**Location**: `tests/test-results/selenium-ide-real-screenshots/`

Screenshots of Selenium IDE with test cases and steps are available for:

- ✅ TC-AUTH-001: Load Homepage (`TC-AUTH-001- Load Homepage.png`)
- ✅ TC-AUTH-002: Navigate to Login Page (`TC-AUTH-002- Navigate to Login Page.png`)
- ✅ TC-AUTH-003: Display Login Form Elements (`TC-AUTH-003- Display Login Form Elements.png`)
- ✅ TC-AUTH-004: Navigate to Signup Page (`TC-AUTH-004- Navigate to Signup Page.png`)
- ✅ TC-GUEST-001: Load Accommodations Page (`TC-GUEST-001- Load Accommodations Page.png`)
- ✅ TC-GUEST-002: Load Experiences Page (`TC-GUEST-002- Load Experiences Page.png`)
- ✅ TC-GUEST-003: Load Services Page (`TC-GUEST-003- Load Services Page.png`)
- ✅ TC-HOST-001: Navigate to Host Dashboard (`TC-HOST-001- Navigate to Host Dashboard.png`)
- ✅ TC-HOST-002: Navigate to Host Listings (`TC-HOST-002- Navigate to Host Listings.png`)
- ✅ TC-ADMIN-001: Navigate to Admin Dashboard (`TC-ADMIN-001- Navigate to Admin Dashboard.png`)

Each screenshot shows:
- Selenium IDE interface in light mode
- Test case name in sidebar
- Command, Target, and Value columns
- Complete test steps and commands
- Test execution controls
- All test commands visible in the editor

**Total Selenium IDE Screenshots**: 10 screenshots showing test cases with complete command details

#### Sample Selenium IDE Screenshots

Below are sample screenshots showing Selenium IDE test cases with commands and steps:

**TC-AUTH-001: Load Homepage - Selenium IDE Test Case**
![TC-AUTH-001 Selenium IDE](tests/test-results/selenium-ide-real-screenshots/TC-AUTH-001- Load Homepage.png)

**TC-AUTH-002: Navigate to Login Page - Selenium IDE Test Case**
![TC-AUTH-002 Selenium IDE](tests/test-results/selenium-ide-real-screenshots/TC-AUTH-002- Navigate to Login Page.png)

**TC-GUEST-001: Load Accommodations Page - Selenium IDE Test Case**
![TC-GUEST-001 Selenium IDE](tests/test-results/selenium-ide-real-screenshots/TC-GUEST-001- Load Accommodations Page.png)

**TC-HOST-001: Navigate to Host Dashboard - Selenium IDE Test Case**
![TC-HOST-001 Selenium IDE](tests/test-results/selenium-ide-real-screenshots/TC-HOST-001- Navigate to Host Dashboard.png)

**TC-ADMIN-001: Navigate to Admin Dashboard - Selenium IDE Test Case**
![TC-ADMIN-001 Selenium IDE](tests/test-results/selenium-ide-real-screenshots/TC-ADMIN-001- Navigate to Admin Dashboard.png)

### Page Screenshots (Getaways Platform)

**Location**: `tests/test-results/screenshots/`

Screenshots of actual Getaways platform pages are captured for each test execution:

#### Screenshot Naming Convention
```
{status}-{test-id}--{test-description}-{timestamp}.png
```

**Examples:**
- `passed-tc-auth-001--should-load-homepage-successfully-1763414131299.png`
- `passed-tc-guest-004--should-display-search-functionality-on-homepage-1763414206723.png`
- `failed-tc-auth-008--should-display-password-reset-form-1763414190096.png`

#### Screenshot Statistics

- **Total Screenshots**: 27 (one per test case)
- **Screenshot Format**: PNG
- **Resolution**: 1920x1080 (Full HD)
- **Average Size**: ~165 KB per screenshot
- **Total Size**: ~5.76 MB

#### Screenshot Content

Each screenshot captures:
- Full browser window
- Complete page content
- URL visible in address bar
- UI elements and interactions
- Final state after test execution
- Visual proof of test execution

#### Latest Screenshot Examples (November 18, 2025)

**Latest Test Run Screenshots** (from most recent test execution):
- `passed-tc-auth-001--should-load-homepage-successfully-1763414131299.png` - Homepage loaded successfully
- `passed-tc-guest-004--should-display-search-functionality-on-homepage-1763414206723.png` - Search functionality displayed
- `passed-tc-guest-010--should-display-footer-1763414218669.png` - Footer displayed
- `passed-tc-host-001--should-navigate-to-host-dashboard-1763414224805.png` - Host dashboard navigation
- `passed-tc-admin-002--should-display-admin-dashboard-elements-1763414126491.png` - Admin dashboard elements
- `failed-tc-auth-008--should-display-password-reset-form-1763414190096.png` - Password reset form issue
- `failed-tc-host-007--should-navigate-to-e-wallet-page-1763414264796.png` - E-wallet navigation issue

**All screenshots are timestamped** with the exact execution time for traceability.

#### Sample Getaways Platform Page Screenshots

Below are sample screenshots from the latest test execution showing actual Getaways platform pages:

**TC-AUTH-001: Homepage Loaded Successfully**
![Homepage Screenshot](tests/test-results/screenshots/passed-tc-auth-001--should-load-homepage-successfully-1763414131299.png)

**TC-GUEST-004: Search Functionality Displayed**
![Search Functionality Screenshot](tests/test-results/screenshots/passed-tc-guest-004--should-display-search-functionality-on-homepage-1763414206723.png)

**TC-GUEST-001: Accommodations Page**
![Accommodations Page Screenshot](tests/test-results/screenshots/passed-tc-guest-001--should-load-accommodations-page-1763414194368.png)

**TC-HOST-001: Host Dashboard**
![Host Dashboard Screenshot](tests/test-results/screenshots/passed-tc-host-001--should-navigate-to-host-dashboard-1763414224805.png)

**TC-ADMIN-002: Admin Dashboard Elements**
![Admin Dashboard Screenshot](tests/test-results/screenshots/passed-tc-admin-002--should-display-admin-dashboard-elements-1763414126491.png)

**TC-AUTH-008: Password Reset Form (Failed Test)**
![Password Reset Form Screenshot](tests/test-results/screenshots/failed-tc-auth-008--should-display-password-reset-form-1763414190096.png)

### Test Structure

The test suite is organized as follows:

```
tests/
├── admin/
│   └── admin-features.test.js          # Admin feature tests
├── guest/
│   └── guest-features.test.js          # Guest feature tests
├── host/
│   └── host-features.test.js           # Host feature tests
├── auth/
│   └── authentication.test.js          # Authentication tests
├── config/
│   └── test-config.js                  # Test configuration
├── utils/
│   ├── driver-setup.js                 # WebDriver setup
│   ├── helpers.js                      # Helper functions
│   └── test-reporter.js                # Test report generator
├── getaways-test-suite.side            # Selenium IDE project file
├── test-results/
│   ├── reports/
│   │   ├── test-report-*.html          # HTML test reports
│   │   └── test-report-*.json          # JSON test reports
│   ├── screenshots/
│   │   ├── passed-*.png                # Screenshots of passed tests
│   │   └── failed-*.png                # Screenshots of failed tests
│   └── selenium-ide-real-screenshots/
│       ├── TC-AUTH-001-*.png           # Selenium IDE screenshots
│       └── ...
└── package.json                        # Test dependencies
```

### Running Tests

#### Prerequisites

1. **Node.js** (v18 or higher)
2. **Chrome Browser** (for ChromeDriver)
3. **Selenium IDE Extension** (optional, for manual testing)

#### Installation

```bash
cd tests
npm install
```

#### Run All Tests

```bash
npm test
```

#### Run Tests by Category

```bash
# Authentication tests only
npm run test:auth

# Guest feature tests only
npm run test:guest

# Host feature tests only
npm run test:host

# Admin feature tests only
npm run test:admin
```

#### Generate Test Report

```bash
npm run test:report
```

### Test Configuration

**Configuration File**: `tests/config/test-config.js`

Key settings:
- **Base URL**: https://getaways-official.firebaseapp.com
- **Browser**: Chrome (Headless mode)
- **Timeouts**: 
  - Implicit: 10 seconds
  - Page Load: 30 seconds
  - Element: 10 seconds
- **Screenshots**: Enabled for all tests (passed and failed)

### Test Reports

#### HTML Reports

**Location**: `tests/test-results/reports/test-report-*.html`

Features:
- Visual test summary with color-coded status
- Detailed test case results
- Pass rate calculation
- Execution duration
- Screenshot references

#### JSON Reports

**Location**: `tests/test-results/reports/test-report-*.json`

Features:
- Machine-readable test results
- Complete test data
- Structured format for analysis
- Integration with CI/CD tools

### Test Coverage

#### Features Tested

**Authentication**:
- Homepage loading
- Login page navigation and form elements
- Signup page navigation and form elements
- Form validation
- Password reset functionality

**Guest Features**:
- Accommodations, Experiences, Services pages
- Search functionality
- Guest dashboard
- Listings display
- Bookings page
- Favorites page
- Navigation menu
- Footer

**Host Features**:
- Host dashboard
- Host listings
- Host calendar
- Hosting steps
- Dashboard elements
- Account settings
- E-wallet access

**Admin Features**:
- Admin dashboard navigation
- Dashboard elements display

### Known Issues

#### High Priority

1. **TC-AUTH-008: Password Reset Form**
   - **Issue**: Password reset form elements not displaying
   - **Impact**: Users may have difficulty resetting passwords
   - **Recommendation**: Verify password reset form implementation

#### Medium Priority

1. **TC-HOST-007: E-Wallet Navigation**
   - **Issue**: E-wallet page URL routing
   - **Impact**: Hosts may have difficulty accessing e-wallet
   - **Recommendation**: Verify correct URL path and routing

2. **TC-ADMIN-001: Admin Dashboard Navigation**
   - **Issue**: Requires admin authentication
   - **Impact**: Test may need authentication setup
   - **Recommendation**: Add authentication to test setup

### Test Evidence

All test executions are documented with:

1. ✅ **27 Screenshots** - Visual proof of each test execution
2. ✅ **HTML Test Reports** - Comprehensive test summary
3. ✅ **JSON Test Reports** - Machine-readable results
4. ✅ **Selenium IDE Project File** - `.side` file for Selenium IDE
5. ✅ **Selenium IDE Screenshots** - Screenshots of test cases in Selenium IDE
6. ✅ **Page Screenshots** - Screenshots of Getaways platform pages

### Continuous Integration

Tests can be integrated into CI/CD pipelines:

```bash
# Install dependencies
npm install

# Run tests in headless mode
HEADLESS=true npm test

# Generate report
npm run test:report
```

### Test Maintenance

#### Adding New Tests

1. Create test file in appropriate directory (`auth/`, `guest/`, `host/`, `admin/`)
2. Follow existing test structure
3. Use helper functions from `utils/helpers.js`
4. Add test results to reporter
5. Update Selenium IDE project file if needed

#### Updating Tests

- Update test files when features change
- Update Selenium IDE project file
- Regenerate screenshots if UI changes
- Update test reports

### Test Documentation

Additional test documentation:
- **README.md**: Test suite overview
- **TEST_SUMMARY_REPORT.md**: Detailed test summary
- **TEST_EVIDENCE_SUMMARY.md**: Test evidence documentation
- **OPEN_SELENIUM_IDE_GUIDE.md**: Selenium IDE usage guide
- **SCREENSHOTS_GUIDE.md**: Screenshot capture guide

---

## Troubleshooting

### Common Issues

#### 1. Firebase Connection Issues
- **Problem**: Cannot connect to Firebase
- **Solution**: 
  - Check environment variables
  - Verify Firebase project settings
  - Check network connection
  - Verify Firebase API keys

#### 2. Email Not Sending
- **Problem**: Verification emails not received
- **Solution**:
  - Check EmailJS configuration
  - Verify email service connection
  - Check spam folder
  - Verify template IDs

#### 3. PayPal Payment Issues
- **Problem**: PayPal payments not working
- **Solution**:
  - Check PayPal Client ID
  - Verify PayPal app settings
  - Check browser console for errors
  - Verify PayPal account status

#### 4. Image Upload Issues
- **Problem**: Images not uploading
- **Solution**:
  - Check Firebase Storage rules
  - Verify file size limits (5MB)
  - Check image format (JPG, PNG, WebP)
  - Verify storage bucket configuration

#### 5. Authentication Issues
- **Problem**: Cannot login or sign up
- **Solution**:
  - Check Firebase Authentication settings
  - Verify email/password provider enabled
  - Check email verification status
  - Clear browser cache

### Getting Help

- **Email**: support@getaways.com
- **Documentation**: See other documentation files
- **Issues**: Check troubleshooting sections in documentation

---

## Additional Resources

### Documentation Files

1. **README.md**: Project overview and quick start
2. **USER_MANUAL.md**: Complete user guide
3. **TECHNICAL_DOCUMENTATION.md**: Technical architecture details
4. **INSTALLATION_GUIDE.md**: Setup and installation
5. **FEATURE_DOCUMENTATION.md**: Detailed feature documentation
6. **QUICK_REFERENCE.md**: Quick reference guide
7. **DOCUMENTATION_INDEX.md**: Documentation index

### External Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **React Documentation**: https://react.dev
- **EmailJS Documentation**: https://www.emailjs.com/docs
- **PayPal Developer Docs**: https://developer.paypal.com/docs
- **Tailwind CSS Documentation**: https://tailwindcss.com/docs
- **React Router Documentation**: https://reactrouter.com

---

## Version History

### Version 1.0 (2024)
- Initial release
- Complete platform functionality
- Guest, Host, and Admin features
- Payment system integration
- Points and rewards system
- Coupon system
- Notification system
- Comprehensive documentation

---

## License

[Your License Here]

---

## Support

For support and questions:
- **Email**: support@getaways.com
- **Documentation**: See documentation files in this repository
- **Issues**: Check troubleshooting sections in documentation

---

**Getaways Platform** - Your trusted travel companion

*This documentation is comprehensive and covers all aspects of the Getaways platform. For specific details, refer to the individual documentation files mentioned in the Additional Resources section.*

