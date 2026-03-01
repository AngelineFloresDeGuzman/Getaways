import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingFooter from "./components/OnboardingFooter";
import { useOnboarding } from "@/pages/Host/contexts/OnboardingContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ChevronDown, AlertCircle } from "lucide-react";

const ServiceAddress = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [country, setCountry] = useState("United States");
  const [streetAddress, setStreetAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [city, setCity] = useState("");
  const [stateTerritory, setStateTerritory] = useState("");
  const [zipCode, setZipCode] = useState("");
  
  const [errors, setErrors] = useState({});
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("service-address");
    }
  }, [actions]);

  // Load saved address from draft if available
  useEffect(() => {
    const loadAddress = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            if (data.serviceCountry) setCountry(data.serviceCountry);
            if (data.serviceStreetAddress) setStreetAddress(data.serviceStreetAddress);
            if (data.serviceUnit !== undefined) setUnit(data.serviceUnit);
            if (data.serviceCity) setCity(data.serviceCity);
            if (data.serviceState) setStateTerritory(data.serviceState);
            if (data.serviceZipCode) setZipCode(data.serviceZipCode);
          }
        } catch (error) {
          }
      }
    };
    loadAddress();
  }, [state.draftId, location.state?.draftId]);

  const validateForm = () => {
    const newErrors = {};
    if (!city.trim()) {
      newErrors.city = "City/town is required.";
    }
    if (!stateTerritory.trim()) {
      newErrors.stateTerritory = "State/territory is required.";
    }
    if (!zipCode.trim()) {
      newErrors.zipCode = "ZIP code is required.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
          currentStep: "service-address",
          category: "service",
          data: {
            serviceCountry: country,
            serviceStreetAddress: streetAddress,
            serviceUnit: unit,
            serviceCity: city.trim(),
            serviceState: stateTerritory.trim(),
            serviceZipCode: zipCode.trim(),
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
          currentStep: "service-address", // Save CURRENT step, not next step
          "data.serviceCountry": country,
          "data.serviceStreetAddress": streetAddress,
          "data.serviceUnit": unit,
          "data.serviceCity": city.trim(),
          "data.serviceState": stateTerritory.trim(),
          "data.serviceZipCode": zipCode.trim(),
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
    if (!validateForm()) {
      return;
    }

    try {
      const draftId = await saveServiceData();

      // Update context
      if (actions.setCurrentStep) {
        actions.setCurrentStep("service-where-provide");
      }

      // Navigate to where provide page
      navigate("/pages/service-where-provide", {
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
          serviceCountry: country,
          serviceStreetAddress: streetAddress,
          serviceUnit: unit,
          serviceCity: city.trim(),
          serviceState: stateTerritory.trim(),
          serviceZipCode: zipCode.trim(),
        },
      });
    } catch (error) {
      alert("Failed to save progress. Please try again.");
    }
  };

  const handleBack = () => {
    navigate("/pages/service-online-profiles", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        serviceCategory: location.state?.serviceCategory,
        serviceCity: location.state?.serviceCity,
        serviceYearsOfExperience: location.state?.serviceYearsOfExperience,
        serviceExperience: location.state?.serviceExperience,
        serviceDegree: location.state?.serviceDegree,
        serviceCareerHighlight: location.state?.serviceCareerHighlight,
      },
    });
  };

  const countries = [
    "United States",
    "Philippines",
    "Canada",
    "United Kingdom",
    "Australia",
    "New Zealand",
    "Germany",
    "France",
    "Spain",
    "Italy",
    "Japan",
    "South Korea",
    "Singapore",
    "Malaysia",
    "Thailand",
    "India",
    "Brazil",
    "Mexico",
    "Argentina",
    "Chile",
  ];

  const canProceed = city.trim().length > 0 && stateTerritory.trim().length > 0 && zipCode.trim().length > 0;

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="service-address" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto py-20 pt-32 pb-24">
        <div className="w-full max-w-2xl px-6">
          <div className="space-y-6">
            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                Let us know a bit more about you
              </h1>
              <div className="space-y-1">
                <p className="text-lg text-gray-900">What's your residential address?</p>
                <p className="text-sm text-gray-600">Guests won't see this information.</p>
              </div>
            </div>

            {/* Address Form */}
            <div className="space-y-4">
              {/* Country/region */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country / region
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors flex items-center justify-between bg-white text-left"
                  >
                    <span className="text-gray-900">{country}</span>
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </button>
                  {showCountryDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowCountryDropdown(false)}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {countries.map((countryOption) => (
                          <button
                            key={countryOption}
                            type="button"
                            onClick={() => {
                              setCountry(countryOption);
                              setShowCountryDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                              country === countryOption ? "bg-gray-50" : ""
                            }`}
                          >
                            {countryOption}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Street address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street address
                </label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Street address"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Apt, suite, unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apt, suite, unit (if applicable)
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Apt, suite, unit (if applicable)"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* City/town */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City / town
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    if (errors.city) {
                      setErrors({ ...errors, city: "" });
                    }
                  }}
                  placeholder="City / town"
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.city
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-200 focus:border-primary"
                  }`}
                />
                {errors.city && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.city}</span>
                  </div>
                )}
              </div>

              {/* State/territory */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State / territory
                </label>
                <input
                  type="text"
                  value={stateTerritory}
                  onChange={(e) => {
                    setStateTerritory(e.target.value);
                    if (errors.stateTerritory) {
                      setErrors({ ...errors, stateTerritory: "" });
                    }
                  }}
                  placeholder="State / territory"
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.stateTerritory
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-200 focus:border-primary"
                  }`}
                />
                {errors.stateTerritory && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.stateTerritory}</span>
                  </div>
                )}
              </div>

              {/* ZIP code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP code
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => {
                    setZipCode(e.target.value);
                    if (errors.zipCode) {
                      setErrors({ ...errors, zipCode: "" });
                    }
                  }}
                  placeholder="ZIP code"
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.zipCode
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-200 focus:border-primary"
                  }`}
                />
                {errors.zipCode && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.zipCode}</span>
                  </div>
                )}
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
        canProceed={canProceed}
      />
    </div>
  );
};

export default ServiceAddress;

