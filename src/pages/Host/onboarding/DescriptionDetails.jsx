import React, { useState, useEffect, useRef } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit';
import { auth } from '@/lib/firebase';

const DescriptionDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get property type from navigation state, default to 'place'
  const propertyType = location.state?.propertyType?.toLowerCase() || 
                      location.state?.selectedType?.toLowerCase() ||
                      'place';
  
  const [description, setDescription] = useState("You'll have a great time at this comfortable place to stay.");
  const maxLength = 500;

  // Ref to track initialization
  const hasInitialized = useRef(false);

  const canProceed = description.trim().length > 0;

  const handleDescriptionChange = (e) => {
    if (e.target.value.length <= maxLength) {
      const newDescription = e.target.value;
      setDescription(newDescription);
      
      // Update context in real-time
      updateDescriptionContext(newDescription);
    }
  };

  // Custom Save & Exit handler
  const handleSaveAndExitClick = async () => {
    console.log('DescriptionDetails Save & Exit clicked');
    console.log('Current description:', description);
    
    if (!auth.currentUser) {
      console.error('DescriptionDetails: No authenticated user');
      alert('Please log in to save your progress');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('DescriptionDetails: Setting currentStep to descriptiondetails');
        actions.setCurrentStep('descriptiondetails');
      }
      
      // Ensure description is updated in context
      updateDescriptionContext(description);
      
      // Override the saveDraft to ensure currentStep and description are saved correctly
      if (actions.saveDraft) {
        console.log('DescriptionDetails: Calling custom saveDraft with forced currentStep and description');
        
        // Create modified state data with forced currentStep and description
        const { user: contextUser, isLoading, ...dataToSave } = state;
        dataToSave.currentStep = 'descriptiondetails'; // Force the currentStep
        dataToSave.description = description.trim(); // Save the current description
        
        console.log('DescriptionDetails: Data to save with forced currentStep and description:', dataToSave);
        
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
      console.error('Error in DescriptionDetails save:', error);
      alert('Failed to save progress: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Debug: Log the location state
  console.log('DescriptionDetails - location.state:', location.state);
  console.log('DescriptionDetails - propertyType:', propertyType);

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      // Only load draft if user is authenticated and we have a draftId
      if (location.state?.draftId && !hasInitialized.current && actions.loadDraft && state.user) {
        console.log('DescriptionDetails - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          hasInitialized.current = true;
          console.log('DescriptionDetails - Draft loaded successfully');
        } catch (error) {
          console.error('DescriptionDetails - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state.user]);

  // Set current step when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'descriptiondetails') {
      console.log('📍 DescriptionDetails page - Setting currentStep to descriptiondetails');
      actions.setCurrentStep('descriptiondetails');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Initialize from context if available (after draft loading or direct navigation)
  useEffect(() => {
    if (state.description && (hasInitialized.current || !location.state?.draftId)) {
      console.log('DescriptionDetails - Initializing from context:', state.description);
      setDescription(state.description);
      if (!hasInitialized.current) {
        hasInitialized.current = true;
      }
    }
  }, [state.description, hasInitialized.current, location.state?.draftId]);

  // Real-time context updates
  const updateDescriptionContext = (desc) => {
    console.log('DescriptionDetails - Updating context with:', desc);
    if (actions.updateTitleDescription) {
      actions.updateTitleDescription(state.title || '', desc);
    }
    // Removed setCurrentStep from here to prevent setState during render
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader />
      <main className="pt-20 px-8 pb-32">
        <div className="space-y-4">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold leading-tight">
                Describe your place
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                Help guests know what to expect by providing a detailed description of your place.
              </p>
            </div>

            <div className="space-y-4">
              <textarea
                value={description}
                onChange={handleDescriptionChange}
                className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none text-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <div className="text-right text-sm text-gray-500">
                {description.length}/{maxLength}
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/description')}
                className="hover:underline text-sm"
              >
                Back
              </button>
              <button 
                className={`rounded-lg px-6 py-2.5 text-sm font-medium ${
                  canProceed
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (canProceed) {
                    // Update context before navigation
                    updateDescriptionContext(description);
                    
                    // Continue to next step with description
                    navigate('/pages/finishsetup', { 
                      state: { 
                        ...location.state,
                        description: description
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

export default DescriptionDetails;