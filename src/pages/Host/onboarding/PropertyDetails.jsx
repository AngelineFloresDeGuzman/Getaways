import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { Home, Building2, TreePine } from 'lucide-react';

const PropertyDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Add error boundary for context
  let contextData;
  try {
    contextData = useOnboarding();
  } catch (error) {
    console.error('Failed to load onboarding context:', error);
    // Fallback handling
    contextData = { 
      state: { propertyType: null, isLoading: false }, 
      actions: { 
        updatePropertyType: () => console.log('Mock updatePropertyType'),
        saveAndExit: () => Promise.reject(new Error('Context not available'))
      } 
    };
  }
  
  const { state, actions } = contextData;
  const [selectedType, setSelectedType] = useState(state.propertyType || null);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Check if we're continuing from a draft
  useEffect(() => {
    const loadDraftFromState = async () => {
      if (location.state?.draftId && !hasLoadedDraft) {
        setHasLoadedDraft(true);
        try {
          await actionsRef.current.loadDraft(location.state.draftId);
        } catch (error) {
          console.error('Error loading draft in PropertyDetails:', error);
          setHasLoadedDraft(false); // Reset on error so user can retry
        }
      }
    };

    loadDraftFromState();
  }, [location.state?.draftId, hasLoadedDraft]);

  // Force reset loading state once draft is loaded and we have the data
  useEffect(() => {
    if (hasLoadedDraft && state.draftId && state.isLoading) {
      console.log('Draft loaded, resetting loading state');
      actionsRef.current.setLoading(false);
    }
  }, [hasLoadedDraft, state.draftId, state.isLoading]);

  // Safety mechanism to reset loading state if stuck
  useEffect(() => {
    if (state.isLoading) {
      const timeoutId = setTimeout(() => {
        console.warn('Loading state was stuck, forcing reset');
        actionsRef.current.setLoading(false);
      }, 5000); // 5 second timeout

      return () => clearTimeout(timeoutId);
    }
  }, [state.isLoading]);

  // Update selectedType when state changes (after loading draft)
  useEffect(() => {
    if (state.propertyType) {
      setSelectedType(state.propertyType);
    }
  }, [state.propertyType]);

  // Update context when selectedType changes
  useEffect(() => {
    if (selectedType && selectedType !== state.propertyType) {
      actionsRef.current.updatePropertyType(selectedType);
    }
  }, [selectedType, state.propertyType]);

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
  };

  const handleNext = () => {
    if (selectedType) {
      actions.setCurrentStep('property-structure');
      navigate('/pages/propertystructure');
    }
  };

  const handleSaveAndExit = async () => {
    console.log('Save & Exit clicked!'); // Debug log
    console.log('Current state:', state); // Debug log
    console.log('Actions available:', actions); // Debug log
    
    // Check if user is authenticated
    const { auth } = await import('@/lib/firebase');
    const currentUser = auth.currentUser;
    console.log('Current user:', currentUser);
    
    if (!currentUser) {
      alert('Please log in to save your progress.');
      navigate('/login');
      return;
    }
    
    try {
      console.log('Calling saveAndExit...');
      await actions.saveAndExit();
      console.log('Save and exit completed!');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b">
        <div className="py-4 px-8 flex justify-between items-center">
          <img src="/logo.jpg" alt="Havenly" className="h-8" />
          <div className="flex items-center gap-6">
            <button className="hover:underline">Questions?</button>
            <button 
              onClick={handleSaveAndExit}
              className="hover:underline"
              disabled={state.isLoading}
            >
              {state.isLoading ? 'Saving...' : 'Save & exit'}
            </button>
          </div>
        </div>
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
                onClick={() => navigate('/become-host/steps')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                onClick={handleNext}
                disabled={!selectedType}
                className={`rounded-lg px-8 py-3.5 text-base font-medium transition-colors ${
                  selectedType 
                    ? 'bg-black text-white hover:bg-gray-800' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
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

export default PropertyDetails;