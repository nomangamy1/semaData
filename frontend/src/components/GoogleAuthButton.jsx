import React from "react";
import { GoogleLogin } from "@react-oauth/google";

const GoogleAuthButton = ({ mode, role, onSuccess, onError }) => {
  const handleSuccess = async (credentialResponse) => {
    try {
      // credentialResponse.credential IS the ID Token (JWT)
      const endpoint = mode === "signup"
        ? "/api/Auth/google_sign_up"
        : "/api/Auth/google_login";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: credentialResponse.credential, // Send the ID Token
          role,
        })
      });

      const responseBody = await res.text();
      let data;
      try {
        data = responseBody ? JSON.parse(responseBody) : {};
      } catch {
        onError?.(`Google authentication returned an invalid response (HTTP ${res.status}).`);
        return;
      }

      if (!res.ok) {
        onError?.(data.error || `Google authentication failed (HTTP ${res.status}).`);
        return;
      }

      // Store auth state (keep your existing logic here)
      localStorage.clear();
      if (data.token) localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", data.role || role);
      
      onSuccess?.(data);
    } catch {
      onError?.("Could not reach the signup service. Check your connection and try again.");
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => onError?.("Google sign-in failed")}
      useOneTap={false}
      type="standard"
      theme="outline"
      size="large"
      text={mode === "signup" ? "signup_with" : "signin_with"}
      width="320"
    />
  );
};

export default GoogleAuthButton;
