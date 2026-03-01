import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';

const SafetyDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  
  const [safetyFeatures, setSafetyFeatures] = useState({
    'exterior-camera': false,
    'noise-monitor': false,
    'weapons': false
  });

  // Ref to track initialization
  const hasInitialized = useRef(false);

  // Set current step when component mounts or route changes (wrapped to avoid setState during render)
  useEffect(() => {
    // Use setTimeout to ensure this runs after render
    const timer = setTimeout(() => {
      if (actions?.setCurrentStep && state.currentStep !== 'safetydetails') {
        actions.setCurrentStep('safetydetails');
      }
    }, 0);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Load draft data from Firebase when editing (if draftId exists)
  useEffect(() => {
    const loadDraftData = async () => {
      const draftId = location.state?.draftId || state?.draftId;
      if (!draftId || draftId.startsWith('temp_') || hasInitialized.current) {
        return;
      }
      
      try {
        const draftRef = doc(db, 'onboardingDrafts', draftId);
        const draftSnap = await getDoc(draftRef);
        
        if (draftSnap.exists()) {
          const draftData = draftSnap.data();
          const data = draftData.data || {};
          
          // Extract safetyDetails from data.safetyDetails
          if (data.safetyDetails) {
            // SafetyDetails can be an array (from context) or an object
            let safetyArray = [];
            if (Array.isArray(data.safetyDetails)) {
              safetyArray = data.safetyDetails;
            } else if (typeof data.safetyDetails === 'object') {
              // Convert object to array
              safetyArray = Object.keys(data.safetyDetails).filter(key => data.safetyDetails[key]);
            }
            
            // Convert array to object format for local state
            const featuresFromFirebase = {
              'exterior-camera': false,
              'noise-monitor': false,
              'weapons': false
            };
            
            safetyArray.forEach(amenity => {
              if (featuresFromFirebase.hasOwnProperty(amenity)) {
                featuresFromFirebase[amenity] = true;
              }
            });
            
            setSafetyFeatures(featuresFromFirebase);
            hasInitialized.current = true;
            
            // Update context as well (wrap in setTimeout to avoid setState during render)
            setTimeout(() => {
              if (actions?.updateSafetyDetails) {
                actions.updateSafetyDetails(safetyArray);
              }
            }, 0);
          }
        }
      } catch (error) {
        }
    };
    
    loadDraftData();
  }, [location.state?.draftId, state?.draftId]);

  // Initialize from context if available
  useEffect(() => {
    if (!hasInitialized.current && state.safetyAmenities?.length > 0) {
      // Convert array back to object format
      const featuresFromContext = {
        'exterior-camera': false,
        'noise-monitor': false,
        'weapons': false
      };
      
      state.safetyAmenities.forEach(amenity => {
        if (featuresFromContext.hasOwnProperty(amenity)) {
          featuresFromContext[amenity] = true;
        }
      });
      
      setSafetyFeatures(featuresFromContext);
      hasInitialized.current = true;
    }
  }, [state.safetyAmenities]);

  // Real-time context updates
  const updateSafetyContext = (features) => {
    // Convert object to array format for context
    const selectedFeatures = Object.keys(features).filter(key => features[key]);
    actions.updateSafetyDetails(selectedFeatures);
    // Removed actions.setCurrentStep from here to prevent setState during render
  };

  const safetyOptions = [
    {
      id: 'exterior-camera',
      label: 'Exterior security camera present'
    },
    {
      id: 'noise-monitor',
      label: 'Noise decibel monitor present'
    },
    {
      id: 'weapons',
      label: 'Weapon(s) on the property'
    }
  ];

  const toggleSafetyFeature = (featureId) => {
    setSafetyFeatures(prev => {
      const updatedFeatures = {
        ...prev,
        [featureId]: !prev[featureId]
      };
      
      // Update context in real-time (defer to avoid setState during render)
      setTimeout(() => {
        updateSafetyContext(updatedFeatures);
      }, 0);
      
      return updatedFeatures;
    });
  };

  const canProceed = true; // Can always proceed regardless of safety feature selection

  // Debug: Log the location state
  // Helper function to convert safety features object to array
  const buildSafetyDetailsData = () => {
    return Object.keys(safetyFeatures).filter(key => safetyFeatures[key]);
  };

  // Helper function to ensure we have a valid draftId and save safety details to Firebase
  const ensureDraftAndSave = async (safetyDetailsData, targetRoute = '/pages/finaldetails') => {
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
          const nextStep = targetRoute === '/pages/finaldetails' ? 'finaldetails' : 'safetydetails';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              safetyDetails: safetyDetailsData
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
          // Update existing document - save safetyDetails under data.safetyDetails and currentStep
          const nextStep = targetRoute === '/pages/finaldetails' ? 'finaldetails' : 'safetydetails';
          await updateDoc(draftRef, {
            'data.safetyDetails': safetyDetailsData,
            currentStep: nextStep,
            lastModified: new Date()
          });
          } else {
          // Document doesn't exist, create it
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const nextStep = targetRoute === '/pages/finaldetails' ? 'finaldetails' : 'safetydetails';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              safetyDetails: safetyDetailsData
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
      // Wrap in setTimeout to avoid setState during render
      if (actions.setCurrentStep) {
        setTimeout(() => {
          actions.setCurrentStep('safetydetails');
        }, 0);
      }
      
      // Ensure safety details are updated in context
      updateSafetyContext(safetyFeatures);
      
      // Prepare safety details data to save
      const safetyDetailsData = buildSafetyDetailsData();
      
      // Save safety details to Firebase under data.safetyDetails
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(safetyDetailsData, '/pages/safetydetails');
        } catch (saveError) {
        // Continue with save & exit even if Firebase save fails
      }
      
      // Update sessionStorage before Save & Exit navigation
      updateSessionStorageBeforeNav('safetydetails');
      
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
          <div className="mb-12">
            <h1 className="text-3xl font-medium text-gray-900 mb-8">
              Share safety details
            </h1>
            
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Does your place have any of these?
                </h2>
                <Info className="w-4 h-4 text-gray-400" />
              </div>

              <div className="space-y-4">
                {safetyOptions.map((option) => (
                  <div key={option.id} className="flex items-center justify-between py-3">
                    <label className="text-gray-900 cursor-pointer flex-1">
                      {option.label}
                    </label>
                    <button
                      onClick={() => toggleSafetyFeature(option.id)}
                      className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-colors ${
                        safetyFeatures[option.id]
                          ? 'bg-black border-black'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {safetyFeatures[option.id] && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Important things to know
              </h3>
              
              <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                <p>
                  Security cameras that monitor indoor spaces are not allowed even if they're turned 
                  off. All exterior security cameras must be disclosed.
                </p>
                
                <p>
                  Be sure to comply with your{' '}
                  <button className="text-black underline hover:no-underline">
                    local laws
                  </button>
                  {' '}and review Getaways'{' '}
                  <button className="text-black underline hover:no-underline">
                    anti-discrimination policy
                  </button>
                  {' '}and{' '}
                  <button className="text-black underline hover:no-underline">
                    guest and Host fees
                  </button>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <OnboardingFooter
        onBack={() => {
          // Update sessionStorage before navigating back
          updateSessionStorageBeforeNav('safetydetails');
          navigate('/pages/discounts');
        }}
        onNext={async () => {
          if (canProceed) {
            try {
              // Update context first
              updateSafetyContext(safetyFeatures);
              
              // Prepare safety details data to save
              const safetyDetailsData = buildSafetyDetailsData();
              
              // Save safety details to Firebase
              let draftIdToUse;
              try {
                draftIdToUse = await ensureDraftAndSave(safetyDetailsData, '/pages/finaldetails');
                } catch (saveError) {
                // Continue navigation even if save fails - data is in context
              }
              
              // Update current step in context
              if (actions.setCurrentStep) {
                actions.setCurrentStep('finaldetails');
              }
              
              // Update sessionStorage before navigating forward
              updateSessionStorageBeforeNav('safetydetails', 'finaldetails');
              
              // Navigate to final details page
              navigate('/pages/finaldetails', { 
                state: { 
                  ...location.state,
                  safetyFeatures: safetyFeatures,
                  draftId: draftIdToUse || state?.draftId || location.state?.draftId
                } 
              });
            } catch (error) {
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

export default SafetyDetails;