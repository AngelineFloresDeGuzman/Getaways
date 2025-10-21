import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboardingAutoSave, useOnboardingNavigation } from './hooks/useOnboardingAutoSave';

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
  } = useOnboardingAutoSave('finish-setup', []);
  
  const { navigateNext, navigateBack } = useOnboardingNavigation('finish-setup');

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
  const handleSaveAndExitClick = async () => {
    try {
      console.log('FinishSetup: Saving and exiting...');
      
      // Save all current data and exit
      await saveAndExit({});
    } catch (error) {
      console.error('Error saving and exiting:', error);
      alert('Error saving progress: ' + error.message);
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
              className="font-medium text-sm hover:underline"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save & exit'}
            </button>
          </div>
        </div>
      </header>

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

                    {/* Door */}
                    <div className="absolute bottom-0 right-4 w-8 h-20 bg-amber-700 rounded-t-lg">
                      <div className="absolute top-2 right-1 w-1 h-1 bg-yellow-400 rounded-full"></div>
                    </div>
                  </div>

                  {/* Upper level */}
                  <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 translate-x-8 w-64 h-32 bg-gray-100 rounded-lg shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg"></div>
                    
                    {/* Upper windows */}
                    <div className="absolute bottom-4 left-4 w-10 h-12 bg-blue-200 rounded border-2 border-gray-300">
                      <div className="absolute inset-1 bg-gradient-to-br from-sky-100 to-blue-300 rounded"></div>
                    </div>
                    <div className="absolute bottom-4 right-4 w-10 h-12 bg-blue-200 rounded border-2 border-gray-300">
                      <div className="absolute inset-1 bg-gradient-to-br from-sky-100 to-blue-300 rounded"></div>
                    </div>

                    {/* Large glass window/wall */}
                    <div className="absolute top-4 left-8 right-8 h-16 bg-gradient-to-r from-blue-100 via-sky-200 to-blue-100 rounded border-2 border-gray-300">
                      <div className="absolute inset-2 bg-gradient-to-br from-sky-50 to-blue-200 rounded opacity-80"></div>
                      {/* Window frame lines */}
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300"></div>
                      <div className="absolute top-0 bottom-0 left-1/3 w-0.5 bg-gray-300"></div>
                      <div className="absolute top-0 bottom-0 right-1/3 w-0.5 bg-gray-300"></div>
                    </div>
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

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/description-details')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className="bg-black text-white hover:bg-gray-800 rounded-lg px-8 py-3.5 text-base font-medium"
                onClick={() => {
                  // Continue to pricing/booking settings
                  navigate('/pages/booking-settings', { 
                    state: { 
                      ...location.state,
                      finishedOnboarding: true
                    } 
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

export default FinishSetup;