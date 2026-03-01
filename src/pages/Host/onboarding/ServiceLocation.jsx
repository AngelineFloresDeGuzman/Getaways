import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { MapPin, X, Search, Send } from "lucide-react";

// Service category icons (reused from ServiceCategorySelection)
const serviceCategoryIcons = {
  "catering": (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg shadow-lg">
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-br from-gray-300 to-gray-400 rounded-t-lg"></div>
        <div className="absolute top-1 left-1 right-1 h-2 bg-gradient-to-br from-gray-250 to-gray-350 rounded-t"></div>
        <div className="absolute bottom-1 left-1 right-1 h-8 bg-gradient-to-br from-green-200 to-green-300 rounded-b"></div>
        <div className="absolute bottom-1 left-1 w-1/3 h-8 bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-l"></div>
        <div className="absolute bottom-1 right-1 w-1/3 h-8 bg-gradient-to-br from-orange-200 to-orange-300 rounded-r"></div>
        <div className="absolute right-0 bottom-4 w-2 h-6 bg-gradient-to-b from-gray-300 to-gray-400 rounded-full transform rotate-12"></div>
        <div className="absolute right-2 bottom-5 w-3 h-3 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full"></div>
      </div>
    </div>
  ),
  "chef": (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-lg shadow-md">
        <div className="absolute inset-0 space-y-1">
          <div className="h-0.5 bg-amber-600/30"></div>
          <div className="h-0.5 bg-amber-600/30"></div>
          <div className="h-0.5 bg-amber-600/30"></div>
        </div>
        <div className="absolute top-2 left-2 w-1 h-4 bg-gradient-to-b from-orange-400 to-orange-500 rounded-full"></div>
        <div className="absolute top-3 left-4 w-1 h-3 bg-gradient-to-b from-orange-400 to-orange-500 rounded-full"></div>
        <div className="absolute top-2 left-6 w-1 h-4 bg-gradient-to-b from-orange-400 to-orange-500 rounded-full"></div>
        <div className="absolute right-2 top-1 w-1 h-6 bg-gradient-to-b from-gray-300 to-gray-400 rounded-full"></div>
        <div className="absolute right-2 top-7 w-3 h-1 bg-gradient-to-br from-gray-400 to-gray-500 rounded"></div>
        <div className="absolute right-6 top-2 w-1 h-4 bg-gradient-to-b from-gray-400 to-gray-500 rounded-full"></div>
        <div className="absolute right-5 top-6 w-2 h-1 bg-gradient-to-br from-gray-400 to-gray-500 rounded"></div>
      </div>
    </div>
  ),
  "hair-styling": (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-8 bg-gradient-to-br from-sky-200 to-sky-300 rounded-lg shadow-md">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-6 bg-gradient-to-br from-sky-300 to-sky-400 rounded-b-lg"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-3 bg-gradient-to-br from-sky-100 to-sky-200 rounded-t-lg"></div>
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-gray-400 rounded"></div>
      </div>
      <div className="absolute right-2 bottom-2 w-8 h-10 bg-gradient-to-br from-pink-200 to-pink-300 rounded-lg shadow-sm">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-4 bg-gradient-to-br from-pink-300 to-pink-400 rounded-t-lg"></div>
        <div className="absolute bottom-0 left-1 right-1 h-4">
          <div className="grid grid-cols-4 gap-0.5 h-full">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-gray-400 rounded-t w-full"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
  "makeup": (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-12 bg-gradient-to-b from-amber-700 to-amber-800 rounded-full shadow-sm">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-3 bg-gradient-to-br from-pink-200 to-pink-300 rounded-b-full"></div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-2 bg-gradient-to-br from-pink-100 to-pink-200 rounded-b-full"></div>
      </div>
      <div className="absolute right-2 bottom-2 w-6 h-10 bg-gradient-to-br from-red-400 to-red-500 rounded-lg shadow-md">
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-br from-red-500 to-red-600 rounded-t-lg"></div>
        <div className="absolute bottom-0 left-1 right-1 h-2 bg-gradient-to-br from-red-600 to-red-700 rounded-b"></div>
      </div>
    </div>
  ),
  "massage": (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg">
        <div className="absolute bottom-0 left-2 w-1 h-3 bg-gradient-to-b from-gray-700 to-gray-800"></div>
        <div className="absolute bottom-0 right-2 w-1 h-3 bg-gradient-to-b from-gray-700 to-gray-800"></div>
        <div className="absolute top-0 left-2 right-2 h-4 bg-gradient-to-br from-white to-gray-50 rounded-t-lg"></div>
        <div className="absolute top-2 left-4 right-4 h-1 bg-gray-100 rounded"></div>
      </div>
    </div>
  ),
  "nails": (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 bg-gradient-to-br from-pink-300 to-pink-400 rounded-lg shadow-md">
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-br from-pink-400 to-pink-500 rounded-t-lg"></div>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-1 h-4 bg-gray-300 rounded"></div>
      </div>
      <div className="absolute right-2 bottom-2 w-5 h-10 bg-gradient-to-br from-red-700 to-red-800 rounded-lg shadow-md">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-br from-red-800 to-red-900 rounded-t-lg"></div>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-gray-300 rounded"></div>
      </div>
    </div>
  ),
  "personal-training": (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-4 bg-gradient-to-br from-gray-700 to-gray-800 rounded-t-lg"></div>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-b-lg"></div>
        <div className="absolute right-0 top-6 w-4 h-4 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full">
          <div className="absolute top-1 left-1 right-1 bottom-1 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full"></div>
          <div className="absolute top-1.5 left-1.5 w-0.5 h-1 bg-gray-300 rounded"></div>
          <div className="absolute top-1.5 right-1.5 w-1 h-0.5 bg-gray-300 rounded"></div>
        </div>
      </div>
    </div>
  ),
  "photography": (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-10 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg shadow-lg">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full"></div>
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full"></div>
        <div className="absolute top-1 right-2 w-2 h-2 bg-gradient-to-br from-gray-300 to-gray-400 rounded"></div>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-br from-amber-800 to-amber-900"></div>
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-br from-amber-800 to-amber-900"></div>
      </div>
    </div>
  ),
  "prepared-meals": (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-lg shadow-md">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-br from-amber-800 to-amber-900 rounded-t-lg"></div>
        <div className="absolute bottom-1 left-1 w-1/3 h-6 bg-gradient-to-br from-green-300 to-green-400 rounded"></div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded"></div>
        <div className="absolute bottom-2 left-3 w-2 h-1 bg-gradient-to-br from-orange-500 to-orange-600 rounded"></div>
        <div className="absolute bottom-4 left-5 w-2 h-1 bg-gradient-to-br from-orange-500 to-orange-600 rounded"></div>
        <div className="absolute bottom-2 left-9 w-1 h-1 bg-green-500 rounded-full"></div>
        <div className="absolute bottom-3 left-10 w-1 h-1 bg-green-500 rounded-full"></div>
        <div className="absolute bottom-4 left-9 w-1 h-1 bg-green-500 rounded-full"></div>
      </div>
    </div>
  ),
  "spa-treatments": (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-8 bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-sm transform rotate-12">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b"></div>
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-gradient-to-br from-pink-300 to-pink-400 rounded-full"></div>
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-200 rounded-full"></div>
      </div>
      <div className="absolute right-2 bottom-2 w-4 h-3 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full shadow-sm"></div>
      <div className="absolute right-6 bottom-3 w-3 h-2 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full shadow-sm"></div>
      <div className="absolute left-2 bottom-2 w-2 h-4 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full shadow-sm">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full"></div>
      </div>
      <div className="absolute left-6 bottom-2 w-2 h-4 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full shadow-sm">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full"></div>
      </div>
    </div>
  ),
};

// Service category display names
const serviceCategoryDisplayNames = {
  "catering": "Catering",
  "chef": "Chef",
  "hair-styling": "Hair styling",
  "makeup": "Makeup",
  "massage": "Massage",
  "nails": "Nails",
  "personal-training": "Personal training",
  "photography": "Photography",
  "prepared-meals": "Prepared meals",
  "spa-treatments": "Spa treatments",
};

const ServiceLocation = () => {
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
      actions.setCurrentStep("service-location");
    }
  }, [actions]);

  // Load main category from location state or draft
  useEffect(() => {
    const loadMainCategory = async () => {
      // First try location state
      const categoryFromState = location.state?.serviceCategory;
      if (categoryFromState) {
        setMainCategory(categoryFromState);
      } else {
        // Try to load from draft
        const draftId = state.draftId || location.state?.draftId;
        if (draftId) {
          try {
            const draftRef = doc(db, "onboardingDrafts", draftId);
            const draftSnap = await getDoc(draftRef);
            if (draftSnap.exists() && draftSnap.data().data?.serviceCategory) {
              setMainCategory(draftSnap.data().data.serviceCategory);
            }
          } catch (error) {
            }
        }
      }
    };
    loadMainCategory();
  }, [location.state?.serviceCategory, state.draftId, location.state?.draftId]);

  // Load saved city from draft if available (when resuming editing)
  useEffect(() => {
    const loadCity = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists() && draftSnap.data().data?.serviceCity) {
            setCity(draftSnap.data().data.serviceCity);
          }
        } catch (error) {
          }
      }
    };
    loadCity();
  }, [state.draftId, location.state?.draftId]);

  const saveServiceData = async () => {
    let draftId = state.draftId || location.state?.draftId;
    
    // If no draftId exists, create a new draft first
    if (!draftId) {
      try {
        const { auth } = await import("@/lib/firebase");
        const currentUser = auth.currentUser;
        if (!currentUser) {
          return null;
        }
        
        const { saveDraft } = await import("@/pages/Host/services/draftService");
        const newDraftData = {
          currentStep: "service-location",
          category: "service",
          data: {
            serviceCategory: mainCategory,
            serviceCity: city.trim(),
          }
        };
        draftId = await saveDraft(newDraftData, null);
        // Update state with new draftId
        if (actions?.setDraftId) {
          actions.setDraftId(draftId);
        }
      } catch (error) {
        throw error;
      }
    }
    
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          currentStep: "service-location", // Save CURRENT step, not next step
          "data.serviceCity": city.trim(),
          "data.serviceCategory": mainCategory,
          lastModified: new Date(),
        });
        } catch (error) {
        throw error;
      }
    }
    
    return draftId;
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

      await saveServiceData();
      navigate("/host/listings", {
        state: {
          scrollToDrafts: true,
          message: "Draft saved successfully!",
        },
      });
    } catch (error) {
      alert("Failed to save. Please try again.");
    }
  };

  const handleNext = async () => {
    if (!city.trim() || !mainCategory) return;

    try {
      const draftId = await saveServiceData();

      // Update context
      if (actions.setCurrentStep) {
        actions.setCurrentStep("service-years-of-experience");
      }

      // Navigate to years of experience page
      navigate("/pages/service-years-of-experience", {
        state: {
          draftId,
          category: "service",
          serviceCategory: mainCategory,
          serviceCity: city.trim(),
        },
      });
    } catch (error) {
      alert("Failed to save progress. Please try again.");
    }
  };

  const handleBack = () => {
    navigate("/pages/service-category-selection", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        serviceCategory: mainCategory,
      },
    });
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

  // Helper function to fetch from Nominatim with proxy fallback (same as ExperienceLocation.jsx)
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
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (query.trim().length < 2) {
      setCitySuggestions([]);
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
          results = [];
        }
        
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
            index === self.findIndex(t => t.place_id === item.place_id)
          )
          .slice(0, 10);
        
        setCitySuggestions(formattedSuggestions);
        setIsSearching(false);
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        setCitySuggestions([]);
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

  const handleSelectCity = (suggestion) => {
    setCity(suggestion.display_name);
    setShowModal(false);
    setSearchQuery("");
    setCitySuggestions([]);
    
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

  const categoryIcon = mainCategory ? serviceCategoryIcons[mainCategory] : null;
  const categoryDisplayName = mainCategory ? serviceCategoryDisplayNames[mainCategory] : null;

  if (!mainCategory) {
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
        currentStepNameOverride="service-location"
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto py-20 pt-32 pb-24">
        <div className="w-full max-w-6xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left side - Question and Input */}
            <div className="space-y-8">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Where will you offer your service?
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

export default ServiceLocation;

