import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Sparkles, Mail, Clock, CheckCircle, Circle, Search, Filter, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const Wishlists = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [wishes, setWishes] = useState([]);
  const [filteredWishes, setFilteredWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, read, addressed
  const [filterListing, setFilterListing] = useState('all');
  const [listings, setListings] = useState([]);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch all wishes from all listings
  useEffect(() => {
    const fetchWishes = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        // For now, we'll fetch from all listing IDs (1-6 as example)
        // In production, you'd fetch the host's actual listings first
        const allWishes = [];
        const listingIds = ['1', '2', '3', '4', '5', '6']; // Sample listing IDs
        
        for (const listingId of listingIds) {
          const wishesRef = collection(db, 'listings', listingId, 'wishes');
          const q = query(wishesRef, orderBy('createdAt', 'desc'));
          const querySnapshot = await getDocs(q);
          
          querySnapshot.forEach((doc) => {
            allWishes.push({
              id: doc.id,
              listingId,
              ...doc.data(),
            });
          });
        }

        setWishes(allWishes);
        setFilteredWishes(allWishes);

        // Extract unique listings
        const uniqueListings = [...new Set(allWishes.map(w => w.listingTitle))];
        setListings(uniqueListings);
      } catch (error) {
        console.error('Error fetching wishes:', error);
        toast.error('Failed to load wishes');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchWishes();
    }
  }, [currentUser]);

  // Filter wishes based on search and filters
  useEffect(() => {
    let filtered = wishes;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(w => w.status === filterStatus);
    }

    // Filter by listing
    if (filterListing !== 'all') {
      filtered = filtered.filter(w => w.listingTitle === filterListing);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(w =>
        w.wish.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.listingTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredWishes(filtered);
  }, [wishes, filterStatus, filterListing, searchTerm]);

  // Update wish status
  const updateWishStatus = async (listingId, wishId, newStatus) => {
    try {
      const wishRef = doc(db, 'listings', listingId, 'wishes', wishId);
      await updateDoc(wishRef, {
        status: newStatus,
      });

      // Update local state
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

  // Format date
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

  // Get status badge
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

  // Group wishes by listing
  const groupedWishes = filteredWishes.reduce((acc, wish) => {
    const title = wish.listingTitle || 'Unknown Listing';
    if (!acc[title]) {
      acc[title] = [];
    }
    acc[title].push(wish);
    return acc;
  }, {});

  // Navigate to listing
  const navigateToListing = (listingId, listingType) => {
    const routes = {
      accommodation: `/accommodations/${listingId}`,
      experience: `/experiences/${listingId}`,
      service: `/services/${listingId}`,
    };
    navigate(routes[listingType] || `/accommodations/${listingId}`);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to view wishlists.</p>
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
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-heading text-4xl font-bold text-foreground">
                  Guest Wishlists
                </h1>
                <p className="text-muted-foreground mt-1">
                  See what guests are wishing for in your listings
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
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
          </div>

          {/* Filters */}
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
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

              {/* Status Filter */}
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

              {/* Listing Filter */}
              <div>
                <select
                  value={filterListing}
                  onChange={(e) => setFilterListing(e.target.value)}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
                >
                  <option value="all">All Listings</option>
                  {listings.map((listing, index) => (
                    <option key={index} value={listing}>{listing}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Wishes List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground mt-4">Loading wishes...</p>
            </div>
          ) : filteredWishes.length === 0 ? (
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
                  {/* Listing Header */}
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

                  {/* Wishes */}
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

                        {/* Action Buttons */}
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
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Wishlists;

