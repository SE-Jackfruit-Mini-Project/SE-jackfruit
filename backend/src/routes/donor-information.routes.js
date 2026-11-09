import { Router } from "express";
import { requireRole } from "../middleware/auth.middleware.js";
import {
  getDonorInformation,
  listDonors,
} from "../services/donor-information.service.js";

export const donorInformationRouter = Router();
donorInformationRouter.use(requireRole("STAFF", "ADMIN"));

donorInformationRouter.get("/", async (_request, response, next) => {
  try {
    return response.status(200).json({ donors: await listDonors() });
  } catch (error) {
    return next(error);
  }
});

donorInformationRouter.get("/:donorId", async (request, response, next) => {
  try {
    const donor = await getDonorInformation(request.params.donorId);
    if (!donor) {
      return response.status(404).json({ message: "Donor information was not found." });
    }
    return response.status(200).json({ donor });
  } catch (error) {
    return next(error);
  }
});
