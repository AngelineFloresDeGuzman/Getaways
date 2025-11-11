# Experience Onboarding Steps - Implementation Status

## Overview
This document tracks the progress of splitting the monolithic `ExperienceDetails.jsx` file (which contained 16 steps) into separate, manageable step files similar to the accommodations onboarding structure.

## Implementation Status

### ✅ Completed

1. **Documentation Created**
   - ✅ `EXPERIENCE_ONBOARDING_STEPS.md` - Complete breakdown of all 16 steps
   - ✅ `EXPERIENCE_STEPS_IMPLEMENTATION_STATUS.md` - This file

2. **Shared Hook Created**
   - ✅ `src/pages/Host/onboarding/hooks/useExperienceData.js` - Centralized data management hook

3. **Step Files Created**
   - ✅ `ExperienceYearsOfExperience.jsx` - Already existed (Step 1)
   - ✅ `ExperienceQualifications.jsx` - Created (Step 2)
   - ✅ `ExperienceMaxGuests.jsx` - Created (Step 8)

4. **Routing Updated**
   - ✅ Added route for `experience-qualifications` in `App.jsx`
   - ⚠️ Need to add routes for remaining steps

### 🚧 In Progress

- Creating remaining step files (Steps 3-7, 9-16)

### 📋 Remaining Steps to Create

#### Step 3: Online Profiles
- **File**: `ExperienceOnlineProfiles.jsx`
- **Route**: `/pages/experience-online-profiles`
- **Data**: `profiles` (array)
- **Status**: Not started
- **Complexity**: Medium (modals, social media platforms)

#### Step 4: Residential Address
- **File**: `ExperienceResidentialAddress.jsx`
- **Route**: `/pages/experience-residential-address`
- **Data**: Multiple address fields
- **Status**: Not started
- **Complexity**: Medium (form fields)

#### Step 5: Meeting Address
- **File**: `ExperienceMeetingAddress.jsx`
- **Route**: `/pages/experience-meeting-address`
- **Data**: Address fields + map integration
- **Status**: Not started
- **Complexity**: High (map, address search, Nominatim API)

#### Step 6: Photos
- **File**: `ExperiencePhotos.jsx`
- **Route**: `/pages/experience-photos`
- **Data**: `photos` (array with base64)
- **Status**: Not started
- **Complexity**: High (file upload, drag & drop, base64 conversion)

#### Step 7: Itinerary
- **File**: `ExperienceItinerary.jsx`
- **Route**: `/pages/experience-itinerary`
- **Data**: `itineraryItems` (array)
- **Status**: Not started
- **Complexity**: Very High (multi-step modal, photo selection, duration picker)

#### Step 9: Price Per Guest
- **File**: `ExperiencePricePerGuest.jsx`
- **Route**: `/pages/experience-price-per-guest`
- **Data**: `pricePerGuest`
- **Status**: Not started
- **Complexity**: Low (simple input)

#### Step 10: Private Group Minimum
- **File**: `ExperiencePrivateGroupMinimum.jsx`
- **Route**: `/pages/experience-private-group-minimum`
- **Data**: `privateGroupMinimum`
- **Status**: Not started
- **Complexity**: Low (simple input with validation)

#### Step 11: Review Pricing
- **File**: `ExperienceReviewPricing.jsx`
- **Route**: `/pages/experience-review-pricing`
- **Data**: Display only
- **Status**: Not started
- **Complexity**: Low (display only)

#### Step 12: Discounts
- **File**: `ExperienceDiscounts.jsx`
- **Route**: `/pages/experience-discounts`
- **Data**: `discounts` (array)
- **Status**: Not started
- **Complexity**: Medium (modals, custom discounts)

#### Step 13: Transportation
- **File**: `ExperienceTransportation.jsx`
- **Route**: `/pages/experience-transportation`
- **Data**: `willTransportGuests`, `transportationTypes`, `termsAgreed`
- **Status**: Not started
- **Complexity**: Medium (terms agreement, transportation types)

#### Step 14: Title & Description Preview
- **File**: `ExperienceTitleDescriptionPreview.jsx`
- **Route**: `/pages/experience-title-description-preview`
- **Data**: Display only
- **Status**: Not started
- **Complexity**: Low (display only)

#### Step 15: Create Title & Description
- **File**: `ExperienceCreateTitleDescription.jsx`
- **Route**: `/pages/experience-create-title-description`
- **Data**: `experienceTitle`, `experienceDescription`
- **Status**: Not started
- **Complexity**: Medium (modal, title/description inputs)

#### Step 16: Submit Listing
- **File**: `ExperienceSubmitListing.jsx`
- **Route**: `/pages/experience-submit-listing`
- **Data**: Review and submit
- **Status**: Not started
- **Complexity**: High (data aggregation, listing creation, navigation)

## Implementation Pattern

Each step file should follow this pattern:

```javascript
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";

const ExperienceStepName = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();

  // State management
  const [data, setData] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const draftId = state.draftId || location.state?.draftId;

  // Load data from draft
  useEffect(() => {
    // Load logic
  }, [draftId]);

  // Set current step
  useEffect(() => {
    if (actions.setCurrentStep) {
      actions.setCurrentStep("experience-step-name");
    }
  }, [actions]);

  // Save data
  const saveData = async () => {
    // Save logic
  };

  // Navigation handlers
  const handleNext = async () => {
    await saveData();
    navigate("/pages/next-step", { state: { draftId } });
  };

  const handleBack = () => {
    navigate("/pages/previous-step", { state: { draftId } });
  };

  const handleSaveAndExit = async () => {
    await saveData();
    navigate("/host/listings", { state: { draftId, scrollToDrafts: true } });
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader
        showProgress={true}
        currentStepNameOverride="experience-step-name"
        customSaveAndExit={handleSaveAndExit}
      />
      <main>
        {/* Step content */}
      </main>
      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        canProceed={validation}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ExperienceStepName;
```

## Key Points

1. **Data Loading**: Each step loads its data from the draft document on mount
2. **Data Saving**: Each step saves data to the draft document on navigation
3. **Navigation**: Steps navigate using React Router with `draftId` in state
4. **Progress Tracking**: Uses `currentStep` field in draft to track progress
5. **Save & Exit**: Each step has a `handleSaveAndExit` function
6. **Validation**: Each step validates data before allowing navigation

## Next Steps

1. Create remaining step files following the pattern
2. Add all routes to `App.jsx`
3. Update `ExperienceYearsOfExperience.jsx` navigation (already navigates to qualifications)
4. Update `ExperienceListingSummary.jsx` to navigate to years of experience
5. Test navigation flow between all steps
6. Test draft saving/loading for each step
7. Test "Save & Exit" functionality
8. Remove or deprecate old `ExperienceDetails.jsx` file

## Notes

- The old `ExperienceDetails.jsx` file should be kept for reference until all steps are created and tested
- Each step should be tested independently before integration
- Draft saving should be tested to ensure data persists correctly
- Navigation should be tested to ensure smooth flow between steps

