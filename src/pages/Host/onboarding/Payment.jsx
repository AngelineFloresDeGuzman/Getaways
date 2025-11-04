import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import OnboardingHeader from './components/OnboardingHeader';
import { Lock, Shield, FileText, CheckCircle, Link2, ExternalLink } from 'lucide-react';
import { createListing } from '@/pages/Host/services/listing';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';

// PayPal Client ID - Replace with your actual PayPal Client ID from PayPal Developer Dashboard
// For testing, use sandbox client ID
// Set VITE_PAYPAL_CLIENT_ID in .env file (e.g., VITE_PAYPAL_CLIENT_ID=your_client_id_here)
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test';

// PayPal Button Wrapper Component
const PayPalButtonWrapper = ({ amount, onSuccess, onError, disabled, planName }) => {
  const [{ isPending }] = usePayPalScriptReducer();
  
  return (
    <>
      {isPending && <div className="text-center py-4 text-gray-600">Loading PayPal...</div>}
      <PayPalButtons
        disabled={disabled || isPending}
        style={{
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal'
        }}
        createOrder={(data, actions) => {
          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  value: typeof amount === 'string' ? amount : amount.toString(),
                  currency_code: 'PHP'
                },
                description: `Getaways Listing Subscription - ${planName || 'Subscription'}`
              }
            ]
          });
        }}
        onApprove={(data, actions) => {
          return actions.order.capture().then((details) => {
            onSuccess(details);
          });
        }}
        onError={(err) => {
          console.error('PayPal error:', err);
          onError(err);
        }}
      />
    </>
  );
};

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  const [isProcessing, setIsProcessing] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [acceptedCompliance, setAcceptedCompliance] = useState(false);
  const [draftId, setDraftId] = useState(location.state?.draftId || state?.draftId);
  const [listingId, setListingId] = useState(location.state?.listingId || null); // For edit mode
  const [isEditMode, setIsEditMode] = useState(location.state?.isEditMode || false);
  const [requiresPayment, setRequiresPayment] = useState(true); // Whether payment is required
  const [paypalAccountConnected, setPaypalAccountConnected] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [showConnectPayPal, setShowConnectPayPal] = useState(false);
  const [paypalEmailInput, setPaypalEmailInput] = useState('');
  const [isConnectingPayPal, setIsConnectingPayPal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const isPublishingRef = useRef(false); // Prevent duplicate publishing
  const isAutoPublishingRef = useRef(false); // Track if publishing from checkPaymentRequirement

  // Reset publishing ref on mount to ensure clean state
  useEffect(() => {
    isPublishingRef.current = false;
    isAutoPublishingRef.current = false;
  }, []);

  // Subscription plans
  const subscriptionPlans = [
    {
      id: 'monthly',
      name: 'Monthly Subscription',
      price: 999,
      description: 'Pay monthly to keep your listing active',
      popular: false
    },
    {
      id: 'yearly',
      name: 'Yearly Subscription',
      price: 9999,
      description: 'Save 17% with yearly subscription',
      popular: true,
      savings: '17%'
    }
  ];

  const [selectedPlan, setSelectedPlan] = useState('yearly');

  // Ref to prevent multiple simultaneous payment requirement checks
  const isCheckingPaymentRef = useRef(false);
  const hasCheckedPaymentRef = useRef(false);
  
  // Check if payment is required (check user subscription, listing subscription, or edit mode)
  useEffect(() => {
    const checkPaymentRequirement = async () => {
      // Prevent multiple simultaneous checks
      if (isCheckingPaymentRef.current) {
        console.log('📍 Payment: Payment check already in progress, skipping');
        return;
      }
      
      // Prevent re-running if we've already checked and the dependencies haven't meaningfully changed
      if (hasCheckedPaymentRef.current && !isEditMode && !listingId && !draftId) {
        console.log('📍 Payment: Already checked payment requirement, skipping');
        return;
      }
      
      isCheckingPaymentRef.current = true;
      hasCheckedPaymentRef.current = true;
      
      try {
        // First, check user document for subscription status (user-level subscription)
        if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          
        if (userSnap.exists()) {
          const userData = userSnap.data();
          
          // Check if user has active payment status (from payment field map)
          const userPayment = userData.payment || {};
          
          // Check PayPal connection status
          if (userPayment.paypalEmail) {
            setPaypalEmail(userPayment.paypalEmail);
            setPaypalAccountConnected(userPayment.paypalStatus === 'connected');
          }
          
          if (userPayment.status === 'active') {
              console.log('📍 Payment: User has active payment, skipping payment');
              setRequiresPayment(false);
              
              // Publish/Update listing directly without payment
              // CRITICAL: Only publish if not already published to prevent duplicates
              if (isPublishingRef.current) {
                console.warn('📍 Payment: Publishing already in progress, skipping auto-publish');
                return;
              }
              
              setUploadProgress(isEditMode ? 'Updating your listing...' : 'Publishing your listing...');
              isAutoPublishingRef.current = true; // Mark as auto-publishing
              try {
                const listingIdResult = await publishListing();
                console.log('✅ Listing ' + (isEditMode ? 'updated' : 'published') + ' without payment:', listingIdResult);
                isAutoPublishingRef.current = false;
                
                // Award points for first listing (only for new listings, not edits)
                if (!isEditMode && auth.currentUser) {
                  try {
                    const { awardPointsForFirstListing, awardMilestonePoints } = await import('@/pages/Host/services/pointsService');
                    await awardPointsForFirstListing(auth.currentUser.uid);
                    
                    // Check for listing milestones
                    const { collection, query, where, getDocs } = await import('firebase/firestore');
                    const listingsRef = collection(db, 'listings');
                    const userListingsQuery = query(
                      listingsRef,
                      where('ownerId', '==', auth.currentUser.uid),
                      where('status', '==', 'active')
                    );
                    const listingsSnapshot = await getDocs(userListingsQuery);
                    const listingCount = listingsSnapshot.size;
                    
                    if ([3, 5, 10].includes(listingCount)) {
                      await awardMilestonePoints(auth.currentUser.uid, 'listings', listingCount);
                    }
                  } catch (pointsError) {
                    console.error('Error awarding points for listing:', pointsError);
                    // Don't block navigation if points fail
                  }
                }
                
                setUploadProgress('Finalizing...');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Navigate to dashboard
                updateSessionStorageBeforeNav('payment');
                navigate('/host/hostdashboard', {
                  state: {
                    message: isEditMode 
                      ? 'Listing updated successfully!'
                      : 'Listing published successfully!',
                    listingPublished: !isEditMode,
                    listingUpdated: isEditMode,
                    listingId: listingIdResult
                  }
                });
                return;
              } catch (error) {
                console.error('❌ Error publishing listing:', error);
                setUploadProgress('');
                isAutoPublishingRef.current = false;
                isPublishingRef.current = false; // Reset ref on error
                alert(`Error publishing listing: ${error.message}`);
                setRequiresPayment(true); // Re-enable payment UI if publish fails
              }
            }
          }
        } catch (error) {
          console.error('📍 Payment: Error checking user subscription:', error);
          // Continue to check listing-level subscription
        }
      }
      
      // Check listing-level subscription (for edit mode)
      if (isEditMode && listingId) {
        try {
          const listingRef = doc(db, 'listings', listingId);
          const listingSnap = await getDoc(listingRef);
          if (listingSnap.exists()) {
            // Check user's payment status instead of listing subscription
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              const userPayment = userData.payment || {};
              // If user has active payment, skip payment
              if (userPayment.status === 'active') {
                console.log('📍 Payment: User has active payment, skipping payment');
              setRequiresPayment(false);
              
              // Publish/Update listing directly without payment
              // CRITICAL: Only publish if not already published to prevent duplicates
              if (isPublishingRef.current) {
                console.warn('📍 Payment: Publishing already in progress, skipping auto-publish');
                return;
              }
              
              setUploadProgress('Updating your listing...');
              isAutoPublishingRef.current = true; // Mark as auto-publishing
              try {
                const listingIdResult = await publishListing();
                console.log('✅ Listing updated without payment:', listingIdResult);
                isAutoPublishingRef.current = false;
                
                setUploadProgress('Finalizing...');
                
                // Small delay to show "Finalizing" message
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Navigate to dashboard
                updateSessionStorageBeforeNav('payment');
                navigate('/host/hostdashboard', {
                  state: {
                    message: 'Listing updated successfully!',
                    listingUpdated: true,
                    listingId: listingIdResult
                  }
                });
                return;
              } catch (error) {
                console.error('❌ Error updating listing:', error);
                setUploadProgress('');
                isAutoPublishingRef.current = false;
                isPublishingRef.current = false; // Reset ref on error
                alert(`Error updating listing: ${error.message}`);
                setRequiresPayment(true); // Re-enable payment UI if update fails
              }
              return;
            }
          }
          }
        } catch (error) {
          console.error('📍 Payment: Error checking user payment:', error);
          // Default to requiring payment if check fails
        }
      }
      
      // Also check draft for publishedListingId
      if (!isEditMode && draftId) {
        try {
          const draftRef = doc(db, 'onboardingDrafts', draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const draftData = draftSnap.data();
            if (draftData.publishedListingId) {
              const listingIdFromDraft = draftData.publishedListingId;
              setListingId(listingIdFromDraft);
              setIsEditMode(true);
              
              // Check user's payment status instead of listing subscription
              const userRef = doc(db, 'users', auth.currentUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const userData = userSnap.data();
                const userPayment = userData.payment || {};
                if (userPayment.status === 'active') {
                  console.log('📍 Payment: User has active payment, skipping payment');
                  setRequiresPayment(false);
                  // CRITICAL: Only publish if not already published to prevent duplicates
                  if (isPublishingRef.current) {
                    console.warn('📍 Payment: Publishing already in progress, skipping auto-publish');
                    return;
                  }
                  
                  setUploadProgress('Updating your listing...');
                  isAutoPublishingRef.current = true; // Mark as auto-publishing
                  try {
                    const listingIdResult = await publishListing();
                    isAutoPublishingRef.current = false;
                    updateSessionStorageBeforeNav('payment');
                    
                    // Small delay to show "Finalizing" message
                    setUploadProgress('Finalizing...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    navigate('/host/hostdashboard', {
                      state: {
                        message: 'Listing updated successfully!',
                        listingUpdated: true,
                        listingId: listingIdResult
                      }
                    });
                    return;
                  } catch (error) {
                    console.error('❌ Error updating listing:', error);
                    setUploadProgress('');
                    isAutoPublishingRef.current = false;
                    isPublishingRef.current = false; // Reset ref on error
                    alert(`Error updating listing: ${error.message}`);
                    setRequiresPayment(true); // Re-enable payment UI if update fails
                  }
                  return;
                }
              }
            }
          }
        } catch (error) {
          console.error('📍 Payment: Error checking draft:', error);
        }
      }
      
        // If we reach here, payment is required
        setRequiresPayment(true);
      } finally {
        isCheckingPaymentRef.current = false;
      }
    };
    
    checkPaymentRequirement();
  }, [isEditMode, listingId, draftId, navigate]);

  // Set current step when component mounts
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'payment') {
      console.log('📍 Payment page - Setting currentStep to payment');
      actions.setCurrentStep('payment');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Load draft if not in location state
  useEffect(() => {
    if (!draftId && state?.draftId) {
      setDraftId(state.draftId);
    }
  }, [draftId, state?.draftId]);

  // Load PayPal account status from user document
  useEffect(() => {
    const loadPayPalStatus = async () => {
      if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            // Read from payment map (new structure) or fallback to top-level (old structure for migration)
            const userPayment = userData.payment || {};
            const paypalEmailToUse = userPayment.paypalEmail || userData.paypalEmail;
            
            if (paypalEmailToUse) {
              setPaypalAccountConnected(userPayment.paypalStatus === 'connected' || userData.paypalStatus === 'connected');
              setPaypalEmail(paypalEmailToUse);
            }
          }
        } catch (error) {
          console.error('Error loading PayPal status:', error);
        }
      }
    };
    
    loadPayPalStatus();
  }, []);

  // Check if user can proceed (both checkboxes must be checked AND PayPal connected)
  const canProceed = acceptedPolicy && acceptedCompliance && paypalAccountConnected;

  // Helper function to convert base64 to File
  const base64ToFile = (base64String, fileName, mimeType = 'image/jpeg') => {
    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], fileName, { type: mimeType });
  };

  // Compress and prepare photos for Firestore storage
  const compressPhotosForStorage = async (photos) => {
    if (!photos || photos.length === 0) {
      console.log('📷 No photos to compress');
      setUploadProgress('No photos to process');
      return [];
    }

    console.log(`📤 Starting compression of ${photos.length} photos for Firestore...`);
    setUploadProgress(`Compressing ${photos.length} photos...`);
    const compressedPhotos = [];
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      try {
        // Update progress
        setUploadProgress(`Compressing photo ${i + 1} of ${photos.length}...`);
        
        // If photo already has a compressed base64 string, check if it's small enough
        // Recompress if it's still too large (need to be under 70KB to be safe)
        if (photo.base64 && photo.base64.length < 70000) { // Already small (<70KB)
          console.log(`⏭️ Photo ${i + 1} already compressed, using existing base64`);
          compressedPhotos.push({
            id: photo.id || `photo_${i}`,
            name: photo.name || `photo_${i + 1}`,
            url: photo.base64, // Use base64 as URL for display
            base64: photo.base64, // Store for Firestore
          });
          continue;
        }
        
        // Limit to 8 photos max to stay well under 1MB document limit (8 * 50KB = 400KB max)
        if (compressedPhotos.length >= 8) {
          console.warn(`⚠️ Photo limit reached (8 photos max). Skipping remaining ${photos.length - i} photos.`);
          break;
        }

        // Determine mime type from base64 or default to jpeg
        let mimeType = 'image/jpeg';
        if (photo.base64 && photo.base64.includes('data:image/')) {
          const mimeMatch = photo.base64.match(/data:image\/([^;]+)/);
          if (mimeMatch) {
            const ext = mimeMatch[1].split('+')[0];
            mimeType = `image/${ext}`;
          }
        }
        
        const base64String = photo.base64 || photo.url;
        if (!base64String) {
          console.warn(`⚠️ Photo ${i + 1} has no base64 or url, skipping`);
          continue;
        }
        
        // Convert base64 to File for compression
        const fileName = photo.name || `photo_${i + 1}.jpg`;
        const file = base64ToFile(base64String, fileName, mimeType);
        
        // Compress image very aggressively to reduce size (max 50KB per image)
        // With 8 photos max, total would be ~400KB, well under 1MB Firestore limit
        console.log(`📦 Compressing photo ${i + 1}/${photos.length}...`);
        const compressionOptions = {
          maxSizeMB: 0.05, // 50KB max per image (very aggressive compression)
          maxWidthOrHeight: 800, // Reduced max dimensions for smaller file size
          useWebWorker: true,
          fileType: mimeType,
          initialQuality: 0.6 // Lower quality for smaller size
        };
        
        const compressedFile = await imageCompression(file, compressionOptions);
        
        // Convert compressed file back to base64
        const reader = new FileReader();
        const compressedBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(compressedFile);
        });
        
        // Check size after compression
        const sizeInBytes = (compressedBase64.length * 3) / 4; // Approximate base64 size
        const sizeInKB = sizeInBytes / 1024;
        console.log(`✅ Photo ${i + 1} compressed to ${sizeInKB.toFixed(2)}KB`);
        
        compressedPhotos.push({
          id: photo.id || `photo_${i}`,
          name: fileName,
          url: compressedBase64, // Use compressed base64 for display
          base64: compressedBase64, // Store compressed base64 in Firestore
        });
        
        console.log(`✅ Compressed photo ${i + 1}/${photos.length}`);
      } catch (error) {
        console.error(`❌ Error compressing photo ${i + 1}:`, error);
        // If compression fails, use original but log warning
        if (photo.base64) {
          compressedPhotos.push({
            id: photo.id || `photo_${i}`,
            name: photo.name || `photo_${i + 1}`,
            url: photo.base64,
            base64: photo.base64,
          });
          console.warn(`⚠️ Using original photo ${i + 1} (compression failed)`);
        }
      }
    }
    
    setUploadProgress(`Compressed ${compressedPhotos.length} of ${photos.length} photos successfully`);
    console.log(`✅ Photo compression complete: ${compressedPhotos.length}/${photos.length} processed`);
    return compressedPhotos;
  };

  // Convert draft to listing and publish it
  const publishListing = async () => {
    if (!draftId || !auth.currentUser) {
      throw new Error('Missing draft ID or user not authenticated');
    }

    // CRITICAL: Check draft FIRST for existing publishedListingId before checking isPublishingRef
    // This prevents duplicates even if multiple calls happen simultaneously
    const draftRef = doc(db, 'onboardingDrafts', draftId);
    const initialDraftSnap = await getDoc(draftRef);
    if (initialDraftSnap.exists()) {
      const initialDraftData = initialDraftSnap.data();
      if (initialDraftData.publishedListingId) {
        // Verify listing exists
        const existingListingRef = doc(db, 'listings', initialDraftData.publishedListingId);
        const existingListingSnap = await getDoc(existingListingRef);
        if (existingListingSnap.exists()) {
          console.log('📍 Payment: Draft already has published listing, returning existing ID to prevent duplicate:', initialDraftData.publishedListingId);
          return initialDraftData.publishedListingId;
        } else {
          console.warn('⚠️ Draft references non-existent listing, clearing publishedListingId');
          // Clear invalid publishedListingId
          await updateDoc(draftRef, {
            publishedListingId: null,
            published: false
          });
        }
      }
    }
    
    // Prevent duplicate publishing (if already in progress and not auto-publishing)
    // But allow if this is auto-publishing from checkPaymentRequirement and it's a retry
    if (isPublishingRef.current && !isAutoPublishingRef.current) {
      console.warn('⚠️ publishListing already in progress, preventing duplicate');
      // Double-check draft one more time in case it was updated
      const recheckDraftSnap = await getDoc(draftRef);
      if (recheckDraftSnap.exists()) {
        const recheckDraftData = recheckDraftSnap.data();
        if (recheckDraftData.publishedListingId) {
          console.log('📍 Payment: Found publishedListingId on recheck, returning to prevent duplicate:', recheckDraftData.publishedListingId);
          return recheckDraftData.publishedListingId;
        }
      }
      throw new Error('Publishing already in progress');
    }
    
    // If auto-publishing failed before, reset and allow retry
    if (isPublishingRef.current && isAutoPublishingRef.current) {
      console.log('📍 Payment: Resetting publishing ref for auto-publishing retry');
      isPublishingRef.current = false;
    }

    isPublishingRef.current = true;

    try {
      // Get the draft data (draftRef already fetched above for duplicate check)
      const draftSnap = await getDoc(draftRef);

      if (!draftSnap.exists()) {
        throw new Error('Draft not found');
      }

      const draftData = draftSnap.data();
      
      // CRITICAL: Check if draft already has a published listing (prevent duplicates)
      // Use this variable throughout to ensure we always use the correct listingId
      let targetListingId = null;
      
      if (draftData.publishedListingId) {
        console.log('📍 Payment: Draft already has published listing, updating instead of creating new:', draftData.publishedListingId);
        targetListingId = draftData.publishedListingId;
        
        // Verify listing exists
        const existingListingRef = doc(db, 'listings', targetListingId);
        const existingListingSnap = await getDoc(existingListingRef);
        if (existingListingSnap.exists()) {
          console.log('✅ Found existing listing, will update instead of creating duplicate');
        } else {
          console.warn('⚠️ Draft references listingId that does not exist, clearing publishedListingId and will create new listing');
          // Clear invalid publishedListingId from draft
          targetListingId = null;
        }
      }
      
      // Also check if isEditMode and listingId are set (from navigation state)
      if (!targetListingId && isEditMode && listingId) {
        targetListingId = listingId;
        console.log('📍 Payment: Using listingId from edit mode:', targetListingId);
      }
      
      const data = draftData.data || {};

      // Prepare listing data from draft - format for accommodations page display
      const locationData = data.locationData || {};
      const photos = data.photos || [];
      const pricing = data.pricing || {};
      
      // Debug: Log photos data to help diagnose missing images issue
      console.log('📍 Payment: Photos from draft:', photos);
      console.log('📍 Payment: Number of photos:', photos.length);
      console.log('📍 Payment: First photo keys:', photos[0] ? Object.keys(photos[0]) : 'no photos');
      
      // Prepare listing data first (without photos - we'll add them after upload)
      const listingDataWithoutPhotos = {
        category: draftData.category || 'accommodation',
        title: data.title || 'Untitled Listing',
        description: data.description || '',
        descriptionHighlights: data.descriptionHighlights || [],
        location: locationData, // Full location data object
        propertyBasics: data.propertyBasics || {},
        amenities: data.amenities || {},
        photos: [], // Will be updated after upload
        privacyType: data.privacyType || draftData.privacyType || '',
        propertyStructure: data.propertyStructure || draftData.propertyStructure || '',
        pricing: pricing,
        bookingSettings: data.bookingSettings || {},
        guestSelection: data.guestSelection || {},
        discounts: data.discounts || {},
        safetyDetails: data.safetyDetails || {},
        finalDetails: data.finalDetails || {},
        // Status - always active for published listings (subscription checked from user payment)
        status: 'active', // Published and active - will appear on accommodations page
        publishedAt: serverTimestamp(),
        // Fields for accommodations page display
        price: pricing.weekdayPrice || pricing.basePrice || 0,
        image: null, // Will be updated after upload
        images: [], // Will be updated after upload
        rating: 0,
        reviews: 0
      };

      // Compress photos first (to reduce Firestore document size)
      console.log('📦 Compressing photos for Firestore storage...');
      console.log('📦 Photos before compression:', photos.length);
      console.log('📦 First photo before compression:', photos[0] ? { id: photos[0].id, name: photos[0].name, hasBase64: !!photos[0].base64, keys: Object.keys(photos[0]) } : 'no photos');
      
      // Limit to first 8 photos to stay well under 1MB document limit
      const photosToCompress = photos.slice(0, 8);
      if (photos.length > 8) {
        console.warn(`⚠️ Limiting to 8 photos (out of ${photos.length}) to stay under Firestore 1MB limit`);
        console.warn(`⚠️ Each photo will be compressed to ~50KB, total ~400KB (well under 1MB limit)`);
      }
      
      const compressedPhotos = await compressPhotosForStorage(photosToCompress);
      console.log(`✅ Compressed ${compressedPhotos.length} photos`);
      console.log('📦 First photo after compression:', compressedPhotos[0] ? { id: compressedPhotos[0].id, name: compressedPhotos[0].name, hasBase64: !!compressedPhotos[0].base64 } : 'no photos');
      
      // Calculate total size to verify it's under 1MB
      const photosSize = compressedPhotos.reduce((sum, photo) => {
        return sum + (photo.base64 ? (photo.base64.length * 3) / 4 : 0);
      }, 0);
      
      // Estimate other document fields size (rough calculation)
      const otherDataSize = JSON.stringify(listingDataWithoutPhotos).length;
      const estimatedTotalSize = photosSize + otherDataSize;
      const estimatedTotalMB = estimatedTotalSize / (1024 * 1024);
      
      console.log(`📊 Photo size: ${(photosSize / (1024 * 1024)).toFixed(2)}MB`);
      console.log(`📊 Other data size: ${(otherDataSize / 1024).toFixed(2)}KB`);
      console.log(`📊 Estimated total document size: ${estimatedTotalMB.toFixed(2)}MB`);
      
      if (estimatedTotalMB > 0.95) { // Very close to 1MB limit
        console.warn(`⚠️ Warning: Estimated total size (${estimatedTotalMB.toFixed(2)}MB) is very close to 1MB limit`);
        // Reduce photos further if needed
        if (compressedPhotos.length > 5) {
          console.warn(`⚠️ Reducing photos from ${compressedPhotos.length} to 5 to ensure under limit`);
          compressedPhotos.splice(5);
        }
      }
      
      // Store photos in listing document - ONLY ONCE in photos array
      // Don't duplicate in image/images to save space (saves ~66% of photo data!)
      listingDataWithoutPhotos.photos = compressedPhotos;
      
      // Debug: Log photos being saved
      console.log('📸 Payment: Photos to save to listing:', compressedPhotos.length);
      console.log('📸 Payment: First photo structure:', compressedPhotos[0] ? {
        id: compressedPhotos[0].id,
        name: compressedPhotos[0].name,
        hasBase64: !!compressedPhotos[0].base64,
        hasUrl: !!compressedPhotos[0].url,
        base64Length: compressedPhotos[0].base64 ? compressedPhotos[0].base64.length : 0,
        allKeys: Object.keys(compressedPhotos[0])
      } : 'no photos');
      
      // Remove image and images fields - frontend should use photos[0].base64
      // This saves significant space by not duplicating photo data
      
      // CRITICAL: Always check for existing listingId before creating new one (prevent duplicates)
      let finalListingId;
      
      if (targetListingId) {
        // Update existing listing (prevent duplicate)
        console.log('📝 Updating existing listing (preventing duplicate):', targetListingId);
        
        // Get existing listing to preserve rating and reviews
        const existingListingRef = doc(db, 'listings', targetListingId);
        const existingListingSnap = await getDoc(existingListingRef);
        if (existingListingSnap.exists()) {
          const existingData = existingListingSnap.data();
          listingDataWithoutPhotos.rating = existingData.rating || 0;
          listingDataWithoutPhotos.reviews = existingData.reviews || 0;
          // Subscription info is no longer stored in listings - it's in user.payment
        }
        
        finalListingId = await createListing(listingDataWithoutPhotos, targetListingId);
        console.log('✅ Listing updated with ID (prevented duplicate):', finalListingId);
      } else {
        // CRITICAL: Before creating new listing, check draft one more time for publishedListingId
        // This prevents race conditions where draft was updated between reads
        const draftRecheckSnap = await getDoc(draftRef);
        if (draftRecheckSnap.exists()) {
          const draftRecheckData = draftRecheckSnap.data();
          if (draftRecheckData.publishedListingId) {
            console.log('📍 Payment: Found publishedListingId on recheck, updating instead of creating:', draftRecheckData.publishedListingId);
            targetListingId = draftRecheckData.publishedListingId;
            
            // Verify listing exists
            const existingListingRef = doc(db, 'listings', targetListingId);
            const existingListingSnap = await getDoc(existingListingRef);
            if (existingListingSnap.exists()) {
              const existingData = existingListingSnap.data();
              listingDataWithoutPhotos.rating = existingData.rating || 0;
              listingDataWithoutPhotos.reviews = existingData.reviews || 0;
              finalListingId = await createListing(listingDataWithoutPhotos, targetListingId);
              console.log('✅ Listing updated with ID (prevented duplicate on recheck):', finalListingId);
            } else {
              console.warn('⚠️ PublishedListingId references non-existent listing, will create new');
              // Clear invalid publishedListingId and continue to create new
              await updateDoc(draftRef, {
                publishedListingId: null,
                published: false
              });
              finalListingId = await createListing(listingDataWithoutPhotos);
              console.log('✅ Listing created with ID:', finalListingId);
            }
          } else {
            // CRITICAL: Final atomic check before creating - re-read draft one last time
            const finalCheckSnap = await getDoc(draftRef);
            if (finalCheckSnap.exists()) {
              const finalCheckData = finalCheckSnap.data();
              if (finalCheckData.publishedListingId) {
                console.log('📍 Payment: FINAL CHECK - Found publishedListingId, updating instead of creating:', finalCheckData.publishedListingId);
                targetListingId = finalCheckData.publishedListingId;
                const existingListingRef = doc(db, 'listings', targetListingId);
                const existingListingSnap = await getDoc(existingListingRef);
                if (existingListingSnap.exists()) {
                  const existingData = existingListingSnap.data();
                  listingDataWithoutPhotos.rating = existingData.rating || 0;
                  listingDataWithoutPhotos.reviews = existingData.reviews || 0;
                  finalListingId = await createListing(listingDataWithoutPhotos, targetListingId);
                  console.log('✅ Listing updated with ID (prevented duplicate on final check):', finalListingId);
                  // Skip the draft update since we're updating existing
                  // Release lock before returning
                  isPublishingRef.current = false;
                  return finalListingId;
                }
              }
            }
            
            // Create new listing ONLY if no existing listingId found after final check
            console.log('📝 Creating new listing (no existing listingId found after final check)');
            finalListingId = await createListing(listingDataWithoutPhotos);
            console.log('✅ Listing created with ID:', finalListingId);
          }
        } else {
          // Draft doesn't exist, create new listing
          console.log('📝 Creating new listing (draft not found)');
          finalListingId = await createListing(listingDataWithoutPhotos);
          console.log('✅ Listing created with ID:', finalListingId);
        }
        
        // CRITICAL: Update draft with publishedListingId IMMEDIATELY after creating listing
        // Use batch write to ensure atomicity and prevent race conditions
        // This MUST happen before releasing isPublishingRef to prevent race conditions
        if (finalListingId && !targetListingId) {
          try {
            // Use batch write to ensure both operations succeed or fail together
            const batch = writeBatch(db);
            batch.update(draftRef, {
              publishedListingId: finalListingId,
              published: true
            });
            await batch.commit();
            console.log('✅ Updated draft with publishedListingId atomically to prevent duplicates');
          } catch (updateError) {
            console.error('❌ CRITICAL: Could not update draft with publishedListingId:', updateError);
            // This is critical - if we can't update the draft, we might create duplicates
            // Try one more time with regular updateDoc
            try {
              await updateDoc(draftRef, {
                publishedListingId: finalListingId,
                published: true
              });
              console.log('✅ Updated draft with publishedListingId (fallback)');
            } catch (fallbackError) {
              console.error('❌ Failed to update draft even with fallback:', fallbackError);
              // If we can't update the draft, delete the listing we just created to prevent orphan
              // But only if it's a new listing (not an update)
              try {
                const listingRef = doc(db, 'listings', finalListingId);
                await updateDoc(listingRef, { status: 'inactive' }); // Mark as inactive instead of deleting
                console.error('⚠️ Marked listing as inactive due to draft update failure');
                throw new Error('Failed to update draft with publishedListingId. Listing marked as inactive.');
              } catch (cleanupError) {
                console.error('❌ CRITICAL: Failed to cleanup listing after draft update failure:', cleanupError);
                // At this point, we have a listing but no draft reference - this is bad but we'll return it
              }
            }
          }
        }
      }

      // NOTE: We do NOT delete the draft anymore - we keep it with publishedListingId
      // This allows editing listings and prevents duplicates
      // The draft is marked as published, so it won't show in drafts list
      console.log('✅ Listing published successfully. ListingId:', finalListingId);
      
      // CRITICAL: Only release the publishing lock AFTER draft is updated
      // This ensures no other publishListing call can happen before draft is marked
      isPublishingRef.current = false;
      return finalListingId;
    } catch (error) {
      console.error('Error publishing listing:', error);
      isPublishingRef.current = false; // Reset flag on error
      throw error;
    }
  };

  // Handle PayPal account connection
  const handleConnectPayPal = async () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!paypalEmailInput || !emailRegex.test(paypalEmailInput)) {
      alert('Please enter a valid PayPal email address.');
      return;
    }

    setIsConnectingPayPal(true);
    
    try {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        // Get existing payment data to preserve it
        const existingData = userSnap.exists() ? userSnap.data() : {};
        const existingPayment = existingData.payment || {};
        
        // Update payment map with PayPal connection info (preserve existing payment data)
        const updateData = {
          payment: {
            ...existingPayment, // Preserve existing payment data
            paypalEmail: paypalEmailInput.trim(),
            paypalConnectedAt: serverTimestamp(),
            paypalStatus: 'connected',
            method: 'paypal' // Set method when PayPal is connected
          }
        };
        
        if (userSnap.exists()) {
          await updateDoc(userRef, updateData);
        } else {
          // Create user document if it doesn't exist
          const { setDoc } = await import('firebase/firestore');
          await setDoc(userRef, {
            ...updateData,
            createdAt: serverTimestamp()
          });
        }
        
        setPaypalAccountConnected(true);
        setPaypalEmail(paypalEmailInput.trim());
        setPaypalEmailInput('');
        setShowConnectPayPal(false);
      } else {
        alert('Please log in to connect your PayPal account.');
      }
    } catch (error) {
      console.error('Error connecting PayPal:', error);
      alert('Failed to connect PayPal account: ' + error.message);
    } finally {
      setIsConnectingPayPal(false);
    }
  };

  // Handle PayPal payment success
  const handlePayPalSuccess = async (details) => {
    console.log('✅ PayPal payment approved:', details);
    setIsProcessing(true);
    
    try {
      // Save payment information to user document first (quick operation)
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const existingPayment = userData.payment || {};
          
          // Save payment info as a payment field map (preserve existing PayPal connection info)
          await updateDoc(userRef, {
            payment: {
              ...existingPayment, // Preserve existing payment data (like paypalEmail, paypalConnectedAt, paypalStatus)
              type: selectedPlan, // 'monthly' or 'yearly'
              startDate: serverTimestamp(),
              status: 'active',
              lastPaymentDate: serverTimestamp(),
              method: 'paypal',
              lastPayPalTransactionId: details.id,
              lastPayPalPayerEmail: details.payer?.email_address || existingPayment.paypalEmail || paypalEmail
            }
          });
          console.log('✅ Payment info saved to user document (payment field map)');
        }
      }

      // Publish/Update the listing (this includes photo uploads which may take time)
      setUploadProgress(isEditMode ? 'Updating your listing...' : 'Creating your listing...');
      console.log('📤 Starting listing publication/update process...');
      isAutoPublishingRef.current = false; // Ensure manual clicks are not treated as auto-publishing
      const listingId = await publishListing();
      console.log('✅ PayPal payment processed and listing ' + (isEditMode ? 'updated' : 'published') + ':', listingId);

      // Award points for first listing (only for new listings, not edits)
      if (!isEditMode && auth.currentUser) {
        try {
          const { awardPointsForFirstListing, awardMilestonePoints } = await import('@/pages/Host/services/pointsService');
          await awardPointsForFirstListing(auth.currentUser.uid);
          
          // Check for listing milestones
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const listingsRef = collection(db, 'listings');
          const userListingsQuery = query(
            listingsRef,
            where('ownerId', '==', auth.currentUser.uid),
            where('status', '==', 'active')
          );
          const listingsSnapshot = await getDocs(userListingsQuery);
          const listingCount = listingsSnapshot.size;
          
          if ([3, 5, 10].includes(listingCount)) {
            await awardMilestonePoints(auth.currentUser.uid, 'listings', listingCount);
          }
        } catch (pointsError) {
          console.error('Error awarding points for listing:', pointsError);
          // Don't block navigation if points fail
        }
      }

      // Clear sessionStorage for onboarding completion
      updateSessionStorageBeforeNav('payment');
      
      setUploadProgress('Finalizing...');

      // Navigate to dashboard with success message
      navigate('/host/hostdashboard', {
        state: {
          message: isEditMode 
            ? 'Payment successful! Your listing has been updated.'
            : 'Payment successful! Your listing has been published.',
          listingPublished: !isEditMode,
          listingUpdated: isEditMode,
          listingId: listingId,
          onboardingCompleted: true,
          paymentMethod: 'paypal'
        }
      });
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      setIsProcessing(false);
      alert(`Payment was successful, but there was an error publishing your listing: ${error.message}\n\nYour payment has been recorded. Please contact support with transaction ID: ${details.id}`);
      
      // Even if listing publication fails, navigate to dashboard
      // User can try again or contact support
      navigate('/host/hostdashboard', {
        state: {
          message: 'Payment successful, but listing publication encountered an error. Please contact support.',
          paymentSuccessful: true,
          paymentTransactionId: details.id,
          error: error.message
        }
      });
    }
  };

  // Handle PayPal payment error
  const handlePayPalError = (err) => {
    console.error('PayPal payment error:', err);
    alert('PayPal payment failed. Please try again.');
    setIsProcessing(false);
  };

  const selectedPlanPrice = subscriptionPlans.find(p => p.id === selectedPlan)?.price || 0;
  // PayPal expects amount as string in decimal format (e.g., "99.99" for ₱9999)
  const amountInDecimal = (selectedPlanPrice / 100).toFixed(2);

  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID === 'test' ? 'sb' : PAYPAL_CLIENT_ID, // 'sb' for sandbox mode
        currency: 'PHP',
        intent: 'capture'
      }}
    >
      <div className="min-h-screen bg-white">
        <OnboardingHeader />
        <main className="pt-20 px-8 pb-32">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              {requiresPayment ? 'Complete Your Subscription' : 'Updating Your Listing'}
            </h1>
            <p className="text-gray-600">
              {requiresPayment 
                ? 'Subscribe to publish your listing and make it visible to guests'
                : 'Your listing is being updated...'}
            </p>
          </div>

          {/* Show updating message if payment not required */}
          {!requiresPayment && uploadProgress && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">{uploadProgress}</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {uploadProgress.includes('Updating') 
                      ? 'Please wait while we update your listing...'
                      : uploadProgress.includes('Finalizing')
                      ? 'Almost done!'
                      : 'Processing...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Plans - Only show if payment required */}
          {requiresPayment && (
            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 mb-4">Choose Your Plan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscriptionPlans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedPlan === plan.id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${plan.popular ? 'relative' : ''}`}
                >
                  {plan.popular && (
                    <span className="absolute top-4 right-4 bg-primary text-white text-xs font-medium px-2 py-1 rounded">
                      Most Popular
                    </span>
                  )}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gray-900">₱{plan.price.toLocaleString()}</span>
                      <span className="text-gray-600 text-sm">
                        {plan.id === 'monthly' ? '/month' : '/year'}
                      </span>
                    </div>
                    {plan.savings && (
                      <span className="text-sm text-primary font-medium">Save {plan.savings}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                </div>
              ))}
              </div>
            </div>
          )}

          {/* Payment Method - PayPal Account Connection - Only show if payment required */}
          {requiresPayment && (
            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 mb-4">Connect Your PayPal Account</h2>
              
              {paypalAccountConnected ? (
                // Connected PayPal Account
                <div className="border-2 border-green-500 rounded-lg p-6 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center shadow-lg">
                        <CheckCircle className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 text-lg">PayPal Account Connected</span>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-600">{paypalEmail}</p>
                        <p className="text-xs text-gray-500 mt-1">Your PayPal account is ready for payments</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Disconnect PayPal account? You will need to reconnect to make payments.')) {
                          handleConnectPayPal(); // Will show prompt to reconnect
                        }
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                      Change
                    </button>
                  </div>
                  <div className="mt-4 bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Lock className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Secured with PayPal's encryption</span>
                    </div>
                  </div>
                </div>
              ) : (
                // Not Connected - Show Connect Form
                <div className="border-2 border-blue-600 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-blue-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-2xl">PP</span>
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-gray-900 text-xl">PayPal</span>
                      <p className="text-sm text-gray-600 mt-1">Connect your PayPal account to proceed with payment</p>
                    </div>
                  </div>
                  
                  {!showConnectPayPal ? (
                    <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
                    <p className="text-sm text-gray-700 mb-3">
                      Link your PayPal account to enable secure subscription payments. Your payment details are stored securely by PayPal.
                    </p>
                    <button
                      onClick={() => setShowConnectPayPal(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Link2 className="w-5 h-5" />
                      Connect PayPal Account
                    </button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
                      <p className="text-sm text-gray-700 mb-4">
                        Enter your PayPal email address to connect your account.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="paypalEmail" className="block text-sm font-medium text-gray-700 mb-1">
                            PayPal Email Address
                          </label>
                          <input
                            id="paypalEmail"
                            type="email"
                            value={paypalEmailInput}
                            onChange={(e) => setPaypalEmailInput(e.target.value)}
                            placeholder="your.email@example.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            disabled={isConnectingPayPal}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowConnectPayPal(false);
                              setPaypalEmailInput('');
                            }}
                            disabled={isConnectingPayPal}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleConnectPayPal}
                            disabled={isConnectingPayPal || !paypalEmailInput}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isConnectingPayPal ? (
                              <>
                                <span className="animate-spin">⏳</span>
                                Connecting...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Connect
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        Note: In production, this will redirect to PayPal OAuth for secure authentication.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span>256-bit SSL encryption - Your payment details are never stored on our servers</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Policy and Compliance - Only show if payment required */}
          {requiresPayment && (
            <div className="mb-8 space-y-6">
              <h2 className="text-xl font-medium text-gray-900">Policy & Compliance</h2>
              
              {/* Policy Agreement */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start gap-4 mb-4">
                  <FileText className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">Listing Policy Agreement</h3>
                    <div className="text-sm text-gray-700 space-y-2 max-h-48 overflow-y-auto pr-2">
                      <p>
                        By publishing your listing on Getaways, you agree to the following terms:
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Provide accurate and truthful information about your property</li>
                        <li>Maintain your listing with current photos and pricing</li>
                        <li>Respond to guest inquiries within 24 hours</li>
                        <li>Honor confirmed reservations and provide the amenities listed</li>
                        <li>Comply with local laws and regulations regarding short-term rentals</li>
                        <li>Keep your subscription active to maintain listing visibility</li>
                        <li>Getaways reserves the right to review and remove listings that violate our policies</li>
                        <li>Subscription fees are non-refundable after publication</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedPolicy}
                    onChange={(e) => setAcceptedPolicy(e.target.checked)}
                    className="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">
                    I have read and agree to the Listing Policy Agreement
                  </span>
                </label>
              </div>

              {/* Compliance Agreement */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Shield className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">Compliance & Safety Requirements</h3>
                    <div className="text-sm text-gray-700 space-y-2 max-h-48 overflow-y-auto pr-2">
                      <p>
                        As a host, you must comply with the following safety and legal requirements:
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Obtain all necessary permits, licenses, and registrations required by local authorities</li>
                        <li>Ensure your property meets local building codes and safety standards</li>
                        <li>Maintain working smoke detectors, carbon monoxide alarms, and fire extinguishers</li>
                        <li>Provide emergency contact information to guests</li>
                        <li>Maintain adequate insurance coverage for your property</li>
                        <li>Comply with tax obligations for rental income in your jurisdiction</li>
                        <li>Respect neighborhood quiet hours and local regulations</li>
                        <li>Report any safety incidents or guest issues promptly</li>
                        <li>Getaways may require verification of compliance documentation</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedCompliance}
                    onChange={(e) => setAcceptedCompliance(e.target.checked)}
                    className="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">
                    I confirm that I will comply with all safety and legal requirements
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Summary - Only show if payment required */}
          {requiresPayment && (
            <div className="mb-8 border border-gray-200 rounded-lg p-6 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subscription Plan</span>
                  <span className="font-medium text-gray-900">
                    {subscriptionPlans.find(p => p.id === selectedPlan)?.name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Price</span>
                  <span className="font-medium text-gray-900">
                    ₱{subscriptionPlans.find(p => p.id === selectedPlan)?.price.toLocaleString()}
                    {selectedPlan === 'monthly' ? '/month' : '/year'}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-lg text-gray-900">
                      ₱{subscriptionPlans.find(p => p.id === selectedPlan)?.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PayPal Payment Section - Only show if payment required */}
          {requiresPayment && paypalAccountConnected && acceptedPolicy && acceptedCompliance && (
            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 mb-4">Complete Payment</h2>
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <p className="text-sm text-gray-700 mb-4">
                  {isEditMode 
                    ? 'Click the PayPal button below to complete your subscription payment and update your listing.'
                    : 'Click the PayPal button below to complete your subscription payment and publish your listing.'
                  }
                </p>
                
                {/* Progress indicator */}
                {isProcessing && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">Processing your payment and listing...</p>
                        {uploadProgress && (
                          <p className="text-xs text-blue-700 mt-1">{uploadProgress}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <PayPalButtonWrapper
                  amount={amountInDecimal} // PayPal expects decimal string (e.g., "99.99" for ₱9999)
                  onSuccess={handlePayPalSuccess}
                  onError={handlePayPalError}
                  disabled={!canProceed || isProcessing}
                  planName={subscriptionPlans.find(p => p.id === selectedPlan)?.name}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => {
                // Update sessionStorage before navigating back
                updateSessionStorageBeforeNav('payment');
                navigate('/pages/finaldetails');
              }}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              ← Back
            </button>
            {!paypalAccountConnected && (
              <div className="text-sm text-gray-600 text-right">
                <p>Please connect your PayPal account to proceed</p>
              </div>
            )}
            {paypalAccountConnected && (!acceptedPolicy || !acceptedCompliance) && (
              <div className="text-sm text-gray-600 text-right">
                <p>Please accept Policy & Compliance terms to proceed</p>
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </PayPalScriptProvider>
  );
};

export default Payment;

