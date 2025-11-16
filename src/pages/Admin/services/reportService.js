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

// Dynamic import for jsPDF (to avoid SSR issues)
let jsPDF = null;
let autoTable = null;

const loadPDFLibrary = async () => {
  if (!jsPDF) {
    const jsPDFModule = await import('jspdf');
    jsPDF = jsPDFModule.default;
    const autoTableModule = await import('jspdf-autotable');
    autoTable = autoTableModule.default;
  }
  return { jsPDF, autoTable };
};

/**
 * Format value for PDF display
 * @param {*} value - Value to format
 * @returns {string} Formatted string
 */
const formatValueForPDF = (value) => {
  if (value === null || value === undefined) return 'N/A';
  if (value instanceof Date) {
    return value.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

/**
 * Export data to PDF
 * @param {Array} data - Data array
 * @param {Array} headers - Headers array [{key, label}]
 * @param {string} filename - Filename for download
 * @param {string} title - Report title
 */
export const exportToPDF = async (data, headers, filename, title = 'Report') => {
  try {
    const { jsPDF: pdf, autoTable: autoTablePlugin } = await loadPDFLibrary();
    
    const doc = new pdf({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(title, 14, 15);
    
    // Add date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Generated on: ${dateStr}`, 14, 22);

    // Prepare table data
    const tableHeaders = headers.map(h => h.label);
    const tableRows = data.map(row => 
      headers.map(h => formatValueForPDF(row[h.key]))
    );

    // Add table
    autoTablePlugin(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: 28,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: [59, 130, 246], // Blue color
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      margin: { top: 28, left: 14, right: 14 }
    });

    // Save PDF
    const timestamp = new Date().toISOString().split('T')[0];
    const finalFilename = `${filename}_${timestamp}.pdf`;
    doc.save(finalFilename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
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
 * @param {Object} dateFilter - Optional date filter {startDate, endDate}
 * @returns {Promise<Array>}
 */
export const generateBookingsReport = async (dateFilter = null) => {
  try {
    // First, get all terminated host IDs
    const usersSnapshotForBookings = await getDocs(collection(db, 'users'));
    const terminatedHostIdsForBookings = new Set();
    usersSnapshotForBookings.forEach(doc => {
      const userData = doc.data();
      if (userData.isTerminated) {
        terminatedHostIdsForBookings.add(doc.id);
      }
    });
    
    const bookingsSnapshot = await getDocs(
      query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))
    );

    const bookingsData = [];
    
    for (const bookingDoc of bookingsSnapshot.docs) {
      const booking = bookingDoc.data();
      const createdAt = booking.createdAt?.toDate ? booking.createdAt.toDate() : null;
      
      // Skip bookings from terminated hosts
      if (terminatedHostIdsForBookings.has(booking.ownerId)) {
        continue;
      }
      
      // Apply date filter if provided
      if (dateFilter && !isDateInRange(createdAt, dateFilter)) {
        continue;
      }
      
      // Get guest and host info
      const [guestDoc, hostDoc, listingDoc] = await Promise.all([
        getDoc(doc(db, 'users', booking.guestId)),
        getDoc(doc(db, 'users', booking.ownerId)),
        getDoc(doc(db, 'listings', booking.listingId))
      ]);

      const guestData = guestDoc.exists() ? guestDoc.data() : {};
      const hostData = hostDoc.exists() ? hostDoc.data() : {};
      const listingData = listingDoc.exists() ? listingDoc.data() : {};

      // Format dates
      const checkInDate = booking.checkInDate?.toDate ? booking.checkInDate.toDate() : (booking.checkIn?.toDate ? booking.checkIn.toDate() : null);
      const checkOutDate = booking.checkOutDate?.toDate ? booking.checkOutDate.toDate() : (booking.checkOut?.toDate ? booking.checkOut.toDate() : null);
      const updatedAt = booking.updatedAt?.toDate ? booking.updatedAt.toDate() : null;
      const completedAt = booking.completedAt?.toDate ? booking.completedAt.toDate() : null;
      
      bookingsData.push({
        bookingId: bookingDoc.id,
        status: booking.status || 'N/A',
        guestName: `${guestData.firstName || ''} ${guestData.lastName || ''}`.trim() || guestData.email || 'Unknown',
        guestEmail: guestData.email || 'N/A',
        guestId: booking.guestId || 'N/A',
        hostName: `${hostData.firstName || ''} ${hostData.lastName || ''}`.trim() || hostData.email || 'Unknown',
        hostEmail: hostData.email || 'N/A',
        hostId: booking.ownerId || 'N/A',
        listingTitle: listingData.title || 'Unknown',
        listingId: booking.listingId || 'N/A',
        listingCategory: listingData.category || 'N/A',
        listingLocation: listingData.location || 'N/A',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: booking.guests || 1,
        totalPrice: booking.totalPrice || 0,
        bookingAmount: booking.bookingAmount || 0,
        guestFee: booking.guestFee || 0,
        adminCommission: booking.adminCommission || 0,
        hostEarnings: booking.hostEarnings || 0,
        paymentMethod: booking.paymentMethod || 'N/A',
        paymentProvider: booking.paymentProvider || 'N/A',
        paymentStatus: booking.paymentStatus || 'N/A',
        isPaid: booking.isPaid || false,
        earningsReleased: booking.earningsReleased || false,
        earningsReleasedAt: booking.earningsReleasedAt?.toDate ? booking.earningsReleasedAt.toDate() : null,
        createdAt: createdAt,
        updatedAt: updatedAt,
        completedAt: completedAt
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
 * @param {Object} dateFilter - Optional date filter {startDate, endDate}
 * @returns {Promise<Array>}
 */
export const generateServiceFeesReport = async (dateFilter = null) => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const hostsData = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest'];

      // Skip terminated hosts
      if (userData.isTerminated) {
        continue;
      }

      if (roles.includes('host')) {
        // Get host's bookings
        const bookingsSnapshot = await getDocs(
          query(collection(db, 'bookings'), where('ownerId', '==', userDoc.id))
        );

        let totalEarnings = 0;
        let totalBookings = 0;

        bookingsSnapshot.forEach(bookingDoc => {
          const booking = bookingDoc.data();
          const createdAt = booking.createdAt?.toDate ? booking.createdAt.toDate() : null;
          
          // Apply date filter if provided
          if (dateFilter && !isDateInRange(createdAt, dateFilter)) {
            return;
          }
          
          if (booking.status === 'confirmed' || booking.status === 'completed') {
            totalEarnings += booking.bookingAmount || booking.totalPrice || 0;
            totalBookings++;
          }
        });

        // If date filter is applied, only include hosts with bookings/earnings in that range
        if (dateFilter && totalBookings === 0 && totalEarnings === 0) {
          return; // Skip this host - no bookings/earnings in the date range
        }

        const serviceFee = Math.round((totalEarnings * 0.10) * 100) / 100; // 10% commission
        const hostEarnings = Math.round((totalEarnings * 0.90) * 100) / 100; // 90% host earnings
        const hostCreatedAt = userData.createdAt?.toDate ? userData.createdAt.toDate() : null;
        const hostUpdatedAt = userData.updatedAt?.toDate ? userData.updatedAt.toDate() : null;
        const isTerminated = userData.isTerminated || false;
        const terminatedAt = userData.terminatedAt?.toDate ? userData.terminatedAt.toDate() : null;

        hostsData.push({
          hostId: userDoc.id,
          hostName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Unknown',
          hostEmail: userData.email || 'N/A',
          hostPhone: userData.phone || 'N/A',
          totalBookings,
          totalEarnings,
          serviceFee,
          hostEarnings,
          serviceFeePercentage: '10%',
          hostCreatedAt,
          hostUpdatedAt,
          isTerminated,
          terminatedAt
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
 * @param {Object} dateFilter - Optional date filter {startDate, endDate}
 * @returns {Promise<Array>}
 */
export const generatePaymentsReport = async (dateFilter = null) => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const paymentsData = [];

    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data();
      
      // Skip terminated hosts
      if (userData.isTerminated) {
        return;
      }
      
      const paymentData = userData.payment || {};
      const lastPaymentDate = paymentData.lastPaymentDate?.toDate ? paymentData.lastPaymentDate.toDate() : null;

      // Apply date filter if provided
      if (dateFilter && !isDateInRange(lastPaymentDate, dateFilter)) {
        return;
      }

      if (paymentData.status === 'active' || paymentData.lastPayPalTransactionId || paymentData.type) {
        const createdAt = userData.createdAt?.toDate ? userData.createdAt.toDate() : null;
        const subscriptionStartDate = paymentData.subscriptionStartDate?.toDate ? paymentData.subscriptionStartDate.toDate() : null;
        const subscriptionEndDate = paymentData.subscriptionEndDate?.toDate ? paymentData.subscriptionEndDate.toDate() : null;
        
        paymentsData.push({
          userId: userDoc.id,
          userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Unknown',
          email: userData.email || 'N/A',
          phone: userData.phone || 'N/A',
          paymentType: paymentData.type || 'N/A',
          paymentStatus: paymentData.status || 'N/A',
          subscriptionPlan: paymentData.plan || 'N/A',
          subscriptionStartDate: subscriptionStartDate,
          subscriptionEndDate: subscriptionEndDate,
          transactionId: paymentData.lastPayPalTransactionId || paymentData.transactionId || 'N/A',
          lastPaymentDate: lastPaymentDate,
          lastPaymentAmount: paymentData.lastPaymentAmount || 0,
          paypalEmail: paymentData.paypalEmail || paymentData.lastPayPalPayerEmail || 'N/A',
          paypalAccountName: paymentData.paypalAccountName || paymentData.paypalPayerName || 'N/A',
          paypalPayerId: paymentData.paypalPayerId || 'N/A',
          userCreatedAt: createdAt
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
 * @param {Object} dateFilter - Optional date filter {startDate, endDate}
 * @returns {Promise<Array>}
 */
export const generateComplianceReport = async (dateFilter = null) => {
  try {
    // First, get all terminated host IDs and their listings
    const usersSnapshotForCompliance = await getDocs(collection(db, 'users'));
    const terminatedHostIdsForCompliance = new Set();
    usersSnapshotForCompliance.forEach(doc => {
      const userData = doc.data();
      if (userData.isTerminated) {
        terminatedHostIdsForCompliance.add(doc.id);
      }
    });
    
    // Get all listings and filter out those owned by terminated hosts
    const listingsSnapshotForCompliance = await getDocs(collection(db, 'listings'));
    const terminatedListingIdsForCompliance = new Set();
    listingsSnapshotForCompliance.forEach(doc => {
      const listing = doc.data();
      if (terminatedHostIdsForCompliance.has(listing.ownerId)) {
        terminatedListingIdsForCompliance.add(doc.id);
      }
    });
    
    const [bookingsSnapshot, reviewsSnapshot, appealsSnapshot] = await Promise.all([
      getDocs(collection(db, 'bookings')),
      getDocs(collection(db, 'reviews')),
      getDocs(collection(db, 'host_appeals'))
    ]);

    const violations = [];

    // Check for host cancellations (violations) - exclude terminated hosts
    bookingsSnapshot.forEach(bookingDoc => {
      const booking = bookingDoc.data();
      const cancelledAt = booking.cancelledAt?.toDate ? booking.cancelledAt.toDate() : null;
      
      // Skip bookings from terminated hosts
      if (terminatedHostIdsForCompliance.has(booking.ownerId)) {
        return;
      }
      
      if (booking.status === 'cancelled' && booking.cancelledBy === 'host') {
        // Apply date filter if provided
        if (dateFilter && !isDateInRange(cancelledAt, dateFilter)) {
          return;
        }
        
        violations.push({
          type: 'Host Cancellation',
          bookingId: bookingDoc.id,
          listingId: booking.listingId,
          guestId: booking.guestId,
          hostId: booking.ownerId,
          cancelledAt: cancelledAt,
          reason: booking.cancellationReason || 'No reason provided'
        });
      }
    });

    // Check for low ratings (potential issues) - exclude reviews for terminated hosts' listings
    reviewsSnapshot.forEach(reviewDoc => {
      const review = reviewDoc.data();
      const createdAt = review.createdAt?.toDate ? review.createdAt.toDate() : null;
      
      // Skip reviews for listings owned by terminated hosts
      if (terminatedListingIdsForCompliance.has(review.listingId)) {
        return;
      }
      
      if (review.rating <= 2) {
        // Apply date filter if provided
        if (dateFilter && !isDateInRange(createdAt, dateFilter)) {
          return;
        }
        
        violations.push({
          type: 'Low Rating',
          reviewId: reviewDoc.id,
          listingId: review.listingId,
          rating: review.rating,
          comment: review.comment || '',
          reviewerName: review.reviewerName || 'Anonymous',
          createdAt: createdAt
        });
      }
    });

    // Add host appeals to violations/compliance report
    appealsSnapshot.forEach(appealDoc => {
      const appeal = appealDoc.data();
      const submittedAt = appeal.submittedAt?.toDate ? appeal.submittedAt.toDate() : null;
      
      // Apply date filter if provided
      if (dateFilter && !isDateInRange(submittedAt, dateFilter)) {
        return;
      }
      
      violations.push({
        type: 'Host Appeal',
        appealId: appealDoc.id,
        hostId: appeal.hostId,
        hostName: appeal.hostName || 'Unknown',
        hostEmail: appeal.hostEmail || 'Unknown',
        reason: appeal.reason || 'No reason provided',
        additionalInfo: appeal.additionalInfo || '',
        status: appeal.status || 'pending',
        submittedAt: submittedAt,
        reviewedAt: appeal.reviewedAt?.toDate ? appeal.reviewedAt.toDate() : null,
        reviewedBy: appeal.reviewedBy || null,
        adminNotes: appeal.adminNotes || null
      });
    });

    return violations;
  } catch (error) {
    console.error('Error generating compliance report:', error);
    throw error;
  }
};


/**
 * Check if a date falls within the date range
 * @param {Date} date - Date to check
 * @param {Object} dateFilter - Date filter object with startDate and endDate
 * @returns {boolean}
 */
const isDateInRange = (date, dateFilter) => {
  if (!dateFilter || !date) return true;
  if (!(date instanceof Date)) {
    date = date?.toDate ? date.toDate() : new Date(date);
  }
  
  const startDate = new Date(dateFilter.startDate);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(dateFilter.endDate);
  endDate.setHours(23, 59, 59, 999);
  
  return date >= startDate && date <= endDate;
};

/**
 * Get report data without downloading (for preview)
 * @param {string} reportType - Type of report to generate
 * @param {Object} dateFilter - Optional date filter {startDate, endDate}
 * @returns {Promise<{data: Array, headers: Array}>}
 */
export const getReportData = async (reportType, dateFilter = null) => {
  try {
    let data, headers;

    switch (reportType) {
      case 'bookings':
        data = await generateBookingsReport(dateFilter);
        headers = [
          { key: 'bookingId', label: 'Booking ID' },
          { key: 'status', label: 'Status' },
          { key: 'guestName', label: 'Guest Name' },
          { key: 'guestEmail', label: 'Guest Email' },
          { key: 'guestId', label: 'Guest ID' },
          { key: 'hostName', label: 'Host Name' },
          { key: 'hostEmail', label: 'Host Email' },
          { key: 'hostId', label: 'Host ID' },
          { key: 'listingTitle', label: 'Listing Title' },
          { key: 'listingId', label: 'Listing ID' },
          { key: 'listingCategory', label: 'Category' },
          { key: 'listingLocation', label: 'Location' },
          { key: 'checkIn', label: 'Check In' },
          { key: 'checkOut', label: 'Check Out' },
          { key: 'guests', label: 'Number of Guests' },
          { key: 'totalPrice', label: 'Total Price' },
          { key: 'bookingAmount', label: 'Booking Amount' },
          { key: 'guestFee', label: 'Guest Fee' },
          { key: 'adminCommission', label: 'Admin Commission (10%)' },
          { key: 'hostEarnings', label: 'Host Earnings (90%)' },
          { key: 'paymentMethod', label: 'Payment Method' },
          { key: 'paymentProvider', label: 'Payment Provider' },
          { key: 'paymentStatus', label: 'Payment Status' },
          { key: 'isPaid', label: 'Is Paid' },
          { key: 'earningsReleased', label: 'Earnings Released' },
          { key: 'earningsReleasedAt', label: 'Earnings Released At' },
          { key: 'createdAt', label: 'Created At' },
          { key: 'updatedAt', label: 'Updated At' },
          { key: 'completedAt', label: 'Completed At' }
        ];
        break;

      case 'service-fees':
        data = await generateServiceFeesReport(dateFilter);
        headers = [
          { key: 'hostId', label: 'Host ID' },
          { key: 'hostName', label: 'Host Name' },
          { key: 'hostEmail', label: 'Host Email' },
          { key: 'hostPhone', label: 'Host Phone' },
          { key: 'totalBookings', label: 'Total Bookings' },
          { key: 'totalEarnings', label: 'Total Earnings' },
          { key: 'serviceFee', label: 'Commission (10%)' },
          { key: 'hostEarnings', label: 'Host Earnings (90%)' },
          { key: 'serviceFeePercentage', label: 'Service Fee %' },
          { key: 'hostCreatedAt', label: 'Host Created At' },
          { key: 'hostUpdatedAt', label: 'Host Updated At' },
          { key: 'isTerminated', label: 'Is Terminated' },
          { key: 'terminatedAt', label: 'Terminated At' }
        ];
        break;

      case 'payments':
        data = await generatePaymentsReport(dateFilter);
        headers = [
          { key: 'userId', label: 'User ID' },
          { key: 'userName', label: 'User Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'paymentType', label: 'Payment Type' },
          { key: 'paymentStatus', label: 'Payment Status' },
          { key: 'subscriptionPlan', label: 'Subscription Plan' },
          { key: 'subscriptionStartDate', label: 'Subscription Start Date' },
          { key: 'subscriptionEndDate', label: 'Subscription End Date' },
          { key: 'transactionId', label: 'Transaction ID' },
          { key: 'lastPaymentDate', label: 'Last Payment Date' },
          { key: 'lastPaymentAmount', label: 'Last Payment Amount' },
          { key: 'paypalEmail', label: 'PayPal Email' },
          { key: 'paypalAccountName', label: 'PayPal Account Name' },
          { key: 'paypalPayerId', label: 'PayPal Payer ID' },
          { key: 'userCreatedAt', label: 'User Created At' }
        ];
        break;

      case 'compliance':
      case 'violations':
        data = await generateComplianceReport(dateFilter);
        headers = [
          { key: 'type', label: 'Type' },
          { key: 'bookingId', label: 'Booking ID' },
          { key: 'reviewId', label: 'Review ID' },
          { key: 'appealId', label: 'Appeal ID' },
          { key: 'hostId', label: 'Host ID' },
          { key: 'hostName', label: 'Host Name' },
          { key: 'hostEmail', label: 'Host Email' },
          { key: 'guestId', label: 'Guest ID' },
          { key: 'listingId', label: 'Listing ID' },
          { key: 'rating', label: 'Rating' },
          { key: 'comment', label: 'Comment' },
          { key: 'reviewerName', label: 'Reviewer Name' },
          { key: 'reason', label: 'Reason' },
          { key: 'additionalInfo', label: 'Additional Info' },
          { key: 'status', label: 'Status' },
          { key: 'cancelledAt', label: 'Cancelled At' },
          { key: 'submittedAt', label: 'Submitted At' },
          { key: 'reviewedAt', label: 'Reviewed At' },
          { key: 'reviewedBy', label: 'Reviewed By' },
          { key: 'adminNotes', label: 'Admin Notes' },
          { key: 'createdAt', label: 'Created At' }
        ];
        break;

      case 'users':
        const usersSnapshot = await getDocs(collection(db, 'users'));
        data = usersSnapshot.docs
          .map(doc => {
            const userData = doc.data();
            const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest'];
            return {
              userId: doc.id,
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              email: userData.email || 'N/A',
              phone: userData.phone || 'N/A',
              roles: roles.join(', '),
              isHost: roles.includes('host'),
              isGuest: roles.includes('guest'),
              emailVerified: userData.emailVerified || false,
              createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : null,
              updatedAt: userData.updatedAt?.toDate ? userData.updatedAt.toDate() : null,
              lastLogin: userData.lastLogin?.toDate ? userData.lastLogin.toDate() : null,
              isTerminated: userData.isTerminated || false,
              terminatedAt: userData.terminatedAt?.toDate ? userData.terminatedAt.toDate() : null
            };
          })
          .filter(user => {
            // Users report shows all users including terminated ones for admin reference
            // But we still apply date filter if provided
            if (dateFilter) {
              return isDateInRange(user.createdAt, dateFilter);
            }
            return true;
          });
        headers = [
          { key: 'userId', label: 'User ID' },
          { key: 'firstName', label: 'First Name' },
          { key: 'lastName', label: 'Last Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'roles', label: 'Roles' },
          { key: 'isHost', label: 'Is Host' },
          { key: 'isGuest', label: 'Is Guest' },
          { key: 'emailVerified', label: 'Email Verified' },
          { key: 'createdAt', label: 'Created At' },
          { key: 'updatedAt', label: 'Updated At' },
          { key: 'lastLogin', label: 'Last Login' },
          { key: 'isTerminated', label: 'Is Terminated' },
          { key: 'terminatedAt', label: 'Terminated At' }
        ];
        break;

      case 'reviews':
        // First, get all terminated host IDs and their listings
        const usersSnapshotForReviews = await getDocs(collection(db, 'users'));
        const terminatedHostIdsForReviews = new Set();
        usersSnapshotForReviews.forEach(doc => {
          const userData = doc.data();
          if (userData.isTerminated) {
            terminatedHostIdsForReviews.add(doc.id);
          }
        });
        
        // Get all listings and filter out those owned by terminated hosts
        const listingsSnapshotForReviews = await getDocs(collection(db, 'listings'));
        const terminatedListingIdsForReviews = new Set();
        listingsSnapshotForReviews.forEach(doc => {
          const listing = doc.data();
          if (terminatedHostIdsForReviews.has(listing.ownerId)) {
            terminatedListingIdsForReviews.add(doc.id);
          }
        });
        
        const reviewsSnapshot = await getDocs(
          query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))
        );
        data = reviewsSnapshot.docs
          .map(doc => {
            const review = doc.data();
            return {
              reviewId: doc.id,
              listingId: review.listingId || 'N/A',
              listingTitle: review.listingTitle || 'N/A',
              listingCategory: review.category || 'N/A',
              reviewerName: review.reviewerName || 'Anonymous',
              reviewerId: review.reviewerId || 'N/A',
              reviewerEmail: review.reviewerEmail || 'N/A',
              rating: review.rating || 0,
              comment: review.comment || '',
              isVerified: review.isVerified || false,
              helpfulCount: review.helpfulCount || 0,
              createdAt: review.createdAt?.toDate ? review.createdAt.toDate() : null,
              updatedAt: review.updatedAt?.toDate ? review.updatedAt.toDate() : null
            };
          })
          .filter(review => {
            // Skip reviews for listings owned by terminated hosts
            if (terminatedListingIdsForReviews.has(review.listingId)) {
              return false;
            }
            // Apply date filter if provided
            if (dateFilter) {
              return isDateInRange(review.createdAt, dateFilter);
            }
            return true;
          });
        headers = [
          { key: 'reviewId', label: 'Review ID' },
          { key: 'listingId', label: 'Listing ID' },
          { key: 'listingTitle', label: 'Listing Title' },
          { key: 'listingCategory', label: 'Listing Category' },
          { key: 'reviewerName', label: 'Reviewer Name' },
          { key: 'reviewerId', label: 'Reviewer ID' },
          { key: 'reviewerEmail', label: 'Reviewer Email' },
          { key: 'rating', label: 'Rating' },
          { key: 'comment', label: 'Comment' },
          { key: 'isVerified', label: 'Is Verified' },
          { key: 'helpfulCount', label: 'Helpful Count' },
          { key: 'createdAt', label: 'Created At' },
          { key: 'updatedAt', label: 'Updated At' }
        ];
        break;

      case 'hosts':
        const hostsReportData = await generateServiceFeesReport(dateFilter);
        const hostsWithDetails = await Promise.all(
          hostsReportData.map(async (host) => {
            const hostDoc = await getDoc(doc(db, 'users', host.hostId));
            const hostData = hostDoc.exists() ? hostDoc.data() : {};
            
            const listingsSnapshot = await getDocs(
              query(collection(db, 'listings'), where('ownerId', '==', host.hostId))
            );
            
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
        // Filter out null values (terminated hosts - shouldn't happen but safety check)
        data = hostsWithDetails.filter(h => h !== null);
        headers = [
          { key: 'hostId', label: 'Host ID' },
          { key: 'hostName', label: 'Host Name' },
          { key: 'hostEmail', label: 'Host Email' },
          { key: 'hostPhone', label: 'Host Phone' },
          { key: 'totalBookings', label: 'Total Bookings' },
          { key: 'totalEarnings', label: 'Total Earnings' },
          { key: 'serviceFee', label: 'Service Fee (10%)' },
          { key: 'hostEarnings', label: 'Host Earnings (90%)' },
          { key: 'listingsCount', label: 'Listings Count' },
          { key: 'averageRating', label: 'Average Rating' },
          { key: 'totalReviews', label: 'Total Reviews' },
          { key: 'joinedDate', label: 'Joined Date' },
          { key: 'hostCreatedAt', label: 'Host Created At' },
          { key: 'isTerminated', label: 'Is Terminated' },
          { key: 'terminatedAt', label: 'Terminated At' }
        ];
        break;

      case 'financial':
        // For financial, return service fees data (main part)
        data = await generateServiceFeesReport(dateFilter);
        headers = [
          { key: 'hostId', label: 'Host ID' },
          { key: 'hostName', label: 'Host Name' },
          { key: 'hostEmail', label: 'Host Email' },
          { key: 'hostPhone', label: 'Host Phone' },
          { key: 'totalBookings', label: 'Total Bookings' },
          { key: 'totalEarnings', label: 'Total Earnings' },
          { key: 'serviceFee', label: 'Service Fee (10%)' },
          { key: 'hostEarnings', label: 'Host Earnings (90%)' },
          { key: 'serviceFeePercentage', label: 'Service Fee %' },
          { key: 'hostCreatedAt', label: 'Host Created At' },
          { key: 'isTerminated', label: 'Is Terminated' }
        ];
        break;

      default:
        throw new Error(`Preview not available for report type: ${reportType}`);
    }

    // Ensure data is always an array
    const finalData = Array.isArray(data) ? data : [];
    const finalHeaders = Array.isArray(headers) ? headers : [];
    
    console.log(`Report ${reportType}: Returning ${finalData.length} records with ${finalHeaders.length} headers`);
    
    return { data: finalData, headers: finalHeaders };
  } catch (error) {
    console.error('Error getting report data:', error);
    throw error;
  }
};

/**
 * Main report generation function
 * @param {string} reportType - Type of report to generate
 * @param {Object} dateFilter - Optional date filter {startDate, endDate}
 * @returns {Promise<void>}
 */
export const generateReport = async (reportType, dateFilter = null) => {
  try {
    let data, headers, filename;

    switch (reportType) {
      case 'comprehensive':
        const comprehensiveData = await generateComprehensiveReport();
        // Export summary
        await exportToPDF(
          [comprehensiveData.summary],
          [
            { key: 'totalUsers', label: 'Total Users' },
            { key: 'activeListings', label: 'Active Listings' },
            { key: 'totalBookings', label: 'Total Bookings' },
            { key: 'totalReviews', label: 'Total Reviews' },
            { key: 'generatedAt', label: 'Generated At' }
          ],
          'comprehensive_summary',
          'Comprehensive Report - Summary'
        );
        // Export bookings
        if (comprehensiveData.bookings.length > 0) {
          await exportToPDF(
            comprehensiveData.bookings,
            [
              { key: 'id', label: 'Booking ID' },
              { key: 'status', label: 'Status' },
              { key: 'totalPrice', label: 'Total Price' },
              { key: 'createdAt', label: 'Created At' }
            ],
            'comprehensive_bookings',
            'Comprehensive Report - Bookings'
          );
        }
        return;

      case 'bookings':
        data = await generateBookingsReport(dateFilter);
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
        data = await generateServiceFeesReport(dateFilter);
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
        data = await generatePaymentsReport(dateFilter);
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
        await exportToPDF(
          [analyticsData.reviews],
          [
            { key: 'total', label: 'Total Reviews' },
            { key: 'averageRating', label: 'Average Rating' },
            { key: 'generatedAt', label: 'Generated At' }
          ],
          'analytics_reviews_summary',
          'Analytics Report - Reviews Summary'
        );
        // Export best reviews
        if (analyticsData.reviews.bestReviews.length > 0) {
          await exportToPDF(
            analyticsData.reviews.bestReviews,
            [
              { key: 'reviewId', label: 'Review ID' },
              { key: 'reviewerName', label: 'Reviewer Name' },
              { key: 'listingTitle', label: 'Listing Title' },
              { key: 'rating', label: 'Rating' },
              { key: 'comment', label: 'Comment' },
              { key: 'createdAt', label: 'Created At' }
            ],
            'analytics_best_reviews',
            'Analytics Report - Best Reviews'
          );
        }
        // Export lowest reviews
        if (analyticsData.reviews.lowestReviews.length > 0) {
          await exportToPDF(
            analyticsData.reviews.lowestReviews,
            [
              { key: 'reviewId', label: 'Review ID' },
              { key: 'reviewerName', label: 'Reviewer Name' },
              { key: 'listingTitle', label: 'Listing Title' },
              { key: 'rating', label: 'Rating' },
              { key: 'comment', label: 'Comment' },
              { key: 'createdAt', label: 'Created At' }
            ],
            'analytics_lowest_reviews',
            'Analytics Report - Lowest Reviews'
          );
        }
        // Export booking stats
        await exportToPDF(
          [analyticsData.bookings],
          [
            { key: 'total', label: 'Total Bookings' },
            { key: 'pending', label: 'Pending' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' }
          ],
          'analytics_booking_stats',
          'Analytics Report - Booking Statistics'
        );
        return;

      case 'compliance':
      case 'violations':
        data = await generateComplianceReport(dateFilter);
        headers = [
          { key: 'type', label: 'Type' },
          { key: 'bookingId', label: 'Booking ID' },
          { key: 'reviewId', label: 'Review ID' },
          { key: 'appealId', label: 'Appeal ID' },
          { key: 'hostId', label: 'Host ID' },
          { key: 'hostName', label: 'Host Name' },
          { key: 'hostEmail', label: 'Host Email' },
          { key: 'guestId', label: 'Guest ID' },
          { key: 'listingId', label: 'Listing ID' },
          { key: 'rating', label: 'Rating' },
          { key: 'comment', label: 'Comment' },
          { key: 'reviewerName', label: 'Reviewer Name' },
          { key: 'reason', label: 'Reason' },
          { key: 'additionalInfo', label: 'Additional Info' },
          { key: 'status', label: 'Status' },
          { key: 'cancelledAt', label: 'Cancelled At' },
          { key: 'submittedAt', label: 'Submitted At' },
          { key: 'reviewedAt', label: 'Reviewed At' },
          { key: 'reviewedBy', label: 'Reviewed By' },
          { key: 'adminNotes', label: 'Admin Notes' },
          { key: 'createdAt', label: 'Created At' }
        ];
        filename = reportType === 'compliance' ? 'compliance_report' : 'violations_report';
        break;

      case 'financial':
        // Financial report combines service fees and payments
        const [serviceFeesData, paymentsData] = await Promise.all([
          generateServiceFeesReport(dateFilter),
          generatePaymentsReport(dateFilter)
        ]);
        
        // Export service fees
        await exportToPDF(
          serviceFeesData,
          [
            { key: 'hostId', label: 'Host ID' },
            { key: 'hostName', label: 'Host Name' },
            { key: 'hostEmail', label: 'Host Email' },
            { key: 'totalBookings', label: 'Total Bookings' },
            { key: 'totalEarnings', label: 'Total Earnings' },
            { key: 'serviceFee', label: 'Service Fee (3.3%)' }
          ],
          'financial_service_fees',
          'Financial Report - Service Fees'
        );
        
        // Export payments
        if (paymentsData.length > 0) {
          await exportToPDF(
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
            'financial_payments',
            'Financial Report - Payments'
          );
        }
        return;

      case 'users':
        const usersSnapshot = await getDocs(collection(db, 'users'));
        data = usersSnapshot.docs
          .map(doc => {
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
          })
          .filter(user => {
            // Apply date filter if provided (filter by createdAt)
            if (dateFilter) {
              return isDateInRange(user.createdAt, dateFilter);
            }
            return true;
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
        data = reviewsSnapshot.docs
          .map(doc => {
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
          })
          .filter(review => {
            // Apply date filter if provided
            if (dateFilter) {
              return isDateInRange(review.createdAt, dateFilter);
            }
            return true;
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
        const hostsReportData = await generateServiceFeesReport(dateFilter);
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
        
        await exportToPDF(
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
          'hosts_report',
          'Hosts Report'
        );
        return;

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    if (data && headers && filename) {
      const reportTitle = filename.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      await exportToPDF(data, headers, filename, reportTitle);
    }
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};

