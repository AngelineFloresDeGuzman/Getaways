import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, ExternalLink, Calendar as CalendarIcon, Filter, Search, Plus, X, CheckCircle, AlertCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import {
  getWalletBalance,
  initializeWallet,
  cashInFromPayPal,
  cashOutToPayPal,
  getWalletTransactions,
  addToWallet,
  deductFromWallet
} from './services/getpayService';
import { getAdminPayPalEmail } from '@/pages/Admin/services/platformSettingsService';

// PayPal Client ID
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
const HAS_VALID_PAYPAL_CLIENT_ID = PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== 'test' && PAYPAL_CLIENT_ID.length > 10;

// PayPal Cash-In Button Component
const PayPalCashInButton = ({ amount, onSuccess, onError, disabled }) => {
  const [{ isPending, isResolved }] = usePayPalScriptReducer();
  
  if (!HAS_VALID_PAYPAL_CLIENT_ID) {
    return (
      <div className="text-center py-4 px-4 bg-primary/10 border border-primary/30 rounded-lg">
        <p className="text-sm text-primary font-semibold mb-1">
          PayPal is not configured
        </p>
        <p className="text-xs text-primary/90">
          Please set VITE_PAYPAL_CLIENT_ID in your .env file
        </p>
      </div>
    );
  }
  
  return (
    <>
      {isPending && <div className="text-center py-4 text-gray-600">Loading PayPal...</div>}
      {isResolved && (
        <PayPalButtons
          disabled={disabled || isPending}
          style={{
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'paypal'
          }}
          createOrder={(data, actions) => {
            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    value: typeof amount === 'string' ? amount : amount.toString(),
                    currency_code: 'PHP'
                  },
                  description: `GetPay Wallet Cash-In - ₱${amount.toLocaleString()}`
                }
              ]
            });
          }}
          onApprove={(data, actions) => {
            return actions.order.capture().then((details) => {
              onSuccess(details);
            }).catch((err) => {
              console.error('PayPal capture error:', err);
              // Handle capture errors (including seller/buyer account conflicts)
              const errorMessage = err?.message || err?.toString() || '';
              const errorDetails = err?.details || [];
              
              // Check if this is a seller/buyer account conflict
              // Common error messages from PayPal:
              // - "You are logging into the account of the seller for this purchase"
              // - "seller account" errors
              // - "login" related errors when buyer = seller
              const lowerMessage = errorMessage.toLowerCase();
              const isSellerError = lowerMessage.includes('seller') || 
                  lowerMessage.includes('logging into the account of the seller') ||
                  lowerMessage.includes('change your login information') ||
                  lowerMessage.includes('cannot pay yourself') ||
                  errorDetails.some(detail => {
                    const issue = detail?.issue?.toLowerCase() || '';
                    const desc = detail?.description?.toLowerCase() || '';
                    return issue.includes('seller') || 
                           desc.includes('seller') || 
                           issue.includes('account') ||
                           desc.includes('logging into the account');
                  });
              
              if (isSellerError) {
                onError({
                  message: 'The PayPal account you\'re using is the same as the merchant account. Please use a different PayPal account to complete this transaction.',
                  sellerAccountError: true,
                  originalError: err,
                  userFriendlyMessage: 'Payment Error: You cannot use the same PayPal account that is registered as the merchant/seller account. Please use a different PayPal account for cash-in, or contact support if you need assistance.'
                });
              } else {
                onError({
                  message: err?.message || 'Failed to process payment',
                  originalError: err
                });
              }
            });
          }}
          onError={(err) => {
            console.error('PayPal error:', err);
            // Check for seller account error in the error object itself
            const errorMessage = err?.message || err?.toString() || '';
            const errorStr = JSON.stringify(err) || '';
            const lowerMessage = errorMessage.toLowerCase();
            const lowerStr = errorStr.toLowerCase();
            
            // Check for the specific error message
            const isSellerError = lowerMessage.includes('seller') || 
                lowerMessage.includes('logging into the account of the seller') ||
                lowerMessage.includes('change your login information') ||
                lowerStr.includes('logging into the account of the seller') ||
                lowerStr.includes('seller for this purchase');
            
            // Pass detailed error information
            onError({
              ...err,
              message: err?.message || 'PayPal payment failed',
              details: err?.details || [],
              sellerAccountError: isSellerError || err?.sellerAccountError,
              userFriendlyMessage: isSellerError ? 
                'Payment Error: The PayPal account you\'re using is the same as the merchant account. Please use a different PayPal account for cash-in, or contact support if you need assistance.' :
                undefined
            });
          }}
          onCancel={(data) => {
            console.log('PayPal payment cancelled:', data);
            onError({
              message: 'Payment was cancelled',
              cancelled: true
            });
          }}
        />
      )}
    </>
  );
};

const EWallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [currentMode, setCurrentMode] = useState('guest');
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [paypalConnected, setPaypalConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCashInModal, setShowCashInModal] = useState(false);
  const [cashInAmount, setCashInAmount] = useState('');
  const [isProcessingCashIn, setIsProcessingCashIn] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [cashOutPayPalEmail, setCashOutPayPalEmail] = useState('');
  const [useDifferentEmail, setUseDifferentEmail] = useState(false);
  const [isProcessingCashOut, setIsProcessingCashOut] = useState(false);
  const [merchantPayPalEmail, setMerchantPayPalEmail] = useState('');
  const [isMerchantAccount, setIsMerchantAccount] = useState(false);
  const [cashOutRequests, setCashOutRequests] = useState([]);
  const [showCashOutRequests, setShowCashOutRequests] = useState(true); // Expanded by default
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const datePickerRef = React.useRef(null);

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

  useEffect(() => {
    const determineUserRoles = async () => {
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
          
          const isHostPath = location.pathname.includes('/host/') || 
                            location.pathname.includes('/hostdashboard') ||
                            location.pathname.includes('/pages/');
          
          const lastMode = sessionStorage.getItem('lastActiveMode');
          
          if (isAdmin) {
            setCurrentMode('admin');
          } else {
            if (hasMultipleRoles) {
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

          // Get PayPal email and connection status
          const paymentData = userData.payment || {};
          const email = paymentData.paypalEmail || userData.paypalEmail || '';
          const isConnected = paymentData.paypalStatus === 'connected' || userData.paypalStatus === 'connected';
          setPaypalEmail(email);
          setPaypalConnected(isConnected && !!email);
          // Auto-fill cash-out email with connected PayPal email
          if (isConnected && email) {
            setCashOutPayPalEmail(email);
            setUseDifferentEmail(false);
          }
        }
      } catch (error) {
        console.error('Error determining user roles:', error);
        setCurrentMode('guest');
      }
    };
    
    if (user) {
      determineUserRoles();
    }
  }, [user, location.pathname]);

  // Load merchant PayPal email and check if user's account matches
  useEffect(() => {
    const loadMerchantEmail = async () => {
      try {
        const adminEmail = await getAdminPayPalEmail();
        setMerchantPayPalEmail(adminEmail);
        
        // Check if user's connected PayPal email matches merchant account
        // BUT: If user is admin, allow merchant account (admin can use merchant account)
        const isAdmin = userRoles.includes('admin');
        if (adminEmail && paypalEmail && paypalEmail.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
          // Only set as merchant account if NOT admin (admin can use merchant account)
          setIsMerchantAccount(!isAdmin);
      } else {
          setIsMerchantAccount(false);
      }
        
        // If admin and no PayPal connected, auto-use merchant account
        if (isAdmin && !paypalEmail && adminEmail) {
          setPaypalEmail(adminEmail);
          setPaypalConnected(true);
          setCashOutPayPalEmail(adminEmail);
        }
      } catch (error) {
        console.error('Error loading merchant PayPal email:', error);
      }
    };
    
    if (paypalEmail || userRoles.includes('admin')) {
      loadMerchantEmail();
    } else {
      // Also load merchant email even if user doesn't have PayPal connected
      loadMerchantEmail();
    }
  }, [paypalEmail, userRoles]);

  useEffect(() => {
    if (user) {
      loadWalletData(user.uid);
    }
  }, [user]);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  const loadWalletData = async (userId) => {
    try {
      setLoading(true);
      
      // Initialize wallet if it doesn't exist
      await initializeWallet(userId);
      
      // Get wallet balance
      const balance = await getWalletBalance(userId);
      setWalletBalance(balance);
      
      // Load wallet transactions from Firebase (all transactions are now stored here)
      const walletTransactions = await getWalletTransactions(userId, 100);
        
      // Sort transactions by date (newest first)
      walletTransactions.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateB - dateA;
      });
      
      setTransactions(walletTransactions);
      setFilteredTransactions(walletTransactions);
      
      // Load cash out requests for this user
      try {
        const { getUserCashOutRequests } = await import('@/pages/Admin/services/cashOutService');
        const requests = await getUserCashOutRequests(userId);
        setCashOutRequests(requests);
      } catch (error) {
        console.error('Error loading cash out requests:', error);
        // Don't show error toast for this, just log it
      }
      
    } catch (error) {
      console.error('Error loading wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
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

  const handleCashInSuccess = async (details) => {
    if (!user) return;
    
    setIsProcessingCashIn(true);
    try {
      const amount = parseFloat(cashInAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Invalid amount');
        setIsProcessingCashIn(false);
        return;
      }

      const transactionId = details.id || details.purchase_units[0]?.payments?.captures[0]?.id || `PP_${Date.now()}`;
      const payerEmail = details.payer?.email_address || paypalEmail || '';
      
      await cashInFromPayPal(user.uid, amount, transactionId, payerEmail);
      
      toast.success(`Successfully added ₱${amount.toLocaleString()} to your GetPay wallet!`);
      setShowCashInModal(false);
      setCashInAmount('');
      
      // Update PayPal email if it was set from PayPal payment and not already connected
      if (payerEmail && !paypalConnected) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const paymentData = userData.payment || {};
            // Auto-connect PayPal if payment was successful and email matches
            if (payerEmail && (!paymentData.paypalEmail || paymentData.paypalEmail === payerEmail)) {
              await updateDoc(userRef, {
                payment: {
                  ...paymentData,
                  paypalEmail: payerEmail,
                  paypalStatus: 'connected',
                  paypalConnectedAt: serverTimestamp(),
                  method: 'paypal'
                }
              });
              setPaypalEmail(payerEmail);
              setPaypalConnected(true);
              toast.success('PayPal account automatically connected!');
            }
          }
        } catch (error) {
          console.error('Error updating PayPal connection:', error);
          // Don't fail the cash-in if PayPal connection update fails
        }
      }
      
      // Reload wallet data
      await loadWalletData(user.uid);
    } catch (error) {
      console.error('Error processing cash-in:', error);
      toast.error(error.message || 'Failed to process cash-in');
    } finally {
      setIsProcessingCashIn(false);
    }
  };

  const handleCashInError = (error) => {
    console.error('PayPal cash-in error:', error);
    
    // Check for specific PayPal errors
    const errorMessage = error?.message || error?.toString() || '';
    const errorDetails = error?.details || [];
    
    // Check if error is about seller/buyer account conflict
    const lowerMessage = errorMessage.toLowerCase();
    const isSellerAccountError = error?.sellerAccountError || 
        lowerMessage.includes('seller') || 
        lowerMessage.includes('logging into the account of the seller') ||
        lowerMessage.includes('change your login information') ||
        lowerMessage.includes('cannot pay yourself') ||
        errorDetails.some(detail => {
          const issue = detail?.issue?.toLowerCase() || '';
          const desc = detail?.description?.toLowerCase() || '';
          return issue.includes('seller') || 
                 desc.includes('seller') || 
                 desc.includes('logging into the account');
        });
    
    if (isSellerAccountError) {
      // Use user-friendly message if provided, otherwise use default
      const message = error?.userFriendlyMessage || 
        'Payment Error: The PayPal account you\'re using is the same as the merchant account. Please use a different PayPal account for cash-in, or contact support if you need assistance.';
      toast.error(message, { duration: 12000 });
    } else if (error?.cancelled) {
      toast.info('Payment was cancelled.');
      } else {
      toast.error('PayPal payment failed. Please try again. If the issue persists, contact support.');
    }
    
    setIsProcessingCashIn(false);
  };

  const handleCashOut = async () => {
    if (!user) return;
          
    const amount = parseFloat(cashOutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
        }
        
    // Use connected PayPal email if available, otherwise use entered email
    const emailToUse = paypalConnected && paypalEmail ? paypalEmail : cashOutPayPalEmail;
    
    if (!emailToUse || !emailToUse.includes('@')) {
      toast.error('Please connect your PayPal account or enter a valid PayPal email address');
      return;
    }

    setIsProcessingCashOut(true);
    try {
      const result = await cashOutToPayPal(user.uid, amount, emailToUse);
      
      toast.success(result.message || `Cash-out request submitted! ₱${amount.toLocaleString()} is pending admin approval. Your wallet balance will be deducted only after admin approves your request.`);
      setShowCashOutModal(false);
      setCashOutAmount('');
      setUseDifferentEmail(false);
      // Reset to connected email if available
      if (paypalConnected && paypalEmail) {
        setCashOutPayPalEmail(paypalEmail);
      }
      
      // Reload wallet data
      await loadWalletData(user.uid);
    } catch (error) {
      console.error('Error processing cash-out:', error);
      toast.error(error.message || 'Failed to process cash-out request');
    } finally {
      setIsProcessingCashOut(false);
    }
  };

  useEffect(() => {
    let filtered = [...transactions];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      if (filterType === 'income') {
        filtered = filtered.filter(t => t.type === 'credit' || t.type === 'cash_in');
      } else if (filterType === 'expense') {
        filtered = filtered.filter(t => t.type === 'payment' || t.type === 'deduct' || t.type === 'cash_out');
      }
    }
    
    // Apply date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(t => {
        if (!t.date) return false;
        const transactionDate = t.date instanceof Date ? t.date : new Date(t.date);
        // Reset time to start of day for accurate comparison
        transactionDate.setHours(0, 0, 0, 0);
        
        if (dateRange.from && dateRange.to) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return transactionDate >= fromDate && transactionDate <= toDate;
        } else if (dateRange.from) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          return transactionDate >= fromDate;
        } else if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return transactionDate <= toDate;
        }
        return true;
      });
    }
    
    setFilteredTransactions(filtered);
  }, [searchTerm, filterType, transactions, dateRange]);

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
        return 'text-primary bg-primary/10';
      case 'pending':
        return 'text-primary bg-primary/10';
      case 'cancelled':
        return 'text-primary bg-primary/10';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTransactionTypeLabel = (type) => {
    switch (type) {
      case 'cash_in':
        return 'Cash In';
      case 'cash_out':
        return 'Cash Out';
      case 'payment':
        return 'Payment';
      case 'credit':
        return 'Credit';
      case 'deduct':
        return 'Deduct';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-36">
          <Loading message="Loading wallet..." />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'PHP' }}>
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
        <main className="max-w-6xl mx-auto px-4 pt-24 pb-8 md:pt-32 md:pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">GetPay</h1>
              <p className="text-gray-600">
                  Your Getaways e-wallet. Cash in from PayPal to add credits and use them for bookings and subscriptions.
              </p>
            </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCashOutModal(true)}
                  disabled={walletBalance <= 0}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowUpRight className="w-5 h-5" />
                  Cash Out
                </button>
                <button
                  onClick={() => setShowCashInModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Cash In
                </button>
            </div>
          </div>
        </div>

        {/* Balance Card */}
          <div className="bg-primary rounded-xl shadow-lg p-6 md:p-8 mb-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8" />
              <div>
                <p className="text-white/80 text-sm">
                    {userRoles.includes('admin') ? 'GetPay Balance (Getaways Transactions Only)' : 'GetPay Balance'}
                </p>
                  <p className="text-3xl md:text-4xl font-bold">{formatCurrency(walletBalance)}</p>
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
          
            {/* Admin Account Info */}
            {userRoles.includes('admin') && (
            <div className="mt-4 pt-4 border-t border-white/20">
                {merchantPayPalEmail && (
                  <p className="text-white/80 text-xs">
                    Merchant Account: <strong>{merchantPayPalEmail}</strong>
                  </p>
                )}
            </div>
          )}
          
            {/* Non-Admin PayPal Connection Status */}
            {!userRoles.includes('admin') && (
              <>
                {paypalConnected && paypalEmail && (
            <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-white/90" />
                      <p className="text-white/90 text-sm font-medium">
                        PayPal Account Connected
                      </p>
                    </div>
                    <p className="text-white font-medium">{paypalEmail}</p>
                    <p className="text-white/80 text-xs mt-1">
                      This account will be used automatically for cash in and cash out transactions
              </p>
              <button
                onClick={() => navigate('/accountsettings')}
                      className="text-xs underline hover:text-white/90 mt-2"
              >
                      Manage PayPal account
              </button>
            </div>
          )}
                
                {!paypalConnected && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-white/90" />
                      <p className="text-white/90 text-sm font-medium">
                        PayPal Account Not Connected
                  </p>
                </div>
                    <p className="text-white/80 text-xs mb-2">
                      Connect your PayPal account to enable cash in and cash out
                    </p>
                    <button
                      onClick={() => navigate('/accountsettings?tab=profile')}
                      className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Connect PayPal Account
                    </button>
            </div>
                )}
              </>
            )}
          </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col gap-4">
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
              
              {/* Date Range Picker Button */}
              <div className="relative" ref={datePickerRef}>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                    dateRange.from || dateRange.to
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  {dateRange.from && dateRange.to
                    ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                    : dateRange.from
                    ? `From ${format(dateRange.from, 'MMM dd')}`
                    : 'Date Range'}
                  {(dateRange.from || dateRange.to) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateRange({ from: undefined, to: undefined });
                      }}
                      className="ml-2 hover:bg-primary/20 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </button>

                {/* Date Picker Dropdown */}
                {showDatePicker && (
                  <div className="absolute top-full right-0 md:right-0 left-0 md:left-auto mt-2 bg-white border border-gray-300 rounded-xl shadow-xl z-50 p-4" style={{ minWidth: '300px', maxWidth: '100%' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Select Date Range</h3>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range || { from: undefined, to: undefined });
                      }}
                      numberOfMonths={1}
                      showOutsideDays={true}
                      defaultMonth={dateRange.from || new Date()}
                      month={currentMonth}
                      onMonthChange={setCurrentMonth}
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
                          setDateRange({ from: undefined, to: undefined });
                        }}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(false)}
                        className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
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
                      ? 'bg-primary/20 text-primary'
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
                      ? 'bg-primary/20 text-primary'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Expenses
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Out Requests Section */}
        {cashOutRequests.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6 border-2 border-primary/20">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-primary" />
                    Cash Out Requests Status
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {cashOutRequests.length} request{cashOutRequests.length !== 1 ? 's' : ''} • 
                    {' '}
                    {cashOutRequests.filter(r => r.status === 'pending').length > 0 && (
                      <span className="text-yellow-600 font-medium">
                        {cashOutRequests.filter(r => r.status === 'pending').length} pending
                      </span>
                    )}
                    {cashOutRequests.filter(r => r.status === 'pending').length > 0 && 
                     (cashOutRequests.filter(r => r.status === 'approved').length > 0 || 
                      cashOutRequests.filter(r => r.status === 'rejected').length > 0) && ', '}
                    {cashOutRequests.filter(r => r.status === 'approved').length > 0 && (
                      <span className="text-green-600 font-medium">
                        {cashOutRequests.filter(r => r.status === 'approved').length} approved
                      </span>
                    )}
                    {cashOutRequests.filter(r => r.status === 'approved').length > 0 && 
                     cashOutRequests.filter(r => r.status === 'rejected').length > 0 && ', '}
                    {cashOutRequests.filter(r => r.status === 'rejected').length > 0 && (
                      <span className="text-red-600 font-medium">
                        {cashOutRequests.filter(r => r.status === 'rejected').length} rejected
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowCashOutRequests(!showCashOutRequests)}
                  className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  {showCashOutRequests ? 'Hide' : 'Show'} Requests
                </button>
              </div>
            </div>
            
            {showCashOutRequests && (
              <div className="divide-y divide-gray-200">
                {cashOutRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      request.status === 'rejected' ? 'bg-red-50/50' :
                      request.status === 'approved' ? 'bg-green-50/50' :
                      'bg-yellow-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            request.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-300' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-300' :
                            'bg-yellow-100 text-yellow-700 border border-yellow-300'
                          }`}>
                            {request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
                          </span>
                          <span className="text-lg font-semibold text-gray-900">
                            ₱{request.amount?.toLocaleString() || '0'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>PayPal:</strong> {request.paypalEmail || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 mb-2">
                          Requested: {request.createdAt ? formatDate(request.createdAt) : 'N/A'}
                          {request.reviewedAt && (
                            <> • Reviewed: {formatDate(request.reviewedAt)}</>
                          )}
                        </p>
                        {request.status === 'rejected' && request.adminNotes && (
                          <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                            <p className="text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Rejection Reason:
                            </p>
                            <p className="text-sm text-red-800">{request.adminNotes}</p>
                          </div>
                        )}
                        {request.status === 'approved' && request.adminNotes && (
                          <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-lg">
                            <p className="text-xs font-semibold text-green-900 mb-1 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Admin Note:
                            </p>
                            <p className="text-sm text-green-800">{request.adminNotes}</p>
                          </div>
                        )}
                        {request.status === 'pending' && (
                          <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                            <p className="text-xs text-yellow-800 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Your request is pending admin approval. Your wallet balance will be deducted once approved.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                {searchTerm || filterType !== 'all' || dateRange.from || dateRange.to
                  ? 'Try adjusting your filters' 
                  : 'Your transaction history will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => {
                  const isIncome = transaction.type === 'credit' || transaction.type === 'cash_in';
                  const isCashOut = transaction.type === 'cash_out';
                  return (
                <div
                  key={transaction.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Icon */}
                      <div className={`p-3 rounded-lg ${
                            isIncome 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-primary/20 text-primary'
                      }`}>
                            {isIncome ? (
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
                            <CalendarIcon className="w-3 h-3" />
                            {formatDate(transaction.date)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                              <span className="text-xs text-gray-500 capitalize">
                                {getTransactionTypeLabel(transaction.type)}
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
                              isIncome ? 'text-primary' : 'text-primary'
                        }`}>
                              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                            {isCashOut && transaction.paypalEmail && (
                              <p className="text-xs text-gray-500 mt-1">
                                To: {transaction.paypalEmail}
                              </p>
                            )}
                            {transaction.paypalTransactionId && !isCashOut && (
                          <button
                            onClick={() => {
                                  navigator.clipboard.writeText(transaction.paypalTransactionId);
                              toast.success('Transaction ID copied');
                            }}
                            className="text-xs text-gray-500 hover:text-primary mt-1 flex items-center gap-1"
                          >
                                <span className="font-mono">{transaction.paypalTransactionId.substring(0, 8)}...</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                            {isCashOut && transaction.paypalTransactionId && (
                              <p className="text-xs text-gray-500 mt-1">
                                ID: {transaction.paypalTransactionId.substring(0, 12)}...
                              </p>
                            )}
                      </div>
                    </div>
                  </div>
                </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Info Note */}
        <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
          <p className="text-sm text-primary mb-2">
              <strong>About GetPay:</strong> GetPay is your dedicated e-wallet for Getaways. Cash in from PayPal to add credits, then use your GetPay balance for bookings, subscriptions, and other Getaways services.
          </p>
            <div className="grid md:grid-cols-2 gap-4 mt-3">
          <p className="text-sm text-primary/90">
                <strong>Cash In:</strong> Click the "Cash In" button above to add money to your GetPay wallet from your PayPal account.
                {userRoles.includes('admin') && (
                  <span className="block mt-1 text-xs text-primary/80">
                    (Admin: Your wallet balance reflects Getaways transactions only, not all PayPal transactions)
                  </span>
                )}
              </p>
              <p className="text-sm text-primary/90">
                <strong>Cash Out:</strong> Click the "Cash Out" button to withdraw money from your GetPay wallet to your PayPal account. 
                {userRoles.includes('admin') ? (
                  <span className="block mt-1 text-xs text-primary/80">
                    (Admin: Cash-out requests are processed manually)
                  </span>
                ) : (
                  <span className="block mt-1 text-xs text-primary/80">
                    Cash-out requests are processed manually by admin within 1-3 business days.
                  </span>
                )}
          </p>
            </div>
          {userRoles.includes('admin') && (
              <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-sm text-primary font-medium mb-2">
                  ⚠️ Admin Account - Important Note:
                </p>
                <p className="text-xs text-primary/90">
                  Your GetPay wallet balance is calculated from <strong>Getaways platform transactions only</strong> (guest bookings, host subscriptions). 
                  It does NOT reflect all transactions in your merchant PayPal account. 
                  External PayPal transactions (payments received outside of Getaways) are not included in this balance.
            </p>
              </div>
          )}
        </div>
      </main>

      <Footer />

        {/* Cash In Modal */}
        {showCashInModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Cash In to GetPay</h2>
                  <button
                    onClick={() => {
                      setShowCashInModal(false);
                      setCashInAmount('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (PHP)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={cashInAmount}
                    onChange={(e) => setCashInAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={isProcessingCashIn}
                  />
                  {cashInAmount && !isNaN(parseFloat(cashInAmount)) && parseFloat(cashInAmount) > 0 && (
                    <p className="mt-2 text-sm text-gray-600">
                      You will add: <strong>{formatCurrency(parseFloat(cashInAmount))}</strong> to your GetPay wallet
                    </p>
                  )}
                </div>

                {cashInAmount && !isNaN(parseFloat(cashInAmount)) && parseFloat(cashInAmount) > 0 && HAS_VALID_PAYPAL_CLIENT_ID ? (
                  <>
                    <PayPalCashInButton
                      amount={parseFloat(cashInAmount)}
                      onSuccess={handleCashInSuccess}
                      onError={handleCashInError}
                      disabled={isProcessingCashIn}
                    />
                  </>
                ) : (
                  <div className="text-center py-4">
                    {!HAS_VALID_PAYPAL_CLIENT_ID ? (
                      <p className="text-sm text-primary">
                        PayPal is not configured. Please contact support.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Enter an amount to proceed with cash-in
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cash Out Modal */}
        {showCashOutModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Cash Out to PayPal</h2>
                  <button
                    onClick={() => {
                      setShowCashOutModal(false);
                      setCashOutAmount('');
                      setUseDifferentEmail(false);
                      // Reset to connected email if available
                      if (paypalConnected && paypalEmail) {
                        setCashOutPayPalEmail(paypalEmail);
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (PHP)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="0.01"
                    value={cashOutAmount}
                    onChange={(e) => setCashOutAmount(e.target.value)}
                    placeholder="Minimum: ₱100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={isProcessingCashOut}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum cash-out amount: ₱100
                  </p>
                  {cashOutAmount && !isNaN(parseFloat(cashOutAmount)) && parseFloat(cashOutAmount) > 0 && (
                    <p className="mt-2 text-sm text-gray-600">
                      Available balance: <strong>{formatCurrency(walletBalance)}</strong>
                    </p>
                  )}
                  {cashOutAmount && !isNaN(parseFloat(cashOutAmount)) && parseFloat(cashOutAmount) > walletBalance && (
                    <p className="mt-2 text-sm text-primary">
                      Insufficient balance. You have {formatCurrency(walletBalance)} but need {formatCurrency(parseFloat(cashOutAmount))}
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PayPal Email Address
                  </label>
                  {paypalConnected && paypalEmail && !useDifferentEmail ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Using Connected Account</p>
                          <p className="text-xs text-gray-600">{paypalEmail}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Money will be sent to your connected PayPal account. 
                        <button
                          type="button"
                          onClick={() => {
                            setUseDifferentEmail(true);
                            setCashOutPayPalEmail('');
                          }}
                          className="text-primary hover:underline ml-1 font-medium"
                        >
                          Use different email
                        </button>
                      </p>
                    </div>
                  ) : (
                    <>
                      <input
                        type="email"
                        value={cashOutPayPalEmail}
                        onChange={(e) => setCashOutPayPalEmail(e.target.value)}
                        placeholder="your-email@example.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={isProcessingCashOut}
                      />
                      {paypalConnected && paypalEmail && useDifferentEmail && (
                        <button
                          type="button"
                          onClick={() => {
                            setUseDifferentEmail(false);
                            setCashOutPayPalEmail(paypalEmail);
                          }}
                          className="mt-2 text-xs text-primary hover:underline"
                        >
                          Use connected account ({paypalEmail}) instead
                        </button>
                      )}
                      {!paypalConnected && (
                        <p className="mt-1 text-xs text-gray-500">
                          Enter the PayPal email address where you want to receive the money
                        </p>
                      )}
                      {!paypalConnected && (
                        <p className="mt-2 text-xs text-primary">
                          <button
                            type="button"
                            onClick={() => {
                              setShowCashOutModal(false);
                              navigate('/accountsettings?tab=profile');
                            }}
                            className="underline hover:text-primary/90"
                          >
                            Connect your PayPal account
                          </button>
                          {' '}to use it automatically for future transactions
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
                  <p className="text-sm text-primary">
                    <strong>Important:</strong> Cash-out requests are processed manually by admin. 
                    The amount will be deducted from your wallet immediately and sent to your PayPal account within 1-3 business days.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCashOutModal(false);
                      setCashOutAmount('');
                      setUseDifferentEmail(false);
                      // Reset to connected email if available
                      if (paypalConnected && paypalEmail) {
                        setCashOutPayPalEmail(paypalEmail);
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={isProcessingCashOut}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCashOut}
                    disabled={
                      isProcessingCashOut ||
                      !cashOutAmount ||
                      isNaN(parseFloat(cashOutAmount)) ||
                      parseFloat(cashOutAmount) < 100 ||
                      parseFloat(cashOutAmount) > walletBalance ||
                      (!paypalConnected || useDifferentEmail) && (!cashOutPayPalEmail || !cashOutPayPalEmail.includes('@'))
                    }
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingCashOut ? 'Processing...' : 'Cash Out'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PayPalScriptProvider>
  );
};

export default EWallet;
