import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

// Service category to profession mapping
const serviceProfessionMap = {
  "catering": "a caterer",
  "chef": "a chef",
  "hair-styling": "a hair stylist",
  "makeup": "a makeup artist",
  "massage": "a massage therapist",
  "nails": "a nail technician",
  "personal-training": "a personal trainer",
  "photography": "a photographer",
  "prepared-meals": "a meal prep chef",
  "spa-treatments": "a spa therapist",
};

const ServiceYearsOfExperience = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  const [yearsOfExperience, setYearsOfExperience] = useState(10);
  const [mainCategory, setMainCategory] = useState(null);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("service-years-of-experience");
    }
  }, [actions]);

  // Load main category from location state or draft
  useEffect(() => {
    const loadMainCategory = async () => {
      // First try location state
      const categoryFromState = location.state?.serviceCategory;
      if (categoryFromState) {
        setMainCategory(categoryFromState);
      } else {
        // Try to load from draft
        const draftId = state.draftId || location.state?.draftId;
        if (draftId) {
          try {
            const draftRef = doc(db, "onboardingDrafts", draftId);
            const draftSnap = await getDoc(draftRef);
            if (draftSnap.exists() && draftSnap.data().data?.serviceCategory) {
              setMainCategory(draftSnap.data().data.serviceCategory);
            }
          } catch (error) {
            console.error("Error loading service category from draft:", error);
          }
        }
      }
    };
    loadMainCategory();
  }, [location.state?.serviceCategory, state.draftId, location.state?.draftId]);

  // Load saved years of experience from draft if available
  useEffect(() => {
    const loadYearsOfExperience = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists() && draftSnap.data().data?.serviceYearsOfExperience !== undefined) {
            setYearsOfExperience(draftSnap.data().data.serviceYearsOfExperience);
          }
        } catch (error) {
          console.error("Error loading service years of experience from draft:", error);
        }
      }
    };
    loadYearsOfExperience();
  }, [state.draftId, location.state?.draftId]);

  const handleDecrement = () => {
    if (yearsOfExperience > 0) {
      setYearsOfExperience(yearsOfExperience - 1);
    }
  };

  const handleIncrement = () => {
    setYearsOfExperience(yearsOfExperience + 1);
  };

  const saveServiceData = async () => {
    let draftId = state.draftId || location.state?.draftId;
    
    // If no draftId exists, create a new draft first
    if (!draftId) {
      try {
        const { auth } = await import("@/lib/firebase");
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.warn("⚠️ ServiceYearsOfExperience: User not authenticated, cannot create draft");
          return null;
        }
        
        const { saveDraft } = await import("@/pages/Host/services/draftService");
        const newDraftData = {
          currentStep: "service-years-of-experience",
          category: "service",
          data: {
            serviceCategory: mainCategory,
            serviceCity: location.state?.serviceCity,
            serviceYearsOfExperience: yearsOfExperience,
          }
        };
        draftId = await saveDraft(newDraftData, null);
        console.log("✅ ServiceYearsOfExperience: Created new draft:", draftId);
        
        // Update state with new draftId
        if (actions?.setDraftId) {
          actions.setDraftId(draftId);
        }
      } catch (error) {
        console.error("❌ ServiceYearsOfExperience: Error creating draft:", error);
        throw error;
      }
    }
    
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          currentStep: "service-years-of-experience", // Save CURRENT step, not next step
          "data.serviceYearsOfExperience": yearsOfExperience,
          lastModified: new Date(),
        });
        console.log("✅ ServiceYearsOfExperience: Draft saved successfully");
      } catch (error) {
        console.error("❌ ServiceYearsOfExperience: Error saving data:", error);
        throw error;
      }
    }
    
    return draftId;
  };

  const handleSaveAndExit = async () => {
    try {
      const { auth } = await import("@/lib/firebase");
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("Please log in to save your progress.");
        navigate("/login");
        return;
      }

      await saveServiceData();
      navigate("/host/listings", {
        state: {
          scrollToDrafts: true,
          message: "Draft saved successfully!",
        },
      });
    } catch (error) {
      console.error("❌ Error saving draft:", error);
      alert("Failed to save. Please try again.");
    }
  };

  const handleNext = async () => {
    try {
      const draftId = await saveServiceData();

      // Update context
      if (actions.setCurrentStep) {
        actions.setCurrentStep("service-qualifications");
      }

      // Navigate to qualifications page
      navigate("/pages/service-qualifications", {
        state: {
          draftId,
          category: "service",
          serviceCategory: mainCategory,
          serviceCity: location.state?.serviceCity,
          serviceYearsOfExperience: yearsOfExperience,
        },
      });
    } catch (error) {
      console.error("❌ Error in handleNext:", error);
      alert("Failed to save progress. Please try again.");
    }
  };

  const handleBack = () => {
    navigate("/pages/service-location", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        serviceCategory: mainCategory,
      },
    });
  };

  const profession = mainCategory ? serviceProfessionMap[mainCategory] || "a service provider" : "a service provider";

  if (!mainCategory) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="service-years-of-experience"
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto py-20 pt-32 pb-24">
        <div className="w-full max-w-4xl px-6">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 text-center">
              How many years have you been {profession}?
            </h1>
            
            <div className="flex items-center gap-8">
              <button
                onClick={handleDecrement}
                className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={yearsOfExperience === 0}
              >
                <span className="text-2xl font-light text-gray-600">−</span>
              </button>
              
              <div className="text-6xl md:text-7xl font-bold text-gray-900 min-w-[120px] text-center">
                {yearsOfExperience}
              </div>
              
              <button
                onClick={handleIncrement}
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
      />
    </div>
  );
};

export default ServiceYearsOfExperience;

