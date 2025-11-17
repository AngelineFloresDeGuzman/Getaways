# GETAWAYS PLATFORM

## Overview

Getaways is a comprehensive online marketplace platform that connects travelers with hosts offering accommodations, experiences, and services. The platform facilitates bookings, payments, communications, and reviews in a seamless, user-friendly environment.

## Platform Features

- **Multi-Category Listings**: Accommodations, Experiences, and Services
- **Advanced Search**: Location-based search with flexible date options
- **Secure Payments**: GetPay Wallet and PayPal integration
- **Real-time Messaging**: Direct communication between guests and hosts
- **Review System**: Comprehensive rating and review system
- **Points & Rewards**: Host rewards program
- **Coupon System**: Discount and promotion management
- **Admin Dashboard**: Complete platform management

## User Roles

- **Guests**: Browse, search, book, and review listings
- **Hosts**: Create and manage listings, handle bookings, earn income
- **Admins**: Manage platform operations, users, bookings, and policies

## Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Payments**: PayPal SDK, GetPay Wallet
- **Emails**: EmailJS
- **Maps**: Leaflet/OpenStreetMap

## Documentation

This project includes comprehensive documentation:

1. **[USER_MANUAL.md](./USER_MANUAL.md)** - Complete user guide for all user roles
   - Getting started
   - Guest user guide
   - Host user guide
   - Admin user guide
   - Common features
   - Troubleshooting

2. **[TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)** - Technical documentation
   - System architecture
   - Technology stack
   - Database structure
   - API integration
   - Security
   - Deployment

3. **[INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md)** - Setup and installation
   - Prerequisites
   - Local development setup
   - Firebase configuration
   - EmailJS configuration
   - PayPal configuration
   - Deployment

4. **[FEATURE_DOCUMENTATION.md](./FEATURE_DOCUMENTATION.md)** - Feature documentation
   - Core features
   - Guest features
   - Host features
   - Admin features
   - Payment features
   - Communication features

## Quick Start

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- Firebase account
- EmailJS account
- PayPal Developer account

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd getaways
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
Create a `.env` file with required configuration (see INSTALLATION_GUIDE.md)

4. Run development server
```bash
npm run dev
```

5. Build for production
```bash
npm run build
```

6. Deploy to Firebase
```bash
firebase deploy --only hosting
```

## Project Structure

```
getaways/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   │   ├── Guest/      # Guest pages
│   │   ├── Host/       # Host pages
│   │   ├── Admin/      # Admin pages
│   │   ├── Auth/       # Authentication pages
│   │   └── Common/     # Shared pages
│   ├── lib/            # Library configurations
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   └── services/       # Business logic services
├── public/             # Static assets
├── dist/               # Production build
└── docs/               # Documentation files
```

## Key Features

### For Guests
- Advanced search and filtering
- Booking management
- Favorites/wishlist
- Reviews and ratings
- Messaging with hosts
- GetPay Wallet integration

### For Hosts
- Multi-step listing creation
- Booking management
- Earnings tracking
- Points and rewards
- Coupon creation
- Analytics dashboard

### For Admins
- User management
- Booking oversight
- Refund processing
- Earnings management
- Points management
- Platform analytics
- Policy management

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables

See [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) for complete environment variable configuration.

## Support

For support and questions:
- Email: support@getaways.com
- Documentation: See documentation files in this repository
- Issues: Check troubleshooting sections in documentation

## License

[Your License Here]

## Version

**Current Version**: 1.0  
**Last Updated**: 2024

---

## Documentation Index

### For Users
- [User Manual](./USER_MANUAL.md) - Complete guide for using the platform

### For Developers
- [Technical Documentation](./TECHNICAL_DOCUMENTATION.md) - System architecture and technical details
- [Installation Guide](./INSTALLATION_GUIDE.md) - Setup and configuration
- [Feature Documentation](./FEATURE_DOCUMENTATION.md) - Detailed feature documentation

---

**Getaways Platform** - Your trusted travel companion

