import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';

const Pricing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [basePrice, setBasePrice] = useState(() => {
    // Initialize from state if available (from loaded draft), otherwise use default
    return state.weekdayPrice && state.weekdayPrice > 0 ? state.weekdayPrice : 0;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isPriceBreakdownOpen, setIsPriceBreakdownOpen] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPriceValue, setEditPriceValue] = useState('');
  
  // Ref to track the latest basePrice value
  const basePriceRef = useRef(basePrice);
  
  // Update ref whenever basePrice changes
  useEffect(() => {
    basePriceRef.current = basePrice;
    }, [basePrice]);
  
  // Calculate pricing breakdown
  const guestServiceFee = 100; // Fixed Php100 service fee
  const guestPrice = basePrice + guestServiceFee;
  const youEarn = basePrice;

  // Check if we can proceed - consider both basePrice and if user is editing with a valid value
  const getCurrentPrice = () => {
    if (isEditingPrice && editPriceValue) {
      const parsedValue = parseInt(editPriceValue, 10);
      if (!isNaN(parsedValue) && parsedValue >= 0) {
        return parsedValue;
      }
    }
    return basePriceRef.current || basePrice;
  };
  
  const canProceed = getCurrentPrice() > 0;

  const handlePriceChange = (increment) => {
    const newPrice = Math.max(0, basePrice + increment);
    setBasePrice(newPrice);
    
    // Update context with new pricing - use the correct action signature
    actions.updatePricing(newPrice, state.weekendPrice || 0);
  };

  const handlePriceInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
    setEditPriceValue(value);
  };

  const handlePriceInputBlur = () => {
    if (editPriceValue) {
      const numValue = parseInt(editPriceValue, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        setBasePrice(numValue);
        actions.updatePricing(numValue, state.weekendPrice || 0);
      } else {
        setEditPriceValue(basePrice.toString());
      }
    }
    setIsEditingPrice(false);
  };

  const handlePriceInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      handlePriceInputBlur();
    } else if (e.key === 'Escape') {
      setEditPriceValue('');
      setIsEditingPrice(false);
    }
  };

  const handlePriceClick = () => {
    setIsEditingPrice(true);
    setEditPriceValue(basePrice.toString());
  };

  // Ref to track if we've loaded pricing from Firebase
  const hasLoadedPricing = useRef(false);

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

  // Reset hasLoadedPricing when draftId changes (so we reload when navigating back)
  useEffect(() => {
    hasLoadedPricing.current = false;
  }, [location.state?.draftId, state?.draftId]);

  // Load pricing directly from Firebase when component mounts or draftId changes
  useEffect(() => {
    const loadPricingFromFirebase = async () => {
      if (hasLoadedPricing.current) {
        return; // Already loaded
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
          // Check nested data.pricing.weekdayPrice (where we save it)
          const savedWeekdayPrice = draftData.data?.pricing?.weekdayPrice;
          
          if (savedWeekdayPrice !== undefined && savedWeekdayPrice > 0) {
            setBasePrice(savedWeekdayPrice);
            basePriceRef.current = savedWeekdayPrice;
            
            // Update context with saved pricing
            if (!state.weekdayPrice || state.weekdayPrice !== savedWeekdayPrice) {
              actions.updatePricing(savedWeekdayPrice, draftData.data?.pricing?.weekendPrice || state.weekendPrice || 0);
            }
            
            hasLoadedPricing.current = true;
            return; // Exit early if we found it in Firebase
          } else {
            }
        } else {
          }
      } catch (error) {
        }
    };

    loadPricingFromFirebase();
  }, [location.state?.draftId, state?.draftId, state.weekdayPrice, state.weekendPrice, actions]);

  // Update pricing from state when draft loads (fallback if Firebase load didn't work)
  useEffect(() => {
    if (!hasLoadedPricing.current && state.weekdayPrice && state.weekdayPrice > 0 && state.weekdayPrice !== basePrice) {
      setBasePrice(state.weekdayPrice);
      basePriceRef.current = state.weekdayPrice;
      hasLoadedPricing.current = true;
    }
  }, [state.weekdayPrice, basePrice]);

  // Update context whenever basePrice changes (but don't update if basePrice is 0 and state already has a value)
  useEffect(() => {
    if (basePrice !== state.weekdayPrice && basePrice > 0) {
      actions.updatePricing(basePrice, state.weekendPrice || 0);
    } else if (basePrice === 0 && state.weekdayPrice > 0) {
      // If basePrice is 0 but state has a value, don't overwrite it
      }
  }, [basePrice, state.weekdayPrice, state.weekendPrice, actions]);

  // Helper function to ensure we have a valid draftId and save pricing to Firebase
  const ensureDraftAndSave = async (pricingData, targetRoute = '/pages/weekendpricing') => {
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
          const nextStep = targetRoute === '/pages/weekendpricing' ? 'weekendpricing' : 'pricing';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              pricing: pricingData
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
          // Update existing document - save pricing under data.pricing and currentStep
          const nextStep = targetRoute === '/pages/weekendpricing' ? 'weekendpricing' : 'pricing';
          
          // Get existing pricing data to preserve weekendPrice if it exists
          const existingData = docSnap.data();
          const existingPricing = existingData.data?.pricing || {};
          
          // Preserve existing weekendPrice if it exists and is > 0, otherwise use the one from pricingData
          // pricingData.weekendPrice is already set to weekdayPrice if weekendPrice doesn't exist
          const weekendPriceToSave = existingPricing.weekendPrice > 0 
            ? existingPricing.weekendPrice 
            : pricingData.weekendPrice;
          
          await updateDoc(draftRef, {
            'data.pricing': {
              weekdayPrice: pricingData.weekdayPrice, // Always update weekdayPrice from Pricing page
              weekendPrice: weekendPriceToSave // Preserve existing weekendPrice if it exists, otherwise use new value
            },
            currentStep: nextStep,
            lastModified: new Date()
          });
          } else {
          // Document doesn't exist, create it
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const nextStep = targetRoute === '/pages/weekendpricing' ? 'weekendpricing' : 'pricing';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              pricing: pricingData
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

  // Custom save handler
  const handleSaveAndExitClick = async () => {
    if (!auth.currentUser) {
      alert('Please log in to save your progress');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        actions.setCurrentStep('pricing');
      }
      
      // Ensure pricing is updated in context (so WeekendPricing can access it when navigating)
      actions.updatePricing(basePrice, state.weekendPrice || 0);
      
      // Prepare pricing data to save
      const pricingData = {
        weekdayPrice: basePrice,
        weekendPrice: state.weekendPrice || 0
      };
      
      // Save pricing to Firebase under data.pricing
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(pricingData, '/pages/pricing');
        } catch (saveError) {
        // Continue with save & exit even if Firebase save fails
      }
      
      // Update sessionStorage before Save & Exit navigation
      updateSessionStorageBeforeNav('pricing');
      
      // Navigate to dashboard
      navigate('/host/listings', { 
        state: { 
          message: 'Draft saved successfully!',
          draftSaved: true,
          weekdayPrice: basePrice // Pass weekdayPrice so it's available if navigating to WeekendPricing
        }
      });
    } catch (error) {
      alert('Failed to save progress: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Debug: Log the location state
  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      <style>{`
        .pricing-main::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>
      <OnboardingHeader showProgress={true} customSaveAndExit={handleSaveAndExitClick} />

      {/* Main Content */}
      <main 
        className="pricing-main flex-1 overflow-y-auto pt-28 px-8 pb-32"
        style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* IE and Edge */
        }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-medium text-gray-900 mb-4">
              Now, set a weekday base price
            </h1>
            <p className="text-lg text-gray-600">
              You'll set a weekend price next.
            </p>
          </div>

          {/* Price Display */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="text-center">
                {isEditingPrice ? (
                  <div className="text-6xl font-medium text-gray-900 mb-2">
                    <input
                      type="text"
                      value={editPriceValue}
                      onChange={handlePriceInputChange}
                      onBlur={handlePriceInputBlur}
                      onKeyDown={handlePriceInputKeyDown}
                      className="text-6xl font-medium text-gray-900 bg-transparent border-b-2 border-gray-400 focus:border-black focus:outline-none w-48 text-center"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div 
                    className="text-6xl font-medium text-gray-900 mb-2 cursor-pointer relative group"
                    onClick={handlePriceClick}
                  >
                    ₱{basePrice.toLocaleString()}
                    <svg 
                      className="w-5 h-5 inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                )}
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
              </div>
            </div>

            {/* Price Breakdown */}
            {isPriceBreakdownOpen && (
              <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 max-w-md mx-auto shadow-sm">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Base price</span>
                    <span className="text-gray-900 font-medium">₱{basePrice.toLocaleString()}</span>
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

        </div>
      </main>

      <OnboardingFooter
        onBack={() => {
          // Update sessionStorage before navigating back
          updateSessionStorageBeforeNav('pricing');
          navigate('/pages/guestselection');
        }}
        onNext={async () => {
          try {
            // IMMEDIATELY capture weekdayPrice when Next button is clicked - this is the trigger point
            // STEP 1: Get the actual current value - prioritize the ref which always has the latest value
            let currentWeekdayPrice = basePriceRef.current || basePrice;
            // STEP 2: If user is editing and has entered a value, use that value FIRST
            if (isEditingPrice && editPriceValue) {
              const parsedValue = parseInt(editPriceValue, 10);
              if (!isNaN(parsedValue) && parsedValue >= 0) {
                currentWeekdayPrice = parsedValue;
                // Update state immediately and sync ref BEFORE proceeding
                setBasePrice(currentWeekdayPrice);
                basePriceRef.current = currentWeekdayPrice;
                setIsEditingPrice(false);
                // Update context immediately
                actions.updatePricing(currentWeekdayPrice, state.weekendPrice || 0);
              }
            }
            
            // STEP 3: Fallback to context if value is still 0
            if (currentWeekdayPrice === 0 && state.weekdayPrice > 0) {
              currentWeekdayPrice = state.weekdayPrice;
              }
            
            // STEP 4: Validate we have a valid price
            if (!currentWeekdayPrice || currentWeekdayPrice <= 0) {
              alert('Please set a valid price (greater than 0) before continuing.');
              return;
            }
            
            // STEP 5: Prepare weekendPrice - set to same value as weekdayPrice initially, so WeekendPricing can see it in advance
            // If weekendPrice already exists and is > 0, preserve it, otherwise use weekdayPrice
            const weekendPriceToSave = (state.weekendPrice && state.weekendPrice > 0) 
              ? state.weekendPrice 
              : currentWeekdayPrice;
            
            // Update context with the captured weekdayPrice and weekendPrice FIRST - this ensures it's available immediately
            actions.updatePricing(currentWeekdayPrice, weekendPriceToSave);
            // CRITICAL: Wait a tick to ensure context update is processed before navigation
            await new Promise(resolve => setTimeout(resolve, 0));
              
            // Prepare pricing data to save
            const pricingData = {
              weekdayPrice: currentWeekdayPrice,
              weekendPrice: weekendPriceToSave // Same as weekdayPrice initially, so WeekendPricing can see it
            };
            
            // Save pricing to Firebase
            let draftIdToUse;
            try {
              draftIdToUse = await ensureDraftAndSave(pricingData, '/pages/weekendpricing');
              } catch (saveError) {
              // Continue navigation even if save fails - data is in context
            }
            
            // Update current step in context
            if (actions.setCurrentStep) {
              actions.setCurrentStep('weekendpricing');
            }
            
            // Update sessionStorage before navigating forward
            updateSessionStorageBeforeNav('pricing', 'weekendpricing');
            
            // STEP 6: Create navigation state with weekdayPrice - THIS IS WHERE WE PASS IT TO WEEKENDPRICING
            // CRITICAL: Create navigation state with weekdayPrice as the PRIMARY value
            // This is the ONLY place where weekdayPrice should be passed to WeekendPricing
            const weekendPricingState = {
              weekdayPrice: currentWeekdayPrice, // PRIMARY: This MUST be passed to WeekendPricing
              draftId: draftIdToUse || state?.draftId || location.state?.draftId
            };
            
            // Spread other properties from location.state EXCEPT weekdayPrice and draftId (to avoid conflicts)
            if (location.state) {
              Object.keys(location.state).forEach(key => {
                if (key !== 'weekdayPrice' && key !== 'draftId') {
                  weekendPricingState[key] = location.state[key];
                }
              });
            }
            
            console.log('📍 Pricing: weekendPricingState object:', JSON.stringify(weekendPricingState, null, 2));
            // Navigate to WeekendPricing - THIS IS THE CRITICAL STEP WHERE weekdayPrice IS PASSED
            navigate('/pages/weekendpricing', { 
              state: weekendPricingState
            });
            
            } catch (error) {
            alert('Error saving progress. Please try again.');
          }
        }}
        backText="Back"
        nextText="Next"
        canProceed={canProceed}
      />
    </div>
  );
};

export default Pricing;