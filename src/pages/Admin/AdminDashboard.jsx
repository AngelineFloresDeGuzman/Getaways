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
  TrendingDown, Award, AlertTriangle, Send, Clock, RefreshCw, Edit3, X, Menu, LogOut, Trash2, Ban, Printer
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  autoCompleteBookings, 
  HOST_COMMISSION_PERCENTAGE
} from './services/earningsService';
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

  // Analytics and trends state
  const [analytics, setAnalytics] = useState({
    monthlyRevenue: [],
    monthlyBookings: [],
    monthlyUsers: [],
    revenueGrowth: 0,
    bookingsGrowth: 0,
    usersGrowth: 0,
    listingsGrowth: 0,
    currentMonthRevenue: 0,
    previousMonthRevenue: 0,
    currentMonthBookings: 0,
    previousMonthBookings: 0,
    currentMonthUsers: 0,
    previousMonthUsers: 0,
    topPerformingHosts: [],
    revenueByCategory: {},
    bookingStatusDistribution: {}
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
  
  // Modal states for card details
  const [showTotalEarningsModal, setShowTotalEarningsModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showListingsModal, setShowListingsModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [showServiceFeesModal, setShowServiceFeesModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
  // Detailed data for modals
  const [allUsers, setAllUsers] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [subscriptionTransactions, setSubscriptionTransactions] = useState([]);
  const [commissionTransactions, setCommissionTransactions] = useState([]);
  
  // All money transactions
  const [allMoneyTransactions, setAllMoneyTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [adminUserId, setAdminUserId] = useState(null);
  
  // Cash out requests
  const [cashOutRequests, setCashOutRequests] = useState([]);
  const [loadingCashOutRequests, setLoadingCashOutRequests] = useState(false);
  const [cashOutRequestFilter, setCashOutRequestFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [selectedCashOutRequest, setSelectedCashOutRequest] = useState(null);
  const [showCashOutRequestModal, setShowCashOutRequestModal] = useState(false);
  const [cashOutAdminNotes, setCashOutAdminNotes] = useState('');
  const [processingCashOutRequest, setProcessingCashOutRequest] = useState(false);
  
  
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
  
  // Date range filter for reports
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [dateRangePreset, setDateRangePreset] = useState('all'); // 'all', '7days', '30days', '3months', '6months', '1year', 'custom'
  const [previewData, setPreviewData] = useState(null);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Print functionality
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSection, setPrintSection] = useState(null);
  const [printDateRange, setPrintDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [printDateRangePreset, setPrintDateRangePreset] = useState('all');
  const [isPrinting, setIsPrinting] = useState(false);

  // Service fees page enhancements
  const [serviceFeesFilter, setServiceFeesFilter] = useState({
    search: '',
    dateRange: { startDate: '', endDate: '' },
    sortBy: 'earnings', // 'earnings', 'bookings', 'name'
    sortOrder: 'desc', // 'asc', 'desc'
    subscriptionType: 'all', // 'all', 'monthly', 'yearly'
    transactionSort: 'date', // 'date', 'amount', 'host'
    transactionSortOrder: 'desc' // 'asc', 'desc'
  });
  const [serviceFeesView, setServiceFeesView] = useState('overview'); // 'overview', 'hosts', 'transactions'
  const [expandedHosts, setExpandedHosts] = useState(new Set());

  // Filter states for other pages
  const [transactionsFilter, setTransactionsFilter] = useState({
    search: '',
    type: 'all', // 'all', 'credit', 'debit', 'subscription', 'earnings'
    dateRange: { startDate: '', endDate: '' },
    sortBy: 'date', // 'date', 'amount', 'user'
    sortOrder: 'desc',
    userRole: 'all' // 'all', 'admin', 'host', 'guest'
  });
  const [hostManagementFilter, setHostManagementFilter] = useState({
    search: '',
    status: 'all', // 'all', 'active', 'terminated'
    sortBy: 'name', // 'name', 'earnings', 'bookings', 'listings'
    sortOrder: 'asc'
  });
  const [transactionsView, setTransactionsView] = useState('all'); // 'all', 'credits', 'debits', 'summary'
  
  // Overview tab filters
  const [overviewFilter, setOverviewFilter] = useState({
    search: '',
    dateRange: { startDate: '', endDate: '' },
    category: 'all' // 'all', 'bookings', 'reviews', 'users', 'revenue'
  });
  
  // Preview states for each tab
  const [previewSection, setPreviewSection] = useState(null);
  const [showSectionPreview, setShowSectionPreview] = useState(false);
  
  // Reports filter
  const [reportsFilter, setReportsFilter] = useState({
    search: '',
    type: 'all' // 'all', 'financial', 'bookings', 'users', 'reviews', 'hosts', 'compliance'
  });
  
  // Compliance/Policy filter
  const [complianceFilter, setComplianceFilter] = useState({
    search: '',
    type: 'all'
  });


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
        loadPlatformSettings(),
        loadAllMoneyTransactions(),
        loadCashOutRequests()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
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
      // First, get all terminated host IDs
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const terminatedHostIds = new Set();
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.isTerminated) {
          terminatedHostIds.add(doc.id);
        }
      });
      
      const listingsSnapshot = await getDocs(collection(db, 'listings'));
      const listingsList = [];
      listingsSnapshot.forEach(docSnap => {
        const listingData = docSnap.data();
        // Skip listings from terminated hosts
        if (terminatedHostIds.has(listingData.ownerId)) {
          return;
        }
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

  const loadCashOutRequests = async () => {
    try {
      setLoadingCashOutRequests(true);
      const { getAllCashOutRequests } = await import('./services/cashOutService');
      const requests = await getAllCashOutRequests();
      setCashOutRequests(requests);
    } catch (error) {
      console.error('Error loading cash out requests:', error);
      toast.error('Failed to load cash out requests');
    } finally {
      setLoadingCashOutRequests(false);
    }
  };

  const handleApproveCashOut = async () => {
    if (!selectedCashOutRequest || !user) return;
    
    try {
      setProcessingCashOutRequest(true);
      const { approveCashOutRequest } = await import('./services/cashOutService');
      await approveCashOutRequest(selectedCashOutRequest.id, user.uid, cashOutAdminNotes);
      
      toast.success(`Cash out request approved. ₱${selectedCashOutRequest.amount.toLocaleString()} has been deducted from user's wallet.`);
      setShowCashOutRequestModal(false);
      setSelectedCashOutRequest(null);
      setCashOutAdminNotes('');
      
      // Reload requests and transactions
      await Promise.all([loadCashOutRequests(), loadAllMoneyTransactions()]);
    } catch (error) {
      console.error('Error approving cash out request:', error);
      toast.error(error.message || 'Failed to approve cash out request');
    } finally {
      setProcessingCashOutRequest(false);
    }
  };

  const handleRejectCashOut = async () => {
    if (!selectedCashOutRequest || !user) return;
    
    if (!cashOutAdminNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    try {
      setProcessingCashOutRequest(true);
      const { rejectCashOutRequest } = await import('./services/cashOutService');
      await rejectCashOutRequest(selectedCashOutRequest.id, user.uid, cashOutAdminNotes);
      
      toast.success('Cash out request rejected.');
      setShowCashOutRequestModal(false);
      setSelectedCashOutRequest(null);
      setCashOutAdminNotes('');
      
      // Reload requests
      await loadCashOutRequests();
    } catch (error) {
      console.error('Error rejecting cash out request:', error);
      toast.error(error.message || 'Failed to reject cash out request');
    } finally {
      setProcessingCashOutRequest(false);
    }
  };

  const loadAllMoneyTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const { getAdminUserId, getWalletTransactions } = await import('@/pages/Common/services/getpayService');
      const adminId = await getAdminUserId();
      
      if (!adminId) {
        console.warn('⚠️ Admin user ID not found - cannot load transactions');
        setAllMoneyTransactions([]);
        setAdminUserId(null);
        return;
      }
      
      // Store admin user ID in state for use in calculations
      setAdminUserId(adminId);

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
        } else if (transaction.metadata?.paymentType === 'points_cashout') {
          transactionType = 'Points Cash Out (Admin Paid)';
        }
        
        allTransactions.push({
          id: transactionId,
          ...transaction,
          date,
          isAdminTransaction: transaction.userId === adminId,
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



  const loadStats = async () => {
    try {
      // Total users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;
      
      // Active listings (exclude terminated hosts)
      const terminatedHostIds = new Set();
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.isTerminated) {
          terminatedHostIds.add(doc.id);
        }
      });
      
      const listingsSnapshot = await getDocs(
        query(collection(db, 'listings'), where('status', '==', 'active'))
      );
      // Filter out listings from terminated hosts
      let activeListingsCount = 0;
      listingsSnapshot.forEach(doc => {
        const listing = doc.data();
        if (!terminatedHostIds.has(listing.ownerId)) {
          activeListingsCount++;
        }
      });
      const activeListings = activeListingsCount;
      
      // Total bookings
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const totalBookings = bookingsSnapshot.size;
      
      // Calculate revenue and service fees from actual bookings
      // Guest pays: bookingAmount (no service fee)
      // Admin keeps: 10% commission from bookingAmount
      // Host receives: 90% of bookingAmount immediately when booking is confirmed
      
      let totalRevenue = 0; // Total revenue = sum of all bookingAmount (what guests paid)
      let serviceFees = 0; // Total service fees = 10% commission from bookingAmount
      let pendingPayments = 0;
      
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
        pendingPayments
      });

      // Calculate analytics and trends
      await calculateAnalytics(usersSnapshot, bookingsSnapshot, listingsSnapshot, totalRevenue, totalBookings, activeListings);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const calculateAnalytics = async (usersSnapshot, bookingsSnapshot, listingsSnapshot, totalRevenue, totalBookings, activeListings) => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      // Get all users for monthly trends
      const allUsers = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const createdAt = userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
        allUsers.push({ ...userData, createdAt });
      });

      // Get all bookings for monthly trends
      const allBookings = [];
      bookingsSnapshot.forEach(doc => {
        const booking = doc.data();
        const createdAt = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
        allBookings.push({ ...booking, createdAt, bookingAmount: booking.bookingAmount || booking.totalPrice || 0 });
      });

      // Get all listings for monthly trends
      const allListings = [];
      listingsSnapshot.forEach(doc => {
        const listing = doc.data();
        const createdAt = listing.createdAt?.toDate ? listing.createdAt.toDate() : new Date(listing.createdAt);
        allListings.push({ ...listing, createdAt });
      });

      // Calculate current month vs previous month
      const currentMonthUsers = allUsers.filter(u => {
        const date = u.createdAt;
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length;

      const previousMonthUsers = allUsers.filter(u => {
        const date = u.createdAt;
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
      }).length;

      const currentMonthBookings = allBookings.filter(b => {
        const date = b.createdAt;
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });

      const previousMonthBookings = allBookings.filter(b => {
        const date = b.createdAt;
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
      });

      const currentMonthRevenue = currentMonthBookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.bookingAmount || 0), 0);

      const previousMonthRevenue = previousMonthBookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.bookingAmount || 0), 0);

      // Calculate growth percentages
      const usersGrowth = previousMonthUsers > 0 
        ? ((currentMonthUsers - previousMonthUsers) / previousMonthUsers) * 100 
        : (currentMonthUsers > 0 ? 100 : 0);

      const bookingsGrowth = previousMonthBookings.length > 0 
        ? ((currentMonthBookings.length - previousMonthBookings.length) / previousMonthBookings.length) * 100 
        : (currentMonthBookings.length > 0 ? 100 : 0);

      const revenueGrowth = previousMonthRevenue > 0 
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
        : (currentMonthRevenue > 0 ? 100 : 0);

      // Calculate listings growth
      const currentMonthListings = allListings.filter(l => {
        const date = l.createdAt;
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length;

      const previousMonthListings = allListings.filter(l => {
        const date = l.createdAt;
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
      }).length;

      const listingsGrowth = previousMonthListings > 0 
        ? ((currentMonthListings - previousMonthListings) / previousMonthListings) * 100 
        : (currentMonthListings > 0 ? 100 : 0);

      // Calculate last 6 months data
      const monthlyRevenue = [];
      const monthlyBookings = [];
      const monthlyUsers = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthName = date.toLocaleString('default', { month: 'short' });

        const monthBookings = allBookings.filter(b => {
          const bDate = b.createdAt;
          return bDate.getMonth() === month && bDate.getFullYear() === year;
        });

        const monthRevenue = monthBookings
          .filter(b => b.status === 'confirmed' || b.status === 'completed')
          .reduce((sum, b) => sum + (b.bookingAmount || 0), 0);

        const monthUsers = allUsers.filter(u => {
          const uDate = u.createdAt;
          return uDate.getMonth() === month && uDate.getFullYear() === year;
        }).length;

        monthlyRevenue.push({ month: monthName, value: monthRevenue, year });
        monthlyBookings.push({ month: monthName, value: monthBookings.length, year });
        monthlyUsers.push({ month: monthName, value: monthUsers, year });
      }

      // Top performing hosts (exclude terminated hosts)
      const hostEarnings = {};
      const terminatedHostIds = new Set();
      
      // First, get all terminated host IDs
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.isTerminated) {
          terminatedHostIds.add(doc.id);
        }
      });
      
      allBookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .filter(b => !terminatedHostIds.has(b.ownerId)) // Exclude bookings from terminated hosts
        .forEach(b => {
          const hostId = b.ownerId;
          if (!hostEarnings[hostId]) {
            hostEarnings[hostId] = { earnings: 0, bookings: 0, hostId };
          }
          hostEarnings[hostId].earnings += (b.bookingAmount || 0);
          hostEarnings[hostId].bookings += 1;
        });

      const topPerformingHosts = Object.values(hostEarnings)
        .filter(h => !terminatedHostIds.has(h.hostId)) // Double check: exclude terminated hosts
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 5);

      // Booking status distribution
      const bookingStatusDistribution = {
        confirmed: allBookings.filter(b => b.status === 'confirmed').length,
        pending: allBookings.filter(b => b.status === 'pending').length,
        completed: allBookings.filter(b => b.status === 'completed').length,
        cancelled: allBookings.filter(b => b.status === 'cancelled').length
      };

      setAnalytics({
        monthlyRevenue,
        monthlyBookings,
        monthlyUsers,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        bookingsGrowth: Math.round(bookingsGrowth * 10) / 10,
        usersGrowth: Math.round(usersGrowth * 10) / 10,
        listingsGrowth: Math.round(listingsGrowth * 10) / 10,
        currentMonthRevenue: Math.round(currentMonthRevenue * 100) / 100,
        previousMonthRevenue: Math.round(previousMonthRevenue * 100) / 100,
        currentMonthBookings: currentMonthBookings.length,
        previousMonthBookings: previousMonthBookings.length,
        currentMonthUsers,
        previousMonthUsers,
        topPerformingHosts,
        bookingStatusDistribution
      });
    } catch (error) {
      console.error('Error calculating analytics:', error);
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
      // First, get all terminated host IDs
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const terminatedHostIds = new Set();
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.isTerminated) {
          terminatedHostIds.add(doc.id);
        }
      });
      
      // Get all listings and filter out those owned by terminated hosts
      const listingsSnapshot = await getDocs(collection(db, 'listings'));
      const terminatedListingIds = new Set();
      listingsSnapshot.forEach(doc => {
        const listing = doc.data();
        if (terminatedHostIds.has(listing.ownerId)) {
          terminatedListingIds.add(doc.id);
        }
      });
      
      const reviewsSnapshot = await getDocs(
        query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))
      );
      
      const reviewsList = [];
      reviewsSnapshot.forEach(docSnap => {
        const review = docSnap.data();
        // Skip reviews for listings owned by terminated hosts
        if (terminatedListingIds.has(review.listingId)) {
          return;
        }
        reviewsList.push({
          id: docSnap.id,
          ...review,
          createdAt: review.createdAt?.toDate ? review.createdAt.toDate() : new Date(review.createdAt)
        });
      });
      
      setReviews(reviewsList);
      
      // Separate best and lowest reviews (already filtered)
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

  // Calculate date range based on preset
  const getDateRangeFromPreset = (preset) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    switch (preset) {
      case '7days':
        startDate.setDate(today.getDate() - 7);
        return { startDate, endDate: today };
      case '30days':
        startDate.setDate(today.getDate() - 30);
        return { startDate, endDate: today };
      case '3months':
        startDate.setMonth(today.getMonth() - 3);
        return { startDate, endDate: today };
      case '6months':
        startDate.setMonth(today.getMonth() - 6);
        return { startDate, endDate: today };
      case '1year':
        startDate.setFullYear(today.getFullYear() - 1);
        return { startDate, endDate: today };
      case 'custom':
        // Use the dateRange state values
        if (dateRange.startDate && dateRange.endDate) {
          const start = new Date(dateRange.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(dateRange.endDate);
          end.setHours(23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
        return null;
      case 'all':
      default:
        return null; // No filter - all data
    }
  };

  const handlePreviewReportWithFilter = async (customDateFilter = null) => {
    if (isLoadingPreview || !selectedReportType) return;
    
    try {
      setIsLoadingPreview(true);
      
      // Use custom filter if provided, otherwise get from preset
      const dateFilter = customDateFilter || getDateRangeFromPreset(dateRangePreset);
      
      // Debug logging
      console.log('Preview Report - Date Filter:', {
        preset: dateRangePreset,
        dateRange: dateRange,
        customDateFilter: customDateFilter ? {
          startDate: customDateFilter.startDate?.toISOString(),
          endDate: customDateFilter.endDate?.toISOString()
        } : null,
        dateFilter: dateFilter ? {
          startDate: dateFilter.startDate?.toISOString(),
          endDate: dateFilter.endDate?.toISOString()
        } : null
      });

      const { getReportData } = await import('./services/reportService');
      const result = await getReportData(selectedReportType, dateFilter);
      
      console.log('Preview Report Result:', { selectedReportType, result });
      
      // Ensure data is an array
      const data = Array.isArray(result.data) ? result.data : (result.data || []);
      const headers = Array.isArray(result.headers) ? result.headers : [];
      
      console.log('Preview Data:', { dataLength: data.length, headersLength: headers.length, data: data.slice(0, 2) });
      
      setPreviewData(data);
      setPreviewHeaders(headers);
      setShowPreview(true);
      
      if (data.length === 0) {
        toast.info('No data found for the selected filters. Try adjusting your date range.');
      } else {
        toast.success(`Loaded ${data.length} records for preview`);
      }
    } catch (error) {
      console.error('Error previewing report:', error);
      toast.error(`Failed to preview ${selectedReportType} report: ${error.message}`);
      setPreviewData([]);
      setPreviewHeaders([]);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handlePreviewReport = async () => {
    return handlePreviewReportWithFilter(null);
  };

  const handleDownloadReport = async () => {
    if (generatingReport || !selectedReportType || !previewData) return;
    
    try {
      setGeneratingReport(true);
      setShowDateRangeModal(false);
      setShowPreview(false);
      
      const dateFilter = getDateRangeFromPreset(dateRangePreset);

      toast.info(`Generating ${selectedReportType} report... This may take a moment.`);
      const { generateReport: generateReportService } = await import('./services/reportService');
      await generateReportService(selectedReportType, dateFilter);
      toast.success(`${selectedReportType} report generated and downloaded successfully!`);
      
      // Reset everything after export
      setDateRange({ startDate: '', endDate: '' });
      setDateRangePreset('all');
      setPreviewData(null);
      setPreviewHeaders([]);
      setSelectedReportType(null);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(`Failed to generate ${selectedReportType} report: ${error.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleGenerateReport = async (useDateRange = false) => {
    if (generatingReport || !selectedReportType) return;
    
    try {
      setGeneratingReport(true);
      setShowDateRangeModal(false);
      setShowPreview(false);
      
      const dateFilter = useDateRange ? getDateRangeFromPreset(dateRangePreset) : null;

      toast.info(`Generating ${selectedReportType} report... This may take a moment.`);
      const { generateReport: generateReportService } = await import('./services/reportService');
      await generateReportService(selectedReportType, dateFilter);
      toast.success(`${selectedReportType} report generated and downloaded successfully!`);
      
      // Reset date range after export
      setDateRange({ startDate: '', endDate: '' });
      setDateRangePreset('all');
      setPreviewData(null);
      setPreviewHeaders([]);
      setSelectedReportType(null);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(`Failed to generate ${selectedReportType} report: ${error.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const generateReport = async (type) => {
    if (generatingReport) return;
    setSelectedReportType(type);
    setDateRange({ startDate: '', endDate: '' });
    setPreviewData(null);
    setPreviewHeaders([]);
    setShowPreview(false);
    setShowDateRangeModal(true);
  };

  // Auto-load preview when modal opens
  useEffect(() => {
    if (showDateRangeModal && selectedReportType && !isLoadingPreview && previewData === null) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        handlePreviewReport();
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDateRangeModal, selectedReportType]);

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

  // Print functionality
  const handlePrintClick = (section) => {
    setPrintSection(section);
    setPrintDateRange({ startDate: '', endDate: '' });
    setPrintDateRangePreset('all');
    setShowPrintModal(true);
  };

  // Get date range for print from preset
  const getPrintDateRangeFromPreset = (preset) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    switch (preset) {
      case '7days':
        startDate.setDate(today.getDate() - 7);
        return { startDate, endDate: today };
      case '30days':
        startDate.setDate(today.getDate() - 30);
        return { startDate, endDate: today };
      case '3months':
        startDate.setMonth(today.getMonth() - 3);
        return { startDate, endDate: today };
      case '6months':
        startDate.setMonth(today.getMonth() - 6);
        return { startDate, endDate: today };
      case '1year':
        startDate.setFullYear(today.getFullYear() - 1);
        return { startDate, endDate: today };
      case 'custom':
        if (printDateRange.startDate && printDateRange.endDate) {
          const start = new Date(printDateRange.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(printDateRange.endDate);
          end.setHours(23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
        return null;
      case 'all':
      default:
        return null;
    }
  };

  const handlePrint = async () => {
    if (!printSection) return;
    
    try {
      setIsPrinting(true);
      
      // Create a print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print');
        setIsPrinting(false);
        return;
      }

      // Get filtered data based on section
      let printContent = '';
      let title = '';
      
      const dateFilter = getPrintDateRangeFromPreset(printDateRangePreset);

      switch (printSection) {
        case 'overview':
          title = 'Dashboard Overview Report';
          printContent = generateOverviewPrintContent(stats, analytics, bookings, reviews, dateFilter);
          break;
        case 'transactions':
          title = 'All Transactions Report';
          printContent = generateTransactionsPrintContent(allMoneyTransactions, dateFilter);
          break;
        case 'service-fees':
          title = 'Service Fees Report';
          // Generate service fees content asynchronously
          const serviceFeesContent = await generateServiceFeesPrintContent(serviceFeesFilter, dateFilter);
          printContent = serviceFeesContent;
          break;
        case 'host-management':
          title = 'Host Management Report';
          printContent = generateHostManagementPrintContent(hosts, dateFilter);
          break;
        case 'compliance':
          title = 'Policies & Compliance Report';
          printContent = '<div class="print-section"><div class="print-section-title">Policies & Compliance</div><p>Policy data will be included here based on current filters.</p></div>';
          break;
        case 'reports':
          title = 'Reports Summary';
          const availableReports = [
            { id: 'financial', label: 'Financial Report', description: 'Revenue, fees, and payment analytics' },
            { id: 'bookings', label: 'Bookings Report', description: 'Complete booking history and statistics' },
            { id: 'users', label: 'Users Report', description: 'User growth and activity metrics' },
            { id: 'reviews', label: 'Reviews Report', description: 'Review analysis and ratings breakdown' },
            { id: 'hosts', label: 'Hosts Report', description: 'Host performance and earnings' },
            { id: 'compliance', label: 'Compliance Report', description: 'Policy violations and compliance status' }
          ];
          
          // Filter reports based on reportsFilter
          let filteredReports = availableReports.filter(report => {
            if (reportsFilter.search) {
              const searchLower = reportsFilter.search.toLowerCase();
              if (!report.label.toLowerCase().includes(searchLower) &&
                  !report.description.toLowerCase().includes(searchLower)) {
                return false;
              }
            }
            if (reportsFilter.type !== 'all' && report.id !== reportsFilter.type) {
              return false;
            }
            return true;
          });
          
          printContent = `
            <div class="print-section">
              <div class="print-section-title">Available Reports (${filteredReports.length})</div>
              <table>
                <thead>
                  <tr>
                    <th>Report Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredReports.map(report => `
                    <tr>
                      <td><strong>${report.label}</strong></td>
                      <td>${report.description}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                <strong>Note:</strong> To generate a specific report, use the Preview button on the report card, 
                select a date range (optional), preview the data, and then download as PDF.
              </p>
            </div>
          `;
          break;
        default:
          title = 'Report';
          printContent = '<p>No content available</p>';
      }

      // Write print content
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              @media print {
                @page { margin: 1cm; }
                body { margin: 0; }
              }
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                color: #333;
              }
              .print-header {
                border-bottom: 2px solid #333;
                padding-bottom: 10px;
                margin-bottom: 20px;
              }
              .print-title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .print-date-range {
                font-size: 12px;
                color: #666;
                margin-bottom: 10px;
              }
              .print-date {
                font-size: 12px;
                color: #666;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
              }
              th {
                background-color: #f2f2f2;
                font-weight: bold;
              }
              .print-section {
                margin: 20px 0;
                page-break-inside: avoid;
              }
              .print-section-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
                border-bottom: 1px solid #ccc;
                padding-bottom: 5px;
              }
              .print-stat {
                display: inline-block;
                margin: 10px 20px 10px 0;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
              }
              .print-stat-label {
                font-size: 12px;
                color: #666;
              }
              .print-stat-value {
                font-size: 20px;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="print-header">
              <div class="print-title">${title}</div>
              ${dateFilter ? `<div class="print-date-range">Date Range: ${dateFilter.startDate.toLocaleDateString()} - ${dateFilter.endDate.toLocaleDateString()}</div>` : '<div class="print-date-range">All Time</div>'}
              <div class="print-date">Generated: ${new Date().toLocaleString()}</div>
            </div>
            ${printContent}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setIsPrinting(false);
        setShowPrintModal(false);
        toast.success('Print dialog opened');
      }, 250);
      
    } catch (error) {
      console.error('Error printing:', error);
      toast.error('Failed to print: ' + error.message);
      setIsPrinting(false);
    }
  };

  // Preview functionality
  const handlePreviewClick = (section) => {
    setPreviewSection(section);
    setShowSectionPreview(true);
  };

  const getPreviewData = (section) => {
    switch (section) {
      case 'overview':
        return {
          title: 'Dashboard Overview',
          data: {
            stats,
            analytics,
            bookings: bookings.filter(b => {
              if (overviewFilter.dateRange.startDate || overviewFilter.dateRange.endDate) {
                const date = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                const startDate = overviewFilter.dateRange.startDate ? new Date(overviewFilter.dateRange.startDate) : null;
                const endDate = overviewFilter.dateRange.endDate ? new Date(overviewFilter.dateRange.endDate) : null;
                if (startDate && date < startDate) return false;
                if (endDate && date > endDate) return false;
              }
              if (overviewFilter.search) {
                const searchLower = overviewFilter.search.toLowerCase();
                const searchableText = [
                  b.listingTitle || '',
                  b.guestName || '',
                  b.hostName || '',
                  b.id || ''
                ].join(' ').toLowerCase();
                if (!searchableText.includes(searchLower)) return false;
              }
              if (overviewFilter.category !== 'all' && overviewFilter.category !== 'bookings') return false;
              return true;
            }),
            reviews: reviews.filter(r => {
              if (overviewFilter.dateRange.startDate || overviewFilter.dateRange.endDate) {
                const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                const startDate = overviewFilter.dateRange.startDate ? new Date(overviewFilter.dateRange.startDate) : null;
                const endDate = overviewFilter.dateRange.endDate ? new Date(overviewFilter.dateRange.endDate) : null;
                if (startDate && date < startDate) return false;
                if (endDate && date > endDate) return false;
              }
              if (overviewFilter.search) {
                const searchLower = overviewFilter.search.toLowerCase();
                const searchableText = [
                  r.listingTitle || '',
                  r.guestName || '',
                  r.comment || ''
                ].join(' ').toLowerCase();
                if (!searchableText.includes(searchLower)) return false;
              }
              if (overviewFilter.category !== 'all' && overviewFilter.category !== 'reviews') return false;
              return true;
            })
          }
        };
      case 'transactions':
        let filteredTransactions = allMoneyTransactions.filter(transaction => {
          if (transactionsFilter.search) {
            const searchLower = transactionsFilter.search.toLowerCase();
            const searchableText = [
              transaction.userName || '',
              transaction.userEmail || '',
              transaction.description || '',
              transaction.id || '',
              transaction.metadata?.bookingId || ''
            ].join(' ').toLowerCase();
            if (!searchableText.includes(searchLower)) return false;
          }
          if (transactionsFilter.type !== 'all') {
            if (transactionsFilter.type === 'subscription') {
              if (transaction.metadata?.paymentType !== 'subscription_payment') return false;
            } else if (transactionsFilter.type === 'credit' && transaction.type !== 'credit') {
              return false;
            } else if (transactionsFilter.type === 'debit') {
              // Debits are transactions with type 'payment' or 'cash_out'
              if (transaction.type !== 'payment' && transaction.type !== 'cash_out') {
                return false;
              }
            }
          }
          if (transactionsFilter.dateRange.startDate || transactionsFilter.dateRange.endDate) {
            const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date || transaction.createdAt);
            const startDate = transactionsFilter.dateRange.startDate ? new Date(transactionsFilter.dateRange.startDate) : null;
            const endDate = transactionsFilter.dateRange.endDate ? new Date(transactionsFilter.dateRange.endDate) : null;
            if (startDate) {
              startDate.setHours(0, 0, 0, 0);
              if (date < startDate) return false;
            }
            if (endDate) {
              endDate.setHours(23, 59, 59, 999);
              if (date > endDate) return false;
            }
          }
          return true;
        });
        return {
          title: 'Transactions Preview',
          data: filteredTransactions
        };
      case 'service-fees':
        // Filter hosts by search
        let filteredServiceHosts = hosts.filter(host => {
          if (serviceFeesFilter.search) {
            const searchLower = serviceFeesFilter.search.toLowerCase();
            if (!host.name?.toLowerCase().includes(searchLower) &&
                !host.email?.toLowerCase().includes(searchLower)) {
              return false;
            }
          }
          return true;
        });
        
        // Filter transactions by search and date range
        let filteredServiceTransactions = (subscriptionTransactions || []).filter(t => {
          // Apply search filter
          if (serviceFeesFilter.search) {
            const searchLower = serviceFeesFilter.search.toLowerCase();
            const hostEmail = (t.metadata?.hostEmail || '').toLowerCase();
            const hostName = (t.metadata?.hostName || '').toLowerCase();
            if (!hostEmail.includes(searchLower) && !hostName.includes(searchLower)) {
              return false;
            }
          }
          
          // Apply date range filter if provided
          if (serviceFeesFilter.dateRange?.startDate || serviceFeesFilter.dateRange?.endDate) {
            if (!t.date && !t.createdAt) return false;
            const date = t.date instanceof Date ? t.date : new Date(t.date || t.createdAt);
            if (isNaN(date.getTime())) return false;
            
            if (serviceFeesFilter.dateRange.startDate) {
              const startDate = new Date(serviceFeesFilter.dateRange.startDate);
              startDate.setHours(0, 0, 0, 0);
              if (date < startDate) return false;
            }
            if (serviceFeesFilter.dateRange.endDate) {
              const endDate = new Date(serviceFeesFilter.dateRange.endDate);
              endDate.setHours(23, 59, 59, 999);
              if (date > endDate) return false;
            }
          }
          
          return true;
        });
        
        return {
          title: 'Service Fees Preview',
          data: {
            hosts: filteredServiceHosts,
            transactions: filteredServiceTransactions
          }
        };
      case 'host-management':
        let filteredHosts = hosts.filter(host => {
          if (hostManagementFilter.search) {
            const searchLower = hostManagementFilter.search.toLowerCase();
            if (!host.name.toLowerCase().includes(searchLower) &&
                !host.email.toLowerCase().includes(searchLower)) {
              return false;
            }
          }
          if (hostManagementFilter.status !== 'all') {
            if (hostManagementFilter.status === 'terminated' && !host.isTerminated) return false;
            if (hostManagementFilter.status === 'active' && host.isTerminated) return false;
          }
          return true;
        });
        return {
          title: 'Host Management Preview',
          data: filteredHosts
        };
      case 'compliance':
        // Note: Policies are loaded in PolicyManagement component
        // This will show a message that policies can be previewed
        return {
          title: 'Policies & Compliance Preview',
          data: { message: 'Use the search filter above to filter policies, then preview will show filtered results.' }
        };
      case 'reports':
        // Show available report types with their descriptions
        const availableReports = [
          { 
            id: 'financial', 
            label: 'Financial Report', 
            description: 'Revenue, fees, and payment analytics',
            icon: '💰'
          },
          { 
            id: 'bookings', 
            label: 'Bookings Report', 
            description: 'Complete booking history and statistics',
            icon: '📅'
          },
          { 
            id: 'users', 
            label: 'Users Report', 
            description: 'User growth and activity metrics',
            icon: '👥'
          },
          { 
            id: 'reviews', 
            label: 'Reviews Report', 
            description: 'Review analysis and ratings breakdown',
            icon: '⭐'
          },
          { 
            id: 'hosts', 
            label: 'Hosts Report', 
            description: 'Host performance and earnings',
            icon: '🏠'
          },
          { 
            id: 'compliance', 
            label: 'Compliance Report', 
            description: 'Policy violations and compliance status',
            icon: '🛡️'
          }
        ];
        
        // Filter reports based on reportsFilter
        let filteredReports = availableReports.filter(report => {
          if (reportsFilter.search) {
            const searchLower = reportsFilter.search.toLowerCase();
            if (!report.label.toLowerCase().includes(searchLower) &&
                !report.description.toLowerCase().includes(searchLower)) {
              return false;
            }
          }
          if (reportsFilter.type !== 'all' && report.id !== reportsFilter.type) {
            return false;
          }
          return true;
        });
        
        return {
          title: 'Available Reports Preview',
          data: filteredReports
        };
      default:
        return { title: 'Preview', data: [] };
    }
  };

  // Generate print content functions
  const generateOverviewPrintContent = (stats, analytics, bookings, reviews, dateFilter) => {
    let filteredBookings = bookings || [];
    let filteredReviews = reviews || [];
    
    // Normalize date filter dates
    let normalizedStartDate = null;
    let normalizedEndDate = null;
    
    if (dateFilter && dateFilter.startDate && dateFilter.endDate) {
      normalizedStartDate = new Date(dateFilter.startDate);
      normalizedStartDate.setHours(0, 0, 0, 0);
      
      normalizedEndDate = new Date(dateFilter.endDate);
      normalizedEndDate.setHours(23, 59, 59, 999);
      
      // Filter bookings
      filteredBookings = (bookings || []).filter(b => {
        if (!b.createdAt) return false;
        const date = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        if (isNaN(date.getTime())) return false;
        return date >= normalizedStartDate && date <= normalizedEndDate;
      });
      
      // Filter reviews
      filteredReviews = (reviews || []).filter(r => {
        if (!r.createdAt) return false;
        const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
        if (isNaN(date.getTime())) return false;
        return date >= normalizedStartDate && date <= normalizedEndDate;
      });
    }

    // Recalculate stats based on filtered data
    const filteredStats = {
      totalBookings: filteredBookings.length,
      totalReviews: filteredReviews.length,
      totalUsers: stats.totalUsers, // Users count doesn't change with date filter
      activeListings: stats.activeListings, // Listings count doesn't change with date filter
      // Calculate earnings from filtered bookings
      serviceFees: filteredBookings.reduce((sum, b) => {
        const amount = b.bookingAmount || b.totalPrice || 0;
        return sum + (amount * 0.10); // 10% commission
      }, 0),
      subscriptionRevenue: stats.subscriptionRevenue || 0 // Subscription revenue calculation would need date filtering separately
    };

    // Calculate total revenue from filtered bookings
    const totalRevenue = filteredBookings.reduce((sum, b) => {
      return sum + (b.bookingAmount || b.totalPrice || 0);
    }, 0);

    return `
      <div class="print-section">
        <div class="print-section-title">Key Statistics${dateFilter && dateFilter.startDate && dateFilter.endDate ? ` (${normalizedStartDate.toLocaleDateString()} - ${normalizedEndDate.toLocaleDateString()})` : ''}</div>
        <div class="print-stat">
          <div class="print-stat-label">Total Admin Earnings</div>
          <div class="print-stat-value">${formatCurrency(filteredStats.serviceFees + (filteredStats.subscriptionRevenue || 0))}</div>
        </div>
        <div class="print-stat">
          <div class="print-stat-label">Total Users</div>
          <div class="print-stat-value">${filteredStats.totalUsers}</div>
        </div>
        <div class="print-stat">
          <div class="print-stat-label">Active Listings</div>
          <div class="print-stat-value">${filteredStats.activeListings}</div>
        </div>
        <div class="print-stat">
          <div class="print-stat-label">Total Bookings</div>
          <div class="print-stat-value">${filteredStats.totalBookings}</div>
        </div>
        <div class="print-stat">
          <div class="print-stat-label">Total Reviews</div>
          <div class="print-stat-value">${filteredStats.totalReviews}</div>
        </div>
        <div class="print-stat">
          <div class="print-stat-label">Total Revenue</div>
          <div class="print-stat-value">${formatCurrency(totalRevenue)}</div>
        </div>
      </div>
      
      <div class="print-section">
        <div class="print-section-title">Recent Bookings (${filteredBookings.length})</div>
        ${filteredBookings.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Guest</th>
              <th>Host</th>
              <th>Listing</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBookings.slice(0, 50).map(booking => `
              <tr>
                <td>${booking.id ? booking.id.substring(0, 8) + '...' : 'N/A'}</td>
                <td>${booking.guestName || 'N/A'}</td>
                <td>${booking.hostName || 'N/A'}</td>
                <td>${booking.listingTitle || 'N/A'}</td>
                <td>${formatDate(booking.checkIn)}</td>
                <td>${formatDate(booking.checkOut)}</td>
                <td>${formatCurrency(booking.bookingAmount || booking.totalPrice || 0)}</td>
                <td>${booking.status || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p>No bookings found in the selected date range.</p>'}
      </div>
      
      ${filteredReviews.length > 0 ? `
      <div class="print-section">
        <div class="print-section-title">Recent Reviews (${filteredReviews.length})</div>
        <table>
          <thead>
            <tr>
              <th>Listing</th>
              <th>Reviewer</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${filteredReviews.slice(0, 50).map(review => `
              <tr>
                <td>${review.listingTitle || 'N/A'}</td>
                <td>${review.reviewerName || 'Anonymous'}</td>
                <td>${review.rating || 'N/A'}</td>
                <td>${(review.comment || '').substring(0, 50)}${(review.comment || '').length > 50 ? '...' : ''}</td>
                <td>${formatDate(review.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    `;
  };

  const generateTransactionsPrintContent = (transactions, dateFilter) => {
    let filtered = transactions;
    
    if (dateFilter && dateFilter.startDate && dateFilter.endDate) {
      filtered = transactions.filter(t => {
        if (!t.date && !t.createdAt) return false;
        const date = t.date instanceof Date ? t.date : new Date(t.date || t.createdAt);
        if (isNaN(date.getTime())) return false;
        return date >= dateFilter.startDate && date <= dateFilter.endDate;
      });
    }

    return `
      <div class="print-section">
        <div class="print-section-title">All Transactions (${filtered.length})</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
              <th>User</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(t => `
              <tr>
                <td>${formatDate(t.date)}</td>
                <td>${t.type}</td>
                <td>${t.description || 'N/A'}</td>
                <td>${formatCurrency(t.amount || 0)}</td>
                <td>${t.userName || t.userEmail || 'N/A'}</td>
                <td>${t.status || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };


  const generateServiceFeesPrintContent = async (filters, dateFilter) => {
    try {
      // Use the report service to get accurate filtered data based on date range
      const { generateServiceFeesReport } = await import('./services/reportService');
      const hostsData = await generateServiceFeesReport(dateFilter);
      
      // Apply search filter if provided
      let filteredHosts = hostsData;
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredHosts = filteredHosts.filter(host => 
          (host.hostName || '').toLowerCase().includes(searchLower) ||
          (host.hostEmail || '').toLowerCase().includes(searchLower) ||
          (host.hostPhone || '').toLowerCase().includes(searchLower)
        );
      }
      
      // Filter subscription transactions if date filter is provided
      let filteredTransactions = subscriptionTransactions || [];
      if (dateFilter && dateFilter.startDate && dateFilter.endDate && subscriptionTransactions) {
        filteredTransactions = subscriptionTransactions.filter(t => {
          if (!t.date && !t.createdAt) return false;
          const date = t.date instanceof Date ? t.date : new Date(t.date || t.createdAt);
          if (isNaN(date.getTime())) return false;
          return date >= dateFilter.startDate && date <= dateFilter.endDate;
        });
      } else if (filters?.search && subscriptionTransactions) {
        const searchLower = filters.search.toLowerCase();
        filteredTransactions = subscriptionTransactions.filter(t => {
          const hostEmail = (t.metadata?.hostEmail || '').toLowerCase();
          const hostName = (t.metadata?.hostName || '').toLowerCase();
          return hostEmail.includes(searchLower) || hostName.includes(searchLower);
        });
      }

      return `
        <div class="print-section">
          <div class="print-section-title">Service Fees Report - Hosts (${filteredHosts.length})</div>
          <table>
            <thead>
              <tr>
                <th>Host Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Total Bookings</th>
                <th>Total Earnings</th>
                <th>Service Fee (10%)</th>
                <th>Host Earnings (90%)</th>
              </tr>
            </thead>
            <tbody>
              ${filteredHosts.map(h => `
                <tr>
                  <td>${h.hostName || 'N/A'}</td>
                  <td>${h.hostEmail || 'N/A'}</td>
                  <td>${h.hostPhone || 'N/A'}</td>
                  <td>${h.totalBookings || 0}</td>
                  <td>${formatCurrency(h.totalEarnings || 0)}</td>
                  <td>${formatCurrency(h.serviceFee || 0)}</td>
                  <td>${formatCurrency(h.hostEarnings || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${filteredTransactions.length > 0 ? `
        <div class="print-section">
          <div class="print-section-title">Subscription Transactions (${filteredTransactions.length})</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Host</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map(t => `
                <tr>
                  <td>${formatDate(t.date || t.createdAt)}</td>
                  <td>${t.metadata?.hostName || t.metadata?.hostEmail || 'N/A'}</td>
                  <td>${t.metadata?.subscriptionType || 'Subscription'}</td>
                  <td>${formatCurrency(t.amount || 0)}</td>
                  <td>${t.status || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      `;
    } catch (error) {
      console.error('Error generating service fees print content:', error);
      // Fallback to using local hosts data if service fails
      let filteredHosts = hosts;
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredHosts = filteredHosts.filter(host => 
          (host.name || '').toLowerCase().includes(searchLower) ||
          (host.email || '').toLowerCase().includes(searchLower)
        );
      }
      
      return `
        <div class="print-section">
          <div class="print-section-title">Service Fees Report - Hosts (${filteredHosts.length})</div>
          <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Note: Using cached data. For date-filtered reports, use the Export Report button.</p>
          <table>
            <thead>
              <tr>
                <th>Host Name</th>
                <th>Email</th>
                <th>Total Bookings</th>
                <th>Total Earnings</th>
                <th>Service Fee (10%)</th>
                <th>Host Earnings (90%)</th>
              </tr>
            </thead>
            <tbody>
              ${filteredHosts.map(h => {
                const serviceFee = Math.round((h.earnings || 0) * 0.10 * 100) / 100;
                const hostEarnings = Math.round((h.earnings || 0) * 0.90 * 100) / 100;
                return `
                  <tr>
                    <td>${h.name || 'N/A'}</td>
                    <td>${h.email || 'N/A'}</td>
                    <td>${h.bookings || 0}</td>
                    <td>${formatCurrency(h.earnings || 0)}</td>
                    <td>${formatCurrency(serviceFee)}</td>
                    <td>${formatCurrency(hostEarnings)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  };

  const generateHostManagementPrintContent = (hosts, dateFilter) => {
    let filtered = hosts;
    
    if (dateFilter && dateFilter.startDate && dateFilter.endDate) {
      filtered = hosts.filter(h => {
        // For host management, filter by host creation date or first booking date
        if (h.createdAt) {
          const date = h.createdAt?.toDate ? h.createdAt.toDate() : new Date(h.createdAt);
          if (!isNaN(date.getTime())) {
            return date >= dateFilter.startDate && date <= dateFilter.endDate;
          }
        }
        // If no createdAt, include if they have bookings in the date range
        // For now, include all hosts if no date field
        return true;
      });
    }

    return `
      <div class="print-section">
        <div class="print-section-title">Host Management Report (${filtered.length})</div>
        <table>
          <thead>
            <tr>
              <th>Host Name</th>
              <th>Email</th>
              <th>Listings</th>
              <th>Bookings</th>
              <th>Total Earnings</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(h => `
              <tr>
                <td>${h.name || 'N/A'}</td>
                <td>${h.email || 'N/A'}</td>
                <td>${h.listings || h.listingsCount || 0}</td>
                <td>${h.bookings || h.bookingsCount || 0}</td>
                <td>${formatCurrency(h.earnings || h.totalEarnings || 0)}</td>
                <td>${h.isTerminated ? 'Terminated' : 'Active'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
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
      
      {/* Cash Out Request Review Modal */}
      <AlertDialog open={showCashOutRequestModal} onOpenChange={setShowCashOutRequestModal}>
        <AlertDialogContent className="bg-white max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              Review Cash Out Request
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Review the cash out request and approve or reject it. Money will only be deducted from the user's wallet upon approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {selectedCashOutRequest && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-600">User</p>
                    <p className="font-semibold text-foreground">{selectedCashOutRequest.userName || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{selectedCashOutRequest.userEmail || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="text-2xl font-bold text-primary">₱{selectedCashOutRequest.amount?.toLocaleString() || '0'}</p>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">PayPal Email</p>
                  <p className="font-medium text-foreground">{selectedCashOutRequest.paypalEmail || 'N/A'}</p>
                </div>
                
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Current Wallet Balance</p>
                  <p className="font-medium text-foreground">₱{selectedCashOutRequest.balanceBefore?.toLocaleString() || '0'}</p>
                </div>
                
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Requested On</p>
                  <p className="font-medium text-foreground">
                    {selectedCashOutRequest.createdAt ? formatDate(selectedCashOutRequest.createdAt) : 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="adminNotes" className="text-foreground font-semibold">
                  Admin Notes {selectedCashOutRequest.status === 'pending' && <span className="text-red-500">*</span>}
                </Label>
                <textarea
                  id="adminNotes"
                  value={cashOutAdminNotes}
                  onChange={(e) => setCashOutAdminNotes(e.target.value)}
                  placeholder={selectedCashOutRequest.status === 'pending' ? 'Add notes (required for rejection, optional for approval)...' : 'Add notes...'}
                  className="mt-2 w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary min-h-[100px]"
                  required={selectedCashOutRequest.status === 'pending'}
                />
                {selectedCashOutRequest.status === 'pending' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Notes are required when rejecting a request. Optional for approval.
                  </p>
                )}
              </div>
            </div>
          )}

          <AlertDialogFooter className="gap-2 mt-6">
            <AlertDialogCancel 
              onClick={() => {
                setShowCashOutRequestModal(false);
                setSelectedCashOutRequest(null);
                setCashOutAdminNotes('');
              }}
            >
              Cancel
            </AlertDialogCancel>
            {selectedCashOutRequest && selectedCashOutRequest.status === 'pending' && (
              <>
                <AlertDialogAction
                  onClick={handleRejectCashOut}
                  disabled={processingCashOutRequest || !cashOutAdminNotes.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {processingCashOutRequest ? 'Rejecting...' : 'Reject Request'}
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={handleApproveCashOut}
                  disabled={processingCashOutRequest}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {processingCashOutRequest ? 'Approving...' : 'Approve & Process'}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                { id: 'service-fees', label: 'Service Fees', icon: DollarSign, description: 'Platform fees' },
                { id: 'host-management', label: 'Host Management', icon: Users, description: 'Manage hosts and listings' },
                { id: 'platform-settings', label: 'Platform Settings', icon: Settings, description: 'Payment methods & settings' },
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
          {/* Dashboard Cards Container - Only show on overview */}
          {activeTab === 'overview' && (
          <div className="max-w-7xl mx-auto px-6 pt-8 mb-6">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                  <div>
                  <h1 className="font-heading text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                      Admin Dashboard
                    </h1>
                  <p className="text-muted-foreground text-base">
                    Comprehensive insights and controls for your Getaways platform
                    </p>
                  </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handlePreviewClick('overview')}
                    className="btn-outline flex items-center gap-2"
                    title="Preview Overview"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    onClick={() => handlePrintClick('overview')}
                    className="btn-outline flex items-center gap-2"
                    title="Print Overview"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={loadDashboardData}
                    className="btn-outline flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
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

            {/* Search and Filter Controls */}
            <div className="mb-6 space-y-4">
              <div className="flex gap-4 flex-wrap items-center">
                <div className="flex-1 min-w-[250px]">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search bookings, reviews, users..."
                      value={overviewFilter.search}
                      onChange={(e) => setOverviewFilter(prev => ({ ...prev, search: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                <select
                  value={overviewFilter.category}
                  onChange={(e) => setOverviewFilter(prev => ({ ...prev, category: e.target.value }))}
                  className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Categories</option>
                  <option value="bookings">Bookings</option>
                  <option value="reviews">Reviews</option>
                  <option value="users">Users</option>
                  <option value="revenue">Revenue</option>
                </select>
                <div className="flex gap-2 items-center">
                  <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Date Range:</label>
                  <input
                    type="date"
                    value={overviewFilter.dateRange.startDate}
                    onChange={(e) => setOverviewFilter(prev => ({ ...prev, dateRange: { ...prev.dateRange, startDate: e.target.value } }))}
                    className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="date"
                    value={overviewFilter.dateRange.endDate}
                    onChange={(e) => setOverviewFilter(prev => ({ ...prev, dateRange: { ...prev.dateRange, endDate: e.target.value } }))}
                    className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                    min={overviewFilter.dateRange.startDate}
                  />
                </div>
                {(overviewFilter.search || overviewFilter.category !== 'all' || overviewFilter.dateRange.startDate || overviewFilter.dateRange.endDate) && (
                  <button
                    onClick={() => setOverviewFilter({ search: '', dateRange: { startDate: '', endDate: '' }, category: 'all' })}
                    className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Main Stats Cards - Enhanced Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Admin Earnings */}
              <div 
                className="card-listing p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden"
                  onClick={async () => {
                    setShowTotalEarningsModal(true);
                    await Promise.all([loadCommissionTransactions(), loadAllUsers()]);
                  }}
                >
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                    <Eye className="w-5 h-5 text-green-600 opacity-60" />
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-2xl font-bold text-green-900">
                          {formatCurrency((stats.serviceFees || 0) + (stats.subscriptionRevenue || 0))}
                        </h3>
                    {analytics.revenueGrowth !== 0 && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        analytics.revenueGrowth >= 0 
                          ? 'bg-green-200 text-green-800' 
                          : 'bg-red-200 text-red-800'
                      }`}>
                        {analytics.revenueGrowth >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{Math.abs(analytics.revenueGrowth)}%</span>
                      </div>
                    )}
                    </div>
                  <p className="text-green-700 font-semibold text-sm mb-3">Total Admin Earnings</p>
                  <div className="space-y-1 pt-3 border-t border-green-300/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-700">Commission</span>
                      <span className="font-bold text-green-900">{formatCurrency(stats.serviceFees || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-700">Subscriptions</span>
                      <span className="font-bold text-green-900">{formatCurrency(stats.subscriptionRevenue || 0)}</span>
                    </div>
                    </div>
                  </div>
                </div>

              {/* Total Users */}
              <div 
                className="card-listing p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden"
                onClick={async () => {
                  setShowUsersModal(true);
                  await loadAllUsers();
                }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <Eye className="w-5 h-5 text-blue-600 opacity-60" />
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-2xl font-bold text-blue-900">
                      {stats.totalUsers.toLocaleString()}
                    </h3>
                    {analytics.usersGrowth !== 0 && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        analytics.usersGrowth >= 0 
                          ? 'bg-blue-200 text-blue-800' 
                          : 'bg-red-200 text-red-800'
                      }`}>
                        {analytics.usersGrowth >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{Math.abs(analytics.usersGrowth)}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-blue-700 font-semibold text-sm mb-3">Total Users</p>
                  <div className="flex items-center gap-2 text-xs text-blue-700 pt-3 border-t border-blue-300/50">
                    <Users className="w-3 h-3" />
                    <span>Platform members</span>
                  </div>
                </div>
              </div>

              {/* Active Listings */}
              <div 
                className="card-listing p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden"
                onClick={async () => {
                  setShowListingsModal(true);
                  await loadAllListings();
                }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/30 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Home className="w-6 h-6 text-white" />
                    </div>
                    <Eye className="w-5 h-5 text-purple-600 opacity-60" />
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-2xl font-bold text-purple-900">
                      {stats.activeListings.toLocaleString()}
                    </h3>
                    {analytics.listingsGrowth !== 0 && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        analytics.listingsGrowth >= 0 
                          ? 'bg-purple-200 text-purple-800' 
                          : 'bg-red-200 text-red-800'
                      }`}>
                        {analytics.listingsGrowth >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{Math.abs(analytics.listingsGrowth)}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-purple-700 font-semibold text-sm mb-3">Active Listings</p>
                  <div className="flex items-center gap-2 text-xs text-purple-700 pt-3 border-t border-purple-300/50">
                    <Home className="w-3 h-3" />
                    <span>Available properties</span>
                  </div>
                </div>
              </div>

              {/* Total Bookings */}
              <div 
                className="card-listing p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden"
                onClick={() => {
                  setShowBookingsModal(true);
                }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/30 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <Eye className="w-5 h-5 text-orange-600 opacity-60" />
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-2xl font-bold text-orange-900">
                      {stats.totalBookings.toLocaleString()}
                    </h3>
                    {analytics.bookingsGrowth !== 0 && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        analytics.bookingsGrowth >= 0 
                          ? 'bg-orange-200 text-orange-800' 
                          : 'bg-red-200 text-red-800'
                      }`}>
                        {analytics.bookingsGrowth >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{Math.abs(analytics.bookingsGrowth)}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-orange-700 font-semibold text-sm mb-3">Total Bookings</p>
                  <div className="flex items-center gap-2 text-xs text-orange-700 pt-3 border-t border-orange-300/50">
                    <Calendar className="w-3 h-3" />
                    <span>All time bookings</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Total Revenue */}
              <div 
                className="card-listing p-5 bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-300 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all"
                onClick={() => {
                  setActiveTab('transactions');
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                    </div>
                  <Eye className="w-4 h-4 text-indigo-600 opacity-60" />
                  </div>
                <h3 className="text-xl font-bold text-indigo-900 mb-1">
                  {formatCurrency(stats.totalRevenue || 0)}
                  </h3>
                <p className="text-indigo-700 text-sm font-medium mb-2">Total Revenue</p>
                <div className="flex items-center gap-2 text-xs text-indigo-700 pt-2 border-t border-indigo-300/50">
                  <span className="px-2 py-1 bg-indigo-200 rounded-full font-semibold">
                    All transactions
                  </span>
                </div>
              </div>

              {/* Service Fees */}
              <div 
                className="card-listing p-5 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all"
                onClick={() => {
                  setActiveTab('service-fees');
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                  <Eye className="w-4 h-4 text-green-600 opacity-60" />
                  </div>
                <h3 className="text-xl font-bold text-green-900 mb-1">
                  {formatCurrency(stats.serviceFees || 0)}
                  </h3>
                <p className="text-green-700 text-sm font-medium mb-2">Service Fees (10% Commission)</p>
                <div className="flex items-center gap-2 text-xs text-green-700 pt-2 border-t border-green-300/50">
                  <span className="px-2 py-1 bg-green-200 rounded-full font-semibold">
                    From bookings
                  </span>
                </div>
              </div>
                </div>

            {/* Comprehensive Trends and Analytics Section */}
            <div className="space-y-6 mb-6">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground">Trends & Analytics</h2>
                    <p className="text-sm text-muted-foreground">Comprehensive performance insights and metrics</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePrintClick('overview')}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                  title="Print Overview"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>
              </div>

              {/* Key Performance Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card-listing p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-green-700 uppercase">Avg Booking Value</span>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-xl font-bold text-green-900">
                    {analytics.currentMonthBookings > 0 
                      ? formatCurrency(analytics.currentMonthRevenue / analytics.currentMonthBookings)
                      : formatCurrency(0)}
                  </p>
                  <p className="text-xs text-green-700 mt-1">Per booking this month</p>
                </div>
                <div className="card-listing p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-700 uppercase">Completion Rate</span>
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xl font-bold text-blue-900">
                    {stats.totalBookings > 0 
                      ? ((analytics.bookingStatusDistribution?.completed || 0) / stats.totalBookings * 100).toFixed(1)
                      : '0.0'}%
                  </p>
                  <p className="text-xs text-blue-700 mt-1">Completed bookings</p>
                </div>
                <div className="card-listing p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-700 uppercase">Active Hosts</span>
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-xl font-bold text-purple-900">
                    {analytics.topPerformingHosts?.length || 0}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">With bookings this month</p>
                </div>
                <div className="card-listing p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-orange-700 uppercase">Cancel Rate</span>
                    <XCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <p className="text-xl font-bold text-orange-900">
                    {stats.totalBookings > 0 
                      ? ((analytics.bookingStatusDistribution?.cancelled || 0) / stats.totalBookings * 100).toFixed(1)
                      : '0.0'}%
                  </p>
                  <p className="text-xs text-orange-700 mt-1">Cancellation rate</p>
                </div>
              </div>

              {/* Main Comprehensive Charts */}
              <div className="card-listing p-6 border-2 border-border">

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Monthly Performance Trends (Last 6 Months)
                  </h3>
                  
                  {/* Monthly Trends Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Trend */}
                <div className="space-y-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-700">Monthly Revenue</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">
                        {formatCurrency(analytics.currentMonthRevenue || 0)}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                      analytics.revenueGrowth >= 0 
                        ? 'bg-green-200 text-green-800' 
                        : 'bg-red-200 text-red-800'
                    }`}>
                      {analytics.revenueGrowth >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>{analytics.revenueGrowth >= 0 ? '+' : ''}{analytics.revenueGrowth}%</span>
                    </div>
                  </div>
                  {/* Bar Chart */}
                  <div className="relative h-40 bg-white/50 rounded-lg p-4 border border-green-200">
                    {analytics.monthlyRevenue && analytics.monthlyRevenue.length > 0 && (() => {
                      const maxRevenue = Math.max(...analytics.monthlyRevenue.map(m => m.value), 1);
                      return (
                        <div className="relative h-full w-full flex items-end justify-between gap-2">
                          {analytics.monthlyRevenue.map((month, idx) => {
                            const heightPercent = maxRevenue > 0 ? (month.value / maxRevenue) * 100 : 0;
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative h-full">
                                <div className="flex-1 w-full flex items-end relative">
                                  <div
                                    className="w-full bg-gradient-to-t from-green-600 via-green-500 to-green-400 rounded-t-md transition-all hover:from-green-700 hover:via-green-600 hover:to-green-500 cursor-pointer shadow-md hover:shadow-lg relative group/bar"
                                    style={{ 
                                      height: `${Math.max(heightPercent, 2)}%`,
                                      minHeight: '8px'
                                    }}
                                    title={`${month.month}: ${formatCurrency(month.value)}`}
                                  >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none shadow-lg">
                                      {formatCurrency(month.value)}
                                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                                </div>
                                <span className="text-xs font-semibold text-green-700 mt-1">{month.month}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {(!analytics.monthlyRevenue || analytics.monthlyRevenue.length === 0) && (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No data available
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-green-700 font-medium">vs previous month: {formatCurrency(analytics.previousMonthRevenue || 0)}</p>
                </div>

                {/* Bookings Trend */}
                <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-700">Monthly Bookings</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">
                        {analytics.currentMonthBookings || 0}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                      analytics.bookingsGrowth >= 0 
                        ? 'bg-blue-200 text-blue-800' 
                        : 'bg-red-200 text-red-800'
                    }`}>
                      {analytics.bookingsGrowth >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>{analytics.bookingsGrowth >= 0 ? '+' : ''}{analytics.bookingsGrowth}%</span>
                    </div>
                  </div>
                  {/* Bar Chart */}
                  <div className="relative h-40 bg-white/50 rounded-lg p-4 border border-blue-200">
                    {analytics.monthlyBookings && analytics.monthlyBookings.length > 0 && (() => {
                      const maxBookings = Math.max(...analytics.monthlyBookings.map(m => m.value), 1);
                      return (
                        <div className="relative h-full w-full flex items-end justify-between gap-2">
                          {analytics.monthlyBookings.map((month, idx) => {
                            const heightPercent = maxBookings > 0 ? (month.value / maxBookings) * 100 : 0;
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative h-full">
                                <div className="flex-1 w-full flex items-end relative">
                                  <div
                                    className="w-full bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 rounded-t-md transition-all hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 cursor-pointer shadow-md hover:shadow-lg relative group/bar"
                                    style={{ 
                                      height: `${Math.max(heightPercent, 2)}%`,
                                      minHeight: '8px'
                                    }}
                                    title={`${month.month}: ${month.value} bookings`}
                                  >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none shadow-lg">
                                      {month.value} bookings
                                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                </div>
                                <span className="text-xs font-semibold text-blue-700 mt-1">{month.month}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {(!analytics.monthlyBookings || analytics.monthlyBookings.length === 0) && (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No data available
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-blue-700 font-medium">vs previous month: {analytics.previousMonthBookings || 0}</p>
                </div>

                {/* Users Trend */}
                <div className="space-y-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-purple-700">Monthly Users</p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">
                        {analytics.currentMonthUsers || 0}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                      analytics.usersGrowth >= 0 
                        ? 'bg-purple-200 text-purple-800' 
                        : 'bg-red-200 text-red-800'
                    }`}>
                      {analytics.usersGrowth >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>{analytics.usersGrowth >= 0 ? '+' : ''}{analytics.usersGrowth}%</span>
                    </div>
                  </div>
                  {/* Bar Chart */}
                  <div className="relative h-40 bg-white/50 rounded-lg p-4 border border-purple-200">
                    {analytics.monthlyUsers && analytics.monthlyUsers.length > 0 && (() => {
                      const maxUsers = Math.max(...analytics.monthlyUsers.map(m => m.value), 1);
                      return (
                        <div className="relative h-full w-full flex items-end justify-between gap-2">
                          {analytics.monthlyUsers.map((month, idx) => {
                            const heightPercent = maxUsers > 0 ? (month.value / maxUsers) * 100 : 0;
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative h-full">
                                <div className="flex-1 w-full flex items-end relative">
                                  <div
                                    className="w-full bg-gradient-to-t from-purple-600 via-purple-500 to-purple-400 rounded-t-md transition-all hover:from-purple-700 hover:via-purple-600 hover:to-purple-500 cursor-pointer shadow-md hover:shadow-lg relative group/bar"
                                    style={{ 
                                      height: `${Math.max(heightPercent, 2)}%`,
                                      minHeight: '8px'
                                    }}
                                    title={`${month.month}: ${month.value} users`}
                                  >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none shadow-lg">
                                      {month.value} users
                                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                </div>
                                <span className="text-xs font-semibold text-purple-700 mt-1">{month.month}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {(!analytics.monthlyUsers || analytics.monthlyUsers.length === 0) && (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No data available
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-purple-700 font-medium">vs previous month: {analytics.previousMonthUsers || 0}</p>
                </div>
                  </div>
                </div>

                {/* Combined Revenue & Bookings Chart */}
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Revenue vs Bookings Overview
                  </h3>
                  <div className="relative h-64 bg-white/50 rounded-lg p-4 border-2 border-slate-200">
                    {analytics.monthlyRevenue && analytics.monthlyRevenue.length > 0 && analytics.monthlyBookings && analytics.monthlyBookings.length > 0 && (() => {
                      const maxRevenue = Math.max(...analytics.monthlyRevenue.map(m => m.value), 1);
                      const maxBookings = Math.max(...analytics.monthlyBookings.map(m => m.value), 1);
                      const maxValue = Math.max(maxRevenue, maxBookings * 1000); // Normalize bookings by multiplying for better comparison
                      
                      return (
                        <div className="relative h-full w-full">
                          {/* Legend */}
                          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border shadow-sm z-10">
                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-gradient-to-t from-green-600 to-green-400 rounded"></div>
                                <span className="font-semibold text-green-700">Revenue</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-gradient-to-t from-blue-600 to-blue-400 rounded"></div>
                                <span className="font-semibold text-blue-700">Bookings</span>
                              </div>
                            </div>
                </div>

                          {/* Bar Chart */}
                          <div className="relative h-full w-full flex items-end justify-between gap-2 pt-8">
                            {analytics.monthlyRevenue.map((month, idx) => {
                              const booking = analytics.monthlyBookings?.[idx];
                              const revenueHeightPercent = maxRevenue > 0 ? (month.value / maxRevenue) * 100 : 0;
                              const bookingHeightPercent = maxBookings > 0 ? (booking?.value || 0) / maxBookings * 100 : 0;
                              
                              return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative h-full">
                                  <div className="flex-1 w-full flex items-end justify-center gap-1 relative">
                                    {/* Revenue Bar */}
                                    <div
                                      className="flex-1 bg-gradient-to-t from-green-600 via-green-500 to-green-400 rounded-t-md transition-all hover:from-green-700 hover:via-green-600 hover:to-green-500 cursor-pointer shadow-md hover:shadow-lg relative group/bar"
                                      style={{ 
                                        height: `${Math.max(revenueHeightPercent, 2)}%`,
                                        minHeight: '8px'
                                      }}
                                      title={`Revenue: ${formatCurrency(month.value)}`}
                                    >
                                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none shadow-lg">
                                        {formatCurrency(month.value)}
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                                    
                                    {/* Bookings Bar */}
                                    {booking && (
                                      <div
                                        className="flex-1 bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 rounded-t-md transition-all hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 cursor-pointer shadow-md hover:shadow-lg relative group/bar"
                                        style={{ 
                                          height: `${Math.max(bookingHeightPercent, 2)}%`,
                                          minHeight: '8px'
                                        }}
                                        title={`Bookings: ${booking.value}`}
                                      >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none shadow-lg">
                                          {booking.value} bookings
                                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs font-semibold text-slate-700 mt-1">{month.month}</span>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Y-Axis Labels */}
                          <div className="absolute left-2 top-8 bottom-16 flex flex-col justify-between text-xs text-slate-600 font-semibold">
                            <span>{formatCurrency(maxRevenue)}</span>
                            <span>₱0</span>
                          </div>
                        </div>
                      );
                    })()}
                    {(!analytics.monthlyRevenue || analytics.monthlyRevenue.length === 0 || !analytics.monthlyBookings || analytics.monthlyBookings.length === 0) && (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No data available for comparison
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking Status Distribution & Additional Metrics */}
                {analytics.bookingStatusDistribution && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Booking Analytics & Status Distribution
                  </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Status Distribution with Chart */}
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-4">Status Breakdown</h4>
                        <div className="space-y-3">
                          {[
                            { key: 'confirmed', label: 'Confirmed', color: '#10b981', icon: CheckCircle, bg: 'from-green-500 to-green-400' },
                            { key: 'pending', label: 'Pending', color: '#eab308', icon: Clock, bg: 'from-yellow-500 to-yellow-400' },
                            { key: 'completed', label: 'Completed', color: '#3b82f6', icon: CheckCircle, bg: 'from-blue-500 to-blue-400' },
                            { key: 'cancelled', label: 'Cancelled', color: '#ef4444', icon: XCircle, bg: 'from-red-500 to-red-400' }
                          ].map(({ key, label, color, icon: Icon, bg }) => {
                            const value = analytics.bookingStatusDistribution[key] || 0;
                            const total = Object.values(analytics.bookingStatusDistribution).reduce((sum, val) => sum + val, 0);
                            const percentage = total > 0 ? ((value / total) * 100) : 0;
                            return (
                              <div key={key} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 bg-gradient-to-br ${bg} rounded-lg flex items-center justify-center`}>
                                      <Icon className="w-4 h-4 text-white" />
                </div>
                                    <div>
                                      <p className="text-sm font-semibold text-foreground">{label}</p>
                                      <p className="text-xs text-muted-foreground">{value} bookings</p>
              </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-foreground">{percentage.toFixed(1)}%</p>
                                  </div>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ 
                                      width: `${percentage}%`,
                                      background: `linear-gradient(90deg, ${color}, ${color}dd)`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
            </div>
          </div>

                      {/* Performance Metrics */}
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-4">Performance Metrics</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-semibold text-green-700">Growth Rate</span>
                            </div>
                            <p className="text-2xl font-bold text-green-900">
                              {analytics.revenueGrowth >= 0 ? '+' : ''}{analytics.revenueGrowth}%
                            </p>
                            <p className="text-xs text-green-700 mt-1">Revenue MoM</p>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <span className="text-xs font-semibold text-blue-700">Booking Rate</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-900">
                              {analytics.bookingsGrowth >= 0 ? '+' : ''}{analytics.bookingsGrowth}%
                            </p>
                            <p className="text-xs text-blue-700 mt-1">Bookings MoM</p>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-purple-600" />
                              <span className="text-xs font-semibold text-purple-700">User Growth</span>
                            </div>
                            <p className="text-2xl font-bold text-purple-900">
                              {analytics.usersGrowth >= 0 ? '+' : ''}{analytics.usersGrowth}%
                            </p>
                            <p className="text-xs text-purple-700 mt-1">Users MoM</p>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Home className="w-4 h-4 text-orange-600" />
                              <span className="text-xs font-semibold text-orange-700">Listings Growth</span>
                            </div>
                            <p className="text-2xl font-bold text-orange-900">
                              {analytics.listingsGrowth >= 0 ? '+' : ''}{analytics.listingsGrowth}%
                            </p>
                            <p className="text-xs text-orange-700 mt-1">Listings MoM</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Monthly Comparison Table */}
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Monthly Comparison Table
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-border">
                          <th className="text-left p-3 font-semibold text-foreground">Month</th>
                          <th className="text-right p-3 font-semibold text-foreground">Revenue</th>
                          <th className="text-right p-3 font-semibold text-foreground">Bookings</th>
                          <th className="text-right p-3 font-semibold text-foreground">New Users</th>
                          <th className="text-right p-3 font-semibold text-foreground">Avg. Booking</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.monthlyRevenue && analytics.monthlyRevenue.length > 0 && analytics.monthlyRevenue.map((month, idx) => {
                          const booking = analytics.monthlyBookings?.[idx];
                          const user = analytics.monthlyUsers?.[idx];
                          const avgBooking = booking && booking.value > 0 ? month.value / booking.value : 0;
                          return (
                            <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="p-3 font-semibold text-foreground">{month.month}</td>
                              <td className="p-3 text-right font-bold text-green-700">{formatCurrency(month.value)}</td>
                              <td className="p-3 text-right font-bold text-blue-700">{booking?.value || 0}</td>
                              <td className="p-3 text-right font-bold text-purple-700">{user?.value || 0}</td>
                              <td className="p-3 text-right text-muted-foreground">{formatCurrency(avgBooking)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-muted/50">
                        <tr>
                          <td className="p-3 font-bold text-foreground">Total (6 Months)</td>
                          <td className="p-3 text-right font-bold text-green-900">
                            {formatCurrency(analytics.monthlyRevenue?.reduce((sum, m) => sum + m.value, 0) || 0)}
                          </td>
                          <td className="p-3 text-right font-bold text-blue-900">
                            {analytics.monthlyBookings?.reduce((sum, m) => sum + m.value, 0) || 0}
                          </td>
                          <td className="p-3 text-right font-bold text-purple-900">
                            {analytics.monthlyUsers?.reduce((sum, m) => sum + m.value, 0) || 0}
                          </td>
                          <td className="p-3 text-right font-bold text-foreground">
                            {analytics.monthlyBookings && analytics.monthlyBookings.reduce((sum, m) => sum + m.value, 0) > 0
                              ? formatCurrency((analytics.monthlyRevenue?.reduce((sum, m) => sum + m.value, 0) || 0) / analytics.monthlyBookings.reduce((sum, m) => sum + m.value, 0))
                              : formatCurrency(0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Simple header for non-overview pages */}
          {activeTab !== 'overview' && (
            <div className="max-w-7xl mx-auto px-6 pt-8 mb-4">
              <div className="flex items-center justify-between mb-6">
                <h1 className="font-heading text-2xl font-bold text-foreground">
                  {activeTab === 'transactions' && 'All Transactions'}
                  {activeTab === 'service-fees' && 'Service Fees'}
                  {activeTab === 'host-management' && 'Host Management'}
                  {activeTab === 'platform-settings' && 'Platform Settings'}
                  {activeTab === 'compliance' && 'Policy & Compliance'}
                  {activeTab === 'reports' && 'Reports'}
                </h1>
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
                  aria-label="Toggle menu"
                >
                  <Menu className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </div>
          )}

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
            <div className="space-y-8">
              {/* Quick Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card-listing p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <p className="text-xs font-semibold text-emerald-700 uppercase">Confirmed</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900">
                    {bookings.filter(b => b.status === 'confirmed').length}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">Active bookings</p>
                </div>
                <div className="card-listing p-4 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <p className="text-xs font-semibold text-amber-700 uppercase">Pending</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-900">
                    {bookings.filter(b => b.status === 'pending').length}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">Awaiting confirmation</p>
                </div>
                <div className="card-listing p-4 bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <p className="text-xs font-semibold text-rose-700 uppercase">Cancelled</p>
                  </div>
                  <p className="text-2xl font-bold text-rose-900">
                    {bookings.filter(b => b.status === 'cancelled').length}
                  </p>
                  <p className="text-xs text-rose-700 mt-1">Cancelled bookings</p>
                </div>
                <div className="card-listing p-4 bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-teal-600" />
                    <p className="text-xs font-semibold text-teal-700 uppercase">Average Rating</p>
                  </div>
                  <p className="text-2xl font-bold text-teal-900">
                    {reviews.length > 0 
                      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
                      : '0.0'}
                  </p>
                  <p className="text-xs text-teal-700 mt-1">From {reviews.length} reviews</p>
                </div>
              </div>

              {/* Recent Bookings & Top Hosts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Bookings */}
                <div className="card-listing p-6 border-2 border-border">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="font-heading text-xl font-bold text-foreground">Recent Bookings</h2>
                        <p className="text-sm text-muted-foreground">Latest booking activity</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View All
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {bookings.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">No bookings yet</p>
                      </div>
                    ) : (
                      bookings.slice(0, 5).map(booking => {
                        const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
                        const formattedDate = bookingDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        });
                        
                        return (
                          <div 
                            key={booking.id} 
                            className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-all cursor-pointer"
                            onClick={() => navigate(`/booking/${booking.id}`)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-foreground truncate">{booking.listingTitle || 'Untitled Listing'}</h3>
                                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
                                    booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                    booking.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {booking.status}
                                  </span>
                                </div>
                                <div className="space-y-1.5 mb-2">
                                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Users className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="truncate">{booking.guestName || 'Unknown Guest'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Home className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="truncate">{booking.hostName || 'Unknown Host'}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formattedDate}
                                </p>
                              </div>
                              <div className="text-right ml-4 flex-shrink-0">
                                <p className="font-bold text-foreground text-lg">
                                  {formatCurrency(booking.totalPrice || booking.bookingAmount || 0)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">Total Amount</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Top Hosts */}
                <div className="card-listing p-6 border-2 border-border">
                  <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <Award className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                        <h2 className="font-heading text-xl font-bold text-foreground">Top Hosts</h2>
                        <p className="text-sm text-muted-foreground">Highest performing hosts</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('host-management')}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View All
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {hosts.filter(h => !h.isTerminated).length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">No hosts yet</p>
                      </div>
                    ) : (
                      hosts.filter(h => !h.isTerminated).slice(0, 5).map((host, index) => (
                        <div 
                          key={host.userId} 
                          className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-all cursor-pointer"
                          onClick={() => setActiveTab('host-management')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
                                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                                index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                                'bg-gradient-to-br from-primary to-accent'
                              }`}>
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground mb-1">{host.name}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span className="font-medium">{host.rating.toFixed(1)}</span>
                                    {host.reviewCount > 0 && (
                                      <span className="text-muted-foreground">({host.reviewCount})</span>
                                    )}
                            </div>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <Home className="w-3 h-3" />
                                    <span>{host.listings} listings</span>
                          </div>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{host.bookings} bookings</span>
                        </div>
                        </div>
                      </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-bold text-green-600 text-lg">
                                {formatCurrency(host.earnings)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">Total Earnings</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Reviews Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Best Reviews */}
                <div className="card-listing p-6 border-2 border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="font-heading text-xl font-bold text-foreground">Best Reviews</h2>
                      <p className="text-sm text-muted-foreground">Highest rated feedback</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {bestReviews.length === 0 ? (
                      <div className="text-center py-8">
                        <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">No reviews yet</p>
                      </div>
                    ) : (
                      bestReviews.map(review => (
                        <div key={review.id} className="p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-foreground mb-1">{review.reviewerName}</p>
                              <p className="text-xs text-muted-foreground mb-2">{review.listingTitle}</p>
                            </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                          <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                            {review.comment}
                          </p>
                          {review.createdAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(review.createdAt)}
                            </p>
                          )}
                      </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Lowest Reviews */}
                <div className="card-listing p-6 border-2 border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h2 className="font-heading text-xl font-bold text-foreground">Lowest Reviews</h2>
                      <p className="text-sm text-muted-foreground">Reviews requiring attention</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {lowestReviews.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">No low ratings yet</p>
                      </div>
                    ) : (
                      lowestReviews.map(review => (
                        <div key={review.id} className="p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-foreground mb-1">{review.reviewerName}</p>
                              <p className="text-xs text-muted-foreground mb-2">{review.listingTitle}</p>
                            </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                          <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                            {review.comment}
                          </p>
                          {review.createdAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(review.createdAt)}
                            </p>
                          )}
                      </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Comprehensive Booking Statistics */}
              <div className="card-listing p-6 border-2 border-border">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="font-heading text-xl font-bold text-foreground">Booking Statistics</h2>
                      <p className="text-sm text-muted-foreground">Comprehensive booking analytics</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBookingsModal(true)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View All
                    <Eye className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <p className="text-sm font-semibold text-emerald-900">Confirmed</p>
                    </div>
                    <p className="text-3xl font-bold text-emerald-900 mb-1">
                        {bookings.filter(b => b.status === 'confirmed').length}
                      </p>
                    <p className="text-xs text-emerald-700">
                      {bookings.length > 0 
                        ? `${Math.round((bookings.filter(b => b.status === 'confirmed').length / bookings.length) * 100)}% of total`
                        : '0%'}
                    </p>
                    </div>
                  <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <p className="text-sm font-semibold text-amber-900">Pending</p>
                    </div>
                    <p className="text-3xl font-bold text-amber-900 mb-1">
                        {bookings.filter(b => b.status === 'pending').length}
                      </p>
                    <p className="text-xs text-amber-700">
                      {bookings.length > 0 
                        ? `${Math.round((bookings.filter(b => b.status === 'pending').length / bookings.length) * 100)}% of total`
                        : '0%'}
                    </p>
                    </div>
                  <div className="p-5 bg-gradient-to-br from-rose-50 to-rose-100 border-2 border-rose-300 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-rose-600" />
                      <p className="text-sm font-semibold text-rose-900">Cancelled</p>
                    </div>
                    <p className="text-3xl font-bold text-rose-900 mb-1">
                        {bookings.filter(b => b.status === 'cancelled').length}
                      </p>
                    <p className="text-xs text-rose-700">
                      {bookings.length > 0 
                        ? `${Math.round((bookings.filter(b => b.status === 'cancelled').length / bookings.length) * 100)}% of total`
                        : '0%'}
                    </p>
                    </div>
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <p className="text-sm font-semibold text-blue-900">Total</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-900 mb-1">
                      {bookings.length}
                    </p>
                    <p className="text-xs text-blue-700">All time bookings</p>
                  </div>
                </div>

                {/* Bookings Table */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-foreground">Recent Bookings Table</h3>
                    <button
                      onClick={() => setShowBookingsModal(true)}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      View Full Table
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full">
                      <thead className="bg-muted/50">
                      <tr className="border-b border-border">
                          <th className="text-left p-4 text-sm font-semibold text-foreground">Booking ID</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground">Guest</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground">Host</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground">Listing</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground">Amount</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground">Status</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground">Date</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                        {bookings.slice(0, 10).map(booking => (
                          <tr key={booking.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="p-4 text-sm font-mono text-muted-foreground">
                              {booking.id.substring(0, 8)}...
                            </td>
                            <td className="p-4 text-sm font-medium text-foreground">{booking.guestName}</td>
                            <td className="p-4 text-sm text-foreground">{booking.hostName}</td>
                            <td className="p-4 text-sm text-foreground">{booking.listingTitle}</td>
                            <td className="p-4 text-sm font-semibold text-foreground">
                              {formatCurrency(booking.totalPrice || 0)}
                            </td>
                            <td className="p-4">
                              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-700 border border-green-300' :
                                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                                booking.status === 'cancelled' ? 'bg-red-100 text-red-700 border border-red-300' :
                                'bg-gray-100 text-gray-700 border border-gray-300'
                              }`}>
                                {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                            </span>
                          </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {formatDate(booking.createdAt)}
                            </td>
                            <td className="p-4">
                            <button 
                              onClick={() => navigate(`/booking/${booking.id}`)}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                              title="View booking details"
                            >
                                <Eye className="w-4 h-4 text-primary" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                    {bookings.length === 0 && (
                      <div className="text-center py-12">
                        <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground text-lg">No bookings found</p>
                        <p className="text-sm text-muted-foreground mt-2">Bookings will appear here once created</p>
                      </div>
                    )}
                </div>
              </div>
            </div>
            </div>
          )}

          {/* All Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              {/* Cash Out Requests Section */}
              <div className="card-listing p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground">Cash Out Requests</h2>
                    <p className="text-muted-foreground mt-1">Review and approve/reject cash out requests from hosts and guests</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadCashOutRequests}
                      disabled={loadingCashOutRequests}
                      className="btn-outline flex items-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingCashOutRequests ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Filter */}
                <div className="mb-4 flex items-center gap-4">
                  <Label>Filter by Status:</Label>
                  <select 
                    value={cashOutRequestFilter} 
                    onChange={(e) => setCashOutRequestFilter(e.target.value)}
                    className="w-48 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <div className="text-sm text-muted-foreground">
                    {cashOutRequests.filter(r => cashOutRequestFilter === 'all' ? true : r.status === cashOutRequestFilter).length} request(s)
                  </div>
                </div>

                {/* Cash Out Requests Table */}
                {loadingCashOutRequests ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr className="border-b border-border">
                          <th className="text-left p-4 text-sm font-semibold text-foreground">User</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground">Amount</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground">PayPal Email</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground">Status</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground">Requested</th>
                          <th className="text-left p-4 text-sm font-semibold text-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashOutRequests
                          .filter(r => cashOutRequestFilter === 'all' ? true : r.status === cashOutRequestFilter)
                          .map(request => (
                            <tr key={request.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                              <td className="p-4">
                                <div>
                                  <p className="text-sm font-medium text-foreground">{request.userName || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">{request.userEmail || 'N/A'}</p>
                                </div>
                              </td>
                              <td className="p-4 text-sm font-semibold text-foreground">
                                ₱{request.amount?.toLocaleString() || '0'}
                              </td>
                              <td className="p-4 text-sm text-foreground">{request.paypalEmail || 'N/A'}</td>
                              <td className="p-4">
                                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                  request.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-300' :
                                  request.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-300' :
                                  'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                }`}>
                                  {request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
                                </span>
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">
                                {request.createdAt ? formatDate(request.createdAt) : 'N/A'}
                              </td>
                              <td className="p-4">
                                {request.status === 'pending' && (
                                  <button
                                    onClick={() => {
                                      setSelectedCashOutRequest(request);
                                      setCashOutAdminNotes('');
                                      setShowCashOutRequestModal(true);
                                    }}
                                    className="btn-primary text-sm px-3 py-1.5"
                                  >
                                    Review
                                  </button>
                                )}
                                {request.status !== 'pending' && request.adminNotes && (
                                  <div className="text-xs text-muted-foreground max-w-xs truncate" title={request.adminNotes}>
                                    {request.adminNotes}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {cashOutRequests.filter(r => cashOutRequestFilter === 'all' ? true : r.status === cashOutRequestFilter).length === 0 && (
                      <div className="text-center py-12">
                        <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground text-lg">No cash out requests found</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {cashOutRequestFilter === 'all' 
                            ? 'Cash out requests will appear here when users request withdrawals'
                            : `No ${cashOutRequestFilter} requests`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="card-listing p-6">
                <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground">All Money Transactions</h2>
                    <p className="text-muted-foreground mt-1">Complete history of all money-related transactions across the platform</p>
                </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreviewClick('transactions')}
                      className="btn-outline flex items-center gap-2"
                      title="Preview Transactions"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                    <button
                      onClick={() => handlePrintClick('transactions')}
                      className="btn-outline flex items-center gap-2"
                      title="Print Transactions"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                <button
                  onClick={loadAllMoneyTransactions}
                  disabled={loadingTransactions}
                      className="btn-outline flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingTransactions ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                  </div>
              </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {(() => {
                    // Total credits: all credit transactions
                    const totalCredits = allMoneyTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + (t.amount || 0), 0);
                    
                    // Total debits: admin transactions with type 'payment' or 'cash_out' (debits from admin wallet)
                    // Admin debits include: refunds, points cash outs, and any other admin wallet deductions
                    const totalDebits = allMoneyTransactions.filter(t => {
                      return t.isAdminTransaction && (t.type === 'payment' || t.type === 'cash_out');
                    }).reduce((sum, t) => sum + (t.amount || 0), 0);
                    
                    const subscriptions = allMoneyTransactions.filter(t => t.metadata?.paymentType === 'subscription_payment').length;
                    
                    return (
                      <>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-green-900">Total Credits</p>
                              <p className="text-2xl font-bold text-green-700">{formatCurrency(totalCredits)}</p>
                              <p className="text-xs text-green-600 mt-1">Incoming Funds</p>
                            </div>
                            <TrendingUp className="w-10 h-10 text-green-600" />
                          </div>
                        </div>
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-red-900">Total Debits</p>
                              <p className="text-2xl font-bold text-red-700">{formatCurrency(totalDebits)}</p>
                              <p className="text-xs text-red-600 mt-1">Outgoing Funds</p>
                            </div>
                            <TrendingDown className="w-10 h-10 text-red-600" />
                          </div>
                        </div>
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-purple-900">Subscriptions</p>
                              <p className="text-2xl font-bold text-purple-700">{subscriptions}</p>
                              <p className="text-xs text-purple-600 mt-1">Payment Transactions</p>
                            </div>
                            <CreditCard className="w-10 h-10 text-purple-600" />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Enhanced Filters */}
                <div className="mb-6 space-y-4">
                  {/* Search and Type Filter Row */}
                  <div className="flex gap-4 flex-wrap items-center">
                    <div className="flex-1 min-w-[250px]">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search by user, email, booking ID, or transaction ID..."
                          value={transactionsFilter.search}
                          onChange={(e) => setTransactionsFilter(prev => ({ ...prev, search: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>
                    <select
                      value={transactionsFilter.type}
                      onChange={(e) => setTransactionsFilter(prev => ({ ...prev, type: e.target.value }))}
                      className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="all">All Transaction Types</option>
                      <option value="credit">Credits Only</option>
                      <option value="debit">Debits Only</option>
                      <option value="subscription">Subscriptions</option>
                    </select>
                    <select
                      value={transactionsFilter.userRole}
                      onChange={(e) => setTransactionsFilter(prev => ({ ...prev, userRole: e.target.value }))}
                      className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="all">All User Roles</option>
                      <option value="admin">Admin Only</option>
                      <option value="host">Hosts Only</option>
                      <option value="guest">Guests Only</option>
                    </select>
                  </div>

                  {/* Date Range and Sort Row */}
                  <div className="flex gap-4 flex-wrap items-center">
                    <div className="flex gap-2 items-center">
                      <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Date Range:</label>
                      <input
                        type="date"
                        value={transactionsFilter.dateRange.startDate}
                        onChange={(e) => setTransactionsFilter(prev => ({ ...prev, dateRange: { ...prev.dateRange, startDate: e.target.value } }))}
                        className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                      />
                      <span className="text-muted-foreground">to</span>
                      <input
                        type="date"
                        value={transactionsFilter.dateRange.endDate}
                        onChange={(e) => setTransactionsFilter(prev => ({ ...prev, dateRange: { ...prev.dateRange, endDate: e.target.value } }))}
                        className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                        min={transactionsFilter.dateRange.startDate}
                      />
                    </div>
                    <select
                      value={transactionsFilter.sortBy}
                      onChange={(e) => setTransactionsFilter(prev => ({ ...prev, sortBy: e.target.value }))}
                      className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                    >
                      <option value="date">Sort by Date</option>
                      <option value="amount">Sort by Amount</option>
                      <option value="user">Sort by User</option>
                    </select>
                    <button
                      onClick={() => setTransactionsFilter(prev => ({ ...prev, sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc' }))}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted/50 flex items-center gap-2 text-sm"
                    >
                      {transactionsFilter.sortOrder === 'desc' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                      {transactionsFilter.sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                    </button>
                    {(transactionsFilter.search || transactionsFilter.type !== 'all' || transactionsFilter.dateRange.startDate || transactionsFilter.dateRange.endDate || transactionsFilter.userRole !== 'all') && (
                      <button
                        onClick={() => setTransactionsFilter({
                          search: '',
                          type: 'all',
                          dateRange: { startDate: '', endDate: '' },
                          sortBy: 'date',
                          sortOrder: 'desc',
                          userRole: 'all'
                        })}
                        className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Clear All Filters
                      </button>
                    )}
                  </div>

                  {/* Active Filters Display */}
                  {(transactionsFilter.search || transactionsFilter.type !== 'all' || transactionsFilter.dateRange.startDate || transactionsFilter.dateRange.endDate || transactionsFilter.userRole !== 'all') && (
                    <div className="flex flex-wrap gap-2 items-center text-sm">
                      <span className="text-muted-foreground font-medium">Active Filters:</span>
                      {transactionsFilter.search && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-2">
                          Search: "{transactionsFilter.search}"
                          <button onClick={() => setTransactionsFilter(prev => ({ ...prev, search: '' }))} className="hover:text-blue-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {transactionsFilter.type !== 'all' && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-2">
                          Type: {transactionsFilter.type.charAt(0).toUpperCase() + transactionsFilter.type.slice(1)}
                          <button onClick={() => setTransactionsFilter(prev => ({ ...prev, type: 'all' }))} className="hover:text-green-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {transactionsFilter.userRole !== 'all' && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full flex items-center gap-2">
                          Role: {transactionsFilter.userRole.charAt(0).toUpperCase() + transactionsFilter.userRole.slice(1)}
                          <button onClick={() => setTransactionsFilter(prev => ({ ...prev, userRole: 'all' }))} className="hover:text-purple-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {transactionsFilter.dateRange.startDate && (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-2">
                          From: {new Date(transactionsFilter.dateRange.startDate).toLocaleDateString()}
                          <button onClick={() => setTransactionsFilter(prev => ({ ...prev, dateRange: { ...prev.dateRange, startDate: '' } }))} className="hover:text-orange-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {transactionsFilter.dateRange.endDate && (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-2">
                          To: {new Date(transactionsFilter.dateRange.endDate).toLocaleDateString()}
                          <button onClick={() => setTransactionsFilter(prev => ({ ...prev, dateRange: { ...prev.dateRange, endDate: '' } }))} className="hover:text-orange-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Transactions List */}
              {loadingTransactions ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading transactions...</p>
                </div>
                ) : (() => {
                  let filtered = allMoneyTransactions.filter(transaction => {
                    // Search filter
                    if (transactionsFilter.search) {
                      const searchLower = transactionsFilter.search.toLowerCase();
                      const searchableText = [
                        transaction.userName || '',
                        transaction.userEmail || '',
                        transaction.description || '',
                        transaction.id || '',
                        transaction.metadata?.bookingId || '',
                        transaction.metadata?.listingTitle || ''
                      ].join(' ').toLowerCase();
                      if (!searchableText.includes(searchLower)) return false;
                    }
                    
                    // Type filter
                    if (transactionsFilter.type !== 'all') {
                      if (transactionsFilter.type === 'subscription') {
                        if (transaction.metadata?.paymentType !== 'subscription_payment') return false;
                      } else if (transactionsFilter.type === 'credit' && transaction.type !== 'credit') {
                        return false;
                      } else if (transactionsFilter.type === 'debit') {
                        // Debits are transactions with type 'payment' or 'cash_out'
                        if (transaction.type !== 'payment' && transaction.type !== 'cash_out') {
                          return false;
                        }
                      }
                    }
                    
                    // User role filter
                    if (transactionsFilter.userRole !== 'all') {
                      const roles = transaction.userRoles || [];
                      if (!roles.includes(transactionsFilter.userRole)) {
                        if (transactionsFilter.userRole === 'admin' && !transaction.isAdminTransaction) return false;
                        if (transactionsFilter.userRole !== 'admin' && transaction.isAdminTransaction) return false;
                      }
                    }
                    
                    // Date filter
                    if (transactionsFilter.dateRange.startDate || transactionsFilter.dateRange.endDate) {
                      const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date || transaction.createdAt);
                      const startDate = transactionsFilter.dateRange.startDate ? new Date(transactionsFilter.dateRange.startDate) : null;
                      const endDate = transactionsFilter.dateRange.endDate ? new Date(transactionsFilter.dateRange.endDate) : null;
                      
                      if (startDate) {
                        startDate.setHours(0, 0, 0, 0);
                        if (date < startDate) return false;
                      }
                      if (endDate) {
                        endDate.setHours(23, 59, 59, 999);
                        if (date > endDate) return false;
                      }
                    }
                    
                    return true;
                  });
                  
                  // Sort
                  filtered.sort((a, b) => {
                    let aVal, bVal;
                    if (transactionsFilter.sortBy === 'date') {
                      aVal = a.date instanceof Date ? a.date : new Date(a.date || a.createdAt || 0);
                      bVal = b.date instanceof Date ? b.date : new Date(b.date || b.createdAt || 0);
                    } else if (transactionsFilter.sortBy === 'amount') {
                      aVal = a.amount || 0;
                      bVal = b.amount || 0;
                    } else {
                      aVal = (a.userName || a.userEmail || '').toLowerCase();
                      bVal = (b.userName || b.userEmail || '').toLowerCase();
                    }
                    
                    if (transactionsFilter.sortOrder === 'desc') {
                      return bVal > aVal ? 1 : -1;
                    } else {
                      return aVal > bVal ? 1 : -1;
                    }
                  });

                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground">
                          Transactions ({filtered.length} of {allMoneyTransactions.length})
                        </h3>
                      </div>
                      {filtered.length > 0 ? (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                          {filtered.map((transaction, index) => {
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
                            const transactionTypeLabel = transaction.transactionType || (isCredit ? 'Credit' : 'Debit');
                      
                      return (
                        <div
                          key={transaction.id || index}
                                className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                      <div className={`w-3 h-3 rounded-full ${isCredit ? 'bg-green-500' : 'bg-red-500'}`} />
                                      <span className={`font-bold text-lg ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                  {isCredit ? '+' : '-'}{formatCurrency(amount)}
                                </span>
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        transactionTypeLabel.includes('Subscription') ? 'bg-purple-100 text-purple-700' :
                                        transactionTypeLabel.includes('Earnings') ? 'bg-blue-100 text-blue-700' :
                                        isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                      }`}>
                                        {transactionTypeLabel}
                                </span>
                                      {transaction.isAdminTransaction && (
                                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                                          Admin Wallet
                                        </span>
                                      )}
                              </div>
                              
                                    <p className="font-medium text-foreground mb-3">{transaction.description || 'Transaction'}</p>
                              
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                        <span className="text-muted-foreground block mb-1">User</span>
                                  <span className="font-medium">{transaction.userName || transaction.userEmail || 'Unknown'}</span>
                                        <p className="text-xs text-muted-foreground">{transaction.userEmail || 'N/A'}</p>
                                        {transaction.userRoles && transaction.userRoles.length > 0 && (
                                          <span className="text-xs px-2 py-0.5 bg-muted rounded mt-1 inline-block">
                                            {transaction.userRoles.join(', ')}
                                          </span>
                                        )}
                                </div>
                                
                                {metadata.bookingId && (
                                  <div>
                                          <span className="text-muted-foreground block mb-1">Booking</span>
                                          <span className="font-mono text-xs">{metadata.bookingId}</span>
                                          {metadata.listingTitle && (
                                            <p className="text-xs text-muted-foreground mt-1">{metadata.listingTitle}</p>
                                          )}
                                  </div>
                                )}
                                
                                      {!metadata.bookingId && metadata.listingTitle && (
                                  <div>
                                          <span className="text-muted-foreground block mb-1">Listing</span>
                                    <span className="font-medium">{metadata.listingTitle}</span>
                                  </div>
                                )}
                                
                                      {(metadata.guestEmail || metadata.hostEmail) && (
                                  <div>
                                          <span className="text-muted-foreground block mb-1">Related Parties</span>
                                          {metadata.guestEmail && <p className="text-xs">Guest: {metadata.guestEmail}</p>}
                                          {metadata.hostEmail && <p className="text-xs">Host: {metadata.hostEmail}</p>}
                                  </div>
                                )}
                                
                                {transaction.balanceAfter !== undefined && (
                                  <div>
                                          <span className="text-muted-foreground block mb-1">Balance After</span>
                                          <span className="font-semibold">{formatCurrency(transaction.balanceAfter)}</span>
                                  </div>
                                )}
                                
                                <div>
                                        <span className="text-muted-foreground block mb-1">Date & Time</span>
                                  <span className="font-medium">{formattedDate}</span>
                                </div>
                                
                                {transaction.id && (
                                  <div>
                                          <span className="text-muted-foreground block mb-1">Transaction ID</span>
                                          <span className="font-mono text-xs break-all">{transaction.id}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                        <div className="text-center py-12">
                          <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">No transactions found</p>
                          <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
                </div>
              )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Service Fees Tab */}
          {activeTab === 'service-fees' && (
            <div className="space-y-6">
              {/* Header with Export */}
              <div className="card-listing p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground">Service Fees & Revenue</h2>
                    <p className="text-muted-foreground mt-1">Comprehensive view of all platform fees and commissions</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreviewClick('service-fees')}
                      className="btn-outline flex items-center gap-2"
                      title="Preview Service Fees"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                  <button 
                      onClick={() => handlePrintClick('service-fees')}
                    className="btn-outline flex items-center gap-2"
                      title="Print Service Fees Report"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                    <button onClick={() => generateReport('financial')} className="btn-outline flex items-center gap-2" disabled={generatingReport}>
                      <Download className="w-4 h-4" />
                      Export Report
                    </button>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 border-b border-border">
                  {[
                    { id: 'overview', label: 'Overview', icon: BarChart3 },
                    { id: 'hosts', label: 'By Host', icon: Users },
                    { id: 'transactions', label: 'Transactions', icon: Receipt }
                  ].map(tab => {
                    const TabIcon = tab.icon;
                    return (
                  <button 
                        key={tab.id}
                        onClick={() => setServiceFeesView(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                          serviceFeesView === tab.id
                            ? 'border-primary text-primary font-semibold'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <TabIcon className="w-4 h-4" />
                        {tab.label}
                  </button>
                    );
                  })}
                  </div>

                {/* Overview Tab */}
                {serviceFeesView === 'overview' && (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                              <div>
                            <p className="text-sm font-semibold text-blue-900">Total Revenue</p>
                            <p className="text-2xl font-bold text-blue-700">{formatCurrency((stats.serviceFees || 0) + (stats.subscriptionRevenue || 0))}</p>
                            <p className="text-xs text-blue-600 mt-1">All Platform Fees</p>
                              </div>
                          <DollarSign className="w-10 h-10 text-blue-600" />
                              </div>
                              </div>
                      
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                              <div>
                            <p className="text-sm font-semibold text-green-900">Commission (10%)</p>
                            <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.serviceFees || 0)}</p>
                            <p className="text-xs text-green-600 mt-1">From Bookings</p>
                              </div>
                          <TrendingUp className="w-10 h-10 text-green-600" />
                            </div>
                              </div>
                      
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between">
                                <div>
                            <p className="text-sm font-semibold text-purple-900">Subscription Fees</p>
                            <p className="text-2xl font-bold text-purple-700">{formatCurrency(stats.subscriptionRevenue || 0)}</p>
                            <p className="text-xs text-purple-600 mt-1">{subscriptionTransactions.length} Transactions</p>
                                </div>
                          <CreditCard className="w-10 h-10 text-purple-600" />
                            </div>
                              </div>

                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center justify-between">
                              <div>
                            <p className="text-sm font-semibold text-orange-900">Active Hosts</p>
                            <p className="text-2xl font-bold text-orange-700">{hosts.filter(h => !h.isTerminated).length}</p>
                            <p className="text-xs text-orange-600 mt-1">Generating Revenue</p>
                              </div>
                          <Users className="w-10 h-10 text-orange-600" />
                            </div>
                          </div>
                          </div>

                    {/* Monthly/Yearly Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <div className="border border-border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-primary" />
                          This Month Summary
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                            <span className="text-muted-foreground">Commission</span>
                            <span className="font-semibold">{formatCurrency(stats.serviceFees || 0)}</span>
                        </div>
                          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                            <span className="text-muted-foreground">Subscriptions</span>
                            <span className="font-semibold">{formatCurrency(stats.subscriptionRevenue || 0)}</span>
                      </div>
                          <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border-2 border-primary">
                            <span className="font-semibold text-foreground">Total</span>
                            <span className="font-bold text-primary text-lg">{formatCurrency((stats.serviceFees || 0) + (stats.subscriptionRevenue || 0))}</span>
                  </div>
              </div>
            </div>

                      <div className="border border-border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          Top Performing Hosts
                        </h3>
                        <div className="space-y-2">
                          {hosts.filter(h => !h.isTerminated).slice(0, 5).map((host, index) => {
                            const hostServiceFees = Math.round((host.earnings * HOST_COMMISSION_PERCENTAGE) * 100) / 100;
                            return (
                              <div key={host.userId} className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}.</span>
                                  <span className="font-medium text-sm">{host.name}</span>
              </div>
                                <span className="font-semibold text-green-600">{formatCurrency(hostServiceFees)}</span>
                    </div>
                            );
                          })}
                          {hosts.length === 0 && (
                            <p className="text-muted-foreground text-sm text-center py-2">No hosts yet</p>
                )}
                  </div>
                </div>
                    </div>
                  </>
                )}
                
                {/* By Host Tab */}
                {serviceFeesView === 'hosts' && (
                    <div>
                    {/* Search and Filter */}
                    <div className="mb-4 flex gap-4 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search hosts by name or email..."
                            value={serviceFeesFilter.search}
                            onChange={(e) => setServiceFeesFilter(prev => ({ ...prev, search: e.target.value }))}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                    </div>
                  </div>
                      <select
                        value={serviceFeesFilter.sortBy}
                        onChange={(e) => setServiceFeesFilter(prev => ({ ...prev, sortBy: e.target.value }))}
                        className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="earnings">Sort by Earnings</option>
                        <option value="bookings">Sort by Bookings</option>
                        <option value="name">Sort by Name</option>
                      </select>
                      <button
                        onClick={() => setServiceFeesFilter(prev => ({ ...prev, sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc' }))}
                        className="px-4 py-2 border border-border rounded-lg hover:bg-muted/50 flex items-center gap-2"
                      >
                        {serviceFeesFilter.sortOrder === 'desc' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                        {serviceFeesFilter.sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                </button>
                </div>
                
                    {/* Hosts List */}
                    <div className="space-y-3">
                      {(() => {
                        let filteredHosts = [...hosts];
                        
                        // Apply search filter
                        if (serviceFeesFilter.search) {
                          const searchLower = serviceFeesFilter.search.toLowerCase();
                          filteredHosts = filteredHosts.filter(host =>
                            host.name.toLowerCase().includes(searchLower) ||
                            host.email.toLowerCase().includes(searchLower)
                          );
                        }

                        // Apply sorting
                        filteredHosts.sort((a, b) => {
                          let aVal, bVal;
                          if (serviceFeesFilter.sortBy === 'earnings') {
                            aVal = a.earnings;
                            bVal = b.earnings;
                          } else if (serviceFeesFilter.sortBy === 'bookings') {
                            aVal = a.bookings;
                            bVal = b.bookings;
                          } else {
                            aVal = a.name.toLowerCase();
                            bVal = b.name.toLowerCase();
                          }
                          
                          if (serviceFeesFilter.sortOrder === 'desc') {
                            return bVal > aVal ? 1 : -1;
                          } else {
                            return aVal > bVal ? 1 : -1;
                          }
                        });

                        return filteredHosts.length > 0 ? (
                          filteredHosts.map(host => {
                            const hostServiceFees = Math.round((host.earnings * HOST_COMMISSION_PERCENTAGE) * 100) / 100;
                            const isExpanded = expandedHosts.has(host.userId);
                            return (
                              <div key={host.userId} className="border border-border rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                      <p className="font-semibold text-foreground">{host.name}</p>
                                      {host.listings > 0 && (
                                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                          {host.listings} {host.listings === 1 ? 'listing' : 'listings'}
                                        </span>
                                      )}
                    </div>
                                    <p className="text-sm text-muted-foreground">{host.email}</p>
                                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                      <span>{host.bookings} {host.bookings === 1 ? 'booking' : 'bookings'}</span>
                                      <span>•</span>
                                      <span>Total Earnings: {formatCurrency(host.earnings)}</span>
                                      <span>•</span>
                                      <span className="font-semibold text-green-600">Commission: {formatCurrency(hostServiceFees)}</span>
                  </div>
                </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <p className="font-bold text-lg text-green-600">{formatCurrency(hostServiceFees)}</p>
                                      <p className="text-xs text-muted-foreground">10% Commission</p>
                    </div>
                                    <button
                                      onClick={() => {
                                        const newExpanded = new Set(expandedHosts);
                                        if (newExpanded.has(host.userId)) {
                                          newExpanded.delete(host.userId);
                                        } else {
                                          newExpanded.add(host.userId);
                                        }
                                        setExpandedHosts(newExpanded);
                                      }}
                                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    >
                                      {isExpanded ? <X className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                </div>
              </div>

                                {isExpanded && (
                                  <div className="border-t border-border bg-muted/20 p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                                        <p className="text-muted-foreground mb-1">Total Bookings</p>
                                        <p className="font-semibold">{host.bookings}</p>
                          </div>
                                      <div>
                                        <p className="text-muted-foreground mb-1">Total Earnings</p>
                                        <p className="font-semibold">{formatCurrency(host.earnings)}</p>
                  </div>
                                      <div>
                                        <p className="text-muted-foreground mb-1">Commission (10%)</p>
                            <p className="font-semibold text-green-600">{formatCurrency(hostServiceFees)}</p>
                          </div>
                          <div>
                                        <p className="text-muted-foreground mb-1">Host Receives</p>
                                        <p className="font-semibold text-blue-600">{formatCurrency(host.earnings - hostServiceFees)}</p>
                          </div>
                          </div>
                                    {host.rating > 0 && (
                                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        <span className="font-medium">{host.rating.toFixed(1)}</span>
                                        <span className="text-muted-foreground text-sm">({host.reviewCount} {host.reviewCount === 1 ? 'review' : 'reviews'})</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                        </div>
                      );
                    })
                  ) : (
                          <div className="text-center py-12">
                            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground text-lg">No hosts found</p>
                            {serviceFeesFilter.search && (
                              <p className="text-sm text-muted-foreground mt-2">Try adjusting your search</p>
                  )}
                </div>
                        );
                      })()}
              </div>
                  </div>
                )}

                {/* Transactions Tab */}
                {serviceFeesView === 'transactions' && (
              <div>
                    {/* Enhanced Search and Filter Bar */}
                    <div className="mb-6 space-y-4">
                      {/* Search and Subscription Type Filter Row */}
                      <div className="flex gap-4 flex-wrap items-center">
                        <div className="flex-1 min-w-[250px]">
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search by host email or name..."
                              value={serviceFeesFilter.search}
                              onChange={(e) => setServiceFeesFilter(prev => ({ ...prev, search: e.target.value }))}
                              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                          </div>
                        </div>
                        <select
                          value={serviceFeesFilter.subscriptionType}
                          onChange={(e) => setServiceFeesFilter(prev => ({ ...prev, subscriptionType: e.target.value }))}
                          className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="all">All Subscription Types</option>
                          <option value="monthly">Monthly Only</option>
                          <option value="yearly">Yearly Only</option>
                        </select>
                      </div>

                      {/* Date Range and Sort Row */}
                      <div className="flex gap-4 flex-wrap items-center">
                        <div className="flex gap-2 items-center">
                          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Date Range:</label>
                          <input
                            type="date"
                            value={serviceFeesFilter.dateRange.startDate}
                            onChange={(e) => setServiceFeesFilter(prev => ({ ...prev, dateRange: { ...prev.dateRange, startDate: e.target.value } }))}
                            className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                          />
                          <span className="text-muted-foreground">to</span>
                          <input
                            type="date"
                            value={serviceFeesFilter.dateRange.endDate}
                            onChange={(e) => setServiceFeesFilter(prev => ({ ...prev, dateRange: { ...prev.dateRange, endDate: e.target.value } }))}
                            className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                            min={serviceFeesFilter.dateRange.startDate}
                          />
                        </div>
                        <select
                          value={serviceFeesFilter.transactionSort}
                          onChange={(e) => setServiceFeesFilter(prev => ({ ...prev, transactionSort: e.target.value }))}
                          className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                        >
                          <option value="date">Sort by Date</option>
                          <option value="amount">Sort by Amount</option>
                          <option value="host">Sort by Host</option>
                        </select>
                        <button
                          onClick={() => setServiceFeesFilter(prev => ({ ...prev, transactionSortOrder: prev.transactionSortOrder === 'desc' ? 'asc' : 'desc' }))}
                          className="px-4 py-2 border border-border rounded-lg hover:bg-muted/50 flex items-center gap-2 text-sm"
                        >
                          {serviceFeesFilter.transactionSortOrder === 'desc' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                          {serviceFeesFilter.transactionSortOrder === 'desc' ? 'Descending' : 'Ascending'}
                        </button>
                        {(serviceFeesFilter.search || serviceFeesFilter.dateRange.startDate || serviceFeesFilter.dateRange.endDate || serviceFeesFilter.subscriptionType !== 'all') && (
                          <button
                            onClick={() => setServiceFeesFilter(prev => ({
                              ...prev,
                              search: '',
                              dateRange: { startDate: '', endDate: '' },
                              subscriptionType: 'all',
                              transactionSort: 'date',
                              transactionSortOrder: 'desc'
                            }))}
                            className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Clear All Filters
                          </button>
                        )}
                      </div>

                      {/* Active Filters Display */}
                      {(serviceFeesFilter.search || serviceFeesFilter.dateRange.startDate || serviceFeesFilter.dateRange.endDate || serviceFeesFilter.subscriptionType !== 'all') && (
                        <div className="flex flex-wrap gap-2 items-center text-sm">
                          <span className="text-muted-foreground font-medium">Active Filters:</span>
                          {serviceFeesFilter.search && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-2">
                              Search: "{serviceFeesFilter.search}"
                              <button onClick={() => setServiceFeesFilter(prev => ({ ...prev, search: '' }))} className="hover:text-blue-900">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                          {serviceFeesFilter.dateRange.startDate && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-2">
                              From: {new Date(serviceFeesFilter.dateRange.startDate).toLocaleDateString()}
                              <button onClick={() => setServiceFeesFilter(prev => ({ ...prev, dateRange: { ...prev.dateRange, startDate: '' } }))} className="hover:text-green-900">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                          {serviceFeesFilter.dateRange.endDate && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-2">
                              To: {new Date(serviceFeesFilter.dateRange.endDate).toLocaleDateString()}
                              <button onClick={() => setServiceFeesFilter(prev => ({ ...prev, dateRange: { ...prev.dateRange, endDate: '' } }))} className="hover:text-green-900">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                          {serviceFeesFilter.subscriptionType !== 'all' && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full flex items-center gap-2">
                              Type: {serviceFeesFilter.subscriptionType.charAt(0).toUpperCase() + serviceFeesFilter.subscriptionType.slice(1)}
                              <button onClick={() => setServiceFeesFilter(prev => ({ ...prev, subscriptionType: 'all' }))} className="hover:text-purple-900">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Subscription Transactions */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-purple-600" />
                          Subscription Transactions
                        </h3>
                        <div className="text-sm text-muted-foreground">
                          Showing {(() => {
                            let filtered = subscriptionTransactions.filter(transaction => {
                              // Search filter
                              if (serviceFeesFilter.search) {
                                const searchLower = serviceFeesFilter.search.toLowerCase();
                                const hostEmail = (transaction.metadata?.hostEmail || '').toLowerCase();
                                const hostName = (transaction.metadata?.hostName || '').toLowerCase();
                                if (!hostEmail.includes(searchLower) && !hostName.includes(searchLower)) {
                                  return false;
                                }
                              }
                              
                              // Date filter
                              if (serviceFeesFilter.dateRange.startDate || serviceFeesFilter.dateRange.endDate) {
                      const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
                                const startDate = serviceFeesFilter.dateRange.startDate ? new Date(serviceFeesFilter.dateRange.startDate) : null;
                                const endDate = serviceFeesFilter.dateRange.endDate ? new Date(serviceFeesFilter.dateRange.endDate) : null;
                                
                                if (startDate) {
                                  startDate.setHours(0, 0, 0, 0);
                                  if (date < startDate) return false;
                                }
                                if (endDate) {
                                  endDate.setHours(23, 59, 59, 999);
                                  if (date > endDate) return false;
                                }
                              }
                              
                              // Subscription type filter
                              if (serviceFeesFilter.subscriptionType !== 'all') {
                                const transactionType = (transaction.metadata?.subscriptionType || '').toLowerCase();
                                if (transactionType !== serviceFeesFilter.subscriptionType.toLowerCase()) {
                                  return false;
                                }
                              }
                              
                              return true;
                            });
                            
                            // Sort
                            filtered.sort((a, b) => {
                              let aVal, bVal;
                              if (serviceFeesFilter.transactionSort === 'date') {
                                aVal = a.date instanceof Date ? a.date : new Date(a.date || 0);
                                bVal = b.date instanceof Date ? b.date : new Date(b.date || 0);
                              } else if (serviceFeesFilter.transactionSort === 'amount') {
                                aVal = a.amount || 0;
                                bVal = b.amount || 0;
                              } else {
                                aVal = (a.metadata?.hostEmail || '').toLowerCase();
                                bVal = (b.metadata?.hostEmail || '').toLowerCase();
                              }
                              
                              if (serviceFeesFilter.transactionSortOrder === 'desc') {
                                return bVal > aVal ? 1 : -1;
                              } else {
                                return aVal > bVal ? 1 : -1;
                              }
                            });
                            
                            return filtered.length;
                          })()} of {subscriptionTransactions.length}
                        </div>
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {(() => {
                          let filtered = subscriptionTransactions.filter(transaction => {
                            // Search filter
                            if (serviceFeesFilter.search) {
                              const searchLower = serviceFeesFilter.search.toLowerCase();
                              const hostEmail = (transaction.metadata?.hostEmail || '').toLowerCase();
                              const hostName = (transaction.metadata?.hostName || '').toLowerCase();
                              if (!hostEmail.includes(searchLower) && !hostName.includes(searchLower)) {
                                return false;
                              }
                            }
                            
                            // Date filter
                            if (serviceFeesFilter.dateRange.startDate || serviceFeesFilter.dateRange.endDate) {
                              const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
                              const startDate = serviceFeesFilter.dateRange.startDate ? new Date(serviceFeesFilter.dateRange.startDate) : null;
                              const endDate = serviceFeesFilter.dateRange.endDate ? new Date(serviceFeesFilter.dateRange.endDate) : null;
                              
                              if (startDate) {
                                startDate.setHours(0, 0, 0, 0);
                                if (date < startDate) return false;
                              }
                              if (endDate) {
                                endDate.setHours(23, 59, 59, 999);
                                if (date > endDate) return false;
                              }
                            }
                            
                            // Subscription type filter
                            if (serviceFeesFilter.subscriptionType !== 'all') {
                              const transactionType = (transaction.metadata?.subscriptionType || '').toLowerCase();
                              if (transactionType !== serviceFeesFilter.subscriptionType.toLowerCase()) {
                                return false;
                              }
                            }
                            
                            return true;
                          });
                          
                          // Sort
                          filtered.sort((a, b) => {
                            let aVal, bVal;
                            if (serviceFeesFilter.transactionSort === 'date') {
                              aVal = a.date instanceof Date ? a.date : new Date(a.date || 0);
                              bVal = b.date instanceof Date ? b.date : new Date(b.date || 0);
                            } else if (serviceFeesFilter.transactionSort === 'amount') {
                              aVal = a.amount || 0;
                              bVal = b.amount || 0;
                            } else {
                              aVal = (a.metadata?.hostEmail || '').toLowerCase();
                              bVal = (b.metadata?.hostEmail || '').toLowerCase();
                            }
                            
                            if (serviceFeesFilter.transactionSortOrder === 'desc') {
                              return bVal > aVal ? 1 : -1;
                            } else {
                              return aVal > bVal ? 1 : -1;
                            }
                          });

                          return filtered.length > 0 ? (
                            filtered.map((transaction, index) => {
                              const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
                              const subscriptionType = transaction.metadata?.subscriptionType || '';
                              const isMonthly = subscriptionType.toLowerCase() === 'monthly';
                              const isYearly = subscriptionType.toLowerCase() === 'yearly';
                              
                      return (
                                <div key={transaction.id || index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                      <p className="font-semibold text-foreground">{transaction.metadata?.hostEmail || 'Unknown Host'}</p>
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        isMonthly 
                                          ? 'bg-blue-100 text-blue-700' 
                                          : isYearly 
                                          ? 'bg-purple-100 text-purple-700' 
                                          : 'bg-gray-100 text-gray-700'
                                      }`}>
                                        {transaction.metadata?.subscriptionPlan || 'Subscription'} {subscriptionType}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{transaction.description || 'Host Subscription Payment'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                      {date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} • {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="text-right">
                                    <p className="font-bold text-lg text-purple-600">{formatCurrency(transaction.amount)}</p>
                            <p className="text-xs text-muted-foreground">Subscription Fee</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                            <div className="text-center py-12">
                              <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground text-lg">No transactions found</p>
                              <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
                </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Host Management Tab */}
          {activeTab === 'host-management' && (
            <div className="space-y-6">
            <div className="card-listing p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground">Host Management</h2>
                    <p className="text-muted-foreground mt-1">Manage hosts, view performance metrics, and terminate accounts</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreviewClick('host-management')}
                      className="btn-outline flex items-center gap-2"
                      title="Preview Host Management"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                    <button
                      onClick={() => handlePrintClick('host-management')}
                      className="btn-outline flex items-center gap-2"
                      title="Print Host Management Report"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                    <button onClick={() => generateReport('hosts')} className="btn-outline flex items-center gap-2" disabled={generatingReport}>
                      <Download className="w-4 h-4" />
                      Export Report
                    </button>
                  </div>
              </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Total Hosts</p>
                        <p className="text-2xl font-bold text-blue-700">{hosts.length}</p>
                        <p className="text-xs text-blue-600 mt-1">Active Accounts</p>
                      </div>
                      <Users className="w-10 h-10 text-blue-600" />
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-green-900">Total Earnings</p>
                        <p className="text-2xl font-bold text-green-700">
                          {formatCurrency(hosts.reduce((sum, h) => sum + (h.earnings || 0), 0))}
                        </p>
                        <p className="text-xs text-green-600 mt-1">Combined Revenue</p>
                      </div>
                      <DollarSign className="w-10 h-10 text-green-600" />
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-purple-900">Total Listings</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {hosts.reduce((sum, h) => sum + (h.listings || 0), 0)}
                        </p>
                        <p className="text-xs text-purple-600 mt-1">Active Listings</p>
                      </div>
                      <Home className="w-10 h-10 text-purple-600" />
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-orange-900">Total Bookings</p>
                        <p className="text-2xl font-bold text-orange-700">
                          {hosts.reduce((sum, h) => sum + (h.bookings || 0), 0)}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">All Time</p>
                      </div>
                      <Calendar className="w-10 h-10 text-orange-600" />
                    </div>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="mb-6 flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[250px]">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search hosts by name or email..."
                        value={hostManagementFilter.search}
                        onChange={(e) => setHostManagementFilter(prev => ({ ...prev, search: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  <select
                    value={hostManagementFilter.status}
                    onChange={(e) => setHostManagementFilter(prev => ({ ...prev, status: e.target.value }))}
                    className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="all">All Hosts</option>
                    <option value="active">Active Only</option>
                    <option value="terminated">Terminated Only</option>
                  </select>
                  <select
                    value={hostManagementFilter.sortBy}
                    onChange={(e) => setHostManagementFilter(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="earnings">Sort by Earnings</option>
                    <option value="bookings">Sort by Bookings</option>
                    <option value="listings">Sort by Listings</option>
                  </select>
                  <button
                    onClick={() => setHostManagementFilter(prev => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted/50 flex items-center gap-2"
                  >
                    {hostManagementFilter.sortOrder === 'asc' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {hostManagementFilter.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  </button>
                  {(hostManagementFilter.search || hostManagementFilter.status !== 'all') && (
                    <button
                      onClick={() => setHostManagementFilter({
                        search: '',
                        status: 'all',
                        sortBy: 'name',
                        sortOrder: 'asc'
                      })}
                      className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear Filters
                    </button>
                  )}
                </div>

                {/* Hosts List */}
              <div className="space-y-4">
                  {(() => {
                    let filtered = [...hosts];
                    
                    // Apply search filter
                    if (hostManagementFilter.search) {
                      const searchLower = hostManagementFilter.search.toLowerCase();
                      filtered = filtered.filter(host =>
                        host.name.toLowerCase().includes(searchLower) ||
                        host.email.toLowerCase().includes(searchLower)
                      );
                    }
                    
                    // Apply status filter
                    if (hostManagementFilter.status !== 'all') {
                      filtered = filtered.filter(host =>
                        hostManagementFilter.status === 'terminated' ? host.isTerminated : !host.isTerminated
                      );
                    }
                    
                    // Apply sorting
                    filtered.sort((a, b) => {
                      let aVal, bVal;
                      if (hostManagementFilter.sortBy === 'earnings') {
                        aVal = a.earnings || 0;
                        bVal = b.earnings || 0;
                      } else if (hostManagementFilter.sortBy === 'bookings') {
                        aVal = a.bookings || 0;
                        bVal = b.bookings || 0;
                      } else if (hostManagementFilter.sortBy === 'listings') {
                        aVal = a.listings || 0;
                        bVal = b.listings || 0;
                      } else {
                        aVal = a.name.toLowerCase();
                        bVal = b.name.toLowerCase();
                      }
                      
                      if (hostManagementFilter.sortOrder === 'asc') {
                        return aVal > bVal ? 1 : -1;
                      } else {
                        return bVal > aVal ? 1 : -1;
                      }
                    });

                    return filtered.length > 0 ? (
                      <>
                        {(hostManagementFilter.search || hostManagementFilter.status !== 'all') && (
                          <div className="text-sm text-muted-foreground mb-2">
                            Showing {filtered.length} of {hosts.length} hosts
                  </div>
                        )}
                        {filtered.map(host => {
                          const hostServiceFees = Math.round((host.earnings * HOST_COMMISSION_PERCENTAGE) * 100) / 100;
                          const isExpanded = expandedHosts.has(host.userId);
                          return (
                    <div 
                      key={host.userId} 
                              className={`border rounded-lg overflow-hidden ${
                        host.isTerminated 
                          ? 'border-red-300 bg-red-50/50' 
                          : 'border-border bg-card'
                      }`}
                    >
                              <div className="flex items-start justify-between p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-foreground">{host.name}</h3>
                            {host.isTerminated && (
                              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                Terminated
                              </span>
                            )}
                                    {!host.isTerminated && host.listings > 0 && (
                                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                        Active
                                      </span>
                                    )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{host.email}</p>
                                  <div className="flex flex-wrap gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Home className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">{host.listings} {host.listings === 1 ? 'listing' : 'listings'}</span>
                                    </div>
                            <span>•</span>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">{host.bookings} {host.bookings === 1 ? 'booking' : 'bookings'}</span>
                                    </div>
                            <span>•</span>
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="w-4 h-4 text-green-600" />
                                      <span className="font-semibold text-green-600">{formatCurrency(host.earnings)}</span>
                                    </div>
                            {host.reviewCount > 0 && (
                              <>
                                <span>•</span>
                                        <div className="flex items-center gap-1">
                                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                          <span className="font-medium">{host.rating.toFixed(1)}</span>
                                          <span className="text-muted-foreground">({host.reviewCount})</span>
                                        </div>
                              </>
                            )}
                          </div>
                          {host.isTerminated && host.terminatedAt && (
                            <p className="text-xs text-red-600 mt-2">
                              Terminated on {formatDate(host.terminatedAt)}
                            </p>
                          )}
                        </div>
                                <div className="flex items-center gap-3 ml-4">
                        {!host.isTerminated && (
                                    <>
                                      <button
                                        onClick={() => {
                                          const newExpanded = new Set(expandedHosts);
                                          if (newExpanded.has(host.userId)) {
                                            newExpanded.delete(host.userId);
                                          } else {
                                            newExpanded.add(host.userId);
                                          }
                                          setExpandedHosts(newExpanded);
                                        }}
                                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                                        title={isExpanded ? "Hide details" : "Show details"}
                                      >
                                        {isExpanded ? <X className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      </button>
                          <button
                            onClick={() => {
                              setSelectedHostForTermination(host);
                              setShowTerminateHostDialog(true);
                            }}
                            disabled={terminatingHost === host.userId}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {terminatingHost === host.userId ? (
                              <>
                                <Clock className="w-4 h-4 animate-spin" />
                                Terminating...
                              </>
                            ) : (
                              <>
                                <Ban className="w-4 h-4" />
                                            Terminate
                              </>
                            )}
                          </button>
                                    </>
                        )}
                      </div>
                    </div>
                              
                              {isExpanded && !host.isTerminated && (
                                <div className="border-t border-border bg-muted/20 p-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground mb-1">Total Bookings</p>
                                      <p className="font-semibold text-lg">{host.bookings}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground mb-1">Total Earnings</p>
                                      <p className="font-semibold text-lg text-green-600">{formatCurrency(host.earnings)}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground mb-1">Commission (10%)</p>
                                      <p className="font-semibold text-lg text-blue-600">{formatCurrency(hostServiceFees)}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground mb-1">Host Receives (90%)</p>
                                      <p className="font-semibold text-lg text-purple-600">{formatCurrency(host.earnings - hostServiceFees)}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground mb-1">Active Listings</p>
                                      <p className="font-semibold">{host.listings}</p>
                                    </div>
                                    {host.reviewCount > 0 && (
                                      <>
                                        <div>
                                          <p className="text-muted-foreground mb-1">Average Rating</p>
                                          <p className="font-semibold flex items-center gap-1">
                                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                            {host.rating.toFixed(1)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground mb-1">Total Reviews</p>
                                          <p className="font-semibold">{host.reviewCount}</p>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground text-lg">No hosts found</p>
                        {(hostManagementFilter.search || hostManagementFilter.status !== 'all') && (
                          <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Platform Settings Tab */}
          {activeTab === 'platform-settings' && (
            <div className="space-y-6">
              <div className="card-listing p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground">Platform Settings</h2>
                    <p className="text-muted-foreground mt-1">Manage payment methods, PayPal configuration, and platform settings</p>
                  </div>
                  <button
                    onClick={loadPlatformSettings}
                    className="btn-outline flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                {/* Payment Methods Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h3 className="font-heading text-xl font-bold text-foreground">Payment Methods</h3>
                  </div>
                  <div className="space-y-4">
                    {/* PayPal Settings */}
                    <div className="border border-border rounded-lg p-6 bg-card">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg text-foreground">PayPal Merchant Account</h4>
                            <p className="text-sm text-muted-foreground">Configure PayPal account for receiving payments</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {platformSettings.adminPayPalEmail && (
                            <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              Configured
                            </span>
                          )}
                          {!platformSettings.adminPayPalEmail && (
                            <span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                              Not Configured
                            </span>
                          )}
                        </div>
                      </div>

                      {!isEditingPayPal ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-muted-foreground mb-2">
                                PayPal Email
                              </label>
                              <div className="p-3 bg-muted/50 border border-border rounded-lg">
                                <p className="font-medium text-foreground">
                                  {platformSettings.adminPayPalEmail || 'Not set'}
                                </p>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-muted-foreground mb-2">
                                Account Name
                              </label>
                              <div className="p-3 bg-muted/50 border border-border rounded-lg">
                                <p className="font-medium text-foreground">
                                  {platformSettings.adminPayPalAccountName || 'Not set'}
                                </p>
                              </div>
                            </div>
                          </div>
                          {platformSettings.updatedAt && (
                            <div className="text-sm text-muted-foreground">
                              Last updated: {formatDate(platformSettings.updatedAt?.toDate ? platformSettings.updatedAt.toDate() : new Date(platformSettings.updatedAt || Date.now()))}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setIsEditingPayPal(true);
                              setPayPalEmailInput(platformSettings.adminPayPalEmail || '');
                              setPayPalAccountNameInput(platformSettings.adminPayPalAccountName || '');
                            }}
                            className="btn-primary flex items-center gap-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            {platformSettings.adminPayPalEmail ? 'Edit PayPal Settings' : 'Configure PayPal'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                PayPal Email <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="email"
                                value={payPalEmailInput}
                                onChange={(e) => setPayPalEmailInput(e.target.value)}
                                placeholder="merchant@example.com"
                                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                This email will receive all PayPal payments
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
                                placeholder="Merchant Account"
                                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleSavePayPalSettings}
                              disabled={isSavingPayPal || !payPalEmailInput}
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
                                  Save Settings
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
                              className="btn-outline flex items-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900">
                              <strong>Note:</strong> All PayPal payments from bookings will be sent to this merchant account. 
                              Ensure this account is properly verified and has transaction capabilities enabled.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* GetPay Wallet Info */}
                    <div className="border border-border rounded-lg p-6 bg-card">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg text-foreground">GetPay Wallet</h4>
                            <p className="text-sm text-muted-foreground">Internal wallet system for transactions</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          Active
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Wallet System</p>
                            <p className="font-semibold text-foreground">GetPay</p>
                          </div>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Payment Type</p>
                            <p className="font-semibold text-foreground">Internal Wallet</p>
                          </div>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Status</p>
                            <p className="font-semibold text-green-600">Enabled</p>
                          </div>
                        </div>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-900">
                            <strong>Info:</strong> GetPay is the default payment method. All booking payments are processed through the GetPay wallet system. 
                            Admin wallet receives payments from guests, and hosts receive their earnings immediately when bookings are confirmed.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Processing Settings */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-primary" />
                    <h3 className="font-heading text-xl font-bold text-foreground">Payment Processing</h3>
                  </div>
                  <div className="border border-border rounded-lg p-6 bg-card">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Commission Rate</p>
                          <p className="text-2xl font-bold text-foreground">10%</p>
                          <p className="text-xs text-muted-foreground mt-1">Applied to all bookings</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Host Receives</p>
                          <p className="text-2xl font-bold text-green-600">90%</p>
                          <p className="text-xs text-muted-foreground mt-1">Of booking amount</p>
                        </div>
                      </div>
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-900">
                          <strong>Payment Flow:</strong> When a guest makes a booking payment, the full amount goes to the admin GetPay wallet. 
                          Upon booking completion, 90% is released to the host wallet, and 10% is retained as commission.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Review Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-primary" />
                      <h3 className="font-heading text-xl font-bold text-foreground">Payment Review & History</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="btn-outline flex items-center gap-2 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View All Transactions
                    </button>
                  </div>
                  <div className="border border-border rounded-lg p-6 bg-card">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-blue-900">Payment Methods</p>
                            <p className="text-xl font-bold text-blue-700">2 Active</p>
                          </div>
                          <CreditCard className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-xs text-blue-600 mt-1">GetPay & PayPal</p>
                      </div>
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-green-900">Total Transactions</p>
                            <p className="text-xl font-bold text-green-700">{allMoneyTransactions.length}</p>
                          </div>
                          <Receipt className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-xs text-green-600 mt-1">All time</p>
                      </div>
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-purple-900">Payment Providers</p>
                            <p className="text-xl font-bold text-purple-700">PayPal Connected</p>
                          </div>
                          <CheckCircle className="w-8 h-8 text-purple-600" />
                        </div>
                        <p className="text-xs text-purple-600 mt-1">
                          {platformSettings.adminPayPalEmail ? 'Active' : 'Not configured'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground mb-2">Quick Actions</h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setActiveTab('transactions')}
                          className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Review All Payments
                        </button>
                        <button
                          onClick={() => setActiveTab('service-fees')}
                          className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 flex items-center gap-2"
                        >
                          <DollarSign className="w-4 h-4" />
                          View Service Fees
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Confirmation Settings */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <h3 className="font-heading text-xl font-bold text-foreground">Payment Confirmation</h3>
                  </div>
                  <div className="border border-border rounded-lg p-6 bg-card">
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-2">Automatic Payment Processing</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              Payments are automatically processed when hosts confirm bookings. The system handles both GetPay wallet and PayPal payments.
                            </p>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span>GetPay wallet payments are instant</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span>PayPal payments are verified upon booking confirmation</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span>All payments are logged in transaction history</span>
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            Enabled
                          </span>
                        </div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold text-foreground mb-2">Payment Confirmation Flow</h4>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>1. Guest initiates booking with payment</p>
                          <p>2. Host confirms booking → Payment is automatically processed</p>
                          <p>3. Funds are transferred to admin GetPay wallet</p>
                          <p>4. Admin reviews and releases earnings after booking completion</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Policy & Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="card-listing p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground">Policy & Compliance Management</h2>
                    <p className="text-muted-foreground mt-1">Manage all platform policies, rules, and regulations</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreviewClick('compliance')}
                      className="btn-outline flex items-center gap-2"
                      title="Preview Policies"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                    <button
                      onClick={() => handlePrintClick('compliance')}
                      className="btn-outline flex items-center gap-2"
                      title="Print Policies"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                  </div>
                </div>
                
                {/* Search and Filter */}
                <div className="mb-6 flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[250px]">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search policies by title or content..."
                        value={complianceFilter.search}
                        onChange={(e) => setComplianceFilter(prev => ({ ...prev, search: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  {(complianceFilter.search || complianceFilter.type !== 'all') && (
                    <button
                      onClick={() => setComplianceFilter({ search: '', type: 'all' })}
                      className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
              
              <div className="max-w-7xl mx-auto px-6">
                <PolicyManagement searchFilter={complianceFilter.search} />
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
            <div className="card-listing p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Report Generation</h2>
                      <p className="text-muted-foreground">Generate comprehensive reports with date range filtering and preview capabilities</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreviewClick('reports')}
                        className="btn-outline flex items-center gap-2"
                        title="Preview Reports"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      <button
                        onClick={() => handlePrintClick('reports')}
                        className="btn-outline flex items-center gap-2"
                        title="Print Reports"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </button>
                    </div>
                  </div>
                  
                  {/* Search and Filter */}
                  <div className="flex gap-4 flex-wrap items-center">
                    <div className="flex-1 min-w-[250px]">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search reports..."
                          value={reportsFilter.search}
                          onChange={(e) => setReportsFilter(prev => ({ ...prev, search: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>
                    <select
                      value={reportsFilter.type}
                      onChange={(e) => setReportsFilter(prev => ({ ...prev, type: e.target.value }))}
                      className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="all">All Report Types</option>
                      <option value="financial">Financial</option>
                      <option value="bookings">Bookings</option>
                      <option value="users">Users</option>
                      <option value="reviews">Reviews</option>
                      <option value="hosts">Hosts</option>
                      <option value="compliance">Compliance</option>
                    </select>
                    {(reportsFilter.search || reportsFilter.type !== 'all') && (
                      <button
                        onClick={() => setReportsFilter({ search: '', type: 'all' })}
                        className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { 
                      id: 'financial', 
                      label: 'Financial Report', 
                      icon: DollarSign, 
                      description: 'Revenue, fees, and payment analytics',
                      color: 'blue'
                    },
                    { 
                      id: 'bookings', 
                      label: 'Bookings Report', 
                      icon: Calendar, 
                      description: 'Complete booking history and statistics',
                      color: 'green'
                    },
                    { 
                      id: 'users', 
                      label: 'Users Report', 
                      icon: Users, 
                      description: 'User growth and activity metrics',
                      color: 'purple'
                    },
                    { 
                      id: 'reviews', 
                      label: 'Reviews Report', 
                      icon: Star, 
                      description: 'Review analysis and ratings breakdown',
                      color: 'yellow'
                    },
                    { 
                      id: 'hosts', 
                      label: 'Hosts Report', 
                      icon: Home, 
                      description: 'Host performance and earnings',
                      color: 'orange'
                    },
                    { 
                      id: 'compliance', 
                      label: 'Compliance Report', 
                      icon: Shield, 
                      description: 'Policy violations and compliance status',
                      color: 'red'
                    }
                ].filter(report => {
                  // Filter by search
                  if (reportsFilter.search) {
                    const searchLower = reportsFilter.search.toLowerCase();
                    if (!report.label.toLowerCase().includes(searchLower) &&
                        !report.description.toLowerCase().includes(searchLower)) {
                      return false;
                    }
                  }
                  // Filter by type
                  if (reportsFilter.type !== 'all' && report.id !== reportsFilter.type) {
                    return false;
                  }
                  return true;
                }).map(report => {
                  const ReportIcon = report.icon;
                    const colorClasses = {
                      blue: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
                      green: 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100',
                      purple: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100',
                      yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
                      orange: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100',
                      red: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100'
                    };
                  return (
                  <div
                    key={report.id}
                        className={`p-6 border-2 rounded-lg transition-all transform hover:scale-105 relative ${colorClasses[report.color]}`}
                  >
                    {generatingReport && (
                          <div className="absolute top-3 right-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
                      </div>
                    )}
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-lg bg-white/50`}>
                            <ReportIcon className="w-6 h-6" />
                          </div>
                          <h3 className="font-semibold text-lg flex-1">{report.label}</h3>
                        </div>
                        <p className="text-sm opacity-80 mb-4">{report.description}</p>
                        
                        {/* Preview Button - Must be clicked first */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReportType(report.id);
                            setDateRange({ startDate: '', endDate: '' });
                            setDateRangePreset('all');
                            setPreviewData(null);
                            setPreviewHeaders([]);
                            setShowPreview(false);
                            setShowDateRangeModal(true);
                          }}
                          disabled={generatingReport}
                          className="w-full px-4 py-2 bg-white/80 hover:bg-white border-2 border-current rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Eye className="w-4 h-4" />
                          Preview Report
                        </button>
                        <div className="mt-2 text-xs text-center opacity-60">
                          Preview required before export
                        </div>
                  </div>
                  );
                })}
                </div>

                {/* Report Features Info */}
                <div className="mt-8 p-4 bg-muted/50 border border-border rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Report Features
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Date range filtering for all reports
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Preview data before downloading
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Export to PDF format
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Comprehensive data with all relevant fields
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>


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

      {/* Date Range Filter Modal for Reports */}
      <AlertDialog open={showDateRangeModal} onOpenChange={(open) => {
        setShowDateRangeModal(open);
        if (!open) {
          setShowPreview(false);
          setPreviewData(null);
          setPreviewHeaders([]);
        }
      }}>
        <AlertDialogContent className="bg-white max-w-6xl max-h-[95vh] flex flex-col">
          <AlertDialogHeader className="flex-shrink-0">
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filter Export Date Range - {selectedReportType && selectedReportType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Select a date range preset or choose custom dates to filter the report, preview the data, then download.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-4 space-y-4 flex-1 overflow-y-auto min-h-0">
            {/* Quick Date Range Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Quick Date Range
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={async () => {
                    setDateRangePreset('all');
                    setDateRange({ startDate: '', endDate: '' });
                    setShowPreview(false);
                    setPreviewData(null);
                    // Auto-refresh preview after a short delay
                    setTimeout(() => {
                      if (selectedReportType) {
                        handlePreviewReport();
                      }
                    }, 100);
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    dateRangePreset === 'all'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={async () => {
                    setDateRangePreset('7days');
                    setDateRange({ startDate: '', endDate: '' });
                    setShowPreview(false);
                    setPreviewData(null);
                    // Auto-refresh preview after a short delay
                    setTimeout(() => {
                      if (selectedReportType) {
                        handlePreviewReport();
                      }
                    }, 100);
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    dateRangePreset === '7days'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={async () => {
                    setDateRangePreset('30days');
                    setDateRange({ startDate: '', endDate: '' });
                    setShowPreview(false);
                    setPreviewData(null);
                    // Auto-refresh preview after a short delay
                    setTimeout(() => {
                      if (selectedReportType) {
                        handlePreviewReport();
                      }
                    }, 100);
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    dateRangePreset === '30days'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={async () => {
                    setDateRangePreset('3months');
                    setDateRange({ startDate: '', endDate: '' });
                    setShowPreview(false);
                    setPreviewData(null);
                    // Auto-refresh preview after a short delay
                    setTimeout(() => {
                      if (selectedReportType) {
                        handlePreviewReport();
                      }
                    }, 100);
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    dateRangePreset === '3months'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  Last 3 Months
                </button>
                <button
                  onClick={async () => {
                    setDateRangePreset('6months');
                    setDateRange({ startDate: '', endDate: '' });
                    setShowPreview(false);
                    setPreviewData(null);
                    // Auto-refresh preview after a short delay
                    setTimeout(() => {
                      if (selectedReportType) {
                        handlePreviewReport();
                      }
                    }, 100);
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    dateRangePreset === '6months'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  Last 6 Months
                </button>
                <button
                  onClick={async () => {
                    setDateRangePreset('1year');
                    setDateRange({ startDate: '', endDate: '' });
                    setShowPreview(false);
                    setPreviewData(null);
                    // Auto-refresh preview after a short delay
                    setTimeout(() => {
                      if (selectedReportType) {
                        handlePreviewReport();
                      }
                    }, 100);
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    dateRangePreset === '1year'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  Last Year
                </button>
                <button
                  onClick={() => {
                    setDateRangePreset('custom');
                    // Don't auto-refresh for custom, wait for user to select dates
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    dateRangePreset === 'custom'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  Custom Range
                </button>
              </div>
            </div>

            {/* Custom Date Range Inputs */}
            {dateRangePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={dateRange.startDate}
                    onChange={async (e) => {
                      const newStartDate = e.target.value;
                      setDateRange(prev => {
                        const updated = { ...prev, startDate: newStartDate };
                        // Auto-refresh preview when both dates are set
                        if (newStartDate && updated.endDate) {
                          setTimeout(() => {
                            if (selectedReportType) {
                              // Use updated state values
                              const dateFilter = {
                                startDate: new Date(newStartDate),
                                endDate: new Date(updated.endDate)
                              };
                              dateFilter.startDate.setHours(0, 0, 0, 0);
                              dateFilter.endDate.setHours(23, 59, 59, 999);
                              
                              // Call preview with the correct date filter
                              handlePreviewReportWithFilter(dateFilter);
                            }
                          }, 300);
                        }
                        return updated;
                      });
                      setShowPreview(false);
                      setPreviewData(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={dateRange.endDate}
                    onChange={async (e) => {
                      const newEndDate = e.target.value;
                      setDateRange(prev => {
                        const updated = { ...prev, endDate: newEndDate };
                        // Auto-refresh preview when both dates are set
                        if (updated.startDate && newEndDate) {
                          setTimeout(() => {
                            if (selectedReportType) {
                              // Use updated state values
                              const dateFilter = {
                                startDate: new Date(updated.startDate),
                                endDate: new Date(newEndDate)
                              };
                              dateFilter.startDate.setHours(0, 0, 0, 0);
                              dateFilter.endDate.setHours(23, 59, 59, 999);
                              
                              // Call preview with the correct date filter
                              handlePreviewReportWithFilter(dateFilter);
                            }
                          }, 300);
                        }
                        return updated;
                      });
                      setShowPreview(false);
                      setPreviewData(null);
                    }}
                    min={dateRange.startDate || undefined}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                {dateRange.startDate && dateRange.endDate && new Date(dateRange.startDate) > new Date(dateRange.endDate) && (
                  <div className="col-span-2">
                    <p className="text-sm text-red-600">End date must be after start date.</p>
                  </div>
                )}
              </div>
            )}

            {/* Display selected preset info */}
            {dateRangePreset !== 'all' && dateRangePreset !== 'custom' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Selected:</strong> {
                    dateRangePreset === '7days' ? 'Last 7 Days' :
                    dateRangePreset === '30days' ? 'Last 30 Days' :
                    dateRangePreset === '3months' ? 'Last 3 Months' :
                    dateRangePreset === '6months' ? 'Last 6 Months' :
                    dateRangePreset === '1year' ? 'Last Year' : ''
                  }
                </p>
              </div>
            )}

            {/* Instructions */}
            {!showPreview && !isLoadingPreview && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Instructions:</strong> Select a date range preset above, or choose "Custom Range" to select specific dates. 
                  Click "Preview Report" below to load and preview the data. You can then export it as PDF or print it.
                </p>
              </div>
            )}

            {/* Preview Section */}
            {showPreview && previewData !== null && (
              <div className="mt-6 border-t pt-4 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Preview ({Array.isArray(previewData) ? previewData.length : 0} records)</h3>
                    {(() => {
                      const dateFilter = getDateRangeFromPreset(dateRangePreset);
                      if (dateFilter) {
                        return (
                          <p className="text-sm text-gray-500 mt-1">
                            Date Range: {dateFilter.startDate.toLocaleDateString()} - {dateFilter.endDate.toLocaleDateString()}
                          </p>
                        );
                      }
                      return <p className="text-sm text-gray-500 mt-1">All Time</p>;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowPreview(false);
                        setPreviewData(null);
                      }}
                      className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded hover:bg-gray-100"
                    >
                      Hide Preview
                    </button>
                  </div>
                </div>
                
                {!Array.isArray(previewData) || previewData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 flex-1 flex items-center justify-center">
                    <div>
                      <p>No data found for the selected date range.</p>
                      <p className="text-sm mt-2">Try adjusting your date range or check if there's data in the database.</p>
                    </div>
                  </div>
                ) : previewHeaders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 flex-1 flex items-center justify-center">
                    <p>No headers available for this report.</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="overflow-auto border border-gray-200 rounded-lg flex-1 min-h-0">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            {previewHeaders.map((header, index) => (
                              <th
                                key={index}
                                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                              >
                                {header.label || header.key || `Column ${index + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewData.slice(0, 50).map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50">
                              {previewHeaders.map((header, colIndex) => {
                                const headerKey = header.key || header.label;
                                let value = row[headerKey];
                                if (value === null || value === undefined) value = 'N/A';
                                else if (value instanceof Date) {
                                  value = value.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  });
                                } else if (typeof value === 'boolean') {
                                  value = value ? 'Yes' : 'No';
                                } else if (typeof value === 'number' && (headerKey.includes('Price') || headerKey.includes('Amount') || headerKey.includes('Fee') || headerKey.includes('Earnings') || headerKey.includes('Commission'))) {
                                  value = formatCurrency(value);
                                }
                                return (
                                  <td
                                    key={colIndex}
                                    className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap"
                                  >
                                    {String(value)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewData.length > 50 && (
                      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-600 text-center border-t border-gray-200 flex-shrink-0">
                        Showing first 50 of {previewData.length} records. Full data will be included in export.
                      </div>
                    )}
                  </div>
                )}
                    
                {/* Print and Export buttons in preview */}
                {showPreview && previewData && previewData.length > 0 && (
                  <div className="mt-4 flex items-center justify-end gap-3 flex-shrink-0">
                      <button
                        onClick={async () => {
                          if (!selectedReportType || !previewData) return;
                          
                          const dateFilter = dateRange.startDate && dateRange.endDate
                            ? {
                                startDate: new Date(dateRange.startDate),
                                endDate: new Date(dateRange.endDate)
                              }
                            : null;
                          
                          // Generate print content
                          const printWindow = window.open('', '_blank');
                          if (!printWindow) {
                            toast.error('Please allow popups to print');
                            return;
                          }
                          
                          let printContent = `<html><head><title>${selectedReportType} Report</title><style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th { background-color: #f3f4f6; padding: 10px; text-align: left; border: 1px solid #ddd; }
                            td { padding: 8px; border: 1px solid #ddd; }
                            .header { margin-bottom: 20px; }
                            .date-range { color: #666; margin-bottom: 10px; }
                          </style></head><body>
                            <div class="header">
                              <h1>${selectedReportType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Report</h1>
                              ${dateFilter ? `<div class="date-range">Date Range: ${dateFilter.startDate.toLocaleDateString()} - ${dateFilter.endDate.toLocaleDateString()}</div>` : '<div class="date-range">All Time</div>'}
                              <div class="date-range">Total Records: ${previewData.length}</div>
                              <div class="date-range">Generated: ${new Date().toLocaleString()}</div>
                            </div>
                            <table>
                              <thead><tr>${previewHeaders.map(h => `<th>${h.label}</th>`).join('')}</tr></thead>
                              <tbody>
                                ${previewData.map(row => `<tr>${previewHeaders.map(header => {
                                  let value = row[header.key];
                                  if (value === null || value === undefined) value = 'N/A';
                                  else if (value instanceof Date) {
                                    value = value.toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    });
                                  } else if (typeof value === 'boolean') {
                                    value = value ? 'Yes' : 'No';
                                  } else if (typeof value === 'number' && (header.key.includes('Price') || header.key.includes('Amount') || header.key.includes('Fee') || header.key.includes('Earnings'))) {
                                    value = formatCurrency(value).replace('₱', 'PHP ');
                                  }
                                  return `<td>${String(value)}</td>`;
                                }).join('')}</tr>`).join('')}
                              </tbody>
                            </table>
                          </body></html>`;
                          
                          printWindow.document.write(printContent);
                          printWindow.document.close();
                          printWindow.print();
                          
                          toast.success('Print preview opened');
                        }}
                        className="btn-outline flex items-center gap-2"
                        disabled={!previewData || previewData.length === 0}
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </button>
                      
                      <button
                        onClick={handleDownloadReport}
                        className="btn-primary flex items-center gap-2"
                        disabled={generatingReport || !previewData || previewData.length === 0}
                      >
                        {generatingReport ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Export PDF
                          </>
                        )}
                      </button>
                    </div>
                  )}
              </div>
            )}

            {isLoadingPreview && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-gray-500">Loading preview...</p>
              </div>
            )}
          </div>

          <AlertDialogFooter className="mt-6 flex-wrap gap-2 flex-shrink-0 border-t pt-4">
            <AlertDialogCancel
              onClick={() => {
                setShowDateRangeModal(false);
                setDateRange({ startDate: '', endDate: '' });
                setPreviewData(null);
                setPreviewHeaders([]);
                setShowPreview(false);
                setSelectedReportType(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            {!showPreview && (
              <AlertDialogAction
                onClick={handlePreviewReport}
                disabled={isLoadingPreview || !selectedReportType || (dateRangePreset === 'custom' && dateRange.startDate && dateRange.endDate && new Date(dateRange.startDate) > new Date(dateRange.endDate))}
              >
                {isLoadingPreview ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2 inline-block"></div>
                    Loading Preview...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2 inline-block" />
                    Refresh Preview
                  </>
                )}
              </AlertDialogAction>
            )}
            {showPreview && (
              <AlertDialogAction
                onClick={handlePreviewReport}
                disabled={isLoadingPreview || !selectedReportType || (dateRange.startDate && dateRange.endDate && new Date(dateRange.startDate) > new Date(dateRange.endDate))}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoadingPreview ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2 inline-block"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2 inline-block" />
                    Refresh Preview
                  </>
                )}
              </AlertDialogAction>
            )}
            {showPreview && previewData && previewData.length === 0 && (
              <AlertDialogAction
                onClick={() => {
                  setShowPreview(false);
                  setPreviewData(null);
                }}
              >
                Close
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Section Preview Modal */}
      <AlertDialog open={showSectionPreview} onOpenChange={setShowSectionPreview}>
        <AlertDialogContent className="bg-white max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  {previewSection && getPreviewData(previewSection).title}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600">
                  Preview of filtered data
                </AlertDialogDescription>
              </div>
              <button
                onClick={() => setShowSectionPreview(false)}
                className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close preview"
                title="Close (ESC)"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </AlertDialogHeader>
          
          <div className="mt-4 flex-1 overflow-y-auto pr-2">
            {previewSection && (() => {
              const preview = getPreviewData(previewSection);
              const { data } = preview;
              
              if (previewSection === 'overview') {
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">Total Users</p>
                        <p className="text-2xl font-bold text-blue-900">{data.stats?.totalUsers || 0}</p>
                      </div>
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700">Total Bookings</p>
                        <p className="text-2xl font-bold text-green-900">{data.bookings?.length || 0}</p>
                      </div>
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm text-purple-700">Total Reviews</p>
                        <p className="text-2xl font-bold text-purple-900">{data.reviews?.length || 0}</p>
                      </div>
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-700">Total Revenue</p>
                        <p className="text-2xl font-bold text-orange-900">{formatCurrency(data.stats?.totalRevenue || 0)}</p>
                      </div>
                    </div>
                    {data.bookings && data.bookings.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Bookings ({data.bookings.length})</h3>
                        <div className="space-y-2">
                          {data.bookings.map((booking, idx) => (
                            <div key={idx} className="p-3 border border-gray-200 rounded-lg text-sm">
                              <p className="font-medium">{booking.listingTitle || 'N/A'}</p>
                              <p className="text-gray-600 text-xs">Guest: {booking.guestName || 'N/A'} • {formatDate(booking.createdAt)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.reviews && data.reviews.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Reviews ({data.reviews.length})</h3>
                        <div className="space-y-2">
                          {data.reviews.map((review, idx) => (
                            <div key={idx} className="p-3 border border-gray-200 rounded-lg text-sm">
                              <p className="font-medium">{review.listingTitle || 'N/A'}</p>
                              <p className="text-gray-600 text-xs">Rating: {review.rating || 'N/A'} • {formatDate(review.createdAt)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              } else if (previewSection === 'transactions') {
                return (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-2">Showing {data.length} transactions</p>
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                      {data.map((transaction, idx) => {
                        const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date || transaction.createdAt);
                        return (
                          <div key={idx} className="p-3 border border-gray-200 rounded-lg text-sm mb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{transaction.description || 'Transaction'}</p>
                                <p className="text-gray-600 text-xs">{transaction.userName || transaction.userEmail || 'Unknown'}</p>
                                <p className="text-gray-500 text-xs">{formatDate(date)}</p>
                              </div>
                              <p className={`font-bold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount || 0)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              } else if (previewSection === 'earnings') {
                return (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-2">Showing {data.length} pending earnings</p>
                    {data.map((earning, idx) => (
                      <div key={idx} className="p-3 border border-gray-200 rounded-lg text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{earning.listingTitle || 'N/A'}</p>
                            <p className="text-gray-600 text-xs">Host: {earning.hostName || earning.hostEmail || 'Unknown'}</p>
                            <p className="text-gray-500 text-xs">{formatDate(earning.completedAt)}</p>
                          </div>
                          <p className="font-bold text-green-600">{formatCurrency(earning.hostEarnings || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              } else if (previewSection === 'service-fees') {
                return (
                  <div className="space-y-4">
                    {data.hosts && data.hosts.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Hosts ({data.hosts.length})</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {data.hosts.slice(0, 10).map((host, idx) => {
                            const hostServiceFees = Math.round((host.earnings * HOST_COMMISSION_PERCENTAGE) * 100) / 100;
                            return (
                              <div key={idx} className="p-3 border border-gray-200 rounded-lg text-sm">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">{host.name || 'Unknown'}</p>
                                    <p className="text-gray-600 text-xs">{host.email || 'N/A'}</p>
                                  </div>
                                  <p className="font-bold text-green-600">{formatCurrency(hostServiceFees)}</p>
                                </div>
                              </div>
                            );
                          })}
                          {data.hosts.length > 10 && (
                            <p className="text-sm text-gray-500 text-center">... and {data.hosts.length - 10} more</p>
                          )}
                        </div>
                      </div>
                    )}
                    {data.transactions && data.transactions.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Transactions ({data.transactions.length})</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {data.transactions.slice(0, 10).map((transaction, idx) => {
                            const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
                            return (
                              <div key={idx} className="p-3 border border-gray-200 rounded-lg text-sm">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">{transaction.metadata?.hostEmail || 'Unknown'}</p>
                                    <p className="text-gray-500 text-xs">{formatDate(date)}</p>
                                  </div>
                                  <p className="font-bold text-purple-600">{formatCurrency(transaction.amount || 0)}</p>
                                </div>
                              </div>
                            );
                          })}
                          {data.transactions.length > 10 && (
                            <p className="text-sm text-gray-500 text-center">... and {data.transactions.length - 10} more</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              } else if (previewSection === 'host-management') {
                return (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-2">Showing {data.length} hosts</p>
                    {data.map((host, idx) => (
                      <div key={idx} className="p-3 border border-gray-200 rounded-lg text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{host.name || 'Unknown'}</p>
                            <p className="text-gray-600 text-xs">{host.email || 'N/A'}</p>
                            <p className="text-gray-500 text-xs">
                              {host.listings} listings • {host.bookings} bookings
                            </p>
                          </div>
                          <p className="font-bold text-green-600">{formatCurrency(host.earnings || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              } else if (previewSection === 'compliance') {
                return (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-900">{data.message || 'Use the search filter above to filter policies.'}</p>
                  </div>
                );
              } else if (previewSection === 'reports') {
                return (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-4">Available Report Types ({data.length})</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.map((report, idx) => (
                        <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{report.icon}</span>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">{report.label}</h4>
                              <p className="text-sm text-gray-600">{report.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {data.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No reports match your filters</p>
                    )}
                  </div>
                );
              }
              
              return <p className="text-gray-500">No preview data available</p>;
            })()}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSectionPreview(false)}>Close</AlertDialogAction>
            {previewSection && (
              <AlertDialogAction
                onClick={() => {
                  setShowSectionPreview(false);
                  handlePrintClick(previewSection);
                }}
                className="bg-primary hover:bg-primary/90"
              >
                <Printer className="w-4 h-4 inline mr-2" />
                Print
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Modal with Date Range Filter */}
      <AlertDialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <AlertDialogContent className="bg-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Print {printSection === 'overview' ? 'Overview' : printSection === 'transactions' ? 'Transactions' : printSection === 'earnings' ? 'Earnings' : printSection === 'service-fees' ? 'Service Fees' : printSection === 'host-management' ? 'Host Management' : 'Report'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select a date range preset or choose custom dates to filter the data before printing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Quick Date Range Presets for Print */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Quick Date Range</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    setPrintDateRangePreset('all');
                    setPrintDateRange({ startDate: '', endDate: '' });
                  }}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    printDateRangePreset === 'all'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => {
                    setPrintDateRangePreset('7days');
                    setPrintDateRange({ startDate: '', endDate: '' });
                  }}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    printDateRangePreset === '7days'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => {
                    setPrintDateRangePreset('30days');
                    setPrintDateRange({ startDate: '', endDate: '' });
                  }}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    printDateRangePreset === '30days'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => {
                    setPrintDateRangePreset('3months');
                    setPrintDateRange({ startDate: '', endDate: '' });
                  }}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    printDateRangePreset === '3months'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  Last 3 Months
                </button>
                <button
                  onClick={() => {
                    setPrintDateRangePreset('6months');
                    setPrintDateRange({ startDate: '', endDate: '' });
                  }}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    printDateRangePreset === '6months'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  Last 6 Months
                </button>
                <button
                  onClick={() => {
                    setPrintDateRangePreset('1year');
                    setPrintDateRange({ startDate: '', endDate: '' });
                  }}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    printDateRangePreset === '1year'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  Last Year
                </button>
                <button
                  onClick={() => {
                    setPrintDateRangePreset('custom');
                  }}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    printDateRangePreset === 'custom'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  Custom Range
                </button>
              </div>
            </div>

            {/* Custom Date Range Inputs for Print */}
            {printDateRangePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <Label htmlFor="print-start-date" className="text-sm font-medium">Start Date</Label>
                  <Input
                    id="print-start-date"
                    type="date"
                    value={printDateRange.startDate}
                    onChange={(e) => setPrintDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="print-end-date" className="text-sm font-medium">End Date</Label>
                  <Input
                    id="print-end-date"
                    type="date"
                    value={printDateRange.endDate}
                    onChange={(e) => setPrintDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="mt-1"
                    min={printDateRange.startDate}
                  />
                </div>
                {printDateRange.startDate && printDateRange.endDate && new Date(printDateRange.startDate) > new Date(printDateRange.endDate) && (
                  <div className="col-span-2">
                    <p className="text-sm text-red-600">End date must be after start date.</p>
                  </div>
                )}
              </div>
            )}

            {/* Display selected preset info for print */}
            {printDateRangePreset !== 'all' && printDateRangePreset !== 'custom' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Selected:</strong> {
                    printDateRangePreset === '7days' ? 'Last 7 Days' :
                    printDateRangePreset === '30days' ? 'Last 30 Days' :
                    printDateRangePreset === '3months' ? 'Last 3 Months' :
                    printDateRangePreset === '6months' ? 'Last 6 Months' :
                    printDateRangePreset === '1year' ? 'Last Year' : ''
                  }
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowPrintModal(false);
                setPrintDateRange({ startDate: '', endDate: '' });
                setPrintDateRangePreset('all');
                setPrintSection(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePrint}
              disabled={isPrinting || (printDateRangePreset === 'custom' && printDateRange.startDate && printDateRange.endDate && new Date(printDateRange.startDate) > new Date(printDateRange.endDate))}
              className="bg-primary hover:bg-primary/90"
            >
              {isPrinting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Printing...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
