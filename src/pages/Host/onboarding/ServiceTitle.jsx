import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const ServiceTitle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [title, setTitle] = useState('');
  const [expertise, setExpertise] = useState('');
  const [focusedField, setFocusedField] = useState(null); // 'title' or 'expertise'
  const maxLength = 50;
  const expertiseMaxLength = 90;

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("service-title");
    }
  }, [actions]);

  // Load saved title and expertise from draft if available
  useEffect(() => {
    const loadTitle = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            if (data.serviceTitle) {
              setTitle(data.serviceTitle);
            }
            if (data.serviceExpertise) {
              setExpertise(data.serviceExpertise);
            }
          }
        } catch (error) {
          }
      }
    };
    loadTitle();
  }, [state.draftId, location.state?.draftId]);

  const handleTitleChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setTitle(value);
    }
  };

  const handleExpertiseChange = (e) => {
    const value = e.target.value;
    if (value.length <= expertiseMaxLength) {
      setExpertise(value);
    }
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
          currentStep: "service-title",
          category: "service",
          data: {
            serviceTitle: title,
            serviceExpertise: expertise,
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
          "data.serviceTitle": title,
          "data.serviceExpertise": expertise,
          currentStep: "service-title", // Save CURRENT step, not next step
          lastModified: new Date(),
        });
        } catch (error) {
        throw error;
      }
    }
    
    return draftId;
  };

  const handleNext = async () => {
    try {
      const draftId = await saveServiceData();

      // Update context
      if (actions.setCurrentStep) {
        actions.setCurrentStep("service-offerings");
    }

    // Navigate to next page (create-your-offerings)
    navigate("/pages/create-your-offerings", {
      state: {
        draftId,
        category: "service",
        serviceCategory: location.state?.serviceCategory,
        serviceCity: location.state?.serviceCity,
        serviceYearsOfExperience: location.state?.serviceYearsOfExperience,
        serviceExperience: location.state?.serviceExperience,
        serviceDegree: location.state?.serviceDegree,
        serviceCareerHighlight: location.state?.serviceCareerHighlight,
        serviceProfiles: location.state?.serviceProfiles,
        serviceCountry: location.state?.serviceCountry,
        serviceStreetAddress: location.state?.serviceStreetAddress,
        serviceUnit: location.state?.serviceUnit,
        serviceState: location.state?.serviceState,
        serviceZipCode: location.state?.serviceZipCode,
        serviceTravelToGuests: location.state?.serviceTravelToGuests,
        serviceGuestsComeToYou: location.state?.serviceGuestsComeToYou,
        serviceAreas: location.state?.serviceAreas,
        servicePhotos: location.state?.servicePhotos,
        serviceTitle: title,
        serviceExpertise: expertise,
      },
    });
    } catch (error) {
      alert("Failed to save progress. Please try again.");
    }
  };

  const handleBack = () => {
    navigate("/pages/service-photos", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        serviceCategory: location.state?.serviceCategory,
        serviceCity: location.state?.serviceCity,
        serviceYearsOfExperience: location.state?.serviceYearsOfExperience,
        serviceExperience: location.state?.serviceExperience,
        serviceDegree: location.state?.serviceDegree,
        serviceCareerHighlight: location.state?.serviceCareerHighlight,
        serviceProfiles: location.state?.serviceProfiles,
        serviceCountry: location.state?.serviceCountry,
        serviceStreetAddress: location.state?.serviceStreetAddress,
        serviceUnit: location.state?.serviceUnit,
        serviceState: location.state?.serviceState,
        serviceZipCode: location.state?.serviceZipCode,
        serviceTravelToGuests: location.state?.serviceTravelToGuests,
        serviceGuestsComeToYou: location.state?.serviceGuestsComeToYou,
        serviceAreas: location.state?.serviceAreas,
      },
    });
  };

  const canProceed = title.trim().length > 0 && expertise.trim().length > 0;

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

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="service-title" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">
            {focusedField === 'expertise' 
              ? 'Highlight your expertise' 
              : focusedField === 'title' 
                ? 'Give your service a title'
                : title.trim().length > 0 
                  ? 'Highlight your expertise' 
                  : 'Give your service a title'}
          </h1>

          <div className="space-y-6">
            {/* Title Input - always visible */}
            <div className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                onFocus={() => setFocusedField('title')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your service title"
                className="w-full px-4 py-6 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary transition-colors text-center"
                maxLength={maxLength}
              />
              <div className="text-center text-sm text-gray-500">
                {title.length}/{maxLength} available
              </div>
            </div>

            {/* Expertise Input - shown after title is entered */}
            {title.trim().length > 0 && (
              <div className="space-y-4">
                <textarea
                  value={expertise}
                  onChange={handleExpertiseChange}
                  onFocus={() => setFocusedField('expertise')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Describe what makes your service special..."
                  className="w-full px-4 py-6 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary transition-colors resize-none min-h-[120px]"
                  maxLength={expertiseMaxLength}
                />
                <div className="text-center text-sm text-gray-500">
                  {expertise.length}/{expertiseMaxLength} available
                </div>
              </div>
            )}
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

export default ServiceTitle;

