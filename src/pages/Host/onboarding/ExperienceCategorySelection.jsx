import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

const experienceCategories = [
  {
    id: "art-and-design",
    name: "Art and design",
    icon: (
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
  },
  {
    id: "fitness-and-wellness",
    name: "Fitness and wellness",
    icon: (
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
  },
  {
    id: "food-and-drink",
    name: "Food and drink",
    icon: (
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
  },
  {
    id: "history-and-culture",
    name: "History and culture",
    icon: (
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
  },
  {
    id: "nature-and-outdoors",
    name: "Nature and outdoors",
    icon: (
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
  },
];

const ExperienceCategorySelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("experience-category-selection");
    }
  }, [actions]);

  // Load selected category from draft if available (when resuming editing)
  useEffect(() => {
    const loadCategory = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const { getDoc } = await import('firebase/firestore');
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            if (data.experienceCategory) {
              setSelectedCategory(data.experienceCategory);
            } else {
              }
          } else {
            }
        } catch (error) {
          }
      } else {
        }
    };
    loadCategory();
  }, [state.draftId, location.state?.draftId]);

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleNext = async () => {
    if (!selectedCategory) return;

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
          currentStep: "experience-category-selection",
          category: "experience",
          data: {
            experienceCategory: selectedCategory,
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
          currentStep: "experience-category-selection", // Save CURRENT step
          "data.experienceCategory": selectedCategory,
          lastModified: new Date(),
        });
        } catch (error) {
        }
    }
    
    // Update context for next step
    if (actions.setCurrentStep) {
      actions.setCurrentStep("experience-subcategory-selection");
    }

    // Navigate to subcategory selection page
    navigate("/pages/experience-subcategory-selection", { 
      state: { 
        draftId: draftId, // Pass the potentially newly created draftId
        category: "experience",
        experienceCategory: selectedCategory
      } 
    });
  };

  const handleBack = () => {
      navigate("/host/listings");
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
            currentStep: "experience-category-selection",
            category: "experience",
            data: {
              experienceCategory: selectedCategory,
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
            currentStep: "experience-category-selection",
            "data.experienceCategory": selectedCategory,
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

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="experience-category-selection"
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto py-20 pt-32 pb-24">
        <div className="w-full max-w-5xl px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-16">
            What experience will you offer guests?
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {experienceCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`flex flex-col items-center p-6 border-2 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                  selectedCategory === category.id
                    ? "border-primary shadow-md bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="w-24 h-24 mb-4 relative">
                  {category.icon}
                </div>
                <span className="text-base font-medium text-center">
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={selectedCategory !== null}
      />
    </div>
  );
};

export default ExperienceCategorySelection;

