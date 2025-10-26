import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit.js';

// Fix marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
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

  // Pan to center when it changes
  useEffect(() => {
    const currentCenter = map.getCenter();
    const [lat, lng] = center;
    
    if (Math.abs(currentCenter.lat - lat) > 0.001 || Math.abs(currentCenter.lng - lng) > 0.001) {
      map.panTo([lat, lng]);
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
  
  // Use ref to avoid infinite re-renders
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  
  // Get location data from previous page or use default
  const [locationData, setLocationData] = useState(
    location.state?.locationData || {
      country: '',
      unit: '',
      building: '',
      street: '',
      barangay: '',
      city: '',
      zipCode: '',
      province: '',
      showPreciseLocation: false
    }
  );
  
  const [position, setPosition] = useState(
    location.state?.position || [14.602, 120.9827] // Sampaloc, Manila area
  );

  // Load draft if draftId is provided
  useEffect(() => {
    const loadDraftData = async () => {
      if (location.state?.draftId && !hasLoadedDraft) {
        try {
          console.log('Loading draft in LocationConfirmation:', location.state.draftId);
          await actionsRef.current.loadDraft(location.state.draftId);
          setHasLoadedDraft(true);
        } catch (error) {
          console.error('Failed to load draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, hasLoadedDraft]);

  // Update local state when context state changes
  useEffect(() => {
    if (state.locationData && hasLoadedDraft) {
      setLocationData(state.locationData);
      if (state.locationData.latitude && state.locationData.longitude) {
        setPosition([state.locationData.latitude, state.locationData.longitude]);
      }
    }
  }, [state.locationData, hasLoadedDraft]);

  // Set current step when component mounts
  useEffect(() => {
    if (actionsRef.current.setCurrentStep) {
      actionsRef.current.setCurrentStep('location-confirmation');
    }
  }, []);

  // Sync initial location data with context (from navigation state or default)
  useEffect(() => {
    if (locationData && (locationData.country || locationData.city || locationData.latitude)) {
      const locationWithCoords = {
        ...locationData,
        latitude: position[0],
        longitude: position[1]
      };
      console.log('Syncing location data with context:', locationWithCoords);
      actionsRef.current.updateLocationData(locationWithCoords);
    }
  }, []); // Only run once on mount

  // Initialize location on component mount if no data is provided
  useEffect(() => {
    const initializeLocation = async () => {
      // Only initialize if we don't have location data from the previous page
      if (!location.state?.locationData || !locationData.country) {
        const [lat, lng] = position;
        
        try {
          // Try BigDataCloud first as it's CORS-enabled and reliable
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          );
          const data = await response.json();
          
          if (data && data.countryName) {
            setLocationData(prev => ({
              ...prev,
              country: data.countryName ? `${data.countryName} - ${data.countryCode}` : '',
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
      }
    };

    initializeLocation();
  }, []);

  // Handle map click to reposition marker
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    setPosition([lat, lng]);

    // Use the same reliable geocoding services as Location.jsx
    const geocodingServices = [
      // Service 1: BigDataCloud (CORS-enabled)
      async () => {
        console.log('Trying BigDataCloud...');
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        const data = await response.json();
        console.log('BigDataCloud response:', data);
        
        if (data && (data.locality || data.city || data.countryName)) {
          // Map to proper address structure with actual country detected
          
          // Construct street address from available data
          let streetAddress = '';
          if (data.localityInfo?.informative) {
            // Try to get the most specific street information
            const streetInfo = data.localityInfo.informative.find(item => 
              item.description?.includes('road') || 
              item.description?.includes('street') ||
              item.name
            );
            streetAddress = streetInfo?.name || '';
          }
          if (!streetAddress && data.locality) {
            streetAddress = data.locality;
          }
          
          return {
            street: streetAddress,
            building: '',
            barangay: data.localityInfo?.administrative?.[4]?.name || data.localityInfo?.administrative?.[3]?.name || '',
            city: data.city || data.localityInfo?.administrative?.[2]?.name || data.localityInfo?.administrative?.[1]?.name || '',
            zipCode: data.postcode || '',
            province: data.principalSubdivision && data.principalSubdivision !== 'region' ? data.principalSubdivision :
                     (data.localityInfo?.administrative?.[1]?.name && data.localityInfo.administrative[1].name !== 'region') ? data.localityInfo.administrative[1].name :
                     (data.localityInfo?.administrative?.[0]?.name && data.localityInfo.administrative[0].name !== 'region') ? data.localityInfo.administrative[0].name : '',
            country: data.countryName ? `${data.countryName} - ${data.countryCode}` : '',
          };
        }
        return null;
      },
      
      // Service 2: BigDataCloud
      async () => {
        console.log('Trying BigDataCloud...');
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        const data = await response.json();
        console.log('BigDataCloud response:', data);
        
        if (data && (data.locality || data.city || data.countryName)) {
          return {
            street: data.locality || data.localityInfo?.informative?.[0]?.name || '',
            building: '',
            barangay: data.localityInfo?.administrative?.[4]?.name || data.localityInfo?.administrative?.[3]?.name || '',
            city: data.city || data.localityInfo?.administrative?.[2]?.name || '',
            zipCode: data.postcode || '',
            province: data.principalSubdivision || data.localityInfo?.administrative?.[1]?.name || '',
            country: data.countryName ? `${data.countryName} - ${data.countryCode}` : '',
          };
        }
        return null;
      }
    ];

    // Try each service until one succeeds
    for (let i = 0; i < geocodingServices.length; i++) {
      try {
        const result = await geocodingServices[i]();
        if (result && Object.values(result).some(val => val && val.trim())) {
          console.log(`Service ${i + 1} succeeded:`, result);
          setLocationData(prev => ({
            ...prev,
            ...result
          }));
          return; // Success, exit function
        }
      } catch (error) {
        console.log(`Service ${i + 1} failed:`, error);
        continue; // Try next service
      }
    }
    
    // All services failed, use smart fallback
    console.log('All geocoding services failed, using coordinates fallback');
    setLocationData(prev => ({
      ...prev,
      street: `Location at ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
      building: '',
      barangay: '',
      city: 'Unknown City',
      zipCode: '',
      province: 'Unknown Province',
      country: 'Unknown Country',
    }));
  };

  // Handle marker drag
  const handleMarkerDragEnd = async (e) => {
    const { lat, lng } = e.target.getLatLng();
    setPosition([lat, lng]);
    
    // Update context with new coordinates immediately
    const updatedLocation = {
      ...locationData,
      latitude: lat,
      longitude: lng
    };
    actionsRef.current.updateLocationData(updatedLocation);

    // Use the same reliable geocoding services as Location.jsx
    const geocodingServices = [
      // Service 1: BigDataCloud (CORS-enabled)
      async () => {
        console.log('Trying BigDataCloud (drag)...');
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        const data = await response.json();
        console.log('BigDataCloud response (drag):', data);
        
        if (data && (data.locality || data.city || data.countryName)) {
          // Map to proper address structure with actual country detected
          
          // Construct street address from available data
          let streetAddress = '';
          if (data.localityInfo?.informative) {
            // Try to get the most specific street information
            const streetInfo = data.localityInfo.informative.find(item => 
              item.description?.includes('road') || 
              item.description?.includes('street') ||
              item.name
            );
            streetAddress = streetInfo?.name || '';
          }
          if (!streetAddress && data.locality) {
            streetAddress = data.locality;
          }
          
          return {
            street: streetAddress,
            building: '',
            barangay: data.localityInfo?.administrative?.[4]?.name || data.localityInfo?.administrative?.[3]?.name || '',
            city: data.city || data.localityInfo?.administrative?.[2]?.name || data.localityInfo?.administrative?.[1]?.name || '',
            zipCode: data.postcode || '',
            province: data.principalSubdivision && data.principalSubdivision !== 'region' ? data.principalSubdivision :
                     (data.localityInfo?.administrative?.[1]?.name && data.localityInfo.administrative[1].name !== 'region') ? data.localityInfo.administrative[1].name :
                     (data.localityInfo?.administrative?.[0]?.name && data.localityInfo.administrative[0].name !== 'region') ? data.localityInfo.administrative[0].name : '',
            country: data.countryName ? `${data.countryName} - ${data.countryCode}` : '',
          };
        }
        return null;
      }
    ];

    // Try each service until one succeeds
    for (let i = 0; i < geocodingServices.length; i++) {
      try {
        const result = await geocodingServices[i]();
        if (result && Object.values(result).some(val => val && val.trim())) {
          console.log(`Service ${i + 1} succeeded (drag):`, result);
          setLocationData(prev => ({
            ...prev,
            ...result
          }));
          return; // Success, exit function
        }
      } catch (error) {
        console.log(`Service ${i + 1} failed (drag):`, error);
        continue; // Try next service
      }
    }
    
    // All services failed, use smart fallback
    console.log('All geocoding services failed (drag), using coordinates fallback');
    setLocationData(prev => ({
      ...prev,
      street: `Location at ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
      building: '',
      barangay: '',
      city: 'Unknown City',
      zipCode: '',
      province: 'Unknown Province',
      country: 'Unknown Country',
    }));
  };

  // Format the display address
  const formatAddress = () => {
    const parts = [];
    
    if (locationData.unit) parts.push(locationData.unit);
    if (locationData.building) parts.push(locationData.building);
    if (locationData.street) parts.push(locationData.street);
    if (locationData.barangay) parts.push(locationData.barangay);
    if (locationData.city) parts.push(locationData.city);
    if (locationData.zipCode) parts.push(locationData.zipCode);
    if (locationData.province) parts.push(locationData.province);
    if (locationData.country) parts.push(locationData.country);
    
    return parts.filter(part => part && part.trim()).join(', ');
  };

  const displayAddress = formatAddress() || 'Address not available';

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
      // Set current step before saving so "Continue Editing" returns to this page
      if (actionsRef.current.setCurrentStep) {
        console.log('LocationConfirmation: Setting currentStep to location-confirmation');
        actionsRef.current.setCurrentStep('location-confirmation');
      }
      
      // Ensure location data is up to date in context
      const currentLocationData = {
        ...locationData,
        latitude: position[0],
        longitude: position[1]
      };
      
      console.log('Updating context with:', currentLocationData);
      actionsRef.current.updateLocationData(currentLocationData);
      
      // Override the saveDraft to ensure currentStep is set to location-confirmation
      if (actions.saveDraft) {
        console.log('LocationConfirmation: Calling custom saveDraft with forced currentStep');
        
        // Create modified state data with forced currentStep
        const { user, isLoading, ...dataToSave } = state;
        dataToSave.currentStep = 'location-confirmation'; // Force the currentStep
        dataToSave.locationData = currentLocationData; // Ensure latest location data
        
        console.log('LocationConfirmation: Data to save with forced currentStep:', dataToSave);
        
        // Use context saveDraft to ensure only one draft per session
        const draftId = await actions.saveDraft();
        
        // Navigate to dashboard
        navigate('/host/hostdashboard', { 
          state: { 
            message: 'Draft saved successfully!',
            draftSaved: true 
          }
        });
      } else {
        // Fallback to normal save
        await handleSaveAndExit();
      }
      
    } catch (error) {
      console.error('Error in LocationConfirmation save:', error);
      alert('Failed to save progress: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b">
        <div className="py-4 px-8 flex justify-between items-center">
          <svg viewBox="0 0 32 32" className="h-8 w-8">
            <path d="m16 1c2.008 0 3.978.378 5.813 1.114 1.837.736 3.525 1.798 4.958 3.138 1.433 1.34 2.56 2.92 3.355 4.628.795 1.709 1.2 3.535 1.2 5.394 0 1.859-.405 3.685-1.2 5.394-.795 1.708-1.922 3.288-3.355 4.628-1.433 1.34-3.121 2.402-4.958 3.138-1.835.736-3.805 1.114-5.813 1.114s-3.978-.378-5.813-1.114c-1.837-.736-3.525-1.798-4.958-3.138-1.433-1.34-2.56-2.92-3.355-4.628-.795-1.709-1.2-3.535-1.2-5.394 0-1.859.405-3.685 1.2-5.394.795-1.708 1.922-3.288 3.355-4.628 1.433-1.34 3.121-2.402 4.958-3.138 1.835-.736 3.805-1.114 5.813-1.114z" fill="rgb(255, 56, 92)"/>
          </svg>
          <div className="flex items-center gap-6">
            <button className="font-medium text-sm hover:underline">Questions?</button>
            <button 
              onClick={handleSaveAndExitClick}
              disabled={state.isLoading}
              className="font-medium text-sm hover:underline disabled:opacity-50"
            >
              {state.isLoading ? 'Saving...' : 'Save & exit'}
            </button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="h-1 w-full flex space-x-2">
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1"></div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-[640px] mx-auto">
          <h1 className="text-[32px] font-medium text-gray-900 mb-4">
            Is the pin in the right spot?
          </h1>
          <p className="text-gray-600 mb-8">
            Your address is only shared with guests after they've made a reservation.
          </p>

          {/* Address Display */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-medium text-sm">
                {displayAddress}
              </p>
            </div>
          </div>

          {/* Map */}
          <div className="rounded-lg overflow-hidden border border-gray-200 h-[400px] relative">
            <MapContainer
              center={position}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              doubleClickZoom={true}
              scrollWheelZoom={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker 
                position={position}
                draggable={true}
                eventHandlers={{
                  dragend: handleMarkerDragEnd
                }}
              />
              <MapUpdater center={position} onMapClick={handleMapClick} />
            </MapContainer>
            
            {/* Map Instructions Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium">
              Drag the map to reposition the pin
            </div>
          </div>

          {/* Map Controls Info */}
          <div className="mt-4 text-center">
            <p className="text-gray-600 text-sm">
              Click anywhere on the map or drag the blue pin to adjust your location
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/location')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className="bg-black text-white hover:bg-gray-800 rounded-lg px-8 py-3.5 text-base font-medium"
                onClick={() => {
                  // Navigate to property basics with location data
                  navigate('/pages/property-basics', { 
                    state: { 
                      ...location.state,
                      locationData, 
                      position,
                      confirmedLocation: true 
                    } 
                  });
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LocationConfirmation;