import React, { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

const WishlistSection = ({ listingId, listingTitle, listingType, hostName }) => {
  const [wish, setWish] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = auth.currentUser;

  const handleSubmitWish = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('Please log in to send a wish');
      return;
    }

    if (!wish.trim()) {
      toast.error('Please enter your wish');
      return;
    }

    if (wish.trim().length < 10) {
      toast.error('Please write at least 10 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save wish to Firebase under listings/{listingId}/wishes
      const wishesRef = collection(db, 'listings', listingId.toString(), 'wishes');
      
      await addDoc(wishesRef, {
        wish: wish.trim(),
        guestId: currentUser.uid,
        guestEmail: currentUser.email,
        guestName: currentUser.displayName || 'Guest',
        listingTitle,
        listingType,
        hostName,
        createdAt: serverTimestamp(),
        status: 'pending', // pending, read, addressed
      });

      // Clear the form
      setWish('');
      
      // Show success toast
      toast.success('✅ Your wish has been sent to the host. Thanks for your feedback!', {
        duration: 4000,
      });
    } catch (error) {
      toast.error('Failed to send wish. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Logo color theme - warm brown/copper matching the logo
  const colors = {
    bgGradient: 'from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10',
    iconGradient: 'from-amber-600 to-orange-600',
    buttonGradient: 'from-amber-600 to-orange-600',
    buttonHover: 'hover:from-amber-700 hover:to-orange-700',
    focusRing: 'focus:ring-amber-500'
  };

  return (
    <div className={`space-y-4 p-6 border border-border rounded-2xl bg-gradient-to-br ${colors.bgGradient}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors.iconGradient} flex items-center justify-center`}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-xl font-bold text-foreground mb-2 flex items-center gap-2">
            💭 Make a Wish for This Place
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            Didn't find something you were hoping for? Share your wish and help the host improve this listing!
          </p>
          
          <form onSubmit={handleSubmitWish} className="space-y-3">
            <textarea
              value={wish}
              onChange={(e) => setWish(e.target.value)}
              placeholder="e.g., It would be great if this place had a hot tub, better WiFi, or a workspace..."
              className={`w-full min-h-[100px] p-3 border border-border rounded-xl bg-background/80 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:ring-2 ${colors.focusRing} focus:border-transparent resize-none transition-all`}
              disabled={isSubmitting}
              maxLength={500}
            />
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {wish.length}/500 characters
              </span>
              
              <button
                type="submit"
                disabled={isSubmitting || !wish.trim()}
                className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${colors.buttonGradient} text-white rounded-xl ${colors.buttonHover} disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Wish
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WishlistSection;

