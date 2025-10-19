import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Info } from 'lucide-react';

const SafetyDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [safetyFeatures, setSafetyFeatures] = useState({
    'exterior-camera': false,
    'noise-monitor': false,
    'weapons': false
  });

  const safetyOptions = [
    {
      id: 'exterior-camera',
      label: 'Exterior security camera present'
    },
    {
      id: 'noise-monitor',
      label: 'Noise decibel monitor present'
    },
    {
      id: 'weapons',
      label: 'Weapon(s) on the property'
    }
  ];

  const toggleSafetyFeature = (featureId) => {
    setSafetyFeatures(prev => ({
      ...prev,
      [featureId]: !prev[featureId]
    }));
  };

  const canProceed = true; // Can always proceed regardless of safety feature selection

  // Debug: Log the location state
  console.log('SafetyDetails - location.state:', location.state);

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
          <div className="mb-12">
            <h1 className="text-3xl font-medium text-gray-900 mb-8">
              Share safety details
            </h1>
            
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Does your place have any of these?
                </h2>
                <Info className="w-4 h-4 text-gray-400" />
              </div>

              <div className="space-y-4">
                {safetyOptions.map((option) => (
                  <div key={option.id} className="flex items-center justify-between py-3">
                    <label className="text-gray-900 cursor-pointer flex-1">
                      {option.label}
                    </label>
                    <button
                      onClick={() => toggleSafetyFeature(option.id)}
                      className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-colors ${
                        safetyFeatures[option.id]
                          ? 'bg-black border-black'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {safetyFeatures[option.id] && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Important things to know
              </h3>
              
              <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                <p>
                  Security cameras that monitor indoor spaces are not allowed even if they're turned 
                  off. All exterior security cameras must be disclosed.
                </p>
                
                <p>
                  Be sure to comply with your{' '}
                  <button className="text-black underline hover:no-underline">
                    local laws
                  </button>
                  {' '}and review Airbnb's{' '}
                  <button className="text-black underline hover:no-underline">
                    anti-discrimination policy
                  </button>
                  {' '}and{' '}
                  <button className="text-black underline hover:no-underline">
                    guest and Host fees
                  </button>
                  .
                </p>
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
                onClick={() => navigate('/pages/discounts')}
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
                    // Continue to final details
                    navigate('/pages/final-details', { 
                      state: { 
                        ...location.state,
                        safetyFeatures: safetyFeatures
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

export default SafetyDetails;