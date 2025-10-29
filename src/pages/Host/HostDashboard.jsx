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

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const userDrafts = await getUserDrafts();
      setDrafts(userDrafts);
    } catch (error) {
      console.error('Error loading drafts:', error);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueDraft = (draft) => {
    const stepRoutes = {
      'hosting-steps': '/pages/hosting-steps', 'hostingsteps': '/pages/hostingsteps',
      'property-details': '/pages/propertydetails', 'propertydetails': '/pages/propertydetails',
      'property-structure': '/pages/propertystructure', 'propertystructure': '/pages/propertystructure',
      'privacy-type': '/pages/privacytype', 'privacytype': '/pages/privacytype',
      'location': '/pages/location',
      'location-confirmation': '/pages/locationconfirmation', 'locationconfirmation': '/pages/locationconfirmation',
      'property-basics': '/pages/propertybasics', 'propertybasics': '/pages/propertybasics',
      'make-it-stand-out': '/pages/makeitstandout', 'makeitstandout': '/pages/makeitstandout',
      'amenities': '/pages/amenities',
      'photos': '/pages/photos',
      'photos-preview': '/pages/photospreview', 'photospreview': '/pages/photospreview',
      'title-description': '/pages/titleDescription', 'titledescription': '/pages/titleDescription',
      'description': '/pages/description',
      'description-details': '/pages/descriptiondetails', 'descriptiondetails': '/pages/descriptiondetails',
      'finish-setup': '/pages/finishsetup', 'finishsetup': '/pages/finishsetup',
      'booking-settings': '/pages/bookingsettings', 'bookingsettings': '/pages/bookingsettings',
      'guest-selection': '/pages/guestselection', 'guestselection': '/pages/guestselection',
      'pricing': '/pages/pricing',
      'weekend-pricing': '/pages/weekendpricing', 'weekendpricing': '/pages/weekendpricing',
      'discounts': '/pages/discounts',
      'safety-details': '/pages/safetydetails', 'safetydetails': '/pages/safetydetails',
      'final-details': '/pages/finaldetails', 'finaldetails': '/pages/finaldetails'
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
                        <div key={draft.id || idx} className="card-listing cursor-pointer hover-lift" onClick={() => handleContinueDraft(draft)}>
                          <div className="relative w-full overflow-hidden rounded-lg aspect-[4/3] bg-gray-100 flex items-center justify-center">
                            {/* Placeholder image or icon */}
                            <Camera className="w-12 h-12 text-gray-400" />
                          </div>
                          <div className="p-6">
                            <h3 className="font-heading text-xl font-semibold text-foreground">{draft.title || 'Untitled Draft'}</h3>
                            <p className="font-body text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-4 h-4" /> {draft.location || 'No location'}
                            </p>
                            <div className="flex justify-between mt-2">
                              <span className="font-heading text-base font-bold text-foreground">{draft.category}</span>
                              <span className="text-xs text-muted-foreground">Last saved {draft.lastModified?.toDate?.().toLocaleString?.() || ''}</span>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <button className="btn-primary px-3 py-1 text-sm" onClick={e => {e.stopPropagation(); handleContinueDraft(draft);}}>Continue</button>
                              <button className="btn-outline px-3 py-1 text-sm" onClick={e => {e.stopPropagation(); handleDeleteDraft(draft.id);}}>Delete</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(draftTab === 'all' ? drafts : drafts.filter(d => d.category === draftTab)).map((draft, idx) => (
                        <div key={draft.id || idx} className="card-listing hover-lift cursor-pointer flex items-start gap-4 p-4" onClick={() => handleContinueDraft(draft)}>
                          <div className="relative flex-shrink-0 w-36 h-36 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                            <Camera className="w-12 h-12 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-heading text-lg font-semibold text-foreground">{draft.title || 'Untitled Draft'}</h3>
                            <p className="font-body text-muted-foreground">{draft.location || 'No location'}</p>
                            <span className="text-sm text-muted-foreground">{draft.category}</span>
                            <div className="flex gap-2 mt-2">
                              <button className="btn-primary px-3 py-1 text-sm" onClick={e => {e.stopPropagation(); handleContinueDraft(draft);}}>Continue</button>
                              <button className="btn-outline px-3 py-1 text-sm" onClick={e => {e.stopPropagation(); handleDeleteDraft(draft.id);}}>Delete</button>
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
