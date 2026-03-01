import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Plus, ChevronRight, X } from "lucide-react";
import { auth } from "@/lib/firebase";

const ServiceQualifications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  const [experience, setExperience] = useState("");
  const [degree, setDegree] = useState("");
  const [careerHighlight, setCareerHighlight] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Modal states
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showDegreeModal, setShowDegreeModal] = useState(false);
  const [showCareerHighlightModal, setShowCareerHighlightModal] = useState(false);
  
  // Temporary input states for modals
  const [tempExperience, setTempExperience] = useState("");
  const [tempDegree, setTempDegree] = useState("");
  const [tempCareerHighlight, setTempCareerHighlight] = useState("");
  
  const MAX_CHARACTERS = 90;

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("service-qualifications");
    }
  }, [actions]);

  // Get current user for profile picture
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user?.photoURL) {
        setProfilePicture(user.photoURL);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load saved qualifications from draft if available
  useEffect(() => {
    const loadQualifications = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            if (data.serviceExperience) setExperience(data.serviceExperience);
            if (data.serviceDegree) setDegree(data.serviceDegree);
            if (data.serviceCareerHighlight) setCareerHighlight(data.serviceCareerHighlight);
            if (data.serviceProfilePicture) setProfilePicture(data.serviceProfilePicture);
          }
        } catch (error) {
          }
      }
    };
    loadQualifications();
  }, [state.draftId, location.state?.draftId]);

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
          currentStep: "service-qualifications",
          category: "service",
          data: {
            serviceCategory: location.state?.serviceCategory,
            serviceCity: location.state?.serviceCity,
            serviceYearsOfExperience: location.state?.serviceYearsOfExperience,
            serviceExperience: experience,
            serviceDegree: degree,
            serviceCareerHighlight: careerHighlight,
            serviceProfilePicture: profilePicture,
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
          currentStep: "service-qualifications", // Save CURRENT step, not next step
          "data.serviceExperience": experience,
          "data.serviceDegree": degree,
          "data.serviceCareerHighlight": careerHighlight,
          "data.serviceProfilePicture": profilePicture,
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
    try {
      const draftId = await saveServiceData();

      // Update context
      if (actions.setCurrentStep) {
        actions.setCurrentStep("service-online-profiles");
      }

      // Navigate to online profiles page
      navigate("/pages/service-online-profiles", {
        state: {
          draftId,
          category: "service",
          serviceCategory: location.state?.serviceCategory,
          serviceCity: location.state?.serviceCity,
          serviceYearsOfExperience: location.state?.serviceYearsOfExperience,
          serviceExperience: experience,
          serviceDegree: degree,
          serviceCareerHighlight: careerHighlight,
        },
      });
    } catch (error) {
      alert("Failed to save progress. Please try again.");
    }
  };

  const handleBack = () => {
    navigate("/pages/service-years-of-experience", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        serviceCategory: location.state?.serviceCategory,
        serviceCity: location.state?.serviceCity,
      },
    });
  };

  const handleAddExperience = () => {
    setTempExperience(experience);
    setShowExperienceModal(true);
  };

  const handleAddDegree = () => {
    setTempDegree(degree);
    setShowDegreeModal(true);
  };

  const handleAddCareerHighlight = () => {
    setTempCareerHighlight(careerHighlight);
    setShowCareerHighlightModal(true);
  };

  const handleSaveExperience = async () => {
    setExperience(tempExperience);
    setShowExperienceModal(false);
    await saveQualifications(tempExperience, degree, careerHighlight);
  };

  const handleSaveDegree = async () => {
    setDegree(tempDegree);
    setShowDegreeModal(false);
    await saveQualifications(experience, tempDegree, careerHighlight);
  };

  const handleSaveCareerHighlight = async () => {
    setCareerHighlight(tempCareerHighlight);
    setShowCareerHighlightModal(false);
    await saveQualifications(experience, degree, tempCareerHighlight);
  };

  const saveQualifications = async (exp, deg, highlight) => {
    const draftId = state.draftId || location.state?.draftId;
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          "data.serviceExperience": exp !== undefined ? exp : experience,
          "data.serviceDegree": deg !== undefined ? deg : degree,
          "data.serviceCareerHighlight": highlight !== undefined ? highlight : careerHighlight,
          lastModified: new Date(),
        });
      } catch (error) {
        }
    }
  };

  const canProceed = experience.trim().length > 0 || degree.trim().length > 0;

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="service-qualifications"
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto py-20 pt-32 pb-24">
        <div className="w-full max-w-4xl px-6">
          <div className="flex flex-col items-center">
            {/* Profile Picture */}
            <div className="mb-4 flex justify-center">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-primary/80">
                    <span className="text-white text-2xl font-bold">
                      {currentUser?.displayName?.charAt(0) || "U"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 text-center">
              Share your qualifications
            </h1>
            <p className="text-base text-gray-600 mb-8 text-center">
              Help guests get to know you.
            </p>

            {/* Qualification Cards */}
            <div className="w-full space-y-3 max-w-2xl">
              {/* Experience Card */}
              <button
                onClick={handleAddExperience}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-all"
              >
                <div className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center bg-white hover:bg-gray-50">
                  {experience ? (
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                  ) : (
                    <Plus className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-base font-semibold text-gray-900">Experience</h3>
                  <p className="text-sm text-gray-600">
                    {experience ? experience.substring(0, 50) + (experience.length > 50 ? "..." : "") : "Add your most notable job"}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Degree Card */}
              <button
                onClick={handleAddDegree}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-all"
              >
                <div className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center bg-white hover:bg-gray-50">
                  {degree ? (
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                  ) : (
                    <Plus className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-base font-semibold text-gray-900">Degree</h3>
                  <p className="text-sm text-gray-600">
                    {degree ? degree.substring(0, 50) + (degree.length > 50 ? "..." : "") : "Add your degree or training"}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Career Highlight Card */}
              <button
                onClick={handleAddCareerHighlight}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-all"
              >
                <div className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center bg-white hover:bg-gray-50">
                  {careerHighlight ? (
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                  ) : (
                    <Plus className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-base font-semibold text-gray-900">Career highlight (optional)</h3>
                  <p className="text-sm text-gray-600">
                    {careerHighlight ? careerHighlight.substring(0, 50) + (careerHighlight.length > 50 ? "..." : "") : "Add any honors or media features"}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
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

      {/* Experience Modal */}
      {showExperienceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowExperienceModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Add your most notable job</h2>
              <button
                onClick={() => setShowExperienceModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <textarea
                value={tempExperience}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= MAX_CHARACTERS) {
                    setTempExperience(value);
                  }
                }}
                placeholder="I spent 3 years as a staff photographer for SURFER Magazine."
                className="w-full h-32 p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors resize-none"
                autoFocus
              />
              <div className="mt-2 text-sm text-gray-500">
                {tempExperience.length}/{MAX_CHARACTERS} available
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-4">
              <button
                onClick={() => setShowExperienceModal(false)}
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExperience}
                disabled={tempExperience.trim().length === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  tempExperience.trim().length > 0
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Degree Modal */}
      {showDegreeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowDegreeModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Add your degree or training</h2>
              <button
                onClick={() => setShowDegreeModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <textarea
                value={tempDegree}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= MAX_CHARACTERS) {
                    setTempDegree(value);
                  }
                }}
                placeholder="I studied fine art photography at Rhode Island School of Design."
                className="w-full h-32 p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors resize-none"
                autoFocus
              />
              <div className="mt-2 text-sm text-gray-500">
                {tempDegree.length}/{MAX_CHARACTERS} available
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-4">
              <button
                onClick={() => setShowDegreeModal(false)}
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDegree}
                disabled={tempDegree.trim().length === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  tempDegree.trim().length > 0
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Career Highlight Modal */}
      {showCareerHighlightModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowCareerHighlightModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Add any honors or media features</h2>
              <button
                onClick={() => setShowCareerHighlightModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <textarea
                value={tempCareerHighlight}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= MAX_CHARACTERS) {
                    setTempCareerHighlight(value);
                  }
                }}
                placeholder="I received first place in a National Geographic photo contest."
                className="w-full h-32 p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors resize-none"
                autoFocus
              />
              <div className="mt-2 text-sm text-gray-500">
                {tempCareerHighlight.length}/{MAX_CHARACTERS} available
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-4">
              <button
                onClick={() => setShowCareerHighlightModal(false)}
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCareerHighlight}
                disabled={tempCareerHighlight.trim().length === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  tempCareerHighlight.trim().length > 0
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceQualifications;

