import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { DragEndEvent } from 'leaflet';

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
  const [selectedLocation, setSelectedLocation] = useState({
    country: '',
    unit: '',
    building: '',
    street: '',
    barangay: '',
    city: '',
    zipCode: '',
    province: '',
    showPreciseLocation: false
  });
  const [position, setPosition] = useState([14.5995, 120.9842]); // Default to Manila, Philippines

  // Initialize location on component mount
  React.useEffect(() => {
    const initializeLocation = async () => {
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
        // Fallback to Philippines
        setSelectedLocation(prev => ({
          ...prev,
          country: 'Philippines - PH'
        }));
      }
    };

    initializeLocation();
  }, []);

  const handleLocationChange = (field, value) => {
    setSelectedLocation(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Add reverse geocoding function with multiple reliable services
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    console.log('Map clicked at:', lat, lng);
    setPosition([lat, lng]);

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
            <button className="font-medium text-sm hover:underline">Save & exit</button>
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
                value={selectedLocation.country}
                onChange={(e) => handleLocationChange('country', e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                readOnly
              />
            </div>

            {/* Unit/Level */}
            <input
              type="text"
              placeholder="Unit, level, etc. (if applicable)"
              value={selectedLocation.unit}
              onChange={(e) => handleLocationChange('unit', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />

            {/* Building Name */}
            <input
              type="text"
              placeholder="Building name (if applicable)"
              value={selectedLocation.building}
              onChange={(e) => handleLocationChange('building', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />

            {/* Street Address */}
            <input
              type="text"
              placeholder="Street address"
              value={selectedLocation.street}
              onChange={(e) => handleLocationChange('street', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />

            {/* Barangay */}
            <input
              type="text"
              placeholder="Barangay / district (if applicable)"
              value={selectedLocation.barangay}
              onChange={(e) => handleLocationChange('barangay', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />

            {/* City */}
            <input
              type="text"
              placeholder="City / municipality"
              value={selectedLocation.city}
              onChange={(e) => handleLocationChange('city', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />

            {/* ZIP Code */}
            <input
              type="text"
              placeholder="ZIP code"
              value={selectedLocation.zipCode}
              onChange={(e) => handleLocationChange('zipCode', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />

            {/* Province */}
            <input
              type="text"
              placeholder="Province"
              value={selectedLocation.province}
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
                  checked={selectedLocation.showPreciseLocation}
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
                onClick={() => navigate('/pages/location-confirmation', { 
                  state: { 
                    ...location.state,
                    locationData: selectedLocation, 
                    position 
                  } 
                })}
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