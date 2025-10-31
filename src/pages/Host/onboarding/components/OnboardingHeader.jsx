import React from "react";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";

const OnboardingHeader = ({ showProgress = true, currentStepNameOverride }) => {
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
      await actions.saveAndExit();
      console.log("✅ Save and exit completed successfully!");
    } catch (error) {
      alert("Failed to save draft: " + error.message);
    }
  };
  return (
    <>
      {/* Header with progress line at bottom */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b shadow-sm pt-2">
        <div className="py-2 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/host/hostdashboard')}>
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
  const stepGroups = {
    1: ['hostingsteps', 'propertydetails', 'propertystructure', 'privacytype', 'location', 'locationconfirmation', 'propertybasics'],
    2: ['makeitstandout', 'amenities', 'photos', 'titledescription', 'description', 'descriptiondetails'],
    3: ['finishsetup', 'bookingsettings', 'guestselection', 'pricing', 'weekendpricing', 'discounts', 'safetydetails', 'finaldetails']
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
  if (isHostingSteps) {
    currentMainStep = 1;
    progressInStep = 0;
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
  
  // Check if we're moving to a different step group synchronously (before useEffect)
  const isMovingToNewStepGroupSync = storedStepSync !== currentMainStep && storedStepSync > 0 && currentMainStep > 0;
  const isMovingForwardBetweenGroupsSync = isMovingToNewStepGroupSync && currentMainStep > storedStepSync;
  
  // On HostingSteps, start rendered at the last value so it can animate DOWN to 0
  // When moving forward to a new step group, always start at 0 (not the previous step's progress)
  const initialDisplayed = isHostingSteps
    ? storedValSync
    : (isMovingForwardBetweenGroupsSync ? 0 : (storedStepSync === currentMainStep ? storedValSync : 0));
  const prevProgressRef = React.useRef(initialDisplayed);
  const [displayedProgress, setDisplayedProgress] = React.useState(initialDisplayed);

  React.useEffect(() => {
    if (isHostingSteps) {
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
    
    // Determine starting progress point
    let startProgress;
    if (prevStoredStep === currentMainStep) {
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
      // Different step (backward or uncertain) or first time: start from current displayed or 0
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
    } else if (isNavigatingBackward && prevStoredStep === currentMainStep) {
      // User clicked back button - allow backward movement
      targetProgress = progressInStep;
      console.log('🔙 Backward navigation detected - animating progress backward', {
        from: prevStepName,
        to: currentStepName,
        fromIndex: prevStepInfo.index,
        toIndex: currentStepInfo.index,
        fromProgress: prevStoredVal,
        toProgress: progressInStep
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
  }, [currentStepName, progressInStep, currentMainStep, isHostingSteps, isNavigatingBackward, prevStepName]);

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
