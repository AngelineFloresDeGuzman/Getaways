import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';

const SafetyDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  
  const [safetyFeatures, setSafetyFeatures] = useState({
    'exterior-camera': false,
    'noise-monitor': false,
    'weapons': false
  });

  // Ref to track initialization
  const hasInitialized = useRef(false);

  // Save and Exit hook integration
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);

  // Set current step when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'safetydetails') {
      console.log('📍 SafetyDetails page - Setting currentStep to safetydetails');
      actions.setCurrentStep('safetydetails');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Initialize from context if available
  useEffect(() => {
    if (!hasInitialized.current && state.safetyAmenities?.length > 0) {
      console.log('SafetyDetails - Initializing from context:', state.safetyAmenities);
      
      // Convert array back to object format
      const featuresFromContext = {
        'exterior-camera': false,
        'noise-monitor': false,
        'weapons': false
      };
      
      state.safetyAmenities.forEach(amenity => {
        if (featuresFromContext.hasOwnProperty(amenity)) {
          featuresFromContext[amenity] = true;
        }
      });
      
      setSafetyFeatures(featuresFromContext);
      hasInitialized.current = true;
    }
  }, [state.safetyAmenities]);

  // Real-time context updates
  const updateSafetyContext = (features) => {
    // Convert object to array format for context
    const selectedFeatures = Object.keys(features).filter(key => features[key]);
    console.log('SafetyDetails - Updating context with:', selectedFeatures);
    actions.updateSafetyDetails(selectedFeatures);
    // Removed actions.setCurrentStep from here to prevent setState during render
  };

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
    setSafetyFeatures(prev => {
      const updatedFeatures = {
        ...prev,
        [featureId]: !prev[featureId]
      };
      
      // Update context in real-time
      updateSafetyContext(updatedFeatures);
      
      return updatedFeatures;
    });
  };

  const canProceed = true; // Can always proceed regardless of safety feature selection

  // Debug: Log the location state
  console.log('SafetyDetails - location.state:', location.state);

  // Save & Exit handler
  const handleSaveAndExitClick = async () => {
    console.log('SafetyDetails Save & Exit clicked');
    try {
      // Ensure context is up to date
      updateSafetyContext(safetyFeatures);
      
      // Use the hook's save and exit functionality
      await handleSaveAndExit();
    } catch (error) {
      console.error('Error during save and exit:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} />

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
      <OnboardingFooter
        onBack={() => navigate('/pages/discounts')}
        onNext={() => {
          if (canProceed) {
            updateSafetyContext(safetyFeatures);
            navigate('/pages/finaldetails', { 
              state: { 
                ...location.state,
                safetyFeatures: safetyFeatures
              } 
            });
          }
        }}
        backText="Back"
        nextText="Next"
        canProceed={canProceed}
      />
    </div>
  );
};

export default SafetyDetails;