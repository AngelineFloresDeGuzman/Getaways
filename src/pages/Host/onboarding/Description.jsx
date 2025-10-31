import React, { useState, useEffect, useRef } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit';
import { auth } from '@/lib/firebase';

const Description = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get property type from navigation state, default to 'house'
  const propertyType = location.state?.propertyType?.toLowerCase() || 
                      location.state?.selectedType?.toLowerCase() ||
                      'house';
  
  const [selectedHighlights, setSelectedHighlights] = useState([]);

  // Ref to track initialization
  const hasInitialized = useRef(false);

  const highlights = [
    { id: 'peaceful', label: 'Peaceful', icon: '🕊️' },
    { id: 'unique', label: 'Unique', icon: '✨' },
    { id: 'family-friendly', label: 'Family-friendly', icon: '👨‍👩‍👧‍👦' },
    { id: 'stylish', label: 'Stylish', icon: '🎨' },
    { id: 'central', label: 'Central', icon: '📍' },
    { id: 'spacious', label: 'Spacious', icon: '📐' }
  ];

  const toggleHighlight = (highlightId) => {
    setSelectedHighlights(prev => {
      let newHighlights;
      if (prev.includes(highlightId)) {
        newHighlights = prev.filter(id => id !== highlightId);
      } else if (prev.length < 2) {
        newHighlights = [...prev, highlightId];
      } else {
        return prev; // No change if already at max
      }
      
      // Update context in real-time
      updateHighlightsContext(newHighlights);
      return newHighlights;
    });
  };

  // Custom Save & Exit handler
  const handleSaveAndExitClick = async () => {
    console.log('Description Save & Exit clicked');
    console.log('Current highlights:', selectedHighlights);
    
    if (!auth.currentUser) {
      console.error('Description: No authenticated user');
      alert('Please log in to save your progress');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('Description: Setting currentStep to description');
        actions.setCurrentStep('description');
      }
      
      // Ensure highlights are updated in context
      updateHighlightsContext(selectedHighlights);
      
      // Override the saveDraft to ensure currentStep and highlights are saved correctly
      if (actions.saveDraft) {
        console.log('Description: Calling custom saveDraft with forced currentStep and highlights');
        
        // Create modified state data with forced currentStep and highlights
        const { user: contextUser, isLoading, ...dataToSave } = state;
        dataToSave.currentStep = 'description'; // Force the currentStep
        dataToSave.descriptionHighlights = selectedHighlights; // Save the current highlights
        
        console.log('Description: Data to save with forced currentStep and highlights:', dataToSave);
        
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
      console.error('Error in Description save:', error);
      alert('Failed to save progress: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = selectedHighlights.length >= 1;

  // Debug: Log the location state
  console.log('Description - location.state:', location.state);
  console.log('Description - propertyType:', propertyType);

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      // Only load draft if user is authenticated and we have a draftId
      if (location.state?.draftId && !hasInitialized.current && actions.loadDraft && state.user) {
        console.log('Description - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          hasInitialized.current = true;
          console.log('Description - Draft loaded successfully');
        } catch (error) {
          console.error('Description - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state.user]);

  // Set current step when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'description') {
      console.log('📍 Description page - Setting currentStep to description');
      actions.setCurrentStep('description');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Initialize from context if available (after draft loading or direct navigation)
  useEffect(() => {
    if (state.descriptionHighlights && (hasInitialized.current || !location.state?.draftId)) {
      console.log('Description - Initializing from context:', state.descriptionHighlights);
      setSelectedHighlights(state.descriptionHighlights);
      if (!hasInitialized.current) {
        hasInitialized.current = true;
      }
    }
  }, [state.descriptionHighlights, hasInitialized.current, location.state?.draftId]);

  // Real-time context updates
  const updateHighlightsContext = (highlights) => {
    console.log('Description - Updating context with:', highlights);
    if (actions.updateDescriptionHighlights) {
      actions.updateDescriptionHighlights(highlights);
    }
    // Removed setCurrentStep from here to prevent setState during render
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader />
      <main className="pt-20 px-8 pb-32">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
          {highlights.map((highlight) => (
            <button
              key={highlight.id}
              onClick={() => toggleHighlight(highlight.id)}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                selectedHighlights.includes(highlight.id)
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${
                !selectedHighlights.includes(highlight.id) && selectedHighlights.length >= 2
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
              disabled={!selectedHighlights.includes(highlight.id) && selectedHighlights.length >= 2}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{highlight.icon}</span>
                <span className="text-lg font-medium">{highlight.label}</span>
              </div>
            </button>
          ))}
        </div>
        
        {selectedHighlights.length > 0 && (
          <div className="text-center text-sm text-gray-500 mt-4">
            {selectedHighlights.length} of 2 highlights selected
          </div>
        )}
        </div>
      </main>

      {/* Footer */}
      <OnboardingFooter
        onBack={() => navigate('/pages/titledescription')}
        onNext={() => {
          if (canProceed) {
            updateHighlightsContext(selectedHighlights);
            navigate('/pages/descriptiondetails', { 
              state: { 
                ...location.state,
                descriptionHighlights: selectedHighlights
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

export default Description;