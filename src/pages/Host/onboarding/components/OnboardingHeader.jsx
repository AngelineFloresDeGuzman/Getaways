import React from "react";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";

const OnboardingHeader = ({ showProgress = true, currentStep = 1, totalSteps = 3 }) => {
  const navigate = useNavigate();
  let contextData;
  try {
    contextData = useOnboarding();
  } catch (error) {
    console.error("❌ OnboardingContext error:", error);
    contextData = {
      state: { isLoading: false },
      actions: { saveAndExit: () => Promise.reject(new Error("Context not available")) },
    };
  }
  const { state, actions } = contextData;
  const handleSaveAndExit = async () => {
    const { auth } = await import("@/lib/firebase");
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("Please log in to save your progress.");
      navigate("/login");
      return;
    }
    try {
      await actions.saveAndExit();
      console.log("✅ Save and exit completed successfully!");
    } catch (error) {
      alert("Failed to save draft: " + error.message);
    }
  };
  return (
    <>
      {/* Header with progress line at bottom */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b shadow-sm pt-6">
        <div className="py-4 px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/host/hostdashboard')}>
            <img src="/logo.jpg" alt="Getaways" className="h-10 w-10" />
            <span className="font-bold text-xl md:text-2xl text-primary">Getaways</span>
          </div>
          <div className="flex items-center gap-6">
            <button className="border-2 border-primary text-primary text-sm font-medium px-8 py-3 rounded-lg transition-colors hover:bg-primary-600 hover:text-white hover:border-primary-600">Questions?</button>
            <button
              onClick={handleSaveAndExit}
              className="border-2 border-primary text-primary text-sm font-medium px-8 py-3 rounded-lg transition-colors hover:bg-primary-600 hover:text-white hover:border-primary-600"
              disabled={state.isLoading}
            >
              {state.isLoading ? "Saving..." : "Save & Exit"}
            </button>
          </div>
        </div>
        {/* Progress line flush with bottom */}
        {showProgress && <StepProgress currentStep={currentStep} totalSteps={totalSteps} />}
      </header>
      {/* Step labels directly below header */}
      {showProgress && <StepLabels />}
    </>
  );
};

export default OnboardingHeader;

// StepProgress component
const StepProgress = ({ currentStep = 1, totalSteps = 3 }) => {
  // Render three separated segments with gaps
  return (
    <div className="w-full flex items-center justify-between gap-2 px-0 py-0" style={{marginTop: 0, marginBottom: 0}}>
      <div className="flex-1 h-1 bg-gray-200" />
      <div className="flex-1 h-1 bg-gray-200" />
      <div className="flex-1 h-1 bg-gray-200" />
    </div>
  );
}

const StepLabels = () => (
  <div className="w-full flex justify-between text-xs text-gray-400 mt-1 px-2">
    <span>Step 1</span>
    <span>Step 2</span>
    <span>Step 3</span>
  </div>
);
