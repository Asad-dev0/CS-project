import React, { useEffect, useState } from "react";
import { loginStyles, loginStyles as styles } from "../assets/dummyStyles";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEye, FaEyeSlash, FaLock, FaUser } from "react-icons/fa";
import logo from "../assets/carlogo.svg";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [credentials, setCredentails] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setIsActive(true);
  }, []);
  const handleChange = (e) => {
    setCredentails((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // console.log("Login details", credentials);
      // localStorage.setItem("authToken", "your-authentication-token-here");
      const base = "http://localhost:5000";
      const url = `${base}/api/auth/login`;
      const res = await axios.post(url, credentials, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.status >= 200 && res.status < 300) {
        const { token, user, message } = res.data || {};

        if (token) localStorage.setItem("token", token);
        if (user) localStorage.setItem("user", JSON.stringify(user));
        toast.success(message || "Login Successful! Welcome back", {
          position: "top-right",
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "colored",
          onClose: () => {
            const redirectPath = "/";
            navigate(redirectPath, { replace: true });
          },
          autoClose: 1000,
        });
      } else {
        toast.error("Unexpected response from server", {
          theme: "colored",
        });
      }
    } catch (err) {
      console.error("Login error (frontend):", err);
      if (err.response) {
        const serverMessage =
          err.response.data?.message ||
          err.response.data?.error ||
          `Server error: ${err.response.status}`;
        toast.error(serverMessage, { theme: "colored" });
      } else if (err.request) {
        toast.error("No response from server — is backend running?", {
          theme: "colored",
        });
      } else {
        toast.error(err.message || "Login failed", { theme: "colored" });
      }
    } finally {
      setLoading(false);
    }
  };

  // Password Toggle Logic
  const togglePasswordVisibilty = () => setShowPassword((prev) => !prev);
  return (
    <div className={loginStyles.pageContainer}>
      {/* ANIMATED BACKGROUND */}
      <div className={styles.animatedBackground.base}>
        <div
          className={`${styles.animatedBackground.orb1} ${isActive ? "translate-x-20 translate-y-10" : ""}`}
        />
        <div
          className={`${styles.animatedBackground.orb2} ${isActive ? "-translate-x-20 -translate-y-10" : ""}`}
        />
        <div
          className={`${styles.animatedBackground.orb3} ${isActive ? "-translate-x-10 translate-y-20" : ""}`}
        />
      </div>

      {/* BACK BUTTON */}
      <a href="/" className={styles.backButton}>
        <FaArrowLeft className="text-sm sm:text-base" />
        <span className="font-medium text-xs sm:text-sm">Back to Home</span>
      </a>

      {/* LOGIN CARD */}
      <div
        className={`${styles.loginCard.container} ${isActive ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}
      >
        <div className={styles.loginCard.card}>
          <div className={styles.loginCard.decor1} />
          <div className={styles.loginCard.decor2} />

          {/* LOGIN CARD HEADER */}
          <div className={styles.loginCard.headerContainer}>
            <div className={styles.loginCard.logoContainer}>
              <div className={styles.loginCard.logoText}>
                <img
                  src={logo}
                  alt="logo"
                  className="h-[1em] w-auto block"
                  style={{ display: "block", objectFit: "contain" }}
                />
                <span className="font-bold tracking-wider">GCB CAR</span>
              </div>
            </div>
            <h1 className={styles.loginCard.title}>PremiumDrive</h1>
            <p className={styles.loginCard.subtitle}>
              LUXURY MOBILITY EXPERIENCE
            </p>
          </div>
          {/* FORM */}
          <form onSubmit={handleSubmit} className={styles.form.container}>
            <div className={styles.form.inputContainer}>
              <div className={styles.form.inputWrapper}>
                <div className={styles.form.inputIcon}>
                  <FaUser />
                </div>
                <input
                  type="email"
                  name="email"
                  value={credentials.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className={styles.form.input}
                />
              </div>
            </div>
            <div className={styles.form.inputContainer}>
              <div className={styles.form.inputWrapper}>
                <div className={styles.form.inputIcon}>
                  <FaLock />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className={styles.form.input}
                />
                {/* Password Toggle UI */}
                <div
                  onClick={togglePasswordVisibilty}
                  className={styles.form.passwordToggle}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>
            </div>
            <button type="submit" disabled={loading} className={styles.form.submitButton}>
              <span className={styles.form.buttonText}>{loading ? "Logging in..." : "Login"}</span>
              <div className={styles.form.buttonHover} />
            </button>
          </form>
          <div className={styles.signupSection}>
            <p className={styles.signupText}>Don't have an account?</p>
            <a href="/signup" className={styles.signupButton}>
              CREATE ACCOUNT
            </a>
          </div>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        toastStyle={{
          backgroundColor: "#fb923c",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(249, 115, 22, 0.25)",
        }}
      />
    </div>
  );
};

export default Login;
