import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";

const ExperienceMaxGuests = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();

  const [maxGuests, setMaxGuests] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [mainCategory, setMainCategory] = useState(null);

  const draftId = state.draftId || location.state?.draftId;

  // Load data from draft
  useEffect(() => {
    const loadData = async () => {
      if (!draftId) return;

      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        const draftSnap = await getDoc(draftRef);
        if (draftSnap.exists()) {
          const data = draftSnap.data().data || {};
          if (data.maxGuests !== undefined) {
            setMaxGuests(data.maxGuests);
          }
          if (data.experienceCategory) {
            setMainCategory(data.experienceCategory);
          } else if (location.state?.experienceCategory) {
            setMainCategory(location.state.experienceCategory);
          }
        }
      } catch (error) {
        console.error("Error loading max guests data:", error);
      }
    };
    loadData();
  }, [draftId, location.state?.experienceCategory]);

  // Set current step for progress bar
  useEffect(() => {
    if (actions.setCurrentStep) {
      actions.setCurrentStep("experience-max-guests");
    }
  }, [actions]);

  // Save data to draft
  const saveData = async () => {
    if (!draftId) {
      console.warn("No draftId available for saving");
      return;
    }

    try {
      const draftRef = doc(db, "onboardingDrafts", draftId);
      await updateDoc(draftRef, {
        currentStep: "experience-max-guests",
        category: "experience",
        "data.maxGuests": maxGuests,
        "data.experienceCategory": mainCategory || location.state?.experienceCategory,
        lastModified: new Date(),
      });
      console.log("✅ Saved max guests data");
    } catch (error) {
      console.error("Error saving max guests data:", error);
      throw error;
    }
  };

  const handleNext = async () => {
    setIsLoading(true);
    try {
      await saveData();
      // Navigate to experience-details with step 9 (price per guest)
      navigate("/pages/experience-details", {
        state: {
          draftId,
          experienceCategory: mainCategory || location.state?.experienceCategory,
          experienceSubcategory: location.state?.experienceSubcategory,
          experienceCity: location.state?.experienceCity,
          currentStepNumber: 9, // Step 9 is price per guest
        },
      });
    } catch (error) {
      console.error("Error in handleNext:", error);
      // Navigate even on error
      navigate("/pages/experience-details", {
        state: {
          draftId,
          experienceCategory: mainCategory || location.state?.experienceCategory,
          experienceSubcategory: location.state?.experienceSubcategory,
          experienceCity: location.state?.experienceCity,
          currentStepNumber: 9,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    // Navigate to experience-details with step 7 (itinerary)
    navigate("/pages/experience-details", {
      state: {
        draftId,
        experienceCategory: mainCategory || location.state?.experienceCategory,
        experienceSubcategory: location.state?.experienceSubcategory,
        experienceCity: location.state?.experienceCity,
        currentStepNumber: 7, // Step 7 is itinerary
      },
    });
  };

  const handleSaveAndExit = async () => {
    try {
      await saveData();
      navigate("/host/listings", {
        state: {
          draftId,
          scrollToDrafts: true,
        },
      });
    } catch (error) {
      console.error("Error saving and exiting:", error);
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader
        showProgress={true}
        currentStepNameOverride="experience-max-guests"
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto w-full mb-12">
          {/* Heading */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center">
            Add your maximum number of guests
          </h1>

          {/* Guest Counter */}
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <div className="flex items-center gap-8 mb-4">
              <button
                onClick={() => setMaxGuests(Math.max(1, maxGuests - 1))}
                disabled={maxGuests <= 1}
                className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-2xl font-light text-gray-600">−</span>
              </button>
              <div className="text-7xl font-bold text-gray-900 min-w-[120px] text-center">
                {maxGuests}
              </div>
              <button
                onClick={() => setMaxGuests(maxGuests + 1)}
                className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
              >
                <span className="text-2xl font-light text-gray-600">+</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={true}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ExperienceMaxGuests;

