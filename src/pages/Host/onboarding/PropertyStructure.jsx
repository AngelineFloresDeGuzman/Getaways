import React, { useState, useEffect } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
// Unique icon components for each property type - designed to match their labels
const HouseIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const ApartmentIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4M12 9v6M9 12h6" />
  </svg>
);

const BarnIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18c-4-2-4-6 0-8M18 18c4-2 4-6 0-8M6 18h12M6 18v4h12v-4M10 14h4M8 16v2M16 16v2" />
  </svg>
);

const BedBreakfastIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6M9 10h.01M15 10h.01M12 12v2" />
  </svg>
);

const BoatIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 18l18-4M3 14l18-2M5 20c2-4 14-4 14 0M3 18c2-3 10-3 12 0M17 18c2-3 6-3 8 0M8 18l2-10M16 18l-2-10" />
  </svg>
);

const CabinIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18c-2-2-2-6 0-8s6-2 8 0M6 18h12M6 18v4h12v-4M8 14h8M10 16v2M14 16v2M4 20h16" />
  </svg>
);

const CamperRVIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6a2 2 0 012-2zM2 12h20M8 8V6M16 8V6M6 14h2M16 14h2M12 10v4" />
  </svg>
);

const CasaParticularIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6M9 10h.01M15 10h.01M12 13v2M10 15h4" />
  </svg>
);

const CastleIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4M7 3v4m0 4v4m10-8V3m0 4v4" />
  </svg>
);

const CaveIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18c-2-2-2-6 0-8s6-2 8 0 6-2 8 0 2 6 0 8M6 18h12M6 18v4h12v-4M12 14v2" />
  </svg>
);

const ContainerIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zM4 10h16M4 14h16M6 8v12M18 8v12" />
  </svg>
);

const CycladicHomeIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 8v8h16V8M4 12h16M8 10v4M16 10v4M12 10v4M6 20h12M10 8v2M14 8v2" />
  </svg>
);

const DammusoIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c-4 0-8 2-8 5v10c0 3 4 5 8 5s8-2 8-5V8c0-3-4-5-8-5zM12 7v10M8 12h8M4 8h16M4 12h16M10 16v2M14 16v2" />
  </svg>
);

const DomeIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c-6 0-12 3-12 6v6c0 3 6 6 12 6s12-3 12-6V9c0-3-6-6-12-6zM12 9v12M0 12h24M6 9v12M18 9v12" />
  </svg>
);

const EarthHomeIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c4-2 8 0 8 4v8c0 4-4 6-8 4s-8 0-8-4V7c0-4 4-6 8-4zM12 7v10M8 12h8M3 12a9 9 0 1018 0" />
  </svg>
);

const FarmIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8v10h14V8M5 12h14M9 10v2M15 10v2M6 18c-1-2 2-4 6-4s7 2 6 4M10 12h4" />
  </svg>
);

const GuesthouseIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6M12 8h.01" />
  </svg>
);

const HotelIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4M7 3v4m0 4v4m10-8V3m0 4v4M12 9v6M9 12h6" />
  </svg>
);

const HouseboatIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 18l18-4M3 14l18-2M3 12l2-2m0 0l7-7 7 7M5 10v8a1 1 0 001 1h3m10-9l2 2m-2-2v8a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6M8 18v2M16 18v2" />
  </svg>
);

const KezhanIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6M8 10h2M14 10h2M12 12h.01M8 16h8M10 14v4M14 14v4" />
  </svg>
);

const MinsuIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6M9 10h.01M15 10h.01M12 12h.01M9 16h6M10 14v4M14 14v4" />
  </svg>
);

const RiadIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6M12 12c0-1-1-2-2-2s-2 1-2 2M12 16v4M10 14h4" />
  </svg>
);

const RyokanIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6M8 10h2M14 10h2M10 12v4M14 12v4M9 8h6" />
  </svg>
);

const ShepherdsHutIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18c-2-2-2-6 0-8s6-2 8 0M6 18h12M6 18v4h12v-4M8 14h8M10 16v2M14 16v2M12 12v2" />
  </svg>
);

const TentIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const TinyHomeIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h2m10-11l2 2m-2-2v10a1 1 0 01-1 1h-2m-8 0a1 1 0 001-1v-4a1 1 0 011-1h1a1 1 0 011 1v4a1 1 0 001 1m-4 0h2M10 10h.01" />
  </svg>
);

const TowerIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4M7 3v4m0 4v4m10-8V3m0 4v4M12 8v4" />
  </svg>
);

const TreehouseIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m-4-4h8M8 12h8M8 8h8M8 16h8M6 20l-2-4h4l-2 4zm12 0l-2-4h4l-2 4zM10 4l-1-2h6l-1 2z" />
  </svg>
);

const TrulloIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c-4 0-8 2-8 5v10c0 3 4 5 8 5s8-2 8-5V8c0-3-4-5-8-5zM12 7v10M8 12h8M4 8h16M4 12h16" />
  </svg>
);

const WindmillIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8 4v12H4V7l8-4zM12 7v14M4 7l8 4M20 7l-8 4M12 11l-4-2M12 11l4-2M8 15l8-4M16 15l-8-4M13 10V3L4 14h7v7l9-11h-7zM12 12h4M8 12h4" />
  </svg>
);

const YurtIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18M3 12h18M12 3a9 9 0 019 9M12 3a9 9 0 00-9 9m9 9a9 9 0 01-9-9m9 9a9 9 0 009-9M12 8v8M8 12h8" />
  </svg>
);

const propertyTypes = [
  { icon: HouseIcon, label: 'House' },
  { icon: ApartmentIcon, label: 'Apartment' },
  { icon: BarnIcon, label: 'Barn' },
  { icon: BedBreakfastIcon, label: 'Bed & breakfast' },
  { icon: BoatIcon, label: 'Boat' },
  { icon: CabinIcon, label: 'Cabin' },
  { icon: CamperRVIcon, label: 'Camper/RV' },
  { icon: CasaParticularIcon, label: 'Casa particular' },
  { icon: CastleIcon, label: 'Castle' },
  { icon: CaveIcon, label: 'Cave' },
  { icon: ContainerIcon, label: 'Container' },
  { icon: CycladicHomeIcon, label: 'Cycladic home' },
  { icon: DammusoIcon, label: 'Dammuso' },
  { icon: DomeIcon, label: 'Dome' },
  { icon: EarthHomeIcon, label: 'Earth home' },
  { icon: FarmIcon, label: 'Farm' },
  { icon: GuesthouseIcon, label: 'Guesthouse' },
  { icon: HotelIcon, label: 'Hotel' },
  { icon: HouseboatIcon, label: 'Houseboat' },
  { icon: KezhanIcon, label: 'Kezhan' },
  { icon: MinsuIcon, label: 'Minsu' },
  { icon: RiadIcon, label: 'Riad' },
  { icon: RyokanIcon, label: 'Ryokan' },
  { icon: ShepherdsHutIcon, label: "Shepherd's hut" },
  { icon: TentIcon, label: 'Tent' },
  { icon: TinyHomeIcon, label: 'Tiny home' },
  { icon: TowerIcon, label: 'Tower' },
  { icon: TreehouseIcon, label: 'Treehouse' },
  { icon: TrulloIcon, label: 'Trullo' },
  { icon: WindmillIcon, label: 'Windmill' },
  { icon: YurtIcon, label: 'Yurt' }
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
          }
      };
      fetchDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]); // Only depend on draftId, not actions

  // Set current step for progress bar when component mounts or route changes
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'propertystructure') {
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
        navigate('/pages/privacytype', { state: { draftId } });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSaveAndExit = async () => {
    if (!auth.currentUser) {
      alert('Please log in to save your progress');
      return;
    }
    
    setIsLoading(true);
    try {
      // Update context with current propertyStructure
      if (selectedType && actions.updatePropertyStructure) {
        actions.updatePropertyStructure(selectedType);
      }
      
      // Ensure we have a draftId
      let draftIdToUse = draftId || state?.draftId;
      if (!draftIdToUse && state.user?.uid) {
        try {
          const { getUserDrafts, saveDraft } = await import('@/pages/Host/services/draftService');
          const drafts = await getUserDrafts();
          if (drafts.length > 0) {
            draftIdToUse = drafts[0].id;
          } else {
            const newDraftData = {
              currentStep: 'propertystructure',
              category: state.category || 'accommodation',
              data: {
                propertyStructure: selectedType
              }
            };
            draftIdToUse = await saveDraft(newDraftData, null);
            if (actions.setDraftId) {
              actions.setDraftId(draftIdToUse);
            }
          }
        } catch (error) {
          }
      }
      
      if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          await updateDoc(draftRef, {
            'data.propertyStructure': selectedType,
            propertyStructure: deleteField(), // Remove old top-level field if exists
            currentStep: 'propertystructure',
            lastModified: new Date(),
          });
          } else {
          // Create new draft
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          const newDraftData = {
            currentStep: 'propertystructure',
            category: state.category || 'accommodation',
            data: {
              propertyStructure: selectedType
            }
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      }
      
      navigate('/host/listings', { 
        state: { 
          message: 'Draft saved successfully!',
          draftSaved: true 
        }
      });
    } catch (error) {
      alert('Error saving progress: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} customSaveAndExit={handleSaveAndExit} />

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
                <div className={`mb-2 transition-all duration-300 group-hover:text-primary group-hover:animate-rotate ${
                    selectedType === type.label
                      ? 'text-primary animate-rotate'
                      : ''
                  }`}>
                  <type.icon />
                </div>
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