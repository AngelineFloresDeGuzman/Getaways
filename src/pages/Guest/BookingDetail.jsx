import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { cancelBooking } from '@/pages/Guest/services/bookingService';
import { format } from 'date-fns';
import { 
  ArrowLeft, Calendar, MapPin, Users, MessageSquare, 
  CreditCard, CheckCircle, XCircle, Clock, User,
  AlertCircle, Home, DollarSign
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import LogIn from '@/pages/Auth/LogIn';

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
        setBooking({
          id: bookingDoc.id,
          ...bookingData,
          checkInDate: bookingData.checkInDate?.toDate ? bookingData.checkInDate.toDate() : new Date(bookingData.checkInDate),
          checkOutDate: bookingData.checkOutDate?.toDate ? bookingData.checkOutDate.toDate() : new Date(bookingData.checkOutDate),
          createdAt: bookingData.createdAt?.toDate ? bookingData.createdAt.toDate() : new Date(bookingData.createdAt),
          cancelledAt: bookingData.cancelledAt?.toDate ? bookingData.cancelledAt.toDate() : null,
        });

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
            setBooking({
              id: snapshot.id,
              ...updatedData,
              checkInDate: updatedData.checkInDate?.toDate ? updatedData.checkInDate.toDate() : new Date(updatedData.checkInDate),
              checkOutDate: updatedData.checkOutDate?.toDate ? updatedData.checkOutDate.toDate() : new Date(updatedData.checkOutDate),
              createdAt: updatedData.createdAt?.toDate ? updatedData.createdAt.toDate() : new Date(updatedData.createdAt),
              cancelledAt: updatedData.cancelledAt?.toDate ? updatedData.cancelledAt.toDate() : null,
            });
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
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{isGuest ? 'Host' : 'Guest'} Information</span>
                </div>
                {isGuest && hostInfo && (
                  <div>
                    <p className="font-semibold text-foreground">{hostInfo.name}</p>
                    <p className="text-sm text-muted-foreground">{hostInfo.email}</p>
                  </div>
                )}
                {!isGuest && guestInfo && (
                  <div>
                    <p className="font-semibold text-foreground">{guestInfo.name}</p>
                    <p className="text-sm text-muted-foreground">{guestInfo.email}</p>
                  </div>
                )}
              </div>

              {/* Message to Host */}
              {booking.message && (
                <div className="p-4 border border-border rounded-lg mb-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm font-medium">Message</span>
                  </div>
                  <p className="text-foreground">{booking.message}</p>
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

            {/* Actions */}
            {isGuest && (booking.status === 'pending' || booking.status === 'confirmed') && booking.paymentStatus === 'paid' && (
              <div className="card-listing p-6">
                <h2 className="font-heading text-xl font-bold text-foreground mb-4">Actions</h2>
                <div className="space-y-3">
                  {listing && (
                    <button
                      onClick={() => navigate(`/${booking.category}s/${listing.id}`)}
                      className="btn-outline w-full flex items-center justify-center gap-2"
                    >
                      <Home className="w-4 h-4" />
                      View Listing
                    </button>
                  )}
                  <button
                    onClick={handleCancelBooking}
                    disabled={cancellingBooking}
                    className="btn-outline w-full text-red-600 border-red-600 hover:bg-red-50"
                  >
                    {cancellingBooking ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                </div>
              </div>
            )}

            {/* View Listing Button for Hosts */}
            {!isGuest && listing && (
              <div className="card-listing p-6">
                <h2 className="font-heading text-xl font-bold text-foreground mb-4">Actions</h2>
                <button
                  onClick={() => navigate(`/${booking.category}s/${listing.id}`)}
                  className="btn-outline w-full flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  View Listing
                </button>
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
    </div>
  );
};

export default BookingDetail;

