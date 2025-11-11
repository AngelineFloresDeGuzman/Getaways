import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import { Shield, FileText, AlertCircle, CheckCircle, RefreshCw, BookOpen, Settings } from 'lucide-react';
import { getActivePolicyByType, POLICY_TYPES } from '@/pages/Admin/services/policyService';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { renderMarkdown } from '@/utils/markdownRenderer';

const Policies = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState({});
  const [activeSection, setActiveSection] = useState('cancellation');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/login');
        return;
      }
      loadPolicies();
    });

    return () => unsubscribe();
  }, [navigate]);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const policyTypes = [
        POLICY_TYPES.CANCELLATION_HOST,
        POLICY_TYPES.TERMS_CONDITIONS,
        POLICY_TYPES.PRIVACY_POLICY,
        POLICY_TYPES.HOST_RULES,
        POLICY_TYPES.REFUND_POLICY,
        POLICY_TYPES.COMMUNITY_STANDARDS,
        POLICY_TYPES.SERVICE_TERMS,
        POLICY_TYPES.EXPERIENCE_TERMS
      ];

      const loadedPolicies = {};
      for (const type of policyTypes) {
        try {
          const policy = await getActivePolicyByType(type);
          if (policy) {
            loadedPolicies[type] = policy;
          }
        } catch (error) {
          console.error(`Error loading policy ${type}:`, error);
        }
      }

      setPolicies(loadedPolicies);
    } catch (error) {
      console.error('Error loading policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const policySections = [
    {
      id: 'cancellation',
      title: 'Host Cancellation Policy',
      icon: RefreshCw,
      type: POLICY_TYPES.CANCELLATION_HOST,
      description: 'Rules and penalties for host cancellations'
    },
    {
      id: 'terms',
      title: 'Terms & Conditions',
      icon: FileText,
      type: POLICY_TYPES.TERMS_CONDITIONS,
      description: 'Platform terms and conditions of use'
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: Shield,
      type: POLICY_TYPES.PRIVACY_POLICY,
      description: 'How we collect, use, and protect your data'
    },
    {
      id: 'rules',
      title: 'Host Rules & Regulations',
      icon: BookOpen,
      type: POLICY_TYPES.HOST_RULES,
      description: 'Rules and responsibilities for hosts'
    },
    {
      id: 'refund',
      title: 'Refund Policy',
      icon: CheckCircle,
      type: POLICY_TYPES.REFUND_POLICY,
      description: 'Refund eligibility and processing information'
    },
    {
      id: 'community',
      title: 'Community Standards',
      icon: AlertCircle,
      type: POLICY_TYPES.COMMUNITY_STANDARDS,
      description: 'Standards for respectful and safe interactions'
    },
    {
      id: 'service',
      title: 'Service Terms',
      icon: Settings,
      type: POLICY_TYPES.SERVICE_TERMS,
      description: 'Terms specific to service listings'
    },
    {
      id: 'experience',
      title: 'Experience Terms',
      icon: Settings,
      type: POLICY_TYPES.EXPERIENCE_TERMS,
      description: 'Terms specific to experience listings'
    }
  ];

  const activePolicy = policies[policySections.find(s => s.id === activeSection)?.type];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-36">
          <Loading message="Loading policies..." />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-36 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-heading text-4xl font-bold text-foreground mb-4">
              Policies & Guidelines
            </h1>
            <p className="text-muted-foreground text-lg">
              Review Getaways policies, rules, and guidelines for hosts
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="card-listing p-4 sticky top-24">
                <h2 className="font-semibold text-foreground mb-4">Policy Sections</h2>
                <nav className="space-y-2">
                  {policySections.map((section) => {
                    const Icon = section.icon;
                    const hasPolicy = !!policies[section.type];
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                          activeSection === section.id
                            ? 'bg-primary text-white'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{section.title}</div>
                          {!hasPolicy && (
                            <div className="text-xs opacity-75 mt-1">Not available</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {activePolicy ? (
                <div className="card-listing p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-heading text-3xl font-bold text-foreground mb-2">
                        {activePolicy.title}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Version {activePolicy.version || '1.0'}</span>
                        {activePolicy.updatedAt?.toDate && (
                          <span>
                            Last updated: {activePolicy.updatedAt.toDate().toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {activePolicy.isActive !== false && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Active
                      </span>
                    )}
                  </div>

                  {renderMarkdown(activePolicy.content)}
                </div>
              ) : (
                <div className="card-listing p-12 text-center">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Policy Not Available
                  </h3>
                  <p className="text-muted-foreground">
                    This policy is currently being updated. Please check back later.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Policies;

