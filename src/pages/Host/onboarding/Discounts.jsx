import React, { useState, useEffect, useRef } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';

const Discounts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [discounts, setDiscounts] = useState({
    'new-listing': true,
    'last-minute': true,
    'weekly': true,
    'monthly': true
  });
  
  // Ref to track initialization
  const hasInitialized = useRef(false);

  const discountOptions = [
    {
      id: 'new-listing',
      percentage: '20%',
      title: 'New listing promotion',
      description: 'Offer 20% off your first 3 bookings'
    },
    {
      id: 'last-minute',
      percentage: '4%',
      title: 'Last-minute discount',
      description: 'For stays booked 14 days or less before arrival'
    },
    {
      id: 'weekly',
      percentage: '15%',
      title: 'Weekly discount',
      description: 'For stays of 7 nights or more'
    },
    {
      id: 'monthly',
      percentage: '30%',
      title: 'Monthly discount',
      description: 'For stays of 28 nights or more'
    }
  ];

  const toggleDiscount = (discountId) => {
    setDiscounts(prev => ({
      ...prev,
      [discountId]: !prev[discountId]
    }));
  };

  // Helper function to convert discount state to percentage values
  const buildDiscountsData = () => {
    return {
      weekly: discounts['weekly'] ? 15 : 0,
      monthly: discounts['monthly'] ? 30 : 0,
      earlyBird: discounts['new-listing'] ? 20 : 0,
      lastMinute: discounts['last-minute'] ? 4 : 0
    };
  };

  // Helper function to ensure we have a valid draftId and save discounts to Firebase
  const ensureDraftAndSave = async (discountsData, targetRoute = '/pages/safetydetails') => {
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
          const nextStep = targetRoute === '/pages/safetydetails' ? 'safetydetails' : 'discounts';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              discounts: discountsData
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
          // Update existing document - save discounts under data.discounts and currentStep
          const nextStep = targetRoute === '/pages/safetydetails' ? 'safetydetails' : 'discounts';
          await updateDoc(draftRef, {
            'data.discounts': discountsData,
            currentStep: nextStep,
            lastModified: new Date()
          });
          } else {
          // Document doesn't exist, create it
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const nextStep = targetRoute === '/pages/safetydetails' ? 'safetydetails' : 'discounts';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              discounts: discountsData
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
        actions.setCurrentStep('discounts');
      }
      
      // Ensure discounts are updated in context
      const discountsData = buildDiscountsData();
      actions.updateDiscounts(discountsData);
      
      // Save discounts to Firebase under data.discounts
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(discountsData, '/pages/discounts');
        } catch (saveError) {
        // Continue with save & exit even if Firebase save fails
      }
      
      // Update sessionStorage before Save & Exit navigation
      updateSessionStorageBeforeNav('discounts');
      
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

  // Set current step for progress bar when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'discounts') {
      actions.setCurrentStep('discounts');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Load discounts from Firebase when component mounts or draftId changes
  useEffect(() => {
    const loadDiscountsFromFirebase = async () => {
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
          // Check nested data.discounts first (where we save it), then context
          const savedDiscounts = draftData.data?.discounts || state.discounts;
          
          if (savedDiscounts) {
            // Convert percentage values back to boolean state
            const restoredDiscounts = {
              'new-listing': savedDiscounts.earlyBird > 0,
              'last-minute': savedDiscounts.lastMinute > 0,
              'weekly': savedDiscounts.weekly > 0,
              'monthly': savedDiscounts.monthly > 0
            };
            
            setDiscounts(restoredDiscounts);
            
            // Also update context if it's not set there yet or is different
            if (!state.discounts || JSON.stringify(state.discounts) !== JSON.stringify(savedDiscounts)) {
              actions.updateDiscounts(savedDiscounts);
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

    loadDiscountsFromFirebase();
  }, [location.state?.draftId, state?.draftId, state.discounts, actions]);

  // Sync discounts to context when they change, so Save & Exit in header saves the current selections
  useEffect(() => {
    const discountsData = buildDiscountsData();
    if (actions.updateDiscounts) {
      actions.updateDiscounts(discountsData);
    }
  }, [discounts, actions]);

  const canProceed = true; // Can always proceed regardless of discount selection

  // Debug: Log the location state
  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} customSaveAndExit={handleSaveAndExitClick} />

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-medium text-gray-900 mb-4">
              Add discounts
            </h1>
            <p className="text-lg text-gray-600">
              Help your place stand out to get booked faster and earn your first reviews.
            </p>
          </div>

          <div className="space-y-4">
            {discountOptions.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Percentage Badge */}
                  <div className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-medium text-gray-900">
                      {option.percentage}
                    </span>
                  </div>
                  
                  {/* Discount Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {option.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {option.description}
                    </p>
                  </div>
                </div>

                {/* Checkbox */}
                <button
                  onClick={() => toggleDiscount(option.id)}
                  className="flex-shrink-0 ml-4 w-5 h-5 flex items-center justify-center rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                  style={{
                    backgroundColor: discounts[option.id] ? '#000' : 'transparent',
                    borderColor: discounts[option.id] ? '#000' : '#d1d5db'
                  }}
                >
                  {discounts[option.id] && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Only one discount will be applied per stay.{' '}
              <button className="underline hover:no-underline">
                Learn more
              </button>
            </p>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={() => {
          // Update sessionStorage before navigating back
          updateSessionStorageBeforeNav('discounts');
          navigate('/pages/weekendpricing');
        }}
        onNext={async () => {
          if (canProceed) {
            try {
              // Build discounts data
              const discountsData = buildDiscountsData();
              
              // Update context
              actions.updateDiscounts(discountsData);
              
              // Save discounts to Firebase
              let draftIdToUse;
              try {
                draftIdToUse = await ensureDraftAndSave(discountsData, '/pages/safetydetails');
                } catch (saveError) {
                // Continue navigation even if save fails - data is in context
              }
              
              // Update current step in context
              if (actions.setCurrentStep) {
                actions.setCurrentStep('safetydetails');
              }
              
              // Update sessionStorage before navigating forward
              updateSessionStorageBeforeNav('discounts', 'safetydetails');
              
              // Navigate to safety details page
              navigate('/pages/safetydetails', { 
                state: { 
                  ...location.state,
                  discounts: discounts,
                  draftId: draftIdToUse || state?.draftId || location.state?.draftId
                } 
              });
            } catch (error) {
              alert('Error saving progress. Please try again.');
            }
          }
        }}
        canProceed={canProceed}
      />
    </div>
  );
};

export default Discounts;