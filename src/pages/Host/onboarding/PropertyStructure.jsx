import React, { useState, useEffect } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import {
  Home,
  Building2 as Building,
  Warehouse,
  Hotel,
  Castle,
  Tent,
  CaravanIcon,
  House as Villa,
  Mountain,
  HomeIcon,
  LandmarkIcon
} from 'lucide-react';

const propertyTypes = [
  { icon: Home, label: 'House' },
  { icon: Building, label: 'Apartment' },
  { icon: Warehouse, label: 'Barn' },
  { icon: Hotel, label: 'Bed & breakfast' },
  { icon: Tent, label: 'Boat' },
  { icon: HomeIcon, label: 'Cabin' },
  { icon: CaravanIcon, label: 'Camper/RV' },
  { icon: Villa, label: 'Casa particular' },
  { icon: Castle, label: 'Castle' },
  { icon: Mountain, label: 'Cave' },
  { icon: Building, label: 'Container' },
  { icon: LandmarkIcon, label: 'Cycladic home' },
  { icon: Building, label: 'Dammuso' },  // Add this line
  { icon: Building, label: 'Dome' },
  { icon: HomeIcon, label: 'Earth home' },
  { icon: Warehouse, label: 'Farm' },
  { icon: Building, label: 'Guesthouse' },
  { icon: Building, label: 'Hotel' },
  { icon: HomeIcon, label: 'Houseboat' },
  { icon: HomeIcon, label: 'Kezhan' },
  { icon: Building, label: 'Minsu' },
  { icon: Building, label: 'Riad' },
  { icon: HomeIcon, label: 'Ryokan' },
  { icon: HomeIcon, label: "Shepherd's hut" },
  { icon: Tent, label: 'Tent' },
  { icon: HomeIcon, label: 'Tiny home' },
  { icon: Castle, label: 'Tower' },
  { icon: HomeIcon, label: 'Treehouse' },
  { icon: HomeIcon, label: 'Trullo' },
  { icon: Warehouse, label: 'Windmill' },
  { icon: Tent, label: 'Yurt' }
];

const PropertyStructure = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { state, actions } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);
  const [draftRef, setDraftRef] = useState(null);
  const [selectedType, setSelectedType] = useState(state.propertyStructure || 'House');
  let draftId = location.state?.draftId;
  // Restore draftId if missing (e.g., after browser navigation)
  useEffect(() => {
    const restoreDraftId = async () => {
      // Only try to restore draft if user is authenticated
      if (!draftId && state.user?.uid) {
        // Try to fetch user's most recent draft
        try {
          const { getUserDrafts } = await import('@/pages/Host/services/draftService');
          const drafts = await getUserDrafts();
          if (drafts.length > 0) {
            draftId = drafts[0].id;
            const ref = doc(db, 'onboardingDrafts', draftId);
            setDraftRef(ref);
          }
        } catch (error) {
          console.error('Error restoring draftId:', error);
        }
      }
    };
    restoreDraftId();
  }, [draftId, state.user]);

  // Create or get draft on mount
  useEffect(() => {
    // Use existing draftId from navigation state
    if (draftId) {
      const ref = doc(db, 'onboardingDrafts', draftId);
      setDraftRef(ref);
      // Fetch draft and sync selectedType
      const fetchDraft = async () => {
        try {
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const draftData = snap.data()?.data || {};
            if (draftData.propertyStructure) {
              // Only update local state - don't trigger context updates/auto-save
              setSelectedType(draftData.propertyStructure);
            }
          }
        } catch (error) {
          console.error('Error loading draft:', error);
        }
      };
      fetchDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]); // Only depend on draftId, not actions

  // Set current step for progress bar when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'propertystructure') {
      console.log('📍 PropertyStructure page - Setting currentStep to propertystructure');
      actions.setCurrentStep('propertystructure');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

  // Handle property type selection
  const handleTypeSelect = (type) => {
    setSelectedType(type);
    // Don't update context state here - only save when Next or Save & Exit is clicked
  };

  // Enhanced navigation functions
  const handleNext = async () => {
    if (selectedType && draftRef) {
      setIsLoading(true);
      try {
        // Get existing data fields
        const snap = await getDoc(draftRef);
        const prevData = snap.exists() && snap.data().data ? snap.data().data : {};
        // Only update if value is different
        if (prevData.propertyStructure !== selectedType) {
          await updateDoc(draftRef, {
            "data.propertyStructure": selectedType,
            propertyStructure: deleteField(),
            lastModified: new Date(),
            currentStep: 'privacytype',
          });
        } else {
          await updateDoc(draftRef, {
            lastModified: new Date(),
            currentStep: 'privacytype',
          });
        }
        navigate('/pages/privacytype', { state: { draftId } });
      } catch (error) {
        console.error('Error saving draft:', error);
        navigate('/pages/privacytype', { state: { draftId } });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSaveAndExit = async () => {
    if (draftRef) {
      setIsLoading(true);
      try {
        // Get existing data fields
        const snap = await getDoc(draftRef);
        const prevData = snap.exists() && snap.data().data ? snap.data().data : {};
        await updateDoc(draftRef, {
          data: {
            ...prevData,
            propertyStructure: selectedType,
          },
          lastModified: new Date(),
          currentStep: 'privacytype',
        });
        navigate('/host/hostdashboard');
      } catch (error) {
        console.error('Error saving and exiting:', error);
        alert('Error saving progress: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} />

      {/* Main Content */}
      <main className="pt-24 px-8 pb-32">
        <div className="max-w-[1024px] mx-auto">
          <h1 className="text-[32px] font-medium text-gray-900 mb-8 text-center">
            Which of these <span className="text-primary">best describes</span> your <span className="text-black">place</span>?
          </h1>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {propertyTypes.map((type) => (
              <button
                key={type.label}
                onClick={() => handleTypeSelect(type.label)}
                className={`group flex flex-col items-center justify-center p-6 rounded-xl border hover:border-primary hover:bg-gray-50 transition-all duration-300 ${
                  selectedType === type.label
                    ? 'border-primary bg-gray-50'
                    : 'border-gray-200'
                }`}
              >
                <type.icon 
                  className={`w-8 h-8 mb-2 transition-all duration-300 group-hover:text-primary group-hover:animate-rotate ${
                    selectedType === type.label
                      ? 'text-primary animate-rotate'
                      : ''
                  }`}
                  style={{ transformStyle: 'preserve-3d' }}
                />
                <span className={`text-sm transition-all duration-300 group-hover:text-primary group-hover:font-semibold ${
                  selectedType === type.label
                    ? 'text-primary font-semibold'
                    : ''
                }`}>{type.label}</span>
              </button>
            ))}
          </div>
          
          <style>{`
            @keyframes rotate3d {
              0% {
                transform: scale(1.25) rotateY(0deg);
              }
              50% {
                transform: scale(1.35) rotateY(180deg);
              }
              100% {
                transform: scale(1.25) rotateY(360deg);
              }
            }
            
            .animate-rotate {
              animation: rotate3d 2s ease-in-out infinite;
              transform-style: preserve-3d;
            }
            
            .group:hover .group-hover\\:animate-rotate {
              animation: rotate3d 2s ease-in-out infinite;
              transform-style: preserve-3d;
            }
            
            .group:hover {
              border-color: hsl(var(--primary)) !important;
            }
            
            .group:hover svg {
              color: hsl(var(--primary)) !important;
            }
            
            .group:hover span {
              color: hsl(var(--primary)) !important;
            }
          `}</style>
        </div>
      </main>

      <OnboardingFooter
        onBack={() => navigate('/pages/propertydetails', { state: { draftId: location.state?.draftId } })}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={selectedType !== null}
      />
    </div>
  );
};

export default PropertyStructure;