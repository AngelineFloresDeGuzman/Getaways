import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveDraft, loadDraft } from '@/pages/Host/services/draftService';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Initial state for onboarding
const initialState = {
  // Hosting Category (accommodation, experience, service)
  category: null,
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
  guestCapacity: 4,
  guests: 4,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  bedroomLock: null, // For "A room" privacy type
  
  // Highlights/Make It Stand Out
  highlights: [],
  
  // Amenities
  selectedAmenities: [],
  
  // Photos
  photos: [],
  
  // Title & Description
  title: '',
  description: '',
  descriptionHighlights: [],
  
  // Pricing
  weekdayPrice: 0,
  weekendPrice: 0,
  
  // Weekend Pricing
  weekendPricingEnabled: false,
  
  // Discounts
  discounts: {
    weekly: 0,
    monthly: 0,
    earlyBird: 0,
    lastMinute: 0
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
  currentStep: 'propertydetails',
  user: null,
  isLoading: false,
  draftId: null,
  lastSaved: null
};

// Action types
const ACTIONS = {
  UPDATE_CATEGORY: 'UPDATE_CATEGORY',
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
  UPDATE_DESCRIPTION_HIGHLIGHTS: 'UPDATE_DESCRIPTION_HIGHLIGHTS',
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
    case ACTIONS.UPDATE_CATEGORY:
      return { ...state, category: action.payload };
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
    
    case ACTIONS.UPDATE_DESCRIPTION_HIGHLIGHTS:
      return { ...state, descriptionHighlights: action.payload };
    
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
        
        // Restore all fields from localStorage draft
        dispatch({ type: ACTIONS.LOAD_DRAFT, payload: parsedData });
      } catch (error) {
        console.error('Error loading temporary draft from localStorage:', error);
        // Clear corrupted data
        localStorage.removeItem(tempDraftKey);
      }
    }
  }, []);

  // Individual callbacks for functions that depend on state
  const saveDraftCallback = useCallback(async (partialData = {}) => {
    try {
      console.log('OnboardingContext: Starting saveDraft...');
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });

      // Only include fields relevant to the current step
      let dataToSave = {};
      if (partialData && Object.keys(partialData).length > 0) {
        dataToSave = { ...partialData };
      } else {
        switch (state.currentStep) {
          case 'propertystructure':
            if (state.propertyStructure) dataToSave.propertyStructure = state.propertyStructure;
            break;
          case 'privacytype':
            if (state.privacyType) dataToSave.privacyType = state.privacyType;
            break;
          case 'location':
            if (state.locationData) dataToSave.locationData = state.locationData;
            break;
          case 'propertydetails':
            if (state.propertyType) dataToSave.propertyType = state.propertyType;
            break;
          case 'guestselection':
            if (state.selectedGuestOption) {
              // Save under data.guestSelection to match explicit save format
              if (!dataToSave.data) dataToSave.data = {};
              dataToSave.data.guestSelection = state.selectedGuestOption;
            }
            break;
          case 'pricing':
            if (state.weekdayPrice || state.weekendPrice) {
              // Save under data.pricing to match explicit save format
              if (!dataToSave.data) dataToSave.data = {};
              dataToSave.data.pricing = {
                weekdayPrice: state.weekdayPrice || 0,
                weekendPrice: state.weekendPrice || 0
              };
            }
            break;
          case 'weekendpricing':
            if (state.weekdayPrice || state.weekendPrice) {
              // Save under data.pricing to match explicit save format
              if (!dataToSave.data) dataToSave.data = {};
              dataToSave.data.pricing = {
                weekdayPrice: state.weekdayPrice || 0,
                weekendPrice: state.weekendPrice || 0
              };
            }
            break;
          case 'discounts':
            if (state.discounts) {
              // Save under data.discounts to match explicit save format
              if (!dataToSave.data) dataToSave.data = {};
              dataToSave.data.discounts = {
                weekly: state.discounts.weekly || 0,
                monthly: state.discounts.monthly || 0,
                earlyBird: state.discounts.earlyBird || 0,
                lastMinute: state.discounts.lastMinute || 0
              };
            }
            break;
          case 'safetydetails':
            if (state.safetyAmenities && Array.isArray(state.safetyAmenities)) {
              // Save under data.safetyDetails to match explicit save format
              if (!dataToSave.data) dataToSave.data = {};
              dataToSave.data.safetyDetails = state.safetyAmenities;
            }
            break;
          case 'finaldetails':
            // For final details, we need to save residential address and business host status
            // These might not be in context state, so we'll let the explicit save handle it
            // But if they are in context, we can save them
            if (!dataToSave.data) dataToSave.data = {};
            // Note: residentialAddress and isBusinessHost might not be in context state
            // The explicit save in FinalDetails component handles this
            break;
          // Add more cases for other steps as needed
          default:
            break;
        }
      }

      // If only privacyType is being set and matches Firestore, skip save
      if (state.user && state.draftId && Object.keys(dataToSave).length === 1 && dataToSave.privacyType !== undefined) {
        const { getDoc, doc } = await import('firebase/firestore');
        const draftRef = doc(db, 'onboardingDrafts', state.draftId);
        const snap = await getDoc(draftRef);
        const prevPrivacyType = snap.exists() ? snap.data()?.data?.privacyType : undefined;
        if (prevPrivacyType === dataToSave.privacyType) {
          dispatch({ type: ACTIONS.SET_LOADING, payload: false });
          return state.draftId;
        }
      }

      if (!state.user) {
        // ...existing code for unauthenticated save...
        const tempDraftKey = 'getaways_temp_onboarding_draft';
        const tempDraftData = {
          ...dataToSave,
          savedAt: new Date().toISOString(),
          tempId: 'temp_' + Date.now()
        };
        localStorage.setItem(tempDraftKey, JSON.stringify(tempDraftData));
        dispatch({ type: ACTIONS.SET_DRAFT_ID, payload: tempDraftData.tempId });
        return tempDraftData.tempId;
      }

      // User is authenticated, save to Firebase
      if (state.currentStep === 'hosting-steps') {
        const draftRef = doc(db, 'listings', state.draftId);
        await updateDoc(draftRef, { lastModified: new Date() });
        return state.draftId;
      }
      if (!dataToSave.currentStep) {
        dataToSave.currentStep = state.currentStep || 'propertydetails';
      }
      const draftId = await saveDraft(dataToSave, state.draftId);
      dispatch({ type: ACTIONS.SET_DRAFT_ID, payload: draftId });
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

    // Auto-save only for the current onboarding step and only save relevant fields
    if (state.currentStep && state.currentStep !== 'propertydetails') {
      let hasData = false;
      let relevantFields = {};
      // Only consider fields relevant to the current step
      switch (state.currentStep) {
        case 'propertystructure':
          // DISABLE auto-save for propertystructure - only save on Next/Save & Exit
          hasData = false;
          relevantFields = {};
          break;
        case 'propertybasics':
          // DISABLE auto-save for propertybasics - only save on Next/Save & Exit
          hasData = false;
          relevantFields = {};
          break;
        case 'amenities':
          // DISABLE auto-save for amenities - only save on Next/Save & Exit
          hasData = false;
          relevantFields = {};
          break;
        case 'makeitstandout':
          // DISABLE auto-save for makeitstandout - only save on Next/Save & Exit
          hasData = false;
          relevantFields = {};
          break;
        case 'privacytype':
          hasData = !!state.privacyType;
          relevantFields = { privacyType: state.privacyType };
          break;
        case 'location':
          hasData = !!state.locationData?.address;
          // Only include locationData if on location step
          relevantFields = { locationData: state.locationData };
          break;
        case 'propertydetails':
          hasData = !!state.propertyType;
          relevantFields = { propertyType: state.propertyType };
          break;
        // Add more cases for other steps as needed
        default:
          // Never include locationData for other steps
          break;
      }

      // Prevent auto-save if only privacyType is set and matches Firestore
      if (state.currentStep === 'privacytype' && hasData && state.user && state.draftId) {
        // Prevent auto-save if manual save just occurred
        if (window.justSavedPrivacyType) return;
        let skipAutoSave = false;
        const checkPrivacyType = async () => {
          const { getDoc, doc } = await import('firebase/firestore');
          const draftRef = doc(db, 'onboardingDrafts', state.draftId);
          const snap = await getDoc(draftRef);
          const prevPrivacyType = snap.exists() ? snap.data()?.data?.privacyType : undefined;
          if (prevPrivacyType === state.privacyType) {
            skipAutoSave = true;
          }
        };
        checkPrivacyType().then(() => {
          if (!skipAutoSave) {
            const storageType = state.user ? 'Firebase' : 'localStorage';
            console.log(`OnboardingContext: Scheduling auto-save for step: ${state.currentStep} (${storageType})`);
            autoSaveTimeout = setTimeout(async () => {
              try {
                await saveDraftCallback(relevantFields);
                console.log('OnboardingContext: Auto-save completed');
              } catch (error) {
                console.error('OnboardingContext: Auto-save failed:', error);
                // Don't throw error for auto-save failures
              }
            }, 3000); // 3-second debounce
          }
        });
      } else if (hasData && !state.isLoading) {
        const storageType = state.user ? 'Firebase' : 'localStorage';
        console.log(`OnboardingContext: Scheduling auto-save for step: ${state.currentStep} (${storageType})`);
        autoSaveTimeout = setTimeout(async () => {
          try {
            await saveDraftCallback(relevantFields);
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
      
      // Navigate to listings tab
      console.log('OnboardingContext: Navigating to listings tab...');
      navigate('/host/listings', { 
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
    updateCategory: (category) => {
      dispatch({ type: ACTIONS.UPDATE_CATEGORY, payload: category });
    },
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

    updateDescriptionHighlights: (highlights) => {
      dispatch({ type: ACTIONS.UPDATE_DESCRIPTION_HIGHLIGHTS, payload: highlights });
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
          // Extract nested data fields and map to state properties
          const data = draftData.data || {};
          const mappedData = { ...draftData };
          
          // CRITICAL: Ensure currentStep is loaded from top-level draftData
          // This is used to navigate to the correct page when continuing a draft
          if (draftData.currentStep) {
            mappedData.currentStep = draftData.currentStep;
            console.log('📍 OnboardingContext: Loaded currentStep from Firebase:', draftData.currentStep);
          }
          
          // Extract propertyStructure from nested data
          if (data.propertyStructure) {
            mappedData.propertyStructure = data.propertyStructure;
            console.log('📍 OnboardingContext: Loaded propertyStructure from Firebase:', data.propertyStructure);
          }
          
          // Extract propertyBasics from nested data
          // PropertyBasics structure varies based on privacyType, so handle missing fields gracefully
          if (data.propertyBasics) {
            mappedData.guestCapacity = data.propertyBasics.guestCapacity;
            // These fields may not exist depending on privacyType
            if (data.propertyBasics.bedrooms !== undefined) {
              mappedData.bedrooms = data.propertyBasics.bedrooms;
            }
            if (data.propertyBasics.beds !== undefined) {
              mappedData.beds = data.propertyBasics.beds;
            }
            if (data.propertyBasics.bathrooms !== undefined) {
              mappedData.bathrooms = data.propertyBasics.bathrooms;
            }
            if (data.propertyBasics.bedroomLock !== undefined) {
              mappedData.bedroomLock = data.propertyBasics.bedroomLock || null;
            }
          }
          
          // Extract privacyType from nested data
          if (data.privacyType) {
            mappedData.privacyType = data.privacyType;
          }
          
          // Extract locationData from nested data
          if (data.locationData) {
            mappedData.locationData = { ...mappedData.locationData, ...data.locationData };
          }
          
          // Extract title from nested data
          if (data.title) {
            mappedData.title = data.title;
            console.log('📍 OnboardingContext: Loaded title from Firebase:', data.title);
          }
          
          // Extract descriptionHighlights from nested data
          if (data.descriptionHighlights) {
            mappedData.descriptionHighlights = data.descriptionHighlights;
            console.log('📍 OnboardingContext: Loaded descriptionHighlights from Firebase:', data.descriptionHighlights);
          }
          
          // Extract amenities from nested data
          // Amenities are stored as object with favorites, standout, safety subcategories
          // Need to convert to flat array for selectedAmenities
          if (data.amenities) {
            if (Array.isArray(data.amenities)) {
              // If already an array, use it directly
              mappedData.selectedAmenities = data.amenities;
            } else if (typeof data.amenities === 'object') {
              // Convert object format { favorites: [...], standout: [...], safety: [...] } to flat array
              const amenitiesArray = [
                ...(data.amenities.favorites || []),
                ...(data.amenities.standout || []),
                ...(data.amenities.safety || [])
              ];
              mappedData.selectedAmenities = amenitiesArray;
              console.log('📍 OnboardingContext: Loaded amenities from Firebase (converted from object to array):', mappedData.selectedAmenities);
            }
          }
          
          // Extract safetyDetails from nested data (array format)
          if (data.safetyDetails) {
            if (Array.isArray(data.safetyDetails)) {
              mappedData.safetyAmenities = data.safetyDetails;
            } else if (typeof data.safetyDetails === 'object') {
              // Convert object to array
              mappedData.safetyAmenities = Object.keys(data.safetyDetails).filter(key => data.safetyDetails[key]);
            }
            console.log('📍 OnboardingContext: Loaded safetyDetails from Firebase:', mappedData.safetyAmenities);
          }
          
          // Extract pricing from nested data
          if (data.pricing) {
            if (data.pricing.weekdayPrice !== undefined) {
              mappedData.weekdayPrice = data.pricing.weekdayPrice;
            }
            if (data.pricing.weekendPrice !== undefined) {
              mappedData.weekendPrice = data.pricing.weekendPrice;
              // Also set weekendPricingEnabled if weekendPrice exists and is > 0
              mappedData.weekendPricingEnabled = data.pricing.weekendPrice > 0;
            }
            console.log('📍 OnboardingContext: Loaded pricing from Firebase:', {
              weekdayPrice: mappedData.weekdayPrice,
              weekendPrice: mappedData.weekendPrice,
              weekendPricingEnabled: mappedData.weekendPricingEnabled
            });
          }
          
          // Extract finalDetails from nested data
          if (data.finalDetails) {
            // Store finalDetails under a temporary key for pages to access
            mappedData.finalDetails = data.finalDetails;
            // Also extract houseRules and cancellationPolicy
            if (data.finalDetails.houseRules) {
              mappedData.houseRules = data.finalDetails.houseRules;
            }
            if (data.finalDetails.cancellationPolicy) {
              mappedData.cancellationPolicy = data.finalDetails.cancellationPolicy;
            }
            console.log('📍 OnboardingContext: Loaded finalDetails from Firebase:', data.finalDetails);
          }
          
          // Extract photos from nested data
          if (data.photos) {
            mappedData.photos = data.photos;
            console.log('📍 OnboardingContext: Loaded photos from Firebase:', data.photos.length, 'photos');
          }
          
          // Extract description from nested data
          if (data.description) {
            mappedData.description = data.description;
            console.log('📍 OnboardingContext: Loaded description from Firebase:', data.description.length, 'characters');
          }
          
          // Extract bookingSettings from nested data
          if (data.bookingSettings) {
            mappedData.advanceNotice = data.bookingSettings.advanceNotice || mappedData.advanceNotice;
            mappedData.preparationTime = data.bookingSettings.preparationTime || mappedData.preparationTime;
            mappedData.availabilityWindow = data.bookingSettings.availabilityWindow || mappedData.availabilityWindow;
            console.log('📍 OnboardingContext: Loaded bookingSettings from Firebase:', data.bookingSettings);
          }
          
          // Extract guestSelection from nested data
          if (data.guestSelection) {
            // Handle both string format (new) and object format (old)
            if (typeof data.guestSelection === 'string') {
              mappedData.selectedGuestOption = data.guestSelection;
            } else if (typeof data.guestSelection === 'object') {
              mappedData.selectedGuestOption = data.guestSelection.selectedGuestOption || mappedData.selectedGuestOption;
              mappedData.instantBook = data.guestSelection.instantBook !== undefined ? data.guestSelection.instantBook : mappedData.instantBook;
              mappedData.guestRequirements = data.guestSelection.guestRequirements || mappedData.guestRequirements;
            }
            console.log('📍 OnboardingContext: Loaded guestSelection from Firebase:', data.guestSelection);
          }
          
          // Extract discounts from nested data
          if (data.discounts) {
            mappedData.discounts = {
              ...mappedData.discounts,
              ...data.discounts
            };
            console.log('📍 OnboardingContext: Loaded discounts from Firebase:', data.discounts);
          }
          
          // Extract highlights (makeItStandOut) from nested data
          if (data.highlights) {
            mappedData.highlights = data.highlights;
            console.log('📍 OnboardingContext: Loaded highlights from Firebase:', data.highlights.length, 'highlights');
          }
          
          // Extract category from top-level or nested data
          if (draftData.category) {
            mappedData.category = draftData.category;
            console.log('📍 OnboardingContext: Loaded category from Firebase:', draftData.category);
          }
          
          // Extract propertyType from top-level or nested data
          if (draftData.propertyType) {
            mappedData.propertyType = draftData.propertyType;
            console.log('📍 OnboardingContext: Loaded propertyType from Firebase:', draftData.propertyType);
          } else if (data.propertyType) {
            mappedData.propertyType = data.propertyType;
            console.log('📍 OnboardingContext: Loaded propertyType from nested data:', data.propertyType);
          }
          
          // Load the mapped draft data AND set the draftId
          dispatch({ type: ACTIONS.LOAD_DRAFT, payload: mappedData });
          dispatch({ type: ACTIONS.SET_DRAFT_ID, payload: draftId });
          console.log('📍 OnboardingContext: Draft loaded and draftId set to:', draftId);
          console.log('📍 OnboardingContext: Loaded data summary:', {
            category: mappedData.category,
            propertyType: mappedData.propertyType,
            photosCount: mappedData.photos?.length || 0,
            hasDescription: !!mappedData.description,
            hasTitle: !!mappedData.title,
            hasPricing: !!mappedData.weekdayPrice,
            hasLocation: !!mappedData.locationData?.city
          });
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
        'propertydetails', 'propertystructure', 'privacytype', 'location',
        'propertybasics', 'makeitstandout', 'amenities', 'photos',
        'titledescription', 'finishsetup'
      ];
      const currentIndex = steps.indexOf(state.currentStep);
      return currentIndex >= 0 ? Math.round(((currentIndex + 1) / steps.length) * 100) : 0;
    },

    // Utility function to validate current step data
    validateCurrentStep: () => {
      switch (state.currentStep) {
        case 'propertydetails':
          return !!state.propertyType;
        case 'propertystructure':
          return !!state.propertyStructure;
        case 'privacytype':
          return !!state.privacyType;
        case 'location':
          return !!(state.locationData.city && state.locationData.country);
        case 'propertybasics':
          return state.guestCapacity > 0 && state.bedrooms > 0;
        case 'amenities':
          return Array.isArray(state.selectedAmenities);
        default:
          return true;
      }
    }
  }), [dispatch, navigate]);

  const value = useMemo(() => ({
    state,
    actions,
    ACTIONS
  }), [state, actions]);

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