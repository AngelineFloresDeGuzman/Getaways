import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Eye, EyeOff, X } from "lucide-react";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { generatePasswordResetToken, sendPasswordResetEmail } from "@/lib/emailService";

const LogIn = ({ isModal = false, onClose, onLoginSuccess, setUserData, onSwitchToSignup, upgradeToHost = false }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const toastTimeoutRef = useRef();

  // Load saved email from localStorage on mount (password storage removed for security)
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Show toast with custom duration, always clear previous timeout
  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ message: "", type: "" });
      toastTimeoutRef.current = null;
    }, duration);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Set Firebase persistence based on "Remember me"
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

      // Sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

  const user = userCredential.user;
  // Ensure emailVerified is up-to-date
  await user.reload();

      const userDocRef = doc(db, "users", user.uid);

      // Fetch user document first to check roles
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        showToast("User data not found!", "error");
        return;
      }

      const userData = userDoc.data();
      if (!userData.favorites) userData.favorites = [];
      const userRoles = Array.isArray(userData.roles) ? userData.roles.flat() : ["guest"];

      // Check if account is terminated
      if (userData.isTerminated === true) {
        await signOut(auth);
        showToast("Your account has been terminated. Please contact support for assistance.", "error", 5000);
        setIsLoading(false);
        return; // STOP here, do NOT navigate or close modal
      }

      // For admin users, ensure emailVerified is true in Firestore
      try {
        if (userRoles.includes("admin") && !userData.emailVerified) {
            await updateDoc(userDocRef, { emailVerified: true });
          userData.emailVerified = true; // Update local copy
        }
      } catch (err) {
        console.warn("⚠️ Could not update emailVerified in Firestore:", err.code);
      }

      // Check email verification - use Firestore emailVerified (set by EmailJS) instead of Firebase Auth's emailVerified
      const isEmailVerified = userData.emailVerified === true;
      if (!isEmailVerified && !userRoles.includes("admin")) {
        // Show toast for 5 seconds in both modal and non-modal
        showToast("Please verify your email before logging in.", "warning", 5000);
        setIsLoading(false);
        return; // STOP here, do NOT navigate or close modal
      }


      // (Host role upgrade removed: now handled only after host type selection in HostTypeModal)

      // Store user data
      setUserData?.(userData);

      // Save only email if rememberMe (password storage removed for security)
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // Only close modal if login successful - use Firestore emailVerified (set by EmailJS)
      if (isEmailVerified || userRoles.includes("admin")) {
        // If upgradeToHost is true, call onLoginSuccess instead of onClose
        // This allows the parent to show host type selection after successful login
        // Don't navigate - let the HostTypeModal handle the flow
        if (upgradeToHost && onLoginSuccess) {
          onLoginSuccess();
        } else {
          // Redirect based on roles (only if not upgrading to host)
          if (userRoles.includes("host")) {
            navigate("/host/hostdashboard", { replace: true });
          } else if (userRoles.includes("guest")) {
            navigate("/guest/index", { replace: true });
          } else if (userRoles.includes("admin")) {
            navigate("/admin/admindashboard", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
          onClose?.();
        }
      }
    } catch (error) {
      let message = "An unexpected error occurred. Please try again.";

      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        message = "Incorrect email or password. Please try again.";
      } else if (error.code === "auth/user-not-found") {
        message = "No account found with this email.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many attempts. Please wait before trying again.";
      }

      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = () => onClose?.();

  const handleForgotPassword = async () => {
    if (!email || !email.trim()) {
      showToast("Please enter your email first.", "warning");
      return;
    }

    if (isForgotPasswordLoading) {
      return; // Prevent multiple clicks
    }

    setIsForgotPasswordLoading(true);

    try {
      console.log("🔑 Starting password reset for:", email.trim());
      
      // Find user by email in Firestore to get userId and firstName
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.error("❌ No user found with email:", email.trim());
        showToast("No account found with this email.", "error");
        setIsForgotPasswordLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const userId = userDoc.id;
      const firstName = userData.firstName || 'User';

      console.log("✅ User found:", userId, "Name:", firstName);

      // Generate custom password reset token
      console.log("🔑 Generating password reset token...");
      const token = await generatePasswordResetToken(userId, email.trim());
      console.log("✅ Token generated:", token);
      
      // Send password reset email via EmailJS (custom branded email!)
      console.log("📧 Sending password reset email via EmailJS...");
      await sendPasswordResetEmail(email.trim(), firstName, token);
      
      console.log("✅ Password reset email sent successfully");
      showToast("Password reset email sent! Check your inbox and click the link to reset your password.", "success");
    } catch (error) {
      console.error("❌ Password reset error:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        status: error.status,
        text: error.text
      });
      
      // More specific error messages
      if (error.message?.includes("No account found") || error.message?.includes("email")) {
        showToast("No account found with this email.", "error");
      } else if (error.status === 422 || error.text?.includes("recipients address")) {
        showToast("Email configuration error. Please contact support.", "error");
      } else {
        showToast(`Failed to send password reset email: ${error.message || "Please try again."}`, "error");
      }
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  // Handle Google redirect result on mount
  useEffect(() => {
    let isProcessing = false;
    
    const handleRedirectResult = async () => {
      // Check if global handler is already processing
      const processingFlag = sessionStorage.getItem('processingGoogleRedirect');
      if (isProcessing || processingFlag === 'true') {
        return;
      }
      
      try {
        console.log("🔍 [LogIn] Checking for Google redirect result...");
        const result = await getRedirectResult(auth);
        
        if (result) {
          sessionStorage.setItem('processingGoogleRedirect', 'true');
          console.log("✅ [LogIn] Google redirect result found:", result.user.email);
          // User signed in via redirect
          const user = result.user;
          
          // Ensure emailVerified is up-to-date
          await user.reload();

          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            // Create user document if it doesn't exist
            const displayName = user.displayName || "";
            const nameParts = displayName.split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";

            await setDoc(userDocRef, {
              firstName,
              lastName,
              email: user.email,
              emailVerified: user.emailVerified,
              roles: ["guest"],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            
            console.log("✅ New user document created");
          } else {
            // Update existing user document
            const userData = userDoc.data();
            const userRoles = Array.isArray(userData.roles) ? userData.roles.flat() : ["guest"];
            
            // Update emailVerified status
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
            
            console.log("✅ Existing user signed in");
          }

          // Get updated user data
          const updatedUserDoc = await getDoc(userDocRef);
          const userData = updatedUserDoc.data();
          const userRoles = Array.isArray(userData.roles) ? userData.roles.flat() : ["guest"];

          // Store user data
          setUserData?.(userData);

          // Google sign-in always succeeds (email is verified by Google)
          if (upgradeToHost && onLoginSuccess) {
            onLoginSuccess();
          } else {
            // Redirect based on roles
            let redirectPath = "/";
            if (userRoles.includes("host")) {
              redirectPath = "/host/hostdashboard";
            } else if (userRoles.includes("guest")) {
              redirectPath = "/guest/index";
            } else if (userRoles.includes("admin")) {
              redirectPath = "/admin/admindashboard";
            }
            
            console.log("🚀 Navigating user to:", redirectPath);
            
            // Use setTimeout to ensure navigation happens after state updates
            setTimeout(() => {
              navigate(redirectPath, { replace: true });
              onClose?.();
            }, 100);
            
            // Clear processing flag after navigation
            setTimeout(() => {
              sessionStorage.removeItem('processingGoogleRedirect');
            }, 2000);
          }
        } else {
          console.log("ℹ️ [LogIn] No redirect result found (user may not have come from Google auth)");
        }
      } catch (error) {
        console.error("❌ [LogIn] Google redirect error:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        sessionStorage.removeItem('processingGoogleRedirect');
        setIsGoogleLoading(false);
        showToast(`Failed to complete Google sign-in: ${error.message || "Please try again."}`, "error");
      }
    };

    // Also listen for auth state changes as a fallback
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !isProcessing) {
        // Check if user just signed in (might be from redirect)
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.providerData.some(provider => provider.providerId === 'google.com')) {
          console.log("🔄 Auth state changed - Google user detected, processing...");
          // Small delay to ensure redirect result is available
          setTimeout(() => {
            handleRedirectResult();
          }, 500);
        }
      }
    });

    // Check for redirect result immediately
    handleRedirectResult();
    
    return () => {
      unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    
    // Set custom parameters for better UX
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      // Use redirect instead of popup to avoid COOP issues
      await signInWithRedirect(auth, provider);
      
      // Note: The rest of the flow is handled in the useEffect above
      // when the user returns from Google authentication
    } catch (error) {
      // Loading state will be reset after redirect completes
      // The redirect result is handled in useEffect above
      
      let message = "Failed to sign in with Google. Please try again.";
      
      if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
        message = "Sign-in was cancelled. Please try again.";
      } else if (error.code === "auth/popup-blocked") {
        message = "Popup was blocked. Please allow popups and try again.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Network error. Please check your connection.";
      }

      showToast(message, "error");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div
      className={`${isModal ? "fixed inset-0 z-50 flex items-center justify-center bg-black/50" : "min-h-screen bg-background"}`}
      onClick={isModal ? handleOverlayClick : undefined}
    >
      <div
        className={`${isModal ? "bg-white rounded-2xl shadow-lg p-6 w-full max-w-md relative" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isModal && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {!isModal && <Navigation />}

        <section className={`${isModal ? "py-8 px-6" : "flex items-center justify-center min-h-screen px-6 py-12"}`}>
          <div className="w-full max-w-md">
            <div className="text-center mb-6 animate-fade-in">
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                Sign in to your Getaways account
              </h1>
              <p className="font-body text-sm md:text-base text-muted-foreground">
                Sign in to your Getaways account
              </p>
            </div>

            <div className="card-listing animate-scale-in">
              <div className="p-6 md:p-8">
                <form className="space-y-6" onSubmit={handleLogin}>
                  <div>
                    <label className="block font-medium text-foreground mb-2">Email address</label>
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      className="w-full p-4 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-foreground mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="w-full p-4 pr-12 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={() => setRememberMe(!rememberMe)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-muted-foreground">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleForgotPassword();
                      }}
                      disabled={isForgotPasswordLoading}
                      className={`text-sm text-primary hover:text-primary/80 font-medium transition-colors ${isForgotPasswordLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isForgotPasswordLoading ? 'Sending...' : 'Forgot password?'}
                    </button>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isLoading || isGoogleLoading}
                    className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>

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
                    onClick={handleGoogleSignIn}
                    disabled={isLoading || isGoogleLoading}
                    className="w-full mt-4 flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-xl bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGoogleLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                        <span>Signing in...</span>
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
                    Don't have an account?{" "}
                    {isModal ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault(); // prevent any default navigation
                          onSwitchToSignup?.(); // call parent handler safely
                        }}
                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Sign up
                      </button>
                    ) : (
                      <a
                        href="/signup"
                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Sign up
                      </a>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {toast.message && (
          <div
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-white ${toast.type === "error"
              ? "bg-red-500"
              : toast.type === "warning"
                ? "bg-yellow-500"
                : "bg-green-500"
              } animate-fade-in`}
          >
            {toast.message}
          </div>
        )}

        {!isModal && <Footer />}
      </div>
    </div>
  );
};

export default LogIn;
