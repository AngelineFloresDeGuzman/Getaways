import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { DragEndEvent } from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useOnboardingAutoSave, useOnboardingNavigation } from './hooks/useOnboardingAutoSave';
import OnboardingHeader from './components/OnboardingHeader';

// Fix marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function MapUpdater({ center, onClick }) {
  const map = useMap();
  useEffect(() => {
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [map, onClick]);
  useEffect(() => {
    const currentCenter = map.getCenter();
    const [lat, lng] = center;
    if (Math.abs(currentCenter.lat - lat) > 0.001 || Math.abs(currentCenter.lng - lng) > 0.001) {
      map.panTo([lat, lng]);
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
    level: '',
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
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    setPosition([lat, lng]);
    // Reverse geocode to fill building, unit, level, etc.
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
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
  };

  const handleSaveAndExit = () => {
    // TODO: Implement save and exit logic
    alert('Save & exit clicked');
  };

  const handleMarkerDragEnd = async (e) => {
    const { lat, lng } = e.target.getLatLng();
    setPosition([lat, lng]);
    // Reverse geocode to fill building, unit, level, etc.
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
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
  };

  const handleNext = () => {
    // TODO: Implement next step logic
    alert('Next clicked');
  };

  // Geocode address and update pin
  const geocodeAddress = async (query) => {
    if (!query) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const results = await response.json();
      if (results && results[0]) {
        setPosition([parseFloat(results[0].lat), parseFloat(results[0].lon)]);
        setSelectedLocation(prev => ({
          ...prev,
          latitude: parseFloat(results[0].lat),
          longitude: parseFloat(results[0].lon)
        }));
        setLocationFilled(true);
      }
    } catch {}
  };

  // Fetch suggestions as user types
  useEffect(() => {
    if (searchValue.length < 3) {
      setSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchValue)}&addressdetails=1&limit=5`);
        const results = await response.json();
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [searchValue]);

  // Handle search bar input
  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    setLocationFilled(false);
  };

  // When a suggestion is clicked
  const handleSuggestionClick = (suggestion) => {
    setSearchValue(suggestion.display_name);
    setPosition([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
    setLocationFilled(true);
    setSuggestions([]);
  };

  // Use current location
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        // Reverse geocode to get address
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await response.json();
          const addressString = data.display_name || '';
          setSearchValue(addressString);
          setSuggestions([]);
          setLocationFilled(true);
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
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await response.json();
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
  const canProceed = !!position;

  return (
  <div className="min-h-screen bg-white flex flex-col items-center" style={{ overflow: 'hidden', height: '100vh' }}>
      <OnboardingHeader />
      {/* Onboarding header text */}
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center mt-32">
  <h1 className="text-[32px] font-semibold text-gray-900 mb-2 text-center">Where's your place located?</h1>
  <p className="text-gray-600 mb-8 text-center">Your address is only shared with guests after they've made a reservation.</p>
  <div className="w-full mt-2 flex justify-center">
          <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ width: 520, height: 'calc(100vh - 320px)' }}>
            {/* Sticky search bar */}
            <div className="sticky top-0 left-0 w-full z-30 flex justify-center" style={{ pointerEvents: 'auto' }}>
              <form onSubmit={handleSearchSubmit} className="w-[90%] mt-6">
                <div className="flex flex-col gap-2 bg-white rounded-2xl shadow-lg p-2 w-full relative">
                  <div className="flex items-center border border-gray-300 rounded-2xl px-4 py-3 bg-white">
                    <span className="mr-2 text-xl">📍</span>
                    <input
                      type="text"
                      placeholder="Enter your address"
                      value={searchValue}
                      onChange={handleSearchChange}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                      className="flex-1 p-2 border-none focus:outline-none bg-transparent text-lg"
                      autoComplete="off"
                    />
                    {searchValue && (
                      <button type="button" onClick={() => setSearchValue('')} className="ml-2 text-gray-400 text-xl">✕</button>
                    )}
                  </div>
                  {searchFocused && (
                    <div className="mt-2 rounded-2xl shadow bg-white border border-gray-200 flex items-center px-4 py-3 cursor-pointer" onMouseDown={e => e.preventDefault()} onClick={handleUseCurrentLocation}>
                      <span className="mr-3 text-2xl">&#x1F4CD;</span>
                      <span className="text-gray-800 text-base">Use my current location</span>
                    </div>
                  )}
                  {suggestions.length > 0 && (
                    <ul className="absolute top-20 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-40 max-h-72 overflow-y-auto">
                      {suggestions.map((s, idx) => (
                        <li
                          key={s.place_id}
                          className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-100 border-b last:border-b-0"
                          onClick={() => handleSuggestionClick(s)}
                        >
                          <span className="text-xl mt-1">📍</span>
                          <div>
                            <div className="font-semibold text-base">{s.display_name.split(',')[0]}</div>
                            <div className="text-gray-600 text-sm">{s.display_name.replace(s.display_name.split(',')[0] + ',', '').trim()}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </form>
            </div>
            {/* Map below search bar */}
            <div className="w-full h-full">
              {/* Always show map, but only show pin/details if locationFilled */}
              <MapContainer
                center={position}
                zoom={15}
                style={{ height: '300px', width: '100%' }}
                zoomControl={true}
                doubleClickZoom={true}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {locationFilled && (
                  <Marker position={position}>
                    <Popup>
                      {searchValue || 'Current location'}
                    </Popup>
                  </Marker>
                )}
                <MapUpdater center={position} onClick={handleMapClick} />
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 w-full flex justify-between items-center px-16 py-6 bg-white border-t" style={{ zIndex: 20 }}>
        <button 
          onClick={() => navigate('/pages/privacytype')}
          className="text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-100"
        >
          Back
        </button>
        <button
          onClick={() => {
            if (canProceed) {
              navigate('/pages/locationconfirmation');
            }
          }}
          className={`px-8 py-3 rounded-lg text-white font-semibold ${canProceed ? 'bg-black hover:bg-gray-900' : 'bg-gray-300 cursor-not-allowed'}`}
          disabled={!canProceed}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Location;