import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit.js';

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
        console.log('MakeItStandOut - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          draftLoaded.current = true;
          console.log('MakeItStandOut - Draft loaded successfully');
        } catch (error) {
          console.error('MakeItStandOut - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId]);

  // Set current step when component mounts
  useEffect(() => {
    if (actions.setCurrentStep) {
      actions.setCurrentStep('make-it-stand-out');
    }
  }, []);

  // Save & Exit handler
  const handleSaveAndExitClick = async () => {
    console.log('MakeItStandOut Save & Exit clicked');
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('MakeItStandOut: Setting currentStep to make-it-stand-out');
        actions.setCurrentStep('make-it-stand-out');
      }
      
      // Override the saveDraft to ensure currentStep is set correctly
      if (actions.saveDraft) {
        console.log('MakeItStandOut: Calling custom saveDraft with forced currentStep');
        
        // Create modified state data with forced currentStep
        const { user, isLoading, ...dataToSave } = state;
        dataToSave.currentStep = 'make-it-stand-out'; // Force the currentStep
        
        console.log('MakeItStandOut: Data to save with forced currentStep:', dataToSave);
        
        // Import the draftService directly and save with our custom data
        const { saveDraft } = await import('@/pages/Host/services/draftService');
        const draftId = await saveDraft(dataToSave, state.draftId);
        
        // Update the draftId in context
        if (actions.setDraftId) {
          actions.setDraftId(draftId);
        }
        
        // Navigate to dashboard
        navigate('/host/hostdashboard', { 
          state: { 
            message: 'Draft saved successfully!',
            draftSaved: true 
          }
        });
      } else {
        // Fallback to normal save
        await handleSaveAndExit();
      }
      
    } catch (error) {
      console.error('Error in MakeItStandOut save:', error);
      alert('Failed to save progress: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b">
        <div className="py-4 px-8 flex justify-between items-center">
          <svg viewBox="0 0 32 32" className="h-8 w-8">
            <path d="m16 1c2.008 0 3.978.378 5.813 1.114 1.837.736 3.525 1.798 4.958 3.138 1.433 1.34 2.56 2.92 3.355 4.628.795 1.709 1.2 3.535 1.2 5.394 0 1.859-.405 3.685-1.2 5.394-.795 1.708-1.922 3.288-3.355 4.628-1.433 1.34-3.121 2.402-4.958 3.138-1.835.736-3.805 1.114-5.813 1.114s-3.978-.378-5.813-1.114c-1.837-.736-3.525-1.798-4.958-3.138-1.433-1.34-2.56-2.92-3.355-4.628-.795-1.709-1.2-3.535-1.2-5.394 0-1.859.405-3.685 1.2-5.394.795-1.708 1.922-3.288 3.355-4.628 1.433-1.34 3.121-2.402 4.958-3.138 1.835-.736 3.805-1.114 5.813-1.114z" fill="rgb(255, 56, 92)"/>
          </svg>
          <div className="flex items-center gap-6">
            <button className="font-medium text-sm hover:underline">Questions?</button>
            <button 
              onClick={handleSaveAndExitClick}
              disabled={state.isLoading}
              className="font-medium text-sm hover:underline disabled:opacity-50"
            >
              {state.isLoading ? 'Saving...' : 'Save & exit'}
            </button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="h-1 w-full flex space-x-2">
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-1/2"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1"></div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[calc(100vh-200px)]">
            {/* Left Content */}
            <div className="space-y-6">
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">Step 2</p>
                <h1 className="text-5xl font-medium text-gray-900 leading-tight mb-6">
                  Make your place stand out
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

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/property-basics')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className="bg-black text-white hover:bg-gray-800 rounded-lg px-8 py-3.5 text-base font-medium"
                onClick={() => {
                  // Navigate to amenities step
                  navigate('/pages/amenities', { 
                    state: location.state
                  });
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MakeItStandOut;