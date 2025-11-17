import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where, doc, getDoc, updateDoc, deleteDoc, writeBatch, deleteField, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  Users, Home, Calendar as CalendarIcon, DollarSign, TrendingUp,
  Star, FileText, Shield, Settings, BarChart3,
  Eye, Download, Filter, Search, CheckCircle, XCircle,
  AlertCircle, CreditCard, Receipt, BookOpen, FileCheck,
  TrendingDown, Award, AlertTriangle, Send, Clock, RefreshCw, Edit3, X, Menu, LogOut, Trash2, Ban, Printer, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
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
  const [guests, setGuests] = useState([]);
  const [terminatingHost, setTerminatingHost] = useState(null);
  const [deletingHost, setDeletingHost] = useState(null);
  const [blockingGuest, setBlockingGuest] = useState(null);
  const [deletingGuest, setDeletingGuest] = useState(null);
  const [showTerminateHostDialog, setShowTerminateHostDialog] = useState(false);
  const [showUnterminateHostDialog, setShowUnterminateHostDialog] = useState(false);
  const [selectedHostForUntermination, setSelectedHostForUntermination] = useState(null);
  const [unterminatingHost, setUnterminatingHost] = useState(null);
  const [showDeleteHostDialog, setShowDeleteHostDialog] = useState(false);
  const [showBlockGuestDialog, setShowBlockGuestDialog] = useState(false);
  const [showDeleteGuestDialog, setShowDeleteGuestDialog] = useState(false);
  const [selectedHostForTermination, setSelectedHostForTermination] = useState(null);
  const [selectedHostForDeletion, setSelectedHostForDeletion] = useState(null);
  const [selectedGuestForBlocking, setSelectedGuestForBlocking] = useState(null);
  const [selectedGuestForDeletion, setSelectedGuestForDeletion] = useState(null);
  const [userManagementView, setUserManagementView] = useState('hosts'); // 'hosts' or 'guests'
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
  const [cashOutRequestSearch, setCashOutRequestSearch] = useState('');
  const [cashOutRequestSort, setCashOutRequestSort] = useState({ field: 'createdAt', order: 'desc' });
  const [cashOutRequestDateRange, setCashOutRequestDateRange] = useState({ startDate: '', endDate: '' });
  const [showCashOutRequestCalendar, setShowCashOutRequestCalendar] = useState(false);
  const cashOutRequestCalendarButtonRef = useRef(null);
  const [cashOutRequestCalendarPosition, setCashOutRequestCalendarPosition] = useState({ top: 0, left: 0 });
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
    from: undefined,
    to: undefined
  });
  const [dateRangePreset, setDateRangePreset] = useState('all'); // 'all', '7days', '30days', '3months', '6months', '1year', 'custom'
  const [reportFilters, setReportFilters] = useState({
    // Bookings filters
    bookingStatus: 'all', // 'all', 'completed', 'pending', 'confirmed', 'cancelled'
    paymentStatus: 'all', // 'all', 'paid', 'unpaid'
    category: 'all', // 'all', 'accommodation', 'experience', 'service'
    // Users filters
    userRole: 'all', // 'all', 'host', 'guest', 'admin'
    accountStatus: 'all', // 'all', 'active', 'terminated', 'blocked'
    // Reviews filters
    rating: 'all', // 'all', '1', '2', '3', '4', '5'
    verified: 'all', // 'all', 'verified', 'unverified'
    // Hosts filters
    hostStatus: 'all', // 'all', 'active', 'terminated'
    subscriptionType: 'all', // 'all', 'monthly', 'yearly'
    // Financial filters
    transactionType: 'all', // 'all', 'commission', 'subscription'
    // Compliance filters
    violationType: 'all', // 'all', 'host_cancellation', 'low_rating', 'host_appeal'
    complianceStatus: 'all' // 'all', 'pending', 'reviewed'
  });
  const [previewData, setPreviewData] = useState(null);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [fullReportData, setFullReportData] = useState(null); // Store full data for export
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Print functionality
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSection, setPrintSection] = useState(null);
  const [printDateRange, setPrintDateRange] = useState({
    from: undefined,
    to: undefined
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
  const [showTransactionsCalendar, setShowTransactionsCalendar] = useState(false);
  const transactionsCalendarButtonRef = useRef(null);
  const [transactionsCalendarPosition, setTransactionsCalendarPosition] = useState({ top: 0, left: 0 });
  const [exportPrintCalendarMonth, setExportPrintCalendarMonth] = useState(new Date());
  const exportPrintCalendarRef = useRef(null);
  const exportPrintCalendarPopupRef = useRef(null);
  
  // Export/Print modal state
  const [showExportPrintModal, setShowExportPrintModal] = useState(false);
  const [exportPrintFilter, setExportPrintFilter] = useState({
    search: '',
    type: 'all',
    dateRange: { startDate: '', endDate: '' },
    sortBy: 'date',
    sortOrder: 'desc',
    userRole: 'all'
  });
  const [exportPrintDateRange, setExportPrintDateRange] = useState({ from: undefined, to: undefined });
  const [userManagementFilter, setUserManagementFilter] = useState({
    search: '',
    status: 'all', // 'all', 'active', 'terminated' for hosts; 'all', 'active', 'blocked' for guests
    sortBy: 'name', // 'name', 'earnings', 'bookings', 'listings' for hosts, 'name', 'bookings' for guests
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


  // Unified filtering functions - used across count display, table display, and export
  const filterCashOutRequests = (requests) => {
    return requests.filter(r => {
      // Status filter
      const statusMatch = cashOutRequestFilter === 'all' ? true : r.status === cashOutRequestFilter;
      
      // Search filter - case-insensitive, trimmed, handles null/undefined
      const searchMatch = !cashOutRequestSearch || !cashOutRequestSearch.trim() || 
        ((r.userName || '').toLowerCase().trim().includes(cashOutRequestSearch.toLowerCase().trim()) ||
         (r.userEmail || '').toLowerCase().trim().includes(cashOutRequestSearch.toLowerCase().trim()) ||
         (r.paypalEmail || '').toLowerCase().trim().includes(cashOutRequestSearch.toLowerCase().trim()));
      
      // Date range filter - handles date objects and timestamps
      let dateMatch = true;
      if (cashOutRequestDateRange.startDate || cashOutRequestDateRange.endDate) {
        const requestDate = r.createdAt ? (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)) : null;
        if (requestDate && !isNaN(requestDate.getTime())) {
          const requestDateStr = format(requestDate, 'yyyy-MM-dd');
          if (cashOutRequestDateRange.startDate && requestDateStr < cashOutRequestDateRange.startDate) {
            dateMatch = false;
          }
          if (cashOutRequestDateRange.endDate && requestDateStr > cashOutRequestDateRange.endDate) {
            dateMatch = false;
          }
        } else {
          dateMatch = false;
        }
      }
      
      return statusMatch && searchMatch && dateMatch;
    });
  };

  const sortCashOutRequests = (requests) => {
    const sorted = [...requests];
    sorted.sort((a, b) => {
      let aVal, bVal;
      switch (cashOutRequestSort.field) {
        case 'amount':
          aVal = a.amount || 0;
          bVal = b.amount || 0;
          break;
        case 'userName':
          aVal = (a.userName || '').toLowerCase();
          bVal = (b.userName || '').toLowerCase();
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'createdAt':
        default:
          aVal = a.createdAt ? (a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()) : 0;
          bVal = b.createdAt ? (b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()) : 0;
          break;
      }
      
      if (typeof aVal === 'string') {
        return cashOutRequestSort.order === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return cashOutRequestSort.order === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  };

  const filterTransactions = (transactions, filterObj) => {
    return transactions.filter(transaction => {
      // Search filter - comprehensive search across all relevant fields
      if (filterObj.search && filterObj.search.trim()) {
        const searchLower = filterObj.search.toLowerCase().trim();
        const searchableText = [
          transaction.userName || '',
          transaction.userEmail || '',
          transaction.description || '',
          transaction.id || '',
          transaction.metadata?.bookingId || '',
          transaction.metadata?.listingTitle || '',
          transaction.metadata?.guestEmail || '',
          transaction.metadata?.hostEmail || '',
          transaction.transactionType || ''
        ].join(' ').toLowerCase();
        if (!searchableText.includes(searchLower)) return false;
      }
      
      // Type filter - comprehensive type checking
      if (filterObj.type !== 'all') {
        if (filterObj.type === 'subscription') {
          // Subscription payments
          if (transaction.metadata?.paymentType !== 'subscription_payment' && 
              !transaction.description?.toLowerCase().includes('subscription')) {
            return false;
          }
        } else if (filterObj.type === 'credit') {
          // Credits: type must be 'credit' or 'cash_in'
          if (transaction.type !== 'credit' && transaction.type !== 'cash_in') {
            return false;
          }
        } else if (filterObj.type === 'debit') {
          // Debits: payments, cash outs, or admin transactions that are outgoing
          const isDebit = transaction.type === 'payment' || 
                         transaction.type === 'cash_out' ||
                         (transaction.isAdminTransaction && 
                          (transaction.type === 'payment' || transaction.type === 'cash_out'));
          if (!isDebit) return false;
        }
      }
      
      // User role filter - comprehensive role checking
      if (filterObj.userRole !== 'all') {
        const roles = Array.isArray(transaction.userRoles) ? transaction.userRoles : [];
        const isAdmin = transaction.isAdminTransaction === true;
        
        if (filterObj.userRole === 'admin') {
          // Admin transactions only
          if (!isAdmin) return false;
        } else if (filterObj.userRole === 'host') {
          // Host transactions - not admin, and has host role or is not guest
          if (isAdmin) return false;
          if (!roles.includes('host') && roles.includes('guest')) return false;
        } else if (filterObj.userRole === 'guest') {
          // Guest transactions only
          if (isAdmin) return false;
          if (!roles.includes('guest')) return false;
        }
      }
      
      // Date filter
      if (filterObj.dateRange && (filterObj.dateRange.startDate || filterObj.dateRange.endDate)) {
        const transactionDate = transaction.date instanceof Date 
          ? transaction.date 
          : new Date(transaction.date || transaction.createdAt || 0);
        
        const startDate = filterObj.dateRange.startDate ? new Date(filterObj.dateRange.startDate) : null;
        const endDate = filterObj.dateRange.endDate ? new Date(filterObj.dateRange.endDate) : null;
        
        if (startDate) {
          startDate.setHours(0, 0, 0, 0);
          if (transactionDate < startDate) return false;
        }
        if (endDate) {
          endDate.setHours(23, 59, 59, 999);
          if (transactionDate > endDate) return false;
        }
      }
      
      return true;
    });
  };

  const sortTransactions = (transactions, sortBy, sortOrder) => {
    const sorted = [...transactions];
    sorted.sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'date') {
        aVal = a.date instanceof Date ? a.date : new Date(a.date || a.createdAt || 0);
        bVal = b.date instanceof Date ? b.date : new Date(b.date || b.createdAt || 0);
        aVal = aVal.getTime();
        bVal = bVal.getTime();
      } else if (sortBy === 'amount') {
        aVal = a.amount || 0;
        bVal = b.amount || 0;
      } else {
        aVal = (a.userName || a.userEmail || '').toLowerCase();
        bVal = (b.userName || b.userEmail || '').toLowerCase();
      }
      
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  };

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

  // Keep page at top during loading
  useEffect(() => {
    if (loading) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [loading]);

  // Scroll to top when switching tabs (but not on initial load)
  useEffect(() => {
    if (!loading) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab, loading]);

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
        loadGuests(),
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

  // Close export print calendar when clicking outside
  useEffect(() => {
    if (!showExportPrintModal) return;

    const handleClickOutside = (event) => {
      // Check if click is outside both the button and the calendar popup
      const isClickInsideButton = exportPrintCalendarRef.current && exportPrintCalendarRef.current.contains(event.target);
      const isClickInsideCalendar = exportPrintCalendarPopupRef.current && exportPrintCalendarPopupRef.current.contains(event.target);
      
      if (!isClickInsideButton && !isClickInsideCalendar) {
        // This was incorrectly closing transactions calendar, but it should only handle export print modal
        // The export print modal closing is handled elsewhere
      }
    };

    // Use a small delay to avoid immediate closure when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showExportPrintModal]);

  // Close transactions calendar when clicking outside
  useEffect(() => {
    if (!showTransactionsCalendar) return;

    const handleClickOutside = (event) => {
      // Check if click is on the button
      if (transactionsCalendarButtonRef.current && transactionsCalendarButtonRef.current.contains(event.target)) {
        return; // Don't close if clicking the button
      }
      
      // Check if click is inside the calendar popup
      const calendarPopup = event.target.closest('[data-calendar-popup="transactions"]');
      if (calendarPopup) {
        return; // Don't close if clicking inside calendar
      }
      
      // Close if clicking outside both button and calendar
      setShowTransactionsCalendar(false);
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showTransactionsCalendar]);

  // Close cash out request calendar when clicking outside
  useEffect(() => {
    if (!showCashOutRequestCalendar) return;

    const handleClickOutside = (event) => {
      // Check if click is on the button
      if (cashOutRequestCalendarButtonRef.current && cashOutRequestCalendarButtonRef.current.contains(event.target)) {
        return; // Don't close if clicking the button
      }
      
      // Check if click is inside the calendar popup
      const calendarPopup = event.target.closest('[data-calendar-popup="cash-out-requests"]');
      if (calendarPopup) {
        return; // Don't close if clicking inside calendar
      }
      
      // Close if clicking outside both button and calendar
      setShowCashOutRequestCalendar(false);
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showCashOutRequestCalendar]);

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
      
      // Enrich requests with user information
      const enrichedRequests = await Promise.all(requests.map(async (request) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', request.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest'];
            const isHost = roles.includes('host');
            const isGuest = roles.includes('guest');
            
            // Get reviewed by admin name if available
            let reviewedByName = 'N/A';
            if (request.reviewedBy) {
              try {
                const reviewerDoc = await getDoc(doc(db, 'users', request.reviewedBy));
                if (reviewerDoc.exists()) {
                  const reviewerData = reviewerDoc.data();
                  reviewedByName = `${reviewerData.firstName || ''} ${reviewerData.lastName || ''}`.trim() || reviewerData.email || 'Admin';
                }
              } catch (e) {
                console.error('Error loading reviewer info:', e);
              }
            }
            
            return {
              ...request,
              userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Unknown',
              userEmail: userData.email || 'N/A',
              userRole: isHost ? 'Host' : isGuest ? 'Guest' : roles.join(', '),
              currentBalance: userData.getpay?.balance || 0,
              reviewedByName
            };
          }
          return {
            ...request,
            userName: request.userName || 'Unknown',
            userEmail: request.userEmail || 'N/A',
            userRole: 'Unknown',
            currentBalance: 0,
            reviewedByName: 'N/A'
          };
        } catch (error) {
          console.error('Error enriching cash out request:', error);
          return request;
        }
      }));
      
      setCashOutRequests(enrichedRequests);
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
          listingCategory: listingData.category || 'accommodation',
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
          // Per-listing commission breakdown
          const listingsData = [];
          const listingsMap = new Map();
          
          // Initialize listings map
          listingsSnapshot.forEach(listingDoc => {
            const listing = listingDoc.data();
            listingsMap.set(listingDoc.id, {
              listingId: listingDoc.id,
              title: listing.title || 'Untitled Listing',
              category: listing.category || 'N/A',
              location: listing.location || 'N/A',
              bookings: 0,
              earnings: 0,
              commission: 0
            });
          });
          
          // Calculate earnings and commissions per listing
          bookingsSnapshot.forEach(bookingDoc => {
            const booking = bookingDoc.data();
            if (booking.status === 'confirmed' || booking.status === 'completed') {
              const price = booking.totalPrice || booking.bookingAmount || 0;
              // Ensure price is a number, not a date or other type
              const numericPrice = typeof price === 'number' ? price : (typeof price === 'string' ? parseFloat(price) || 0 : 0);
              earnings += numericPrice;
              
              // Track per-listing data
              const listingId = booking.listingId;
              if (listingId && listingsMap.has(listingId)) {
                const listingData = listingsMap.get(listingId);
                listingData.bookings += 1;
                listingData.earnings += numericPrice;
                listingData.commission = Math.round((listingData.earnings * HOST_COMMISSION_PERCENTAGE) * 100) / 100;
              }
            }
          });
          
          // Convert map to array
          listingsData.push(...Array.from(listingsMap.values()));
          
          // Ensure earnings is a valid number
          earnings = typeof earnings === 'number' && !isNaN(earnings) ? earnings : 0;
          
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
            phone: userData.phone || 'N/A',
            listings: listingsSnapshot.size,
            listingsData: listingsData, // Per-listing breakdown
            bookings: bookingsSnapshot.size,
            earnings,
            rating: avgRating,
            reviewCount,
            isTerminated: userData.isTerminated || false,
            terminatedAt: userData.terminatedAt?.toDate ? userData.terminatedAt.toDate() : (userData.terminatedAt || null)
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

  const loadGuests = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const guestsList = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest'];
        
        // Include only guests (users who are not hosts and not admins, including blocked guests)
        if (!roles.includes('host') && !roles.includes('admin') && !userData.isTerminated) {
          // Get guest's bookings
          const bookingsSnapshot = await getDocs(
            query(collection(db, 'bookings'), where('guestId', '==', userDoc.id))
          );
          
          let totalSpent = 0;
          bookingsSnapshot.forEach(bookingDoc => {
            const booking = bookingDoc.data();
            if (booking.status === 'confirmed' || booking.status === 'completed') {
              totalSpent += booking.bookingAmount || booking.totalPrice || 0;
            }
          });
          
          guestsList.push({
            userId: userDoc.id,
            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Unknown',
            email: userData.email,
            phone: userData.phone || 'N/A',
            bookings: bookingsSnapshot.size,
            totalSpent,
            createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : (userData.createdAt || null),
            lastLogin: userData.lastLogin?.toDate ? userData.lastLogin.toDate() : (userData.lastLogin || null),
            isBlocked: userData.isBlocked || false,
            blockedAt: userData.blockedAt?.toDate ? userData.blockedAt.toDate() : (userData.blockedAt || null)
          });
        }
      }
      
      // Sort by total spent
      guestsList.sort((a, b) => b.totalSpent - a.totalSpent);
      setGuests(guestsList);
    } catch (error) {
      console.error('Error loading guests:', error);
    }
  };

  const handleTerminateHost = async (host) => {
    try {
      setTerminatingHost(host.userId);
      
      const batch = writeBatch(db);
      
      // 1. Remove host role from user and mark as terminated
      const userRef = doc(db, 'users', host.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest'];
        const updatedRoles = roles.filter(role => role !== 'host');
        
        batch.update(userRef, {
          roles: updatedRoles.length > 0 ? updatedRoles : ['guest'],
          isTerminated: true,
          terminatedAt: serverTimestamp(),
          terminatedBy: user.uid
        });
      }
      
      // 2. Mark all listings as unpublished instead of deleting them (so we can restore later)
      const listingsSnapshot = await getDocs(
        query(collection(db, 'listings'), where('ownerId', '==', host.userId))
      );
      
      const listingIds = [];
      listingsSnapshot.forEach(listingDoc => {
        listingIds.push(listingDoc.id);
        batch.update(listingDoc.ref, {
          isPublished: false,
          terminatedOwnerId: host.userId, // Store original owner ID for restoration
          terminatedAt: serverTimestamp()
        });
      });
      
      // Store listing IDs in user document for easy restoration
      if (listingIds.length > 0) {
        batch.update(userRef, {
          terminatedListingIds: listingIds
        });
      }
      
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

  const handleUnterminateHost = async (host) => {
    try {
      setUnterminatingHost(host.userId);
      
      const batch = writeBatch(db);
      
      // 1. Restore host role and remove terminated status
      const userRef = doc(db, 'users', host.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest'];
        
        // Add host role back if not present
        if (!roles.includes('host')) {
          roles.push('host');
        }
        
        // Remove terminated fields
        const updateData = {
          roles: roles,
          isTerminated: false
        };
        
        // Remove terminated fields
        if (userData.terminatedAt) {
          updateData.terminatedAt = deleteField();
        }
        if (userData.terminatedBy) {
          updateData.terminatedBy = deleteField();
        }
        if (userData.terminatedListingIds) {
          updateData.terminatedListingIds = deleteField();
        }
        
        batch.update(userRef, updateData);
      }
      
      // 2. Restore all listings (republish them)
      const listingsSnapshot = await getDocs(
        query(collection(db, 'listings'), where('terminatedOwnerId', '==', host.userId))
      );
      
      let restoredCount = 0;
      listingsSnapshot.forEach(listingDoc => {
        const listingData = listingDoc.data();
        // Only restore if it was terminated (has terminatedOwnerId)
        if (listingData.terminatedOwnerId === host.userId) {
          const updateData = {
            isPublished: true
          };
          
          // Remove terminated fields
          if (listingData.terminatedOwnerId) {
            updateData.terminatedOwnerId = deleteField();
          }
          if (listingData.terminatedAt) {
            updateData.terminatedAt = deleteField();
          }
          
          batch.update(listingDoc.ref, updateData);
          restoredCount++;
        }
      });
      
      // Also check for listings by ownerId (in case terminatedOwnerId wasn't set)
      const listingsByOwnerSnapshot = await getDocs(
        query(collection(db, 'listings'), where('ownerId', '==', host.userId))
      );
      
      listingsByOwnerSnapshot.forEach(listingDoc => {
        const listingData = listingDoc.data();
        // If listing is unpublished and has terminatedOwnerId or was terminated
        if (!listingData.isPublished && (listingData.terminatedOwnerId === host.userId || listingData.terminatedAt)) {
          const updateData = {
            isPublished: true
          };
          
          if (listingData.terminatedOwnerId) {
            updateData.terminatedOwnerId = deleteField();
          }
          if (listingData.terminatedAt) {
            updateData.terminatedAt = deleteField();
          }
          
          batch.update(listingDoc.ref, updateData);
          if (!listingsSnapshot.docs.find(d => d.id === listingDoc.id)) {
            restoredCount++;
          }
        }
      });
      
      // Commit all changes
      await batch.commit();
      
      toast.success(`Host ${host.name} and ${restoredCount} listing(s) restored successfully`);
      
      // Reload hosts and stats
      await loadHosts();
      await loadStats();
      await loadListings();
      
      setShowUnterminateHostDialog(false);
      setSelectedHostForUntermination(null);
    } catch (error) {
      console.error('Error unterminating host:', error);
      toast.error(`Failed to restore host: ${error.message}`);
    } finally {
      setUnterminatingHost(null);
    }
  };

  const handleDeleteHost = async (host) => {
    try {
      setDeletingHost(host.userId);
      
      // 1. Delete all listings for this host
      const listingsSnapshot = await getDocs(
        query(collection(db, 'listings'), where('ownerId', '==', host.userId))
      );
      
      // 2. Delete all reviews for this host's listings (do this first before deleting listings)
      const listingIds = listingsSnapshot.docs.map(d => d.id);
      if (listingIds.length > 0) {
        // Firestore 'in' queries are limited to 10 items, so we need to batch
        for (let i = 0; i < listingIds.length; i += 10) {
          const batchIds = listingIds.slice(i, i + 10);
          const reviewsSnapshot = await getDocs(
            query(collection(db, 'reviews'), where('listingId', 'in', batchIds))
          );
          
          // Delete reviews in batches (Firestore batch limit is 500 operations)
          let reviewBatch = writeBatch(db);
          let operationCount = 0;
          
          for (const reviewDoc of reviewsSnapshot.docs) {
            if (operationCount >= 500) {
              // Commit current batch and start new one
              await reviewBatch.commit();
              reviewBatch = writeBatch(db);
              operationCount = 0;
            }
            reviewBatch.delete(reviewDoc.ref);
            operationCount++;
          }
          
          if (operationCount > 0) {
            await reviewBatch.commit();
          }
        }
      }
      
      // 3. Delete all listings in batches
      let listingBatch = writeBatch(db);
      let listingOpCount = 0;
      
      for (const listingDoc of listingsSnapshot.docs) {
        if (listingOpCount >= 500) {
          await listingBatch.commit();
          listingBatch = writeBatch(db);
          listingOpCount = 0;
        }
        listingBatch.delete(listingDoc.ref);
        listingOpCount++;
      }
      
      if (listingOpCount > 0) {
        await listingBatch.commit();
      }
      
      // 4. Delete all bookings for this host in batches
      const bookingsSnapshot = await getDocs(
        query(collection(db, 'bookings'), where('ownerId', '==', host.userId))
      );
      
      let bookingBatch = writeBatch(db);
      let bookingOpCount = 0;
      
      for (const bookingDoc of bookingsSnapshot.docs) {
        if (bookingOpCount >= 500) {
          await bookingBatch.commit();
          bookingBatch = writeBatch(db);
          bookingOpCount = 0;
        }
        bookingBatch.delete(bookingDoc.ref);
        bookingOpCount++;
      }
      
      if (bookingOpCount > 0) {
        await bookingBatch.commit();
      }
      
      // 5. Delete the user document
      const userRef = doc(db, 'users', host.userId);
      await deleteDoc(userRef);
      
      toast.success(`Host ${host.name} and all associated data deleted successfully`);
      
      // Reload hosts and stats
      await loadHosts();
      await loadStats();
      await loadListings();
      
      setShowDeleteHostDialog(false);
      setSelectedHostForDeletion(null);
    } catch (error) {
      console.error('Error deleting host:', error);
      toast.error(`Failed to delete host: ${error.message}`);
    } finally {
      setDeletingHost(null);
    }
  };

  const handleBlockGuest = async (guest) => {
    try {
      setBlockingGuest(guest.userId);
      
      const userRef = doc(db, 'users', guest.userId);
      await updateDoc(userRef, {
        isBlocked: true,
        blockedAt: new Date(),
        blockedBy: user.uid
      });
      
      toast.success(`Guest ${guest.name} has been blocked successfully`);
      
      // Reload guests
      await loadGuests();
      
      setShowBlockGuestDialog(false);
      setSelectedGuestForBlocking(null);
    } catch (error) {
      console.error('Error blocking guest:', error);
      toast.error(`Failed to block guest: ${error.message}`);
    } finally {
      setBlockingGuest(null);
    }
  };

  const handleUnblockGuest = async (guest) => {
    try {
      setBlockingGuest(guest.userId);
      
      const userRef = doc(db, 'users', guest.userId);
      await updateDoc(userRef, {
        isBlocked: false,
        blockedAt: null,
        blockedBy: null
      });
      
      toast.success(`Guest ${guest.name} has been unblocked successfully`);
      
      // Reload guests
      await loadGuests();
    } catch (error) {
      console.error('Error unblocking guest:', error);
      toast.error(`Failed to unblock guest: ${error.message}`);
    } finally {
      setBlockingGuest(null);
    }
  };

  const handleDeleteGuest = async (guest) => {
    try {
      setDeletingGuest(guest.userId);
      
      // 1. Delete all bookings for this guest in batches
      const bookingsSnapshot = await getDocs(
        query(collection(db, 'bookings'), where('guestId', '==', guest.userId))
      );
      
      let bookingBatch = writeBatch(db);
      let bookingOpCount = 0;
      
      for (const bookingDoc of bookingsSnapshot.docs) {
        if (bookingOpCount >= 500) {
          await bookingBatch.commit();
          bookingBatch = writeBatch(db);
          bookingOpCount = 0;
        }
        bookingBatch.delete(bookingDoc.ref);
        bookingOpCount++;
      }
      
      if (bookingOpCount > 0) {
        await bookingBatch.commit();
      }
      
      // 2. Delete all reviews by this guest in batches
      const reviewsSnapshot = await getDocs(
        query(collection(db, 'reviews'), where('reviewerId', '==', guest.userId))
      );
      
      let reviewBatch = writeBatch(db);
      let reviewOpCount = 0;
      
      for (const reviewDoc of reviewsSnapshot.docs) {
        if (reviewOpCount >= 500) {
          await reviewBatch.commit();
          reviewBatch = writeBatch(db);
          reviewOpCount = 0;
        }
        reviewBatch.delete(reviewDoc.ref);
        reviewOpCount++;
      }
      
      if (reviewOpCount > 0) {
        await reviewBatch.commit();
      }
      
      // 3. Delete the user document
      const userRef = doc(db, 'users', guest.userId);
      await deleteDoc(userRef);
      
      toast.success(`Guest ${guest.name} and all associated data deleted successfully`);
      
      // Reload guests and stats
      await loadGuests();
      await loadStats();
      
      setShowDeleteGuestDialog(false);
      setSelectedGuestForDeletion(null);
    } catch (error) {
      console.error('Error deleting guest:', error);
      toast.error(`Failed to delete guest: ${error.message}`);
    } finally {
      setDeletingGuest(null);
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
        if (dateRange.from && dateRange.to) {
          const start = new Date(dateRange.from);
          start.setHours(0, 0, 0, 0);
          const end = new Date(dateRange.to);
          end.setHours(23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
        return null;
      case 'all':
      default:
        return null; // No filter - all data
    }
  };

  // Build filters object based on report type
  const buildFiltersForReportType = (reportType, customFilters = null) => {
    if (!reportType) return null;
    
    // Use custom filters if provided, otherwise use state
    const filtersToUse = customFilters || reportFilters;
    const filters = {};
    
    switch (reportType) {
      case 'bookings':
        if (filtersToUse.bookingStatus && filtersToUse.bookingStatus !== 'all') filters.bookingStatus = filtersToUse.bookingStatus;
        if (filtersToUse.paymentStatus && filtersToUse.paymentStatus !== 'all') filters.paymentStatus = filtersToUse.paymentStatus;
        if (filtersToUse.category && filtersToUse.category !== 'all') filters.category = filtersToUse.category;
        break;
      case 'users':
        if (filtersToUse.userRole && filtersToUse.userRole !== 'all') filters.userRole = filtersToUse.userRole;
        if (filtersToUse.accountStatus && filtersToUse.accountStatus !== 'all') filters.accountStatus = filtersToUse.accountStatus;
        break;
      case 'reviews':
        if (filtersToUse.rating && filtersToUse.rating !== 'all') filters.rating = parseInt(filtersToUse.rating);
        if (filtersToUse.verified && filtersToUse.verified !== 'all') filters.verified = filtersToUse.verified === 'verified';
        break;
      case 'hosts':
        if (filtersToUse.hostStatus && filtersToUse.hostStatus !== 'all') filters.hostStatus = filtersToUse.hostStatus;
        if (filtersToUse.subscriptionType && filtersToUse.subscriptionType !== 'all') filters.subscriptionType = filtersToUse.subscriptionType;
        break;
      case 'financial':
        if (filtersToUse.transactionType && filtersToUse.transactionType !== 'all') filters.transactionType = filtersToUse.transactionType;
        break;
      case 'compliance':
        if (filtersToUse.violationType && filtersToUse.violationType !== 'all') filters.violationType = filtersToUse.violationType;
        if (filtersToUse.complianceStatus && filtersToUse.complianceStatus !== 'all') filters.complianceStatus = filtersToUse.complianceStatus;
        break;
      default:
        return null;
    }
    
    return Object.keys(filters).length > 0 ? filters : null;
  };

  // Note: Removed filterEssentialData - all filtering is now done based on user-selected filters only
  // This ensures that preview, export, and print all show the exact same data that matches the filters

  const handlePreviewReportWithFilter = async (customDateFilter = null, customFilters = null) => {
    if (isLoadingPreview || !selectedReportType) return;
    
    try {
      setIsLoadingPreview(true);
      
      // Use custom filter if provided, otherwise get from preset
      const dateFilter = customDateFilter || getDateRangeFromPreset(dateRangePreset);
      
      // Build filters - use custom filters if provided, otherwise use current state
      // Always pass filters object to ensure filters are properly applied
      const filtersToUse = customFilters !== null ? customFilters : reportFilters;
      const filters = buildFiltersForReportType(selectedReportType, filtersToUse);
      
      // Debug logging
      console.log('Preview Report - Filters:', {
        reportType: selectedReportType,
        dateFilter: dateFilter ? {
          startDate: dateFilter.startDate?.toISOString ? dateFilter.startDate.toISOString() : dateFilter.startDate,
          endDate: dateFilter.endDate?.toISOString ? dateFilter.endDate.toISOString() : dateFilter.endDate
        } : null,
        filters: filters,
        filtersToUse: filtersToUse,
        reportFiltersState: reportFilters,
        customFilters: customFilters
      });

      const { getReportData } = await import('./services/reportService');
      const result = await getReportData(selectedReportType, dateFilter, filters);
      
      console.log('Preview Report Result:', { 
        selectedReportType, 
        filtersApplied: filters,
        dateFilter: dateFilter ? {
          startDate: dateFilter.startDate?.toISOString(),
          endDate: dateFilter.endDate?.toISOString()
        } : null,
        dataCount: Array.isArray(result.data) ? result.data.length : 0,
        headersCount: Array.isArray(result.headers) ? result.headers.length : 0
      });
      
      // Ensure data is an array - this data is already filtered by user filters and date range
      // Data already contains only essential fields from getReportData (like transactions page)
      const filteredData = Array.isArray(result.data) ? result.data : (result.data || []);
      const headers = Array.isArray(result.headers) ? result.headers : [];
      
      // Use the data as-is (already filtered to essential fields in reportService)
      // Preview, export, and print will all use the same essential filtered data
      setPreviewData(filteredData);
      setPreviewHeaders(headers);
      setFullReportData(filteredData); // Store essential filtered data for export/print
      
      console.log('Preview - Essential Headers:', headers.map(h => h.label || h.key));
      console.log('Preview - Data Fields:', filteredData.length > 0 ? Object.keys(filteredData[0]) : []);
      console.log('Preview - Record Count:', filteredData.length);
      setShowPreview(true);
      
      if (filteredData.length === 0) {
        toast.info('No data found for the selected filters. Try adjusting your filters.');
      } else {
        toast.success(`Loaded ${filteredData.length.toLocaleString()} record${filteredData.length !== 1 ? 's' : ''} matching your filters. This is exactly what will be exported/printed with essential fields only.`);
      }
    } catch (error) {
      console.error('Error previewing report:', error);
      toast.error(`Failed to preview ${selectedReportType} report: ${error.message}`);
      setPreviewData([]);
      setPreviewHeaders([]);
      setFullReportData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handlePreviewReport = async () => {
    // Always pass current reportFilters to ensure all filters are applied
    return handlePreviewReportWithFilter(null, reportFilters);
  };

  const handleDownloadReport = async () => {
    if (generatingReport || !selectedReportType || !previewData || !fullReportData) return;
    
    try {
      setGeneratingReport(true);
      
      toast.info(`Exporting ${selectedReportType} report... This may take a moment.`);
      
      // Use the essential data that's already stored (same as preview)
      const { exportToPDF } = await import('./services/reportService');
      
      const reportTitle = selectedReportType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      const filename = `${selectedReportType}_report_${new Date().toISOString().split('T')[0]}`;
      
      // Export using the same essential data that's shown in preview
      await exportToPDF(fullReportData, previewHeaders, filename, reportTitle);
      
      toast.success(`${selectedReportType} report exported successfully!`);
      
      // Don't reset state - keep modal and preview open so user can export again or print
      // Only reset generatingReport flag
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error(`Failed to export ${selectedReportType} report: ${error.message}`);
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
      const filters = buildFiltersForReportType(selectedReportType);
      
      // Debug logging
      console.log('Export Report - Filters Applied:', {
        reportType: selectedReportType,
        dateFilter: dateFilter ? {
          startDate: dateFilter.startDate?.toISOString(),
          endDate: dateFilter.endDate?.toISOString()
        } : null,
        filters: filters
      });
      
      await generateReportService(selectedReportType, dateFilter, filters);
      toast.success(`${selectedReportType} report generated and downloaded successfully!`);
      
      // Reset date range after export
      setDateRange({ from: undefined, to: undefined });
      setDateRangePreset('all');
      setReportFilters({
        bookingStatus: 'all',
        paymentStatus: 'all',
        category: 'all',
        userRole: 'all',
        accountStatus: 'all',
        rating: 'all',
        verified: 'all',
        hostStatus: 'all',
        subscriptionType: 'all',
        transactionType: 'all',
        violationType: 'all',
        complianceStatus: 'all'
      });
      setPreviewData(null);
      setPreviewHeaders([]);
      setFullReportData(null);
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
    setDateRange({ from: undefined, to: undefined });
    setPreviewData(null);
    setPreviewHeaders([]);
    setShowPreview(false);
    setShowDateRangeModal(true);
  };

  const handleExportServiceFees = async () => {
    if (generatingReport) return;
    
    try {
      setGeneratingReport(true);
      toast.info('Generating service fees report... This may take a moment.');
      
      // Use the same logic as print - get date filter (using current serviceFeesFilter date range if set, otherwise all)
      let dateFilter = null;
      if (serviceFeesFilter.dateRange.startDate || serviceFeesFilter.dateRange.endDate) {
        dateFilter = {
          startDate: serviceFeesFilter.dateRange.startDate ? new Date(serviceFeesFilter.dateRange.startDate) : null,
          endDate: serviceFeesFilter.dateRange.endDate ? new Date(serviceFeesFilter.dateRange.endDate) : null
        };
        if (dateFilter.startDate) dateFilter.startDate.setHours(0, 0, 0, 0);
        if (dateFilter.endDate) dateFilter.endDate.setHours(23, 59, 59, 999);
      }
      
      // Build filters for hosts report (same as print)
      const reportFilters = {
        hostStatus: serviceFeesFilter.hostStatus || 'all',
        subscriptionType: serviceFeesFilter.subscriptionType || 'all'
      };
      
      // Get hosts data (same as print)
      const { generateServiceFeesReport } = await import('./services/reportService');
      const hostsData = await generateServiceFeesReport(dateFilter, reportFilters);
      
      // Apply search filter if provided (same as print)
      let filteredHosts = hostsData;
      if (serviceFeesFilter.search) {
        const searchLower = serviceFeesFilter.search.toLowerCase();
        filteredHosts = filteredHosts.filter(host => 
          (host.hostName || '').toLowerCase().includes(searchLower) ||
          (host.hostEmail || '').toLowerCase().includes(searchLower) ||
          (host.hostPhone || '').toLowerCase().includes(searchLower)
        );
      }
      
      // Filter subscription transactions (same as print)
      let filteredTransactions = subscriptionTransactions || [];
      
      // Apply date filter if provided
      if (dateFilter && dateFilter.startDate && dateFilter.endDate && subscriptionTransactions) {
        filteredTransactions = filteredTransactions.filter(t => {
          if (!t.date && !t.createdAt) return false;
          const date = t.date instanceof Date ? t.date : new Date(t.date || t.createdAt);
          if (isNaN(date.getTime())) return false;
          return date >= dateFilter.startDate && date <= dateFilter.endDate;
        });
      }
      
      // Apply search filter if provided
      if (serviceFeesFilter.search && filteredTransactions.length > 0) {
        const searchLower = serviceFeesFilter.search.toLowerCase();
        filteredTransactions = filteredTransactions.filter(t => {
          const hostEmail = (t.metadata?.hostEmail || '').toLowerCase();
          const hostName = (t.metadata?.hostName || '').toLowerCase();
          return hostEmail.includes(searchLower) || hostName.includes(searchLower);
        });
      }
      
      // Apply subscription type filter to transactions if set
      if (serviceFeesFilter.subscriptionType !== 'all' && filteredTransactions.length > 0) {
        filteredTransactions = filteredTransactions.filter(t => {
          const transactionType = (t.metadata?.subscriptionType || '').toLowerCase();
          if (serviceFeesFilter.subscriptionType === 'monthly') {
            return transactionType.includes('monthly') || transactionType.includes('month');
          } else if (serviceFeesFilter.subscriptionType === 'yearly') {
            return transactionType.includes('yearly') || transactionType.includes('year') || transactionType.includes('annual');
          }
          return true;
        });
      }
      
      // Export hosts data
      const { exportToPDF } = await import('./services/reportService');
      await exportToPDF(
        filteredHosts,
        [
          { key: 'hostId', label: 'Host ID' },
          { key: 'hostName', label: 'Host Name' },
          { key: 'hostEmail', label: 'Host Email' },
          { key: 'hostPhone', label: 'Host Phone' },
          { key: 'totalBookings', label: 'Total Bookings' },
          { key: 'totalEarnings', label: 'Total Earnings' },
          { key: 'serviceFee', label: 'Service Fee (10%)' },
          { key: 'hostEarnings', label: 'Host Earnings (90%)' }
        ],
        'service_fees_hosts_report',
        `Service Fees Report - Hosts (${filteredHosts.length})`
      );
      
      // Export subscription transactions if any
      if (filteredTransactions.length > 0) {
        const transactionExportData = filteredTransactions.map(t => ({
          date: t.date || t.createdAt,
          hostName: t.metadata?.hostName || 'N/A',
          hostEmail: t.metadata?.hostEmail || 'N/A',
          type: t.metadata?.subscriptionType || 'Subscription',
          amount: t.amount || 0,
          status: t.status || 'N/A'
        }));
        
        await exportToPDF(
          transactionExportData,
          [
            { key: 'date', label: 'Date' },
            { key: 'hostName', label: 'Host Name' },
            { key: 'hostEmail', label: 'Host Email' },
            { key: 'type', label: 'Type' },
            { key: 'amount', label: 'Amount' },
            { key: 'status', label: 'Status' }
          ],
          'service_fees_subscription_transactions',
          `Service Fees Report - Subscription Transactions (${filteredTransactions.length})`
        );
      }
      
      toast.success(`Service fees report exported successfully! ${filteredTransactions.length > 0 ? '2 files downloaded.' : '1 file downloaded.'}`);
    } catch (error) {
      console.error('Error exporting service fees:', error);
      toast.error(`Failed to export service fees: ${error.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Helper function to export to PDF with branded template
  const exportToPDFWithBranding = async (data, headers, filename, title) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    
    // Use landscape for tables with many columns to ensure all data is visible
    const useLandscape = headers.length > 7;
    
    const doc = new jsPDF({
      orientation: useLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const headerHeight = 25;
    const primaryR = 212;
    const primaryG = 163;
    const primaryB = 115;

    // Header background with primary color
    doc.setFillColor(primaryR, primaryG, primaryB);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Try to add logo
    try {
      const logoResponse = await fetch('/logo.jpg');
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        const logoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(logoBlob);
        });
        doc.addImage(logoDataUrl, 'JPEG', 10, 5, 15, 15);
      }
    } catch (err) {
      console.log('Logo not available');
    }

    // Logo word "Getaways" in white
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Getaways', 28, 12);

    // Report title
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(title, 28, 18);

    // Date and record count on right
    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    doc.setFontSize(9);
    doc.text(`${dateStr} • ${data.length} record(s)`, pageWidth - 10, 12, { align: 'right' });

    // Table data - replace peso sign with "PHP" for PDF compatibility
    // jsPDF's default fonts don't support the peso sign (₱) Unicode character
    // Using "PHP" (Philippine Peso currency code) as a clear, standard replacement
    const tableHeaders = headers.map(h => h.label);
    const tableRows = data.map(row => 
      headers.map(h => {
        const value = row[h.key];
        // Preserve the exact value but replace peso sign with PHP for PDF
        if (value === null || value === undefined) return 'N/A';
        // Convert to string and replace peso sign with PHP
        const stringValue = String(value);
        // Replace ₱ with PHP for PDF compatibility
        return stringValue.replace(/₱/g, 'PHP');
      })
    );

    // Calculate column widths based on content and number of columns
    const numColumns = headers.length;
    const availableWidth = pageWidth - 10; // Account for margins (5mm each side)
    
    // Calculate proportional widths for each column
    // Use a weight system to distribute space appropriately
    const columnWeights = headers.map(header => {
      if (header.label.includes('Email') || header.label.includes('Notes')) {
        return 1.4; // Wider for email/notes
      } else if (header.label.includes('Name')) {
        return 1.2; // Slightly wider for names
      } else if (header.label.includes('Date')) {
        return 1.15; // Slightly wider for dates
      } else if (header.label.includes('Amount') || header.label.includes('Balance')) {
        return 1.1; // Slightly wider for amounts
      }
      return 1.0; // Default width
    });
    
    const totalWeight = columnWeights.reduce((sum, weight) => sum + weight, 0);
    
    // Create column styles with calculated widths
    const columnStyles = {};
    headers.forEach((header, index) => {
      const width = (availableWidth * columnWeights[index]) / totalWeight;
      columnStyles[index] = { cellWidth: width };
    });

    // Add table with primary color header - ensure all data is visible
    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: headerHeight + 5,
      styles: {
        fontSize: useLandscape ? 6.5 : 6, // Smaller font for landscape to fit all columns
        cellPadding: 2,
        overflow: 'linebreak', // Wrap text instead of cutting
        textColor: [31, 41, 55],
        lineWidth: 0.1,
        lineColor: [229, 231, 235],
        minCellHeight: 4, // Minimum height for cells
        halign: 'left',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [primaryR, primaryG, primaryB],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: useLandscape ? 7 : 6.5,
        halign: 'left',
        valign: 'middle',
        cellPadding: 2
      },
      columnStyles: columnStyles,
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { top: headerHeight + 5, left: 5, right: 5, bottom: 15 }, // Smaller margins for more space
      horizontalPageBreak: false, // Don't break columns across pages
      horizontalPageBreakRepeat: 0, // Don't repeat headers on horizontal breaks
      didDrawPage: (tableData) => {
        if (tableData.pageNumber > 1) {
          doc.setFillColor(primaryR, primaryG, primaryB);
          doc.rect(0, 0, pageWidth, headerHeight, 'F');
          doc.setFontSize(16);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('Getaways', 10, 12);
          doc.setFontSize(12);
          doc.setFont(undefined, 'normal');
          doc.text(title, 10, 18);
        }
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setTextColor(107, 114, 128);
        doc.text(`Page ${tableData.pageNumber} of ${doc.internal.getNumberOfPages()}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        doc.text(`Total: ${data.length} record(s)`, 10, pageHeight - 8);
      },
      showHead: 'everyPage',
      // Ensure all rows are included
      includeHiddenHtml: false,
      // Prevent data from being cut off
      rowPageBreak: 'auto',
      // Cell parsing - data is already processed with PHP replacement
      didParseCell: (data) => {
        // Data is already formatted with PHP instead of peso sign
        if (data.cell && typeof data.cell.text === 'string') {
          data.cell.text = data.cell.text;
        }
      }
    });

    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`${filename}_${timestamp}.pdf`);
  };

  // Direct export/print functions that use current displayed filters (transactionsFilter)
  const handleExportTransactionsDirect = async () => {
    if (generatingReport) return;
    
    try {
      setGeneratingReport(true);
      
      // Use transactionsFilter (current displayed filters)
      const filters = transactionsFilter;
      
      // Apply filtering using unified function
      let filtered = filterTransactions(allMoneyTransactions, filters);
      
      // Sort the filtered results using unified function
      filtered = sortTransactions(filtered, filters.sortBy, filters.sortOrder);

      if (filtered.length === 0) {
        toast.error('No transactions to export with the current filters');
        return;
      }

      // Format data for export
      const exportData = filtered.map(transaction => {
        const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date || transaction.createdAt);
        const isCredit = transaction.type === 'credit';
        const metadata = transaction.metadata || {};
        
        return {
          date: date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          type: transaction.transactionType || (isCredit ? 'Credit' : 'Debit'),
          description: transaction.description || 'N/A',
          amount: formatCurrency(transaction.amount || 0),
          userName: transaction.userName || transaction.userEmail || 'Unknown',
          userEmail: transaction.userEmail || 'N/A',
          userRoles: (transaction.userRoles || []).join(', ') || 'N/A',
          bookingId: metadata.bookingId || 'N/A',
          listingTitle: metadata.listingTitle || 'N/A',
          isAdminTransaction: transaction.isAdminTransaction ? 'Yes' : 'No',
          status: transaction.status || 'N/A'
        };
      });

      // Export to PDF with branding
      await exportToPDFWithBranding(
        exportData,
        [
          { key: 'date', label: 'Date' },
          { key: 'type', label: 'Type' },
          { key: 'description', label: 'Description' },
          { key: 'amount', label: 'Amount' },
          { key: 'userName', label: 'User Name' },
          { key: 'userEmail', label: 'User Email' },
          { key: 'userRoles', label: 'User Roles' },
          { key: 'bookingId', label: 'Booking ID' },
          { key: 'listingTitle', label: 'Listing Title' },
          { key: 'isAdminTransaction', label: 'Admin Transaction' },
          { key: 'status', label: 'Status' }
        ],
        'transactions',
        `Transactions Report`
      );

      toast.success(`Exported ${filtered.length} transaction(s) successfully!`);
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast.error(`Failed to export transactions: ${error.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Helper function to generate print HTML that matches PDF exactly
  const generatePrintHTML = (data, headers, title) => {
    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    const tableHeaders = headers.map(h => `<th style="background-color: #D4A373; color: white; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #B8936A;">${h.label}</th>`).join('');
    
    const tableRows = data.map(row => {
      const cells = headers.map(h => {
        const value = row[h.key];
        const displayValue = value === null || value === undefined ? 'N/A' : String(value);
        return `<td style="padding: 8px; border: 1px solid #E5E7EB;">${displayValue}</td>`;
      }).join('');
      return `<tr style="border-bottom: 1px solid #E5E7EB;">${cells}</tr>`;
    }).join('');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @media print {
              @page { margin: 0.5cm; }
              body { margin: 0; }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #1F2937;
            }
            .print-header {
              background-color: #D4A373;
              color: white;
              padding: 15px 20px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo {
              width: 40px;
              height: 40px;
              object-fit: contain;
            }
            .header-text {
              display: flex;
              flex-direction: column;
            }
            .logo-word {
              font-size: 18px;
              font-weight: bold;
              margin: 0;
            }
            .report-title {
              font-size: 14px;
              font-weight: normal;
              margin: 0;
              opacity: 0.95;
            }
            .header-right {
              text-align: right;
              font-size: 11px;
            }
            .print-content {
              padding: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              table-layout: auto; /* Allow columns to size based on content */
              font-size: 12px; /* Smaller font to fit more columns */
            }
            th {
              background-color: #D4A373;
              color: white;
              padding: 8px;
              text-align: left;
              font-weight: bold;
              border: 1px solid #B8936A;
              white-space: nowrap; /* Prevent header text from wrapping */
            }
            td {
              padding: 6px;
              border: 1px solid #E5E7EB;
              word-wrap: break-word; /* Allow long text to wrap */
              overflow-wrap: break-word;
            }
            tr:nth-child(even) {
              background-color: #F9FAFB;
            }
            @media print {
              table {
                font-size: 10px; /* Even smaller for print */
              }
              th, td {
                padding: 4px;
              }
            }
            .print-footer {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #E5E7EB;
              font-size: 10px;
              color: #6B7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <div class="header-left">
              <img src="/logo.jpg" alt="Getaways Logo" class="logo" onerror="this.style.display='none'">
              <div class="header-text">
                <p class="logo-word">Getaways</p>
                <p class="report-title">${title}</p>
              </div>
            </div>
            <div class="header-right">
              ${dateStr}<br>
              ${data.length} record(s)
            </div>
          </div>
          <div class="print-content">
            <table>
              <thead>
                <tr>
                  ${tableHeaders}
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            <div class="print-footer">
              Total: ${data.length} record(s) | Generated: ${new Date().toLocaleString()} | Getaways Platform Report
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintTransactionsDirect = async () => {
    if (isPrinting) return;
    
    try {
      setIsPrinting(true);
      
      // Create a print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print');
        setIsPrinting(false);
        return;
      }

      // Use transactionsFilter (current displayed filters)
      const filters = transactionsFilter;
      
      // Apply filtering using unified function
      let filtered = filterTransactions(allMoneyTransactions, filters);
      
      // Sort the filtered results using unified function
      filtered = sortTransactions(filtered, filters.sortBy, filters.sortOrder);

      if (filtered.length === 0) {
        toast.error('No transactions to print with the current filters');
        setIsPrinting(false);
        return;
      }

      // Format data exactly like export
      const printData = filtered.map(transaction => {
        const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date || transaction.createdAt);
        const isCredit = transaction.type === 'credit';
        const metadata = transaction.metadata || {};
        
        return {
          date: date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          type: transaction.transactionType || (isCredit ? 'Credit' : 'Debit'),
          description: transaction.description || 'N/A',
          amount: formatCurrency(transaction.amount || 0),
          userName: transaction.userName || transaction.userEmail || 'Unknown',
          userEmail: transaction.userEmail || 'N/A',
          userRoles: (transaction.userRoles || []).join(', ') || 'N/A',
          bookingId: metadata.bookingId || 'N/A',
          listingTitle: metadata.listingTitle || 'N/A',
          isAdminTransaction: transaction.isAdminTransaction ? 'Yes' : 'No',
          status: transaction.status || 'N/A'
        };
      });

      const headers = [
        { key: 'date', label: 'Date' },
        { key: 'type', label: 'Type' },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount' },
        { key: 'userName', label: 'User Name' },
        { key: 'userEmail', label: 'User Email' },
        { key: 'userRoles', label: 'User Roles' },
        { key: 'bookingId', label: 'Booking ID' },
        { key: 'listingTitle', label: 'Listing Title' },
        { key: 'isAdminTransaction', label: 'Admin Transaction' },
        { key: 'status', label: 'Status' }
      ];

      // Generate print HTML that matches PDF
      const printHTML = generatePrintHTML(printData, headers, 'Transactions Report');
      
      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
        setIsPrinting(false);
      }, 250);
      
    } catch (error) {
      console.error('Error printing transactions:', error);
      toast.error(`Failed to print transactions: ${error.message}`);
      setIsPrinting(false);
    }
  };

  // Modal export/print functions (use exportPrintFilter - independent filters)
  const handleExportTransactions = async () => {
    if (generatingReport) return;
    
    try {
      setGeneratingReport(true);
      
      // Use exportPrintFilter instead of transactionsFilter
      const filters = exportPrintFilter;
      
      // Prepare filter object for unified function - handle dateRangeObj if provided
      const filterObj = { ...filters };
      if (exportPrintDateRange && (exportPrintDateRange.from || exportPrintDateRange.to)) {
        filterObj.dateRange = {
          startDate: exportPrintDateRange.from ? format(exportPrintDateRange.from, 'yyyy-MM-dd') : '',
          endDate: exportPrintDateRange.to ? format(exportPrintDateRange.to, 'yyyy-MM-dd') : ''
        };
      }
      
      // Apply filtering using unified function
      let filtered = filterTransactions(allMoneyTransactions, filterObj);
      
      // Sort the filtered results using unified function
      filtered = sortTransactions(filtered, filters.sortBy, filters.sortOrder);

      if (filtered.length === 0) {
        toast.error('No transactions to export with the current filters');
        return;
      }

      // Format data for export
      const exportData = filtered.map(transaction => {
        const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date || transaction.createdAt);
        const isCredit = transaction.type === 'credit';
        const metadata = transaction.metadata || {};
        
        return {
          date: date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          type: transaction.transactionType || (isCredit ? 'Credit' : 'Debit'),
          description: transaction.description || 'N/A',
          amount: formatCurrency(transaction.amount || 0),
          userName: transaction.userName || transaction.userEmail || 'Unknown',
          userEmail: transaction.userEmail || 'N/A',
          userRoles: (transaction.userRoles || []).join(', ') || 'N/A',
          bookingId: metadata.bookingId || 'N/A',
          listingTitle: metadata.listingTitle || 'N/A',
          isAdminTransaction: transaction.isAdminTransaction ? 'Yes' : 'No',
          status: transaction.status || 'N/A'
        };
      });

      // Export to PDF
      const { exportToPDF } = await import('./services/reportService');
      await exportToPDF(
        exportData,
        [
          { key: 'date', label: 'Date' },
          { key: 'type', label: 'Type' },
          { key: 'description', label: 'Description' },
          { key: 'amount', label: 'Amount' },
          { key: 'userName', label: 'User Name' },
          { key: 'userEmail', label: 'User Email' },
          { key: 'userRoles', label: 'User Roles' },
          { key: 'bookingId', label: 'Booking ID' },
          { key: 'listingTitle', label: 'Listing Title' },
          { key: 'isAdminTransaction', label: 'Admin Transaction' },
          { key: 'status', label: 'Status' }
        ],
        'transactions',
        `All Transactions Report (${filtered.length} records)`
      );

      toast.success(`Exported ${filtered.length} transaction(s) successfully!`);
      setShowExportPrintModal(false);
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast.error(`Failed to export transactions: ${error.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handlePrintCashOutRequests = async () => {
    if (isPrinting) return;
    
    try {
      setIsPrinting(true);
      
      // Create a print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print');
        setIsPrinting(false);
        return;
      }

      // Use unified filtering and sorting functions
      let filtered = filterCashOutRequests(cashOutRequests);
      filtered = sortCashOutRequests(filtered);
      
      if (filtered.length === 0) {
        toast.error('No cash out requests to print with the current filters');
        setIsPrinting(false);
        return;
      }
      
      // Format data exactly like export
      const printData = filtered.map(r => {
        const date = r.createdAt ? (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)) : new Date();
        const balanceAfter = r.balanceAfter !== undefined 
          ? r.balanceAfter 
          : (r.status === 'pending' ? ((r.balanceBefore || r.currentBalance || 0) - (r.amount || 0)) : 'N/A');
        
        return {
          userName: r.userName || '',
          userEmail: r.userEmail || '',
          role: r.userRole || '',
          amount: formatCurrency(r.amount || 0),
          balanceBefore: formatCurrency(r.balanceBefore || r.currentBalance || 0),
          balanceAfter: balanceAfter !== 'N/A' ? formatCurrency(balanceAfter) : 'N/A',
          paypalEmail: r.paypalEmail || '',
          status: r.status || '',
          requestedDate: format(date, 'yyyy-MM-dd HH:mm:ss'),
          adminNotes: r.adminNotes || ''
        };
      });
      
      const headers = [
        { key: 'userName', label: 'User Name' },
        { key: 'userEmail', label: 'User Email' },
        { key: 'role', label: 'Role' },
        { key: 'amount', label: 'Amount' },
        { key: 'balanceBefore', label: 'Balance Before' },
        { key: 'balanceAfter', label: 'Balance After' },
        { key: 'paypalEmail', label: 'PayPal Email' },
        { key: 'status', label: 'Status' },
        { key: 'requestedDate', label: 'Requested Date' },
        { key: 'adminNotes', label: 'Admin Notes' }
      ];
      
      // Generate print HTML that matches PDF
      const printHTML = generatePrintHTML(printData, headers, 'Cash Out Requests Report');
      
      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
        setIsPrinting(false);
      }, 250);
      
    } catch (error) {
      console.error('Error printing cash out requests:', error);
      toast.error(`Failed to print cash out requests: ${error.message}`);
      setIsPrinting(false);
    }
  };

  const handlePrintTransactions = async () => {
    if (isPrinting) return;
    
    try {
      setIsPrinting(true);
      
      // Create a print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print');
        setIsPrinting(false);
        return;
      }

      // Use exportPrintFilter
      const filters = exportPrintFilter;
      const dateFilter = filters.dateRange.startDate || filters.dateRange.endDate ? {
        startDate: filters.dateRange.startDate ? new Date(filters.dateRange.startDate) : null,
        endDate: filters.dateRange.endDate ? new Date(filters.dateRange.endDate) : null
      } : null;

      // Generate print content using existing function
      const printContent = generateTransactionsPrintContent(allMoneyTransactions, dateFilter, filters);
      const title = 'All Transactions Report';
      
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
              .print-date {
                font-size: 12px;
                color: #666;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th, td {
                padding: 8px;
                text-align: left;
                border-bottom: 1px solid #ddd;
              }
              th {
                background-color: #f3f4f6;
                font-weight: bold;
              }
              tr:hover {
                background-color: #f9fafb;
              }
            </style>
          </head>
          <body>
            <div class="print-header">
              <div class="print-title">${title}</div>
              <div class="print-date">Generated: ${new Date().toLocaleString()}</div>
            </div>
            ${printContent}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
        setIsPrinting(false);
        setShowExportPrintModal(false);
      }, 250);
      
    } catch (error) {
      console.error('Error printing transactions:', error);
      toast.error(`Failed to print transactions: ${error.message}`);
      setIsPrinting(false);
    }
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
    // Ensure amount is a valid number
    const numAmount = typeof amount === 'number' ? amount : (typeof amount === 'string' ? parseFloat(amount) : 0);
    if (isNaN(numAmount) || !isFinite(numAmount)) {
      return '₱0.00';
    }
    return `₱${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      let d;
      if (date instanceof Date) {
        d = date;
      } else if (date?.toDate && typeof date.toDate === 'function') {
        // Firestore timestamp
        d = date.toDate();
      } else {
        d = new Date(date);
      }
      
      // Check if date is valid
      if (isNaN(d.getTime())) {
        return 'N/A';
      }
      
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Print functionality
  const handlePrintClick = (section) => {
    setPrintSection(section);
    setPrintDateRange({ from: undefined, to: undefined });
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
        if (printDateRange.from && printDateRange.to) {
          const start = new Date(printDateRange.from);
          start.setHours(0, 0, 0, 0);
          const end = new Date(printDateRange.to);
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
          printContent = generateTransactionsPrintContent(allMoneyTransactions, dateFilter, transactionsFilter);
          break;
        case 'service-fees':
          title = 'Service Fees Report';
          // Generate service fees content asynchronously
          const serviceFeesContent = await generateServiceFeesPrintContent(serviceFeesFilter, dateFilter);
          printContent = serviceFeesContent;
          break;
        case 'user-management':
          title = 'User Management Report';
          printContent = generateUserManagementPrintContent(hosts, guests, userManagementView, dateFilter, userManagementFilter);
          break;
        case 'compliance':
          title = 'Policies & Compliance Report';
          printContent = '<div class="print-section"><div class="print-section-title">Policies & Compliance</div><p>Policy data will be included here based on current filters.</p></div>';
          break;
        case 'reports':
          title = 'All Reports - Comprehensive Summary';
          // Generate all reports based on date range
          try {
            const { getReportData } = await import('./services/reportService');
            const reportTypes = [
              { id: 'financial', label: 'Financial Report', description: 'Revenue, fees, and payment analytics' },
              { id: 'bookings', label: 'Bookings Report', description: 'Complete booking history and statistics' },
              { id: 'users', label: 'Users Report', description: 'User growth and activity metrics' },
              { id: 'reviews', label: 'Reviews Report', description: 'Review analysis and ratings breakdown' },
              { id: 'hosts', label: 'Hosts Report', description: 'Host performance and earnings' },
              { id: 'compliance', label: 'Compliance Report', description: 'Policy violations and compliance status' }
            ];

            let allReportsContent = '';
            const dateRangeText = dateFilter && dateFilter.startDate && dateFilter.endDate
              ? `Date Range: ${formatDate(dateFilter.startDate)} to ${formatDate(dateFilter.endDate)}`
              : 'Date Range: All Time';

            for (const reportType of reportTypes) {
              try {
                // Note: Print all reports doesn't use filters - it shows all data for comprehensive view
                const result = await getReportData(reportType.id, dateFilter, null);
                const data = Array.isArray(result.data) ? result.data : [];
                const headers = Array.isArray(result.headers) ? result.headers : [];

                if (data.length > 0) {
                  allReportsContent += `
                    <div class="print-section" style="page-break-after: always; margin-bottom: 30px;">
                      <div class="print-section-title" style="font-size: 20px; font-weight: bold; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #2563eb;">
                        ${reportType.label}
                      </div>
                      <p style="color: #666; margin-bottom: 15px; font-size: 13px;">${reportType.description}</p>
                      <p style="color: #999; margin-bottom: 20px; font-size: 12px;">Total Records: ${data.length}</p>
                      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                          <tr style="background-color: #f3f4f6;">
                            ${headers.map(h => `<th style="padding: 10px; text-align: left; border: 1px solid #ddd; font-weight: bold;">${h.label}</th>`).join('')}
                          </tr>
                        </thead>
                        <tbody>
                          ${data.map(row => `
                            <tr>
                              ${headers.map(h => {
                                const value = row[h.key];
                                let displayValue = '';
                                if (value === null || value === undefined) {
                                  displayValue = 'N/A';
                                } else if (value instanceof Date) {
                                  displayValue = formatDate(value);
                                } else if (typeof value === 'object') {
                                  displayValue = JSON.stringify(value);
                                } else {
                                  displayValue = String(value);
                                }
                                return `<td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; word-wrap: break-word; max-width: 200px;">${displayValue}</td>`;
                              }).join('')}
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  `;
                } else {
                  allReportsContent += `
                    <div class="print-section" style="page-break-after: always; margin-bottom: 30px;">
                      <div class="print-section-title" style="font-size: 20px; font-weight: bold; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #2563eb;">
                        ${reportType.label}
                      </div>
                      <p style="color: #666; margin-bottom: 15px; font-size: 13px;">${reportType.description}</p>
                      <p style="color: #999; margin-top: 20px; font-style: italic;">No data available for the selected date range.</p>
                    </div>
                  `;
                }
              } catch (error) {
                console.error(`Error generating ${reportType.label}:`, error);
                allReportsContent += `
                  <div class="print-section" style="page-break-after: always; margin-bottom: 30px;">
                    <div class="print-section-title" style="font-size: 20px; font-weight: bold; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #2563eb;">
                      ${reportType.label}
                    </div>
                    <p style="color: #dc2626; margin-top: 20px;">Error loading report data: ${error.message}</p>
                  </div>
                `;
              }
            }

            printContent = `
              <div class="print-section">
                <div class="print-section-title" style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 10px;">
                  Comprehensive Reports Summary
                </div>
                <p style="text-align: center; color: #666; margin-bottom: 30px; font-size: 14px;">
                  ${dateRangeText}
                </p>
                <p style="text-align: center; color: #999; margin-bottom: 30px; font-size: 12px;">
                  Generated on ${new Date().toLocaleString()}
                </p>
                ${allReportsContent}
              </div>
            `;
          } catch (error) {
            console.error('Error generating all reports:', error);
            printContent = `
              <div class="print-section">
                <div class="print-section-title">Error Generating Reports</div>
                <p style="color: #dc2626;">Failed to generate reports: ${error.message}</p>
              </div>
            `;
          }
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
              * {
                box-sizing: border-box;
              }
              @media print {
                @page { 
                  margin: 1cm 0.8cm; 
                  size: A4 portrait;
                  orphans: 3;
                  widows: 3;
                }
                body { 
                  margin: 0; 
                  padding: 0;
                  font-family: Arial, sans-serif;
                  font-size: 10px;
                  line-height: 1.3;
                  overflow: visible;
                  width: 100%;
                  max-width: 100%;
                }
                .print-header {
                  page-break-after: avoid;
                  page-break-inside: avoid;
                  border-bottom: 2px solid #333;
                  padding-bottom: 10px;
                  margin-bottom: 15px;
                }
                .print-title {
                  page-break-after: avoid;
                  page-break-inside: avoid;
                  font-size: 18px;
                  font-weight: bold;
                  margin-bottom: 5px;
                }
                .print-date-range,
                .print-date {
                  page-break-inside: avoid;
                  font-size: 11px;
                  color: #666;
                  margin: 4px 0;
                }
                table {
                  width: 100%;
                  max-width: 100%;
                  border-collapse: collapse;
                  page-break-inside: auto;
                  table-layout: auto;
                  font-size: 9px;
                  margin: 15px 0;
                }
                thead {
                  display: table-header-group;
                  page-break-inside: avoid;
                  page-break-after: avoid;
                }
                tfoot {
                  display: table-footer-group;
                  page-break-inside: avoid;
                  page-break-before: avoid;
                }
                tbody {
                  display: table-row-group;
                }
                tr {
                  page-break-inside: avoid !important;
                  page-break-after: auto;
                  break-inside: avoid;
                  height: auto;
                  min-height: 20px;
                }
                th, td {
                  page-break-inside: avoid;
                  break-inside: avoid;
                  padding: 6px 5px;
                  border: 1px solid #ddd;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                  hyphens: auto;
                  vertical-align: top;
                }
                th {
                  background-color: #f3f4f6;
                  font-weight: bold;
                  text-align: left;
                  white-space: normal;
                  font-size: 9px;
                }
                td {
                  font-size: 9px;
                  white-space: normal;
                }
                .print-section {
                  page-break-after: auto;
                }
                .print-section-title {
                  page-break-after: avoid;
                  page-break-inside: avoid;
                }
                @page :first {
                  margin-top: 1.5cm;
              }
              }
              @media screen {
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                color: #333;
                  font-size: 10px;
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
                table-layout: auto;
                word-wrap: break-word;
                  font-size: 11px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
                word-wrap: break-word;
                overflow-wrap: break-word;
                  vertical-align: top;
              }
              th {
                background-color: #f2f2f2;
                font-weight: bold;
                page-break-inside: avoid;
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
                page-break-after: avoid;
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
      case 'user-management':
        if (userManagementView === 'hosts') {
          let filteredHosts = hosts.filter(host => {
            if (userManagementFilter.search) {
              const searchLower = userManagementFilter.search.toLowerCase();
              if (!host.name.toLowerCase().includes(searchLower) &&
                  !host.email.toLowerCase().includes(searchLower)) {
                return false;
              }
            }
            if (userManagementFilter.status !== 'all') {
              if (userManagementFilter.status === 'terminated' && !host.isTerminated) return false;
              if (userManagementFilter.status === 'active' && host.isTerminated) return false;
            }
            return true;
          });
          
          return {
            title: 'User Management Preview - Hosts',
            data: filteredHosts
          };
        } else {
          let filteredGuests = guests.filter(guest => {
            if (userManagementFilter.search) {
              const searchLower = userManagementFilter.search.toLowerCase();
              if (!guest.name.toLowerCase().includes(searchLower) &&
                  !guest.email.toLowerCase().includes(searchLower)) {
                return false;
              }
            }
            return true;
          });
          
          return {
            title: 'User Management Preview - Guests',
            data: filteredGuests
          };
        }
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
            ${filteredBookings.map(booking => `
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
            ${filteredReviews.map(review => `
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

  const generateTransactionsPrintContent = (transactions, dateFilter, filters = null) => {
    // Use provided filters or current transactionsFilter state
    const activeFilters = filters || transactionsFilter;
    
    // Prepare filter object for unified function - handle dateFilter if provided
    const filterObj = { ...activeFilters };
    if (dateFilter && (dateFilter.startDate || dateFilter.endDate)) {
      filterObj.dateRange = {
        startDate: dateFilter.startDate ? (dateFilter.startDate instanceof Date ? format(dateFilter.startDate, 'yyyy-MM-dd') : dateFilter.startDate) : '',
        endDate: dateFilter.endDate ? (dateFilter.endDate instanceof Date ? format(dateFilter.endDate, 'yyyy-MM-dd') : dateFilter.endDate) : ''
      };
    }
    
    // Use unified filtering and sorting functions
    let filtered = filterTransactions(transactions, filterObj);
    filtered = sortTransactions(filtered, activeFilters.sortBy || 'date', activeFilters.sortOrder || 'desc');

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
      // Build filters for hosts report
      const reportFilters = {
        hostStatus: filters?.hostStatus || 'all',
        subscriptionType: filters?.subscriptionType || 'all'
      };
      const hostsData = await generateServiceFeesReport(dateFilter, reportFilters);
      
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
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: auto; word-wrap: break-word;">
            <thead>
              <tr>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">Host Name</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">Email</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">Phone</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">Total Bookings</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">Total Earnings</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">Service Fee (10%)</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">Host Earnings (90%)</th>
              </tr>
            </thead>
            <tbody>
              ${filteredHosts.map(h => `
                <tr style="page-break-inside: avoid;">
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: left; word-wrap: break-word; overflow-wrap: break-word; max-width: 200px;">${h.hostName || 'N/A'}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: left; word-wrap: break-word; overflow-wrap: break-word; max-width: 200px;">${h.hostEmail || 'N/A'}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: left; word-wrap: break-word; overflow-wrap: break-word; max-width: 200px;">${h.hostPhone || 'N/A'}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: left; word-wrap: break-word; overflow-wrap: break-word;">${h.totalBookings || 0}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: left; word-wrap: break-word; overflow-wrap: break-word;">${formatCurrency(h.totalEarnings || 0)}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: left; word-wrap: break-word; overflow-wrap: break-word;">${formatCurrency(h.serviceFee || 0)}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: left; word-wrap: break-word; overflow-wrap: break-word;">${formatCurrency(h.hostEarnings || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${filteredTransactions.length > 0 ? `
        <div class="print-section">
          <div class="print-section-title">Subscription Transactions (${filteredTransactions.length})</div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: auto; word-wrap: break-word;">
            <thead>
              <tr>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">Date</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">Host</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">Type</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">Amount</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2; font-weight: bold; word-wrap: break-word; overflow-wrap: break-word;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map(t => `
                <tr style="page-break-inside: avoid;">
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: left; word-wrap: break-word; overflow-wrap: break-word;">${formatDate(t.date || t.createdAt)}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: left; word-wrap: break-word; overflow-wrap: break-word; max-width: 200px;">${t.metadata?.hostName || t.metadata?.hostEmail || 'N/A'}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: left; word-wrap: break-word; overflow-wrap: break-word;">${t.metadata?.subscriptionType || 'Subscription'}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: left; word-wrap: break-word; overflow-wrap: break-word;">${formatCurrency(t.amount || 0)}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: left; word-wrap: break-word; overflow-wrap: break-word;">${t.status || 'N/A'}</td>
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

  const generateUserManagementPrintContent = (hosts, guests, view, dateFilter, filters = null) => {
    if (view === 'guests') {
      let filtered = [...guests];
      
      // Apply search filter
      if (filters && filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(guest =>
          guest.name.toLowerCase().includes(searchLower) ||
          guest.email.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply status filter
      if (filters && filters.status !== 'all') {
        if (filters.status === 'blocked') {
          filtered = filtered.filter(guest => guest.isBlocked);
        } else if (filters.status === 'active') {
          filtered = filtered.filter(guest => !guest.isBlocked);
        }
      }
      
      // Apply date filter
      if (dateFilter && dateFilter.startDate && dateFilter.endDate) {
        filtered = filtered.filter(g => {
          if (g.createdAt) {
            const date = g.createdAt?.toDate ? g.createdAt.toDate() : new Date(g.createdAt);
            if (!isNaN(date.getTime())) {
              return date >= dateFilter.startDate && date <= dateFilter.endDate;
            }
          }
          return false;
        });
      }
      
      // Apply sorting
      if (filters) {
        filtered.sort((a, b) => {
          let aVal, bVal;
          if (filters.sortBy === 'bookings') {
            aVal = a.bookings || 0;
            bVal = b.bookings || 0;
          } else if (filters.sortBy === 'totalSpent') {
            aVal = a.totalSpent || 0;
            bVal = b.totalSpent || 0;
          } else {
            aVal = (a.name || '').toLowerCase();
            bVal = (b.name || '').toLowerCase();
          }
          
          if (filters.sortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
          } else {
            return bVal > aVal ? 1 : -1;
          }
        });
      }

      return `
        <div class="print-section">
          <div class="print-section-title">Guest Management Report (${filtered.length})</div>
          <table>
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Total Bookings</th>
                <th>Total Spent</th>
                <th>Status</th>
                <th>Joined Date</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(guest => `
                <tr>
                  <td>${guest.name || 'N/A'}</td>
                  <td>${guest.email || 'N/A'}</td>
                  <td>${guest.phone || 'N/A'}</td>
                  <td>${guest.bookings || 0}</td>
                  <td>${formatCurrency(guest.totalSpent || 0)}</td>
                  <td>${guest.isBlocked ? 'Blocked' : 'Active'}</td>
                  <td>${formatDate(guest.createdAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
    
    // Hosts view
    let filtered = [...hosts];
    
    // Apply search filter
    if (filters && filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(host =>
        (host.name || '').toLowerCase().includes(searchLower) ||
        (host.email || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (filters && filters.status !== 'all') {
      if (filters.status === 'terminated') {
        filtered = filtered.filter(host => host.isTerminated);
      } else if (filters.status === 'active') {
        filtered = filtered.filter(host => !host.isTerminated);
      }
    }
    
    // Apply date filter
    if (dateFilter && dateFilter.startDate && dateFilter.endDate) {
      filtered = filtered.filter(h => {
        if (h.createdAt) {
          const date = h.createdAt?.toDate ? h.createdAt.toDate() : new Date(h.createdAt);
          if (!isNaN(date.getTime())) {
            return date >= dateFilter.startDate && date <= dateFilter.endDate;
          }
        }
        return true;
      });
    }
    
    // Apply sorting
    if (filters) {
      filtered.sort((a, b) => {
        let aVal, bVal;
        if (filters.sortBy === 'earnings') {
          aVal = a.earnings || 0;
          bVal = b.earnings || 0;
        } else if (filters.sortBy === 'bookings') {
          aVal = a.bookings || 0;
          bVal = b.bookings || 0;
        } else if (filters.sortBy === 'listings') {
          aVal = a.listings || 0;
          bVal = b.listings || 0;
        } else {
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
        }
        
        if (filters.sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return bVal > aVal ? 1 : -1;
        }
      });
    }

    return `
      <div class="print-section">
        <div class="print-section-title">User Management Report - Hosts (${filtered.length})</div>
        <table>
          <thead>
            <tr>
              <th>Host Name</th>
              <th>Email</th>
              <th>Phone</th>
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
                <td>${h.phone || 'N/A'}</td>
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
        <div className="pt-36 flex items-center justify-center min-h-[calc(100vh-9rem)]">
          <Loading message="Loading admin dashboard..." size="large" />
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

      {/* Export/Print Transactions Modal */}
      <AlertDialog open={showExportPrintModal} onOpenChange={(open) => {
        setShowExportPrintModal(open);
        if (!open) {
          setShowTransactionsCalendar(false);
        } else {
          // Sync date range from exportPrintFilter to exportPrintDateRange when modal opens
          // This ensures the calendar displays the current exportPrintFilter date range
          if (exportPrintFilter.dateRange.startDate || exportPrintFilter.dateRange.endDate) {
            setExportPrintDateRange({
              from: exportPrintFilter.dateRange.startDate ? new Date(exportPrintFilter.dateRange.startDate) : undefined,
              to: exportPrintFilter.dateRange.endDate ? new Date(exportPrintFilter.dateRange.endDate) : undefined
            });
          } else {
            // Reset to empty if no date range in filter
            setExportPrintDateRange({ from: undefined, to: undefined });
          }
        }
      }}>
        <AlertDialogContent className="bg-white max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-visible">
          <AlertDialogHeader className="pb-4 border-b border-gray-200">
            <AlertDialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Download className="w-6 h-6 text-primary" />
              Export or Print Transactions
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 mt-2">
              Filter transactions and export as PDF or print. Filters are independent from the main transaction list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-6 space-y-6 relative">
            {/* Search Section */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Search</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by user, email, booking ID, or transaction ID..."
                  value={exportPrintFilter.search}
                  onChange={(e) => setExportPrintFilter(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Transaction Type</Label>
                <select
                  value={exportPrintFilter.type}
                  onChange={(e) => setExportPrintFilter(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                >
                  <option value="all">All Transaction Types</option>
                  <option value="credit">Credits Only</option>
                  <option value="debit">Debits Only</option>
                  <option value="subscription">Subscriptions</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">User Role</Label>
                <select
                  value={exportPrintFilter.userRole}
                  onChange={(e) => setExportPrintFilter(prev => ({ ...prev, userRole: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                >
                  <option value="all">All User Roles</option>
                  <option value="admin">Admin Only</option>
                  <option value="host">Hosts Only</option>
                  <option value="guest">Guests Only</option>
                </select>
              </div>
            </div>

            {/* Date Range and Sort Section */}
            <div className="space-y-4 pt-2 border-t border-gray-200">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Date Range</Label>
                <div className="relative z-50" ref={exportPrintCalendarRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowTransactionsCalendar(prev => !prev);
                    }}
                    className={`w-full px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-between border ${
                      exportPrintDateRange.from || exportPrintDateRange.to
                        ? 'bg-primary/10 text-primary border-primary/50 hover:bg-primary/20'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span className="text-sm">
                        {exportPrintDateRange.from && exportPrintDateRange.to
                          ? (exportPrintDateRange.from.getTime() === exportPrintDateRange.to.getTime()
                              ? format(exportPrintDateRange.from, 'MMM dd, yyyy')
                              : `${format(exportPrintDateRange.from, 'MMM dd, yyyy')} - ${format(exportPrintDateRange.to, 'MMM dd, yyyy')}`)
                          : exportPrintDateRange.from
                          ? `From ${format(exportPrintDateRange.from, 'MMM dd, yyyy')}...`
                          : exportPrintDateRange.to
                          ? `...To ${format(exportPrintDateRange.to, 'MMM dd, yyyy')}`
                          : 'Select Date Range'}
                      </span>
                    </div>
                    {(exportPrintDateRange.from || exportPrintDateRange.to) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExportPrintDateRange({ from: undefined, to: undefined });
                          setExportPrintFilter(prev => ({ ...prev, dateRange: { startDate: '', endDate: '' } }));
                        }}
                        className="hover:bg-primary/20 rounded-full p-1 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </button>

                  {/* Calendar Dropdown - Using Portal to render outside modal */}
                  {showExportPrintModal && showTransactionsCalendar && exportPrintCalendarRef.current && createPortal(
                    <div 
                      ref={exportPrintCalendarPopupRef}
                      onClick={(e) => {
                        // Only stop propagation if clicking on the container itself, not on child elements
                        if (e.target === e.currentTarget) {
                          e.stopPropagation();
                        }
                      }}
                      className="fixed bg-white border border-gray-300 rounded-xl shadow-2xl z-[9999] p-4" 
                      style={{ 
                        minWidth: '320px',
                        top: exportPrintCalendarRef.current.getBoundingClientRect().bottom + 8 + 'px',
                        left: exportPrintCalendarRef.current.getBoundingClientRect().left + 'px'
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Select Date Range</h3>
                        <button
                          onClick={() => setShowTransactionsCalendar(false)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      
                      {/* Selected Date Range Display */}
                      {(exportPrintDateRange.from || exportPrintDateRange.to) && (
                        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CalendarIcon className="w-5 h-5 text-primary" />
                              <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Selected Date Range</p>
                                <p className="text-sm font-bold text-gray-900">
                                  {exportPrintDateRange.from && exportPrintDateRange.to
                                    ? `${format(new Date(exportPrintDateRange.from), 'MMMM dd, yyyy')} - ${format(new Date(exportPrintDateRange.to), 'MMMM dd, yyyy')}`
                                    : exportPrintDateRange.from
                                    ? `From: ${format(new Date(exportPrintDateRange.from), 'MMMM dd, yyyy')}`
                                    : exportPrintDateRange.to
                                    ? `To: ${format(new Date(exportPrintDateRange.to), 'MMMM dd, yyyy')}`
                                    : ''}
                                </p>
                                {exportPrintDateRange.from && exportPrintDateRange.to && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {Math.ceil((new Date(exportPrintDateRange.to) - new Date(exportPrintDateRange.from)) / (1000 * 60 * 60 * 24)) + 1} day{Math.ceil((new Date(exportPrintDateRange.to) - new Date(exportPrintDateRange.from)) / (1000 * 60 * 60 * 24)) !== 0 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setExportPrintDateRange({ from: undefined, to: undefined });
                                setExportPrintFilter(prev => ({ ...prev, dateRange: { startDate: '', endDate: '' } }));
                              }}
                              className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors"
                              title="Clear date range"
                            >
                              <X className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <Calendar
                        mode="range"
                        selected={{
                          from: exportPrintDateRange.from,
                          to: exportPrintDateRange.to
                        }}
                        onSelect={(range) => {
                          // Helper function to normalize date to midnight for consistent comparison
                          const normalizeDate = (date) => {
                            if (!date) return undefined;
                            const d = new Date(date);
                            d.setHours(0, 0, 0, 0);
                            return d;
                          };
                          
                          if (range) {
                            // The range object from react-day-picker has from and to properties
                            // They are already Date objects
                            let fromDate = range.from ? normalizeDate(range.from) : undefined;
                            let toDate = range.to ? normalizeDate(range.to) : undefined;
                            
                            // Check if we had a previous selection where from and to were the same
                            // This helps us determine if user is starting a new range or continuing
                            const prevFrom = exportPrintDateRange.from ? normalizeDate(exportPrintDateRange.from) : undefined;
                            const prevTo = exportPrintDateRange.to ? normalizeDate(exportPrintDateRange.to) : undefined;
                            const hadSingleDateSelection = prevFrom && prevTo && prevFrom.getTime() === prevTo.getTime();
                            
                            // If we had a single date selection and user clicks a different date,
                            // react-day-picker will have started a new selection (from = new date, to = undefined)
                            // In this case, we want to create a range from the old from date to the new date
                            if (hadSingleDateSelection && fromDate && !toDate && prevFrom && 
                                fromDate.getTime() !== prevFrom.getTime()) {
                              // User is selecting end date for range - keep the original from date
                              // Ensure dates are in correct order (from should be before to)
                              const finalFromDate = prevFrom < fromDate ? prevFrom : fromDate;
                              const finalToDate = prevFrom < fromDate ? fromDate : prevFrom;
                              
                              // Update state immediately
                              setExportPrintDateRange({
                                from: finalFromDate,
                                to: finalToDate
                              });
                              
                              const startDate = format(finalFromDate, 'yyyy-MM-dd');
                              const endDate = format(finalToDate, 'yyyy-MM-dd');
                              setExportPrintFilter(prev => ({ ...prev, dateRange: { startDate, endDate } }));
                              
                              // Close calendar after range is selected
                              setTimeout(() => {
                                setShowTransactionsCalendar(false);
                              }, 300);
                              return;
                            }
                            
                            // If only from date is selected (single click), set to date to the same date
                            // This allows single date selection to immediately fill the field
                            if (fromDate && !toDate) {
                              toDate = new Date(fromDate); // Create a copy of the date
                            }
                            
                            // Update state immediately with the range object
                            setExportPrintDateRange({
                              from: fromDate,
                              to: toDate
                            });
                            
                            // Update filter with date strings for filtering logic
                            if (fromDate || toDate) {
                              const startDate = fromDate ? format(fromDate, 'yyyy-MM-dd') : '';
                              const endDate = toDate ? format(toDate, 'yyyy-MM-dd') : '';
                              setExportPrintFilter(prev => ({ ...prev, dateRange: { startDate, endDate } }));
                            }
                            
                            // Close calendar when both dates are selected and they are different (range selected)
                            // If they are the same (single date), keep calendar open so user can optionally select a range
                            if (fromDate && toDate && fromDate.getTime() !== toDate.getTime()) {
                              setTimeout(() => {
                                setShowTransactionsCalendar(false);
                              }, 300);
                            }
                          } else {
                            // Clear selection
                            setExportPrintDateRange({ from: undefined, to: undefined });
                            setExportPrintFilter(prev => ({ ...prev, dateRange: { startDate: '', endDate: '' } }));
                          }
                        }}
                        numberOfMonths={1}
                        showOutsideDays={true}
                        defaultMonth={exportPrintDateRange.from || exportPrintDateRange.to || new Date()}
                        month={exportPrintCalendarMonth}
                        onMonthChange={setExportPrintCalendarMonth}
                        className="w-full"
                        classNames={{
                          months: "flex flex-col",
                          month: "space-y-4",
                          caption: "flex justify-between items-center pt-1 relative mb-4 px-1 min-h-[2.5rem] w-full",
                          caption_label: "!text-lg !font-bold !text-gray-900 !flex-1 !text-center !mx-auto !block !visible !opacity-100",
                          nav: "flex items-center justify-between w-full",
                          nav_button: "h-8 w-8 bg-transparent p-0 hover:bg-gray-100 border-0 rounded-md flex items-center justify-center transition-colors [&>svg]:hidden",
                          nav_button_previous: "order-first",
                          nav_button_next: "order-last",
                          table: "w-full border-collapse space-y-1",
                          head_row: "flex mb-2",
                          head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem] text-center",
                          row: "flex w-full mt-1",
                          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                          day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-primary/10 hover:text-primary transition-colors",
                          day_range_end: "day-range-end rounded-md",
                          day_selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white rounded-md",
                          day_today: "bg-transparent text-gray-900 font-semibold",
                          day_outside: "day-outside text-gray-400 opacity-50 aria-selected:bg-accent/50 aria-selected:text-gray-400 aria-selected:opacity-30",
                          day_disabled: "text-gray-400 opacity-50 cursor-not-allowed",
                          day_range_middle: "aria-selected:bg-primary/20 aria-selected:text-gray-900 rounded-none",
                          day_hidden: "invisible"
                        }}
                        components={{
                          IconLeft: () => (
                            <ChevronLeft className="h-4 w-4 text-primary" />
                          ),
                          IconRight: () => (
                            <ChevronRight className="h-4 w-4 text-primary" />
                          ),
                        }}
                      />
                      <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => {
                            setExportPrintDateRange({ from: undefined, to: undefined });
                            setExportPrintFilter(prev => ({ ...prev, dateRange: { startDate: '', endDate: '' } }));
                          }}
                          className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTransactionsCalendar(false)}
                          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                        >
                          Done
                        </button>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Sort By</Label>
                  <div className="flex gap-2">
                    <select
                      value={exportPrintFilter.sortBy}
                      onChange={(e) => setExportPrintFilter(prev => ({ ...prev, sortBy: e.target.value }))}
                      className="flex-1 px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-white"
                    >
                      <option value="date">Date</option>
                      <option value="amount">Amount</option>
                      <option value="user">User</option>
                    </select>
                    <button
                      onClick={() => setExportPrintFilter(prev => ({ ...prev, sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc' }))}
                      className="px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 flex items-center gap-2 text-sm font-medium transition-colors bg-white"
                      title={exportPrintFilter.sortOrder === 'desc' ? 'Sort Descending' : 'Sort Ascending'}
                    >
                      {exportPrintFilter.sortOrder === 'desc' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                      {exportPrintFilter.sortOrder === 'desc' ? 'Desc' : 'Asc'}
                    </button>
                  </div>
                </div>
                
                {(exportPrintFilter.search || exportPrintFilter.type !== 'all' || exportPrintDateRange.from || exportPrintDateRange.to || exportPrintFilter.userRole !== 'all') && (
                  <button
                    onClick={() => {
                      setExportPrintFilter({
                        search: '',
                        type: 'all',
                        dateRange: { startDate: '', endDate: '' },
                        sortBy: 'date',
                        sortOrder: 'desc',
                        userRole: 'all'
                      });
                      setExportPrintDateRange({ from: undefined, to: undefined });
                    }}
                    className="px-4 py-2.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 transition-colors font-medium whitespace-nowrap"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {(exportPrintFilter.search || exportPrintFilter.type !== 'all' || exportPrintDateRange.from || exportPrintDateRange.to || exportPrintFilter.userRole !== 'all') && (
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <span className="text-sm font-semibold text-muted-foreground">Active Filters:</span>
                <div className="flex flex-wrap gap-2">
                  {exportPrintFilter.search && (
                    <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg flex items-center gap-2 text-sm font-medium border border-blue-200">
                      Search: &quot;{exportPrintFilter.search}&quot;
                      <button 
                        onClick={() => setExportPrintFilter(prev => ({ ...prev, search: '' }))} 
                        className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                        title="Remove search filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {exportPrintFilter.type !== 'all' && (
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm font-medium border border-green-200">
                      Type: {exportPrintFilter.type.charAt(0).toUpperCase() + exportPrintFilter.type.slice(1)}
                      <button 
                        onClick={() => setExportPrintFilter(prev => ({ ...prev, type: 'all' }))} 
                        className="hover:bg-green-100 rounded-full p-0.5 transition-colors"
                        title="Remove type filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {exportPrintFilter.userRole !== 'all' && (
                    <span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg flex items-center gap-2 text-sm font-medium border border-purple-200">
                      Role: {exportPrintFilter.userRole.charAt(0).toUpperCase() + exportPrintFilter.userRole.slice(1)}
                      <button 
                        onClick={() => setExportPrintFilter(prev => ({ ...prev, userRole: 'all' }))} 
                        className="hover:bg-purple-100 rounded-full p-0.5 transition-colors"
                        title="Remove role filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {exportPrintDateRange.from && (
                    <span className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg flex items-center gap-2 text-sm font-medium border border-orange-200">
                      From: {format(new Date(exportPrintDateRange.from), 'MMM dd, yyyy')}
                      <button 
                        onClick={() => {
                          setExportPrintDateRange(prev => ({ ...prev, from: undefined }));
                          setExportPrintFilter(prev => ({ ...prev, dateRange: { ...prev.dateRange, startDate: '' } }));
                        }} 
                        className="hover:bg-orange-100 rounded-full p-0.5 transition-colors"
                        title="Remove start date filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {exportPrintDateRange.to && (
                    <span className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg flex items-center gap-2 text-sm font-medium border border-orange-200">
                      To: {format(new Date(exportPrintDateRange.to), 'MMM dd, yyyy')}
                      <button 
                        onClick={() => {
                          setExportPrintDateRange(prev => ({ ...prev, to: undefined }));
                          setExportPrintFilter(prev => ({ ...prev, dateRange: { ...prev.dateRange, endDate: '' } }));
                        }} 
                        className="hover:bg-orange-100 rounded-full p-0.5 transition-colors"
                        title="Remove end date filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Preview Count and Data Table */}
            {(() => {
              // Prepare filter object for unified function - handle exportPrintDateRange if provided
              const filterObj = { ...exportPrintFilter };
              if (exportPrintDateRange && (exportPrintDateRange.from || exportPrintDateRange.to)) {
                filterObj.dateRange = {
                  startDate: exportPrintDateRange.from ? format(exportPrintDateRange.from, 'yyyy-MM-dd') : '',
                  endDate: exportPrintDateRange.to ? format(exportPrintDateRange.to, 'yyyy-MM-dd') : ''
                };
              }
              
              // Use unified filtering and sorting functions
              let filteredTransactions = filterTransactions(allMoneyTransactions, filterObj);
              filteredTransactions = sortTransactions(filteredTransactions, exportPrintFilter.sortBy, exportPrintFilter.sortOrder);
              
              const previewCount = filteredTransactions.length;
              const previewData = filteredTransactions.slice(0, 50); // Show first 50 for preview
              
              return (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-lg">
                    <p className="text-sm text-primary font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {previewCount} transaction{previewCount !== 1 ? 's' : ''} will be exported/printed
                    </p>
                  </div>
                  
                  {/* Preview Table */}
                  {previewCount > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900">Preview ({previewData.length} of {previewCount} shown)</h3>
                      </div>
                      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {previewData.map((transaction, index) => {
                              const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date || transaction.createdAt);
                              const amount = transaction.amount || 0;
                              const isCredit = transaction.type === 'credit' || transaction.type === 'cash_in';
                              
                              return (
                                <tr key={transaction.id || index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                                    {format(date, 'MMM dd, yyyy, HH:mm')}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-900">
                                    <div className="max-w-[200px]">
                                      <div className="font-medium truncate">{transaction.userName || 'N/A'}</div>
                                      <div className="text-gray-500 truncate">{transaction.userEmail || 'N/A'}</div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-700 max-w-[250px]">
                                    <div className="truncate" title={transaction.description || 'N/A'}>
                                      {transaction.description || 'N/A'}
                                    </div>
                                  </td>
                                  <td className={`px-4 py-3 whitespace-nowrap text-xs font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                    {isCredit ? '+' : '-'}{formatCurrency(Math.abs(amount))}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      transaction.type === 'credit' || transaction.type === 'cash_in' 
                                        ? 'bg-green-100 text-green-700' 
                                        : transaction.type === 'subscription'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {transaction.type === 'credit' ? 'Credit' : 
                                       transaction.type === 'cash_in' ? 'Cash In' :
                                       transaction.type === 'cash_out' ? 'Cash Out' :
                                       transaction.type === 'payment' ? 'Payment' :
                                       transaction.metadata?.paymentType === 'subscription_payment' ? 'Subscription' :
                                       transaction.type || 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 font-mono">
                                    {transaction.id ? transaction.id.substring(0, 12) + '...' : 'N/A'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {previewCount > 50 && (
                        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-xs text-gray-600 text-center">
                          Showing first 50 of {previewCount} transactions. All {previewCount} transactions will be included in export/print.
                        </div>
                      )}
                    </div>
                  )}
                  
                  {previewCount === 0 && (
                    <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                      <p className="text-gray-500">No transactions match the current filters.</p>
                      <p className="text-sm text-gray-400 mt-2">Try adjusting your filters to see results.</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <AlertDialogFooter className="gap-3 mt-6 pt-4 border-t border-gray-200">
            <AlertDialogCancel
              onClick={() => {
                setShowExportPrintModal(false);
              }}
              className="px-6 py-2.5"
            >
              Cancel
            </AlertDialogCancel>
            <button
              onClick={handlePrintTransactions}
              disabled={isPrinting || generatingReport}
              className="px-6 py-2.5 bg-gray-700 hover:bg-gray-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {isPrinting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Printing...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  Print
                </>
              )}
            </button>
            <AlertDialogAction
              onClick={handleExportTransactions}
              disabled={generatingReport || isPrinting}
              className="bg-primary hover:bg-primary/90 px-6 py-2.5 font-medium"
            >
              {generatingReport ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 pt-32">
        {/* Sidebar Menu - Starts at top, sticky until footer */}
        <aside className={`w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 transition-all duration-300 ${
          sidebarOpen 
            ? 'fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto' 
            : 'hidden lg:block'
        } lg:ml-6 lg:pl-2`}>
          <div className={`card-listing p-4 lg:p-5 lg:mt-8 lg:sticky lg:top-[10rem] lg:self-start lg:h-auto lg:min-h-[calc(100vh-12rem)] lg:max-h-[calc(100vh-12rem)] overflow-visible border border-border/50 rounded-lg shadow-sm ${
            sidebarOpen ? 'h-screen overflow-y-auto scrollbar-hide' : 'lg:overflow-y-auto lg:scrollbar-hide'
          }`}>
            {/* Mobile Close Button */}
            <div className="flex items-center justify-between mb-6 lg:hidden">
              <h2 className="font-heading text-xl font-bold text-foreground">Navigation Menu</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>


            {/* Menu Items */}
            <nav className="flex flex-col h-full lg:justify-between space-y-2 lg:space-y-4">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3, description: 'Dashboard overview and analytics' },
                { id: 'transactions', label: 'All Transactions', icon: Receipt, description: 'View all money transactions' },
                { id: 'service-fees', label: 'Service Fees', icon: DollarSign, description: 'Manage platform fees and commissions' },
                { id: 'user-management', label: 'User Management', icon: Users, description: 'Manage hosts and guests accounts' },
                { id: 'platform-settings', label: 'Platform Settings', icon: Settings, description: 'Payment methods & platform settings' },
                { id: 'compliance', label: 'Policy & Compliance', icon: Shield, description: 'Manage policies and compliance rules' },
                { id: 'reports', label: 'Reports', icon: FileText, description: 'Generate and export reports' }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false); // Close mobile menu on selection
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-300 text-left group relative ${
                    activeTab === tab.id
                      ? 'bg-primary/15 border-2 border-primary shadow-md shadow-primary/10'
                      : 'bg-muted/40 border-2 border-transparent hover:bg-muted hover:border-border/50 hover:shadow-sm'
                  }`}
                >
                  {/* Active Indicator Line */}
                  {activeTab === tab.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                  )}
                  <div className={`flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background text-muted-foreground group-hover:text-primary group-hover:bg-primary/10'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
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
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
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
          <div className="max-w-[95%] xl:max-w-7xl mx-auto px-4 sm:px-6 lg:pt-8 pb-12">
            <div className="card-listing p-6">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 flex flex-col items-center text-center">
                  <h1 className="font-heading text-2xl font-bold text-foreground mb-2 flex items-center gap-3 justify-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-foreground" />
                    </div>
                      Admin Dashboard
                    </h1>
                  <p className="text-muted-foreground text-base">
                    Comprehensive insights and controls for your Getaways platform
                    </p>
                  </div>
                <div className="flex items-center gap-3">
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


            {/* Main Stats Cards - Enhanced Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                      <BookOpen className="w-6 h-6 text-white" />
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
                    <BookOpen className="w-3 h-3" />
                    <span>All time bookings</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
              </div>

              {/* Key Performance Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                              <TrendingUp className="w-4 h-4 text-blue-600" />
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
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <Clock className="w-5 h-5 text-blue-600" />
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
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
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
                            onClick={() => {
                              const category = booking.listingCategory || 'accommodation';
                              const categoryRoutes = {
                                'accommodation': '/accommodations',
                                'experience': '/experiences',
                                'service': '/services'
                              };
                              const baseRoute = categoryRoutes[category] || '/accommodations';
                              navigate(`${baseRoute}/${booking.listingId}`);
                            }}
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
                      onClick={() => setActiveTab('user-management')}
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
                          onClick={() => setActiveTab('user-management')}
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
                                    <BookOpen className="w-3 h-3" />
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
                      <FileText className="w-5 h-5 text-blue-600" />
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
                              onClick={() => {
                                const category = booking.listingCategory || 'accommodation';
                                const categoryRoutes = {
                                  'accommodation': '/accommodations',
                                  'experience': '/experiences',
                                  'service': '/services'
                                };
                                const baseRoute = categoryRoutes[category] || '/accommodations';
                                navigate(`${baseRoute}/${booking.listingId}`);
                              }}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                              title="View listing details"
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
                        <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
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
            <div className="space-y-6 lg:pt-8">
              {/* All Money Transactions Title and Statistics Cards */}
              <div className="card-listing p-6">
                <div className="flex items-center justify-center mb-6">
                  <div className="text-center">
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-2 flex items-center gap-3 justify-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                        <Receipt className="w-6 h-6 text-foreground" />
                  </div>
                      All Money Transactions
                    </h2>
                    <p className="text-muted-foreground text-base">Complete history of all money-related transactions across the platform</p>
                  </div>
              </div>

                {/* Comprehensive Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {(() => {
                    // Calculate comprehensive statistics
                    const totalCredits = allMoneyTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + (t.amount || 0), 0);
                    const totalDebits = allMoneyTransactions.filter(t => {
                      return t.isAdminTransaction && (t.type === 'payment' || t.type === 'cash_out');
                    }).reduce((sum, t) => sum + (t.amount || 0), 0);
                    const subscriptions = allMoneyTransactions.filter(t => t.metadata?.paymentType === 'subscription_payment');
                    const subscriptionAmount = subscriptions.reduce((sum, t) => sum + (t.amount || 0), 0);
                    const netBalance = totalCredits - totalDebits;
                    const totalTransactions = allMoneyTransactions.length;
                    
                    // Today's transactions
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const todayTransactions = allMoneyTransactions.filter(t => {
                      const txDate = t.date instanceof Date ? t.date : new Date(t.date || t.createdAt);
                      return txDate >= today;
                    });
                    const todayCredits = todayTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + (t.amount || 0), 0);
                    const todayCount = todayTransactions.length;
                    
                    // This month's transactions
                    const thisMonth = new Date();
                    thisMonth.setDate(1);
                    thisMonth.setHours(0, 0, 0, 0);
                    const thisMonthTransactions = allMoneyTransactions.filter(t => {
                      const txDate = t.date instanceof Date ? t.date : new Date(t.date || t.createdAt);
                      return txDate >= thisMonth;
                    });
                    const thisMonthCredits = thisMonthTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + (t.amount || 0), 0);
                    
                    return (
                      <>
                        <div className="relative overflow-hidden p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/20 rounded-full -mr-16 -mt-16"></div>
                          <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                              <div className="p-3 bg-green-100 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                              </div>
                              <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 text-green-700 rounded-full">
                                {todayCount} Today
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-green-900 mb-1">Total Credits</p>
                            <p className="text-3xl font-bold text-green-700 mb-2">{formatCurrency(totalCredits)}</p>
                            <div className="flex items-center gap-2 text-xs text-green-600">
                              <span>Today: {formatCurrency(todayCredits)}</span>
                              <span>•</span>
                              <span>This Month: {formatCurrency(thisMonthCredits)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="relative overflow-hidden p-6 bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-red-200/20 rounded-full -mr-16 -mt-16"></div>
                          <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                              <div className="p-3 bg-red-100 rounded-lg">
                                <TrendingDown className="w-6 h-6 text-red-600" />
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-red-900 mb-1">Total Debits</p>
                            <p className="text-3xl font-bold text-red-700 mb-2">{formatCurrency(totalDebits)}</p>
                            <p className="text-xs text-red-600">Outgoing Funds</p>
                          </div>
                        </div>
                        
                        <div className="relative overflow-hidden p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full -mr-16 -mt-16"></div>
                          <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                              <div className="p-3 bg-blue-100 rounded-lg">
                                <DollarSign className="w-6 h-6 text-blue-600" />
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-blue-900 mb-1">Net Balance</p>
                            <p className={`text-3xl font-bold mb-2 ${netBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                              {formatCurrency(netBalance)}
                            </p>
                            <p className="text-xs text-blue-600">{totalTransactions} Total Transactions</p>
                          </div>
                        </div>
                        
                        <div className="relative overflow-hidden p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full -mr-16 -mt-16"></div>
                          <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                              <div className="p-3 bg-purple-100 rounded-lg">
                                <CreditCard className="w-6 h-6 text-purple-600" />
                              </div>
                              <span className="text-xs font-semibold px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full">
                                {subscriptions.length}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-purple-900 mb-1">Subscriptions</p>
                            <p className="text-3xl font-bold text-purple-700 mb-2">{formatCurrency(subscriptionAmount)}</p>
                            <p className="text-xs text-purple-600">Subscription Payments</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Additional Statistics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(() => {
                    const earnings = allMoneyTransactions.filter(t => t.metadata?.paymentType === 'booking_payment' || t.transactionType?.includes('Earnings')).reduce((sum, t) => sum + (t.amount || 0), 0);
                    const avgTransactionAmount = allMoneyTransactions.length > 0 
                      ? allMoneyTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) / allMoneyTransactions.length 
                      : 0;
                    const uniqueUsers = new Set(allMoneyTransactions.map(t => t.userEmail || t.userId)).size;
                    const hostTransactions = allMoneyTransactions.filter(t => {
                      const roles = t.userRoles || [];
                      return roles.includes('host') || (!t.isAdminTransaction && !roles.includes('guest'));
                    }).length;
                    const guestTransactions = allMoneyTransactions.filter(t => {
                      const roles = t.userRoles || [];
                      return roles.includes('guest');
                    }).length;
                    
                    return (
                      <>
                        <div className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-orange-900 mb-1">Total Earnings</p>
                              <p className="text-2xl font-bold text-orange-700">{formatCurrency(earnings)}</p>
                              <p className="text-xs text-orange-600 mt-1">From Bookings</p>
                            </div>
                            <div className="p-3 bg-orange-100 rounded-lg">
                              <Award className="w-6 h-6 text-orange-600" />
                            </div>
                          </div>
                        </div>
                        <div className="p-5 bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-indigo-900 mb-1">Avg Transaction</p>
                              <p className="text-2xl font-bold text-indigo-700">{formatCurrency(avgTransactionAmount)}</p>
                              <p className="text-xs text-indigo-600 mt-1">Per Transaction</p>
                            </div>
                            <div className="p-3 bg-indigo-100 rounded-lg">
                              <BarChart3 className="w-6 h-6 text-indigo-600" />
                            </div>
                          </div>
                        </div>
                        <div className="p-5 bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-teal-900 mb-1">Active Users</p>
                              <p className="text-2xl font-bold text-teal-700">{uniqueUsers}</p>
                              <p className="text-xs text-teal-600 mt-1">
                                {hostTransactions} Host • {guestTransactions} Guest
                              </p>
                            </div>
                            <div className="p-3 bg-teal-100 rounded-lg">
                              <Users className="w-6 h-6 text-teal-600" />
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                </div>

              {/* Cash Out Requests Section */}
              <div className="card-listing p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading text-xl font-bold text-foreground">Cash Out Requests</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (generatingReport) return;
                        try {
                          setGeneratingReport(true);
                          
                          // Use unified filtering and sorting functions
                          let filtered = filterCashOutRequests(cashOutRequests);
                          filtered = sortCashOutRequests(filtered);
                          
                          if (filtered.length === 0) {
                            toast.error('No cash out requests to export with the current filters');
                            return;
                          }
                          
                          // Format data for export
                          const exportData = filtered.map(r => {
                            const date = r.createdAt ? (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)) : new Date();
                            const balanceAfter = r.balanceAfter !== undefined 
                              ? r.balanceAfter 
                              : (r.status === 'pending' ? ((r.balanceBefore || r.currentBalance || 0) - (r.amount || 0)) : 'N/A');
                            
                            return {
                              userName: r.userName || '',
                              userEmail: r.userEmail || '',
                              role: r.userRole || '',
                              amount: formatCurrency(r.amount || 0),
                              balanceBefore: formatCurrency(r.balanceBefore || r.currentBalance || 0),
                              balanceAfter: balanceAfter !== 'N/A' ? formatCurrency(balanceAfter) : 'N/A',
                              paypalEmail: r.paypalEmail || '',
                              status: r.status || '',
                              requestedDate: format(date, 'yyyy-MM-dd HH:mm:ss'),
                              adminNotes: r.adminNotes || ''
                            };
                          });
                          
                          // Export to PDF with branding
                          await exportToPDFWithBranding(
                            exportData,
                            [
                              { key: 'userName', label: 'User Name' },
                              { key: 'userEmail', label: 'User Email' },
                              { key: 'role', label: 'Role' },
                              { key: 'amount', label: 'Amount' },
                              { key: 'balanceBefore', label: 'Balance Before' },
                              { key: 'balanceAfter', label: 'Balance After' },
                              { key: 'paypalEmail', label: 'PayPal Email' },
                              { key: 'status', label: 'Status' },
                              { key: 'requestedDate', label: 'Requested Date' },
                              { key: 'adminNotes', label: 'Admin Notes' }
                            ],
                            'cash-out-requests',
                            'Cash Out Requests Report'
                          );
                          
                          toast.success(`Exported ${filtered.length} cash out request(s) successfully!`);
                        } catch (error) {
                          console.error('Error exporting cash out requests:', error);
                          toast.error(`Failed to export cash out requests: ${error.message}`);
                        } finally {
                          setGeneratingReport(false);
                        }
                      }}
                      disabled={generatingReport}
                      className="btn-outline flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Export Cash Out Requests"
                    >
                      {generatingReport ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Export
                        </>
                      )}
                    </button>
                    <button
                      onClick={handlePrintCashOutRequests}
                      disabled={isPrinting}
                      className="btn-outline flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Print Cash Out Requests"
                    >
                      {isPrinting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Printing...
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4" />
                          Print
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Statistics Cards */}
                {(() => {
                  const pending = cashOutRequests.filter(r => r.status === 'pending');
                  const approved = cashOutRequests.filter(r => r.status === 'approved');
                  const rejected = cashOutRequests.filter(r => r.status === 'rejected');
                  const pendingAmount = pending.reduce((sum, r) => sum + (r.amount || 0), 0);
                  const approvedAmount = approved.reduce((sum, r) => sum + (r.amount || 0), 0);
                  const totalAmount = cashOutRequests.reduce((sum, r) => sum + (r.amount || 0), 0);
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-yellow-700">Pending</span>
                          <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                        <p className="text-2xl font-bold text-yellow-900">{pending.length}</p>
                        <p className="text-xs text-yellow-700 mt-1">₱{pendingAmount.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-700">Approved</span>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-green-900">{approved.length}</p>
                        <p className="text-xs text-green-700 mt-1">₱{approvedAmount.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-red-700">Rejected</span>
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <p className="text-2xl font-bold text-red-900">{rejected.length}</p>
                        <p className="text-xs text-red-700 mt-1">{rejected.length} request(s)</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-700">Total</span>
                          <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{cashOutRequests.length}</p>
                        <p className="text-xs text-blue-700 mt-1">₱{totalAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Filters and Search */}
                <div className="mb-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px] max-w-md">
                      <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                          type="text"
                        placeholder="Search by name, email, or PayPal..."
                        value={cashOutRequestSearch}
                        onChange={(e) => setCashOutRequestSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Status:</Label>
                    <select 
                      value={cashOutRequestFilter} 
                      onChange={(e) => setCashOutRequestFilter(e.target.value)}
                      className="w-40 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="all">All Requests</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Sort:</Label>
                    <select 
                      value={cashOutRequestSort.field}
                      onChange={(e) => setCashOutRequestSort({ ...cashOutRequestSort, field: e.target.value })}
                      className="w-40 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="createdAt">Request Date</option>
                      <option value="amount">Amount</option>
                      <option value="userName">User Name</option>
                      <option value="status">Status</option>
                    </select>
                    <button
                      onClick={() => setCashOutRequestSort({ ...cashOutRequestSort, order: cashOutRequestSort.order === 'asc' ? 'desc' : 'asc' })}
                      className="p-2 border border-border rounded-lg hover:bg-muted transition-colors"
                      title={cashOutRequestSort.order === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                    >
                      {cashOutRequestSort.order === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                  <div className="flex gap-2 items-center relative">
                    <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Date Range:</label>
                    <div className="relative">
                      <button
                        ref={cashOutRequestCalendarButtonRef}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (cashOutRequestCalendarButtonRef.current) {
                            const rect = cashOutRequestCalendarButtonRef.current.getBoundingClientRect();
                            setCashOutRequestCalendarPosition({
                              top: rect.bottom + window.scrollY + 8,
                              left: rect.left + window.scrollX
                            });
                          }
                          setShowCashOutRequestCalendar(!showCashOutRequestCalendar);
                        }}
                        className="px-4 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-background hover:bg-muted/50 flex items-center gap-2 min-w-[200px] justify-between transition-all font-medium"
                      >
                        <span className="text-foreground">
                          {cashOutRequestDateRange.startDate && cashOutRequestDateRange.endDate
                            ? `${new Date(cashOutRequestDateRange.startDate).toLocaleDateString()} - ${new Date(cashOutRequestDateRange.endDate).toLocaleDateString()}`
                            : cashOutRequestDateRange.startDate
                            ? `${new Date(cashOutRequestDateRange.startDate).toLocaleDateString()} - ...`
                            : 'Select date range'}
                        </span>
                        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {showCashOutRequestCalendar && createPortal(
                        <div 
                          data-calendar-popup="cash-out-requests"
                          className="fixed z-[9999] bg-white border border-border rounded-lg shadow-lg p-4"
                          style={{
                            top: cashOutRequestCalendarPosition.top > 0 ? `${cashOutRequestCalendarPosition.top}px` : '50%',
                            left: cashOutRequestCalendarPosition.left > 0 ? `${cashOutRequestCalendarPosition.left}px` : '50%',
                            transform: cashOutRequestCalendarPosition.top > 0 ? 'none' : 'translate(-50%, -50%)'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Calendar
                            mode="range"
                            selected={{
                              from: cashOutRequestDateRange.startDate ? new Date(cashOutRequestDateRange.startDate) : undefined,
                              to: cashOutRequestDateRange.endDate ? new Date(cashOutRequestDateRange.endDate) : undefined
                            }}
                            onSelect={(range) => {
                              if (range) {
                                const startDate = range.from ? format(range.from, 'yyyy-MM-dd') : '';
                                const endDate = range.to ? format(range.to, 'yyyy-MM-dd') : '';
                                setCashOutRequestDateRange({ startDate, endDate });
                                // Close calendar when both dates are selected
                                if (range.from && range.to) {
                                  setShowCashOutRequestCalendar(false);
                                }
                              } else {
                                setCashOutRequestDateRange({ startDate: '', endDate: '' });
                              }
                            }}
                            numberOfMonths={1}
                            showOutsideDays={false}
                            className="w-full bg-white"
                            classNames={{
                              months: "flex flex-col bg-white",
                              month: "space-y-4 bg-white",
                              caption: "flex justify-between items-center pt-1 relative mb-4 px-1 min-h-[2.5rem] w-full bg-white",
                              caption_label: "!text-lg !font-bold !text-foreground !flex-1 !text-center !mx-auto !block !visible !opacity-100",
                              nav: "flex items-center justify-between w-full",
                              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                              nav_button_previous: "absolute left-1",
                              nav_button_next: "absolute right-1",
                              table: "w-full border-collapse space-y-1 bg-white",
                              head_row: "flex bg-white",
                              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                              row: "flex w-full mt-2 bg-white",
                              cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 bg-white",
                              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                              day_range_end: "day-range-end",
                              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                              day_today: "bg-accent text-accent-foreground",
                              day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                              day_disabled: "text-muted-foreground opacity-50",
                              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                              day_hidden: "invisible",
                            }}
                          />
                          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                            <button
                              onClick={() => {
                                setCashOutRequestDateRange({ startDate: '', endDate: '' });
                                setShowCashOutRequestCalendar(false);
                              }}
                              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                            >
                              Clear
                            </button>
                            <button
                              onClick={() => setShowCashOutRequestCalendar(false)}
                              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                            >
                              Done
                            </button>
                          </div>
                        </div>,
                        document.body
                      )}
                    </div>
                  </div>
                  {(cashOutRequestFilter !== 'all' || cashOutRequestSearch || cashOutRequestDateRange.startDate || cashOutRequestDateRange.endDate) && (
                    <button
                      onClick={() => {
                        setCashOutRequestFilter('all');
                        setCashOutRequestSearch('');
                        setCashOutRequestDateRange({ startDate: '', endDate: '' });
                      }}
                      className="px-4 py-2 text-sm border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 font-medium transition-all"
                    >
                      <X className="w-4 h-4" />
                      Clear All Filters
                    </button>
                  )}
                  <div className="text-sm text-muted-foreground ml-auto font-bold">
                    {(() => {
                      // Use unified filtering function
                      const filtered = filterCashOutRequests(cashOutRequests);
                      return `${filtered.length} request(s)`;
                    })()}
                  </div>
                </div>

                {/* Cash Out Requests Table */}
                {loadingCashOutRequests ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="border border-border rounded-lg">
                    <table className="w-full table-auto">
                      <thead className="bg-primary">
                        <tr className="border-b border-primary/20">
                          <th className="text-center p-2 text-sm font-bold text-white w-[14%]">User</th>
                          <th className="text-center p-2 text-sm font-bold text-white w-[7%]">Role</th>
                          <th className="text-center p-2 text-sm font-bold text-white w-[9%]">Amount</th>
                          <th className="text-center p-2 text-sm font-bold text-white w-[10%]">Balance Before</th>
                          <th className="text-center p-2 text-sm font-bold text-white w-[10%]">Balance After</th>
                          <th className="text-center p-2 text-sm font-bold text-white w-[14%]">PayPal Email</th>
                          <th className="text-center p-2 text-sm font-bold text-white w-[8%]">Status</th>
                          <th className="text-center p-2 text-sm font-bold text-white w-[10%]">Requested</th>
                          <th className="text-center p-2 text-sm font-bold text-white w-[18%]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Use unified filtering and sorting functions
                          let filtered = filterCashOutRequests(cashOutRequests);
                          filtered = sortCashOutRequests(filtered);
                          
                          return filtered.map(request => (
                            <tr key={request.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                              <td className="p-2 text-center">
                                <div className="flex flex-col items-center">
                                  <p className="text-xs font-medium text-foreground truncate w-full" title={request.userName || 'Unknown'}>{request.userName || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground truncate w-full" title={request.userEmail || 'N/A'}>{request.userEmail || 'N/A'}</p>
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap inline-block ${
                                  request.userRole === 'Host' 
                                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                                    : 'bg-blue-100 text-blue-700 border border-blue-300'
                                }`}>
                                  {request.userRole || 'N/A'}
                                </span>
                              </td>
                              <td className="p-2 text-xs font-semibold text-foreground whitespace-nowrap text-center">
                                ₱{request.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                              </td>
                              <td className="p-2 text-xs text-foreground whitespace-nowrap text-center">
                                ₱{request.balanceBefore?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || request.currentBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                              </td>
                              <td className="p-2 text-xs text-foreground whitespace-nowrap text-center">
                                {request.balanceAfter !== undefined 
                                  ? `₱${request.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : request.status === 'pending'
                                    ? `₱${((request.balanceBefore || request.currentBalance || 0) - (request.amount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : 'N/A'}
                              </td>
                              <td className="p-2 text-xs text-foreground text-center">
                                <span className="truncate block" title={request.paypalEmail || 'N/A'}>{request.paypalEmail || 'N/A'}</span>
                              </td>
                              <td className="p-2 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-block ${
                                  request.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-300' :
                                  request.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-300' :
                                  'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                }`}>
                                  {request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
                                </span>
                              </td>
                              <td className="p-2 text-xs text-muted-foreground whitespace-nowrap text-center">
                                {request.createdAt ? formatDate(request.createdAt) : 'N/A'}
                              </td>
                              <td className="p-2 text-center">
                                {request.status === 'pending' && (
                                  <button
                                    onClick={() => {
                                      setSelectedCashOutRequest(request);
                                      setCashOutAdminNotes('');
                                      setShowCashOutRequestModal(true);
                                    }}
                                    className="btn-primary text-xs px-2 py-1 whitespace-nowrap mx-auto"
                                  >
                                    Review
                                  </button>
                                )}
                                {request.status !== 'pending' && (
                                  <div className="space-y-0.5 flex flex-col items-center">
                                    {request.adminNotes && (
                                      <div className="text-xs text-muted-foreground" title={request.adminNotes}>
                                        <p className="truncate">"{request.adminNotes}"</p>
                                      </div>
                                    )}
                                    {request.status === 'approved' && (
                                      <span className="text-xs text-green-600 font-bold">Processed</span>
                                    )}
                                    {request.status === 'rejected' && (
                                      <span className="text-xs text-red-600 font-bold">Rejected</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                    {(() => {
                      const filtered = cashOutRequests.filter(r => {
                        const statusMatch = cashOutRequestFilter === 'all' ? true : r.status === cashOutRequestFilter;
                        const searchMatch = !cashOutRequestSearch || 
                          (r.userName?.toLowerCase().includes(cashOutRequestSearch.toLowerCase()) ||
                           r.userEmail?.toLowerCase().includes(cashOutRequestSearch.toLowerCase()) ||
                           r.paypalEmail?.toLowerCase().includes(cashOutRequestSearch.toLowerCase()));
                        
                        // Date range filter
                        let dateMatch = true;
                        if (cashOutRequestDateRange.startDate || cashOutRequestDateRange.endDate) {
                          const requestDate = r.createdAt ? (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)) : null;
                          if (requestDate) {
                            const requestDateStr = format(requestDate, 'yyyy-MM-dd');
                            if (cashOutRequestDateRange.startDate && requestDateStr < cashOutRequestDateRange.startDate) {
                              dateMatch = false;
                            }
                            if (cashOutRequestDateRange.endDate && requestDateStr > cashOutRequestDateRange.endDate) {
                              dateMatch = false;
                            }
                          } else {
                            dateMatch = false;
                          }
                        }
                        
                        return statusMatch && searchMatch && dateMatch;
                      });
                      
                      return filtered.length === 0 ? (
                        <div className="text-center py-12">
                          <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-muted-foreground text-lg">No cash out requests found</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {cashOutRequestFilter === 'all' && !cashOutRequestSearch
                              ? 'Cash out requests will appear here when users request withdrawals'
                              : `No matching requests found${cashOutRequestSearch ? ' for your search' : ''}`}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>

              {/* Transactions Section */}
              <div className="card-listing p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading text-xl font-bold text-foreground">Transactions</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportTransactionsDirect}
                      disabled={generatingReport}
                      className="btn-outline flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Export Current Transactions"
                    >
                      {generatingReport ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Export
                        </>
                      )}
                    </button>
                    <button
                      onClick={handlePrintTransactionsDirect}
                      disabled={isPrinting}
                      className="btn-outline flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Print Current Transactions"
                    >
                      {isPrinting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Printing...
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4" />
                          Print
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Statistics Cards */}
                {(() => {
                  const totalTransactions = allMoneyTransactions.length;
                  const credits = allMoneyTransactions.filter(t => t.type === 'credit');
                  const creditsCount = credits.length;
                  const creditsAmount = credits.reduce((sum, t) => sum + (t.amount || 0), 0);
                  const debits = allMoneyTransactions.filter(t => t.type === 'debit' || t.type === 'payment' || t.type === 'cash_out');
                  const debitsCount = debits.length;
                  const debitsAmount = debits.reduce((sum, t) => sum + (t.amount || 0), 0);
                  const subscriptions = allMoneyTransactions.filter(t => t.metadata?.paymentType === 'subscription_payment');
                  const subscriptionsCount = subscriptions.length;
                  const subscriptionsAmount = subscriptions.reduce((sum, t) => sum + (t.amount || 0), 0);
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-700">Total</span>
                          <Receipt className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{totalTransactions}</p>
                        <p className="text-xs text-blue-700 mt-1">All Transactions</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-700">Credits</span>
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-green-900">{creditsCount}</p>
                        <p className="text-xs text-green-700 mt-1">₱{creditsAmount.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-red-700">Debits</span>
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        </div>
                        <p className="text-2xl font-bold text-red-900">{debitsCount}</p>
                        <p className="text-xs text-red-700 mt-1">₱{debitsAmount.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-purple-700">Subscriptions</span>
                          <CreditCard className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold text-purple-900">{subscriptionsCount}</p>
                        <p className="text-xs text-purple-700 mt-1">₱{subscriptionsAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Filters and Search */}
                <div className="mb-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[150px]">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search..."
                          value={transactionsFilter.search}
                          onChange={(e) => setTransactionsFilter(prev => ({ ...prev, search: e.target.value }))}
                        className="pl-8 pr-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs whitespace-nowrap">Type:</Label>
                    <select
                      value={transactionsFilter.type}
                      onChange={(e) => setTransactionsFilter(prev => ({ ...prev, type: e.target.value }))}
                      className="w-32 px-2 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="all">All Types</option>
                      <option value="credit">Credits</option>
                      <option value="debit">Debits</option>
                      <option value="subscription">Subscriptions</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs whitespace-nowrap">Role:</Label>
                    <select
                      value={transactionsFilter.userRole}
                      onChange={(e) => setTransactionsFilter(prev => ({ ...prev, userRole: e.target.value }))}
                      className="w-28 px-2 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="all">All</option>
                      <option value="admin">Admin</option>
                      <option value="host">Host</option>
                      <option value="guest">Guest</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs whitespace-nowrap">Sort:</Label>
                    <select
                      value={transactionsFilter.sortBy}
                      onChange={(e) => setTransactionsFilter(prev => ({ ...prev, sortBy: e.target.value }))}
                      className="w-28 px-2 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="date">Date</option>
                      <option value="amount">Amount</option>
                      <option value="user">User</option>
                    </select>
                    <button
                      onClick={() => setTransactionsFilter(prev => ({ ...prev, sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc' }))}
                      className="p-1.5 border border-border rounded-lg hover:bg-muted transition-colors"
                      title={transactionsFilter.sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                    >
                      {transactionsFilter.sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                  <div className="flex gap-1.5 items-center relative">
                    <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Date:</label>
                      <div className="relative">
                        <button
                        ref={transactionsCalendarButtonRef}
                          type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (transactionsCalendarButtonRef.current) {
                            const rect = transactionsCalendarButtonRef.current.getBoundingClientRect();
                            setTransactionsCalendarPosition({
                              top: rect.bottom + window.scrollY + 8,
                              left: rect.left + window.scrollX
                            });
                          }
                          setShowTransactionsCalendar(!showTransactionsCalendar);
                        }}
                        className="px-3 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-background hover:bg-muted/50 flex items-center gap-1.5 min-w-[160px] justify-between transition-all font-medium"
                      >
                        <span className="text-foreground text-xs truncate">
                            {transactionsFilter.dateRange.startDate && transactionsFilter.dateRange.endDate
                              ? `${new Date(transactionsFilter.dateRange.startDate).toLocaleDateString()} - ${new Date(transactionsFilter.dateRange.endDate).toLocaleDateString()}`
                              : transactionsFilter.dateRange.startDate
                              ? `${new Date(transactionsFilter.dateRange.startDate).toLocaleDateString()} - ...`
                              : 'Select date range'}
                          </span>
                        <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        </button>
                      {showTransactionsCalendar && createPortal(
                        <div 
                          data-calendar-popup="transactions"
                          className="fixed z-[9999] bg-white border border-border rounded-lg shadow-lg p-4"
                          style={{
                            top: transactionsCalendarPosition.top > 0 ? `${transactionsCalendarPosition.top}px` : '50%',
                            left: transactionsCalendarPosition.left > 0 ? `${transactionsCalendarPosition.left}px` : '50%',
                            transform: transactionsCalendarPosition.top > 0 ? 'none' : 'translate(-50%, -50%)'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                            <Calendar
                              mode="range"
                              selected={{
                                from: transactionsFilter.dateRange.startDate ? new Date(transactionsFilter.dateRange.startDate) : undefined,
                                to: transactionsFilter.dateRange.endDate ? new Date(transactionsFilter.dateRange.endDate) : undefined
                              }}
                              onSelect={(range) => {
                                if (range) {
                                  const startDate = range.from ? format(range.from, 'yyyy-MM-dd') : '';
                                  const endDate = range.to ? format(range.to, 'yyyy-MM-dd') : '';
                                  setTransactionsFilter(prev => ({
                                    ...prev,
                                    dateRange: { startDate, endDate }
                                  }));
                                  // Close calendar when both dates are selected
                                  if (range.from && range.to) {
                                    setShowTransactionsCalendar(false);
                                  }
                                } else {
                                  setTransactionsFilter(prev => ({
                                    ...prev,
                                    dateRange: { startDate: '', endDate: '' }
                                  }));
                                }
                              }}
                              numberOfMonths={1}
                              showOutsideDays={false}
                              className="w-full bg-white"
                              classNames={{
                                months: "flex flex-col bg-white",
                                month: "space-y-4 bg-white",
                                caption: "flex justify-between items-center pt-1 relative mb-4 px-1 min-h-[2.5rem] w-full bg-white",
                                caption_label: "!text-lg !font-bold !text-foreground !flex-1 !text-center !mx-auto !block !visible !opacity-100",
                                nav: "flex items-center justify-between w-full",
                                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                                nav_button_previous: "absolute left-1",
                                nav_button_next: "absolute right-1",
                                table: "w-full border-collapse space-y-1 bg-white",
                                head_row: "flex bg-white",
                                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                                row: "flex w-full mt-2 bg-white",
                                cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 bg-white",
                                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                                day_range_end: "day-range-end",
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                day_today: "bg-accent text-accent-foreground",
                                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                                day_disabled: "text-muted-foreground opacity-50",
                                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                day_hidden: "invisible",
                              }}
                            />
                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                              <button
                                onClick={() => {
                                  setTransactionsFilter(prev => ({
                                    ...prev,
                                    dateRange: { startDate: '', endDate: '' }
                                  }));
                                  setShowTransactionsCalendar(false);
                                }}
                                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                              >
                                Clear
                              </button>
                              <button
                                onClick={() => setShowTransactionsCalendar(false)}
                                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                              >
                                Done
                              </button>
                            </div>
                        </div>,
                        document.body
                        )}
                      </div>
                    </div>
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
                      className="px-4 py-2 text-sm border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 font-medium transition-all"
                      >
                        <X className="w-4 h-4" />
                        Clear All Filters
                      </button>
                    )}
                  <div className="text-sm text-muted-foreground ml-auto font-bold">
                    {(() => {
                      // Use unified filtering function
                      const filtered = filterTransactions(allMoneyTransactions, transactionsFilter);
                      const hasFilters = transactionsFilter.search || transactionsFilter.type !== 'all' || transactionsFilter.dateRange.startDate || transactionsFilter.dateRange.endDate || transactionsFilter.userRole !== 'all';
                      
                      if (hasFilters) {
                        return `${filtered.length} transaction(s)`;
                      } else {
                        return `Showing ${filtered.length} of ${allMoneyTransactions.length} transactions`;
                      }
                    })()}
                    </div>
                </div>

                {/* Transactions List */}
              {loadingTransactions ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading transactions...</p>
                </div>
                ) : (() => {
                  // Use unified filtering and sorting functions
                  let filtered = filterTransactions(allMoneyTransactions, transactionsFilter);
                  filtered = sortTransactions(filtered, transactionsFilter.sortBy, transactionsFilter.sortOrder);

                  return (
                    <>
                      {filtered.length > 0 ? (
                        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
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
                          className={`group relative overflow-hidden border-2 rounded-xl p-5 transition-all duration-300 ${
                            isCredit 
                              ? 'border-green-200 bg-gradient-to-br from-green-50/50 to-white hover:border-green-300 hover:shadow-lg' 
                              : 'border-red-200 bg-gradient-to-br from-red-50/50 to-white hover:border-red-300 hover:shadow-lg'
                          }`}
                        >
                          {/* Decorative gradient overlay */}
                          <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20 ${
                            isCredit ? 'bg-green-400' : 'bg-red-400'
                          } -mr-20 -mt-20`}></div>
                          
                          <div className="relative">
                            {/* Header Section */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4 flex-1">
                                <div className={`p-3 rounded-xl ${
                                  isCredit 
                                    ? 'bg-green-100 text-green-600' 
                                    : 'bg-red-100 text-red-600'
                                }`}>
                                  {isCredit ? (
                                    <TrendingUp className="w-5 h-5" />
                                  ) : (
                                    <TrendingDown className="w-5 h-5" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 flex-wrap mb-2">
                                    <span className={`text-2xl font-bold ${
                                      isCredit ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                      {isCredit ? '+' : '-'}{formatCurrency(amount)}
                                    </span>
                                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                                      transactionTypeLabel.includes('Subscription') ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                      transactionTypeLabel.includes('Earnings') ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                      isCredit ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                                    }`}>
                                      {transactionTypeLabel}
                                    </span>
                                    {transaction.isAdminTransaction && (
                                      <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                        Admin Wallet
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-semibold text-foreground text-base">{transaction.description || 'Transaction'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground mb-1">Date & Time</p>
                                <p className="text-sm font-medium text-foreground">{formattedDate}</p>
                              </div>
                            </div>
                            
                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-border/50">
                              {/* User Information */}
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</span>
                                </div>
                                <p className="font-semibold text-foreground">{transaction.userName || transaction.userEmail || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{transaction.userEmail || 'N/A'}</p>
                                {transaction.userRoles && transaction.userRoles.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {transaction.userRoles.map((role, idx) => (
                                      <span key={idx} className="text-xs px-2 py-1 bg-muted/50 text-foreground rounded-md font-medium">
                                        {role}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* Booking/Listing Information */}
                              {metadata.bookingId && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Booking</span>
                                  </div>
                                  <p className="font-mono text-sm font-semibold text-foreground">{metadata.bookingId}</p>
                                  {metadata.listingTitle && (
                                    <p className="text-sm text-muted-foreground line-clamp-1">{metadata.listingTitle}</p>
                                  )}
                                </div>
                              )}
                              
                              {!metadata.bookingId && metadata.listingTitle && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Home className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Listing</span>
                                  </div>
                                  <p className="font-semibold text-foreground line-clamp-2">{metadata.listingTitle}</p>
                                </div>
                              )}
                              
                              {/* Related Parties */}
                              {(metadata.guestEmail || metadata.hostEmail) && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Related Parties</span>
                                  </div>
                                  {metadata.guestEmail && (
                                    <p className="text-sm text-foreground">
                                      <span className="text-muted-foreground">Guest:</span> {metadata.guestEmail}
                                    </p>
                                  )}
                                  {metadata.hostEmail && (
                                    <p className="text-sm text-foreground">
                                      <span className="text-muted-foreground">Host:</span> {metadata.hostEmail}
                                    </p>
                                  )}
                                </div>
                              )}
                              
                              {/* Balance After */}
                              {transaction.balanceAfter !== undefined && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance After</span>
                                  </div>
                                  <p className="text-lg font-bold text-foreground">{formatCurrency(transaction.balanceAfter)}</p>
                                </div>
                              )}
                              
                              {/* Transaction ID */}
                              {transaction.id && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Receipt className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transaction ID</span>
                                  </div>
                                  <p className="font-mono text-xs text-foreground break-all bg-muted/30 px-2 py-1 rounded">{transaction.id}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                        <div className="text-center py-16">
                          <div className="inline-flex p-4 bg-muted/50 rounded-full mb-4">
                            <Filter className="w-12 h-12 text-muted-foreground" />
                          </div>
                          <p className="text-foreground text-xl font-semibold mb-2">No transactions found</p>
                          <p className="text-muted-foreground">Try adjusting your filters to see more results</p>
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
            <div className="space-y-6 lg:pt-8">
              {/* Header with Export */}
              <div className="card-listing p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex-1 text-center">
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-2 flex items-center gap-3 justify-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-foreground" />
                      </div>
                      Service Fees & Revenue
                    </h2>
                    <p className="text-muted-foreground text-base">Comprehensive view of all platform fees and commissions</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleExportServiceFees()} className="btn-outline flex items-center gap-2" disabled={generatingReport}>
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
                    {/* Comprehensive Summary Section */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Platform Revenue Overview</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Per Listing Commissions Section */}
                        <div className="border border-border rounded-lg p-6 bg-gradient-to-br from-green-50 to-emerald-50">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-green-900">Per Listing Commissions</h4>
                              <p className="text-sm text-green-700">Revenue from booking commissions</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg border border-green-200">
                              <div>
                                <p className="text-sm font-medium text-green-900">Total Commissions (10%)</p>
                                <p className="text-xs text-green-600">From all confirmed/completed bookings</p>
                              </div>
                              <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.serviceFees || 0)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-white/60 rounded-lg border border-green-200">
                                <p className="text-xs text-green-600 mb-1">Total Bookings</p>
                                <p className="text-lg font-semibold text-green-900">{bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length}</p>
                              </div>
                              <div className="p-3 bg-white/60 rounded-lg border border-green-200">
                                <p className="text-xs text-green-600 mb-1">Commission Rate</p>
                                <p className="text-lg font-semibold text-green-900">10%</p>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-green-200">
                              <p className="text-xs text-green-700 italic">Commissions are calculated as 10% of the booking amount for each confirmed or completed booking.</p>
                            </div>
                          </div>
                        </div>

                        {/* Subscription Service Fees Section */}
                        <div className="border border-border rounded-lg p-6 bg-gradient-to-br from-purple-50 to-indigo-50">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                              <CreditCard className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-purple-900">Subscription Service Fees</h4>
                              <p className="text-sm text-purple-700">Revenue from host subscription payments</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg border border-purple-200">
                              <div>
                                <p className="text-sm font-medium text-purple-900">Total Subscription Revenue</p>
                                <p className="text-xs text-purple-600">From all subscription payments</p>
                              </div>
                              <p className="text-2xl font-bold text-purple-700">{formatCurrency(stats.subscriptionRevenue || 0)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-white/60 rounded-lg border border-purple-200">
                                <p className="text-xs text-purple-600 mb-1">Total Transactions</p>
                                <p className="text-lg font-semibold text-purple-900">{subscriptionTransactions.length}</p>
                              </div>
                              <div className="p-3 bg-white/60 rounded-lg border border-purple-200">
                                <p className="text-xs text-purple-600 mb-1">Active Subscriptions</p>
                                <p className="text-lg font-semibold text-purple-900">{payments.filter(p => p.paymentStatus === 'active').length}</p>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-purple-200">
                              <p className="text-xs text-purple-700 italic">Subscription fees are collected monthly or yearly from hosts to maintain their listings on the platform.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Total Revenue Summary */}
                    <div className="mb-6">
                      <div className="border border-border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <DollarSign className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-blue-900">Total Platform Revenue</h4>
                              <p className="text-sm text-blue-700">Combined revenue from all sources</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-blue-700">{formatCurrency((stats.serviceFees || 0) + (stats.subscriptionRevenue || 0))}</p>
                            <p className="text-xs text-blue-600 mt-1">Commissions + Subscriptions</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-blue-200 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-blue-600 mb-1">Per Listing Commissions</p>
                            <p className="text-lg font-semibold text-blue-900">{formatCurrency(stats.serviceFees || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-600 mb-1">Subscription Fees</p>
                            <p className="text-lg font-semibold text-blue-900">{formatCurrency(stats.subscriptionRevenue || 0)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top Performing Hosts */}
                    <div className="border border-border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        Top Performing Hosts (By Commission Generated)
                      </h3>
                      <div className="space-y-2">
                        {hosts.filter(h => !h.isTerminated).slice(0, 5).map((host, index) => {
                          const hostServiceFees = Math.round((host.earnings * HOST_COMMISSION_PERCENTAGE) * 100) / 100;
                          return (
                            <div key={host.userId} className="flex items-center justify-between p-3 hover:bg-muted/30 rounded-lg border border-border">
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-xs font-bold text-muted-foreground w-6 text-center bg-primary/10 px-2 py-1 rounded">{index + 1}</span>
                                <div className="flex-1">
                                  <span className="font-medium text-sm block">{host.name}</span>
                                  <span className="text-xs text-muted-foreground">{host.listings} listing(s) • {host.bookings} booking(s)</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-green-600 block">{formatCurrency(hostServiceFees)}</span>
                                <span className="text-xs text-muted-foreground">Commission (10%)</span>
                              </div>
                            </div>
                          );
                        })}
                        {hosts.filter(h => !h.isTerminated).length === 0 && (
                          <p className="text-muted-foreground text-sm text-center py-4">No active hosts yet</p>
                        )}
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
                                  <div className="border-t border-border bg-muted/20 p-4 space-y-4">
                                    {/* Host Summary */}
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

                                    {/* Per Listing Commission Breakdown */}
                                    {host.listingsData && host.listingsData.length > 0 && (
                                      <div className="pt-4 border-t border-border">
                                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                          <Home className="w-4 h-4 text-primary" />
                                          Per Listing Commission Breakdown
                                        </h4>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                          {host.listingsData
                                            .filter(listing => listing.bookings > 0 || listing.earnings > 0)
                                            .sort((a, b) => b.commission - a.commission)
                                            .map((listing, idx) => (
                                              <div key={listing.listingId || idx} className="p-3 bg-white/60 rounded-lg border border-border hover:bg-white/80 transition-colors">
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm text-foreground truncate">{listing.title}</p>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{listing.category}</span>
                                                      {listing.location && (
                                                        <span className="text-xs text-muted-foreground truncate">{listing.location}</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="text-right flex-shrink-0">
                                                    <p className="text-sm font-semibold text-green-600">{formatCurrency(listing.commission)}</p>
                                                    <p className="text-xs text-muted-foreground">Commission</p>
                                                  </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-border/50">
                                                  <div>
                                                    <p className="text-xs text-muted-foreground">Bookings</p>
                                                    <p className="text-sm font-medium">{listing.bookings}</p>
                                                  </div>
                                                  <div>
                                                    <p className="text-xs text-muted-foreground">Listing Earnings</p>
                                                    <p className="text-sm font-medium">{formatCurrency(listing.earnings)}</p>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          {host.listingsData.filter(listing => listing.bookings > 0 || listing.earnings > 0).length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-3">No bookings for this host's listings yet</p>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Host Rating */}
                                    {host.rating > 0 && (
                                      <div className="pt-3 border-t border-border flex items-center gap-2">
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
                      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-purple-600" />
                          Subscription Service Fees Overview
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3 bg-white/60 rounded-lg border border-purple-200">
                            <p className="text-xs text-purple-600 mb-1">Total Subscription Revenue</p>
                            <p className="text-xl font-bold text-purple-900">{formatCurrency(stats.subscriptionRevenue || 0)}</p>
                          </div>
                          <div className="p-3 bg-white/60 rounded-lg border border-purple-200">
                            <p className="text-xs text-purple-600 mb-1">Total Transactions</p>
                            <p className="text-xl font-bold text-purple-900">{subscriptionTransactions.length}</p>
                          </div>
                          <div className="p-3 bg-white/60 rounded-lg border border-purple-200">
                            <p className="text-xs text-purple-600 mb-1">Active Subscriptions</p>
                            <p className="text-xl font-bold text-purple-900">{payments.filter(p => p.paymentStatus === 'active').length}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <p className="text-xs text-purple-700">
                            <strong>Subscription Fee Structure:</strong> Hosts pay a monthly or yearly subscription fee to maintain their listings on the platform. These fees are separate from booking commissions.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Receipt className="w-5 h-5 text-primary" />
                          Subscription Transaction History
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
                                <div key={transaction.id || index} className="border border-border rounded-lg hover:bg-muted/30 transition-colors overflow-hidden">
                                  <div className="flex items-center justify-between p-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <div>
                                          <p className="font-semibold text-foreground truncate">{transaction.metadata?.hostName || transaction.metadata?.hostEmail || 'Unknown Host'}</p>
                                          <p className="text-xs text-muted-foreground truncate">{transaction.metadata?.hostEmail || 'N/A'}</p>
                                        </div>
                                        <span className={`text-xs px-3 py-1 rounded-full font-medium flex-shrink-0 ${
                                          isMonthly 
                                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                            : isYearly 
                                            ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                                        }`}>
                                          {transaction.metadata?.subscriptionPlan || 'Subscription'} • {subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                                        <div className="flex items-center gap-1">
                                          <CalendarIcon className="w-3 h-3" />
                                          <span>{date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          <span>{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        {transaction.metadata?.transactionId && (
                                          <div className="flex items-center gap-1">
                                            <Receipt className="w-3 h-3" />
                                            <span className="truncate max-w-[150px]">{transaction.metadata.transactionId}</span>
                                          </div>
                                        )}
                                      </div>
                                      {transaction.description && transaction.description !== 'Host Subscription Payment' && (
                                        <p className="text-sm text-muted-foreground mt-2">{transaction.description}</p>
                                      )}
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                                    <p className="font-bold text-2xl text-purple-600">{formatCurrency(transaction.amount)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Subscription Fee</p>
                                    {isMonthly && (
                                      <p className="text-xs text-blue-600 mt-1">Monthly Plan</p>
                                    )}
                                    {isYearly && (
                                      <p className="text-xs text-purple-600 mt-1">Yearly Plan</p>
                                    )}
                          </div>
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


          {/* User Management Tab */}
          {activeTab === 'user-management' && (
            <div className="space-y-6 lg:pt-8">
            <div className="card-listing p-6 lg:p-8">
                {/* Enhanced Header Section */}
                <div className="mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="space-y-1 flex-1 text-center">
                      <h2 className="font-heading text-2xl font-bold text-foreground mb-2 flex items-center gap-3 justify-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-foreground" />
                        </div>
                        User Management
                      </h2>
                      <p className="text-muted-foreground text-base">Manage hosts and guests, view performance metrics, and control account access</p>
                    </div>
                    <div className="flex gap-2 sm:ml-0 ml-12">
                      <button 
                        onClick={async () => {
                          if (generatingReport) return;
                          
                          try {
                            setGeneratingReport(true);
                            toast.info(`Generating ${userManagementView === 'hosts' ? 'hosts' : 'guests'} report... This may take a moment.`);
                            
                            // Apply the same filtering logic as the print function
                            let filteredData = [];
                            let headers = [];
                            let filename = '';
                            let title = '';
                            
                            if (userManagementView === 'guests') {
                              let filtered = [...guests];
                              
                              // Apply search filter
                              if (userManagementFilter.search) {
                                const searchLower = userManagementFilter.search.toLowerCase();
                                filtered = filtered.filter(guest =>
                                  guest.name.toLowerCase().includes(searchLower) ||
                                  guest.email.toLowerCase().includes(searchLower)
                                );
                              }
                              
                              // Apply status filter
                              if (userManagementFilter.status !== 'all') {
                                if (userManagementFilter.status === 'blocked') {
                                  filtered = filtered.filter(guest => guest.isBlocked);
                                } else if (userManagementFilter.status === 'active') {
                                  filtered = filtered.filter(guest => !guest.isBlocked);
                                }
                              }
                              
                              // Apply sorting
                              filtered.sort((a, b) => {
                                let aVal, bVal;
                                if (userManagementFilter.sortBy === 'bookings') {
                                  aVal = a.bookings || 0;
                                  bVal = b.bookings || 0;
                                } else if (userManagementFilter.sortBy === 'totalSpent') {
                                  aVal = a.totalSpent || 0;
                                  bVal = b.totalSpent || 0;
                                } else {
                                  aVal = (a.name || '').toLowerCase();
                                  bVal = (b.name || '').toLowerCase();
                                }
                                
                                if (userManagementFilter.sortOrder === 'asc') {
                                  return aVal > bVal ? 1 : -1;
                                } else {
                                  return bVal > aVal ? 1 : -1;
                                }
                              });
                              
                              filteredData = filtered.map(guest => ({
                                name: guest.name || 'N/A',
                                email: guest.email || 'N/A',
                                phone: guest.phone || 'N/A',
                                bookings: guest.bookings || 0,
                                totalSpent: guest.totalSpent || 0,
                                status: guest.isBlocked ? 'Blocked' : 'Active',
                                joinedDate: guest.createdAt ? (guest.createdAt?.toDate ? guest.createdAt.toDate() : new Date(guest.createdAt)) : null
                              }));
                              
                              headers = [
                                { key: 'name', label: 'Guest Name' },
                                { key: 'email', label: 'Email' },
                                { key: 'phone', label: 'Phone' },
                                { key: 'bookings', label: 'Total Bookings' },
                                { key: 'totalSpent', label: 'Total Spent' },
                                { key: 'status', label: 'Status' },
                                { key: 'joinedDate', label: 'Joined Date' }
                              ];
                              filename = 'guests_management_report';
                              title = `Guest Management Report (${filtered.length})`;
                            } else {
                              // Hosts
                              let filtered = [...hosts];
                              
                              // Apply search filter
                              if (userManagementFilter.search) {
                                const searchLower = userManagementFilter.search.toLowerCase();
                                filtered = filtered.filter(host =>
                                  (host.name || '').toLowerCase().includes(searchLower) ||
                                  (host.email || '').toLowerCase().includes(searchLower)
                                );
                              }
                              
                              // Apply status filter
                              if (userManagementFilter.status !== 'all') {
                                if (userManagementFilter.status === 'terminated') {
                                  filtered = filtered.filter(host => host.isTerminated);
                                } else if (userManagementFilter.status === 'active') {
                                  filtered = filtered.filter(host => !host.isTerminated);
                                }
                              }
                              
                              // Apply sorting
                              filtered.sort((a, b) => {
                                let aVal, bVal;
                                if (userManagementFilter.sortBy === 'earnings') {
                                  aVal = a.earnings || 0;
                                  bVal = b.earnings || 0;
                                } else if (userManagementFilter.sortBy === 'bookings') {
                                  aVal = a.bookings || 0;
                                  bVal = b.bookings || 0;
                                } else if (userManagementFilter.sortBy === 'listings') {
                                  aVal = a.listings || 0;
                                  bVal = b.listings || 0;
                                } else {
                                  aVal = (a.name || '').toLowerCase();
                                  bVal = (b.name || '').toLowerCase();
                                }
                                
                                if (userManagementFilter.sortOrder === 'asc') {
                                  return aVal > bVal ? 1 : -1;
                                } else {
                                  return bVal > aVal ? 1 : -1;
                                }
                              });
                              
                              filteredData = filtered.map(host => ({
                                name: host.name || 'N/A',
                                email: host.email || 'N/A',
                                phone: host.phone || 'N/A',
                                listings: host.listings || host.listingsCount || 0,
                                bookings: host.bookings || host.bookingsCount || 0,
                                earnings: host.earnings || host.totalEarnings || 0,
                                status: host.isTerminated ? 'Terminated' : 'Active'
                              }));
                              
                              headers = [
                                { key: 'name', label: 'Host Name' },
                                { key: 'email', label: 'Email' },
                                { key: 'phone', label: 'Phone' },
                                { key: 'listings', label: 'Listings' },
                                { key: 'bookings', label: 'Bookings' },
                                { key: 'earnings', label: 'Total Earnings' },
                                { key: 'status', label: 'Status' }
                              ];
                              filename = 'hosts_management_report';
                              title = `User Management Report - Hosts (${filtered.length})`;
                            }
                            
                            if (filteredData.length === 0) {
                              toast.error('No data to export');
                              setGeneratingReport(false);
                              return;
                            }
                            
                            // Format data for PDF export
                            const exportData = filteredData.map(item => {
                              const formatted = { ...item };
                              if (formatted.totalSpent !== undefined) {
                                formatted.totalSpent = formatCurrency(formatted.totalSpent);
                              }
                              if (formatted.earnings !== undefined) {
                                formatted.earnings = formatCurrency(formatted.earnings);
                              }
                              if (formatted.joinedDate) {
                                formatted.joinedDate = formatDate(formatted.joinedDate);
                              }
                              return formatted;
                            });
                            
                            // Export to PDF
                            const { exportToPDF } = await import('./services/reportService');
                            await exportToPDF(exportData, headers, filename, title);
                            
                            toast.success(`${userManagementView === 'hosts' ? 'Hosts' : 'Guests'} report generated and downloaded successfully!`);
                          } catch (error) {
                            console.error('Error generating user management report:', error);
                            toast.error(`Failed to generate ${userManagementView === 'hosts' ? 'hosts' : 'guests'} report: ${error.message}`);
                          } finally {
                            setGeneratingReport(false);
                          }
                        }}
                        className="btn-outline flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors" 
                        disabled={generatingReport}
                      >
                        {generatingReport ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                        <Download className="w-4 h-4" />
                        Export Report
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Enhanced View Toggle */}
                  <div className="flex gap-2 border-b-2 border-border/50">
                    <button
                      onClick={() => setUserManagementView('hosts')}
                      className={`relative px-6 py-3 font-semibold transition-all duration-200 ${
                        userManagementView === 'hosts'
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        Hosts
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          userManagementView === 'hosts'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {hosts.length}
                        </span>
                      </span>
                      {userManagementView === 'hosts' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                      )}
                    </button>
                    <button
                      onClick={() => setUserManagementView('guests')}
                      className={`relative px-6 py-3 font-semibold transition-all duration-200 ${
                        userManagementView === 'guests'
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Guests
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          userManagementView === 'guests'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {guests.length}
                        </span>
                      </span>
                      {userManagementView === 'guests' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Summary Cards */}
                {userManagementView === 'hosts' ? (
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
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Total Guests</p>
                          <p className="text-2xl font-bold text-blue-700">{guests.length}</p>
                          <p className="text-xs text-blue-600 mt-1">Active Accounts</p>
                        </div>
                        <Users className="w-10 h-10 text-blue-600" />
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-green-900">Total Spent</p>
                          <p className="text-2xl font-bold text-green-700">
                            {formatCurrency(guests.reduce((sum, g) => sum + (g.totalSpent || 0), 0))}
                          </p>
                          <p className="text-xs text-green-600 mt-1">Combined Spending</p>
                        </div>
                        <DollarSign className="w-10 h-10 text-green-600" />
                      </div>
                    </div>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-purple-900">Total Bookings</p>
                          <p className="text-2xl font-bold text-purple-700">
                            {guests.reduce((sum, g) => sum + (g.bookings || 0), 0)}
                          </p>
                          <p className="text-xs text-purple-600 mt-1">All Time</p>
                        </div>
                        <Calendar className="w-10 h-10 text-purple-600" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Search and Filter */}
                <div className="mb-6 flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[250px]">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder={userManagementView === 'hosts' ? "Search hosts by name or email..." : "Search guests by name or email..."}
                        value={userManagementFilter.search}
                        onChange={(e) => setUserManagementFilter(prev => ({ ...prev, search: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  {userManagementView === 'hosts' && (
                    <select
                      value={userManagementFilter.status}
                      onChange={(e) => setUserManagementFilter(prev => ({ ...prev, status: e.target.value }))}
                      className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="all">All Hosts</option>
                      <option value="active">Active Only</option>
                      <option value="terminated">Terminated Only</option>
                    </select>
                  )}
                  {userManagementView === 'guests' && (
                    <select
                      value={userManagementFilter.status}
                      onChange={(e) => setUserManagementFilter(prev => ({ ...prev, status: e.target.value }))}
                      className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="all">All Guests</option>
                      <option value="active">Active Only</option>
                      <option value="blocked">Blocked Only</option>
                    </select>
                  )}
                  <select
                    value={userManagementFilter.sortBy}
                    onChange={(e) => setUserManagementFilter(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="name">Sort by Name</option>
                    {userManagementView === 'hosts' ? (
                      <>
                        <option value="earnings">Sort by Earnings</option>
                        <option value="bookings">Sort by Bookings</option>
                        <option value="listings">Sort by Listings</option>
                      </>
                    ) : (
                      <option value="bookings">Sort by Bookings</option>
                    )}
                    {userManagementView === 'guests' && (
                      <option value="totalSpent">Sort by Total Spent</option>
                    )}
                  </select>
                  <button
                    onClick={() => setUserManagementFilter(prev => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted/50 flex items-center gap-2"
                  >
                    {userManagementFilter.sortOrder === 'asc' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {userManagementFilter.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  </button>
                  {(userManagementFilter.search || userManagementFilter.status !== 'all') && (
                    <button
                      onClick={() => setUserManagementFilter({
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

                {/* Users List */}
              <div className="space-y-4">
                  {userManagementView === 'hosts' ? (() => {
                    let filtered = [...hosts];
                    
                    // Apply search filter
                    if (userManagementFilter.search) {
                      const searchLower = userManagementFilter.search.toLowerCase();
                      filtered = filtered.filter(host =>
                        host.name.toLowerCase().includes(searchLower) ||
                        host.email.toLowerCase().includes(searchLower)
                      );
                    }
                    
                    // Apply status filter
                    if (userManagementFilter.status !== 'all') {
                      filtered = filtered.filter(host =>
                        userManagementFilter.status === 'terminated' ? host.isTerminated : !host.isTerminated
                      );
                    }
                    
                    // Apply sorting
                    filtered.sort((a, b) => {
                      let aVal, bVal;
                      if (userManagementFilter.sortBy === 'earnings') {
                        aVal = a.earnings || 0;
                        bVal = b.earnings || 0;
                      } else if (userManagementFilter.sortBy === 'bookings') {
                        aVal = a.bookings || 0;
                        bVal = b.bookings || 0;
                      } else if (userManagementFilter.sortBy === 'listings') {
                        aVal = a.listings || 0;
                        bVal = b.listings || 0;
                      } else {
                        aVal = a.name.toLowerCase();
                        bVal = b.name.toLowerCase();
                      }
                      
                      if (userManagementFilter.sortOrder === 'asc') {
                        return aVal > bVal ? 1 : -1;
                      } else {
                        return bVal > aVal ? 1 : -1;
                      }
                    });

                    return filtered.length > 0 ? (
                      <>
                        {(userManagementFilter.search || userManagementFilter.status !== 'all') && (
                          <div className="mb-6 px-2 py-3 bg-muted/50 rounded-lg border border-border/50">
                            <p className="text-sm font-medium text-foreground">
                              Showing <span className="font-bold text-primary">{filtered.length}</span> of <span className="font-semibold">{hosts.length}</span> hosts
                            </p>
                          </div>
                        )}
                        <div className="space-y-4">
                          {filtered.map(host => {
                            const hostServiceFees = Math.round((host.earnings * HOST_COMMISSION_PERCENTAGE) * 100) / 100;
                            const isExpanded = expandedHosts.has(host.userId);
                            // Convert terminatedAt if it's a Firestore timestamp
                            const terminatedDate = host.terminatedAt?.toDate ? host.terminatedAt.toDate() : host.terminatedAt;
                            return (
                              <div 
                                key={host.userId} 
                                className={`group border-2 rounded-xl overflow-hidden transition-all duration-300 ${
                                  host.isTerminated 
                                    ? 'border-red-200/50 bg-gradient-to-br from-red-50/50 to-red-50/20 shadow-sm' 
                                    : 'border-border/50 bg-card hover:shadow-lg hover:border-primary/20'
                                }`}
                              >
                                <div className="p-5 sm:p-6">
                                  <div className="flex flex-col gap-5">
                                    {/* Top Row - Header and Actions */}
                                    <div className="flex items-start justify-between gap-4">
                                      {/* Left - User Info */}
                                      <div className="flex-1 min-w-0 space-y-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <h3 className="font-bold text-xl text-foreground">{host.name}</h3>
                                          {host.isTerminated ? (
                                            <span className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full whitespace-nowrap border border-red-200">
                                              Terminated
                                            </span>
                                          ) : (
                                            <span className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full whitespace-nowrap border border-green-200">
                                              Active
                                            </span>
                                          )}
                                          {host.reviewCount > 0 && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 rounded-full border border-yellow-200">
                                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                              <span className="font-semibold text-sm text-yellow-900">{host.rating.toFixed(1)}</span>
                                              <span className="text-yellow-700 text-xs">({host.reviewCount})</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-sm text-muted-foreground break-words flex items-center gap-2">
                                            <span className="font-medium">{host.email}</span>
                                          </p>
                                          {host.isTerminated && terminatedDate && (
                                            <p className="text-xs text-red-600 font-semibold mt-2 flex items-center gap-1">
                                              <AlertCircle className="w-3 h-3" />
                                              Terminated on {formatDate(terminatedDate)}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Right - Actions */}
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {host.isTerminated ? (
                                          <button
                                            onClick={() => {
                                              setSelectedHostForUntermination(host);
                                              setShowUnterminateHostDialog(true);
                                            }}
                                            disabled={unterminatingHost === host.userId}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold whitespace-nowrap shadow-sm hover:shadow-md"
                                          >
                                            {unterminatingHost === host.userId ? (
                                              <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                <span>Restoring...</span>
                                              </>
                                            ) : (
                                              <>
                                                <CheckCircle className="w-4 h-4" />
                                                <span>Unterminate</span>
                                              </>
                                            )}
                                          </button>
                                        ) : (
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
                                              className="p-2.5 hover:bg-muted rounded-lg transition-all border border-border hover:border-primary/50 hover:shadow-sm"
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
                                              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold whitespace-nowrap shadow-sm hover:shadow-md"
                                            >
                                              {terminatingHost === host.userId ? (
                                                <>
                                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                                  <span>Terminating...</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Ban className="w-4 h-4" />
                                                  <span>Terminate</span>
                                                </>
                                              )}
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedHostForDeletion(host);
                                                setShowDeleteHostDialog(true);
                                              }}
                                              disabled={deletingHost === host.userId}
                                              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold whitespace-nowrap shadow-sm hover:shadow-md"
                                            >
                                              {deletingHost === host.userId ? (
                                                <>
                                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                                  <span>Deleting...</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Trash2 className="w-4 h-4" />
                                                  <span>Delete</span>
                                                </>
                                              )}
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Bottom Row - Stats Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/50 overflow-hidden">
                                      <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                          <Home className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Listings</p>
                                          <p className="text-xl font-bold text-foreground">{host.listings}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                          <Calendar className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Bookings</p>
                                          <p className="text-xl font-bold text-foreground">{host.bookings}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 p-3 bg-green-50/50 rounded-lg border border-green-100">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                          <DollarSign className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Earnings</p>
                                          <p className="text-xl font-bold text-green-600">{formatCurrency(host.earnings || 0)}</p>
                                        </div>
                                      </div>
                                      {host.reviewCount > 0 ? (
                                        <div className="flex items-center gap-3 p-3 bg-yellow-50/50 rounded-lg border border-yellow-100">
                                          <div className="p-2 bg-yellow-100 rounded-lg">
                                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                          </div>
                                          <div>
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Rating</p>
                                            <p className="text-xl font-bold text-foreground">{host.rating.toFixed(1)}</p>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="hidden sm:block"></div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {isExpanded && !host.isTerminated && (
                                  <div className="border-t-2 border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 p-5 sm:p-6">
                                    <h4 className="font-semibold text-lg mb-4 text-foreground">Detailed Statistics</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                                      <div className="space-y-2 p-3 bg-background/50 rounded-lg border border-border/50">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Bookings</p>
                                        <p className="font-bold text-2xl">{host.bookings}</p>
                                      </div>
                                      <div className="space-y-2 p-3 bg-background/50 rounded-lg border border-border/50">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Earnings</p>
                                        <p className="font-bold text-2xl text-green-600">{formatCurrency(host.earnings)}</p>
                                      </div>
                                      <div className="space-y-2 p-3 bg-background/50 rounded-lg border border-border/50">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Commission (10%)</p>
                                        <p className="font-bold text-2xl text-blue-600">{formatCurrency(hostServiceFees)}</p>
                                      </div>
                                      <div className="space-y-2 p-3 bg-background/50 rounded-lg border border-border/50">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Host Receives (90%)</p>
                                        <p className="font-bold text-2xl text-purple-600">{formatCurrency(host.earnings - hostServiceFees)}</p>
                                      </div>
                                      <div className="space-y-2 p-3 bg-background/50 rounded-lg border border-border/50">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Active Listings</p>
                                        <p className="font-bold text-2xl">{host.listings}</p>
                                      </div>
                                      {host.reviewCount > 0 && (
                                        <>
                                          <div className="space-y-2 p-3 bg-background/50 rounded-lg border border-border/50">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Average Rating</p>
                                            <p className="font-bold text-2xl flex items-center gap-1">
                                              <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                                              {host.rating.toFixed(1)}
                                            </p>
                                          </div>
                                          <div className="space-y-2 p-3 bg-background/50 rounded-lg border border-border/50">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Reviews</p>
                                            <p className="font-bold text-2xl">{host.reviewCount}</p>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-16 px-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                          <Users className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <p className="text-xl font-semibold text-foreground mb-2">No hosts found</p>
                        {(userManagementFilter.search || userManagementFilter.status !== 'all') && (
                          <p className="text-sm text-muted-foreground">Try adjusting your filters to see more results</p>
                        )}
                      </div>
                    );
                  })() : (() => {
                    // Guests list
                    let filtered = [...guests];
                    
                    // Apply search filter
                    if (userManagementFilter.search) {
                      const searchLower = userManagementFilter.search.toLowerCase();
                      filtered = filtered.filter(guest =>
                        guest.name.toLowerCase().includes(searchLower) ||
                        guest.email.toLowerCase().includes(searchLower)
                      );
                    }
                    
                    // Apply status filter
                    if (userManagementFilter.status !== 'all') {
                      filtered = filtered.filter(guest =>
                        userManagementFilter.status === 'blocked' ? guest.isBlocked : !guest.isBlocked
                      );
                    }
                    
                    // Apply sorting
                    filtered.sort((a, b) => {
                      let aVal, bVal;
                      if (userManagementFilter.sortBy === 'totalSpent') {
                        aVal = a.totalSpent || 0;
                        bVal = b.totalSpent || 0;
                      } else if (userManagementFilter.sortBy === 'bookings') {
                        aVal = a.bookings || 0;
                        bVal = b.bookings || 0;
                      } else {
                        aVal = a.name.toLowerCase();
                        bVal = b.name.toLowerCase();
                      }
                      
                      if (userManagementFilter.sortOrder === 'asc') {
                        return aVal > bVal ? 1 : -1;
                      } else {
                        return bVal > aVal ? 1 : -1;
                      }
                    });

                    return filtered.length > 0 ? (
                      <>
                        {(userManagementFilter.search || userManagementFilter.status !== 'all') && (
                          <div className="mb-6 px-2 py-3 bg-muted/50 rounded-lg border border-border/50">
                            <p className="text-sm font-medium text-foreground">
                              Showing <span className="font-bold text-primary">{filtered.length}</span> of <span className="font-semibold">{guests.length}</span> guests
                            </p>
                          </div>
                        )}
                        <div className="space-y-4">
                          {filtered.map(guest => {
                            // Convert blockedAt if it's a Firestore timestamp
                            const blockedDate = guest.blockedAt?.toDate ? guest.blockedAt.toDate() : guest.blockedAt;
                            const createdDate = guest.createdAt?.toDate ? guest.createdAt.toDate() : guest.createdAt;
                            return (
                            <div 
                              key={guest.userId} 
                              className={`group border-2 rounded-xl overflow-hidden transition-all duration-300 ${
                                guest.isBlocked 
                                  ? 'border-red-200/50 bg-gradient-to-br from-red-50/50 to-red-50/20 shadow-sm' 
                                  : 'border-border/50 bg-card hover:shadow-lg hover:border-primary/20'
                              }`}
                            >
                              <div className="p-5 sm:p-6">
                                <div className="flex flex-col gap-5">
                                  {/* Top Row - Header and Actions */}
                                  <div className="flex items-start justify-between gap-4">
                                    {/* Left - User Info */}
                                    <div className="flex-1 min-w-0 space-y-3">
                                      <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="font-bold text-xl text-foreground">{guest.name}</h3>
                                        {guest.isBlocked ? (
                                          <span className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full whitespace-nowrap border border-red-200">
                                            Blocked
                                          </span>
                                        ) : (
                                          <span className="px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full whitespace-nowrap border border-blue-200">
                                            Active
                                          </span>
                                        )}
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground break-words flex items-center gap-2">
                                          <span className="font-medium">{guest.email}</span>
                                        </p>
                                        {guest.phone && guest.phone !== 'N/A' && (
                                          <p className="text-sm text-muted-foreground">Phone: <span className="font-medium">{guest.phone}</span></p>
                                        )}
                                        {guest.isBlocked && blockedDate && (
                                          <p className="text-xs text-red-600 font-semibold mt-2 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Blocked on {formatDate(blockedDate)}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Right - Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {guest.isBlocked ? (
                                        <button
                                          onClick={() => handleUnblockGuest(guest)}
                                          disabled={blockingGuest === guest.userId}
                                          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold whitespace-nowrap shadow-sm hover:shadow-md"
                                        >
                                          {blockingGuest === guest.userId ? (
                                            <>
                                              <RefreshCw className="w-4 h-4 animate-spin" />
                                              <span>Unblocking...</span>
                                            </>
                                          ) : (
                                            <>
                                              <CheckCircle className="w-4 h-4" />
                                              <span>Unblock</span>
                                            </>
                                          )}
                                        </button>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => {
                                              setSelectedGuestForBlocking(guest);
                                              setShowBlockGuestDialog(true);
                                            }}
                                            disabled={blockingGuest === guest.userId}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold whitespace-nowrap shadow-sm hover:shadow-md"
                                          >
                                            {blockingGuest === guest.userId ? (
                                              <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                <span>Blocking...</span>
                                              </>
                                            ) : (
                                              <>
                                                <Ban className="w-4 h-4" />
                                                <span>Block</span>
                                              </>
                                            )}
                                          </button>
                                          <button
                                            onClick={() => {
                                              setSelectedGuestForDeletion(guest);
                                              setShowDeleteGuestDialog(true);
                                            }}
                                            disabled={deletingGuest === guest.userId}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold whitespace-nowrap shadow-sm hover:shadow-md"
                                          >
                                            {deletingGuest === guest.userId ? (
                                              <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                <span>Deleting...</span>
                                              </>
                                            ) : (
                                              <>
                                                <Trash2 className="w-4 h-4" />
                                                <span>Delete</span>
                                              </>
                                            )}
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Bottom Row - Stats Grid */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border/50 overflow-hidden">
                                    <div className="flex items-center gap-3 p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                                      <div className="p-2 bg-purple-100 rounded-lg">
                                        <Calendar className="w-5 h-5 text-purple-600" />
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Bookings</p>
                                        <p className="text-xl font-bold text-foreground">{guest.bookings}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-green-50/50 rounded-lg border border-green-100">
                                      <div className="p-2 bg-green-100 rounded-lg">
                                        <DollarSign className="w-5 h-5 text-green-600" />
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Spent</p>
                                        <p className="text-xl font-bold text-green-600">{formatCurrency(guest.totalSpent || 0)}</p>
                                      </div>
                                    </div>
                                    {createdDate && (
                                      <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                          <Clock className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Joined</p>
                                          <p className="text-xl font-bold text-foreground">{formatDate(createdDate)}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-16 px-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                          <Users className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <p className="text-xl font-semibold text-foreground mb-2">No guests found</p>
                        {(userManagementFilter.search || userManagementFilter.status !== 'all') && (
                          <p className="text-sm text-muted-foreground">Try adjusting your filters to see more results</p>
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
            <div className="space-y-6 lg:pt-8">
              <div className="card-listing p-6">
                <div className="flex items-center justify-center mb-6">
                  <div className="text-center">
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-2 flex items-center gap-3 justify-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                        <Settings className="w-6 h-6 text-foreground" />
                      </div>
                      Platform Settings
                    </h2>
                    <p className="text-muted-foreground text-base">Manage payment methods, PayPal configuration, and platform settings</p>
                  </div>
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
            <div className="space-y-6 lg:pt-8 pb-12 px-4 sm:px-6">
              <div className="card-listing p-6 mb-6">
                <div className="flex items-center justify-center mb-6">
                  <div className="text-center">
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-2 flex items-center gap-3 justify-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                        <Shield className="w-6 h-6 text-foreground" />
                      </div>
                      Policy & Compliance
                    </h2>
                    <p className="text-muted-foreground text-base">Manage policies and compliance rules</p>
                  </div>
                </div>
              </div>
              <PolicyManagement searchFilter={complianceFilter.search} />
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="bg-gradient-to-br from-background via-background to-muted/20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:pt-8 pb-4">
                {/* Compact Header Section */}
                <div className="text-center mb-6">
                  <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                    Report Generation
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
                    Generate comprehensive reports with date range filtering and detailed analytics
                  </p>
                </div>

                {/* Reports Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { 
                      id: 'financial', 
                      label: 'Financial Report', 
                      icon: DollarSign, 
                      description: 'Comprehensive revenue, fees, and payment analytics with detailed financial insights',
                      color: 'blue',
                      gradient: 'from-blue-500 to-blue-600'
                    },
                    { 
                      id: 'bookings', 
                      label: 'Bookings Report', 
                      icon: CalendarIcon, 
                      description: 'Complete booking history, statistics, and performance metrics',
                      color: 'green',
                      gradient: 'from-green-500 to-green-600'
                    },
                    { 
                      id: 'users', 
                      label: 'Users Report', 
                      icon: Users, 
                      description: 'User growth trends, activity metrics, and engagement analytics',
                      color: 'purple',
                      gradient: 'from-purple-500 to-purple-600'
                    },
                    { 
                      id: 'reviews', 
                      label: 'Reviews Report', 
                      icon: Star, 
                      description: 'Review analysis, ratings breakdown, and customer satisfaction insights',
                      color: 'yellow',
                      gradient: 'from-yellow-500 to-yellow-600'
                    },
                    { 
                      id: 'hosts', 
                      label: 'Hosts Report', 
                      icon: Home, 
                      description: 'Host performance metrics, earnings analysis, and productivity data',
                      color: 'orange',
                      gradient: 'from-orange-500 to-orange-600'
                    },
                    { 
                      id: 'compliance', 
                      label: 'Compliance Report', 
                      icon: Shield, 
                      description: 'Policy violations tracking, compliance status, and regulatory insights',
                      color: 'red',
                      gradient: 'from-red-500 to-red-600'
                    }
                  ].map((report, index) => {
                    const ReportIcon = report.icon;
                    const colorConfig = {
                      blue: {
                        bg: 'bg-card',
                        border: 'border-border',
                        hover: 'hover:bg-muted/50',
                        text: 'text-blue-600 dark:text-blue-400',
                        iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
                        button: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-blue-200/50',
                        shadow: 'shadow-sm'
                      },
                      green: {
                        bg: 'bg-card',
                        border: 'border-border',
                        hover: 'hover:bg-muted/50',
                        text: 'text-green-600 dark:text-green-400',
                        iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
                        button: 'bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-green-200/50',
                        shadow: 'shadow-sm'
                      },
                      purple: {
                        bg: 'bg-card',
                        border: 'border-border',
                        hover: 'hover:bg-muted/50',
                        text: 'text-purple-600 dark:text-purple-400',
                        iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
                        button: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-purple-200/50',
                        shadow: 'shadow-sm'
                      },
                      yellow: {
                        bg: 'bg-card',
                        border: 'border-border',
                        hover: 'hover:bg-muted/50',
                        text: 'text-yellow-600 dark:text-yellow-400',
                        iconBg: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
                        button: 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 shadow-yellow-200/50',
                        shadow: 'shadow-sm'
                      },
                      orange: {
                        bg: 'bg-card',
                        border: 'border-border',
                        hover: 'hover:bg-muted/50',
                        text: 'text-orange-600 dark:text-orange-400',
                        iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
                        button: 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600 shadow-orange-200/50',
                        shadow: 'shadow-sm'
                      },
                      red: {
                        bg: 'bg-card',
                        border: 'border-border',
                        hover: 'hover:bg-muted/50',
                        text: 'text-red-600 dark:text-red-400',
                        iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
                        button: 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-red-200/50',
                        shadow: 'shadow-sm'
                      }
                    };
                    const colors = colorConfig[report.color];
                    return (
                      <div
                        key={report.id}
                        className={`group relative p-5 border-2 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg ${colors.bg} ${colors.border} ${colors.hover} ${colors.shadow}`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        {generatingReport && (
                          <div className="absolute top-2 right-2 z-10">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                          </div>
                        )}
                        
                        {/* Icon Section */}
                        <div className="flex flex-col items-center text-center mb-4">
                          <div className={`relative mb-3 ${colors.iconBg} p-3 rounded-xl shadow-md transform group-hover:scale-110 transition-transform duration-300`}>
                            <ReportIcon className="w-6 h-6 text-white" />
                          </div>
                          
                          <h3 className={`font-bold text-lg mb-2 ${colors.text}`}>{report.label}</h3>
                          <p className="text-xs text-muted-foreground leading-snug mb-4 line-clamp-2">
                            {report.description}
                          </p>
                        </div>
                        
                        {/* Export Report Button */}
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
                          className={`w-full px-4 py-2.5 border-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${colors.button}`}
                        >
                          <Download className="w-4 h-4" />
                          <span>Export Report</span>
                        </button>
                      </div>
                    );
                  })}
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
              <CalendarIcon className="w-5 h-5 text-secondary" />
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

      {/* Delete Host Confirmation Dialog */}
      <AlertDialog open={showDeleteHostDialog} onOpenChange={setShowDeleteHostDialog}>
        <AlertDialogContent className="bg-white max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Delete Host Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              {selectedHostForDeletion && (
                <>
                  <p className="mb-4">
                    Are you sure you want to permanently delete <strong>{selectedHostForDeletion.name}</strong>?
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-red-800">This action will permanently delete:</p>
                    <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                      <li>The host account and all user data</li>
                      <li>All {selectedHostForDeletion.listings} listing(s) associated with this host</li>
                      <li>All {selectedHostForDeletion.bookings} booking(s) associated with this host</li>
                      <li>All reviews for this host's listings</li>
                    </ul>
                    <p className="text-sm text-red-600 font-medium mt-3">
                      ⚠️ This action is PERMANENT and CANNOT be undone!
                    </p>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteHostDialog(false);
              setSelectedHostForDeletion(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedHostForDeletion) {
                  handleDeleteHost(selectedHostForDeletion);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deletingHost === selectedHostForDeletion?.userId}
            >
              {deletingHost === selectedHostForDeletion?.userId ? (
                <>
                  <Clock className="w-4 h-4 animate-spin inline mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Permanently'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Guest Confirmation Dialog */}
      <AlertDialog open={showBlockGuestDialog} onOpenChange={setShowBlockGuestDialog}>
        <AlertDialogContent className="bg-white max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Block Guest Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              {selectedGuestForBlocking && (
                <>
                  <p className="mb-4">
                    Are you sure you want to block <strong>{selectedGuestForBlocking.name}</strong>?
                  </p>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-orange-800">This action will:</p>
                    <ul className="text-sm text-orange-700 list-disc list-inside space-y-1">
                      <li>Prevent the guest from making new bookings</li>
                      <li>Restrict access to platform features</li>
                      <li>Mark the account as blocked</li>
                    </ul>
                    <p className="text-sm text-orange-600 font-medium mt-3">
                      Note: The guest can be unblocked later if needed.
                    </p>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowBlockGuestDialog(false);
              setSelectedGuestForBlocking(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedGuestForBlocking) {
                  handleBlockGuest(selectedGuestForBlocking);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={blockingGuest === selectedGuestForBlocking?.userId}
            >
              {blockingGuest === selectedGuestForBlocking?.userId ? (
                <>
                  <Clock className="w-4 h-4 animate-spin inline mr-2" />
                  Blocking...
                </>
              ) : (
                'Block Guest'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Guest Confirmation Dialog */}
      <AlertDialog open={showDeleteGuestDialog} onOpenChange={setShowDeleteGuestDialog}>
        <AlertDialogContent className="bg-white max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Delete Guest Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              {selectedGuestForDeletion && (
                <>
                  <p className="mb-4">
                    Are you sure you want to permanently delete <strong>{selectedGuestForDeletion.name}</strong>?
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-red-800">This action will permanently delete:</p>
                    <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                      <li>The guest account and all user data</li>
                      <li>All {selectedGuestForDeletion.bookings} booking(s) associated with this guest</li>
                      <li>All reviews written by this guest</li>
                    </ul>
                    <p className="text-sm text-red-600 font-medium mt-3">
                      ⚠️ This action is PERMANENT and CANNOT be undone!
                    </p>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteGuestDialog(false);
              setSelectedGuestForDeletion(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedGuestForDeletion) {
                  handleDeleteGuest(selectedGuestForDeletion);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deletingGuest === selectedGuestForDeletion?.userId}
            >
              {deletingGuest === selectedGuestForDeletion?.userId ? (
                <>
                  <Clock className="w-4 h-4 animate-spin inline mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Permanently'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unterminate Host Confirmation Dialog */}
      <AlertDialog open={showUnterminateHostDialog} onOpenChange={setShowUnterminateHostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Host Account</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedHostForUntermination && (
                <div className="space-y-4">
                  <p>
                    Are you sure you want to restore <strong>{selectedHostForUntermination.name}</strong>?
                  </p>
                  <p className="text-sm text-muted-foreground">This will:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                    <li>Restore the host role to the account</li>
                    <li>Republish all previously terminated listings</li>
                    <li>Allow the host to log in and use their account again</li>
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowUnterminateHostDialog(false);
                setSelectedHostForUntermination(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedHostForUntermination) {
                  handleUnterminateHost(selectedHostForUntermination);
                }
              }}
              disabled={unterminatingHost !== null}
              className="bg-green-600 hover:bg-green-700"
            >
              {unterminatingHost ? 'Restoring...' : 'Restore Host'}
            </AlertDialogAction>
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
                      <li>Unpublish all {selectedHostForTermination.listings} listing(s) associated with this host (can be restored later)</li>
                      <li>Mark the account as terminated</li>
                      <li>Prevent the host from logging in</li>
                    </ul>
                    <p className="text-sm text-orange-600 font-medium mt-3">
                      Note: The host can be restored later using the "Unterminate" button.
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
          setReportFilters({
            bookingStatus: 'all',
            paymentStatus: 'all',
            category: 'all',
            userRole: 'all',
            accountStatus: 'all',
            rating: 'all',
            verified: 'all',
            hostStatus: 'all',
            subscriptionType: 'all',
            transactionType: 'all',
            violationType: 'all',
            complianceStatus: 'all'
          });
        }
      }}>
        <AlertDialogContent className="bg-white max-w-6xl max-h-[95vh] flex flex-col">
          <AlertDialogHeader className="flex-shrink-0">
            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filter Export Date Range - {selectedReportType && selectedReportType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Select a date range preset to filter the report, preview the data, then download.
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
                    // Auto-refresh preview after a short delay with current filters
                    setTimeout(() => {
                      if (selectedReportType) {
                        handlePreviewReportWithFilter(null, reportFilters);
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
                    // Auto-refresh preview after a short delay with current filters
                    setTimeout(() => {
                      if (selectedReportType) {
                        handlePreviewReportWithFilter(null, reportFilters);
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
                    // Auto-refresh preview after a short delay with current filters
                    setTimeout(() => {
                      if (selectedReportType) {
                        handlePreviewReportWithFilter(null, reportFilters);
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
                    // Auto-refresh preview after a short delay with current filters
                    setTimeout(() => {
                      if (selectedReportType) {
                        handlePreviewReportWithFilter(null, reportFilters);
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
                    // Auto-refresh preview after a short delay with current filters
                    setTimeout(() => {
                      if (selectedReportType) {
                        handlePreviewReportWithFilter(null, reportFilters);
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
                    // Auto-refresh preview after a short delay with current filters
                    setTimeout(() => {
                      if (selectedReportType) {
                        handlePreviewReportWithFilter(null, reportFilters);
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
              </div>
            </div>


            {/* Dynamic Filters Based on Report Type */}
            {selectedReportType === 'bookings' && (
              <>
                {/* Booking Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Booking Status
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {['all', 'confirmed', 'pending', 'completed', 'cancelled'].map(status => (
                      <button
                        key={status}
                        onClick={async () => {
                          const updatedFilters = { ...reportFilters, bookingStatus: status };
                          setReportFilters(updatedFilters);
                          setShowPreview(false);
                          setPreviewData(null);
                          // Use updated filters directly to avoid state timing issues
                          setTimeout(() => {
                            if (selectedReportType) {
                              handlePreviewReportWithFilter(null, updatedFilters);
                            }
                          }, 100);
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          reportFilters.bookingStatus === status
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Status
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['all', 'paid', 'unpaid'].map(status => (
                      <button
                        key={status}
                        onClick={async () => {
                          const updatedFilters = { ...reportFilters, paymentStatus: status };
                          setReportFilters(updatedFilters);
                          setShowPreview(false);
                          setPreviewData(null);
                          setTimeout(() => {
                            if (selectedReportType) {
                              handlePreviewReportWithFilter(null, updatedFilters);
                            }
                          }, 100);
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          reportFilters.paymentStatus === status
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {status === 'all' ? 'All Payments' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Category
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['all', 'accommodation', 'experience', 'service'].map(cat => (
                      <button
                        key={cat}
                        onClick={async () => {
                          const updatedFilters = { ...reportFilters, category: cat };
                          setReportFilters(updatedFilters);
                          setShowPreview(false);
                          setPreviewData(null);
                          setTimeout(() => {
                            if (selectedReportType) {
                              handlePreviewReportWithFilter(null, updatedFilters);
                            }
                          }, 100);
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          reportFilters.category === cat
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedReportType === 'users' && (
              <>
                {/* User Role Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    User Role
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['all', 'host', 'guest', 'admin'].map(role => (
                      <button
                        key={role}
                        onClick={async () => {
                          const updatedFilters = { ...reportFilters, userRole: role };
                          setReportFilters(updatedFilters);
                          setShowPreview(false);
                          setPreviewData(null);
                          setTimeout(() => {
                            if (selectedReportType) {
                              handlePreviewReportWithFilter(null, updatedFilters);
                            }
                          }, 100);
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          reportFilters.userRole === role
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Account Status
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['all', 'active', 'terminated', 'blocked'].map(status => (
                      <button
                        key={status}
                        onClick={async () => {
                          const updatedFilters = { ...reportFilters, accountStatus: status };
                          setReportFilters(updatedFilters);
                          setShowPreview(false);
                          setPreviewData(null);
                          setTimeout(() => {
                            if (selectedReportType) {
                              handlePreviewReportWithFilter(null, updatedFilters);
                            }
                          }, 100);
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          reportFilters.accountStatus === status
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedReportType === 'reviews' && (
              <>
                {/* Rating Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Rating
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {['all', '1', '2', '3', '4', '5'].map(rating => (
                      <button
                        key={rating}
                        onClick={async () => {
                          const updatedFilters = { ...reportFilters, rating: rating };
                          setReportFilters(updatedFilters);
                          setShowPreview(false);
                          setPreviewData(null);
                          setTimeout(() => {
                            if (selectedReportType) {
                              handlePreviewReportWithFilter(null, updatedFilters);
                            }
                          }, 100);
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          reportFilters.rating === rating
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {rating === 'all' ? 'All Ratings' : `${rating} Star${rating !== '1' ? 's' : ''}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Verified Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Verification Status
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['all', 'verified', 'unverified'].map(verified => (
                      <button
                        key={verified}
                        onClick={async () => {
                          const updatedFilters = { ...reportFilters, verified: verified };
                          setReportFilters(updatedFilters);
                          setShowPreview(false);
                          setPreviewData(null);
                          setTimeout(() => {
                            if (selectedReportType) {
                              handlePreviewReportWithFilter(null, updatedFilters);
                            }
                          }, 100);
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          reportFilters.verified === verified
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {verified === 'all' ? 'All Reviews' : verified.charAt(0).toUpperCase() + verified.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedReportType === 'hosts' && (
              <>
                {/* Host Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Host Status
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['all', 'active', 'terminated'].map(status => (
                      <button
                        key={status}
                        onClick={async () => {
                          const updatedFilters = { ...reportFilters, hostStatus: status };
                          setReportFilters(updatedFilters);
                          setShowPreview(false);
                          setPreviewData(null);
                          setTimeout(() => {
                            if (selectedReportType) {
                              handlePreviewReportWithFilter(null, updatedFilters);
                            }
                          }, 100);
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          reportFilters.hostStatus === status
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {status === 'all' ? 'All Hosts' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subscription Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Subscription Type
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['all', 'monthly', 'yearly'].map(type => (
                      <button
                        key={type}
                        onClick={async () => {
                          const updatedFilters = { ...reportFilters, subscriptionType: type };
                          setReportFilters(updatedFilters);
                          setShowPreview(false);
                          setPreviewData(null);
                          setTimeout(() => {
                            if (selectedReportType) {
                              handlePreviewReportWithFilter(null, updatedFilters);
                            }
                          }, 100);
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          reportFilters.subscriptionType === type
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {type === 'all' ? 'All Subscriptions' : type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedReportType === 'financial' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['all', 'commission', 'subscription'].map(type => (
                    <button
                      key={type}
                      onClick={async () => {
                        const updatedFilters = { ...reportFilters, transactionType: type };
                        setReportFilters(updatedFilters);
                        setShowPreview(false);
                        setPreviewData(null);
                        setTimeout(() => {
                          if (selectedReportType) {
                            handlePreviewReportWithFilter(null, updatedFilters);
                          }
                        }, 100);
                      }}
                      className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                        reportFilters.transactionType === type
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                      }`}
                    >
                      {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedReportType === 'compliance' && (
              <>
                {/* Violation Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Violation Type
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['all', 'host_cancellation', 'low_rating', 'host_appeal'].map(type => (
                      <button
                        key={type}
                        onClick={async () => {
                          const updatedFilters = { ...reportFilters, violationType: type };
                          setReportFilters(updatedFilters);
                          setShowPreview(false);
                          setPreviewData(null);
                          setTimeout(() => {
                            if (selectedReportType) {
                              handlePreviewReportWithFilter(null, updatedFilters);
                            }
                          }, 100);
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          reportFilters.violationType === type
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {type === 'all' ? 'All Types' : type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Compliance Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Compliance Status
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['all', 'pending', 'reviewed'].map(status => (
                      <button
                        key={status}
                        onClick={async () => {
                          const updatedFilters = { ...reportFilters, complianceStatus: status };
                          setReportFilters(updatedFilters);
                          setShowPreview(false);
                          setPreviewData(null);
                          setTimeout(() => {
                            if (selectedReportType) {
                              handlePreviewReportWithFilter(null, updatedFilters);
                            }
                          }, 100);
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          reportFilters.complianceStatus === status
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white border-gray-300 hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
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
                  <strong>Instructions:</strong> Select a date range preset above. 
                  Click "Preview Report" below to load and preview the data. You can then export it as PDF or print it.
                </p>
              </div>
            )}

            {/* Preview Section - Comprehensive Template */}
            {showPreview && previewData !== null && (
              <div className="mt-6 border-t pt-4 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Report Preview</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      This preview shows exactly what will be exported/printed. All {Array.isArray(previewData) ? previewData.length.toLocaleString() : 0} records will be included.
                    </p>
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
                  <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
                    {/* Ultra Compact Header - Matching PDF Export Exactly */}
                    <div 
                      className="text-white px-3 py-2"
                      style={{ 
                        backgroundColor: 'rgb(212, 163, 115)', // Primary color #D4A373
                        height: '48px' // Matching PDF header height (12mm ≈ 48px)
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <img 
                            src="/logo.jpg" 
                            alt="Getaways Logo" 
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div>
                            <h1 className="text-[9px] font-bold leading-tight" style={{ fontSize: '9px' }}>Getaways</h1>
                            <p className="text-[7px] text-white/90 leading-tight" style={{ fontSize: '7px' }}>
                              {selectedReportType && selectedReportType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Report
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[7px]" style={{ fontSize: '7px' }}>
                          <span>
                            {(() => {
                              const dateFilter = getDateRangeFromPreset(dateRangePreset);
                              const dateStr = new Date().toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: '2-digit'
                              });
                              if (dateFilter && dateFilter.startDate && dateFilter.endDate) {
                                return `${dateFilter.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateFilter.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                              }
                              return dateStr;
                            })()}
                          </span>
                          <span className="font-bold">• {previewData.length.toLocaleString()} records</span>
                        </div>
                      </div>
                    </div>

                    {/* Ultra Compact Table - Matching PDF Export Exactly */}
                    <div className="bg-white overflow-x-auto">
                      <table 
                        className="w-full border-collapse" 
                        style={{ 
                          fontSize: '9px', // Slightly larger for readability, but still compact
                          width: '100%',
                          tableLayout: 'auto'
                        }}
                      >
                        <thead>
                          <tr>
                            {previewHeaders.map((header, index) => (
                              <th
                                key={index}
                                className="text-left font-bold text-white uppercase"
                                style={{ 
                                  fontSize: '9px',
                                  backgroundColor: 'rgb(212, 163, 115)', // Primary color #D4A373
                                  color: 'white',
                                  padding: '4px 6px', // Slightly more padding for readability
                                  borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                                  whiteSpace: 'normal',
                                  wordWrap: 'break-word'
                                }}
                              >
                                {header.label || header.key || `Col ${index + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, rowIndex) => (
                            <tr 
                              key={rowIndex} 
                              style={{ 
                                backgroundColor: rowIndex % 2 === 0 ? 'white' : 'rgb(249, 250, 251)' // Alternating rows
                              }}
                            >
                              {previewHeaders.map((header, colIndex) => {
                                const headerKey = header.key || header.label;
                                let value = row[headerKey];
                                if (value === null || value === undefined) value = 'N/A';
                                else if (value instanceof Date) {
                                  value = value.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  });
                                } else if (typeof value === 'boolean') {
                                  value = value ? 'Yes' : 'No';
                                } else if (typeof value === 'number' && (headerKey.includes('Price') || headerKey.includes('Amount') || headerKey.includes('Fee') || headerKey.includes('Earnings') || headerKey.includes('Commission') || headerKey.includes('Spent'))) {
                                  value = formatCurrency(value);
                                }
                                return (
                                  <td
                                    key={colIndex}
                                    style={{ 
                                      fontSize: '9px',
                                      color: 'rgb(31, 41, 55)', // text-gray-800
                                      padding: '4px 6px', // Slightly more padding for readability
                                      borderRight: '1px solid rgb(229, 231, 235)', // border-gray-200
                                      borderBottom: '1px solid rgb(229, 231, 235)',
                                      whiteSpace: 'normal',
                                      wordWrap: 'break-word',
                                      overflowWrap: 'break-word',
                                      verticalAlign: 'middle',
                                      lineHeight: '1.3'
                                    }}
                                    title={String(value)}
                                  >
                                    {String(value)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {/* Minimal Footer - Matching PDF Export Exactly */}
                      <div 
                        className="border-t flex items-center justify-between px-3 py-1.5"
                        style={{ 
                          fontSize: '9px',
                          backgroundColor: 'rgba(212, 163, 115, 0.05)', // Primary color with opacity
                          borderTop: '1px solid rgba(212, 163, 115, 0.2)',
                          color: 'rgb(107, 114, 128)' // text-gray-500
                        }}
                      >
                        <span style={{ fontWeight: 'bold', color: 'rgb(31, 41, 55)' }}>
                          Total: <span style={{ color: 'rgb(212, 163, 115)' }}>{previewData.length.toLocaleString()}</span> records
                        </span>
                        <span>Getaways Platform Report</span>
                      </div>
                    </div>
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
            <div className="flex items-center justify-between w-full gap-3">
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
              
              <div className="flex items-center gap-3">
                {/* Print and Export buttons - always visible when preview is shown */}
                {showPreview && previewData && previewData.length > 0 && (
                  <>
                    <button
                      onClick={async () => {
                        if (!selectedReportType) return;
                        
                        try {
                          setIsPrinting(true);
                          
                          // Use the essential data that's already stored (same as preview)
                          if (!fullReportData || fullReportData.length === 0) {
                            toast.error('No data to print');
                            setIsPrinting(false);
                            return;
                          }
                          
                          const allData = fullReportData; // Use essential data
                          const headers = previewHeaders;
                          
                          const dateFilter = getDateRangeFromPreset(dateRangePreset);
                          
                          // Generate print content with ALL data
                          const printWindow = window.open('', '_blank');
                          if (!printWindow) {
                            toast.error('Please allow popups to print');
                            setIsPrinting(false);
                            return;
                          }
                          
                          const dateRangeText = dateFilter && dateFilter.startDate && dateFilter.endDate
                            ? `${dateFilter.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateFilter.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : 'All Time';
                          
                          const reportTitle = selectedReportType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                          const generatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                          
                          // Detect if table is wide (more than 6 columns)
                          const isWideTable = headers.length > 6;
                          
                          // Primary color RGB - Same as logo color (#D4A373 / HSL 25 47% 63% = RGB 212, 163, 115) - Warm Golden Tan
                          const primaryR = 212;  // #D4
                          const primaryG = 163;  // #A3
                          const primaryB = 115;  // #73
                          
                          let printContent = `<html><head><title>${reportTitle} Report - Getaways</title><style>
                            * {
                              box-sizing: border-box;
                            }
                            @media print {
                              @page { 
                                margin: 1cm 0.8cm; 
                                size: A4 ${isWideTable ? 'landscape' : 'portrait'};
                                orphans: 3;
                                widows: 3;
                              }
                              body { 
                                margin: 0; 
                                padding: 0;
                                font-family: Arial, sans-serif;
                                font-size: 10px;
                                line-height: 1.3;
                                overflow: visible;
                                width: 100%;
                                max-width: 100%;
                              }
                              .logo-header {
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                margin-bottom: 10px;
                                page-break-after: avoid;
                                page-break-inside: avoid;
                              }
                              .logo-header img {
                                height: 30px;
                                width: auto;
                              }
                              .logo-header .logo-word {
                                font-size: 20px;
                                font-weight: bold;
                                color: #3b82f6;
                                margin: 0;
                              }
                              .header {
                                page-break-after: avoid;
                                page-break-inside: avoid;
                                margin-bottom: 15px;
                                padding-bottom: 10px;
                                border-bottom: 2px solid #333;
                              }
                              h1 {
                                page-break-after: avoid;
                                page-break-inside: avoid;
                                margin: 0 0 10px 0;
                                font-size: 18px;
                              }
                              .date-range {
                                page-break-inside: avoid;
                                margin: 4px 0;
                                font-size: 11px;
                              }
                              table {
                                width: 100%;
                                max-width: 100%;
                                border-collapse: collapse;
                                page-break-inside: auto;
                                table-layout: auto;
                                font-size: 9px;
                                margin: 0;
                                display: table;
                              }
                              thead {
                                display: table-header-group;
                                page-break-inside: avoid;
                                page-break-after: avoid;
                              }
                              tfoot {
                                display: table-footer-group;
                                page-break-inside: avoid;
                                page-break-before: avoid;
                              }
                              tbody {
                                display: table-row-group;
                              }
                              tr {
                                page-break-after: auto;
                                break-inside: avoid;
                                height: auto;
                                min-height: 20px;
                                display: table-row;
                              }
                              th, td {
                                break-inside: avoid;
                                padding: 6px 5px;
                                border: 1px solid #ddd;
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                                hyphens: auto;
                                vertical-align: top;
                                display: table-cell;
                              }
                              th {
                                background-color: #f3f4f6;
                                font-weight: bold;
                                text-align: left;
                                white-space: normal;
                                font-size: 9px;
                                position: relative;
                              }
                              td {
                                font-size: 9px;
                                white-space: normal;
                                overflow: visible;
                              }
                              .print-section {
                                page-break-after: auto;
                              }
                              @page :first {
                                margin-top: 1.5cm;
                              }
                            }
                            @media screen {
                              body { 
                                font-family: Arial, sans-serif; 
                                margin: 20px; 
                                padding: 0; 
                                font-size: 10px;
                              }
                              .logo-header {
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                margin-bottom: 15px;
                              }
                              .logo-header img {
                                height: 35px;
                                width: auto;
                              }
                              .logo-header .logo-word {
                                font-size: 24px;
                                font-weight: bold;
                                color: #3b82f6;
                                margin: 0;
                              }
                              .header {
                                margin-bottom: 20px;
                                padding-bottom: 10px;
                                border-bottom: 2px solid #333;
                              }
                              h1 {
                                margin: 0 0 15px 0;
                                font-size: 20px;
                              }
                              table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                                font-size: 11px;
                              }
                              th {
                                background-color: #f3f4f6;
                                padding: 10px 8px;
                                text-align: left;
                                border: 1px solid #ddd;
                                font-weight: bold;
                              }
                              td {
                                padding: 8px;
                                border: 1px solid #ddd;
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                                vertical-align: top;
                              }
                              .date-range {
                                color: #666;
                                margin-bottom: 8px;
                                font-size: 13px;
                              }
                            }
                          </style></head><body>
                            <!-- Ultra-compact header matching preview exactly -->
                            <div style="background: rgb(${primaryR}, ${primaryG}, ${primaryB}); color: white; padding: 8px 12px; margin-bottom: 0;">
                              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                  <img src="/logo.jpg" alt="Getaways Logo" style="width: 24px; height: 24px; object-fit: contain;" onerror="this.style.display='none'">
                                  <div>
                                    <h1 style="margin: 0; font-size: 11px; font-weight: bold; line-height: 1.2;">Getaways</h1>
                                    <p style="margin: 0; font-size: 8px; color: rgba(255,255,255,0.9); line-height: 1.2;">${reportTitle} Report</p>
                                  </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px; font-size: 8px;">
                                  <span>${dateRangeText}</span>
                                  <span style="font-weight: bold;">${allData.length.toLocaleString()} records</span>
                                </div>
                              </div>
                            </div>
                            
                            <!-- Complete table with all columns and rows - no cutting -->
                            <div style="background: white; padding: 0; overflow-x: visible;">
                              <table style="width: 100%; border-collapse: collapse; font-size: 9px; table-layout: auto; min-width: 100%;">
                                <thead>
                                  <tr style="background: rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.05);">
                                    ${headers.map(h => `<th style="padding: 4px 8px; text-align: left; font-weight: bold; font-size: 9px; text-transform: uppercase; color: #1f2937; border-bottom: 1px solid rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.2); white-space: normal; border-right: 1px solid rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.1); word-wrap: break-word;">${h.label || h.key}</th>`).join('')}
                                  </tr>
                                </thead>
                                <tbody>
                                  ${allData.map((row, rowIndex) => `<tr style="${rowIndex % 2 === 0 ? 'background: white;' : 'background: #f9fafb;'}">${headers.map(header => {
                                    const headerKey = header.key || header.label;
                                    let value = row[headerKey];
                                    if (value === null || value === undefined) value = 'N/A';
                                    else if (value instanceof Date) {
                                      value = value.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      });
                                    } else if (typeof value === 'boolean') {
                                      value = value ? 'Yes' : 'No';
                                    } else if (typeof value === 'number' && (headerKey.includes('Price') || headerKey.includes('Amount') || headerKey.includes('Fee') || headerKey.includes('Earnings') || headerKey.includes('Commission') || headerKey.includes('Spent'))) {
                                      // Format currency - match preview format exactly
                                      const formatted = new Intl.NumberFormat('en-US', { 
                                        style: 'currency', 
                                        currency: 'PHP', 
                                        minimumFractionDigits: 2 
                                      }).format(value);
                                      value = formatted.replace('PHP', 'PHP ');
                                    }
                                    // Ensure full value is displayed without cutting
                                    const displayValue = String(value);
                                    return `<td style="padding: 4px 8px; border-right: 1px solid #e5e7eb; font-size: 9px; color: #1f2937; word-wrap: break-word; white-space: normal; overflow: visible; vertical-align: top;" title="${displayValue.replace(/"/g, '&quot;')}">${displayValue.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
                                  }).join('')}</tr>`).join('')}
                                </tbody>
                              </table>
                              
                              <!-- Minimal footer matching preview -->
                              <div style="border-top: 1px solid rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.2); background: rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.05); padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 9px;">
                                <span style="font-weight: bold; color: #1f2937;">Total: <span style="color: rgb(${primaryR}, ${primaryG}, ${primaryB});">${allData.length.toLocaleString()}</span> records</span>
                                <span style="color: #6b7280;">Getaways Platform Report</span>
                              </div>
                            </div>
                          </body></html>`;
                          
                          printWindow.document.write(printContent);
                          printWindow.document.close();
                          
                          // Wait for content to load before printing
                          setTimeout(() => {
                            printWindow.print();
                            toast.success(`Printing ${allData.length} records`);
                            setIsPrinting(false);
                          }, 300);
                        } catch (error) {
                          console.error('Error printing report:', error);
                          toast.error(`Failed to print: ${error.message}`);
                          setIsPrinting(false);
                        }
                      }}
                      className="btn-outline flex items-center gap-2"
                      disabled={isPrinting || !previewData || previewData.length === 0}
                    >
                      {isPrinting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Preparing...
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4" />
                          Print
                        </>
                      )}
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
                  </>
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
              </div>
            </div>
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
              } else if (previewSection === 'user-management') {
                const isGuests = userManagementView === 'guests';
                return (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-2">Showing {data.length} {isGuests ? 'guests' : 'hosts'}</p>
                    {data.map((item, idx) => (
                      <div key={idx} className="p-3 border border-gray-200 rounded-lg text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{item.name || 'Unknown'}</p>
                            <p className="text-gray-600 text-xs">{item.email || 'N/A'}</p>
                            {isGuests ? (
                              <p className="text-gray-500 text-xs">
                                {item.bookings || 0} bookings
                              </p>
                            ) : (
                              <p className="text-gray-500 text-xs">
                                {item.listings || 0} listings • {item.bookings || 0} bookings
                              </p>
                            )}
                          </div>
                          <p className="font-bold text-green-600">
                            {formatCurrency(isGuests ? (item.totalSpent || 0) : (item.earnings || 0))}
                          </p>
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
              Print {printSection === 'overview' ? 'Overview' : printSection === 'transactions' ? 'Transactions' : printSection === 'earnings' ? 'Earnings' : printSection === 'service-fees' ? 'Service Fees' : printSection === 'user-management' ? 'User Management' : 'Report'}
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
                    setPrintDateRange({ from: undefined, to: undefined });
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

            {/* Custom Date Range Calendar for Print */}
            {printDateRangePreset === 'custom' && (
              <div className="flex justify-center w-full">
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 w-full max-w-4xl mx-auto relative">
                  <Calendar
                    mode="range"
                    selected={printDateRange}
                    onSelect={(range) => {
                      if (range) {
                        setPrintDateRange(range);
                      } else {
                        setPrintDateRange({ from: undefined, to: undefined });
                      }
                    }}
                    numberOfMonths={2}
                    showOutsideDays={true}
                    navLayout="around"
                    className="w-full"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                      day_range_end: "day-range-end",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible"
                    }}
                    components={{
                      IconLeft: () => <ChevronLeft className="h-5 w-5 text-gray-700" />,
                      IconRight: () => <ChevronRight className="h-5 w-5 text-gray-700" />
                    }}
                  />
                </div>
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
                setPrintDateRange({ from: undefined, to: undefined });
                setPrintDateRangePreset('all');
                setPrintSection(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePrint}
              disabled={isPrinting || (printDateRangePreset === 'custom' && printDateRange.from && printDateRange.to && new Date(printDateRange.from) > new Date(printDateRange.to))}
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
