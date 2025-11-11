import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Custom hook to manage experience onboarding data
 * This centralizes data loading and saving logic for all experience steps
 */
export const useExperienceData = () => {
  const location = useLocation();
  const { state } = useOnboarding();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({
    // Step 1: Years of experience
    yearsOfExperience: 10,
    
    // Step 2: Qualifications
    introTitle: '',
    expertise: '',
    recognition: '',
    
    // Step 3: Online profiles
    profiles: [],
    
    // Step 4: Residential address
    country: 'Philippines',
    unit: '',
    buildingName: '',
    streetAddress: 'Purok 6',
    barangay: '',
    city: 'San Rafael',
    zipCode: '3008',
    province: 'Bulacan',
    isBusinessHosting: false,
    
    // Step 5: Meeting address
    meetingAddress: '',
    confirmCountry: 'Philippines',
    confirmUnit: '',
    confirmBuildingName: '',
    confirmStreetAddress: '',
    confirmBarangay: '',
    confirmCity: '',
    confirmZipCode: '',
    confirmProvince: '',
    locationName: '',
    showConfirmLocation: false,
    mapLat: 14.5995,
    mapLng: 120.9842,
    showMap: false,
    
    // Step 6: Photos
    photos: [],
    
    // Step 7: Itinerary
    itineraryItems: [],
    
    // Step 8: Maximum guests
    maxGuests: 1,
    
    // Step 9: Price per guest
    pricePerGuest: '',
    
    // Step 10: Private group minimum
    privateGroupMinimum: '',
    
    // Step 11: Review pricing (no data, just display)
    
    // Step 12: Discounts
    discounts: [],
    
    // Step 13: Transportation
    willTransportGuests: null,
    transportationTypes: [],
    termsAgreed: false,
    
    // Step 14: Title and description preview (no data, just display)
    
    // Step 15: Title and description
    experienceTitle: '',
    experienceDescription: '',
    
    // Metadata
    mainCategory: null,
    experienceCategory: null,
  });
  
  const hasLoadedRef = useRef(false);
  const draftId = state.draftId || location.state?.draftId;

  // Load data from draft
  useEffect(() => {
    const loadData = async () => {
      if (!draftId || hasLoadedRef.current) return;
      
      try {
        setIsLoading(true);
        const draftRef = doc(db, 'onboardingDrafts', draftId);
        const draftSnap = await getDoc(draftRef);
        
        if (draftSnap.exists()) {
          const draftData = draftSnap.data().data || {};
          
          setData(prev => ({
            ...prev,
            yearsOfExperience: draftData.yearsOfExperience !== undefined ? draftData.yearsOfExperience : 10,
            introTitle: draftData.introTitle || '',
            expertise: draftData.expertise || '',
            recognition: draftData.recognition || '',
            profiles: draftData.profiles || [],
            country: draftData.country || 'Philippines',
            unit: draftData.unit || '',
            buildingName: draftData.buildingName || '',
            streetAddress: draftData.streetAddress || 'Purok 6',
            barangay: draftData.barangay || '',
            city: draftData.city || 'San Rafael',
            zipCode: draftData.zipCode || '3008',
            province: draftData.province || 'Bulacan',
            isBusinessHosting: draftData.isBusinessHosting || false,
            meetingAddress: draftData.meetingAddress || '',
            confirmCountry: draftData.confirmCountry || 'Philippines',
            confirmUnit: draftData.confirmUnit || '',
            confirmBuildingName: draftData.confirmBuildingName || '',
            confirmStreetAddress: draftData.confirmStreetAddress || '',
            confirmBarangay: draftData.confirmBarangay || '',
            confirmCity: draftData.confirmCity || '',
            confirmZipCode: draftData.confirmZipCode || '',
            confirmProvince: draftData.confirmProvince || '',
            locationName: draftData.locationName || '',
            showConfirmLocation: draftData.showConfirmLocation || false,
            mapLat: draftData.mapLat || 14.5995,
            mapLng: draftData.mapLng || 120.9842,
            showMap: draftData.showMap || false,
            photos: draftData.photos || [],
            itineraryItems: draftData.itineraryItems || [],
            maxGuests: draftData.maxGuests || 1,
            pricePerGuest: draftData.pricePerGuest || '',
            privateGroupMinimum: draftData.privateGroupMinimum || '',
            discounts: draftData.discounts || [],
            willTransportGuests: draftData.willTransportGuests !== undefined ? draftData.willTransportGuests : null,
            transportationTypes: draftData.transportationTypes || [],
            termsAgreed: draftData.termsAgreed || false,
            experienceTitle: draftData.experienceTitle || '',
            experienceDescription: draftData.experienceDescription || '',
            mainCategory: draftData.experienceCategory || location.state?.experienceCategory || null,
            experienceCategory: draftData.experienceCategory || location.state?.experienceCategory || null,
          }));
          
          hasLoadedRef.current = true;
        }
      } catch (error) {
        console.error('Error loading experience data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [draftId, location.state?.experienceCategory]);

  // Save data to draft
  const saveData = async (updates, stepName) => {
    if (!draftId) {
      console.warn('No draftId available for saving');
      return;
    }
    
    try {
      const draftRef = doc(db, 'onboardingDrafts', draftId);
      const updateObj = {
        currentStep: stepName,
        category: 'experience',
        lastModified: new Date(),
      };
      
      // Add data updates
      Object.keys(updates).forEach(key => {
        updateObj[`data.${key}`] = updates[key];
      });
      
      await updateDoc(draftRef, updateObj);
      console.log(`✅ Saved data for step: ${stepName}`);
      
      // Update local state
      setData(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error saving experience data:', error);
      throw error;
    }
  };

  return {
    data,
    setData,
    isLoading,
    draftId,
    saveData,
  };
};

export default useExperienceData;

