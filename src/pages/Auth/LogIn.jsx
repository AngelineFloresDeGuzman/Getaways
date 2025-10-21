import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Eye, EyeOff, X } from "lucide-react";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";

const LogIn = ({ isModal = false, onClose, setUserData, onSwitchToSignup, upgradeToHost = false }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });

  // Load saved credentials from localStorage on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // Set Firebase persistence based on "Remember me"
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

      // Sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);

      // Update emailVerified in Firestore (non-blocking)
      try {
        await updateDoc(userDocRef, { emailVerified: user.emailVerified });
      } catch (err) {
        console.warn("⚠️ Could not update emailVerified in Firestore:", err.code);
      }

      // Fetch user document
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        showToast("User data not found!", "error");
        return;
      }

      const userData = userDoc.data();
      if (!userData.favorites) userData.favorites = [];
      const userRoles = Array.isArray(userData.roles) ? userData.roles.flat() : ["guest"];

      // Check email verification
      if (!user.emailVerified && !userRoles.includes("admin")) {
        showToast("Please verify your email before logging in.", "warning");
        return; // STOP here, do NOT navigate or close modal
      }

      // Only now proceed to upgrade host, save data, navigate

      // Upgrade to host if needed
      if (upgradeToHost) {
        const currentRoles = [...userRoles];
        if (!currentRoles.includes("host")) currentRoles.push("host");

        await updateDoc(userDocRef, {
          roles: currentRoles,
          updatedAt: new Date().toISOString(),
        });
        userData.roles = currentRoles;
        showToast("Welcome! Your account now has host access.", "success");
      }

      // Store user data
      setUserData?.(userData);

      // Save credentials if rememberMe
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }

      // Redirect based on roles
      if (userRoles.includes("host")) {
        navigate(upgradeToHost ? "/pages/propertydetails" : "/host/hostdashboard", { replace: true });
      } else if (userRoles.includes("guest")) {
        navigate("/guest/index", { replace: true });
      } else if (userRoles.includes("admin")) {
        navigate("/admin/admindashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }

      // Only close modal if login successful
      if (user.emailVerified || roles === "admin") {
        onClose?.();
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
    }
  };

  const handleOverlayClick = () => onClose?.();

  const handleForgotPassword = async () => {
    if (!email) {
      showToast("Please enter your email first.", "warning");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showToast("Password reset email sent! Check your inbox.", "success");
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        showToast("No account found with this email.", "error");
      } else {
        showToast("Failed to send password reset email.", "error");
      }
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
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleForgotPassword();
                      }}
                      className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Forgot password?
                    </a>
                  </div>

                  <button type="submit" className="w-full btn-primary text-lg py-4">
                    Sign In
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-muted-foreground">
                    Don't have an account?{" "}
                    {isModal && onSwitchToSignup ? (
                      <button onClick={onSwitchToSignup} className="text-primary hover:text-primary/80 font-medium transition-colors">
                        Sign up
                      </button>
                    ) : (
                      <a href="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
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
