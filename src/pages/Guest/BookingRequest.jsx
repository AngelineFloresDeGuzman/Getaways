import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { calculateTotalPrice } from '@/pages/Guest/services/bookingService';
import Footer from '@/components/Footer';
import { ArrowLeft, ChevronRight, CreditCard, MessageSquare, User, CheckCircle2, Camera, X, CheckCircle, AlertCircle, ExternalLink, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createBooking, checkDateConflict } from '@/pages/Guest/services/bookingService';
import { toast } from '@/components/ui/sonner';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { getWalletBalance, hasSufficientBalance, initializeWallet, deductFromWallet } from '@/pages/Common/services/getpayService';

const BookingRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Use React state for dates and guests to allow dynamic changes
  const [checkInDate, setCheckInDate] = useState(location.state?.checkInDate || '');
  const [checkOutDate, setCheckOutDate] = useState(location.state?.checkOutDate || '');
  const [guests, setGuests] = useState(location.state?.guests || 1);

  // Temporary state for editing dates/guests
  const [pendingCheckIn, setPendingCheckIn] = useState(checkInDate);
  const [pendingCheckOut, setPendingCheckOut] = useState(checkOutDate);
  const [pendingGuests, setPendingGuests] = useState(guests);

  // When opening pickers, set pending values to current
  const openDatePicker = () => {
    setPendingCheckIn(checkInDate);
    setPendingCheckOut(checkOutDate);
    setShowDatePicker(true);
  };
  const openGuestPicker = () => {
    setPendingGuests(guests);
    setShowGuestPicker(true);
  };

  // On 'Done', commit changes and close picker
  const commitDateEdit = () => {
    setCheckInDate(pendingCheckIn);
    setCheckOutDate(pendingCheckOut);
    setShowDatePicker(false);
  };
  const commitGuestEdit = () => {
    setGuests(pendingGuests);
    setShowGuestPicker(false);
  };
  // Use React state for dates and guests to allow dynamic changes
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);

  // Handle date change and recompute nights/pricing
  const handleDateChange = (type, value) => {
    if (type === 'checkIn') {
      setCheckInDate(value);
    } else {
      setCheckOutDate(value);
    }
    setCurrentStep(5); // Stay on review step
  };

  // Handle guest change and recompute pricing
  const handleGuestChange = (value) => {
    setGuests(value);
    setCurrentStep(5);
  };
  const user = auth.currentUser;

  // Get booking data from navigation state
  const {
    listingId,
    listing,
    totalPrice,
    nightlyPrice,
    couponCode,
    couponDiscount
  } = location.state || {};


  const [currentStep, setCurrentStep] = useState(1);
  const [paymentOption, setPaymentOption] = useState('now'); // Only 'now' allowed
  const [paymentProvider, setPaymentProvider] = useState('getpay'); // 'getpay' or 'paypal' - top level payment provider
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' for GetPay, 'paypal' for PayPal direct
  const [walletBalance, setWalletBalance] = useState(0);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [messageToHost, setMessageToHost] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayPal, setShowPayPal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const fileInputRef = useRef(null);
  const [paypalConnected, setPaypalConnected] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [isCheckingPaypal, setIsCheckingPaypal] = useState(true);
  const [paypalEmailInput, setPaypalEmailInput] = useState('');
  const [isConnectingPaypal, setIsConnectingPaypal] = useState(false);

  // Calculate charge date (check-in date minus some days, or check-in date if paying later)
  const getChargeDate = () => {
    if (!checkInDate) return null;
    const chargeDate = new Date(checkInDate);
    chargeDate.setDate(chargeDate.getDate() - 14); // 14 days before check-in
    return chargeDate;
  };

  const chargeDate = getChargeDate();

  // Load user profile photo, PayPal connection status, and wallet balance on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const existingPhoto = userData.profileImage || userData.photoURL || null;
            if (existingPhoto) {
              setProfilePhoto(existingPhoto);
              setProfilePhotoPreview(existingPhoto);
            }
            
            // Check PayPal connection status
            const paymentData = userData.payment || {};
            const email = paymentData.paypalEmail || userData.paypalEmail || '';
            const isConnected = paymentData.paypalStatus === 'connected' || userData.paypalStatus === 'connected';
            setPaypalEmail(email);
            setPaypalConnected(isConnected && !!email);
            setIsCheckingPaypal(false);
            
            // Check GetPay wallet balance
            if (paymentOption === 'now') {
              setIsCheckingBalance(true);
              try {
                await initializeWallet(currentUser.uid);
                const balance = await getWalletBalance(currentUser.uid);
                setWalletBalance(balance);
              } catch (error) {
                console.error('Error checking wallet balance:', error);
              } finally {
                setIsCheckingBalance(false);
              }
            }
          } else {
            setIsCheckingPaypal(false);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setIsCheckingPaypal(false);
        }
      } else {
        setIsCheckingPaypal(false);
      }
    });
    return () => unsubscribe();
  }, [paymentOption]);

  // Refresh PayPal connection status when returning to Step 2
  useEffect(() => {
    if (currentStep === 2 && user) {
      const checkPaypalStatus = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const paymentData = userData.payment || {};
            const email = paymentData.paypalEmail || userData.paypalEmail || '';
            const isConnected = paymentData.paypalStatus === 'connected' || userData.paypalStatus === 'connected';
            setPaypalEmail(email);
            setPaypalConnected(isConnected && !!email);
            setIsCheckingPaypal(false);
          }
        } catch (error) {
          console.error('Error checking PayPal status:', error);
          setIsCheckingPaypal(false);
        }
      };
      checkPaypalStatus();
    }
  }, [currentStep, user]);

  // Auto-advance from Step 4 if photo already exists when reaching that step
  useEffect(() => {
    if (currentStep === 4 && profilePhoto && !profilePhotoPreview) {
      // Photo exists but preview wasn't set, set it
      setProfilePhotoPreview(profilePhoto);
    }
  }, [currentStep, profilePhoto]);

  // Handle photo file selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target.result;
      setProfilePhotoPreview(base64Image);
    };
    reader.readAsDataURL(file);
  };

  // Save photo to profile
  const handleSavePhoto = async (shouldProceed = true) => {
    if (!profilePhotoPreview) {
      toast.error('Please select a photo first');
      return;
    }

    if (!user) {
      toast.error('Please log in to save photo');
      return;
    }

    try {
      setUploadingPhoto(true);
      
      // Save to Firebase user profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        profileImage: profilePhotoPreview,
        updatedAt: new Date().toISOString()
      });

      setProfilePhoto(profilePhotoPreview);
      toast.success('Profile photo saved successfully!');
      
      if (shouldProceed) {
        handleNext();
      }
    } catch (error) {
      console.error('Error saving profile photo:', error);
      toast.error('Failed to save profile photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleNext = () => {
    // Validate Step 2: Payment method must be set
    if (currentStep === 2) {
      if (paymentProvider === 'paypal' && !paypalConnected) {
        toast.error('Please connect your PayPal account before proceeding');
        return;
      }
      if (paymentProvider === 'getpay' && paymentOption === 'now') {
        // Check wallet balance if paying now with GetPay
        let payNights = 0;
        if (checkInDate && checkOutDate) {
          const inDate = new Date(checkInDate);
          const outDate = new Date(checkOutDate);
          if (outDate > inDate) {
            payNights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
          }
        }
        let payOriginalListingPrice = 0;
        if (listing && checkInDate && checkOutDate && payNights > 0) {
          const nightlyRate = listing.price || listing.weekdayPrice || 0;
          payOriginalListingPrice = nightlyRate * payNights;
        }
        let payHighestPromo = null;
        let payHighestPromoAmount = 0;
        if (listing && checkInDate && checkOutDate && payNights > 0) {
          const promoOptions = [];
          if (listing.weeklyDiscount && payNights >= 7) {
            promoOptions.push({ label: 'Weekly stay discount', amount: Math.round(payOriginalListingPrice * (listing.weeklyDiscount / 100)) });
          }
          if (listing.monthlyDiscount && payNights >= 28) {
            promoOptions.push({ label: 'Monthly stay discount', amount: Math.round(payOriginalListingPrice * (listing.monthlyDiscount / 100)) });
          }
          if (listing.earlyBirdDiscount) {
            promoOptions.push({ label: 'Early bird discount', amount: Math.round(payOriginalListingPrice * (listing.earlyBirdDiscount / 100)) });
          }
          if (listing.lastMinuteDiscount) {
            promoOptions.push({ label: 'Last minute discount', amount: Math.round(payOriginalListingPrice * (listing.lastMinuteDiscount / 100)) });
          }
          if (promoOptions.length > 0) {
            payHighestPromo = promoOptions.reduce((max, curr) => curr.amount > max.amount ? curr : max, promoOptions[0]);
            payHighestPromoAmount = payHighestPromo.amount;
          }
        }
        let payFinalPrice = payOriginalListingPrice - (payHighestPromoAmount || 0) - (couponDiscount || 0);
        if (walletBalance < payFinalPrice) {
          toast.error(`Insufficient GetPay wallet balance. You need ₱${(Math.max(0, payFinalPrice)?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00')} but your balance is ₱${walletBalance.toLocaleString()}. Please cash in first.`);
          return;
        }
      }
    }
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1); // Go back to detail page
    }
  };

  // Handle PayPal account connection
  const handleConnectPayPal = async () => {
    if (!user) {
      toast.error('Please log in to connect PayPal');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!paypalEmailInput || !emailRegex.test(paypalEmailInput)) {
      toast.error('Please enter a valid PayPal email address');
      return;
    }

    setIsConnectingPaypal(true);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      // Get existing payment data to preserve it
      const existingData = userSnap.exists() ? userSnap.data() : {};
      const existingPayment = existingData.payment || {};
      
      // Update payment map with PayPal connection info (preserve existing payment data)
      const updateData = {
        payment: {
          ...existingPayment, // Preserve existing payment data
          paypalEmail: paypalEmailInput.trim(),
          paypalAccountId: `PP_${Date.now()}`,
          paypalAccountName: paypalEmailInput.trim().split('@')[0],
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
      
      // Update local state
      setPaypalConnected(true);
      setPaypalEmail(paypalEmailInput.trim());
      setPaypalEmailInput(''); // Clear input after successful connection
      toast.success('PayPal account connected successfully!');
      setIsConnectingPaypal(false);
    } catch (error) {
      console.error('Error connecting PayPal:', error);
      toast.error('Failed to connect PayPal account: ' + error.message);
      setIsConnectingPaypal(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to complete booking');
      return;
    }

    if (!checkInDate || !checkOutDate) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    if (!listingId || !listing) {
      toast.error('Listing information is missing');
      return;
    }

    try {
      setIsSubmitting(true);

      // Double-check for conflicts
      const hasConflict = await checkDateConflict(listingId, checkInDate, checkOutDate);
      if (hasConflict) {
        toast.error('Selected dates are not available. Please choose different dates.');
        setIsSubmitting(false);
        return;
      }

      // Handle payment based on provider and option
      if (paymentOption === 'now') {
        if (paymentProvider === 'getpay') {
          // Deduct from GetPay wallet
          try {
            await initializeWallet(user.uid);
            const hasBalance = await hasSufficientBalance(user.uid, displayTotalPrice);
            if (!hasBalance) {
              toast.error(`Insufficient GetPay wallet balance. You need ₱${displayTotalPrice.toLocaleString()} but your balance is insufficient.`);
              setIsSubmitting(false);
              return;
            }
            
            // Note: Payment will be processed in createBooking when useWallet=true
            console.log('✅ GetPay wallet has sufficient balance');
          } catch (walletError) {
            console.error('Error checking GetPay balance:', walletError);
            toast.error('Failed to check wallet balance: ' + walletError.message);
            setIsSubmitting(false);
            return;
          }
        } else if (paymentProvider === 'paypal') {
          // For PayPal direct payment, we need to handle it before creating booking
          // The PayPal button will handle the payment, then call handleSubmit
          // For now, we'll create the booking and mark it as pending PayPal payment
          // In a real implementation, you'd handle PayPal payment first, then create booking
          console.log('✅ PayPal direct payment will be processed');
        }
      }
      
      // Create booking
      // useWallet: true for "pay now" with GetPay, false for PayPal direct or "pay later"
      // Use displayTotalPrice which includes guest fee and coupon discount
      const bookingId = await createBooking({
        listingId: listingId,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        guests: guests || 1,
        totalPrice: displayTotalPrice, // Final total with coupon discount and guest fee
        useWallet: paymentOption === 'now' && paymentProvider === 'getpay', // Pay now with GetPay = use wallet
        paymentProvider: paymentProvider, // 'getpay' or 'paypal'
        paymentMethod: paymentProvider === 'getpay' ? 'wallet' : 'paypal',
        message: messageToHost || undefined,
        couponCode: couponCode || undefined,
        couponDiscount: couponDiscount || 0,
        couponId: location.state?.couponId || undefined
      });

      toast.success('Booking request submitted successfully! The host will be notified.');
      
      // Navigate to account settings bookings tab
      navigate('/accountsettings?tab=bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error.message || 'Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate nights

  let nights = 0;
  let dateError = '';
  if (checkInDate && checkOutDate) {
    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);
    if (outDate <= inDate) {
      dateError = 'Check-out date must be after check-in date.';
    } else {
      nights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
    }
  }


  // Calculate original listing price (before any discounts/coupons)
  let originalListingPrice = 0;
  if (listing && checkInDate && checkOutDate && nights > 0) {
    // Use the nightly price from listing (weekday/weekend logic can be added if needed)
    // For now, use listing.price or listing.weekdayPrice
    const nightlyRate = listing.price || listing.weekdayPrice || 0;
    originalListingPrice = nightlyRate * nights;
  }



  // Calculate base booking amount (nights × nightly price)
  // Apply only the highest promo and one coupon
  let discountsApplied = [];
  let highestPromo = null;
  let highestPromoAmount = 0;
  let promoLabel = '';
  if (listing && checkInDate && checkOutDate && nights > 0) {
    const promoOptions = [];
    if (listing.weeklyDiscount && nights >= 7) {
      promoOptions.push({ label: 'Weekly stay discount', amount: Math.round(originalListingPrice * (listing.weeklyDiscount / 100)) });
    }
    if (listing.monthlyDiscount && nights >= 28) {
      promoOptions.push({ label: 'Monthly stay discount', amount: Math.round(originalListingPrice * (listing.monthlyDiscount / 100)) });
    }
    if (listing.earlyBirdDiscount) {
      promoOptions.push({ label: 'Early bird discount', amount: Math.round(originalListingPrice * (listing.earlyBirdDiscount / 100)) });
    }
    if (listing.lastMinuteDiscount) {
      promoOptions.push({ label: 'Last minute discount', amount: Math.round(originalListingPrice * (listing.lastMinuteDiscount / 100)) });
    }
    // Find highest promo
    if (promoOptions.length > 0) {
      highestPromo = promoOptions.reduce((max, curr) => curr.amount > max.amount ? curr : max, promoOptions[0]);
      highestPromoAmount = highestPromo.amount;
      promoLabel = highestPromo.label;
      discountsApplied.push({ label: promoLabel, amount: highestPromoAmount });
    }
  }
  // Only one promo applied, so total = originalListingPrice - highestPromoAmount - couponDiscount
  let finalPrice = originalListingPrice - (highestPromoAmount || 0) - (couponDiscount || 0);

  // This is the amount before coupon discount and guest fee
  // Use calculateTotalPrice to apply special offers/discounts
  const calculatedBasePrice = (checkInDate && checkOutDate && listing)
    ? calculateTotalPrice(listing.pricing, checkInDate, checkOutDate, guests)
    : 0;
  
  // Guest fee percentage (14% like Airbnb-style service fee)
  const GUEST_FEE_PERCENTAGE = 0.14;
  
  // Calculate prices with coupon discount
  // Note: totalPrice from AccommodationDetail is basePrice - couponDiscount (doesn't include guest fee)
  // So we need to:
  // 1. Get the base booking amount (before coupon)
  // 2. Apply coupon discount
  // 3. Calculate guest fee on discounted booking amount
  // 4. Calculate final total = discounted booking amount + guest fee
  
  let baseBookingAmount = 0;
  let discountedBookingAmount = 0;
  let finalTotalPrice = 0;

  if (couponDiscount > 0 && calculatedBasePrice > 0) {
    baseBookingAmount = calculatedBasePrice;
    discountedBookingAmount = Math.max(0, baseBookingAmount - couponDiscount);
    finalTotalPrice = discountedBookingAmount;
  } else if (calculatedBasePrice > 0) {
    baseBookingAmount = calculatedBasePrice;
    discountedBookingAmount = baseBookingAmount;
    finalTotalPrice = discountedBookingAmount;
  }

  // Use finalTotalPrice for display and booking (no guest fee for guest)
  // Always use totalPrice from navigation state for display/payment
  const displayTotalPrice = typeof totalPrice === 'number' ? totalPrice : finalTotalPrice;
  const displayBasePrice = discountedBookingAmount || baseBookingAmount || 0;
  
  // Calculate payment amounts
  const dueToday = paymentOption === 'now' ? displayTotalPrice : 0;
  const chargeOnDate = paymentOption === 'later' ? displayTotalPrice : 0;

  // PayPal Client ID
  const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';

  if (!listing || !checkInDate || !checkOutDate) {
    return (
      <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'PHP' }}>
        <div className="min-h-screen bg-background">
          <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-36">
          <div className="text-center">
            <p className="text-foreground text-lg mb-4">Missing booking information</p>
            <button
              onClick={() => navigate(-1)}
              className="btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
        <Footer />
        </div>
      </PayPalScriptProvider>
    );
  }

  const listingImage = listing.photos?.[0]?.base64 || listing.photos?.[0]?.url || listing.image || 'fallback.jpg';
  const listingTitle = listing.title || 'Untitled Listing';
  const listingRating = listing.rating || 0;
  const listingReviews = listing.reviews?.length || 0;

  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'PHP' }}>
      <div className="min-h-screen bg-background">
        <Navigation />

      <div className="pt-36 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Panel - Booking Steps */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-foreground">Request to book</h1>
              </div>

              {/* Step 1: Payment is always required now */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    1. Payment required to book
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="font-medium text-foreground">
                    {(() => {
                      let payNights = 0;
                      if (checkInDate && checkOutDate) {
                        const inDate = new Date(checkInDate);
                        const outDate = new Date(checkOutDate);
                        if (outDate > inDate) {
                          payNights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
                        }
                      }
                      let payOriginalListingPrice = 0;
                      if (listing && checkInDate && checkOutDate && payNights > 0) {
                        const nightlyRate = listing.price || listing.weekdayPrice || 0;
                        payOriginalListingPrice = nightlyRate * payNights;
                      }
                      let payHighestPromo = null;
                      let payHighestPromoAmount = 0;
                      if (listing && checkInDate && checkOutDate && payNights > 0) {
                        const promoOptions = [];
                        if (listing.weeklyDiscount && payNights >= 7) {
                          promoOptions.push({ label: 'Weekly stay discount', amount: Math.round(payOriginalListingPrice * (listing.weeklyDiscount / 100)) });
                        }
                        if (listing.monthlyDiscount && payNights >= 28) {
                          promoOptions.push({ label: 'Monthly stay discount', amount: Math.round(payOriginalListingPrice * (listing.monthlyDiscount / 100)) });
                        }
                        if (listing.earlyBirdDiscount) {
                          promoOptions.push({ label: 'Early bird discount', amount: Math.round(payOriginalListingPrice * (listing.earlyBirdDiscount / 100)) });
                        }
                        if (listing.lastMinuteDiscount) {
                          promoOptions.push({ label: 'Last minute discount', amount: Math.round(payOriginalListingPrice * (listing.lastMinuteDiscount / 100)) });
                        }
                        if (promoOptions.length > 0) {
                          payHighestPromo = promoOptions.reduce((max, curr) => curr.amount > max.amount ? curr : max, promoOptions[0]);
                          payHighestPromoAmount = payHighestPromo.amount;
                        }
                      }
                      let payFinalPrice = payOriginalListingPrice - (payHighestPromoAmount || 0) - (couponDiscount || 0);
                      return `Pay ₱${(Math.max(0, payFinalPrice)?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00')} now`;
                    })()}
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full bg-foreground text-background py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    Continue
                  </button>
                </div>
              </div>

              {/* Step 2: Add a payment method */}
              <div className={`bg-card border border-border rounded-xl p-6 ${currentStep < 2 ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    2. Add a payment method
                  </h2>
                  {currentStep > 2 && (
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Change
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {currentStep > 2 && (
                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    {paymentProvider === 'getpay' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>GetPay E-Wallet Selected</span>
                      </>
                    ) : paypalConnected ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>PayPal Direct Selected ({paypalEmail})</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>PayPal Not Connected</span>
                      </>
                    )}
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose your payment method. You'll be able to review before paying.
                    </p>
                    
                    {/* Payment Provider Selection */}
                    <div className="space-y-3 mb-4">
                      <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentProvider === 'getpay' 
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'border-border hover:border-primary/50 bg-card'
                      }`}>
                        <input
                          type="radio"
                          name="paymentProvider"
                          value="getpay"
                          checked={paymentProvider === 'getpay'}
                          onChange={(e) => {
                            setPaymentProvider(e.target.value);
                            // Check wallet balance when selecting GetPay
                            if (paymentOption === 'now' && user) {
                              setIsCheckingBalance(true);
                              initializeWallet(user.uid).then(() => {
                                return getWalletBalance(user.uid);
                              }).then(balance => {
                                setWalletBalance(balance);
                              }).catch(error => {
                                console.error('Error checking wallet balance:', error);
                              }).finally(() => {
                                setIsCheckingBalance(false);
                              });
                            }
                          }}
                          className="w-4 h-4 text-primary"
                        />
                        <Wallet className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <div className="font-medium text-foreground">GetPay E-Wallet</div>
                          <div className="text-xs text-muted-foreground">Pay using your GetPay wallet balance</div>
                          {paymentOption === 'now' && isCheckingBalance && (
                            <div className="text-xs text-muted-foreground mt-1">Checking balance...</div>
                          )}
                          {paymentOption === 'now' && !isCheckingBalance && paymentProvider === 'getpay' && (() => {
                            let payNights = 0;
                            if (checkInDate && checkOutDate) {
                              const inDate = new Date(checkInDate);
                              const outDate = new Date(checkOutDate);
                              if (outDate > inDate) {
                                payNights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
                              }
                            }
                            let payOriginalListingPrice = 0;
                            if (listing && checkInDate && checkOutDate && payNights > 0) {
                              const nightlyRate = listing.price || listing.weekdayPrice || 0;
                              payOriginalListingPrice = nightlyRate * payNights;
                            }
                            let payHighestPromo = null;
                            let payHighestPromoAmount = 0;
                            if (listing && checkInDate && checkOutDate && payNights > 0) {
                              const promoOptions = [];
                              if (listing.weeklyDiscount && payNights >= 7) {
                                promoOptions.push({ label: 'Weekly stay discount', amount: Math.round(payOriginalListingPrice * (listing.weeklyDiscount / 100)) });
                              }
                              if (listing.monthlyDiscount && payNights >= 28) {
                                promoOptions.push({ label: 'Monthly stay discount', amount: Math.round(payOriginalListingPrice * (listing.monthlyDiscount / 100)) });
                              }
                              if (listing.earlyBirdDiscount) {
                                promoOptions.push({ label: 'Early bird discount', amount: Math.round(payOriginalListingPrice * (listing.earlyBirdDiscount / 100)) });
                              }
                              if (listing.lastMinuteDiscount) {
                                promoOptions.push({ label: 'Last minute discount', amount: Math.round(payOriginalListingPrice * (listing.lastMinuteDiscount / 100)) });
                              }
                              if (promoOptions.length > 0) {
                                payHighestPromo = promoOptions.reduce((max, curr) => curr.amount > max.amount ? curr : max, promoOptions[0]);
                                payHighestPromoAmount = payHighestPromo.amount;
                              }
                            }
                            let payFinalPrice = payOriginalListingPrice - (payHighestPromoAmount || 0) - (couponDiscount || 0);
                            return (
                              <div className={`text-xs mt-1 ${walletBalance >= payFinalPrice ? 'text-green-600' : 'text-amber-600'}`}>
                                Balance: ₱{walletBalance.toLocaleString()} {walletBalance < payFinalPrice && '(Insufficient)'}
                              </div>
                            );
                          })()}
                        </div>
                      </label>
                      
                      <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentProvider === 'paypal' 
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'border-border hover:border-primary/50 bg-card'
                      } ${!paypalConnected ? 'opacity-60' : ''}`}>
                        <input
                          type="radio"
                          name="paymentProvider"
                          value="paypal"
                          checked={paymentProvider === 'paypal'}
                          onChange={(e) => setPaymentProvider(e.target.value)}
                          disabled={!paypalConnected}
                          className="w-4 h-4 text-primary"
                        />
                        <div className="flex items-center justify-center w-10 h-10 rounded bg-[#0070ba]">
                          <span className="text-white font-bold text-sm">P</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">PayPal Direct</div>
                          <div className="text-xs text-muted-foreground">Pay directly via PayPal</div>
                          {!paypalConnected && (
                            <div className="text-xs text-amber-600 mt-1">PayPal account not connected</div>
                          )}
                        </div>
                      </label>
                    </div>
                    
                    {/* PayPal Connection Status (if PayPal selected) */}
                    {paymentProvider === 'paypal' && (
                      <>
                        {isCheckingPaypal ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                            <span className="ml-3 text-sm text-muted-foreground">Checking PayPal connection...</span>
                          </div>
                        ) : paypalConnected ? (
                          <div className="flex items-center gap-3 p-4 border-2 border-green-500 rounded-lg bg-green-50">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium text-green-900">PayPal Account Connected</div>
                              <div className="text-sm text-green-700 mt-1">{paypalEmail}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-start gap-3 p-4 border-2 border-amber-500 rounded-lg bg-amber-50">
                              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="font-medium text-amber-900 mb-1">PayPal Account Not Connected</div>
                                <div className="text-sm text-amber-800">
                                  Connect your PayPal account to use PayPal direct payment.
                                </div>
                              </div>
                            </div>
                            
                            {/* PayPal Connection Form */}
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                  PayPal Email Address
                                </label>
                                <input
                                  type="email"
                                  value={paypalEmailInput}
                                  onChange={(e) => setPaypalEmailInput(e.target.value)}
                                  placeholder="your.email@example.com"
                                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                  disabled={isConnectingPaypal}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Enter the email address associated with your PayPal account
                                </p>
                              </div>
                              
                              <button
                                onClick={handleConnectPayPal}
                                disabled={isConnectingPaypal || !paypalEmailInput.trim()}
                                className="w-full bg-[#0070ba] text-white py-3 rounded-lg font-medium hover:bg-[#005ea6] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isConnectingPaypal ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    Connecting...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Connect PayPal Account
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    

                    {/* Continue Button (disabled for PayPal until paid) */}
                    <button
                      onClick={handleNext}
                      className="w-full bg-foreground text-background py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      Continue
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Write a message to the host */}
              <div className={`bg-card border border-border rounded-xl p-6 ${currentStep < 3 ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    3. Write a message to the host
                  </h2>
                  {currentStep > 3 && (
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Change
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {currentStep > 3 && messageToHost && (
                  <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {messageToHost}
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Before you can continue, let {listing.ownerName || 'the host'} know a little about your trip and why their place is a good fit.
                    </p>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {listing.ownerPhoto ? (
                          <img src={listing.ownerPhoto} alt={listing.ownerName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{listing.ownerName || 'Host'}</p>
                        <p className="text-xs text-muted-foreground">Hosting since {listing.hostSince || '2024'}</p>
                      </div>
                    </div>
                    <textarea
                      value={messageToHost}
                      onChange={(e) => setMessageToHost(e.target.value)}
                      placeholder={`Hi ${listing.ownerName || 'there'}, my partner and I are going to a friend's wedding and your place is right down the street.`}
                      className="w-full min-h-[120px] p-4 border border-border rounded-lg bg-background text-foreground resize-none"
                      maxLength={500}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {messageToHost.length}/500 characters
                      </span>
                      <button
                        onClick={handleNext}
                        disabled={!messageToHost.trim()}
                        className="px-6 py-2 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 4: Add a profile photo */}
              <div className={`bg-card border border-border rounded-xl p-6 ${currentStep < 4 ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <User className="w-5 h-5" />
                    4. Add a profile photo
                  </h2>
                  {currentStep > 4 && profilePhoto && (
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Change
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {currentStep > 4 && profilePhoto && (
                  <div className="mt-2">
                    <div className="text-sm text-green-600 font-medium">Added successfully</div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Hosts want to know who's staying at their place. Pick an image that shows your face. Hosts won't be able to see your profile photo until your reservation is confirmed.
                    </p>
                    
                    {/* Photo Preview/Upload Area */}
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-black flex items-center justify-center overflow-hidden">
                          {profilePhotoPreview ? (
                            <img
                              src={profilePhotoPreview}
                              alt="Profile preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-4xl font-bold">
                              {user?.email?.charAt(0).toUpperCase() || 'A'}
                            </span>
                          )}
                        </div>
                        {profilePhotoPreview && (
                          <button
                            onClick={() => {
                              setProfilePhotoPreview(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 px-6 py-2 border-2 border-border rounded-lg font-medium hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <Camera className="w-5 h-5" />
                        {profilePhotoPreview ? 'Change photo' : 'Add photo'}
                      </button>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={async () => {
                          // If there's a new photo preview that hasn't been saved, save it first
                          if (profilePhotoPreview && profilePhotoPreview !== profilePhoto) {
                            await handleSavePhoto();
                          } else {
                            // If using existing photo or no change, just proceed
                            handleNext();
                          }
                        }}
                        disabled={uploadingPhoto || (profilePhotoPreview && profilePhotoPreview !== profilePhoto && uploadingPhoto)}
                        className="px-6 py-2 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingPhoto ? 'Saving...' : profilePhotoPreview && profilePhotoPreview !== profilePhoto ? 'Save & Continue' : 'Next'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 5: Review your request */}
              <div className={`bg-card border border-border rounded-xl p-6 ${currentStep < 5 ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    5. Review your request
                  </h2>
                </div>

                {currentStep === 5 && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-4">
                      {/* Booking Details */}
                      <div className="space-y-3 pb-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">Booking Details</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Dates</span>
                          <span className="font-medium text-foreground">
                            {checkInDate ? format(new Date(checkInDate), 'MMM d') : ''} – {checkOutDate ? format(new Date(checkOutDate), 'MMM d, yyyy') : ''}
                            <button className="ml-2 text-primary hover:underline text-sm" onClick={() => setShowDatePicker(true)}>Change</button>
                          </span>
                        </div>
                        {showDatePicker && (
                          <div className="my-2">
                            {/* Simple date pickers for check-in and check-out */}
                            <input type="date" value={checkInDate} onChange={e => handleDateChange('checkIn', e.target.value)} />
                            <span className="mx-2">to</span>
                            <input type="date" value={checkOutDate} onChange={e => handleDateChange('checkOut', e.target.value)} />
                            <button className="ml-2 text-xs px-2 py-1 bg-primary text-background rounded" onClick={() => setShowDatePicker(false)}>Done</button>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Nights</span>
                          <span className="font-medium text-foreground">{nights} {nights === 1 ? 'night' : 'nights'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Guests</span>
                          <span className="font-medium text-foreground">
                            {guests || 1} {guests === 1 ? 'guest' : 'guests'}
                            <button className="ml-2 text-primary hover:underline text-sm" onClick={() => setShowGuestPicker(true)}>Change</button>
                          </span>
                        </div>
                        {showGuestPicker && (
                          <div className="my-2">
                            <input type="number" min={1} max={listing?.maxGuests || 10} value={guests} onChange={e => handleGuestChange(Number(e.target.value))} />
                            <button className="ml-2 text-xs px-2 py-1 bg-primary text-background rounded" onClick={() => setShowGuestPicker(false)}>Done</button>
                          </div>
                        )}
                      </div>

                      {/* Payment Option - MATCHES SIDE CARD */}
                      <div className="space-y-2 pb-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">Payment required to book</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Total PHP</span>
                          <span className="font-semibold text-foreground text-lg">
                            {(() => {
                              let cardNights = 0;
                              if (checkInDate && checkOutDate) {
                                const inDate = new Date(checkInDate);
                                const outDate = new Date(checkOutDate);
                                if (outDate > inDate) {
                                  cardNights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
                                }
                              }
                              let cardOriginalListingPrice = 0;
                              if (listing && checkInDate && checkOutDate && cardNights > 0) {
                                const nightlyRate = listing.price || listing.weekdayPrice || 0;
                                cardOriginalListingPrice = nightlyRate * cardNights;
                              }
                              let cardHighestPromo = null;
                              let cardHighestPromoAmount = 0;
                              if (listing && checkInDate && checkOutDate && cardNights > 0) {
                                const promoOptions = [];
                                if (listing.weeklyDiscount && cardNights >= 7) {
                                  promoOptions.push({ label: 'Weekly stay discount', amount: Math.round(cardOriginalListingPrice * (listing.weeklyDiscount / 100)) });
                                }
                                if (listing.monthlyDiscount && cardNights >= 28) {
                                  promoOptions.push({ label: 'Monthly stay discount', amount: Math.round(cardOriginalListingPrice * (listing.monthlyDiscount / 100)) });
                                }
                                if (listing.earlyBirdDiscount) {
                                  promoOptions.push({ label: 'Early bird discount', amount: Math.round(cardOriginalListingPrice * (listing.earlyBirdDiscount / 100)) });
                                }
                                if (listing.lastMinuteDiscount) {
                                  promoOptions.push({ label: 'Last minute discount', amount: Math.round(cardOriginalListingPrice * (listing.lastMinuteDiscount / 100)) });
                                }
                                if (promoOptions.length > 0) {
                                  cardHighestPromo = promoOptions.reduce((max, curr) => curr.amount > max.amount ? curr : max, promoOptions[0]);
                                  cardHighestPromoAmount = cardHighestPromo.amount;
                                }
                              }
                              let cardFinalPrice = cardOriginalListingPrice - (cardHighestPromoAmount || 0) - (couponDiscount || 0);
                              return `₱${(Math.max(0, cardFinalPrice)?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00')}`;
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Payment method</span>
                          <span className="font-medium text-foreground">
                            {paymentProvider === 'getpay' ? 'GetPay' : paymentProvider === 'paypal' ? 'PayPal' : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Due today</span>
                          <span className="font-medium text-foreground">
                            {(() => {
                              let dueNights = 0;
                              if (checkInDate && checkOutDate) {
                                const inDate = new Date(checkInDate);
                                const outDate = new Date(checkOutDate);
                                if (outDate > inDate) {
                                  dueNights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
                                }
                              }
                              let dueOriginalListingPrice = 0;
                              if (listing && checkInDate && checkOutDate && dueNights > 0) {
                                const nightlyRate = listing.price || listing.weekdayPrice || 0;
                                dueOriginalListingPrice = nightlyRate * dueNights;
                              }
                              let dueHighestPromo = null;
                              let dueHighestPromoAmount = 0;
                              if (listing && checkInDate && checkOutDate && dueNights > 0) {
                                const promoOptions = [];
                                if (listing.weeklyDiscount && dueNights >= 7) {
                                  promoOptions.push({ label: 'Weekly stay discount', amount: Math.round(dueOriginalListingPrice * (listing.weeklyDiscount / 100)) });
                                }
                                if (listing.monthlyDiscount && dueNights >= 28) {
                                  promoOptions.push({ label: 'Monthly stay discount', amount: Math.round(dueOriginalListingPrice * (listing.monthlyDiscount / 100)) });
                                }
                                if (listing.earlyBirdDiscount) {
                                  promoOptions.push({ label: 'Early bird discount', amount: Math.round(dueOriginalListingPrice * (listing.earlyBirdDiscount / 100)) });
                                }
                                if (listing.lastMinuteDiscount) {
                                  promoOptions.push({ label: 'Last minute discount', amount: Math.round(dueOriginalListingPrice * (listing.lastMinuteDiscount / 100)) });
                                }
                                if (promoOptions.length > 0) {
                                  dueHighestPromo = promoOptions.reduce((max, curr) => curr.amount > max.amount ? curr : max, promoOptions[0]);
                                  dueHighestPromoAmount = dueHighestPromo.amount;
                                }
                              }
                              let dueFinalPrice = dueOriginalListingPrice - (dueHighestPromoAmount || 0) - (couponDiscount || 0);
                              return `₱${(Math.max(0, dueFinalPrice)?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00')}`;
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Price Breakdown - MATCHES SIDE CARD */}
                      <div className="space-y-2 pb-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">Price Summary</h3>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {(() => {
                              let cardNights = 0;
                              if (checkInDate && checkOutDate) {
                                const inDate = new Date(checkInDate);
                                const outDate = new Date(checkOutDate);
                                if (outDate > inDate) {
                                  cardNights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
                                }
                              }
                              return `${cardNights} ${cardNights === 1 ? 'night' : 'nights'} × ₱${(listing && listing.price ? listing.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00')}`;
                            })()}
                          </span>
                          <span className="font-medium text-foreground">
                            {(() => {
                              let cardNights = 0;
                              if (checkInDate && checkOutDate) {
                                const inDate = new Date(checkInDate);
                                const outDate = new Date(checkOutDate);
                                if (outDate > inDate) {
                                  cardNights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
                                }
                              }
                              let cardOriginalListingPrice = 0;
                              if (listing && checkInDate && checkOutDate && cardNights > 0) {
                                const nightlyRate = listing.price || listing.weekdayPrice || 0;
                                cardOriginalListingPrice = nightlyRate * cardNights;
                              }
                              return `₱${cardOriginalListingPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            })()}
                          </span>
                        </div>
                        {(() => {
                          let cardNights = 0;
                          if (checkInDate && checkOutDate) {
                            const inDate = new Date(checkInDate);
                            const outDate = new Date(checkOutDate);
                            if (outDate > inDate) {
                              cardNights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
                            }
                          }
                          let cardOriginalListingPrice = 0;
                          if (listing && checkInDate && checkOutDate && cardNights > 0) {
                            const nightlyRate = listing.price || listing.weekdayPrice || 0;
                            cardOriginalListingPrice = nightlyRate * cardNights;
                          }
                          let promoOptions = [];
                          if (listing && checkInDate && checkOutDate && cardNights > 0) {
                            if (listing.weeklyDiscount && cardNights >= 7) {
                              promoOptions.push({ label: 'Weekly stay discount', amount: Math.round(cardOriginalListingPrice * (listing.weeklyDiscount / 100)) });
                            }
                            if (listing.monthlyDiscount && cardNights >= 28) {
                              promoOptions.push({ label: 'Monthly stay discount', amount: Math.round(cardOriginalListingPrice * (listing.monthlyDiscount / 100)) });
                            }
                            if (listing.earlyBirdDiscount) {
                              promoOptions.push({ label: 'Early bird discount', amount: Math.round(cardOriginalListingPrice * (listing.earlyBirdDiscount / 100)) });
                            }
                            if (listing.lastMinuteDiscount) {
                              promoOptions.push({ label: 'Last minute discount', amount: Math.round(cardOriginalListingPrice * (listing.lastMinuteDiscount / 100)) });
                            }
                          }
                          return (
                            <>
                              {promoOptions.map((promo, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm text-green-600">
                                  <span>{promo.label}</span>
                                  <span className="font-medium">-₱{promo.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                              {couponCode && couponDiscount > 0 && (
                                <div className="flex items-center justify-between text-sm text-green-600">
                                  <span>Coupon discount ({couponCode})</span>
                                  <span className="font-medium">-₱{couponDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="font-semibold text-foreground">Total</span>
                          <span className="font-semibold text-foreground text-lg">
                            {(() => {
                              let cardNights = 0;
                              if (checkInDate && checkOutDate) {
                                const inDate = new Date(checkInDate);
                                const outDate = new Date(checkOutDate);
                                if (outDate > inDate) {
                                  cardNights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
                                }
                              }
                              let cardOriginalListingPrice = 0;
                              if (listing && checkInDate && checkOutDate && cardNights > 0) {
                                const nightlyRate = listing.price || listing.weekdayPrice || 0;
                                cardOriginalListingPrice = nightlyRate * cardNights;
                              }
                              let cardHighestPromo = null;
                              let cardHighestPromoAmount = 0;
                              if (listing && checkInDate && checkOutDate && cardNights > 0) {
                                const promoOptions = [];
                                if (listing.weeklyDiscount && cardNights >= 7) {
                                  promoOptions.push({ label: 'Weekly stay discount', amount: Math.round(cardOriginalListingPrice * (listing.weeklyDiscount / 100)) });
                                }
                                if (listing.monthlyDiscount && cardNights >= 28) {
                                  promoOptions.push({ label: 'Monthly stay discount', amount: Math.round(cardOriginalListingPrice * (listing.monthlyDiscount / 100)) });
                                }
                                if (listing.earlyBirdDiscount) {
                                  promoOptions.push({ label: 'Early bird discount', amount: Math.round(cardOriginalListingPrice * (listing.earlyBirdDiscount / 100)) });
                                }
                                if (listing.lastMinuteDiscount) {
                                  promoOptions.push({ label: 'Last minute discount', amount: Math.round(cardOriginalListingPrice * (listing.lastMinuteDiscount / 100)) });
                                }
                                if (promoOptions.length > 0) {
                                  cardHighestPromo = promoOptions.reduce((max, curr) => curr.amount > max.amount ? curr : max, promoOptions[0]);
                                  cardHighestPromoAmount = cardHighestPromo.amount;
                                }
                              }
                              let cardFinalPrice = cardOriginalListingPrice - (cardHighestPromoAmount || 0) - (couponDiscount || 0);
                              return `₱${(Math.max(0, cardFinalPrice)?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00')}`;
                            })()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Platform receives 10% from host payout (not charged to guest).
                        </div>
                      </div>

                    </div>

                    {/* Only show PayPal button in final review step (step 5) if PayPal is selected */}
                    {currentStep === 5 && !showPayPal && (
                      <button
                        onClick={async () => {
                          if (paymentProvider === 'paypal' && paypalConnected) {
                            setShowPayPal(true);
                          } else {
                            setIsSubmitting(true);
                            await handleSubmit();
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={isSubmitting}
                        className="w-full bg-primary text-background py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Submitting...' : 'Request to book'}
                      </button>
                    )}
                    {showPayPal && paymentProvider === 'paypal' && paypalConnected && (
                      <div style={{ marginTop: 24 }}>
                        <PayPalButtons
                          style={{ layout: 'vertical' }}
                          createOrder={(data, actions) => {
                            setIsSubmitting(true);
                            return actions.order.create({
                              purchase_units: [{
                                amount: {
                                  value: displayTotalPrice.toFixed(2),
                                  currency_code: 'PHP',
                                },
                              }],
                            });
                          }}
                          onApprove={async (data, actions) => {
                            const details = await actions.order.capture();
                            toast.success('PayPal payment successful!');
                            await handleSubmit();
                            setIsSubmitting(false);
                            setShowPayPal(false);
                          }}
                          onError={(err) => {
                            toast.error('PayPal payment failed: ' + err);
                            setIsSubmitting(false);
                            setShowPayPal(false);
                          }}
                          onCancel={() => {
                            setIsSubmitting(false);
                            setShowPayPal(false);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Listing Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
                {/* Listing Card */}
                <div className="flex gap-4 mb-6">
                  <img
                    src={listingImage}
                    alt={listingTitle}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
                      {listingTitle}
                    </h3>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-medium">★ {listingRating.toFixed(2)}</span>
                      <span className="text-muted-foreground">({listingReviews})</span>
                      {listing.isGuestFavorite && (
                        <span className="ml-2 px-2 py-0.5 bg-pink-100 text-pink-800 text-xs rounded-full">
                          Guest favorite
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cancellation Policy */}
                <div className="mb-6 pb-6 border-b border-border">
                  <p className="text-sm font-medium text-foreground mb-1">Cancellation Policy</p>
                  <p className="text-xs text-muted-foreground">
                    If you cancel your booking, only 50% of the paid amount will be refunded.{' '}
                    <Link to="/guest/policies#cancellation" className="text-primary hover:underline">View cancellation policy</Link>
                  </p>
                </div>

                {/* Dates */}
                <div className="mb-4 pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Dates</p>
                      <p className="text-sm font-medium text-foreground">
                        {checkInDate ? format(new Date(checkInDate), 'MMM d') : ''} – {checkOutDate ? format(new Date(checkOutDate), 'MMM d, yyyy') : ''}
                      </p>
                    </div>
                    <button className="text-sm text-primary hover:underline" onClick={openDatePicker}>Change</button>
                  </div>
                  {showDatePicker && (
                    <div className="my-2">
                      <input type="date" value={pendingCheckIn ? new Date(pendingCheckIn).toISOString().slice(0,10) : ''} onChange={e => setPendingCheckIn(e.target.value)} max={pendingCheckOut ? new Date(pendingCheckOut).toISOString().slice(0,10) : undefined} />
                      <span className="mx-2">to</span>
                      <input type="date" value={pendingCheckOut ? new Date(pendingCheckOut).toISOString().slice(0,10) : ''} onChange={e => setPendingCheckOut(e.target.value)} min={pendingCheckIn ? new Date(pendingCheckIn).toISOString().slice(0,10) : undefined} />
                      <button className="ml-2 text-xs px-2 py-1 bg-primary text-background rounded" onClick={commitDateEdit}>Done</button>
                      {(pendingCheckIn && pendingCheckOut && new Date(pendingCheckOut) <= new Date(pendingCheckIn)) ? (
                        <div className="text-xs text-red-600 mt-2">Check-out date must be after check-in date.</div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Guests */}
                <div className="mb-4 pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Guests</p>
                      <p className="text-sm font-medium text-foreground">
                        {guests || 1} {guests === 1 ? 'adult' : 'adults'}
                      </p>
                    </div>
                    <button className="text-sm text-primary hover:underline" onClick={openGuestPicker}>Change</button>
                  </div>
                  {showGuestPicker && (
                    <div className="my-2">
                      <input type="number" min={1} max={listing?.maxGuests || 10} value={pendingGuests || 1} onChange={e => {
                        const val = Number(e.target.value);
                        if (val > (listing?.maxGuests || 10)) {
                          setPendingGuests(listing?.maxGuests || 10);
                        } else {
                          setPendingGuests(val);
                        }
                      }} />
                      <button className="ml-2 text-xs px-2 py-1 bg-primary text-background rounded" onClick={commitGuestEdit}>Done</button>
                    </div>
                  )}
                </div>

                {/* Price Details */}
                <div className="mb-4 pb-4 border-b border-border space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {nights} {nights === 1 ? 'night' : 'nights'} × ₱{nightlyPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </span>
                    <span className="font-medium text-foreground">
                      ₱{baseBookingAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || displayBasePrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                  {/* Card only shows total in bold black font, no deductions/coupon */}
                  {(() => {
                    let cardNights = 0;
                    if (checkInDate && checkOutDate) {
                      const inDate = new Date(checkInDate);
                      const outDate = new Date(checkOutDate);
                      if (outDate > inDate) {
                        cardNights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
                      }
                    }
                    let cardOriginalListingPrice = 0;
                    if (listing && checkInDate && checkOutDate && cardNights > 0) {
                      const nightlyRate = listing.price || listing.weekdayPrice || 0;
                      cardOriginalListingPrice = nightlyRate * cardNights;
                    }
                    let cardHighestPromo = null;
                    let cardHighestPromoAmount = 0;
                    if (listing && checkInDate && checkOutDate && cardNights > 0) {
                      const promoOptions = [];
                      if (listing.weeklyDiscount && cardNights >= 7) {
                        promoOptions.push({ label: 'Weekly stay discount', amount: Math.round(cardOriginalListingPrice * (listing.weeklyDiscount / 100)) });
                      }
                      if (listing.monthlyDiscount && cardNights >= 28) {
                        promoOptions.push({ label: 'Monthly stay discount', amount: Math.round(cardOriginalListingPrice * (listing.monthlyDiscount / 100)) });
                      }
                      if (listing.earlyBirdDiscount) {
                        promoOptions.push({ label: 'Early bird discount', amount: Math.round(cardOriginalListingPrice * (listing.earlyBirdDiscount / 100)) });
                      }
                      if (listing.lastMinuteDiscount) {
                        promoOptions.push({ label: 'Last minute discount', amount: Math.round(cardOriginalListingPrice * (listing.lastMinuteDiscount / 100)) });
                      }
                      if (promoOptions.length > 0) {
                        cardHighestPromo = promoOptions.reduce((max, curr) => curr.amount > max.amount ? curr : max, promoOptions[0]);
                        cardHighestPromoAmount = cardHighestPromo.amount;
                      }
                    }
                    let cardFinalPrice = cardOriginalListingPrice - (cardHighestPromoAmount || 0) - (couponDiscount || 0);
                    return (
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Total PHP</span>
                        <span className="font-bold text-foreground text-lg">
                          ₱{(Math.max(0, cardFinalPrice)?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00')}
                        </span>
                      </div>
                    );
                  })()}
                  <button 
                    onClick={() => setShowPriceBreakdown(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Price breakdown
                  </button>
                </div>

                {/* Payment Summary */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Due today</span>
                    <span className="font-medium text-foreground">
                      {(() => {
                        let dueNights = 0;
                        if (checkInDate && checkOutDate) {
                          const inDate = new Date(checkInDate);
                          const outDate = new Date(checkOutDate);
                          if (outDate > inDate) {
                            dueNights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
                          }
                        }
                        let dueOriginalListingPrice = 0;
                        if (listing && checkInDate && checkOutDate && dueNights > 0) {
                          const nightlyRate = listing.price || listing.weekdayPrice || 0;
                          dueOriginalListingPrice = nightlyRate * dueNights;
                        }
                        let dueHighestPromo = null;
                        let dueHighestPromoAmount = 0;
                        if (listing && checkInDate && checkOutDate && dueNights > 0) {
                          const promoOptions = [];
                          if (listing.weeklyDiscount && dueNights >= 7) {
                            promoOptions.push({ label: 'Weekly stay discount', amount: Math.round(dueOriginalListingPrice * (listing.weeklyDiscount / 100)) });
                          }
                          if (listing.monthlyDiscount && dueNights >= 28) {
                            promoOptions.push({ label: 'Monthly stay discount', amount: Math.round(dueOriginalListingPrice * (listing.monthlyDiscount / 100)) });
                          }
                          if (listing.earlyBirdDiscount) {
                            promoOptions.push({ label: 'Early bird discount', amount: Math.round(dueOriginalListingPrice * (listing.earlyBirdDiscount / 100)) });
                          }
                          if (listing.lastMinuteDiscount) {
                            promoOptions.push({ label: 'Last minute discount', amount: Math.round(dueOriginalListingPrice * (listing.lastMinuteDiscount / 100)) });
                          }
                          if (promoOptions.length > 0) {
                            dueHighestPromo = promoOptions.reduce((max, curr) => curr.amount > max.amount ? curr : max, promoOptions[0]);
                            dueHighestPromoAmount = dueHighestPromo.amount;
                          }
                        }
                        let dueFinalPrice = dueOriginalListingPrice - (dueHighestPromoAmount || 0) - (couponDiscount || 0);
                        return `₱${(Math.max(0, dueFinalPrice)?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00')}`;
                      })()}
                    </span>
                  </div>
                  {paymentOption === 'later' && chargeDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Charge on {format(chargeDate, 'MMM d')}
                      </span>
                      <span className="font-medium text-foreground">
                        ₱{chargeOnDate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Rare Find Message */}
                {listing.isRareFind && (
                  <div className="flex items-center gap-2 text-sm text-pink-600">
                    <span>💎</span>
                    <span>This is a rare find. {listing.ownerName || 'The host'}'s place is usually booked.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Price Breakdown Modal */}
      {showPriceBreakdown && (() => {
        // Recalculate all values live using current state
        let modalNights = 0;
        if (checkInDate && checkOutDate) {
          const inDate = new Date(checkInDate);
          const outDate = new Date(checkOutDate);
          if (outDate > inDate) {
            modalNights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
          }
        }
        let modalOriginalListingPrice = 0;
        if (listing && checkInDate && checkOutDate && modalNights > 0) {
          const nightlyRate = listing.price || listing.weekdayPrice || 0;
          modalOriginalListingPrice = nightlyRate * modalNights;
        }
        let modalDiscountsApplied = [];
        let modalHighestPromo = null;
        let modalHighestPromoAmount = 0;
        let modalPromoLabel = '';
        if (listing && checkInDate && checkOutDate && modalNights > 0) {
          const promoOptions = [];
          if (listing.weeklyDiscount && modalNights >= 7) {
            promoOptions.push({ label: 'Weekly stay discount', amount: Math.round(modalOriginalListingPrice * (listing.weeklyDiscount / 100)) });
          }
          if (listing.monthlyDiscount && modalNights >= 28) {
            promoOptions.push({ label: 'Monthly stay discount', amount: Math.round(modalOriginalListingPrice * (listing.monthlyDiscount / 100)) });
          }
          if (listing.earlyBirdDiscount) {
            promoOptions.push({ label: 'Early bird discount', amount: Math.round(modalOriginalListingPrice * (listing.earlyBirdDiscount / 100)) });
          }
          if (listing.lastMinuteDiscount) {
            promoOptions.push({ label: 'Last minute discount', amount: Math.round(modalOriginalListingPrice * (listing.lastMinuteDiscount / 100)) });
          }
          if (promoOptions.length > 0) {
            modalHighestPromo = promoOptions.reduce((max, curr) => curr.amount > max.amount ? curr : max, promoOptions[0]);
            modalHighestPromoAmount = modalHighestPromo.amount;
            modalPromoLabel = modalHighestPromo.label;
            modalDiscountsApplied.push({ label: modalPromoLabel, amount: modalHighestPromoAmount });
          }
        }
        let modalFinalPrice = modalOriginalListingPrice - (modalHighestPromoAmount || 0) - (couponDiscount || 0);
        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowPriceBreakdown(false)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPriceBreakdown(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title */}
              <h2 className="text-xl font-semibold text-foreground text-center mb-6">
                Price breakdown
              </h2>

              {/* Content */}
              <div className="space-y-4">
                {/* Booking Details - Original Listing Price */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">
                      {modalNights} {modalNights === 1 ? 'night' : 'nights'} · {checkInDate ? format(new Date(checkInDate), 'MMM d') : ''} – {checkOutDate ? format(new Date(checkOutDate), 'MMM d') : ''}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    ₱{modalOriginalListingPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </div>
                </div>

                {/* Special Promos Deduction */}
                {modalDiscountsApplied && modalDiscountsApplied.length > 0 && modalDiscountsApplied.map((discount, idx) => (
                  <div key={idx} className="flex items-center justify-between text-red-600">
                    <div>
                      <p className="text-sm font-medium">{discount.label}</p>
                    </div>
                    <div className="text-sm font-medium">
                      -₱{discount.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}

                {/* Coupon Discount */}
                {couponCode && couponDiscount > 0 && (
                  <div className="flex items-center justify-between text-red-600">
                    <div>
                      <p className="text-sm font-medium">
                        Coupon discount ({couponCode})
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      -₱{couponDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                )}

                {/* Separator */}
                <div className="border-t border-border my-4"></div>

                {/* Total (after highest promo and coupon) */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Total <span className="underline">PHP</span>
                    </p>
                  </div>
                  <div className="text-base font-semibold text-foreground">
                    ₱{(Math.max(0, modalFinalPrice)?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00')}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Getaways receives a 10% commission from the host's payout, which already includes VAT. This fee is not charged to guests.
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <Footer />
      </div>
    </PayPalScriptProvider>
  );
};

export default BookingRequest;


