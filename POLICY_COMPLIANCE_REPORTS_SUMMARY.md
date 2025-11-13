# Policy, Compliance & Reports - Complete Codebase Summary

## 📋 Table of Contents
1. [Policy Types & Structure](#policy-types--structure)
2. [Cancellation Rules](#cancellation-rules)
3. [Refund Policies](#refund-policies)
4. [Rules & Regulations](#rules--regulations)
5. [Report Types](#report-types)
6. [File Locations](#file-locations)
7. [Default Policies Content](#default-policies-content)

---

## 🏗️ Policy Types & Structure

### Policy Types Defined
Located in: `src/pages/Admin/services/policyService.js`

**Available Policy Types:**
1. **CANCELLATION_GUEST** - Guest Cancellation Policy
2. **CANCELLATION_HOST** - Host Cancellation Policy
3. **TERMS_CONDITIONS** - Terms & Conditions
4. **PRIVACY_POLICY** - Privacy Policy
5. **HOST_RULES** - Host Rules & Regulations
6. **GUEST_RULES** - Guest Rules & Regulations
7. **COMMUNITY_STANDARDS** - Community Standards
8. **REFUND_POLICY** - Refund Policy
9. **SERVICE_TERMS** - Service Terms
10. **EXPERIENCE_TERMS** - Experience Terms
11. **FAQ** - Frequently Asked Questions

### Policy Management
- **Admin Interface**: `src/pages/Admin/components/PolicyManagement.jsx`
- **Admin Dashboard Tab**: "Policy & Compliance" (Compliance tab)
- **Storage**: Firestore collection `policies`
- **Features**:
  - Create, Edit, Delete policies
  - Toggle Active/Inactive status
  - Filter by policy type
  - Version control
  - Markdown content support
  - Applies to Guest/Host/Both

---

## 🚫 Cancellation Rules

### Guest Cancellation Rules
**Location**: `src/pages/Guest/services/bookingService.js` (lines 839-1030)

**Current Implementation:**
- **Pending Bookings**: Full refund (100%)
- **Confirmed Bookings**: Half refund (50%)
- **Cancelled/Completed Bookings**: Cannot be cancelled

**Refund Processing:**
- Refunds are marked as `refundPending: true` when guest cancels
- Admin must process refunds manually via `refundService.js`
- Refund amount stored in booking document:
  - `refundAmount`: Amount to refund to guest
  - `refundType`: `'full_refund'` or `'half_refund'` or `'no_refund'`
  - `hostRefundAmount`: Amount host must return (if earnings were released)

**Default Policy Content** (from `policyService.js`):
```
## Guest Cancellation Policy

### Cancellation Timeframes

**Full Refund:**
- Cancellations made 48 hours or more before check-in: 100% refund
- Cancellations made 7 days or more before check-in for long-term stays (28+ days): 100% refund

**Partial Refund:**
- Cancellations made between 24-48 hours before check-in: 50% refund
- Cancellations made less than 24 hours before check-in: No refund

**Special Circumstances:**
- Extenuating circumstances (natural disasters, medical emergencies) may qualify for full refunds
- Contact Getaways support for review of special circumstances

### Refund Processing
- Refunds are processed within 5-10 business days
- Refunds are returned to the original payment method
- Service fees are non-refundable
```

**Note**: The actual implementation differs from the policy text. Current code:
- Pending bookings → Full refund
- Confirmed bookings → Half refund
- No time-based logic (48 hours, 24 hours, etc.)

### Host Cancellation Rules
**Default Policy Content**:
```
## Host Cancellation Policy

### Host Cancellation Rules

**Host-Initiated Cancellations:**
- Hosts should avoid cancellations as they negatively impact guest experience
- Cancellations may result in penalties and affect host ratings

**Penalties:**
- First cancellation: Warning and potential calendar blocking
- Multiple cancellations: Listing may be removed from search results
- Severe cases: Account suspension or termination

**Valid Reasons for Host Cancellation:**
- Property damage or safety issues
- Natural disasters or emergencies
- Double bookings (system error)
- Guest violations of house rules

### Compensation for Guests
- Getaways will help guests find alternative accommodations
- Hosts may be required to compensate guests for inconvenience
- Full refunds are processed automatically for host cancellations
```

---

## 💰 Refund Policies

### Refund Service
**Location**: `src/pages/Admin/services/refundService.js`

**Functions:**
1. **`getPendingRefunds()`** - Gets all cancelled bookings with `refundPending: true`
2. **`processRefund(bookingId)`** - Processes refund for a cancelled booking

**Refund Processing Logic:**
1. **Check Booking Status**: Must be `cancelled` and `refundPending: true`
2. **Calculate Refund Amount**:
   - Full refund: `refundAmount = totalPrice`
   - Half refund: `refundAmount = totalPrice / 2`
3. **Handle Host Refund** (if earnings were released):
   - If `earningsReleased === true` and `refundType === 'half_refund'`:
     - Deduct `hostRefundAmount` from host wallet
     - Add `hostRefundAmount` to admin wallet
4. **Process Guest Refund**:
   - Deduct `refundAmount` from admin wallet
   - Add `refundAmount` to guest wallet
5. **Update Booking**:
   - Set `refundPending: false`
   - Set `refundProcessed: true`
   - Set `refundProcessedAt: timestamp`
   - Set `refundProcessedBy: 'admin'`

**Default Refund Policy Content**:
```
## Refund Policy

### Refund Eligibility
- Refunds are processed according to the cancellation policy
- Service fees are non-refundable
- Processing time: 5-10 business days

### Refund Methods
- Refunds are returned to the original payment method
- E-wallet refunds: Processed within 3-5 business days
- Credit card refunds: May take 7-10 business days to appear

### Non-Refundable Items
- Service fees
- Processing fees
- Completed bookings (unless canceled per policy)

### Dispute Resolution
- Contact Getaways support for refund disputes
- All disputes are reviewed within 48 hours
- Final decisions are made by Getaways administration
```

**Note**: Current implementation uses GetPay wallet system. Refunds are added to guest's wallet balance.

---

## 📜 Rules & Regulations

### Guest Rules & Regulations
**Default Policy Content**:
```
## Guest Rules & Regulations

### Booking Requirements
- Guests must be 18 years or older to book
- Accurate guest count must be provided
- Special requests should be communicated before booking

### Guest Responsibilities
- Respect the property and host's rules
- Leave property in good condition
- Report any issues immediately to the host
- Follow check-in and check-out procedures

### Prohibited Activities
- Bringing unauthorized guests
- Smoking in non-smoking properties
- Hosting parties or events without permission
- Damaging property or violating house rules

### Payment & Refunds
- Full payment is required at booking confirmation
- Refunds follow the cancellation policy
- Service fees are non-refundable
```

### Host Rules & Regulations
**Default Policy Content**:
```
## Host Rules & Regulations

### Listing Requirements
- All listings must be accurate and up-to-date
- Photos must accurately represent the property
- Pricing must be transparent with no hidden fees
- Availability calendars must be kept current

### Host Responsibilities
- Maintain property in safe and clean condition
- Respond to booking requests within 24 hours
- Provide accurate check-in instructions
- Be available for guest communication during stay

### Prohibited Activities
- False or misleading listings
- Discrimination based on race, religion, gender, or other protected characteristics
- Charging guests outside the platform
- Canceling confirmed bookings without valid reason

### Service Fees
- Hosts pay a 3.3% service fee on each booking
- Service fees are deducted from booking amount
- Fees are non-refundable
```

**Note**: Current financial model uses 10% host commission (not 3.3% service fee). This policy text may be outdated.

### Community Standards
**Default Policy Content**:
```
## Community Standards

### Respect & Inclusion
- Treat all members with respect and dignity
- No discrimination or harassment of any kind
- Foster an inclusive and welcoming environment

### Safety
- Report safety concerns immediately
- Follow all local laws and regulations
- Maintain safe and secure properties

### Honesty
- Provide accurate information
- Communicate clearly and honestly
- Honor commitments and agreements

### Privacy
- Respect others' privacy
- Do not share personal information without consent
- Follow data protection guidelines
```

### Terms & Conditions
**Default Policy Content**:
```
## Terms & Conditions

### Account Responsibility
- Users must provide accurate and up-to-date information during registration
- Each account is for personal use only and must not be shared
- Users are responsible for maintaining account security

### Bookings & Payments
- Guests are responsible for completing payments for bookings
- Hosts must provide truthful information about listings, including rates, amenities, and availability
- All prices are in Philippine Peso (₱) unless otherwise stated

### User Conduct
- Users must treat all members with respect
- Harassment, offensive content, or illegal activity is strictly prohibited
- Violations may result in account suspension or termination

### Intellectual Property
- All content on Getaways, including images, text, and designs, is owned by Getaways or its users
- Users grant Getaways license to use their content for platform purposes

### Limitation of Liability
- Getaways is not responsible for disputes between guests and hosts, property damages, or personal injury
- Users use the platform at their own risk
```

---

## 📊 Report Types

### Report Service
**Location**: `src/pages/Admin/services/reportService.js`

### Available Reports

#### 1. **Comprehensive Report** (`comprehensive`)
- **Summary**: Total users, active listings, total bookings, total reviews
- **Data**: All users, listings, bookings, reviews
- **Export**: Multiple CSV files (summary + bookings)

#### 2. **Bookings Report** (`bookings`)
- **Data**: All bookings with guest/host/listing details
- **Fields**: Booking ID, status, guest name/email, host name/email, listing title/category, check-in/out dates, prices, payment status
- **Export**: Single CSV file

#### 3. **Financial Report** (`financial`)
- **Data**: Service fees and subscription payments
- **Export**: Two CSV files:
  - Service fees by host
  - Subscription payments by user

#### 4. **Service Fees Report** (`service-fees`)
- **Data**: Host earnings and service fees (3.3% - **Note: Outdated, should be 10% commission**)
- **Fields**: Host ID, name, email, total bookings, total earnings, service fee
- **Export**: Single CSV file

#### 5. **Payments Report** (`payments`)
- **Data**: User subscription payments
- **Fields**: User ID, name, email, payment type, status, transaction ID, last payment date, PayPal details
- **Export**: Single CSV file

#### 6. **Users Report** (`users`)
- **Data**: All platform users
- **Fields**: User ID, first name, last name, email, roles, email verified, created at, last login
- **Export**: Single CSV file

#### 7. **Reviews Report** (`reviews`)
- **Data**: All reviews
- **Fields**: Review ID, listing ID/title, reviewer name/ID, rating, comment, created at
- **Export**: Single CSV file

#### 8. **Analytics Report** (`analytics`)
- **Data**: Review analytics and booking statistics
- **Export**: Multiple CSV files:
  - Reviews summary (total, average rating)
  - Best reviews (rating >= 4)
  - Lowest reviews (rating <= 2)
  - Booking statistics (total, pending, confirmed, completed, cancelled)

#### 9. **Hosts Report** (`hosts`)
- **Data**: Host performance and earnings
- **Fields**: Host ID, name, email, total bookings, total earnings, service fee, listings count, average rating, total reviews, joined date
- **Export**: Single CSV file

#### 10. **Compliance Report** (`compliance` or `violations`)
- **Data**: Policy violations and compliance issues
- **Types**:
  - Host Cancellations (bookings cancelled by host)
  - Low Ratings (reviews with rating <= 2)
- **Fields**: Violation type, booking/review ID, listing ID, guest/host ID, rating, comment, reason, cancelled at, created at
- **Export**: Single CSV file

### Report Generation
- **Admin Dashboard Location**: Reports tab (removed from menu, but code still exists)
- **Function**: `generateReport(reportType)`
- **Export Format**: CSV files with timestamp in filename
- **Example**: `bookings_report_2025-01-15.csv`

---

## 📁 File Locations

### Policy Management
- **Service**: `src/pages/Admin/services/policyService.js`
- **Component**: `src/pages/Admin/components/PolicyManagement.jsx`
- **Admin Dashboard**: `src/pages/Admin/AdminDashboard.jsx` (Compliance tab)

### Guest Policies
- **Page**: `src/pages/Guest/Policies.jsx`
- **URL**: `/guest/policies`
- **Footer Links**: `src/components/Footer.jsx`
- **Booking Request**: `src/pages/Guest/BookingRequest.jsx` (cancellation policy link)

### Host Policies
- **Page**: `src/pages/Host/Policies.jsx`
- **URL**: `/host/policies`
- **Service Onboarding**: `src/pages/Host/onboarding/ServiceWhatProvide.jsx`
- **Experience Onboarding**: `src/pages/Host/onboarding/ExperienceDetails.jsx`

### Cancellation & Refunds
- **Booking Cancellation**: `src/pages/Guest/services/bookingService.js` (`cancelBooking` function)
- **Refund Processing**: `src/pages/Admin/services/refundService.js`
- **Email Service**: `src/lib/emailService.js` (`sendCancellationEmail` function)

### Reports
- **Service**: `src/pages/Admin/services/reportService.js`
- **Admin Dashboard**: `src/pages/Admin/AdminDashboard.jsx` (Reports tab - code exists but menu item removed)

### Documentation
- **Testing Guide**: `POLICY_TESTING_GUIDE.md`
- **Email Template Guide**: `CANCELLATION_EMAIL_TEMPLATE_GUIDE.md`

---

## 📝 Default Policies Content

All default policies are initialized via `initializeDefaultPolicies()` in `policyService.js`:

1. **Guest Cancellation Policy** - Timeframes, refund percentages, special circumstances
2. **Host Cancellation Policy** - Penalties, valid reasons, guest compensation
3. **Terms & Conditions** - Account responsibility, bookings, user conduct, liability
4. **Host Rules & Regulations** - Listing requirements, responsibilities, prohibited activities
5. **Guest Rules & Regulations** - Booking requirements, responsibilities, prohibited activities
6. **Refund Policy** - Eligibility, methods, non-refundable items, dispute resolution
7. **Community Standards** - Respect, safety, honesty, privacy

**Note**: Service Terms and Experience Terms are policy types but don't have default content initialized.

---

## ⚠️ Important Notes

### Financial Model Discrepancies
1. **Service Fee vs Commission**:
   - Policy text mentions "3.3% service fee"
   - Current implementation uses "10% host commission"
   - **Action Needed**: Update policy text to reflect current model

2. **Guest Service Fee**:
   - Policy mentions "Service fees are non-refundable"
   - Current implementation: **No guest service fees** (guests only pay booking amount)
   - **Action Needed**: Update refund policy to remove guest service fee references

### Cancellation Logic Discrepancies
1. **Time-based Rules**:
   - Policy mentions "48 hours before check-in", "24-48 hours", etc.
   - Current implementation: Only checks booking status (pending vs confirmed)
   - **Action Needed**: Either implement time-based logic or update policy text

### Report Discrepancies
1. **Service Fees Report**:
   - Calculates 3.3% service fee
   - Should calculate 10% commission instead
   - **Action Needed**: Update `generateServiceFeesReport()` function

---

## 🔍 Key Functions Reference

### Policy Service (`policyService.js`)
- `getAllPolicies()` - Get all policies
- `getPolicyById(policyId)` - Get specific policy
- `getActivePolicyByType(policyType)` - Get active policy by type
- `savePolicy(policyData, policyId)` - Create/update policy
- `deletePolicy(policyId)` - Delete policy
- `togglePolicyStatus(policyId, isActive)` - Activate/deactivate policy
- `initializeDefaultPolicies()` - Initialize default policies
- `getActiveFAQs()` - Get all active FAQs

### Refund Service (`refundService.js`)
- `getPendingRefunds()` - Get all pending refunds
- `processRefund(bookingId)` - Process refund for booking

### Booking Service (`bookingService.js`)
- `cancelBooking(bookingId)` - Cancel guest booking with refund logic

### Report Service (`reportService.js`)
- `generateReport(reportType)` - Main report generation function
- `generateComprehensiveReport()` - Comprehensive report
- `generateBookingsReport()` - Bookings report
- `generateServiceFeesReport()` - Service fees report
- `generatePaymentsReport()` - Payments report
- `generateAnalyticsReport()` - Analytics report
- `generateComplianceReport()` - Compliance/violations report
- `exportToCSV(data, headers, filename)` - Export data to CSV

---

## 🎯 Access Points

### For Guests
- Footer links on all pages
- Booking request page (cancellation policy link)
- Direct URL: `/guest/policies`
- Hash anchors: `#cancellation`, `#terms`, `#privacy`, `#rules`, `#refund`, `#community`

### For Hosts
- Service onboarding flow
- Experience onboarding flow
- Direct URL: `/host/policies` (requires login)
- Hash anchors: `#cancellation`, `#terms`, `#privacy`, `#rules`, `#refund`, `#community`, `#service`, `#experience`

### For Admins
- Admin Dashboard → Compliance tab
- Policy Management interface
- Create, edit, delete, activate/deactivate policies
- Filter by policy type
- Initialize default policies

---

## 📌 Summary

**Total Policy Types**: 11
**Total Report Types**: 10
**Default Policies**: 7 initialized
**Refund Processing**: Manual admin approval required
**Report Format**: CSV export
**Policy Format**: Markdown content stored in Firestore
**Access Control**: Policies can apply to Guest, Host, or Both

---

*Last Updated: Based on codebase scan on 2025-01-15*
*Note: Some policy texts may be outdated compared to actual implementation. Review and update as needed.*

