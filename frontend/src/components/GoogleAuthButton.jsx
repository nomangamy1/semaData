import React from "react";
import { GoogleLogin } from "@react-oauth/google";

const GoogleAuthButton = ({ mode, role, onSuccess, onError }) => {
  const handleSuccess = async (credentialResponse) => {
    try {
      // credentialResponse.credential IS the ID Token (JWT)
      const endpoint = mode === "signup"
        ? "http://localhost:8000/api/Auth/google_sign_up"
        : "http://localhost:8000/api/Auth/google_login";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: credentialResponse.credential, // Send the ID Token
          role,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        onError?.(data.error || "Google authentication failed");
        return;
      }

      // Store auth state (keep your existing logic here)
      localStorage.clear();
      if (data.token) localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", data.role || role);
      
      onSuccess?.(data);
    } catch (err) {
      onError?.("Network error during Google authentication");
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
      width="100%"
    />
  );
};

export default GoogleAuthButton;
