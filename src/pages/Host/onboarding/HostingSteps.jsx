import React from "react";
import { useNavigate } from "react-router-dom";
import OnboardingHeader from "./components/OnboardingHeader";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc } from "firebase/firestore";

const steps = [
  {
    title: "Tell us about your place",
    description: "Share some basic info, like where it is and how many guests can stay.",
    animationUrl: "https://cdn.lordicon.com/dznelzdk.json"
  },
  {
    title: "Make it stand out",
    description: "Add 5 or more photos plus a title and description—we'll help you out.",
    animationUrl: "https://cdn.lordicon.com/rhrmfnhf.json"
  },
  {
    title: "Finish up and publish",
    description: "Choose a starting price, verify a few details, then publish your listing.",
    animationUrl: "https://cdn.lordicon.com/hrtsficn.json"
  }
];

const HostingSteps = () => {
  const navigate = useNavigate();
  const { state } = useOnboarding();

  // Create a new draft
  const handleGetStarted = async () => {
    if (!state.user?.uid) return;
    let draftId = state.draftId;
    // If draftId is a temp value, fetch the user's real draft
    if (draftId && draftId.startsWith('temp_')) {
      try {
        const { getUserDrafts } = await import('@/pages/Host/services/draftService');
        const drafts = await getUserDrafts();
        if (drafts.length > 0) {
          draftId = drafts[0].id;
        } else {
          draftId = null;
        }
      } catch (error) {
        console.error('Error fetching user drafts:', error);
        draftId = null;
      }
    }
    if (draftId) {
      const draftRef = doc(db, "onboardingDrafts", draftId);
      try {
        await updateDoc(draftRef, {
          currentStep: "propertydetails",
          lastModified: new Date()
        });
      } catch (error) {
        // If document does not exist, create it
        if (error.code === 'not-found' || error.message?.includes('No document to update')) {
          await setDoc(draftRef, {
            userId: state.user.uid,
            currentStep: "propertydetails",
            lastModified: new Date(),
            data: {}
          });
        } else {
          console.error("Error updating draft:", error);
        }
      }
      navigate("/pages/propertydetails", { state: { draftId } });
    } else {
      // No draft yet, just navigate to propertydetails (do NOT create new draft)
      navigate("/pages/propertydetails");
    }
  };

  // Save & Exit: only update lastModified, nothing else
  const handleSaveAndExit = async (draftId) => {
    // Update currentStep and lastModified
    if (!draftId) return;
    try {
      const draftRef = doc(db, "onboardingDrafts", draftId);
      await updateDoc(draftRef, {
        currentStep: "propertydetails",
        lastModified: new Date()
      });
      navigate("/host/hostdashboard");
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress bar at top */}
      <OnboardingHeader showProgress={true} currentStep={0} totalSteps={3} />

      <div className="flex-1 flex items-center justify-center">
        <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-52 items-center justify-center">
          <div className="flex flex-col justify-center mt-20">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-10">
              It's easy to get started on Getaways
            </h1>
          </div>
          <div className="flex flex-col space-y-8 mt-20">
            {steps.map((step, i) => (
              <div key={i}>
                <div className="flex items-center gap-6 md:gap-8 py-6">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-primary font-semibold text-primary flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-base text-gray-600">{step.description}</p>
                  </div>
                  {step.animationUrl && (
                    <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
                      <lord-icon
                        src={step.animationUrl}
                        trigger="loop"
                        colors="primary:#121331,secondary:#08a88a"
                        style={{ width: "100%", height: "100%" }}
                      />
                    </div>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className="border-b border-gray-200 mx-2" />
                )}
              </div>
            ))}
          </div>
        </main>
      </div>

      <footer className="bg-white border-t mt-auto">
        <div className="w-full py-6 px-6 md:px-12 flex justify-end items-center">
          <button
            onClick={handleGetStarted}
            className="bg-primary text-white rounded-lg px-8 py-3 font-medium hover:bg-primary-700 transition-colors"
          >
            Get Started
          </button>
        </div>
      </footer>
    </div>
  );
};

export default HostingSteps;
