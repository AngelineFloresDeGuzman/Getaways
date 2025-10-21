import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

const TermsModal = ({ isOpen, onClose, onScrollComplete }) => {
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const contentRef = useRef(null);

    const handleScroll = () => {
        const element = contentRef.current;
        if (element) {
            const { scrollTop, scrollHeight, clientHeight } = element;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
            
            if (isAtBottom && !hasScrolledToBottom) {
                setHasScrolledToBottom(true);
                onScrollComplete?.();
            }
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setHasScrolledToBottom(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] relative">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-2xl font-bold text-foreground">Terms & Conditions</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div 
                    ref={contentRef}
                    onScroll={handleScroll}
                    className="p-6 overflow-y-auto max-h-[60vh] space-y-4 text-sm text-foreground leading-relaxed"
                >
                    <div className="space-y-6">
                        <div>
                            <p className="text-muted-foreground">Effective Date: October 21, 2025</p>
                            <p className="mt-4">
                                Welcome to Getaways! By using our platform, you agree to the following terms:
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">Account Responsibility</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Users must provide accurate and up-to-date information during registration.</li>
                                <li>Each account is for personal use only and must not be shared.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">Bookings & Payments</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Guests are responsible for completing payments for bookings.</li>
                                <li>Hosts must provide truthful information about listings, including rates, amenities, and availability.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">Cancellations & Refunds</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>All cancellations are subject to Getaways' Cancellation Policy.</li>
                                <li>Refunds will be processed according to the host's specified rules.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">User Conduct</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Users must treat all members with respect.</li>
                                <li>Harassment, offensive content, or illegal activity is strictly prohibited.</li>
                                <li>Violations may result in account suspension or termination.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">Intellectual Property</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>All content on Getaways, including images, text, and designs, is owned by Getaways or its users.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">Limitation of Liability</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Getaways is not responsible for disputes between guests and hosts, property damages, or personal injury.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">Policy Updates</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Terms may be updated. Continued use constitutes acceptance of any updates.</li>
                            </ul>
                        </div>
                        
                        {/* Scroll indicator */}
                        {!hasScrolledToBottom && (
                            <div className="text-center py-4">
                                <p className="text-primary font-medium">↓ Please scroll to read all terms ↓</p>
                            </div>
                        )}
                        
                        {hasScrolledToBottom && (
                            <div className="text-center py-4">
                                <p className="text-green-600 font-medium">✓ You have read the complete Terms & Conditions</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-6 border-t">
                    <button
                        onClick={onClose}
                        className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${
                            hasScrolledToBottom 
                                ? "bg-primary text-white hover:bg-primary/90" 
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        }`}
                        disabled={!hasScrolledToBottom}
                    >
                        {hasScrolledToBottom ? "Close" : "Please read all terms to continue"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsModal;