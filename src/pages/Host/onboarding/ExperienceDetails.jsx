import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { createListing } from "@/pages/Host/services/listing";
import { Plus, ChevronRight, GraduationCap, Sparkles, X, Award, Facebook, Instagram, Trash2, ChevronDown, Search, Camera, Upload, Clock, ChevronLeft, BookOpen, User, MapPin, Image, DollarSign, Clipboard, Building } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";

// Fix marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom black pin icon
const blackPinIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 30px; height: 40px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" fill="#000"/>
        <circle cx="15" cy="15" r="5" fill="#fff"/>
      </svg>
    </div>
  `,
  className: 'custom-black-pin',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
});

// Map updater component
function MapUpdater({ center, onMapClick }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  useEffect(() => {
    const handleClick = (e) => {
      if (onMapClick) {
        onMapClick(e);
      }
    };
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick]);
  
  return null;
}

const ExperienceDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  // Initialize currentStep from draft if available, otherwise default to 1
  const [currentStep, setCurrentStep] = useState(() => {
    // ALWAYS prioritize currentStepNumber from location state first (most immediate)
    // This ensures navigation with step numbers works correctly
    if (location.state?.currentStepNumber !== undefined && location.state?.currentStepNumber !== null) {
      console.log("✅ ExperienceDetails: Initializing currentStep from location.state:", location.state.currentStepNumber);
      return location.state.currentStepNumber;
    }
    // If no location state step number, check if we have a draftId - if yes, we'll load from draft
    const draftId = location.state?.draftId || state.draftId;
    if (draftId) {
      // We'll load it in useEffect, but initialize to null to show loading
      // The loading condition will check for location.state.currentStepNumber before showing loading
      console.log("⚠️ ExperienceDetails: Initializing currentStep to null (will load from draft)");
      return null;
    }
    // Default to step 1 if nothing else
    console.log("✅ ExperienceDetails: Initializing currentStep to 1 (default)");
    return 1;
  });
  // Initialize state - check if we have a draftId to determine if we should use defaults or null
  const draftIdOnMount = location.state?.draftId || state.draftId;
  const [yearsOfExperience, setYearsOfExperience] = useState(() => {
    // Initialize to null if we have a draftId so we can load from draft
    // Otherwise default to 10 to ensure the UI always shows a number
    if (draftIdOnMount) {
      return null; // Will be loaded from draft
    }
    return 10;
  });
  const [mainCategory, setMainCategory] = useState(null);
  
  // Modal states
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showExpertiseModal, setShowExpertiseModal] = useState(false);
  const [showRecognitionModal, setShowRecognitionModal] = useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  
  // Qualification data - initialize to null if we have a draftId so we can load from draft
  const [introTitle, setIntroTitle] = useState(draftIdOnMount ? null : "");
  const [expertise, setExpertise] = useState(draftIdOnMount ? null : "");
  const [recognition, setRecognition] = useState(draftIdOnMount ? null : "");
  
  // Social media profiles
  const [profiles, setProfiles] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  
  // Address fields
  const [country, setCountry] = useState("Philippines");
  const [unit, setUnit] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [streetAddress, setStreetAddress] = useState("Purok 6");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("San Rafael");
  const [zipCode, setZipCode] = useState("3008");
  const [province, setProvince] = useState("Bulacan");
  
  // Business hosting
  const [isBusinessHosting, setIsBusinessHosting] = useState(false); // false = No (default), true = Yes
  
  // Meeting address
  const [meetingAddress, setMeetingAddress] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Location confirmation fields
  const [confirmCountry, setConfirmCountry] = useState("Philippines");
  const [confirmUnit, setConfirmUnit] = useState("");
  const [confirmBuildingName, setConfirmBuildingName] = useState("");
  const [confirmStreetAddress, setConfirmStreetAddress] = useState("");
  const [confirmBarangay, setConfirmBarangay] = useState("");
  const [confirmCity, setConfirmCity] = useState("");
  const [confirmZipCode, setConfirmZipCode] = useState("");
  const [confirmProvince, setConfirmProvince] = useState("");
  const [locationName, setLocationName] = useState("");
  const [showConfirmLocation, setShowConfirmLocation] = useState(false);
  
  // Map position
  const [mapPosition, setMapPosition] = useState([14.5995, 120.9842]); // Default to Manila coordinates
  const [showMap, setShowMap] = useState(false);
  
  // Photos
  const [photos, setPhotos] = useState([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const photoInputRef = useRef(null);
  
  // Itinerary
  const [itineraryItems, setItineraryItems] = useState([]);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [itineraryModalStep, setItineraryModalStep] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemDuration, setItemDuration] = useState("60");
  const [itemDurationMinutes, setItemDurationMinutes] = useState(60);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [tempDurationValue, setTempDurationValue] = useState("60");
  const [itemImage, setItemImage] = useState("");
  const [availablePhotos, setAvailablePhotos] = useState([]);
  const itineraryImageInputRef = useRef(null);
  
  // Maximum guests
  const [maxGuests, setMaxGuests] = useState(1);
  
  // Price per guest
  const [pricePerGuest, setPricePerGuest] = useState("");
  
  // Private group minimum
  const [privateGroupMinimum, setPrivateGroupMinimum] = useState("");
  
  // Discounts
  const [discounts, setDiscounts] = useState([]);
  
  // Transportation
  const [willTransportGuests, setWillTransportGuests] = useState(null); // null, true, or false
  const [transportationTypes, setTransportationTypes] = useState([]); // array of selected types
  
  // Terms agreement
  const [termsAgreed, setTermsAgreed] = useState(false);
  
  // Experience title and description
  const [experienceTitle, setExperienceTitle] = useState("");
  const [experienceDescription, setExperienceDescription] = useState("");
  const [showCreateOwnModal, setShowCreateOwnModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [customDiscountName, setCustomDiscountName] = useState("");
  const [customDiscountDescription, setCustomDiscountDescription] = useState("");
  const [customDiscountValue, setCustomDiscountValue] = useState("");
  
  // Refs for address search
  const addressSearchTimeoutRef = useRef(null);
  const addressAbortControllerRef = useRef(null);
  
  // Ref to track if data has been loaded to prevent infinite loops
  const hasLoadedDataRef = useRef(false);
  const lastDraftIdRef = useRef(null);
  const isMountedRef = useRef(true);
  const hasSetCurrentStepRef = useRef(false);
  
  // Ref to track the current yearsOfExperience value to avoid stale closures
  // Initialize to null if we have a draftId, otherwise 10
  const yearsOfExperienceRef = useRef(draftIdOnMount ? null : 10);
  
  // Update ref whenever yearsOfExperience changes
  useEffect(() => {
    yearsOfExperienceRef.current = yearsOfExperience;
    console.log("🔄 yearsOfExperience state updated to:", yearsOfExperience, "ref updated to:", yearsOfExperienceRef.current);
  }, [yearsOfExperience]);
  

  const totalSteps = 16;

  // Reset refs when component mounts - always reset on mount to ensure fresh load
  useEffect(() => {
    isMountedRef.current = true;
    console.log("🔄 ExperienceDetails: Component mounted, resetting all loading flags");
    // Always reset on mount to ensure we load data fresh
    hasLoadedDataRef.current = false;
    lastDraftIdRef.current = null;
    hasSetCurrentStepRef.current = false;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array - only run on mount

  // Get current step name for progress tracking
  const getCurrentStepName = (stepNumber) => {
    const stepNameMap = {
      1: "experience-years-of-experience",
      2: "experience-qualifications",
      3: "experience-online-profiles",
      4: "experience-residential-address",
      5: "experience-meeting-address",
      6: "experience-photos",
      7: "experience-itinerary",
      8: "experience-max-guests",
      9: "experience-price-per-guest",
      10: "experience-private-group-minimum",
      11: "experience-review-pricing",
      12: "experience-discounts",
      13: "experience-transportation",
      14: "experience-title-description-preview",
      15: "experience-create-title-description",
      16: "experience-submit-listing",
    };
    return stepNameMap[stepNumber] || "experience-years-of-experience";
  };

  // Set currentStep from location.state if available (immediate, before data loads)
  useEffect(() => {
    if (location.state?.currentStepNumber !== undefined && location.state?.currentStepNumber !== null) {
      if (currentStep === null || currentStep !== location.state.currentStepNumber) {
        console.log("✅ ExperienceDetails: Setting currentStep from location.state immediately:", location.state.currentStepNumber);
        setCurrentStep(location.state.currentStepNumber);
        hasSetCurrentStepRef.current = true;
      }
    }
  }, [location.state?.currentStepNumber]);

  // Ensure progress bar shows correct step based on currentStep number
  useEffect(() => {
    // Use displayStep to ensure we always have a valid step
    const stepToUse = currentStep !== null ? currentStep : (location.state?.currentStepNumber ?? 1);
    if (actions?.setCurrentStep) {
      const stepName = getCurrentStepName(stepToUse);
      actions.setCurrentStep(stepName);
    }
  }, [actions, currentStep, location.state?.currentStepNumber]);

  // Load main category from location state or draft
  useEffect(() => {
    const loadMainCategory = async () => {
      const categoryFromState = location.state?.experienceCategory;
      if (categoryFromState) {
        setMainCategory(categoryFromState);
        return;
      }
      
        const draftId = state.draftId || location.state?.draftId;
        if (draftId) {
          try {
            const draftRef = doc(db, "onboardingDrafts", draftId);
            const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            if (data.experienceCategory) {
              setMainCategory(data.experienceCategory);
            }
            // If no category found, it will be loaded in loadQualificationData
            // Don't set default here to avoid overriding actual data
          }
          // If draft doesn't exist, don't set default - wait for loadQualificationData
          } catch (error) {
            console.error("Error loading experience category from draft:", error);
          // On error, don't set default - let loadQualificationData handle it
          }
        }
      // If no draftId and no categoryFromState, don't set anything
      // The page will show loading until data is loaded or a timeout
    };
    loadMainCategory();
  }, [location.state?.experienceCategory, state.draftId, location.state?.draftId]);

  // Load saved qualification data from draft
  useEffect(() => {
    const loadQualificationData = async () => {
      const draftId = state.draftId || location.state?.draftId;
      
      // Priority 1: If we have currentStepNumber in location state, use it immediately (don't wait for draft load)
      if (location.state?.currentStepNumber !== undefined && location.state?.currentStepNumber !== null) {
        if (currentStep !== location.state.currentStepNumber) {
          console.log("✅ ExperienceDetails: Setting currentStep from location.state (priority):", location.state.currentStepNumber);
          setCurrentStep(location.state.currentStepNumber);
          hasSetCurrentStepRef.current = true;
        }
      }
      
      console.log("🔍 ExperienceDetails: Loading qualification data from draft, draftId:", draftId, "currentStepNumber from location:", location.state?.currentStepNumber);
      
      // Prevent loading if we've already loaded this draftId or if there's no draftId
      if (!draftId) {
        console.warn("⚠️ ExperienceDetails: No draftId available, setting defaults");
        // If no draftId, set defaults to allow page to render (only once)
        if (!mainCategory) {
          setMainCategory("art-and-design");
        }
        // Use location.state.currentStepNumber if available, otherwise default to 1
        const stepToUse = location.state?.currentStepNumber ?? 1;
        if (!hasSetCurrentStepRef.current && currentStep === null) {
          setCurrentStep(stepToUse);
          hasSetCurrentStepRef.current = true;
        }
        if (yearsOfExperience === null) {
          setYearsOfExperience(10);
          yearsOfExperienceRef.current = 10;
        }
        return;
      }
      
      // Only skip if we've already loaded THIS exact draftId
      // Check if we're in default/unloaded state:
      // - If introTitle/expertise/recognition are null (not yet loaded) OR
      // - If we're on step 1 with default yearsOfExperience and no other data
      const isUnloadedState = (introTitle === null || expertise === null || recognition === null || yearsOfExperience === null) ||
                              (currentStep === 1 && yearsOfExperience === 10 && (!introTitle || introTitle === "") && (!expertise || expertise === "") && (!recognition || recognition === ""));
      
      // Only skip if we've loaded this draftId AND we're not in unloaded state
      // IMPORTANT: Don't reload when currentStep changes - data persists in state across steps
      // Only reload when draftId changes or data hasn't been loaded yet
      if (hasLoadedDataRef.current && lastDraftIdRef.current === draftId && !isUnloadedState) {
        console.log("⏭️ ExperienceDetails: Data already loaded for this draftId, skipping reload");
        console.log("  Current values:", { currentStep, mainCategory, yearsOfExperience, introTitle, expertise, recognition });
        return;
      }
      
      // Always reset flags if:
      // 1. Different draftId
      // 2. Haven't loaded yet
      // 3. We're in unloaded state (means we need to load)
      if (lastDraftIdRef.current !== draftId || !hasLoadedDataRef.current || isUnloadedState) {
        console.log("🔄 ExperienceDetails: Resetting loading flags", {
          lastDraftId: lastDraftIdRef.current,
          currentDraftId: draftId,
          hasLoaded: hasLoadedDataRef.current,
          isUnloadedState,
          currentStep,
          introTitle,
          expertise,
          recognition
        });
        hasLoadedDataRef.current = false;
        hasSetCurrentStepRef.current = false;
      }
      
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
          console.log("📦 ExperienceDetails: Draft data loaded:", {
            keys: Object.keys(data),
            introTitle: data.introTitle,
            expertise: data.expertise,
            recognition: data.recognition,
            yearsOfExperience: data.yearsOfExperience,
            yearsOfExperienceType: typeof data.yearsOfExperience,
            currentStepNumber: data.currentStepNumber,
            profiles: data.profiles,
            city: data.city,
            streetAddress: data.streetAddress
          });
          
          // Debug: Check if yearsOfExperience exists in the data object
          if ('yearsOfExperience' in data) {
            console.log("✅ yearsOfExperience found in draft data:", data.yearsOfExperience, "type:", typeof data.yearsOfExperience);
          } else {
            console.error("❌ yearsOfExperience NOT found in draft data! Available keys:", Object.keys(data));
          }
          
          // Load mainCategory from draft data FIRST (before marking as loaded)
          if (!mainCategory && data.experienceCategory) {
            console.log("✅ ExperienceDetails: Loading experienceCategory from draft:", data.experienceCategory);
            setMainCategory(data.experienceCategory);
          } else if (!mainCategory) {
            // If still no category, set a default to prevent infinite loading
            console.warn("⚠️ ExperienceDetails: No experienceCategory found, using default");
            setMainCategory("art-and-design");
          }
          
          // Load currentStepNumber FIRST to restore the exact step
          // Priority: location.state > draft data > default (1)
          let stepToSet = null;
          if (location.state?.currentStepNumber !== undefined && location.state?.currentStepNumber !== null) {
            stepToSet = location.state.currentStepNumber;
            console.log("✅ ExperienceDetails: Using currentStepNumber from location.state:", stepToSet);
          } else if (data.currentStepNumber !== undefined && data.currentStepNumber !== null) {
            stepToSet = data.currentStepNumber;
            console.log("✅ ExperienceDetails: Loading currentStepNumber from draft:", stepToSet);
          } else {
            stepToSet = 1;
            console.log("⚠️ ExperienceDetails: No currentStepNumber found, defaulting to step 1");
          }
          
          // Only set if we haven't set it yet or if it's different
          if (!hasSetCurrentStepRef.current || currentStep !== stepToSet) {
            setCurrentStep(stepToSet);
              hasSetCurrentStepRef.current = true;
          }
          
          // Load all form data - use !== undefined to include empty strings and falsy values
            // Always set these values, even if they're empty strings or 0, to override defaults
            console.log("📥 Loading form data from draft:", {
              introTitle: data.introTitle,
              expertise: data.expertise,
              recognition: data.recognition,
              yearsOfExperience: data.yearsOfExperience
            });
            
            if (data.introTitle !== undefined) {
              console.log("  → Setting introTitle:", data.introTitle);
              setIntroTitle(data.introTitle || "");
            } else if (introTitle === null) {
              // If data doesn't exist and we initialized to null, set to empty string
              setIntroTitle("");
            }
            if (data.expertise !== undefined) {
              console.log("  → Setting expertise:", data.expertise);
              setExpertise(data.expertise || "");
            } else if (expertise === null) {
              setExpertise("");
            }
            if (data.recognition !== undefined) {
              console.log("  → Setting recognition:", data.recognition);
              setRecognition(data.recognition || "");
            } else if (recognition === null) {
              setRecognition("");
            }
            // Always check for yearsOfExperience in the data
            if (data.yearsOfExperience !== undefined && data.yearsOfExperience !== null) {
              // Even if it's 0, use the saved value (0 is a valid value)
              console.log("  → Setting yearsOfExperience from draft:", data.yearsOfExperience, "(was:", yearsOfExperience, ", ref was:", yearsOfExperienceRef.current, ")");
              setYearsOfExperience(data.yearsOfExperience);
              // Also update the ref immediately to ensure it's in sync
              yearsOfExperienceRef.current = data.yearsOfExperience;
              console.log("  → Updated ref to:", yearsOfExperienceRef.current);
            } else if (data.yearsOfExperience === undefined || data.yearsOfExperience === null) {
              console.warn("  ⚠️ yearsOfExperience is undefined/null in draft data, setting default to 10");
              // If no saved value, set to default 10
              setYearsOfExperience(10);
              yearsOfExperienceRef.current = 10;
            }
            if (data.profiles !== undefined && Array.isArray(data.profiles)) {
              setProfiles(data.profiles);
            }
            if (data.country !== undefined) setCountry(data.country);
            if (data.unit !== undefined) setUnit(data.unit);
            if (data.buildingName !== undefined) setBuildingName(data.buildingName);
            if (data.streetAddress !== undefined) setStreetAddress(data.streetAddress);
            if (data.barangay !== undefined) setBarangay(data.barangay);
            if (data.city !== undefined) setCity(data.city);
            if (data.zipCode !== undefined) setZipCode(data.zipCode);
            if (data.province !== undefined) setProvince(data.province);
            if (data.isBusinessHosting !== undefined) setIsBusinessHosting(data.isBusinessHosting);
            if (data.meetingAddress !== undefined) setMeetingAddress(data.meetingAddress);
            if (data.confirmCountry !== undefined) setConfirmCountry(data.confirmCountry);
            if (data.confirmUnit !== undefined) setConfirmUnit(data.confirmUnit);
            if (data.confirmBuildingName !== undefined) setConfirmBuildingName(data.confirmBuildingName);
            if (data.confirmStreetAddress !== undefined) setConfirmStreetAddress(data.confirmStreetAddress);
            if (data.confirmBarangay !== undefined) setConfirmBarangay(data.confirmBarangay);
            if (data.confirmCity !== undefined) setConfirmCity(data.confirmCity);
            if (data.confirmZipCode !== undefined) setConfirmZipCode(data.confirmZipCode);
            if (data.confirmProvince !== undefined) setConfirmProvince(data.confirmProvince);
            if (data.locationName !== undefined) setLocationName(data.locationName);
            if (data.showConfirmLocation !== undefined) setShowConfirmLocation(data.showConfirmLocation);
            if (data.mapLat !== undefined && data.mapLng !== undefined) {
              setMapPosition([data.mapLat, data.mapLng]);
            }
            if (data.showMap !== undefined) setShowMap(data.showMap);
            if (data.photos !== undefined && Array.isArray(data.photos)) {
              // Ensure photos have url property for display
              const photosWithUrl = data.photos.map(photo => ({
                ...photo,
                url: photo.url || photo.base64 || ''
              }));
              setPhotos(photosWithUrl);
              setAvailablePhotos(photosWithUrl);
            }
            if (data.itineraryItems !== undefined && Array.isArray(data.itineraryItems)) {
              setItineraryItems(data.itineraryItems);
            }
            if (data.maxGuests !== undefined) {
              setMaxGuests(data.maxGuests);
            }
            if (data.pricePerGuest !== undefined) {
              // Convert to string if it's a number (Firestore might store it as a number)
              setPricePerGuest(String(data.pricePerGuest || ""));
            }
            if (data.privateGroupMinimum !== undefined) {
              setPrivateGroupMinimum(data.privateGroupMinimum);
            }
            if (data.discounts !== undefined && Array.isArray(data.discounts)) {
              setDiscounts(data.discounts);
            }
            if (data.willTransportGuests !== undefined) {
              setWillTransportGuests(data.willTransportGuests);
            }
            if (data.transportationTypes !== undefined && Array.isArray(data.transportationTypes)) {
              setTransportationTypes(data.transportationTypes);
            }
            if (data.termsAgreed !== undefined) {
              setTermsAgreed(data.termsAgreed);
            }
            if (data.experienceTitle !== undefined) {
              setExperienceTitle(data.experienceTitle || "");
            }
            if (data.experienceDescription !== undefined) {
              setExperienceDescription(data.experienceDescription || "");
            }
            
            console.log("✅ ExperienceDetails: All form data loaded from draft", {
              introTitle: data.introTitle,
              expertise: data.expertise,
              recognition: data.recognition,
              yearsOfExperience: data.yearsOfExperience,
              currentStepNumber: data.currentStepNumber,
              profilesCount: data.profiles?.length || 0
            });
            
            // Mark as loaded AFTER all state updates are queued
            // Use setTimeout to ensure React has processed all state updates
            setTimeout(() => {
              hasLoadedDataRef.current = true;
              lastDraftIdRef.current = draftId;
              console.log("✅ ExperienceDetails: Marked as loaded after all state updates, draftId:", draftId);
            }, 100);
            
            console.log("✅ ExperienceDetails: All data loaded from draft");
          } else {
            console.warn("⚠️ ExperienceDetails: Draft does not exist");
            hasLoadedDataRef.current = true; // Mark as attempted even if draft doesn't exist
            lastDraftIdRef.current = draftId;
            // Set defaults to prevent infinite loading
            if (!mainCategory) {
              setMainCategory("art-and-design");
            }
            if (!hasSetCurrentStepRef.current && currentStep === null) {
              setCurrentStep(1);
              hasSetCurrentStepRef.current = true;
            }
          }
        } catch (error) {
          console.error("❌ Error loading qualification data from draft:", error);
          hasLoadedDataRef.current = true; // Mark as attempted even on error
          lastDraftIdRef.current = draftId;
          // Set defaults to prevent infinite loading
          if (!mainCategory) {
            setMainCategory("art-and-design");
          }
          if (!hasSetCurrentStepRef.current && currentStep === null) {
            setCurrentStep(1);
            hasSetCurrentStepRef.current = true;
        }
      }
    };
    loadQualificationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.draftId, location.state?.draftId]); // Only reload when draftId changes, not when currentStep changes
  
  // Reset loading flag when draftId changes
  useEffect(() => {
    const draftId = state.draftId || location.state?.draftId;
    if (draftId !== lastDraftIdRef.current) {
      hasLoadedDataRef.current = false;
    }
  }, [state.draftId, location.state?.draftId]);

  // Category display names
  const categoryDisplayNames = {
    "art-and-design": "art and design",
    "fitness-and-wellness": "fitness and wellness",
    "food-and-drink": "food and drink",
    "history-and-culture": "history and culture",
    "nature-and-outdoors": "nature and outdoors",
  };

  const categoryName = mainCategory ? categoryDisplayNames[mainCategory] || mainCategory : "";

  const handleDecrement = async () => {
    if (yearsOfExperience > 0) {
      const newValue = yearsOfExperience - 1;
      console.log("📉 Decrementing yearsOfExperience from", yearsOfExperience, "to", newValue);
      setYearsOfExperience(newValue);
      // Save with the new value directly to avoid state update timing issues
      await saveQualificationData(newValue);
    }
  };

  const handleIncrement = async () => {
    const newValue = yearsOfExperience + 1;
    console.log("📈 Incrementing yearsOfExperience from", yearsOfExperience, "to", newValue);
    setYearsOfExperience(newValue);
    // Save with the new value directly to avoid state update timing issues
    await saveQualificationData(newValue);
  };

  const saveQualificationData = async (overrideYearsOfExperience = null) => {
    let draftId = state.draftId || location.state?.draftId;
    
    // Use override value if provided, otherwise use ref (most up-to-date) or state as fallback
    // This ensures we save the correct value even if state hasn't updated yet
    const yearsToSave = overrideYearsOfExperience !== null 
      ? overrideYearsOfExperience 
      : (yearsOfExperienceRef.current !== undefined ? yearsOfExperienceRef.current : yearsOfExperience);
    
    console.log("💾 saveQualificationData called:", {
      overrideValue: overrideYearsOfExperience,
      refValue: yearsOfExperienceRef.current,
      stateValue: yearsOfExperience,
      willSave: yearsToSave
    });
    
    // If no draftId exists, try to find an existing experience draft first
    if (!draftId) {
      try {
        const { auth } = await import("@/lib/firebase");
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.warn("⚠️ ExperienceDetails: User not authenticated, cannot create draft");
          return;
        }
        
        // Try to find an existing experience draft for this user
        const { getUserDrafts } = await import("@/pages/Host/services/draftService");
        const drafts = await getUserDrafts();
        const experienceDraft = drafts.find(d => 
          d.category === "experience" && 
          (d.currentStep === "experience-details" || 
           d.currentStep === "experience-listing-summary" ||
           d.currentStep === "experience-location" ||
           d.currentStep === "experience-subcategory-selection" ||
           d.currentStep === "experience-category-selection" ||
           d.data?.experienceCategory)
        );
        
        if (experienceDraft) {
          draftId = experienceDraft.id;
          console.log("✅ ExperienceDetails: Found existing experience draft:", draftId);
          
          // Update state with found draftId
          if (actions?.setDraftId) {
            actions.setDraftId(draftId);
          }
        } else {
          // No existing draft found, create a new one
          const { saveDraft } = await import("@/pages/Host/services/draftService");
          const newDraftData = {
            currentStep: "experience-details",
            category: "experience",
            data: {
              experienceCategory: mainCategory || "art-and-design",
              currentStepNumber: currentStep || 1,
            }
          };
          draftId = await saveDraft(newDraftData, null);
          console.log("✅ ExperienceDetails: Created new draft:", draftId);
          
          // Update state with new draftId
          if (actions?.setDraftId) {
            actions.setDraftId(draftId);
          }
        }
      } catch (error) {
        console.error("❌ ExperienceDetails: Error finding/creating draft:", error);
        throw error;
      }
    }
    
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        
        // Build update object with all form data
        const updateData = {
          "data.introTitle": introTitle,
          "data.expertise": expertise,
          "data.recognition": recognition,
          "data.yearsOfExperience": yearsToSave,
          "data.profiles": profiles,
          "data.country": country,
          "data.unit": unit,
          "data.buildingName": buildingName,
          "data.streetAddress": streetAddress,
          "data.barangay": barangay,
          "data.city": city,
          "data.zipCode": zipCode,
          "data.province": province,
          "data.isBusinessHosting": isBusinessHosting,
          "data.meetingAddress": meetingAddress,
          "data.confirmCountry": confirmCountry,
          "data.confirmUnit": confirmUnit,
          "data.confirmBuildingName": confirmBuildingName,
          "data.confirmStreetAddress": confirmStreetAddress,
          "data.confirmBarangay": confirmBarangay,
          "data.confirmCity": confirmCity,
          "data.confirmZipCode": confirmZipCode,
          "data.confirmProvince": confirmProvince,
          "data.locationName": locationName,
          "data.showConfirmLocation": showConfirmLocation,
          "data.mapLat": mapPosition[0],
          "data.mapLng": mapPosition[1],
          "data.showMap": showMap,
          "data.photos": photos.map(photo => {
            // Save photo data with base64 for listing creation
            // Remove blob URLs (they can't be serialized), but keep base64
            const photoData = {
              id: photo.id,
              name: photo.name,
            };
            // Only include URL if it's a real URL (not a blob URL)
            if (photo.url && !photo.url.startsWith('blob:')) {
              photoData.url = photo.url;
            }
            // Include base64 if available (needed for listing creation)
            // Firebase Firestore has a 1MB document size limit, but we'll include base64
            // and let Firebase handle size limits (it will error if too large)
            if (photo.base64) {
              photoData.base64 = photo.base64;
            }
            return photoData;
          }),
          "data.itineraryItems": itineraryItems.map(item => ({
            ...item,
            description: item.description || '',
            durationMinutes: item.durationMinutes || 60
          })),
          "data.maxGuests": maxGuests,
          "data.pricePerGuest": pricePerGuest,
          "data.privateGroupMinimum": privateGroupMinimum,
          "data.discounts": discounts,
          "data.willTransportGuests": willTransportGuests,
          "data.transportationTypes": transportationTypes,
          "data.termsAgreed": termsAgreed,
          "data.experienceTitle": experienceTitle,
          "data.experienceDescription": experienceDescription,
          "data.experienceCategory": mainCategory || displayCategory || "art-and-design",
          "data.currentStepNumber": currentStep !== null && currentStep !== undefined ? currentStep : (location.state?.currentStepNumber ?? displayStep ?? 1),
          currentStep: "experience-details",
          category: "experience",
          lastModified: new Date(),
        };
        
        console.log("💾 About to save to Firebase:", {
          yearsOfExperience: yearsToSave,
          yearsOfExperienceState: yearsOfExperience,
          overrideValue: overrideYearsOfExperience,
          introTitle: introTitle?.substring(0, 50) || "(empty)",
          expertise: expertise?.substring(0, 50) || "(empty)",
          recognition: recognition?.substring(0, 50) || "(empty)",
          currentStep
        });
        
        // Save to Firebase - await ensures save completes before continuing
        await updateDoc(draftRef, updateData);
        
        // Verify the save by reading back from Firebase
        const verifySnap = await getDoc(draftRef);
        if (verifySnap.exists()) {
          const savedData = verifySnap.data().data || {};
          console.log("✅ ExperienceDetails: Draft saved successfully to Firebase on step", currentStep, "draftId:", draftId);
          console.log("💾 Saved data includes:", {
            introTitle: introTitle?.substring(0, 50) || "(empty)",
            expertise: expertise?.substring(0, 50) || "(empty)",
            recognition: recognition?.substring(0, 50) || "(empty)",
            yearsOfExperience: yearsToSave,
            profilesCount: profiles?.length || 0,
            photosCount: photos?.length || 0,
            currentStepNumber: currentStep,
            meetingAddress: meetingAddress?.substring(0, 50) || "(empty)",
            pricePerGuest: pricePerGuest || "(empty)",
            discountsCount: discounts?.length || 0
          });
          console.log("✅ Firebase save verified - data confirmed in Firebase:", {
            savedYearsOfExperience: savedData.yearsOfExperience,
            savedCurrentStep: savedData.currentStepNumber,
            savedIntroTitle: savedData.introTitle?.substring(0, 30) || "(empty)"
          });
        } else {
          console.error("❌ ExperienceDetails: Save verification failed - document not found after save!");
        }
      } catch (error) {
        console.error("❌ ExperienceDetails: Error saving qualification data:", error);
        console.error("Error details:", {
          draftId,
          errorMessage: error.message,
          errorCode: error.code
        });
        throw error; // Re-throw to allow callers to handle errors
      }
    } else {
      console.error("❌ ExperienceDetails: No draftId available to save data");
      throw new Error("No draft ID available. Cannot save data.");
    }
  };

  const handleSaveIntro = async () => {
    await saveQualificationData();
    setShowIntroModal(false);
  };

  const handleSaveExpertise = async () => {
    await saveQualificationData();
    setShowExpertiseModal(false);
  };

  const handleSaveRecognition = async () => {
    await saveQualificationData();
    setShowRecognitionModal(false);
  };

  const handleAddProfile = () => {
    if (selectedPlatform && profileUrl.trim()) {
      const newProfile = {
        platform: selectedPlatform,
        url: profileUrl.trim(),
        id: Date.now().toString(),
      };
      setProfiles([...profiles, newProfile]);
      setSelectedPlatform("");
      setProfileUrl("");
      setShowAddProfileModal(false);
      saveQualificationData();
    }
  };

  const handleRemoveProfile = (profileId) => {
    setProfiles(profiles.filter((p) => p.id !== profileId));
    saveQualificationData();
  };

  const handleSkip = () => {
    handleNext();
  };

  // Helper function to fetch from Nominatim with proxy fallback
  const fetchWithProxy = async (nominatimUrl) => {
    const url = new URL(nominatimUrl);
    const proxyPath = `/api/nominatim${url.pathname}${url.search}`;
    
    try {
      const response = await fetch(proxyPath, {
        headers: { 'Accept': 'application/json' },
        signal: addressAbortControllerRef.current?.signal,
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (proxyError) {
      if (proxyError.name === 'AbortError') throw proxyError;
    }
    
    try {
      const response = await fetch(nominatimUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Getaways/1.0',
          'Referer': window.location.origin
        },
        signal: addressAbortControllerRef.current?.signal,
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (directError) {
      if (directError.name === 'AbortError') throw directError;
    }
    
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(nominatimUrl)}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const proxyData = await response.json();
      const contents = proxyData.contents || '[]';
      return typeof contents === 'string' ? JSON.parse(contents) : contents;
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw error;
    }
  };

  const handleAddressInputClick = () => {
    setShowAddressModal(true);
    setAddressSearch(meetingAddress);
  };

  const handleCloseAddressModal = () => {
    setShowAddressModal(false);
    setAddressSearch("");
    setAddressSuggestions([]);
  };

  const handleAddressSearchChange = async (e) => {
    const query = e.target.value;
    setAddressSearch(query);
    
    if (addressSearchTimeoutRef.current) {
      clearTimeout(addressSearchTimeoutRef.current);
    }

    if (addressAbortControllerRef.current) {
      addressAbortControllerRef.current.abort();
    }

    if (query.trim().length < 2) {
      setAddressSuggestions([]);
      setIsLoadingAddress(false);
      return;
    }

    setIsLoadingAddress(true);
    addressSearchTimeoutRef.current = setTimeout(async () => {
      try {
        if (addressAbortControllerRef.current) {
          addressAbortControllerRef.current.abort();
        }
        addressAbortControllerRef.current = new AbortController();

        const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
          `format=json&` +
          `q=${encodeURIComponent(query)}&` +
          `addressdetails=1&` +
          `limit=10`;

        let results = [];
        try {
          results = await fetchWithProxy(nominatimUrl);
          if (!Array.isArray(results)) {
            results = [];
          }
        } catch (error) {
          if (error.name === 'AbortError') return;
          console.error('Error fetching address suggestions:', error);
          results = [];
        }
        
        const formattedSuggestions = results
          .map(result => ({
            display_name: result.display_name || '',
            place_id: result.place_id,
            lat: result.lat,
            lon: result.lon,
          }))
          .filter((item, index, self) => 
            index === self.findIndex(t => t.place_id === item.place_id)
          )
          .slice(0, 10);
        
        setAddressSuggestions(formattedSuggestions);
        setIsLoadingAddress(false);
      } catch (error) {
        setIsLoadingAddress(false);
      }
    }, 300);
  };

  // Helper to convert File to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Handle photo selection
  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles([...selectedFiles, ...files]);
    
    // Reset input
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  // Process selected files and add to photos
  const processAndAddPhotos = async (filesToProcess) => {
    if (filesToProcess.length === 0) return;

    try {
      const newPhotos = await Promise.all(
        filesToProcess.map(async (file) => {
          const base64 = await fileToBase64(file);
          return {
            id: Date.now() + Math.random(),
            name: file.name,
            url: URL.createObjectURL(file),
            base64: base64,
          };
        })
      );

      setPhotos([...photos, ...newPhotos]);
      setAvailablePhotos([...photos, ...newPhotos]);
      saveQualificationData();
    } catch (error) {
      console.error('Error processing photos:', error);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      setSelectedFiles([...selectedFiles, ...files]);
    }
  };

  const handleAddPhotos = () => {
    if (selectedFiles.length > 0) {
      processAndAddPhotos(selectedFiles);
      setSelectedFiles([]);
      setShowPhotoModal(false);
    }
  };

  const handleDone = () => {
    if (selectedFiles.length > 0) {
      processAndAddPhotos(selectedFiles);
    }
    setSelectedFiles([]);
    setShowPhotoModal(false);
  };

  // Handle photo removal
  const handleRemovePhoto = (photoId) => {
    const updatedPhotos = photos.filter((p) => p.id !== photoId);
    setPhotos(updatedPhotos);
    saveQualificationData();
  };

  // Auto-save maxGuests when changed
  useEffect(() => {
    if (maxGuests > 0) {
      saveQualificationData();
    }
  }, [maxGuests]);

  // Auto-save pricePerGuest when changed
  useEffect(() => {
    if (pricePerGuest.trim().length > 0) {
      saveQualificationData();
    }
  }, [pricePerGuest]);

  // Auto-save privateGroupMinimum when changed
  useEffect(() => {
    if (privateGroupMinimum.trim().length > 0) {
      saveQualificationData();
    }
  }, [privateGroupMinimum]);

  // Auto-save discounts when changed
  useEffect(() => {
    saveQualificationData();
  }, [discounts]);

  // Auto-save transportation when changed
  useEffect(() => {
    if (willTransportGuests !== null) {
      saveQualificationData();
    }
  }, [willTransportGuests, transportationTypes]);

  // Auto-save terms agreement when changed
  useEffect(() => {
    if (termsAgreed) {
      saveQualificationData();
    }
  }, [termsAgreed]);

  // Auto-save experience title and description when changed
  useEffect(() => {
    if (experienceTitle.trim().length > 0 || experienceDescription.trim().length > 0) {
      saveQualificationData();
    }
  }, [experienceTitle, experienceDescription]);

  // Sync availablePhotos with photos
  useEffect(() => {
    setAvailablePhotos(photos);
  }, [photos]);

  // Handle itinerary image selection
  const handleItineraryImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      setItemImage(base64);
    } catch (error) {
      console.error('Error processing image:', error);
    }

    if (itineraryImageInputRef.current) {
      itineraryImageInputRef.current.value = '';
    }
  };

  // Handle add/edit itinerary item
  const handleSaveItineraryItem = () => {
    if (!itemTitle.trim() || !itemDescription.trim() || itemDurationMinutes <= 0 || !itemImage) return;

    const durationText = itemDurationMinutes === 60 ? "1 hour" : 
                        itemDurationMinutes < 60 ? `${itemDurationMinutes} mins` :
                        `${Math.floor(itemDurationMinutes / 60)} hour${Math.floor(itemDurationMinutes / 60) > 1 ? 's' : ''} ${itemDurationMinutes % 60 > 0 ? `${itemDurationMinutes % 60} mins` : ''}`.trim();

    if (editingItem !== null) {
      // Edit existing item
      const updated = [...itineraryItems];
      updated[editingItem] = {
        ...updated[editingItem],
        title: itemTitle.trim(),
        description: itemDescription.trim(),
        duration: durationText,
        durationMinutes: itemDurationMinutes,
        image: itemImage || updated[editingItem].image,
      };
      setItineraryItems(updated);
    } else {
      // Add new item
      const newItem = {
        id: Date.now() + Math.random(),
        title: itemTitle.trim(),
        description: itemDescription.trim(),
        duration: durationText,
        durationMinutes: itemDurationMinutes,
        image: itemImage || '',
      };
      setItineraryItems([...itineraryItems, newItem]);
    }

    // Reset form
    setItemTitle("");
    setItemDescription("");
    setItemDuration("");
    setItemDurationMinutes(60);
    setItemImage("");
    setEditingItem(null);
    setItineraryModalStep(1);
    setShowItineraryModal(false);
    saveQualificationData();
  };

  // Handle edit itinerary item
  const handleEditItineraryItem = (index) => {
    const item = itineraryItems[index];
    setItemTitle(item.title);
    setItemDescription(item.description || "");
    setItemDurationMinutes(item.durationMinutes || 60);
    setItemDuration(item.durationMinutes === 60 ? "1 hour" : 
                   item.durationMinutes < 60 ? `${item.durationMinutes} mins` :
                   `${Math.floor(item.durationMinutes / 60)} hour${Math.floor(item.durationMinutes / 60) > 1 ? 's' : ''} ${item.durationMinutes % 60 > 0 ? `${item.durationMinutes % 60} mins` : ''}`.trim());
    setItemImage(item.image || '');
    setEditingItem(index);
    setItineraryModalStep(1);
    setShowItineraryModal(true);
  };

  // Handle remove itinerary item
  const handleRemoveItineraryItem = (index) => {
    const updated = itineraryItems.filter((_, i) => i !== index);
    setItineraryItems(updated);
    saveQualificationData();
  };

  // Handle open add itinerary modal
  const handleOpenItineraryModal = () => {
    setItemTitle("");
    setItemDescription("");
    setItemDuration("");
    setItemDurationMinutes(60);
    setItemImage("");
    setEditingItem(null);
    setItineraryModalStep(1);
    setShowItineraryModal(true);
  };

  // Handle itinerary modal navigation
  const handleItineraryModalNext = () => {
    if (itineraryModalStep === 1 && itemTitle.trim().length > 0) {
      setItineraryModalStep(2);
    } else if (itineraryModalStep === 2 && itemDescription.trim().length >= 30) {
      setItineraryModalStep(3);
    } else if (itineraryModalStep === 3) {
      setItineraryModalStep(4);
    } else if (itineraryModalStep === 4 && itemImage) {
      handleSaveItineraryItem();
    }
  };

  const handleItineraryModalBack = () => {
    if (itineraryModalStep > 1) {
      setItineraryModalStep(itineraryModalStep - 1);
    } else {
      setShowItineraryModal(false);
    }
  };

  const handleDecrementDuration = async () => {
    if (itemDurationMinutes > 1) {
      const newValue = itemDurationMinutes - 1;
      setItemDurationMinutes(newValue);
      setTempDurationValue(newValue.toString());
      // Save to Firebase when duration changes - await to ensure save completes
      try {
        await saveQualificationData();
        console.log("✅ Duration decremented and saved to Firebase:", newValue);
      } catch (error) {
        console.error("❌ Error saving duration change:", error);
        alert("Failed to save duration change. Please try again.");
      }
    }
  };

  const handleIncrementDuration = async () => {
    const newValue = itemDurationMinutes + 1;
    setItemDurationMinutes(newValue);
    setTempDurationValue(newValue.toString());
    // Save to Firebase when duration changes - await to ensure save completes
    try {
      await saveQualificationData();
      console.log("✅ Duration incremented and saved to Firebase:", newValue);
    } catch (error) {
      console.error("❌ Error saving duration change:", error);
      alert("Failed to save duration change. Please try again.");
    }
  };

  const handleDurationClick = () => {
    setIsEditingDuration(true);
    setTempDurationValue(itemDurationMinutes.toString());
  };

  const handleDurationBlur = async () => {
    const value = parseInt(tempDurationValue) || 1;
    const finalValue = value < 1 ? 1 : value;
    setItemDurationMinutes(finalValue);
    setTempDurationValue(finalValue.toString());
    setIsEditingDuration(false);
    // Save to Firebase when duration changes - await to ensure save completes
    try {
      await saveQualificationData();
      console.log("✅ Duration edited and saved to Firebase:", finalValue);
    } catch (error) {
      console.error("❌ Error saving duration change:", error);
      alert("Failed to save duration change. Please try again.");
    }
  };

  const handleDurationKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDurationBlur();
    } else if (e.key === 'Escape') {
      setTempDurationValue(itemDurationMinutes.toString());
      setIsEditingDuration(false);
    }
  };

  const handleSelectPhotoFromGallery = (photo) => {
    setItemImage(photo.url || photo.base64);
  };

  const handleSelectAddress = async (suggestion) => {
    setMeetingAddress(suggestion.display_name);
    setShowAddressModal(false);
    setAddressSearch("");
    setAddressSuggestions([]);
    
    // Parse address details from Nominatim result
    try {
      // Fetch detailed address information
      const detailsUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${suggestion.lat}&lon=${suggestion.lon}&addressdetails=1`;
      let addressData = null;
      
      try {
        const response = await fetch(`/api/nominatim/reverse?lat=${suggestion.lat}&lon=${suggestion.lon}&addressdetails=1`);
        if (response.ok) {
          addressData = await response.json();
        }
      } catch {
        try {
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(detailsUrl)}`;
          const resp = await fetch(proxyUrl);
          if (resp.ok) {
            const proxyData = await resp.json();
            addressData = JSON.parse(proxyData.contents || '{}');
          }
        } catch (e) {
          console.error('Error fetching address details:', e);
        }
      }
      
      if (addressData && addressData.address) {
        const addr = addressData.address;
        setConfirmCountry(addr.country || "Philippines");
        setConfirmStreetAddress(addr.road || addr.house_number ? `${addr.house_number || ''} ${addr.road || ''}`.trim() : "");
        setConfirmBarangay(addr.suburb || addr.neighbourhood || addr.village || "");
        setConfirmCity(addr.city || addr.town || addr.municipality || "");
        setConfirmZipCode(addr.postcode || "");
        setConfirmProvince(addr.state || addr.region || "");
      } else {
        // Fallback: try to parse from display_name
        const parts = suggestion.display_name.split(',');
        if (parts.length > 0) {
          setConfirmStreetAddress(parts[0].trim());
          if (parts.length > 1) setConfirmCity(parts[parts.length - 2]?.trim() || "");
          if (parts.length > 0) {
            const lastPart = parts[parts.length - 1].trim();
            if (lastPart.match(/^\d+$/)) {
              setConfirmZipCode(lastPart);
            }
          }
        }
      }
      
      // Set map position from selected address coordinates
      if (suggestion.lat && suggestion.lon) {
        setMapPosition([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
      }
      
      setShowConfirmLocation(true);
      setShowMap(true);
      saveQualificationData();
    } catch (error) {
      console.error('Error parsing address:', error);
      setShowConfirmLocation(true);
      saveQualificationData();
    }
  };

  const handleSaveAndExit = async () => {
    console.log("🚀 ExperienceDetails handleSaveAndExit called");
    console.log("📊 Current state values before save:", {
      yearsOfExperience,
      yearsOfExperienceRef: yearsOfExperienceRef.current,
      introTitle,
      expertise,
      recognition,
      currentStep
    });
    try {
      const { auth } = await import("@/lib/firebase");
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("Please log in to save your progress.");
        navigate("/login");
        return;
      }

      console.log("💾 Saving qualification data with current values...");
      // Use the ref value to ensure we have the most up-to-date value
      const currentYearsValue = yearsOfExperienceRef.current !== undefined ? yearsOfExperienceRef.current : yearsOfExperience;
      console.log("💾 Using yearsOfExperience value:", currentYearsValue, "(from ref:", yearsOfExperienceRef.current, ", from state:", yearsOfExperience, ")");
      await saveQualificationData(currentYearsValue);
      console.log("✅ Data saved, navigating to listings page...");

      // Get the updated draftId after saving (in case it was created)
      const updatedDraftId = state.draftId || location.state?.draftId;

      // Navigate to listings page with state to scroll to saved drafts section
      navigate("/host/listings", {
        state: {
          scrollToDrafts: true,
          draftId: updatedDraftId,
          message: "Draft saved successfully!",
        },
      });
      console.log("✅ Navigation to listings page initiated");
    } catch (error) {
      console.error("❌ Error saving draft:", error);
      alert("Failed to save. Please try again.");
    }
  };

  const handleNext = async () => {
    try {
      // Always save before any navigation or action - this ensures all current data is saved to Firebase
      // Same functionality as Save & Exit
      console.log("💾 handleNext: Saving data before navigation, currentStep:", currentStep);
    await saveQualificationData();
    
    // If on Step 13, set termsAgreed to true when clicking Next (which acts as "I agree")
    if (currentStep === 13) {
      setTermsAgreed(true);
      await saveQualificationData(); // Save again after setting termsAgreed
    }
    
    // Use the actual currentStep state, not displayStep
    const actualCurrentStep = currentStep !== null ? currentStep : (location.state?.currentStepNumber ?? 1);
    
    // If on Step 15, open the modal only if title/description don't exist yet
    if (actualCurrentStep === 15) {
      if (experienceTitle.trim().length === 0 || experienceDescription.trim().length === 0) {
        setShowCreateOwnModal(true);
        return; // Already saved above
      }
      // If title/description exist, proceed normally to next step
    }
    
    // If on Step 16, submit the listing
    if (actualCurrentStep === 16) {
      await handleSubmitListing();
      return; // handleSubmitListing already saves
    }

    // Navigate to next step
    if (actualCurrentStep < totalSteps) {
        const nextStep = actualCurrentStep + 1;
        setCurrentStep(nextStep);
        // Save again after moving to next step to update currentStepNumber in Firebase
        // This ensures the draft knows which step we're on, same as Save & Exit
        console.log("💾 handleNext: Saving after moving to step", nextStep);
        await saveQualificationData();
    } else {
        // This should never execute since step 16 is handled above
        // But if it does, save and stay on current step
        console.warn("⚠️ ExperienceDetails: Reached else block in handleNext, this shouldn't happen");
        await saveQualificationData();
      }
    } catch (error) {
      console.error("❌ Error in handleNext:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        currentStep: currentStep !== null ? currentStep : (location.state?.currentStepNumber ?? 1),
        photosCount: photos?.length || 0,
        draftId: state.draftId || location.state?.draftId,
        photosSample: photos?.slice(0, 2).map(p => ({
          id: p.id,
          name: p.name,
          hasUrl: !!p.url,
          urlType: p.url?.startsWith('blob:') ? 'blob' : 'regular',
          hasBase64: !!p.base64,
          base64Length: p.base64?.length || 0
        }))
      });
      alert("Failed to save progress: " + (error.message || "Unknown error. Please try again."));
    }
  };

  const handleBack = async () => {
    try {
    // Always save before going back
    await saveQualificationData();
    
    navigate("/pages/experience-listing-summary", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "experience",
        experienceCategory: mainCategory,
      },
    });
    } catch (error) {
      console.error("❌ Error in handleBack:", error);
      alert("Failed to save progress. Please try again.");
    }
  };

  const handlePreviousStep = async () => {
    try {
      // Always save before going to previous step - this ensures all current data is saved to Firebase
      const actualCurrentStep = currentStep !== null ? currentStep : (location.state?.currentStepNumber ?? 1);
      console.log("💾 handlePreviousStep: Saving data before going back, currentStep:", actualCurrentStep);
    await saveQualificationData();
      const previousStep = actualCurrentStep - 1;
      setCurrentStep(previousStep);
      // Save again after moving to previous step to update currentStepNumber in Firebase
      // This ensures the draft knows which step we're on, same as Save & Exit
      console.log("💾 handlePreviousStep: Saving after moving to step", previousStep);
      await saveQualificationData();
      // Note: The useEffect will automatically reload data when currentStep changes
      // because we added currentStep to the dependency array, ensuring saved values are displayed
    } catch (error) {
      console.error("❌ Error in handlePreviousStep:", error);
      alert("Failed to save progress. Please try again.");
    }
  };

  const handleSaveTitleAndDescription = async () => {
    try {
      // Validate that both fields have content
      if (experienceTitle.trim().length === 0 || experienceDescription.trim().length === 0) {
        alert("Please enter both a title and description.");
        return;
      }

      // Save to Firebase
      console.log("💾 Saving title and description:", {
        title: experienceTitle.substring(0, 50),
        description: experienceDescription.substring(0, 100)
      });
      await saveQualificationData();
      
      // Close the modal
      setShowCreateOwnModal(false);
      
      console.log("✅ Title and description saved successfully");
    } catch (error) {
      console.error("❌ Error saving title and description:", error);
      alert("Failed to save title and description. Please try again.");
    }
  };

  // Handle submit listing
  const handleSubmitListing = async () => {
    try {
      setIsLoading(true);
      const draftId = state.draftId || location.state?.draftId;
      
      if (!draftId) {
        console.error("❌ No draftId available");
        alert("Error: No draft found. Please start over.");
        return;
      }

      // Save all current data to draft first
      await saveQualificationData();
      
      // Get draft data
      const draftRef = doc(db, "onboardingDrafts", draftId);
      const draftSnap = await getDoc(draftRef);
      
      if (!draftSnap.exists()) {
        console.error("❌ Draft not found");
        alert("Error: Draft not found. Please start over.");
        return;
      }

      const draftData = draftSnap.data();
      const data = draftData.data || {};
      
      // Prepare location data
      const locationData = {
        country: data.confirmCountry || data.country || "Philippines",
        province: data.confirmProvince || data.province || "",
        city: data.confirmCity || data.city || "",
        barangay: data.confirmBarangay || data.barangay || "",
        streetAddress: data.confirmStreetAddress || data.streetAddress || "",
        unit: data.confirmUnit || data.unit || "",
        buildingName: data.confirmBuildingName || data.buildingName || "",
        zipCode: data.confirmZipCode || data.zipCode || "",
        locationName: data.locationName || "",
        lat: data.mapLat || null,
        lng: data.mapLng || null,
      };
      
      // Prepare meeting address/location
      const meetingAddressData = {
        address: data.meetingAddress || "",
        country: data.confirmCountry || data.country || "Philippines",
        province: data.confirmProvince || data.province || "",
        city: data.confirmCity || data.city || "",
        streetAddress: data.confirmStreetAddress || data.streetAddress || "",
        lat: data.mapLat || null,
        lng: data.mapLng || null,
      };
      
      // Prepare pricing data
      const pricingData = {
        pricePerGuest: parseFloat(data.pricePerGuest || 0),
        privateGroupMinimum: parseFloat(data.privateGroupMinimum || 0),
      };
      
      // Prepare listing data
      const listingData = {
        category: "experience",
        title: data.experienceTitle || "Untitled Experience",
        description: data.experienceDescription || "",
        descriptionHighlights: [],
        location: locationData,
        photos: data.photos || [],
        pricing: pricingData,
        // Experience-specific fields
        experienceCategory: data.experienceCategory || mainCategory || "art-and-design",
        experienceSubcategory: data.experienceSubcategory || location.state?.experienceSubcategory || null,
        yearsOfExperience: data.yearsOfExperience || 10,
        introTitle: data.introTitle || "",
        expertise: data.expertise || "",
        recognition: data.recognition || "",
        profiles: data.profiles || [],
        residentialAddress: {
          country: data.country || "Philippines",
          province: data.province || "",
          city: data.city || "",
          barangay: data.barangay || "",
          streetAddress: data.streetAddress || "",
          unit: data.unit || "",
          buildingName: data.buildingName || "",
          zipCode: data.zipCode || "",
        },
        meetingAddress: meetingAddressData,
        meetingLocationData: {
          lat: data.mapLat || null,
          lng: data.mapLng || null,
          address: data.meetingAddress || "",
        },
        itineraryItems: data.itineraryItems || [],
        maxGuests: data.maxGuests || 1,
        pricePerGuest: data.pricePerGuest || null,
        privateGroupMinimum: data.privateGroupMinimum || null,
        experienceDiscounts: data.discounts || [],
        willTransportGuests: data.willTransportGuests !== undefined ? data.willTransportGuests : null,
        transportationTypes: data.transportationTypes || [],
        termsAgreed: data.termsAgreed !== undefined ? data.termsAgreed : false,
        experienceTitle: data.experienceTitle || "",
        experienceDescription: data.experienceDescription || "",
        // Use photos from state (which have base64) instead of draft (which were sanitized)
        // This ensures photos are included in the listing
        photos: photos.length > 0 ? photos : (data.photos || []),
      };
      
      // Check if listing already exists (for updates)
      const existingListingId = draftData.publishedListingId || null;
      
      // Create or update listing
      console.log("📝 Creating experience listing...", {
        existingListingId,
        title: listingData.title,
        category: listingData.category,
        photosCount: listingData.photos.length,
        photosFromState: photos.length,
        photosFromDraft: data.photos?.length || 0,
        firstPhotoHasBase64: listingData.photos[0]?.base64 ? true : false,
        firstPhotoHasUrl: listingData.photos[0]?.url ? true : false,
        firstPhotoKeys: listingData.photos[0] ? Object.keys(listingData.photos[0]) : [],
      });
      
      const listingId = await createListing(listingData, existingListingId);
      console.log("✅ Experience listing created/updated:", listingId);
      
      // Update draft with publishedListingId and mark as published
      await updateDoc(draftRef, {
        publishedListingId: listingId,
        published: true,
        status: "published",
        lastModified: new Date(),
      });
      
      // Navigate to listings page
      navigate("/host/listings", {
      state: {
        draftId,
          listingId,
        submitted: true,
      },
    });
    } catch (error) {
      console.error("❌ Error submitting experience listing:", error);
      alert("Failed to submit listing: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Social media platforms
  const socialPlatforms = [
    { id: "facebook", name: "Facebook", icon: Facebook, color: "bg-blue-600" },
    { id: "instagram", name: "Instagram", icon: Instagram, color: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600" },
    { id: "tiktok", name: "TikTok", icon: null, color: "bg-black" },
  ];

  // Get step label
  const getStepLabel = (stepNumber) => {
    const stepLabels = {
      1: "About you",
      2: "About you",
      3: "Photos",
      4: "Description",
      5: "Camera",
      6: "Trash",
      7: "Building",
    };
    return stepLabels[stepNumber] || `Step ${stepNumber}`;
  };

  // Get platform icon component
  const getPlatformIcon = (platformId) => {
    const platform = socialPlatforms.find((p) => p.id === platformId);
    if (!platform) return null;
    if (platform.icon) {
      const Icon = platform.icon;
      return <Icon className="w-8 h-8 text-white" />;
    }
    // TikTok custom icon
    if (platformId === "tiktok") {
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
          <path
            d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
            fill="white"
          />
        </svg>
      );
    }
    return null;
  };

  // Render content based on current step
  // Use displayStep to ensure we always render the correct step even if currentStep is null
  const renderStepContent = () => {
    const stepToRender = currentStep !== null ? currentStep : (location.state?.currentStepNumber ?? 1);
    switch (stepToRender) {
      case 1:
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 text-center">
              How many years have you worked in {categoryName}?
            </h1>
            <div className="flex items-center gap-8">
              <button
                onClick={handleDecrement}
                className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={yearsOfExperience === 0}
              >
                <span className="text-2xl font-light text-gray-600">−</span>
              </button>
              <div className="text-6xl md:text-7xl font-bold text-gray-900 min-w-[120px] text-center">
                {yearsOfExperience ?? 10}
              </div>
              <button
                onClick={handleIncrement}
                className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
              >
                <span className="text-2xl font-light text-gray-600">+</span>
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <>
            <div className="max-w-4xl mx-auto w-full">
              {/* Circular Image */}
              <div className="mb-2 flex justify-center">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
                  <img
                    src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop"
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Heading */}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 text-center">
                Share your qualifications
              </h1>
              <p className="text-base text-gray-600 mb-4 text-center">
                Help guests get to know you.
              </p>

              {/* Cards */}
              <div className="space-y-2">
                {/* Intro Card */}
                <button 
                  onClick={() => setShowIntroModal(true)}
                  className="w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      introTitle ? "bg-gray-200" : "bg-gray-100"
                    }`}>
                      {introTitle ? (
                        <GraduationCap className="w-4 h-4 text-gray-900" />
                      ) : (
                        <GraduationCap className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="text-base font-semibold text-gray-900">Intro</h3>
                      {introTitle ? (
                        <p className="text-xs text-gray-600 mt-0.5 truncate">{introTitle}</p>
                      ) : (
                        <p className="text-xs text-gray-500">Give yourself a title</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>

                {/* Expertise Card */}
                <button 
                  onClick={() => setShowExpertiseModal(true)}
                  className="w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      expertise ? "bg-gray-200" : "bg-gray-100"
                    }`}>
                      {expertise ? (
                        <Sparkles className="w-4 h-4 text-gray-900" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="text-base font-semibold text-gray-900">Expertise</h3>
                      {expertise ? (
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{expertise}</p>
                      ) : (
                        <p className="text-xs text-gray-500">Showcase your experience</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>

                {/* Recognition Card */}
                <button 
                  onClick={() => setShowRecognitionModal(true)}
                  className="w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      recognition ? "bg-gray-200" : "bg-gray-100"
                    }`}>
                      {recognition ? (
                        <Award className="w-4 h-4 text-gray-900" />
                      ) : (
                        <Plus className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="text-base font-semibold text-gray-900">Recognition (optional)</h3>
                      {recognition ? (
                        <p className="text-xs text-gray-600 mt-0.5">{recognition}</p>
                      ) : (
                        <p className="text-xs text-gray-500">Add a career highlight</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>
              </div>

              {/* Get tips link */}
              <div className="mt-2 flex justify-start">
                <button className="text-gray-600 hover:text-gray-900 transition-colors text-xs">
                  Get tips
                </button>
              </div>
            </div>

            {/* Intro Modal */}
            {showIntroModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowIntroModal(false)}>
                <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Give yourself a title</h2>
                    <button
                      onClick={() => setShowIntroModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-6">
                    <input
                      type="text"
                      value={introTitle}
                      onChange={(e) => setIntroTitle(e.target.value)}
                      placeholder="Enter your title"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg"
                      maxLength={40}
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      {introTitle.length}/40 available
                    </p>
                  </div>
                  <div className="p-6 border-t flex items-center justify-between">
                    <button
                      onClick={() => setShowIntroModal(false)}
                      className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
                    >
                      Get tips
                    </button>
                    <button
                      onClick={handleSaveIntro}
                      className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Expertise Modal */}
            {showExpertiseModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowExpertiseModal(false)}>
                <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Showcase your experience</h2>
                    <button
                      onClick={() => setShowExpertiseModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-6">
                    <textarea
                      value={expertise}
                      onChange={(e) => setExpertise(e.target.value)}
                      placeholder="Describe your experience..."
                      rows={6}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg resize-none"
                    />
                    <p className={`text-sm mt-2 ${expertise.length < 150 ? 'text-gray-500' : 'text-red-500'}`}>
                      {expertise.length}/150 required characters
                    </p>
                  </div>
                  <div className="p-6 border-t flex items-center justify-between">
                    <button
                      onClick={() => setShowExpertiseModal(false)}
                      className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
                    >
                      Get tips
                    </button>
                    <button
                      onClick={handleSaveExpertise}
                      className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recognition Modal */}
            {showRecognitionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowRecognitionModal(false)}>
                <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Add a career highlight</h2>
                    <button
                      onClick={() => setShowRecognitionModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-6">
                    <input
                      type="text"
                      value={recognition}
                      onChange={(e) => setRecognition(e.target.value)}
                      placeholder="Featured in W Magazine"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg"
                      maxLength={90}
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      {recognition.length}/90 available
                    </p>
                  </div>
                  <div className="p-6 border-t flex items-center justify-between">
                    <button
                      onClick={() => setShowRecognitionModal(false)}
                      className="px-6 py-2.5 text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRecognition}
                      disabled={!recognition.trim()}
                      className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      case 3:
        return (
          <>
            <div className="max-w-3xl mx-auto w-full text-center">
              {/* Heading */}
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Add your online profiles
              </h1>
              <p className="text-base text-gray-600 mb-8 max-w-2xl mx-auto">
                We'll review your profiles and may suggest content and photos to improve your listing. Guests won't see these links.
              </p>

              {/* Social Media Cards */}
              {profiles.length > 0 && (
                <div className="flex justify-center gap-4 mb-8 flex-wrap">
                  {profiles.map((profile, index) => {
                    const platform = socialPlatforms.find((p) => p.id === profile.platform);
                    return (
                      <div
                        key={profile.id}
                        className="relative group"
                        style={{
                          transform: `rotate(${(index - Math.floor(profiles.length / 2)) * 8}deg)`,
                          zIndex: profiles.length - index,
                        }}
                      >
                        <div className={`w-20 h-20 rounded-lg ${platform?.color || "bg-gray-200"} flex items-center justify-center shadow-lg`}>
                          {getPlatformIcon(profile.platform)}
                        </div>
                        <button
                          onClick={() => handleRemoveProfile(profile.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Profile Button */}
              <button
                onClick={() => setShowAddProfileModal(true)}
                className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-base font-medium"
              >
                Add profile
              </button>
            </div>

            {/* Add Profile Modal */}
            {showAddProfileModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddProfileModal(false)}>
                <div className="bg-white rounded-lg max-w-md w-full shadow-2xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Add profile</h2>
                    <button
                      onClick={() => setShowAddProfileModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select platform
                    </label>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {socialPlatforms.map((platform) => (
                        <button
                          key={platform.id}
                          onClick={() => setSelectedPlatform(platform.id)}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            selectedPlatform === platform.id
                              ? "border-gray-900 bg-gray-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className={`w-12 h-12 ${platform.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                            {getPlatformIcon(platform.id)}
                          </div>
                          <p className="text-xs text-gray-600">{platform.name}</p>
                        </button>
                      ))}
                    </div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile URL
                    </label>
                    <input
                      type="url"
                      value={profileUrl}
                      onChange={(e) => setProfileUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg"
                    />
                  </div>
                  <div className="p-6 border-t flex items-center justify-end gap-3">
                    <button
                      onClick={() => setShowAddProfileModal(false)}
                      className="px-6 py-2.5 text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProfile}
                      disabled={!selectedPlatform || !profileUrl.trim()}
                      className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      case 4:
        return (
          <div className="max-w-3xl mx-auto w-full mb-12">
            {/* Heading */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
              Let us know a bit more about you
            </h1>

            {/* Residential Address Section */}
            <div className="mb-8">
              <h2 className="text-base font-semibold text-gray-900 mb-0.5">
                What's your residential address?
              </h2>
              <p className="text-xs text-gray-600 mb-4">
                Guests won't see this information.
              </p>

              <div className="space-y-3">
                {/* Country/region */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Country/region
                  </label>
                  <div className="relative">
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors appearance-none bg-white text-sm"
                    >
                      <option value="Philippines">Philippines</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Unit, level, etc. */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Unit, level, etc. (if applicable)
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                {/* Building name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Building name (if applicable)
                  </label>
                  <input
                    type="text"
                    value={buildingName}
                    onChange={(e) => setBuildingName(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                {/* Street address */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Street address
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                {/* Barangay / district */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Barangay / district (if applicable)
                  </label>
                  <input
                    type="text"
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                {/* City / municipality */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    City / municipality
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                {/* ZIP code */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ZIP code
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                {/* Province */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Province
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Business Hosting Question */}
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-0.5">
                    Are you hosting as a business?
                  </h2>
                  <p className="text-xs text-gray-600">
                    This means your business is most likely registered with your state or government.
                  </p>
                </div>
                <button className="text-gray-600 hover:text-gray-900 transition-colors text-xs underline ml-4 whitespace-nowrap">
                  Get details
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsBusinessHosting(true)}
                  className={`flex-1 px-4 py-2 border-2 rounded-lg transition-colors text-sm font-medium ${
                    isBusinessHosting === true
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setIsBusinessHosting(false)}
                  className={`flex-1 px-4 py-2 border-2 rounded-lg transition-colors text-sm font-medium ${
                    isBusinessHosting === false
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <>
            <div className="max-w-3xl mx-auto w-full mb-12">
              {/* Heading */}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 text-center">
                Where should guests meet you?
              </h1>
              <p className="text-sm text-gray-600 mb-8 text-center">
                Guests will see this address on your listing.
              </p>

              {/* Address Input */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={meetingAddress}
                  onChange={() => {}}
                  onClick={handleAddressInputClick}
                  placeholder="Enter an address"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors cursor-pointer text-sm"
                  readOnly
                />
              </div>

              {/* Confirm Location Section */}
              {showConfirmLocation && (
                <div className="mt-12">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1 text-center">
                    Confirm location
                  </h2>
                  <p className="text-sm text-gray-600 mb-6 text-center">
                    Make sure this address is correct. You can't change it once you submit your listing.
                  </p>

                  <div className="space-y-3">
                    {/* Country/region */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Country / region
                      </label>
                      <div className="relative">
                        <select
                          value={confirmCountry}
                          onChange={(e) => {
                            setConfirmCountry(e.target.value);
                            saveQualificationData();
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors appearance-none bg-white text-sm"
                        >
                          <option value="Philippines">Philippines</option>
                          <option value="United States">United States</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="Canada">Canada</option>
                          <option value="Australia">Australia</option>
                          <option value="Other">Other</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Unit, level, etc. */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unit, level, etc. (if applicable)
                      </label>
                      <input
                        type="text"
                        value={confirmUnit}
                        onChange={(e) => {
                          setConfirmUnit(e.target.value);
                          saveQualificationData();
                        }}
                        placeholder=""
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                      />
                    </div>

                    {/* Building name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Building name (if applicable)
                      </label>
                      <input
                        type="text"
                        value={confirmBuildingName}
                        onChange={(e) => {
                          setConfirmBuildingName(e.target.value);
                          saveQualificationData();
                        }}
                        placeholder=""
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                      />
                    </div>

                    {/* Street address */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Street address
                      </label>
                      <input
                        type="text"
                        value={confirmStreetAddress}
                        onChange={(e) => {
                          setConfirmStreetAddress(e.target.value);
                          saveQualificationData();
                        }}
                        placeholder=""
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                      />
                    </div>

                    {/* Barangay / district */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Barangay / district (if applicable)
                      </label>
                      <input
                        type="text"
                        value={confirmBarangay}
                        onChange={(e) => {
                          setConfirmBarangay(e.target.value);
                          saveQualificationData();
                        }}
                        placeholder=""
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                      />
                    </div>

                    {/* City / municipality */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        City / municipality
                      </label>
                      <input
                        type="text"
                        value={confirmCity}
                        onChange={(e) => {
                          setConfirmCity(e.target.value);
                          saveQualificationData();
                        }}
                        placeholder=""
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                      />
                    </div>

                    {/* ZIP code */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        ZIP code
                      </label>
                      <input
                        type="text"
                        value={confirmZipCode}
                        onChange={(e) => {
                          setConfirmZipCode(e.target.value);
                          saveQualificationData();
                        }}
                        placeholder=""
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                      />
                    </div>

                    {/* Province */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Province
                      </label>
                      <input
                        type="text"
                        value={confirmProvince}
                        onChange={(e) => {
                          setConfirmProvince(e.target.value);
                          saveQualificationData();
                        }}
                        placeholder=""
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                      />
                    </div>

                    {/* Location name (optional) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Location name (optional)
                      </label>
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => {
                          setLocationName(e.target.value);
                          saveQualificationData();
                        }}
                        placeholder="Location name (optional)"
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Map Section */}
              {showMap && (
                <div className="mt-12">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                    Is the pin in the right spot?
                  </h2>
                  
                  <div className="w-full h-[400px] rounded-lg overflow-hidden border-2 border-gray-200 mb-4">
                    <MapContainer
                      center={mapPosition}
                      zoom={18}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                      doubleClickZoom={true}
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <Marker
                        position={mapPosition}
                        icon={blackPinIcon}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => {
                            const { lat, lng } = e.target.getLatLng();
                            setMapPosition([lat, lng]);
                            saveQualificationData();
                          },
                        }}
                      />
                      <MapUpdater 
                        center={mapPosition} 
                        onMapClick={(e) => {
                          const { lat, lng } = e.latlng;
                          setMapPosition([lat, lng]);
                          saveQualificationData();
                        }} 
                      />
                    </MapContainer>
                  </div>

                  <button className="w-full px-6 py-4 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                    Drag the map to reposition the pin
                  </button>
                </div>
              )}
            </div>

            {/* Address Search Modal */}
            {showAddressModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleCloseAddressModal}>
                <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-gray-200 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Enter an address</h2>
                    <button
                      onClick={handleCloseAddressModal}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto">
                    <div className="relative mb-4">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <Search className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={addressSearch}
                        onChange={handleAddressSearchChange}
                        placeholder="Search for an address"
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg"
                        autoFocus
                      />
                    </div>

                    {/* Loading Spinner */}
                    {isLoadingAddress && (
                      <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}

                    {/* Suggestions List */}
                    {!isLoadingAddress && addressSuggestions.length > 0 && (
                      <div className="space-y-2">
                        {addressSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.place_id}
                            onClick={() => handleSelectAddress(suggestion)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                          >
                            <p className="text-sm text-gray-900">{suggestion.display_name}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No Results */}
                    {!isLoadingAddress && addressSearch.length >= 2 && addressSuggestions.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">No results found</p>
                      </div>
                    )}

                    {/* Initial State */}
                    {!isLoadingAddress && addressSearch.length < 2 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">Start typing to search for an address</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        );
      case 6:
        return (
          <div className="max-w-3xl mx-auto w-full mb-12">
            {/* Heading */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center">
              Add photos that showcase your skills
            </h1>
            <p className="text-sm text-gray-600 mb-8 text-center">
              Add at least 5 photos.
            </p>

            {/* Photos Display */}
            {photos.length > 0 && (
              <div className="flex justify-center gap-4 mb-8 relative" style={{ minHeight: '200px' }}>
                {photos.slice(0, 2).map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative group"
                    style={{
                      transform: `rotate(${index === 0 ? '-5deg' : '5deg'}) translateY(${index * 10}px)`,
                      zIndex: photos.length - index,
                    }}
                  >
                    <div className="w-48 h-64 rounded-lg overflow-hidden shadow-lg border-2 border-white">
                      <img
                        src={photo.url || photo.base64}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                ))}
                {photos.length > 2 && (
                  <div className="absolute right-0 top-0 text-sm text-gray-500 flex items-center gap-1">
                    +{photos.length - 2} more
                  </div>
                )}
              </div>
            )}

            {/* Add Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowPhotoModal(true)}
                className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-base font-medium flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Add
              </button>
            </div>

            {/* Get tips link */}
            <div className="mt-6 flex justify-start">
              <button className="text-gray-600 hover:text-gray-900 transition-colors text-xs">
                Get tips
              </button>
            </div>

            {/* Photo Upload Modal */}
            {showPhotoModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPhotoModal(false)}>
                <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
                  {/* Modal Header */}
                  <div className="p-6 border-b flex items-center justify-between">
                    <button
                      onClick={() => setShowPhotoModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900">Upload photos</h2>
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6">
                    <p className="text-sm text-gray-600 mb-6">
                      {selectedFiles.length === 0 ? "No items selected" : `${selectedFiles.length} item${selectedFiles.length > 1 ? 's' : ''} selected`}
                    </p>

                    {/* Drop Zone - Full size when no files, minimized when files exist */}
                    {selectedFiles.length === 0 ? (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                          isDragging ? 'border-primary bg-primary bg-opacity-5' : 'border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-4">
                          {/* Photo Icon */}
                          <div className="relative">
                            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Camera className="w-12 h-12 text-gray-400" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center opacity-80">
                              <Camera className="w-8 h-8 text-gray-400" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-base font-medium text-gray-900">Drag and drop</p>
                            <p className="text-sm text-gray-600">or browse for photos</p>
                          </div>

                          <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                          <button
                            onClick={() => photoInputRef.current?.click()}
                            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                          >
                            Browse
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Minimized Drop Zone */}
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors mb-6 ${
                            isDragging ? 'border-primary bg-primary bg-opacity-5' : 'border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-3">
                            <Camera className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-600">Drag and drop</span>
                            <span className="text-gray-400">or</span>
                            <input
                              ref={photoInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handlePhotoSelect}
                              className="hidden"
                            />
                            <button
                              onClick={() => photoInputRef.current?.click()}
                              className="text-sm text-gray-600 underline hover:text-gray-900 transition-colors"
                            >
                              browse for photos
                            </button>
                          </div>
                        </div>

                        {/* Separator */}
                        <div className="mb-6 border-t border-dashed border-gray-300"></div>
                      </>
                    )}

                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                      <div className="grid grid-cols-4 gap-4">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                              className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md"
                            >
                              <X className="w-3 h-3 text-gray-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 border-t flex items-center justify-between">
                    <button
                      onClick={handleDone}
                      className="px-6 py-2.5 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      Done
                    </button>
                    <button
                      onClick={handleAddPhotos}
                      disabled={selectedFiles.length === 0}
                      className={`px-6 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                        selectedFiles.length > 0
                          ? 'bg-gray-900 text-white hover:bg-gray-800'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 7:
        return (
          <>
            <div className="max-w-3xl mx-auto w-full mb-12">
              {/* Page Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
                Your itinerary
              </h1>

              {/* Heading */}
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
                Let guests know what<br />they'll do with an itinerary
              </h2>

              {/* Itinerary Items List */}
              {itineraryItems.length > 0 && (
                <div className="mb-8 relative">
                  {itineraryItems.map((item, index) => (
                    <div key={item.id || index} className="relative flex items-start gap-4 mb-4">
                      {/* Connecting Line */}
                      {index < itineraryItems.length - 1 && (
                        <div className="absolute left-12 top-24 w-0.5 bg-gray-200" style={{ height: 'calc(100% + 1rem)' }}></div>
                      )}
                      
                      {/* Image */}
                      <div className="relative z-10 flex-shrink-0">
                        {item.image ? (
                          <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-200">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center">
                            <Camera className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-gray-900 mb-1">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>{item.duration}</span>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditItineraryItem(index)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleRemoveItineraryItem(index)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Activity Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleOpenItineraryModal}
                  className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-base font-medium flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add activity
                </button>
              </div>
            </div>

            {/* Itinerary Item Modal - Multi-step */}
            {showItineraryModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowItineraryModal(false)}>
                <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  {/* Modal Header */}
                  <div className="p-6 border-b flex items-center justify-between">
                    <button
                      onClick={handleItineraryModalBack}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {itineraryModalStep > 1 ? (
                        <ChevronLeft className="w-6 h-6" />
                      ) : (
                        <X className="w-6 h-6" />
                      )}
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900 text-center flex-1">
                      {itineraryModalStep === 1 && "Title your first activity"}
                      {itineraryModalStep === 2 && "Describe what guests will do"}
                      {itineraryModalStep === 3 && "Set a duration"}
                      {itineraryModalStep === 4 && "Choose a photo"}
                    </h2>
                    <button
                      onClick={() => setShowItineraryModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6">
                    {/* Step 1: Title */}
                    {itineraryModalStep === 1 && (
                      <div className="space-y-6">
                        <input
                          type="text"
                          value={itemTitle}
                          onChange={(e) => setItemTitle(e.target.value)}
                          placeholder="Learn the basics"
                          className="w-full px-4 py-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-2xl font-bold"
                          autoFocus
                          maxLength={35}
                        />
                        <p className="text-sm text-gray-500 text-center">
                          {itemTitle.length}/35 available
                        </p>
                      </div>
                    )}

                    {/* Step 2: Description */}
                    {itineraryModalStep === 2 && (
                      <div className="space-y-6">
                        <div className="flex flex-col items-center justify-center min-h-[200px]">
                          {itemDescription.length > 0 ? (
                            <div className="text-9xl font-bold text-gray-900 mb-6">
                              {itemDescription.charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <div className="text-9xl font-bold text-gray-300 mb-6">S</div>
                          )}
                          <textarea
                            value={itemDescription}
                            onChange={(e) => setItemDescription(e.target.value)}
                            placeholder="Add details about the activity. For example, 'Learn the process behind leather making.'"
                            rows={6}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg resize-none"
                            autoFocus
                          />
                          <p className={`text-sm mt-2 ${itemDescription.length < 30 ? 'text-gray-500' : 'text-red-500'}`}>
                            {itemDescription.length}/30 required characters
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Duration */}
                    {itineraryModalStep === 3 && (
                      <div className="space-y-6">
                        <div className="flex flex-col items-center justify-center min-h-[300px]">
                          <div className="flex items-center gap-8 mb-4">
                            <button
                              onClick={handleDecrementDuration}
                              disabled={itemDurationMinutes <= 1 || isEditingDuration}
                              className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-2xl font-light text-gray-600">−</span>
                            </button>
                            {isEditingDuration ? (
                              <input
                                type="number"
                                value={tempDurationValue}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Allow empty string while typing
                                  if (value === '' || /^\d+$/.test(value)) {
                                    setTempDurationValue(value);
                                  }
                                }}
                                onBlur={handleDurationBlur}
                                onKeyDown={handleDurationKeyDown}
                                onClick={(e) => e.target.select()}
                                min="1"
                                autoFocus
                                className="text-7xl font-bold text-gray-900 min-w-[120px] text-center border-none outline-none bg-transparent focus:ring-2 focus:ring-primary rounded-lg px-2 cursor-text"
                                style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                              />
                            ) : (
                              <div 
                                onClick={handleDurationClick}
                                className="text-7xl font-bold text-gray-900 min-w-[120px] text-center cursor-text hover:bg-gray-50 rounded-lg px-2 transition-colors"
                                title="Click to edit"
                              >
                                {itemDurationMinutes}
                              </div>
                            )}
                            <button
                              onClick={handleIncrementDuration}
                              disabled={isEditingDuration}
                              className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-2xl font-light text-gray-600">+</span>
                            </button>
                          </div>
                          <p className="text-lg text-gray-600">
                            {itemDurationMinutes === 1 ? "Minute" : "Minutes"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Choose Photo */}
                    {itineraryModalStep === 4 && (
                      <div className="space-y-6">
                        {/* Search Input */}
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <BookOpen className="w-5 h-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="Search photos"
                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg"
                          />
                        </div>

                        {/* Photo Grid */}
                        <div className="grid grid-cols-3 gap-4">
                          {/* Available Photos */}
                          {availablePhotos.map((photo, index) => (
                            <button
                              key={photo.id || index}
                              onClick={() => handleSelectPhotoFromGallery(photo)}
                              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                                itemImage === (photo.url || photo.base64)
                                  ? 'border-primary'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <img
                                src={photo.url || photo.base64}
                                alt={photo.name}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                          
                          {/* Add Photo Option */}
                          <button
                            onClick={() => itineraryImageInputRef.current?.click()}
                            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
                          >
                            <input
                              ref={itineraryImageInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleItineraryImageSelect}
                              className="hidden"
                            />
                            <Plus className="w-8 h-8 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 border-t flex items-center justify-between">
                    <button
                      onClick={() => {}}
                      className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
                    >
                      Get tips
                    </button>

                    {/* Progress Indicator */}
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1 w-8 transition-colors ${
                            step <= itineraryModalStep ? 'bg-gray-900' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={handleItineraryModalNext}
                      disabled={
                        (itineraryModalStep === 1 && itemTitle.trim().length === 0) ||
                        (itineraryModalStep === 2 && itemDescription.trim().length < 30) ||
                        (itineraryModalStep === 4 && !itemImage) // Photo is required
                      }
                      className={`px-6 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                        (itineraryModalStep === 1 && itemTitle.trim().length > 0) ||
                        (itineraryModalStep === 2 && itemDescription.trim().length >= 30) ||
                        (itineraryModalStep === 3) ||
                        (itineraryModalStep === 4 && itemImage)
                          ? 'bg-gray-900 text-white hover:bg-gray-800'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {itineraryModalStep === 4 ? (editingItem !== null ? "Save" : "Add") : "Next"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      case 8:
        return (
          <div className="max-w-3xl mx-auto w-full mb-12">
            {/* Heading */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center">
              Add your maximum number of guests
            </h1>

            {/* Guest Counter */}
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <div className="flex items-center gap-8 mb-4">
                <button
                  onClick={() => setMaxGuests(Math.max(1, maxGuests - 1))}
                  disabled={maxGuests <= 1}
                  className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl font-light text-gray-600">−</span>
                </button>
                <div className="text-7xl font-bold text-gray-900 min-w-[120px] text-center">
                  {maxGuests}
                </div>
                <button
                  onClick={() => setMaxGuests(maxGuests + 1)}
                  className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
                >
                  <span className="text-2xl font-light text-gray-600">+</span>
                </button>
              </div>
            </div>
          </div>
        );
      case 9:
        return (
          <div className="max-w-3xl mx-auto w-full mb-12">
            {/* Heading */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center">
              Price per guest
            </h1>

            {/* Price Input */}
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <div className="flex items-center gap-3 mb-8">
                <span className="text-7xl font-bold text-gray-900">₱</span>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={pricePerGuest}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setPricePerGuest(value);
                    }}
                    placeholder=""
                    className="text-7xl font-bold text-gray-900 bg-transparent border-none outline-none w-auto min-w-[200px] text-left"
                    autoFocus
                    style={{ caretColor: 'transparent' }}
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-20 bg-gray-900 pointer-events-none"
                    style={{ 
                      left: `${pricePerGuest.length * 0.6}ch`,
                      animation: 'blink 1s infinite'
                    }}
                  ></div>
                </div>
                <style>{`
                  @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                  }
                `}</style>
              </div>

              {/* Learn more link */}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-sm text-gray-900 underline hover:text-gray-700 transition-colors"
              >
                Learn more about pricing
              </a>
            </div>
          </div>
        );
      case 10:
        return (
          <div className="max-w-3xl mx-auto w-full mb-12">
            {/* Heading */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 text-center">
              Private group minimum
            </h1>
            
            {/* Subtitle */}
            <p className="text-base text-gray-600 mb-12 text-center">
              Bookings will start at this price
            </p>

            {/* Price Input */}
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-7xl font-bold text-gray-900">₱</span>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={privateGroupMinimum}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setPrivateGroupMinimum(value);
                    }}
                    placeholder=""
                    className="text-7xl font-bold text-gray-900 bg-transparent border-none outline-none w-auto min-w-[200px] text-left"
                    autoFocus
                    style={{ caretColor: 'transparent' }}
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-20 bg-gray-900 pointer-events-none"
                    style={{ 
                      left: `${privateGroupMinimum.length * 0.6}ch`,
                      animation: 'blink 1s infinite'
                    }}
                  ></div>
                </div>
                <style>{`
                  @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                  }
                `}</style>
              </div>

              {/* Validation message */}
              {privateGroupMinimum && (
                (parseFloat(privateGroupMinimum) < 1200 || (pricePerGuest && parseFloat(privateGroupMinimum) < parseFloat(pricePerGuest))) && (
                  <div className="flex items-center gap-2 text-red-600 mb-4">
                    <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">i</span>
                    </div>
                    <span className="text-sm">
                      {parseFloat(privateGroupMinimum) < 1200 
                        ? "Set a price at or above ₱1,200"
                        : "Private group minimum must be at least equal to price per guest"}
                    </span>
                  </div>
                )
              )}

              {/* Learn more link */}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-sm text-gray-900 underline hover:text-gray-700 transition-colors"
              >
                Learn more about pricing
              </a>
            </div>
          </div>
        );
      case 11:
        return (
          <div className="max-w-3xl mx-auto w-full mb-12">
            {/* Heading */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center">
              Review your pricing
            </h1>

            {/* Pricing Cards */}
            <div className="space-y-4 mb-8">
              {/* Price per guest card */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-between">
                <span className="text-lg text-gray-900">Price per guest</span>
                <span className="text-xl font-bold text-gray-900">
                  ₱{pricePerGuest ? parseFloat(pricePerGuest).toLocaleString() : '0'}
                </span>
              </div>

              {/* Private group minimum card */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-between">
                <span className="text-lg text-gray-900">Private group minimum</span>
                <span className="text-xl font-bold text-gray-900">
                  ₱{privateGroupMinimum ? parseFloat(privateGroupMinimum).toLocaleString() : '0'}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-base text-gray-600 text-center mb-8">
              Guests pay ₱{pricePerGuest ? parseFloat(pricePerGuest).toLocaleString() : '0'} per guest with a private group minimum of ₱{privateGroupMinimum ? parseFloat(privateGroupMinimum).toLocaleString() : '0'}.
            </p>
          </div>
        );
      case 12:
        return (
          <div className="max-w-3xl mx-auto w-full mb-12">
            {/* Heading */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center">
              Add discounts
            </h1>

            {/* Discount Cards */}
            <div className="space-y-4 mb-8">
              {/* Limited-time discount */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-between hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => {
                  const exists = discounts.find(d => d.type === 'limited-time');
                  if (exists) {
                    setDiscounts(discounts.filter(d => d.type !== 'limited-time'));
                  } else {
                    setDiscounts([...discounts, { id: Date.now(), type: 'limited-time', name: 'Limited-time', description: 'Offer a deal for the first 30 days to encourage your first guests to book.' }]);
                  }
                }}
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Limited-time</h3>
                  <p className="text-sm text-gray-600">
                    Offer a deal for the first 30 days to encourage your first guests to book.
                  </p>
                </div>
                {discounts.find(d => d.type === 'limited-time') ? (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                ) : (
                  <Plus className="w-6 h-6 text-gray-400" />
                )}
              </div>

              {/* Early bird discount */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-between hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => {
                  const exists = discounts.find(d => d.type === 'early-bird');
                  if (exists) {
                    setDiscounts(discounts.filter(d => d.type !== 'early-bird'));
                  } else {
                    setDiscounts([...discounts, { id: Date.now(), type: 'early-bird', name: 'Early bird', description: 'Give a lower price to guests who book more than 2 weeks in advance.' }]);
                  }
                }}
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Early bird</h3>
                  <p className="text-sm text-gray-600">
                    Give a lower price to guests who book more than 2 weeks in advance.
                  </p>
                </div>
                {discounts.find(d => d.type === 'early-bird') ? (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                ) : (
                  <Plus className="w-6 h-6 text-gray-400" />
                )}
              </div>

              {/* Large group discounts */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-between hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => {
                  const exists = discounts.find(d => d.type === 'large-group');
                  if (exists) {
                    setDiscounts(discounts.filter(d => d.type !== 'large-group'));
                  } else {
                    setDiscounts([...discounts, { id: Date.now(), type: 'large-group', name: 'Large group discounts', description: 'Attract larger groups by giving them a discount.' }]);
                  }
                }}
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Large group discounts</h3>
                  <p className="text-sm text-gray-600">
                    Attract larger groups by giving them a discount.
                  </p>
                </div>
                {discounts.find(d => d.type === 'large-group') ? (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                ) : (
                  <Plus className="w-6 h-6 text-gray-400" />
                )}
              </div>

              {/* Custom Discounts */}
              {discounts.filter(d => d.type === 'custom').map((discount) => (
                <div key={discount.id} className="bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{discount.name}</h3>
                    <p className="text-sm text-gray-600">{discount.description}</p>
                    {discount.value !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">{discount.value}% off</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setDiscounts(discounts.filter(d => d.id !== discount.id));
                      saveQualificationData();
                    }}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}

              {/* Add discount */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-between hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => {
                  setShowDiscountModal(true);
                }}
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Add discount</h3>
                </div>
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
            </div>

            {/* Info text */}
            <p className="text-sm text-gray-600 text-center">
              We'll only apply one discount per booking, using the one with the biggest savings for guests.
            </p>

            {/* Custom Discount Modal */}
            {showDiscountModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDiscountModal(false)}>
                <div className="bg-white rounded-lg max-w-md w-full shadow-2xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Add custom discount</h2>
                    <button
                      onClick={() => {
                        setShowDiscountModal(false);
                        setCustomDiscountName("");
                        setCustomDiscountDescription("");
                        setCustomDiscountValue("");
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount name
                      </label>
                      <input
                        type="text"
                        value={customDiscountName}
                        onChange={(e) => setCustomDiscountName(e.target.value)}
                        placeholder="e.g., Weekend special"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={customDiscountDescription}
                        onChange={(e) => setCustomDiscountDescription(e.target.value)}
                        placeholder="Describe your discount..."
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount percentage (%)
                      </label>
                      <input
                        type="number"
                        value={customDiscountValue}
                        onChange={(e) => setCustomDiscountValue(e.target.value)}
                        placeholder="0"
                        min="0"
                        max="100"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors text-lg"
                      />
                    </div>
                  </div>
                  <div className="p-6 border-t flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowDiscountModal(false);
                        setCustomDiscountName("");
                        setCustomDiscountDescription("");
                        setCustomDiscountValue("");
                      }}
                      className="px-6 py-2.5 text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (customDiscountName.trim() && customDiscountValue.trim() && !isNaN(parseFloat(customDiscountValue)) && parseFloat(customDiscountValue) >= 0 && parseFloat(customDiscountValue) <= 100) {
                          const newDiscount = {
                            id: Date.now(),
                            type: 'custom',
                            name: customDiscountName.trim(),
                            description: customDiscountDescription.trim() || 'Custom discount',
                            value: parseFloat(customDiscountValue)
                          };
                          setDiscounts([...discounts, newDiscount]);
                          saveQualificationData();
                          setShowDiscountModal(false);
                          setCustomDiscountName("");
                          setCustomDiscountDescription("");
                          setCustomDiscountValue("");
                        }
                      }}
                      disabled={!customDiscountName.trim() || !customDiscountValue.trim() || isNaN(parseFloat(customDiscountValue)) || parseFloat(customDiscountValue) < 0 || parseFloat(customDiscountValue) > 100}
                      className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 13:
        return (
          <div className="max-w-3xl mx-auto w-full mb-12">
            {/* Heading */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 text-center">
              Share what you'll provide
            </h1>
            
            {/* Subtitle */}
            <p className="text-base text-gray-600 mb-12 text-center">
              This helps us know if we need to do license, insurance, quality, and standards checks.
            </p>

            {/* Question 1: Will you be transporting guests? */}
            <div className="mb-12">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Will you be transporting guests?</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setWillTransportGuests(true);
                  }}
                  className={`flex-1 px-6 py-4 border-2 rounded-lg text-base font-medium transition-colors ${
                    willTransportGuests === true
                      ? 'border-gray-900 bg-gray-50 text-gray-900'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => {
                    setWillTransportGuests(false);
                    setTransportationTypes([]);
                  }}
                  className={`flex-1 px-6 py-4 border-2 rounded-lg text-base font-medium transition-colors ${
                    willTransportGuests === false
                      ? 'border-gray-900 bg-gray-50 text-gray-900'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Question 2: How? Select all that apply. */}
            {willTransportGuests === true && (
              <div className="mb-12">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">How? Select all that apply.</h2>
                <div className="grid grid-cols-2 gap-4">
                  {['Car', 'Boat', 'Plane', 'Motorcycle'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        if (transportationTypes.includes(type)) {
                          setTransportationTypes(transportationTypes.filter(t => t !== type));
                        } else {
                          setTransportationTypes([...transportationTypes, type]);
                        }
                      }}
                      className={`px-6 py-4 border-2 rounded-lg text-base font-medium transition-colors ${
                        transportationTypes.includes(type)
                          ? 'border-gray-900 bg-gray-50 text-gray-900'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Terms and Conditions */}
            <div className="mb-8 space-y-4 text-sm text-gray-700">
              <p>
                You have read, understand, and agree to the <a href="/host/policies#experience" className="text-gray-900 underline hover:text-primary">experiences terms</a>, <a href="/host/policies#cancellation" className="text-gray-900 underline hover:text-primary">host cancellation policy</a> for experiences and services, and <a href="/host/policies#cancellation" className="text-gray-900 underline hover:text-primary">cancellation policies</a> for experiences and services. You also acknowledge the <a href="/host/policies#privacy" className="text-gray-900 underline hover:text-primary">privacy policy</a>.
              </p>
              <p>
                By selecting "I agree", you authorize Getaways to conduct <a href="#" className="text-gray-900 underline hover:text-gray-700">quality and standards checks</a> and you attest that you and third parties used in experiences and services will maintain all necessary licenses, authorizations, and customary commercial liability insurance.
              </p>
              <p>
                You attest that you will comply with the <a href="#" className="text-gray-900 underline hover:text-gray-700">experiences standards and requirements</a>, all laws and other requirements that apply to your experience, including those specific to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Handling, serving, or selling food, plus our <a href="#" className="text-gray-900 underline hover:text-gray-700">food safety guidelines</a></li>
                <li>Serving <a href="#" className="text-gray-900 underline hover:text-gray-700">alcohol</a>, like requirements for a licensed location and checking valid guest IDs</li>
                <li><a href="#" className="text-gray-900 underline hover:text-gray-700">Tour guiding</a> or otherwise accompanying guests in locations that require permits</li>
                <li>Operating on <a href="#" className="text-gray-900 underline hover:text-gray-700">public land, like a park</a>, which may require permits</li>
                <li><a href="#" className="text-gray-900 underline hover:text-gray-700">Transporting guests</a>, which may require licenses and motor carrier operating authority</li>
              </ul>
            </div>
          </div>
        );
      case 14:
        return (
          <div className="max-w-3xl mx-auto w-full mb-12">
            {/* Card Preview */}
            <div className="mb-12 flex justify-center">
              <div className="relative transform rotate-[-3deg]">
                <div className="bg-white rounded-lg shadow-xl overflow-hidden w-80">
                  {/* Card Image */}
                  <div className="relative h-48 bg-gray-200 overflow-hidden">
                    {photos.length > 0 ? (
                      <img
                        src={photos[0].url || photos[0].base64}
                        alt="Experience"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                        <Camera className="w-16 h-16 text-gray-500" />
                      </div>
                    )}
                    {/* Profile Picture Overlay */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden">
                        {state.user?.photoURL ? (
                          <img
                            src={state.user.photoURL}
                            alt="Host"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Content Placeholder */}
                  <div className="p-6 pt-8">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2 w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 text-center">
              Add an experience title and description
            </h1>
            
            {/* Subtitle */}
            <p className="text-base text-gray-600 mb-12 text-center">
              We'll share some options to get you started —then you'll choose one and make it your own.
            </p>
          </div>
        );
      case 15:
        // Show preview if title and description exist, otherwise show creating message
        if (experienceTitle.trim().length > 0 && experienceDescription.trim().length > 0) {
          return (
            <div className="max-w-3xl mx-auto w-full mb-12">
              {/* Heading */}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-12 text-center">
                Create your own title and description
              </h1>

              {/* Preview Card */}
              <div className="mb-8 flex justify-center">
                <div className="bg-white rounded-lg shadow-xl overflow-hidden w-full max-w-md">
                  {/* Card Image */}
                  <div className="relative h-64 bg-gray-200 overflow-hidden">
                    {photos.length > 0 ? (
                      <img
                        src={photos[0].url || photos[0].base64}
                        alt="Experience"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                        <Camera className="w-16 h-16 text-gray-500" />
                      </div>
                    )}
                    {/* Profile Picture Overlay */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden">
                        {state.user?.photoURL ? (
                          <img
                            src={state.user.photoURL}
                            alt="Host"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-6 pt-8 text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {experienceTitle}
                    </h3>
                    <p className="text-base text-gray-600">
                      {experienceDescription}
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowCreateOwnModal(true)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg text-base font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          );
        } else {
          return (
            <div className="max-w-3xl mx-auto w-full mb-12">
              {/* Heading */}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
                Creating titles and descriptions...
              </h1>
            </div>
          );
        }
      case 16:
        // Get location display text
        const locationDisplay = meetingAddress || (confirmStreetAddress ? `${confirmStreetAddress}, ${confirmCity}` : "");
        const locationText = locationDisplay.length > 30 ? locationDisplay.substring(0, 30) + "..." : locationDisplay;
        
        // Get pricing display
        const pricingText = pricePerGuest ? `₱${parseFloat(pricePerGuest).toLocaleString()} / guest` : "";
        
        // Get details display
        const detailsText = willTransportGuests === true && transportationTypes.length > 0 
          ? `Transportation: ${transportationTypes.join(", ")}` 
          : willTransportGuests === false 
          ? "No transportation" 
          : "Transportation";
        
        return (
          <div className="max-w-7xl mx-auto w-full mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Section - Review Items */}
              <div className="space-y-6">
                {/* Heading */}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    Submit your listing
                  </h1>
                  <p className="text-base text-gray-600">
                    Look over the details, then submit when you're ready.
                  </p>
                </div>

                {/* Review Items List */}
                <div className="space-y-2">
                  {/* About you */}
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">About you</div>
                        <div className="text-sm text-gray-600">Your qualifications</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>

                  {/* Location */}
                  <button
                    onClick={() => setCurrentStep(5)}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Location</div>
                        <div className="text-sm text-gray-600">{locationText || "Add location"}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>

                  {/* Photos */}
                  <button
                    onClick={() => setCurrentStep(6)}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Image className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Photos</div>
                        <div className="text-sm text-gray-600">{photos.length > 0 ? `${photos.length} photos` : "Add photos"}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>

                  {/* Itinerary */}
                  <button
                    onClick={() => setCurrentStep(7)}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Itinerary</div>
                        <div className="text-sm text-gray-600">{itineraryItems.length > 0 ? itineraryItems[0].title : "Add activities"}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>

                  {/* Pricing */}
                  <button
                    onClick={() => setCurrentStep(9)}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Pricing</div>
                        <div className="text-sm text-gray-600">{pricingText || "Set pricing"}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>

                  {/* Details */}
                  <button
                    onClick={() => setCurrentStep(13)}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Clipboard className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Details</div>
                        <div className="text-sm text-gray-600">{detailsText}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>

                  {/* Experience */}
                  <button
                    onClick={() => setCurrentStep(15)}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Building className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Experience</div>
                        <div className="text-sm text-gray-600">{experienceTitle || "Add title and description"}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Partner Organization */}
                <div className="pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-700 mb-2">Are you a partner organization?</p>
                  <button className="text-sm text-gray-600 hover:text-gray-900 underline">
                    Enter an invite code
                  </button>
                </div>
              </div>

              {/* Right Section - Preview Card */}
              <div className="lg:sticky lg:top-24 h-fit">
                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                  {/* Card Image */}
                  <div className="relative h-64 bg-gray-200 overflow-hidden">
                    {photos.length > 0 ? (
                      <img
                        src={photos[0].url || photos[0].base64}
                        alt="Experience"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                        <Camera className="w-16 h-16 text-gray-500" />
                      </div>
                    )}
                    {/* Profile Picture Overlay */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden">
                        {state.user?.photoURL ? (
                          <img
                            src={state.user.photoURL}
                            alt="Host"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-6 pt-8 text-center">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {experienceTitle || "Experience Title"}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <p className="text-gray-600">Step {stepToRender} content coming soon...</p>
          </div>
        );
    }
  };

  // Ensure currentStep is never null when we render
  // If it's null but we have a step from location, use that
  const displayStep = currentStep !== null ? currentStep : (location.state?.currentStepNumber ?? 1);
  
  // Ensure mainCategory has a value - use location.state first, then state, then default
  // This prevents blank pages when resuming drafts
  const displayCategory = mainCategory || location.state?.experienceCategory || "art-and-design";
  
  // Show loading only if we truly don't have any data and no step number from location
  // If we have a step number from location, we can render with defaults
  const hasStepFromLocation = location.state?.currentStepNumber !== undefined && location.state?.currentStepNumber !== null;
  const hasCategoryFromLocation = location.state?.experienceCategory !== undefined;
  const hasDraftId = state.draftId || location.state?.draftId;
  
  // Only show loading if we don't have a step number AND we're waiting for initial data load
  // If we have a step number from location, render immediately (data will load in background)
  const shouldShowLoading = !hasStepFromLocation && currentStep === null && !hasDraftId;
  
  if (shouldShowLoading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If we have a step from location but currentStep is still null, set it
  // This ensures the component works correctly when navigating with step number
  if (hasStepFromLocation && currentStep === null) {
    // Don't set it here as it would cause re-render, but use displayStep which already handles it
  }

  return (
    <div className="h-screen bg-white overflow-hidden">
      {/* Header with Sidebar Navigation (via OnboardingHeader) */}
      <OnboardingHeader 
        showProgress={false} 
        currentStepNameOverride={getCurrentStepName(displayStep)}
        experienceCurrentStep={displayStep}
        onExperienceStepChange={setCurrentStep}
        customSaveAndExit={handleSaveAndExit}
      />

      {/* Main Content Area - accounting for fixed header (~57px header + circles extending below) */}
      <div className="flex flex-col bg-white pt-[85px] h-screen">
        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto px-8 ${displayStep === 2 ? 'py-2' : displayStep === 4 ? 'py-4 pb-32' : displayStep === 5 ? 'py-12 pb-32' : displayStep === 6 ? 'py-12 pb-32' : displayStep === 7 ? 'py-12 pb-32' : displayStep === 8 ? 'py-12 pb-32' : displayStep === 9 ? 'py-12 pb-32' : displayStep === 10 ? 'py-12 pb-32' : displayStep === 11 ? 'py-12 pb-32' : displayStep === 12 ? 'py-12 pb-32' : displayStep === 13 ? 'py-12 pb-32' : displayStep === 14 ? 'py-12 pb-32' : displayStep === 15 ? 'py-12 pb-32' : displayStep === 16 ? 'py-12 pb-32' : 'py-12'} ${displayStep === 2 || displayStep === 4 || displayStep === 5 || displayStep === 6 || displayStep === 7 || displayStep === 8 || displayStep === 9 || displayStep === 10 || displayStep === 11 || displayStep === 12 || displayStep === 13 || displayStep === 14 || displayStep === 15 || displayStep === 16 ? '' : 'flex items-center justify-center'}`}>
          {renderStepContent()}
        </main>

        {/* Footer */}
        <OnboardingFooter
          onBack={displayStep === 1 ? handleBack : displayStep === 3 ? handleSkip : displayStep === 10 ? handleSkip : handlePreviousStep}
          onNext={handleNext}
          backText={displayStep === 3 || displayStep === 10 ? "Skip" : "Back"}
          nextText={displayStep === 13 ? "I agree" : displayStep === 15 ? (experienceTitle.trim().length > 0 && experienceDescription.trim().length > 0 ? "Next" : "Create your own") : displayStep === 16 ? "Submit for review" : "Next"}
          canProceed={
            displayStep === 2 
              ? (introTitle.trim().length > 0 && expertise.trim().length >= 150)
              : displayStep === 3
              ? true  // Profiles are optional, so always allow proceeding
              : displayStep === 4
              ? (streetAddress.trim().length > 0 && city.trim().length > 0 && zipCode.trim().length > 0 && province.trim().length > 0)
              : displayStep === 5
              ? (meetingAddress.trim().length > 0)  // Only require meetingAddress, confirm fields are optional
              : displayStep === 6
              ? (photos.length >= 5)
              : displayStep === 9
              ? (String(pricePerGuest || "").trim().length > 0 && !isNaN(parseFloat(pricePerGuest)) && parseFloat(pricePerGuest) > 0)
              : displayStep === 10
              ? (privateGroupMinimum.trim().length > 0 && !isNaN(parseFloat(privateGroupMinimum)) && parseFloat(privateGroupMinimum) >= 1200 && (!pricePerGuest || parseFloat(privateGroupMinimum) >= parseFloat(pricePerGuest)))
              : displayStep === 13
              ? (willTransportGuests !== null && (willTransportGuests === false || (willTransportGuests === true && transportationTypes.length > 0)))
              : displayStep === 15
              ? true  // Always allow clicking - if no title/description, it opens the modal; if they exist, proceed to next step
              : displayStep === 16
              ? true
              : true
          }
        />
        
        {/* Terms Disclaimer for Step 16 */}
        {displayStep === 16 && (
          <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 z-30 px-6 py-3">
            <p className="text-xs text-gray-600 text-center">
              By submitting, I agree to the <a href="#" className="text-gray-900 underline hover:text-gray-700">Experiences terms</a> and attest all details are accurate, including any suggested content.
            </p>
          </div>
        )}
      </div>

      {/* Create Your Own Modal */}
      {showCreateOwnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100 bg-opacity-50" onClick={() => setShowCreateOwnModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create your title and description</h2>
              <button
                onClick={() => setShowCreateOwnModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Title Input */}
              <div>
                <label htmlFor="experience-title" className="block text-sm font-medium text-gray-900 mb-2">
                  Title
                </label>
                <input
                  id="experience-title"
                  type="text"
                  value={experienceTitle}
                  onChange={(e) => {
                    if (e.target.value.length <= 50) {
                      setExperienceTitle(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  placeholder="Enter your experience title"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {experienceTitle.length}/50 available
                </p>
              </div>

              {/* Description Input */}
              <div>
                <label htmlFor="experience-description" className="block text-sm font-medium text-gray-900 mb-2">
                  Description
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Share what guests will do. For example, 'Craft your very own leather sandals.'
                </p>
                <textarea
                  id="experience-description"
                  value={experienceDescription}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 200) {
                      setExperienceDescription(value);
                    }
                  }}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none resize-none"
                  placeholder="Describe your experience..."
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {experienceDescription.length}/200 available
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => {}}
                className="text-sm text-gray-900 hover:text-gray-700 underline"
              >
                Get tips
              </button>
              <button
                onClick={handleSaveTitleAndDescription}
                disabled={experienceTitle.trim().length === 0 || experienceDescription.trim().length === 0}
                className={`px-6 py-3 rounded-lg text-base font-medium transition-colors ${
                  experienceTitle.trim().length > 0 && experienceDescription.trim().length > 0
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExperienceDetails;


