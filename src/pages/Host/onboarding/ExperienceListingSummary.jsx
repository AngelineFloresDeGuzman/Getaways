import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

// Category icons (reused from ExperienceCategorySelection)
const categoryIcons = {
  "art-and-design": (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* White classical bust sculpture */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-16 bg-gradient-to-b from-gray-100 to-gray-200 rounded-t-full shadow-sm">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-10 bg-gradient-to-b from-gray-50 to-gray-100 rounded-t-full"></div>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-400 rounded-full"></div>
      </div>
      {/* Framed painting with red flowers */}
      <div className="absolute right-1 bottom-1 w-14 h-14 bg-gradient-to-br from-amber-50 to-amber-100 rounded border-2 border-amber-200 shadow-sm">
        <div className="absolute inset-1 bg-gradient-to-br from-red-200 to-red-300 rounded"></div>
        <div className="absolute top-1 left-1 right-1 h-2 bg-red-400 rounded-t"></div>
        <div className="absolute bottom-1 left-1 right-1 h-1 bg-red-500 rounded-b"></div>
      </div>
    </div>
  ),
  "fitness-and-wellness": (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Rolled-up towel */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-8 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg shadow-sm transform rotate-12">
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-300 rounded-t"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400 rounded-b"></div>
      </div>
      {/* Water bottle */}
      <div className="absolute right-1 bottom-1 w-8 h-12 bg-blue-200 rounded-lg shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-3 bg-blue-300 rounded-t-lg"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400 rounded-b"></div>
      </div>
    </div>
  ),
  "food-and-drink": (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Bowl of pasta/noodles */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-10 bg-gradient-to-br from-amber-50 to-amber-100 rounded-full shadow-sm">
        <div className="absolute inset-1 bg-gradient-to-br from-yellow-100 to-amber-200 rounded-full"></div>
        {/* Noodles */}
        <div className="absolute top-2 left-2 right-2 bottom-2">
          <div className="w-full h-0.5 bg-amber-400 rounded-full transform rotate-12"></div>
          <div className="w-full h-0.5 bg-amber-400 rounded-full transform -rotate-12 mt-1"></div>
          <div className="w-full h-0.5 bg-amber-500 rounded-full transform rotate-45 mt-1"></div>
        </div>
      </div>
      {/* Fork */}
      <div className="absolute right-1 bottom-1 w-1 h-6 bg-gray-400 rounded"></div>
      {/* Small bowls */}
      <div className="absolute left-1 bottom-1 w-6 h-4 bg-gradient-to-br from-red-100 to-red-200 rounded-full shadow-sm">
        <div className="absolute inset-0.5 bg-red-300 rounded-full"></div>
      </div>
      <div className="absolute left-8 bottom-1 w-6 h-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full shadow-sm">
        <div className="absolute inset-0.5 bg-orange-300 rounded-full"></div>
      </div>
    </div>
  ),
  "history-and-culture": (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Arc de Triomphe-like structure */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-20">
        {/* Main arch */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-t-lg shadow-sm">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-8 bg-gradient-to-br from-amber-50 to-amber-100 rounded-t-lg"></div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-6 bg-gradient-to-br from-amber-200 to-amber-300 rounded-t-lg"></div>
        </div>
        {/* Top structure */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-8 bg-gradient-to-br from-amber-150 to-amber-250 rounded-t-lg shadow-sm"></div>
      </div>
    </div>
  ),
  "nature-and-outdoors": (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Landscape with hills, trees, and waterfall */}
      <div className="absolute inset-0">
        {/* Hills */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-br from-green-300 to-green-400 rounded-t-full"></div>
        <div className="absolute bottom-2 left-4 right-4 h-6 bg-gradient-to-br from-green-200 to-green-300 rounded-t-full"></div>
        {/* Trees */}
        <div className="absolute bottom-4 left-2 w-3 h-4 bg-green-600 rounded-t-full"></div>
        <div className="absolute bottom-4 right-2 w-3 h-4 bg-green-600 rounded-t-full"></div>
        {/* Waterfall */}
        <div className="absolute bottom-0 right-1/3 w-2 h-6 bg-gradient-to-b from-blue-300 to-blue-400 rounded-t"></div>
        {/* Water pool */}
        <div className="absolute bottom-0 right-1/3 -translate-x-1/2 w-4 h-2 bg-blue-400 rounded-full"></div>
      </div>
    </div>
  ),
};

// Category display names
const categoryDisplayNames = {
  "art-and-design": "Art and design",
  "fitness-and-wellness": "Fitness and wellness",
  "food-and-drink": "Food and drink",
  "history-and-culture": "History and culture",
  "nature-and-outdoors": "Nature and outdoors",
};

const ExperienceListingSummary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  const [mainCategory, setMainCategory] = useState(null);
  const [subcategory, setSubcategory] = useState(null);
  const [city, setCity] = useState(null);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("experience-listing-summary");
    }
  }, [actions]);

  // Load data from location state or draft
  useEffect(() => {
    const loadData = async () => {
      // First try location state
      const categoryFromState = location.state?.experienceCategory;
      const subcategoryFromState = location.state?.experienceSubcategory;
      const cityFromState = location.state?.experienceCity;

      if (categoryFromState) {
        setMainCategory(categoryFromState);
      }
      if (subcategoryFromState) {
        setSubcategory(subcategoryFromState);
      }
      if (cityFromState) {
        setCity(cityFromState);
      }

      // If not in state, try to load from draft
      if ((!categoryFromState || !cityFromState) && (state.draftId || location.state?.draftId)) {
        const draftId = state.draftId || location.state?.draftId;
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            if (!categoryFromState && data.experienceCategory) {
              setMainCategory(data.experienceCategory);
            }
            if (!subcategoryFromState && data.experienceSubcategory) {
              setSubcategory(data.experienceSubcategory);
            }
            if (!cityFromState && data.experienceCity) {
              setCity(data.experienceCity);
            }
          }
        } catch (error) {
          console.error("Error loading experience data from draft:", error);
        }
      }
    };
    loadData();
  }, [
    location.state?.experienceCategory,
    location.state?.experienceSubcategory,
    location.state?.experienceCity,
    state.draftId,
    location.state?.draftId,
  ]);

  const handleGetStarted = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Update context - set to years of experience step (first step in Step 2)
    if (actions.setCurrentStep) {
      actions.setCurrentStep("experience-years-of-experience");
    }

    // Update Firebase draft
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          currentStep: "experience-years-of-experience",
          lastModified: new Date(),
        });
        console.log("✅ Updated experience listing summary in draft, moving to years of experience");
      } catch (error) {
        console.error("Error updating draft:", error);
      }
    }

    // Navigate to experience years of experience (first step in Step 2)
    navigate("/pages/experience-years-of-experience", {
      state: {
        draftId,
        category: "experience",
        experienceCategory: mainCategory,
        experienceSubcategory: subcategory,
        experienceCity: city,
      },
    });
  };

  const handleBack = () => {
    navigate("/pages/experience-location", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "experience",
        experienceCategory: mainCategory,
        experienceSubcategory: subcategory,
      },
    });
  };

  const handleSaveAndExit = async () => {
    console.log("🚀 ExperienceListingSummary handleSaveAndExit called");
    try {
      const { auth } = await import("@/lib/firebase");
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("Please log in to save your progress.");
        navigate("/login");
        return;
      }

      let draftId = state.draftId || location.state?.draftId;

      // Create draft if it doesn't exist
      if (!draftId) {
        try {
          const { saveDraft } = await import("@/pages/Host/services/draftService");
          const draftData = {
            experienceCategory: mainCategory,
            experienceCity: city,
          };
          
          if (subcategory) {
            draftData.experienceSubcategory = subcategory;
          }
          
          const newDraftData = {
            currentStep: "experience-listing-summary",
            category: "experience",
            data: draftData
          };
          draftId = await saveDraft(newDraftData, null);
          console.log("✅ ExperienceListingSummary: Created new draft:", draftId);
          
          // Update state with new draftId
          if (actions?.setDraftId) {
            actions.setDraftId(draftId);
          }
        } catch (error) {
          console.error("❌ ExperienceListingSummary: Error creating draft:", error);
          alert("Failed to create draft. Please try again.");
          return;
        }
      }

      // Save current step and data
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const updateData = {
            currentStep: "experience-listing-summary",
            "data.experienceCategory": mainCategory,
            "data.experienceCity": city,
            lastModified: new Date(),
          };
          
          if (subcategory) {
            updateData["data.experienceSubcategory"] = subcategory;
          }
          
          await updateDoc(draftRef, updateData);
          console.log("✅ ExperienceListingSummary: Draft saved successfully");
        } catch (error) {
          console.error("❌ Error saving draft:", error);
          alert("Failed to save draft. Please try again.");
          return;
        }
      }

      // Navigate to listings page
      navigate("/host/listings", {
        state: {
          scrollToDrafts: true,
          draftId: draftId,
          message: "Draft saved successfully!",
        },
      });
      console.log("✅ Navigation to listings page initiated");
    } catch (error) {
      console.error("❌ Error in handleSaveAndExit:", error);
      alert("Failed to save. Please try again.");
    }
  };

  const categoryIcon = mainCategory ? categoryIcons[mainCategory] : null;
  const categoryDisplayName = mainCategory ? categoryDisplayNames[mainCategory] : null;

  if (!mainCategory || !city) {
    // Loading state or redirect if no data
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
        currentStepNameOverride="experience-listing-summary"
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto py-20 pt-32 pb-24">
        <div className="w-full max-w-6xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left side - Heading and Description */}
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Create your listing
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Tell us about yourself and the experience you offer. Our team will review it to confirm it meets our requirements.
              </p>
            </div>

            {/* Right side - Selected Category Card */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm bg-white border-2 border-gray-200 rounded-xl p-8 shadow-lg transform rotate-[-2deg]">
                <div className="w-32 h-32 mx-auto mb-6 relative">
                  {categoryIcon}
                </div>
                <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
                  {categoryDisplayName}
                </h2>
                <p className="text-center text-gray-600 text-sm">
                  {city}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleGetStarted}
        backText="Back"
        nextText="Get started"
        canProceed={true}
      />
    </div>
  );
};

export default ExperienceListingSummary;

