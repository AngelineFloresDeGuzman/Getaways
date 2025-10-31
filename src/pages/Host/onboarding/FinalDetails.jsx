import React, { useState, useEffect } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

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

  const handleAddressChange = (field, value) => {
    setAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Set current step for progress bar when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'finaldetails') {
      console.log('📍 FinalDetails page - Setting currentStep to finaldetails');
      actions.setCurrentStep('finaldetails');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  const canProceed = address.street && address.city && address.province && isBusinessHost !== null;

  // Helper function to ensure we have a valid draftId and save final details to Firebase
  const ensureDraftAndSave = async (finalDetailsData, targetRoute = '/host/hostdashboard') => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
      console.log('📍 FinalDetails: Found temp ID, resetting to find/create real draft');
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
          console.log('📍 FinalDetails: Using existing draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          console.log('📍 FinalDetails: No existing drafts, creating new draft');
          const newDraftData = {
            currentStep: 'completed',
            category: state.category || 'accommodation',
            data: {
              finalDetails: finalDetailsData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          console.log('📍 FinalDetails: ✅ Created new draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        console.error('📍 FinalDetails: Error finding/creating draft:', error);
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
          await updateDoc(draftRef, {
            'data.finalDetails': finalDetailsData,
            currentStep: 'completed',
            lastModified: new Date()
          });
          console.log('📍 FinalDetails: ✅ Saved finalDetails to data.finalDetails and currentStep to Firebase:', draftIdToUse, '- finalDetails:', finalDetailsData, ', currentStep: completed');
        } else {
          // Document doesn't exist, create it
          console.log('📍 FinalDetails: Document not found, creating new one');
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const newDraftData = {
            currentStep: 'completed',
            category: state.category || 'accommodation',
            data: {
              finalDetails: finalDetailsData
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          console.log('📍 FinalDetails: ✅ Created new draft with finalDetails:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        console.error('📍 FinalDetails: ❌ Error saving to Firebase:', error);
        throw error;
      }
    } else if (state.user?.uid) {
      console.warn('📍 FinalDetails: ⚠️ User authenticated but no valid draftId after ensureDraftAndSave');
      throw new Error('Failed to create draft for authenticated user');
    } else {
      console.warn('📍 FinalDetails: ⚠️ User not authenticated, cannot save to Firebase');
      return null;
    }
  };

  // Save & Exit handler
  const handleSaveAndExitClick = async () => {
    console.log('FinalDetails Save & Exit clicked');
    console.log('Current address:', address);
    console.log('Current isBusinessHost:', isBusinessHost);
    
    if (!auth.currentUser) {
      console.error('FinalDetails: No authenticated user');
      alert('Please log in to save your progress');
      return;
    }
    
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('FinalDetails: Setting currentStep to finaldetails');
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
        console.log('📍 FinalDetails: ✅ Saved finalDetails to Firebase on Save & Exit');
      } catch (saveError) {
        console.error('📍 FinalDetails: Error saving to Firebase on Save & Exit:', saveError);
        // Continue with save & exit even if Firebase save fails
      }
      
      // Navigate to dashboard
      navigate('/host/hostdashboard', { 
        state: { 
          message: 'Draft saved successfully!',
          draftSaved: true 
        }
      });
    } catch (error) {
      console.error('Error during save and exit:', error);
      alert('Error saving progress: ' + error.message);
    }
  };

  // Debug: Log the location state
  console.log('FinalDetails - location.state:', location.state);

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader />
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
                        console.log('📍 FinalDetails: ✅ Saved finalDetails to Firebase on Create listing click');
                      } catch (saveError) {
                        console.error('📍 FinalDetails: Error saving to Firebase on Create listing:', saveError);
                        // Continue navigation even if save fails
                      }
                      
                      // Update current step in context
                      if (actions.setCurrentStep) {
                        actions.setCurrentStep('completed');
                      }
                      
                      // Navigate to dashboard
                      navigate('/host/hostdashboard', { 
                        state: { 
                          ...location.state,
                          residentialAddress: address,
                          isBusinessHost: isBusinessHost,
                          draftId: draftIdToUse || state?.draftId || location.state?.draftId,
                          onboardingCompleted: true
                        } 
                      });
                    } catch (error) {
                      console.error('Error saving final details:', error);
                      alert('Error saving progress. Please try again.');
                    }
                  }
                }}
                disabled={!canProceed}
              >
                Create listing
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FinalDetails;