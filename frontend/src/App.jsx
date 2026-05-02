import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import ContactPage from "./pages/ContactPage";
import CarPage from "./pages/CarPage";
import CarDetailPage from "./pages/CarDetailPage";
import { FaArrowUp } from "react-icons/fa";
import VerifyPaymentPage from "./pages/VerifyPaymentPage";
import MyBooking from "./pages/MyBooking";
// PROTECTED ROUTE
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const authToken = localStorage.getItem("token");

  if (!authToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
};
const RedirectIfAuthenticated = ({ children }) => {
  const authToken = localStorage.getItem("token");
  if (authToken) {
    return <Navigate to="/" replace />;
  }
  return children;
};
const App = () => {
  const [showButton, setShowButton] = useState(false);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [location.pathname]);

  // SHOW HIDE BTN ON SCROLL
  useEffect(() => {
    const handleScroll = () => setShowButton(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const scrollUp = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/contact" element={<ContactPage />} />
        <Route path="/cars" element={<CarPage />} />
        <Route
          path="/cars/:id"
          element={
            <ProtectedRoute>
              <CarDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <MyBooking/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={
            <RedirectIfAuthenticated>
              <Login />
            </RedirectIfAuthenticated>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfAuthenticated>
              <SignUp />
            </RedirectIfAuthenticated>
          }
        />
        <Route path="/success" element={<VerifyPaymentPage />} />
        <Route path="/cancel" element={<VerifyPaymentPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showButton && (
        <button
          onClick={scrollUp}
          className=" fixed cursor-pointer bottom-8 right-8 p-3 rounded-full bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg transition-colors focus:outline-none"
          aria-label="Scroll to top"
        >
          <FaArrowUp size={20} />
        </button>
      )}
    </>
  );
};

export default App;
