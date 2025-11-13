import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where, doc, getDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  Users, Home, Calendar, DollarSign, TrendingUp,
  Star, FileText, Shield, Settings, BarChart3,
  Eye, Download, Filter, Search, CheckCircle, XCircle,
  AlertCircle, CreditCard, Receipt, BookOpen, FileCheck,
  TrendingDown, Award, AlertTriangle, Send, Clock, RefreshCw, Edit3, X, Menu, LogOut, Trash2, Ban
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
  HOST_COMMISSION_PERCENTAGE,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data states
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeListings: 0,
    totalBookings: 0,
    totalRevenue: 0,
    serviceFees: 0,
    subscriptionRevenue: 0, // Total subscription fees collected
    pendingPayments: 0
  });
  
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [payments, setPayments] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [terminatingHost, setTerminatingHost] = useState(null);
  const [showTerminateHostDialog, setShowTerminateHostDialog] = useState(false);
  const [selectedHostForTermination, setSelectedHostForTermination] = useState(null);
  const [bestReviews, setBestReviews] = useState([]);
  const [lowestReviews, setLowestReviews] = useState([]);
  const [pendingEarnings, setPendingEarnings] = useState([]);
  const [releasedEarnings, setReleasedEarnings] = useState({ totalReleased: 0, totalServiceFees: 0, byHost: [] });
  const [releasingEarnings, setReleasingEarnings] = useState(new Set());
  const [earningsHistory, setEarningsHistory] = useState([]);
  const [showEarningsHistoryModal, setShowEarningsHistoryModal] = useState(false);
  const [isLoadingEarningsHistory, setIsLoadingEarningsHistory] = useState(false);
  
  // Modal states for card details
  const [showTotalEarningsModal, setShowTotalEarningsModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showListingsModal, setShowListingsModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [showServiceFeesModal, setShowServiceFeesModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPendingEarningsModal, setShowPendingEarningsModal] = useState(false);
  
  // Detailed data for modals
  const [allUsers, setAllUsers] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [subscriptionTransactions, setSubscriptionTransactions] = useState([]);
  const [commissionTransactions, setCommissionTransactions] = useState([]);
  
  // All money transactions
  const [allMoneyTransactions, setAllMoneyTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
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
        loadPendingRefunds(),
        loadAllMoneyTransactions()
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

  // Load detailed data for modals
  const loadAllUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = [];
      usersSnapshot.forEach(docSnap => {
        const userData = docSnap.data();
        const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest'];
        usersList.push({
          id: docSnap.id,
          email: userData.email || 'N/A',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          roles: roles,
          emailVerified: userData.emailVerified || false,
          createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : null,
          lastLogin: userData.lastLogin?.toDate ? userData.lastLogin.toDate() : null
        });
      });
      setAllUsers(usersList);
    } catch (error) {
      console.error('Error loading all users:', error);
    }
  };

  const loadAllListings = async () => {
    try {
      const listingsSnapshot = await getDocs(collection(db, 'listings'));
      const listingsList = [];
      listingsSnapshot.forEach(docSnap => {
        const listingData = docSnap.data();
        listingsList.push({
          id: docSnap.id,
          title: listingData.title || 'Untitled',
          status: listingData.status || 'draft',
          category: listingData.category || 'accommodation',
          ownerId: listingData.ownerId || '',
          createdAt: listingData.createdAt?.toDate ? listingData.createdAt.toDate() : null,
          updatedAt: listingData.updatedAt?.toDate ? listingData.updatedAt.toDate() : null
        });
      });
      setAllListings(listingsList);
    } catch (error) {
      console.error('Error loading all listings:', error);
    }
  };

  const loadAllMoneyTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const { getAdminUserId, getWalletTransactions } = await import('@/pages/Common/services/getpayService');
      const adminUserId = await getAdminUserId();
      
      if (!adminUserId) {
        console.warn('⚠️ Admin user ID not found - cannot load transactions');
        setAllMoneyTransactions([]);
        return;
      }

      // Get all wallet transactions from walletTransactions collection
      const allTransactionsSnapshot = await getDocs(
        query(
          collection(db, 'walletTransactions'),
          orderBy('createdAt', 'desc')
        )
      );
      
      const allTransactions = [];
      const userIds = new Set();
      
      // Process all transactions
      allTransactionsSnapshot.forEach(docSnap => {
        const transaction = docSnap.data();
        const transactionId = docSnap.id;
        const date = transaction.createdAt?.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt);
        
        userIds.add(transaction.userId);
        
        // Determine transaction type based on metadata
        let transactionType = transaction.type === 'credit' ? 'Credit' : 'Debit';
        if (transaction.metadata?.paymentType === 'subscription_payment') {
          transactionType = 'Host Subscription Payment';
        } else if (transaction.metadata?.paymentType === 'booking_payment') {
          transactionType = transaction.type === 'credit' ? 'Guest Booking Payment (Admin Received)' : 'Guest Booking Payment (Guest Paid)';
        } else if (transaction.metadata?.paymentType === 'earnings_release') {
          transactionType = 'Earnings Release';
        }
        
        allTransactions.push({
          id: transactionId,
          ...transaction,
          date,
          isAdminTransaction: transaction.userId === adminUserId,
          transactionType
        });
      });
      
      // Get user details for all user IDs
      const userDetailsMap = new Map();
      for (const userId of userIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userDetailsMap.set(userId, {
              email: userData.email || 'Unknown',
              name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Unknown',
              roles: Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest']
            });
          }
        } catch (error) {
          console.error(`Error loading user ${userId}:`, error);
        }
      }
      
      // Enrich transactions with user details
      const enrichedTransactions = allTransactions.map(transaction => {
        const userDetails = userDetailsMap.get(transaction.userId) || { email: 'Unknown', name: 'Unknown', roles: [] };
        return {
          ...transaction,
          userEmail: userDetails.email,
          userName: userDetails.name,
          userRoles: userDetails.roles
        };
      });
      
      // Sort by date (newest first)
      enrichedTransactions.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date || 0);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date || 0);
        return dateB - dateA;
      });
      
      setAllMoneyTransactions(enrichedTransactions);
      console.log('📊 Loaded', enrichedTransactions.length, 'money transactions');
    } catch (error) {
      console.error('Error loading all money transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadCommissionTransactions = async () => {
    try {
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const commissionList = [];
      
      bookingsSnapshot.forEach(docSnap => {
        const booking = docSnap.data();
        if (booking.status === 'confirmed' || booking.status === 'completed') {
          const bookingAmount = booking.bookingAmount || booking.totalPrice || 0;
          const commission = Math.round((bookingAmount * HOST_COMMISSION_PERCENTAGE) * 100) / 100;
          if (commission > 0) {
            commissionList.push({
              id: docSnap.id,
              bookingId: docSnap.id,
              amount: commission,
              bookingAmount: bookingAmount,
              listingTitle: booking.listingTitle || 'Unknown',
              guestEmail: booking.guestEmail || 'Unknown',
              hostEmail: booking.hostEmail || 'Unknown',
              status: booking.status,
              createdAt: booking.createdAt?.toDate ? booking.createdAt.toDate() : null,
              checkInDate: booking.checkInDate?.toDate ? booking.checkInDate.toDate() : null,
              checkOutDate: booking.checkOutDate?.toDate ? booking.checkOutDate.toDate() : null
            });
          }
        }
      });
      
      setCommissionTransactions(commissionList.sort((a, b) => {
        const dateA = a.createdAt || new Date(0);
        const dateB = b.createdAt || new Date(0);
        return dateB - dateA;
      }));
    } catch (error) {
      console.error('Error loading commission transactions:', error);
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
      // Guest pays: bookingAmount (no service fee)
      // Admin keeps: 10% commission from bookingAmount
      // Host receives: 90% of bookingAmount when earnings are released
      
      let totalRevenue = 0; // Total revenue = sum of all bookingAmount (what guests paid)
      let serviceFees = 0; // Total service fees = 10% commission from bookingAmount
      let pendingPayments = 0;
      let pendingEarningsAmount = 0; // Pending host earnings = 90% of bookingAmount for completed bookings
      
      bookingsSnapshot.forEach(doc => {
        const booking = doc.data();
        // Get bookingAmount - this is what the guest paid (no service fee)
        // For old bookings, bookingAmount might not exist, use totalPrice as fallback
        const bookingAmount = booking.bookingAmount || booking.totalPrice || 0;
        
        if (booking.status === 'confirmed' || booking.status === 'completed') {
          totalRevenue += bookingAmount;
          
          // Service fees = 10% commission from bookingAmount (what admin keeps)
          const commission = Math.round((bookingAmount * HOST_COMMISSION_PERCENTAGE) * 100) / 100;
          serviceFees += commission;
          
          // Count pending earnings (completed but not released)
          // Host should receive 90% of bookingAmount
          // Match the same criteria as getPendingEarnings: earningsReleasePending && !earningsReleased
          if (booking.status === 'completed' && 
              booking.earningsReleasePending === true && 
              !booking.earningsReleased) {
            const hostEarnings = Math.round((bookingAmount * (1 - HOST_COMMISSION_PERCENTAGE)) * 100) / 100;
            pendingEarningsAmount += hostEarnings;
          }
        } else if (booking.status === 'pending') {
          pendingPayments++;
        }
      });
      
      // Calculate subscription revenue from wallet transactions
      // Subscription fees: Monthly = ₱999, Yearly = ₱9,999
      // Fetch all admin transactions and filter for subscription payments
      let subscriptionRevenue = 0;
      try {
        // Get admin user ID
        const { getAdminUserId, getWalletTransactions } = await import('@/pages/Common/services/getpayService');
        const adminUserId = await getAdminUserId();
        
        if (adminUserId) {
          // Get all wallet transactions for admin user
          const transactions = await getWalletTransactions(adminUserId, 10000); // Get large number to ensure we get all
          
          console.log('📊 Total admin wallet transactions loaded:', transactions.length);
          
          // Filter for subscription payment transactions
          // Subscription payments are credits to admin wallet with paymentType: 'subscription_payment'
          const filteredSubscriptionTransactions = transactions.filter(t => {
            const isCredit = t.type === 'credit';
            const isSubscriptionPayment = t.metadata?.paymentType === 'subscription_payment';
            const matches = isCredit && isSubscriptionPayment;
            
            // Debug logging for non-matching transactions that look like subscriptions
            if (isCredit && !isSubscriptionPayment && (
              t.description?.includes('Subscription') || 
              t.description?.includes('subscription') ||
              t.metadata?.subscriptionType ||
              t.metadata?.subscriptionPlan
            )) {
              console.warn('⚠️ Found credit transaction that looks like subscription but missing paymentType:', {
                id: t.id,
                description: t.description,
                metadata: t.metadata,
                type: t.type
              });
            }
            
            return matches;
          });
          
          // Store transactions for modal (sort by date, newest first)
          const sortedTransactions = [...filteredSubscriptionTransactions].sort((a, b) => {
            const dateA = a.date instanceof Date ? a.date : new Date(a.date || 0);
            const dateB = b.date instanceof Date ? b.date : new Date(b.date || 0);
            return dateB - dateA;
          });
          setSubscriptionTransactions(sortedTransactions);
          
          // Sum up all subscription payments
          sortedTransactions.forEach(transaction => {
            const amount = transaction.amount || 0;
            subscriptionRevenue += amount;
          });
          
          console.log('📊 Subscription revenue calculated:', subscriptionRevenue, 'from', sortedTransactions.length, 'subscription transactions');
          console.log('📋 Subscription transaction details:', sortedTransactions.map(t => ({
            id: t.id,
            amount: t.amount,
            subscriptionType: t.metadata?.subscriptionType,
            subscriptionPlan: t.metadata?.subscriptionPlan,
            hostEmail: t.metadata?.hostEmail,
            paymentMethod: t.metadata?.paymentMethod,
            date: t.date,
            description: t.description
          })));
        } else {
          console.warn('⚠️ Admin user ID not found - cannot calculate subscription revenue');
        }
      } catch (subscriptionError) {
        console.error('Error loading subscription revenue:', subscriptionError);
        // Continue even if subscription query fails
      }
      
      setStats({
        totalUsers,
        activeListings,
        totalBookings,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        serviceFees: Math.round(serviceFees * 100) / 100,
        subscriptionRevenue: Math.round(subscriptionRevenue * 100) / 100,
        pendingPayments,
        pendingEarningsAmount: Math.round(pendingEarningsAmount * 100) / 100
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
        
        // Include hosts and terminated hosts (who were previously hosts)
        if (roles.includes('host') || userData.isTerminated) {
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
            reviewCount,
            isTerminated: userData.isTerminated || false,
            terminatedAt: userData.terminatedAt || null
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

  const handleTerminateHost = async (host) => {
    try {
      setTerminatingHost(host.userId);
      
      const batch = writeBatch(db);
      
      // 1. Remove host role from user
      const userRef = doc(db, 'users', host.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest'];
        const updatedRoles = roles.filter(role => role !== 'host');
        
        batch.update(userRef, {
          roles: updatedRoles.length > 0 ? updatedRoles : ['guest'],
          isTerminated: true,
          terminatedAt: new Date(),
          terminatedBy: user.uid
        });
      }
      
      // 2. Delete all listings for this host
      const listingsSnapshot = await getDocs(
        query(collection(db, 'listings'), where('ownerId', '==', host.userId))
      );
      
      listingsSnapshot.forEach(listingDoc => {
        batch.delete(listingDoc.ref);
      });
      
      // Commit all changes
      await batch.commit();
      
      toast.success(`Host ${host.name} and ${listingsSnapshot.size} listing(s) terminated successfully`);
      
      // Reload hosts and stats
      await loadHosts();
      await loadStats();
      await loadListings();
      
      setShowTerminateHostDialog(false);
      setSelectedHostForTermination(null);
    } catch (error) {
      console.error('Error terminating host:', error);
      toast.error(`Failed to terminate host: ${error.message}`);
    } finally {
      setTerminatingHost(null);
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
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 pt-20">
        {/* Sidebar Menu - Starts at top, sticky until footer */}
        <aside className={`w-full lg:w-80 flex-shrink-0 transition-all duration-300 ${
          sidebarOpen 
            ? 'fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto' 
            : 'hidden lg:block'
        }`}>
          <div className={`card-listing p-4 lg:p-6 lg:mt-8 lg:sticky lg:top-28 lg:h-[calc(100vh-5rem)] overflow-visible ${
            sidebarOpen ? 'h-screen overflow-y-auto scrollbar-hide' : ''
          }`}>
            {/* Mobile Close Button */}
            <div className="flex items-center justify-between mb-6 lg:hidden">
              <h2 className="font-heading text-xl font-bold text-foreground">Menu</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="space-y-3">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3, description: 'Dashboard overview' },
                { id: 'transactions', label: 'All Transactions', icon: Receipt, description: 'All money transactions' },
                { id: 'earnings', label: 'Earnings Release', icon: Send, badge: pendingEarnings.length, description: 'Manage host earnings' },
                { id: 'refunds', label: 'Refunds', icon: RefreshCw, badge: pendingRefunds.length, description: 'Process refunds' },
                { id: 'service-fees', label: 'Service Fees', icon: DollarSign, description: 'Platform fees' },
                { id: 'host-management', label: 'Host Management', icon: Users, description: 'Manage hosts and listings' },
                { id: 'compliance', label: 'Policy & Compliance', icon: Shield, description: 'Policies & rules' },
                { id: 'reports', label: 'Reports', icon: FileText, description: 'Generate reports' }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false); // Close mobile menu on selection
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all duration-300 text-left group relative ${
                    activeTab === tab.id
                      ? 'bg-primary/10 border-2 border-primary shadow-md transform scale-[1.02]'
                      : 'bg-muted/50 border-2 border-transparent hover:bg-muted hover:border-border hover:scale-[1.01]'
                  }`}
                >
                  {/* Active Indicator Line */}
                  {activeTab === tab.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                  )}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground group-hover:text-primary group-hover:bg-primary/10'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className={`font-semibold text-sm ${
                        activeTab === tab.id ? 'text-primary' : 'text-foreground'
                      }`}>
                        {tab.label}
                      </h3>
                      {tab.badge && tab.badge > 0 && (
                        <span className="px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full flex-shrink-0">
                          {tab.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {tab.description}
                    </p>
                  </div>
                </button>
                );
              })}
            </nav>

            {/* Logout Button */}
            <div className="mt-8 pt-6 border-t border-border">
              <button
                onClick={async () => {
                  await signOut(auth);
                  navigate('/login');
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-300 text-left group hover:bg-muted/50"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors text-primary group-hover:bg-primary/10">
                  <LogOut className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-primary">
                    Log out
                  </h3>
                </div>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Menu Toggle Button */}
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 relative">
          {/* Stats Grid - Sticky Compact with Header */}
          <div className="max-w-7xl mx-auto px-6 pt-8 mb-4 sticky top-20 z-10 bg-background pb-2">
            {/* Header - Compact */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
                    Admin Dashboard
                  </h1>
                  <p className="font-body text-sm text-muted-foreground">
                    Manage your Getaways platform with comprehensive insights and controls
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
                    aria-label="Toggle menu"
                  >
                    <Menu className="w-5 h-5 text-foreground" />
                  </button>
                </div>
              </div>
            </div>
          {/* Top Row: Total Admin Earnings (50%) | Pending & Released (50%) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            {/* Total Admin Earnings - Left Half */}
            <div 
              className="card-listing p-3 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 cursor-pointer hover:shadow-lg transition-all"
              onClick={async () => {
                setShowTotalEarningsModal(true);
                await Promise.all([loadCommissionTransactions(), loadAllUsers()]);
              }}
            >
              <div className="flex items-center justify-between h-full">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-green-900 leading-tight">
                      {formatCurrency((stats.serviceFees || 0) + (stats.subscriptionRevenue || 0))}
                    </h3>
                    <p className="text-green-700 font-medium text-xs">Total Admin Earnings</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <span>Commission: {formatCurrency(stats.serviceFees || 0)}</span>
                  <span>•</span>
                  <span>Subs: {formatCurrency(stats.subscriptionRevenue || 0)}</span>
                  <Eye className="w-3 h-3 text-green-600 ml-1" />
                </div>
              </div>
            </div>

            {/* Pending & Released - Right Half */}
            <div className="flex flex-col gap-2">
              <div 
                className="card-listing p-2.5 bg-card cursor-pointer hover:shadow-lg transition-all"
                onClick={() => {
                  setShowPendingEarningsModal(true);
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-yellow-600" />
                  </div>
                  <Eye className="w-3 h-3 text-muted-foreground ml-auto" />
                </div>
                <h3 className="font-heading text-base font-bold text-foreground leading-tight">
                  {formatCurrency(stats.pendingEarningsAmount || 0)}
                </h3>
                <p className="text-muted-foreground text-[10px] leading-tight">
                  Pending ({pendingEarnings.length})
                </p>
              </div>

              <div 
                className="card-listing p-2.5 bg-card cursor-pointer hover:shadow-lg transition-all"
                onClick={async () => {
                  setShowEarningsHistoryModal(true);
                  setIsLoadingEarningsHistory(true);
                  await loadEarningsHistory();
                  setIsLoadingEarningsHistory(false);
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <Eye className="w-3 h-3 text-muted-foreground ml-auto" />
                </div>
                <h3 className="font-heading text-base font-bold text-foreground leading-tight">
                  {formatCurrency(releasedEarnings.totalReleased || 0)}
                </h3>
                <p className="text-muted-foreground text-[10px] leading-tight">Released</p>
              </div>
            </div>
          </div>

          {/* Bottom Row: Users, Listings, Bookings - Single Line */}
          <div className="grid grid-cols-3 gap-2">
            <div 
              className="card-listing p-2.5 bg-card cursor-pointer hover:shadow-lg transition-all"
              onClick={async () => {
                setShowUsersModal(true);
                await loadAllUsers();
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-3.5 h-3.5 text-primary" />
                </div>
                <Eye className="w-3 h-3 text-muted-foreground ml-auto" />
              </div>
              <h3 className="font-heading text-base font-bold text-foreground leading-tight">
                {stats.totalUsers.toLocaleString()}
              </h3>
              <p className="text-muted-foreground text-[10px] leading-tight">Total Users</p>
            </div>

            <div 
              className="card-listing p-2.5 bg-card cursor-pointer hover:shadow-lg transition-all"
              onClick={async () => {
                setShowListingsModal(true);
                await loadAllListings();
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Home className="w-3.5 h-3.5 text-accent" />
                </div>
                <Eye className="w-3 h-3 text-muted-foreground ml-auto" />
              </div>
              <h3 className="font-heading text-base font-bold text-foreground leading-tight">
                {stats.activeListings.toLocaleString()}
              </h3>
              <p className="text-muted-foreground text-[10px] leading-tight">Active Listings</p>
            </div>

            <div 
              className="card-listing p-2.5 bg-card cursor-pointer hover:shadow-lg transition-all"
              onClick={() => {
                setShowBookingsModal(true);
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-secondary" />
                </div>
                <Eye className="w-3 h-3 text-muted-foreground ml-auto" />
              </div>
              <h3 className="font-heading text-base font-bold text-foreground leading-tight">
                {stats.totalBookings.toLocaleString()}
              </h3>
              <p className="text-muted-foreground text-[10px] leading-tight">Total Bookings</p>
            </div>
          </div>
        </div>

          {/* Tab Content */}
          <div className="max-w-7xl mx-auto px-6 mb-12 relative">
            {/* Content Container with smooth transitions */}
            <div 
              key={activeTab}
              className="animate-fade-in"
              style={{
                animation: 'fadeIn 0.3s ease-in-out'
              }}
            >
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

              {/* Analytics Content */}
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

              {/* Bookings Section */}
              <div className="space-y-6 mt-6">
                {/* Booking Statistics */}
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

                {/* List of Bookings */}
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
                            <button 
                              onClick={() => navigate(`/booking/${booking.id}`)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="View booking details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            </div>
          )}

          {/* All Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-3xl font-bold text-foreground">All Money Transactions</h2>
                  <p className="text-muted-foreground mt-1">Complete history of all money-related transactions</p>
                </div>
                <button
                  onClick={loadAllMoneyTransactions}
                  disabled={loadingTransactions}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingTransactions ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {loadingTransactions ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading transactions...</p>
                </div>
              ) : allMoneyTransactions.length > 0 ? (
                <div className="card-listing p-6">
                  <div className="space-y-4">
                    {allMoneyTransactions.map((transaction, index) => {
                      const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date || transaction.createdAt);
                      const formattedDate = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      
                      const isCredit = transaction.type === 'credit';
                      const amount = transaction.amount || 0;
                      const metadata = transaction.metadata || {};
                      
                      return (
                        <div
                          key={transaction.id || index}
                          className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`w-2 h-2 rounded-full ${isCredit ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className={`font-semibold text-lg ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                  {isCredit ? '+' : '-'}{formatCurrency(amount)}
                                </span>
                                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                  {transaction.transactionType || (isCredit ? 'Credit' : 'Debit')}
                                </span>
                              </div>
                              
                              <p className="font-medium text-foreground mb-2">{transaction.description || 'Transaction'}</p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">User: </span>
                                  <span className="font-medium">{transaction.userName || transaction.userEmail || 'Unknown'}</span>
                                  <span className="text-muted-foreground ml-2">({transaction.userEmail || 'N/A'})</span>
                                </div>
                                
                                {metadata.bookingId && (
                                  <div>
                                    <span className="text-muted-foreground">Booking ID: </span>
                                    <span className="font-medium">{metadata.bookingId}</span>
                                  </div>
                                )}
                                
                                {metadata.listingTitle && (
                                  <div>
                                    <span className="text-muted-foreground">Listing: </span>
                                    <span className="font-medium">{metadata.listingTitle}</span>
                                  </div>
                                )}
                                
                                {metadata.guestEmail && (
                                  <div>
                                    <span className="text-muted-foreground">Guest: </span>
                                    <span className="font-medium">{metadata.guestEmail}</span>
                                  </div>
                                )}
                                
                                {metadata.hostEmail && (
                                  <div>
                                    <span className="text-muted-foreground">Host: </span>
                                    <span className="font-medium">{metadata.hostEmail}</span>
                                  </div>
                                )}
                                
                                {transaction.balanceAfter !== undefined && (
                                  <div>
                                    <span className="text-muted-foreground">Balance After: </span>
                                    <span className="font-medium">{formatCurrency(transaction.balanceAfter)}</span>
                                  </div>
                                )}
                                
                                <div>
                                  <span className="text-muted-foreground">Date: </span>
                                  <span className="font-medium">{formattedDate}</span>
                                </div>
                                
                                {transaction.id && (
                                  <div>
                                    <span className="text-muted-foreground">Transaction ID: </span>
                                    <span className="font-mono text-xs">{transaction.id}</span>
                                  </div>
                                )}
                              </div>
                              
                              {transaction.isAdminTransaction && (
                                <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                                  Admin Wallet Transaction
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="card-listing p-12 text-center">
                  <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">No transactions found</p>
                  <p className="text-muted-foreground text-sm mt-2">Transactions will appear here once money moves through the system</p>
                </div>
              )}
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
                                <p className="text-xs text-muted-foreground">Commission (10%)</p>
                                <p className="text-sm font-semibold text-blue-600">+{formatCurrency(earning.adminCommission || 0)}</p>
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
              
              {/* Total Service Fees Summary */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900">Total Service Fees</p>
                      <p className="text-2xl font-bold text-blue-700">{formatCurrency((stats.serviceFees || 0) + (stats.subscriptionRevenue || 0))}</p>
                    </div>
                    <DollarSign className="w-12 h-12 text-blue-600" />
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-900">Commission (10%)</p>
                      <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.serviceFees || 0)}</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-green-600" />
                  </div>
                </div>
                
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-purple-900">Subscription Fees</p>
                      <p className="text-2xl font-bold text-purple-700">{formatCurrency(stats.subscriptionRevenue || 0)}</p>
                    </div>
                    <CreditCard className="w-12 h-12 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Commission Fees Section */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-foreground mb-4">Commission Fees (10% from Bookings)</h3>
                <div className="space-y-4">
                  {hosts.length > 0 ? (
                    hosts.map(host => {
                      const hostServiceFees = Math.round((host.earnings * HOST_COMMISSION_PERCENTAGE) * 100) / 100;
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
                            <p className="text-xs text-muted-foreground">Commission (10%)</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No commission fees collected yet</p>
                  )}
                </div>
              </div>

              {/* Subscription Fees History Section */}
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4">Subscription Fees History</h3>
                <div className="space-y-4">
                  {subscriptionTransactions.length > 0 ? (
                    subscriptionTransactions.map((transaction, index) => {
                      const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
                      return (
                        <div key={transaction.id || index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div>
                            <p className="font-medium">{transaction.metadata?.hostEmail || 'Unknown Host'}</p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.metadata?.subscriptionPlan || 'Subscription'} Plan
                              {transaction.metadata?.subscriptionType && ` (${transaction.metadata.subscriptionType})`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {transaction.description || 'Host Subscription Payment'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Date: {date.toLocaleDateString()} {date.toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-purple-600">{formatCurrency(transaction.amount)}</p>
                            <p className="text-xs text-muted-foreground">Subscription Fee</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No subscription fees collected yet</p>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Host Management Tab */}
          {activeTab === 'host-management' && (
            <div className="card-listing p-6">
              <div className="mb-6">
                <h2 className="font-heading text-3xl font-bold text-foreground mb-2">Host Management</h2>
                <p className="text-muted-foreground">Manage hosts and terminate accounts with their listings</p>
              </div>

              <div className="space-y-4">
                {hosts.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">No hosts found</p>
                  </div>
                ) : (
                  hosts.map(host => (
                    <div 
                      key={host.userId} 
                      className={`p-4 border rounded-lg ${
                        host.isTerminated 
                          ? 'border-red-300 bg-red-50/50' 
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-foreground">{host.name}</h3>
                            {host.isTerminated && (
                              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                Terminated
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{host.email}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span>{host.listings} {host.listings === 1 ? 'listing' : 'listings'}</span>
                            <span>•</span>
                            <span>{host.bookings} {host.bookings === 1 ? 'booking' : 'bookings'}</span>
                            <span>•</span>
                            <span>{formatCurrency(host.earnings)} total earnings</span>
                            {host.reviewCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  {host.rating.toFixed(1)} ({host.reviewCount} {host.reviewCount === 1 ? 'review' : 'reviews'})
                                </span>
                              </>
                            )}
                          </div>
                          {host.isTerminated && host.terminatedAt && (
                            <p className="text-xs text-red-600 mt-2">
                              Terminated on {formatDate(host.terminatedAt)}
                            </p>
                          )}
                        </div>
                        {!host.isTerminated && (
                          <button
                            onClick={() => {
                              setSelectedHostForTermination(host);
                              setShowTerminateHostDialog(true);
                            }}
                            disabled={terminatingHost === host.userId}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-4"
                          >
                            {terminatingHost === host.userId ? (
                              <>
                                <Clock className="w-4 h-4 animate-spin" />
                                Terminating...
                              </>
                            ) : (
                              <>
                                <Ban className="w-4 h-4" />
                                Terminate Host
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Policy & Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="max-w-7xl mx-auto px-6">
              <PolicyManagement />
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
                ].map(report => {
                  const ReportIcon = report.icon;
                  return (
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
                    <ReportIcon className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">{report.label}</h3>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </button>
                  );
                })}
              </div>
            </div>
          )}
            </div>
          </div>
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

      {/* Total Admin Earnings Modal */}
      <AlertDialog open={showTotalEarningsModal} onOpenChange={setShowTotalEarningsModal}>
        <AlertDialogContent className="bg-white max-w-5xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Total Admin Earnings - Details & History
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Total: <span className="font-bold text-green-600 text-lg">
                {formatCurrency((stats.serviceFees || 0) + (stats.subscriptionRevenue || 0))}
              </span>
              <span className="ml-4">Commission: {formatCurrency(stats.serviceFees || 0)}</span>
              <span className="ml-4">Subscriptions: {formatCurrency(stats.subscriptionRevenue || 0)}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-4 space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3 text-green-700">Commission History ({commissionTransactions.length} transactions)</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {commissionTransactions.length > 0 ? (
                  commissionTransactions.map((item, index) => (
                    <div key={item.id || index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-green-600">{formatCurrency(item.amount)}</p>
                          <p className="text-sm text-gray-600">{item.listingTitle}</p>
                          <p className="text-xs text-gray-500">Booking: {item.bookingId.substring(0, 8)}...</p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          {item.createdAt ? item.createdAt.toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No commission transactions yet</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3 text-purple-700">Subscription History ({subscriptionTransactions.length} transactions)</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {subscriptionTransactions.length > 0 ? (
                  subscriptionTransactions.map((transaction, index) => {
                    const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
                    return (
                      <div key={transaction.id || index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-purple-600">{formatCurrency(transaction.amount)}</p>
                            <p className="text-sm text-gray-600">
                              {transaction.metadata?.subscriptionPlan || 'Subscription'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {transaction.metadata?.hostEmail || 'Unknown host'}
                            </p>
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            {date.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm">No subscription transactions yet</p>
                )}
              </div>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowTotalEarningsModal(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Users Modal */}
      <AlertDialog open={showUsersModal} onOpenChange={setShowUsersModal}>
        <AlertDialogContent className="bg-white max-w-5xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              All Users - Details & History
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Total Users: <span className="font-bold">{allUsers.length}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {allUsers.length > 0 ? (
              allUsers.map((user) => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Roles: {user.roles.join(', ')} • Verified: {user.emailVerified ? 'Yes' : 'No'}
                      </p>
                      {user.createdAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Joined: {user.createdAt.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No users found</p>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowUsersModal(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Listings Modal */}
      <AlertDialog open={showListingsModal} onOpenChange={setShowListingsModal}>
        <AlertDialogContent className="bg-white max-w-5xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <Home className="w-5 h-5 text-accent" />
              All Listings - Details & History
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Total Listings: <span className="font-bold">{allListings.length}</span>
              <span className="ml-4">Active: {allListings.filter(l => l.status === 'active').length}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {allListings.length > 0 ? (
              allListings.map((listing) => (
                <div key={listing.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{listing.title}</p>
                      <p className="text-sm text-gray-600 capitalize">
                        {listing.category} • Status: {listing.status}
                      </p>
                      {listing.createdAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Created: {listing.createdAt.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No listings found</p>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowListingsModal(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bookings Modal */}
      <AlertDialog open={showBookingsModal} onOpenChange={setShowBookingsModal}>
        <AlertDialogContent className="bg-white max-w-5xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-secondary" />
              All Bookings - Details & History
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Total Bookings: <span className="font-bold">{bookings.length}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{booking.listingTitle}</p>
                      <p className="text-sm text-gray-600">{booking.guestName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Status: {booking.status} • {formatCurrency(booking.totalPrice || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No bookings found</p>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowBookingsModal(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Service Fees Modal */}
      <AlertDialog open={showServiceFeesModal} onOpenChange={setShowServiceFeesModal}>
        <AlertDialogContent className="bg-white max-w-5xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Service Fees - Details & History
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              <div className="flex flex-wrap gap-4 mt-2">
                <div>
                  Total Service Fees: <span className="font-bold text-blue-600 text-lg">
                    {formatCurrency((stats.serviceFees || 0) + (stats.subscriptionRevenue || 0))}
                  </span>
                </div>
                <div>
                  Commission: <span className="font-bold text-green-600 text-lg">
                    {formatCurrency(stats.serviceFees || 0)}
                  </span>
                  <span className="ml-2 text-sm">({commissionTransactions.length} transactions)</span>
                </div>
                <div>
                  Subscriptions: <span className="font-bold text-purple-600 text-lg">
                    {formatCurrency(stats.subscriptionRevenue || 0)}
                  </span>
                  <span className="ml-2 text-sm">({subscriptionTransactions.length} transactions)</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-6">
            {/* Commission Fees Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-green-700 mb-3">Commission Fees (10% from Bookings)</h3>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {commissionTransactions.length > 0 ? (
                  commissionTransactions.map((item, index) => (
                    <div key={item.id || index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-green-600">{formatCurrency(item.amount)}</p>
                          <p className="text-sm text-gray-600">{item.listingTitle}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Booking Amount: {formatCurrency(item.bookingAmount)} • 
                            Commission: 10% • 
                            Guest: {item.guestEmail} • 
                            Host: {item.hostEmail}
                          </p>
                          {item.createdAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              Date: {item.createdAt.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No commission transactions yet</p>
                )}
              </div>
            </div>

            {/* Subscription Fees Section */}
            <div>
              <h3 className="text-lg font-semibold text-purple-700 mb-3">Subscription Fees History</h3>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {subscriptionTransactions.length > 0 ? (
                  subscriptionTransactions.map((transaction, index) => {
                    const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
                    return (
                      <div key={transaction.id || index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-purple-600">{formatCurrency(transaction.amount)}</p>
                            <p className="text-sm text-gray-600">
                              {transaction.metadata?.subscriptionPlan || 'Subscription'} Plan
                              {transaction.metadata?.subscriptionType && ` (${transaction.metadata.subscriptionType})`}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Host: {transaction.metadata?.hostEmail || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Date: {date.toLocaleDateString()} {date.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center py-4">No subscription transactions yet</p>
                )}
              </div>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowServiceFeesModal(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Subscription Modal */}
      <AlertDialog open={showSubscriptionModal} onOpenChange={setShowSubscriptionModal}>
        <AlertDialogContent className="bg-white max-w-5xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Subscription Revenue - Details & History
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Total Revenue: <span className="font-bold text-purple-600 text-lg">
                {formatCurrency(stats.subscriptionRevenue || 0)}
              </span>
              <span className="ml-4">Transactions: {subscriptionTransactions.length}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {subscriptionTransactions.length > 0 ? (
              subscriptionTransactions.map((transaction, index) => {
                const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
                return (
                  <div key={transaction.id || index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-purple-600">{formatCurrency(transaction.amount)}</p>
                        <p className="text-sm text-gray-600">
                          {transaction.metadata?.subscriptionPlan || 'Subscription'} Plan
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Host: {transaction.metadata?.hostEmail || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Date: {date.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-8">No subscription transactions yet</p>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSubscriptionModal(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pending Earnings Modal */}
      <AlertDialog open={showPendingEarningsModal} onOpenChange={setShowPendingEarningsModal}>
        <AlertDialogContent className="bg-white max-w-5xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Pending Earnings - Details
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Total Pending: <span className="font-bold text-yellow-600 text-lg">
                {formatCurrency(stats.pendingEarningsAmount || 0)}
              </span>
              <span className="ml-4">Bookings: {pendingEarnings.length}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {pendingEarnings.length > 0 ? (
              pendingEarnings.map((earning) => (
                <div key={earning.bookingId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-yellow-600">
                        {formatCurrency(earning.hostEarnings || 0)}
                      </p>
                      <p className="text-sm text-gray-600">{earning.listingTitle}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Host: {earning.hostEmail} • Booking: {earning.bookingId.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No pending earnings</p>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowPendingEarningsModal(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminate Host Confirmation Dialog */}
      <AlertDialog open={showTerminateHostDialog} onOpenChange={setShowTerminateHostDialog}>
        <AlertDialogContent className="bg-white max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Terminate Host Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              {selectedHostForTermination && (
                <>
                  <p className="mb-4">
                    Are you sure you want to terminate <strong>{selectedHostForTermination.name}</strong>?
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-red-800">This action will:</p>
                    <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                      <li>Remove the host role from their account</li>
                      <li>Permanently delete all {selectedHostForTermination.listings} listing(s) associated with this host</li>
                      <li>Mark the account as terminated</li>
                    </ul>
                    <p className="text-sm text-red-600 font-medium mt-3">
                      ⚠️ This action cannot be undone!
                    </p>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowTerminateHostDialog(false);
                setSelectedHostForTermination(null);
              }}
              className="bg-gray-500 hover:bg-gray-600"
            >
              Cancel
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                if (selectedHostForTermination) {
                  handleTerminateHost(selectedHostForTermination);
                }
              }}
              disabled={terminatingHost !== null}
              className="bg-red-600 hover:bg-red-700"
            >
              {terminatingHost ? 'Terminating...' : 'Terminate Host'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
