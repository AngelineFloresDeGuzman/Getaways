import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useNavigate } from 'react-router-dom';
import { X, Home, Mountain, BellRing } from 'lucide-react';
import { saveDraft } from '@/pages/Host/services/draftService';
import { loadDraft } from '@/pages/Host/services/draftService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LogIn from '@/pages/Auth/LogIn';
import SignUp from '@/pages/Auth/SignUp';

const HostTypeModal = ({ isOpen, onClose, currentUser, forceHostTypeSelection, fromNavbar = false }) => {

  const onboardingContext = useOnboarding();
  const { actions, state } = onboardingContext;
  const category = state?.category;
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showHostTypeSelection, setShowHostTypeSelection] = useState(false);
  const [selectedHostType, setSelectedHostType] = useState(null);
  // Always declare all useState hooks at the top level
  const [pendingDraft, setPendingDraft] = useState(false);
  const [pendingCategory, setPendingCategory] = useState(null);
  // Place all useState hooks at the top to avoid hook order bugs
  // Track if modal was opened for onboarding (not just due to login state change)
  const [modalSession, setModalSession] = useState(0);
  // Loading state for draft creation
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  // Track if user just came from signup flow
  const [cameFromSignup, setCameFromSignup] = useState(false);
  // Track if we're explicitly switching to login (don't let useEffect override) - using ref to avoid triggering re-renders
  const explicitLoginSwitch = useRef(false);
  // Track if login was successful (to differentiate between closing after login vs closing without login)
  const loginSuccessful = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setModalSession((s) => s + 1); // increment to mark a new modal session
      loginSuccessful.current = false; // Reset login success flag when modal opens
    } else {
      // Reset flags when modal closes
      explicitLoginSwitch.current = false;
      loginSuccessful.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    // useEffect: Triggered
    if (!isOpen) return;
    
    // Don't override if we're explicitly switching to login
    if (explicitLoginSwitch.current) {
      // useEffect: Skipping - explicitLoginSwitch is true
      return;
    }
    
    // useEffect: Resetting modal states
    setShowLoginModal(false);
    setShowSignUpModal(false);
    setSelectedHostType(null);

    if (!currentUser) {
      // Always show signup modal first for logged out users
      // No user - showing signup modal
      setShowHostTypeSelection(false);
      setShowSignUpModal(true);
    } else if (forceHostTypeSelection || cameFromSignup) {
      // If forced OR user just signed up, show host type selection directly
      setShowHostTypeSelection(true);
      // Reset the flag after using it
      if (cameFromSignup) {
        setCameFromSignup(false);
      }
      // Also clear localStorage flag
      localStorage.removeItem('justSignedUpForHosting');
    } else {
      // Check if opened from navbar - always show "Continue as Host" screen
      if (fromNavbar) {
        // Always show "Continue as Host" when opening from navbar
        setShowHostTypeSelection(false);
        // Clear any lingering signup flags
        localStorage.removeItem('justSignedUpForHosting');
      } else {
        // Check if user just signed up (from localStorage)
        const justSignedUp = localStorage.getItem('justSignedUpForHosting');
        if (justSignedUp === 'true') {
          // Skip "Continue as Host" and go directly to host type selection
          setShowHostTypeSelection(true);
          localStorage.removeItem('justSignedUpForHosting');
        } else {
          // Show 'Continue as Host' modal for regular login users
          setShowHostTypeSelection(false);
        }
      }
      // Do NOT update roles here; only after host type selection
    }
    // eslint-disable-next-line
  }, [modalSession, currentUser, forceHostTypeSelection, cameFromSignup, fromNavbar]);


  // Only show the modal overlay if one of the modals or host type selection or continue-as-host is visible
  const shouldShowModal = showHostTypeSelection || showLoginModal || showSignUpModal || (currentUser && !showHostTypeSelection && !showLoginModal && !showSignUpModal);

  const handleOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleHostTypeClick = async (hostType) => {
    const category =
      hostType === "accommodation" || hostType === "experience" || hostType === "service"
        ? hostType
        : "accommodation";

    setSelectedHostType(category);

    try {
      if (!currentUser) {
        console.log('User not authenticated, showing signup modal');
        setShowSignUpModal(true);
        return;
      }

      console.log('🚀 Starting draft creation for category:', category);
      
      // Set initial step based on category
      const initialStep = category === "experience" 
        ? "experience-category-selection" 
        : category === "service"
        ? "service-category-selection"
        : "hostingsteps";
      
      // Prepare minimal draft data with proper structure
      const draftData = {
        category,
        currentStep: initialStep,
        data: {},
      };

      // Always create a new draftId
      const newDraftId = `${currentUser.uid}_${Date.now()}`;
      console.log('📝 Creating draft with ID:', newDraftId);
      
      // Save draft to Firestore
      await saveDraft(draftData, newDraftId);
      console.log('✅ Draft saved successfully to Firestore');

      // Update onboarding context with draft info
      if (actions.setDraftId) {
        actions.setDraftId(newDraftId);
        console.log('✅ Draft ID set in context');
      }
      
      if (actions.updateCategory) {
        actions.updateCategory(category);
        console.log('✅ Category set in context:', category);
      }
      
      if (actions.setCurrentStep) {
        actions.setCurrentStep(initialStep);
        console.log('✅ Current step set to', initialStep);
      }

      // Check if user already has host role
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentRoles = Array.isArray(userData.roles) ? userData.roles : [userData.roles || 'guest'];
        
        // Only update if not already a host
        if (!currentRoles.includes('host')) {
          console.log('🔄 Adding host role to user');
          await updateDoc(userDocRef, {
            roles: ["guest", "host"],
            updatedAt: new Date().toISOString(),
          });
          console.log('✅ User roles updated to include host');
        } else {
          console.log('ℹ️ User already has host role');
        }
      }

      console.log('🎯 Navigating to onboarding steps');
      
      // Clear the signup flag since user has now selected their hosting type
      localStorage.removeItem('justSignedUpForHosting');
      
      // Navigate to first onboarding step based on category
      if (category === "experience") {
        navigate(`/pages/experience-category-selection`, { 
          state: { 
            draftId: newDraftId,
            category: category,
            isNewDraft: true
          } 
        });
      } else if (category === "service") {
        navigate(`/pages/service-category-selection`, { 
          state: { 
            draftId: newDraftId,
            category: category,
            isNewDraft: true
          } 
        });
      } else {
        // Navigate to first onboarding step with draft ID for accommodations
        navigate(`/pages/hostingsteps`, { 
          state: { 
            draftId: newDraftId,
            category: category,
            isNewDraft: true
          } 
        });
      }
      
      onClose();
      console.log('✅ Draft creation flow completed successfully');
      
    } catch (err) {
      console.error("❌ Error creating host draft:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      
      // Show user-friendly error message
      alert(`Failed to create listing draft: ${err.message || 'Unknown error'}. Please try again.`);
    }
  };

  // Effect: when context category matches pendingCategory and pendingDraft is true, create the draft



  // Handle closing login modal - only show host type selection if login was successful
  const handleCloseLoginModal = () => {
    explicitLoginSwitch.current = false; // Reset flag
    setShowLoginModal(false);
    
    // Only show host type selection if login was successful
    // If user just closed the modal without logging in, close everything
    if (loginSuccessful.current) {
      setShowHostTypeSelection(true);
      loginSuccessful.current = false; // Reset flag
    } else {
      // User closed modal without logging in, close everything
      onClose();
    }
  };

  // Handle successful login - this will be called from LogIn component after successful login
  const handleLoginSuccess = () => {
    loginSuccessful.current = true;
    explicitLoginSwitch.current = false; // Reset flag
    setShowLoginModal(false);
    // Show host type selection after successful login
    setShowHostTypeSelection(true);
  };

  const handleCloseSignUpModal = () => {
    // User completed signup, set flag in localStorage so they skip "Continue as Host" when they login later
    localStorage.setItem('justSignedUpForHosting', 'true');
    setCameFromSignup(true);
    setShowSignUpModal(false);
    // Don't automatically show login modal - let them verify email first
    onClose(); // Close the entire modal
  };

  const handleSwitchToSignup = () => {
    // User manually switching from login to signup (not from signup flow)
    explicitLoginSwitch.current = false; // Reset flag
    setCameFromSignup(false);
    setShowLoginModal(false);
    setShowSignUpModal(true);
  };

  const handleSwitchToLogin = () => {
    // User switching from signup to login (they just signed up)
    console.log('🔄 HostTypeModal: handleSwitchToLogin called');
    console.log('🔄 Setting explicitLoginSwitch.current = true');
    localStorage.setItem('justSignedUpForHosting', 'true');
    // Don't set cameFromSignup here - let them login first
    explicitLoginSwitch.current = true; // Prevent useEffect from overriding
    console.log('🔄 Setting showSignUpModal = false, showLoginModal = true');
    setShowSignUpModal(false);
    setShowLoginModal(true);
    console.log('✅ HostTypeModal: Modal states updated');
  };

  const handleContinueAsHost = async () => {
    if (!currentUser) return;

    try {
      // Clear the signup flag since user is continuing as host
      localStorage.removeItem('justSignedUpForHosting');
      
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Always set roles to ['guest', 'host'] (no duplicates, no extras)
        await updateDoc(userDocRef, {
          roles: ['guest', 'host'],
          updatedAt: new Date().toISOString(),
        });
        navigate('/pages/hostingsteps');
        onClose();
        console.log('✅ Host role set to ["guest", "host"]');
        return;
      }
      navigate('/pages/hostingsteps');
      onClose();
    } catch (error) {
      console.error('❌ Error upgrading user to host:', error);
    }
  };


  return (
    <div
      className={isOpen ? "fixed inset-0 bg-black/25 flex items-center justify-center z-50" : "hidden"}
      onClick={handleOutsideClick}
    >
      {shouldShowModal && (
        <>
          {showHostTypeSelection && (
            <div className="bg-white rounded-xl w-[720px] relative">
              <button onClick={onClose} className="absolute left-6 top-6">
                <X className="w-6 h-6" />
              </button>
              {/* Host Type Selection */}
              <div className="pt-16 pb-12 px-16">
                <h2 className="text-[28px] text-center mb-14 font-medium">
                  What would you like to host?
                </h2>
                <div className="grid grid-cols-3 gap-8">
                  <button
                    onClick={() => handleHostTypeClick("accommodation")}
                    className="flex flex-col items-center p-8 border border-gray-200 rounded-2xl hover:border-gray-400 transition-all hover:shadow-sm"
                  >
                    <div className="w-24 h-24 mb-6 flex items-center justify-center">
                      <Home className="w-20 h-20 text-primary-600" />
                    </div>
                    <span className="text-lg font-medium">Accommodations</span>
                  </button>
                  <button
                    onClick={() => handleHostTypeClick("experience")}
                    className="flex flex-col items-center p-8 border border-gray-200 rounded-2xl hover:border-gray-400 transition-all hover:shadow-sm"
                  >
                    <div className="w-24 h-24 mb-6 flex items-center justify-center">
                      <Mountain className="w-20 h-20 text-primary-600" />
                    </div>
                    <span className="text-lg font-medium">Experiences</span>
                  </button>
                  <button
                    onClick={() => handleHostTypeClick("service")}
                    className="flex flex-col items-center p-8 border border-gray-200 rounded-2xl hover:border-gray-400 transition-all hover:shadow-sm"
                  >
                    <div className="w-24 h-24 mb-6 flex items-center justify-center">
                      <BellRing className="w-20 h-20 text-primary-600" />
                    </div>
                    <span className="text-lg font-medium">Services</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Continue as Host Modal for logged-in users */}
          {currentUser && !showHostTypeSelection && !showLoginModal && !showSignUpModal && (
            <div className="bg-white rounded-2xl w-[520px] max-w-full p-10 flex flex-col items-center relative shadow-xl">
              <button onClick={onClose} className="absolute left-6 top-6">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-semibold mb-6 mt-2 text-center">Welcome back, {currentUser.displayName || maskEmail(currentUser.email)}</h2>
              <div className="flex flex-col items-center mb-8 w-full">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-5xl font-bold mb-3">
                  {currentUser.displayName ? currentUser.displayName[0] : 'A'}
                </div>
                <div className="flex items-center text-gray-600 text-base">
                  <span className="mr-2">📧</span>
                  <span className="font-mono tracking-wider">{maskEmail(currentUser.email)}</span>
                </div>
              </div>
              <button
                className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark text-lg font-medium mb-3 transition"
                onClick={() => setShowHostTypeSelection(true)}
              >
                Continue as Host
              </button>
              <button
                className="text-sm text-gray-500 underline mt-1 hover:text-gray-700 transition"
                onClick={() => {
                  setShowSignUpModal(true);
                  // Optionally sign out if you want to force logout: if(window.auth) window.auth.signOut();
                }}
              >
                Not you? Use another account
              </button>
            </div>
          )}

          {/* Modals */}
          {showLoginModal && (
            <LogIn
              isModal={true}
              onClose={handleCloseLoginModal}
              onLoginSuccess={handleLoginSuccess}
              onSwitchToSignup={handleSwitchToSignup}
              upgradeToHost={true}
            />
          )}
          {showSignUpModal && (
            <SignUp
              isModal={true}
              onClose={handleCloseSignUpModal}
              onSwitchToLogin={handleSwitchToLogin}
              defaultAccountType="host"
            />
          )}
        </>
      )}
    </div>
  );
};

export default HostTypeModal;

// Helper to mask email address (must be after export default)
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  if (!name || !domain) return email;
  if (name.length <= 2) return name + '@' + domain;
  if (name.length <= 4) return name[0] + '••••' + name[name.length - 1] + '@' + domain;
  return name.slice(0, 2) + '••••••' + name.slice(-2) + '@' + domain;
}
