import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboardingAutoSave, useOnboardingNavigation } from './hooks/useOnboardingAutoSave';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';

const GuestSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Enhanced auto-save and state management
  const { 
    state, 
    actions, 
    loadDraftIfNeeded, 
    saveAndExit, 
    isLoading 
  } = useOnboardingAutoSave('guestselection', []);
  
  const { navigateNext, navigateBack } = useOnboardingNavigation('guestselection');
  
  // Ref to track initialization
  const hasInitialized = useRef(false);
  
  const [selectedOption, setSelectedOption] = useState(state.selectedGuestOption || 'any-guest');

  const guestOptions = [
    {
      id: 'any-guest',
      title: 'Any Airbnb guest',
      description: 'Get reservations faster when you welcome anyone from the Airbnb community.',
    },
    {
      id: 'experienced-guest',
      title: 'An experienced guest',
      description: 'For your first guest, welcome someone with a good track record on Airbnb who can offer tips for how to be a great Host.',
    }
  ];

  const canProceed = selectedOption !== null;

  // Load draft if continuing from saved progress
  useEffect(() => {
    const initializePage = async () => {
      if (location.state?.draftId) {
        try {
          await loadDraftIfNeeded(location.state.draftId);
        } catch (error) {
          console.error('Error loading draft in GuestSelection:', error);
        }
      }
    };

    initializePage();
  }, [location.state, loadDraftIfNeeded]);

  // Update selectedOption when state changes (after loading draft)
  useEffect(() => {
    if (state.selectedGuestOption) {
      setSelectedOption(state.selectedGuestOption);
    }
  }, [state.selectedGuestOption]);

  // Set current step when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'guestselection') {
      console.log('📍 GuestSelection page - Setting currentStep to guestselection');
      actions.setCurrentStep('guestselection');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Initialize from context if available (after draft loading or direct navigation)
  useEffect(() => {
    if (state.guestSelection && (hasInitialized.current || !location.state?.draftId)) {
      console.log('GuestSelection - Initializing from context:', state.guestSelection);
      setSelectedOption(state.guestSelection);
      if (!hasInitialized.current) {
        hasInitialized.current = true;
      }
    }
  }, [state.guestSelection, hasInitialized.current, location.state?.draftId]);

  // Real-time context updates
  const updateGuestSelectionContext = (selection) => {
    console.log('GuestSelection - Updating context with:', selection);
    if (actions.updateGuestSelection) {
      actions.updateGuestSelection(selection);
    }
    // Removed setCurrentStep from here to prevent setState during render
  };

  // Handle option selection with context update
  const handleOptionSelect = (optionId) => {
    setSelectedOption(optionId);
    updateGuestSelectionContext(optionId);
  };

  // Save & Exit handler
  const handleSaveAndExitClick = async () => {
    try {
      console.log('GuestSelection: Saving and exiting...');
      console.log('Current guest selection:', selectedOption);
      
      // Update context with current selection first
      updateGuestSelectionContext(selectedOption);
      
      // Create current page data
      const currentPageData = {
        selectedGuestOption: selectedOption,
        guestSelection: selectedOption  // Legacy support
      };
      
      // Save current data and exit
      await saveAndExit(currentPageData);
    } catch (error) {
      console.error('Error saving and exiting:', error);
      alert('Error saving progress: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} />

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-medium text-gray-900 mb-4">
              Choose who to welcome for your first reservation
            </h1>
            <p className="text-lg text-gray-600">
              After your first guest, anyone can book your place.{' '}
              <button className="text-black underline hover:no-underline">
                Learn more
              </button>
            </p>
          </div>

          <div className="space-y-4">
            {guestOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option.id)}
                className={`w-full p-6 rounded-xl border-2 text-left transition-all hover:border-gray-400 ${
                  selectedOption === option.id
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Radio button */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedOption === option.id
                        ? 'border-black bg-black'
                        : 'border-gray-300'
                    }`}>
                      {selectedOption === option.id && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {option.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <OnboardingFooter
        onBack={() => navigate('/pages/bookingsettings')}
        onNext={() => {
          if (canProceed) {
            updateGuestSelectionContext(selectedOption);
            navigate('/pages/pricing', { 
              state: { 
                ...location.state,
                guestSelection: selectedOption
              } 
            });
          }
        }}
        backText="Back"
        nextText="Next"
        canProceed={canProceed}
      />
    </div>
  );
};

export default GuestSelection;