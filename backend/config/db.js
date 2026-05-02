import mongoose from "mongoose";
export const connectDB = async () => {
  await mongoose
    .connect(
      "mongodb+srv://asadtech:testing123@cluster0.5fzelho.mongodb.net/testing",
    )
    .then(() => console.log("Connected to MongoDB"));
};
