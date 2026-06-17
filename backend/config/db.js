import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // If it fails, log and continue (so the server doesn't crash immediately, giving user time to edit .env)
    console.warn('Backend is running, but database operations will fail until MongoDB is connected.');
  }
};

export default connectDB;
