import { useEffect, useRef, useCallback } from 'react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { auth } from '@/lib/firebase';

/**
 * Enhanced auto-save hook for onboarding pages
 * Provides automatic saving, loading, and state management
 */
export const useOnboardingAutoSave = (stepName, dependencies = []) => {
  const { state, actions } = useOnboarding();
  const saveTimeoutRef = useRef(null);
  const lastSavedDataRef = useRef(null);
  const hasLoadedDraftRef = useRef(false);
  
  // Create a stable dependency list that includes key state values
  const autosaveDependencies = [
    state.propertyType,
    state.propertyStructure,
    state.privacyType,
    state.guestCapacity,
    state.guests,
    state.bedrooms,
    state.beds,
    state.bathrooms,
    JSON.stringify(state.selectedAmenities),
    JSON.stringify(state.locationData),
    state.selectedGuestOption,
    JSON.stringify(state.highlights),
    state.title,
    state.description,
    ...dependencies
  ];

  // Auto-save functionality with debouncing
  const debouncedSave = useCallback(async () => {
    if (!auth.currentUser) {
      console.log('Auto-save skipped: User not authenticated');
      return;
    }

    // Prevent auto-save on the first onboarding step
    if (state.currentStep === 'hosting-steps') {
      console.log('Auto-save skipped: On hosting-steps, only lastModified should be updated manually');
      return;
    }
    // Don't save if we're currently loading
    if (state.isLoading) {
      console.log('Auto-save skipped: Currently loading');
      return;
    }

    // Don't auto-save immediately after loading a draft
    if (hasLoadedDraftRef.current && Date.now() - hasLoadedDraftRef.lastLoadTime < 5000) {
      console.log('Auto-save skipped: Recently loaded draft');
      return;
    }

    // Compare current data with last saved data to avoid unnecessary saves
    const currentData = JSON.stringify({...state, currentStep: stepName});
    if (currentData === lastSavedDataRef.current) {
      console.log('Auto-save skipped: No changes detected');
      return;
    }

    try {
      console.log(`Auto-saving ${stepName}...`);
      await actions.saveDraft();
      lastSavedDataRef.current = currentData;
      console.log(`Auto-save completed for ${stepName}`);
    } catch (error) {
      console.error(`Auto-save failed for ${stepName}:`, error);
    }
  }, [state, stepName, actions]);

  // Set up auto-save with debouncing
  useEffect(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only set up auto-save if user is authenticated and not currently loading
    if (auth.currentUser && !state.isLoading) {
      // Set up new timeout for auto-save (5 seconds after last change)
      saveTimeoutRef.current = setTimeout(() => {
        debouncedSave();
      }, 5000);
    }

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, autosaveDependencies);

  // Set current step when component mounts
  useEffect(() => {
    if (actions.setCurrentStep && stepName) {
      actions.setCurrentStep(stepName);
    }
  }, [stepName, actions]);

  // Load draft data if available
  const loadDraftIfNeeded = useCallback(async (draftId) => {
    if (!draftId || hasLoadedDraftRef.current) {
      return false;
    }

    try {
      console.log(`Loading draft ${draftId} for ${stepName}...`);
      actions.setLoading(true);
      await actions.loadDraft(draftId);
      hasLoadedDraftRef.current = true;
      hasLoadedDraftRef.lastLoadTime = Date.now(); // Track when draft was loaded
      console.log(`Draft loaded successfully for ${stepName}`);
      
      // Update lastSavedDataRef to current state to prevent immediate auto-save
      const currentData = JSON.stringify({...state, currentStep: stepName});
      lastSavedDataRef.current = currentData;
      
      return true;
    } catch (error) {
      console.error(`Error loading draft for ${stepName}:`, error);
      hasLoadedDraftRef.current = false;
      return false;
    } finally {
      actions.setLoading(false);
    }
  }, [stepName, actions, state]);

  // Manual save function
  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    return await debouncedSave();
  }, [debouncedSave]);

  // Save and exit function
  const saveAndExit = useCallback(async (currentPageData = null) => {
    try {
      console.log(`Saving and exiting from ${stepName}...`);
      
      if (!auth.currentUser) {
        throw new Error('User not authenticated. Please log in again.');
      }

      // Update current step before saving
      if (actions.setCurrentStep && stepName) {
        actions.setCurrentStep(stepName);
      }

      // If current page data is provided, update state first
      if (currentPageData) {
        console.log(`Updating current page data for ${stepName}:`, currentPageData);
        
        // Use individual update functions based on data type
        Object.keys(currentPageData).forEach(key => {
          const value = currentPageData[key];
          switch (key) {
            case 'selectedAmenities':
              actions.updateAmenities?.(value);
              break;
            case 'propertyBasics':
              actions.updatePropertyBasics?.(value);
              break;
            case 'locationData':
              actions.updateLocationData?.(value);
              break;
            case 'selectedGuestOption':
              actions.updateGuestSelection?.(value);
              break;
            case 'highlights':
              actions.updateHighlights?.(value);
              break;
            case 'photos':
              actions.updatePhotos?.(value);
              break;
            default:
              // Use general updateState for other properties
              if (actions.updateState) {
                actions.updateState({ [key]: value });
              }
          }
        });
        
        // Give a brief moment for state to update
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      await actions.saveAndExit();
      console.log(`Save and exit completed from ${stepName}`);
    } catch (error) {
      console.error(`Save and exit failed from ${stepName}:`, error);
      throw error;
    }
  }, [stepName, actions]);

  // Return utilities for the component
  return {
    state,
    actions,
    loadDraftIfNeeded,
    saveNow,
    saveAndExit,
    isLoading: state.isLoading,
    hasLoadedDraft: hasLoadedDraftRef.current
  };
};

/**
 * Navigation hook with auto-save
 */
export const useOnboardingNavigation = (stepName, currentPath) => {
  const { saveNow, saveAndExit } = useOnboardingAutoSave(stepName);

  // Navigate to next step with auto-save
  const navigateNext = useCallback(async (navigate, nextPath, nextStep, draftId) => {
    try {
      // Save current progress
      await saveNow();
      
      // Navigate to next step, always pass draftId
      navigate(nextPath, {
        state: {
          fromStep: stepName,
          currentStep: nextStep,
          draftId
        }
      });
    } catch (error) {
      console.error(`Error navigating from ${stepName}:`, error);
      // Continue navigation even if save fails
      navigate(nextPath, {
        state: {
          fromStep: stepName,
          currentStep: nextStep,
          draftId,
          saveError: error.message
        }
      });
    }
  }, [stepName, saveNow]);

  // Navigate to previous step
  const navigateBack = useCallback(async (navigate, backPath, backStep, draftId) => {
    try {
      // Save current progress before going back
      await saveNow();
      
      navigate(backPath, {
        state: {
          fromStep: stepName,
          currentStep: backStep,
          draftId
        }
      });
    } catch (error) {
      console.error(`Error navigating back from ${stepName}:`, error);
      // Continue navigation even if save fails
      navigate(backPath, {
        state: {
          fromStep: stepName,
          currentStep: backStep,
          draftId,
          saveError: error.message
        }
      });
    }
  }, [stepName, saveNow]);

  return {
    navigateNext,
    navigateBack,
    saveAndExit
  };
};

export default { useOnboardingAutoSave, useOnboardingNavigation };