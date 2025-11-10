import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const OfferingPriceFixed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [fixedPrice, setFixedPrice] = useState('');
  const editingOfferingId = location.state?.editingOfferingId || null;

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("offering-price-fixed");
    }
  }, [actions]);

  // Load saved fixed price ONLY when editing
  useEffect(() => {
    const loadPrice = async () => {
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
                if (offering && offering.fixedPrice) {
                  setFixedPrice(offering.fixedPrice.toString());
                }
              }
            }
          } catch (error) {
            console.error("Error loading fixed price:", error);
          }
        }
      }
      // When creating a new offering, start with empty value
      // Do NOT load tempOfferingFixedPrice from location.state
    };
    loadPrice();
  }, [
    editingOfferingId || null,
    state.draftId || null,
    location.state?.draftId || null
  ]);

  const handlePriceChange = (value) => {
    // Allow only numbers and one decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return;
    }
    setFixedPrice(numericValue);
  };

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Navigate to minimum price page
    navigate("/pages/offering-minimum-price", {
      state: {
        draftId,
        category: "service",
        ...location.state,
        tempOfferingFixedPrice: fixedPrice,
        tempOfferingPricingType: 'fixed',
        editingOfferingId: editingOfferingId,
      },
    });
  };

  const saveOfferingToFirebase = async (offeringData) => {
    const draftId = state.draftId || location.state?.draftId;
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        const draftSnap = await getDoc(draftRef);
        
        if (draftSnap.exists()) {
          const data = draftSnap.data().data || {};
          let offerings = data.serviceOfferings || [];
          
          if (editingOfferingId) {
            // Update existing offering
            offerings = offerings.map(offering =>
              offering.id === editingOfferingId ? offeringData : offering
            );
          } else {
            // Add new offering
            offerings = [...offerings, offeringData];
          }
          
          await updateDoc(draftRef, {
            "data.serviceOfferings": offerings,
            lastModified: new Date(),
          });
          console.log("✅ Saved offering to Firebase");
        }
      } catch (error) {
        console.error("Error saving offering to Firebase:", error);
      }
    }
  };

  const handleBack = () => {
    navigate("/pages/offering-price", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        ...location.state,
      },
    });
  };

  const canProceed = fixedPrice.trim().length > 0 && parseFloat(fixedPrice) > 0;

  // Handle Save & Exit
  const handleSaveAndExit = async () => {
      navigate("/host/listings");
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="offering-price-fixed" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">
            Fixed price
          </h1>

          <div className="space-y-8">
            {/* Fixed price input */}
            <div className="flex items-center justify-center">
              <span className="text-6xl md:text-7xl font-bold text-gray-900 mr-2">₱</span>
              <input
                type="text"
                value={fixedPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0"
                className="text-6xl md:text-7xl font-bold text-gray-900 bg-transparent border-none outline-none w-48 text-center"
                autoFocus
              />
            </div>

            {/* Learn more link */}
            <div className="text-center">
              <button className="text-gray-500 hover:text-gray-700 underline text-sm">
                Learn more about pricing
              </button>
            </div>

            {/* Info text */}
            <div className="text-center text-gray-600 text-sm">
              This price applies to any number of guests up to your maximum.
            </div>
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

export default OfferingPriceFixed;

