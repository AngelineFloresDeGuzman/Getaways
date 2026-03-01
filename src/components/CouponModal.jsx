import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Check } from 'lucide-react';
import { createCoupon, updateCoupon } from '@/pages/Host/services/couponService';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const CouponModal = ({ isOpen, onClose, coupon, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [hostListings, setHostListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [applyToAllListings, setApplyToAllListings] = useState(true);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    validFrom: '',
    validUntil: '',
    maxUses: '',
    minBookingAmount: '',
    active: true,
    listingIds: []
  });

  // Load host listings when modal opens
  useEffect(() => {
    if (isOpen && auth.currentUser) {
      loadHostListings();
    }
  }, [isOpen]);

  // Update form data when coupon changes
  useEffect(() => {
    if (coupon) {
      // Editing existing coupon
      const listingIds = coupon.listingIds || [];
      setFormData({
        code: coupon.code || '',
        description: coupon.description || '',
        discountType: coupon.discountType || 'percentage',
        discountValue: coupon.discountValue || '',
        validFrom: coupon.validFrom ? format(new Date(coupon.validFrom), 'yyyy-MM-dd') : '',
        validUntil: coupon.validUntil ? format(new Date(coupon.validUntil), 'yyyy-MM-dd') : '',
        maxUses: coupon.maxUses || '',
        minBookingAmount: coupon.minBookingAmount || '',
        active: coupon.active !== undefined ? coupon.active : true,
        listingIds: listingIds
      });
      // Set applyToAllListings based on whether listingIds is empty
      setApplyToAllListings(listingIds.length === 0);
    } else {
      // Creating new coupon
      setFormData({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        validFrom: format(new Date(), 'yyyy-MM-dd'),
        validUntil: '',
        maxUses: '',
        minBookingAmount: '',
        active: true,
        listingIds: []
      });
      setApplyToAllListings(true);
    }
  }, [coupon, isOpen]);

  // Load host's active listings
  const loadHostListings = async () => {
    if (!auth.currentUser) return;

    try {
      setLoadingListings(true);
      const listingsRef = collection(db, 'listings');
      
      let querySnapshot;
      try {
        const q = query(
          listingsRef,
          where('ownerId', '==', auth.currentUser.uid),
          where('status', '==', 'active')
        );
        querySnapshot = await getDocs(q);
      } catch (error) {
        // Fallback: query by ownerId only
        const q = query(
          listingsRef,
          where('ownerId', '==', auth.currentUser.uid)
        );
        querySnapshot = await getDocs(q);
      }

      const listings = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled Listing',
            location: data.location || data.locationData?.city || 'No location',
            status: data.status || 'unknown'
          };
        })
        .filter(listing => listing.status === 'active'); // Filter active listings

      setHostListings(listings);
    } catch (error) {
      toast.error('Failed to load listings');
      setHostListings([]);
    } finally {
      setLoadingListings(false);
    }
  };

  // Handle listing selection toggle
  const handleListingToggle = (listingId) => {
    const currentIds = formData.listingIds || [];
    if (currentIds.includes(listingId)) {
      // Remove listing
      setFormData({
        ...formData,
        listingIds: currentIds.filter(id => id !== listingId)
      });
    } else {
      // Add listing
      setFormData({
        ...formData,
        listingIds: [...currentIds, listingId]
      });
    }
  };

  // Handle "Apply to all listings" toggle
  const handleApplyToAllToggle = (checked) => {
    setApplyToAllListings(checked);
    if (checked) {
      // Clear selected listings (empty array = all listings)
      setFormData({
        ...formData,
        listingIds: []
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }

    if (!formData.discountValue || parseFloat(formData.discountValue) <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }

    if (formData.discountType === 'percentage' && parseFloat(formData.discountValue) > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }

    // Validate listing selection
    if (!applyToAllListings && (!formData.listingIds || formData.listingIds.length === 0)) {
      toast.error('Please select at least one listing or apply to all listings');
      return;
    }

    try {
      setLoading(true);

      // If "Apply to all listings" is checked, set listingIds to empty array
      const listingIds = applyToAllListings ? [] : formData.listingIds;

      const couponData = {
        code: formData.code.trim(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        validFrom: formData.validFrom || null,
        validUntil: formData.validUntil || null,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        minBookingAmount: parseFloat(formData.minBookingAmount) || 0,
        active: formData.active,
        listingIds: listingIds
      };

      if (coupon) {
        // Update existing coupon
        await updateCoupon(coupon.id, couponData);
        toast.success('Coupon updated successfully');
      } else {
        // Create new coupon
        await createCoupon(couponData);
        toast.success('Coupon created successfully');
      }

      onSave();
    } catch (error) {
      toast.error(error.message || 'Failed to save coupon');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="bg-white border border-border rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white z-10">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">
            {coupon ? 'Edit Coupon' : 'Create New Coupon'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {coupon ? 'Update your discount code' : 'Create a discount code for your listings'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Coupon Code */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Coupon Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="SUMMER2024"
            required
            disabled={!!coupon} // Can't change code when editing
          />
          <p className="text-xs text-muted-foreground mt-1">
            {coupon ? 'Coupon code cannot be changed after creation' : 'Code will be automatically converted to uppercase'}
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Summer promotion discount"
            rows={3}
          />
        </div>

        {/* Discount Type and Value */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Discount Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.discountType}
              onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₱)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Discount Value <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.discountValue}
              onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={formData.discountType === 'percentage' ? '10' : '500'}
              min="0"
              max={formData.discountType === 'percentage' ? '100' : undefined}
              step={formData.discountType === 'percentage' ? '1' : '0.01'}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.discountType === 'percentage' ? 'Maximum: 100%' : 'Fixed amount in pesos'}
            </p>
          </div>
        </div>

        {/* Valid From & Valid Until (Normal Calendar) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">Valid Period</label>
          <div className="flex justify-center w-full">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 w-full max-w-4xl mx-auto relative">
              <Calendar
                mode="range"
                selected={formData.validFrom && formData.validUntil ? { from: new Date(formData.validFrom), to: new Date(formData.validUntil) } : formData.validFrom ? { from: new Date(formData.validFrom) } : undefined}
                onSelect={(range) => {
                  if (range && range.from && range.to) {
                    setFormData({
                      ...formData,
                      validFrom: format(range.from, 'yyyy-MM-dd'),
                      validUntil: format(range.to, 'yyyy-MM-dd'),
                    });
                  } else if (range && range.from) {
                    setFormData({
                      ...formData,
                      validFrom: format(range.from, 'yyyy-MM-dd'),
                      validUntil: '',
                    });
                  }
                }}
                numberOfMonths={1}
                showOutsideDays={true}
                navLayout="around"
                fromDate={new Date()}
                className="w-full"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-8 sm:space-y-0 justify-center",
                  month: "space-y-4",
                  caption: "flex justify-between items-center pt-2 relative mb-4",
                  caption_label: "text-lg font-semibold text-gray-900 flex-1 text-center",
                  nav: "flex items-center",
                  nav_button: "h-8 w-8 bg-transparent border-0 p-0 opacity-70 hover:opacity-100 hover:bg-gray-100 rounded-md transition-all flex items-center justify-center text-gray-700 hover:text-gray-900",
                  nav_button_previous: "",
                  nav_button_next: "",
                  table: "w-full border-collapse space-y-2",
                  head_row: "flex mb-2",
                  head_cell: "text-gray-600 rounded-md w-10 h-10 font-medium text-xs flex items-center justify-center",
                  row: "flex w-full mt-1",
                  cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-10 w-10 p-0 font-normal rounded-md hover:bg-gray-100 transition-colors aria-selected:opacity-100",
                  day_range_end: "day-range-end rounded-r-md",
                  day_selected: "!bg-blue-500 !text-white hover:!bg-blue-600 hover:!text-white focus:!bg-blue-500 focus:!text-white font-semibold",
                  day_today: "bg-blue-50 text-blue-700 font-semibold border-2 border-blue-500",
                  day_outside: "day-outside text-gray-400 opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                  day_disabled: "!bg-amber-200 !text-amber-800 !opacity-75 !cursor-not-allowed hover:!bg-amber-200 !font-medium !border !border-amber-400 !line-through",
                  day_unavailable: "!bg-red-600 !text-white !line-through !opacity-100 !cursor-not-allowed hover:!bg-red-700 hover:!text-white !font-bold !border-2 !border-red-800 !shadow-lg !relative !z-10",
                  day_range_middle: "aria-selected:!bg-blue-200 aria-selected:!text-blue-900 rounded-none",
                  day_hidden: "invisible"
                }}
                components={{
                  IconLeft: () => <ChevronLeft className="h-5 w-5 text-gray-700" />,
                  IconRight: () => <ChevronRight className="h-5 w-5 text-gray-700" />
                }}
                disabled={{ before: new Date() }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Select start and end dates for coupon validity. Leave end date empty for no expiration.</p>
        </div>

        {/* Max Uses and Min Booking Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Maximum Uses
            </label>
            <input
              type="number"
              value={formData.maxUses}
              onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Unlimited"
              min="1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty for unlimited uses
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Minimum Booking Amount (₱)
            </label>
            <input
              type="number"
              value={formData.minBookingAmount}
              onChange={(e) => setFormData({ ...formData, minBookingAmount: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum booking total to use this coupon
            </p>
          </div>
        </div>

        {/* Listing Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground mb-2">
            Apply to Listings
          </label>
          
          {/* Apply to All Listings Toggle */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <input
              type="checkbox"
              id="applyToAll"
              checked={applyToAllListings}
              onChange={(e) => handleApplyToAllToggle(e.target.checked)}
              className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
            />
            <label htmlFor="applyToAll" className="text-sm font-medium text-foreground cursor-pointer flex-1">
              Apply to all listings
            </label>
          </div>

          {/* Specific Listings Selection */}
          {!applyToAllListings && (
            <div className="border border-border rounded-lg p-4 max-h-60 overflow-y-auto">
              {loadingListings ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading listings...</span>
                </div>
              ) : hostListings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active listings found. Create a listing first.
                </p>
              ) : (
                <div className="space-y-2">
                  {hostListings.map((listing) => {
                    const isSelected = formData.listingIds?.includes(listing.id);
                    return (
                      <label
                        key={listing.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-muted/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-center w-5 h-5 border-2 rounded border-border">
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleListingToggle(listing.id)}
                          className="hidden"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {listing.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {listing.location}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!applyToAllListings && formData.listingIds?.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {formData.listingIds.length} {formData.listingIds.length === 1 ? 'listing' : 'listings'} selected
            </p>
          )}
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="active"
            checked={formData.active}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
          />
          <label htmlFor="active" className="text-sm font-medium text-foreground cursor-pointer">
            Active (coupon can be used)
          </label>
        </div>

        {/* Current Uses (when editing) */}
        {coupon && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Current Uses:</span> {coupon.currentUses || 0}
              {coupon.maxUses && ` / ${coupon.maxUses}`}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {coupon ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {coupon ? 'Update Coupon' : 'Create Coupon'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CouponModal;

