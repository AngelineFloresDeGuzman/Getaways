import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, deleteDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { createListing } from '@/pages/Host/services/listing';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';

const ServiceWhatProvide = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [nationalPark, setNationalPark] = useState(null); // null, true, or false
  const [transportingGuests, setTransportingGuests] = useState(null); // null, true, or false
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [serviceCategory, setServiceCategory] = useState(null);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("service-what-provide");
    }
  }, [actions]);

  // Service category to display name mapping
  const getServiceCategoryName = (categoryId) => {
    const categoryMap = {
      "catering": "catering",
      "chef": "chef",
      "hair-styling": "hair styling",
      "makeup": "makeup",
      "massage": "massage",
      "nails": "nail",
      "personal-training": "personal training",
      "photography": "photography",
      "prepared-meals": "prepared meal",
      "spa-treatments": "spa treatment",
    };
    return categoryMap[categoryId] || "service";
  };

  // Load saved answers and service category from draft if available
  useEffect(() => {
    const loadData = async () => {
      const draftId = state.draftId || location.state?.draftId;
      
      // First try to load category from location state
      const categoryFromState = location.state?.serviceCategory;
      if (categoryFromState) {
        setServiceCategory(categoryFromState);
      }
      
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            
            // Load service category
            if (data.serviceCategory && !categoryFromState) {
              setServiceCategory(data.serviceCategory);
            }
            
            if (data.serviceNationalPark !== undefined) {
              setNationalPark(data.serviceNationalPark);
            }
            if (data.serviceTransportingGuests !== undefined) {
              setTransportingGuests(data.serviceTransportingGuests);
            }
            if (data.serviceAgreedToTerms !== undefined) {
              setAgreedToTerms(data.serviceAgreedToTerms);
            }
          }
        } catch (error) {
          console.error("Error loading data from draft:", error);
        }
      }
    };
    loadData();
  }, [state.draftId || null, location.state?.draftId || null, location.state?.serviceCategory || null]);

  const handleNationalParkChange = (value) => {
    setNationalPark(value);
  };

  const handleTransportingGuestsChange = (value) => {
    setTransportingGuests(value);
  };

  const loadServicePhotosFromSubcollection = async (draftIdToUse) => {
    if (!draftIdToUse) return [];
    try {
      const photosRef = collection(db, "onboardingDrafts", draftIdToUse, "servicePhotos");
      const photosSnap = await getDocs(photosRef);
      if (photosSnap.empty) {
        return [];
      }
      const loadedPhotos = photosSnap.docs.map((docSnap) => {
        const photoData = docSnap.data() || {};
        return {
          id: docSnap.id,
          name: photoData.name || "photo",
          url: photoData.base64 || photoData.url || "",
          base64: photoData.base64 || "",
          firestoreId: docSnap.id,
        };
      }).filter(photo => !!photo.base64);
      console.log("📍 ServiceWhatProvide: Loaded service photos from subcollection:", loadedPhotos.length);
      return loadedPhotos;
    } catch (error) {
      console.error("Error loading service photos from subcollection:", error);
      return [];
    }
  };

  // Function to publish service listing
  const publishServiceListing = async (draftId) => {
    try {
      const draftRef = doc(db, "onboardingDrafts", draftId);
      const draftSnap = await getDoc(draftRef);
      
      if (!draftSnap.exists()) {
        throw new Error("Draft not found");
      }
      
      const draftData = draftSnap.data();
      const data = draftData.data || {};
      
      // Collect service data from draft
      const locationData = data.serviceLocation || data.locationData || {};
      let photos = data.servicePhotos || data.photos || [];
      const pricing = data.servicePricing || data.pricing || {};

      if (!Array.isArray(photos) || !photos.some(photo => photo?.base64)) {
        const subcollectionPhotos = await loadServicePhotosFromSubcollection(draftId);
        if (subcollectionPhotos.length > 0) {
          photos = subcollectionPhotos;
        }
      }
      
      // Prepare listing data with all service fields
      const listingData = {
        category: "service",
        title: data.serviceTitle || data.title || "Untitled Service",
        description: data.serviceDescription || data.description || "",
        descriptionHighlights: data.descriptionHighlights || [],
        location: locationData,
        photos: photos,
        pricing: pricing,
        // Service-specific fields
        serviceCategory: serviceCategory || data.serviceCategory,
        serviceYearsOfExperience: data.serviceYearsOfExperience,
        serviceExperience: data.serviceExperience,
        serviceDegree: data.serviceDegree,
        serviceCareerHighlight: data.serviceCareerHighlight,
        serviceProfilePicture: data.serviceProfilePicture,
        serviceProfiles: data.serviceProfiles || [],
        serviceAddress: data.serviceAddress,
        serviceWhereProvide: data.serviceWhereProvide,
        serviceOfferings: data.serviceOfferings || [],
        serviceNationalPark: nationalPark !== null ? nationalPark : data.serviceNationalPark,
        serviceTransportingGuests: transportingGuests !== null ? transportingGuests : data.serviceTransportingGuests,
        serviceAgreedToTerms: true,
        status: "active",
        rating: 0,
        reviews: 0,
      };
      
      // Check if listing already exists (edit mode)
      let targetListingId = draftData.publishedListingId || null;
      
      // Create or update listing
      const listingId = await createListing(listingData, targetListingId);
      console.log("✅ Service listing published:", listingId);
      
      // Update draft with publishedListingId if new listing
      if (!targetListingId && listingId) {
        const batch = writeBatch(db);
        batch.update(draftRef, {
          publishedListingId: listingId,
          published: true,
        });
        await batch.commit();
        console.log("✅ Updated draft with publishedListingId");
      }
      
      // Delete draft after successful publishing
      await deleteDoc(draftRef);
      console.log("✅ Draft deleted after successful publishing");
      
      return listingId;
    } catch (error) {
      console.error("Error publishing service listing:", error);
      throw error;
    }
  };

  const handleNext = async () => {
    try {
      // Set agreedToTerms to true when user clicks "I agree"
      setAgreedToTerms(true);
      
      // Save data first (this will create draft if needed)
      const draftId = await saveServiceData();
      
      if (!draftId) {
        console.error("No draftId found");
        alert("Error: Failed to save draft. Please try again.");
        return;
      }

    // Check payment status
    if (auth.currentUser) {
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const userPayment = userData.payment || {};
          
          // If user has active payment, publish listing directly
          if (userPayment.status === "active") {
            console.log("📍 Service: User has active payment, publishing listing");
            
            try {
              const listingId = await publishServiceListing(draftId);
              
              // Update sessionStorage
              updateSessionStorageBeforeNav("service-what-provide");
              
              // Navigate to dashboard with success message
              navigate("/host/listings", {
                state: {
                  message: "Service listing published successfully!",
                  listingPublished: true,
                  listingId: listingId,
                  onboardingCompleted: true,
                },
              });
              return;
            } catch (publishError) {
              console.error("Error publishing service listing:", publishError);
              alert("Error publishing listing. Please try again.");
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        // Continue to payment page if check fails
      }
    }

    // If no active payment, navigate to payment page
    console.log("📍 Service: No active payment, navigating to payment page");
    
    // Update context
    if (actions.setCurrentStep) {
      actions.setCurrentStep("payment");
    }

    // Update Firebase draft
    try {
      const draftRef = doc(db, "onboardingDrafts", draftId);
      await updateDoc(draftRef, {
        currentStep: "payment",
        lastModified: new Date(),
      });
    } catch (error) {
      console.error("Error updating draft:", error);
    }

    // Update sessionStorage before navigating to payment
    updateSessionStorageBeforeNav("service-what-provide", "payment");

    // Navigate to payment page
    navigate("/pages/payment", {
      state: {
        draftId,
        category: "service",
        ...location.state,
        serviceCategory: serviceCategory || location.state?.serviceCategory,
        serviceNationalPark: nationalPark,
        serviceTransportingGuests: transportingGuests,
        serviceAgreedToTerms: true,
      },
    });
    } catch (error) {
      console.error("❌ Error in handleNext:", error);
      alert("Failed to save progress. Please try again.");
    }
  };

  const handleBack = () => {
    navigate("/pages/your-offerings", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        ...location.state,
      },
    });
  };

  // Enable button when requirements and terms section is shown (transportingGuests !== null)
  // and both questions are answered
  const canProceed = nationalPark !== null && transportingGuests !== null;

  const saveServiceData = async () => {
    let draftId = state.draftId || location.state?.draftId;
    
    // If no draftId exists, create a new draft first
    if (!draftId) {
      try {
        const { auth } = await import("@/lib/firebase");
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.warn("⚠️ ServiceWhatProvide: User not authenticated, cannot create draft");
          return null;
        }
        
        const { saveDraft } = await import("@/pages/Host/services/draftService");
        const newDraftData = {
          currentStep: "service-what-provide",
          category: "service",
          data: {
            serviceNationalPark: nationalPark !== null ? nationalPark : undefined,
            serviceTransportingGuests: transportingGuests !== null ? transportingGuests : undefined,
            serviceAgreedToTerms: agreedToTerms,
          }
        };
        draftId = await saveDraft(newDraftData, null);
        console.log("✅ ServiceWhatProvide: Created new draft:", draftId);
        
        // Update state with new draftId
        if (actions?.setDraftId) {
          actions.setDraftId(draftId);
        }
      } catch (error) {
        console.error("❌ ServiceWhatProvide: Error creating draft:", error);
        throw error;
      }
    }
    
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          currentStep: "service-what-provide", // Save CURRENT step, not next step
          "data.serviceNationalPark": nationalPark !== null ? nationalPark : undefined,
          "data.serviceTransportingGuests": transportingGuests !== null ? transportingGuests : undefined,
          "data.serviceAgreedToTerms": agreedToTerms,
          lastModified: new Date(),
        });
        console.log("✅ ServiceWhatProvide: Draft saved successfully");
      } catch (error) {
        console.error("❌ ServiceWhatProvide: Error saving data:", error);
        throw error;
      }
    }
    
    return draftId;
  };

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

      await saveServiceData();
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
        currentStepNameOverride="service-what-provide" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Share what you'll provide
          </h1>
          <p className="text-gray-500 text-center mb-12 text-lg">
            This helps us know if we need to do license, insurance, quality, and standards checks.
          </p>

          <div className="space-y-8">
            {/* First Question */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Is your service at a national park?
              </h2>
              <div className="flex gap-4">
                <button
                  onClick={() => handleNationalParkChange(true)}
                  className={`flex-1 px-6 py-4 rounded-lg border-2 text-lg font-medium transition-all ${
                    nationalPark === true
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700 bg-white'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => handleNationalParkChange(false)}
                  className={`flex-1 px-6 py-4 rounded-lg border-2 text-lg font-medium transition-all ${
                    nationalPark === false
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700 bg-white'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Second Question */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Will you be transporting guests?
              </h2>
              <div className="flex gap-4">
                <button
                  onClick={() => handleTransportingGuestsChange(true)}
                  className={`flex-1 px-6 py-4 rounded-lg border-2 text-lg font-medium transition-all ${
                    transportingGuests === true
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700 bg-white'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => handleTransportingGuestsChange(false)}
                  className={`flex-1 px-6 py-4 rounded-lg border-2 text-lg font-medium transition-all ${
                    transportingGuests === false
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700 bg-white'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Requirements and Terms Section - Only show after answering transporting guests */}
            {transportingGuests !== null && (
              <div className="space-y-4 pt-8 border-t border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  Requirements and terms
                </h2>
                
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>
                    You have read, understand, and agree to the{' '}
                    <a href="/host/policies#service" className="font-bold text-gray-900 hover:text-primary underline">services terms</a>,{' '}
                    <a href="/host/policies#cancellation" className="font-bold text-gray-900 hover:text-primary underline">host cancellation policy</a> for services and experiences, and{' '}
                    <a href="/host/policies#cancellation" className="font-bold text-gray-900 hover:text-primary underline">cancellation policies</a> for services and experiences. You also acknowledge the{' '}
                    <a href="/host/policies#privacy" className="font-bold text-gray-900 hover:text-primary underline">privacy policy</a>.
                  </p>
                  
                  <p>
                    By selecting "I agree", you authorize Airbnb to conduct{' '}
                    <a href="#" className="font-bold text-gray-900 hover:text-primary underline">quality and standards checks</a> and you attest that you will maintain all necessary licenses, authorizations, and customary commercial liability insurance.
                  </p>
                  
                  <p>
                    You attest that you will comply with the{' '}
                    <a href="#" className="font-bold text-gray-900 hover:text-primary underline">services standards and requirements</a>, all laws and other requirements that apply to your offering, including those specific to
                  </p>
                  
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>
                      providing{' '}
                      <a href="#" className="font-bold text-gray-900 hover:text-primary underline">
                        {serviceCategory ? `${getServiceCategoryName(serviceCategory)} services` : 'services'}
                      </a>.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        backText="Back"
        nextText="I agree"
        canProceed={canProceed}
      />
    </div>
  );
};

export default ServiceWhatProvide;

