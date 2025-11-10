import React from "react";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { User, MapPin, Image, BookOpen, Camera, Trash2, Building, Users, DollarSign, Briefcase, Award, Phone, Mail } from "lucide-react";

const OnboardingHeader = ({ showProgress = true, currentStepNameOverride, experienceCurrentStep, onExperienceStepChange, serviceCurrentStep, onServiceStepChange, customSaveAndExit }) => {
  const navigate = useNavigate();
  let contextData;
  try {
    contextData = useOnboarding();
  } catch (error) {
    console.error("❌ OnboardingContext error:", error);
    contextData = {
      state: { isLoading: false, currentStep: 'hostingsteps' },
      actions: { saveAndExit: () => Promise.reject(new Error("Context not available")) },
    };
  }
  const { state, actions } = contextData;

  // Check if this is an experience details page (with sidebar layout)
  const isExperienceDetails = currentStepNameOverride === 'experience-details' || state.currentStep === 'experience-details';
  
  // Check if this is a service details page (with sidebar layout)
  const isServiceDetails = currentStepNameOverride === 'service-details' || state.currentStep === 'service-details';
  
  // Debug: Log if customSaveAndExit is provided
  if (isExperienceDetails && customSaveAndExit) {
    console.log("✅ Custom save handler detected for experience details");
  } else if (isExperienceDetails && !customSaveAndExit) {
    console.warn("⚠️ Experience details page but no custom save handler provided");
  }
  
  if (isServiceDetails && customSaveAndExit) {
    console.log("✅ Custom save handler detected for service details");
  } else if (isServiceDetails && !customSaveAndExit) {
    console.warn("⚠️ Service details page but no custom save handler provided");
  }
  
  // Experience sidebar steps
  const experienceSteps = [
    { id: 1, label: "About you", icon: User },
    { id: 2, label: "Location", icon: MapPin },
    { id: 3, label: "Photos", icon: Image },
    { id: 4, label: "Description", icon: BookOpen },
    { id: 5, label: "Camera", icon: Camera },
    { id: 6, label: "Trash", icon: Trash2 },
    { id: 7, label: "Building", icon: Building },
    { id: 8, label: "Guests", icon: Users },
    { id: 9, label: "Price", icon: DollarSign },
    { id: 10, label: "Private", icon: DollarSign },
    { id: 11, label: "Review", icon: BookOpen },
    { id: 12, label: "Discounts", icon: DollarSign },
    { id: 13, label: "Legal", icon: BookOpen },
    { id: 14, label: "Title", icon: BookOpen },
    { id: 15, label: "Create", icon: BookOpen },
    { id: 16, label: "Submit", icon: BookOpen },
  ];

  // Service sidebar steps
  const serviceSteps = [
    { id: 1, label: "About you", icon: User },
    { id: 2, label: "Location", icon: MapPin },
    { id: 3, label: "Photos", icon: Image },
    { id: 4, label: "Description", icon: BookOpen },
    { id: 5, label: "Portfolio", icon: Briefcase },
    { id: 6, label: "Credentials", icon: Award },
    { id: 7, label: "Contact", icon: Phone },
    { id: 8, label: "Email", icon: Mail },
    { id: 9, label: "Price", icon: DollarSign },
    { id: 10, label: "Availability", icon: Building },
    { id: 11, label: "Review", icon: BookOpen },
    { id: 12, label: "Discounts", icon: DollarSign },
    { id: 13, label: "Terms", icon: BookOpen },
    { id: 14, label: "Title", icon: BookOpen },
    { id: 15, label: "Create", icon: BookOpen },
    { id: 16, label: "Submit", icon: BookOpen },
  ];

  // Add animated water effect styles
  React.useEffect(() => {
    const styleId = 'progress-water-animation';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes waterFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .progress-water {
          background-size: 200% 100%;
          animation: waterFlow 3s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
  
  const handleSaveAndExit = async () => {
    const { auth } = await import("@/lib/firebase");
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("Please log in to save your progress.");
      navigate("/login");
      return;
    }
    try {
      // For experience details, always use custom handler if provided
      if (isExperienceDetails && customSaveAndExit) {
        console.log("✅ Using custom save handler for experience details");
        await customSaveAndExit();
        return; // Don't execute context handler after custom handler
      }
      
      // For service details, always use custom handler if provided
      if (isServiceDetails && customSaveAndExit) {
        console.log("✅ Using custom save handler for service details");
        await customSaveAndExit();
        return; // Don't execute context handler after custom handler
      }
      
      // Use custom save handler if provided (for other cases), otherwise use context handler
      if (customSaveAndExit) {
        console.log("✅ Using custom save handler");
        await customSaveAndExit();
        return; // Don't execute context handler after custom handler
      }
      
      // Default: use context handler for accommodation onboarding
      console.log("Using context save handler");
      await actions.saveAndExit();
      console.log("✅ Save and exit completed successfully!");
    } catch (error) {
      console.error("Error in handleSaveAndExit:", error);
      alert("Failed to save draft: " + error.message);
    }
  };

  // If this is experience details page, render header with horizontal navbar instead of progress bar
  if (isExperienceDetails) {
    const currentStep = experienceCurrentStep || 1;

    return (
      <>
        {/* Header with horizontal navbar */}
        <header className="fixed top-0 left-0 right-0 bg-white z-50 shadow-sm pt-2 relative overflow-visible border-b border-gray-200">
          <div className="py-2 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/host/listings')}>
              <img src="/logo.jpg" alt="Getaways" className="h-8 w-8" />
              <span className="font-bold text-lg md:text-xl text-primary">Getaways</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveAndExit}
                className="border border-primary text-primary text-xs font-medium px-4 py-1.5 rounded-md transition-all duration-300 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'white' }}
                onMouseEnter={(e) => { if (!state.isLoading) { e.currentTarget.style.background = 'hsl(var(--primary))'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'scale(1.05)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'hsl(var(--primary))'; e.currentTarget.style.transform = 'scale(1)'; }}
                disabled={state.isLoading}
              >
                {state.isLoading ? "Saving..." : "Save & Exit"}
              </button>
            </div>
          </div>
          {/* Step Circles at Bottom - Half extends below border */}
          <div className="w-full bg-white px-6 flex items-end justify-center relative" style={{ height: '4px', paddingTop: '0', paddingBottom: '0' }}>
            {/* Step Icons - Centered */}
            <div className="flex items-center gap-4" style={{ bottom: '0', transform: 'translateY(50%)' }}>
              {experienceSteps.map((step) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                return (
                  <button
                    key={step.id}
                    onClick={() => onExperienceStepChange && onExperienceStepChange(step.id)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors relative z-10 ${
                      isActive
                        ? "bg-primary text-white"
                        : isCompleted
                        ? "bg-gray-200 text-gray-600"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                    title={step.label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </header>
      </>
    );
  }

  // If this is service details page, render header with horizontal navbar instead of progress bar
  if (isServiceDetails) {
    const currentStep = serviceCurrentStep || 1;

    return (
      <>
        {/* Header with horizontal navbar */}
        <header className="fixed top-0 left-0 right-0 bg-white z-50 shadow-sm pt-2 relative overflow-visible border-b border-gray-200">
          <div className="py-2 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/host/listings')}>
              <img src="/logo.jpg" alt="Getaways" className="h-8 w-8" />
              <span className="font-bold text-lg md:text-xl text-primary">Getaways</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveAndExit}
                className="border border-primary text-primary text-xs font-medium px-4 py-1.5 rounded-md transition-all duration-300 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'white' }}
                onMouseEnter={(e) => { if (!state.isLoading) { e.currentTarget.style.background = 'hsl(var(--primary))'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'scale(1.05)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'hsl(var(--primary))'; e.currentTarget.style.transform = 'scale(1)'; }}
                disabled={state.isLoading}
              >
                {state.isLoading ? "Saving..." : "Save & Exit"}
              </button>
            </div>
          </div>
          {/* Step Circles at Bottom - Half extends below border */}
          <div className="w-full bg-white px-6 flex items-end justify-center relative" style={{ height: '4px', paddingTop: '0', paddingBottom: '0' }}>
            {/* Step Icons - Centered */}
            <div className="flex items-center gap-4" style={{ bottom: '0', transform: 'translateY(50%)' }}>
              {serviceSteps.map((step) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                return (
                  <button
                    key={step.id}
                    onClick={() => onServiceStepChange && onServiceStepChange(step.id)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors relative z-10 ${
                      isActive
                        ? "bg-primary text-white"
                        : isCompleted
                        ? "bg-gray-200 text-gray-600"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                    title={step.label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </header>
      </>
    );
  }

  // Regular header for accommodations (unchanged)
  return (
    <>
      {/* Header with progress line at bottom */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b shadow-sm pt-2">
        <div className="py-2 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/host/listings')}>
            <img src="/logo.jpg" alt="Getaways" className="h-8 w-8" />
            <span className="font-bold text-lg md:text-xl text-primary">Getaways</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSaveAndExit}
              className="border border-primary text-primary text-xs font-medium px-4 py-1.5 rounded-md transition-all duration-300 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'white' }}
              onMouseEnter={(e) => { if (!state.isLoading) { e.currentTarget.style.background = 'hsl(var(--primary))'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'scale(1.05)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'hsl(var(--primary))'; e.currentTarget.style.transform = 'scale(1)'; }}
              disabled={state.isLoading}
            >
              {state.isLoading ? "Saving..." : "Save & Exit"}
            </button>
          </div>
        </div>
        {/* Progress line flush with bottom */}
        {showProgress && <StepProgress currentStepName={currentStepNameOverride || state.currentStep} />}
      </header>
      {/* Step labels directly below header */}
      {showProgress && <StepLabels />}
    </>
  );
};

export default OnboardingHeader;

// StepProgress component
const StepProgress = ({ currentStepName = 'hostingsteps' }) => {
  // Define the 3 main steps with their respective pages
  // Note: 'bathroomtypes' and 'occupancy' are part of Step 1 (only appear when privacyType === 'A room')
  const stepGroups = {
    1: ['hostingsteps', 'propertydetails', 'propertystructure', 'privacytype', 'location', 'locationconfirmation', 'propertybasics', 'bathroomtypes', 'occupancy'],
    2: ['makeitstandout', 'amenities', 'photos', 'titledescription', 'description', 'descriptiondetails'],
    3: ['finishsetup', 'bookingsettings', 'guestselection', 'pricing', 'weekendpricing', 'discounts', 'safetydetails', 'finaldetails', 'payment']
  };

  // Find which main step group the current page belongs to
  let currentMainStep = 1;
  let progressInStep = 0;
  
  for (let step = 1; step <= 3; step++) {
    const pagesInStep = stepGroups[step];
    const pageIndex = pagesInStep.indexOf(currentStepName);
    
    if (pageIndex !== -1) {
      currentMainStep = step;
      // Calculate percentage progress within this step
      progressInStep = ((pageIndex + 1) / pagesInStep.length) * 100;
      break;
    }
  }

  // HostingSteps should display as 0% for Step 1 (movement starts at propertydetails)
  const isHostingSteps = currentStepName === 'hostingsteps';
  // Experience category selection should also display as 0% for Step 1
  const isExperienceCategorySelection = currentStepName === 'experience-category-selection';
  // Service category selection should also display as 0% for Step 1
  const isServiceCategorySelection = currentStepName === 'service-category-selection';
  // Experience subcategory selection is part of Step 1 for experiences
  const isExperienceSubcategorySelection = currentStepName === 'experience-subcategory-selection';
  if (isHostingSteps || isExperienceCategorySelection || isServiceCategorySelection) {
    currentMainStep = 1;
    progressInStep = 0;
  }
  // For experience subcategory, show progress within Step 1
  const isExperienceLocation = currentStepName === 'experience-location';
  const isServiceLocation = currentStepName === 'service-location';
  const isServiceYearsOfExperience = currentStepName === 'service-years-of-experience';
  const isServiceQualifications = currentStepName === 'service-qualifications';
  const isServiceOnlineProfiles = currentStepName === 'service-online-profiles';
  const isServiceWhereProvide = currentStepName === 'service-where-provide';
  const isServiceAddress = currentStepName === 'service-address';
  const isServicePhotos = currentStepName === 'service-photos';
  const isServiceTitle = currentStepName === 'service-title';
  const isServiceOfferings = currentStepName === 'service-offerings';
  const isCreateYourOfferings = currentStepName === 'create-your-offerings';
  const isServiceWhatProvide = currentStepName === 'service-what-provide';
  const isServiceDescription = currentStepName === 'service-description';
  if (isExperienceSubcategorySelection) {
    currentMainStep = 1;
    // Calculate progress: category selection (0%) -> subcategory selection (50%) -> location (75%) -> next step (100%)
    progressInStep = 50;
  }
  // For experience location, show progress within Step 1
  const isExperienceListingSummary = currentStepName === 'experience-listing-summary';
  if (isExperienceLocation) {
    currentMainStep = 1;
    progressInStep = 75;
  }
  // For service location, show progress within Step 1 (similar to experience location)
  if (isServiceLocation) {
    currentMainStep = 1;
    // Calculate progress: category selection (0%) -> location (50%) -> years of experience (75%) -> next step (100%)
    progressInStep = 50;
  }
  // For service years of experience, show progress within Step 1
  if (isServiceYearsOfExperience) {
    currentMainStep = 1;
    // Calculate progress: category selection (0%) -> location (50%) -> years of experience (75%) -> next step (100%)
    progressInStep = 75;
  }
  // For service qualifications, show progress within Step 1
  if (isServiceQualifications) {
    currentMainStep = 1;
    progressInStep = 87.5;
  }
  // For service online profiles, show progress within Step 1
  if (isServiceOnlineProfiles) {
    currentMainStep = 1;
    progressInStep = 95;
  }
  // For service address, show progress within Step 1
  if (isServiceAddress) {
    currentMainStep = 1;
    progressInStep = 97.5;
  }
  // For service where provide, show progress within Step 1
  if (isServiceWhereProvide) {
    currentMainStep = 1;
    progressInStep = 98.5;
  }
  // For service photos, show progress within Step 1
  if (isServicePhotos) {
    currentMainStep = 1;
    progressInStep = 99;
  }
  // For service title, show progress within Step 1
  if (isServiceTitle) {
    currentMainStep = 1;
    progressInStep = 99.5;
  }
  // For service offerings, show progress within Step 1
  if (isServiceOfferings || isCreateYourOfferings) {
    currentMainStep = 1;
    progressInStep = 99.8;
  }
  
  // For service what provide, show progress within Step 1
  if (isServiceWhatProvide) {
    currentMainStep = 1;
    progressInStep = 99.85;
  }
  
  // For service description, show progress within Step 1
  if (isServiceDescription) {
    currentMainStep = 1;
    progressInStep = 99.9;
  }
  
  // For offering creation steps, show progress within Step 1
  const isOfferingTitle = currentStepName === 'offering-title';
  const isOfferingPhoto = currentStepName === 'offering-photo';
  const isOfferingGuests = currentStepName === 'offering-guests';
  const isOfferingPrice = currentStepName === 'offering-price';
  const isOfferingPricePerGuest = currentStepName === 'offering-price-per-guest';
  const isOfferingPriceFixed = currentStepName === 'offering-price-fixed';
  const isOfferingMinimumPrice = currentStepName === 'offering-minimum-price';
  const isOfferingReviewPricing = currentStepName === 'offering-review-pricing';
  const isOfferingDiscounts = currentStepName === 'offering-discounts';
  const isOfferingAvailability = currentStepName === 'offering-availability';
  
  if (isOfferingTitle || isOfferingPhoto || isOfferingGuests || isOfferingPrice || 
      isOfferingPricePerGuest || isOfferingPriceFixed || isOfferingMinimumPrice || 
      isOfferingReviewPricing || isOfferingDiscounts || isOfferingAvailability) {
    currentMainStep = 1;
    progressInStep = 99.9; // Slightly higher than offerings list
  }
  // For experience listing summary, show 100% progress for Step 1 (ready to move to Step 2)
  if (isExperienceListingSummary) {
    currentMainStep = 1;
    progressInStep = 100;
  }

  // Debug logging
  console.log('🎯 Progress Bar - Current Step:', currentStepName, '| Main Step:', currentMainStep, '| Progress:', Math.round(progressInStep) + '%');

  // Smooth transitions across route changes with continuity (persist last value per step)
  const storageKey = 'onb_progress_value';
  const storageStepKey = 'onb_progress_step';
  const storagePrevStepKey = 'onb_prev_step_name';
  // Read stored progress synchronously to avoid a first-frame reset to 0
  const storedStepSync = Number(sessionStorage.getItem(storageStepKey) || '0');
  const storedValSync = Number(sessionStorage.getItem(storageKey) || '0');
  const prevStepName = sessionStorage.getItem(storagePrevStepKey) || '';
  
  // Determine if we're navigating backward by comparing step indices
  const getStepIndex = (stepName) => {
    for (let step = 1; step <= 3; step++) {
      const pagesInStep = stepGroups[step];
      const index = pagesInStep.indexOf(stepName);
      if (index !== -1) {
        return { mainStep: step, index };
      }
    }
    return { mainStep: 0, index: -1 };
  };
  
  const currentStepInfo = getStepIndex(currentStepName);
  const prevStepInfo = prevStepName ? getStepIndex(prevStepName) : { mainStep: 0, index: -1 };
  
  // Determine navigation direction
  const isNavigatingBackward = prevStepInfo.mainStep === currentStepInfo.mainStep && 
                               prevStepInfo.index > currentStepInfo.index;
  
  // Check if we're moving backward between step groups (e.g., Step 2 -> Step 1)
  const isMovingBackwardBetweenGroups = storedStepSync > currentMainStep && storedStepSync > 0 && currentMainStep > 0;
  
  // Check if we're moving to a different step group synchronously (before useEffect)
  const isMovingToNewStepGroupSync = storedStepSync !== currentMainStep && storedStepSync > 0 && currentMainStep > 0;
  const isMovingForwardBetweenGroupsSync = isMovingToNewStepGroupSync && currentMainStep > storedStepSync;
  
  // On HostingSteps or ExperienceCategorySelection or ServiceCategorySelection, start rendered at the last value so it can animate DOWN to 0
  // When moving forward to a new step group, always start at 0 (not the previous step's progress)
  // When moving backward to a previous step group, start from 0 or the stored value for that step
  const initialDisplayed = (isHostingSteps || isExperienceCategorySelection || isServiceCategorySelection)
    ? storedValSync
    : (isMovingForwardBetweenGroupsSync 
        ? 0 
        : (isMovingBackwardBetweenGroups 
            ? 0  // When going back, start from 0 of the target step group and animate to correct progress
            : (storedStepSync === currentMainStep ? storedValSync : 0)));
  const prevProgressRef = React.useRef(initialDisplayed);
  const [displayedProgress, setDisplayedProgress] = React.useState(initialDisplayed);

  React.useEffect(() => {
    if (isHostingSteps || isExperienceCategorySelection || isServiceCategorySelection) {
      // Animate backwards to 0 from the last stored value
      const lastVal = Number(sessionStorage.getItem(storageKey) || '0');
      setDisplayedProgress(lastVal);
      prevProgressRef.current = lastVal;
      const id0 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedProgress(0);
          prevProgressRef.current = 0;
          sessionStorage.setItem(storageKey, '0');
          sessionStorage.setItem(storageStepKey, String(currentMainStep));
          sessionStorage.setItem(storagePrevStepKey, currentStepName);
        });
      });
      return () => cancelAnimationFrame(id0);
    }
    
    // For experience subcategory selection, animate to 50% progress
    if (isExperienceSubcategorySelection) {
      const lastVal = Number(sessionStorage.getItem(storageKey) || '0');
      setDisplayedProgress(lastVal);
      prevProgressRef.current = lastVal;
      const id0 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedProgress(50);
          prevProgressRef.current = 50;
          sessionStorage.setItem(storageKey, '50');
          sessionStorage.setItem(storageStepKey, String(currentMainStep));
          sessionStorage.setItem(storagePrevStepKey, currentStepName);
        });
      });
      return () => cancelAnimationFrame(id0);
    }
    
    // For service location, animate to 50% progress
    if (isServiceLocation) {
      const lastVal = Number(sessionStorage.getItem(storageKey) || '0');
      setDisplayedProgress(lastVal);
      prevProgressRef.current = lastVal;
      const id0 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedProgress(50);
          prevProgressRef.current = 50;
          sessionStorage.setItem(storageKey, '50');
          sessionStorage.setItem(storageStepKey, String(currentMainStep));
          sessionStorage.setItem(storagePrevStepKey, currentStepName);
        });
      });
      return () => cancelAnimationFrame(id0);
    }
    
    // For service years of experience, animate to 75% progress
    if (isServiceYearsOfExperience) {
      const lastVal = Number(sessionStorage.getItem(storageKey) || '0');
      setDisplayedProgress(lastVal);
      prevProgressRef.current = lastVal;
      const id0 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedProgress(75);
          prevProgressRef.current = 75;
          sessionStorage.setItem(storageKey, '75');
          sessionStorage.setItem(storageStepKey, String(currentMainStep));
          sessionStorage.setItem(storagePrevStepKey, currentStepName);
        });
      });
      return () => cancelAnimationFrame(id0);
    }
    
    // For service qualifications, animate to 87.5% progress
    if (isServiceQualifications) {
      const lastVal = Number(sessionStorage.getItem(storageKey) || '0');
      setDisplayedProgress(lastVal);
      prevProgressRef.current = lastVal;
      const id0 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedProgress(87.5);
          prevProgressRef.current = 87.5;
          sessionStorage.setItem(storageKey, '87.5');
          sessionStorage.setItem(storageStepKey, String(currentMainStep));
          sessionStorage.setItem(storagePrevStepKey, currentStepName);
        });
      });
      return () => cancelAnimationFrame(id0);
    }
    
    // For service online profiles, animate to 95% progress
    if (isServiceOnlineProfiles) {
      const lastVal = Number(sessionStorage.getItem(storageKey) || '0');
      setDisplayedProgress(lastVal);
      prevProgressRef.current = lastVal;
      const id0 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedProgress(95);
          prevProgressRef.current = 95;
          sessionStorage.setItem(storageKey, '95');
          sessionStorage.setItem(storageStepKey, String(currentMainStep));
          sessionStorage.setItem(storagePrevStepKey, currentStepName);
        });
      });
      return () => cancelAnimationFrame(id0);
    }
    
    // For service address, animate to 97.5% progress
    if (isServiceAddress) {
      const lastVal = Number(sessionStorage.getItem(storageKey) || '0');
      setDisplayedProgress(lastVal);
      prevProgressRef.current = lastVal;
      const id0 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedProgress(97.5);
          prevProgressRef.current = 97.5;
          sessionStorage.setItem(storageKey, '97.5');
          sessionStorage.setItem(storageStepKey, String(currentMainStep));
          sessionStorage.setItem(storagePrevStepKey, currentStepName);
        });
      });
      return () => cancelAnimationFrame(id0);
    }
    
    // For service where provide, animate to 98.5% progress
    if (isServiceWhereProvide) {
      const lastVal = Number(sessionStorage.getItem(storageKey) || '0');
      setDisplayedProgress(lastVal);
      prevProgressRef.current = lastVal;
      const id0 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedProgress(98.5);
          prevProgressRef.current = 98.5;
          sessionStorage.setItem(storageKey, '98.5');
          sessionStorage.setItem(storageStepKey, String(currentMainStep));
          sessionStorage.setItem(storagePrevStepKey, currentStepName);
        });
      });
      return () => cancelAnimationFrame(id0);
    }

    // For service photos, animate to 99% progress
    if (isServicePhotos) {
      const lastVal = Number(sessionStorage.getItem(storageKey) || '0');
      setDisplayedProgress(lastVal);
      prevProgressRef.current = lastVal;
      const id0 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedProgress(99);
          prevProgressRef.current = 99;
          sessionStorage.setItem(storageKey, '99');
          sessionStorage.setItem(storageStepKey, String(currentMainStep));
          sessionStorage.setItem(storagePrevStepKey, currentStepName);
        });
      });
      return () => cancelAnimationFrame(id0);
    }

    // For service title, animate to 99.5% progress
    if (isServiceTitle) {
      const lastVal = Number(sessionStorage.getItem(storageKey) || '0');
      setDisplayedProgress(lastVal);
      prevProgressRef.current = lastVal;
      const id0 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedProgress(99.5);
          prevProgressRef.current = 99.5;
          sessionStorage.setItem(storageKey, '99.5');
          sessionStorage.setItem(storageStepKey, String(currentMainStep));
          sessionStorage.setItem(storagePrevStepKey, currentStepName);
        });
      });
      return () => cancelAnimationFrame(id0);
    }
    
    // For service what provide, animate to 99.85% progress
    if (isServiceWhatProvide) {
      const lastVal = Number(sessionStorage.getItem(storageKey) || '0');
      setDisplayedProgress(lastVal);
      prevProgressRef.current = lastVal;
      const id1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedProgress(99.85);
          prevProgressRef.current = 99.85;
          sessionStorage.setItem(storageKey, '99.85');
          sessionStorage.setItem(storageStepKey, String(currentMainStep));
          sessionStorage.setItem(storagePrevStepKey, currentStepName);
        });
      });
      return () => cancelAnimationFrame(id1);
    }

    // For service description, animate to 99.9% progress
    if (isServiceDescription) {
      const lastVal = Number(sessionStorage.getItem(storageKey) || '0');
      setDisplayedProgress(lastVal);
      prevProgressRef.current = lastVal;
      const id2 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedProgress(99.9);
          prevProgressRef.current = 99.9;
          sessionStorage.setItem(storageKey, '99.9');
          sessionStorage.setItem(storageStepKey, String(currentMainStep));
          sessionStorage.setItem(storagePrevStepKey, currentStepName);
        });
      });
      return () => cancelAnimationFrame(id2);
    }
    
    // For offering creation steps, animate to 99.9% progress
    if (isOfferingTitle || isOfferingPhoto || isOfferingGuests || isOfferingPrice || 
        isOfferingPricePerGuest || isOfferingPriceFixed || isOfferingMinimumPrice || 
        isOfferingReviewPricing || isOfferingDiscounts || isOfferingAvailability) {
      const lastVal = Number(sessionStorage.getItem(storageKey) || '0');
      setDisplayedProgress(lastVal);
      prevProgressRef.current = lastVal;
      const id0 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDisplayedProgress(99.9);
          prevProgressRef.current = 99.9;
          sessionStorage.setItem(storageKey, '99.9');
          sessionStorage.setItem(storageStepKey, String(currentMainStep));
          sessionStorage.setItem(storagePrevStepKey, currentStepName);
        });
      });
      return () => cancelAnimationFrame(id0);
    }
    
    // Get stored values
    const prevStoredVal = Number(sessionStorage.getItem(storageKey) || '0');
    const prevStoredStep = Number(sessionStorage.getItem(storageStepKey) || '0');
    
    // Check if we're navigating forward based on step index (most reliable indicator)
    const isForwardByIndex = currentStepInfo.mainStep === prevStepInfo.mainStep && 
                             currentStepInfo.index > prevStepInfo.index &&
                             currentStepInfo.index >= 0 && prevStepInfo.index >= 0;
    
    // Check if we're moving to a different step group (Step 1 -> Step 2, Step 2 -> Step 3)
    const isMovingToNewStepGroup = prevStoredStep !== currentMainStep && prevStoredStep > 0 && currentMainStep > 0;
    const isMovingForwardBetweenGroups = isMovingToNewStepGroup && currentMainStep > prevStoredStep;
    const isMovingBackwardBetweenGroupsInEffect = prevStoredStep > currentMainStep && prevStoredStep > 0 && currentMainStep > 0;
    
    // Determine starting progress point
    let startProgress;
    if (isMovingBackwardBetweenGroupsInEffect) {
      // CRITICAL FIX: When moving backward to a PREVIOUS step group (e.g., Step 2 -> Step 1)
      // We're switching progress bars, so start from 0 of the target step group
      // The previous step's progress bar will naturally reset/hide since currentMainStep changed
      // Then animate smoothly to the target step's progress
      startProgress = 0;
      console.log('🔙 Moving backward to previous step group - starting from 0%, animating to target', {
        fromStep: prevStoredStep,
        toStep: currentMainStep,
        fromStepName: prevStepName,
        toStepName: currentStepName,
        previousStepProgress: prevStoredVal,
        targetProgress: progressInStep
      });
    } else if (prevStoredStep === currentMainStep) {
      // Same step group - use existing logic
      if (isForwardByIndex) {
        // Forward navigation: if stored value is higher than calculated (stale data), 
        // start from calculated to avoid backward animation
        startProgress = Math.min(prevStoredVal, progressInStep);
      } else if (isNavigatingBackward) {
        // Backward navigation: use stored value
        startProgress = prevStoredVal;
      } else {
        // Same position or uncertain: if stored value is much higher than calculated,
        // it might be stale data - use calculated to be safe
        if (prevStoredVal > progressInStep + 10) {
          // Stored value is significantly higher - likely stale, use calculated
          startProgress = progressInStep;
        } else {
      startProgress = prevStoredVal;
        }
      }
    } else if (isMovingForwardBetweenGroups) {
      // CRITICAL FIX: When moving forward to a NEW step group (e.g., Step 1 -> Step 2)
      // Start from 0% of the new step group, NOT from the previous step's progress
      // This prevents the jump to 100% then decrease animation
      startProgress = 0;
      // Update ref immediately to prevent any flash of incorrect progress
      prevProgressRef.current = 0;
      console.log('✅ Moving forward to new step group - starting from 0%', {
        fromStep: prevStoredStep,
        toStep: currentMainStep,
        fromStepName: prevStepName,
        toStepName: currentStepName,
        targetProgress: progressInStep
      });
    } else {
      // Different step (uncertain) or first time: start from current displayed or 0
      startProgress = prevProgressRef.current || 0;
    }
    
    // Determine target progress - always use calculated progress for current step
    let targetProgress = progressInStep;
    
    // Handle forward navigation: always move forward if step index indicates forward movement
    if (isForwardByIndex) {
      // Forward navigation within same step group - always use calculated progress
      targetProgress = progressInStep;
      console.log('✅ Forward navigation detected (same step group) - moving progress forward', {
        from: prevStepName,
        to: currentStepName,
        fromIndex: prevStepInfo.index,
        toIndex: currentStepInfo.index,
        fromProgress: prevStoredVal,
        toProgress: progressInStep
      });
    } else if (isMovingForwardBetweenGroups) {
      // Forward navigation to new step group - animate from 0% to calculated progress
      targetProgress = progressInStep;
      console.log('✅ Forward navigation to new step group - animating from 0% to', progressInStep + '%', {
        fromStep: prevStoredStep,
        toStep: currentMainStep,
        fromStepName: prevStepName,
        toStepName: currentStepName,
        targetProgress: progressInStep
      });
    } else if (isMovingBackwardBetweenGroupsInEffect) {
      // Backward navigation between step groups (e.g., Step 2 -> Step 1)
      targetProgress = progressInStep;
      console.log('🔙 Backward navigation between step groups - animating progress backward', {
        fromStep: prevStoredStep,
        toStep: currentMainStep,
        fromStepName: prevStepName,
        toStepName: currentStepName,
        fromProgress: prevStoredVal,
        toProgress: progressInStep
      });
    } else if (isNavigatingBackward && prevStoredStep === currentMainStep) {
      // User clicked back button within same step group - allow backward movement
      // Ensure target progress is the calculated progress (which should be lower than previous)
      targetProgress = progressInStep;
      
      // Safety check: if calculated progress seems wrong (>= stored), use a calculated fallback
      if (targetProgress >= prevStoredVal && prevStepInfo.index >= 0 && currentStepInfo.index >= 0) {
        // Recalculate based on index if the progress seems incorrect
        const pagesInStep = stepGroups[currentMainStep];
        const recalculatedProgress = ((currentStepInfo.index + 1) / pagesInStep.length) * 100;
        if (recalculatedProgress < prevStoredVal) {
          targetProgress = recalculatedProgress;
          console.log('⚠️ Corrected target progress for backward navigation', {
            original: progressInStep,
            corrected: recalculatedProgress,
            stored: prevStoredVal
          });
        }
      }
      
      console.log('🔙 Backward navigation detected (same step group) - animating progress backward', {
        from: prevStepName,
        to: currentStepName,
        fromIndex: prevStepInfo.index,
        toIndex: currentStepInfo.index,
        fromProgress: prevStoredVal,
        toProgress: targetProgress,
        calculatedProgressInStep: progressInStep
      });
    } else if (prevStoredStep === currentMainStep && progressInStep < prevStoredVal && !isNavigatingBackward && !isForwardByIndex) {
      // Progress decreased unexpectedly - might be stale data
      // If stored value is much higher, treat it as stale and use calculated
      if (prevStoredVal > progressInStep + 10) {
        console.log('⚠️ Detected possible stale progress data - using calculated value', {
          step: currentStepName,
          calculated: progressInStep,
          stored: prevStoredVal,
          currentIndex: currentStepInfo.index,
          prevIndex: prevStepInfo.index
        });
        // Start from a safe point to avoid backward animation
        startProgress = Math.min(startProgress, progressInStep);
      } else {
        console.warn('⚠️ Progress decreased unexpectedly', {
        step: currentStepName,
        calculated: progressInStep,
        stored: prevStoredVal,
          currentIndex: currentStepInfo.index,
          prevIndex: prevStepInfo.index
      });
      }
      targetProgress = progressInStep;
    }
    
    // For forward movement to new step group, immediately set to start (0%) to prevent flash
    if (isMovingForwardBetweenGroups) {
      setDisplayedProgress(startProgress);
      prevProgressRef.current = startProgress;
    } else {
    // Jump to start progress, then animate to target
    setDisplayedProgress(startProgress);
    }
    
    // Force a double rAF to guarantee a layout pass before transitioning (fixes 0% -> X% jump)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDisplayedProgress(targetProgress);
        prevProgressRef.current = targetProgress;
        // Persist for continuity on next page within the same main step
        sessionStorage.setItem(storageKey, String(targetProgress));
        sessionStorage.setItem(storageStepKey, String(currentMainStep));
        sessionStorage.setItem(storagePrevStepKey, currentStepName);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [currentStepName, progressInStep, currentMainStep, isHostingSteps, isExperienceCategorySelection, isServiceCategorySelection, isExperienceSubcategorySelection, isExperienceLocation, isServiceLocation, isServiceYearsOfExperience, isServiceQualifications, isServiceOnlineProfiles, isServiceWhereProvide, isServiceAddress, isServicePhotos, isServiceTitle, isServiceOfferings, isCreateYourOfferings, isServiceWhatProvide, isServiceDescription, isOfferingTitle, isOfferingPhoto, isOfferingGuests, isOfferingPrice, isOfferingPricePerGuest, isOfferingPriceFixed, isOfferingMinimumPrice, isOfferingReviewPricing, isOfferingDiscounts, isExperienceListingSummary, isNavigatingBackward, prevStepName]);

  // Render three segments with progress
  return (
    <div className="w-full flex items-center justify-between gap-2 px-0 py-0 relative" style={{marginTop: 0, marginBottom: 0}}>
      {/* Step 1 */}
      <div className="flex-1 h-1 bg-gray-200 relative overflow-visible">
        {currentMainStep === 1 && (
          <>
            <div 
              className="absolute left-0 top-0 h-full transition-all duration-[1500ms] ease-in-out progress-water"
              style={{ 
                width: `${displayedProgress}%`,
                backgroundImage: 'linear-gradient(90deg, hsl(var(--primary)) 0%, #16a34a 30%, hsl(var(--primary)) 60%, #16a34a 90%, rgba(160, 82, 45, 0.3) 100%)'
              }}
            />
            <span 
              className="absolute transition-all duration-[1500ms] ease-in-out text-xl" 
              style={{ left: `${displayedProgress}%`, top: '50%', transform: 'translate(-50%, -50%)', opacity: displayedProgress > 0 ? 1 : 0 }}
            >
              🗝️
            </span>
          </>
        )}
        {currentMainStep > 1 && (
          <div className="absolute left-0 top-0 h-full w-full bg-primary" />
        )}
      </div>
      
      {/* Step 2 */}
      <div className="flex-1 h-1 bg-gray-200 relative overflow-visible">
        {currentMainStep === 2 && (
          <>
            <div 
              className="absolute left-0 top-0 h-full transition-all duration-[1500ms] ease-in-out progress-water"
              style={{ 
                width: `${displayedProgress}%`,
                backgroundImage: 'linear-gradient(90deg, hsl(var(--primary)) 0%, #16a34a 30%, hsl(var(--primary)) 60%, #16a34a 90%, rgba(160, 82, 45, 0.3) 100%)'
              }}
            />
            <span 
              className="absolute transition-all duration-[1500ms] ease-in-out text-xl" 
              style={{ left: `${displayedProgress}%`, top: '50%', transform: 'translate(-50%, -50%)', opacity: displayedProgress > 0 ? 1 : 0 }}
            >
              🗝️
            </span>
          </>
        )}
        {currentMainStep > 2 && (
          <div className="absolute left-0 top-0 h-full w-full bg-primary" />
        )}
      </div>
      
      {/* Step 3 */}
      <div className="flex-1 h-1 bg-gray-200 relative overflow-visible">
        {currentMainStep === 3 && (
          <>
            <div 
              className="absolute left-0 top-0 h-full transition-all duration-[1500ms] ease-in-out progress-water"
              style={{ 
                width: `${displayedProgress}%`,
                backgroundImage: 'linear-gradient(90deg, hsl(var(--primary)) 0%, #16a34a 30%, hsl(var(--primary)) 60%, #16a34a 90%, rgba(160, 82, 45, 0.3) 100%)'
              }}
            />
            <span 
              className="absolute transition-all duration-[1500ms] ease-in-out text-xl" 
              style={{ left: `${displayedProgress}%`, top: '50%', transform: 'translate(-50%, -50%)', opacity: displayedProgress > 0 ? 1 : 0 }}
            >
              🗝️
            </span>
          </>
        )}
      </div>
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
