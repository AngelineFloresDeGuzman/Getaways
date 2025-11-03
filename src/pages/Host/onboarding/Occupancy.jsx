import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';
import { Users } from 'lucide-react';

const Occupancy = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();

  // State for selected occupancy options (multiple selection allowed)
  const [selectedOccupancy, setSelectedOccupancy] = useState([]);

  // Load occupancy from draft if editing
  useEffect(() => {
    const loadOccupancy = async () => {
      const draftIdToUse = state?.draftId || location.state?.draftId;
      if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
        try {
          const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const draftData = draftSnap.data();
            const savedOccupancy = draftData.data?.occupancy || [];
            if (Array.isArray(savedOccupancy) && savedOccupancy.length > 0) {
              setSelectedOccupancy(savedOccupancy);
              console.log('📍 Occupancy: Loaded from draft:', savedOccupancy);
            }
          }
        } catch (error) {
          console.error('❌ Occupancy: Error loading from draft:', error);
        }
      }
    };
    loadOccupancy();
  }, [state?.draftId, location.state?.draftId]);

  // Set current step
  useLayoutEffect(() => {
    if (actions?.setCurrentStep) {
      console.log('📍 Occupancy: Setting currentStep to occupancy');
      actions.setCurrentStep('occupancy');
    }
  }, [actions]);

  // Occupancy options
  const occupancyOptions = [
    {
      id: 'me',
      label: 'Me',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'my-family',
      label: 'My family',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      id: 'other-guests',
      label: 'Other guests',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'roommates',
      label: 'Roommates',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    }
  ];

  // Handle option toggle (multiple selection)
  const handleOptionToggle = (optionId) => {
    setSelectedOccupancy(prev => {
      if (prev.includes(optionId)) {
        return prev.filter(id => id !== optionId);
      } else {
        return [...prev, optionId];
      }
    });
  };

  // Save occupancy to Firebase
  const saveOccupancy = async () => {
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    if (!draftIdToUse || draftIdToUse.startsWith('temp_')) {
      console.warn('📍 Occupancy: No valid draftId, cannot save');
      return;
    }

    try {
      const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
      const docSnap = await getDoc(draftRef);
      
      if (docSnap.exists()) {
        await updateDoc(draftRef, {
          'data.occupancy': selectedOccupancy,
          currentStep: 'makeitstandout',
          lastModified: new Date()
        });
        console.log('✅ Occupancy: Saved to Firebase:', selectedOccupancy);
      }
    } catch (error) {
      console.error('❌ Occupancy: Error saving to Firebase:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} />

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-[640px] mx-auto">
          <h1 className="text-[32px] font-medium text-gray-900 mb-2 text-center">
            Who else might be there?
          </h1>
          <p className="text-base text-gray-600 mb-12 text-center">
            Guests need to know whether they'll encounter other people during their stay.
          </p>

          {/* Occupancy Options Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {occupancyOptions.map((option) => {
              const isSelected = selectedOccupancy.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionToggle(option.id)}
                  className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                    isSelected
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`${isSelected ? 'text-black' : 'text-gray-400'}`}>
                    {option.icon}
                  </div>
                  <span className={`text-sm font-medium ${
                    isSelected ? 'text-black' : 'text-gray-600'
                  }`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Informational Text */}
          <p className="text-sm text-gray-500 text-center">
            We'll show this information on your listing and in search results.
          </p>
        </div>
      </main>

      {/* Footer */}
      <OnboardingFooter
        onBack={() => {
          updateSessionStorageBeforeNav('occupancy');
          navigate('/pages/bathroomtypes', {
            state: {
              ...location.state,
              draftId: state?.draftId || location.state?.draftId
            }
          });
        }}
        onNext={async () => {
          // Save to Firebase
          try {
            await saveOccupancy();
            
            // Set currentStep before navigation
            if (actions.setCurrentStep) {
              actions.setCurrentStep('occupancy');
            }
            
            // Set sessionStorage for next step (makeitstandout)
            updateSessionStorageBeforeNav('occupancy');
            const storagePrevStepKey = 'onb_prev_step_name';
            const storageStepKey = 'onb_progress_step';
            const storageKey = 'onb_progress_value';
            
            sessionStorage.setItem(storagePrevStepKey, 'occupancy');
            sessionStorage.setItem(storageStepKey, '2'); // Step 2 (makeitstandout is first page of Step 2)
            // Step 2 has 6 pages: makeitstandout, amenities, photos, titledescription, description, descriptiondetails
            const makeitstandoutProgress = ((0 + 1) / 6) * 100; // ~16.67% (makeitstandout is index 0 in step 2)
            sessionStorage.setItem(storageKey, String(makeitstandoutProgress));
            
            // Navigate to makeitstandout
            navigate('/pages/makeitstandout', {
              state: {
                ...location.state,
                occupancy: selectedOccupancy,
                draftId: state?.draftId || location.state?.draftId
              }
            });
          } catch (error) {
            console.error('❌ Occupancy: Error saving:', error);
            alert('Error saving occupancy. Please try again.');
          }
        }}
        backText="Back"
        nextText="Next"
        canProceed={true}
      />
    </div>
  );
};

export default Occupancy;

