import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import Payment from "./models/paymentModel.js";
import Bill from "./models/Bill.js";
import Medicine from "./models/Medicine.js";

export const processPayment = async ({ billId, patientId, amount, paymentMethod, cardDetails, medicinesUsed }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Validate Bill
    const bill = await Bill.findOne({ billId }).session(session);
    if (!bill) {
      throw new Error(`Bill with ID ${billId} not found`);
    }
    if (bill.status === "Paid") {
      throw new Error("Bill is already paid");
    }

    // 2. Validate Medicines & Calculate Total (Optimization: Fetch all at once)
    if (medicinesUsed && medicinesUsed.length > 0) {
      const medIds = medicinesUsed.map(m => m.medId);
      // Fetch all medicines in one query (Match 'medicineId' from schema)
      const medicines = await Medicine.find({ medicineId: { $in: medIds } }).session(session);
      
      // Create a map for O(1) lookup
      const medicineMap = new Map(medicines.map(m => [m.medicineId, m]));

      for (const item of medicinesUsed) {
        const med = medicineMap.get(item.medId);
        if (!med) {
          throw new Error(`Medicine with ID ${item.medId} not found`);
        }
        // Check 'stock' (from schema) not 'quantity'
        if (med.stock < item.quantity) {
          throw new Error(`Insufficient stock for medicine ${med.name} (ID: ${item.medId})`);
        }
      }
    }

    // 3. Create Payment Record
    const paymentId = uuidv4();
    await Payment.create([{
      paymentId,
      billId,
      patientId,
      amount,
      paymentMethod,
      cardDetails,
      medicinesUsed,
      status: "Completed",
      references: { bill: { billId } }
    }], { session });

    // 4. Update Bill Status
    await Bill.updateOne(
      { billId },
      { $set: { status: "Paid", paidAt: new Date() } },
      { session }
    );

    // 5. Update Medicine Stock
    if (medicinesUsed && medicinesUsed.length > 0) {
      for (const med of medicinesUsed) {
        await Medicine.updateOne(
          { medicineId: med.medId }, // Match 'medicineId'
          { $inc: { stock: -med.quantity } }, // Update 'stock'
          { session }
        );
      }
    }

    // Commit Transaction
    await session.commitTransaction();
    console.log("Transaction Successful! Payment ID:", paymentId);
    
    return {
      success: true,
      message: "Payment processed successfully!",
      paymentId,
      billId
    };

  } catch (error) {
    await session.abortTransaction();
    console.error("Transaction Failed:", error);
    return { success: false, message: error.message };
  } finally {
    session.endSession();
  }
};