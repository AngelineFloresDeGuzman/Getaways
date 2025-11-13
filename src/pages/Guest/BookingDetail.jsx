import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { cancelBooking } from '@/pages/Guest/services/bookingService';
import { startConversationFromHost } from '@/pages/Guest/services/messagingService';
import { createReview, getReviewByBookingId } from '@/pages/Guest/services/reviewService';
import { format } from 'date-fns';
import ReviewModal from '@/components/ReviewModal';
import { 
  ArrowLeft, Calendar, MapPin, Users, MessageSquare, 
  CreditCard, CheckCircle, XCircle, Clock, User,
  AlertCircle, Home, DollarSign, Phone, Mail, 
  Building2, FileText
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import LogIn from '@/pages/Auth/LogIn';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

// PayPal Client ID
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
const HAS_VALID_PAYPAL_CLIENT_ID = PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== 'test' && PAYPAL_CLIENT_ID.length > 10;

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [listing, setListing] = useState(null);
  const [guestInfo, setGuestInfo] = useState(null);
  const [hostInfo, setHostInfo] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [processingPayPal, setProcessingPayPal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setShowLoginModal(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!id || !user) return;

    const loadBooking = async () => {
      try {
        setLoading(true);
        const bookingRef = doc(db, 'bookings', id);
        const bookingDoc = await getDoc(bookingRef);

        if (!bookingDoc.exists()) {
          toast.error('Booking not found');
          navigate('/bookings');
          return;
        }

        const bookingData = bookingDoc.data();

        // Check if user has access to this booking
        const isGuest = bookingData.guestId === user.uid;
        const isHost = bookingData.ownerId === user.uid;

        if (!isGuest && !isHost) {
          toast.error('You do not have access to this booking');
          navigate('/bookings');
          return;
        }

        // Set booking data
        const bookingObj = {
          id: bookingDoc.id,
          ...bookingData,
          checkInDate: bookingData.checkInDate?.toDate ? bookingData.checkInDate.toDate() : new Date(bookingData.checkInDate),
          checkOutDate: bookingData.checkOutDate?.toDate ? bookingData.checkOutDate.toDate() : new Date(bookingData.checkOutDate),
          createdAt: bookingData.createdAt?.toDate ? bookingData.createdAt.toDate() : new Date(bookingData.createdAt),
          cancelledAt: bookingData.cancelledAt?.toDate ? bookingData.cancelledAt.toDate() : null,
          paypalPaymentDeadline: bookingData.paypalPaymentDeadline ? new Date(bookingData.paypalPaymentDeadline) : null,
        };
        setBooking(bookingObj);

        // Check if PayPal payment deadline has passed
        if (
          bookingObj.status === 'confirmed' &&
          bookingObj.paymentStatus === 'pending' &&
          (bookingObj.paymentProvider === 'paypal' || bookingObj.paymentMethod === 'paypal') &&
          bookingObj.paypalPaymentDeadline
        ) {
          const now = new Date();
          const deadline = bookingObj.paypalPaymentDeadline;
          
          if (now > deadline) {
            // Deadline has passed, auto-cancel the booking
            console.log('⏰ PayPal payment deadline expired. Auto-cancelling booking...');
            // Call async function without await (fire and forget)
            handleAutoCancelExpiredBooking(bookingDoc.id).catch(err => {
              console.error('Error auto-cancelling expired booking:', err);
            });
            setIsExpired(true);
          }
        }

        // Load listing
        if (bookingData.listingId) {
          const listingRef = doc(db, 'listings', bookingData.listingId);
          const listingDoc = await getDoc(listingRef);
          if (listingDoc.exists()) {
            setListing({ id: listingDoc.id, ...listingDoc.data() });
          }
        }

        // Load guest info
        if (bookingData.guestId) {
          const guestRef = doc(db, 'users', bookingData.guestId);
          const guestDoc = await getDoc(guestRef);
          if (guestDoc.exists()) {
            const guestData = guestDoc.data();
            setGuestInfo({
              id: guestDoc.id,
              name: `${guestData.firstName || ''} ${guestData.lastName || ''}`.trim() || guestData.email || 'Unknown',
              email: guestData.email,
              ...guestData
            });
          }
        }

        // Load host info
        if (bookingData.ownerId) {
          const hostRef = doc(db, 'users', bookingData.ownerId);
          const hostDoc = await getDoc(hostRef);
          if (hostDoc.exists()) {
            const hostData = hostDoc.data();
            setHostInfo({
              id: hostDoc.id,
              name: `${hostData.firstName || ''} ${hostData.lastName || ''}`.trim() || hostData.email || 'Unknown',
              email: hostData.email,
              ...hostData
            });
          }
        }

        // Set up real-time listener
        const unsubscribe = onSnapshot(bookingRef, (snapshot) => {
          if (snapshot.exists()) {
            const updatedData = snapshot.data();
            const updatedBookingObj = {
              id: snapshot.id,
              ...updatedData,
              checkInDate: updatedData.checkInDate?.toDate ? updatedData.checkInDate.toDate() : new Date(updatedData.checkInDate),
              checkOutDate: updatedData.checkOutDate?.toDate ? updatedData.checkOutDate.toDate() : new Date(updatedData.checkOutDate),
              createdAt: updatedData.createdAt?.toDate ? updatedData.createdAt.toDate() : new Date(updatedData.createdAt),
              cancelledAt: updatedData.cancelledAt?.toDate ? updatedData.cancelledAt.toDate() : null,
              paypalPaymentDeadline: updatedData.paypalPaymentDeadline ? new Date(updatedData.paypalPaymentDeadline) : null,
            };
            setBooking(updatedBookingObj);

            // Check if PayPal payment deadline has passed
            if (
              updatedBookingObj.status === 'confirmed' &&
              updatedBookingObj.paymentStatus === 'pending' &&
              (updatedBookingObj.paymentProvider === 'paypal' || updatedBookingObj.paymentMethod === 'paypal') &&
              updatedBookingObj.paypalPaymentDeadline
            ) {
              const now = new Date();
              const deadline = updatedBookingObj.paypalPaymentDeadline;
              
              if (now > deadline) {
                // Deadline has passed, auto-cancel the booking
                console.log('⏰ PayPal payment deadline expired. Auto-cancelling booking...');
                // Call async function without await (fire and forget)
                handleAutoCancelExpiredBooking(snapshot.id).catch(err => {
                  console.error('Error auto-cancelling expired booking:', err);
                });
                setIsExpired(true);
              }
            }
          }
        });

        setLoading(false);
        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading booking:', error);
        toast.error('Failed to load booking details');
        setLoading(false);
      }
    };

    loadBooking();
  }, [id, user, navigate]);

  // Update countdown timer for PayPal payment deadline
  useEffect(() => {
    if (
      !booking ||
      booking.status !== 'confirmed' ||
      booking.paymentStatus !== 'pending' ||
      !(booking.paymentProvider === 'paypal' || booking.paymentMethod === 'paypal') ||
      !booking.paypalPaymentDeadline ||
      isExpired
    ) {
      setTimeRemaining(null);
      return;
    }

    let cancelled = false;

    const updateCountdown = () => {
      if (cancelled) return;
      
      const now = new Date();
      const deadline = booking.paypalPaymentDeadline;
      const diff = deadline - now;

      if (diff <= 0) {
        // Deadline has passed
        setIsExpired(true);
        setTimeRemaining(null);
        handleAutoCancelExpiredBooking(booking.id);
        return;
      }

      // Calculate time remaining
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({
        hours,
        minutes,
        seconds,
        total: diff
      });
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [booking?.id, booking?.status, booking?.paymentStatus, booking?.paymentProvider, booking?.paymentMethod, booking?.paypalPaymentDeadline, isExpired]);

  // Auto-cancel expired PayPal bookings
  const handleAutoCancelExpiredBooking = async (bookingId) => {
    try {
      const result = await cancelBooking(bookingId);
      if (result.success) {
        toast.error('Your booking was automatically cancelled because PayPal payment was not completed within 24 hours.');
        console.log('✅ Expired booking auto-cancelled:', bookingId);
      } else {
        console.error('Failed to auto-cancel expired booking:', result.message);
      }
    } catch (error) {
      console.error('Error auto-cancelling expired booking:', error);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    if (cancellingBooking) return;

    const isPaid = booking.paymentStatus === 'paid' || (booking.totalPrice && booking.totalPrice > 0);
    let confirmMessage = '';
    
    if (!isPaid) {
      confirmMessage = `Cancel this booking? No refund will be processed as payment was not completed.`;
    } else {
      const refundAmount = booking.status === 'pending' 
        ? (booking.totalPrice || 0)
        : Math.round(((booking.totalPrice || 0) / 2) * 100) / 100;
      confirmMessage = booking.status === 'pending'
        ? `Cancel this booking? A full refund of ₱${refundAmount.toLocaleString()} will be requested and processed by admin.`
        : `Cancel this booking? A half refund of ₱${refundAmount.toLocaleString()} will be requested and processed by admin.`;
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setCancellingBooking(true);
    try {
      const result = await cancelBooking(booking.id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(error.message || 'Failed to cancel booking');
    } finally {
      setCancellingBooking(false);
    }
  };

  const handleUpdateBookingStatus = async (newStatus) => {
    if (!booking || updatingStatus) return;

    setUpdatingStatus(true);
    try {
      const { updateDoc: updateFirestoreDoc, getDoc: getFirestoreDoc, serverTimestamp } = await import('firebase/firestore');
      const bookingRef = doc(db, 'bookings', booking.id);
      
      // Get booking data before updating to check if status is changing to 'confirmed'
      const bookingDoc = await getFirestoreDoc(bookingRef);
      const bookingData = bookingDoc.data();
      const previousStatus = bookingData.status;
      
      // If host is confirming the booking, process payment now
      if (newStatus === 'confirmed' && previousStatus === 'pending') {
        try {
          const { 
            deductFromWallet, 
            initializeWallet, 
            hasSufficientBalance,
            addToWallet: addToAdminWallet,
            initializeWallet: initAdminWallet,
            getAdminUserId
          } = await import('@/pages/Common/services/getpayService');
          
          const guestId = bookingData.guestId;
          const totalAmount = bookingData.totalPrice || 0;
          const bookingAmount = bookingData.bookingAmount || 0;
          const guestFee = bookingData.guestFee || 0;
          let remainingAmount = bookingData.remainingAmount || totalAmount;
          let pointsUsed = bookingData.pointsUsed || 0;
          const listingTitle = bookingData.listingTitle || 'Accommodation';
          
          // Process points payment first (if points were planned to be used)
          if (pointsUsed > 0) {
            try {
              const { deductPointsForPayment } = await import('@/pages/Host/services/pointsService');
              const pointsResult = await deductPointsForPayment(
                guestId,
                totalAmount,
                'booking',
                {
                  bookingId: booking.id,
                  listingId: bookingData.listingId,
                  listingTitle: listingTitle
                }
              );
              
              if (pointsResult.success) {
                const actualPointsUsed = pointsResult.pointsUsed;
                const currencyFromPoints = pointsResult.currencyAmount;
                remainingAmount = Math.max(0, totalAmount - currencyFromPoints);
                pointsUsed = actualPointsUsed;
                console.log(`✅ Points deducted: ${actualPointsUsed} points (₱${currencyFromPoints.toFixed(2)})`);
              } else {
                // Points deduction failed, need full wallet payment
                remainingAmount = totalAmount;
                pointsUsed = 0;
                console.warn('⚠️ Points deduction failed, will use wallet payment');
              }
            } catch (pointsError) {
              console.error('Error deducting points:', pointsError);
              // If points fail, use wallet for full amount
              remainingAmount = totalAmount;
              pointsUsed = 0;
            }
          }
          
          // Initialize guest wallet
          await initializeWallet(guestId);
          
          // Check if guest still has sufficient balance for remaining amount
          if (remainingAmount > 0) {
            const hasBalance = await hasSufficientBalance(guestId, remainingAmount);
            if (!hasBalance) {
              toast.error('Guest has insufficient balance. Cannot confirm booking.');
              setUpdatingStatus(false);
              return;
            }
            
            // Deduct remaining amount from guest's wallet
            await deductFromWallet(
              guestId,
              remainingAmount,
              `Booking Payment - ${listingTitle}${pointsUsed > 0 ? ' (Partial - remaining after points)' : ''}`,
              {
                bookingId: booking.id,
                listingId: bookingData.listingId,
                listingTitle: listingTitle,
                category: bookingData.category || 'accommodation',
                checkInDate: bookingData.checkInDate?.toDate ? bookingData.checkInDate.toDate().toISOString() : bookingData.checkInDate,
                checkOutDate: bookingData.checkOutDate?.toDate ? bookingData.checkOutDate.toDate().toISOString() : bookingData.checkOutDate,
                guests: bookingData.guests || 1,
                bookingAmount: bookingAmount,
                guestFee: guestFee,
                pointsUsed: pointsUsed > 0 ? pointsUsed : null
              }
            );
            console.log(`✅ Payment deducted from guest wallet: ₱${remainingAmount.toFixed(2)}`);
          }
          
          // Transfer payment to admin's GetPay wallet
          const adminUserId = await getAdminUserId();
          if (adminUserId) {
            await initAdminWallet(adminUserId);
            await addToAdminWallet(
              adminUserId,
              totalAmount,
              `Payment Received - Guest Booking`,
              {
                bookingId: booking.id,
                listingId: bookingData.listingId,
                listingTitle: listingTitle,
                category: bookingData.category || 'accommodation',
                guestId: guestId,
                guestEmail: bookingData.guestEmail,
                hostId: bookingData.ownerId,
                paymentType: 'booking_payment',
                bookingAmount: bookingAmount,
                guestFee: guestFee,
                checkInDate: bookingData.checkInDate?.toDate ? bookingData.checkInDate.toDate().toISOString() : bookingData.checkInDate,
                checkOutDate: bookingData.checkOutDate?.toDate ? bookingData.checkOutDate.toDate().toISOString() : bookingData.checkOutDate
              }
            );
            console.log('✅ Payment sent to admin GetPay wallet');
          }
          
          // Update booking with payment status
          await updateFirestoreDoc(bookingRef, {
            status: newStatus,
            paymentStatus: 'paid',
            paymentMethod: bookingData.paymentMethod || 'wallet',
            updatedAt: serverTimestamp()
          });
        } catch (paymentError) {
          console.error('❌ Error processing payment on booking confirmation:', paymentError);
          toast.error('Failed to process payment. Booking confirmation cancelled.');
          setUpdatingStatus(false);
          return; // Don't update status if payment fails
        }
      } else {
        // For other status changes, just update the status
        await updateFirestoreDoc(bookingRef, {
          status: newStatus,
          updatedAt: serverTimestamp()
        });
      }
      
      toast.success(`Booking ${newStatus}`);
    } catch (error) {
      console.error('❌ Error updating booking status:', error);
      toast.error('Failed to update booking status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleMessageGuest = async () => {
    if (!booking || !booking.guestId) return;
    
    try {
      const conversationId = await startConversationFromHost(
        booking.guestId,
        booking.listingId,
        booking.id
      );
      navigate(`/host/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (!user) {
    return (
      <>
        <Navigation />
        <LogIn isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-36 pb-20 px-4 max-w-7xl mx-auto">
          <Loading message="Loading booking details..." />
        </main>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-36 pb-20 px-4 max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">Booking not found</p>
            <button onClick={() => navigate('/bookings')} className="btn-primary mt-4">
              Back to Bookings
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isGuest = booking.guestId === user.uid;
  const nights = Math.ceil((booking.checkOutDate - booking.checkInDate) / (1000 * 60 * 60 * 24));
  const listingImage = listing?.photos?.[0]?.base64 || listing?.photos?.[0]?.url || listing?.mainImage || '/placeholder-image.jpg';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-36 pb-20 px-4 max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/bookings')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bookings
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Status */}
            <div className="card-listing p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-heading font-bold text-foreground">Booking Details</h1>
                <span className={`px-4 py-2 rounded-lg border font-medium capitalize ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>

              {/* Listing Info */}
              {listing && (
                <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-start gap-4">
                    <img
                      src={listingImage}
                      alt={listing.title}
                      className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => navigate(`/${booking.category}s/${listing.id}`)}
                      onError={(e) => {
                        e.target.src = '/placeholder-image.jpg';
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h2 className="font-semibold text-lg text-foreground">{listing.title}</h2>
                        <button
                          onClick={() => navigate(`/${booking.category}s/${listing.id}`)}
                          className="btn-outline text-sm px-3 py-1.5 flex items-center gap-2 hover:bg-primary hover:text-white transition-colors"
                          title="View Listing"
                        >
                          <Home className="w-4 h-4" />
                          View Listing
                        </button>
                      </div>
                      {listing.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                          <MapPin className="w-4 h-4" />
                          {listing.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">Check-in</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {format(booking.checkInDate, 'EEEE, MMMM dd, yyyy')}
                  </p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">Check-out</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {format(booking.checkOutDate, 'EEEE, MMMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {/* Guests */}
              <div className="p-4 border border-border rounded-lg mb-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Guests</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {booking.guests || 1} guest{(booking.guests || 1) > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {nights} night{nights !== 1 ? 's' : ''} stay
                </p>
              </div>

              {/* Guest/Host Info */}
              <div className="p-4 border border-border rounded-lg mb-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{isGuest ? 'Host' : 'Guest'} Information</span>
                </div>
                {isGuest && hostInfo && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-4">
                      {hostInfo.profileImage && (
                        <img
                          src={hostInfo.profileImage}
                          alt={hostInfo.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-border"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-lg text-foreground">{hostInfo.name}</p>
                        <div className="space-y-1 mt-2">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {hostInfo.email}
                          </p>
                          {hostInfo.phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {hostInfo.phoneCountryCode || ''}{hostInfo.phone}
                            </p>
                          )}
                          {hostInfo.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {hostInfo.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {!isGuest && guestInfo && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-4">
                      {guestInfo.profileImage && (
                        <img
                          src={guestInfo.profileImage}
                          alt={guestInfo.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-border"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-lg text-foreground">{guestInfo.name}</p>
                        <div className="space-y-1 mt-2">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {guestInfo.email}
                          </p>
                          {guestInfo.phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {guestInfo.phoneCountryCode || ''}{guestInfo.phone}
                            </p>
                          )}
                          {guestInfo.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {guestInfo.location}
                            </p>
                          )}
                          {guestInfo.residentialAddress && (
                            <p className="text-sm text-muted-foreground flex items-start gap-2">
                              <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>{guestInfo.residentialAddress}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {guestInfo.bio && (
                      <div className="pt-3 border-t border-border">
                        <p className="text-sm text-muted-foreground mb-1 font-medium">About Guest</p>
                        <p className="text-sm text-foreground">{guestInfo.bio}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Message to Host / Special Requests */}
              {booking.message && (
                <div className="p-4 border border-border rounded-lg mb-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">{isGuest ? 'Message to Host' : 'Guest Message / Special Requests'}</span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap">{booking.message}</p>
                </div>
              )}

              {/* Cancellation Info */}
              {booking.status === 'cancelled' && booking.cancelledAt && (
                <div className="p-4 border border-red-200 bg-red-50 rounded-lg mb-6">
                  <div className="flex items-center gap-2 text-red-700 mb-2">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Cancelled</span>
                  </div>
                  <p className="text-sm text-red-600">
                    Cancelled on {format(booking.cancelledAt, 'MMMM dd, yyyy')}
                  </p>
                  {booking.refundPending && (
                    <p className="text-sm text-red-600 mt-2">
                      Refund pending: ₱{(booking.refundAmount || 0).toLocaleString()}
                    </p>
                  )}
                  {booking.refundProcessed && (
                    <p className="text-sm text-green-600 mt-2">
                      Refund processed: ₱{(booking.refundAmount || 0).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Breakdown */}
            <div className="card-listing p-6">
              <h2 className="font-heading text-xl font-bold text-foreground mb-4">Price Breakdown</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Price</span>
                  <span className="font-semibold">₱{(booking.bookingAmount || booking.totalPrice || 0).toLocaleString()}</span>
                </div>
                {booking.couponDiscount && booking.couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span className="font-semibold">-₱{booking.couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                {booking.guestFee && booking.guestFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span className="font-semibold">₱{booking.guestFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-lg text-foreground">₱{(booking.totalPrice || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            <div className="card-listing p-6">
              <h2 className="font-heading text-xl font-bold text-foreground mb-4">Payment Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    booking.paymentStatus === 'paid' 
                      ? 'bg-green-100 text-green-700' 
                      : booking.paymentStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {booking.paymentStatus || 'Pending'}
                  </span>
                </div>
                {booking.paymentMethod && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-semibold capitalize">{booking.paymentMethod}</span>
                  </div>
                )}
                {booking.pointsUsed && booking.pointsUsed > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Points Used</span>
                    <span className="font-semibold">{booking.pointsUsed}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Guest Actions */}
            {isGuest && (booking.status === 'pending' || booking.status === 'confirmed') && (
              <div className="card-listing p-6">
                <h2 className="font-heading text-xl font-bold text-foreground mb-4">Actions</h2>
                <div className="space-y-3">
                  {/* PayPal Payment Button - Show when booking is confirmed but payment is pending */}
                  {booking.status === 'confirmed' && 
                   booking.paymentStatus === 'pending' && 
                   (booking.paymentProvider === 'paypal' || booking.paymentMethod === 'paypal') && 
                   HAS_VALID_PAYPAL_CLIENT_ID && (
                    <div className={`mb-4 p-4 border rounded-lg ${
                      isExpired || (timeRemaining && timeRemaining.total < 3600000) // Less than 1 hour
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    }`}>
                      <p className={`text-sm font-semibold mb-2 ${
                        isExpired || (timeRemaining && timeRemaining.total < 3600000)
                          ? 'text-red-800 dark:text-red-200'
                          : 'text-amber-800 dark:text-amber-200'
                      }`}>
                        {isExpired ? 'Payment Deadline Expired' : 'Complete PayPal Payment'}
                      </p>
                      {isExpired ? (
                        <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                          Your booking has been automatically cancelled because payment was not completed within 24 hours.
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                            Your booking has been confirmed by the host. Please complete your PayPal payment to finalize the booking.
                          </p>
                          {timeRemaining && (
                            <div className="mb-3 p-2 bg-white dark:bg-gray-800 rounded border border-amber-300 dark:border-amber-700">
                              <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">
                                ⏰ Payment Deadline:
                              </p>
                              <p className={`text-sm font-bold ${
                                timeRemaining.total < 3600000 // Less than 1 hour
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-amber-700 dark:text-amber-300'
                              }`}>
                                {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s remaining
                              </p>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Booking will be automatically cancelled if payment is not completed within 24 hours.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      {!isExpired && (
                        <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'PHP' }}>
                          <PayPalButtons
                            style={{ layout: 'vertical' }}
                            createOrder={(data, actions) => {
                              return actions.order.create({
                                purchase_units: [{
                                  amount: {
                                    value: (booking.totalPrice || 0).toFixed(2),
                                    currency_code: 'PHP',
                                  },
                                  description: `Booking Payment - ${listing?.title || 'Accommodation'}`
                                }],
                              });
                            }}
                          onApprove={async (data, actions) => {
                            try {
                              setProcessingPayPal(true);
                              const details = await actions.order.capture();
                              console.log('✅ PayPal payment captured:', details);
                              
                              // Update booking with PayPal payment details
                              const { updateDoc: updateFirestoreDoc, serverTimestamp } = await import('firebase/firestore');
                              const bookingRef = doc(db, 'bookings', booking.id);
                              const paypalOrderId = details.id;
                              const paypalTransactionId = details.purchase_units?.[0]?.payments?.captures?.[0]?.id;
                              
                              await updateFirestoreDoc(bookingRef, {
                                paymentStatus: 'paid',
                                paymentMethod: 'paypal',
                                paypalOrderId: paypalOrderId,
                                paypalTransactionId: paypalTransactionId,
                                paypalPaymentDeadline: null, // Clear deadline since payment is completed
                                updatedAt: serverTimestamp()
                              });
                              
                              // Transfer payment to admin's GetPay wallet
                              const { 
                                addToWallet: addToAdminWallet,
                                initializeWallet: initAdminWallet,
                                getAdminUserId
                              } = await import('@/pages/Common/services/getpayService');
                              
                              const adminUserId = await getAdminUserId();
                              if (adminUserId) {
                                await initAdminWallet(adminUserId);
                                await addToAdminWallet(
                                  adminUserId,
                                  booking.totalPrice || 0,
                                  `Payment Received - Guest Booking (PayPal)`,
                                  {
                                    bookingId: booking.id,
                                    listingId: booking.listingId,
                                    listingTitle: listing?.title || 'Accommodation',
                                    category: booking.category || 'accommodation',
                                    guestId: booking.guestId,
                                    guestEmail: booking.guestEmail,
                                    hostId: booking.ownerId,
                                    paymentType: 'booking_payment',
                                    paymentMethod: 'paypal',
                                    paypalOrderId: paypalOrderId,
                                    paypalTransactionId: paypalTransactionId,
                                    bookingAmount: booking.bookingAmount || 0,
                                    guestFee: booking.guestFee || 0,
                                    checkInDate: booking.checkInDate?.toISOString ? booking.checkInDate.toISOString() : booking.checkInDate,
                                    checkOutDate: booking.checkOutDate?.toISOString ? booking.checkOutDate.toISOString() : booking.checkOutDate
                                  }
                                );
                                console.log('✅ PayPal payment sent to admin GetPay wallet');
                              }
                              
                              toast.success('PayPal payment completed successfully!');
                              setProcessingPayPal(false);
                              
                              // Reload booking data
                              const bookingDoc = await getDoc(bookingRef);
                              if (bookingDoc.exists()) {
                                const bookingData = bookingDoc.data();
                                setBooking({
                                  id: bookingDoc.id,
                                  ...bookingData,
                                  checkInDate: bookingData.checkInDate?.toDate ? bookingData.checkInDate.toDate() : new Date(bookingData.checkInDate),
                                  checkOutDate: bookingData.checkOutDate?.toDate ? bookingData.checkOutDate.toDate() : new Date(bookingData.checkOutDate),
                                  createdAt: bookingData.createdAt?.toDate ? bookingData.createdAt.toDate() : new Date(bookingData.createdAt),
                                  cancelledAt: bookingData.cancelledAt?.toDate ? bookingData.cancelledAt.toDate() : null,
                                });
                              }
                            } catch (err) {
                              console.error('PayPal payment error:', err);
                              toast.error('PayPal payment failed: ' + (err?.message || 'Unknown error'));
                              setProcessingPayPal(false);
                            }
                          }}
                          onError={(err) => {
                            console.error('PayPal error:', err);
                            toast.error('PayPal payment failed: ' + (err?.message || 'Unknown error'));
                            setProcessingPayPal(false);
                          }}
                          onCancel={() => {
                            console.log('PayPal payment cancelled');
                            setProcessingPayPal(false);
                          }}
                        />
                      </PayPalScriptProvider>
                      )}
                    </div>
                  )}
                  
                  {/* Regular actions */}
                  {listing && (
                    <button
                      onClick={() => navigate(`/${booking.category}s/${listing.id}`)}
                      className="btn-outline w-full flex items-center justify-center gap-2"
                    >
                      <Home className="w-4 h-4" />
                      View Listing
                    </button>
                  )}
                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <button
                      onClick={handleCancelBooking}
                      disabled={cancellingBooking}
                      className="btn-outline w-full text-red-600 border-red-600 hover:bg-red-50"
                    >
                      {cancellingBooking ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Host Actions */}
            {!isGuest && (
              <div className="card-listing p-6">
                <h2 className="font-heading text-xl font-bold text-foreground mb-4">Actions</h2>
                <div className="space-y-3">
                  {booking.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateBookingStatus('confirmed')}
                        disabled={updatingStatus}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        {updatingStatus ? (
                          <>
                            <Clock className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Confirm Booking
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleUpdateBookingStatus('cancelled')}
                        disabled={updatingStatus}
                        className="btn-outline w-full text-red-600 border-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Decline Booking
                      </button>
                    </>
                  )}
                  {booking.status === 'confirmed' && (
                    <button
                      onClick={async () => {
                        if (!booking) return;
                        setUpdatingStatus(true);
                        try {
                          const { updateDoc: updateFirestoreDoc, getDoc: getFirestoreDoc, serverTimestamp } = await import('firebase/firestore');
                          const bookingRef = doc(db, 'bookings', booking.id);
                          const bookingDoc = await getFirestoreDoc(bookingRef);
                          
                          if (!bookingDoc.exists()) {
                            toast.error('Booking not found');
                            return;
                          }
                          
                          const bookingData = bookingDoc.data();
                          
                          // Update booking status and create earnings release request for admin
                          await updateFirestoreDoc(bookingRef, {
                            status: 'completed',
                            earningsReleasePending: true, // Mark as pending for admin to release
                            earningsRequestedAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                          });
                          
                          toast.success('Booking marked as completed! Host earnings will be released by admin.');
                          
                          // Reload booking to show updated status
                          const updatedDoc = await getFirestoreDoc(bookingRef);
                          if (updatedDoc.exists()) {
                            const updatedData = updatedDoc.data();
                            setBooking({
                              id: updatedDoc.id,
                              ...updatedData,
                              checkInDate: updatedData.checkInDate?.toDate ? updatedData.checkInDate.toDate() : new Date(updatedData.checkInDate),
                              checkOutDate: updatedData.checkOutDate?.toDate ? updatedData.checkOutDate.toDate() : new Date(updatedData.checkOutDate),
                              createdAt: updatedData.createdAt?.toDate ? updatedData.createdAt.toDate() : new Date(updatedData.createdAt),
                              cancelledAt: updatedData.cancelledAt?.toDate ? updatedData.cancelledAt.toDate() : null,
                              paypalPaymentDeadline: updatedData.paypalPaymentDeadline ? new Date(updatedData.paypalPaymentDeadline) : null,
                            });
                          }
                          
                          // Show review modal after marking as completed
                          setSelectedBooking(booking);
                          setShowReviewModal(true);
                        } catch (error) {
                          console.error('Error marking booking as completed:', error);
                          toast.error('Failed to mark booking as completed');
                        } finally {
                          setUpdatingStatus(false);
                        }
                      }}
                      disabled={updatingStatus}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {updatingStatus ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Mark as Completed
                        </>
                      )}
                    </button>
                  )}
                  {booking.guestId && (
                    <button
                      onClick={handleMessageGuest}
                      className="btn-outline w-full flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message Guest
                    </button>
                  )}
                  {listing && (
                    <button
                      onClick={() => navigate(`/${booking.category}s/${listing.id}`)}
                      className="btn-outline w-full flex items-center justify-center gap-2"
                    >
                      <Home className="w-4 h-4" />
                      View Listing
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Booking Info */}
            <div className="card-listing p-6">
              <h2 className="font-heading text-xl font-bold text-foreground mb-4">Booking Information</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID</span>
                  <span className="font-mono text-xs">{booking.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(booking.createdAt, 'MMM dd, yyyy')}</span>
                </div>
                {booking.category && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="capitalize">{booking.category}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      {showReviewModal && selectedBooking && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedBooking(null);
          }}
          listingId={selectedBooking.listingId}
          listingTitle={selectedBooking.listingTitle}
          bookingId={selectedBooking.id}
          onSubmit={async (reviewData) => {
            await createReview(reviewData);
            toast.success('Review submitted successfully!');
            setShowReviewModal(false);
            setSelectedBooking(null);
            // Reload booking to update reviewed status
            if (booking) {
              const bookingRef = doc(db, 'bookings', booking.id);
              const bookingDoc = await getDoc(bookingRef);
              if (bookingDoc.exists()) {
                const bookingData = bookingDoc.data();
                setBooking({
                  id: bookingDoc.id,
                  ...bookingData,
                  checkInDate: bookingData.checkInDate?.toDate ? bookingData.checkInDate.toDate() : new Date(bookingData.checkInDate),
                  checkOutDate: bookingData.checkOutDate?.toDate ? bookingData.checkOutDate.toDate() : new Date(bookingData.checkOutDate),
                  createdAt: bookingData.createdAt?.toDate ? bookingData.createdAt.toDate() : new Date(bookingData.createdAt),
                  cancelledAt: bookingData.cancelledAt?.toDate ? bookingData.cancelledAt.toDate() : null,
                  paypalPaymentDeadline: bookingData.paypalPaymentDeadline ? new Date(bookingData.paypalPaymentDeadline) : null,
                });
              }
            }
          }}
        />
      )}
    </div>
  );
};

export default BookingDetail;

