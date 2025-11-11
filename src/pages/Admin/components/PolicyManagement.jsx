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

const PolicyManagement = () => {
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
      setPolicies(allPolicies);
    } catch (error) {
      console.error('Error loading policies:', error);
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDefaults = async () => {
    if (!confirm('This will create default policies. Continue?')) return;
    
    try {
      setInitializing(true);
      await initializeDefaultPolicies();
      toast.success('Default policies initialized successfully');
      await loadPolicies();
    } catch (error) {
      console.error('Error initializing policies:', error);
      toast.error('Failed to initialize default policies');
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

  const filteredPolicies = filterType === 'all' 
    ? policies 
    : policies.filter(p => p.type === filterType);

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
          {policies.length === 0 && (
            <button
              onClick={handleInitializeDefaults}
              disabled={initializing}
              className="btn-outline flex items-center gap-2"
            >
              {initializing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Initializing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Initialize Default Policies
                </>
              )}
            </button>
          )}
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
              : 'No policies match the selected filter'}
          </p>
          {policies.length === 0 && (
            <button
              onClick={handleInitializeDefaults}
              disabled={initializing}
              className="btn-primary"
            >
              Initialize Default Policies
            </button>
          )}
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
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title={policy.isActive !== false ? 'Deactivate' : 'Activate'}
                  >
                    {policy.isActive !== false ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(policy)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5 text-primary" />
                  </button>
                  <button
                    onClick={() => handleDelete(policy.id)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-foreground">
                {editingPolicy ? 'Edit Policy' : 'New Policy'}
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <Label>Policy Type *</Label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  disabled={!!editingPolicy}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select policy type</option>
                  {Object.entries(policyTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Policy title"
                />
              </div>

              <div>
                <Label>Content * (Markdown supported)</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Policy content (supports Markdown formatting)"
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use Markdown for formatting: **bold**, *italic*, ## headings, - lists, etc.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Version</Label>
                  <Input
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>

              <div>
                <Label>Applies To</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.appliesTo.includes('guest')}
                      onChange={(e) => {
                        const appliesTo = e.target.checked
                          ? [...formData.appliesTo, 'guest']
                          : formData.appliesTo.filter(t => t !== 'guest');
                        setFormData({ ...formData, appliesTo });
                      }}
                    />
                    Guest
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.appliesTo.includes('host')}
                      onChange={(e) => {
                        const appliesTo = e.target.checked
                          ? [...formData.appliesTo, 'host']
                          : formData.appliesTo.filter(t => t !== 'host');
                        setFormData({ ...formData, appliesTo });
                      }}
                    />
                    Host
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-6 border-t">
              <button
                onClick={() => setShowEditor(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyManagement;

