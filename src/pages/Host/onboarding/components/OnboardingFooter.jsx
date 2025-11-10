import React from 'react';

const OnboardingFooter = ({ 
  onBack, 
  onNext, 
  onSkip,
  backText = "Back", 
  nextText = "Next",
  skipText = "Skip",
  canProceed = true,
  showProgress = true,
  currentStep = 0,
  totalSteps = 3
}) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white z-40">
      <div className="max-w-none">
        {/* Progress Bar removed as requested */}
        
        <div className="px-6 py-4 border-t">
          <div className="flex justify-between items-center">
            {onBack ? (
              <button
                onClick={onBack}
                className="text-primary text-sm transition-all duration-300 hover:scale-105 hover:opacity-80"
              >
                {backText}
              </button>
            ) : onSkip ? (
              <button
                onClick={onSkip}
                className="text-gray-600 text-sm font-medium hover:text-gray-900 transition-colors underline"
              >
                {skipText}
              </button>
            ) : (
              <div></div>
            )}
            
            <div className="flex items-center gap-3">
              {onSkip && onBack && (
                <button
                  onClick={onSkip}
                  className="text-gray-600 text-sm font-medium hover:text-gray-900 transition-colors underline"
                >
                  {skipText}
                </button>
              )}
              <button 
                onClick={onNext}
                disabled={!canProceed}
                className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                  canProceed 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                style={canProceed ? { background: 'hsl(var(--primary))', color: 'white' } : {}}
                onMouseEnter={(e) => { if (canProceed) { e.currentTarget.style.background = 'hsl(var(--primary))'; e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.05)'; } }}
                onMouseLeave={(e) => { if (canProceed) { e.currentTarget.style.background = 'hsl(var(--primary))'; e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; } }}
              >
                {nextText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default OnboardingFooter;