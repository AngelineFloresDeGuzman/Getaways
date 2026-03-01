import React, { useState, useEffect } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const ExperienceYearsOfExperience = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();

  const [isLoading, setIsLoading] = useState(false);
  const [yearsOfExperience, setYearsOfExperience] = useState(10);
  const [mainCategory, setMainCategory] = useState(null);

  // Category display names
  const categoryDisplayNames = {
    "art-and-design": "art and design",
    "fitness-and-wellness": "fitness and wellness",
    "food-and-drink": "food and drink",
    "history-and-culture": "history and culture",
    "nature-and-outdoors": "nature and outdoors",
  };

  const categoryName = mainCategory ? categoryDisplayNames[mainCategory] || mainCategory : "";

  let draftId = location.state?.draftId || state.draftId;

  // Load data from Firebase on mount
  useEffect(() => {
    const loadData = async () => {
      if (!draftId) return;

      try {
        const draftRef = doc(db, 'onboardingDrafts', draftId);
        const draftSnap = await getDoc(draftRef);
        
        if (draftSnap.exists()) {
          const data = draftSnap.data().data || {};
          
          // Load main category
          if (data.experienceCategory) {
            setMainCategory(data.experienceCategory);
          } else if (location.state?.experienceCategory) {
            setMainCategory(location.state.experienceCategory);
          }
          
          // Load years of experience
          if (data.yearsOfExperience !== undefined && data.yearsOfExperience !== null) {
            setYearsOfExperience(data.yearsOfExperience);
          }
        }
      } catch (error) {
        }
    };

    loadData();
  }, [draftId, location.state?.experienceCategory]);

  // Set current step for progress bar
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'experience-years-of-experience') {
      actions.setCurrentStep('experience-years-of-experience');
    }
  }, [actions, state.currentStep]);

  const handleDecrement = () => {
    if (yearsOfExperience > 0) {
      setYearsOfExperience(yearsOfExperience - 1);
    }
  };

  const handleIncrement = () => {
    setYearsOfExperience(yearsOfExperience + 1);
  };

  const saveData = async () => {
    if (!draftId) {
      // Try to find or create draft
      try {
        const { getUserDrafts, saveDraft } = await import('@/pages/Host/services/draftService');
        const drafts = await getUserDrafts();
        const experienceDraft = drafts.find(d => 
          d.category === "experience" && 
          (d.currentStep?.startsWith("experience-") || d.data?.experienceCategory)
        );
        
        if (experienceDraft) {
          draftId = experienceDraft.id;
        } else {
          const newDraftData = {
            currentStep: "experience-years-of-experience",
            category: "experience",
            data: {
              experienceCategory: mainCategory || location.state?.experienceCategory || "art-and-design",
              yearsOfExperience: yearsOfExperience,
            }
          };
          draftId = await saveDraft(newDraftData, null);
        }
        
        if (actions.setDraftId) {
          actions.setDraftId(draftId);
        }
      } catch (error) {
        return;
      }
    }

    if (draftId && !draftId.startsWith('temp_')) {
      try {
        const draftRef = doc(db, 'onboardingDrafts', draftId);
        await updateDoc(draftRef, {
          'data.yearsOfExperience': yearsOfExperience,
          'data.experienceCategory': mainCategory || location.state?.experienceCategory || "art-and-design",
          currentStep: 'experience-years-of-experience',
          category: 'experience',
          lastModified: new Date(),
        });
      } catch (error) {
        }
    }
  };

  const handleNext = async () => {
    setIsLoading(true);
    try {
      await saveData();
      // Navigate to experience-qualifications (separate page for step 2)
      navigate('/pages/experience-qualifications', {
        state: {
          draftId,
          experienceCategory: mainCategory || location.state?.experienceCategory,
          experienceSubcategory: location.state?.experienceSubcategory,
          experienceCity: location.state?.experienceCity,
        }
      });
    } catch (error) {
      // Navigate even on error
      navigate('/pages/experience-qualifications', {
        state: {
          draftId,
          experienceCategory: mainCategory || location.state?.experienceCategory,
          experienceSubcategory: location.state?.experienceSubcategory,
          experienceCity: location.state?.experienceCity,
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/pages/experience-listing-summary', {
      state: {
        draftId,
        experienceCategory: mainCategory || location.state?.experienceCategory,
      }
    });
  };

  const handleSaveAndExit = async () => {
    if (!auth.currentUser) {
      alert('Please log in to save your progress');
      return;
    }
    
    setIsLoading(true);
    try {
      await saveData();
      navigate('/host/listings', {
        state: {
          draftId,
          scrollToDrafts: true,
        }
      });
    } catch (error) {
      navigate('/host/listings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="experience-years-of-experience"
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 text-center">
            How many years have you worked in {categoryName || "this field"}?
          </h1>
          <div className="flex items-center gap-8">
            <button
              onClick={handleDecrement}
              className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={yearsOfExperience === 0}
            >
              <span className="text-2xl font-light text-gray-600">−</span>
            </button>
            <div className="text-6xl md:text-7xl font-bold text-gray-900 min-w-[120px] text-center">
              {yearsOfExperience}
            </div>
            <button
              onClick={handleIncrement}
              className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
            >
              <span className="text-2xl font-light text-gray-600">+</span>
            </button>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        canProceed={true}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ExperienceYearsOfExperience;

