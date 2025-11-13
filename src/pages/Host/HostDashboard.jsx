import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { toast } from '@/components/ui/sonner';
import { startConversationFromHost } from '@/pages/Guest/services/messagingService';
import { getUserDrafts, deleteDraft, getDraftSummary } from '@/pages/Host/services/draftService';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import {
  Home, Calendar as CalendarIcon, MessageSquare, DollarSign, Plus,
  TrendingUp, Eye, Star, Users, Clock, MapPin, Camera,
  Bed, Bath, Edit, Check, X, EyeOff, Trash2, User, Award, Send, Wallet
} from 'lucide-react';

import { Home as HomeIcon, Grid, List } from 'lucide-react';
import HostTypeModal from '@/components/HostTypeModal';
import { OnboardingProvider } from '@/pages/Host/contexts/OnboardingContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'accommodation', label: 'Accommodations' },
  { key: 'experience', label: 'Experiences' },
  { key: 'service', label: 'Services' },
];

const HostDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false);
  const [listingToUnpublish, setListingToUnpublish] = useState(null);
  const [listings, setListings] = useState([]); // Active/published listings
  const [unpublishedListings, setUnpublishedListings] = useState([]); // Unpublished listings
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [draftTab, setDraftTab] = useState('all');
  const [listingTab, setListingTab] = useState('all');
  const [unpublishedTab, setUnpublishedTab] = useState('all');
  const [draftView, setDraftView] = useState('grid');
  const [listingView, setListingView] = useState('grid');
  const [bookingView, setBookingView] = useState('grid'); // 'grid' or 'list'
  const [showHostTypeModal, setShowHostTypeModal] = useState(false);
  const [forceHostTypeSelection, setForceHostTypeSelection] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingTab, setBookingTab] = useState('all'); // all, pending, confirmed, completed, cancelled
  const [userProfile, setUserProfile] = useState(null); // Store user profile data
  const [hostPoints, setHostPoints] = useState(0); // Host points
  const [pointsHistory, setPointsHistory] = useState([]); // Points history
  const [showPointsHistoryModal, setShowPointsHistoryModal] = useState(false); // Points history modal
  const [showCashOutPointsModal, setShowCashOutPointsModal] = useState(false); // Cash out points modal
  const [cashOutPointsAmount, setCashOutPointsAmount] = useState(''); // Points to cash out
  const [isProcessingCashOut, setIsProcessingCashOut] = useState(false); // Cash out processing state
  const [earningsHistory, setEarningsHistory] = useState([]); // Earnings history from wallet
  const [showEarningsHistoryModal, setShowEarningsHistoryModal] = useState(false); // Earnings history modal
  const [totalEarningsFromWallet, setTotalEarningsFromWallet] = useState(0); // Total earnings from wallet transactions
  const [isLoadingEarningsHistory, setIsLoadingEarningsHistory] = useState(false);

  // Calculate stats (will update when bookings/listings change)
  const totalBookings = bookings.length;
  // Use earnings from wallet transactions (released by admin) instead of calculating from bookings
  const totalEarnings = totalEarningsFromWallet;

  // Points to currency conversion rate (10 points = ₱1)
  const POINTS_TO_CURRENCY_RATE = 10;
  const pointsCurrencyValue = (hostPoints / POINTS_TO_CURRENCY_RATE).toFixed(2);

  const stats = [
    { icon: Home, label: "Active Listings", value: listings.length.toString(), change: "", clickable: false, type: 'listings' },
    { icon: CalendarIcon, label: "Bookings", value: totalBookings.toString(), change: "", clickable: false, type: 'bookings' },
    { icon: DollarSign, label: "Earnings", value: `₱${totalEarnings.toLocaleString()}`, change: "Released by admin", clickable: true, type: 'earnings' },
    { icon: Award, label: "Points", value: hostPoints.toLocaleString(), change: `≈ ₱${parseFloat(pointsCurrencyValue).toLocaleString()}`, clickable: true, type: 'points' }
  ];

  // Load earnings history from wallet transactions
  const loadEarningsHistory = async (userId) => {
    try {
      setIsLoadingEarningsHistory(true);
      const { getWalletTransactions } = await import('@/pages/Common/services/getpayService');
      const transactions = await getWalletTransactions(userId, 1000); // Get more transactions to filter
      
      console.log(`💰 Loaded ${transactions.length} total transactions for host ${userId}`);
      
      // Filter for host earnings transactions (type: 'credit' with paymentType: 'host_earnings')
      const earningsTransactions = transactions.filter(t => {
        const isCredit = t.type === 'credit';
        const isHostEarnings = t.metadata?.paymentType === 'host_earnings';
        return isCredit && isHostEarnings;
      });
      
      console.log(`✅ Found ${earningsTransactions.length} earnings transactions`);
      
      // Sort by date (newest first)
      earningsTransactions.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateB - dateA;
      });
      
      // Calculate total earnings
      const total = earningsTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      setTotalEarningsFromWallet(total);
      setEarningsHistory(earningsTransactions);
    } catch (error) {
      console.error('❌ Error loading earnings history:', error);
      setEarningsHistory([]);
      setTotalEarningsFromWallet(0);
    } finally {
      setIsLoadingEarningsHistory(false);
    }
  };

  // Load user profile data
  const loadUserProfile = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile(userData);
        setHostPoints(userData.points || 0);
        setPointsHistory(userData.pointsHistory || []);

        // Load earnings history from wallet transactions
        await loadEarningsHistory(userId);

        // Check and award birthday points if today is birthday
        if (userData.birthday) {
          try {
            const { awardBirthdayPoints } = await import('@/pages/Host/services/pointsService');
            const result = await awardBirthdayPoints(userId, userData.birthday);
            if (result.success) {
              toast.success(`🎉 Happy Birthday! You've earned ${result.points} points!`);
              // Reload points to show updated value
              const updatedUserDoc = await getDoc(doc(db, 'users', userId));
              if (updatedUserDoc.exists()) {
                const updatedData = updatedUserDoc.data();
                setHostPoints(updatedData.points || 0);
                setPointsHistory(updatedData.pointsHistory || []);
              }
            }
          } catch (birthdayError) {
            console.error('Error checking birthday points:', birthdayError);
            // Don't block profile loading if birthday check fails
          }
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  useEffect(() => {
    let unsubscribePoints = null;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        loadUserProfile(user.uid); // Load user profile
        loadDrafts(); // This will also load listings
        loadBookings(); // Load bookings
        
        // Set up real-time listener for points updates
        const userRef = doc(db, 'users', user.uid);
        unsubscribePoints = onSnapshot(userRef, async (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            setHostPoints(userData.points || 0);
            setUserProfile(userData);
            setPointsHistory(userData.pointsHistory || []);

            // Check birthday once per day (only on first load, not on every snapshot update)
            // This prevents spam checking, we'll check it when profile loads
          }
        }, (error) => {
          console.error('Error listening to user points:', error);
        });
      } else {
        setDrafts([]);
        setListings([]);
        setBookings([]);
        setUserProfile(null);
        setHostPoints(0);
        setLoading(false);
      }
    });
    
    return () => {
      unsubscribe();
      if (unsubscribePoints) {
        unsubscribePoints();
      }
    };
  }, []);

  const [draftToastShown, setDraftToastShown] = useState(false);
  useEffect(() => {
    if (location.state?.draftSaved && !draftToastShown) {
      toast('Draft saved successfully!');
      setDraftToastShown(true);
      // Remove draftSaved from state so toast only shows once
      const { draftSaved, ...rest } = location.state;
      window.history.replaceState({ ...rest }, document.title);
    }
  }, [location.state, toast, draftToastShown]);
  const draftToastShownRef = useRef(false);
  useEffect(() => {
    if (location.state?.draftSaved && !draftToastShownRef.current) {
      toast('Draft saved successfully!');
      draftToastShownRef.current = true;
      // Remove draftSaved from state so toast only shows once
      const { draftSaved, ...rest } = location.state;
      window.history.replaceState({ ...rest }, document.title);
    }
    return () => {
      draftToastShownRef.current = false;
    };
  }, [location.state, toast]);

  // Calculate progress percentage based on current step
  const calculateProgress = (currentStep) => {
    const stepOrder = [
      'hostingsteps', 'propertydetails', 'propertystructure', 'privacytype', 'location',
      'locationconfirmation', 'propertybasics', 'makeitstandout', 'amenities',
      'photos', 'titledescription', 'description',
      'descriptiondetails', 'finishsetup', 'bookingsettings', 'guestselection',
      'pricing', 'weekendpricing', 'discounts', 'safetydetails', 'finaldetails', 'payment'
    ];

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex === -1) {
      console.warn('⚠️ HostDashboard: currentStep not found in stepOrder:', currentStep, 'Available steps:', stepOrder);
      return 0;
    }
    const progress = Math.round(((currentIndex + 1) / stepOrder.length) * 100);
    console.log('📊 HostDashboard: Progress calculation for', currentStep, '- Index:', currentIndex, 'Total steps:', stepOrder.length, 'Progress:', progress + '%');
    return progress;
  };

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const userDrafts = await getUserDrafts();
      console.log('📦 HostDashboard: Raw drafts from Firebase:', userDrafts);
      
      // Transform drafts to include properly formatted data from Firebase structure
      const transformedDrafts = userDrafts.map(draft => {
        // Firebase structure: { id, userId, status, currentStep, category, lastModified, createdAt, data: {...} }
        // All form data is nested under 'data' object
        const data = draft.data || {};
        
        console.log('📋 Processing draft:', draft.id, {
          hasData: !!draft.data,
          dataKeys: draft.data ? Object.keys(draft.data) : [],
          currentStep: draft.currentStep,
          category: draft.category
        });
        
        // Extract title from data.title or top-level title (fallback for backward compatibility)
        const title = data.title || draft.title || 'Untitled Draft';
        
        // Extract location from data.locationData (Firebase stores it here)
        const locationData = data.locationData || {};
        let location = 'No location';
        let locationCity = '';
        let locationArea = '';
        
        if (locationData && typeof locationData === 'object') {
          if (locationData.city && locationData.province) {
            location = `${locationData.city}, ${locationData.province}`;
            locationCity = locationData.city;
            locationArea = locationData.province;
          } else if (locationData.city) {
            location = locationData.city;
            locationCity = locationData.city;
          } else if (locationData.country) {
            location = locationData.country;
            locationArea = locationData.country;
          }
        }
        
        // Extract first photo from data.photos array
        const photos = Array.isArray(data.photos) ? data.photos : [];
        const mainImage = photos.length > 0 && photos[0] && (photos[0].base64 || photos[0].url)
          ? (photos[0].base64 || photos[0].url)
          : null;
        
        // Extract property basics from data.propertyBasics
        const propertyBasics = data.propertyBasics || {};
        const guests = propertyBasics.guestCapacity || null;
        const bedrooms = propertyBasics.bedrooms || null;
        const beds = propertyBasics.beds || null;
        const bathrooms = propertyBasics.bathrooms || null;
        
        // Extract privacy type (listing type) from data.privacyType
        const privacyType = data.privacyType || null;
        
        // Extract property structure from data.propertyStructure
        const propertyStructure = data.propertyStructure || null;
        
        // Calculate progress based on currentStep (top-level field)
        const currentStep = draft.currentStep || 'hostingsteps';
        const progress = calculateProgress(currentStep);
        
        // Format last modified date with relative time for < 24 hours, otherwise full date/time
        let lastModifiedFormatted = '';
        if (draft.lastModified) {
          try {
            const lastModifiedDate = draft.lastModified?.toDate 
              ? draft.lastModified.toDate() 
              : (draft.lastModified instanceof Date 
                  ? draft.lastModified 
                  : new Date(draft.lastModified));
            
            const now = new Date();
            const diffMs = now - lastModifiedDate;
            const diffSeconds = Math.floor(diffMs / 1000);
            const diffMinutes = Math.floor(diffSeconds / 60);
            const diffHours = Math.floor(diffMinutes / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            // If less than 24 hours, show relative time
            if (diffHours < 24) {
              if (diffSeconds < 60) {
                lastModifiedFormatted = `${diffSeconds} ${diffSeconds === 1 ? 'second' : 'seconds'} ago`;
              } else if (diffMinutes < 60) {
                lastModifiedFormatted = `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
              } else {
                // Format hours with minutes in HH:MM format if less than 24 hours
                const hours = diffHours;
                const remainingMinutes = diffMinutes % 60;
                if (remainingMinutes > 0) {
                  lastModifiedFormatted = `${hours}:${String(remainingMinutes).padStart(2, '0')} hours ago`;
                } else {
                  lastModifiedFormatted = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
                }
              }
            } else {
              // 24 hours or more: show full date and time
              lastModifiedFormatted = lastModifiedDate.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
            }
          } catch (dateError) {
            console.warn('Error formatting date for draft:', draft.id, dateError);
            lastModifiedFormatted = 'Unknown';
          }
        }
        
        const transformed = {
          ...draft,
          // Override with extracted/calculated values
          title,
          location,
          locationCity,
          locationArea,
          mainImage,
          guests,
          bedrooms,
          beds,
          bathrooms,
          privacyType,
          propertyStructure,
          progress,
          lastModifiedFormatted,
          hasPhotos: photos.length > 0
        };
        
        console.log('✅ Transformed draft:', draft.id, {
          title,
          location,
          privacyType,
          progress,
          hasImage: !!mainImage,
          lastModifiedFormatted
        });
        
        return transformed;
      });
      
      console.log('📊 HostDashboard: Transformed drafts:', transformedDrafts);
      
      // Filter out published drafts (they should appear in listings section instead)
      const unpublishedDrafts = transformedDrafts.filter(draft => !draft.published);
      setDrafts(unpublishedDrafts);
      
      // Load published listings from listings collection
      await loadListings();
      // Load unpublished listings
      await loadUnpublishedListings();
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading drafts:', error);
      setDrafts([]);
      setLoading(false);
    }
  };

  const loadListings = async () => {
    try {
      if (!auth.currentUser) return;
      
      console.log('📦 HostDashboard: Loading published listings...');
      
      // Query listings collection for this user's active listings
      const listingsRef = collection(db, 'listings');
      
      // Try with orderBy first, fallback without if index missing
      let querySnapshot;
      try {
        const q = query(
          listingsRef,
          where('ownerId', '==', auth.currentUser.uid),
          where('status', '==', 'active'),
          orderBy('publishedAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (indexError) {
        console.warn('⚠️ Index error (expected on first use), trying without orderBy:', indexError.message);
        try {
          // Fallback: query without orderBy
          const q = query(
            listingsRef,
            where('ownerId', '==', auth.currentUser.uid),
            where('status', '==', 'active')
          );
          querySnapshot = await getDocs(q);
        } catch (indexError2) {
          console.warn('⚠️ Index error for status filter, querying by ownerId only:', indexError2.message);
          // Final fallback: query by ownerId only, filter status in JavaScript
          const q = query(
            listingsRef,
            where('ownerId', '==', auth.currentUser.uid)
          );
          querySnapshot = await getDocs(q);
        }
      }
      
      // Map and filter listings
      const allListingsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const locationData = data.locationData || {};
        
        // Debug: Log photos data for this listing
        const photosData = data.photos || [];
        const firstPhoto = photosData[0];
        console.log(`📸 HostDashboard: Listing ${doc.id} - Photos:`, {
          photosCount: photosData.length,
          firstPhoto: firstPhoto ? {
            id: firstPhoto.id,
            name: firstPhoto.name,
            hasBase64: !!firstPhoto.base64,
            hasUrl: !!firstPhoto.url,
            base64Length: firstPhoto.base64 ? firstPhoto.base64.length : 0,
            allKeys: Object.keys(firstPhoto)
          } : 'no first photo',
          imageField: data.image,
          hasImageField: !!data.image
        });
        
        return {
          id: doc.id,
          ...data,
          // Format location for display
          locationDisplay: data.location || 
            (locationData.city && locationData.province 
              ? `${locationData.city}, ${locationData.province}`
              : locationData.city || locationData.country || 'No location'),
          locationCity: locationData.city || '',
          locationArea: locationData.province || locationData.country || '',
          // Get main image from photos array - ensure we always have a valid image
          mainImage: (() => {
            const firstPhoto = photosData[0];
            if (firstPhoto?.base64) {
              return firstPhoto.base64;
            }
            if (firstPhoto?.url) {
              return firstPhoto.url;
            }
            if (data.image) {
              return data.image;
            }
            return null;
          })(),
          // Format published date
          publishedDate: data.publishedAt?.toDate ? data.publishedAt.toDate().toLocaleDateString() : 'Unknown',
          publishedAt: data.publishedAt // Keep for sorting
        };
      });
      
      // Filter by status if we had to query without status filter
      const listingsData = allListingsData.filter(listing => listing.status === 'active');
      
      // Sort manually if orderBy failed
      if (listingsData.length > 0) {
        listingsData.sort((a, b) => {
          const aDate = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(0);
          const bDate = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(0);
          return bDate - aDate; // Descending
        });
      }
      
      console.log('✅ HostDashboard: Loaded listings:', listingsData.length);
      console.log('📋 Listings data:', listingsData);
      setListings(listingsData);
    } catch (error) {
      console.error('❌ Error loading listings:', error);
      console.error('Error details:', error.code, error.message);
      setListings([]);
    }
  };

  const loadUnpublishedListings = async () => {
    try {
      if (!auth.currentUser) return;
      
      console.log('📦 HostDashboard: Loading unpublished listings...');
      
      // Query listings collection for this user's inactive listings
      const listingsRef = collection(db, 'listings');
      
      // Try with orderBy first, fallback without if index missing
      let querySnapshot;
      try {
        const q = query(
          listingsRef,
          where('ownerId', '==', auth.currentUser.uid),
          where('status', '==', 'inactive'),
          orderBy('updatedAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (indexError) {
        console.warn('⚠️ Index error for unpublished listings, trying without orderBy:', indexError.message);
        try {
          // Fallback: query without orderBy
          const q = query(
            listingsRef,
            where('ownerId', '==', auth.currentUser.uid),
            where('status', '==', 'inactive')
          );
          querySnapshot = await getDocs(q);
        } catch (indexError2) {
          console.warn('⚠️ Index error for status filter, querying by ownerId only:', indexError2.message);
          // Final fallback: query by ownerId only, filter status in JavaScript
          const q = query(
            listingsRef,
            where('ownerId', '==', auth.currentUser.uid)
          );
          querySnapshot = await getDocs(q);
        }
      }
      
      // Map and filter listings
      const allListingsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const locationData = data.locationData || {};
        const photosData = data.photos || [];
        
        return {
          id: doc.id,
          ...data,
          // Format location for display
          locationDisplay: data.location || 
            (locationData.city && locationData.province 
              ? `${locationData.city}, ${locationData.province}`
              : locationData.city || locationData.country || 'No location'),
          locationCity: locationData.city || '',
          locationArea: locationData.province || locationData.country || '',
          // Get main image from photos array
          mainImage: (() => {
            const firstPhoto = photosData[0];
            if (firstPhoto?.base64) {
              return firstPhoto.base64;
            }
            if (firstPhoto?.url) {
              return firstPhoto.url;
            }
            if (data.image) {
              return data.image;
            }
            return null;
          })(),
          // Format unpublished date
          unpublishedDate: data.updatedAt?.toDate ? data.updatedAt.toDate().toLocaleDateString() : 'Unknown',
          updatedAt: data.updatedAt // Keep for sorting
        };
      });
      
      // Filter by status if we had to query without status filter
      const unpublishedData = allListingsData.filter(listing => listing.status === 'inactive');
      
      // Sort manually if orderBy failed
      if (unpublishedData.length > 0) {
        unpublishedData.sort((a, b) => {
          const aDate = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0);
          const bDate = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0);
          return bDate - aDate; // Descending (most recently unpublished first)
        });
      }
      
      console.log('✅ HostDashboard: Loaded unpublished listings:', unpublishedData.length);
      setUnpublishedListings(unpublishedData);
    } catch (error) {
      console.error('❌ Error loading unpublished listings:', error);
      setUnpublishedListings([]);
    }
  };

  // Load bookings for this host
  const loadBookings = async () => {
    try {
      if (!auth.currentUser) return;

      console.log('📦 HostDashboard: Loading bookings...');

      const bookingsCollection = collection(db, 'bookings');
      
      // Query bookings where ownerId matches current user
      let querySnapshot;
      try {
        const q = query(
          bookingsCollection,
          where('ownerId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (indexError) {
        console.warn('⚠️ Index error for bookings, trying without orderBy:', indexError.message);
        try {
          // Fallback: query without orderBy
          const q = query(
            bookingsCollection,
            where('ownerId', '==', auth.currentUser.uid)
          );
          querySnapshot = await getDocs(q);
        } catch (error2) {
          console.error('❌ Error loading bookings:', error2);
          setBookings([]);
          return;
        }
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
          // Format dates for display
          checkInFormatted: checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          checkOutFormatted: checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          createdAtFormatted: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
      });

      // Sort manually if orderBy failed
      if (querySnapshot.empty || bookingsData.length > 0) {
        bookingsData.sort((a, b) => {
          const aDate = a.createdAt || new Date(0);
          const bDate = b.createdAt || new Date(0);
          return bDate - aDate; // Descending (newest first)
        });
      }

      console.log('✅ HostDashboard: Loaded bookings:', bookingsData.length);
      setBookings(bookingsData);
    } catch (error) {
      console.error('❌ Error loading bookings:', error);
      setBookings([]);
    }
  };


  // Update booking status
  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      if (!auth.currentUser) return;

      const bookingRef = doc(db, 'bookings', bookingId);
      
      // Get booking data before updating to check if status is changing to 'confirmed'
      const bookingDoc = await getDoc(bookingRef);
      const bookingData = bookingDoc.data();
      const previousStatus = bookingData.status;
      
      await updateDoc(bookingRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Send booking confirmation/cancellation email to guest
      try {
        const { sendBookingConfirmationEmail, sendCancellationEmail } = await import('@/lib/emailService');
        const guestEmail = bookingData.guestEmail;
        const firstName = bookingData.guestFirstName || '';
        const lastName = bookingData.guestLastName || '';
        if (newStatus === 'confirmed') {
          await sendBookingConfirmationEmail(
            guestEmail,
            firstName,
            lastName,
            {
              bookingId,
              listingTitle: bookingData.listingTitle,
              checkInDate: bookingData.checkInDate,
              checkOutDate: bookingData.checkOutDate,
              guests: bookingData.guests,
              totalPrice: bookingData.totalPrice,
              bookingAmount: bookingData.bookingAmount,
              paymentMethod: bookingData.paymentMethod || 'GetPay Wallet'
            }
          );
        } else if (newStatus === 'cancelled') {
          await sendCancellationEmail(
            guestEmail,
            firstName,
            lastName,
            {
              bookingId,
              listingTitle: bookingData.listingTitle,
              checkInDate: bookingData.checkInDate,
              checkOutDate: bookingData.checkOutDate,
              refundAmount: bookingData.totalPrice,
              refundType: 'full_refund',
              refundPending: true
            }
          );
        }
      } catch (emailError) {
        console.error('Error sending booking status email:', emailError);
      }

      // NOTE: Points for booking confirmations have been removed
      // NOTE: Payment handling is done separately - admin releases earnings after booking completion
      // NOTE: Host earnings are NOT automatically added when booking is confirmed
      // Admin will manually release earnings to host's GetPay wallet after booking is completed
      // Payment has already been received by admin when guest made the booking
      // Host will receive bookingAmount (not totalPrice) when admin releases earnings after completion
      // Guest paid: bookingAmount + guestFee → Admin's GetPay wallet
      // Admin releases: bookingAmount → Host's GetPay wallet (after booking completion)
      // Admin keeps: guestFee

          // Increment coupon usage if a coupon was used
          if (bookingData.couponId || bookingData.couponCode) {
            try {
              const { incrementCouponUsage } = await import('@/pages/Host/services/couponService');
              const couponId = bookingData.couponId;
              if (couponId) {
                await incrementCouponUsage(couponId);
                console.log('✅ Coupon usage incremented:', couponId);
              }
            } catch (couponError) {
              console.error('Error incrementing coupon usage:', couponError);
              // Don't block booking update if coupon increment fails
        }
      }

      toast.success(`Booking ${newStatus} successfully`);
      await loadBookings(); // Reload bookings
    } catch (error) {
      console.error('❌ Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const handleContinueDraft = (draft) => {
    const stepRoutes = {
      'hostingsteps': '/pages/hostingsteps',
      'propertydetails': '/pages/propertydetails',
      'propertystructure': '/pages/propertystructure',
      'privacytype': '/pages/privacytype',
      'location': '/pages/location',
      'locationconfirmation': '/pages/locationconfirmation',
      'propertybasics': '/pages/propertybasics',
      'makeitstandout': '/pages/makeitstandout',
      'amenities': '/pages/amenities',
      'photos': '/pages/photos',
      'titledescription': '/pages/titledescription',
      'description': '/pages/description',
      'descriptiondetails': '/pages/descriptiondetails',
      'finishsetup': '/pages/finishsetup',
      'bookingsettings': '/pages/bookingsettings',
      'guestselection': '/pages/guestselection',
      'pricing': '/pages/pricing',
      'weekendpricing': '/pages/weekendpricing',
      'discounts': '/pages/discounts',
      'safetydetails': '/pages/safetydetails',
      'finaldetails': '/pages/finaldetails',
      'payment': '/pages/payment'
    };
    const route = stepRoutes[draft.currentStep] || '/pages/propertydetails';
    navigate(route, { state: { draftId: draft.id } });
  };

  // Unpublish a listing (restore to drafts and set status to inactive)
  const handleUnpublishListing = (listing, e) => {
    e.stopPropagation(); // Prevent card click
    
    if (!auth.currentUser) {
      alert('You must be logged in to unpublish listings');
      return;
    }

    // Open the modal instead of using window.confirm
    setListingToUnpublish(listing);
    setUnpublishModalOpen(true);
  };

  const confirmUnpublishListing = async () => {
    if (!listingToUnpublish || !auth.currentUser) {
      return;
    }

    try {
      console.log('📝 Unpublishing listing:', listingToUnpublish.id);
      
      // Get listing reference
      const listingRef = doc(db, 'listings', listingToUnpublish.id);
      const listingSnap = await getDoc(listingRef);
      
      if (!listingSnap.exists()) {
        throw new Error('Listing not found');
      }
      
      // Simply set listing status to inactive (no draft creation)
      await updateDoc(listingRef, {
        status: 'inactive',
        updatedAt: serverTimestamp()
      });
      
      // Deduct points/value for unpublished listing
      let deductionResult = null;
      try {
        const { deductPointsForUnpublishedListing } = await import('@/pages/Host/services/pointsService');
        console.log('🔍 Calling deductPointsForUnpublishedListing for listing:', listingToUnpublish.id);
        deductionResult = await deductPointsForUnpublishedListing(auth.currentUser.uid, listingToUnpublish.id);
        console.log('📊 Deduction result:', deductionResult);
        
        if (deductionResult.success) {
          if (deductionResult.pointsDeducted > 0 || deductionResult.walletDeducted > 0) {
            console.log('✅ Points/wallet deducted for unpublished listing:', deductionResult);
            if (deductionResult.remainingDebt > 0) {
              toast.success(`Listing unpublished. ₱${deductionResult.totalDeducted} deducted. ₱${deductionResult.remainingDebt} will be deducted from future credits.`);
            } else {
              toast.success(`Listing unpublished. ${deductionResult.pointsDeducted > 0 ? `${deductionResult.pointsDeducted} points` : ''} ${deductionResult.walletDeducted > 0 ? `₱${deductionResult.walletDeducted}` : ''} deducted.`);
            }
          } else if (deductionResult.message) {
            // Show the message from the deduction function
            console.log('ℹ️ Deduction info:', deductionResult.message);
            toast.info(deductionResult.message || 'Listing unpublished successfully');
          } else {
      console.log('✅ Listing unpublished successfully');
      toast.success('Listing unpublished successfully');
          }
        } else {
          console.error('❌ Points deduction failed:', deductionResult.error);
          toast.warning(`Listing unpublished, but points deduction failed: ${deductionResult.error}`);
        }
      } catch (pointsError) {
        console.error('❌ Error deducting points for unpublished listing:', pointsError);
        console.error('Error stack:', pointsError.stack);
        toast.error(`Listing unpublished, but points deduction error: ${pointsError.message}`);
        // Don't fail unpublish if points deduction fails
      }
      
      console.log('✅ Listing unpublished successfully');
      
      // Reload listings and unpublished listings to update the UI
      await loadListings();
      await loadUnpublishedListings();
      
      // Close the modal and reset state
      setUnpublishModalOpen(false);
      setListingToUnpublish(null);
    } catch (error) {
      console.error('❌ Error unpublishing listing:', error);
      alert('Failed to unpublish listing. Please try again.');
      setUnpublishModalOpen(false);
      setListingToUnpublish(null);
    }
  };

  // Republish a listing (change status back to active)
  const handleRepublishListing = async (listing, e) => {
    e.stopPropagation();
    
    if (!auth.currentUser) {
      alert('You must be logged in to republish listings');
      return;
    }

    try {
      console.log('📝 Republishing listing:', listing.id);
      
      const listingRef = doc(db, 'listings', listing.id);
      await updateDoc(listingRef, {
        status: 'active',
        updatedAt: serverTimestamp()
      });
      
      // Restore points/value for republished listing
      let restoreResult = null;
      try {
        const { restorePointsForRepublishedListing } = await import('@/pages/Host/services/pointsService');
        restoreResult = await restorePointsForRepublishedListing(auth.currentUser.uid, listing.id);
        
        if (restoreResult.success) {
          if (restoreResult.restored) {
            console.log('✅ Points restored for republished listing:', restoreResult);
            toast.success(`Listing republished. ${restoreResult.pointsRestored} points restored.`);
          } else {
      console.log('✅ Listing republished successfully');
      toast.success('Listing republished successfully');
          }
        } else {
          console.log('✅ Listing republished successfully');
          toast.success('Listing republished successfully');
        }
      } catch (pointsError) {
        console.error('Error restoring points for republished listing:', pointsError);
        console.log('✅ Listing republished successfully');
        toast.success('Listing republished successfully');
        // Don't fail republish if points restoration fails
      }
      
      console.log('✅ Listing republished successfully');
      
      // Reload listings and unpublished listings to update the UI
      await loadListings();
      await loadUnpublishedListings();
    } catch (error) {
      console.error('❌ Error republishing listing:', error);
      alert('Failed to republish listing. Please try again.');
    }
  };

  // Delete an unpublished listing permanently
  const handleDeleteUnpublishedListing = async (listing, e) => {
    e.stopPropagation();
    
    if (!auth.currentUser) {
      alert('You must be logged in to delete listings');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete "${listing.title || 'this listing'}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      console.log('🗑️ Deleting unpublished listing:', listing.id);
      
      const listingRef = doc(db, 'listings', listing.id);
      await deleteDoc(listingRef);
      
      console.log('✅ Listing deleted successfully');
      toast.success('Listing deleted successfully');
      
      // Reload unpublished listings to update the UI
      await loadUnpublishedListings();
    } catch (error) {
      console.error('❌ Error deleting listing:', error);
      alert('Failed to delete listing. Please try again.');
    }
  };

  // Convert published listing to draft for editing (or use existing draft)
  const handleEditListing = async (listing) => {
    try {
      if (!auth.currentUser) {
        alert('You must be logged in to edit listings');
        return;
      }

      console.log('📝 Preparing draft for editing listing:', listing.id);
      
      // Get the full listing document
      const listingRef = doc(db, 'listings', listing.id);
      const listingSnap = await getDoc(listingRef);
      
      if (!listingSnap.exists()) {
        alert('Listing not found');
        return;
      }
      
      const listingData = listingSnap.data();
      
      // Check if a draft already exists for this listing
      const draftsCollection = collection(db, 'onboardingDrafts');
      let draftId = null;
      
      // Try to find existing draft with this publishedListingId
      const draftsQuery = query(
        draftsCollection,
        where('userId', '==', auth.currentUser.uid),
        where('publishedListingId', '==', listing.id)
      );
      
      const draftsSnapshot = await getDocs(draftsQuery);
      if (!draftsSnapshot.empty) {
        // Use existing draft
        draftId = draftsSnapshot.docs[0].id;
        const existingDraft = draftsSnapshot.docs[0].data();
        console.log('📍 Found existing draft for this listing:', draftId);
        
        // Ensure it's marked as unpublished so it shows in saved drafts
        const draftRef = doc(draftsCollection, draftId);
        await updateDoc(draftRef, {
          published: false,
          status: 'draft',
          lastModified: serverTimestamp()
        });
      } else {
        // Create a new draft from the listing data
        console.log('📍 No existing draft found, creating new draft for editing');
        
        // Structure data the same way as onboarding drafts
        // Build data object, only including fields that have values (avoid undefined)
        const draftDataObject = {
          // Restore all nested data fields
          locationData: listingData.locationData || {},
          propertyBasics: listingData.propertyBasics || {},
          amenities: listingData.amenities || {},
          photos: listingData.photos || [],
          pricing: listingData.pricing || {},
          bookingSettings: listingData.bookingSettings || {},
          guestSelection: listingData.guestSelection || {},
          discounts: listingData.discounts || {},
          safetyDetails: listingData.safetyDetails || {},
          finalDetails: listingData.finalDetails || {},
          // Restore top-level fields that go in data
          title: listingData.title || '',
          description: listingData.description || '',
          descriptionHighlights: listingData.descriptionHighlights || [],
          privacyType: listingData.privacyType || '',
          propertyStructure: listingData.propertyStructure || '',
        };
        
        // Only add optional fields if they exist and are not undefined
        if (listingData.bathroomTypes !== undefined && listingData.bathroomTypes !== null) {
          draftDataObject.bathroomTypes = listingData.bathroomTypes;
        }
        if (listingData.occupancy !== undefined && listingData.occupancy !== null) {
          draftDataObject.occupancy = listingData.occupancy;
        }
        
        // Remove any undefined values from data object
        Object.keys(draftDataObject).forEach(key => {
          if (draftDataObject[key] === undefined) {
            delete draftDataObject[key];
          }
        });
        
        const draftData = {
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          category: listingData.category || 'accommodation',
          status: 'draft',
          currentStep: 'finaldetails', // Set to last step since it was already published
          lastModified: serverTimestamp(),
          createdAt: serverTimestamp(),
          publishedListingId: listing.id, // Link to original published listing
          published: false, // Mark as unpublished so it shows in saved drafts
          data: draftDataObject
        };
        
        const draftRef = await addDoc(draftsCollection, draftData);
        draftId = draftRef.id;
        console.log('✅ Created draft for editing:', draftId);
      }
      
      // Reload drafts to show the new/updated draft in saved drafts section
      await loadDrafts();
      
      // Navigate to onboarding flow with the draft (start at finaldetails since it was already published)
      navigate('/pages/finaldetails', { 
        state: { 
          draftId: draftId, 
          listingId: listing.id, 
          isEditMode: true 
        } 
      });
    } catch (error) {
      console.error('❌ Error preparing draft for editing:', error);
      alert('Failed to edit listing. Please try again.');
    }
  };

  const handleDeleteDraft = async (draftId) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) return;
    try {
      await deleteDraft(draftId);
      await loadDrafts();
    } catch (error) {
      console.error('Error deleting draft:', error);
      alert('Failed to delete draft.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 py-12 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center relative overflow-hidden flex-shrink-0 border-4 border-white shadow-lg">
                {(userProfile?.profileImage || userProfile?.photoURL) ? (
                  <img
                    src={userProfile.profileImage || userProfile.photoURL}
                    alt={`${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`}
                    className="w-full h-full object-cover absolute inset-0"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const icon = e.target.parentElement?.querySelector('.user-icon');
                      if (icon) icon.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <User className={`w-10 h-10 text-primary user-icon ${(userProfile?.profileImage || userProfile?.photoURL) ? 'hidden' : ''}`} />
              </div>
            <div>
              <h1 className="font-heading text-4xl font-bold text-foreground mb-4">
                  Welcome back, Host {userProfile?.firstName || ''}!
              </h1>
              <p className="font-body text-xl text-muted-foreground">
                Manage your listings, bookings, and account settings here.
              </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                className="btn-primary flex items-center gap-2"
                onClick={() => {
                  setForceHostTypeSelection(true);
                  setShowHostTypeModal(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Start New Listing
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="max-w-7xl mx-auto px-6 -mt-8 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`card-listing p-6 animate-slide-up ${stat.clickable ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => {
                  if (stat.clickable) {
                    if (stat.type === 'points') {
                      console.log('Opening points history modal, current points:', hostPoints, 'pointsHistory:', pointsHistory);
                      setShowPointsHistoryModal(true);
                    } else if (stat.type === 'earnings') {
                      setShowEarningsHistoryModal(true);
                      // Reload earnings history when modal opens
                      if (user?.uid) {
                        loadEarningsHistory(user.uid);
                      }
                    }
                  }
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-foreground">{stat.value}</h3>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
                {stat.clickable && (
                  <>
                    <p className="text-xs text-primary mt-1 font-medium">{stat.change}</p>
                    <p className="text-xs text-primary mt-1 font-medium">Click to view history →</p>
                  </>
                )}
                {!stat.clickable && (
                  <p className="text-xs text-muted-foreground mt-2">{stat.change}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Draft Success Message replaced by toast */}

        {/* Today & Upcoming Bookings Container */}
        {user && (() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayBookings = bookings.filter(booking => {
            const checkIn = new Date(booking.checkInDate);
            checkIn.setHours(0, 0, 0, 0);
            return checkIn.getTime() === today.getTime();
          });
          const upcomingBookings = bookings.filter(booking => {
            const checkIn = new Date(booking.checkInDate);
            checkIn.setHours(0, 0, 0, 0);
            return checkIn.getTime() > today.getTime();
          });
          return (
            <div className="max-w-7xl mx-auto px-6 mb-12">
              <h2 className="text-xl font-bold text-foreground mb-6">Bookings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Today Bookings Section */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Today</h3>
                    <span className="text-sm text-muted-foreground">({todayBookings.length})</span>
                  </div>
                  {todayBookings.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {todayBookings.slice(0, 5).map((booking) => {
                        const listing = listings.find(l => l.id === booking.listingId);
                        return (
                          <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/bookings/${booking.id}`)}>
                            {/* ...booking card code... */}
                            <div className="flex items-start gap-3">
                              {listing?.mainImage && (
                                <img 
                                  src={listing.mainImage}
                                  alt={listing?.title || 'Listing'}
                                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-foreground text-sm line-clamp-1 flex-1">
                                    {listing?.title || `Listing ${booking.listingId}`}
                                  </h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/${listing?.category || 'accommodation'}s/${booking.listingId}`);
                                    }}
                                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                    title="View Listing"
                                  >
                                    <Home className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                  </button>
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
                            <div className="mt-3 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-muted-foreground">Total Price:</span>
                                <span className="font-heading text-xl font-bold text-foreground">
                                  ₱{(booking.totalPrice || 0).toLocaleString()}
                                </span>
                              </div>
                              {booking.guestId && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
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
                            <div className="ml-4 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                              {booking.status === 'pending' && (
                                <>
                                  <button
                                    className="btn-primary px-4 py-2 text-sm font-medium"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateBookingStatus(booking.id, 'confirmed');
                                    }}
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    className="btn-outline px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:border-red-300"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateBookingStatus(booking.id, 'cancelled');
                                    }}
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                              {booking.status === 'confirmed' && (
                                <button
                                  className="btn-outline px-4 py-2 text-sm font-medium"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateBookingStatus(booking.id, 'completed');
                                  }}
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
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No bookings for today</p>
                    </div>
                  )}
                </div>
                {/* Upcoming Bookings Section */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Upcoming</h3>
                    <span className="text-sm text-muted-foreground">({upcomingBookings.length})</span>
                  </div>
                  {upcomingBookings.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {upcomingBookings.slice(0, 5).map((booking) => {
                        const listing = listings.find(l => l.id === booking.listingId);
                        return (
                          <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/bookings/${booking.id}`)}>
                            {/* ...booking card code... */}
                            <div className="flex items-start gap-3">
                              {listing?.mainImage && (
                                <img 
                                  src={listing.mainImage}
                                  alt={listing?.title || 'Listing'}
                                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-foreground text-sm line-clamp-1 flex-1">
                                    {listing?.title || `Listing ${booking.listingId}`}
                                  </h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/${listing?.category || 'accommodation'}s/${booking.listingId}`);
                                    }}
                                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                    title="View Listing"
                                  >
                                    <Home className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                  </button>
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
                            <div className="mt-3 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-muted-foreground">Total Price:</span>
                                <span className="font-heading text-xl font-bold text-foreground">
                                  ₱{(booking.totalPrice || 0).toLocaleString()}
                                </span>
                              </div>
                              {booking.guestId && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
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
                            <div className="ml-4 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                              {booking.status === 'pending' && (
                                <>
                                  <button
                                    className="btn-primary px-4 py-2 text-sm font-medium"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateBookingStatus(booking.id, 'confirmed');
                                    }}
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    className="btn-outline px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:border-red-300"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateBookingStatus(booking.id, 'cancelled');
                                    }}
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                              {booking.status === 'confirmed' && (
                                <button
                                  className="btn-outline px-4 py-2 text-sm font-medium"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateBookingStatus(booking.id, 'completed');
                                  }}
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
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No upcoming bookings</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Empty state for bookings */}
        {user && bookings.length === 0 && !loading && (
          <div className="max-w-7xl mx-auto px-6 mb-12">
            <div className="bg-white rounded-xl shadow p-8">
              <div className="text-center py-16">
                <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" strokeWidth={2} />
                <div className="text-lg font-medium mb-2">No bookings yet.</div>
                <div className="text-gray-500 text-center">When guests book your listings, they will appear here.</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Points History Modal */}
      <AlertDialog open={showPointsHistoryModal} onOpenChange={setShowPointsHistoryModal}>
        <AlertDialogContent className="bg-white max-w-2xl max-h-[80vh]">
          <div className="relative">
            <button
              onClick={() => setShowPointsHistoryModal(false)}
              className="absolute -right-2 -top-2 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 p-1 z-10 bg-white shadow-md"
            >
              <X className="h-5 w-5 text-gray-600" />
              <span className="sr-only">Close</span>
            </button>
          <AlertDialogHeader>
              <div className="flex items-center justify-between mb-2">
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Points History
            </AlertDialogTitle>
                {hostPoints > 0 && (
                  <button
                    onClick={() => {
                      setShowPointsHistoryModal(false);
                      setShowCashOutPointsModal(true);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                  >
                    <Wallet className="w-4 h-4" />
                    Cash Out
                  </button>
                )}
              </div>
            <AlertDialogDescription className="text-gray-600">
              Total Points: <span className="font-bold text-primary">{hostPoints.toLocaleString()}</span>
              <span className="ml-2 text-gray-500">
                (≈ ₱{parseFloat(pointsCurrencyValue).toLocaleString()} value)
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
            <div className="overflow-y-auto max-h-[60vh] mt-4">
              <div className="space-y-3">
            {pointsHistory && pointsHistory.length > 0 ? (
              pointsHistory.map((entry, index) => {
                const timestamp = entry.timestamp?.toDate ? entry.timestamp.toDate() : 
                                  (entry.timestamp?.seconds ? new Date(entry.timestamp.seconds * 1000) : 
                                  new Date());
                const isPositive = entry.points > 0;
                const formattedDate = timestamp.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                
                return (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`font-semibold text-lg ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{entry.points.toLocaleString()} points
                          </span>
                          <span className="text-sm text-gray-500">
                            (Total: {entry.totalPoints?.toLocaleString() || 0})
                          </span>
                        </div>
                        <p className="text-gray-700 font-medium mb-1">{entry.reason || 'Points transaction'}</p>
                        {entry.source && (
                          <span className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded-full mb-2">
                            {entry.source.replace('_', ' ')}
                          </span>
                        )}
                        {entry.bookingId && (
                          <p className="text-xs text-gray-500 mt-1">Booking ID: {entry.bookingId}</p>
                        )}
                        {entry.reviewId && (
                          <p className="text-xs text-gray-500 mt-1">Review ID: {entry.reviewId}</p>
                        )}
                        {entry.milestoneKey && (
                          <p className="text-xs text-gray-500 mt-1">Milestone: {entry.milestoneKey}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">{formattedDate}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No points history yet.</p>
                <p className="text-sm text-gray-400 mt-2">Points will appear here when you earn them!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cash Out Points Modal */}
      <AlertDialog open={showCashOutPointsModal} onOpenChange={setShowCashOutPointsModal}>
        <AlertDialogContent className="bg-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Cash Out Points to GetPay Wallet
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Convert your points to currency and add to your GetPay wallet.
              <br />
              <span className="text-sm font-medium mt-2 block">
                Conversion Rate: 10 points = ₱1
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900 font-medium">
                Available Points: {hostPoints.toLocaleString()} points
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Value: ≈ ₱{parseFloat(pointsCurrencyValue).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points to Cash Out
              </label>
              <input
                type="number"
                value={cashOutPointsAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= hostPoints)) {
                    setCashOutPointsAmount(value);
                  }
                }}
                placeholder="Enter points amount"
                min="1"
                max={hostPoints}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isProcessingCashOut}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum: {hostPoints.toLocaleString()} points
              </p>
              {cashOutPointsAmount && !isNaN(parseInt(cashOutPointsAmount)) && (
                <p className="text-sm text-gray-700 mt-2">
                  Will receive: ₱{((parseInt(cashOutPointsAmount) || 0) / POINTS_TO_CURRENCY_RATE).toFixed(2)}
                </p>
              )}
            </div>

            {isProcessingCashOut && (
              <div className="text-center py-2">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Processing cash out...</p>
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowCashOutPointsModal(false);
                setCashOutPointsAmount('');
              }}
              disabled={isProcessingCashOut}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!cashOutPointsAmount || isNaN(parseInt(cashOutPointsAmount)) || parseInt(cashOutPointsAmount) <= 0) {
                  toast.error('Please enter a valid points amount');
                  return;
                }

                const points = parseInt(cashOutPointsAmount);
                if (points > hostPoints) {
                  toast.error(`You only have ${hostPoints.toLocaleString()} points`);
                  return;
                }

                if (points < 10) {
                  toast.error('Minimum cash out is 10 points (₱1)');
                  return;
                }

                setIsProcessingCashOut(true);
                try {
                  const { cashOutPoints } = await import('@/pages/Host/services/pointsService');
                  const result = await cashOutPoints(auth.currentUser.uid, points);

                  if (result.success) {
                    toast.success(`Successfully cashed out ${points.toLocaleString()} points (₱${result.currencyAmount.toFixed(2)}) to your GetPay wallet!`);
                    setShowCashOutPointsModal(false);
                    setCashOutPointsAmount('');
                    
                    // Reload points data
                    const { getHostPoints } = await import('@/pages/Host/services/pointsService');
                    const pointsData = await getHostPoints(auth.currentUser.uid);
                    setHostPoints(pointsData.points || 0);
                    setPointsHistory(pointsData.pointsHistory || []);
                  } else {
                    toast.error(result.error || 'Failed to cash out points');
                  }
                } catch (error) {
                  console.error('Error cashing out points:', error);
                  toast.error('Failed to cash out points: ' + error.message);
                } finally {
                  setIsProcessingCashOut(false);
                }
              }}
              disabled={isProcessingCashOut || !cashOutPointsAmount || isNaN(parseInt(cashOutPointsAmount)) || parseInt(cashOutPointsAmount) <= 0 || parseInt(cashOutPointsAmount) > hostPoints}
              className="bg-primary text-white hover:bg-primary/90"
            >
              Cash Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Earnings History Modal */}
      <AlertDialog open={showEarningsHistoryModal} onOpenChange={setShowEarningsHistoryModal}>
        <AlertDialogContent className="bg-white max-w-4xl max-h-[80vh]">
          <div className="relative">
            <button
              onClick={() => setShowEarningsHistoryModal(false)}
              className="absolute -right-2 -top-2 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 p-1 z-10 bg-white shadow-md"
            >
              <X className="h-5 w-5 text-gray-600" />
              <span className="sr-only">Close</span>
            </button>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-green-600" />
                Earnings History
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                Total Earnings: <span className="font-bold text-green-600">₱{totalEarnings.toLocaleString()}</span>
                <span className="ml-4">Total Releases: <span className="font-bold">{earningsHistory.length}</span></span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="overflow-y-auto max-h-[60vh] mt-4">
              <div className="space-y-3">
                {isLoadingEarningsHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent mx-auto mb-3"></div>
                    <p className="text-gray-500">Loading earnings history...</p>
                  </div>
                ) : earningsHistory && earningsHistory.length > 0 ? (
                  earningsHistory.map((transaction, index) => {
                    const timestamp = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
                    const formattedDate = timestamp.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    
                    const metadata = transaction.metadata || {};
                    const bookingId = metadata.bookingId || 'N/A';
                    const listingTitle = metadata.listingTitle || 'Unknown Listing';
                    const guestEmail = metadata.guestEmail || 'Unknown';
                    const checkInDate = metadata.checkInDate ? new Date(metadata.checkInDate).toLocaleDateString() : 'N/A';
                    const checkOutDate = metadata.checkOutDate ? new Date(metadata.checkOutDate).toLocaleDateString() : 'N/A';
                    
                    return (
                      <div
                        key={transaction.id || index}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-lg text-green-600">
                                +₱{(transaction.amount || 0).toLocaleString()}
                              </span>
                              <span className="text-sm text-gray-500">
                                (Balance: ₱{(transaction.balanceAfter || 0).toLocaleString()})
                              </span>
                            </div>
                            <p className="text-gray-700 font-medium mb-1">{transaction.description || 'Earnings from Booking'}</p>
                            <div className="space-y-1 mt-2">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Listing:</span> {listingTitle}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Guest:</span> {guestEmail}
                              </p>
                              <p className="text-xs text-gray-500">
                                Check-in: {checkInDate} - Check-out: {checkOutDate}
                              </p>
                              <p className="text-xs text-gray-500">
                                Booking ID: {bookingId}
                              </p>
                              <p className="text-xs text-gray-500">
                                Transaction ID: {transaction.id || 'N/A'}
                              </p>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">{formattedDate}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No earnings history yet.</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Earnings will appear here when the admin releases payments for your completed bookings.
                    </p>
                    <p className="text-xs text-gray-400 mt-4">
                      💡 <strong>Note:</strong> Earnings are released by the admin after bookings are marked as completed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />

      {/* Unpublish Confirmation Modal */}
      <AlertDialog open={unpublishModalOpen} onOpenChange={setUnpublishModalOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Unpublish Listing</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to unpublish this listing? It will be moved to the Unpublished Listings section and can be republished at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel 
              onClick={() => {
                setUnpublishModalOpen(false);
                setListingToUnpublish(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnpublishListing}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white"
            >
              Unpublish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    {/* HostTypeModal for choosing category before starting new listing */}
    <OnboardingProvider>
      <HostTypeModal
        isOpen={showHostTypeModal}
        currentUser={user}
        forceHostTypeSelection={forceHostTypeSelection}
        onClose={() => setShowHostTypeModal(false)}
      />
    </OnboardingProvider>
  </div>
  );
}
export default HostDashboard;
