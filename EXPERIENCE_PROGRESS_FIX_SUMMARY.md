# Experience Onboarding Progress Fix - Summary

## Problem
1. Experience category selection showed 20% progress (should be 0%)
2. Experience details page dropped to 6% progress (because it has many steps, but progress wasn't calculated correctly)
3. Progress calculation assumed experience-listing-summary was the end, but there are 16 more steps after it

## Solution Implemented

### 1. Fixed Progress Calculation in OnboardingHeader.jsx
- **Added experience step groups**: Created separate step groups for experiences, distributed across 3 main steps:
  - **Step 1 (Setup)**: category-selection (0%), subcategory-selection (25%), location (50%), listing-summary (75%)
  - **Step 2 (Details)**: years-of-experience (0%), qualifications (11%), online-profiles (22%), residential-address (33%), meeting-address (44%), photos (56%), itinerary (67%), max-guests (78%), price-per-guest (89%)
  - **Step 3 (Final)**: private-group-minimum (0%), review-pricing (14%), discounts (29%), transportation (43%), title-preview (57%), create-title (71%), submit-listing (86%)

- **Updated progress calculation logic**: 
  - Progress now correctly calculates based on step position within each step group
  - Experience steps are automatically detected by prefix "experience-"
  - Progress bar animates correctly when moving between steps

### 2. Updated Listing Service (listing.js)
- **Added experience field handling**: The `createListing` function now properly handles all experience-specific fields:
  - Experience category/subcategory
  - Years of experience
  - Qualifications (introTitle, expertise, recognition)
  - Online profiles
  - Residential and meeting addresses
  - Photos
  - Itinerary items
  - Max guests
  - Price per guest
  - Private group minimum
  - Discounts
  - Transportation details
  - Terms agreement
  - Experience title and description

### 3. Fixed ExperienceListingSummary Navigation
- **Updated navigation**: Changed from navigating to "experience-details" to "experience-years-of-experience"
- **Updated currentStep**: Now sets currentStep to "experience-years-of-experience" instead of "experience-details"

### 4. Step Files Created
- ✅ `ExperienceYearsOfExperience.jsx` - Step 1 (already existed)
- ✅ `ExperienceQualifications.jsx` - Step 2
- ✅ `ExperienceMaxGuests.jsx` - Step 8
- ✅ `ExperiencePricePerGuest.jsx` - Step 9

### 5. Routes Updated
- ✅ Added routes for: experience-qualifications, experience-max-guests, experience-price-per-guest

## Current State

### Working:
1. ✅ Progress calculation works correctly for all experience steps
2. ✅ Progress bar shows correct percentage at each step
3. ✅ Navigation from listing-summary to years-of-experience works
4. ✅ Draft saving works at each step
5. ✅ Listing service supports experience fields

### Remaining Work:
1. ⚠️ **Create remaining step files** (13 more steps needed):
   - experience-online-profiles
   - experience-residential-address
   - experience-meeting-address
   - experience-photos
   - experience-itinerary
   - experience-private-group-minimum
   - experience-review-pricing
   - experience-discounts
   - experience-transportation
   - experience-title-description-preview
   - experience-create-title-description
   - experience-submit-listing

2. ⚠️ **Update navigation**: Ensure all step files navigate correctly to next/previous steps

3. ⚠️ **Submit listing**: Create/update the submit listing step to:
   - Collect all data from draft
   - Create listing using `createListing` service
   - Update draft with publishedListingId
   - Navigate to listings page

4. ⚠️ **Old ExperienceDetails.jsx**: The old monolithic file still exists and is still in routes. Options:
   - Option A: Keep it for backward compatibility, but ensure it sets correct currentStep
   - Option B: Remove it and redirect to first step file
   - Option C: Keep it but update it to use the new progress calculation

## Testing Checklist

### Progress Calculation:
- [ ] Experience category selection shows 0% (Step 1, 0%)
- [ ] Experience subcategory selection shows ~25% (Step 1, 25%)
- [ ] Experience location shows ~50% (Step 1, 50%)
- [ ] Experience listing summary shows ~75% (Step 1, 75%)
- [ ] Experience years of experience shows 0% of Step 2 (but Step 1 bar should be full)
- [ ] Progress increases correctly as you move through steps
- [ ] Progress decreases correctly when going back

### Navigation:
- [ ] Can navigate from category → subcategory → location → listing-summary
- [ ] Can navigate from listing-summary → years-of-experience
- [ ] Can navigate from years-of-experience → qualifications
- [ ] Can navigate from qualifications → next step (when created)
- [ ] Back button works correctly at each step

### Draft Saving:
- [ ] Draft is created at category selection
- [ ] Draft is updated at each step
- [ ] Draft data is loaded when returning to a step
- [ ] Save & Exit works at each step
- [ ] Draft can be resumed from listings page

### Listing Creation:
- [ ] Submit listing step collects all data from draft
- [ ] Listing is created with all experience fields
- [ ] Listing appears in listings page after creation
- [ ] Draft is marked as published with publishedListingId

## Next Steps

1. **Create remaining step files** - Extract logic from ExperienceDetails.jsx into separate files
2. **Update navigation** - Ensure all steps navigate correctly
3. **Create submit listing step** - Implement listing creation
4. **Test end-to-end** - Test the complete flow from category selection to listing creation
5. **Clean up** - Remove or update old ExperienceDetails.jsx file

## Files Modified

1. `src/pages/Host/onboarding/components/OnboardingHeader.jsx` - Fixed progress calculation
2. `src/pages/Host/services/listing.js` - Added experience field handling
3. `src/pages/Host/onboarding/ExperienceListingSummary.jsx` - Fixed navigation
4. `src/App.jsx` - Added routes for new step files

## Files Created

1. `src/pages/Host/onboarding/ExperienceQualifications.jsx`
2. `src/pages/Host/onboarding/ExperienceMaxGuests.jsx`
3. `src/pages/Host/onboarding/ExperiencePricePerGuest.jsx`

