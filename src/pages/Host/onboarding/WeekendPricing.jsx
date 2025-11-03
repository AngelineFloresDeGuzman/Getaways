import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';

const WeekendPricing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  
  // Get weekday price from state (loaded from draft), location state, or default to 1511
  // State.weekdayPrice takes priority as it's loaded from Firebase
  const weekdayPrice = state.weekdayPrice || location.state?.weekdayPrice || 1511;
  
  const [premiumPercentage, setPremiumPercentage] = useState(3);
  const [isPriceBreakdownOpen, setIsPriceBreakdownOpen] = useState(false);
  const [isEditingPercentage, setIsEditingPercentage] = useState(false);
  const [editPercentageValue, setEditPercentageValue] = useState('');
  
  // Ref to track initialization
  const hasInitialized = useRef(false);
  
  // Calculate weekend price based on premium
  const weekendPrice = Math.round(weekdayPrice * (1 + premiumPercentage / 100));
  
  // Calculate pricing breakdown for weekend price
  const guestServiceFee = Math.round(weekendPrice * 0.141); // ~14.1% service fee
  const guestPriceBeforeTaxes = weekendPrice + guestServiceFee;
  const platformFee = Math.round(weekendPrice * 0.033); // ~3.3% platform fee on host
  const youEarn = weekendPrice - platformFee;

  const canProceed = true; // Always can proceed with any percentage

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      const draftIdToLoad = location.state?.draftId || state?.draftId;
      // Only load draft if user is authenticated and we have a draftId
      if (draftIdToLoad && actions.loadDraft && state.user) {
        console.log('📍 WeekendPricing: Loading draft with ID:', draftIdToLoad);
        try {
          await actions.loadDraft(draftIdToLoad);
          console.log('✅ WeekendPricing: Draft loaded successfully');
        } catch (error) {
          console.error('❌ WeekendPricing: Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state?.draftId, state.user, actions]);

  // Set current step when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'weekendpricing') {
      console.log('📍 WeekendPricing page - Setting currentStep to weekendpricing');
      actions.setCurrentStep('weekendpricing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Initialize from context if available (after draft loads)
  useEffect(() => {
    const currentWeekdayPrice = state.weekdayPrice || location.state?.weekdayPrice || 1511;
    
    if (!hasInitialized.current && (state.weekendPrice !== undefined || state.weekendPricingEnabled !== undefined) && currentWeekdayPrice > 0) {
      console.log('📍 WeekendPricing: Initializing from context:', {
        weekdayPrice: currentWeekdayPrice,
        weekendPrice: state.weekendPrice,
        weekendPricingEnabled: state.weekendPricingEnabled
      });
      
      if (state.weekendPrice > 0 && currentWeekdayPrice > 0) {
        // Calculate premium percentage from saved weekend price
        const calculatedPremium = Math.round(((state.weekendPrice / currentWeekdayPrice) - 1) * 100);
        const validPremium = Math.max(0, Math.min(99, calculatedPremium));
        console.log('📍 WeekendPricing: Calculated premium percentage:', validPremium, 'from weekendPrice:', state.weekendPrice, 'and weekdayPrice:', currentWeekdayPrice);
        setPremiumPercentage(validPremium);
      } else if (state.weekendPrice === 0) {
        // If weekendPrice is 0, set premium to 0
        console.log('📍 WeekendPricing: Weekend price is 0, setting premium to 0');
        setPremiumPercentage(0);
      }
      hasInitialized.current = true;
    }
  }, [state.weekendPrice, state.weekendPricingEnabled, state.weekdayPrice, location.state?.weekdayPrice]);

  // Real-time context updates
  const updateWeekendPricingContext = (percentage) => {
    const calculatedWeekendPrice = Math.round(weekdayPrice * (1 + percentage / 100));
    console.log('WeekendPricing - Updating context with:', {
      enabled: true,
      price: calculatedWeekendPrice,
      percentage
    });
    actions.updateWeekendPricing(true, calculatedWeekendPrice);
    // Removed setCurrentStep from here to prevent setState during render
  };

  const handleSliderChange = (e) => {
    const newPercentage = parseInt(e.target.value);
    setPremiumPercentage(newPercentage);
    
    // Update context in real-time
    updateWeekendPricingContext(newPercentage);
  };

  const handlePercentageInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
    setEditPercentageValue(value);
  };

  const handlePercentageInputBlur = () => {
    if (editPercentageValue) {
      const numValue = parseInt(editPercentageValue, 10);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 99) {
        setPremiumPercentage(numValue);
        updateWeekendPricingContext(numValue);
      } else {
        setEditPercentageValue(premiumPercentage.toString());
      }
    }
    setIsEditingPercentage(false);
  };

  const handlePercentageInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      handlePercentageInputBlur();
    } else if (e.key === 'Escape') {
      setEditPercentageValue('');
      setIsEditingPercentage(false);
    }
  };

  const handlePercentageClick = () => {
    setIsEditingPercentage(true);
    setEditPercentageValue(premiumPercentage.toString());
  };

  // Debug: Log the location state
  console.log('WeekendPricing - location.state:', location.state);
  console.log('WeekendPricing - weekdayPrice:', weekdayPrice);

  // Helper function to ensure we have a valid draftId and save weekend pricing to Firebase
  const ensureDraftAndSave = async (weekendPricingData, targetRoute = '/pages/discounts') => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
      console.log('📍 WeekendPricing: Found temp ID, resetting to find/create real draft');
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
          console.log('📍 WeekendPricing: Using existing draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          console.log('📍 WeekendPricing: No existing drafts, creating new draft');
          const nextStep = targetRoute === '/pages/discounts' ? 'discounts' : 'weekendpricing';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              pricing: weekendPricingData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          console.log('📍 WeekendPricing: ✅ Created new draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        console.error('📍 WeekendPricing: Error finding/creating draft:', error);
        throw error;
      }
    }
    
    // Save to Firebase if we have a valid draftId
    if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
      try {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          // Update existing document - update data.pricing with weekendPrice and currentStep
          const nextStep = targetRoute === '/pages/discounts' ? 'discounts' : 'weekendpricing';
          
          // Get existing pricing data if it exists
          const existingData = docSnap.data();
          const existingPricing = existingData.data?.pricing || {};
          
          await updateDoc(draftRef, {
            'data.pricing': {
              ...existingPricing,
              weekdayPrice: existingPricing.weekdayPrice || weekdayPrice,
              weekendPrice: weekendPricingData.weekendPrice
            },
            currentStep: nextStep,
            lastModified: new Date()
          });
          console.log('📍 WeekendPricing: ✅ Saved weekend pricing to data.pricing and currentStep to Firebase:', draftIdToUse, '- pricing:', { ...existingPricing, weekdayPrice: existingPricing.weekdayPrice || weekdayPrice, weekendPrice: weekendPricingData.weekendPrice }, ', currentStep:', nextStep);
        } else {
          // Document doesn't exist, create it
          console.log('📍 WeekendPricing: Document not found, creating new one');
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const nextStep = targetRoute === '/pages/discounts' ? 'discounts' : 'weekendpricing';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              pricing: weekendPricingData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          console.log('📍 WeekendPricing: ✅ Created new draft with weekend pricing:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        console.error('📍 WeekendPricing: ❌ Error saving to Firebase:', error);
        throw error;
      }
    } else if (state.user?.uid) {
      console.warn('📍 WeekendPricing: ⚠️ User authenticated but no valid draftId after ensureDraftAndSave');
      throw new Error('Failed to create draft for authenticated user');
    } else {
      console.warn('📍 WeekendPricing: ⚠️ User not authenticated, cannot save to Firebase');
      return null;
    }
  };

  // Save & Exit handler
  const handleSaveAndExitClick = async () => {
    console.log('WeekendPricing Save & Exit clicked');
    console.log('Current premium percentage:', premiumPercentage);
    console.log('Current weekend price:', weekendPrice);
    
    if (!auth.currentUser) {
      console.error('WeekendPricing: No authenticated user');
      alert('Please log in to save your progress');
      return;
    }
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('WeekendPricing: Setting currentStep to weekendpricing');
        actions.setCurrentStep('weekendpricing');
      }
      
      // Ensure weekend pricing is updated in context
      updateWeekendPricingContext(premiumPercentage);
      
      // Prepare weekend pricing data to save
      const weekendPricingData = {
        weekdayPrice: weekdayPrice,
        weekendPrice: weekendPrice
      };
      
      // Save weekend pricing to Firebase under data.pricing
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(weekendPricingData, '/pages/weekendpricing');
        console.log('📍 WeekendPricing: ✅ Saved weekend pricing to Firebase on Save & Exit');
      } catch (saveError) {
        console.error('📍 WeekendPricing: Error saving to Firebase on Save & Exit:', saveError);
        // Continue with save & exit even if Firebase save fails
      }
      
      // Update sessionStorage before Save & Exit navigation
      updateSessionStorageBeforeNav('weekendpricing');
      
      // Navigate to dashboard
      navigate('/host/hostdashboard', { 
        state: { 
          message: 'Draft saved successfully!',
          draftSaved: true 
        }
      });
    } catch (error) {
      console.error('Error during save and exit:', error);
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
              Set a weekend price
            </h1>
            <p className="text-lg text-gray-600">
              Add a premium for Fridays and Saturdays.
            </p>
          </div>

          {/* Price Display */}
          <div className="text-center mb-12">
            <div className="text-6xl font-medium text-gray-900 mb-4">
              ₱{weekendPrice.toLocaleString()}
            </div>
            <button 
              onClick={() => setIsPriceBreakdownOpen(!isPriceBreakdownOpen)}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-1 mx-auto transition-colors"
            >
              Guest price before taxes ₱{guestPriceBeforeTaxes.toLocaleString()}
              <svg 
                className={`w-4 h-4 transition-transform ${isPriceBreakdownOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Price Breakdown */}
            {isPriceBreakdownOpen && (
              <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 max-w-md mx-auto shadow-sm">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Base price</span>
                    <span className="text-gray-900 font-medium">₱{weekendPrice.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Guest service fee</span>
                    <span className="text-gray-900 font-medium">₱{guestServiceFee.toLocaleString()}</span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Guest price before taxes</span>
                    <span className="text-gray-900 font-semibold">₱{guestPriceBeforeTaxes.toLocaleString()}</span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                    <span className="text-gray-600">You earn</span>
                    <span className="text-gray-900 font-semibold">₱{youEarn.toLocaleString()}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsPriceBreakdownOpen(false)}
                  className="mt-6 w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <span>Show less</span>
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Weekend Premium Control */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Weekend premium</h3>
                <p className="text-sm text-gray-600">Tip: 3%</p>
              </div>
              {isEditingPercentage ? (
              <div className="text-2xl font-medium text-gray-900">
                  <input
                    type="text"
                    value={editPercentageValue}
                    onChange={handlePercentageInputChange}
                    onBlur={handlePercentageInputBlur}
                    onKeyDown={handlePercentageInputKeyDown}
                    className="text-2xl font-medium text-gray-900 bg-transparent border-b-2 border-gray-400 focus:border-black focus:outline-none w-16 text-center"
                    autoFocus
                  />
                  <span className="text-2xl font-medium text-gray-900">%</span>
                </div>
              ) : (
                <div 
                  className="text-2xl font-medium text-gray-900 cursor-pointer relative group"
                  onClick={handlePercentageClick}
                >
                {premiumPercentage}%
                  <svg 
                    className="w-4 h-4 inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
              </div>
              )}
            </div>

            {/* Slider */}
            <div className="relative">
              <input
                type="range"
                min="0"
                max="99"
                value={premiumPercentage}
                onChange={handleSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #000 0%, #000 ${premiumPercentage}%, #e5e7eb ${premiumPercentage}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{premiumPercentage}%</span>
                <span>99%</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={() => {
          // CRITICAL: Update sessionStorage BEFORE navigating back
          // Set 'weekendpricing' as the previous step with its progress (~62.5%)
          // This ensures OnboardingHeader detects backward navigation (weekendpricing index 4 > pricing index 3)
          
          // Manually set sessionStorage to ensure it's set before navigation
          const storagePrevStepKey = 'onb_prev_step_name';
          const storageStepKey = 'onb_progress_step';
          const storageKey = 'onb_progress_value';
          
          // Calculate weekendpricing progress: index 4 in step 3 (8 pages) = ((4+1)/8)*100 = 62.5%
          sessionStorage.setItem(storagePrevStepKey, 'weekendpricing');
          sessionStorage.setItem(storageStepKey, '3');
          sessionStorage.setItem(storageKey, '62.5');
          
          console.log('📍 WeekendPricing Back: Set sessionStorage - prevStep: weekendpricing, step: 3, progress: 62.5%');
          
          // Navigate back - OnboardingHeader will detect backward navigation (weekendpricing index 4 > pricing index 3)
          navigate('/pages/pricing');
        }}
        onNext={async () => {
                  if (canProceed) {
            try {
              // Update context first
                    updateWeekendPricingContext(premiumPercentage);
                    
              // Prepare weekend pricing data to save
              const weekendPricingData = {
                weekdayPrice: weekdayPrice,
                weekendPrice: weekendPrice
              };
              
              // Save weekend pricing to Firebase
              let draftIdToUse;
              try {
                draftIdToUse = await ensureDraftAndSave(weekendPricingData, '/pages/discounts');
                console.log('📍 WeekendPricing: ✅ Saved weekend pricing to Firebase on Next click');
              } catch (saveError) {
                console.error('📍 WeekendPricing: Error saving to Firebase on Next:', saveError);
                // Continue navigation even if save fails - data is in context
              }
              
              // Update current step in context
              if (actions.setCurrentStep) {
                actions.setCurrentStep('discounts');
              }
              
              // Update sessionStorage before navigating forward
              updateSessionStorageBeforeNav('weekendpricing', 'discounts');
              
              // Navigate to discounts page
                    navigate('/pages/discounts', { 
                      state: { 
                        ...location.state,
                        weekendPrice: weekendPrice,
                  premiumPercentage: premiumPercentage,
                  draftId: draftIdToUse || state?.draftId || location.state?.draftId
                      } 
                    });
            } catch (error) {
              console.error('Error saving weekend pricing:', error);
              alert('Error saving progress. Please try again.');
            }
                  }
                }}
        canProceed={canProceed}
      />

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};

export default WeekendPricing;