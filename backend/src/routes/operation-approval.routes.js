import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  decideOperationApproval,
  listOperationApprovals,
  OperationApprovalError,
  submitOperationProposal,
} from "../services/operation-approval.service.js";

export const operationApprovalRouter = Router();

operationApprovalRouter.get("/", requireAuth, requireRole("STAFF", "ADMIN"), async (request, response, next) => {
  try {
    const approvals = await listOperationApprovals(request.session.user);
    return response.json({ approvals });
  } catch (error) {
    return next(error);
  }
});

operationApprovalRouter.post("/", requireAuth, requireRole("STAFF"), async (request, response, next) => {
  try {
    const approval = await submitOperationProposal(
      request.session.user.id,
      request.body?.action,
      request.body?.payload,
    );
    return response.status(202).json({
      message: "Change proposal sent to an administrator for approval.",
      approval,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return response.status(400).json({
        message: "Please correct the highlighted fields.",
        errors: error.issues.map(({ path, message }) => ({ field: path[0], message })),
      });
    }
    if (error instanceof OperationApprovalError || error.status) {
      return response.status(error.status || 400).json({ message: error.message });
    }
    return next(error);
  }
});

operationApprovalRouter.post("/:id/review", requireAuth, requireRole("ADMIN"), async (request, response, next) => {
  try {
    const approval = await decideOperationApproval(
      request.params.id,
      request.session.user.id,
      request.body?.decision,
      typeof request.body?.decisionNote === "string" ? request.body.decisionNote.trim().slice(0, 200) : "",
    );
    return response.json({
      message: approval.status === "APPROVED" ? "Proposal approved and applied." : "Proposal rejected.",
      approval,
    });
  } catch (error) {
    if (error instanceof OperationApprovalError || error.status) {
      return response.status(error.status || 400).json({ message: error.message });
    }
    if (error.name === "InventoryError") {
      return response.status(error.status).json({ message: error.message });
    }
    if (error.name === "ZodError") {
      return response.status(400).json({ message: error.issues.map((issue) => issue.message).join(" ") });
    }
    if (error.status === 404 || error.status === 409) {
      return response.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
});
