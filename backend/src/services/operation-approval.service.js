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
    const pendingProposals = await prisma.operationApproval.findMany({
      where: { status: "PENDING" },
      include: { requester: { select: { id: true, fullName: true, role: true } } },
    });
    const existingPending = pendingProposals.find(
      (p) =>
        p.action === "DELETE_SLOT" &&
        p.payload &&
        (p.payload.slotId === values.slotId || p.payload.id === values.slotId)
    );
    if (existingPending) {
      return existingPending;
    }

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

  if (action === "CREATE_SLOT") {
    // Check if an appointment slot already exists or overlaps on the selected date
    const existingSlots = await prisma.appointmentSlot.findMany({
      where: { date: values.date },
    });
    const hasExistingOverlap = existingSlots.some((slot) => {
      return values.startTime < slot.endTime && values.endTime > slot.startTime;
    });
    if (hasExistingOverlap) {
      throw new OperationApprovalError(
        409,
        "An appointment slot already exists or overlaps with this time window on the selected date."
      );
    }

    // Check if a pending creation proposal already exists or overlaps on the selected date
    const pendingProposals = await prisma.operationApproval.findMany({
      where: { status: "PENDING" },
      include: { requester: { select: { id: true, fullName: true, role: true } } },
    });
    const hasPendingOverlap = pendingProposals.some((p) => {
      if (p.action !== "CREATE_SLOT" || !p.payload || p.payload.date !== values.date) return false;
      return values.startTime < p.payload.endTime && values.endTime > p.payload.startTime;
    });
    if (hasPendingOverlap) {
      throw new OperationApprovalError(
        409,
        "An appointment slot proposal already exists or overlaps with this time window on the selected date."
      );
    }
  }

  return prisma.operationApproval.create({
    data: { action, payload: values, requesterId },
    include: { requester: { select: { id: true, fullName: true, role: true } } },
  });
}

export async function listOperationApprovals(user) {
  const where = user.role === "ADMIN" ? { status: "PENDING" } : { requesterId: user.id };
  const approvals = await prisma.operationApproval.findMany({
    where,
    include: {
      requester: { select: { id: true, fullName: true, role: true } },
      reviewer: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (user.role === "ADMIN") {
    const seenDeleteSlots = new Set();
    const seenCreateSlots = [];
    return approvals.filter((approval) => {
      if (approval.action === "DELETE_SLOT") {
        const slotId = approval.payload?.slotId || approval.payload?.id;
        if (slotId) {
          if (seenDeleteSlots.has(slotId)) return false;
          seenDeleteSlots.add(slotId);
        }
      }
      if (approval.action === "CREATE_SLOT" && approval.payload?.date) {
        const { date, startTime, endTime } = approval.payload;
        const overlaps = seenCreateSlots.some(
          (s) => s.date === date && startTime < s.endTime && endTime > s.startTime
        );
        if (overlaps) return false;
        seenCreateSlots.push({ date, startTime, endTime });
      }
      return true;
    });
  }

  return approvals;
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
          try {
            await deleteAppointmentSlot(payload.slotId, tx);
          } catch (err) {
            if (err.status !== 404) throw err;
          }
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

    if (proposal.action === "CREATE_SLOT" && decision === "APPROVE") {
      const payload = proposal.payload;
      if (payload?.date) {
        const otherPending = await tx.operationApproval.findMany({
          where: { status: "PENDING" },
        });
        const conflicting = otherPending.filter(
          (p) =>
            p.id !== approvalId &&
            p.action === "CREATE_SLOT" &&
            p.payload &&
            p.payload.date === payload.date &&
            payload.startTime < p.payload.endTime &&
            payload.endTime > p.payload.startTime
        );
        for (const item of conflicting) {
          await tx.operationApproval.updateMany({
            where: { id: item.id, status: "PENDING" },
            data: {
              status: "REJECTED",
              reviewerId,
              decisionNote: "Coincides with already approved appointment slot",
              reviewedAt: new Date(),
            },
          });
        }
      }
    }

    if (proposal.action === "DELETE_SLOT") {
      const slotId = proposal.payload?.slotId || proposal.payload?.id;
      if (slotId) {
        const otherPending = await tx.operationApproval.findMany({
          where: { status: "PENDING" },
        });
        const matching = otherPending.filter(
          (p) =>
            p.id !== approvalId &&
            p.action === "DELETE_SLOT" &&
            p.payload &&
            (p.payload.slotId === slotId || p.payload.id === slotId)
        );
        for (const item of matching) {
          await tx.operationApproval.updateMany({
            where: { id: item.id, status: "PENDING" },
            data: {
              status,
              reviewerId,
              decisionNote: decisionNote || "Auto-resolved with primary proposal",
              reviewedAt: new Date(),
            },
          });
        }
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
