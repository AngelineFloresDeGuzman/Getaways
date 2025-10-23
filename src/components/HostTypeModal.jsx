import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { useNavigate } from 'react-router-dom';
import { X, Home, Mountain, BellRing } from 'lucide-react';
import { saveDraft } from '@/pages/Host/services/draftService';
import { loadDraft } from '@/pages/Host/services/draftService';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LogIn from '@/pages/Auth/LogIn';
import SignUp from '@/pages/Auth/SignUp';

const HostTypeModal = ({ isOpen, onClose, currentUser }) => {

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

  useEffect(() => {
    if (isOpen) {
      setModalSession((s) => s + 1); // increment to mark a new modal session
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setShowLoginModal(false);
    setShowSignUpModal(false);
    setSelectedHostType(null);

    if (!currentUser) {
      // Always show signup modal first for logged out users
      setShowHostTypeSelection(false);
      setShowSignUpModal(true);
    } else {
      // Always show 'Continue as Host' modal first for logged-in users
      setShowHostTypeSelection(false);
      // Do NOT update roles here; only after host type selection
    }
    // eslint-disable-next-line
  }, [modalSession, currentUser]);


  // Only show the modal overlay if one of the modals or host type selection or continue-as-host is visible
  const shouldShowModal = showHostTypeSelection || showLoginModal || showSignUpModal || (currentUser && !showHostTypeSelection && !showLoginModal && !showSignUpModal);

  const handleOutsideClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleHostTypeClick = async (hostType) => {
    setSelectedHostType(hostType);
    let category = 'accommodation';
    if (hostType === 'experience') category = 'experience';
    if (hostType === 'service') category = 'service';
    setPendingCategory(category);
    if (actions.updateCategory) actions.updateCategory(category);
    // Only after host type is chosen, update roles and save draft
    if (currentUser) {
      try {
        // Remove non-serializable fields from state
        const { user, isLoading, ...rest } = state;
        const draftData = { ...rest, category };
        await saveDraft(draftData, state.draftId);
        // Update user roles in Firestore only now
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          roles: ['guest', 'host'],
          updatedAt: new Date().toISOString(),
        });
        navigate('/pages/hosting-steps');
        onClose();
      } catch (err) {
        console.error('Error saving draft with category to Firestore:', err);
      }
    } else {
      setShowSignUpModal(true);
    }
    setPendingDraft(false);
    setPendingCategory(null);
  };

  // Effect: when context category matches pendingCategory and pendingDraft is true, create the draft



  // After login/signup, show host type selection instead of closing modal
  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    setShowHostTypeSelection(true);
  };

  const handleCloseSignUpModal = () => {
    setShowSignUpModal(false);
    setShowHostTypeSelection(true);
  };

  const handleSwitchToSignup = () => {
    setShowLoginModal(false);
    setShowSignUpModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowSignUpModal(false);
    setShowLoginModal(true);
  };

  const handleContinueAsHost = async () => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Always set roles to ['guest', 'host'] (no duplicates, no extras)
        await updateDoc(userDocRef, {
          roles: ['guest', 'host'],
          updatedAt: new Date().toISOString(),
        });
        navigate('/pages/hosting-steps');
        onClose();
        console.log('✅ Host role set to ["guest", "host"]');
        return;
      }
      navigate('/pages/hosting-steps');
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
                    onClick={() => handleHostTypeClick('place')}
                    className="flex flex-col items-center p-8 border border-gray-200 rounded-2xl hover:border-gray-400 transition-all hover:shadow-sm"
                  >
                    <div className="w-24 h-24 mb-6 flex items-center justify-center">
                      <Home className="w-20 h-20 text-primary-600" />
                    </div>
                    <span className="text-lg font-medium">Accommodations</span>
                  </button>
                  <button
                    onClick={() => handleHostTypeClick('experience')}
                    className="flex flex-col items-center p-8 border border-gray-200 rounded-2xl hover:border-gray-400 transition-all hover:shadow-sm"
                  >
                    <div className="w-24 h-24 mb-6 flex items-center justify-center">
                      <Mountain className="w-20 h-20 text-primary-600" />
                    </div>
                    <span className="text-lg font-medium">Experiences</span>
                  </button>
                  <button
                    onClick={() => handleHostTypeClick('service')}
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
