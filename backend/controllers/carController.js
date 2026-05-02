import fs from "fs";
import path from "path";
import Car from "../models/carModel.js";
import Booking from "../models/bookingModel.js";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

const deleteLocalFileIfPresent = (filePath) => {
  if (!filePath) return;
  const filename = filePath.replace(/^\/uploads\//, "");
  const fullPath = path.join(UPLOADS_DIR, filename);
  fs.unlink(fullPath, (err) => {
    if (err) console.warn("Failed to delete file:", fullPath, err);
  });
};

const normalizeCarPayload = (payload) => {
  const result = {
    make: payload.make?.trim() || "",
    model: payload.model?.trim() || "",
    year: payload.year ? Number(payload.year) : null,
    color: payload.color?.trim() || "",
    category: payload.category?.trim() || "",
    seats: payload.seats ? Number(payload.seats) : undefined,
    transmission: payload.transmission?.trim() || "",
    fuelType: payload.fuelType?.trim() || "",
    mileage: payload.mileage ? Number(payload.mileage) : undefined,
    dailyRate: payload.dailyRate ? Number(payload.dailyRate) : null,
    status: payload.status?.trim() || "available",
  };
  Object.keys(result).forEach((key) => {
    if (result[key] === undefined || result[key] === null || result[key] === "") {
      delete result[key];
    }
  });
  return result;
};

export const createCar = async (req, res, next) => {
  try {
    const carData = normalizeCarPayload(req.body);
    if (!carData.make || !carData.model || !carData.year || !carData.dailyRate) {
      return res.status(400).json({ success: false, message: "Missing required car fields" });
    }

    if (req.file) {
      carData.image = `/uploads/${req.file.filename}`;
    }

    const createdCar = await Car.create(carData);
    return res.status(201).json({ success: true, car: createdCar });
  } catch (err) {
    next(err);
  }
};

export const getCars = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const search = req.query.search?.trim() || "";
    const category = req.query.category?.trim();
    const status = req.query.status?.trim();

    const query = {};
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { make: regex },
        { model: regex },
        { category: regex },
      ];
    }
    if (category) query.category = category;
    if (status) query.status = status;

    const cars = await Car.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Car.countDocuments(query);
    const carsWithAvailability = Car.computeAvailabilityForCars(cars);

    return res.json({
      success: true,
      page,
      limit,
      total,
      data: carsWithAvailability,
    });
  } catch (err) {
    next(err);
  }
};

export const getCarById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Car id is required" });
    }

    const car = await Car.findById(id).lean();
    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    const [carWithAvailability] = Car.computeAvailabilityForCars([car]);
    return res.json({ success: true, car: carWithAvailability });
  } catch (err) {
    next(err);
  }
};

export const updateCar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existingCar = await Car.findById(id);
    if (!existingCar) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    const updateData = normalizeCarPayload(req.body);
    if (req.file) {
      if (existingCar.image) deleteLocalFileIfPresent(existingCar.image);
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updatedCar = await Car.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    return res.json({ success: true, car: updatedCar });
  } catch (err) {
    next(err);
  }
};

export const deleteCar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const car = await Car.findById(id);
    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    if (car.image) deleteLocalFileIfPresent(car.image);
    await Car.findByIdAndDelete(id);

    return res.json({ success: true, message: "Car deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 20);
    const bookings = await Booking.find({ userId })
      .populate("car")
      .lean();

    const hasHistory = bookings.length > 0;
    if (!hasHistory) {
      return res.json({
        success: true,
        hasHistory: false,
        bookingCount: 0,
        data: [],
      });
    }

    const bookedCarIds = new Set(
      bookings.map((b) => b.car?._id?.toString()).filter(Boolean),
    );

    const freq = (arr, keyFn) => {
      const map = {};
      arr.forEach((item) => {
        const key = keyFn(item);
        if (key) map[key] = (map[key] || 0) + 1;
      });
      return Object.entries(map).sort((a, b) => b[1] - a[1]);
    };

    const carData = bookings.map((b) => b.car).filter(Boolean);
    const topCategory = freq(carData, (c) => c.category)[0]?.[0];
    const topMake = freq(carData, (c) => c.make)[0]?.[0];
    const topTransmission = freq(carData, (c) => c.transmission)[0]?.[0];
    const topFuelType = freq(carData, (c) => c.fuelType)[0]?.[0];
    const topSeats = freq(carData, (c) => c.seats)[0]?.[0];

    const total = carData.reduce((sum, c) => sum + (c.dailyRate || 0), 0);
    const avg = total / carData.length;

    const cars = await Car.find({ status: "available" }).lean();
    const scored = cars
      .filter((car) => !bookedCarIds.has(car._id.toString()))
      .map((car) => {
        let score = 0;
        if (topCategory && car.category === topCategory) score += 4;
        if (topMake && car.make === topMake) score += 3;
        if (topTransmission && car.transmission === topTransmission) score += 2;
        if (topFuelType && car.fuelType === topFuelType) score += 2;
        if (topSeats && car.seats === Number(topSeats)) score += 1;
        if (avg && car.dailyRate) {
          const diff = Math.abs(car.dailyRate - avg) / avg;
          if (diff <= 0.2) score += 2;
        }

        const carObj = new Car(car);
        return {
          ...car,
          availability: carObj.getAvailabilitySummary(),
          score,
        };
      });

    scored.sort((a, b) => b.score - a.score);
    return res.json({
      success: true,
      hasHistory: true,
      bookingCount: bookings.length,
      data: scored.slice(0, limit),
    });
  } catch (err) {
    next(err);
  }
};