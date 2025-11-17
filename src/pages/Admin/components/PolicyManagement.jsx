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
  AlertCircle,
  Printer,
  Download
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

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const generatePolicyPrintContent = (policy) => {
    const policyTypeLabel = policyTypeLabels[policy.type] || policy.type;
    const status = policy.isActive !== false ? 'Active' : 'Inactive';
    const appliesTo = policy.appliesTo?.join(', ') || 'All users';
    const version = policy.version || '1.0';
    const lastUpdated = formatDate(policy.updatedAt);
    const createdAt = formatDate(policy.createdAt);

    // Convert markdown to HTML (basic conversion)
    const convertMarkdownToHTML = (text) => {
      if (!text) return '';
      const lines = text.split('\n');
      const processedLines = [];
      let inList = false;
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        // Check for headers (order matters - do h3 before h2 before h1)
        if (/^### (.+)$/.test(line)) {
          if (inList) {
            processedLines.push('</ul>');
            inList = false;
          }
          processedLines.push(`<h3>${line.replace(/^### (.+)$/, '$1')}</h3>`);
          continue;
        }
        if (/^## (.+)$/.test(line)) {
          if (inList) {
            processedLines.push('</ul>');
            inList = false;
          }
          processedLines.push(`<h2>${line.replace(/^## (.+)$/, '$1')}</h2>`);
          continue;
        }
        if (/^# (.+)$/.test(line)) {
          if (inList) {
            processedLines.push('</ul>');
            inList = false;
          }
          processedLines.push(`<h1>${line.replace(/^# (.+)$/, '$1')}</h1>`);
          continue;
        }
        
        // Check for list items
        if (/^- (.+)$/.test(line)) {
          if (!inList) {
            processedLines.push('<ul>');
            inList = true;
          }
          const listContent = line.replace(/^- (.+)$/, '$1');
          // Process bold and italic within list items
          let processedContent = listContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
          processedLines.push(`<li>${processedContent}</li>`);
          continue;
        }
        
        // Not a list item, close list if open
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        
        // Regular paragraph line
        if (line) {
          // Process bold and italic
          line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
          processedLines.push(`<p>${line}</p>`);
        } else {
          // Empty line - add spacing
          processedLines.push('<br>');
        }
      }
      
      // Close any open list
      if (inList) {
        processedLines.push('</ul>');
      }
      
      return processedLines.join('');
    };

    const htmlContent = convertMarkdownToHTML(policy.content);

    return `
      <div class="print-section">
        <div class="print-header">
          <h1>${policy.title}</h1>
          <div class="print-meta">
            <div class="meta-item"><strong>Policy Type:</strong> ${policyTypeLabel}</div>
            <div class="meta-item"><strong>Status:</strong> ${status}</div>
            <div class="meta-item"><strong>Version:</strong> ${version}</div>
            <div class="meta-item"><strong>Applies To:</strong> ${appliesTo}</div>
            <div class="meta-item"><strong>Last Updated:</strong> ${lastUpdated}</div>
            ${createdAt !== 'N/A' ? `<div class="meta-item"><strong>Created:</strong> ${createdAt}</div>` : ''}
          </div>
        </div>
        <div class="print-content">
          ${htmlContent}
        </div>
        <div class="print-footer">
          <p><strong>Policy ID:</strong> ${policy.id}</p>
          <p><em>This document was generated on ${new Date().toLocaleString()}</em></p>
        </div>
      </div>
    `;
  };

  const handlePrintPolicy = (policy) => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print');
        return;
      }

      const printContent = generatePolicyPrintContent(policy);
      const title = `${policy.title} - Policy Document`;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              @media print {
                @page {
                  margin: 1cm;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
              }
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                color: #333;
                line-height: 1.6;
              }
              .print-section {
                max-width: 800px;
                margin: 0 auto;
                background: white;
              }
              .print-header {
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .print-header h1 {
                color: #1e40af;
                margin: 0 0 20px 0;
                font-size: 28px;
                font-weight: bold;
              }
              .print-meta {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                font-size: 14px;
              }
              .meta-item {
                padding: 8px;
                background: #f3f4f6;
                border-radius: 4px;
              }
              .meta-item strong {
                color: #4b5563;
                margin-right: 8px;
              }
              .print-content {
                margin: 30px 0;
                font-size: 14px;
              }
              .print-content h1 {
                color: #1e40af;
                font-size: 24px;
                margin-top: 30px;
                margin-bottom: 15px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 10px;
              }
              .print-content h2 {
                color: #2563eb;
                font-size: 20px;
                margin-top: 25px;
                margin-bottom: 12px;
              }
              .print-content h3 {
                color: #3b82f6;
                font-size: 16px;
                margin-top: 20px;
                margin-bottom: 10px;
              }
              .print-content p {
                margin: 10px 0;
                text-align: justify;
              }
              .print-content ul {
                margin: 15px 0;
                padding-left: 30px;
              }
              .print-content li {
                margin: 8px 0;
              }
              .print-content strong {
                color: #1f2937;
                font-weight: 600;
              }
              .print-content em {
                color: #4b5563;
                font-style: italic;
              }
              .print-footer {
                margin-top: 50px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                font-size: 12px;
                color: #6b7280;
                text-align: center;
              }
              .print-footer p {
                margin: 5px 0;
              }
              @media print {
                .no-print {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);

      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
        toast.success('Print preview opened');
      }, 250);
    } catch (error) {
      console.error('Error printing policy:', error);
      toast.error('Failed to open print preview');
    }
  };

  const handleExportPolicy = (policy, format = 'pdf') => {
    try {
      const policyTypeLabel = policyTypeLabels[policy.type] || policy.type;
      const status = policy.isActive !== false ? 'Active' : 'Inactive';
      const appliesTo = policy.appliesTo?.join(', ') || 'All users';
      const version = policy.version || '1.0';
      const lastUpdated = formatDate(policy.updatedAt);
      const createdAt = formatDate(policy.createdAt);

      if (format === 'txt') {
        // Export as plain text
        const textContent = `
${policy.title}
${'='.repeat(policy.title.length)}

Policy Type: ${policyTypeLabel}
Status: ${status}
Version: ${version}
Applies To: ${appliesTo}
Last Updated: ${lastUpdated}
${createdAt !== 'N/A' ? `Created: ${createdAt}\n` : ''}
Policy ID: ${policy.id}

${'-'.repeat(50)}

${policy.content}

${'-'.repeat(50)}

This document was generated on ${new Date().toLocaleString()}
        `.trim();

        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${policy.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Policy exported as text file');
      } else {
        // Export as HTML (which can be saved as PDF)
        const htmlContent = generatePolicyPrintContent(policy);
        const fullHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${policy.title}</title>
              <style>
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  margin: 0;
                  padding: 20px;
                  color: #333;
                  line-height: 1.6;
                }
                .print-section {
                  max-width: 800px;
                  margin: 0 auto;
                  background: white;
                }
                .print-header {
                  border-bottom: 3px solid #2563eb;
                  padding-bottom: 20px;
                  margin-bottom: 30px;
                }
                .print-header h1 {
                  color: #1e40af;
                  margin: 0 0 20px 0;
                  font-size: 28px;
                  font-weight: bold;
                }
                .print-meta {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 10px;
                  font-size: 14px;
                }
                .meta-item {
                  padding: 8px;
                  background: #f3f4f6;
                  border-radius: 4px;
                }
                .meta-item strong {
                  color: #4b5563;
                  margin-right: 8px;
                }
                .print-content {
                  margin: 30px 0;
                  font-size: 14px;
                }
                .print-content h1 {
                  color: #1e40af;
                  font-size: 24px;
                  margin-top: 30px;
                  margin-bottom: 15px;
                  border-bottom: 2px solid #e5e7eb;
                  padding-bottom: 10px;
                }
                .print-content h2 {
                  color: #2563eb;
                  font-size: 20px;
                  margin-top: 25px;
                  margin-bottom: 12px;
                }
                .print-content h3 {
                  color: #3b82f6;
                  font-size: 16px;
                  margin-top: 20px;
                  margin-bottom: 10px;
                }
                .print-content p {
                  margin: 10px 0;
                  text-align: justify;
                }
                .print-content ul {
                  margin: 15px 0;
                  padding-left: 30px;
                }
                .print-content li {
                  margin: 8px 0;
                }
                .print-content strong {
                  color: #1f2937;
                  font-weight: 600;
                }
                .print-content em {
                  color: #4b5563;
                  font-style: italic;
                }
                .print-footer {
                  margin-top: 50px;
                  padding-top: 20px;
                  border-top: 2px solid #e5e7eb;
                  font-size: 12px;
                  color: #6b7280;
                  text-align: center;
                }
                .print-footer p {
                  margin: 5px 0;
                }
              </style>
            </head>
            <body>
              ${htmlContent}
            </body>
          </html>
        `;

        const blob = new Blob([fullHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${policy.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Policy exported as HTML (you can save as PDF from your browser)');
      }
    } catch (error) {
      console.error('Error exporting policy:', error);
      toast.error('Failed to export policy');
    }
  };

  const generateAllPoliciesPrintContent = (allPolicies) => {
    // Sort policies by type for better organization
    const sortedPolicies = [...allPolicies].sort((a, b) => {
      const typeA = policyTypeLabels[a.type] || a.type;
      const typeB = policyTypeLabels[b.type] || b.type;
      return typeA.localeCompare(typeB);
    });

    const policiesHTML = sortedPolicies.map((policy, index) => {
      const policyTypeLabel = policyTypeLabels[policy.type] || policy.type;
      const status = policy.isActive !== false ? 'Active' : 'Inactive';
      const appliesTo = policy.appliesTo?.join(', ') || 'All users';
      const version = policy.version || '1.0';
      const lastUpdated = formatDate(policy.updatedAt);
      const createdAt = formatDate(policy.createdAt);

      // Convert markdown to HTML
      const convertMarkdownToHTML = (text) => {
        if (!text) return '';
        const lines = text.split('\n');
        const processedLines = [];
        let inList = false;
        
        for (let i = 0; i < lines.length; i++) {
          let line = lines[i].trim();
          
          if (/^### (.+)$/.test(line)) {
            if (inList) {
              processedLines.push('</ul>');
              inList = false;
            }
            processedLines.push(`<h3>${line.replace(/^### (.+)$/, '$1')}</h3>`);
            continue;
          }
          if (/^## (.+)$/.test(line)) {
            if (inList) {
              processedLines.push('</ul>');
              inList = false;
            }
            processedLines.push(`<h2>${line.replace(/^## (.+)$/, '$1')}</h2>`);
            continue;
          }
          if (/^# (.+)$/.test(line)) {
            if (inList) {
              processedLines.push('</ul>');
              inList = false;
            }
            processedLines.push(`<h1>${line.replace(/^# (.+)$/, '$1')}</h1>`);
            continue;
          }
          
          if (/^- (.+)$/.test(line)) {
            if (!inList) {
              processedLines.push('<ul>');
              inList = true;
            }
            const listContent = line.replace(/^- (.+)$/, '$1');
            let processedContent = listContent
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>');
            processedLines.push(`<li>${processedContent}</li>`);
            continue;
          }
          
          if (inList) {
            processedLines.push('</ul>');
            inList = false;
          }
          
          if (line) {
            line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
            processedLines.push(`<p>${line}</p>`);
          } else {
            processedLines.push('<br>');
          }
        }
        
        if (inList) {
          processedLines.push('</ul>');
        }
        
        return processedLines.join('');
      };

      const htmlContent = convertMarkdownToHTML(policy.content);

      return `
        <div class="policy-section" style="page-break-after: always; margin-bottom: 40px;">
          <div class="policy-header">
            <h2 style="color: #1e40af; font-size: 24px; margin-bottom: 15px; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
              ${index + 1}. ${policy.title}
            </h2>
            <div class="policy-meta" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; font-size: 13px;">
              <div style="padding: 8px; background: #f3f4f6; border-radius: 4px;">
                <strong style="color: #4b5563;">Policy Type:</strong> ${policyTypeLabel}
              </div>
              <div style="padding: 8px; background: #f3f4f6; border-radius: 4px;">
                <strong style="color: #4b5563;">Status:</strong> ${status}
              </div>
              <div style="padding: 8px; background: #f3f4f6; border-radius: 4px;">
                <strong style="color: #4b5563;">Version:</strong> ${version}
              </div>
              <div style="padding: 8px; background: #f3f4f6; border-radius: 4px;">
                <strong style="color: #4b5563;">Applies To:</strong> ${appliesTo}
              </div>
              <div style="padding: 8px; background: #f3f4f6; border-radius: 4px;">
                <strong style="color: #4b5563;">Last Updated:</strong> ${lastUpdated}
              </div>
              ${createdAt !== 'N/A' ? `
              <div style="padding: 8px; background: #f3f4f6; border-radius: 4px;">
                <strong style="color: #4b5563;">Created:</strong> ${createdAt}
              </div>
              ` : ''}
            </div>
          </div>
          <div class="policy-content" style="margin-top: 20px;">
            ${htmlContent}
          </div>
          <div class="policy-footer" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280;">
            <p><strong>Policy ID:</strong> ${policy.id}</p>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="all-policies-document">
        <div class="document-header" style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #2563eb;">
          <h1 style="color: #1e40af; font-size: 32px; margin-bottom: 10px;">Policy & Compliance Documentation</h1>
          <p style="color: #6b7280; font-size: 16px; margin: 5px 0;">Complete Policy and Compliance Reference</p>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 10px;">
            Generated on ${new Date().toLocaleString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 5px;">
            Total Policies: ${sortedPolicies.length}
          </p>
        </div>
        <div class="table-of-contents" style="margin-bottom: 40px; padding: 20px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1e40af; font-size: 20px; margin-bottom: 15px;">Table of Contents</h2>
          <ol style="margin: 0; padding-left: 20px; line-height: 2;">
            ${sortedPolicies.map((policy, index) => `
              <li style="margin: 5px 0;">
                <strong>${policy.title}</strong> 
                <span style="color: #6b7280; font-size: 13px;">(${policyTypeLabels[policy.type] || policy.type})</span>
              </li>
            `).join('')}
          </ol>
        </div>
        ${policiesHTML}
        <div class="document-footer" style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
          <p><strong>End of Policy & Compliance Documentation</strong></p>
          <p style="margin-top: 10px;">This document contains ${sortedPolicies.length} policy document(s) as of ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    `;
  };

  const handlePrintAllPolicies = () => {
    if (policies.length === 0) {
      toast.error('No policies available to print');
      return;
    }

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print');
        return;
      }

      const printContent = generateAllPoliciesPrintContent(policies);
      const title = 'Policy & Compliance Documentation - All Policies';

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              @media print {
                @page {
                  margin: 1.5cm;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
                .policy-section {
                  page-break-after: always;
                }
                .policy-section:last-child {
                  page-break-after: auto;
                }
              }
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                color: #333;
                line-height: 1.6;
              }
              .all-policies-document {
                max-width: 900px;
                margin: 0 auto;
                background: white;
              }
              .document-header {
                text-align: center;
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 3px solid #2563eb;
              }
              .document-header h1 {
                color: #1e40af;
                font-size: 32px;
                margin-bottom: 10px;
              }
              .table-of-contents {
                margin-bottom: 40px;
                padding: 20px;
                background: #f9fafb;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
              }
              .table-of-contents h2 {
                color: #1e40af;
                font-size: 20px;
                margin-bottom: 15px;
              }
              .table-of-contents ol {
                margin: 0;
                padding-left: 20px;
                line-height: 2;
              }
              .policy-section {
                page-break-after: always;
                margin-bottom: 40px;
                padding-bottom: 30px;
                border-bottom: 2px dashed #e5e7eb;
              }
              .policy-section:last-child {
                border-bottom: none;
              }
              .policy-header h2 {
                color: #1e40af;
                font-size: 24px;
                margin-bottom: 15px;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 10px;
              }
              .policy-meta {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-bottom: 20px;
                font-size: 13px;
              }
              .policy-content {
                margin-top: 20px;
                font-size: 14px;
              }
              .policy-content h1 {
                color: #1e40af;
                font-size: 22px;
                margin-top: 25px;
                margin-bottom: 12px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
              }
              .policy-content h2 {
                color: #2563eb;
                font-size: 18px;
                margin-top: 20px;
                margin-bottom: 10px;
              }
              .policy-content h3 {
                color: #3b82f6;
                font-size: 16px;
                margin-top: 18px;
                margin-bottom: 8px;
              }
              .policy-content p {
                margin: 10px 0;
                text-align: justify;
              }
              .policy-content ul {
                margin: 15px 0;
                padding-left: 30px;
              }
              .policy-content li {
                margin: 8px 0;
              }
              .policy-content strong {
                color: #1f2937;
                font-weight: 600;
              }
              .policy-content em {
                color: #4b5563;
                font-style: italic;
              }
              .policy-footer {
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #e5e7eb;
                font-size: 11px;
                color: #6b7280;
              }
              .document-footer {
                margin-top: 50px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
              }
              @media print {
                .no-print {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);

      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
        toast.success(`Print preview opened with ${policies.length} policy document(s)`);
      }, 250);
    } catch (error) {
      console.error('Error printing all policies:', error);
      toast.error('Failed to open print preview');
    }
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
          {policies.length > 0 && (
            <button
              onClick={handlePrintAllPolicies}
              className="btn-outline flex items-center gap-2"
              title="Print All Policies"
            >
              <Printer className="w-4 h-4" />
              Print All Policies
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
                    onClick={() => handlePrintPolicy(policy)}
                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                    title="Print Policy"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleExportPolicy(policy, 'html')}
                    className="p-2 hover:bg-purple-50 rounded-lg transition-colors text-purple-600"
                    title="Export Policy (HTML/PDF)"
                  >
                    <Download className="w-5 h-5" />
                  </button>
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

