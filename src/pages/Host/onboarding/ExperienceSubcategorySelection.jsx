import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

// Subcategories for each main category
const categorySubcategories = {
  "art-and-design": [
    "Architecture tour",
    "Art workshop",
    "Gallery tour",
    "Shopping & fashion experience",
  ],
  "fitness-and-wellness": [
    "Wellness experience",
    "Beauty experience",
    "Workout",
  ],
  "food-and-drink": [
    "Dining experience",
    "Cooking class",
    "Food tour",
    "Tasting",
  ],
  "history-and-culture": [
    "Cultural tour",
    "Landmark tour",
    "Museum tour",
  ],
  "nature-and-outdoors": [
    "Outdoor experience",
    "Flying experience",
    "Water sport experience",
    "Wildlife experience",
  ],
};

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

const ExperienceSubcategorySelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [mainCategory, setMainCategory] = useState(null);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("experience-subcategory-selection");
    }
  }, [actions]);

  // Load main category from location state or draft
  useEffect(() => {
    const loadMainCategory = async () => {
      // First try location state
      const categoryFromState = location.state?.experienceCategory;
      if (categoryFromState) {
        setMainCategory(categoryFromState);
      } else {
        // Try to load from draft
        const draftId = state.draftId || location.state?.draftId;
        if (draftId) {
          try {
            const draftRef = doc(db, "onboardingDrafts", draftId);
            const draftSnap = await getDoc(draftRef);
            if (draftSnap.exists() && draftSnap.data().data?.experienceCategory) {
              setMainCategory(draftSnap.data().data.experienceCategory);
            }
          } catch (error) {
            }
        }
      }
    };
    loadMainCategory();
  }, [location.state?.experienceCategory, state.draftId, location.state?.draftId]);

  // Load selected subcategory from draft if available (when resuming editing)
  useEffect(() => {
    const loadSubcategory = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            // Load subcategory even if mainCategory is not set yet (it will be set by the other useEffect)
            if (data.experienceSubcategory) {
              setSelectedSubcategory(data.experienceSubcategory);
            } else {
              }
          } else {
            }
        } catch (error) {
          }
      } else {
        }
    };
    loadSubcategory();
  }, [state.draftId, location.state?.draftId, mainCategory]);

  const handleSubcategorySelect = (subcategory) => {
    setSelectedSubcategory(subcategory);
  };

  const handleNext = async () => {
    if (!selectedSubcategory || !mainCategory) return;

    let draftId = state.draftId || location.state?.draftId;

    // Create draft if it doesn't exist
    if (!draftId) {
      try {
        const { auth } = await import("@/lib/firebase");
        const currentUser = auth.currentUser;
        if (!currentUser) {
          return;
        }
        
        const { saveDraft } = await import("@/pages/Host/services/draftService");
        const newDraftData = {
          currentStep: "experience-subcategory-selection",
          category: "experience",
          data: {
            experienceCategory: mainCategory,
            experienceSubcategory: selectedSubcategory,
          }
        };
        draftId = await saveDraft(newDraftData, null);
        // Update state with new draftId
        if (actions?.setDraftId) {
          actions.setDraftId(draftId);
        }
      } catch (error) {
        return;
      }
    }

    // Save current step and data
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          currentStep: "experience-subcategory-selection", // Save CURRENT step
          "data.experienceCategory": mainCategory,
          "data.experienceSubcategory": selectedSubcategory,
          lastModified: new Date(),
        });
        } catch (error) {
        }
    }

    // Update context for next step
    if (actions.setCurrentStep) {
      actions.setCurrentStep("experience-location");
    }

    // Navigate to location page
    navigate("/pages/experience-location", {
      state: {
        draftId: draftId, // Pass the potentially newly created draftId
        category: "experience",
        experienceCategory: mainCategory,
        experienceSubcategory: selectedSubcategory,
      },
    });
  };

  const handleBack = () => {
    navigate("/pages/experience-category-selection", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "experience",
      },
    });
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

      let draftId = state.draftId || location.state?.draftId;

      // Create draft if it doesn't exist
      if (!draftId) {
        try {
          const { saveDraft } = await import("@/pages/Host/services/draftService");
          const newDraftData = {
            currentStep: "experience-subcategory-selection",
            category: "experience",
            data: {
              experienceCategory: mainCategory,
              experienceSubcategory: selectedSubcategory,
            }
          };
          draftId = await saveDraft(newDraftData, null);
          // Update state with new draftId
          if (actions?.setDraftId) {
            actions.setDraftId(draftId);
          }
        } catch (error) {
          alert("Failed to create draft. Please try again.");
          return;
        }
      }

      // Save current step and data
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          await updateDoc(draftRef, {
            currentStep: "experience-subcategory-selection",
            "data.experienceCategory": mainCategory,
            "data.experienceSubcategory": selectedSubcategory,
            lastModified: new Date(),
          });
          } catch (error) {
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
      } catch (error) {
      alert("Failed to save. Please try again.");
    }
  };

  // Get subcategories for the selected main category
  const subcategories = mainCategory ? categorySubcategories[mainCategory] || [] : [];
  const categoryIcon = mainCategory ? categoryIcons[mainCategory] : null;
  const categoryDisplayName = mainCategory ? categoryDisplayNames[mainCategory] : null;

  if (!mainCategory) {
    // Loading state or redirect if no category
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
        currentStepNameOverride="experience-subcategory-selection"
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto py-20 pt-32 pb-24">
        <div className="w-full max-w-6xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left side - Question and Subcategories */}
            <div className="space-y-8">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                How would you describe your experience?
              </h1>

              <div className="space-y-3">
                {subcategories.map((subcategory, index) => (
                  <button
                    key={index}
                    onClick={() => handleSubcategorySelect(subcategory)}
                    className={`w-full text-left px-6 py-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                      selectedSubcategory === subcategory
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <span className="text-lg font-medium text-gray-900">{subcategory}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right side - Selected Category Card */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm bg-white border-2 border-gray-200 rounded-xl p-8 shadow-sm">
                <div className="w-32 h-32 mx-auto mb-6 relative">
                  {categoryIcon}
                </div>
                <h2 className="text-2xl font-bold text-center text-gray-900">
                  {categoryDisplayName}
                </h2>
              </div>
            </div>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={selectedSubcategory !== null}
      />
    </div>
  );
};

export default ExperienceSubcategorySelection;

