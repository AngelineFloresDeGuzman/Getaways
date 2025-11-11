import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import WishlistSection from '@/components/WishlistSection';
import {
  MapPin, Star, Heart, Share2, Check, X, ArrowLeft, ChevronLeft, ChevronRight
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import LogIn from '@/pages/Auth/LogIn';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebookF, faInstagram, faFacebookMessenger, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { createBooking, getUnavailableDates, calculateTotalPrice, checkDateConflict } from '@/pages/Guest/services/bookingService';
import { validateCoupon } from '@/pages/Host/services/couponService';
import { startConversation, getHostIdFromListing } from '@/pages/Guest/services/messagingService';
import { getListingReviews } from '@/pages/Guest/services/reviewService';
import { toast } from '@/components/ui/sonner';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix marker icon issue (same as Location page)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const AccommodationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hostProfile, setHostProfile] = useState(null);
  const [activeShare, setActiveShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [accommodation, setAccommodation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState(null);
  const [guests, setGuests] = useState(1);
  const [defaultMonth, setDefaultMonth] = useState(new Date());
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponApplied, setCouponApplied] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Debug: Track when unavailableDates state changes
  useEffect(() => {
    console.log('📊 unavailableDates state changed:', unavailableDates.length, 'dates');
    if (unavailableDates.length > 0) {
      console.log('📊 Current unavailable dates:', unavailableDates.map(d => {
        if (d instanceof Date) {
          return d.toISOString().split('T')[0];
        }
        return String(d);
      }));
    }
  }, [unavailableDates]);

  // Load unavailable dates when accommodation loads and listen for real-time updates
  useEffect(() => {
    if (!id) return;

    const loadUnavailableDates = async () => {
      try {
        console.log('📅 Loading unavailable dates for listing:', id);
        const dates = await getUnavailableDates(id);
        console.log('📅 Loaded unavailable dates:', dates.length, 'dates');
        if (dates.length > 0) {
          console.log('📅 Unavailable dates:', dates.map(d => {
            if (d instanceof Date) {
              return d.toISOString().split('T')[0];
            }
            return String(d);
          }));
        } else {
          console.log('⚠️ No unavailable dates found - calendar will show all dates as available');
        }
        setUnavailableDates(dates);
        console.log('✅ unavailableDates state updated with', dates.length, 'dates');
      } catch (error) {
        console.error('❌ Error loading unavailable dates:', error);
        setUnavailableDates([]);
      }
    };
    
    // Initial load
    loadUnavailableDates();
    
    // Set up real-time listener for bookings on this listing
    // This ensures calendar updates immediately when bookings change (pending/confirmed/cancelled)
    // We listen to ALL bookings - getUnavailableDates will filter by status (confirmed/pending)
    let unsubscribe;
    let fallbackInterval;
    
    try {
      // Listen to all bookings for this listing (no status filter)
      // This ensures we catch all status changes (pending -> confirmed, confirmed -> cancelled, etc.)
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('listingId', '==', id)
      );

      unsubscribe = onSnapshot(
        bookingsQuery,
        (snapshot) => {
          console.log('📅 Bookings snapshot update - docs:', snapshot.docs.length);
          // Log all booking statuses for debugging
                snapshot.docs.forEach(doc => {
                  const booking = doc.data();
            console.log(`📅 Booking ${doc.id} status: ${booking.status}`, {
              checkIn: booking.checkInDate?.toDate ? booking.checkInDate.toDate().toISOString().split('T')[0] : 'N/A',
              checkOut: booking.checkOutDate?.toDate ? booking.checkOutDate.toDate().toISOString().split('T')[0] : 'N/A'
                });
          });
          // When bookings change, reload unavailable dates (will include both confirmed and pending)
          console.log('📅 Bookings changed, reloading unavailable dates...');
                loadUnavailableDates();
              },
        (error) => {
          console.error('❌ Error in bookings snapshot:', error);
          // Fallback: periodic refresh if real-time listener fails
          console.warn('⚠️ Real-time listener failed, using periodic refresh');
                fallbackInterval = setInterval(() => {
                  console.log('📅 Periodic refresh of unavailable dates...');
                  loadUnavailableDates();
                }, 10000); // Refresh every 10 seconds
        }
      );
    } catch (error) {
      console.error('❌ Error setting up bookings listener:', error);
      // Fallback to periodic refresh if setup fails
      fallbackInterval = setInterval(() => {
        console.log('📅 Periodic refresh of unavailable dates...');
        loadUnavailableDates();
      }, 10000); // Refresh every 10 seconds
    }

    return () => {
      console.log('🧹 Cleaning up bookings listener');
      if (unsubscribe) {
        unsubscribe();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [id]);

  // Recalculate price without coupon
  const recalculatePrice = () => {
    if (checkInDate && checkOutDate && accommodation) {
      // Get pricing from accommodation data - it might be nested or at top level
      const pricing = {
        weekdayPrice: accommodation.price || accommodation.pricing?.weekdayPrice || 0,
        weekendPrice: accommodation.weekendPrice || accommodation.pricing?.weekendPrice || accommodation.price || 0,
        basePrice: accommodation.price || accommodation.pricing?.basePrice || 0,
        discounts: accommodation.pricing?.discounts || accommodation.discounts || {}
      };
      const calculatedPrice = calculateTotalPrice(pricing, checkInDate, checkOutDate, guests);
      setTotalPrice(calculatedPrice);
    } else {
      setTotalPrice(0);
    }
  };

  // Validate and apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('');
      setCouponApplied(null);
      recalculatePrice();
      return;
    }

    if (!checkInDate || !checkOutDate || !accommodation) {
      setCouponError('Please select dates first');
      return;
    }

    try {
      setValidatingCoupon(true);
      setCouponError('');
      
      // Calculate base price before coupon
      const pricing = {
        weekdayPrice: accommodation.price || accommodation.pricing?.weekdayPrice || 0,
        weekendPrice: accommodation.weekendPrice || accommodation.pricing?.weekendPrice || accommodation.price || 0,
        basePrice: accommodation.price || accommodation.pricing?.basePrice || 0,
        discounts: accommodation.pricing?.discounts || accommodation.discounts || {}
      };
      const basePrice = calculateTotalPrice(pricing, checkInDate, checkOutDate, guests);
      
      const result = await validateCoupon(couponCode.trim(), accommodation.id, basePrice);
      
      if (result.valid) {
        setCouponApplied({ ...result.coupon, couponId: result.couponId });
        setCouponError('');
        // Recalculate price with coupon
        const discountAmount = result.coupon.discountAmount;
        const newTotal = Math.max(0, basePrice - discountAmount);
        setTotalPrice(Math.round(newTotal));
        toast.success(`Coupon "${result.coupon.code}" applied successfully!`);
      } else {
        setCouponApplied(null);
        setCouponError(result.error || 'Invalid coupon code');
        recalculatePrice();
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setCouponError('Failed to validate coupon. Please try again.');
      setCouponApplied(null);
      recalculatePrice();
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Calculate total price when dates or guests change
  useEffect(() => {
    recalculatePrice();
    // Clear coupon when dates/guests change
    if (couponCode) {
      setCouponCode('');
      setCouponApplied(null);
      setCouponError('');
    }
  }, [checkInDate, checkOutDate, guests, accommodation]);

  // Fetch accommodation from Firestore
  useEffect(() => {
    const fetchAccommodation = async () => {
      if (!id) {
        setError('No accommodation ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('📦 AccommodationDetail: Fetching accommodation with ID:', id);
        
        const docRef = doc(db, 'listings', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          console.error('❌ Accommodation not found:', id);
          setError('Accommodation not found');
          setLoading(false);
          return;
        }
        
        const data = docSnap.data();
        const locationData = data.locationData || {};
        
        // Transform Firestore data with ALL available fields
        const pricing = data.pricing || {};
        const propertyBasics = data.propertyBasics || {};
        const amenities = data.amenities || {};
        const discounts = data.discounts || {};
        const bookingSettings = data.bookingSettings || {};
        const safetyDetails = data.safetyDetails || [];
        const finalDetails = data.finalDetails || {};
        
        // Format location display
        const location = data.location || 
          (locationData.city && locationData.province 
            ? `${locationData.city}, ${locationData.province}`
            : locationData.city || locationData.country || 'No location');
        
        // Format full address if available
        const fullAddress = [
          locationData.unit,
          locationData.building,
          locationData.street,
          locationData.barangay,
          locationData.city,
          locationData.zipCode ? `Philippines ${locationData.zipCode}` : '',
          locationData.province
        ].filter(Boolean).join(', ') || location;
        
        // Get main price
        const price = data.price || pricing.weekdayPrice || pricing.basePrice || 0;
        
        // Flatten amenities for display
        const amenitiesList = [
          ...(amenities.favorites || []),
          ...(amenities.standout || []),
          ...(amenities.safety || [])
        ];
        
        const accommodationData = {
          id: docSnap.id,
          // Core info
          title: data.title || 'Untitled Listing',
          description: data.description || '',
          descriptionHighlights: data.descriptionHighlights || [],
          location: location,
          fullAddress: fullAddress,
          locationData: locationData,
          price: price,
          rating: data.rating || 0,
          reviews: data.reviews || 0,
          // Images - ensure we always have valid image URLs
          photos: data.photos || [],
          images: (() => {
            const photos = data.photos || [];
            if (photos.length > 0) {
              return photos.map(p => p.base64 || p.url).filter(Boolean);
            }
            return data.images || [];
          })(),
          image: (() => {
            // Try to get image from photos array first
            const firstPhoto = data.photos?.[0];
            if (firstPhoto?.base64) {
              return firstPhoto.base64;
            }
            if (firstPhoto?.url) {
              return firstPhoto.url;
            }
            // Fallback to top-level image field
            if (data.image) {
              return data.image;
            }
            // Final fallback
            return "fallback.jpg";
          })(),
          features: data.descriptionHighlights || [],
          type: "accommodation",
          // Property details
          propertyBasics: propertyBasics,
          bedrooms: propertyBasics.bedrooms || 0,
          bathrooms: propertyBasics.bathrooms || 0,
          beds: propertyBasics.beds || 0,
          maxGuests: propertyBasics.guestCapacity || propertyBasics.guests || 0,
          bedroomLock: propertyBasics.bedroomLock || null,
          // Property type info
          privacyType: data.privacyType || '',
          propertyStructure: data.propertyStructure || '',
          // Amenities (full structure)
          amenities: amenities,
          amenitiesList: amenitiesList,
          // Pricing details
          pricing: pricing,
          weekdayPrice: pricing.weekdayPrice || price,
          weekendPrice: pricing.weekendPrice || price,
          weekendPricingEnabled: pricing.weekendPrice && pricing.weekendPrice !== price,
          // Discounts
          discounts: discounts,
          weeklyDiscount: discounts.weekly || 0,
          monthlyDiscount: discounts.monthly || 0,
          earlyBirdDiscount: discounts.earlyBird || 0,
          lastMinuteDiscount: discounts.lastMinute || 0,
          // Booking settings
          bookingSettings: bookingSettings,
          advanceNotice: bookingSettings.advanceNotice || '1_day',
          preparationTime: bookingSettings.preparationTime || '1_day',
          availabilityWindow: bookingSettings.availabilityWindow || '3_months',
          // Guest selection
          guestSelection: data.guestSelection || {},
          instantBook: data.guestSelection === 'instant-book' || data.guestSelection?.instantBook === true,
          guestRequirements: data.guestSelection?.guestRequirements || [],
          // Safety details
          safetyDetails: safetyDetails,
          // Final details
          finalDetails: finalDetails,
          residentialAddress: finalDetails.residentialAddress || '',
          isBusinessHost: finalDetails.isBusinessHost || false,
          // Host info
          ownerId: data.ownerId,
          ownerEmail: data.ownerEmail,
          host: data.ownerEmail || 'Host',
          hostImage: null, // Host image not stored yet
          // Reviews (not implemented yet)
          reviewsList: [],
          // Meta
          status: data.status,
          publishedAt: data.publishedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          // Note: Subscription info is now stored in user.payment, not in listing
          imageIndex: data.imageIndex,
          category: data.category
        };
        
        console.log('✅ AccommodationDetail: Loaded accommodation:', accommodationData.title);
        setAccommodation(accommodationData);
        
        // Load reviews for this listing
        try {
          setReviewsLoading(true);
          const listingReviews = await getListingReviews(docSnap.id);
          setReviews(listingReviews);
          // Update accommodation rating and review count from actual reviews
          if (listingReviews.length > 0) {
            const totalRating = listingReviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = totalRating / listingReviews.length;
            setAccommodation(prev => ({
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
        
        // Fetch host profile information
        if (accommodationData.ownerId) {
          try {
            const hostDoc = await getDoc(doc(db, 'users', accommodationData.ownerId));
            if (hostDoc.exists()) {
              const hostData = hostDoc.data();
              const hostName = hostData.firstName && hostData.lastName
                ? `${hostData.firstName} ${hostData.lastName}`
                : hostData.firstName || hostData.lastName || accommodationData.ownerEmail?.split('@')[0] || 'Host';
              
              // Calculate host since date
              let hostSinceDate = null;
              if (hostData.createdAt) {
                hostSinceDate = hostData.createdAt?.toDate ? hostData.createdAt.toDate() : new Date(hostData.createdAt);
              } else if (accommodationData.publishedAt) {
                // Fallback to publishedAt if createdAt not available
                if (accommodationData.publishedAt?.toDate) {
                  hostSinceDate = accommodationData.publishedAt.toDate();
                } else if (accommodationData.publishedAt?.seconds) {
                  hostSinceDate = new Date(accommodationData.publishedAt.seconds * 1000);
                } else {
                  hostSinceDate = new Date(accommodationData.publishedAt);
                }
              }
              
              setHostProfile({
                name: hostName,
                firstName: hostData.firstName || '',
                lastName: hostData.lastName || '',
                email: hostData.email || accommodationData.ownerEmail || '',
                profileImage: hostData.profileImage || hostData.photoURL || null,
                hostSinceDate: hostSinceDate,
                createdAt: hostData.createdAt
              });
            }
          } catch (hostError) {
            console.warn('Could not load host profile:', hostError);
            // Set fallback
            setHostProfile({
              name: accommodationData.ownerEmail?.split('@')[0] || 'Host',
              email: accommodationData.ownerEmail || '',
              hostSinceDate: null
            });
          }
        }
      } catch (err) {
        console.error('❌ Error fetching accommodation:', err);
        setError('Failed to load accommodation');
      } finally {
        setLoading(false);
      }
    };

    fetchAccommodation();
  }, [id]);

  // Firebase Auth Listener - MUST be before early returns
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Load favorites from localStorage - MUST be before early returns
  useEffect(() => {
    if (!user || !accommodation) return;
    const storedFavorites = JSON.parse(localStorage.getItem(`favorites_${user.uid}`)) || [];
    setFavorites(storedFavorites);
    setIsFavorite(!!storedFavorites.find(fav => fav && fav.id === accommodation.id && fav.type === "accommodation"));
  }, [user, accommodation?.id]);

  // Listen to localStorage changes - MUST be before early returns
  useEffect(() => {
    if (!accommodation) return;
    
    const handleStorage = (e) => {
      if (e.key === `favorites_${user?.uid}`) {
        const storedFavorites = JSON.parse(e.newValue) || [];
        setFavorites(storedFavorites);
        setIsFavorite(!!storedFavorites.find(fav => fav.id === accommodation.id && fav.type === "accommodation"));
      }
    };
    
    const handleFavoritesChanged = (e) => {
      if (e.detail.userId === user?.uid) {
        setFavorites(e.detail.favorites);
        setIsFavorite(!!e.detail.favorites.find(fav => fav.id === accommodation.id && fav.type === "accommodation"));
      }
    };
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('favoritesChanged', handleFavoritesChanged);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('favoritesChanged', handleFavoritesChanged);
    };
  }, [user, accommodation?.id]);

  // Support both old format (image field) and new format (photos array)
  const mainImage = accommodation?.image || 
                    (accommodation?.photos?.[0]?.base64 || accommodation?.photos?.[0]?.url) || 
                    (accommodation?.images?.[0]) ||
                    "fallback.jpg";
  
  // Get all images for gallery
  const allImages = accommodation?.photos || accommodation?.images || [];
  const imageUrls = allImages.map(img => typeof img === 'string' ? img : (img?.base64 || img?.url)).filter(Boolean);
  if (!imageUrls.includes(mainImage) && mainImage !== "fallback.jpg") {
    imageUrls.unshift(mainImage); // Add main image to start if not already included
  }
  
  // Get current image index
  const currentImageIndex = selectedImage ? imageUrls.indexOf(selectedImage) : -1;
  
  // Navigation functions
  const handleNextImage = () => {
    const currentIdx = imageUrls.indexOf(selectedImage);
    if (currentIdx >= 0 && currentIdx < imageUrls.length - 1) {
      setSelectedImage(imageUrls[currentIdx + 1]);
    } else if (imageUrls.length > 0) {
      setSelectedImage(imageUrls[0]); // Loop to first
    }
  };
  
  const handlePrevImage = () => {
    const currentIdx = imageUrls.indexOf(selectedImage);
    if (currentIdx > 0) {
      setSelectedImage(imageUrls[currentIdx - 1]);
    } else if (imageUrls.length > 0) {
      setSelectedImage(imageUrls[imageUrls.length - 1]); // Loop to last
    }
  };
  
  // Keyboard navigation
  useEffect(() => {
    if (!selectedImage || imageUrls.length === 0) return;
    
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const currentIdx = imageUrls.indexOf(selectedImage);
        if (currentIdx >= 0 && currentIdx < imageUrls.length - 1) {
          setSelectedImage(imageUrls[currentIdx + 1]);
        } else if (imageUrls.length > 0) {
          setSelectedImage(imageUrls[0]); // Loop to first
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const currentIdx = imageUrls.indexOf(selectedImage);
        if (currentIdx > 0) {
          setSelectedImage(imageUrls[currentIdx - 1]);
        } else if (imageUrls.length > 0) {
          setSelectedImage(imageUrls[imageUrls.length - 1]); // Loop to last
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedImage(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedImage, imageUrls]);
  
  const favoritesKey = user ? `favorites_${user.uid}` : "favorites";
  const shareUrl = activeShare ? `${window.location.origin}/accommodations/${activeShare}` : '';

  // Handle reservation/booking
  const handleReserve = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!checkInDate || !checkOutDate) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    if (!accommodation || !accommodation.id) {
      toast.error('Accommodation information is missing');
      return;
    }

    // Calculate nightly price
    const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));
    const nightlyPrice = nights > 0 ? totalPrice / nights : 0;

    // Navigate to booking request page
    navigate('/booking-request', {
      state: {
        listingId: accommodation.id,
        listing: accommodation,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        guests: guests,
        totalPrice: totalPrice,
        nightlyPrice: nightlyPrice,
        couponCode: couponApplied?.code || null,
        couponDiscount: couponApplied?.discountAmount || 0,
        couponId: couponApplied?.couponId || null
      }
    });
  };

  // Show loading or error state - AFTER all hooks
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-36">
          <Loading message="Loading accommodation..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !accommodation) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-36">
          <div className="text-center">
            <p className="text-foreground text-lg">{error || 'Accommodation not found.'}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleRequireLogin = () => setShowLoginModal(true);

  const toggleFavorite = () => {
    if (!user) return handleRequireLogin();

    const key = `favorites_${user.uid}`;
    let storedFavorites = JSON.parse(localStorage.getItem(key)) || [];

    const exists = storedFavorites.some(fav => fav.id === accommodation.id && fav.type === "accommodation");

    if (exists) {
      storedFavorites = storedFavorites.filter(fav => !(fav.id === accommodation.id && fav.type === "accommodation"));
      setIsFavorite(false);
    } else {
      storedFavorites.push({
        ...accommodation,
        type: "accommodation",
        image: accommodation.image || 
                (accommodation.photos?.[0]?.base64 || accommodation.photos?.[0]?.url) ||
                (accommodation.images?.[0]) ||
                "fallback.jpg", // Support multiple formats
        savedDate: new Date().toLocaleDateString(),
      });
      setIsFavorite(true);
    }

    localStorage.setItem(key, JSON.stringify(storedFavorites));
    setFavorites(storedFavorites);
    
    // Dispatch custom event for same-tab synchronization
    window.dispatchEvent(new CustomEvent('favoritesChanged', {
      detail: { favorites: storedFavorites, userId: user.uid }
    }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/accommodations/${accommodation.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/accommodations" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to accommodations
          </Link>
        </div>

        {/* Title & Actions */}
        <div className="max-w-7xl mx-auto px-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                {accommodation.title}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{accommodation.rating}</span>
                  <span>({accommodation.reviews})</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{accommodation.location}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleFavorite}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl hover:bg-muted/50 transition-colors"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                {isFavorite ? "Saved" : "Save"}
              </button>
              <button
                onClick={() => setActiveShare(accommodation.id)}
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
          <div className="grid grid-cols-4 grid-rows-2 gap-2 h-96 rounded-2xl overflow-hidden">
            {/* Main large cover photo - spans 2 columns and 2 rows */}
            <div 
              className="col-span-2 row-span-2 cursor-pointer group relative"
              onClick={() => setSelectedImage(mainImage)}
            >
              <img
                src={mainImage}
                alt={accommodation.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium transition-opacity">
                  Click to view full size
                </span>
            </div>
            </div>
            {/* Thumbnail images - all equal size (1x1 grid cells) */}
            {imageUrls.slice(1, 5).map((imageUrl, index) => {
              const isLastThumbnail = index === 3 && imageUrls.length > 5;
              return (
                <div 
                  key={index} 
                  className="col-span-1 row-span-1 overflow-hidden cursor-pointer group relative"
                  onClick={() => setSelectedImage(imageUrl)}
                >
                <img
                    src={imageUrl}
                    alt={`${accommodation.title} - View ${index + 2}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                  {isLastThumbnail && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
                      <span className="text-white text-sm font-medium">
                        +{imageUrls.length - 5} more
                      </span>
              </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
              );
            })}
          </div>
        </div>
        
        {/* Image Lightbox Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setSelectedImage(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            {/* Previous button */}
            {imageUrls.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevImage();
                }}
                className="absolute left-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
            )}
            
            {/* Image container */}
            <div 
              className="relative max-w-7xl mx-auto px-16"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt={`${accommodation.title} - Image ${currentImageIndex + 1}`}
                className="max-h-[90vh] max-w-full object-contain rounded-lg"
              />
              
              {/* Image counter */}
              {imageUrls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm">
                  {currentImageIndex + 1} / {imageUrls.length}
                </div>
              )}
            </div>
            
            {/* Next button */}
            {imageUrls.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextImage();
                }}
                className="absolute right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            )}
            
            {/* Keyboard hint */}
            <div className="absolute bottom-4 right-4 text-white/50 text-xs">
              Use arrow keys to navigate • ESC to close
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {(hostProfile?.profileImage || hostProfile?.name || accommodation.host) && (
              <div className="flex items-center gap-4 p-6 border border-border rounded-2xl">
                {hostProfile?.profileImage ? (
                <img
                    src={hostProfile.profileImage}
                    alt={hostProfile.name || accommodation.host}
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ${hostProfile?.profileImage ? 'hidden' : ''}`}
                >
                  <span className="text-xl font-semibold text-primary">
                    {(hostProfile?.name || accommodation.host)?.charAt(0).toUpperCase() || 'H'}
                  </span>
                </div>
                <div>
                  <h3 className="font-heading text-xl font-semibold text-foreground">
                    Hosted by {hostProfile?.name || accommodation.host}
                  </h3>
                  {hostProfile?.hostSinceDate && (
                    <p className="text-muted-foreground">
                      Host since {hostProfile.hostSinceDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  {!hostProfile?.hostSinceDate && (
                    <p className="text-muted-foreground">Superhost</p>
                  )}
                </div>
              </div>
            )}

            {/* Property Details */}
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-foreground">About this place</h2>
              <div className="flex items-center gap-6 text-muted-foreground flex-wrap">
                {accommodation.bedrooms > 0 && <span>{accommodation.bedrooms} {accommodation.bedrooms === 1 ? 'bedroom' : 'bedrooms'}</span>}
                {accommodation.beds > 0 && <span>{accommodation.beds} {accommodation.beds === 1 ? 'bed' : 'beds'}</span>}
                {accommodation.bathrooms > 0 && <span>{accommodation.bathrooms} {accommodation.bathrooms === 1 ? 'bathroom' : 'bathrooms'}</span>}
                {accommodation.maxGuests > 0 && <span>Up to {accommodation.maxGuests} {accommodation.maxGuests === 1 ? 'guest' : 'guests'}</span>}
              </div>
              
              {/* Property Type Info */}
              {(accommodation.privacyType || accommodation.propertyStructure) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Property type:</span>
                  <span className="px-2 py-1 text-sm font-medium bg-primary/10 text-primary rounded-md">
                    {accommodation.privacyType && accommodation.propertyStructure
                      ? `${accommodation.privacyType} in ${accommodation.propertyStructure}`
                      : accommodation.privacyType || accommodation.propertyStructure}
                  </span>
                </div>
              )}
              
              {/* Full Address if available */}
              {accommodation.fullAddress && accommodation.fullAddress !== accommodation.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{accommodation.fullAddress}</span>
                </div>
              )}
              
              <p className="font-body text-muted-foreground leading-relaxed">
                {accommodation.description}
              </p>
              
              {/* Description Highlights */}
              {accommodation.descriptionHighlights && accommodation.descriptionHighlights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {accommodation.descriptionHighlights.map((highlight, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Amenities */}
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-foreground">What this place offers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(accommodation.amenitiesList || []).length > 0 ? (
                  (accommodation.amenitiesList || []).map((amenity, index) => {
                    // Amenity can be either an ID string or an object
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

            {/* Safety Details */}
            {accommodation.safetyDetails && accommodation.safetyDetails.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-heading text-2xl font-bold text-foreground">Safety & Security</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {accommodation.safetyDetails.map((safety, index) => {
                    const safetyName = typeof safety === 'string' ? safety : (safety.name || safety);
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="text-muted-foreground capitalize">{safetyName.replace(/_/g, ' ')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Select Check-in Date Section */}
            <div className="space-y-4 pt-8 border-t border-border">
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Select check-in date</h2>
                <p className="text-muted-foreground">Add your travel dates for exact pricing</p>
            </div>
              
              <div className="flex justify-center w-full">
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 w-full max-w-4xl mx-auto relative">
                  <Calendar
                    mode="range"
                    selected={selectedDateRange}
                    onSelect={(range) => {
                      // If only the first date is selected (from but no to), allow it
                      // The user is still in the process of selecting a range
                      if (range?.from && !range?.to) {
                        setSelectedDateRange(range);
                        setCheckInDate(range.from);
                        setCheckOutDate(null);
                        return;
                      }
                      
                      // If a complete range is selected (both from and to), validate it
                      if (range?.from && range?.to) {
                        // Ensure check-in is before check-out
                        const checkIn = new Date(range.from);
                        const checkOut = new Date(range.to);
                        checkIn.setHours(0, 0, 0, 0);
                        checkOut.setHours(0, 0, 0, 0);
                        
                        if (checkIn >= checkOut) {
                          toast.error('Check-out date must be after check-in date.');
                          // Keep only the first date selected
                          setSelectedDateRange({ from: range.from, to: null });
                          setCheckInDate(range.from);
                          setCheckOutDate(null);
                          return;
                        }
                        
                        // Check if the selected range includes any unavailable dates
                        // Iterate through all dates in the range (check-in to check-out, exclusive of check-out)
                        let hasUnavailableDate = false;
                        let unavailableDateFound = null;
                        
                        for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
                          const dateToCheck = new Date(d);
                          dateToCheck.setHours(0, 0, 0, 0);
                          
                          // Check if this date is in the unavailable dates list
                          const isUnavailable = unavailableDates.some((unavailableDate) => {
                            try {
                              let unavailableDateObj;
                              if (unavailableDate instanceof Date) {
                                unavailableDateObj = new Date(unavailableDate);
                              } else {
                                unavailableDateObj = new Date(unavailableDate);
                              }
                              unavailableDateObj.setHours(0, 0, 0, 0);
                              
                              // Compare dates
                              return unavailableDateObj.getTime() === dateToCheck.getTime();
                            } catch (error) {
                              return false;
                            }
                          });
                          
                          if (isUnavailable) {
                            hasUnavailableDate = true;
                            unavailableDateFound = new Date(dateToCheck);
                            break;
                          }
                        }
                        
                        if (hasUnavailableDate) {
                          // Range includes unavailable dates - prevent selection
                          const dateStr = unavailableDateFound.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          });
                          toast.error(`Selected date range includes reserved dates (e.g., ${dateStr}). Please choose different dates.`);
                          // Clear the selection and keep only the first date if it was valid
                          if (selectedDateRange?.from && selectedDateRange?.to) {
                            // Revert to previous valid selection
                            setSelectedDateRange(selectedDateRange);
                            setCheckInDate(selectedDateRange.from);
                            setCheckOutDate(selectedDateRange.to);
                          } else {
                            // Clear the selection entirely
                            setSelectedDateRange(null);
                            setCheckInDate(null);
                            setCheckOutDate(null);
                          }
                          return;
                        }
                      }
                      
                      // Range is valid - update the selection
                      setSelectedDateRange(range);
                      if (range?.from) {
                        setCheckInDate(range.from);
                      }
                      if (range?.to) {
                        setCheckOutDate(range.to);
                      } else if (range?.from && !range?.to) {
                        setCheckOutDate(null);
                      }
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
                        // Normalize to midnight in local timezone for accurate comparison
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
                      
                      // Use local date string for consistent comparison (avoid timezone issues)
                      const year = dateToCheck.getFullYear();
                      const month = String(dateToCheck.getMonth() + 1).padStart(2, '0');
                      const day = String(dateToCheck.getDate()).padStart(2, '0');
                      const dateStr = `${year}-${month}-${day}`;
                      
                      // Check if date is in the past
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const isPast = dateToCheck < today;
                      
                      // Check if date is unavailable (booked - confirmed or pending)
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
                            
                            // Use local date string for comparison (match getUnavailableDates format)
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
                      
                      // Disable both past dates and unavailable dates
                      // Unavailable dates will get red styling via modifiers
                      return isPast || isUnavailable;
                    }}
                    modifiersClassNames={{
                      unavailable: "!bg-red-600 !text-white !line-through !opacity-100 !cursor-not-allowed hover:!bg-red-700 hover:!text-white !font-bold !border-2 !border-red-800 !shadow-lg !relative !z-20",
                      selected: "!bg-blue-500 !text-white hover:!bg-blue-600 !font-semibold",
                      range_middle: "!bg-blue-200 !text-blue-900",
                      today: "bg-blue-50 text-blue-700 border-2 border-blue-500"
                    }}
                  />
                  {(checkInDate || checkOutDate) && (
                    <div className="absolute bottom-4 right-6">
                      <button
                        onClick={() => {
                          setCheckInDate(null);
                          setCheckOutDate(null);
                          setSelectedDateRange(null);
                        }}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        Clear dates
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <h2 className="font-heading text-2xl font-bold text-foreground">Reviews</h2>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{accommodation.rating}</span>
                  <span className="text-muted-foreground">({accommodation.reviews} reviews)</span>
                </div>
              </div>

              <div className="space-y-6">
                {reviewsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading reviews...</p>
                  </div>
                ) : reviews.length > 0 ? reviews.map((review) => (
                  <div key={review.id} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold">
                        {review.reviewerImage ? (
                      <img
                            src={review.reviewerImage}
                            alt={review.reviewerName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                        ) : (
                          <span>{review.reviewerName?.[0]?.toUpperCase() || 'U'}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{review.reviewerName || 'Anonymous'}</p>
                        <p className="text-sm text-muted-foreground">
                          {review.createdAt ? format(review.createdAt, 'MMM dd, yyyy') : 'Recently'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
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
                    <p className="text-foreground leading-relaxed pl-13">
                      {review.comment}
                    </p>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No reviews yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Be the first to review this accommodation!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Where you'll be */}
            {accommodation.locationData && (
              <div className="space-y-4 pt-8 border-t border-border">
                <h2 className="font-heading text-2xl font-bold text-foreground">Where you'll be</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-5 h-5" />
                    <span>
                      {[
                        accommodation.locationData.city,
                        accommodation.locationData.province,
                        accommodation.locationData.country
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  {accommodation.locationData.latitude && accommodation.locationData.longitude && (
                    <div className="w-full h-96 rounded-xl overflow-hidden border border-border">
                      <MapContainer
                        center={[accommodation.locationData.latitude, accommodation.locationData.longitude]}
                        zoom={15}
                        style={{ height: '100%', width: '100%', borderRadius: '16px' }}
                        zoomControl={true}
                        doubleClickZoom={true}
                        scrollWheelZoom={true}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Marker 
                          position={[accommodation.locationData.latitude, accommodation.locationData.longitude]}
                          icon={L.divIcon({
                            html: `
                              <div style="position: relative; width: 50px; height: 65px; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3)); cursor: default !important;">
                                <svg width="50" height="65" viewBox="0 0 50 65" fill="none" xmlns="http://www.w3.org/2000/svg" style="cursor: default !important; color: hsl(var(--primary));">
                                  <path d="M25 65 C20 58, 5 40, 5 25 C5 11, 11 5, 25 5 C39 5, 45 11, 45 25 C45 40, 30 58, 25 65 Z" 
                                        fill="currentColor" stroke="white" stroke-width="3" stroke-linejoin="round" style="cursor: default !important;"/>
                                  <g transform="translate(13, 12)" style="cursor: default !important;">
                                    <path d="M12 2L0 10V22H5V15H19V22H24V10L12 2Z" fill="white" style="cursor: default !important;"/>
                                    <rect x="8" y="18" width="8" height="4" fill="white" style="cursor: default !important;"/>
                                  </g>
                                </svg>
                              </div>
                            `,
                            className: 'custom-home-marker',
                            iconSize: [50, 65],
                            iconAnchor: [25, 65],
                            popupAnchor: [0, -65]
                          })}
                        />
                      </MapContainer>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Meet your host */}
            {(accommodation.ownerEmail || accommodation.ownerId) && (
              <div className="space-y-4 pt-8 border-t border-border">
                <h2 className="font-heading text-2xl font-bold text-foreground">Meet your host</h2>
                <div className="flex items-start gap-4">
                  {hostProfile?.profileImage ? (
                    <img
                      src={hostProfile.profileImage}
                      alt={hostProfile.name}
                      className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ${hostProfile?.profileImage ? 'hidden' : ''}`}
                  >
                    <span className="text-xl font-semibold text-primary">
                      {hostProfile?.name?.charAt(0).toUpperCase() || accommodation.ownerEmail?.charAt(0).toUpperCase() || 'H'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      {hostProfile?.name || accommodation.ownerEmail?.split('@')[0] || 'Host'}
                    </h3>
                    {hostProfile?.hostSinceDate && (
                    <p className="text-sm text-muted-foreground mb-4">
                        Host since {hostProfile.hostSinceDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    <button 
                      onClick={async () => {
                        if (!user) {
                          setShowLoginModal(true);
                          return;
                        }
                        try {
                          const hostId = accommodation.ownerId || await getHostIdFromListing(accommodation.id);
                          if (!hostId) {
                            toast.error('Host information not available');
                            return;
                          }
                          const conversationId = await startConversation(hostId, accommodation.id);
                          navigate(`/messages?conversation=${conversationId}`);
                        } catch (error) {
                          console.error('Error contacting host:', error);
                        }
                      }}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Contact host
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Wishlist Section */}
            <WishlistSection
              listingId={accommodation.id}
              listingTitle={accommodation.title}
              listingType="accommodation"
              hostName={accommodation.host}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="card-listing p-6">
                <div className="mb-6">
                  {totalPrice > 0 ? (
                    <div className="mb-2">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-heading text-3xl font-bold text-foreground">
                          ₱{totalPrice.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          for {Math.floor((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24))} nights
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground line-through">
                        ₱{accommodation.price.toLocaleString()}/ night
                      </div>
                    </div>
                  ) : (
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-heading text-3xl font-bold text-foreground">
                        ₱{accommodation.price.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/ night</span>
                  </div>
                  )}
                  
                  {/* Weekend Pricing */}
                  {accommodation.weekendPricingEnabled && accommodation.weekendPrice && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Weekend: ₱{accommodation.weekendPrice.toLocaleString()}/night
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{accommodation.rating} ({accommodation.reviews} reviews)</span>
                  </div>
                  
                  {/* Instant Book Badge */}
                  {accommodation.instantBook && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md">
                        ✓ Instant Book
                      </span>
                    </div>
                  )}
                </div>

                {/* Discounts Section */}
                {(accommodation.weeklyDiscount > 0 || accommodation.monthlyDiscount > 0 || 
                  accommodation.earlyBirdDiscount > 0 || accommodation.lastMinuteDiscount > 0) && (
                  <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Special Offers</h3>
                    <div className="space-y-1 text-sm">
                      {accommodation.weeklyDiscount > 0 && (
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">{accommodation.weeklyDiscount}%</span> off for weekly stays
                        </p>
                      )}
                      {accommodation.monthlyDiscount > 0 && (
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">{accommodation.monthlyDiscount}%</span> off for monthly stays
                        </p>
                      )}
                      {accommodation.earlyBirdDiscount > 0 && (
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">{accommodation.earlyBirdDiscount}%</span> early bird discount
                        </p>
                      )}
                      {accommodation.lastMinuteDiscount > 0 && (
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">{accommodation.lastMinuteDiscount}%</span> last minute discount
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 border border-border rounded-xl cursor-pointer hover:border-primary transition-colors" onClick={() => document.querySelector('.rdp')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                      <label className="block text-xs font-medium text-foreground mb-1">CHECK-IN</label>
                      <div className={`text-sm ${checkInDate ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {checkInDate ? format(checkInDate, 'MMM dd, yyyy') : 'Add date'}
                    </div>
                    </div>
                    <div className="p-3 border border-border rounded-xl cursor-pointer hover:border-primary transition-colors" onClick={() => document.querySelector('.rdp')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                      <label className="block text-xs font-medium text-foreground mb-1">CHECKOUT</label>
                      <div className={`text-sm ${checkOutDate ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {checkOutDate ? format(checkOutDate, 'MMM dd, yyyy') : 'Add date'}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border border-border rounded-xl">
                    <label className="block text-xs font-medium text-foreground mb-1">GUESTS</label>
                    <select 
                      className="w-full bg-transparent text-sm text-muted-foreground"
                      value={guests}
                      onChange={(e) => setGuests(parseInt(e.target.value))}
                    >
                      {[...Array(accommodation.maxGuests || 1)].map((_, i) => (
                        <option key={i} value={i + 1}>{i + 1} guest{i > 0 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Coupon Code Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Have a coupon code?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError('');
                        if (!e.target.value.trim()) {
                          setCouponApplied(null);
                          recalculatePrice();
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleApplyCoupon();
                        }
                      }}
                      placeholder="Enter coupon code"
                      className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {validatingCoupon ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-sm text-red-600 mt-1">{couponError}</p>
                  )}
                  {couponApplied && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700">
                        ✓ Coupon "{couponApplied.code}" applied! 
                        {couponApplied.discountType === 'percentage' 
                          ? ` ${couponApplied.discountValue}% off` 
                          : ` ₱${couponApplied.discountValue.toLocaleString()} off`}
                      </p>
                      <button
                        onClick={() => {
                          setCouponCode('');
                          setCouponApplied(null);
                          setCouponError('');
                          recalculatePrice();
                        }}
                        className="text-xs text-green-700 hover:underline mt-1"
                      >
                        Remove coupon
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className={`btn-primary w-full mb-4 ${accommodation.instantBook ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={handleReserve}
                  disabled={!checkInDate || !checkOutDate}
                >
                  {accommodation.instantBook ? 'Book Now' : 'Reserve'}
                </button>
                <p className="text-center text-sm text-muted-foreground mb-4">You won't be charged yet</p>
                
                {/* Booking Policies */}
                {(accommodation.advanceNotice || accommodation.preparationTime || accommodation.availabilityWindow) && (
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Booking Policies</h3>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {accommodation.advanceNotice && (
                        <p>Advance notice: {accommodation.advanceNotice.replace(/_/g, ' ')}</p>
                      )}
                      {accommodation.preparationTime && (
                        <p>Preparation time: {accommodation.preparationTime.replace(/_/g, ' ')}</p>
                      )}
                      {accommodation.availabilityWindow && (
                        <p>Available up to {accommodation.availabilityWindow.replace(/_/g, ' ')} in advance</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
              Share this Accommodation
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Choose a platform to share on or copy the link below.
            </p>

            {/* Social Buttons */}
            <div className="flex justify-center gap-4 mb-6 flex-wrap">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
              >
                <FontAwesomeIcon icon={faFacebookF} />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-full hover:bg-gray-800 transition"
              >
                <FontAwesomeIcon icon={faXTwitter} />
              </a>
              <a
                href={`https://www.instagram.com/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white rounded-full hover:opacity-90 transition"
              >
                <FontAwesomeIcon icon={faInstagram} />
              </a>
              <a
                href={`https://www.messenger.com/t/?link=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
              >
                <FontAwesomeIcon icon={faFacebookMessenger} />
              </a>
            </div>

            {/* Copy Link */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="border border-border rounded-lg px-3 py-2 w-full text-sm"
                />
                <button
                  onClick={handleCopy}
                  className="btn-outline px-4 py-2 text-sm"
                >
                  Copy
                </button>
              </div>
              {copied && <p className="text-green-600 text-sm font-medium transition-opacity">✅ Link copied!</p>}
            </div>
          </div>
        </div>
      )}

      <Footer />
      {showLoginModal && <LogIn isModal={true} onClose={() => setShowLoginModal(false)} />}
    </div>
  );
};

export default AccommodationDetail;
