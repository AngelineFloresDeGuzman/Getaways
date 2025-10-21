import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import OnboardingHeader from './components/OnboardingHeader';
import { auth } from '../../../lib/firebase';

const Pricing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  
  const [basePrice, setBasePrice] = useState(state.weekdayPrice || 1511);
  const [isSaving, setIsSaving] = useState(false);
  const guestPrice = Math.round(basePrice * 1.14); // Roughly 14% markup for taxes/fees

  const canProceed = basePrice > 0;

  const handlePriceChange = (increment) => {
    const newPrice = Math.max(100, basePrice + increment);
    console.log('Price changing from', basePrice, 'to', newPrice);
    setBasePrice(newPrice);
    
    // Update context with new pricing - use the correct action signature
    console.log('Updating context pricing:', newPrice, state.weekendPrice || 0);
    actions.updatePricing(newPrice, state.weekendPrice || 0);
  };

  // Load draft data when navigating from "Continue Editing"
  useEffect(() => {
    const loadDraftData = async () => {
      // Only load draft if user is authenticated and we have a draftId
      if (location.state?.draftId && actions.loadDraft && state.user) {
        console.log('Pricing - Loading draft with ID:', location.state.draftId);
        try {
          await actions.loadDraft(location.state.draftId);
          console.log('Pricing - Draft loaded successfully');
        } catch (error) {
          console.error('Pricing - Error loading draft:', error);
        }
      }
    };

    loadDraftData();
  }, [location.state?.draftId, state.user]);

  // Update pricing from state when draft loads
  useEffect(() => {
    if (state.weekdayPrice && state.weekdayPrice !== basePrice) {
      console.log('Pricing - Updating price from state:', state.weekdayPrice);
      setBasePrice(state.weekdayPrice);
    }
  }, [state.weekdayPrice]);

  // Update context whenever basePrice changes
  useEffect(() => {
    if (basePrice !== state.weekdayPrice) {
      console.log('Pricing - Updating context with new price:', basePrice);
      actions.updatePricing(basePrice, state.weekendPrice || 0);
    }
  }, [basePrice]);

  // Custom save handler
  const handleSaveAndExitClick = async () => {
    console.log('Pricing Save & Exit clicked');
    console.log('Current user:', auth.currentUser);
    console.log('Current state:', state);
    console.log('Current basePrice:', basePrice);
    
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.error('No authenticated user found');
      alert('You must be logged in to save your progress. Please log in and try again.');
      return;
    }
    
    setIsSaving(true);
    try {
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('Pricing: Setting currentStep to pricing');
        actions.setCurrentStep('pricing');
      }
      
      // First, update context with current pricing
      console.log('Updating context pricing before save:', basePrice, state.weekendPrice || 0);
      actions.updatePricing(basePrice, state.weekendPrice || 0);
      
      // Wait a bit for context to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Override the saveDraft to ensure currentStep is set correctly
      if (actions.saveDraft) {
        console.log('Pricing: Calling custom saveDraft with forced currentStep');
        console.log('Pricing: Current state before save:', {
          currentStep: state.currentStep,
          weekdayPrice: state.weekdayPrice,
          basePrice: basePrice
        });
        
        // Create modified state data with forced currentStep and pricing
        const { user, isLoading, ...dataToSave } = state;
        dataToSave.currentStep = 'pricing'; // Force the currentStep
        dataToSave.weekdayPrice = basePrice; // Use correct property name
        
        console.log('Pricing: Final data to save:', {
          currentStep: dataToSave.currentStep,
          weekdayPrice: dataToSave.weekdayPrice,
          draftId: state.draftId
        });
        
        // Import the draftService directly and save with our custom data
        const { saveDraft } = await import('@/pages/Host/services/draftService');
        const draftId = await saveDraft(dataToSave, state.draftId);
        
        console.log('Pricing: Draft saved successfully with ID:', draftId);
        
        // Verify what was actually saved by loading it back
        const { loadDraft } = await import('@/pages/Host/services/draftService');
        const savedDraft = await loadDraft(draftId);
        console.log('Pricing: Verification - what was actually saved:', {
          currentStep: savedDraft?.currentStep,
          weekdayPrice: savedDraft?.weekdayPrice
        });
        
        // Update the draftId in context
        if (actions.setDraftId) {
          actions.setDraftId(draftId);
        }
        
        alert(`Pricing data saved successfully! Draft ID: ${draftId}\nCurrentStep: ${savedDraft?.currentStep}\nPrice: ₱${savedDraft?.weekdayPrice}`);
        
        // Navigate to dashboard
        navigate('/host/hostdashboard', { 
          state: { 
            message: 'Draft saved successfully!',
            draftSaved: true 
          }
        });
      } else {
        console.log('Pricing: No saveDraft action available, trying fallback');
        // Fallback to normal save
        await actions.saveAndExit();
      }
      
    } catch (error) {
      console.error('Error in Pricing save:', error);
      alert('Failed to save progress: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Debug: Log the location state
  console.log('Pricing - location.state:', location.state);

  const handleNext = () => {
    // Update pricing in context before proceeding
    actions.updatePricing({ weekdayPrice: basePrice });
    navigate('/host/onboarding/weekend-pricing');
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-white">
      <OnboardingHeader 
        showProgress={true}
        currentStep={2}
        totalSteps={3}
        onSaveAndExit={handleSaveAndExitClick}
        isSaving={isSaving}
      />

      {/* Main Content */}
      <main className="pt-28 px-8 pb-32">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-medium text-gray-900 mb-4">
              Now, set a weekday base price
            </h1>
            <p className="text-lg text-gray-600">
              Tip: ₱{basePrice.toLocaleString()}. You'll set a weekend price next.
            </p>
          </div>

          {/* Price Display */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => handlePriceChange(-50)}
                className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
              >
                <span className="text-2xl font-light">−</span>
              </button>
              
              <div className="text-center">
                <div className="text-6xl font-medium text-gray-900 mb-2">
                  ₱{basePrice.toLocaleString()}
                </div>
                <button className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                  Guest price before taxes ₱{guestPrice.toLocaleString()}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              <button
                onClick={() => handlePriceChange(50)}
                className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
              >
                <span className="text-2xl font-light">+</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 text-center">
            <button className="flex items-center justify-center gap-2 text-red-600 hover:text-red-700 mx-auto">
              <MapPin className="w-4 h-4" />
              View similar listings
            </button>
            
            <button className="text-gray-600 hover:text-gray-800 underline">
              Learn more about pricing
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/guest-selection')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className={`rounded-lg px-8 py-3.5 text-base font-medium ${
                  canProceed
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (canProceed) {
                    // Continue to weekend pricing or completion
                    navigate('/pages/weekend-pricing', { 
                      state: { 
                        ...location.state,
                        weekdayPrice: basePrice
                      } 
                    });
                  }
                }}
                disabled={!canProceed}
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

export default Pricing;