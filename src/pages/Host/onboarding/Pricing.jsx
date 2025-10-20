import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import OnboardingHeader from './components/OnboardingHeader';

const Pricing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [basePrice, setBasePrice] = useState(1511);
  const guestPrice = Math.round(basePrice * 1.14); // Roughly 14% markup for taxes/fees

  const canProceed = basePrice > 0;

  const handlePriceChange = (increment) => {
    setBasePrice(prev => Math.max(100, prev + increment));
  };

  // Debug: Log the location state
  console.log('Pricing - location.state:', location.state);

  const handleNext = () => {
    // Update pricing in context before proceeding
    actions.updatePricing({ weekdayPrice: basePrice });
    navigate('/host/onboarding/weekend-pricing');
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader 
        showProgress={true}
        currentStep={2}
        totalSteps={3}
      />

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
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => handlePriceChange(-50)}
                className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
              >
                <span className="text-2xl font-light">−</span>
              </button>
              
              <div className="text-center">
                <div className="text-6xl font-medium text-gray-900 mb-2">
                  ₱{basePrice.toLocaleString()}
                </div>
                <button className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                  Guest price before taxes ₱{guestPrice.toLocaleString()}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              <button
                onClick={() => handlePriceChange(50)}
                className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
              >
                <span className="text-2xl font-light">+</span>
              </button>
            </div>
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

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/guest-selection')}
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
                    // Continue to weekend pricing or completion
                    navigate('/pages/weekend-pricing', { 
                      state: { 
                        ...location.state,
                        weekdayPrice: basePrice
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
    </div>
  );
};

export default Pricing;