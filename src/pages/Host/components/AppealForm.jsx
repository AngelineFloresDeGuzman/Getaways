import React, { useState } from 'react';
import { submitAppeal } from '../services/appealService';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertDialogCancel, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

const AppealForm = ({ hostId, hostEmail, hostName, onSuccess, onCancel }) => {
  const [reason, setReason] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for your appeal');
      return;
    }

    if (reason.trim().length < 20) {
      setError('Please provide a more detailed reason (at least 20 characters)');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await submitAppeal(hostId, hostEmail, hostName, reason.trim(), additionalInfo.trim());
      onSuccess();
    } catch (err) {
      console.error('Error submitting appeal:', err);
      setError('Failed to submit appeal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
      <div>
        <Label htmlFor="reason" className="text-foreground font-semibold">
          Reason for Appeal <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError('');
          }}
          placeholder="Please explain why you believe your account termination was made in error. Provide as much detail as possible."
          className="mt-2 min-h-[120px]"
          required
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Minimum 20 characters. {reason.length}/20
        </p>
      </div>

      <div>
        <Label htmlFor="additionalInfo" className="text-foreground font-semibold">
          Additional Information (Optional)
        </Label>
        <Textarea
          id="additionalInfo"
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          placeholder="Any additional information that might help with the review process..."
          className="mt-2 min-h-[100px]"
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <AlertDialogFooter className="gap-2">
        <AlertDialogCancel onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </AlertDialogCancel>
        <Button
          type="submit"
          disabled={isSubmitting || !reason.trim() || reason.trim().length < 20}
          className="bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Appeal'
          )}
        </Button>
      </AlertDialogFooter>
    </form>
  );
};

export default AppealForm;

