import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Minus } from 'lucide-react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const OfferingGuests = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [maxGuests, setMaxGuests] = useState(1);
  const editingOfferingId = location.state?.editingOfferingId || null;

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("offering-guests");
    }
  }, [actions]);

  // Load saved max guests ONLY when editing
  useEffect(() => {
    const loadMaxGuests = async () => {
      // Only load if editing an existing offering
      if (editingOfferingId) {
        const draftId = state.draftId || location.state?.draftId;
        if (draftId) {
          try {
            const draftRef = doc(db, "onboardingDrafts", draftId);
            const draftSnap = await getDoc(draftRef);
            if (draftSnap.exists()) {
              const data = draftSnap.data().data || {};
              if (data.serviceOfferings && Array.isArray(data.serviceOfferings)) {
                const offering = data.serviceOfferings.find(o => o.id === editingOfferingId);
                if (offering && offering.maxGuests) {
                  setMaxGuests(offering.maxGuests);
                }
              }
            }
          } catch (error) {
            console.error("Error loading max guests:", error);
          }
        }
      }
      // When creating a new offering, start with default value (1)
      // Do NOT load tempOfferingMaxGuests from location.state
    };
    loadMaxGuests();
  }, [
    editingOfferingId || null,
    state.draftId || null,
    location.state?.draftId || null
  ]);

  const handleIncrement = () => {
    setMaxGuests(prev => prev + 1);
  };

  const handleDecrement = () => {
    setMaxGuests(prev => Math.max(1, prev - 1));
  };

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Navigate to next step (price type selection)
    navigate("/pages/offering-price", {
      state: {
        draftId,
        category: "service",
        ...location.state,
        tempOfferingMaxGuests: maxGuests,
        editingOfferingId: editingOfferingId,
      },
    });
  };

  const handleBack = () => {
    navigate("/pages/offering-photo", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        ...location.state,
      },
    });
  };

  const canProceed = maxGuests >= 1;

  // Handle Save & Exit
  const handleSaveAndExit = async () => {
    const draftId = state.draftId || location.state?.draftId;
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          "data.tempOfferingMaxGuests": maxGuests,
          lastModified: new Date(),
        });
      } catch (error) {
        console.error("Error saving temporary max guests:", error);
      }
    }
      navigate("/host/listings");
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="offering-guests" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">
            Add your maximum number of guests
          </h1>

          <div className="flex items-center justify-center gap-8">
            {/* Decrement Button */}
            <button
              onClick={handleDecrement}
              disabled={maxGuests <= 1}
              className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-colors ${
                maxGuests <= 1
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <Minus className="w-6 h-6" />
            </button>

            {/* Guest Count Display */}
            <div className="text-8xl md:text-9xl font-bold text-gray-900 min-w-[200px] text-center">
              {maxGuests}
            </div>

            {/* Increment Button */}
            <button
              onClick={handleIncrement}
              className="w-14 h-14 rounded-full border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={canProceed}
      />
    </div>
  );
};

export default OfferingGuests;

