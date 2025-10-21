#!/usr/bin/env node

/**
 * Script to add auto-save functionality to all onboarding pages
 * This will ensure consistent save/load behavior across all pages
 */

const fs = require('fs');
const path = require('path');

const onboardingDir = 'c:/Users/ASUS Vivobook M513U/havenly/src/pages/Host/onboarding';

// List of onboarding page files
const onboardingFiles = [
  'PropertyDetails.jsx',
  'PropertyStructure.jsx',
  'PrivacyType.jsx',
  'Location.jsx',
  'LocationConfirmation.jsx',
  'PropertyBasics.jsx',
  'MakeItStandOut.jsx',
  'Amenities.jsx',
  'Photos.jsx',
  'PhotosPreview.jsx',
  'Description.jsx',
  'DescriptionDetails.jsx',
  'TitleDescription.jsx',
  'FinishSetup.jsx',
  'BookingSettings.jsx',
  'GuestSelection.jsx',
  'Pricing.jsx',
  'WeekendPricing.jsx',
  'Discounts.jsx',
  'SafetyDetails.jsx',
  'FinalDetails.jsx'
];

// Step names corresponding to each file
const stepNames = {
  'PropertyDetails.jsx': 'property-details',
  'PropertyStructure.jsx': 'property-structure', 
  'PrivacyType.jsx': 'privacy-type',
  'Location.jsx': 'location',
  'LocationConfirmation.jsx': 'location-confirmation',
  'PropertyBasics.jsx': 'property-basics',
  'MakeItStandOut.jsx': 'make-it-stand-out',
  'Amenities.jsx': 'amenities',
  'Photos.jsx': 'photos',
  'PhotosPreview.jsx': 'photos-preview',
  'Description.jsx': 'description',
  'DescriptionDetails.jsx': 'description-details',
  'TitleDescription.jsx': 'title-description',
  'FinishSetup.jsx': 'finish-setup',
  'BookingSettings.jsx': 'booking-settings',
  'GuestSelection.jsx': 'guest-selection',
  'Pricing.jsx': 'pricing',
  'WeekendPricing.jsx': 'weekend-pricing',
  'Discounts.jsx': 'discounts',
  'SafetyDetails.jsx': 'safety-details',
  'FinalDetails.jsx': 'final-details'
};

// Navigation paths (next steps)
const navigationPaths = {
  'PropertyDetails.jsx': '/pages/propertystructure',
  'PropertyStructure.jsx': '/pages/privacytype',
  'PrivacyType.jsx': '/pages/location',
  'Location.jsx': '/pages/locationconfirmation',
  'LocationConfirmation.jsx': '/pages/propertybasics',
  'PropertyBasics.jsx': '/pages/makeitstandout',
  'MakeItStandOut.jsx': '/pages/amenities',
  'Amenities.jsx': '/pages/photos',
  'Photos.jsx': '/pages/photospreview',
  'PhotosPreview.jsx': '/pages/description',
  'Description.jsx': '/pages/descriptiondetails',
  'DescriptionDetails.jsx': '/pages/titleDescription',
  'TitleDescription.jsx': '/pages/finishsetup',
  'FinishSetup.jsx': '/pages/bookingsettings',
  'BookingSettings.jsx': '/pages/guestselection',
  'GuestSelection.jsx': '/pages/pricing',
  'Pricing.jsx': '/pages/weekendpricing',
  'WeekendPricing.jsx': '/pages/discounts',
  'Discounts.jsx': '/pages/safetydetails',
  'SafetyDetails.jsx': '/pages/finaldetails',
  'FinalDetails.jsx': '/host/hostdashboard'
};

function generateAutoSaveTemplate(fileName) {
  const stepName = stepNames[fileName];
  const nextPath = navigationPaths[fileName];
  
  return `
// Enhanced auto-save and state management
const { 
  state, 
  actions, 
  loadDraftIfNeeded, 
  saveAndExit, 
  isLoading 
} = useOnboardingAutoSave('${stepName}', [/* add dependencies here */]);

const { navigateNext, navigateBack } = useOnboardingNavigation('${stepName}');

// Load draft if continuing from saved progress
useEffect(() => {
  const initializePage = async () => {
    if (location.state?.draftId) {
      try {
        await loadDraftIfNeeded(location.state.draftId);
      } catch (error) {
        console.error('Error loading draft in ${fileName}:', error);
      }
    }
  };

  initializePage();
}, [location.state, loadDraftIfNeeded]);

// Enhanced navigation functions
const handleNext = async () => {
  try {
    await navigateNext(navigate, '${nextPath}', '${stepNames[fileName] || 'next-step'}');
  } catch (error) {
    console.error('Error navigating to next step:', error);
    // Continue navigation even if save fails
    navigate('${nextPath}');
  }
};

const handleSaveAndExit = async () => {
  try {
    await saveAndExit();
  } catch (error) {
    console.error('Error saving and exiting:', error);
    alert('Error saving progress: ' + error.message);
  }
};
`;
}

console.log('Auto-save template generator ready.');
console.log('Files to update:', onboardingFiles);
console.log('Step names:', stepNames);
console.log('Navigation paths:', navigationPaths);

module.exports = {
  onboardingFiles,
  stepNames,
  navigationPaths,
  generateAutoSaveTemplate
};