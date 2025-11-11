import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ChevronRight, GraduationCap, Sparkles, X, Award } from "lucide-react";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";

const ExperienceQualifications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();

  const [introTitle, setIntroTitle] = useState("");
  const [expertise, setExpertise] = useState("");
  const [recognition, setRecognition] = useState("");
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showExpertiseModal, setShowExpertiseModal] = useState(false);
  const [showRecognitionModal, setShowRecognitionModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mainCategory, setMainCategory] = useState(null);

  const draftId = state.draftId || location.state?.draftId;

  // Category display names
  const categoryDisplayNames = {
    "art-and-design": "art and design",
    "fitness-and-wellness": "fitness and wellness",
    "food-and-drink": "food and drink",
    "history-and-culture": "history and culture",
    "nature-and-outdoors": "nature and outdoors",
  };

  // Load data from draft
  useEffect(() => {
    const loadData = async () => {
      if (!draftId) {
        // Try to get category from location state
        if (location.state?.experienceCategory) {
          setMainCategory(location.state.experienceCategory);
        }
        return;
      }

      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        const draftSnap = await getDoc(draftRef);
        if (draftSnap.exists()) {
          const data = draftSnap.data().data || {};
          
          if (data.introTitle !== undefined) setIntroTitle(data.introTitle || "");
          if (data.expertise !== undefined) setExpertise(data.expertise || "");
          if (data.recognition !== undefined) setRecognition(data.recognition || "");
          
          if (data.experienceCategory) {
            setMainCategory(data.experienceCategory);
          } else if (location.state?.experienceCategory) {
            setMainCategory(location.state.experienceCategory);
          }
        }
      } catch (error) {
        console.error("Error loading qualifications data:", error);
      }
    };
    loadData();
  }, [draftId, location.state?.experienceCategory]);

  // Set current step for progress bar
  useEffect(() => {
    if (actions.setCurrentStep) {
      actions.setCurrentStep("experience-qualifications");
    }
  }, [actions]);

  // Save data to draft
  const saveData = async () => {
    let currentDraftId = draftId;

    // If no draftId exists, try to find an existing experience draft first
    if (!currentDraftId) {
      try {
        const { auth } = await import("@/lib/firebase");
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.warn("⚠️ ExperienceQualifications: User not authenticated, cannot create draft");
          return null;
        }
        
        // Try to find an existing experience draft
        const { getUserDrafts, saveDraft } = await import("@/pages/Host/services/draftService");
        const drafts = await getUserDrafts();
        const experienceDraft = drafts.find(d => 
          d.category === "experience" && 
          (d.currentStep?.startsWith("experience-") || d.data?.experienceCategory)
        );
        
        if (experienceDraft) {
          currentDraftId = experienceDraft.id;
          console.log("✅ ExperienceQualifications: Found existing experience draft:", currentDraftId);
          
          // Update state with found draftId
          if (actions?.setDraftId) {
            actions.setDraftId(currentDraftId);
          }
        } else {
          // No existing draft found, create a new one
          const newDraftData = {
            currentStep: "experience-qualifications",
            category: "experience",
            data: {
              introTitle: introTitle,
              expertise: expertise,
              recognition: recognition,
              experienceCategory: mainCategory || location.state?.experienceCategory || "art-and-design",
            }
          };
          currentDraftId = await saveDraft(newDraftData, null);
          console.log("✅ ExperienceQualifications: Created new draft:", currentDraftId);
          
          // Update state with new draftId
          if (actions?.setDraftId) {
            actions.setDraftId(currentDraftId);
          }
        }
      } catch (error) {
        console.error("❌ ExperienceQualifications: Error creating/finding draft:", error);
        throw error;
      }
    }
    
    if (currentDraftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", currentDraftId);
        await updateDoc(draftRef, {
          currentStep: "experience-qualifications",
          category: "experience",
          "data.introTitle": introTitle,
          "data.expertise": expertise,
          "data.recognition": recognition,
          "data.experienceCategory": mainCategory || location.state?.experienceCategory || "art-and-design",
          lastModified: new Date(),
        });
        console.log("✅ ExperienceQualifications: Saved qualifications data to draft:", currentDraftId);
      } catch (error) {
        console.error("❌ ExperienceQualifications: Error saving qualifications data:", error);
        throw error;
      }
    }
    
    return currentDraftId;
  };

  const handleSaveIntro = async () => {
    await saveData();
    setShowIntroModal(false);
  };

  const handleSaveExpertise = async () => {
    await saveData();
    setShowExpertiseModal(false);
  };

  const handleSaveRecognition = async () => {
    await saveData();
    setShowRecognitionModal(false);
  };

  const handleNext = async () => {
    if (!introTitle.trim() || expertise.trim().length < 150) {
      return;
    }

    setIsLoading(true);
    try {
      const savedDraftId = await saveData();
      const finalDraftId = savedDraftId || draftId;
      
      // Navigate to experience-details with step 3 (online profiles)
      navigate("/pages/experience-details", {
        state: {
          draftId: finalDraftId,
          experienceCategory: mainCategory || location.state?.experienceCategory,
          experienceSubcategory: location.state?.experienceSubcategory,
          experienceCity: location.state?.experienceCity,
          currentStepNumber: 3, // Step 3 is online profiles
        },
      });
    } catch (error) {
      console.error("Error in handleNext:", error);
      alert("Failed to save progress. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/pages/experience-years-of-experience", {
      state: {
        draftId,
        experienceCategory: mainCategory || location.state?.experienceCategory,
      },
    });
  };

  const handleSaveAndExit = async () => {
    try {
      const savedDraftId = await saveData();
      const finalDraftId = savedDraftId || draftId;
      
      navigate("/host/listings", {
        state: {
          draftId: finalDraftId,
          scrollToDrafts: true,
          message: "Draft saved successfully!",
        },
      });
    } catch (error) {
      console.error("❌ Error saving and exiting:", error);
      alert("Failed to save. Please try again.");
    }
  };

  const canProceed = introTitle.trim().length > 0 && expertise.trim().length >= 150;

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader
        showProgress={true}
        currentStepNameOverride="experience-qualifications"
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 overflow-y-auto px-8 py-12 pt-32">
        <div className="max-w-4xl mx-auto w-full">
          {/* Circular Image */}
          <div className="mb-2 flex justify-center">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
              <img
                src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 text-center">
            Share your qualifications
          </h1>
          <p className="text-base text-gray-600 mb-4 text-center">
            Help guests get to know you.
          </p>

          {/* Cards */}
          <div className="space-y-2">
            {/* Intro Card */}
            <button
              onClick={() => setShowIntroModal(true)}
              className="w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    introTitle ? "bg-gray-200" : "bg-gray-100"
                  }`}
                >
                  {introTitle ? (
                    <GraduationCap className="w-4 h-4 text-gray-900" />
                  ) : (
                    <GraduationCap className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-base font-semibold text-gray-900">Intro</h3>
                  {introTitle ? (
                    <p className="text-xs text-gray-600 mt-0.5 truncate">{introTitle}</p>
                  ) : (
                    <p className="text-xs text-gray-500">Give yourself a title</p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>

            {/* Expertise Card */}
            <button
              onClick={() => setShowExpertiseModal(true)}
              className="w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    expertise ? "bg-gray-200" : "bg-gray-100"
                  }`}
                >
                  {expertise ? (
                    <Sparkles className="w-4 h-4 text-gray-900" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-base font-semibold text-gray-900">Expertise</h3>
                  {expertise ? (
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{expertise}</p>
                  ) : (
                    <p className="text-xs text-gray-500">Showcase your experience</p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>

            {/* Recognition Card */}
            <button
              onClick={() => setShowRecognitionModal(true)}
              className="w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    recognition ? "bg-gray-200" : "bg-gray-100"
                  }`}
                >
                  {recognition ? (
                    <Award className="w-4 h-4 text-gray-900" />
                  ) : (
                    <Award className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-base font-semibold text-gray-900">Recognition (optional)</h3>
                  {recognition ? (
                    <p className="text-xs text-gray-600 mt-0.5">{recognition}</p>
                  ) : (
                    <p className="text-xs text-gray-500">Add a career highlight</p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>
          </div>

          {/* Get tips link */}
          <div className="mt-2 flex justify-start">
            <button className="text-gray-600 hover:text-gray-900 transition-colors text-xs">
              Get tips
            </button>
          </div>
        </div>

        {/* Intro Modal */}
        {showIntroModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowIntroModal(false)}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Give yourself a title</h2>
                <button
                  onClick={() => setShowIntroModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <input
                  type="text"
                  value={introTitle}
                  onChange={(e) => setIntroTitle(e.target.value)}
                  placeholder="Enter your title"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg"
                  maxLength={40}
                />
                <p className="text-sm text-gray-500 mt-2">{introTitle.length}/40 available</p>
              </div>
              <div className="p-6 border-t flex items-center justify-between">
                <button
                  onClick={() => setShowIntroModal(false)}
                  className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
                >
                  Get tips
                </button>
                <button
                  onClick={handleSaveIntro}
                  className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expertise Modal */}
        {showExpertiseModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowExpertiseModal(false)}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Showcase your experience</h2>
                <button
                  onClick={() => setShowExpertiseModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <textarea
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  placeholder="Describe your experience..."
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg resize-none"
                />
                <p
                  className={`text-sm mt-2 ${
                    expertise.length < 150 ? "text-gray-500" : "text-red-500"
                  }`}
                >
                  {expertise.length}/150 required characters
                </p>
              </div>
              <div className="p-6 border-t flex items-center justify-between">
                <button
                  onClick={() => setShowExpertiseModal(false)}
                  className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
                >
                  Get tips
                </button>
                <button
                  onClick={handleSaveExpertise}
                  className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recognition Modal */}
        {showRecognitionModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowRecognitionModal(false)}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Add a career highlight</h2>
                <button
                  onClick={() => setShowRecognitionModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <input
                  type="text"
                  value={recognition}
                  onChange={(e) => setRecognition(e.target.value)}
                  placeholder="Featured in W Magazine"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg"
                  maxLength={90}
                />
                <p className="text-sm text-gray-500 mt-2">{recognition.length}/90 available</p>
              </div>
              <div className="p-6 border-t flex items-center justify-between">
                <button
                  onClick={() => setShowRecognitionModal(false)}
                  className="px-6 py-2.5 text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRecognition}
                  disabled={!recognition.trim()}
                  className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={canProceed}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ExperienceQualifications;

