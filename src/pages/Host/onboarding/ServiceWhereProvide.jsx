import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { MapPin, X, Search, Check } from "lucide-react";

const ServiceWhereProvide = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [travelToGuests, setTravelToGuests] = useState(false);
  const [guestsComeToYou, setGuestsComeToYou] = useState(false);
  const [serviceAreas, setServiceAreas] = useState([]);
  const [showServiceAreaModal, setShowServiceAreaModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [savedAddress, setSavedAddress] = useState(null);
  const [addressRemoved, setAddressRemoved] = useState(false);
  const [addressSelectedInModal, setAddressSelectedInModal] = useState(false);
  const originalAddressRef = useRef(null); // Store original address from draft/location state
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("service-where-provide");
    }
  }, [actions]);

  // Load saved selections from draft if available
  useEffect(() => {
    const loadSelections = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            if (data.serviceTravelToGuests !== undefined) setTravelToGuests(data.serviceTravelToGuests);
            if (data.serviceGuestsComeToYou !== undefined) setGuestsComeToYou(data.serviceGuestsComeToYou);
            if (data.serviceAreas) setServiceAreas(data.serviceAreas);
            // Load saved address
            let addressData = null;
            if (data.serviceCountry || data.serviceStreetAddress || data.serviceCity) {
              addressData = {
                country: data.serviceCountry || location.state?.serviceCountry || "",
                streetAddress: data.serviceStreetAddress || location.state?.serviceStreetAddress || "",
                unit: data.serviceUnit || location.state?.serviceUnit || "",
                city: data.serviceCity || location.state?.serviceCity || "",
                state: data.serviceState || location.state?.serviceState || "",
                zipCode: data.serviceZipCode || location.state?.serviceZipCode || "",
              };
            } else if (location.state?.serviceCountry || location.state?.serviceStreetAddress || location.state?.serviceCity) {
              addressData = {
                country: location.state?.serviceCountry || "",
                streetAddress: location.state?.serviceStreetAddress || "",
                unit: location.state?.serviceUnit || "",
                city: location.state?.serviceCity || "",
                state: location.state?.serviceState || "",
                zipCode: location.state?.serviceZipCode || "",
              };
            }
            
            // Always store original address for modal use
            if (addressData) {
              originalAddressRef.current = addressData;
              if (!addressRemoved) {
                setSavedAddress(addressData);
                // Auto-select "Guests come to you" if address exists and no other option is selected
                if (addressData.streetAddress || addressData.city) {
                  if (!data.serviceTravelToGuests && !data.serviceGuestsComeToYou) {
                    setGuestsComeToYou(true);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error loading selections from draft:", error);
        }
      }
    };
    loadSelections();
  }, [
    state.draftId || null, 
    location.state?.draftId || null
  ]);


  // Helper function to fetch from Nominatim with proxy fallback
  const fetchWithProxy = async (nominatimUrl) => {
    const url = new URL(nominatimUrl);
    const proxyPath = `/api/nominatim${url.pathname}${url.search}`;
    
    try {
      const response = await fetch(proxyPath, {
        headers: {
          'Accept': 'application/json',
        },
        signal: abortControllerRef.current?.signal,
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (proxyError) {
      if (proxyError.name === 'AbortError') {
        throw proxyError;
      }
      console.log('Vite proxy failed, trying alternatives...', proxyError.message);
    }
    
    try {
      const response = await fetch(nominatimUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Getaways/1.0 (contact: info@getaways.com)',
          'Referer': window.location.origin
        },
        signal: abortControllerRef.current?.signal,
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (directError) {
      if (directError.name === 'AbortError') {
        throw directError;
      }
      console.log('Direct request failed, trying public proxies...', directError.message);
    }
    
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(nominatimUrl)}`;
    let timeoutId = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 5000);
      
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
      
      const proxyData = await response.json();
      const contents = proxyData.contents || '[]';
      let data;
      try {
        data = typeof contents === 'string' ? JSON.parse(contents) : contents;
      } catch (parseError) {
        data = typeof contents === 'string' ? JSON.parse(contents) : contents;
      }
      
      if (data && (Array.isArray(data) || typeof data === 'object')) {
        if (timeoutId) clearTimeout(timeoutId);
        return data;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Proxy timed out');
      } else {
        console.log('Proxy failed:', error.message);
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
    
    throw new Error('All geocoding methods failed');
  };

  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (query.trim().length < 2) {
      setLocationSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

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
          if (error.name === 'AbortError') {
            return;
          }
          console.error('Error fetching location suggestions:', error);
          results = [];
        }
        
        const formattedSuggestions = results
          .map(result => ({
            display_name: result.display_name || '',
            place_id: result.place_id,
            lat: result.lat,
            lon: result.lon,
            address: result.address || {},
          }))
          .filter((item, index, self) => 
            index === self.findIndex(t => t.place_id === item.place_id)
          )
          .slice(0, 10);
        
        setLocationSuggestions(formattedSuggestions);
        setIsSearching(false);
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching location suggestions:', error);
        setLocationSuggestions([]);
        setIsSearching(false);
      }
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSelectLocation = (suggestion) => {
    const locationData = {
      id: suggestion.place_id || Date.now().toString(),
      display_name: suggestion.display_name,
      place_id: suggestion.place_id,
      lat: suggestion.lat,
      lon: suggestion.lon,
    };
    
    // Check if location already exists
    if (!serviceAreas.some(area => area.place_id === suggestion.place_id)) {
      setServiceAreas([...serviceAreas, locationData]);
    }
    setSearchQuery("");
    setLocationSuggestions([]);
  };

  const handleRemoveArea = (areaId) => {
    setServiceAreas(serviceAreas.filter(area => area.id !== areaId));
  };

  const handleSaveServiceAreas = async () => {
    // Update travelToGuests based on whether we have locations
    setTravelToGuests(serviceAreas.length > 0);
    
    const draftId = state.draftId || location.state?.draftId;
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          "data.serviceAreas": serviceAreas,
          "data.serviceTravelToGuests": serviceAreas.length > 0,
          lastModified: new Date(),
        });
        console.log("✅ Updated service areas in draft");
      } catch (error) {
        console.error("Error updating draft:", error);
      }
    }
    setShowServiceAreaModal(false);
    setSearchQuery("");
    setLocationSuggestions([]);
  };

  const handleCancelServiceAreaModal = () => {
    // If no service areas are saved, ensure travelToGuests is false
    if (serviceAreas.length === 0) {
      setTravelToGuests(false);
    }
    setShowServiceAreaModal(false);
    setSearchQuery("");
    setLocationSuggestions([]);
  };

  const handleToggleTravelToGuests = () => {
    // Open modal to set service area
    setShowServiceAreaModal(true);
  };

  const handleToggleGuestsComeToYou = () => {
    // If address exists and is displayed, just toggle it directly (no modal)
    if (savedAddress && (savedAddress.streetAddress || savedAddress.city)) {
      if (!guestsComeToYou) {
        // Selecting "Guests come to you"
        setGuestsComeToYou(true);
        // Update Firebase draft
        const draftId = state.draftId || location.state?.draftId;
        if (draftId) {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          updateDoc(draftRef, {
            "data.serviceGuestsComeToYou": true,
            lastModified: new Date(),
          });
        }
      } else {
        // Deselecting
        setGuestsComeToYou(false);
        const draftId = state.draftId || location.state?.draftId;
        if (draftId) {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          updateDoc(draftRef, {
            "data.serviceGuestsComeToYou": false,
            lastModified: new Date(),
          });
        }
      }
    } else {
      // No address displayed, open modal to select address
      setAddressSelectedInModal(false); // Reset selection when opening modal
      setShowAddressModal(true);
    }
  };

  const handleSaveAddress = async () => {
    if (!addressSelectedInModal) return; // Don't save if address not selected
    
    // Get address from draft and restore it if it was removed
    const addressFromDraft = getAddressFromDraft();
    if (addressFromDraft && (addressFromDraft.streetAddress || addressFromDraft.city)) {
      // Restore the address if it was removed
      setSavedAddress(addressFromDraft);
      setAddressRemoved(false);
    }
    
    // Confirm selection
    setGuestsComeToYou(true);
    const draftId = state.draftId || location.state?.draftId;
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          "data.serviceGuestsComeToYou": true,
          lastModified: new Date(),
        });
        console.log("✅ Updated guests come to you selection in draft");
      } catch (error) {
        console.error("Error updating draft:", error);
      }
    }
    setAddressSelectedInModal(false); // Reset selection
    setShowAddressModal(false);
  };

  const handleCancelAddressModal = () => {
    // Reset selection when canceling
    setAddressSelectedInModal(false);
    // If no address is saved, unselect the option
    if (!savedAddress || (!savedAddress.streetAddress && !savedAddress.city)) {
      setGuestsComeToYou(false);
    }
    setShowAddressModal(false);
  };

  // Get address from draft/location state (even if removed from display)
  const getAddressFromDraft = () => {
    // First check original address ref (from Firebase/location state)
    if (originalAddressRef.current) {
      return originalAddressRef.current;
    }
    // Try to get from location state
    if (location.state?.serviceCountry || location.state?.serviceStreetAddress || location.state?.serviceCity) {
      return {
        country: location.state?.serviceCountry || "",
        streetAddress: location.state?.serviceStreetAddress || "",
        unit: location.state?.serviceUnit || "",
        city: location.state?.serviceCity || "",
        state: location.state?.serviceState || "",
        zipCode: location.state?.serviceZipCode || "",
      };
    }
    // Fallback to savedAddress if available
    return savedAddress;
  };

  const handleRemoveAddress = async (e) => {
    e.stopPropagation(); // Prevent triggering the button's onClick
    setSavedAddress(null);
    setGuestsComeToYou(false);
    setAddressRemoved(true);
    
    const draftId = state.draftId || location.state?.draftId;
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          "data.serviceGuestsComeToYou": false,
          lastModified: new Date(),
        });
        console.log("✅ Removed address from guests come to you");
      } catch (error) {
        console.error("Error updating draft:", error);
      }
    }
  };

  // Shared function to save both options to Firebase
  const saveBothOptions = async () => {
    const draftId = state.draftId || location.state?.draftId;
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          "data.serviceTravelToGuests": travelToGuests,
          "data.serviceGuestsComeToYou": guestsComeToYou,
          "data.serviceAreas": serviceAreas,
          lastModified: new Date(),
        });
        console.log("✅ Saved both options to Firebase");
      } catch (error) {
        console.error("Error saving options to Firebase:", error);
        throw error;
      }
    }
  };

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Update context
    if (actions.setCurrentStep) {
      actions.setCurrentStep("service-details");
    }

    // Save both options to Firebase
    await saveBothOptions();

    // Update current step in Firebase
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          currentStep: "service-photos",
          lastModified: new Date(),
        });
        console.log("✅ Updated service where provide step in draft");
      } catch (error) {
        console.error("Error updating draft:", error);
      }
    }

    // Navigate to next page (service-photos)
    navigate("/pages/service-photos", {
      state: {
        draftId,
        category: "service",
        serviceCategory: location.state?.serviceCategory,
        serviceCity: location.state?.serviceCity,
        serviceYearsOfExperience: location.state?.serviceYearsOfExperience,
        serviceExperience: location.state?.serviceExperience,
        serviceDegree: location.state?.serviceDegree,
        serviceCareerHighlight: location.state?.serviceCareerHighlight,
        serviceProfiles: location.state?.serviceProfiles,
        serviceCountry: location.state?.serviceCountry,
        serviceStreetAddress: location.state?.serviceStreetAddress,
        serviceUnit: location.state?.serviceUnit,
        serviceState: location.state?.serviceState,
        serviceZipCode: location.state?.serviceZipCode,
        serviceTravelToGuests: travelToGuests,
        serviceGuestsComeToYou: guestsComeToYou,
        serviceAreas: serviceAreas,
      },
    });
  };

  const handleBack = () => {
    navigate("/pages/service-address", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        serviceCategory: location.state?.serviceCategory,
        serviceCity: location.state?.serviceCity,
        serviceYearsOfExperience: location.state?.serviceYearsOfExperience,
        serviceExperience: location.state?.serviceExperience,
        serviceDegree: location.state?.serviceDegree,
        serviceCareerHighlight: location.state?.serviceCareerHighlight,
        serviceProfiles: location.state?.serviceProfiles,
      },
    });
  };

  const canProceed = travelToGuests || guestsComeToYou;

  // Handle Save & Exit
  const handleSaveAndExit = async () => {
    try {
      const { auth } = await import("@/lib/firebase");
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("Please log in to save your progress.");
        navigate("/login");
        return;
      }

      await saveBothOptions();
      
      // Save currentStep
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          await updateDoc(draftRef, {
            currentStep: "service-where-provide", // Save CURRENT step
            lastModified: new Date(),
          });
          console.log("✅ ServiceWhereProvide: Draft saved successfully on Save & Exit");
        } catch (error) {
          console.error("Error saving currentStep:", error);
        }
      }
      
      navigate("/host/listings", {
        state: {
          scrollToDrafts: true,
          message: "Draft saved successfully!",
        },
      });
    } catch (error) {
      console.error("❌ Error saving draft:", error);
      alert("Failed to save. Please try again.");
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="service-where-provide" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto py-20 pt-32 pb-24">
        <div className="w-full max-w-2xl px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Where do you provide your service?
          </h1>
          <p className="text-gray-500 text-center mb-12 text-lg">
            Choose one or both.
          </p>

          <div className="space-y-4">
            {/* You travel to guests */}
            <button
              onClick={handleToggleTravelToGuests}
              className="w-full p-6 border-2 border-gray-200 rounded-xl text-left transition-all duration-200 hover:shadow-lg hover:border-gray-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      You travel to guests
                    </h3>
                    {travelToGuests && serviceAreas.length > 0 && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  {serviceAreas.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      Set your service area
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {serviceAreas.map((area) => (
                        <span
                          key={area.id}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                        >
                          <MapPin className="w-3 h-3" />
                          {area.display_name.split(',')[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>

            {/* Guests come to you */}
            <button
              onClick={handleToggleGuestsComeToYou}
              className="w-full p-6 border-2 border-gray-200 rounded-xl text-left transition-all duration-200 hover:shadow-lg hover:border-gray-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Guests come to you
                    </h3>
                    {guestsComeToYou && savedAddress && (savedAddress.streetAddress || savedAddress.city) && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  {savedAddress && (savedAddress.streetAddress || savedAddress.city) ? (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 relative">
                      <div
                        onClick={handleRemoveAddress}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        aria-label="Remove address"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRemoveAddress(e);
                          }
                        }}
                      >
                        <X className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 text-sm pr-6">
                        {savedAddress.streetAddress && (
                          <p className="text-gray-900 font-medium">{savedAddress.streetAddress}</p>
                        )}
                        {savedAddress.unit && (
                          <p className="text-gray-700">{savedAddress.unit}</p>
                        )}
                        <p className="text-gray-700">
                          {[savedAddress.city, savedAddress.state, savedAddress.zipCode].filter(Boolean).join(", ")}
                        </p>
                        {savedAddress.country && (
                          <p className="text-gray-600">{savedAddress.country}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Add your address
                    </p>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={canProceed}
      />

      {/* Service Area Modal */}
      {showServiceAreaModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={handleCancelServiceAreaModal}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 relative" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">What's your service area?</h2>
                <p className="text-sm text-gray-500 mt-1">You can add multiple locations.</p>
              </div>
              <button
                onClick={handleCancelServiceAreaModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Search Input */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="City, neighborhood, or ZIP code"
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                />
              </div>

              {/* Location Suggestions */}
              {isSearching && searchQuery.length >= 2 && (
                <div className="text-center py-4 text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <span className="ml-2">Searching...</span>
                </div>
              )}
              
              {!isSearching && locationSuggestions.length > 0 && (
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  {locationSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      onClick={() => handleSelectLocation(suggestion)}
                      className="w-full flex items-start gap-4 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-left"
                    >
                      <MapPin className="w-5 h-5 text-gray-700 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base text-gray-900 truncate">
                          {suggestion.display_name.split(',')[0]}
                        </div>
                        <div className="text-gray-600 text-sm leading-snug">
                          {suggestion.display_name.replace(suggestion.display_name.split(',')[0] + ',', '').trim()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!isSearching && searchQuery.length >= 2 && locationSuggestions.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No locations found. Try a different search.
                </div>
              )}

              {/* Selected Areas */}
              {serviceAreas.length > 0 && (
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Selected locations:</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {serviceAreas.map((area) => (
                      <div
                        key={area.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-900 truncate">{area.display_name}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveArea(area.id)}
                          className="ml-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between p-6 border-t">
              <button
                onClick={handleCancelServiceAreaModal}
                className="text-gray-900 font-medium hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveServiceAreas}
                disabled={serviceAreas.length === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  serviceAreas.length > 0
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Confirmation Modal */}
      {showAddressModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={handleCancelAddressModal}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 relative" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add your address</h2>
                <p className="text-sm text-gray-500 mt-1">Your address from the previous step.</p>
              </div>
              <button
                onClick={handleCancelAddressModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {(() => {
                const addressFromDraft = getAddressFromDraft();
                return addressFromDraft && (addressFromDraft.streetAddress || addressFromDraft.city) ? (
                  <button
                    onClick={() => setAddressSelectedInModal(!addressSelectedInModal)}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      addressSelectedInModal
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300 bg-gray-50"
                    }`}
                  >
                    <div className="space-y-1 text-sm">
                      {addressFromDraft.streetAddress && (
                        <p className="text-gray-900 font-medium">{addressFromDraft.streetAddress}</p>
                      )}
                      {addressFromDraft.unit && (
                        <p className="text-gray-700">{addressFromDraft.unit}</p>
                      )}
                      <p className="text-gray-700">
                        {[addressFromDraft.city, addressFromDraft.state, addressFromDraft.zipCode].filter(Boolean).join(", ")}
                      </p>
                      {addressFromDraft.country && (
                        <p className="text-gray-600">{addressFromDraft.country}</p>
                      )}
                    </div>
                  </button>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No address found. Please go back to add your address.</p>
                  </div>
                );
              })()}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between p-6 border-t">
              <button
                onClick={handleCancelAddressModal}
                className="text-gray-900 font-medium hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddress}
                disabled={!addressSelectedInModal}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  addressSelectedInModal
                    ? 'bg-primary text-white hover:bg-primary/90'
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

export default ServiceWhereProvide;
