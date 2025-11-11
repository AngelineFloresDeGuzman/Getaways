# Experience Onboarding Steps Breakdown

This document outlines the 16 steps that were previously in `ExperienceDetails.jsx` and are now split into separate files.

## Experience Onboarding Flow

### Pre-Details Steps (Already Separate Files)
1. **ExperienceCategorySelection** - Select main category
2. **ExperienceSubcategorySelection** - Select subcategory  
3. **ExperienceLocation** - Select city/location
4. **ExperienceListingSummary** - Summary page before details
5. **ExperienceYearsOfExperience** - Years of experience (already separate, but was step 1 in ExperienceDetails)

### Experience Details Steps (16 Steps - To Be Split)

#### Step 1: Years of Experience
- **File**: `ExperienceYearsOfExperience.jsx` (already exists)
- **Route**: `/pages/experience-years-of-experience`
- **Data**: `yearsOfExperience`
- **Next**: Step 2 (Qualifications)

#### Step 2: Qualifications  
- **File**: `ExperienceQualifications.jsx` (to be created)
- **Route**: `/pages/experience-qualifications`
- **Data**: `introTitle`, `expertise`, `recognition`
- **Next**: Step 3 (Online Profiles)

#### Step 3: Online Profiles
- **File**: `ExperienceOnlineProfiles.jsx` (to be created)
- **Route**: `/pages/experience-online-profiles`
- **Data**: `profiles` (array of social media profiles)
- **Next**: Step 4 (Residential Address)

#### Step 4: Residential Address
- **File**: `ExperienceResidentialAddress.jsx` (to be created)
- **Route**: `/pages/experience-residential-address`
- **Data**: `country`, `unit`, `buildingName`, `streetAddress`, `barangay`, `city`, `zipCode`, `province`, `isBusinessHosting`
- **Next**: Step 5 (Meeting Address)

#### Step 5: Meeting Address
- **File**: `ExperienceMeetingAddress.jsx` (to be created)
- **Route**: `/pages/experience-meeting-address`
- **Data**: `meetingAddress`, `confirmCountry`, `confirmUnit`, `confirmBuildingName`, `confirmStreetAddress`, `confirmBarangay`, `confirmCity`, `confirmZipCode`, `confirmProvince`, `locationName`, `showConfirmLocation`, `mapLat`, `mapLng`, `showMap`
- **Next**: Step 6 (Photos)

#### Step 6: Photos
- **File**: `ExperiencePhotos.jsx` (to be created)
- **Route**: `/pages/experience-photos`
- **Data**: `photos` (array of photo objects with base64)
- **Next**: Step 7 (Itinerary)

#### Step 7: Itinerary
- **File**: `ExperienceItinerary.jsx` (to be created)
- **Route**: `/pages/experience-itinerary`
- **Data**: `itineraryItems` (array of itinerary items with title, description, duration, image)
- **Next**: Step 8 (Maximum Guests)

#### Step 8: Maximum Guests
- **File**: `ExperienceMaxGuests.jsx` (to be created)
- **Route**: `/pages/experience-max-guests`
- **Data**: `maxGuests`
- **Next**: Step 9 (Price Per Guest)

#### Step 9: Price Per Guest
- **File**: `ExperiencePricePerGuest.jsx` (to be created)
- **Route**: `/pages/experience-price-per-guest`
- **Data**: `pricePerGuest`
- **Next**: Step 10 (Private Group Minimum)

#### Step 10: Private Group Minimum
- **File**: `ExperiencePrivateGroupMinimum.jsx` (to be created)
- **Route**: `/pages/experience-private-group-minimum`
- **Data**: `privateGroupMinimum`
- **Next**: Step 11 (Review Pricing)

#### Step 11: Review Pricing
- **File**: `ExperienceReviewPricing.jsx` (to be created)
- **Route**: `/pages/experience-review-pricing`
- **Data**: Display only (no new data)
- **Next**: Step 12 (Discounts)

#### Step 12: Discounts
- **File**: `ExperienceDiscounts.jsx` (to be created)
- **Route**: `/pages/experience-discounts`
- **Data**: `discounts` (array of discount objects)
- **Next**: Step 13 (Transportation)

#### Step 13: Transportation Details
- **File**: `ExperienceTransportation.jsx` (to be created)
- **Route**: `/pages/experience-transportation`
- **Data**: `willTransportGuests`, `transportationTypes`, `termsAgreed`
- **Next**: Step 14 (Title & Description Preview)

#### Step 14: Title & Description Preview
- **File**: `ExperienceTitleDescriptionPreview.jsx` (to be created)
- **Route**: `/pages/experience-title-description-preview`
- **Data**: Display only (no new data)
- **Next**: Step 15 (Create Title & Description)

#### Step 15: Create Title & Description
- **File**: `ExperienceCreateTitleDescription.jsx` (to be created)
- **Route**: `/pages/experience-create-title-description`
- **Data**: `experienceTitle`, `experienceDescription`
- **Next**: Step 16 (Submit Listing)

#### Step 16: Submit Listing
- **File**: `ExperienceSubmitListing.jsx` (to be created)
- **Route**: `/pages/experience-submit-listing`
- **Data**: Review all data and submit to create listing
- **Next**: Navigate to `/host/listings`

## Data Saving Strategy

Each step:
1. Loads data from draft on mount using `useExperienceData` hook
2. Saves data to draft on change/navigation using `saveData` function
3. Passes `draftId` in navigation state between steps
4. Uses `currentStep` field in draft to track progress

## Navigation Flow

```
ExperienceCategorySelection
  → ExperienceSubcategorySelection
    → ExperienceLocation
      → ExperienceListingSummary
        → ExperienceYearsOfExperience (Step 1)
          → ExperienceQualifications (Step 2)
            → ExperienceOnlineProfiles (Step 3)
              → ExperienceResidentialAddress (Step 4)
                → ExperienceMeetingAddress (Step 5)
                  → ExperiencePhotos (Step 6)
                    → ExperienceItinerary (Step 7)
                      → ExperienceMaxGuests (Step 8)
                        → ExperiencePricePerGuest (Step 9)
                          → ExperiencePrivateGroupMinimum (Step 10)
                            → ExperienceReviewPricing (Step 11)
                              → ExperienceDiscounts (Step 12)
                                → ExperienceTransportation (Step 13)
                                  → ExperienceTitleDescriptionPreview (Step 14)
                                    → ExperienceCreateTitleDescription (Step 15)
                                      → ExperienceSubmitListing (Step 16)
                                        → /host/listings
```

## Draft Structure

The draft document in Firebase has this structure:
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
    yearsOfExperience: number,
    introTitle: string,
    expertise: string,
    recognition: string,
    profiles: Array,
    // ... all other experience data fields
    experienceCategory: string,
  }
}
```

