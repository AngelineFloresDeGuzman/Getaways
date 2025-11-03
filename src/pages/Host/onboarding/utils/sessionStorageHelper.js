/**
 * Helper function to update sessionStorage before navigation
 * This ensures the progress bar correctly detects navigation direction
 */

// Define step groups for progress calculation
const stepGroups = {
  1: ['hostingsteps', 'propertydetails', 'propertystructure', 'privacytype', 'location', 'locationconfirmation', 'propertybasics'],
  2: ['makeitstandout', 'amenities', 'photos', 'titledescription', 'description', 'descriptiondetails'],
  3: ['finishsetup', 'bookingsettings', 'guestselection', 'pricing', 'weekendpricing', 'discounts', 'safetydetails', 'finaldetails', 'payment']
};

/**
 * Find which step group a step belongs to and its index
 */
const getStepInfo = (stepName) => {
  for (let step = 1; step <= 3; step++) {
    const pagesInStep = stepGroups[step];
    const index = pagesInStep.indexOf(stepName);
    if (index !== -1) {
      return { mainStep: step, index, pagesInStep };
    }
  }
  return { mainStep: 0, index: -1, pagesInStep: [] };
};

/**
 * Calculate progress percentage for a given step
 */
const calculateProgress = (stepName) => {
  const { index, pagesInStep } = getStepInfo(stepName);
  if (index === -1) return 0;
  
  // HostingSteps should be 0%
  if (stepName === 'hostingsteps') return 0;
  
  return ((index + 1) / pagesInStep.length) * 100;
};

/**
 * Update sessionStorage before navigation
 * @param {string} currentStep - Current step name (e.g., 'description')
 * @param {string} targetStep - Target step name (e.g., 'titledescription') - optional, defaults to currentStep
 */
export const updateSessionStorageBeforeNav = (currentStep, targetStep = null) => {
  const storagePrevStepKey = 'onb_prev_step_name';
  const storageStepKey = 'onb_progress_step';
  const storageKey = 'onb_progress_value';
  
  const stepToUse = targetStep || currentStep;
  const stepInfo = getStepInfo(stepToUse);
  const progress = calculateProgress(stepToUse);
  
  if (stepInfo.mainStep > 0) {
    // Update sessionStorage to indicate current position before navigation
    sessionStorage.setItem(storagePrevStepKey, currentStep);
    sessionStorage.setItem(storageStepKey, String(stepInfo.mainStep));
    sessionStorage.setItem(storageKey, String(progress));
    
    console.log('📍 SessionStorage updated before navigation:', {
      currentStep,
      targetStep: stepToUse,
      mainStep: stepInfo.mainStep,
      progress: progress.toFixed(2) + '%'
    });
  }
};

export { stepGroups, getStepInfo, calculateProgress };

