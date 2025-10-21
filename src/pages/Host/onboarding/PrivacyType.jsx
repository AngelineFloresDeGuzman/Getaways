import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboardingAutoSave, useOnboardingNavigation } from './hooks/useOnboardingAutoSave';

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
  
  // Enhanced auto-save and state management
  const { 
    state, 
    actions, 
    loadDraftIfNeeded, 
    saveAndExit, 
    isLoading 
  } = useOnboardingAutoSave('privacy-type', []);

  const { navigateNext, navigateBack } = useOnboardingNavigation('privacy-type');
  
  const [selectedOption, setSelectedOption] = useState(state.privacyType || '');

  // Load draft if continuing from saved progress
  useEffect(() => {
    const initializePage = async () => {
      if (location.state?.draftId) {
        try {
          await loadDraftIfNeeded(location.state.draftId);
        } catch (error) {
          console.error('Error loading draft in PrivacyType:', error);
        }
      }
    };

    initializePage();
  }, [location.state, loadDraftIfNeeded]);

  // Update selectedOption when state changes (after loading draft)
  useEffect(() => {
    if (state.privacyType) {
      setSelectedOption(state.privacyType);
    }
  }, [state.privacyType]);

  // Handle privacy option selection
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    actions.updateState({ privacyType: option });
  };

  // Enhanced navigation functions
  const handleNext = async () => {
    if (!selectedOption) {
      alert('Please select a privacy type before continuing.');
      return;
    }
    
    try {
      // Ensure latest selection is saved
      actions.updateState({ privacyType: selectedOption });
      await navigateNext(navigate, '/pages/location', 'location');
    } catch (error) {
      console.error('Error navigating to next step:', error);
      // Continue navigation even if save fails
      navigate('/pages/location');
    }
  };

  const handleSaveAndExit = async () => {
    if (!selectedOption) {
      alert('Please select a privacy type before saving.');
      return;
    }
    
    try {
      // Pass current page data to ensure it's saved
      const currentPageData = { privacyType: selectedOption };
      await saveAndExit(currentPageData);
    } catch (error) {
      console.error('Error saving and exiting:', error);
      alert('Error saving progress: ' + error.message);
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
              onClick={handleSaveAndExit}
              disabled={isLoading}
              className="font-medium text-sm hover:underline disabled:opacity-50"
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
                onClick={() => handleOptionSelect(option.title)}
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
                onClick={() => navigateBack(navigate, '/pages/propertystructure')}
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
                onClick={handleNext}
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