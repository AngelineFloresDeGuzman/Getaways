import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { confirmPasswordReset, verifyPasswordResetCode, sendPasswordResetEmail } from "firebase/auth";
import { verifyPasswordResetToken } from "@/lib/emailService";

const validatePassword = (password) => {
  const minLength = /.{8,}/;
  const uppercase = /[A-Z]/;
  const lowercase = /[a-z]/;
  const number = /[0-9]/;
  const specialChar = /[!@#$%^&*]/;

  if (!minLength.test(password)) return "Password must be at least 8 characters.";
  if (!uppercase.test(password)) return "Password must contain at least one uppercase letter.";
  if (!lowercase.test(password)) return "Password must contain at least one lowercase letter.";
  if (!number.test(password)) return "Password must contain at least one number.";
  if (!specialChar.test(password)) return "Password must contain at least one special character.";

  return null;
};

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toast, setToast] = useState({ message: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [firebaseEmailSent, setFirebaseEmailSent] = useState(false);

  // Check for both Firebase action code (oobCode) and custom token
  const actionCode = searchParams.get("oobCode");
  const customToken = searchParams.get("token");

  useEffect(() => {
    const verifyToken = async () => {
      // If Firebase action code exists, use it directly
      if (actionCode) {
        try {
          console.log("🔑 Verifying Firebase action code...");
          const email = await verifyPasswordResetCode(auth, actionCode);
          console.log("✅ Action code verified, email:", email);
          setTokenValid(true);
          setUserEmail(email);
        } catch (error) {
          console.error("❌ Token verification error:", error);
          setTokenValid(false);
          if (error.code === "auth/invalid-action-code") {
            showToast("Invalid or expired reset link. Please request a new one.", "error");
          } else if (error.code === "auth/expired-action-code") {
            showToast("Reset link has expired. Please request a new password reset.", "error");
          } else {
            showToast("Error verifying reset link.", "error");
          }
        } finally {
          setIsVerifying(false);
        }
        return;
      }

      // If custom token exists (from EmailJS), verify it and trigger Firebase reset
      if (customToken) {
        try {
          console.log("🔑 Verifying custom token from EmailJS...");
          const result = await verifyPasswordResetToken(customToken);
          
          if (!result.valid) {
            setTokenValid(false);
            showToast(result.error || "Invalid or expired reset link.", "error");
            setIsVerifying(false);
            return;
          }

          console.log("✅ Custom token verified, email:", result.email);
          setUserEmail(result.email);

          // Trigger Firebase's password reset to get a secure reset link
          console.log("📧 Triggering Firebase password reset email...");
          await sendPasswordResetEmail(auth, result.email, {
            url: `${window.location.origin}/reset-password`,
            handleCodeInApp: true,
          });

          console.log("✅ Firebase reset email sent!");
          setFirebaseEmailSent(true);
          showToast("A secure password reset link has been sent to your email. Please check your inbox.", "success");
          
        } catch (error) {
          console.error("❌ Error processing reset:", error);
          setTokenValid(false);
          if (error.code === "auth/user-not-found") {
            showToast("No account found with this email.", "error");
          } else {
            showToast("Error processing reset request. Please try again.", "error");
          }
        } finally {
          setIsVerifying(false);
        }
        return;
      }

      // No token found
      setTokenValid(false);
      setIsVerifying(false);
      showToast("Invalid reset link.", "error");
    };

    verifyToken();
  }, [actionCode, customToken]);

  const showToast = (msg, type = "info") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    const errorMsg = validatePassword(password);
    if (errorMsg) {
      showToast(errorMsg, "error");
      return;
    }

    if (!actionCode) {
      showToast("Invalid reset link. Please request a new one.", "error");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🔑 Resetting password with Firebase action code...");
      
      // Use Firebase Auth's confirmPasswordReset - works without Cloud Functions!
      await confirmPasswordReset(auth, actionCode, password);
      
      console.log("✅ Password reset successfully!");
      showToast("Password reset successfully! Redirecting to login...", "success");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      
    } catch (err) {
      console.error("❌ Password reset error:", err);
      
      if (err.code === "auth/invalid-action-code") {
        showToast("Invalid or expired reset code. Please request a new password reset.", "error");
      } else if (err.code === "auth/expired-action-code") {
        showToast("Reset code has expired. Please request a new password reset.", "error");
      } else if (err.code === "auth/weak-password") {
        showToast("Password is too weak. Please choose a stronger password.", "error");
      } else {
        showToast(`Failed to reset password: ${err.message || "Please try again."}`, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (firebaseEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-green-600">Check Your Email</h1>
          <p className="mb-4">A secure password reset link has been sent to <strong>{userEmail}</strong>.</p>
          <p className="mb-6 text-sm text-muted-foreground">Please check your inbox and click the link to reset your password.</p>
          <button
            onClick={() => navigate("/login")}
            className="bg-primary text-white py-2 px-6 rounded"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Invalid Reset Link</h1>
          <p className="mb-4">This password reset link is invalid or has expired.</p>
          <button
            onClick={() => navigate("/login")}
            className="bg-primary text-white py-2 px-6 rounded"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Reset Your Password</h1>
        <p className="text-sm text-muted-foreground mb-6">Enter your new password for {userEmail}</p>
        {!actionCode && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ⚠️ Please use the link from Firebase's email (not the EmailJS email) to reset your password.
          </div>
        )}
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-border rounded-xl"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-border rounded-xl"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading || !password || !confirmPassword || !actionCode}
            className="w-full bg-primary text-white py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors font-medium"
            onClick={(e) => {
              console.log("Button clicked - State:", { 
                isLoading, 
                password: password ? "filled" : "empty", 
                confirmPassword: confirmPassword ? "filled" : "empty",
                actionCode: actionCode ? "exists" : "missing"
              });
              
              if (!actionCode) {
                e.preventDefault();
                showToast("Invalid reset link. Please use the link from Firebase's email (check your inbox).", "error");
                return;
              }
              if (!password || !confirmPassword) {
                e.preventDefault();
                showToast("Please fill in both password fields.", "warning");
                return;
              }
            }}
          >
            {isLoading ? "Resetting..." : !actionCode ? "Waiting for reset link..." : "Reset Password"}
          </button>
        </form>
        {toast.message && (
          <div className={`mt-4 p-3 rounded-xl text-white ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
