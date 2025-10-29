import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Zap } from 'lucide-react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit';
import { auth } from '@/lib/firebase';

const BookingSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedOption, setSelectedOption] = useState('approve-first-5');

  // Ref to track initialization
  const hasInitialized = useRef(false);

  const bookingOptions = [
    {
      id: 'approve-first-5',
      title: 'Approve your first 5 bookings',
      label: 'Recommended',
      description: 'Start by reviewing reservation requests, then switch to Instant Book, so guests can book automatically.',
      icon: Calendar
    },
    {
      id: 'instant-book',
      title: 'Use Instant Book',
      description: 'Let guests book automatically.',
      icon: Zap
    }
  ];

  const canProceed = selectedOption !== null;

  // Debug: Log the location state
  console.log('BookingSettings - location.state:', location.state);

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      // Only load draft if user is authenticated and we have a draftId
      if (location.state?.draftId && !hasInitialized.current && actions.loadDraft && state.user) {
        console.log('BookingSettings - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          hasInitialized.current = true;
          console.log('BookingSettings - Draft loaded successfully');
        } catch (error) {
          console.error('BookingSettings - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state.user]);

  // Set current step when component mounts
  useEffect(() => {
    if (actions.setCurrentStep) {
      actions.setCurrentStep('booking-settings');
    }
  }, [actions]);

  // Initialize from context if available (after draft loading or direct navigation)
  useEffect(() => {
    if (state.bookingSettings && (hasInitialized.current || !location.state?.draftId)) {
      console.log('BookingSettings - Initializing from context:', state.bookingSettings);
      setSelectedOption(state.bookingSettings);
      if (!hasInitialized.current) {
        hasInitialized.current = true;
      }
    }
  }, [state.bookingSettings, hasInitialized.current, location.state?.draftId]);

  // Real-time context updates
  const updateBookingSettingsContext = (settings) => {
    console.log('BookingSettings - Updating context with:', settings);
    if (actions.updateBookingSettings) {
      actions.updateBookingSettings(settings);
    }
    // Removed setCurrentStep from here to prevent setState during render
  };

  // Handle option selection with context update
  const handleOptionSelect = (optionId) => {
    setSelectedOption(optionId);
    updateBookingSettingsContext(optionId);
  };

  // Custom Save & Exit handler
  const handleSaveAndExitClick = async () => {
    console.log('BookingSettings Save & Exit clicked');
    console.log('Current booking settings:', selectedOption);
    
    if (!auth.currentUser) {
      console.error('BookingSettings: No authenticated user');
      alert('Please log in to save your progress');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('BookingSettings: Setting currentStep to booking-settings');
        actions.setCurrentStep('booking-settings');
      }
      
      // Ensure booking settings are updated in context
      updateBookingSettingsContext(selectedOption);
      
      // Override the saveDraft to ensure currentStep and booking settings are saved correctly
      if (actions.saveDraft) {
        console.log('BookingSettings: Calling custom saveDraft with forced currentStep and booking settings');
        
        // Create modified state data with forced currentStep and booking settings
        const { user: contextUser, isLoading, ...dataToSave } = state;
        dataToSave.currentStep = 'booking-settings'; // Force the currentStep
        dataToSave.bookingSettings = selectedOption; // Save the current booking settings
        
        console.log('BookingSettings: Data to save with forced currentStep and booking settings:', dataToSave);
        
        // Use context saveDraft to ensure only one draft per session
        const draftId = await actions.saveDraft();
        
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
      console.error('Error in BookingSettings save:', error);
      alert('Failed to save progress: ' + error.message);
    } finally {
      setIsSaving(false);
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
              className="font-medium text-sm hover:underline"
              disabled={state.isLoading || isSaving}
            >
              {state.isLoading || isSaving ? 'Saving...' : 'Save & exit'}
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
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-medium text-gray-900 mb-4">
              Pick your booking settings
            </h1>
            <p className="text-lg text-gray-600">
              You can change this at any time.{' '}
              <button className="text-black underline hover:no-underline">
                Learn more
              </button>
            </p>
          </div>

          <div className="space-y-4">
            {bookingOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`w-full p-6 rounded-xl border-2 text-left transition-all hover:border-gray-400 ${
                    selectedOption === option.id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {option.title}
                        </h3>
                        {option.label && (
                          <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                            {option.label}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {option.description}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <IconComponent className="w-6 h-6 text-gray-400" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/finish-setup')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className={`rounded-lg px-8 py-3.5 text-base font-medium ${
                  canProceed
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (canProceed) {
                    // Update context before navigation
                    updateBookingSettingsContext(selectedOption);
                    
                    // Continue to guest selection
                    navigate('/pages/guest-selection', { 
                      state: { 
                        ...location.state,
                        bookingSettings: selectedOption
                      } 
                    });
                  }
                }}
                disabled={!canProceed}
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

export default BookingSettings;