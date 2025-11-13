import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { calculateTotalPrice } from '@/pages/Guest/services/bookingService';
import Footer from '@/components/Footer';
import { ArrowLeft, ChevronRight, ChevronLeft, CreditCard, MessageSquare, User, CheckCircle2, Camera, X, CheckCircle, AlertCircle, ExternalLink, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';
import { createBooking, checkDateConflict, getUnavailableDates } from '@/pages/Guest/services/bookingService';
import { Calendar } from '@/components/ui/calendar';
import { toast } from '@/components/ui/sonner';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { getWalletBalance, hasSufficientBalance, initializeWallet, deductFromWallet } from '@/pages/Common/services/getpayService';

// PayPal Client ID - defined outside component to avoid re-creation
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
const HAS_VALID_PAYPAL_CLIENT_ID = PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== 'test' && PAYPAL_CLIENT_ID.length > 10;

// Wrapper component to conditionally include PayPalScriptProvider - defined outside to prevent re-creation
const ContentWrapper = ({ children }) => {
  if (HAS_VALID_PAYPAL_CLIENT_ID) {
    return (
      <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'PHP' }}>
        {children}
      </PayPalScriptProvider>
    );
  }
  return <>{children}</>;
};

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

  // Helper function to format date for date input (YYYY-MM-DD) without timezone issues
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    // Otherwise, parse and format using local date to avoid timezone shifts
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to convert date string to Date object without timezone issues
  const stringToDate = (dateString) => {
    if (!dateString) return undefined;
    // If it's already a Date object, return it
    if (dateString instanceof Date) return dateString;
    // If it's in YYYY-MM-DD format, parse it as local date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    // Otherwise, parse normally
    return new Date(dateString);
  };

  // When opening pickers, set pending values to current
  const openDatePicker = () => {
    setPendingCheckIn(checkInDate);
    setPendingCheckOut(checkOutDate);
    // Set default month to show the check-in date month, or current month if no check-in date
    if (checkInDate) {
      const checkInDateObj = stringToDate(checkInDate);
      if (checkInDateObj) {
        setDefaultMonth(checkInDateObj);
      }
    } else {
      setDefaultMonth(new Date());
    }
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
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [defaultMonth, setDefaultMonth] = useState(new Date());

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
    couponDiscount,
    category = 'accommodation', // Default to accommodation for backward compatibility
    selectedTime,
    experienceDate
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

  // Sync pending dates when main dates change (but only if date picker is not open)
  useEffect(() => {
    if (!showDatePicker) {
      setPendingCheckIn(checkInDate);
      setPendingCheckOut(checkOutDate);
    }
  }, [checkInDate, checkOutDate, showDatePicker]);

  // Load unavailable dates when listing is available
  useEffect(() => {
    if (!listingId) return;

    const loadUnavailableDates = async () => {
      try {
        console.log('📅 Loading unavailable dates for listing:', listingId);
        const dates = await getUnavailableDates(listingId);
        console.log('📅 Loaded unavailable dates:', dates.length, 'dates');
        setUnavailableDates(dates);
      } catch (error) {
        console.error('❌ Error loading unavailable dates:', error);
        setUnavailableDates([]);
      }
    };
    
    // Initial load
    loadUnavailableDates();
    
    // Set up real-time listener for bookings on this listing
    let unsubscribe;
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('listingId', '==', listingId)
      );

      unsubscribe = onSnapshot(
        bookingsQuery,
        async () => {
          // Reload unavailable dates when bookings change
          const dates = await getUnavailableDates(listingId);
          setUnavailableDates(dates);
        },
        (error) => {
          console.error('Error listening to bookings:', error);
        }
      );
    } catch (error) {
      console.error('Error setting up bookings listener:', error);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [listingId]);

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

  const handleSubmit = async (paypalOrderId = null, paypalTransactionId = null) => {
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

      // Convert date strings to Date objects and normalize to midnight for accurate comparison
      const checkInDateObj = stringToDate(checkInDate);
      const checkOutDateObj = stringToDate(checkOutDate);
      
      if (!checkInDateObj || !checkOutDateObj) {
        toast.error('Invalid dates selected');
        setIsSubmitting(false);
        return;
      }
      
      // Normalize to midnight to avoid timezone issues
      checkInDateObj.setHours(0, 0, 0, 0);
      checkOutDateObj.setHours(0, 0, 0, 0);

      // Double-check for conflicts
      console.log('🔍 Checking date conflict:', {
        listingId,
        checkIn: checkInDateObj.toISOString().split('T')[0],
        checkOut: checkOutDateObj.toISOString().split('T')[0],
        checkInDateString: checkInDate,
        checkOutDateString: checkOutDate
      });
      
      const hasConflict = await checkDateConflict(listingId, checkInDateObj, checkOutDateObj);
      if (hasConflict) {
        console.error('❌ Date conflict detected for dates:', {
          checkIn: checkInDateObj.toISOString().split('T')[0],
          checkOut: checkOutDateObj.toISOString().split('T')[0]
        });
        toast.error('Selected dates are not available. Please choose different dates.');
        setIsSubmitting(false);
        return;
      }
      
      console.log('✅ No date conflict, proceeding with booking');

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
          // Check if PayPal is properly configured
          if (!HAS_VALID_PAYPAL_CLIENT_ID) {
            toast.error('PayPal is not configured. Please use GetPay wallet or configure PayPal.');
            setIsSubmitting(false);
            return;
          }
          
          // For PayPal, payment will NOT be processed here
          // Payment will only be processed when host confirms the booking (same as GetPay wallet)
          // Just verify PayPal account is connected
          if (!paypalConnected) {
            toast.error('Please connect your PayPal account before proceeding');
            setIsSubmitting(false);
            return;
          }
          
          console.log('✅ PayPal payment method selected - payment will be processed when host confirms');
        }
      }
      
      // Create booking
      // useWallet: true for "pay now" with GetPay, false for PayPal or "pay later"
      // For both GetPay and PayPal, payment will only be processed when host confirms
      // Pass exact pricing breakdown to ensure accuracy
      const bookingId = await createBooking({
        listingId: listingId,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        guests: guests || 1,
        totalPrice: displayTotalPrice, // Final total (discountedBookingAmount + guestFee)
        bookingAmount: displayBasePrice, // Base booking amount after coupon discount (before guest fee)
        guestFee: calculatedGuestFee, // Guest fee calculated on discounted amount
        useWallet: paymentOption === 'now' && paymentProvider === 'getpay', // Pay now with GetPay = use wallet (but payment still happens on host confirmation)
        paymentProvider: paymentProvider, // 'getpay' or 'paypal'
        paymentMethod: paymentProvider === 'getpay' ? 'wallet' : 'paypal',
        message: messageToHost || undefined,
        couponCode: couponCode || undefined,
        couponDiscount: couponDiscount || 0,
        couponId: location.state?.couponId || undefined,
        paypalOrderId: paypalOrderId || undefined, // PayPal order ID if payment was authorized
        paypalTransactionId: paypalTransactionId || undefined // PayPal transaction ID if payment was captured
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

  // Calculate nights (for accommodations) or participants (for experiences)
  const isExperience = category === 'experience';
  
  let nights = 0;
  let dateError = '';
  if (checkInDate && checkOutDate) {
    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);
    if (isExperience) {
      // For experiences, check-in and check-out are the same day (check-out is next day for booking system)
      nights = 1; // Single day experience
    } else {
      if (outDate <= inDate) {
        dateError = 'Check-out date must be after check-in date.';
      } else {
        nights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
      }
    }
  }

  // Calculate original listing price (before any discounts/coupons)
  let originalListingPrice = 0;
  if (listing && checkInDate && checkOutDate) {
    if (isExperience) {
      // For experiences: price per person × number of participants
      const pricePerGuest = listing.pricePerGuest || listing.price || 0;
      originalListingPrice = pricePerGuest * (guests || 1);
    } else {
      // For accommodations: nightly rate × number of nights
      if (nights > 0) {
        const nightlyRate = listing.price || listing.weekdayPrice || 0;
        originalListingPrice = nightlyRate * nights;
      }
    }
  }



  // Calculate base booking amount
  // Apply only the highest promo and one coupon
  let discountsApplied = [];
  let highestPromo = null;
  let highestPromoAmount = 0;
  let promoLabel = '';
  if (listing && checkInDate && checkOutDate && originalListingPrice > 0) {
    const promoOptions = [];
    if (isExperience) {
      // Experience discounts (if any)
      // For now, experiences don't have the same discount structure, but we can add them later
    } else {
      // Accommodation discounts
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
    }
    // Find highest promo
    if (promoOptions.length > 0) {
      highestPromo = promoOptions.reduce((max, curr) => curr.amount > max.amount ? curr : max, promoOptions[0]);
      highestPromoAmount = highestPromo.amount;
      promoLabel = highestPromo.label;
      discountsApplied.push({ label: promoLabel, amount: highestPromoAmount });
    }
  }
  
  // This is the amount before coupon discount and guest fee
  // Use calculateTotalPrice for accommodations, or calculate directly for experiences
  const calculatedBasePrice = (checkInDate && checkOutDate && listing)
    ? (isExperience 
        ? (listing.pricePerGuest || listing.price || 0) * (guests || 1)
        : calculateTotalPrice(listing.pricing, checkInDate, checkOutDate, guests))
    : 0;
  
  // Guest fee percentage (14% like Airbnb-style service fee)
  const GUEST_FEE_PERCENTAGE = 0.14;
  
  // Calculate prices with coupon discount
  // 1. Get the base booking amount (before coupon) - use calculatedBasePrice or totalPrice from state
  // 2. Apply coupon discount
  // 3. Calculate guest fee on discounted booking amount
  // 4. Calculate final total = discounted booking amount + guest fee
  
  // If totalPrice from state exists, it might already include discounts but not guest fee
  // Otherwise, use calculatedBasePrice
  let baseBookingAmount = 0;
  let discountedBookingAmount = 0;
  let calculatedGuestFee = 0;
  let finalTotalPrice = 0;

  // Determine base booking amount
  // Always use calculatedBasePrice to ensure consistency with listing pricing
  // totalPrice from state is just for reference/display, but we recalculate to ensure accuracy
  if (calculatedBasePrice > 0) {
    baseBookingAmount = calculatedBasePrice;
    // Apply coupon discount if any
    discountedBookingAmount = Math.max(0, baseBookingAmount - (couponDiscount || 0));
  } else if (typeof totalPrice === 'number' && totalPrice > 0) {
    // Fallback: if calculatedBasePrice is 0, use totalPrice from state
    // Assume it doesn't include guest fee (it's the base booking amount)
    baseBookingAmount = totalPrice;
    discountedBookingAmount = Math.max(0, baseBookingAmount - (couponDiscount || 0));
  }

  // Calculate guest fee on the discounted booking amount
  calculatedGuestFee = Math.round((discountedBookingAmount * GUEST_FEE_PERCENTAGE) * 100) / 100;
  
  // Final total = discounted booking amount + guest fee
  finalTotalPrice = Math.round((discountedBookingAmount + calculatedGuestFee) * 100) / 100;

  // Use finalTotalPrice for display and booking (includes guest fee)
  const displayTotalPrice = finalTotalPrice;
  const displayBasePrice = discountedBookingAmount;
  
  // Calculate payment amounts
  const dueToday = paymentOption === 'now' ? displayTotalPrice : 0;
  const chargeOnDate = paymentOption === 'later' ? displayTotalPrice : 0;

  if (!listing || !checkInDate || !checkOutDate) {
    return (
      <ContentWrapper>
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
      </ContentWrapper>
    );
  }

  const listingImage = listing.photos?.[0]?.base64 || listing.photos?.[0]?.url || listing.image || 'fallback.jpg';
  const listingTitle = listing.title || 'Untitled Listing';
  const listingRating = listing.rating || 0;
  const listingReviews = listing.reviews?.length || 0;

  return (
    <ContentWrapper>
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
                    3. Write a message to the host <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
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

                {currentStep > 3 && (
                  <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {messageToHost || 'No message provided'}
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Let {listing.ownerName || 'the host'} know a little about your trip and why their place is a good fit. This step is optional.
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
                        className="px-6 py-2 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity"
                      >
                        {messageToHost.trim() ? 'Next' : 'Skip'}
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
                          <span className="text-muted-foreground">{isExperience ? 'Date' : 'Dates'}</span>
                          <span className="font-medium text-foreground">
                            {checkInDate ? format(new Date(checkInDate), 'MMM d, yyyy') : ''}
                            {!isExperience && checkOutDate && ` – ${format(new Date(checkOutDate), 'MMM d, yyyy')}`}
                          </span>
                        </div>
                        {!isExperience && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Nights</span>
                            <span className="font-medium text-foreground">{nights} {nights === 1 ? 'night' : 'nights'}</span>
                          </div>
                        )}
                        {selectedTime && isExperience && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Time</span>
                            <span className="font-medium text-foreground capitalize">{selectedTime}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{isExperience ? 'Participants' : 'Guests'}</span>
                          <span className="font-medium text-foreground">
                            {guests || 1} {isExperience ? (guests === 1 ? 'participant' : 'participants') : (guests === 1 ? 'guest' : 'guests')}
                          </span>
                        </div>
                      </div>

                      {/* Payment Option - MATCHES SIDE CARD */}
                      <div className="space-y-2 pb-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">Payment required to book</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Total PHP</span>
                          <span className="font-semibold text-foreground text-lg">
                            ₱{(displayTotalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            ₱{(paymentOption === 'now' ? displayTotalPrice : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Price Breakdown - MATCHES SIDE CARD */}
                      <div className="space-y-2 pb-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">Price Summary</h3>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {isExperience 
                              ? `${guests || 1} ${guests === 1 ? 'person' : 'people'} × ₱${(listing && (listing.pricePerGuest || listing.price) ? (listing.pricePerGuest || listing.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00')}`
                              : (() => {
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
                            {isExperience
                              ? `₱${originalListingPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : (() => {
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
                        {calculatedGuestFee > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Service Fee (14%)</span>
                            <span className="font-medium text-foreground">
                              ₱{calculatedGuestFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="font-semibold text-foreground">Total</span>
                          <span className="font-semibold text-foreground text-lg">
                            ₱{(displayTotalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Platform receives 10% from host payout (not charged to guest).
                        </div>
                      </div>

                    </div>

                    {/* Submit Button or PayPal Button - Only show in final review step (step 5) */}
                    {currentStep === 5 && (
                      <div className="mt-6">
                        {paymentProvider === 'paypal' && paypalConnected && !HAS_VALID_PAYPAL_CLIENT_ID && (
                          <div className="text-center py-4 px-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
                            <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold mb-1">
                              PayPal is not configured
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              Please set VITE_PAYPAL_CLIENT_ID in your .env file to use PayPal payment
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                              Or switch to GetPay wallet payment method
                            </p>
                          </div>
                        )}
                        
                        {/* For PayPal, just create booking without payment - payment happens when host confirms */}
                        {paymentProvider === 'paypal' && paypalConnected && HAS_VALID_PAYPAL_CLIENT_ID && (
                          <div className="text-center py-4 px-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
                            <p className="text-sm text-blue-800 dark:text-blue-200 font-semibold mb-1">
                              PayPal Payment Method Selected
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              Your PayPal account will be charged when the host confirms your booking request.
                            </p>
                          </div>
                        )}
                        
                        {/* Submit button for all payment methods */}
                        {!showPayPal && (
                          <button
                            onClick={async () => {
                              setIsSubmitting(true);
                              await handleSubmit();
                              setIsSubmitting(false);
                            }}
                            disabled={isSubmitting}
                            className="w-full bg-primary text-background py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? 'Submitting...' : 'Request to book'}
                          </button>
                        )}
                      </div>
                    )}
                    {showPayPal && paymentProvider === 'paypal' && paypalConnected && !HAS_VALID_PAYPAL_CLIENT_ID && (
                      <div className="text-center py-4 px-4 bg-primary/10 border border-primary/30 rounded-lg mt-6">
                        <p className="text-sm text-primary font-semibold mb-1">
                          PayPal is not configured
                        </p>
                        <p className="text-xs text-primary/90">
                          Please set VITE_PAYPAL_CLIENT_ID in your .env file
                        </p>
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
                      <p className="text-sm text-muted-foreground">{isExperience ? 'Date' : 'Dates'}</p>
                      <p className="text-sm font-medium text-foreground">
                        {checkInDate ? format(new Date(checkInDate), 'MMM d, yyyy') : ''}
                        {!isExperience && checkOutDate && ` – ${format(new Date(checkOutDate), 'MMM d, yyyy')}`}
                      </p>
                      {selectedTime && isExperience && (
                        <p className="text-xs text-muted-foreground capitalize mt-1">{selectedTime}</p>
                      )}
                    </div>
                    <button className="text-sm text-primary hover:underline" onClick={openDatePicker}>Change</button>
                  </div>
                  {showDatePicker && (
                    <div className="my-4 p-4 bg-gray-50 rounded-lg border border-gray-200 max-w-full overflow-x-auto">
                      <Calendar
                        mode="range"
                        selected={{
                          from: stringToDate(pendingCheckIn),
                          to: stringToDate(pendingCheckOut)
                        }}
                        onSelect={(range) => {
                          if (!range) {
                            setPendingCheckIn('');
                            setPendingCheckOut('');
                            return;
                          }
                          if (range?.from) {
                            const year = range.from.getFullYear();
                            const month = String(range.from.getMonth() + 1).padStart(2, '0');
                            const day = String(range.from.getDate()).padStart(2, '0');
                            setPendingCheckIn(`${year}-${month}-${day}`);
                            // Update default month to show the selected month
                            setDefaultMonth(range.from);
                          }
                          if (range?.to) {
                            const year = range.to.getFullYear();
                            const month = String(range.to.getMonth() + 1).padStart(2, '0');
                            const day = String(range.to.getDate()).padStart(2, '0');
                            setPendingCheckOut(`${year}-${month}-${day}`);
                          } else if (range?.from && !range?.to) {
                            setPendingCheckOut('');
                          }
                        }}
                        numberOfMonths={1}
                        showOutsideDays={true}
                        defaultMonth={defaultMonth}
                        fromDate={new Date()}
                        className="w-full"
                        classNames={{
                          months: "flex flex-col space-y-4 justify-center",
                          month: "space-y-4",
                          caption: "flex justify-between items-center pt-2 relative mb-4",
                          caption_label: "text-base font-semibold text-gray-900 flex-1 text-center",
                          nav: "flex items-center",
                          nav_button: "h-7 w-7 bg-transparent border-0 p-0 opacity-70 hover:opacity-100 hover:bg-gray-100 rounded-md transition-all flex items-center justify-center text-gray-700 hover:text-gray-900",
                          nav_button_previous: "",
                          nav_button_next: "",
                          table: "w-full border-collapse space-y-2",
                          head_row: "flex mb-2",
                          head_cell: "text-gray-600 rounded-md w-9 h-9 font-medium text-xs flex items-center justify-center",
                          row: "flex w-full mt-1",
                          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                          day: "h-9 w-9 p-0 font-normal rounded-md hover:bg-gray-100 transition-colors aria-selected:opacity-100 text-xs",
                          day_range_end: "day-range-end rounded-r-md",
                          day_selected: "!bg-blue-500 !text-white hover:!bg-blue-600 hover:!text-white focus:!bg-blue-500 focus:!text-white font-semibold",
                          day_today: "bg-blue-50 text-blue-700 font-semibold border-2 border-blue-500",
                          day_outside: "day-outside text-gray-400 opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                          day_disabled: "!bg-amber-200 !text-amber-800 !opacity-75 !cursor-not-allowed hover:!bg-amber-200 !font-medium !border !border-amber-400 !line-through",
                          day_unavailable: "!bg-red-600 !text-white !line-through !opacity-100 !cursor-not-allowed hover:!bg-red-700 hover:!text-white !font-bold !border-2 !border-red-800 !shadow-lg !relative !z-10",
                          day_range_middle: "aria-selected:!bg-blue-200 aria-selected:!text-blue-900 rounded-none",
                          day_hidden: "invisible"
                        }}
                        modifiers={{
                          unavailable: unavailableDates.map(d => {
                            let dateObj;
                            if (d instanceof Date) {
                              dateObj = new Date(d);
                            } else {
                              dateObj = new Date(d);
                            }
                            dateObj.setHours(0, 0, 0, 0);
                            return dateObj;
                          })
                        }}
                        components={{
                          IconLeft: () => <ChevronLeft className="h-5 w-5 text-gray-700" />,
                          IconRight: () => <ChevronRight className="h-5 w-5 text-gray-700" />
                        }}
                        disabled={(date) => {
                          const dateToCheck = new Date(date);
                          dateToCheck.setHours(0, 0, 0, 0);
                          
                          const year = dateToCheck.getFullYear();
                          const month = String(dateToCheck.getMonth() + 1).padStart(2, '0');
                          const day = String(dateToCheck.getDate()).padStart(2, '0');
                          const dateStr = `${year}-${month}-${day}`;
                          
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const isPast = dateToCheck < today;
                          
                          let isUnavailable = false;
                          if (unavailableDates.length > 0) {
                            isUnavailable = unavailableDates.some((unavailableDate) => {
                              try {
                                let unavailableDateObj;
                                if (unavailableDate instanceof Date) {
                                  unavailableDateObj = new Date(unavailableDate);
                                } else if (typeof unavailableDate === 'string') {
                                  unavailableDateObj = new Date(unavailableDate);
                                } else {
                                  unavailableDateObj = new Date(unavailableDate);
                                }
                                unavailableDateObj.setHours(0, 0, 0, 0);
                                
                                const unavailableYear = unavailableDateObj.getFullYear();
                                const unavailableMonth = String(unavailableDateObj.getMonth() + 1).padStart(2, '0');
                                const unavailableDay = String(unavailableDateObj.getDate()).padStart(2, '0');
                                const unavailableStr = `${unavailableYear}-${unavailableMonth}-${unavailableDay}`;
                                
                                return dateStr === unavailableStr;
                              } catch (error) {
                                console.warn('Error comparing unavailable date:', error);
                                return false;
                              }
                            });
                          }
                          
                          return isPast || isUnavailable;
                        }}
                        modifiersClassNames={{
                          unavailable: "!bg-red-600 !text-white !line-through !opacity-100 !cursor-not-allowed hover:!bg-red-700 hover:!text-white !font-bold !border-2 !border-red-800 !shadow-lg !relative !z-20",
                          selected: "!bg-blue-500 !text-white hover:!bg-blue-600 !font-semibold",
                          range_middle: "!bg-blue-200 !text-blue-900",
                          today: "bg-blue-50 text-blue-700 border-2 border-blue-500"
                        }}
                      />
                      <div className="flex justify-end gap-2 mt-4">
                        <button 
                          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100" 
                          onClick={() => setShowDatePicker(false)}
                        >
                          Cancel
                        </button>
                        <button 
                          className="px-4 py-2 text-sm bg-primary text-background rounded-lg hover:opacity-90" 
                          onClick={commitDateEdit}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Guests/Participants */}
                <div className="mb-4 pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{isExperience ? 'Participants' : 'Guests'}</p>
                      <p className="text-sm font-medium text-foreground">
                        {guests || 1} {isExperience ? (guests === 1 ? 'participant' : 'participants') : (guests === 1 ? 'adult' : 'adults')}
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
                      {isExperience
                        ? `${guests || 1} ${guests === 1 ? 'person' : 'people'} × ₱${(listing?.pricePerGuest || listing?.price || nightlyPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `${nights} ${nights === 1 ? 'night' : 'nights'} × ₱${nightlyPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
                    </span>
                    <span className="font-medium text-foreground">
                      ₱{baseBookingAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || displayBasePrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                  {/* Card only shows total in bold black font, no deductions/coupon */}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Total PHP</span>
                    <span className="font-bold text-foreground text-lg">
                      ₱{(displayTotalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
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
                      ₱{(paymentOption === 'now' ? displayTotalPrice : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {paymentOption === 'later' && chargeDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Charge on {format(chargeDate, 'MMM d')}
                      </span>
                      <span className="font-medium text-foreground">
                        ₱{displayTotalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        // Use the already-calculated values instead of recalculating
        const modalBookingAmount = displayBasePrice || 0;
        const modalGuestFee = calculatedGuestFee || 0;
        const modalTotalPrice = displayTotalPrice || 0;
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

                {/* Booking Amount After Discounts */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">Subtotal</p>
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    ₱{modalBookingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Service Fee */}
                {modalGuestFee > 0 && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-medium">Service Fee (14%)</p>
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      ₱{modalGuestFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                )}

                {/* Separator */}
                <div className="border-t border-border my-4"></div>

                {/* Total (includes guest fee) */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Total <span className="underline">PHP</span>
                    </p>
                  </div>
                  <div className="text-base font-semibold text-foreground">
                    ₱{modalTotalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
    </ContentWrapper>
  );
};

export default BookingRequest;


