import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera } from 'lucide-react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

const OfferingPhoto = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [offeringTitle, setOfferingTitle] = useState('');
  const editingOfferingId = location.state?.editingOfferingId || null;
  const isEditing = !!editingOfferingId;

  // Debug: Log photos state changes
  useEffect(() => {
    console.log('📸 Photos state updated:', photos.length, 'photos');
    if (photos.length > 0) {
      console.log('📸 Sample photo structure:', photos[0]);
    }
  }, [photos]);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("offering-photo");
    }
  }, [actions]);

  // Load service photos and offering title from draft
  useEffect(() => {
    const loadData = async () => {
      const draftId = state.draftId || location.state?.draftId;
      console.log('📷 Loading photos from draft:', draftId);
      
      if (draftId) {
        try {
          // First, try loading from subcollection (new method)
          try {
            const photosRef = collection(db, "onboardingDrafts", draftId, "servicePhotos");
            const photosQuery = query(photosRef, orderBy("createdAt", "asc"));
            const photosSnap = await getDocs(photosQuery);
            
            if (!photosSnap.empty) {
              const loadedPhotos = photosSnap.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name || 'photo',
                url: doc.data().url || doc.data().base64,
                base64: doc.data().base64,
              }));
              
              console.log('✅ Loaded photos from subcollection:', loadedPhotos.length, 'photos');
              setPhotos(loadedPhotos);
            } else {
              console.log('❌ No photos in subcollection, checking main document...');
              // Fallback: check main document for old photos
              const draftRef = doc(db, "onboardingDrafts", draftId);
              const draftSnap = await getDoc(draftRef);
              if (draftSnap.exists()) {
                const data = draftSnap.data().data || {};
                if (data.servicePhotos && Array.isArray(data.servicePhotos) && data.servicePhotos.length > 0) {
                  console.log('✅ Found old photos in main document:', data.servicePhotos.length);
                  setPhotos(data.servicePhotos);
                } else if (location.state?.servicePhotos && Array.isArray(location.state.servicePhotos) && location.state.servicePhotos.length > 0) {
                  console.log('✅ Found photos in location.state:', location.state.servicePhotos.length);
                  setPhotos(location.state.servicePhotos);
                }
              } else if (location.state?.servicePhotos && Array.isArray(location.state.servicePhotos) && location.state.servicePhotos.length > 0) {
                console.log('✅ Found photos in location.state (no draft):', location.state.servicePhotos.length);
                setPhotos(location.state.servicePhotos);
              }
            }
          } catch (subcollectionError) {
            console.log('⚠️ Error loading from subcollection, trying main document...', subcollectionError);
            // Fallback to main document
            const draftRef = doc(db, "onboardingDrafts", draftId);
            const draftSnap = await getDoc(draftRef);
            if (draftSnap.exists()) {
              const data = draftSnap.data().data || {};
              if (data.servicePhotos && Array.isArray(data.servicePhotos) && data.servicePhotos.length > 0) {
                console.log('✅ Found photos in main document:', data.servicePhotos.length);
                setPhotos(data.servicePhotos);
              } else if (location.state?.servicePhotos && Array.isArray(location.state.servicePhotos) && location.state.servicePhotos.length > 0) {
                console.log('✅ Found photos in location.state:', location.state.servicePhotos.length);
                setPhotos(location.state.servicePhotos);
              }
            } else if (location.state?.servicePhotos && Array.isArray(location.state.servicePhotos) && location.state.servicePhotos.length > 0) {
              console.log('✅ Found photos in location.state (no draft):', location.state.servicePhotos.length);
              setPhotos(location.state.servicePhotos);
            }
          }
          
          // Load offering title - only from current flow or when editing
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            
            if (editingOfferingId) {
              // Load title from existing offering if editing
              if (data.serviceOfferings && Array.isArray(data.serviceOfferings)) {
                const offering = data.serviceOfferings.find(o => o.id === editingOfferingId);
                if (offering && offering.title) {
                  setOfferingTitle(offering.title);
                }
                // Load selected photo if editing
                if (offering && offering.image) {
                  setSelectedPhoto(offering.image);
                }
              }
            } else if (location.state?.tempOfferingTitle) {
              // Only load from location.state if coming from previous step in same offering flow
              setOfferingTitle(location.state.tempOfferingTitle);
            }
          }
        } catch (error) {
          console.error("Error loading data:", error);
          // Fallback to location.state on error
          if (location.state?.servicePhotos && Array.isArray(location.state.servicePhotos) && location.state.servicePhotos.length > 0) {
            console.log('✅ Loading photos from location.state (fallback):', location.state.servicePhotos.length);
            setPhotos(location.state.servicePhotos);
          }
        }
      } else {
        console.log('❌ No draftId found');
        // Load from location.state if no draftId
        if (location.state?.servicePhotos && Array.isArray(location.state.servicePhotos) && location.state.servicePhotos.length > 0) {
          console.log('✅ Loading photos from location.state (no draftId):', location.state.servicePhotos.length);
          setPhotos(location.state.servicePhotos);
        }
      }
    };
    loadData();
  }, [
    state.draftId || null, 
    location.state?.draftId || null, 
    location.state?.tempOfferingTitle || null, 
    location.state?.servicePhotos || null, 
    editingOfferingId || null
  ]);

  const handlePhotoSelect = (photo) => {
    // Store the photo object itself or use base64/url for comparison
    // Prefer base64 as it's the stored value, fallback to url
    const photoIdentifier = photo.base64 || photo.url;
    setSelectedPhoto(photoIdentifier);
  };

  const savePhotoToFirebase = async () => {
    if (!selectedPhoto) return;

    const draftId = state.draftId || location.state?.draftId;
    
    if (!draftId) {
      console.log("⚠️ Cannot save photo: missing draftId");
      return;
    }

    try {
      const draftRef = doc(db, "onboardingDrafts", draftId);
      const draftSnap = await getDoc(draftRef);
      
      if (draftSnap.exists()) {
        const data = draftSnap.data().data || {};
        let offerings = data.serviceOfferings || [];
        
        if (editingOfferingId) {
          // Editing existing offering
          const offeringIndex = offerings.findIndex(offering => offering.id === editingOfferingId);
          
          if (offeringIndex !== -1) {
            // Update existing offering with photo
            offerings[offeringIndex] = {
              ...offerings[offeringIndex],
              image: selectedPhoto,
            };
            
            await updateDoc(draftRef, {
              "data.serviceOfferings": offerings,
              lastModified: new Date(),
            });
            console.log("✅ Saved photo to Firebase for offering:", editingOfferingId);
          } else {
            console.log("⚠️ Offering not found, will be saved in next step");
          }
        } else {
          // Creating new offering - find the most recent offering that matches title or create a new one
          const currentTitle = offeringTitle || location.state?.tempOfferingTitle;
          
          if (currentTitle && offerings.length > 0) {
            // Try to find offering by title
            let offeringIndex = offerings.findIndex(o => o.title === currentTitle);
            
            if (offeringIndex === -1 && offerings.length > 0) {
              // Use the last offering (most recently created)
              offeringIndex = offerings.length - 1;
            }
            
            if (offeringIndex !== -1) {
              offerings[offeringIndex] = {
                ...offerings[offeringIndex],
                image: selectedPhoto,
              };
              
              await updateDoc(draftRef, {
                "data.serviceOfferings": offerings,
                lastModified: new Date(),
              });
              console.log("✅ Saved photo to Firebase for new offering");
            }
          }
        }
      }
    } catch (error) {
      console.error("Error saving photo to Firebase:", error);
    }
  };

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Save photo to Firebase (both for editing and creating new)
    if (selectedPhoto) {
      await savePhotoToFirebase();
    }

    // Navigate to next step (max guests)
    navigate("/pages/offering-guests", {
      state: {
        draftId,
        category: "service",
        ...location.state,
        tempOfferingPhoto: selectedPhoto,
        editingOfferingId: editingOfferingId,
      },
    });
  };

  const handleBack = () => {
    navigate("/pages/offering-title", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        ...location.state,
      },
    });
  };

  const canProceed = selectedPhoto !== null;

  // Handle Save & Exit
  const handleSaveAndExit = async () => {
    // Save photo to Firebase if photo is selected
    if (selectedPhoto) {
      await savePhotoToFirebase();
    }
    
      navigate("/host/listings");
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="offering-photo" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-start justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left Panel */}
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Choose a photo for this offering
              </h1>
              
              {/* Offering Title Display */}
              {offeringTitle && (
                <div className="px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="text-lg font-semibold text-gray-900">{offeringTitle}</span>
                </div>
              )}
            </div>

            {/* Right Panel - Photo Grid */}
            <div>
              {photos.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {photos.map((photo, index) => {
                    // Use same logic as handlePhotoSelect for comparison
                    const photoIdentifier = photo.base64 || photo.url;
                    const photoDisplayUrl = photo.url || photo.base64; // For display
                    const isSelected = selectedPhoto === photoIdentifier;
                    
                    return (
                      <div
                        key={photo.id || index}
                        onClick={() => handlePhotoSelect(photo)}
                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-4 border-primary ring-4 ring-primary/20 shadow-lg' 
                            : 'border-2 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={photoDisplayUrl}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No photos available. Please upload photos first.</p>
                </div>
              )}
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

export default OfferingPhoto;

