import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, deleteField } from 'firebase/firestore';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';

const TitleDescription = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  const [isSaving, setIsSaving] = useState(false);
  const [propertyStructure, setPropertyStructure] = useState(() => {
    // Initialize from context if available
    if (state.propertyStructure) {
      return state.propertyStructure.toLowerCase();
    }
    return null;
  });
  
  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      const draftIdToUse = location.state?.draftId || state?.draftId;
      
      if (draftIdToUse && !hasInitialized.current && actions.loadDraft && state.user) {
        try {
          await actions.loadDraft(draftIdToUse);
          hasInitialized.current = true;
          // After draft loads, propertyStructure should be in context
          if (state.propertyStructure) {
            const structure = state.propertyStructure.toLowerCase();
            setPropertyStructure(structure);
          }
        } catch (error) {
          }
      }
    };
    loadDraftData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.draftId, state?.draftId, state.user]);
  
  // Watch for propertyStructure changes in context - this will catch updates after draft loads
  useEffect(() => {
    if (state.propertyStructure) {
      const structure = state.propertyStructure.toLowerCase();
      // Always update if different or not set
      if (!propertyStructure || propertyStructure !== structure) {
        setPropertyStructure(structure);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.propertyStructure]);
  
  // Load propertyStructure - ALWAYS try to load from Firebase
  // Try multiple times: on mount, when draftId becomes available, and when navigating
  useEffect(() => {
    const loadPropertyStructure = async () => {
      let draftIdToUse = state?.draftId || location.state?.draftId;
      
      // If no draftId yet, try to get it from user's drafts
      if (!draftIdToUse && state.user?.uid) {
        try {
          const { getUserDrafts } = await import('@/pages/Host/services/draftService');
          const drafts = await getUserDrafts();
          if (drafts.length > 0) {
            draftIdToUse = drafts[0].id;
            // Also update context draftId if it's not set
            if (!state.draftId && actions.setDraftId) {
              actions.setDraftId(draftIdToUse);
            }
          }
        } catch (error) {
          }
      }
      
      console.log('📍 TitleDescription: draftIdToUse (final):', draftIdToUse);
      
      // ALWAYS try loading from Firebase if we have a draftId (most reliable)
      if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
        try {
          const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
          const docSnap = await getDoc(draftRef);
          
          if (docSnap.exists()) {
            const draftData = docSnap.data();
            // Check nested data first (where PropertyStructure saves it), then top-level
            const structure = draftData.data?.propertyStructure || draftData.propertyStructure;
            if (structure) {
              const structureLower = structure.toLowerCase();
              setPropertyStructure(structureLower);
              
              // Also update context if it's not set there yet or is different
              if (!state.propertyStructure || state.propertyStructure.toLowerCase() !== structureLower) {
                if (actions.updatePropertyStructure) {
                  actions.updatePropertyStructure(structure);
                }
              }
              return; // Exit early if we found it in Firebase
            } else {
              console.log('📍 TitleDescription: Available keys in data:', draftData.data ? Object.keys(draftData.data) : 'no data object');
              console.log('📍 TitleDescription: Full draftData keys:', Object.keys(draftData));
            }
          } else {
            }
        } catch (error) {
          }
      } else {
        }
      
      // Fallback: check context state if Firebase didn't have it
      if (state.propertyStructure && !propertyStructure) {
        const structure = state.propertyStructure.toLowerCase();
        console.log('📍 TitleDescription: Using propertyStructure from context (fallback):', structure);
        setPropertyStructure(structure);
      }
    };
    
    loadPropertyStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.draftId, location.state?.draftId, state.user?.uid, location.pathname]);
  
  // Compute property type reactively - ONLY use propertyStructure (not propertyType)
  // propertyStructure comes from PropertyStructure page and is what should be displayed
  const propertyType = useMemo(() => {
    // Use local state first (most up-to-date)
    if (propertyStructure) {
      return propertyStructure;
    }
    
    // Fallback to context
    if (state.propertyStructure) {
      const structure = state.propertyStructure.toLowerCase();
      return structure;
    }
    
    return 'house'; // Default fallback
  }, [
    propertyStructure, 
    state.propertyStructure,
    state?.draftId,
    location.state?.draftId
  ]);
  
  // Debug: Log the location state
  const [title, setTitle] = useState('');
  const maxLength = 50;

  // Ref to track initialization
  const hasInitialized = useRef(false);

  // Save and Exit hook integration
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);

  const canProceed = title.trim().length > 0;

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      // Only load draft if user is authenticated and we have a draftId
      if (location.state?.draftId && !hasInitialized.current && actions.loadDraft && state.user) {
        try {
          await actions.loadDraft(location.state.draftId);
          hasInitialized.current = true;
          } catch (error) {
          }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state.user]); // Added state.user dependency

  // Set current step when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'titledescription') {
      actions.setCurrentStep('titledescription');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Debug logging for title state changes
  useEffect(() => {
    }, [title, state.title, hasInitialized.current, location.state?.draftId]);

  // Initialize from context if available (after draft loading or direct navigation)
  useEffect(() => {
    if (state.title && (hasInitialized.current || !location.state?.draftId)) {
      setTitle(state.title);
      if (!hasInitialized.current) {
        hasInitialized.current = true;
      }
    }
  }, [state.title, hasInitialized.current, location.state?.draftId]);

  // Real-time context updates
  const updateTitleContext = (newTitle) => {
    actions.updateTitleDescription(newTitle, state.description || '');
    // Removed setCurrentStep from here to prevent setState during render
  };

  // Helper function to ensure we have a valid draftId and save title to Firebase
  const ensureDraftAndSave = async (titleData, targetRoute = '/pages/description') => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
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
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          const nextStep = targetRoute === '/pages/description' ? 'description' : 'titledescription';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              title: titleData.trim()
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        throw error;
      }
    }
    
    // Save to Firebase if we have a valid draftId
    if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
      try {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          // Update existing document - save title under data.title and currentStep
          // Also remove old top-level title field if it exists
          const nextStep = targetRoute === '/pages/description' ? 'description' : 'titledescription';
          await updateDoc(draftRef, {
            'data.title': titleData.trim(),
            title: deleteField(), // Remove old top-level title field
            currentStep: nextStep,
            lastModified: new Date()
          });
          console.log('📍 TitleDescription: ✅ Saved title to data.title and currentStep to Firebase:', draftIdToUse, '- title:', titleData.trim(), ', currentStep:', nextStep);
        } else {
          // Document doesn't exist, create it
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const nextStep = targetRoute === '/pages/description' ? 'description' : 'titledescription';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              title: titleData.trim()
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        throw error;
      }
    } else if (state.user?.uid) {
      throw new Error('Failed to create draft for authenticated user');
    } else {
      return null;
    }
  };

  const handleTitleChange = (e) => {
    if (e.target.value.length <= maxLength) {
      const newTitle = e.target.value;
      setTitle(newTitle);
      
      // Update context in real-time
      updateTitleContext(newTitle);
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
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        actions.setCurrentStep('titledescription');
      }
      
      // Ensure title is updated in context
      updateTitleContext(title);
      
      // Save title to Firebase under data.title
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(title, '/pages/titledescription');
        } catch (saveError) {
        // Continue with save & exit even if Firebase save fails
      }
      
      // Update sessionStorage before Save & Exit navigation
      updateSessionStorageBeforeNav('titledescription');
        
        // Navigate to dashboard
        navigate('/host/listings', { 
          state: { 
            message: 'Draft saved successfully!',
            draftSaved: true 
          }
        });
      
    } catch (error) {
      alert('Failed to save progress: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Shared Onboarding Header */}
      <OnboardingHeader showProgress={true} customSaveAndExit={handleSaveAndExitClick} />

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-medium text-gray-900 mb-4">
              Now, let's give your {propertyType} a title
            </h1>
            <p className="text-lg text-gray-600">
              Short titles work best. Have fun with it—you can always change it later.
            </p>
          </div>

          <div className="space-y-4">
            <textarea
              value={title}
              onChange={handleTitleChange}
              placeholder=""
              className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none text-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <div className="text-right text-sm text-gray-500">
              {title.length}/{maxLength}
            </div>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={() => {
          // Update sessionStorage before navigating back
          updateSessionStorageBeforeNav('titledescription');
          navigate('/pages/photos');
        }}
        onNext={async () => {
          if (canProceed) {
            try {
              // Update context first
            updateTitleContext(title);
              
              // Save to Firebase
              let draftIdToUse;
              try {
                draftIdToUse = await ensureDraftAndSave(title, '/pages/description');
                } catch (saveError) {
                // Continue navigation even if save fails - data is in context
              }
              
              // Update current step in context
              if (actions.setCurrentStep) {
                actions.setCurrentStep('description');
              }
              
              // Update sessionStorage before navigating forward
              updateSessionStorageBeforeNav('titledescription', 'description');
              
              // Navigate to description page
            navigate('/pages/description', { 
              state: { 
                ...location.state,
                  title: title,
                  draftId: draftIdToUse || state?.draftId || location.state?.draftId
              } 
            });
            } catch (error) {
              alert('Error saving progress. Please try again.');
            }
          }
        }}
        backText="Back"
        nextText="Next"
        canProceed={canProceed}
      />
    </div>
  );
};

export default TitleDescription;
