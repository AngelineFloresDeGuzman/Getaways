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
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import LogIn from '@/pages/Auth/LogIn';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebookF, faInstagram, faFacebookMessenger, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { getUnavailableDates, calculateBookingPrice } from '@/pages/Guest/services/bookingService';
import { toast } from '@/components/ui/sonner';
import { getListingReviews } from '@/pages/Guest/services/reviewService';

const ExperiencesDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeShare, setActiveShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [hostProfile, setHostProfile] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [participants, setParticipants] = useState(1);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [defaultMonth, setDefaultMonth] = useState(new Date());

  // Load unavailable dates when experience loads
  useEffect(() => {
    if (!id) return;

    const loadUnavailableDates = async () => {
      try {
        console.log('📅 Loading unavailable dates for experience:', id);
        const dates = await getUnavailableDates(id);
        console.log('📅 Loaded unavailable dates:', dates.length, 'dates');
        setUnavailableDates(dates);
      } catch (error) {
        console.error('❌ Error loading unavailable dates:', error);
        setUnavailableDates([]);
      }
    };
    
    loadUnavailableDates();
    
    // Set up real-time listener for bookings
    let unsubscribe;
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('listingId', '==', id)
      );

      unsubscribe = onSnapshot(
        bookingsQuery,
        async () => {
          const dates = await getUnavailableDates(id);
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
  }, [id]);

  // Calculate total price when date/participants change
  useEffect(() => {
    if (experience && selectedDate && participants > 0) {
      // For experiences, check-out is same day (next day for booking system)
      const bookingDate = new Date(selectedDate);
      bookingDate.setHours(0, 0, 0, 0);
      const checkOutDate = new Date(bookingDate);
      checkOutDate.setDate(checkOutDate.getDate() + 1);
      
      const priceBreakdown = calculateBookingPrice({
        listing: experience,
        checkInDate: bookingDate,
        checkOutDate: checkOutDate,
        guests: participants,
        couponDiscount: 0,
        category: 'experience'
      });
      
      // Calculate discounts for experiences
      const originalPrice = priceBreakdown.originalPrice;
      const daysInAdvance = Math.floor((bookingDate - new Date()) / (1000 * 60 * 60 * 24));
      let discountAmount = 0;
      
      if (experience.earlyBirdDiscount && daysInAdvance >= 30) {
        discountAmount = Math.round(originalPrice * (experience.earlyBirdDiscount / 100));
      } else if (experience.lastMinuteDiscount && daysInAdvance <= 7 && daysInAdvance >= 0) {
        discountAmount = Math.round(originalPrice * (experience.lastMinuteDiscount / 100));
      }
      
      // Total = original price - discount (no service fee)
      const finalTotal = Math.max(0, originalPrice - discountAmount);
      setTotalPrice(finalTotal);
    } else {
      setTotalPrice(0);
    }
  }, [experience, selectedDate, participants]);

  // Fetch experience from Firestore
  useEffect(() => {
    const fetchExperience = async () => {
      if (!id) {
        setError('No experience ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('📦 ExperiencesDetails: Fetching experience with ID:', id);
        
        const docRef = doc(db, 'listings', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          console.error('❌ Experience not found:', id);
          setError('Experience not found');
          setLoading(false);
          return;
        }
        
        const data = docSnap.data();
        
        // Verify it's an experience
        if (data.category !== 'experience') {
          setError('This listing is not an experience');
          setLoading(false);
          return;
        }
        
        const locationData = data.locationData || data.meetingLocationData || {};
        const photosData = data.photos || [];
        
        // Format location display
        const location = data.location || 
          (locationData.city && locationData.province 
            ? `${locationData.city}, ${locationData.province}`
            : locationData.city || locationData.country || 'No location');
        
        // Get main price
        const price = data.pricePerGuest || data.price || 0;
        
        // Get image
        const image = (() => {
          const firstPhoto = photosData[0];
          if (firstPhoto?.base64) return firstPhoto.base64;
          if (firstPhoto?.url) return firstPhoto.url;
          if (data.image) return data.image;
          return "fallback.jpg";
        })();
        
        const experienceData = {
          id: docSnap.id,
          title: data.experienceTitle || data.title || 'Untitled Experience',
          description: data.experienceDescription || data.description || '',
          location: location,
          locationData: locationData,
          price: price,
          pricePerGuest: data.pricePerGuest || price,
          rating: data.rating || 0,
          reviews: data.reviews || 0,
          image: image,
          images: photosData.map(p => p.base64 || p.url).filter(Boolean),
          photos: photosData,
          category: data.experienceCategory || data.category || 'Experience',
          host: data.ownerName || data.ownerEmail?.split('@')[0] || 'Host',
          duration: data.duration || data.experienceDuration || '2 hours',
          groupSize: data.maxGuests || data.maxParticipants || 10,
          maxParticipants: data.maxGuests || data.maxParticipants || 10,
          status: data.status,
          publishedAt: data.publishedAt,
          createdAt: data.createdAt,
          ownerId: data.ownerId,
          ownerEmail: data.ownerEmail,
          ownerName: data.ownerName,
          itineraryItems: data.itineraryItems || [],
          amenities: data.amenities || [],
          experienceCategory: data.experienceCategory,
          yearsOfExperience: data.yearsOfExperience,
          introTitle: data.introTitle,
          expertise: data.expertise,
          recognition: data.recognition
        };
        
        console.log('✅ ExperiencesDetails: Loaded experience:', experienceData.title);
        setExperience(experienceData);
        
        // Load reviews
        try {
          setReviewsLoading(true);
          const listingReviews = await getListingReviews(docSnap.id);
          setReviews(listingReviews);
          if (listingReviews.length > 0) {
            const totalRating = listingReviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = totalRating / listingReviews.length;
            setExperience(prev => ({
              ...prev,
              rating: Math.round(avgRating * 10) / 10,
              reviews: listingReviews.length
            }));
          }
        } catch (error) {
          console.error('Error loading reviews:', error);
        } finally {
          setReviewsLoading(false);
        }
        
        // Fetch host profile
        if (experienceData.ownerId) {
          try {
            const hostDoc = await getDoc(doc(db, 'users', experienceData.ownerId));
            if (hostDoc.exists()) {
              const hostData = hostDoc.data();
              const hostName = hostData.firstName && hostData.lastName
                ? `${hostData.firstName} ${hostData.lastName}`
                : hostData.firstName || hostData.lastName || experienceData.ownerEmail?.split('@')[0] || 'Host';
              
              let hostSinceDate = null;
              if (hostData.createdAt) {
                hostSinceDate = hostData.createdAt?.toDate ? hostData.createdAt.toDate() : new Date(hostData.createdAt);
              } else if (experienceData.publishedAt) {
                if (experienceData.publishedAt?.toDate) {
                  hostSinceDate = experienceData.publishedAt.toDate();
                } else if (experienceData.publishedAt?.seconds) {
                  hostSinceDate = new Date(experienceData.publishedAt.seconds * 1000);
                } else {
                  hostSinceDate = new Date(experienceData.publishedAt);
                }
              }
              
              setHostProfile({
                name: hostName,
                firstName: hostData.firstName || '',
                lastName: hostData.lastName || '',
                email: hostData.email || experienceData.ownerEmail || '',
                profileImage: hostData.profileImage || hostData.photoURL || null,
                hostSinceDate: hostSinceDate,
                createdAt: hostData.createdAt
              });
            }
          } catch (hostError) {
            console.warn('Could not load host profile:', hostError);
            setHostProfile({
              name: experienceData.ownerEmail?.split('@')[0] || 'Host',
              email: experienceData.ownerEmail || '',
              hostSinceDate: null
            });
          }
        }
      } catch (err) {
        console.error('❌ Error fetching experience:', err);
        setError('Failed to load experience');
      } finally {
        setLoading(false);
      }
    };

    fetchExperience();
  }, [id]);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    if (!user || !experience) return;
    const storedFavorites = JSON.parse(localStorage.getItem(`favorites_${user.uid}`)) || [];
    setFavorites(storedFavorites);
    setIsFavorite(!!storedFavorites.find(fav => fav && fav.id === experience.id && fav.type === "experience"));
  }, [user, experience?.id]);

  // Listen to localStorage changes
  useEffect(() => {
    if (!experience) return;
    
    const handleStorage = (e) => {
      if (e.key === `favorites_${user?.uid}`) {
        const storedFavorites = JSON.parse(e.newValue) || [];
        setFavorites(storedFavorites);
        setIsFavorite(!!storedFavorites.find(fav => fav.id === experience.id && fav.type === "experience"));
      }
    };
    
    const handleFavoritesChanged = (e) => {
      if (e.detail.userId === user?.uid) {
        setFavorites(e.detail.favorites);
        setIsFavorite(!!e.detail.favorites.find(fav => fav.id === experience.id && fav.type === "experience"));
      }
    };
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('favoritesChanged', handleFavoritesChanged);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('favoritesChanged', handleFavoritesChanged);
    };
  }, [user, experience?.id]);

  const handleFavorite = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const key = `favorites_${user.uid}`;
    let storedFavorites = JSON.parse(localStorage.getItem(key)) || [];

    if (isFavorite) {
      storedFavorites = storedFavorites.filter(fav => !(fav.id === experience.id && fav.type === "experience"));
      setIsFavorite(false);
    } else {
      storedFavorites.push({
        ...experience,
        type: "experience",
        image: experience.image || experience.images?.[0],
        savedDate: new Date().toLocaleDateString(),
      });
      setIsFavorite(true);
    }
    
    localStorage.setItem(key, JSON.stringify(storedFavorites));
    setFavorites(storedFavorites);
    
    window.dispatchEvent(new CustomEvent('favoritesChanged', {
      detail: { favorites: storedFavorites, userId: user.uid }
    }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/experiences/${experience.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Handle booking
  const handleReserve = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    if (!experience || !experience.id) {
      toast.error('Experience information is missing');
      return;
    }

    // For experiences, we use the same date for check-in and check-out
    // The booking service expects both dates
    const bookingDate = new Date(selectedDate);
    bookingDate.setHours(0, 0, 0, 0);
    
    // Check-out is same day (experiences are single-day)
    const checkOutDate = new Date(bookingDate);
    checkOutDate.setDate(checkOutDate.getDate() + 1); // Next day for check-out

    // Calculate price breakdown using unified function
    const priceBreakdown = calculateBookingPrice({
      listing: experience,
      checkInDate: bookingDate,
      checkOutDate: checkOutDate,
      guests: participants,
      couponDiscount: 0,
      category: 'experience'
    });

    // Navigate to booking request page
    navigate('/booking-request', {
      state: {
        listingId: experience.id,
        listing: experience,
        checkInDate: bookingDate.toISOString().split('T')[0],
        checkOutDate: checkOutDate.toISOString().split('T')[0],
        guests: participants,
        totalPrice: priceBreakdown.totalPrice,
        nightlyPrice: experience.pricePerGuest || experience.price || 0,
        category: 'experience',
        selectedTime: selectedTime,
        experienceDate: bookingDate.toISOString().split('T')[0]
      }
    });
  };

  // Show loading or error state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-36">
          <Loading message="Loading experience..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !experience) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-36">
          <div className="text-center">
            <p className="text-foreground text-lg">{error || 'Experience not found.'}</p>
            <Link
              to="/experiences"
              className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Back to Experiences
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const mainImage = experience.image || experience.images?.[0] || "fallback.jpg";
  const imageUrls = experience.images || [mainImage].filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/experiences" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to experiences
          </Link>
        </div>

        {/* Title & Actions */}
        <div className="max-w-7xl mx-auto px-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">{experience.title}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{experience.rating}</span>
                  <span>({experience.reviews})</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{experience.location}</span>
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
                onClick={() => setActiveShare(experience.id)}
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
          <div className="grid grid-cols-3 gap-2 h-80 rounded-2xl overflow-hidden">
            {imageUrls.slice(0, 3).map((img, i) => (
              <img key={i} src={img} alt={experience.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <h2 className="font-heading text-2xl font-bold text-foreground">About this experience</h2>
              <p className="text-muted-foreground leading-relaxed">{experience.description}</p>
            </div>

            <div className="flex items-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{experience.duration}</div>
              <div className="flex items-center gap-1"><Users className="w-4 h-4" />Up to {experience.groupSize} participants</div>
            </div>
            
            {/* Itinerary */}
            {experience.itineraryItems && experience.itineraryItems.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-border">
                <h2 className="font-heading text-2xl font-bold text-foreground">What you'll do</h2>
                <div className="space-y-3">
                  {experience.itineraryItems.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{item.title || `Step ${index + 1}`}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        {item.durationMinutes && (
                          <p className="text-xs text-muted-foreground mt-1">{item.durationMinutes} minutes</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What's included */}
            <div className="space-y-4 pt-6 border-t border-border">
              <h2 className="font-heading text-2xl font-bold text-foreground">What's included</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(experience.amenities || []).length > 0 ? (
                  experience.amenities.map((amenity, index) => {
                    const amenityName = typeof amenity === 'string' ? amenity : (amenity.name || amenity);
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="text-muted-foreground capitalize">{amenityName.replace(/_/g, ' ')}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground">No amenities listed.</p>
                )}
              </div>
            </div>

            {/* Select Date Section */}
            <div className="space-y-4 pt-8 border-t border-border">
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Select a date</h2>
                <p className="text-muted-foreground">Choose when you'd like to experience this</p>
              </div>
              
              <div className="flex justify-center w-full">
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 w-full max-w-4xl mx-auto relative">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setDefaultMonth(date);
                    }}
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
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-semibold",
                      day_today: "bg-blue-50 text-blue-700 font-semibold border-2 border-blue-500",
                      day_outside: "day-outside text-gray-400 opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                      day_disabled: "!bg-amber-200 !text-amber-800 !opacity-75 !cursor-not-allowed hover:!bg-amber-200 !font-medium !border !border-amber-400 !line-through",
                      day_hidden: "invisible"
                    }}
                    components={{
                      IconLeft: () => <ChevronLeft className="h-5 w-5 text-gray-700" />,
                      IconRight: () => <ChevronRight className="h-5 w-5 text-gray-700" />
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dateToCheck = new Date(date);
                      dateToCheck.setHours(0, 0, 0, 0);
                      
                      if (dateToCheck < today) return true;
                      
                      // Check if date is unavailable
                      if (unavailableDates.length > 0) {
                        const year = dateToCheck.getFullYear();
                        const month = String(dateToCheck.getMonth() + 1).padStart(2, '0');
                        const day = String(dateToCheck.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        
                        return unavailableDates.some((unavailableDate) => {
                          try {
                            let unavailableDateObj;
                            if (unavailableDate instanceof Date) {
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
                            return false;
                          }
                        });
                      }
                      
                      return false;
                    }}
                    modifiersClassNames={{
                      selected: "bg-primary text-white",
                      today: "bg-blue-50 text-blue-700 border-2 border-blue-500"
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

            {/* Reviews */}
            <div className="space-y-4 pt-6 border-t border-border">
              <h2 className="font-heading text-2xl font-bold text-foreground">Reviews</h2>
              {reviewsLoading ? (
                <p className="text-muted-foreground">Loading reviews...</p>
              ) : reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold">
                        {review.reviewerImage ? (
                          <img src={review.reviewerImage} alt={review.reviewerName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span>{review.reviewerName?.[0]?.toUpperCase() || 'U'}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{review.reviewerName || 'Anonymous'}</p>
                        <p className="text-sm text-muted-foreground">
                          {review.createdAt ? format(review.createdAt, 'MMM dd, yyyy') : 'Recently'}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-auto">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${
                              i < review.rating 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-gray-300'
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground">{review.comment}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No reviews yet.</p>
              )}
            </div>

            {/* Wishlist Section */}
            <WishlistSection
              listingId={experience.id}
              listingTitle={experience.title}
              listingType="experience"
              hostName={experience.host}
            />
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="card-listing p-6 sticky top-24">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-heading text-3xl font-bold text-foreground">₱{experience.pricePerGuest?.toLocaleString() || experience.price?.toLocaleString() || '0'}</span>
                  <span className="text-muted-foreground">/ person</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{experience.rating} ({experience.reviews} reviews)</span>
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
                    {[...Array(experience.maxParticipants || 10)].map((_, i) => (
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
                      listing: experience,
                      checkInDate: bookingDate,
                      checkOutDate: checkOutDate,
                      guests: participants,
                      couponDiscount: 0,
                      category: 'experience'
                    });
                    
                    // Calculate discounts for experiences
                    const originalPrice = priceBreakdown.originalPrice;
                    const daysInAdvance = Math.floor((bookingDate - new Date()) / (1000 * 60 * 60 * 24));
                    let discountAmount = 0;
                    let discountLabel = '';
                    
                    if (experience.earlyBirdDiscount && daysInAdvance >= 30) {
                      discountAmount = Math.round(originalPrice * (experience.earlyBirdDiscount / 100));
                      discountLabel = 'Early bird discount';
                    } else if (experience.lastMinuteDiscount && daysInAdvance <= 7 && daysInAdvance >= 0) {
                      discountAmount = Math.round(originalPrice * (experience.lastMinuteDiscount / 100));
                      discountLabel = 'Last minute discount';
                    }
                    
                    return (
                      <>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">
                            {participants} {participants === 1 ? 'person' : 'people'} × ₱{experience.pricePerGuest?.toLocaleString() || experience.price?.toLocaleString() || '0'}
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
                Book Experience
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
            <button
              onClick={() => setActiveShare(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <h2 className="text-xl font-heading font-bold mb-4">
              Share this Experience
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Choose a platform to share on or copy the link below.
            </p>

            {/* Social Buttons */}
            <div className="flex justify-center gap-4 mb-6 flex-wrap">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/experiences/${activeShare}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
              >
                <FontAwesomeIcon icon={faFacebookF} />
              </a>

              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/experiences/${activeShare}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-full hover:bg-gray-800 transition"
              >
                <FontAwesomeIcon icon={faXTwitter} />
              </a>

              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white rounded-full hover:opacity-90 transition"
              >
                <FontAwesomeIcon icon={faInstagram} />
              </a>

              <a
                href={`https://www.messenger.com/t/?link=${encodeURIComponent(`${window.location.origin}/experiences/${activeShare}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
              >
                <FontAwesomeIcon icon={faFacebookMessenger} />
              </a>
            </div>

            {/* Copy Link Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/experiences/${activeShare}`}
                  className="border border-border rounded-lg px-3 py-2 w-full text-sm"
                />
                <button
                  onClick={handleCopy}
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

export default ExperiencesDetails;
