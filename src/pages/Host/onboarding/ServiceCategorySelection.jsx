import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

const serviceCategories = [
  {
    id: "catering",
    name: "Catering",
    icon: (
      <div className="w-full h-full flex items-center justify-center relative">
        {/* Silver chafing dish with lid */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg shadow-lg">
          {/* Lid slightly ajar */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-br from-gray-300 to-gray-400 rounded-t-lg"></div>
          <div className="absolute top-1 left-1 right-1 h-2 bg-gradient-to-br from-gray-250 to-gray-350 rounded-t"></div>
          {/* Compartments with food */}
          <div className="absolute bottom-1 left-1 right-1 h-8 bg-gradient-to-br from-green-200 to-green-300 rounded-b"></div>
          <div className="absolute bottom-1 left-1 w-1/3 h-8 bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-l"></div>
          <div className="absolute bottom-1 right-1 w-1/3 h-8 bg-gradient-to-br from-orange-200 to-orange-300 rounded-r"></div>
          {/* Serving spoon */}
          <div className="absolute right-0 bottom-4 w-2 h-6 bg-gradient-to-b from-gray-300 to-gray-400 rounded-full transform rotate-12"></div>
          <div className="absolute right-2 bottom-5 w-3 h-3 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full"></div>
        </div>
      </div>
    ),
  },
  {
    id: "chef",
    name: "Chef",
    icon: (
      <div className="w-full h-full flex items-center justify-center relative">
        {/* Wooden cutting board */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-lg shadow-md">
          {/* Wood grain lines */}
          <div className="absolute inset-0 space-y-1">
            <div className="h-0.5 bg-amber-600/30"></div>
            <div className="h-0.5 bg-amber-600/30"></div>
            <div className="h-0.5 bg-amber-600/30"></div>
          </div>
          {/* Carrots */}
          <div className="absolute top-2 left-2 w-1 h-4 bg-gradient-to-b from-orange-400 to-orange-500 rounded-full"></div>
          <div className="absolute top-3 left-4 w-1 h-3 bg-gradient-to-b from-orange-400 to-orange-500 rounded-full"></div>
          <div className="absolute top-2 left-6 w-1 h-4 bg-gradient-to-b from-orange-400 to-orange-500 rounded-full"></div>
          {/* Knife */}
          <div className="absolute right-2 top-1 w-1 h-6 bg-gradient-to-b from-gray-300 to-gray-400 rounded-full"></div>
          <div className="absolute right-2 top-7 w-3 h-1 bg-gradient-to-br from-gray-400 to-gray-500 rounded"></div>
          {/* Peeler */}
          <div className="absolute right-6 top-2 w-1 h-4 bg-gradient-to-b from-gray-400 to-gray-500 rounded-full"></div>
          <div className="absolute right-5 top-6 w-2 h-1 bg-gradient-to-br from-gray-400 to-gray-500 rounded"></div>
        </div>
      </div>
    ),
  },
  {
    id: "hair-styling",
    name: "Hair styling",
    icon: (
      <div className="w-full h-full flex items-center justify-center relative">
        {/* Light blue hairdryer */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-8 bg-gradient-to-br from-sky-200 to-sky-300 rounded-lg shadow-md">
          {/* Handle */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-6 bg-gradient-to-br from-sky-300 to-sky-400 rounded-b-lg"></div>
          {/* Nozzle */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-3 bg-gradient-to-br from-sky-100 to-sky-200 rounded-t-lg"></div>
          {/* Grille */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-gray-400 rounded"></div>
        </div>
        {/* Hairbrush */}
        <div className="absolute right-2 bottom-2 w-8 h-10 bg-gradient-to-br from-pink-200 to-pink-300 rounded-lg shadow-sm">
          {/* Handle */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-4 bg-gradient-to-br from-pink-300 to-pink-400 rounded-t-lg"></div>
          {/* Bristles */}
          <div className="absolute bottom-0 left-1 right-1 h-4">
            <div className="grid grid-cols-4 gap-0.5 h-full">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-gray-400 rounded-t w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "makeup",
    name: "Makeup",
    icon: (
      <div className="w-full h-full flex items-center justify-center relative">
        {/* Makeup brush */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-12 bg-gradient-to-b from-amber-700 to-amber-800 rounded-full shadow-sm">
          {/* Brush tip */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-3 bg-gradient-to-br from-pink-200 to-pink-300 rounded-b-full"></div>
          {/* Bristles */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-2 bg-gradient-to-br from-pink-100 to-pink-200 rounded-b-full"></div>
        </div>
        {/* Red lipstick tube */}
        <div className="absolute right-2 bottom-2 w-6 h-10 bg-gradient-to-br from-red-400 to-red-500 rounded-lg shadow-md">
          {/* Cap */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-br from-red-500 to-red-600 rounded-t-lg"></div>
          {/* Lipstick */}
          <div className="absolute bottom-0 left-1 right-1 h-2 bg-gradient-to-br from-red-600 to-red-700 rounded-b"></div>
        </div>
      </div>
    ),
  },
  {
    id: "massage",
    name: "Massage",
    icon: (
      <div className="w-full h-full flex items-center justify-center relative">
        {/* Black massage table */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg">
          {/* Legs */}
          <div className="absolute bottom-0 left-2 w-1 h-3 bg-gradient-to-b from-gray-700 to-gray-800"></div>
          <div className="absolute bottom-0 right-2 w-1 h-3 bg-gradient-to-b from-gray-700 to-gray-800"></div>
          {/* White towel draped */}
          <div className="absolute top-0 left-2 right-2 h-4 bg-gradient-to-br from-white to-gray-50 rounded-t-lg"></div>
          <div className="absolute top-2 left-4 right-4 h-1 bg-gray-100 rounded"></div>
        </div>
      </div>
    ),
  },
  {
    id: "nails",
    name: "Nails",
    icon: (
      <div className="w-full h-full flex items-center justify-center relative">
        {/* Pink nail polish bottle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 bg-gradient-to-br from-pink-300 to-pink-400 rounded-lg shadow-md">
          {/* Cap */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-br from-pink-400 to-pink-500 rounded-t-lg"></div>
          {/* Brush handle */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-1 h-4 bg-gray-300 rounded"></div>
        </div>
        {/* Dark red nail polish bottle */}
        <div className="absolute right-2 bottom-2 w-5 h-10 bg-gradient-to-br from-red-700 to-red-800 rounded-lg shadow-md">
          {/* Cap */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-br from-red-800 to-red-900 rounded-t-lg"></div>
          {/* Brush handle */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-gray-300 rounded"></div>
        </div>
      </div>
    ),
  },
  {
    id: "personal-training",
    name: "Personal training",
    icon: (
      <div className="w-full h-full flex items-center justify-center relative">
        {/* Black kettlebell */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg">
          {/* Handle */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-4 bg-gradient-to-br from-gray-700 to-gray-800 rounded-t-lg"></div>
          {/* Bell shape */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-b-lg"></div>
          {/* Stopwatch */}
          <div className="absolute right-0 top-6 w-4 h-4 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full">
            <div className="absolute top-1 left-1 right-1 bottom-1 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full"></div>
            <div className="absolute top-1.5 left-1.5 w-0.5 h-1 bg-gray-300 rounded"></div>
            <div className="absolute top-1.5 right-1.5 w-1 h-0.5 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "photography",
    name: "Photography",
    icon: (
      <div className="w-full h-full flex items-center justify-center relative">
        {/* Vintage camera */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-10 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg shadow-lg">
          {/* Lens */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full"></div>
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full"></div>
          {/* Flash */}
          <div className="absolute top-1 right-2 w-2 h-2 bg-gradient-to-br from-gray-300 to-gray-400 rounded"></div>
          {/* Brown strap */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-br from-amber-800 to-amber-900"></div>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-br from-amber-800 to-amber-900"></div>
        </div>
      </div>
    ),
  },
  {
    id: "prepared-meals",
    name: "Prepared meals",
    icon: (
      <div className="w-full h-full flex items-center justify-center relative">
        {/* Wooden bento box */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-lg shadow-md">
          {/* Lid */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-br from-amber-800 to-amber-900 rounded-t-lg"></div>
          {/* Compartments */}
          <div className="absolute bottom-1 left-1 w-1/3 h-6 bg-gradient-to-br from-green-300 to-green-400 rounded"></div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded"></div>
          {/* Grilled chicken */}
          <div className="absolute bottom-2 left-3 w-2 h-1 bg-gradient-to-br from-orange-500 to-orange-600 rounded"></div>
          <div className="absolute bottom-4 left-5 w-2 h-1 bg-gradient-to-br from-orange-500 to-orange-600 rounded"></div>
          {/* Vegetables */}
          <div className="absolute bottom-2 left-9 w-1 h-1 bg-green-500 rounded-full"></div>
          <div className="absolute bottom-3 left-10 w-1 h-1 bg-green-500 rounded-full"></div>
          <div className="absolute bottom-4 left-9 w-1 h-1 bg-green-500 rounded-full"></div>
        </div>
      </div>
    ),
  },
  {
    id: "spa-treatments",
    name: "Spa treatments",
    icon: (
      <div className="w-full h-full flex items-center justify-center relative">
        {/* White rolled towel with pink flower */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-8 bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-sm transform rotate-12">
          {/* Rolled edges */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t"></div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b"></div>
          {/* Pink flower */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-gradient-to-br from-pink-300 to-pink-400 rounded-full"></div>
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-200 rounded-full"></div>
        </div>
        {/* Spa stones */}
        <div className="absolute right-2 bottom-2 w-4 h-3 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full shadow-sm"></div>
        <div className="absolute right-6 bottom-3 w-3 h-2 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full shadow-sm"></div>
        {/* Lit candles */}
        <div className="absolute left-2 bottom-2 w-2 h-4 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full shadow-sm">
          {/* Flame */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full"></div>
        </div>
        <div className="absolute left-6 bottom-2 w-2 h-4 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full shadow-sm">
          {/* Flame */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full"></div>
        </div>
      </div>
    ),
  },
];

const ServiceCategorySelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("service-category-selection");
    }
  }, [actions]);

  // Load selected category from draft if available (when resuming editing)
  useEffect(() => {
    const loadCategory = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists() && draftSnap.data().data?.serviceCategory) {
            setSelectedCategory(draftSnap.data().data.serviceCategory);
          }
        } catch (error) {
          }
      }
    };
    loadCategory();
  }, [state.draftId, location.state?.draftId]);

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const saveServiceData = async () => {
    let draftId = state.draftId || location.state?.draftId;
    
    // If no draftId exists, create a new draft first
    if (!draftId) {
      try {
        const { auth } = await import("@/lib/firebase");
        const currentUser = auth.currentUser;
        if (!currentUser) {
          return null;
        }
        
        const { saveDraft } = await import("@/pages/Host/services/draftService");
        const newDraftData = {
          currentStep: "service-category-selection",
          category: "service",
          data: {
            serviceCategory: selectedCategory,
          }
        };
        draftId = await saveDraft(newDraftData, null);
        // Update state with new draftId
        if (actions?.setDraftId) {
          actions.setDraftId(draftId);
        }
      } catch (error) {
        throw error;
      }
    }
    
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          currentStep: "service-category-selection", // Save CURRENT step, not next step
          "data.serviceCategory": selectedCategory,
          lastModified: new Date(),
        });
        } catch (error) {
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
      alert("Failed to save. Please try again.");
    }
  };

  const handleNext = async () => {
    if (!selectedCategory) return;

    try {
      const draftId = await saveServiceData();
      
      // Update context
      if (actions.setCurrentStep) {
        actions.setCurrentStep("service-location");
      }

      // Navigate to location page
      navigate("/pages/service-location", { 
        state: { 
          draftId,
          category: "service",
          serviceCategory: selectedCategory
        } 
      });
    } catch (error) {
      alert("Failed to save progress. Please try again.");
    }
  };

  const handleBack = () => {
      navigate("/host/listings");
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="service-category-selection"
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto py-20 pt-32 pb-24">
        <div className="w-full max-w-5xl px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-16">
            Which service will you provide?
          </h1>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {serviceCategories.map((category) => (
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

export default ServiceCategorySelection;

