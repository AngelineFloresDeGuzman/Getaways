import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

const PrivacyModal = ({ isOpen, onClose, onScrollComplete }) => {
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
                    <h2 className="text-2xl font-bold text-foreground">Privacy Policy</h2>
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
                                Getaways values your privacy and commits to protecting your data.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">Information We Collect</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li><strong>Personal Data:</strong> Name, email, password, contact info, profile details.</li>
                                <li><strong>Booking Data:</strong> Listings viewed, bookings made, reviews posted.</li>
                                <li><strong>Device & Usage Data:</strong> IP address, browser type, device info, activity logs.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">How We Use Your Information</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>To provide and improve our services.</li>
                                <li>To communicate booking confirmations, promotions, and updates.</li>
                                <li>To detect and prevent fraud or unauthorized activity.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">Data Sharing</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>We do not sell your personal data.</li>
                                <li>Data may be shared with hosts for booking purposes and with payment processors for transaction handling.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">Your Rights</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Access, correct, or delete your personal information via your account settings.</li>
                                <li>Opt-out of marketing communications at any time.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">Security</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Getaways implements industry-standard measures to protect your data.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">Cookies & Tracking</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>We may use cookies and tracking technologies to enhance user experience and analyze platform usage.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-3">Policy Updates</h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>This Privacy Policy may be updated. Continued use of Getaways after updates means you accept the changes.</li>
                            </ul>
                        </div>
                        
                        {/* Scroll indicator */}
                        {!hasScrolledToBottom && (
                            <div className="text-center py-4">
                                <p className="text-primary font-medium">↓ Please scroll to read the complete policy ↓</p>
                            </div>
                        )}
                        
                        {hasScrolledToBottom && (
                            <div className="text-center py-4">
                                <p className="text-green-600 font-medium">✓ You have read the complete Privacy Policy</p>
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
                        {hasScrolledToBottom ? "Close" : "Please read the complete policy to continue"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrivacyModal;