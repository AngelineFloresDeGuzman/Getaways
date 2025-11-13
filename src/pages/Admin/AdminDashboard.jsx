import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Users, Home, Calendar, DollarSign, TrendingUp,
  Star, FileText, Shield, Settings, BarChart3,
  Eye, Download, Filter, Search, CheckCircle, XCircle,
  AlertCircle, CreditCard, Receipt, BookOpen, FileCheck,
  TrendingDown, Award, AlertTriangle, Send, Clock, RefreshCw, Edit3, X
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  autoCompleteBookings, 
  releaseHostEarnings, 
  getPendingEarnings, 
  getReleasedEarningsSummary,
  getEarningsReleaseHistory
} from './services/earningsService';
import {
  getPendingRefunds,
  processRefund
} from './services/refundService';
import {
  getPlatformSettings,
  updateAdminPayPalEmail,
  getAdminPayPalEmail
} from './services/platformSettingsService';
import PolicyManagement from './components/PolicyManagement';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeListings: 0,
    totalBookings: 0,
    totalRevenue: 0,
    serviceFees: 0,
    pendingPayments: 0
  });
  
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [payments, setPayments] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [bestReviews, setBestReviews] = useState([]);
  const [lowestReviews, setLowestReviews] = useState([]);
  const [pendingEarnings, setPendingEarnings] = useState([]);
  const [releasedEarnings, setReleasedEarnings] = useState({ totalReleased: 0, totalServiceFees: 0, byHost: [] });
  const [releasingEarnings, setReleasingEarnings] = useState(new Set());
  const [earningsHistory, setEarningsHistory] = useState([]);
  const [showEarningsHistoryModal, setShowEarningsHistoryModal] = useState(false);
  const [isLoadingEarningsHistory, setIsLoadingEarningsHistory] = useState(false);
  
  // Refund states
  const [pendingRefunds, setPendingRefunds] = useState([]);
  const [processingRefunds, setProcessingRefunds] = useState(new Set());
  
  // Platform settings state
  const [platformSettings, setPlatformSettings] = useState({
    adminPayPalEmail: '',
    adminPayPalAccountName: ''
  });
  const [isEditingPayPal, setIsEditingPayPal] = useState(false);
  const [payPalEmailInput, setPayPalEmailInput] = useState('');
  const [payPalAccountNameInput, setPayPalAccountNameInput] = useState('');
  const [isSavingPayPal, setIsSavingPayPal] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check if user is admin
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest'];
          if (!roles.includes('admin')) {
            toast.error('Access denied. Admin privileges required.');
            navigate('/');
            return;
          }
          setUser(currentUser);
          await loadDashboardData();
        } else {
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // First, auto-complete bookings that are past checkout + 1 day
      await autoCompleteBookings();
      
      // Load all data in parallel
      await Promise.all([
        loadStats(),
        loadBookings(),
        loadReviews(),
        loadPayments(),
        loadHosts(),
        loadPendingEarnings(),
        loadReleasedEarnings(),
        loadPlatformSettings(),
        loadEarningsHistory(),
        loadPendingRefunds()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingEarnings = async () => {
    try {
      const pending = await getPendingEarnings();
      setPendingEarnings(pending);
    } catch (error) {
      console.error('Error loading pending earnings:', error);
    }
  };

  const loadReleasedEarnings = async () => {
    try {
      const released = await getReleasedEarningsSummary();
      setReleasedEarnings(released);
    } catch (error) {
      console.error('Error loading released earnings:', error);
    }
  };

  const loadEarningsHistory = async () => {
    try {
      const { getAdminUserId } = await import('@/pages/Common/services/getpayService');
      const adminUserId = await getAdminUserId();
      if (adminUserId) {
        console.log('🔍 Loading earnings history for admin:', adminUserId);
        const history = await getEarningsReleaseHistory(adminUserId);
        console.log('📈 Earnings history loaded:', history.length, 'transactions');
        setEarningsHistory(history);
      } else {
        console.warn('⚠️ Admin user ID not found');
        setEarningsHistory([]);
      }
    } catch (error) {
      console.error('❌ Error loading earnings history:', error);
      setEarningsHistory([]);
    }
  };

  const handleReleaseEarnings = async (bookingId) => {
    if (releasingEarnings.has(bookingId)) return;
    
    setReleasingEarnings(prev => new Set(prev).add(bookingId));
    
    try {
      const result = await releaseHostEarnings(bookingId);
      
      if (result.success) {
        toast.success(result.message);
        // Reload pending and released earnings, and earnings history
        await Promise.all([loadPendingEarnings(), loadReleasedEarnings(), loadStats(), loadEarningsHistory()]);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to release earnings: ' + error.message);
    } finally {
      setReleasingEarnings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const loadPendingRefunds = async () => {
    try {
      const refunds = await getPendingRefunds();
      setPendingRefunds(refunds);
    } catch (error) {
      console.error('Error loading pending refunds:', error);
    }
  };

  const handleProcessRefund = async (bookingId) => {
    if (processingRefunds.has(bookingId)) return;
    
    // Confirm refund processing
    const refund = pendingRefunds.find(r => r.bookingId === bookingId);
    if (!refund) {
      toast.error('Refund not found');
      return;
    }
    
    const refundAmount = refund.refundAmount || 0;
    const refundType = refund.refundType || 'full_refund';
    const confirmMessage = `Process refund of ₱${refundAmount.toLocaleString()} (${refundType === 'full_refund' ? 'Full' : 'Half'}) for ${refund.guestName}?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setProcessingRefunds(prev => new Set(prev).add(bookingId));
    
    try {
      const result = await processRefund(bookingId);
      
      if (result.success) {
        toast.success(result.message);
        // Reload pending refunds and stats
        await Promise.all([loadPendingRefunds(), loadStats()]);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to process refund: ' + error.message);
    } finally {
      setProcessingRefunds(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const loadStats = async () => {
    try {
      // Total users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;
      
      // Active listings
      const listingsSnapshot = await getDocs(
        query(collection(db, 'listings'), where('status', '==', 'active'))
      );
      const activeListings = listingsSnapshot.size;
      
      // Total bookings
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const totalBookings = bookingsSnapshot.size;
      
      // Calculate revenue and service fees from actual bookings
      let totalRevenue = 0;
      let serviceFees = 0;
      let pendingPayments = 0;
      let pendingEarningsAmount = 0;
      
      bookingsSnapshot.forEach(doc => {
        const booking = doc.data();
        if (booking.status === 'confirmed' || booking.status === 'completed') {
          const bookingAmount = booking.totalPrice || 0;
          totalRevenue += bookingAmount;
          // Service fee is typically 3.3% of booking amount
          serviceFees += Math.round(bookingAmount * 0.033);
          
          // Count pending earnings (completed but not released)
          if (booking.status === 'completed' && !booking.earningsReleased) {
            pendingEarningsAmount += bookingAmount - Math.round(bookingAmount * 0.033);
          }
        } else if (booking.status === 'pending') {
          pendingPayments++;
        }
      });
      
      setStats({
        totalUsers,
        activeListings,
        totalBookings,
        totalRevenue,
        serviceFees,
        pendingPayments,
        pendingEarningsAmount
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadBookings = async () => {
    try {
      const bookingsSnapshot = await getDocs(
        query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))
      );
      
      const bookingsList = [];
      for (const docSnap of bookingsSnapshot.docs) {
        const booking = docSnap.data();
        
        // Get guest and host info
        const [guestDoc, hostDoc, listingDoc] = await Promise.all([
          getDoc(doc(db, 'users', booking.guestId)),
          getDoc(doc(db, 'users', booking.ownerId)),
          getDoc(doc(db, 'listings', booking.listingId))
        ]);
        
        const guestData = guestDoc.exists() ? guestDoc.data() : {};
        const hostData = hostDoc.exists() ? hostDoc.data() : {};
        const listingData = listingDoc.exists() ? listingDoc.data() : {};
        
        bookingsList.push({
          id: docSnap.id,
          ...booking,
          guestName: `${guestData.firstName || ''} ${guestData.lastName || ''}`.trim() || guestData.email || 'Unknown',
          hostName: `${hostData.firstName || ''} ${hostData.lastName || ''}`.trim() || hostData.email || 'Unknown',
          listingTitle: listingData.title || 'Unknown Listing',
          createdAt: booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt)
        });
      }
      
      setBookings(bookingsList.slice(0, 50)); // Limit to 50 most recent
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadReviews = async () => {
    try {
      const reviewsSnapshot = await getDocs(
        query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))
      );
      
      const reviewsList = [];
      reviewsSnapshot.forEach(docSnap => {
        const review = docSnap.data();
        reviewsList.push({
          id: docSnap.id,
          ...review,
          createdAt: review.createdAt?.toDate ? review.createdAt.toDate() : new Date(review.createdAt)
        });
      });
      
      setReviews(reviewsList);
      
      // Separate best and lowest reviews
      const sortedByRating = [...reviewsList].sort((a, b) => b.rating - a.rating);
      setBestReviews(sortedByRating.slice(0, 10));
      setLowestReviews(sortedByRating.slice(-10).reverse());
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadPayments = async () => {
    try {
      // Get all users with payment info
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const paymentsList = [];
      
      usersSnapshot.forEach(userDoc => {
        const userData = userDoc.data();
        const paymentData = userData.payment || {};
        
        if (paymentData.status === 'active' || paymentData.lastPayPalTransactionId) {
          paymentsList.push({
            userId: userDoc.id,
            userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Unknown',
            email: userData.email,
            paymentType: paymentData.type || 'N/A',
            paymentStatus: paymentData.status || 'N/A',
            transactionId: paymentData.lastPayPalTransactionId || 'N/A',
            lastPaymentDate: paymentData.lastPaymentDate?.toDate ? paymentData.lastPaymentDate.toDate() : null,
            paypalEmail: paymentData.paypalEmail || paymentData.lastPayPalPayerEmail || 'N/A'
          });
        }
      });
      
      setPayments(paymentsList);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const loadHosts = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const hostsList = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest'];
        
        if (roles.includes('host')) {
          // Get host's listings and bookings
          const listingsSnapshot = await getDocs(
            query(collection(db, 'listings'), where('ownerId', '==', userDoc.id))
          );
          
          const bookingsSnapshot = await getDocs(
            query(collection(db, 'bookings'), where('ownerId', '==', userDoc.id))
          );
          
          let earnings = 0;
          bookingsSnapshot.forEach(bookingDoc => {
            const booking = bookingDoc.data();
            if (booking.status === 'confirmed' || booking.status === 'completed') {
              earnings += booking.totalPrice || 0;
            }
          });
          
          // Get average rating from reviews
          let totalRating = 0;
          let reviewCount = 0;
          
          if (listingsSnapshot.docs.length > 0) {
            const listingIds = listingsSnapshot.docs.map(d => d.id);
            // Firestore 'in' queries are limited to 10 items, so we need to batch
            for (let i = 0; i < listingIds.length; i += 10) {
              const batch = listingIds.slice(i, i + 10);
              try {
                const reviewsSnapshot = await getDocs(
                  query(collection(db, 'reviews'), where('listingId', 'in', batch))
                );
                reviewsSnapshot.forEach(reviewDoc => {
                  const review = reviewDoc.data();
                  totalRating += review.rating || 0;
                  reviewCount++;
                });
              } catch (error) {
                console.error('Error loading reviews for host:', error);
              }
            }
          }
          
          const avgRating = reviewCount > 0 ? totalRating / reviewCount : 0;
          
          hostsList.push({
            userId: userDoc.id,
            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Unknown',
            email: userData.email,
            listings: listingsSnapshot.size,
            bookings: bookingsSnapshot.size,
            earnings,
            rating: avgRating,
            reviewCount
          });
        }
      }
      
      // Sort by earnings
      hostsList.sort((a, b) => b.earnings - a.earnings);
      setHosts(hostsList);
    } catch (error) {
      console.error('Error loading hosts:', error);
    }
  };

  const handlePaymentAction = async (paymentId, action) => {
    try {
      // In a real implementation, this would update payment status
      toast.success(`Payment ${action} successful`);
      await loadPayments();
    } catch (error) {
      toast.error(`Failed to ${action} payment`);
    }
  };

  const loadPlatformSettings = async () => {
    try {
      const settings = await getPlatformSettings();
      setPlatformSettings(settings);
      setPayPalEmailInput(settings.adminPayPalEmail || '');
      setPayPalAccountNameInput(settings.adminPayPalAccountName || '');
    } catch (error) {
      console.error('Error loading platform settings:', error);
    }
  };

  const handleSavePayPalSettings = async () => {
    if (!payPalEmailInput || !payPalEmailInput.includes('@')) {
      toast.error('Please enter a valid PayPal email address');
      return;
    }

    setIsSavingPayPal(true);
    try {
      await updateAdminPayPalEmail(payPalEmailInput, payPalAccountNameInput);
      await loadPlatformSettings();
      setIsEditingPayPal(false);
      toast.success('Admin PayPal account updated successfully!');
    } catch (error) {
      console.error('Error saving PayPal settings:', error);
      toast.error(error.message || 'Failed to save PayPal settings');
    } finally {
      setIsSavingPayPal(false);
    }
  };

  const generateReport = async (type) => {
    if (generatingReport) return; // Prevent multiple simultaneous reports
    
    try {
      setGeneratingReport(true);
      toast.info(`Generating ${type} report... This may take a moment.`);
      const { generateReport: generateReportService } = await import('./services/reportService');
      await generateReportService(type);
      toast.success(`${type} report generated and downloaded successfully!`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(`Failed to generate ${type} report: ${error.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-36">
          <Loading message="Loading admin dashboard..." />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-heading text-4xl font-bold text-foreground mb-4">
                  Admin Dashboard
                </h1>
                <p className="font-body text-xl text-muted-foreground">
                  Manage your Getaways platform with comprehensive insights and controls
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => generateReport('comprehensive')}
                  className="btn-outline flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="btn-primary flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="max-w-7xl mx-auto px-6 -mt-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card-listing p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground mb-1">
                {stats.totalUsers.toLocaleString()}
              </h3>
              <p className="text-muted-foreground text-sm">Total Users</p>
            </div>

            <div className="card-listing p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center">
                  <Home className="w-6 h-6 text-accent" />
                </div>
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground mb-1">
                {stats.activeListings.toLocaleString()}
              </h3>
              <p className="text-muted-foreground text-sm">Active Listings</p>
            </div>

            <div className="card-listing p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-secondary" />
                </div>
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground mb-1">
                {stats.totalBookings.toLocaleString()}
              </h3>
              <p className="text-muted-foreground text-sm">Total Bookings</p>
            </div>

            <div className="card-listing p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground mb-1">
                {formatCurrency(stats.serviceFees)}
              </h3>
              <p className="text-muted-foreground text-sm">Service Fees Collected</p>
            </div>
          </div>
          
          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="card-listing p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground mb-1">
                {formatCurrency(stats.pendingEarningsAmount || 0)}
              </h3>
              <p className="text-muted-foreground text-sm">Pending Earnings ({pendingEarnings.length} bookings)</p>
            </div>

            <div 
              className="card-listing p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={async () => {
                setShowEarningsHistoryModal(true);
                // Reload earnings history when modal opens to ensure fresh data
                setIsLoadingEarningsHistory(true);
                await loadEarningsHistory();
                setIsLoadingEarningsHistory(false);
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                  <Send className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground mb-1">
                {formatCurrency(releasedEarnings.totalReleased || 0)}
              </h3>
              <p className="text-muted-foreground text-sm">Total Earnings Released</p>
              <p className="text-xs text-blue-600 mt-2 font-medium">Click to view history</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <div className="flex gap-2 border-b border-border">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'earnings', label: 'Earnings Release', icon: Send, badge: pendingEarnings.length },
              { id: 'refunds', label: 'Refunds', icon: RefreshCw, badge: pendingRefunds.length },
              { id: 'service-fees', label: 'Service Fees', icon: DollarSign },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'bookings', label: 'Bookings', icon: Calendar },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'settings', label: 'Settings', icon: Settings },
              { id: 'compliance', label: 'Policy & Compliance', icon: Shield },
              { id: 'reports', label: 'Reports', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors relative ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-6 mb-12">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-listing p-6">
                  <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Recent Bookings</h2>
                  <div className="space-y-3">
                    {bookings.slice(0, 5).map(booking => (
                      <div key={booking.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div>
                          <p className="font-medium">{booking.guestName}</p>
                          <p className="text-sm text-muted-foreground">{booking.listingTitle}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(booking.totalPrice || 0)}</p>
                          <span className={`text-xs px-2 py-1 rounded ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-listing p-6">
                  <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Top Hosts</h2>
                  <div className="space-y-3">
                    {hosts.slice(0, 5).map((host, index) => (
                      <div key={host.userId} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{host.name}</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span>{host.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(host.earnings)}</p>
                          <p className="text-xs text-muted-foreground">{host.listings} listings</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Earnings Release Tab */}
          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <div className="card-listing p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Pending Earnings Release</h2>
                    <p className="text-muted-foreground">
                      Review and release host earnings for completed bookings. Earnings are automatically available after guest marks booking as completed or 1 day after checkout.
                    </p>
                  </div>
                  <button 
                    onClick={loadDashboardData}
                    className="btn-outline flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                {pendingEarnings.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground mb-2">No Pending Earnings</p>
                    <p className="text-muted-foreground">All completed bookings have been processed.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingEarnings.map(earning => (
                      <div key={earning.bookingId} className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-foreground">{earning.listingTitle}</h3>
                              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                                Completed
                              </span>
                              {earning.autoCompleted && (
                                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                                  Auto-completed
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                              <div>
                                <p className="text-muted-foreground">Host</p>
                                <p className="font-medium">{earning.hostName}</p>
                                <p className="text-xs text-muted-foreground">{earning.hostEmail}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Guest</p>
                                <p className="font-medium">{earning.guestName}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total Paid by Guest</p>
                                <p className="font-semibold">{formatCurrency(earning.totalPrice)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Completed Date</p>
                                <p className="font-medium">{formatDate(earning.completedAt)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 pt-3 border-t border-border">
                              <div>
                                <p className="text-xs text-muted-foreground">Guest Fee (Admin)</p>
                                <p className="text-sm font-semibold text-blue-600">+{formatCurrency(earning.guestFee || earning.serviceFee || 0)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Host Earnings (to release)</p>
                                <p className="text-lg font-bold text-green-600">{formatCurrency(earning.hostEarnings || earning.bookingAmount || 0)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4">
                            <button
                              onClick={() => handleReleaseEarnings(earning.bookingId)}
                              disabled={releasingEarnings.has(earning.bookingId)}
                              className="btn-primary flex items-center gap-2 whitespace-nowrap"
                            >
                              {releasingEarnings.has(earning.bookingId) ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Releasing...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4" />
                                  Release Earnings
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Released Earnings Summary */}
              <div className="card-listing p-6">
                <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Released Earnings Summary</h2>
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-green-700 mb-1">Total Earnings Released</p>
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(releasedEarnings.totalReleased)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700 mb-1">Total Service Fees</p>
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(releasedEarnings.totalServiceFees)}</p>
                    </div>
                  </div>
                </div>

                {releasedEarnings.byHost && releasedEarnings.byHost.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">By Host</h3>
                    <div className="space-y-2">
                      {releasedEarnings.byHost.map(host => (
                        <div key={host.hostId} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div>
                            <p className="font-medium">{host.hostName || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{host.bookingCount} bookings</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">{formatCurrency(host.totalEarnings)}</p>
                            <p className="text-xs text-muted-foreground">Service fees: {formatCurrency(host.totalServiceFees)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Refunds Tab */}
          {activeTab === 'refunds' && (
            <div className="space-y-6">
              <div className="card-listing p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Pending Refunds</h2>
                    <p className="text-muted-foreground">
                      Process refunds for cancelled bookings. Full refunds for pending bookings, half refunds for confirmed bookings.
                    </p>
                  </div>
                  <button 
                    onClick={loadPendingRefunds}
                    className="btn-outline flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                {pendingRefunds.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground mb-2">No Pending Refunds</p>
                    <p className="text-muted-foreground">All refunds have been processed.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRefunds.map(refund => (
                      <div key={refund.bookingId} className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-foreground">{refund.listingTitle}</h3>
                              <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                                Cancelled
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                refund.refundType === 'full_refund' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {refund.refundType === 'full_refund' ? 'Full Refund' : 'Half Refund'}
                              </span>
                              {refund.earningsReleased && (
                                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                                  Earnings Released
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                              <div>
                                <p className="text-muted-foreground">Guest</p>
                                <p className="font-medium">{refund.guestName}</p>
                                <p className="text-xs text-muted-foreground">{refund.guestEmail}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Host</p>
                                <p className="font-medium">{refund.hostName}</p>
                                <p className="text-xs text-muted-foreground">{refund.hostEmail}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Original Booking Amount</p>
                                <p className="font-semibold">{formatCurrency(refund.totalPrice || 0)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Cancelled Date</p>
                                <p className="font-medium">{formatDate(refund.cancelledAt || refund.refundRequestedAt)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 pt-3 border-t border-border">
                              <div>
                                <p className="text-xs text-muted-foreground">Refund Amount (to Guest)</p>
                                <p className="text-lg font-bold text-green-600">{formatCurrency(refund.refundAmount || 0)}</p>
                              </div>
                              {refund.refundType === 'half_refund' && refund.earningsReleased && refund.hostRefundAmount && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Host Refund Amount</p>
                                  <p className="text-sm font-semibold text-blue-600">{formatCurrency(refund.hostRefundAmount)}</p>
                                  <p className="text-xs text-muted-foreground">(to be deducted from host)</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-muted-foreground">Original Status</p>
                                <p className="text-sm font-medium">
                                  {refund.originalStatus === 'pending' ? 'Pending' : refund.originalStatus === 'confirmed' ? 'Confirmed' : refund.originalStatus || 'Unknown'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4">
                            <button
                              onClick={() => handleProcessRefund(refund.bookingId)}
                              disabled={processingRefunds.has(refund.bookingId)}
                              className="btn-primary flex items-center gap-2 whitespace-nowrap"
                            >
                              {processingRefunds.has(refund.bookingId) ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4" />
                                  Process Refund
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Service Fees Tab */}
          {activeTab === 'service-fees' && (
            <div className="card-listing p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-2xl font-bold text-foreground">Service Fees from Hosts</h2>
                <button onClick={() => generateReport('service-fees')} className="btn-outline flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">Total Service Fees Collected</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(stats.serviceFees)}</p>
                  </div>
                  <DollarSign className="w-12 h-12 text-blue-600" />
                </div>
              </div>

              <div className="space-y-4">
                {hosts.map(host => {
                  const hostServiceFees = Math.round(host.earnings * 0.033);
                  return (
                    <div key={host.userId} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <p className="font-medium">{host.name}</p>
                        <p className="text-sm text-muted-foreground">{host.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {host.bookings} bookings • {formatCurrency(host.earnings)} total earnings
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatCurrency(hostServiceFees)}</p>
                        <p className="text-xs text-muted-foreground">Service fees</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-listing p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5 text-green-600" />
                    <h2 className="font-heading text-2xl font-bold text-foreground">Best Reviews</h2>
                  </div>
                  <div className="space-y-3">
                    {bestReviews.map(review => (
                      <div key={review.id} className="p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{review.reviewerName}</p>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{review.listingTitle}</p>
                        <p className="text-sm">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-listing p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h2 className="font-heading text-2xl font-bold text-foreground">Lowest Reviews</h2>
                  </div>
                  <div className="space-y-3">
                    {lowestReviews.map(review => (
                      <div key={review.id} className="p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{review.reviewerName}</p>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{review.listingTitle}</p>
                        <p className="text-sm">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card-listing p-6">
                <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Booking Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 mb-1">Confirmed</p>
                    <p className="text-2xl font-bold text-green-900">
                      {bookings.filter(b => b.status === 'confirmed').length}
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700 mb-1">Pending</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {bookings.filter(b => b.status === 'pending').length}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 mb-1">Cancelled</p>
                    <p className="text-2xl font-bold text-red-900">
                      {bookings.filter(b => b.status === 'cancelled').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="card-listing p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-2xl font-bold text-foreground">List of Bookings</h2>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-muted rounded-lg">
                    <Filter className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-muted rounded-lg">
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-sm font-semibold">Booking ID</th>
                      <th className="text-left p-3 text-sm font-semibold">Guest</th>
                      <th className="text-left p-3 text-sm font-semibold">Host</th>
                      <th className="text-left p-3 text-sm font-semibold">Listing</th>
                      <th className="text-left p-3 text-sm font-semibold">Amount</th>
                      <th className="text-left p-3 text-sm font-semibold">Status</th>
                      <th className="text-left p-3 text-sm font-semibold">Date</th>
                      <th className="text-left p-3 text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(booking => (
                      <tr key={booking.id} className="border-b border-border hover:bg-muted/30">
                        <td className="p-3 text-sm font-mono">{booking.id.substring(0, 8)}...</td>
                        <td className="p-3 text-sm">{booking.guestName}</td>
                        <td className="p-3 text-sm">{booking.hostName}</td>
                        <td className="p-3 text-sm">{booking.listingTitle}</td>
                        <td className="p-3 text-sm font-semibold">{formatCurrency(booking.totalPrice || 0)}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{formatDate(booking.createdAt)}</td>
                        <td className="p-3">
                          <button className="p-1 hover:bg-muted rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="card-listing p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-2xl font-bold text-foreground">Payment Methods</h2>
                <button onClick={() => generateReport('payments')} className="btn-outline flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>

              <div className="space-y-4">
                {payments.map(payment => (
                  <div key={payment.userId} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{payment.userName}</p>
                        <p className="text-sm text-muted-foreground">{payment.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PayPal: {payment.paypalEmail}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          payment.paymentStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {payment.paymentStatus}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="text-sm text-muted-foreground">
                        <p>Type: {payment.paymentType}</p>
                        <p>Transaction ID: {payment.transactionId}</p>
                        {payment.lastPaymentDate && (
                          <p>Last Payment: {formatDate(payment.lastPaymentDate)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePaymentAction(payment.userId, 'confirm')}
                          className="btn-outline flex items-center gap-2 text-sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirm
                        </button>
                        <button
                          onClick={() => handlePaymentAction(payment.userId, 'review')}
                          className="btn-outline flex items-center gap-2 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Review
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policy & Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="max-w-7xl mx-auto px-6">
              <PolicyManagement />
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="card-listing p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Settings className="w-5 h-5 text-primary" />
                  <h2 className="font-heading text-2xl font-bold text-foreground">Platform Settings</h2>
                </div>

                {/* Admin PayPal Account Settings */}
                <div className="border border-border rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground mb-2">Official PayPal Account</h3>
                      <p className="text-sm text-muted-foreground">
                        This is the official PayPal account that will receive all transaction money from hosts and guests.
                        Users will cash in to this account, and you will process cash-outs from this account.
                      </p>
                    </div>
                  </div>

                  {!isEditingPayPal ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-muted-foreground">PayPal Email</label>
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                          {platformSettings.adminPayPalEmail || (
                            <span className="text-muted-foreground italic">Not configured</span>
                          )}
                        </p>
                        {platformSettings.adminPayPalAccountName && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Account Name: {platformSettings.adminPayPalAccountName}
                          </p>
                        )}
                        {platformSettings.updatedAt && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Last updated: {formatDate(platformSettings.updatedAt.toDate ? platformSettings.updatedAt.toDate() : new Date(platformSettings.updatedAt))}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setIsEditingPayPal(true);
                          setPayPalEmailInput(platformSettings.adminPayPalEmail || '');
                          setPayPalAccountNameInput(platformSettings.adminPayPalAccountName || '');
                        }}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        {platformSettings.adminPayPalEmail ? 'Edit PayPal Account' : 'Configure PayPal Account'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          PayPal Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={payPalEmailInput}
                          onChange={(e) => setPayPalEmailInput(e.target.value)}
                          placeholder="admin@getaways.com"
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          disabled={isSavingPayPal}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter the PayPal email address that will receive all cash-in transactions
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Account Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={payPalAccountNameInput}
                          onChange={(e) => setPayPalAccountNameInput(e.target.value)}
                          placeholder="Getaways Official Account"
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          disabled={isSavingPayPal}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          A friendly name to identify this PayPal account (for your reference only)
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSavePayPalSettings}
                          disabled={isSavingPayPal || !payPalEmailInput || !payPalEmailInput.includes('@')}
                          className="btn-primary flex items-center gap-2"
                        >
                          {isSavingPayPal ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Save PayPal Account
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingPayPal(false);
                            setPayPalEmailInput(platformSettings.adminPayPalEmail || '');
                            setPayPalAccountNameInput(platformSettings.adminPayPalAccountName || '');
                          }}
                          disabled={isSavingPayPal}
                          className="btn-outline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Information Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">How It Works</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Users will cash in to your GetPay wallet via PayPal - the money goes to this official account</li>
                    <li>When users request cash-out, you'll send money from this account to their PayPal</li>
                    <li>All booking payments and subscription fees flow through this account</li>
                    <li>Make sure this PayPal account has sufficient balance to process cash-out requests</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="card-listing p-6">
              <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Generation of Reports</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'financial', label: 'Financial Report', icon: DollarSign, description: 'Revenue, fees, and payment analytics' },
                  { id: 'bookings', label: 'Bookings Report', icon: Calendar, description: 'Complete booking history and statistics' },
                  { id: 'users', label: 'Users Report', icon: Users, description: 'User growth and activity metrics' },
                  { id: 'reviews', label: 'Reviews Report', icon: Star, description: 'Review analysis and ratings breakdown' },
                  { id: 'hosts', label: 'Hosts Report', icon: Home, description: 'Host performance and earnings' },
                  { id: 'compliance', label: 'Compliance Report', icon: Shield, description: 'Policy violations and compliance status' }
                ].map(report => (
                  <button
                    key={report.id}
                    onClick={() => generateReport(report.id)}
                    disabled={generatingReport}
                    className="p-6 border border-border rounded-lg hover:bg-muted/30 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
                  >
                    {generatingReport && (
                      <div className="absolute top-2 right-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                      </div>
                    )}
                    <report.icon className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">{report.label}</h3>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Earnings History Modal */}
      <AlertDialog open={showEarningsHistoryModal} onOpenChange={setShowEarningsHistoryModal}>
        <AlertDialogContent className="bg-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Earnings Release History
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Total Released: <span className="font-bold text-blue-600">{formatCurrency(releasedEarnings.totalReleased || 0)}</span>
              <span className="ml-4">Total Releases: <span className="font-bold">{earningsHistory.length}</span></span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-4 space-y-3">
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
                const hostEmail = metadata.hostEmail || 'Unknown';
                const hostId = metadata.hostId || 'N/A';
                
                return (
                  <div
                    key={transaction.id || index}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-lg text-red-600">
                            -{formatCurrency(transaction.amount || 0)}
                          </span>
                          <span className="text-sm text-gray-500">
                            (Balance: {formatCurrency(transaction.balanceAfter || 0)})
                          </span>
                        </div>
                        <p className="text-gray-700 font-medium mb-1">{transaction.description || 'Earnings Release'}</p>
                        <div className="space-y-1 mt-2">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Listing:</span> {listingTitle}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Host:</span> {hostEmail}
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
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No earnings release history yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Earnings releases will appear here when you release payments to hosts.
                </p>
                <p className="text-xs text-gray-400 mt-4">
                  💡 <strong>Tip:</strong> Go to the "Earnings Release" tab to release earnings for completed bookings.
                </p>
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left text-gray-600">
                    <p><strong>Debug Info:</strong></p>
                    <p>Admin User ID: {user?.uid || 'Not found'}</p>
                    <p>Total Transactions: Check console for details</p>
                    <p>Filter: type === 'payment' && metadata.paymentType === 'host_earnings_release'</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowEarningsHistoryModal(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
