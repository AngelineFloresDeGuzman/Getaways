import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Facebook, Instagram, X } from "lucide-react";

const ServiceOnlineProfiles = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  const [profiles, setProfiles] = useState([]);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [profileUrl, setProfileUrl] = useState("");

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("service-online-profiles");
    }
  }, [actions]);

  // Load saved profiles from draft if available
  useEffect(() => {
    const loadProfiles = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists() && draftSnap.data().data?.serviceProfiles) {
            setProfiles(draftSnap.data().data.serviceProfiles);
          }
        } catch (error) {
          console.error("Error loading profiles from draft:", error);
        }
      }
    };
    loadProfiles();
  }, [state.draftId, location.state?.draftId]);

  // Social media platforms
  const socialPlatforms = [
    { id: "facebook", name: "Facebook", icon: Facebook, color: "bg-blue-600" },
    { id: "instagram", name: "Instagram", icon: Instagram, color: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600" },
    { id: "tiktok", name: "TikTok", icon: null, color: "bg-black" },
  ];

  // Get platform icon component
  const getPlatformIcon = (platformId) => {
    const platform = socialPlatforms.find((p) => p.id === platformId);
    if (!platform) return null;
    if (platform.icon) {
      const Icon = platform.icon;
      return <Icon className="w-8 h-8 text-white" />;
    }
    // TikTok custom icon
    if (platformId === "tiktok") {
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
          <path
            d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
            fill="white"
          />
        </svg>
      );
    }
    return null;
  };

  const handleAddProfile = async () => {
    if (selectedPlatform && profileUrl.trim()) {
      const newProfile = {
        platform: selectedPlatform,
        url: profileUrl.trim(),
        id: Date.now().toString(),
      };
      const updatedProfiles = [...profiles, newProfile];
      setProfiles(updatedProfiles);
      setSelectedPlatform("");
      setProfileUrl("");
      setShowAddProfileModal(false);
      
      // Save to draft
      await saveProfiles(updatedProfiles);
    }
  };

  const handleRemoveProfile = async (profileId) => {
    const updatedProfiles = profiles.filter((p) => p.id !== profileId);
    setProfiles(updatedProfiles);
    await saveProfiles(updatedProfiles);
  };

  const saveProfiles = async (profilesToSave) => {
    const draftId = state.draftId || location.state?.draftId;
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          "data.serviceProfiles": profilesToSave,
          lastModified: new Date(),
        });
        console.log("✅ Updated service profiles in draft");
      } catch (error) {
        console.error("Error saving profiles:", error);
      }
    }
  };

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Update context
    if (actions.setCurrentStep) {
      actions.setCurrentStep("service-address");
    }

    // Update Firebase draft
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          currentStep: "service-address",
          lastModified: new Date(),
        });
        console.log("✅ Updated service online profiles step in draft");
      } catch (error) {
        console.error("Error updating draft:", error);
      }
    }

    // Navigate to address page
    navigate("/pages/service-address", {
      state: {
        draftId,
        category: "service",
        serviceCategory: location.state?.serviceCategory,
        serviceCity: location.state?.serviceCity,
        serviceYearsOfExperience: location.state?.serviceYearsOfExperience,
        serviceExperience: location.state?.serviceExperience,
        serviceDegree: location.state?.serviceDegree,
        serviceCareerHighlight: location.state?.serviceCareerHighlight,
        serviceProfiles: profiles,
      },
    });
  };

  const handleSkip = async () => {
    // Same as handleNext but skips adding profiles
    await handleNext();
  };

  const handleBack = () => {
    navigate("/pages/service-qualifications", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        serviceCategory: location.state?.serviceCategory,
        serviceCity: location.state?.serviceCity,
        serviceYearsOfExperience: location.state?.serviceYearsOfExperience,
      },
    });
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader showProgress={true} currentStepNameOverride="service-online-profiles" />

      <main className="flex-1 flex items-center justify-center overflow-y-auto py-20 pt-32 pb-24">
        <div className="w-full max-w-4xl px-6">
          <div className="flex flex-col items-center">
            {/* Heading */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-center">
              Add your online profiles
            </h1>
            <p className="text-base text-gray-600 mb-8 text-center max-w-2xl">
              We'll review your profiles and may suggest content and photos to improve your listing. Guests won't see these links.
            </p>

            {/* Social Media Cards Stack */}
            {profiles.length > 0 && (
              <div className="flex justify-center gap-4 mb-8 flex-wrap relative">
                {profiles.map((profile, index) => {
                  const platform = socialPlatforms.find((p) => p.id === profile.platform);
                  return (
                    <div
                      key={profile.id}
                      className="relative group"
                      style={{
                        transform: `rotate(${(index - Math.floor(profiles.length / 2)) * 8}deg)`,
                        zIndex: profiles.length - index,
                      }}
                    >
                      <div className={`w-20 h-20 rounded-lg ${platform?.color || "bg-gray-200"} flex items-center justify-center shadow-lg`}>
                        {getPlatformIcon(profile.platform)}
                      </div>
                      <button
                        onClick={() => handleRemoveProfile(profile.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  );
                })}
                {/* Empty cards underneath for visual effect */}
                {profiles.length < 3 && (
                  <>
                    {[...Array(3 - profiles.length)].map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="w-20 h-20 rounded-lg bg-white border-2 border-gray-200"
                        style={{
                          transform: `rotate(${((profiles.length + i) - Math.floor(3 / 2)) * 8}deg)`,
                          zIndex: 1,
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Add Profile Button */}
            <button
              onClick={() => setShowAddProfileModal(true)}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors mb-8"
            >
              Add profile
            </button>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={null}
        onNext={handleNext}
        onSkip={handleSkip}
        backText=""
        nextText="Next"
        skipText="Skip"
        canProceed={profiles.length > 0}
      />

      {/* Add Profile Modal */}
      {showAddProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowAddProfileModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Add profile</h2>
              <button
                onClick={() => setShowAddProfileModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select platform
              </label>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {socialPlatforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedPlatform === platform.id
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`w-12 h-12 ${platform.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                      {getPlatformIcon(platform.id)}
                    </div>
                    <p className="text-xs text-gray-600">{platform.name}</p>
                  </button>
                ))}
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile URL
              </label>
              <input
                type="url"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg"
              />
            </div>
            <div className="p-6 border-t flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddProfileModal(false)}
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProfile}
                disabled={!selectedPlatform || !profileUrl.trim()}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  selectedPlatform && profileUrl.trim()
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOnlineProfiles;

