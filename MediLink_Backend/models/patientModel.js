import mongoose from "mongoose";

// Emergency Contact Schema
const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  relationship: { type: String, required: true, trim: true },
  phoneNo: { type: String, required: true, trim: true, index: true } // index for faster lookup
}, { _id: false });

// Patient Schema
const patientSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true, index: true }, // Changed to String
  name: { type: String, required: true, trim: true }, // Added name to match frontend
  firstName: { type: String, trim: true }, // Made optional
  lastName: { type: String, trim: true }, // Made optional
  age: { type: Number }, // Added age to match frontend
  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  phoneNo: { type: String, trim: true, index: true }, // Made optional
  contact: { type: String, trim: true }, // Added contact to match frontend
  address: { type: String, trim: true },
  bloodType: { 
    type: String, 
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], 
    index: true 
  },
  dateOfBirth: { type: Date }, // Made optional
  medicalHistory: { type: String }, // Added medicalHistory
  emergencyContact: emergencyContactSchema,
  dateRegistered: { type: Date, default: Date.now },
  status: { type: String, enum: ["Active", "Inactive", "Deceased"], default: "Active", index: true }
}, { timestamps: true });

// 🔹 Compound index example: bloodType + status
patientSchema.index({ bloodType: 1, status: 1 });

// 🔹 Text index for searching patients by name
patientSchema.index({ name: "text", firstName: "text", lastName: "text" });

// 👇 Use exact collection name 'patient' (not 'patients')
const Patient = mongoose.models.Patient || mongoose.model("Patient", patientSchema, "patient");

export default Patient;