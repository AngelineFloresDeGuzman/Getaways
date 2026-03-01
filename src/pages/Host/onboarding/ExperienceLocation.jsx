import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { MapPin, X, Search, Send } from "lucide-react";

// Category icons (reused from ExperienceCategorySelection)
const categoryIcons = {
  "art-and-design": (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* White classical bust sculpture */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-16 bg-gradient-to-b from-gray-100 to-gray-200 rounded-t-full shadow-sm">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-10 bg-gradient-to-b from-gray-50 to-gray-100 rounded-t-full"></div>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-400 rounded-full"></div>
      </div>
      {/* Framed painting with red flowers */}
      <div className="absolute right-1 bottom-1 w-14 h-14 bg-gradient-to-br from-amber-50 to-amber-100 rounded border-2 border-amber-200 shadow-sm">
        <div className="absolute inset-1 bg-gradient-to-br from-red-200 to-red-300 rounded"></div>
        <div className="absolute top-1 left-1 right-1 h-2 bg-red-400 rounded-t"></div>
        <div className="absolute bottom-1 left-1 right-1 h-1 bg-red-500 rounded-b"></div>
      </div>
    </div>
  ),
  "fitness-and-wellness": (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Rolled-up towel */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-8 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg shadow-sm transform rotate-12">
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-300 rounded-t"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400 rounded-b"></div>
      </div>
      {/* Water bottle */}
      <div className="absolute right-1 bottom-1 w-8 h-12 bg-blue-200 rounded-lg shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-3 bg-blue-300 rounded-t-lg"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400 rounded-b"></div>
      </div>
    </div>
  ),
  "food-and-drink": (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Bowl of pasta/noodles */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-10 bg-gradient-to-br from-amber-50 to-amber-100 rounded-full shadow-sm">
        <div className="absolute inset-1 bg-gradient-to-br from-yellow-100 to-amber-200 rounded-full"></div>
        {/* Noodles */}
        <div className="absolute top-2 left-2 right-2 bottom-2">
          <div className="w-full h-0.5 bg-amber-400 rounded-full transform rotate-12"></div>
          <div className="w-full h-0.5 bg-amber-400 rounded-full transform -rotate-12 mt-1"></div>
          <div className="w-full h-0.5 bg-amber-500 rounded-full transform rotate-45 mt-1"></div>
        </div>
      </div>
      {/* Fork */}
      <div className="absolute right-1 bottom-1 w-1 h-6 bg-gray-400 rounded"></div>
      {/* Small bowls */}
      <div className="absolute left-1 bottom-1 w-6 h-4 bg-gradient-to-br from-red-100 to-red-200 rounded-full shadow-sm">
        <div className="absolute inset-0.5 bg-red-300 rounded-full"></div>
      </div>
      <div className="absolute left-8 bottom-1 w-6 h-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full shadow-sm">
        <div className="absolute inset-0.5 bg-orange-300 rounded-full"></div>
      </div>
    </div>
  ),
  "history-and-culture": (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Arc de Triomphe-like structure */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-20">
        {/* Main arch */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-t-lg shadow-sm">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-8 bg-gradient-to-br from-amber-50 to-amber-100 rounded-t-lg"></div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-6 bg-gradient-to-br from-amber-200 to-amber-300 rounded-t-lg"></div>
        </div>
        {/* Top structure */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-8 bg-gradient-to-br from-amber-150 to-amber-250 rounded-t-lg shadow-sm"></div>
      </div>
    </div>
  ),
  "nature-and-outdoors": (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Landscape with hills, trees, and waterfall */}
      <div className="absolute inset-0">
        {/* Hills */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-br from-green-300 to-green-400 rounded-t-full"></div>
        <div className="absolute bottom-2 left-4 right-4 h-6 bg-gradient-to-br from-green-200 to-green-300 rounded-t-full"></div>
        {/* Trees */}
        <div className="absolute bottom-4 left-2 w-3 h-4 bg-green-600 rounded-t-full"></div>
        <div className="absolute bottom-4 right-2 w-3 h-4 bg-green-600 rounded-t-full"></div>
        {/* Waterfall */}
        <div className="absolute bottom-0 right-1/3 w-2 h-6 bg-gradient-to-b from-blue-300 to-blue-400 rounded-t"></div>
        {/* Water pool */}
        <div className="absolute bottom-0 right-1/3 -translate-x-1/2 w-4 h-2 bg-blue-400 rounded-full"></div>
      </div>
    </div>
  ),
};

// Category display names
const categoryDisplayNames = {
  "art-and-design": "Art and design",
  "fitness-and-wellness": "Fitness and wellness",
  "food-and-drink": "Food and drink",
  "history-and-culture": "History and culture",
  "nature-and-outdoors": "Nature and outdoors",
};

const ExperienceLocation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  const [city, setCity] = useState("");
  const [mainCategory, setMainCategory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("experience-location");
    }
  }, [actions]);

  // Store subcategory from location state or draft for saving
  const [savedSubcategory, setSavedSubcategory] = useState(null);

  // Load main category and subcategory from location state or draft
  useEffect(() => {
    const loadMainCategory = async () => {
      // First try location state
      const categoryFromState = location.state?.experienceCategory;
      const subcategoryFromState = location.state?.experienceSubcategory;
      
      if (categoryFromState) {
        setMainCategory(categoryFromState);
      }
      if (subcategoryFromState) {
        setSavedSubcategory(subcategoryFromState);
      }
      
      // If not in state, try to load from draft
      if ((!categoryFromState || !subcategoryFromState) && (state.draftId || location.state?.draftId)) {
        const draftId = state.draftId || location.state?.draftId;
        if (draftId) {
          try {
            const draftRef = doc(db, "onboardingDrafts", draftId);
            const draftSnap = await getDoc(draftRef);
            if (draftSnap.exists()) {
              const data = draftSnap.data().data || {};
              if (!categoryFromState && data.experienceCategory) {
                setMainCategory(data.experienceCategory);
              }
              if (!subcategoryFromState && data.experienceSubcategory) {
                setSavedSubcategory(data.experienceSubcategory);
              }
            }
          } catch (error) {
            }
        }
      }
    };
    loadMainCategory();
  }, [location.state?.experienceCategory, location.state?.experienceSubcategory, state.draftId, location.state?.draftId]);

  // Load saved city from draft if available (when resuming editing)
  useEffect(() => {
    const loadCity = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            if (data.experienceCity) {
              setCity(data.experienceCity);
            } else {
              }
            // Also load subcategory if not in location state
            if (!location.state?.experienceSubcategory && data.experienceSubcategory) {
              }
          } else {
            }
        } catch (error) {
          }
      } else {
        }
    };
    loadCity();
  }, [state.draftId, location.state?.draftId]);

  const handleNext = async () => {
    if (!city.trim() || !mainCategory) return;

    let draftId = state.draftId || location.state?.draftId;

    // Create draft if it doesn't exist
    if (!draftId) {
      try {
        const { auth } = await import("@/lib/firebase");
        const currentUser = auth.currentUser;
        if (!currentUser) {
          return;
        }
        
        const { saveDraft } = await import("@/pages/Host/services/draftService");
        const draftData = {
          experienceCategory: mainCategory,
          experienceCity: city.trim(),
        };
        
        // Only include experienceSubcategory if it has a value
        const subcategory = location.state?.experienceSubcategory || savedSubcategory;
        if (subcategory) {
          draftData.experienceSubcategory = subcategory;
        }
        
        const newDraftData = {
          currentStep: "experience-location",
          category: "experience",
          data: draftData
        };
        draftId = await saveDraft(newDraftData, null);
        // Update state with new draftId
        if (actions?.setDraftId) {
          actions.setDraftId(draftId);
        }
      } catch (error) {
        return;
      }
    }

    // Save current step and data
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        // Get subcategory from state or saved value
        const subcategory = location.state?.experienceSubcategory || savedSubcategory;
        
        // Build update object, only including defined values
        const updateData = {
          currentStep: "experience-location", // Save CURRENT step
          "data.experienceCategory": mainCategory,
          "data.experienceCity": city.trim(),
          lastModified: new Date(),
        };
        
        // Only include experienceSubcategory if it has a defined value
        if (subcategory !== undefined && subcategory !== null) {
          updateData["data.experienceSubcategory"] = subcategory;
        }
        
        await updateDoc(draftRef, updateData);
        } catch (error) {
        }
    }

    // Update context for next step
    if (actions.setCurrentStep) {
      actions.setCurrentStep("experience-listing-summary");
    }

    // Navigate to listing summary page
    navigate("/pages/experience-listing-summary", {
      state: {
        draftId: draftId, // Pass the potentially newly created draftId
        category: "experience",
        experienceCategory: mainCategory,
        experienceSubcategory: location.state?.experienceSubcategory,
        experienceCity: city.trim(),
      },
    });
  };

  const handleBack = () => {
    navigate("/pages/experience-subcategory-selection", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "experience",
        experienceCategory: mainCategory,
      },
    });
  };

  const handleSaveAndExit = async () => {
    try {
      const { auth } = await import("@/lib/firebase");
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("Please log in to save your progress.");
        navigate("/login");
        return;
      }

      let draftId = state.draftId || location.state?.draftId;

      // Create draft if it doesn't exist
      if (!draftId) {
        try {
        const { saveDraft } = await import("@/pages/Host/services/draftService");
        const draftData = {
          experienceCategory: mainCategory,
          experienceCity: city.trim(),
        };
        
        // Only include experienceSubcategory if it has a value
        const subcategory = location.state?.experienceSubcategory || savedSubcategory;
        if (subcategory) {
          draftData.experienceSubcategory = subcategory;
        }
        
        const newDraftData = {
          currentStep: "experience-location",
          category: "experience",
          data: draftData
        };
        draftId = await saveDraft(newDraftData, null);
          // Update state with new draftId
          if (actions?.setDraftId) {
            actions.setDraftId(draftId);
          }
        } catch (error) {
          alert("Failed to create draft. Please try again.");
          return;
        }
      }

      // Save current step and data
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          // Get subcategory from state or saved value
          const subcategory = location.state?.experienceSubcategory || savedSubcategory;
          
          // Build update object, only including defined values
          const updateData = {
            currentStep: "experience-location",
            "data.experienceCategory": mainCategory,
            "data.experienceCity": city.trim(),
            lastModified: new Date(),
          };
          
          // Only include experienceSubcategory if it has a defined value
          if (subcategory !== undefined && subcategory !== null) {
            updateData["data.experienceSubcategory"] = subcategory;
          }
          
          await updateDoc(draftRef, updateData);
          } catch (error) {
          alert("Failed to save draft. Please try again.");
          return;
        }
      }

      // Navigate to listings page
      navigate("/host/listings", {
        state: {
          scrollToDrafts: true,
          draftId: draftId,
          message: "Draft saved successfully!",
        },
      });
      } catch (error) {
      alert("Failed to save. Please try again.");
    }
  };

  const handleInputClick = () => {
    setShowModal(true);
    setSearchQuery(city); // Initialize search with current city value
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSearchQuery("");
    setCitySuggestions([]);
  };

  // Helper function to fetch from Nominatim with proxy fallback (same as Location.jsx)
  const fetchWithProxy = async (nominatimUrl) => {
    // Extract the path from the full URL for Vite proxy
    const url = new URL(nominatimUrl);
    const proxyPath = `/api/nominatim${url.pathname}${url.search}`;
    
    // Try Vite dev proxy first (works in development)
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
      }
    
    // Try direct request (works in some browsers/environments)
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
      }
    
    // Try AllOrigins proxy as last resort
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
        } else {
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
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (query.trim().length < 2) {
      setCitySuggestions([]);
      setIsSearching(false);
      return;
    }

    // Debounce search - wait 300ms after user stops typing
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Cancel previous request and create new one
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Build Nominatim URL - prioritize cities/towns but accept all place types
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
            return; // Request was cancelled, ignore
          }
          results = [];
        }
        
        // Use display_name directly from Nominatim (most accurate)
        // Filter to prioritize cities/towns but include other place types
        const formattedSuggestions = results
          .map(result => ({
            display_name: result.display_name || '',
            place_id: result.place_id,
            lat: result.lat,
            lon: result.lon,
            address: result.address || {},
            type: result.type || '',
            class: result.class || ''
          }))
          .filter((item, index, self) => 
            // Remove duplicates by place_id
            index === self.findIndex(t => t.place_id === item.place_id)
          )
          .slice(0, 10); // Limit to 10 suggestions
        
        setCitySuggestions(formattedSuggestions);
        setIsSearching(false);
      } catch (error) {
        if (error.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }
        setCitySuggestions([]);
        setIsSearching(false);
      }
    }, 300);
  };

  // Cleanup on unmount
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

  const handleSelectCity = (suggestion) => {
    // Use display_name directly (same as Location.jsx)
    setCity(suggestion.display_name);
    setShowModal(false);
    setSearchQuery("");
    setCitySuggestions([]);
    
    // Cancel any pending searches
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Reverse geocoding to get city name
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'Getaways/1.0'
                }
              }
            );
            const data = await response.json();
            if (data.address) {
              const cityName = data.address.city || data.address.town || data.address.municipality || data.address.county || "Unknown";
              const country = data.address.country || "";
              setCity(`${cityName}${country ? `, ${country}` : ""}`);
              setShowModal(false);
            }
          } catch (error) {
            alert("Unable to get your current location. Please enter a city manually.");
          }
        },
        (error) => {
          alert("Unable to access your location. Please enter a city manually.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const categoryIcon = mainCategory ? categoryIcons[mainCategory] : null;
  const categoryDisplayName = mainCategory ? categoryDisplayNames[mainCategory] : null;

  if (!mainCategory) {
    // Loading state or redirect if no category
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="experience-location"
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto py-20 pt-32 pb-24">
        <div className="w-full max-w-6xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left side - Question and Input */}
            <div className="space-y-8">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Where will you offer your experience?
              </h1>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onClick={handleInputClick}
                  placeholder="Enter a city"
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  readOnly
                />
              </div>
            </div>

            {/* Right side - Selected Category Card */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm bg-white border-2 border-gray-200 rounded-xl p-8 shadow-sm">
                <div className="w-32 h-32 mx-auto mb-6 relative">
                  {categoryIcon}
                </div>
                <h2 className="text-2xl font-bold text-center text-gray-900">
                  {categoryDisplayName}
                </h2>
              </div>
            </div>
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={city.trim().length > 0}
      />

      {/* City Search Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={handleCloseModal}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Enter a city</h2>
              <button
                onClick={handleCloseModal}
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
                  placeholder="Search for cities"
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                />
              </div>

              {/* City Suggestions */}
              {isSearching && searchQuery.length > 2 && (
                <div className="text-center py-4 text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <span className="ml-2">Searching...</span>
                </div>
              )}
              
              {!isSearching && citySuggestions.length > 0 && (
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  {citySuggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      onClick={() => handleSelectCity(suggestion)}
                      className="w-full flex items-start gap-4 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-left"
                    >
                      <svg className="w-5 h-5 text-gray-700 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
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

              {!isSearching && searchQuery.length > 2 && citySuggestions.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No cities found. Try a different search.
                </div>
              )}

              {/* Use Current Location */}
              <button
                onClick={handleUseCurrentLocation}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Send className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">Use my current location</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExperienceLocation;

