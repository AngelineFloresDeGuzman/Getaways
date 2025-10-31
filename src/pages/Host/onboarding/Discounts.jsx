import React, { useState, useEffect } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';

const Discounts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
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

  // Set current step for progress bar when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'discounts') {
      console.log('📍 Discounts page - Setting currentStep to discounts');
      actions.setCurrentStep('discounts');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  const canProceed = true; // Can always proceed regardless of discount selection

  // Debug: Log the location state
  console.log('Discounts - location.state:', location.state);

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} />

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
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/weekendpricing')}
                className="hover:underline text-sm"
              >
                Back
              </button>
              <button 
                className={`rounded-lg px-6 py-2.5 text-sm font-medium ${
                  canProceed
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (canProceed) {
                    // Continue to safety details
                    navigate('/pages/safetydetails', { 
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