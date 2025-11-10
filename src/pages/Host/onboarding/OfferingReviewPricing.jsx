import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const OfferingReviewPricing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [pricePerGuest, setPricePerGuest] = useState(0);
  const [fixedPrice, setFixedPrice] = useState(0);
  const [minimumPrice, setMinimumPrice] = useState(0);
  const [pricingType, setPricingType] = useState('per-guest');
  const editingOfferingId = location.state?.editingOfferingId || null;

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("offering-review-pricing");
    }
  }, [actions]);

  // Load pricing information
  useEffect(() => {
    const loadPricing = async () => {
      // Get from location state first (most recent)
      const tempPricePerGuest = location.state?.tempOfferingPricePerGuest;
      const tempFixedPrice = location.state?.tempOfferingFixedPrice;
      const tempMinimumPrice = location.state?.tempOfferingMinimumPrice;
      const tempPricingType = location.state?.tempOfferingPricingType;

      if (tempPricingType) {
        setPricingType(tempPricingType);
      }

      if (tempPricingType === 'per-guest' && tempPricePerGuest) {
        const parsed = parseFloat(tempPricePerGuest);
        if (!isNaN(parsed) && parsed > 0) {
          setPricePerGuest(parsed);
        }
      } else if (tempPricingType === 'fixed' && tempFixedPrice) {
        const parsed = parseFloat(tempFixedPrice);
        if (!isNaN(parsed) && parsed > 0) {
          setFixedPrice(parsed);
        }
      }

      if (tempMinimumPrice) {
        const parsed = parseFloat(tempMinimumPrice);
        if (!isNaN(parsed) && parsed > 0) {
          setMinimumPrice(parsed);
        }
      }

      // If editing, also check Firebase
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
                if (offering) {
                  if (offering.pricePerGuest) {
                    setPricePerGuest(parseFloat(offering.pricePerGuest));
                  }
                  if (offering.fixedPrice) {
                    setFixedPrice(parseFloat(offering.fixedPrice));
                  }
                  if (offering.minimumPrice) {
                    setMinimumPrice(parseFloat(offering.minimumPrice));
                  }
                  if (offering.pricingType) {
                    setPricingType(offering.pricingType);
                  }
                }
              }
            }
          } catch (error) {
            console.error("Error loading pricing:", error);
          }
        }
      }
    };
    loadPricing();
  }, [
    state.draftId || null, 
    location.state?.draftId || null, 
    location.state?.tempOfferingPricePerGuest || null, 
    location.state?.tempOfferingFixedPrice || null, 
    location.state?.tempOfferingMinimumPrice || null, 
    location.state?.tempOfferingPricingType || null, 
    editingOfferingId || null
  ]);

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Navigate to discounts page
    navigate("/pages/offering-discounts", {
      state: {
        draftId,
        category: "service",
        ...location.state,
        tempOfferingPricePerGuest: pricingType === 'per-guest' ? pricePerGuest.toString() : undefined,
        tempOfferingFixedPrice: pricingType === 'fixed' ? fixedPrice.toString() : undefined,
        tempOfferingMinimumPrice: minimumPrice.toString(),
        tempOfferingPricingType: pricingType,
        editingOfferingId: editingOfferingId,
      },
    });
  };

  const handleBack = () => {
    navigate("/pages/offering-minimum-price", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        ...location.state,
      },
    });
  };

  const canProceed = true; // Always enabled since we're just reviewing

  // Handle Save & Exit
  const handleSaveAndExit = async () => {
      navigate("/host/listings");
  };

  // Determine what to display
  const displayPrice = pricingType === 'per-guest' ? pricePerGuest : fixedPrice;
  const priceLabel = pricingType === 'per-guest' ? 'Price per guest' : 'Fixed price';

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="offering-review-pricing" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">
            Review your pricing
          </h1>

          <div className="bg-white rounded-xl border-2 border-gray-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg text-gray-700">{priceLabel}</span>
              <span className="text-3xl font-bold text-gray-900">
                ₱{displayPrice.toLocaleString()}
              </span>
            </div>

            {pricingType === 'per-guest' && minimumPrice > 0 && (
              <p className="text-sm text-gray-600">
                Guests pay ₱{pricePerGuest.toLocaleString()} per guest with a minimum price per booking of ₱{minimumPrice.toLocaleString()}.
              </p>
            )}

            {pricingType === 'fixed' && minimumPrice > 0 && (
              <p className="text-sm text-gray-600">
                Guests pay ₱{fixedPrice.toLocaleString()} with a minimum price per booking of ₱{minimumPrice.toLocaleString()}.
              </p>
            )}

            {pricingType === 'fixed' && minimumPrice === 0 && (
              <p className="text-sm text-gray-600">
                Guests pay ₱{fixedPrice.toLocaleString()} regardless of group size.
              </p>
            )}
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

export default OfferingReviewPricing;

