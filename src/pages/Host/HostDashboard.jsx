import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { getUserDrafts, deleteDraft, getDraftSummary } from '@/pages/Host/services/draftService';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Home, Calendar, MessageSquare, DollarSign, Plus,
  TrendingUp, Eye, Star, Users, Clock, Settings, MapPin, Camera,
  Bed, Bath, Edit, Check, X
} from 'lucide-react';

const HostDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showDraftSuccess, setShowDraftSuccess] = useState(false);

  const listingData = location.state || {};
  const propertyType = listingData.propertyType || '';
  const title = listingData.title || '';
  const description = listingData.description || '';
  const locationData = listingData.locationData || {};
  const weekdayPrice = listingData.weekdayPrice || null;
  const weekendPrice = listingData.weekendPrice || null;
  const photos = listingData.photos || [];
  const amenities = listingData.selectedAmenities || [];
  const highlights = listingData.highlights || [];
  const guestCapacity = listingData.guestCapacity || null;
  const bedrooms = listingData.bedrooms || null;
  const bathrooms = listingData.bathrooms || null;

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

  useEffect(() => {
    if (location.state?.draftSaved) {
      setShowDraftSuccess(true);
      setTimeout(() => setShowDraftSuccess(false), 5000);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
      'property-details': '/pages/propertydetails',
      'property-structure': '/pages/propertystructure',
      'privacy-type': '/pages/privacytype',
      'location': '/pages/location',
      'location-confirmation': '/pages/locationconfirmation',
      'property-basics': '/pages/propertybasics',
      'make-it-stand-out': '/pages/makeitstandout',
      'amenities': '/pages/amenities',
      'photos': '/pages/photos',
      'photos-preview': '/pages/photospreview',
      'title-description': '/pages/titleDescription',
      'description': '/pages/description',
      'description-details': '/pages/descriptiondetails',
      'finish-setup': '/pages/finishsetup',
      'booking-settings': '/pages/bookingsettings',
      'guest-selection': '/pages/guestselection',
      'pricing': '/pages/pricing',
      'weekend-pricing': '/pages/weekendpricing',
      'discounts': '/pages/discounts',
      'safety-details': '/pages/safetydetails',
      'final-details': '/pages/finaldetails'
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

        {/* Draft Success Message */}
        {showDraftSuccess && (
          <div className="max-w-7xl mx-auto px-6 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-green-800">Draft saved successfully!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Saved Drafts Section */}
        {user && (
          <div className="max-w-7xl mx-auto px-6 mb-12">
            <div className="card-listing p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  {drafts.length > 0 ? 'Saved Drafts' : 'Your Listings'}
                </h2>
                <button
                  onClick={() => navigate('/pages/hosting-steps')}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Start New Listing
                </button>
              </div>
              {/* Drafts grid will be rendered here dynamically */}
            </div>
          </div>
        )}

        {/* Other sections kept as containers for dynamic content */}
      </div>

      <Footer />
    </div>
  );
};

export default HostDashboard;
