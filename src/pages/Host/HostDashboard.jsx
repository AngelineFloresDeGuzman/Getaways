import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { toast } from '@/components/ui/sonner';
import { getUserDrafts, deleteDraft, getDraftSummary } from '@/pages/Host/services/draftService';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Home, Calendar, MessageSquare, DollarSign, Plus,
  TrendingUp, Eye, Star, Users, Clock, Settings, MapPin, Camera,
  Bed, Bath, Edit, Check, X
} from 'lucide-react';

import { Home as HomeIcon, Grid, List } from 'lucide-react';
import HostTypeModal from '@/components/HostTypeModal';
import { OnboardingProvider } from '@/pages/Host/contexts/OnboardingContext';

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
  const [listings, setListings] = useState([]); // TODO: fetch listings
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [draftTab, setDraftTab] = useState('all');
  const [listingTab, setListingTab] = useState('all');
  const [draftView, setDraftView] = useState('grid');
  const [listingView, setListingView] = useState('grid');
  const [showHostTypeModal, setShowHostTypeModal] = useState(false);
  const [forceHostTypeSelection, setForceHostTypeSelection] = useState(false);

  // ...existing code...
  const stats = [
    { icon: Home, label: "Active Listings", value: "", change: "" },
    { icon: Calendar, label: "Bookings", value: "", change: "" },
    { icon: DollarSign, label: "Potential Earnings", value: "", change: "" },
    { icon: Star, label: "Rating", value: "", change: "" }
  ];

  const recentBookings = [];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        loadDrafts();
      } else {
        setDrafts([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
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
      'pricing', 'weekendpricing', 'discounts', 'safetydetails', 'finaldetails'
    ];

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex === -1) return 0;
    return Math.round(((currentIndex + 1) / stepOrder.length) * 100);
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
      setDrafts(transformedDrafts);
    } catch (error) {
      console.error('❌ Error loading drafts:', error);
      setDrafts([]);
    } finally {
      setLoading(false);
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
      'finaldetails': '/pages/finaldetails'
    };
    const route = stepRoutes[draft.currentStep] || '/pages/propertydetails';
    navigate(route, { state: { draftId: draft.id } });
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
            <div>
              <h1 className="font-heading text-4xl font-bold text-foreground mb-4">
                Welcome to your dashboard
              </h1>
              <p className="font-body text-xl text-muted-foreground">
                Manage your listings, bookings, and account settings here.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="btn-outline flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button className="btn-primary flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview Listings
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
                className="card-listing p-6 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-foreground">{stat.value}</h3>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
                <p className="text-xs text-muted-foreground mt-2">{stat.change}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Draft Success Message replaced by toast */}

        {/* Saved Drafts Container with Tabs */}
        {user && (
          <div className="max-w-7xl mx-auto px-6 mb-12">
            <div className="mb-2">
              <h2 className="text-xl font-bold text-foreground mb-2">Saved Drafts</h2>
            </div>
            <div className="bg-white rounded-xl shadow p-8 mb-8">
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
                  <button
                    onClick={() => {
                      setForceHostTypeSelection(true);
                      setShowHostTypeModal(true);
                    }}
                    className="btn-primary flex items-center gap-2 ml-4"
                  >
                    <Plus className="w-4 h-4" />
                    Start New Listing
                  </button>
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
                          {/* Thumbnail Image */}
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
                          </div>
                          
                          <div className="p-5">
                            {/* Listing Title */}
                            <h3 className="font-heading text-lg font-semibold text-foreground mb-2 line-clamp-2">
                              {draft.title || 'Untitled Draft'}
                            </h3>
                            
                            {/* Location (City, Area) */}
                            <p className="font-body text-sm text-muted-foreground flex items-center gap-1 mb-3">
                              <MapPin className="w-4 h-4 flex-shrink-0" /> 
                              <span className="truncate">
                                {draft.locationCity && draft.locationArea 
                                  ? `${draft.locationCity}, ${draft.locationArea}`
                                  : draft.location || 'No location'}
                              </span>
                            </p>
                            
                            {/* Listing Type / Category (optional) */}
                            {(draft.privacyType || draft.propertyStructure) && (
                              <div className="mb-3">
                                <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">
                                  {draft.privacyType && draft.propertyStructure
                                    ? `${draft.privacyType} in ${draft.propertyStructure}`
                                    : draft.privacyType || draft.propertyStructure}
                                </span>
                              </div>
                            )}
                            
                            {/* Progress Status / Completion Bar */}
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
                            
                            {/* Last Edited Date */}
                            <div className="flex items-center gap-1 mb-4 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>Last edited {draft.lastModifiedFormatted || 'Unknown'}</span>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                              <button 
                                className="btn-primary flex-1 px-3 py-2 text-sm font-medium" 
                                onClick={e => {e.stopPropagation(); handleContinueDraft(draft);}}
                              >
                                Continue
                              </button>
                              <button 
                                className="btn-outline px-3 py-2 text-sm font-medium" 
                                onClick={e => {e.stopPropagation(); handleDeleteDraft(draft.id);}}
                              >
                                Delete
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
                          {/* Thumbnail Image */}
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
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Listing Title */}
                            <h3 className="font-heading text-lg font-semibold text-foreground mb-1 line-clamp-1">
                              {draft.title || 'Untitled Draft'}
                            </h3>
                            
                            {/* Location (City, Area) */}
                            <p className="font-body text-sm text-muted-foreground flex items-center gap-1 mb-2">
                              <MapPin className="w-4 h-4 flex-shrink-0" /> 
                              <span className="truncate">
                                {draft.locationCity && draft.locationArea 
                                  ? `${draft.locationCity}, ${draft.locationArea}`
                                  : draft.location || 'No location'}
                              </span>
                            </p>
                            
                            {/* Listing Type / Category */}
                            {(draft.privacyType || draft.propertyStructure) && (
                              <div className="mb-2">
                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                                  {draft.privacyType && draft.propertyStructure
                                    ? `${draft.privacyType} in ${draft.propertyStructure}`
                                    : draft.privacyType || draft.propertyStructure}
                                </span>
                              </div>
                            )}
                            
                            {/* Progress Status / Completion Bar */}
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
                            
                            {/* Last Edited Date */}
                            <div className="flex items-center gap-1 mb-3 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>Last edited {draft.lastModifiedFormatted || 'Unknown'}</span>
                          </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                              <button 
                                className="btn-primary px-3 py-1.5 text-sm font-medium" 
                                onClick={e => {e.stopPropagation(); handleContinueDraft(draft);}}
                              >
                                Continue
                              </button>
                              <button 
                                className="btn-outline px-3 py-1.5 text-sm font-medium" 
                                onClick={e => {e.stopPropagation(); handleDeleteDraft(draft.id);}}
                              >
                                Delete
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

            {/* Listings Container with Tabs */}
            <div className="mb-2">
              <h2 className="text-xl font-bold text-foreground mb-2">Listings</h2>
            </div>
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
                        <div key={listing.id || idx} className="card-listing cursor-pointer hover-lift">
                          <div className="relative w-full overflow-hidden rounded-lg aspect-[4/3] bg-gray-100 flex items-center justify-center">
                            {/* Placeholder image or icon */}
                            <Camera className="w-12 h-12 text-gray-400" />
                          </div>
                          <div className="p-6">
                            <h3 className="font-heading text-xl font-semibold text-foreground">{listing.title || 'Untitled Listing'}</h3>
                            <p className="font-body text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-4 h-4" /> {listing.location || 'No location'}
                            </p>
                            <div className="flex justify-between mt-2">
                              <span className="font-heading text-base font-bold text-foreground">{listing.category}</span>
                              <span className="text-xs text-muted-foreground">Published {listing.publishedAt?.toLocaleString?.() || ''}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(listingTab === 'all' ? listings : listings.filter(l => l.category === listingTab)).map((listing, idx) => (
                        <div key={listing.id || idx} className="card-listing hover-lift cursor-pointer flex items-start gap-4 p-4">
                          <div className="relative flex-shrink-0 w-36 h-36 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                            <Camera className="w-12 h-12 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-heading text-lg font-semibold text-foreground">{listing.title || 'Untitled Listing'}</h3>
                            <p className="font-body text-muted-foreground">{listing.location || 'No location'}</p>
                            <span className="text-sm text-muted-foreground">{listing.category}</span>
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

      <Footer />
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
