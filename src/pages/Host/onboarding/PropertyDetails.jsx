import React, { useState, useEffect } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
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

  // Load lordicon script
  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://cdn.lordicon.com/lordicon.js"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://cdn.lordicon.com/lordicon.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

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
  }, [draftId, state.user]);

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

  // Set current step for progress bar when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'propertydetails') {
      console.log('📍 PropertyDetails page - Setting currentStep to propertydetails');
      actions.setCurrentStep('propertydetails');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Run when route changes

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
    <div className="h-screen bg-white overflow-hidden">
      <OnboardingHeader />

      {/* Main Content */}
      <main className="flex items-center justify-center h-[calc(100vh-136px)] gap-6 overflow-hidden pl-40 pr-4 pt-16">
        <div className="flex-1 flex items-center justify-end">
          <div className="max-w-[720px]">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary animate-fill-circle"></div>
                  <span className="text-white font-bold text-lg relative z-10">1</span>
                </div>
              </div>
              <h1 className="text-[40px] font-medium mb-5">Tell us about your <span className="text-primary">place</span></h1>
              <p className="text-gray-600 text-xl leading-relaxed">
                In this step, we'll ask you which type of property you have and if guests will book the entire place or just a room. Then let us know the location and how many guests can stay.
              </p>
              
              <style>{`
                @keyframes fillCircle {
                  0% {
                    transform: translateY(100%);
                  }
                  50% {
                    transform: translateY(0);
                  }
                  100% {
                    transform: translateY(100%);
                  }
                }
                
                .animate-fill-circle {
                  animation: fillCircle 4s ease-in-out infinite;
                }
              `}</style>
            </div>
          </div>
        </div>

        <div className="w-[45%] flex items-center justify-start">
          {/* Animated House Icon */}
          <div 
            className="w-[400px] h-[400px]"
            dangerouslySetInnerHTML={{
              __html: `
                <lord-icon
                  src="https://cdn.lordicon.com/dznelzdk.json"
                  trigger="loop"
                  delay="2000"
                  speed="0.5"
                  state="morph-mantion"
                  colors="primary:#faf9d1,secondary:#109173,tertiary:#b26836,quaternary:#109173,quinary:#646e78,senary:#ebe6ef"
                  style="width:400px;height:400px">
                </lord-icon>
              `
            }}
          />
        </div>
      </main>

      {/* Footer */}
      <OnboardingFooter
        onBack={() => navigate('/pages/hostingsteps')}
        onNext={handleNext}
        canProceed={!isLoading}
        nextText={isLoading ? 'Saving...' : 'Next'}
      />
    </div>
  );
};

export default PropertyDetails;
