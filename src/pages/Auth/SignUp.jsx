import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import TermsModal from "@/components/TermsModal";
import PrivacyModal from "@/components/PrivacyModal";
import { Eye, EyeOff, Mail, User, X } from "lucide-react";
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db, app } from "@/lib/firebase";
import { doc, setDoc, collection, getDocs, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";  // Add collection, getDocs if missing
import { Checkbox } from "@/components/ui/checkbox";
import { generateVerificationToken, sendVerificationEmail } from "@/lib/emailService";

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
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
        setIsLoading(true);

        // Validate terms and conditions
        if (!agreedTerms || !agreedPrivacy) {
            showToast("You must accept the terms and conditions to create an account.", "error");
            setIsLoading(false);
            return;
        }

        // User trying to check without reading both documents
        if (!acceptTerms || !agreedTerms || !agreedPrivacy) {
            showToast("Please read both the Terms & Conditions and Privacy Policy first.", "error");
            setIsLoading(false);
            return;
        }

        // Validate password match
        if (password !== confirmPassword) {
            showToast("Passwords do not match. Please try again.", "error");
            setIsLoading(false);
            return;
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            showToast("Password must be at least 8 characters long and contain at least one letter, one number, and one special character (@$!%*#?&).", "error");
            setIsLoading(false);
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
            
            // Wait for auth state to propagate (important for Firestore security rules)
            console.log("⏳ Waiting for auth state to propagate...");
            if (!auth.currentUser || auth.currentUser.uid !== users.uid) {
                // Reload user to ensure auth state is ready
                try {
                    await users.reload();
                    console.log("✅ User reloaded");
                } catch (reloadError) {
                    console.log("⚠️ User reload failed (may not be necessary):", reloadError);
                }
                
                // Wait up to 2 seconds for auth state to update via onAuthStateChanged
                await new Promise((resolve) => {
                    let resolved = false;
                    const unsubscribe = onAuthStateChanged(auth, (user) => {
                        if (user && user.uid === users.uid && !resolved) {
                            console.log("✅ Auth state propagated:", user.uid);
                            resolved = true;
                            unsubscribe();
                            resolve();
                        }
                    });
                    // Timeout after 2 seconds
                    setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            unsubscribe();
                            console.log("⚠️ Auth state timeout, proceeding anyway...");
                            console.log("⚠️ auth.currentUser:", auth.currentUser?.uid);
                        }
                        resolve();
                    }, 2000);
                });
            }
            
            // Final check
            console.log("🔍 Final auth check - auth.currentUser:", auth.currentUser?.uid);

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
            const roles = accountType === "host" ? ["guest", "host"] : ["guest"];
            
            if (accountType === "host") {
                console.log("🟡 Creating dual-role account (guest + host)");
            } else {
                console.log("🟡 Creating guest account");
            }

            // Save user document to Firestore
            const userDocRef = doc(db, "users", users.uid);
            const userDataToSave = {
                firstName,
                lastName,
                email,
                emailVerified: false,
                roles: roles,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            console.log("📝 Attempting to save user data:", {
                uid: users.uid,
                email: email,
                roles: roles,
                firstName: firstName,
                lastName: lastName
            });
            console.log("📝 User document reference:", userDocRef.path);
            console.log("📝 Data to save:", JSON.stringify(userDataToSave, null, 2));

            try {
                console.log("⏳ Calling setDoc...");
                console.log("⏳ User from credential:", users.uid);
                console.log("⏳ Auth current user:", auth.currentUser?.uid);
                console.log("⏳ Document path: users/" + users.uid);
                
                // Ensure auth.currentUser is set before writing
                if (!auth.currentUser || auth.currentUser.uid !== users.uid) {
                    console.log("⚠️ auth.currentUser not set, waiting again...");
                    // Wait for auth state one more time
                    await new Promise((resolve) => {
                        let resolved = false;
                        const unsubscribe = onAuthStateChanged(auth, (user) => {
                            if (user && user.uid === users.uid && !resolved) {
                                console.log("✅ Auth state ready for write:", user.uid);
                                resolved = true;
                                unsubscribe();
                                resolve();
                            }
                        });
                        setTimeout(() => {
                            if (!resolved) {
                                resolved = true;
                                unsubscribe();
                                console.log("⚠️ Auth wait timeout, but proceeding with credential user");
                            }
                            resolve();
                        }, 1000);
                    });
                }
                
                // Final check before write
                if (!users || !users.uid) {
                    throw new Error("Invalid user credential - user ID is missing");
                }
                
                console.log("✅ Proceeding with write - auth.currentUser:", auth.currentUser?.uid);
                
                // Get ID token to ensure authentication is ready
                try {
                    const idToken = await users.getIdToken();
                    console.log("✅ ID token obtained, length:", idToken?.length || 0);
                } catch (tokenError) {
                    console.warn("⚠️ Could not get ID token:", tokenError);
                }
                
                const setDocPromise = setDoc(userDocRef, userDataToSave);
                
                // Add timeout to prevent hanging (reduced to 5 seconds for faster feedback)
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => {
                        reject(new Error("Firestore write timeout after 5 seconds. This usually means Firestore security rules are blocking the write. Check your rules allow: allow create: if request.auth != null && request.auth.uid == userId;"));
                    }, 5000)
                );
                
                try {
                    await Promise.race([setDocPromise, timeoutPromise]);
                    console.log("✅ setDoc completed successfully");
                } catch (raceError) {
                    // Check if it's a permission error that got caught by timeout
                    if (raceError?.code === 'permission-denied') {
                        throw new Error("Permission denied: Firestore security rules are blocking this write. Update your rules to allow: allow create: if request.auth != null && request.auth.uid == userId;");
                    }
                    throw raceError;
                }
                
                // Small delay to ensure write is propagated
                await new Promise(resolve => setTimeout(resolve, 500));
                
                console.log("🔍 Verifying document was saved...");
                // Verify the document was saved
                const verifyDoc = await getDoc(userDocRef);
                if (verifyDoc.exists()) {
                    console.log("✅ Verified: User document exists in Firestore");
                    const savedData = verifyDoc.data();
                    console.log("📋 Saved user data:", {
                        uid: users.uid,
                        email: savedData.email,
                        roles: savedData.roles,
                        firstName: savedData.firstName,
                        lastName: savedData.lastName
                    });
                } else {
                    console.error("❌ Warning: User document not found after save");
                    throw new Error("Failed to verify user document creation");
                }
            } catch (firestoreError) {
                console.error("❌ Firestore save error:", firestoreError);
                console.error("❌ Error details:", {
                    code: firestoreError?.code,
                    message: firestoreError?.message,
                    name: firestoreError?.name,
                    stack: firestoreError?.stack
                });
                
                // Check if it's a permission error
                if (firestoreError?.code === 'permission-denied' || firestoreError?.message?.includes('permission')) {
                    console.error("🚫 PERMISSION DENIED: Check Firestore security rules!");
                    console.error("Required rule: allow create: if request.auth != null && request.auth.uid == userId;");
                }
                
                throw firestoreError; // Re-throw to be caught by outer catch
            }

            // Generate verification token and send email using EmailJS
            console.log("🟡 Sending verification email...");
            console.log("📧 Email to send to:", email);
            try {
                const token = await generateVerificationToken(users.uid, email);
                console.log("🔑 Token generated, sending email to:", email);
                await sendVerificationEmail(email, firstName, lastName, token);
                console.log("📩 Verification email sent");
                setShowVerifyPopup(true);
            } catch (emailError) {
                console.error("Error sending verification email:", emailError);
                console.error("Email that failed:", email);
                showToast("Account created but failed to send verification email. Please contact support.", "warning");
                // Still show the popup so user can proceed
                setShowVerifyPopup(true);
            }

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
            } else if (errorMsg.includes("Firestore") || errorCode.includes("firestore") || errorCode.includes("permission-denied") || !connectionTestPassed) {
                // Handle Firestore-related errors
                message = "Failed to save profile to database. ";
                if (errorCode === "permission-denied" || errorCode.includes("permission-denied")) {
                    message += "Database permissions issue. Please check your Firestore security rules allow users to create their own documents. Required rule: allow create: if request.auth != null && request.resource.id == request.auth.uid;";
                } else if (errorCode === "unavailable" || errorMsg.includes("network")) {
                    message += "Network or connection issue—ensure Firestore is enabled in your project.";
                } else if (errorMsg.includes("failed-precondition") || errorMsg.includes("invalid-argument")) {
                    message += "Invalid data or config—check your Firebase config in @/lib/firebase.js.";
                } else {
                    message += `Check your internet and Firebase setup. Error: ${errorCode || errorMsg}`;
                }
            } else {
                // Generic fallback for other errors
                message = "An unexpected error occurred. Please try again.";
            }

            // Ensure message is a clean string (no code snippets)
            message = String(message).substring(0, 200);  // Truncate if somehow corrupted

            showToast(message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        // Validate terms and conditions
        if (!agreedTerms || !agreedPrivacy) {
            showToast("You must accept the terms and conditions to sign up.", "error");
            return;
        }

        setIsGoogleLoading(true);
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            // Ensure emailVerified is up-to-date
            await user.reload();

            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                // Create new user document
                const displayName = user.displayName || "";
                const nameParts = displayName.split(" ");
                const firstName = nameParts[0] || "";
                const lastName = nameParts.slice(1).join(" ") || "";

                // Prepare user data with proper role structure based on accountType
                const roles = accountType === "host" ? ["guest", "host"] : ["guest"];

                await setDoc(userDocRef, {
                    firstName,
                    lastName,
                    email: user.email,
                    emailVerified: user.emailVerified, // Google accounts are already verified
                    roles: roles,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            } else {
                // User already exists, just update emailVerified
                const userData = userDoc.data();
                const userRoles = Array.isArray(userData.roles) ? userData.roles.flat() : ["guest"];
                
                try {
                    if (!userRoles.includes("admin")) {
                        await updateDoc(userDocRef, { 
                            emailVerified: user.emailVerified,
                            updatedAt: serverTimestamp()
                        });
                    }
                } catch (err) {
                    console.warn("⚠️ Could not update emailVerified in Firestore:", err.code);
                }

                showToast("Signed in successfully!", "success");
            }

            // Google sign-up always succeeds (email is verified by Google)
            // Close modal and navigate based on account type
            if (isModal) {
                onClose();
            }
            
            // Navigate based on account type
            if (accountType === "host") {
                navigate("/pages/hostingsteps", { replace: true });
            } else {
                navigate("/guest/index", { replace: true });
            }
        } catch (error) {
            console.error("Google sign-up error:", error);
            let message = "Failed to sign up with Google. Please try again.";
            
            if (error.code === "auth/popup-closed-by-user") {
                message = "Sign-up popup was closed. Please try again.";
            } else if (error.code === "auth/popup-blocked") {
                message = "Popup was blocked. Please allow popups and try again.";
            } else if (error.code === "auth/network-request-failed") {
                message = "Network error. Please check your connection.";
            }

            showToast(message, "error");
        } finally {
            setIsGoogleLoading(false);
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
                                <p className="font-body text-muted-foreground">Sign up and start exploring</p>
                            </div>

                            <div className="card-listing animate-scale-in">
                                <div className="p-8">
                                    {/* Account Type Switch */}
                                    <div className="flex rounded-xl bg-muted p-1 mb-6">
                                        <button
                                            onClick={() => setAccountType("guest")}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-all ${accountType === "guest"
                                                ? "bg-primary text-white shadow-sm rounded-l-lg"
                                                : "text-muted-foreground hover:text-foreground border border-border rounded-l-lg border-r-0"
                                                }`}
                                        >
                                            <User className="w-4 h-4" />
                                            Guest
                                        </button>
                                        <button
                                            onClick={() => setAccountType("host")}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-all ${accountType === "host"
                                                ? "bg-primary text-white shadow-sm rounded-r-lg"
                                                : "text-muted-foreground hover:text-foreground border border-border rounded-r-lg border-l-0"
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

                                        <button 
                                            type="submit" 
                                            disabled={isLoading || isGoogleLoading}
                                            className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                    Signing up...
                                                </>
                                            ) : (
                                                "Sign Up"
                                            )}
                                        </button>

                                        <div className="mt-6">
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-border"></div>
                                                </div>
                                                <div className="relative flex justify-center text-sm">
                                                    <span className="px-2 bg-white text-muted-foreground">Or continue with</span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleGoogleSignUp}
                                                disabled={isLoading || isGoogleLoading}
                                                className="w-full mt-4 flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-xl bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isGoogleLoading ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                                        <span>Signing up...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                            <path
                                                                fill="#4285F4"
                                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                            />
                                                            <path
                                                                fill="#34A853"
                                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                            />
                                                            <path
                                                                fill="#FBBC05"
                                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                            />
                                                            <path
                                                                fill="#EA4335"
                                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                            />
                                                        </svg>
                                                        <span className="font-medium text-foreground">Continue with Google</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <div className="mt-6 text-center">
                                            <p className="text-muted-foreground">
                                                Already have an account?{" "}
                                                {isModal && onSwitchToLogin ? (
                                                    <button
                                                        onClick={onSwitchToLogin}
                                                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                                                    >
                                                        Sign in
                                                    </button>
                                                ) : (
                                                    <a
                                                        href="/login"
                                                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                                                    >
                                                        Sign in
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
                                <p className="font-body text-muted-foreground">Sign up and start exploring</p>
                            </div>

                            <div className="card-listing animate-scale-in">
                                <div className="p-8">
                                    {/* Account Type Switch */}
                                    <div className="flex rounded-xl bg-muted p-1 mb-6">
                                        <button
                                            onClick={() => setAccountType("guest")}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-all ${accountType === "guest"
                                                ? "bg-primary text-white shadow-sm rounded-l-lg"
                                                : "text-muted-foreground hover:text-foreground border border-border rounded-l-lg border-r-0"
                                                }`}
                                        >
                                            <User className="w-4 h-4" />
                                            Guest
                                        </button>
                                        <button
                                            onClick={() => setAccountType("host")}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-all ${accountType === "host"
                                                ? "bg-primary text-white shadow-sm rounded-r-lg"
                                                : "text-muted-foreground hover:text-foreground border border-border rounded-r-lg border-l-0"
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

                                        <button 
                                            type="submit" 
                                            disabled={isLoading || isGoogleLoading}
                                            className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                    Signing up...
                                                </>
                                            ) : (
                                                "Sign Up"
                                            )}
                                        </button>

                                        <div className="mt-6">
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-border"></div>
                                                </div>
                                                <div className="relative flex justify-center text-sm">
                                                    <span className="px-2 bg-white text-muted-foreground">Or continue with</span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleGoogleSignUp}
                                                disabled={isLoading || isGoogleLoading}
                                                className="w-full mt-4 flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-xl bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isGoogleLoading ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                                        <span>Signing up...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                            <path
                                                                fill="#4285F4"
                                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                            />
                                                            <path
                                                                fill="#34A853"
                                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                            />
                                                            <path
                                                                fill="#FBBC05"
                                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                            />
                                                            <path
                                                                fill="#EA4335"
                                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                            />
                                                        </svg>
                                                        <span className="font-medium text-foreground">Continue with Google</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <div className="mt-6 text-center">
                                            <p className="text-muted-foreground">
                                                Already have an account?{" "}
                                                <a
                                                    href="/login"
                                                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                                                >
                                                    Sign in
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-4 relative" onClick={(e) => e.stopPropagation()}>
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
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent click from bubbling up
                                    // Open Gmail by default; user can switch to their email provider
                                    window.open("https://mail.google.com/", "_blank");
                                }}
                                className="bg-primary text-white py-3 rounded-xl hover:bg-primary/90 transition-all"
                            >
                                Verify Email Address
                            </button>
                            <span
                                onClick={async (e) => {
                                    e.stopPropagation(); // Prevent click from bubbling up to HostTypeModal overlay
                                    setShowVerifyPopup(false); // Hide popup immediately
                                    // Call onSwitchToLogin FIRST to set modal state
                                    if (isModal && onSwitchToLogin) {
                                        // Use setTimeout to ensure it runs after current render cycle
                                        setTimeout(async () => {
                                            onSwitchToLogin(); // This will hide SignUp modal and show Login modal
                                            // Give time for the modal to switch before signout
                                            await new Promise(resolve => setTimeout(resolve, 100));
                                            await signOut(auth); // Then sign out (after modal switch is rendered)
                                        }, 50);
                                    } else {
                                        await signOut(auth);
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
