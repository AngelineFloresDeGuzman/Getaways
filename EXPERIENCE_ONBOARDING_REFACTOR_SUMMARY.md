# Experience Onboarding Refactor Summary

## What Was Done

### 1. Analysis & Documentation
- ✅ Analyzed the monolithic `ExperienceDetails.jsx` file (3982 lines) containing 16 steps
- ✅ Documented all 16 steps in `EXPERIENCE_ONBOARDING_STEPS.md`
- ✅ Created implementation status tracker in `EXPERIENCE_STEPS_IMPLEMENTATION_STATUS.md`
- ✅ Identified the experience onboarding flow starting point: `ExperienceCategorySelection`

### 2. Created Shared Infrastructure
- ✅ Created `useExperienceData.js` hook for centralized data management (can be enhanced)
- ✅ Established pattern for step files following accommodations onboarding structure

### 3. Created Step Files
- ✅ **Step 2**: `ExperienceQualifications.jsx` - Qualifications (Intro, Expertise, Recognition)
- ✅ **Step 8**: `ExperienceMaxGuests.jsx` - Maximum guests counter
- ✅ **Step 1**: `ExperienceYearsOfExperience.jsx` - Already existed and correctly navigates to Step 2

### 4. Updated Routing
- ✅ Added route for `experience-qualifications` in `App.jsx`
- ⚠️ Need to add routes for remaining 13 steps

## Current Experience Onboarding Flow

```
ExperienceCategorySelection (exists)
  → ExperienceSubcategorySelection (exists)
    → ExperienceLocation (exists)
      → ExperienceListingSummary (exists)
        → ExperienceYearsOfExperience (Step 1 - exists, navigates correctly)
          → ExperienceQualifications (Step 2 - ✅ created)
            → [Steps 3-16 need to be created]
```

## What Needs to Be Done

### High Priority (Critical Steps)

1. **Step 3: Online Profiles** (`ExperienceOnlineProfiles.jsx`)
   - Social media profile management
   - Modals for adding profiles
   - Route: `/pages/experience-online-profiles`

2. **Step 5: Meeting Address** (`ExperienceMeetingAddress.jsx`)
   - Address search with Nominatim API
   - Map integration (Leaflet)
   - Location confirmation
   - Route: `/pages/experience-meeting-address`

3. **Step 6: Photos** (`ExperiencePhotos.jsx`)
   - File upload with drag & drop
   - Base64 conversion
   - Photo gallery
   - Route: `/pages/experience-photos`

4. **Step 7: Itinerary** (`ExperienceItinerary.jsx`)
   - Multi-step modal for creating itinerary items
   - Duration picker
   - Photo selection for activities
   - Route: `/pages/experience-itinerary`

5. **Step 16: Submit Listing** (`ExperienceSubmitListing.jsx`)
   - Review all data
   - Create listing using `createListing` service
   - Navigate to listings page
   - Route: `/pages/experience-submit-listing`

### Medium Priority

6. **Step 4: Residential Address** (`ExperienceResidentialAddress.jsx`)
   - Simple form with address fields
   - Route: `/pages/experience-residential-address`

7. **Step 9: Price Per Guest** (`ExperiencePricePerGuest.jsx`)
   - Simple price input
   - Route: `/pages/experience-price-per-guest`

8. **Step 10: Private Group Minimum** (`ExperiencePrivateGroupMinimum.jsx`)
   - Price input with validation
   - Route: `/pages/experience-private-group-minimum`

9. **Step 12: Discounts** (`ExperienceDiscounts.jsx`)
   - Discount management
   - Custom discount modal
   - Route: `/pages/experience-discounts`

10. **Step 13: Transportation** (`ExperienceTransportation.jsx`)
    - Transportation options
    - Terms agreement
    - Route: `/pages/experience-transportation`

11. **Step 15: Create Title & Description** (`ExperienceCreateTitleDescription.jsx`)
    - Title and description inputs
    - Modal for editing
    - Route: `/pages/experience-create-title-description`

### Low Priority (Display Only)

12. **Step 11: Review Pricing** (`ExperienceReviewPricing.jsx`)
    - Display pricing summary
    - Route: `/pages/experience-review-pricing`

13. **Step 14: Title & Description Preview** (`ExperienceTitleDescriptionPreview.jsx`)
    - Display preview card
    - Route: `/pages/experience-title-description-preview`

## Implementation Pattern

Each step file should:

1. **Load data from draft** on mount using `getDoc` from Firebase
2. **Save data to draft** on navigation using `updateDoc` from Firebase
3. **Pass `draftId` in navigation state** between steps
4. **Use `OnboardingHeader` and `OnboardingFooter`** components
5. **Set `currentStep` in context** for progress tracking
6. **Implement `handleSaveAndExit`** for draft saving

## Key Files to Reference

### For Step Implementation
- `src/pages/Host/onboarding/ExperienceQualifications.jsx` - Example of step with modals
- `src/pages/Host/onboarding/ExperienceMaxGuests.jsx` - Example of simple step
- `src/pages/Host/onboarding/ExperienceYearsOfExperience.jsx` - Example of counter step
- `src/pages/Host/onboarding/PropertyDetails.jsx` - Accommodations example
- `src/pages/Host/onboarding/ExperienceDetails.jsx` - Original file with all step implementations (for reference)

### For Data Management
- `src/pages/Host/services/draftService.js` - Draft saving/loading functions
- `src/pages/Host/services/listing.js` - Listing creation function (for Step 16)
- `src/pages/Host/contexts/OnboardingContext.jsx` - Onboarding context

### For Navigation
- `src/App.jsx` - Routes configuration
- `src/pages/Host/onboarding/components/OnboardingHeader.jsx` - Header component
- `src/pages/Host/onboarding/components/OnboardingFooter.jsx` - Footer component

## Draft Data Structure

The draft document stores all experience data in the `data` field:

```javascript
{
  userId: string,
  userEmail: string,
  status: 'draft',
  currentStep: string, // e.g., 'experience-qualifications'
  category: 'experience',
  createdAt: Timestamp,
  lastModified: Timestamp,
  data: {
    // Step 1
    yearsOfExperience: number,
    experienceCategory: string,
    
    // Step 2
    introTitle: string,
    expertise: string,
    recognition: string,
    
    // Step 3
    profiles: Array,
    
    // Step 4
    country: string,
    unit: string,
    buildingName: string,
    streetAddress: string,
    barangay: string,
    city: string,
    zipCode: string,
    province: string,
    isBusinessHosting: boolean,
    
    // Step 5
    meetingAddress: string,
    confirmCountry: string,
    confirmUnit: string,
    confirmBuildingName: string,
    confirmStreetAddress: string,
    confirmBarangay: string,
    confirmCity: string,
    confirmZipCode: string,
    confirmProvince: string,
    locationName: string,
    showConfirmLocation: boolean,
    mapLat: number,
    mapLng: number,
    showMap: boolean,
    
    // Step 6
    photos: Array,
    
    // Step 7
    itineraryItems: Array,
    
    // Step 8
    maxGuests: number,
    
    // Step 9
    pricePerGuest: string,
    
    // Step 10
    privateGroupMinimum: string,
    
    // Step 12
    discounts: Array,
    
    // Step 13
    willTransportGuests: boolean | null,
    transportationTypes: Array,
    termsAgreed: boolean,
    
    // Step 15
    experienceTitle: string,
    experienceDescription: string,
  }
}
```

## Testing Checklist

For each step, test:
- [ ] Data loads correctly from draft on mount
- [ ] Data saves correctly to draft on navigation
- [ ] Navigation to next step works
- [ ] Navigation to previous step works
- [ ] "Save & Exit" saves data and navigates to listings
- [ ] Progress bar shows correct step
- [ ] Validation works correctly
- [ ] Error handling works correctly

## Next Steps

1. **Create remaining step files** following the established pattern
2. **Add routes to App.jsx** for all new steps
3. **Update navigation** in each step to point to correct next/previous steps
4. **Test the flow** end-to-end
5. **Update OnboardingHeader** if needed for experience step progress
6. **Remove or deprecate** old `ExperienceDetails.jsx` file once all steps are created and tested

## Notes

- The old `ExperienceDetails.jsx` file should be kept for reference until all steps are created
- Each step can be created and tested independently
- The `useExperienceData` hook can be enhanced to provide more shared functionality
- Consider creating shared components for common patterns (modals, forms, etc.)

## Benefits of This Refactor

1. **Better Organization**: Each step is in its own file, making it easier to find and modify
2. **Easier Testing**: Each step can be tested independently
3. **Better Maintainability**: Changes to one step don't affect others
4. **Clearer Navigation**: Easy to see the flow between steps
5. **Easier Tracking**: Each step saves its data independently, making it easier to track what data is saved at each step
6. **Consistent with Accommodations**: Follows the same pattern as accommodations onboarding

## Questions or Issues?

Refer to:
- `EXPERIENCE_ONBOARDING_STEPS.md` - Complete step breakdown
- `EXPERIENCE_STEPS_IMPLEMENTATION_STATUS.md` - Implementation status
- Original `ExperienceDetails.jsx` - Reference implementation
- Accommodations onboarding files - Pattern examples

