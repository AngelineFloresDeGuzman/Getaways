import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
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

  // Set current step when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'titledescription') {
      console.log('📍 TitleDescription page - Setting currentStep to titledescription');
      actions.setCurrentStep('titledescription');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

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
    // Removed setCurrentStep from here to prevent setState during render
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
        console.log('TitleDescription: Setting currentStep to titledescription');
        actions.setCurrentStep('titledescription');
      }
      
      // Ensure title is updated in context
      updateTitleContext(title);
      
      // Override the saveDraft to ensure currentStep and title are saved correctly
      if (actions.saveDraft) {
        console.log('TitleDescription: Calling custom saveDraft with forced currentStep and title');
        
        // Create modified state data with forced currentStep and title
        const { user: contextUser, isLoading, ...dataToSave } = state;
        dataToSave.currentStep = 'titledescription'; // Force the currentStep
        dataToSave.title = title.trim(); // Save the current title
        
        console.log('TitleDescription: Data to save with forced currentStep and title:', dataToSave);
        
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
      console.error('Error in TitleDescription save:', error);
      alert('Failed to save progress: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Shared Onboarding Header */}
      <OnboardingHeader showProgress={true} />

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

      <OnboardingFooter
        onBack={() => navigate('/pages/photospreview')}
        onNext={() => {
          if (canProceed) {
            updateTitleContext(title);
            navigate('/pages/description', { 
              state: { 
                ...location.state,
                title: title
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

export default TitleDescription;
