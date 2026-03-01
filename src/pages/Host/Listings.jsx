import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import { toast } from '@/components/ui/sonner';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  Home as HomeIcon, MapPin, Camera, Edit, EyeOff, Clock,
  Grid, List, Plus, Trash2, Users
} from 'lucide-react';
import { getUserDrafts, deleteDraft } from '@/pages/Host/services/draftService';
import { deleteDoc } from 'firebase/firestore';
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

const HostListings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const savedDraftsRef = useRef(null);
  const hasScrolledRef = useRef(false);
  const toastShownRef = useRef(false);
  const [listings, setListings] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [unpublishedListings, setUnpublishedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [listingTab, setListingTab] = useState('all');
  const [draftTab, setDraftTab] = useState('all');
  const [unpublishedTab, setUnpublishedTab] = useState('all');
  const [listingView, setListingView] = useState('grid');
  const [draftView, setDraftView] = useState('grid');
  const [showHostTypeModal, setShowHostTypeModal] = useState(false);
  const [forceHostTypeSelection, setForceHostTypeSelection] = useState(false);
  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false);
  const [listingToUnpublish, setListingToUnpublish] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        loadDrafts();
        loadListings();
        loadUnpublishedListings();
      } else {
        setListings([]);
        setDrafts([]);
        setUnpublishedListings([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle scroll to saved drafts section and show toast message
  useEffect(() => {
    // Reset flags when navigating to a new page (pathname changes without state)
    if (!location.state?.scrollToDrafts && !location.state?.message) {
      hasScrolledRef.current = false;
      toastShownRef.current = false;
    }
    
    // Handle scroll to drafts section
    if (location.state?.scrollToDrafts && savedDraftsRef.current && !loading && drafts.length >= 0 && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      // Small delay to ensure the page has rendered
      setTimeout(() => {
        savedDraftsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
    
    // Show toast message only once per navigation
    if (location.state?.message && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(location.state.message);
      
      // Clear the message from state immediately to prevent re-triggering
      const { message, ...restState } = location.state;
      navigate(location.pathname, { replace: true, state: restState });
    }
    
    // Clear scroll state after handling
    if (location.state?.scrollToDrafts && hasScrolledRef.current) {
      setTimeout(() => {
        const { scrollToDrafts, ...restState } = location.state;
        navigate(location.pathname, { replace: true, state: restState });
      }, 1000);
    }
  }, [location.state, location.pathname, loading, drafts.length, navigate]);

  const loadListings = async () => {
    try {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      console.log('📦 Listings: Loading published listings...');

      const listingsRef = collection(db, 'listings');
      
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
        // Index error, trying without orderBy
        try {
          const q = query(
            listingsRef,
            where('ownerId', '==', auth.currentUser.uid),
            where('status', '==', 'active')
          );
          querySnapshot = await getDocs(q);
        } catch (indexError2) {
          // Index error for status filter, querying by ownerId only
          const q = query(
            listingsRef,
            where('ownerId', '==', auth.currentUser.uid)
          );
          querySnapshot = await getDocs(q);
        }
      }

      const allListingsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const category = data.category || 'accommodation';
        
        // Handle service vs accommodation data structure
        let locationData, photosData, title, price;
        
        if (category === 'service') {
          // Service-specific fields
          // Location can be stored as object in locationData or location, or as string in location
          locationData = data.locationData || (typeof data.location === 'object' ? data.location : {});
          photosData = data.photos || [];
          title = data.title || 'Untitled Service';
          // Price can be in pricing.basePrice, pricing.price, or data.price
          const pricing = data.pricing || {};
          price = pricing.basePrice || pricing.price || pricing.weekdayPrice || data.price || 0;
        } else {
          // Accommodation fields
          locationData = data.locationData || {};
          photosData = data.photos || [];
          title = data.title || 'Untitled Listing';
          price = data.price || 0;
        }
        
        const firstPhoto = photosData[0];

        // Extract location display
        let locationDisplay = 'No location';
        let locationCity = '';
        let locationArea = '';
        
        if (category === 'service') {
          // For services, check locationData first, then data.location (which might be string or object)
          if (locationData && typeof locationData === 'object' && Object.keys(locationData).length > 0) {
            if (locationData.city && locationData.province) {
              locationDisplay = `${locationData.city}, ${locationData.province}`;
              locationCity = locationData.city;
              locationArea = locationData.province;
            } else if (locationData.city) {
              locationDisplay = locationData.city;
              locationCity = locationData.city;
            } else if (locationData.province) {
              locationDisplay = locationData.province;
              locationArea = locationData.province;
            } else if (locationData.country) {
              locationDisplay = locationData.country;
              locationArea = locationData.country;
            }
          } else if (typeof data.location === 'string' && data.location && data.location !== 'Location') {
            locationDisplay = data.location;
          }
        } else {
          // Accommodation location handling
          locationDisplay = data.location || 
            (locationData.city && locationData.province 
              ? `${locationData.city}, ${locationData.province}`
              : locationData.city || locationData.country || 'No location');
          locationCity = locationData.city || '';
          locationArea = locationData.province || locationData.country || '';
        }

        // Extract service-specific fields
        let serviceCategory = null;
        let serviceOfferingsCount = 0;
        
        if (category === 'service') {
          serviceCategory = data.serviceCategory || null;
          serviceOfferingsCount = Array.isArray(data.serviceOfferings) ? data.serviceOfferings.length : 0;
        }

        return {
          id: doc.id,
          ...data,
          title: title,
          price: price,
          locationDisplay: locationDisplay,
          locationCity: locationCity,
          locationArea: locationArea,
          serviceCategory: serviceCategory,
          serviceOfferingsCount: serviceOfferingsCount,
          mainImage: (() => {
            if (firstPhoto?.base64) return firstPhoto.base64;
            if (firstPhoto?.url) return firstPhoto.url;
            if (data.image) return data.image;
            return null;
          })(),
          publishedDate: data.publishedAt?.toDate ? data.publishedAt.toDate().toLocaleDateString() : 'Unknown',
          publishedAt: data.publishedAt
        };
      });

      const listingsData = allListingsData.filter(listing => listing.status === 'active');

      listingsData.sort((a, b) => {
        const aDate = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(0);
        const bDate = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(0);
        return bDate - aDate;
      });

      setListings(listingsData);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading listings:', error);
      setListings([]);
      setLoading(false);
    }
  };

  // Calculate progress percentage based on current step and category
  const calculateProgress = (currentStep, category, currentStepNumber = null) => {
    // For service category
    if (category === 'service') {
      const serviceStepOrder = [
        'hostingsteps', 'service-category-selection', 'service-location', 
        'service-years-of-experience', 'service-qualifications', 'service-online-profiles',
        'service-title', 'service-what-provide', 'service-address', 'service-where-provide',
        'service-photos', 'create-your-offerings', 'your-offerings', 'service-description'
      ];
      const currentIndex = serviceStepOrder.indexOf(currentStep);
      if (currentIndex === -1) return 0;
      return Math.round(((currentIndex + 1) / serviceStepOrder.length) * 100);
    }
    
    // For experience category with step names
    if (category === 'experience') {
      const experienceStepOrder = [
        'hostingsteps', 'experience-category-selection', 'experience-subcategory-selection',
        'experience-location', 'experience-listing-summary', 'experience-details'
      ];
      const currentIndex = experienceStepOrder.indexOf(currentStep);
      
      // For experience-details, use currentStepNumber if available for more accurate progress
      // IMPORTANT: Only use currentStepNumber when currentStep is 'experience-details'
      if (currentStep === 'experience-details' && currentStepNumber !== null && currentStepNumber !== undefined) {
        // experience-details is the last main step, so base progress is 80% (4/5 main steps)
        // Then add progress within the 16 steps: (currentStepNumber / 16) * 20%
        const baseProgress = 80; // 4 out of 5 main steps completed
        const stepProgress = (currentStepNumber / 16) * 20; // Remaining 20% for the 16 steps
        return Math.round(baseProgress + stepProgress);
      }
      
      // If step not found in the order, return 0
      if (currentIndex === -1) {
        return 0;
      }
      
      // For experience-listing-summary, it's step 5 out of 6 (but experience-details has 16 sub-steps)
      // So it should be approximately 80% (4/5 main steps, with experience-details being the 5th)
      if (currentStep === 'experience-listing-summary') {
        return 80; // 4 out of 5 main steps completed (experience-details is the 5th with 16 sub-steps)
      }
      
      // For other steps, calculate normally but account for experience-details being a multi-step page
      // Steps before experience-listing-summary: 0-80%
      // experience-listing-summary: 80%
      // experience-details: 80-100% (based on currentStepNumber - handled above)
      if (currentIndex < 4) {
        // Steps 0-3: 0%, 20%, 40%, 60%
        // hostingsteps (index 0) = 0%, experience-category-selection (index 1) = 20%, etc.
        return Math.round((currentIndex / 4) * 80);
      }
      // For experience-listing-summary (index 4), return 80%
      if (currentIndex === 4) {
        return 80;
      }
      // For experience-details (index 5), should be handled above, but fallback to 80%
      return 80;
    }
    
    // For accommodation category (default)
    const stepOrder = [
      'hostingsteps', 'propertydetails', 'propertystructure', 'privacytype', 'location',
      'locationconfirmation', 'propertybasics', 'makeitstandout', 'amenities',
      'photos', 'titledescription', 'description',
      'descriptiondetails', 'finishsetup', 'bookingsettings', 'guestselection',
      'pricing', 'weekendpricing', 'discounts', 'safetydetails', 'finaldetails'
    ];

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex === -1) return 0;
    return Math.round(((currentIndex + 1) / stepOrder.length) * 100);
  };

  const loadDrafts = async () => {
    try {
      const userDrafts = await getUserDrafts();
      
      // Load photos from subcollection for service drafts
      const draftsWithPhotos = await Promise.all(
        userDrafts.map(async (draft) => {
          const data = draft.data || {};
          const category = draft.category || 'accommodation';
          
          // For service drafts, load photos from subcollection
          let photos = [];
          if (category === 'service') {
            try {
              const photosRef = collection(db, "onboardingDrafts", draft.id, "servicePhotos");
              const photosQuery = query(photosRef, orderBy("createdAt", "asc"));
              const photosSnap = await getDocs(photosQuery);
              photos = photosSnap.docs.map(doc => {
                const photoData = doc.data();
                return {
                  id: doc.id,
                  name: photoData.name || 'photo',
                  url: photoData.base64 || photoData.url,
                  base64: photoData.base64,
                };
              });
              console.log(`✅ Loaded ${photos.length} photos from subcollection for service draft ${draft.id}`);
            } catch (photoError) {
              console.warn(`⚠️ Could not load photos from subcollection for draft ${draft.id}:`, photoError);
              // Fallback to old location (data.servicePhotos or data.photos)
              photos = Array.isArray(data.servicePhotos) ? data.servicePhotos : (Array.isArray(data.photos) ? data.photos : []);
            }
          } else {
            // For accommodations/experiences, try loading from subcollection first
            try {
              const photosRef = collection(db, "onboardingDrafts", draft.id, "photos");
              const photosQuery = query(photosRef, orderBy("createdAt", "asc"));
              const photosSnap = await getDocs(photosQuery);
              if (!photosSnap.empty) {
                photos = photosSnap.docs.map(doc => {
                  const photoData = doc.data();
                  return {
                    id: doc.id,
                    name: photoData.name || 'photo',
                    url: photoData.base64 || photoData.url,
                    base64: photoData.base64,
                  };
                });
                console.log(`✅ Loaded ${photos.length} photos from subcollection for accommodation draft ${draft.id}`);
              } else {
                // Fallback to old location (data.photos)
                photos = Array.isArray(data.photos) ? data.photos : [];
              }
            } catch (photoError) {
              console.warn(`⚠️ Could not load photos from subcollection for draft ${draft.id}:`, photoError);
              // Fallback to old location (data.photos)
              photos = Array.isArray(data.photos) ? data.photos : [];
            }
          }
          
          return { ...draft, loadedPhotos: photos };
        })
      );
      
      const transformedDrafts = draftsWithPhotos.map(draft => {
        const data = draft.data || {};
        const category = draft.category || 'accommodation';
        const title = category === 'service' 
          ? (data.serviceTitle || data.title || draft.title || 'Untitled Draft')
          : (data.title || draft.title || 'Untitled Draft');
        
        // Handle location data based on category
        let locationData = {};
        if (category === 'service') {
          locationData = data.serviceLocation || data.locationData || {};
        } else {
          locationData = data.locationData || {};
        }
        
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
          } else if (locationData.province) {
            location = locationData.province;
            locationArea = locationData.province;
          } else if (locationData.country) {
            location = locationData.country;
            locationArea = locationData.country;
          }
        }
        
        // Use loaded photos (from subcollection for services, or from data for others)
        const photos = draft.loadedPhotos || [];
        const mainImage = photos.length > 0 && photos[0] && (photos[0].base64 || photos[0].url)
          ? (photos[0].base64 || photos[0].url)
          : null;
        
        const propertyBasics = data.propertyBasics || {};
        const privacyType = data.privacyType || null;
        const propertyStructure = data.propertyStructure || null;
        const serviceCategory = data.serviceCategory || null;
        const currentStep = draft.currentStep || 'hostingsteps';
        // category is already declared above (line 318)
        const currentStepNumber = draft.data?.currentStepNumber || null;
        const progress = calculateProgress(currentStep, category, currentStepNumber);
        
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
            
            if (diffHours < 24) {
              if (diffSeconds < 60) {
                lastModifiedFormatted = `${diffSeconds} ${diffSeconds === 1 ? 'second' : 'seconds'} ago`;
              } else if (diffMinutes < 60) {
                lastModifiedFormatted = `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
              } else {
                const hours = diffHours;
                const remainingMinutes = diffMinutes % 60;
                if (remainingMinutes > 0) {
                  lastModifiedFormatted = `${hours}:${String(remainingMinutes).padStart(2, '0')} hours ago`;
                } else {
                  lastModifiedFormatted = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
                }
              }
            } else {
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
            lastModifiedFormatted = 'Unknown';
          }
        }
        
        return {
          ...draft,
          category: category,
          title,
          location,
          locationCity,
          locationArea,
          mainImage,
          privacyType,
          propertyStructure,
          serviceCategory,
          progress,
          lastModifiedFormatted,
        };
      });
      
      const unpublishedDrafts = transformedDrafts.filter(draft => !draft.published);
      setDrafts(unpublishedDrafts);
    } catch (error) {
      console.error('❌ Error loading drafts:', error);
      setDrafts([]);
    }
  };

  const loadUnpublishedListings = async () => {
    try {
      if (!auth.currentUser) return;
      
      const listingsRef = collection(db, 'listings');
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
        try {
          const q = query(
            listingsRef,
            where('ownerId', '==', auth.currentUser.uid),
            where('status', '==', 'inactive')
          );
          querySnapshot = await getDocs(q);
        } catch (indexError2) {
          const q = query(
            listingsRef,
            where('ownerId', '==', auth.currentUser.uid)
          );
          querySnapshot = await getDocs(q);
        }
      }
      
      const allListingsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const category = data.category || 'accommodation';
        
        // Handle service vs accommodation data structure
        let locationData, photosData;
        
        if (category === 'service') {
          locationData = data.locationData || (typeof data.location === 'object' ? data.location : {});
          photosData = data.photos || [];
        } else {
          locationData = data.locationData || {};
          photosData = data.photos || [];
        }
        
        // Extract location display
        let locationDisplay = 'No location';
        let locationCity = '';
        let locationArea = '';
        
        if (category === 'service') {
          if (locationData && typeof locationData === 'object' && Object.keys(locationData).length > 0) {
            if (locationData.city && locationData.province) {
              locationDisplay = `${locationData.city}, ${locationData.province}`;
              locationCity = locationData.city;
              locationArea = locationData.province;
            } else if (locationData.city) {
              locationDisplay = locationData.city;
              locationCity = locationData.city;
            } else if (locationData.province) {
              locationDisplay = locationData.province;
              locationArea = locationData.province;
            } else if (locationData.country) {
              locationDisplay = locationData.country;
              locationArea = locationData.country;
            }
          } else if (typeof data.location === 'string' && data.location && data.location !== 'Location') {
            locationDisplay = data.location;
          }
        } else {
          locationDisplay = data.location || 
            (locationData.city && locationData.province 
              ? `${locationData.city}, ${locationData.province}`
              : locationData.city || locationData.country || 'No location');
          locationCity = locationData.city || '';
          locationArea = locationData.province || locationData.country || '';
        }
        
        // Extract service-specific fields
        let serviceCategory = null;
        let serviceOfferingsCount = 0;
        
        if (category === 'service') {
          serviceCategory = data.serviceCategory || null;
          serviceOfferingsCount = Array.isArray(data.serviceOfferings) ? data.serviceOfferings.length : 0;
        }
        
        return {
          id: doc.id,
          ...data,
          locationDisplay: locationDisplay,
          locationCity: locationCity,
          locationArea: locationArea,
          serviceCategory: serviceCategory,
          serviceOfferingsCount: serviceOfferingsCount,
          mainImage: (() => {
            const firstPhoto = photosData[0];
            if (firstPhoto?.base64) return firstPhoto.base64;
            if (firstPhoto?.url) return firstPhoto.url;
            if (data.image) return data.image;
            return null;
          })(),
          unpublishedDate: data.updatedAt?.toDate ? data.updatedAt.toDate().toLocaleDateString() : 'Unknown',
          updatedAt: data.updatedAt
        };
      });
      
      const unpublishedData = allListingsData.filter(listing => listing.status === 'inactive');
      
      if (unpublishedData.length > 0) {
        unpublishedData.sort((a, b) => {
          const aDate = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0);
          const bDate = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0);
          return bDate - aDate;
        });
      }
      
      setUnpublishedListings(unpublishedData);
    } catch (error) {
      console.error('❌ Error loading unpublished listings:', error);
      setUnpublishedListings([]);
    }
  };

  const handleEditListing = async (listing) => {
    try {
      if (!auth.currentUser) {
        alert('You must be logged in to edit listings');
        return;
      }

      const draftsCollection = collection(db, 'onboardingDrafts');
      let draftId = null;
      let existingDraft = null;

      // Check if there's already a draft for this listing
      const draftsQuery = query(
        draftsCollection,
        where('userId', '==', auth.currentUser.uid),
        where('publishedListingId', '==', listing.id),
        where('status', '==', 'draft')
      );
      const draftsSnapshot = await getDocs(draftsQuery);

      if (!draftsSnapshot.empty) {
        existingDraft = { id: draftsSnapshot.docs[0].id, ...draftsSnapshot.docs[0].data() };
        draftId = existingDraft.id;
        console.log('📝 Found existing draft for editing:', draftId);
        
        // If editing an experience listing, update the draft to point to experience-details with step 16
        if (listing.category === 'experience') {
          const draftRef = doc(db, 'onboardingDrafts', draftId);
          await updateDoc(draftRef, {
            currentStep: 'experience-details',
            'data.currentStepNumber': 16,
            lastModified: serverTimestamp(),
          });
          console.log('✅ Updated existing experience draft to step 16 (review/edit step)');
        }
      } else {
        // Get the listing data from Firestore
        const listingRef = doc(db, 'listings', listing.id);
        const listingSnap = await getDoc(listingRef);

        if (!listingSnap.exists()) {
          alert('Listing not found');
          return;
        }

        const listingData = listingSnap.data();
        const category = listingData.category || 'accommodation';
        
        let draftDataObject = {};
        let editRoute = '/pages/finaldetails';
        let currentStep = 'finaldetails';
        
        if (category === 'service') {
          // Service-specific data collection
          draftDataObject = {
            title: listingData.title || '',
            description: listingData.description || '',
            category: 'service',
            serviceTitle: listingData.title || '',
            serviceDescription: listingData.description || '',
            serviceCategory: listingData.serviceCategory || null,
            serviceYearsOfExperience: listingData.serviceYearsOfExperience || null,
            serviceExperience: listingData.serviceExperience || null,
            serviceDegree: listingData.serviceDegree || null,
            serviceCareerHighlight: listingData.serviceCareerHighlight || null,
            serviceProfilePicture: listingData.serviceProfilePicture || null,
            serviceProfiles: listingData.serviceProfiles || [],
            serviceAddress: listingData.serviceAddress || null,
            serviceWhereProvide: listingData.serviceWhereProvide || null,
            serviceLocation: listingData.locationData || listingData.location || {},
            servicePhotos: listingData.photos || [],
            servicePricing: listingData.pricing || {},
            serviceOfferings: listingData.serviceOfferings || [],
            serviceNationalPark: listingData.serviceNationalPark !== undefined ? listingData.serviceNationalPark : null,
            serviceTransportingGuests: listingData.serviceTransportingGuests !== undefined ? listingData.serviceTransportingGuests : null,
            serviceAgreedToTerms: listingData.serviceAgreedToTerms !== undefined ? listingData.serviceAgreedToTerms : false,
            descriptionHighlights: listingData.descriptionHighlights || [],
          };
          editRoute = '/pages/service-what-provide';
          currentStep = 'service-what-provide';
        } else if (category === 'experience') {
          // Experience-specific data collection
          draftDataObject = {
            category: 'experience',
            experienceCategory: listingData.experienceCategory || 'art-and-design',
            experienceSubcategory: listingData.experienceSubcategory || null,
            experienceTitle: listingData.experienceTitle || listingData.title || '',
            experienceDescription: listingData.experienceDescription || listingData.description || '',
            yearsOfExperience: listingData.yearsOfExperience || 10,
            introTitle: listingData.introTitle || '',
            expertise: listingData.expertise || '',
            recognition: listingData.recognition || '',
            profiles: listingData.profiles || [],
            country: listingData.residentialAddress?.country || listingData.locationData?.country || 'Philippines',
            province: listingData.residentialAddress?.province || listingData.locationData?.province || '',
            city: listingData.residentialAddress?.city || listingData.locationData?.city || '',
            barangay: listingData.residentialAddress?.barangay || listingData.locationData?.barangay || '',
            streetAddress: listingData.residentialAddress?.streetAddress || listingData.locationData?.streetAddress || '',
            unit: listingData.residentialAddress?.unit || listingData.locationData?.unit || '',
            buildingName: listingData.residentialAddress?.buildingName || listingData.locationData?.buildingName || '',
            zipCode: listingData.residentialAddress?.zipCode || listingData.locationData?.zipCode || '',
            meetingAddress: listingData.meetingAddress?.address || listingData.meetingLocationData?.address || '',
            confirmCountry: listingData.meetingAddress?.country || listingData.locationData?.country || 'Philippines',
            confirmProvince: listingData.meetingAddress?.province || listingData.locationData?.province || '',
            confirmCity: listingData.meetingAddress?.city || listingData.locationData?.city || '',
            confirmBarangay: listingData.locationData?.barangay || '',
            confirmStreetAddress: listingData.locationData?.streetAddress || '',
            confirmUnit: listingData.locationData?.unit || '',
            confirmBuildingName: listingData.locationData?.buildingName || '',
            confirmZipCode: listingData.locationData?.zipCode || '',
            locationName: listingData.locationData?.locationName || '',
            mapLat: listingData.meetingLocationData?.lat || listingData.locationData?.lat || null,
            mapLng: listingData.meetingLocationData?.lng || listingData.locationData?.lng || null,
            photos: listingData.photos || [],
            itineraryItems: listingData.itineraryItems || [],
            maxGuests: listingData.maxGuests || 1,
            pricePerGuest: listingData.pricePerGuest || null,
            privateGroupMinimum: listingData.privateGroupMinimum || null,
            discounts: listingData.experienceDiscounts || [],
            willTransportGuests: listingData.willTransportGuests !== undefined ? listingData.willTransportGuests : null,
            transportationTypes: listingData.transportationTypes || [],
            termsAgreed: listingData.termsAgreed !== undefined ? listingData.termsAgreed : false,
            currentStepNumber: 16, // Default to last step (submit listing) so user can review and edit
          };
          // Navigate to experience-details with step 16 (submit/review step) so user can review and edit
          // Alternatively, could navigate to step 1 to go through all steps
          editRoute = '/pages/experience-details';
          currentStep = 'experience-details';
        } else {
          // Accommodation-specific data collection
          draftDataObject = {
            title: listingData.title || '',
            description: listingData.description || '',
            category: 'accommodation',
            price: listingData.price || 0,
            location: listingData.location || '',
            locationData: listingData.locationData || {},
            photos: listingData.photos || [],
            propertyBasics: listingData.propertyBasics || {},
            amenities: listingData.amenities || [],
            descriptionHighlights: listingData.descriptionHighlights || [],
            privacyType: listingData.privacyType || '',
            propertyStructure: listingData.propertyStructure || '',
          };

          if (listingData.bathroomTypes !== undefined && listingData.bathroomTypes !== null) {
            draftDataObject.bathroomTypes = listingData.bathroomTypes;
          }
          if (listingData.occupancy !== undefined && listingData.occupancy !== null) {
            draftDataObject.occupancy = listingData.occupancy;
          }
        }

        Object.keys(draftDataObject).forEach(key => {
          if (draftDataObject[key] === undefined) {
            delete draftDataObject[key];
          }
        });

        const draftData = {
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          category: category,
          status: 'draft',
          currentStep: currentStep,
          lastModified: serverTimestamp(),
          createdAt: serverTimestamp(),
          publishedListingId: listing.id,
          published: false,
          data: {
            ...draftDataObject,
            // Don't store photos in main document - they'll be in subcollection
            photos: [],
            hasPhotos: (listingData.photos && listingData.photos.length > 0) || false
          }
        };

        const draftRef = await addDoc(draftsCollection, draftData);
        draftId = draftRef.id;
        console.log('✅ Created draft for editing:', draftId);
        
        // Save photos to subcollection (not in main document to avoid size limits)
        const photosToSave = listingData.photos || [];
        if (photosToSave.length > 0) {
          try {
            const photosRef = collection(db, "onboardingDrafts", draftId, category === 'service' ? "servicePhotos" : "photos");
            const savePromises = photosToSave.map(async (photo) => {
              // Ensure photo has base64 data
              const photoData = {
                name: photo.name || 'photo',
                base64: photo.base64 || photo.url || '',
                url: photo.base64 || photo.url || '',
                createdAt: new Date(),
              };
              if (photoData.base64) {
                await addDoc(photosRef, photoData);
              }
            });
            await Promise.all(savePromises);
            console.log(`✅ Saved ${photosToSave.length} photos to subcollection for draft ${draftId}`);
          } catch (photoError) {
            console.error('⚠️ Error saving photos to subcollection:', photoError);
            // Non-critical - continue even if photo save fails
          }
        }
      }

      await loadListings();

      // Navigate to correct edit route based on listing category
      const listingCategory = listing.category || 'accommodation';
      const editRoutes = {
        'service': '/pages/service-what-provide',
        'accommodation': '/pages/finaldetails',
        'experience': '/pages/experience-details', // Navigate to experience-details with step 16 for review/edit
      };
      
      // Prepare navigation state based on category
      const navigationState = {
        draftId: draftId,
        listingId: listing.id,
        isEditMode: true,
        category: listingCategory
      };
      
      // Add experience-specific state if needed
      // Use existingDraft data if available, otherwise get from listing
      if (listingCategory === 'experience') {
        let experienceData = null;
        if (existingDraft && existingDraft.data) {
          experienceData = existingDraft.data;
        } else {
          // Get listing data if we don't have it from existing draft
          const listingRef = doc(db, 'listings', listing.id);
          const listingSnap = await getDoc(listingRef);
          if (listingSnap.exists()) {
            experienceData = listingSnap.data();
          }
        }
        
        if (experienceData) {
          navigationState.experienceCategory = experienceData.experienceCategory || 'art-and-design';
          navigationState.experienceSubcategory = experienceData.experienceSubcategory || null;
          navigationState.experienceCity = experienceData.locationData?.city || experienceData.location || '';
          // Navigate to step 16 (submit/review step) so user can review all data and edit
          // The draft data already has currentStepNumber: 16 set above
          navigationState.currentStepNumber = 16;
        }
      }
      
      navigate(editRoutes[listingCategory] || '/pages/finaldetails', { 
        state: navigationState
      });
    } catch (error) {
      console.error('❌ Error preparing draft for editing:', error);
      alert('Failed to edit listing. Please try again.');
    }
  };

  const handleUnpublishListing = (listing, e) => {
    e.stopPropagation();
    setListingToUnpublish(listing);
    setUnpublishModalOpen(true);
  };

  const confirmUnpublishListing = async () => {
    if (!listingToUnpublish || !auth.currentUser) {
      setUnpublishModalOpen(false);
      return;
    }

    try {
      const listingRef = doc(db, 'listings', listingToUnpublish.id);
      await updateDoc(listingRef, {
        status: 'inactive',
        updatedAt: serverTimestamp()
      });

      // Deduct points/value for unpublished listing
      try {
        const { deductPointsForUnpublishedListing } = await import('@/pages/Host/services/pointsService');
        console.log('🔍 Calling deductPointsForUnpublishedListing for listing:', listingToUnpublish.id);
        const deductionResult = await deductPointsForUnpublishedListing(auth.currentUser.uid, listingToUnpublish.id);
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

      await loadListings();
      setUnpublishModalOpen(false);
      setListingToUnpublish(null);
    } catch (error) {
      console.error('❌ Error unpublishing listing:', error);
      toast.error('Failed to unpublish listing');
      setUnpublishModalOpen(false);
      setListingToUnpublish(null);
    }
  };

  const handleContinueDraft = (draft) => {
    const category = draft.category || 'accommodation';
    const currentStep = draft.currentStep || 'hostingsteps';
    const draftData = draft.data || {};
    const currentStepNumber = draftData.currentStepNumber;
    
    // Define routes based on category
    let stepRoutes = {};
    
    if (category === 'experience') {
      // Experience onboarding routes - include all individual step routes
      stepRoutes = {
        'hostingsteps': '/pages/hostingsteps',
        'experience-category-selection': '/pages/experience-category-selection',
        'experience-subcategory-selection': '/pages/experience-subcategory-selection',
        'experience-location': '/pages/experience-location',
        'experience-listing-summary': '/pages/experience-listing-summary',
        'experience-years-of-experience': '/pages/experience-years-of-experience',
        'experience-qualifications': '/pages/experience-qualifications',
        'experience-online-profiles': '/pages/experience-details', // Still use experience-details for now
        'experience-residential-address': '/pages/experience-details',
        'experience-meeting-address': '/pages/experience-details',
        'experience-photos': '/pages/experience-details',
        'experience-itinerary': '/pages/experience-details',
        'experience-max-guests': '/pages/experience-max-guests',
        'experience-price-per-guest': '/pages/experience-price-per-guest',
        'experience-private-group-minimum': '/pages/experience-details',
        'experience-review-pricing': '/pages/experience-details',
        'experience-discounts': '/pages/experience-details',
        'experience-transportation': '/pages/experience-details',
        'experience-title-description-preview': '/pages/experience-details',
        'experience-create-title-description': '/pages/experience-details',
        'experience-submit-listing': '/pages/experience-details',
        'experience-details': '/pages/experience-details', // Fallback for old drafts
        'finaldetails': '/pages/finaldetails'
      };
    } else if (category === 'service') {
      // Service onboarding routes
      stepRoutes = {
        'hostingsteps': '/pages/hostingsteps',
        'service-category-selection': '/pages/service-category-selection',
        'service-location': '/pages/service-location',
        'service-years-of-experience': '/pages/service-years-of-experience',
        'service-qualifications': '/pages/service-qualifications',
        'service-online-profiles': '/pages/service-online-profiles',
        'service-title': '/pages/service-title',
        'service-what-provide': '/pages/service-what-provide',
        'service-address': '/pages/service-address',
        'service-where-provide': '/pages/service-where-provide',
        'service-photos': '/pages/service-photos',
        'create-your-offerings': '/pages/create-your-offerings',
        'your-offerings': '/pages/your-offerings',
        'service-description': '/pages/service-description'
      };
    } else {
      // Accommodation onboarding routes (default)
      stepRoutes = {
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
        'finaldetails': '/pages/finaldetails'
      };
    }
    
    // Get the route for the current step, with fallback
    let route = stepRoutes[currentStep];
    let stepNumberToPass = currentStepNumber;
    
    // Map step names to step numbers for experience steps that use experience-details
    const experienceStepNameToNumber = {
      'experience-years-of-experience': 1,
      'experience-qualifications': 2,
      'experience-online-profiles': 3,
      'experience-residential-address': 4,
      'experience-meeting-address': 5,
      'experience-photos': 6,
      'experience-itinerary': 7,
      'experience-max-guests': 8,
      'experience-price-per-guest': 9,
      'experience-private-group-minimum': 10,
      'experience-review-pricing': 11,
      'experience-discounts': 12,
      'experience-transportation': 13,
      'experience-title-description-preview': 14,
      'experience-create-title-description': 15,
      'experience-submit-listing': 16,
    };
    
    // If currentStep is a step name (not experience-details), get the step number
    if (category === 'experience' && experienceStepNameToNumber[currentStep] !== undefined) {
      stepNumberToPass = experienceStepNameToNumber[currentStep];
    }
    
    // Special handling for experience-details: check if we should navigate to individual step files
    // If currentStep is experience-details but we have a specific step name, try that first
    if (category === 'experience' && currentStep === 'experience-details' && currentStepNumber !== undefined && currentStepNumber !== null) {
      // Map step number to step name
      const stepNameMap = {
        1: 'experience-years-of-experience',
        2: 'experience-qualifications',
        3: 'experience-online-profiles',
        4: 'experience-residential-address',
        5: 'experience-meeting-address',
        6: 'experience-photos',
        7: 'experience-itinerary',
        8: 'experience-max-guests',
        9: 'experience-price-per-guest',
        10: 'experience-private-group-minimum',
        11: 'experience-review-pricing',
        12: 'experience-discounts',
        13: 'experience-transportation',
        14: 'experience-title-description-preview',
        15: 'experience-create-title-description',
        16: 'experience-submit-listing',
      };
      
      const stepName = stepNameMap[currentStepNumber];
      if (stepName && stepRoutes[stepName]) {
        // If we have a separate file for this step, navigate there
        // But for now, most steps still use experience-details, so we'll pass the step number
        route = stepRoutes[stepName] || '/pages/experience-details';
        // Keep the step number for navigation state
        stepNumberToPass = currentStepNumber;
      } else {
        // Otherwise, navigate to experience-details with the step number
        route = '/pages/experience-details';
        stepNumberToPass = currentStepNumber;
      }
    }
    
    // If route is experience-details and we have a step name, get the step number
    if (category === 'experience' && route === '/pages/experience-details' && stepNumberToPass === undefined && experienceStepNameToNumber[currentStep] !== undefined) {
      stepNumberToPass = experienceStepNameToNumber[currentStep];
    }
    
    // If route not found, use category-specific default
    if (!route) {
      if (category === 'experience') {
        route = '/pages/experience-category-selection';
      } else if (category === 'service') {
        route = '/pages/service-category-selection';
      } else {
        route = '/pages/propertydetails';
      }
    }
    
    console.log('🔍 Continuing draft:', {
      category,
      currentStep,
      currentStepNumber,
      stepNumberToPass,
      route,
      draftId: draft.id,
      hasStepNumber: stepNumberToPass !== undefined && stepNumberToPass !== null
    });
    
    // Prepare navigation state
    const navigationState = { 
      draftId: draft.id,
      category: category
    };
    
    // For experience-details, always pass the step number if we have it
    if (category === 'experience' && route === '/pages/experience-details' && stepNumberToPass !== undefined && stepNumberToPass !== null) {
      navigationState.currentStepNumber = stepNumberToPass;
      console.log('✅ Passing currentStepNumber to experience-details:', stepNumberToPass);
      // Also pass experience category data if available
      if (draftData.experienceCategory) {
        navigationState.experienceCategory = draftData.experienceCategory;
      }
      if (draftData.experienceSubcategory) {
        navigationState.experienceSubcategory = draftData.experienceSubcategory;
      }
      if (draftData.experienceCity) {
        navigationState.experienceCity = draftData.experienceCity;
      }
    }
    
    // For individual step routes, also pass the experience category and step number if available
    if (category === 'experience' && route !== '/pages/experience-details') {
      if (draftData.experienceCategory) {
        navigationState.experienceCategory = draftData.experienceCategory;
      }
      if (draftData.experienceSubcategory) {
        navigationState.experienceSubcategory = draftData.experienceSubcategory;
      }
      if (draftData.experienceCity) {
        navigationState.experienceCity = draftData.experienceCity;
      }
      // Pass step number for individual routes too (in case they need to redirect)
      if (stepNumberToPass !== undefined && stepNumberToPass !== null) {
        navigationState.currentStepNumber = stepNumberToPass;
      }
    }
    
    navigate(route, { 
      state: navigationState
    });
  };

  const handleDeleteDraft = async (draftId) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) return;
    try {
      await deleteDraft(draftId);
      await loadDrafts();
      toast.success('Draft deleted successfully');
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error('Failed to delete draft.');
    }
  };

  // Helper function to format service category name
  const getServiceCategoryName = (categoryId) => {
    if (!categoryId) return '';
    const categoryMap = {
      "catering": "Catering",
      "chef": "Chef",
      "hair-styling": "Hair Styling",
      "makeup": "Makeup",
      "massage": "Massage",
      "nails": "Nail",
      "personal-training": "Personal Training",
      "photography": "Photography",
      "prepared-meals": "Prepared Meal",
      "spa-treatments": "Spa Treatment",
    };
    return categoryMap[categoryId] || categoryId;
  };

  // Helper function to get correct route based on listing category
  const getListingRoute = (listing) => {
    const routeMap = {
      'accommodation': `/accommodations/${listing.id}`,
      'service': `/services/${listing.id}`,
      'experience': `/experiences/${listing.id}`,
    };
    return routeMap[listing.category] || `/accommodations/${listing.id}`;
  };

  const handleRepublishListing = async (listing, e) => {
    e.stopPropagation();
    
    if (!auth.currentUser) {
      alert('You must be logged in to republish listings');
      return;
    }

    try {
      const listingRef = doc(db, 'listings', listing.id);
      await updateDoc(listingRef, {
        status: 'active',
        updatedAt: serverTimestamp()
      });
      
      // Restore points/value for republished listing
      try {
        const { restorePointsForRepublishedListing } = await import('@/pages/Host/services/pointsService');
        const restoreResult = await restorePointsForRepublishedListing(auth.currentUser.uid, listing.id);
        
        if (restoreResult.success) {
          if (restoreResult.restored) {
            console.log('✅ Points restored for republished listing:', restoreResult);
            toast.success(`Listing republished. ${restoreResult.pointsRestored} points restored.`);
          } else {
            toast.success('Listing republished successfully');
          }
        } else {
          toast.success('Listing republished successfully');
        }
      } catch (pointsError) {
        console.error('Error restoring points for republished listing:', pointsError);
        toast.success('Listing republished successfully');
        // Don't fail republish if points restoration fails
      }

      await loadListings();
      await loadUnpublishedListings();
    } catch (error) {
      console.error('❌ Error republishing listing:', error);
      toast.error('Failed to republish listing. Please try again.');
    }
  };

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
      const listingRef = doc(db, 'listings', listing.id);
      await deleteDoc(listingRef);
      
      toast.success('Listing deleted successfully');
      await loadUnpublishedListings();
    } catch (error) {
      console.error('❌ Error deleting listing:', error);
      toast.error('Failed to delete listing. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-36">
          <Loading message="Loading listings..." />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="font-heading text-4xl font-bold text-foreground mb-2">
                  My Listings
                </h1>
                <p className="text-muted-foreground">
                  Manage your published listings, accommodations, services, and experiences.
                </p>
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
                  Create New Listing
                </button>
              </div>
            </div>
          </div>

          {/* Listings Container with Tabs */}
          {user && (
            <div className="bg-white rounded-xl shadow p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-8">
                  {TABS.map(tab => {
                    let count = tab.key === 'all'
                      ? listings.length
                      : listings.filter(l => l.category === tab.key).length;
                    return (
                      <button
                        key={tab.key}
                        className={`relative pb-2 text-base font-medium border-b-2 transition-colors ${listingTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-gray-700 hover:text-primary'}`}
                        onClick={() => setListingTab(tab.key)}
                      >
                        {tab.label} <span className="text-sm text-muted-foreground">({count})</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
                  <button onClick={() => setListingView('grid')} className={`p-2 rounded-lg transition-colors ${listingView === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Grid className="w-5 h-5" /></button>
                  <button onClick={() => setListingView('list')} className={`p-2 rounded-lg transition-colors ${listingView === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="min-h-[260px]">
                {(listingTab === 'all' ? listings : listings.filter(l => l.category === listingTab)).length === 0 ? (
                  <div className="text-center py-16">
                    <HomeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" strokeWidth={2} />
                    <div className="text-lg font-medium mb-2">No listings yet.</div>
                    <div className="text-gray-500 text-center">Start exploring and publish your accommodations, services, and experiences.</div>
                  </div>
                ) : (
                  listingView === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(listingTab === 'all' ? listings : listings.filter(l => l.category === listingTab)).map((listing, idx) => (
                        <div key={listing.id || idx} className="card-listing cursor-pointer hover-lift overflow-hidden" onClick={() => navigate(getListingRoute(listing))}>
                          <div className="relative w-full overflow-hidden aspect-[4/3] bg-gray-100">
                            {listing.mainImage ? (
                              <img 
                                src={listing.mainImage} 
                                alt={listing.title || 'Listing'} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`absolute inset-0 flex items-center justify-center ${listing.mainImage ? 'hidden' : ''}`}>
                              <Camera className="w-12 h-12 text-gray-400" />
                            </div>
                          </div>
                          
                          <div className="p-5">
                            <h3 className="font-heading text-lg font-semibold text-foreground mb-2 line-clamp-2">
                              {listing.title || 'Untitled Listing'}
                            </h3>
                            
                            <p className="font-body text-sm text-muted-foreground flex items-center gap-1 mb-3">
                              <MapPin className="w-4 h-4 flex-shrink-0" /> 
                              <span className="truncate">
                                {listing.locationCity && listing.locationArea 
                                  ? `${listing.locationCity}, ${listing.locationArea}`
                                  : listing.locationDisplay || 'No location'}
                              </span>
                            </p>
                            
                            {/* Show service category for services, or property type for accommodations */}
                            {listing.category === 'service' && listing.serviceCategory ? (
                              <div className="mb-3">
                                <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">
                                  {getServiceCategoryName(listing.serviceCategory)}
                                  {listing.serviceOfferingsCount > 0 && (
                                    <span className="ml-1 text-muted-foreground">
                                      • {listing.serviceOfferingsCount} {listing.serviceOfferingsCount === 1 ? 'offering' : 'offerings'}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ) : (listing.privacyType || listing.propertyStructure) && (
                              <div className="mb-3">
                                <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">
                                  {listing.privacyType && listing.propertyStructure
                                    ? `${listing.privacyType} in ${listing.propertyStructure}`
                                    : listing.privacyType || listing.propertyStructure}
                                </span>
                              </div>
                            )}
                            
                            {listing.price && (
                              <div className="mb-3">
                                <span className="font-heading text-lg font-bold text-foreground">
                                  ₱{listing.price.toLocaleString()}
                                </span>
                                {listing.category !== 'service' && (
                                  <span className="text-sm text-muted-foreground ml-1">/ night</span>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1 mb-3 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>Published {listing.publishedDate}</span>
                            </div>
                            
                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                              <button 
                                className="btn-primary flex-1 px-3 py-2 text-sm font-medium" 
                                onClick={e => {e.stopPropagation(); handleEditListing(listing);}}
                              >
                                <Edit className="w-4 h-4 inline mr-1" />
                                Edit
                              </button>
                              <button 
                                className="btn-outline px-3 py-2 text-sm font-medium" 
                                onClick={e => {e.stopPropagation(); navigate(getListingRoute(listing));}}
                              >
                                View
                              </button>
                              <button 
                                className="btn-outline px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:border-red-300" 
                                onClick={e => handleUnpublishListing(listing, e)}
                                title="Unpublish listing"
                              >
                                <EyeOff className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(listingTab === 'all' ? listings : listings.filter(l => l.category === listingTab)).map((listing, idx) => (
                        <div key={listing.id || idx} className="card-listing hover-lift cursor-pointer flex items-start gap-4 p-4" onClick={() => navigate(getListingRoute(listing))}>
                          <div className="relative flex-shrink-0 w-36 h-36 overflow-hidden rounded-lg bg-gray-100">
                            {listing.mainImage ? (
                              <img 
                                src={listing.mainImage} 
                                alt={listing.title || 'Listing'} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`absolute inset-0 flex items-center justify-center ${listing.mainImage ? 'hidden' : ''}`}>
                              <Camera className="w-12 h-12 text-gray-400" />
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{listing.title || 'Untitled Listing'}</h3>
                            <p className="font-body text-sm text-muted-foreground flex items-center gap-1 mb-2">
                              <MapPin className="w-4 h-4" /> 
                              {listing.locationCity && listing.locationArea 
                                ? `${listing.locationCity}, ${listing.locationArea}`
                                : listing.locationDisplay || 'No location'}
                            </p>
                            
                            {/* Show service category for services */}
                            {listing.category === 'service' && listing.serviceCategory && (
                              <div className="mb-2">
                                <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">
                                  {getServiceCategoryName(listing.serviceCategory)}
                                  {listing.serviceOfferingsCount > 0 && (
                                    <span className="ml-1 text-muted-foreground">
                                      • {listing.serviceOfferingsCount} {listing.serviceOfferingsCount === 1 ? 'offering' : 'offerings'}
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            
                            {listing.price && (
                              <p className="font-heading text-lg font-bold text-foreground mb-2">
                                ₱{listing.price.toLocaleString()}
                                {listing.category !== 'service' && (
                                  <span className="text-sm font-normal text-muted-foreground">/ night</span>
                                )}
                              </p>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                              <Clock className="w-3 h-3" />
                              <span>Published {listing.publishedDate}</span>
                            </div>
                            
                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                              <button 
                                className="btn-primary flex-1 px-3 py-2 text-sm font-medium" 
                                onClick={e => {e.stopPropagation(); handleEditListing(listing);}}
                              >
                                <Edit className="w-4 h-4 inline mr-1" />
                                Edit
                              </button>
                              <button 
                                className="btn-outline px-3 py-2 text-sm font-medium" 
                                onClick={e => {e.stopPropagation(); navigate(getListingRoute(listing));}}
                              >
                                View
                              </button>
                              <button 
                                className="btn-outline px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:border-red-300" 
                                onClick={e => handleUnpublishListing(listing, e)}
                                title="Unpublish listing"
                              >
                                <EyeOff className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Saved Drafts Container with Tabs */}
          {user && (
            <div className="mb-12" ref={savedDraftsRef}>
              <div className="mb-2">
                <h2 className="text-xl font-bold text-foreground mb-2">Saved Drafts</h2>
              </div>
              <div className="bg-white rounded-xl shadow p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-8">
                    {TABS.map(tab => {
                      let count = tab.key === 'all'
                        ? drafts.length
                        : drafts.filter(d => d.category === tab.key).length;
                      return (
                        <button
                          key={tab.key}
                          className={`relative pb-2 text-base font-medium border-b-2 transition-colors ${draftTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-gray-700 hover:text-primary'}`}
                          onClick={() => setDraftTab(tab.key)}
                        >
                          {tab.label} <span className="text-sm text-muted-foreground">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
                    <button onClick={() => setDraftView('grid')} className={`p-2 rounded-lg transition-colors ${draftView === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Grid className="w-5 h-5" /></button>
                    <button onClick={() => setDraftView('list')} className={`p-2 rounded-lg transition-colors ${draftView === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="min-h-[260px]">
                  {(draftTab === 'all' ? drafts : drafts.filter(d => d.category === draftTab)).length === 0 ? (
                    <div className="text-center py-16">
                      <HomeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" strokeWidth={2} />
                      <div className="text-lg font-medium mb-2">No drafts yet.</div>
                      <div className="text-gray-500 text-center">Start creating and save your drafts for accommodations, services, and experiences.</div>
                    </div>
                  ) : (
                    draftView === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(draftTab === 'all' ? drafts : drafts.filter(d => d.category === draftTab)).map((draft, idx) => (
                          <div key={draft.id || idx} className="card-listing cursor-pointer hover-lift overflow-hidden" onClick={() => handleContinueDraft(draft)}>
                            <div className="relative w-full overflow-hidden aspect-[4/3] bg-gray-100">
                              {draft.mainImage ? (
                                <img 
                                  src={draft.mainImage} 
                                  alt={draft.title || 'Draft'} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`absolute inset-0 flex items-center justify-center ${draft.mainImage ? 'hidden' : ''}`}>
                                <Camera className="w-12 h-12 text-gray-400" />
                              </div>
                              <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                                Draft
                              </div>
                            </div>
                            
                            <div className="p-5">
                              <h3 className="font-heading text-lg font-semibold text-foreground mb-2 line-clamp-2">
                                {draft.title || 'Untitled Draft'}
                              </h3>
                              
                              <p className="font-body text-sm text-muted-foreground flex items-center gap-1 mb-3">
                                <MapPin className="w-4 h-4 flex-shrink-0" /> 
                                <span className="truncate">
                                  {draft.locationCity && draft.locationArea 
                                    ? `${draft.locationCity}, ${draft.locationArea}`
                                    : draft.location || 'No location'}
                                </span>
                              </p>
                              
                              {(draft.privacyType || draft.propertyStructure) && (
                                <div className="mb-3">
                                  <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">
                                    {draft.privacyType && draft.propertyStructure
                                      ? `${draft.privacyType} in ${draft.propertyStructure}`
                                      : draft.privacyType || draft.propertyStructure}
                                  </span>
                                </div>
                              )}
                              
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-muted-foreground">Progress</span>
                                  <span className="text-xs font-semibold text-foreground">{draft.progress || 0}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary transition-all duration-300 rounded-full"
                                    style={{ width: `${draft.progress || 0}%` }}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1 mb-4 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>Last edited {draft.lastModifiedFormatted || 'Unknown'}</span>
                              </div>
                              
                              <div className="flex gap-2 pt-3 border-t border-gray-100">
                                <button 
                                  className="btn-primary flex-1 px-3 py-2 text-sm font-medium" 
                                  onClick={e => {e.stopPropagation(); handleContinueDraft(draft);}}
                                >
                                  Continue
                                </button>
                                <button 
                                  className="btn-outline px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:border-red-300" 
                                  onClick={e => {e.stopPropagation(); handleDeleteDraft(draft.id);}}
                                  title="Delete draft"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(draftTab === 'all' ? drafts : drafts.filter(d => d.category === draftTab)).map((draft, idx) => (
                          <div key={draft.id || idx} className="card-listing hover-lift cursor-pointer flex items-start gap-4 p-4" onClick={() => handleContinueDraft(draft)}>
                            <div className="relative flex-shrink-0 w-36 h-36 overflow-hidden rounded-lg bg-gray-100">
                              {draft.mainImage ? (
                                <img 
                                  src={draft.mainImage} 
                                  alt={draft.title || 'Draft'} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`absolute inset-0 flex items-center justify-center ${draft.mainImage ? 'hidden' : ''}`}>
                                <Camera className="w-10 h-10 text-gray-400" />
                              </div>
                              <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                                Draft
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-heading text-lg font-semibold text-foreground mb-1 line-clamp-1">
                                {draft.title || 'Untitled Draft'}
                              </h3>
                              
                              <p className="font-body text-sm text-muted-foreground flex items-center gap-1 mb-2">
                                <MapPin className="w-4 h-4 flex-shrink-0" /> 
                                <span className="truncate">
                                  {draft.locationCity && draft.locationArea 
                                    ? `${draft.locationCity}, ${draft.locationArea}`
                                    : draft.location || 'No location'}
                                </span>
                              </p>
                              
                              {/* Show service category for service drafts, or property type for accommodation drafts */}
                              {draft.category === 'service' && draft.serviceCategory ? (
                                <div className="mb-2">
                                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                                    {getServiceCategoryName(draft.serviceCategory)}
                                  </span>
                                </div>
                              ) : (draft.privacyType || draft.propertyStructure) && (
                                <div className="mb-2">
                                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                                    {draft.privacyType && draft.propertyStructure
                                      ? `${draft.privacyType} in ${draft.propertyStructure}`
                                      : draft.privacyType || draft.propertyStructure}
                                  </span>
                                </div>
                              )}
                              
                              <div className="mb-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-muted-foreground">Progress</span>
                                  <span className="text-xs font-semibold text-foreground">{draft.progress || 0}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary transition-all duration-300 rounded-full"
                                    style={{ width: `${draft.progress || 0}%` }}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1 mb-3 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>Last edited {draft.lastModifiedFormatted || 'Unknown'}</span>
                              </div>
                              
                              <div className="flex gap-2 pt-2 border-t border-gray-100">
                                <button 
                                  className="btn-primary px-3 py-1.5 text-sm font-medium" 
                                  onClick={e => {e.stopPropagation(); handleContinueDraft(draft);}}
                                >
                                  Continue
                                </button>
                                <button 
                                  className="btn-outline px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:border-red-300" 
                                  onClick={e => {e.stopPropagation(); handleDeleteDraft(draft.id);}}
                                  title="Delete draft"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Unpublished Listings Container with Tabs */}
          {user && (
            <div className="mb-12">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-foreground mb-2">Unpublished Listings</h2>
              </div>
              <div className="bg-white rounded-xl shadow p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-8">
                    {TABS.map(tab => {
                      let count = tab.key === 'all'
                        ? unpublishedListings.length
                        : unpublishedListings.filter(l => l.category === tab.key).length;
                      return (
                        <button
                          key={tab.key}
                          className={`relative pb-2 text-base font-medium border-b-2 transition-colors ${unpublishedTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-gray-700 hover:text-primary'}`}
                          onClick={() => setUnpublishedTab(tab.key)}
                        >
                          {tab.label} <span className="text-sm text-muted-foreground">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
                    <button onClick={() => setListingView('grid')} className={`p-2 rounded-lg transition-colors ${listingView === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Grid className="w-5 h-5" /></button>
                    <button onClick={() => setListingView('list')} className={`p-2 rounded-lg transition-colors ${listingView === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="min-h-[260px]">
                  {(unpublishedTab === 'all' ? unpublishedListings : unpublishedListings.filter(l => l.category === unpublishedTab)).length === 0 ? (
                    <div className="text-center py-16">
                      <HomeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" strokeWidth={2} />
                      <div className="text-lg font-medium mb-2">No unpublished listings yet.</div>
                      <div className="text-gray-500 text-center">Unpublished listings will appear here.</div>
                    </div>
                  ) : (
                    listingView === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(unpublishedTab === 'all' ? unpublishedListings : unpublishedListings.filter(l => l.category === unpublishedTab)).map((listing, idx) => (
                          <div key={listing.id || idx} className="card-listing cursor-pointer hover-lift overflow-hidden" onClick={() => handleEditListing(listing)}>
                            <div className="relative w-full overflow-hidden aspect-[4/3] bg-gray-100">
                              {listing.mainImage ? (
                                <img 
                                  src={listing.mainImage} 
                                  alt={listing.title || 'Listing image'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                  <Camera className="w-12 h-12 text-gray-400" />
                                </div>
                              )}
                              <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                                Unpublished
                              </div>
                            </div>
                            <div className="p-4">
                              <h3 className="font-semibold text-lg mb-1 line-clamp-1">{listing.title || 'Untitled Listing'}</h3>
                              <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                                <MapPin className="w-4 h-4" />
                                <span className="line-clamp-1">{listing.locationDisplay || 'No location'}</span>
                              </div>
                              {/* Show service category for services, or guests for accommodations */}
                              {listing.category === 'service' && listing.serviceCategory ? (
                                <div className="mb-2">
                                  <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">
                                    {getServiceCategoryName(listing.serviceCategory)}
                                    {listing.serviceOfferingsCount > 0 && (
                                      <span className="ml-1 text-muted-foreground">
                                        • {listing.serviceOfferingsCount} {listing.serviceOfferingsCount === 1 ? 'offering' : 'offerings'}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ) : null}
                              <div className="flex items-center justify-between text-sm mb-3">
                                <div className="flex items-center gap-4">
                                  {listing.category !== 'service' && listing.guests && (
                                    <div className="flex items-center gap-1">
                                      <Users className="w-4 h-4 text-gray-400" />
                                      <span>{listing.guests}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  Unpublished {listing.unpublishedDate}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-3 border-t">
                                <button 
                                  className="btn-primary flex-1 px-3 py-2 text-sm font-medium" 
                                  onClick={e => {e.stopPropagation(); handleRepublishListing(listing, e);}}
                                >
                                  Republish
                                </button>
                                <button 
                                  className="btn-outline px-3 py-2 text-sm font-medium" 
                                  onClick={e => {e.stopPropagation(); handleEditListing(listing);}}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  className="btn-outline px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:border-red-300" 
                                  onClick={e => {e.stopPropagation(); handleDeleteUnpublishedListing(listing, e);}}
                                  title="Delete listing"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(unpublishedTab === 'all' ? unpublishedListings : unpublishedListings.filter(l => l.category === unpublishedTab)).map((listing, idx) => (
                          <div key={listing.id || idx} className="card-listing hover-lift cursor-pointer flex items-start gap-4 p-4" onClick={() => handleEditListing(listing)}>
                            <div className="relative flex-shrink-0 w-36 h-36 overflow-hidden rounded-lg bg-gray-100">
                              {listing.mainImage ? (
                                <img 
                                  src={listing.mainImage} 
                                  alt={listing.title || 'Listing image'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                  <Camera className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                              <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                                Unpublished
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg mb-1 line-clamp-1">{listing.title || 'Untitled Listing'}</h3>
                              <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                                <MapPin className="w-4 h-4" />
                                <span className="line-clamp-1">{listing.locationDisplay || 'No location'}</span>
                              </div>
                              
                              {/* Show service category for services */}
                              {listing.category === 'service' && listing.serviceCategory && (
                                <div className="mb-2">
                                  <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">
                                    {getServiceCategoryName(listing.serviceCategory)}
                                    {listing.serviceOfferingsCount > 0 && (
                                      <span className="ml-1 text-muted-foreground">
                                        • {listing.serviceOfferingsCount} {listing.serviceOfferingsCount === 1 ? 'offering' : 'offerings'}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                {listing.category !== 'service' && listing.guests && (
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>{listing.guests}</span>
                                  </div>
                                )}
                                <div className="text-gray-500 text-xs">
                                  Unpublished {listing.unpublishedDate}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  className="btn-primary px-3 py-2 text-sm font-medium" 
                                  onClick={e => {e.stopPropagation(); handleRepublishListing(listing, e);}}
                                >
                                  Republish
                                </button>
                                <button 
                                  className="btn-outline px-3 py-2 text-sm font-medium" 
                                  onClick={e => {e.stopPropagation(); handleEditListing(listing);}}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  className="btn-outline px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:border-red-300" 
                                  onClick={e => {e.stopPropagation(); handleDeleteUnpublishedListing(listing, e);}}
                                  title="Delete listing"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />

      <OnboardingProvider>
        <HostTypeModal
          isOpen={showHostTypeModal}
          onClose={() => {
            setShowHostTypeModal(false);
            setForceHostTypeSelection(false);
          }}
          currentUser={user}
          forceHostTypeSelection={forceHostTypeSelection}
        />
      </OnboardingProvider>

      <AlertDialog open={unpublishModalOpen} onOpenChange={setUnpublishModalOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unpublish "{listingToUnpublish?.title}"? This will make it inactive and it won't be visible to guests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnpublishListing}>Unpublish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HostListings;

