import React, { useState, useEffect, useRef } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboardingAutoSave, useOnboardingNavigation } from './hooks/useOnboardingAutoSave';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';

const FinishSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Enhanced auto-save and state management
  const { 
    state, 
    actions, 
    loadDraftIfNeeded, 
    saveAndExit, 
    isLoading 
  } = useOnboardingAutoSave('finishsetup', []);
  
  const { navigateNext, navigateBack } = useOnboardingNavigation('finishsetup');
  
  // Direct context access for Firebase saving
  const { state: contextState, actions: contextActions } = useOnboarding();

  // Load draft if continuing from saved progress
  useEffect(() => {
    const initializePage = async () => {
      if (location.state?.draftId) {
        try {
          await loadDraftIfNeeded(location.state.draftId);
        } catch (error) {
          console.error('Error loading draft in FinishSetup:', error);
        }
      }
    };

    initializePage();
  }, [location.state, loadDraftIfNeeded]);

  // Save & Exit handler
  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader />
      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[calc(100vh-200px)]">
            {/* Left side - Text content */}
            <div className="space-y-8">
              <div>
                <p className="text-lg font-medium text-gray-900 mb-4">Step 3</p>
                <h1 className="text-5xl font-medium text-gray-900 mb-6 leading-tight">
                  Finish up and publish
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Finally, you'll choose booking settings, set up pricing, and publish your listing.
                </p>
              </div>
            </div>
            {/* Right side - House illustration */}
            <div className="flex justify-center items-center">
              <div className="relative">
                {/* Modern house illustration using CSS */}
                <div className="w-96 h-80 relative">
                  {/* House base */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-80 h-48 bg-gray-100 rounded-lg shadow-2xl">
                    {/* Front wall */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg"></div>
                    {/* Windows on front */}
                    <div className="absolute bottom-12 left-8 w-12 h-16 bg-blue-200 rounded border-2 border-gray-300">
                      <div className="absolute inset-1 bg-gradient-to-br from-sky-100 to-blue-300 rounded"></div>
                    </div>
                    <div className="absolute bottom-12 left-24 w-12 h-16 bg-blue-200 rounded border-2 border-gray-300">
                      <div className="absolute inset-1 bg-gradient-to-br from-sky-100 to-blue-300 rounded"></div>
                    </div>
                    <div className="absolute bottom-12 right-8 w-12 h-16 bg-blue-200 rounded border-2 border-gray-300">
                      <div className="absolute inset-1 bg-gradient-to-br from-sky-100 to-blue-300 rounded"></div>
                    </div>
                    <div className="absolute bottom-12 right-24 w-12 h-16 bg-blue-200 rounded border-2 border-gray-300">
                      <div className="absolute inset-1 bg-gradient-to-br from-sky-100 to-blue-300 rounded"></div>
                    </div>
                  </div>
                  {/* Large glass window/wall */}
                  <div className="absolute top-4 left-8 right-8 h-16 bg-gradient-to-r from-blue-100 via-sky-200 to-blue-100 rounded border-2 border-gray-300">
                    <div className="absolute inset-2 bg-gradient-to-br from-sky-50 to-blue-200 rounded opacity-80"></div>
                    {/* Window frame lines */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300"></div>
                    <div className="absolute top-0 bottom-0 left-1/3 w-0.5 bg-gray-300"></div>
                    <div className="absolute top-0 bottom-0 right-1/3 w-0.5 bg-gray-300"></div>
                  </div>
                  {/* Roof for lower level */}
                  <div className="absolute bottom-44 left-1/2 transform -translate-x-1/2 w-84 h-4 bg-slate-700 rounded-sm shadow-lg" style={{width: '21rem'}}></div>
                  {/* Roof for upper level */}
                  <div className="absolute bottom-60 left-1/2 transform -translate-x-1/2 translate-x-8 w-68 h-4 bg-slate-700 rounded-sm shadow-lg" style={{width: '17rem'}}></div>
                  {/* Solar panels */}
                  <div className="absolute bottom-61 left-1/2 transform -translate-x-1/2 translate-x-4 w-8 h-6 bg-blue-900 rounded-sm"></div>
                  <div className="absolute bottom-61 left-1/2 transform -translate-x-1/2 translate-x-14 w-8 h-6 bg-blue-900 rounded-sm"></div>
                  <div className="absolute bottom-61 left-1/2 transform -translate-x-1/2 translate-x-24 w-8 h-6 bg-blue-900 rounded-sm"></div>
                  {/* Decorative elements */}
                  {/* Trees/bushes */}
                  <div className="absolute bottom-0 left-0 w-6 h-8 bg-green-400 rounded-full"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-8 bg-green-400 rounded-full"></div>
                  <div className="absolute bottom-2 left-20 w-4 h-6 bg-green-500 rounded-full"></div>
                  <div className="absolute bottom-2 right-20 w-4 h-6 bg-green-500 rounded-full"></div>
                  {/* Bench */}
                  <div className="absolute bottom-2 right-12 w-8 h-2 bg-gray-600 rounded"></div>
                  <div className="absolute bottom-0 right-13 w-1 h-4 bg-gray-600"></div>
                  <div className="absolute bottom-0 right-11 w-1 h-4 bg-gray-600"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <OnboardingFooter
        onBack={() => {
          // Update sessionStorage before navigating back
          updateSessionStorageBeforeNav('finishsetup');
          navigate('/pages/descriptiondetails');
        }}
        onNext={async () => {
          try {
            // Update current step in context
            if (contextActions.setCurrentStep) {
              contextActions.setCurrentStep('bookingsettings');
            }
            
            // Save currentStep to Firebase
            const draftIdToUse = contextState?.draftId || location.state?.draftId;
            
            if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
              try {
                const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
                const docSnap = await getDoc(draftRef);
                
                if (docSnap.exists()) {
                  await updateDoc(draftRef, {
                    currentStep: 'bookingsettings',
                    lastModified: new Date()
                  });
                  console.log('📍 FinishSetup: ✅ Saved currentStep to Firebase:', draftIdToUse, '- currentStep: bookingsettings');
                }
              } catch (saveError) {
                console.error('📍 FinishSetup: Error saving to Firebase:', saveError);
                // Continue navigation even if save fails
              }
            }
            
            // Update sessionStorage before navigating forward
            updateSessionStorageBeforeNav('finishsetup', 'bookingsettings');
            
            // Continue to pricing/booking settings
            navigate('/pages/bookingsettings', { 
              state: { 
                ...location.state,
                finishedOnboarding: true,
                draftId: draftIdToUse || contextState?.draftId || location.state?.draftId
              } 
            });
          } catch (error) {
            console.error('Error in FinishSetup Next:', error);
            alert('Error saving progress. Please try again.');
          }
        }}
        canProceed={true}
      />
    </div>
  );
}

export default FinishSetup;