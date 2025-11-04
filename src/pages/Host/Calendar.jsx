import React, { useState, useEffect, useCallback } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ChevronDown, ChevronLeft, ChevronRight, Infinity, Grid, Plus } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

// Month/Year Picker Component
const MonthYearPicker = ({ pickerDate, goToPreviousMonth, goToNextMonth, onDateSelect, bookedDates, isToday }) => {
  const pickerMonth = pickerDate.toLocaleString('default', { month: 'long' });
  const pickerYear = pickerDate.getFullYear();
  
  // Get first day of month and number of days
  const firstDayOfMonth = new Date(pickerYear, pickerDate.getMonth(), 1);
  const lastDayOfMonth = new Date(pickerYear, pickerDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(pickerYear, pickerDate.getMonth(), day));
  }

  // Fill remaining cells to make a complete grid (6 rows × 7 days = 42 cells)
  const totalCells = calendarDays.length;
  const remainingCells = 42 - totalCells;
  for (let i = 0; i < remainingCells; i++) {
    calendarDays.push(null);
  }

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  const isBooked = (date) => {
    if (!date) return false;
    const dateKey = date.toISOString().split('T')[0];
    return bookedDates.has(dateKey);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-base font-semibold text-gray-800">
          {pickerMonth} {pickerYear}
        </div>
        <button
          onClick={goToNextMonth}
          className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {daysOfWeek.map((day, index) => (
          <div
            key={index}
            className="text-xs font-medium text-gray-600 text-center py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          if (!date) {
            return (
              <div
                key={`empty-${index}`}
                className="aspect-square rounded"
              />
            );
          }

          const isTodayDate = isToday(date);
          const isBookedDate = isBooked(date);

          return (
            <button
              key={`date-${index}`}
              onClick={() => onDateSelect(date)}
              className={`
                aspect-square rounded
                hover:bg-gray-100
                transition-colors relative
                ${isBookedDate ? 'bg-blue-50' : ''}
              `}
            >
              <div className="absolute top-1 left-1">
                <span className={`text-xs font-normal ${
                  isBookedDate ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {date.getDate()}
                </span>
              </div>
              {isTodayDate && (
                <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookedDates, setBookedDates] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [monthYearPickerOpen, setMonthYearPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month'); // 'day', 'week', or 'month'

  // Get month and year
  const month = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  // Get week dates (Sunday to Saturday of current week)
  const getWeekDates = () => {
    const weekStart = new Date(currentDate);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day; // Get Sunday of the week
    weekStart.setDate(diff);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(year, currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 6 = Saturday

  // Get today's date for highlighting
  const today = new Date();
  const isToday = (date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Navigate based on view type
  const goToPrevious = () => {
    if (calendarView === 'day') {
      const prevDay = new Date(currentDate);
      prevDay.setDate(prevDay.getDate() - 1);
      setCurrentDate(prevDay);
    } else if (calendarView === 'week') {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    } else {
      setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
    }
  };

  const goToNext = () => {
    if (calendarView === 'day') {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setCurrentDate(nextDay);
    } else if (calendarView === 'week') {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    } else {
      setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
    }
  };

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Picker navigation functions
  const goToPreviousMonthInPicker = () => {
    setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1));
  };

  const goToNextMonthInPicker = () => {
    setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1));
  };

  // Handle date selection from picker
  const handlePickerDateSelect = (date) => {
    setCurrentDate(date);
    setSelectedDate(date);
    setMonthYearPickerOpen(false);
  };

  // Sync picker date with current date when popover opens
  useEffect(() => {
    if (monthYearPickerOpen) {
      setPickerDate(new Date(currentDate));
    }
  }, [monthYearPickerOpen, currentDate]);

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, currentDate.getMonth(), day));
  }

  // Get previous month's days to fill the last row if needed
  const totalCells = calendarDays.length;
  const remainingCells = 42 - totalCells; // 6 rows × 7 days = 42 cells
  for (let i = 0; i < remainingCells; i++) {
    calendarDays.push(null);
  }

  // Process bookings data and update state
  const processBookingsData = useCallback((bookingsData) => {
    // Only include confirmed bookings (same as guest calendar)
    // This ensures all calendars match based on confirmed status bookings from Firebase
    const allBookings = bookingsData.filter(
      booking => booking.status === 'confirmed'
    );

    setBookings(allBookings);

    // Generate set of all booked dates from ALL listings
    const datesSet = new Set();
    allBookings.forEach(booking => {
      // Convert Firestore timestamps to Date objects
      const checkIn = booking.checkInDate?.toDate ? booking.checkInDate.toDate() : new Date(booking.checkInDate);
      const checkOut = booking.checkOutDate?.toDate ? booking.checkOutDate.toDate() : new Date(booking.checkOutDate);
      
      // Normalize dates to midnight LOCAL TIME (not UTC) for accurate comparison
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);

      // Add all dates between check-in (inclusive) and check-out (exclusive)
      // Use local date string format (YYYY-MM-DD) to avoid timezone issues
      const currentDate = new Date(checkIn);
      while (currentDate < checkOut) {
        // Use local date components to avoid timezone conversion issues
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        datesSet.add(dateKey);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    setBookedDates(datesSet);
    setLoading(false);

    console.log('✅ Calendar: Updated bookings -', allBookings.length, 'bookings,', datesSet.size, 'booked dates');
  }, []);

  // Load bookings with real-time updates
  const loadBookings = useCallback(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return () => {}; // Return empty cleanup function
    }

    console.log('📅 Calendar: Setting up real-time listener for bookings from all listings...');

    const bookingsCollection = collection(db, 'bookings');
    const listingsCollection = collection(db, 'listings');
    
    const unsubscribeRef = { current: null };

    // First, get all listings owned by this host, then set up bookings listener
    const setupBookingsListener = async () => {
      try {
        // Get all host's listings
        const listingsQuery = query(
          listingsCollection,
          where('ownerId', '==', auth.currentUser.uid)
        );
        
        let listingsSnapshot;
        try {
          listingsSnapshot = await getDocs(listingsQuery);
        } catch (listingsError) {
          console.error('❌ Error getting listings:', listingsError);
          listingsSnapshot = { docs: [] };
        }

        const hostListingIds = listingsSnapshot.docs.map(doc => doc.id);
        console.log('📅 Calendar: Found', hostListingIds.length, 'listings for host:', hostListingIds);

        // Query bookings by ownerId (this should get all bookings for host's listings)
        // Note: We're NOT using orderBy to avoid index requirements
        const ownerIdQuery = query(
          bookingsCollection,
          where('ownerId', '==', auth.currentUser.uid)
        );

        // Process booking data helper
        const processBookingSnapshot = (querySnapshot, listingIds) => {
          console.log('📅 Calendar: Received', querySnapshot.docs.length, 'bookings from snapshot');
          
          const bookingsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const checkIn = data.checkInDate?.toDate ? data.checkInDate.toDate() : new Date(data.checkInDate);
            const checkOut = data.checkOutDate?.toDate ? data.checkOutDate.toDate() : new Date(data.checkOutDate);

            return {
              id: doc.id,
              ...data,
              checkInDate: checkIn,
              checkOutDate: checkOut,
            };
          });

          // Filter to only include bookings for host's listings (double-check using closure)
          const filteredBookings = bookingsData.filter(booking => {
            // Booking should have ownerId matching host OR listingId matching host's listings
            const matchesOwnerId = booking.ownerId === auth.currentUser.uid;
            const matchesListing = listingIds.includes(booking.listingId);
            const shouldInclude = matchesOwnerId || matchesListing;
            
            if (!shouldInclude) {
              console.warn('⚠️ Calendar: Booking filtered out:', {
                bookingId: booking.id,
                bookingOwnerId: booking.ownerId,
                hostId: auth.currentUser.uid,
                bookingListingId: booking.listingId,
                hostListingIds: listingIds
              });
            }
            
            return shouldInclude;
          });

          console.log('📅 Calendar: Filtered to', filteredBookings.length, 'bookings for host\'s listings');
          if (filteredBookings.length > 0) {
            console.log('📅 Calendar: Bookings details:', filteredBookings.map(b => ({
              id: b.id,
              listingId: b.listingId,
              ownerId: b.ownerId,
              status: b.status,
              checkIn: b.checkInDate?.toISOString?.() || b.checkInDate,
              checkOut: b.checkOutDate?.toISOString?.() || b.checkOutDate
            })));
          } else {
            console.warn('⚠️ Calendar: No bookings found! Check if bookings have correct ownerId or listingId');
            console.log('📅 Calendar: Host ID:', auth.currentUser.uid);
            console.log('📅 Calendar: Host listing IDs:', listingIds);
            console.log('📅 Calendar: All bookings received:', bookingsData.map(b => ({
              id: b.id,
              listingId: b.listingId,
              ownerId: b.ownerId,
              status: b.status
            })));
          }

          // Sort by createdAt descending in JavaScript
          filteredBookings.sort((a, b) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return bDate - aDate;
          });

          processBookingsData(filteredBookings);
        };

        // Use onSnapshot for real-time updates
        // Check if onSnapshot is available
        if (typeof onSnapshot === 'undefined') {
          console.error('❌ onSnapshot is not available. Falling back to getDocs with polling...');
          // Fallback: use getDocs with polling
          const pollBookings = async () => {
            try {
              const snapshot = await getDocs(ownerIdQuery);
              processBookingSnapshot(snapshot, hostListingIds);
            } catch (err) {
              console.error('❌ Error in fallback getDocs:', err);
              setBookings([]);
              setBookedDates(new Set());
              setLoading(false);
            }
          };
          // Initial load
          pollBookings();
          // Poll every 5 seconds
          const pollInterval = setInterval(pollBookings, 5000);
          unsubscribeRef.current = () => clearInterval(pollInterval);
        } else {
          try {
            unsubscribeRef.current = onSnapshot(ownerIdQuery, 
              (querySnapshot) => {
                processBookingSnapshot(querySnapshot, hostListingIds);
              },
              (error) => {
                console.error('❌ Error in bookings snapshot:', error);
                // If it's an index error, that's okay - we'll just work without it
                if (error.code === 'failed-precondition' || error.message?.includes('index')) {
                  console.warn('⚠️ Index error (expected), continuing without index...');
                  // Still try to process what we have
                  setBookings([]);
                  setBookedDates(new Set());
                  setLoading(false);
                } else {
                  setBookings([]);
                  setBookedDates(new Set());
                  setLoading(false);
                }
              }
            );
          } catch (snapshotError) {
            console.error('❌ Error setting up onSnapshot:', snapshotError);
            // Fallback: use getDocs
            getDocs(ownerIdQuery).then(snapshot => {
              processBookingSnapshot(snapshot, hostListingIds);
            }).catch(err => {
              console.error('❌ Error in fallback getDocs:', err);
              setBookings([]);
              setBookedDates(new Set());
              setLoading(false);
            });
          }
        }
      } catch (listingsError) {
        console.error('❌ Error setting up bookings listener:', listingsError);
        setLoading(false);
      }
    };

    // Set up listener
    setupBookingsListener();

    // Return cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [processBookingsData]);

  // Load bookings when user is available
  useEffect(() => {
    let unsubscribeBookings = null;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        unsubscribeBookings = loadBookings();
      } else {
        setBookings([]);
        setBookedDates(new Set());
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeBookings) {
        unsubscribeBookings();
      }
    };
  }, [loadBookings]);

  // Helper function to check if a date is booked
  const isBooked = (date) => {
    if (!date) return false;
    // Use local date components to match how we store dates (avoid timezone issues)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    return bookedDates.has(dateKey);
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDateClick = (date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  // Helper to format time (12-hour format)
  const formatTime = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Get bookings for a specific date
  const getBookingsForDate = (date) => {
    if (!date) return [];
    // Use local date components to match how we store dates (avoid timezone issues)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    
    return bookings.filter(booking => {
      const checkIn = booking.checkInDate?.toDate ? booking.checkInDate.toDate() : new Date(booking.checkInDate);
      const checkOut = booking.checkOutDate?.toDate ? booking.checkOutDate.toDate() : new Date(booking.checkOutDate);
      
      // Normalize to midnight local time
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      // Convert to local date strings
      const checkInYear = checkIn.getFullYear();
      const checkInMonth = String(checkIn.getMonth() + 1).padStart(2, '0');
      const checkInDay = String(checkIn.getDate()).padStart(2, '0');
      const checkInKey = `${checkInYear}-${checkInMonth}-${checkInDay}`;
      
      const checkOutYear = checkOut.getFullYear();
      const checkOutMonth = String(checkOut.getMonth() + 1).padStart(2, '0');
      const checkOutDay = String(checkOut.getDate()).padStart(2, '0');
      const checkOutKey = `${checkOutYear}-${checkOutMonth}-${checkOutDay}`;
      
      return dateKey >= checkInKey && dateKey < checkOutKey;
    });
  };

  // Get bookings for a time slot (for Day/Week views)
  const getBookingsForTimeSlot = (date, hour) => {
    const dateBookings = getBookingsForDate(date);
    // For now, return all bookings for the day (can be enhanced to filter by hour)
    return dateBookings;
  };

  // Generate time slots (5 AM to 11 PM)
  const timeSlots = [];
  for (let hour = 5; hour <= 23; hour++) {
    timeSlots.push(hour);
  }

  // Render Day View
  const renderDayView = () => {
    const dayDate = currentDate;
    const dayName = dayDate.toLocaleString('default', { weekday: 'short' });
    const dayNumber = dayDate.getDate();
    
    return (
      <>
        {/* Day Header */}
        <div className="mb-4">
          <div className="text-lg font-semibold text-gray-800">
            {dayName} {dayNumber}
          </div>
        </div>

        {/* Day Calendar with Time Slots */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex">
            {/* Time Column */}
            <div className="w-20 border-r border-gray-200 bg-gray-50">
              <div className="h-12 border-b border-gray-200"></div>
              {timeSlots.map((hour) => (
                <div
                  key={hour}
                  className="h-16 border-b border-gray-200 flex items-start justify-end pr-2 pt-1"
                >
                  <span className="text-xs text-gray-600">{formatTime(hour)}</span>
      </div>
              ))}
          </div>

            {/* Day Column */}
            <div className="flex-1">
              <div className="h-12 border-b border-gray-200 bg-gray-50 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {dayDate.toLocaleDateString('default', { month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="relative">
                {timeSlots.map((hour, index) => {
                  const slotBookings = getBookingsForTimeSlot(dayDate, hour);
                return (
                    <div
                      key={hour}
                      className="h-16 border-b border-gray-200 relative hover:bg-gray-50 cursor-pointer"
                    >
                      {slotBookings.length > 0 && index === 0 && (
                        <div className="absolute left-0 top-0 right-0 h-full bg-red-200 border-l-4 border-red-500 px-2 py-1 flex items-center">
                          <span className="text-xs font-medium text-red-800">
                            {slotBookings.length} booking{slotBookings.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                          </div>
                        </div>
                      </div>
                    </div>
      </>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const weekDates = getWeekDates();
    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <>
        {/* Week Header */}
        <div className="mb-4">
          <div className="grid grid-cols-8 gap-0 border border-gray-200 rounded-t-lg overflow-hidden">
            <div className="w-20 border-r border-gray-200 bg-gray-50"></div>
            {weekDates.map((date, index) => {
              const dayName = shortDays[index];
              const dayNumber = date.getDate();
              const isTodayDate = isToday(date);
              return (
                <div
                  key={index}
                  className={`flex-1 border-r border-gray-200 bg-gray-50 p-2 text-center last:border-r-0 ${
                    isTodayDate ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="text-xs font-medium text-gray-600">{dayName}</div>
                  <div className={`text-sm font-semibold ${isTodayDate ? 'text-blue-700' : 'text-gray-800'}`}>
                    {dayNumber}
                  </div>
                </div>
              );
            })}
                      </div>
                    </div>

        {/* Week Calendar with Time Slots */}
        <div className="border border-gray-200 border-t-0 rounded-b-lg overflow-hidden">
          <div className="flex">
            {/* Time Column */}
            <div className="w-20 border-r border-gray-200 bg-gray-50">
              {timeSlots.map((hour) => (
                <div
                  key={hour}
                  className="h-16 border-b border-gray-200 flex items-start justify-end pr-2 pt-1"
                >
                  <span className="text-xs text-gray-600">{formatTime(hour)}</span>
                </div>
              ))}
            </div>

            {/* Days Columns */}
            <div className="flex-1 grid grid-cols-7">
              {weekDates.map((date, dayIndex) => (
                <div key={dayIndex} className="border-r border-gray-200 last:border-r-0">
                  {timeSlots.map((hour, slotIndex) => {
                    const slotBookings = getBookingsForTimeSlot(date, hour);
                    const isTodayDate = isToday(date);
                    return (
                      <div
                        key={`${dayIndex}-${hour}`}
                        className={`h-16 border-b border-gray-200 relative hover:bg-gray-50 cursor-pointer ${
                          isTodayDate ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        {slotBookings.length > 0 && slotIndex === 0 && (
                          <div className="absolute left-0 top-0 right-0 h-8 bg-red-200 border-l-4 border-red-500 px-2 py-1 flex items-center">
                            <span className="text-xs font-medium text-red-800 truncate">
                              Booking
                                </span>
                              </div>
                        )}
                      </div>
                    );
                  })}
                                </div>
              ))}
                                </div>
                              </div>
                            </div>
      </>
    );
  };

  // Render Month View (existing)
  const renderMonthView = () => (
    <>
      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-0 mb-2">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-xs font-medium text-gray-600 text-center py-2"
          >
            {day}
                          </div>
                        ))}
                      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          if (!date) {
            return (
              <div
                key={`empty-${index}`}
                className="aspect-square rounded border border-transparent"
              />
            );
          }

          const isTodayDate = isToday(date);
          const isSelected = selectedDate && 
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
          const isBookedDate = isBooked(date);

          return (
            <button
              key={`date-${index}`}
              onClick={() => handleDateClick(date)}
              className={`
                aspect-square rounded border border-gray-200 
                hover:border-gray-300 hover:bg-gray-50
                transition-colors relative
                ${isBookedDate ? 'bg-blue-50 border-blue-300' : 'bg-white'}
                ${isSelected ? 'ring-2 ring-blue-500' : ''}
              `}
              title={isBookedDate ? 'Booked' : ''}
            >
              <div className="absolute top-2 left-2 flex items-center justify-center">
                {isTodayDate && (
                  <div className="absolute w-2.5 h-2.5 bg-red-500 rounded-full" />
                )}
                {isBookedDate && !isTodayDate && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                )}
                <span className={`text-sm font-normal leading-none relative ${
                  isBookedDate ? 'text-blue-700 font-medium' : 'text-gray-700'
                }`}>
                  {date.getDate()}
                </span>
                    </div>
            </button>
                );
              })}
            </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36 pb-12">
        <div className="max-w-5xl mx-auto px-6">
          {/* Calendar Container */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              {/* Left: Month/Year with navigation arrows */}
              <div className="flex items-center gap-4">
                <button
                  onClick={goToPrevious}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <Popover open={monthYearPickerOpen} onOpenChange={setMonthYearPickerOpen}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-2 text-lg font-semibold text-gray-800 hover:text-gray-900">
                        {calendarView === 'day' 
                          ? `${currentDate.toLocaleString('default', { weekday: 'short' })} ${currentDate.getDate()}`
                          : calendarView === 'week'
                          ? `Week of ${getWeekDates()[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })}`
                          : `${month} ${year}`}
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <MonthYearPicker
                        pickerDate={pickerDate}
                        goToPreviousMonth={goToPreviousMonthInPicker}
                        goToNextMonth={goToNextMonthInPicker}
                        onDateSelect={handlePickerDateSelect}
                        bookedDates={bookedDates}
                        isToday={isToday}
                      />
                    </PopoverContent>
                  </Popover>
                  <button
                    onClick={goToNext}
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    aria-label="Next"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded border border-gray-300 hover:border-gray-400">
                      {calendarView.charAt(0).toUpperCase() + calendarView.slice(1)}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup value={calendarView} onValueChange={setCalendarView}>
                      <DropdownMenuRadioItem value="day">Day</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="week">Week</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="month">Month</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
                  <Infinity className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
                  <Grid className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Calendar Views */}
            {calendarView === 'day' && renderDayView()}
            {calendarView === 'week' && renderWeekView()}
            {calendarView === 'month' && renderMonthView()}

            {/* Today Button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={goToToday}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              >
                Today
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CalendarPage;