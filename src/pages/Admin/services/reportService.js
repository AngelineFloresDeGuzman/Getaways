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
  
  // Handle Firestore Timestamp objects
  if (value && typeof value === 'object' && value.toDate && typeof value.toDate === 'function') {
    try {
      value = value.toDate();
    } catch (e) {
      return 'N/A';
    }
  }
  
  if (value instanceof Date) {
    try {
      // Match preview format exactly: month: 'short', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit'
      return value.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  }
  
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '[Object]';
    }
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
    
    // Validate data
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No data to export');
    }

    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      throw new Error('No headers provided for export');
    }
    
    // Detect if table is wide (more than 6 columns) - use landscape for wide tables
    const isWideTable = headers.length > 6;
    
    const doc = new pdf({
      orientation: isWideTable ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Ultra-compact header matching preview exactly
    const pageWidth = doc.internal.pageSize.getWidth();
    const headerHeight = 12; // Compact header height
    
    // Primary color RGB - Same as logo color (#D4A373 / HSL 25 47% 63% = RGB 212, 163, 115) - Warm Golden Tan
    const primaryR = 212;  // #D4
    const primaryG = 163;  // #A3
    const primaryB = 115;  // #73
    
    // Draw compact header background
    doc.setFillColor(primaryR, primaryG, primaryB);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Try to add logo image if available
    let logoAdded = false;
    try {
      const logoResponse = await fetch('/logo.jpg');
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        const logoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(logoBlob);
        });
        // Small logo matching preview
        doc.addImage(logoDataUrl, 'JPEG', 8, 3, 6, 6);
        logoAdded = true;
      }
    } catch (err) {
      // Logo image failed, continue without it
      }
    
    // Compact header text matching preview
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Getaways', logoAdded ? 16 : 8, 6);
    
    // Report title on same line
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(title, logoAdded ? 16 : 8, 9);
    
    // Date range and record count on right side
    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
    doc.setFontSize(7);
    doc.text(`${dateStr} • ${data.length.toLocaleString()} records`, pageWidth - 8, 7.5, { align: 'right' });

    // Prepare table data - ensure ALL data is included without cutting
    const tableHeaders = headers.map(h => h.label || h.key);
    const tableRows = data.map((row, rowIndex) => {
      const rowData = headers.map(h => {
        const key = h.key || h.label;
        const value = row[key];
        // Format value ensuring no data is lost
        return formatValueForPDF(value);
      });
      return rowData;
    });
    
    // Validate that all rows are included
    if (tableRows.length !== data.length) {
      }
    
    // Store data length for use in didDrawPage callback
    const totalRecords = data.length;

    // Add table with ultra-compact styling matching preview exactly
    autoTablePlugin(doc, {
      head: [tableHeaders],
      body: tableRows, // Include ALL rows - no slicing
      startY: headerHeight + 3,
      styles: {
        fontSize: 6.5, // Ultra-compact matching preview text-[9px]
        cellPadding: 1.5, // Compact padding matching preview
        overflow: 'linebreak',
        cellWidth: 'auto',
        halign: 'left',
        valign: 'middle',
        textColor: [31, 41, 55],
        lineWidth: 0.1,
        lineColor: [229, 231, 235]
      },
      headStyles: {
        fillColor: [primaryR, primaryG, primaryB], // Primary color
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 6.5, // Matching preview
        halign: 'left',
        valign: 'middle',
        cellPadding: 1.5
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { top: headerHeight + 3, left: 8, right: 8, bottom: 12 },
      // Enable pagination - ensure all pages are created
      didDrawPage: (tableData) => {
        // Add compact header on each page matching preview
        if (tableData.pageNumber > 1) {
          const pageWidth = doc.internal.pageSize.getWidth();
          doc.setFillColor(primaryR, primaryG, primaryB);
          doc.rect(0, 0, pageWidth, headerHeight, 'F');
          
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('Getaways', 8, 6);
          
          doc.setFontSize(7);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(255, 255, 255);
          doc.text(title, 8, 9);
        }
        
        // Add compact footer matching preview
        doc.setFontSize(6.5);
        doc.setTextColor(107, 114, 128);
        const pageCount = doc.internal.getNumberOfPages();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Footer matching preview style
        doc.setFont(undefined, 'bold');
        doc.text(
          `Total: ${totalRecords.toLocaleString()} records`,
          8,
          pageHeight - 5
        );
        
        doc.setFont(undefined, 'normal');
        doc.text(
          'Getaways Platform Report',
          pageWidth - 8,
          pageHeight - 5,
          { align: 'right' }
        );
        
        // Page number
        doc.text(
          `Page ${tableData.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      },
      // Ensure all rows are included and headers repeat on each page
      showHead: 'everyPage',
      // Handle long content - wrap text properly
      columnStyles: {},
      // Prevent cutting off - use full width
      tableWidth: 'auto',
      // Ensure all data is processed - include ALL rows without cutting
      includeHiddenHtml: false,
      // Disable horizontal page break to ensure complete columns
      horizontalPageBreak: false,
      // Ensure proper row rendering - split rows across pages if needed but keep them complete
      rowPageBreak: 'auto',
      // Prevent truncation - ensure all content is visible
      truncateCellContent: false,
      // Set column widths to ensure all columns are visible
      columnWidth: 'auto',
      // Ensure text wrapping within cells
      wrap: true,
      // Don't limit column widths - let them expand as needed
      minCellHeight: 10,
      // Ensure all rows are rendered
      addPageContent: null
    });

    // Save PDF
    const timestamp = new Date().toISOString().split('T')[0];
    const finalFilename = `${filename}_${timestamp}.pdf`;
    doc.save(finalFilename);
  } catch (error) {
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
    throw error;
  }
};

/**
 * Generate bookings report
 * @param {Object} dateFilter - Optional date filter {startDate, endDate}
 * @returns {Promise<Array>}
 */
export const generateBookingsReport = async (dateFilter = null, filters = null) => {
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
    let totalProcessed = 0;
    let filteredOut = 0;
    
    for (const bookingDoc of bookingsSnapshot.docs) {
      totalProcessed++;
      const booking = bookingDoc.data();
      const createdAt = booking.createdAt?.toDate ? booking.createdAt.toDate() : null;
      
      // Skip bookings from terminated hosts
      if (terminatedHostIdsForBookings.has(booking.ownerId)) {
        continue;
      }
      
      // Apply date filter if provided (check first to avoid unnecessary data fetching)
      if (dateFilter) {
        // Try multiple date fields for booking date filtering
        let bookingDate = createdAt;
        // Also check checkInDate, updatedAt as alternatives for date filtering
        const checkInDateForFilter = booking.checkInDate?.toDate ? booking.checkInDate.toDate() : null;
        const updatedAtForFilter = booking.updatedAt?.toDate ? booking.updatedAt.toDate() : null;
        
        // Use the most relevant date for filtering
        // Prefer checkInDate if available, otherwise createdAt
        const dateToCheck = checkInDateForFilter || bookingDate || updatedAtForFilter;
        
        if (!isDateInRange(dateToCheck, dateFilter)) {
          continue;
        }
      }
      
      // Get guest, host, and listing info (needed for filters)
      const [guestDoc, hostDoc, listingDoc] = await Promise.all([
        getDoc(doc(db, 'users', booking.guestId)),
        getDoc(doc(db, 'users', booking.ownerId)),
        getDoc(doc(db, 'listings', booking.listingId))
      ]);

      const guestData = guestDoc.exists() ? guestDoc.data() : {};
      const hostData = hostDoc.exists() ? hostDoc.data() : {};
      const listingData = listingDoc.exists() ? listingDoc.data() : {};
      
      // Apply filters if provided - ALL filters must pass for booking to be included
      if (filters) {
        // Booking status filter - must match exactly
        if (filters.bookingStatus && filters.bookingStatus !== 'all') {
          // Normalize status values for comparison (case-insensitive)
          const bookingStatus = (booking.status || '').toLowerCase().trim();
          const filterStatus = (filters.bookingStatus || '').toLowerCase().trim();
          if (bookingStatus !== filterStatus) {
            filteredOut++;
            continue; // Skip this booking - status doesn't match
          }
        }
        
        // Payment status filter
        if (filters.paymentStatus && filters.paymentStatus !== 'all') {
          const paymentStatus = (booking.paymentStatus || '').toLowerCase().trim();
          const isPaid = booking.isPaid === true || 
                         paymentStatus === 'paid' || 
                         paymentStatus === 'completed' ||
                         paymentStatus === 'success';
          if (filters.paymentStatus === 'paid' && !isPaid) {
            filteredOut++;
            continue; // Skip - not paid
          }
          if (filters.paymentStatus === 'unpaid' && isPaid) {
            filteredOut++;
            continue; // Skip - is paid
          }
        }
        
        // Category filter - check listing category
        if (filters.category && filters.category !== 'all') {
          const listingCategory = (listingData.category || '').toLowerCase().trim();
          const filterCategory = (filters.category || '').toLowerCase().trim();
          if (listingCategory !== filterCategory) {
            filteredOut++;
            continue; // Skip - category doesn't match
          }
        }
      }
      
      // If we get here, all filters passed - include this booking

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

    // Debug logging
    return bookingsData;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate service fees report
 * @param {Object} dateFilter - Optional date filter {startDate, endDate}
 * @param {Object} filters - Optional filters {hostStatus, subscriptionType}
 * @returns {Promise<Array>}
 */
export const generateServiceFeesReport = async (dateFilter = null, filters = null) => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const hostsData = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'guest'];

      if (roles.includes('host')) {
        // Apply host status filter
        if (filters && filters.hostStatus && filters.hostStatus !== 'all') {
          if (filters.hostStatus === 'active' && userData.isTerminated) {
            continue;
          }
          if (filters.hostStatus === 'terminated' && !userData.isTerminated) {
            continue;
          }
        } else {
          // Default: skip terminated hosts if no filter specified
          if (userData.isTerminated) {
            continue;
          }
        }
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

        // Apply subscription type filter
        if (filters && filters.subscriptionType && filters.subscriptionType !== 'all') {
          const paymentData = userData.payment || {};
          const subscriptionPlan = paymentData.plan || paymentData.subscriptionPlan || '';
          const planLower = subscriptionPlan.toLowerCase();
          
          if (filters.subscriptionType === 'monthly' && !planLower.includes('monthly') && !planLower.includes('month')) {
            continue;
          }
          if (filters.subscriptionType === 'yearly' && !planLower.includes('yearly') && !planLower.includes('year') && !planLower.includes('annual')) {
            continue;
          }
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
    throw error;
  }
};

/**
 * Generate payments report
 * @param {Object} dateFilter - Optional date filter {startDate, endDate}
 * @param {Object} filters - Optional filters {transactionType}
 * @returns {Promise<Array>}
 */
export const generatePaymentsReport = async (dateFilter = null, filters = null) => {
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

      // Apply transaction type filter
      if (filters && filters.transactionType && filters.transactionType !== 'all') {
        const paymentType = paymentData.type || '';
        const paymentTypeLower = paymentType.toLowerCase();
        
        if (filters.transactionType === 'commission') {
          // Commission payments are typically booking-related, not subscription
          // Skip subscription payments
          if (paymentTypeLower.includes('subscription') || paymentData.plan) {
            return;
          }
        } else if (filters.transactionType === 'subscription') {
          // Only include subscription payments
          if (!paymentTypeLower.includes('subscription') && !paymentData.plan) {
            return;
          }
        }
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
    throw error;
  }
};

/**
 * Generate compliance/violations report
 * @param {Object} dateFilter - Optional date filter {startDate, endDate}
 * @param {Object} filters - Optional filters {violationType, complianceStatus}
 * @returns {Promise<Array>}
 */
export const generateComplianceReport = async (dateFilter = null, filters = null) => {
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
        // Apply violation type filter
        if (filters && filters.violationType && filters.violationType !== 'all' && filters.violationType !== 'host_cancellation') {
          return;
        }
        
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
          reason: booking.cancellationReason || 'No reason provided',
          status: 'pending' // Host cancellations are typically pending review
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
        // Apply violation type filter
        if (filters && filters.violationType && filters.violationType !== 'all' && filters.violationType !== 'low_rating') {
          return;
        }
        
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
          createdAt: createdAt,
          status: 'pending' // Low ratings are typically pending review
        });
      }
    });

    // Add host appeals to violations/compliance report
    appealsSnapshot.forEach(appealDoc => {
      const appeal = appealDoc.data();
      const submittedAt = appeal.submittedAt?.toDate ? appeal.submittedAt.toDate() : null;
      const appealStatus = appeal.status || 'pending';
      
      // Apply violation type filter
      if (filters && filters.violationType && filters.violationType !== 'all' && filters.violationType !== 'host_appeal') {
        return;
      }
      
      // Apply compliance status filter
      if (filters && filters.complianceStatus && filters.complianceStatus !== 'all') {
        const isReviewed = appealStatus === 'reviewed' || appealStatus === 'approved' || appealStatus === 'rejected';
        if (filters.complianceStatus === 'pending' && isReviewed) {
          return;
        }
        if (filters.complianceStatus === 'reviewed' && !isReviewed) {
          return;
        }
      }
      
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
        status: appealStatus,
        submittedAt: submittedAt,
        reviewedAt: appeal.reviewedAt?.toDate ? appeal.reviewedAt.toDate() : null,
        reviewedBy: appeal.reviewedBy || null,
        adminNotes: appeal.adminNotes || null
      });
    });

    // Apply compliance status filter to all violations if needed
    let filteredViolations = violations;
    if (filters && filters.complianceStatus && filters.complianceStatus !== 'all') {
      filteredViolations = violations.filter(violation => {
        const isReviewed = violation.status === 'reviewed' || violation.reviewedAt !== null || 
                          violation.status === 'approved' || violation.status === 'rejected';
        if (filters.complianceStatus === 'pending') {
          return !isReviewed;
        }
        if (filters.complianceStatus === 'reviewed') {
          return isReviewed;
        }
        return true;
      });
    }

    return filteredViolations;
  } catch (error) {
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
  // If no date filter provided, include all dates
  if (!dateFilter) return true;
  
  // If no date provided, exclude from results
  if (!date) return false;
  
  // Convert to Date object if needed
  if (!(date instanceof Date)) {
    if (date?.toDate) {
      date = date.toDate();
    } else {
      try {
        date = new Date(date);
        // Check if date is valid
        if (isNaN(date.getTime())) return false;
      } catch {
        return false;
      }
    }
  }
  
  // Validate date
  if (isNaN(date.getTime())) return false;
  
  // Convert filter dates to Date objects if needed
  let startDate, endDate;
  try {
    startDate = dateFilter.startDate instanceof Date 
      ? new Date(dateFilter.startDate) 
      : new Date(dateFilter.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    endDate = dateFilter.endDate instanceof Date 
      ? new Date(dateFilter.endDate) 
      : new Date(dateFilter.endDate);
    endDate.setHours(23, 59, 59, 999);
    
    // Validate filter dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return false;
    }
  } catch {
    return false;
  }
  
  return date >= startDate && date <= endDate;
};

/**
 * Get report data without downloading (for preview)
 * @param {string} reportType - Type of report to generate
 * @param {Object} dateFilter - Optional date filter {startDate, endDate}
 * @returns {Promise<{data: Array, headers: Array}>}
 */
export const getReportData = async (reportType, dateFilter = null, filters = null) => {
  try {
    let data, headers;

    switch (reportType) {
      case 'bookings':
        data = await generateBookingsReport(dateFilter, filters);
        // Essential fields only - keep reports concise like transactions page
        headers = [
          { key: 'status', label: 'Status' },
          { key: 'guestName', label: 'Guest Name' },
          { key: 'hostName', label: 'Host Name' },
          { key: 'listingTitle', label: 'Listing Title' },
          { key: 'checkIn', label: 'Check In' },
          { key: 'checkOut', label: 'Check Out' },
          { key: 'totalPrice', label: 'Total Price' },
          { key: 'adminCommission', label: 'Admin Commission (10%)' },
          { key: 'hostEarnings', label: 'Host Earnings (90%)' },
          { key: 'paymentStatus', label: 'Payment Status' },
          { key: 'createdAt', label: 'Created At' }
        ];
        // Filter to essential fields only
        data = data.map(record => {
          const essential = {};
          headers.forEach(h => {
            essential[h.key] = record[h.key];
          });
          return essential;
        });
        break;

      case 'service-fees':
      case 'hosts':
        data = await generateServiceFeesReport(dateFilter, filters);
        // Essential fields only - keep reports concise like transactions page
        headers = [
          { key: 'hostName', label: 'Host Name' },
          { key: 'hostEmail', label: 'Host Email' },
          { key: 'hostPhone', label: 'Host Phone' },
          { key: 'totalBookings', label: 'Total Bookings' },
          { key: 'totalEarnings', label: 'Total Earnings' },
          { key: 'serviceFee', label: 'Commission (10%)' },
          { key: 'hostEarnings', label: 'Host Earnings (90%)' }
        ];
        // Filter to essential fields only
        data = data.map(record => {
          const essential = {};
          headers.forEach(h => {
            essential[h.key] = record[h.key];
          });
          return essential;
        });
        break;

      case 'payments':
      case 'financial':
        data = await generatePaymentsReport(dateFilter, filters);
        // Essential fields only - keep reports concise like transactions page
        headers = [
          { key: 'userName', label: 'User Name' },
          { key: 'email', label: 'Email' },
          { key: 'paymentType', label: 'Payment Type' },
          { key: 'paymentStatus', label: 'Payment Status' },
          { key: 'subscriptionPlan', label: 'Subscription Plan' },
          { key: 'lastPaymentDate', label: 'Last Payment Date' },
          { key: 'lastPaymentAmount', label: 'Last Payment Amount' }
        ];
        // Filter to essential fields only
        data = data.map(record => {
          const essential = {};
          headers.forEach(h => {
            essential[h.key] = record[h.key];
          });
          return essential;
        });
        break;

      case 'compliance':
      case 'violations':
        data = await generateComplianceReport(dateFilter, filters);
        // Essential fields only - keep reports concise like transactions page
        headers = [
          { key: 'type', label: 'Type' },
          { key: 'hostName', label: 'Host Name' },
          { key: 'status', label: 'Status' },
          { key: 'reason', label: 'Reason' },
          { key: 'createdAt', label: 'Created At' },
          { key: 'reviewedAt', label: 'Reviewed At' }
        ];
        // Filter to essential fields only
        data = data.map(record => {
          const essential = {};
          headers.forEach(h => {
            essential[h.key] = record[h.key];
          });
          return essential;
        });
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
              roles: roles.join(', '),
              emailVerified: userData.emailVerified || false,
              createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : null,
              isTerminated: userData.isTerminated || false,
              isBlocked: userData.isBlocked || false
            };
          })
          .filter(user => {
            // Apply date filter if provided
            if (dateFilter && !isDateInRange(user.createdAt, dateFilter)) {
              return false;
            }
            
            // Apply filters if provided
            if (filters) {
              // User role filter
              if (filters.userRole && filters.userRole !== 'all') {
                if (filters.userRole === 'host' && !user.isHost) return false;
                if (filters.userRole === 'guest' && !user.isGuest) return false;
                if (filters.userRole === 'admin' && !user.isAdmin) return false;
              }
              
              // Account status filter
              if (filters.accountStatus && filters.accountStatus !== 'all') {
                if (filters.accountStatus === 'active' && (user.isTerminated || user.isBlocked)) return false;
                if (filters.accountStatus === 'terminated' && !user.isTerminated) return false;
                if (filters.accountStatus === 'blocked' && !user.isBlocked) return false;
              }
            }
            
            return true;
          });
        // Essential fields only - keep reports concise like transactions page
        headers = [
          { key: 'firstName', label: 'First Name' },
          { key: 'lastName', label: 'Last Name' },
          { key: 'email', label: 'Email' },
          { key: 'roles', label: 'Roles' },
          { key: 'emailVerified', label: 'Email Verified' },
          { key: 'createdAt', label: 'Created At' },
          { key: 'isTerminated', label: 'Is Terminated' },
          { key: 'isBlocked', label: 'Is Blocked' }
        ];
        // Filter to essential fields only
        data = data.map(record => {
          const essential = {};
          headers.forEach(h => {
            essential[h.key] = record[h.key];
          });
          return essential;
        });
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
              listingId: review.listingId || 'N/A', // Keep for filtering
              listingTitle: review.listingTitle || 'N/A',
              reviewerName: review.reviewerName || 'Anonymous',
              rating: review.rating || 0,
              comment: review.comment || '',
              createdAt: review.createdAt?.toDate ? review.createdAt.toDate() : null
            };
          })
          .filter(review => {
            // Skip reviews for listings owned by terminated hosts
            if (terminatedListingIdsForReviews.has(review.listingId)) {
              return false;
            }
            
            // Apply date filter if provided
            if (dateFilter && !isDateInRange(review.createdAt, dateFilter)) {
              return false;
            }
            
            // Apply filters if provided
            if (filters) {
              // Rating filter
              if (filters.rating && filters.rating !== 'all' && review.rating !== filters.rating) {
                return false;
              }
              
              // Verified filter
              if (filters.verified !== undefined && filters.verified !== null) {
                if (filters.verified && !review.isVerified) return false;
                if (!filters.verified && review.isVerified) return false;
              }
            }
            
            return true;
          });
        // Essential fields only - keep reports concise like transactions page
        headers = [
          { key: 'listingTitle', label: 'Listing Title' },
          { key: 'reviewerName', label: 'Reviewer Name' },
          { key: 'rating', label: 'Rating' },
          { key: 'comment', label: 'Comment' },
          { key: 'createdAt', label: 'Created At' }
        ];
        // Filter to essential fields only
        data = data.map(record => {
          const essential = {};
          headers.forEach(h => {
            essential[h.key] = record[h.key];
          });
          return essential;
        });
        break;

      case 'hosts':
        const hostsReportData = await generateServiceFeesReport(dateFilter, filters);
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
        // Essential fields only - keep reports concise like transactions page
        headers = [
          { key: 'hostName', label: 'Host Name' },
          { key: 'hostEmail', label: 'Host Email' },
          { key: 'hostPhone', label: 'Host Phone' },
          { key: 'totalBookings', label: 'Total Bookings' },
          { key: 'totalEarnings', label: 'Total Earnings' },
          { key: 'serviceFee', label: 'Commission (10%)' },
          { key: 'hostEarnings', label: 'Host Earnings (90%)' },
          { key: 'listingsCount', label: 'Listings Count' },
          { key: 'averageRating', label: 'Average Rating' }
        ];
        // Filter to essential fields only
        data = data.map(record => {
          const essential = {};
          headers.forEach(h => {
            essential[h.key] = record[h.key];
          });
          return essential;
        });
        break;

      case 'financial':
        // For financial, return service fees data (main part)
        data = await generateServiceFeesReport(dateFilter, filters);
        // Essential fields only - keep reports concise like transactions page
        headers = [
          { key: 'hostName', label: 'Host Name' },
          { key: 'hostEmail', label: 'Host Email' },
          { key: 'hostPhone', label: 'Host Phone' },
          { key: 'totalBookings', label: 'Total Bookings' },
          { key: 'totalEarnings', label: 'Total Earnings' },
          { key: 'serviceFee', label: 'Commission (10%)' },
          { key: 'hostEarnings', label: 'Host Earnings (90%)' }
        ];
        // Filter to essential fields only
        data = data.map(record => {
          const essential = {};
          headers.forEach(h => {
            essential[h.key] = record[h.key];
          });
          return essential;
        });
        break;

      default:
        throw new Error(`Preview not available for report type: ${reportType}`);
    }

    // Ensure data is always an array
    const finalData = Array.isArray(data) ? data : [];
    const finalHeaders = Array.isArray(headers) ? headers : [];
    
    return { data: finalData, headers: finalHeaders };
  } catch (error) {
    throw error;
  }
};

/**
 * Main report generation function
 * @param {string} reportType - Type of report to generate
 * @param {Object} dateFilter - Optional date filter {startDate, endDate}
 * @returns {Promise<void>}
 */
export const generateReport = async (reportType, dateFilter = null, filters = null) => {
  try {
    // Debug logging
    console.log('generateReport - Called with:', {
      reportType,
      dateFilter: dateFilter ? {
        startDate: dateFilter.startDate?.toISOString(),
        endDate: dateFilter.endDate?.toISOString()
      } : null,
      filters: filters
    });
    
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
        data = await generateBookingsReport(dateFilter, filters);
        
        // Debug logging to verify filters
        console.log('Export Bookings Report - Data Summary:', {
          filtersApplied: filters,
          totalRecords: data.length,
          statusBreakdown: data.reduce((acc, d) => {
            acc[d.status] = (acc[d.status] || 0) + 1;
            return acc;
          }, {}),
          firstFewStatuses: data.slice(0, 5).map(d => ({ id: d.bookingId, status: d.status }))
        });
        
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
        data = await generateServiceFeesReport(dateFilter, filters);
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
        data = await generatePaymentsReport(dateFilter, filters);
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
        data = await generateComplianceReport(dateFilter, filters);
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
          generateServiceFeesReport(dateFilter, filters),
          generatePaymentsReport(dateFilter, filters)
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
      // Validate data before export - ensure ALL data is included (no slicing)
      if (!data || !Array.isArray(data)) {
        throw new Error(`Invalid data for ${reportType} report: data must be an array`);
      }
      
      if (data.length === 0) {
        throw new Error(`No data available for ${reportType} report with the selected filters`);
      }
      
      console.log(`generateReport - Exporting ${data.length} records for ${reportType} (ALL data included, no slicing)`);
      
      const reportTitle = filename.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      // Export ALL data - ensure no data is cut off
      await exportToPDF(data, headers, filename, reportTitle);
    }
  } catch (error) {
    throw error;
  }
};

