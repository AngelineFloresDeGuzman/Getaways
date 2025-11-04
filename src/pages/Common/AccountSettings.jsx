import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  User, Calendar, Heart, Camera, Edit3, Save, X, MapPin,
  Star, CalendarCheck, Grid, List, Loader2, CalendarIcon, Users,
  Sparkles, Mail, Clock, CheckCircle, Circle, Search, Filter, ExternalLink,
  MessageSquare, Ticket, Plus, Trash2, Edit, Copy, CreditCard, Shield, CheckCircle2
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, getDoc, updateDoc, setDoc, collection, query, where, 
  getDocs, onSnapshot, orderBy, updateDoc as updateFirestoreDoc
} from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "@/components/ui/sonner";
import LogIn from "@/pages/Auth/LogIn";
import { startConversationFromHost } from "@/pages/Guest/services/messagingService";
import { createReview, getReviewByBookingId, getUserReviews } from "@/pages/Guest/services/reviewService";
import ReviewModal from "@/components/ReviewModal";
import CouponModal from "@/components/CouponModal";
import { createCoupon, getHostCoupons, updateCoupon, deleteCoupon } from "@/pages/Host/services/couponService";

const AccountSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  // Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneCountryCode: '+1',
    location: '',
    residentialAddress: '',
    bio: '',
    profileImage: '',
    gender: '',
    birthday: '',
    createdAt: null,
    joinDate: '',
    paypalEmail: '',
    paypalAccount: '',
    paypalStatus: '',
    paymentMethod: '',
    paymentType: '',
    paymentStatus: '',
    lastPayPalTransactionId: '',
    lastPayPalPayerEmail: '',
    paypalConnectedAt: null
  });
  const [isHost, setIsHost] = useState(false);
  const [stats, setStats] = useState({
    reviews: 0,
    favorites: 0,
    bookings: 0,
    averageRating: 0
  });

  // Bookings state (for both guests and hosts)
  const [bookings, setBookings] = useState([]);
  const [listings, setListings] = useState([]); // Host's listings for bookings
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingTab, setBookingTab] = useState('all'); // all, pending, confirmed, completed, cancelled
  const [bookingView, setBookingView] = useState('grid'); // 'grid' or 'list'
  
  // Guest favorites state (for guest wishlist tab)
  const [guestFavorites, setGuestFavorites] = useState([]);
  const [favoritesViewMode, setFavoritesViewMode] = useState('grid');
  const [favoritesFilter, setFavoritesFilter] = useState('all');
  
  // Coupon state (for host coupon tab)
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  // Review modal state (for guest bookings)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  
  // User reviews modal state
  const [showUserReviewsModal, setShowUserReviewsModal] = useState(false);
  const [userReviews, setUserReviews] = useState([]);
  const [userReviewsLoading, setUserReviewsLoading] = useState(false);

  // Wishlist state (for hosts - Guest wishes)
  const [wishes, setWishes] = useState([]);
  const [filteredWishes, setFilteredWishes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterListing, setFilterListing] = useState('all');
  const [wishlistListings, setWishlistListings] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Tabs based on user role
  const tabs = isHost
    ? [
        { id: "profile", label: "Profile", icon: User },
        { id: "bookings", label: "Bookings", icon: CalendarCheck },
        { id: "wishlist", label: "Wishlist", icon: Heart },
        { id: "coupon", label: "Coupon", icon: Ticket },
      ]
    : [
        { id: "profile", label: "Profile", icon: User },
        { id: "bookings", label: "Bookings", icon: CalendarCheck },
        { id: "wishlist", label: "Wishlist", icon: Heart },
      ];

  // Update isHost based on current view mode (guest vs host)
  // This ensures coupon tab is hidden when viewing as guest, even if account has host role
  useEffect(() => {
    if (!user) return;
    
    const checkViewMode = async () => {
      const currentMode = sessionStorage.getItem('lastActiveMode');
      const userDoc = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDoc);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const userRoles = Array.isArray(userData.roles) ? userData.roles : (userData.roles ? [userData.roles] : []);
        const hasHostRole = userRoles.includes('host');
        
        // Determine isHost based on current view mode
        // If viewing as guest, isHost = false (hide coupon tab)
        // If viewing as host AND has host role, isHost = true (show coupon tab)
        if (currentMode === 'guest') {
          setIsHost(false);
        } else if (currentMode === 'host' && hasHostRole) {
          setIsHost(true);
        } else {
          // Default: if they have host role, show host view; otherwise guest view
          setIsHost(hasHostRole);
        }
      }
    };
    
    checkViewMode();
    
    // Listen for custom event when mode changes (can be dispatched from Navigation)
    const handleModeChange = () => checkViewMode();
    window.addEventListener('viewModeChanged', handleModeChange);
    
    // Also check when location changes (user navigates)
    return () => {
      window.removeEventListener('viewModeChanged', handleModeChange);
    };
  }, [user, location.pathname]);

  // Reset activeTab if guest tries to access host-only tabs
  useEffect(() => {
    if (!isHost && activeTab === 'coupon') {
      setActiveTab('profile');
    }
  }, [isHost, activeTab]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setShowLoginModal(true);
        setLoading(false);
        return;
      }
      await loadUserProfile(currentUser.uid);
      await loadStats(currentUser.uid);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load bookings based on user role
  useEffect(() => {
    if (!user || activeTab !== 'bookings') return;
    if (isHost) {
      loadHostBookings();
      loadHostListings();
    } else {
      loadGuestBookings();
    }
  }, [user, activeTab, isHost]);

  // Load wishlist based on user role
  useEffect(() => {
    if (!user || activeTab !== 'wishlist') return;
    if (isHost) {
      loadHostWishlists();
    } else {
      const cleanup = loadGuestFavorites();
      return cleanup;
    }
  }, [user, activeTab, isHost]);

  // Load coupons for hosts
  useEffect(() => {
    if (!user || activeTab !== 'coupon' || !isHost) return;
    loadCoupons();
  }, [user, activeTab, isHost]);

  // Filter wishes (Host only - guest wishes)
  useEffect(() => {
    if (activeTab !== 'wishlist' || !isHost) return;
    let filtered = wishes;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(w => w.status === filterStatus);
    }

    if (filterListing !== 'all') {
      filtered = filtered.filter(w => w.listingTitle === filterListing);
    }

    if (searchTerm) {
      filtered = filtered.filter(w =>
        w.wish.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.listingTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredWishes(filtered);
  }, [wishes, filterStatus, filterListing, searchTerm, activeTab, isHost]);

  const loadUserProfile = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRoles = Array.isArray(userData.roles) ? userData.roles : (userData.roles ? [userData.roles] : []);
        
        // Check current view mode from sessionStorage (guest vs host)
        // If user is viewing as guest, isHost should be false even if they have host role
        const currentMode = sessionStorage.getItem('lastActiveMode');
        const hasHostRole = userRoles.includes('host');
        
        // Determine isHost based on current view mode, not just role
        // If currentMode is 'guest', show guest view (isHost = false)
        // If currentMode is 'host' and user has host role, show host view (isHost = true)
        // If no mode set, default based on whether they have host role
        if (currentMode === 'guest') {
          setIsHost(false);
        } else if (currentMode === 'host' && hasHostRole) {
          setIsHost(true);
        } else {
          // Default: if they have host role, show host view; otherwise guest view
          setIsHost(hasHostRole);
        }
        
        const email = userData.email || auth.currentUser?.email || '';
        const createdAt = userData.createdAt 
          ? (userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt))
          : new Date();
        const joinDate = `Member since ${createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        
        // Load residentialAddress from listings collection for all users
        let residentialAddressDisplay = '';
        try {
          const listingsQuery = query(
            collection(db, 'listings'),
            where('ownerId', '==', userId)
          );
          const listingsSnapshot = await getDocs(listingsQuery);
          
          for (const listingDoc of listingsSnapshot.docs) {
            const listingData = listingDoc.data();
            let residentialAddr = listingData.data?.finalDetails?.residentialAddress || 
                                 listingData.finalDetails?.residentialAddress ||
                                 listingData.residentialAddress;
            
            if (residentialAddr) {
              if (typeof residentialAddr === 'object') {
                const addr = residentialAddr;
                const parts = [
                  addr.unit, addr.building, addr.street, addr.barangay,
                  addr.city, addr.province, addr.zipCode, addr.country
                ].filter(Boolean);
                residentialAddressDisplay = parts.join(', ');
              } else {
                residentialAddressDisplay = String(residentialAddr);
              }
              break; // Use the first listing's residential address found
            }
          }
        } catch (error) {
          console.warn('Error loading residential address from listings:', error);
        }
        
        // Handle birthday - could be stored as Date, string, or timestamp
        let birthdayValue = '';
        if (userData.birthday) {
          if (userData.birthday.toDate) {
            // Firestore Timestamp
            birthdayValue = userData.birthday.toDate().toISOString().split('T')[0];
          } else if (userData.birthday instanceof Date) {
            // Date object
            birthdayValue = userData.birthday.toISOString().split('T')[0];
          } else if (typeof userData.birthday === 'string') {
            // String (already formatted)
            birthdayValue = userData.birthday;
          } else if (userData.birthday.seconds) {
            // Timestamp object
            birthdayValue = new Date(userData.birthday.seconds * 1000).toISOString().split('T')[0];
          }
        }
        
        // Parse phone number and country code
        let phoneNumber = userData.phone || '';
        let countryCode = userData.phoneCountryCode || '+1';
        
        // If phoneCountryCode exists in userData, use it
        if (userData.phoneCountryCode) {
          countryCode = userData.phoneCountryCode;
        }
        
        // If phone starts with + and we don't have phoneCountryCode, try to extract it
        if (phoneNumber.startsWith('+') && !userData.phoneCountryCode) {
          // Common country codes (sorted by length, longest first to match correctly)
          const commonCodes = ['+1242', '+1246', '+1264', '+1268', '+1284', '+1340', '+1345', '+1441', '+1473', '+1649', '+1664', '+1670', '+1671', '+1684', '+1721', '+1758', '+1767', '+1784', '+1787', '+1809', '+1829', '+1849', '+1868', '+1869', '+1876', '+1939', '+852', '+853', '+886', '+971', '+972', '+973', '+974', '+975', '+976', '+977', '+992', '+993', '+994', '+995', '+996', '+998', '+1', '+7', '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+39', '+41', '+43', '+44', '+45', '+46', '+47', '+48', '+49', '+51', '+52', '+54', '+55', '+56', '+57', '+58', '+60', '+61', '+62', '+63', '+64', '+65', '+66', '+81', '+82', '+84', '+86', '+91', '+234', '+351', '+358'];
          
          // Sort by length descending to match longer codes first
          const sortedCodes = commonCodes.sort((a, b) => b.length - a.length);
          
          for (const code of sortedCodes) {
            if (phoneNumber.startsWith(code)) {
              countryCode = code;
              phoneNumber = phoneNumber.substring(code.length).trim();
              break;
            }
          }
        }
        
        // Get payment data from Firebase
        const paymentData = userData.payment || {};
        const paypalEmail = paymentData.paypalEmail || userData.paypalEmail || '';
        const paypalStatus = paymentData.paypalStatus || '';
        const paymentMethod = paymentData.method || '';
        const paymentType = paymentData.type || '';
        const paymentStatus = paymentData.status || '';
        const lastPayPalTransactionId = paymentData.lastPayPalTransactionId || '';
        const lastPayPalPayerEmail = paymentData.lastPayPalPayerEmail || '';
        const paypalConnectedAt = paymentData.paypalConnectedAt || null;
        
        setProfile({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: email,
          phone: phoneNumber,
          phoneCountryCode: countryCode,
          location: userData.location || '',
          residentialAddress: residentialAddressDisplay,
          bio: userData.bio || '',
          profileImage: userData.profileImage || userData.photoURL || '',
          gender: userData.gender || '',
          birthday: birthdayValue,
          createdAt: createdAt,
          joinDate: joinDate,
          paypalEmail: paypalEmail,
          paypalAccount: lastPayPalPayerEmail || paypalEmail,
          paypalStatus: paypalStatus,
          paymentMethod: paymentMethod,
          paymentType: paymentType,
          paymentStatus: paymentStatus,
          lastPayPalTransactionId: lastPayPalTransactionId,
          lastPayPalPayerEmail: lastPayPalPayerEmail,
          paypalConnectedAt: paypalConnectedAt
        });
      } else {
        const email = auth.currentUser?.email || '';
        const createdAt = new Date();
        setProfile({
          firstName: '',
          lastName: '',
          email: email,
          phone: '',
          phoneCountryCode: '+1',
          location: '',
          residentialAddress: '',
          bio: '',
          profileImage: '',
          gender: '',
          birthday: '',
          createdAt: createdAt,
          joinDate: `Member since ${createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          paypalEmail: '',
          paypalAccount: '',
          paypalStatus: '',
          paymentMethod: '',
          paymentType: '',
          paymentStatus: '',
          lastPayPalTransactionId: '',
          lastPayPalPayerEmail: '',
          paypalConnectedAt: null
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast.error('Failed to load profile data');
    }
  };

  const loadStats = async (userId) => {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('guestId', '==', userId)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsCount = bookingsSnapshot.size;

      const favoritesKey = `favorites_${userId}`;
      const storedFavorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
      const favoritesCount = storedFavorites.length;

      // Get review count and average rating
      let reviewsCount = 0;
      let averageRating = 0;
      try {
        const { getUserReviewStats } = await import('@/pages/Guest/services/reviewService');
        const reviewStats = await getUserReviewStats(userId);
        reviewsCount = reviewStats.totalReviews;
        averageRating = reviewStats.averageRating;
      } catch (error) {
        console.error('Error loading review stats:', error);
      }

      setStats({
        reviews: reviewsCount,
        favorites: favoritesCount,
        bookings: bookingsCount,
        averageRating: averageRating
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadHostListings = async () => {
    if (!user || !isHost) return;

    try {
      const listingsRef = collection(db, 'listings');
      let querySnapshot;
      try {
        const q = query(
          listingsRef,
          where('ownerId', '==', user.uid),
          where('status', '==', 'active')
        );
        querySnapshot = await getDocs(q);
      } catch (indexError) {
        const q = query(
          listingsRef,
          where('ownerId', '==', user.uid)
        );
        querySnapshot = await getDocs(q);
      }

      const listingsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const photosData = data.photos || [];
        return {
          id: doc.id,
          ...data,
          mainImage: photosData[0]?.base64 || photosData[0]?.url || null
        };
      });

      setListings(listingsData);
    } catch (error) {
      console.error('Error loading host listings:', error);
    }
  };

  const loadGuestBookings = async () => {
    if (!user || isHost) return;

    try {
      setBookingsLoading(true);
      const guestBookings = await getGuestBookings(user.uid);

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
                checkInDate: booking.checkInDate?.toDate ? booking.checkInDate.toDate() : new Date(booking.checkInDate),
                checkOutDate: booking.checkOutDate?.toDate ? booking.checkOutDate.toDate() : new Date(booking.checkOutDate),
                createdAt: booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt),
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
                checkInDate: booking.checkInDate?.toDate ? booking.checkInDate.toDate() : new Date(booking.checkInDate),
                checkOutDate: booking.checkOutDate?.toDate ? booking.checkOutDate.toDate() : new Date(booking.checkOutDate),
                createdAt: booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt),
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
              checkInDate: booking.checkInDate?.toDate ? booking.checkInDate.toDate() : new Date(booking.checkInDate),
              checkOutDate: booking.checkOutDate?.toDate ? booking.checkOutDate.toDate() : new Date(booking.checkOutDate),
              createdAt: booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt),
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
      console.error('Error loading guest bookings:', error);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  const loadGuestFavorites = () => {
    if (!user || isHost) return;

    const storageKey = `favorites_${user.uid}`;
    const loadFavorites = () => {
      const storedFavorites = JSON.parse(localStorage.getItem(storageKey)) || [];
      const normalized = storedFavorites
        .filter(item => item && item.id)
        .map(item => ({
          ...item,
          type: item.type || item.category || "accommodation"
        }));
      setGuestFavorites(normalized);
    };

    loadFavorites();

    const handleStorage = (e) => {
      if (e.key === storageKey) loadFavorites();
    };
    
    const handleFavoritesChanged = (e) => {
      if (e.detail.userId === user.uid) {
        loadFavorites();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("favoritesChanged", handleFavoritesChanged);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("favoritesChanged", handleFavoritesChanged);
    };
  };

  const toggleFavorite = (item) => {
    if (!item || !item.id || !user) return;

    const key = `favorites_${user.uid}`;
    const stored = JSON.parse(localStorage.getItem(key)) || [];
    const exists = stored.some(fav => fav?.id === item.id && fav?.type === item.type);

    const updatedFavorites = exists
      ? stored.filter(fav => !(fav?.id === item.id && fav?.type === item.type))
      : [...stored, item];

    localStorage.setItem(key, JSON.stringify(updatedFavorites));
    setGuestFavorites(updatedFavorites);
    
    window.dispatchEvent(new CustomEvent('favoritesChanged', {
      detail: { favorites: updatedFavorites, userId: user.uid }
    }));
  };

  const loadCoupons = async () => {
    if (!user || !isHost) return;

    try {
      setCouponsLoading(true);
      const hostCoupons = await getHostCoupons(user.uid);
      setCoupons(hostCoupons);
    } catch (error) {
      console.error('Error loading coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setCouponsLoading(false);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteCoupon(couponId);
      toast.success('Coupon deleted successfully');
      loadCoupons(); // Reload coupons
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error(error.message || 'Failed to delete coupon');
    }
  };

  const loadHostBookings = async () => {
    if (!user || !isHost) return;

    try {
      setBookingsLoading(true);
      const bookingsCollection = collection(db, 'bookings');
      
      let querySnapshot;
      try {
        const q = query(
          bookingsCollection,
          where('ownerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (indexError) {
        const q = query(
          bookingsCollection,
          where('ownerId', '==', user.uid)
        );
        querySnapshot = await getDocs(q);
      }

      const bookingsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const checkIn = data.checkInDate?.toDate ? data.checkInDate.toDate() : new Date(data.checkInDate);
        const checkOut = data.checkOutDate?.toDate ? data.checkOutDate.toDate() : new Date(data.checkOutDate);
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);

        return {
          id: doc.id,
          ...data,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          createdAt: createdAt,
          checkInFormatted: checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          checkOutFormatted: checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          createdAtFormatted: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
      });

      bookingsData.sort((a, b) => {
        const aDate = a.createdAt || new Date(0);
        const bDate = b.createdAt || new Date(0);
        return bDate - aDate;
      });

      setBookings(bookingsData);
    } catch (error) {
      console.error('Error loading host bookings:', error);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  const loadHostWishlists = async () => {
    if (!user || !isHost) return;

    try {
      setWishlistLoading(true);
      console.log('📋 Wishlists: Fetching wishes for host:', user.uid);
      
      const listingsRef = collection(db, 'listings');
      let listingsSnapshot;
      try {
        const listingsQuery = query(
          listingsRef,
          where('ownerId', '==', user.uid),
          where('status', '==', 'active')
        );
        listingsSnapshot = await getDocs(listingsQuery);
      } catch (indexError) {
        const fallbackQuery = query(
          listingsRef,
          where('ownerId', '==', user.uid)
        );
        listingsSnapshot = await getDocs(fallbackQuery);
      }
      
      const hostListingIds = [];
      const listingTitlesMap = {};
      
      listingsSnapshot.forEach((doc) => {
        const listingData = doc.data();
        hostListingIds.push(doc.id);
        listingTitlesMap[doc.id] = listingData.title || 'Untitled Listing';
      });
      
      if (hostListingIds.length === 0) {
        setWishes([]);
        setFilteredWishes([]);
        setWishlistListings([]);
        setWishlistLoading(false);
        return;
      }
      
      const allWishes = [];
      
      for (const listingId of hostListingIds) {
        try {
          const wishesRef = collection(db, 'listings', listingId, 'wishes');
          let wishesQuery;
          try {
            wishesQuery = query(wishesRef, orderBy('createdAt', 'desc'));
          } catch (orderError) {
            wishesQuery = query(wishesRef);
          }
          
          const wishesSnapshot = await getDocs(wishesQuery);
          
          wishesSnapshot.forEach((doc) => {
            allWishes.push({
              id: doc.id,
              listingId,
              ...doc.data(),
              listingTitle: doc.data().listingTitle || listingTitlesMap[listingId] || 'Unknown Listing',
            });
          });
        } catch (error) {
          console.error(`Error fetching wishes for listing ${listingId}:`, error);
        }
      }

      allWishes.sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return bDate - aDate;
      });

      setWishes(allWishes);
      setFilteredWishes(allWishes);

      const uniqueListings = [...new Set(allWishes.map(w => w.listingTitle))];
      setWishlistListings(uniqueListings);
    } catch (error) {
      console.error('❌ Error fetching wishes:', error);
      toast.error('Failed to load wishes');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      toast.success(`Booking ${newStatus}`);
      await loadHostBookings();
    } catch (error) {
      console.error('❌ Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const updateWishStatus = async (listingId, wishId, newStatus) => {
    try {
      const wishRef = doc(db, 'listings', listingId, 'wishes', wishId);
      await updateFirestoreDoc(wishRef, {
        status: newStatus,
      });

      setWishes(wishes.map(w =>
        w.id === wishId && w.listingId === listingId
          ? { ...w, status: newStatus }
          : w
      ));

      toast.success(`Wish marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating wish:', error);
      toast.error('Failed to update wish status');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      read: { color: 'bg-blue-100 text-blue-800', icon: Mail, text: 'Read' },
      addressed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Addressed' },
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  const navigateToListing = (listingId, listingType) => {
    const routes = {
      accommodation: `/accommodations/${listingId}`,
      experience: `/experiences/${listingId}`,
      service: `/services/${listingId}`,
    };
    navigate(routes[listingType] || `/accommodations/${listingId}`);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target.result;
        setProfile(prev => ({ ...prev, profileImage: base64Image }));
        
        if (user) {
          try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              profileImage: base64Image,
              updatedAt: new Date().toISOString()
            });
            toast.success('Profile picture updated successfully!');
          } catch (error) {
            console.error('Error saving profile image:', error);
            toast.error('Failed to save profile picture');
          } finally {
            setUploadingImage(false);
          }
        } else {
          setUploadingImage(false);
        }
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      
      reader.onerror = () => {
        toast.error('Failed to read image file');
        setUploadingImage(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      toast.error('You must be logged in to save your profile');
      return;
    }

    try {
      setSaving(true);
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      // Combine country code and phone number
      const fullPhoneNumber = profile.phone.trim() 
        ? `${profile.phoneCountryCode}${profile.phone.trim()}` 
        : '';
      
      const updateData = {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        email: profile.email.trim(),
        phone: fullPhoneNumber,
        phoneCountryCode: profile.phoneCountryCode,
        bio: profile.bio.trim(),
        profileImage: profile.profileImage.trim(),
        gender: profile.gender.trim(),
        birthday: profile.birthday.trim() || null,
        updatedAt: new Date().toISOString()
      };

      // Only save location if there's no residentialAddress from listings
      // residentialAddress comes from listings collection and shouldn't be overwritten
      if (!profile.residentialAddress && profile.location.trim()) {
        updateData.location = profile.location.trim();
      }

      Object.keys(updateData).forEach(key => {
        if (updateData[key] === '') {
          delete updateData[key];
        }
      });

      if (userDoc.exists()) {
        await updateDoc(userRef, updateData);
      } else {
        await setDoc(userRef, {
          ...updateData,
          email: profile.email.trim() || auth.currentUser?.email || '',
          createdAt: new Date().toISOString(),
          emailVerified: auth.currentUser?.emailVerified || false,
          roles: ['guest']
        });
      }

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      await loadStats(user.uid);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'completed': return 'bg-blue-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };


  // Group wishes by listing
  const groupedWishes = filteredWishes.reduce((acc, wish) => {
    const title = wish.listingTitle || 'Unknown Listing';
    if (!acc[title]) {
      acc[title] = [];
    }
    acc[title].push(wish);
    return acc;
  }, {});

  // Guest bookings categorization
  const now = new Date();
  const upcomingGuestBookings = !isHost ? bookings.filter(b => {
    if (b.status === 'cancelled') return false;
    const checkIn = b.checkInDate;
    return checkIn >= now && b.status !== 'completed';
  }) : [];

  const pastGuestBookings = !isHost ? bookings.filter(b => {
    const checkOut = b.checkOutDate;
    return checkOut < now || b.status === 'completed';
  }) : [];

  const cancelledGuestBookings = !isHost ? bookings.filter(b => b.status === 'cancelled') : [];

  // Guest favorites filtering
  const tabTypeMap = {
    all: null,
    accommodations: 'accommodation',
    experiences: 'experience',
    services: 'service'
  };

  const filteredGuestFavorites = guestFavorites
    .filter(item => item && item.id && item.type)
    .filter(item => {
      if (favoritesFilter === 'all') return true;
      return item.type === (tabTypeMap[favoritesFilter] || favoritesFilter);
    });

  const favoritesTabCounts = {
    all: guestFavorites.length,
    accommodations: guestFavorites.filter(f => f?.type === 'accommodation').length,
    experiences: guestFavorites.filter(f => f?.type === 'experience').length,
    services: guestFavorites.filter(f => f?.type === 'service').length,
  };

  if (!user && !loading) {
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
        <div className="pt-36 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading account settings...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-36 pb-20 px-4 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">Manage your profile, bookings, and wishlist</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-border pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
              {/* Profile Header */}
              <div className="flex items-center gap-6 mb-8">
                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={!isEditing || uploadingImage}
                  />
                  {profile.profileImage ? (
                    <img
                      src={profile.profileImage}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center ${profile.profileImage ? 'hidden' : ''}`}
                  >
                    <User className="w-12 h-12 text-primary" />
                  </div>
                  <button 
                    onClick={() => {
                      if (!isEditing || uploadingImage) return;
                      fileInputRef.current?.click();
                    }}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isEditing || uploadingImage}
                    title={uploadingImage ? 'Uploading...' : 'Upload profile picture'}
                  >
                    {uploadingImage ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h2 className="font-heading text-2xl font-bold text-foreground">
                      {profile.firstName || profile.lastName 
                        ? `${profile.firstName} ${profile.lastName}`.trim()
                        : 'Guest User'
                      }
                    </h2>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium text-foreground">
                        {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                      </span>
                    </div>
                  </div>
                  {profile.joinDate && (
                    <p className="text-muted-foreground mb-2">{profile.joinDate}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {profile.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {profile.location}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (isEditing) {
                      setIsEditing(false);
                    } else {
                      setIsEditing(true);
                    }
                  }}
                  className="btn-outline flex items-center gap-2"
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {/* Stats - Only Reviews */}
              <div className="mb-8">
                <div 
                  className="card-listing p-6 text-center max-w-xs cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={async () => {
                    if (!user || stats.reviews === 0) return;
                    setShowUserReviewsModal(true);
                    setUserReviewsLoading(true);
                    try {
                      const reviews = await getUserReviews(user.uid);
                      setUserReviews(reviews);
                    } catch (error) {
                      console.error('Error loading user reviews:', error);
                      toast.error('Failed to load reviews');
                    } finally {
                      setUserReviewsLoading(false);
                    }
                  }}
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Star className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-heading text-2xl font-bold text-foreground mb-1">{stats.reviews.toString()}</p>
                  <p className="text-sm text-muted-foreground">Reviews {stats.reviews > 0 && <span className="text-primary">(Click to view)</span>}</p>
                </div>
              </div>

              {/* Profile Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">First Name</label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      disabled={!isEditing}
                      className={`w-full p-3 border border-border rounded-xl bg-background text-foreground ${!isEditing ? 'opacity-60' : ''}`}
                      placeholder="Enter first name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Last Name</label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      disabled={!isEditing}
                      className={`w-full p-3 border border-border rounded-xl bg-background text-foreground ${!isEditing ? 'opacity-60' : ''}`}
                      placeholder="Enter last name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      disabled={!isEditing}
                      className={`w-full p-3 border border-border rounded-xl bg-background text-foreground ${!isEditing ? 'opacity-60' : ''}`}
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                    <div className="flex gap-2">
                      <select
                        value={profile.phoneCountryCode}
                        onChange={(e) => setProfile({ ...profile, phoneCountryCode: e.target.value })}
                        disabled={!isEditing}
                        className={`w-32 p-3 border border-border rounded-xl bg-background text-foreground ${!isEditing ? 'opacity-60' : ''}`}
                      >
                        <option value="+1">+1 (US/CA)</option>
                        <option value="+44">+44 (UK)</option>
                        <option value="+63">+63 (PH)</option>
                        <option value="+61">+61 (AU)</option>
                        <option value="+86">+86 (CN)</option>
                        <option value="+81">+81 (JP)</option>
                        <option value="+82">+82 (KR)</option>
                        <option value="+65">+65 (SG)</option>
                        <option value="+60">+60 (MY)</option>
                        <option value="+66">+66 (TH)</option>
                        <option value="+62">+62 (ID)</option>
                        <option value="+84">+84 (VN)</option>
                        <option value="+33">+33 (FR)</option>
                        <option value="+49">+49 (DE)</option>
                        <option value="+39">+39 (IT)</option>
                        <option value="+34">+34 (ES)</option>
                        <option value="+31">+31 (NL)</option>
                        <option value="+32">+32 (BE)</option>
                        <option value="+41">+41 (CH)</option>
                        <option value="+43">+43 (AT)</option>
                        <option value="+46">+46 (SE)</option>
                        <option value="+47">+47 (NO)</option>
                        <option value="+45">+45 (DK)</option>
                        <option value="+358">+358 (FI)</option>
                        <option value="+351">+351 (PT)</option>
                        <option value="+30">+30 (GR)</option>
                        <option value="+48">+48 (PL)</option>
                        <option value="+7">+7 (RU)</option>
                        <option value="+91">+91 (IN)</option>
                        <option value="+971">+971 (AE)</option>
                        <option value="+966">+966 (SA)</option>
                        <option value="+20">+20 (EG)</option>
                        <option value="+27">+27 (ZA)</option>
                        <option value="+234">+234 (NG)</option>
                        <option value="+55">+55 (BR)</option>
                        <option value="+52">+52 (MX)</option>
                        <option value="+54">+54 (AR)</option>
                        <option value="+56">+56 (CL)</option>
                        <option value="+57">+57 (CO)</option>
                        <option value="+51">+51 (PE)</option>
                        <option value="+58">+58 (VE)</option>
                        <option value="+64">+64 (NZ)</option>
                      </select>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => {
                          // Allow only digits, spaces, hyphens, and parentheses
                          const value = e.target.value.replace(/[^\d\s\-\(\)]/g, '');
                          setProfile({ ...profile, phone: value });
                        }}
                        disabled={!isEditing}
                        className={`flex-1 p-3 border border-border rounded-xl bg-background text-foreground ${!isEditing ? 'opacity-60' : ''}`}
                        placeholder="Enter phone number"
                      />
                    </div>
                    {profile.phoneCountryCode && profile.phone && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Full number: {profile.phoneCountryCode}{profile.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Gender</label>
                    <select
                      value={profile.gender}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      disabled={!isEditing}
                      className={`w-full p-3 border border-border rounded-xl bg-background text-foreground ${!isEditing ? 'opacity-60' : ''}`}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Birthday</label>
                    <input
                      type="date"
                      value={profile.birthday}
                      onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
                      disabled={!isEditing}
                      max={new Date().toISOString().split('T')[0]}
                      className={`w-full p-3 border border-border rounded-xl bg-background text-foreground ${!isEditing ? 'opacity-60' : ''}`}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Address</label>
                    <input
                      type="text"
                      value={profile.residentialAddress || profile.location || ''}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      disabled={!isEditing || !!profile.residentialAddress}
                      className={`w-full p-3 border border-border rounded-xl bg-background text-foreground ${!isEditing || profile.residentialAddress ? 'opacity-60' : ''}`}
                      placeholder={profile.residentialAddress ? "Address from your listings" : "Enter your address"}
                      title={profile.residentialAddress ? "This address is automatically populated from your listings" : ""}
                    />
                    {profile.residentialAddress && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Address automatically loaded from your listings
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      disabled={!isEditing}
                      rows={4}
                      className={`w-full p-3 border border-border rounded-xl bg-background text-foreground resize-none ${!isEditing ? 'opacity-60' : ''}`}
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  {/* PayPal Payment Information */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <label className="text-base font-semibold text-foreground">Payment Information</label>
                    </div>
                    
                    {profile.paypalEmail || profile.paymentMethod ? (
                      <div className="space-y-3">
                        {/* PayPal Email Card */}
                        {profile.paypalEmail && (
                          <div className="relative p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">PayPal Email</p>
                                  <p className="text-sm font-medium text-foreground break-all">{profile.paypalEmail}</p>
                                </div>
                              </div>
                              {profile.paypalStatus === 'connected' && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 dark:bg-green-500/30 rounded-full">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                  <span className="text-xs font-medium text-green-700 dark:text-green-300">Connected</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Payment Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {profile.paymentMethod && (
                            <div className="p-4 bg-muted/50 rounded-xl border border-border">
                              <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                <p className="text-xs font-medium text-muted-foreground">Payment Method</p>
                              </div>
                              <p className="text-sm font-semibold text-foreground capitalize">{profile.paymentMethod}</p>
                            </div>
                          )}
                          
                          {profile.paymentType && (
                            <div className="p-4 bg-muted/50 rounded-xl border border-border">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <p className="text-xs font-medium text-muted-foreground">Payment Plan</p>
                              </div>
                              <p className="text-sm font-semibold text-foreground capitalize">{profile.paymentType}</p>
                            </div>
                          )}
                          
                          {profile.paymentStatus && (
                            <div className="p-4 bg-muted/50 rounded-xl border border-border">
                              <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-4 h-4 text-muted-foreground" />
                                <p className="text-xs font-medium text-muted-foreground">Payment Status</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold capitalize ${
                                  profile.paymentStatus === 'active' 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-muted-foreground'
                                }`}>
                                  {profile.paymentStatus}
                                </span>
                                {profile.paymentStatus === 'active' && (
                                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                )}
                              </div>
                            </div>
                          )}
                          
                          {profile.paypalConnectedAt && (
                            <div className="p-4 bg-muted/50 rounded-xl border border-border">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <p className="text-xs font-medium text-muted-foreground">Connected Date</p>
                              </div>
                              <p className="text-sm font-semibold text-foreground">
                                {profile.paypalConnectedAt.toDate ? 
                                  format(profile.paypalConnectedAt.toDate(), 'MMM dd, yyyy') : 
                                  format(new Date(profile.paypalConnectedAt), 'MMM dd, yyyy')
                                }
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Last Payment Email */}
                        {profile.lastPayPalPayerEmail && profile.lastPayPalPayerEmail !== profile.paypalEmail && (
                          <div className="p-4 bg-muted/50 rounded-xl border border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <p className="text-xs font-medium text-muted-foreground">Last Payment Email</p>
                            </div>
                            <p className="text-sm font-medium text-foreground break-all">{profile.lastPayPalPayerEmail}</p>
                          </div>
                        )}
                        
                        {/* Transaction ID */}
                        {profile.lastPayPalTransactionId && (
                          <div className="p-4 bg-muted/50 rounded-xl border border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <Ticket className="w-4 h-4 text-muted-foreground" />
                              <p className="text-xs font-medium text-muted-foreground">Last Transaction ID</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-mono text-foreground break-all">{profile.lastPayPalTransactionId}</p>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(profile.lastPayPalTransactionId);
                                  toast.success('Transaction ID copied to clipboard');
                                }}
                                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                                title="Copy transaction ID"
                              >
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 bg-muted/30 rounded-xl border border-dashed border-border text-center">
                        <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">No payment information available</p>
                        <p className="text-xs text-muted-foreground mt-1">Connect your PayPal account to see payment details</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn-outline"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="btn-primary flex items-center gap-2"
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}

              {/* Deactivate or Delete Account Section */}
              <div className="mt-12 pt-8 border-t border-border">
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Deactivate or Delete Account</h3>
                  <p className="text-muted-foreground mb-6">
                    If you no longer wish to use this account, you can deactivate it temporarily or permanently delete it. 
                    Deactivating will hide your account but preserve your data, while deleting will permanently remove all your information.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => {
                        const confirmed = window.confirm(
                          'Are you sure you want to deactivate your account? Your account will be hidden but your data will be preserved. You can reactivate it later by logging in.'
                        );
                        if (confirmed) {
                          toast.info('Account deactivation feature coming soon');
                        }
                      }}
                      className="btn-outline border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Deactivate Account
                    </button>
                    <button
                      onClick={() => {
                        const confirmed = window.confirm(
                          '⚠️ WARNING: This will permanently delete your account and all associated data. This action cannot be undone.\n\nAre you absolutely sure you want to delete your account?'
                        );
                        if (confirmed) {
                          const doubleConfirm = window.confirm(
                            'This is your last chance. Clicking OK will permanently delete your account. Are you certain?'
                          );
                          if (doubleConfirm) {
                            toast.error('Account deletion feature coming soon. Please contact support for assistance.');
                          }
                        }
                      }}
                      className="btn-outline border-red-500 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-600 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bookings Tab - Guest Bookings or Host Bookings */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            {bookingsLoading ? (
              <div className="text-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading your bookings...</p>
              </div>
            ) : isHost ? (
              // Host Bookings
              bookings.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground mb-2">Bookings</h2>
                    {/* View Toggle */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setBookingView('grid')}
                        className={`p-2 rounded transition-colors ${
                          bookingView === 'grid'
                            ? 'bg-primary text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                        title="Grid view"
                      >
                        <Grid className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setBookingView('list')}
                        className={`p-2 rounded transition-colors ${
                          bookingView === 'list'
                            ? 'bg-primary text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                        title="List view"
                      >
                        <List className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex gap-8">
                        {[
                          { key: 'all', label: 'All' },
                          { key: 'pending', label: 'Pending' },
                          { key: 'confirmed', label: 'Confirmed' },
                          { key: 'completed', label: 'Completed' },
                          { key: 'cancelled', label: 'Cancelled' }
                        ].map(tab => {
                          const count = tab.key === 'all'
                            ? bookings.length
                            : bookings.filter(b => b.status === tab.key).length;
                          return (
                            <button
                              key={tab.key}
                              className={`relative pb-2 text-base font-medium border-b-2 transition-colors ${
                                bookingTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-gray-700 hover:text-primary'
                              }`}
                              onClick={() => setBookingTab(tab.key)}
                            >
                              {tab.label} <span className="text-sm text-muted-foreground">({count})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {bookingView === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(bookingTab === 'all' ? bookings : bookings.filter(b => b.status === bookingTab)).map((booking) => {
                          const listing = listings.find(l => l.id === booking.listingId);
                          
                          return (
                            <div key={booking.id} className="card-listing hover-lift border border-gray-200 rounded-lg overflow-hidden">
                              {/* Image */}
                              <div className="relative w-full overflow-hidden rounded-t-2xl aspect-[4/3]">
                                {listing?.mainImage ? (
                                  <img
                                    src={listing.mainImage}
                                    alt={listing?.title || 'Listing'}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                    <CalendarIcon className="w-12 h-12 text-gray-400" />
                                  </div>
                                )}
                                <div className="absolute top-3 right-3">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    booking.status === 'confirmed' ? 'bg-green-500 text-white' :
                                    booking.status === 'completed' ? 'bg-blue-500 text-white' :
                                    booking.status === 'cancelled' ? 'bg-red-500 text-white' :
                                    'bg-yellow-500 text-white'
                                  }`}>
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Content */}
                              <div className="p-4">
                                <h3 className="font-heading text-lg font-semibold text-foreground mb-1 line-clamp-1">
                                  {listing?.title || `Listing ${booking.listingId}`}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                                  {booking.guestEmail || 'Guest'}
                                </p>
                                
                                <div className="space-y-2 mb-3 text-xs text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <CalendarIcon className="w-3 h-3 text-primary" />
                                    <span>{booking.checkInFormatted} - {booking.checkOutFormatted}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Users className="w-3 h-3 text-primary" />
                                    <span>{booking.guests || 1} guest{(booking.guests || 1) > 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-primary" />
                                    <span>Booked {booking.createdAtFormatted}</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-border mb-3">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Total</p>
                                    <p className="text-lg font-bold text-foreground">₱{(booking.totalPrice || 0).toLocaleString()}</p>
                                  </div>
                                </div>

                                {/* Actions */}
                                {booking.status === 'pending' && (
                                  <div className="flex gap-2">
                                    <button
                                      className="btn-primary flex-1 px-4 py-2 text-sm font-medium"
                                      onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      className="btn-outline flex-1 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:border-red-300"
                                      onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                    >
                                      Decline
                                    </button>
                                  </div>
                                )}
                                {booking.status === 'confirmed' && (
                                  <button
                                    className="btn-outline w-full px-4 py-2 text-sm font-medium"
                                    onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                                  >
                                    Mark Complete
                                  </button>
                                )}
                                {booking.status === 'completed' && (
                                  <span className="text-sm text-green-600 font-medium block text-center">✓ Completed</span>
                                )}
                                {booking.status === 'cancelled' && (
                                  <span className="text-sm text-red-600 font-medium block text-center">✕ Cancelled</span>
                                )}
                                
                                {booking.guestId && (
                                  <button
                                    onClick={async () => {
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
                                    }}
                                    className="btn-outline w-full px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 mt-2"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                    Message Guest
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(bookingTab === 'all' ? bookings : bookings.filter(b => b.status === bookingTab)).map((booking) => {
                          const listing = listings.find(l => l.id === booking.listingId);
                          
                          return (
                            <div key={booking.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-heading text-lg font-semibold text-foreground">
                                          {booking.guestEmail || 'Guest'}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                          booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                          booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                          'bg-yellow-100 text-yellow-700'
                                        }`}>
                                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                        </span>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-2">
                                        Listing: {listing?.title || `Listing ${booking.listingId}`}
                                      </p>
                                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <CalendarIcon className="w-4 h-4" />
                                          <span>{booking.checkInFormatted} - {booking.checkOutFormatted}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Users className="w-4 h-4" />
                                          <span>{booking.guests || 1} guest{(booking.guests || 1) > 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-4 h-4" />
                                          <span>Booked {booking.createdAtFormatted}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-sm text-muted-foreground">Total Price:</span>
                                      <span className="font-heading text-xl font-bold text-foreground">
                                        ₱{(booking.totalPrice || 0).toLocaleString()}
                                      </span>
                                    </div>
                                    {booking.guestId && (
                                      <button
                                        onClick={async () => {
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
                                        }}
                                        className="btn-outline px-4 py-2 text-sm font-medium flex items-center gap-2 mt-2 w-full"
                                      >
                                        <MessageSquare className="w-4 h-4" />
                                        Message Guest
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-4 flex flex-col gap-2">
                                  {booking.status === 'pending' && (
                                    <>
                                      <button
                                        className="btn-primary px-4 py-2 text-sm font-medium"
                                        onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        className="btn-outline px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:border-red-300"
                                        onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                      >
                                        Decline
                                      </button>
                                    </>
                                  )}
                                  {booking.status === 'confirmed' && (
                                    <button
                                      className="btn-outline px-4 py-2 text-sm font-medium"
                                      onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                                    >
                                      Mark Complete
                                    </button>
                                  )}
                                  {booking.status === 'completed' && (
                                    <span className="text-sm text-green-600 font-medium">✓ Completed</span>
                                  )}
                                  {booking.status === 'cancelled' && (
                                    <span className="text-sm text-red-600 font-medium">✕ Cancelled</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow p-8">
                  <div className="text-center py-16">
                    <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" strokeWidth={2} />
                    <div className="text-lg font-medium mb-2">No bookings yet.</div>
                    <div className="text-gray-500 text-center">When guests book your listings, they will appear here.</div>
                  </div>
                </div>
              )
            ) : (
              // Guest Bookings
              <>
                {/* Upcoming Bookings */}
                {upcomingGuestBookings.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-heading font-semibold mb-6">Upcoming</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {upcomingGuestBookings.map((booking) => (
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
                {pastGuestBookings.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-heading font-semibold mb-6">Past Bookings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pastGuestBookings.map((booking) => (
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
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // Check if review already exists
                                    const existingReview = await getReviewByBookingId(booking.id);
                                    if (existingReview) {
                                      // Already reviewed
                                      return;
                                    }
                                    setSelectedBookingForReview(booking);
                                    setShowReviewModal(true);
                                  }}
                                >
                                  {booking.reviewed ? 'Reviewed' : 'Review'}
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
                {cancelledGuestBookings.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-heading font-semibold mb-6">Cancelled</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {cancelledGuestBookings.map((booking) => (
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
                {bookings.length === 0 && !bookingsLoading && (
                  <div className="text-center py-20">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-heading font-semibold mb-2">No bookings yet</h2>
                    <p className="text-muted-foreground mb-6">Start exploring accommodations and make your first reservation!</p>
                    <button className="btn-primary" onClick={() => navigate('/accommodations')}>
                      Browse Accommodations
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Wishlist Tab - Guest Favorites or Host Wishlists */}
        {activeTab === "wishlist" && (
          <div className="space-y-6">
            {isHost ? (
              wishlistLoading ? (
                <div className="text-center py-20">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading wishes...</p>
                </div>
              ) : (
                <>
                  {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">Total Wishes</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{wishes.length}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600 mt-1">
                      {wishes.filter(w => w.status === 'pending').length}
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">Read</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {wishes.filter(w => w.status === 'read').length}
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">Addressed</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {wishes.filter(w => w.status === 'addressed').length}
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search wishes, guests, or listings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="pl-10 pr-8 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="read">Read</option>
                        <option value="addressed">Addressed</option>
                      </select>
                    </div>
                    <div>
                      <select
                        value={filterListing}
                        onChange={(e) => setFilterListing(e.target.value)}
                        className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
                      >
                        <option value="all">All Listings</option>
                        {wishlistListings.map((listing, index) => (
                          <option key={index} value={listing}>{listing}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Wishes List */}
                {filteredWishes.length === 0 ? (
                  <div className="text-center py-12 bg-card border border-border rounded-xl">
                    <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No wishes yet</h3>
                    <p className="text-muted-foreground">
                      {wishes.length === 0
                        ? "Guests haven't submitted any wishes for your listings yet."
                        : "No wishes match your current filters."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(groupedWishes).map(([listingTitle, listingWishes]) => (
                      <div key={listingTitle} className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-6 py-4 border-b border-border">
                          <div className="flex items-center justify-between">
                            <h2 className="font-heading text-xl font-bold text-foreground">
                              {listingTitle}
                            </h2>
                            <span className="text-sm text-muted-foreground">
                              {listingWishes.length} {listingWishes.length === 1 ? 'wish' : 'wishes'}
                            </span>
                          </div>
                        </div>
                        <div className="divide-y divide-border">
                          {listingWishes.map((wish) => (
                            <div key={wish.id} className="p-6 hover:bg-muted/50 transition-colors">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center text-white font-semibold">
                                    {wish.guestName ? wish.guestName[0].toUpperCase() : 'G'}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-foreground">{wish.guestName}</p>
                                    <p className="text-sm text-muted-foreground">{wish.guestEmail}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(wish.status)}
                                  <span className="text-sm text-muted-foreground">
                                    {formatDate(wish.createdAt)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-foreground leading-relaxed mb-4 pl-13">
                                "{wish.wish}"
                              </p>
                              <div className="flex items-center gap-2 pl-13 flex-wrap">
                                {wish.status === 'pending' && (
                                  <button
                                    onClick={() => updateWishStatus(wish.listingId, wish.id, 'read')}
                                    className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                  >
                                    Mark as Read
                                  </button>
                                )}
                                {wish.status === 'read' && (
                                  <button
                                    onClick={() => updateWishStatus(wish.listingId, wish.id, 'addressed')}
                                    className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                  >
                                    Mark as Addressed
                                  </button>
                                )}
                                {wish.status === 'addressed' && (
                                  <button
                                    onClick={() => updateWishStatus(wish.listingId, wish.id, 'pending')}
                                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                  >
                                    Mark as Pending
                                  </button>
                                )}
                                <button
                                  onClick={() => navigateToListing(wish.listingId, wish.listingType)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  View Listing
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </>
              )
            ) : (
              // Guest Favorites
              <>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                  <div className="flex items-center gap-2 border-b border-border">
                    {['all', 'accommodations', 'experiences', 'services'].map(type => (
                      <button
                        key={type}
                        onClick={() => setFavoritesFilter(type)}
                        className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                          favoritesFilter === type
                            ? 'border-primary text-primary font-semibold'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)} ({favoritesTabCounts[type]})
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
                    <button 
                      onClick={() => setFavoritesViewMode('grid')} 
                      className={`p-2 rounded-lg transition-colors ${
                        favoritesViewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Grid className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setFavoritesViewMode('list')} 
                      className={`p-2 rounded-lg transition-colors ${
                        favoritesViewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {filteredGuestFavorites.length > 0 ? (
                  favoritesViewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredGuestFavorites.map(item => (
                        <div
                          key={`${item.id}-${item.type}`}
                          className="card-listing cursor-pointer"
                          onClick={() => navigate(`/${item.type}s/${item.id}`)}
                        >
                          <div className="relative w-full overflow-hidden rounded-lg aspect-[4/3]">
                            <img 
                              src={item.image || item.images?.[0] || '/placeholder-image.jpg'} 
                              alt={item.title} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = '/placeholder-image.jpg';
                              }}
                            />
                            <div className="absolute top-4 right-4 flex gap-2" onClick={e => e.stopPropagation()}>
                              <FavoriteButton
                                item={item}
                                user={user}
                                isFavorite={guestFavorites.some(fav => fav?.id === item.id && fav?.type === item.type)}
                                onRequireLogin={() => {}}
                                onToggle={() => toggleFavorite(item)}
                              />
                            </div>
                          </div>
                          <div className="p-6">
                            <h3 className="font-heading text-xl font-semibold text-foreground">{item.title}</h3>
                            <p className="font-body text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-4 h-4" /> {item.location}
                            </p>
                            <div className="flex justify-between mt-2">
                              <span className="font-heading text-2xl font-bold text-foreground">
                                ₱{item.price ? item.price.toLocaleString() : '0'}
                              </span>
                              {item.savedDate && (
                                <span className="text-xs text-muted-foreground">Saved {item.savedDate}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredGuestFavorites.map(item => (
                        <div
                          key={`${item.id}-${item.type}`}
                          className="card-listing hover-lift cursor-pointer"
                          onClick={() => navigate(`/${item.type}s/${item.id}`)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="relative flex-shrink-0 w-36 h-36 overflow-hidden rounded-lg">
                              <img 
                                src={item.image || item.images?.[0] || '/placeholder-image.jpg'} 
                                alt={item.title} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = '/placeholder-image.jpg';
                                }}
                              />
                              <div className="absolute top-2 right-2 flex gap-1">
                                <FavoriteButton
                                  item={item}
                                  user={user}
                                  isFavorite={guestFavorites.some(fav => fav?.id === item.id && fav?.type === item.type)}
                                  onRequireLogin={() => {}}
                                  onToggle={() => toggleFavorite(item)}
                                />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-heading text-lg font-semibold text-foreground">{item.title}</h3>
                              <p className="font-body text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="w-4 h-4" /> {item.location}
                              </p>
                              <span className="text-sm text-muted-foreground mt-2 block">
                                ₱{item.price ? item.price.toLocaleString() : '0'}
                              </span>
                              {item.savedDate && (
                                <span className="text-xs text-muted-foreground">Saved {item.savedDate}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="text-center py-16">
                    <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-center text-lg">No favorites yet.</p>
                    <p className="text-muted-foreground mt-6">Start exploring and save your favorite accommodations, services, and experiences</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Coupon Tab - Host only */}
        {activeTab === "coupon" && isHost && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground mb-2">Coupons & Discounts</h2>
                <p className="text-muted-foreground">Create and manage discount codes for your listings</p>
              </div>
              <button
                onClick={() => {
                  setEditingCoupon(null);
                  setShowCouponModal(true);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Coupon
              </button>
            </div>

            {couponsLoading ? (
              <div className="text-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading coupons...</p>
              </div>
            ) : coupons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="card-listing border border-border rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-heading text-lg font-semibold text-foreground">{coupon.code}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{coupon.description || 'No description'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingCoupon(coupon);
                            setShowCouponModal(true);
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Discount:</span>
                        <span className="font-semibold text-foreground">
                          {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₱${coupon.discountValue}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          coupon.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {coupon.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {coupon.validUntil && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Valid until:</span>
                          <span className="text-sm text-foreground">{format(new Date(coupon.validUntil), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(coupon.code);
                        toast.success('Coupon code copied to clipboard!');
                      }}
                      className="btn-outline w-full flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Code
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card border border-border rounded-xl">
                <Ticket className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No coupons yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create discount codes to attract more guests and boost your bookings.
                </p>
                <button
                  onClick={() => {
                    setEditingCoupon(null);
                    setShowCouponModal(true);
                  }}
                  className="btn-primary flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Coupon
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
      {showLoginModal && <LogIn isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />}
      {showReviewModal && selectedBookingForReview && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedBookingForReview(null);
          }}
          listingId={selectedBookingForReview.listingId}
          listingTitle={selectedBookingForReview.listingTitle}
          bookingId={selectedBookingForReview.id}
          onSubmit={async (reviewData) => {
            await createReview(reviewData);
            // Reload bookings to update reviewed status
            const updatedBookings = bookings.map(b => 
              b.id === selectedBookingForReview.id ? { ...b, reviewed: true } : b
            );
            setBookings(updatedBookings);
            // Reload stats to update review count
            if (user) {
              await loadStats(user.uid);
            }
          }}
        />
      )}
      {/* Coupon Modal */}
      {showCouponModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowCouponModal(false);
            setEditingCoupon(null);
          }}
        >
          <CouponModal
            isOpen={showCouponModal}
            onClose={() => {
              setShowCouponModal(false);
              setEditingCoupon(null);
            }}
            coupon={editingCoupon}
            onSave={async () => {
              await loadCoupons();
              setShowCouponModal(false);
              setEditingCoupon(null);
            }}
          />
        </div>
      )}
      {/* User Reviews Modal */}
      {showUserReviewsModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowUserReviewsModal(false)}
        >
          <div
            className="bg-white border border-border rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground">My Reviews</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {userReviews.length} {userReviews.length === 1 ? 'review' : 'reviews'} across all listings
                </p>
              </div>
              <button
                onClick={() => setShowUserReviewsModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Reviews List */}
            <div className="p-6">
              {userReviewsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="ml-3 text-muted-foreground">Loading reviews...</span>
                </div>
              ) : userReviews.length > 0 ? (
                <div className="space-y-6">
                  {userReviews.map((review) => (
                    <div key={review.id} className="border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {review.reviewerImage ? (
                              <img
                                src={review.reviewerImage}
                                alt={review.reviewerName}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <span>{review.reviewerName?.[0]?.toUpperCase() || 'U'}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-heading text-lg font-semibold text-foreground">
                                {review.listingTitle || 'Unknown Listing'}
                              </h3>
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                                {review.listingCategory || 'accommodation'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
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
                              <span className="text-sm text-muted-foreground">
                                {review.createdAt ? format(review.createdAt, 'MMM dd, yyyy') : 'Recently'}
                              </span>
                            </div>
                            <p className="text-foreground leading-relaxed mt-3">
                              {review.comment}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border">
                        <button
                          onClick={() => {
                            const categoryPath = review.listingCategory === 'accommodation' ? 'accommodations' :
                                                 review.listingCategory === 'experience' ? 'experiences' :
                                                 review.listingCategory === 'service' ? 'services' : 'accommodations';
                            navigate(`/${categoryPath}/${review.listingId}`);
                            setShowUserReviewsModal(false);
                          }}
                          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Listing
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No reviews yet</h3>
                  <p className="text-muted-foreground mb-6">
                    You haven't reviewed any listings yet. Reviews help others make better decisions!
                  </p>
                  <button
                    onClick={() => {
                      setShowUserReviewsModal(false);
                      setActiveTab('bookings');
                    }}
                    className="btn-primary"
                  >
                    Go to Bookings
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
