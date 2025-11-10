import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, ExternalLink, Calendar, Filter, Search, User, Briefcase, Users } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const EWallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [currentMode, setCurrentMode] = useState('guest'); // 'guest' or 'host'
  const [loading, setLoading] = useState(true);
  const [paypalBalance, setPaypalBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, income, expense
  const [paypalEmail, setPaypalEmail] = useState('');
  const [accountType, setAccountType] = useState('personal'); // 'personal' or 'business'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Determine account type based on user role
  // Admin → Business account, Guest/Host → Personal account
  useEffect(() => {
    const determineAccountType = async () => {
      if (!user) return;
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const roles = Array.isArray(userData.roles) ? userData.roles : (userData.roles ? [userData.roles] : ['guest']);
          setUserRoles(roles);
          
          const isAdmin = roles.includes('admin');
          const hasHostRole = roles.includes('host');
          const hasMultipleRoles = roles.includes('guest') && roles.includes('host');
          
          // Check if we're on a host-specific path
          const isHostPath = location.pathname.includes('/host/') || 
                            location.pathname.includes('/hostdashboard') ||
                            location.pathname.includes('/pages/');
          
          // Determine mode based on path and sessionStorage
          const lastMode = sessionStorage.getItem('lastActiveMode');
          
          // Account type: Admin = Business, Guest/Host = Personal
          if (isAdmin) {
            setAccountType('business');
            setCurrentMode('admin');
          } else {
            setAccountType('personal');
            
            // Determine current mode for display purposes
            if (hasMultipleRoles) {
              // User has both guest and host roles - use path and sessionStorage to determine mode
              if (isHostPath) {
                setCurrentMode('host');
              } else if (lastMode === 'host' && hasHostRole) {
                setCurrentMode('host');
              } else {
                setCurrentMode('guest');
              }
            } else if (hasHostRole) {
              setCurrentMode('host');
            } else {
              setCurrentMode('guest');
            }
          }
        }
      } catch (error) {
        console.error('Error determining account type:', error);
        setCurrentMode('guest');
        setAccountType('personal');
      }
    };
    
    if (user) {
      determineAccountType();
    }
  }, [user, location.pathname]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Reload wallet data when mode changes
  useEffect(() => {
    if (user && currentMode) {
      loadWalletData(user.uid);
    }
  }, [user, currentMode]);

  const loadWalletData = async (userId) => {
    try {
      setLoading(true);
      
      // Load user payment data
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const paymentData = userData.payment || {};
        
        // Get PayPal email based on account type
        // Admin → Business account, Guest/Host → Personal account
        let email = '';
        let detectedAccountType = '';
        
        if (accountType === 'business') {
          // Business account (Admin only)
          email = paymentData.businessPaypalEmail || 
                  paymentData.adminPaypalEmail ||
                  paymentData.paypalEmail || 
                  paymentData.lastPayPalPayerEmail || 
                  '';
          detectedAccountType = 'business';
        } else {
          // Personal account (Guest and Host)
          email = paymentData.personalPaypalEmail || 
                  paymentData.guestPaypalEmail ||
                  paymentData.hostPaypalEmail ||
                  paymentData.paypalEmail || 
                  userData.email || 
                  '';
          detectedAccountType = 'personal';
        }
        
        setPaypalEmail(email);
        
        // Log detected account for debugging
        console.log('📧 E-Wallet: Account Type:', detectedAccountType);
        console.log('📧 E-Wallet: PayPal Email:', email);
        console.log('📧 E-Wallet: User Roles:', userRoles);
        
        // Calculate balance from transactions (simulated)
        // In a real implementation, this would fetch from PayPal API
        const balance = await calculatePayPalBalance(userId, paymentData, accountType);
        setPaypalBalance(balance);
      }
      
      // Load transactions
      const transactionList = await loadTransactions(userId, accountType, currentMode);
      setTransactions(transactionList);
      setFilteredTransactions(transactionList);
      
    } catch (error) {
      console.error('Error loading wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const calculatePayPalBalance = async (userId, paymentData, accountType) => {
    // Simulated balance calculation
    // In production, this would call PayPal API to get actual balance
    // For now, we'll calculate from transactions based on account type
    
    try {
      if (accountType === 'business') {
        // Business account balance (Admin only) - sum of all platform payments
        // This includes all guest booking payments and host subscription payments
        
        const bookingsRef = collection(db, 'bookings');
        const usersRef = collection(db, 'users');
        
        // Get all guest booking payments (confirmed/completed bookings)
        const allBookings = await getDocs(bookingsRef);
        let totalGuestPayments = 0;
        
        allBookings.forEach(bookingDoc => {
          const booking = bookingDoc.data();
          if ((booking.status === 'confirmed' || booking.status === 'completed') && booking.totalPrice) {
            totalGuestPayments += booking.totalPrice || 0;
          }
        });
        
        // Get all host subscription payments
        const allUsers = await getDocs(usersRef);
        let totalHostSubscriptions = 0;
        
        allUsers.forEach(userDoc => {
          const userData = userDoc.data();
          const userPayment = userData.payment || {};
          
          // Check if user has active subscription
          if (userPayment.status === 'active' && userPayment.type) {
            const planPrice = userPayment.type === 'yearly' ? 9999 : 999;
            totalHostSubscriptions += planPrice;
          }
        });
        
        // Business account balance = all guest payments + all host subscriptions
        const startingBalance = 0; // Start from 0, all money comes from payments
        const balance = startingBalance + totalGuestPayments + totalHostSubscriptions;
        
        return balance;
      } else {
        // Personal account balance (Guest and Host) - all user transactions
        const bookingsRef = collection(db, 'bookings');
        
        // Get bookings as guest (expenses)
        const guestBookingsQuery = query(
          bookingsRef,
          where('guestId', '==', userId)
        );
        const guestBookings = await getDocs(guestBookingsQuery);
        
        // Get bookings as host (income)
        const hostBookingsQuery = query(
          bookingsRef,
          where('ownerId', '==', userId)
        );
        const hostBookings = await getDocs(hostBookingsQuery);
        
        // Calculate expenses (as guest) - only confirmed/completed bookings
        let expenses = 0;
        guestBookings.forEach(doc => {
          const booking = doc.data();
          if (booking.status === 'confirmed' || booking.status === 'completed') {
            expenses += booking.totalPrice || 0;
          }
        });
        
        // Calculate income (as host) - only confirmed/completed bookings
        let income = 0;
        hostBookings.forEach(doc => {
          const booking = doc.data();
          if (booking.status === 'confirmed' || booking.status === 'completed') {
            income += booking.totalPrice || 0;
          }
        });
        
        // Get subscription payments (expenses for hosts)
        let subscriptionExpenses = 0;
        if (paymentData.status === 'active' && paymentData.type) {
          const planPrice = paymentData.type === 'yearly' ? 9999 : 999;
          subscriptionExpenses += planPrice;
        }
        
        // Personal account: starting balance + income - expenses - subscriptions
        const startingBalance = 5000; // Mock starting balance for personal account
        const balance = startingBalance + income - expenses - subscriptionExpenses;
        
        return Math.max(0, balance);
      }
    } catch (error) {
      console.error('Error calculating balance:', error);
      // Return a default balance if calculation fails
      return accountType === 'business' ? 10000 : 5000;
    }
  };

  const loadTransactions = async (userId, accountType, mode) => {
    const transactionList = [];
    
    try {
      // Get user data to determine roles
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const paymentData = userData.payment || {};
      
      if (accountType === 'business') {
        // Business account transactions (Admin only)
        // Show all guest booking payments and host subscription payments
        
        // Get all guest booking payments
        const bookingsRef = collection(db, 'bookings');
        const allBookings = await getDocs(bookingsRef);
        
        // Get guest and listing info for each booking
        for (const bookingDoc of allBookings.docs) {
          const booking = bookingDoc.data();
          
          // Only include confirmed/completed bookings (actual payments)
          if (booking.status === 'confirmed' || booking.status === 'completed') {
            // Get guest info
            const guestDoc = await getDoc(doc(db, 'users', booking.guestId));
            const guestData = guestDoc.exists() ? guestDoc.data() : {};
            const guestName = `${guestData.firstName || ''} ${guestData.lastName || ''}`.trim() || guestData.email || 'Unknown Guest';
            
            // Get listing info
            const listingDoc = await getDoc(doc(db, 'listings', booking.listingId));
            const listingData = listingDoc.exists() ? listingDoc.data() : {};
            const listingTitle = listingData.title || 'Unknown Listing';
            
            const bookingDate = booking.createdAt?.toDate 
              ? booking.createdAt.toDate() 
              : new Date(booking.createdAt);
            
            transactionList.push({
              id: `booking-guest-${bookingDoc.id}`,
              type: 'income',
              category: 'booking',
              amount: booking.totalPrice || 0,
              description: `Booking payment from ${guestName} - ${listingTitle}`,
              date: bookingDate,
              status: booking.status || 'completed',
              bookingId: bookingDoc.id,
              listingId: booking.listingId,
              guestId: booking.guestId,
              guestName: guestName,
              accountType: 'business',
            });
          }
        }
        
        // Get all host subscription payments
        const usersRef = collection(db, 'users');
        const allUsers = await getDocs(usersRef);
        
        for (const userDoc of allUsers.docs) {
          const userData = userDoc.data();
          const userPayment = userData.payment || {};
          
          // Check if user has active subscription payment
          if (userPayment.status === 'active' && userPayment.lastPaymentDate) {
            const hostName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Unknown Host';
            const planPrice = userPayment.type === 'yearly' ? 9999 : 999;
            const paymentDate = userPayment.lastPaymentDate?.toDate 
              ? userPayment.lastPaymentDate.toDate() 
              : new Date(userPayment.lastPaymentDate);
            
            transactionList.push({
              id: userPayment.lastPayPalTransactionId || `sub-${userDoc.id}`,
              type: 'income',
              category: 'subscription',
              amount: planPrice,
              description: `Subscription payment from ${hostName} - ${userPayment.type === 'yearly' ? 'Yearly' : 'Monthly'} Plan`,
              date: paymentDate,
              status: 'completed',
              transactionId: userPayment.lastPayPalTransactionId || null,
              hostId: userDoc.id,
              hostName: hostName,
              subscriptionType: userPayment.type,
              accountType: 'business',
            });
          }
        }
      } else {
        // Personal account transactions (Guest and Host)
        // Include both guest expenses and host income
        
        // Add subscription payment transactions (if host)
        if (paymentData.status === 'active' && paymentData.lastPaymentDate) {
          const paymentDate = paymentData.lastPaymentDate?.toDate 
            ? paymentData.lastPaymentDate.toDate() 
            : new Date(paymentData.lastPaymentDate);
          
          const planPrice = paymentData.type === 'yearly' ? 9999 : 999;
          transactionList.push({
            id: paymentData.lastPayPalTransactionId || `sub-${userId}`,
            type: 'expense',
            category: 'subscription',
            amount: planPrice,
            description: `Getaways ${paymentData.type === 'yearly' ? 'Yearly' : 'Monthly'} Subscription`,
            date: paymentDate,
            status: 'completed',
            transactionId: paymentData.lastPayPalTransactionId || null,
            accountType: 'personal',
          });
        }
        
        // Get bookings as guest (expenses)
        const bookingsRef = collection(db, 'bookings');
        const guestBookingsQuery = query(
          bookingsRef,
          where('guestId', '==', userId)
        );
        const guestBookings = await getDocs(guestBookingsQuery);
        
        guestBookings.forEach(doc => {
          const booking = doc.data();
          const bookingDate = booking.createdAt?.toDate 
            ? booking.createdAt.toDate() 
            : new Date(booking.createdAt);
          
          transactionList.push({
            id: `booking-guest-${doc.id}`,
            type: 'expense',
            category: 'booking',
            amount: booking.totalPrice || 0,
            description: `Booking: ${booking.category || 'Accommodation'}`,
            date: bookingDate,
            status: booking.status || 'pending',
            bookingId: doc.id,
            listingId: booking.listingId,
            accountType: 'personal',
          });
        });
        
        // Get bookings as host (income)
        const hostBookingsQuery = query(
          bookingsRef,
          where('ownerId', '==', userId)
        );
        const hostBookings = await getDocs(hostBookingsQuery);
        
        hostBookings.forEach(doc => {
          const booking = doc.data();
          const bookingDate = booking.createdAt?.toDate 
            ? booking.createdAt.toDate() 
            : new Date(booking.createdAt);
          
          transactionList.push({
            id: `booking-host-${doc.id}`,
            type: 'income',
            category: 'booking',
            amount: booking.totalPrice || 0,
            description: `Earning from ${booking.category || 'Accommodation'} booking`,
            date: bookingDate,
            status: booking.status || 'pending',
            bookingId: doc.id,
            listingId: booking.listingId,
            accountType: 'personal',
          });
        });
      }
      
      // Sort by date (newest first)
      transactionList.sort((a, b) => b.date - a.date);
      
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
    
    return transactionList;
  };

  const handleRefresh = async () => {
    if (!user) return;
    
    setIsRefreshing(true);
    try {
      await loadWalletData(user.uid);
      toast.success('Wallet data refreshed');
    } catch (error) {
      toast.error('Failed to refresh wallet data');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let filtered = [...transactions];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    
    setFilteredTransactions(filtered);
  }, [searchTerm, filterType, transactions]);

  const formatCurrency = (amount) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'confirmed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">E-Wallet</h1>
              <p className="text-gray-600">
                {accountType === 'business' 
                  ? 'Business PayPal account - All guest booking payments and host subscription payments'
                  : 'Manage your PayPal account and view transaction history'
                }
              </p>
            </div>
            {/* Account Type Badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100">
              {accountType === 'business' ? (
                <>
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Business Account (Admin)</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Personal Account {currentMode === 'host' ? '(Host)' : '(Guest)'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className={`bg-gradient-to-r rounded-xl shadow-lg p-6 md:p-8 mb-8 text-white ${
          accountType === 'business' 
            ? 'from-blue-600 to-blue-700' 
            : 'from-green-600 to-green-700'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8" />
              <div>
                <p className="text-blue-100 text-sm">
                  {accountType === 'business' ? 'Business' : 'Personal'} PayPal Balance
                </p>
                <p className="text-3xl md:text-4xl font-bold">{formatCurrency(paypalBalance)}</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {paypalEmail && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-blue-100 text-sm">
                Connected {accountType === 'business' ? 'Business' : 'Personal'} Account
              </p>
              <p className="text-white font-medium">{paypalEmail}</p>
              <p className="text-blue-100 text-xs mt-1">
                {accountType === 'business' 
                  ? 'Business PayPal account for admin operations'
                  : userRoles.includes('host') && currentMode === 'host'
                    ? 'Personal PayPal account used for both guest bookings and host earnings'
                    : 'Personal PayPal account for guest bookings'}
              </p>
              <p className="text-blue-50 text-xs mt-2 font-mono bg-white/10 px-2 py-1 rounded">
                Account Type: {accountType === 'business' ? 'Business' : 'Personal'} | 
                Role: {userRoles.includes('admin') ? 'Admin' : currentMode === 'host' ? 'Host' : 'Guest'}
              </p>
            </div>
          )}
          
          {!paypalEmail && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-blue-100 text-sm mb-2">
                No {accountType === 'business' ? 'business' : 'personal'} PayPal account connected
              </p>
              <button
                onClick={() => navigate('/accountsettings')}
                className="text-sm underline hover:text-blue-200"
              >
                Connect your {accountType === 'business' ? 'business' : 'personal'} PayPal account
              </button>
            </div>
          )}
        </div>

        {/* Admin Summary Section */}
        {accountType === 'business' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Guest Booking Payments</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      transactions
                        .filter(t => t.category === 'booking' && t.type === 'income')
                        .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {transactions.filter(t => t.category === 'booking' && t.type === 'income').length} booking{transactions.filter(t => t.category === 'booking' && t.type === 'income').length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Host Subscription Payments</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      transactions
                        .filter(t => t.category === 'subscription' && t.type === 'income')
                        .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {transactions.filter(t => t.category === 'subscription' && t.type === 'income').length} active subscription{transactions.filter(t => t.category === 'subscription' && t.type === 'income').length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            {/* Type Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  filterType === 'income'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                Income
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  filterType === 'expense'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Expenses
              </button>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
            <p className="text-sm text-gray-600 mt-1">{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}</p>
          </div>
          
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No transactions found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Your transaction history will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Icon */}
                      <div className={`p-3 rounded-lg ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {transaction.type === 'income' ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(transaction.date)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                          {transaction.category && (
                            <span className="text-xs text-gray-500 capitalize">
                              {transaction.category}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Amount */}
                      <div className="text-right ml-4">
                        <p className={`text-lg font-semibold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                        {transaction.transactionId && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(transaction.transactionId);
                              toast.success('Transaction ID copied');
                            }}
                            className="text-xs text-gray-500 hover:text-primary mt-1 flex items-center gap-1"
                          >
                            <span className="font-mono">{transaction.transactionId.substring(0, 8)}...</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 mb-2">
            <strong>Note:</strong> This e-wallet reflects transactions from your Getaways account. 
            For real-time PayPal balance and complete transaction history, please visit your PayPal account directly.
          </p>
          <p className="text-sm text-blue-700">
            <strong>Account Type:</strong> {
              accountType === 'business' 
                ? 'You are using a Business PayPal account (Admin only).'
                : userRoles.includes('host')
                  ? 'You are using a Personal PayPal account for both guest bookings and host earnings.'
                  : 'You are using a Personal PayPal account for guest bookings.'
            }
          </p>
          {userRoles.includes('admin') && (
            <p className="text-sm text-blue-700 mt-1">
              <strong>Admin Note:</strong> As an admin, you have access to the Business PayPal account for platform operations.
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EWallet;

