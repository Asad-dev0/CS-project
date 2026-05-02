import mongoose from "mongoose";
import Booking from "../models/bookingModel.js";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const CLIENT_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const STRIPE_API_VERSION = "2022-11-15";

const isValidObjectId = (value) =>
  Boolean(value) && mongoose.Types.ObjectId.isValid(String(value));

// GET STRIPE FROM .ENV
const getStripe = () => {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) throw new Error("Missing Stripe key");
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
};

// CREATE A BOOKING BY PAYMENT DONE
export const createCheckoutSession = async (req, res) => {
  try {
    if (!req.body)
      return res.status(400).json({
        success: false,
        message: "Missing Request Key",
      });
    const {
      userId,
      customer,
      email,
      phone,
      car,
      pickupDate,
      returnDate,
      amount,
      details,
      address,
      carImage,
    } = req.body;

    console.error("CreateCheckoutSession request body:", {
      userId,
      car,
      pickupDate,
      returnDate,
      amount,
      email,
      customer,
    });

    if (!userId || !isValidObjectId(userId))
      return res.status(400).json({
        success: false,
        message: "Valid userId is required",
      });

    // MIMIMUM VALIDATION
    const total = Number(amount);
    if (!total || Number.isNaN(total) || total <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email required" });
    if (!pickupDate || !returnDate)
      return res.status(400).json({
        success: false,
        message: "pickupDate and returnDate required",
      });

    const pd = new Date(pickupDate);
    const rd = new Date(returnDate);
    if (Number.isNaN(pd.getTime()) || Number.isNaN(rd.getTime()))
      return res.status(400).json({ success: false, message: "Invalid dates" });
    if (rd < pd)
      return res.status(400).json({
        success: false,
        message: "returnDate must be same or after pickupDate",
      });
    let carField = car;
    if (typeof car === "string") {
      try {
        carField = JSON.parse(car);
      } catch {
        carField = { name: car };
      }
    }

    if (!carField || !carField.id || !isValidObjectId(carField.id))
      return res.status(400).json({
        success: false,
        message: "Valid car id is required",
      });

    // create booking (pending)
    const parseJsonSafe = (value) => {
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      }
      return value || {};
    };

    let booking;
    try {
      booking = await Booking.create({
        userId: userId,
        customer: String(customer ?? ""),
        email: String(email ?? ""),
        phone: String(phone ?? ""),
        car: carField ?? {},
        carImage: String(carImage ?? ""),
        pickupDate: pd,
        returnDate: rd,
        amount: total,
        paymentStatus: "pending",
        details: parseJsonSafe(details),
        address: parseJsonSafe(address),
        status: "pending",
        currency: "INR",
      });
    } catch (createErr) {
      console.error("Booking create failed:", createErr);
      return res.status(500).json({
        success: false,
        message: "Failed to create booking",
        error: createErr.message || String(createErr),
      });
    }
    let stripe;
    try {
      stripe = getStripe();
    } catch (err) {
      await Booking.findByIdAndDelete(booking._id).catch(() => {});
      return res.status(500).json({
        success: false,
        message: "Payment not configure",
        error: err.message,
      });
    }
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: email || undefined,
        line_items: [
          {
            price_data: {
              currency: "INR",
              product_data: {
                name:
                  (carField && (carField.name || carField.title)) ||
                  "Car Rental",
                description: `Rental ${pickupDate} -> ${returnDate}`,
                // images: [safeImage].filter(Boolean),
              },
              unit_amount: Math.round(total * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}&payment_status=success`,
        cancel_url: `${CLIENT_URL}/cancel?payment_status=cancel`,
        metadata: {
          bookingId: booking._id.toString(),
          userId: String(userId ?? ""),
          carId: String((carField && (carField.id || carField._id)) || ""),
          pickupDate: String(pickupDate || ""),
          returnDate: String(returnDate || ""),
        },
      });
    } catch (stripeErr) {
      await Booking.findByIdAndDelete(booking._id).catch(() => {});
      return res.status(500).json({
        success: false,
        message: "Failed to create Stripe Checkout Session",
        error: stripeErr.message || String(stripeErr),
      });
    }
    booking.sessionId = session.id;
    booking.stripeSession = {
      id: session.id,
      url: session.url || null,
    };
    
    let savedBooking;
    try {
      savedBooking = await booking.save();
    } catch (saveErr) {
      console.error("Booking save error:", saveErr);
      throw saveErr;
    }
    
    return res.json({
      success: true,
      id: session.id,
      url: session.url,
      bookingId: savedBooking._id,
    });
  } catch (err) {
    console.error("CheckoutSession Error:", err.message);
    console.error("Error stack:", err.stack);
    if (err.errors) {
      console.error("Validation errors:", err.errors);
    }
    const status =
      err?.name === "ValidationError" || err?.name === "CastError"
        ? 400
        : 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Server Error",
      error: err.errors ? Object.keys(err.errors).reduce((acc, k) => {
        acc[k] = err.errors[k].message;
        return acc;
      }, {}) : undefined,
    });
  }
};

// SUCCESSFULL PAYMENT VERIFICATION
export const confirmPayment = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id)
      return res
        .status(400)
        .json({ success: false, message: "Session_id required" });

    let stripe;
    try {
      stripe = getStripe();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Payment not configure",
        error: err.message,
      });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session)
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });

    if (session.payment_status !== "paid")
      return res.status(400).json({
        success: false,
        message: `Payment not completed. status=${session.payment_status}`,
        session,
      });
    const bookingId = session.metadata?.bookingId;

    let order = null;
    if (bookingId) {
      order = await Booking.findByIdAndUpdate(
        bookingId,
        {
          paymentStatus: "paid",
          status: "active",
          paymentIntentId: session.payment_intent || "",
          paymentDetails: {
            amount_total: session.amount_total || null,
            currency: session.currency || null,
          },
        },
        { returnDocument: "after" },
      );
    }
    if (!order) {
      order = await Booking.findOneAndUpdate(
        { sessionId: session_id },
        {
          paymentStatus: "paid",
          status: "active",
          paymentIntentId: session.payment_intent || "",
          paymentDetails: {
            amount_total: session.amount_total || null,
            currency: session.currency || null,
          },
        },
        { returnDocument: "after" },
      );
    }
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found for this session',
      });
    }
    return res.json({ success: true, order });
  } catch (err) {
    console.error("Confirm Payment Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server Error",
    });
  }
};
