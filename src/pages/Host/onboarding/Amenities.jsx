import React, { useState, useEffect, useRef } from 'react';
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
import { useOnboardingAutoSave, useOnboardingNavigation } from './hooks/useOnboardingAutoSave';

const Amenities = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Enhanced auto-save and state management
  const { 
    state, 
    actions, 
    loadDraftIfNeeded, 
    saveAndExit, 
    isLoading 
  } = useOnboardingAutoSave('amenities', []);
  
  const { navigateNext, navigateBack } = useOnboardingNavigation('amenities');
  
  const [selectedAmenities, setSelectedAmenities] = useState(state.selectedAmenities || []);

  // Load draft if continuing from saved progress
  useEffect(() => {
    const initializePage = async () => {
      if (location.state?.draftId) {
        try {
          await loadDraftIfNeeded(location.state.draftId);
        } catch (error) {
          console.error('Error loading draft in Amenities:', error);
        }
      }
    };

    initializePage();
  }, [location.state, loadDraftIfNeeded]);

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
      // Ensure latest amenities are saved
      actions.updateState({ selectedAmenities });
  await navigateNext(navigate, '/pages/photos', 'photos', state.draftId);
    } catch (error) {
      console.error('Error navigating to next step:', error);
      // Continue navigation even if save fails
      navigate('/pages/photos');
    }
  };

  const handleSaveAndExit = async () => {
    try {
      // Pass current page data to ensure it's saved
      const currentPageData = { selectedAmenities };
      await saveAndExit(currentPageData);
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b">
        <div className="py-4 px-8 flex justify-between items-center">
          <svg viewBox="0 0 32 32" className="h-8 w-8">
            <path d="m16 1c2.008 0 3.978.378 5.813 1.114 1.837.736 3.525 1.798 4.958 3.138 1.433 1.34 2.56 2.92 3.355 4.628.795 1.709 1.2 3.535 1.2 5.394 0 1.859-.405 3.685-1.2 5.394-.795 1.708-1.922 3.288-3.355 4.628-1.433 1.34-3.121 2.402-4.958 3.138-1.835.736-3.805 1.114-5.813 1.114s-3.978-.378-5.813-1.114c-1.837-.736-3.525-1.798-4.958-3.138-1.433-1.34-2.56-2.92-3.355-4.628-.795-1.709-1.2-3.535-1.2-5.394 0-1.859.405-3.685 1.2-5.394.795-1.708 1.922-3.288 3.355-4.628 1.433-1.34 3.121-2.402 4.958-3.138 1.835-.736 3.805-1.114 5.813-1.114z" fill="rgb(255, 56, 92)"/>
          </svg>
          <div className="flex items-center gap-6">
            <button className="font-medium text-sm hover:underline">Questions?</button>
            <button 
              onClick={handleSaveAndExit}
              disabled={isLoading}
              className="font-medium text-sm hover:underline disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save & exit'}
            </button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="h-1 w-full flex space-x-2">
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-3/4"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1"></div>
        </div>
      </div>

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

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigateBack(navigate, '/pages/makeitstandout')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className="bg-black text-white hover:bg-gray-800 rounded-lg px-8 py-3.5 text-base font-medium"
                onClick={handleNext}
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

export default Amenities;