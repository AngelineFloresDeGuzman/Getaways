import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit';

const WeekendPricing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  
  // Get weekday price from previous page, default to 1511
  const weekdayPrice = location.state?.weekdayPrice || 1511;
  
  const [premiumPercentage, setPremiumPercentage] = useState(5);
  
  // Ref to track initialization
  const hasInitialized = useRef(false);

  // Save and Exit hook integration
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);
  
  // Calculate weekend price based on premium
  const weekendPrice = Math.round(weekdayPrice * (1 + premiumPercentage / 100));
  const guestPrice = Math.round(weekendPrice * 1.14); // Roughly 14% markup for taxes/fees

  const canProceed = true; // Always can proceed with any percentage

  // Initialize from context if available
  useEffect(() => {
    if (!hasInitialized.current && state.weekendPricingEnabled !== undefined) {
      console.log('WeekendPricing - Initializing from context:', {
        weekendPrice: state.weekendPrice,
        weekendPricingEnabled: state.weekendPricingEnabled
      });
      
      if (state.weekendPrice > 0 && weekdayPrice > 0) {
        // Calculate premium percentage from saved weekend price
        const calculatedPremium = Math.round(((state.weekendPrice / weekdayPrice) - 1) * 100);
        setPremiumPercentage(Math.max(0, Math.min(99, calculatedPremium)));
      }
      hasInitialized.current = true;
    }
  }, [state.weekendPrice, state.weekendPricingEnabled, weekdayPrice]);

  // Real-time context updates
  const updateWeekendPricingContext = (percentage) => {
    const calculatedWeekendPrice = Math.round(weekdayPrice * (1 + percentage / 100));
    console.log('WeekendPricing - Updating context with:', {
      enabled: true,
      price: calculatedWeekendPrice,
      percentage
    });
    actions.updateWeekendPricing(true, calculatedWeekendPrice);
    actions.setCurrentStep('weekend-pricing');
  };

  const handleSliderChange = (e) => {
    const newPercentage = parseInt(e.target.value);
    setPremiumPercentage(newPercentage);
    
    // Update context in real-time
    updateWeekendPricingContext(newPercentage);
  };

  // Debug: Log the location state
  console.log('WeekendPricing - location.state:', location.state);
  console.log('WeekendPricing - weekdayPrice:', weekdayPrice);

  // Save & Exit handler
  const handleSaveAndExitClick = async () => {
    console.log('WeekendPricing Save & Exit clicked');
    try {
      // Ensure context is up to date
      updateWeekendPricingContext(premiumPercentage);
      
      // Use the hook's save and exit functionality
      await handleSaveAndExit();
    } catch (error) {
      console.error('Error during save and exit:', error);
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
              disabled={state.isLoading}
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
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
        </div>
      </div>

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
            <button className="text-gray-600 hover:text-gray-800 flex items-center gap-1 mx-auto">
              Guest price before taxes ₱{guestPrice.toLocaleString()}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Weekend Premium Control */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Weekend premium</h3>
                <p className="text-sm text-gray-600">Tip: Try 5%</p>
              </div>
              <div className="text-2xl font-medium text-gray-900">
                {premiumPercentage}%
              </div>
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
                <span>0%</span>
                <span>99%</span>
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
                onClick={() => navigate('/pages/pricing')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className={`rounded-lg px-8 py-3.5 text-base font-medium ${
                  canProceed
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (canProceed) {
                    // Update context before navigation
                    updateWeekendPricingContext(premiumPercentage);
                    
                    // Continue to discounts
                    navigate('/pages/discounts', { 
                      state: { 
                        ...location.state,
                        weekendPrice: weekendPrice,
                        premiumPercentage: premiumPercentage
                      } 
                    });
                  }
                }}
                disabled={!canProceed}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </footer>

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