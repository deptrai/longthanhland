// Epic 3: Customer & Deal Management Types

export type DealStage =
  | 'NEW'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  budget: {
    min: number;
    max: number;
  };
  locations: string[];
  propertyTypes: string[];
  leadSource: string;
  assignedTo: string;
  assignedToName?: string;
  createdAt: string;
  notes?: string;
}

export interface Deal {
  id: string;
  customerId: string;
  customerName?: string;
  propertyId: string;
  propertyName?: string;
  stage: DealStage;
  dealValue: number;
  commission: number;
  commissionRate: number;
  assignedAgent: string;
  assignedAgentName?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealActivity {
  id: string;
  dealId: string;
  type: 'STATUS_CHANGE' | 'NOTE' | 'EMAIL' | 'CALL' | 'MEETING';
  description: string;
  timestamp: string;
  userId: string;
  userName?: string;
}
