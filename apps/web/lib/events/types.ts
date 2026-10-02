/**
 * Domain events.
 *
 * Services emit these; notification channels subscribe. Lead code never
 * calls the email or WhatsApp layer directly, which is what stops a provider
 * outage from failing a customer's submission.
 */

export type DomainEventType =
  | 'LEAD_CREATED'
  | 'LEAD_STATUS_CHANGED'
  | 'LEAD_ASSIGNED'
  | 'FOLLOWUP_SCHEDULED'
  | 'FOLLOWUP_DUE'
  | 'PROJECT_CREATED'

export type LeadCreatedPayload = {
  leadId: string
  leadNumber: string
  customerId: string
  customerName: string
  assignedToId: string | null
  temperature: 'HOT' | 'WARM' | 'COLD'
  score: number
  isRepeatEnquiry: boolean
}

export type LeadStatusChangedPayload = {
  leadId: string
  leadNumber: string
  fromStatus: string
  toStatus: string
  changedById: string
  assignedToId: string | null
}

export type LeadAssignedPayload = {
  leadId: string
  leadNumber: string
  assignedToId: string
  assignedById: string | null
}

export type DomainEventPayloadMap = {
  LEAD_CREATED: LeadCreatedPayload
  LEAD_STATUS_CHANGED: LeadStatusChangedPayload
  LEAD_ASSIGNED: LeadAssignedPayload
  FOLLOWUP_SCHEDULED: { followUpId: string; leadId: string; assignedToId: string; scheduledAt: string }
  FOLLOWUP_DUE: { followUpId: string; leadId: string; assignedToId: string }
  PROJECT_CREATED: { projectId: string; projectNumber: string; customerId: string; leadId: string }
}

export type DomainEvent<T extends DomainEventType = DomainEventType> = {
  type: T
  payload: DomainEventPayloadMap[T]
}
