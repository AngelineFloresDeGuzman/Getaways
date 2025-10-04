import React from "react";

var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
export function Toaster() {
    const { toasts } = useToast();
    return (React.createElement(ToastProvider, null,
        toasts.map(function (_a) {
            var { id, title, description, action } = _a, props = __rest(_a, ["id", "title", "description", "action"]);
            return (React.createElement(Toast, Object.assign({ key: id }, props),
                React.createElement("div", { className: "grid gap-1" },
                    title && React.createElement(ToastTitle, null, title),
                    description && React.createElement(ToastDescription, null, description)),
                action,
                React.createElement(ToastClose, null)));
        }),
        React.createElement(ToastViewport, null)));
}
