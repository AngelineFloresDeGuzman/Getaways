import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Discounts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [discounts, setDiscounts] = useState({
    'new-listing': true,
    'last-minute': true,
    'weekly': true,
    'monthly': true
  });

  const discountOptions = [
    {
      id: 'new-listing',
      percentage: '20%',
      title: 'New listing promotion',
      description: 'Offer 20% off your first 3 bookings'
    },
    {
      id: 'last-minute',
      percentage: '7%',
      title: 'Last-minute discount',
      description: 'For stays booked 14 days or less before arrival'
    },
    {
      id: 'weekly',
      percentage: '10%',
      title: 'Weekly discount',
      description: 'For stays of 7 nights or more'
    },
    {
      id: 'monthly',
      percentage: '16%',
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

  const canProceed = true; // Can always proceed regardless of discount selection

  // Debug: Log the location state
  console.log('Discounts - location.state:', location.state);

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
                className="flex items-center justify-between p-6 bg-gray-50 rounded-xl border border-gray-200"
              >
                <div className="flex items-center gap-4">
                  {/* Percentage Badge */}
                  <div className="w-12 h-12 bg-white border border-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-medium text-gray-900">
                      {option.percentage}
                    </span>
                  </div>
                  
                  {/* Discount Info */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {option.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {option.description}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => toggleDiscount(option.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${
                    discounts[option.id] ? 'bg-black' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      discounts[option.id] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
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

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/weekend-pricing')}
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
                    // Continue to safety details
                    navigate('/pages/safety-details', { 
                      state: { 
                        ...location.state,
                        discounts: discounts
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

export default Discounts;