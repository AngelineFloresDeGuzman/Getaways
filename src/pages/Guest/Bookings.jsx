import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Loading from "@/components/Loading";
import { Calendar, MapPin, Users, MessageSquare, Star, Home, ExternalLink } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot, collection, query, where, updateDoc, serverTimestamp } from "firebase/firestore";
import { getGuestBookings, cancelBooking } from "@/pages/Guest/services/bookingService";
import { createReview, getReviewByBookingId } from "@/pages/Guest/services/reviewService";
import { format } from "date-fns";
import LogIn from "@/pages/Auth/LogIn";
import ReviewModal from "@/components/ReviewModal";
import { toast } from "@/components/ui/sonner";
import Recommendations from "@/components/Recommendations";

const Bookings = () => {
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [completingBooking, setCompletingBooking] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const navigate = useNavigate();

  // Handle marking booking as completed
  const handleMarkCompleted = async (bookingId) => {
    if (completingBooking === bookingId) return;
    
    setCompletingBooking(bookingId);
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        toast.error('Booking not found');
        return;
      }
      
      const bookingData = bookingDoc.data();
      
      // Calculate earnings for host (bookingAmount, admin keeps 10% commission)
      const bookingAmount = bookingData.bookingAmount || 0;
      const totalPrice = bookingData.totalPrice || 0;
      
      // Update booking status and create earnings release request for admin
      await updateDoc(bookingRef, {
        status: 'completed',
        earningsReleasePending: true, // Mark as pending for admin to release
        earningsRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      toast.success('Booking marked as completed! Host earnings will be released by admin.');
    } catch (error) {
      console.error('Error marking booking as completed:', error);
      toast.error('Failed to mark booking as completed');
    } finally {
      setCompletingBooking(null);
    }
  };

  // Handle cancelling booking
  const handleCancelBooking = async (booking) => {
    if (cancellingBooking === booking.id) return;
    
    // Check if booking was paid (has paymentStatus === 'paid' or has totalPrice > 0)
    const isPaid = booking.paymentStatus === 'paid' || (booking.totalPrice && booking.totalPrice > 0);
    
    // Confirm cancellation with appropriate message
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
    
    setCancellingBooking(booking.id);
    try {
      const result = await cancelBooking(booking.id);
      if (result.success) {
        toast.success(result.message);
        // Booking status will be updated via real-time listener
      } else {
        toast.error(result.message || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(error.message || 'Failed to cancel booking');
    } finally {
      setCancellingBooking(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setShowLoginModal(true);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load bookings when user is available
  useEffect(() => {
    const loadBookings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const guestBookings = await getGuestBookings(user.uid);

        // Fetch listing details and review status for each booking
        const bookingsWithDetails = await Promise.all(
          guestBookings.map(async (booking) => {
            try {
              const listingRef = doc(db, 'listings', booking.listingId);
              const listingSnap = await getDoc(listingRef);
              
              // Check if review exists for this booking
              const existingReview = await getReviewByBookingId(booking.id);
              
              if (listingSnap.exists()) {
                const listingData = listingSnap.data();
                const photos = listingData.photos || [];
                const locationData = listingData.locationData || {};
                
                return {
                  ...booking,
                  listingTitle: listingData.title || 'Unknown Listing',
                  listingLocation: listingData.location || 
                    (locationData.city && locationData.province 
                      ? `${locationData.city}, ${locationData.province}`
                      : locationData.city || locationData.country || 'Unknown Location'),
                  listingImage: photos[0]?.base64 || photos[0]?.url || null,
                  category: listingData.category || booking.category || 'accommodation',
                  reviewed: !!existingReview || booking.reviewed || false
                };
              } else {
                return {
                  ...booking,
                  listingTitle: 'Listing not found',
                  listingLocation: 'Unknown',
                  listingImage: null,
                  category: booking.category || 'accommodation',
                  reviewed: !!existingReview || booking.reviewed || false
                };
              }
            } catch (error) {
              console.error('Error loading listing for booking:', error);
              return {
                ...booking,
                listingTitle: 'Error loading listing',
                listingLocation: 'Unknown',
                listingImage: null,
                category: booking.category || 'accommodation',
                reviewed: booking.reviewed || false
              };
            }
          })
        );

        setBookings(bookingsWithDetails);
      } catch (error) {
        console.error('Error loading bookings:', error);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();

    // Set up real-time listener for booking updates (to catch status changes when host confirms)
    if (user) {
      try {
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('guestId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(
          bookingsQuery,
          async (snapshot) => {
            console.log('📦 Bookings snapshot update - docs:', snapshot.docs.length);
            const updatedBookings = [];
            for (const docSnap of snapshot.docs) {
              const bookingData = docSnap.data();
              console.log('📦 Processing booking:', docSnap.id, 'Status:', bookingData.status, 'PaymentStatus:', bookingData.paymentStatus, 'TotalPrice:', bookingData.totalPrice);
              try {
                const listingRef = doc(db, 'listings', bookingData.listingId);
                const listingSnap = await getDoc(listingRef);
                
                if (listingSnap.exists()) {
                  const listingData = listingSnap.data();
                  const photos = listingData.photos || [];
                  const locationData = listingData.locationData || {};
                  
                  // Check if review exists
                  const existingReview = await getReviewByBookingId(docSnap.id);
                  
                  updatedBookings.push({
                    id: docSnap.id,
                    ...bookingData,
                    checkInDate: bookingData.checkInDate?.toDate ? bookingData.checkInDate.toDate() : new Date(bookingData.checkInDate),
                    checkOutDate: bookingData.checkOutDate?.toDate ? bookingData.checkOutDate.toDate() : new Date(bookingData.checkOutDate),
                    createdAt: bookingData.createdAt?.toDate ? bookingData.createdAt.toDate() : new Date(bookingData.createdAt),
                    listingTitle: listingData.title || 'Unknown Listing',
                    listingLocation: listingData.location || 
                      (locationData.city && locationData.province 
                        ? `${locationData.city}, ${locationData.province}`
                        : locationData.city || locationData.country || 'Unknown Location'),
                    listingImage: photos[0]?.base64 || photos[0]?.url || null,
                    category: listingData.category || bookingData.category || 'accommodation',
                    reviewed: !!existingReview || bookingData.reviewed || false
                  });
                }
              } catch (error) {
                console.error('❌ Error loading listing:', error);
              }
            }
            // Sort by createdAt descending
            updatedBookings.sort((a, b) => {
              const aDate = a.createdAt || new Date(0);
              const bDate = b.createdAt || new Date(0);
              return bDate - aDate;
            });
            console.log('✅ Updated bookings count:', updatedBookings.length);
            setBookings(updatedBookings);
          },
          (error) => {
            console.error('❌ Error in bookings snapshot:', error);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up bookings listener:', error);
      }
    }
  }, [user]);

  // Categorize bookings
  const now = new Date();
  const upcomingBookings = bookings.filter(b => {
    if (b.status === 'cancelled') return false;
    const checkIn = b.checkInDate;
    return checkIn >= now && b.status !== 'completed';
  });

  const pastBookings = bookings.filter(b => {
    const checkOut = b.checkOutDate;
    return checkOut < now || b.status === 'completed';
  });

  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'completed':
        return 'bg-blue-500 text-white';
      case 'cancelled':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
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
          <Loading message="Loading your bookings..." />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-36 pb-20 px-4 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold mb-2">Your Bookings</h1>
          <p className="text-muted-foreground">Manage and view all your reservations</p>
        </div>

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-heading font-semibold mb-6">Upcoming</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="card-listing hover-lift cursor-pointer" onClick={() => navigate(`/bookings/${booking.id}`)}>
                  <div className="relative w-full overflow-hidden rounded-t-2xl aspect-[4/3]">
                    {booking.listingImage ? (
                      <img
                        src={booking.listingImage}
                        alt={booking.listingTitle}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <Calendar className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full capitalize text-gray-600">{booking.category}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/${booking.category}s/${booking.listingId}`);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        title="View Listing"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </button>
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-foreground mb-1 line-clamp-1">{booking.listingTitle}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                      <MapPin className="w-3 h-3" /> {booking.listingLocation}
                    </p>
                    
                    <div className="space-y-2 mb-3 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-primary" />
                        <span>{format(booking.checkInDate, 'MMM dd')} - {format(booking.checkOutDate, 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-primary" />
                        <span>{booking.guests || 1} guest{(booking.guests || 1) > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold text-foreground">₱{(booking.totalPrice || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                      {booking.status === 'pending' && (
                          <>
                            <button
                              className="btn-outline text-xs px-3 py-1.5 text-red-600 border-red-600 hover:bg-red-50 whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelBooking(booking);
                              }}
                              disabled={cancellingBooking === booking.id}
                            >
                              {cancellingBooking === booking.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                        <span className="text-xs text-yellow-600">Pending</span>
                          </>
                      )}
                      {booking.status === 'confirmed' && (
                          <>
                            <button
                              className="btn-outline text-xs px-3 py-1.5 text-red-600 border-red-600 hover:bg-red-50 whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelBooking(booking);
                              }}
                              disabled={cancellingBooking === booking.id}
                            >
                              {cancellingBooking === booking.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                        <span className="text-xs text-green-600">✓ Confirmed</span>
                          </>
                      )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-heading font-semibold mb-6">Past Bookings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastBookings.map((booking) => (
                <div key={booking.id} className="card-listing hover-lift cursor-pointer" onClick={() => navigate(`/bookings/${booking.id}`)}>
                  <div className="relative w-full overflow-hidden rounded-t-2xl aspect-[4/3]">
                    {booking.listingImage ? (
                      <img
                        src={booking.listingImage}
                        alt={booking.listingTitle}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <Calendar className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full capitalize text-gray-600">{booking.category}</span>
                    <h3 className="font-heading text-lg font-semibold text-foreground mt-2 mb-1 line-clamp-1">{booking.listingTitle}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                      <MapPin className="w-3 h-3" /> {booking.listingLocation}
                    </p>
                    
                    <div className="space-y-2 mb-3 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-primary" />
                        <span>{format(booking.checkInDate, 'MMM dd')} - {format(booking.checkOutDate, 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-primary" />
                        <span>{booking.guests || 1} guest{(booking.guests || 1) > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold text-foreground">₱{(booking.totalPrice || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {booking.status === 'confirmed' && (
                          <button 
                            className="btn-outline text-xs px-3 py-1.5"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleMarkCompleted(booking.id);
                              // After marking as completed, show review modal
                              const bookingData = bookings.find(b => b.id === booking.id);
                              if (bookingData) {
                                // Check if review already exists
                                const existingReview = await getReviewByBookingId(booking.id);
                                if (!existingReview) {
                                  setSelectedBooking(bookingData);
                                  setShowReviewModal(true);
                                }
                              }
                            }}
                            disabled={completingBooking === booking.id}
                          >
                            {completingBooking === booking.id ? 'Completing...' : 'Mark Complete'}
                          </button>
                        )}
                        {booking.status === 'completed' && (
                          <button 
                            className="btn-outline text-xs px-3 py-1.5"
                            onClick={async (e) => {
                              e.stopPropagation();
                              // Check if review already exists
                              const existingReview = await getReviewByBookingId(booking.id);
                              if (existingReview) {
                                toast.info('You have already reviewed this booking');
                                return;
                              }
                              setSelectedBooking(booking);
                              setShowReviewModal(true);
                            }}
                          >
                            {booking.reviewed ? 'Reviewed' : 'Review'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cancelled Bookings */}
        {cancelledBookings.length > 0 && (
          <section>
            <h2 className="text-2xl font-heading font-semibold mb-6">Cancelled</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cancelledBookings.map((booking) => (
                <div key={booking.id} className="card-listing opacity-75" onClick={() => navigate(`/${booking.category}s/${booking.listingId}`)}>
                  <div className="relative w-full overflow-hidden rounded-t-2xl aspect-[4/3]">
                    {booking.listingImage ? (
                      <img
                        src={booking.listingImage}
                        alt={booking.listingTitle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <Calendar className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full capitalize text-gray-600">{booking.category}</span>
                    <h3 className="font-heading text-lg font-semibold text-foreground mt-2 mb-1 line-clamp-1">{booking.listingTitle}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                      <MapPin className="w-3 h-3" /> {booking.listingLocation}
                    </p>
                    
                    <div className="space-y-2 mb-3 text-xs text-gray-600">
                      {booking.checkInDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-primary" />
                          <span>{format(booking.checkInDate, 'MMM dd')} - {format(booking.checkOutDate, 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-primary" />
                        <span>{booking.guests || 1} guest{(booking.guests || 1) > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold text-foreground">₱{(booking.totalPrice || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {bookings.length === 0 && !loading && (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-heading font-semibold mb-2">No bookings yet</h2>
            <p className="text-muted-foreground mb-6">Start exploring accommodations and make your first reservation!</p>
            <button className="btn-primary" onClick={() => navigate('/accommodations')}>
              Browse Accommodations
            </button>
          </div>
        )}

        {/* Recommendations Section - Show if user has completed bookings */}
        {user && bookings.filter(b => b.status === 'completed' || b.status === 'confirmed').length > 0 && (
          <Recommendations 
            title="Recommended Based on Your Bookings" 
            showTitle={true} 
            limit={8} 
          />
        )}
      </main>

      <Footer />
      {showLoginModal && <LogIn isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />}
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
            // Reload bookings to update reviewed status
            const updatedBookings = bookings.map(b => 
              b.id === selectedBooking.id ? { ...b, reviewed: true } : b
            );
            setBookings(updatedBookings);
          }}
        />
      )}
    </div>
  );
};

export default Bookings;
