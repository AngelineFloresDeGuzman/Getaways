import React, { useState } from "react";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Eye, EyeOff, Mail, Phone, User } from 'lucide-react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // make sure your firebase config exports `auth`
const SignUp = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [signupMethod, setSignupMethod] = useState('email');
    const [accountType, setAccountType] = useState('guest');
    // New state for email/password/name
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const handleSignUp = (e) => __awaiter(void 0, void 0, void 0, function* () {
        e.preventDefault();
        if (signupMethod !== 'email')
            return;
        try {
            const userCredential = yield createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            yield sendEmailVerification(user);
            alert('Account created! Please check your email to verify your account.');
            // optionally, clear the form
            setFirstName('');
            setLastName('');
            setEmail('');
            setPassword('');
        }
        catch (error) {
            alert(error.message);
        }
    });
    return (React.createElement("div", { className: "min-h-screen bg-background" },
        React.createElement(Navigation, null),
        React.createElement("section", { className: "pt-24 pb-20 px-6" },
            React.createElement("div", { className: "max-w-md mx-auto" },
                React.createElement("div", { className: "text-center mb-8 animate-fade-in" },
                    React.createElement("h1", { className: "font-heading text-3xl font-bold text-foreground mb-4" }, "Join Havenly"),
                    React.createElement("p", { className: "font-body text-muted-foreground" }, "Create your account and start exploring")),
                React.createElement("div", { className: "card-listing animate-scale-in" },
                    React.createElement("div", { className: "p-8" },
                        React.createElement("div", { className: "flex rounded-xl bg-muted p-1 mb-6" },
                            React.createElement("button", { onClick: () => setAccountType('guest'), className: `flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${accountType === 'guest'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'}` },
                                React.createElement(User, { className: "w-4 h-4" }),
                                "Guest"),
                            React.createElement("button", { onClick: () => setAccountType('host'), className: `flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${accountType === 'host'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'}` },
                                React.createElement(Mail, { className: "w-4 h-4" }),
                                "Host")),
                        React.createElement("div", { className: "flex rounded-xl bg-muted/50 p-1 mb-6" },
                            React.createElement("button", { onClick: () => setSignupMethod('email'), className: `flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${signupMethod === 'email'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'}` },
                                React.createElement(Mail, { className: "w-3 h-3" }),
                                "Email"),
                            React.createElement("button", { onClick: () => setSignupMethod('phone'), className: `flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${signupMethod === 'phone'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'}` },
                                React.createElement(Phone, { className: "w-3 h-3" }),
                                "Phone")),
                        React.createElement("form", { className: "space-y-6", onSubmit: handleSignUp },
                            React.createElement("div", { className: "grid grid-cols-2 gap-4" },
                                React.createElement("div", null,
                                    React.createElement("label", { className: "block font-medium text-foreground mb-2" }, "First name"),
                                    React.createElement("input", { type: "text", placeholder: "First name", value: firstName, onChange: (e) => setFirstName(e.target.value), className: "w-full p-4 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all", required: true })),
                                React.createElement("div", null,
                                    React.createElement("label", { className: "block font-medium text-foreground mb-2" }, "Last name"),
                                    React.createElement("input", { type: "text", placeholder: "Last name", value: lastName, onChange: (e) => setLastName(e.target.value), className: "w-full p-4 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all", required: true }))),
                            React.createElement("div", null,
                                React.createElement("label", { className: "block font-medium text-foreground mb-2" }, signupMethod === 'email' ? 'Email address' : 'Phone number'),
                                React.createElement("input", { type: signupMethod === 'email' ? 'email' : 'tel', placeholder: signupMethod === 'email' ? 'Enter your email address' : 'Enter your phone number', value: signupMethod === 'email' ? email : undefined, onChange: (e) => signupMethod === 'email' && setEmail(e.target.value), className: "w-full p-4 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all", required: signupMethod === 'email' })),
                            React.createElement("div", null,
                                React.createElement("label", { className: "block font-medium text-foreground mb-2" }, "Password"),
                                React.createElement("div", { className: "relative" },
                                    React.createElement("input", { type: showPassword ? 'text' : 'password', placeholder: "Create a password", value: password, onChange: (e) => setPassword(e.target.value), className: "w-full p-4 pr-12 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all", required: true }),
                                    React.createElement("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" }, showPassword ? React.createElement(EyeOff, { className: "w-5 h-5" }) : React.createElement(Eye, { className: "w-5 h-5" }))),
                                React.createElement("p", { className: "mt-2 text-xs text-muted-foreground" }, "Must be at least 8 characters with letters and numbers")),
                            React.createElement("button", { type: "submit", className: "w-full btn-primary text-lg py-4" }, "Create Account")))))),
        React.createElement(Footer, null)));
};
export default SignUp;
