import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowLeft, ChevronRight, CreditCard, MessageSquare, User, CheckCircle2, Camera, X, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { createBooking, checkDateConflict } from '@/pages/Guest/services/bookingService';
import { toast } from '@/components/ui/sonner';

const BookingRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;

  // Get booking data from navigation state
  const { 
    listingId, 
    listing, 
    checkInDate, 
    checkOutDate, 
    guests, 
    totalPrice,
    nightlyPrice,
    couponCode,
    couponDiscount
  } = location.state || {};

  const [currentStep, setCurrentStep] = useState(1);
  const [paymentOption, setPaymentOption] = useState('later'); // 'now' or 'later'
  const [paymentMethod, setPaymentMethod] = useState('paypal'); // Default to PayPal
  const [messageToHost, setMessageToHost] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const fileInputRef = useRef(null);
  const [paypalConnected, setPaypalConnected] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [isCheckingPaypal, setIsCheckingPaypal] = useState(true);

  // Calculate charge date (check-in date minus some days, or check-in date if paying later)
  const getChargeDate = () => {
    if (!checkInDate) return null;
    const chargeDate = new Date(checkInDate);
    chargeDate.setDate(chargeDate.getDate() - 14); // 14 days before check-in
    return chargeDate;
  };

  const chargeDate = getChargeDate();

  // Load user profile photo and PayPal connection status on mount
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
  }, []);

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
    // Validate Step 2: PayPal must be connected before proceeding
    if (currentStep === 2 && !paypalConnected) {
      toast.error('Please connect your PayPal account before proceeding');
      return;
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

      // Create booking
      // useWallet: true for "pay now", false for "pay later"
      // Use displayTotalPrice which includes guest fee and coupon discount
      const bookingId = await createBooking({
        listingId: listingId,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        guests: guests || 1,
        totalPrice: displayTotalPrice, // Final total with coupon discount and guest fee
        useWallet: paymentOption === 'now', // Pay now = use wallet, pay later = don't use wallet
        message: messageToHost || undefined,
        couponCode: couponCode || undefined,
        couponDiscount: couponDiscount || 0,
        couponId: location.state?.couponId || undefined
      });

      toast.success('Booking request submitted successfully! The host will be notified.');
      
      // Navigate to bookings page
      navigate('/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error.message || 'Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate nights
  const nights = checkInDate && checkOutDate 
    ? Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24))
    : 0;

  // Calculate base booking amount (nights × nightly price)
  // This is the amount before coupon discount and guest fee
  const calculatedBasePrice = nights && nightlyPrice ? nights * nightlyPrice : 0;
  
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
  let guestFee = 0;
  let finalTotalPrice = 0;
  
  // Calculate prices with coupon discount
  // Note: totalPrice from AccommodationDetail is basePrice - couponDiscount (doesn't include guest fee)
  // So we need to:
  // 1. Get the base booking amount (before coupon)
  // 2. Apply coupon discount
  // 3. Calculate guest fee on discounted booking amount
  // 4. Calculate final total = discounted booking amount + guest fee
  
  if (couponDiscount > 0 && totalPrice) {
    // totalPrice from AccommodationDetail is the discounted base price (basePrice - couponDiscount)
    // Reconstruct original base price
    baseBookingAmount = totalPrice + couponDiscount;
    // Apply coupon discount to get discounted booking amount
    discountedBookingAmount = Math.max(0, baseBookingAmount - couponDiscount);
    // Calculate guest fee on discounted booking amount (14% of discounted amount)
    guestFee = Math.round((discountedBookingAmount * GUEST_FEE_PERCENTAGE) * 100) / 100;
    // Final total = discounted booking amount + guest fee
    finalTotalPrice = Math.round((discountedBookingAmount + guestFee) * 100) / 100;
    
    console.log('💰 BookingRequest: Price calculation with coupon', {
      totalPriceFromDetail: totalPrice,
      couponDiscount: couponDiscount,
      baseBookingAmount: baseBookingAmount,
      discountedBookingAmount: discountedBookingAmount,
      guestFee: guestFee,
      finalTotalPrice: finalTotalPrice
    });
  } else if (totalPrice && totalPrice > 0) {
    // No coupon: totalPrice from AccommodationDetail is the base price (without guest fee)
    baseBookingAmount = totalPrice;
    discountedBookingAmount = baseBookingAmount;
    // Calculate guest fee on base price (14% of base amount)
    guestFee = Math.round((discountedBookingAmount * GUEST_FEE_PERCENTAGE) * 100) / 100;
    // Final total = base booking amount + guest fee
    finalTotalPrice = Math.round((discountedBookingAmount + guestFee) * 100) / 100;
    
    console.log('💰 BookingRequest: Price calculation without coupon', {
      totalPriceFromDetail: totalPrice,
      baseBookingAmount: baseBookingAmount,
      guestFee: guestFee,
      finalTotalPrice: finalTotalPrice
    });
  } else if (calculatedBasePrice > 0) {
    // Use calculated base price if totalPrice not provided
    baseBookingAmount = calculatedBasePrice;
    discountedBookingAmount = baseBookingAmount;
    guestFee = Math.round((discountedBookingAmount * GUEST_FEE_PERCENTAGE) * 100) / 100;
    finalTotalPrice = Math.round((discountedBookingAmount + guestFee) * 100) / 100;
  }
  
  // Use finalTotalPrice for display and booking (includes guest fee and coupon discount)
  const displayTotalPrice = finalTotalPrice || totalPrice || 0;
  const displayBasePrice = discountedBookingAmount || baseBookingAmount || 0;
  const displayServiceFee = guestFee || 0;
  
  // Calculate payment amounts
  const dueToday = paymentOption === 'now' ? displayTotalPrice : 0;
  const chargeOnDate = paymentOption === 'later' ? displayTotalPrice : 0;

  if (!listing || !checkInDate || !checkOutDate) {
    return (
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
    );
  }

  const listingImage = listing.photos?.[0]?.base64 || listing.photos?.[0]?.url || listing.image || 'fallback.jpg';
  const listingTitle = listing.title || 'Untitled Listing';
  const listingRating = listing.rating || 0;
  const listingReviews = listing.reviews?.length || 0;

  return (
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

              {/* Step 1: Choose when to pay */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    1. Choose when to pay
                  </h2>
                  {currentStep > 1 && (
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Change
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {currentStep > 1 && (
                  <div className="text-sm text-muted-foreground">
                    Pay ₱{paymentOption === 'now' ? totalPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00' : '0.00'} now
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <input
                          type="radio"
                          name="payment"
                          value="now"
                          checked={paymentOption === 'now'}
                          onChange={(e) => setPaymentOption(e.target.value)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            Pay ₱{totalPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} now
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <input
                          type="radio"
                          name="payment"
                          value="later"
                          checked={paymentOption === 'later'}
                          onChange={(e) => setPaymentOption(e.target.value)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            Pay ₱0 now
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            ₱{totalPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} charged on {chargeDate ? format(chargeDate, 'MMM d') : 'check-in date'}. No extra fees.{' '}
                            <button className="text-primary hover:underline">More info</button>
                          </div>
                        </div>
                      </label>
                    </div>

                    <button
                      onClick={handleNext}
                      className="w-full bg-foreground text-background py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      Done
                    </button>
                  </div>
                )}
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

                {currentStep > 2 && paymentMethod && (
                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    {paypalConnected ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>PayPal Connected ({paypalEmail})</span>
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
                      Connect your PayPal account to enable payments. You'll be able to review before paying.
                    </p>
                    
                    {/* PayPal Connection Status */}
                    {isCheckingPaypal ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                        <span className="ml-3 text-sm text-muted-foreground">Checking PayPal connection...</span>
                      </div>
                    ) : paypalConnected ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 border-2 border-green-500 rounded-lg bg-green-50">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-green-900">PayPal Account Connected</div>
                            <div className="text-sm text-green-700 mt-1">{paypalEmail}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-center w-10 h-10 rounded bg-[#0070ba]">
                            <span className="text-white font-bold text-sm">P</span>
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-foreground">PayPal</span>
                            <p className="text-xs text-muted-foreground mt-1">
                              Your PayPal account is connected and ready for payments
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleNext}
                          className="w-full bg-foreground text-background py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                          Continue
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 border-2 border-amber-500 rounded-lg bg-amber-50">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-amber-900 mb-1">PayPal Account Not Connected</div>
                            <div className="text-sm text-amber-800">
                              You need to connect your PayPal account before you can proceed with the booking. 
                              This allows you to cash in to your GetPay wallet for payments.
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-muted/30 opacity-60">
                          <div className="flex items-center justify-center w-10 h-10 rounded bg-[#0070ba]">
                            <span className="text-white font-bold text-sm">P</span>
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-foreground">PayPal</span>
                            <p className="text-xs text-muted-foreground mt-1">
                              Connect your PayPal account to enable this payment method
                            </p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => navigate('/accountsettings?tab=profile')}
                          className="w-full bg-[#0070ba] text-white py-3 rounded-lg font-medium hover:bg-[#005ea6] transition-colors flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Connect PayPal Account
                        </button>
                        
                        <button
                          disabled
                          className="w-full bg-muted text-muted-foreground py-3 rounded-lg font-medium cursor-not-allowed opacity-50"
                        >
                          Continue (Connect PayPal to enable)
                        </button>
                        
                        <p className="text-xs text-muted-foreground text-center">
                          After connecting PayPal in Account Settings, return to this page to continue.
                        </p>
                      </div>
                    )}
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
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Nights</span>
                          <span className="font-medium text-foreground">{nights} {nights === 1 ? 'night' : 'nights'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Guests</span>
                          <span className="font-medium text-foreground">{guests || 1} {guests === 1 ? 'guest' : 'guests'}</span>
                        </div>
                      </div>

                      {/* Payment Option */}
                      <div className="space-y-2 pb-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">Payment</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Payment option</span>
                          <span className="font-medium text-foreground">
                            {paymentOption === 'now' ? 'Pay now' : 'Pay later'}
                          </span>
                        </div>
                        {paymentOption === 'now' && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Due today</span>
                            <span className="font-medium text-foreground">
                              ₱{dueToday.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        {paymentOption === 'later' && chargeDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Charge on</span>
                            <span className="font-medium text-foreground">
                              {format(chargeDate, 'MMM d, yyyy')} - ₱{chargeOnDate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Price Breakdown */}
                      <div className="space-y-2 pb-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">Price Summary</h3>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {nights} {nights === 1 ? 'night' : 'nights'} × ₱{nightlyPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </span>
                          <span className="font-medium text-foreground">
                            ₱{baseBookingAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || displayBasePrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </span>
                        </div>
                        {couponCode && couponDiscount > 0 && (
                          <div className="flex items-center justify-between text-sm text-green-600">
                            <span>Coupon discount ({couponCode})</span>
                            <span className="font-medium">
                              -₱{couponDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Service fee</span>
                          <span className="font-medium text-foreground">
                            ₱{displayServiceFee?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="font-semibold text-foreground">Total</span>
                          <span className="font-semibold text-foreground text-lg">
                            ₱{displayTotalPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </span>
                        </div>
                      </div>

                      {/* Message Preview */}
                      {messageToHost && (
                        <div className="space-y-2 pb-4 border-b border-border">
                          <h3 className="font-semibold text-foreground">Message to Host</h3>
                          <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                            {messageToHost}
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="w-full bg-foreground text-background py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Request to book'}
                    </button>
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
                  <p className="text-sm font-medium text-foreground mb-1">Free cancellation</p>
                  <p className="text-xs text-muted-foreground">
                    Cancel before {chargeDate ? format(chargeDate, 'MMM d') : 'check-in date'} for a full refund.{' '}
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
                    <button className="text-sm text-primary hover:underline">Change</button>
                  </div>
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
                    <button className="text-sm text-primary hover:underline">Change</button>
                  </div>
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
                  {couponCode && couponDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-600">
                      <span>Coupon discount ({couponCode})</span>
                      <span className="font-medium">
                        -₱{couponDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Total PHP</span>
                    <span className="font-semibold text-foreground">
                      ₱{displayTotalPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
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
                      ₱{dueToday.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      {showPriceBreakdown && (
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
              {/* Booking Details - Original Base Price */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground font-medium">
                    {nights} {nights === 1 ? 'night' : 'nights'} · {checkInDate ? format(new Date(checkInDate), 'MMM d') : ''} – {checkOutDate ? format(new Date(checkOutDate), 'MMM d') : ''}
                  </p>
                </div>
                <div className="text-sm font-medium text-foreground">
                  ₱{baseBookingAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </div>
              </div>

              {/* Coupon Discount */}
              {couponCode && couponDiscount > 0 && (
                <div className="flex items-center justify-between text-green-600">
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

              {/* Service Fee - Calculated on discounted booking amount */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-foreground font-medium">
                    Service fee
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This includes VAT.
                  </p>
                </div>
                <div className="text-sm font-medium text-foreground">
                  ₱{displayServiceFee?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-border my-4"></div>

              {/* Total */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Total <span className="underline">PHP</span>
                  </p>
                </div>
                <div className="text-base font-semibold text-foreground">
                  ₱{displayTotalPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default BookingRequest;


