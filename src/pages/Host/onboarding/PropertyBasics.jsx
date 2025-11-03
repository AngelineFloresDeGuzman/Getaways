import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';

const PropertyBasics = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Direct context access - NO AUTOSAVE
  const { state, actions } = useOnboarding();
  
  // Helper function to build propertyBasics data based on privacyType
  const buildPropertyBasicsData = (propertyBasicsData) => {
    const currentPrivacyType = privacyType || state.privacyType || 'An entire place';
    
    // Base structure with guestCapacity (always required)
    const baseData = {
      guestCapacity: propertyBasicsData.guests
    };
    
    // Add fields based on privacyType
    if (currentPrivacyType === 'An entire place') {
      // An entire place: guests, bedrooms, beds, bathrooms
      return {
        ...baseData,
        bedrooms: propertyBasicsData.bedrooms,
        beds: propertyBasicsData.beds,
        bathrooms: propertyBasicsData.bathrooms
      };
    } else if (currentPrivacyType === 'A room') {
      // A room: guests, bedrooms, beds, bedroomLock
      return {
        ...baseData,
        bedrooms: propertyBasicsData.bedrooms,
        beds: propertyBasicsData.beds,
        bedroomLock: propertyBasicsData.bedroomLock || null
      };
    } else if (currentPrivacyType === 'A shared room in a hostel') {
      // A shared room in a hostel: guests, beds, bathrooms
      return {
        ...baseData,
        beds: propertyBasicsData.beds,
        bathrooms: propertyBasicsData.bathrooms
      };
    } else {
      // Default fallback: save all fields (backward compatibility)
      return {
        ...baseData,
        bedrooms: propertyBasicsData.bedrooms,
        beds: propertyBasicsData.beds,
        bathrooms: propertyBasicsData.bathrooms,
        bedroomLock: propertyBasicsData.bedroomLock || null
      };
    }
  };

  // Helper function to ensure we have a valid draftId and save to Firebase
  const ensureDraftAndSave = async (propertyBasicsData) => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // Build the propertyBasics data based on privacyType
    const propertyBasicsToSave = buildPropertyBasicsData(propertyBasicsData);
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
      console.log('📍 PropertyBasics: Found temp ID, resetting to find/create real draft');
      draftIdToUse = null;
    }
    
    // If user is authenticated, ensure we have a draft
    if (!draftIdToUse && state.user?.uid) {
      try {
        const { getUserDrafts, saveDraft } = await import('@/pages/Host/services/draftService');
        const drafts = await getUserDrafts();
        
        if (drafts.length > 0) {
          // Use the most recent draft
          draftIdToUse = drafts[0].id;
          console.log('📍 PropertyBasics: Using existing draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          console.log('📍 PropertyBasics: No existing drafts, creating new draft');
          // Determine next step based on privacyType
          const currentPrivacyType = privacyType || state.privacyType || 'An entire place';
          const nextStep = currentPrivacyType === 'A room' ? 'bathroomtypes' : 'makeitstandout';
          
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              propertyBasics: propertyBasicsToSave
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          console.log('📍 PropertyBasics: ✅ Created new draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        console.error('📍 PropertyBasics: Error finding/creating draft:', error);
        throw error;
      }
    }
    
    // Save to Firebase if we have a valid draftId
    if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
      try {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          // Determine next step based on privacyType
          const currentPrivacyType = privacyType || state.privacyType || 'An entire place';
          const nextStep = currentPrivacyType === 'A room' ? 'bathroomtypes' : 'makeitstandout';
          
          // Update existing document - save as nested propertyBasics object (similar to locationData)
          // Only save fields relevant to the current privacyType
          await updateDoc(draftRef, {
            'data.propertyBasics': propertyBasicsToSave,
            currentStep: nextStep,
            lastModified: new Date()
          });
          console.log('📍 PropertyBasics: ✅ Saved propertyBasics to Firebase (privacyType:', privacyType || state.privacyType, '):', propertyBasicsToSave);
        } else {
          // Document doesn't exist, create it
          console.log('📍 PropertyBasics: Document not found, creating new one');
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          // Determine next step based on privacyType
          const currentPrivacyType = privacyType || state.privacyType || 'An entire place';
          const nextStep = currentPrivacyType === 'A room' ? 'bathroomtypes' : 'makeitstandout';
          
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              propertyBasics: propertyBasicsToSave
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          console.log('📍 PropertyBasics: ✅ Created new draft with propertyBasics:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        console.error('📍 PropertyBasics: ❌ Error saving to Firebase:', error);
        throw error;
      }
    } else if (state.user?.uid) {
      // User authenticated but no draftId - this shouldn't happen after ensureDraftAndSave logic
      console.warn('📍 PropertyBasics: ⚠️ User authenticated but no valid draftId after ensureDraftAndSave');
      throw new Error('Failed to create draft for authenticated user');
    } else {
      console.warn('📍 PropertyBasics: ⚠️ User not authenticated, cannot save to Firebase');
      return null; // Return null instead of throwing - data is in context
    }
  };
  
  // Get privacyType from state or draft data
  const [privacyType, setPrivacyType] = useState(state.privacyType || null);
  
  // State for property basics - default guests to 4
  const [propertyBasics, setPropertyBasics] = useState({
    guests: state.guestCapacity ?? 4, // Default to 4 (context initializes to 4 now)
    bedrooms: state.bedrooms || 1,
    beds: state.beds || 2,
    bathrooms: state.bathrooms || 1,
    bedroomLock: state.bedroomLock || null // For "A room" option
  });

  // Ref to track initialization
  const hasInitialized = useRef(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  // Set current step immediately when component mounts to ensure progress bar detects forward navigation
  // Use useLayoutEffect to set it synchronously before paint
  useLayoutEffect(() => {
    if (actions?.setCurrentStep) {
      console.log('📍 PropertyBasics: Setting currentStep to propertybasics (useLayoutEffect)');
      actions.setCurrentStep('propertybasics');
    }
  }, [actions]);

  // Load draft if continuing from saved progress (manual, no autosave)
  useEffect(() => {
    const initializePage = async () => {
      if (location.state?.draftId && actions.loadDraft) {
        try {
          console.log('PropertyBasics: Loading draft with ID:', location.state.draftId);
          actions.setLoading(true);
          await actions.loadDraft(location.state.draftId);
          setHasLoadedDraft(true);
          console.log('PropertyBasics: Draft loaded successfully');
          
          // Load privacyType from draft data
          if (state.draftId || location.state?.draftId) {
            const draftIdToUse = state.draftId || location.state.draftId;
            const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
            const draftSnap = await getDoc(draftRef);
            if (draftSnap.exists()) {
              const draftData = draftSnap.data();
              const privacyTypeFromDraft = draftData.data?.privacyType || draftData.privacyType || null;
              if (privacyTypeFromDraft) {
                setPrivacyType(privacyTypeFromDraft);
                console.log('PropertyBasics: Loaded privacyType from draft:', privacyTypeFromDraft);
              }
            }
          }
        } catch (error) {
          console.error('Error loading draft in PropertyBasics:', error);
          setHasLoadedDraft(true); // Set to true even on error to allow step correction
        } finally {
          actions.setLoading(false);
        }
      } else {
        setHasLoadedDraft(true);
        // Try to get privacyType from state
        if (state.privacyType) {
          setPrivacyType(state.privacyType);
        }
      }
    };

    initializePage();
  }, [location.state?.draftId, actions]);
  
  // Also update privacyType when state changes
  useEffect(() => {
    if (state.privacyType) {
      setPrivacyType(state.privacyType);
    }
  }, [state.privacyType]);

  // Ensure currentStep is correct after draft loads (in case draft overwrote it)
  useEffect(() => {
    if (hasLoadedDraft && actions?.setCurrentStep) {
      // Only set if it's not already correct (to avoid unnecessary updates)
      if (state.currentStep !== 'propertybasics') {
        console.log('📍 PropertyBasics: Resetting currentStep to propertybasics after draft load');
        console.log('📍 PropertyBasics: Draft loaded with currentStep:', state.currentStep, '- correcting to propertybasics');
        actions.setCurrentStep('propertybasics');
        
        // CRITICAL: Also update sessionStorage to ensure progress bar uses correct previous step
        // Force it to 'locationconfirmation' so progress bar calculates forward navigation correctly
        const storagePrevStepKey = 'onb_prev_step_name';
        const currentPrevStep = sessionStorage.getItem(storagePrevStepKey);
        
        // Only update if previous step is not 'locationconfirmation' (our expected previous step)
        if (currentPrevStep !== 'locationconfirmation') {
          console.log('📍 PropertyBasics: Correcting sessionStorage previous step from', currentPrevStep, 'to locationconfirmation');
          sessionStorage.setItem(storagePrevStepKey, 'locationconfirmation');
          
          // Also ensure progress step and value are correct
          const storageStepKey = 'onb_progress_step';
          const storageKey = 'onb_progress_value';
          const locationConfirmationProgress = ((5 + 1) / 7) * 100; // locationconfirmation index 5
          sessionStorage.setItem(storageStepKey, '1');
          sessionStorage.setItem(storageKey, String(locationConfirmationProgress));
        }
      }
    }
  }, [hasLoadedDraft, actions, state.currentStep]);

  // Update propertyBasics when state changes (after loading draft)
  useEffect(() => {
    if (state.guestCapacity !== undefined || state.bedrooms || state.beds || state.bathrooms || state.bedroomLock !== undefined) {
      const newBasics = {
        guests: state.guestCapacity ?? state.guests ?? 4, // Default to 4
        bedrooms: state.bedrooms || (privacyType === 'A shared room in a hostel' ? 0 : 1),
        beds: state.beds || 2,
        bathrooms: state.bathrooms || (privacyType === 'A room' ? 0 : 1),
        bedroomLock: state.bedroomLock || null
      };
      setPropertyBasics(newBasics);
    } else {
      // If no state values exist, ensure guests defaults to 4
      setPropertyBasics(prev => ({
        ...prev,
        guests: 4 // Always default to 4 if no state values
      }));
    }
  }, [state.guestCapacity, state.guests, state.bedrooms, state.beds, state.bathrooms, state.bedroomLock, privacyType]);

  // Real-time context updates (moved to handleCounterChange)
  const updatePropertyBasics = (newBasics) => {
    console.log('PropertyBasics - Updating context with:', newBasics);
    const currentPrivacyType = privacyType || state.privacyType || 'An entire place';
    
    // Map local state structure to context structure based on privacyType
    const contextBasics = {
      guestCapacity: newBasics.guests
    };
    
    // Add fields based on privacyType
    if (currentPrivacyType === 'An entire place') {
      contextBasics.bedrooms = newBasics.bedrooms;
      contextBasics.beds = newBasics.beds;
      contextBasics.bathrooms = newBasics.bathrooms;
    } else if (currentPrivacyType === 'A room') {
      contextBasics.bedrooms = newBasics.bedrooms;
      contextBasics.beds = newBasics.beds;
      contextBasics.bedroomLock = newBasics.bedroomLock || null;
    } else if (currentPrivacyType === 'A shared room in a hostel') {
      contextBasics.beds = newBasics.beds;
      contextBasics.bathrooms = newBasics.bathrooms;
    } else {
      // Default fallback: include all fields
      contextBasics.bedrooms = newBasics.bedrooms;
      contextBasics.beds = newBasics.beds;
      contextBasics.bathrooms = newBasics.bathrooms;
      contextBasics.bedroomLock = newBasics.bedroomLock || null;
    }
    
    actions.updatePropertyBasics(contextBasics);
    // Removed setCurrentStep to prevent infinite loops
  };

  // Handle counter changes
  const handleCounterChange = (field, increment) => {
    setPropertyBasics(prev => {
      const newValue = increment ? prev[field] + 1 : prev[field] - 1;
      // Ensure minimum values
      // For beds and guests, minimum is 1
      // For bedrooms, minimum is 0
      // For bathrooms, minimum is 0.5 (for half bathrooms)
      const minValue = field === 'guests' || field === 'beds' 
        ? 1 
        : (field === 'bedrooms' ? 0 : (field === 'bathrooms' ? 0.5 : 1));
      const updatedBasics = {
        ...prev,
        [field]: Math.max(minValue, newValue)
      };
      
      // Schedule context update after render using setTimeout
      setTimeout(() => {
        const currentPrivacyType = privacyType || state.privacyType || 'An entire place';
        
        // Map to context structure based on privacyType
        const contextBasics = {
          guestCapacity: updatedBasics.guests
        };
        
        // Add fields based on privacyType
        if (currentPrivacyType === 'An entire place') {
          contextBasics.bedrooms = updatedBasics.bedrooms;
          contextBasics.beds = updatedBasics.beds;
          contextBasics.bathrooms = updatedBasics.bathrooms;
        } else if (currentPrivacyType === 'A room') {
          contextBasics.bedrooms = updatedBasics.bedrooms;
          contextBasics.beds = updatedBasics.beds;
          contextBasics.bedroomLock = updatedBasics.bedroomLock || null;
        } else if (currentPrivacyType === 'A shared room in a hostel') {
          contextBasics.beds = updatedBasics.beds;
          contextBasics.bathrooms = updatedBasics.bathrooms;
        } else {
          // Default fallback: include all fields
          contextBasics.bedrooms = updatedBasics.bedrooms;
          contextBasics.beds = updatedBasics.beds;
          contextBasics.bathrooms = updatedBasics.bathrooms;
          contextBasics.bedroomLock = updatedBasics.bedroomLock || null;
        }
        
        console.log('Counter changed, updating context:', contextBasics);
        actions.updatePropertyBasics(contextBasics);
        // Remove setCurrentStep from counter changes to prevent infinite loops
      }, 0);
      
      return updatedBasics;
    });
  };

  // Save & Exit handler (manual save, no autosave)
  const handleSaveAndExitClick = async () => {
    try {
      console.log('PropertyBasics: Saving and exiting...');
      console.log('Current propertyBasics:', propertyBasics);
      
      // Update context with current values first
      updatePropertyBasics(propertyBasics);
      
      // Use context's saveAndExit function
      if (actions.saveAndExit) {
        await actions.saveAndExit();
      } else {
        console.warn('PropertyBasics: saveAndExit action not available');
      }
    } catch (error) {
      console.error('Error saving and exiting:', error);
      alert('Error saving progress: ' + error.message);
    }
  };

  // Counter component
  const Counter = ({ label, value, field, step = 1 }) => {
    // For beds and guests, disable decrease when value is 1
    // For bedrooms, can decrease to 0
    // For bathrooms, can decrease to 0.5 (half bathroom)
    const canDecrement = field === 'guests' || field === 'beds' 
      ? value > 1 
      : (field === 'bedrooms' ? value > 0 : (field === 'bathrooms' ? value > 0.5 : value > 1));
    
    return (
      <div className="flex items-center justify-between py-6 border-b border-gray-200 last:border-b-0">
        <span className="text-lg font-normal text-gray-900">{label}</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleCounterChange(field, false)}
            disabled={!canDecrement}
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-lg font-light ${
              canDecrement
                ? 'border-gray-300 text-gray-600 hover:border-gray-400'
                : 'border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
          >
            −
          </button>
          <span className="w-8 text-center text-lg font-normal">
            {field === 'bathrooms' && value % 1 !== 0 ? value.toFixed(1) : value}
          </span>
          <button
            onClick={() => handleCounterChange(field, true)}
            className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 flex items-center justify-center text-lg font-light"
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} />

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-[640px] mx-auto">
          <h1 className="text-[32px] font-medium text-gray-900 mb-2">
            Share some basics about your place
          </h1>
          <p className="text-base text-gray-600 mb-12">
            You'll add more details later, like bed types.
          </p>

          {/* Counters Container */}
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            {/* Conditional fields based on privacyType */}
            {/* Default to "An entire place" if privacyType is not set */}
            {(privacyType === 'An entire place' || !privacyType) && (
              <>
            <Counter 
              label="Guests" 
              value={propertyBasics.guests} 
              field="guests" 
            />
            <Counter 
              label="Bedrooms" 
              value={propertyBasics.bedrooms} 
              field="bedrooms" 
            />
            <Counter 
              label="Beds" 
              value={propertyBasics.beds} 
              field="beds" 
            />
            <Counter 
              label="Bathrooms" 
              value={propertyBasics.bathrooms} 
              field="bathrooms" 
            />
              </>
            )}
            
            {privacyType === 'A room' && (
              <>
                <div className="pb-6 border-b border-gray-200 mb-6">
                  <h2 className="text-lg font-normal text-gray-900 mb-6">
                    How many people can stay here?
                  </h2>
                  <Counter 
                    label="Guests" 
                    value={propertyBasics.guests} 
                    field="guests" 
                  />
                </div>
                <Counter 
                  label="Bedrooms" 
                  value={propertyBasics.bedrooms} 
                  field="bedrooms" 
                />
                <Counter 
                  label="Beds" 
                  value={propertyBasics.beds} 
                  field="beds" 
                />
                {/* Bedroom Lock Question */}
                <div className="pt-6 border-t border-gray-200">
                  <h2 className="text-lg font-normal text-gray-900 mb-6">
                    Does every bedroom have a lock?
                  </h2>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="bedroomLock"
                        value="yes"
                        checked={propertyBasics.bedroomLock === 'yes'}
                        onChange={(e) => {
                          const updated = { ...propertyBasics, bedroomLock: 'yes' };
                          setPropertyBasics(updated);
                          setTimeout(() => {
                            actions.updatePropertyBasics({
                              guestCapacity: updated.guests,
                              bedrooms: updated.bedrooms,
                              beds: updated.beds,
                              bathrooms: updated.bathrooms,
                              bedroomLock: 'yes'
                            });
                          }, 0);
                        }}
                        className="w-5 h-5 text-primary border-gray-300 focus:ring-primary focus:ring-2"
                      />
                      <span className="text-base text-gray-700">Yes</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="bedroomLock"
                        value="no"
                        checked={propertyBasics.bedroomLock === 'no'}
                        onChange={(e) => {
                          const updated = { ...propertyBasics, bedroomLock: 'no' };
                          setPropertyBasics(updated);
                          setTimeout(() => {
                            actions.updatePropertyBasics({
                              guestCapacity: updated.guests,
                              bedrooms: updated.bedrooms,
                              beds: updated.beds,
                              bathrooms: updated.bathrooms,
                              bedroomLock: 'no'
                            });
                          }, 0);
                        }}
                        className="w-5 h-5 text-primary border-gray-300 focus:ring-primary focus:ring-2"
                      />
                      <span className="text-base text-gray-700">No</span>
                    </label>
                  </div>
                  {/* Warning message when No is selected */}
                  {propertyBasics.bedroomLock === 'no' && (
                    <div className="mt-4 pl-8">
                      <p className="text-sm text-gray-600 mb-1">
                        Guests expect a lock for their room. We strongly recommend adding one.
                      </p>
                      <button
                        type="button"
                        className="text-sm text-gray-600 underline hover:text-gray-800"
                        onClick={(e) => {
                          e.preventDefault();
                          // TODO: Add "Learn more" functionality
                        }}
                      >
                        Learn more
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {privacyType === 'A shared room in a hostel' && (
              <>
                <Counter 
                  label="Guests" 
                  value={propertyBasics.guests} 
                  field="guests" 
                />
                <Counter 
                  label="Beds" 
                  value={propertyBasics.beds} 
                  field="beds" 
                />
                <Counter 
                  label="Bathrooms" 
                  value={propertyBasics.bathrooms} 
                  field="bathrooms" 
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <OnboardingFooter
        onBack={() => {
          // Update sessionStorage before navigating back
          updateSessionStorageBeforeNav('propertybasics');
          navigate('/pages/locationconfirmation', {
          state: {
            ...location.state,
            draftId: state?.draftId || location.state?.draftId
          }
          });
        }}
        onNext={async () => {
          // Update context first
          updatePropertyBasics(propertyBasics);
          
          // CRITICAL: Set currentStep to 'propertybasics' BEFORE updating sessionStorage
          // This ensures the progress bar knows we're leaving propertybasics
          if (actions.setCurrentStep) {
            actions.setCurrentStep('propertybasics');
          }
          
          // CRITICAL: Set sessionStorage for the NEXT step (MakeItStandOut) BEFORE navigation
          // This ensures OnboardingHeader reads the correct values when MakeItStandOut loads
          const storagePrevStepKey = 'onb_prev_step_name';
          const storageStepKey = 'onb_progress_step';
          const storageKey = 'onb_progress_value';
          
          // Store propertybasics as the previous step (so progress bar knows where we came from)
          sessionStorage.setItem(storagePrevStepKey, 'propertybasics');
          
          // CRITICAL: Set Step 2 values NOW, not Step 1 values
          // MakeItStandOut is index 0 in Step 2 (7 pages total), so progress = ((0+1)/7)*100 = ~14.29%
          const makeitstandoutProgress = ((0 + 1) / 7) * 100; // makeitstandout index 0, total 7 pages in step 2
          sessionStorage.setItem(storageStepKey, '2'); // We're navigating to Step 2
          sessionStorage.setItem(storageKey, String(makeitstandoutProgress)); // Start at ~14.29% for Step 2
          
          console.log('📍 PropertyBasics: Set sessionStorage for MakeItStandOut - previousStep: propertybasics, step: 2, progress:', Math.round(makeitstandoutProgress) + '%');
          
          // Small delay to ensure React processes state updates and sessionStorage is set
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Ensure we have a valid draft and save to Firebase (no temp documents)
          let draftIdToUse;
          try {
            draftIdToUse = await ensureDraftAndSave(propertyBasics);
            console.log('📍 PropertyBasics: ✅ Saved propertyBasics to Firebase on Next click');
          } catch (saveError) {
            console.error('📍 PropertyBasics: Error saving to Firebase on Next:', saveError);
            // Continue navigation even if save fails - data is in context
          }
          
          // Navigate to next step based on privacyType
          const currentPrivacyType = privacyType || state.privacyType || 'An entire place';
          const nextStep = currentPrivacyType === 'A room' 
            ? '/pages/bathroomtypes' 
            : '/pages/makeitstandout';
          
          // If navigating to bathroomtypes, update sessionStorage accordingly
          if (currentPrivacyType === 'A room') {
            sessionStorage.setItem(storagePrevStepKey, 'propertybasics');
            sessionStorage.setItem(storageStepKey, '1'); // Step 1
            // Step 1 has 9 pages when "A room" is selected: hostingsteps, propertydetails, propertystructure, privacytype, location, locationconfirmation, propertybasics, bathroomtypes, occupancy
            const bathroomtypesProgress = ((7 + 1) / 9) * 100; // ~88.89% (bathroomtypes is index 7 in step 1)
            sessionStorage.setItem(storageKey, String(bathroomtypesProgress));
            console.log('📍 PropertyBasics: Navigating to BathroomTypes (A room selected)');
          }
          
          navigate(nextStep, { 
            state: { 
              ...location.state,
              propertyBasics,
              draftId: draftIdToUse || state?.draftId || location.state?.draftId
            } 
          });
        }}
        backText="Back"
        nextText="Next"
        canProceed={true}
      />
    </div>
  );
};

export default PropertyBasics;