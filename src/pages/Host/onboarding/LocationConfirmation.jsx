import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit.js';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';

// Fix marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Ensure grab hand cursor on marker hover/drag
if (!document.getElementById('loc-conf-marker-cursor')) {
  const style = document.createElement('style');
  style.id = 'loc-conf-marker-cursor';
  style.textContent = `
    /* Show grab on hover */
    .leaflet-marker-icon.custom-home-marker,
    .leaflet-marker-icon.custom-home-marker * { cursor: grab !important; }
    .leaflet-marker-icon.custom-home-marker:hover,
    .leaflet-marker-icon.custom-home-marker:hover * { cursor: grab !important; }

    /* While dragging, force closed hand */
    .leaflet-dragging .leaflet-marker-icon.custom-home-marker,
    .leaflet-dragging .leaflet-marker-icon.custom-home-marker *,
    .leaflet-dragging .custom-home-marker,
    .leaflet-dragging .custom-home-marker *,
    .leaflet-dragging .leaflet-marker-icon,
    .leaflet-dragging .leaflet-marker-icon * { cursor: grabbing !important; }
    .leaflet-marker-icon.custom-home-marker.leaflet-interactive:active,
    .leaflet-marker-icon.custom-home-marker:active { cursor: grabbing !important; }
  `;
  document.head.appendChild(style);
}

// Primary-colored custom home icon (match Location page)
const homeIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 50px; height: 65px; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3)); cursor: grab !important;">
      <svg width="50" height="65" viewBox="0 0 50 65" fill="none" xmlns="http://www.w3.org/2000/svg" style="cursor: grab !important; color: hsl(var(--primary));">
        <path d="M25 65 C20 58, 5 40, 5 25 C5 11, 11 5, 25 5 C39 5, 45 11, 45 25 C45 40, 30 58, 25 65 Z" 
              fill="currentColor" stroke="white" stroke-width="3" stroke-linejoin="round" style="cursor: grab !important;"/>
        <g transform="translate(13, 12)" style="cursor: grab !important;">
          <path d="M12 2L0 10V22H5V15H19V22H24V10L12 2Z" fill="white" style="cursor: grab !important;"/>
          <rect x="8" y="18" width="8" height="4" fill="white" style="cursor: grab !important;"/>
        </g>
      </svg>
    </div>
  `,
  className: 'custom-home-marker',
  iconSize: [50, 65],
  iconAnchor: [25, 65],
  popupAnchor: [0, -65]
});

// Map position updater component
function MapUpdater({ center, onMapClick }) {
  const map = useMap();
  
  useEffect(() => {
    if (onMapClick) {
      map.on('click', onMapClick);
    }
    
    return () => {
      if (onMapClick) {
        map.off('click', onMapClick);
      }
    };
  }, [map, onMapClick]);

  // Pan to center when it changes and ensure max zoom
  // Use a more responsive threshold and always update when center changes significantly
  useEffect(() => {
    if (!center || center.length !== 2) return;
    
    const [lat, lng] = center;
    if (!lat || !lng || !isFinite(lat) || !isFinite(lng)) return;
    
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    
    // Calculate distance in degrees - use a smaller threshold for more responsiveness
    const latDiff = Math.abs(currentCenter.lat - lat);
    const lngDiff = Math.abs(currentCenter.lng - lng);
    
    // Update map view if center changed significantly (more than ~50 meters) or if zoom is not at 19
    if (latDiff > 0.0005 || lngDiff > 0.0005 || currentZoom !== 19) {
      map.setView([lat, lng], 19, { animate: true, duration: 0.5 });
    }
  }, [map, center]);

  return null;
}

const LocationConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use OnboardingContext for proper draft management
  let contextData;
  try {
    contextData = useOnboarding();
  } catch (error) {
    console.error('LocationConfirmation must be used within OnboardingProvider');
    return null;
  }

  const { state, actions } = contextData;
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  // Search UI state (to mirror Location page behavior)
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchTimeoutRef = useRef(null);
  
  // Use ref to avoid infinite re-renders
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  
  // Get location data from previous page or use default
  // Prioritize navigation state (from "Is your address correct?" modal) over context
  const initialLocationData = location.state?.locationData || 
    state?.locationData || {
      country: '',
      unit: '',
      building: '',
      street: '',
      barangay: '',
      city: '',
      zipCode: '',
      province: '',
      showPreciseLocation: false
    };
  
  const [locationData, setLocationData] = useState(initialLocationData);
  
  // Display address state - shows the current location at pin position (for search bar display only)
  // Helper function to format confirmed address from locationData
  const getInitialDisplayAddress = (data) => {
    if (data && (data.street || data.city || data.country)) {
      const parts = [];
      if (data.unit) parts.push(data.unit);
      if (data.building) parts.push(data.building);
      if (data.street) parts.push(data.street);
      if (data.barangay) parts.push(data.barangay);
      if (data.city) parts.push(data.city);
      if (data.zipCode) parts.push(data.zipCode);
      if (data.province) parts.push(data.province);
      if (data.country) parts.push(data.country);
      return parts.filter(part => part && part.trim()).join(', ');
    }
    return '';
  };
  
  // Initialize with confirmed address from navigation state or locationData
  const initialDisplayAddr = (() => {
    const navData = location.state?.locationData;
    const dataToUse = navData || initialLocationData;
    return getInitialDisplayAddress(dataToUse);
  })();
  
  const [displayAddressAtPin, setDisplayAddressAtPin] = useState(initialDisplayAddr);
  
  const initialPosition = location.state?.position || 
    (initialLocationData.latitude && initialLocationData.longitude 
      ? [initialLocationData.latitude, initialLocationData.longitude]
      : [14.602, 120.9827]);
  
  const [position, setPosition] = useState(initialPosition);

  // Keep only fields we actually use across pages and normalize values
  const normalizeLocationData = (input) => {
    if (!input) return {};
    // Only keep the same fields as Location page's locationData
    const allowedKeys = [
      'street', 'barangay', 'city', 'province', 'country', 'zipCode',
      'unit', 'building', 'latitude', 'longitude'
    ];
    const out = {};
    for (const key of allowedKeys) {
      let val = input[key];
      if (val === undefined || val === null) continue;
      if (typeof val === 'string') {
        // Trim and drop placeholders
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
        const num = Number(val);
        if (!Number.isFinite(num)) continue;
        val = num;
      }
      out[key] = val;
    }
    return out;
  };

  // Load draft if draftId is provided (from navigation state or context)
  useEffect(() => {
    const loadDraftData = async () => {
      // Get draftId from navigation state or context state
      const draftIdToLoad = location.state?.draftId || state?.draftId;
      
      if (draftIdToLoad && !hasLoadedDraft) {
        try {
          console.log('Loading draft in LocationConfirmation:', draftIdToLoad);
          await actionsRef.current.loadDraft(draftIdToLoad);
          // Note: currentStep correction is handled by useEffect after hasLoadedDraft becomes true
          setHasLoadedDraft(true);
        } catch (error) {
          console.error('Failed to load draft:', error);
        }
      } else if (!draftIdToLoad && !hasLoadedDraft) {
        // If no draftId but we have locationData in context, use it
        if (state.locationData && (state.locationData.latitude || state.locationData.city || state.locationData.country)) {
          console.log('Using location data from context state (no draftId provided)');
          setLocationData(state.locationData);
          if (state.locationData.latitude && state.locationData.longitude) {
            setPosition([state.locationData.latitude, state.locationData.longitude]);
          }
          setHasLoadedDraft(true);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state?.draftId, hasLoadedDraft, state.locationData]);

  // Update local state when context state changes (after draft is loaded)
  useEffect(() => {
    if (state.locationData && hasLoadedDraft) {
      console.log('LocationConfirmation: Updating local state from context:', state.locationData);
      setLocationData(state.locationData);
      if (state.locationData.latitude && state.locationData.longitude) {
        setPosition([state.locationData.latitude, state.locationData.longitude]);
      }
    }
  }, [state.locationData, hasLoadedDraft]);

  // Update locationData when navigation state provides it (priority - from "Is your address correct?" modal)
  useEffect(() => {
    if (location.state?.locationData) {
      console.log('LocationConfirmation: Using locationData from navigation state (from confirmation modal):', location.state.locationData);
      const normalizedData = normalizeLocationData(location.state.locationData);
      setLocationData(normalizedData);
      if (location.state.locationData.latitude && location.state.locationData.longitude) {
        setPosition([location.state.locationData.latitude, location.state.locationData.longitude]);
      } else if (location.state.position) {
        setPosition(location.state.position);
      }
      // Also update context to keep it in sync
      actionsRef.current.updateLocationData(normalizedData);
      setHasLoadedDraft(true); // Mark as loaded so we don't override with Firebase data
    }
  }, [location.state?.locationData, location.state?.position]);

  // Set current step immediately when component mounts to ensure progress bar detects forward navigation
  // Use useLayoutEffect to set it synchronously before paint
  // This runs BEFORE the draft loading effect, so we set it early
  useLayoutEffect(() => {
    if (actions?.setCurrentStep) {
      console.log('📍 LocationConfirmation: Setting currentStep to locationconfirmation (useLayoutEffect)');
      actions.setCurrentStep('locationconfirmation');
    }
  }, [actions]);
  
  // Also set currentStep after draft loads (in case draft overwrote it)
  // This ensures the step is correct even if draft loads with a different step
  useEffect(() => {
    if (hasLoadedDraft && actions?.setCurrentStep) {
      // Only set if it's not already correct (to avoid unnecessary updates)
      if (state.currentStep !== 'locationconfirmation') {
        console.log('📍 LocationConfirmation: Resetting currentStep to locationconfirmation after draft load (useEffect)');
        console.log('📍 LocationConfirmation: Draft loaded with currentStep:', state.currentStep, '- correcting to locationconfirmation');
        actions.setCurrentStep('locationconfirmation');
        
        // CRITICAL: Also update sessionStorage to ensure progress bar uses correct previous step
        // If draft loaded 'privacytype', sessionStorage might have wrong previous step
        // Force it to 'location' so progress bar calculates forward navigation correctly
        const storagePrevStepKey = 'onb_prev_step_name';
        const currentPrevStep = sessionStorage.getItem(storagePrevStepKey);
        
        // Only update if previous step is not 'location' (our expected previous step)
        if (currentPrevStep !== 'location') {
          console.log('📍 LocationConfirmation: Correcting sessionStorage previous step from', currentPrevStep, 'to location');
          sessionStorage.setItem(storagePrevStepKey, 'location');
          
          // Also ensure progress step and value are correct
          const storageStepKey = 'onb_progress_step';
          const storageKey = 'onb_progress_value';
          const locationProgress = ((4 + 1) / 7) * 100; // location index 4
          sessionStorage.setItem(storageStepKey, '1');
          sessionStorage.setItem(storageKey, String(locationProgress));
        }
      }
    }
  }, [hasLoadedDraft, actions, state.currentStep]);

  // Sync initial location data with context (from navigation state or default)
  useEffect(() => {
    if (locationData && (locationData.country || locationData.city || locationData.latitude)) {
      const locationWithCoords = normalizeLocationData({
        ...locationData,
        latitude: position[0],
        longitude: position[1]
      });
      console.log('Syncing location data with context:', locationWithCoords);
      actionsRef.current.updateLocationData(locationWithCoords);
    }
  }, []); // Only run once on mount

  // Initialize location on component mount if no data is provided
  // Only run if we don't have location data from navigation state AND we haven't loaded from Firebase yet
  useEffect(() => {
    const initializeLocation = async () => {
      // Don't initialize if:
      // 1. We have location data from navigation state
      // 2. We have location data from Firebase context (hasLoadedDraft is true or we have state.locationData)
      // 3. We have a draftId to load from
      const hasNavLocationData = location.state?.locationData && 
        (location.state.locationData.city || location.state.locationData.country || location.state.locationData.latitude);
      const hasFirebaseLocationData = state.locationData && 
        (state.locationData.city || state.locationData.country || state.locationData.latitude);
      const hasDraftIdToLoad = location.state?.draftId || state?.draftId;
      
      if (hasNavLocationData || hasFirebaseLocationData || hasDraftIdToLoad) {
        console.log('LocationConfirmation: Skipping initialization - have location data from nav, Firebase, or draftId');
        return;
      }
      
      // Only initialize with reverse geocoding if we truly have no location data
        const [lat, lng] = position;
        
        try {
          // Try BigDataCloud first as it's CORS-enabled and reliable
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          );
          const data = await response.json();
          
          if (data && data.countryName) {
          // Clean country name: remove "(the)" suffix
          let countryName = data.countryName.replace(/\s*\(the\)\s*/gi, '').trim();
            setLocationData(prev => ({
              ...prev,
            country: countryName || '',
              city: data.city || data.localityInfo?.administrative?.[2]?.name || data.localityInfo?.administrative?.[1]?.name || '',
              province: data.principalSubdivision && data.principalSubdivision !== 'region' ? data.principalSubdivision :
                       (data.localityInfo?.administrative?.[1]?.name && data.localityInfo.administrative[1].name !== 'region') ? data.localityInfo.administrative[1].name :
                       (data.localityInfo?.administrative?.[0]?.name && data.localityInfo.administrative[0].name !== 'region') ? data.localityInfo.administrative[0].name : '',
              street: data.locality || data.localityInfo?.informative?.[0]?.name || '',
              barangay: data.localityInfo?.administrative?.[4]?.name || data.localityInfo?.administrative?.[3]?.name || '',
              zipCode: data.postcode || '',
              building: '',
            }));
            return;
          }
        } catch (error) {
          console.log('Failed to initialize location:', error);
      }
    };

    // Wait a bit to see if Firebase data loads first
    const timeoutId = setTimeout(() => {
    initializeLocation();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [location.state?.locationData, state.locationData, location.state?.draftId, state?.draftId, hasLoadedDraft]);

  // Handle map click to reposition marker
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    setPosition([lat, lng]);

    // Update display address for search bar (performs reverse geocoding for display only)
    console.log('LocationConfirmation: Map clicked, fetching new address at:', lat, lng);
    const displayAddr = await getDisplayAddressAtLocation(lat, lng);
    console.log('LocationConfirmation: New display address received:', displayAddr);
    setDisplayAddressAtPin(displayAddr);
    console.log('LocationConfirmation: displayAddressAtPin state updated');

    // ALWAYS preserve existing address fields - only update coordinates
    // The address was confirmed by the user, so we should never auto-update it from geocoding
    console.log('Map clicked - only updating coordinates, preserving ALL address fields');
    const updatedLocation = normalizeLocationData({
      ...locationData,
      latitude: lat,
      longitude: lng
      // Keep ALL other address fields unchanged (street, barangay, city, province, country, zipCode, unit, building)
    });
    setLocationData(updatedLocation);
    actionsRef.current.updateLocationData(updatedLocation);
    // Note: We update displayAddressAtPin for search bar, but locationData (confirmed address) remains unchanged
  };

  // Debounced search suggestions similar to Location page
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!searchValue || searchValue.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const [lat, lon] = position;
        const latOffset = 0.5;
        const lonOffset = 0.5;
        const viewbox = `${lon - lonOffset},${lat + latOffset},${lon + lonOffset},${lat - latOffset}`;
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchValue)}&addressdetails=1&limit=8&viewbox=${viewbox}&bounded=1`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(nominatimUrl)}`;
        const resp = await fetch(proxyUrl);
        if (!resp.ok) {
          throw new Error(`HTTP error! status: ${resp.status}`);
        }
        const proxyData = await resp.json();
        const results = JSON.parse(proxyData.contents || '[]');
        if (results.length === 0) {
          const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchValue)}&addressdetails=1&limit=8&lat=${lat}&lon=${lon}`;
          const fallbackProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(fallbackUrl)}`;
          const fallback = await fetch(fallbackProxyUrl);
          if (!fallback.ok) {
            throw new Error(`HTTP error! status: ${fallback.status}`);
          }
          const fallbackProxyData = await fallback.json();
          const fbResults = JSON.parse(fallbackProxyData.contents || '[]');
          setSuggestions(fbResults);
        } else {
          setSuggestions(results);
        }
      } catch (error) {
        console.error('Error fetching location suggestions in LocationConfirmation:', error);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchValue, position]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchValue) return;
    if (suggestions[0]) handleSuggestionClick(suggestions[0]);
  };

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    setSearchFocused(true);
  };

  const handleSuggestionClick = async (s) => {
    const lat = parseFloat(s.lat);
    const lon = parseFloat(s.lon);
    setPosition([lat, lon]);
    setSearchValue(s.display_name);
    setSuggestions([]);
    setIsSearching(false);
    setSearchFocused(false);
    // Update locationData with parsed address
    const addr = s.address || {};
    const updatedLocationData = normalizeLocationData({
      ...locationData,
      street: addr.road || locationData.street || '',
      barangay: addr.suburb || addr.village || addr.neighbourhood || locationData.barangay || '',
      city: addr.city || addr.town || addr.municipality || locationData.city || '',
      province: addr.state || addr.region || addr.county || addr.state_district || locationData.province || '',
      zipCode: addr.postcode || locationData.zipCode || '',
      country: addr.country || locationData.country || '',
      latitude: lat,
      longitude: lon
    });
    setLocationData(updatedLocationData);
    actionsRef.current.updateLocationData(updatedLocationData);
    // Don't save to Firebase here - only save on Next or Save & Exit
  };

  // Calculate distance between two coordinates in meters using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  // Reverse geocode to get display address for search bar (doesn't modify locationData)
  // Uses multiple sources for accurate street and building detection
  const getDisplayAddressAtLocation = async (lat, lng) => {
    try {
      // Try BigDataCloud first (better CORS support and detailed results)
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        const data = await response.json();
        
        if (data && (data.locality || data.city || data.countryName)) {
        const addressParts = [];
        
        // Extract building/place name if available (most specific)
        if (data.localityInfo?.informative) {
          // Look for building, place, or venue names first
          const buildingInfo = data.localityInfo.informative.find(item => 
            item.description?.includes('building') || 
            item.description?.includes('venue') ||
            item.description?.includes('place') ||
            item.description?.includes('establishment') ||
            item.name
          );
          if (buildingInfo?.name && buildingInfo.name !== data.locality) {
            addressParts.push(buildingInfo.name);
          }
        }
        
        // Extract street name (very important for accuracy)
        let streetName = '';
          if (data.localityInfo?.informative) {
            const streetInfo = data.localityInfo.informative.find(item => 
              item.description?.includes('road') || 
              item.description?.includes('street') ||
            item.description?.includes('avenue') ||
            item.description?.includes('boulevard') ||
            item.description?.includes('highway') ||
            item.description?.includes('drive') ||
            item.description?.includes('lane') ||
            item.description?.includes('way')
          );
          streetName = streetInfo?.name || '';
        }
        
        // If no street found in informative, check other sources
        if (!streetName && data.localityInfo?.informative?.[0]?.name) {
          streetName = data.localityInfo.informative[0].name;
        }
        
        if (streetName) addressParts.push(streetName);
        
        // Add locality/district if different from street
        if (data.locality && data.locality !== streetName && !addressParts.includes(data.locality)) {
          addressParts.push(data.locality);
        }
        
        // Add barangay/suburb/district (administrative level 4 or 3)
        const barangay = data.localityInfo?.administrative?.[4]?.name || 
                        data.localityInfo?.administrative?.[3]?.name ||
                        data.localityInfo?.administrative?.[5]?.name;
        if (barangay && barangay !== data.locality && !addressParts.includes(barangay)) {
          addressParts.push(barangay);
        }
        
        // Add city
        const city = data.city || 
                    data.localityInfo?.administrative?.[2]?.name || 
                    data.localityInfo?.administrative?.[1]?.name;
        if (city && !addressParts.includes(city)) {
          addressParts.push(city);
        }
        
        // Add ZIP code
        if (data.postcode) {
          addressParts.push(data.postcode);
        }
        
        // Add province/state
        const province = data.principalSubdivision && data.principalSubdivision !== 'region' 
          ? data.principalSubdivision 
          : (data.localityInfo?.administrative?.[1]?.name && 
             data.localityInfo.administrative[1].name !== 'region' && 
             data.localityInfo.administrative[1].name !== city)
            ? data.localityInfo.administrative[1].name
            : (data.localityInfo?.administrative?.[0]?.name && 
               data.localityInfo.administrative[0].name !== 'region' && 
               data.localityInfo.administrative[0].name !== city)
              ? data.localityInfo.administrative[0].name
              : null;
        if (province && !addressParts.includes(province)) {
          addressParts.push(province);
        }
        
        // Add country
        if (data.countryName) {
          let countryName = data.countryName.replace(/\s*\(the\)\s*/gi, '').trim();
          countryName = countryName.replace(/\s*-\s*[A-Z]{2,3}\s*$/i, '').trim();
          countryName = countryName.replace(/\s*\([A-Z]{2,3}\)\s*$/i, '').trim();
          if (countryName && !addressParts.includes(countryName)) {
            addressParts.push(countryName);
          }
        }
        
        const formattedAddress = addressParts.filter(part => part && part.trim()).join(', ');
        return formattedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
      
      // Fallback: Try Nominatim via CORS proxy for more detailed results
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(nominatimUrl)}`;
        const nominatimResponse = await fetch(proxyUrl);
        
        if (nominatimResponse.ok) {
          const proxyData = await nominatimResponse.json();
          const nominatimData = JSON.parse(proxyData.contents || '{}');
          
          if (nominatimData && nominatimData.address) {
            const addr = nominatimData.address;
            const parts = [];
            
            // Building/place name
            if (addr.building && addr.building !== addr.road) parts.push(addr.building);
            if (addr.amenity && !parts.includes(addr.amenity)) parts.push(addr.amenity);
            
            // Street (most important for accuracy)
            if (addr.road) parts.push(addr.road);
            else if (addr.pedestrian) parts.push(addr.pedestrian);
            else if (addr.footway) parts.push(addr.footway);
            
            // Barangay/suburb
            if (addr.suburb) parts.push(addr.suburb);
            else if (addr.village) parts.push(addr.village);
            else if (addr.neighbourhood) parts.push(addr.neighbourhood);
            
            // City
            if (addr.city) parts.push(addr.city);
            else if (addr.town) parts.push(addr.town);
            else if (addr.municipality) parts.push(addr.municipality);
            
            // ZIP code
            if (addr.postcode) parts.push(addr.postcode);
            
            // Province/state
            if (addr.state && addr.state !== addr.city) parts.push(addr.state);
            else if (addr.region) parts.push(addr.region);
            
            // Country
            if (addr.country) {
              let country = addr.country.replace(/\s*\(the\)\s*/gi, '').trim();
              country = country.replace(/\s*-\s*[A-Z]{2,3}\s*$/i, '').trim();
              country = country.replace(/\s*\([A-Z]{2,3}\)\s*$/i, '').trim();
              parts.push(country);
            }
            
            const formattedAddress = parts.filter(part => part && part.trim()).join(', ');
            if (formattedAddress) return formattedAddress;
          }
        }
      } catch (nominatimError) {
        console.log('Nominatim fallback failed:', nominatimError);
      }
      
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Error getting display address:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  // Handle marker drag
  const handleMarkerDragEnd = async (e) => {
    const { lat, lng } = e.target.getLatLng();
    const previousLat = position[0];
    const previousLng = position[1];
    
    // Calculate distance moved in meters
    const distanceMoved = calculateDistance(previousLat, previousLng, lat, lng);
    
    // Update position immediately - this will trigger MapUpdater to pan the map
    setPosition([lat, lng]);
    
    // Update display address for search bar (performs reverse geocoding for display only)
    console.log('LocationConfirmation: Pin dragged, fetching new address at:', lat, lng);
    const displayAddr = await getDisplayAddressAtLocation(lat, lng);
    console.log('LocationConfirmation: New display address received:', displayAddr);
    setDisplayAddressAtPin(displayAddr);
    console.log('LocationConfirmation: displayAddressAtPin state updated');
    
    // ALWAYS preserve existing address fields when pin is moved - only update coordinates
    // The address was confirmed by the user, so we should never auto-update it from geocoding
    console.log(`Pin moved ${distanceMoved.toFixed(2)} meters - only updating coordinates, preserving ALL address fields`);
    const updatedLocation = normalizeLocationData({
      ...locationData,
      latitude: lat,
      longitude: lng
      // Keep ALL other address fields unchanged (street, barangay, city, province, country, zipCode, unit, building)
    });
    setLocationData(updatedLocation);
    actionsRef.current.updateLocationData(updatedLocation);
    // Note: We update displayAddressAtPin for search bar, but locationData (confirmed address) remains unchanged
  };

  // Format the display address - show actual location at current pin position
  // Use useMemo to ensure it updates when displayAddressAtPin or locationData changes
  const displayAddress = useMemo(() => {
    // If we have a display address from reverse geocoding, use it (shows current pin location)
    if (displayAddressAtPin && displayAddressAtPin.trim()) {
      console.log('LocationConfirmation: Using displayAddressAtPin:', displayAddressAtPin);
      return displayAddressAtPin;
    }
    
    // Otherwise, fallback to confirmed address from locationData
    const parts = [];
    
    if (locationData.unit) parts.push(locationData.unit);
    if (locationData.building) parts.push(locationData.building);
    if (locationData.street) parts.push(locationData.street);
    if (locationData.barangay) parts.push(locationData.barangay);
    if (locationData.city) parts.push(locationData.city);
    if (locationData.zipCode) parts.push(locationData.zipCode);
    if (locationData.province) parts.push(locationData.province);
    if (locationData.country) parts.push(locationData.country);
    
    const addressString = parts.filter(part => part && part.trim()).join(', ');
    
    // Fallback to coordinates if no address
    return addressString || (position && position.length === 2 
      ? `Location: ${position[0].toFixed(6)}, ${position[1].toFixed(6)}`
      : 'Address not available');
  }, [displayAddressAtPin, locationData, position]);
  
  // Track if we've initialized the display address to prevent overwriting when pin is moved
  const hasInitializedDisplayAddress = useRef(false);
  
  // Initialize display address when locationData is loaded from navigation state (from Location page modal)
  // This ensures the search bar shows the confirmed address immediately, but only once
  useEffect(() => {
    // Only initialize if we haven't already and we have location data
    if (hasInitializedDisplayAddress.current) return;
    
    if (location.state?.locationData) {
      // Use confirmed address from Location page modal
      const confirmedAddress = getInitialDisplayAddress(location.state.locationData);
      if (confirmedAddress) {
        setDisplayAddressAtPin(confirmedAddress);
        hasInitializedDisplayAddress.current = true;
      }
    } else if (locationData && (locationData.street || locationData.city || locationData.country)) {
      // Fallback to locationData from context/Firebase
      const confirmedAddress = getInitialDisplayAddress(locationData);
      if (confirmedAddress) {
        setDisplayAddressAtPin(confirmedAddress);
        hasInitializedDisplayAddress.current = true;
      }
    }
  }, [location.state?.locationData, locationData]);

  // Save handler for Save & Exit functionality
  const handleSaveAndExitClick = async () => {
    console.log('LocationConfirmation Save & Exit clicked');
    console.log('Current locationData:', locationData);
    console.log('Current position:', position);
    console.log('Current context state:', state);
    
    // Check if we have meaningful location data
    if (!locationData || (!locationData.country && !locationData.city && !position[0])) {
      alert('Please ensure location data is set before saving.');
      return;
    }
    
    try {
      // Ensure location data is up to date
      const currentLocationData = normalizeLocationData({
        ...locationData,
        latitude: position[0],
        longitude: position[1]
      });
      
      console.log('Updating context with:', currentLocationData);
      actionsRef.current.updateLocationData(currentLocationData);
      
      // Set current step before saving
      if (actionsRef.current.setCurrentStep) {
        console.log('LocationConfirmation: Setting currentStep to locationconfirmation');
        actionsRef.current.setCurrentStep('locationconfirmation');
      }
      
      // Get the existing draftId from state - ensure we're updating, not creating
      let draftIdToUse = state?.draftId || location.state?.draftId;
      
      if (!draftIdToUse) {
        console.error('LocationConfirmation: No draftId found, cannot save');
        alert('Error: No draft found to update. Please start over.');
        return;
      }
      
      // Directly update the existing document in Firebase
      const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
      const docSnap = await getDoc(draftRef);
      
      if (!docSnap.exists()) {
        console.error('LocationConfirmation: Document does not exist:', draftIdToUse);
        alert('Error: Draft document not found. Please start over.');
        return;
      }
      
      // Update the existing document
      await updateDoc(draftRef, {
        'data.locationData': currentLocationData,
        'data.currentStep': 'locationconfirmation',
        currentStep: 'locationconfirmation',
        lastModified: new Date()
      });
      
      console.log('LocationConfirmation: ✅ Successfully updated existing document:', draftIdToUse);
        
        // Navigate to dashboard
        navigate('/host/hostdashboard', { 
          state: { 
            message: 'Draft saved successfully!',
            draftSaved: true 
          }
        });
      
    } catch (error) {
      console.error('Error in LocationConfirmation save:', error);
      alert('Failed to save progress: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} />

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-[640px] mx-auto">
          <h1 className="text-[32px] font-medium text-gray-900 mb-4">
            Is the pin in the right spot?
          </h1>
          <p className="text-gray-600 mb-8">
            Your address is only shared with guests after they've made a reservation.
          </p>

          

          {/* Map - match Location page look and size */}
          <div className="mt-6 relative rounded-2xl overflow-hidden mx-auto" style={{ height: '600px', maxWidth: '900px' }}>
            {/* Search bar overlaying the map (same as Location page) */}
            <div className="absolute top-0 left-0 w-full z-[1000] flex justify-center" style={{ pointerEvents: 'none' }}>
              <form className="w-[90%] mt-6" style={{ pointerEvents: 'auto' }}>
                <div className="flex flex-col gap-2 bg-white rounded-2xl shadow-xl w-full relative">
                  <div className="flex items-center border-2 border-black rounded-2xl px-5 py-4 bg-white">
                    <svg className="w-6 h-6 text-black mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <input
                      type="text"
                      value={displayAddress}
                      readOnly
                      disabled
                      className="flex-1 text-base text-gray-900 border-none bg-transparent font-normal cursor-not-allowed select-none"
                      title={`Coordinates: ${position[0].toFixed(6)}, ${position[1].toFixed(6)}`}
                    />
            </div>
          </div>
              </form>
            </div>
            <MapContainer
              center={position}
              zoom={19}
              style={{ height: '100%', width: '100%', borderRadius: '16px' }}
              zoomControl={false}
              doubleClickZoom={true}
              scrollWheelZoom={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker 
                position={position}
                icon={homeIcon}
                draggable={true}
                eventHandlers={{
                  dragend: handleMarkerDragEnd,
                  drag: (e) => {
                    // Update map view in real-time as marker is being dragged
                    const { lat, lng } = e.target.getLatLng();
                    const map = e.target._map;
                    if (map) {
                      // Smoothly pan the map to follow the marker during drag
                      map.panTo([lat, lng], { animate: false });
                    }
                  }
                }}
              />
              <MapUpdater center={position} onMapClick={handleMapClick} />
            </MapContainer>
          </div>

          
        </div>
      </main>

      {/* Footer */}
      <OnboardingFooter
        onBack={() => {
          // Check if location data exists and has meaningful content
          const hasLocationData = locationData && (
            locationData.country || 
            locationData.city || 
            locationData.street || 
            (locationData.latitude && locationData.longitude)
          );
          
          if (hasLocationData) {
            // Navigate back to Location page with address form view (preview map)
            navigate('/pages/location', {
              state: {
                showAddressForm: true,
                locationData: locationData,
                position: position,
                fromLocationConfirmation: true
              }
            });
          } else {
            // Navigate back to first part of Location page (map view)
            navigate('/pages/location', {
              state: {
                showAddressForm: false,
                fromLocationConfirmation: true
              }
            });
          }
        }}
        onNext={async () => {
          // Ensure latest location data is in context
          const currentLocationData = normalizeLocationData({
            ...locationData,
            latitude: position[0],
            longitude: position[1]
          });
          try {
            // Always update context and save to Firebase when Next is clicked
            actionsRef.current.updateLocationData(currentLocationData);
            
            // Set currentStep to 'locationconfirmation' first (current page) to update sessionStorage
            if (actionsRef.current.setCurrentStep) {
              actionsRef.current.setCurrentStep('locationconfirmation');
            }
            
            // Manually update sessionStorage to ensure progress bar detects forward navigation
            // Store 'locationconfirmation' as previous step before navigating to 'propertybasics'
            // This ensures OnboardingHeader correctly detects forward navigation (locationconfirmation -> propertybasics)
            // 'locationconfirmation' is at index 5 in step group 1: progress = ((5+1)/7)*100 = 85.71%
            const storagePrevStepKey = 'onb_prev_step_name';
            const storageStepKey = 'onb_progress_step';
            const storageKey = 'onb_progress_value';
            const locationConfirmationProgress = ((5 + 1) / 7) * 100; // locationconfirmation index 5, total 7 pages in step 1
            sessionStorage.setItem(storagePrevStepKey, 'locationconfirmation');
            sessionStorage.setItem(storageStepKey, '1'); // Both locationconfirmation and propertybasics are in step group 1
            sessionStorage.setItem(storageKey, String(locationConfirmationProgress)); // Store current progress
            console.log('📍 LocationConfirmation: Set previous step in sessionStorage to "locationconfirmation" (progress:', Math.round(locationConfirmationProgress) + '%) for forward navigation to propertybasics');
            
            // Small delay to ensure React processes state updates and sessionStorage is set
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Get the existing draftId - ensure we're updating, not creating
            let draftIdToUse = state?.draftId || location.state?.draftId;
            
            if (!draftIdToUse) {
              console.warn('LocationConfirmation: No draftId found on Next click, skipping Firebase update');
            } else {
              // Update the existing document directly
              const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
              const docSnap = await getDoc(draftRef);
              
              if (docSnap.exists()) {
                await updateDoc(draftRef, {
                  'data.locationData': currentLocationData,
                  'data.currentStep': 'propertybasics',
                  currentStep: 'propertybasics',
                  lastModified: new Date()
                });
                console.log('LocationConfirmation: ✅ Updated existing document on Next click:', draftIdToUse);
              } else {
                console.error('LocationConfirmation: Document does not exist:', draftIdToUse);
              }
            }
          } catch (e) {
            console.error('Failed to persist location before navigating:', e);
          }
          navigate('/pages/propertybasics', { 
                    state: { 
                      ...location.state,
              locationData: currentLocationData, 
                      position,
                      confirmedLocation: true 
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

export default LocationConfirmation;