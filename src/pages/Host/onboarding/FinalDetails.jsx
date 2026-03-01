import React, { useState, useEffect, useRef } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';

const FinalDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [address, setAddress] = useState({
    country: 'Philippines',
    unit: '',
    building: '',
    street: '',
    barangay: '',
    city: '',
    zipCode: '',
    province: ''
  });
  
  const [isBusinessHost, setIsBusinessHost] = useState(null);
  const [isEditMode, setIsEditMode] = useState(location.state?.isEditMode || false);
  const [listingId, setListingId] = useState(location.state?.listingId || null);
  
  // Ref to track initialization
  const hasInitialized = useRef(false);

  const handleAddressChange = (field, value) => {
    setAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Set current step for progress bar when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'finaldetails') {
      actions.setCurrentStep('finaldetails');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Update isEditMode and listingId from location.state when route changes
  useEffect(() => {
    if (location.state?.isEditMode !== undefined) {
      setIsEditMode(location.state.isEditMode);
    }
    if (location.state?.listingId) {
      setListingId(location.state.listingId);
    }
  }, [location.state]);

  // Load final details from Firebase when component mounts or draftId changes
  useEffect(() => {
    const loadFinalDetailsFromFirebase = async () => {
      if (hasInitialized.current) {
        return; // Already initialized
      }

      const draftIdToUse = location.state?.draftId || state?.draftId;
      
      // Skip if no draftId or temp draftId
      if (!draftIdToUse || draftIdToUse.startsWith('temp_')) {
        return;
      }

      try {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          const draftData = docSnap.data();
          // Check for publishedListingId to detect edit mode
          if (draftData.publishedListingId) {
            setIsEditMode(true);
            setListingId(draftData.publishedListingId);
            }
          
          // Check nested data.finalDetails first (where we save it), then context
          const savedFinalDetails = draftData.data?.finalDetails || state.finalDetails;
          
          if (savedFinalDetails) {
            // Extract residentialAddress and isBusinessHost
            if (savedFinalDetails.residentialAddress) {
              setAddress(prev => ({
                ...prev,
                ...savedFinalDetails.residentialAddress
              }));
            }
            
            if (savedFinalDetails.isBusinessHost !== undefined) {
              setIsBusinessHost(savedFinalDetails.isBusinessHost);
            }
            
            // Also update context if it's not set there yet or is different
            if (!state.finalDetails || JSON.stringify(state.finalDetails) !== JSON.stringify(savedFinalDetails)) {
              if (actions.updateFinalDetails) {
                actions.updateFinalDetails(savedFinalDetails);
              }
            }
            
            hasInitialized.current = true;
            return; // Exit early if we found it in Firebase
          } else {
            }
        } else {
          }
      } catch (error) {
        }
    };

    loadFinalDetailsFromFirebase();
  }, [location.state?.draftId, state?.draftId, state.finalDetails, actions]);

  // Initialize from context as fallback (if available from OnboardingContext loadDraft)
  useEffect(() => {
    if (!hasInitialized.current && state.finalDetails) {
      console.log('📍 FinalDetails: Initializing from context (fallback):', state.finalDetails);
      
      if (state.finalDetails.residentialAddress) {
        setAddress(prev => ({
          ...prev,
          ...state.finalDetails.residentialAddress
        }));
      }
      
      if (state.finalDetails.isBusinessHost !== undefined) {
        setIsBusinessHost(state.finalDetails.isBusinessHost);
      }
      
      hasInitialized.current = true;
    }
  }, [state.finalDetails]);

  const canProceed = address.street && address.city && address.province && isBusinessHost !== null;

  // Helper function to ensure we have a valid draftId and save final details to Firebase
  const ensureDraftAndSave = async (finalDetailsData, targetRoute = '/host/hostdashboard') => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
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
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          const nextStep = targetRoute === '/pages/finaldetails' ? 'finaldetails' : 'completed';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              finalDetails: finalDetailsData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        throw error;
      }
    }
    
    // Save to Firebase if we have a valid draftId
    if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
      try {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          // Update existing document - save finalDetails under data.finalDetails and currentStep
          const nextStep = targetRoute === '/pages/finaldetails' ? 'finaldetails' : 'completed';
          await updateDoc(draftRef, {
            'data.finalDetails': finalDetailsData,
            currentStep: nextStep,
            lastModified: new Date()
          });
          } else {
          // Document doesn't exist, create it
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const nextStep = targetRoute === '/pages/finaldetails' ? 'finaldetails' : 'completed';
          const newDraftData = {
            currentStep: nextStep,
            category: state.category || 'accommodation',
            data: {
              finalDetails: finalDetailsData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        throw error;
      }
    } else if (state.user?.uid) {
      throw new Error('Failed to create draft for authenticated user');
    } else {
      return null;
    }
  };

  // Save & Exit handler
  const handleSaveAndExitClick = async () => {
    if (!auth.currentUser) {
      alert('Please log in to save your progress');
      return;
    }
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        actions.setCurrentStep('finaldetails');
      }
      
      // Prepare final details data to save
      const finalDetailsData = {
        residentialAddress: address,
        isBusinessHost: isBusinessHost
      };
      
      // Save final details to Firebase under data.finalDetails
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave(finalDetailsData, '/pages/finaldetails');
        } catch (saveError) {
        // Continue with save & exit even if Firebase save fails
      }
      
      // Navigate to dashboard
      // Update sessionStorage before Save & Exit navigation
      updateSessionStorageBeforeNav('finaldetails');
      
      navigate('/host/listings', { 
        state: { 
          message: 'Draft saved successfully!',
          draftSaved: true 
        }
      });
    } catch (error) {
      alert('Error saving progress: ' + error.message);
    }
  };

  // Debug: Log the location state
  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader customSaveAndExit={handleSaveAndExitClick} />
      <main className="pt-20 px-8 pb-32">
        <div className="mb-12">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            What's your residential address?
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Guests won't see this information.
          </p>
          <div className="space-y-4">
            {/* Country Dropdown */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Country / region</label>
              <select
                value={address.country}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="Philippines">Philippines</option>
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Australia">Australia</option>
              </select>
            </div>
            {/* Unit */}
            <input
              type="text"
              placeholder="Unit, level, etc. (if applicable)"
              value={address.unit}
              onChange={(e) => handleAddressChange('unit', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            {/* Building Name */}
            <input
              type="text"
              placeholder="Building name (if applicable)"
              value={address.building}
              onChange={(e) => handleAddressChange('building', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            {/* Street Address */}
            <input
              type="text"
              placeholder="Street address"
              value={address.street}
              onChange={(e) => handleAddressChange('street', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            {/* Barangay */}
            <input
              type="text"
              placeholder="Barangay / district (if applicable)"
              value={address.barangay}
              onChange={(e) => handleAddressChange('barangay', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            {/* City */}
            <input
              type="text"
              placeholder="City / municipality"
              value={address.city}
              onChange={(e) => handleAddressChange('city', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            {/* ZIP Code */}
            <input
              type="text"
              placeholder="ZIP code"
              value={address.zipCode}
              onChange={(e) => handleAddressChange('zipCode', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            {/* Province */}
            <input
              type="text"
              placeholder="Province"
              value={address.province}
              onChange={(e) => handleAddressChange('province', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        </div>
        {/* Business Hosting Section */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Are you hosting as a business?
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            This means your business is most likely registered with your state or government.{' '}
            <button className="text-black underline hover:no-underline">
              Get details
            </button>
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setIsBusinessHost(true)}
              className={`flex-1 py-3 px-6 rounded-lg border text-center transition-colors ${
                isBusinessHost === true
                  ? 'border-black bg-gray-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setIsBusinessHost(false)}
              className={`flex-1 py-3 px-6 rounded-lg border text-center transition-colors ${
                isBusinessHost === false
                  ? 'border-black bg-gray-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              No
            </button>
          </div>
        </div>
      </main>
      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/safetydetails')}
                className="hover:underline text-sm"
              >
                Back
              </button>
              <button 
                className={`rounded-lg px-6 py-2.5 text-sm font-medium ${
                  canProceed
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={async () => {
                  if (canProceed) {
                    try {
                      // Prepare final details data to save
                      const finalDetailsData = {
                        residentialAddress: address,
                        isBusinessHost: isBusinessHost
                      };
                      
                      // Save final details to Firebase
                      let draftIdToUse;
                      try {
                        draftIdToUse = await ensureDraftAndSave(finalDetailsData, '/host/hostdashboard');
                        } catch (saveError) {
                        // Continue navigation even if save fails
                      }
                      
                      // Check if this is edit mode (has publishedListingId in draft)
                      // isEditMode and listingId are now state variables, but double-check draft just to be sure
                      let currentIsEditMode = isEditMode;
                      let currentListingId = listingId;
                      
                      // Also check draft for publishedListingId (for edit mode) if not already set
                      if (!currentIsEditMode && draftIdToUse) {
                        try {
                          const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
                          const draftSnap = await getDoc(draftRef);
                          if (draftSnap.exists()) {
                            const draftData = draftSnap.data();
                            if (draftData.publishedListingId) {
                              currentIsEditMode = true;
                              currentListingId = draftData.publishedListingId;
                              setIsEditMode(true);
                              setListingId(currentListingId);
                              }
                          }
                        } catch (error) {
                          }
                      }
                      
                      // If edit mode and listing exists, check if it's already paid
                      if (currentIsEditMode && currentListingId) {
                        try {
                          const listingRef = doc(db, 'listings', currentListingId);
                          const listingSnap = await getDoc(listingRef);
                          if (listingSnap.exists()) {
                            const listingData = listingSnap.data();
                            
                            // Check user's payment status instead of listing subscription status
                            // (Subscription info is now stored in user.payment, not in listing)
                            const userRef = doc(db, 'users', auth.currentUser.uid);
                            const userSnap = await getDoc(userRef);
                            const userPayment = userSnap.exists() ? (userSnap.data().payment || {}) : {};
                            
                            if (userPayment.status === 'active' && listingData.status === 'active') {
                              // Update listing directly without payment
                              await ensureDraftAndSave(finalDetailsData, '/host/hostdashboard');
                              
                              // Publish/update listing directly
                              const { createListing } = await import('@/pages/Host/services/listing');
                              const draftRef = doc(db, 'onboardingDrafts', draftIdToUse || state?.draftId);
                              const draftSnap = await getDoc(draftRef);
                              if (draftSnap.exists()) {
                                const draftData = draftSnap.data();
                                const data = draftData.data || {};
                                
                                // Prepare listing data (similar to Payment.jsx publishListing)
                                const locationData = data.locationData || {};
                                const photos = data.photos || [];
                                const pricing = data.pricing || {};
                                
                                const listingDataToSave = {
                                  category: draftData.category || 'accommodation',
                                  title: data.title || 'Untitled Listing',
                                  description: data.description || '',
                                  descriptionHighlights: data.descriptionHighlights || [],
                                  location: locationData,
                                  propertyBasics: data.propertyBasics || {},
                                  amenities: data.amenities || {},
                                  photos: photos,
                                  privacyType: data.privacyType || '',
                                  propertyStructure: data.propertyStructure || '',
                                  pricing: pricing,
                                  bookingSettings: data.bookingSettings || {},
                                  guestSelection: data.guestSelection || {},
                                  discounts: data.discounts || {},
                                  safetyDetails: data.safetyDetails || {},
                                  finalDetails: finalDetailsData,
                                  status: 'active',
                                  rating: listingData.rating || 0,
                                  reviews: listingData.reviews || 0
                                  // Note: Subscription info is no longer stored in listings - it's in user.payment
                                };
                                
                                await createListing(listingDataToSave, currentListingId);
                                // Delete the draft document since listing is now published
                                await deleteDoc(draftRef);
                                }
                              
                              // Navigate directly to dashboard
                              updateSessionStorageBeforeNav('finaldetails', 'payment');
                              setTimeout(() => {
                                if (actions.setCurrentStep) {
                                  actions.setCurrentStep('payment');
                                }
                                navigate('/host/listings', {
                                  state: {
                                    message: 'Listing updated successfully!',
                                    listingUpdated: true,
                                    listingId: currentListingId
                                  }
                                });
                              }, 0);
                              return;
                            }
                          }
                        } catch (error) {
                          // Continue to payment if check fails (better safe than sorry)
                        }
                      }
                      
                      // Update sessionStorage before navigating to payment
                      updateSessionStorageBeforeNav('finaldetails', 'payment');
                      
                      // Defer setCurrentStep to avoid setState during render
                      setTimeout(() => {
                        if (actions.setCurrentStep) {
                          actions.setCurrentStep('payment');
                        }
                        
                        // Navigate to payment page (subscription required before publishing)
                        navigate('/pages/payment', { 
                      state: { 
                        ...location.state,
                            residentialAddress: address,
                            isBusinessHost: isBusinessHost,
                            draftId: draftIdToUse || state?.draftId || location.state?.draftId,
                            isEditMode: currentIsEditMode,
                            listingId: currentListingId,
                            finalDetails: {
                        residentialAddress: address,
                        isBusinessHost: isBusinessHost
                            }
                      } 
                    });
                      }, 0);
                    } catch (error) {
                      alert('Error saving progress. Please try again.');
                    }
                  }
                }}
                disabled={!canProceed}
              >
                {isEditMode ? 'Update listing' : 'Create listing'}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FinalDetails;