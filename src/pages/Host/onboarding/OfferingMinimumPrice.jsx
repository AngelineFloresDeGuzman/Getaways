import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const OfferingMinimumPrice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [minimumPrice, setMinimumPrice] = useState('');
  const [pricePerGuest, setPricePerGuest] = useState(0);
  const [fixedPrice, setFixedPrice] = useState(0);
  const [pricingType, setPricingType] = useState('per-guest');
  const [error, setError] = useState('');
  const editingOfferingId = location.state?.editingOfferingId || null;

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("offering-minimum-price");
    }
  }, [actions]);

  // Load saved minimum price and pricing info if editing
  useEffect(() => {
    const loadMinimumPrice = async () => {
      // Get pricing type from location state FIRST
      if (location.state?.tempOfferingPricingType) {
        setPricingType(location.state.tempOfferingPricingType);
      }
      
      // Get price per guest from location state (always check this)
      if (location.state?.tempOfferingPricePerGuest) {
        const parsedPrice = parseFloat(location.state.tempOfferingPricePerGuest);
        console.log('💰 Parsing price per guest:', {
          raw: location.state.tempOfferingPricePerGuest,
          parsed: parsedPrice,
          isValid: !isNaN(parsedPrice) && parsedPrice > 0
        });
        if (!isNaN(parsedPrice) && parsedPrice > 0) {
          setPricePerGuest(parsedPrice);
          }
      }
      
      // Get fixed price from location state
      if (location.state?.tempOfferingFixedPrice) {
        const parsedPrice = parseFloat(location.state.tempOfferingFixedPrice);
        if (!isNaN(parsedPrice) && parsedPrice > 0) {
          setFixedPrice(parsedPrice);
        }
      }

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
                  if (offering.minimumPrice) {
                    setMinimumPrice(offering.minimumPrice.toString());
                  }
                  if (offering.pricePerGuest) {
                    setPricePerGuest(parseFloat(offering.pricePerGuest));
                  }
                  if (offering.fixedPrice) {
                    setFixedPrice(parseFloat(offering.fixedPrice));
                  }
                  if (offering.pricingType) {
                    setPricingType(offering.pricingType);
                  }
                }
              }
            }
          } catch (error) {
            }
        }
      }
      // Don't autofill minimumPrice when creating new offering - user must type it manually
      // Note: We still load pricePerGuest/fixedPrice/pricingType from location.state for validation,
      // but minimumPrice should always start empty when creating
    };
    loadMinimumPrice();
  }, [
    editingOfferingId || null, 
    state.draftId || null, 
    location.state?.draftId || null, 
    location.state?.tempOfferingMinimumPrice || null, 
    location.state?.tempOfferingPricePerGuest || null, 
    location.state?.tempOfferingFixedPrice || null, 
    location.state?.tempOfferingPricingType || null
  ]);

  // Validate whenever minimum price or pricing info changes
  useEffect(() => {
    if (!minimumPrice.trim()) {
      setError('');
      return;
    }

    const minPriceValue = parseFloat(minimumPrice);
    if (isNaN(minPriceValue) || minPriceValue <= 0) {
      setError('');
      return;
    }

    // Determine the base price to compare against
    let basePrice = 0;
    let priceLabel = '';
    
    if (pricingType === 'per-guest') {
      basePrice = pricePerGuest > 0 
        ? pricePerGuest 
        : (parseFloat(location.state?.tempOfferingPricePerGuest) || 0);
      priceLabel = 'price per guest';
    } else if (pricingType === 'fixed') {
      basePrice = fixedPrice > 0 
        ? fixedPrice 
        : (parseFloat(location.state?.tempOfferingFixedPrice) || 0);
      priceLabel = 'fixed price';
    }

    if (basePrice > 0 && minPriceValue < basePrice) {
      setError(`Minimum price must be at least ₱${basePrice.toLocaleString()} (same as ${priceLabel})`);
    } else {
      setError('');
    }
  }, [
    minimumPrice || '', 
    pricePerGuest || 0, 
    fixedPrice || 0, 
    pricingType || 'per-guest', 
    location.state?.tempOfferingPricePerGuest || null, 
    location.state?.tempOfferingFixedPrice || null
  ]);

  const handlePriceChange = (value) => {
    // Allow only numbers and one decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Update the input value - validation will happen in useEffect
    setMinimumPrice(numericValue);
    
    // Immediate validation check to prevent button from enabling incorrectly
    const minPriceValue = numericValue ? parseFloat(numericValue) : 0;
    if (numericValue && !isNaN(minPriceValue) && minPriceValue > 0) {
      // Use state values directly for immediate validation
      let currentBasePrice = 0;
      const currentPricingType = pricingType || 'per-guest';
      
      if (currentPricingType === 'per-guest') {
        currentBasePrice = pricePerGuest;
      } else if (currentPricingType === 'fixed') {
        currentBasePrice = fixedPrice;
      }
      
      // Set error immediately if invalid
      if (currentBasePrice > 0 && minPriceValue < currentBasePrice) {
        const priceLabel = currentPricingType === 'per-guest' ? 'price per guest' : 'fixed price';
        setError(`Minimum price must be at least ₱${currentBasePrice.toLocaleString()} (same as ${priceLabel})`);
      } else if (currentBasePrice > 0) {
        setError('');
      }
    } else {
      setError('');
    }
  };

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    const minimumPriceValue = parseFloat(minimumPrice) || 0;

    // Final validation check - prevent navigation if validation fails
    if (basePrice <= 0) {
      setError('Please enter a valid price');
      return;
    }
    
    if (minimumPriceValue < basePrice) {
      const priceLabel = pricingType === 'per-guest' ? 'price per guest' : 'fixed price';
      setError(`Minimum price must be at least ₱${basePrice.toLocaleString()} (same as ${priceLabel})`);
      return; // Don't proceed if validation fails
    }

    // Navigate to review pricing page
    navigate("/pages/offering-review-pricing", {
      state: {
        draftId,
        category: "service",
        ...location.state,
        tempOfferingPricePerGuest: pricingType === 'per-guest' ? basePrice.toString() : undefined,
        tempOfferingFixedPrice: pricingType === 'fixed' ? basePrice.toString() : undefined,
        tempOfferingMinimumPrice: minimumPriceValue.toString(),
        tempOfferingPricingType: pricingType,
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
          }
      } catch (error) {
        }
    }
  };

  const handleBack = () => {
    navigate("/pages/offering-price-per-guest", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        ...location.state,
      },
    });
  };

  // Get base price (per guest or fixed) from state or location - use useMemo to recalculate when values change
  const basePrice = useMemo(() => {
    if (pricingType === 'per-guest') {
      if (pricePerGuest > 0) {
        return pricePerGuest;
      }
      const fromLocation = parseFloat(location.state?.tempOfferingPricePerGuest);
      return fromLocation && !isNaN(fromLocation) ? fromLocation : 0;
    } else if (pricingType === 'fixed') {
      if (fixedPrice > 0) {
        return fixedPrice;
      }
      const fromLocation = parseFloat(location.state?.tempOfferingFixedPrice);
      return fromLocation && !isNaN(fromLocation) ? fromLocation : 0;
    }
    return 0;
  }, [
    pricePerGuest || 0, 
    fixedPrice || 0, 
    pricingType || 'per-guest', 
    location.state?.tempOfferingPricePerGuest || null, 
    location.state?.tempOfferingFixedPrice || null
  ]);

  const minimumPriceValue = useMemo(() => {
    const parsed = parseFloat(minimumPrice);
    return parsed && !isNaN(parsed) ? parsed : 0;
  }, [minimumPrice]);

  // Validate and determine if can proceed - calculate directly from current values
  const canProceed = useMemo(() => {
    // Must have a value entered
    if (!minimumPrice.trim()) {
      return false;
    }

    const minPriceValue = parseFloat(minimumPrice);
    if (isNaN(minPriceValue) || minPriceValue <= 0) {
      return false;
    }
    
    // Use state values directly (they're updated from location.state in useEffect)
    // Also check location.state as fallback in case state hasn't updated yet
    let currentBasePrice = 0;
    const currentPricingType = pricingType || location.state?.tempOfferingPricingType || 'per-guest';
    
    if (currentPricingType === 'per-guest') {
      currentBasePrice = pricePerGuest > 0 
        ? pricePerGuest 
        : (parseFloat(location.state?.tempOfferingPricePerGuest) || 0);
    } else if (currentPricingType === 'fixed') {
      currentBasePrice = fixedPrice > 0 
        ? fixedPrice 
        : (parseFloat(location.state?.tempOfferingFixedPrice) || 0);
    }
    
    // Must have base price available - if not loaded yet, disable button
    if (currentBasePrice <= 0) {
      return false;
    }
    
    // Minimum price must be >= base price (per guest or fixed)
    if (minPriceValue < currentBasePrice) {
      return false;
    }
    
    // Must not have validation error
    if (error) {
      return false;
    }
    
    return true;
  }, [
    minimumPrice || '', 
    pricePerGuest || 0, 
    fixedPrice || 0, 
    pricingType || 'per-guest', 
    error || '', 
    location.state?.tempOfferingPricePerGuest || null, 
    location.state?.tempOfferingFixedPrice || null
  ]);

  // Handle Save & Exit
  const handleSaveAndExit = async () => {
      navigate("/host/listings");
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="offering-minimum-price" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">
            Minimum price per booking
          </h1>

          <div className="space-y-8">
            {/* Minimum price input */}
            <div className="flex items-center justify-center">
              <span className="text-6xl md:text-7xl font-bold text-gray-900 mr-2">₱</span>
              <input
                type="text"
                value={minimumPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0"
                className="text-6xl md:text-7xl font-bold text-gray-900 bg-transparent border-none outline-none w-48 text-center border-b-2 border-gray-300 focus:border-primary"
                autoFocus
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="text-center">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            {/* Learn more link */}
            <div className="text-center">
              <button className="text-gray-500 hover:text-gray-700 underline text-sm">
                Learn more about pricing
              </button>
            </div>
            
            {/* Help text */}
            {basePrice > 0 && (
              <div className="text-center">
                <p className="text-gray-500 text-sm">
                  Your {pricingType === 'per-guest' ? 'price per guest' : 'fixed price'} is ₱{basePrice.toLocaleString()}. Minimum price must be at least ₱{basePrice.toLocaleString()}.
                </p>
              </div>
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

export default OfferingMinimumPrice;

