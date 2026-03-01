import React, { useState, useRef, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { getActivePolicyByType, POLICY_TYPES } from "@/pages/Admin/services/policyService";

const TermsModal = ({ isOpen, onClose, onAgree }) => {
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [policy, setPolicy] = useState(null);
    const [loading, setLoading] = useState(true);
    const contentRef = useRef(null);

    const handleScroll = () => {
        const element = contentRef.current;
        if (element) {
            const { scrollTop, scrollHeight, clientHeight } = element;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
            setHasScrolledToBottom(isAtBottom); // dynamically update on scroll
            if (isAtBottom) {
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadPolicy();
            setHasScrolledToBottom(false);
        }
    }, [isOpen]);

    const loadPolicy = async () => {
        try {
            setLoading(true);
            const termsPolicy = await getActivePolicyByType(POLICY_TYPES.TERMS_CONDITIONS);
            setPolicy(termsPolicy);
        } catch (error) {
            setPolicy(null);
        } finally {
            setLoading(false);
        }
    };

    // Simple markdown to HTML converter for basic formatting
    const renderMarkdown = (text) => {
        if (!text) return '';
        
        const lines = text.split('\n');
        const elements = [];
        let currentList = [];
        let listKey = 0;
        
        lines.forEach((line, index) => {
            // Headers
            if (line.startsWith('## ')) {
                if (currentList.length > 0) {
                    elements.push(<ul key={`list-${listKey++}`} className="space-y-2 list-disc list-inside mb-3">{currentList}</ul>);
                    currentList = [];
                }
                elements.push(<h2 key={index} className="font-semibold text-xl mb-3 mt-4">{line.replace('## ', '')}</h2>);
            } else if (line.startsWith('### ')) {
                if (currentList.length > 0) {
                    elements.push(<ul key={`list-${listKey++}`} className="space-y-2 list-disc list-inside mb-3">{currentList}</ul>);
                    currentList = [];
                }
                elements.push(<h3 key={index} className="font-semibold text-lg mb-2 mt-3">{line.replace('### ', '')}</h3>);
            } else if (line.trim().startsWith('- ')) {
                // List items
                const content = line.replace('- ', '');
                // Handle bold in list items
                if (content.includes('**')) {
                    const parts = content.split('**');
                    currentList.push(
                        <li key={index} className="mb-1">
                            {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
                        </li>
                    );
                } else {
                    currentList.push(<li key={index} className="mb-1">{content}</li>);
                }
            } else {
                // Close any open list
                if (currentList.length > 0) {
                    elements.push(<ul key={`list-${listKey++}`} className="space-y-2 list-disc list-inside mb-3">{currentList}</ul>);
                    currentList = [];
                }
                
                // Empty lines
                if (line.trim() === '') {
                    elements.push(<br key={index} />);
                } else if (line.includes('**')) {
                    // Bold text
                    const parts = line.split('**');
                    elements.push(
                        <p key={index} className="mb-2">
                            {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
                        </p>
                    );
                } else {
                    // Regular paragraphs
                    elements.push(<p key={index} className="mb-2">{line}</p>);
                }
            }
        });
        
        // Close any remaining list
        if (currentList.length > 0) {
            elements.push(<ul key={`list-${listKey++}`} className="space-y-2 list-disc list-inside mb-3">{currentList}</ul>);
        }
        
        return elements;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] relative"
            onClick={(e) => e.stopPropagation()} 
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-2xl font-bold text-foreground">Terms & Conditions</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div
                    ref={contentRef}
                    onScroll={handleScroll}
                    className="p-6 overflow-y-auto max-h-[60vh] space-y-4 text-sm text-foreground leading-relaxed"
                >
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <span className="ml-2 text-muted-foreground">Loading Terms & Conditions...</span>
                        </div>
                    ) : policy ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-muted-foreground">
                                    {policy.updatedAt?.toDate 
                                        ? `Effective Date: ${policy.updatedAt.toDate().toLocaleDateString()}`
                                        : policy.createdAt?.toDate
                                        ? `Effective Date: ${policy.createdAt.toDate().toLocaleDateString()}`
                                        : 'Terms & Conditions'}
                                    {policy.version && ` • Version ${policy.version}`}
                                </p>
                            </div>
                            <div className="prose prose-sm max-w-none">
                                {renderMarkdown(policy.content)}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 text-center py-8">
                            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <h3 className="font-semibold text-lg mb-2 text-yellow-900">Terms & Conditions Unavailable</h3>
                                <p className="text-sm text-yellow-800 mb-4">
                                    The Terms & Conditions are currently being updated. Please check back later or contact support for assistance.
                                </p>
                                <p className="text-xs text-yellow-700 italic">
                                    Note: Terms & Conditions are managed in the Admin Dashboard under Policy & Compliance.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Agree Button */}
                <div className="p-6 border-t">
                    <button
                        onClick={onAgree}
                        className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${hasScrolledToBottom && policy
                                ? "bg-primary text-white hover:bg-primary/90"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                            }`}
                        disabled={!hasScrolledToBottom || !policy}
                    >
                        {policy ? 'I Agree' : 'Policy Unavailable'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsModal;
