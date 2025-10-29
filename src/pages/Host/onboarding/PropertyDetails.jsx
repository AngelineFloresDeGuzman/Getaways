import React, { useState, useEffect } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Home, Building2, TreePine } from 'lucide-react';

const PropertyDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();

  const [isLoading, setIsLoading] = useState(false);
  const [draftRef, setDraftRef] = useState(null);
  const [selectedType, setSelectedType] = useState(state.propertyType || null);
  const [saveError, setSaveError] = useState(null);

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
            // Set draftRef for subsequent use
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

  // Load draft and prefill propertyType
  useEffect(() => {
    if (!draftId) return;
    const ref = doc(db, 'onboardingDrafts', draftId);
    setDraftRef(ref);

    const fetchDraft = async () => {
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const draftData = snap.data()?.data || {};
          if (draftData.propertyType) {
            setSelectedType(draftData.propertyType);
            actions.updatePropertyType(draftData.propertyType);
          }
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    };

    fetchDraft();
  }, [draftId, actions]);

  const propertyTypes = [
    { id: 'house', title: 'House', subtitle: 'A place all to yourself', icon: Home, description: 'Guests have the whole place to themselves' },
    { id: 'apartment', title: 'Apartment', subtitle: 'A place all to yourself', icon: Building2, description: 'Guests have the whole place to themselves' },
    { id: 'guesthouse', title: 'Guesthouse', subtitle: 'A place all to yourself', icon: TreePine, description: 'Guests have the whole place to themselves' }
  ];

  const handlePropertyTypeSelect = (typeId) => {
    setSelectedType(typeId);
    actions.updatePropertyType(typeId);
    setSaveError(null);
  };

  // Save only current page fields when clicking Next
  const handleNext = async () => {
    if (!draftRef) return;
    try {
      await updateDoc(draftRef, {
        currentStep: 'propertystructure',
        lastModified: new Date(),
      });
      navigate('/pages/propertystructure', { state: { draftId } });
    } catch (error) {
      console.error('Error saving draft:', error);
      setSaveError('Failed to save progress. Continuing anyway...');
      setTimeout(() => navigate('/pages/propertystructure', { state: { draftId } }), 1000);
    } finally {
      setIsLoading(false);
    }
  };

  // Save & Exit: only update lastModified, do not touch other fields
  const handleSaveAndExit = async () => {
    if (!draftRef) return;
    setIsLoading(true);
    setSaveError(null);
    try {
      await updateDoc(draftRef, {
        currentStep: 'propertystructure',
        lastModified: new Date(),
      });
      setSaveError('Draft saved successfully.');
      setTimeout(() => navigate('/host/hostdashboard'), 1500);
    } catch (error) {
      console.error('Error saving draft:', error);
      setSaveError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader />

      {/* Main Content */}
      <main className="flex min-h-[calc(100vh-136px)]">
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-[640px] px-20">
            <div className="mb-16">
              <span className="text-gray-600">Step 1</span>
              <h1 className="text-[32px] font-medium mb-4">Tell us about your place</h1>
              <p className="text-gray-600 text-lg">
                In this step, we'll ask you which type of property you have and if guests will book the entire place or just a room. Then let us know the location and how many guests can stay.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <img src="/images/property-layout.png" alt="Property reference" className="w-[85%] h-auto object-contain" />
            </div>
          </div>
        </div>

        <div className="w-[50%] bg-gray-50 flex items-center justify-center">
          <img src="/images/property-layout.png" alt="" className="w-[85%] h-auto object-contain" />
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white">
        <div className="max-w-none">
          {/* Progress bar removed as requested */}

          <div className="px-8 py-6 border-t">
            <div className="flex justify-between items-center">
              <button onClick={() => navigate('/pages/hostingsteps')} className="hover:underline">
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={isLoading}
                className={`rounded-lg px-8 py-3.5 text-base font-medium transition-colors ${!isLoading ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                {isLoading ? 'Saving...' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PropertyDetails;
