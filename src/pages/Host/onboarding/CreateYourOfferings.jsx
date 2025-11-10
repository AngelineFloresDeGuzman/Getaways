import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera } from 'lucide-react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const CreateYourOfferings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [offerings, setOfferings] = useState([]);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("create-your-offerings");
    }
  }, [actions]);

  // Load saved offerings from draft if available
  useEffect(() => {
    const loadOfferings = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            if (data.serviceOfferings && Array.isArray(data.serviceOfferings)) {
              setOfferings(data.serviceOfferings);
            }
          }
        } catch (error) {
          console.error("Error loading offerings from draft:", error);
        }
      }
    };
    loadOfferings();
  }, [state.draftId, location.state?.draftId]);

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // If no offerings or less than 3, navigate to "Your offerings" to add more
    if (offerings.length < 3) {
      navigate("/pages/your-offerings", {
        state: {
          draftId,
          category: "service",
          ...location.state,
          serviceOfferings: offerings,
        },
      });
    } else {
      // Navigate to next step in onboarding flow
      navigate("/pages/service-what-provide", {
        state: {
          draftId,
          category: "service",
          ...location.state,
          serviceOfferings: offerings,
        },
      });
    }
  };

  const handleBack = () => {
    navigate("/pages/service-title", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        ...location.state,
      },
    });
  };

  const canProceed = true;

  // Handle Save & Exit
  const handleSaveAndExit = async () => {
      navigate("/host/listings");
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="create-your-offerings" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Create your offerings
          </h1>
          <p className="text-gray-500 text-center mb-12 text-lg">
            These are what guests will book—think of them like your price sheet or menu.
          </p>

          {/* Stacked Cards Display */}
          {offerings.length > 0 && (
            <div className="flex flex-col items-center gap-4 mb-8 relative">
              {offerings.map((offering, index) => (
                <div
                  key={offering.id}
                  className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer"
                  style={{
                    transform: `translateX(${index * 20}px) rotate(${index * 2}deg)`,
                    zIndex: offerings.length - index,
                  }}
                >
                  {/* Thumbnail Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                    {offering.image ? (
                      <img
                        src={offering.image}
                        alt={offering.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Offering Details */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {offering.title}
                    </h3>
                    <p className="text-gray-600">
                      ${offering.price} total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={canProceed}
      />
    </div>
  );
};

export default CreateYourOfferings;

