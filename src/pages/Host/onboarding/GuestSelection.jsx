import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';

const GuestSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  
  // Ref to track initialization
  const hasInitialized = useRef(false);
  
  const [selectedOption, setSelectedOption] = useState(state.selectedGuestOption || 'any-guest');

  const guestOptions = [
    {
      id: 'any-guest',
      title: 'Any Getaways guest',
      description: 'Get reservations faster when you welcome anyone from the Getaways community.',
    },
    {
      id: 'experienced-guest',
      title: 'An experienced guest',
      description: 'For your first guest, welcome someone with a good track record on Getaways who can offer tips for how to be a great Host.',
    }
  ];

  const canProceed = selectedOption !== null;

  // Load draft if continuing from saved progress
  useEffect(() => {
    const initializePage = async () => {
      if (location.state?.draftId && !hasInitialized.current && actions.loadDraft && state.user) {
        console.log('GuestSelection - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          hasInitialized.current = true;
          console.log('GuestSelection - Draft loaded successfully');
        } catch (error) {
          console.error('GuestSelection - Error loading draft:', error);
        }
      }
    };

    initializePage();
  }, [location.state?.draftId, state.user, actions.loadDraft]);

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

  // Ensure context is updated when selectedOption changes, so Save & Exit in header saves the current selection
  useEffect(() => {
    if (selectedOption && actions.updateGuestSelection) {
      updateGuestSelectionContext(selectedOption);
    }
  }, [selectedOption]);


  // Real-time context updates
  const updateGuestSelectionContext = (selection) => {
    console.log('GuestSelection - Updating context with:', selection);
    if (actions.updateGuestSelection) {
      actions.updateGuestSelection(selection);
    }
  };

  // Handle option selection with context update
  const handleOptionSelect = (optionId) => {
    setSelectedOption(optionId);
    updateGuestSelectionContext(optionId);
  };

  // Helper function to ensure we have a valid draftId and save guestSelection to Firebase
  const ensureDraftAndSave = async (guestSelectionData, targetRoute = '/pages/pricing') => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
      console.log('📍 GuestSelection: Found temp ID, resetting to find/create real draft');
      draftIdToUse = null;
    }
    
    // If user is authenticated, ensure we have a draft
    if (!draftIdToUse && state.user?.uid) {
      try {
        const { getUserDrafts, saveDraft } = await import('@/pages/Host/services/draftService');
        const drafts = await getUserDrafts();
        
        if (drafts.length > 0) {
          // Use the most recent draft
          draftIdToUse = drafts[0].id;
          console.log('📍 GuestSelection: Using existing draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          console.log('📍 GuestSelection: No existing drafts, creating new draft');
          const nextStep = targetRoute === '/pages/pricing' ? 'pricing' : 'guestselection';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              guestSelection: guestSelectionData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          console.log('📍 GuestSelection: ✅ Created new draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        console.error('📍 GuestSelection: Error finding/creating draft:', error);
        throw error;
      }
    }
    
    // Save to Firebase if we have a valid draftId
    if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
      try {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          // Update existing document - save guestSelection under data.guestSelection and currentStep
          const nextStep = targetRoute === '/pages/pricing' ? 'pricing' : 'guestselection';
          await updateDoc(draftRef, {
            'data.guestSelection': guestSelectionData,
            currentStep: nextStep,
            lastModified: new Date()
          });
          console.log('📍 GuestSelection: ✅ Saved guestSelection to data.guestSelection and currentStep to Firebase:', draftIdToUse, '- guestSelection:', guestSelectionData, ', currentStep:', nextStep);
        } else {
          // Document doesn't exist, create it
          console.log('📍 GuestSelection: Document not found, creating new one');
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const nextStep = targetRoute === '/pages/pricing' ? 'pricing' : 'guestselection';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              guestSelection: guestSelectionData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          console.log('📍 GuestSelection: ✅ Created new draft with guestSelection:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        console.error('📍 GuestSelection: ❌ Error saving to Firebase:', error);
        throw error;
      }
    } else if (state.user?.uid) {
      console.warn('📍 GuestSelection: ⚠️ User authenticated but no valid draftId after ensureDraftAndSave');
      throw new Error('Failed to create draft for authenticated user');
    } else {
      console.warn('📍 GuestSelection: ⚠️ User not authenticated, cannot save to Firebase');
      return null;
    }
  };

  // Save & Exit handler
  const handleSaveAndExitClick = async () => {
    console.log('GuestSelection Save & Exit clicked');
    console.log('Current guest selection:', selectedOption);
    
    if (!auth.currentUser) {
      console.error('GuestSelection: No authenticated user');
      alert('Please log in to save your progress');
      return;
    }
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('GuestSelection: Setting currentStep to guestselection');
        actions.setCurrentStep('guestselection');
      }
      
      // Ensure guest selection is updated in context
      updateGuestSelectionContext(selectedOption);
      
      // Save guestSelection to Firebase under data.guestSelection
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(selectedOption, '/pages/guestselection');
        console.log('📍 GuestSelection: ✅ Saved guestSelection to Firebase on Save & Exit');
      } catch (saveError) {
        console.error('📍 GuestSelection: Error saving to Firebase on Save & Exit:', saveError);
        // Continue with save & exit even if Firebase save fails
      }
      
      // Navigate to dashboard
      navigate('/host/hostdashboard', { 
        state: { 
          message: 'Draft saved successfully!',
          draftSaved: true 
        }
      });
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
        onNext={async () => {
          if (canProceed) {
            try {
              // Update context first
              updateGuestSelectionContext(selectedOption);
              
              // Save guestSelection to Firebase
              let draftIdToUse;
              try {
                draftIdToUse = await ensureDraftAndSave(selectedOption, '/pages/pricing');
                console.log('📍 GuestSelection: ✅ Saved guestSelection to Firebase on Next click');
              } catch (saveError) {
                console.error('📍 GuestSelection: Error saving to Firebase on Next:', saveError);
                // Continue navigation even if save fails - data is in context
              }
              
              // Update current step in context
              if (actions.setCurrentStep) {
                actions.setCurrentStep('pricing');
              }
              
              // Navigate to pricing page
              navigate('/pages/pricing', { 
                state: { 
                  ...location.state,
                  guestSelection: selectedOption,
                  draftId: draftIdToUse || state?.draftId || location.state?.draftId
                } 
              });
            } catch (error) {
              console.error('Error saving guest selection:', error);
              alert('Error saving progress. Please try again.');
            }
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