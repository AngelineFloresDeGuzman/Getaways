import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, X, Plus, Images } from 'lucide-react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, addDoc, deleteDoc, getDocs, query, orderBy, onSnapshot, writeBatch } from 'firebase/firestore';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';

const ServicePhotos = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const fileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [isDraggingModal, setIsDraggingModal] = useState(false);

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("service-photos");
    }
  }, [actions]);

  // Load saved photos from subcollection and set up real-time listener
  useEffect(() => {
    const draftId = state.draftId || location.state?.draftId;
    if (!draftId) return;

    let unsubscribe = null;

    const loadPhotos = async () => {
      try {
        // Load photos from subcollection instead of main document
        const photosRef = collection(db, "onboardingDrafts", draftId, "servicePhotos");
        const photosQuery = query(photosRef, orderBy("createdAt", "asc"));
        
        // Set up real-time listener for photos
        unsubscribe = onSnapshot(photosQuery, (photosSnap) => {
          const loadedPhotos = photosSnap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || 'photo',
              url: data.base64 || data.url, // Prioritize base64 for display (blob URLs expire)
              base64: data.base64, // Always use base64 for storage
              firestoreId: doc.id, // Store Firestore document ID for deletion
            };
          });
          
          setPhotos(loadedPhotos);
          console.log("✅ Loaded", loadedPhotos.length, "photos from subcollection (real-time)");
        }, (error) => {
          });
        
        // Also check if there are old photos in the main document (migration) - only once
        const draftRef = doc(db, "onboardingDrafts", draftId);
        const draftSnap = await getDoc(draftRef);
        if (draftSnap.exists()) {
          const data = draftSnap.data().data || {};
          if (data.servicePhotos && Array.isArray(data.servicePhotos) && data.servicePhotos.length > 0) {
            // Migrate old photos to subcollection
            for (const photo of data.servicePhotos) {
              if (photo.base64) {
                await addDoc(photosRef, {
                  name: photo.name || 'photo',
                  url: photo.base64, // Use base64 as URL
                  base64: photo.base64,
                  createdAt: new Date(),
                });
              }
            }
            // Clear old photos from main document
            await updateDoc(draftRef, {
              "data.servicePhotos": [],
              lastModified: new Date(),
            });
            // Real-time listener will automatically update the UI
          }
        }
      } catch (error) {
        }
    };
    
    loadPhotos();
    
    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [
    state.draftId || null, 
    location.state?.draftId || null
  ]);

  // Helper to convert File to base64 with compression
  const fileToBase64 = (file, maxWidth = 1920, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      // If it's an image, compress it first
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          // Create canvas and compress
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL(file.type || 'image/jpeg', quality);
          resolve(compressedBase64);
        };
        
        img.onerror = () => {
          // Fallback to regular FileReader if compression fails
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        };
        
        img.src = URL.createObjectURL(file);
      } else {
        // For non-images, just convert to base64
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      }
    });
  };

  // Handle file selection (for direct upload without modal)
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    await processFiles(files);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file selection in modal
  const handleModalFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    await processFilesForModal(files);
    
    // Reset input
    if (modalFileInputRef.current) {
      modalFileInputRef.current.value = '';
    }
  };

  // Process files for main page (adds directly)
  const processFiles = async (files) => {
    try {
      // Convert files to base64 with compression
      const newPhotos = await Promise.all(
        files.map(async (file) => {
          const base64 = await fileToBase64(file);
          return {
            id: Date.now() + Math.random(),
            name: file.name,
            url: URL.createObjectURL(file), // Preview URL
            base64: base64, // Store base64 in Firestore
          };
        })
      );

      const updatedPhotos = [...photos, ...newPhotos];
      
      setPhotos(updatedPhotos);
      // Save to subcollection in background
      savePhotosToFirebase(updatedPhotos).catch(error => {
        alert('Error saving photos. Please try again.');
      });
    } catch (error) {
      alert('Error processing photos: ' + (error.message || 'Please try again'));
    }
  };

  // Process files for modal (converts to base64)
  const processFilesForModal = async (files) => {
    try {
      // Convert files to base64 with compression
      const newPhotos = await Promise.all(
        files.map(async (file) => {
          const base64 = await fileToBase64(file);
          return {
            id: Date.now() + Math.random(),
            name: file.name,
            url: URL.createObjectURL(file), // Preview URL for immediate display
            base64: base64, // Store base64 in Firestore
          };
        })
      );

      setPendingPhotos(prev => [...prev, ...newPhotos]);
    } catch (error) {
      alert('Error processing photos: ' + (error.message || 'Please try again'));
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  // Handle drag and drop in modal
  const handleModalDragOver = (e) => {
    e.preventDefault();
    setIsDraggingModal(true);
  };

  const handleModalDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingModal(false);
  };

  const handleModalDrop = async (e) => {
    e.preventDefault();
    setIsDraggingModal(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      await processFilesForModal(files);
    }
  };

  // Remove photo
  const removePhoto = async (photoId) => {
    const draftId = state.draftId || location.state?.draftId;
    if (draftId) {
      try {
        // Find the photo to get its Firestore ID
        const photoToRemove = photos.find(p => p.id === photoId);
        
        // Delete from Firestore subcollection if it has a firestoreId
        if (photoToRemove?.firestoreId) {
          const photoRef = doc(db, "onboardingDrafts", draftId, "servicePhotos", photoToRemove.firestoreId);
          await deleteDoc(photoRef);
        }
        
        // Remove from local state
        const updatedPhotos = photos.filter(photo => photo.id !== photoId);
        setPhotos(updatedPhotos);
      } catch (error) {
        // Still remove from local state even if Firestore delete fails
        const updatedPhotos = photos.filter(photo => photo.id !== photoId);
        setPhotos(updatedPhotos);
      }
    } else {
      // If no draftId, just remove from local state
      const updatedPhotos = photos.filter(photo => photo.id !== photoId);
      setPhotos(updatedPhotos);
    }
  };

  // Remove pending photo from modal
  const removePendingPhoto = (photoId) => {
    setPendingPhotos(pendingPhotos.filter(photo => photo.id !== photoId));
  };

  // Open upload modal
  const handleOpenUploadModal = () => {
    setShowUploadModal(true);
    setPendingPhotos([]);
  };

  // Close upload modal
  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setPendingPhotos([]);
  };

  // Handle Done button in modal
  const handleModalDone = () => {
    handleCloseUploadModal();
  };

  // Handle Add button in modal (adds pending photos to main photos)
  const handleModalAdd = async () => {
    if (pendingPhotos.length === 0) return;
    
    const updatedPhotos = [...photos, ...pendingPhotos];
    setPhotos(updatedPhotos);
    
    // Save to Firebase subcollection first, then close modal
    try {
      await savePhotosToFirebase(updatedPhotos);
      handleCloseUploadModal();
    } catch (error) {
      alert('Error saving photos. Please try again.');
      // Don't close modal if save fails so user can retry
    }
  };

  // Clean up photos from main document (helper function)
  const cleanupPhotosFromMainDocument = async (draftIdToClean) => {
    if (!draftIdToClean) return;
    try {
      const draftRef = doc(db, "onboardingDrafts", draftIdToClean);
      const draftSnap = await getDoc(draftRef);
      
      if (draftSnap.exists()) {
        const data = draftSnap.data().data || {};
        // Check if photos exist in main document
        if ((data.servicePhotos && data.servicePhotos.length > 0) || (data.photos && data.photos.length > 0)) {
          // Use a batch to ensure atomic update
          const batch = writeBatch(db);
          batch.update(draftRef, {
            "data.servicePhotos": [],
            "data.photos": [],
            "data.hasServicePhotos": true, // Mark that photos exist (in subcollection)
            lastModified: new Date(),
          });
          await batch.commit();
          }
      }
    } catch (error) {
      console.warn("⚠️ Could not clean up photos from main document (non-critical):", error.message);
      // Non-critical - photos might already be cleaned or document might be too large
    }
  };

  // Save photos to Firebase subcollection (each photo is its own document)
  const savePhotosToFirebase = async (photosToSave) => {
const draftId = state.draftId || location.state?.draftId;
    if (draftId) {
      try {
        // First, try to clean up any photos from main document
        await cleanupPhotosFromMainDocument(draftId);
        
        const photosRef = collection(db, "onboardingDrafts", draftId, "servicePhotos");
        
        // Get existing photos from Firestore to check which ones are new
        const existingPhotosSnap = await getDocs(photosRef);
        const existingFirestoreIds = new Set(existingPhotosSnap.docs.map(doc => doc.id));
        
        // Save each photo as a separate document in subcollection
        const savePromises = photosToSave.map(async (photo, index) => {
          // If photo already has a firestoreId and exists, skip it
          if (photo.firestoreId && existingFirestoreIds.has(photo.firestoreId)) {
            return { index, firestoreId: photo.firestoreId };
          }
          
          // Ensure base64 exists before saving
          if (!photo.base64) {
            return { index, firestoreId: null };
          }
          
          // Add new photo to subcollection
          const docRef = await addDoc(photosRef, {
            name: photo.name || 'photo',
            base64: photo.base64, // Base64 data for storage (primary)
            url: photo.base64, // Use base64 as URL since blob URLs expire
            createdAt: new Date(),
          });
          
          return { index, firestoreId: docRef.id };
        });
        
        const saveResults = await Promise.all(savePromises);
        const savedCount = saveResults.filter(r => r && r.firestoreId).length;
        // Note: Real-time listener will automatically update the state with the saved photos
        
        // Update main document to mark that photos exist (but don't store them there)
        // CRITICAL: Remove any photos from main document to prevent exceeding 1MB limit
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          "data.hasServicePhotos": true,
          "data.servicePhotos": [], // Ensure photos array is empty in main document
          "data.photos": [], // Also clear photos field if it exists
          lastModified: new Date(),
        });
        console.log("✅ Cleaned up photos from main document (photos stored in subcollection only)");
      } catch (error) {
        throw error;
      }
    }
  };

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Update context
    if (actions.setCurrentStep) {
      actions.setCurrentStep("service-title");
    }

    // Update Firebase draft (photos are already saved in subcollection)
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        await updateDoc(draftRef, {
          "data.hasServicePhotos": photos.length > 0,
          "data.servicePhotos": [], // Ensure photos array is empty in main document
          "data.photos": [], // Also clear photos field if it exists
          currentStep: "service-title",
          lastModified: new Date(),
        });
        console.log("✅ Updated service photos step in draft (photos in subcollection only)");
      } catch (error) {
        // If error is due to document size, try to clean up photos first
        if (error.message?.includes('exceeds the maximum allowed size')) {
          try {
            const draftRef = doc(db, "onboardingDrafts", draftId);
            await updateDoc(draftRef, {
              "data.servicePhotos": [],
              "data.photos": [],
              lastModified: new Date(),
            });
            // Retry saving
            await updateDoc(draftRef, {
              "data.hasServicePhotos": photos.length > 0,
              currentStep: "service-title",
              lastModified: new Date(),
            });
          } catch (cleanupError) {
            }
        }
      }
    }

    // Navigate to next page (service-title)
    navigate("/pages/service-title", {
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
        serviceTravelToGuests: location.state?.serviceTravelToGuests,
        serviceGuestsComeToYou: location.state?.serviceGuestsComeToYou,
        serviceAreas: location.state?.serviceAreas,
        // Photos are stored in subcollection, not passed in state
      },
    });
  };

  const handleBack = () => {
    navigate("/pages/service-where-provide", {
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
        serviceCountry: location.state?.serviceCountry,
        serviceStreetAddress: location.state?.serviceStreetAddress,
        serviceUnit: location.state?.serviceUnit,
        serviceState: location.state?.serviceState,
        serviceZipCode: location.state?.serviceZipCode,
      },
    });
  };

  const canProceed = photos.length >= 5;

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

      await savePhotosToFirebase(photos);
      
      // Save currentStep and ensure photos are removed from main document
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          await updateDoc(draftRef, {
            currentStep: "service-photos", // Save CURRENT step
            "data.servicePhotos": [], // Ensure photos array is empty in main document
            "data.photos": [], // Also clear photos field if it exists
            lastModified: new Date(),
          });
          } catch (error) {
          // If error is due to document size, try to clean up photos first
          if (error.message?.includes('exceeds the maximum allowed size')) {
            try {
              const draftRef = doc(db, "onboardingDrafts", draftId);
              await updateDoc(draftRef, {
                "data.servicePhotos": [],
                "data.photos": [],
                lastModified: new Date(),
              });
              // Retry saving currentStep
              await updateDoc(draftRef, {
                currentStep: "service-photos",
                lastModified: new Date(),
              });
            } catch (cleanupError) {
              }
          }
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

  // Debug: Log state changes
  useEffect(() => {
    }, [showUploadModal]);

  return (
    <>
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="service-photos" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-start justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Add photos that showcase your skills
          </h1>
          <p className="text-gray-500 text-center mb-12 text-lg">
            Add at least 5 photos.
          </p>

          {/* Photo Grid Display */}
          {photos.length > 0 && (
            <div className="mb-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-200">
                      <img
                        src={photo.base64 || photo.url || photo.previewUrl || photo.displayUrl}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Try fallback URLs if preview fails - prioritize base64
                          if (photo.base64 && e.target.src !== photo.base64) {
                            e.target.src = photo.base64;
                          } else if (photo.url && e.target.src !== photo.url) {
                            e.target.src = photo.url;
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Button Section */}
          {photos.length === 0 ? (
            <div className="flex justify-center">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full max-w-md border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-base font-medium text-gray-900">Drag and drop</p>
                    <p className="text-sm text-gray-600">or browse for photos</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={handleOpenUploadModal}
                    className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={handleOpenUploadModal}
                className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
              <p className="text-sm text-gray-500">
                {photos.length} / 5 photos added
              </p>
            </div>
          )}
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

    {/* Upload Photos Modal - Rendered outside main container */}
    {showUploadModal && (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
        onClick={handleCloseUploadModal}
        style={{ zIndex: 100 }}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 relative max-h-[90vh] flex flex-col" 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <button
              onClick={handleCloseUploadModal}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">Upload photos</h2>
            <button
              onClick={() => modalFileInputRef.current?.click()}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Status Text */}
          <div className="px-6 py-2 border-b">
            <p className="text-sm text-gray-500">
              {pendingPhotos.length === 0 ? 'No items selected' : `${pendingPhotos.length} item${pendingPhotos.length > 1 ? 's' : ''} selected`}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {pendingPhotos.length === 0 ? (
              /* Full Drag and Drop Area - when no photos selected */
              <div
                onDragOver={handleModalDragOver}
                onDragLeave={handleModalDragLeave}
                onDrop={handleModalDrop}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDraggingModal ? 'border-primary bg-primary/5' : 'border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Images className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">Drag and drop</p>
                    <p className="text-sm text-gray-600">or browse for photos</p>
                  </div>
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleModalFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => modalFileInputRef.current?.click()}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                  >
                    Browse
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Minimized Drag and Drop Area - when photos are selected */}
                <div
                  onDragOver={handleModalDragOver}
                  onDragLeave={handleModalDragLeave}
                  onDrop={handleModalDrop}
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors mb-6 ${
                    isDraggingModal ? 'border-primary bg-primary/5' : 'border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <Images className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">Drag and drop</span>
                    <span className="text-gray-400">or</span>
                    <input
                      ref={modalFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleModalFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => modalFileInputRef.current?.click()}
                      className="text-sm text-gray-600 underline hover:text-gray-900 transition-colors"
                    >
                      browse for photos
                    </button>
                  </div>
                </div>

                {/* Separator */}
                <div className="mb-6 border-t border-dashed border-gray-300"></div>

                {/* Selected Photos Preview */}
                <div className="grid grid-cols-4 gap-4">
                  {pendingPhotos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-200 relative">
                        <img
                          src={photo.base64 || photo.url || photo.previewUrl || photo.displayUrl}
                          alt={photo.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Try fallback URLs if preview fails - prioritize base64
                            if (photo.base64 && e.target.src !== photo.base64) {
                              e.target.src = photo.base64;
                            } else if (photo.url && e.target.src !== photo.url) {
                              e.target.src = photo.url;
                            }
                          }}
                        />
                      </div>
                      <button
                        onClick={() => removePendingPhoto(photo.id)}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between p-6 border-t">
            <button
              onClick={handleModalDone}
              className="px-6 py-2 text-gray-900 font-medium hover:text-gray-700 transition-colors"
            >
              Done
            </button>
            <button
              onClick={handleModalAdd}
              disabled={pendingPhotos.length === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                pendingPhotos.length > 0
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default ServicePhotos;

