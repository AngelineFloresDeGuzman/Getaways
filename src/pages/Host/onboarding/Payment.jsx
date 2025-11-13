import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, collection, getDocs, query, orderBy } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import OnboardingHeader from './components/OnboardingHeader';
import { Lock, Shield, FileText, CheckCircle, Link2, ExternalLink, Wallet, AlertCircle, Award } from 'lucide-react';
import { createListing } from '@/pages/Host/services/listing';
import { updateSessionStorageBeforeNav } from './utils/sessionStorageHelper';
import { getWalletBalance, hasSufficientBalance, initializeWallet } from '@/pages/Common/services/getpayService';
import { getAdminPayPalEmail } from '@/pages/Admin/services/platformSettingsService';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';

// PayPal Client ID
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
const HAS_VALID_PAYPAL_CLIENT_ID = PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== 'test' && PAYPAL_CLIENT_ID.length > 10;

// PayPal Payment Button Component
const PayPalPaymentButton = ({ amount, planName, onPayment, disabled }) => {
  const [{ isPending, isResolved }] = usePayPalScriptReducer();
  
  if (!HAS_VALID_PAYPAL_CLIENT_ID) {
    return (
      <div className="text-center py-4 px-4 bg-primary/10 border border-primary/30 rounded-lg">
        <p className="text-sm text-primary font-semibold mb-1">
          PayPal is not configured
        </p>
        <p className="text-xs text-primary/90">
          Please set VITE_PAYPAL_CLIENT_ID in your .env file
        </p>
      </div>
    );
  }
  
  return (
    <>
      {isPending && <div className="text-center py-4 text-gray-600">Loading PayPal...</div>}
      {isResolved && (
        <PayPalButtons
          disabled={disabled || isPending}
          style={{
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'paypal'
          }}
          createOrder={(data, actions) => {
            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    value: amount.toFixed(2), // Amount is already in PHP
                    currency_code: 'PHP'
                  },
                  description: `${planName} - ₱${amount.toLocaleString()}`
                }
              ]
            });
          }}
          onApprove={(data, actions) => {
            return actions.order.capture().then((details) => {
              onPayment(details);
            }).catch((err) => {
              console.error('PayPal capture error:', err);
              alert('Payment failed: ' + (err?.message || 'Unknown error'));
            });
          }}
          onError={(err) => {
            console.error('PayPal error:', err);
            alert('PayPal payment failed: ' + (err?.message || 'Unknown error'));
          }}
          onCancel={(data) => {
            console.log('PayPal payment cancelled:', data);
            alert('Payment was cancelled');
          }}
        />
      )}
    </>
  );
};

// GetPay Payment Button Component
const GetPayPaymentButton = ({ amount, planName, onPayment, disabled, userId, paymentMethod, onPaymentMethodChange }) => {
  const [walletBalance, setWalletBalance] = useState(0);
  const [isCheckingBalance, setIsCheckingBalance] = useState(true);
  const [hasBalance, setHasBalance] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [hasPoints, setHasPoints] = useState(false);
  const [pointsNeeded, setPointsNeeded] = useState(0);
  const [pointsCurrencyValue, setPointsCurrencyValue] = useState(0);
  const POINTS_TO_CURRENCY_RATE = 10; // 10 points = ₱1

  useEffect(() => {
    const checkBalance = async () => {
      if (!userId) {
        setIsCheckingBalance(false);
        return;
      }
      try {
        // Check GetPay wallet balance
        await initializeWallet(userId);
        const balance = await getWalletBalance(userId);
        setWalletBalance(balance);
        setHasBalance(balance >= amount);

        // Check points balance
        const { getHostPoints, checkPointsForPayment } = await import('@/pages/Host/services/pointsService');
        const pointsData = await getHostPoints(userId);
        const currentPoints = pointsData.points || 0;
        setPointsBalance(currentPoints);
        
        const pointsCheck = await checkPointsForPayment(userId, amount);
        setHasPoints(pointsCheck.hasSufficient);
        setPointsNeeded(pointsCheck.pointsNeeded);
        setPointsCurrencyValue(pointsCheck.currencyAmount);

        setIsCheckingBalance(false);
      } catch (error) {
        console.error('Error checking balance:', error);
        setIsCheckingBalance(false);
      }
    };
    checkBalance();
  }, [userId, amount]);

  if (isCheckingBalance) {
    return (
      <div className="text-center py-6 px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent mx-auto mb-3"></div>
        <p className="text-sm text-gray-600">Checking your balance...</p>
      </div>
    );
  }

  const canPayWithWallet = hasBalance;
  const canPayWithPoints = hasPoints;
  const canPay = canPayWithWallet || canPayWithPoints;

  if (!canPay) {
    return (
      <div className="text-center py-6 px-4 bg-red-50 border-2 border-red-300 rounded-lg">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <p className="text-sm font-bold text-red-900 mb-2">
          Insufficient Balance
        </p>
        <p className="text-xs text-red-800 mb-2">
          You need ₱{amount.toLocaleString()} but:
        </p>
        <ul className="text-xs text-red-700 mb-4 text-left max-w-xs mx-auto space-y-1">
          <li>• GetPay Wallet: ₱{walletBalance.toLocaleString()}</li>
          <li>• Points: {pointsBalance.toLocaleString()} points (≈ ₱{(pointsBalance / POINTS_TO_CURRENCY_RATE).toFixed(2)})</li>
          <li>• Needed: {pointsNeeded.toLocaleString()} points (₱{amount.toLocaleString()})</li>
        </ul>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => window.location.href = '/ewallet'}
            className="text-sm bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors font-medium"
          >
            Go to GetPay Wallet
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Payment Method Selection */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-900 mb-2">Choose Payment Method:</p>
        
        {/* GetPay Wallet Option */}
        {canPayWithWallet && (
          <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            paymentMethod === 'wallet' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="paymentMethod"
              value="wallet"
              checked={paymentMethod === 'wallet'}
              onChange={(e) => onPaymentMethodChange && onPaymentMethodChange(e.target.value)}
              className="mr-3"
            />
            <Wallet className="w-5 h-5 text-primary mr-2" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">GetPay Wallet</p>
              <p className="text-xs text-gray-600">Balance: ₱{walletBalance.toLocaleString()}</p>
            </div>
            {hasBalance && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </label>
        )}

        {/* Points Option */}
        {canPayWithPoints && (
          <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            paymentMethod === 'points' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="paymentMethod"
              value="points"
              checked={paymentMethod === 'points'}
              onChange={(e) => onPaymentMethodChange && onPaymentMethodChange(e.target.value)}
              className="mr-3"
            />
            <Award className="w-5 h-5 text-amber-600 mr-2" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Points</p>
              <p className="text-xs text-gray-600">
                {pointsBalance.toLocaleString()} points (≈ ₱{(pointsBalance / POINTS_TO_CURRENCY_RATE).toFixed(2)}) - 
                Need {pointsNeeded.toLocaleString()} points
              </p>
            </div>
            {hasPoints && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </label>
        )}
      </div>

      {/* Payment Button */}
      <button
        onClick={onPayment}
        disabled={disabled || !paymentMethod}
        className="w-full py-3 px-6 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
      >
        {paymentMethod === 'points' 
          ? `Pay with ${pointsNeeded.toLocaleString()} Points (₱${amount.toLocaleString()})`
          : `Pay ₱${amount.toLocaleString()} with GetPay Wallet`
        }
      </button>
      
      <p className="text-xs text-gray-500 text-center">
        {paymentMethod === 'points' 
          ? `Payment will be deducted from your points and sent directly to admin's GetPay wallet`
          : `Payment will be deducted from your GetPay wallet and sent directly to admin's GetPay wallet`
        }
      </p>
    </div>
  );
};

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();
  const [isProcessing, setIsProcessing] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [acceptedCompliance, setAcceptedCompliance] = useState(false);
  const [draftId, setDraftId] = useState(location.state?.draftId || state?.draftId);
  const [listingId, setListingId] = useState(location.state?.listingId || null); // For edit mode
  const [isEditMode, setIsEditMode] = useState(location.state?.isEditMode || false);
  const [requiresPayment, setRequiresPayment] = useState(true); // Whether payment is required
  const [paypalAccountConnected, setPaypalAccountConnected] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [paypalAccountId, setPaypalAccountId] = useState('');
  const [paypalAccountName, setPaypalAccountName] = useState('');
  const [paypalEmailInput, setPaypalEmailInput] = useState('');
  const [isConnectingPayPal, setIsConnectingPayPal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [merchantPayPalEmail, setMerchantPayPalEmail] = useState('');
  const [isMerchantAccount, setIsMerchantAccount] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet', 'points', or 'paypal'
  const [paymentProvider, setPaymentProvider] = useState('getpay'); // 'getpay' or 'paypal' - top level payment provider
  const isPublishingRef = useRef(false); // Prevent duplicate publishing
  const isAutoPublishingRef = useRef(false); // Track if publishing from checkPaymentRequirement

  // Reset publishing ref on mount to ensure clean state
  useEffect(() => {
    isPublishingRef.current = false;
    isAutoPublishingRef.current = false;
  }, []);

  // Subscription plans
  const subscriptionPlans = [
    {
      id: 'monthly',
      name: 'Monthly Subscription',
      price: 999,
      description: 'Pay monthly to keep your listing active',
      popular: false
    },
    {
      id: 'yearly',
      name: 'Yearly Subscription',
      price: 9999,
      description: 'Save 17% with yearly subscription',
      popular: true,
      savings: '17%'
    }
  ];

  const [selectedPlan, setSelectedPlan] = useState('yearly');

  // Ref to prevent multiple simultaneous payment requirement checks
  const isCheckingPaymentRef = useRef(false);
  const hasCheckedPaymentRef = useRef(false);
  
  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const roles = Array.isArray(userData.roles) ? userData.roles : (userData.roles ? [userData.roles] : ['guest']);
            setIsAdmin(roles.includes('admin'));
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      }
    };
    checkAdminStatus();
  }, []);
  
  // Check if user's PayPal account is the merchant account
  const checkMerchantAccount = async (userPayPalEmail) => {
    try {
      const adminEmail = await getAdminPayPalEmail();
      setMerchantPayPalEmail(adminEmail);
      
      if (adminEmail && userPayPalEmail && userPayPalEmail.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
        // Only set as merchant account if NOT admin (admin can use merchant account)
        setIsMerchantAccount(!isAdmin);
      } else {
        setIsMerchantAccount(false);
      }
      
      // If admin and no PayPal connected, auto-use merchant account
      if (isAdmin && !userPayPalEmail && adminEmail) {
        setPaypalEmail(adminEmail);
        setPaypalAccountConnected(true);
      }
    } catch (error) {
      console.error('Error checking merchant account:', error);
    }
  };
  
  // Load merchant email and check on mount and when PayPal email or admin status changes
  useEffect(() => {
    if (paypalEmail) {
      checkMerchantAccount(paypalEmail);
    } else {
      // Load merchant email even if user doesn't have PayPal connected
      checkMerchantAccount('');
    }
  }, [paypalEmail, isAdmin]);
  
  // Check if payment is required (check user subscription, listing subscription, or edit mode)
  useEffect(() => {
    const checkPaymentRequirement = async () => {
      // Prevent multiple simultaneous checks
      if (isCheckingPaymentRef.current) {
        console.log('📍 Payment: Payment check already in progress, skipping');
        return;
      }
      
      // Prevent re-running if we've already checked and the dependencies haven't meaningfully changed
      if (hasCheckedPaymentRef.current && !isEditMode && !listingId && !draftId) {
        console.log('📍 Payment: Already checked payment requirement, skipping');
        return;
      }
      
      isCheckingPaymentRef.current = true;
      hasCheckedPaymentRef.current = true;
      
      try {
        // First, check user document for subscription status (user-level subscription)
        if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          
        if (userSnap.exists()) {
          const userData = userSnap.data();
          
          // Check if user has active payment status (from payment field map)
          const userPayment = userData.payment || {};
          
          // Check PayPal connection status
          if (userPayment.paypalEmail) {
            setPaypalEmail(userPayment.paypalEmail);
            setPaypalAccountConnected(userPayment.paypalStatus === 'connected');
            // Check if this is the merchant account
            checkMerchantAccount(userPayment.paypalEmail);
          }
          
          if (userPayment.status === 'active') {
              console.log('📍 Payment: User has active payment, skipping payment');
              setRequiresPayment(false);
              
              // Publish/Update listing directly without payment
              // CRITICAL: Only publish if not already published to prevent duplicates
              if (isPublishingRef.current) {
                console.warn('📍 Payment: Publishing already in progress, skipping auto-publish');
                return;
              }
              
              setUploadProgress(isEditMode ? 'Updating your listing...' : 'Publishing your listing...');
              isAutoPublishingRef.current = true; // Mark as auto-publishing
              try {
                const listingIdResult = await publishListing();
                console.log('✅ Listing ' + (isEditMode ? 'updated' : 'published') + ' without payment:', listingIdResult);
                isAutoPublishingRef.current = false;
                
                // Award points for first listing (only for new listings, not edits)
                if (!isEditMode && auth.currentUser && listingIdResult) {
                  try {
                    const { awardPointsForFirstListing, awardMilestonePoints } = await import('@/pages/Host/services/pointsService');
                    await awardPointsForFirstListing(auth.currentUser.uid, listingIdResult);
                    
                    // Check for listing milestones
                    const { collection, query, where, getDocs } = await import('firebase/firestore');
                    const listingsRef = collection(db, 'listings');
                    const userListingsQuery = query(
                      listingsRef,
                      where('ownerId', '==', auth.currentUser.uid),
                      where('status', '==', 'active')
                    );
                    const listingsSnapshot = await getDocs(userListingsQuery);
                    const listingCount = listingsSnapshot.size;
                    
                    if ([3, 5, 10].includes(listingCount)) {
                      await awardMilestonePoints(auth.currentUser.uid, 'listings', listingCount);
                    }
                  } catch (pointsError) {
                    console.error('Error awarding points for listing:', pointsError);
                    // Don't block navigation if points fail
                  }
                }
                
                setUploadProgress('Finalizing...');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Navigate to listings tab
                updateSessionStorageBeforeNav('payment');
                navigate('/host/listings', {
                  state: {
                    message: isEditMode 
                      ? 'Listing updated successfully!'
                      : 'Listing published successfully!',
                    listingPublished: !isEditMode,
                    listingUpdated: isEditMode,
                    listingId: listingIdResult
                  }
                });
                return;
              } catch (error) {
                console.error('❌ Error publishing listing:', error);
                setUploadProgress('');
                isAutoPublishingRef.current = false;
                isPublishingRef.current = false; // Reset ref on error
                alert(`Error publishing listing: ${error.message}`);
                setRequiresPayment(true); // Re-enable payment UI if publish fails
              }
            }
          }
        } catch (error) {
          console.error('📍 Payment: Error checking user subscription:', error);
          // Continue to check listing-level subscription
        }
      }
      
      // Check listing-level subscription (for edit mode)
      if (isEditMode && listingId) {
        try {
          const listingRef = doc(db, 'listings', listingId);
          const listingSnap = await getDoc(listingRef);
          if (listingSnap.exists()) {
            // Check user's payment status instead of listing subscription
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              const userPayment = userData.payment || {};
              // If user has active payment, skip payment
              if (userPayment.status === 'active') {
                console.log('📍 Payment: User has active payment, skipping payment');
              setRequiresPayment(false);
              
              // Publish/Update listing directly without payment
              // CRITICAL: Only publish if not already published to prevent duplicates
              if (isPublishingRef.current) {
                console.warn('📍 Payment: Publishing already in progress, skipping auto-publish');
                return;
              }
              
              setUploadProgress('Updating your listing...');
              isAutoPublishingRef.current = true; // Mark as auto-publishing
              try {
                const listingIdResult = await publishListing();
                console.log('✅ Listing updated without payment:', listingIdResult);
                isAutoPublishingRef.current = false;
                
                setUploadProgress('Finalizing...');
                
                // Small delay to show "Finalizing" message
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Navigate to listings tab
                updateSessionStorageBeforeNav('payment');
                navigate('/host/listings', {
                  state: {
                    message: 'Listing updated successfully!',
                    listingUpdated: true,
                    listingId: listingIdResult
                  }
                });
                return;
              } catch (error) {
                console.error('❌ Error updating listing:', error);
                setUploadProgress('');
                isAutoPublishingRef.current = false;
                isPublishingRef.current = false; // Reset ref on error
                alert(`Error updating listing: ${error.message}`);
                setRequiresPayment(true); // Re-enable payment UI if update fails
              }
              return;
            }
          }
          }
        } catch (error) {
          console.error('📍 Payment: Error checking user payment:', error);
          // Default to requiring payment if check fails
        }
      }
      
      // Also check draft for publishedListingId
      if (!isEditMode && draftId) {
        try {
          const draftRef = doc(db, 'onboardingDrafts', draftId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const draftData = draftSnap.data();
            if (draftData.publishedListingId) {
              const listingIdFromDraft = draftData.publishedListingId;
              setListingId(listingIdFromDraft);
              setIsEditMode(true);
              
              // Check user's payment status instead of listing subscription
              const userRef = doc(db, 'users', auth.currentUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const userData = userSnap.data();
                const userPayment = userData.payment || {};
                if (userPayment.status === 'active') {
                  console.log('📍 Payment: User has active payment, skipping payment');
                  setRequiresPayment(false);
                  // CRITICAL: Only publish if not already published to prevent duplicates
                  if (isPublishingRef.current) {
                    console.warn('📍 Payment: Publishing already in progress, skipping auto-publish');
                    return;
                  }
                  
                  setUploadProgress('Updating your listing...');
                  isAutoPublishingRef.current = true; // Mark as auto-publishing
                  try {
                    const listingIdResult = await publishListing();
                    isAutoPublishingRef.current = false;
                    updateSessionStorageBeforeNav('payment');
                    
                    // Small delay to show "Finalizing" message
                    setUploadProgress('Finalizing...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    navigate('/host/listings', {
                      state: {
                        message: 'Listing updated successfully!',
                        listingUpdated: true,
                        listingId: listingIdResult
                      }
                    });
                    return;
                  } catch (error) {
                    console.error('❌ Error updating listing:', error);
                    setUploadProgress('');
                    isAutoPublishingRef.current = false;
                    isPublishingRef.current = false; // Reset ref on error
                    alert(`Error updating listing: ${error.message}`);
                    setRequiresPayment(true); // Re-enable payment UI if update fails
                  }
                  return;
                }
              }
            }
          }
        } catch (error) {
          console.error('📍 Payment: Error checking draft:', error);
        }
      }
      
        // If we reach here, payment is required
        setRequiresPayment(true);
      } finally {
        isCheckingPaymentRef.current = false;
      }
    };
    
    checkPaymentRequirement();
  }, [isEditMode, listingId, draftId, navigate]);

  // Helper function to ensure we have a valid draftId and save currentStep to Firebase
  const ensureDraftAndSave = async (targetStep = 'payment') => {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }
    
    let draftIdToUse = state?.draftId || location.state?.draftId;
    
    // If draftId is temp, reset it to find/create a real one
    if (draftIdToUse && draftIdToUse.startsWith('temp_')) {
      console.log('📍 Payment: Found temp ID, resetting to find/create real draft');
      draftIdToUse = null;
    }
    
    // If user is authenticated, ensure we have a draft
    if (!draftIdToUse && state.user?.uid) {
      try {
        const { getUserDrafts, saveDraft } = await import('@/pages/Host/services/draftService');
        const drafts = await getUserDrafts();
        
        if (drafts.length > 0) {
          // Use the most recent draft
          draftIdToUse = drafts[0].id;
          console.log('📍 Payment: Using existing draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        } else {
          // No drafts exist, create a new one
          console.log('📍 Payment: No existing drafts, creating new draft');
          const newDraftData = {
            currentStep: targetStep,
            category: state.category || 'accommodation',
            data: {}
          };
          draftIdToUse = await saveDraft(newDraftData, null);
          console.log('📍 Payment: ✅ Created new draft:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
      } catch (error) {
        console.error('📍 Payment: Error finding/creating draft:', error);
        throw error;
      }
    }
    
    // Save to Firebase if we have a valid draftId
    if (draftIdToUse && !draftIdToUse.startsWith('temp_')) {
      try {
        const draftRef = doc(db, 'onboardingDrafts', draftIdToUse);
        const docSnap = await getDoc(draftRef);
        
        if (docSnap.exists()) {
          // Update existing document - save currentStep
          await updateDoc(draftRef, {
            currentStep: targetStep,
            lastModified: new Date()
          });
          console.log('📍 Payment: ✅ Saved currentStep to Firebase (currentStep:', targetStep, ')');
        } else {
          // Document doesn't exist, create it
          console.log('📍 Payment: Document not found, creating new one');
          const { saveDraft } = await import('@/pages/Host/services/draftService');
          
          const newDraftData = {
            currentStep: targetStep,
            category: state.category || 'accommodation',
            data: {}
          };
          draftIdToUse = await saveDraft(newDraftData, draftIdToUse);
          console.log('📍 Payment: ✅ Created new draft with currentStep:', draftIdToUse);
          if (actions.setDraftId) {
            actions.setDraftId(draftIdToUse);
          }
        }
        return draftIdToUse;
      } catch (error) {
        console.error('📍 Payment: ❌ Error saving to Firebase:', error);
        throw error;
      }
    } else if (state.user?.uid) {
      console.warn('📍 Payment: ⚠️ User authenticated but no valid draftId after ensureDraftAndSave');
      throw new Error('Failed to create draft for authenticated user');
    } else {
      console.warn('📍 Payment: ⚠️ User not authenticated, cannot save to Firebase');
      return null;
    }
  };

  // Save & Exit handler
  const handleSaveAndExitClick = async () => {
    if (!auth.currentUser) {
      alert('Please log in to save your progress');
      return;
    }
    
    try {
      console.log('📍 Payment: Save & Exit clicked');
      
      // Set current step before saving so "Continue Editing" returns to this page
      if (actions.setCurrentStep) {
        console.log('📍 Payment: Setting currentStep to payment');
        actions.setCurrentStep('payment');
      }
      
      // Save currentStep to Firebase
      let draftIdToUse;
      try {
        draftIdToUse = await ensureDraftAndSave('payment');
        console.log('📍 Payment: ✅ Saved currentStep to Firebase on Save & Exit');
      } catch (saveError) {
        console.error('📍 Payment: Error saving to Firebase on Save & Exit:', saveError);
        alert('Error saving progress: ' + saveError.message);
        return;
      }
      
      // Update sessionStorage before Save & Exit navigation
      updateSessionStorageBeforeNav('payment');
      
      // Navigate to listings tab
      navigate('/host/listings', { 
        state: { 
          message: 'Draft saved successfully!',
          draftSaved: true 
        }
      });
    } catch (error) {
      console.error('Error in Payment save:', error);
      alert('Failed to save progress: ' + error.message);
    }
  };

  // Set current step when component mounts
  useEffect(() => {
    if (actions.setCurrentStep && state.currentStep !== 'payment') {
      console.log('📍 Payment page - Setting currentStep to payment');
      actions.setCurrentStep('payment');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Load draft if not in location state
  useEffect(() => {
    if (!draftId && state?.draftId) {
      setDraftId(state.draftId);
    }
  }, [draftId, state?.draftId]);

  // Load PayPal account status from user document
  useEffect(() => {
    const loadPayPalStatus = async () => {
      if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            // Read from payment map (new structure) or fallback to top-level (old structure for migration)
            const userPayment = userData.payment || {};
            const paypalEmailToUse = userPayment.paypalEmail || userData.paypalEmail;
            
            if (paypalEmailToUse) {
              setPaypalAccountConnected(userPayment.paypalStatus === 'connected' || userData.paypalStatus === 'connected');
              setPaypalEmail(paypalEmailToUse);
              setPaypalAccountId(userPayment.paypalAccountId || '');
              setPaypalAccountName(userPayment.paypalAccountName || '');
            }
          }
        } catch (error) {
          console.error('Error loading PayPal status:', error);
        }
      }
    };
    
    loadPayPalStatus();
  }, []);

  // Check if user can proceed (both checkboxes must be checked AND PayPal connected)
  const canProceed = acceptedPolicy && acceptedCompliance;

  // Helper function to convert base64 to File
  const base64ToFile = (base64String, fileName, mimeType = 'image/jpeg') => {
    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], fileName, { type: mimeType });
  };

  // Compress and prepare photos for Firestore storage
  const compressPhotosForStorage = async (photos) => {
    if (!photos || photos.length === 0) {
      console.log('📷 No photos to compress');
      setUploadProgress('No photos to process');
      return [];
    }

    console.log(`📤 Starting compression of ${photos.length} photos for Firestore...`);
    setUploadProgress(`Compressing ${photos.length} photos...`);
    const compressedPhotos = [];
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      try {
        // Update progress
        setUploadProgress(`Compressing photo ${i + 1} of ${photos.length}...`);
        
        // If photo already has a compressed base64 string, check if it's small enough
        // Recompress if it's still too large (need to be under 70KB to be safe)
        if (photo.base64 && photo.base64.length < 70000) { // Already small (<70KB)
          console.log(`⏭️ Photo ${i + 1} already compressed, using existing base64`);
          compressedPhotos.push({
            id: photo.id || `photo_${i}`,
            name: photo.name || `photo_${i + 1}`,
            url: photo.base64, // Use base64 as URL for display
            base64: photo.base64, // Store for Firestore
          });
          continue;
        }
        
        // Limit to 8 photos max to stay well under 1MB document limit (8 * 50KB = 400KB max)
        if (compressedPhotos.length >= 8) {
          console.warn(`⚠️ Photo limit reached (8 photos max). Skipping remaining ${photos.length - i} photos.`);
          break;
        }

        // Determine mime type from base64 or default to jpeg
        let mimeType = 'image/jpeg';
        if (photo.base64 && photo.base64.includes('data:image/')) {
          const mimeMatch = photo.base64.match(/data:image\/([^;]+)/);
          if (mimeMatch) {
            const ext = mimeMatch[1].split('+')[0];
            mimeType = `image/${ext}`;
          }
        }
        
        const base64String = photo.base64 || photo.url;
        if (!base64String) {
          console.warn(`⚠️ Photo ${i + 1} has no base64 or url, skipping`);
          continue;
        }
        
        // Convert base64 to File for compression
        const fileName = photo.name || `photo_${i + 1}.jpg`;
        const file = base64ToFile(base64String, fileName, mimeType);
        
        // Compress image very aggressively to reduce size (max 50KB per image)
        // With 8 photos max, total would be ~400KB, well under 1MB Firestore limit
        console.log(`📦 Compressing photo ${i + 1}/${photos.length}...`);
        const compressionOptions = {
          maxSizeMB: 0.05, // 50KB max per image (very aggressive compression)
          maxWidthOrHeight: 800, // Reduced max dimensions for smaller file size
          useWebWorker: true,
          fileType: mimeType,
          initialQuality: 0.6 // Lower quality for smaller size
        };
        
        const compressedFile = await imageCompression(file, compressionOptions);
        
        // Convert compressed file back to base64
        const reader = new FileReader();
        const compressedBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(compressedFile);
        });
        
        // Check size after compression
        const sizeInBytes = (compressedBase64.length * 3) / 4; // Approximate base64 size
        const sizeInKB = sizeInBytes / 1024;
        console.log(`✅ Photo ${i + 1} compressed to ${sizeInKB.toFixed(2)}KB`);
        
        compressedPhotos.push({
          id: photo.id || `photo_${i}`,
          name: fileName,
          url: compressedBase64, // Use compressed base64 for display
          base64: compressedBase64, // Store compressed base64 in Firestore
        });
        
        console.log(`✅ Compressed photo ${i + 1}/${photos.length}`);
      } catch (error) {
        console.error(`❌ Error compressing photo ${i + 1}:`, error);
        // If compression fails, use original but log warning
        if (photo.base64) {
          compressedPhotos.push({
            id: photo.id || `photo_${i}`,
            name: photo.name || `photo_${i + 1}`,
            url: photo.base64,
            base64: photo.base64,
          });
          console.warn(`⚠️ Using original photo ${i + 1} (compression failed)`);
        }
      }
    }
    
    setUploadProgress(`Compressed ${compressedPhotos.length} of ${photos.length} photos successfully`);
    console.log(`✅ Photo compression complete: ${compressedPhotos.length}/${photos.length} processed`);
    return compressedPhotos;
  };

  const loadServicePhotosFromSubcollection = async (draftIdToUse) => {
    if (!draftIdToUse) return [];
    try {
      const photosRef = collection(db, 'onboardingDrafts', draftIdToUse, 'servicePhotos');
      const photosSnap = await getDocs(photosRef);
      if (photosSnap.empty) {
        return [];
      }
      const loadedPhotos = photosSnap.docs.map((docSnap) => {
        const photoData = docSnap.data() || {};
        return {
          id: docSnap.id,
          name: photoData.name || 'photo',
          url: photoData.base64 || photoData.url || '',
          base64: photoData.base64 || '',
          firestoreId: docSnap.id,
        };
      }).filter(photo => !!photo.base64);
      console.log('📍 Payment: Loaded service photos from subcollection:', loadedPhotos.length);
      return loadedPhotos;
    } catch (error) {
      console.error('Error loading service photos from subcollection:', error);
      return [];
    }
  };

  const loadAccommodationPhotosFromSubcollection = async (draftIdToUse) => {
    if (!draftIdToUse) return [];
    try {
      const photosRef = collection(db, 'onboardingDrafts', draftIdToUse, 'photos');
      const photosQuery = query(photosRef, orderBy('createdAt', 'asc'));
      const photosSnap = await getDocs(photosQuery);
      if (photosSnap.empty) {
        return [];
      }
      const loadedPhotos = photosSnap.docs.map((docSnap) => {
        const photoData = docSnap.data() || {};
        return {
          id: docSnap.id,
          name: photoData.name || 'photo',
          url: photoData.base64 || photoData.url || '',
          base64: photoData.base64 || '',
          firestoreId: docSnap.id,
        };
      }).filter(photo => !!photo.base64);
      console.log('📍 Payment: Loaded accommodation photos from subcollection:', loadedPhotos.length);
      return loadedPhotos;
    } catch (error) {
      console.error('Error loading accommodation photos from subcollection:', error);
      return [];
    }
  };

  // Convert draft to listing and publish it
  const publishListing = async () => {
    if (!draftId || !auth.currentUser) {
      throw new Error('Missing draft ID or user not authenticated');
    }

    // CRITICAL: Check draft FIRST for existing publishedListingId before checking isPublishingRef
    // This prevents duplicates even if multiple calls happen simultaneously
    const draftRef = doc(db, 'onboardingDrafts', draftId);
    const initialDraftSnap = await getDoc(draftRef);
    if (initialDraftSnap.exists()) {
      const initialDraftData = initialDraftSnap.data();
      if (initialDraftData.publishedListingId) {
        // Verify listing exists
        const existingListingRef = doc(db, 'listings', initialDraftData.publishedListingId);
        const existingListingSnap = await getDoc(existingListingRef);
        if (existingListingSnap.exists()) {
          console.log('📍 Payment: Draft already has published listing, returning existing ID to prevent duplicate:', initialDraftData.publishedListingId);
          return initialDraftData.publishedListingId;
        } else {
          console.warn('⚠️ Draft references non-existent listing, clearing publishedListingId');
          // Clear invalid publishedListingId
          await updateDoc(draftRef, {
            publishedListingId: null,
            published: false
          });
        }
      }
    }
    
    // Prevent duplicate publishing (if already in progress and not auto-publishing)
    // But allow if this is auto-publishing from checkPaymentRequirement and it's a retry
    if (isPublishingRef.current && !isAutoPublishingRef.current) {
      console.warn('⚠️ publishListing already in progress, preventing duplicate');
      // Double-check draft one more time in case it was updated
      const recheckDraftSnap = await getDoc(draftRef);
      if (recheckDraftSnap.exists()) {
        const recheckDraftData = recheckDraftSnap.data();
        if (recheckDraftData.publishedListingId) {
          console.log('📍 Payment: Found publishedListingId on recheck, returning to prevent duplicate:', recheckDraftData.publishedListingId);
          return recheckDraftData.publishedListingId;
        }
      }
      throw new Error('Publishing already in progress');
    }
    
    // If auto-publishing failed before, reset and allow retry
    if (isPublishingRef.current && isAutoPublishingRef.current) {
      console.log('📍 Payment: Resetting publishing ref for auto-publishing retry');
      isPublishingRef.current = false;
    }

    isPublishingRef.current = true;

    try {
      // Get the draft data (draftRef already fetched above for duplicate check)
      const draftSnap = await getDoc(draftRef);

      if (!draftSnap.exists()) {
        throw new Error('Draft not found');
      }

      const draftData = draftSnap.data();
      
      // CRITICAL: Check if draft already has a published listing (prevent duplicates)
      // Use this variable throughout to ensure we always use the correct listingId
      let targetListingId = null;
      
      if (draftData.publishedListingId) {
        console.log('📍 Payment: Draft already has published listing, updating instead of creating new:', draftData.publishedListingId);
        targetListingId = draftData.publishedListingId;
        
        // Verify listing exists
        const existingListingRef = doc(db, 'listings', targetListingId);
        const existingListingSnap = await getDoc(existingListingRef);
        if (existingListingSnap.exists()) {
          console.log('✅ Found existing listing, will update instead of creating duplicate');
        } else {
          console.warn('⚠️ Draft references listingId that does not exist, clearing publishedListingId and will create new listing');
          // Clear invalid publishedListingId from draft
          targetListingId = null;
        }
      }
      
      // Also check if isEditMode and listingId are set (from navigation state)
      if (!targetListingId && isEditMode && listingId) {
        targetListingId = listingId;
        console.log('📍 Payment: Using listingId from edit mode:', targetListingId);
      }
      
      const data = draftData.data || {};
      const category = draftData.category || 'accommodation';

      // Prepare listing data from draft - handle both accommodation and service categories
      const locationData = category === 'service' 
        ? (data.serviceLocation || data.locationData || {})
        : (data.locationData || {});
      let photos = category === 'service'
        ? (data.servicePhotos || data.photos || [])
        : (data.photos || []);
      const pricing = category === 'service'
        ? (data.servicePricing || data.pricing || {})
        : (data.pricing || {});

      // ALWAYS prioritize photos from subcollection (they're the source of truth)
      // This ensures edited photos are always used when updating listings
      if (category === 'service') {
        const subcollectionPhotos = await loadServicePhotosFromSubcollection(draftId);
        if (subcollectionPhotos.length > 0) {
          photos = subcollectionPhotos;
          console.log('📍 Payment: Using photos from servicePhotos subcollection:', photos.length);
        } else {
          // Fallback to main document if subcollection is empty
          const hasValidBase64 = Array.isArray(photos) && photos.some(photo => photo?.base64);
          if (!hasValidBase64) {
            console.warn('⚠️ Payment: No photos found in subcollection or main document for service');
          }
        }
      } else {
        // For accommodation, load from 'photos' subcollection
        const subcollectionPhotos = await loadAccommodationPhotosFromSubcollection(draftId);
        if (subcollectionPhotos.length > 0) {
          photos = subcollectionPhotos;
          console.log('📍 Payment: Using photos from photos subcollection:', photos.length);
        } else {
          // Fallback to main document if subcollection is empty
          const hasValidBase64 = Array.isArray(photos) && photos.some(photo => photo?.base64);
          if (!hasValidBase64) {
            console.warn('⚠️ Payment: No photos found in subcollection or main document for accommodation');
          }
        }
      }
      
      // Debug: Log photos data to help diagnose missing images issue
      console.log('📍 Payment: Photos from draft:', photos);
      console.log('📍 Payment: Number of photos:', photos.length);
      console.log('📍 Payment: First photo keys:', photos[0] ? Object.keys(photos[0]) : 'no photos');
      
      // Prepare listing data first (without photos - we'll add them after upload)
      const listingDataWithoutPhotos = {
        category: category,
        title: category === 'service'
          ? (data.serviceTitle || data.title || 'Untitled Service')
          : (data.title || 'Untitled Listing'),
        description: category === 'service'
          ? (data.serviceDescription || data.description || '')
          : (data.description || ''),
        descriptionHighlights: data.descriptionHighlights || [],
        location: locationData, // Full location data object
        photos: [], // Will be updated after upload
        pricing: pricing,
        // Status - always active for published listings (subscription checked from user payment)
        status: 'active', // Published and active - will appear on listings page
        publishedAt: serverTimestamp(),
        // Fields for listings page display
        price: pricing.weekdayPrice || pricing.basePrice || pricing.price || 0,
        rating: 0,
        reviews: 0
      };

      // Add category-specific fields
      if (category === 'service') {
        // Service-specific fields - collect all service data from draft
        listingDataWithoutPhotos.serviceCategory = data.serviceCategory;
        listingDataWithoutPhotos.serviceYearsOfExperience = data.serviceYearsOfExperience;
        listingDataWithoutPhotos.serviceExperience = data.serviceExperience;
        listingDataWithoutPhotos.serviceDegree = data.serviceDegree;
        listingDataWithoutPhotos.serviceCareerHighlight = data.serviceCareerHighlight;
        listingDataWithoutPhotos.serviceProfilePicture = data.serviceProfilePicture;
        listingDataWithoutPhotos.serviceProfiles = data.serviceProfiles || [];
        listingDataWithoutPhotos.serviceAddress = data.serviceAddress;
        listingDataWithoutPhotos.serviceWhereProvide = data.serviceWhereProvide;
        listingDataWithoutPhotos.serviceOfferings = data.serviceOfferings || [];
        listingDataWithoutPhotos.serviceNationalPark = data.serviceNationalPark;
        listingDataWithoutPhotos.serviceTransportingGuests = data.serviceTransportingGuests;
        listingDataWithoutPhotos.serviceAgreedToTerms = data.serviceAgreedToTerms;
      } else {
        // Accommodation-specific fields
        listingDataWithoutPhotos.propertyBasics = data.propertyBasics || {};
        listingDataWithoutPhotos.amenities = data.amenities || {};
        listingDataWithoutPhotos.privacyType = data.privacyType || draftData.privacyType || '';
        listingDataWithoutPhotos.propertyStructure = data.propertyStructure || draftData.propertyStructure || '';
        listingDataWithoutPhotos.bookingSettings = data.bookingSettings || {};
        listingDataWithoutPhotos.guestSelection = data.guestSelection || {};
        listingDataWithoutPhotos.discounts = data.discounts || {};
        listingDataWithoutPhotos.safetyDetails = data.safetyDetails || {};
        listingDataWithoutPhotos.finalDetails = data.finalDetails || {};
        listingDataWithoutPhotos.image = null; // Will be updated after upload
        listingDataWithoutPhotos.images = []; // Will be updated after upload
      }

      // Convert blob URLs to base64 for Firestore storage (no Firebase Storage available)
      console.log('📦 Processing photos for Firestore storage...');
      console.log('📦 Photos to process:', photos.length);
      
      // Helper to convert blob URL to base64
      const blobUrlToBase64 = async (blobUrl) => {
        try {
          const response = await fetch(blobUrl);
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Error converting blob URL to base64:', error);
          throw error;
        }
      };
      
      // Helper to convert File to base64
      const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
      };
      
      // Process each photo - convert blob URLs to base64
      const photosWithBase64 = await Promise.all(
        photos.map(async (photo, index) => {
          try {
            // If photo already has valid base64 (data URL), use it
            if (photo.base64 && photo.base64.startsWith('data:image/')) {
              return {
                id: photo.id,
                name: photo.name,
                url: photo.base64, // Use base64 as URL for display
                base64: photo.base64
              };
            }
            
            // If photo has a file object, convert to base64
            if (photo.file) {
              const base64 = await fileToBase64(photo.file);
              return {
                id: photo.id,
                name: photo.name,
                url: base64, // Use base64 as URL for display
                base64: base64
              };
            }
            
            // If photo has a blob URL, convert it to base64
            if (photo.url && photo.url.startsWith('blob:')) {
              const base64 = await blobUrlToBase64(photo.url);
              return {
                id: photo.id,
                name: photo.name,
                url: base64, // Use base64 as URL for display
                base64: base64
              };
            }
            
            // If base64 field contains blob URL string, try to convert it
            if (photo.base64 && photo.base64.startsWith('blob:')) {
              const base64 = await blobUrlToBase64(photo.base64);
              return {
                id: photo.id,
                name: photo.name,
                url: base64,
                base64: base64
              };
            }
            
            // If photo has a regular URL (not blob), keep it but try to get base64 if possible
            if (photo.url && !photo.url.startsWith('blob:') && !photo.url.startsWith('data:')) {
              // Regular URL - keep as-is but ensure base64 is set
              return {
                id: photo.id,
                name: photo.name,
                url: photo.url,
                base64: photo.base64 || photo.url // Use URL as fallback if no base64
              };
            }
            
            // Return photo as-is if no conversion needed
            return photo;
          } catch (error) {
            console.error(`❌ Error processing photo ${index + 1}:`, error);
            // Return photo as-is if conversion fails
            return photo;
          }
        })
      );
      
      console.log(`✅ Processed ${photosWithBase64.length} photos`);
      
      // Compress photos to reduce Firestore document size
      const compressedPhotos = await compressPhotosForStorage(photosWithBase64.slice(0, 8));
      console.log(`✅ Compressed ${compressedPhotos.length} photos`);
      
      // Store photos in listing document with base64 (Firestore storage)
      listingDataWithoutPhotos.photos = compressedPhotos;
      
      // Debug: Log photos being saved
      console.log('📸 Payment: Photos to save to listing:', compressedPhotos.length);
      console.log('📸 Payment: First photo structure:', compressedPhotos[0] ? {
        id: compressedPhotos[0].id,
        name: compressedPhotos[0].name,
        hasBase64: !!compressedPhotos[0].base64,
        hasUrl: !!compressedPhotos[0].url,
        base64Length: compressedPhotos[0].base64 ? compressedPhotos[0].base64.length : 0,
        allKeys: Object.keys(compressedPhotos[0])
      } : 'no photos');
      
      // Remove image and images fields - frontend should use photos[0].base64
      // This saves significant space by not duplicating photo data
      
      // CRITICAL: Always check for existing listingId before creating new one (prevent duplicates)
      let finalListingId;
      
      if (targetListingId) {
        // Update existing listing (prevent duplicate)
        console.log('📝 Updating existing listing (preventing duplicate):', targetListingId);
        
        // Get existing listing to preserve rating and reviews
        const existingListingRef = doc(db, 'listings', targetListingId);
        const existingListingSnap = await getDoc(existingListingRef);
        if (existingListingSnap.exists()) {
          const existingData = existingListingSnap.data();
          listingDataWithoutPhotos.rating = existingData.rating || 0;
          listingDataWithoutPhotos.reviews = existingData.reviews || 0;
          // Subscription info is no longer stored in listings - it's in user.payment
        }
        
        finalListingId = await createListing(listingDataWithoutPhotos, targetListingId);
        console.log('✅ Listing updated with ID (prevented duplicate):', finalListingId);
      } else {
        // CRITICAL: Before creating new listing, check draft one more time for publishedListingId
        // This prevents race conditions where draft was updated between reads
        const draftRecheckSnap = await getDoc(draftRef);
        if (draftRecheckSnap.exists()) {
          const draftRecheckData = draftRecheckSnap.data();
          if (draftRecheckData.publishedListingId) {
            console.log('📍 Payment: Found publishedListingId on recheck, updating instead of creating:', draftRecheckData.publishedListingId);
            targetListingId = draftRecheckData.publishedListingId;
            
            // Verify listing exists
            const existingListingRef = doc(db, 'listings', targetListingId);
            const existingListingSnap = await getDoc(existingListingRef);
            if (existingListingSnap.exists()) {
              const existingData = existingListingSnap.data();
              listingDataWithoutPhotos.rating = existingData.rating || 0;
              listingDataWithoutPhotos.reviews = existingData.reviews || 0;
              finalListingId = await createListing(listingDataWithoutPhotos, targetListingId);
              console.log('✅ Listing updated with ID (prevented duplicate on recheck):', finalListingId);
            } else {
              console.warn('⚠️ PublishedListingId references non-existent listing, will create new');
              // Clear invalid publishedListingId and continue to create new
              await updateDoc(draftRef, {
                publishedListingId: null,
                published: false
              });
              finalListingId = await createListing(listingDataWithoutPhotos);
              console.log('✅ Listing created with ID:', finalListingId);
            }
          } else {
            // CRITICAL: Final atomic check before creating - re-read draft one last time
            const finalCheckSnap = await getDoc(draftRef);
            if (finalCheckSnap.exists()) {
              const finalCheckData = finalCheckSnap.data();
              if (finalCheckData.publishedListingId) {
                console.log('📍 Payment: FINAL CHECK - Found publishedListingId, updating instead of creating:', finalCheckData.publishedListingId);
                targetListingId = finalCheckData.publishedListingId;
                const existingListingRef = doc(db, 'listings', targetListingId);
                const existingListingSnap = await getDoc(existingListingRef);
                if (existingListingSnap.exists()) {
                  const existingData = existingListingSnap.data();
                  listingDataWithoutPhotos.rating = existingData.rating || 0;
                  listingDataWithoutPhotos.reviews = existingData.reviews || 0;
                  finalListingId = await createListing(listingDataWithoutPhotos, targetListingId);
                  console.log('✅ Listing updated with ID (prevented duplicate on final check):', finalListingId);
                  // Skip the draft update since we're updating existing
                  // Release lock before returning
                  isPublishingRef.current = false;
                  return finalListingId;
                }
              }
            }
            
            // Create new listing ONLY if no existing listingId found after final check
            console.log('📝 Creating new listing (no existing listingId found after final check)');
            finalListingId = await createListing(listingDataWithoutPhotos);
            console.log('✅ Listing created with ID:', finalListingId);
          }
        } else {
          // Draft doesn't exist, create new listing
          console.log('📝 Creating new listing (draft not found)');
          finalListingId = await createListing(listingDataWithoutPhotos);
          console.log('✅ Listing created with ID:', finalListingId);
        }
        
        // CRITICAL: Update draft with publishedListingId IMMEDIATELY after creating listing
        // Use batch write to ensure atomicity and prevent race conditions
        // This MUST happen before releasing isPublishingRef to prevent race conditions
        if (finalListingId && !targetListingId) {
          try {
            // Use batch write to ensure both operations succeed or fail together
            const batch = writeBatch(db);
            batch.update(draftRef, {
              publishedListingId: finalListingId,
              published: true
            });
            await batch.commit();
            console.log('✅ Updated draft with publishedListingId atomically to prevent duplicates');
          } catch (updateError) {
            console.error('❌ CRITICAL: Could not update draft with publishedListingId:', updateError);
            // This is critical - if we can't update the draft, we might create duplicates
            // Try one more time with regular updateDoc
            try {
              await updateDoc(draftRef, {
                publishedListingId: finalListingId,
                published: true
              });
              console.log('✅ Updated draft with publishedListingId (fallback)');
            } catch (fallbackError) {
              console.error('❌ Failed to update draft even with fallback:', fallbackError);
              // If we can't update the draft, delete the listing we just created to prevent orphan
              // But only if it's a new listing (not an update)
              try {
                const listingRef = doc(db, 'listings', finalListingId);
                await updateDoc(listingRef, { status: 'inactive' }); // Mark as inactive instead of deleting
                console.error('⚠️ Marked listing as inactive due to draft update failure');
                throw new Error('Failed to update draft with publishedListingId. Listing marked as inactive.');
              } catch (cleanupError) {
                console.error('❌ CRITICAL: Failed to cleanup listing after draft update failure:', cleanupError);
                // At this point, we have a listing but no draft reference - this is bad but we'll return it
              }
            }
          }
        }
      }

      // NOTE: We do NOT delete the draft anymore - we keep it with publishedListingId
      // This allows editing listings and prevents duplicates
      // The draft is marked as published, so it won't show in drafts list
      console.log('✅ Listing published successfully. ListingId:', finalListingId);
      
      // CRITICAL: Only release the publishing lock AFTER draft is updated
      // This ensures no other publishListing call can happen before draft is marked
      isPublishingRef.current = false;
      return finalListingId;
    } catch (error) {
      console.error('Error publishing listing:', error);
      isPublishingRef.current = false; // Reset flag on error
      throw error;
    }
  };


  // Save PayPal connection to Firebase (simplified)
  const savePayPalConnection = async ({ email, accountId, accountName }) => {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    // Get existing payment data to preserve it
    const existingData = userSnap.exists() ? userSnap.data() : {};
    const existingPayment = existingData.payment || {};
    
    // Update payment map with PayPal connection info (preserve existing payment data)
    const updateData = {
      payment: {
        ...existingPayment, // Preserve existing payment data
        paypalEmail: email,
        paypalAccountId: accountId || `PP_${Date.now()}`,
        paypalAccountName: accountName || email.split('@')[0],
        paypalConnectedAt: serverTimestamp(),
        paypalStatus: 'connected',
        method: 'paypal' // Set method when PayPal is connected
      }
    };
    
    if (userSnap.exists()) {
      await updateDoc(userRef, updateData);
    } else {
      // Create user document if it doesn't exist
      const { setDoc } = await import('firebase/firestore');
      await setDoc(userRef, {
        ...updateData,
        createdAt: serverTimestamp()
      });
    }
    
    setPaypalAccountConnected(true);
    setPaypalEmail(email);
    setPaypalAccountId(accountId || `PP_${Date.now()}`);
    setPaypalAccountName(accountName || email.split('@')[0]);
    setPaypalEmailInput(''); // Clear input after successful connection
  };

  // Handle PayPal account connection via email
  const handleConnectPayPal = async () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!paypalEmailInput || !emailRegex.test(paypalEmailInput)) {
      alert('Please enter a valid PayPal email address.');
      return;
    }

    setIsConnectingPayPal(true);
    
    try {
      await savePayPalConnection({
        email: paypalEmailInput.trim(),
        accountId: `PP_${Date.now()}`,
        accountName: paypalEmailInput.trim().split('@')[0]
      });
      // Success - the state will update and show the connected status
      console.log('PayPal account connected successfully');
      setIsConnectingPayPal(false);
    } catch (error) {
      console.error('Error connecting PayPal:', error);
      alert('Failed to connect PayPal account: ' + error.message);
      setIsConnectingPayPal(false);
    }
  };

  // Handle PayPal direct payment for subscription
  const handlePayPalPayment = async (paypalDetails) => {
    if (!auth.currentUser) {
      alert('You must be logged in to make a payment');
      return;
    }

    const planPrice = selectedPlan === 'yearly' ? 9999 : 999;
    setIsProcessing(true);
    setUploadProgress('Processing PayPal payment...');
    
    try {
      console.log('✅ PayPal payment approved:', paypalDetails);
      
      // Verify payment amount matches
      const paidAmountPHP = parseFloat(paypalDetails.purchase_units[0]?.payments?.captures[0]?.amount?.value || 0);
      const expectedAmountPHP = planPrice; // planPrice is already in PHP
      if (Math.abs(paidAmountPHP - expectedAmountPHP) > 0.01) { // Allow 1 centavo difference for rounding
        setIsProcessing(false);
        setUploadProgress('');
        alert(`Payment amount mismatch. Expected ₱${expectedAmountPHP.toFixed(2)}, received ₱${paidAmountPHP.toFixed(2)}`);
        return;
      }

      // Record subscription payment in admin wallet (for tracking)
      try {
        const { getAdminUserId, addToWallet: addToAdminWallet } = await import('@/pages/Common/services/getpayService');
        const adminUserId = await getAdminUserId();
        
        if (adminUserId) {
          const { initializeWallet: initAdminWallet } = await import('@/pages/Common/services/getpayService');
          await initAdminWallet(adminUserId);
          await addToAdminWallet(
            adminUserId,
            planPrice,
            `Payment Received - Host Subscription (PayPal)`,
            {
              subscriptionType: selectedPlan,
              subscriptionPlan: selectedPlan === 'yearly' ? 'Yearly' : 'Monthly',
              hostId: auth.currentUser.uid,
              hostEmail: auth.currentUser.email,
              paymentType: 'subscription_payment',
              paymentMethod: 'paypal',
              paypalOrderId: paypalDetails.id || null,
              paypalTransactionId: paypalDetails.purchase_units?.[0]?.payments?.captures?.[0]?.id || null
            }
          );
          console.log('✅ Subscription payment (PayPal) recorded in admin wallet');
        } else {
          console.warn('⚠️ Admin user ID not found - subscription payment not recorded in admin wallet');
        }
      } catch (adminWalletError) {
        console.error('⚠️ Error recording subscription payment in admin wallet:', adminWalletError);
        // Don't block payment flow if admin wallet recording fails
      }

      // Update user payment status
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const existingPayment = userData.payment || {};
        
        // Extract PayPal order and transaction IDs from the response
        // paypalDetails.id is the order ID
        // paypalDetails.purchase_units[0].payments.captures[0].id is the transaction/capture ID
        const paypalOrderId = paypalDetails.id || null;
        const paypalTransactionId = paypalDetails.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;
        
        // Build payment object, only including defined values
        const paymentUpdate = {
          ...existingPayment,
          type: selectedPlan,
          startDate: serverTimestamp(),
          status: 'active',
          lastPaymentDate: serverTimestamp(),
          method: 'paypal'
        };
        
        // Only add PayPal IDs if they exist
        if (paypalOrderId) {
          paymentUpdate.paypalOrderId = paypalOrderId;
        }
        if (paypalTransactionId) {
          paymentUpdate.paypalTransactionId = paypalTransactionId;
        }
        
        await updateDoc(userRef, {
          payment: paymentUpdate
        });
        console.log('✅ PayPal payment info saved to user document', { paypalOrderId, paypalTransactionId });
      }

      // Publish/Update the listing
      setUploadProgress(isEditMode ? 'Updating your listing...' : 'Creating your listing...');
      console.log('📤 Starting listing publication/update process...');
      isAutoPublishingRef.current = false;
      const listingId = await publishListing();
      console.log('✅ PayPal payment processed and listing ' + (isEditMode ? 'updated' : 'published') + ':', listingId);

      // Award points for first listing (only for new listings, not edits)
      if (!isEditMode && auth.currentUser && listingId) {
        try {
          const { awardPointsForFirstListing, awardMilestonePoints } = await import('@/pages/Host/services/pointsService');
          await awardPointsForFirstListing(auth.currentUser.uid, listingId);
          
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const listingsRef = collection(db, 'listings');
          const userListingsQuery = query(
            listingsRef,
            where('ownerId', '==', auth.currentUser.uid),
            where('status', '==', 'active')
          );
          const listingsSnapshot = await getDocs(userListingsQuery);
          const listingCount = listingsSnapshot.size;
          
          if ([3, 5, 10].includes(listingCount)) {
            await awardMilestonePoints(auth.currentUser.uid, 'listings', listingCount);
          }
        } catch (pointsError) {
          console.error('Error awarding points for listing:', pointsError);
        }
      }

      updateSessionStorageBeforeNav('payment');
      setUploadProgress('Finalizing...');

      navigate('/host/listings', {
        state: {
          message: isEditMode 
            ? 'Payment successful! Your listing has been updated.'
            : 'Payment successful! Your listing has been published.',
          listingPublished: !isEditMode,
          listingUpdated: isEditMode,
          listingId: listingId,
          onboardingCompleted: true,
          paymentMethod: 'paypal'
        }
      });
    } catch (error) {
      console.error('❌ Error processing PayPal payment:', error);
      setIsProcessing(false);
      setUploadProgress('');
      alert(`Error processing payment: ${error.message}\n\nPlease try again or contact support if the issue persists.`);
    }
  };

  // Handle GetPay wallet or points payment for subscription
  const handleGetPayPayment = async () => {
    if (!auth.currentUser) {
      alert('You must be logged in to make a payment');
      return;
    }

    const planPrice = selectedPlan === 'yearly' ? 9999 : 999;
    setIsProcessing(true);
    setUploadProgress('Processing payment...');
    
    try {
      const { getAdminUserId, addToWallet: addToAdminWallet } = await import('@/pages/Common/services/getpayService');
      let paymentProcessed = false;
      let remainingAmount = planPrice;

      // Handle points payment
      if (paymentMethod === 'points') {
        const { deductPointsForPayment } = await import('@/pages/Host/services/pointsService');
        const pointsResult = await deductPointsForPayment(
          auth.currentUser.uid,
          planPrice,
          'subscription',
          {
            subscriptionType: selectedPlan,
            subscriptionPlan: selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'
          }
        );

        if (!pointsResult.success) {
          setIsProcessing(false);
          setUploadProgress('');
          alert(pointsResult.error || 'Failed to process points payment');
          return;
        }

        console.log(`✅ Subscription fee paid with ${pointsResult.pointsUsed} points (₱${pointsResult.currencyAmount.toFixed(2)})`);
        remainingAmount = pointsResult.remainingAmount;
        paymentProcessed = pointsResult.currencyAmount >= planPrice;
      }

      // Handle wallet payment (if points were insufficient or wallet was selected)
      if (paymentMethod === 'wallet' || (!paymentProcessed && remainingAmount > 0)) {
        const { deductFromWallet, initializeWallet, hasSufficientBalance } = await import('@/pages/Common/services/getpayService');
        await initializeWallet(auth.currentUser.uid);
        
        if (paymentMethod === 'wallet') {
          const hasBalance = await hasSufficientBalance(auth.currentUser.uid, planPrice);
          if (!hasBalance) {
            setIsProcessing(false);
            setUploadProgress('');
            alert(`Insufficient GetPay wallet balance. You need ₱${planPrice.toLocaleString()} but your current balance is insufficient. Please cash in to your GetPay wallet first.`);
            return;
          }
        } else {
          // Partial payment: points + wallet
          if (remainingAmount > 0) {
            const hasBalance = await hasSufficientBalance(auth.currentUser.uid, remainingAmount);
            if (!hasBalance) {
              setIsProcessing(false);
              setUploadProgress('');
              alert(`Insufficient balance. Points covered ₱${(planPrice - remainingAmount).toFixed(2)}, but you need ₱${remainingAmount.toFixed(2)} more from your GetPay wallet.`);
              return;
            }
          }
        }

        // Deduct remaining amount from wallet
        if (remainingAmount > 0) {
          await deductFromWallet(
            auth.currentUser.uid,
            remainingAmount,
            `Getaways ${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'} Subscription${paymentMethod === 'points' ? ' (Partial - remaining after points)' : ''}`,
            {
              subscriptionType: selectedPlan,
              subscriptionPlan: selectedPlan === 'yearly' ? 'Yearly' : 'Monthly',
              paymentType: 'subscription_payment',
              paymentMethod: paymentMethod === 'points' ? 'points_and_wallet' : 'wallet'
            }
          );
          console.log(`✅ Subscription fee ${paymentMethod === 'points' ? 'remaining amount' : ''} deducted from host GetPay wallet: ₱${remainingAmount.toFixed(2)}`);
        }
      }

      // Transfer payment directly to admin's GetPay wallet (GetPay is standalone)
      const adminUserId = await getAdminUserId();
      if (adminUserId) {
        const { initializeWallet: initAdminWallet } = await import('@/pages/Common/services/getpayService');
        await initAdminWallet(adminUserId);
        await addToAdminWallet(
          adminUserId,
          planPrice,
          `Payment Received - Host Subscription`,
          {
            subscriptionType: selectedPlan,
            subscriptionPlan: selectedPlan === 'yearly' ? 'Yearly' : 'Monthly',
            hostId: auth.currentUser.uid,
            hostEmail: auth.currentUser.email,
            paymentType: 'subscription_payment'
          }
        );
        console.log('✅ Subscription payment sent directly to admin GetPay wallet');
      } else {
        console.warn('⚠️ Admin user ID not found - payment not credited to admin wallet');
      }

      // Update user payment status
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const existingPayment = userData.payment || {};
          
          await updateDoc(userRef, {
            payment: {
            ...existingPayment,
            type: selectedPlan,
              startDate: serverTimestamp(),
              status: 'active',
              lastPaymentDate: serverTimestamp(),
            method: 'getpay'
            }
          });
        console.log('✅ Payment info saved to user document');
      }

      // Publish/Update the listing (this includes photo uploads which may take time)
      setUploadProgress(isEditMode ? 'Updating your listing...' : 'Creating your listing...');
      console.log('📤 Starting listing publication/update process...');
      isAutoPublishingRef.current = false; // Ensure manual clicks are not treated as auto-publishing
      const listingId = await publishListing();
      console.log('✅ GetPay payment processed and listing ' + (isEditMode ? 'updated' : 'published') + ':', listingId);

      // Award points for first listing (only for new listings, not edits)
      if (!isEditMode && auth.currentUser && listingId) {
        try {
          const { awardPointsForFirstListing, awardMilestonePoints } = await import('@/pages/Host/services/pointsService');
          await awardPointsForFirstListing(auth.currentUser.uid, listingId);
          
          // Check for listing milestones
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const listingsRef = collection(db, 'listings');
          const userListingsQuery = query(
            listingsRef,
            where('ownerId', '==', auth.currentUser.uid),
            where('status', '==', 'active')
          );
          const listingsSnapshot = await getDocs(userListingsQuery);
          const listingCount = listingsSnapshot.size;
          
          if ([3, 5, 10].includes(listingCount)) {
            await awardMilestonePoints(auth.currentUser.uid, 'listings', listingCount);
          }
        } catch (pointsError) {
          console.error('Error awarding points for listing:', pointsError);
          // Don't block navigation if points fail
        }
      }

      // Clear sessionStorage for onboarding completion
      updateSessionStorageBeforeNav('payment');
      
      setUploadProgress('Finalizing...');

      // Navigate to listings tab with success message
      navigate('/host/listings', {
        state: {
          message: isEditMode 
            ? 'Payment successful! Your listing has been updated.'
            : 'Payment successful! Your listing has been published.',
          listingPublished: !isEditMode,
          listingUpdated: isEditMode,
          listingId: listingId,
          onboardingCompleted: true,
          paymentMethod: 'getpay'
        }
      });
    } catch (error) {
      console.error('❌ Error processing GetPay payment:', error);
      setIsProcessing(false);
      setUploadProgress('');
      alert(`Error processing payment: ${error.message}\n\nPlease try again or contact support if the issue persists.`);
    }
  };

  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'PHP' }}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out;
        }
        .gradient-bg {
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%);
        }
        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-muted/30">
        <OnboardingHeader customSaveAndExit={handleSaveAndExitClick} />
        <main className="pt-20 px-4 sm:px-6 lg:px-8 pb-32">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* Header */}
          <div className="mb-16 text-center animate-fadeInUp">
            <div className="inline-block mb-4">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl mx-auto">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
              {requiresPayment ? 'Complete Your Subscription' : 'Updating Your Listing'}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {requiresPayment 
                ? 'Subscribe to publish your listing and make it visible to guests worldwide'
                : 'Your listing is being updated...'}
            </p>
          </div>

          {/* Show updating message if payment not required */}
          {!requiresPayment && uploadProgress && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">{uploadProgress}</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {uploadProgress.includes('Updating') 
                      ? 'Please wait while we update your listing...'
                      : uploadProgress.includes('Finalizing')
                      ? 'Almost done!'
                      : 'Processing...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Policy and Compliance - FIRST, before plans - Only show if payment required */}
          {requiresPayment && (
            <div className="mb-10 space-y-6 animate-fadeInUp">
              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-3 mb-3">
                  <span className="bg-primary text-white text-sm font-bold px-4 py-1.5 rounded-full">Step 1</span>
                  <h2 className="text-2xl font-bold text-gray-900">Policy & Compliance</h2>
                </div>
                <p className="text-sm text-gray-600">Please review and accept our terms before proceeding</p>
              </div>
              
              {/* Policy Agreement */}
              <div className="relative border-2 border-primary/30 rounded-xl p-6 bg-gradient-to-br from-white to-primary/5 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute top-4 right-4">
                  {acceptedPolicy && (
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center animate-fadeInUp">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-5 mb-5">
                  <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Listing Policy Agreement</h3>
                    <div className="text-xs text-gray-700 space-y-2 max-h-36 overflow-y-auto pr-3 custom-scrollbar">
                      <p className="font-semibold text-gray-900">
                        By publishing your listing on Getaways, you agree to the following terms:
                      </p>
                      <ul className="list-disc list-inside space-y-2.5 ml-2">
                        <li className="hover:text-gray-900 transition-colors">Provide accurate and truthful information about your property</li>
                        <li className="hover:text-gray-900 transition-colors">Maintain your listing with current photos and pricing</li>
                        <li className="hover:text-gray-900 transition-colors">Respond to guest inquiries within 24 hours</li>
                        <li className="hover:text-gray-900 transition-colors">Honor confirmed reservations and provide the amenities listed</li>
                        <li className="hover:text-gray-900 transition-colors">Comply with local laws and regulations regarding short-term rentals</li>
                        <li className="hover:text-gray-900 transition-colors">Keep your subscription active to maintain listing visibility</li>
                        <li className="hover:text-gray-900 transition-colors">Getaways reserves the right to review and remove listings that violate our policies</li>
                        <li className="hover:text-gray-900 transition-colors">Subscription fees are non-refundable after publication</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-lg hover:bg-white/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={acceptedPolicy}
                    onChange={(e) => setAcceptedPolicy(e.target.checked)}
                    className="mt-0.5 w-5 h-5 text-primary border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer transition-all"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">
                    I have read and agree to the Listing Policy Agreement
                  </span>
                </label>
              </div>

              {/* Compliance Agreement */}
              <div className="relative border-2 border-primary/30 rounded-xl p-6 bg-gradient-to-br from-white to-primary/5 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute top-4 right-4">
                  {acceptedCompliance && (
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center animate-fadeInUp">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-5 mb-5">
                  <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Compliance & Safety Requirements</h3>
                    <div className="text-xs text-gray-700 space-y-2 max-h-36 overflow-y-auto pr-3 custom-scrollbar">
                      <p className="font-semibold text-gray-900">
                        As a host, you must comply with the following safety and legal requirements:
                      </p>
                      <ul className="list-disc list-inside space-y-2.5 ml-2">
                        <li className="hover:text-gray-900 transition-colors">Obtain all necessary permits, licenses, and registrations required by local authorities</li>
                        <li className="hover:text-gray-900 transition-colors">Ensure your property meets local building codes and safety standards</li>
                        <li className="hover:text-gray-900 transition-colors">Maintain working smoke detectors, carbon monoxide alarms, and fire extinguishers</li>
                        <li className="hover:text-gray-900 transition-colors">Provide emergency contact information to guests</li>
                        <li className="hover:text-gray-900 transition-colors">Maintain adequate insurance coverage for your property</li>
                        <li className="hover:text-gray-900 transition-colors">Comply with tax obligations for rental income in your jurisdiction</li>
                        <li className="hover:text-gray-900 transition-colors">Respect neighborhood quiet hours and local regulations</li>
                        <li className="hover:text-gray-900 transition-colors">Report any safety incidents or guest issues promptly</li>
                        <li className="hover:text-gray-900 transition-colors">Getaways may require verification of compliance documentation</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-lg hover:bg-white/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={acceptedCompliance}
                    onChange={(e) => setAcceptedCompliance(e.target.checked)}
                    className="mt-0.5 w-5 h-5 text-primary border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer transition-all"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">
                    I confirm that I will comply with all safety and legal requirements
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Subscription Plans - Only show if payment required AND policies accepted */}
          {requiresPayment && acceptedPolicy && acceptedCompliance && (
            <div className="mb-10 animate-fadeInUp">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-3 mb-3">
                  <span className="bg-primary text-white text-sm font-bold px-4 py-1.5 rounded-full">Step 2</span>
                  <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
                </div>
                <p className="text-sm text-gray-600">Select a subscription plan to publish your listing</p>
              </div>
              
              {/* Plan Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {subscriptionPlans.map((plan, index) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-xl ${
                    selectedPlan === plan.id
                      ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-xl ring-2 ring-primary/20'
                      : 'border-gray-200 hover:border-primary/50 bg-white shadow-md'
                  } ${plan.popular ? 'md:scale-[1.02]' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="mb-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">{plan.name}</h3>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-3xl font-extrabold text-gray-900">₱{plan.price.toLocaleString()}</span>
                      <span className="text-gray-600 text-sm">
                        {plan.id === 'monthly' ? '/month' : '/year'}
                      </span>
                    </div>
                    {plan.savings && (
                      <span className="inline-flex items-center gap-1 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                        <span>💰</span>
                        <span>Save {plan.savings}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                  {selectedPlan === plan.id && (
                    <div className="mt-4 flex items-center justify-center gap-2 bg-primary text-white font-bold px-4 py-2 rounded-lg shadow-md animate-fadeInUp text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Selected</span>
                    </div>
                  )}
                </div>
              ))}
              </div>

              {/* Order Summary */}
              <div className="mb-8 border-2 border-primary/30 rounded-xl p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-white shadow-xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">₱</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">Order Summary</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-white/60 rounded-lg">
                    <span className="text-gray-600 text-sm font-medium">Subscription Plan</span>
                    <span className="font-bold text-gray-900">
                      {subscriptionPlans.find(p => p.id === selectedPlan)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white/60 rounded-lg">
                    <span className="text-gray-600 text-sm font-medium">Price</span>
                    <span className="font-bold text-gray-900">
                      ₱{subscriptionPlans.find(p => p.id === selectedPlan)?.price.toLocaleString()}
                      {selectedPlan === 'monthly' ? '/month' : '/year'}
                    </span>
                  </div>
                  <div className="border-t-2 border-primary/30 pt-4 mt-3">
                    <div className="flex justify-between items-center p-4 bg-primary rounded-lg text-white">
                      <span className="font-bold">Total</span>
                      <span className="font-extrabold text-xl">
                        ₱{subscriptionPlans.find(p => p.id === selectedPlan)?.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Payment Method - PayPal Payment - Only show if payment required AND policies accepted */}
          {requiresPayment && acceptedPolicy && acceptedCompliance && (
            <div className="mb-10 animate-fadeInUp">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-3 mb-3">
                  <span className="bg-primary text-white text-sm font-bold px-4 py-1.5 rounded-full">Step 3</span>
                  <h2 className="text-2xl font-bold text-gray-900">Complete Payment & Publish Listing</h2>
                </div>
                <p className="text-sm text-gray-600">Choose your payment method to complete your subscription</p>
              </div>
              
              {/* Payment Provider Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-3">Select Payment Method</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentProvider === 'getpay' 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-gray-200 hover:border-primary/50 bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="paymentProvider"
                      value="getpay"
                      checked={paymentProvider === 'getpay'}
                      onChange={(e) => setPaymentProvider(e.target.value)}
                      className="w-4 h-4 text-primary"
                    />
                    <Wallet className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">GetPay E-Wallet</div>
                      <div className="text-xs text-gray-600">Pay using your GetPay wallet balance or points</div>
                    </div>
                  </label>
                  
                  <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentProvider === 'paypal' 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-gray-200 hover:border-primary/50 bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="paymentProvider"
                      value="paypal"
                      checked={paymentProvider === 'paypal'}
                      onChange={(e) => setPaymentProvider(e.target.value)}
                      className="w-4 h-4 text-primary"
                    />
                    <div className="flex items-center justify-center w-10 h-10 rounded bg-[#0070ba]">
                      <span className="text-white font-bold text-sm">P</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">PayPal Direct</div>
                      <div className="text-xs text-gray-600">Pay directly via PayPal</div>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Payment Completion Section - GetPay Wallet Payment */}
              {paymentProvider === 'getpay' && (
              <div className="border-2 border-primary/30 rounded-xl p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-white shadow-xl">
                {/* Info about GetPay Payment */}
                <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600 font-bold text-lg">ℹ️</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-blue-900 mb-2">
                        GetPay Wallet Payment
                      </p>
                      <p className="text-xs text-blue-800 mb-2">
                        Payments are processed directly through GetPay wallet. Your payment will be sent directly to the admin's GetPay wallet.
                      </p>
                      <p className="text-xs text-blue-700">
                        <strong>Note:</strong> GetPay is a standalone e-wallet system, separate from PayPal. Cash in/out operations use PayPal, but platform payments use GetPay directly.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Progress indicator */}
                {isProcessing && (
                  <div className="mb-5 p-5 bg-primary/10 border-2 border-primary/30 rounded-lg shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="animate-spin rounded-full h-7 w-7 border-3 border-primary border-t-transparent"></div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">Processing your payment and listing...</p>
                        {uploadProgress && (
                          <p className="text-xs text-gray-700 mt-2 font-medium">{uploadProgress}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-5 border-2 border-gray-200 shadow-md">
                  <div className="w-full max-w-md mx-auto">
                    <GetPayPaymentButton
                      amount={subscriptionPlans.find(p => p.id === selectedPlan)?.price || 0}
                      planName={subscriptionPlans.find(p => p.id === selectedPlan)?.name || 'Subscription'}
                      onPayment={handleGetPayPayment}
                      disabled={!canProceed || isProcessing}
                      userId={auth.currentUser?.uid}
                      paymentMethod={paymentMethod}
                      onPaymentMethodChange={setPaymentMethod}
                    />
                  </div>
                </div>
              </div>
              )}
              
              {/* Payment Completion Section - PayPal Direct Payment */}
              {paymentProvider === 'paypal' && (
                <div className="border-2 border-primary/30 rounded-xl p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-white shadow-xl">
                  {/* Info about PayPal Payment */}
                  <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 font-bold text-lg">ℹ️</div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-blue-900 mb-2">
                          PayPal Direct Payment
                        </p>
                        <p className="text-xs text-blue-800 mb-2">
                          Pay directly via PayPal. Your payment will be processed securely through PayPal.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress indicator */}
                  {isProcessing && (
                    <div className="mb-5 p-5 bg-primary/10 border-2 border-primary/30 rounded-lg shadow-md">
                      <div className="flex items-center gap-4">
                        <div className="animate-spin rounded-full h-7 w-7 border-3 border-primary border-t-transparent"></div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">Processing your payment and listing...</p>
                          {uploadProgress && (
                            <p className="text-xs text-gray-700 mt-2 font-medium">{uploadProgress}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-5 border-2 border-gray-200 shadow-md">
                    <div className="w-full max-w-md mx-auto">
                      <PayPalPaymentButton
                        amount={subscriptionPlans.find(p => p.id === selectedPlan)?.price || 0}
                        planName={subscriptionPlans.find(p => p.id === selectedPlan)?.name || 'Subscription'}
                        onPayment={handlePayPalPayment}
                        disabled={!canProceed || isProcessing}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-6 pt-6">
            <button
              onClick={() => {
                navigate(-1);
              }}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ← Back
            </button>
            {!acceptedPolicy || !acceptedCompliance ? (
              <div className="text-sm text-amber-600 text-right font-medium px-4 py-2">
                <p>Please accept Policy & Compliance terms to proceed</p>
              </div>
            ) : null}
          </div>
        </div>
      </main>
      </div>
    </PayPalScriptProvider>
  );
};

export default Payment;

