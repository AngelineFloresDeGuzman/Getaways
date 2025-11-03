import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Calendar, MapPin, Users, MessageSquare, Star } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { getGuestBookings } from "@/pages/Guest/services/bookingService";
import { format } from "date-fns";
import LogIn from "@/pages/Auth/LogIn";

const Bookings = () => {
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

        // Fetch listing details for each booking
        const bookingsWithDetails = await Promise.all(
          guestBookings.map(async (booking) => {
            try {
              const listingRef = doc(db, 'listings', booking.listingId);
              const listingSnap = await getDoc(listingRef);
              
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
                  category: listingData.category || booking.category || 'accommodation'
                };
              } else {
                return {
                  ...booking,
                  listingTitle: 'Listing not found',
                  listingLocation: 'Unknown',
                  listingImage: null,
                  category: booking.category || 'accommodation'
                };
              }
            } catch (error) {
              console.error('Error loading listing for booking:', error);
              return {
                ...booking,
                listingTitle: 'Error loading listing',
                listingLocation: 'Unknown',
                listingImage: null,
                category: booking.category || 'accommodation'
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
              console.log('📦 Processing booking:', docSnap.id, 'Status:', bookingData.status);
              try {
                const listingRef = doc(db, 'listings', bookingData.listingId);
                const listingSnap = await getDoc(listingRef);
                
                if (listingSnap.exists()) {
                  const listingData = listingSnap.data();
                  const photos = listingData.photos || [];
                  const locationData = listingData.locationData || {};
                  
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
                    category: listingData.category || bookingData.category || 'accommodation'
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
          <div className="text-center py-20">
            <p className="text-muted-foreground">Loading your bookings...</p>
          </div>
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
                <div key={booking.id} className="card-listing hover-lift cursor-pointer" onClick={() => navigate(`/${booking.category}s/${booking.listingId}`)}>
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
                      {booking.status === 'pending' && (
                        <span className="text-xs text-yellow-600">Pending</span>
                      )}
                      {booking.status === 'confirmed' && (
                        <span className="text-xs text-green-600">✓ Confirmed</span>
                      )}
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
                <div key={booking.id} className="card-listing hover-lift cursor-pointer" onClick={() => navigate(`/${booking.category}s/${booking.listingId}`)}>
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
                      {booking.status === 'completed' && (
                        <button 
                          className="btn-outline text-xs px-3 py-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement review functionality
                          }}
                        >
                          Review
                        </button>
                      )}
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
      </main>

      <Footer />
    </div>
  );
};

export default Bookings;
