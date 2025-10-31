import React, { useState, useEffect, useRef } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Wifi, 
  Tv, 
  Car, 
  Waves, 
  Snowflake, 
  Users, 
  UtensilsCrossed,
  TreePine,
  Coffee,
  Flame,
  Camera,
  Shield,
  Dumbbell,
  Shirt,
  ShowerHead,
  Zap,
  AlertTriangle,
  Flame as FireIcon
} from 'lucide-react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const Amenities = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Direct context access - NO AUTOSAVE
  const { state, actions } = useOnboarding();
  
  const [selectedAmenities, setSelectedAmenities] = useState(state.selectedAmenities || []);

  // Load draft if continuing from saved progress (manual, no autosave)
  useEffect(() => {
    const initializePage = async () => {
      if (location.state?.draftId && actions.loadDraft) {
        try {
          console.log('Amenities: Loading draft with ID:', location.state.draftId);
          actions.setLoading(true);
          await actions.loadDraft(location.state.draftId);
          console.log('Amenities: Draft loaded successfully');
        } catch (error) {
          console.error('Error loading draft in Amenities:', error);
        } finally {
          actions.setLoading(false);
        }
      }
    };

    initializePage();
  }, [location.state?.draftId, actions]);

  // Update selectedAmenities when state changes (after loading draft)
  useEffect(() => {
    if (state.selectedAmenities) {
      setSelectedAmenities(state.selectedAmenities);
    }
  }, [state.selectedAmenities]);

  // Amenity categories and items
  const amenityCategories = [
    {
      title: "What about these guest favorites?",
      subtitle: "You can add more amenities after you publish your listing.",
      items: [
        { id: 'wifi', name: 'Wifi', icon: Wifi },
        { id: 'tv', name: 'TV', icon: Tv },
        { id: 'kitchen', name: 'Kitchen', icon: UtensilsCrossed },
        { id: 'washer', name: 'Washer', icon: Shirt },
        { id: 'free_parking', name: 'Free parking on premises', icon: Car },
        { id: 'paid_parking', name: 'Paid parking on premises', icon: Car },
        { id: 'air_conditioning', name: 'Air conditioning', icon: Snowflake },
        { id: 'dedicated_workspace', name: 'Dedicated workspace', icon: Users }
      ]
    },
    {
      title: "Do you have any standout amenities?",
      items: [
        { id: 'pool', name: 'Pool', icon: Waves },
        { id: 'hot_tub', name: 'Hot tub', icon: Waves },
        { id: 'patio', name: 'Patio', icon: TreePine },
        { id: 'bbq_grill', name: 'BBQ grill', icon: Flame },
        { id: 'outdoor_dining', name: 'Outdoor dining area', icon: UtensilsCrossed },
        { id: 'fire_pit', name: 'Fire pit', icon: FireIcon },
        { id: 'pool_table', name: 'Pool table', icon: Users },
        { id: 'indoor_fireplace', name: 'Indoor fireplace', icon: Flame },
        { id: 'piano', name: 'Piano', icon: Users },
        { id: 'exercise_equipment', name: 'Exercise equipment', icon: Dumbbell },
        { id: 'lake_access', name: 'Lake access', icon: Waves },
        { id: 'beach_access', name: 'Beach access', icon: Waves },
        { id: 'ski_in_out', name: 'Ski-in/Ski-out', icon: TreePine },
        { id: 'outdoor_shower', name: 'Outdoor shower', icon: ShowerHead }
      ]
    },
    {
      title: "Do you have any of these safety items?",
      items: [
        { id: 'smoke_alarm', name: 'Smoke alarm', icon: Zap },
        { id: 'first_aid_kit', name: 'First aid kit', icon: Shield },
        { id: 'fire_extinguisher', name: 'Fire extinguisher', icon: FireIcon },
        { id: 'carbon_monoxide_alarm', name: 'Carbon monoxide alarm', icon: AlertTriangle }
      ]
    }
  ];

  // Toggle amenity selection
  const toggleAmenity = (amenityId) => {
    const newAmenities = selectedAmenities.includes(amenityId)
      ? selectedAmenities.filter(id => id !== amenityId)
      : [...selectedAmenities, amenityId];
    
    setSelectedAmenities(newAmenities);
    
    // Update state with auto-save
    actions.updateState({ selectedAmenities: newAmenities });
  };

  // Enhanced navigation functions
  const handleNext = async () => {
    try {
      // Update context with latest amenities
      actions.updateState({ selectedAmenities });
      
      // Save amenities to Firebase as amenities field map with 3 subcategories
      const draftIdToUse = state?.draftId || location.state?.draftId;
      
      if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
        try {
          const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
          const docSnap = await getDoc(draftRef);
          
          if (docSnap.exists()) {
            // Categorize selected amenities into favorites, standout, and safety
            const favoritesIds = ['wifi', 'tv', 'kitchen', 'washer', 'free_parking', 'paid_parking', 'air_conditioning', 'dedicated_workspace'];
            const standoutIds = ['pool', 'hot_tub', 'patio', 'bbq_grill', 'outdoor_dining', 'fire_pit', 'pool_table', 'indoor_fireplace', 'piano', 'exercise_equipment', 'lake_access', 'beach_access', 'ski_in_out', 'outdoor_shower'];
            const safetyIds = ['smoke_alarm', 'first_aid_kit', 'fire_extinguisher', 'carbon_monoxide_alarm'];
            
            const favorites = selectedAmenities.filter(id => favoritesIds.includes(id));
            const standout = selectedAmenities.filter(id => standoutIds.includes(id));
            const safety = selectedAmenities.filter(id => safetyIds.includes(id));
            
            // Create amenities field map with 3 subcategories (empty arrays if no selections)
            const amenitiesData = {
              favorites: favorites.length > 0 ? favorites : [],
              standout: standout.length > 0 ? standout : [],
              safety: safety.length > 0 ? safety : []
            };
            
            await updateDoc(draftRef, {
              'data.amenities': amenitiesData,
              currentStep: 'photos',
              lastModified: new Date()
            });
            console.log('📍 Amenities: ✅ Saved amenities to Firebase with 3 subcategories:', amenitiesData);
          }
        } catch (saveError) {
          console.error('📍 Amenities: Error saving to Firebase:', saveError);
          // Continue navigation even if save fails
        }
      }
      
      // Navigate to photos page
      navigate('/pages/photos', {
        state: {
          ...location.state,
          draftId: draftIdToUse || state?.draftId || location.state?.draftId
        }
      });
    } catch (error) {
      console.error('Error navigating to next step:', error);
      // Continue navigation even if save fails
      navigate('/pages/photos');
    }
  };

  const handleSaveAndExit = async () => {
    try {
      // Update context with latest amenities
      actions.updateState({ selectedAmenities });
      
      // Save amenities to Firebase before exiting
      const draftIdToUse = state?.draftId || location.state?.draftId;
      
      if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
        try {
          const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
          const docSnap = await getDoc(draftRef);
          
          if (docSnap.exists()) {
            // Categorize selected amenities into favorites, standout, and safety
            const favoritesIds = ['wifi', 'tv', 'kitchen', 'washer', 'free_parking', 'paid_parking', 'air_conditioning', 'dedicated_workspace'];
            const standoutIds = ['pool', 'hot_tub', 'patio', 'bbq_grill', 'outdoor_dining', 'fire_pit', 'pool_table', 'indoor_fireplace', 'piano', 'exercise_equipment', 'lake_access', 'beach_access', 'ski_in_out', 'outdoor_shower'];
            const safetyIds = ['smoke_alarm', 'first_aid_kit', 'fire_extinguisher', 'carbon_monoxide_alarm'];
            
            const favorites = selectedAmenities.filter(id => favoritesIds.includes(id));
            const standout = selectedAmenities.filter(id => standoutIds.includes(id));
            const safety = selectedAmenities.filter(id => safetyIds.includes(id));
            
            // Create amenities field map with 3 subcategories (empty arrays if no selections)
            const amenitiesData = {
              favorites: favorites.length > 0 ? favorites : [],
              standout: standout.length > 0 ? standout : [],
              safety: safety.length > 0 ? safety : []
            };
            
            await updateDoc(draftRef, {
              'data.amenities': amenitiesData,
              currentStep: 'amenities',
              lastModified: new Date()
            });
            console.log('📍 Amenities: ✅ Saved amenities to Firebase on Save & Exit:', amenitiesData);
          }
        } catch (saveError) {
          console.error('📍 Amenities: Error saving to Firebase on Save & Exit:', saveError);
        }
      }
      
      // Use context's saveAndExit function for navigation
      if (actions.saveAndExit) {
        await actions.saveAndExit();
      } else {
        navigate('/host/hostdashboard', { 
          state: { 
            message: 'Draft saved successfully!',
            draftSaved: true 
          }
        });
      }
    } catch (error) {
      console.error('Error saving and exiting:', error);
      alert('Error saving progress: ' + error.message);
    }
  };

  // Amenity item component
  const AmenityItem = ({ amenity, isSelected, onClick }) => {
    const IconComponent = amenity.icon;
    
    return (
      <button
        onClick={onClick}
        className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left hover:border-gray-400 ${
          isSelected
            ? 'border-black bg-gray-50'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex flex-col items-center text-center space-y-2">
          <IconComponent 
            className={`w-8 h-8 ${isSelected ? 'text-black' : 'text-gray-600'}`}
          />
          <span className={`text-sm font-medium ${isSelected ? 'text-black' : 'text-gray-700'}`}>
            {amenity.name}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader showProgress={true} />

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-[32px] font-medium text-gray-900 mb-12 text-center">
            Tell guests what your place has to offer
          </h1>

          {/* Amenity Categories */}
          <div className="space-y-16">
            {amenityCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-medium text-gray-900 mb-2">
                    {category.title}
                  </h2>
                  {category.subtitle && (
                    <p className="text-gray-600">
                      {category.subtitle}
                    </p>
                  )}
                </div>

                {/* Amenities Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {category.items.map((amenity) => (
                    <AmenityItem
                      key={amenity.id}
                      amenity={amenity}
                      isSelected={selectedAmenities.includes(amenity.id)}
                      onClick={() => toggleAmenity(amenity.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <OnboardingFooter
        onBack={() => navigate('/pages/makeitstandout', {
          state: {
            ...location.state,
            draftId: state?.draftId || location.state?.draftId
          }
        })}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={true}
      />
    </div>
  );
};

export default Amenities;