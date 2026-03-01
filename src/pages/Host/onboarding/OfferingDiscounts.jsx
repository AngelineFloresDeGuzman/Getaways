import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, X, Check } from 'lucide-react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const OfferingDiscounts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [discounts, setDiscounts] = useState({
    limitedTime: false,
    earlyBird: false,
    largeGroup: false,
  });
  
  const [discountValues, setDiscountValues] = useState({
    limitedTime: '',
    earlyBird: '',
    largeGroup: '',
  });
  
  const [largeGroupDetails, setLargeGroupDetails] = useState({
    minimumGuests: '',
    discount: '',
  });
  
  const [showModal, setShowModal] = useState(null); // 'limitedTime', 'earlyBird', 'largeGroup', or null
  const [tempDiscountValue, setTempDiscountValue] = useState('');
  const [tempMinimumGuests, setTempMinimumGuests] = useState('');
  const [validationError, setValidationError] = useState('');

  const editingOfferingId = location.state?.editingOfferingId;
  const [maxGuests, setMaxGuests] = useState(location.state?.tempOfferingMaxGuests || 1);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("offering-discounts");
    }
  }, [actions]);

  // Load existing discount data when editing an offering
  useEffect(() => {
    const loadDiscountData = async () => {
      const draftId = state.draftId || location.state?.draftId;
      
      if (draftId && editingOfferingId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            const offerings = data.serviceOfferings || [];
            
            const offering = offerings.find(o => o.id === editingOfferingId);
            
            if (offering) {
              // Load discount flags
              if (offering.discounts) {
                setDiscounts(offering.discounts);
              }
              
              // Load discount values
              if (offering.discountValues) {
                setDiscountValues(offering.discountValues);
              }
              
              // Load large group details
              if (offering.largeGroupDetails) {
                setLargeGroupDetails(offering.largeGroupDetails);
              }
              
              // Load max guests if available
              if (offering.maxGuests) {
                setMaxGuests(offering.maxGuests);
              }
              
              }
          }
        } catch (error) {
          }
      }
    };

    loadDiscountData();
  }, [
    state.draftId || null, 
    location.state?.draftId || null, 
    editingOfferingId || null
  ]);

  const handleOpenLimitedTimeModal = () => {
    setTempDiscountValue(discountValues.limitedTime || '');
    setShowModal('limitedTime');
  };

  const handleOpenEarlyBirdModal = () => {
    setTempDiscountValue(discountValues.earlyBird || '');
    setShowModal('earlyBird');
  };

  const handleOpenLargeGroupModal = () => {
    setTempDiscountValue(largeGroupDetails.discount || '');
    setTempMinimumGuests(largeGroupDetails.minimumGuests || '');
    setShowModal('largeGroup');
  };

  const handleCloseModal = () => {
    setShowModal(null);
    setTempDiscountValue('');
    setTempMinimumGuests('');
    setValidationError('');
  };

  const handleSaveDiscount = () => {
    // Validate minimum guests for large group discount
    if (showModal === 'largeGroup') {
      const minGuestsNum = parseFloat(tempMinimumGuests);
      if (tempMinimumGuests && !isNaN(minGuestsNum) && minGuestsNum > maxGuests) {
        setValidationError(`You can't exceed your ${maxGuests} guest limit.`);
        return;
      }
    }
    
    const numericValue = parseFloat(tempDiscountValue);
    if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
      if (showModal === 'largeGroup') {
        // For large group, save both minimum guests and discount
        setLargeGroupDetails({
          minimumGuests: tempMinimumGuests,
          discount: tempDiscountValue,
        });
        setDiscounts(prev => ({
          ...prev,
          largeGroup: tempMinimumGuests.trim().length > 0 && tempDiscountValue.trim().length > 0,
        }));
      } else {
        // For other discounts, just save the discount value
        setDiscountValues(prev => ({
          ...prev,
          [showModal]: tempDiscountValue,
        }));
        setDiscounts(prev => ({
          ...prev,
          [showModal]: true,
        }));
      }
      handleCloseModal();
    }
  };

  const handleRemoveDiscount = () => {
    if (showModal === 'largeGroup') {
      setLargeGroupDetails({
        minimumGuests: '',
        discount: '',
      });
      setDiscounts(prev => ({
        ...prev,
        largeGroup: false,
      }));
    } else {
      setDiscountValues(prev => ({
        ...prev,
        [showModal]: '',
      }));
      setDiscounts(prev => ({
        ...prev,
        [showModal]: false,
      }));
    }
    handleCloseModal();
  };

  const handleDiscountValueChange = (value) => {
    // Allow only numbers and one decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return;
    }
    // Limit to 100
    const numValue = parseFloat(numericValue);
    if (!isNaN(numValue) && numValue > 100) {
      return;
    }
    setTempDiscountValue(numericValue);
  };

  const handleMinimumGuestsChange = (value) => {
    // Allow only numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setTempMinimumGuests(numericValue);
    
    // Validate against max guests
    const minGuestsNum = parseFloat(numericValue);
    if (numericValue && !isNaN(minGuestsNum) && minGuestsNum > maxGuests) {
      setValidationError(`You can't exceed your ${maxGuests} guest limit.`);
    } else {
      setValidationError('');
    }
  };

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Collect all offering data with discounts
    const offeringId = editingOfferingId || location.state?.tempOfferingId || Date.now().toString();
    
    // Build offering data, filtering out undefined values
    // When editing, we need to preserve existing data from Firebase
    const offeringData = {
      id: offeringId,
      title: location.state?.tempOfferingTitle || '',
      description: location.state?.tempOfferingDescription || '',
      maxGuests: location.state?.tempOfferingMaxGuests || 1,
      pricingType: location.state?.tempOfferingPricingType || 'per-guest',
    };

    // Only add fields that have values (not undefined)
    if (location.state?.tempOfferingPhoto) {
      offeringData.image = location.state.tempOfferingPhoto;
    }
    if (location.state?.tempOfferingPricePerGuest) {
      offeringData.pricePerGuest = parseFloat(location.state.tempOfferingPricePerGuest);
    }
    if (location.state?.tempOfferingFixedPrice) {
      offeringData.fixedPrice = parseFloat(location.state.tempOfferingFixedPrice);
    }
    if (location.state?.tempOfferingMinimumPrice) {
      offeringData.minimumPrice = parseFloat(location.state.tempOfferingMinimumPrice);
    }
    
    // Add discounts if they exist (always include even if empty, to preserve structure)
    offeringData.discounts = discounts;
    offeringData.discountValues = discountValues;
    if (largeGroupDetails && (largeGroupDetails.minimumGuests || largeGroupDetails.discount)) {
      offeringData.largeGroupDetails = largeGroupDetails;
    }

    // Save offering to Firebase (this will merge with existing data)
    await saveOfferingToFirebase(offeringData);

    navigate("/pages/offering-availability", {
      state: {
        draftId,
        category: "service",
        editingOfferingId: offeringId, // Always pass the offering ID
        ...location.state,
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
          
          const offeringId = offeringData.id;
          const existingOfferingIndex = offerings.findIndex(offering => offering.id === offeringId);
          
          if (existingOfferingIndex !== -1) {
            // Update existing offering - merge with existing data to preserve all fields
            offerings[existingOfferingIndex] = {
              ...offerings[existingOfferingIndex], // Preserve existing fields (availability, etc.)
              ...offeringData, // Override with new discount data
            };
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
        throw error; // Re-throw to handle in caller if needed
      }
    }
  };

  const handleBack = () => {
    navigate("/pages/offering-review-pricing", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        ...location.state,
      },
    });
  };

  const canProceed = true; // Always enabled - discounts are optional

  // Handle Save & Exit
  const handleSaveAndExit = async () => {
    const draftId = state.draftId || location.state?.draftId;
    
    // Save current offering progress before exiting
    const offeringId = location.state?.editingOfferingId || Date.now().toString();
    const offeringData = {
      id: offeringId,
      title: location.state?.tempOfferingTitle || '',
      description: location.state?.tempOfferingDescription || '',
      maxGuests: location.state?.tempOfferingMaxGuests || 1,
      pricingType: location.state?.tempOfferingPricingType || 'per-guest',
    };

    if (location.state?.tempOfferingPhoto) {
      offeringData.image = location.state.tempOfferingPhoto;
    }
    if (location.state?.tempOfferingPricePerGuest) {
      offeringData.pricePerGuest = parseFloat(location.state.tempOfferingPricePerGuest);
    }
    if (location.state?.tempOfferingFixedPrice) {
      offeringData.fixedPrice = parseFloat(location.state.tempOfferingFixedPrice);
    }
    if (location.state?.tempOfferingMinimumPrice) {
      offeringData.minimumPrice = parseFloat(location.state.tempOfferingMinimumPrice);
    }
    
    if (discounts && (discounts.limitedTime || discounts.earlyBird || discounts.largeGroup)) {
      offeringData.discounts = discounts;
    }
    if (discountValues && (discountValues.limitedTime || discountValues.earlyBird || discountValues.largeGroup)) {
      offeringData.discountValues = discountValues;
    }
    if (largeGroupDetails && (largeGroupDetails.minimumGuests || largeGroupDetails.discount)) {
      offeringData.largeGroupDetails = largeGroupDetails;
    }

    try {
      await saveOfferingToFirebase(offeringData);
      } catch (error) {
      }

      navigate("/host/listings");
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="offering-discounts" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-start justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">
            Add discounts
          </h1>

          <div className="space-y-4">
            {/* Limited-time discount */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Limited-time
                  </h3>
                  <p className="text-sm text-gray-600">
                    Offer a deal for the first 30 days to encourage your first guests to book.
                  </p>
                </div>
                <button
                  onClick={handleOpenLimitedTimeModal}
                  className={`ml-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                    discounts.limitedTime 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {discounts.limitedTime ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Early bird discount */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Early bird
                  </h3>
                  <p className="text-sm text-gray-600">
                    Give a lower price to guests who book more than 2 weeks in advance.
                  </p>
                </div>
                <button
                  onClick={handleOpenEarlyBirdModal}
                  className={`ml-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                    discounts.earlyBird 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {discounts.earlyBird ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Large group discounts */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Large group discounts
                  </h3>
                  <p className="text-sm text-gray-600">
                    Attract larger groups by giving them a discount.
                  </p>
                  
                  {/* Show saved discount details */}
                  {discounts.largeGroup && largeGroupDetails.minimumGuests && largeGroupDetails.discount && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {largeGroupDetails.minimumGuests} {parseInt(largeGroupDetails.minimumGuests) === 1 ? 'guest' : 'guests'} - {largeGroupDetails.discount}%
                      </p>
                      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleOpenLargeGroupModal}
                className="w-full flex items-center justify-center px-4 py-3 text-gray-900 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>{discounts.largeGroup ? 'Edit discount' : 'Add discount'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Discount Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {showModal === 'limitedTime' && 'Limited-time discount'}
                {showModal === 'earlyBird' && 'Early bird discount'}
                {showModal === 'largeGroup' && 'Large group discount'}
              </h2>
              <div className="w-5 h-5" /> {/* Spacer for centering */}
            </div>

            {/* Content */}
            <div className="p-6">
              {showModal === 'largeGroup' ? (
                <>
                  {/* Minimum guests input */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum guests
                    </label>
                    <input
                      type="text"
                      value={tempMinimumGuests}
                      onChange={(e) => handleMinimumGuestsChange(e.target.value)}
                      placeholder="Minimum guests"
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition-colors"
                      autoFocus
                    />
                  </div>

                  {/* Discount Input */}
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount
                    </label>
                    <div className="flex items-center justify-start gap-2">
                      <input
                        type="text"
                        value={tempDiscountValue}
                        onChange={(e) => handleDiscountValueChange(e.target.value)}
                        placeholder="0"
                        className="text-6xl md:text-7xl font-bold text-gray-900 bg-transparent border-none outline-none w-32 text-center"
                      />
                      <span className="text-6xl md:text-7xl font-bold text-gray-900">%</span>
                    </div>
                  </div>

                  {/* Validation Error */}
                  {validationError && (
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-900 flex-1">{validationError}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-8 text-center">
                    {showModal === 'limitedTime' && 'Applies to all bookings for the next 30 days.'}
                    {showModal === 'earlyBird' && 'Applies to bookings made more than 2 weeks in advance.'}
                  </p>

                  {/* Discount Input */}
                  <div className="flex items-center justify-center gap-2 mb-8">
                    <input
                      type="text"
                      value={tempDiscountValue}
                      onChange={(e) => handleDiscountValueChange(e.target.value)}
                      placeholder="0"
                      className="text-6xl md:text-7xl font-bold text-gray-900 bg-transparent border-none outline-none w-32 text-center"
                      autoFocus
                    />
                    <span className="text-6xl md:text-7xl font-bold text-gray-900">%</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t">
              <button
                onClick={handleRemoveDiscount}
                className="text-gray-400 hover:text-gray-600 transition-colors font-medium"
              >
                Remove
              </button>
              <button
                onClick={handleSaveDiscount}
                disabled={
                  showModal === 'largeGroup' 
                    ? (!tempMinimumGuests || !tempDiscountValue || parseFloat(tempDiscountValue) < 0 || parseFloat(tempDiscountValue) > 100 || validationError)
                    : (!tempDiscountValue || parseFloat(tempDiscountValue) < 0 || parseFloat(tempDiscountValue) > 100)
                }
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  (showModal === 'largeGroup' 
                    ? (tempMinimumGuests && tempDiscountValue && parseFloat(tempDiscountValue) >= 0 && parseFloat(tempDiscountValue) <= 100 && !validationError)
                    : (tempDiscountValue && parseFloat(tempDiscountValue) >= 0 && parseFloat(tempDiscountValue) <= 100))
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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

export default OfferingDiscounts;

