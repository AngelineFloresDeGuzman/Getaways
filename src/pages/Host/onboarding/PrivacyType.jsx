import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';

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
  // Block auto-save for privacytype step after manual save
  const justSavedRef = React.useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const { state, actions } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);
  const [draftRef, setDraftRef] = useState(null);
  const [selectedOption, setSelectedOption] = useState(state.privacyType || 'An entire place');
  let draftId = location.state?.draftId;

  // Ensure lordicon script is loaded once
  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://cdn.lordicon.com/lordicon.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://cdn.lordicon.com/lordicon.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);
  // Restore draftId if missing (e.g., after browser navigation)
  useEffect(() => {
    const restoreDraftId = async () => {
      // Only try to restore draft if user is authenticated
      if (!draftId && state.user?.uid) {
        // Try to fetch user's most recent draft
        try {
          const { getUserDrafts } = await import('@/pages/Host/services/draftService');
          const drafts = await getUserDrafts();
          if (drafts.length > 0) {
            draftId = drafts[0].id;
            const ref = doc(db, 'onboardingDrafts', draftId);
            setDraftRef(ref);
            // Fetch draft and sync selectedOption
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const draftData = snap.data()?.data || {};
              if (draftData.privacyType) {
                setSelectedOption(draftData.privacyType);
                actions.updateState({ privacyType: draftData.privacyType });
              }
            }
          }
        } catch (error) {
          }
      }
    };
    restoreDraftId();
  }, [draftId, state.user]);

  // Create or get draft on mount
  useEffect(() => {
    // Use existing draftId from navigation state
    if (draftId) {
      const ref = doc(db, 'onboardingDrafts', draftId);
      setDraftRef(ref);
      // Fetch draft and sync selectedOption
      const fetchDraft = async () => {
        try {
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const draftData = snap.data()?.data || {};
            if (draftData.privacyType) {
              setSelectedOption(draftData.privacyType);
              actions.updateState({ privacyType: draftData.privacyType });
            }
          }
        } catch (error) {
          }
      };
      fetchDraft();
    }
  }, [draftId, state.user, actions]);

  // Set current step for progress bar when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'privacytype') {
      actions.setCurrentStep('privacytype');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

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
  justSavedRef.current = true;
    // Reset justSavedRef after a short delay
    if (justSavedRef.current) {
      setTimeout(() => {
        justSavedRef.current = false;
      }, 4000); // Block auto-save for 4 seconds after manual save
    }
    if (!selectedOption || !draftRef) {
      alert('Please select a privacy type before continuing.');
      return;
    }
    setIsLoading(true);
    try {
      // Get existing data fields
      const snap = await getDoc(draftRef);
      const prevData = snap.exists() && snap.data().data ? snap.data().data : {};
      // Only update privacyType if value is different
      if (prevData.privacyType !== selectedOption) {
        await updateDoc(draftRef, {
          "data.privacyType": selectedOption,
          privacyType: deleteField(),
          lastModified: new Date(),
          currentStep: 'location',
        });
      } else {
        // Only update step and lastModified, do NOT touch propertyStructure or other fields
        await updateDoc(draftRef, {
          lastModified: new Date(),
          currentStep: 'location',
        });
      }
      navigate('/pages/location', { state: { draftId } });
    } catch (error) {
      navigate('/pages/location', { state: { draftId } });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndExit = async () => {
    if (!auth.currentUser) {
      alert('Please log in to save your progress');
      return;
    }
    
    setIsLoading(true);
    try {
      // Update context with current privacyType
      if (selectedOption) {
        actions.updateState({ privacyType: selectedOption });
      }
      
      // Ensure we have a draftId
      let draftIdToUse = draftId || state?.draftId;
      if (!draftIdToUse && state.user?.uid) {
        try {
          const { getUserDrafts, saveDraft } = await import('@/pages/Host/services/draftService');
          const drafts = await getUserDrafts();
          if (drafts.length > 0) {
            draftIdToUse = drafts[0].id;
          } else {
            const newDraftData = {
              currentStep: 'privacytype',
              category: state.category || 'accommodation',
              data: {
                privacyType: selectedOption
              }
            };
            draftIdToUse = await saveDraft(newDraftData, null);
            if (actions.setDraftId) {
              actions.setDraftId(draftIdToUse);
            }
          }
        } catch (error) {
          }
      }
      
      if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
      await updateDoc(draftRef, {
            'data.privacyType': selectedOption,
            privacyType: deleteField(), // Remove old top-level field if exists
            currentStep: 'privacytype',
            lastModified: new Date(),
          });
          } else {
          // Create new draft
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const newDraftData = {
            currentStep: 'privacytype',
            category: state.category || 'accommodation',
        data: {
              privacyType: selectedOption
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      }
      
      navigate('/host/listings', { 
        state: { 
          message: 'Draft saved successfully!',
          draftSaved: true 
        }
      });
    } catch (error) {
      alert('Error saving progress: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-white overflow-hidden">
      <OnboardingHeader showProgress={true} customSaveAndExit={handleSaveAndExit} />

      {/* Main Content */}
      <main className="h-[calc(100vh-136px)] pt-24 px-8 pb-3 overflow-hidden">
        <div className="max-w-[820px] mx-auto">
          <h1 className="text-[30px] font-medium text-gray-900 mb-5 text-center">
            What <span className="text-primary">type</span> of place will guests have?
          </h1>

          <div className="mt-10 flex flex-col gap-2">
            {privacyOptions.map((option) => (
              <button
                key={option.title}
                onClick={() => handleOptionSelect(option.title)}
                className={`group flex items-center p-8 rounded-xl border transition-all duration-300 hover:border-primary group-hover:border-primary group-hover:bg-gray-50 group-hover:text-primary min-h-48 gap-7 ${
                  selectedOption === option.title
                    ? 'border-primary bg-white'
                    : 'border-gray-200'
                }`}
              >
                {(() => {
                  let iconHtml = '';
                  if (option.title === 'An entire place') {
                    iconHtml = `
                      <lord-icon
                        src="https://cdn.lordicon.com/dznelzdk.json"
                        trigger="loop"
                        delay="2000"
                        speed="0.5"
                        state="morph-mantion"
                        colors="primary:#faf9d1,secondary:#109173,tertiary:#b26836,quaternary:#109173,quinary:#646e78,senary:#ebe6ef"
                        style="width:100%;height:100%">
                      </lord-icon>
                    `;
                  } else if (option.title === 'A room') {
                    iconHtml = `
                      <lord-icon
                        src="https://cdn.lordicon.com/prslbulo.json"
                        trigger="loop"
                        delay="1500"
                        speed="0.5"
                        colors="primary:#eeaa66,secondary:#2ca58d,tertiary:#000000,quaternary:#faf9d1"
                        style="width:100%;height:100%">
                      </lord-icon>
                    `;
                  } else if (option.title === 'A shared room in a hostel') {
                    iconHtml = `
                      <lord-icon
                        src="https://cdn.lordicon.com/trsphbbf.json"
                        trigger="loop"
                        delay="1500"
                        speed="0.5"
                        colors="primary:#2ca58d,secondary:#000000,tertiary:#faefd1"
                        style="width:100%;height:100%">
                      </lord-icon>
                    `;
                  }
                  return (
                    <div
                      className="w-32 h-32 md:w-36 md:h-36 flex-shrink-0"
                      dangerouslySetInnerHTML={{ __html: iconHtml }}
                    />
                  );
                })()}
                <div className="flex-1 text-left">
                  <h3
                    className={`font-medium mb-1 transition-colors duration-300 ${
                      selectedOption === option.title
                        ? 'text-primary'
                        : 'text-gray-900 group-hover:text-primary group-hover:font-semibold'
                    }`}
                  >
                    {option.title}
                  </h3>
                  <p
                    className={`transition-colors duration-300 ${
                      selectedOption === option.title
                        ? 'text-primary'
                        : 'text-gray-600 group-hover:text-primary'
                    }`}
                  >
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <OnboardingFooter
        onBack={() => navigate('/pages/propertystructure', { state: { draftId: location.state?.draftId } })}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={selectedOption !== null}
      />
    </div>
  );
};

export default PrivacyType;