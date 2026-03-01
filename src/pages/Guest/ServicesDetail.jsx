import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import WishlistSection from '@/components/WishlistSection';
import {
  MapPin, Star, Heart, Share2, Clock, Users, ArrowLeft, X, Check, ChevronLeft, ChevronRight
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { getUnavailableDates, calculateBookingPrice } from '@/pages/Guest/services/bookingService';
import LogIn from '@/pages/Auth/LogIn';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebookF, faInstagram, faFacebookMessenger, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { toast } from '@/components/ui/sonner';
import { getListingReviews } from '@/pages/Guest/services/reviewService';

const ServicesDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeShare, setActiveShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const shareUrl = activeShare ? `${window.location.origin}/services/${activeShare}` : '';
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [participants, setParticipants] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [defaultMonth, setDefaultMonth] = useState(new Date());
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [unavailableDates, setUnavailableDates] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  // Fetch service from Firestore
  useEffect(() => {
    const fetchService = async () => {
      if (!id) {
        setError('No service ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const docRef = doc(db, 'listings', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          setError('Service not found');
          setLoading(false);
          return;
        }
        
        const data = docSnap.data();
        
        // Only show services
        if (data.category !== 'service') {
          setError('This is not a service listing');
          setLoading(false);
          return;
        }
        
        const locationData = data.locationData || {};
        const photos = data.photos || [];
        
        // Format location display
        const location = data.location || 
          (locationData.city && locationData.province 
            ? `${locationData.city}, ${locationData.province}`
            : locationData.city || locationData.country || 'No location');
        
        // Get images
        const imageUrls = photos.map(p => p.base64 || p.url).filter(Boolean);
        const mainImage = imageUrls[0] || "fallback.jpg";
        
        // Get price
        const price = data.price || data.pricing?.basePrice || data.pricing?.price || 0;
        
        const serviceData = {
          id: docSnap.id,
          title: data.title || 'Untitled Service',
          description: data.description || '',
          location: location,
          locationData: locationData,
          price: price,
          rating: data.rating || 0,
          reviews: data.reviews || 0,
          image: mainImage,
          images: imageUrls,
          category: data.serviceCategory || 'Service',
          provider: data.ownerName || data.ownerEmail?.split('@')[0] || 'Provider',
          duration: data.duration || '1 hour',
          serviceCategory: data.serviceCategory,
          serviceYearsOfExperience: data.serviceYearsOfExperience,
          serviceExperience: data.serviceExperience,
          serviceDegree: data.serviceDegree,
          serviceCareerHighlight: data.serviceCareerHighlight,
          serviceProfilePicture: data.serviceProfilePicture,
          serviceProfiles: data.serviceProfiles || [],
          serviceAddress: data.serviceAddress,
          serviceWhereProvide: data.serviceWhereProvide,
          serviceOfferings: data.serviceOfferings || [],
          descriptionHighlights: data.descriptionHighlights || [],
          ownerId: data.ownerId,
          ownerEmail: data.ownerEmail,
        };
        
        setService(serviceData);
        setLoading(false);
      } catch (error) {
        setError('Failed to load service');
        setLoading(false);
      }
    };

    fetchService();
  }, [id]);

  // Load unavailable dates when service loads and listen for real-time updates
  useEffect(() => {
    if (!id) return;

    const loadUnavailableDates = async () => {
      try {
        const dates = await getUnavailableDates(id);
        setUnavailableDates(dates);
      } catch (error) {
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
        where('listingId', '==', id)
      );

      unsubscribe = onSnapshot(
        bookingsQuery,
        () => {
          // When bookings change, reload unavailable dates
          loadUnavailableDates();
        },
        (error) => {
          }
      );
    } catch (error) {
      }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [id]);

  // Update total price when date or participants change
  useEffect(() => {
    if (!selectedDate || !service) {
      setTotalPrice(0);
      return;
    }

    const bookingDate = new Date(selectedDate);
    bookingDate.setHours(0, 0, 0, 0);
    const checkOutDate = new Date(bookingDate);
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    
    try {
      const priceBreakdown = calculateBookingPrice({
        listing: service,
        checkInDate: bookingDate,
        checkOutDate: checkOutDate,
        guests: participants,
        couponDiscount: 0,
        category: 'service'
      });
      
      // Calculate discounts for services
      const originalPrice = priceBreakdown.originalPrice;
      const daysInAdvance = Math.floor((bookingDate - new Date()) / (1000 * 60 * 60 * 24));
      let discountAmount = 0;
      
      if (service.earlyBirdDiscount && daysInAdvance >= 30) {
        discountAmount = Math.round(originalPrice * (service.earlyBirdDiscount / 100));
      } else if (service.lastMinuteDiscount && daysInAdvance <= 7 && daysInAdvance >= 0) {
        discountAmount = Math.round(originalPrice * (service.lastMinuteDiscount / 100));
      }
      
      // Total = original price - discount (no service fee)
      const finalTotal = Math.max(0, originalPrice - discountAmount);
      setTotalPrice(finalTotal);
    } catch (error) {
      setTotalPrice(0);
    }
  }, [selectedDate, participants, service]);

  // Load reviews
  useEffect(() => {
    if (!id) return;
    
    const loadReviews = async () => {
      try {
        setReviewsLoading(true);
        const reviewsData = await getListingReviews(id);
        setReviews(reviewsData);
      } catch (error) {
        } finally {
        setReviewsLoading(false);
      }
    };

    loadReviews();
  }, [id]);

  useEffect(() => {
    if (!user || !service) return setIsFavorite(false);

    const storageKey = `favorites_${user.uid}`;
    const updateFavorite = () => {
      const storedFavorites = JSON.parse(localStorage.getItem(storageKey)) || [];
      const found = storedFavorites.find(fav => fav && fav.id === service.id && fav.type === "service");
      setIsFavorite(!!found);
    };
    
    const handleFavoritesChanged = (e) => {
      if (e.detail.userId === user?.uid) {
        const found = e.detail.favorites.find(fav => fav.id === service.id && fav.type === "service");
        setIsFavorite(!!found);
      }
    };

    window.addEventListener("storage", updateFavorite);
    window.addEventListener("favoritesChanged", handleFavoritesChanged);
    updateFavorite(); // initial load
    return () => {
      window.removeEventListener("storage", updateFavorite);
      window.removeEventListener("favoritesChanged", handleFavoritesChanged);
    };
  }, [service?.id, user]);

  const handleFavorite = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    let storageKey = `favorites_${user.uid}`;
    let storedFavorites = JSON.parse(localStorage.getItem(storageKey)) || [];

    if (isFavorite) {
      // Remove from favorites
      storedFavorites = storedFavorites.filter(fav => fav && !(fav.id === service.id && fav.type === "service"));
      setIsFavorite(false);
    } else {
      // Add to favorites
      storedFavorites.push({
        ...service,
        type: "service",
        image: service.image || service.images[0], // Use main card image
        savedDate: new Date().toLocaleDateString(),
      });
      setIsFavorite(true);
    }

    localStorage.setItem(storageKey, JSON.stringify(storedFavorites));
    
    // Dispatch custom event for same-tab synchronization
    window.dispatchEvent(new CustomEvent('favoritesChanged', {
        detail: { favorites: storedFavorites, userId: user.uid }
    }));
  };

  // Handle reservation/booking
  const handleReserve = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    if (!service || !service.id) {
      toast.error('Service information is missing');
      return;
    }

    // For services, we use the same date for check-in and check-out
    // The booking service expects both dates
    const bookingDate = new Date(selectedDate);
    bookingDate.setHours(0, 0, 0, 0);
    
    // Check-out is same day (services are single-day)
    const checkOutDate = new Date(bookingDate);
    checkOutDate.setDate(checkOutDate.getDate() + 1); // Next day for check-out

    // Calculate price breakdown using unified function
    const priceBreakdown = calculateBookingPrice({
      listing: service,
      checkInDate: bookingDate,
      checkOutDate: checkOutDate,
      guests: participants,
      couponDiscount: 0,
      category: 'service'
    });

    // Navigate to booking request page
    navigate('/booking-request', {
      state: {
        listingId: service.id,
        listing: service,
        checkInDate: bookingDate.toISOString().split('T')[0],
        checkOutDate: checkOutDate.toISOString().split('T')[0],
        guests: participants,
        totalPrice: priceBreakdown.totalPrice,
        nightlyPrice: service.price || 0,
        category: 'service',
        selectedTime: selectedTime,
        serviceDate: bookingDate.toISOString().split('T')[0]
      }
    });
  };

  // Show loading or error state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-36">
          <Loading message="Loading service..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-36">
          <div className="text-center">
            <p className="text-foreground text-lg">{error || 'Service not found.'}</p>
            <Link to="/services" className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
              Back to Services
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/services" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to services
          </Link>
        </div>

        {/* Title & Actions */}
        <div className="max-w-7xl mx-auto px-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">{service.title}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{service.rating}</span>
                  <span>({service.reviews})</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{service.location}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleFavorite}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl hover:bg-muted/50 transition-colors"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                {isFavorite ? "Saved" : "Save"}
              </button>
              <button
                onClick={() => setActiveShare(id)} // ← Add this
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl hover:bg-muted/50 transition-colors"
              >
                <Share2 className="w-4 h-4 text-muted-foreground" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="max-w-7xl mx-auto px-6 mb-8">
          {service.images && service.images.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 h-80 rounded-2xl overflow-hidden">
              {service.images.slice(0, 5).map((img, i) => (
                <img 
                  key={i} 
                  src={img} 
                  alt={service.title} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                  onClick={() => setSelectedImage(img)}
                />
            ))}
          </div>
          ) : (
            <div className="h-80 rounded-2xl overflow-hidden bg-gray-200 flex items-center justify-center">
              <span className="text-muted-foreground">No images available</span>
            </div>
          )}
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={selectedImage} 
              alt={service.title}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          <div className="lg:col-span-2 space-y-6">
            {/* Service Category */}
            {service.serviceCategory && (
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {service.serviceCategory}
                </span>
              </div>
            )}

            {/* About this service */}
            {service.description && (
              <div className="space-y-3">
                <h2 className="font-heading text-2xl font-bold text-foreground">About this service</h2>
                <p className="text-muted-foreground leading-relaxed">{service.description}</p>
              </div>
            )}

            {/* Duration */}
            {service.duration && (
              <div className="flex items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{service.duration}</div>
              </div>
            )}

            {/* Service Location/Where Provide */}
            {service.serviceWhereProvide && (
              <div className="space-y-2 pt-6 border-t border-border">
                <h3 className="font-semibold text-foreground">Where service is provided</h3>
                <p className="text-muted-foreground">{service.serviceWhereProvide}</p>
              </div>
            )}

            {/* Service Address */}
            {service.serviceAddress && (
              <div className="space-y-2 pt-6 border-t border-border">
                <h3 className="font-semibold text-foreground">Service Address</h3>
                <p className="text-muted-foreground">{service.serviceAddress}</p>
              </div>
            )}
            
            {/* Service Offerings */}
            {service.serviceOfferings && service.serviceOfferings.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-border">
                <h2 className="font-heading text-2xl font-bold text-foreground">Service Offerings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {service.serviceOfferings.map((offering, index) => (
                  <div key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-muted-foreground">{offering.title || offering.name || `Offering ${index + 1}`}</span>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Description Highlights */}
            {service.descriptionHighlights && service.descriptionHighlights.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-border">
                <h2 className="font-heading text-2xl font-bold text-foreground">Highlights</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {service.descriptionHighlights.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Select Dates Section */}
            <div className="space-y-4 pt-8 border-t border-border">
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Select dates</h2>
                <p className="text-muted-foreground">Choose your preferred date for this service</p>
              </div>
              
              <div className="flex justify-center w-full">
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 w-full max-w-4xl mx-auto relative">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    numberOfMonths={2}
                    showOutsideDays={true}
                    navLayout="around"
                    defaultMonth={defaultMonth}
                    fromDate={new Date()}
                    className="w-full"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-8 sm:space-y-0 justify-center",
                      month: "space-y-4",
                      caption: "flex justify-between items-center pt-2 relative mb-4",
                      caption_label: "text-lg font-semibold text-gray-900 flex-1 text-center",
                      nav: "flex items-center",
                      nav_button: "h-8 w-8 bg-transparent border-0 p-0 opacity-70 hover:opacity-100 hover:bg-gray-100 rounded-md transition-all flex items-center justify-center text-gray-700 hover:text-gray-900",
                      nav_button_previous: "",
                      nav_button_next: "",
                      table: "w-full border-collapse space-y-2",
                      head_row: "flex mb-2",
                      head_cell: "text-gray-600 rounded-md w-10 h-10 font-medium text-xs flex items-center justify-center",
                      row: "flex w-full mt-1",
                      cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-10 w-10 p-0 font-normal rounded-md hover:bg-gray-100 transition-colors aria-selected:opacity-100",
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
                            
                            return dateToCheck.getTime() === unavailableDateObj.getTime();
                          } catch (error) {
                            return false;
                          }
                        });
                      }
                      
                      return isPast || isUnavailable;
                    }}
                    modifiersClassNames={{
                      selected: "!bg-blue-500 !text-white",
                      today: "bg-blue-50 text-blue-700 border-2 border-blue-500",
                      unavailable: "!bg-red-600 !text-white !line-through !opacity-100 !cursor-not-allowed hover:!bg-red-700 hover:!text-white !font-bold !border-2 !border-red-800 !shadow-lg !relative !z-10"
                    }}
                  />
                  {selectedDate && (
                    <div className="absolute bottom-4 right-6">
                      <button
                        onClick={() => {
                          setSelectedDate(null);
                        }}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        Clear date
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
              <h2 className="font-heading text-2xl font-bold text-foreground">Reviews</h2>
              {reviewsLoading ? (
                <p className="text-muted-foreground">Loading reviews...</p>
              ) : reviews.length > 0 ? (
                reviews.map(r => (
                  <div key={r.id} className="space-y-2">
                    <div className="flex items-center gap-3">
                      {r.userPhoto && (
                        <img src={r.userPhoto} alt={r.userName} className="w-10 h-10 rounded-full" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{r.userName || 'Anonymous'}</p>
                        <p className="text-sm text-muted-foreground">{r.createdAt ? format(r.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}</p>
                      </div>
                      <div className="flex gap-1 ml-auto">
                        {[...Array(Math.floor(r.rating || 0))].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground">{r.comment || r.review || 'No comment'}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No reviews yet.</p>
              )}
            </div>

            {/* Provider Information */}
            {(service.provider || service.serviceProfilePicture || service.serviceYearsOfExperience || service.serviceExperience || service.serviceDegree || service.serviceCareerHighlight || (service.serviceProfiles && service.serviceProfiles.length > 0)) && (
              <div className="space-y-4 pt-6 border-t border-border">
                <h2 className="font-heading text-2xl font-bold text-foreground">Service Provider</h2>
                {(service.provider || service.serviceProfilePicture) && (
                  <div className="flex items-center gap-3">
                    {service.serviceProfilePicture && (
                      <img 
                        src={service.serviceProfilePicture} 
                        alt={service.provider || 'Service Provider'}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    )}
                    {service.provider && (
                      <div>
                        <p className="font-medium text-foreground">{service.provider}</p>
                        {service.serviceYearsOfExperience && (
                          <p className="text-sm text-muted-foreground">{service.serviceYearsOfExperience} years of experience</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {service.serviceExperience && (
                  <div className="mt-3">
                    <p className="text-muted-foreground">{service.serviceExperience}</p>
                  </div>
                )}
                {service.serviceDegree && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground"><span className="font-medium">Education:</span> {service.serviceDegree}</p>
                  </div>
                )}
                {service.serviceCareerHighlight && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground"><span className="font-medium">Career Highlight:</span> {service.serviceCareerHighlight}</p>
                  </div>
                )}
                {service.serviceYearsOfExperience && !service.provider && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">{service.serviceYearsOfExperience} years of experience</p>
                  </div>
                )}
                {/* Online Profiles */}
                {service.serviceProfiles && service.serviceProfiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h3 className="font-semibold text-foreground text-sm">Online Profiles</h3>
                    <div className="flex flex-wrap gap-2">
                      {service.serviceProfiles.map((profile, index) => {
                        const profileUrl = typeof profile === 'string' ? profile : (profile.url || profile.link || '');
                        const profileName = typeof profile === 'string' ? profile : (profile.name || profile.platform || `Profile ${index + 1}`);
                        return profileUrl ? (
                          <a
                            key={index}
                            href={profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {profileName}
                          </a>
                        ) : (
                          <span key={index} className="text-sm text-muted-foreground">{profileName}</span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Wishlist Section */}
            <WishlistSection
              listingId={service.id}
              listingTitle={service.title}
              listingType="service"
              hostName={service.provider}
            />
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="card-listing p-6 sticky top-24">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-heading text-3xl font-bold text-foreground">₱{service.price?.toLocaleString() || '0'}</span>
                  <span className="text-muted-foreground">/ person</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{service.rating || 0} ({service.reviews || 0} reviews)</span>
                </div>
              </div>
              
              {/* Date Selection */}
              <div className="space-y-4 mb-6">
                <div className="p-3 border border-border rounded-xl">
                  <label className="block text-xs font-medium text-foreground mb-1">Date</label>
                  <div className={`text-sm ${selectedDate ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Select a date'}
                  </div>
                </div>
                <div className="p-3 border border-border rounded-xl">
                  <label className="block text-xs font-medium text-foreground mb-1">Time</label>
                  <select 
                    className="w-full bg-transparent text-sm text-muted-foreground"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  >
                    <option value="">Select time</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>
                <div className="p-3 border border-border rounded-xl">
                  <label className="block text-xs font-medium text-foreground mb-1">Participants</label>
                  <select 
                    className="w-full bg-transparent text-sm text-muted-foreground"
                    value={participants}
                    onChange={(e) => setParticipants(parseInt(e.target.value))}
                  >
                    {[...Array(10)].map((_, i) => (
                      <option key={i} value={i + 1}>{i + 1} {i === 0 ? 'participant' : 'participants'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price Summary */}
              {totalPrice > 0 && selectedDate && (
                <div className="mb-6 pb-6 border-b border-border">
                  {(() => {
                    const bookingDate = new Date(selectedDate);
                    bookingDate.setHours(0, 0, 0, 0);
                    const checkOutDate = new Date(bookingDate);
                    checkOutDate.setDate(checkOutDate.getDate() + 1);
                    
                    const priceBreakdown = calculateBookingPrice({
                      listing: service,
                      checkInDate: bookingDate,
                      checkOutDate: checkOutDate,
                      guests: participants,
                      couponDiscount: 0,
                      category: 'service'
                    });
                    
                    // Calculate discounts for services
                    const originalPrice = priceBreakdown.originalPrice;
                    const daysInAdvance = Math.floor((bookingDate - new Date()) / (1000 * 60 * 60 * 24));
                    let discountAmount = 0;
                    let discountLabel = '';
                    
                    if (service.earlyBirdDiscount && daysInAdvance >= 30) {
                      discountAmount = Math.round(originalPrice * (service.earlyBirdDiscount / 100));
                      discountLabel = 'Early bird discount';
                    } else if (service.lastMinuteDiscount && daysInAdvance <= 7 && daysInAdvance >= 0) {
                      discountAmount = Math.round(originalPrice * (service.lastMinuteDiscount / 100));
                      discountLabel = 'Last minute discount';
                    }
                    
                    return (
                      <>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">
                            {participants} {participants === 1 ? 'person' : 'people'} × ₱{service.price?.toLocaleString() || '0'}
                          </span>
                          <span className="font-medium text-foreground">
                            ₱{originalPrice.toLocaleString()}
                          </span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex items-center justify-between text-sm mb-2 text-red-600">
                            <span className="font-medium">{discountLabel}</span>
                            <span className="font-medium">-₱{discountAmount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="font-semibold text-foreground">Total</span>
                          <span className="font-semibold text-foreground text-lg">
                            ₱{Math.max(0, originalPrice - discountAmount).toLocaleString()}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              
              <button 
                className="btn-primary w-full"
                onClick={handleReserve}
                disabled={!selectedDate}
              >
                Book Service
              </button>
              <p className="text-center text-sm text-muted-foreground mt-4">You won't be charged yet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {activeShare && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setActiveShare(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ❌ Close Button */}
            <button
              onClick={() => setActiveShare(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <h2 className="text-xl font-heading font-bold mb-4">
              Share this Service
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Choose a platform to share on or copy the link below.
            </p>

            {/* Social Buttons */}
            <div className="flex justify-center gap-4 mb-6 flex-wrap">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/services/${activeShare}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                title="Share on Facebook"
              >
                <FontAwesomeIcon icon={faFacebookF} />
              </a>

              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/services/${activeShare}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-full hover:bg-gray-800 transition"
                title="Share on X"
              >
                <FontAwesomeIcon icon={faXTwitter} />
              </a>

              <a
                href={`https://www.instagram.com/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white rounded-full hover:opacity-90 transition"
                title="Share on Instagram"
              >
                <FontAwesomeIcon icon={faInstagram} />
              </a>

              <a
                href={`https://www.messenger.com/t/?link=${encodeURIComponent(`${window.location.origin}/services/${activeShare}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                title="Share on Messenger"
              >
                <FontAwesomeIcon icon={faFacebookMessenger} />
              </a>

              <button
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: "Check out this service on Getaways!",
                        text: "Explore this amazing service!",
                        url: `${window.location.origin}/services/${activeShare}`,
                      });
                    } catch (error) {
                      }
                  } else {
                    alert("Sharing via device apps is not supported on this browser.");
                  }
                }}
                className="flex items-center justify-center w-12 h-12 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition font-bold"
                title="More Options"
              >
                ⋮
              </button>
            </div>

            {/* Copy Link Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="border border-border rounded-lg px-3 py-2 w-full text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000); // hide after 2 seconds
                  }}
                  className="btn-outline px-4 py-2 text-sm"
                >
                  Copy
                </button>
              </div>
              {copied && (
                <p className="text-green-600 text-sm font-medium transition-opacity">
                  ✅ Link copied!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
      {showLoginModal && <LogIn isModal={true} onClose={() => setShowLoginModal(false)} />}
    </div>
  );
};

export default ServicesDetail;
