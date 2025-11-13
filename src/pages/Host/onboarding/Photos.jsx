import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, X, Camera, Trash2, Plus, Images, MoreHorizontal, GripVertical } from 'lucide-react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useSaveAndExitWithContext } from './hooks/useSaveAndExit.js';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';

const Photos = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // OnboardingContext integration
  const { state, actions } = useOnboarding();
  const { handleSaveAndExit } = useSaveAndExitWithContext(actions);
  const fileInputRef = useRef(null);
  const draftLoaded = useRef(false);
  const [propertyStructure, setPropertyStructure] = useState(() => {
    // Initialize from context if available
    if (state.propertyStructure) {
      console.log('📍 Photos: Initializing propertyStructure from context:', state.propertyStructure);
      return state.propertyStructure.toLowerCase();
    }
    return null;
  });
  
  // Load propertyStructure - ALWAYS try to load from Firebase
  // Try multiple times: on mount, when draftId becomes available, and when navigating
  useEffect(() => {
    const loadPropertyStructure = async () => {
      console.log('📍 Photos: loadPropertyStructure effect triggered');
      console.log('📍 Photos: state.propertyStructure:', state.propertyStructure);
      console.log('📍 Photos: propertyStructure state:', propertyStructure);
      console.log('📍 Photos: state?.draftId:', state?.draftId);
      console.log('📍 Photos: location.state?.draftId:', location.state?.draftId);
      
      let draftIdToUse = state?.draftId || location.state?.draftId;
      
      // If no draftId yet, try to get it from user's drafts
      if (!draftIdToUse && state.user?.uid) {
        try {
          const { getUserDrafts } = await import('@/pages/Host/services/draftService');
          const drafts = await getUserDrafts();
          if (drafts.length > 0) {
            draftIdToUse = drafts[0].id;
            console.log('📍 Photos: Found draftId from getUserDrafts:', draftIdToUse);
            // Also update context draftId if it's not set
            if (!state.draftId && actions.setDraftId) {
              actions.setDraftId(draftIdToUse);
            }
          }
        } catch (error) {
          console.error('📍 Photos: Error getting user drafts:', error);
        }
      }
      
      console.log('📍 Photos: draftIdToUse (final):', draftIdToUse);
      
      // ALWAYS try loading from Firebase if we have a draftId (most reliable)
      if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
        try {
          console.log('📍 Photos: Loading propertyStructure from Firebase with draftId:', draftIdToUse);
          const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
          const docSnap = await getDoc(draftRef);
          
          if (docSnap.exists()) {
            const draftData = docSnap.data();
            console.log('📍 Photos: Draft data exists');
            console.log('📍 Photos: draftData.data:', draftData.data);
            console.log('📍 Photos: draftData.data?.propertyStructure:', draftData.data?.propertyStructure);
            
            // Check nested data first (where PropertyStructure saves it), then top-level
            const structure = draftData.data?.propertyStructure || draftData.propertyStructure;
            console.log('📍 Photos: Found structure in Firebase:', structure);
            
            if (structure) {
              const structureLower = structure.toLowerCase();
              console.log('📍 Photos: ✅ Setting propertyStructure to:', structureLower);
              setPropertyStructure(structureLower);
              
              // Also update context if it's not set there yet or is different
              if (!state.propertyStructure || state.propertyStructure.toLowerCase() !== structureLower) {
                console.log('📍 Photos: Updating context with propertyStructure:', structure);
                if (actions.updatePropertyStructure) {
                  actions.updatePropertyStructure(structure);
                }
              }
              return; // Exit early if we found it in Firebase
            } else {
              console.log('📍 Photos: ⚠️ No propertyStructure found in Firebase draft');
              console.log('📍 Photos: Available keys in data:', draftData.data ? Object.keys(draftData.data) : 'no data object');
              console.log('📍 Photos: Full draftData keys:', Object.keys(draftData));
            }
          } else {
            console.log('📍 Photos: ⚠️ Draft document does not exist for draftId:', draftIdToUse);
          }
        } catch (error) {
          console.error('📍 Photos: ❌ Error loading propertyStructure from Firebase:', error);
          console.error('📍 Photos: Error details:', error.message, error.stack);
        }
      } else {
        console.log('📍 Photos: ⚠️ No valid draftId available - draftIdToUse:', draftIdToUse);
        console.log('📍 Photos: User authenticated:', !!state.user);
        console.log('📍 Photos: User UID:', state.user?.uid);
      }
      
      // Fallback: check context state if Firebase didn't have it
      if (state.propertyStructure && !propertyStructure) {
        const structure = state.propertyStructure.toLowerCase();
        console.log('📍 Photos: Using propertyStructure from context (fallback):', structure);
        setPropertyStructure(structure);
      }
    };
    
    loadPropertyStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.draftId, location.state?.draftId, state.user?.uid, location.pathname]);
  
  // Compute property type reactively - ONLY use propertyStructure (not propertyType)
  // propertyStructure comes from PropertyStructure page and is what should be displayed
  const propertyType = useMemo(() => {
    console.log('📍 Photos useMemo: RECOMPUTING propertyType');
    console.log('📍 Photos useMemo: propertyStructure state:', propertyStructure);
    console.log('📍 Photos useMemo: state.propertyStructure:', state.propertyStructure);
    
    // Use local state first (most up-to-date)
    if (propertyStructure) {
      console.log('📍 Photos useMemo: ✅ Using propertyStructure state:', propertyStructure);
      return propertyStructure;
    }
    
    // Fallback to context
    if (state.propertyStructure) {
      const structure = state.propertyStructure.toLowerCase();
      console.log('📍 Photos useMemo: ✅ Using propertyStructure from context:', structure);
      return structure;
    }
    
    console.log('📍 Photos useMemo: ⚠️ Using default "house" - propertyStructure not found!');
    console.log('📍 Photos useMemo: Debug info - propertyStructure:', propertyStructure, 'state.propertyStructure:', state.propertyStructure);
    return 'house'; // Default fallback
  }, [
    propertyStructure, 
    state.propertyStructure,
    state?.draftId,
    location.state?.draftId
  ]);
  
  // Debug: Log the location state and property type
  console.log('📍 Photos RENDER - location.state:', location.state);
  console.log('📍 Photos RENDER - propertyType:', propertyType);
  console.log('📍 Photos RENDER - propertyStructure state:', propertyStructure);
  console.log('📍 Photos RENDER - propertyStructure from context:', state.propertyStructure);
  
  // Initialize with photos from state, location state, or empty array
  const getInitialPhotos = () => {
    // First check if photos come from navigation state
    if (location.state?.photos && location.state.photos.length > 0) {
      return location.state.photos;
    }
    // Then check context state
    if (state.photos && state.photos.length > 0) {
      return state.photos.map(photo => ({
        id: photo.id,
        name: photo.name,
        url: photo.base64 || photo.url,
        base64: photo.base64
      }));
    }
    return [];
  };
  
  const [uploadedPhotos, setUploadedPhotos] = useState(getInitialPhotos());
  const [isDragging, setIsDragging] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      // Only load draft if user is authenticated and we have a draftId
      if (location.state?.draftId && !draftLoaded.current && actions.loadDraft && state.user) {
        console.log('📍 Photos - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          draftLoaded.current = true;
          console.log('📍 Photos - Draft loaded successfully');
          console.log('📍 Photos - After draft load, state.propertyStructure:', state.propertyStructure);
          
          // After draft loads, propertyStructure should be in context, so set it
          if (state.propertyStructure) {
            const structure = state.propertyStructure.toLowerCase();
            console.log('📍 Photos - Setting propertyStructure after draft load:', structure);
            setPropertyStructure(structure);
          }
        } catch (error) {
          console.error('📍 Photos - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.draftId]); // Only run when draftId changes
  
  // Also watch for propertyStructure changes in context (in case it loads after initial render)
  useEffect(() => {
    if (state.propertyStructure) {
      const structure = state.propertyStructure.toLowerCase();
      // Only update if it's different or not set yet
      if (!propertyStructure || propertyStructure !== structure) {
        console.log('📍 Photos - propertyStructure changed in context, updating:', structure);
        setPropertyStructure(structure);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.propertyStructure]);

  // Set current step when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'photos') {
      console.log('📍 Photos page - Setting currentStep to photos');
      actions.setCurrentStep('photos');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Sync photos from context when navigating back or when state changes
  // This ensures photos are displayed when coming back from TitleDescription or other pages
  useEffect(() => {
    // If we have photos in state, always sync to ensure they're displayed
    if (state.photos && state.photos.length > 0) {
      // Convert base64 photos back to display format
      const displayPhotos = state.photos.map(photo => ({
        id: photo.id,
        name: photo.name,
        url: photo.base64 || photo.url, // Use base64 as URL for display
        base64: photo.base64 // Keep base64 for saving
        // Note: No file object when loaded from draft
      }));
      
      // Always update if count differs or if we don't have photos
      // This ensures photos show when navigating back
      if (uploadedPhotos.length !== displayPhotos.length || uploadedPhotos.length === 0) {
        console.log('📍 Photos: Syncing photos from context on navigation back:', displayPhotos.length);
      setUploadedPhotos(displayPhotos);
      } else {
        // Even if count matches, verify each photo ID matches
        const idsMatch = uploadedPhotos.every((photo, index) => 
          displayPhotos[index] && photo.id === displayPhotos[index].id
        );
        if (!idsMatch) {
          console.log('📍 Photos: Photo IDs changed, updating photos');
          setUploadedPhotos(displayPhotos);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.photos?.length, location.pathname, location.key]); // Run when photos count changes, route changes, or navigation key changes

  // Load photos from Firebase draft when draftId is present
  useEffect(() => {
    const loadPhotosFromDraft = async () => {
      const draftIdToUse = state?.draftId || location.state?.draftId;
      
      // If we have a draftId and no photos loaded yet, try to load from Firebase
      if (draftIdToUse && !draftIdToUse.startsWith('temp_') && uploadedPhotos.length === 0) {
        try {
          const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
          const docSnap = await getDoc(draftRef);
          
          if (docSnap.exists()) {
            const draftData = docSnap.data();
            const photosFromDraft = draftData.data?.photos || [];
            
            if (photosFromDraft.length > 0) {
              // Convert photos to display format - use base64 for display (Firestore storage)
              const displayPhotos = photosFromDraft.map(photo => ({
                id: photo.id,
                name: photo.name,
                // Use base64 as URL for display (Firestore storage, not Firebase Storage)
                url: photo.base64 || (photo.url && !photo.url.startsWith('blob:') ? photo.url : null),
                base64: photo.base64
              }));
              
              console.log('📍 Photos: Loaded photos from Firebase draft:', displayPhotos.length);
              setUploadedPhotos(displayPhotos);
              
              // Also update context
              if (actions.updatePhotos) {
                actions.updatePhotos(displayPhotos);
              }
            }
          }
        } catch (error) {
          console.error('📍 Photos: Error loading photos from Firebase draft:', error);
        }
      }
    };
    
    loadPhotosFromDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.draftId, location.state?.draftId, location.pathname]); // Run when draftId changes or route changes

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
              // Use base64 as URL for display (Firestore storage, not Firebase Storage)
              url: photo.base64 || (photo.url && !photo.url.startsWith('blob:') ? photo.url : null)
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

  // Open the upload modal
  const handleOpenUploadModal = () => {
    setShowPreviewModal(true);
    setPendingPhotos([]); // Start with empty pending photos
  };

  // Helper to convert blob URL to base64
  const blobUrlToBase64 = async (blobUrl) => {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting blob URL to base64:', error);
      throw error;
    }
  };

  // Handle confirming the pending photos
  const handleConfirmPhotos = async () => {
    try {
      // Convert blob URLs to base64 for storage in Firestore
      const photosWithBase64 = await Promise.all(
        pendingPhotos.map(async (photo) => {
          // If photo has a file, convert it to base64
          if (photo.file) {
            const base64 = await fileToBase64(photo.file);
            return {
              id: photo.id,
              name: photo.name,
              url: base64, // Use base64 as URL for display
              base64: base64 // Store base64 for Firestore
            };
          }
          
          // If photo has a blob URL, convert it to base64
          if (photo.url && photo.url.startsWith('blob:')) {
            try {
              const base64 = await blobUrlToBase64(photo.url);
              return {
                id: photo.id,
                name: photo.name,
                url: base64, // Use base64 as URL for display
                base64: base64 // Store base64 for Firestore
              };
            } catch (error) {
              console.error('Error converting blob URL to base64:', error);
              return photo; // Return as-is if conversion fails
            }
          }
          
          // If photo already has base64, use it
          if (photo.base64) {
            return {
              id: photo.id,
              name: photo.name,
              url: photo.base64,
              base64: photo.base64
            };
          }
          
          return photo;
        })
      );
      
      const updatedPhotos = [...uploadedPhotos, ...photosWithBase64];
    await updatePhotos(updatedPhotos);
    setShowPreviewModal(false);
    setPendingPhotos([]);
      
      // Clean up blob URLs
      pendingPhotos.forEach(photo => {
        if (photo.url && photo.url.startsWith('blob:')) {
          URL.revokeObjectURL(photo.url);
        }
      });
    
    // Update current step but stay on photos page (no navigation)
    if (actions.setCurrentStep) {
      await actions.setCurrentStep('photos');
      }
    } catch (error) {
      console.error('Error confirming photos:', error);
      alert('Error processing photos. Please try again.');
    }
  };

  // Handle canceling the pending photos
  const handleCancelPhotos = () => {
    // Clean up object URLs to prevent memory leaks
    pendingPhotos.forEach(photo => URL.revokeObjectURL(photo.url));
    setPendingPhotos([]);
    setShowPreviewModal(false);
  };

  // Helper function to ensure we have a valid draftId and save photos to Firebase
  const ensureDraftAndSave = async (photosData, targetRoute = '/pages/titledescription') => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // Convert photos to base64 if needed
    let photosToSave = [];
    if (photosData.length > 0) {
      try {
        photosToSave = await Promise.all(
          photosData.map(async (photo) => ({
            id: photo.id,
            name: photo.name,
            base64: photo.base64 || (photo.file ? await fileToBase64(photo.file) : photo.url)
          }))
        );
      } catch (error) {
        console.error('📍 Photos: Error converting photos to base64:', error);
        // Fallback to summary if conversion fails
        photosToSave = photosData.map(photo => ({
          id: photo.id,
          name: photo.name,
          url: photo.url
        }));
      }
    }
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
      console.log('📍 Photos: Found temp ID, resetting to find/create real draft');
      draftIdToUse = null;
    }
    
    // If user is authenticated, ensure we have a draft
    if (!draftIdToUse && state.user?.uid) {
      try {
        const { getUserDrafts, saveDraft } = await import('@/pages/Host/services/draftService');
        const drafts = await getUserDrafts();
        
        if (drafts.length > 0) {
          // Use the most recent draft
          draftIdToUse = drafts[0].id;
          console.log('📍 Photos: Using existing draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          console.log('📍 Photos: No existing drafts, creating new draft');
          const nextStep = targetRoute === '/pages/titledescription' ? 'titledescription' : 'photos';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              photos: photosToSave
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          console.log('📍 Photos: ✅ Created new draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        console.error('📍 Photos: Error finding/creating draft:', error);
        throw error;
      }
    }
    
    // Save to Firebase if we have a valid draftId
    if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
      try {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          // Update existing document - save photos and currentStep
          const nextStep = targetRoute === '/pages/titledescription' ? 'titledescription' : 'photos';
          await updateDoc(draftRef, {
            'data.photos': photosToSave,
            currentStep: nextStep,
            lastModified: new Date()
          });
          console.log('📍 Photos: ✅ Saved photos and currentStep to Firebase:', draftIdToUse, '-', photosToSave.length, 'photos, currentStep:', nextStep);
          console.log('📍 Photos: First photo has base64:', !!photosToSave[0]?.base64);
          console.log('📍 Photos: First photo keys:', photosToSave[0] ? Object.keys(photosToSave[0]) : 'no photos');
        } else {
          // Document doesn't exist, create it
          console.log('📍 Photos: Document not found, creating new one');
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const newDraftData = {
            currentStep: targetRoute === '/pages/titledescription' ? 'titledescription' : 'photos',
            category: state.category || 'accommodation',
            data: {
              photos: photosToSave
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          console.log('📍 Photos: ✅ Created new draft with photos:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        console.error('📍 Photos: ❌ Error saving to Firebase:', error);
        throw error;
      }
    } else if (state.user?.uid) {
      console.warn('📍 Photos: ⚠️ User authenticated but no valid draftId after ensureDraftAndSave');
      throw new Error('Failed to create draft for authenticated user');
    } else {
      console.warn('📍 Photos: ⚠️ User not authenticated, cannot save to Firebase');
      return null;
    }
  };

  // Save photos and navigate
  const saveAndNavigate = async (route, additionalState = {}) => {
    try {
      // Save current photos to context first
      if (actions.updatePhotos) {
        await actions.updatePhotos(uploadedPhotos);
      }
      
      // Save photos to Firebase
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(uploadedPhotos, route);
        console.log('📍 Photos: ✅ Saved photos to Firebase on Next click');
      } catch (saveError) {
        console.error('📍 Photos: Error saving to Firebase on Next:', saveError);
        // Continue navigation even if save fails - data is in context
      }
      
      // Update current step in context based on route
      if (actions.setCurrentStep) {
        const nextStep = route === '/pages/titledescription' ? 'titledescription' : 'photos';
        actions.setCurrentStep(nextStep);
      }
      
      // Determine if going forward or backward based on route
      const isBackward = route === '/pages/amenities';
      if (isBackward) {
        // Going back - update sessionStorage before navigating
        updateSessionStorageBeforeNav('photos');
        } else {
        // Going forward - update sessionStorage for next step
        const nextStep = route === '/pages/titledescription' ? 'titledescription' : 'photos';
        updateSessionStorageBeforeNav('photos', nextStep);
      }
      
      console.log('Photos saved successfully:', uploadedPhotos.length);
      
      // Navigate to the specified route
      navigate(route, {
        state: {
          ...location.state,
          photos: uploadedPhotos,
          draftId: draftIdToUse || state?.draftId || location.state?.draftId,
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
    // Adjust selected index if needed
    if (selectedPhotoIndex >= updatedPhotos.length) {
      setSelectedPhotoIndex(Math.max(0, updatedPhotos.length - 1));
    }
    setOpenMenuIndex(null);
  };

  // Open file picker
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Drag and drop for reordering photos
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverReorder = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropReorder = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const updatedPhotos = [...uploadedPhotos];
    const draggedPhoto = updatedPhotos[draggedIndex];

    // Remove the dragged photo from its original position
    updatedPhotos.splice(draggedIndex, 1);

    // Insert it at the new position
    updatedPhotos.splice(dropIndex, 0, draggedPhoto);

    setUploadedPhotos(updatedPhotos);
    setDraggedIndex(null);
    // Update context
    updatePhotos(updatedPhotos);
  };

  // Move photo functions
  const movePhoto = (fromIndex, toIndex) => {
    const updatedPhotos = [...uploadedPhotos];
    const photoToMove = updatedPhotos[fromIndex];

    updatedPhotos.splice(fromIndex, 1);
    updatedPhotos.splice(toIndex, 0, photoToMove);

    setUploadedPhotos(updatedPhotos);
    updatePhotos(updatedPhotos);
    setOpenMenuIndex(null);
  };

  const movePhotoBackward = (index) => {
    if (index > 0) {
      movePhoto(index, index - 1);
    }
    setOpenMenuIndex(null);
  };

  const movePhotoForward = (index) => {
    if (index < uploadedPhotos.length - 1) {
      movePhoto(index, index + 1);
    }
    setOpenMenuIndex(null);
  };

  const makeCoverPhoto = (index) => {
    if (index !== 0) {
      movePhoto(index, 0);
    }
    setOpenMenuIndex(null);
  };

  // Menu toggle
  const handleMenuToggle = (index) => {
    setOpenMenuIndex(openMenuIndex === index ? null : index);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuIndex !== null) {
        const clickedElement = event.target;
        const isMenuButton = clickedElement.closest('[data-menu-button]');
        const isDropdownMenu = clickedElement.closest('[data-dropdown-menu]');

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
        await actions.updatePhotos(uploadedPhotos);
      }
      
      // Save photos to Firebase
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(uploadedPhotos, '/pages/photos');
        console.log('📍 Photos: ✅ Saved photos to Firebase on Save & Exit');
      } catch (saveError) {
        console.error('📍 Photos: Error saving to Firebase on Save & Exit:', saveError);
        // Continue with save & exit even if Firebase save fails
        }
        
      // Update current step before navigating
      if (actions.setCurrentStep) {
        actions.setCurrentStep('photos');
      }
      
      // Update sessionStorage before Save & Exit navigation
      updateSessionStorageBeforeNav('photos');
        
        // Navigate to dashboard
        navigate('/host/listings', { 
          state: { 
            message: 'Draft saved successfully!',
            draftSaved: true 
          }
        });
      
    } catch (error) {
      console.error('Error in Photos save:', error);
      alert('Failed to save progress: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} customSaveAndExit={handleSaveAndExitClick} />

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        {uploadedPhotos.length > 0 ? (
          /* Preview Layout - Show only the grid when photos are uploaded */
          <div className="max-w-6xl mx-auto">
              {/* Title */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-medium text-gray-900 mb-2">
                    Ta-da! How does this look?
                  </h1>
                  <p className="text-gray-600">
                    Drag to reorder
                  </p>
                </div>
                <button
                  onClick={handleOpenUploadModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Add more photos"
                >
                  <Plus className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Photo Grid Layout - Airbnb Style Masonry Grid */}
              <div>
                    {/* Cover Photo Row - Cover + 1 Normal Card */}
                    {uploadedPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {/* Cover Photo - spans 2 columns */}
                        <div
                          className="col-span-2 relative group"
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, 0)}
                          onDragOver={handleDragOverReorder}
                          onDrop={(e) => handleDropReorder(e, 0)}
                        >
                          <div className={`relative rounded-xl overflow-hidden bg-gray-100 cursor-move transition-opacity ${draggedIndex === 0 ? 'opacity-50' : 'opacity-100'}`}>
                            <div className="aspect-[2/1]">
                              <img
                                src={uploadedPhotos[0].url}
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
                                    disabled={uploadedPhotos.length === 1}
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
                                    onClick={() => removePhoto(uploadedPhotos[0].id)}
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
                        {uploadedPhotos.length > 1 && (
                          <div
                            className="relative group"
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, 1)}
                            onDragOver={handleDragOverReorder}
                            onDrop={(e) => handleDropReorder(e, 1)}
                          >
                            <div className={`relative rounded-md overflow-hidden bg-gray-100 cursor-move transition-opacity ${draggedIndex === 1 ? 'opacity-50' : 'opacity-100'}`}>
                              <div className="aspect-square">
                                <img
                                  src={uploadedPhotos[1].url}
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
                                      disabled={1 === uploadedPhotos.length - 1}
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
                                      onClick={() => removePhoto(uploadedPhotos[1].id)}
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
                    {uploadedPhotos.length > 2 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {uploadedPhotos.slice(2, 8).map((photo, gridIndex) => {
                          const actualIndex = gridIndex + 2;
                          return (
                            <div
                              key={photo.id}
                              className="relative group"
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, actualIndex)}
                              onDragOver={handleDragOverReorder}
                              onDrop={(e) => handleDropReorder(e, actualIndex)}
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
                                        disabled={actualIndex === uploadedPhotos.length - 1}
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

                    {/* Additional Photos (if more than 8) */}
                    {uploadedPhotos.length > 8 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {uploadedPhotos.slice(8).map((photo, extraIndex) => {
                          const actualIndex = extraIndex + 8;
                          return (
                            <div
                              key={photo.id}
                              className="relative group"
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, actualIndex)}
                              onDragOver={handleDragOverReorder}
                              onDrop={(e) => handleDropReorder(e, actualIndex)}
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
                                        disabled={actualIndex === uploadedPhotos.length - 1}
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

                    {/* Add More Photos Button */}
                    <button
                      onClick={handleOpenUploadModal}
                      className="w-full flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-600 font-medium">Add more</span>
                    </button>
              </div>
            </div>
        ) : (
          /* Photo Upload Area - Empty state with camera illustration */
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
                  onClick={handleOpenUploadModal}
                  className="bg-white border border-black text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Add photos
                </button>
                
                <p className="text-gray-500 text-sm mt-4">
                  Choose at least 5 photos
                </p>
              </div>
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
      </main>

      {/* Footer */}
      <OnboardingFooter
        onBack={async () => await saveAndNavigate('/pages/amenities')}
        onNext={async () => {
          if (canProceed) {
            await saveAndNavigate('/pages/titledescription');
          }
        }}
        backText="Back"
        nextText="Next"
        canProceed={canProceed}
      />

      {/* Upload Photos Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          {/* Soft gray transparent overlay to focus on modal - photos page still visible */}
          <div className="absolute inset-0 bg-gray-500/20 pointer-events-auto" onClick={handleCancelPhotos}></div>
          {/* Modal */}
          <div 
            className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-4 flex-1">
              <button
                onClick={handleCancelPhotos}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                  <X className="w-5 h-5 text-gray-600" />
              </button>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Upload photos</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {pendingPhotos.length === 0 
                      ? 'No items selected' 
                      : `${pendingPhotos.length} item${pendingPhotos.length !== 1 ? 's' : ''} selected`}
                </p>
                </div>
              </div>
                <button
                  onClick={() => {
                    // Open file picker to add more photos
                    fileInputRef.current?.click();
                  }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Add more photos"
                >
                <Plus className="w-5 h-5 text-gray-600" />
                </button>
              </div>

            {/* Modal Content - Drop Zone */}
            <div className="flex-1 p-6 overflow-y-auto">
              {pendingPhotos.length === 0 ? (
                // Drop zone when no photos selected
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                    isDragging
                      ? 'border-black bg-gray-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {/* Stacked Images Icon */}
                  <div className="mb-6 flex justify-center">
                    <div className="relative">
                      <Images className="w-16 h-16 text-gray-400" />
                    </div>
                  </div>

                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    Drag and drop
                  </p>
                  <p className="text-gray-600 mb-6">
                    or browse for photos
                  </p>

                  <button
                    onClick={openFilePicker}
                    className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                  >
                    Browse
                  </button>
                </div>
              ) : (
                // Photo grid when photos are selected
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pendingPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-transparent hover:border-gray-300 transition-colors">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                        {/* Remove button */}
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

                  {/* Secondary drop zone for adding more */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-black bg-gray-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <p className="text-sm text-gray-600 mb-3">
                      Drag and drop more photos here or
                    </p>
                    <button
                      onClick={openFilePicker}
                      className="text-sm text-gray-700 hover:text-gray-900 underline font-medium"
                    >
                      browse for more
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t bg-gray-50">
              <button
                onClick={handleCancelPhotos}
                className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Done
              </button>
              
              <button
                onClick={handleConfirmPhotos}
                disabled={pendingPhotos.length === 0}
                className={`px-8 py-2.5 rounded-lg font-medium transition-colors ${
                  pendingPhotos.length > 0
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Photos;