import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';

const BathroomTypes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();

  // State for bathroom types with counters
  const [bathroomTypes, setBathroomTypes] = useState({
    privateAttached: 0, // Private and attached
    dedicated: 0,        // Dedicated
    shared: 0           // Shared
  });

  // Load bathroom types from draft if editing
  useEffect(() => {
    const loadBathroomTypes = async () => {
      const draftIdToUse = state?.draftId || location.state?.draftId;
      if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
        try {
          const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const draftData = draftSnap.data();
            const savedBathroomTypes = draftData.data?.bathroomTypes || {};
            if (Object.keys(savedBathroomTypes).length > 0) {
              setBathroomTypes({
                privateAttached: savedBathroomTypes.privateAttached || 0,
                dedicated: savedBathroomTypes.dedicated || 0,
                shared: savedBathroomTypes.shared || 0
              });
              }
          }
        } catch (error) {
          }
      }
    };
    loadBathroomTypes();
  }, [state?.draftId, location.state?.draftId]);

  // Set current step
  useLayoutEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep('bathroomtypes');
    }
  }, [actions]);

  // Handle counter changes
  const handleCounterChange = (type, increment) => {
    setBathroomTypes(prev => {
      const newValue = increment ? prev[type] + 1 : prev[type] - 1;
      const minValue = 0; // Can go down to 0
      return {
        ...prev,
        [type]: Math.max(minValue, newValue)
      };
    });
  };

  // Save bathroom types to Firebase
  const saveBathroomTypes = async () => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    if (!draftIdToUse || draftIdToUse.startsWith('temp_')) {
      return;
    }

    try {
      const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
      const docSnap = await getDoc(draftRef);
      
      if (docSnap.exists()) {
        await updateDoc(draftRef, {
          'data.bathroomTypes': bathroomTypes,
          currentStep: 'occupancy',
          lastModified: new Date()
        });
        }
    } catch (error) {
      throw error;
    }
  };

  // Counter component
  const Counter = ({ label, description, value, type }) => {
    const canDecrement = value > 0;
    
    return (
      <div className="flex items-center justify-between py-6 border-b border-gray-200 last:border-b-0">
        <div className="flex-1">
          <div className="text-lg font-normal text-gray-900 mb-1">{label}</div>
          <div className="text-sm text-gray-600">{description}</div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleCounterChange(type, false)}
            disabled={!canDecrement}
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-lg font-light ${
              canDecrement
                ? 'border-gray-300 text-gray-600 hover:border-gray-400'
                : 'border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
          >
            −
          </button>
          <span className="w-8 text-center text-lg font-normal">{value}</span>
          <button
            onClick={() => handleCounterChange(type, true)}
            className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 flex items-center justify-center text-lg font-light"
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} />

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-[640px] mx-auto">
          <h1 className="text-[32px] font-medium text-gray-900 mb-2">
            What kind of bathrooms are available to guests?
          </h1>

          {/* Bathroom Types Container */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 mt-12">
            <Counter
              label="Private and attached"
              description="It's connected to the guest's room and is just for them."
              value={bathroomTypes.privateAttached}
              type="privateAttached"
            />
            <Counter
              label="Dedicated"
              description="It's private, but accessed via a shared space, like a hallway."
              value={bathroomTypes.dedicated}
              type="dedicated"
            />
            <Counter
              label="Shared"
              description="It's shared with other people."
              value={bathroomTypes.shared}
              type="shared"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <OnboardingFooter
        onBack={() => {
          updateSessionStorageBeforeNav('bathroomtypes');
          navigate('/pages/propertybasics', {
            state: {
              ...location.state,
              draftId: state?.draftId || location.state?.draftId
            }
          });
        }}
        onNext={async () => {
          // Save to Firebase
          try {
            await saveBathroomTypes();
            
            // Set currentStep before navigation
            if (actions.setCurrentStep) {
              actions.setCurrentStep('bathroomtypes');
            }
            
            // Set sessionStorage for next step (occupancy)
            updateSessionStorageBeforeNav('bathroomtypes');
            const storagePrevStepKey = 'onb_prev_step_name';
            const storageStepKey = 'onb_progress_step';
            const storageKey = 'onb_progress_value';
            
            sessionStorage.setItem(storagePrevStepKey, 'bathroomtypes');
            sessionStorage.setItem(storageStepKey, '1'); // Step 1
            // Step 1 now has 9 pages: hostingsteps, propertydetails, propertystructure, privacytype, location, locationconfirmation, propertybasics, bathroomtypes, occupancy
            const occupancyProgress = ((8 + 1) / 9) * 100; // ~100% (occupancy is index 8 in step 1)
            sessionStorage.setItem(storageKey, String(occupancyProgress));
            
            // Navigate to occupancy (next page after bathroomtypes)
            navigate('/pages/occupancy', {
              state: {
                ...location.state,
                bathroomTypes,
                draftId: state?.draftId || location.state?.draftId
              }
            });
          } catch (error) {
            alert('Error saving bathroom types. Please try again.');
          }
        }}
        backText="Back"
        nextText="Next"
        canProceed={true}
      />
    </div>
  );
};

export default BathroomTypes;

