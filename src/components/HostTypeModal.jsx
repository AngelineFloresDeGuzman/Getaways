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
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleHostTypeClick = (hostType) => {
    setSelectedHostType(hostType);
    
    if (currentUser) {
      // User is authenticated, show welcome screen to confirm hosting
      setShowHostTypeSelection(false);
      setShowWelcomeScreen(true);
    } else {
      // User not authenticated, show signup modal directly
      setShowSignUpModal(true);
    }
  };

  const handleContinueAsHost = async (event) => {
    // Prevent any accidental calls
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log("🟡 Continue as Host clicked");
    console.log("Current User:", currentUser?.uid);
    console.log("Selected Host Type:", selectedHostType);
    
    if (!currentUser || !selectedHostType) {
      console.error("❌ Missing currentUser or selectedHostType");
      return;
    }
    
    // If user is not already a host, upgrade their role
    try {
      console.log("🟡 Fetching user data from Firestore...");
      // Get user data from Firestore to check current role
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("📄 Current user role:", userData.role);
        
        // Check if user already has host capabilities
        const currentRoles = userData.roles || [userData.role]; // Handle both old single role and new multiple roles
        const hasHostRole = currentRoles.includes("host");
        
        if (!hasHostRole) {
          console.log("🟡 Adding host role to user...");
          // Add host role while preserving existing roles
          const updatedRoles = [...new Set([...currentRoles, "host"])]; // Use Set to avoid duplicates
          await updateDoc(userDocRef, {
            roles: updatedRoles,
            role: userData.role, // Keep original primary role
            updatedAt: new Date().toISOString(),
          });
          console.log("✅ Host role added. User now has roles:", updatedRoles);
        } else {
          console.log("ℹ️ User already has host capabilities");
        }
      }
      
      // Navigate based on host type selection
      console.log("🟡 Navigating to onboarding...");
      if (selectedHostType === 'place') {
        console.log("→ Navigating to /pages/propertydetails");
        navigate('/pages/propertydetails');
      } else if (selectedHostType === 'experience') {
        console.log("→ Navigating to /host/hostdashboard");
        navigate('/host/hostdashboard');
      } else {
        console.log("→ Navigating to /pages/propertydetails (default)");
        navigate('/pages/propertydetails'); // Default fallback
      }
      
      console.log("✅ Navigation completed, closing modal");
      onClose();
    } catch (error) {
      console.error("❌ Error upgrading user to host:", error);
      // Still navigate even if upgrade fails
      console.log("🟡 Proceeding with navigation despite error...");
      navigate('/pages/propertydetails');
      onClose();
    }
  };

  const handleUseAnotherAccount = () => {
    setUseAnotherAccount(true);
    setShowSignUpModal(true);
  };

  const handleHostTypeSelection = (hostType, navigateTo, state = {}) => {
    navigate(navigateTo, { state });
    onClose();
  };

  const handleSwitchToSignup = () => {
    setShowLoginModal(false);
    setShowSignUpModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowSignUpModal(false);
    setShowLoginModal(true);
  };

  const handleBackToHostTypes = () => {
    setShowWelcomeScreen(false);
    setShowHostTypeSelection(true);
    setSelectedHostType(null);
    setUseAnotherAccount(false);
  };

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    // Reset to host type selection
    setUseAnotherAccount(false);
    setShowWelcomeScreen(false);
    setShowHostTypeSelection(true);
  };

  const handleCloseSignUpModal = () => {
    setShowSignUpModal(false);
    // Reset to host type selection
    setUseAnotherAccount(false);
    setShowWelcomeScreen(false);
    setShowHostTypeSelection(true);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/25 flex items-center justify-center z-50"
      onClick={handleOutsideClick}
    >
      <div className="bg-white rounded-xl w-[720px] relative"> {/* Increased width */}
        <button 
          onClick={onClose}
          className="absolute left-6 top-6" // Adjusted position
        >
          <X className="w-6 h-6" /> {/* Increased icon size */}
        </button>

        {/* Host Type Selection - Always shown first */}
        {showHostTypeSelection ? (
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
        ) : currentUser && showWelcomeScreen && !useAnotherAccount ? (
          /* Welcome Screen for Authenticated Users */
          <div className="pt-16 pb-12 px-16 text-center">
            <h2 className="text-2xl font-medium mb-8">
              Welcome back, {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
            </h2>

            {/* User Avatar */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gray-800 text-white rounded-full flex items-center justify-center text-2xl font-medium">
                {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Email Display */}
            <div className="flex justify-center items-center mb-8 text-gray-600">
              <div className="flex items-center">
                <span className="mr-2">📧</span>
                <span className="text-sm">
                  {currentUser.email?.replace(/(.{2}).*(@)/, '$1••••••••$2')}
                </span>
              </div>
            </div>

            {/* Continue as Host Button */}
            <button
              onClick={handleContinueAsHost}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 px-6 rounded-xl font-medium text-lg hover:from-rose-600 hover:to-pink-600 transition-all mb-4"
            >
              Continue as Host
            </button>

            {/* Use Another Account Link */}
            <div className="text-center">
              <button
                onClick={handleUseAnotherAccount}
                className="text-gray-600 hover:text-gray-800 text-sm underline transition-colors"
              >
                Not you? Use another account
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <LogIn 
          isModal={true} 
          onClose={handleCloseLoginModal}
          onSwitchToSignup={handleSwitchToSignup}
          upgradeToHost={true}
        />
      )}

      {/* SignUp Modal */}
      {showSignUpModal && (
        <SignUp 
          isModal={true} 
          onClose={handleCloseSignUpModal}
          onSwitchToLogin={handleSwitchToLogin}
          defaultAccountType="host"
        />
      )}
    </div>
  );
};

export default HostTypeModal;