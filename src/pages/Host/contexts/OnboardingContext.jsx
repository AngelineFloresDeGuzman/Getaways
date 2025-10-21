import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveDraft, loadDraft } from '@/pages/Host/services/draftService';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Initial state for onboarding
const initialState = {
  // Property Details
  propertyType: null,
  
  // Property Structure
  propertyStructure: null,
  
  // Privacy Type
  privacyType: null,
  
  // Location
  locationData: {
    country: 'Philippines',
    unit: '',
    building: '',
    street: '',
    barangay: '',
    city: '',
    zipCode: '',
    province: '',
    showPreciseLocation: false,
    latitude: null,
    longitude: null,
    address: ''
  },
  
  // Property Basics
  guestCapacity: 1,
  guests: 4,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  
  // Highlights/Make It Stand Out
  highlights: [],
  
  // Amenities
  selectedAmenities: [],
  
  // Photos
  photos: [],
  
  // Title & Description
  title: '',
  description: '',
  
  // Pricing
  weekdayPrice: 0,
  weekendPrice: 0,
  
  // Weekend Pricing
  weekendPricingEnabled: false,
  
  // Discounts
  discounts: {
    weekly: 0,
    monthly: 0,
    earlyBird: 0
  },
  
  // Guest Selection
  instantBook: false,
  guestRequirements: [],
  selectedGuestOption: 'any-guest',
  
  // Booking Settings
  advanceNotice: '1_day',
  preparationTime: '1_day',
  availabilityWindow: '3_months',
  
  // Safety Details
  safetyAmenities: [],
  
  // Final Details
  houseRules: [],
  cancellationPolicy: 'flexible',
  
  // Meta
  currentStep: 'property-details',
  user: null,
  isLoading: false,
  draftId: null,
  lastSaved: null
};

// Action types
const ACTIONS = {
  SET_USER: 'SET_USER',
  SET_LOADING: 'SET_LOADING',
  SET_CURRENT_STEP: 'SET_CURRENT_STEP',
  SET_DRAFT_ID: 'SET_DRAFT_ID',
  UPDATE_PROPERTY_TYPE: 'UPDATE_PROPERTY_TYPE',
  UPDATE_PROPERTY_STRUCTURE: 'UPDATE_PROPERTY_STRUCTURE',
  UPDATE_PRIVACY_TYPE: 'UPDATE_PRIVACY_TYPE',
  UPDATE_LOCATION_DATA: 'UPDATE_LOCATION_DATA',
  UPDATE_PROPERTY_BASICS: 'UPDATE_PROPERTY_BASICS',
  UPDATE_HIGHLIGHTS: 'UPDATE_HIGHLIGHTS',
  UPDATE_AMENITIES: 'UPDATE_AMENITIES',
  UPDATE_PHOTOS: 'UPDATE_PHOTOS',
  UPDATE_TITLE_DESCRIPTION: 'UPDATE_TITLE_DESCRIPTION',
  UPDATE_PRICING: 'UPDATE_PRICING',
  UPDATE_WEEKEND_PRICING: 'UPDATE_WEEKEND_PRICING',
  UPDATE_DISCOUNTS: 'UPDATE_DISCOUNTS',
  UPDATE_GUEST_SELECTION: 'UPDATE_GUEST_SELECTION',
  UPDATE_BOOKING_SETTINGS: 'UPDATE_BOOKING_SETTINGS',
  UPDATE_SAFETY_DETAILS: 'UPDATE_SAFETY_DETAILS',
  UPDATE_FINAL_DETAILS: 'UPDATE_FINAL_DETAILS',
  LOAD_DRAFT: 'LOAD_DRAFT',
  RESET_STATE: 'RESET_STATE'
};

// Reducer function
const onboardingReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_USER:
      return { ...state, user: action.payload };
    
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    
    case ACTIONS.SET_CURRENT_STEP:
      return { ...state, currentStep: action.payload };
    
    case ACTIONS.SET_DRAFT_ID:
      return { ...state, draftId: action.payload };
    
    case ACTIONS.UPDATE_PROPERTY_TYPE:
      return { ...state, propertyType: action.payload };
    
    case ACTIONS.UPDATE_PROPERTY_STRUCTURE:
      return { ...state, propertyStructure: action.payload };
    
    case ACTIONS.UPDATE_PRIVACY_TYPE:
      return { ...state, privacyType: action.payload };
    
    case ACTIONS.UPDATE_LOCATION_DATA:
      return { ...state, locationData: { ...state.locationData, ...action.payload } };
    
    case ACTIONS.UPDATE_PROPERTY_BASICS:
      return { ...state, ...action.payload };
    
    case ACTIONS.UPDATE_HIGHLIGHTS:
      return { ...state, highlights: action.payload };
    
    case ACTIONS.UPDATE_AMENITIES:
      return { ...state, selectedAmenities: action.payload };
    
    case ACTIONS.UPDATE_PHOTOS:
      return { ...state, photos: action.payload };
    
    case ACTIONS.UPDATE_TITLE_DESCRIPTION:
      return { ...state, title: action.payload.title, description: action.payload.description };
    
    case ACTIONS.UPDATE_PRICING:
      return { ...state, weekdayPrice: action.payload.weekdayPrice, weekendPrice: action.payload.weekendPrice };
    
    case ACTIONS.UPDATE_WEEKEND_PRICING:
      return { ...state, weekendPricingEnabled: action.payload.enabled, weekendPrice: action.payload.price };
    
    case ACTIONS.UPDATE_DISCOUNTS:
      return { ...state, discounts: { ...state.discounts, ...action.payload } };
    
    case ACTIONS.UPDATE_GUEST_SELECTION:
      return { 
        ...state, 
        instantBook: action.payload.instantBook || state.instantBook,
        guestRequirements: action.payload.guestRequirements || state.guestRequirements,
        selectedGuestOption: action.payload.selectedGuestOption || state.selectedGuestOption
      };
    
    case ACTIONS.UPDATE_BOOKING_SETTINGS:
      return { ...state, ...action.payload };
    
    case ACTIONS.UPDATE_SAFETY_DETAILS:
      return { ...state, safetyAmenities: action.payload };
    
    case ACTIONS.UPDATE_FINAL_DETAILS:
      return { ...state, houseRules: action.payload.houseRules, cancellationPolicy: action.payload.cancellationPolicy };
    
    case ACTIONS.LOAD_DRAFT:
      // Preserve user and loading state while loading all draft data
      const { user, isLoading, ...draftData } = action.payload;
      return { 
        ...state, 
        ...draftData,
        user: state.user, // Keep current user
        isLoading: state.isLoading, // Keep current loading state
        lastSaved: new Date().toISOString()
      };
    
    case ACTIONS.RESET_STATE:
      return { ...initialState, user: state.user };
    
    default:
      return state;
  }
};

// Context
const OnboardingContext = createContext();

// Provider component
export const OnboardingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const navigate = useNavigate();

  // Listen to auth state changes and migrate localStorage data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const wasUnauthenticated = !state.user;
      dispatch({ type: ACTIONS.SET_USER, payload: user });
      
      // If user just authenticated and we have localStorage data, migrate it
      if (user && wasUnauthenticated) {
        const tempDraftKey = 'getaways_temp_onboarding_draft';
        const tempDraftData = localStorage.getItem(tempDraftKey);
        
        if (tempDraftData) {
          try {
            console.log('User authenticated, migrating localStorage data to Firebase...');
            const parsedData = JSON.parse(tempDraftData);
            
            // Remove temporary keys and save to Firebase
            const { savedAt, tempId, ...dataToSave } = parsedData;
            const draftId = await saveDraft(dataToSave);
            
            // Update the draft ID in state
            dispatch({ type: ACTIONS.SET_DRAFT_ID, payload: draftId });
            
            // Clear localStorage data after successful migration
            localStorage.removeItem(tempDraftKey);
            console.log('Successfully migrated localStorage data to Firebase');
          } catch (error) {
            console.error('Error migrating localStorage data to Firebase:', error);
            // Keep localStorage data if migration fails
          }
        }
      }
    });

    return () => unsubscribe();
  }, [state.user]);

  // Load temporary data from localStorage on initialization
  useEffect(() => {
    const tempDraftKey = 'getaways_temp_onboarding_draft';
    const tempDraftData = localStorage.getItem(tempDraftKey);
    
    if (tempDraftData) {
      try {
        const parsedData = JSON.parse(tempDraftData);
        console.log('Loading temporary draft from localStorage:', parsedData);
        
        // Dispatch actions to restore the state
        Object.keys(parsedData).forEach(key => {
          if (key !== 'savedAt' && key !== 'tempId') {
            // Map the data back to state using appropriate actions
            switch (key) {
              case 'propertyType':
                dispatch({ type: ACTIONS.UPDATE_PROPERTY_TYPE, payload: parsedData[key] });
                break;
              case 'propertyStructure':
                dispatch({ type: ACTIONS.UPDATE_PROPERTY_STRUCTURE, payload: parsedData[key] });
                break;
              case 'privacyType':
                dispatch({ type: ACTIONS.UPDATE_PRIVACY_TYPE, payload: parsedData[key] });
                break;
              case 'locationData':
                dispatch({ type: ACTIONS.UPDATE_LOCATION_DATA, payload: parsedData[key] });
                break;
              case 'selectedAmenities':
                dispatch({ type: ACTIONS.UPDATE_AMENITIES, payload: parsedData[key] });
                break;
              case 'currentStep':
                dispatch({ type: ACTIONS.SET_CURRENT_STEP, payload: parsedData[key] });
                break;
              case 'draftId':
                dispatch({ type: ACTIONS.SET_DRAFT_ID, payload: parsedData.tempId });
                break;
              // Add more cases as needed for other state properties
            }
          }
        });
      } catch (error) {
        console.error('Error loading temporary draft from localStorage:', error);
        // Clear corrupted data
        localStorage.removeItem(tempDraftKey);
      }
    }
  }, []);

  // Individual callbacks for functions that depend on state
  const saveDraftCallback = useCallback(async () => {
    try {
      console.log('OnboardingContext: Starting saveDraft...');
      
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      
      // Remove user and isLoading from the data to save
      const { user, isLoading, ...dataToSave } = state;
      
      // If user is not authenticated, save to localStorage temporarily
      if (!state.user) {
        console.log('User not authenticated, saving to localStorage...');
        
        // Save to localStorage with a temporary draft key
        const tempDraftKey = 'getaways_temp_onboarding_draft';
        const tempDraftData = {
          ...dataToSave,
          savedAt: new Date().toISOString(),
          tempId: 'temp_' + Date.now()
        };
        
        localStorage.setItem(tempDraftKey, JSON.stringify(tempDraftData));
        console.log('Temporary draft saved to localStorage');
        
        // Set a temporary draft ID for UI consistency
        dispatch({ type: ACTIONS.SET_DRAFT_ID, payload: tempDraftData.tempId });
        
        return tempDraftData.tempId;
      }
      
      // User is authenticated, save to Firebase
      console.log('User authenticated, saving to Firebase...');
      console.log('Saving draft with ID:', state.draftId);
      console.log('Current step:', state.currentStep);
      
      // Ensure currentStep is set if not already
      if (!dataToSave.currentStep) {
        dataToSave.currentStep = 'property-details';
      }
      
      console.log('Full data being saved:', dataToSave);
      
      const draftId = await saveDraft(dataToSave, state.draftId);
      console.log('Received draftId from service:', draftId);
      
      // Always update the draftId in state, even if it was the same
      // This ensures the context knows about the draft for future saves
      dispatch({ type: ACTIONS.SET_DRAFT_ID, payload: draftId });
      
      console.log('OnboardingContext: saveDraft completed successfully');
      return draftId;
    } catch (error) {
      console.error('Error saving draft:', error);
      throw error;
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  }, [state]);

  // Auto-save when important data changes (debounced) 
  useEffect(() => {
    let autoSaveTimeout;
    
    // Auto-save if we have some data and are not on the first step
    if (state.currentStep && state.currentStep !== 'property-details') {
      // Check if we have meaningful data to save
      const hasData = state.propertyType || 
                     state.locationData?.address || 
                     state.photos?.length > 0 || 
                     state.title || 
                     state.selectedAmenities?.length > 0;
      
      if (hasData && !state.isLoading) {
        const storageType = state.user ? 'Firebase' : 'localStorage';
        console.log(`OnboardingContext: Scheduling auto-save for step: ${state.currentStep} (${storageType})`);
        
        autoSaveTimeout = setTimeout(async () => {
          try {
            await saveDraftCallback();
            console.log('OnboardingContext: Auto-save completed');
          } catch (error) {
            console.error('OnboardingContext: Auto-save failed:', error);
            // Don't throw error for auto-save failures
          }
        }, 3000); // 3-second debounce
      }
    }

    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [
    state.user,
    state.currentStep,
    state.propertyType,
    state.propertyStructure,
    state.privacyType,
    state.locationData,
    state.guestCapacity,
    state.bedrooms,
    state.bathrooms,
    state.highlights,
    state.selectedAmenities,
    state.photos,
    state.title,
    state.description,
    state.weekdayPrice,
    state.weekendPrice,
    saveDraftCallback
  ]);

  const saveAndExitCallback = useCallback(async () => {
    try {
      console.log('OnboardingContext: Starting saveAndExit...');
      const draftId = await saveDraftCallback();
      console.log('OnboardingContext: saveDraft completed, draftId:', draftId);
      
      // Navigate to host dashboard
      console.log('OnboardingContext: Navigating to host dashboard...');
      navigate('/host/hostdashboard', { 
        state: { 
          message: 'Draft saved successfully!',
          draftSaved: true 
        }
      });
      
      console.log('OnboardingContext: saveAndExit completed successfully');
      return draftId;
    } catch (error) {
      console.error('Error saving and exiting:', error);
      throw error;
    }
  }, [saveDraftCallback, navigate]);

  // Memoized actions to prevent unnecessary re-renders
  const actions = useMemo(() => ({
    // Generic state update function for auto-save hooks
    updateState: (updates) => {
      Object.keys(updates).forEach(key => {
        switch (key) {
          case 'propertyType':
            dispatch({ type: ACTIONS.UPDATE_PROPERTY_TYPE, payload: updates[key] });
            break;
          case 'propertyStructure':
            dispatch({ type: ACTIONS.UPDATE_PROPERTY_STRUCTURE, payload: updates[key] });
            break;
          case 'privacyType':
            dispatch({ type: ACTIONS.UPDATE_PRIVACY_TYPE, payload: updates[key] });
            break;
          case 'locationData':
            dispatch({ type: ACTIONS.UPDATE_LOCATION_DATA, payload: updates[key] });
            break;
          case 'propertyBasics':
            dispatch({ type: ACTIONS.UPDATE_PROPERTY_BASICS, payload: updates[key] });
            break;
          case 'highlights':
            dispatch({ type: ACTIONS.UPDATE_HIGHLIGHTS, payload: updates[key] });
            break;
          case 'selectedAmenities':
            dispatch({ type: ACTIONS.UPDATE_AMENITIES, payload: updates[key] });
            break;
          case 'photos':
            dispatch({ type: ACTIONS.UPDATE_PHOTOS, payload: updates[key] });
            break;
          case 'title':
            if (updates.description) {
              dispatch({ type: ACTIONS.UPDATE_TITLE_DESCRIPTION, payload: { title: updates[key], description: updates.description } });
            } else {
              dispatch({ type: ACTIONS.UPDATE_TITLE_DESCRIPTION, payload: { title: updates[key], description: state.description } });
            }
            break;
          case 'description':
            if (updates.title) {
              // Already handled above
            } else {
              dispatch({ type: ACTIONS.UPDATE_TITLE_DESCRIPTION, payload: { title: state.title, description: updates[key] } });
            }
            break;
          case 'weekdayPrice':
            if (updates.weekendPrice) {
              dispatch({ type: ACTIONS.UPDATE_PRICING, payload: { weekdayPrice: updates[key], weekendPrice: updates.weekendPrice } });
            } else {
              dispatch({ type: ACTIONS.UPDATE_PRICING, payload: { weekdayPrice: updates[key], weekendPrice: state.weekendPrice } });
            }
            break;
          case 'weekendPrice':
            if (updates.weekdayPrice) {
              // Already handled above
            } else {
              dispatch({ type: ACTIONS.UPDATE_PRICING, payload: { weekdayPrice: state.weekdayPrice, weekendPrice: updates[key] } });
            }
            break;
          case 'currentStep':
            dispatch({ type: ACTIONS.SET_CURRENT_STEP, payload: updates[key] });
            break;
          default:
            console.warn(`UpdateState: Unknown key '${key}' - add case to handle this property`);
        }
      });
    },

    setLoading: (isLoading) => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: isLoading });
    },

    setCurrentStep: (step) => {
      dispatch({ type: ACTIONS.SET_CURRENT_STEP, payload: step });
    },

    updatePropertyType: (propertyType) => {
      dispatch({ type: ACTIONS.UPDATE_PROPERTY_TYPE, payload: propertyType });
    },

    updatePropertyStructure: (structure) => {
      dispatch({ type: ACTIONS.UPDATE_PROPERTY_STRUCTURE, payload: structure });
    },

    updatePrivacyType: (privacyType) => {
      dispatch({ type: ACTIONS.UPDATE_PRIVACY_TYPE, payload: privacyType });
    },

    updateLocationData: (locationData) => {
      dispatch({ type: ACTIONS.UPDATE_LOCATION_DATA, payload: locationData });
    },

    updatePropertyBasics: (basics) => {
      dispatch({ type: ACTIONS.UPDATE_PROPERTY_BASICS, payload: basics });
    },

    updateHighlights: (highlights) => {
      dispatch({ type: ACTIONS.UPDATE_HIGHLIGHTS, payload: highlights });
    },

    updateAmenities: (amenities) => {
      dispatch({ type: ACTIONS.UPDATE_AMENITIES, payload: amenities });
    },

    updatePhotos: (photos) => {
      dispatch({ type: ACTIONS.UPDATE_PHOTOS, payload: photos });
    },

    updateTitleDescription: (title, description) => {
      dispatch({ type: ACTIONS.UPDATE_TITLE_DESCRIPTION, payload: { title, description } });
    },

    updatePricing: (weekdayPrice, weekendPrice) => {
      dispatch({ type: ACTIONS.UPDATE_PRICING, payload: { weekdayPrice, weekendPrice } });
    },

    updateWeekendPricing: (enabled, price) => {
      dispatch({ type: ACTIONS.UPDATE_WEEKEND_PRICING, payload: { enabled, price } });
    },

    updateDiscounts: (discounts) => {
      dispatch({ type: ACTIONS.UPDATE_DISCOUNTS, payload: discounts });
    },

    updateGuestSelection: (guestSelectionData) => {
      // Handle both old and new format
      if (typeof guestSelectionData === 'string') {
        // New format: single string for selectedGuestOption
        dispatch({ type: ACTIONS.UPDATE_GUEST_SELECTION, payload: { selectedGuestOption: guestSelectionData } });
      } else {
        // Old format: object with instantBook and guestRequirements
        dispatch({ type: ACTIONS.UPDATE_GUEST_SELECTION, payload: guestSelectionData });
      }
    },

    updateBookingSettings: (settings) => {
      dispatch({ type: ACTIONS.UPDATE_BOOKING_SETTINGS, payload: settings });
    },

    updateSafetyDetails: (safetyAmenities) => {
      dispatch({ type: ACTIONS.UPDATE_SAFETY_DETAILS, payload: safetyAmenities });
    },

    updateFinalDetails: (houseRules, cancellationPolicy) => {
      dispatch({ type: ACTIONS.UPDATE_FINAL_DETAILS, payload: { houseRules, cancellationPolicy } });
    },

    saveDraft: saveDraftCallback,

    loadDraft: async (draftId) => {
      try {
        dispatch({ type: ACTIONS.SET_LOADING, payload: true });
        
        console.log('Loading draft with ID:', draftId); // Debug log
        const draftData = await loadDraft(draftId);
        if (draftData) {
          // Load the draft data AND set the draftId
          dispatch({ type: ACTIONS.LOAD_DRAFT, payload: draftData });
          dispatch({ type: ACTIONS.SET_DRAFT_ID, payload: draftId });
          console.log('Draft loaded and draftId set to:', draftId); // Debug log
        }
        
        return draftData;
      } catch (error) {
        console.error('Error loading draft:', error);
        throw error;
      } finally {
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    },

    saveAndExit: saveAndExitCallback,

    resetState: () => {
      dispatch({ type: ACTIONS.RESET_STATE });
    },

    // Utility function to get current progress percentage
    getProgress: () => {
      const steps = [
        'property-details', 'property-structure', 'privacy-type', 'location',
        'property-basics', 'make-it-stand-out', 'amenities', 'photos',
        'title-description', 'finish-setup'
      ];
      const currentIndex = steps.indexOf(state.currentStep);
      return currentIndex >= 0 ? Math.round(((currentIndex + 1) / steps.length) * 100) : 0;
    },

    // Utility function to validate current step data
    validateCurrentStep: () => {
      switch (state.currentStep) {
        case 'property-details':
          return !!state.propertyType;
        case 'property-structure':
          return !!state.propertyStructure;
        case 'privacy-type':
          return !!state.privacyType;
        case 'location':
          return !!(state.locationData.city && state.locationData.country);
        case 'property-basics':
          return state.guestCapacity > 0 && state.bedrooms > 0;
        case 'amenities':
          return Array.isArray(state.selectedAmenities);
        default:
          return true;
      }
    }
  }), [dispatch, navigate]);

  const value = {
    state,
    actions,
    ACTIONS
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Hook to use the onboarding context
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export default OnboardingContext;