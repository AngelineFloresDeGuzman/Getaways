import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit.js';

const privacyOptions = [
  {
    title: 'An entire place',
    description: 'Guests have the whole place to themselves.',
    icon: '🏠'
  },
  {
    title: 'A room',
    description: 'Guests have their own room in a home, plus access to shared spaces.',
    icon: '🛏️'
  },
  {
    title: 'A shared room in a hostel',
    description: 'Guests sleep in a shared room in a professionally managed hostel with staff onsite 24/7.',
    icon: '👥'
  }
];

const PrivacyType = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use OnboardingContext for proper draft management
  let contextData;
  try {
    contextData = useOnboarding();
  } catch (error) {
    console.error('PrivacyType must be used within OnboardingProvider');
    return null;
  }

  const { state, actions } = contextData;
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);
  const [selectedOption, setSelectedOption] = useState('');
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Use ref to avoid infinite re-renders
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Initialize selectedOption from state (only once)
  useEffect(() => {
    if (!hasInitialized) {
      if (state.privacyType) {
        setSelectedOption(state.privacyType);
      }
      setHasInitialized(true);
    }
  }, [hasInitialized, state.privacyType]);

  // Load draft if draftId is provided
  useEffect(() => {
    const loadDraftData = async () => {
      if (location.state?.draftId && !hasLoadedDraft) {
        try {
          console.log('Loading draft in PrivacyType:', location.state.draftId);
          await actionsRef.current.loadDraft(location.state.draftId);
          setHasLoadedDraft(true);
        } catch (error) {
          console.error('Failed to load draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, hasLoadedDraft]);

  // Update selectedOption when draft is loaded
  useEffect(() => {
    if (hasLoadedDraft && state.privacyType && state.privacyType !== selectedOption) {
      console.log('Setting selectedOption from loaded draft:', state.privacyType);
      setSelectedOption(state.privacyType);
    }
  }, [hasLoadedDraft, state.privacyType]);

  // Update context when local state changes (only when user makes a selection)
  useEffect(() => {
    if (hasInitialized && selectedOption && !state.isLoading) {
      actionsRef.current.updatePrivacyType(selectedOption);
    }
  }, [selectedOption, hasInitialized, state.isLoading]);

  // Set current step when component mounts (only once)
  useEffect(() => {
    if (actionsRef.current.setCurrentStep && state.currentStep !== 'privacy-type') {
      actionsRef.current.setCurrentStep('privacy-type');
    }
  }, []); // Empty dependency array - only run on mount

  // Force reset loading state once draft is loaded
  useEffect(() => {
    if (hasLoadedDraft && state.draftId && state.isLoading) {
      console.log('Draft loaded in PrivacyType, resetting loading state');
      actionsRef.current.setLoading(false);
    }
  }, [hasLoadedDraft, state.draftId, state.isLoading]);

  // Safety mechanism to reset loading state if stuck
  useEffect(() => {
    if (state.isLoading) {
      const timeoutId = setTimeout(() => {
        console.warn('Loading state was stuck in PrivacyType, forcing reset');
        actionsRef.current.setLoading(false);
      }, 5000); // 5 second timeout

      return () => clearTimeout(timeoutId);
    }
  }, [state.isLoading]);

  // Custom save handler
  const handleSaveAndExitClick = async () => {
    console.log('PrivacyType Save & Exit clicked - Selected:', selectedOption);
    console.log('PrivacyType: Current state before setting step:', { 
      currentStep: state.currentStep, 
      privacyType: state.privacyType 
    });
    
    if (!selectedOption) {
      alert('Please select a privacy type before saving.');
      return;
    }
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('PrivacyType: Setting currentStep to privacy-type');
        actions.setCurrentStep('privacy-type');
      }
      
      // Override the saveDraft to ensure currentStep is set to privacy-type
      if (actions.saveDraft) {
        console.log('PrivacyType: Calling custom saveDraft with forced currentStep');
        
        // Create modified state data with forced currentStep
        const { user, isLoading, ...dataToSave } = state;
        dataToSave.currentStep = 'privacy-type'; // Force the currentStep
        
        console.log('PrivacyType: Data to save with forced currentStep:', dataToSave);
        
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
      
    } catch (error) {
      console.error('Error in PrivacyType save:', error);
      alert('Failed to save progress: ' + error.message);
    }
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
              disabled={state.isLoading}
              className="font-medium text-sm hover:underline disabled:opacity-50"
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
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-[66.66%]"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1"></div>
          <div className="h-full bg-gray-200 flex-1"></div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-[640px] mx-auto">
          <h1 className="text-[32px] font-medium text-gray-900 mb-12">
            What type of place will guests have?
          </h1>

          <div className="flex flex-col gap-4">
            {privacyOptions.map((option) => (
              <button
                key={option.title}
                onClick={() => setSelectedOption(option.title)}
                className={`flex items-center p-6 rounded-xl border hover:border-black transition-colors ${
                  selectedOption === option.title
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex-1 text-left">
                  <h3 className="font-medium mb-1">{option.title}</h3>
                  <p className="text-gray-600">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/propertystructure')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className={`rounded-lg px-8 py-3.5 text-base font-medium ${
                  selectedOption
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={() => navigate('/pages/location', {
                  state: {
                    ...location.state,
                    privacyType: selectedOption
                  }
                })}
                disabled={!selectedOption}
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

export default PrivacyType;