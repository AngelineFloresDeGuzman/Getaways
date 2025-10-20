import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';

const OnboardingHeader = ({ showProgress = true, currentStep = 0, totalSteps = 3 }) => {
  const navigate = useNavigate();
  
  // Add error handling for context
  let contextData;
  try {
    contextData = useOnboarding();
  } catch (error) {
    console.error('❌ OnboardingContext error:', error);
    // Fallback values
    contextData = {
      state: { isLoading: false },
      actions: { saveAndExit: () => Promise.reject(new Error('Context not available')) }
    };
  }
  
  const { state, actions } = contextData;

  const handleSaveAndExit = async () => {
    console.log('🔵 Save & Exit clicked!');
    console.log('🔍 Current state:', state);
    console.log('🔍 Available actions:', actions);
    
    // Check if user is authenticated
    const { auth } = await import('@/lib/firebase');
    const currentUser = auth.currentUser;
    console.log('👤 Current user:', currentUser);
    
    if (!currentUser) {
      console.log('❌ No user logged in');
      alert('Please log in to save your progress.');
      navigate('/login');
      return;
    }
    
    try {
      console.log('💾 Attempting to save and exit...');
      await actions.saveAndExit();
      console.log('✅ Save and exit completed successfully!');
    } catch (error) {
      console.error('❌ Error saving draft:', error);
      alert('Failed to save draft: ' + error.message);
    }
  };

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b">
        <div className="py-4 px-8 flex justify-between items-center">
          <img src="/logo.jpg" alt="Havenly" className="h-8" />
          <div className="flex items-center gap-6">
            <button className="hover:underline text-sm font-medium">Questions?</button>
            <button 
              onClick={handleSaveAndExit}
              className="hover:underline text-sm font-medium"
              disabled={state.isLoading}
            >
              {state.isLoading ? 'Saving...' : 'Save & exit'}
            </button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      {showProgress && (
        <div className="fixed top-[73px] left-0 right-0 bg-white z-40">
          <div className="h-1 w-full flex space-x-2">
            {Array.from({ length: totalSteps }, (_, index) => (
              <div key={index} className="h-full bg-gray-200 flex-1 relative">
                {index < currentStep && (
                  <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default OnboardingHeader;