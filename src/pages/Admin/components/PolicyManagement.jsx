import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Save, 
  X, 
  CheckCircle, 
  XCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getAllPolicies, 
  savePolicy, 
  deletePolicy, 
  togglePolicyStatus,
  getActivePolicyByType,
  POLICY_TYPES,
  initializeDefaultPolicies
} from '../services/policyService';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const PolicyManagement = ({ searchFilter = '' }) => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [initializing, setInitializing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    content: '',
    isActive: true,
    appliesTo: [],
    version: '1.0'
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const allPolicies = await getAllPolicies();
      
      console.log('📋 Loaded policies:', {
        count: allPolicies.length,
        policies: allPolicies.map(p => ({
          id: p.id,
          type: p.type,
          title: p.title,
          hasContent: !!p.content,
          contentLength: p.content?.length || 0,
          isActive: p.isActive
        }))
      });
      
      setPolicies(allPolicies);
      
      // Check if we have the essential policies (Terms & Conditions and Privacy Policy)
      const hasTerms = allPolicies.some(p => p.type === POLICY_TYPES.TERMS_CONDITIONS);
      const hasPrivacy = allPolicies.some(p => p.type === POLICY_TYPES.PRIVACY_POLICY);
      
      console.log('🔍 Policy check:', {
        totalPolicies: allPolicies.length,
        hasTerms,
        hasPrivacy,
        policyTypes: allPolicies.map(p => p.type)
      });
      
      // Auto-initialize if no policies exist or essential policies are missing
      if (allPolicies.length === 0 || !hasTerms || !hasPrivacy) {
        console.log('⚠️ Policies missing, initializing defaults...', {
          totalPolicies: allPolicies.length,
          hasTerms,
          hasPrivacy
        });
        try {
          const result = await initializeDefaultPolicies();
          console.log('✅ Initialization result:', result);
          if (result && result.created > 0) {
            // Reload policies after initialization
            await new Promise(resolve => setTimeout(resolve, 500));
            const updatedPolicies = await getAllPolicies();
            console.log('📋 Reloaded policies after initialization:', updatedPolicies.length);
            setPolicies(updatedPolicies);
            toast.success(`Successfully created ${result.created} default policies`);
          } else {
            // Policies already exist, just update the state
            console.log('ℹ️ All policies already exist, using existing policies');
            setPolicies(allPolicies);
          }
        } catch (initError) {
          console.error('❌ Error auto-initializing policies:', initError);
          toast.error('Failed to auto-initialize policies. Please click "Initialize Default Policies" button.');
        }
      } else {
        // All policies exist, just set them
        console.log('✅ All essential policies exist, displaying policies');
        setPolicies(allPolicies);
      }
    } catch (error) {
      console.error('❌ Error loading policies:', error);
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDefaults = async () => {
    if (!confirm('This will create default policies. Continue?')) return;
    
    try {
      setInitializing(true);
      console.log('🔄 Starting policy initialization...');
      const result = await initializeDefaultPolicies();
      console.log('✅ Initialization result:', result);
      
      if (result && result.created > 0) {
        toast.success(`Successfully created ${result.created} default policies`);
      } else if (result && result.skipped > 0) {
        toast.info('All default policies already exist');
      } else {
        toast.success('Default policies initialized successfully');
      }
      
      // Wait a moment for Firestore to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force reload policies by resetting state first
      setPolicies([]);
      await loadPolicies();
      
      // Double check - reload again after another short delay
      await new Promise(resolve => setTimeout(resolve, 500));
      const finalPolicies = await getAllPolicies();
      setPolicies(finalPolicies);
      
      console.log(`📋 Final policy count after initialization: ${finalPolicies.length}`);
    } catch (error) {
      console.error('❌ Error initializing policies:', error);
      toast.error(`Failed to initialize default policies: ${error.message || error}`);
    } finally {
      setInitializing(false);
    }
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      type: policy.type,
      title: policy.title,
      content: policy.content,
      isActive: policy.isActive !== false,
      appliesTo: policy.appliesTo || [],
      version: policy.version || '1.0'
    });
    setShowEditor(true);
  };

  const handleNew = () => {
    setEditingPolicy(null);
    setFormData({
      type: '',
      title: '',
      content: '',
      isActive: true,
      appliesTo: [],
      version: '1.0'
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!formData.type || !formData.title || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await savePolicy(formData, editingPolicy?.id);
      toast.success(editingPolicy ? 'Policy updated successfully' : 'Policy created successfully');
      setShowEditor(false);
      await loadPolicies();
    } catch (error) {
      console.error('Error saving policy:', error);
      toast.error('Failed to save policy');
    }
  };

  const handleDelete = async (policyId) => {
    if (!confirm('Are you sure you want to delete this policy? This action cannot be undone.')) return;
    
    try {
      await deletePolicy(policyId);
      toast.success('Policy deleted successfully');
      await loadPolicies();
    } catch (error) {
      console.error('Error deleting policy:', error);
      toast.error('Failed to delete policy');
    }
  };

  const handleToggleStatus = async (policyId, currentStatus) => {
    try {
      await togglePolicyStatus(policyId, !currentStatus);
      toast.success(`Policy ${!currentStatus ? 'activated' : 'deactivated'}`);
      await loadPolicies();
    } catch (error) {
      console.error('Error toggling policy status:', error);
      toast.error('Failed to update policy status');
    }
  };

  const policyTypeLabels = {
    [POLICY_TYPES.CANCELLATION_GUEST]: 'Guest Cancellation',
    [POLICY_TYPES.CANCELLATION_HOST]: 'Host Cancellation',
    [POLICY_TYPES.TERMS_CONDITIONS]: 'Terms & Conditions',
    [POLICY_TYPES.PRIVACY_POLICY]: 'Privacy Policy',
    [POLICY_TYPES.HOST_RULES]: 'Host Rules',
    [POLICY_TYPES.GUEST_RULES]: 'Guest Rules',
    [POLICY_TYPES.COMMUNITY_STANDARDS]: 'Community Standards',
    [POLICY_TYPES.REFUND_POLICY]: 'Refund Policy',
    [POLICY_TYPES.SERVICE_TERMS]: 'Service Terms',
    [POLICY_TYPES.EXPERIENCE_TERMS]: 'Experience Terms',
    [POLICY_TYPES.FAQ]: 'FAQ'
  };

  const filteredPolicies = (filterType === 'all' 
    ? policies 
    : policies.filter(p => p.type === filterType)
  ).filter(p => {
    // Apply search filter if provided
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase();
      return (
        (p.title || '').toLowerCase().includes(searchLower) ||
        (p.content || '').toLowerCase().includes(searchLower) ||
        (policyTypeLabels[p.type] || '').toLowerCase().includes(searchLower)
      );
    }
    return true;
  });
  
  // Debug logging
  useEffect(() => {
    if (policies.length > 0) {
      console.log('🔍 Policy Management State:', {
        totalPolicies: policies.length,
        filteredPolicies: filteredPolicies.length,
        filterType,
        searchFilter,
        policies: policies.map(p => ({ 
          id: p.id, 
          type: p.type, 
          title: p.title,
          hasContent: !!p.content,
          contentLength: p.content?.length || 0
        }))
      });
    }
  }, [policies.length, filteredPolicies.length, filterType, searchFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Policy & Compliance Management</h2>
          <p className="text-muted-foreground">Manage all platform policies, rules, and regulations</p>
        </div>
        <div className="flex gap-2">
          {/* Check if essential policies are missing */}
          {(() => {
            const hasTerms = policies.some(p => p.type === POLICY_TYPES.TERMS_CONDITIONS);
            const hasPrivacy = policies.some(p => p.type === POLICY_TYPES.PRIVACY_POLICY);
            const hasEssentialPolicies = hasTerms && hasPrivacy && policies.length > 0;
            
            if (!hasEssentialPolicies) {
              return (
                <button
                  onClick={handleInitializeDefaults}
                  disabled={initializing}
                  className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {initializing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Initializing...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Initialize Default Policies
                    </>
                  )}
                </button>
              );
            }
            return null;
          })()}
          <button
            onClick={handleNew}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Policy
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Label>Filter by Type:</Label>
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="w-48 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Policies</option>
          {Object.entries(policyTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Policies List */}
      {filteredPolicies.length === 0 ? (
        <div className="card-listing p-12 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Policies Found</h3>
          <p className="text-muted-foreground mb-4">
            {policies.length === 0 
              ? 'Initialize default policies to get started'
              : `No policies match the selected filter. (Total: ${policies.length}, Filter: ${filterType}, Search: "${searchFilter || 'none'}")`}
          </p>
          {(() => {
            const hasTerms = policies.some(p => p.type === POLICY_TYPES.TERMS_CONDITIONS);
            const hasPrivacy = policies.some(p => p.type === POLICY_TYPES.PRIVACY_POLICY);
            const hasEssentialPolicies = hasTerms && hasPrivacy && policies.length > 0;
            
            if (!hasEssentialPolicies) {
              return (
                <button
                  onClick={handleInitializeDefaults}
                  disabled={initializing}
                  className="btn-primary bg-green-600 hover:bg-green-700"
                >
                  {initializing ? 'Initializing...' : 'Initialize Default Policies'}
                </button>
              );
            }
            return null;
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPolicies.map((policy) => (
            <div key={policy.id} className="card-listing p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-heading text-lg font-semibold text-foreground">
                      {policy.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      policy.isActive !== false
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {policy.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                      {policyTypeLabels[policy.type] || policy.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Applies to: {policy.appliesTo?.join(', ') || 'All users'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Version: {policy.version || '1.0'} • Last updated: {
                      policy.updatedAt?.toDate 
                        ? policy.updatedAt.toDate().toLocaleDateString()
                        : 'N/A'
                    }
                  </p>
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-foreground line-clamp-3">
                      {policy.content.replace(/[#*]/g, '').substring(0, 200)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleStatus(policy.id, policy.isActive !== false)}
                    className={`p-2 rounded-lg transition-colors ${
                      policy.isActive !== false 
                        ? 'hover:bg-green-50 text-green-600' 
                        : 'hover:bg-gray-50 text-gray-400'
                    }`}
                    title={policy.isActive !== false ? 'Deactivate Policy' : 'Activate Policy'}
                  >
                    {policy.isActive !== false ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(policy)}
                    className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                    title="Edit Policy"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(policy.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                    title="Delete Policy"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-muted/30">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {editingPolicy 
                    ? `Editing: ${editingPolicy.title}` 
                    : 'Fill in the details to create a new policy or rule'}
                </p>
              </div>
              <button
                onClick={() => setShowEditor(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Close editor"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Policy Type and Title Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="policy-type" className="mb-2 block">Policy Type *</Label>
                  <select
                    id="policy-type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    disabled={!!editingPolicy}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select policy type</option>
                    {Object.entries(policyTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  {editingPolicy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Policy type cannot be changed after creation
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="policy-title" className="mb-2 block">Title *</Label>
                  <Input
                    id="policy-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Guest Cancellation Policy"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Content Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="policy-content">Content * (Markdown supported)</Label>
                  <span className="text-xs text-muted-foreground">
                    {formData.content.length} characters
                  </span>
                </div>
                <Textarea
                  id="policy-content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter policy content here. You can use Markdown formatting...

## Section Heading
**Bold text** and *italic text*
- List item 1
- List item 2"
                  className="min-h-[400px] font-mono text-sm leading-relaxed"
                />
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-900 font-medium mb-1">Markdown Formatting Help:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-800">
                    <div><code>**bold**</code> → <strong>bold</strong></div>
                    <div><code>*italic*</code> → <em>italic</em></div>
                    <div><code>## Heading</code> → Section</div>
                    <div><code>- List</code> → Bullet</div>
                    <div><code>1. Item</code> → Numbered</div>
                    <div><code>`code`</code> → code</div>
                    <div><code>[link](url)</code> → Link</div>
                    <div><code>&gt; Quote</code> → Blockquote</div>
                  </div>
                </div>
              </div>

              {/* Version and Status Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="policy-version">Version</Label>
                  <Input
                    id="policy-version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Track policy versions (e.g., 1.0, 1.1, 2.0)
                  </p>
                </div>
                <div>
                  <Label className="mb-2 block">Status</Label>
                  <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30">
                    <Switch
                      id="policy-active"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <div>
                      <Label htmlFor="policy-active" className="cursor-pointer">
                        {formData.isActive ? 'Active' : 'Inactive'}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {formData.isActive 
                          ? 'Policy is visible to users' 
                          : 'Policy is hidden from users'}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Applies To *</Label>
                  <div className="space-y-2 p-3 border border-border rounded-lg bg-muted/30">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.appliesTo.includes('guest')}
                        onChange={(e) => {
                          const appliesTo = e.target.checked
                            ? [...formData.appliesTo, 'guest']
                            : formData.appliesTo.filter(t => t !== 'guest');
                          setFormData({ ...formData, appliesTo });
                        }}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium">Guests</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.appliesTo.includes('host')}
                        onChange={(e) => {
                          const appliesTo = e.target.checked
                            ? [...formData.appliesTo, 'host']
                            : formData.appliesTo.filter(t => t !== 'host');
                          setFormData({ ...formData, appliesTo });
                        }}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium">Hosts</span>
                    </label>
                    {formData.appliesTo.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        Select at least one user type
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Validation Messages */}
              {(!formData.type || !formData.title || !formData.content || formData.appliesTo.length === 0) && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-900">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Please fill in all required fields (marked with *) before saving.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t bg-muted/30">
              <div className="text-sm text-muted-foreground">
                {editingPolicy && (
                  <span>
                    Last updated: {editingPolicy.updatedAt?.toDate 
                      ? editingPolicy.updatedAt.toDate().toLocaleString()
                      : 'N/A'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEditor(false)}
                  className="btn-outline flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.type || !formData.title || !formData.content || formData.appliesTo.length === 0}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {editingPolicy ? 'Update Policy' : 'Create Policy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyManagement;

