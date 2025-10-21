import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Home, Mountain, BellRing } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LogIn from '@/pages/Auth/LogIn';
import SignUp from '@/pages/Auth/SignUp';

const HostTypeModal = ({ isOpen, onClose, currentUser }) => {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [showHostTypeSelection, setShowHostTypeSelection] = useState(true);
  const [selectedHostType, setSelectedHostType] = useState(null);
  const [useAnotherAccount, setUseAnotherAccount] = useState(false);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowLoginModal(false);
      setShowSignUpModal(false);
      setShowWelcomeScreen(false);
      setShowHostTypeSelection(true);
      setSelectedHostType(null);
      setUseAnotherAccount(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOutsideClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleHostTypeClick = (hostType) => {
    setSelectedHostType(hostType);
    if (currentUser) {
      setShowHostTypeSelection(false);
      setShowWelcomeScreen(true);
    } else {
      setShowSignUpModal(true);
    }
  };

  const handleContinueAsHost = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!currentUser || !selectedHostType) return;

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Prepare current roles safely
        const currentRoles = Array.isArray(userData.roles)
          ? [...userData.roles]
          : userData.role
            ? [userData.role]
            : ["guest"];

        // Add host role if missing
        if (!currentRoles.includes("host")) currentRoles.push("host");

        await updateDoc(userDocRef, {
          roles: currentRoles,
          updatedAt: new Date().toISOString(),
        });

        console.log("✅ Host role added. User now has roles:", currentRoles);
      }

      // Navigate based on host type
      if (selectedHostType === 'place') navigate('/pages/propertydetails');
      else if (selectedHostType === 'experience') navigate('/*');
      else navigate('/*');

      onClose();
    } catch (error) {
      console.error("❌ Error upgrading user to host:", error);
      navigate('/*');
      onClose();
    }
  };

  const handleUseAnotherAccount = () => {
    setUseAnotherAccount(true);
    setShowSignUpModal(true);
  };

  const handleSwitchToSignup = () => {
    setShowLoginModal(false);
    setShowSignUpModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowSignUpModal(false);
    setShowLoginModal(true);
  };

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    setUseAnotherAccount(false);
    setShowWelcomeScreen(false);
    setShowHostTypeSelection(true);
  };

  const handleCloseSignUpModal = () => {
    setShowSignUpModal(false);
    setUseAnotherAccount(false);
    setShowWelcomeScreen(false);
    setShowHostTypeSelection(true);
  };

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50" onClick={handleOutsideClick}>
      <div className="bg-white rounded-xl w-[720px] relative">
        <button onClick={onClose} className="absolute left-6 top-6">
          <X className="w-6 h-6" />
        </button>

        {showHostTypeSelection ? (
          <div className="pt-16 pb-12 px-16">
            <h2 className="text-[28px] text-center mb-14 font-medium">What would you like to host?</h2>
            <div className="grid grid-cols-3 gap-8">
              <button onClick={() => handleHostTypeClick('place')} className="flex flex-col items-center p-8 border border-gray-200 rounded-2xl hover:border-gray-400 transition-all hover:shadow-sm">
                <div className="w-24 h-24 mb-6 flex items-center justify-center">
                  <Home className="w-20 h-20 text-primary-600" />
                </div>
                <span className="text-lg font-medium">Accommodations</span>
              </button>

              <button onClick={() => handleHostTypeClick('experience')} className="flex flex-col items-center p-8 border border-gray-200 rounded-2xl hover:border-gray-400 transition-all hover:shadow-sm">
                <div className="w-24 h-24 mb-6 flex items-center justify-center">
                  <Mountain className="w-20 h-20 text-primary-600" />
                </div>
                <span className="text-lg font-medium">Experiences</span>
              </button>

              <button onClick={() => handleHostTypeClick('service')} className="flex flex-col items-center p-8 border border-gray-200 rounded-2xl hover:border-gray-400 transition-all hover:shadow-sm">
                <div className="w-24 h-24 mb-6 flex items-center justify-center">
                  <BellRing className="w-20 h-20 text-primary-600" />
                </div>
                <span className="text-lg font-medium">Services</span>
              </button>
            </div>
          </div>
        ) : currentUser && showWelcomeScreen && !useAnotherAccount ? (
          <div className="pt-16 pb-12 px-16 text-center">
            <h2 className="text-2xl font-medium mb-8">
              Welcome back, {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
            </h2>

            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gray-800 text-white rounded-full flex items-center justify-center text-2xl font-medium">
                {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="flex justify-center items-center mb-8 text-gray-600">
              <div className="flex items-center">
                <span className="mr-2">📧</span>
                <span className="text-sm">{currentUser.email?.replace(/(.{2}).*(@)/, '$1••••••••$2')}</span>
              </div>
            </div>

            <button onClick={handleContinueAsHost} className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 px-6 rounded-xl font-medium text-lg hover:from-rose-600 hover:to-pink-600 transition-all mb-4">
              Continue as Host
            </button>

            <div className="text-center">
              <button onClick={handleUseAnotherAccount} className="text-gray-600 hover:text-gray-800 text-sm underline transition-colors">
                Not you? Use another account
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {showLoginModal && <LogIn isModal={true} onClose={handleCloseLoginModal} onSwitchToSignup={handleSwitchToSignup} upgradeToHost={true} />}
      {showSignUpModal && <SignUp isModal={true} onClose={handleCloseSignUpModal} onSwitchToLogin={handleSwitchToLogin} defaultAccountType="host" />}
    </div>
  );
};

export default HostTypeModal;
