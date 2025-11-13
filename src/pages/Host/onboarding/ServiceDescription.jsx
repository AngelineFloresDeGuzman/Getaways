import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const ServiceDescription = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [description, setDescription] = useState('');
  const maxLength = 500;

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("service-description");
    }
  }, [actions]);

  // Load saved description from draft if available
  useEffect(() => {
    const loadDescription = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            if (data.serviceDescription) {
              setDescription(data.serviceDescription);
            }
          }
        } catch (error) {
          console.error("Error loading description from draft:", error);
        }
      }
    };
    loadDescription();
  }, [state.draftId, location.state?.draftId]);

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setDescription(value);
    }
  };

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Update context
    if (actions.setCurrentStep) {
      actions.setCurrentStep("service-setup-complete");
    }

    // Update Firebase draft
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          "data.serviceDescription": description,
          currentStep: "service-setup-complete", // Next step
          lastModified: new Date(),
        });
        console.log("✅ Updated service description step in draft");
      } catch (error) {
        console.error("Error updating draft:", error);
      }
    }

    // Navigate to finish setup page (or payment if that's the next step)
    navigate("/pages/finishsetup", {
      state: {
        draftId,
        category: "service",
        ...location.state,
        serviceDescription: description,
      },
    });
  };

  const handleBack = () => {
    navigate("/pages/your-offerings", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        ...location.state,
      },
    });
  };

  const canProceed = description.trim().length > 0;

  // Handle Save & Exit
  const handleSaveAndExit = async () => {
    try {
      const { auth } = await import("@/lib/firebase");
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("Please log in to save your progress.");
        navigate("/login");
        return;
      }

      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          await updateDoc(draftRef, {
            "data.serviceDescription": description,
            currentStep: "service-description", // Save CURRENT step
            lastModified: new Date(),
          });
          console.log("✅ Saved service description to Firebase");
        } catch (error) {
          console.error("Error saving description:", error);
          alert("Failed to save. Please try again.");
          return;
        }
      }
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

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="service-description" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Describe your service
          </h1>
          <p className="text-gray-500 text-center mb-12 text-lg">
            Share what makes your service unique and what guests can expect.
          </p>

          <div className="space-y-4">
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Tell guests about your service, what they'll experience, and why they should book with you..."
              className="w-full px-4 py-6 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary transition-colors resize-none min-h-[200px]"
              maxLength={maxLength}
            />
            <div className="text-center text-sm text-gray-500">
              {description.length}/{maxLength} characters
            </div>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={canProceed}
      />
    </div>
  );
};

export default ServiceDescription;

