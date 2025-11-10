# Onboarding Save & Exit Testing Guide

## Overview
This document outlines the testing process for ensuring that all accommodation onboarding pages properly save their current data when "Save & Exit" is clicked, and that saved drafts are correctly retrieved when reopening.

## Fixed Pages

### ✅ PropertyDetails.jsx
- **What it saves**: `propertyType` (e.g., "House", "Apartment", "Guesthouse")
- **Firebase path**: `data.propertyType`
- **Status**: Fixed - Now saves propertyType on Save & Exit

### ✅ PropertyStructure.jsx
- **What it saves**: `propertyStructure` (e.g., "House", "Barn", "Cabin")
- **Firebase path**: `data.propertyStructure`
- **Status**: Fixed - Now saves propertyStructure on Save & Exit

### ✅ PrivacyType.jsx
- **What it saves**: `privacyType` (e.g., "An entire place", "A room", "A shared room in a hostel")
- **Firebase path**: `data.privacyType`
- **Status**: Fixed - Now saves privacyType on Save & Exit

### ✅ Pages with Existing Save & Exit Handlers
These pages already have proper Save & Exit handlers:
- **Amenities.jsx** - Saves `data.amenities` (favorites, standout, safety arrays)
- **BookingSettings.jsx** - Saves `data.bookingSettings`
- **SafetyDetails.jsx** - Saves `data.safetyDetails`
- **FinalDetails.jsx** - Saves `data.finalDetails`
- **Pricing.jsx** - Saves `data.pricing` (weekdayPrice, weekendPrice)
- **Photos.jsx** - Saves `data.photos`
- **Discounts.jsx** - Saves `data.discounts`
- **GuestSelection.jsx** - Saves guest selection data
- **DescriptionDetails.jsx** - Saves `data.description`
- **WeekendPricing.jsx** - Saves weekend pricing data

## Testing Checklist

### Test 1: PropertyDetails Save & Exit
1. Navigate to `/pages/propertydetails`
2. Select a property type (e.g., "House")
3. Click "Save & Exit"
4. Verify in Firebase Console:
   - Draft document exists in `onboardingDrafts` collection
   - `data.propertyType` = "House"
   - `currentStep` = "propertydetails"
5. Navigate to Host Dashboard
6. Click "Continue Editing" on the draft
7. Verify property type is pre-selected

### Test 2: PropertyStructure Save & Exit
1. Navigate to `/pages/propertystructure`
2. Select a structure type (e.g., "Barn")
3. Click "Save & Exit"
4. Verify in Firebase Console:
   - `data.propertyStructure` = "Barn"
   - `currentStep` = "propertystructure"
5. Reopen draft and verify structure is pre-selected

### Test 3: PrivacyType Save & Exit
1. Navigate to `/pages/privacytype`
2. Select a privacy option (e.g., "A room")
3. Click "Save & Exit"
4. Verify in Firebase Console:
   - `data.privacyType` = "A room"
   - `currentStep` = "privacytype"
5. Reopen draft and verify privacy type is pre-selected

### Test 4: Full Flow Test
1. Start onboarding from Host Dashboard
2. Fill out multiple pages:
   - PropertyDetails: Select "House"
   - PropertyStructure: Select "House"
   - PrivacyType: Select "An entire place"
   - Location: Enter address
   - PropertyBasics: Enter guest capacity, bedrooms, bathrooms
3. On PropertyBasics page, click "Save & Exit"
4. Verify all data is saved in Firebase:
   - `data.propertyType` = "House"
   - `data.propertyStructure` = "House"
   - `data.privacyType` = "An entire place"
   - `data.locationData` = {...}
   - `data.propertyBasics` = {...}
5. Navigate to Host Dashboard
6. Click "Continue Editing" on the draft
7. Verify all previously entered data is pre-filled

### Test 5: Draft Loading Test
1. Create a draft with data on multiple pages
2. Save & Exit from any page
3. Close browser (or clear sessionStorage)
4. Log back in
5. Navigate to Host Dashboard
6. Click "Continue Editing" on the draft
7. Verify:
   - Correct page loads (based on `currentStep`)
   - All form fields are pre-filled with saved data
   - No data loss occurred

## Common Issues to Watch For

1. **Data not saving**: Check browser console for errors
2. **Wrong currentStep**: Verify `currentStep` matches the page where Save & Exit was clicked
3. **Data not loading**: Check that draft loading logic reads from `data.*` paths, not top-level fields
4. **Missing draftId**: Ensure `draftId` is passed in navigation state or retrieved from context

## Firebase Structure

All drafts should follow this structure:
```javascript
{
  userId: "user123",
  userEmail: "user@example.com",
  status: "draft",
  currentStep: "propertydetails", // Current page where Save & Exit was clicked
  category: "accommodation",
  createdAt: Timestamp,
  lastModified: Timestamp,
  data: {
    propertyType: "House",
    propertyStructure: "House",
    privacyType: "An entire place",
    locationData: {...},
    propertyBasics: {...},
    amenities: {...},
    photos: [...],
    // ... other page data
  }
}
```

## Notes

- All page data should be saved under `data.*` paths (nested structure)
- Old top-level fields (like `propertyType`, `privacyType`) should be removed using `deleteField()`
- `currentStep` should always reflect the page where Save & Exit was clicked
- Draft loading should read from `data.*` paths and map to context state

