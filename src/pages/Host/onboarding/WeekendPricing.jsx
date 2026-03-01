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
  
  // Get weekday price from location state first (from Pricing page), then state, then default
  // Location.state.weekdayPrice takes priority as it's the most recent value from Pricing page's Next button
  // THIS IS WHERE WE READ weekdayPrice PASSED FROM PRICING PAGE'S NEXT BUTTON
  // CRITICAL: weekdayPrice MUST come from Pricing page's Next button navigation state
  const weekdayPrice = location.state?.weekdayPrice || state.weekdayPrice || 1511;
  
  // IMMEDIATE debug log when component renders - THIS SHOULD SHOW weekdayPrice FROM PRICING PAGE
  console.log('📍📍📍 WeekendPricing: RENDER - weekdayPrice calculation:', {
    'location.state': location.state,
    'location.state?.weekdayPrice': location.state?.weekdayPrice,
    'state.weekdayPrice': state.weekdayPrice,
    'final weekdayPrice': weekdayPrice,
    'location.pathname': location.pathname,
    'hasLocationState': !!location.state,
    'locationStateKeys': location.state ? Object.keys(location.state) : []
  });
  
  // CRITICAL CHECK: If weekdayPrice is NOT in location.state, log a warning
  if (!location.state?.weekdayPrice) {
    } else {
    }
  
  // Debug: Log weekdayPrice source whenever location.state changes
  useEffect(() => {
    console.log('📍 WeekendPricing: useEffect - weekdayPrice source check:', {
      'location.state': location.state,
      'location.state?.weekdayPrice': location.state?.weekdayPrice,
      'state.weekdayPrice': state.weekdayPrice,
      'final weekdayPrice': weekdayPrice,
      'hasLocationState': !!location.state,
      'locationStateKeys': location.state ? Object.keys(location.state) : []
    });
  }, [location.state, location.state?.weekdayPrice, state.weekdayPrice, weekdayPrice]);
  
  const [premiumPercentage, setPremiumPercentage] = useState(3);
  const [savedWeekendPrice, setSavedWeekendPrice] = useState(null); // Store the exact saved weekend price
  const [isPriceBreakdownOpen, setIsPriceBreakdownOpen] = useState(false);
  const [isEditingPercentage, setIsEditingPercentage] = useState(false);
  const [editPercentageValue, setEditPercentageValue] = useState('');
  
  // Ref to track initialization
  const hasInitialized = useRef(false);
  
  // Use saved weekend price if available, otherwise calculate from premium
  const weekendPrice = savedWeekendPrice !== null 
    ? savedWeekendPrice 
    : Math.round(weekdayPrice * (1 + premiumPercentage / 100));
  
  // Calculate pricing breakdown for weekend price
  const guestServiceFee = 100; // Fixed Php100 service fee
  const guestPrice = weekendPrice + guestServiceFee;
  const youEarn = weekendPrice;

  const canProceed = true; // Always can proceed with any percentage

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      const draftIdToLoad = location.state?.draftId || state?.draftId;
      // Only load draft if user is authenticated and we have a draftId
      if (draftIdToLoad && actions.loadDraft && state.user) {
        try {
          await actions.loadDraft(draftIdToLoad);
          } catch (error) {
          }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state?.draftId, state.user, actions]);

  // Set current step when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'weekendpricing') {
      actions.setCurrentStep('weekendpricing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // CRITICAL: Update context with weekdayPrice from location.state when navigating from Pricing page
  // This MUST happen immediately when WeekendPricing receives weekdayPrice from Pricing page's Next button
  useEffect(() => {
    if (location.state?.weekdayPrice) {
      // Always update context if weekdayPrice is in location.state (from Pricing page's Next button)
      if (location.state.weekdayPrice !== state.weekdayPrice) {
      actions.updatePricing(location.state.weekdayPrice, state.weekendPrice || 0);
      } else {
        }
    } else {
      }
  }, [location.state?.weekdayPrice, state.weekdayPrice, state.weekendPrice, actions]);

  // Load weekend pricing from Firebase when component mounts or draftId changes
  useEffect(() => {
    const loadWeekendPricingFromFirebase = async () => {
      if (hasInitialized.current) {
        return; // Already initialized
      }

      const draftIdToUse = location.state?.draftId || state?.draftId;
      
      // Skip if no draftId or temp draftId
      if (!draftIdToUse || draftIdToUse.startsWith('temp_')) {
        return;
      }

      try {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          const draftData = docSnap.data();
          // Check nested data.pricing.weekendPrice first (where we save it), then context
          const savedWeekendPrice = draftData.data?.pricing?.weekendPrice || state.weekendPrice;
          // Use location.state.weekdayPrice first (from Pricing page), then state, then Firebase, then default
          const currentWeekdayPrice = location.state?.weekdayPrice || state.weekdayPrice || draftData.data?.pricing?.weekdayPrice || 1511;
          
          if (savedWeekendPrice !== undefined && currentWeekdayPrice > 0) {
            // Store the exact saved weekend price
            setSavedWeekendPrice(savedWeekendPrice);
            
            if (savedWeekendPrice > 0) {
              // Calculate premium percentage from saved weekend price (more precise calculation)
              const calculatedPremium = ((savedWeekendPrice / currentWeekdayPrice) - 1) * 100;
              const roundedPremium = Math.round(calculatedPremium);
              const validPremium = Math.max(0, Math.min(99, roundedPremium));
              setPremiumPercentage(validPremium);
              
              // Also update context with the exact saved weekend price
              if (!state.weekendPrice || state.weekendPrice !== savedWeekendPrice) {
                actions.updateWeekendPricing(true, savedWeekendPrice);
              }
            } else {
              // If weekendPrice is 0, set premium to 0
              setPremiumPercentage(0);
              setSavedWeekendPrice(0);
            }
            
            hasInitialized.current = true;
            return; // Exit early if we found it in Firebase
          } else {
            }
        } else {
          }
      } catch (error) {
        }
    };

    loadWeekendPricingFromFirebase();
  }, [location.state?.draftId, state?.draftId, state.weekdayPrice, location.state?.weekdayPrice, state.weekendPrice, actions]);

  // Initialize from context if available (after draft loads) - fallback if Firebase load didn't work
  useEffect(() => {
    // Use location.state.weekdayPrice first (from Pricing page), then state, then default
    const currentWeekdayPrice = location.state?.weekdayPrice || state.weekdayPrice || 1511;
    
    if (!hasInitialized.current && (state.weekendPrice !== undefined || state.weekendPricingEnabled !== undefined) && currentWeekdayPrice > 0) {
      console.log('📍 WeekendPricing: Initializing from context (fallback):', {
        weekdayPrice: currentWeekdayPrice,
        weekendPrice: state.weekendPrice,
        weekendPricingEnabled: state.weekendPricingEnabled
      });
      
      if (state.weekendPrice > 0 && currentWeekdayPrice > 0) {
        // Store the exact weekend price from context
        setSavedWeekendPrice(state.weekendPrice);
        
        // Calculate premium percentage from saved weekend price
        const calculatedPremium = ((state.weekendPrice / currentWeekdayPrice) - 1) * 100;
        const roundedPremium = Math.round(calculatedPremium);
        const validPremium = Math.max(0, Math.min(99, roundedPremium));
        setPremiumPercentage(validPremium);
      } else if (state.weekendPrice === 0) {
        // If weekendPrice is 0, set premium to 0
        setPremiumPercentage(0);
        setSavedWeekendPrice(0);
      }
      hasInitialized.current = true;
    }
  }, [state.weekendPrice, state.weekendPricingEnabled, state.weekdayPrice, location.state?.weekdayPrice]);

  // Real-time context updates
  const updateWeekendPricingContext = (percentage) => {
    const calculatedWeekendPrice = Math.round(weekdayPrice * (1 + percentage / 100));
    // Update saved weekend price when user changes the premium
    setSavedWeekendPrice(calculatedWeekendPrice);
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
  // Helper function to ensure we have a valid draftId and save weekend pricing to Firebase
  const ensureDraftAndSave = async (weekendPricingData, targetRoute = '/pages/discounts') => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
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
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          const nextStep = targetRoute === '/pages/discounts' ? 'discounts' : 'weekendpricing';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              pricing: weekendPricingData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
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
          
          // Preserve existing weekdayPrice (set by Pricing page) - do NOT remove it
          // weekdayPrice should ONLY be set by Pricing page, but we preserve it here
          // Use existing weekdayPrice if it exists, otherwise fallback to state or location.state
          const preservedWeekdayPrice = existingPricing.weekdayPrice || weekdayPrice;
          
          await updateDoc(draftRef, {
            'data.pricing': {
              weekdayPrice: preservedWeekdayPrice, // Preserve weekdayPrice from Pricing page (or use current value)
              weekendPrice: weekendPricingData.weekendPrice // Update weekendPrice from WeekendPricing
            },
            currentStep: nextStep,
            lastModified: new Date()
          });
          } else {
          // Document doesn't exist, create it
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const nextStep = targetRoute === '/pages/discounts' ? 'discounts' : 'weekendpricing';
          
          // Include weekdayPrice when creating new draft (from location.state or state)
          // weekdayPrice should come from Pricing page, but we preserve it here
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              pricing: {
                weekdayPrice: weekdayPrice, // Include weekdayPrice from Pricing page
                weekendPrice: weekendPricingData.weekendPrice // Include weekendPrice
              }
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        throw error;
      }
    } else if (state.user?.uid) {
      throw new Error('Failed to create draft for authenticated user');
    } else {
      return null;
    }
  };

  // Save & Exit handler
  const handleSaveAndExitClick = async () => {
    if (!auth.currentUser) {
      alert('Please log in to save your progress');
      return;
    }
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        actions.setCurrentStep('weekendpricing');
      }
      
      // Ensure weekend pricing is updated in context
      updateWeekendPricingContext(premiumPercentage);
      
      // Prepare weekend pricing data to save
      // REMOVED: weekdayPrice is NO LONGER included - it should only come from Pricing page
      const weekendPricingData = {
        weekendPrice: weekendPrice
      };
      
      // Save weekend pricing to Firebase under data.pricing
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(weekendPricingData, '/pages/weekendpricing');
        } catch (saveError) {
        // Continue with save & exit even if Firebase save fails
      }
      
      // Update sessionStorage before Save & Exit navigation
      updateSessionStorageBeforeNav('weekendpricing');
      
      // Navigate to dashboard
      navigate('/host/listings', { 
        state: { 
          message: 'Draft saved successfully!',
          draftSaved: true 
        }
      });
    } catch (error) {
      alert('Error saving progress: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} customSaveAndExit={handleSaveAndExitClick} />

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
              Guest price ₱{guestPrice.toLocaleString()}
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
                    <span className="text-gray-600 font-medium">Guest price</span>
                    <span className="text-gray-900 font-semibold">₱{guestPrice.toLocaleString()}</span>
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
          
          // Navigate back - OnboardingHeader will detect backward navigation (weekendpricing index 4 > pricing index 3)
          navigate('/pages/pricing');
        }}
        onNext={async () => {
                  if (canProceed) {
            try {
              // Update context first
                    updateWeekendPricingContext(premiumPercentage);
                    
              // Prepare weekend pricing data to save
              // REMOVED: weekdayPrice is NO LONGER included - it should only come from Pricing page
              const weekendPricingData = {
                weekendPrice: weekendPrice
              };
              
              // Save weekend pricing to Firebase
              let draftIdToUse;
              try {
                draftIdToUse = await ensureDraftAndSave(weekendPricingData, '/pages/discounts');
                } catch (saveError) {
                // Continue navigation even if save fails - data is in context
              }
              
              // Update current step in context
              if (actions.setCurrentStep) {
                actions.setCurrentStep('discounts');
              }
              
              // Update sessionStorage before navigating forward
              updateSessionStorageBeforeNav('weekendpricing', 'discounts');
              
              // Navigate to discounts page
              // REMOVED: weekdayPrice is NO LONGER passed from WeekendPricing's Next button
              // weekdayPrice should ONLY be passed from Pricing page's Next button, not from WeekendPricing
              // Only pass weekendPrice and premiumPercentage (calculated by WeekendPricing)
              const discountsState = {
                // weekendPrice and premiumPercentage are calculated/updated by WeekendPricing
                weekendPrice: weekendPrice, // Current calculated value (updated by WeekendPricing)
                premiumPercentage: premiumPercentage, // Current calculated value (updated by WeekendPricing)
                draftId: draftIdToUse || state?.draftId || location.state?.draftId
              };
              
              // Spread other properties from location.state EXCEPT pricing-related fields
              if (location.state) {
                Object.keys(location.state).forEach(key => {
                  if (key !== 'weekdayPrice' && key !== 'weekendPrice' && key !== 'premiumPercentage' && key !== 'draftId') {
                    discountsState[key] = location.state[key];
                  }
                });
              }
              
              console.log('📍 WeekendPricing: Forwarding weekend pricing values to Discounts (weekdayPrice NOT passed):', {
                weekendPrice: discountsState.weekendPrice,
                premiumPercentage: discountsState.premiumPercentage
              });
              
              navigate('/pages/discounts', { 
                state: discountsState
              });
            } catch (error) {
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