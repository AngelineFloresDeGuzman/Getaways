import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin } from 'lucide-react';

const Pricing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [basePrice, setBasePrice] = useState(1511);
  const guestPrice = Math.round(basePrice * 1.14); // Roughly 14% markup for taxes/fees

  const canProceed = basePrice > 0;

  const handlePriceChange = (increment) => {
    setBasePrice(prev => Math.max(100, prev + increment));
  };

  // Debug: Log the location state
  console.log('Pricing - location.state:', location.state);

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
            <button className="font-medium text-sm hover:underline">Save & exit</button>
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