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
    address: '',
    city: '',
    province: '',
    country: 'Philippines',
    latitude: null,
    longitude: null
  },
  
  // Property Basics
  guestCapacity: 1,
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
  draftId: null
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
      return { ...state, instantBook: action.payload.instantBook, guestRequirements: action.payload.guestRequirements };
    
    case ACTIONS.UPDATE_BOOKING_SETTINGS:
      return { ...state, ...action.payload };
    
    case ACTIONS.UPDATE_SAFETY_DETAILS:
      return { ...state, safetyAmenities: action.payload };
    
    case ACTIONS.UPDATE_FINAL_DETAILS:
      return { ...state, houseRules: action.payload.houseRules, cancellationPolicy: action.payload.cancellationPolicy };
    
    case ACTIONS.LOAD_DRAFT:
      return { ...state, ...action.payload };
    
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

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      dispatch({ type: ACTIONS.SET_USER, payload: user });
    });

    return () => unsubscribe();
  }, []);

  // Individual callbacks for functions that depend on state
  const saveDraftCallback = useCallback(async () => {
    try {
      console.log('OnboardingContext: Starting saveDraft...');
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      
      // Remove user and isLoading from the data to save
      const { user, isLoading, ...dataToSave } = state;
      
      console.log('Saving draft with ID:', state.draftId); // Debug log
      console.log('Data to save:', dataToSave); // Debug log
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
  }, [state.draftId]); // Only depend on the specific state values needed

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

    updateGuestSelection: (instantBook, guestRequirements) => {
      dispatch({ type: ACTIONS.UPDATE_GUEST_SELECTION, payload: { instantBook, guestRequirements } });
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