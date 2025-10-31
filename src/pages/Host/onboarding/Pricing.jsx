import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const Pricing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [basePrice, setBasePrice] = useState(state.weekdayPrice || 1525);
  const [isSaving, setIsSaving] = useState(false);
  const [isPriceBreakdownOpen, setIsPriceBreakdownOpen] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPriceValue, setEditPriceValue] = useState('');
  
  // Calculate pricing breakdown
  const guestServiceFee = Math.round(basePrice * 0.141); // ~14.1% service fee
  const guestPriceBeforeTaxes = basePrice + guestServiceFee;
  const platformFee = Math.round(basePrice * 0.033); // ~3.3% platform fee on host
  const youEarn = basePrice - platformFee;

  const canProceed = basePrice > 0;

  const handlePriceChange = (increment) => {
    const newPrice = Math.max(100, basePrice + increment);
    console.log('Price changing from', basePrice, 'to', newPrice);
    setBasePrice(newPrice);
    
    // Update context with new pricing - use the correct action signature
    console.log('Updating context pricing:', newPrice, state.weekendPrice || 0);
    actions.updatePricing(newPrice, state.weekendPrice || 0);
  };

  const handlePriceInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
    setEditPriceValue(value);
  };

  const handlePriceInputBlur = () => {
    if (editPriceValue) {
      const numValue = parseInt(editPriceValue, 10);
      if (!isNaN(numValue) && numValue >= 100) {
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

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      // Only load draft if user is authenticated and we have a draftId
      if (location.state?.draftId && actions.loadDraft && state.user) {
        console.log('Pricing - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          console.log('Pricing - Draft loaded successfully');
        } catch (error) {
          console.error('Pricing - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state.user]);

  // Update pricing from state when draft loads
  useEffect(() => {
    if (state.weekdayPrice && state.weekdayPrice !== basePrice) {
      console.log('Pricing - Updating price from state:', state.weekdayPrice);
      setBasePrice(state.weekdayPrice);
    }
  }, [state.weekdayPrice]);

  // Update context whenever basePrice changes
  useEffect(() => {
    if (basePrice !== state.weekdayPrice) {
      console.log('Pricing - Updating context with new price:', basePrice);
      actions.updatePricing(basePrice, state.weekendPrice || 0);
    }
  }, [basePrice]);

  // Helper function to ensure we have a valid draftId and save pricing to Firebase
  const ensureDraftAndSave = async (pricingData, targetRoute = '/pages/weekendpricing') => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
      console.log('📍 Pricing: Found temp ID, resetting to find/create real draft');
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
          console.log('📍 Pricing: Using existing draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          console.log('📍 Pricing: No existing drafts, creating new draft');
          const nextStep = targetRoute === '/pages/weekendpricing' ? 'weekendpricing' : 'pricing';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              pricing: pricingData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          console.log('📍 Pricing: ✅ Created new draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        console.error('📍 Pricing: Error finding/creating draft:', error);
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
          await updateDoc(draftRef, {
            'data.pricing': pricingData,
            currentStep: nextStep,
            lastModified: new Date()
          });
          console.log('📍 Pricing: ✅ Saved pricing to data.pricing and currentStep to Firebase:', draftIdToUse, '- pricing:', pricingData, ', currentStep:', nextStep);
        } else {
          // Document doesn't exist, create it
          console.log('📍 Pricing: Document not found, creating new one');
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
          console.log('📍 Pricing: ✅ Created new draft with pricing:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        console.error('📍 Pricing: ❌ Error saving to Firebase:', error);
        throw error;
      }
    } else if (state.user?.uid) {
      console.warn('📍 Pricing: ⚠️ User authenticated but no valid draftId after ensureDraftAndSave');
      throw new Error('Failed to create draft for authenticated user');
    } else {
      console.warn('📍 Pricing: ⚠️ User not authenticated, cannot save to Firebase');
      return null;
    }
  };

  // Custom save handler
  const handleSaveAndExitClick = async () => {
    console.log('Pricing Save & Exit clicked');
    console.log('Current basePrice:', basePrice);
    
    if (!auth.currentUser) {
      console.error('Pricing: No authenticated user');
      alert('Please log in to save your progress');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('Pricing: Setting currentStep to pricing');
        actions.setCurrentStep('pricing');
      }
      
      // Ensure pricing is updated in context
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
        console.log('📍 Pricing: ✅ Saved pricing to Firebase on Save & Exit');
      } catch (saveError) {
        console.error('📍 Pricing: Error saving to Firebase on Save & Exit:', saveError);
        // Continue with save & exit even if Firebase save fails
      }
      
      // Navigate to dashboard
      navigate('/host/hostdashboard', { 
        state: { 
          message: 'Draft saved successfully!',
          draftSaved: true 
        }
      });
    } catch (error) {
      console.error('Error in Pricing save:', error);
      alert('Failed to save progress: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Debug: Log the location state
  console.log('Pricing - location.state:', location.state);

  const handleNext = () => {
    // Update pricing in context before proceeding
    actions.updatePricing({ weekdayPrice: basePrice });
    navigate('/host/onboarding/weekendpricing');
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} />

      {/* Main Content */}
      <main className="pt-28 px-8 pb-32">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-medium text-gray-900 mb-4">
              Now, set a weekday base price
            </h1>
            <p className="text-lg text-gray-600">
              Tip: ₱{basePrice.toLocaleString()}. You'll set a weekend price next.
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

          {/* Action Buttons */}
          <div className="space-y-4 text-center">
            <button className="flex items-center justify-center gap-2 text-red-600 hover:text-red-700 mx-auto">
              <MapPin className="w-4 h-4" />
              View similar listings
            </button>
            
            <button className="text-gray-600 hover:text-gray-800 underline">
              Learn more about pricing
            </button>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={() => navigate('/pages/guestselection')}
        onNext={async () => {
          if (canProceed) {
            try {
              // Update context first
              actions.updatePricing(basePrice, state.weekendPrice || 0);
              
              // Prepare pricing data to save
              const pricingData = {
                weekdayPrice: basePrice,
                weekendPrice: state.weekendPrice || 0
              };
              
              // Save pricing to Firebase
              let draftIdToUse;
              try {
                draftIdToUse = await ensureDraftAndSave(pricingData, '/pages/weekendpricing');
                console.log('📍 Pricing: ✅ Saved pricing to Firebase on Next click');
              } catch (saveError) {
                console.error('📍 Pricing: Error saving to Firebase on Next:', saveError);
                // Continue navigation even if save fails - data is in context
              }
              
              // Update current step in context
              if (actions.setCurrentStep) {
                actions.setCurrentStep('weekendpricing');
              }
              
              // Navigate to weekend pricing page
              navigate('/pages/weekendpricing', { 
                state: { 
                  ...location.state,
                  weekdayPrice: basePrice,
                  draftId: draftIdToUse || state?.draftId || location.state?.draftId
                } 
              });
            } catch (error) {
              console.error('Error saving pricing:', error);
              alert('Error saving progress. Please try again.');
            }
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