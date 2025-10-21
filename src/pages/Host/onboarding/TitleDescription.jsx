import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit';
import { auth } from '@/lib/firebase';

const TitleDescription = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  const [isSaving, setIsSaving] = useState(false);
  
  // Get property type from navigation state, default to 'place'
  // Try multiple fallbacks to get property type
  const propertyType = location.state?.propertyType?.toLowerCase() || 
                      location.state?.selectedType?.toLowerCase() ||
                      'house'; // Better default than 'place'
  
  // Debug: Log the location state
  console.log('TitleDescription - location.state:', location.state);
  console.log('TitleDescription - propertyType:', propertyType);
  
  const [title, setTitle] = useState('');
  const maxLength = 50;

  // Ref to track initialization
  const hasInitialized = useRef(false);

  // Save and Exit hook integration
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);

  const canProceed = title.trim().length > 0;

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      // Only load draft if user is authenticated and we have a draftId
      if (location.state?.draftId && !hasInitialized.current && actions.loadDraft && state.user) {
        console.log('TitleDescription - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          hasInitialized.current = true;
          console.log('TitleDescription - Draft loaded successfully');
        } catch (error) {
          console.error('TitleDescription - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state.user]); // Added state.user dependency

  // Set current step when component mounts
  useEffect(() => {
    if (actions.setCurrentStep) {
      actions.setCurrentStep('title-description');
    }
  }, []);

  // Debug logging for title state changes
  useEffect(() => {
    console.log('TitleDescription - title state changed:', title);
    console.log('TitleDescription - context title:', state.title);
    console.log('TitleDescription - hasInitialized:', hasInitialized.current);
    console.log('TitleDescription - location draftId:', location.state?.draftId);
  }, [title, state.title, hasInitialized.current, location.state?.draftId]);

  // Initialize from context if available (after draft loading or direct navigation)
  useEffect(() => {
    if (state.title && (hasInitialized.current || !location.state?.draftId)) {
      console.log('TitleDescription - Initializing from context:', state.title);
      setTitle(state.title);
      if (!hasInitialized.current) {
        hasInitialized.current = true;
      }
    }
  }, [state.title, hasInitialized.current, location.state?.draftId]);

  // Real-time context updates
  const updateTitleContext = (newTitle) => {
    console.log('TitleDescription - Updating context with:', newTitle);
    actions.updateTitleDescription(newTitle, state.description || '');
    actions.setCurrentStep('title-description');
  };

  const handleTitleChange = (e) => {
    if (e.target.value.length <= maxLength) {
      const newTitle = e.target.value;
      setTitle(newTitle);
      
      // Update context in real-time
      updateTitleContext(newTitle);
    }
  };

  // Custom Save & Exit handler
  const handleSaveAndExitClick = async () => {
    console.log('TitleDescription Save & Exit clicked');
    console.log('Current title:', title);
    
    if (!auth.currentUser) {
      console.error('TitleDescription: No authenticated user');
      alert('Please log in to save your progress');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('TitleDescription: Setting currentStep to title-description');
        actions.setCurrentStep('title-description');
      }
      
      // Ensure title is updated in context
      updateTitleContext(title);
      
      // Override the saveDraft to ensure currentStep and title are saved correctly
      if (actions.saveDraft) {
        console.log('TitleDescription: Calling custom saveDraft with forced currentStep and title');
        
        // Create modified state data with forced currentStep and title
        const { user: contextUser, isLoading, ...dataToSave } = state;
        dataToSave.currentStep = 'title-description'; // Force the currentStep
        dataToSave.title = title.trim(); // Save the current title
        
        console.log('TitleDescription: Data to save with forced currentStep and title:', dataToSave);
        
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
      console.error('Error in TitleDescription save:', error);
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
              Now, let's give your {propertyType} a title
            </h1>
            <p className="text-lg text-gray-600">
              Short titles work best. Have fun with it—you can always change it later.
            </p>
          </div>

          <div className="space-y-4">
            <textarea
              value={title}
              onChange={handleTitleChange}
              placeholder=""
              className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none text-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <div className="text-right text-sm text-gray-500">
              {title.length}/{maxLength}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/photos')}
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
                    updateTitleContext(title);
                    
                    // Continue to next step with title
                    navigate('/pages/description', { 
                      state: { 
                        ...location.state,
                        title: title
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

export default TitleDescription;
