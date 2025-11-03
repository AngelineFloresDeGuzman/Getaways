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
      console.log('📍 TitleDescription: Initializing propertyStructure from context:', state.propertyStructure);
      return state.propertyStructure.toLowerCase();
    }
    return null;
  });
  
  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      const draftIdToUse = location.state?.draftId || state?.draftId;
      
      if (draftIdToUse && !hasInitialized.current && actions.loadDraft && state.user) {
        console.log('📍 TitleDescription - Loading draft with ID:', draftIdToUse);
        try {
          await actions.loadDraft(draftIdToUse);
          hasInitialized.current = true;
          console.log('📍 TitleDescription - Draft loaded successfully');
          console.log('📍 TitleDescription - After draft load, state.propertyStructure:', state.propertyStructure);
          
          // After draft loads, propertyStructure should be in context
          if (state.propertyStructure) {
            const structure = state.propertyStructure.toLowerCase();
            console.log('📍 TitleDescription - Setting propertyStructure after draft load:', structure);
            setPropertyStructure(structure);
          }
        } catch (error) {
          console.error('📍 TitleDescription - Error loading draft:', error);
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
        console.log('📍 TitleDescription - propertyStructure changed in context, updating:', structure);
        setPropertyStructure(structure);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.propertyStructure]);
  
  // Load propertyStructure - ALWAYS try to load from Firebase
  // Try multiple times: on mount, when draftId becomes available, and when navigating
  useEffect(() => {
    const loadPropertyStructure = async () => {
      console.log('📍 TitleDescription: loadPropertyStructure effect triggered');
      console.log('📍 TitleDescription: state.propertyStructure:', state.propertyStructure);
      console.log('📍 TitleDescription: propertyStructure state:', propertyStructure);
      console.log('📍 TitleDescription: state?.draftId:', state?.draftId);
      console.log('📍 TitleDescription: location.state?.draftId:', location.state?.draftId);
      
      let draftIdToUse = state?.draftId || location.state?.draftId;
      
      // If no draftId yet, try to get it from user's drafts
      if (!draftIdToUse && state.user?.uid) {
        try {
          const { getUserDrafts } = await import('@/pages/Host/services/draftService');
          const drafts = await getUserDrafts();
          if (drafts.length > 0) {
            draftIdToUse = drafts[0].id;
            console.log('📍 TitleDescription: Found draftId from getUserDrafts:', draftIdToUse);
            // Also update context draftId if it's not set
            if (!state.draftId && actions.setDraftId) {
              actions.setDraftId(draftIdToUse);
            }
          }
        } catch (error) {
          console.error('📍 TitleDescription: Error getting user drafts:', error);
        }
      }
      
      console.log('📍 TitleDescription: draftIdToUse (final):', draftIdToUse);
      
      // ALWAYS try loading from Firebase if we have a draftId (most reliable)
      if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
        try {
          console.log('📍 TitleDescription: Loading propertyStructure from Firebase with draftId:', draftIdToUse);
          const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
          const docSnap = await getDoc(draftRef);
          
          if (docSnap.exists()) {
            const draftData = docSnap.data();
            console.log('📍 TitleDescription: Draft data exists');
            console.log('📍 TitleDescription: draftData.data:', draftData.data);
            console.log('📍 TitleDescription: draftData.data?.propertyStructure:', draftData.data?.propertyStructure);
            
            // Check nested data first (where PropertyStructure saves it), then top-level
            const structure = draftData.data?.propertyStructure || draftData.propertyStructure;
            console.log('📍 TitleDescription: Found structure in Firebase:', structure);
            
            if (structure) {
              const structureLower = structure.toLowerCase();
              console.log('📍 TitleDescription: ✅ Setting propertyStructure to:', structureLower);
              setPropertyStructure(structureLower);
              
              // Also update context if it's not set there yet or is different
              if (!state.propertyStructure || state.propertyStructure.toLowerCase() !== structureLower) {
                console.log('📍 TitleDescription: Updating context with propertyStructure:', structure);
                if (actions.updatePropertyStructure) {
                  actions.updatePropertyStructure(structure);
                }
              }
              return; // Exit early if we found it in Firebase
            } else {
              console.log('📍 TitleDescription: ⚠️ No propertyStructure found in Firebase draft');
              console.log('📍 TitleDescription: Available keys in data:', draftData.data ? Object.keys(draftData.data) : 'no data object');
              console.log('📍 TitleDescription: Full draftData keys:', Object.keys(draftData));
            }
          } else {
            console.log('📍 TitleDescription: ⚠️ Draft document does not exist for draftId:', draftIdToUse);
          }
        } catch (error) {
          console.error('📍 TitleDescription: ❌ Error loading propertyStructure from Firebase:', error);
          console.error('📍 TitleDescription: Error details:', error.message, error.stack);
        }
      } else {
        console.log('📍 TitleDescription: ⚠️ No valid draftId available - draftIdToUse:', draftIdToUse);
        console.log('📍 TitleDescription: User authenticated:', !!state.user);
        console.log('📍 TitleDescription: User UID:', state.user?.uid);
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
    console.log('📍 TitleDescription useMemo: RECOMPUTING propertyType');
    console.log('📍 TitleDescription useMemo: propertyStructure state:', propertyStructure);
    console.log('📍 TitleDescription useMemo: state.propertyStructure:', state.propertyStructure);
    
    // Use local state first (most up-to-date)
    if (propertyStructure) {
      console.log('📍 TitleDescription useMemo: ✅ Using propertyStructure state:', propertyStructure);
      return propertyStructure;
    }
    
    // Fallback to context
    if (state.propertyStructure) {
      const structure = state.propertyStructure.toLowerCase();
      console.log('📍 TitleDescription useMemo: ✅ Using propertyStructure from context:', structure);
      return structure;
    }
    
    console.log('📍 TitleDescription useMemo: ⚠️ Using default "house" - propertyStructure not found!');
    console.log('📍 TitleDescription useMemo: Debug info - propertyStructure:', propertyStructure, 'state.propertyStructure:', state.propertyStructure);
    return 'house'; // Default fallback
  }, [
    propertyStructure, 
    state.propertyStructure,
    state?.draftId,
    location.state?.draftId
  ]);
  
  // Debug: Log the location state
  console.log('TitleDescription - location.state:', location.state);
  console.log('TitleDescription - propertyType:', propertyType);
  console.log('TitleDescription - propertyStructure:', propertyStructure);
  
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
        console.log('TitleDescription - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          hasInitialized.current = true;
          console.log('TitleDescription - Draft loaded successfully');
        } catch (error) {
          console.error('TitleDescription - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state.user]); // Added state.user dependency

  // Set current step when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'titledescription') {
      console.log('📍 TitleDescription page - Setting currentStep to titledescription');
      actions.setCurrentStep('titledescription');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Debug logging for title state changes
  useEffect(() => {
    console.log('TitleDescription - title state changed:', title);
    console.log('TitleDescription - context title:', state.title);
    console.log('TitleDescription - hasInitialized:', hasInitialized.current);
    console.log('TitleDescription - location draftId:', location.state?.draftId);
  }, [title, state.title, hasInitialized.current, location.state?.draftId]);

  // Initialize from context if available (after draft loading or direct navigation)
  useEffect(() => {
    if (state.title && (hasInitialized.current || !location.state?.draftId)) {
      console.log('TitleDescription - Initializing from context:', state.title);
      setTitle(state.title);
      if (!hasInitialized.current) {
        hasInitialized.current = true;
      }
    }
  }, [state.title, hasInitialized.current, location.state?.draftId]);

  // Real-time context updates
  const updateTitleContext = (newTitle) => {
    console.log('TitleDescription - Updating context with:', newTitle);
    actions.updateTitleDescription(newTitle, state.description || '');
    // Removed setCurrentStep from here to prevent setState during render
  };

  // Helper function to ensure we have a valid draftId and save title to Firebase
  const ensureDraftAndSave = async (titleData, targetRoute = '/pages/description') => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
      console.log('📍 TitleDescription: Found temp ID, resetting to find/create real draft');
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
          console.log('📍 TitleDescription: Using existing draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          console.log('📍 TitleDescription: No existing drafts, creating new draft');
          const nextStep = targetRoute === '/pages/description' ? 'description' : 'titledescription';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              title: titleData.trim()
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          console.log('📍 TitleDescription: ✅ Created new draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        console.error('📍 TitleDescription: Error finding/creating draft:', error);
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
          console.log('📍 TitleDescription: Document not found, creating new one');
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
          console.log('📍 TitleDescription: ✅ Created new draft with title:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        console.error('📍 TitleDescription: ❌ Error saving to Firebase:', error);
        throw error;
      }
    } else if (state.user?.uid) {
      console.warn('📍 TitleDescription: ⚠️ User authenticated but no valid draftId after ensureDraftAndSave');
      throw new Error('Failed to create draft for authenticated user');
    } else {
      console.warn('📍 TitleDescription: ⚠️ User not authenticated, cannot save to Firebase');
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
    console.log('TitleDescription Save & Exit clicked');
    console.log('Current title:', title);
    
    if (!auth.currentUser) {
      console.error('TitleDescription: No authenticated user');
      alert('Please log in to save your progress');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('TitleDescription: Setting currentStep to titledescription');
        actions.setCurrentStep('titledescription');
      }
      
      // Ensure title is updated in context
      updateTitleContext(title);
      
      // Save title to Firebase under data.title
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(title, '/pages/titledescription');
        console.log('📍 TitleDescription: ✅ Saved title to Firebase on Save & Exit');
      } catch (saveError) {
        console.error('📍 TitleDescription: Error saving to Firebase on Save & Exit:', saveError);
        // Continue with save & exit even if Firebase save fails
      }
      
      // Update sessionStorage before Save & Exit navigation
      updateSessionStorageBeforeNav('titledescription');
        
        // Navigate to dashboard
        navigate('/host/hostdashboard', { 
          state: { 
            message: 'Draft saved successfully!',
            draftSaved: true 
          }
        });
      
    } catch (error) {
      console.error('Error in TitleDescription save:', error);
      alert('Failed to save progress: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Shared Onboarding Header */}
      <OnboardingHeader showProgress={true} />

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
                console.log('📍 TitleDescription: ✅ Saved title to Firebase on Next click');
              } catch (saveError) {
                console.error('📍 TitleDescription: Error saving to Firebase on Next:', saveError);
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
              console.error('Error saving title:', error);
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
