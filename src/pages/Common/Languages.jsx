import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const Languages = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Language preferences
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [languageOpen, setLanguageOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  ];

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadPreferences(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadPreferences = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSelectedLanguage(data.preferredLanguage || 'en');
        setSelectedCurrency(data.preferredCurrency || 'USD');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await updateDoc(doc(db, 'users', user.uid), {
        preferredLanguage: selectedLanguage,
        preferredCurrency: selectedCurrency,
        preferencesUpdatedAt: new Date()
      });

      // Also save to localStorage for immediate access
      localStorage.setItem('preferredLanguage', selectedLanguage);
      localStorage.setItem('preferredCurrency', selectedCurrency);

      toast.success('Language and currency preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const selectedLanguageData = languages.find(l => l.code === selectedLanguage);
  const selectedCurrencyData = currencies.find(c => c.code === selectedCurrency);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-36">
          <Loading message="Loading language preferences..." />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Languages & Currency</h1>
            </div>
            <p className="text-muted-foreground">
              Set your preferred language and currency for your Getaways experience.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
            {/* Language Selection */}
            <div>
              <label className="block text-lg font-semibold text-foreground mb-4">
                Language
              </label>
              <div className="relative">
                <button
                  onClick={() => {
                    setLanguageOpen(!languageOpen);
                    setCurrencyOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:border-primary transition-colors bg-white"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">
                      {selectedLanguageData?.nativeName} ({selectedLanguageData?.name})
                    </span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${languageOpen ? 'rotate-180' : ''}`} />
                </button>

                {languageOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLanguage(lang.code);
                          setLanguageOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between ${
                          selectedLanguage === lang.code ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div>
                          <div className="font-medium text-foreground">{lang.nativeName}</div>
                          <div className="text-sm text-muted-foreground">{lang.name}</div>
                        </div>
                        {selectedLanguage === lang.code && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Currency Selection */}
            <div>
              <label className="block text-lg font-semibold text-foreground mb-4">
                Currency
              </label>
              <div className="relative">
                <button
                  onClick={() => {
                    setCurrencyOpen(!currencyOpen);
                    setLanguageOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:border-primary transition-colors bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-semibold text-foreground">
                      {selectedCurrencyData?.symbol}
                    </span>
                    <span className="font-medium text-foreground">
                      {selectedCurrencyData?.code} - {selectedCurrencyData?.name}
                    </span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${currencyOpen ? 'rotate-180' : ''}`} />
                </button>

                {currencyOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {currencies.map((currency) => (
                      <button
                        key={currency.code}
                        onClick={() => {
                          setSelectedCurrency(currency.code);
                          setCurrencyOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between ${
                          selectedCurrency === currency.code ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-foreground">
                            {currency.symbol}
                          </span>
                          <div>
                            <div className="font-medium text-foreground">{currency.code}</div>
                            <div className="text-sm text-muted-foreground">{currency.name}</div>
                          </div>
                        </div>
                        {selectedCurrency === currency.code && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 bg-blue-50 rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-2">Note</h3>
            <p className="text-sm text-muted-foreground">
              Your language and currency preferences will be used throughout the Getaways platform. 
              Prices and content will be displayed in your selected currency and language where available.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Languages;

