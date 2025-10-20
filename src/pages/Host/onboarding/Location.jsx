import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { DragEndEvent } from 'leaflet';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit';
import { auth } from '@/lib/firebase';

// Fix marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map position updater component
function MapUpdater({ center, onClick }) {
  const map = useMap();
  
  React.useEffect(() => {
    map.on('click', onClick);
    
    return () => {
      map.off('click', onClick);
    };
  }, [map, onClick]);

  // Only update map view when center actually changes and it's different from current center
  React.useEffect(() => {
    const currentCenter = map.getCenter();
    const [lat, lng] = center;
    
    // Only pan to new location if it's significantly different
    if (Math.abs(currentCenter.lat - lat) > 0.001 || Math.abs(currentCenter.lng - lng) > 0.001) {
      map.panTo([lat, lng]);
    }
  }, [map, center]);

  return null;
}

const Location = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use OnboardingContext for proper draft management
  let contextData;
  try {
    contextData = useOnboarding();
  } catch (error) {
    console.error('OnboardingContext error:', error);
    contextData = {
      state: { locationData: {}, isLoading: false },
      actions: { 
        updateLocationData: () => {},
        saveAndExit: () => Promise.reject(new Error('Context not available'))
      }
    };
  }
  
  const { state, actions } = contextData;
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);
  const [isSaving, setIsSaving] = useState(false);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  
  const [selectedLocation, setSelectedLocation] = useState(() => {
    const defaultLocation = {
      country: '',
      unit: '',
      building: '',
      street: '',
      barangay: '',
      city: '',
      zipCode: '',
      province: '',
      showPreciseLocation: false,
      latitude: null,
      longitude: null
    };
    
    // Merge with state data if available, ensuring no undefined values
    if (state.locationData && typeof state.locationData === 'object') {
      const mergedLocation = { ...defaultLocation, ...state.locationData };
      
      // Ensure string properties are always strings (not undefined or null)
      Object.keys(mergedLocation).forEach(key => {
        if (typeof defaultLocation[key] === 'string' && 
            (mergedLocation[key] === null || mergedLocation[key] === undefined)) {
          mergedLocation[key] = '';
        }
      });
      
      return mergedLocation;
    }
    
    return defaultLocation;
  });
  const [position, setPosition] = useState([14.5995, 120.9842]); // Default to Manila, Philippines

  // Helper function to safely get input values (always returns a string)
  const getInputValue = (property) => {
    const value = selectedLocation[property];
    return (value !== null && value !== undefined) ? String(value) : '';
  };

  // Helper function to safely get boolean values
  const getBooleanValue = (property) => {
    const value = selectedLocation[property];
    return Boolean(value);
  };

  // Check if we're continuing from a draft
  useEffect(() => {
    const loadDraftFromState = async () => {
      // Only load draft if user is authenticated and we have a draftId
      if (location.state?.draftId && !state.draftId && !state.isLoading && state.user) {
        try {
          console.log('Loading draft in Location:', location.state.draftId);
          await actionsRef.current.loadDraft(location.state.draftId);
        } catch (error) {
          console.error('Error loading draft:', error);
        }
      } else if (location.state?.draftId && !state.user) {
        console.log('Location: Cannot load draft - user not authenticated yet');
      }
    };

    loadDraftFromState();
  }, [location.state?.draftId, state.draftId, state.isLoading, state.user]);

  // Update selectedLocation when state changes (after loading draft)
  useEffect(() => {
    console.log('Location: state.locationData changed:', state.locationData);
    
    if (state.locationData && typeof state.locationData === 'object') {
      // Ensure all required properties exist with default values to prevent controlled/uncontrolled input issues
      const defaultLocation = {
        country: '',
        unit: '',
        building: '',
        street: '',
        barangay: '',
        city: '',
        zipCode: '',
        province: '',
        showPreciseLocation: false,
        latitude: null,
        longitude: null
      };
      
      // Merge loaded data with defaults, ensuring no undefined values
      const mergedLocation = { ...defaultLocation };
      
      // Carefully merge each property to ensure proper types
      Object.keys(state.locationData).forEach(key => {
        if (key in defaultLocation) {
          const value = state.locationData[key];
          
          // Handle string properties
          if (typeof defaultLocation[key] === 'string') {
            mergedLocation[key] = (value !== null && value !== undefined) ? String(value) : '';
          }
          // Handle boolean properties
          else if (typeof defaultLocation[key] === 'boolean') {
            mergedLocation[key] = Boolean(value);
          }
          // Handle other properties (latitude, longitude)
          else {
            mergedLocation[key] = value;
          }
        }
      });
      
      console.log('Location: Setting merged location:', mergedLocation);
      setSelectedLocation(mergedLocation);
      
      if (state.locationData.latitude && state.locationData.longitude) {
        setPosition([state.locationData.latitude, state.locationData.longitude]);
      }
    }
  }, [state.locationData]);

  // Initialize location on component mount
  const [hasInitialized, setHasInitialized] = useState(false);

  // Set current step when component mounts
  useEffect(() => {
    if (actionsRef.current.setCurrentStep) {
      actionsRef.current.setCurrentStep('location');
    }
  }, []);


  
  React.useEffect(() => {
    if (hasInitialized) return; // Prevent multiple initializations
    
    const initializeLocation = async () => {
      const [lat, lng] = position;
      
      try {
        // Try BigDataCloud first as it's CORS-enabled and reliable
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        const data = await response.json();
        
        if (data && data.countryName) {
          const locationData = {
            country: data.countryName ? `${data.countryName} - ${data.countryCode}` : '',
            city: data.city || data.localityInfo?.administrative?.[2]?.name || data.localityInfo?.administrative?.[1]?.name || '',
            province: data.principalSubdivision && data.principalSubdivision !== 'region' ? data.principalSubdivision :
                     (data.localityInfo?.administrative?.[1]?.name && data.localityInfo.administrative[1].name !== 'region') ? data.localityInfo.administrative[1].name :
                     (data.localityInfo?.administrative?.[0]?.name && data.localityInfo.administrative[0].name !== 'region') ? data.localityInfo.administrative[0].name : '',
            street: data.locality || data.localityInfo?.informative?.[0]?.name || '',
            barangay: data.localityInfo?.administrative?.[4]?.name || data.localityInfo?.administrative?.[3]?.name || '',
            zipCode: data.postcode || '',
            building: '',
            unit: '',
            showPreciseLocation: false,
            latitude: lat,
            longitude: lng
          };
          
          setSelectedLocation(prev => ({ ...prev, ...locationData }));
          setHasInitialized(true);
          return;
        }
      } catch (error) {
        console.log('Failed to initialize location:', error);
        // Fallback to Philippines
        setSelectedLocation(prev => ({
          ...prev,
          country: 'Philippines - PH'
        }));
        setHasInitialized(true);
      }
    };

    initializeLocation();
  }, [hasInitialized, position]);

  const handleLocationChange = (field, value) => {
    const updatedLocation = {
      ...selectedLocation,
      [field]: value,
      latitude: position[0],
      longitude: position[1]
    };
    
    setSelectedLocation(updatedLocation);
    
    // Also update the context in real-time
    actionsRef.current.updateLocationData(updatedLocation);
  };

  const handleSaveAndExitClick = async () => {
    if (isSaving) return; // Prevent double clicks
    
    console.log('Location Save & Exit clicked!'); // Debug log
    console.log('Current state:', state); // Debug log
    console.log('Selected location:', selectedLocation); // Debug log
    console.log('Actions available:', actions); // Debug log
    
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    console.log('Current user:', currentUser);
    
    if (!currentUser) {
      alert('Please log in to save your progress.');
      navigate('/login');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Ensure location data is saved to context before saving draft
      const locationWithCoordinates = {
        ...selectedLocation,
        latitude: position[0],
        longitude: position[1]
      };
      
      console.log('Updating location data before save:', locationWithCoordinates);
      actions.updateLocationData(locationWithCoordinates);
      
      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Set current step to location so "Continue Editing" returns here
      if (actions.setCurrentStep) {
        console.log('Location: Setting currentStep to location');
        actions.setCurrentStep('location');
      }
      
      // Use custom save logic like other pages to ensure currentStep is preserved
      if (actions.saveDraft) {
        console.log('Location: Calling custom saveDraft with forced currentStep');
        
        // Create modified state data with forced currentStep and location data
        const { user, isLoading, ...dataToSave } = state;
        dataToSave.currentStep = 'location'; // Force the currentStep
        dataToSave.locationData = locationWithCoordinates; // Ensure location data is saved
        
        console.log('Location: Data to save with forced currentStep and location data:', dataToSave);
        
        // Import the draftService directly and save with our custom data
        const { saveDraft } = await import('@/pages/Host/services/draftService');
        const draftId = await saveDraft(dataToSave, state.draftId);
        
        // Update the draftId in context
        if (actions.setDraftId) {
          actions.setDraftId(draftId);
        }
        
        // Navigate to dashboard
        navigate('/host/hostdashboard', { 
          state: { 
            message: 'Draft saved successfully!',
            draftSaved: true 
          }
        });
      } else {
        // Fallback to normal handleSaveAndExit
        await handleSaveAndExit();
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    try {
      // Update location data in context before navigating
      const locationWithCoordinates = {
        ...selectedLocation,
        latitude: position[0],
        longitude: position[1]
      };
      
      await actions.updateLocationData(locationWithCoordinates);
      
      navigate('/pages/location-confirmation', { 
        state: { 
          ...location.state,
          locationData: locationWithCoordinates, 
          position 
        } 
      });
    } catch (error) {
      console.error('Error saving location data:', error);
      // Still navigate even if save fails
      navigate('/pages/location-confirmation', { 
        state: { 
          ...location.state,
          locationData: { ...selectedLocation, latitude: position[0], longitude: position[1] }, 
          position 
        } 
      });
    }
  };

  // Add reverse geocoding function with multiple reliable services
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    console.log('Map clicked at:', lat, lng);
    setPosition([lat, lng]);
    
    // Update context with new coordinates
    const updatedLocation = {
      ...selectedLocation,
      latitude: lat,
      longitude: lng
    };
    actionsRef.current.updateLocationData(updatedLocation);

    // Try multiple geocoding services in order of preference
    const geocodingServices = [
      // Service 1: BigDataCloud (free, CORS-enabled, no API key required)
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
      
      // Service 2: LocationIQ (CORS-enabled, backup service)
      async () => {
        console.log('Trying alternative geocoding...');
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode?latitude=${lat}&longitude=${lng}&key=bdc_geocoding`
        );
        const data = await response.json();
        console.log('Alternative geocoding response:', data);
        
        if (data && !data.error) {
          return {
            street: data.locality || '',
            building: '',
            barangay: '',
            city: data.city || data.principalSubdivision || '',
            zipCode: data.postcode || '',
            province: data.principalSubdivision || '',
            country: data.countryName ? `${data.countryName} - ${data.countryCode}` : '',
          };
        }
        return null;
      },
    ];

    // Try each service until one succeeds
    for (let i = 0; i < geocodingServices.length; i++) {
      try {
        const result = await geocodingServices[i]();
        if (result && Object.values(result).some(val => val && val.trim())) {
          console.log(`Service ${i + 1} succeeded:`, result);
          setSelectedLocation(prev => ({
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
    
    // All services failed, use smart fallback with location description
    console.log('All geocoding services failed, using coordinates fallback');
    setSelectedLocation(prev => ({
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

  const handleMarkerDragEnd = async (e) => {
    const { lat, lng } = e.target.getLatLng();
    console.log('Marker dragged to:', lat, lng);
    setPosition([lat, lng]);
    
    // Update context with new coordinates
    const updatedLocation = {
      ...selectedLocation,
      latitude: lat,
      longitude: lng
    };
    actionsRef.current.updateLocationData(updatedLocation);

    // Use the same reliable geocoding services
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
          setSelectedLocation(prev => ({
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
    setSelectedLocation(prev => ({
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
              className="font-medium text-sm hover:underline"
              disabled={state.isLoading || isSaving}
            >
              {state.isLoading || isSaving ? 'Saving...' : 'Save & exit'}
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
          <div className="h-full bg-gray-200 flex-1"></div>
          <div className="h-full bg-gray-200 flex-1"></div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-[640px] mx-auto">
          <h1 className="text-[32px] font-medium text-gray-900 mb-4">
            Confirm your address
          </h1>
          <p className="text-gray-600 mb-8">
            Your address is only shared with guests after they've made a reservation.
          </p>

          <div className="space-y-6">
            {/* Country Selection */}
            <div className="relative">
              <input
                type="text"
                placeholder="Country"
                value={getInputValue('country')}
                onChange={(e) => handleLocationChange('country', e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                readOnly
              />
            </div>

            {/* Unit/Level */}
            <input
              type="text"
              placeholder="Unit, level, etc. (if applicable)"
              value={getInputValue('unit')}
              onChange={(e) => handleLocationChange('unit', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />

            {/* Building Name */}
            <input
              type="text"
              placeholder="Building name (if applicable)"
              value={getInputValue('building')}
              onChange={(e) => handleLocationChange('building', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />

            {/* Street Address */}
            <input
              type="text"
              placeholder="Street address"
              value={getInputValue('street')}
              onChange={(e) => handleLocationChange('street', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />

            {/* Barangay */}
            <input
              type="text"
              placeholder="Barangay / district (if applicable)"
              value={getInputValue('barangay')}
              onChange={(e) => handleLocationChange('barangay', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />

            {/* City */}
            <input
              type="text"
              placeholder="City / municipality"
              value={getInputValue('city')}
              onChange={(e) => handleLocationChange('city', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />

            {/* ZIP Code */}
            <input
              type="text"
              placeholder="ZIP code"
              value={getInputValue('zipCode')}
              onChange={(e) => handleLocationChange('zipCode', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />

            {/* Province */}
            <input
              type="text"
              placeholder="Province"
              value={getInputValue('province')}
              onChange={(e) => handleLocationChange('province', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />

            {/* Precise Location Toggle */}
            <div className="flex items-center justify-between py-4">
              <div>
                <h3 className="font-medium">Show your home's precise location</h3>
                <p className="text-gray-600 text-sm">
                  Make it clear to guests where your place is located. We'll only share your address after they've made a reservation.{' '}
                  <button className="text-black underline">Learn more</button>
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={getBooleanValue('showPreciseLocation')}
                  onChange={(e) => handleLocationChange('showPreciseLocation', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Map */}
            <div className="rounded-lg overflow-hidden border border-gray-200 h-[400px]">
              <MapContainer
                center={position}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                // Add these props to maintain zoom level
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
                <MapUpdater center={position} onClick={handleMapClick} />
              </MapContainer>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/privacy-type')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className={`rounded-lg px-8 py-3.5 text-base font-medium ${
                  selectedLocation.street && selectedLocation.city
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={handleContinue}
                disabled={!selectedLocation.street || !selectedLocation.city}
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

export default Location;