import React from "react";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";

// StepProgress component
const StepProgress = ({ currentStep = 1, totalSteps = 3 }) => {
  return (
    <div className="flex justify-between items-center max-w-5xl mx-auto mt-32 relative px-6 md:px-12">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;

        return (
          <div key={i} className="flex-1 flex items-center relative">
            {/* Step Circle */}
            <div className="flex flex-col items-center w-16">
              <div
                className={`w-16 h-16 rounded-full border-4 flex items-center justify-center
                  transition-all duration-300 ease-in-out
                  ${isCompleted ? "bg-green-500 border-green-500 text-white" : ""}
                  ${isActive ? "border-primary text-primary font-bold shadow-lg scale-110" : "bg-white border-gray-300 text-gray-400 hover:scale-105"}`}
              >
                {isCompleted ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span className="text-sm text-center mt-3 font-medium">{`Step ${step}`}</span>
            </div>

            {/* Step Line */}
            {step < totalSteps && (
              <div className="flex-1 h-1 mt-8 relative">
                <div className="absolute top-0 left-0 h-1 w-full rounded-full bg-gray-300" />
                <div
                  className="absolute top-0 left-0 h-1 rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// OnboardingHeader component
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b shadow-sm">
        <div className="py-4 px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Getaways" className="h-8" />
            <span className="font-bold text-lg text-primary">Getaways</span>
          </div>
          <div className="flex items-center gap-6">
            <button className="hover:text-primary transition-colors text-sm font-medium">Questions?</button>
            <button
              onClick={handleSaveAndExit}
              className="hover:text-primary transition-colors text-sm font-medium"
              disabled={state.isLoading}
            >
              {state.isLoading ? "Saving..." : "Save & Exit"}
            </button>
          </div>
        </div>
      </header>

      {/* Step Progress */}
      {showProgress && <StepProgress currentStep={currentStep} totalSteps={totalSteps} />}
    </>
  );
};

export default OnboardingHeader;
