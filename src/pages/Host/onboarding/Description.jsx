import React, { useState, useEffect, useRef, useMemo } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const Description = () => {
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
      console.log('📍 Description: Initializing propertyStructure from context:', state.propertyStructure);
      return state.propertyStructure.toLowerCase();
    }
    return null;
  });
  
  const [selectedHighlights, setSelectedHighlights] = useState([]);

  // Ref to track initialization
  const hasInitialized = useRef(false);

  const highlights = [
    { id: 'accessible', label: 'Accessible', icon: '♿' },
    { id: 'adventurous', label: 'Adventurous', icon: '🗻' },
    { id: 'artistic', label: 'Artistic', icon: '🎨' },
    { id: 'authentic', label: 'Authentic', icon: '🎭' },
    { id: 'bohemian', label: 'Bohemian', icon: '🎭' },
    { id: 'breathtaking', label: 'Breathtaking', icon: '😍' },
    { id: 'budget-friendly', label: 'Budget-friendly', icon: '💰' },
    { id: 'central', label: 'Central', icon: '📍' },
    { id: 'charming', label: 'Charming', icon: '💫' },
    { id: 'compact', label: 'Compact', icon: '📦' },
    { id: 'cozy', label: 'Cozy', icon: '🛋️' },
    { id: 'couple-perfect', label: 'Couple-perfect', icon: '💑' },
    { id: 'eco-friendly', label: 'Eco-friendly', icon: '🌱' },
    { id: 'elegant', label: 'Elegant', icon: '✨' },
    { id: 'energetic', label: 'Energetic', icon: '⚡' },
    { id: 'family-friendly', label: 'Family-friendly', icon: '👨‍👩‍👧‍👦' },
    { id: 'festive', label: 'Festive', icon: '🎉' },
    { id: 'historic', label: 'Historic', icon: '🏰' },
    { id: 'industrial', label: 'Industrial', icon: '🏭' },
    { id: 'inspiring', label: 'Inspiring', icon: '💡' },
    { id: 'luxury', label: 'Luxury', icon: '💎' },
    { id: 'minimalist', label: 'Minimalist', icon: '⬜' },
    { id: 'modern', label: 'Modern', icon: '🏗️' },
    { id: 'one-of-a-kind', label: 'One-of-a-kind', icon: '🎯' },
    { id: 'peaceful', label: 'Peaceful', icon: '🕊️' },
    { id: 'pet-friendly', label: 'Pet-friendly', icon: '🐾' },
    { id: 'picturesque', label: 'Picturesque', icon: '🖼️' },
    { id: 'quaint', label: 'Quaint', icon: '🏡' },
    { id: 'quiet', label: 'Quiet', icon: '🤫' },
    { id: 'quirky', label: 'Quirky', icon: '🎪' },
    { id: 'relaxing', label: 'Relaxing', icon: '😌' },
    { id: 'romantic', label: 'Romantic', icon: '💕' },
    { id: 'roomy', label: 'Roomy', icon: '📏' },
    { id: 'rural', label: 'Rural', icon: '🌾' },
    { id: 'rustic', label: 'Rustic', icon: '🪵' },
    { id: 'safe', label: 'Safe', icon: '🛡️' },
    { id: 'scandinavian', label: 'Scandinavian', icon: '❄️' },
    { id: 'secluded', label: 'Secluded', icon: '🌲' },
    { id: 'secure', label: 'Secure', icon: '🔒' },
    { id: 'solo-friendly', label: 'Solo-friendly', icon: '🧳' },
    { id: 'spacious', label: 'Spacious', icon: '📐' },
    { id: 'stylish', label: 'Stylish', icon: '🎨' },
    { id: 'sunny', label: 'Sunny', icon: '☀️' },
    { id: 'traditional', label: 'Traditional', icon: '🏛️' },
    { id: 'tranquil', label: 'Tranquil', icon: '🌊' },
    { id: 'tropical', label: 'Tropical', icon: '🌴' },
    { id: 'unique', label: 'Unique', icon: '✨' },
    { id: 'urban', label: 'Urban', icon: '🏙️' },
    { id: 'vibrant', label: 'Vibrant', icon: '🌈' },
    { id: 'vintage', label: 'Vintage', icon: '📻' },
    { id: 'walkable', label: 'Walkable', icon: '🚶' },
    { id: 'zen', label: 'Zen', icon: '🧘' }
  ];

  const toggleHighlight = (highlightId) => {
    setSelectedHighlights(prev => {
      let newHighlights;
      if (prev.includes(highlightId)) {
        newHighlights = prev.filter(id => id !== highlightId);
      } else if (prev.length < 2) {
        newHighlights = [...prev, highlightId];
      } else {
        return prev; // No change if already at max
      }
      
      // Update context in real-time (defer to avoid setState during render)
      setTimeout(() => {
      updateHighlightsContext(newHighlights);
      }, 0);
      
      return newHighlights;
    });
  };

  // Helper function to ensure we have a valid draftId and save highlights to Firebase
  const ensureDraftAndSave = async (highlightsData, targetRoute = '/pages/descriptiondetails') => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
      console.log('📍 Description: Found temp ID, resetting to find/create real draft');
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
          console.log('📍 Description: Using existing draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          console.log('📍 Description: No existing drafts, creating new draft');
          const nextStep = targetRoute === '/pages/descriptiondetails' ? 'descriptiondetails' : 'description';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              descriptionHighlights: highlightsData || []
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          console.log('📍 Description: ✅ Created new draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        console.error('📍 Description: Error finding/creating draft:', error);
        throw error;
      }
    }
    
    // Save to Firebase if we have a valid draftId
    if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
      try {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          // Update existing document - save highlights under data.descriptionHighlights and currentStep
          const nextStep = targetRoute === '/pages/descriptiondetails' ? 'descriptiondetails' : 'description';
          await updateDoc(draftRef, {
            'data.descriptionHighlights': highlightsData || [],
            currentStep: nextStep,
            lastModified: new Date()
          });
          console.log('📍 Description: ✅ Saved highlights to data.descriptionHighlights and currentStep to Firebase:', draftIdToUse, '- highlights:', highlightsData || [], ', currentStep:', nextStep);
        } else {
          // Document doesn't exist, create it
          console.log('📍 Description: Document not found, creating new one');
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const nextStep = targetRoute === '/pages/descriptiondetails' ? 'descriptiondetails' : 'description';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              descriptionHighlights: highlightsData || []
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          console.log('📍 Description: ✅ Created new draft with highlights:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        console.error('📍 Description: ❌ Error saving to Firebase:', error);
        throw error;
      }
    } else if (state.user?.uid) {
      console.warn('📍 Description: ⚠️ User authenticated but no valid draftId after ensureDraftAndSave');
      throw new Error('Failed to create draft for authenticated user');
    } else {
      console.warn('📍 Description: ⚠️ User not authenticated, cannot save to Firebase');
      return null;
    }
  };

  // Custom Save & Exit handler
  const handleSaveAndExitClick = async () => {
    console.log('Description Save & Exit clicked');
    console.log('Current highlights:', selectedHighlights);
    
    if (!auth.currentUser) {
      console.error('Description: No authenticated user');
      alert('Please log in to save your progress');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('Description: Setting currentStep to description');
        actions.setCurrentStep('description');
      }
      
      // Ensure highlights are updated in context
      updateHighlightsContext(selectedHighlights);
      
      // Save highlights to Firebase under data.descriptionHighlights
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(selectedHighlights, '/pages/description');
        console.log('📍 Description: ✅ Saved highlights to Firebase on Save & Exit');
      } catch (saveError) {
        console.error('📍 Description: Error saving to Firebase on Save & Exit:', saveError);
        // Continue with save & exit even if Firebase save fails
      }
        
        // Navigate to dashboard
        navigate('/host/listings', { 
          state: { 
            message: 'Draft saved successfully!',
            draftSaved: true 
          }
        });
      
    } catch (error) {
      console.error('Error in Description save:', error);
      alert('Failed to save progress: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = true; // Highlights selection is optional

  // Load propertyStructure - ALWAYS try to load from Firebase
  // Try multiple times: on mount, when draftId becomes available, and when navigating
  useEffect(() => {
    const loadPropertyStructure = async () => {
      console.log('📍 Description: loadPropertyStructure effect triggered');
      console.log('📍 Description: state.propertyStructure:', state.propertyStructure);
      console.log('📍 Description: propertyStructure state:', propertyStructure);
      console.log('📍 Description: state?.draftId:', state?.draftId);
      console.log('📍 Description: location.state?.draftId:', location.state?.draftId);
      
      let draftIdToUse = state?.draftId || location.state?.draftId;
      
      // If no draftId yet, try to get it from user's drafts
      if (!draftIdToUse && state.user?.uid) {
        try {
          const { getUserDrafts } = await import('@/pages/Host/services/draftService');
          const drafts = await getUserDrafts();
          if (drafts.length > 0) {
            draftIdToUse = drafts[0].id;
            console.log('📍 Description: Found draftId from getUserDrafts:', draftIdToUse);
            // Also update context draftId if it's not set
            if (!state.draftId && actions.setDraftId) {
              actions.setDraftId(draftIdToUse);
            }
          }
        } catch (error) {
          console.error('📍 Description: Error getting user drafts:', error);
        }
      }
      
      console.log('📍 Description: draftIdToUse (final):', draftIdToUse);
      
      // ALWAYS try loading from Firebase if we have a draftId (most reliable)
      if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
        try {
          console.log('📍 Description: Loading propertyStructure from Firebase with draftId:', draftIdToUse);
          const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
          const docSnap = await getDoc(draftRef);
          
          if (docSnap.exists()) {
            const draftData = docSnap.data();
            console.log('📍 Description: Draft data exists');
            console.log('📍 Description: draftData.data:', draftData.data);
            console.log('📍 Description: draftData.data?.propertyStructure:', draftData.data?.propertyStructure);
            
            // Check nested data first (where PropertyStructure saves it), then top-level
            const structure = draftData.data?.propertyStructure || draftData.propertyStructure;
            console.log('📍 Description: Found structure in Firebase:', structure);
            
            if (structure) {
              const structureLower = structure.toLowerCase();
              console.log('📍 Description: ✅ Setting propertyStructure to:', structureLower);
              setPropertyStructure(structureLower);
              
              // Also update context if it's not set there yet or is different
              // Wrap in setTimeout to avoid setState during render
              if (!state.propertyStructure || state.propertyStructure.toLowerCase() !== structureLower) {
                console.log('📍 Description: Updating context with propertyStructure:', structure);
                setTimeout(() => {
                  if (actions?.updatePropertyStructure) {
                    actions.updatePropertyStructure(structure);
                  }
                }, 0);
              }
              return; // Exit early if we found it in Firebase
            } else {
              console.log('📍 Description: ⚠️ No propertyStructure found in Firebase draft');
              console.log('📍 Description: Available keys in data:', draftData.data ? Object.keys(draftData.data) : 'no data object');
              console.log('📍 Description: Full draftData keys:', Object.keys(draftData));
            }
          } else {
            console.log('📍 Description: ⚠️ Draft document does not exist for draftId:', draftIdToUse);
          }
        } catch (error) {
          console.error('📍 Description: ❌ Error loading propertyStructure from Firebase:', error);
          console.error('📍 Description: Error details:', error.message, error.stack);
        }
      } else {
        console.log('📍 Description: ⚠️ No valid draftId available - draftIdToUse:', draftIdToUse);
        console.log('📍 Description: User authenticated:', !!state.user);
        console.log('📍 Description: User UID:', state.user?.uid);
      }
      
      // Fallback: check context state if Firebase didn't have it
      if (state.propertyStructure && !propertyStructure) {
        const structure = state.propertyStructure.toLowerCase();
        console.log('📍 Description: Using propertyStructure from context (fallback):', structure);
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
        console.log('📍 Description - propertyStructure changed in context, updating:', structure);
        setPropertyStructure(structure);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.propertyStructure]);
  
  // Compute property type reactively - ONLY use propertyStructure (not propertyType)
  const propertyType = useMemo(() => {
    console.log('📍 Description useMemo: RECOMPUTING propertyType');
    console.log('📍 Description useMemo: propertyStructure state:', propertyStructure);
    console.log('📍 Description useMemo: state.propertyStructure:', state.propertyStructure);
    
    // Use local state first (most up-to-date)
    if (propertyStructure) {
      console.log('📍 Description useMemo: ✅ Using propertyStructure state:', propertyStructure);
      return propertyStructure;
    }
    
    // Fallback to context
    if (state.propertyStructure) {
      const structure = state.propertyStructure.toLowerCase();
      console.log('📍 Description useMemo: ✅ Using propertyStructure from context:', structure);
      return structure;
    }
    
    console.log('📍 Description useMemo: ⚠️ Using default "house" - propertyStructure not found!');
    return 'house'; // Default fallback
  }, [
    propertyStructure, 
    state.propertyStructure,
    state?.draftId,
    location.state?.draftId
  ]);

  // Debug: Log the location state
  console.log('Description - location.state:', location.state);
  console.log('Description - propertyType:', propertyType);

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      // Only load draft if user is authenticated and we have a draftId
      if (location.state?.draftId && !hasInitialized.current && actions.loadDraft && state.user) {
        console.log('Description - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          hasInitialized.current = true;
          console.log('Description - Draft loaded successfully');
        } catch (error) {
          console.error('Description - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state.user]);

  // Set current step when component mounts or route changes (wrapped to avoid setState during render)
  useEffect(() => {
    // Use setTimeout to ensure this runs after render
    const timer = setTimeout(() => {
      if (actions?.setCurrentStep && state.currentStep !== 'description') {
      console.log('📍 Description page - Setting currentStep to description');
      actions.setCurrentStep('description');
    }
    }, 0);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Load descriptionHighlights from Firebase when navigating back
  useEffect(() => {
    const loadHighlightsFromFirebase = async () => {
      const draftIdToUse = state?.draftId || location.state?.draftId;
      
      // If we have a draftId, load highlights from Firebase
      if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
        try {
          console.log('📍 Description: Loading descriptionHighlights from Firebase with draftId:', draftIdToUse);
          const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
          const docSnap = await getDoc(draftRef);
          
          if (docSnap.exists()) {
            const draftData = docSnap.data();
            const highlightsFromFirebase = draftData.data?.descriptionHighlights || [];
            
            if (highlightsFromFirebase.length > 0) {
              console.log('📍 Description: ✅ Loaded highlights from Firebase:', highlightsFromFirebase);
              setSelectedHighlights(highlightsFromFirebase);
              
              // Also update context
              if (actions.updateDescriptionHighlights) {
                actions.updateDescriptionHighlights(highlightsFromFirebase);
              }
            } else {
              console.log('📍 Description: No highlights found in Firebase (empty array or not set)');
            }
          }
        } catch (error) {
          console.error('📍 Description: ❌ Error loading highlights from Firebase:', error);
        }
      }
    };
    
    loadHighlightsFromFirebase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.draftId, location.state?.draftId, location.pathname]);

  // Initialize from context if available (after draft loading or direct navigation)
  useEffect(() => {
    if (state.descriptionHighlights && (hasInitialized.current || !location.state?.draftId)) {
      console.log('Description - Initializing from context:', state.descriptionHighlights);
      setSelectedHighlights(state.descriptionHighlights);
      if (!hasInitialized.current) {
        hasInitialized.current = true;
      }
    }
  }, [state.descriptionHighlights, hasInitialized.current, location.state?.draftId]);

  // Real-time context updates
  const updateHighlightsContext = (highlights) => {
    console.log('Description - Updating context with:', highlights);
    if (actions.updateDescriptionHighlights) {
      actions.updateDescriptionHighlights(highlights);
    }
    // Removed setCurrentStep from here to prevent setState during render
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader customSaveAndExit={handleSaveAndExitClick} />
      <main className="pt-32 px-8 pb-32">
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-medium text-gray-900 mb-2">
              Next, let's describe your {propertyType}
            </h1>
            <p className="text-gray-600">
              Choose up to 2 highlights. We'll use these to get your description started.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {highlights.map((highlight) => (
            <button
              key={highlight.id}
              onClick={() => toggleHighlight(highlight.id)}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                selectedHighlights.includes(highlight.id)
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${
                !selectedHighlights.includes(highlight.id) && selectedHighlights.length >= 2
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
              disabled={!selectedHighlights.includes(highlight.id) && selectedHighlights.length >= 2}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{highlight.icon}</span>
                <span className="text-lg font-medium">{highlight.label}</span>
              </div>
            </button>
          ))}
        </div>
        
        {selectedHighlights.length > 0 && (
          <div className="text-center text-sm text-gray-500 mt-4">
            {selectedHighlights.length} of 2 highlights selected
          </div>
        )}
        </div>
      </main>

      {/* Footer */}
      <OnboardingFooter
        onBack={() => {
          // Update sessionStorage BEFORE navigating to ensure progress bar detects backward movement
          // This is critical - we need to set the previous step as 'description' so when 
          // titledescription loads, it knows we came from a later step in the same group
          const storagePrevStepKey = 'onb_prev_step_name';
          const storageStepKey = 'onb_progress_step';
          const storageKey = 'onb_progress_value';
          
          // Calculate current step's progress for sessionStorage (description is index 4 of 6 in Step 2)
          const stepGroups = {
            2: ['makeitstandout', 'amenities', 'photos', 'titledescription', 'description', 'descriptiondetails']
          };
          const currentIndex = stepGroups[2].indexOf('description');
          const currentProgress = currentIndex >= 0 ? ((currentIndex + 1) / stepGroups[2].length) * 100 : 83.33;
          
          // CRITICAL: Set 'description' as the previous step before navigating
          // When titledescription loads, it will read this and detect backward navigation
          // (description index 4 > titledescription index 3)
          sessionStorage.setItem(storagePrevStepKey, 'description');
          sessionStorage.setItem(storageStepKey, '2');
          sessionStorage.setItem(storageKey, String(currentProgress));
          
          // Small delay to ensure sessionStorage is written before navigation
          setTimeout(() => {
            // Update context after render to avoid setState during render warning
            if (actions.setCurrentStep) {
              actions.setCurrentStep('description');
            }
            navigate('/pages/titledescription');
          }, 0);
        }}
        onNext={async () => {
          if (canProceed) {
            try {
              // Update context first
            updateHighlightsContext(selectedHighlights);
              
              // Save highlights to Firebase
              let draftIdToUse;
              try {
                draftIdToUse = await ensureDraftAndSave(selectedHighlights, '/pages/descriptiondetails');
                console.log('📍 Description: ✅ Saved highlights to Firebase on Next click');
              } catch (saveError) {
                console.error('📍 Description: Error saving to Firebase on Next:', saveError);
                // Continue navigation even if save fails - data is in context
              }
              
              // Navigate to description details page
              // Defer setCurrentStep to avoid setState during render
              setTimeout(() => {
                if (actions.setCurrentStep) {
                  actions.setCurrentStep('descriptiondetails');
                }
            navigate('/pages/descriptiondetails', { 
              state: { 
                ...location.state,
                    descriptionHighlights: selectedHighlights,
                    draftId: draftIdToUse || state?.draftId || location.state?.draftId
              } 
            });
              }, 0);
            } catch (error) {
              console.error('Error saving highlights:', error);
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

export default Description;