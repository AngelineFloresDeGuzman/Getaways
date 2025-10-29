import React from 'react';

const OnboardingFooter = ({ 
  onBack, 
  onNext, 
  backText = "Back", 
  nextText = "Next", 
  canProceed = true,
  showProgress = true,
  currentStep = 0,
  totalSteps = 3
}) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white z-40">
      <div className="max-w-none">
        {/* Progress Bar removed as requested */}
        
        <div className="px-8 py-6 border-t">
          <div className="flex justify-between items-center">
            {onBack ? (
              <button
                onClick={onBack}
                className="hover:underline"
              >
                {backText}
              </button>
            ) : (
              <div></div>
            )}
            
            <button 
              onClick={onNext}
              disabled={!canProceed}
              className={`rounded-lg px-8 py-3.5 text-base font-medium transition-colors ${
                canProceed 
                  ? 'bg-black text-white hover:bg-gray-800' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {nextText}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default OnboardingFooter;