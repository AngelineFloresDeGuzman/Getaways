import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Zap } from 'lucide-react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';

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

  // Set current step when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'bookingsettings') {
      console.log('📍 BookingSettings page - Setting currentStep to bookingsettings');
      actions.setCurrentStep('bookingsettings');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

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

  // Helper function to ensure we have a valid draftId and save bookingSettings to Firebase
  const ensureDraftAndSave = async (bookingSettingsData, targetRoute = '/pages/guestselection') => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
      console.log('📍 BookingSettings: Found temp ID, resetting to find/create real draft');
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
          console.log('📍 BookingSettings: Using existing draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          console.log('📍 BookingSettings: No existing drafts, creating new draft');
          const nextStep = targetRoute === '/pages/guestselection' ? 'guestselection' : 'bookingsettings';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              bookingSettings: bookingSettingsData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          console.log('📍 BookingSettings: ✅ Created new draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        console.error('📍 BookingSettings: Error finding/creating draft:', error);
        throw error;
      }
    }
    
    // Save to Firebase if we have a valid draftId
    if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
      try {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          // Update existing document - save bookingSettings under data.bookingSettings and currentStep
          const nextStep = targetRoute === '/pages/guestselection' ? 'guestselection' : 'bookingsettings';
          await updateDoc(draftRef, {
            'data.bookingSettings': bookingSettingsData,
            currentStep: nextStep,
            lastModified: new Date()
          });
          console.log('📍 BookingSettings: ✅ Saved bookingSettings to data.bookingSettings and currentStep to Firebase:', draftIdToUse, '- bookingSettings:', bookingSettingsData, ', currentStep:', nextStep);
        } else {
          // Document doesn't exist, create it
          console.log('📍 BookingSettings: Document not found, creating new one');
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const nextStep = targetRoute === '/pages/guestselection' ? 'guestselection' : 'bookingsettings';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              bookingSettings: bookingSettingsData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          console.log('📍 BookingSettings: ✅ Created new draft with bookingSettings:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        console.error('📍 BookingSettings: ❌ Error saving to Firebase:', error);
        throw error;
      }
    } else if (state.user?.uid) {
      console.warn('📍 BookingSettings: ⚠️ User authenticated but no valid draftId after ensureDraftAndSave');
      throw new Error('Failed to create draft for authenticated user');
    } else {
      console.warn('📍 BookingSettings: ⚠️ User not authenticated, cannot save to Firebase');
      return null;
    }
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
        console.log('BookingSettings: Setting currentStep to bookingsettings');
        actions.setCurrentStep('bookingsettings');
      }
      
      // Ensure booking settings are updated in context
      updateBookingSettingsContext(selectedOption);
      
      // Save bookingSettings to Firebase under data.bookingSettings
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(selectedOption, '/pages/bookingsettings');
        console.log('📍 BookingSettings: ✅ Saved bookingSettings to Firebase on Save & Exit');
      } catch (saveError) {
        console.error('📍 BookingSettings: Error saving to Firebase on Save & Exit:', saveError);
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
      console.error('Error in BookingSettings save:', error);
      alert('Failed to save progress: ' + error.message);
    } finally {
      setIsSaving(false);
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
      <OnboardingFooter
        onBack={() => navigate('/pages/finishsetup')}
        onNext={async () => {
          if (canProceed) {
            try {
              // Update context first
              updateBookingSettingsContext(selectedOption);
              
              // Save bookingSettings to Firebase
              let draftIdToUse;
              try {
                draftIdToUse = await ensureDraftAndSave(selectedOption, '/pages/guestselection');
                console.log('📍 BookingSettings: ✅ Saved bookingSettings to Firebase on Next click');
              } catch (saveError) {
                console.error('📍 BookingSettings: Error saving to Firebase on Next:', saveError);
                // Continue navigation even if save fails - data is in context
              }
              
              // Update current step in context
              if (actions.setCurrentStep) {
                actions.setCurrentStep('guestselection');
              }
              
              // Navigate to guest selection page
              navigate('/pages/guestselection', { 
                state: { 
                  ...location.state,
                  bookingSettings: selectedOption,
                  draftId: draftIdToUse || state?.draftId || location.state?.draftId
                } 
              });
            } catch (error) {
              console.error('Error saving booking settings:', error);
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

export default BookingSettings;