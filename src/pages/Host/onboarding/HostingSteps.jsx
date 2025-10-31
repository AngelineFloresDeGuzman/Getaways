import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const steps = [
  {
    title: (
      <>Tell us about your <span className="text-primary">place</span></>
    ),
    description: "Share some basic info, like where it is and how many guests can stay.",
    animationUrl: "https://cdn.lordicon.com/dznelzdk.json",
    animationConfig: {
      trigger: "loop",
      delay: "2000",
      speed: "0.5",
      state: "morph-mantion",
      colors: "primary:#faf9d1,secondary:#109173,tertiary:#b26836,quaternary:#109173,quinary:#646e78,senary:#ebe6ef"
    }
  },
  {
    title: (
      <>Make it <span className="text-primary">stand out</span></>
    ),
    description: "Add 5 or more photos plus a title and description—we'll help you out.",
    animationUrl: "https://cdn.lordicon.com/rhrmfnhf.json",
    animationConfig: {
      trigger: "loop",
      colors: "primary:#121331,secondary:#08a88a"
    }
  },
  {
    title: (
      <>Finish up and <span className="text-primary">publish</span></>
    ),
    description: "Choose a starting price, verify a few details, then publish your listing.",
    animationUrl: "https://cdn.lordicon.com/hrtsficn.json",
    animationConfig: {
      trigger: "loop",
      speed: "0.5",
      colors: "primary:#121331,secondary:#08a88a"
    }
  }
];

const HostingSteps = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);

  // Load lordicon script
  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://cdn.lordicon.com/lordicon.js"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://cdn.lordicon.com/lordicon.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Ensure progress bar shows 0% on HostingSteps
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep('hostingsteps');
    }
  }, [actions]);

  // Create a new draft
  const handleGetStarted = async () => {
    if (!state.user?.uid) return;
    
    // Update context state to propertydetails
    if (actions.setCurrentStep) {
      actions.setCurrentStep('propertydetails');
    }
    
    // Get draftId from multiple sources
    let draftId = state.draftId || location.state?.draftId;
    
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
    
    // If still no draftId, try to get it from user's drafts
    if (!draftId) {
      try {
        const { getUserDrafts } = await import('@/pages/Host/services/draftService');
        const drafts = await getUserDrafts();
        if (drafts.length > 0) {
          draftId = drafts[0].id;
          console.log('HostingSteps: Found draftId from getUserDrafts:', draftId);
        }
      } catch (error) {
        console.error('Error fetching user drafts:', error);
      }
    }
    
    // Always update Firebase if we have a draftId
    if (draftId) {
      const draftRef = doc(db, "onboardingDrafts", draftId);
      try {
        // Check if document exists first
        const { getDoc } = await import('firebase/firestore');
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          // Document exists - update it
          await updateDoc(draftRef, {
            currentStep: "propertydetails",
            lastModified: new Date()
          });
          console.log('HostingSteps: ✅ Updated Firebase currentStep to propertydetails for draftId:', draftId);
        } else {
          // Document does not exist - create it
          await setDoc(draftRef, {
            userId: state.user.uid,
            currentStep: "propertydetails",
            lastModified: new Date(),
            data: {}
          });
          console.log('HostingSteps: ✅ Created new Firebase document with currentStep propertydetails for draftId:', draftId);
        }
      } catch (error) {
        console.error("HostingSteps: Error updating/creating draft:", error);
        // Still navigate even if update fails
      }
      navigate("/pages/propertydetails", { state: { draftId } });
    } else {
      // No draft yet, just navigate to propertydetails (do NOT create new draft)
      console.warn('HostingSteps: No draftId found, navigating without Firebase update');
      navigate("/pages/propertydetails");
    }
  };

  // Cancel: delete created draft document (if any) then go back to dashboard
  const handleCancel = async () => {
    try {
      let draftId = state.draftId;
      if (!draftId || draftId.startsWith('temp_')) {
        try {
          const { getUserDrafts } = await import('@/pages/Host/services/draftService');
          const drafts = await getUserDrafts();
          if (drafts.length > 0) draftId = drafts[0].id;
        } catch (e) {
          // ignore lookup failure
        }
      }
      if (draftId) {
        await deleteDoc(doc(db, 'onboardingDrafts', draftId));
      }
    } catch (e) {
      console.error('Failed to delete draft on cancel:', e);
    } finally {
      navigate('/host/hostdashboard');
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
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Progress bar at top */}
      <OnboardingHeader showProgress={true} currentStepNameOverride="hostingsteps" />

      <div className="flex-1 flex items-center justify-center overflow-hidden py-8 pt-16">
        <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-32 items-center justify-center px-8">
          <div className="flex flex-col justify-center">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-10">
              It's easy to get started on <span className="text-primary">Getaways</span>
            </h1>
          </div>
          <div className="flex flex-col space-y-8">
            {steps.map((step, i) => (
              <div key={i}>
                <div className="flex items-center gap-8 md:gap-10 py-4">
                  <div className="w-14 h-14 flex items-center justify-center rounded-full border-2 border-primary font-bold text-lg text-primary flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl md:text-3xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-lg text-gray-600">{step.description}</p>
                  </div>
                  {step.animationUrl && (
                    <div className="w-24 h-24 md:w-28 md:h-28 flex-shrink-0">
                      <lord-icon
                        src={step.animationUrl}
                        trigger={step.animationConfig.trigger}
                        delay={step.animationConfig.delay}
                        speed={step.animationConfig.speed}
                        state={step.animationConfig.state}
                        colors={step.animationConfig.colors}
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
        <div className="w-full py-4 px-6 flex justify-between items-center">
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="text-primary text-sm transition-all duration-300 hover:opacity-80"
          >
            Cancel
          </button>
          <button
            onClick={handleGetStarted}
            className="bg-primary text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-all duration-300 hover:shadow-lg hover:scale-105"
            style={{ background: 'hsl(var(--primary))', color: 'white' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--primary))'; e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'hsl(var(--primary))'; e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Get Started
          </button>
        </div>
      </footer>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-center mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--primary))' }}>
                <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M6 8V6a4 4 0 118 0v2h1a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V9a1 1 0 011-1h1zm2-2a2 2 0 114 0v2H8V6z"/></svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-center mb-2">Cancel setup?</h3>
            <p className="text-sm text-gray-700 text-center mb-6">This will delete your onboarding draft and all saved data for this setup. This action cannot be undone.</p>
            <div className="flex items-center justify-between gap-3">
              <button
                className="px-4 py-2 rounded-lg text-white text-sm"
                style={{ background: 'hsl(var(--primary))' }}
                onClick={handleCancel}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Delete draft & cancel
              </button>
              <button className="px-4 py-2 rounded-lg border text-sm" onClick={() => setShowCancelConfirm(false)}>Keep editing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostingSteps;
