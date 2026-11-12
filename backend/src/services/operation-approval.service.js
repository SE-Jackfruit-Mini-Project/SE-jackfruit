import { prisma } from "../utils/prisma.js";
import { createAppointmentSlot, deleteAppointmentSlot, validateAppointmentSlotInput } from "./appointment-slot.service.js";
import { addStock, adjustStock, validateStockAddition, validateStockAdjustment } from "./inventory.service.js";

const actions = new Set(["CREATE_SLOT", "DELETE_SLOT", "ADD_STOCK", "ADJUST_STOCK"]);

export class OperationApprovalError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "OperationApprovalError";
    this.status = status;
  }
}

function validateProposal(action, payload) {
  if (!actions.has(action)) throw new OperationApprovalError(400, "Unsupported operational change.");
  if (action === "CREATE_SLOT") return validateAppointmentSlotInput(payload);
  if (action === "ADD_STOCK") return validateStockAddition(payload);
  if (action === "ADJUST_STOCK") return validateStockAdjustment(payload);
  if (typeof payload?.slotId !== "string" || !payload.slotId.trim()) {
    throw new OperationApprovalError(400, "A slot must be selected.");
  }
  return { slotId: payload.slotId.trim() };
}

export async function submitOperationProposal(requesterId, action, payload) {
  const values = validateProposal(action, payload);
  if (action === "DELETE_SLOT") {
    const slot = await prisma.appointmentSlot.findUnique({
      where: { id: values.slotId },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        bookedCount: true,
        maxCapacity: true,
        _count: { select: { appointments: true } },
      },
    });
    if (!slot) throw new OperationApprovalError(404, "Appointment slot was not found.");
    if (slot._count.appointments > 0) {
      throw new OperationApprovalError(409, "This slot has appointment records and cannot be deleted.");
    }
    delete slot._count;
    Object.assign(values, slot);
  }
  return prisma.operationApproval.create({
    data: { action, payload: values, requesterId },
    include: { requester: { select: { id: true, fullName: true, role: true } } },
  });
}

export async function listOperationApprovals(user) {
  const where = user.role === "ADMIN" ? { status: "PENDING" } : { requesterId: user.id };
  return prisma.operationApproval.findMany({
    where,
    include: {
      requester: { select: { id: true, fullName: true, role: true } },
      reviewer: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function decideOperationApproval(approvalId, reviewerId, decision, decisionNote = "") {
  if (!["APPROVE", "REJECT"].includes(decision)) {
    throw new OperationApprovalError(400, "Choose approve or reject.");
  }
  return prisma.$transaction(async (tx) => {
    const proposal = await tx.operationApproval.findUnique({ where: { id: approvalId } });
    if (!proposal) throw new OperationApprovalError(404, "Approval request was not found.");
    const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    const claim = await tx.operationApproval.updateMany({
      where: { id: approvalId, status: "PENDING" },
      data: { status, reviewerId, decisionNote: decisionNote || null, reviewedAt: new Date() },
    });
    if (claim.count !== 1) throw new OperationApprovalError(409, "This request has already been reviewed.");

    if (decision === "APPROVE") {
      const payload = proposal.payload;
      switch (proposal.action) {
        case "CREATE_SLOT":
          await createAppointmentSlot(payload, tx);
          break;
        case "DELETE_SLOT":
          await deleteAppointmentSlot(payload.slotId, tx);
          break;
        case "ADD_STOCK":
          await addStock(reviewerId, payload, tx);
          break;
        case "ADJUST_STOCK":
          await adjustStock(reviewerId, payload, tx);
          break;
        default:
          throw new OperationApprovalError(400, "Unsupported operational change.");
      }
    }
    return tx.operationApproval.findUnique({
      where: { id: approvalId },
      include: {
        requester: { select: { id: true, fullName: true, role: true } },
        reviewer: { select: { id: true, fullName: true } },
      },
    });
  });
}
