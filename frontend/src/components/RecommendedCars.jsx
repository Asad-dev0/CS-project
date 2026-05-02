import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import axios from "axios";
import { homeCarsStyles as styles } from "../assets/dummyStyles";

const RecommendedCars = () => {
  const navigate = useNavigate();

  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasHistory, setHasHistory] = useState(null);

  const abortRef = useRef(null);

  const base = "http://localhost:5000";
  const limit = 6;
  const fallbackImage = `${base}/uploads/default-car.png`;

  const token = localStorage.getItem("token");
  const isLoggedIn = !!token;

  const api = axios.create({
    baseURL: base,
    headers: { Accept: "application/json" },
  });

  useEffect(() => {
    if (!isLoggedIn) return;

    fetchRecommendations();

    return () => {
      abortRef.current?.abort();
    };
  }, [isLoggedIn]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError("");

    try {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const res = await api.get("/api/cars/recommendations", {
        params: { limit },
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setHasHistory(res.data?.hasHistory);
      setCars(res.data?.data || []);
    } catch (err) {
      if (err.name !== "CanceledError") {
        setError(
          err?.response?.data?.message || "Failed to load recommendations"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const buildImageSrc = (image) => {
    if (!image) return "";
    if (Array.isArray(image)) image = image[0];
    if (typeof image !== "string") return "";

    const t = image.trim();

    if (t.startsWith("http")) return t;
    if (t.startsWith("/")) return `${base}${t}`;

    return `${base}/uploads/${t}`;
  };

  const handleImageError = (e) => {
    e.target.src = fallbackImage;
  };

  const handleBook = (car) => {
    navigate(`/cars/${car._id || car.id}`, { state: { car } });
  };

  // ❌ NOT LOGGED IN
  if (!isLoggedIn) return null;

  // ❌ NO BOOKING HISTORY
  if (!loading && hasHistory === false) {
    return (
      <div className="text-center py-10 text-gray-500">
        Book at least one car to get personalized recommendations 🚗
      </div>
    );
  }

  return (
    <div className={styles.container}>

      {/* HEADER */}
      <div className={styles.headerContainer}>
        <div className={styles.premiumBadge}>
          <Sparkles className="w-4 h-4 text-amber-400 mr-2" />
          <span className={styles.premiumText}>Personalized For You</span>
        </div>

        <div className="w-full text-center">
          <h1 className={styles.title}>Recommended Cars</h1>
          <p className={styles.subtitle}>
            Based on your booking history, we think you'll love these vehicles
          </p>
        </div>
      </div>

      {/* GRID */}
      <div className={styles.grid}>

        {/* LOADING */}
        {loading &&
          Array.from({ length: limit }).map((_, idx) => (
            <div key={idx} className={`${styles.card} animate-pulse`}>
              <div className={styles.imageContainer} />
              <div className={styles.content}>
                <div className="h-4 bg-gray-300 mb-2" />
                <div className="h-4 bg-gray-300 w-1/2" />
              </div>
            </div>
          ))}

        {/* ERROR */}
        {error && (
          <div className="col-span-full text-center text-red-500">
            {error}
          </div>
        )}

        {/* EMPTY */}
        {!loading && hasHistory && cars.length === 0 && !error && (
          <div className="col-span-full text-center">
            No recommendations found.
          </div>
        )}

        {/* CARDS */}
        {!loading &&
          !error &&
          cars.map((car, idx) => {
            const carName =
              `${car.make || ""} ${car.model || ""}`.trim() ||
              car.name ||
              "Unnamed";

            const imageSrc = buildImageSrc(car.image) || fallbackImage;

            return (
              <div key={car._id || idx} className={styles.card}>

                {/* IMAGE */}
                <div className={styles.imageContainer}>
                  <img
                    src={imageSrc}
                    alt={carName}
                    onError={handleImageError}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* CONTENT */}
                <div className={styles.content}>
                  <h3>{carName}</h3>
                  <p>{car.category || "Sedan"}</p>

                  <div className="flex gap-2 text-sm mt-2">
                    <span>{car.seats || 4} Seats</span>
                    <span>{car.fuelType || "Petrol"}</span>
                    <span>{car.transmission || "Auto"}</span>
                  </div>

                  <button
                    onClick={() => handleBook(car)}
                    className="mt-3 px-4 py-2 bg-black text-white rounded flex items-center gap-2"
                  >
                    Book Now <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default RecommendedCars;