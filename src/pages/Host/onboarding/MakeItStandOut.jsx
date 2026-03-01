import React, { useEffect, useLayoutEffect, useRef } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit.js';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';

const MakeItStandOut = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  const draftLoaded = useRef(false);
  
  // Save and Exit hook integration
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      if (location.state?.draftId && !draftLoaded.current && actions.loadDraft) {
        try {
          await actions.loadDraft(location.state.draftId);
          draftLoaded.current = true;
          } catch (error) {
          }
      }
    };

    loadDraftData();
  }, [location.state?.draftId]);

  // Set current step immediately when component mounts to ensure progress bar detects forward navigation
  // Use useLayoutEffect to set it synchronously before paint
  useLayoutEffect(() => {
    if (actions?.setCurrentStep) {
      console.log('📍 MakeItStandOut: Setting currentStep to makeitstandout (useLayoutEffect)');
      actions.setCurrentStep('makeitstandout');
    }
  }, [actions]);
  
  // Ensure currentStep is correct after mount (in case draft overwrote it)
  useEffect(() => {
    if (actions?.setCurrentStep) {
      // Always set currentStep to makeitstandout to ensure progress bar updates
      if (state.currentStep !== 'makeitstandout') {
        actions.setCurrentStep('makeitstandout');
      }
      
      // Note: sessionStorage was already set correctly by PropertyBasics before navigation
      // Just verify it's correct (but don't overwrite if PropertyBasics already set it)
      const storagePrevStepKey = 'onb_prev_step_name';
      const storageStepKey = 'onb_progress_step';
      const storageKey = 'onb_progress_value';
      const currentStep = sessionStorage.getItem(storageStepKey);
      const currentProgress = sessionStorage.getItem(storageKey);
      
      // Only update if not already set correctly by PropertyBasics
      if (currentStep !== '2' || !currentProgress || Number(currentProgress) < 10) {
        console.log('📍 MakeItStandOut: Correcting sessionStorage (was set incorrectly)');
        sessionStorage.setItem(storagePrevStepKey, 'propertybasics');
        const makeitstandoutProgress = ((0 + 1) / 7) * 100;
        sessionStorage.setItem(storageStepKey, '2');
        sessionStorage.setItem(storageKey, String(makeitstandoutProgress));
      }
    }
  }, [actions, state.currentStep]);

  // Helper function to ensure we have a valid draftId and save currentStep to Firebase
  const ensureDraftAndSave = async (targetStep = 'makeitstandout') => {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }
    
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
          const newDraftData = {
            currentStep: targetStep,
            category: state.category || 'accommodation',
            data: {}
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
          // Update existing document - save currentStep
          await updateDoc(draftRef, {
            currentStep: targetStep,
            lastModified: new Date()
          });
          console.log('📍 MakeItStandOut: ✅ Saved currentStep to Firebase (currentStep:', targetStep, ')');
        } else {
          // Document doesn't exist, create it
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          
          const newDraftData = {
            currentStep: targetStep,
            category: state.category || 'accommodation',
            data: {}
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
      // User authenticated but no draftId - this shouldn't happen after ensureDraftAndSave logic
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
        actions.setCurrentStep('makeitstandout');
      }
      
      // Save currentStep to Firebase
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave('makeitstandout');
        } catch (saveError) {
        alert('Error saving progress: ' + saveError.message);
        return;
      }
      
      // Update sessionStorage before Save & Exit navigation
      updateSessionStorageBeforeNav('makeitstandout');
      
      // Navigate to listings tab
      navigate('/host/listings', { 
        state: { 
          message: 'Draft saved successfully!',
          draftSaved: true 
        }
      });
    } catch (error) {
      alert('Failed to save progress: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader customSaveAndExit={handleSaveAndExitClick} />
      <main className="pt-20 px-8 pb-32">
        <div className="relative z-0">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            {/* Background Circles */}
            <svg
              className="absolute -z-10 transform -translate-x-1/2"
              width="404"
              height="384"
              viewBox="0 0 404 384"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="a"
                  x="0"
                  y="0"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="2" cy="2" r="2" fill="currentColor" />
                </pattern>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="url(#a)"
                opacity="0.05"
              />
            </svg>
          </div>

          <div className="px-4 py-8 sm:px-6 lg:px-8">
            {/* Content for Make It Stand Out */}
            <div className="max-w-3xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-extrabold leading-tight">
                  Make It Stand Out
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  In this step, you'll add some of the amenities your place offers, plus 5 or more photos. Then, you'll create a title and description.
                </p>
              </div>
            </div>

            {/* Right Content - Isometric House Illustration */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-lg">
                {/* 3D House Illustration */}
                <div className="relative transform rotate-3d perspective-1000">
                  {/* House Container */}
                  <div 
                    className="relative bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl p-8 transform"
                    style={{
                      transform: 'rotateX(10deg) rotateY(-10deg)',
                      transformStyle: 'preserve-3d'
                    }}
                  >
                    {/* Floor */}
                    <div className="w-96 h-80 bg-gradient-to-br from-amber-100 to-orange-200 rounded-lg relative overflow-hidden shadow-2xl">
                      
                      {/* Upper Level - Bedroom */}
                      <div className="absolute top-4 left-4 right-4 h-32 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg border-2 border-white shadow-lg">
                        {/* Bed */}
                        <div className="absolute top-6 left-6 w-16 h-10 bg-orange-300 rounded shadow-md"></div>
                        <div className="absolute top-4 left-4 w-20 h-6 bg-white rounded shadow-sm"></div>
                        {/* Nightstand */}
                        <div className="absolute top-8 right-6 w-6 h-8 bg-amber-400 rounded shadow-sm"></div>
                        {/* Window */}
                        <div className="absolute top-2 right-2 w-8 h-12 bg-blue-200 border-2 border-gray-300 rounded">
                          <div className="w-full h-0.5 bg-gray-300 mt-5"></div>
                          <div className="w-0.5 h-full bg-gray-300 absolute left-1/2 top-0 transform -translate-x-1/2"></div>
                        </div>
                        {/* Mirror */}
                        <div className="absolute bottom-2 left-6 w-4 h-6 bg-gray-200 border border-gray-400 rounded-full"></div>
                      </div>

                      {/* Main Level - Living Area */}
                      <div className="absolute bottom-4 left-4 right-16 h-36 bg-gradient-to-br from-blue-100 to-teal-100 rounded-lg border-2 border-white shadow-lg">
                        {/* Sofa */}
                        <div className="absolute bottom-6 left-6 w-20 h-8 bg-blue-500 rounded shadow-md"></div>
                        <div className="absolute bottom-4 left-4 w-24 h-4 bg-blue-400 rounded shadow-sm"></div>
                        {/* Coffee Table */}
                        <div className="absolute bottom-10 left-16 w-10 h-6 bg-amber-600 rounded shadow-sm"></div>
                        {/* TV */}
                        <div className="absolute top-6 right-4 w-8 h-6 bg-gray-800 rounded shadow-sm"></div>
                        <div className="absolute top-4 right-2 w-12 h-2 bg-gray-900 rounded shadow-sm"></div>
                        {/* Plant */}
                        <div className="absolute top-8 left-6 w-3 h-6 bg-green-500 rounded-full shadow-sm"></div>
                        <div className="absolute top-6 left-5 w-5 h-3 bg-amber-700 rounded shadow-sm"></div>
                        {/* Lamp */}
                        <div className="absolute bottom-14 right-8 w-2 h-8 bg-gray-600 rounded shadow-sm"></div>
                        <div className="absolute bottom-16 right-6 w-6 h-3 bg-yellow-200 rounded shadow-sm"></div>
                      </div>

                      {/* Kitchen Area */}
                      <div className="absolute bottom-4 right-4 w-12 h-36 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg border-2 border-white shadow-lg">
                        {/* Counter */}
                        <div className="absolute bottom-2 left-1 right-1 h-4 bg-gray-400 rounded shadow-sm"></div>
                        {/* Cabinets */}
                        <div className="absolute top-2 left-1 right-1 h-8 bg-amber-700 rounded shadow-sm"></div>
                        {/* Appliances */}
                        <div className="absolute top-12 left-1 w-4 h-6 bg-gray-300 rounded shadow-sm"></div>
                        <div className="absolute bottom-6 right-1 w-4 h-4 bg-black rounded shadow-sm"></div>
                      </div>

                      {/* Stairs */}
                      <div className="absolute bottom-16 right-20 w-8 h-20 transform rotate-45 origin-bottom">
                        <div className="w-full h-2 bg-amber-800 mb-1 shadow-sm"></div>
                        <div className="w-full h-2 bg-amber-700 mb-1 shadow-sm"></div>
                        <div className="w-full h-2 bg-amber-800 mb-1 shadow-sm"></div>
                        <div className="w-full h-2 bg-amber-700 mb-1 shadow-sm"></div>
                      </div>

                      {/* Decorative Elements */}
                      <div className="absolute top-2 left-2 w-2 h-2 bg-yellow-400 rounded-full shadow-sm"></div>
                      <div className="absolute top-6 left-2 w-1 h-1 bg-pink-400 rounded-full"></div>
                      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    </div>

                    {/* Shadow */}
                    <div className="absolute -bottom-4 -right-4 w-full h-full bg-black opacity-10 rounded-2xl blur-lg"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={() => {
          // Update sessionStorage before navigating back
          updateSessionStorageBeforeNav('makeitstandout');
          navigate('/pages/propertybasics');
        }}
        onNext={async () => {
          // Set currentStep to 'amenities' in context
          if (actions.setCurrentStep) {
            actions.setCurrentStep('amenities');
          }
          
          // Save currentStep to Firebase
          const draftIdToUse = state?.draftId || location.state?.draftId;
          if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
            try {
              const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
              const docSnap = await getDoc(draftRef);
              
              if (docSnap.exists()) {
                await updateDoc(draftRef, {
                  currentStep: 'amenities',
                  lastModified: new Date()
                });
                }
            } catch (error) {
              // Continue navigation even if save fails
            }
          }
          
          // Update sessionStorage before navigating forward
          updateSessionStorageBeforeNav('makeitstandout', 'amenities');
          
          // Navigate to amenities step
          navigate('/pages/amenities', { 
            state: location.state
          });
        }}
        canProceed={true}
      />
    </div>
  );
};

export default MakeItStandOut;