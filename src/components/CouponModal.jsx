import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { createCoupon, updateCoupon } from '@/pages/Host/services/couponService';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';

const CouponModal = ({ isOpen, onClose, coupon, onSave }) => {
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    if (coupon) {
      // Editing existing coupon
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
        listingIds: coupon.listingIds || []
      });
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
    }
  }, [coupon, isOpen]);

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

    try {
      setLoading(true);

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
        listingIds: formData.listingIds
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
      console.error('Error saving coupon:', error);
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

        {/* Valid From and Valid Until */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Valid From
            </label>
            <input
              type="date"
              value={formData.validFrom}
              onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Valid Until
            </label>
            <input
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              min={formData.validFrom || format(new Date(), 'yyyy-MM-dd')}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty for no expiration
            </p>
          </div>
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

