import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Users, Share2, Copy, Check, Gift, TrendingUp, Mail } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { auth } from '@/lib/firebase';

const Refer = () => {
  const [copied, setCopied] = useState(false);
  const user = auth.currentUser;
  
  // Generate referral code (in a real app, this would come from user profile)
  const referralCode = user ? `REF-${user.uid.slice(0, 8).toUpperCase()}` : 'REF-GETAWAYS';
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareViaEmail = () => {
    const subject = 'Join me on Getaways!';
    const body = `Hi! I've been using Getaways and thought you might enjoy it too. Use my referral link to sign up and we'll both get rewards! ${referralLink}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const referralStats = {
    totalReferrals: 12,
    successfulSignups: 8,
    pendingRewards: 3,
    totalEarnings: 150
  };

  const rewards = [
    {
      title: 'For You',
      description: 'Earn ₱500 for each friend who becomes a host',
      icon: <Gift className="w-8 h-8" />,
      color: 'bg-primary/10 text-primary'
    },
    {
      title: 'For Your Friend',
      description: 'Your friend gets ₱300 off their first booking',
      icon: <Gift className="w-8 h-8" />,
      color: 'bg-accent/10 text-accent'
    },
  ];

  const steps = [
    {
      number: 1,
      title: 'Share Your Link',
      description: 'Copy your unique referral link or share it directly'
    },
    {
      number: 2,
      title: 'They Sign Up',
      description: 'Your friend signs up using your referral link'
    },
    {
      number: 3,
      title: 'They Book or Host',
      description: 'Your friend makes their first booking or creates a listing'
    },
    {
      number: 4,
      title: 'You Both Earn',
      description: 'Rewards are credited to both your accounts'
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36 pb-12">
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Users className="w-10 h-10 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Refer a Host</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Share Getaways with friends and earn rewards when they join as hosts
            </p>
          </div>

          {/* Rewards Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {rewards.map((reward, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-lg p-8">
                <div className={`${reward.color} p-4 rounded-lg inline-block mb-4`}>
                  {reward.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{reward.title}</h3>
                <p className="text-muted-foreground">{reward.description}</p>
              </div>
            ))}
          </div>

          {/* Referral Link Section */}
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Your Referral Link</h2>
            <div className="bg-white rounded-lg p-4 mb-4 flex items-center gap-4">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none bg-gray-50"
              />
              <button
                onClick={copyToClipboard}
                className="btn-primary px-6 py-2 flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="flex gap-4">
              <button
                onClick={shareViaEmail}
                className="btn-outline flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Share via Email
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Join Getaways',
                      text: 'Check out Getaways - an amazing platform for accommodations!',
                      url: referralLink
                    });
                  } else {
                    copyToClipboard();
                  }
                }}
                className="btn-outline flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>

          {/* How It Works */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-6">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step) => (
                <div key={step.number} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg mb-4">
                    {step.number}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Referral Stats */}
          {user && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-semibold text-foreground">Your Referral Stats</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {referralStats.totalReferrals}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Referrals</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {referralStats.successfulSignups}
                  </div>
                  <div className="text-sm text-muted-foreground">Successful Signups</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {referralStats.pendingRewards}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending Rewards</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    ₱{referralStats.totalEarnings}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Earnings</div>
                </div>
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-3">Terms & Conditions</h3>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Rewards are credited only when the referred friend completes their first booking or creates their first listing</li>
              <li>Referral rewards cannot be combined with other promotional offers</li>
              <li>Self-referrals are not eligible for rewards</li>
              <li>Rewards are subject to verification and may take 7-14 business days to process</li>
              <li>Getaways reserves the right to modify or terminate the referral program at any time</li>
            </ul>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Refer;

