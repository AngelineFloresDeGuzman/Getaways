import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, X, Camera, Trash2 } from 'lucide-react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit.js';

const Photos = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);
  const fileInputRef = useRef(null);
  const draftLoaded = useRef(false);
  
  // Get property type from navigation state, default to 'house'
  const propertyType = location.state?.propertyType?.toLowerCase() || 
                      location.state?.selectedType?.toLowerCase() ||
                      'house'; // Better default than 'place'
  
  // Debug: Log the location state and property type
  console.log('Photos - location.state:', location.state);
  console.log('Photos - propertyType:', propertyType);
  
  const [uploadedPhotos, setUploadedPhotos] = useState(state.photos || []);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState([]);

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      // Only load draft if user is authenticated and we have a draftId
      if (location.state?.draftId && !draftLoaded.current && actions.loadDraft && state.user) {
        console.log('Photos - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          draftLoaded.current = true;
          console.log('Photos - Draft loaded successfully');
        } catch (error) {
          console.error('Photos - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state.user]); // Added state.user dependency

  // Set current step when component mounts
  useEffect(() => {
    if (actions.setCurrentStep) {
      actions.setCurrentStep('photos');
    }
  }, []);

  // Sync with context photos when navigating back
  useEffect(() => {
    if (state.photos && state.photos.length > 0 && uploadedPhotos.length === 0 && !location.state?.draftId) {
      console.log('Syncing photos from context on navigation back:', state.photos.length);
      setUploadedPhotos(state.photos);
    }
  }, [state.photos, uploadedPhotos.length, location.state?.draftId]);

  // Update uploadedPhotos when state changes (after loading draft)
  useEffect(() => {
    if (state.photos && state.photos.length > 0 && (draftLoaded.current || !location.state?.draftId)) {
      // Convert base64 photos back to display format
      const displayPhotos = state.photos.map(photo => ({
        id: photo.id,
        name: photo.name,
        url: photo.base64 || photo.url, // Use base64 as URL for display
        base64: photo.base64 // Keep base64 for saving
        // Note: No file object when loaded from draft
      }));
      console.log('Loading photos from draft:', displayPhotos);
      setUploadedPhotos(displayPhotos);
    } else if (state.photoSummary && draftLoaded.current && (!state.photos || state.photos.length === 0)) {
      // Fallback: If we only have photo summary, show message
      console.log('Draft loaded with photo summary only:', state.photoSummary);
      setUploadedPhotos([]);
    }
  }, [state.photos, state.photoSummary, draftLoaded.current, location.state?.draftId]);

  // Helper to convert File to base64 for storage
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Helper to update both local state and context
  const updatePhotos = async (newPhotos) => {
    setUploadedPhotos(newPhotos);
    
    // Convert photos to base64 for context storage
    if (actions.updatePhotos && newPhotos.length > 0) {
      try {
        const photosWithBase64 = await Promise.all(
          newPhotos.map(async (photo) => ({
            id: photo.id,
            name: photo.name,
            base64: photo.file ? await fileToBase64(photo.file) : photo.base64, // Use existing base64 if available
            url: photo.url || photo.base64 // Keep URL for display
          }))
        );
        actions.updatePhotos(photosWithBase64);
      } catch (error) {
        console.error('Error converting photos to base64:', error);
      }
    } else if (actions.updatePhotos && newPhotos.length === 0) {
      actions.updatePhotos([]);
    }
  };

  // Handle file selection
  const handleFileSelect = async (files) => {
    const newPhotos = Array.from(files).map((file) => ({
      id: Date.now() + Math.random(),
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    
    if (showPreviewModal) {
      // If modal is already open, add to existing pending photos
      setPendingPhotos(prev => [...prev, ...newPhotos]);
    } else {
      // Show preview modal with new photos
      setPendingPhotos(newPhotos);
      setShowPreviewModal(true);
    }
  };

  // Handle confirming the pending photos
  const handleConfirmPhotos = async () => {
    const updatedPhotos = [...uploadedPhotos, ...pendingPhotos];
    await updatePhotos(updatedPhotos);
    setShowPreviewModal(false);
    setPendingPhotos([]);
    
    // Update current step to photos-preview since we're navigating there
    if (actions.setCurrentStep) {
      await actions.setCurrentStep('photos-preview');
    }
    
    // Auto-navigate to preview page after uploading photos
    navigate('/pages/photos-preview', {
      state: {
        ...location.state,
        photos: updatedPhotos
      }
    });
  };

  // Handle canceling the pending photos
  const handleCancelPhotos = () => {
    // Clean up object URLs to prevent memory leaks
    pendingPhotos.forEach(photo => URL.revokeObjectURL(photo.url));
    setPendingPhotos([]);
    setShowPreviewModal(false);
  };

  // Save photos and navigate
  const saveAndNavigate = async (route, additionalState = {}) => {
    try {
      // Save current photos to context
      if (actions.updatePhotos) {
        await actions.updatePhotos(uploadedPhotos);
      }
      
      // Update current step in context based on route
      if (actions.setCurrentStep) {
        if (route === '/pages/photos-preview') {
          await actions.setCurrentStep('photos-preview');
        } else {
          await actions.setCurrentStep('photos');
        }
      }
      
      console.log('Photos saved successfully:', uploadedPhotos.length);
      
      // Navigate to the specified route
      navigate(route, {
        state: {
          ...location.state,
          photos: uploadedPhotos,
          ...additionalState
        }
      });
    } catch (error) {
      console.error('Error saving photos:', error);
      alert('Error saving progress. Please try again.');
    }
  };

  // Remove a photo from pending photos
  const removePendingPhoto = (photoId) => {
    const updatedPending = pendingPhotos.filter(photo => {
      if (photo.id === photoId) {
        URL.revokeObjectURL(photo.url); // Clean up object URL
        return false;
      }
      return true;
    });
    setPendingPhotos(updatedPending);
    
    // Close modal if no photos left
    if (updatedPending.length === 0) {
      setShowPreviewModal(false);
    }
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Handle file input change
  const handleInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  // Remove photo
  const removePhoto = async (photoId) => {
    const updatedPhotos = uploadedPhotos.filter(photo => photo.id !== photoId);
    await updatePhotos(updatedPhotos);
  };

  // Open file picker
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const canProceed = uploadedPhotos.length >= 5;

  // Save & Exit handler
  const handleSaveAndExitClick = async () => {
    console.log('Photos Save & Exit clicked');
    console.log('Current uploadedPhotos:', uploadedPhotos);
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('Photos: Setting currentStep to photos');
        actions.setCurrentStep('photos');
      }
      
      // Ensure photos are updated in context
      if (actions.updatePhotos) {
        actions.updatePhotos(uploadedPhotos);
      }
      
      // Override the saveDraft to ensure currentStep and photos are saved correctly
      if (actions.saveDraft) {
        console.log('Photos: Calling custom saveDraft with forced currentStep and photos');
        
        // Convert current photos to base64 if they haven't been converted yet
        let photosToSave = [];
        if (uploadedPhotos.length > 0) {
          try {
            photosToSave = await Promise.all(
              uploadedPhotos.map(async (photo) => ({
                id: photo.id,
                name: photo.name,
                base64: photo.base64 || (photo.file ? await fileToBase64(photo.file) : photo.url)
              }))
            );
          } catch (error) {
            console.error('Error converting photos for save:', error);
            // Fallback to summary if conversion fails
            photosToSave = uploadedPhotos.map(photo => ({
              id: photo.id,
              name: photo.name,
              url: photo.url
            }));
          }
        }
        
        // Create modified state data with forced currentStep and photos
        const { user, isLoading, ...dataToSave } = state;
        dataToSave.currentStep = 'photos'; // Force the currentStep
        dataToSave.photos = photosToSave; // Save photos with base64 data
        dataToSave.photoCount = uploadedPhotos.length; // Also save count for quick reference
        
        console.log('Photos: Data to save with forced currentStep and photos:', dataToSave);
        
        // Use context saveDraft to ensure only one draft per session
        const draftId = await actions.saveDraft();
        
        // Navigate to dashboard
        navigate('/host/hostdashboard', { 
          state: { 
            message: 'Draft saved successfully!',
            draftSaved: true 
          }
        });
      } else {
        // Fallback to normal save
        await handleSaveAndExit();
      }
      
    } catch (error) {
      console.error('Error in Photos save:', error);
      alert('Failed to save progress: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b">
        <div className="py-4 px-8 flex justify-between items-center">
          <svg viewBox="0 0 32 32" className="h-8 w-8">
            <path d="m16 1c2.008 0 3.978.378 5.813 1.114 1.837.736 3.525 1.798 4.958 3.138 1.433 1.34 2.56 2.92 3.355 4.628.795 1.709 1.2 3.535 1.2 5.394 0 1.859-.405 3.685-1.2 5.394-.795 1.708-1.922 3.288-3.355 4.628-1.433 1.34-3.121 2.402-4.958 3.138-1.835.736-3.805 1.114-5.813 1.114s-3.978-.378-5.813-1.114c-1.837-.736-3.525-1.798-4.958-3.138-1.433-1.34-2.56-2.92-3.355-4.628-.795-1.709-1.2-3.535-1.2-5.394 0-1.859.405-3.685 1.2-5.394.795-1.708 1.922-3.288 3.355-4.628 1.433-1.34 3.121-2.402 4.958-3.138 1.835-.736 3.805-1.114 5.813-1.114z" fill="rgb(255, 56, 92)"/>
          </svg>
          <div className="flex items-center gap-6">
            <button className="font-medium text-sm hover:underline">Questions?</button>
            <button 
              onClick={handleSaveAndExitClick}
              disabled={state.isLoading}
              className="font-medium text-sm hover:underline disabled:opacity-50"
            >
              {state.isLoading ? 'Saving...' : 'Save & exit'}
            </button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="h-1 w-full flex space-x-2">
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1"></div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-[32px] font-medium text-gray-900 mb-4">
              Add some photos of your {propertyType}
            </h1>
            <p className="text-gray-600 text-lg">
              You'll need 5 photos to get started. You can add more or make changes later.
            </p>
            {/* Show message when continuing from draft */}
            {draftLoaded.current && uploadedPhotos.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">
                  ✅ <strong>Draft restored:</strong> {uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? 's' : ''} loaded from your previous session.
                </p>
              </div>
            )}
            {state.photoSummary && draftLoaded.current && uploadedPhotos.length === 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  📝 <strong>Continuing from draft:</strong> You previously uploaded {state.photoSummary.count} photo{state.photoSummary.count !== 1 ? 's' : ''} 
                  ({state.photoSummary.names.join(', ')}). Please re-upload your photos to continue.
                </p>
              </div>
            )}
          </div>

          {/* Photo Upload Area */}
          {uploadedPhotos.length === 0 ? (
            // Empty state with camera illustration
            <div className="max-w-2xl mx-auto">
              <div
                className={`border-2 border-dashed rounded-xl p-16 text-center transition-colors ${
                  isDragging
                    ? 'border-black bg-gray-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {/* Camera Illustration */}
                <div className="mb-8 flex justify-center">
                  <div className="relative">
                    {/* Camera body */}
                    <div className="w-24 h-16 bg-gray-400 rounded-lg relative">
                      {/* Lens */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-gray-600 rounded-full">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-gray-800 rounded-full">
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gray-900 rounded-full"></div>
                        </div>
                      </div>
                      {/* Flash */}
                      <div className="absolute top-2 right-3 w-2 h-2 bg-gray-600 rounded-sm"></div>
                      {/* Viewfinder */}
                      <div className="absolute -top-2 left-4 w-4 h-3 bg-gray-500 rounded-t"></div>
                    </div>
                    {/* Camera strap */}
                    <div className="absolute -top-1 left-2 right-2 h-1 bg-amber-700 rounded-full"></div>
                    <div className="absolute -top-2 left-6 right-6 h-0.5 bg-amber-800 rounded-full"></div>
                  </div>
                </div>

                <button
                  onClick={openFilePicker}
                  className="bg-white border border-black text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Add photos
                </button>
                
                <p className="text-gray-500 text-sm mt-4">
                  Choose at least 5 photos
                </p>
              </div>
            </div>
          ) : (
            // Photo grid when photos are uploaded
            <div className="space-y-6">
              {/* Upload progress */}
              <div className="text-center">
                <p className="text-gray-600">
                  {uploadedPhotos.length} of 5 photos uploaded
                </p>
                {!canProceed && (
                  <p className="text-sm text-gray-500 mt-1">
                    Add {5 - uploadedPhotos.length} more photos to continue
                  </p>
                )}
              </div>

              {/* Photo grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {uploadedPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {/* Add more photos button */}
                <button
                  onClick={openFilePicker}
                  className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-gray-400 transition-colors"
                >
                  <Camera className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Add more</span>
                </button>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={async () => await saveAndNavigate('/pages/amenities')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className={`rounded-lg px-8 py-3.5 text-base font-medium ${
                  canProceed
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={async () => {
                  if (canProceed) {
                    // Save and navigate to photos preview
                    await saveAndNavigate('/pages/photos-preview');
                  }
                }}
                disabled={!canProceed}
              >
                {uploadedPhotos.length >= 5 ? 'Preview photos' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Photo Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Upload photos</h2>
              <button
                onClick={handleCancelPhotos}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  {pendingPhotos.length} item{pendingPhotos.length !== 1 ? 's' : ''} selected
                </p>
                
                {/* Add More Photos Button */}
                <button
                  onClick={() => {
                    // Open file picker to add more photos
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Add more
                </button>
              </div>

              {/* Photo Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                {pendingPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-transparent hover:border-gray-300 transition-colors">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Remove button - Always visible with better styling */}
                    <button
                      onClick={() => removePendingPhoto(photo.id)}
                      className="absolute top-2 right-2 p-2 bg-white hover:bg-gray-50 text-gray-700 hover:text-red-600 rounded-full shadow-lg border transition-colors"
                      title="Remove photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* File name */}
                    <p className="mt-2 text-xs text-gray-600 truncate" title={photo.name}>
                      {photo.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t bg-gray-50">
              <button
                onClick={handleCancelPhotos}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleConfirmPhotos}
                disabled={pendingPhotos.length === 0}
                className={`px-8 py-2.5 rounded-lg font-medium transition-colors ${
                  pendingPhotos.length > 0
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                Upload {pendingPhotos.length} photo{pendingPhotos.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Photos;