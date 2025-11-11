# Draft Resumption Fix - Summary

## Problem
When users saved and exited from an experience onboarding step, the data was being saved correctly, but when they clicked "Continue" to resume the draft, it wasn't taking them back to the page/step they left off at.

## Root Cause
1. The `handleContinueDraft` function in `Listings.jsx` only had routes for the main experience steps, not the individual step routes (like `experience-years-of-experience`, `experience-qualifications`, etc.)
2. When `currentStep` was set to something like `experience-years-of-experience`, it couldn't find a route and would fall back to the default route
3. The `ExperienceDetails.jsx` component wasn't prioritizing `location.state.currentStepNumber` when resuming from a draft
4. The step number wasn't being passed in the navigation state when continuing a draft

## Solution

### 1. Updated `handleContinueDraft` in `Listings.jsx`
- **Added all experience step routes**: Added routes for all individual experience steps:
  - `experience-years-of-experience`
  - `experience-qualifications`
  - `experience-online-profiles`
  - `experience-residential-address`
  - `experience-meeting-address`
  - `experience-photos`
  - `experience-itinerary`
  - `experience-max-guests`
  - `experience-price-per-guest`
  - `experience-private-group-minimum`
  - `experience-review-pricing`
  - `experience-discounts`
  - `experience-transportation`
  - `experience-title-description-preview`
  - `experience-create-title-description`
  - `experience-submit-listing`

- **Added step number mapping**: When `currentStep` is `experience-details` and we have a `currentStepNumber`, map it to the correct step name and route

- **Pass step number in navigation state**: When navigating to `experience-details`, pass `currentStepNumber` in the navigation state so the component can restore the exact step

- **Pass experience data**: Also pass `experienceCategory`, `experienceSubcategory`, and `experienceCity` in the navigation state for individual step routes

### 2. Updated `ExperienceDetails.jsx`
- **Priority for step number**: Updated the component to prioritize step number from `location.state` over draft data:
  1. `location.state.currentStepNumber` (highest priority - most immediate)
  2. `draft.data.currentStepNumber` (loaded from Firebase)
  3. Default to step 1 (fallback)

- **Immediate step restoration**: Check `location.state.currentStepNumber` at the start of the `loadQualificationData` useEffect and set it immediately, before loading draft data

- **Updated useState initializer**: Initialize `currentStep` from `location.state.currentStepNumber` if available, so the correct step is shown immediately on mount

## How It Works Now

### When User Saves & Exits:
1. User is on step 5 (meeting address) in ExperienceDetails
2. User clicks "Save & Exit"
3. Draft is saved with:
   - `currentStep: "experience-details"`
   - `data.currentStepNumber: 5`
   - All form data

### When User Resumes Draft:
1. User clicks "Continue" on the draft in Listings page
2. `handleContinueDraft` is called with the draft
3. Function checks:
   - `currentStep = "experience-details"`
   - `currentStepNumber = 5` (from `draft.data.currentStepNumber`)
4. Function navigates to `/pages/experience-details` with state:
   ```javascript
   {
     draftId: draft.id,
     category: "experience",
     currentStepNumber: 5,
     experienceCategory: "...",
     experienceSubcategory: "...",
     experienceCity: "..."
   }
   ```
5. `ExperienceDetails` component mounts
6. `useState` initializer checks `location.state.currentStepNumber` and sets `currentStep = 5`
7. Component loads data from draft
8. Component displays step 5 (meeting address) with all saved data

### For Individual Step Routes:
If the user was on a step that has its own route (like `experience-years-of-experience`), the function will:
1. Map the step number to the step name
2. Navigate directly to that step's route (e.g., `/pages/experience-years-of-experience`)
3. Pass all necessary data in the navigation state
4. The step component loads data from the draft and displays it

## Testing Checklist

- [ ] Save & Exit from step 1 (years of experience) → Resume → Should show step 1
- [ ] Save & Exit from step 2 (qualifications) → Resume → Should show step 2
- [ ] Save & Exit from step 5 (meeting address) → Resume → Should show step 5
- [ ] Save & Exit from step 8 (max guests) → Resume → Should show step 8 (or navigate to experience-max-guests page)
- [ ] Save & Exit from step 16 (submit listing) → Resume → Should show step 16
- [ ] Verify all form data is loaded correctly when resuming
- [ ] Verify progress bar shows correct progress when resuming
- [ ] Verify navigation (Next/Back) works correctly after resuming

## Files Modified

1. `src/pages/Host/Listings.jsx` - Updated `handleContinueDraft` to:
   - Include all experience step routes
   - Map step numbers to step names
   - Pass `currentStepNumber` in navigation state
   - Pass experience data in navigation state

2. `src/pages/Host/onboarding/ExperienceDetails.jsx` - Updated to:
   - Prioritize `location.state.currentStepNumber` over draft data
   - Initialize `currentStep` from `location.state` if available
   - Check `location.state.currentStepNumber` immediately in useEffect

## Notes

- The fix ensures that when resuming a draft, users are taken back to the exact step they left off at
- Data is loaded from the draft and all form fields are restored
- The progress bar shows the correct progress based on the restored step
- Navigation (Next/Back) works correctly after resuming

