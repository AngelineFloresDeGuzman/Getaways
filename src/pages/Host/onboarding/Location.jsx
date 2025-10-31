import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { DragEndEvent } from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useOnboardingAutoSave, useOnboardingNavigation } from './hooks/useOnboardingAutoSave';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';

// Add custom CSS to override marker cursor and add blink animation
const style = document.createElement('style');
style.textContent = `
  .custom-home-marker,
  .custom-home-marker *,
  .leaflet-marker-icon.custom-home-marker,
  .leaflet-marker-icon.custom-home-marker *,
  .leaflet-interactive.custom-home-marker,
  .leaflet-interactive.custom-home-marker * {
    cursor: default !important;
    pointer-events: auto !important;
  }
`;
if (!document.head.querySelector('style[data-marker-cursor]')) {
  style.setAttribute('data-marker-cursor', 'true');
  document.head.appendChild(style);
}

// Fix marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom home icon marker with brand color (warm brown/copper like logo)
const homeIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 50px; height: 65px; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3)); cursor: default !important;">
      <svg width="50" height="65" viewBox="0 0 50 65" fill="none" xmlns="http://www.w3.org/2000/svg" style="cursor: default !important; color: hsl(var(--primary));">
        <!-- Pin shape with pointed bottom -->
        <path d="M25 65 C20 58, 5 40, 5 25 C5 11, 11 5, 25 5 C39 5, 45 11, 45 25 C45 40, 30 58, 25 65 Z" 
              fill="currentColor" stroke="white" stroke-width="3" stroke-linejoin="round" style="cursor: default !important;"/>
        <!-- Home icon -->
        <g transform="translate(13, 12)" style="cursor: default !important;">
          <path d="M12 2L0 10V22H5V15H19V22H24V10L12 2Z" fill="white" style="cursor: default !important;"/>
          <rect x="8" y="18" width="8" height="4" fill="white" style="cursor: default !important;"/>
        </g>
      </svg>
    </div>
  `,
  className: 'custom-home-marker',
  iconSize: [50, 65],
  iconAnchor: [25, 65],
  popupAnchor: [0, -65]
});

// Helper function to fetch from Nominatim with Vite proxy and fallback
const fetchWithProxy = async (nominatimUrl) => {
  // Extract the path from the full URL for Vite proxy
  const url = new URL(nominatimUrl);
  const proxyPath = `/api/nominatim${url.pathname}${url.search}`;
  
  // Try Vite dev proxy first (works in development)
  try {
    const response = await fetch(proxyPath, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (proxyError) {
    // Vite proxy failed (might be production build), try direct or other proxies
    console.log('Vite proxy failed, trying alternatives...', proxyError.message);
  }
  
  // Try direct request (works in some browsers/environments)
  try {
    const response = await fetch(nominatimUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Getaways/1.0 (contact: info@getaways.com)',
        'Referer': window.location.origin
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (directError) {
    // Direct request failed (likely CORS), try public proxies
    console.log('Direct request failed, trying public proxies...', directError.message);
  }
  
  // Try alternative proxy services as last resort
  // Note: These are unreliable public proxies, but used as fallback
  const proxyServices = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(nominatimUrl)}`,
  ];
  
  let lastError = null;
  
  // Try each proxy service until one works
  for (const proxyUrl of proxyServices) {
    let timeoutId = null;
    try {
      // Create abort controller for timeout (more compatible than AbortSignal.timeout)
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      let data;
      if (proxyUrl.includes('allorigins.win/get')) {
        // AllOrigins get endpoint wraps in {contents: ...}
        const proxyData = await response.json();
        const contents = proxyData.contents || '{}';
        try {
          data = JSON.parse(contents);
        } catch (parseError) {
          // Sometimes contents is already an object
          data = typeof contents === 'string' ? JSON.parse(contents) : contents;
        }
      } else {
        data = await response.json();
      }
      
      // Validate we got valid data
      if (data && (Array.isArray(data) || typeof data === 'object')) {
        if (timeoutId) clearTimeout(timeoutId); // Clear timeout on success
        return data; // Success, return data
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`Proxy ${proxyUrl} timed out`);
      } else {
        console.log(`Proxy ${proxyUrl} failed:`, error.message);
      }
      lastError = error;
    } finally {
      // Ensure timeout is always cleared
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
  
  // All methods failed
  const errorMsg = lastError?.message || 'All methods failed to fetch from Nominatim';
  console.error('❌ All geocoding methods failed:', errorMsg);
  throw new Error(errorMsg);
};

function MapUpdater({ center, onClick }) {
  const map = useMap();
  useEffect(() => {
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [map, onClick]);
  useEffect(() => {
    if (!center || center.length !== 2) return;
    const [lat, lng] = center;
    if (!lat || !lng || !isFinite(lat) || !isFinite(lng)) return;
    
    const currentCenter = map.getCenter();
    const latDiff = Math.abs(currentCenter.lat - lat);
    const lngDiff = Math.abs(currentCenter.lng - lng);
    
    // Update map view if center changed significantly (more than ~50 meters) or if zoom is not at 15
    const threshold = 0.0005; // ~50 meters
    if (latDiff > threshold || lngDiff > threshold || map.getZoom() !== 15) {
      map.setView([lat, lng], 15, { animate: true, duration: 0.5 });
    }
  }, [map, center]);
  return null;
}

const Location = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Enhanced auto-save and state management
  const { 
    state, 
    actions, 
    loadDraftIfNeeded, 
    saveAndExit, 
    isLoading 
  } = useOnboardingAutoSave('location', []);

  const { navigateNext, navigateBack } = useOnboardingNavigation('location');
  
  const [selectedLocation, setSelectedLocation] = useState({
    street: '',
    barangay: '',
    city: '',
    province: '',
    country: '',
    zipCode: '',
    unit: '',
    building: '',
    latitude: null,
    longitude: null
  });
  const [position, setPosition] = useState([14.5995, 120.9842]); // Default to Manila, Philippines
  const [searchValue, setSearchValue] = useState('');
  const [locationFilled, setLocationFilled] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(
    location.state?.showAddressForm || false
  );
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [showPreciseLocation, setShowPreciseLocation] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Helper function to ensure we have a valid draftId and save to Firebase
  // This prevents creating temp documents and ensures data is always saved properly
  const ensureDraftAndSave = async (locationData, currentStep = 'location') => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
      console.log('📍 Location: Found temp ID, resetting to find/create real draft');
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
          console.log('📍 Location: Using existing draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          console.log('📍 Location: No existing drafts, creating new draft');
          const newDraftData = {
            currentStep: currentStep,
            category: state.category || 'accommodation',
            data: {
              locationData: locationData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          console.log('📍 Location: ✅ Created new draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        console.error('📍 Location: Error finding/creating draft:', error);
        throw error;
      }
    }
    
    // Save to Firebase if we have a valid draftId
    if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
      try {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          // Update existing document
          await updateDoc(draftRef, {
            'data.locationData': locationData,
            currentStep: currentStep,
            lastModified: new Date()
          });
          console.log('📍 Location: ✅ Saved locationData to Firebase:', draftIdToUse);
        } else {
          // Document doesn't exist, create it
          console.log('📍 Location: Document not found, creating new one');
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const newDraftData = {
            currentStep: currentStep,
            category: state.category || 'accommodation',
            data: {
              locationData: locationData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          console.log('📍 Location: ✅ Created new draft with locationData:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        console.error('📍 Location: ❌ Error saving to Firebase:', error);
        throw error;
      }
    } else if (state.user?.uid) {
      // User authenticated but no draftId - this shouldn't happen after ensureDraftAndSave logic
      console.warn('📍 Location: ⚠️ User authenticated but no valid draftId after ensureDraftAndSave');
      throw new Error('Failed to create draft for authenticated user');
    } else {
      console.warn('📍 Location: ⚠️ User not authenticated, cannot save to Firebase');
      return null; // Return null instead of throwing - data is in context
    }
  };

  // Handle navigation state from LocationConfirmation page
  useEffect(() => {
    if (location.state?.fromLocationConfirmation) {
      console.log('📍 Location: Navigating back from LocationConfirmation, received state:', location.state);
      
      // If coming from LocationConfirmation with showAddressForm flag, set it
      if (location.state.showAddressForm !== undefined) {
        setShowAddressForm(location.state.showAddressForm);
      }
      
      // If location data is passed from LocationConfirmation, use it
      if (location.state.locationData) {
        console.log('📍 Location: Setting selectedLocation from navigation state:', location.state.locationData);
        // Ensure all fields are properly set, including defaults for missing fields
        const locationDataFromBack = {
          street: location.state.locationData.street || '',
          barangay: location.state.locationData.barangay || '',
          city: location.state.locationData.city || '',
          province: location.state.locationData.province || '',
          country: location.state.locationData.country || '',
          zipCode: location.state.locationData.zipCode || '',
          unit: location.state.locationData.unit || '',
          building: location.state.locationData.building || '',
          latitude: location.state.locationData.latitude || null,
          longitude: location.state.locationData.longitude || null
        };
        setSelectedLocation(locationDataFromBack);
        setLocationFilled(true); // Mark location as filled since we have data
        
        // Also update context to keep it in sync
        if (actions.updateLocationData) {
          actions.updateLocationData(locationDataFromBack);
        }
      }
      
      // If position is passed from LocationConfirmation, use it
      if (location.state.position) {
        isManuallySettingPositionRef.current = true;
        setPosition(location.state.position);
        setTimeout(() => { isManuallySettingPositionRef.current = false; }, 500);
      }
      
      // Reset the address form prefilled ref so it can be used again if needed
      addressFormPrefilledRef.current = false;
    }
  }, [location.state?.fromLocationConfirmation, location.state?.locationData, location.state?.position]);

  // Use refs to track if position has been initialized to prevent infinite loops
  const positionInitializedRef = useRef(false);
  const lastInitializedCoordsRef = useRef(null);
  const isManuallySettingPositionRef = useRef(false); // Track manual position updates (from user interaction)
  
  // Initialize position from context or navigation state when component mounts or data becomes available
  // Only runs when locationData actually changes, not on every render
  useEffect(() => {
    // Don't auto-update position if user is manually setting it (e.g., from map click, confirm, etc.)
    if (isManuallySettingPositionRef.current) {
      return;
    }
    
    // Priority: navigation state > context state > default
    if (location.state?.position && Array.isArray(location.state.position) && location.state.position.length === 2) {
      const navPos = location.state.position;
      const navPosKey = `${navPos[0]}-${navPos[1]}`;
      
      // Only set if different from last initialized position
      if (lastInitializedCoordsRef.current !== navPosKey) {
        setPosition(navPos);
        positionInitializedRef.current = true;
        lastInitializedCoordsRef.current = navPosKey;
      }
      return;
    }
    
    // Check context state for saved coordinates (only if not already initialized from nav state)
    if (state?.locationData?.latitude && state?.locationData?.longitude) {
      const savedLat = state.locationData.latitude;
      const savedLng = state.locationData.longitude;
      const savedKey = `${savedLat}-${savedLng}`;
      
      // Skip if we already initialized with these exact coordinates
      if (lastInitializedCoordsRef.current === savedKey) {
        return;
      }
      
      // Only update if current position is default (Manila) or significantly different
      const currentLat = position[0];
      const currentLng = position[1];
      const isDefaultPosition = currentLat === 14.5995 && currentLng === 120.9842;
      const isSignificantlyDifferent = Math.abs(currentLat - savedLat) > 0.001 || Math.abs(currentLng - savedLng) > 0.001;
      
      if (isDefaultPosition || isSignificantlyDifferent) {
        console.log('📍 Location: Updating position from context state:', [savedLat, savedLng]);
        setPosition([savedLat, savedLng]);
        setLocationFilled(true);
        positionInitializedRef.current = true;
        lastInitializedCoordsRef.current = savedKey;
      }
    }
  }, [state?.locationData?.latitude, state?.locationData?.longitude, location.state?.position]); // Keep position out of deps to prevent loop

  // Use ref to track if address form data has been prefilled
  const addressFormPrefilledRef = useRef(false);

  // When opening the address confirmation form, prefill fields from saved draft (if present)
  // Only run if we're not coming back from LocationConfirmation (which handles its own data)
  useEffect(() => {
    // Skip if we just came back from LocationConfirmation (data already set in previous effect)
    if (location.state?.fromLocationConfirmation && location.state?.locationData) {
      console.log('📍 Location: Skipping address form prefilling - data already set from LocationConfirmation');
      return;
    }
    
    if (showAddressForm && state?.locationData && !addressFormPrefilledRef.current) {
      const d = state.locationData;
      
      console.log('📍 Location: Prefilling address form from context state:', d);
      
      // Update position if we have saved coordinates and they're different from current
      if (d.latitude && d.longitude) {
        const currentLat = position[0];
        const currentLng = position[1];
        const isDifferent = Math.abs(currentLat - d.latitude) > 0.0001 || Math.abs(currentLng - d.longitude) > 0.0001;
        
        // Only update if position is actually different (prevents infinite loop)
        if (isDifferent) {
          isManuallySettingPositionRef.current = true;
          setPosition([d.latitude, d.longitude]);
          setLocationFilled(true);
          setTimeout(() => { isManuallySettingPositionRef.current = false; }, 500);
        }
      }
      
      setSelectedLocation(prev => ({
        street: d.street || prev.street || '',
        barangay: d.barangay || prev.barangay || '',
        city: d.city || prev.city || '',
        province: d.province || prev.province || '',
        country: d.country || prev.country || '',
        zipCode: d.zipCode || prev.zipCode || '',
        unit: d.unit || prev.unit || '',
        building: d.building || prev.building || '',
        latitude: d.latitude ?? prev.latitude ?? position[0],
        longitude: d.longitude ?? prev.longitude ?? position[1],
      }));
      
      addressFormPrefilledRef.current = true;
    }
    
    // Reset flag when address form is closed
    if (!showAddressForm) {
      addressFormPrefilledRef.current = false;
    }
  }, [showAddressForm, state?.locationData, location.state?.fromLocationConfirmation]); // Added location.state?.fromLocationConfirmation to deps
  
  // Track if we've restored position when closing address form
  const hasRestoredOnCloseRef = useRef(false);
  
  // When closing address form (going back to map view), ensure position is set to saved location
  useEffect(() => {
    // When address form closes (showAddressForm becomes false), restore saved location
    if (!showAddressForm) {
      // Check if we have saved location data
      const savedLocationData = state?.locationData || selectedLocation;
      
      if (savedLocationData?.latitude && savedLocationData?.longitude && !hasRestoredOnCloseRef.current) {
        const savedLat = savedLocationData.latitude;
        const savedLng = savedLocationData.longitude;
        const currentLat = position[0];
        const currentLng = position[1];
        
        // Only update if position is significantly different from saved location
        const isDifferent = Math.abs(currentLat - savedLat) > 0.0001 || Math.abs(currentLng - savedLng) > 0.0001;
        const isDefaultPosition = currentLat === 14.5995 && currentLng === 120.9842;
        
        // Update position if it's default or different from saved location
        if (isDefaultPosition || isDifferent) {
          console.log('📍 Location: Address form closed, restoring map position to saved location:', [savedLat, savedLng]);
          isManuallySettingPositionRef.current = true;
          setPosition([savedLat, savedLng]);
          setLocationFilled(true);
          hasRestoredOnCloseRef.current = true;
          setTimeout(() => { 
            isManuallySettingPositionRef.current = false;
            hasRestoredOnCloseRef.current = false; // Reset after restore
          }, 500);
        } else {
          hasRestoredOnCloseRef.current = false; // Already at saved location, no need to restore
        }
      }
    } else {
      // Reset flag when address form opens
      hasRestoredOnCloseRef.current = false;
    }
  }, [showAddressForm, state?.locationData?.latitude, state?.locationData?.longitude, selectedLocation?.latitude, selectedLocation?.longitude]); // Include location data in deps to react to saved data
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    isManuallySettingPositionRef.current = true;
    setPosition([lat, lng]);
    setLocationFilled(true);
    setShowConfirmation(true);
    // Reset flag after a short delay to allow for auto-initialization later if needed
    setTimeout(() => { isManuallySettingPositionRef.current = false; }, 1000);
    // Close search suggestions when pinning
    setSearchFocused(false);
    setSuggestions([]);
    
    // Reverse geocode to fill building, unit, etc.
    try {
      // Try BigDataCloud first (better CORS support)
      try {
        const bigDataResponse = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        if (bigDataResponse.ok) {
          const bigData = await bigDataResponse.json();
          if (bigData && bigData.countryName) {
            // Clean country name
            let countryName = bigData.countryName.replace(/\s*\(the\)\s*/gi, '').trim();
            countryName = countryName.replace(/\s*-\s*[A-Z]{2,3}\s*$/i, '').trim();
            countryName = countryName.replace(/\s*\([A-Z]{2,3}\)\s*$/i, '').trim();
            
            // Construct display name
            const addressParts = [];
            if (bigData.locality) addressParts.push(bigData.locality);
            if (bigData.city) addressParts.push(bigData.city);
            if (bigData.principalSubdivision) addressParts.push(bigData.principalSubdivision);
            if (countryName) addressParts.push(countryName);
            const displayName = addressParts.join(', ');
            
            setSearchValue(displayName || `${lat}, ${lng}`);
            setSelectedLocation({
              street: bigData.locality || '',
              barangay: bigData.localityInfo?.administrative?.[4]?.name || bigData.localityInfo?.administrative?.[3]?.name || '',
              city: bigData.city || bigData.localityInfo?.administrative?.[2]?.name || bigData.localityInfo?.administrative?.[1]?.name || '',
              province: (bigData.principalSubdivision && bigData.principalSubdivision !== 'region') ? bigData.principalSubdivision :
                       (bigData.localityInfo?.administrative?.[1]?.name && bigData.localityInfo.administrative[1].name !== 'region') ? bigData.localityInfo.administrative[1].name :
                       (bigData.localityInfo?.administrative?.[0]?.name && bigData.localityInfo.administrative[0].name !== 'region') ? bigData.localityInfo.administrative[0].name : '',
              zipCode: bigData.postcode || '',
              unit: '',
              building: '',
              latitude: lat,
              longitude: lng,
              country: countryName || 'Philippines'
            });
            return; // Success, exit early
          }
        }
      } catch (bigDataError) {
        console.log('BigDataCloud failed, trying Nominatim:', bigDataError);
      }
      
      // Fallback to Nominatim via CORS proxy
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
      let data;
      try {
        data = await fetchWithProxy(nominatimUrl);
      } catch (proxyError) {
        console.error('Error fetching from Nominatim:', proxyError);
        data = {};
      }
      
      const addr = data.address || {};
      setSearchValue(data.display_name || `${lat}, ${lng}`);
      setSelectedLocation({
        barangay: addr.suburb || addr.village || addr.neighbourhood || '',
        zipCode: addr.postcode || '',
        street: addr.road || '',
        city: addr.city || addr.town || addr.municipality || '',
        province: addr.state || addr.region || addr.county || addr.state_district || '',
        unit: addr.unit || addr.apartment || addr.flat || '',
        building: addr.building || addr.public_building || addr.commercial || addr.residential || '',
        latitude: lat,
        longitude: lng,
        country: addr.country || 'Philippines'
      });
    } catch (error) {
      console.error('Error reverse geocoding on map click:', error);
      // At minimum, set coordinates even if geocoding fails
      setSearchValue(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setSelectedLocation(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng
      }));
    }
  };

  const handleSaveAndExit = () => {
    // TODO: Implement save and exit logic
    alert('Save & exit clicked');
  };

  const handleMarkerDragEnd = async (e) => {
    const { lat, lng } = e.target.getLatLng();
    setPosition([lat, lng]);
    // Reverse geocode to fill building, unit, etc.
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      const data = await fetchWithProxy(nominatimUrl);
      setSelectedLocation(prev => ({
        ...prev,
        barangay: data.address.suburb || data.address.village || data.address.neighbourhood || '',
        zipCode: data.address.postcode || '',
        street: data.address.road || prev.street,
        city: data.address.city || data.address.town || data.address.municipality || prev.city,
        province: data.address.state || data.address.region || data.address.county || data.address.state_district || '',
        unit: data.address.unit || data.address.apartment || data.address.flat || '',
        building: data.address.building || data.address.public_building || data.address.commercial || data.address.residential || data.address.apartment || data.address.house || data.address.hotel || '',
        latitude: lat,
        longitude: lng,
        country: data.address.country || prev.country
      }));
    } catch {}
  };

  const handleNext = () => {
    // TODO: Implement next step logic
    alert('Next clicked');
  };

  // Geocode address and update pin
  const geocodeAddress = async (query) => {
    if (!query) return;
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
      const results = await fetchWithProxy(nominatimUrl);
      
      if (Array.isArray(results) && results[0]) {
        setPosition([parseFloat(results[0].lat), parseFloat(results[0].lon)]);
        setSelectedLocation(prev => ({
          ...prev,
          latitude: parseFloat(results[0].lat),
          longitude: parseFloat(results[0].lon)
        }));
        setLocationFilled(true);
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
  };

  // Fetch suggestions as user types with debouncing
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Clear suggestions if search value is too short
    if (searchValue.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    // Set loading state
    setIsSearching(true);

    // Debounce the API call
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Get current map center for proximity search
        const [lat, lon] = position;
        
        // Create viewbox around current position (approximately 50km radius)
        const latOffset = 0.5; // ~55km
        const lonOffset = 0.5; // ~55km
        const viewbox = `${lon - lonOffset},${lat + latOffset},${lon + lonOffset},${lat - latOffset}`;
        
        // Build Nominatim URL
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
          `format=json&` +
          `q=${encodeURIComponent(searchValue)}&` +
          `addressdetails=1&` +
          `limit=8&` +
          `viewbox=${viewbox}&` +
          `bounded=1`;
        
        let results = [];
        try {
          results = await fetchWithProxy(nominatimUrl);
          // Ensure results is an array
          if (!Array.isArray(results)) {
            results = [];
          }
        } catch (error) {
          console.log('Bounded search failed, trying fallback:', error.message);
        }
        
        // If no results found in bounded area, try again without bounds
        if (!Array.isArray(results) || results.length === 0) {
          const fallbackUrl = `https://nominatim.openstreetmap.org/search?` +
            `format=json&` +
            `q=${encodeURIComponent(searchValue)}&` +
            `addressdetails=1&` +
            `limit=8&` +
            `lat=${lat}&` +
            `lon=${lon}`;
          
          try {
            results = await fetchWithProxy(fallbackUrl);
            if (!Array.isArray(results)) {
              results = [];
            }
          } catch (error) {
            console.log('Fallback search also failed:', error.message);
            results = [];
          }
        }
        
        setSuggestions(results);
        setIsSearching(false);
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
        // On CORS error or other failures, show empty suggestions gracefully
        setSuggestions([]);
        setIsSearching(false);
      }
    }, 300); // 300ms debounce delay

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue, position]);

  // Handle search bar input
  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    setLocationFilled(false);
    setShowConfirmation(false);
  };

  // When a suggestion is clicked - pin location and show confirmation
  const handleSuggestionClick = async (suggestion) => {
    setSearchValue(suggestion.display_name);
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    isManuallySettingPositionRef.current = true;
    setPosition([lat, lon]);
    setLocationFilled(true);
    setSuggestions([]);
    setSearchFocused(false);
    setIsSearching(false);
    setShowConfirmation(true);
    setTimeout(() => { isManuallySettingPositionRef.current = false; }, 1000);
    
    // Comprehensive parsing of address details from suggestion
    const addr = suggestion.address || {};
    
    // Extract street address - try multiple fields
    const street = addr.road || 
                   addr.pedestrian || 
                   addr.footway || 
                   addr.path || 
                   addr.street || 
                   addr.road_reference || '';
    
    // Extract barangay/district - try multiple fields
    const barangay = addr.suburb || 
                     addr.village || 
                     addr.neighbourhood || 
                     addr.quarter || 
                     addr.district || 
                     addr.residential || 
                     addr.city_district || '';
    
    // Extract city - try multiple fields
    const city = addr.city || 
                 addr.town || 
                 addr.municipality || 
                 addr.city_district || 
                 addr.locality || '';
    
    // Extract province/state - try multiple fields
    const province = addr.state || 
                     addr.region || 
                     addr.county || 
                     addr.state_district || 
                     addr.province || 
                     addr.administrative || '';
    
    // Extract country - clean it
    let country = addr.country || 'Philippines';
    country = country.replace(/\s*\(the\)\s*/gi, '').trim();
    country = country.replace(/\s*-\s*[A-Z]{2,3}\s*$/i, '').trim();
    country = country.replace(/\s*\([A-Z]{2,3}\)\s*$/i, '').trim();
    
    // Extract ZIP code
    const zipCode = addr.postcode || '';
    
    // Extract unit/level - try multiple fields
    const unit = addr.unit || 
                 addr.apartment || 
                 addr.flat || 
                 addr.house_number || 
                 addr.level || 
                 addr.floor || '';
    
    // Extract building name - try multiple fields
    const building = addr.building || 
                    addr.public_building || 
                    addr.commercial || 
                    addr.shop || 
                    addr.amenity || 
                    addr.name || '';
    
    // Set all parsed location data
    setSelectedLocation({
      street: street,
      barangay: barangay,
      city: city,
      province: province,
      country: country,
      zipCode: zipCode,
      unit: unit,
      building: building,
      latitude: lat,
      longitude: lon
    });
    
    console.log('Location page: Parsed location data from suggestion:', {
      street, barangay, city, province, country, zipCode, unit, building, lat, lon
    });
  };

  // Use current location - pin and show confirmation
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        isManuallySettingPositionRef.current = true;
        setPosition([lat, lng]);
          setSuggestions([]);
          setLocationFilled(true);
        setSearchFocused(false);
        setShowConfirmation(true);
        // Reset flag after a short delay
        setTimeout(() => { isManuallySettingPositionRef.current = false; }, 1000);
        
        // Reverse geocode to get address - try BigDataCloud first
        try {
          // Try BigDataCloud first (better CORS support)
          try {
            const bigDataResponse = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
            );
            if (bigDataResponse.ok) {
              const bigData = await bigDataResponse.json();
              if (bigData && bigData.countryName) {
                // Clean country name
                let countryName = bigData.countryName.replace(/\s*\(the\)\s*/gi, '').trim();
                countryName = countryName.replace(/\s*-\s*[A-Z]{2,3}\s*$/i, '').trim();
                countryName = countryName.replace(/\s*\([A-Z]{2,3}\)\s*$/i, '').trim();
                
                // Construct display name
                const addressParts = [];
                if (bigData.locality) addressParts.push(bigData.locality);
                if (bigData.city) addressParts.push(bigData.city);
                if (bigData.principalSubdivision) addressParts.push(bigData.principalSubdivision);
                if (countryName) addressParts.push(countryName);
                const displayName = addressParts.join(', ');
                
                setSearchValue(displayName || `${lat}, ${lng}`);
                setSelectedLocation({
                  street: bigData.locality || '',
                  barangay: bigData.localityInfo?.administrative?.[4]?.name || bigData.localityInfo?.administrative?.[3]?.name || '',
                  city: bigData.city || bigData.localityInfo?.administrative?.[2]?.name || bigData.localityInfo?.administrative?.[1]?.name || '',
                  province: (bigData.principalSubdivision && bigData.principalSubdivision !== 'region') ? bigData.principalSubdivision :
                           (bigData.localityInfo?.administrative?.[1]?.name && bigData.localityInfo.administrative[1].name !== 'region') ? bigData.localityInfo.administrative[1].name :
                           (bigData.localityInfo?.administrative?.[0]?.name && bigData.localityInfo.administrative[0].name !== 'region') ? bigData.localityInfo.administrative[0].name : '',
                  zipCode: bigData.postcode || '',
                  unit: '',
                  building: '',
                  latitude: lat,
                  longitude: lng,
                  country: countryName || 'Philippines'
                });
                return; // Success, exit early
              }
            }
          } catch (bigDataError) {
            console.log('BigDataCloud failed, trying Nominatim:', bigDataError);
          }
          
          // Fallback to Nominatim via CORS proxy
          const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
          let data;
          try {
            data = await fetchWithProxy(nominatimUrl);
          } catch (proxyError) {
            console.error('Error fetching from Nominatim:', proxyError);
            data = {};
          }
          
          const addr = data.address || {};
          const addressString = data.display_name || '';
          setSearchValue(addressString || `${lat}, ${lng}`);
          
          // Comprehensive extraction of address fields
          const street = addr.road || 
                        addr.pedestrian || 
                        addr.footway || 
                        addr.path || 
                        addr.street || 
                        addr.road_reference || '';
          
          const barangay = addr.suburb || 
                          addr.village || 
                          addr.neighbourhood || 
                          addr.quarter || 
                          addr.district || 
                          addr.residential || 
                          addr.city_district || '';
          
          const city = addr.city || 
                      addr.town || 
                      addr.municipality || 
                      addr.city_district || 
                      addr.locality || '';
          
          const province = addr.state || 
                          addr.region || 
                          addr.county || 
                          addr.state_district || 
                          addr.province || 
                          addr.administrative || '';
          
          let country = addr.country || 'Philippines';
          country = country.replace(/\s*\(the\)\s*/gi, '').trim();
          country = country.replace(/\s*-\s*[A-Z]{2,3}\s*$/i, '').trim();
          country = country.replace(/\s*\([A-Z]{2,3}\)\s*$/i, '').trim();
          
          const zipCode = addr.postcode || '';
          
          const unit = addr.unit || 
                      addr.apartment || 
                      addr.flat || 
                      addr.house_number || 
                      addr.level || 
                      addr.floor || '';
          
          const building = addr.building || 
                          addr.public_building || 
                          addr.commercial || 
                          addr.shop || 
                          addr.amenity || 
                          addr.name || '';
          
          setSelectedLocation({
            street: street,
            barangay: barangay,
            city: city,
            province: province,
            country: country,
            zipCode: zipCode,
            unit: unit,
            building: building,
            latitude: lat,
            longitude: lng
          });
        } catch (error) {
          console.error('Error reverse geocoding current location:', error);
          // At minimum, set coordinates even if geocoding fails
          setSearchValue(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setSelectedLocation(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }));
        }
      }, (error) => {
        console.error('Error getting current location:', error);
        alert('Unable to get your current location. Please check your browser settings and try again.');
      });
    }
  };

  const handleLocationChange = (field, value) => {
    const updated = { ...selectedLocation, [field]: value };
    setSelectedLocation(updated);
    // Geocode and update map pin in real time
    geocodeAddress(updated);
  };

  const handlePreciseLocationToggle = async (checked) => {
    setSelectedLocation(prev => ({ ...prev, showPreciseLocation: checked }));
    if (checked && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        // Reverse geocode to fill address fields
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
          const data = await fetchWithProxy(nominatimUrl);
          setSelectedLocation(prev => ({
            ...prev,
            barangay: data.address.suburb || data.address.village || data.address.neighbourhood || '',
            zipCode: data.address.postcode || '',
            street: data.address.road || prev.street,
            city: data.address.city || data.address.town || data.address.municipality || prev.city,
            province: data.address.state || data.address.region || data.address.county || data.address.state_district || '',
            unit: data.address.unit || data.address.level || data.address.apartment || data.address.flat || '',
            level: data.address.level || '',
            building: data.address.building || data.address.public_building || data.address.commercial || data.address.residential || data.address.apartment || data.address.house || data.address.hotel || '',
            latitude: lat,
            longitude: lng,
            country: data.address.country || prev.country
          }));
        } catch {}
      });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchValue) {
      geocodeAddress(searchValue);
    }
  };

  const showDetails = locationFilled || position;
  // Block Next on first part until the user selects/pins a location
  const canProceed = locationFilled;

  return (
  <div className="min-h-screen bg-white flex flex-col" style={{ overflow: showAddressForm ? 'auto' : 'hidden', minHeight: '100vh' }}>
      <OnboardingHeader />
      
      {!showAddressForm ? (
        // Map Search View
        <>
      {/* Onboarding header text */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center mt-24 px-8">
  <h1 className="text-[30px] font-medium text-gray-900 mb-2 text-center">Where's your place <span className="text-primary">located</span>?</h1>
  <p className="text-gray-600 mb-6 text-center text-base">Your address is only shared with guests after they've made a reservation.</p>
  
  {/* Map container with search bar overlay */}
  <div className="w-full mt-6 flex justify-center">
    <div className="relative rounded-2xl overflow-hidden shadow-lg w-full" style={{ maxWidth: '900px' }}>
      {/* Search bar overlaying the map */}
      <div className="absolute top-0 left-0 w-full z-[1000] flex justify-center" style={{ pointerEvents: 'none' }}>
        <form onSubmit={handleSearchSubmit} className="w-[90%] mt-6" style={{ pointerEvents: 'auto' }}>
          <div className="flex flex-col gap-2 bg-white rounded-2xl shadow-xl w-full relative">
            <div className="flex items-center border-2 border-black rounded-2xl px-5 py-4 bg-white">
              <svg className="w-6 h-6 text-black mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
                    <input
                      type="text"
                      placeholder="Enter your address"
                      value={searchValue}
                      onChange={handleSearchChange}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                className="flex-1 text-base text-gray-900 placeholder-gray-700 border-none focus:outline-none bg-transparent font-normal"
                      autoComplete="off"
                    />
              {isSearching && (
                <div className="ml-2 animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              )}
              {searchValue && !isSearching && (
                <button type="button" onClick={() => setSearchValue('')} className="ml-2 text-gray-500 hover:text-gray-700 text-xl">✕</button>
                    )}
                  </div>
            {/* Show options when search bar is focused but no valid suggestions yet */}
            {searchFocused && searchValue.length < 2 && (
              <div className="px-2 pb-2">
                {/* Use my current location option at top */}
                <div className="rounded-xl hover:bg-gray-50 flex items-center px-4 py-3 cursor-pointer transition-colors" onMouseDown={e => e.preventDefault()} onClick={handleUseCurrentLocation}>
                  <svg className="w-6 h-6 text-gray-700 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-900 text-base font-normal">Use my current location</span>
                </div>
                {/* Enter address manually option at bottom */}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <div
                    className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setShowAddressForm(true);
                      setSearchFocused(false);
                    }}
                  >
                    <svg className="w-6 h-6 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="text-gray-900 text-base font-normal">Enter address manually</span>
                  </div>
                </div>
                    </div>
                  )}
            {/* Show options when searching (loading state) */}
            {searchFocused && isSearching && searchValue.length >= 2 && (
              <div className="px-2 pb-2">
                {/* Use my current location option at top */}
                <div className="rounded-xl hover:bg-gray-50 flex items-center px-4 py-3 cursor-pointer transition-colors mb-2" onMouseDown={e => e.preventDefault()} onClick={handleUseCurrentLocation}>
                  <svg className="w-6 h-6 text-gray-700 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-900 text-base font-normal">Use my current location</span>
                </div>
                <div className="px-4 py-3 text-center text-gray-500 text-sm">
                  Searching...
                </div>
                {/* Enter address manually option at bottom */}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <div
                    className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setShowAddressForm(true);
                      setSearchFocused(false);
                    }}
                  >
                    <svg className="w-6 h-6 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="text-gray-900 text-base font-normal">Enter address manually</span>
                  </div>
                </div>
                    </div>
                  )}
            {searchFocused && searchValue.length >= 2 && suggestions.length > 0 && !isSearching && (
              <div className="px-2 pb-2">
                {/* Use my current location option at top */}
                <div className="rounded-xl hover:bg-gray-50 flex items-center px-4 py-3 cursor-pointer transition-colors mb-2" onMouseDown={e => e.preventDefault()} onClick={handleUseCurrentLocation}>
                  <svg className="w-6 h-6 text-gray-700 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-900 text-base font-normal">Use my current location</span>
                </div>
                <ul className="max-h-80 overflow-y-auto">
                      {suggestions.map((s, idx) => (
                        <li
                          key={s.place_id}
                      className="flex items-start gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors"
                          onClick={() => handleSuggestionClick(s)}
                        >
                      <svg className="w-6 h-6 text-gray-700 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base text-gray-900 truncate">{s.display_name.split(',')[0]}</div>
                        <div className="text-gray-600 text-sm leading-snug">{s.display_name.replace(s.display_name.split(',')[0] + ',', '').trim()}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                {/* Enter address manually option */}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <div
                    className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setShowAddressForm(true);
                      setSearchFocused(false);
                    }}
                  >
                    <svg className="w-6 h-6 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="text-gray-900 text-base font-normal">Enter address manually</span>
                  </div>
                </div>
              </div>
            )}
            {searchFocused && searchValue.length >= 2 && suggestions.length === 0 && !isSearching && (
              <div className="px-2 pb-2">
                {/* Use my current location option at top */}
                <div className="rounded-xl hover:bg-gray-50 flex items-center px-4 py-3 cursor-pointer transition-colors mb-2" onMouseDown={e => e.preventDefault()} onClick={handleUseCurrentLocation}>
                  <svg className="w-6 h-6 text-gray-700 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-900 text-base font-normal">Use my current location</span>
                </div>
                <div className="px-4 py-3 text-center text-gray-500 text-sm">
                  No locations found. Try a different search term.
                </div>
                {/* Enter address manually option */}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <div
                    className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setShowAddressForm(true);
                      setSearchFocused(false);
                    }}
                  >
                    <svg className="w-6 h-6 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="text-gray-900 text-base font-normal">Enter address manually</span>
                  </div>
                </div>
              </div>
                  )}
                </div>
              </form>
            </div>

      {/* Map with search bar overlaid on top */}
              <MapContainer
                center={position}
                zoom={15}
        style={{ height: '600px', width: '100%', borderRadius: '16px' }}
        zoomControl={false}
                doubleClickZoom={true}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {locationFilled && (
          <Marker position={position} icon={homeIcon} />
                )}
                <MapUpdater center={position} onClick={handleMapClick} />
              </MapContainer>

              {/* Confirmation panel - compact, right bottom corner */}
              {showConfirmation && (
                <div className="absolute bottom-6 right-6 bg-white rounded-xl shadow-2xl p-4 z-[1001]" style={{ width: '280px' }}>
                  <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--primary))' }}>
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
            </div>
                      <h3 className="text-base font-semibold text-gray-900">Is this your location?</h3>
          </div>
                    <button
                      onClick={async () => {
                        setShowConfirmation(false);
                        const [lat, lng] = position;
                        let normalizedLocationData = null;
                        
                        // Normalize location data function
                        const normalizeLocationData = (input) => {
                          if (!input) return {};
                          const allowedKeys = [
                            'street', 'barangay', 'city', 'province', 'country', 'zipCode',
                            'unit', 'building', 'latitude', 'longitude'
                          ];
                          const out = {};
                          for (const key of allowedKeys) {
                            let val = input[key];
                            if (val === undefined || val === null) continue;
                            if (typeof val === 'string') {
                              val = val.trim();
                              if (!val) continue;
                              // Clean up country name: remove "(the)" and country code suffixes
                              if (key === 'country') {
                                val = val.replace(/\s*\(the\)\s*/gi, '');
                                val = val.replace(/\s*-\s*[A-Z]{2,3}\s*$/i, '');
                                val = val.replace(/\s*\([A-Z]{2,3}\)\s*$/i, '');
                                val = val.trim();
                              }
                            }
                            if ((key === 'latitude' || key === 'longitude') && typeof val === 'string') {
                              val = parseFloat(val);
                              if (!Number.isFinite(val)) continue;
                            }
                            out[key] = val;
                          }
                          return out;
                        };
                        
                        // Check if selectedLocation already has complete data from search suggestion
                        // Validate: has coordinates, and coordinates match current position (within small tolerance)
                        const hasCompleteData = selectedLocation && 
                          selectedLocation.latitude && 
                          selectedLocation.longitude &&
                          Math.abs(selectedLocation.latitude - lat) < 0.001 &&
                          Math.abs(selectedLocation.longitude - lng) < 0.001 &&
                          (selectedLocation.street || selectedLocation.city || selectedLocation.country);
                        
                        if (hasCompleteData) {
                          // Use existing data from search suggestion, just ensure coordinates match current position
                          normalizedLocationData = {
                            ...selectedLocation,
                            latitude: lat,
                            longitude: lng
                          };
                          setSelectedLocation(normalizedLocationData);
                          console.log('Location page: Using existing location data from search suggestion');
                        } else {
                          // Need to reverse geocode to get complete address data
                          try {
                            // Try BigDataCloud first for better accuracy
                            const response = await fetch(
                              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
                            );
                            const data = await response.json();
                            
                            if (data && data.countryName) {
                              // Clean country name: remove "(the)" suffix
                              let countryName = data.countryName.replace(/\s*\(the\)\s*/gi, '').trim();
                              countryName = countryName.replace(/\s*-\s*[A-Z]{2,3}\s*$/i, '').trim();
                              countryName = countryName.replace(/\s*\([A-Z]{2,3}\)\s*$/i, '').trim();
                              
                              // Construct street address from available data
                              let streetAddress = '';
                              if (data.localityInfo?.informative) {
                                const streetInfo = data.localityInfo.informative.find(item => 
                                  item.description?.includes('road') || 
                                  item.description?.includes('street') ||
                                  item.description?.includes('pedestrian') ||
                                  item.description?.includes('path') ||
                                  item.name
                                );
                                streetAddress = streetInfo?.name || '';
                              }
                              if (!streetAddress && data.locality) {
                                streetAddress = data.locality;
                              }
                              
                              // Extract barangay from administrative levels
                              const barangay = data.localityInfo?.administrative?.[4]?.name || 
                                             data.localityInfo?.administrative?.[3]?.name || 
                                             data.localityInfo?.administrative?.[5]?.name || '';
                              
                              // Extract city from multiple sources
                              const city = data.city || 
                                          data.locality || 
                                          data.localityInfo?.administrative?.[2]?.name || 
                                          data.localityInfo?.administrative?.[1]?.name || '';
                              
                              // Extract province/state
                              const province = (data.principalSubdivision && data.principalSubdivision !== 'region') ? data.principalSubdivision :
                                             (data.localityInfo?.administrative?.[1]?.name && data.localityInfo.administrative[1].name !== 'region') ? data.localityInfo.administrative[1].name :
                                             (data.localityInfo?.administrative?.[0]?.name && data.localityInfo.administrative[0].name !== 'region') ? data.localityInfo.administrative[0].name : '';
                              
                              // Merge with existing selectedLocation to preserve any manually entered data
                              normalizedLocationData = {
                                street: streetAddress || selectedLocation?.street || '',
                                building: selectedLocation?.building || '',
                                barangay: barangay || selectedLocation?.barangay || '',
                                city: city || selectedLocation?.city || '',
                                zipCode: data.postcode || selectedLocation?.zipCode || '',
                                province: province || selectedLocation?.province || '',
                                country: countryName || selectedLocation?.country || 'Philippines',
                                unit: selectedLocation?.unit || '',
                                latitude: lat,
                                longitude: lng
                              };
                              setSelectedLocation(normalizedLocationData);
                            } else {
                              // Fallback to Nominatim if BigDataCloud fails
                              const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
                              let nominatimData;
                              try {
                                nominatimData = await fetchWithProxy(nominatimUrl);
                              } catch (proxyError) {
                                console.error('Error fetching from Nominatim:', proxyError);
                                nominatimData = {};
                              }
                              const addr = nominatimData.address || {};
                              
                              // Comprehensive extraction similar to handleSuggestionClick
                              const street = addr.road || 
                                           addr.pedestrian || 
                                           addr.footway || 
                                           addr.path || 
                                           addr.street || 
                                           addr.road_reference || '';
                              
                              const barangay = addr.suburb || 
                                             addr.village || 
                                             addr.neighbourhood || 
                                             addr.quarter || 
                                             addr.district || 
                                             addr.residential || 
                                             addr.city_district || '';
                              
                              const city = addr.city || 
                                         addr.town || 
                                         addr.municipality || 
                                         addr.city_district || 
                                         addr.locality || '';
                              
                              const province = addr.state || 
                                             addr.region || 
                                             addr.county || 
                                             addr.state_district || 
                                             addr.province || 
                                             addr.administrative || '';
                              
                              let country = addr.country || 'Philippines';
                              country = country.replace(/\s*\(the\)\s*/gi, '').trim();
                              country = country.replace(/\s*-\s*[A-Z]{2,3}\s*$/i, '').trim();
                              country = country.replace(/\s*\([A-Z]{2,3}\)\s*$/i, '').trim();
                              
                              const zipCode = addr.postcode || '';
                              
                              const unit = addr.unit || 
                                         addr.apartment || 
                                         addr.flat || 
                                         addr.house_number || 
                                         addr.level || 
                                         addr.floor || '';
                              
                              const building = addr.building || 
                                              addr.public_building || 
                                              addr.commercial || 
                                              addr.shop || 
                                              addr.amenity || 
                                              addr.name || '';
                              
                              // Merge with existing selectedLocation, but prioritize reverse geocoded data
                              normalizedLocationData = {
                                street: street || selectedLocation?.street || '',
                                barangay: barangay || selectedLocation?.barangay || '',
                                city: city || selectedLocation?.city || '',
                                province: province || selectedLocation?.province || '',
                                zipCode: zipCode || selectedLocation?.zipCode || '',
                                country: country || selectedLocation?.country || 'Philippines',
                                unit: unit || selectedLocation?.unit || '',
                                building: building || selectedLocation?.building || '',
                                latitude: lat,
                                longitude: lng
                              };
                              setSelectedLocation(normalizedLocationData);
                            }
                            console.log('Location page: Reverse geocoded location data');
                          } catch (error) {
                            console.error('Error geocoding location on Confirm:', error);
                            // At minimum, ensure coordinates are set and preserve existing data
                            normalizedLocationData = {
                              ...selectedLocation,
                              latitude: lat,
                              longitude: lng
                            };
                            setSelectedLocation(normalizedLocationData);
                          }
                        }
                        
                        // Normalize location data
                        const currentLocationData = normalizeLocationData(normalizedLocationData);
                        
                        // Mark that we're manually setting position to prevent useEffect loop
                        isManuallySettingPositionRef.current = true;
                        
                        // Update context
                        actions.updateLocationData(currentLocationData);
                        if (actions.setCurrentStep) {
                          actions.setCurrentStep('location');
                        }
                        
                        // Reset flag after context update completes
                        setTimeout(() => { isManuallySettingPositionRef.current = false; }, 500);
                        
                        // Ensure we have a valid draft and save to Firebase
                        let draftIdToUse;
                        try {
                          draftIdToUse = await ensureDraftAndSave(currentLocationData, 'location');
                          console.log('📍 Location page: ✅ Saved locationData to Firebase on Confirm click');
                        } catch (saveError) {
                          console.error('📍 Location page: Error saving to Firebase on Confirm:', saveError);
                          // Continue navigation even if save fails - data is in context
                        }
                        
                        setShowAddressForm(true);
                      }}
                      className="w-full px-4 py-2.5 rounded-lg font-medium transition-all text-sm"
                      style={{ background: 'hsl(var(--primary))', color: 'white' }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                      Confirm
                    </button>
        </div>
      </div>
              )}
            </div>
          </div>
        </div>
      <OnboardingFooter
        onBack={() => navigate('/pages/privacytype')}
        onNext={() => {}}
        backText="Back"
        nextText="Next"
        canProceed={false}
      />
      </>
      ) : (
        // Address Confirmation Form View
        <>
          <div className="w-full max-w-5xl mx-auto mt-32 px-8 pb-32 flex-1">
            <div className="mx-auto" style={{ maxWidth: '900px' }}>
              <h1 className="text-[32px] font-semibold text-gray-900 mb-2">Confirm your address</h1>
              <p className="text-gray-600 mb-8">Your address is only shared with guests after they've made a reservation.</p>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                // Validate required fields
                if (!selectedLocation.country || !selectedLocation.street || !selectedLocation.city || !selectedLocation.zipCode || !selectedLocation.province) {
                  alert('Please fill in all required fields (Country, Street address, City, ZIP code, and Province) before continuing.');
                  return;
                }
                setShowFinalConfirm(true);
              }}
              className="flex flex-col gap-4 mx-auto" 
              style={{ maxWidth: '900px' }}
            >
              {/* Country / region */}
              <div>
                <label className={`block text-xs mb-1 ${!selectedLocation.country ? 'text-red-500' : 'text-gray-600'}`}>Country / region <span className="text-red-500">*</span></label>
                <select
                  required
                  value={selectedLocation.country}
                  onChange={(e) => setSelectedLocation({ ...selectedLocation, country: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-gray-900 bg-white appearance-none ${
                    !selectedLocation.country ? 'border-red-500' : 'border-gray-300'
                  }`}
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="">Select a country</option>
                  <option value="Afghanistan">Afghanistan</option>
                  <option value="Albania">Albania</option>
                  <option value="Algeria">Algeria</option>
                  <option value="Andorra">Andorra</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Armenia">Armenia</option>
                  <option value="Australia">Australia</option>
                  <option value="Austria">Austria</option>
                  <option value="Azerbaijan">Azerbaijan</option>
                  <option value="Bahamas">Bahamas</option>
                  <option value="Bahrain">Bahrain</option>
                  <option value="Bangladesh">Bangladesh</option>
                  <option value="Barbados">Barbados</option>
                  <option value="Belarus">Belarus</option>
                  <option value="Belgium">Belgium</option>
                  <option value="Belize">Belize</option>
                  <option value="Benin">Benin</option>
                  <option value="Bhutan">Bhutan</option>
                  <option value="Bolivia">Bolivia</option>
                  <option value="Bosnia and Herzegovina">Bosnia and Herzegovina</option>
                  <option value="Botswana">Botswana</option>
                  <option value="Brazil">Brazil</option>
                  <option value="Brunei">Brunei</option>
                  <option value="Bulgaria">Bulgaria</option>
                  <option value="Burkina Faso">Burkina Faso</option>
                  <option value="Burundi">Burundi</option>
                  <option value="Cambodia">Cambodia</option>
                  <option value="Cameroon">Cameroon</option>
                  <option value="Canada">Canada</option>
                  <option value="Cape Verde">Cape Verde</option>
                  <option value="Central African Republic">Central African Republic</option>
                  <option value="Chad">Chad</option>
                  <option value="Chile">Chile</option>
                  <option value="China">China</option>
                  <option value="Colombia">Colombia</option>
                  <option value="Comoros">Comoros</option>
                  <option value="Congo">Congo</option>
                  <option value="Costa Rica">Costa Rica</option>
                  <option value="Croatia">Croatia</option>
                  <option value="Cuba">Cuba</option>
                  <option value="Cyprus">Cyprus</option>
                  <option value="Czech Republic">Czech Republic</option>
                  <option value="Denmark">Denmark</option>
                  <option value="Djibouti">Djibouti</option>
                  <option value="Dominica">Dominica</option>
                  <option value="Dominican Republic">Dominican Republic</option>
                  <option value="Ecuador">Ecuador</option>
                  <option value="Egypt">Egypt</option>
                  <option value="El Salvador">El Salvador</option>
                  <option value="Equatorial Guinea">Equatorial Guinea</option>
                  <option value="Eritrea">Eritrea</option>
                  <option value="Estonia">Estonia</option>
                  <option value="Ethiopia">Ethiopia</option>
                  <option value="Fiji">Fiji</option>
                  <option value="Finland">Finland</option>
                  <option value="France">France</option>
                  <option value="Gabon">Gabon</option>
                  <option value="Gambia">Gambia</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Germany">Germany</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Greece">Greece</option>
                  <option value="Grenada">Grenada</option>
                  <option value="Guatemala">Guatemala</option>
                  <option value="Guinea">Guinea</option>
                  <option value="Guinea-Bissau">Guinea-Bissau</option>
                  <option value="Guyana">Guyana</option>
                  <option value="Haiti">Haiti</option>
                  <option value="Honduras">Honduras</option>
                  <option value="Hong Kong">Hong Kong</option>
                  <option value="Hungary">Hungary</option>
                  <option value="Iceland">Iceland</option>
                  <option value="India">India</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Iran">Iran</option>
                  <option value="Iraq">Iraq</option>
                  <option value="Ireland">Ireland</option>
                  <option value="Israel">Israel</option>
                  <option value="Italy">Italy</option>
                  <option value="Jamaica">Jamaica</option>
                  <option value="Japan">Japan</option>
                  <option value="Jordan">Jordan</option>
                  <option value="Kazakhstan">Kazakhstan</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Kiribati">Kiribati</option>
                  <option value="Kuwait">Kuwait</option>
                  <option value="Kyrgyzstan">Kyrgyzstan</option>
                  <option value="Laos">Laos</option>
                  <option value="Latvia">Latvia</option>
                  <option value="Lebanon">Lebanon</option>
                  <option value="Lesotho">Lesotho</option>
                  <option value="Liberia">Liberia</option>
                  <option value="Libya">Libya</option>
                  <option value="Liechtenstein">Liechtenstein</option>
                  <option value="Lithuania">Lithuania</option>
                  <option value="Luxembourg">Luxembourg</option>
                  <option value="Macao">Macao</option>
                  <option value="Madagascar">Madagascar</option>
                  <option value="Malawi">Malawi</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Maldives">Maldives</option>
                  <option value="Mali">Mali</option>
                  <option value="Malta">Malta</option>
                  <option value="Marshall Islands">Marshall Islands</option>
                  <option value="Mauritania">Mauritania</option>
                  <option value="Mauritius">Mauritius</option>
                  <option value="Mexico">Mexico</option>
                  <option value="Micronesia">Micronesia</option>
                  <option value="Moldova">Moldova</option>
                  <option value="Monaco">Monaco</option>
                  <option value="Mongolia">Mongolia</option>
                  <option value="Montenegro">Montenegro</option>
                  <option value="Morocco">Morocco</option>
                  <option value="Mozambique">Mozambique</option>
                  <option value="Myanmar">Myanmar</option>
                  <option value="Namibia">Namibia</option>
                  <option value="Nauru">Nauru</option>
                  <option value="Nepal">Nepal</option>
                  <option value="Netherlands">Netherlands</option>
                  <option value="New Zealand">New Zealand</option>
                  <option value="Nicaragua">Nicaragua</option>
                  <option value="Niger">Niger</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="North Korea">North Korea</option>
                  <option value="North Macedonia">North Macedonia</option>
                  <option value="Norway">Norway</option>
                  <option value="Oman">Oman</option>
                  <option value="Pakistan">Pakistan</option>
                  <option value="Palau">Palau</option>
                  <option value="Palestine">Palestine</option>
                  <option value="Panama">Panama</option>
                  <option value="Papua New Guinea">Papua New Guinea</option>
                  <option value="Paraguay">Paraguay</option>
                  <option value="Peru">Peru</option>
                  <option value="Philippines">Philippines</option>
                  <option value="Poland">Poland</option>
                  <option value="Portugal">Portugal</option>
                  <option value="Qatar">Qatar</option>
                  <option value="Romania">Romania</option>
                  <option value="Russia">Russia</option>
                  <option value="Rwanda">Rwanda</option>
                  <option value="Saint Kitts and Nevis">Saint Kitts and Nevis</option>
                  <option value="Saint Lucia">Saint Lucia</option>
                  <option value="Saint Vincent and the Grenadines">Saint Vincent and the Grenadines</option>
                  <option value="Samoa">Samoa</option>
                  <option value="San Marino">San Marino</option>
                  <option value="Sao Tome and Principe">Sao Tome and Principe</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="Senegal">Senegal</option>
                  <option value="Serbia">Serbia</option>
                  <option value="Seychelles">Seychelles</option>
                  <option value="Sierra Leone">Sierra Leone</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Slovakia">Slovakia</option>
                  <option value="Slovenia">Slovenia</option>
                  <option value="Solomon Islands">Solomon Islands</option>
                  <option value="Somalia">Somalia</option>
                  <option value="South Africa">South Africa</option>
                  <option value="South Korea">South Korea</option>
                  <option value="South Sudan">South Sudan</option>
                  <option value="Spain">Spain</option>
                  <option value="Sri Lanka">Sri Lanka</option>
                  <option value="Sudan">Sudan</option>
                  <option value="Suriname">Suriname</option>
                  <option value="Sweden">Sweden</option>
                  <option value="Switzerland">Switzerland</option>
                  <option value="Syria">Syria</option>
                  <option value="Taiwan">Taiwan</option>
                  <option value="Tajikistan">Tajikistan</option>
                  <option value="Tanzania">Tanzania</option>
                  <option value="Thailand">Thailand</option>
                  <option value="Timor-Leste">Timor-Leste</option>
                  <option value="Togo">Togo</option>
                  <option value="Tonga">Tonga</option>
                  <option value="Trinidad and Tobago">Trinidad and Tobago</option>
                  <option value="Tunisia">Tunisia</option>
                  <option value="Turkey">Turkey</option>
                  <option value="Turkmenistan">Turkmenistan</option>
                  <option value="Tuvalu">Tuvalu</option>
                  <option value="Uganda">Uganda</option>
                  <option value="Ukraine">Ukraine</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United States">United States</option>
                  <option value="Uruguay">Uruguay</option>
                  <option value="Uzbekistan">Uzbekistan</option>
                  <option value="Vanuatu">Vanuatu</option>
                  <option value="Vatican City">Vatican City</option>
                  <option value="Venezuela">Venezuela</option>
                  <option value="Vietnam">Vietnam</option>
                  <option value="Yemen">Yemen</option>
                  <option value="Zambia">Zambia</option>
                  <option value="Zimbabwe">Zimbabwe</option>
                </select>
              </div>

              {/* Unit, level, etc */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Unit, level, etc. (if applicable)</label>
                <input
                  type="text"
                  value={selectedLocation.unit}
                  onChange={(e) => setSelectedLocation({ ...selectedLocation, unit: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                  placeholder=""
                />
              </div>

              {/* Building name */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Building name (if applicable)</label>
                <input
                  type="text"
                  value={selectedLocation.building}
                  onChange={(e) => setSelectedLocation({ ...selectedLocation, building: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                  placeholder=""
                />
              </div>

              {/* Street address */}
              <div>
                <label className={`block text-xs mb-1 ${!selectedLocation.street ? 'text-red-500' : 'text-gray-600'}`}>Street address <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={selectedLocation.street}
                  onChange={(e) => setSelectedLocation({ ...selectedLocation, street: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-gray-900 ${
                    !selectedLocation.street ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder=""
                />
              </div>

              {/* Barangay / district */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Barangay / district (if applicable)</label>
                <input
                  type="text"
                  value={selectedLocation.barangay}
                  onChange={(e) => setSelectedLocation({ ...selectedLocation, barangay: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
                  placeholder=""
                />
              </div>

              {/* City / municipality */}
              <div>
                <label className={`block text-xs mb-1 ${!selectedLocation.city ? 'text-red-500' : 'text-gray-600'}`}>City / municipality <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={selectedLocation.city}
                  onChange={(e) => setSelectedLocation({ ...selectedLocation, city: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-gray-900 ${
                    !selectedLocation.city ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder=""
                />
              </div>

              {/* ZIP code */}
              <div>
                <label className={`block text-xs mb-1 ${!selectedLocation.zipCode ? 'text-red-500' : 'text-gray-600'}`}>ZIP code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={selectedLocation.zipCode}
                  onChange={(e) => setSelectedLocation({ ...selectedLocation, zipCode: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-gray-900 ${
                    !selectedLocation.zipCode ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder=""
                />
              </div>

              {/* Province */}
              <div>
                <label className={`block text-xs mb-1 ${!selectedLocation.province ? 'text-red-500' : 'text-gray-600'}`}>Province <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={selectedLocation.province}
                  onChange={(e) => setSelectedLocation({ ...selectedLocation, province: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-gray-900 ${
                    !selectedLocation.province ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder=""
                />
              </div>

            </form>

            {/* Show precise location toggle */}
            <div className="flex items-start justify-between mt-8 mx-auto" style={{ maxWidth: '900px' }}>
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-900 mb-1">Show your home's precise location</h3>
                <p className="text-sm text-gray-600">
                  Make it clear to guests where your place is located. We'll only share your address after they've made a reservation.{' '}
                  <span className="underline cursor-pointer">Learn more</span>
                </p>
      </div>
              <div className="ml-4 flex-shrink-0">
        <button
                  type="button"
                  onClick={() => setShowPreciseLocation(!showPreciseLocation)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showPreciseLocation ? 'bg-black' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      showPreciseLocation ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
      </div>
            </div>

            {/* Map preview - same size as main map */}
            <div className="mt-6 relative rounded-xl overflow-hidden mx-auto" style={{ height: '600px', maxWidth: '900px', cursor: 'default' }}>
              <MapContainer
                key={`${position[0]}-${position[1]}-${showPreciseLocation}`}
                center={position}
                zoom={showPreciseLocation ? 17 : 13}
                style={{ height: '100%', width: '100%', cursor: 'default' }}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                <Marker position={position} icon={homeIcon} />
                <MapUpdater center={position} onClick={() => {}} />
              </MapContainer>
              {!showPreciseLocation && (
                <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center px-8">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-gray-900 font-semibold text-lg mb-1">Approximate location</p>
                    <p className="text-gray-600 text-sm">We'll share your general area with guests</p>
                  </div>
                </div>
              )}
      </div>
          </div>
          <OnboardingFooter
            onBack={() => {
              // When going back from address form, restore the saved location on the map
              console.log('📍 Location: Going back from address form, restoring saved location');
              
              // Use saved location data if available
              const savedLocationData = state?.locationData || selectedLocation;
              
              // Update position if we have saved coordinates
              if (savedLocationData?.latitude && savedLocationData?.longitude) {
                console.log('📍 Location: Restoring position from saved location:', [savedLocationData.latitude, savedLocationData.longitude]);
                isManuallySettingPositionRef.current = true;
                setPosition([savedLocationData.latitude, savedLocationData.longitude]);
                setTimeout(() => { isManuallySettingPositionRef.current = false; }, 500);
              }
              
              // Update searchValue to show the saved address if available
              if (savedLocationData) {
                const addressParts = [
                  savedLocationData.unit,
                  savedLocationData.building,
                  savedLocationData.street,
                  savedLocationData.barangay,
                  savedLocationData.city,
                  savedLocationData.zipCode,
                  savedLocationData.province,
                  savedLocationData.country
                ].filter(Boolean);
                
                if (addressParts.length > 0) {
                  setSearchValue(addressParts.join(', '));
                  setLocationFilled(true);
                }
              }
              
              // Close the address form to show the map view
              setShowAddressForm(false);
            }}
            onNext={() => {
              // All required fields are validated by canProceed prop
              // Ensure currentStep is 'location' before showing modal
              // LocationConfirmation will update it when navigated to
              if (actions.setCurrentStep) {
                actions.setCurrentStep('location');
              }
              setShowFinalConfirm(true);
            }}
            backText="Back"
            nextText="Next"
            canProceed={selectedLocation.country && selectedLocation.street && selectedLocation.city && selectedLocation.zipCode && selectedLocation.province}
          />

          {/* Final confirmation modal before navigating to LocationConfirmation */}
          {showFinalConfirm && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--primary))' }}>
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
        </div>
      </div>
                <h3 className="text-lg font-semibold text-center mb-2">Is your address correct?</h3>
                <p className="text-center text-sm text-gray-700 mb-6">
                  {[
                    selectedLocation.unit,
                    selectedLocation.building,
                    selectedLocation.street,
                    selectedLocation.barangay,
                    selectedLocation.city,
                    selectedLocation.zipCode,
                    selectedLocation.province,
                    selectedLocation.country
                  ].filter(Boolean).join(', ')}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <button
                    className="px-4 py-2 rounded-lg border text-sm"
                    onClick={() => setShowFinalConfirm(false)}
                  >
                    Edit address
                  </button>
        <button
                    className="px-4 py-2 rounded-lg text-white text-sm"
                    style={{ background: 'hsl(var(--primary))' }}
                    onClick={async () => {
                      setShowFinalConfirm(false);
                      try {
                        // Normalize location data to only include allowed fields (same as LocationConfirmation)
                        const normalizeLocationData = (input) => {
                          if (!input) return {};
                          const allowedKeys = [
                            'street', 'barangay', 'city', 'province', 'country', 'zipCode',
                            'unit', 'building', 'latitude', 'longitude'
                          ];
                          const out = {};
                          for (const key of allowedKeys) {
                            let val = input[key];
                            if (val === undefined || val === null) continue;
                            if (typeof val === 'string') {
                              val = val.trim();
                              if (!val) continue;
                              // Clean up country name: remove "(the)" and country code suffixes
                              if (key === 'country') {
                                // Remove "(the)" from country names like "Philippines (the)"
                                val = val.replace(/\s*\(the\)\s*/gi, '');
                                // Remove country code suffix like " - PH" or " (PH)"
                                val = val.replace(/\s*-\s*[A-Z]{2,3}\s*$/i, ''); // Remove " - PH" at end
                                val = val.replace(/\s*\([A-Z]{2,3}\)\s*$/i, ''); // Remove " (PH)" at end
                                val = val.trim();
                              }
                            }
                            if ((key === 'latitude' || key === 'longitude') && typeof val === 'string') {
                              val = parseFloat(val);
                              if (!Number.isFinite(val)) continue;
                            }
                            out[key] = val;
                          }
                          return out;
                        };

                        // Log what we're about to normalize to debug
                        console.log('📍 Location page: selectedLocation before normalization:', selectedLocation);

                        const currentLocationData = normalizeLocationData({
                          ...selectedLocation,
                          latitude: position[0],
                          longitude: position[1]
                        });
                        
                        // Log normalized data to ensure fields are preserved
                        console.log('📍 Location page: currentLocationData after normalization:', currentLocationData);
                        
                        // Update context first
                        actions.updateLocationData(currentLocationData);
                        // Ensure currentStep is 'location' before navigating (LocationConfirmation will update it)
                        // This ensures the progress bar correctly detects forward navigation
                        if (actions.setCurrentStep) {
                          actions.setCurrentStep('location');
                        }
                        
                        // Manually update sessionStorage to ensure progress bar detects forward navigation
                        // Store 'location' as previous step before navigating to 'locationconfirmation'
                        // This ensures OnboardingHeader correctly detects forward navigation (location -> locationconfirmation)
                        // 'location' is at index 4 in step group 1: progress = ((4+1)/7)*100 = 71.43%
                        const storagePrevStepKey = 'onb_prev_step_name';
                        const storageStepKey = 'onb_progress_step';
                        const storageKey = 'onb_progress_value';
                        const locationProgress = ((4 + 1) / 7) * 100; // location index 4, total 7 pages in step 1
                        sessionStorage.setItem(storagePrevStepKey, 'location');
                        sessionStorage.setItem(storageStepKey, '1'); // Both location and locationconfirmation are in step group 1
                        sessionStorage.setItem(storageKey, String(locationProgress)); // Store current progress
                        console.log('📍 Location page: Set previous step in sessionStorage to "location" (progress:', Math.round(locationProgress) + '%) for forward navigation detection');
                        
                        // Small delay to ensure React processes state updates and sessionStorage is set
                        await new Promise(resolve => setTimeout(resolve, 50));
                        
                        // Ensure we have a valid draft and save to Firebase (no temp documents)
                        let draftIdToUse;
                        try {
                          draftIdToUse = await ensureDraftAndSave(currentLocationData, 'location');
                          console.log('📍 Location page: ✅ Saved locationData to Firebase on "Yes, it\'s correct"');
                        } catch (saveError) {
                          console.error('📍 Location page: Error saving to Firebase on "Yes, it\'s correct":', saveError);
                          // Continue navigation even if save fails - data is in context
                        }
                        
                        navigate('/pages/locationconfirmation', { 
                          state: { 
                            locationData: currentLocationData, 
                            position,
                            draftId: draftIdToUse || state?.draftId || location.state?.draftId
                          } 
                        });
                      } catch (e) {
                        console.error('Failed to persist location before navigating to confirmation:', e);
                        // Fallback: navigate with selectedLocation as-is
                        const fallbackLocationData = {
                          ...selectedLocation,
                          latitude: position[0],
                          longitude: position[1]
                        };
                        navigate('/pages/locationconfirmation', { 
                          state: { 
                            locationData: fallbackLocationData, 
                            position 
                          } 
                        });
                      }
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                  >
                    Yes, it's correct
                  </button>
                </div>
      </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Location;