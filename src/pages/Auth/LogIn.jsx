import React, { useState } from "react"; 
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Eye, EyeOff, X } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const LogIn = ({ isModal = false, onClose, setUserData }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState({ message: "", type: "" });

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        showToast("User data not found!", "error");
        return;
      }

      const userData = userDoc.data();
      const role = userData.role;

      if (role !== "admin" && !user.emailVerified) {
        showToast("Please verify your email before logging in.", "warning");
        return;
      }

      // Ensure favorites exist
      if (!userData.favorites) userData.favorites = [];

      // Store user-specific data in parent state/context
      setUserData?.(userData);

      // Redirect user immediately based on role
      if (role === "host") navigate("/host/hostdashboard", { replace: true });
      else if (role === "guest") navigate("/guest/index", { replace: true });
      else if (role === "admin") navigate("/admin/admindashboard", { replace: true });
      else navigate("/", { replace: true });

      onClose?.(); // close modal if applicable
    } catch (error) {
      let message = "An unexpected error occurred. Please try again.";

      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
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

  return (
    <div
      className={`${
        isModal
          ? "fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          : "min-h-screen bg-background"
      }`}
      onClick={isModal ? handleOverlayClick : undefined}
    >
      <div
        className={`${
          isModal
            ? "bg-white rounded-2xl shadow-lg p-6 w-full max-w-md relative"
            : ""
        }`}
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

        {!isModal && <Navigation />} {/* Navigation can use userData to personalize menu */}

        <section
          className={`${
            isModal
              ? "py-8 px-6"
              : "flex items-center justify-center min-h-screen px-6 py-12"
          }`}
        >
          <div className="w-full max-w-md">
            <div className="text-center mb-6 animate-fade-in">
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
                Welcome back
              </h1>
              <p className="font-body text-sm md:text-base text-muted-foreground">
                Sign in to your Havenly account
              </p>
            </div>

            <div className="card-listing animate-scale-in">
              <div className="p-6 md:p-8">
                <form className="space-y-6" onSubmit={handleLogin}>
                  <div>
                    <label className="block font-medium text-foreground mb-2">
                      Email address
                    </label>
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
                    <label className="block font-medium text-foreground mb-2">
                      Password
                    </label>
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
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-muted-foreground">
                        Remember me
                      </span>
                    </label>
                    <a
                      href="#"
                      className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Forgot password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-primary text-lg py-4"
                  >
                    Sign In
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-muted-foreground">
                    Don’t have an account?{" "}
                    <a
                      href="/signup"
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Sign up
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {toast.message && (
          <div
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-white 
              ${toast.type === "error"
                ? "bg-red-500"
                : toast.type === "warning"
                  ? "bg-yellow-500"
                  : "bg-green-500"
              } 
              animate-fade-in`}
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
