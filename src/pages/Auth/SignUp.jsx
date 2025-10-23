import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import TermsModal from "@/components/TermsModal";
import PrivacyModal from "@/components/PrivacyModal";
import { Eye, EyeOff, Mail, User, X } from "lucide-react";
import { createUserWithEmailAndPassword, sendEmailVerification, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db, app } from "@/lib/firebase";
import { doc, setDoc, collection, getDocs, getDoc, updateDoc } from "firebase/firestore";  // Add collection, getDocs if missing
import { Checkbox } from "@/components/ui/checkbox";

const SignUp = ({ isModal = false, onClose, onSwitchToLogin, defaultAccountType = "guest" }) => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [accountType, setAccountType] = useState(defaultAccountType);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [hasReadTerms, setHasReadTerms] = useState(false);
    const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
    const [toast, setToast] = useState({ message: "", type: "" });
    const [agreedTerms, setAgreedTerms] = useState(false);
    const [agreedPrivacy, setAgreedPrivacy] = useState(false);
    const allAgreed = agreedTerms && agreedPrivacy;
    const [showVerifyPopup, setShowVerifyPopup] = useState(false);
    const [passwordMatch, setPasswordMatch] = useState(true);

    const handleAgreeTerms = () => {
        setAgreedTerms(true);
        setShowTermsModal(false);
    };

    const handleAgreePrivacy = () => {
        setAgreedPrivacy(true);
        setShowPrivacyModal(false);
    };

    // Auto-check the checkbox when both documents are read
    React.useEffect(() => {
        if (agreedTerms && agreedPrivacy) {
            setAcceptTerms(true);
        } else {
            setAcceptTerms(false); // auto-uncheck if either is unchecked
        }
    }, [agreedTerms, agreedPrivacy]);

    // Real-time password match validation
    React.useEffect(() => {
        if (confirmPassword.length === 0) {
            setPasswordMatch(true);
        } else {
            setPasswordMatch(password === confirmPassword);
        }
    }, [password, confirmPassword]);

    const showToast = (message, type = "info") => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: "", type: "" }), 3000);
    };

    // Function to check if user exists in Firestore by email
    const checkExistingUser = async (email) => {
        try {
            const usersCollection = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCollection);

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                if (userData.email === email) {
                    return { exists: true, uid: userDoc.id, userData };
                }
            }
            return { exists: false };
        } catch (error) {
            console.error("Error checking existing user:", error);
            return { exists: false };
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();

        // Validate terms and conditions
        if (!agreedTerms || !agreedPrivacy) {
            showToast("You must accept the terms and conditions to create an account.", "error");
            return;
        }

        // User trying to check without reading both documents
        if (!acceptTerms || !agreedTerms || !agreedPrivacy) {
            showToast("Please read both the Terms & Conditions and Privacy Policy first.", "error");
            return;
        }

        // Validate password match
        if (password !== confirmPassword) {
            showToast("Passwords do not match. Please try again.", "error");
            return;
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            showToast("Password must be at least 8 characters long and contain at least one letter, one number, and one special character (@$!%*#?&).", "error");
            return;
        }

        let connectionTestPassed = false; // Declare outside try block for catch access

        try {
            // Create new account directly - let Firebase handle email conflicts
            console.log("🟡 Creating new user...");
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const users = userCredential.user;
            console.log("✅ User created:", users.uid);
            console.log("🔍 Current auth state:", auth.currentUser?.uid);  // Should match users.uid

            // Quick connection test before write (skips gracefully if Firestore helpers unavailable)
            console.log("🧪 Testing Firestore connection...");
            try {
                // Safely check if getDocs and collection are available (prevents import errors)
                if (typeof getDocs === 'function' && typeof collection === 'function') {
                    const testSnap = await getDocs(collection(db, 'users'));  // Simple read test
                    console.log("✅ Firestore connected (read test):", testSnap.size, "existing users");
                    connectionTestPassed = true;
                } else {
                    console.warn("⚠️ Firestore test skipped: Missing imports for getDocs/collection. Assuming connected for now.");
                    connectionTestPassed = true;  // Proceed but log warning
                }
            } catch (connErr) {
                console.error("❌ Firestore connection test failed:", connErr?.code || 'unknown', connErr?.message || 'no details');
                // Don't throw yet—proceed to write and let setDoc fail if truly disconnected
                connectionTestPassed = false;
            }

            // Now attempt the write
            console.log("🟡 Saving to Firestore...");

            // Prepare user data with proper role structure
            const userData = {
                firstName,
                lastName,
                email,
                roles: accountType === "host" ? "guest" : accountType, // Primary role is guest for hosts
                createdAt: new Date().toISOString(),
                emailVerified: false,
            };

            // If signing up as host, add both guest and host roles
            if (accountType === "host") {
                userData.roles = ["guest", "host"];
                console.log("🟡 Creating dual-role account (guest + host)");
            } else {
                userData.roles = ["guest"];
                console.log("🟡 Creating guest account");
            }

            await setDoc(doc(db, "users", users.uid), {
                firstName,
                lastName,
                email,
                emailVerified: false,
                roles: accountType === "host" ? ["guest", "host"] : ["guest"],
                createdAt: new Date().toISOString(),
            });

            console.log("✅ User saved to Firestore with roles:", userData.roles);

            // Send verification email
            console.log("🟡 Sending verification email...");
            await sendEmailVerification(users);
            console.log("📩 Verification email sent");

            // After sendEmailVerification(users);
            setShowVerifyPopup(true);

            // Clear form
            setFirstName("");
            setLastName("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setAcceptTerms(false);
            setHasReadTerms(false);
            setHasReadPrivacy(false);

        } catch (error) {
            console.error("Signup error (outer):", error?.code || error?.message || 'Unknown error', error);

            // Clean up auth on failure
            if (auth.currentUser) {
                await signOut(auth).catch((signOutErr) => console.error("Sign out failed:", signOutErr));
            }

            let message = "An unexpected error occurred. Please try again.";

            // Safer error checking to avoid code leaks in toast
            const errorCode = error?.code || '';
            const errorMsg = error?.message || '';

            // Check for auth errors first (higher priority)
            if (errorCode.startsWith("auth/")) {
                switch (errorCode) {
                    case "auth/email-already-in-use":
                        showToast("This email is already registered. Please use a different email or log in to your existing account.", "error");
                        // Offer to switch to login modal
                        if (onSwitchToLogin) {
                            setTimeout(() => {
                                showToast("Redirecting to login...", "info");
                                onSwitchToLogin();
                            }, 2500);
                        }
                        return; // Early return to prevent generic error toast
                    case "auth/invalid-email":
                        message = "Invalid email address format.";
                        break;
                    case "auth/weak-password":
                        message = "Your password is too weak. Try a stronger one.";
                        break;
                    case "auth/network-request-failed":
                        message = "Network error. Please check your connection.";
                        break;
                    case "auth/too-many-requests":
                        message = "Too many attempts. Please wait before trying again.";
                        break;
                    default:
                        message = `Auth error: ${errorMsg}`;  // Fallback for other auth issues
                        break;
                }
            } else if (errorMsg.includes("Firestore") || errorCode.includes("firestore") || !connectionTestPassed) {
                // Handle Firestore-related errors
                message = "Failed to save profile to database. ";
                if (errorCode === "permission-denied") {
                    message += "Database permissions issue—update your Firestore rules in the Firebase Console.";
                } else if (errorCode === "unavailable" || errorMsg.includes("network")) {
                    message += "Network or connection issue—ensure Firestore is enabled in your project.";
                } else if (errorMsg.includes("failed-precondition") || errorMsg.includes("invalid-argument")) {
                    message += "Invalid data or config—check your Firebase config in @/lib/firebase.js.";
                } else {
                    message += "Check your internet and Firebase setup (Firestore may not be enabled).";
                }
            } else {
                // Generic fallback for other errors
                message = "An unexpected error occurred. Please try again.";
            }

            // Ensure message is a clean string (no code snippets)
            message = String(message).substring(0, 200);  // Truncate if somehow corrupted

            showToast(message, "error");
        }
    };

    const handleOverlayClick = () => onClose?.();

    return (
        <div
            className={`${isModal
                ? "fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                : "min-h-screen bg-background"
                }`}
            onClick={isModal ? handleOverlayClick : undefined}
        >
            {isModal && (
                <div
                    className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <section className="py-8 px-6">
                        <div className="max-w-md mx-auto">
                            <div className="text-center mb-8 animate-fade-in">
                                <h1 className="font-heading text-3xl font-bold text-foreground mb-4">Join Getaways</h1>
                                <p className="font-body text-muted-foreground">Create your account and start exploring</p>
                            </div>

                            <div className="card-listing animate-scale-in">
                                <div className="p-8">
                                    {/* Account Type Switch */}
                                    <div className="flex rounded-xl bg-muted p-1 mb-6">
                                        <button
                                            onClick={() => setAccountType("guest")}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${accountType === "guest"
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            <User className="w-4 h-4" />
                                            Guest
                                        </button>
                                        <button
                                            onClick={() => setAccountType("host")}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${accountType === "host"
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            <Mail className="w-4 h-4" />
                                            Host
                                        </button>
                                    </div>

                                    {/* Signup Form */}
                                    <form className="space-y-6" onSubmit={handleSignUp}>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block font-medium text-foreground mb-2">First name</label>
                                                <input
                                                    type="text"
                                                    placeholder="First name"
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    className="w-full p-4 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-medium text-foreground mb-2">Last name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Last name"
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    className="w-full p-4 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block font-medium text-foreground mb-2">Email address</label>
                                            <input
                                                type="email"
                                                placeholder="Enter your email address"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full p-4 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-medium text-foreground mb-2">Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Create a password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full p-4 pr-12 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block font-medium text-foreground mb-2">Confirm Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="Confirm your password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className={`w-full p-4 pr-12 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${confirmPassword && !passwordMatch ? 'border-red-500' : ''}`}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            {confirmPassword && !passwordMatch && (
                                                <p className="text-red-500 text-sm mt-1">Passwords do not match.</p>
                                            )}
                                        </div>

                                        <div className="flex items-start space-x-3">
                                            <Checkbox
                                                id="terms-modal"
                                                checked={agreedTerms && agreedPrivacy} // checkbox reflects both states
                                                onCheckedChange={(checked) => {
                                                    if (!checked) {
                                                        // allow unchecking manually
                                                        setAgreedTerms(false);
                                                        setAgreedPrivacy(false);
                                                    } else {
                                                        // only allow checking if both were already agreed
                                                        if (agreedTerms && agreedPrivacy) {
                                                            // nothing needed, checkbox is already checked
                                                        } else {
                                                            showToast(
                                                                "Please read and agree to both the Terms of Service and Privacy Policy first.",
                                                                "error"
                                                            );
                                                        }
                                                    }
                                                }}
                                                className="mt-1"
                                                required
                                            />

                                            <label htmlFor="terms-modal" className="text-sm text-foreground leading-relaxed">
                                                I agree to the{" "}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTermsModal(true)}
                                                    className={`text-primary hover:text-primary/80 underline font-medium ${agreedTerms ? 'text-green-600' : ''}`}
                                                >
                                                    Terms of Service {agreedTerms && '✓'}
                                                </button>{" "}
                                                and{" "}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPrivacyModal(true)}
                                                    className={`text-primary hover:text-primary/80 underline font-medium ${agreedPrivacy ? 'text-green-600' : ''}`}
                                                >
                                                    Privacy Policy {agreedPrivacy && '✓'}
                                                </button>
                                            </label>
                                        </div>

                                        <button type="submit" className="w-full btn-primary text-lg py-4">
                                            Create Account
                                        </button>

                                        <div className="mt-2 text-center">
                                            <p className="text-muted-foreground">
                                                Already have an account?{" "}
                                                {isModal && onSwitchToLogin ? (
                                                    <button
                                                        onClick={onSwitchToLogin}
                                                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                                                    >
                                                        Login
                                                    </button>
                                                ) : (
                                                    <a
                                                        href="/login"
                                                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                                                    >
                                                        Login
                                                    </a>
                                                )}
                                            </p>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {!isModal && (
                <>
                    <Navigation />
                    <section className="pt-40 pb-20 px-6">
                        <div className="max-w-md mx-auto">
                            <div className="text-center mb-8 animate-fade-in">
                                <h1 className="font-heading text-3xl font-bold text-foreground mb-4">Join Getaways</h1>
                                <p className="font-body text-muted-foreground">Create your account and start exploring</p>
                            </div>

                            <div className="card-listing animate-scale-in">
                                <div className="p-8">
                                    {/* Account Type Switch */}
                                    <div className="flex rounded-xl bg-muted p-1 mb-6">
                                        <button
                                            onClick={() => setAccountType("guest")}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${accountType === "guest"
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            <User className="w-4 h-4" />
                                            Guest
                                        </button>
                                        <button
                                            onClick={() => setAccountType("host")}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${accountType === "host"
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            <Mail className="w-4 h-4" />
                                            Host
                                        </button>
                                    </div>

                                    {/* Signup Form */}
                                    <form className="space-y-6" onSubmit={handleSignUp}>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block font-medium text-foreground mb-2">First name</label>
                                                <input
                                                    type="text"
                                                    placeholder="First name"
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    className="w-full p-4 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-medium text-foreground mb-2">Last name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Last name"
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    className="w-full p-4 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block font-medium text-foreground mb-2">Email address</label>
                                            <input
                                                type="email"
                                                placeholder="Enter your email address"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full p-4 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-medium text-foreground mb-2">Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Create a password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full p-4 pr-12 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block font-medium text-foreground mb-2">Confirm Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="Confirm your password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className={`w-full p-4 pr-12 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${confirmPassword && !passwordMatch ? 'border-red-500' : ''}`}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            {confirmPassword && !passwordMatch && (
                                                <p className="text-red-500 text-sm mt-1">Passwords do not match.</p>
                                            )}
                                        </div>

                                        <div className="flex items-start space-x-3">
                                            <Checkbox
                                                id="terms-modal"
                                                checked={agreedTerms && agreedPrivacy} // checkbox reflects both states
                                                onCheckedChange={(checked) => {
                                                    if (!checked) {
                                                        // allow unchecking manually
                                                        setAgreedTerms(false);
                                                        setAgreedPrivacy(false);
                                                    } else {
                                                        // only allow checking if both were already agreed
                                                        if (agreedTerms && agreedPrivacy) {
                                                            // nothing needed, checkbox is already checked
                                                        } else {
                                                            showToast(
                                                                "Please read and agree to both the Terms of Service and Privacy Policy first.",
                                                                "error"
                                                            );
                                                        }
                                                    }
                                                }}
                                                className="mt-1"
                                                required
                                            />

                                            <label htmlFor="terms-modal" className="text-sm text-foreground leading-relaxed">
                                                I agree to the{" "}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTermsModal(true)}
                                                    className={`text-primary hover:text-primary/80 underline font-medium ${agreedTerms ? 'text-green-600' : ''}`}
                                                >
                                                    Terms of Service {agreedTerms && '✓'}
                                                </button>{" "}
                                                and{" "}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPrivacyModal(true)}
                                                    className={`text-primary hover:text-primary/80 underline font-medium ${agreedPrivacy ? 'text-green-600' : ''}`}
                                                >
                                                    Privacy Policy {agreedPrivacy && '✓'}
                                                </button>
                                            </label>
                                        </div>

                                        <button type="submit" className="w-full btn-primary text-lg py-4">
                                            Create Account
                                        </button>

                                        <div className="mt-2 text-center">
                                            <p className="text-muted-foreground">
                                                Already have an account?{" "}
                                                <a
                                                    href="/login"
                                                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                                                >
                                                    Login
                                                </a>
                                            </p>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </section>
                    <Footer />
                </>
            )}

            {/* Toast Notification */}
            {toast.message && (
                <div
                    className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-white ${toast.type === "error"
                        ? "bg-red-500"
                        : toast.type === "success"
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        } animate-fade-in`}
                >
                    {toast.message}
                </div>
            )}

            {showVerifyPopup && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-4 relative">
                        {/* Email Icon at top center */}
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-primary p-4 rounded-full">
                            <Mail className="w-8 h-8 text-white" />
                        </div>

                        <h2 className="text-2xl font-bold text-foreground mt-6">Verify Email Address</h2>
                        <p className="text-muted-foreground">
                            We've sent a verification link. Please open your inbox to confirm your email address and activate your account.
                        </p>
                        <div className="flex flex-col gap-3 mt-6">
                            <button
                                onClick={() => {
                                    // Open Gmail by default; user can switch to their email provider
                                    window.open("https://mail.google.com/", "_blank");
                                }}
                                className="bg-primary text-white py-3 rounded-xl hover:bg-primary/90 transition-all"
                            >
                                Verify Email Address
                            </button>
                            <span
                                onClick={async () => {
                                    setShowVerifyPopup(false); // hide popup
                                    await signOut(auth);
                                    if (isModal && onSwitchToLogin) {
                                        onSwitchToLogin();
                                    } else {
                                        navigate("/login", { replace: true });
                                    }
                                }}
                                className="text-sm text-primary hover:underline cursor-pointer mt-2"
                            >
                                Proceed to Login
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Terms & Privacy Modals */}
            <TermsModal
                isOpen={showTermsModal}
                onClose={() => setShowTermsModal(false)}
                onAgree={() => {
                    setAgreedTerms(true);
                    setShowTermsModal(false);
                }}
            />

            <PrivacyModal
                isOpen={showPrivacyModal}
                onClose={() => setShowPrivacyModal(false)}
                onAgree={() => {
                    setAgreedPrivacy(true);
                    setShowPrivacyModal(false);
                }}
            />
        </div>
    );
};

export default SignUp;
