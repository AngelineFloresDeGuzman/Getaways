import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, X, Plus, Minus, Sparkles, Camera, ChefHat, UtensilsCrossed, Heart, Dumbbell, Scissors, Waves, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const SearchBar = ({ category = 'accommodation', onSearch }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null); // 'where' | 'dates' | 'when' | 'who' | 'serviceType' | null
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [topListingLocations, setTopListingLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [searchData, setSearchData] = useState({
    location: searchParams.get('location') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    when: searchParams.get('when') || '',
    guests: parseInt(searchParams.get('guests') || '1', 10),
    adults: parseInt(searchParams.get('adults') || '1', 10),
    children: parseInt(searchParams.get('children') || '0', 10),
    infants: parseInt(searchParams.get('infants') || '0', 10),
    pets: parseInt(searchParams.get('pets') || '0', 10),
    serviceType: searchParams.get('serviceType') || '',
  });

  // Load top listing locations
  useEffect(() => {
    const loadTopListingLocations = async () => {
      try {
        setLoadingLocations(true);
        const listingsRef = collection(db, 'listings');
        
        // Try to get top 8 listings ordered by publishedAt, filtered by category
        let querySnapshot;
        try {
          const q = query(
            listingsRef,
            where('category', '==', category),
            where('status', '==', 'active'),
            orderBy('publishedAt', 'desc'),
            limit(8)
          );
          querySnapshot = await getDocs(q);
        } catch (indexError) {
          console.warn('⚠️ Index error, trying without orderBy:', indexError.message);
          try {
            // Fallback: query without orderBy, limit to 8
            const q = query(
              listingsRef,
              where('category', '==', category),
              where('status', '==', 'active'),
              limit(8)
            );
            querySnapshot = await getDocs(q);
          } catch (error2) {
            console.warn('⚠️ Index error for status, querying by category only:', error2.message);
            // Final fallback: query by category only, filter status in JavaScript
            const q = query(
              listingsRef,
              where('category', '==', category),
              limit(8)
            );
            querySnapshot = await getDocs(q);
          }
        }

        const locations = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Filter by status if we had to query without status filter
          if (data.status !== 'active') return;
          
          const locationData = data.locationData || {};
          
          // Format location as "municipality, province/city, country"
          const parts = [];
          
          // Add municipality/barangay if available
          if (locationData.barangay) {
            parts.push(locationData.barangay);
          } else if (locationData.municipality) {
            parts.push(locationData.municipality);
          }
          
          // Add city or province
          if (locationData.city) {
            parts.push(locationData.city);
          } else if (locationData.province) {
            parts.push(locationData.province);
          }
          
          // Add country
          if (locationData.country) {
            parts.push(locationData.country);
          }
          
          // If no structured location data, use the location field
          if (parts.length === 0 && data.location) {
            parts.push(data.location);
          }
          
          // Only add if we have at least one part
          if (parts.length > 0) {
            const formattedLocation = parts.join(', ');
            // Avoid duplicates
            if (!locations.includes(formattedLocation)) {
              locations.push(formattedLocation);
            }
          }
        });

        // Limit to 8 unique locations
        setTopListingLocations(locations.slice(0, 8));
      } catch (error) {
        console.error('Error loading top listing locations:', error);
        setTopListingLocations([]);
      } finally {
        setLoadingLocations(false);
      }
    };

    loadTopListingLocations();
  }, [category]);

  // Update search data when URL params change
  useEffect(() => {
    const location = searchParams.get('location') || '';
    const checkIn = searchParams.get('checkIn') || '';
    const checkOut = searchParams.get('checkOut') || '';
    const when = searchParams.get('when') || '';
    const guests = parseInt(searchParams.get('guests') || '1', 10);
    const adults = parseInt(searchParams.get('adults') || '1', 10);
    const children = parseInt(searchParams.get('children') || '0', 10);
    const infants = parseInt(searchParams.get('infants') || '0', 10);
    const pets = parseInt(searchParams.get('pets') || '0', 10);
    const serviceType = searchParams.get('serviceType') || '';

    setSearchData({
      location,
      checkIn,
      checkOut,
      when,
      guests,
      adults,
      children,
      infants,
      pets,
      serviceType,
    });
  }, [searchParams]);

  const totalGuests = searchData.adults + searchData.children + searchData.infants;

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    if (searchData.location) params.set('location', searchData.location);
    if (searchData.checkIn) params.set('checkIn', searchData.checkIn);
    if (searchData.checkOut) params.set('checkOut', searchData.checkOut);
    if (searchData.when) params.set('when', searchData.when);
    if (searchData.guests > 1) params.set('guests', searchData.guests.toString());
    if (searchData.adults > 1) params.set('adults', searchData.adults.toString());
    if (searchData.children > 0) params.set('children', searchData.children.toString());
    if (searchData.infants > 0) params.set('infants', searchData.infants.toString());
    if (searchData.pets > 0) params.set('pets', searchData.pets.toString());
    if (searchData.serviceType) params.set('serviceType', searchData.serviceType);

    const queryString = params.toString();
    navigate(`${window.location.pathname}${queryString ? `?${queryString}` : ''}`);
    setActiveModal(null);
    
    if (onSearch) {
      onSearch(searchData);
    }
  };

  const filteredDestinations = topListingLocations.filter(loc =>
    loc.toLowerCase().includes(searchData.location.toLowerCase())
  );

  return (
    <div className="relative flex-1 max-w-4xl mx-auto">
      {/* Search Bar */}
      <div className={`grid grid-cols-1 gap-1.5 bg-white rounded-2xl shadow-medium p-1.5 ${category === 'accommodation' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        {/* Location */}
        <div
          className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={() => setActiveModal('where')}
        >
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs text-foreground">Where</p>
            <p className="text-muted-foreground text-xs truncate">
              {searchData.location || 'Search destinations'}
            </p>
          </div>
        </div>

        {/* Check-in - Only show for accommodations */}
        {category === 'accommodation' && (
          <>
            <div
              className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border-l border-border"
              onClick={() => setActiveModal('dates')}
            >
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs text-foreground">Check-in</p>
                <p className="text-muted-foreground text-xs truncate">
                  {searchData.checkIn ? format(new Date(searchData.checkIn), 'MMM dd') : 'Add dates'}
                </p>
              </div>
            </div>

            {/* Check-out */}
            <div
              className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border-l border-border"
              onClick={() => setActiveModal('dates')}
            >
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs text-foreground">Check-out</p>
                <p className="text-muted-foreground text-xs truncate">
                  {searchData.checkOut ? format(new Date(searchData.checkOut), 'MMM dd') : 'Add dates'}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Experiences & Services: Check-in */}
        {(category === 'experience' || category === 'service') && (
          <>
            <div
              className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border-l border-border"
              onClick={() => setActiveModal('dates')}
            >
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs text-foreground">Check-in</p>
                <p className="text-muted-foreground text-xs truncate">
                  {searchData.checkIn ? format(new Date(searchData.checkIn), 'MMM dd') : 'Add dates'}
                </p>
              </div>
            </div>

            {/* Check-out */}
            <div
              className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border-l border-border"
              onClick={() => setActiveModal('dates')}
            >
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs text-foreground">Check-out</p>
                <p className="text-muted-foreground text-xs truncate">
                  {searchData.checkOut ? format(new Date(searchData.checkOut), 'MMM dd') : 'Add dates'}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Experiences: Who */}
        {category === 'experience' && (
          <div className="flex items-center justify-between p-2.5 border-l border-border">
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer"
              onClick={() => setActiveModal('who')}
            >
              <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs text-foreground">Who</p>
                <p className="text-muted-foreground text-xs truncate">
                  {totalGuests > 0 ? `${totalGuests} ${totalGuests === 1 ? 'guest' : 'guests'}` : 'Add guests'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveModal(null);
                handleSearch();
              }}
              className="btn-primary p-2 rounded-full flex-shrink-0 ml-2"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Services: Type of Service */}
        {category === 'service' && (
          <div className="flex items-center justify-between p-2.5 border-l border-border">
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer"
              onClick={() => setActiveModal('serviceType')}
            >
              <Sparkles className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs text-foreground">Type of Service</p>
                <p className="text-muted-foreground text-xs truncate">
                  {searchData.serviceType || 'Select service type'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveModal(null);
                handleSearch();
              }}
              className="btn-primary p-2 rounded-full flex-shrink-0 ml-2"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Accommodations: Who */}
        {category === 'accommodation' && (
          <div className="flex items-center justify-between p-2.5 border-l border-border">
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer"
              onClick={() => setActiveModal('who')}
            >
              <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs text-foreground">Who</p>
                <p className="text-muted-foreground text-xs truncate">
                  {totalGuests > 0 ? `${totalGuests} ${totalGuests === 1 ? 'guest' : 'guests'}` : 'Add guests'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveModal(null);
                handleSearch();
              }}
              className="btn-primary p-2 rounded-full flex-shrink-0 ml-2"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Where Modal */}
      {activeModal === 'where' && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-xl z-50 max-h-[80vh] overflow-y-auto"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Where to?
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search destinations"
                  value={searchData.location}
                  onChange={(e) => {
                    setSearchData({ ...searchData, location: e.target.value });
                    setShowLocationSuggestions(true);
                  }}
                  onFocus={() => setShowLocationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
                {showLocationSuggestions && filteredDestinations.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                    {filteredDestinations.map((loc, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchData({ ...searchData, location: loc });
                          setShowLocationSuggestions(false);
                          setActiveModal(null);
                          handleSearch();
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted transition-colors text-sm"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                )}
                {showLocationSuggestions && filteredDestinations.length === 0 && searchData.location && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-lg z-20 p-4">
                    <p className="text-sm text-muted-foreground">No matching locations found</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSearchData({ ...searchData, location: '' });
                  }}
                  className="px-4 py-2 text-sm border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
      )}

      {/* Dates Modal - For all categories */}
      {activeModal === 'dates' && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-xl z-50 max-h-[80vh] overflow-y-auto"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                When?
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Check-in</label>
                  <input
                    type="date"
                    value={searchData.checkIn}
                    onChange={(e) => {
                      const newCheckIn = e.target.value;
                      setSearchData({ ...searchData, checkIn: newCheckIn });
                      // Auto-close modal and search when both dates are selected
                      if (searchData.checkOut && newCheckIn) {
                        setTimeout(() => {
                          setActiveModal(null);
                          handleSearch();
                        }, 300);
                      }
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Check-out</label>
                  <input
                    type="date"
                    value={searchData.checkOut}
                    onChange={(e) => {
                      const newCheckOut = e.target.value;
                      setSearchData({ ...searchData, checkOut: newCheckOut });
                      // Auto-close modal and search when both dates are selected
                      if (searchData.checkIn && newCheckOut) {
                        setTimeout(() => {
                          setActiveModal(null);
                          handleSearch();
                        }, 300);
                      }
                    }}
                    min={searchData.checkIn || new Date().toISOString().split('T')[0]}
                    className="w-full p-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSearchData({ ...searchData, checkIn: '', checkOut: '' });
                  }}
                  className="px-4 py-2 text-sm border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
      )}

      {/* Who Modal */}
      {activeModal === 'who' && (
        <div
          className="absolute top-full right-0 mt-2 bg-white border border-border rounded-xl shadow-xl z-50 w-full max-w-md max-h-[80vh] overflow-y-auto"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Who's coming?
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Adults</p>
                    <p className="text-sm text-muted-foreground">Ages 13+</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (searchData.adults > 1) {
                          setSearchData({ ...searchData, adults: searchData.adults - 1 });
                        }
                      }}
                      disabled={searchData.adults <= 1}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-medium text-lg">{searchData.adults}</span>
                    <button
                      type="button"
                      onClick={() => setSearchData({ ...searchData, adults: searchData.adults + 1 })}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Children</p>
                    <p className="text-sm text-muted-foreground">Ages 2-12</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (searchData.children > 0) {
                          setSearchData({ ...searchData, children: searchData.children - 1 });
                        }
                      }}
                      disabled={searchData.children <= 0}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-medium text-lg">{searchData.children}</span>
                    <button
                      type="button"
                      onClick={() => setSearchData({ ...searchData, children: searchData.children + 1 })}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Infants</p>
                    <p className="text-sm text-muted-foreground">Under 2</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (searchData.infants > 0) {
                          setSearchData({ ...searchData, infants: searchData.infants - 1 });
                        }
                      }}
                      disabled={searchData.infants <= 0}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-medium text-lg">{searchData.infants}</span>
                    <button
                      type="button"
                      onClick={() => setSearchData({ ...searchData, infants: searchData.infants + 1 })}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {category === 'accommodation' && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Pets</p>
                      <p className="text-sm text-muted-foreground">Bringing a pet?</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (searchData.pets > 0) {
                            setSearchData({ ...searchData, pets: searchData.pets - 1 });
                          }
                        }}
                        disabled={searchData.pets <= 0}
                        className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-medium text-lg">{searchData.pets}</span>
                      <button
                        type="button"
                        onClick={() => setSearchData({ ...searchData, pets: searchData.pets + 1 })}
                        className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-medium text-foreground">
                    Total guests: {totalGuests}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSearchData({
                      ...searchData,
                      adults: 1,
                      children: 0,
                      infants: 0,
                      pets: 0,
                    });
                  }}
                  className="px-4 py-2 text-sm border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
      )}


      {/* Service Type Modal - Only for services */}
      {activeModal === 'serviceType' && category === 'service' && (
        <div
          className="absolute top-full right-0 mt-2 bg-white border border-border rounded-xl shadow-xl z-50 w-full max-w-sm max-h-[60vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h2 className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Type of Service
            </h2>
            <button
              onClick={() => setActiveModal(null)}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Photography', icon: Camera },
                { name: 'Chefs', icon: ChefHat },
                { name: 'Prepared meals', icon: UtensilsCrossed },
                { name: 'Massage', icon: Heart },
                { name: 'Training', icon: Dumbbell },
                { name: 'Makeup', icon: Sparkles },
                { name: 'Hair', icon: Scissors },
                { name: 'Spa treatments', icon: Waves },
                { name: 'Catering', icon: ChefHat },
                { name: 'Nails', icon: Circle }
              ].map((service) => {
                const Icon = service.icon;
                return (
                  <button
                    key={service.name}
                    type="button"
                    onClick={() => {
                      setSearchData({ ...searchData, serviceType: service.name });
                      setActiveModal(null);
                      handleSearch();
                    }}
                    className={`w-full text-center px-3 py-2.5 rounded-lg border transition-colors flex flex-col items-center justify-center gap-1.5 text-sm ${
                      searchData.serviceType === service.name
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:bg-muted text-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-xs">{service.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setSearchData({ ...searchData, serviceType: '' });
                }}
                className="px-3 py-1.5 text-xs border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
