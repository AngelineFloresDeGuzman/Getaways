import React, { useState, useEffect, useRef, useMemo } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';

const DescriptionDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);
  const [isSaving, setIsSaving] = useState(false);
  
  // PropertyStructure state - load from Firebase dynamically
  const [propertyStructure, setPropertyStructure] = useState(() => {
    // Initialize from context if available
    if (state.propertyStructure) {
      console.log('📍 DescriptionDetails: Initializing propertyStructure from context:', state.propertyStructure);
      return state.propertyStructure.toLowerCase();
    }
    return null;
  });
  
  const [description, setDescription] = useState("You'll have a great time at this comfortable place to stay.");
  const maxLength = 500;

  // Ref to track initialization
  const hasInitialized = useRef(false);

  const canProceed = description.trim().length > 0;

  const handleDescriptionChange = (e) => {
    if (e.target.value.length <= maxLength) {
      const newDescription = e.target.value;
      setDescription(newDescription);
      
      // Update context in real-time
      updateDescriptionContext(newDescription);
    }
  };

  // Custom Save & Exit handler
  const handleSaveAndExitClick = async () => {
    if (!auth.currentUser) {
      alert('Please log in to save your progress');
      return;
    }
    
    setIsSaving(true);
    
    try {
      console.log('📍 DescriptionDetails: Save & Exit clicked');
      console.log('Current description:', description);
      
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('📍 DescriptionDetails: Setting currentStep to descriptiondetails');
        actions.setCurrentStep('descriptiondetails');
      }
      
      // Ensure description is updated in context
      updateDescriptionContext(description);
      
      // Save description to Firebase under data.description
      // Ensure description is not empty (use default if empty)
      const descriptionToSave = description.trim() || "You'll have a great time at this comfortable place to stay.";
      console.log('📍 DescriptionDetails: Description to save (length):', descriptionToSave.length);
      
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(descriptionToSave, '/pages/descriptiondetails');
        console.log('📍 DescriptionDetails: ✅ Saved description to Firebase on Save & Exit, draftId:', draftIdToUse);
      } catch (saveError) {
        console.error('📍 DescriptionDetails: Error saving to Firebase on Save & Exit:', saveError);
        alert('Error saving progress: ' + saveError.message);
        return;
      }
      
      // Update sessionStorage before Save & Exit navigation
      updateSessionStorageBeforeNav('descriptiondetails');
      
      // Navigate to listings tab
      navigate('/host/listings', { 
        state: { 
          message: 'Draft saved successfully!',
          draftSaved: true 
        }
      });
      
    } catch (error) {
      console.error('Error in DescriptionDetails save:', error);
      alert('Failed to save progress: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Load propertyStructure - ALWAYS try to load from Firebase
  // Try multiple times: on mount, when draftId becomes available, and when navigating
  useEffect(() => {
    const loadPropertyStructure = async () => {
      console.log('📍 DescriptionDetails: loadPropertyStructure effect triggered');
      console.log('📍 DescriptionDetails: state.propertyStructure:', state.propertyStructure);
      console.log('📍 DescriptionDetails: propertyStructure state:', propertyStructure);
      console.log('📍 DescriptionDetails: state?.draftId:', state?.draftId);
      console.log('📍 DescriptionDetails: location.state?.draftId:', location.state?.draftId);
      
      let draftIdToUse = state?.draftId || location.state?.draftId;
      
      // If no draftId yet, try to get it from user's drafts
      if (!draftIdToUse && state.user?.uid) {
        try {
          const { getUserDrafts } = await import('@/pages/Host/services/draftService');
          const drafts = await getUserDrafts();
          if (drafts.length > 0) {
            draftIdToUse = drafts[0].id;
            console.log('📍 DescriptionDetails: Found draftId from getUserDrafts:', draftIdToUse);
            // Also update context draftId if it's not set
            if (!state.draftId && actions.setDraftId) {
              actions.setDraftId(draftIdToUse);
            }
          }
        } catch (error) {
          console.error('📍 DescriptionDetails: Error getting user drafts:', error);
        }
      }
      
      console.log('📍 DescriptionDetails: draftIdToUse (final):', draftIdToUse);
      
      // ALWAYS try loading from Firebase if we have a draftId (most reliable)
      if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
        try {
          console.log('📍 DescriptionDetails: Loading propertyStructure from Firebase with draftId:', draftIdToUse);
          const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
          const docSnap = await getDoc(draftRef);
          
          if (docSnap.exists()) {
            const draftData = docSnap.data();
            console.log('📍 DescriptionDetails: Draft data exists');
            console.log('📍 DescriptionDetails: draftData.data:', draftData.data);
            console.log('📍 DescriptionDetails: draftData.data?.propertyStructure:', draftData.data?.propertyStructure);
            
            // Check nested data first (where PropertyStructure saves it), then top-level
            const structure = draftData.data?.propertyStructure || draftData.propertyStructure;
            console.log('📍 DescriptionDetails: Found structure in Firebase:', structure);
            
            if (structure) {
              const structureLower = structure.toLowerCase();
              console.log('📍 DescriptionDetails: ✅ Setting propertyStructure to:', structureLower);
              setPropertyStructure(structureLower);
              
              // Also update context if it's not set there yet or is different
              if (!state.propertyStructure || state.propertyStructure.toLowerCase() !== structureLower) {
                console.log('📍 DescriptionDetails: Updating context with propertyStructure:', structure);
                if (actions.updatePropertyStructure) {
                  actions.updatePropertyStructure(structure);
                }
              }
              return; // Exit early if we found it in Firebase
            } else {
              console.log('📍 DescriptionDetails: ⚠️ No propertyStructure found in Firebase draft');
              console.log('📍 DescriptionDetails: Available keys in data:', draftData.data ? Object.keys(draftData.data) : 'no data object');
              console.log('📍 DescriptionDetails: Full draftData keys:', Object.keys(draftData));
            }
          } else {
            console.log('📍 DescriptionDetails: ⚠️ Draft document does not exist for draftId:', draftIdToUse);
          }
        } catch (error) {
          console.error('📍 DescriptionDetails: ❌ Error loading propertyStructure from Firebase:', error);
          console.error('📍 DescriptionDetails: Error details:', error.message, error.stack);
        }
      } else {
        console.log('📍 DescriptionDetails: ⚠️ No valid draftId available - draftIdToUse:', draftIdToUse);
        console.log('📍 DescriptionDetails: User authenticated:', !!state.user);
        console.log('📍 DescriptionDetails: User UID:', state.user?.uid);
      }
      
      // Fallback: check context state if Firebase didn't have it
      if (state.propertyStructure && !propertyStructure) {
        const structure = state.propertyStructure.toLowerCase();
        console.log('📍 DescriptionDetails: Using propertyStructure from context (fallback):', structure);
        setPropertyStructure(structure);
      }
    };
    
    loadPropertyStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.draftId, location.state?.draftId, state.user?.uid, location.pathname]);
  
  // Watch for propertyStructure changes in context
  useEffect(() => {
    if (state.propertyStructure) {
      const structure = state.propertyStructure.toLowerCase();
      // Always update if different or not set
      if (!propertyStructure || propertyStructure !== structure) {
        console.log('📍 DescriptionDetails - propertyStructure changed in context, updating:', structure);
        setPropertyStructure(structure);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.propertyStructure]);
  
  // Compute property type reactively - ONLY use propertyStructure (not propertyType)
  const propertyType = useMemo(() => {
    console.log('📍 DescriptionDetails useMemo: RECOMPUTING propertyType');
    console.log('📍 DescriptionDetails useMemo: propertyStructure state:', propertyStructure);
    console.log('📍 DescriptionDetails useMemo: state.propertyStructure:', state.propertyStructure);
    
    // Use local state first (most up-to-date)
    if (propertyStructure) {
      console.log('📍 DescriptionDetails useMemo: ✅ Using propertyStructure state:', propertyStructure);
      return propertyStructure;
    }
    
    // Fallback to context
    if (state.propertyStructure) {
      const structure = state.propertyStructure.toLowerCase();
      console.log('📍 DescriptionDetails useMemo: ✅ Using propertyStructure from context:', structure);
      return structure;
    }
    
    console.log('📍 DescriptionDetails useMemo: ⚠️ Using default "place" - propertyStructure not found!');
    return 'place'; // Default fallback
  }, [
    propertyStructure, 
    state.propertyStructure,
    state?.draftId,
    location.state?.draftId
  ]);
  
  // Debug: Log the location state
  console.log('DescriptionDetails - location.state:', location.state);
  console.log('DescriptionDetails - propertyType:', propertyType);

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      // Only load draft if user is authenticated and we have a draftId
      if (location.state?.draftId && !hasInitialized.current && actions.loadDraft && state.user) {
        console.log('DescriptionDetails - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          hasInitialized.current = true;
          console.log('DescriptionDetails - Draft loaded successfully');
        } catch (error) {
          console.error('DescriptionDetails - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state.user]);

  // Set current step when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'descriptiondetails') {
      console.log('📍 DescriptionDetails page - Setting currentStep to descriptiondetails');
      actions.setCurrentStep('descriptiondetails');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Load description from Firebase when draftId is available
  useEffect(() => {
    const loadDescriptionFromFirebase = async () => {
      let draftIdToUse = state?.draftId || location.state?.draftId;
      
      // If no draftId yet, try to get it from user's drafts
      if (!draftIdToUse && state.user?.uid) {
        try {
          const { getUserDrafts } = await import('@/pages/Host/services/draftService');
          const drafts = await getUserDrafts();
          if (drafts.length > 0) {
            draftIdToUse = drafts[0].id;
            console.log('📍 DescriptionDetails: Found draftId from getUserDrafts:', draftIdToUse);
            if (!state.draftId && actions.setDraftId) {
              actions.setDraftId(draftIdToUse);
            }
          }
        } catch (error) {
          console.error('📍 DescriptionDetails: Error getting user drafts:', error);
        }
      }
      
      // Load description from Firebase if we have a draftId
      if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
        try {
          console.log('📍 DescriptionDetails: Loading description from Firebase with draftId:', draftIdToUse);
          const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
          const docSnap = await getDoc(draftRef);
          
          if (docSnap.exists()) {
            const draftData = docSnap.data();
            console.log('📍 DescriptionDetails: Draft data exists');
            console.log('📍 DescriptionDetails: draftData.data:', draftData.data);
            console.log('📍 DescriptionDetails: draftData.data?.description:', draftData.data?.description);
            
            // Check nested data.description first (where we save it), then top-level, then context
            const savedDescription = draftData.data?.description || draftData.description || state.description;
            
            if (savedDescription && savedDescription.trim()) {
              console.log('📍 DescriptionDetails: ✅ Found saved description, length:', savedDescription.length);
              setDescription(savedDescription);
              
              // Also update context if it's not set there yet or is different
              if (!state.description || state.description !== savedDescription) {
                console.log('📍 DescriptionDetails: Updating context with saved description');
                updateDescriptionContext(savedDescription);
              }
              
              if (!hasInitialized.current) {
                hasInitialized.current = true;
              }
              return; // Exit early if we found it in Firebase
            } else {
              console.log('📍 DescriptionDetails: ⚠️ No description found in Firebase draft');
            }
          } else {
            console.log('📍 DescriptionDetails: ⚠️ Draft document does not exist for draftId:', draftIdToUse);
          }
        } catch (error) {
          console.error('📍 DescriptionDetails: ❌ Error loading description from Firebase:', error);
        }
      }
      
      // Fallback: check context state if Firebase didn't have it
      if (state.description && state.description.trim() && !hasInitialized.current) {
        console.log('📍 DescriptionDetails: Using description from context (fallback):', state.description);
      setDescription(state.description);
        hasInitialized.current = true;
      }
    };
    
    loadDescriptionFromFirebase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.draftId, location.state?.draftId, state.user?.uid, location.pathname]);
  
  // Also watch for description changes in context (as a fallback)
  useEffect(() => {
    if (state.description && state.description.trim() && !hasInitialized.current) {
      console.log('📍 DescriptionDetails: Description changed in context, updating:', state.description);
      setDescription(state.description);
      hasInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.description]);

  // Real-time context updates
  const updateDescriptionContext = (desc) => {
    console.log('DescriptionDetails - Updating context with:', desc);
    if (actions.updateTitleDescription) {
      actions.updateTitleDescription(state.title || '', desc);
    }
    // Removed setCurrentStep from here to prevent setState during render
  };

  // Helper function to ensure we have a valid draftId and save description to Firebase
  const ensureDraftAndSave = async (descriptionData, targetRoute = '/pages/finishsetup') => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
      console.log('📍 DescriptionDetails: Found temp ID, resetting to find/create real draft');
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
          console.log('📍 DescriptionDetails: Using existing draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          console.log('📍 DescriptionDetails: No existing drafts, creating new draft');
          const nextStep = targetRoute === '/pages/finishsetup' ? 'finishsetup' : 'descriptiondetails';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              description: descriptionData.trim()
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          console.log('📍 DescriptionDetails: ✅ Created new draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        console.error('📍 DescriptionDetails: Error finding/creating draft:', error);
        throw error;
      }
    }
    
    // Save to Firebase if we have a valid draftId
    if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
      try {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          // Update existing document - save description under data.description and currentStep
          // Also remove old top-level description field if it exists
          const nextStep = targetRoute === '/pages/finishsetup' ? 'finishsetup' : 'descriptiondetails';
          const trimmedDescription = descriptionData.trim() || "You'll have a great time at this comfortable place to stay.";
          
          console.log('📍 DescriptionDetails: Updating existing draft with description (length):', trimmedDescription.length);
          console.log('📍 DescriptionDetails: Draft ID:', draftIdToUse);
          console.log('📍 DescriptionDetails: Description preview:', trimmedDescription.substring(0, 50) + '...');
          
          // Get current data to check if old description field exists
          const currentData = docSnap.data();
          const updateData = {
            'data.description': trimmedDescription,
            currentStep: nextStep,
            lastModified: new Date()
          };
          
          // Remove old top-level description field if it exists
          if (currentData.description !== undefined) {
            updateData.description = deleteField();
          }
          
          console.log('📍 DescriptionDetails: Update data:', {
            'data.description': trimmedDescription.substring(0, 50) + '...',
            currentStep: nextStep,
            hasOldDescription: currentData.description !== undefined
          });
          
          await updateDoc(draftRef, updateData);
          
          // Verify the save by reading back
          const verifySnap = await getDoc(draftRef);
          if (verifySnap.exists()) {
            const savedData = verifySnap.data();
            console.log('📍 DescriptionDetails: ✅ Verified save - data.description exists:', !!savedData.data?.description);
            console.log('📍 DescriptionDetails: ✅ Verified save - description length:', savedData.data?.description?.length);
            console.log('📍 DescriptionDetails: ✅ Verified save - currentStep:', savedData.currentStep);
            
            if (!savedData.data?.description) {
              console.error('📍 DescriptionDetails: ❌ ERROR - description was not saved!');
              throw new Error('Failed to save description - verification failed');
            }
          }
          
          console.log('📍 DescriptionDetails: ✅ Saved description to data.description and currentStep to Firebase:', draftIdToUse, '- description length:', trimmedDescription.length, ', currentStep:', nextStep);
        } else {
          // Document doesn't exist, create it
          console.log('📍 DescriptionDetails: Document not found, creating new one');
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const nextStep = targetRoute === '/pages/finishsetup' ? 'finishsetup' : 'descriptiondetails';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              description: descriptionData.trim()
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          console.log('📍 DescriptionDetails: ✅ Created new draft with description:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        console.error('📍 DescriptionDetails: ❌ Error saving to Firebase:', error);
        throw error;
      }
    } else if (state.user?.uid) {
      console.warn('📍 DescriptionDetails: ⚠️ User authenticated but no valid draftId after ensureDraftAndSave');
      throw new Error('Failed to create draft for authenticated user');
    } else {
      console.warn('📍 DescriptionDetails: ⚠️ User not authenticated, cannot save to Firebase');
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader customSaveAndExit={handleSaveAndExitClick} />
      <main className="pt-20 px-8 pb-32">
        <div className="space-y-4">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold leading-tight">
                Create your description
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                Share what makes your {propertyType} special.
              </p>
            </div>

            <div className="space-y-4">
              <textarea
                value={description}
                onChange={handleDescriptionChange}
                className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none text-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <div className="text-right text-sm text-gray-500">
                {description.length}/{maxLength}
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={() => {
          // Update sessionStorage before navigating back
          updateSessionStorageBeforeNav('descriptiondetails');
          navigate('/pages/description');
        }}
        onNext={async () => {
          if (canProceed) {
            try {
              // Update context first
              updateDescriptionContext(description);
              
              // Save description to Firebase
              let draftIdToUse;
              try {
                draftIdToUse = await ensureDraftAndSave(description, '/pages/finishsetup');
                console.log('📍 DescriptionDetails: ✅ Saved description to Firebase on Next click');
              } catch (saveError) {
                console.error('📍 DescriptionDetails: Error saving to Firebase on Next:', saveError);
                // Continue navigation even if save fails - data is in context
              }
              
              // Update current step in context
              if (actions.setCurrentStep) {
                actions.setCurrentStep('finishsetup');
              }
              
              // Update sessionStorage before navigating forward
              updateSessionStorageBeforeNav('descriptiondetails', 'finishsetup');
              
              // Navigate to finish setup page
              navigate('/pages/finishsetup', { 
                state: { 
                  ...location.state,
                  description: description,
                  draftId: draftIdToUse || state?.draftId || location.state?.draftId
                } 
              });
            } catch (error) {
              console.error('Error saving description:', error);
              alert('Error saving progress. Please try again.');
            }
          }
        }}
        canProceed={canProceed}
      />
    </div>
  );
};

export default DescriptionDetails;