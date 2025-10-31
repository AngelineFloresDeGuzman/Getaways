import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboardingAutoSave, useOnboardingNavigation } from './hooks/useOnboardingAutoSave';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';

const PropertyBasics = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Enhanced auto-save and state management
  const { 
    state, 
    actions, 
    loadDraftIfNeeded, 
    saveAndExit, 
    isLoading 
  } = useOnboardingAutoSave('propertybasics', []);
  
  const { navigateNext, navigateBack } = useOnboardingNavigation('propertybasics');
  
  // State for property basics
  const [propertyBasics, setPropertyBasics] = useState({
    guests: state.guestCapacity || 4,
    bedrooms: state.bedrooms || 1,
    beds: state.beds || 2,
    bathrooms: state.bathrooms || 1
  });

  // Ref to track initialization
  const hasInitialized = useRef(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  // Set current step immediately when component mounts to ensure progress bar detects forward navigation
  // Use useLayoutEffect to set it synchronously before paint
  useLayoutEffect(() => {
    if (actions?.setCurrentStep) {
      console.log('📍 PropertyBasics: Setting currentStep to propertybasics (useLayoutEffect)');
      actions.setCurrentStep('propertybasics');
    }
  }, [actions]);

  // Load draft if continuing from saved progress
  useEffect(() => {
    const initializePage = async () => {
      if (location.state?.draftId) {
        try {
          await loadDraftIfNeeded(location.state.draftId);
          setHasLoadedDraft(true);
        } catch (error) {
          console.error('Error loading draft in PropertyBasics:', error);
          setHasLoadedDraft(true); // Set to true even on error to allow step correction
        }
      } else {
        setHasLoadedDraft(true);
      }
    };

    initializePage();
  }, [location.state, loadDraftIfNeeded]);

  // Ensure currentStep is correct after draft loads (in case draft overwrote it)
  useEffect(() => {
    if (hasLoadedDraft && actions?.setCurrentStep) {
      // Only set if it's not already correct (to avoid unnecessary updates)
      if (state.currentStep !== 'propertybasics') {
        console.log('📍 PropertyBasics: Resetting currentStep to propertybasics after draft load');
        console.log('📍 PropertyBasics: Draft loaded with currentStep:', state.currentStep, '- correcting to propertybasics');
        actions.setCurrentStep('propertybasics');
        
        // CRITICAL: Also update sessionStorage to ensure progress bar uses correct previous step
        // Force it to 'locationconfirmation' so progress bar calculates forward navigation correctly
        const storagePrevStepKey = 'onb_prev_step_name';
        const currentPrevStep = sessionStorage.getItem(storagePrevStepKey);
        
        // Only update if previous step is not 'locationconfirmation' (our expected previous step)
        if (currentPrevStep !== 'locationconfirmation') {
          console.log('📍 PropertyBasics: Correcting sessionStorage previous step from', currentPrevStep, 'to locationconfirmation');
          sessionStorage.setItem(storagePrevStepKey, 'locationconfirmation');
          
          // Also ensure progress step and value are correct
          const storageStepKey = 'onb_progress_step';
          const storageKey = 'onb_progress_value';
          const locationConfirmationProgress = ((5 + 1) / 7) * 100; // locationconfirmation index 5
          sessionStorage.setItem(storageStepKey, '1');
          sessionStorage.setItem(storageKey, String(locationConfirmationProgress));
        }
      }
    }
  }, [hasLoadedDraft, actions, state.currentStep]);

  // Update propertyBasics when state changes (after loading draft)
  useEffect(() => {
    if (state.guestCapacity !== undefined || state.bedrooms || state.beds || state.bathrooms) {
      const newBasics = {
        guests: state.guestCapacity || state.guests || 4,
        bedrooms: state.bedrooms || 1,
        beds: state.beds || 2,
        bathrooms: state.bathrooms || 1
      };
      setPropertyBasics(newBasics);
    }
  }, [state.guestCapacity, state.guests, state.bedrooms, state.beds, state.bathrooms]);

  // Real-time context updates (moved to handleCounterChange)
  const updatePropertyBasics = (newBasics) => {
    console.log('PropertyBasics - Updating context with:', newBasics);
    // Map local state structure to context structure
    const contextBasics = {
      guestCapacity: newBasics.guests,
      bedrooms: newBasics.bedrooms,
      beds: newBasics.beds,
      bathrooms: newBasics.bathrooms
    };
    
    actions.updatePropertyBasics(contextBasics);
    // Removed setCurrentStep to prevent infinite loops
  };

  // Handle counter changes
  const handleCounterChange = (field, increment) => {
    setPropertyBasics(prev => {
      const newValue = increment ? prev[field] + 1 : prev[field] - 1;
      // Ensure minimum values
      const minValue = field === 'guests' ? 1 : (field === 'bathrooms' ? 0.5 : 1);
      const updatedBasics = {
        ...prev,
        [field]: Math.max(minValue, newValue)
      };
      
      // Schedule context update after render using setTimeout
      setTimeout(() => {
        const contextBasics = {
          guestCapacity: updatedBasics.guests,
          bedrooms: updatedBasics.bedrooms,
          beds: updatedBasics.beds,
          bathrooms: updatedBasics.bathrooms
        };
        
        console.log('Counter changed, updating context:', contextBasics);
        actions.updatePropertyBasics(contextBasics);
        // Remove setCurrentStep from counter changes to prevent infinite loops
      }, 0);
      
      return updatedBasics;
    });
  };

  // Save & Exit handler
  const handleSaveAndExitClick = async () => {
    try {
      console.log('PropertyBasics: Saving and exiting...');
      console.log('Current propertyBasics:', propertyBasics);
      
      // Update context with current values first
      updatePropertyBasics(propertyBasics);
      
      // Create current page data with proper mapping
      const currentPageData = {
        guestCapacity: propertyBasics.guests,
        guests: propertyBasics.guests,
        bedrooms: propertyBasics.bedrooms,
        beds: propertyBasics.beds,
        bathrooms: propertyBasics.bathrooms
      };
      
      // Save current data and exit
      await saveAndExit(currentPageData);
    } catch (error) {
      console.error('Error saving and exiting:', error);
      alert('Error saving progress: ' + error.message);
    }
  };

  // Counter component
  const Counter = ({ label, value, field, step = 1 }) => {
    const canDecrement = field === 'guests' ? value > 1 : (field === 'bathrooms' ? value > 0.5 : value > 1);
    
    return (
      <div className="flex items-center justify-between py-6 border-b border-gray-200 last:border-b-0">
        <span className="text-lg font-normal text-gray-900">{label}</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleCounterChange(field, false)}
            disabled={!canDecrement}
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-lg font-light ${
              canDecrement
                ? 'border-gray-300 text-gray-600 hover:border-gray-400'
                : 'border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
          >
            −
          </button>
          <span className="w-8 text-center text-lg font-normal">
            {field === 'bathrooms' && value % 1 !== 0 ? value.toFixed(1) : value}
          </span>
          <button
            onClick={() => handleCounterChange(field, true)}
            className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 flex items-center justify-center text-lg font-light"
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} />

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-[640px] mx-auto">
          <h1 className="text-[32px] font-medium text-gray-900 mb-4">
            Share some basics about your place
          </h1>
          <p className="text-gray-600 mb-12">
            You'll add more details later, like bed types.
          </p>

          {/* Counters Container */}
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            <Counter 
              label="Guests" 
              value={propertyBasics.guests} 
              field="guests" 
            />
            <Counter 
              label="Bedrooms" 
              value={propertyBasics.bedrooms} 
              field="bedrooms" 
            />
            <Counter 
              label="Beds" 
              value={propertyBasics.beds} 
              field="beds" 
            />
            <Counter 
              label="Bathrooms" 
              value={propertyBasics.bathrooms} 
              field="bathrooms" 
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <OnboardingFooter
        onBack={() => navigate('/pages/locationconfirmation', {
          state: {
            ...location.state,
            draftId: state?.draftId || location.state?.draftId
          }
        })}
        onNext={() => {
          updatePropertyBasics(propertyBasics);
          navigate('/pages/makeitstandout', { 
            state: { 
              ...location.state,
              propertyBasics
            } 
          });
        }}
        backText="Back"
        nextText="Next"
        canProceed={true}
      />
    </div>
  );
};

export default PropertyBasics;