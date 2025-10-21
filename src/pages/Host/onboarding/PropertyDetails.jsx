import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useOnboardingAutoSave, useOnboardingNavigation } from './hooks/useOnboardingAutoSave';
import { Home, Building2, TreePine } from 'lucide-react';

const PropertyDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Enhanced auto-save and state management
  const { 
    state, 
    actions, 
    loadDraftIfNeeded, 
    saveAndExit, 
    isLoading 
  } = useOnboardingAutoSave('property-details', []);
  
  const { navigateNext } = useOnboardingNavigation('property-details');
  
  const [selectedType, setSelectedType] = useState(state.propertyType || null);
  const [saveError, setSaveError] = useState(null);

  // Load draft if continuing from saved progress
  useEffect(() => {
    const initializePage = async () => {
      if (location.state?.draftId) {
        try {
          await loadDraftIfNeeded(location.state.draftId);
        } catch (error) {
          console.error('Error loading draft in PropertyDetails:', error);
          setSaveError('Failed to load saved progress. Starting fresh.');
        }
      }
      
      // Show any save error from previous navigation
      if (location.state?.saveError) {
        setSaveError(location.state.saveError);
        // Clear error after 5 seconds
        setTimeout(() => setSaveError(null), 5000);
      }
    };

    initializePage();
  }, [location.state, loadDraftIfNeeded]);

  // Update selectedType when state changes (after loading draft)
  useEffect(() => {
    if (state.propertyType) {
      setSelectedType(state.propertyType);
    }
  }, [state.propertyType]);

  // Update context when selectedType changes
  useEffect(() => {
    if (selectedType && selectedType !== state.propertyType) {
      actions.updatePropertyType(selectedType);
    }
  }, [selectedType, state.propertyType, actions]);

  const propertyTypes = [
    {
      id: 'house',
      title: 'House',
      subtitle: 'A place all to yourself',
      icon: Home,
      description: 'Guests have the whole place to themselves'
    },
    {
      id: 'apartment',
      title: 'Apartment', 
      subtitle: 'A place all to yourself',
      icon: Building2,
      description: 'Guests have the whole place to themselves'
    },
    {
      id: 'guesthouse',
      title: 'Guesthouse',
      subtitle: 'A place all to yourself', 
      icon: TreePine,
      description: 'Guests have the whole place to themselves'
    }
  ];

  const handlePropertyTypeSelect = (typeId) => {
    setSelectedType(typeId);
    actions.updatePropertyType(typeId);
    setSaveError(null); // Clear any previous errors
  };

  const handleNext = async () => {
    if (selectedType) {
      try {
        await navigateNext(navigate, '/pages/propertystructure', 'property-structure');
      } catch (error) {
        console.error('Error navigating to next step:', error);
        setSaveError('Failed to save progress. Continuing anyway...');
        // Continue navigation even if save fails
        setTimeout(() => {
          navigate('/pages/propertystructure');
        }, 1000);
      }
    }
  };

  const handleSaveAndExit = async () => {
    try {
      setSaveError(null);
      
      // Pass current page data to ensure it's saved
      const currentPageData = selectedType ? { propertyType: selectedType } : null;
      await saveAndExit(currentPageData);
    } catch (error) {
      console.error('Error saving and exiting:', error);
      setSaveError(error.message);
      
      // If it's an auth error, redirect to login
      if (error.message.includes('authenticated')) {
        setTimeout(() => navigate('/login'), 2000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b">
        <div className="py-4 px-8 flex justify-between items-center">
          <img src="/logo.jpg" alt="Getaways" className="h-8" />
          <div className="flex items-center gap-6">
            <button className="hover:underline">Questions?</button>
            <button 
              onClick={handleSaveAndExit}
              className="hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save & exit'}
            </button>
          </div>
        </div>
        
        {/* Error/Status Messages */}
        {saveError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-8">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{saveError}</p>
              </div>
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-8">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-blue-700">Loading your saved progress...</p>
              </div>
            </div>
          </div>
        )}
      </header>

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

            {/* Property Type Selection */}
            <div className="space-y-4">
              {propertyTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => handlePropertyTypeSelect(type.id)}
                    className={`w-full p-6 border-2 rounded-lg text-left transition-all hover:border-gray-400 ${
                      selectedType === type.id 
                        ? 'border-black bg-gray-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <Icon className="w-8 h-8 mt-1" />
                      <div className="flex-1">
                        <h3 className="text-lg font-medium">{type.title}</h3>
                        <p className="text-gray-600 text-sm">{type.subtitle}</p>
                        <p className="text-gray-500 text-xs mt-1">{type.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side Illustration */}
        <div className="w-[50%] bg-gray-50 flex items-center justify-center">
          <img 
            src="/images/property-layout.png" 
            alt=""
            className="w-[85%] h-auto object-contain"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white">
        <div className="max-w-none">
          {/* Progress Bar */}
          <div className="h-1 w-full flex space-x-2">
            <div className="h-full bg-gray-200 flex-1"></div>
            <div className="h-full bg-gray-200 flex-1"></div>
            <div className="h-full bg-gray-200 flex-1"></div>
          </div>
          
          <div className="px-8 py-6 border-t">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/hosting-steps')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                onClick={handleNext}
                disabled={!selectedType || isLoading}
                className={`rounded-lg px-8 py-3.5 text-base font-medium transition-colors ${
                  selectedType && !isLoading
                    ? 'bg-black text-white hover:bg-gray-800' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
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