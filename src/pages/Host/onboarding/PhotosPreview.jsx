import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, X, MoreHorizontal, GripVertical } from 'lucide-react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';

const PhotosPreview = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  const draftLoaded = useRef(false);

  // Get photos from navigation state, context, or use default empty array
  const [photos, setPhotos] = useState(location.state?.photos || state.photos || []);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);

  // File input ref for adding more photos
  const fileInputRef = useRef(null);

  // Sync with context photos when they change
  useEffect(() => {
    if (state.photos && state.photos.length > 0 && photos.length === 0) {
      console.log('Syncing photos from context:', state.photos.length);
      setPhotos(state.photos);
    }
  }, [state.photos?.length, photos.length]); // Use length instead of full arrays

  // Auto-save photos to context whenever they change
  useEffect(() => {
    if (photos.length > 0 && actions.updatePhotos) {
      // Convert photos to context-compatible format with base64
      const photosForContext = photos.map(photo => ({
        id: photo.id,
        name: photo.name,
        base64: photo.base64 || photo.url,
        url: photo.url
      }));
      
      // Auto-save to context
      actions.updatePhotos(photosForContext);
      console.log('PhotosPreview - Auto-saved photos to context:', photosForContext.length);
    }
  }, [photos, actions.updatePhotos]); // Trigger when photos array changes

  // Helper to convert File to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Handle file selection for adding more photos
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      const newPhotos = [];

      for (const file of files) {
        // Create a preview URL for the file
        const url = URL.createObjectURL(file);
        
        // Convert to base64 for context storage
        const base64 = await fileToBase64(file);

        // Generate a unique ID for the photo
        const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newPhoto = {
          id: photoId,
          url: url,
          base64: base64, // Add base64 for context storage
          file: file,
          name: file.name,
          size: file.size,
          type: file.type
        };

        newPhotos.push(newPhoto);
      }

      // Add new photos to existing photos
      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);

      console.log(`PhotosPreview - Added ${newPhotos.length} new photos. Total: ${updatedPhotos.length}`);
      console.log('PhotosPreview - Auto-save will trigger via useEffect');

    } catch (error) {
      console.error('Error adding photos:', error);
      alert('Error adding photos. Please try again.');
    }

    // Reset file input
    event.target.value = '';
  };

  // Function to trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Navigate back (photos are auto-saved via useEffect)
  const saveAndNavigate = async (route) => {
    try {
      // Update current step in context
      if (actions.setCurrentStep) {
        await actions.setCurrentStep('photos');
      }

      console.log('PhotosPreview - Navigating to:', route, 'with', photos.length, 'photos');

      // Navigate to the specified route with current photos
      navigate(route, {
        state: {
          ...location.state,
          photos: photos // Pass all photos including newly added ones
        }
      });
    } catch (error) {
      console.error('Error navigating:', error);
      alert('Error navigating. Please try again.');
    }
  };

  // Debug photos state
  useEffect(() => {
    console.log('PhotosPreview - Photos state:', photos.length, photos);
    console.log('PhotosPreview - Location state:', location.state?.photos?.length);
    console.log('PhotosPreview - Context photos:', state.photos?.length);
  }, [photos.length]); // Only depend on photos.length to avoid infinite loops

  // Add logging for menu state changes
  const handleMenuToggle = (index) => {
    console.log('Menu toggle for photo index:', index, 'Current open:', openMenuIndex);
    setOpenMenuIndex(openMenuIndex === index ? null : index);
  };

  // Remove photo function
  const removePhoto = async (photoId) => {
    const updatedPhotos = photos.filter(photo => photo.id !== photoId);
    setPhotos(updatedPhotos);
    // Note: We'll save to context when user navigates, not immediately
    // If we removed the currently selected photo, adjust the index
    if (selectedPhotoIndex >= updatedPhotos.length) {
      setSelectedPhotoIndex(Math.max(0, updatedPhotos.length - 1));
    }
    setOpenMenuIndex(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuIndex !== null) {
        // Check if the clicked element is part of a dropdown menu
        const clickedElement = event.target;
        const isMenuButton = clickedElement.closest('[data-menu-button]');
        const isDropdownMenu = clickedElement.closest('[data-dropdown-menu]');

        // Only close if clicking outside both the button and the menu
        if (!isMenuButton && !isDropdownMenu) {
          setOpenMenuIndex(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuIndex]);

  // Drag and drop functions
  const handleDragStart = (e, index) => {
    console.log('Drag start:', index, 'Total photos:', photos.length);
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    console.log('Drop at index:', dropIndex, 'Dragged index:', draggedIndex);
    if (draggedIndex === null) return;

    const updatedPhotos = [...photos];
    const draggedPhoto = updatedPhotos[draggedIndex];

    // Remove the dragged photo from its original position
    updatedPhotos.splice(draggedIndex, 1);

    // Insert it at the new position
    updatedPhotos.splice(dropIndex, 0, draggedPhoto);

    console.log('Updated photos after drop:', updatedPhotos.length);
    setPhotos(updatedPhotos);
    // Note: We'll save to context when user navigates, not immediately
    setDraggedIndex(null);
  };

  // Move photo functions
  const movePhoto = (fromIndex, toIndex) => {
    const updatedPhotos = [...photos];
    const photoToMove = updatedPhotos[fromIndex];

    updatedPhotos.splice(fromIndex, 1);
    updatedPhotos.splice(toIndex, 0, photoToMove);

    setPhotos(updatedPhotos);
    // Note: We'll save to context when user navigates, not immediately
    setOpenMenuIndex(null);
  };

  const movePhotoBackward = (index) => {
    console.log('Move photo backward:', index);
    if (index > 0) {
      movePhoto(index, index - 1);
    }
    setOpenMenuIndex(null);
  };

  const movePhotoForward = (index) => {
    console.log('Move photo forward:', index);
    if (index < photos.length - 1) {
      movePhoto(index, index + 1);
    }
    setOpenMenuIndex(null);
  };

  const makeCoverPhoto = (index) => {
    console.log('Make cover photo:', index);
    if (index !== 0) {
      movePhoto(index, 0);
    }
    setOpenMenuIndex(null);
  };

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      // Only load draft if user is authenticated and we have a draftId
      if (location.state?.draftId && !draftLoaded.current && actions.loadDraft && state.user) {
        console.log('PhotosPreview - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          draftLoaded.current = true;
          console.log('PhotosPreview - Draft loaded successfully');
        } catch (error) {
          console.error('PhotosPreview - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state.user]); // Added state.user dependency

  // Set current step when component mounts
  useEffect(() => {
    if (actions.setCurrentStep) {
      actions.setCurrentStep('photos-preview');
    }
  }, [actions]);

  // Update photos when state changes (after loading draft)
  useEffect(() => {
    // Only update if we don't already have photos loaded
    if (photos.length === 0) {
      if (state.photos && state.photos.length > 0 && (draftLoaded.current || !location.state?.draftId)) {
        // Convert base64 photos back to display format if needed
        const displayPhotos = state.photos.map(photo => ({
          id: photo.id,
          name: photo.name,
          url: photo.base64 || photo.url, // Use base64 as URL for display
          base64: photo.base64 // Keep base64 for saving
        }));
        console.log('PhotosPreview: Loading photos from context:', displayPhotos);
        setPhotos(displayPhotos);
      } else if (location.state?.photos && location.state.photos.length > 0) {
        // Use photos from navigation state (coming from Photos page)
        console.log('PhotosPreview: Loading photos from navigation state:', location.state.photos.length);
        setPhotos(location.state.photos);
      }
    }
  }, [state.photos?.length, location.state?.photos?.length, photos.length]); // Stable dependencies



  // Handle redirect if no photos - use useEffect to avoid setState during render
  useEffect(() => {
    if (photos.length === 0) {
      console.log('No photos found, redirecting to photos upload');
      navigate('/pages/photos');
    }
  }, [photos.length, navigate]);

  // Don't render anything if no photos (will redirect)
  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b">
        <div className="py-4 px-8 flex justify-between items-center">
          <svg viewBox="0 0 32 32" className="h-8 w-8">
            <path d="m16 1c2.008 0 3.978.378 5.813 1.114 1.837.736 3.525 1.798 4.958 3.138 1.433 1.34 2.56 2.92 3.355 4.628.795 1.709 1.2 3.535 1.2 5.394 0 1.859-.405 3.685-1.2 5.394-.795 1.708-1.922 3.288-3.355 4.628-1.433 1.34-3.121 2.402-4.958 3.138-1.835.736-3.805 1.114-5.813 1.114s-3.978-.378-5.813-1.114c-1.837-.736-3.525-1.798-4.958-3.138-1.433-1.34-2.56-2.92-3.355-4.628-.795-1.709-1.2-3.535-1.2-5.394 0-1.859.405-3.685 1.2-5.394.795-1.708 1.922-3.288 3.355-4.628 1.433-1.34 3.121-2.402 4.958-3.138 1.835-.736 3.805-1.114 5.813-1.114z" fill="rgb(255, 56, 92)" />
          </svg>
          <div className="flex items-center gap-6">
            <button className="font-medium text-sm hover:underline">Questions?</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-medium text-gray-900 mb-2">
              Ta-da! How does this look?
            </h1>
            <p className="text-gray-600">
              Drag to reorder
            </p>
          </div>

          {/* Photo Grid Layout - Airbnb Style Masonry Grid */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            <div className="p-4">
              {/* Scrollable Container */}
              <div
                className="max-h-[70vh] overflow-y-auto"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db #f3f4f6'
                }}
              >
                {/* Cover Photo Row - Cover + 1 Normal Card */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {/* Cover Photo - spans 2 columns */}
                    <div
                      className="col-span-2 relative group"
                      draggable={true}
                      onDragStart={(e) => {
                        console.log('Cover photo drag start triggered');
                        handleDragStart(e, 0);
                      }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, 0)}
                    >
                      <div className={`relative rounded-xl overflow-hidden bg-gray-100 cursor-move transition-opacity ${draggedIndex === 0 ? 'opacity-50' : 'opacity-100'}`}>
                        <div className="aspect-[2/1]">
                          <img
                            src={photos[0].url}
                            alt="Cover photo"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Cover Photo Label */}
                        <div className="absolute top-3 left-3 bg-black/70 text-white rounded-md px-2 py-1 text-xs font-medium">
                          Cover Photo
                        </div>

                        {/* Three Dot Menu */}
                        <div className="absolute top-3 right-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuToggle(0);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-full shadow-sm transition-colors"
                            title="More options"
                            data-menu-button
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {openMenuIndex === 0 && (
                            <div
                              className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-20"
                              data-dropdown-menu
                            >
                              <button
                                onClick={() => {
                                  console.log('Edit photo clicked for cover photo');
                                  setOpenMenuIndex(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => movePhotoBackward(0)}
                                disabled={true}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Move backward
                              </button>
                              <button
                                onClick={() => movePhotoForward(0)}
                                disabled={photos.length === 1}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Move forward
                              </button>
                              <button
                                onClick={() => makeCoverPhoto(0)}
                                disabled={true}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Make cover photo
                              </button>
                              <hr className="my-1" />
                              <button
                                onClick={() => removePhoto(photos[0].id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* First Normal Card - if available */}
                    {photos.length > 1 && (
                      <div
                        className="relative group"
                        draggable={true}
                        onDragStart={(e) => {
                          console.log('First normal photo drag start triggered');
                          handleDragStart(e, 1);
                        }}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 1)}
                      >
                        <div className={`relative rounded-md overflow-hidden bg-gray-100 cursor-move transition-opacity ${draggedIndex === 1 ? 'opacity-50' : 'opacity-100'}`}>
                          <div className="aspect-square">
                            <img
                              src={photos[1].url}
                              alt="Photo 2"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Drag Handle */}
                          <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <GripVertical className="w-3 h-3 text-white/80 bg-black/50 rounded p-0.5" />
                          </div>

                          {/* Three Dot Menu */}
                          <div className="absolute top-1.5 right-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMenuToggle(1);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="p-1.5 bg-white/90 hover:bg-white text-gray-700 rounded-full shadow-sm transition-colors"
                              title="More options"
                              data-menu-button
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </button>

                            {/* Dropdown Menu */}
                            {openMenuIndex === 1 && (
                              <div
                                className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-20"
                                data-dropdown-menu
                              >
                                <button
                                  onClick={() => {
                                    console.log('Edit photo clicked for index:', 1);
                                    setOpenMenuIndex(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => movePhotoBackward(1)}
                                  disabled={1 === 0}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Move backward
                                </button>
                                <button
                                  onClick={() => movePhotoForward(1)}
                                  disabled={1 === photos.length - 1}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Move forward
                                </button>
                                <button
                                  onClick={() => makeCoverPhoto(1)}
                                  disabled={1 === 0}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Make cover photo
                                </button>
                                <hr className="my-1" />
                                <button
                                  onClick={() => removePhoto(photos[1].id)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Grid of Additional Photos (remaining photos) */}
                {photos.length > 2 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {photos.slice(2, 8).map((photo, gridIndex) => {
                      const actualIndex = gridIndex + 2;
                      return (
                        <div
                          key={photo.id}
                          className="relative group"
                          draggable={true}
                          onDragStart={(e) => {
                            console.log('Grid photo drag start triggered, index:', actualIndex);
                            handleDragStart(e, actualIndex);
                          }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, actualIndex)}
                        >
                          <div className={`relative rounded-md overflow-hidden bg-gray-100 cursor-move transition-opacity ${draggedIndex === actualIndex ? 'opacity-50' : 'opacity-100'}`}>
                            <div className="aspect-square">
                              <img
                                src={photo.url}
                                alt={`Photo ${actualIndex + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Drag Handle */}
                            <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <GripVertical className="w-3 h-3 text-white/80 bg-black/50 rounded p-0.5" />
                            </div>

                            {/* Three Dot Menu */}
                            <div className="absolute top-1.5 right-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMenuToggle(actualIndex);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="p-1.5 bg-white/90 hover:bg-white text-gray-700 rounded-full shadow-sm transition-colors"
                                title="More options"
                                data-menu-button
                              >
                                <MoreHorizontal className="w-3 h-3" />
                              </button>

                              {/* Dropdown Menu */}
                              {openMenuIndex === actualIndex && (
                                <div
                                  className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-20"
                                  data-dropdown-menu
                                >
                                  <button
                                    onClick={() => {
                                      console.log('Edit photo clicked for index:', actualIndex);
                                      setOpenMenuIndex(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => movePhotoBackward(actualIndex)}
                                    disabled={actualIndex === 0}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Move backward
                                  </button>
                                  <button
                                    onClick={() => movePhotoForward(actualIndex)}
                                    disabled={actualIndex === photos.length - 1}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Move forward
                                  </button>
                                  <button
                                    onClick={() => makeCoverPhoto(actualIndex)}
                                    disabled={actualIndex === 0}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Make cover photo
                                  </button>
                                  <hr className="my-1" />
                                  <button
                                    onClick={() => removePhoto(photo.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Additional Photos (if more than 8) - Continues as grid */}
                {photos.length > 8 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {photos.slice(8).map((photo, extraIndex) => {
                      const actualIndex = extraIndex + 8;
                      return (
                        <div
                          key={photo.id}
                          className="relative group"
                          draggable={true}
                          onDragStart={(e) => {
                            console.log('Extra photo drag start triggered, index:', actualIndex);
                            handleDragStart(e, actualIndex);
                          }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, actualIndex)}
                        >
                          <div className={`relative rounded-md overflow-hidden bg-gray-100 cursor-move transition-opacity ${draggedIndex === actualIndex ? 'opacity-50' : 'opacity-100'}`}>
                            <div className="aspect-square">
                              <img
                                src={photo.url}
                                alt={`Photo ${actualIndex + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Drag Handle */}
                            <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <GripVertical className="w-3 h-3 text-white/80 bg-black/50 rounded p-0.5" />
                            </div>

                            {/* Three Dot Menu */}
                            <div className="absolute top-1.5 right-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMenuToggle(actualIndex);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="p-1.5 bg-white/90 hover:bg-white text-gray-700 rounded-full shadow-sm transition-colors"
                                title="More options"
                                data-menu-button
                              >
                                <MoreHorizontal className="w-3 h-3" />
                              </button>

                              {/* Dropdown Menu */}
                              {openMenuIndex === actualIndex && (
                                <div
                                  className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-20"
                                  data-dropdown-menu
                                >
                                  <button
                                    onClick={() => {
                                      console.log('Edit photo clicked for index:', actualIndex);
                                      setOpenMenuIndex(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => movePhotoBackward(actualIndex)}
                                    disabled={actualIndex === 0}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Move backward
                                  </button>
                                  <button
                                    onClick={() => movePhotoForward(actualIndex)}
                                    disabled={actualIndex === photos.length - 1}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Move forward
                                  </button>
                                  <button
                                    onClick={() => makeCoverPhoto(actualIndex)}
                                    disabled={actualIndex === 0}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Make cover photo
                                  </button>
                                  <hr className="my-1" />
                                  <button
                                    onClick={() => removePhoto(photo.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add More Photos Button - Always at bottom */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    triggerFileInput();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600 font-medium">Add more</span>
                </button>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  await saveAndNavigate('/pages/photos');
                }}
                className="text-gray-900 font-medium underline hover:no-underline"
              >
                Back
              </button>
              
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  await saveAndNavigate('/pages/title-description');
                }}
                disabled={photos.length === 0}
                className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PhotosPreview;