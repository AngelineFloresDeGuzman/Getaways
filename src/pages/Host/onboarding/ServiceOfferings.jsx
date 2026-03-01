import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, X, Camera, Edit2 } from 'lucide-react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

const ServiceOfferings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [offerings, setOfferings] = useState([]);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("service-offerings");
    }
  }, [actions]);

  // Load saved offerings from draft if available
  useEffect(() => {
    const loadOfferings = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            if (data.serviceOfferings && Array.isArray(data.serviceOfferings)) {
              setOfferings(data.serviceOfferings);
            }
          }
        } catch (error) {
          }
      }
    };
    loadOfferings();
  }, [state.draftId, location.state?.draftId]);


  // Navigate to add offering page - clear any previous offering data but pass service photos
  const handleOpenAddModal = async () => {
    const draftId = state.draftId || location.state?.draftId;
    
    // Load service photos from subcollection to pass along
    let servicePhotos = [];
    if (draftId) {
      try {
        // Try loading from subcollection first (new method)
        const photosRef = collection(db, "onboardingDrafts", draftId, "servicePhotos");
        const photosQuery = query(photosRef, orderBy("createdAt", "asc"));
        const photosSnap = await getDocs(photosQuery);
        
        if (!photosSnap.empty) {
          servicePhotos = photosSnap.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || 'photo',
            url: doc.data().url || doc.data().base64,
            base64: doc.data().base64,
          }));
        } else {
          // Fallback: check main document for old photos
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            if (data.servicePhotos && Array.isArray(data.servicePhotos)) {
              servicePhotos = data.servicePhotos;
            }
          }
        }
      } catch (error) {
        }
    }
    
    navigate("/pages/offering-title", {
      state: {
        draftId,
        category: "service",
        serviceOfferings: offerings,
        servicePhotos: servicePhotos, // Always pass service photos
        // Explicitly do NOT include tempOfferingTitle, tempOfferingDescription, or editingOfferingId
      },
    });
  };

  // Navigate to edit offering page
  const handleEditOffering = (offering) => {
    navigate("/pages/offering-title", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        ...location.state,
        serviceOfferings: offerings,
        editingOfferingId: offering.id,
      },
    });
  };


  // Handle delete offering
  const handleDeleteOffering = async (id) => {
    const updatedOfferings = offerings.filter(offering => offering.id !== id);
    setOfferings(updatedOfferings);
    await saveOfferingsToFirebase(updatedOfferings);
  };

  // Save offerings to Firebase
  const saveOfferingsToFirebase = async (offeringsToSave) => {
    const draftId = state.draftId || location.state?.draftId;
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          "data.serviceOfferings": offeringsToSave,
          lastModified: new Date(),
        });
        } catch (error) {
        }
    }
  };

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Save offerings to Firebase first
    await saveOfferingsToFirebase(offerings);

    // If we have 3+ offerings, go directly to next step (service-description)
    // Otherwise, go to "Create your offerings" page
    if (offerings.length >= 3) {
      // Update context
      if (actions.setCurrentStep) {
        actions.setCurrentStep("service-description");
      }

      // Update Firebase draft
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          await updateDoc(draftRef, {
            "data.serviceOfferings": offerings,
            currentStep: "service-description",
            lastModified: new Date(),
          });
          } catch (error) {
          }
      }

      // Navigate to service what provide page (next step after offerings)
      navigate("/pages/service-what-provide", {
        state: {
          draftId,
          category: "service",
          ...location.state,
          serviceOfferings: offerings,
        },
      });
    } else {
      // Less than 3 offerings, go to "Create your offerings" page
      if (actions.setCurrentStep) {
        actions.setCurrentStep("create-your-offerings");
      }

      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          await updateDoc(draftRef, {
            "data.serviceOfferings": offerings,
            currentStep: "create-your-offerings",
            lastModified: new Date(),
          });
        } catch (error) {
          }
      }

      navigate("/pages/create-your-offerings", {
        state: {
          draftId,
          category: "service",
          ...location.state,
          serviceOfferings: offerings,
        },
      });
    }
  };

  const handleBack = () => {
    navigate("/pages/create-your-offerings", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        ...location.state,
        serviceOfferings: offerings,
      },
    });
  };

  const canProceed = offerings.length >= 3;

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

      const draftId = state.draftId || location.state?.draftId;
      await saveOfferingsToFirebase(offerings);
      
      // Save currentStep
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          await updateDoc(draftRef, {
            currentStep: "service-offerings", // Save CURRENT step
            lastModified: new Date(),
          });
        } catch (error) {
          }
      }
      
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

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="service-offerings" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Your offerings
          </h1>
          <p className="text-gray-500 text-center mb-12 text-lg">
            Add at least 3. Start with an affordable option to help you attract more guests.
          </p>

          {/* Offerings List */}
          {offerings.length > 0 && (
            <div className="space-y-4 mb-8">
              {offerings.map((offering) => {
                // Format price - always show "/ guest"
                const formatPrice = () => {
                  if (offering.pricingType === 'per-guest' && offering.pricePerGuest) {
                    return `₱${offering.pricePerGuest.toLocaleString()} / guest`;
                  } else if (offering.pricingType === 'fixed' && offering.fixedPrice) {
                    return `₱${offering.fixedPrice.toLocaleString()} / guest`;
                  } else if (offering.pricePerGuest) {
                    return `₱${offering.pricePerGuest.toLocaleString()} / guest`;
                  } else if (offering.fixedPrice) {
                    return `₱${offering.fixedPrice.toLocaleString()} / guest`;
                  } else if (offering.minimumPrice) {
                    return `₱${offering.minimumPrice.toLocaleString()} / guest`;
                  }
                  return 'Price not set';
                };

                return (
                  <div
                    key={offering.id}
                    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow group cursor-pointer"
                    onClick={() => handleEditOffering(offering)}
                  >
                    {/* Thumbnail Image */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      {offering.image ? (
                        <img
                          src={offering.image}
                          alt={offering.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Offering Details */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {offering.title || 'Untitled Offering'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatPrice()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditOffering(offering);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOffering(offering.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Offering Button - Large horizontal button */}
          <div className="flex justify-center">
            <button
              onClick={handleOpenAddModal}
              className="w-full max-w-2xl px-6 py-4 bg-gray-50 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-sm font-medium flex items-center justify-center gap-2 text-gray-900"
            >
              <Plus className="w-5 h-5" />
              {offerings.length === 0 ? 'Add offering' : 'Add another offering'}
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

    </div>
  );
};

export default ServiceOfferings;

