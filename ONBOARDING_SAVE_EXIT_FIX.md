# Onboarding Save & Exit Fix Summary

## Problem
When clicking "Save & Exit" on onboarding pages, some pages weren't saving their current data because they weren't passing their custom Save & Exit handlers to `OnboardingHeader`.

## Solution
Updated all accommodation onboarding pages to pass their custom `handleSaveAndExit` or `handleSaveAndExitClick` functions to `OnboardingHeader` via the `customSaveAndExit` prop.

## Fixed Pages

### ✅ Pages Updated to Pass Custom Handlers:

1. **PropertyDetails.jsx** ✅
   - Passes `handleSaveAndExit` to OnboardingHeader
   - Saves `propertyType` to `data.propertyType`

2. **PropertyStructure.jsx** ✅
   - Passes `handleSaveAndExit` to OnboardingHeader
   - Saves `propertyStructure` to `data.propertyStructure`

3. **PrivacyType.jsx** ✅
   - Passes `handleSaveAndExit` to OnboardingHeader
   - Saves `privacyType` to `data.privacyType`

4. **Location.jsx** ✅
   - **NEW**: Implemented proper `handleSaveAndExit` handler (was just a placeholder)
   - Passes `handleSaveAndExit` to OnboardingHeader
   - Saves `locationData` to `data.locationData`

5. **Amenities.jsx** ✅
   - Passes `handleSaveAndExit` to OnboardingHeader
   - Saves `amenities` to `data.amenities`

6. **PropertyBasics.jsx** ✅
   - Passes `handleSaveAndExitClick` to OnboardingHeader
   - Saves `propertyBasics` to `data.propertyBasics`

7. **MakeItStandOut.jsx** ✅
   - Passes `handleSaveAndExitClick` to OnboardingHeader
   - Saves `highlights` via context

8. **Photos.jsx** ✅
   - Passes `handleSaveAndExitClick` to OnboardingHeader
   - Saves `photos` to `data.photos`

9. **TitleDescription.jsx** ✅
   - Passes `handleSaveAndExitClick` to OnboardingHeader
   - Saves `title` and `description` to Firebase

10. **Description.jsx** ✅
    - Passes `handleSaveAndExitClick` to OnboardingHeader
    - Saves description data

11. **DescriptionDetails.jsx** ✅
    - Passes `handleSaveAndExitClick` to OnboardingHeader
    - Saves `description` to `data.description`

12. **BookingSettings.jsx** ✅
    - Passes `handleSaveAndExitClick` to OnboardingHeader
    - Saves `bookingSettings` to `data.bookingSettings`

13. **GuestSelection.jsx** ✅
    - Passes `handleSaveAndExitClick` to OnboardingHeader
    - Saves guest selection to `data.guestSelection`

14. **Pricing.jsx** ✅
    - Passes `handleSaveAndExitClick` to OnboardingHeader
    - Saves `pricing` to `data.pricing`

15. **WeekendPricing.jsx** ✅
    - Passes `handleSaveAndExitClick` to OnboardingHeader
    - Saves weekend pricing data

16. **Discounts.jsx** ✅
    - Passes `handleSaveAndExitClick` to OnboardingHeader
    - Saves `discounts` to `data.discounts`

17. **SafetyDetails.jsx** ✅
    - Passes `handleSaveAndExitClick` to OnboardingHeader
    - Saves `safetyDetails` to `data.safetyDetails`

18. **FinalDetails.jsx** ✅
    - Passes `handleSaveAndExitClick` to OnboardingHeader
    - Saves `finalDetails` to `data.finalDetails`

19. **LocationConfirmation.jsx** ✅
    - Passes `handleSaveAndExitClick` to OnboardingHeader
    - Saves `locationData` to `data.locationData`

## How It Works

1. Each page defines a custom `handleSaveAndExit` or `handleSaveAndExitClick` function that:
   - Updates context state with current page data
   - Saves the data to Firebase under `data.*` paths
   - Sets `currentStep` to the current page
   - Navigates to `/host/listings` with success message

2. The custom handler is passed to `OnboardingHeader` via `customSaveAndExit` prop

3. When user clicks "Save & Exit" button in the header:
   - OnboardingHeader checks if `customSaveAndExit` prop exists
   - If yes, calls the custom handler (which saves current page data)
   - If no, falls back to context's `saveAndExit` (which saves context state)

## Testing Checklist

- [ ] PropertyDetails: Select property type → Save & Exit → Verify saved
- [ ] PropertyStructure: Select structure → Save & Exit → Verify saved
- [ ] PrivacyType: Select privacy option → Save & Exit → Verify saved
- [ ] Location: Pin location → Save & Exit → Verify saved
- [ ] PropertyBasics: Enter guest capacity → Save & Exit → Verify saved
- [ ] MakeItStandOut: Add highlights → Save & Exit → Verify saved
- [ ] Amenities: Select amenities → Save & Exit → Verify saved
- [ ] Photos: Upload photos → Save & Exit → Verify saved
- [ ] TitleDescription: Enter title/description → Save & Exit → Verify saved
- [ ] Description: Enter description → Save & Exit → Verify saved
- [ ] DescriptionDetails: Enter description → Save & Exit → Verify saved
- [ ] BookingSettings: Select booking option → Save & Exit → Verify saved
- [ ] GuestSelection: Select guest option → Save & Exit → Verify saved
- [ ] Pricing: Enter price → Save & Exit → Verify saved
- [ ] WeekendPricing: Enter weekend price → Save & Exit → Verify saved
- [ ] Discounts: Toggle discounts → Save & Exit → Verify saved
- [ ] SafetyDetails: Select safety features → Save & Exit → Verify saved
- [ ] FinalDetails: Enter address → Save & Exit → Verify saved
- [ ] LocationConfirmation: Confirm location → Save & Exit → Verify saved

## Notes

- All pages now properly save their current data when "Save & Exit" is clicked
- Data is saved to Firebase under nested `data.*` structure
- `currentStep` is set to the current page so "Continue Editing" returns to the correct page
- Navigation goes to `/host/listings` instead of `/host/hostdashboard`

