import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";

const ExperiencePricePerGuest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();

  const [pricePerGuest, setPricePerGuest] = useState("");
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
          if (data.pricePerGuest !== undefined) {
            setPricePerGuest(String(data.pricePerGuest || ""));
          }
          if (data.experienceCategory) {
            setMainCategory(data.experienceCategory);
          } else if (location.state?.experienceCategory) {
            setMainCategory(location.state.experienceCategory);
          }
        }
      } catch (error) {
        console.error("Error loading price per guest data:", error);
      }
    };
    loadData();
  }, [draftId, location.state?.experienceCategory]);

  // Set current step for progress bar
  useEffect(() => {
    if (actions.setCurrentStep) {
      actions.setCurrentStep("experience-price-per-guest");
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
        currentStep: "experience-price-per-guest",
        category: "experience",
        "data.pricePerGuest": pricePerGuest,
        "data.experienceCategory": mainCategory || location.state?.experienceCategory,
        lastModified: new Date(),
      });
      console.log("✅ Saved price per guest data");
    } catch (error) {
      console.error("Error saving price per guest data:", error);
      throw error;
    }
  };

  const handleNext = async () => {
    if (!pricePerGuest.trim() || isNaN(parseFloat(pricePerGuest)) || parseFloat(pricePerGuest) <= 0) {
      return;
    }

    setIsLoading(true);
    try {
      await saveData();
      // Navigate to experience-details with step 10 (private group minimum)
      navigate("/pages/experience-details", {
        state: {
          draftId,
          experienceCategory: mainCategory || location.state?.experienceCategory,
          experienceSubcategory: location.state?.experienceSubcategory,
          experienceCity: location.state?.experienceCity,
          currentStepNumber: 10, // Step 10 is private group minimum
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
          currentStepNumber: 10,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    // Navigate to experience-details with step 8 (max guests)
    navigate("/pages/experience-details", {
      state: {
        draftId,
        experienceCategory: mainCategory || location.state?.experienceCategory,
        experienceSubcategory: location.state?.experienceSubcategory,
        experienceCity: location.state?.experienceCity,
        currentStepNumber: 8, // Step 8 is max guests
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

  const canProceed =
    String(pricePerGuest || "").trim().length > 0 &&
    !isNaN(parseFloat(pricePerGuest)) &&
    parseFloat(pricePerGuest) > 0;

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader
        showProgress={true}
        currentStepNameOverride="experience-price-per-guest"
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto w-full mb-12">
          {/* Heading */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center">
            Price per guest
          </h1>

          {/* Price Input */}
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <div className="flex items-center gap-3 mb-8">
              <span className="text-7xl font-bold text-gray-900">₱</span>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={pricePerGuest}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    setPricePerGuest(value);
                  }}
                  placeholder=""
                  className="text-7xl font-bold text-gray-900 bg-transparent border-none outline-none w-auto min-w-[200px] text-left"
                  autoFocus
                  style={{ caretColor: "transparent" }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-20 bg-gray-900 pointer-events-none"
                  style={{
                    left: `${pricePerGuest.length * 0.6}ch`,
                    animation: "blink 1s infinite",
                  }}
                ></div>
              </div>
              <style>{`
                @keyframes blink {
                  0%, 50% { opacity: 1; }
                  51%, 100% { opacity: 0; }
                }
              `}</style>
            </div>

            {/* Learn more link */}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-sm text-gray-900 underline hover:text-gray-700 transition-colors"
            >
              Learn more about pricing
            </a>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={canProceed}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ExperiencePricePerGuest;

