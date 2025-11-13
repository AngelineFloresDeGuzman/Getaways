// Report Generation Service for Admin
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore';

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects
 * @param {Array} headers - Array of header objects {key, label}
 * @returns {string} CSV string
 */
const convertToCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return headers.map(h => h.label).join(',') + '\n';
  }

  // Create header row
  const headerRow = headers.map(h => `"${h.label}"`).join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(h => {
      const value = row[h.key];
      // Handle null/undefined
      if (value === null || value === undefined) return '""';
      // Handle dates
      if (value instanceof Date) {
        return `"${value.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}"`;
      }
      // Handle objects/arrays
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

/**
 * Download CSV file
 * @param {string} csvContent - CSV string content
 * @param {string} filename - Filename for download
 */
const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Generate comprehensive report
 * @returns {Promise<Object>}
 */
export const generateComprehensiveReport = async () => {
  try {
    // Load all data
    const [users, listings, bookings, reviews] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(query(collection(db, 'listings'), where('status', '==', 'active'))),
      getDocs(collection(db, 'bookings')),
      getDocs(collection(db, 'reviews'))
    ]);

    const reportData = {
      summary: {
        totalUsers: users.size,
        activeListings: listings.size,
        totalBookings: bookings.size,
        totalReviews: reviews.size,
        generatedAt: new Date().toISOString()
      },
      users: users.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })),
      listings: listings.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })),
      bookings: bookings.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })),
      reviews: reviews.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };

    return reportData;
  } catch (error) {
    console.error('Error generating comprehensive report:', error);
    throw error;
  }
};

/**
 * Generate bookings report
 * @returns {Promise<Array>}
 */
export const generateBookingsReport = async () => {
  try {
    const bookingsSnapshot = await getDocs(
      query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))
    );

    const bookingsData = [];
    
    for (const bookingDoc of bookingsSnapshot.docs) {
      const booking = bookingDoc.data();
      
      // Get guest and host info
      const [guestDoc, hostDoc, listingDoc] = await Promise.all([
        getDoc(doc(db, 'users', booking.guestId)),
        getDoc(doc(db, 'users', booking.ownerId)),
        getDoc(doc(db, 'listings', booking.listingId))
      ]);

      const guestData = guestDoc.exists() ? guestDoc.data() : {};
      const hostData = hostDoc.exists() ? hostDoc.data() : {};
      const listingData = listingDoc.exists() ? listingDoc.data() : {};

      bookingsData.push({
        bookingId: bookingDoc.id,
        status: booking.status || 'N/A',
        guestName: `${guestData.firstName || ''} ${guestData.lastName || ''}`.trim() || guestData.email || 'Unknown',
        guestEmail: guestData.email || 'N/A',
        hostName: `${hostData.firstName || ''} ${hostData.lastName || ''}`.trim() || hostData.email || 'Unknown',
        hostEmail: hostData.email || 'N/A',
        listingTitle: listingData.title || 'Unknown',
        listingCategory: listingData.category || 'N/A',
        checkIn: booking.checkIn?.toDate ? booking.checkIn.toDate() : null,
        checkOut: booking.checkOut?.toDate ? booking.checkOut.toDate() : null,
        totalPrice: booking.totalPrice || 0,
        bookingAmount: booking.bookingAmount || 0,
        guestFee: booking.guestFee || 0,
        createdAt: booking.createdAt?.toDate ? booking.createdAt.toDate() : null,
        paymentStatus: booking.paymentStatus || 'N/A',
        isPaid: booking.isPaid || false
      });
    }

    return bookingsData;
  } catch (error) {
    console.error('Error generating bookings report:', error);
    throw error;
  }
};

/**
 * Generate service fees report
 * @returns {Promise<Array>}
 */
export const generateServiceFeesReport = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const hostsData = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest'];

      if (roles.includes('host')) {
        // Get host's bookings
        const bookingsSnapshot = await getDocs(
          query(collection(db, 'bookings'), where('ownerId', '==', userDoc.id))
        );

        let totalEarnings = 0;
        let totalBookings = 0;

        bookingsSnapshot.forEach(bookingDoc => {
          const booking = bookingDoc.data();
          if (booking.status === 'confirmed' || booking.status === 'completed') {
            totalEarnings += booking.bookingAmount || booking.totalPrice || 0;
            totalBookings++;
          }
        });

        const serviceFee = Math.round((totalEarnings * 0.10) * 100) / 100; // 10% commission

        hostsData.push({
          hostId: userDoc.id,
          hostName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Unknown',
          hostEmail: userData.email || 'N/A',
          totalBookings,
          totalEarnings,
          serviceFee,
          serviceFeePercentage: '10%'
        });
      }
    }

    return hostsData;
  } catch (error) {
    console.error('Error generating service fees report:', error);
    throw error;
  }
};

/**
 * Generate payments report
 * @returns {Promise<Array>}
 */
export const generatePaymentsReport = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const paymentsData = [];

    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data();
      const paymentData = userData.payment || {};

      if (paymentData.status === 'active' || paymentData.lastPayPalTransactionId) {
        paymentsData.push({
          userId: userDoc.id,
          userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Unknown',
          email: userData.email || 'N/A',
          paymentType: paymentData.type || 'N/A',
          paymentStatus: paymentData.status || 'N/A',
          transactionId: paymentData.lastPayPalTransactionId || 'N/A',
          lastPaymentDate: paymentData.lastPaymentDate?.toDate ? paymentData.lastPaymentDate.toDate() : null,
          paypalEmail: paymentData.paypalEmail || paymentData.lastPayPalPayerEmail || 'N/A',
          paypalAccountName: paymentData.paypalAccountName || 'N/A'
        });
      }
    });

    return paymentsData;
  } catch (error) {
    console.error('Error generating payments report:', error);
    throw error;
  }
};

/**
 * Generate analytics report
 * @returns {Promise<Object>}
 */
export const generateAnalyticsReport = async () => {
  try {
    const [reviewsSnapshot, bookingsSnapshot, listingsSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'reviews'), orderBy('rating', 'desc'))),
      getDocs(collection(db, 'bookings')),
      getDocs(query(collection(db, 'listings'), where('status', '==', 'active')))
    ]);

    const reviews = reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const bookings = bookingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const listings = listingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate statistics
    const totalReviews = reviews.length;
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

    const bestReviews = reviews
      .filter(r => r.rating >= 4)
      .slice(0, 20)
      .map(r => ({
        reviewId: r.id,
        reviewerName: r.reviewerName || 'Anonymous',
        listingTitle: r.listingTitle || 'N/A',
        rating: r.rating || 0,
        comment: r.comment || '',
        createdAt: r.createdAt?.toDate ? r.createdAt.toDate() : null
      }));

    const lowestReviews = reviews
      .filter(r => r.rating <= 2)
      .slice(0, 20)
      .map(r => ({
        reviewId: r.id,
        reviewerName: r.reviewerName || 'Anonymous',
        listingTitle: r.listingTitle || 'N/A',
        rating: r.rating || 0,
        comment: r.comment || '',
        createdAt: r.createdAt?.toDate ? r.createdAt.toDate() : null
      }));

    // Booking statistics
    const bookingStats = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    };

    return {
      reviews: {
        total: totalReviews,
        averageRating: Math.round(averageRating * 100) / 100,
        bestReviews,
        lowestReviews
      },
      bookings: bookingStats,
      listings: {
        total: listings.length,
        byCategory: listings.reduce((acc, l) => {
          const cat = l.category || 'unknown';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {})
      },
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating analytics report:', error);
    throw error;
  }
};

/**
 * Generate compliance/violations report
 * @returns {Promise<Array>}
 */
export const generateComplianceReport = async () => {
  try {
    const [bookingsSnapshot, reviewsSnapshot] = await Promise.all([
      getDocs(collection(db, 'bookings')),
      getDocs(collection(db, 'reviews'))
    ]);

    const violations = [];

    // Check for host cancellations (violations)
    bookingsSnapshot.forEach(bookingDoc => {
      const booking = bookingDoc.data();
      if (booking.status === 'cancelled' && booking.cancelledBy === 'host') {
        violations.push({
          type: 'Host Cancellation',
          bookingId: bookingDoc.id,
          listingId: booking.listingId,
          guestId: booking.guestId,
          hostId: booking.ownerId,
          cancelledAt: booking.cancelledAt?.toDate ? booking.cancelledAt.toDate() : null,
          reason: booking.cancellationReason || 'No reason provided'
        });
      }
    });

    // Check for low ratings (potential issues)
    reviewsSnapshot.forEach(reviewDoc => {
      const review = reviewDoc.data();
      if (review.rating <= 2) {
        violations.push({
          type: 'Low Rating',
          reviewId: reviewDoc.id,
          listingId: review.listingId,
          rating: review.rating,
          comment: review.comment || '',
          reviewerName: review.reviewerName || 'Anonymous',
          createdAt: review.createdAt?.toDate ? review.createdAt.toDate() : null
        });
      }
    });

    return violations;
  } catch (error) {
    console.error('Error generating compliance report:', error);
    throw error;
  }
};

/**
 * Export data to CSV
 * @param {Array} data - Data array
 * @param {Array} headers - Headers array [{key, label}]
 * @param {string} filename - Filename for download
 */
export const exportToCSV = (data, headers, filename) => {
  const csvContent = convertToCSV(data, headers);
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = `${filename}_${timestamp}.csv`;
  downloadCSV(csvContent, finalFilename);
};

/**
 * Main report generation function
 * @param {string} reportType - Type of report to generate
 * @returns {Promise<void>}
 */
export const generateReport = async (reportType) => {
  try {
    let data, headers, filename;

    switch (reportType) {
      case 'comprehensive':
        const comprehensiveData = await generateComprehensiveReport();
        // Export summary
        exportToCSV(
          [comprehensiveData.summary],
          [
            { key: 'totalUsers', label: 'Total Users' },
            { key: 'activeListings', label: 'Active Listings' },
            { key: 'totalBookings', label: 'Total Bookings' },
            { key: 'totalReviews', label: 'Total Reviews' },
            { key: 'generatedAt', label: 'Generated At' }
          ],
          'comprehensive_summary'
        );
        // Export bookings
        if (comprehensiveData.bookings.length > 0) {
          exportToCSV(
            comprehensiveData.bookings,
            [
              { key: 'id', label: 'Booking ID' },
              { key: 'status', label: 'Status' },
              { key: 'totalPrice', label: 'Total Price' },
              { key: 'createdAt', label: 'Created At' }
            ],
            'comprehensive_bookings'
          );
        }
        return;

      case 'bookings':
        data = await generateBookingsReport();
        headers = [
          { key: 'bookingId', label: 'Booking ID' },
          { key: 'status', label: 'Status' },
          { key: 'guestName', label: 'Guest Name' },
          { key: 'guestEmail', label: 'Guest Email' },
          { key: 'hostName', label: 'Host Name' },
          { key: 'hostEmail', label: 'Host Email' },
          { key: 'listingTitle', label: 'Listing Title' },
          { key: 'listingCategory', label: 'Category' },
          { key: 'checkIn', label: 'Check In' },
          { key: 'checkOut', label: 'Check Out' },
          { key: 'totalPrice', label: 'Total Price' },
          { key: 'bookingAmount', label: 'Booking Amount' },
          { key: 'guestFee', label: 'Guest Fee' },
          { key: 'paymentStatus', label: 'Payment Status' },
          { key: 'isPaid', label: 'Is Paid' },
          { key: 'createdAt', label: 'Created At' }
        ];
        filename = 'bookings_report';
        break;

      case 'service-fees':
        data = await generateServiceFeesReport();
        headers = [
          { key: 'hostId', label: 'Host ID' },
          { key: 'hostName', label: 'Host Name' },
          { key: 'hostEmail', label: 'Host Email' },
          { key: 'totalBookings', label: 'Total Bookings' },
          { key: 'totalEarnings', label: 'Total Earnings' },
          { key: 'serviceFee', label: 'Commission (10%)' },
          { key: 'serviceFeePercentage', label: 'Service Fee %' }
        ];
        filename = 'service_fees_report';
        break;

      case 'payments':
        data = await generatePaymentsReport();
        headers = [
          { key: 'userId', label: 'User ID' },
          { key: 'userName', label: 'User Name' },
          { key: 'email', label: 'Email' },
          { key: 'paymentType', label: 'Payment Type' },
          { key: 'paymentStatus', label: 'Payment Status' },
          { key: 'transactionId', label: 'Transaction ID' },
          { key: 'lastPaymentDate', label: 'Last Payment Date' },
          { key: 'paypalEmail', label: 'PayPal Email' },
          { key: 'paypalAccountName', label: 'PayPal Account Name' }
        ];
        filename = 'payments_report';
        break;

      case 'analytics':
        const analyticsData = await generateAnalyticsReport();
        // Export review analytics
        exportToCSV(
          [analyticsData.reviews],
          [
            { key: 'total', label: 'Total Reviews' },
            { key: 'averageRating', label: 'Average Rating' },
            { key: 'generatedAt', label: 'Generated At' }
          ],
          'analytics_reviews_summary'
        );
        // Export best reviews
        if (analyticsData.reviews.bestReviews.length > 0) {
          exportToCSV(
            analyticsData.reviews.bestReviews,
            [
              { key: 'reviewId', label: 'Review ID' },
              { key: 'reviewerName', label: 'Reviewer Name' },
              { key: 'listingTitle', label: 'Listing Title' },
              { key: 'rating', label: 'Rating' },
              { key: 'comment', label: 'Comment' },
              { key: 'createdAt', label: 'Created At' }
            ],
            'analytics_best_reviews'
          );
        }
        // Export lowest reviews
        if (analyticsData.reviews.lowestReviews.length > 0) {
          exportToCSV(
            analyticsData.reviews.lowestReviews,
            [
              { key: 'reviewId', label: 'Review ID' },
              { key: 'reviewerName', label: 'Reviewer Name' },
              { key: 'listingTitle', label: 'Listing Title' },
              { key: 'rating', label: 'Rating' },
              { key: 'comment', label: 'Comment' },
              { key: 'createdAt', label: 'Created At' }
            ],
            'analytics_lowest_reviews'
          );
        }
        // Export booking stats
        exportToCSV(
          [analyticsData.bookings],
          [
            { key: 'total', label: 'Total Bookings' },
            { key: 'pending', label: 'Pending' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' }
          ],
          'analytics_booking_stats'
        );
        return;

      case 'compliance':
      case 'violations':
        data = await generateComplianceReport();
        headers = [
          { key: 'type', label: 'Violation Type' },
          { key: 'bookingId', label: 'Booking ID' },
          { key: 'reviewId', label: 'Review ID' },
          { key: 'listingId', label: 'Listing ID' },
          { key: 'guestId', label: 'Guest ID' },
          { key: 'hostId', label: 'Host ID' },
          { key: 'rating', label: 'Rating' },
          { key: 'comment', label: 'Comment' },
          { key: 'reviewerName', label: 'Reviewer Name' },
          { key: 'reason', label: 'Reason' },
          { key: 'cancelledAt', label: 'Cancelled At' },
          { key: 'createdAt', label: 'Created At' }
        ];
        filename = reportType === 'compliance' ? 'compliance_report' : 'violations_report';
        break;

      case 'financial':
        // Financial report combines service fees and payments
        const [serviceFeesData, paymentsData] = await Promise.all([
          generateServiceFeesReport(),
          generatePaymentsReport()
        ]);
        
        // Export service fees
        exportToCSV(
          serviceFeesData,
          [
            { key: 'hostId', label: 'Host ID' },
            { key: 'hostName', label: 'Host Name' },
            { key: 'hostEmail', label: 'Host Email' },
            { key: 'totalBookings', label: 'Total Bookings' },
            { key: 'totalEarnings', label: 'Total Earnings' },
            { key: 'serviceFee', label: 'Service Fee (3.3%)' }
          ],
          'financial_service_fees'
        );
        
        // Export payments
        if (paymentsData.length > 0) {
          exportToCSV(
            paymentsData,
            [
              { key: 'userId', label: 'User ID' },
              { key: 'userName', label: 'User Name' },
              { key: 'email', label: 'Email' },
              { key: 'paymentType', label: 'Payment Type' },
              { key: 'paymentStatus', label: 'Payment Status' },
              { key: 'transactionId', label: 'Transaction ID' },
              { key: 'lastPaymentDate', label: 'Last Payment Date' }
            ],
            'financial_payments'
          );
        }
        return;

      case 'users':
        const usersSnapshot = await getDocs(collection(db, 'users'));
        data = usersSnapshot.docs.map(doc => {
          const userData = doc.data();
          const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest'];
          return {
            userId: doc.id,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || 'N/A',
            roles: roles.join(', '),
            emailVerified: userData.emailVerified || false,
            createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : null,
            lastLogin: userData.lastLogin?.toDate ? userData.lastLogin.toDate() : null
          };
        });
        headers = [
          { key: 'userId', label: 'User ID' },
          { key: 'firstName', label: 'First Name' },
          { key: 'lastName', label: 'Last Name' },
          { key: 'email', label: 'Email' },
          { key: 'roles', label: 'Roles' },
          { key: 'emailVerified', label: 'Email Verified' },
          { key: 'createdAt', label: 'Created At' },
          { key: 'lastLogin', label: 'Last Login' }
        ];
        filename = 'users_report';
        break;

      case 'reviews':
        const reviewsSnapshot = await getDocs(
          query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))
        );
        data = reviewsSnapshot.docs.map(doc => {
          const review = doc.data();
          return {
            reviewId: doc.id,
            listingId: review.listingId || 'N/A',
            listingTitle: review.listingTitle || 'N/A',
            reviewerName: review.reviewerName || 'Anonymous',
            reviewerId: review.reviewerId || 'N/A',
            rating: review.rating || 0,
            comment: review.comment || '',
            createdAt: review.createdAt?.toDate ? review.createdAt.toDate() : null
          };
        });
        headers = [
          { key: 'reviewId', label: 'Review ID' },
          { key: 'listingId', label: 'Listing ID' },
          { key: 'listingTitle', label: 'Listing Title' },
          { key: 'reviewerName', label: 'Reviewer Name' },
          { key: 'reviewerId', label: 'Reviewer ID' },
          { key: 'rating', label: 'Rating' },
          { key: 'comment', label: 'Comment' },
          { key: 'createdAt', label: 'Created At' }
        ];
        filename = 'reviews_report';
        break;

      case 'hosts':
        const hostsReportData = await generateServiceFeesReport();
        // Add additional host information
        const hostsWithDetails = await Promise.all(
          hostsReportData.map(async (host) => {
            const hostDoc = await getDoc(doc(db, 'users', host.hostId));
            const hostData = hostDoc.exists() ? hostDoc.data() : {};
            
            // Get listings count
            const listingsSnapshot = await getDocs(
              query(collection(db, 'listings'), where('ownerId', '==', host.hostId))
            );
            
            // Get reviews count and average rating
            const listings = listingsSnapshot.docs.map(d => d.id);
            let totalRating = 0;
            let reviewCount = 0;
            
            for (let i = 0; i < listings.length; i += 10) {
              const batch = listings.slice(i, i + 10);
              const reviewsSnapshot = await getDocs(
                query(collection(db, 'reviews'), where('listingId', 'in', batch))
              );
              reviewsSnapshot.forEach(reviewDoc => {
                const review = reviewDoc.data();
                totalRating += review.rating || 0;
                reviewCount++;
              });
            }
            
            return {
              ...host,
              listingsCount: listingsSnapshot.size,
              averageRating: reviewCount > 0 ? Math.round((totalRating / reviewCount) * 100) / 100 : 0,
              totalReviews: reviewCount,
              joinedDate: hostData.createdAt?.toDate ? hostData.createdAt.toDate() : null
            };
          })
        );
        
        exportToCSV(
          hostsWithDetails,
          [
            { key: 'hostId', label: 'Host ID' },
            { key: 'hostName', label: 'Host Name' },
            { key: 'hostEmail', label: 'Host Email' },
            { key: 'totalBookings', label: 'Total Bookings' },
            { key: 'totalEarnings', label: 'Total Earnings' },
            { key: 'serviceFee', label: 'Service Fee' },
            { key: 'listingsCount', label: 'Listings Count' },
            { key: 'averageRating', label: 'Average Rating' },
            { key: 'totalReviews', label: 'Total Reviews' },
            { key: 'joinedDate', label: 'Joined Date' }
          ],
          'hosts_report'
        );
        return;

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    if (data && headers && filename) {
      exportToCSV(data, headers, filename);
    }
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};

