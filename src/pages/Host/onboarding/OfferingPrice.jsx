import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const OfferingPrice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [pricingType, setPricingType] = useState('per-guest'); // 'per-guest' or 'fixed'
  const editingOfferingId = location.state?.editingOfferingId || null;

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("offering-price");
    }
  }, [actions]);

  // Load saved pricing type if editing
  useEffect(() => {
    const loadPricingType = async () => {
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
                if (offering && offering.pricingType) {
                  setPricingType(offering.pricingType);
                }
              }
            }
          } catch (error) {
            console.error("Error loading pricing type:", error);
          }
        }
      } else if (location.state?.tempOfferingPricingType) {
        setPricingType(location.state.tempOfferingPricingType);
      }
    };
    loadPricingType();
  }, [
    editingOfferingId || null, 
    state.draftId || null, 
    location.state?.draftId || null, 
    location.state?.tempOfferingPricingType || null
  ]);

  const handlePricingTypeSelect = (type) => {
    setPricingType(type);
  };

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Navigate to appropriate price input page based on pricing type
    if (pricingType === 'per-guest') {
      navigate("/pages/offering-price-per-guest", {
        state: {
          draftId,
          category: "service",
          ...location.state,
          tempOfferingPricingType: pricingType,
          editingOfferingId: editingOfferingId,
        },
      });
    } else {
      // Navigate to fixed price page (to be created)
      navigate("/pages/offering-price-fixed", {
        state: {
          draftId,
          category: "service",
          ...location.state,
          tempOfferingPricingType: pricingType,
          editingOfferingId: editingOfferingId,
        },
      });
    }
  };

  const handleBack = () => {
    navigate("/pages/offering-guests", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        ...location.state,
      },
    });
  };

  const canProceed = true; // Always enabled since we have a default selection

  // Handle Save & Exit
  const handleSaveAndExit = async () => {
      navigate("/host/listings");
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="offering-price" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">
            Set your price
          </h1>

          <div className="space-y-4 max-w-2xl mx-auto">
            {/* Price per guest option */}
            <button
              onClick={() => handlePricingTypeSelect('per-guest')}
              className={`w-full p-6 border-2 rounded-xl text-left transition-all ${
                pricingType === 'per-guest'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Price per guest
                  </h3>
                  <p className="text-gray-600">
                    Set the price that each guest will pay and your minimum price per booking.
                  </p>
                </div>
                {pricingType === 'per-guest' && (
                  <div className="ml-4">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </button>

            {/* Fixed price option */}
            <button
              onClick={() => handlePricingTypeSelect('fixed')}
              className={`w-full p-6 border-2 rounded-xl text-left transition-all ${
                pricingType === 'fixed'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Fixed price
                  </h3>
                  <p className="text-gray-600">
                    Set a price for any number of guests up to your maximum.
                  </p>
                </div>
                {pricingType === 'fixed' && (
                  <div className="ml-4">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
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

export default OfferingPrice;

