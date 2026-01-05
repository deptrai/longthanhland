export interface AgentWorkload {
  id: string;
  name: string;
  assigned: number;
  following: number;
  qualified: number;
  slaCompliance: number;
  capacity: number;
  available: number;
}

export interface SlaDataPoint {
  day: string;
  compliance: number;
}

export interface AssignmentRule {
  id: string;
  name: string;
  priority: number;
  active: boolean;
  description: string;
  applies_to: string;
  logic: string[];
}

export interface Notification {
  id: string;
  type: 'new_lead' | 'sla_warning' | 'sla_breached' | 'commission_approved';
  title: string;
  message: string;
  timestamp: string;
  leadId?: string;
  leadName?: string;
  actionLabel?: string;
  read: boolean;
}

export const mockAgentWorkloads: AgentWorkload[] = [
  {
    id: 'agent-1',
    name: 'Luis Phan',
    assigned: 8,
    following: 15,
    qualified: 5,
    slaCompliance: 95,
    capacity: 25,
    available: 17,
  },
  {
    id: 'agent-2',
    name: 'John Doe',
    assigned: 6,
    following: 12,
    qualified: 4,
    slaCompliance: 90,
    capacity: 25,
    available: 19,
  },
  {
    id: 'agent-3',
    name: 'Jane Smith',
    assigned: 5,
    following: 10,
    qualified: 3,
    slaCompliance: 88,
    capacity: 25,
    available: 20,
  },
  {
    id: 'agent-4',
    name: 'Mike Johnson',
    assigned: 4,
    following: 8,
    qualified: 2,
    slaCompliance: 92,
    capacity: 25,
    available: 21,
  },
  {
    id: 'agent-5',
    name: 'Sarah Lee',
    assigned: 5,
    following: 11,
    qualified: 4,
    slaCompliance: 94,
    capacity: 25,
    available: 20,
  },
];

export const mockSlaData: SlaDataPoint[] = [
  { day: 'Mon', compliance: 92 },
  { day: 'Tue', compliance: 94 },
  { day: 'Wed', compliance: 91 },
  { day: 'Thu', compliance: 95 },
  { day: 'Fri', compliance: 93 },
  { day: 'Sat', compliance: 90 },
  { day: 'Sun', compliance: 92 },
];

export const mockAssignmentRules: AssignmentRule[] = [
  {
    id: 'rule-1',
    name: 'Round Robin (Default)',
    priority: 1,
    active: true,
    description: 'Distribute evenly across all available agents',
    applies_to: 'All incoming leads',
    logic: [
      'Distribute evenly across all available agents',
      'Check agent availability status',
      'Skip agents at capacity (>25 active leads)',
    ],
  },
  {
    id: 'rule-2',
    name: 'Location Match',
    priority: 2,
    active: true,
    description: 'Assign based on location expertise',
    applies_to: 'Leads with specified location preference',
    logic: [
      'IF lead.preferredLocation IN agent.expertise',
      'THEN assign to matching agent',
      'Luis Phan: District 9, District 2',
      'John Doe: Vung Tau, District 7',
      'Jane Smith: District 1, District 3',
    ],
  },
  {
    id: 'rule-3',
    name: 'VIP Customer',
    priority: 0,
    active: true,
    description: 'High-value leads go to senior agents',
    applies_to: 'Leads with budget > 10B VND',
    logic: ['Assign to senior agents only:', '- Luis Phan', '- John Doe'],
  },
];

export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'new_lead',
    title: 'New lead assigned',
    message:
      'Nguyen Van X from Facebook\nBudget: 2-3B VND · District 9\nSLA: First contact within 2 hours',
    timestamp: '2 min ago',
    leadId: 'lead-1',
    leadName: 'Nguyen Van X',
    actionLabel: 'View Lead',
    read: false,
  },
  {
    id: 'notif-2',
    type: 'sla_warning',
    title: 'SLA approaching (80%)',
    message:
      'Lead: Pham Thi Y (Assigned 1h ago)\nRemaining: 24 minutes for first contact',
    timestamp: '15 min ago',
    leadId: 'lead-2',
    leadName: 'Pham Thi Y',
    actionLabel: 'Mark Contacted',
    read: false,
  },
  {
    id: 'notif-3',
    type: 'sla_breached',
    title: 'SLA breached',
    message: 'Lead: Tran Van Z (Assigned 5h ago)\nManager notified',
    timestamp: '3 hours ago',
    leadId: 'lead-3',
    leadName: 'Tran Van Z',
    actionLabel: 'Explain Delay',
    read: false,
  },
  {
    id: 'notif-4',
    type: 'commission_approved',
    title: 'Commission approved',
    message: 'Commission #C-2025-0123: 125M VND\nFrom Deal: A-015 Purchase',
    timestamp: 'Yesterday',
    actionLabel: 'View Details',
    read: true,
  },
];

export interface LeadDistributionStats {
  leadsToday: number;
  leadsTodayChange: number;
  slaCompliance: number;
  slaTarget: number;
  avgResponseTime: string;
  avgResponseTarget: string;
  balanceScore: number;
  warnings: string[];
}

export const mockDistributionStats: LeadDistributionStats = {
  leadsToday: 28,
  leadsTodayChange: 5,
  slaCompliance: 92,
  slaTarget: 95,
  avgResponseTime: '1h 45m',
  avgResponseTarget: '2h',
  balanceScore: 92,
  warnings: ['Jane Smith approaching capacity'],
};
