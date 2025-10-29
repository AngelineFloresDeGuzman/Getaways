import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboardingAutoSave, useOnboardingNavigation } from './hooks/useOnboardingAutoSave';

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
  } = useOnboardingAutoSave('property-basics', []);
  
  const { navigateNext, navigateBack } = useOnboardingNavigation('property-basics');
  
  // State for property basics
  const [propertyBasics, setPropertyBasics] = useState({
    guests: state.guestCapacity || 4,
    bedrooms: state.bedrooms || 1,
    beds: state.beds || 2,
    bathrooms: state.bathrooms || 1
  });

  // Ref to track initialization
  const hasInitialized = useRef(false);

  // Load draft if continuing from saved progress
  useEffect(() => {
    const initializePage = async () => {
      if (location.state?.draftId) {
        try {
          await loadDraftIfNeeded(location.state.draftId);
        } catch (error) {
          console.error('Error loading draft in PropertyBasics:', error);
        }
      }
    };

    initializePage();
  }, [location.state, loadDraftIfNeeded]);

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
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save & exit'}
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
                onClick={() => navigate('/pages/locationconfirmation')}
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