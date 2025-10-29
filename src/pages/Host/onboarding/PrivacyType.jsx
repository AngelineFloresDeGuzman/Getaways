import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';

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
  const [selectedOption, setSelectedOption] = useState(state.privacyType || '');
  let draftId = location.state?.draftId;
  // Restore draftId if missing (e.g., after browser navigation)
  useEffect(() => {
    const restoreDraftId = async () => {
      if (!draftId) {
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
          console.error('Error restoring draftId:', error);
        }
      }
    };
    restoreDraftId();
  }, [draftId]);

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
          console.error('Error loading draft:', error);
        }
      };
      fetchDraft();
    }
  }, [draftId, state.user, actions]);

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
      console.error('Error saving draft:', error);
      navigate('/pages/location', { state: { draftId } });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndExit = async () => {
    if (!draftRef) {
      return;
    }
    setIsLoading(true);
    try {
      // Get existing data fields
      const snap = await getDoc(draftRef);
      const prevData = snap.exists() && snap.data().data ? snap.data().data : {};
      await updateDoc(draftRef, {
        data: {
          ...prevData,
          privacyType: selectedOption,
        },
        lastModified: new Date(),
        currentStep: 'location',
      });
      navigate('/host/hostdashboard');
    } catch (error) {
      console.error('Error saving and exiting:', error);
      alert('Error saving progress: ' + error.message);
    } finally {
      setIsLoading(false);
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
                onClick={() => navigate('/pages/propertystructure', { state: { draftId: location.state?.draftId } })}
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