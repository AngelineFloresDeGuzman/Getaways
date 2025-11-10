import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

const OfferingTitle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const maxLength = 32;
  const descriptionMaxLength = 250;
  const editingOfferingId = location.state?.editingOfferingId || null;
  const isEditing = !!editingOfferingId;

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("offering-title");
    }
  }, [actions]);

  // Load saved title and description ONLY when editing
  useEffect(() => {
    const loadData = async () => {
      // Only load data if editing an existing offering
      if (isEditing && editingOfferingId) {
        const draftId = state.draftId || location.state?.draftId;
        if (draftId) {
          try {
            const draftRef = doc(db, "onboardingDrafts", draftId);
            const draftSnap = await getDoc(draftRef);
            if (draftSnap.exists()) {
              const data = draftSnap.data().data || {};
              if (data.serviceOfferings && Array.isArray(data.serviceOfferings)) {
                const offering = data.serviceOfferings.find(o => o.id === editingOfferingId);
                if (offering) {
                  // Load title if it exists
                  if (offering.title) {
                    setTitle(offering.title);
                  }
                  // Load description if it exists
                  if (offering.description) {
                    setDescription(offering.description);
                  }
                }
              }
            }
          } catch (error) {
            console.error("Error loading offering data:", error);
          }
        }
      }
      // When creating a new offering, always start with empty fields
      // Do NOT load tempOfferingTitle or tempOfferingDescription from location.state
    };
    loadData();
  }, [
    isEditing || false,
    editingOfferingId || null,
    state.draftId || null,
    location.state?.draftId || null
  ]);

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Load service photos if not already in location.state
    let servicePhotos = location.state?.servicePhotos || [];
    if (!servicePhotos.length && draftId) {
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
        console.error("Error loading service photos:", error);
      }
    }

    // Save temporary title and description to location state for next step
    navigate("/pages/offering-photo", {
      state: {
        draftId,
        category: "service",
        ...location.state,
        tempOfferingTitle: title.trim(),
        tempOfferingDescription: description.trim(),
        servicePhotos: servicePhotos, // Always include service photos
        editingOfferingId: editingOfferingId,
      },
    });
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

  const canProceed = title.trim().length > 0 && description.trim().length > 0;

  // Handle Save & Exit
  const handleSaveAndExit = async () => {
    const draftId = state.draftId || location.state?.draftId;
    if (draftId && title.trim()) {
      try {
        // Save temporary offering data
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          "data.tempOfferingTitle": title.trim(),
          "data.tempOfferingDescription": description.trim(),
          lastModified: new Date(),
        });
      } catch (error) {
        console.error("Error saving temporary title:", error);
      }
    }
      navigate("/host/listings");
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="offering-title" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-center justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">
            {title.trim().length > 0 ? 'Describe your offering' : 'Give your offering a title'}
          </h1>

          <div className="space-y-6">
            {/* Title Input - always visible */}
            <div className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  if (e.target.value.length <= maxLength) {
                    setTitle(e.target.value);
                  }
                }}
                placeholder="Express photo shoot"
                className="w-full px-4 py-6 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary transition-colors text-center"
                maxLength={maxLength}
                autoFocus
              />
              <div className="text-center text-sm text-gray-500">
                {title.length}/{maxLength} available
              </div>
            </div>

            {/* Description Input - shown after title is entered */}
            {title.trim().length > 0 && (
              <div className="space-y-4">
                <textarea
                  value={description}
                  onChange={(e) => {
                    if (e.target.value.length <= descriptionMaxLength) {
                      setDescription(e.target.value);
                    }
                  }}
                  placeholder={'Tell guests what\'s included. For example, "A mini portrait session in a location of your choosing. Includes composition tips..."'}
                  className="w-full px-4 py-6 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary transition-colors resize-none min-h-[120px]"
                  maxLength={descriptionMaxLength}
                />
                <div className="text-center text-sm text-gray-500">
                  {description.length}/{descriptionMaxLength} available
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
        nextText="Next"
        canProceed={canProceed}
      />
    </div>
  );
};

export default OfferingTitle;

