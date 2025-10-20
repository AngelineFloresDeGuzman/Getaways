import { useNavigate } from 'react-router-dom';

/**
 * Custom hook for Save & Exit functionality
 * Can be used in any onboarding page that needs Save & Exit
 */
export const useSaveAndExit = () => {
  const navigate = useNavigate();

  const handleSaveAndExit = async () => {
    console.log('🔵 Save & Exit clicked!');
    
    try {
      // Check if user is authenticated
      const { auth } = await import('@/lib/firebase');
      const currentUser = auth.currentUser;
      console.log('👤 Current user:', currentUser);
      
      if (!currentUser) {
        console.log('❌ No user logged in');
        alert('Please log in to save your progress.');
        navigate('/login');
        return;
      }

      // Try to get onboarding context
      let onboardingActions = null;
      try {
        const { useOnboarding } = await import('@/pages/Host/contexts/OnboardingContext');
        const React = await import('react');
        
        // This is a bit of a hack but necessary since we can't use hooks conditionally
        // We'll need to pass the actions from the component
        console.log('⚠️ OnboardingContext available but requires component integration');
        alert('This page needs to be updated to support Save & Exit. Please use the navigation to go back and save from another page.');
        return;
        
      } catch (contextError) {
        console.log('⚠️ OnboardingContext not available, using basic save');
      }

      // Fallback: Save current page data to localStorage temporarily
      const currentPageData = {
        url: window.location.pathname,
        timestamp: new Date().toISOString(),
        userId: currentUser.uid,
        message: 'Basic save completed - please continue from a fully integrated page'
      };
      
      localStorage.setItem(`havenly_draft_${currentUser.uid}`, JSON.stringify(currentPageData));
      
      // Navigate to dashboard with message
      navigate('/host/hostdashboard', {
        state: {
          message: 'Progress saved! Continue editing from the drafts section.',
          draftSaved: true
        }
      });
      
    } catch (error) {
      console.error('❌ Error in Save & Exit:', error);
      alert('Failed to save progress: ' + error.message);
    }
  };

  return { handleSaveAndExit };
};

/**
 * Enhanced version for components that have OnboardingContext
 */
export const useSaveAndExitWithContext = (onboardingActions) => {
  const navigate = useNavigate();

  const handleSaveAndExit = async () => {
    console.log('🔵 Save & Exit clicked (with context)!');
    
    try {
      // Check if user is authenticated
      const { auth } = await import('@/lib/firebase');
      const currentUser = auth.currentUser;
      console.log('👤 Current user:', currentUser);
      
      if (!currentUser) {
        console.log('❌ No user logged in');
        alert('Please log in to save your progress.');
        navigate('/login');
        return;
      }

      if (!onboardingActions || !onboardingActions.saveAndExit) {
        console.log('❌ OnboardingContext actions not available');
        alert('Save functionality not available on this page. Please navigate to another page to save.');
        return;
      }

      console.log('💾 Using OnboardingContext to save...');
      await onboardingActions.saveAndExit();
      console.log('✅ Save and exit completed successfully!');
      
    } catch (error) {
      console.error('❌ Error in Save & Exit:', error);
      alert('Failed to save draft: ' + error.message);
    }
  };

  return { handleSaveAndExit };
};