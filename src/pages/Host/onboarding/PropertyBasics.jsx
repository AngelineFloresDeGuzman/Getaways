import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit';

const PropertyBasics = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  
  // State for property basics
  const [propertyBasics, setPropertyBasics] = useState({
    guests: 4,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1
  });

  // Ref to track initialization
  const hasInitialized = useRef(false);
  const draftLoaded = useRef(false);

  // Save and Exit hook integration
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      if (location.state?.draftId && !draftLoaded.current && actions.loadDraft) {
        console.log('PropertyBasics - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          draftLoaded.current = true;
          console.log('PropertyBasics - Draft loaded successfully');
        } catch (error) {
          console.error('PropertyBasics - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId]); // Remove actions from dependency

  // Set current step when component mounts (only once)
  useEffect(() => {
    if (actions.setCurrentStep) {
      actions.setCurrentStep('property-basics');
    }
  }, []); // Remove actions from dependency, run only once

  // Initialize from context if available
  useEffect(() => {
    if (!hasInitialized.current && state && (draftLoaded.current || !location.state?.draftId)) {
      console.log('PropertyBasics - Initializing from context:', {
        guests: state.guestCapacity,
        bedrooms: state.bedrooms,
        beds: state.beds,
        bathrooms: state.bathrooms
      });
      
      setPropertyBasics({
        guests: state.guestCapacity || 4,
        bedrooms: state.bedrooms || 1,
        beds: state.beds || 2,
        bathrooms: state.bathrooms || 1
      });
      hasInitialized.current = true;
    }
  }, [state.guestCapacity, state.bedrooms, state.beds, state.bathrooms, draftLoaded.current, location.state?.draftId]);

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
    console.log('PropertyBasics Save & Exit clicked');
    console.log('Current propertyBasics state:', propertyBasics);
    console.log('Current onboarding context state:', {
      guestCapacity: state.guestCapacity,
      bedrooms: state.bedrooms,
      beds: state.beds,
      bathrooms: state.bathrooms
    });
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('PropertyBasics: Setting currentStep to property-basics');
        actions.setCurrentStep('property-basics');
      }
      
      // Update context with current values
      const contextBasics = {
        guestCapacity: propertyBasics.guests,
        bedrooms: propertyBasics.bedrooms,
        beds: propertyBasics.beds,
        bathrooms: propertyBasics.bathrooms
      };
      
      console.log('PropertyBasics: Updating context with:', contextBasics);
      actions.updatePropertyBasics(contextBasics);
      
      // Override the saveDraft to ensure currentStep and data are saved correctly
      if (actions.saveDraft) {
        console.log('PropertyBasics: Calling custom saveDraft with forced currentStep and data');
        
        // Create modified state data with forced currentStep and property basics
        const { user, isLoading, ...dataToSave } = state;
        dataToSave.currentStep = 'property-basics'; // Force the currentStep
        dataToSave.guestCapacity = propertyBasics.guests;
        dataToSave.bedrooms = propertyBasics.bedrooms;
        dataToSave.beds = propertyBasics.beds;
        dataToSave.bathrooms = propertyBasics.bathrooms;
        
        console.log('PropertyBasics: Data to save with forced currentStep and property data:', dataToSave);
        
        // Import the draftService directly and save with our custom data
        const { saveDraft } = await import('@/pages/Host/services/draftService');
        const draftId = await saveDraft(dataToSave, state.draftId);
        
        // Update the draftId in context
        if (actions.setDraftId) {
          actions.setDraftId(draftId);
        }
        
        // Navigate to dashboard
        navigate('/host/hostdashboard', { 
          state: { 
            message: 'Draft saved successfully!',
            draftSaved: true 
          }
        });
      } else {
        // Fallback to normal save
        await handleSaveAndExit();
      }
      
      console.log('PropertyBasics save completed successfully');
    } catch (error) {
      console.error('Error during PropertyBasics save and exit:', error);
      alert('Failed to save: ' + error.message);
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b">
        <div className="py-4 px-8 flex justify-between items-center">
          <svg viewBox="0 0 32 32" className="h-8 w-8">
            <path d="m16 1c2.008 0 3.978.378 5.813 1.114 1.837.736 3.525 1.798 4.958 3.138 1.433 1.34 2.56 2.92 3.355 4.628.795 1.709 1.2 3.535 1.2 5.394 0 1.859-.405 3.685-1.2 5.394-.795 1.708-1.922 3.288-3.355 4.628-1.433 1.34-3.121 2.402-4.958 3.138-1.835.736-3.805 1.114-5.813 1.114s-3.978-.378-5.813-1.114c-1.837-.736-3.525-1.798-4.958-3.138-1.433-1.34-2.56-2.92-3.355-4.628-.795-1.709-1.2-3.535-1.2-5.394 0-1.859.405-3.685 1.2-5.394.795-1.708 1.922-3.288 3.355-4.628 1.433-1.34 3.121-2.402 4.958-3.138 1.835-.736 3.805-1.114 5.813-1.114z" fill="rgb(255, 56, 92)"/>
          </svg>
          <div className="flex items-center gap-6">
            <button className="font-medium text-sm hover:underline">Questions?</button>
            <button 
              onClick={handleSaveAndExitClick}
              className="font-medium text-sm hover:underline"
              disabled={state.isLoading}
            >
              {state.isLoading ? 'Saving...' : 'Save & exit'}
            </button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="h-1 w-full flex space-x-2">
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
        </div>
      </div>

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
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/location-confirmation')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className="bg-black text-white hover:bg-gray-800 rounded-lg px-8 py-3.5 text-base font-medium"
                onClick={() => {
                  // Update context before navigation
                  updatePropertyBasics(propertyBasics);
                  
                  // Navigate to make it stand out with property basics data
                  navigate('/pages/make-it-stand-out', { 
                    state: { 
                      ...location.state,
                      propertyBasics
                    } 
                  });
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PropertyBasics;