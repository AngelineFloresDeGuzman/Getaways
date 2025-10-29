import React, { useState, useEffect } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
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
  const [selectedType, setSelectedType] = useState(state.propertyStructure || '');
  let draftId = location.state?.draftId;
  // Restore draftId if missing (e.g., after browser navigation)
  useEffect(() => {
    const restoreDraftId = async () => {
      if (!draftId) {
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
  }, [draftId]);

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
              setSelectedType(draftData.propertyStructure);
              actions.updateState({ propertyStructure: draftData.propertyStructure });
            }
          }
        } catch (error) {
          console.error('Error loading draft:', error);
        }
      };
      fetchDraft();
    }
  }, [draftId, actions]);

  // Update selectedType when state changes (after loading draft)
  useEffect(() => {
    if (state.propertyStructure) {
      setSelectedType(state.propertyStructure);
      actions.setLoading(false);
    }
  }, [state.propertyStructure, actions]);

  // Handle property type selection
  const handleTypeSelect = (type) => {
    setSelectedType(type);
    actions.updateState({ propertyStructure: type });
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
      {/* Header */}
      <OnboardingHeader />

      {/* Progress Bar at the top */}
      <div className="w-full">
        <div className="h-1 w-full flex space-x-2">
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-[33.33%]"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1"></div>
          <div className="h-full bg-gray-200 flex-1"></div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-[1024px] mx-auto">
          <h1 className="text-[32px] font-medium text-gray-900 mb-12  text-center">
            Which of these best describes your place?
          </h1>

          <div className="grid grid-cols-3 gap-4">
            {propertyTypes.map((type) => (
              <button
                key={type.label}
                onClick={() => handleTypeSelect(type.label)}
                className={`flex flex-col items-center justify-center p-6 rounded-xl border hover:border-black transition-colors ${
                  selectedType === type.label
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200'
                }`}
              >
                <type.icon className="w-8 h-8 mb-2" />
                <span className="text-sm">{type.label}</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer with Progress Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="h-1 w-full flex space-x-2">
            <div className="h-full bg-gray-200 flex-1 relative">
              <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-[33.33%]"></div>
            </div>
            <div className="h-full bg-gray-200 flex-1"></div>
            <div className="h-full bg-gray-200 flex-1"></div>
          </div>
          
          <div className="px-8 py-6 border-t">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/propertydetails', { state: { draftId: location.state?.draftId } })}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className={`rounded-lg px-8 py-3.5 text-base font-medium ${
                  selectedType
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={handleNext}
                disabled={!selectedType}
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

export default PropertyStructure;